/**
 * SpecTa SAT Self-Prep — the learning engine.
 *   - Skill seeding (idempotent) from satSkills.ts
 *   - Answer checking (multiple choice + student-produced response)
 *   - Mastery: Bayesian knowledge tracing per student per skill
 *   - Drill selection: approved items, difficulty targeted to mastery,
 *     avoiding recently seen questions
 */

import { and, eq, inArray, desc } from "drizzle-orm";
import { getDb } from "./db";
import { satSkills, satQuestions, satMastery, satResponses, type SatQuestion } from "../drizzle/schema";
import { SKILL_SEEDS } from "./satSkills";

// ── Skill seeding ─────────────────────────────────────────────────────────
export async function seedSatSkills(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ code: satSkills.code }).from(satSkills);
  const have = new Set(existing.map(r => r.code));
  let n = 0;
  for (let i = 0; i < SKILL_SEEDS.length; i++) {
    const s = SKILL_SEEDS[i];
    if (have.has(s.code)) continue;
    await db.insert(satSkills).values({ section: s.section, domain: s.domain, domainCode: s.domainCode, code: s.code, title: s.title, outcomes: s.outcomes, sortOrder: i });
    n++;
  }
  if (n) console.log(`[SAT] seeded ${n} skills`);
}

// ── Answer checking ───────────────────────────────────────────────────────
/** Parse "3/4", "-2.50", "0,75", " 12 " → number, or null. */
export function parseNumeric(raw: string): number | null {
  const s = String(raw ?? "").trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (!s) return null;
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) { const d = Number(frac[2]); return d === 0 ? null : Number(frac[1]) / d; }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function checkAnswer(q: Pick<SatQuestion, "format" | "answer" | "acceptedAnswers">, given: string): boolean {
  const g = String(given ?? "").trim();
  if (!g) return false;
  if (q.format === "mc") return g.toUpperCase() === String(q.answer).trim().toUpperCase();
  // SPR: numeric equivalence (tolerance for rounding) against answer + accepted alternates
  const candidates = [q.answer, ...((q.acceptedAnswers as string[]) || [])];
  const gn = parseNumeric(g);
  for (const c of candidates) {
    if (g.replace(/\s+/g, "").toLowerCase() === String(c).replace(/\s+/g, "").toLowerCase()) return true;
    const cn = parseNumeric(String(c));
    if (gn !== null && cn !== null) {
      if (Math.abs(gn - cn) <= Math.max(1e-6, Math.abs(cn) * 1e-4)) return true;
      // Bluebook accepts a repeating decimal truncated or rounded to the entered precision (e.g. .666 / .667 / 0.67 for 2/3).
      const dp = (g.replace(/,/g, ".").split(".")[1] || "").replace(/[^0-9]/g, "").length;
      if (dp >= 2) {
        const f = 10 ** dp;
        if (Math.abs(gn - Math.round(cn * f) / f) < 1e-9 || Math.abs(gn - Math.trunc(cn * f) / f) < 1e-9) return true;
      }
    }
  }
  return false;
}

// ── Mastery (Bayesian knowledge tracing) ──────────────────────────────────
// Per-skill hidden state "known". Standard 4-parameter BKT. Guess is higher
// for 4-choice items than for typed answers.
const P_INIT = 0.2, P_LEARN = 0.10, P_SLIP = 0.10;
const P_GUESS = { mc: 0.30, spr: 0.08 } as const;
export const MASTERED_MIN_ATTEMPTS = 5;

export function bktUpdate(pKnown: number, correct: boolean, format: "mc" | "spr"): number {
  const g = P_GUESS[format], s = P_SLIP;
  const pCorrectGivenKnown = 1 - s, pCorrectGivenUnknown = g;
  const posterior = correct
    ? (pKnown * pCorrectGivenKnown) / (pKnown * pCorrectGivenKnown + (1 - pKnown) * pCorrectGivenUnknown)
    : (pKnown * s) / (pKnown * s + (1 - pKnown) * (1 - g));
  const next = posterior + (1 - posterior) * P_LEARN;
  return Math.min(0.999, Math.max(0.001, next));
}

export function masteryLabel(p: number, attempts?: number): "new" | "building" | "developing" | "solid" | "mastered" {
  if (p < 0.25) return "new";
  if (p < 0.5) return "building";
  if (p < 0.75) return "developing";
  if (p < 0.9 || (attempts !== undefined && attempts < MASTERED_MIN_ATTEMPTS)) return "solid";
  return "mastered";
}

