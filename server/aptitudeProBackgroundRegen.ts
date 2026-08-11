/**
 * Shared background job to regenerate a Pro Aptitude analysis + PDF + email,
 * given a saved aptitudeResults record whose AI analysis is missing/broken.
 *
 * Used by two call sites:
 *   1. Admin "Regenerate analysis" button (routers.ts regenerateAptitudeAnalysis)
 *   2. AUTOMATIC recovery when submitProResults hits an AI failure — spawned
 *      fire-and-forget so the student never has to wait for admin intervention.
 *
 * This exists because DeepSeek occasionally fails at submit time (rate limit,
 * malformed JSON, network hiccup). The reliability wrapper's 3-retry loop
 * covers most cases, but the tail still leaks through and blocks the whole
 * submit round-trip. This background job runs OUTSIDE the request-response
 * window, so:
 *   - No browser timeout pressure — it can retry for minutes.
 *   - Student already saw a friendly "your report is being generated" screen.
 *   - Owner gets a notify on both success and failure.
 *
 * Assumes the record already exists and has the raw answers saved (which is
 * guaranteed by the "save first, run AI second" pattern in submitProResults).
 */

import { getAptitudeResultById, updateAptitudeResultAnalysis } from "./db";
import { runAptitudeAiAnalysisReliably, validateGeneratedPdf } from "./aptitudeAiReliability";
import { generatePdfReport } from "./pdfGenerator";
import { sendAptitudeResultsEmail } from "./email";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";

const parse = (v: any, fallback: any) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : (v ?? fallback);
  } catch {
    return fallback;
  }
};

const PRO_REGEN_SCHEMA = {
  type: "object",
  properties: {
    personalitySnapshot: { type: "object", properties: { title: { type: "string" }, emoji: { type: "string" }, description: { type: "string" } }, required: ["title", "emoji", "description"], additionalProperties: false },
    bigFiveProfile: {
      type: "object",
      properties: {
        openness: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false },
        conscientiousness: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false },
        extraversion: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false },
        agreeableness: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false },
        neuroticism: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false },
      },
      required: ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"],
      additionalProperties: false,
    },
    riasecAnalysis: { type: "string" },
    miAnalysis: { type: "string" },
    softSkillsAnalysis: { type: "string" },
    creativeThinkingAnalysis: { type: "string" },
    valuesAnalysis: { type: "string" },
    crossDimensionalInsight: { type: "string" },
    recommendedMajors: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, compatibilityScore: { type: "number" }, reason: { type: "string" }, careers: { type: "array", items: { type: "string" } }, salaryRange: { type: "string" }, growthOutlook: { type: "string" } },
        required: ["name", "compatibilityScore", "reason", "careers", "salaryRange", "growthOutlook"],
        additionalProperties: false,
      },
    },
    strengthsAndWeaknesses: {
      type: "object",
      properties: { strengths: { type: "array", items: { type: "string" } }, areasForGrowth: { type: "array", items: { type: "string" } } },
      required: ["strengths", "areasForGrowth"],
      additionalProperties: false,
    },
    learningStyle: { type: "string" },
    careerOutlook: { type: "string" },
    parentSummary: { type: "string" },
    actionPlan: { type: "array", items: { type: "string" } },
  },
  required: ["personalitySnapshot", "bigFiveProfile", "riasecAnalysis", "miAnalysis", "softSkillsAnalysis", "creativeThinkingAnalysis", "valuesAnalysis", "crossDimensionalInsight", "recommendedMajors", "strengthsAndWeaknesses", "learningStyle", "careerOutlook", "parentSummary", "actionPlan"],
  additionalProperties: false,
};

export interface RunProAptitudeRegenOptions {
  /** Override the destination email — usually only the admin uses this to
   *  pull a QA copy to their own inbox. Falls back to the student's email. */
  destinationOverride?: string;
  /** Where this job was triggered from — appears in log lines and owner
   *  notification titles so we can tell "auto-recovery" apart from "admin
   *  clicked Regenerate" without grepping call stacks. */
  triggerSource?: "auto_submit_recovery" | "admin_regenerate";
  /** Wait this many ms before starting. Used by auto-recovery to let a
   *  transient DeepSeek problem (rate limit, brief outage) clear before
   *  we retry — the reliability wrapper already retries 3× in-band, so
   *  a fresh attempt right away would just hit the same wall. */
  initialDelayMs?: number;
}

export interface RunProAptitudeRegenResult {
  ok: boolean;
  recordId: number;
  totalSec: number;
  error?: string;
}

/**
 * Load the saved answers, run the AI + PDF + email pipeline, notify owner
 * on both success and failure. Never throws — this is meant to be called
 * fire-and-forget with `void`.
 */
