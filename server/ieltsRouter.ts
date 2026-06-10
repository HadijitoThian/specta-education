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
} from "../drizzle/schema";
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
    let academicCount = 0;
    let generalCount = 0;
    if (db) {
      const rows = await db
        .select({
          testType: ieltsMockTests.testType,
        })
        .from(ieltsMockTests)
        .where(eq(ieltsMockTests.isPublished, true));
      for (const r of rows) {
        if (r.testType === "academic") academicCount++;
        else if (r.testType === "general") generalCount++;
      }
    }
    return {
      priceIdr: IELTS_MOCK_PRICE,
      academicTests: academicCount,
      generalTests: generalCount,
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
        const invoice = await createIeltsMockInvoice({
          userId: ctx.user.id,
          testType: input.testType,
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail.trim(),
          customerPhone: input.customerPhone?.trim() || undefined,
        });
        return {
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
   * Future P1g will read this status to allow Reading to start.
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
