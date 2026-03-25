/**
 * CRM Database Helpers — Sprint 1
 * Handles tasks, pipeline stages, consultation notes, and performance snapshots
 */

import { getDb, withDbRetry } from "./db";
import {
  crmTasks, leadPipelineStages, consultationNotes, counselorPerformance,
  leads, applications, staffAccounts,
  type CrmTask, type InsertCrmTask,
  type LeadPipelineStage, type InsertLeadPipelineStage,
  type ConsultationNote, type InsertConsultationNote,
  type CounselorPerformance,
} from "../drizzle/schema";
import { eq, and, desc, asc, gte, lte, sql, isNull, or, ne } from "drizzle-orm";

// ─── CRM Tasks ───────────────────────────────────────────────────────────────

export async function getTasksByStaff(staffId: number): Promise<CrmTask[]> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(crmTasks)
      .where(eq(crmTasks.staffId, staffId))
      .orderBy(
        asc(crmTasks.status),
        desc(sql`FIELD(${crmTasks.priority}, 'urgent', 'high', 'medium', 'low')`),
        asc(crmTasks.dueDate)
      );
  });
}

export async function getTodayTasksByStaff(staffId: number): Promise<CrmTask[]> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return db.select().from(crmTasks)
      .where(and(
        eq(crmTasks.staffId, staffId),
        or(
          and(gte(crmTasks.dueDate, todayStart), lte(crmTasks.dueDate, todayEnd)),
          isNull(crmTasks.dueDate)
        ),
        ne(crmTasks.status, "done"),
        ne(crmTasks.status, "skipped")
      ))
      .orderBy(
        desc(sql`FIELD(${crmTasks.priority}, 'urgent', 'high', 'medium', 'low')`),
        asc(crmTasks.dueDate)
      );
  });
}

export async function createCrmTask(data: InsertCrmTask): Promise<number> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [result] = await db.insert(crmTasks).values(data);
    return (result as any).insertId as number;
  });
}

export async function updateCrmTask(id: number, data: Partial<InsertCrmTask>): Promise<void> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(crmTasks).set(data).where(eq(crmTasks.id, id));
  });
}

export async function deleteCrmTask(id: number): Promise<void> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(crmTasks).where(eq(crmTasks.id, id));
  });
}

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

export async function getLeadPipelineStage(leadId: number): Promise<LeadPipelineStage | null> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [row] = await db.select().from(leadPipelineStages).where(eq(leadPipelineStages.leadId, leadId));
    return row ?? null;
  });
}

export async function upsertLeadPipelineStage(
  leadId: number,
  stage: LeadPipelineStage["stage"],
  changedBy: string,
  note?: string
): Promise<void> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await getLeadPipelineStage(leadId);
    if (existing) {
      await db.update(leadPipelineStages).set({
        previousStage: existing.stage,
        stage,
        stageChangedAt: new Date(),
        stageChangedBy: changedBy,
        stageNote: note ?? null,
        updatedAt: new Date(),
      }).where(eq(leadPipelineStages.leadId, leadId));
    } else {
      await db.insert(leadPipelineStages).values({
        leadId,
        stage,
        stageChangedAt: new Date(),
        stageChangedBy: changedBy,
        stageNote: note ?? null,
      });
    }
  });
}

export async function getPipelineByStaff(staffEmail: string): Promise<Array<{
  lead: typeof leads.$inferSelect;
  pipeline: LeadPipelineStage;
}>> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db
      .select({ lead: leads, pipeline: leadPipelineStages })
      .from(leads)
      .innerJoin(leadPipelineStages, eq(leads.id, leadPipelineStages.leadId))
      .where(eq(leads.assignedTo, staffEmail))
      .orderBy(desc(leadPipelineStages.leadScore), desc(leads.createdAt));
    return rows;
  });
}

export async function getAllPipelineLeads(): Promise<Array<{
  lead: typeof leads.$inferSelect;
  pipeline: LeadPipelineStage;
}>> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db
      .select({ lead: leads, pipeline: leadPipelineStages })
      .from(leads)
      .innerJoin(leadPipelineStages, eq(leads.id, leadPipelineStages.leadId))
      .orderBy(desc(leadPipelineStages.leadScore), desc(leads.createdAt));
  });
}

