/**
 * SpecTa IQ Discovery — scoring engine.
 *
 * Pure functions (no I/O) that turn raw answers into a full IqScoreResult:
 *   - Per-domain scaled band (0-19, mean=10, SD=3 — same shape as WAIS
 *     subtests so the report reads like real psychometric output)
 *   - Full-scale IQ estimate (mean=100, SD=15, clamped [70, 140])
 *   - Percentile from the standard-normal CDF
 *   - Cognitive archetype from top-2 domain scores
 *
 * Legally-critical caveat: this is an ESTIMASI. The scoring math produces
 * numbers that LOOK like clinical IQ output, but the item bank is
 * AI-generated, un-normed against a proper Indonesian sample, and takes
 * ~40 min instead of a full 60-90 min WAIS. Every result screen must
 * carry the "estimasi bukan tes klinis" disclaimer. See landing page +
 * FAQ for public-facing wording.
 */

import type { IqDomain, IqScoreResult } from "./iqQuestionTypes";
import { pickArchetype, IQ_DOMAINS } from "./iqQuestionTypes";

interface AnswerRow {
  questionId: number;
  domain: IqDomain;
  correct: boolean;
  timedOut: boolean;
  timeMs: number;
}

/**
 * Convert a domain accuracy % (0-1) to a scaled score on the WAIS-subtest
 * scale (mean=10, SD=3, range 0-19). Bell-curve shaped — average accuracy
 * lands at 10, very-good at ~15, ceiling at 17-19 for near-perfect.
 *
 * Table calibrated so:
 *   0% correct → 3   (well below average)
 *   50% correct → 10 (average — this is what we expect at target difficulty)
 *   100% correct → 17 (top ~2%, but not maxed to leave headroom)
 */
function accuracyToScaledBand(accuracy: number): number {
  if (accuracy >= 0.98) return 17;
  if (accuracy >= 0.90) return 15;
  if (accuracy >= 0.80) return 13;
  if (accuracy >= 0.68) return 12;
  if (accuracy >= 0.55) return 11;
  if (accuracy >= 0.45) return 10;
  if (accuracy >= 0.35) return 9;
  if (accuracy >= 0.25) return 8;
  if (accuracy >= 0.15) return 6;
  if (accuracy >= 0.05) return 4;
  return 3;
}

/**
 * Convert scaled band (mean=10, SD=3) to IQ (mean=100, SD=15).
 * Standard psychometric conversion: IQ = 100 + (band - 10) * 5.
 */
function scaledBandToIq(band: number): number {
  return 100 + (band - 10) * 5;
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 * Used to derive percentile from IQ score. Accurate to ~4 decimals.
 */
function normalCdf(z: number): number {
  const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
  const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** IQ score → percentile rank (1-99). */
function iqToPercentile(iq: number): number {
  const z = (iq - 100) / 15;
  const pct = normalCdf(z) * 100;
  return Math.max(1, Math.min(99, Math.round(pct)));
}

export interface RawSessionInput {
  answers: AnswerRow[];
  totalTimeSec: number;
  mode: "preview" | "full";
}

/**
 * Main scoring entry point. Takes a completed session's answers + domain
 * mapping and produces the full IqScoreResult shape defined in
 * iqQuestionTypes.ts. Deterministic — same input always produces same
 * output.
 *
 * For a PREVIEW session (5 questions), confidence range is wider (±15)
 * since we're extrapolating IQ from only 5 items. Full test (40) → ±5.
 */
export function scoreIqSession(input: RawSessionInput): IqScoreResult {
  // Aggregate per-domain
  const perDomain: Record<IqDomain, { correct: number; total: number; scaledBand: number }> = {} as any;
  for (const d of IQ_DOMAINS) {
    const rows = input.answers.filter(a => a.domain === d);
    const correct = rows.filter(a => a.correct).length;
    const total = rows.length;
    const accuracy = total > 0 ? correct / total : 0;
    // Domains with 0 questions answered get a neutral band of 10 (average)
    // rather than 0 — avoids penalizing preview mode's incomplete coverage.
    const scaledBand = total > 0 ? accuracyToScaledBand(accuracy) : 10;
    perDomain[d] = { correct, total, scaledBand };
  }

  // Full-scale IQ = mean of per-domain IQs. Simple average matches how the
  // real Wechsler tests compute FSIQ from index scores at the top level.
  const domainIqs = IQ_DOMAINS.map(d => scaledBandToIq(perDomain[d].scaledBand));
  const meanIq = domainIqs.reduce((s, x) => s + x, 0) / domainIqs.length;
  // Clamp to [70, 140] so we NEVER show absurd extremes. Protects us from
  // "kamu bilang IQ saya 160" complaints if someone speed-runs everything
  // correctly, and from "kamu bilang IQ saya 60" if they timeout on all.
  const fsiq = Math.max(70, Math.min(140, Math.round(meanIq)));

  const percentile = iqToPercentile(fsiq);

  // Confidence range: preview (5Q) is much rougher than full (40Q). We
  // show this transparently so students don't over-interpret a preview
  // score.
  const confidenceRange = input.mode === "preview" ? 15 : 5;

  // Archetype: pick top 2 domains by scaled band. Ties broken by iteration
  // order (fluid → quantitative → verbal → spatial → memory).
  const sortedByBand = [...IQ_DOMAINS].sort(
    (a, b) => perDomain[b].scaledBand - perDomain[a].scaledBand
  );
  const archetype = pickArchetype(sortedByBand[0], sortedByBand[1]);

  return {
    fsiq,
    confidenceRange,
    percentile,
    perDomain,
    archetype,
    totalTimeSec: Math.round(input.totalTimeSec),
  };
}
