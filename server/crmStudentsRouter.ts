/**
 * CRM — Students, pipeline & activity (Phase 2). Mounted as `students`.
 *
 * Reuses the existing tables: a student IS a `leads` row (the spine); the
 * timeline is `crm_activity_timeline`, documents `crm_student_documents`,
 * tasks `crm_tasks`. Any active CRM team member (or owner) may use these.
 * The secret to a useful CRM + a real Monday parent report is that logging an
 * activity here is fast — so `logActivity` is deliberately tiny.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";

import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  leads,
  users,
  crmActivityTimeline,
  crmTasks,
  crmStudentDocuments,
} from "../drizzle/schema";

const STAGES = [
  "new_lead", "consultation", "ielts_prep", "shortlist", "application",
  "offer", "visa", "pre_departure", "enrolled", "inactive",
] as const;
const OFFICES = ["kelapa_gading", "pik", "gading_serpong"] as const;
const ACTIVITY_TYPES = [
  "call", "whatsapp", "meeting", "email", "note",
  "document", "stage_change", "application", "offer", "visa", "other",
] as const;

const STAGE_LABEL: Record<string, string> = {
  new_lead: "New Lead", consultation: "Consultation", ielts_prep: "IELTS Prep",
  shortlist: "University Shortlist", application: "Application", offer: "Offer Received",
  visa: "Visa Process", pre_departure: "Pre-Departure", enrolled: "Enrolled", inactive: "Inactive",
};

function assertCrm(u: { role: string; crmRole: string | null; crmActive: boolean }) {
  const ok = u.role === "admin" || u.crmRole === "owner" || (u.crmRole !== "none" && u.crmActive);
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "CRM access required." });
}

async function db_() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

async function logActivity(
  db: Awaited<ReturnType<typeof db_>>,
  leadId: number,
  activityType: string,
  title: string,
  staffEmail: string | null,
  description?: string | null
) {
  await db.insert(crmActivityTimeline).values({
    leadId, activityType, title, description: description ?? null, staffEmail: staffEmail ?? null,
  });
}

export const crmStudentsRouter = router({
  /** Stage definitions, for the UI (labels + order). */
  stages: protectedProcedure.query(() =>
    STAGES.map(s => ({ value: s, label: STAGE_LABEL[s] }))
  ),

  /** Active CRM team members — for assignment dropdowns. */
  counselors: protectedProcedure.query(async ({ ctx }) => {
    assertCrm(ctx.user);
    const db = await db_();
    return db
      .select({ id: users.id, name: users.name, crmRole: users.crmRole, office: users.office })
      .from(users)
      .where(and(eq(users.crmActive, true), or(eq(users.role, "admin"), sql`${users.crmRole} <> 'none'`)))
      .orderBy(users.name);
  }),

  /** Student list with filters. Returns last-activity timestamp for sorting/alerts. */
  list: protectedProcedure
    .input(
      z.object({
        stage: z.enum(STAGES).optional(),
        office: z.enum(OFFICES).optional(),
        search: z.string().max(120).optional(),
        mineOnly: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const f = input ?? {};
      const conds: any[] = [];
      if (f.stage) conds.push(eq(leads.pipelineStage, f.stage));
      if (f.office) conds.push(eq(leads.office, f.office));
      if (f.mineOnly) conds.push(eq(leads.assignedCounselorId, ctx.user.id));
      if (f.search && f.search.trim()) {
        const s = `%${f.search.trim()}%`;
        conds.push(or(like(leads.studentName, s), like(leads.studentEmail, s), like(leads.studentPhone, s)));
      }
      const rows = await db
        .select({
          id: leads.id,
          studentName: leads.studentName,
          studentPhone: leads.studentPhone,
          studentEmail: leads.studentEmail,
          parentName: leads.parentName,
          parentEmail: leads.parentEmail,
          parentPhone: leads.parentPhone,
          pipelineStage: leads.pipelineStage,
          office: leads.office,
          preferredCountry: leads.preferredCountry,
          programInterest: leads.programInterest,
          intakeDate: leads.intakeDate,
          assignedCounselorId: leads.assignedCounselorId,
          counselorName: users.name,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .leftJoin(users, eq(users.id, leads.assignedCounselorId))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(leads.id))
        .limit(500);

      // Last activity per student (one grouped query).
      const ids = rows.map(r => r.id);
      const lastMap = new Map<number, Date>();
      if (ids.length) {
        const acts = await db
          .select({ leadId: crmActivityTimeline.leadId, last: sql<Date>`MAX(${crmActivityTimeline.createdAt})` })
          .from(crmActivityTimeline)
          .where(inArray(crmActivityTimeline.leadId, ids))
          .groupBy(crmActivityTimeline.leadId);
        for (const a of acts) lastMap.set(a.leadId, a.last as Date);
      }
      return rows.map(r => ({ ...r, lastActivityAt: lastMap.get(r.id) ?? null }));
    }),

  /** Full student profile: details + timeline + documents + tasks. */
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const [student] = await db.select().from(leads).where(eq(leads.id, input.id)).limit(1);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      let counselorName: string | null = null;
      if (student.assignedCounselorId) {
        const [c] = await db.select({ name: users.name }).from(users).where(eq(users.id, student.assignedCounselorId)).limit(1);
        counselorName = c?.name ?? null;
      }
      const activities = await db
        .select()
        .from(crmActivityTimeline)
        .where(eq(crmActivityTimeline.leadId, input.id))
        .orderBy(desc(crmActivityTimeline.createdAt))
        .limit(100);
      const documents = await db
        .select()
        .from(crmStudentDocuments)
        .where(eq(crmStudentDocuments.leadId, input.id))
        .orderBy(desc(crmStudentDocuments.createdAt));
      const tasks = await db
        .select()
        .from(crmTasks)
        .where(and(eq(crmTasks.relatedType, "lead"), eq(crmTasks.relatedId, input.id)))
        .orderBy(desc(crmTasks.createdAt));

      return { student, counselorName, activities, documents, tasks };
    }),

  /** Add a student (manual CRM entry). */
  create: protectedProcedure
    .input(
      z.object({
        studentName: z.string().min(1).max(255),
        studentPhone: z.string().max(50).optional(),
        studentEmail: z.string().max(320).optional(),
        parentName: z.string().max(255).optional(),
        parentEmail: z.string().max(320).optional(),
        parentPhone: z.string().max(50).optional(),
        preferredCountry: z.string().max(100).optional(),
        programInterest: z.string().max(255).optional(),
        studyLevel: z.string().max(100).optional(),
        intakeDate: z.string().max(100).optional(),
        office: z.enum(OFFICES).optional(),
        assignedCounselorId: z.number().int().nullable().optional(),
        pipelineStage: z.enum(STAGES).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      // Default-assign to the creator if they're a counselor and none chosen.
      const assignee =
        input.assignedCounselorId !== undefined
          ? input.assignedCounselorId
          : ctx.user.crmRole === "counselor" ? ctx.user.id : null;
      const res = await db.insert(leads).values({
        studentName: input.studentName.trim(),
        studentPhone: input.studentPhone?.trim() || null,
        studentEmail: input.studentEmail?.trim() || null,
        parentName: input.parentName?.trim() || null,
        parentEmail: input.parentEmail?.trim() || null,
        parentPhone: input.parentPhone?.trim() || null,
        preferredCountry: input.preferredCountry?.trim() || null,
        programInterest: input.programInterest?.trim() || null,
        studyLevel: input.studyLevel?.trim() || null,
        intakeDate: input.intakeDate?.trim() || null,
        office: input.office ?? null,
        assignedCounselorId: assignee,
        pipelineStage: input.pipelineStage ?? "new_lead",
        source: "crm_manual",
      });
      const id = (res as any)[0]?.insertId as number;
      await logActivity(db, id, "note", "Student added to CRM", ctx.user.email);
      return { id };
    }),

  /** Edit a student's details. */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        studentName: z.string().min(1).max(255).optional(),
        studentPhone: z.string().max(50).nullable().optional(),
        studentEmail: z.string().max(320).nullable().optional(),
        parentName: z.string().max(255).nullable().optional(),
        parentEmail: z.string().max(320).nullable().optional(),
        parentPhone: z.string().max(50).nullable().optional(),
        preferredCountry: z.string().max(100).nullable().optional(),
        programInterest: z.string().max(255).nullable().optional(),
        studyLevel: z.string().max(100).nullable().optional(),
        intakeDate: z.string().max(100).nullable().optional(),
        office: z.enum(OFFICES).nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const { id, ...rest } = input;
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v === undefined) continue;
        patch[k] = typeof v === "string" ? v.trim() || null : v;
      }
      if (Object.keys(patch).length) await db.update(leads).set(patch).where(eq(leads.id, id));
      return { ok: true };
    }),

  /** Move a student to a different pipeline stage (logged on the timeline). */
  setStage: protectedProcedure
    .input(z.object({ id: z.number().int(), stage: z.enum(STAGES), note: z.string().max(500).optional() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await db.update(leads).set({ pipelineStage: input.stage }).where(eq(leads.id, input.id));
      await logActivity(
        db, input.id, "stage_change",
        `Stage → ${STAGE_LABEL[input.stage]}`, ctx.user.email, input.note?.trim() || null
      );
      return { ok: true };
    }),

  /** Assign / reassign a student's counselor. */
  assign: protectedProcedure
    .input(z.object({ id: z.number().int(), counselorId: z.number().int().nullable() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await db.update(leads).set({ assignedCounselorId: input.counselorId }).where(eq(leads.id, input.id));
      let who = "Unassigned";
      if (input.counselorId) {
        const [c] = await db.select({ name: users.name }).from(users).where(eq(users.id, input.counselorId)).limit(1);
        who = c?.name ?? "a counselor";
      }
      await logActivity(db, input.id, "note", `Assigned to ${who}`, ctx.user.email);
      return { ok: true };
    }),

  /** The engine: log an activity on a student (call, whatsapp, meeting, note...). */
  logActivity: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        activityType: z.enum(ACTIVITY_TYPES),
        title: z.string().min(1).max(500),
        description: z.string().max(4000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await logActivity(db, input.id, input.activityType, input.title.trim(), ctx.user.email, input.description?.trim() || null);
      return { ok: true };
    }),

  // ---- Tasks ----
  addTask: protectedProcedure
    .input(z.object({ studentId: z.number().int(), title: z.string().min(1).max(500), dueDate: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const [s] = await db.select({ name: leads.studentName }).from(leads).where(eq(leads.id, input.studentId)).limit(1);
      await db.insert(crmTasks).values({
        staffId: ctx.user.id,
        staffEmail: ctx.user.email ?? "",
        relatedType: "lead",
        relatedId: input.studentId,
        relatedName: s?.name ?? null,
        title: input.title.trim(),
        taskType: "follow_up",
        status: "pending",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      });
      return { ok: true };
    }),

  myTasks: protectedProcedure.query(async ({ ctx }) => {
    assertCrm(ctx.user);
    const db = await db_();
    return db
      .select()
      .from(crmTasks)
      .where(and(eq(crmTasks.staffId, ctx.user.id), inArray(crmTasks.status, ["pending", "in_progress"])))
      .orderBy(crmTasks.dueDate);
  }),

  toggleTask: protectedProcedure
    .input(z.object({ id: z.number().int(), done: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await db
        .update(crmTasks)
        .set({ status: input.done ? "done" : "pending", completedAt: input.done ? new Date() : null })
        .where(eq(crmTasks.id, input.id));
      return { ok: true };
    }),

  // ---- Documents (checklist; file upload arrives later) ----
  addDocument: protectedProcedure
    .input(z.object({ studentId: z.number().int(), docType: z.string().min(1).max(100), docLabel: z.string().min(1).max(255) }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await db.insert(crmStudentDocuments).values({
        leadId: input.studentId,
        docType: input.docType.trim(),
        docLabel: input.docLabel.trim(),
        status: "pending",
        staffEmail: ctx.user.email ?? null,
      });
      return { ok: true };
    }),

  setDocStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(["pending", "submitted", "verified", "rejected"]) }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const now = new Date();
      await db
        .update(crmStudentDocuments)
        .set({
          status: input.status,
          submittedAt: input.status === "submitted" ? now : undefined,
          verifiedAt: input.status === "verified" ? now : undefined,
        })
        .where(eq(crmStudentDocuments.id, input.id));
      return { ok: true };
    }),
});
