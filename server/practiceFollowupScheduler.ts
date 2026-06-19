/**
 * IELTS Practice → product follow-up.
 *
 * Anyone who took the FREE IELTS practice test (ieltsPracticeResults) gets ONE
 * email inviting them to the paid full Mock Test and the AI IELTS Tutor. We
 * wait ~1 day after their first attempt, dedupe per email via the
 * practice_followups table (so restarts can't re-send), and cap the batch per
 * tick so a backlog drips out gradually rather than blasting — protecting
 * sender reputation and staying within Resend limits.
 */
import { ENV } from "./_core/env";
import { getPracticeFollowupCandidates, recordPracticeFollowupSent } from "./db";
import { sendPracticeFollowupEmail } from "./resendService";

let started = false;
const BATCH_PER_TICK = 40; // ~40/hour drip
// Bump this suffix to re-send the preview after editing the email template.
const PREVIEW_KEY = "practice_followup_preview_v1";

/**
 * Email ONE copy of the draft to the owner (or PRACTICE_FOLLOWUP_PREVIEW_TO) so
 * they can review before going live. Sends once per destination address
 * (guarded in scheduler_state) — never touches real leads.
 */
async function maybeSendPreview() {
  try {
    if (!ENV.resendApiKey) return;
    const to = process.env.PRACTICE_FOLLOWUP_PREVIEW_TO || ENV.ownerEmail;
    if (!to) return;
    const { getSchedulerState, setSchedulerState } = await import("./db");
    if ((await getSchedulerState(PREVIEW_KEY)) === to.toLowerCase()) return;
    const ok = await sendPracticeFollowupEmail({ to, name: "there", appUrl: ENV.appUrl });
    if (ok) {
      await setSchedulerState(PREVIEW_KEY, to.toLowerCase());
      console.log(`[PracticeFollowup] preview draft emailed to ${to}`);
    }
  } catch (e) {
    console.error("[PracticeFollowup] preview error:", e);
  }
}

async function tick() {
  try {
    if (!ENV.resendApiKey) return;
    // Opt-in: stays OFF until the owner reviews the draft and flips this on.
    if (process.env.PRACTICE_FOLLOWUP_ENABLED !== "true") return;
    const candidates = await getPracticeFollowupCandidates(BATCH_PER_TICK);
    for (const c of candidates) {
      const ok = await sendPracticeFollowupEmail({ to: c.email, name: c.name, appUrl: ENV.appUrl });
      if (ok) await recordPracticeFollowupSent(c.email); // mark only on success → failures retry later
    }
    if (candidates.length) console.log(`[PracticeFollowup] processed ${candidates.length} practice-test follow-ups`);
  } catch (e) {
    console.error("[PracticeFollowup] scheduler tick error:", e);
  }
}

export function startPracticeFollowupScheduler() {
  if (started) return;
  started = true;
  const on = process.env.PRACTICE_FOLLOWUP_ENABLED === "true";
  console.log(`[PracticeFollowup] scheduler started (${on ? "LIVE" : "OFF — set PRACTICE_FOLLOWUP_ENABLED=true to send"}; 1 email/taker, ~40/hour).`);
  setInterval(tick, 60 * 60 * 1000); // hourly
  setTimeout(tick, 90 * 1000);       // once shortly after boot
  setTimeout(maybeSendPreview, 45 * 1000); // email the owner a draft to review
}
