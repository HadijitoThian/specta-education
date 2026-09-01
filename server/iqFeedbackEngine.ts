/**
 * SpecTa IQ Discovery — AI-personalized narrative feedback.
 *
 * Given a scored result, produce human-warm Bahasa Indonesia narrative:
 *   - Overall summary (2-3 sentences that call out the archetype + top
 *     domains, personalized to the student's name)
 *   - Per-domain interpretation (1-2 sentences each — what it means to
 *     score band X on this dimension)
 *   - Strengths (3-4 concrete strengths derived from top-2 domains)
 *   - Growth areas (2-3 areas from lowest domain)
 *   - Career hints (3-5 career suggestions matched to the archetype +
 *     top domains — realistic Indonesian job market)
 *
 * Reliability: reuses the DeepSeek → GLM fallback path from
 * server/_core/llm.ts. If BOTH providers fail, we still return a valid
 * (if generic) result using hardcoded fallback text so the student
 * always sees SOMETHING coherent — never a raw error page.
 */

import { invokeLLM, invokeLLMFallback } from "./_core/llm";
import type { IqScoreResult, IqDomain } from "./iqQuestionTypes";
import { IQ_DOMAIN_LABELS } from "./iqQuestionTypes";

export interface IqNarrative {
  summary: string;
  perDomain: Record<IqDomain, string>;
  strengths: string[];
  growthAreas: string[];
  careerHints: string[];
}

/**
 * Loose JSON extractor — same helper we use in aptitudeAiReliability.
 * Handles the "here is your JSON: {…}" prose-wrapper case + trailing chatter.
 */
function parseLooseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* try smarter extraction */ }
  const first = text.indexOf("{");
  if (first < 0) throw new Error("no { in response");
  let depth = 0, inString = false, escape = false;
  for (let i = first; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(first, i + 1)); } catch { break; }
      }
    }
  }
  const last = text.lastIndexOf("}");
  if (last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch { /* fall through */ }
  }
  throw new Error("could not extract JSON");
}

function buildPrompt(score: IqScoreResult, studentName: string, mode: "preview" | "full"): string {
  const perDomainSummary = (Object.keys(score.perDomain) as IqDomain[])
    .map(d => `${IQ_DOMAIN_LABELS[d].id}: skor ${score.perDomain[d].scaledBand}/17 (${score.perDomain[d].correct}/${score.perDomain[d].total} benar)`)
    .join("\n  - ");

  return `Kamu adalah seorang psikolog kognitif yang menulis feedback hangat + personal untuk siswa Indonesia usia 14-20 tahun berdasarkan hasil tes IQ mereka. Output JSON only.

Data siswa:
  Nama: ${studentName || "Siswa"}
  Mode tes: ${mode === "preview" ? "PREVIEW (5 soal, indikasi kasar)" : "LENGKAP (40 soal)"}
  Estimasi IQ: ${score.fsiq} (persentil ${score.percentile})
  Arketip kognitif: ${score.archetype.labelId} ${score.archetype.emoji} — "${score.archetype.tagline.id}"
  Skor per dimensi:
  - ${perDomainSummary}

Return this exact JSON:
{
  "summary": "2-3 kalimat overview hangat. Sebut nama siswa, sebut arketip mereka, sebut top domain-nya. Tone friendly, personal, encouraging. TIDAK boleh clinical/kaku.",
  "perDomain": {
    "fluid": "1-2 kalimat menjelaskan skor Penalaran Logika mereka — apa artinya, di mana mereka jago/lemah",
    "quantitative": "1-2 kalimat untuk Penalaran Angka",
    "verbal": "1-2 kalimat untuk Penalaran Verbal",
    "spatial": "1-2 kalimat untuk Penalaran Spasial",
    "memory": "1-2 kalimat untuk Memori Kerja"
  },
  "strengths": ["3-4 kekuatan konkret berdasarkan 2 domain tertinggi. Format: kalimat lengkap, bukan bullet points."],
  "growthAreas": ["2-3 area pertumbuhan berdasarkan domain terendah. Kalimat lengkap. Nada supportive bukan kritik."],
  "careerHints": ["3-5 saran karir/jurusan realistis di Indonesia yang cocok dengan arketip + top domain mereka. Sebut nama spesifik (Teknik Informatika, Psikologi, Arsitektur, Kedokteran, Ekonomi, Desain, dll)."]
}

RULES:
- Semua dalam Bahasa Indonesia yang natural, tidak baku.
- Tone: seperti kakak/mentor bicara ke adik, bukan seperti report klinis.
- Jangan bilang "IQ Anda adalah..." — sebut angkanya tapi framing sebagai "profil"/"otakmu", bukan "IQ resmi".
- Untuk mode PREVIEW: SELALU tambahin di summary bahwa ini estimasi kasar dan bank soal terbatas — dorong mereka ke tes lengkap untuk hasil yang lebih valid.
- Rekomendasi karir HARUS realistis untuk Indonesia (jurusan yang ada di universitas Indonesia, profesi yang bisa diakses).
- Jangan copy-paste generic advice. Personalisasi setiap section berdasarkan skor spesifik siswa.
- Output JSON only, no prose wrapper.`;
}

/**
 * Static fallback narrative used when BOTH AI providers fail. Generic
 * but never leaves the student staring at an error. Personalization is
 * limited to name + archetype label.
 */