export async function recordAnswer(args: { studentId: number; skillId: number; correct: boolean; format: "mc" | "spr" }): Promise<{ pKnown: number; attempts: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db.select().from(satMastery).where(and(eq(satMastery.studentId, args.studentId), eq(satMastery.skillId, args.skillId))).limit(1);
  const prev = row ? Number(row.pKnown) : P_INIT;
  const next = bktUpdate(prev, args.correct, args.format);
  if (row) {
    await db.update(satMastery).set({
      pKnown: next.toFixed(4), attempts: row.attempts + 1, correct: row.correct + (args.correct ? 1 : 0),
      streak: args.correct ? row.streak + 1 : 0, lastPracticedAt: new Date(),
    }).where(eq(satMastery.id, row.id));
  } else {
    await db.insert(satMastery).values({
      studentId: args.studentId, skillId: args.skillId, pKnown: next.toFixed(4), attempts: 1,
      correct: args.correct ? 1 : 0, streak: args.correct ? 1 : 0, lastPracticedAt: new Date(),
    });
  }
  return { pKnown: next, attempts: (row?.attempts || 0) + 1 };
}

// ── Drill selection ───────────────────────────────────────────────────────
function shuffle<T>(a: T[]): T[] { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }

/** Difficulty mix by mastery: weak → mostly easy/medium, strong → medium/hard. */
function difficultyWeights(pKnown: number): Record<1 | 2 | 3, number> {
  if (pKnown < 0.4) return { 1: 0.55, 2: 0.4, 3: 0.05 };
  if (pKnown < 0.75) return { 1: 0.2, 2: 0.55, 3: 0.25 };
  return { 1: 0.05, 2: 0.4, 3: 0.55 };
}

export async function pickDrillQuestions(studentId: number, skillId: number, count: number): Promise<SatQuestion[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [m] = await db.select().from(satMastery).where(and(eq(satMastery.studentId, studentId), eq(satMastery.skillId, skillId))).limit(1);
  const pKnown = m ? Number(m.pKnown) : P_INIT;
  const pool = await db.select().from(satQuestions).where(and(eq(satQuestions.skillId, skillId), eq(satQuestions.status, "approved")));
  if (!pool.length) return [];
  // Avoid the student's most recent answers on this skill.
  const recent = await db.select({ questionId: satResponses.questionId }).from(satResponses)
    .where(and(eq(satResponses.studentId, studentId), eq(satResponses.skillId, skillId)))
    .orderBy(desc(satResponses.createdAt)).limit(40);
  const seen = new Set(recent.map(r => r.questionId));
  const fresh = pool.filter(q => !seen.has(q.id));
  const source = fresh.length >= count ? fresh : pool; // fall back to repeats when the bank is small
  const w = difficultyWeights(pKnown);
  const byDiff: Record<number, SatQuestion[]> = { 1: [], 2: [], 3: [] };
  for (const q of shuffle(source)) byDiff[q.difficulty]?.push(q);
  const out: SatQuestion[] = [];
  const target = { 1: Math.round(count * w[1]), 2: Math.round(count * w[2]), 3: 0 } as Record<number, number>;
  target[3] = Math.max(0, count - target[1] - target[2]);
  for (const d of [1, 2, 3]) out.push(...byDiff[d].splice(0, target[d]));
  // top up from whatever remains
  for (const d of [2, 1, 3]) while (out.length < count && byDiff[d].length) out.push(byDiff[d].shift()!);
  return shuffle(out).slice(0, count);
}

/** Questions by id, keeping the requested order. */
export async function questionsByIds(ids: number[]): Promise<SatQuestion[]> {
  const db = await getDb();
  if (!db || !ids.length) return [];
  const rows = await db.select().from(satQuestions).where(inArray(satQuestions.id, ids));
  const map = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => map.get(id)).filter((q): q is SatQuestion => !!q);
}

/** Strip answer/explanations before sending a question to a student mid-attempt. */
export function publicQuestion(q: SatQuestion) {
  return {
    id: q.id, skillId: q.skillId, section: q.section, difficulty: q.difficulty, format: q.format,
    passage: q.passage, stem: q.stem, choices: q.choices as string[] | null,
  };
}
