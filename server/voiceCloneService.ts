/**
 * Voice Cloning — "Hear yourself at Band 8"
 *
 * Post-Mock-Test upsell (Rp 49k). Takes the student's actual Speaking
 * recordings, clones their voice via ElevenLabs Instant Voice Cloning (IVC),
 * has Claude rewrite their weakest response at Band 8 level, then generates
 * new audio in their own voice speaking the improved version.
 *
 * Emotional hook: "This is what future-you at Band 8 sounds like."
 *
 * Pipeline:
 *   1. Load student's Speaking recordings from ieltsSpeakingConversations
 *      (role=student) + linked audioKey in R2 storage
 *   2. Concatenate 3-5 cleanest clips (need ~1 min total for IVC)
 *   3. POST /v1/voices/add to ElevenLabs → get voice_id
 *   4. Pick the WEAKEST scoring response (lowest partBand from speaking
 *      responses); if only conversation data available, pick the shortest
 *      response as a proxy for "needs most improvement"
 *   5. Ask Claude to rewrite that response at Band 8 (preserving intent
 *      + personality, fixing grammar/vocab/coherence, adding natural
 *      linking devices)
 *   6. POST /v1/text-to-speech/{voice_id} → generate Band 8 audio in
 *      student's own voice
 *   7. Upload result to R2, save session record
 *   8. DELETE /v1/voices/{voice_id} after 90 days (privacy — cron job
 *      handles this separately; not in this file)
 *
 * Consent: purchase = consent. Legal copy on checkout: "I authorize
 * SpecTa to clone my voice for this feature only. Voice model
 * auto-deletes in 90 days."
 */

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { ieltsMockAttempts, ieltsSpeakingConversations, ieltsSpeakingResponses } from "../drizzle/schema";
import { storageGetBytes, storagePut } from "./storage";
import { ENV } from "./_core/env";
import { synthesize } from "./_core/elevenlabs";
import { invokeLLM } from "./_core/llm";
import { transcribeAudioBuffer } from "./_core/voiceTranscription";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

/** Per-part result — one for each of the 3 recorded Speaking parts. */
export interface VoiceClonePartResult {
  partNumber: number;                      // 1 | 2 | 3
  originalTranscript: string;              // student's actual words
  originalWordCount: number;               // for length-vs-target comparison in UI
  originalAudioKey: string | null;         // R2 key of student's own recording
  band8Text: string;                       // Claude's Band 8 rewrite
  band8WordCount: number;
  band8AudioKey: string;                   // R2 key of cloned-voice Band 8 audio
  changesSummary: string;                  // 2-3 sentences on what improved
  vocabularyUpgrades: Array<{ original: string; band8: string; note: string }>;
  grammarUpgrades: Array<{ original: string; band8: string; rule: string }>;
  discourseMarkersMissed: string[];
}

export interface VoiceCloneResult {
  voiceId: string;                         // ElevenLabs voice ID (temp, deleted at 90d)
  /** Weakest part number — populated for backward compatibility with old single-part callers/DB rows. */
  targetedPartNumber: number;              // 1 | 2 | 3
  originalTranscript: string;              // weakest part's transcript (BC)
  originalAudioKey: string | null;         // weakest part's audio key (BC)
  band8Transcript: string;                 // weakest part's Band 8 rewrite (BC)
  band8AudioKey: string;                   // weakest part's Band 8 audio (BC)
  changesSummary: string;                  // weakest part's summary (BC)
  /** Full per-part results for ALL recorded parts. Caller stores this as JSON in partsJson. */
  parts: VoiceClonePartResult[];
  /** Per-criterion IELTS Speaking assessment of the ORIGINAL recordings. Stored in assessmentJson. */
  assessment: SpeakingAssessment;
  /** R2 key of the generated study PDF (nullable if generation failed — email still fires with link only). */
  pdfKey: string | null;
}

/** Sessions publish these named progress steps so the client can render a live pipeline instead of a dead spinner. */
export type VoiceCloneProgressStep =
  | "loading"          // reading recordings + transcripts
  | "transcribing"     // Whisper on any un-transcribed clips
  | "assessing"        // grading original against IELTS rubric
  | "cloning_voice"    // ElevenLabs IVC (~30-60s)
  | "rewriting_p1"     // Claude Band-8 rewrite of Part 1
  | "rewriting_p2"     // ...Part 2
  | "rewriting_p3"     // ...Part 3
  | "synthesizing"     // ElevenLabs TTS in cloned voice for each part
  | "rendering_pdf"    // pdfmake report
  | "delivering";      // email + finalizing DB row

const PROGRESS_LABELS: Record<VoiceCloneProgressStep, string> = {
  loading: "Loading your recordings",
  transcribing: "Transcribing with Whisper",
  assessing: "Grading against IELTS Speaking rubric",
  cloning_voice: "Cloning your voice (ElevenLabs)",
  rewriting_p1: "Rewriting Part 1 at Band 8",
  rewriting_p2: "Rewriting Part 2 at Band 8 (aiming for ~2 minutes)",
  rewriting_p3: "Rewriting Part 3 at Band 8",
  synthesizing: "Generating Band 8 audio in your voice",
  rendering_pdf: "Building your study PDF",
  delivering: "Finalizing + emailing your report",
};

