/**
 * CRM Parent-Report scheduler (Phase 3). A lightweight, self-contained timer —
 * NOT part of the old (disabled) agent system.
 *
 * - Sunday from 18:00 WIB: auto-create this-cycle's drafts (idempotent).
 * - Monday from 09:00 WIB: auto-send approved reports + drafts that have real
 *   content (empty drafts are held), fulfilling the "every Monday morning" promise.
 *
 * Robustness: ticks every 15 min; in-memory per-week guards mean each job runs
 * once per week even if a tick is missed, and the DB layer is idempotent too
 * (generate skips existing rows; sent rows aren't re-sent).
 */
import { wibNow, currentReportWeek, generateDraftsForWeek, sendDueForWeek } from "./crmParentReports";

let started = false;
let lastGenWeek = "";
let lastSendWeek = "";

async function tick() {
  try {
    const now = wibNow();
    const day = now.getUTCDay(); // 0=Sun, 1=Mon
    const hour = now.getUTCHours();
    const week = currentReportWeek();

    if (day === 0 && hour >= 18 && lastGenWeek !== week) {
      const r = await generateDraftsForWeek(week);
      lastGenWeek = week;
      console.log(`[ParentReports] auto-generated drafts for week ${week}:`, r);
    }

    if (day === 1 && hour >= 9 && lastSendWeek !== week) {
      const r = await sendDueForWeek(week);
      lastSendWeek = week;
      console.log(`[ParentReports] auto-sent reports for week ${week}:`, r);
    }
  } catch (e) {
    console.error("[ParentReports] scheduler tick error:", e);
  }
}

export function startCrmReportScheduler() {
  if (started) return;
  started = true;
  console.log("[ParentReports] weekly scheduler started (Sun draft / Mon 09:00 WIB send).");
  setInterval(tick, 15 * 60 * 1000);
  // Run once shortly after boot (covers a restart inside a send/draft window).
  setTimeout(tick, 30 * 1000);
}
