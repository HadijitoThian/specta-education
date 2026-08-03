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

export interface VoiceCloneResult {
  voiceId: string;                        // ElevenLabs voice ID (temp, deleted at 90d)
  targetedPartNumber: number;              // 1 | 2 | 3 — which Speaking part we rewrote
  originalTranscript: string;              // student's actual words
  originalAudioKey: string | null;         // R2 key of student's own recording
  band8Transcript: string;                 // Claude's Band 8 rewrite
  band8AudioKey: string;                   // R2 key of cloned-voice Band 8 audio
  changesSummary: string;                  // 2-3 sentences on what improved (vocab, grammar, etc.)
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

/**
 * Ask Claude/Deepseek to rewrite the student's Speaking response at
 * Band 8 level. Preserves their content + personal touch, improves
 * grammar/vocab/linking/coherence.
 */
async function rewriteAtBand8(
  originalTranscript: string,
  partNumber: number,
  studentName: string,
): Promise<{ band8Text: string; changesSummary: string }> {
  const systemPrompt = `You are an expert IELTS Speaking examiner and coach. You'll be given a student's actual Speaking response from Part ${partNumber} of an IELTS test. Rewrite their response at IELTS Band 8 level while:
- PRESERVING their content, opinions, and personal touch (this is THEIR voice)
- Fixing grammar errors + word choice
- Adding natural linking devices ("however", "for instance", "as a result")
- Elevating vocabulary where appropriate (avoid overused words)
- Making sentence structure more varied (mix simple + complex)
- Keeping it SPEAKABLE — this will be spoken aloud, so no textbook phrasing
- Length should be similar to original (±20%)

The student's name is ${studentName}. Do NOT change their views or add fake details.

Return JSON: { band8Text, changesSummary }
- band8Text: the rewritten response (natural, spoken register, Band 8)
- changesSummary: 2-3 sentences in Bahasa Indonesia explaining what specifically was improved (e.g., "Menambahkan linking device 'furthermore' dan mengganti kata 'good' dengan 'considerable'. Struktur kalimat divariasi.")`;

  const userPrompt = `Original Speaking Part ${partNumber} response:
"""
${originalTranscript}
"""

Rewrite at Band 8, preserving their content + voice.`;

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
          },
          required: ["band8Text", "changesSummary"],
          additionalProperties: false,
        },
      },
    },
  });
  const raw = response.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") throw new Error("Empty AI response for Band-8 rewrite");
  const parsed = JSON.parse(raw);
  if (!parsed.band8Text || !parsed.changesSummary) throw new Error("Invalid AI response for Band-8 rewrite");
  return { band8Text: parsed.band8Text, changesSummary: parsed.changesSummary };
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

  console.log(`[VoiceClone] Starting for attempt ${attemptId} (${studentName})`);

  // 1. Pick weakest response to rewrite
  const weakest = await pickWeakestResponse(attemptId);
  if (!weakest) throw new Error("No Speaking responses found — cannot proceed with Voice Clone");
  console.log(`[VoiceClone] Targeting Part ${weakest.partNumber} (transcript ${weakest.transcript.length} chars)`);

  // 2. Collect voice samples for cloning
  const samples = await collectVoiceSamples(attemptId, 5);
  console.log(`[VoiceClone] Collected ${samples.length} audio samples for cloning`);

  // 3. Create ElevenLabs voice clone
  const voiceName = `SpecTa VC ${attempt.id} ${studentName.slice(0, 20)}`;
  const voiceId = await createElevenLabsVoiceClone(voiceName, samples);
  console.log(`[VoiceClone] Created ElevenLabs voice ${voiceId}`);

  // 4. Claude rewrites at Band 8
  const { band8Text, changesSummary } = await rewriteAtBand8(
    weakest.transcript,
    weakest.partNumber,
    studentName,
  );
  console.log(`[VoiceClone] Band 8 rewrite: ${band8Text.length} chars`);

  // 5. Generate Band 8 audio using cloned voice
  const band8Audio = await synthesize({
    voiceId,
    text: band8Text,
    modelId: ENV.elevenLabsModelId || "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    stability: 0.5,
    similarityBoost: 0.85, // higher = more like the cloned voice
  });
  console.log(`[VoiceClone] Generated ${band8Audio.length} bytes of Band 8 audio`);

  // 6. Upload to R2
  const band8AudioKey = `voice-clone/${attemptId}/${Date.now()}-band8-part${weakest.partNumber}.mp3`;
  await storagePut(band8AudioKey, band8Audio, "audio/mpeg");
  console.log(`[VoiceClone] Uploaded Band 8 audio: ${band8AudioKey}`);

  return {
    voiceId,
    targetedPartNumber: weakest.partNumber,
    originalTranscript: weakest.transcript,
    originalAudioKey: weakest.audioKey,
    band8Transcript: band8Text,
    band8AudioKey,
    changesSummary,
  };
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

  // Pick the weakest response — heuristic: shortest transcript = probably struggled most
  const withTranscript = uploaded.filter((r: any) => r.transcript);
  if (withTranscript.length === 0) throw new Error("No recordings could be transcribed — cannot proceed");
  withTranscript.sort((a: any, b: any) => (a.transcript || "").length - (b.transcript || "").length);
  const weakest = withTranscript[0];
  console.log(`[VoiceClone] Targeting recording ${weakest.id} (Part ${weakest.partNumber}, ${(weakest.transcript || "").length} chars)`);

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

  // Clone voice
  const studentName = session.customerName || "there";
  const voiceName = `SpecTa VC Standalone ${sessionId} ${String(studentName).slice(0, 20)}`;
  const voiceId = await createElevenLabsVoiceClone(voiceName, audioBuffers);
  console.log(`[VoiceClone] Cloned voice ${voiceId}`);

  // Rewrite at Band 8
  const { band8Text, changesSummary } = await rewriteAtBand8(
    weakest.transcript,
    weakest.partNumber,
    studentName,
  );

  // Generate audio in cloned voice
  const band8Audio = await synthesize({
    voiceId,
    text: band8Text,
    modelId: ENV.elevenLabsModelId || "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    stability: 0.5,
    similarityBoost: 0.85,
  });

  const band8AudioKey = `voice-clone/standalone-${sessionId}/${Date.now()}-band8-part${weakest.partNumber}.mp3`;
  await storagePut(band8AudioKey, band8Audio, "audio/mpeg");
  console.log(`[VoiceClone] Uploaded Band 8 audio for standalone session ${sessionId}`);

  return {
    voiceId,
    targetedPartNumber: weakest.partNumber,
    originalTranscript: weakest.transcript,
    originalAudioKey: weakest.audioKey,
    band8Transcript: band8Text,
    band8AudioKey,
    changesSummary,
  };
}