async function setProgress(sessionId: number, step: VoiceCloneProgressStep): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.execute(sql`
      UPDATE voice_clone_sessions SET progressStep = ${step} WHERE id = ${sessionId}
    `);
    console.log(`[VoiceClone] Session ${sessionId} → ${step} (${PROGRESS_LABELS[step]})`);
  } catch (e) {
    console.warn(`[VoiceClone] setProgress failed for session ${sessionId}:`, (e as Error).message);
  }
}

export function progressLabel(step: string | null | undefined): string {
  if (!step) return "Preparing…";
  return PROGRESS_LABELS[step as VoiceCloneProgressStep] || step;
}

/**
 * Generate the study-report PDF for a completed Voice Clone session and
 * upload to R2. Returns the R2 key on success, null on failure (email
 * still fires with a link-only body). Called at the "rendering_pdf" phase.
 */
async function generateAndUploadReportPdf(
  sessionId: number,
  studentName: string,
  studentEmail: string,
  result: Omit<VoiceCloneResult, "pdfKey">,
): Promise<string | null> {
  try {
    const { renderVoiceCloneReportPdf } = await import("./voiceCloneReportPdf");
    const pdf = await renderVoiceCloneReportPdf({
      studentName,
      studentEmail,
      completedAt: new Date(),
      result: { ...result, pdfKey: null }, // shape-fill
    });
    const key = `voice-clone/reports/${sessionId}-${Date.now()}.pdf`;
    await storagePut(key, pdf, "application/pdf");
    console.log(`[VoiceClone] PDF stored at ${key} (${(pdf.length / 1024).toFixed(1)} KB)`);
    return key;
  } catch (e) {
    console.warn(`[VoiceClone] PDF generation failed for session ${sessionId}:`, (e as Error).message);
    return null;
  }
}

/**
 * Send the "your Voice Clone report is ready" email — includes the result-page
 * URL AND attaches the PDF if available. Called at the "delivering" phase.
 */
async function sendReportDeliveryEmail(
  sessionToken: string | null,
  studentName: string,
  studentEmail: string,
  pdfKey: string | null,
  overallBand: number,
): Promise<void> {
  try {
    if (!studentEmail) return;
    const { sendVoiceCloneReportEmail } = await import("./resendService");
    const appBase = (ENV.appUrl || "https://www.spectaeducation.com").replace(/\/+$/, "");
    const resultUrl = sessionToken ? `${appBase}/voice-clone/result/${sessionToken}` : appBase;
    let pdfBuffer: Buffer | undefined;
    if (pdfKey) {
      try {
        const { buffer } = await storageGetBytes(pdfKey);
        pdfBuffer = buffer;
      } catch (e) {
        console.warn(`[VoiceClone] Could not fetch PDF for email:`, (e as Error).message);
      }
    }
    await sendVoiceCloneReportEmail({
      to: studentEmail,
      customerName: studentName,
      resultUrl,
      overallBand,
      pdfBuffer,
    });
  } catch (e) {
    console.warn(`[VoiceClone] Report delivery email failed:`, (e as Error).message);
  }
}

/**
 * Pick the WEAKEST Speaking response from a Mock attempt. Uses partBand
 * if available; falls back to shortest transcript (heuristic: shorter
 * = probably struggled more). Excludes responses with no transcript.
 */
async function pickWeakestResponse(attemptId: number): Promise<{
  partNumber: number;
  transcript: string;
  audioKey: string | null;
} | null> {
  const db = await getDb();
  if (!db) return null;

  // Prefer the ieltsSpeakingResponses table (has scores per part)
  const scored = await db.select()
    .from(ieltsSpeakingResponses)
    .where(eq(ieltsSpeakingResponses.attemptId, attemptId));
  const scoredWithBand = scored.filter(r => r.partBand != null && r.transcript);
  if (scoredWithBand.length > 0) {
    scoredWithBand.sort((a, b) => Number(a.partBand) - Number(b.partBand));
    const weakest = scoredWithBand[0];
    return {
      partNumber: weakest.partNumber,
      transcript: weakest.transcript || "",
      audioKey: weakest.audioKey,
    };
  }

  // Fallback: use conversation transcripts (role=student), pick shortest
  const turns = await db.select().from(ieltsSpeakingConversations)
    .where(and(
      eq(ieltsSpeakingConversations.attemptId, attemptId),
      eq(ieltsSpeakingConversations.role, "student"),
    ));
  if (turns.length === 0) return null;
  turns.sort((a, b) => (a.text || "").length - (b.text || "").length);
  const shortest = turns[0];
  return {
    partNumber: shortest.partNumber,
    transcript: shortest.text || "",
    audioKey: shortest.audioKey,
  };
}

