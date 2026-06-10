/**
 * IELTS Mock Test — admin tRPC routes.
 *
 * Mounted under `admin.ielts` in the main app router. All procedures
 * require role === "admin".
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, desc } from "drizzle-orm";

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
});
