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

/**
 * Extract JSON from an LLM response even when the model wraps it in prose
 * OR emits a valid JSON followed by trailing chatter.
 *
 * Aug 25 incident (Hubbul Amirir Rabb): DeepSeek attempt 3 produced
 * "Unexpected non-whitespace character after JSON at position 2686" —
 * a valid short JSON followed by trailing prose. Strict JSON.parse
 * throws on trailing content even though the JSON itself is fine.
 *
 * Strategy:
 *   1. Try strict JSON.parse — works for well-behaved responses.
 *   2. Try to find the FIRST BALANCED {...} block starting from the
 *      first "{". Balanced-brace scanning stops as soon as we close
 *      the top-level object, so trailing prose is ignored.
 *   3. As a last resort, try the naive "first { to last }" slice —
 *      catches nested prose that happens to have no unbalanced braces.
 */
function parseLooseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* try smarter extraction */ }

  const first = text.indexOf("{");
  if (first < 0) throw new Error("Could not extract valid JSON: no { found");

  // Walk balanced braces from `first` — respect string literals so a `}` inside
  // a string doesn't close the object.
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
        // Found balanced end — try to parse.
        const candidate = text.slice(first, i + 1);
        try { return JSON.parse(candidate); } catch { /* keep going */ }
        break; // no point continuing; balanced end found but invalid
      }
    }
  }

  // Last resort — naive slice.
  const last = text.lastIndexOf("}");
  if (last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch { /* fall through */ }
  }
  throw new Error("Could not extract valid JSON from response");
}

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
      const finishReason = (aiResponse as any).choices?.[0]?.finish_reason;
      // Log first 2000 chars + finish_reason so we can debug WHY things fail
      // ("length" = truncation → we need more max_tokens; "content_filter" =
      // refused; missing = weird — look at the raw response upstream).
      console.log(`[AptitudePro] AI raw response (${content.length} chars, attempt ${attempt}, finish_reason=${finishReason || "?"}): ${content.slice(0, 2000)}${content.length > 2000 ? "..." : ""}`);

      analysis = parseLooseJson(content);
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

  // ── DeepSeek exhausted — try DeepInfra fallback with model cascade ─────
  // DeepSeek and DeepInfra run on different infra, so simultaneous failures
  // are rare. Uses the existing DEEPINFRA_API_KEY (same key that powers our
  // image pipeline) so no new secrets on Railway.
  //
  // Model cascade: if the primary model (GLM 5.2) errors — model paused,
  // rate limited, or returns malformed output — try a second known-reliable
  // model before giving up. Aug 24 incident: GLM 5.2 alone truncated output
  // at 8k tokens on the huge Pro schema; both raising max_tokens and having
  // a second model to fall through to should prevent that class of failure.
  //
  // (parseLooseJson is defined at module scope — see top of file.)

  const FALLBACK_MODELS = [
    process.env.LLM_FALLBACK_MODEL || "zai-org/GLM-5.2",
    // Known-reliable second choice on DeepInfra: 70B Llama with proven
    // JSON-mode support. If GLM is paused or misbehaving, this catches it.
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
  ];

  for (const fbModel of FALLBACK_MODELS) {
    console.warn(`[AptitudePro] 🔁 Trying DeepInfra fallback (${fbModel}) for ${opts.studentEmail}…`);
    try {
      const fbStart = Date.now();
      const fbResponse = await invokeLLMFallback({
        model: fbModel,
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
      const finishReason = (fbResponse as any).choices?.[0]?.finish_reason;
      if (!rawContent) {
        // Empty content — most useful signal is finish_reason ("length" =
        // truncated, "content_filter" = refused, "stop" but empty = weird).
        // Also dump the raw response shape so we can debug when it recurs.
        const dump = JSON.stringify(fbResponse).slice(0, 1500);
        console.error(`[AptitudePro] ${fbModel} EMPTY content — finish_reason=${finishReason || "?"} — raw response: ${dump}`);
        throw new Error(`${fbModel} returned empty content (finish_reason=${finishReason || "?"})`);
      }
      const content = typeof rawContent === "string" ? rawContent : String(rawContent);
      // Log more of the response than before — 2000 chars — so if it fails
      // we can see WHY (truncated? prose wrapper? refusal? partial JSON?).
      console.log(`[AptitudePro] ${fbModel} raw response (${content.length} chars): ${content.slice(0, 2000)}${content.length > 2000 ? "..." : ""}`);
      analysis = parseLooseJson(content);
      validation = validateAiAnalysisForPdf(analysis);
      if (validation.ok) {
        const fbMs = Date.now() - fbStart;
        console.log(`[AptitudePro] ✅✅ DeepInfra fallback (${fbModel}) SAVED ${opts.studentEmail} after ${maxAttempts} DeepSeek fails (fallback took ${fbMs}ms, total ${Date.now() - started}ms)`);
        notifyOwner({
          title: `⚠️ Aptitude Pro DeepSeek failed — DeepInfra fallback (${fbModel}) saved ${opts.studentName || "?"}`,
          content: `Student: ${opts.studentName || "?"} (${opts.studentEmail || "?"})\n\nDeepSeek failed all ${maxAttempts} attempts:\n${errors.join("\n")}\n\nDeepInfra fallback (${fbModel}) succeeded in ${fbMs}ms — student got their report on first submit with no visible failure. No manual action needed.\n\nIf you see this notification frequently, DeepSeek is unreliable and we should either (a) reorder providers so DeepInfra goes first, or (b) run both in parallel and take whichever finishes.`,
        }).catch(() => {});
        return { analysis, attemptsUsed: maxAttempts + 1, totalMs: Date.now() - started, validation };
      }
      errors.push(`DeepInfra fallback ${fbModel}: validation failed — missing ${validation.missingFields.join(", ")}`);
      console.warn(`[AptitudePro] ⚠️ DeepInfra ${fbModel} ran but validation failed: ${validation.missingFields.join(", ")}`);
    } catch (fbErr) {
      const fbMsg = (fbErr as Error).message;
      errors.push(`DeepInfra fallback ${fbModel}: ${fbMsg}`);
      console.error(`[AptitudePro] ❌ DeepInfra ${fbModel} also failed:`, fbMsg);
    }
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
