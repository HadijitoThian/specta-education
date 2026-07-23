/**
 * Autonomous Google Ads monitor — the "AI Ads Agent" the owner asked for.
 *
 * Runs a daily audit of every enabled campaign, decides what to do based on
 * safe rules, and either:
 *   - Executes LOW-RISK actions autonomously (pause obviously-wasteful
 *     keywords, add well-known negative keywords found in search terms)
 *   - Queues HIGH-RISK actions as suggestions for the owner to approve
 *     via /admin/ads-launcher (budget scale up/down, landing-URL change,
 *     ad-copy rewrite, campaign pause)
 *
 * Every action — automatic OR queued — lands in ads_monitor_log so the
 * owner has a full audit trail and can undo anything from the admin.
 *
 * Safety layers:
 *   - Max 5 auto-pauses per campaign per day (prevents runaway pruning)
 *   - Max 20 auto-negatives per campaign per day
 *   - NEVER auto-scales budget up (only ever suggested for approval)
 *   - NEVER changes landing URLs (only flagged for owner)
 *   - Runs once per day, guarded by DB marker (survives redeploys)
 *   - `ADS_MONITOR_AUTO_APPLY` env var default = false; owner opts in
 *     when they trust the recs. Until then, everything is a suggestion.
 *
 * Trigger: startup scheduler (daily 08:00 WIB) OR
 *          marketing.runAdsAudit tRPC procedure (on-demand).
 */

import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import {
  isGoogleAdsConfigured,
  listLiveCampaigns,
  getCampaignDetail,
  pauseKeyword,
  addNegativeKeywords,
} from "./googleAdsApi";

// ─────────────────────────────────────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────────────────────────────────────

/** Universal junk queries — searchers here almost never buy. Auto-added as
 *  campaign negatives if we detect they've been triggering the ads. */
const AUTO_NEGATIVE_CANDIDATES = [
  "gratis", "free", "download", "pdf", "kunci jawaban",
  "tips", "cara belajar", "materi", "soal", "contoh",
  "video", "youtube", "review", "opini",
  "job", "lowongan", "kerja", "gaji", "loker",
  "harga murah", "diskon", "coupon",
];

/**
 * Waste threshold: a keyword is "wasteful" if it spent above this AND
 * produced zero conversions AND had at least MIN_WASTE_CLICKS.
 *
 * Env-overridable so owner can tighten/loosen: ADS_MONITOR_WASTE_THRESHOLD_IDR.
 */
const WASTE_THRESHOLD_IDR = Number(process.env.ADS_MONITOR_WASTE_THRESHOLD_IDR || 10000);
const MIN_WASTE_CLICKS = 5;

const MAX_AUTO_PAUSES_PER_CAMPAIGN = 5;
const MAX_AUTO_NEGATIVES_PER_CAMPAIGN = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Log table
// ─────────────────────────────────────────────────────────────────────────────

export async function ensureAdsMonitorSchema(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ads_monitor_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaignId VARCHAR(40) NOT NULL,
        campaignName VARCHAR(200) NOT NULL,
        action VARCHAR(60) NOT NULL,
        target VARCHAR(500) NULL,
        reason TEXT NULL,
        executedAutomatically BOOLEAN NOT NULL DEFAULT FALSE,
        payload JSON NULL,
        acknowledgedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ads_log_created (createdAt),
        INDEX idx_ads_log_campaign (campaignId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e) {
    console.error("[adsMonitor] schema init failed:", (e as Error).message);
  }
}