/**
 * Fetch and concatenate 3-5 student speaking clips to reach ~30-60s of
 * clean audio for ElevenLabs IVC (which needs at least ~30s to make a
 * decent voice model). Returns raw MP3 buffers.
 */
async function collectVoiceSamples(attemptId: number, maxSamples = 5): Promise<Buffer[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const turns = await db.select().from(ieltsSpeakingConversations)
    .where(and(
      eq(ieltsSpeakingConversations.attemptId, attemptId),
      eq(ieltsSpeakingConversations.role, "student"),
    ));
  const withAudio = turns.filter(t => t.audioKey && (t.text || "").length > 30);
  if (withAudio.length === 0) throw new Error("No speaking recordings found for this attempt");

  // Prefer LONGER responses (more voice data per clip = better model)
  withAudio.sort((a, b) => (b.text || "").length - (a.text || "").length);
  const chosen = withAudio.slice(0, maxSamples);
  const buffers: Buffer[] = [];
  for (const t of chosen) {
    try {
      const { buffer } = await storageGetBytes(t.audioKey!);
      if (buffer && buffer.length > 1000) buffers.push(buffer);
    } catch (e) {
      console.warn(`[VoiceClone] Failed to load audio ${t.audioKey}:`, (e as Error).message);
    }
  }
  if (buffers.length === 0) throw new Error("Could not load any speaking audio for cloning");
  return buffers;
}

/**
 * Create an ElevenLabs Instant Voice Clone from the collected samples.
 * Returns the new voice_id. Voice is stored on our ElevenLabs account
 * until deleted (90-day cleanup cron handles that).
 */
async function createElevenLabsVoiceClone(
  name: string,
  audioBuffers: Buffer[],
): Promise<string> {
  if (!ENV.elevenLabsApiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const form = new FormData();
  form.append("name", name.slice(0, 100));
  form.append("description", `Voice clone for SpecTa Voice Clone feature. Auto-delete in 90 days.`);
  audioBuffers.forEach((buf, i) => {
    // Node 22 has native File / Blob; if not, wrap in Blob-compatible.
    const blob = new Blob([new Uint8Array(buf)], { type: "audio/mpeg" });
    form.append("files", blob, `sample${i + 1}.mp3`);
  });

  const res = await fetch(`${ELEVENLABS_API_BASE}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": ENV.elevenLabsApiKey },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs voice-clone failed: ${res.status} ${detail}`);
  }
  const data = await res.json();
  if (!data.voice_id) throw new Error("ElevenLabs did not return a voice_id");
  return data.voice_id as string;
}

/** Word-count targets matching real IELTS Band 8 speaking norms. */
const BAND8_TARGET_WORDS: Record<number, { min: number; ideal: number; max: number; seconds: number }> = {
  1: { min: 40, ideal: 70, max: 110, seconds: 30 },     // 20-40s per short question
  2: { min: 260, ideal: 310, max: 360, seconds: 120 },  // 1.5-2min cue card long turn
  3: { min: 100, ideal: 150, max: 200, seconds: 60 },   // 45-90s per discussion answer
};

export interface Band8Rewrite {
  band8Text: string;
  changesSummary: string;
  vocabularyUpgrades: Array<{ original: string; band8: string; note: string }>;
  grammarUpgrades: Array<{ original: string; band8: string; rule: string }>;
  discourseMarkersMissed: string[];
}

/**
 * Ask Claude/Deepseek to rewrite the student's Speaking response at
 * Band 8 level. Preserves their content + personal touch, improves
 * grammar/vocab/linking/coherence, hits the length norms for the part.
 * Also returns per-item learning teardown (vocab/grammar/discourse) so
 * students can actually study from it.
 */
