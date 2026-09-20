/**
 * SpecTa SAT Self-Prep — tRPC routers.
 *   `sat`        student-facing (dedicated SAT login cookie)
 *   `admin.sat`  Hadi's control room: students & access, skill lessons,
 *                question bank (generate → review → approve), assignments,
 *                class heatmap
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, gte, inArray, sql } from "drizzle-orm";

import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import {
  satStudents, satSkills, satQuestions, satAttempts, satResponses, satMastery,
  satAssignments, satAssignmentStudents, satTestSessions, satLiveSessions, satOfficialScores, satCreditOrders, type SatQuestion, type SatTestSession,
} from "../drizzle/schema";
import { issueSatCookie, clearSatCookie, resolveSatStudent, hashPassword, verifyPassword, tempPassword } from "./satAuth";
import { checkAnswer, recordAnswer, pickDrillQuestions, questionsByIds, publicQuestion, masteryLabel, seedSatSkills } from "./satEngine";
import { generateQuestions, generateLesson, tutorReply } from "./satQuestionGenerator";
import { DOMAIN_LABEL, DOMAIN_SHARE } from "./satSkills";
import { getSatTutorSignedUrl, buildDynamicVariables, SAT_LIVE_MAX_SECONDS, SAT_LIVE_WEEKLY_MINUTES, liveWeekStart } from "./satLiveAgent";
import { reviewWorkingPhoto, visionAvailable } from "./satVision";
import { getSeedProgress, restartSatBulkSeed } from "./satBulkSeed";
import { getAuditProgress, runSatAudit } from "./satAudit";
import { liveAllowance } from "./satCredits";
import { SAT_CREDIT_PRICE_PER_HOUR, satCreditExternalId, createSatCreditInvoice } from "./xenditService";
import { buildDiagnostic, buildMockStage1, routeStage2, moduleOpen, moduleDeadline, scoreSession, predictScore, todayPlan, SHAPE, type TestModule, type TestScores } from "./satMock";

function assertAdmin(ctx: { user: { role: string } | null }) {
  if (!ctx.user || ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only." });
}
async function requireStudent(ctx: any) {
  const s = await resolveSatStudent(ctx);
  if (!s) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to SAT Self-Prep." });
  return s;
}
const dbOrThrow = async () => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); return db; };

// ── Background generation queue (same pattern as the GEO engine) ──────────
interface Job { key: string; label: string; status: "queued" | "running" | "done" | "error"; result?: string; error?: string; queuedAt: number; startedAt?: number; finishedAt?: number; run: () => Promise<string> }
const jobs = new Map<string, Job>();
let busy = false;
async function pump() {
  if (busy) return;
  const next = Array.from(jobs.values()).filter(j => j.status === "queued").sort((a, b) => a.queuedAt - b.queuedAt)[0];
  if (!next) return;
  busy = true; next.status = "running"; next.startedAt = Date.now();
  try { next.result = await next.run(); next.status = "done"; }
  catch (e) { next.status = "error"; next.error = String((e as Error)?.message || e).slice(0, 400); console.error(`[SAT] job ${next.key} failed:`, next.error); }
  finally {
    next.finishedAt = Date.now(); busy = false;
    for (const [k, j] of Array.from(jobs.entries())) if (j.finishedAt && Date.now() - j.finishedAt > 3600000) jobs.delete(k);
    void pump();
  }
}
function enqueue(key: string, label: string, run: () => Promise<string>) {
  const ex = jobs.get(key);
  if (ex && (ex.status === "queued" || ex.status === "running")) return { started: false, reason: "already " + ex.status };
  jobs.set(key, { key, label, status: "queued", queuedAt: Date.now(), run });
  void pump();
  return { started: true };
}

/** 23:59:59 Jakarta on the given YYYY-MM-DD. */
function endOfDayJakarta(ymd: string): Date {
  const d = new Date(ymd.slice(0, 10) + "T23:59:59+07:00");
  return isNaN(d.getTime()) ? defaultAccessUntil() : d;
}
/** Default study window: 2 months from today (end of that day, Jakarta). */
function defaultAccessUntil(): Date {
  const d = new Date(Date.now() + 7 * 3600e3); d.setUTCMonth(d.getUTCMonth() + 2);
  return new Date(d.toISOString().slice(0, 10) + "T23:59:59+07:00");
}

