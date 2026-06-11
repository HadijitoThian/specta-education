/**
 * IELTS Mock Test — student-facing tRPC routes.
 * Mounted under `ielts` in the main app router.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, desc, inArray, sql } from "drizzle-orm";

import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  ieltsMockAttempts,
  ieltsMockTests,
  ieltsListeningSections,
  ieltsListeningQuestions,
  ieltsListeningAnswers,
  ieltsReadingPassages,
  ieltsReadingQuestions,
  ieltsReadingAnswers,
  ieltsWritingTasks,
  ieltsWritingResponses,
  ieltsSpeakingPrompts,
  ieltsSpeakingConversations,
  ieltsSpeakingResponses,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { synthesize as ttsSynthesize } from "./_core/elevenlabs";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { finalizeAttempt } from "./ieltsFinalize";
import { ieltsMockScores } from "../drizzle/schema";
import {
  IELTS_MOCK_PRICE,
  createIeltsMockInvoice,
} from "./ieltsMockService";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ieltsRouter = router({
  /**
   * Pricing + how many published tests we have for each type. Used by the
   * marketing page to decide which "Buy" buttons to enable.
   */
  catalog: publicProcedure.query(async () => {
    const db = await getDb();
    const { ENV } = await import("./_core/env");
    const freeCodes = ENV.freeTrialTestCodes;
    let academicCount = 0;
    let generalCount = 0;
    let academicFree = false;
    let generalFree = false;
    if (db) {
      const rows = await db
        .select({
          testType: ieltsMockTests.testType,
          code: ieltsMockTests.code,
        })
        .from(ieltsMockTests)
        .where(eq(ieltsMockTests.isPublished, true));
      for (const r of rows) {
        const isFree = freeCodes.includes(r.code.toUpperCase());
        if (r.testType === "academic") {
          academicCount++;
          if (isFree) academicFree = true;
        } else if (r.testType === "general") {
          generalCount++;
          if (isFree) generalFree = true;
        }
      }
    }
    return {
      priceIdr: IELTS_MOCK_PRICE,
      academicTests: academicCount,
      generalTests: generalCount,
      academicFree,
      generalFree,
    };
  }),

  /**
   * Start a checkout. Reserves an attempt row, creates a Xendit invoice,
   * returns the hosted invoice URL the client should redirect to.
   */
  startCheckout: protectedProcedure
    .input(
      z.object({
        testType: z.enum(["academic", "general"]),
        customerName: z.string().min(1).max(120),
        customerEmail: z.string().refine(v => EMAIL_RE.test(v), {
          message: "Invalid email",
        }),
        customerPhone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      try {
        // If the *first* published test we'd pick is in the
        // FREE_TRIAL_TEST_CODES env list, bypass Xendit and hand back an
        // attempt token directly. Used for staff testing pre-launch.
        const { ENV } = await import("./_core/env");
        const freeCodes = ENV.freeTrialTestCodes;
        if (freeCodes.length > 0) {
          const db = await getDb();
          if (db) {
            const candidates = await db
              .select({
                id: ieltsMockTests.id,
                code: ieltsMockTests.code,
              })
              .from(ieltsMockTests)
              .where(
                and(
                  eq(ieltsMockTests.isPublished, true),
                  eq(ieltsMockTests.testType, input.testType)
                )
              );
            const free = candidates.find(t =>
              freeCodes.includes(t.code.toUpperCase())
            );
            if (free) {
              // Free trial path — create attempt directly.
              const { nanoid } = await import("nanoid");
              const attemptToken = nanoid(24);
              await db.insert(ieltsMockAttempts).values({
                userId: ctx.user.id,
                testId: free.id,
                attemptToken,
                paymentRef: `FREE-TRIAL-${nanoid(8)}`,
                paidAt: new Date(),
                status: "ready",
              });
              return {
                trial: true as const,
                invoiceUrl: "",
                attemptToken,
              };
            }
          }
        }

        const invoice = await createIeltsMockInvoice({
          userId: ctx.user.id,
          testType: input.testType,
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail.trim(),
          customerPhone: input.customerPhone?.trim() || undefined,
        });
        return {
          trial: false as const,
          invoiceUrl: invoice.invoiceUrl,
          attemptToken: invoice.attemptToken,
        };
      } catch (err) {
        console.error("[IELTS] startCheckout failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Checkout failed",
        });
      }
    }),

  /**
   * Look up an attempt by its token. Returns minimal info — used on the
   * post-payment landing page to confirm the attempt is unlocked.
   */
  getAttempt: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

      if (attempt.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [test] = await db
        .select({
          code: ieltsMockTests.code,
          title: ieltsMockTests.title,
          testType: ieltsMockTests.testType,
        })
        .from(ieltsMockTests)
        .where(eq(ieltsMockTests.id, attempt.testId))
        .limit(1);

      return {
        attempt: {
          token: attempt.attemptToken,
          status: attempt.status,
          paidAt: attempt.paidAt,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
        },
        test: test ?? null,
      };
    }),

  /**
   * Fetch the test content for a paid attempt — student-safe version.
   * Strips correctAnswers from every question. Used by the take-test page
   * to render the Listening / Reading UI without leaking the answer key.
   */
  getListeningContent: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!attempt.paidAt) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Attempt has not been paid for yet",
        });
      }

      const sections = await db
        .select({
          id: ieltsListeningSections.id,
          sectionNumber: ieltsListeningSections.sectionNumber,
          audioKey: ieltsListeningSections.audioKey,
          durationSec: ieltsListeningSections.durationSec,
        })
        .from(ieltsListeningSections)
        .where(eq(ieltsListeningSections.testId, attempt.testId))
        .orderBy(ieltsListeningSections.sectionNumber);

      if (sections.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No Listening sections found for this test",
        });
      }

      const sectionIds = sections.map(s => s.id);
      const questionRows = await db
        .select({
          id: ieltsListeningQuestions.id,
          sectionId: ieltsListeningQuestions.sectionId,
          questionNumber: ieltsListeningQuestions.questionNumber,
          questionType: ieltsListeningQuestions.questionType,
          prompt: ieltsListeningQuestions.prompt,
          options: ieltsListeningQuestions.options,
          // correctAnswers intentionally NOT selected
        })
        .from(ieltsListeningQuestions)
        .where(inArray(ieltsListeningQuestions.sectionId, sectionIds))
        .orderBy(ieltsListeningQuestions.questionNumber);

      const grouped = sections.map(s => ({
        id: s.id,
        sectionNumber: s.sectionNumber,
        audioUrl: s.audioKey ? `/files/${s.audioKey}` : null,
        durationSec: s.durationSec,
        questions: questionRows.filter(q => q.sectionId === s.id),
      }));

      // Existing saved answers for this attempt (resume support).
      const existingAnswers = await db
        .select()
        .from(ieltsListeningAnswers)
        .where(eq(ieltsListeningAnswers.attemptId, attempt.id));

      return {
        attempt: {
          token: attempt.attemptToken,
          status: attempt.status,
          startedAt: attempt.startedAt,
        },
        sections: grouped,
        existingAnswers: existingAnswers.map(a => ({
          questionId: a.questionId,
          answer: a.studentAnswer ?? "",
        })),
        // Hard time cap (server-enforced when finishListening is called).
        timeLimitSec: 35 * 60,
      };
    }),

  /**
   * Mark the attempt as having entered a particular skill. Sets the
   * appropriate `status` and stamps `startedAt` the first time the student
   * starts any skill. Idempotent.
   */
  startSkill: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        skill: z.enum(["listening", "reading", "writing", "speaking"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!attempt.paidAt) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Attempt has not been paid for yet",
        });
      }

      await db
        .update(ieltsMockAttempts)
        .set({
          status: input.skill,
          startedAt: attempt.startedAt ?? new Date(),
        })
        .where(eq(ieltsMockAttempts.id, attempt.id));

      return { ok: true };
    }),

  /**
   * Persist (or update) the student's answers for Listening. Called
   * frequently from the UI — debounced auto-save + on-blur. Compares each
   * student answer against the question's `correctAnswers` array (case-
   * insensitive, trimmed) to set isCorrect, so grading is "free" at finish.
   */
  saveListeningAnswers: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        answers: z
          .array(
            z.object({
              questionId: z.number().int(),
              answer: z.string().max(2000),
            })
          )
          .max(60),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (attempt.status === "completed") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Attempt is already completed",
        });
      }

      // Pull question correctAnswers in one query.
      const ids = input.answers.map(a => a.questionId);
      if (ids.length === 0) return { saved: 0 };

      const qs = await db
        .select({
          id: ieltsListeningQuestions.id,
          correctAnswers: ieltsListeningQuestions.correctAnswers,
        })
        .from(ieltsListeningQuestions)
        .where(inArray(ieltsListeningQuestions.id, ids));
      const qMap = new Map(qs.map(q => [q.id, q.correctAnswers as string[]]));

      const normalize = (s: string) => s.trim().toLowerCase();

      const existing = await db
        .select({
          id: ieltsListeningAnswers.id,
          questionId: ieltsListeningAnswers.questionId,
        })
        .from(ieltsListeningAnswers)
        .where(
          and(
            eq(ieltsListeningAnswers.attemptId, attempt.id),
            inArray(ieltsListeningAnswers.questionId, ids)
          )
        );
      const existingMap = new Map(existing.map(e => [e.questionId, e.id]));

      let saved = 0;
      for (const a of input.answers) {
        const correctSet = qMap.get(a.questionId) ?? [];
        const isCorrect =
          a.answer.trim().length > 0 &&
          correctSet.some(c => normalize(c) === normalize(a.answer));
        const existingId = existingMap.get(a.questionId);
        if (existingId) {
          await db
            .update(ieltsListeningAnswers)
            .set({ studentAnswer: a.answer, isCorrect })
            .where(eq(ieltsListeningAnswers.id, existingId));
        } else {
          await db.insert(ieltsListeningAnswers).values({
            attemptId: attempt.id,
            questionId: a.questionId,
            studentAnswer: a.answer,
            isCorrect,
          });
        }
        saved++;
      }
      return { saved };
    }),

  /**
   * Mark Listening as finished and advance to Reading. Doesn't grade —
   * grading is already happening on each saveListeningAnswers call.
   */
  finishListening: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(ieltsMockAttempts)
        .set({ status: "reading" })
        .where(eq(ieltsMockAttempts.id, attempt.id));

      return { ok: true };
    }),

  // -------------------- READING --------------------

  /**
   * Returns the 3 reading passages + their questions for an attempt.
   * Strips correctAnswers. Also returns any saved answers for resume.
   */
  getReadingContent: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!attempt.paidAt) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Attempt has not been paid for yet",
        });
      }

      const passages = await db
        .select({
          id: ieltsReadingPassages.id,
          passageNumber: ieltsReadingPassages.passageNumber,
          title: ieltsReadingPassages.title,
          body: ieltsReadingPassages.body,
        })
        .from(ieltsReadingPassages)
        .where(eq(ieltsReadingPassages.testId, attempt.testId))
        .orderBy(ieltsReadingPassages.passageNumber);

      if (passages.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No Reading passages found for this test",
        });
      }

      const passageIds = passages.map(p => p.id);
      const questionRows = await db
        .select({
          id: ieltsReadingQuestions.id,
          passageId: ieltsReadingQuestions.passageId,
          questionNumber: ieltsReadingQuestions.questionNumber,
          questionType: ieltsReadingQuestions.questionType,
          prompt: ieltsReadingQuestions.prompt,
          options: ieltsReadingQuestions.options,
        })
        .from(ieltsReadingQuestions)
        .where(inArray(ieltsReadingQuestions.passageId, passageIds))
        .orderBy(ieltsReadingQuestions.questionNumber);

      const grouped = passages.map(p => ({
        id: p.id,
        passageNumber: p.passageNumber,
        title: p.title,
        body: p.body,
        questions: questionRows.filter(q => q.passageId === p.id),
      }));

      const existingAnswers = await db
        .select()
        .from(ieltsReadingAnswers)
        .where(eq(ieltsReadingAnswers.attemptId, attempt.id));

      return {
        attempt: {
          token: attempt.attemptToken,
          status: attempt.status,
          startedAt: attempt.startedAt,
        },
        passages: grouped,
        existingAnswers: existingAnswers.map(a => ({
          questionId: a.questionId,
          answer: a.studentAnswer ?? "",
        })),
        // 60-minute hard cap matches real IELTS.
        timeLimitSec: 60 * 60,
      };
    }),

  /** Save (or update) the student's Reading answers. Auto-grades inline. */
  saveReadingAnswers: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        answers: z
          .array(
            z.object({
              questionId: z.number().int(),
              answer: z.string().max(2000),
            })
          )
          .max(60),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (attempt.status === "completed") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Attempt is already completed",
        });
      }

      const ids = input.answers.map(a => a.questionId);
      if (ids.length === 0) return { saved: 0 };

      const qs = await db
        .select({
          id: ieltsReadingQuestions.id,
          correctAnswers: ieltsReadingQuestions.correctAnswers,
        })
        .from(ieltsReadingQuestions)
        .where(inArray(ieltsReadingQuestions.id, ids));
      const qMap = new Map(qs.map(q => [q.id, q.correctAnswers as string[]]));

      const normalize = (s: string) => s.trim().toLowerCase();

      const existing = await db
        .select({
          id: ieltsReadingAnswers.id,
          questionId: ieltsReadingAnswers.questionId,
        })
        .from(ieltsReadingAnswers)
        .where(
          and(
            eq(ieltsReadingAnswers.attemptId, attempt.id),
            inArray(ieltsReadingAnswers.questionId, ids)
          )
        );
      const existingMap = new Map(existing.map(e => [e.questionId, e.id]));

      let saved = 0;
      for (const a of input.answers) {
        const correctSet = qMap.get(a.questionId) ?? [];
        const isCorrect =
          a.answer.trim().length > 0 &&
          correctSet.some(c => normalize(c) === normalize(a.answer));
        const existingId = existingMap.get(a.questionId);
        if (existingId) {
          await db
            .update(ieltsReadingAnswers)
            .set({ studentAnswer: a.answer, isCorrect })
            .where(eq(ieltsReadingAnswers.id, existingId));
        } else {
          await db.insert(ieltsReadingAnswers).values({
            attemptId: attempt.id,
            questionId: a.questionId,
            studentAnswer: a.answer,
            isCorrect,
          });
        }
        saved++;
      }
      return { saved };
    }),

  /**
   * Mark Reading as finished and advance to Writing.
   */
  finishReading: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(ieltsMockAttempts)
        .set({ status: "writing" })
        .where(eq(ieltsMockAttempts.id, attempt.id));

      return { ok: true };
    }),

  // -------------------- WRITING --------------------

  /** Returns the 2 writing tasks for an attempt + any saved drafts. */
  getWritingContent: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!attempt.paidAt) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Attempt has not been paid for yet",
        });
      }

      const tasks = await db
        .select({
          id: ieltsWritingTasks.id,
          taskNumber: ieltsWritingTasks.taskNumber,
          taskFormat: ieltsWritingTasks.taskFormat,
          prompt: ieltsWritingTasks.prompt,
          imageKey: ieltsWritingTasks.imageKey,
          minWords: ieltsWritingTasks.minWords,
          timeLimitSec: ieltsWritingTasks.timeLimitSec,
        })
        .from(ieltsWritingTasks)
        .where(eq(ieltsWritingTasks.testId, attempt.testId))
        .orderBy(ieltsWritingTasks.taskNumber);

      if (tasks.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No Writing tasks found for this test",
        });
      }

      const existingResponses = await db
        .select({
          taskId: ieltsWritingResponses.taskId,
          studentText: ieltsWritingResponses.studentText,
          wordCount: ieltsWritingResponses.wordCount,
        })
        .from(ieltsWritingResponses)
        .where(eq(ieltsWritingResponses.attemptId, attempt.id));

      return {
        attempt: {
          token: attempt.attemptToken,
          status: attempt.status,
          startedAt: attempt.startedAt,
        },
        tasks: tasks.map(t => ({
          ...t,
          imageUrl: t.imageKey ? `/files/${t.imageKey}` : null,
        })),
        existingResponses,
      };
    }),

  /** Autosave a writing draft. Upserts on (attemptId, taskId). */
  saveWritingDraft: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        taskId: z.number().int(),
        text: z.string().max(20000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (attempt.status === "completed") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Attempt is already completed",
        });
      }

      const wordCount = input.text.trim().split(/\s+/).filter(Boolean).length;

      const [existing] = await db
        .select({ id: ieltsWritingResponses.id })
        .from(ieltsWritingResponses)
        .where(
          and(
            eq(ieltsWritingResponses.attemptId, attempt.id),
            eq(ieltsWritingResponses.taskId, input.taskId)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(ieltsWritingResponses)
          .set({ studentText: input.text, wordCount })
          .where(eq(ieltsWritingResponses.id, existing.id));
      } else {
        await db.insert(ieltsWritingResponses).values({
          attemptId: attempt.id,
          taskId: input.taskId,
          studentText: input.text,
          wordCount,
        });
      }

      return { wordCount };
    }),

  /**
   * Finalise Writing: LLM-grade each task against the IELTS rubric, persist
   * sub-scores + feedback per task, then transition to "speaking". This
   * mutation can take 30-90s because it makes one LLM call per task.
   */
  finishWriting: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const tasks = await db
        .select()
        .from(ieltsWritingTasks)
        .where(eq(ieltsWritingTasks.testId, attempt.testId))
        .orderBy(ieltsWritingTasks.taskNumber);

      const responses = await db
        .select()
        .from(ieltsWritingResponses)
        .where(eq(ieltsWritingResponses.attemptId, attempt.id));

      for (const task of tasks) {
        const response = responses.find(r => r.taskId === task.id);
        if (!response || !response.studentText) continue;
        if (response.gradedAt) continue; // skip if already graded

        try {
          const grading = await gradeWritingTask({
            taskNumber: task.taskNumber,
            taskFormat: task.taskFormat,
            prompt: task.prompt,
            minWords: task.minWords,
            text: response.studentText,
            wordCount: response.wordCount,
          });

          // Task band = mean of 4 sub-scores, rounded to nearest 0.5.
          const taskBand = roundToHalfBand(
            (grading.scoreTA + grading.scoreCC + grading.scoreLR + grading.scoreGRA) / 4
          );

          await db
            .update(ieltsWritingResponses)
            .set({
              scoreTA: String(grading.scoreTA),
              scoreCC: String(grading.scoreCC),
              scoreLR: String(grading.scoreLR),
              scoreGRA: String(grading.scoreGRA),
              taskBand: String(taskBand),
              feedback: grading.feedback,
              gradedAt: new Date(),
            })
            .where(eq(ieltsWritingResponses.id, response.id));
        } catch (err) {
          console.error(
            `[IELTS Writing grade] task ${task.id} failed:`,
            err
          );
          // Continue with the other task — don't break the whole finish.
        }
      }

      await db
        .update(ieltsMockAttempts)
        .set({ status: "speaking" })
        .where(eq(ieltsMockAttempts.id, attempt.id));

      return { ok: true };
    }),

  // -------------------- SPEAKING --------------------

  /**
   * Returns the full Speaking state: prompts catalog + conversation so far +
   * computed position (currentPart, currentPromptIdx). Conversation rows
   * include audioUrl built from audioKey via the /files/ proxy.
   */
  getSpeakingState: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const prompts = await db
        .select()
        .from(ieltsSpeakingPrompts)
        .where(eq(ieltsSpeakingPrompts.testId, attempt.testId))
        .orderBy(
          ieltsSpeakingPrompts.partNumber,
          ieltsSpeakingPrompts.promptOrder
        );

      const conversation = await db
        .select()
        .from(ieltsSpeakingConversations)
        .where(eq(ieltsSpeakingConversations.attemptId, attempt.id))
        .orderBy(ieltsSpeakingConversations.turnOrder);

      const examinerTurns = conversation.filter(c => c.role === "examiner");
      const allPromptsDone = examinerTurns.length >= prompts.length;

      const nextPrompt = allPromptsDone ? null : prompts[examinerTurns.length];

      return {
        attempt: {
          token: attempt.attemptToken,
          status: attempt.status,
        },
        prompts: prompts.map(p => ({
          id: p.id,
          partNumber: p.partNumber,
          promptOrder: p.promptOrder,
          prompt: p.prompt,
          cueCardText: p.cueCardText,
        })),
        conversation: conversation.map(c => ({
          id: c.id,
          partNumber: c.partNumber,
          turnOrder: c.turnOrder,
          role: c.role,
          text: c.text,
          audioUrl: c.audioKey ? `/files/${c.audioKey}` : null,
        })),
        nextPrompt: nextPrompt
          ? {
              id: nextPrompt.id,
              partNumber: nextPrompt.partNumber,
              promptOrder: nextPrompt.promptOrder,
              prompt: nextPrompt.prompt,
              cueCardText: nextPrompt.cueCardText,
            }
          : null,
        allPromptsDone,
      };
    }),

  /**
   * Generate the next examiner audio + persist as a conversation turn.
   * Idempotent-ish: if a row for that prompt already exists, returns it.
   * Uses ElevenLabs to synthesize the prompt text into MP3, uploads to R2.
   */
  nextExaminerTurn: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const prompts = await db
        .select()
        .from(ieltsSpeakingPrompts)
        .where(eq(ieltsSpeakingPrompts.testId, attempt.testId))
        .orderBy(
          ieltsSpeakingPrompts.partNumber,
          ieltsSpeakingPrompts.promptOrder
        );

      const conversation = await db
        .select()
        .from(ieltsSpeakingConversations)
        .where(eq(ieltsSpeakingConversations.attemptId, attempt.id))
        .orderBy(ieltsSpeakingConversations.turnOrder);

      const examinerCount = conversation.filter(c => c.role === "examiner").length;
      if (examinerCount >= prompts.length) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "All Speaking prompts already played",
        });
      }

      const next = prompts[examinerCount];

      // TTS the prompt text. For Part 2 cue card, we also speak the lead-in
      // (the `prompt` field) but the cue card body itself is shown visually
      // and the student gets prep time.
      let audioKey: string | null = null;
      try {
        const audioBuf = await ttsSynthesize({
          text: next.prompt,
          // higher-quality model for examiner audio
          modelId: "eleven_multilingual_v2",
          outputFormat: "mp3_44100_128",
        });
        const key = `ielts/speaking/${attempt.attemptToken}/examiner-${next.partNumber}-${next.promptOrder}-${nanoid(6)}.mp3`;
        await storagePut(key, audioBuf, "audio/mpeg");
        audioKey = key;
      } catch (err) {
        console.error("[IELTS Speaking] TTS failed:", err);
        // Continue without audio — UI can fall back to text-only.
      }

      const turnOrder = conversation.length + 1;
      const inserted = await db.insert(ieltsSpeakingConversations).values({
        attemptId: attempt.id,
        partNumber: next.partNumber,
        turnOrder,
        role: "examiner",
        text: next.prompt,
        audioKey,
      });
      const turnId = (inserted as any)[0]?.insertId as number;

      return {
        turn: {
          id: turnId,
          partNumber: next.partNumber,
          promptOrder: next.promptOrder,
          turnOrder,
          text: next.prompt,
          audioUrl: audioKey ? `/files/${audioKey}` : null,
          cueCardText: next.cueCardText,
        },
      };
    }),

  /**
   * Student submits an audio recording. We persist it to R2, call Whisper,
   * append the transcript as a conversation turn.
   */
  submitStudentTurn: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        partNumber: z.number().int().min(1).max(3),
        base64: z.string().min(1),
        contentType: z.string().default("audio/webm"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const cleanB64 = input.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanB64, "base64");

      const ext = input.contentType.includes("webm")
        ? "webm"
        : input.contentType.includes("mp4")
          ? "mp4"
          : input.contentType.includes("wav")
            ? "wav"
            : "mp3";
      const key = `ielts/speaking/${attempt.attemptToken}/student-p${input.partNumber}-${nanoid(8)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.contentType);

      let transcript = "";
      try {
        const result = await transcribeAudio({ audioUrl: url });
        if ("error" in result) {
          console.warn(
            "[IELTS Speaking] Whisper failed:",
            result.error,
            result.details
          );
        } else {
          transcript = result.text ?? "";
        }
      } catch (err) {
        console.error("[IELTS Speaking] transcribe error:", err);
      }

      const existing = await db
        .select()
        .from(ieltsSpeakingConversations)
        .where(eq(ieltsSpeakingConversations.attemptId, attempt.id));
      const turnOrder = existing.length + 1;

      await db.insert(ieltsSpeakingConversations).values({
        attemptId: attempt.id,
        partNumber: input.partNumber,
        turnOrder,
        role: "student",
        text: transcript,
        audioKey: key,
      });

      return { transcript, audioUrl: `/files/${key}` };
    }),

  /**
   * Finalise Speaking: for each Part (1, 2, 3), concatenate the student's
   * transcripts and LLM-grade against the IELTS Speaking rubric. Persist
   * per-part FC/LR/GRA/P + band + feedback. Then transition to "grading"
   * (which P1h/P4 will pick up to compute overall band + generate PDF).
   */
  finishSpeaking: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const conversation = await db
        .select()
        .from(ieltsSpeakingConversations)
        .where(eq(ieltsSpeakingConversations.attemptId, attempt.id))
        .orderBy(ieltsSpeakingConversations.turnOrder);

      for (const partNumber of [1, 2, 3] as const) {
        const examinerTurns = conversation.filter(
          c => c.role === "examiner" && c.partNumber === partNumber
        );
        const studentTurns = conversation.filter(
          c => c.role === "student" && c.partNumber === partNumber
        );
        if (studentTurns.length === 0) continue;

        const studentText = studentTurns
          .map(t => t.text)
          .filter(t => t && t.length > 0)
          .join("\n\n");
        if (!studentText.trim()) continue;

        const transcriptForLLM = conversation
          .filter(c => c.partNumber === partNumber)
          .map(c => `${c.role.toUpperCase()}: ${c.text}`)
          .join("\n");

        try {
          const grading = await gradeSpeakingPart({
            partNumber,
            transcript: transcriptForLLM,
            studentText,
          });
          const partBand = roundToHalfBand(
            (grading.scoreFC +
              grading.scoreLR +
              grading.scoreGRA +
              grading.scoreP) /
              4
          );
          await db.insert(ieltsSpeakingResponses).values({
            attemptId: attempt.id,
            partNumber,
            transcript: studentText,
            scoreFC: String(grading.scoreFC),
            scoreLR: String(grading.scoreLR),
            scoreGRA: String(grading.scoreGRA),
            scoreP: String(grading.scoreP),
            partBand: String(partBand),
            feedback: grading.feedback,
            gradedAt: new Date(),
            completedAt: new Date(),
          });
        } catch (err) {
          console.error(
            `[IELTS Speaking grade] part ${partNumber} failed:`,
            err
          );
        }
      }

      await db
        .update(ieltsMockAttempts)
        .set({ status: "grading" })
        .where(eq(ieltsMockAttempts.id, attempt.id));

      // Kick off final scoring + PDF + email immediately (synchronous, ~10s).
      // If finalize fails, we leave status at "grading" and a manual retry
      // is possible via finalizeAttemptManual below.
      try {
        await finalizeAttempt(attempt.id);
      } catch (err) {
        console.error(
          "[IELTS Speaking] finalize after finishSpeaking failed:",
          err
        );
      }

      return { ok: true };
    }),

  /**
   * Returns the final report data + PDF URL for a completed attempt.
   * The client report page uses this. Falls back to "still grading" if
   * the score row doesn't exist yet.
   */
  getReport: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [test] = await db
        .select()
        .from(ieltsMockTests)
        .where(eq(ieltsMockTests.id, attempt.testId))
        .limit(1);

      const [scores] = await db
        .select()
        .from(ieltsMockScores)
        .where(eq(ieltsMockScores.attemptId, attempt.id))
        .limit(1);

      if (!scores) {
        return {
          ready: false as const,
          status: attempt.status,
        };
      }

      const writingResponses = await db
        .select()
        .from(ieltsWritingResponses)
        .where(eq(ieltsWritingResponses.attemptId, attempt.id));
      const writingTasks = await db
        .select()
        .from(ieltsWritingTasks)
        .where(eq(ieltsWritingTasks.testId, attempt.testId));
      const speakingResponses = await db
        .select()
        .from(ieltsSpeakingResponses)
        .where(eq(ieltsSpeakingResponses.attemptId, attempt.id));

      return {
        ready: true as const,
        status: attempt.status,
        test: test ? { code: test.code, title: test.title, testType: test.testType } : null,
        completedAt: attempt.completedAt,
        bands: {
          listening: scores.listeningBand ? Number(scores.listeningBand) : 0,
          listeningRaw: scores.listeningRawScore ?? 0,
          reading: scores.readingBand ? Number(scores.readingBand) : 0,
          readingRaw: scores.readingRawScore ?? 0,
          writing: scores.writingBand ? Number(scores.writingBand) : 0,
          speaking: scores.speakingBand ? Number(scores.speakingBand) : 0,
          overall: scores.overallBand ? Number(scores.overallBand) : 0,
        },
        writing: writingResponses
          .map(r => {
            const task = writingTasks.find(t => t.id === r.taskId);
            return {
              taskNumber: task?.taskNumber ?? 0,
              taskBand: r.taskBand ? Number(r.taskBand) : null,
              scoreTA: r.scoreTA ? Number(r.scoreTA) : null,
              scoreCC: r.scoreCC ? Number(r.scoreCC) : null,
              scoreLR: r.scoreLR ? Number(r.scoreLR) : null,
              scoreGRA: r.scoreGRA ? Number(r.scoreGRA) : null,
              feedback: (r.feedback as any) ?? null,
              wordCount: r.wordCount,
            };
          })
          .sort((a, b) => a.taskNumber - b.taskNumber),
        speaking: speakingResponses
          .map(p => ({
            partNumber: p.partNumber,
            partBand: p.partBand ? Number(p.partBand) : null,
            scoreFC: p.scoreFC ? Number(p.scoreFC) : null,
            scoreLR: p.scoreLR ? Number(p.scoreLR) : null,
            scoreGRA: p.scoreGRA ? Number(p.scoreGRA) : null,
            scoreP: p.scoreP ? Number(p.scoreP) : null,
            feedback: (p.feedback as any) ?? null,
          }))
          .sort((a, b) => a.partNumber - b.partNumber),
        reportPdfUrl: scores.reportPdfKey ? `/files/${scores.reportPdfKey}` : null,
        emailSentAt: scores.reportSentAt,
      };
    }),

  /** Student's purchase history. Useful for "My tests" pages later. */
  myAttempts: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) return { attempts: [] };

    const rows = await db
      .select({
        token: ieltsMockAttempts.attemptToken,
        status: ieltsMockAttempts.status,
        paidAt: ieltsMockAttempts.paidAt,
        completedAt: ieltsMockAttempts.completedAt,
        testCode: ieltsMockTests.code,
        testTitle: ieltsMockTests.title,
        testType: ieltsMockTests.testType,
      })
      .from(ieltsMockAttempts)
      .leftJoin(ieltsMockTests, eq(ieltsMockAttempts.testId, ieltsMockTests.id))
      .where(eq(ieltsMockAttempts.userId, ctx.user.id))
      .orderBy(desc(ieltsMockAttempts.createdAt));

    return { attempts: rows };
  }),
});

// ===========================================================================
// LLM grading helpers
// ===========================================================================

/** Round to nearest half-band (0, 0.5, 1, 1.5, ..., 9). */
function roundToHalfBand(n: number): number {
  const rounded = Math.round(n * 2) / 2;
  return Math.max(0, Math.min(9, rounded));
}

function clampBand(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(9, Math.round(n * 2) / 2));
}

type WritingGradeResult = {
  scoreTA: number;
  scoreCC: number;
  scoreLR: number;
  scoreGRA: number;
  feedback: {
    ta: string;
    cc: string;
    lr: string;
    gra: string;
  };
};

async function gradeWritingTask(args: {
  taskNumber: number;
  taskFormat: "chart" | "letter" | "essay";
  prompt: string;
  minWords: number;
  text: string;
  wordCount: number;
}): Promise<WritingGradeResult> {
  const isTask1 = args.taskNumber === 1;
  const firstCriterion = isTask1 ? "Task Achievement" : "Task Response";

  const system = `You are an experienced IELTS Writing examiner. You grade student responses strictly against the official IELTS public band descriptors for Writing.

