/**
 * CRM — Owner cockpit (Phase 4). One read-only `overview` query that powers the
 * monitoring dashboard: pipeline funnel, headline stats, per-counselor activity
 * this week, attention alerts (stale students / missing parent contact), and a
 * summary of this week's parent reports. Owner-only.
 */
import { TRPCError } from "@trpc/server";
import { and, eq, gte, ne, isNotNull, or, sql } from "drizzle-orm";

import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { leads, users, crmActivityTimeline, crmTasks, crmParentReports } from "../drizzle/schema";
import { currentReportWeek } from "./crmParentReports";

const STAGE_ORDER = [
  "new_lead", "consultation", "ielts_prep", "shortlist", "application",
  "offer", "visa", "pre_departure", "enrolled",
] as const;
const STAGE_LABEL: Record<string, string> = {
  new_lead: "New Lead", consultation: "Consultation", ielts_prep: "IELTS Prep",
  shortlist: "Shortlist", application: "Application", offer: "Offer",
  visa: "Visa", pre_departure: "Pre-Departure", enrolled: "Enrolled", inactive: "Inactive",
};

function isOwner(u: { role: string; crmRole: string | null }) {
  return u.role === "admin" || u.crmRole === "owner";
}

export const crmCockpitRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    if (!isOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Owner only." });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const now = Date.now();
    const d7 = new Date(now - 7 * 864e5);
    const d14 = new Date(now - 14 * 864e5);
    const n = (v: unknown) => Number(v ?? 0);

    // --- Funnel ---
    const stageRows = await db
      .select({ stage: leads.pipelineStage, c: sql<number>`COUNT(*)` })
      .from(leads)
      .groupBy(leads.pipelineStage);
    const stageCount = new Map<string, number>(stageRows.map(r => [r.stage, n(r.c)]));
    const funnel = STAGE_ORDER.map(s => ({ stage: s, label: STAGE_LABEL[s], count: stageCount.get(s) ?? 0 }));
    const inactive = stageCount.get("inactive") ?? 0;
    const enrolled = stageCount.get("enrolled") ?? 0;
    const activeStudents = funnel.reduce((a, f) => a + f.count, 0); // excludes inactive

    const [newRow] = await db.select({ c: sql<number>`COUNT(*)` }).from(leads).where(gte(leads.createdAt, d7));
    const [withParentRow] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(leads)
      .where(and(ne(leads.pipelineStage, "inactive"), isNotNull(leads.parentEmail)));
    const newThisWeek = n(newRow?.c);
    const withParent = n(withParentRow?.c);

    // --- Team activity (last 7 days) ---
    const members = await db
      .select({ id: users.id, name: users.name, email: users.email, crmRole: users.crmRole, office: users.office })
      .from(users)
      .where(and(eq(users.crmActive, true), or(eq(users.role, "admin"), ne(users.crmRole, "none"))));

    const actRows = await db
      .select({
        email: crmActivityTimeline.staffEmail,
        logged: sql<number>`COUNT(*)`,
        touched: sql<number>`COUNT(DISTINCT ${crmActivityTimeline.leadId})`,
      })
      .from(crmActivityTimeline)
      .where(gte(crmActivityTimeline.createdAt, d7))
      .groupBy(crmActivityTimeline.staffEmail);
    const actByEmail = new Map(actRows.map(r => [r.email ?? "", { logged: n(r.logged), touched: n(r.touched) }]));

    const doneRows = await db
      .select({ staffId: crmTasks.staffId, c: sql<number>`COUNT(*)` })
      .from(crmTasks)
      .where(and(eq(crmTasks.status, "done"), gte(crmTasks.completedAt, d7)))
      .groupBy(crmTasks.staffId);
    const doneById = new Map(doneRows.map(r => [r.staffId, n(r.c)]));

    const openRows = await db
      .select({ staffId: crmTasks.staffId, c: sql<number>`COUNT(*)` })
      .from(crmTasks)
      .where(sql`${crmTasks.status} IN ('pending','in_progress')`)
      .groupBy(crmTasks.staffId);
    const openById = new Map(openRows.map(r => [r.staffId, n(r.c)]));

    const assignedRows = await db
      .select({ cid: leads.assignedCounselorId, c: sql<number>`COUNT(*)` })
      .from(leads)
      .where(and(isNotNull(leads.assignedCounselorId), ne(leads.pipelineStage, "inactive")))
      .groupBy(leads.assignedCounselorId);
    const assignedById = new Map(assignedRows.map(r => [r.cid as number, n(r.c)]));

    const team = members.map(m => {
      const a = actByEmail.get(m.email ?? "") ?? { logged: 0, touched: 0 };
      return {
        id: m.id,
        name: m.name ?? m.email ?? "—",
        crmRole: m.crmRole,
        office: m.office,
        assigned: assignedById.get(m.id) ?? 0,
        studentsTouched: a.touched,
        activitiesLogged: a.logged,
        tasksDone: doneById.get(m.id) ?? 0,
        openTasks: openById.get(m.id) ?? 0,
      };
    });

    // --- Attention alerts ---
    const nameById = new Map<number, string>();
    (await db.select({ id: users.id, name: users.name }).from(users)).forEach(u => nameById.set(u.id, u.name ?? "—"));

    const activeLeads = await db
      .select({
        id: leads.id, studentName: leads.studentName, parentEmail: leads.parentEmail,
        assignedCounselorId: leads.assignedCounselorId, createdAt: leads.createdAt,
      })
      .from(leads)
      .where(ne(leads.pipelineStage, "inactive"));

    const lastActRows = await db
      .select({ leadId: crmActivityTimeline.leadId, last: sql<string>`MAX(${crmActivityTimeline.createdAt})` })
      .from(crmActivityTimeline)
      .groupBy(crmActivityTimeline.leadId);
    const lastById = new Map<number, number>(lastActRows.map(r => [r.leadId, new Date(r.last as any).getTime()]));

    const stale: any[] = [];
    const missingParent: any[] = [];
    for (const l of activeLeads) {
      const counselor = l.assignedCounselorId ? (nameById.get(l.assignedCounselorId) ?? "—") : null;
      if (!l.parentEmail || !l.parentEmail.trim()) {
        missingParent.push({ id: l.id, studentName: l.studentName, counselor });
      }
      const lastMs = lastById.get(l.id) ?? new Date(l.createdAt).getTime();
      if (lastMs < d14.getTime()) {
        stale.push({
          id: l.id, studentName: l.studentName, counselor,
          lastActivity: lastById.has(l.id) ? new Date(lastById.get(l.id)!).toISOString() : null,
        });
      }
    }
    stale.sort((a, b) => (a.lastActivity ? new Date(a.lastActivity).getTime() : 0) - (b.lastActivity ? new Date(b.lastActivity).getTime() : 0));

    // --- Reports this week ---
    const weekOf = currentReportWeek();
    const repRows = await db
      .select({ status: crmParentReports.status, c: sql<number>`COUNT(*)` })
      .from(crmParentReports)
      .where(eq(crmParentReports.weekOf, weekOf))
      .groupBy(crmParentReports.status);
    const reportCounts: Record<string, number> = { draft: 0, approved: 0, sent: 0, failed: 0, skipped: 0 };
    repRows.forEach(r => { reportCounts[r.status] = n(r.c); });

    return {
      stats: { activeStudents, newThisWeek, enrolled, inactive, withParent },
      funnel,
      team,
      alerts: {
        stale: stale.slice(0, 30),
        staleTotal: stale.length,
        missingParent: missingParent.slice(0, 30),
        missingParentTotal: missingParent.length,
      },
      reports: { weekOf, counts: reportCounts },
    };
  }),
});
