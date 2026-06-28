/**
 * IGCSE AI Teacher router (mounted as `igcse`).
 *
 * Phase 1 scaffold for the Math 0580 (Extended) tutor experience at /igcse.
 * Reuses the existing student-portal session pattern (cookie → leadId).
 *
 * Endpoints in this scaffold:
 *  - listTopics                 — the Cambridge IGCSE 0580 topic tree
 *  - status                     — is the student signed in? does she have access?
 *  - createSession              — start a lesson on a topic; returns sessionId
 *  - listSessions               — history (most recent first)
 *  - getSession                 — full session record
 *  - endSession                 — mark a session as ended (with duration)
 *  - appendTranscript           — append turns to the live transcript (audio
 *                                 + board updates plug in later in Week 4–6)
 *
 * The voice + whiteboard pipeline (Whisper → DeepSeek V4 → ElevenLabs Flash,
 * tldraw board commands) lands in subsequent commits; this scaffold gives us
 * routes and storage to wire those into.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { and, desc, eq } from "drizzle-orm";

import { router, publicProcedure } from "./_core/trpc";
import { getDb, getActiveIgcseSubscription, createIgcseSubscription, getIgcseLifetimeSecondsUsed, getLeadById } from "./db";
import { igcseTopics, igcseSessions, type IgcseSession } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { IGCSE_PLANS, igcseExternalId, createIgcseInvoice } from "./xenditService";

const FREE_TRIAL_SECONDS = 30 * 60; // 30 minutes lifetime free trial

/** Resolve the signed-in student's leadId from the student-portal cookie. */
async function resolveLead(ctx: any): Promise<number | null> {
  try {
    const cookieHeader = ctx?.req?.headers?.cookie || "";
    const token = parseCookies(cookieHeader)["student_portal_token"];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    const leadId = Number((payload as any).leadId);
    return Number.isFinite(leadId) ? leadId : null;
  } catch { return null; }
}
function requireLead(leadId: number | null): number {
  if (!leadId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in first." });
  return leadId;
}

export const igcseRouter = router({
  /** Public: list every topic in the seeded Cambridge IGCSE 0580 tree. */
  listTopics: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(igcseTopics).orderBy(igcseTopics.sortOrder);
    return rows;
  }),

  /** Sign-in + access status: subscription + free-trial counter for the gate. */
  status: publicProcedure.query(async ({ ctx }) => {
    const leadId = await resolveLead(ctx);
    if (!leadId) return { loggedIn: false as const };
    const sub = await getActiveIgcseSubscription(leadId);
    const usedSec = await getIgcseLifetimeSecondsUsed(leadId);
    const freeRemainingSec = Math.max(0, FREE_TRIAL_SECONDS - usedSec);
    return {
      loggedIn: true as const,
      subscription: sub ? { plan: sub.plan, expiresAt: sub.expiresAt, hoursLimit: sub.hoursLimit } : null,
      freeTrial: {
        totalSec: FREE_TRIAL_SECONDS,
        usedSec,
        remainingSec: freeRemainingSec,
      },
      hasAccess: !!sub || freeRemainingSec > 0,
    };
  }),

  /** Create a Xendit invoice for the IGCSE subscription plan; returns the hosted invoice URL. */
  createCheckout: publicProcedure
    .input(z.object({ plan: z.enum(["m1"]).default("m1") }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      if (!ENV.xenditSecretKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payments are not configured yet." });
      }
      const lead = await getLeadById(leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
      const plan = IGCSE_PLANS[input.plan];
      const externalId = igcseExternalId();
      await createIgcseSubscription({
        leadId,
        plan: input.plan,
        status: "pending",
        amount: String(plan.amount) as any,
        currency: "IDR",
        hoursLimit: plan.hoursLimit,
        xenditInvoiceId: externalId,
      });
      // Never redirect a paying customer to localhost if APP_URL is unset.
      const base = ENV.appUrl?.replace(/\/+$/, "")
        || "https://specta-education-production.up.railway.app";
      try {
        const invoice = await createIgcseInvoice({
          externalId,
          plan: input.plan,
          customerName: (lead as any).name || (lead as any).studentName || "Student",
          customerEmail: (lead as any).email || (lead as any).studentEmail,
          customerPhone: (lead as any).phone || (lead as any).studentPhone || undefined,
          successRedirectUrl: `${base}/igcse/app?paid=1`,
          failureRedirectUrl: `${base}/igcse/app?paid=0`,
        });
        return { invoiceUrl: invoice.invoice_url };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  /** Start a new lesson on a topic (or free-form if topicId is omitted). */
  createSession: publicProcedure
    .input(z.object({
      topicId: z.number().int().positive().optional(),
      language: z.enum(["en", "id"]).default("en"),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const r = await db.insert(igcseSessions).values({
        leadId,
        topicId: input.topicId ?? null,
        language: input.language,
        transcript: [] as any,
        boardSnapshot: null,
      });
      const id = (r as any)[0].insertId;
      const [row] = await db.select().from(igcseSessions).where(eq(igcseSessions.id, id)).limit(1);
      return row as IgcseSession;
    }),

  /** A student's lesson history (most recent first). */
  listSessions: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ input, ctx }) => {
      const leadId = await resolveLead(ctx);
      if (!leadId) return [];
      const db = await getDb();
      if (!db) return [];
      return db.select()
        .from(igcseSessions)
        .where(eq(igcseSessions.leadId, leadId))
        .orderBy(desc(igcseSessions.startedAt))
        .limit(input?.limit ?? 20);
    }),

  /** Get one session by id (caller must own it). */
  getSession: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [row] = await db.select().from(igcseSessions)
        .where(and(eq(igcseSessions.id, input.id), eq(igcseSessions.leadId, leadId)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /** Mark a session ended; record duration + accumulated cost so far. */
  endSession: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      durationSec: z.number().int().min(0).max(60 * 60 * 12).optional(),
      costCents: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const patch: any = { status: "ended", endedAt: new Date() };
      if (input.durationSec != null) patch.durationSec = input.durationSec;
      if (input.costCents != null) patch.costCents = input.costCents;
      await db.update(igcseSessions).set(patch)
        .where(and(eq(igcseSessions.id, input.id), eq(igcseSessions.leadId, leadId)));
      return { ok: true as const };
    }),

  /** Append a turn to the live transcript. Lightweight — heavier audio/board
   *  state is persisted by the session room when it lands in later weeks. */
  appendTranscript: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      turn: z.object({
        role: z.enum(["student", "ai", "system"]),
        text: z.string().min(1).max(8000),
        ts: z.number().int().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [row] = await db.select().from(igcseSessions)
        .where(and(eq(igcseSessions.id, input.id), eq(igcseSessions.leadId, leadId)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const existing = (row.transcript as any[]) || [];
      const updated = [...existing, { ...input.turn, ts: input.turn.ts ?? Date.now() }];
      await db.update(igcseSessions).set({ transcript: updated as any })
        .where(eq(igcseSessions.id, input.id));
      return { ok: true as const, count: updated.length };
    }),
});