async function rewriteAtBand8(
  originalTranscript: string,
  partNumber: number,
  studentName: string,
): Promise<Band8Rewrite> {
  const target = BAND8_TARGET_WORDS[partNumber] || BAND8_TARGET_WORDS[3];
  const partDescription = partNumber === 1
    ? "Part 1 (Introduction & short interview)"
    : partNumber === 2
      ? "Part 2 (Cue card long turn — MUST fill the full 2 minutes)"
      : "Part 3 (Discussion — abstract, hedged, sophisticated)";

  const systemPrompt = `You are an expert IELTS Speaking examiner and coach. You'll be given a student's actual Speaking response from ${partDescription} of an IELTS test.

CRITICAL LENGTH REQUIREMENT — a Band 8 speaker at this part naturally speaks for ~${target.seconds} seconds:
- Minimum: ${target.min} words
- Target: ~${target.ideal} words
- Maximum: ${target.max} words
If the original is shorter than the minimum, YOU MUST EXPAND — add relevant elaboration, examples, personal reasoning, hedged opinions. A short Band 8 answer is a contradiction: the fluency criterion requires filling the expected time.

Rewrite the student's response at IELTS Band 8 level while:
- PRESERVING their content, opinions, and personal touch (this is THEIR voice)
- HITTING THE WORD-COUNT TARGET above (this is non-negotiable — expand with relevant, natural elaboration if needed)
- Fixing grammar errors + word choice
- Adding natural discourse markers ("however", "for instance", "that said", "to be honest", "moreover", "as a result")
- Elevating vocabulary where appropriate (use precise topic-specific words, not generic ones)
- Making sentence structure varied (mix of simple, compound, and complex sentences with subordinate clauses)
- Using natural hedging language for Part 3 ("I would argue that…", "it's worth considering…", "arguably")
- Keeping it SPEAKABLE — this will be spoken aloud, so no textbook phrasing or written-only constructions
- Sounding natural — not stiff, not over-formal

The student's name is ${studentName}. Do NOT change their views or invent facts, but you MAY add relevant supporting reasoning and hypothetical examples to reach the word target.

Return JSON with 5 fields:
1. band8Text: the rewritten response (natural spoken register, Band 8, hits the word target)
2. changesSummary: 2-3 sentences in Bahasa Indonesia explaining what was improved overall
3. vocabularyUpgrades: array of specific word/phrase upgrades — {original, band8, note}. Include 5-10 upgrades. "note" explains why the Band 8 version is stronger (register, precision, natural collocation).
4. grammarUpgrades: array of specific sentence/structure upgrades — {original, band8, rule}. Include 3-8 upgrades. "rule" names the grammar concept used (e.g. "relative clause", "cleft sentence", "third conditional", "reduced participle").
5. discourseMarkersMissed: array of discourse markers/connectors your Band 8 version uses that the ORIGINAL didn't. Include 4-8 items. Just the marker itself (e.g. "however", "as far as I'm concerned").`;

  const userPrompt = `Original Speaking ${partDescription} response by ${studentName}:
"""
${originalTranscript}
"""
(${originalTranscript.split(/\s+/).length} words — target Band 8 length is ~${target.ideal} words)

Rewrite at Band 8, preserving their content + voice, EXPANDING to hit the word target if shorter, providing the full learning teardown.`;

  const response = await invokeLLM({
    model: "deepseek-v4-pro",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "voice_clone_rewrite",
        strict: true,
        schema: {
          type: "object",
          properties: {
            band8Text: { type: "string" },
            changesSummary: { type: "string" },
            vocabularyUpgrades: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original: { type: "string" },
                  band8: { type: "string" },
                  note: { type: "string" },
                },
                required: ["original", "band8", "note"],
                additionalProperties: false,
              },
            },
            grammarUpgrades: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original: { type: "string" },
                  band8: { type: "string" },
                  rule: { type: "string" },
                },
                required: ["original", "band8", "rule"],
                additionalProperties: false,
              },
            },
            discourseMarkersMissed: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["band8Text", "changesSummary", "vocabularyUpgrades", "grammarUpgrades", "discourseMarkersMissed"],
          additionalProperties: false,
        },
      },
    },
  });
  const raw = response.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") throw new Error("Empty AI response for Band-8 rewrite");
  const parsed = JSON.parse(raw);
  if (!parsed.band8Text || !parsed.changesSummary) throw new Error("Invalid AI response for Band-8 rewrite");
  return {
    band8Text: parsed.band8Text,
    changesSummary: parsed.changesSummary,
    vocabularyUpgrades: Array.isArray(parsed.vocabularyUpgrades) ? parsed.vocabularyUpgrades : [],
    grammarUpgrades: Array.isArray(parsed.grammarUpgrades) ? parsed.grammarUpgrades : [],
    discourseMarkersMissed: Array.isArray(parsed.discourseMarkersMissed) ? parsed.discourseMarkersMissed : [],
  };
}

/** Per-criterion IELTS Speaking assessment of the student's ORIGINAL performance. */
export interface SpeakingAssessment {
  fluency: { band: number; feedback: string };
  lexical: { band: number; feedback: string };
  grammar: { band: number; feedback: string };
  pronunciation: { band: number; feedback: string };
  overallBand: number;
  weakestCriterion: "fluency" | "lexical" | "grammar" | "pronunciation";
  actionPlan: string;              // 3-4 sentences: personalized study advice
}

/**
 * Grade the student's original transcripts against the official IELTS
 * Speaking band descriptors (Fluency & Coherence, Lexical Resource,
 * Grammatical Range & Accuracy, Pronunciation). Returns per-criterion
 * band (4-9), overall band, weakest criterion, and a personalized
 * action plan to move them up 1-2 bands.
 */
