/**
 * IELTS Live Speaking — post-call assessment.
 *
 * Takes the conversation transcript captured client-side during the live
 * call and produces an instant IELTS-style band assessment. Text-only, so
 * we honestly assess only 3 of the 4 official criteria:
 *   - Fluency & Coherence   (from answer length, development, connectives,
 *     hesitation markers visible in transcript)
 *   - Lexical Resource      (vocabulary range + accuracy)
 *   - Grammatical Range & Accuracy
 * Pronunciation is NOT assessed (requires audio) — reported as such rather
 * than faked. A future webhook can pull the ElevenLabs recording to add it.
 *
 * Reliability: DeepSeek primary → GLM (DeepInfra) fallback → a minimal
 * hardcoded result if both fail, so the student always sees something.
 */

import { invokeLLM, invokeLLMFallback } from "./_core/llm";

export interface LiveSpeakingCriterion { band: number; comment: string }
export interface LiveSpeakingCorrection { original: string; fixed: string; note?: string }
export interface LiveSpeakingAssessment {
  overallBand: number;
  criteria: {
    fluency: LiveSpeakingCriterion;
    lexical: LiveSpeakingCriterion;
    grammar: LiveSpeakingCriterion;
  };
  pronunciationNote: string;   // why pronunciation isn't scored here
  corrections: LiveSpeakingCorrection[];
  strengths: string[];
  improvements: string[];
  summary: string;
  wordCount: number;           // student words — signals how much they spoke
}

export interface TranscriptTurn { role: "emma" | "you"; text: string }

const clampBand = (n: any): number => {
  const v = Math.round((Number(n) || 0) * 2) / 2; // nearest 0.5
  return Math.max(0, Math.min(9, v));
};

function parseLooseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* extract */ }
  const first = text.indexOf("{");
  if (first < 0) throw new Error("no JSON object");
  let depth = 0, inStr = false, esc = false;
  for (let i = first; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { try { return JSON.parse(text.slice(first, i + 1)); } catch { break; } } }
  }
  const last = text.lastIndexOf("}");
  if (last > first) { try { return JSON.parse(text.slice(first, last + 1)); } catch { /* */ } }
  throw new Error("could not extract JSON");
}

function buildPrompt(turns: TranscriptTurn[], studentWords: number): string {
  const convo = turns
    .map(t => `${t.role === "you" ? "STUDENT" : "EXAMINER (Emma)"}: ${t.text}`)
    .join("\n");
  return `You are a certified IELTS Speaking examiner assessing a student from a live practice conversation. Assess ONLY the STUDENT's spoken English (ignore the examiner's turns except as context).

You are reading an AUTO-GENERATED TRANSCRIPT. Rules:
- Do NOT assess pronunciation — you cannot hear the audio. That criterion is handled separately.
- Ignore transcription punctuation/casing artifacts. Judge the real language.
- Be FAIR like a real examiner, not harsh. A fluent, developed answer with minor errors is typically 6.5-7.5, not 6.0.
- The student spoke about ${studentWords} words total. If very few words (<80), keep bands conservative and note limited sample.

Conversation:
${convo}

Return this exact JSON (no markdown, no prose wrapper):
{
  "overallBand": 6.5,
  "criteria": {
    "fluency": { "band": 6.5, "comment": "2-3 sentence assessment of Fluency & Coherence — flow, development, connectives, hesitation" },
    "lexical": { "band": 7.0, "comment": "2-3 sentence assessment of Lexical Resource — range, accuracy, collocation, paraphrase" },
    "grammar": { "band": 6.0, "comment": "2-3 sentence assessment of Grammatical Range & Accuracy — tense control, complex structures, error density" }
  },
  "corrections": [
    { "original": "exactly what the student said (wrong)", "fixed": "the corrected version", "note": "short rule, e.g. 'present perfect for duration'" }
  ],
  "strengths": ["2-4 specific strengths, full sentences"],
  "improvements": ["3-5 prioritized, actionable practice steps, full sentences"],
  "summary": "2-3 sentence warm, encouraging overall read of their speaking, mentioning the estimated band and their biggest lever to improve"
}

RULES:
- overallBand = fair average of the 3 criteria, on the 0-9 IELTS scale in 0.5 steps.
- corrections: 3-8 of the most useful REAL errors the student actually made. Quote their actual words. If they made almost none, return fewer + say so in a strength.
- English throughout (the report is for an English learner).
- Output JSON only.`;
}

function validate(x: any): boolean {
  if (!x || typeof x !== "object") return false;
  if (!x.criteria?.fluency || !x.criteria?.lexical || !x.criteria?.grammar) return false;
  if (typeof x.summary !== "string" || x.summary.length < 20) return false;
  if (!Array.isArray(x.improvements) || x.improvements.length < 1) return false;
  return true;
}