// Ensure all leads assigned to a counselor have a pipeline stage entry
export async function ensurePipelineStagesForCounselor(staffEmail: string): Promise<number> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const assignedLeads = await db.select().from(leads).where(eq(leads.assignedTo, staffEmail));
    let created = 0;
    for (const lead of assignedLeads) {
      const existing = await getLeadPipelineStage(lead.id);
      if (!existing) {
        const stage = lead.status === "new" ? "new"
          : lead.status === "contacted" ? "contacted"
          : lead.status === "qualified" ? "qualified"
          : lead.status === "converted" ? "enrolled"
          : lead.status === "closed" ? "completed"
          : "new";
        await db.insert(leadPipelineStages).values({
          leadId: lead.id,
          stage,
          stageChangedAt: new Date(),
          stageChangedBy: "system",
          leadScore: 50,
        });
        created++;
      }
    }
    return created;
  });
}

// ─── Consultation Notes ───────────────────────────────────────────────────────

export async function getConsultationNotesByLead(leadId: number): Promise<ConsultationNote[]> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(consultationNotes)
      .where(and(eq(consultationNotes.relatedType, "lead"), eq(consultationNotes.relatedId, leadId)))
      .orderBy(desc(consultationNotes.createdAt));
  });
}

export async function getConsultationNotesByApplication(applicationId: number): Promise<ConsultationNote[]> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(consultationNotes)
      .where(and(eq(consultationNotes.relatedType, "application"), eq(consultationNotes.relatedId, applicationId)))
      .orderBy(desc(consultationNotes.createdAt));
  });
}

export async function createConsultationNote(data: InsertConsultationNote): Promise<number> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [result] = await db.insert(consultationNotes).values(data);
    return (result as any).insertId as number;
  });
}

// Alias for AI procedures
export async function getNotesByLeadId(leadId: number): Promise<ConsultationNote[]> {
  return getConsultationNotesByLead(leadId);
}

// ─── Counselor Performance ────────────────────────────────────────────────────

export async function getCounselorPerformanceByStaff(staffId: number, days = 30): Promise<CounselorPerformance[]> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const since = new Date();
    since.setDate(since.getDate() - days);
    return db.select().from(counselorPerformance)
      .where(and(
        eq(counselorPerformance.staffId, staffId),
        gte(counselorPerformance.createdAt, since)
      ))
      .orderBy(desc(counselorPerformance.snapshotDate));
  });
}

export async function getAllCounselorPerformanceLatest(): Promise<CounselorPerformance[]> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    // Get the latest snapshot per staff member
    const today = new Date().toISOString().split("T")[0];
    return db.select().from(counselorPerformance)
      .where(eq(counselorPerformance.snapshotDate, today))
      .orderBy(desc(counselorPerformance.leadsConverted));
  });
}

export async function upsertCounselorPerformanceSnapshot(staffId: number, staffEmail: string): Promise<void> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const today = new Date().toISOString().split("T")[0];

    // Count leads assigned to this counselor
    const allLeads = await db.select().from(leads).where(eq(leads.assignedTo, staffEmail));
    const leadsAssigned = allLeads.length;
    const leadsContacted = allLeads.filter(l => l.status !== "new").length;
    const leadsQualified = allLeads.filter(l => l.status === "qualified" || l.status === "converted").length;
    const leadsConverted = allLeads.filter(l => l.status === "converted").length;

    // Count tasks
    const allTasks = await db.select().from(crmTasks).where(eq(crmTasks.staffId, staffId));
    const tasksCompleted = allTasks.filter(t => t.status === "done").length;
    const tasksPending = allTasks.filter(t => t.status === "pending" || t.status === "in_progress").length;

    // Count applications
    const allApps = await db.select().from(applications)
      .where(eq(applications.assignedCounselor, staffEmail));
    const applicationsActive = allApps.filter(a => !["enrolled", "rejected"].includes(a.status)).length;
    const applicationsCompleted = allApps.filter(a => a.status === "enrolled").length;

    const conversionRate = leadsAssigned > 0
      ? ((leadsConverted / leadsAssigned) * 100).toFixed(1)
      : "0.0";

    // Check if today's snapshot exists
    const [existing] = await db.select().from(counselorPerformance)
      .where(and(
        eq(counselorPerformance.staffId, staffId),
        eq(counselorPerformance.snapshotDate, today)
      ));

    if (existing) {
      await db.update(counselorPerformance).set({
        leadsAssigned, leadsContacted, leadsQualified, leadsConverted,
        applicationsActive, applicationsCompleted,
        tasksCompleted, tasksPending, conversionRate,
      }).where(eq(counselorPerformance.id, existing.id));
    } else {
      await db.insert(counselorPerformance).values({
        staffId, staffEmail, snapshotDate: today,
        leadsAssigned, leadsContacted, leadsQualified, leadsConverted,
        applicationsActive, applicationsCompleted,
        tasksCompleted, tasksPending, conversionRate,
      });
    }
  });
}
