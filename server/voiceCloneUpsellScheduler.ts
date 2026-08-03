/**
 * Voice Clone drip upsell — 50/day to past customers.
 *
 * Sends the "Hear yourself at Band 8" pitch (Rp 49k, no Mock Test
 * required) to anyone who's ever taken any SpecTa product:
 *   1. Free Aptitude Test  — aptitude_results
 *   2. Paid Pro Aptitude   — aptitudeProOrders WHERE status='paid'
 *   3. Free IELTS Practice — ieltsPracticeResults
 *   4. Paid IELTS Mock     — ieltsMockAttempts WHERE status='completed'
 *   5. Free Tutor trial    — tutor_free_trial_uses (if table exists)
 *   6. Paid Tutor sub      — tutorSubscriptions (via leads.studentEmail)
 *
 * Sort OLDEST first — work through the backlog. Dedupe via
 * voice_clone_upsell_sent (email PK). Rate-limited to stay within
 * the 100/day Resend quota (target: 50/day = ~2/hour).
 *
 * Kill switch: VOICE_CLONE_UPSELL_ENABLED=false.
 *
 * Preview: on first boot, sends ONE preview to the owner (guarded
 * by scheduler_state) so they can eyeball the email before real
 * customers receive it.
 */

import { sql } from "drizzle-orm";
import { getDb, getSchedulerState, setSchedulerState } from "./db";
import { ENV } from "./_core/env";
import { sendVoiceCloneUpsellEmail } from "./resendService";

let started = false;
const BATCH_PER_TICK = 3;      // ~3 emails per hourly tick = ~72/day max
const DAILY_CAP = 50;           // hard cap on per-day sends (stays under Resend 100/day quota shared with other schedulers)
const PREVIEW_KEY = "voice_clone_upsell_preview_v1";

interface UpsellCandidate {
  email: string;
  name: string | null;
  segment: string;       // "aptitude-free" | "aptitude-pro" | "practice" | "mock" | "tutor-trial" | "tutor-paid"
  firstSeenAt: Date;
}

/**
 * Union query across all 6 audience tables. Returns oldest-first, deduped
 * by email, excluding anyone already in voice_clone_upsell_sent.
 * LIMIT applied by caller.
 */
