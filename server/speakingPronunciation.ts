/**
 * IELTS Speaking — Pronunciation assessment from AUDIO.
 *
 * The text-based grader can only estimate pronunciation from transcript
 * artefacts. This module listens to the candidate's actual recording using
 * Gemini (audio-capable) and rates it against the official IELTS Speaking
 * band descriptors for Pronunciation — the way a human examiner does:
 * intelligibility, word/sentence stress, rhythm, intonation, connected
 * speech, individual sounds, and the effect of L1 (Indonesian) accent.
 *
 * Requires GEMINI_API_KEY. Returns null on ANY failure (no key, unsupported
 * audio, API error, bad JSON) so the caller can fall back to the text
 * estimate — the mock pipeline must never break because of this step.
 */

const GEMINI_MODEL = () => process.env.GEMINI_PRONUNCIATION_MODEL || "gemini-2.0-flash";
const MAX_INLINE_BYTES = 15 * 1024 * 1024; // Gemini inline request ceiling (~20MB) with headroom

export interface PronunciationResult {
  scoreP: number;            // 0–9 in 0.5 steps
  feedback: string;          // 2–3 sentences for the report
  source: "audio";
}

const PRONUNCIATION_DESCRIPTORS = `OFFICIAL IELTS SPEAKING BAND DESCRIPTORS — PRONUNCIATION (public version):
Band 9: Uses a full range of pronunciation features with precision and subtlety; sustains flexible use of features throughout; is effortless to understand.
Band 8: Uses a wide range of pronunciation features; sustains flexible use of features, with only occasional lapses; is easy to understand throughout; L1 accent has minimal effect on intelligibility.
Band 7: Shows all the positive features of Band 6 and some, but not all, of the positive features of Band 8.
Band 6: Uses a range of pronunciation features with mixed control; shows some effective use of features but this is not sustained; can generally be understood throughout, though mispronunciation of individual words or sounds reduces clarity at times.
Band 5: Shows all the positive features of Band 4 and some, but not all, of the positive features of Band 6.
Band 4: Uses a limited range of pronunciation features; attempts to control features but lapses are frequent; mispronunciations are frequent and cause some difficulty for the listener.
Band 3: Shows some of the features of Band 2 and some, but not all, of the positive features of Band 4.
Band 2: Speech is often unintelligible.
"Pronunciation features" = individual sounds, word stress, sentence stress, rhythm, intonation, chunking/pausing, and connected speech (linking, weak forms).`;

const clampHalf = (n: number) => Math.max(0, Math.min(9, Math.round((Number(n) || 0) * 2) / 2));

/**
 * Assess pronunciation from an audio recording of the test.
 * `mixed` = the recording also contains the examiner (ElevenLabs conversation
 * audio); the model is told to ignore her. The browser mic recording is
 * candidate-only (mixed=false).
 */
export async function assessPronunciationFromAudio(args: {
  buffer: Buffer;
  mimeType: string;
  transcript: string;   // role-labelled transcript for reference
  mixed?: boolean;
}): Promise<PronunciationResult | null> {
  // Accept the common names for the Google AI Studio key so a differently
  // named Railway variable still works.
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_KEY;
  if (!key) {
    console.warn("[Pronunciation] no Gemini key found (GEMINI_API_KEY / GOOGLE_API_KEY / GOOGLE_AI_API_KEY) — skipping audio assessment");
    return null;
  }
  if (!args.buffer || args.buffer.length < 2000) return null;
  if (args.buffer.length > MAX_INLINE_BYTES) {
    console.warn(`[Pronunciation] audio too large for inline request (${args.buffer.length} bytes)`);
    return null;
  }

  const speakerNote = args.mixed
    ? `The recording contains BOTH the examiner (a synthetic British female voice, "Emma") and the candidate. Assess ONLY the candidate. Ignore the examiner entirely.`
    : `The recording contains ONLY the candidate's voice (their microphone). The examiner's questions are not in the audio.`;

  const prompt = `You are a certified IELTS Speaking examiner. Listen to this recording of a candidate (first language: Indonesian) taking the IELTS Speaking test and assess their PRONUNCIATION ONLY, strictly against the official band descriptors below.

${speakerNote}

${PRONUNCIATION_DESCRIPTORS}

Reference transcript of the test (auto-generated; use only to follow along — judge the AUDIO, not the text):
"""
${args.transcript.slice(0, 12000)}
"""

Listen for: intelligibility overall; individual sounds (e.g. /θ/ /ð/ /v/ /f/, final consonants, vowel length); word stress; sentence stress and rhythm; intonation and chunking; connected speech; and how much the L1 accent affects understanding. Be accurate like a real examiner, not generous or harsh — most candidates fall between 5.0 and 7.0.

Return JSON ONLY:
{
  "scoreP": <band 0-9 in 0.5 steps>,
  "feedback": "<2-3 sentences: what they do well, the specific features that limit them (name actual sounds/patterns you heard), and the single most useful thing to practise>"
}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: args.mimeType || "audio/webm", data: args.buffer.toString("base64") } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: { response_mime_type: "application/json", temperature: 0.2, max_output_tokens: 800 },
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL()}:generateContent?key=${encodeURIComponent(key)}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[Pronunciation] Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data: any = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    if (!text) return null;
    let parsed: any;
    try { parsed = JSON.parse(text); }
    catch {
      const a = text.indexOf("{"), b = text.lastIndexOf("}");
      if (a < 0 || b <= a) return null;
      parsed = JSON.parse(text.slice(a, b + 1));
    }
    const scoreP = clampHalf(parsed?.scoreP);
    const feedback = typeof parsed?.feedback === "string" ? parsed.feedback.trim() : "";
    if (!feedback || scoreP <= 0) return null;
    console.log(`[Pronunciation] ✅ audio-assessed band ${scoreP}`);
    return { scoreP, feedback, source: "audio" };
  } catch (e) {
    console.warn("[Pronunciation] Gemini call failed:", (e as Error).message);
    return null;
  }
}
