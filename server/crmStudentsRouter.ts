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
import { and, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";

import { nanoid } from "nanoid";

import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { distributeUnassigned } from "./leadDistribution";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { sendWhatsAppText, whatsappConfigured, getBotConversation } from "./whatsappGateway";
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
  const ok = u.role === "admin" || u.crmRole === "owner" || (u.crmRole !== "none" && u.crmRole !== "marketing" && u.crmActive);
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
      // Hide archived ("inactive") students from the default list — they only
      // appear when you explicitly filter to the Inactive stage.
      else conds.push(ne(leads.pipelineStage, "inactive"));
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

  /**
   * Archive a student the counselor judges not a real prospect. This is a SOFT
   * delete: the record moves to the "inactive" stage (dropping off the main
   * list) but all data + marketing attribution is preserved and it can be
   * restored. The owner is notified whenever anyone but the owner archives.
   */
  archive: protectedProcedure
    .input(z.object({ id: z.number().int(), reason: z.string().max(500).optional() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const [student] = await db
        .select({ name: leads.studentName, phone: leads.studentPhone, stage: leads.pipelineStage })
        .from(leads).where(eq(leads.id, input.id)).limit(1);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(leads).set({ pipelineStage: "inactive" }).where(eq(leads.id, input.id));
      const reason = input.reason?.trim() || "No reason given";
      await logActivity(
        db, input.id, "note",
        "Archived — marked not a prospect",
        ctx.user.email,
        `By ${ctx.user.name || ctx.user.email}. Reason: ${reason}`
      );

      // Notify the owner unless the owner is the one archiving.
      const isOwner = ctx.user.role === "admin" || ctx.user.crmRole === "owner";
      if (!isOwner) {
        await notifyOwner({
          title: `Student archived: ${student.name}`,
          content:
            `${ctx.user.name || ctx.user.email} archived a student as "not a prospect".\n\n` +
            `Student: ${student.name}${student.phone ? ` (${student.phone})` : ""}\n` +
            `Was at stage: ${STAGE_LABEL[student.stage] || student.stage}\n` +
            `Reason: ${reason}\n\n` +
            `It's hidden from the active list but kept in the CRM (filter "Inactive" to view/restore).`,
        }).catch(e => console.warn("[CRM] archive owner-notify failed:", e));
      }
      return { ok: true };
    }),

  /** Restore an archived student back into the pipeline. */
  restore: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await db.update(leads).set({ pipelineStage: "new_lead" }).where(eq(leads.id, input.id));
      await logActivity(db, input.id, "note", "Restored to the pipeline", ctx.user.email);
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

  /** How many active leads are currently unassigned. */
  unassignedCount: protectedProcedure.query(async ({ ctx }) => {
    assertCrm(ctx.user);
    const db = await db_();
    const [r] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(leads)
      .where(and(sql`${leads.assignedCounselorId} IS NULL`, ne(leads.pipelineStage, "inactive")));
    return { count: Number(r?.c ?? 0) };
  }),

  /** Owner: evenly distribute all unassigned leads across offices + counsellors. */
  distributeUnassigned: protectedProcedure.mutation(async ({ ctx }) => {
    if (!(ctx.user.role === "admin" || ctx.user.crmRole === "owner")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Owner only." });
    }
    return distributeUnassigned();
  }),

  // ---- WhatsApp copilot ----

  /** Whether sending WhatsApp from the CRM is wired up. */
  whatsappReady: protectedProcedure.query(({ ctx }) => {
    assertCrm(ctx.user);
    return { ready: whatsappConfigured() };
  }),

  /** The student's WhatsApp conversation (pulled live from the bot). */
  conversation: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const [lead] = await db.select({ phone: leads.studentPhone }).from(leads).where(eq(leads.id, input.id)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      if (!whatsappConfigured()) return { ready: false, hasPhone: !!lead.phone, messages: [] as any[] };
      if (!lead.phone) return { ready: true, hasPhone: false, messages: [] as any[] };
      const messages = await getBotConversation(lead.phone);
      return { ready: true, hasPhone: true, messages };
    }),

  /** Send a WhatsApp message to the student (via the bot), logged on the timeline. */
  sendWhatsApp: protectedProcedure
    .input(z.object({ id: z.number().int(), text: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const [lead] = await db.select({ phone: leads.studentPhone }).from(leads).where(eq(leads.id, input.id)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      if (!lead.phone) throw new TRPCError({ code: "BAD_REQUEST", message: "This student has no phone number." });
      const res = await sendWhatsAppText(lead.phone, input.text.trim());
      if (!res.ok) {
        throw new TRPCError({
          code: res.skipped ? "PRECONDITION_FAILED" : "INTERNAL_SERVER_ERROR",
          message: res.error || "Send failed",
        });
      }
      await logActivity(db, input.id, "whatsapp", `WhatsApp sent: ${input.text.trim().slice(0, 140)}`, ctx.user.email);
      return { ok: true };
    }),

  /** AI-draft a personalised WhatsApp follow-up from the student's CRM status. */
  draftWhatsApp: protectedProcedure
    .input(z.object({ id: z.number().int(), intent: z.string().max(300).optional() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.id)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      const acts = await db
        .select({ title: crmActivityTimeline.title })
        .from(crmActivityTimeline)
        .where(eq(crmActivityTimeline.leadId, input.id))
        .orderBy(desc(crmActivityTimeline.createdAt))
        .limit(6);
      const docs = await db.select({ status: crmStudentDocuments.status }).from(crmStudentDocuments).where(eq(crmStudentDocuments.leadId, input.id));
      const convo = lead.studentPhone ? await getBotConversation(lead.studentPhone, 12) : [];
      const transcript = convo
        .map(m => `${m.direction === "inbound" ? "Student" : "Emma"}: ${String(m.content).slice(0, 300)}`)
        .join("\n");
      const context = {
        name: lead.studentName,
        stage: STAGE_LABEL[lead.pipelineStage] ?? lead.pipelineStage,
        country: lead.preferredCountry,
        program: lead.programInterest,
        studyLevel: lead.studyLevel,
        intake: lead.intakeDate,
        documentsSubmitted: docs.filter(d => d.status === "submitted" || d.status === "verified").length,
        documentsTotal: docs.length,
        recentActivity: acts.map(a => a.title),
        recentConversation: transcript || "(no WhatsApp history available)",
      };
      const system =
        "You are a warm, senior counsellor at SpecTa Education, a Jakarta study-abroad consultancy. " +
        "Write ONE short WhatsApp message in Bahasa Indonesia to this student — casual-professional senior-counsellor tone, 2–4 sentences. " +
        "Do NOT use a formal 'Dear'; start naturally. Use *bold* sparingly (WhatsApp style). Personalise using their status and the recent conversation. " +
        (transcript ? "Continue/reply to the recentConversation naturally — don't repeat what's already been said. " : "") +
        (input.intent
          ? `The counsellor's goal for this message: ${input.intent}. `
          : "Write a friendly check-in / next-step nudge based on where they are in their journey. ") +
        "Output ONLY the message text — no quotes, no preamble, no sign-off name.";
      const res = await invokeLLM({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(context) },
        ],
      });
      const content = res.choices?.[0]?.message?.content;
      const draft = (typeof content === "string" ? content : "").trim();
      return { draft };
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

  deleteTask: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await db.delete(crmTasks).where(eq(crmTasks.id, input.id));
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

  /** Upload an actual file (PDF/JPG/PNG) for a document → R2, marked submitted. */
  uploadDocument: protectedProcedure
    .input(
      z.object({
        studentId: z.number().int(),
        docLabel: z.string().min(1).max(255),
        fileName: z.string().min(1).max(255),
        fileType: z.string().max(100),
        fileBase64: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      const buffer = Buffer.from(input.fileBase64, "base64");
      if (buffer.length > 16 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File too large (max 16MB)." });
      }
      const safeName = input.fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
      const docType = input.docLabel.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 60);
      const key = `crm/documents/${input.studentId}/${nanoid(8)}-${safeName}`;
      const { url } = await storagePut(key, buffer, input.fileType || "application/octet-stream");
      await db.insert(crmStudentDocuments).values({
        leadId: input.studentId,
        docType,
        docLabel: input.docLabel.trim(),
        status: "submitted",
        fileUrl: url,
        fileKey: key,
        fileName: input.fileName,
        fileMimeType: input.fileType,
        submittedAt: new Date(),
        staffEmail: ctx.user.email ?? null,
      });
      await logActivity(db, input.studentId, "document", `Uploaded document: ${input.docLabel.trim()}`, ctx.user.email);
      return { ok: true, url };
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      assertCrm(ctx.user);
      const db = await db_();
      await db.delete(crmStudentDocuments).where(eq(crmStudentDocuments.id, input.id));
      return { ok: true };
    }),
});
