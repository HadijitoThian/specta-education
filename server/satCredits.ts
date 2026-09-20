/**
 * SpecTa SAT Self-Prep — live Emma allowance + paid credit.
 *   Free: SAT_LIVE_DAILY_MINUTES per student per day (default 60).
 *   Paid: Rp 129,000 per hour via Xendit (external_id SATCR-...), stored as
 *   seconds on sat_students.liveCreditSeconds, never expires, used only after
 *   the day's free minutes are gone.
 */

import { and, eq, gte } from "drizzle-orm";
import { getDb } from "./db";
import { satStudents, satLiveSessions, satCreditOrders } from "../drizzle/schema";
import { SAT_LIVE_DAILY_MINUTES, SAT_LIVE_MAX_SECONDS } from "./satLiveAgent";

export async function liveAllowance(studentId: number, creditSec: number): Promise<{ usedTodaySec: number; freeRemainingSec: number; creditSec: number; availableSec: number }> {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const today = await db.select({ seconds: satLiveSessions.seconds, startedAt: satLiveSessions.startedAt, endedAt: satLiveSessions.endedAt }).from(satLiveSessions).where(and(eq(satLiveSessions.studentId, studentId), gte(satLiveSessions.startedAt, since)));
  // Open calls (no endedAt yet, e.g. a dropped tab) count by elapsed time, capped at one call's max.
  const usedTodaySec = today.reduce((x, r) => x + (r.endedAt ? r.seconds : Math.min(SAT_LIVE_MAX_SECONDS, Math.round((Date.now() - new Date(r.startedAt).getTime()) / 1000))), 0);
  const freeRemainingSec = Math.max(0, SAT_LIVE_DAILY_MINUTES * 60 - usedTodaySec);
  return { usedTodaySec, freeRemainingSec, creditSec: Math.max(0, creditSec), availableSec: freeRemainingSec + Math.max(0, creditSec) };
}

/** Xendit webhook: mark the order and add hours to the student's balance (idempotent). */
export async function applySatCreditPayment(externalId: string, status: string, invoiceId?: string): Promise<{ credited: boolean; hours?: number; amount?: number; studentName?: string; studentEmail?: string; reason?: string }> {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const [order] = await db.select().from(satCreditOrders).where(eq(satCreditOrders.externalId, externalId)).limit(1);
  if (!order) return { credited: false, reason: "order not found" };
  if (status === "PAID" || status === "SETTLED") {
    if (order.status === "paid") return { credited: false, reason: "already processed" };
    await db.update(satCreditOrders).set({ status: "paid", paidAt: new Date(), xenditInvoiceId: invoiceId || order.xenditInvoiceId }).where(eq(satCreditOrders.id, order.id));
    const [s] = await db.select().from(satStudents).where(eq(satStudents.id, order.studentId)).limit(1);
    if (s) await db.update(satStudents).set({ liveCreditSeconds: (s.liveCreditSeconds || 0) + order.hours * 3600 }).where(eq(satStudents.id, s.id));
    console.log(`[SAT credit] ${externalId}: +${order.hours}h for student ${order.studentId}`);
    return { credited: true, hours: order.hours, amount: order.amount, studentName: s?.name, studentEmail: s?.email };
  }
  if (status === "EXPIRED" || status === "FAILED") {
    if (order.status === "pending") await db.update(satCreditOrders).set({ status: status === "EXPIRED" ? "expired" : "failed" }).where(eq(satCreditOrders.id, order.id));
  }
  return { credited: false, reason: `status ${status}` };
}
