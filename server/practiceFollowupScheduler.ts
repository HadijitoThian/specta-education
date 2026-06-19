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

async function tick() {
  try {
    if (!ENV.resendApiKey) return;
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
  console.log("[PracticeFollowup] scheduler started (1 email per practice-test taker, ~40/hour).");
  setInterval(tick, 60 * 60 * 1000); // hourly
  setTimeout(tick, 90 * 1000);       // once shortly after boot
}
