/**
 * CRM Parent Weekly Report (Phase 3) — generate / render / send.
 *
 * Flow (decided with the owner): drafts are created (Sunday), reviewed in the
 * dashboard, then sent (Monday 09:00 WIB). Email now; WhatsApp later via the bot.
 * The report reads the student's parent-visible activity from the last 7 days
 * plus the current snapshot. Unreviewed drafts with real content can still be
 * sent; empty ones are held.
 */
import { and, eq, gte, inArray, ne, isNotNull } from "drizzle-orm";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { sendEmail } from "./email";
import {
  leads,
  crmActivityTimeline,
  crmStudentDocuments,
  crmParentReports,
} from "../drizzle/schema";

const STAGE_LABEL: Record<string, string> = {
  new_lead: "New Lead", consultation: "Consultation", ielts_prep: "IELTS Prep",
  shortlist: "University Shortlist", application: "Application", offer: "Offer Received",
  visa: "Visa Process", pre_departure: "Pre-Departure", enrolled: "Enrolled", inactive: "Inactive",
};

export type ReportActivity = { id: number; date: string; title: string; include: boolean };
export type ReportSnapshot = {
  studentName: string;
  stage: string;
  stageLabel: string;
  country: string | null;
  program: string | null;
  studyLevel: string | null;
  intake: string | null;
  docsSubmitted: number;
  docsTotal: number;
  activities: ReportActivity[];
  generatedAt: string;
};

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** WIB "now" (UTC+7). */
export function wibNow(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

/** YYYY-MM-DD of the Monday of the given date's week (treating the date's UTC parts). */
export function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * The "report Monday" we're currently working toward (WIB). Mon–Sat → this
 * week's Monday (the batch sent/at-hand). Sunday → tomorrow's Monday, so the
 * Sunday-evening drafting and the dashboard line up with Monday's send.
 */
export function currentReportWeek(): string {
  const now = wibNow();
  if (now.getUTCDay() === 0) {
    return mondayOf(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  }
  return mondayOf(now);
}

export function parseSnapshot(raw: string | null): ReportSnapshot | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as ReportSnapshot; } catch { return null; }
}