async function assessSpeakingPerformance(
  transcripts: Array<{ partNumber: number; text: string }>,
  studentName: string,
): Promise<SpeakingAssessment> {
  const transcriptBlock = transcripts
    .sort((a, b) => a.partNumber - b.partNumber)
    .map(t => `--- Part ${t.partNumber} ---\n${t.text}`)
    .join("\n\n");

  const systemPrompt = `You are a certified IELTS Speaking examiner. Grade a student's Speaking transcripts against the OFFICIAL IELTS band descriptors, using the 4 criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation.

Rules:
- Bands are half-integers from 4.0 to 9.0 (e.g. 5.5, 6.0, 6.5, 7.0, 7.5, 8.0).
- Pronunciation is INFERRED from transcript-level cues only (fillers, hesitations, self-corrections indicate lower fluency but you cannot hear the actual audio — grade conservatively based on transcript signals).
- Overall band = simple average of the 4 rounded to nearest half.
- Per-criterion feedback: 2-3 sentences citing SPECIFIC evidence from the student's transcript. Don't be generic.
- weakestCriterion: the single criterion with the lowest band.
- actionPlan: 3-4 sentences in the same language as the student's transcript, personalized to their weakest criterion + specific exercises they should do (name concrete drills, e.g. "Practice cue-card responses using the PPF framework — Past / Present / Future — timed to 2 minutes daily").`;

  const userPrompt = `Student name: ${studentName}
Speaking transcripts across all 3 parts:

${transcriptBlock}

Assess against IELTS Speaking band descriptors. Return JSON.`;

  const response = await invokeLLM({
    model: "deepseek-v4-pro",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ielts_speaking_assessment",
        strict: true,
        schema: {
          type: "object",
          properties: {
            fluency: {
              type: "object",
              properties: { band: { type: "number" }, feedback: { type: "string" } },
              required: ["band", "feedback"],
              additionalProperties: false,
            },
            lexical: {
              type: "object",
              properties: { band: { type: "number" }, feedback: { type: "string" } },
              required: ["band", "feedback"],
              additionalProperties: false,
            },
            grammar: {
              type: "object",
              properties: { band: { type: "number" }, feedback: { type: "string" } },
              required: ["band", "feedback"],
              additionalProperties: false,
            },
            pronunciation: {
              type: "object",
              properties: { band: { type: "number" }, feedback: { type: "string" } },
              required: ["band", "feedback"],
              additionalProperties: false,
            },
            overallBand: { type: "number" },
            weakestCriterion: { type: "string", enum: ["fluency", "lexical", "grammar", "pronunciation"] },
            actionPlan: { type: "string" },
          },
          required: ["fluency", "lexical", "grammar", "pronunciation", "overallBand", "weakestCriterion", "actionPlan"],
          additionalProperties: false,
        },
      },
    },
  });
  const raw = response.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") throw new Error("Empty AI response for speaking assessment");
  const parsed = JSON.parse(raw);
  const roundHalf = (n: number) => Math.max(4, Math.min(9, Math.round(Number(n) * 2) / 2));
  return {
    fluency: { band: roundHalf(parsed.fluency?.band ?? 6), feedback: String(parsed.fluency?.feedback || "") },
    lexical: { band: roundHalf(parsed.lexical?.band ?? 6), feedback: String(parsed.lexical?.feedback || "") },
    grammar: { band: roundHalf(parsed.grammar?.band ?? 6), feedback: String(parsed.grammar?.feedback || "") },
    pronunciation: { band: roundHalf(parsed.pronunciation?.band ?? 6), feedback: String(parsed.pronunciation?.feedback || "") },
    overallBand: roundHalf(parsed.overallBand ?? 6),
    weakestCriterion: (parsed.weakestCriterion as any) || "fluency",
    actionPlan: String(parsed.actionPlan || ""),
  };
}

/**
 * The main flow. Runs end-to-end for one Mock Test attempt.
 * Called from tRPC endpoint after Xendit payment webhook.
 */
