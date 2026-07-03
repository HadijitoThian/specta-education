/**
 * IELTS Mock Test — admin tRPC routes.
 *
 * Mounted under `admin.ielts` in the main app router. All procedures
 * require role === "admin".
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, desc, sql } from "drizzle-orm";

import {
  ieltsMockTests,
  ieltsListeningSections,
  ieltsListeningQuestions,
  ieltsReadingPassages,
  ieltsReadingQuestions,
  ieltsWritingTasks,
  ieltsSpeakingPrompts,
} from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { protectedProcedure, router } from "./_core/trpc";

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------
function assertAdmin(ctx: { user: { role: string } | null }) {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
}

// In-memory status of the most recent (re)generation per test code, so the
// admin UI can show live progress / failure for the fire-and-forget job.
type GenStatus = {
  state: "running" | "done" | "failed";
  message: string;
  at: number;
};
const generationStatus = new Map<string, GenStatus>();

// ---------------------------------------------------------------------------
// Zod schemas for "import a full test from JSON"
// ---------------------------------------------------------------------------
const ListeningQuestionSchema = z.object({
  questionNumber: z.number().int().min(1).max(40),
  questionType: z.enum([
    "mcq", "multi_select", "matching", "map_labelling",
    "form_completion", "note_completion", "sentence_completion",
    "summary_completion", "short_answer",
  ]),
  prompt: z.string().min(1),
  options: z.array(z.string()).nullable().optional(),
  correctAnswers: z.array(z.string()).min(1),
  maxScore: z.number().int().min(1).default(1).optional(),
});

const ListeningSectionSchema = z.object({
  sectionNumber: z.number().int().min(1).max(4),
  transcript: z.string().optional().nullable(),
  durationSec: z.number().int().positive().optional().nullable(),
  questions: z.array(ListeningQuestionSchema),
});

const ReadingQuestionSchema = z.object({
  questionNumber: z.number().int().min(1).max(40),
  questionType: z.enum([
    "tfng", "ynng", "mcq", "matching_headings", "matching_information",
    "matching_features", "matching_sentence_endings",
    "sentence_completion", "summary_completion", "note_completion",
    "table_completion", "flowchart_completion", "diagram_labelling",
    "short_answer",
  ]),
  prompt: z.string().min(1),
  options: z.array(z.string()).nullable().optional(),
  correctAnswers: z.array(z.string()).min(1),
  maxScore: z.number().int().min(1).default(1).optional(),
});

const ReadingPassageSchema = z.object({
  passageNumber: z.number().int().min(1).max(3),
  title: z.string().min(1),
  body: z.string().min(1),
  wordCount: z.number().int().optional().nullable(),
  questions: z.array(ReadingQuestionSchema),
});

const WritingTaskSchema = z.object({
  taskNumber: z.number().int().min(1).max(2),
  taskFormat: z.enum(["chart", "letter", "essay"]),
  prompt: z.string().min(1),
  minWords: z.number().int().positive(),
  timeLimitSec: z.number().int().positive(),
});

const SpeakingPromptSchema = z.object({
  promptOrder: z.number().int().min(1),
  prompt: z.string().min(1),
  cueCardText: z.string().optional().nullable(),
  followUpHint: z.string().optional().nullable(),
});

const SpeakingPartSchema = z.object({
  partNumber: z.number().int().min(1).max(3),
  prompts: z.array(SpeakingPromptSchema),
});

const FullTestSchema = z.object({
  code: z.string().min(1).max(32),
  title: z.string().min(1).max(200),
  testType: z.enum(["academic", "general"]),
  notes: z.string().optional().nullable(),
  listening: z.array(ListeningSectionSchema).length(4),
  reading: z.array(ReadingPassageSchema).length(3),
  writing: z.array(WritingTaskSchema).length(2),
  speaking: z.array(SpeakingPartSchema).length(3),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export const ieltsAdminRouter = router({
  /** List all tests (admin overview). */
  list: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    const db = await getDb();
    if (!db) return { tests: [] };
    const tests = await db
      .select()
      .from(ieltsMockTests)
      .orderBy(desc(ieltsMockTests.createdAt));
    return { tests };
  }),

  /** Get one test fully populated (all sections / passages / questions). */
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [test] = await db
        .select()
        .from(ieltsMockTests)
        .where(eq(ieltsMockTests.id, input.id))
        .limit(1);
      if (!test) throw new TRPCError({ code: "NOT_FOUND" });

      const listening = await db
        .select()
        .from(ieltsListeningSections)
        .where(eq(ieltsListeningSections.testId, input.id))
        .orderBy(ieltsListeningSections.sectionNumber);

      const reading = await db
        .select()
        .from(ieltsReadingPassages)
        .where(eq(ieltsReadingPassages.testId, input.id))
        .orderBy(ieltsReadingPassages.passageNumber);

      const writing = await db
        .select()
        .from(ieltsWritingTasks)
        .where(eq(ieltsWritingTasks.testId, input.id))
        .orderBy(ieltsWritingTasks.taskNumber);

      const speaking = await db
        .select()
        .from(ieltsSpeakingPrompts)
        .where(eq(ieltsSpeakingPrompts.testId, input.id))
        .orderBy(ieltsSpeakingPrompts.partNumber, ieltsSpeakingPrompts.promptOrder);

      return { test, listening, reading, writing, speaking };
    }),

  /**
   * Returns the full answer key (correct answers) for a test's Listening and
   * Reading sections, ordered by question number. Used by the admin
   * "Answer key" view so staff can mark / sanity-check the test.
   */
  answerKey: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [test] = await db
        .select()
        .from(ieltsMockTests)
        .where(eq(ieltsMockTests.id, input.id))
        .limit(1);
      if (!test) throw new TRPCError({ code: "NOT_FOUND" });

      const sections = await db
        .select()
        .from(ieltsListeningSections)
        .where(eq(ieltsListeningSections.testId, input.id))
        .orderBy(ieltsListeningSections.sectionNumber);

      const listening = [];
      for (const s of sections) {
        const questions = await db
          .select()
          .from(ieltsListeningQuestions)
          .where(eq(ieltsListeningQuestions.sectionId, s.id))
          .orderBy(ieltsListeningQuestions.questionNumber);
        listening.push({
          sectionNumber: s.sectionNumber,
          questions: questions.map(q => ({
            questionNumber: q.questionNumber,
            questionType: q.questionType,
            prompt: q.prompt,
            correctAnswers: (q.correctAnswers ?? []) as string[],
          })),
        });
      }

      const passages = await db
        .select()
        .from(ieltsReadingPassages)
        .where(eq(ieltsReadingPassages.testId, input.id))
        .orderBy(ieltsReadingPassages.passageNumber);

      const reading = [];
      for (const p of passages) {
        const questions = await db
          .select()
          .from(ieltsReadingQuestions)
          .where(eq(ieltsReadingQuestions.passageId, p.id))
          .orderBy(ieltsReadingQuestions.questionNumber);
        reading.push({
          passageNumber: p.passageNumber,
          title: p.title,
          questions: questions.map(q => ({
            questionNumber: q.questionNumber,
            questionType: q.questionType,
            prompt: q.prompt,
            correctAnswers: (q.correctAnswers ?? []) as string[],
          })),
        });
      }

      return { test: { code: test.code, title: test.title }, listening, reading };
    }),

  /**
   * Import a complete test from a single JSON blob. Bulk-creates the test
   * + all nested sections / passages / tasks / prompts / questions in one
   * shot. Reimporting with the same `code` is rejected — duplicates blocked.
   */
  importTest: protectedProcedure
    .input(z.object({ json: z.string().min(2) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let parsed: unknown;
      try {
        parsed = JSON.parse(input.json);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid JSON",
        });
      }
      const data = FullTestSchema.parse(parsed);

      const existing = await db
        .select({ id: ieltsMockTests.id })
        .from(ieltsMockTests)
        .where(eq(ieltsMockTests.code, data.code))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A test with code "${data.code}" already exists`,
        });
      }

      // Insert test
      const insertedTest = await db.insert(ieltsMockTests).values({
        code: data.code,
        title: data.title,
        testType: data.testType,
        notes: data.notes ?? null,
        isPublished: false,
      });
      const testId = (insertedTest as any)[0]?.insertId as number;
      if (!testId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create test row",
        });
      }

      // Listening sections + questions
      for (const section of data.listening) {
        const inserted = await db.insert(ieltsListeningSections).values({
          testId,
          sectionNumber: section.sectionNumber,
          audioKey: "", // populated later via uploadListeningAudio
          durationSec: section.durationSec ?? null,
          transcript: section.transcript ?? null,
        });
        const sectionId = (inserted as any)[0]?.insertId as number;
        if (section.questions.length > 0) {
          await db.insert(ieltsListeningQuestions).values(
            section.questions.map(q => ({
              sectionId,
              questionNumber: q.questionNumber,
              questionType: q.questionType,
              prompt: q.prompt,
              options: q.options ?? null,
              correctAnswers: q.correctAnswers,
              maxScore: q.maxScore ?? 1,
            }))
          );
        }
      }

      // Reading passages + questions
      for (const passage of data.reading) {
        const inserted = await db.insert(ieltsReadingPassages).values({
          testId,
          passageNumber: passage.passageNumber,
          title: passage.title,
          body: passage.body,
          wordCount: passage.wordCount ?? null,
        });
        const passageId = (inserted as any)[0]?.insertId as number;
        if (passage.questions.length > 0) {
          await db.insert(ieltsReadingQuestions).values(
            passage.questions.map(q => ({
              passageId,
              questionNumber: q.questionNumber,
              questionType: q.questionType,
              prompt: q.prompt,
              options: q.options ?? null,
              correctAnswers: q.correctAnswers,
              maxScore: q.maxScore ?? 1,
            }))
          );
        }
      }

      // Writing tasks
      if (data.writing.length > 0) {
        await db.insert(ieltsWritingTasks).values(
          data.writing.map(t => ({
            testId,
            taskNumber: t.taskNumber,
            taskFormat: t.taskFormat,
            prompt: t.prompt,
            minWords: t.minWords,
            timeLimitSec: t.timeLimitSec,
            imageKey: null,
          }))
        );
      }

      // Speaking prompts
      for (const part of data.speaking) {
        if (part.prompts.length > 0) {
          await db.insert(ieltsSpeakingPrompts).values(
            part.prompts.map(p => ({
              testId,
              partNumber: part.partNumber,
              promptOrder: p.promptOrder,
              prompt: p.prompt,
              cueCardText: p.cueCardText ?? null,
              followUpHint: p.followUpHint ?? null,
            }))
          );
        }
      }

      return { testId, code: data.code };
    }),

  /** Toggle publish state. Unpublished tests are hidden from students. */
  setPublished: protectedProcedure
    .input(z.object({ id: z.number().int(), isPublished: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(ieltsMockTests)
        .set({ isPublished: input.isPublished })
        .where(eq(ieltsMockTests.id, input.id));
      return { ok: true };
    }),

  /**
   * Delete a test and ALL its content + attempts. Hard delete. Use with
   * care — only sensible for drafts that were never published.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Child rows first (no FK cascade configured).
      const sections = await db
        .select({ id: ieltsListeningSections.id })
        .from(ieltsListeningSections)
        .where(eq(ieltsListeningSections.testId, input.id));
      for (const s of sections) {
        await db
          .delete(ieltsListeningQuestions)
          .where(eq(ieltsListeningQuestions.sectionId, s.id));
      }
      await db
        .delete(ieltsListeningSections)
        .where(eq(ieltsListeningSections.testId, input.id));

      const passages = await db
        .select({ id: ieltsReadingPassages.id })
        .from(ieltsReadingPassages)
        .where(eq(ieltsReadingPassages.testId, input.id));
      for (const p of passages) {
        await db
          .delete(ieltsReadingQuestions)
          .where(eq(ieltsReadingQuestions.passageId, p.id));
      }
      await db
        .delete(ieltsReadingPassages)
        .where(eq(ieltsReadingPassages.testId, input.id));

      await db
        .delete(ieltsWritingTasks)
        .where(eq(ieltsWritingTasks.testId, input.id));
      await db
        .delete(ieltsSpeakingPrompts)
        .where(eq(ieltsSpeakingPrompts.testId, input.id));
      await db
        .delete(ieltsMockTests)
        .where(eq(ieltsMockTests.id, input.id));

      return { ok: true };
    }),

  /**
   * Upload an audio file for a specific Listening section. Accepts base64
   * to keep the tRPC interface simple (files small ~< 5MB MP3).
   */
  uploadListeningAudio: protectedProcedure
    .input(
      z.object({
        testId: z.number().int(),
        sectionNumber: z.number().int().min(1).max(4),
        base64: z.string().min(1),
        contentType: z.string().default("audio/mpeg"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [section] = await db
        .select()
        .from(ieltsListeningSections)
        .where(eq(ieltsListeningSections.testId, input.testId))
        .limit(20);
      // Find the right section
      const sections = await db
        .select()
        .from(ieltsListeningSections)
        .where(eq(ieltsListeningSections.testId, input.testId));
      const target = sections.find(s => s.sectionNumber === input.sectionNumber);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Section ${input.sectionNumber} not found for test ${input.testId}`,
        });
      }

      // Strip any "data:audio/mpeg;base64," prefix
      const cleanB64 = input.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanB64, "base64");

      const ext = input.contentType.includes("wav") ? "wav" : "mp3";
      const key = `ielts/audio/test-${input.testId}/section-${input.sectionNumber}-${nanoid(8)}.${ext}`;
      await storagePut(key, buffer, input.contentType);

      await db
        .update(ieltsListeningSections)
        .set({ audioKey: key })
        .where(eq(ieltsListeningSections.id, target.id));

      return { audioKey: key };
    }),

  /** Upload chart/diagram image for Writing Task 1 (Academic only). */
  uploadWritingImage: protectedProcedure
    .input(
      z.object({
        testId: z.number().int(),
        taskNumber: z.number().int().min(1).max(2),
        base64: z.string().min(1),
        contentType: z.string().default("image/png"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const tasks = await db
        .select()
        .from(ieltsWritingTasks)
        .where(eq(ieltsWritingTasks.testId, input.testId));
      const target = tasks.find(t => t.taskNumber === input.taskNumber);
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Writing task ${input.taskNumber} not found`,
        });
      }

      const cleanB64 = input.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanB64, "base64");
      const ext = input.contentType.includes("jpeg") ? "jpg" : "png";
      const key = `ielts/writing/test-${input.testId}/task-${input.taskNumber}-${nanoid(8)}.${ext}`;
      await storagePut(key, buffer, input.contentType);

      await db
        .update(ieltsWritingTasks)
        .set({ imageKey: key })
        .where(eq(ieltsWritingTasks.id, target.id));

      return { imageKey: key };
    }),

  /**
   * Admin-only: delete + regenerate a test by code. Useful when iterating
   * the test generator's blueprints. Returns the new test id.
   */
  regenerateTest: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(32),
        title: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Generate fresh in REPLACE mode — the old test is kept until the new
      // content + audio are fully generated, then swapped atomically. So if
      // generation fails (e.g. ElevenLabs credits), the existing test stays
      // intact instead of being wiped. Fire-and-forget to dodge Railway's
      // 5-minute proxy timeout; caller polls list().
      generationStatus.set(input.code, {
        state: "running",
        message: "Generating content + audio… (5–10 min)",
        at: Date.now(),
      });
      void (async () => {
        try {
          const { generateAcademicTest } = await import("./ieltsTestGenerator");
          const result = await generateAcademicTest({
            code: input.code,
            title: input.title,
            replace: true,
          });
          console.log(`[regenerateTest] done`, result);
          generationStatus.set(input.code, {
            state: "done",
            message: `Done — ${result.listeningSections} listening, ${result.readingPassages} reading, ${result.writingTasks} writing, ${result.speakingPrompts} speaking. Chart: ${result.chartImageGenerated ? "yes" : "no"}.`,
            at: Date.now(),
          });
        } catch (err: any) {
          console.error(`[regenerateTest] background failed`, err);
          generationStatus.set(input.code, {
            state: "failed",
            message: err?.message ?? "Generation failed (see Railway logs).",
            at: Date.now(),
          });
        }
      })();

      return {
        accepted: true,
        code: input.code,
        message:
          "Regeneration started in the background. If it fails (e.g. ElevenLabs credits), the existing test is kept. Watch the status here.",
      };
    }),

  /**
   * Regenerate ONLY the text skills (Reading / Writing / Speaking) in place,
   * keeping the existing Listening audio untouched. Uses ZERO ElevenLabs
   * credits. Defaults to all three text skills.
   */
  regenerateText: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(32),
        reading: z.boolean().optional().default(true),
        writing: z.boolean().optional().default(true),
        speaking: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      generationStatus.set(input.code, {
        state: "running",
        message: "Regenerating text (Reading/Writing/Speaking) — no audio, no ElevenLabs credits…",
        at: Date.now(),
      });
      void (async () => {
        try {
          const { regenerateTextContent } = await import("./ieltsTestGenerator");
          const result = await regenerateTextContent({
            code: input.code,
            reading: input.reading,
            writing: input.writing,
            speaking: input.speaking,
          });
          generationStatus.set(input.code, {
            state: "done",
            message: `Done (no audio touched) — ${result.readingPassages} reading, ${result.writingTasks} writing, ${result.speakingPrompts} speaking. Chart: ${result.chartImageGenerated ? "yes" : "no"}.`,
            at: Date.now(),
          });
        } catch (err: any) {
          console.error(`[regenerateText] failed`, err);
          generationStatus.set(input.code, {
            state: "failed",
            message: err?.message ?? "Text regeneration failed (see Railway logs).",
            at: Date.now(),
          });
        }
      })();
      return { accepted: true, code: input.code };
    }),

  /**
   * SURGICAL: rewrite ONLY Reading questions 27-31 into the "match statement
   * to researcher (A-F)" type, from the existing passage-3 text. Everything
   * else is untouched. Fast (one LLM call) so it runs synchronously.
   */
  fixReadingResearcherMatching: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(32) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const { fixReadingResearcherMatching } = await import("./ieltsTestGenerator");
      const result = await fixReadingResearcherMatching({ code: input.code });
      return result;
    }),

  /**
   * Create a shareable free-access link. Returns a signed URL that any
   * logged-in user can open to start a FREE attempt (for the given test type)
   * until it expires. Useful for giving the team / a cohort free access.
   */
  createFreePass: protectedProcedure
    .input(
      z.object({
        testType: z.enum(["academic", "general"]).default("academic"),
        days: z.number().int().min(1).max(365).default(30),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const { SignJWT } = await import("jose");
      const { ENV } = await import("./_core/env");
      const expSec = Math.floor(Date.now() / 1000) + input.days * 86400;
      const token = await new SignJWT({
        purpose: "ielts-free-pass",
        testType: input.testType,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(expSec)
        .sign(new TextEncoder().encode(ENV.cookieSecret));
      const base = ENV.appUrl.replace(/\/+$/, "");
      return {
        url: `${base}/ielts/redeem/${token}`,
        expiresAt: new Date(expSec * 1000).toISOString(),
        testType: input.testType,
      };
    }),

  /**
   * Create a shareable free-access link for the AI IELTS Tutor. Returns a
   * signed URL that anyone can open: they create/sign in to a free student
   * account and are granted an active tutor subscription for `days`. Reusable
   * until the link itself expires. Admin-only.
   */
  createTutorFreePass: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(7) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const { SignJWT } = await import("jose");
      const { ENV } = await import("./_core/env");
      // The link is valid for redemption for `days` (and the granted access is
      // also `days`). Give the link itself a generous window so it can be
      // shared with a cohort over time.
      const linkValidSec = Math.floor(Date.now() / 1000) + Math.max(input.days, 30) * 86400;
      const token = await new SignJWT({ purpose: "tutor-free-pass", days: input.days })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(linkValidSec)
        .sign(new TextEncoder().encode(ENV.cookieSecret));
      const base = ENV.appUrl.replace(/\/+$/, "");
      return {
        url: `${base}/ielts/tutor/redeem/${token}`,
        days: input.days,
        linkExpiresAt: new Date(linkValidSec * 1000).toISOString(),
      };
    }),

  /**
   * Email a COMPLIMENTARY ready-to-take Mock Test to a specific student — e.g.
   * a paying customer whose old attempt can no longer be used. Creates a paid
   * attempt and sends the login-free "Start my test" link. Admin-only.
   */
  sendComplimentaryTest: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().max(120).optional(),
      testType: z.enum(["academic", "general"]).default("academic"),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const { sendComplimentaryMockTest } = await import("./ieltsMockService");
      try {
        const r = await sendComplimentaryMockTest({ email: input.email, name: input.name, testType: input.testType });
        return { sent: true as const, ...r };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  /** Live status of the most recent (re)generation for a test code. */
  generationStatus: protectedProcedure
    .input(z.object({ code: z.string().min(1) }))
    .query(({ input, ctx }) => {
      assertAdmin(ctx);
      return generationStatus.get(input.code) ?? null;
    }),

  /**
   * Admin-only: create a free pre-paid attempt for the currently-logged-in
   * admin so they can walk through the test without paying. Returns the
   * attemptToken to redirect to /ielts/mock-test/take/<token>.
   */
  createTestAttempt: protectedProcedure
    .input(z.object({ testId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { ieltsMockAttempts } = await import("../drizzle/schema");

      const attemptToken = nanoid(24);
      const now = new Date();
      const inserted = await db.insert(ieltsMockAttempts).values({
        userId: ctx.user!.id,
        testId: input.testId,
        attemptToken,
        paymentRef: `ADMIN-FREE-${nanoid(8)}`,
        paidAt: now,
        status: "ready",
      });
      const attemptId = (inserted as any)[0]?.insertId as number;
      return { attemptToken, attemptId };
    }),

  /**
   * Admin: look up every IELTS Mock attempt tied to a given customer email.
   * Use case: a customer emails claiming "I paid but haven't gotten access" —
   * paste their email here to see (a) whether any attempts exist under that
   * email at all, (b) which are paid vs pending, (c) what the paymentRef is,
   * (d) whether it's tied to a real user account.
   *
   * Matches on BOTH customerEmail (the form field) AND user.email (the linked
   * account) so we catch attempts either way.
   */
  lookupCustomerByEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { ieltsMockAttempts, ieltsMockTests, users } = await import("../drizzle/schema");
      const emailLc = input.email.trim().toLowerCase();

      // 1) Find users with this email.
      const userRows = await db.select({
        id: users.id, name: users.name, email: users.email, createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, emailLc))
      .limit(5);

      // 2) Find attempts by customerEmail OR by userId.
      const attemptRows = await db.execute(sql`
        SELECT
          a.id, a.userId, a.testId, a.attemptToken, a.paymentRef, a.customerName,
          a.customerEmail, a.status, a.paidAt, a.startedAt, a.completedAt,
          a.createdAt, a.updatedAt,
          t.code AS testCode, t.title AS testTitle,
          u.email AS userEmail, u.name AS userName
        FROM ieltsMockAttempts a
        LEFT JOIN ieltsMockTests t ON t.id = a.testId
        LEFT JOIN users u ON u.id = a.userId
        WHERE LOWER(a.customerEmail) = ${emailLc}
           OR LOWER(u.email) = ${emailLc}
        ORDER BY a.createdAt DESC
      `);
      const attempts: any[] = Array.isArray(attemptRows[0]) ? attemptRows[0] as any[] : (attemptRows as any);

      // 3) Categorise for a quick summary.
      const paidAttempts = attempts.filter((a: any) => !!a.paidAt);
      const pendingAttempts = attempts.filter((a: any) => !a.paidAt);
      const completedAttempts = attempts.filter((a: any) => a.status === "completed");

      // 4) Also find any Xendit invoice references (payment refs starting with
      //    XENDIT-, IELTS-MOCK-, etc.) so we know what to search on the Xendit
      //    dashboard if needed.
      const xenditRefs = paidAttempts
        .map((a: any) => a.paymentRef)
        .filter((ref: string) => ref && !ref.startsWith("ADMIN-") && !ref.startsWith("COMP-"));

      return {
        email: emailLc,
        summary: {
          users: userRows.length,
          totalAttempts: attempts.length,
          paidAttempts: paidAttempts.length,
          pendingAttempts: pendingAttempts.length,
          completedAttempts: completedAttempts.length,
          xenditPaymentRefs: xenditRefs,
        },
        users: userRows,
        attempts,
      };
    }),

  /**
   * Diagnostic: inspect the Speaking data for an attempt — every conversation
   * turn (role, part, transcript length, whether audio is attached and whether
   * that audio actually exists in storage) plus any graded score rows. Lets an
   * admin see exactly why Speaking did or didn't grade.
   */
  speakingDiagnostic: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const {
        ieltsMockAttempts,
        ieltsSpeakingConversations,
        ieltsSpeakingResponses,
      } = await import("../drizzle/schema");
      const { storageGetBytes } = await import("./storage");

      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

      const conv = await db
        .select()
        .from(ieltsSpeakingConversations)
        .where(eq(ieltsSpeakingConversations.attemptId, attempt.id))
        .orderBy(ieltsSpeakingConversations.turnOrder);

      const turns = [];
      for (const t of conv) {
        let audioBytes: number | null = null;
        if (t.audioKey) {
          try {
            const { buffer } = await storageGetBytes(t.audioKey);
            audioBytes = buffer.length;
          } catch {
            audioBytes = -1; // present in DB but missing/unreadable in storage
          }
        }
        turns.push({
          partNumber: t.partNumber,
          turnOrder: t.turnOrder,
          role: t.role,
          textLen: t.text ? t.text.length : 0,
          hasAudioKey: !!t.audioKey,
          audioBytes,
        });
      }

      const responses = await db
        .select()
        .from(ieltsSpeakingResponses)
        .where(eq(ieltsSpeakingResponses.attemptId, attempt.id));

      return {
        attemptStatus: attempt.status,
        turns,
        gradedParts: responses.map(r => ({
          partNumber: r.partNumber,
          partBand: r.partBand ? Number(r.partBand) : null,
        })),
      };
    }),

  /**
   * Re-grade a completed attempt with the latest grading logic. Re-transcribes
   * any speaking audio that has no transcript (recovers attempts whose
   * original Whisper call failed), re-grades Speaking, then re-runs the full
   * finalize (which recomputes Listening/Reading raw scores + bands, regenerates
   * the PDF, and re-emails the report). Use after grading-logic fixes.
   */
  regradeAttempt: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { ieltsMockAttempts } = await import("../drizzle/schema");
      const [attempt] = await db
        .select()
        .from(ieltsMockAttempts)
        .where(eq(ieltsMockAttempts.attemptToken, input.token))
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

      const { regradeSpeakingForAttempt } = await import("./ieltsRouter");
      const { finalizeAttempt } = await import("./ieltsFinalize");

      const speaking = await regradeSpeakingForAttempt(attempt.id, {
        reTranscribe: true,
      });
      await finalizeAttempt(attempt.id);

      return {
        ok: true,
        speakingPartsGraded: speaking.gradedParts,
        speakingReTranscribed: speaking.reTranscribed,
      };
    }),
});
