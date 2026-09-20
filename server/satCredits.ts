/**
 * SpecTa SAT Self-Prep — live Emma allowance + paid credit.
 *   Free: SAT_LIVE_WEEKLY_MINUTES per student per calendar week, Mon–Sun Jakarta (default 120).
 *   Paid: Rp 129,000 per hour via Xendit (external_id SATCR-...), stored as
 *   seconds on sat_students.liveCreditSeconds, never expires, used only after
 *   the week's free minutes are gone.
 */

import { and, eq, gte, ne, sql } from "drizzle-orm";
import { getDb } from "./db";
import { satStudents, satLiveSessions, satCreditOrders } from "../drizzle/schema";
import { SAT_LIVE_WEEKLY_MINUTES, SAT_LIVE_MAX_SECONDS, liveWeekStart, liveWeekEnd } from "./satLiveAgent";

export async function liveAllowance(studentId: number, creditSec: number): Promise<{ usedWeekSec: number; freeRemainingSec: number; creditSec: number; availableSec: number; weekResetsAt: number }> {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const since = liveWeekStart();
  const today = await db.select({ seconds: satLiveSessions.seconds, startedAt: satLiveSessions.startedAt, endedAt: satLiveSessions.endedAt }).from(satLiveSessions).where(and(eq(satLiveSessions.studentId, studentId), gte(satLiveSessions.startedAt, since)));
  // Open calls (no endedAt yet, e.g. a dropped tab) count by elapsed time, capped at one call's max.
  const usedWeekSec = today.reduce((x, r) => x + (r.endedAt ? r.seconds : Math.min(SAT_LIVE_MAX_SECONDS, Math.round((Date.now() - new Date(r.startedAt).getTime()) / 1000))), 0);
  const freeRemainingSec = Math.max(0, SAT_LIVE_WEEKLY_MINUTES * 60 - usedWeekSec);
  return { usedWeekSec, freeRemainingSec, creditSec: Math.max(0, creditSec), availableSec: freeRemainingSec + Math.max(0, creditSec), weekResetsAt: liveWeekEnd().getTime() };
}

/** Xendit webhook: mark the order and add hours to the student's balance (idempotent). */
export async function applySatCreditPayment(externalId: string, status: string, invoiceId?: string): Promise<{ credited: boolean; hours?: number; amount?: number; studentName?: string; studentEmail?: string; reason?: string }> {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const [order] = await db.select().from(satCreditOrders).where(eq(satCreditOrders.externalId, externalId)).limit(1);
  if (!order) return { credited: false, reason: "order not found" };
  if (status === "PAID" || status === "SETTLED") {
    if (order.status === "paid") return { credited: false, reason: "already processed" };
    const r = await db.update(satCreditOrders).set({ status: "paid", paidAt: new Date(), xenditInvoiceId: invoiceId || order.xenditInvoiceId }).where(and(eq(satCreditOrders.id, order.id), ne(satCreditOrders.status, "paid")));
    const n = Number((r as any)?.[0]?.affectedRows ?? 0);
    if (n !== 1) return { credited: false, reason: "already processed" };
    await db.update(satStudents).set({ liveCreditSeconds: sql`liveCreditSeconds + ${order.hours * 3600}` }).where(eq(satStudents.id, order.studentId));
    const [s] = await db.select().from(satStudents).where(eq(satStudents.id, order.studentId)).limit(1);
    console.log(`[SAT credit] ${externalId}: +${order.hours}h for student ${order.studentId}`);
    return { credited: true, hours: order.hours, amount: order.amount, studentName: s?.name, studentEmail: s?.email };
  }
  if (status === "EXPIRED" || status === "FAILED") {
    if (order.status === "pending") await db.update(satCreditOrders).set({ status: status === "EXPIRED" ? "expired" : "failed" }).where(eq(satCreditOrders.id, order.id));
  }
  return { credited: false, reason: `status ${status}` };
}