export async function runVoiceCloneForAttempt(attemptId: number): Promise<VoiceCloneResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [attempt] = await db.select().from(ieltsMockAttempts)
    .where(eq(ieltsMockAttempts.id, attemptId)).limit(1);
  if (!attempt) throw new Error(`Mock attempt ${attemptId} not found`);
  const studentName = attempt.customerName || "there";

  // Locate the Voice Clone session bound to this attempt so we can publish progress.
  const sessionRows: any = await db.execute(sql`
    SELECT id FROM voice_clone_sessions WHERE attemptId = ${attemptId} ORDER BY id DESC LIMIT 1
  `);
  const sessionList: any[] = Array.isArray(sessionRows[0]) ? sessionRows[0] : sessionRows;
  const sessionId: number | null = sessionList[0]?.id || null;
  const progress = (step: VoiceCloneProgressStep) => sessionId ? setProgress(sessionId, step) : Promise.resolve();

  await progress("loading");
  console.log(`[VoiceClone] Starting for attempt ${attemptId} (${studentName})`);

  const perPart = await pickOneResponsePerPart(attemptId);
  if (perPart.length === 0) throw new Error("No Speaking responses found — cannot proceed with Voice Clone");
  const weakestOfAll = [...perPart].sort((a, b) => a.transcript.length - b.transcript.length)[0];

  await progress("assessing");
  const assessmentPromise = assessSpeakingPerformance(
    perPart.map(p => ({ partNumber: p.partNumber, text: p.transcript })),
    studentName,
  ).catch(e => {
    console.warn(`[VoiceClone] Assessment failed:`, (e as Error).message);
    return {
      fluency: { band: 6, feedback: "Assessment unavailable" },
      lexical: { band: 6, feedback: "Assessment unavailable" },
      grammar: { band: 6, feedback: "Assessment unavailable" },
      pronunciation: { band: 6, feedback: "Assessment unavailable" },
      overallBand: 6,
      weakestCriterion: "fluency" as const,
      actionPlan: "Continue practicing daily — assessment engine had a temporary issue.",
    };
  });

  const samples = await collectVoiceSamples(attemptId, 5);
  await progress("cloning_voice");
  const voiceName = `SpecTa VC ${attempt.id} ${studentName.slice(0, 20)}`;
  const voiceId = await createElevenLabsVoiceClone(voiceName, samples);

  const rewrites: Array<{ src: typeof perPart[number] } & Band8Rewrite | null> = [];
  for (const p of perPart) {
    const step: VoiceCloneProgressStep = p.partNumber === 1 ? "rewriting_p1" : p.partNumber === 2 ? "rewriting_p2" : "rewriting_p3";
    await progress(step);
    try {
      const rw = await rewriteAtBand8(p.transcript, p.partNumber, studentName);
      rewrites.push({ src: p, ...rw });
    } catch (e) {
      console.warn(`[VoiceClone] Band8 rewrite failed for Part ${p.partNumber}:`, (e as Error).message);
      rewrites.push(null);
    }
  }

  await progress("synthesizing");
  const parts: VoiceClonePartResult[] = [];
  for (const rw of rewrites) {
    if (!rw) continue;
    const { src, band8Text, changesSummary, vocabularyUpgrades, grammarUpgrades, discourseMarkersMissed } = rw;
    try {
      const band8Audio = await synthesize({
        voiceId,
        text: band8Text,
        modelId: ENV.elevenLabsModelId || "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
        stability: 0.5,
        similarityBoost: 0.85,
      });
      const band8AudioKey = `voice-clone/${attemptId}/${Date.now()}-band8-part${src.partNumber}.mp3`;
      await storagePut(band8AudioKey, band8Audio, "audio/mpeg");
      parts.push({
        partNumber: src.partNumber,
        originalTranscript: src.transcript,
        originalWordCount: src.transcript.split(/\s+/).filter(Boolean).length,
        originalAudioKey: src.audioKey,
        band8Text,
        band8WordCount: band8Text.split(/\s+/).filter(Boolean).length,
        band8AudioKey,
        changesSummary,
        vocabularyUpgrades,
        grammarUpgrades,
        discourseMarkersMissed,
      });
    } catch (e) {
      console.warn(`[VoiceClone] TTS failed for Part ${src.partNumber}:`, (e as Error).message);
    }
  }

  if (parts.length === 0) throw new Error("All part rewrites failed — cannot deliver result");
  parts.sort((a, b) => a.partNumber - b.partNumber);

  const assessment = await assessmentPromise;
  const weakestPart = parts.find(p => p.partNumber === weakestOfAll.partNumber) || parts[0];

  const draft = {
    voiceId,
    targetedPartNumber: weakestPart.partNumber,
    originalTranscript: weakestPart.originalTranscript,
    originalAudioKey: weakestPart.originalAudioKey,
    band8Transcript: weakestPart.band8Text,
    band8AudioKey: weakestPart.band8AudioKey,
    changesSummary: weakestPart.changesSummary,
    parts,
    assessment,
  };

  let pdfKey: string | null = null;
  if (sessionId) {
    await progress("rendering_pdf");
    pdfKey = await generateAndUploadReportPdf(sessionId, studentName, attempt.customerEmail || "", draft);
    await progress("delivering");
    // From-mock sessions don't have a sessionToken — the result URL points to the Mock report page.
    const sessionTokenRows: any = await db.execute(sql`SELECT sessionToken FROM voice_clone_sessions WHERE id = ${sessionId} LIMIT 1`);
    const stList: any[] = Array.isArray(sessionTokenRows[0]) ? sessionTokenRows[0] : sessionTokenRows;
    const sessionToken = stList[0]?.sessionToken || null;
    await sendReportDeliveryEmail(
      sessionToken,
      studentName,
      attempt.customerEmail || "",
      pdfKey,
      assessment.overallBand,
    );
  }

  return { ...draft, pdfKey };
}

/**
 * Pull ONE representative response for each Speaking part (1, 2, 3) of a Mock
 * attempt. Prefers `ieltsSpeakingResponses` (has partBand); falls back to
 * longest student turn from `ieltsSpeakingConversations` grouped by part.
 */
