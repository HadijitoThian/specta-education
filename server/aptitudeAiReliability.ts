/**
 * Aptitude PRO AI-analysis reliability + PDF QA guard.
 *
 * WHY THIS FILE EXISTS:
 * We shipped a Pro Aptitude Test PDF for Cherise Felica Daulat that was only
 * 4 pages (12.1KB), missing all AI-generated content — RIASEC analysis,
 * Multiple Intelligences analysis, 5 recommended majors, career outlook,
 * parent summary. Every one of those sections has a code gate:
 *   if (data.aiAnalysis?.riasecAnalysis) { ... render section ... }
 * When the AI call failed, the catch (line 3090 in routers.ts) silently
 * swallowed the error and set aiAnalysis to `{ error: "Failed to parse" }`
 * — no field names present → every section gate returned false → PDF
 * generator emitted the cover + scores + generic CTA and nothing else.
 * Customer paid Rp 79k, got a Rp 5k experience.
 *
 * This module fixes that with:
 *   1. runAptitudeAiAnalysisReliably() — retries the AI call up to 3× with
 *      exponential backoff, logs each attempt, validates the schema, and
 *      THROWS instead of swallowing errors so callers must handle failure.
 *   2. validateAiAnalysisForPdf() — schema-validates that the AI response
 *      contains the minimum fields the PDF renderer needs.
 *   3. validateGeneratedPdf() — final QA guard on the PDF buffer itself:
 *      if it's under a size threshold (indicating missing content), reject.
 *
 * Together these guarantee: if the AI or PDF pipeline breaks, we notify
 * the owner and refuse to send a broken PDF to the customer — instead of
 * silently shipping an embarrassing 4-page brochure.
 */

import { invokeLLM, invokeLLMFallback } from "./_core/llm";
import { notifyOwner } from "./_core/notification";

// ── AI Analysis Schema ───────────────────────────────────────────────────
// Fields the PDF renderer references. If ANY of these are missing, we do
// not have a valid Pro analysis — do not send the PDF.

const REQUIRED_TOP_FIELDS = [
  "personalitySnapshot",
  "riasecAnalysis",
  "miAnalysis",
  "recommendedMajors",
  "careerOutlook",
  "parentSummary",
  "actionPlan",
  "strengthsAndWeaknesses",
] as const;

const REQUIRED_SNAPSHOT_FIELDS = ["title", "description"] as const;
const MIN_ANALYSIS_LENGTH = 200;   // characters, ensures actual paragraph, not "N/A"
const MIN_RECOMMENDED_MAJORS = 3;   // < 3 = probably broken
const MIN_ACTION_PLAN_STEPS = 3;
const MIN_STRENGTHS = 3;

export interface AiAnalysisValidationResult {
  ok: boolean;
  missingFields: string[];
  warnings: string[];
}

export function validateAiAnalysisForPdf(analysis: any): AiAnalysisValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!analysis || typeof analysis !== "object") {
    return { ok: false, missingFields: ["entire analysis object"], warnings: [] };
  }

  // If the AI returned { error: ... } — that's a hard fail
  if (analysis.error && !analysis.personalitySnapshot) {
    return { ok: false, missingFields: [`AI returned error: ${analysis.error}`], warnings: [] };
  }

  for (const field of REQUIRED_TOP_FIELDS) {
    if (!analysis[field]) missing.push(field);
  }

  // Snapshot must have both title + description
  if (analysis.personalitySnapshot) {
    for (const f of REQUIRED_SNAPSHOT_FIELDS) {
      if (!analysis.personalitySnapshot[f]) missing.push(`personalitySnapshot.${f}`);
    }
  }

  // Analysis paragraphs must be substantial (not "N/A" or "TBD")
  for (const analysisField of ["riasecAnalysis", "miAnalysis", "careerOutlook", "parentSummary"]) {
    if (analysis[analysisField] && typeof analysis[analysisField] === "string") {
      if (analysis[analysisField].length < MIN_ANALYSIS_LENGTH) {
        warnings.push(`${analysisField} is suspiciously short (${analysis[analysisField].length} chars, expected >${MIN_ANALYSIS_LENGTH})`);
      }
    }
  }

  // Recommended majors: must have at least N. Accept partial-data majors —
  // `name` alone is enough because safeStr() in pdfGenerator handles blanks
  // gracefully. Previously required ALL of name+reason+careers which caused
  // 2/3 AI attempts to fail validation over minor schema deviations.
  if (Array.isArray(analysis.recommendedMajors)) {
    if (analysis.recommendedMajors.length < MIN_RECOMMENDED_MAJORS) {
      missing.push(`recommendedMajors (only ${analysis.recommendedMajors.length}, need ≥${MIN_RECOMMENDED_MAJORS})`);
    }
    // Count how many have at least a name. If fewer than MIN_RECOMMENDED_MAJORS
    // have a usable name, that's a real problem.
    const namedMajors = analysis.recommendedMajors.filter((m: any) => m && (m.name || m.majorName || m.title));
    if (namedMajors.length < MIN_RECOMMENDED_MAJORS) {
      missing.push(`recommendedMajors: only ${namedMajors.length} have a usable name field (need ≥${MIN_RECOMMENDED_MAJORS})`);
    }
    // Warn about incomplete majors but don't fail the whole analysis
    for (let i = 0; i < analysis.recommendedMajors.length; i++) {
      const m = analysis.recommendedMajors[i];
      if (m && m.name && (!m.reason || !Array.isArray(m.careers))) {
        warnings.push(`recommendedMajors[${i}] "${m.name}" missing reason or careers — PDF will still render`);
      }
    }
  }

  // Action plan: must have at least N steps
  if (Array.isArray(analysis.actionPlan) && analysis.actionPlan.length < MIN_ACTION_PLAN_STEPS) {
    missing.push(`actionPlan (only ${analysis.actionPlan.length} steps, need ≥${MIN_ACTION_PLAN_STEPS})`);
  }

  // Strengths: must have at least N
  if (analysis.strengthsAndWeaknesses?.strengths && analysis.strengthsAndWeaknesses.strengths.length < MIN_STRENGTHS) {
    missing.push(`strengthsAndWeaknesses.strengths (only ${analysis.strengthsAndWeaknesses.strengths.length}, need ≥${MIN_STRENGTHS})`);
  }

  return { ok: missing.length === 0, missingFields: missing, warnings };
}

