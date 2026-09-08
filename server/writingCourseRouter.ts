/**
 * Emma 1-on-1 IELTS Writing Course — tRPC router (mounted as `writing`).
 *
 * A 5-session course (2h each, Task 1 + Task 2). The course record is the
 * student's memory: level, weakness map, per-session summaries, homework and
 * grades. Every session start builds Emma's context from it.
 *
 * TRIAL MODE (default, WRITING_COURSE_OPEN_TRIAL != "false"): no login, no
 * purchase — the student is identified by a per-browser key. When selling:
 * login + a purchased package will gate startSession (Phase 2).
 *
 * Pause/resume: a pause ENDS the voice call (no billing) and saves elapsed
 * time, the whiteboard and the transcript; resume mints a new call with the
 * saved state injected so Emma continues from where she stopped.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";

import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { writingCourses, writingCourseSessions, writingHomework } from "../drizzle/schema";
import type { WritingCourse } from "../drizzle/schema";
import { evaluateWriting, generateWritingTask } from "./tutorEngine";
import { invokeLLM } from "./_core/llm";
import { readFlag, writeFlag } from "./systemFlags";
import {
  buildSessionModuleText, buildStudentProfileText, buildHistoryText,
  buildHomeworkReviewText, buildOpeningLine, buildSessionSoFarText, trackForBand,
  weaknessMapFromCriteria, planFromWeaknessMap,
} from "./writingCurriculum";
import { WRITING_SESSION_BUDGET_SECONDS, WRITING_CALL_MAX_SECONDS, AGENT_VARIANT_FLAG_KEY } from "./writingClassAgent";

/** Accept a list as an array or a ';'/newline-separated string (tool args
 *  arrive as strings now that the schemas avoid array types). */
const listish = z.union([z.array(z.string().max(400)), z.string().max(6000)]).optional()
  .transform(v => Array.isArray(v) ? v : (v || "").split(/;|\n/).map(s => s.trim()).filter(Boolean));

const OPEN_TRIAL = () => process.env.WRITING_COURSE_OPEN_TRIAL !== "false";
const STARTS_PER_COURSE_PER_DAY = Number(process.env.WRITING_STARTS_PER_COURSE_PER_DAY || 8);
const GLOBAL_STARTS_PER_DAY = Number(process.env.WRITING_GLOBAL_STARTS_PER_DAY || 60);

const STUDENT_KEY = z.string().min(8).max(64);

/** Logged-in student (portal cookie) → leadId, else null. */
async function resolveLead(ctx: any): Promise<number | null> {
  try {
    const token = parseCookies(ctx?.req?.headers?.cookie || "")["student_portal_token"];
    if (!token) return null;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret"));
    const leadId = Number((payload as any).leadId);
    return Number.isFinite(leadId) ? leadId : null;
  } catch { return null; }
}

/** Prefer the account identity when logged in; otherwise the browser key. */
async function studentKeyFor(ctx: any, inputKey: string): Promise<{ key: string; leadId: number | null }> {
  const leadId = await resolveLead(ctx);
  return { key: leadId ? `lead:${leadId}` : inputKey, leadId };
}

async function loadCourse(key: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [course] = await db.select().from(writingCourses)
    .where(and(eq(writingCourses.studentKey, key), eq(writingCourses.status, "active")))
    .orderBy(desc(writingCourses.id)).limit(1);
  if (!course) return null;
  const sessions = await db.select().from(writingCourseSessions)
    .where(eq(writingCourseSessions.courseId, course.id)).orderBy(writingCourseSessions.sessionNumber);
  const homework = await db.select().from(writingHomework)
    .where(eq(writingHomework.courseId, course.id)).orderBy(desc(writingHomework.id));
  return { course, sessions, homework };
}

function requireCourse(c: Awaited<ReturnType<typeof loadCourse>>) {
  if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "No active writing course found." });
  return c;
}