/** Build the frozen snapshot for one student: last-7-days activity + status. */
async function buildSnapshot(db: Db, lead: typeof leads.$inferSelect): Promise<ReportSnapshot> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const acts = await db
    .select({ id: crmActivityTimeline.id, title: crmActivityTimeline.title, createdAt: crmActivityTimeline.createdAt })
    .from(crmActivityTimeline)
    .where(and(eq(crmActivityTimeline.leadId, lead.id), gte(crmActivityTimeline.createdAt, weekAgo)))
    .orderBy(crmActivityTimeline.createdAt);

  const docs = await db
    .select({ status: crmStudentDocuments.status })
    .from(crmStudentDocuments)
    .where(eq(crmStudentDocuments.leadId, lead.id));
  const docsTotal = docs.length;
  const docsSubmitted = docs.filter(d => d.status === "submitted" || d.status === "verified").length;

  return {
    studentName: lead.studentName,
    stage: lead.pipelineStage,
    stageLabel: STAGE_LABEL[lead.pipelineStage] ?? lead.pipelineStage,
    country: lead.preferredCountry,
    program: lead.programInterest,
    studyLevel: lead.studyLevel,
    intake: lead.intakeDate,
    docsSubmitted,
    docsTotal,
    activities: acts.map(a => ({
      id: a.id,
      date: new Date(a.createdAt).toISOString(),
      title: a.title,
      include: true,
    })),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Create draft reports for every active student with a parent email for the
 * given week. Idempotent: skips students that already have a row for the week.
 */
export async function generateDraftsForWeek(weekOf: string): Promise<{ created: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const active = await db
    .select()
    .from(leads)
    .where(and(ne(leads.pipelineStage, "inactive"), isNotNull(leads.parentEmail)));

  let created = 0, skipped = 0;
  for (const lead of active) {
    if (!lead.parentEmail || !lead.parentEmail.trim()) { skipped++; continue; }
    const [existing] = await db
      .select({ id: crmParentReports.id })
      .from(crmParentReports)
      .where(and(eq(crmParentReports.leadId, lead.id), eq(crmParentReports.weekOf, weekOf)))
      .limit(1);
    if (existing) { skipped++; continue; }

    const snapshot = await buildSnapshot(db, lead);
    await db.insert(crmParentReports).values({
      leadId: lead.id,
      weekOf,
      status: "draft",
      snapshot: JSON.stringify(snapshot),
      parentName: lead.parentName,
      parentEmail: lead.parentEmail,
      channelEmail: true,
      channelWhatsapp: false,
    });
    created++;
  }
  return { created, skipped };
}

function logoUrl(): string {
  const base = (ENV.appUrl?.replace(/\/+$/, "") || "https://www.spectaeducation.com");
  const abs = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  return `${abs}/files/migrated/QxrYSewOYzAuPIEN.jpeg`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

/** Render the branded bilingual (EN + ID) parent email. */
export function renderParentEmailHtml(snap: ReportSnapshot, parentName: string | null, summaryNote: string | null): string {
  const included = snap.activities.filter(a => a.include);
  const activityRows = included.length
    ? included.map(a => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;font-size:12px;white-space:nowrap;">${new Date(a.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${esc(a.title)}</td>
        </tr>`).join("")
    : `<tr><td colspan="2" style="padding:8px;color:#999;font-size:13px;">No new updates this week — your counselor will be in touch.</td></tr>`;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:7px 8px;font-weight:600;color:#555;font-size:13px;width:42%;">${label}</td>
      <td style="padding:7px 8px;font-size:13px;color:#222;">${value}</td>
    </tr>`;

  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;background:#f6f7f9;padding:20px;">
  <div style="text-align:center;padding:8px 0 16px;">
    <img src="${logoUrl()}" alt="SpecTa Education" style="height:42px;object-fit:contain;" />
  </div>
  <div style="background:linear-gradient(135deg,#E91E8C,#9C27B0);padding:22px 20px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="color:#fff;font-size:20px;font-weight:700;">Weekly Progress Report</div>
    <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:2px;">Laporan Kemajuan Mingguan</div>
  </div>
  <div style="background:#fff;padding:20px;">
    <p style="margin:0 0 12px;font-size:14px;color:#333;">Dear <strong>${esc(parentName || "Parent/Guardian")}</strong>,</p>
    <p style="margin:0 0 6px;font-size:14px;color:#555;line-height:1.6;">
      Here is this week's progress update for <strong>${esc(snap.studentName)}</strong>.
      ${summaryNote ? esc(summaryNote) : "We're committed to keeping you informed every step of the way."}
    </p>
    <p style="margin:0 0 16px;font-size:12.5px;color:#999;line-height:1.5;">
      Berikut perkembangan ${esc(snap.studentName)} minggu ini. Kami berkomitmen menjaga Anda tetap mendapat kabar di setiap langkah.
    </p>

    <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">
      ${row("Current stage / Tahap saat ini", `<span style="background:#9C27B01a;color:#9C27B0;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${esc(snap.stageLabel)}</span>`)}
      ${snap.country ? row("Destination / Negara tujuan", esc(snap.country)) : ""}
      ${snap.program ? row("Program / Jurusan", esc(snap.program)) : ""}
      ${snap.studyLevel ? row("Study level / Jenjang", esc(snap.studyLevel)) : ""}
      ${snap.intake ? row("Target intake / Target masuk", esc(snap.intake)) : ""}
      ${snap.docsTotal > 0 ? row("Documents / Dokumen", `<span style="color:${snap.docsSubmitted === snap.docsTotal ? "#22c55e" : "#f59e0b"};font-weight:600;">${snap.docsSubmitted}/${snap.docsTotal}</span> submitted`) : ""}
    </table>

    <div style="margin-top:18px;font-size:14px;font-weight:700;color:#333;">This week's activity / Aktivitas minggu ini</div>
    <table style="width:100%;border-collapse:collapse;margin-top:6px;">${activityRows}</table>

    <div style="margin-top:20px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:10px;padding:14px;">
      <div style="font-size:13px;color:#78350f;line-height:1.6;">
        Questions? Reply to this email or contact your counselor anytime.<br/>
        <span style="color:#92400e;">Ada pertanyaan? Balas email ini atau hubungi konselor Anda kapan saja.</span>
      </div>
    </div>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:14px 20px;border-top:1px solid #f0f0f0;text-align:center;">
    <div style="font-size:11px;color:#aaa;">SpecTa Education — Your Study Abroad Partner Since 2005<br/>
      You receive this because you are listed as ${esc(snap.studentName)}'s parent/guardian.</div>
  </div>
</div>`;
}

/** Send one report by id (email channel). Updates status to sent/failed. */
export async function sendReportById(id: number): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, error: "Database unavailable" };
  const [r] = await db.select().from(crmParentReports).where(eq(crmParentReports.id, id)).limit(1);
  if (!r) return { ok: false, error: "Report not found" };
  if (!r.parentEmail) {
    await db.update(crmParentReports).set({ status: "failed", error: "No parent email" }).where(eq(crmParentReports.id, id));
    return { ok: false, error: "No parent email" };
  }
  const snap = parseSnapshot(r.snapshot);
  if (!snap) {
    await db.update(crmParentReports).set({ status: "failed", error: "No snapshot" }).where(eq(crmParentReports.id, id));
    return { ok: false, error: "No snapshot" };
  }
  try {
    const html = renderParentEmailHtml(snap, r.parentName, r.summaryNote);
    const ok = await sendEmail({
      to: r.parentEmail,
      subject: `Weekly Progress Report: ${snap.studentName} — SpecTa Education`,
      html,
    });
    if (!ok) throw new Error("Email send returned false");
    await db.update(crmParentReports).set({ status: "sent", sentAt: new Date(), error: null }).where(eq(crmParentReports.id, id));
    return { ok: true };
  } catch (e: any) {
    await db.update(crmParentReports).set({ status: "failed", error: e?.message || "send error" }).where(eq(crmParentReports.id, id));
    return { ok: false, error: e?.message || "send error" };
  }
}

/** A report has "content" if at least one activity is included. */
function hasContent(snap: ReportSnapshot | null): boolean {
  return !!snap && snap.activities.some(a => a.include);
}

/**
 * Send all due reports for a week: status "approved", OR "draft" with content
 * (decision: unreviewed-but-has-content still goes; empty drafts are held).
 */
export async function sendDueForWeek(weekOf: string): Promise<{ sent: number; failed: number; held: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select()
    .from(crmParentReports)
    .where(and(eq(crmParentReports.weekOf, weekOf), inArray(crmParentReports.status, ["approved", "draft"])));

  let sent = 0, failed = 0, held = 0;
  for (const r of rows) {
    const snap = parseSnapshot(r.snapshot);
    if (r.status === "draft" && !hasContent(snap)) { held++; continue; }
    const res = await sendReportById(r.id);
    if (res.ok) sent++; else failed++;
  }
  return { sent, failed, held };
}

export { STAGE_LABEL as REPORT_STAGE_LABEL };