async function sendCredentialsEmail(to: string, name: string, password: string, accessUntil?: Date): Promise<boolean> {
  if (!ENV.resendApiKey) return false;
  const base = (ENV.appUrl || "https://www.spectaeducation.com").replace(/\/+$/, "");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f5f8;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;">
    <h2 style="margin:0 0 8px;color:#14213D;">Welcome to SpecTa SAT Self-Prep, ${name}!</h2>
    <p style="color:#334;line-height:1.6;">Your SAT study dashboard is ready. Practise any time, get instant explanations, and ask Emma when you're stuck.</p>
    <p style="margin:18px 0 6px;color:#334;"><b>Sign in:</b> <a href="${base}/sat/login">${base}/sat/login</a></p>
    <p style="margin:0;color:#334;"><b>Email:</b> ${to}<br/><b>Temporary password:</b> <code style="font-size:16px;">${password}</code></p>
    <p style="color:#667;font-size:13px;line-height:1.6;margin-top:16px;">You'll be asked to choose your own password the first time you sign in.${accessUntil ? ` Your access runs until <b>${accessUntil.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}</b>.` : ""}</p>
    <p style="color:#667;font-size:12px;margin-top:22px;">SAT® is a registered trademark of College Board, which is not affiliated with and does not endorse SpecTa Education.</p>
  </div></body></html>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.resendApiKey}` },
      body: JSON.stringify({ from: "SpecTa Education <noreply@spectaeducation.com>", to: [to], subject: "Your SpecTa SAT Self-Prep login", html }),
    });
    return r.ok;
  } catch { return false; }
}

const fullQuestion = (q: SatQuestion) => ({
  ...publicQuestion(q), answer: q.answer, acceptedAnswers: q.acceptedAnswers as string[] | null,
  explanationEn: q.explanationEn, explanationId: q.explanationId, distractorNotes: q.distractorNotes as Record<string, string> | null,
});

// ── Phase 2 test-session helpers ──────────────────────────────────────────
async function loadSession(studentId: number, sessionId: number): Promise<SatTestSession> {
  const db = await dbOrThrow();
  const [sess] = await db.select().from(satTestSessions).where(and(eq(satTestSessions.id, sessionId), eq(satTestSessions.studentId, studentId))).limit(1);
  if (!sess) throw new TRPCError({ code: "NOT_FOUND", message: "Test session not found." });
  return sess;
}

/** What the client sees: only the open module's questions; deadlines; saved answers. */
async function sessionView(sess: SatTestSession) {
  const db = await dbOrThrow();
  const mods = sess.modules as TestModule[];
  const cur = mods[sess.currentModule];
  const qs = sess.status === "active" && cur ? await questionsByIds(cur.questionIds) : [];
  const saved = cur ? await db.select({ questionId: satResponses.questionId, answer: satResponses.answer }).from(satResponses).where(and(eq(satResponses.attemptId, sess.attemptId), inArray(satResponses.questionId, cur.questionIds.length ? cur.questionIds : [-1]))) : [];
  return {
    id: sess.id, kind: sess.kind, status: sess.status, currentModule: sess.currentModule, totalModules: mods.length,
    module: cur ? { section: cur.section, stage: cur.stage, minutes: cur.minutes, count: cur.questionIds.length } : null,
    started: !!sess.moduleStartedAt, deadline: cur ? moduleDeadline(sess.moduleStartedAt, cur.minutes) : null,
    breakUntil: sess.breakUntil ? sess.breakUntil.getTime() : null, serverNow: Date.now(),
    questions: qs.map(publicQuestion), saved: saved.map(x => ({ questionId: x.questionId, answer: x.answer || "" })),
    scores: sess.status === "completed" ? (sess.scores as TestScores | null) : null,
  };
}

/** Close the open module: route Module 2, start the break, or finish + score. */
async function submitCurrentModule(sess: SatTestSession): Promise<void> {
  const db = await dbOrThrow();
  const mods = sess.modules as TestModule[];
  const cur = mods[sess.currentModule];
  if (!cur) return;
  const responses = await db.select().from(satResponses).where(eq(satResponses.attemptId, sess.attemptId));
  const ok = new Map(responses.map(r => [r.questionId, r.correct]));
  const next = mods[sess.currentModule + 1];
  if (next && next.stage === 2 && next.questionIds.length === 0) {
    const m1c = cur.questionIds.filter(id => ok.get(id)).length;
    const routed = await routeStage2(cur.section, m1c, cur.questionIds.length, mods.flatMap(m => m.questionIds));
    next.variant = routed.variant; next.questionIds = routed.questionIds;
    await db.update(satAttempts).set({ questionIds: mods.flatMap(m => m.questionIds) }).where(eq(satAttempts.id, sess.attemptId));
  }
  if (!next) {
    const scores = await scoreSession(mods, responses.map(r => ({ questionId: r.questionId, correct: r.correct })));
    // Mastery update happens once, at the end, so no feedback leaks mid-test.
    const qs = await questionsByIds(mods.flatMap(m => m.questionIds));
    for (const r of responses) { const q = qs.find(x => x.id === r.questionId); if (q) await recordAnswer({ studentId: sess.studentId, skillId: q.skillId, correct: r.correct, format: q.format }); }
    await db.update(satTestSessions).set({ modules: mods, status: "completed", scores, completedAt: new Date(), moduleStartedAt: null }).where(eq(satTestSessions.id, sess.id));
    await db.update(satAttempts).set({ status: "completed", completedAt: new Date(), correct: responses.filter(r => r.correct).length, total: mods.reduce((x, m) => x + m.questionIds.length, 0) }).where(eq(satAttempts.id, sess.attemptId));
    return;
  }
  const isBreak = sess.kind === "mock" && cur.section === "rw" && next.section === "math";
  await db.update(satTestSessions).set({
    modules: mods, currentModule: sess.currentModule + 1, moduleStartedAt: isBreak ? null : new Date(),
    status: isBreak ? "break" : "active", breakUntil: isBreak ? new Date(Date.now() + SHAPE.breakMinutes * 60000) : null,
  }).where(eq(satTestSessions.id, sess.id));
}

// =========================================================================
// STUDENT
// =========================================================================
export const satRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbOrThrow();
      const [s] = await db.select().from(satStudents).where(eq(satStudents.email, input.email.trim().toLowerCase())).limit(1);
      if (!s || !(await verifyPassword(input.password, s.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      if (!s.active) throw new TRPCError({ code: "FORBIDDEN", message: "Your access is not active. Please contact SpecTa." });
      if (s.accessUntil && new Date(s.accessUntil).getTime() < Date.now()) throw new TRPCError({ code: "FORBIDDEN", message: `Your SpecTa SAT Self-Prep access ended on ${new Date(s.accessUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Contact SpecTa to extend it.` });
      await issueSatCookie(ctx, s.id);
      await db.update(satStudents).set({ lastLoginAt: new Date() }).where(eq(satStudents.id, s.id));
      return { ok: true, mustChangePassword: s.mustChangePassword };
    }),
  logout: publicProcedure.mutation(({ ctx }) => { clearSatCookie(ctx); return { ok: true }; }),

  me: publicProcedure.query(async ({ ctx }) => {
    const s = await resolveSatStudent(ctx);
    if (!s) return null;
    return { id: s.id, name: s.name, email: s.email, lang: s.lang, targetScore: s.targetScore, testDate: s.testDate, mustChangePassword: s.mustChangePassword, accessUntil: s.accessUntil ? new Date(s.accessUntil).getTime() : null };
  }),

  changePassword: publicProcedure
    .input(z.object({ newPassword: z.string().min(8).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      await db.update(satStudents).set({ passwordHash: await hashPassword(input.newPassword), mustChangePassword: false }).where(eq(satStudents.id, s.id));
      return { ok: true };
    }),

  setPrefs: publicProcedure
    .input(z.object({ lang: z.enum(["en", "id"]).optional(), targetScore: z.number().int().min(400).max(1600).optional(), testDate: z.string().max(40).optional() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      await db.update(satStudents).set({ ...(input.lang ? { lang: input.lang } : {}), ...(input.targetScore ? { targetScore: input.targetScore } : {}), ...(input.testDate !== undefined ? { testDate: input.testDate } : {}) }).where(eq(satStudents.id, s.id));
      return { ok: true };
    }),

  /** Skill tree with this student's mastery + approved-question counts. */
  skills: publicProcedure.query(async ({ ctx }) => {
    const s = await requireStudent(ctx); const db = await dbOrThrow();
    const skills = await db.select().from(satSkills).orderBy(satSkills.sortOrder);
    const mastery = await db.select().from(satMastery).where(eq(satMastery.studentId, s.id));
    const counts = await db.select({ skillId: satQuestions.skillId, n: sql<number>`count(*)` }).from(satQuestions).where(eq(satQuestions.status, "approved")).groupBy(satQuestions.skillId);
    const cMap = new Map(counts.map(c => [c.skillId, Number(c.n)]));
    const mMap = new Map(mastery.map(m => [m.skillId, m]));
    return skills.map(k => {
      const m = mMap.get(k.id);
      const p = m ? Number(m.pKnown) : 0.2;
      return {
        id: k.id, section: k.section, domain: k.domain, domainCode: k.domainCode, code: k.code, title: k.title, outcomes: k.outcomes,
        domainLabel: DOMAIN_LABEL[k.domainCode]?.[s.lang] || k.domain, domainShare: DOMAIN_SHARE[k.domainCode] || 0,
        hasLesson: k.lessonStatus === "approved", questionCount: cMap.get(k.id) || 0,
        mastery: { pKnown: p, label: masteryLabel(p), attempts: m?.attempts || 0, correct: m?.correct || 0, lastPracticedAt: m?.lastPracticedAt || null },
      };
    });
  }),

  lesson: publicProcedure
    .input(z.object({ code: z.string().max(16) }))
    .query(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const [k] = await db.select().from(satSkills).where(eq(satSkills.code, input.code)).limit(1);
      if (!k) throw new TRPCError({ code: "NOT_FOUND" });
      if (k.lessonStatus !== "approved") return { skill: { code: k.code, title: k.title, domain: k.domain, outcomes: k.outcomes }, lesson: null };
      return { skill: { code: k.code, title: k.title, domain: k.domain, outcomes: k.outcomes }, lesson: (s.lang === "id" && k.lessonId ? k.lessonId : k.lessonEn) as any, lessonEn: k.lessonEn as any, lessonId: k.lessonId as any };
    }),

  startDrill: publicProcedure
    .input(z.object({ code: z.string().max(16), count: z.number().int().min(3).max(15).default(8) }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const [k] = await db.select().from(satSkills).where(eq(satSkills.code, input.code)).limit(1);
      if (!k) throw new TRPCError({ code: "NOT_FOUND" });
      const qs = await pickDrillQuestions(s.id, k.id, input.count);
      if (!qs.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No approved questions for this skill yet." });
      const res = await db.insert(satAttempts).values({ studentId: s.id, kind: "drill", skillId: k.id, questionIds: qs.map(q => q.id), total: qs.length });
      const attemptId = Number((res as any)[0]?.insertId || 0);
      await db.update(satQuestions).set({ timesServed: sql`timesServed + 1` }).where(inArray(satQuestions.id, qs.map(q => q.id)));
      return { attemptId, skill: { code: k.code, title: k.title }, questions: qs.map(publicQuestion) };
    }),

  /** Answer one question: returns correctness + explanation, updates mastery. */
  answer: publicProcedure
    .input(z.object({ attemptId: z.number().int(), questionId: z.number().int(), answer: z.string().max(200), timeMs: z.number().int().min(0).max(3600000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const [a] = await db.select().from(satAttempts).where(and(eq(satAttempts.id, input.attemptId), eq(satAttempts.studentId, s.id))).limit(1);
      if (!a || a.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not active." });
      if (!(a.questionIds as number[]).includes(input.questionId)) throw new TRPCError({ code: "BAD_REQUEST" });
      const [already] = await db.select().from(satResponses).where(and(eq(satResponses.attemptId, a.id), eq(satResponses.questionId, input.questionId))).limit(1);
      if (already) throw new TRPCError({ code: "BAD_REQUEST", message: "Already answered." });
      const [q] = await db.select().from(satQuestions).where(eq(satQuestions.id, input.questionId)).limit(1);
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      const correct = checkAnswer(q, input.answer);
      await db.insert(satResponses).values({ attemptId: a.id, studentId: s.id, questionId: q.id, skillId: q.skillId, answer: input.answer.slice(0, 200), correct, timeMs: input.timeMs ?? null });
      if (correct) { await db.update(satAttempts).set({ correct: a.correct + 1 }).where(eq(satAttempts.id, a.id)); await db.update(satQuestions).set({ timesCorrect: sql`timesCorrect + 1` }).where(eq(satQuestions.id, q.id)); }
      const { pKnown } = await recordAnswer({ studentId: s.id, skillId: q.skillId, correct, format: q.format });
      return { correct, question: fullQuestion(q), mastery: { pKnown, label: masteryLabel(pKnown) } };
    }),

  /** Reload an active attempt (page refresh / resume). */
  attempt: publicProcedure
    .input(z.object({ attemptId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const [a] = await db.select().from(satAttempts).where(and(eq(satAttempts.id, input.attemptId), eq(satAttempts.studentId, s.id))).limit(1);
      if (!a) throw new TRPCError({ code: "NOT_FOUND" });
      const qs = await questionsByIds(a.questionIds as number[]);
      const responses = await db.select().from(satResponses).where(eq(satResponses.attemptId, a.id));
      const skill = a.skillId ? (await db.select({ code: satSkills.code, title: satSkills.title }).from(satSkills).where(eq(satSkills.id, a.skillId)).limit(1))[0] : null;
      const assignment = a.assignmentId ? (await db.select({ title: satAssignments.title }).from(satAssignments).where(eq(satAssignments.id, a.assignmentId)).limit(1))[0] : null;
      return {
        attemptId: a.id, kind: a.kind, status: a.status, title: assignment?.title || skill?.title || "Practice", skillCode: skill?.code || null,
        questions: qs.map(publicQuestion),
        answered: responses.map(r => { const fq = qs.find(x => x.id === r.questionId); return { questionId: r.questionId, answer: r.answer, correct: r.correct, question: fq ? fullQuestion(fq) : null }; }),
      };
    }),

  finishDrill: publicProcedure
    .input(z.object({ attemptId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const [a] = await db.select().from(satAttempts).where(and(eq(satAttempts.id, input.attemptId), eq(satAttempts.studentId, s.id))).limit(1);
      if (!a) throw new TRPCError({ code: "NOT_FOUND" });
      const responses = await db.select().from(satResponses).where(eq(satResponses.attemptId, a.id));
      await db.update(satAttempts).set({ status: "completed", completedAt: new Date(), correct: responses.filter(r => r.correct).length }).where(eq(satAttempts.id, a.id));
      if (a.assignmentId) {
        await db.update(satAssignmentStudents).set({ status: "completed", completedAt: new Date(), attemptId: a.id })
          .where(and(eq(satAssignmentStudents.assignmentId, a.assignmentId), eq(satAssignmentStudents.studentId, s.id)));
      }
      const [m] = a.skillId ? await db.select().from(satMastery).where(and(eq(satMastery.studentId, s.id), eq(satMastery.skillId, a.skillId))).limit(1) : [];
      return { correct: responses.filter(r => r.correct).length, total: a.total, answered: responses.length, avgTimeMs: responses.length ? Math.round(responses.reduce((x, r) => x + (r.timeMs || 0), 0) / responses.length) : 0, mastery: m ? { pKnown: Number(m.pKnown), label: masteryLabel(Number(m.pKnown)) } : null };
    }),

  flagQuestion: publicProcedure
    .input(z.object({ questionId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      await requireStudent(ctx); const db = await dbOrThrow();
      await db.update(satQuestions).set({ flags: sql`flags + 1` }).where(eq(satQuestions.id, input.questionId));
      return { ok: true };
    }),

  assignments: publicProcedure.query(async ({ ctx }) => {
    const s = await requireStudent(ctx); const db = await dbOrThrow();
    const rows = await db.select({ a: satAssignments, st: satAssignmentStudents }).from(satAssignmentStudents)
      .innerJoin(satAssignments, eq(satAssignments.id, satAssignmentStudents.assignmentId))
      .where(eq(satAssignmentStudents.studentId, s.id)).orderBy(desc(satAssignments.createdAt));
    return rows.map(r => ({ id: r.a.id, title: r.a.title, note: r.a.note, count: (r.a.questionIds as number[]).length, dueAt: r.a.dueAt, status: r.st.status, attemptId: r.st.attemptId, completedAt: r.st.completedAt }));
  }),

  startAssignment: publicProcedure
    .input(z.object({ assignmentId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const [st] = await db.select().from(satAssignmentStudents).where(and(eq(satAssignmentStudents.assignmentId, input.assignmentId), eq(satAssignmentStudents.studentId, s.id))).limit(1);
      if (!st) throw new TRPCError({ code: "NOT_FOUND" });
      const [a] = await db.select().from(satAssignments).where(eq(satAssignments.id, input.assignmentId)).limit(1);
      if (!a) throw new TRPCError({ code: "NOT_FOUND" });
      if (st.attemptId) {
        const [existing] = await db.select().from(satAttempts).where(eq(satAttempts.id, st.attemptId)).limit(1);
        if (existing && existing.status === "active") {
          const qs = await questionsByIds(existing.questionIds as number[]);
          const done = await db.select({ questionId: satResponses.questionId }).from(satResponses).where(eq(satResponses.attemptId, existing.id));
          return { attemptId: existing.id, title: a.title, questions: qs.map(publicQuestion), answeredIds: done.map(d => d.questionId) };
        }
      }
      const ids = a.questionIds as number[];
      const res = await db.insert(satAttempts).values({ studentId: s.id, kind: "assignment", assignmentId: a.id, questionIds: ids, total: ids.length });
      const attemptId = Number((res as any)[0]?.insertId || 0);
      await db.update(satAssignmentStudents).set({ status: "in_progress", attemptId }).where(eq(satAssignmentStudents.id, st.id));
      const qs = await questionsByIds(ids);
      return { attemptId, title: a.title, questions: qs.map(publicQuestion), answeredIds: [] as number[] };
    }),

  /** Emma for SAT — question-anchored tutor. */
  tutor: publicProcedure
    .input(z.object({
      questionId: z.number().int(), mode: z.enum(["explain", "whyWrong", "hint", "similar", "ask"]),
      studentAnswer: z.string().max(200).optional(), message: z.string().max(1000).optional(),
      history: z.array(z.object({ role: z.enum(["student", "emma"]), text: z.string().max(2000) })).max(10).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const [q] = await db.select().from(satQuestions).where(eq(satQuestions.id, input.questionId)).limit(1);
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      const text = await tutorReply({ mode: input.mode, lang: s.lang, studentAnswer: input.studentAnswer, message: input.message, history: input.history, question: { passage: q.passage, stem: q.stem, choices: q.choices as string[] | null, answer: q.answer, explanationEn: q.explanationEn, format: q.format } });
      return { text };
    }),

  // ═══════════════ Phase 2: diagnostic + full mock ═══════════════
  /** Start a diagnostic (1 RW + 1 Math module) or a full Bluebook-style mock. */
  startTest: publicProcedure
    .input(z.object({ kind: z.enum(["diagnostic", "mock"]) }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const open = await db.select().from(satTestSessions).where(and(eq(satTestSessions.studentId, s.id), inArray(satTestSessions.status, ["active", "break"]))).limit(1);
      if (open.length) return { sessionId: open[0].id, resumed: true };
      const modules = input.kind === "diagnostic" ? await buildDiagnostic() : await buildMockStage1();
      const short = modules.filter(m => m.stage === 1 && m.questionIds.length < (m.section === "rw" ? SHAPE.rw.n : SHAPE.math.n) * 0.6);
      if (short.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The question bank doesn't have enough approved questions for a full test yet. Ask your teacher." });
      const allIds = modules.flatMap(m => m.questionIds);
      const res = await db.insert(satAttempts).values({ studentId: s.id, kind: input.kind, questionIds: allIds, total: input.kind === "diagnostic" ? allIds.length : (SHAPE.rw.n + SHAPE.math.n) * 2 });
      const attemptId = Number((res as any)[0]?.insertId || 0);
      const r2 = await db.insert(satTestSessions).values({ studentId: s.id, attemptId, kind: input.kind, modules });
      return { sessionId: Number((r2 as any)[0]?.insertId || 0), resumed: false };
    }),

  /** Current state of a test session (auto-submits an expired module). */
  testSession: publicProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const s = await requireStudent(ctx);
      let sess = await loadSession(s.id, input.sessionId);
      const mods = sess.modules as TestModule[];
      const cur = mods[sess.currentModule];
      if (sess.status === "active" && cur && sess.moduleStartedAt && !moduleOpen(sess.moduleStartedAt, cur.minutes)) {
        await submitCurrentModule(sess); sess = await loadSession(s.id, input.sessionId);
      }
      return sessionView(sess);
    }),

  startModule: publicProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const sess = await loadSession(s.id, input.sessionId);
      if (sess.status === "break") {
        await db.update(satTestSessions).set({ status: "active", breakUntil: null, moduleStartedAt: new Date() }).where(eq(satTestSessions.id, sess.id));
      } else if (sess.status === "active" && !sess.moduleStartedAt) {
        await db.update(satTestSessions).set({ moduleStartedAt: new Date() }).where(eq(satTestSessions.id, sess.id));
      }
      return sessionView(await loadSession(s.id, input.sessionId));
    }),

  /** Save/replace an answer inside the open module (no feedback until the report). */
  saveAnswer: publicProcedure
    .input(z.object({ sessionId: z.number().int(), questionId: z.number().int(), answer: z.string().max(200) }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const sess = await loadSession(s.id, input.sessionId);
      const cur = (sess.modules as TestModule[])[sess.currentModule];
      if (sess.status !== "active" || !cur || !cur.questionIds.includes(input.questionId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Not in the open module." });
      if (!moduleOpen(sess.moduleStartedAt, cur.minutes)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Time is up for this module." });
      const [q] = await db.select().from(satQuestions).where(eq(satQuestions.id, input.questionId)).limit(1);
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      const correct = checkAnswer(q, input.answer);
      const [ex] = await db.select().from(satResponses).where(and(eq(satResponses.attemptId, sess.attemptId), eq(satResponses.questionId, q.id))).limit(1);
      if (ex) await db.update(satResponses).set({ answer: input.answer.slice(0, 200), correct }).where(eq(satResponses.id, ex.id));
      else await db.insert(satResponses).values({ attemptId: sess.attemptId, studentId: s.id, questionId: q.id, skillId: q.skillId, answer: input.answer.slice(0, 200), correct });
      return { ok: true };
    }),

  submitModule: publicProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx);
      const sess = await loadSession(s.id, input.sessionId);
      if (sess.status !== "active") return sessionView(sess);
      await submitCurrentModule(sess);
      return sessionView(await loadSession(s.id, input.sessionId));
    }),

  abandonTest: publicProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const sess = await loadSession(s.id, input.sessionId);
      if (sess.status === "completed") return { ok: true };
      await db.update(satTestSessions).set({ status: "abandoned" }).where(eq(satTestSessions.id, sess.id));
      await db.update(satAttempts).set({ status: "abandoned" }).where(eq(satAttempts.id, sess.attemptId));
      return { ok: true };
    }),

  tests: publicProcedure.query(async ({ ctx }) => {
    const s = await requireStudent(ctx); const db = await dbOrThrow();
    const rows = await db.select().from(satTestSessions).where(eq(satTestSessions.studentId, s.id)).orderBy(desc(satTestSessions.createdAt)).limit(20);
    return rows.map(r => ({ id: r.id, kind: r.kind, status: r.status, scores: r.scores as TestScores | null, createdAt: r.createdAt, completedAt: r.completedAt }));
  }),

  /** Full report for a completed test: scores, domain breakdown, every question with the student's answer. */
  testReport: publicProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const sess = await loadSession(s.id, input.sessionId);
      if (sess.status !== "completed") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Test not completed." });
      const mods = sess.modules as TestModule[];
      const qs = await questionsByIds(mods.flatMap(m => m.questionIds));
      const responses = await db.select().from(satResponses).where(eq(satResponses.attemptId, sess.attemptId));
      const rm = new Map(responses.map(r => [r.questionId, r]));
      const skills = await db.select({ id: satSkills.id, code: satSkills.code, title: satSkills.title, domainCode: satSkills.domainCode }).from(satSkills);
      const sk = new Map(skills.map(k => [k.id, k]));
      return {
        kind: sess.kind, completedAt: sess.completedAt, scores: sess.scores as TestScores,
        modules: mods.map((m, i) => ({
          index: i, section: m.section, stage: m.stage, variant: m.variant,
          questions: m.questionIds.map((id, n) => { const q = qs.find(x => x.id === id); const r = rm.get(id); const k = q ? sk.get(q.skillId) : undefined; return q ? { n: n + 1, ...fullQuestion(q), given: r?.answer ?? null, correct: !!r?.correct, skillCode: k?.code, skillTitle: k?.title, domainCode: k?.domainCode } : null; }).filter((x): x is NonNullable<typeof x> => !!x),
        })),
        domainLabels: Object.fromEntries(Object.entries(DOMAIN_LABEL).map(([k, v]) => [k, v[s.lang]])),
      };
    }),

  /** Today's plan + predicted score + countdown. */
  plan: publicProcedure.query(async ({ ctx }) => {
    const s = await requireStudent(ctx); const db = await dbOrThrow();
    const skills = await db.select({ id: satSkills.id, lessonStatus: satSkills.lessonStatus }).from(satSkills);
    const lessons = new Set(skills.filter(k => k.lessonStatus === "approved").map(k => k.id));
    const plan = await todayPlan(s.id, (id) => lessons.has(id));
    const predicted = await predictScore(s.id);
    let daysToTest: number | null = null;
    if (s.testDate) { const d = new Date(s.testDate); if (!isNaN(d.getTime())) daysToTest = Math.ceil((d.getTime() - Date.now()) / 86400000); }
    const hasDiagnostic = (await db.select({ id: satTestSessions.id }).from(satTestSessions).where(and(eq(satTestSessions.studentId, s.id), eq(satTestSessions.kind, "diagnostic"), eq(satTestSessions.status, "completed"))).limit(1)).length > 0;
    return { ...plan, daysToTest, predicted, targetScore: s.targetScore, hasDiagnostic };
  }),

  // ═══════════════ Live Emma: 60 free minutes/day + paid credits (Rp 129k/hour) ═══════════════
  /** Today's usage, free allowance and paid credit balance. */
  liveQuota: publicProcedure.query(async ({ ctx }) => {
    const s = await requireStudent(ctx);
    const q = await liveAllowance(s.id, s.liveCreditSeconds);
    return { ...q, freeMinutesPerWeek: SAT_LIVE_WEEKLY_MINUTES, pricePerHour: SAT_CREDIT_PRICE_PER_HOUR };
  }),

  /** Start a live voice call with Emma about one question. */
  liveStart: publicProcedure
    .input(z.object({ questionId: z.number().int(), studentAnswer: z.string().max(200).optional() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const qta = await liveAllowance(s.id, s.liveCreditSeconds);
      if (qta.availableSec < 60) throw new TRPCError({ code: "FORBIDDEN", message: s.lang === "id"
        ? `Jatah gratis ${SAT_LIVE_WEEKLY_MINUTES / 60} jam/minggu untuk bicara dengan Emma sudah habis (reset hari Senin). Chat teks tetap bisa. Ingin lanjut sekarang? Beli kredit Rp ${SAT_CREDIT_PRICE_PER_HOUR.toLocaleString("id-ID")}/jam di halaman Kredit.`
        : `You've used this week's free ${SAT_LIVE_WEEKLY_MINUTES / 60} hours with Emma (resets Monday). Text chat still works. Want more now? Buy credit at Rp ${SAT_CREDIT_PRICE_PER_HOUR.toLocaleString("id-ID")}/hour on the Credits page.` });
      const [q] = await db.select().from(satQuestions).where(eq(satQuestions.id, input.questionId)).limit(1);
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      const [k] = await db.select({ title: satSkills.title }).from(satSkills).where(eq(satSkills.id, q.skillId)).limit(1);
      const signedUrl = await getSatTutorSignedUrl();
      const res = await db.insert(satLiveSessions).values({ studentId: s.id, questionId: q.id });
      const liveSessionId = Number((res as any)[0]?.insertId || 0);
      const dynamicVariables = buildDynamicVariables({ studentName: s.name, lang: s.lang, skillTitle: k?.title || "SAT", passage: q.passage, stem: q.stem, choices: q.choices as string[] | null, answer: q.answer, explanation: q.explanationEn, studentAnswer: input.studentAnswer || null, format: q.format });
      return { signedUrl, liveSessionId, dynamicVariables, maxSeconds: Math.min(SAT_LIVE_MAX_SECONDS, qta.availableSec), freeRemainingSec: qta.freeRemainingSec, creditSec: qta.creditSec };
    }),

  /** End a call: record seconds; anything beyond today's free minutes is deducted from paid credit. */
  liveEnd: publicProcedure
    .input(z.object({ liveSessionId: z.number().int(), seconds: z.number().int().min(0).max(7200) }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      const [sess] = await db.select().from(satLiveSessions).where(and(eq(satLiveSessions.id, input.liveSessionId), eq(satLiveSessions.studentId, s.id))).limit(1);
      if (!sess || sess.endedAt) return { ok: true };
      const since = liveWeekStart();
      const others = await db.select({ seconds: satLiveSessions.seconds }).from(satLiveSessions).where(and(eq(satLiveSessions.studentId, s.id), gte(satLiveSessions.startedAt, since), sql`endedAt IS NOT NULL`, sql`id <> ${sess.id}`));
      const usedBefore = others.reduce((x, r) => x + r.seconds, 0);
      const free = SAT_LIVE_WEEKLY_MINUTES * 60;
      const overflow = Math.max(0, usedBefore + input.seconds - free) - Math.max(0, usedBefore - free);
      const charge = Math.min(overflow, s.liveCreditSeconds);
      await db.update(satLiveSessions).set({ endedAt: new Date(), seconds: input.seconds, creditSeconds: charge }).where(eq(satLiveSessions.id, sess.id));
      if (charge > 0) await db.update(satStudents).set({ liveCreditSeconds: sql`GREATEST(0, liveCreditSeconds - ${charge})` }).where(eq(satStudents.id, s.id));
      return { ok: true, creditCharged: charge };
    }),

  /** Credit orders (history) for the Credits page. */
  creditOrders: publicProcedure.query(async ({ ctx }) => {
    const s = await requireStudent(ctx); const db = await dbOrThrow();
    return db.select().from(satCreditOrders).where(eq(satCreditOrders.studentId, s.id)).orderBy(desc(satCreditOrders.createdAt)).limit(20);
  }),

  /** Buy N hours of live Emma via Xendit → invoice URL. */
  buyCredits: publicProcedure
    .input(z.object({ hours: z.number().int().min(1).max(10) }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      if (!ENV.xenditSecretKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payments are not configured yet." });
      const externalId = satCreditExternalId();
      const amount = SAT_CREDIT_PRICE_PER_HOUR * input.hours;
      const base = (ENV.appUrl || "https://www.spectaeducation.com").replace(/\/+$/, "");
      const invoice = await createSatCreditInvoice({ externalId, hours: input.hours, customerName: s.name, customerEmail: s.email, successRedirectUrl: `${base}/sat/credits?paid=1`, failureRedirectUrl: `${base}/sat/credits?paid=0` });
      await db.insert(satCreditOrders).values({ studentId: s.id, hours: input.hours, amount, externalId, xenditInvoiceId: invoice.id || null, invoiceUrl: invoice.invoice_url, status: "pending" });
      return { invoiceUrl: invoice.invoice_url, amount };
    }),

  /** Photo of handwritten working → Emma reads it and points to the slip. */
  tutorPhoto: publicProcedure
    .input(z.object({ questionId: z.number().int(), imageBase64: z.string().min(100).max(6_000_000), mimeType: z.string().max(40).default("image/jpeg"), studentAnswer: z.string().max(200).optional(), note: z.string().max(300).optional() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      if (!visionAvailable()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Photo review isn't configured yet." });
      const [q] = await db.select().from(satQuestions).where(eq(satQuestions.id, input.questionId)).limit(1);
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      const text = await reviewWorkingPhoto({ imageBase64: input.imageBase64, mimeType: input.mimeType, lang: s.lang, question: { passage: q.passage, stem: q.stem, choices: q.choices as string[] | null, answer: q.answer, explanation: q.explanationEn, format: q.format }, studentAnswer: input.studentAnswer, note: input.note });
      if (!text) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Emma couldn't read the photo. Try a clearer, brighter shot." });
      return { text };
    }),

  officialScores: publicProcedure.query(async ({ ctx }) => {
    const s = await requireStudent(ctx); const db = await dbOrThrow();
    return db.select().from(satOfficialScores).where(eq(satOfficialScores.studentId, s.id)).orderBy(desc(satOfficialScores.createdAt));
  }),
  addOfficialScore: publicProcedure
    .input(z.object({ source: z.enum(["bluebook", "real", "other"]).default("bluebook"), testDate: z.string().max(40).optional(), rw: z.number().int().min(200).max(800), math: z.number().int().min(200).max(800), note: z.string().max(200).optional() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      await db.insert(satOfficialScores).values({ studentId: s.id, source: input.source, testDate: input.testDate || null, rw: input.rw, math: input.math, total: input.rw + input.math, note: input.note || null });
      return { ok: true };
    }),
  deleteOfficialScore: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const s = await requireStudent(ctx); const db = await dbOrThrow();
      await db.delete(satOfficialScores).where(and(eq(satOfficialScores.id, input.id), eq(satOfficialScores.studentId, s.id)));
      return { ok: true };
    }),

  /** Dashboard stats. */
  progress: publicProcedure.query(async ({ ctx }) => {
    const s = await requireStudent(ctx); const db = await dbOrThrow();
    const since7 = new Date(Date.now() - 7 * 86400000);
    const recent = await db.select().from(satResponses).where(and(eq(satResponses.studentId, s.id), gte(satResponses.createdAt, since7)));
    const all = await db.select({ n: sql<number>`count(*)`, c: sql<number>`sum(correct)` }).from(satResponses).where(eq(satResponses.studentId, s.id));
    const days = new Set(recent.map(r => new Date(r.createdAt).toISOString().slice(0, 10)));
    // Streak: consecutive active days ending today or yesterday.
    const allDays = await db.select({ d: sql<string>`DATE(createdAt)` }).from(satResponses).where(eq(satResponses.studentId, s.id)).groupBy(sql`DATE(createdAt)`);
    const dset = new Set(allDays.map(r => String(r.d).slice(0, 10)));
    let streak = 0; const cur = new Date(); cur.setHours(0, 0, 0, 0);
    if (!dset.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1);
    while (dset.has(cur.toISOString().slice(0, 10))) { streak++; cur.setDate(cur.getDate() - 1); }
    const mastery = await db.select().from(satMastery).where(eq(satMastery.studentId, s.id));
    const skills = await db.select({ id: satSkills.id, domainCode: satSkills.domainCode, section: satSkills.section }).from(satSkills);
    const byDomain: Record<string, { sum: number; n: number }> = {};
    for (const k of skills) { const m = mastery.find(x => x.skillId === k.id); const p = m ? Number(m.pKnown) : 0.2; const d = byDomain[k.domainCode] || { sum: 0, n: 0 }; d.sum += p; d.n++; byDomain[k.domainCode] = d; }
    return {
      week: { answered: recent.length, correct: recent.filter(r => r.correct).length, minutes: Math.round(recent.reduce((x, r) => x + (r.timeMs || 0), 0) / 60000), activeDays: days.size },
      streak,
      allTime: { answered: Number(all[0]?.n || 0), correct: Number(all[0]?.c || 0) },
      domains: Object.entries(byDomain).map(([code, d]) => ({ code, label: DOMAIN_LABEL[code]?.[s.lang] || code, share: DOMAIN_SHARE[code] || 0, mastery: d.n ? d.sum / d.n : 0.2 })),
    };
  }),
});

// =========================================================================
// ADMIN
// =========================================================================
export const satAdminRouter = router({
  // ── Students & access ──
  students: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx); const db = await dbOrThrow();
    const rows = await db.select().from(satStudents).orderBy(desc(satStudents.createdAt));
    const activity = await db.select({ studentId: satResponses.studentId, n: sql<number>`count(*)`, last: sql<Date>`max(createdAt)` }).from(satResponses).groupBy(satResponses.studentId);
    const aMap = new Map(activity.map(a => [a.studentId, a]));
    return rows.map(r => ({ id: r.id, email: r.email, name: r.name, active: r.active, targetScore: r.targetScore, testDate: r.testDate, lang: r.lang, lastLoginAt: r.lastLoginAt, createdAt: r.createdAt, parentEmail: r.parentEmail, liveCreditMinutes: Math.round((r.liveCreditSeconds || 0) / 60), accessUntil: r.accessUntil ? new Date(r.accessUntil).getTime() : null, answered: Number(aMap.get(r.id)?.n || 0), lastActive: aMap.get(r.id)?.last || null }));
  }),

  createStudent: protectedProcedure
    .input(z.object({ email: z.string().email(), name: z.string().min(1).max(120), sendEmail: z.boolean().default(true), targetScore: z.number().int().min(400).max(1600).optional(), testDate: z.string().max(40).optional(), accessUntil: z.string().max(40).optional() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      const email = input.email.trim().toLowerCase();
      const [dup] = await db.select({ id: satStudents.id }).from(satStudents).where(eq(satStudents.email, email)).limit(1);
      if (dup) throw new TRPCError({ code: "CONFLICT", message: "A student with that email already exists." });
      const pw = tempPassword();
      const accessUntil = input.accessUntil && !isNaN(new Date(input.accessUntil).getTime()) ? endOfDayJakarta(input.accessUntil) : defaultAccessUntil();
      await db.insert(satStudents).values({ email, name: input.name.trim(), passwordHash: await hashPassword(pw), active: true, targetScore: input.targetScore ?? null, testDate: input.testDate ?? null, accessUntil, createdBy: (ctx as any).user?.id ?? null });
      const emailed = input.sendEmail ? await sendCredentialsEmail(email, input.name.trim(), pw, accessUntil) : false;
      return { ok: true, tempPassword: pw, emailed, accessUntil: accessUntil.getTime() };
    }),

  setStudentActive: protectedProcedure
    .input(z.object({ id: z.number().int(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => { assertAdmin(ctx); const db = await dbOrThrow(); await db.update(satStudents).set({ active: input.active }).where(eq(satStudents.id, input.id)); return { ok: true }; }),

  resetStudentPassword: protectedProcedure
    .input(z.object({ id: z.number().int(), sendEmail: z.boolean().default(true) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      const [s] = await db.select().from(satStudents).where(eq(satStudents.id, input.id)).limit(1);
      if (!s) throw new TRPCError({ code: "NOT_FOUND" });
      const pw = tempPassword();
      await db.update(satStudents).set({ passwordHash: await hashPassword(pw), mustChangePassword: true }).where(eq(satStudents.id, s.id));
      const emailed = input.sendEmail ? await sendCredentialsEmail(s.email, s.name, pw) : false;
      return { ok: true, tempPassword: pw, emailed };
    }),

  // ── Skills & lessons ──
  skills: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx); const db = await dbOrThrow();
    await seedSatSkills();
    const skills = await db.select().from(satSkills).orderBy(satSkills.sortOrder);
    const counts = await db.select({ skillId: satQuestions.skillId, status: satQuestions.status, n: sql<number>`count(*)` }).from(satQuestions).groupBy(satQuestions.skillId, satQuestions.status);
    return skills.map(k => ({
      id: k.id, section: k.section, domain: k.domain, domainCode: k.domainCode, code: k.code, title: k.title, outcomes: k.outcomes, lessonStatus: k.lessonStatus,
      lessonEn: k.lessonEn, lessonId: k.lessonId,
      counts: { draft: Number(counts.find(c => c.skillId === k.id && c.status === "draft")?.n || 0), approved: Number(counts.find(c => c.skillId === k.id && c.status === "approved")?.n || 0), rejected: Number(counts.find(c => c.skillId === k.id && c.status === "rejected")?.n || 0) },
      job: jobs.get(`lesson:${k.code}`)?.status || null,
    }));
  }),

  generateLesson: protectedProcedure
    .input(z.object({ code: z.string().max(16) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      const [k] = await db.select().from(satSkills).where(eq(satSkills.code, input.code)).limit(1);
      if (!k) throw new TRPCError({ code: "NOT_FOUND" });
      return enqueue(`lesson:${k.code}`, `Lesson ${k.code}`, async () => {
        const { en, id } = await generateLesson(k);
        await db.update(satSkills).set({ lessonEn: en, lessonId: id, lessonStatus: "draft" }).where(eq(satSkills.id, k.id));
        return "lesson drafted";
      });
    }),

  setLessonStatus: protectedProcedure
    .input(z.object({ code: z.string().max(16), status: z.enum(["draft", "approved", "none"]) }))
    .mutation(async ({ input, ctx }) => { assertAdmin(ctx); const db = await dbOrThrow(); await db.update(satSkills).set({ lessonStatus: input.status }).where(eq(satSkills.code, input.code)); return { ok: true }; }),

  updateLesson: protectedProcedure
    .input(z.object({ code: z.string().max(16), lessonEn: z.any().optional(), lessonId: z.any().optional() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      await db.update(satSkills).set({ ...(input.lessonEn ? { lessonEn: input.lessonEn } : {}), ...(input.lessonId ? { lessonId: input.lessonId } : {}) }).where(eq(satSkills.code, input.code));
      return { ok: true };
    }),

  // ── Question bank ──
  generateQuestions: protectedProcedure
    .input(z.object({ code: z.string().max(16), difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]), count: z.number().int().min(1).max(12).default(6), format: z.enum(["mc", "spr"]).optional() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      const [k] = await db.select().from(satSkills).where(eq(satSkills.code, input.code)).limit(1);
      if (!k) throw new TRPCError({ code: "NOT_FOUND" });
      const key = `q:${k.code}:d${input.difficulty}:${Date.now().toString(36)}`;
      return enqueue(key, `${k.code} · difficulty ${input.difficulty} × ${input.count}`, async () => {
        const drafts = await generateQuestions(k, input.difficulty, input.count, input.format);
        for (const d of drafts) {
          await db.insert(satQuestions).values({
            skillId: k.id, section: k.section, difficulty: input.difficulty, format: d.format, passage: d.passage, stem: d.stem,
            choices: d.choices, answer: d.answer, acceptedAnswers: d.acceptedAnswers, explanationEn: d.explanationEn, explanationId: d.explanationId || null,
            distractorNotes: d.distractorNotes, checks: d.checks, status: "draft",
          });
        }
        return `${drafts.length} drafts (${drafts.filter(d => d.checks.blindSolveAgrees).length} blind-check agree)`;
      });
    }),

  jobs: protectedProcedure.query(({ ctx }) => {
    assertAdmin(ctx);
    return Array.from(jobs.values()).map(j => ({ key: j.key, label: j.label, status: j.status, result: j.result, error: j.error, queuedAt: j.queuedAt, finishedAt: j.finishedAt }));
  }),

  questions: protectedProcedure
    .input(z.object({ code: z.string().max(16).optional(), status: z.enum(["draft", "approved", "rejected", "retired"]).optional(), section: z.enum(["rw", "math"]).optional(), limit: z.number().int().min(1).max(300).default(100) }).optional())
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      const conds: any[] = [];
      if (input?.status) conds.push(eq(satQuestions.status, input.status));
      if (input?.section) conds.push(eq(satQuestions.section, input.section));
      if (input?.code) { const [k] = await db.select({ id: satSkills.id }).from(satSkills).where(eq(satSkills.code, input.code)).limit(1); if (k) conds.push(eq(satQuestions.skillId, k.id)); }
      const rows = await db.select({ q: satQuestions, code: satSkills.code, title: satSkills.title }).from(satQuestions)
        .innerJoin(satSkills, eq(satSkills.id, satQuestions.skillId))
        .where(conds.length ? and(...conds) : undefined).orderBy(desc(satQuestions.createdAt)).limit(input?.limit ?? 100);
      return rows.map(r => ({ ...r.q, skillCode: r.code, skillTitle: r.title }));
    }),

  setQuestionStatus: protectedProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(200), status: z.enum(["draft", "approved", "rejected", "retired"]) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      await db.update(satQuestions).set({ status: input.status, reviewedBy: (ctx as any).user?.id ?? null, reviewedAt: new Date() }).where(inArray(satQuestions.id, input.ids));
      return { ok: true };
    }),

  updateQuestion: protectedProcedure
    .input(z.object({ id: z.number().int(), passage: z.string().max(4000).nullable().optional(), stem: z.string().min(3).max(4000).optional(), choices: z.array(z.string().max(500)).length(4).nullable().optional(), answer: z.string().max(120).optional(), acceptedAnswers: z.array(z.string().max(60)).optional(), explanationEn: z.string().max(6000).optional(), explanationId: z.string().max(6000).nullable().optional(), difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      const { id, ...fields } = input; const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) if (v !== undefined) patch[k] = v;
      await db.update(satQuestions).set(patch).where(eq(satQuestions.id, id));
      return { ok: true };
    }),

  // ── Assignments ──
  createAssignment: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(160), note: z.string().max(2000).optional(), studentIds: z.array(z.number().int()).min(1),
      questionIds: z.array(z.number().int()).optional(),
      auto: z.object({ codes: z.array(z.string().max(16)).min(1), perSkill: z.number().int().min(1).max(15).default(5), difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional() }).optional(),
      dueAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      let ids = input.questionIds || [];
      const skillIds: number[] = [];
      if (input.auto) {
        for (const code of input.auto.codes) {
          const [k] = await db.select().from(satSkills).where(eq(satSkills.code, code)).limit(1);
          if (!k) continue;
          skillIds.push(k.id);
          const conds = [eq(satQuestions.skillId, k.id), eq(satQuestions.status, "approved")];
          if (input.auto.difficulty) conds.push(eq(satQuestions.difficulty, input.auto.difficulty));
          const pool = await db.select({ id: satQuestions.id }).from(satQuestions).where(and(...conds));
          ids.push(...pool.map(p => p.id).sort(() => Math.random() - 0.5).slice(0, input.auto.perSkill));
        }
      }
      ids = Array.from(new Set(ids));
      if (!ids.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No approved questions matched." });
      const res = await db.insert(satAssignments).values({ title: input.title, note: input.note ?? null, questionIds: ids, skillIds, dueAt: input.dueAt ? new Date(input.dueAt) : null, createdBy: (ctx as any).user?.id ?? null });
      const assignmentId = Number((res as any)[0]?.insertId || 0);
      for (const sid of input.studentIds) await db.insert(satAssignmentStudents).values({ assignmentId, studentId: sid });
      return { ok: true, assignmentId, questionCount: ids.length };
    }),

  assignments: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx); const db = await dbOrThrow();
    const rows = await db.select().from(satAssignments).orderBy(desc(satAssignments.createdAt)).limit(100);
    const st = await db.select().from(satAssignmentStudents);
    return rows.map(a => { const mine = st.filter(x => x.assignmentId === a.id); return { id: a.id, title: a.title, count: (a.questionIds as number[]).length, dueAt: a.dueAt, createdAt: a.createdAt, students: mine.length, completed: mine.filter(x => x.status === "completed").length }; });
  }),

  // ═══════════════ Phase 2 admin ═══════════════
  updateStudent: protectedProcedure
    .input(z.object({ id: z.number().int(), name: z.string().min(1).max(120).optional(), parentEmail: z.string().email().nullable().optional(), targetScore: z.number().int().min(400).max(1600).nullable().optional(), testDate: z.string().max(40).nullable().optional(), accessUntil: z.string().max(40).nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      const { id, accessUntil, ...rest } = input; const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) patch[k] = v;
      if (accessUntil !== undefined) patch.accessUntil = accessUntil && !isNaN(new Date(accessUntil).getTime()) ? endOfDayJakarta(accessUntil) : null;
      if (Object.keys(patch).length) await db.update(satStudents).set(patch).where(eq(satStudents.id, id));
      return { ok: true };
    }),

  testResults: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx); const db = await dbOrThrow();
    const rows = await db.select({ s: satTestSessions, name: satStudents.name }).from(satTestSessions).innerJoin(satStudents, eq(satStudents.id, satTestSessions.studentId)).orderBy(desc(satTestSessions.createdAt)).limit(200);
    return rows.map(r => ({ id: r.s.id, studentId: r.s.studentId, name: r.name, kind: r.s.kind, status: r.s.status, scores: r.s.scores as TestScores | null, createdAt: r.s.createdAt, completedAt: r.s.completedAt, route: (r.s.modules as TestModule[]).filter(m => m.stage === 2).map(m => `${m.section}:${m.variant}`).join(" ") }));
  }),

  /** Parent progress report (email via Resend). Preview with send=false. */
  parentReport: protectedProcedure
    .input(z.object({ id: z.number().int(), send: z.boolean().default(false) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      const [s] = await db.select().from(satStudents).where(eq(satStudents.id, input.id)).limit(1);
      if (!s) throw new TRPCError({ code: "NOT_FOUND" });
      const since = new Date(Date.now() - 14 * 86400000);
      const recent = await db.select().from(satResponses).where(and(eq(satResponses.studentId, s.id), gte(satResponses.createdAt, since)));
      const days = new Set(recent.map(r => new Date(r.createdAt).toISOString().slice(0, 10))).size;
      const predicted = await predictScore(s.id);
      const skills = await db.select().from(satSkills);
      const mastery = await db.select().from(satMastery).where(eq(satMastery.studentId, s.id));
      const mm = new Map(mastery.map(m => [m.skillId, Number(m.pKnown)]));
      const domains = Object.keys(DOMAIN_LABEL).map(code => { const ks = skills.filter(k => k.domainCode === code); const ps = ks.map(k => mm.get(k.id)).filter((x): x is number => x !== undefined); return { code, label: DOMAIN_LABEL[code].en, section: ks[0]?.section, avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null }; });
      const strengths = domains.filter(d => d.avg !== null && d.avg >= 0.7).map(d => d.label);
      const focus = domains.filter(d => d.avg !== null && d.avg < 0.5).map(d => d.label);
      const bar = (p: number | null) => p === null ? `<span style="color:#999">not started</span>` : `<span style="display:inline-block;width:120px;height:8px;background:#eee;border-radius:4px;vertical-align:middle"><span style="display:block;width:${Math.round(p * 100)}%;height:8px;background:${p < 0.5 ? "#f59e0b" : p < 0.75 ? "#0ea5e9" : "#10b981"};border-radius:4px"></span></span> ${Math.round(p * 100)}%`;
      const first = s.name.split(" ")[0];
      const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f5f8;padding:24px;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;">
  <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#4f46e5;font-weight:700">SpecTa SAT Self-Prep &middot; Progress report</div>
  <h2 style="margin:6px 0 2px;color:#14213D;">${s.name}</h2>
  <div style="font-size:13px;color:#667">${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}${s.testDate ? ` &middot; SAT test date: ${s.testDate}` : ""}${s.targetScore ? ` &middot; Target: ${s.targetScore}` : ""}</div>
  <table style="width:100%;margin:18px 0;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px;background:#f8fafc;border-radius:8px"><b>Last 14 days</b><br/>${recent.length} questions answered &middot; ${recent.length ? Math.round(recent.filter(r => r.correct).length / recent.length * 100) : 0}% correct &middot; ${days} active day${days === 1 ? "" : "s"}</td></tr>
  </table>
  <div style="font-size:14px;margin-bottom:6px"><b>Estimated score today: ${predicted.total}</b> <span style="color:#667">(Reading &amp; Writing ${predicted.rw} &middot; Math ${predicted.math})</span></div>
  <div style="font-size:12px;color:#667;margin-bottom:16px">${predicted.basis === "blend" ? "Based on the latest full mock test and daily practice." : "Based on daily practice so far; a full mock test will sharpen this estimate."}${predicted.lastMock ? ` Latest mock: <b>${predicted.lastMock.total}</b>.` : ""}</div>
  <h3 style="font-size:14px;margin:16px 0 8px">Mastery by area</h3>
  <table style="width:100%;font-size:13px;border-collapse:collapse">${domains.map(d => `<tr><td style="padding:4px 0;color:#334">${d.section === "rw" ? "RW" : "Math"} &middot; ${d.label}</td><td style="padding:4px 0;text-align:right">${bar(d.avg)}</td></tr>`).join("")}</table>
  ${strengths.length ? `<p style="font-size:13px"><b>Strengths:</b> ${strengths.join(", ")}</p>` : ""}
  ${focus.length ? `<p style="font-size:13px"><b>Focus next:</b> ${focus.join(", ")}</p>` : ""}
  <p style="font-size:13px;color:#334;line-height:1.6">Students who practise 20 minutes a day, most days, typically gain 100+ points over a season. Encourage ${first} to follow the daily plan on the dashboard.</p>
  <p style="font-size:12px;color:#667;margin-top:22px">Questions? Reply to this email or WhatsApp SpecTa. SAT&reg; is a registered trademark of College Board, which is not affiliated with and does not endorse SpecTa Education.</p>
</div></body></html>`;
      let sent = false;
      if (input.send) {
        if (!s.parentEmail) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No parent email on this student." });
        if (!ENV.resendApiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Resend is not configured." });
        const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.resendApiKey}` }, body: JSON.stringify({ from: "SpecTa Education <noreply@spectaeducation.com>", to: [s.parentEmail], subject: `${s.name} - SAT progress report from SpecTa`, html }) });
        sent = r.ok;
        if (!sent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Email provider rejected the message." });
      }
      return { html, sent, to: s.parentEmail };
    }),

  // ═══════════════ Phase 3 admin ═══════════════
  liveUsage: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx); const db = await dbOrThrow();
    const since = new Date(Date.now() - 30 * 86400000);
    const rows = await db.select({ studentId: satLiveSessions.studentId, name: satStudents.name, n: sql<number>`count(*)`, seconds: sql<number>`sum(seconds)` }).from(satLiveSessions).innerJoin(satStudents, eq(satStudents.id, satLiveSessions.studentId)).where(gte(satLiveSessions.startedAt, since)).groupBy(satLiveSessions.studentId, satStudents.name);
    const total = rows.reduce((x, r) => x + Number(r.seconds || 0), 0);
    return { dailyCapMinutes: SAT_LIVE_WEEKLY_MINUTES, weeklyCapMinutes: SAT_LIVE_WEEKLY_MINUTES, totalMinutes30d: Math.round(total / 60), students: rows.map(r => ({ studentId: r.studentId, name: r.name, calls: Number(r.n), minutes: Math.round(Number(r.seconds || 0) / 60) })) };
  }),

  officialScores: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx); const db = await dbOrThrow();
    const rows = await db.select({ o: satOfficialScores, name: satStudents.name }).from(satOfficialScores).innerJoin(satStudents, eq(satStudents.id, satOfficialScores.studentId)).orderBy(desc(satOfficialScores.createdAt)).limit(200);
    return rows.map(r => ({ ...r.o, name: r.name }));
  }),

  /** Manual credit top-up (e.g. paid by bank transfer). Negative minutes remove credit. */
  grantLiveCredit: protectedProcedure
    .input(z.object({ id: z.number().int(), minutes: z.number().int().min(-600).max(600) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      await db.update(satStudents).set({ liveCreditSeconds: sql`GREATEST(0, liveCreditSeconds + ${input.minutes * 60})` }).where(eq(satStudents.id, input.id));
      return { ok: true };
    }),

  creditOrders: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx); const db = await dbOrThrow();
    const rows = await db.select({ o: satCreditOrders, name: satStudents.name }).from(satCreditOrders).innerJoin(satStudents, eq(satStudents.id, satCreditOrders.studentId)).orderBy(desc(satCreditOrders.createdAt)).limit(100);
    return rows.map(r => ({ ...r.o, name: r.name }));
  }),

  seedStatus: protectedProcedure.query(({ ctx }) => { assertAdmin(ctx); return getSeedProgress(); }),
  auditStatus: protectedProcedure.query(({ ctx }) => { assertAdmin(ctx); return getAuditProgress(); }),
  auditRun: protectedProcedure.mutation(({ ctx }) => { assertAdmin(ctx); void runSatAudit(); return { ok: true }; }),
  seedRestart: protectedProcedure.mutation(async ({ ctx }) => { assertAdmin(ctx); await restartSatBulkSeed(); return { ok: true }; }),

  // ── Class heatmap ──
  heatmap: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx); const db = await dbOrThrow();
    const students = await db.select({ id: satStudents.id, name: satStudents.name, active: satStudents.active }).from(satStudents).where(eq(satStudents.active, true));
    const skills = await db.select({ id: satSkills.id, code: satSkills.code, title: satSkills.title, section: satSkills.section, domainCode: satSkills.domainCode }).from(satSkills).orderBy(satSkills.sortOrder);
    const mastery = await db.select().from(satMastery);
    const cells = mastery.map(m => ({ studentId: m.studentId, skillId: m.skillId, pKnown: Number(m.pKnown), attempts: m.attempts }));
    // "Teach next": skills with the lowest class-average mastery among practised skills
    const avg = skills.map(k => { const ms = mastery.filter(m => m.skillId === k.id); return { ...k, avg: ms.length ? ms.reduce((x, m) => x + Number(m.pKnown), 0) / ms.length : null, practised: ms.length }; });
    const teachNext = avg.filter(a => a.avg !== null && a.practised >= 2).sort((a, b) => (a.avg! - b.avg!)).slice(0, 5);
    return { students, skills, cells, teachNext };
  }),
});
