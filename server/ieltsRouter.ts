/**
 * IELTS Mock Test — student-facing tRPC routes.
 * Mounted under `ielts` in the main app router.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";

import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { ieltsMockAttempts, ieltsMockTests } from "../drizzle/schema";
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