async function pickOneResponsePerPart(attemptId: number): Promise<Array<{
  partNumber: number;
  transcript: string;
  audioKey: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];

  const scored = await db.select()
    .from(ieltsSpeakingResponses)
    .where(eq(ieltsSpeakingResponses.attemptId, attemptId));
  const scoredWithText = scored.filter(r => r.transcript);
  if (scoredWithText.length > 0) {
    const byPart = new Map<number, { partNumber: number; transcript: string; audioKey: string | null }>();
    for (const r of scoredWithText) {
      const existing = byPart.get(r.partNumber);
      // Prefer the LONGEST transcript per part (more content to rewrite)
      if (!existing || (r.transcript || "").length > existing.transcript.length) {
        byPart.set(r.partNumber, {
          partNumber: r.partNumber,
          transcript: r.transcript || "",
          audioKey: r.audioKey,
        });
      }
    }
    return Array.from(byPart.values()).sort((a, b) => a.partNumber - b.partNumber);
  }

  const turns = await db.select().from(ieltsSpeakingConversations)
    .where(and(
      eq(ieltsSpeakingConversations.attemptId, attemptId),
      eq(ieltsSpeakingConversations.role, "student"),
    ));
  const byPart = new Map<number, { partNumber: number; transcript: string; audioKey: string | null }>();
  for (const t of turns) {
    if (!t.text || t.text.length < 10) continue;
    const existing = byPart.get(t.partNumber);
    if (!existing || t.text.length > existing.transcript.length) {
      byPart.set(t.partNumber, {
        partNumber: t.partNumber,
        transcript: t.text,
        audioKey: t.audioKey,
      });
    }
  }
  return Array.from(byPart.values()).sort((a, b) => a.partNumber - b.partNumber);
}

// ────────────────────────────────────────────────────────────────────────────
// STANDALONE MODE — anyone can buy Voice Clone without taking a Mock Test.
// They record 3 IELTS Speaking questions in a mini-recording flow, then
// this function processes them into a Voice Clone the same way.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Process a standalone Voice Clone session: user has already uploaded 3
 * recordings via /voice-clone/record/[token]. This function transcribes
 * (if not already), picks the weakest, clones voice, rewrites at Band 8,
 * generates TTS in cloned voice, uploads result.
 *
 * Called from the Xendit webhook after payment OR immediately for
 * bundle-free redemptions.
 */