// ── PDF QA Guard ─────────────────────────────────────────────────────────

/**
 * PDF size floor as a "did the render produce actual content?" sanity check.
 * Calibrated against real generation runs:
 *   - Cherise's ORIGINAL broken PDF (missing all AI content) = 12KB
 *   - Fresh regen with all AI fields populated = 36.5KB
 *   - So the meaningful threshold is somewhere between: 20-25KB catches
 *     the truly broken case while accepting normal comprehensive reports.
 * We use 22KB — comfortably above the 12KB "no AI content" case and well
 * below any legitimate rendered PDF with the full AI analysis included.
 */
const MIN_PRO_PDF_BYTES = 22 * 1024;   // 22 KB — real Pro PDFs measured at 36KB+
const MIN_FREE_PDF_BYTES = 8 * 1024;   // 8 KB (free is smaller by design)

export interface PdfValidationResult {
  ok: boolean;
  reason?: string;
  sizeBytes: number;
}

export function validateGeneratedPdf(pdfBuffer: Buffer, isPro: boolean): PdfValidationResult {
  const size = pdfBuffer.length;
  const min = isPro ? MIN_PRO_PDF_BYTES : MIN_FREE_PDF_BYTES;
  if (size < min) {
    return {
      ok: false,
      sizeBytes: size,
      reason: `PDF is ${(size / 1024).toFixed(1)}KB (expected ≥${(min / 1024).toFixed(0)}KB) — likely missing content sections`,
    };
  }
  return { ok: true, sizeBytes: size };
}

// ── Reliable AI Analysis Runner ──────────────────────────────────────────

export interface AiAnalysisRunOptions {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: any;
  maxAttempts?: number;         // default 3
  studentEmail?: string;         // for error notifications
  studentName?: string;
}

export interface AiAnalysisRunResult {
  analysis: any;
  attemptsUsed: number;
  totalMs: number;
  validation: AiAnalysisValidationResult;
}

/**
 * Run the AI analysis with retry + validation. Retries on:
 *   - Network / API errors
 *   - JSON parse failures
 *   - Validation failures (missing required fields)
 *
 * Exponential backoff between attempts (5s, 15s). If all attempts fail,
 * NOTIFIES OWNER and THROWS — caller must handle. This is the critical
 * difference from the old code which silently returned { error: "..." }.
 */
