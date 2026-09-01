/**
 * SpecTa IQ Discovery — admin tRPC routes for question-bank management.
 *
 * Mounted under `admin.iq` in the main app router. All procedures require
 * role === "admin". Powers /admin/iq-bank: generating starter batches,
 * reviewing each item, approving or deleting.
 *
 * Nothing here is user-facing — real students only see approved items
 * served via the public IQ session router (built in M2).
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "./_core/trpc";
import {
  insertIqQuestion, listIqQuestions, setIqQuestionApproved, deleteIqQuestion,
  iqQuestionCounts,
} from "./db";
import { generateStarterBatch } from "./iqQuestionGenerator";

function assertAdmin(ctx: { user: { role: string } | null }) {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
}

export const iqAdminRouter = router({
  /** Aggregate counts by domain × approval status for the dashboard tile. */
  counts: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    return iqQuestionCounts();
  }),

  /** List questions with optional filters. Default: all, newest first. */
  list: protectedProcedure
    .input(z.object({
      domain: z.enum(["fluid", "quantitative", "verbal", "spatial", "memory"]).optional(),
      approvedOnly: z.boolean().default(false),
      limit: z.number().int().min(1).max(500).default(200),
    }).optional())
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const rows = await listIqQuestions(input || {});
      // Deserialize prompt/options for the client — schema stores JSON strings.
      return rows.map(r => ({
        id: r.id,
        domain: r.domain,
        type: r.type,
        difficulty: r.difficulty,
        timeLimitSec: r.timeLimitSec,
        prompt: safeParse(r.prompt, {}),
        options: safeParse(r.options, []),
        correctIndex: r.correctIndex,
        explanation: r.explanation || "",
        approved: r.approved === 1,
        generatedBy: r.generatedBy || "unknown",
        createdAt: r.createdAt,
      }));
    }),

  /** Generate a 10-question starter batch (2 per domain) and save to DB
   *  with approved=0. Hadi reviews via the UI and flips individual items
   *  to approved=1. Programmatic items (matrix/sequence/rotation/etc.) are
   *  seeded from a fresh timestamp each call so retries produce different
   *  puzzles. Text items are AI-generated (DeepSeek) and vary every call.
   */
  generateStarterBatch: protectedProcedure
    .input(z.object({ seed: z.number().int().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const seed = input?.seed || Date.now();
      const batch = await generateStarterBatch(seed);

      const saved: number[] = [];
      const saveErrors: string[] = [];
      for (const q of batch.questions) {
        try {
          const row = await insertIqQuestion({
            domain: q.domain,
            type: q.type,
            difficulty: q.difficulty,
            prompt: q.prompt,
            options: q.options,
            correctIndex: q.correctIndex,
            timeLimitSec: q.timeLimitSec,
            explanation: q.explanation,
            generatedBy: q.generatedBy,
          });
          if (row?.id) saved.push(row.id);
        } catch (e) {
          saveErrors.push(`${q.domain}/${q.type}: ${(e as Error).message}`);
        }
      }

      return {
        seed,
        savedCount: saved.length,
        savedIds: saved,
        generationErrors: batch.errors,
        saveErrors,
      };
    }),

  /** Flip the approved flag. Used inline from the review UI on each item. */
  setApproved: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), approved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const ok = await setIqQuestionApproved(input.id, input.approved);
      if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Update failed" });
      return { ok: true, id: input.id, approved: input.approved };
    }),

  /** Permanently delete an item — for items that are just wrong and
   *  shouldn't clutter the bank. */
  deleteQuestion: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const ok = await deleteIqQuestion(input.id);
      if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      return { ok: true, id: input.id };
    }),
});

function safeParse<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try { return JSON.parse(text) as T; } catch { return fallback; }
}
