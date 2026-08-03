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
import { transcribeAudioBuffer } from "./_core/voiceTranscription";
import { storagePut, storageGetBytes } from "./storage";
import { nanoid } from "nanoid";
import { finalizeAttempt } from "./ieltsFinalize";
import { isAnswerCorrect } from "./ieltsGrading";
import { ieltsMockScores } from "../drizzle/schema";
import {
  IELTS_MOCK_PRICE,
  createIeltsMockInvoice,
} from "./ieltsMockService";
import { createIeltsBundleCheckout } from "./bundleService";
import { BUNDLE_PLANS, VOICE_CLONE_PRICE_IDR, voiceCloneExternalId, createVoiceCloneInvoice } from "./xenditService";
import { validateGuestCheckout, extractClientIp } from "./antiAbuse";
import { ENV } from "./_core/env";

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
        .select({ testType: ieltsMockTests.testType })
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
      // Public flow is paid-only. Free access is admin-issued.
      academicFree: false,
      generalFree: false,
    };
  }),

  /**
   * Start a checkout. Reserves an attempt row, creates a Xendit invoice,
   * returns the hosted invoice URL the client should redirect to.
   */
  startCheckout: publicProcedure
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
      try {
        // Anti-abuse: block role-based emails (info@, admin@, e-shop@…),
        // gibberish names (bot-generated random strings), and per-IP rate
        // limit. Runs BEFORE Xendit / email so bots can't burn our quota.
        const ip = extractClientIp((ctx as any).req?.headers || {});
        const abuse = validateGuestCheckout({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          ip,
        });
        if (abuse) throw new TRPCError({ code: abuse.code, message: abuse.message });

        // Read the marketing attribution cookie so we can stamp GCLID + UTMs
        // onto the new attempt row. The Xendit webhook later reads these on
        // payment and uploads an offline conversion to Google Ads — critical
        // because browser-side gtag misses students who don't return to the
        // /success page (mobile banking flow, adblockers, etc.).
        const { parseAttribution } = await import("./attribution");
        const attribution = parseAttribution(ctx);

        // GUEST checkout: no account required. The buyer fills name/email on
        // the form; we email them a payment link, then (on payment) the secret
        // take-test link. createIeltsMockInvoice resolves/creates the owning
        // user from the form email. If an admin happens to be logged in, attach
        // to their account instead. (Free access is admin-only.)
        const invoice = await createIeltsMockInvoice({
          userId: ctx.user?.id,
          testType: input.testType,
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail.trim(),
          customerPhone: input.customerPhone?.trim() || undefined,
          attribution,
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
   * Bundle price snapshot — returned to the client so the landing page can
   * render current pricing + savings dynamically without hardcoding.
   */
  bundleCatalog: publicProcedure.query(() => {
    return {
      plan: "mock_tutor_m1" as const,
      priceIdr: BUNDLE_PLANS.mock_tutor_m1.amount,
      tutorDays: BUNDLE_PLANS.mock_tutor_m1.tutorDays,
      includesVoiceClone: BUNDLE_PLANS.mock_tutor_m1.includesVoiceClone,
      label: BUNDLE_PLANS.mock_tutor_m1.label,
      standaloneTotalIdr: 79000 + 249000 + 49000, // Mock + Tutor 30d + Voice Clone
    };
  }),

  /**
   * Start a BUNDLE checkout: creates ONE Xendit invoice for Rp 299k that
   * on payment activates BOTH a Mock Test attempt AND a 30-day Tutor
   * subscription. Same anti-abuse + attribution as the standalone Mock
   * checkout. Guest-friendly (no login required).
   */
  startBundleCheckout: publicProcedure
    .input(z.object({
      testType: z.enum(["academic", "general"]),
      plan: z.enum(["mock_tutor_m1"]).default("mock_tutor_m1"),
      customerName: z.string().min(1).max(120),
      customerEmail: z.string().refine(v => EMAIL_RE.test(v), { message: "Invalid email" }),
      customerPhone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const ip = extractClientIp((ctx as any).req?.headers || {});
        const abuse = validateGuestCheckout({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          ip,
        });
        if (abuse) throw new TRPCError({ code: abuse.code, message: abuse.message });

        const { parseAttribution } = await import("./attribution");
        const attribution = parseAttribution(ctx);

        const result = await createIeltsBundleCheckout({
          userId: ctx.user?.id,
          testType: input.testType,
          plan: input.plan,
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail.trim(),
          customerPhone: input.customerPhone?.trim() || undefined,
          attribution,
        });
        return {
          bundle: true as const,
          invoiceUrl: result.invoiceUrl,
          attemptToken: result.attemptToken,
          externalId: result.externalId,
        };
      } catch (err) {
        console.error("[IELTS] startBundleCheckout failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Bundle checkout failed",
        });
      }
    }),

  /**
   * Redeem an admin-issued free-access link. The token is a signed JWT
   * (purpose "ielts-free-pass") with a testType + expiry. Creates a free
   * attempt for the logged-in user against the first published test of that
   * type. Reusable until expiry — each user gets their own attempt.
   */
  redeemFreePass: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { jwtVerify } = await import("jose");
      const { ENV } = await import("./_core/env");
      let payload: any;
      try {
        const res = await jwtVerify(
          input.token,
          new TextEncoder().encode(ENV.cookieSecret)
        );
        payload = res.payload;
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This free-access link is invalid or has expired.",
        });
      }
      if (payload?.purpose !== "ielts-free-pass") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid link." });
      }
      const testType = payload.testType === "general" ? "general" : "academic";

      const [test] = await db
        .select({ id: ieltsMockTests.id })
        .from(ieltsMockTests)
        .where(
          and(
            eq(ieltsMockTests.isPublished, true),
            eq(ieltsMockTests.testType, testType)
          )
        )
        .limit(1);
      if (!test) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No published test is available for this link yet.",
        });
      }

      const attemptToken = nanoid(24);
      await db.insert(ieltsMockAttempts).values({
        userId: ctx.user.id,
        testId: test.id,
        attemptToken,
        paymentRef: `FREE-LINK-${nanoid(8)}`,
        paidAt: new Date(),
        status: "ready",
      });
      return { attemptToken };
    }),

  /**
   * Look up an attempt by its token. Returns minimal info — used on the
   * post-payment landing page to confirm the attempt is unlocked.
   */
  getAttempt: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });


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
  getListeningContent: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
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
  startSkill: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        skill: z.enum(["listening", "reading", "writing", "speaking"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
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
  saveListeningAnswers: publicProcedure
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
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
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
          questionType: ieltsListeningQuestions.questionType,
          correctAnswers: ieltsListeningQuestions.correctAnswers,
        })
        .from(ieltsListeningQuestions)
        .where(inArray(ieltsListeningQuestions.id, ids));
      const qMap = new Map(
        qs.map(q => [
          q.id,
          { type: q.questionType, correct: q.correctAnswers as string[] },
        ])
      );

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
        const q = qMap.get(a.questionId);
        const isCorrect = isAnswerCorrect(
          a.answer,
          q?.correct ?? [],
          q?.type ?? ""
        );
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
  finishListening: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

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
  getReadingContent: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
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
  saveReadingAnswers: publicProcedure
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
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
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
          questionType: ieltsReadingQuestions.questionType,
          correctAnswers: ieltsReadingQuestions.correctAnswers,
        })
        .from(ieltsReadingQuestions)
        .where(inArray(ieltsReadingQuestions.id, ids));
      const qMap = new Map(
        qs.map(q => [
          q.id,
          { type: q.questionType, correct: q.correctAnswers as string[] },
        ])
      );

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
        const q = qMap.get(a.questionId);
        const isCorrect = isAnswerCorrect(
          a.answer,
          q?.correct ?? [],
          q?.type ?? ""
        );
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
  finishReading: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(ieltsMockAttempts)
        .set({ status: "writing" })
        .where(eq(ieltsMockAttempts.id, attempt.id));

      return { ok: true };
    }),

  // -------------------- WRITING --------------------

  /** Returns the 2 writing tasks for an attempt + any saved drafts. */
  getWritingContent: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
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
  saveWritingDraft: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        taskId: z.number().int(),
        text: z.string().max(20000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
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
  finishWriting: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

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
  getSpeakingState: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

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
  nextExaminerTurn: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

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
  submitStudentTurn: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        partNumber: z.number().int().min(1).max(3),
        base64: z.string().min(1),
        contentType: z.string().default("audio/webm"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

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
        // Transcribe directly from the in-memory buffer rather than
        // re-downloading from the R2 public URL (that extra hop can fail or
        // lag, which previously caused empty transcripts → ungraded Speaking).
        const result = await transcribeAudioBuffer({
          buffer,
          mimeType: input.contentType,
          language: "en",
        });
        if ("error" in result) {
          console.warn(
            "[IELTS Speaking] Whisper failed:",
            result.error,
            result.details,
            `(part ${input.partNumber}, ${buffer.length} bytes)`
          );
        } else {
          transcript = result.text ?? "";
          console.log(
            `[IELTS Speaking] transcribed part ${input.partNumber}: ` +
              `${transcript.length} chars from ${buffer.length} bytes`
          );
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
  finishSpeaking: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

      await regradeSpeakingForAttempt(attempt.id, { reTranscribe: true });

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
  getReport: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

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

  /**
   * Per-question Listening review for a completed attempt: the student's
   * submitted answer alongside the correct answer(s) and whether it was
   * marked correct. Ordered by section + question number. Used on the
   * report page so students can see exactly where they went wrong.
   */
  listeningReview: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Answer key + the student's answers are ADMIN-ONLY — students never get
      // to see correct answers or their own answers, only their band result.
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

      const sections = await db
        .select()
        .from(ieltsListeningSections)
        .where(eq(ieltsListeningSections.testId, attempt.testId))
        .orderBy(ieltsListeningSections.sectionNumber);

      const answers = await db
        .select()
        .from(ieltsListeningAnswers)
        .where(eq(ieltsListeningAnswers.attemptId, attempt.id));
      const answerByQ = new Map(answers.map(a => [a.questionId, a]));

      const result = [];
      for (const s of sections) {
        const questions = await db
          .select()
          .from(ieltsListeningQuestions)
          .where(eq(ieltsListeningQuestions.sectionId, s.id))
          .orderBy(ieltsListeningQuestions.questionNumber);
        result.push({
          sectionNumber: s.sectionNumber,
          questions: questions.map(q => {
            const a = answerByQ.get(q.id);
            const correct = (q.correctAnswers ?? []) as string[];
            return {
              questionNumber: q.questionNumber,
              prompt: q.prompt,
              yourAnswer: a?.studentAnswer ?? "",
              correctAnswers: correct,
              // isCorrect is the authoritative grade persisted by
              // finalizeAttempt (deterministic + context-aware LLM pass).
              isCorrect: a?.isCorrect ?? false,
            };
          }),
        });
      }

      return result;
    }),

  /**
   * VOICE CLONE — start checkout (Rp 49k or free if bundle buyer).
   * Creates a Xendit invoice and reserves a pending voice_clone_sessions row.
   * On paid webhook, the row status advances to processing → ready.
   */
  startVoiceCloneCheckout: publicProcedure
    .input(z.object({
      attemptToken: z.string().min(1),
      customerName: z.string().min(1).max(120),
      customerEmail: z.string().refine(v => EMAIL_RE.test(v), { message: "Invalid email" }),
      customerPhone: z.string().optional(),
      consentGiven: z.literal(true, { message: "You must consent to voice cloning" }),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Anti-abuse guard
      const ip = extractClientIp((ctx as any).req?.headers || {});
      const abuse = validateGuestCheckout({
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        ip,
      });
      if (abuse) throw new TRPCError({ code: abuse.code, message: abuse.message });

      // Find the attempt this Voice Clone will be built from
      const [attempt] = await db.select().from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.attemptToken)).limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND", message: "Test attempt not found" });
      if ((attempt as any).status !== "completed") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Voice Clone is available only after you complete the Mock Test." });
      }

      // Idempotency: check for existing session
      const { sql } = await import("drizzle-orm");
      const existingRows: any = await db.execute(sql`
        SELECT * FROM voice_clone_sessions
        WHERE attemptId = ${(attempt as any).id}
          AND status IN ('pending','processing','ready')
        LIMIT 1
      `);
      const existingList = Array.isArray(existingRows[0]) ? existingRows[0] : existingRows;
      const existing = existingList[0];
      if (existing) {
        if (existing.status === "ready") {
          return { alreadyReady: true as const, sessionId: existing.id, invoiceUrl: null };
        }
        if (existing.status === "pending" && existing.xenditInvoiceUrl) {
          return { alreadyReady: false as const, sessionId: existing.id, invoiceUrl: existing.xenditInvoiceUrl };
        }
      }

      // Bundle-free path: this attempt was purchased as part of the Rp 299k
      // bundle. Skip Xendit, start processing immediately.
      const isBundleFree = !!(attempt as any).bundleIncludesVoiceClone && !(attempt as any).bundleVoiceCloneRedeemedAt;

      if (isBundleFree) {
        const insertRes: any = await db.execute(sql`
          INSERT INTO voice_clone_sessions (attemptId, customerEmail, customerName, amountIdr, isBundleFree, status, paidAt)
          VALUES (${(attempt as any).id}, ${input.customerEmail.trim()}, ${input.customerName.trim()}, 0, TRUE, 'processing', NOW())
        `);
        const sessionId = Number(insertRes[0]?.insertId || 0);
        await db.execute(sql`UPDATE ieltsMockAttempts SET bundleVoiceCloneRedeemedAt = NOW() WHERE id = ${(attempt as any).id}`);
        // Kick off processing async (fire-and-forget)
        void (async () => {
          try {
            const { runVoiceCloneForAttempt } = await import("./voiceCloneService");
            const result = await runVoiceCloneForAttempt((attempt as any).id);
            await db.execute(sql`
              UPDATE voice_clone_sessions SET
                status = 'ready',
                processedAt = NOW(),
                elevenLabsVoiceId = ${result.voiceId},
                targetedPartNumber = ${result.targetedPartNumber},
                originalTranscript = ${result.originalTranscript},
                originalAudioKey = ${result.originalAudioKey || null},
                band8Transcript = ${result.band8Transcript},
                band8AudioKey = ${result.band8AudioKey},
                changesSummary = ${result.changesSummary}
              WHERE id = ${sessionId}
            `);
            console.log(`[VoiceClone] Session ${sessionId} READY (bundle-free)`);
          } catch (e) {
            await db.execute(sql`
              UPDATE voice_clone_sessions SET status = 'failed', errorMessage = ${(e as Error).message} WHERE id = ${sessionId}
            `);
            console.error(`[VoiceClone] Session ${sessionId} FAILED:`, e);
          }
        })();
        return { alreadyReady: false as const, bundleFree: true as const, sessionId, invoiceUrl: null };
      }

      // Paid path: create Xendit invoice + reserve pending session
      const externalId = voiceCloneExternalId();
      const baseUrl = (ENV.appUrl || "https://www.spectaeducation.com").replace(/\/+$/, "");
      const successUrl = `${baseUrl}/ielts/mock-test/report/${input.attemptToken}?voice_clone=1`;
      const failureUrl = `${baseUrl}/ielts/mock-test/report/${input.attemptToken}?voice_clone_failed=1`;

      const invoice = await createVoiceCloneInvoice({
        externalId,
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.trim(),
        customerPhone: input.customerPhone?.trim(),
        successRedirectUrl: successUrl,
        failureRedirectUrl: failureUrl,
      });

      const insertRes: any = await db.execute(sql`
        INSERT INTO voice_clone_sessions (attemptId, customerEmail, customerName, xenditExternalId, xenditInvoiceUrl, amountIdr, isBundleFree, status)
        VALUES (${(attempt as any).id}, ${input.customerEmail.trim()}, ${input.customerName.trim()}, ${externalId}, ${invoice.invoice_url}, ${VOICE_CLONE_PRICE_IDR}, FALSE, 'pending')
      `);
      const sessionId = Number(insertRes[0]?.insertId || 0);
      return { alreadyReady: false as const, bundleFree: false as const, sessionId, invoiceUrl: invoice.invoice_url };
    }),

  /**
   * Poll the Voice Clone session status. Used by the report page after
   * user returns from Xendit checkout. Returns { status, result } —
   * frontend polls every 3-5s while status is processing.
   */
  getVoiceCloneSession: publicProcedure
    .input(z.object({ attemptToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [attempt] = await db.select().from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.attemptToken)).limit(1);
      if (!attempt) return null;
      const { sql } = await import("drizzle-orm");
      const rows: any = await db.execute(sql`
        SELECT * FROM voice_clone_sessions WHERE attemptId = ${(attempt as any).id}
        ORDER BY createdAt DESC LIMIT 1
      `);
      const list = Array.isArray(rows[0]) ? rows[0] : rows;
      const session = list[0];
      if (!session) return null;
      // Build public audio URLs for the R2-stored files via signed GET URLs
      const { storageGet } = await import("./storage");
      const originalAudioUrl = session.originalAudioKey ? (await storageGet(session.originalAudioKey)).url : null;
      const band8AudioUrl = session.band8AudioKey ? (await storageGet(session.band8AudioKey)).url : null;
      return {
        id: session.id,
        status: session.status as "pending" | "processing" | "ready" | "failed",
        isBundleFree: !!session.isBundleFree,
        targetedPartNumber: session.targetedPartNumber,
        originalTranscript: session.originalTranscript,
        band8Transcript: session.band8Transcript,
        changesSummary: session.changesSummary,
        originalAudioUrl,
        band8AudioUrl,
        errorMessage: session.errorMessage,
      };
    }),

  // ── STANDALONE VOICE CLONE — anyone can buy without Mock Test ──────────

  /**
   * Create a Xendit invoice for a standalone Voice Clone session. On paid,
   * user is redirected to /voice-clone/record/[sessionToken] to record 3
   * IELTS Speaking questions, then processing runs.
   */
  createStandaloneVoiceCloneCheckout: publicProcedure
    .input(z.object({
      customerName: z.string().min(1).max(120),
      customerEmail: z.string().refine(v => EMAIL_RE.test(v), { message: "Invalid email" }),
      customerPhone: z.string().optional(),
      consentGiven: z.literal(true, { message: "You must consent to voice cloning" }),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const ip = extractClientIp((ctx as any).req?.headers || {});
      const abuse = validateGuestCheckout({
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        ip,
      });
      if (abuse) throw new TRPCError({ code: abuse.code, message: abuse.message });

      const { sql } = await import("drizzle-orm");
      const { nanoid } = await import("nanoid");
      const sessionToken = nanoid(24);
      const externalId = voiceCloneExternalId();
      const baseUrl = (ENV.appUrl || "https://www.spectaeducation.com").replace(/\/+$/, "");
      const successUrl = `${baseUrl}/voice-clone/record/${sessionToken}?paid=1`;
      const failureUrl = `${baseUrl}/voice-clone?paid=0`;

      // Create the pending session FIRST — so failed Xendit call doesn't leave orphans
      const insertRes: any = await db.execute(sql`
        INSERT INTO voice_clone_sessions (
          mode, sessionToken, customerEmail, customerName, xenditExternalId,
          amountIdr, isBundleFree, status
        ) VALUES (
          'standalone', ${sessionToken}, ${input.customerEmail.trim()}, ${input.customerName.trim()},
          ${externalId}, ${VOICE_CLONE_PRICE_IDR}, FALSE, 'pending'
        )
      `);
      const sessionId = Number(insertRes[0]?.insertId || 0);
      if (!sessionId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create session" });

      const invoice = await createVoiceCloneInvoice({
        externalId,
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.trim(),
        customerPhone: input.customerPhone?.trim(),
        successRedirectUrl: successUrl,
        failureRedirectUrl: failureUrl,
      });
      await db.execute(sql`
        UPDATE voice_clone_sessions SET xenditInvoiceUrl = ${invoice.invoice_url} WHERE id = ${sessionId}
      `);

      return { sessionId, sessionToken, invoiceUrl: invoice.invoice_url };
    }),

  /**
   * Get the standalone recording session by token. Returns the 3 questions
   * to record + any recordings already uploaded. Only returns the questions
   * once payment is confirmed (session.paidAt IS NOT NULL) OR the session
   * is bundle-free.
   */
  getStandaloneRecordingSession: publicProcedure
    .input(z.object({ sessionToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { sql } = await import("drizzle-orm");
      const sessionRows: any = await db.execute(sql`
        SELECT * FROM voice_clone_sessions WHERE sessionToken = ${input.sessionToken} LIMIT 1
      `);
      const sessionList = Array.isArray(sessionRows[0]) ? sessionRows[0] : sessionRows;
      const session = sessionList[0];
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });

      const isPaid = !!session.paidAt || !!session.isBundleFree;

      // If not paid yet, return only status (user needs to complete Xendit first)
      if (!isPaid) {
        return {
          sessionId: session.id,
          status: "awaiting_payment" as const,
          isPaid: false as const,
          xenditInvoiceUrl: session.xenditInvoiceUrl,
        };
      }

      // Load existing recordings
      const recordingRows: any = await db.execute(sql`
        SELECT id, questionIndex, partNumber, questionText, audioKey, transcript, durationSec, uploadedAt
        FROM voice_clone_recordings WHERE sessionId = ${session.id} ORDER BY questionIndex ASC
      `);
      const existingRecordings: any[] = Array.isArray(recordingRows[0]) ? recordingRows[0] : recordingRows;

      // If no recordings yet, pick 3 questions and pre-create the rows
      if (existingRecordings.length === 0) {
        const { pickStandaloneQuestions } = await import("./voiceCloneQuestions");
        const questions = await pickStandaloneQuestions();
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await db.execute(sql`
            INSERT INTO voice_clone_recordings (sessionId, questionIndex, partNumber, questionText)
            VALUES (${session.id}, ${i}, ${q.partNumber}, ${q.questionText})
          `);
        }
        const freshRows: any = await db.execute(sql`
          SELECT id, questionIndex, partNumber, questionText, audioKey, transcript, durationSec, uploadedAt
          FROM voice_clone_recordings WHERE sessionId = ${session.id} ORDER BY questionIndex ASC
        `);
        existingRecordings.push(...(Array.isArray(freshRows[0]) ? freshRows[0] : freshRows));
      }

      return {
        sessionId: session.id,
        status: session.status as "pending" | "processing" | "ready" | "failed",
        isPaid: true as const,
        recordings: existingRecordings.map(r => ({
          questionIndex: r.questionIndex,
          partNumber: r.partNumber,
          questionText: r.questionText,
          isUploaded: !!r.audioKey && !!r.uploadedAt,
          durationSec: r.durationSec,
        })),
      };
    }),

  /**
   * Upload one recording for a standalone Voice Clone session. Audio is
   * base64-encoded from the browser MediaRecorder blob.
   */
  uploadStandaloneRecording: publicProcedure
    .input(z.object({
      sessionToken: z.string().min(1),
      questionIndex: z.number().int().min(0).max(2),
      audioBase64: z.string().min(100),
      mimeType: z.string().default("audio/webm"),
      durationSec: z.number().int().min(3).max(180),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { sql } = await import("drizzle-orm");
      const sessionRows: any = await db.execute(sql`
        SELECT id, paidAt, isBundleFree FROM voice_clone_sessions
        WHERE sessionToken = ${input.sessionToken} LIMIT 1
      `);
      const sessionList = Array.isArray(sessionRows[0]) ? sessionRows[0] : sessionRows;
      const session = sessionList[0];
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (!session.paidAt && !session.isBundleFree) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment not confirmed" });
      }

      // Decode and upload to R2
      const buffer = Buffer.from(input.audioBase64, "base64");
      if (buffer.length < 1000) throw new TRPCError({ code: "BAD_REQUEST", message: "Audio too small" });
      const ext = input.mimeType.includes("mp4") ? "mp4" : "webm";
      const audioKey = `voice-clone/standalone-${session.id}/rec-${input.questionIndex}-${Date.now()}.${ext}`;
      const { storagePut } = await import("./storage");
      await storagePut(audioKey, buffer, input.mimeType);

      // Persist to the recording row (upsert on session+questionIndex)
      await db.execute(sql`
        UPDATE voice_clone_recordings
        SET audioKey = ${audioKey}, durationSec = ${input.durationSec}, uploadedAt = NOW()
        WHERE sessionId = ${session.id} AND questionIndex = ${input.questionIndex}
      `);

      return { uploaded: true as const, audioKey };
    }),

  /**
   * Finalize a standalone Voice Clone session — trigger the background
   * processing pipeline (clone voice, rewrite at Band 8, generate TTS).
   * Called after all 3 recordings uploaded. Returns immediately;
   * user polls getVoiceCloneSessionByToken for status.
   */
  finalizeStandaloneRecordings: publicProcedure
    .input(z.object({ sessionToken: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { sql } = await import("drizzle-orm");
      const sessionRows: any = await db.execute(sql`
        SELECT * FROM voice_clone_sessions WHERE sessionToken = ${input.sessionToken} LIMIT 1
      `);
      const sessionList = Array.isArray(sessionRows[0]) ? sessionRows[0] : sessionRows;
      const session = sessionList[0];
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (session.status === "ready") return { alreadyReady: true as const, sessionId: session.id };
      if (session.status === "processing") return { alreadyReady: false as const, sessionId: session.id };

      // Check enough recordings uploaded
      const uploadedRows: any = await db.execute(sql`
        SELECT COUNT(*) AS n FROM voice_clone_recordings
        WHERE sessionId = ${session.id} AND audioKey IS NOT NULL
      `);
      const uploadedList = Array.isArray(uploadedRows[0]) ? uploadedRows[0] : uploadedRows;
      const uploadedCount = Number(uploadedList[0]?.n || 0);
      if (uploadedCount < 2) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Only ${uploadedCount}/3 recordings uploaded — record all before finalizing` });
      }

      // Mark processing + kick off background job
      await db.execute(sql`UPDATE voice_clone_sessions SET status = 'processing' WHERE id = ${session.id}`);
      const sessionId = session.id;
      void (async () => {
        try {
          const { runVoiceCloneStandalone } = await import("./voiceCloneService");
          const result = await runVoiceCloneStandalone(sessionId);
          await db.execute(sql`
            UPDATE voice_clone_sessions SET
              status = 'ready',
              processedAt = NOW(),
              elevenLabsVoiceId = ${result.voiceId},
              targetedPartNumber = ${result.targetedPartNumber},
              originalTranscript = ${result.originalTranscript},
              originalAudioKey = ${result.originalAudioKey || null},
              band8Transcript = ${result.band8Transcript},
              band8AudioKey = ${result.band8AudioKey},
              changesSummary = ${result.changesSummary}
            WHERE id = ${sessionId}
          `);
          console.log(`[VoiceClone] Standalone session ${sessionId} READY`);
        } catch (e) {
          await db.execute(sql`
            UPDATE voice_clone_sessions SET status = 'failed', errorMessage = ${(e as Error).message}
            WHERE id = ${sessionId}
          `);
          console.error(`[VoiceClone] Standalone session ${sessionId} FAILED:`, e);
        }
      })();
      return { alreadyReady: false as const, sessionId };
    }),

  /**
   * Poll session status by token — used by the record page after upload
   * and the result page for playback.
   */
  getVoiceCloneSessionByToken: publicProcedure
    .input(z.object({ sessionToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { sql } = await import("drizzle-orm");
      const sessionRows: any = await db.execute(sql`
        SELECT * FROM voice_clone_sessions WHERE sessionToken = ${input.sessionToken} LIMIT 1
      `);
      const sessionList = Array.isArray(sessionRows[0]) ? sessionRows[0] : sessionRows;
      const session = sessionList[0];
      if (!session) return null;
      const { storageGet } = await import("./storage");
      const originalAudioUrl = session.originalAudioKey ? (await storageGet(session.originalAudioKey)).url : null;
      const band8AudioUrl = session.band8AudioKey ? (await storageGet(session.band8AudioKey)).url : null;
      return {
        id: session.id,
        status: session.status as "pending" | "processing" | "ready" | "failed",
        isPaid: !!session.paidAt || !!session.isBundleFree,
        isBundleFree: !!session.isBundleFree,
        customerName: session.customerName,
        targetedPartNumber: session.targetedPartNumber,
        originalTranscript: session.originalTranscript,
        band8Transcript: session.band8Transcript,
        changesSummary: session.changesSummary,
        originalAudioUrl,
        band8AudioUrl,
        errorMessage: session.errorMessage,
      };
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

/**
 * Grade (or re-grade) all Speaking parts for an attempt. Idempotent: it
 * deletes any existing speaking-score rows first, then re-grades.
 *
 * When `reTranscribe` is true, any student turn that has audio stored but no
 * (or blank) transcript is re-transcribed by reading the audio bytes straight
 * from R2 via the S3 API — this recovers attempts whose original
 * transcription failed because it tried to re-download from the public URL.
 */
export async function regradeSpeakingForAttempt(
  attemptId: number,
  opts: { reTranscribe?: boolean } = {}
): Promise<{ gradedParts: number; reTranscribed: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  let conversation = await db
    .select()
    .from(ieltsSpeakingConversations)
    .where(eq(ieltsSpeakingConversations.attemptId, attemptId))
    .orderBy(ieltsSpeakingConversations.turnOrder);

  // Re-transcribe student turns that have audio but empty text.
  let reTranscribed = 0;
  if (opts.reTranscribe) {
    for (const turn of conversation) {
      if (
        turn.role === "student" &&
        turn.audioKey &&
        (!turn.text || !turn.text.trim())
      ) {
        try {
          const { buffer, contentType } = await storageGetBytes(turn.audioKey);
          const result = await transcribeAudioBuffer({
            buffer,
            mimeType: contentType,
            language: "en",
          });
          if (!("error" in result) && result.text && result.text.trim()) {
            await db
              .update(ieltsSpeakingConversations)
              .set({ text: result.text })
              .where(eq(ieltsSpeakingConversations.id, turn.id));
            turn.text = result.text;
            reTranscribed++;
          } else if ("error" in result) {
            console.warn(
              `[IELTS Speaking re-transcribe] turn ${turn.id} failed:`,
              result.error,
              result.details
            );
          }
        } catch (err) {
          console.error(
            `[IELTS Speaking re-transcribe] turn ${turn.id} error:`,
            err
          );
        }
      }
    }
  }

  // Clear existing scores so this is safe to re-run.
  await db
    .delete(ieltsSpeakingResponses)
    .where(eq(ieltsSpeakingResponses.attemptId, attemptId));

  let gradedParts = 0;
  for (const partNumber of [1, 2, 3] as const) {
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
        (grading.scoreFC + grading.scoreLR + grading.scoreGRA + grading.scoreP) /
          4
      );
      await db.insert(ieltsSpeakingResponses).values({
        attemptId,
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
      gradedParts++;
    } catch (err) {
      console.error(`[IELTS Speaking grade] part ${partNumber} failed:`, err);
    }
  }

  return { gradedParts, reTranscribed };
}

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
