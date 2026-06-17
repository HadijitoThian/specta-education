/**
 * AI IELTS Tutor — free-trial nurture reminders.
 *
 * A student who tried the free taster but hasn't subscribed (and never reached
 * a real Xendit invoice — those are covered by Xendit's own invoice reminders)
 * gets up to TWO gentle nudges by email:
 *   - reminder #1 ~1 day after their first practice
 *   - reminder #2 ~3 days after their first practice
 * We stop immediately once they subscribe (candidates query excludes anyone
 * with active access). Per-lead state lives in the tutor_reminders table, so a
 * server restart can't re-send — addressing the past scheduler re-fire issue.
 */
import { ENV } from "./_core/env";
import { getTutorReminderCandidates, recordTutorReminderSent } from "./db";
import { sendTutorReminderEmail } from "./resendService";

let started = false;

const DAY = 24 * 60 * 60 * 1000;

async function tick() {
  try {
    if (!ENV.resendApiKey) return; // can't email without Resend configured
    const candidates = await getTutorReminderCandidates();
    const now = Date.now();
    for (const c of candidates) {
      const ageMs = now - c.anchorAt.getTime();
      // Decide which step (if any) is due. remindersSent: 0 → step 1 at +1d;
      // 1 → step 2 at +3d. Capped at 2 by the query.
      let step: 1 | 2 | null = null;
      if (c.remindersSent === 0 && ageMs >= 1 * DAY) step = 1;
      else if (c.remindersSent === 1 && ageMs >= 3 * DAY) step = 2;
      if (!step) continue;

      const ok = await sendTutorReminderEmail({ to: c.email, name: c.name, step, appUrl: ENV.appUrl });
      if (ok) await recordTutorReminderSent(c.leadId); // claim AFTER send; failures retry next tick
    }
  } catch (e) {
    console.error("[TutorReminders] scheduler tick error:", e);
  }
}

export function startTutorReminderScheduler() {
  if (started) return;
  started = true;
  console.log("[TutorReminders] free-trial nurture scheduler started (email at +1d / +3d, max 2).");
  setInterval(tick, 60 * 60 * 1000); // hourly
  setTimeout(tick, 60 * 1000);       // once shortly after boot
}
