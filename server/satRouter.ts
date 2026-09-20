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
  satAssignments, satAssignmentStudents, type SatQuestion,
} from "../drizzle/schema";
import { issueSatCookie, clearSatCookie, resolveSatStudent, hashPassword, verifyPassword, tempPassword } from "./satAuth";
import { checkAnswer, recordAnswer, pickDrillQuestions, questionsByIds, publicQuestion, masteryLabel, seedSatSkills } from "./satEngine";
import { generateQuestions, generateLesson, tutorReply } from "./satQuestionGenerator";
import { DOMAIN_LABEL, DOMAIN_SHARE } from "./satSkills";

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

async function sendCredentialsEmail(to: string, name: string, password: string): Promise<boolean> {
  if (!ENV.resendApiKey) return false;
  const base = (ENV.appUrl || "https://www.spectaeducation.com").replace(/\/+$/, "");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f5f8;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;">
    <h2 style="margin:0 0 8px;color:#14213D;">Welcome to SpecTa SAT Self-Prep, ${name}!</h2>
    <p style="color:#334;line-height:1.6;">Your SAT study dashboard is ready. Practise any time, get instant explanations, and ask Emma when you're stuck.</p>
    <p style="margin:18px 0 6px;color:#334;"><b>Sign in:</b> <a href="${base}/sat/login">${base}/sat/login</a></p>
    <p style="margin:0;color:#334;"><b>Email:</b> ${to}<br/><b>Temporary password:</b> <code style="font-size:16px;">${password}</code></p>
    <p style="color:#667;font-size:13px;line-height:1.6;margin-top:16px;">You'll be asked to choose your own password the first time you sign in.</p>
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
      await issueSatCookie(ctx, s.id);
      await db.update(satStudents).set({ lastLoginAt: new Date() }).where(eq(satStudents.id, s.id));
      return { ok: true, mustChangePassword: s.mustChangePassword };
    }),
  logout: publicProcedure.mutation(({ ctx }) => { clearSatCookie(ctx); return { ok: true }; }),

  me: publicProcedure.query(async ({ ctx }) => {
    const s = await resolveSatStudent(ctx);
    if (!s) return null;
    return { id: s.id, name: s.name, email: s.email, lang: s.lang, targetScore: s.targetScore, testDate: s.testDate, mustChangePassword: s.mustChangePassword };
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

  /** Dashboard stats. */
  progress: publicProcedure.query(async ({ ctx }) => {
    const s = await requireStudent(ctx); const db = await dbOrThrow();
    const since7 = new Date(Date.now() - 7 * 86400000);
    const recent = await db.select().from(satResponses).where(and(eq(satResponses.studentId, s.id), gte(satResponses.createdAt, since7)));
    const all = await db.select({ n: sql<number>`count(*)`, c: sql<number>`sum(correct)` }).from(satResponses).where(eq(satResponses.studentId, s.id));
    const days = new Set(recent.map(r => new Date(r.createdAt).toISOString().slice(0, 10)));
    const mastery = await db.select().from(satMastery).where(eq(satMastery.studentId, s.id));
    const skills = await db.select({ id: satSkills.id, domainCode: satSkills.domainCode, section: satSkills.section }).from(satSkills);
    const byDomain: Record<string, { sum: number; n: number }> = {};
    for (const k of skills) { const m = mastery.find(x => x.skillId === k.id); const p = m ? Number(m.pKnown) : 0.2; const d = byDomain[k.domainCode] || { sum: 0, n: 0 }; d.sum += p; d.n++; byDomain[k.domainCode] = d; }
    return {
      week: { answered: recent.length, correct: recent.filter(r => r.correct).length, minutes: Math.round(recent.reduce((x, r) => x + (r.timeMs || 0), 0) / 60000), activeDays: days.size },
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
    return rows.map(r => ({ id: r.id, email: r.email, name: r.name, active: r.active, targetScore: r.targetScore, testDate: r.testDate, lang: r.lang, lastLoginAt: r.lastLoginAt, createdAt: r.createdAt, answered: Number(aMap.get(r.id)?.n || 0), lastActive: aMap.get(r.id)?.last || null }));
  }),

  createStudent: protectedProcedure
    .input(z.object({ email: z.string().email(), name: z.string().min(1).max(120), sendEmail: z.boolean().default(true), targetScore: z.number().int().min(400).max(1600).optional(), testDate: z.string().max(40).optional() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx); const db = await dbOrThrow();
      const email = input.email.trim().toLowerCase();
      const [dup] = await db.select({ id: satStudents.id }).from(satStudents).where(eq(satStudents.email, email)).limit(1);
      if (dup) throw new TRPCError({ code: "CONFLICT", message: "A student with that email already exists." });
      const pw = tempPassword();
      await db.insert(satStudents).values({ email, name: input.name.trim(), passwordHash: await hashPassword(pw), active: true, targetScore: input.targetScore ?? null, testDate: input.testDate ?? null, createdBy: (ctx as any).user?.id ?? null });
      const emailed = input.sendEmail ? await sendCredentialsEmail(email, input.name.trim(), pw) : false;
      return { ok: true, tempPassword: pw, emailed };
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