You must return JSON ONLY (no prose). Schema:
{
  "scoreTA": number,    // 0.0 - 9.0, half-band steps. ${firstCriterion}.
  "scoreCC": number,    // 0.0 - 9.0, half-band steps. Coherence & Cohesion.
  "scoreLR": number,    // 0.0 - 9.0, half-band steps. Lexical Resource.
  "scoreGRA": number,   // 0.0 - 9.0, half-band steps. Grammatical Range & Accuracy.
  "feedback": {
    "ta":  "1-2 sentences explaining ${firstCriterion} score.",
    "cc":  "1-2 sentences explaining Coherence & Cohesion score.",
    "lr":  "1-2 sentences explaining Lexical Resource score.",
    "gra": "1-2 sentences explaining Grammatical Range & Accuracy score."
  }
}

Grading rules:
- Be accurate, not generous. Most students score between 5.5 and 7.0.
- Penalise under-length responses (under the minimum word count) for ${firstCriterion}: drop the ${firstCriterion} score by at least 1 band.
- Penalise copying from the prompt for Lexical Resource.
- Use the official IELTS band descriptors as your reference. Score in 0.5 increments only.`;

  const taskTypeLabel =
    args.taskFormat === "chart"
      ? "Academic Task 1 (describe a chart/graph/diagram)"
      : args.taskFormat === "letter"
        ? "General Training Task 1 (letter)"
        : "Task 2 (essay)";

  const user = `Task type: ${taskTypeLabel}