async function findEligibleCandidates(limit: number): Promise<UpsellCandidate[]> {
  const db = await getDb();
  if (!db) return [];

  // We build a UNION query with a "priority" per segment (paid customers
  // rank slightly higher when there's a tie on firstSeenAt).
  const rows: any = await db.execute(sql`
    WITH combined AS (
      SELECT LOWER(studentEmail) AS email, studentName AS name, 'aptitude-free' AS segment, createdAt AS firstSeenAt
      FROM aptitudeResults WHERE studentEmail IS NOT NULL AND studentEmail <> ''

      UNION ALL
      SELECT LOWER(customerEmail) AS email, customerName AS name, 'aptitude-pro' AS segment, createdAt AS firstSeenAt
      FROM aptitudeProOrders WHERE status = 'paid' AND customerEmail IS NOT NULL

      UNION ALL
      SELECT LOWER(email) AS email, name AS name, 'practice' AS segment, createdAt AS firstSeenAt
      FROM ieltsPracticeResults WHERE email IS NOT NULL AND email <> ''

      UNION ALL
      SELECT LOWER(customerEmail) AS email, customerName AS name, 'mock' AS segment, createdAt AS firstSeenAt
      FROM ieltsMockAttempts WHERE status = 'completed' AND customerEmail IS NOT NULL

      UNION ALL
      SELECT LOWER(email) AS email, NULL AS name, 'tutor-trial' AS segment, createdAt AS firstSeenAt
      FROM tutor_free_trial_uses WHERE email IS NOT NULL

      UNION ALL
      SELECT LOWER(l.studentEmail) AS email, l.studentName AS name, 'tutor-paid' AS segment, ts.createdAt AS firstSeenAt
      FROM tutor_subscriptions ts
      JOIN leads l ON l.id = ts.leadId
      WHERE ts.status IN ('active','expired')
        AND l.studentEmail IS NOT NULL AND l.studentEmail <> ''
    ),
    ranked AS (
      SELECT email, MIN(firstSeenAt) AS firstSeenAt,
             MAX(name) AS name,
             GROUP_CONCAT(DISTINCT segment ORDER BY segment) AS segments
      FROM combined
      WHERE email IS NOT NULL AND email <> ''
      GROUP BY email
    )
    SELECT r.email, r.name, r.firstSeenAt, r.segments
    FROM ranked r
    LEFT JOIN voice_clone_upsell_sent s ON s.email = r.email
    WHERE s.email IS NULL
    ORDER BY r.firstSeenAt ASC
    LIMIT ${sql.raw(String(Math.max(1, Math.min(100, Math.floor(limit)))))}
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return list.map(r => ({
    email: String(r.email),
    name: r.name || null,
    segment: String(r.segments || "unknown").split(",")[0],
    firstSeenAt: new Date(r.firstSeenAt),
  }));
}

/** Count how many sends fired in the last 24 hours to enforce the daily cap. */
async function countSentLast24h(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows: any = await db.execute(sql`
    SELECT COUNT(*) AS n FROM voice_clone_upsell_sent
    WHERE sentAt > NOW() - INTERVAL 24 HOUR
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return Number(list[0]?.n || 0);
}

async function recordSent(email: string, segment: string, resendId: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    INSERT INTO voice_clone_upsell_sent (email, segment, resendId, sentAt)
    VALUES (${email.toLowerCase()}, ${segment}, ${resendId}, NOW())
    ON DUPLICATE KEY UPDATE sentAt = NOW(), segment = ${segment}, resendId = ${resendId}
  `);
}

async function maybeSendPreview() {
  try {
    if (!ENV.resendApiKey) return;
    const to = process.env.VOICE_CLONE_UPSELL_PREVIEW_TO || ENV.ownerEmail;
    if (!to) return;
    if ((await getSchedulerState(PREVIEW_KEY)) === to.toLowerCase()) return;
    const ok = await sendVoiceCloneUpsellEmail({
      to,
      name: "there",
      segment: "preview",
      appUrl: ENV.appUrl || "https://www.spectaeducation.com",
    });
    if (ok) {
      await setSchedulerState(PREVIEW_KEY, to.toLowerCase());
      console.log(`[VoiceCloneUpsell] preview emailed to ${to}`);
    }
  } catch (e) {
    console.error("[VoiceCloneUpsell] preview error:", e);
  }
}

async function tick() {
  try {
    if (!ENV.resendApiKey) return;
    if (process.env.VOICE_CLONE_UPSELL_ENABLED === "false") return;

    // Enforce daily cap
    const sentToday = await countSentLast24h();
    if (sentToday >= DAILY_CAP) {
      console.log(`[VoiceCloneUpsell] daily cap reached (${sentToday}/${DAILY_CAP}) — skipping`);
      return;
    }
    const remainingToday = DAILY_CAP - sentToday;
    const batchSize = Math.min(BATCH_PER_TICK, remainingToday);
    if (batchSize <= 0) return;

    const candidates = await findEligibleCandidates(batchSize);
    if (candidates.length === 0) return;

    for (const c of candidates) {
      const ok = await sendVoiceCloneUpsellEmail({
        to: c.email,
        name: c.name || undefined,
        segment: c.segment,
        appUrl: ENV.appUrl || "https://www.spectaeducation.com",
      });
      // Record only on success — failures will be retried on next tick
      if (ok) await recordSent(c.email, c.segment, null);
    }
    console.log(`[VoiceCloneUpsell] processed ${candidates.length} sends (${sentToday + candidates.length}/${DAILY_CAP} today)`);
  } catch (e) {
    console.error("[VoiceCloneUpsell] scheduler tick error:", e);
  }
}

export function startVoiceCloneUpsellScheduler() {
  if (started) return;
  started = true;
  const off = process.env.VOICE_CLONE_UPSELL_ENABLED === "false";
  console.log(`[VoiceCloneUpsell] scheduler started (${off ? "PAUSED via VOICE_CLONE_UPSELL_ENABLED=false" : "LIVE"}; ${BATCH_PER_TICK}/hour, cap ${DAILY_CAP}/day).`);
  setInterval(tick, 60 * 60 * 1000);   // hourly
  setTimeout(tick, 3 * 60 * 1000);      // once ~3 min after boot
  setTimeout(maybeSendPreview, 90 * 1000); // preview to owner ~90 sec after boot
}
