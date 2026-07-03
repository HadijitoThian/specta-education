/**
 * Lead distribution — spread unassigned leads evenly across the 3 offices, then
 * across each office's counsellors (least-loaded wins, so it self-balances; no
 * stored round-robin pointer needed).
 *
 * Used both for new leads (auto-assign at creation) and for the backlog button.
 * Only active counsellors (crmRole "counselor") receive leads. Intake-form leads
 * keep their own counsellor and are never reshuffled.
 */
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { getDb } from "./db";
import { leads, users, crmActivityTimeline } from "../drizzle/schema";
import { sendEmail } from "./email";

const OFFICE_ORDER = ["kelapa_gading", "pik", "gading_serpong", "singkawang"];
const OFFICE_LABEL: Record<string, string> = {
  kelapa_gading: "Kelapa Gading", pik: "PIK", gading_serpong: "Gading Serpong", singkawang: "Singkawang",
};

type Counsellor = { id: number; name: string | null; email: string | null; office: string | null };
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function activeCounsellors(db: Db): Promise<Counsellor[]> {
  return db
    .select({ id: users.id, name: users.name, email: users.email, office: users.office })
    .from(users)
    .where(and(eq(users.crmRole, "counselor"), eq(users.crmActive, true)));
}

/** Current active-lead count per counsellor id. */
async function counsellorLoads(db: Db): Promise<Map<number, number>> {
  const rows = await db
    .select({ cid: leads.assignedCounselorId, c: sql<number>`COUNT(*)` })
    .from(leads)
    .where(and(isNotNull(leads.assignedCounselorId), ne(leads.pipelineStage, "inactive")))
    .groupBy(leads.assignedCounselorId);
  const m = new Map<number, number>();
  rows.forEach(r => m.set(r.cid as number, Number(r.c)));
  return m;
}

/**
 * Pick the next counsellor: office with the fewest leads (so the 3 branches
 * stay even), then the least-loaded counsellor within it.
 */
function choose(counsellors: Counsellor[], load: Map<number, number>): Counsellor | null {
  if (!counsellors.length) return null;
  // Group by office (only offices that actually have counsellors).
  const byOffice = new Map<string, Counsellor[]>();
  for (const c of counsellors) {
    const off = c.office || "_none";
    if (!byOffice.has(off)) byOffice.set(off, []);
    byOffice.get(off)!.push(c);
  }
  const officeLoad = (off: string) =>
    (byOffice.get(off) || []).reduce((s, c) => s + (load.get(c.id) || 0), 0);

  // Offices present, in a stable order (the 3 known ones first).
  const offices = Array.from(byOffice.keys()).sort((a, b) => {
    const ia = OFFICE_ORDER.indexOf(a), ib = OFFICE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  let bestOffice = offices[0];
  for (const off of offices) if (officeLoad(off) < officeLoad(bestOffice)) bestOffice = off;

  const pool = byOffice.get(bestOffice)!;
  let best = pool[0];
  for (const c of pool) if ((load.get(c.id) || 0) < (load.get(best.id) || 0)) best = c;
  return best;
}

async function assign(db: Db, leadId: number, c: Counsellor, studentName: string) {
  await db.update(leads).set({ assignedCounselorId: c.id, office: (c.office as any) || null }).where(eq(leads.id, leadId));
  await db.insert(crmActivityTimeline).values({
    leadId, activityType: "note",
    title: `Auto-assigned to ${c.name || "counsellor"}${c.office ? ` (${OFFICE_LABEL[c.office] || c.office})` : ""}`,
    staffEmail: null,
  });
  if (c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
    sendEmail({
      to: c.email,
      subject: `New lead assigned to you: ${studentName}`,
      html: `<p>A new lead has been assigned to you in the SpecTa CRM:</p>
        <p><strong>${studentName}</strong></p>
        <p><a href="https://www.spectaeducation.com/crm/students/${leadId}">Open in CRM →</a></p>`,
    }).catch(() => {});
  }
}

/**
 * Auto-assign a single (new) lead. Best-effort; no-op if it's already assigned
 * or no counsellors.
 *
 * GATED by CRM_AUTO_ASSIGN_ENABLED — owner's rule: new leads stay unassigned
 * so an admin can pick who gets them. Set the Railway env
 * `CRM_AUTO_ASSIGN_ENABLED=true` to re-enable round-robin distribution.
 * (The manual "distribute backlog" admin button uses `distributeUnassigned`
 * directly and is NOT gated — admin explicitly asked for it.)
 */
export async function distributeOne(leadId: number): Promise<{ ok: boolean; counsellorId?: number }> {
  try {
    const autoAssignEnabled = String(process.env.CRM_AUTO_ASSIGN_ENABLED || "").toLowerCase() === "true";
    if (!autoAssignEnabled) {
      // New leads stay unassigned; admin will assign them manually in /crm.
      return { ok: false };
    }
    const db = await getDb();
    if (!db) return { ok: false };
    const [lead] = await db.select({ id: leads.id, name: leads.studentName, assigned: leads.assignedCounselorId }).from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!lead || lead.assigned) return { ok: false };
    const counsellors = await activeCounsellors(db);
    const load = await counsellorLoads(db);
    const c = choose(counsellors, load);
    if (!c) return { ok: false };
    await assign(db, leadId, c, lead.name);
    return { ok: true, counsellorId: c.id };
  } catch {
    return { ok: false };
  }
}

/** Distribute ALL currently-unassigned active leads evenly. Returns a summary. */
export async function distributeUnassigned(): Promise<{ assigned: number; perCounsellor: { name: string; office: string | null; count: number }[] }> {
  const db = await getDb();
  if (!db) return { assigned: 0, perCounsellor: [] };
  const counsellors = await activeCounsellors(db);
  if (!counsellors.length) return { assigned: 0, perCounsellor: [] };
  const load = await counsellorLoads(db);

  const unassigned = await db
    .select({ id: leads.id, name: leads.studentName })
    .from(leads)
    .where(and(sql`${leads.assignedCounselorId} IS NULL`, ne(leads.pipelineStage, "inactive")));

  const tally = new Map<number, number>();
  let assigned = 0;
  for (const lead of unassigned) {
    const c = choose(counsellors, load);
    if (!c) break;
    await assign(db, lead.id, c, lead.name);
    load.set(c.id, (load.get(c.id) || 0) + 1); // keep balancing as we go
    tally.set(c.id, (tally.get(c.id) || 0) + 1);
    assigned++;
  }
  const perCounsellor = counsellors
    .filter(c => tally.has(c.id))
    .map(c => ({ name: c.name || `#${c.id}`, office: c.office, count: tally.get(c.id) || 0 }));
  return { assigned, perCounsellor };
}