Minimum words: ${args.minWords}
Student wrote: ${args.wordCount} words

PROMPT THE STUDENT WAS GIVEN:
"""
${args.prompt}
"""

STUDENT RESPONSE:
"""
${args.text}
"""

Grade against the official IELTS Writing band descriptors. Return JSON only.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const raw = response.choices?.[0]?.message?.content;
  if (typeof raw !== "string") {
    throw new Error("LLM returned no content");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  return {
    scoreTA: clampBand(Number(parsed.scoreTA)),
    scoreCC: clampBand(Number(parsed.scoreCC)),
    scoreLR: clampBand(Number(parsed.scoreLR)),
    scoreGRA: clampBand(Number(parsed.scoreGRA)),
    feedback: {
      ta: typeof parsed.feedback?.ta === "string" ? parsed.feedback.ta : "",
      cc: typeof parsed.feedback?.cc === "string" ? parsed.feedback.cc : "",
      lr: typeof parsed.feedback?.lr === "string" ? parsed.feedback.lr : "",
      gra:
        typeof parsed.feedback?.gra === "string" ? parsed.feedback.gra : "",
    },
  };
}

type SpeakingGradeResult = {
  scoreFC: number;
  scoreLR: number;
  scoreGRA: number;
  scoreP: number;
  feedback: { fc: string; lr: string; gra: string; p: string };
};