export async function runVoiceCloneStandalone(sessionId: number): Promise<VoiceCloneResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await setProgress(sessionId, "loading");

  // Load the session + its 3 recordings
  const sessionRows: any = await db.execute(sql`
    SELECT * FROM voice_clone_sessions WHERE id = ${sessionId} LIMIT 1
  `);
  const sessionList = Array.isArray(sessionRows[0]) ? sessionRows[0] : sessionRows;
  const session = sessionList[0];
  if (!session) throw new Error(`Voice Clone session ${sessionId} not found`);

  const recordingRows: any = await db.execute(sql`
    SELECT * FROM voice_clone_recordings WHERE sessionId = ${sessionId} ORDER BY questionIndex ASC
  `);
  const recordings: any[] = Array.isArray(recordingRows[0]) ? recordingRows[0] : recordingRows;
  const uploaded = recordings.filter((r: any) => r.audioKey && r.uploadedAt);
  if (uploaded.length < 2) {
    throw new Error(`Only ${uploaded.length} recording(s) uploaded — need at least 2 for voice cloning`);
  }
  console.log(`[VoiceClone] Standalone session ${sessionId} has ${uploaded.length} recordings`);

  // Transcribe any recordings without transcripts yet
  await setProgress(sessionId, "transcribing");
  for (const r of uploaded) {
    if (!r.transcript) {
      try {
        const { buffer, contentType } = await storageGetBytes(r.audioKey);
        const result = await transcribeAudioBuffer({ buffer, mimeType: contentType || "audio/webm" });
        if ("text" in result && result.text) {
          r.transcript = result.text;
          await db.execute(sql`
            UPDATE voice_clone_recordings SET transcript = ${result.text} WHERE id = ${r.id}
          `);
        } else {
          console.warn(`[VoiceClone] Transcription failed for recording ${r.id}`);
        }
      } catch (e) {
        console.warn(`[VoiceClone] Transcription error for recording ${r.id}:`, (e as Error).message);
      }
    }
  }

  // Weakest = shortest transcript (heuristic for BC weakest-only pointer)
  const withTranscript = uploaded.filter((r: any) => r.transcript);
  if (withTranscript.length === 0) throw new Error("No recordings could be transcribed — cannot proceed");
  const sortedByLen = [...withTranscript].sort(
    (a: any, b: any) => (a.transcript || "").length - (b.transcript || "").length,
  );
  const weakest = sortedByLen[0];
  console.log(
    `[VoiceClone] Standalone ${sessionId}: will rewrite ALL ${withTranscript.length} parts. ` +
    `Weakest is Part ${weakest.partNumber} (${(weakest.transcript || "").length} chars).`,
  );

  // Collect ALL uploaded audio for the voice model (more data = better clone)
  const audioBuffers: Buffer[] = [];
  for (const r of uploaded) {
    try {
      const { buffer } = await storageGetBytes(r.audioKey);
      if (buffer && buffer.length > 1000) audioBuffers.push(buffer);
    } catch (e) {
      console.warn(`[VoiceClone] Failed to load audio ${r.audioKey}:`, (e as Error).message);
    }
  }
  if (audioBuffers.length === 0) throw new Error("Could not load any audio for cloning");

  const studentName = session.customerName || "there";

  // Assess original performance against IELTS Speaking rubric (in parallel with voice cloning)
  await setProgress(sessionId, "assessing");
  const assessmentPromise = assessSpeakingPerformance(
    withTranscript.map((r: any) => ({ partNumber: r.partNumber, text: r.transcript || "" })),
    studentName,
  ).catch(e => {
    console.warn(`[VoiceClone] Assessment failed:`, (e as Error).message);
    // Fallback to neutral 6.0 across the board if grading crashes
    return {
      fluency: { band: 6, feedback: "Assessment unavailable" },
      lexical: { band: 6, feedback: "Assessment unavailable" },
      grammar: { band: 6, feedback: "Assessment unavailable" },
      pronunciation: { band: 6, feedback: "Assessment unavailable" },
      overallBand: 6,
      weakestCriterion: "fluency" as const,
      actionPlan: "Continue practicing daily — assessment engine had a temporary issue.",
    };
  });

  // Clone voice ONCE (reused for all 3 part rewrites)
  await setProgress(sessionId, "cloning_voice");
  const voiceName = `SpecTa VC Standalone ${sessionId} ${String(studentName).slice(0, 20)}`;
  const voiceId = await createElevenLabsVoiceClone(voiceName, audioBuffers);
  console.log(`[VoiceClone] Cloned voice ${voiceId}`);

  // Rewrite EACH part at Band 8 sequentially so we can update progressStep per part.
  const rewrites: Array<{ recording: any } & Band8Rewrite | null> = [];
  for (const r of withTranscript) {
    const step: VoiceCloneProgressStep = r.partNumber === 1 ? "rewriting_p1" : r.partNumber === 2 ? "rewriting_p2" : "rewriting_p3";
    await setProgress(sessionId, step);
    try {
      const rw = await rewriteAtBand8(r.transcript, r.partNumber, studentName);
      rewrites.push({ recording: r, ...rw });
    } catch (e) {
      console.warn(`[VoiceClone] Band8 rewrite failed for Part ${r.partNumber}:`, (e as Error).message);
      rewrites.push(null);
    }
  }

  // Synthesize all Band-8 audios in one phase
  await setProgress(sessionId, "synthesizing");
  const parts: VoiceClonePartResult[] = [];
  for (const rw of rewrites) {
    if (!rw) continue;
    const { recording, band8Text, changesSummary, vocabularyUpgrades, grammarUpgrades, discourseMarkersMissed } = rw;
    try {
      const band8Audio = await synthesize({
        voiceId,
        text: band8Text,
        modelId: ENV.elevenLabsModelId || "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
        stability: 0.5,
        similarityBoost: 0.85,
      });
      const band8AudioKey = `voice-clone/standalone-${sessionId}/${Date.now()}-band8-part${recording.partNumber}.mp3`;
      await storagePut(band8AudioKey, band8Audio, "audio/mpeg");
      parts.push({
        partNumber: recording.partNumber,
        originalTranscript: recording.transcript,
        originalWordCount: (recording.transcript || "").split(/\s+/).filter(Boolean).length,
        originalAudioKey: recording.audioKey,
        band8Text,
        band8WordCount: band8Text.split(/\s+/).filter(Boolean).length,
        band8AudioKey,
        changesSummary,
        vocabularyUpgrades,
        grammarUpgrades,
        discourseMarkersMissed,
      });
      console.log(`[VoiceClone] Part ${recording.partNumber}: ${band8Audio.length} bytes → ${band8AudioKey}`);
    } catch (e) {
      console.warn(`[VoiceClone] TTS failed for Part ${recording.partNumber}:`, (e as Error).message);
    }
  }

  const assessment = await assessmentPromise;

  if (parts.length === 0) throw new Error("All part rewrites failed — cannot deliver result");

  // Sort by partNumber ascending so UI shows 1 → 2 → 3
  parts.sort((a, b) => a.partNumber - b.partNumber);

  // Backward-compat: point the single-part fields at the weakest part's result
  const weakestPart = parts.find(p => p.partNumber === weakest.partNumber) || parts[0];

  // Generate + upload PDF report
  await setProgress(sessionId, "rendering_pdf");
  const draft = {
    voiceId,
    targetedPartNumber: weakestPart.partNumber,
    originalTranscript: weakestPart.originalTranscript,
    originalAudioKey: weakestPart.originalAudioKey,
    band8Transcript: weakestPart.band8Text,
    band8AudioKey: weakestPart.band8AudioKey,
    changesSummary: weakestPart.changesSummary,
    parts,
    assessment,
  };
  const pdfKey = await generateAndUploadReportPdf(sessionId, studentName, session.customerEmail || "", draft);

  // Deliver — email the report + PDF attachment
  await setProgress(sessionId, "delivering");
  await sendReportDeliveryEmail(
    session.sessionToken,
    studentName,
    session.customerEmail || "",
    pdfKey,
    assessment.overallBand,
  );

  return {
    ...draft,
    pdfKey,
  };
}
