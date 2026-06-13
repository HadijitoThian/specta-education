/**
 * CRM — Parent reports review queue (Phase 3). Mounted as `reports`.
 * Owner sees all; a counselor sees reports for their own students.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { leads, crmParentReports } from "../drizzle/schema";
import {
  currentReportWeek,
  generateDraftsForWeek,
  sendReportById,
  sendDueForWeek,
  parseSnapshot,
} from "./crmParentReports";

function isOwner(u: { role: string; crmRole: string | null }) {
  return u.role === "admin" || u.crmRole === "owner";
}
function assertCrm(u: { role: string; crmRole: string | null; crmActive: boolean }) {
  const ok = isOwner(u) || (u.crmRole !== "none" && u.crmActive);
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "CRM access required." });
}

async function db_() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

export const crmReportsRouter = router({
  /** The week we report on right now (this week's Monday, WIB). */
  currentWeek: protectedProcedure.query(({ ctx }) => {
    assertCrm(ctx.user);
    return { weekOf: currentReportWeek() };
  }),

  /** Reports for a week, with student name. Counselors see only their students. */
  list: protectedProcedure
    .input(z.object({ weekOf: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const weekOf = input?.weekOf || currentReportWeek();
      const rows = await db
        .select({
          id: crmParentReports.id,
          leadId: crmParentReports.leadId,
          status: crmParentReports.status,
          parentName: crmParentReports.parentName,
          parentEmail: crmParentReports.parentEmail,
          snapshot: crmParentReports.snapshot,
          sentAt: crmParentReports.sentAt,
          error: crmParentReports.error,
          studentName: leads.studentName,
          assignedCounselorId: leads.assignedCounselorId,
          pipelineStage: leads.pipelineStage,
        })
        .from(crmParentReports)
        .leftJoin(leads, eq(leads.id, crmParentReports.leadId))
        .where(eq(crmParentReports.weekOf, weekOf))
        .orderBy(desc(crmParentReports.id));

      const visible = isOwner(ctx.user) ? rows : rows.filter(r => r.assignedCounselorId === ctx.user.id);
      return {
        weekOf,
        reports: visible.map(r => {
          const snap = parseSnapshot(r.snapshot);
          const includedCount = snap ? snap.activities.filter(a => a.include).length : 0;
          return {
            id: r.id,
            leadId: r.leadId,
            studentName: r.studentName,
            status: r.status,
            parentName: r.parentName,
            parentEmail: r.parentEmail,
            includedCount,
            hasParent: !!r.parentEmail,
            sentAt: r.sentAt,
            error: r.error,
            stageLabel: snap?.stageLabel ?? "",
          };
        }),
      };
    }),

  /** Full report incl. snapshot for review/editing. */
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const [r] = await db
        .select({
          report: crmParentReports,
          assignedCounselorId: leads.assignedCounselorId,
        })
        .from(crmParentReports)
        .leftJoin(leads, eq(leads.id, crmParentReports.leadId))
        .where(eq(crmParentReports.id, input.id))
        .limit(1);
      if (!r) throw new TRPCError({ code: "NOT_FOUND" });
      if (!isOwner(ctx.user) && r.assignedCounselorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return { ...r.report, snapshotParsed: parseSnapshot(r.report.snapshot) };
    }),

  /** Owner: generate this week's drafts (idempotent). */
  generateNow: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Owner only." });
    const weekOf = currentReportWeek();
    const res = await generateDraftsForWeek(weekOf);
    return { weekOf, ...res };
  }),

  /** Edit a draft: intro note, which activities to include, channels. */
  updateDraft: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        summaryNote: z.string().max(2000).nullable().optional(),
        includeActivityIds: z.array(z.number().int()).optional(),
        channelEmail: z.boolean().optional(),
        channelWhatsapp: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const [r] = await db
        .select({ report: crmParentReports, assignedCounselorId: leads.assignedCounselorId })
        .from(crmParentReports)
        .leftJoin(leads, eq(leads.id, crmParentReports.leadId))
        .where(eq(crmParentReports.id, input.id))
        .limit(1);
      if (!r) throw new TRPCError({ code: "NOT_FOUND" });
      if (!isOwner(ctx.user) && r.assignedCounselorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (r.report.status === "sent") throw new TRPCError({ code: "BAD_REQUEST", message: "Already sent." });

      const patch: Record<string, unknown> = {};
      if (input.summaryNote !== undefined) patch.summaryNote = input.summaryNote;
      if (input.channelEmail !== undefined) patch.channelEmail = input.channelEmail;
      if (input.channelWhatsapp !== undefined) patch.channelWhatsapp = input.channelWhatsapp;
      if (input.includeActivityIds) {
        const snap = parseSnapshot(r.report.snapshot);
        if (snap) {
          const keep = new Set(input.includeActivityIds);
          snap.activities = snap.activities.map(a => ({ ...a, include: keep.has(a.id) }));
          patch.snapshot = JSON.stringify(snap);
        }
      }
      if (Object.keys(patch).length) await db.update(crmParentReports).set(patch).where(eq(crmParentReports.id, input.id));
      return { ok: true };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await db.update(crmParentReports)
        .set({ status: "approved", reviewedBy: ctx.user.email ?? null })
        .where(and(eq(crmParentReports.id, input.id), eq(crmParentReports.status, "draft")));
      return { ok: true };
    }),

  skip: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await db.update(crmParentReports)
        .set({ status: "skipped", reviewedBy: ctx.user.email ?? null })
        .where(eq(crmParentReports.id, input.id));
      return { ok: true };
    }),

  /** Send one report now (review-and-send, or test). */
  sendOne: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const res = await sendReportById(input.id);
      if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: res.error || "Send failed" });
      return { ok: true };
    }),

  /** Owner: send all due reports for the week (approved + drafts with content). */
  sendDue: protectedProcedure
    .input(z.object({ weekOf: z.string().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      if (!isOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Owner only." });
      const weekOf = input?.weekOf || currentReportWeek();
      return sendDueForWeek(weekOf);
    }),
});
