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
import { getDb } from "./db";
import { igcseTopics, igcseSessions, type IgcseSession } from "../drizzle/schema";

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

  /** Sign-in + simple access status for the IGCSE app shell. */
  status: publicProcedure.query(async ({ ctx }) => {
    const leadId = await resolveLead(ctx);
    if (!leadId) return { loggedIn: false as const };
    // Subscription/free-trial gating lands when we wire the IGCSE plan into
    // tutor_subscriptions in Week 2; for the scaffold we treat all signed-in
    // students as having access.
    return { loggedIn: true as const, hasAccess: true };
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
