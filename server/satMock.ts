/**
 * SpecTa SAT Self-Prep — Phase 2 engine.
 *   - Test assembly: diagnostic (1 RW + 1 Math module, stratified over all
 *     skills) and full mock (Bluebook shape: RW M1→M2, 10-min break, Math
 *     M1→M2; Module 2 routed easier/harder from Module 1).
 *   - Server-authoritative module timing.
 *   - Scoring: SpecTa's OWN raw→scaled estimate (200–800 per section), not
 *     College Board's table.
 *   - Study plan (today's 3 tasks) and score predictor from mastery + mocks.
 */

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { satQuestions, satSkills, satMastery, satTestSessions, satOfficialScores, type SatQuestion } from "../drizzle/schema";
import { DOMAIN_SHARE } from "./satSkills";

export interface TestModule { section: "rw" | "math"; stage: 1 | 2; variant: "standard" | "easier" | "harder"; minutes: number; questionIds: number[] }

// Bluebook shape (2026): RW 2×27 q / 32 min; Math 2×22 q / 35 min; 10-min break after RW.
export const SHAPE = { rw: { n: 27, minutes: 32 }, math: { n: 22, minutes: 35 }, breakMinutes: 10 } as const;
const GRACE_MS = 15000;

function shuffle<T>(a: T[]): T[] { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }

/**
 * Pick `n` approved questions for a section, spread across skills in
 * proportion to domain share, with a difficulty mix. Falls back gracefully
 * when the bank is thin (repeats across modules are avoided via `exclude`).
 */
