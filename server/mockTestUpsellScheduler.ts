/**
 * Mock Test → AI IELTS Tutor upsell.
 *
 * Anyone who completed a PAID IELTS Mock Test gets ONE email 24h+ later
 * inviting them to the AI IELTS Tutor subscription. We dedupe per email via
 * the mock_test_upsells table (PRIMARY KEY on email) so restarts can't
 * re-send, cap the batch per tick so a backlog drips out gradually, and
 * personalise the copy with the buyer's overall band.
 *
 * Kill-switch: MOCK_UPSELL_ENABLED=false pauses sends without a redeploy.
 */
import { ENV } from "./_core/env";
import { getMockTestUpsellCandidates, recordMockTestUpsellSent } from "./db";
import { sendMockTestUpsellEmail } from "./resendService";

let started = false;
const BATCH_PER_TICK = 30; // ~30/hour drip — protects sender reputation
// Bump this suffix to re-send the preview after editing the email template.
const PREVIEW_KEY = "mock_test_upsell_preview_v2";

/**
 * Email ONE copy of the draft to the owner (or MOCK_UPSELL_PREVIEW_TO) so
 * they can review before any real buyer sees it. Sends once per destination
 * (guarded in scheduler_state) — never touches real leads.
 */
async function maybeSendPreview() {
  try {
    if (!ENV.resendApiKey) return;
    const to = process.env.MOCK_UPSELL_PREVIEW_TO || ENV.ownerEmail;
    if (!to) return;
    const { getSchedulerState, setSchedulerState } = await import("./db");
    if ((await getSchedulerState(PREVIEW_KEY)) === to.toLowerCase()) return;
    const ok = await sendMockTestUpsellEmail({
      to,
      name: "there",
      overallBand: 6.5, // representative band so preview shows band-aware copy
      appUrl: ENV.appUrl,
    });
    if (ok) {
      await setSchedulerState(PREVIEW_KEY, to.toLowerCase());
      console.log(`[MockUpsell] preview draft emailed to ${to}`);
    }
  } catch (e) {
    console.error("[MockUpsell] preview error:", e);
  }
}

async function tick() {
  try {
    if (!ENV.resendApiKey) return;
    // LIVE by default. Kill-switch: MOCK_UPSELL_ENABLED=false.
    if (process.env.MOCK_UPSELL_ENABLED === "false") return;
    const candidates = await getMockTestUpsellCandidates(BATCH_PER_TICK);
    for (const c of candidates) {
      const ok = await sendMockTestUpsellEmail({
        to: c.email,
        name: c.name,
        overallBand: c.overallBand,
        appUrl: ENV.appUrl,
      });
      // mark only on success → transient failures retry on the next tick
      if (ok) await recordMockTestUpsellSent(c.email, { attemptId: c.attemptId, overallBand: c.overallBand });
    }
    if (candidates.length) console.log(`[MockUpsell] processed ${candidates.length} Mock Test upsells`);
  } catch (e) {
    console.error("[MockUpsell] scheduler tick error:", e);
  }
}

export function startMockTestUpsellScheduler() {
  if (started) return;
  started = true;
  const off = process.env.MOCK_UPSELL_ENABLED === "false";
  console.log(`[MockUpsell] scheduler started (${off ? "PAUSED via MOCK_UPSELL_ENABLED=false" : "LIVE"}; 1 email/buyer, ~30/hour).`);
  setInterval(tick, 60 * 60 * 1000); // hourly
  setTimeout(tick, 120 * 1000);      // once shortly after boot
  setTimeout(maybeSendPreview, 60 * 1000); // email the owner a draft to review
}
