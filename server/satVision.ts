/**
 * SpecTa SAT Self-Prep — Phase 3: "photo of my working".
 * The student photographs their handwritten working; Gemini reads it against
 * the question and tells them exactly where it went wrong (or right).
 * Requires a Gemini key (same aliases as speakingPronunciation). Returns null
 * on any failure so the caller can show a friendly message.
 */

const MODEL = () => process.env.GEMINI_VISION_MODEL || process.env.GEMINI_PRONUNCIATION_MODEL || "gemini-2.0-flash";
const key = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_KEY || "";

export function visionAvailable(): boolean { return !!key(); }

export async function reviewWorkingPhoto(args: {
  imageBase64: string; mimeType: string; lang: "en" | "id";
  question: { passage: string | null; stem: string; choices: string[] | null; answer: string; explanation: string; format: "mc" | "spr" };
  studentAnswer?: string | null; note?: string;
}): Promise<string | null> {
  const k = key(); if (!k) return null;
  const choices = args.question.choices ? args.question.choices.map((c, i) => `${"ABCD"[i]}. ${c}`).join("\n") : "(student-produced numeric response)";
  const prompt = `You are Emma, SpecTa's SAT tutor. The image is a photo of the student's handwritten working for the SAT question below. Read the working carefully.

QUESTION:
${args.question.passage ? args.question.passage + "\n\n" : ""}${args.question.stem}
${choices}
CORRECT ANSWER: ${args.question.answer}
REFERENCE EXPLANATION: ${args.question.explanation}
STUDENT'S SUBMITTED ANSWER: ${args.studentAnswer || "(none)"}
${args.note ? `STUDENT'S NOTE: ${args.note}` : ""}

Reply ${args.lang === "id" ? "in Bahasa Indonesia (keep SAT/math terms in English)" : "in English"}, as Emma speaking directly to the student, in at most 120 words:
1. Say what you can see they did (quote or paraphrase their steps briefly).
2. Point to the exact line/step where it goes wrong (or confirm it's correct), and why.
3. Give the one fix or next step. Do not just restate the full solution.
If the photo is unreadable or not about this question, say so kindly and ask for a clearer photo.`;
  const body = {
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: args.mimeType || "image/jpeg", data: args.imageBase64 } }, { text: prompt }] }],
    generationConfig: { temperature: 0.3, max_output_tokens: 500 },
  };
  try {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 45000);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent?key=${encodeURIComponent(k)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) { console.warn(`[SAT vision] Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`); return null; }
    const data: any = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("").trim() || "";
    return text || null;
  } catch (e) { console.warn("[SAT vision] failed:", (e as Error).message); return null; }
}