async function assemble(section: "rw" | "math", n: number, mix: Record<1 | 2 | 3, number>, exclude: Set<number>): Promise<number[]> {
  const db = await getDb(); if (!db) return [];
  const skills = await db.select().from(satSkills).where(eq(satSkills.section, section));
  const pool = (await db.select().from(satQuestions).where(and(eq(satQuestions.section, section), eq(satQuestions.status, "approved")))).filter(q => !exclude.has(q.id));
  if (!pool.length) return [];
  // quota per skill ∝ domain share / skills-in-domain
  const byDomain: Record<string, typeof skills> = {};
  for (const k of skills) (byDomain[k.domainCode] ||= []).push(k);
  const totalShare = Object.keys(byDomain).reduce((x, d) => x + (DOMAIN_SHARE[d] || 0), 0) || 1;
  const quota = new Map<number, number>();
  for (const [d, ks] of Object.entries(byDomain)) { const dq = (n * (DOMAIN_SHARE[d] || 0)) / totalShare; ks.forEach(k => quota.set(k.id, dq / ks.length)); }
  // difficulty targets
  const want: Record<number, number> = { 1: Math.round(n * mix[1]), 2: Math.round(n * mix[2]), 3: 0 }; want[3] = Math.max(0, n - want[1] - want[2]);
  const bySkill = new Map<number, SatQuestion[]>();
  for (const q of shuffle(pool)) { const arr = bySkill.get(q.skillId) || []; arr.push(q); bySkill.set(q.skillId, arr); }
  const out: SatQuestion[] = []; const used = new Set<number>();
  const take = (q: SatQuestion) => { out.push(q); used.add(q.id); want[q.difficulty] = Math.max(0, want[q.difficulty] - 1); };
  // Round-robin over skills by fractional quota (largest first) until n
  const order = Array.from(quota.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  let guard = 0;
  while (out.length < n && guard++ < n * 6) {
    let progressed = false;
    for (const sid of order) {
      if (out.length >= n) break;
      const arr = (bySkill.get(sid) || []).filter(q => !used.has(q.id));
      if (!arr.length) continue;
      // prefer a difficulty still wanted
      const pick = arr.find(q => want[q.difficulty] > 0) || arr[0];
      const already = out.filter(q => q.skillId === sid).length;
      if (already >= Math.ceil((quota.get(sid) || 0)) + (guard > n ? 99 : 0)) continue;
      take(pick); progressed = true;
    }
    if (!progressed) break;
  }
  // top up from anything left
  for (const q of shuffle(pool)) { if (out.length >= n) break; if (!used.has(q.id)) take(q); }
  return shuffle(out).map(q => q.id);
}

const MIX_STD = { 1: 0.3, 2: 0.45, 3: 0.25 } as const;
const MIX_EASY = { 1: 0.55, 2: 0.4, 3: 0.05 } as const;
const MIX_HARD = { 1: 0.05, 2: 0.4, 3: 0.55 } as const;

export async function buildDiagnostic(): Promise<TestModule[]> {
  const ex = new Set<number>();
  const rw = await assemble("rw", SHAPE.rw.n, MIX_STD, ex); rw.forEach(i => ex.add(i));
  const math = await assemble("math", SHAPE.math.n, MIX_STD, ex);
  return [
    { section: "rw", stage: 1, variant: "standard", minutes: SHAPE.rw.minutes, questionIds: rw },
    { section: "math", stage: 1, variant: "standard", minutes: SHAPE.math.minutes, questionIds: math },
  ];
}

/** Module 1s are fixed at start; Module 2s are filled in when M1 is submitted (routing). */
export async function buildMockStage1(): Promise<TestModule[]> {
  const ex = new Set<number>();
  const rw = await assemble("rw", SHAPE.rw.n, MIX_STD, ex); rw.forEach(i => ex.add(i));
  const math = await assemble("math", SHAPE.math.n, MIX_STD, ex);
  return [
    { section: "rw", stage: 1, variant: "standard", minutes: SHAPE.rw.minutes, questionIds: rw },
    { section: "rw", stage: 2, variant: "standard", minutes: SHAPE.rw.minutes, questionIds: [] },
    { section: "math", stage: 1, variant: "standard", minutes: SHAPE.math.minutes, questionIds: math },
    { section: "math", stage: 2, variant: "standard", minutes: SHAPE.math.minutes, questionIds: [] },
  ];
}

/** Bluebook routes to the harder Module 2 at roughly ≥ 60% on Module 1. */
export const ROUTE_THRESHOLD = 0.6;
export async function routeStage2(section: "rw" | "math", m1Correct: number, m1Total: number, exclude: number[]): Promise<{ variant: "easier" | "harder"; questionIds: number[] }> {
  const harder = m1Total > 0 && m1Correct / m1Total >= ROUTE_THRESHOLD;
  const ids = await assemble(section, SHAPE[section].n, harder ? MIX_HARD : MIX_EASY, new Set(exclude));
  return { variant: harder ? "harder" : "easier", questionIds: ids };
}

export function moduleDeadline(startedAt: Date | null, minutes: number): number | null {
  return startedAt ? startedAt.getTime() + minutes * 60000 : null;
}
export function moduleOpen(startedAt: Date | null, minutes: number): boolean {
  const d = moduleDeadline(startedAt, minutes);
  return d !== null && Date.now() <= d + GRACE_MS;
}

// ── Scoring: SpecTa's own raw→scaled estimate ──────────────────────────────
// Each section 200–800. Module 2 items are weighted by the route taken
// (harder ×1.25, easier ×0.85) so two students with the same raw count but
// different routes get different scaled scores, as on the real test.
// The curve is gently S-shaped: the last few items are worth more, the first
// few less, which mirrors published concordances.
export function sectionScaled(m1Correct: number, m1Total: number, m2Correct: number, m2Total: number, variant: "standard" | "easier" | "harder"): number {
  const w = variant === "harder" ? 1.25 : variant === "easier" ? 0.85 : 1;
  const points = m1Correct + m2Correct * w;
  const max = m1Total + m2Total * 1.25 || 1;
  const p = Math.max(0, Math.min(1, points / max));
  // S-curve around 0.5, flattened at the ends
  const s = 0.5 + Math.tanh((p - 0.5) * 2.6) / (2 * Math.tanh(1.3));
  return Math.max(200, Math.min(800, Math.round((200 + 600 * s) / 10) * 10));
}

export interface TestScores {
  rw: number; math: number; total: number;
  sections: Record<"rw" | "math", { correct: number; total: number; route: "standard" | "easier" | "harder"; byDomain: Record<string, { correct: number; total: number }> }>;
}

export async function scoreSession(modules: TestModule[], responses: Array<{ questionId: number; correct: boolean }>): Promise<TestScores> {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const ids = modules.flatMap(m => m.questionIds);
  const qs = ids.length ? await db.select({ id: satQuestions.id, skillId: satQuestions.skillId }).from(satQuestions).where(inArray(satQuestions.id, ids)) : [];
  const skills = await db.select({ id: satSkills.id, domainCode: satSkills.domainCode }).from(satSkills);
  const dom = new Map(skills.map(s => [s.id, s.domainCode]));
  const qDom = new Map(qs.map(q => [q.id, dom.get(q.skillId) || "?"]));
  const ok = new Map(responses.map(r => [r.questionId, r.correct]));
  const sec = (section: "rw" | "math") => {
    const ms = modules.filter(m => m.section === section);
    const m1 = ms.find(m => m.stage === 1), m2 = ms.find(m => m.stage === 2);
    const cnt = (m?: TestModule) => m ? m.questionIds.filter(id => ok.get(id)).length : 0;
    const byDomain: Record<string, { correct: number; total: number }> = {};
    for (const m of ms) for (const id of m.questionIds) { const d = qDom.get(id) || "?"; const b = byDomain[d] || { correct: 0, total: 0 }; b.total++; if (ok.get(id)) b.correct++; byDomain[d] = b; }
    const m1c = cnt(m1), m2c = cnt(m2);
    const route = m2?.variant || "standard";
    return { scaled: sectionScaled(m1c, m1?.questionIds.length || 0, m2c, m2?.questionIds.length || 0, route), correct: m1c + m2c, total: (m1?.questionIds.length || 0) + (m2?.questionIds.length || 0), route, byDomain };
  };
  const rw = sec("rw"), math = sec("math");
  return { rw: rw.scaled, math: math.scaled, total: rw.scaled + math.scaled, sections: { rw: { correct: rw.correct, total: rw.total, route: rw.route, byDomain: rw.byDomain }, math: { correct: math.correct, total: math.total, route: math.route, byDomain: math.byDomain } } };
}

// ── Predictor + study plan ────────────────────────────────────────────────
/** Predicted section score from mastery (domain-share weighted), blended with the latest mock if any. */
export async function predictScore(studentId: number): Promise<{ rw: number; math: number; total: number; basis: "mastery" | "blend" | "calibrated"; lastMock: TestScores | null; lastOfficial: { rw: number; math: number; total: number; testDate: string | null; source: string } | null; practised: number }> {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const skills = await db.select({ id: satSkills.id, section: satSkills.section, domainCode: satSkills.domainCode }).from(satSkills);
  const mastery = await db.select().from(satMastery).where(eq(satMastery.studentId, studentId));
  const mm = new Map(mastery.map(m => [m.skillId, Number(m.pKnown)]));
  const secScore = (section: "rw" | "math") => {
    const ks = skills.filter(k => k.section === section);
    let num = 0, den = 0;
    for (const k of ks) { const w = (DOMAIN_SHARE[k.domainCode] || 0) / ks.filter(x => x.domainCode === k.domainCode).length; num += w * (mm.get(k.id) ?? 0.2); den += w; }
    const p = den ? num / den : 0.2;
    return sectionScaled(Math.round(p * 49), 49, 0, 0, "standard");
  };
  let rw = secScore("rw"), math = secScore("math");
  const sessions = await db.select().from(satTestSessions).where(and(eq(satTestSessions.studentId, studentId), eq(satTestSessions.status, "completed")));
  const mocks = sessions.filter(s => s.kind === "mock" && s.scores).sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));
  const last = (mocks[0]?.scores as TestScores | undefined) || null;
  let basis: "mastery" | "blend" | "calibrated" = "mastery";
  if (last) { rw = Math.round((rw * 0.4 + last.rw * 0.6) / 10) * 10; math = Math.round((math * 0.4 + last.math * 0.6) / 10) * 10; basis = "blend"; }
  // Live calibration: an official Bluebook/real score is ground truth. Blend it
  // in at 50% (it fades in weight as it ages past 90 days).
  const officials = (await db.select().from(satOfficialScores).where(eq(satOfficialScores.studentId, studentId))).sort((a, b) => (b.testDate || "").localeCompare(a.testDate || "") || b.id - a.id);
  const off = officials[0] || null;
  let lastOfficial: { rw: number; math: number; total: number; testDate: string | null; source: string } | null = null;
  if (off) {
    const ageDays = off.testDate && !isNaN(new Date(off.testDate).getTime()) ? (Date.now() - new Date(off.testDate).getTime()) / 86400000 : 0;
    const w = Math.max(0.2, 0.5 * (1 - Math.max(0, ageDays - 90) / 180));
    rw = Math.round((rw * (1 - w) + off.rw * w) / 10) * 10; math = Math.round((math * (1 - w) + off.math * w) / 10) * 10; basis = "calibrated";
    lastOfficial = { rw: off.rw, math: off.math, total: off.total, testDate: off.testDate, source: off.source };
  }
  return { rw, math, total: rw + math, basis, lastMock: last, lastOfficial, practised: mastery.length };
}