export async function runAptitudeAiAnalysisReliably(
  opts: AiAnalysisRunOptions,
): Promise<AiAnalysisRunResult> {
  const maxAttempts = opts.maxAttempts || 3;
  const started = Date.now();
  const errors: string[] = [];
  let analysis: any = null;
  let validation: AiAnalysisValidationResult = { ok: false, missingFields: ["not attempted"], warnings: [] };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[AptitudePro] AI analysis attempt ${attempt}/${maxAttempts} for ${opts.studentEmail || "?"}`);

      const aiResponse = await invokeLLM({
        model: opts.model || "deepseek-v4-pro",
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pro_aptitude_analysis",
            strict: true,
            schema: opts.jsonSchema,
          },
        },
      });

      const rawContent = aiResponse.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error(`AI returned empty content (attempt ${attempt})`);
      }

      const content = typeof rawContent === "string" ? rawContent : String(rawContent);
      // Log first 500 chars so we can debug quality from Railway logs
      console.log(`[AptitudePro] AI raw response (${content.length} chars, attempt ${attempt}): ${content.slice(0, 500)}...`);

      analysis = JSON.parse(content);
      validation = validateAiAnalysisForPdf(analysis);

      if (validation.ok) {
        console.log(`[AptitudePro] ✅ AI analysis validated on attempt ${attempt} (${Date.now() - started}ms total)`);
        if (validation.warnings.length) {
          console.warn(`[AptitudePro] ⚠️ Warnings: ${validation.warnings.join("; ")}`);
        }
        return { analysis, attemptsUsed: attempt, totalMs: Date.now() - started, validation };
      }

      // Validation failed — retry
      errors.push(`Attempt ${attempt}: validation failed — missing ${validation.missingFields.join(", ")}`);
      console.warn(`[AptitudePro] ⚠️ Attempt ${attempt} produced analysis but validation failed: ${validation.missingFields.join(", ")}`);
    } catch (e) {
      const msg = (e as Error).message;
      errors.push(`Attempt ${attempt}: ${msg}`);
      console.error(`[AptitudePro] ❌ Attempt ${attempt} threw:`, msg);
    }

    // Exponential backoff before next attempt (5s, then 15s)
    if (attempt < maxAttempts) {
      const backoffMs = attempt * 5000;
      console.log(`[AptitudePro] Waiting ${backoffMs}ms before retry...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }

  // ── DeepSeek exhausted — try the DeepInfra/GLM fallback once ───────────
  // DeepSeek and DeepInfra run on different infra, so simultaneous failures
  // are rare enough to give near-zero effective failure rate. Only paid
  // when DeepSeek is actually broken (~1× per few hundred submits based on
  // Aug 2026 incident rate), so the modest cost delta per fallback is
  // negligible against saving a paying student from a 5-7 min auto-recovery
  // wait. Uses the existing DEEPINFRA_API_KEY (same key that powers our
  // image pipeline) so no new secrets on Railway.
  console.warn(`[AptitudePro] 🔁 DeepSeek exhausted for ${opts.studentEmail} — trying DeepInfra/GLM fallback…`);
  try {
    const fbStart = Date.now();
    const fbResponse = await invokeLLMFallback({
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pro_aptitude_analysis",
          strict: true,
          schema: opts.jsonSchema,
        },
      },
    });
    const rawContent = fbResponse.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("DeepInfra/GLM fallback returned empty content");
    const content = typeof rawContent === "string" ? rawContent : String(rawContent);
    console.log(`[AptitudePro] DeepInfra/GLM fallback raw response (${content.length} chars): ${content.slice(0, 500)}...`);
    analysis = JSON.parse(content);
    validation = validateAiAnalysisForPdf(analysis);
    if (validation.ok) {
      const fbMs = Date.now() - fbStart;
      console.log(`[AptitudePro] ✅✅ DeepInfra/GLM fallback SAVED ${opts.studentEmail} after ${maxAttempts} DeepSeek fails (fallback took ${fbMs}ms, total ${Date.now() - started}ms)`);
      // Fire-and-forget owner note so we can track how often DeepSeek is
      // flaking. Don't block the student's response on this.
      notifyOwner({
        title: `⚠️ Aptitude Pro DeepSeek failed — GLM fallback saved ${opts.studentName || "?"}`,
        content: `Student: ${opts.studentName || "?"} (${opts.studentEmail || "?"})\n\nDeepSeek failed all ${maxAttempts} attempts:\n${errors.join("\n")}\n\nGLM (via DeepInfra) fallback succeeded in ${fbMs}ms — student got their report on first submit with no visible failure. No manual action needed.\n\nIf you see this notification frequently, DeepSeek is unreliable and we should either (a) reorder providers so GLM goes first, or (b) run both in parallel and take whichever finishes.`,
      }).catch(() => {});
      return { analysis, attemptsUsed: maxAttempts + 1, totalMs: Date.now() - started, validation };
    }
    errors.push(`DeepInfra/GLM fallback: validation failed — missing ${validation.missingFields.join(", ")}`);
    console.warn(`[AptitudePro] ⚠️ DeepInfra/GLM fallback ran but validation failed: ${validation.missingFields.join(", ")}`);
  } catch (fbErr) {
    const fbMsg = (fbErr as Error).message;
    errors.push(`DeepInfra/GLM fallback: ${fbMsg}`);
    console.error(`[AptitudePro] ❌ DeepInfra/GLM fallback also failed:`, fbMsg);
  }

  // ── Both providers exhausted — notify owner + throw ─────────────────────
  const summary = errors.join("\n");
  console.error(`[AptitudePro] 🚨 BOTH providers failed for ${opts.studentEmail}:\n${summary}`);

  await notifyOwner({
    title: `🚨 Aptitude Pro — BOTH DeepSeek AND GLM failed for ${opts.studentName || "?"}`,
    content: `Student: ${opts.studentName || "?"} (${opts.studentEmail || "?"})\n\nEvery AI attempt failed across BOTH providers (DeepSeek + GLM via DeepInfra):\n\n${summary}\n\nAuto-recovery in the submit handler will retry once the outage clears. If it doesn't, retry manually via admin > Aptitude Manager > Regenerate analysis. This is genuinely rare — usually means both providers are down or something is wrong with the prompt/schema.`,
  }).catch(() => {});

  throw new Error(`Aptitude Pro AI analysis failed on BOTH providers: ${errors[errors.length - 1] || "unknown"}`);
}