function fallbackNarrative(score: IqScoreResult, studentName: string): IqNarrative {
  const name = studentName || "Kamu";
  const emoji = score.archetype.emoji;
  const arch = score.archetype.labelId;
  return {
    summary: `${name}, hasil tesmu menunjukkan kamu adalah ${arch} ${emoji}. Estimasi IQ kamu di ${score.fsiq}, di persentil ${score.percentile}. ${score.archetype.tagline.id}`,
    perDomain: {
      fluid: `Skor Penalaran Logika kamu: ${score.perDomain.fluid.scaledBand}/17. Ini mengukur kemampuan mengenali pola dan berpikir abstrak.`,
      quantitative: `Skor Penalaran Angka kamu: ${score.perDomain.quantitative.scaledBand}/17. Kemampuan bermain dengan pola numerik dan logika kuantitatif.`,
      verbal: `Skor Penalaran Verbal kamu: ${score.perDomain.verbal.scaledBand}/17. Menunjukkan kefasihan berpikir dengan kata dan analogi.`,
      spatial: `Skor Penalaran Spasial kamu: ${score.perDomain.spatial.scaledBand}/17. Kemampuan memvisualisasikan bentuk dan ruang 3D.`,
      memory: `Skor Memori Kerja kamu: ${score.perDomain.memory.scaledBand}/17. Kapasitas mengingat dan memanipulasi informasi jangka pendek.`,
    },
    strengths: [
      `Kamu punya kekuatan di area yang sesuai dengan arketip ${arch}.`,
      `Profil kognitifmu unik — manfaatkan kekuatan ini untuk memilih jalur belajar yang cocok.`,
    ],
    growthAreas: [
      `Setiap orang punya area yang bisa dilatih — fokus pada domain terlemahmu untuk pertumbuhan seimbang.`,
    ],
    careerHints: [
      `Sesuaikan pilihan jurusan dengan kekuatan kognitifmu.`,
      `Konsultasikan hasil ini dengan SpecTa Education untuk rekomendasi jurusan yang lebih personal.`,
    ],
  };
}

/**
 * Main entrypoint. Tries DeepSeek first, falls back to DeepInfra/GLM,
 * then to hardcoded generic narrative if both fail. Never throws — the
 * student ALWAYS sees a valid result.
 */
export async function generateIqNarrative(
  score: IqScoreResult,
  studentName: string,
  mode: "preview" | "full",
): Promise<IqNarrative> {
  const prompt = buildPrompt(score, studentName, mode);
  const messages = [
    { role: "system" as const, content: "You are a warm, personal Indonesian cognitive psychologist writing feedback for a 14-20yo student. Output JSON only, in Bahasa Indonesia." },
    { role: "user" as const, content: prompt },
  ];

  // Attempt 1: DeepSeek (primary)
  try {
    const res = await invokeLLM({
      model: "deepseek-v4-pro",
      messages,
      response_format: { type: "json_object" },
    });
    const raw = res.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : "";
    if (!text) throw new Error("DeepSeek returned empty content");
    const parsed = parseLooseJson(text);
    if (validateNarrative(parsed)) return normaliseNarrative(parsed);
    console.warn(`[IqFeedback] DeepSeek response failed validation for ${studentName}`);
  } catch (e) {
    console.warn(`[IqFeedback] DeepSeek failed for ${studentName}:`, (e as Error).message);
  }

  // Attempt 2: DeepInfra/GLM fallback
  try {
    const res = await invokeLLMFallback({
      messages,
      response_format: { type: "json_object" },
    });
    const raw = res.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : "";
    if (!text) throw new Error("GLM fallback returned empty content");
    const parsed = parseLooseJson(text);
    if (validateNarrative(parsed)) {
      console.log(`[IqFeedback] ✅ GLM fallback saved narrative for ${studentName}`);
      return normaliseNarrative(parsed);
    }
  } catch (e) {
    console.error(`[IqFeedback] GLM fallback also failed for ${studentName}:`, (e as Error).message);
  }

  // Attempt 3: hardcoded generic — never fail the student
  console.error(`[IqFeedback] 🚨 BOTH providers failed for ${studentName} — using hardcoded fallback narrative`);
  return fallbackNarrative(score, studentName);
}

function validateNarrative(x: any): boolean {
  if (!x || typeof x !== "object") return false;
  if (typeof x.summary !== "string" || x.summary.length < 30) return false;
  if (!x.perDomain || typeof x.perDomain !== "object") return false;
  for (const d of ["fluid", "quantitative", "verbal", "spatial", "memory"]) {
    if (typeof x.perDomain[d] !== "string" || x.perDomain[d].length < 10) return false;
  }
  if (!Array.isArray(x.strengths) || x.strengths.length < 2) return false;
  if (!Array.isArray(x.growthAreas) || x.growthAreas.length < 1) return false;
  if (!Array.isArray(x.careerHints) || x.careerHints.length < 2) return false;
  return true;
}

function normaliseNarrative(x: any): IqNarrative {
  return {
    summary: String(x.summary || ""),
    perDomain: {
      fluid: String(x.perDomain?.fluid || ""),
      quantitative: String(x.perDomain?.quantitative || ""),
      verbal: String(x.perDomain?.verbal || ""),
      spatial: String(x.perDomain?.spatial || ""),
      memory: String(x.perDomain?.memory || ""),
    },
    strengths: (Array.isArray(x.strengths) ? x.strengths : []).slice(0, 5).map((s: any) => String(s)),
    growthAreas: (Array.isArray(x.growthAreas) ? x.growthAreas : []).slice(0, 4).map((s: any) => String(s)),
    careerHints: (Array.isArray(x.careerHints) ? x.careerHints : []).slice(0, 6).map((s: any) => String(s)),
  };
}