/** Compact grading result for the client + the agent. */
function compactFeedback(fb: Awaited<ReturnType<typeof evaluateWriting>>) {
  return {
    overallBand: fb.overallBand,
    criteria: {
      taskResponse: fb.criteria.taskResponse,
      coherenceCohesion: fb.criteria.coherenceCohesion,
      lexicalResource: fb.criteria.lexicalResource,
      grammaticalRange: fb.criteria.grammaticalRange,
    },
    corrections: (fb.corrections || []).slice(0, 6),
    strengths: (fb.strengths || []).slice(0, 3),
    improvements: (fb.improvements || []).slice(0, 4),
    wordCount: fb.wordCount,
  };
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms))]);
}

/** Grade with a hard timeout; never throws to the caller. */
async function safeGrade(taskType: "task1" | "task2", prompt: string, text: string) {
  try {
    return compactFeedback(await withTimeout(evaluateWriting(taskType, prompt, text), 60000, "evaluateWriting"));
  } catch (e) {
    console.error("[WritingCourse] grading failed:", (e as Error).message);
    return null;
  }
}

export const writingCourseRouter = router({
  /** Trial switch + budget info for the UI. */
  config: publicProcedure.query(async () => ({
    openTrial: OPEN_TRIAL(),
    budgetSeconds: WRITING_SESSION_BUDGET_SECONDS,
    callMaxSeconds: WRITING_CALL_MAX_SECONDS,
    agentVariant: (await readFlag(AGENT_VARIANT_FLAG_KEY)) || null, // "tools+turn" | "tools" | "bare" | null
  })),

  /** The student's course (or null). */
  getCourse: publicProcedure
    .input(z.object({ studentKey: STUDENT_KEY }))
    .query(async ({ input, ctx }) => {
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const c = await loadCourse(key);
      if (!c) return null;
      return {
        course: c.course,
        sessions: c.sessions.map(s => ({
          id: s.id, sessionNumber: s.sessionNumber, status: s.status,
          elapsedSeconds: s.elapsedSeconds, budgetSeconds: s.budgetSeconds,
          summary: s.summary, covered: s.covered, completedAt: s.completedAt,
        })),
        homework: c.homework,
      };
    }),

  /**
   * Start (or resume) the current session: creates the course on first use,
   * finds the active/paused/next session, builds Emma's context, mints the
   * call. Returns everything the classroom needs to restore state.
   */
  startSession: publicProcedure
    .input(z.object({
      studentKey: STUDENT_KEY,
      studentName: z.string().max(120).optional(),
      testType: z.enum(["academic", "general"]).optional(),
      targetBand: z.number().min(4).max(9).optional(),
      testDate: z.string().max(40).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!OPEN_TRIAL()) {
        // Phase 2: require login + purchased package.
        throw new TRPCError({ code: "FORBIDDEN", message: "The Writing Course is not open yet." });
      }
      const { key, leadId } = await studentKeyFor(ctx, input.studentKey);

      let loaded = await loadCourse(key);
      if (!loaded) {
        await db.insert(writingCourses).values({
          studentKey: key, leadId,
          studentName: input.studentName || null,
          testType: input.testType || "academic",
          targetBand: input.targetBand != null ? String(input.targetBand) : null,
          testDate: input.testDate || null,
        });
        loaded = requireCourse(await loadCourse(key));
      } else if (input.studentName || input.testType || input.targetBand != null || input.testDate) {
        await db.update(writingCourses).set({
          ...(input.studentName ? { studentName: input.studentName } : {}),
          ...(input.testType ? { testType: input.testType } : {}),
          ...(input.targetBand != null ? { targetBand: String(input.targetBand) } : {}),
          ...(input.testDate ? { testDate: input.testDate } : {}),
        }).where(eq(writingCourses.id, loaded.course.id));
        loaded = requireCourse(await loadCourse(key));
      }
      const { course, sessions, homework } = loaded;
      if (course.sessionsCompleted >= course.totalSessions) {
        throw new TRPCError({ code: "FORBIDDEN", message: "All 5 sessions of this course are complete." });
      }

      // Current session: an active/paused one, else the next one.
      let session = sessions.find(s => s.status === "active" || s.status === "paused") || null;
      const resume = !!session;
      if (!session) {
        const n = course.sessionsCompleted + 1;
        session = sessions.find(s => s.sessionNumber === n) || null;
        if (!session) {
          await db.insert(writingCourseSessions).values({
            courseId: course.id, sessionNumber: n, budgetSeconds: WRITING_SESSION_BUDGET_SECONDS,
          });
          const fresh = requireCourse(await loadCourse(key));
          session = fresh.sessions.find(s => s.sessionNumber === n)!;
        }
      }
      if (session.elapsedSeconds >= session.budgetSeconds) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This session's 2 hours are used up. It will be marked complete." });
      }

      // Cost guardrails (each start spends ElevenLabs minutes).
      const day = new Date().toISOString().slice(0, 10);
      const ck = `writing_starts_${course.id}_${day}`;
      const gk = `writing_global_${day}`;
      const cs = Number((await readFlag(ck)) || "0");
      const gs = Number((await readFlag(gk)) || "0");
      if (cs >= STARTS_PER_COURSE_PER_DAY) throw new TRPCError({ code: "FORBIDDEN", message: "Too many class starts today. Please continue tomorrow." });
      if (gs >= GLOBAL_STARTS_PER_DAY) throw new TRPCError({ code: "FORBIDDEN", message: "The Writing Course is fully booked today. Please try again tomorrow." });

      const { getWritingTeacherSignedUrl } = await import("./writingClassAgent");
      const { signedUrl } = await getWritingTeacherSignedUrl();
      await writeFlag(ck, String(cs + 1));
      await writeFlag(gk, String(gs + 1));

      await db.update(writingCourseSessions).set({
        status: "active",
        startedAt: session.startedAt ?? new Date(),
        lastActiveAt: new Date(),
      }).where(eq(writingCourseSessions.id, session.id));

      const dynamicVariables = {
        student_profile: buildStudentProfileText(course),
        session_number: String(session.sessionNumber),
        session_module: buildSessionModuleText(course, session.sessionNumber),
        history: buildHistoryText(sessions, homework),
        homework_review: session.sessionNumber === 1 ? "No homework to review — this is the first session." : buildHomeworkReviewText(homework),
        opening_line: buildOpeningLine(course, session.sessionNumber, resume, session.elapsedSeconds),
        session_so_far: resume ? buildSessionSoFarText(session.transcript) : "Nothing yet — this is the start of the session.",
      };

      return {
        signedUrl,
        dynamicVariables,
        callMaxSeconds: WRITING_CALL_MAX_SECONDS,
        resume,
        course: { id: course.id, testType: course.testType, targetBand: course.targetBand, studentName: course.studentName, currentLevel: course.currentLevel, sessionsCompleted: course.sessionsCompleted, totalSessions: course.totalSessions },
        session: { id: session.id, sessionNumber: session.sessionNumber, elapsedSeconds: session.elapsedSeconds, budgetSeconds: session.budgetSeconds, board: session.board ?? [], transcript: session.transcript ?? [] },
      };
    }),

  /** Periodic + on-pause state save. Elapsed only moves forward. */
  saveSession: publicProcedure
    .input(z.object({
      studentKey: STUDENT_KEY, sessionId: z.number().int(),
      elapsedSeconds: z.number().int().min(0),
      board: z.array(z.any()).max(400).optional(),
      transcript: z.array(z.any()).max(1200).optional(),
      conversationId: z.string().max(200).optional(),
      status: z.enum(["active", "paused"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const { course, sessions } = requireCourse(await loadCourse(key));
      const s = sessions.find(x => x.id === input.sessionId);
      if (!s || s.courseId !== course.id) throw new TRPCError({ code: "NOT_FOUND" });
      const elapsed = Math.min(Math.max(s.elapsedSeconds, input.elapsedSeconds), s.budgetSeconds);
      const ids = Array.isArray(s.conversationIds) ? (s.conversationIds as string[]) : [];
      if (input.conversationId && !ids.includes(input.conversationId)) ids.push(input.conversationId);
      await db.update(writingCourseSessions).set({
        elapsedSeconds: elapsed,
        ...(input.board ? { board: input.board } : {}),
        ...(input.transcript ? { transcript: input.transcript } : {}),
        conversationIds: ids,
        lastActiveAt: new Date(),
        ...(input.status ? { status: input.status } : {}),
      }).where(eq(writingCourseSessions.id, s.id));
      return { ok: true, elapsedSeconds: elapsed };
    }),

  /** Emma's save_progress tool → session summary + next-session focus (+ level). */
  recordProgress: publicProcedure
    .input(z.object({
      studentKey: STUDENT_KEY, sessionId: z.number().int(),
      summary: z.string().max(4000),
      covered: listish,
      corrections: listish,
      nextFocus: z.string().max(600).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const { course, sessions } = requireCourse(await loadCourse(key));
      const s = sessions.find(x => x.id === input.sessionId);
      if (!s) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(writingCourseSessions).set({
        summary: input.summary, covered: input.covered.slice(0, 40), corrections: input.corrections.slice(0, 60),
      }).where(eq(writingCourseSessions.id, s.id));
      if (input.nextFocus) {
        const plan = ((course.plan as any) || {}) as Record<string, { focus: string }>;
        plan[String(s.sessionNumber + 1)] = { focus: input.nextFocus };
        await db.update(writingCourses).set({ plan }).where(eq(writingCourses.id, course.id));
      }
      return { ok: true };
    }),

  /** Emma's update_profile tool — remember name / target / test date / type. */
  updateProfile: publicProcedure
    .input(z.object({
      studentKey: STUDENT_KEY,
      name: z.string().max(120).optional(),
      targetBand: z.number().min(4).max(9).optional(),
      testDate: z.string().max(40).optional(),
      testType: z.enum(["academic", "general"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const { course } = requireCourse(await loadCourse(key));
      const patch: Record<string, unknown> = {};
      if (input.name?.trim()) patch.studentName = input.name.trim();
      if (input.targetBand != null) patch.targetBand = String(Math.round(input.targetBand * 2) / 2);
      if (input.testDate?.trim()) patch.testDate = input.testDate.trim();
      if (input.testType) patch.testType = input.testType;
      if (Object.keys(patch).length) await db.update(writingCourses).set(patch).where(eq(writingCourses.id, course.id));
      return { ok: true };
    }),

  /** Emma's set_level tool. */
  setLevel: publicProcedure
    .input(z.object({ studentKey: STUDENT_KEY, band: z.number().min(0).max(9), track: z.enum(["foundation", "developing", "advanced"]).optional(), note: z.string().max(600).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const { course } = requireCourse(await loadCourse(key));
      const band = Math.round(input.band * 2) / 2;
      await db.update(writingCourses).set({
        currentLevel: { band, track: input.track || trackForBand(band), note: input.note || null, updatedAt: new Date().toISOString() },
      }).where(eq(writingCourses.id, course.id));
      return { ok: true, band, track: input.track || trackForBand(band) };
    }),

  /** Objective grading of in-class writing. A Session-1 Task 2 diagnostic
   *  also sets the baseline, level, weakness map and personalised plan. */
  gradeWriting: publicProcedure
    .input(z.object({
      studentKey: STUDENT_KEY, taskType: z.enum(["task1", "task2"]),
      prompt: z.string().max(4000), text: z.string().min(20).max(12000),
      purpose: z.enum(["diagnostic", "practice"]).default("practice"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const { course } = requireCourse(await loadCourse(key));
      const fb = await safeGrade(input.taskType, input.prompt, input.text);
      if (!fb) return { graded: false as const };
      if (input.purpose === "diagnostic" && input.taskType === "task2" && !course.baseline) {
        const crit = {
          taskResponse: fb.criteria.taskResponse, coherenceCohesion: fb.criteria.coherenceCohesion,
          lexicalResource: fb.criteria.lexicalResource, grammaticalRange: fb.criteria.grammaticalRange,
        };
        const weak = weaknessMapFromCriteria(crit as any);
        await db.update(writingCourses).set({
          baseline: { overall: fb.overallBand, criteria: Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v.band])), at: new Date().toISOString() },
          currentLevel: { band: fb.overallBand, track: trackForBand(fb.overallBand), note: "from diagnostic", updatedAt: new Date().toISOString() },
          weaknessMap: weak,
          plan: planFromWeaknessMap(weak),
        }).where(eq(writingCourses.id, course.id));
      }
      return { graded: true as const, ...fb };
    }),

  /** Generate an IELTS task for in-class writing or homework. */
  generateTask: publicProcedure
    .input(z.object({ taskType: z.enum(["task1", "task2"]), testType: z.enum(["academic", "general"]).default("academic") }))
    .mutation(async ({ input }) => {
      try {
        if (input.taskType === "task1" && input.testType === "general") {
          const res = await withTimeout(invokeLLM({
            messages: [
              { role: "system", content: "You are an IELTS content writer. Output JSON only." },
              { role: "user", content: `Create one IELTS General Training Writing Task 1 LETTER task with a clear situation and exactly three bullet points the writer must cover. Return {"prompt":"full task wording incl. 'You should spend about 20 minutes on this task.', the situation, 'Write a letter to … In your letter:' followed by the three bullets, and 'Write at least 150 words. You do NOT need to write any addresses.'"}` },
            ],
            response_format: { type: "json_object" }, max_tokens: 600,
          }), 30000, "generateTask");
          const raw = res.choices?.[0]?.message?.content;
          const parsed = typeof raw === "string" ? JSON.parse(raw) : null;
          if (parsed?.prompt) return { taskType: "task1" as const, prompt: String(parsed.prompt) };
          throw new Error("no prompt");
        }
        const t = await withTimeout(generateWritingTask(input.taskType), 30000, "generateWritingTask");
        return { taskType: input.taskType, prompt: t.prompt, table: t.table };
      } catch (e) {
        console.warn("[WritingCourse] generateTask fallback:", (e as Error).message);
        return input.taskType === "task2"
          ? { taskType: "task2" as const, prompt: "You should spend about 40 minutes on this task.\n\nSome people believe that students should be required to learn a foreign language at school, while others think it should be optional. Discuss both views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words." }
          : input.testType === "general"
            ? { taskType: "task1" as const, prompt: "You should spend about 20 minutes on this task.\n\nYou recently bought a piece of equipment for your kitchen but it did not work. Write a letter to the shop manager. In your letter:\n- describe the problem with the equipment\n- explain what happened when you phoned the shop\n- say what you would like the manager to do\n\nWrite at least 150 words. You do NOT need to write any addresses." }
            : { taskType: "task1" as const, prompt: "You should spend about 20 minutes on this task.\n\nThe table below shows the percentage of households with internet access in four countries in 2010 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.", table: { title: "Households with internet access (%)", columns: ["Country", "2010", "2020"], rows: [["Indonesia", "12", "62"], ["Malaysia", "56", "91"], ["Vietnam", "27", "77"], ["Thailand", "22", "85"]] } };
      }
    }),

  /** Emma's assign_homework tool. */
  assignHomework: publicProcedure
    .input(z.object({ studentKey: STUDENT_KEY, sessionId: z.number().int(), taskType: z.enum(["task1", "task2"]), prompt: z.string().min(10).max(4000), guidance: z.string().max(1000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const { course, sessions } = requireCourse(await loadCourse(key));
      const s = sessions.find(x => x.id === input.sessionId);
      if (!s) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(writingHomework).values({
        courseId: course.id, sessionNumber: s.sessionNumber, taskType: input.taskType, prompt: input.prompt, guidance: input.guidance || null,
      });
      await db.update(writingCourseSessions).set({ homeworkAssigned: { taskType: input.taskType, prompt: input.prompt, guidance: input.guidance || null } }).where(eq(writingCourseSessions.id, s.id));
      return { ok: true };
    }),

  /** Complete the current session (Emma's end_class, or the budget ran out). */
  completeSession: publicProcedure
    .input(z.object({ studentKey: STUDENT_KEY, sessionId: z.number().int(), elapsedSeconds: z.number().int().min(0), board: z.array(z.any()).max(400).optional(), transcript: z.array(z.any()).max(1200).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const { course, sessions } = requireCourse(await loadCourse(key));
      const s = sessions.find(x => x.id === input.sessionId);
      if (!s) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(writingCourseSessions).set({
        status: "completed", completedAt: new Date(),
        elapsedSeconds: Math.min(Math.max(s.elapsedSeconds, input.elapsedSeconds), s.budgetSeconds),
        ...(input.board ? { board: input.board } : {}),
        ...(input.transcript ? { transcript: input.transcript } : {}),
      }).where(eq(writingCourseSessions.id, s.id));
      const done = Math.max(course.sessionsCompleted, s.sessionNumber);
      await db.update(writingCourses).set({
        sessionsCompleted: done,
        ...(done >= course.totalSessions ? { status: "completed" } : {}),
      }).where(eq(writingCourses.id, course.id));
      return { ok: true, sessionsCompleted: done, courseComplete: done >= course.totalSessions };
    }),

  /** Homework: list + submit (graded immediately; feeds the next session's review). */
  listHomework: publicProcedure
    .input(z.object({ studentKey: STUDENT_KEY }))
    .query(async ({ input, ctx }) => {
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const c = await loadCourse(key);
      return c ? c.homework : [];
    }),

  submitHomework: publicProcedure
    .input(z.object({ studentKey: STUDENT_KEY, homeworkId: z.number().int(), text: z.string().min(50).max(12000) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { key } = await studentKeyFor(ctx, input.studentKey);
      const { course, homework } = requireCourse(await loadCourse(key));
      const hw = homework.find(h => h.id === input.homeworkId);
      if (!hw) throw new TRPCError({ code: "NOT_FOUND" });
      const wordCount = (input.text.trim().match(/\S+/g) || []).length;
      await db.update(writingHomework).set({ submission: input.text, wordCount, status: "submitted", submittedAt: new Date() }).where(eq(writingHomework.id, hw.id));
      const fb = await safeGrade(hw.taskType, hw.prompt, input.text);
      if (!fb) return { graded: false as const };
      await db.update(writingHomework).set({
        overallBand: String(fb.overallBand),
        scores: Object.fromEntries(Object.entries(fb.criteria).map(([k, v]) => [k, v.band])),
        feedback: { strengths: fb.strengths, improvements: fb.improvements, corrections: fb.corrections, criteria: fb.criteria },
        status: "graded", gradedAt: new Date(),
      }).where(eq(writingHomework.id, hw.id));
      // Mark weaknesses that improved by ≥0.5 vs baseline as "improving".
      const base = (course.baseline as any)?.criteria;
      const weak = (course.weaknessMap as any[]) || [];
      if (base && weak.length) {
        const map: Record<string, keyof typeof fb.criteria> = { "Task Response": "taskResponse", "Coherence & Cohesion": "coherenceCohesion", "Lexical Resource": "lexicalResource", "Grammatical Range & Accuracy": "grammaticalRange" };
        const updated = weak.map(w => {
          const k = map[w.criterion]; if (!k) return w;
          const now = fb.criteria[k].band, before = Number(base[k]);
          return now - before >= 0.5 ? { ...w, status: now - before >= 1 ? "fixed" : "improving" } : w;
        });
        await db.update(writingCourses).set({ weaknessMap: updated }).where(eq(writingCourses.id, course.id));
      }
      return { graded: true as const, ...fb };
    }),
});