export interface PlanItem { code: string; title: string; section: "rw" | "math"; reason: "new" | "weak" | "review"; action: "lesson" | "drill"; minutes: number }

/** Today's plan: 3 items, ~20 min. Priority = domain share × (1 − mastery); untouched high-share skills first. */
export async function todayPlan(studentId: number, hasLesson: (skillId: number) => boolean): Promise<{ items: PlanItem[]; daysToTest: number | null; weeklyMinutesTarget: number }> {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const skills = await db.select().from(satSkills);
  const counts = await db.select({ skillId: satQuestions.skillId }).from(satQuestions).where(eq(satQuestions.status, "approved"));
  const have = new Set(counts.map(c => c.skillId));
  const mastery = await db.select().from(satMastery).where(eq(satMastery.studentId, studentId));
  const mm = new Map(mastery.map(m => [m.skillId, m]));
  const scored = skills.filter(k => have.has(k.id) || (k.lessonStatus === "approved")).map(k => {
    const m = mm.get(k.id); const p = m ? Number(m.pKnown) : 0.2;
    const perSkill = (DOMAIN_SHARE[k.domainCode] || 0) / skills.filter(x => x.domainCode === k.domainCode).length;
    const staleDays = m?.lastPracticedAt ? (Date.now() - new Date(m.lastPracticedAt).getTime()) / 86400000 : 999;
    const reason: PlanItem["reason"] = !m ? "new" : p < 0.6 ? "weak" : "review";
    const priority = perSkill * (1 - p) * (reason === "review" ? Math.min(1, staleDays / 7) : 1) + (reason === "new" ? 0.5 : 0);
    return { k, p, reason, priority };
  }).sort((a, b) => b.priority - a.priority);
  const items: PlanItem[] = [];
  const sectionsUsed = { rw: 0, math: 0 };
  for (const s of scored) {
    if (items.length >= 3) break;
    if (sectionsUsed[s.k.section] >= 2) continue; // keep a section mix
    const action: PlanItem["action"] = s.reason === "new" && hasLesson(s.k.id) ? "lesson" : "drill";
    if (action === "drill" && !have.has(s.k.id)) continue;
    items.push({ code: s.k.code, title: s.k.title, section: s.k.section, reason: s.reason, action, minutes: action === "lesson" ? 5 : 8 });
    sectionsUsed[s.k.section]++;
  }
  return { items, daysToTest: null, weeklyMinutesTarget: 140 };
}
