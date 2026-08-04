/**
 * Voice Clone admin router — admin-only tRPC procedures for managing
 * Voice Clone sessions:
 *  - List sessions (search by email, filter by status)
 *  - Create free test link (comped session with isBundleFree=1)
 *  - Resend recording link (paid but not yet recorded)
 *  - Resend result email (status=ready — re-deliver the result URL)
 *  - Retry processing (status=failed — reset and re-fire)
 *
 * Mounted at `voiceCloneAdmin` in the app router. Guarded by
 * protectedProcedure + an in-body role check (admin/ceo only).
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { sendVoiceCloneActionEmail } from "./resendService";

/** Assert the caller is an admin (role=admin OR role=ceo). Throws FORBIDDEN otherwise. */
function assertAdmin(ctx: any): void {
  const role = ctx?.user?.role;
  if (role !== "admin" && role !== "ceo") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

function appUrl(): string {
  return (ENV.appUrl || "https://www.spectaeducation.com").replace(/\/+$/, "");
}

export const voiceCloneAdminRouter = router({
  /**
   * List Voice Clone sessions, newest first. Optional filters:
   *  - status: pending | processing | ready | failed | all (default: all)
   *  - search: substring match on customerEmail or customerName
   *  - limit: max rows returned (default 100, capped 500)
   */
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "processing", "ready", "failed", "all"]).default("all"),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }))
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const statusFilter = input.status === "all"
        ? sql`1=1`
        : sql`status = ${input.status}`;
      const searchTerm = input.search ? `%${input.search.toLowerCase()}%` : null;
      const searchFilter = searchTerm
        ? sql`(LOWER(customerEmail) LIKE ${searchTerm} OR LOWER(customerName) LIKE ${searchTerm})`
        : sql`1=1`;

      const rows: any = await db.execute(sql`
        SELECT id, sessionToken, mode, customerName, customerEmail, customerPhone,
               status, isBundleFree, attemptId, amountIdr, xenditInvoiceUrl,
               targetedPartNumber, partsJson, errorMessage,
               paidAt, processedAt, createdAt
        FROM voice_clone_sessions
        WHERE ${statusFilter} AND ${searchFilter}
        ORDER BY createdAt DESC
        LIMIT ${sql.raw(String(input.limit))}
      `);
      const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
      return list.map(r => ({
        ...r,
        partsCount: r.partsJson ? (() => { try { const p = JSON.parse(r.partsJson); return Array.isArray(p) ? p.length : 0; } catch { return 0; } })() : (r.targetedPartNumber ? 1 : 0),
        partsJson: undefined, // don't send raw JSON to client
      }));
    }),

  /**
   * Create a comped free-test session. Reserves a voice_clone_sessions row
   * with isBundleFree=1 and status=pending, generates a sessionToken, and
   * emails the recording URL to the recipient. Recipient can immediately
   * record + get processed for free (no Xendit invoice).
   */
  createFreeLink: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1).max(120),
      phone: z.string().optional(),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const sessionToken = nanoid(24);
      await db.execute(sql`
        INSERT INTO voice_clone_sessions
          (mode, sessionToken, customerName, customerEmail, customerPhone,
           amountIdr, isBundleFree, status, paidAt, createdAt)
        VALUES
          ('standalone', ${sessionToken}, ${input.name}, ${input.email.toLowerCase()},
           ${input.phone || null}, 0, 1, 'pending', NOW(), NOW())
      `);
      const url = `${appUrl()}/voice-clone/record/${sessionToken}`;
      const emailed = await sendVoiceCloneActionEmail({
        to: input.email,
        customerName: input.name,
        purpose: "free-test",
        url,
      });
      console.log(`[VoiceCloneAdmin] Free link created for ${input.email} — emailed=${emailed} — note: ${input.note || "(none)"}`);
      return { sessionToken, url, emailed };
    }),

  /**
   * Re-email the recording URL for a paid session that hasn't been recorded
   * yet (or for which the customer lost the link). Works on sessions in
   * status='pending' with a sessionToken.
   */
  resendRecordingLink: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows: any = await db.execute(sql`
        SELECT id, sessionToken, customerName, customerEmail, status, isBundleFree, paidAt
        FROM voice_clone_sessions WHERE id = ${input.sessionId} LIMIT 1
      `);
      const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
      const s = list[0];
      if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (!s.sessionToken) throw new TRPCError({ code: "BAD_REQUEST", message: "This session has no recording token (likely from_mock — recording happens differently)" });
      if (!s.customerEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "Session has no customer email on file" });
      const url = `${appUrl()}/voice-clone/record/${s.sessionToken}`;
      const emailed = await sendVoiceCloneActionEmail({
        to: s.customerEmail,
        customerName: s.customerName,
        purpose: !!s.isBundleFree ? "free-test" : "recording",
        url,
      });
      return { emailed, url };
    }),

  /**
   * Re-email the result URL for a session in status='ready'. Useful when
   * the original delivery email failed or the customer lost it.
   */
  resendResultEmail: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows: any = await db.execute(sql`
        SELECT id, sessionToken, customerName, customerEmail, status
        FROM voice_clone_sessions WHERE id = ${input.sessionId} LIMIT 1
      `);
      const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
      const s = list[0];
      if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (s.status !== "ready") throw new TRPCError({ code: "BAD_REQUEST", message: `Session status is '${s.status}', not 'ready'` });
      if (!s.sessionToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Session has no token (from-Mock sessions don't use standalone result URLs)" });
      if (!s.customerEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "Session has no customer email on file" });
      const url = `${appUrl()}/voice-clone/result/${s.sessionToken}`;
      const emailed = await sendVoiceCloneActionEmail({
        to: s.customerEmail,
        customerName: s.customerName,
        purpose: "result",
        url,
      });
      return { emailed, url };
    }),

  /**
   * Reset a failed session and re-fire processing. Only works on status='failed';
   * clears errorMessage and either runs runVoiceCloneStandalone or
   * runVoiceCloneForAttempt depending on the session's mode.
   */
  retryProcessing: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows: any = await db.execute(sql`
        SELECT id, mode, attemptId, status FROM voice_clone_sessions WHERE id = ${input.sessionId} LIMIT 1
      `);
      const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
      const s = list[0];
      if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      // Allow retry from failed OR processing (in case a previous run crashed silently and left the flag stuck).
      if (s.status !== "failed" && s.status !== "processing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Retry only allowed from 'failed' or 'processing' status (currently '${s.status}')` });
      }

      await db.execute(sql`
        UPDATE voice_clone_sessions SET status = 'processing', errorMessage = NULL WHERE id = ${input.sessionId}
      `);
      const sessionId = input.sessionId;
      const mode = s.mode as "from_mock" | "standalone";
      const attemptId = s.attemptId as number | null;

      // Fire-and-forget re-run so the admin panel gets an instant response.
      void (async () => {
        try {
          if (mode === "from_mock" && attemptId) {
            const { runVoiceCloneForAttempt } = await import("./voiceCloneService");
            const result = await runVoiceCloneForAttempt(attemptId);
            await db.execute(sql`
              UPDATE voice_clone_sessions SET
                status = 'ready', processedAt = NOW(),
                elevenLabsVoiceId = ${result.voiceId},
                targetedPartNumber = ${result.targetedPartNumber},
                originalTranscript = ${result.originalTranscript},
                originalAudioKey = ${result.originalAudioKey || null},
                band8Transcript = ${result.band8Transcript},
                band8AudioKey = ${result.band8AudioKey},
                changesSummary = ${result.changesSummary},
                partsJson = ${JSON.stringify(result.parts)},
                assessmentJson = ${JSON.stringify(result.assessment)},
                pdfKey = ${result.pdfKey || null}
              WHERE id = ${sessionId}
            `);
            console.log(`[VoiceCloneAdmin] Retry succeeded for session ${sessionId} (from_mock)`);
          } else {
            const { runVoiceCloneStandalone } = await import("./voiceCloneService");
            const result = await runVoiceCloneStandalone(sessionId);
            await db.execute(sql`
              UPDATE voice_clone_sessions SET
                status = 'ready', processedAt = NOW(),
                elevenLabsVoiceId = ${result.voiceId},
                targetedPartNumber = ${result.targetedPartNumber},
                originalTranscript = ${result.originalTranscript},
                originalAudioKey = ${result.originalAudioKey || null},
                band8Transcript = ${result.band8Transcript},
                band8AudioKey = ${result.band8AudioKey},
                changesSummary = ${result.changesSummary},
                partsJson = ${JSON.stringify(result.parts)},
                assessmentJson = ${JSON.stringify(result.assessment)},
                pdfKey = ${result.pdfKey || null}
              WHERE id = ${sessionId}
            `);
            console.log(`[VoiceCloneAdmin] Retry succeeded for session ${sessionId} (standalone)`);
          }
        } catch (e) {
          await db.execute(sql`
            UPDATE voice_clone_sessions SET status = 'failed', errorMessage = ${(e as Error).message} WHERE id = ${sessionId}
          `);
          console.error(`[VoiceCloneAdmin] Retry FAILED for session ${sessionId}:`, e);
        }
      })();
      return { started: true };
    }),
});