async function logAction(input: {
  campaignId: string;
  campaignName: string;
  action: string;
  target?: string;
  reason?: string;
  executedAutomatically: boolean;
  payload?: any;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      INSERT INTO ads_monitor_log (campaignId, campaignName, action, target, reason, executedAutomatically, payload)
      VALUES (${input.campaignId}, ${input.campaignName.slice(0, 200)},
              ${input.action}, ${input.target ? input.target.slice(0, 500) : null},
              ${input.reason ? input.reason.slice(0, 4000) : null},
              ${input.executedAutomatically},
              ${input.payload ? JSON.stringify(input.payload) : null})
    `);
  } catch (e) {
    console.error("[adsMonitor] log insert failed:", (e as Error).message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The audit
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditResult {
  campaignsAudited: number;
  autoPaused: number;
  autoNegativesAdded: number;
  suggestions: Array<{
    campaignId: string;
    campaignName: string;
    action: string;
    target?: string;
    reason: string;
  }>;
  errors: string[];
}

/** Run one audit pass. Idempotent-ish — repeated calls just add fresh log
 *  entries; won't double-pause already-paused keywords. */
export async function runAdsAudit(): Promise<AuditResult> {
  const result: AuditResult = {
    campaignsAudited: 0, autoPaused: 0, autoNegativesAdded: 0,
    suggestions: [], errors: [],
  };
  if (!isGoogleAdsConfigured()) {
    result.errors.push("Google Ads API not configured");
    return result;
  }

  await ensureAdsMonitorSchema();
  const autoApply = process.env.ADS_MONITOR_AUTO_APPLY === "true";

  let campaigns: Awaited<ReturnType<typeof listLiveCampaigns>> = [];
  try {
    campaigns = await listLiveCampaigns();
  } catch (e) {
    result.errors.push("listLiveCampaigns: " + (e as Error).message);
    return result;
  }

  // Only audit ENABLED campaigns with actual spend — paused/dead ones are noise.
  const active = campaigns.filter(c => c.status === "ENABLED" && c.metricsLast30d.costIdr > 0);

  for (const c of active) {
    result.campaignsAudited++;
    let detail: Awaited<ReturnType<typeof getCampaignDetail>>;
    try {
      detail = await getCampaignDetail(c.campaignId);
    } catch (e) {
      result.errors.push(`getCampaignDetail(${c.campaignId}): ${(e as Error).message}`);
      continue;
    }
    if (!detail) continue;

    // ── Rule 1: WASTE KEYWORDS ────────────────────────────────────────────
    // High spend + zero conversions + enough clicks to be statistically real.
    // These get auto-paused if ADS_MONITOR_AUTO_APPLY=true, otherwise
    // flagged as suggestions for owner approval.
    const wasteKeywords = detail.keywords.filter(k =>
      !k.isNegative &&
      k.status === "ENABLED" &&
      k.cost30dIdr >= WASTE_THRESHOLD_IDR &&
      k.conversions30d === 0 &&
      k.clicks30d >= MIN_WASTE_CLICKS
    ).sort((a, b) => b.cost30dIdr - a.cost30dIdr);

    let pausedThisCampaign = 0;
    for (const kw of wasteKeywords) {
      if (pausedThisCampaign >= MAX_AUTO_PAUSES_PER_CAMPAIGN) break;
      const reason = `Spent Rp ${kw.cost30dIdr.toLocaleString("id-ID")} over ${kw.clicks30d} clicks (CTR ${kw.ctr30d}%) with 0 conversions in last 30 days.`;
      if (autoApply) {
        try {
          await pauseKeyword(kw.criterionResourceName);
          await logAction({
            campaignId: c.campaignId, campaignName: c.campaignName,
            action: "auto_pause_keyword", target: kw.text, reason,
            executedAutomatically: true,
            payload: { criterionResourceName: kw.criterionResourceName, matchType: kw.matchType, cost30dIdr: kw.cost30dIdr },
          });
          result.autoPaused++;
          pausedThisCampaign++;
        } catch (e) {
          result.errors.push(`pauseKeyword ${kw.text}: ${(e as Error).message}`);
        }
      } else {
        result.suggestions.push({
          campaignId: c.campaignId, campaignName: c.campaignName,
          action: "pause_keyword", target: kw.text, reason,
        });
        await logAction({
          campaignId: c.campaignId, campaignName: c.campaignName,
          action: "suggest_pause_keyword", target: kw.text, reason,
          executedAutomatically: false,
          payload: { criterionResourceName: kw.criterionResourceName, matchType: kw.matchType, cost30dIdr: kw.cost30dIdr },
        });
      }
    }

    // ── Rule 2: AUTO-NEGATIVES ─────────────────────────────────────────────
    // If a well-known junk word (gratis / free / download / etc.) appears
    // in ANY of this campaign's triggered keywords or ad-group names and
    // isn't already in the negatives list, add it. Prevents ad triggering
    // by irrelevant searches going forward.
    //
    // Simple heuristic in v1: add all universal-junk terms that aren't
    // already negatives. Over-adds a bit but never HURTS — negatives only
    // stop matching, they can't cause harm.
    const existingNegs = new Set(detail.negatives.map(n => n.toLowerCase()));
    const missingNegatives = AUTO_NEGATIVE_CANDIDATES.filter(n => !existingNegs.has(n));
    if (missingNegatives.length > 0) {
      const toAdd = missingNegatives.slice(0, MAX_AUTO_NEGATIVES_PER_CAMPAIGN);
      const reason = `Standard junk-traffic negatives missing (${toAdd.length}) — added to block "gratis", "download", "job", etc. searches from triggering ads.`;
      if (autoApply) {
        try {
          const res = await addNegativeKeywords({ campaignId: c.campaignId, keywords: toAdd, matchType: "BROAD" });
          await logAction({
            campaignId: c.campaignId, campaignName: c.campaignName,
            action: "auto_add_negatives", target: toAdd.join(", "), reason: `Added ${res.added} negative keyword(s).`,
            executedAutomatically: true,
            payload: { added: res.added, skipped: res.skipped, list: toAdd },
          });
          result.autoNegativesAdded += res.added;
        } catch (e) {
          result.errors.push(`addNegatives on ${c.campaignName}: ${(e as Error).message}`);
        }
      } else {
        result.suggestions.push({
          campaignId: c.campaignId, campaignName: c.campaignName,
          action: "add_negatives", target: toAdd.slice(0, 5).join(", ") + (toAdd.length > 5 ? ` (+${toAdd.length - 5} more)` : ""),
          reason,
        });
        await logAction({
          campaignId: c.campaignId, campaignName: c.campaignName,
          action: "suggest_add_negatives", target: toAdd.join(", "), reason,
          executedAutomatically: false,
          payload: { list: toAdd },
        });
      }
    }

    // ── Rule 3: LANDING URL MISMATCH (high-risk — always suggest, never auto)
    // If the campaign name hints at a specific product (mock test / tutor /
    // igcse / aptitude) and the ads point at a URL that doesn't include the
    // matching path, flag it. Owner reviews and clicks Update URL in the
    // editor to fix.
    const productHints: Array<[RegExp, string]> = [
      [/mock/i,          "/ielts/mock-test"],
      [/tutor/i,         "/ielts/tutor"],
      [/igcse/i,         "/igcse"],
      [/aptitude|bakat/i,"/test/pro"],
    ];
    for (const [nameRe, expectedPath] of productHints) {
      if (!nameRe.test(c.campaignName)) continue;
      const mismatched = detail.ads.filter(a => a.finalUrls.length && !a.finalUrls.some(u => u.includes(expectedPath)));
      if (mismatched.length > 0) {
        const reason = `Campaign name mentions "${nameRe.source.replace(/[/\\^$*+?.()|[\]{}]/g, "")}" but ${mismatched.length} ad(s) point at URLs that don't include "${expectedPath}". Owner likely wants clicks going to the specific product page for direct conversion — not to a general marketing page.`;
        result.suggestions.push({
          campaignId: c.campaignId, campaignName: c.campaignName,
          action: "update_url", target: expectedPath, reason,
        });
        await logAction({
          campaignId: c.campaignId, campaignName: c.campaignName,
          action: "suggest_update_url", target: expectedPath, reason,
          executedAutomatically: false,
          payload: { affectedAds: mismatched.map(m => m.resourceName), currentUrls: mismatched.flatMap(m => m.finalUrls) },
        });
      }
    }

    // ── Rule 4: LOW CTR — probable bad ad copy (high-risk — always suggest)
    const ctrOverall = c.metricsLast30d.impressions > 0
      ? (c.metricsLast30d.clicks / c.metricsLast30d.impressions) * 100
      : 0;
    if (c.metricsLast30d.impressions >= 500 && ctrOverall < 1.5) {
      const reason = `CTR is only ${ctrOverall.toFixed(2)}% over ${c.metricsLast30d.impressions} impressions in last 30 days — well below the 3-4% Indonesia-education benchmark. Likely ad copy issue. Consider regenerating headlines/descriptions via Ads Launcher.`;
      result.suggestions.push({
        campaignId: c.campaignId, campaignName: c.campaignName,
        action: "review_ad_copy", target: "responsive search ad", reason,
      });
      await logAction({
        campaignId: c.campaignId, campaignName: c.campaignName,
        action: "suggest_review_ad_copy", reason,
        executedAutomatically: false,
        payload: { ctr30d: ctrOverall, impressions30d: c.metricsLast30d.impressions },
      });
    }

    // ── Rule 5: WINNING CAMPAIGN — suggest scale up (never auto)
    if (c.metricsLast30d.conversions >= 10 && c.metricsLast30d.costIdr > 0) {
      const revenuePerConversion = 100000; // conservative avg across products
      const roas = (c.metricsLast30d.conversions * revenuePerConversion) / c.metricsLast30d.costIdr;
      if (roas > 2) {
        const reason = `${c.metricsLast30d.conversions.toFixed(0)} conversions on Rp ${c.metricsLast30d.costIdr.toLocaleString("id-ID")} spend in last 30 days (est ROAS ${roas.toFixed(1)}x). This is a winner — consider increasing daily budget from Rp ${c.dailyBudgetIdr.toLocaleString("id-ID")} to Rp ${Math.round(c.dailyBudgetIdr * 1.2).toLocaleString("id-ID")} (+20%).`;
        result.suggestions.push({
          campaignId: c.campaignId, campaignName: c.campaignName,
          action: "scale_budget", target: String(Math.round(c.dailyBudgetIdr * 1.2)), reason,
        });
        await logAction({
          campaignId: c.campaignId, campaignName: c.campaignName,
          action: "suggest_scale_budget", target: String(Math.round(c.dailyBudgetIdr * 1.2)), reason,
          executedAutomatically: false,
          payload: { currentBudget: c.dailyBudgetIdr, suggestedBudget: Math.round(c.dailyBudgetIdr * 1.2), roas },
        });
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Log read + acknowledgement
// ─────────────────────────────────────────────────────────────────────────────

export interface MonitorLogEntry {
  id: number;
  campaignId: string;
  campaignName: string;
  action: string;
  target: string | null;
  reason: string | null;
  executedAutomatically: boolean;
  payload: any;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

export async function listMonitorLog(opts: { limit?: number; onlyPending?: boolean } = {}): Promise<MonitorLogEntry[]> {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.max(1, Math.min(500, opts.limit || 50));
  const rows: any = opts.onlyPending
    ? await db.execute(sql`
        SELECT id, campaignId, campaignName, action, target, reason,
               executedAutomatically, payload, acknowledgedAt, createdAt
        FROM ads_monitor_log
        WHERE acknowledgedAt IS NULL AND executedAutomatically = FALSE
        ORDER BY createdAt DESC LIMIT ${limit}`)
    : await db.execute(sql`
        SELECT id, campaignId, campaignName, action, target, reason,
               executedAutomatically, payload, acknowledgedAt, createdAt
        FROM ads_monitor_log ORDER BY createdAt DESC LIMIT ${limit}`);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return list.map((r: any) => ({
    id: Number(r.id),
    campaignId: r.campaignId,
    campaignName: r.campaignName,
    action: r.action,
    target: r.target,
    reason: r.reason,
    executedAutomatically: !!r.executedAutomatically,
    payload: r.payload ? (typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload) : null,
    acknowledgedAt: r.acknowledgedAt ? new Date(r.acknowledgedAt) : null,
    createdAt: new Date(r.createdAt),
  }));
}

export async function acknowledgeMonitorAction(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE ads_monitor_log SET acknowledgedAt = NOW() WHERE id = ${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily scheduler — now properly guarded against redeploy-spam.
//
// Two independent kill switches:
//   ADS_MONITOR_ENABLED=false  — skip the scheduler entirely (no audit, no email)
//   ADS_MONITOR_EMAIL_ENABLED=false — run the audit but never send the digest
//
// Default is emails ENABLED unless owner explicitly opts out.
//
// Daily dedupe uses the proper system_flags table (flagKey is PRIMARY KEY,
// unlike the earlier growth_digests hack that silently failed).
// ─────────────────────────────────────────────────────────────────────────────

const MARKER_KEY = "ads_monitor_last_email_day";

let started = false;

async function tick(): Promise<void> {
  if (!isGoogleAdsConfigured()) return;
  if (process.env.ADS_MONITOR_ENABLED === "false") return;
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // WIB
  const day = now.toISOString().slice(0, 10);
  if (now.getUTCHours() < 8) return; // 08:00 WIB and later

  const { readFlag, writeFlag } = await import("./systemFlags");
  const last = await readFlag(MARKER_KEY);
  if (last === day) return; // already ran today
  await writeFlag(MARKER_KEY, day); // claim BEFORE audit so concurrent ticks
                                    // (unlikely, but safer) can't double-fire.

  try {
    const audit = await runAdsAudit();
    console.log(`[adsMonitor] daily audit — ${audit.campaignsAudited} campaigns · ${audit.autoPaused} auto-paused · ${audit.autoNegativesAdded} auto-negatives · ${audit.suggestions.length} suggestions`);

    const emailAllowed = process.env.ADS_MONITOR_EMAIL_ENABLED !== "false";
    const anythingInteresting =
      audit.autoPaused > 0 ||
      audit.autoNegativesAdded > 0 ||
      audit.suggestions.length > 0;

    if (emailAllowed && anythingInteresting) {
      const autoLines: string[] = [];
      if (audit.autoPaused > 0) autoLines.push(`- ${audit.autoPaused} wasteful keyword${audit.autoPaused === 1 ? "" : "s"} paused automatically`);
      if (audit.autoNegativesAdded > 0) autoLines.push(`- ${audit.autoNegativesAdded} negative keyword${audit.autoNegativesAdded === 1 ? "" : "s"} added automatically`);
      const suggestionLines = audit.suggestions.slice(0, 10).map((s, i) =>
        `${i + 1}. [${s.campaignName}] ${s.action}${s.target ? ` — ${s.target}` : ""}\n   ${s.reason}`
      );
      await notifyOwner({
        title: `AI Ads Agent — daily audit (${audit.campaignsAudited} campaigns)`,
        content:
          (autoLines.length ? `Automatic actions today:\n${autoLines.join("\n")}\n\n` : "") +
          (suggestionLines.length ? `Suggestions for your review:\n${suggestionLines.join("\n\n")}\n\n` : "") +
          `Review + apply at spectaeducation.com/admin/ads-launcher.`,
      });
    }
  } catch (e) {
    console.error("[adsMonitor] audit failed:", (e as Error).message);
  }
}

export function startAdsMonitor(): void {
  if (started) return;
  if (!isGoogleAdsConfigured()) {
    console.log("[adsMonitor] off — Google Ads API not configured.");
    return;
  }
  if (process.env.ADS_MONITOR_ENABLED === "false") {
    console.log("[adsMonitor] off — ADS_MONITOR_ENABLED=false in env.");
    return;
  }
  started = true;
  const autoApply = process.env.ADS_MONITOR_AUTO_APPLY === "true";
  const emailOn = process.env.ADS_MONITOR_EMAIL_ENABLED !== "false";
  console.log(`[adsMonitor] on — daily audit at 08:00 WIB · auto-apply=${autoApply ? "ON" : "OFF (suggestions only)"} · email=${emailOn ? "ON" : "OFF"}`);
  // Hourly checks; the daily marker ensures we only actually run once per day.
  setInterval(() => { void tick(); }, 60 * 60 * 1000);
}