async function gradeSpeakingPart(args: {
  partNumber: 1 | 2 | 3;
  transcript: string;
  studentText: string;
}): Promise<SpeakingGradeResult> {
  const system = `You are an experienced IELTS Speaking examiner. You grade the student strictly against the official IELTS Speaking public band descriptors.

Return JSON ONLY (no prose). Schema:
{
  "scoreFC":  number,  // 0.0 - 9.0, half-band steps. Fluency & Coherence.
  "scoreLR":  number,  // 0.0 - 9.0, half-band steps. Lexical Resource.
  "scoreGRA": number,  // 0.0 - 9.0, half-band steps. Grammatical Range & Accuracy.
  "scoreP":   number,  // 0.0 - 9.0, half-band steps. Pronunciation (estimate from transcript fluency, hesitation markers, filler words, sentence rhythm).
  "feedback": {
    "fc":  "1-2 sentences on Fluency & Coherence.",
    "lr":  "1-2 sentences on Lexical Resource.",
    "gra": "1-2 sentences on Grammatical Range & Accuracy.",
    "p":   "1-2 sentences on Pronunciation (caveat: estimated from text only)."
  }
}

Be accurate, not generous. Most candidates score 5.5-7.0. Use 0.5 steps only.
Note: Pronunciation is estimated from transcript characteristics (filler
words, false starts, hesitation markers transcribed as "uh", "um"); the
official IELTS examiner hears audio. Make this caveat clear in feedback.p.`;

  const partLabel =
    args.partNumber === 1
      ? "Part 1 (4-5 min interview about familiar topics)"
      : args.partNumber === 2
        ? "Part 2 (long-turn cue card monologue, 1-2 min)"
        : "Part 3 (4-5 min discussion of abstract questions)";

  const user = `Speaking ${partLabel}

Full conversation transcript for this part:
"""
${args.transcript}
"""

Student response excerpt (concatenated):
"""
${args.studentText}
"""

Grade against the IELTS Speaking band descriptors. Return JSON only.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
  });

  const raw = response.choices?.[0]?.message?.content;
  if (typeof raw !== "string") throw new Error("LLM returned no content");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  return {
    scoreFC: clampBand(Number(parsed.scoreFC)),
    scoreLR: clampBand(Number(parsed.scoreLR)),
    scoreGRA: clampBand(Number(parsed.scoreGRA)),
    scoreP: clampBand(Number(parsed.scoreP)),
    feedback: {
      fc: typeof parsed.feedback?.fc === "string" ? parsed.feedback.fc : "",
      lr: typeof parsed.feedback?.lr === "string" ? parsed.feedback.lr : "",
      gra:
        typeof parsed.feedback?.gra === "string" ? parsed.feedback.gra : "",
      p: typeof parsed.feedback?.p === "string" ? parsed.feedback.p : "",
    },
  };
}