export async function runProAptitudeBackgroundRegen(
  recordId: number,
  opts: RunProAptitudeRegenOptions = {},
): Promise<RunProAptitudeRegenResult> {
  const trigger = opts.triggerSource || "admin_regenerate";
  const triggerLabel = trigger === "auto_submit_recovery" ? "AutoRecover" : "AdminRegen";

  if (opts.initialDelayMs && opts.initialDelayMs > 0) {
    await new Promise(r => setTimeout(r, opts.initialDelayMs));
  }

  const jobStart = Date.now();
  const r = await getAptitudeResultById(recordId);
  if (!r) {
    console.error(`[${triggerLabel}:${recordId}] 🚨 Record not found — aborting`);
    return { ok: false, recordId, totalSec: 0, error: "record_not_found" };
  }

  const jobTag = `[${triggerLabel}:${recordId}:${r.studentEmail}]`;
  console.log(`${jobTag} 🚀 Starting Pro Aptitude background regen for ${r.studentName}`);

  const riasecScores = parse(r.riasecScores, {});
  const miScores = parse(r.miScores, {});
  const personalAnswers = parse(r.personalAnswers, {});
  const language = (r.language as any) || "id";
  const hollandCode = r.hollandCode || "";

  const sortedRiasec = Object.entries(riasecScores).sort(([, a], [, b]) => (b as number) - (a as number));
  const sortedMI = Object.entries(miScores).sort(([, a], [, b]) => (b as number) - (a as number));
  const topIntelligences = sortedMI.slice(0, 3).map(([k]) => k);
  const profilContext = Object.entries(personalAnswers.profil || {}).map(([k, v]) => `${k}: ${v}`).join(", ");
  const personalityContext = Object.entries(personalAnswers.personality || {}).map(([k, v]) => `${k}: ${v}`).join("; ");
  const sjtContext = Object.entries(personalAnswers.sjt || {}).sort(([, a], [, b]) => (b as number) - (a as number)).map(([k, c]) => `${k} (${c})`).join(", ");
  const creativeContext = Object.entries(personalAnswers.creative || {}).map(([id, a]) => `[${id}]: ${a}`).join("\n");
  const rankingContext = Object.entries(personalAnswers.ranking || {}).map(([id, order]) => `[${id}]: ${(order as string[]).join(" > ")}`).join("\n");

  const prompt = `You are a world-class career psychologist and educational counselor conducting a PREMIUM comprehensive aptitude assessment for a student whose ORIGINAL analysis failed. Deliver a full, deeply personalized report worthy of the Rp 79k they paid. Respond ENTIRELY in ${language === "id" ? "Bahasa Indonesia" : "English"}.

=== STUDENT PROFILE ===
Name: ${r.studentName}
Profile: ${profilContext}

=== DIMENSION 1: CAREER INTERESTS (RIASEC) ===
Holland Code: ${hollandCode}
Scores: ${JSON.stringify(riasecScores)}
Top 3: ${sortedRiasec.slice(0, 3).map(([k, v]) => `${k}=${v}`).join(", ")}

=== DIMENSION 2: MULTIPLE INTELLIGENCES ===
Scores: ${JSON.stringify(miScores)}
Top 3: ${topIntelligences.join(", ")}

=== DIMENSION 3: PERSONALITY & VALUES ===
${personalityContext}

=== DIMENSION 4: SITUATIONAL JUDGMENT ===
${sjtContext}

=== DIMENSION 5: CREATIVE THINKING ===
${creativeContext}

=== DIMENSION 6: LIFE PRIORITIES ===
${rankingContext}

Provide the same comprehensive JSON output as the original PRO analysis: personalitySnapshot (title/emoji/description), bigFiveProfile (5 dimensions with level+description), riasecAnalysis (3-4 sentences), miAnalysis (3-4 sentences), softSkillsAnalysis, creativeThinkingAnalysis, valuesAnalysis, crossDimensionalInsight (4-5 sentences), recommendedMajors (exactly 5 with name/compatibilityScore/reason/careers/salaryRange/growthOutlook), strengthsAndWeaknesses (5 strengths + 3 areasForGrowth), learningStyle, careerOutlook (4-5 sentences), parentSummary (5-6 sentences formal Bahasa), actionPlan (5 steps).

CRITICAL FORMAT RULES:
- compatibilityScore is a NUMBER between 75 and 98 (percentage, NOT 0-10 scale, NOT 0-1 scale). The top-recommended major should be 90-98. The 5th should be 75-85. Values MUST be varied (not all the same).
- recommendedMajors must be an ARRAY of 5 objects, ordered by compatibilityScore DESC (highest first).
- careers must be an ARRAY of 3-5 STRING values (profession names), not objects.
- salaryRange must be a STRING like "Rp 5.000.000 - Rp 20.000.000/bulan", NOT a raw number.

IMPORTANT: Every section must be deeply personal, reference their specific answers, and be worthy of a premium paid report.`;

  const destination = opts.destinationOverride?.trim() || r.studentEmail;

  try {
    console.log(`${jobTag} 🧠 Step 1/4 — running AI analysis (may take 1-5 min with retries)`);
    const runResult = await runAptitudeAiAnalysisReliably({
      model: "deepseek-v4-pro",
      systemPrompt: "You are a world-class career psychologist providing premium aptitude assessments. Always respond with valid JSON only, no markdown formatting.",
      userPrompt: prompt,
      jsonSchema: PRO_REGEN_SCHEMA,
      maxAttempts: 3,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
    });
    const freshAnalysis = runResult.analysis;
    console.log(`${jobTag} ✅ Step 1/4 done — AI validated in ${runResult.attemptsUsed} attempt(s), majors=${(freshAnalysis.recommendedMajors || []).length}`);

    console.log(`${jobTag} 💾 Step 2/4 — saving fresh analysis to DB`);
    await updateAptitudeResultAnalysis(r.id, freshAnalysis);
    console.log(`${jobTag} ✅ Step 2/4 done — DB updated`);

    console.log(`${jobTag} 📄 Step 3/4 — generating PDF`);
    const pdfBuffer = await generatePdfReport({
      studentName: r.studentName,
      language,
      hollandCode,
      riasecScores,
      miScores,
      aiAnalysis: freshAnalysis,
      isPro: true,
    });
    console.log(`${jobTag} 📄 PDF generated: ${(pdfBuffer.length / 1024).toFixed(1)}KB`);
    const pdfCheck = validateGeneratedPdf(pdfBuffer, true);
    if (!pdfCheck.ok) {
      throw new Error(`PDF QA guard rejected: ${pdfCheck.reason}`);
    }
    console.log(`${jobTag} ✅ Step 3/4 done — PDF passed QA (${(pdfBuffer.length / 1024).toFixed(1)}KB)`);

    console.log(`${jobTag} 📧 Step 4/4 — emailing PDF to ${destination}`);
    const ownerBcc = ENV.ownerEmail && ENV.ownerEmail !== destination ? ENV.ownerEmail : undefined;
    await sendAptitudeResultsEmail({
      to: destination,
      studentName: r.studentName,
      language,
      hollandCode,
      riasecScores,
      miScores,
      aiAnalysis: freshAnalysis,
      pdfBuffer,
      isPro: true,
      bcc: ownerBcc,
    });
    const totalSec = Math.round((Date.now() - jobStart) / 1000);
    console.log(`${jobTag} ✅✅✅ Step 4/4 done — email sent. Total: ${totalSec}s`);

    const successTitle = trigger === "auto_submit_recovery"
      ? `✅ Aptitude auto-recovery SUCCESS: ${r.studentName}`
      : `✅ Aptitude regen SUCCESS: ${r.studentName}`;
    const successBody = trigger === "auto_submit_recovery"
      ? `Student ${r.studentName} (${r.studentEmail}) hit an AI failure at submit — the background auto-recovery finished in ${totalSec}s and the fresh ${(pdfBuffer.length / 1024).toFixed(1)}KB PDF is on the way to ${destination}${ownerBcc ? ` (BCC'd to ${ownerBcc})` : ""}. Student never had to wait, never had to retake, and you never had to click anything.`
      : `Fresh ${(pdfBuffer.length / 1024).toFixed(1)}KB PDF with ${(freshAnalysis.recommendedMajors || []).length} majors emailed to ${destination}${ownerBcc ? ` (BCC'd to ${ownerBcc})` : ""}. Total regen time: ${totalSec}s. Check inbox now.`;
    notifyOwner({ title: successTitle, content: successBody }).catch(() => {});
    return { ok: true, recordId, totalSec };
  } catch (jobErr) {
    const totalSec = Math.round((Date.now() - jobStart) / 1000);
    const msg = (jobErr as Error).message;
    console.error(`${jobTag} 🚨 REGEN FAILED after ${totalSec}s: ${msg}`);
    const failTitle = trigger === "auto_submit_recovery"
      ? `🚨 Aptitude auto-recovery FAILED: ${r.studentName} — MANUAL ACTION NEEDED`
      : `🚨 Aptitude regen FAILED: ${r.studentName}`;
    const failBody = trigger === "auto_submit_recovery"
      ? `Student ${r.studentName} (${r.studentEmail}) submitted the Pro test, AI failed at submit, and the automatic background recovery ALSO failed after ${totalSec}s.\n\nError: ${msg}\n\nTheir answers ARE still saved (record id=${recordId}). Please:\n  1. WhatsApp them to acknowledge + apologize\n  2. Admin > Aptitude Manager > "Regenerate analysis" > ${r.studentEmail}\n  3. If it fails again, DeepSeek is having a wider outage — wait 30 min and retry.\n\nCheck Railway logs (filter: ${jobTag}) for the full trace.`
      : `Background regen for ${r.studentEmail} failed after ${totalSec}s.\n\nError: ${msg}\n\nCheck Railway logs for full trace (filter: [AdminRegen:${recordId}]). Retry via admin > Regenerate FULL AI analysis.`;
    notifyOwner({ title: failTitle, content: failBody }).catch(() => {});
    return { ok: false, recordId, totalSec, error: msg };
  }
}