function normalize(x: any, studentWords: number): LiveSpeakingAssessment {
  const crit = (c: any): LiveSpeakingCriterion => ({ band: clampBand(c?.band), comment: String(c?.comment || "") });
  const fluency = crit(x.criteria.fluency);
  const lexical = crit(x.criteria.lexical);
  const grammar = crit(x.criteria.grammar);
  const overall = x.overallBand != null
    ? clampBand(x.overallBand)
    : clampBand((fluency.band + lexical.band + grammar.band) / 3);
  return {
    overallBand: overall,
    criteria: { fluency, lexical, grammar },
    pronunciationNote: "Pronunciation dinilai dari rekaman suara, bukan teks — jadi tidak termasuk di estimasi ini. Fokus kamu untuk sekarang: 3 kriteria di atas.",
    corrections: (Array.isArray(x.corrections) ? x.corrections : [])
      .slice(0, 8)
      .map((c: any) => ({ original: String(c?.original || ""), fixed: String(c?.fixed || ""), note: c?.note ? String(c.note) : undefined }))
      .filter((c: LiveSpeakingCorrection) => c.original && c.fixed),
    strengths: (Array.isArray(x.strengths) ? x.strengths : []).slice(0, 5).map((s: any) => String(s)),
    improvements: (Array.isArray(x.improvements) ? x.improvements : []).slice(0, 6).map((s: any) => String(s)),
    summary: String(x.summary || ""),
    wordCount: studentWords,
  };
}

function fallbackAssessment(studentWords: number): LiveSpeakingAssessment {
  return {
    overallBand: 6,
    criteria: {
      fluency: { band: 6, comment: "Kamu bisa menjaga percakapan berjalan. Latih menjawab lebih panjang dengan alasan + contoh." },
      lexical: { band: 6, comment: "Kosakata cukup untuk topik sehari-hari. Tambah variasi + collocation." },
      grammar: { band: 6, comment: "Struktur dasar terkontrol. Latih kalimat kompleks + ketepatan tense." },
    },
    pronunciationNote: "Pronunciation dinilai dari rekaman suara, bukan teks — tidak termasuk di estimasi ini.",
    corrections: [],
    strengths: ["Kamu berani bicara langsung dalam percakapan real-time — ini fondasi paling penting."],
    improvements: ["Ambil sesi lagi dan coba jawab setiap pertanyaan minimal 3-4 kalimat.", "Rekam dirimu bicara dan dengarkan ulang untuk menemukan pola kesalahan."],
    summary: "Sistem penilaian sedang sibuk, tapi kerja bagus sudah menyelesaikan sesi! Coba lagi nanti untuk laporan lengkap.",
    wordCount: studentWords,
  };
}

/** Assess a live speaking transcript. Never throws. */
export async function assessLiveSpeaking(turns: TranscriptTurn[]): Promise<LiveSpeakingAssessment> {
  const studentWords = turns
    .filter(t => t.role === "you")
    .reduce((n, t) => n + (t.text.trim().match(/\S+/g)?.length || 0), 0);

  // Too little content to assess meaningfully.
  if (studentWords < 15) {
    return {
      ...fallbackAssessment(studentWords),
      summary: "Percakapan terlalu singkat untuk dinilai. Ambil sesi lagi dan bicara lebih banyak — jawab tiap pertanyaan Emma dengan beberapa kalimat!",
    };
  }

  const prompt = buildPrompt(turns, studentWords);
  const messages = [
    { role: "system" as const, content: "You are a certified IELTS Speaking examiner. Output JSON only." },
    { role: "user" as const, content: prompt },
  ];

  // DeepSeek primary
  try {
    const res = await invokeLLM({ model: "deepseek-v4-pro", messages, response_format: { type: "json_object" } });
    const text = res.choices?.[0]?.message?.content;
    if (typeof text === "string" && text) {
      const parsed = parseLooseJson(text);
      if (validate(parsed)) return normalize(parsed, studentWords);
    }
  } catch (e) {
    console.warn("[LiveAssess] DeepSeek failed:", (e as Error).message);
  }

  // GLM fallback
  try {
    const res = await invokeLLMFallback({ messages, response_format: { type: "json_object" } });
    const text = res.choices?.[0]?.message?.content;
    if (typeof text === "string" && text) {
      const parsed = parseLooseJson(text);
      if (validate(parsed)) {
        console.log("[LiveAssess] ✅ GLM fallback produced assessment");
        return normalize(parsed, studentWords);
      }
    }
  } catch (e) {
    console.error("[LiveAssess] GLM fallback also failed:", (e as Error).message);
  }

  console.error("[LiveAssess] 🚨 both providers failed — hardcoded fallback");
  return fallbackAssessment(studentWords);
}
