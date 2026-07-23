/**
 * Google Ads API client (Growth Phase D) — DORMANT until credentials are set.
 *
 * Talks to the Google Ads REST API. Activates only when ALL of these env vars
 * exist, so it's completely safe to ship before your developer token is approved:
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GOOGLE_ADS_REFRESH_TOKEN
 *   GOOGLE_ADS_CUSTOMER_ID         (the ad account, digits only)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID   (the Manager/MCC account, digits only)
 * Optional:
 *   GOOGLE_ADS_DAILY_CAP_IDR       (autonomy guardrail — daily budget ceiling)
 *
 * D1 (read): syncPerformance() pulls real cost/clicks/impressions per campaign
 *            into marketing_spend, replacing manual entry.
 * D2 (write): pushCampaignLive() creates a saved Co-pilot campaign in the
 *            account, always PAUSED so nothing spends until you enable it.
 */
import { replaceMonthlySpend } from "./db";
import type { AdCampaign } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

// Google retires old API versions periodically. Override with the
// GOOGLE_ADS_API_VERSION env var (e.g. "v21") if Google returns a 404.
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v21";
const BASE = `https://googleads.googleapis.com/${API_VERSION}`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Indonesia geo target + Indonesian/English language constants.
const GEO_INDONESIA = "geoTargetConstants/2360";
const LANG_INDONESIAN = "languageConstants/1025";
const LANG_ENGLISH = "languageConstants/1000";

interface Env {
  devToken: string; clientId: string; clientSecret: string; refreshToken: string;
  customerId: string; loginCustomerId: string; dailyCapIdr?: number;
}

function readEnv(): Env | null {
  const e = process.env;
  const devToken = e.GOOGLE_ADS_DEVELOPER_TOKEN;
  const clientId = e.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = e.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = e.GOOGLE_ADS_REFRESH_TOKEN;
  const customerId = (e.GOOGLE_ADS_CUSTOMER_ID || "").replace(/\D/g, "");
  const loginCustomerId = (e.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replace(/\D/g, "");
  if (!devToken || !clientId || !clientSecret || !refreshToken || !customerId || !loginCustomerId) return null;
  const cap = Number(e.GOOGLE_ADS_DAILY_CAP_IDR || "");
  return { devToken, clientId, clientSecret, refreshToken, customerId, loginCustomerId, dailyCapIdr: cap > 0 ? cap : undefined };
}

export function isGoogleAdsConfigured(): boolean {
  return readEnv() !== null;
}

// ── OAuth (cached access token) ──────────────────────────────────────────────
let cachedToken: { value: string; exp: number } | null = null;

async function accessToken(env: Env): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp) return cachedToken.value;
  const body = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: env.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error(`OAuth token failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

async function headers(env: Env): Promise<Record<string, string>> {
  return {
    Authorization: `Bearer ${await accessToken(env)}`,
    "developer-token": env.devToken,
    "login-customer-id": env.loginCustomerId,
    "content-type": "application/json",
  };
}

/** Run a GAQL query (searchStream) and return the flattened result rows. */
async function search(env: Env, query: string): Promise<any[]> {
  const res = await fetch(`${BASE}/customers/${env.customerId}/googleAds:searchStream`, {
    method: "POST", headers: await headers(env), body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GAQL failed: ${res.status} ${await res.text()}`);
  const batches = await res.json();
  const out: any[] = [];
  for (const b of Array.isArray(batches) ? batches : [batches]) {
    for (const r of b.results || []) out.push(r);
  }
  return out;
}

async function mutate(env: Env, resource: string, operations: any[]): Promise<any> {
  const res = await fetch(`${BASE}/customers/${env.customerId}/${resource}:mutate`, {
    method: "POST", headers: await headers(env), body: JSON.stringify({ operations }),
  });
  if (!res.ok) throw new Error(`${resource} mutate failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Connection test / status ─────────────────────────────────────────────────
export async function getStatus(): Promise<{ configured: boolean; ok?: boolean; accountName?: string; error?: string }> {
  const env = readEnv();
  if (!env) return { configured: false };
  try {
    const rows = await search(env, "SELECT customer.descriptive_name FROM customer LIMIT 1");
    return { configured: true, ok: true, accountName: rows[0]?.customer?.descriptiveName };
  } catch (e) {
    return { configured: true, ok: false, error: (e as Error).message };
  }
}

// ── Live-campaign inventory (for the admin "what's running right now" view) ─

export interface LiveCampaignSummary {
  campaignName: string;
  campaignId: string;
  status: string;        // ENABLED / PAUSED / REMOVED
  channelType: string;   // SEARCH / DISPLAY / PERFORMANCE_MAX / etc.
  dailyBudgetIdr: number;
  adGroupCount: number;
  /** Distinct destination URLs the campaign sends clicks to. May be zero if
   *  the campaign has no ads yet, or many if the ad group has multiple RSAs. */
  destinations: string[];
  /** Whether the destinations point at wa.me / api.whatsapp.com. */
  goesToWhatsApp: boolean;
  metricsLast30d: {
    clicks: number;
    impressions: number;
    costIdr: number;
    conversions: number;
  };
}

/** List every campaign in the account with its destination URLs + basic metrics. */
export async function listLiveCampaigns(): Promise<LiveCampaignSummary[]> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");

  // 1) Campaigns with budget + status + metrics (last 30 days).
  const camps = await search(env, `
    SELECT campaign.id, campaign.name, campaign.status,
           campaign.advertising_channel_type,
           campaign_budget.amount_micros,
           metrics.clicks, metrics.impressions,
           metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
      AND campaign.status != 'REMOVED'
  `);

  const campMap = new Map<string, LiveCampaignSummary>();
  for (const r of camps) {
    const id = String(r.campaign?.id || "");
    if (!id) continue;
    const cur = campMap.get(id) || {
      campaignName: r.campaign?.name || "(unnamed)",
      campaignId: id,
      status: r.campaign?.status || "UNKNOWN",
      channelType: r.campaign?.advertisingChannelType || "UNKNOWN",
      dailyBudgetIdr: Math.round(Number(r.campaignBudget?.amountMicros || 0) / 1e6),
      adGroupCount: 0,
      destinations: [] as string[],
      goesToWhatsApp: false,
      metricsLast30d: { clicks: 0, impressions: 0, costIdr: 0, conversions: 0 },
    };
    cur.metricsLast30d.clicks += Number(r.metrics?.clicks || 0);
    cur.metricsLast30d.impressions += Number(r.metrics?.impressions || 0);
    cur.metricsLast30d.costIdr += Number(r.metrics?.costMicros || 0) / 1e6;
    cur.metricsLast30d.conversions += Number(r.metrics?.conversions || 0);
    campMap.set(id, cur);
  }

  // 2) Ad-group count per campaign.
  const ags = await search(env, `
    SELECT campaign.id, ad_group.id
    FROM ad_group
    WHERE ad_group.status != 'REMOVED' AND campaign.status != 'REMOVED'
  `);
  for (const r of ags) {
    const cid = String(r.campaign?.id || "");
    const cur = campMap.get(cid);
    if (cur) cur.adGroupCount += 1;
  }

  // 3) Distinct final URLs across all ads in each campaign — this is where
  //    click money actually lands.
  const ads = await search(env, `
    SELECT campaign.id, ad_group_ad.ad.final_urls
    FROM ad_group_ad
    WHERE ad_group_ad.status != 'REMOVED' AND campaign.status != 'REMOVED'
  `);
  for (const r of ads) {
    const cid = String(r.campaign?.id || "");
    const cur = campMap.get(cid);
    if (!cur) continue;
    const urls: string[] = r.adGroupAd?.ad?.finalUrls || [];
    for (const u of urls) {
      if (!cur.destinations.includes(u)) cur.destinations.push(u);
      if (/wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com/i.test(u)) cur.goesToWhatsApp = true;
    }
  }

  // Round IDR sums for cleaner display.
  const out = Array.from(campMap.values())
    .map(c => ({ ...c, metricsLast30d: { ...c.metricsLast30d, costIdr: Math.round(c.metricsLast30d.costIdr) } }))
    .sort((a, b) => (a.status === "ENABLED" && b.status !== "ENABLED" ? -1 : 1));
  return out;
}

// ── D1: pull performance into marketing_spend ────────────────────────────────
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** month = "YYYY-MM". Returns the number of campaigns synced. */
export async function syncPerformance(month: string): Promise<number> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  const start = `${month}-01`;
  const d = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const rows = await search(env, `
    SELECT campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
  `);
  // Aggregate by campaign (searchStream returns per-day-ish rows).
  const agg = new Map<string, { amount: number; clicks: number; impressions: number }>();
  for (const r of rows) {
    const name = r.campaign?.name || "(unnamed)";
    const m = r.metrics || {};
    const cur = agg.get(name) || { amount: 0, clicks: 0, impressions: 0 };
    cur.amount += Number(m.costMicros || 0) / 1e6;
    cur.clicks += Number(m.clicks || 0);
    cur.impressions += Number(m.impressions || 0);
    agg.set(name, cur);
  }
  const spendRows = Array.from(agg.entries()).map(([name, v]) => ({
    source: "google", medium: "cpc", campaign: slug(name) || null, periodMonth: month,
    amount: String(Math.round(v.amount)) as any, currency: "IDR",
    clicks: Math.round(v.clicks), impressions: Math.round(v.impressions), notes: "Synced from Google Ads API",
  }));
  await replaceMonthlySpend("google", month, spendRows as any);
  return spendRows.length;
}

// ── D2: create a campaign live (PAUSED) from a saved Co-pilot campaign ────────
export async function pushCampaignLive(campaign: AdCampaign): Promise<{ campaignResourceName: string }> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  const p: any = campaign.payload;
  if (!p?.adGroups?.length) throw new Error("Campaign has no ad groups");

  // Respect the autonomy guardrail (daily budget cap).
  let dailyIdr = Number(campaign.dailyBudget || p.dailyBudgetSuggested || 50000);
  if (env.dailyCapIdr && dailyIdr > env.dailyCapIdr) dailyIdr = env.dailyCapIdr;
  const budgetMicros = Math.round(dailyIdr) * 1_000_000;

  const tmp = (n: string) => `-${n}`; // temp negative resource ids for chaining
  const cid = env.customerId;

  // 1) Budget
  const budgetRes = await mutate(env, "campaignBudgets", [{
    create: { name: `${campaign.name} budget ${Date.now()}`, amountMicros: String(budgetMicros), deliveryMethod: "STANDARD" },
  }]);
  const budgetRN = budgetRes.results[0].resourceName;

  // 2) Campaign (PAUSED, Search, manual CPC, search network only)
  const campaignRes = await mutate(env, "campaigns", [{
    create: {
      // Unique suffix (date + time + random) so re-pushes never collide with
      // an existing paused/active campaign (DUPLICATE_CAMPAIGN_NAME).
      name: `${campaign.name} ${new Date().toISOString().slice(0, 16).replace("T", " ")} #${Math.random().toString(36).slice(2, 6)}`,
      status: "PAUSED",
      advertisingChannelType: "SEARCH",
      manualCpc: { enhancedCpcEnabled: false },
      campaignBudget: budgetRN,
      networkSettings: { targetGoogleSearch: true, targetSearchNetwork: false, targetContentNetwork: false, targetPartnerSearchNetwork: false },
      // Required by Google Ads API v21+ (EU political-ads disclosure).
      containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
    },
  }]);
  const campaignRN = campaignRes.results[0].resourceName;

  // 3) Geo (Indonesia) + languages (ID + EN)
  await mutate(env, "campaignCriteria", [
    { create: { campaign: campaignRN, location: { geoTargetConstant: GEO_INDONESIA } } },
    { create: { campaign: campaignRN, language: { languageConstant: LANG_INDONESIAN } } },
    { create: { campaign: campaignRN, language: { languageConstant: LANG_ENGLISH } } },
    ...(Array.isArray(p.negativeKeywords) ? p.negativeKeywords.slice(0, 50).map((n: string) => ({
      create: { campaign: campaignRN, negative: true, keyword: { text: String(n).slice(0, 80), matchType: "BROAD" } },
    })) : []),
  ]);

  // 4) Ad groups + keywords + RSA
  const headlines = (p.responsiveSearchAd?.headlines || []).slice(0, 15).map((t: string) => ({ text: String(t).slice(0, 30) }));
  const descriptions = (p.responsiveSearchAd?.descriptions || []).slice(0, 4).map((t: string) => ({ text: String(t).slice(0, 90) }));
  const finalUrl = p.finalUrlBase || `https://www.spectaeducation.com${campaign.landingPath || "/contact"}`;

  for (const ag of p.adGroups) {
    const agRes = await mutate(env, "adGroups", [{
      create: { name: String(ag.name).slice(0, 120), campaign: campaignRN, status: "ENABLED", type: "SEARCH_STANDARD", cpcBidMicros: String(2000 * 1_000_000) },
    }]);
    const agRN = agRes.results[0].resourceName;

    const kwOps = (ag.keywords || []).slice(0, 100).map((k: any) => ({
      create: {
        adGroup: agRN,
        status: "ENABLED",
        keyword: { text: String(k.text).slice(0, 80), matchType: (k.matchType || "phrase").toUpperCase() },
      },
    }));
    if (kwOps.length) await mutate(env, "adGroupCriteria", kwOps);

    await mutate(env, "adGroupAds", [{
      create: {
        adGroup: agRN,
        status: "ENABLED",
        ad: {
          finalUrls: [finalUrl],
          responsiveSearchAd: {
            headlines,
            descriptions,
            ...(p.responsiveSearchAd?.path1 ? { path1: String(p.responsiveSearchAd.path1).slice(0, 15) } : {}),
            ...(p.responsiveSearchAd?.path2 ? { path2: String(p.responsiveSearchAd.path2).slice(0, 15) } : {}),
          },
        },
      },
    }]);
  }

  return { campaignResourceName: campaignRN };
}

// ── D3: AI optimizer (Advisor mode — suggests, you approve) ──────────────────
export interface AdRec {
  type: "pause_keyword" | "scale_budget";
  resourceName: string;
  title: string;
  reason: string;
  amountMicros?: string;       // for scale_budget
}

/**
 * Read the last 30 days and return recommended changes — never applies them.
 * Guardrails: waste threshold (default Rp50k) and the daily budget cap.
 */
export async function getRecommendations(): Promise<AdRec[]> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  const threshold = Number(process.env.GOOGLE_ADS_WASTE_THRESHOLD_IDR || 50000);
  const recs: AdRec[] = [];

  // 1) Wasteful keywords: spent >= threshold with zero conversions.
  const kw = await search(env, `
    SELECT campaign.name, ad_group_criterion.keyword.text, ad_group_criterion.resource_name,
           metrics.cost_micros, metrics.clicks, metrics.conversions
    FROM keyword_view
    WHERE segments.date DURING LAST_30_DAYS AND ad_group_criterion.status = 'ENABLED'
  `);
  const km = new Map<string, { text: string; campaign: string; cost: number; clicks: number; conv: number }>();
  for (const r of kw) {
    const rn = r.adGroupCriterion?.resourceName;
    if (!rn) continue;
    const cur = km.get(rn) || { text: r.adGroupCriterion?.keyword?.text || "", campaign: r.campaign?.name || "", cost: 0, clicks: 0, conv: 0 };
    cur.cost += Number(r.metrics?.costMicros || 0) / 1e6;
    cur.clicks += Number(r.metrics?.clicks || 0);
    cur.conv += Number(r.metrics?.conversions || 0);
    km.set(rn, cur);
  }
  for (const [rn, v] of Array.from(km.entries())) {
    if (v.cost >= threshold && v.conv === 0 && v.clicks >= 5) {
      recs.push({
        type: "pause_keyword", resourceName: rn,
        title: `Pause keyword "${v.text}"`,
        reason: `Spent Rp${Math.round(v.cost).toLocaleString("id-ID")} over ${v.clicks} clicks with 0 conversions (last 30 days) in "${v.campaign}".`,
      });
    }
  }

  // 2) Scale winners: campaigns with conversions, bump budget +20% within cap.
  const camps = await search(env, `
    SELECT campaign.name, campaign_budget.resource_name, campaign_budget.amount_micros,
           metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS AND campaign.status = 'ENABLED'
  `);
  const cm = new Map<string, { name: string; budgetMicros: number; cost: number; conv: number }>();
  for (const r of camps) {
    const rn = r.campaignBudget?.resourceName;
    if (!rn) continue;
    const cur = cm.get(rn) || { name: r.campaign?.name || "", budgetMicros: Number(r.campaignBudget?.amountMicros || 0), cost: 0, conv: 0 };
    cur.cost += Number(r.metrics?.costMicros || 0) / 1e6;
    cur.conv += Number(r.metrics?.conversions || 0);
    cm.set(rn, cur);
  }
  const capMicros = env.dailyCapIdr ? env.dailyCapIdr * 1e6 : undefined;
  for (const [rn, v] of Array.from(cm.entries())) {
    if (v.conv >= 1 && v.budgetMicros > 0) {
      let next = Math.round(v.budgetMicros * 1.2);
      if (capMicros && next > capMicros) next = capMicros;
      if (next > v.budgetMicros) {
        recs.push({
          type: "scale_budget", resourceName: rn, amountMicros: String(next),
          title: `Scale "${v.name}" budget +20%`,
          reason: `${v.conv} conversion(s) in 30 days — raise daily budget to Rp${Math.round(next / 1e6).toLocaleString("id-ID")}${capMicros && next === capMicros ? " (your cap)" : ""}.`,
        });
      }
    }
  }
  return recs;
}

/** Apply one approved recommendation (Advisor mode action). */
export async function applyRecommendation(rec: { type: AdRec["type"]; resourceName: string; amountMicros?: string }): Promise<{ ok: true }> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  if (rec.type === "pause_keyword") {
    await mutate(env, "adGroupCriteria", [{ update: { resourceName: rec.resourceName, status: "PAUSED" }, updateMask: "status" }]);
  } else if (rec.type === "scale_budget") {
    if (!rec.amountMicros) throw new Error("Missing budget amount");
    await mutate(env, "campaignBudgets", [{ update: { resourceName: rec.resourceName, amountMicros: rec.amountMicros }, updateMask: "amount_micros" }]);
  }
  return { ok: true };
}

// ── D3 Advisor scheduler: daily email of suggestions (you approve in-app) ─────
// Persistence: `lastOptDay` USED to be in-memory only — which meant every
// Railway redeploy reset it, and the 2-minute-after-startup fire (setTimeout
// below) would send a fresh email. When we shipped 10+ deploys in one afternoon
// the owner got 10+ spam emails. Now we persist via a DB marker so restarts
// don't re-fire, and we skip the immediate startup fire entirely.
let optStarted = false;

/** Marker table row key. */
const OPT_MARKER_KEY = "google_ads_advisor_last_email_day";

async function readLastOptDay(): Promise<string> {
  try {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) return "";
    // Reuse the growth_digests table's periodLabel column as a simple KV
    // store — cheaper than a new table for a single row. Row identified by
    // a sentinel periodLabel starting with "_meta:".
    const { sql } = await import("drizzle-orm");
    const rows: any = await db.execute(sql`
      SELECT summary FROM growth_digests
      WHERE periodLabel = ${"_meta:" + OPT_MARKER_KEY}
      LIMIT 1
    `);
    const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
    return list?.[0]?.summary || "";
  } catch { return ""; }
}

async function writeLastOptDay(day: string): Promise<void> {
  try {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) return;
    const { sql } = await import("drizzle-orm");
    // Upsert the sentinel row.
    await db.execute(sql`
      INSERT INTO growth_digests (periodLabel, summary, wins, todos, spendTotal)
      VALUES (${"_meta:" + OPT_MARKER_KEY}, ${day}, ${""}, ${""}, ${"0"})
      ON DUPLICATE KEY UPDATE summary = ${day}
    `);
  } catch (e) {
    console.warn("[GoogleAds] failed to persist advisor last-run day:", (e as Error).message);
  }
}

async function optTick() {
  if (!isGoogleAdsConfigured() || process.env.GOOGLE_ADS_OPTIMIZER_ENABLED !== "true") return;
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // WIB
  const day = now.toISOString().slice(0, 10);
  if (now.getUTCHours() < 7) return; // wait for 07:00 WIB
  const lastDay = await readLastOptDay();
  if (lastDay === day) return; // already emailed today (survives restarts now)
  await writeLastOptDay(day); // claim the day BEFORE emailing so a slow
                              // getRecommendations doesn't allow a concurrent
                              // second tick to also send.
  try {
    const recs = await getRecommendations();
    if (recs.length) {
      await notifyOwner({
        title: `Google Ads — ${recs.length} optimization suggestion(s)`,
        content: recs.map((r, i) => `${i + 1}. ${r.title}\n   ${r.reason}`).join("\n\n") +
          `\n\nReview & approve in /admin → Ads Co-pilot → AI Recommendations.`,
      });
      console.log(`[GoogleAds] advisor emailed ${recs.length} suggestion(s)`);
    }
  } catch (e) {
    console.error("[GoogleAds] advisor failed:", (e as Error).message);
  }
}

export function startGoogleAdsOptimizer() {
  if (optStarted) return;
  if (!isGoogleAdsConfigured() || process.env.GOOGLE_ADS_OPTIMIZER_ENABLED !== "true") {
    console.log("[GoogleAds] optimizer (Advisor) off — set GOOGLE_ADS_OPTIMIZER_ENABLED=true to enable daily suggestions.");
    return;
  }
  optStarted = true;
  console.log("[GoogleAds] optimizer (Advisor) on — daily suggestions emailed for your approval.");
  setInterval(() => { void optTick(); }, 60 * 60 * 1000);
  // NOTE: removed the 2-min-after-startup fire. That was the cause of the
  // "spam-on-every-deploy" bug — every Railway redeploy would trigger a fresh
  // email regardless of whether one had already been sent today. The hourly
  // interval + DB-persisted lastOptDay is enough. Owner will get the first
  // email of the day between 07:00 and 08:00 WIB on the next daily tick.
}

// ── Daily auto-sync scheduler (only runs when credentials exist) ──────────────
let started = false;
let lastSyncDay = "";

async function tick() {
  if (!isGoogleAdsConfigured()) return;
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // WIB
  const day = now.toISOString().slice(0, 10);
  if (now.getUTCHours() < 6 || lastSyncDay === day) return; // once a day, after ~06:00 WIB
  lastSyncDay = day;
  const month = day.slice(0, 7);
  try {
    const n = await syncPerformance(month);
    console.log(`[GoogleAds] auto-synced ${n} campaign(s) for ${month}`);
  } catch (e) {
    console.error("[GoogleAds] auto-sync failed:", (e as Error).message);
  }
}

export function startGoogleAdsScheduler() {
  if (started) return;
  if (!isGoogleAdsConfigured()) {
    console.log("[GoogleAds] live API dormant (set GOOGLE_ADS_* env vars to enable sync).");
    return;
  }
  started = true;
  console.log("[GoogleAds] live API enabled — daily performance auto-sync on.");
  setInterval(() => { void tick(); }, 60 * 60 * 1000); // hourly check, runs once/day
  setTimeout(() => { void tick(); }, 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN MANAGEMENT — read + mutate from the admin without leaving the app
//
// Owner shouldn't have to open Google Ads UI to change a landing URL, pause a
// wasteful keyword, or add negatives — we built the launcher, we should build
// the fixer too. These functions plus their tRPC wrappers power the campaign-
// management UI on /admin/ads-launcher.
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignAdSummary {
  resourceName: string;
  adId: string;
  adGroupName: string;
  status: string;         // ENABLED / PAUSED
  type: string;           // RESPONSIVE_SEARCH_AD / EXPANDED_TEXT_AD / ...
  finalUrls: string[];
  headlineCount: number;
  descriptionCount: number;
}

export interface CampaignKeywordRow {
  criterionResourceName: string;
  adGroupName: string;
  text: string;
  matchType: string;      // BROAD / PHRASE / EXACT
  status: string;         // ENABLED / PAUSED
  cost30dIdr: number;
  clicks30d: number;
  impressions30d: number;
  ctr30d: number;
  conversions30d: number;
  isNegative: boolean;    // whether this is a NEGATIVE keyword
}

/** Full detail for one campaign — ads, keywords (incl. negatives), current metrics. */
export async function getCampaignDetail(campaignId: string): Promise<{
  campaignName: string;
  status: string;
  ads: CampaignAdSummary[];
  keywords: CampaignKeywordRow[];
  negatives: string[];   // campaign-level negatives, flat list
} | null> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  const cid = campaignId.replace(/\D/g, "");
  if (!cid) return null;

  // Campaign basics.
  const camps = await search(env, `
    SELECT campaign.id, campaign.name, campaign.status
    FROM campaign
    WHERE campaign.id = ${cid} LIMIT 1
  `);
  if (!camps.length) return null;
  const campaignName = camps[0].campaign?.name || "";
  const campaignStatus = camps[0].campaign?.status || "UNKNOWN";

  // Ads with final URLs.
  const adRows = await search(env, `
    SELECT ad_group.name, ad_group_ad.resource_name, ad_group_ad.status,
           ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.ad.final_urls,
           ad_group_ad.ad.responsive_search_ad.headlines,
           ad_group_ad.ad.responsive_search_ad.descriptions
    FROM ad_group_ad
    WHERE campaign.id = ${cid} AND ad_group_ad.status != 'REMOVED'
  `);
  const ads: CampaignAdSummary[] = adRows.map((r: any) => ({
    resourceName: r.adGroupAd?.resourceName || "",
    adId: String(r.adGroupAd?.ad?.id || ""),
    adGroupName: r.adGroup?.name || "",
    status: r.adGroupAd?.status || "UNKNOWN",
    type: r.adGroupAd?.ad?.type || "UNKNOWN",
    finalUrls: r.adGroupAd?.ad?.finalUrls || [],
    headlineCount: (r.adGroupAd?.ad?.responsiveSearchAd?.headlines || []).length,
    descriptionCount: (r.adGroupAd?.ad?.responsiveSearchAd?.descriptions || []).length,
  }));

  // Keywords with last-30d performance.
  const kwRows = await search(env, `
    SELECT ad_group.name, ad_group_criterion.resource_name,
           ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
           ad_group_criterion.status, ad_group_criterion.negative,
           metrics.cost_micros, metrics.clicks, metrics.impressions,
           metrics.conversions
    FROM keyword_view
    WHERE campaign.id = ${cid}
      AND segments.date DURING LAST_30_DAYS
      AND ad_group_criterion.status != 'REMOVED'
  `);
  // Aggregate rows by resource name (Google returns per-day rows).
  const kwMap = new Map<string, CampaignKeywordRow>();
  for (const r of kwRows) {
    const rn = r.adGroupCriterion?.resourceName || "";
    if (!rn) continue;
    const cur = kwMap.get(rn) || {
      criterionResourceName: rn,
      adGroupName: r.adGroup?.name || "",
      text: r.adGroupCriterion?.keyword?.text || "",
      matchType: r.adGroupCriterion?.keyword?.matchType || "UNKNOWN",
      status: r.adGroupCriterion?.status || "UNKNOWN",
      cost30dIdr: 0, clicks30d: 0, impressions30d: 0,
      ctr30d: 0, conversions30d: 0,
      isNegative: !!r.adGroupCriterion?.negative,
    };
    cur.cost30dIdr += Number(r.metrics?.costMicros || 0) / 1e6;
    cur.clicks30d += Number(r.metrics?.clicks || 0);
    cur.impressions30d += Number(r.metrics?.impressions || 0);
    cur.conversions30d += Number(r.metrics?.conversions || 0);
    kwMap.set(rn, cur);
  }
  const keywords = Array.from(kwMap.values()).map(k => ({
    ...k,
    cost30dIdr: Math.round(k.cost30dIdr),
    ctr30d: k.impressions30d > 0 ? Number(((k.clicks30d / k.impressions30d) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.cost30dIdr - a.cost30dIdr);

  // Campaign-level negatives (separate table from keyword_view).
  const negRows = await search(env, `
    SELECT campaign_criterion.keyword.text
    FROM campaign_criterion
    WHERE campaign.id = ${cid}
      AND campaign_criterion.negative = TRUE
      AND campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.status != 'REMOVED'
  `);
  const negatives = negRows
    .map((r: any) => r.campaignCriterion?.keyword?.text)
    .filter((t: any): t is string => !!t);

  return { campaignName, status: campaignStatus, ads, keywords, negatives };
}

/** Update the final URL of one or more ads. Used to fix landing-page mismatches. */
export async function updateAdFinalUrls(input: {
  adResourceNames: string[];
  newFinalUrl: string;
}): Promise<{ updated: number }> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  const url = input.newFinalUrl.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("Final URL must start with http:// or https://");
  if (!input.adResourceNames.length) return { updated: 0 };

  // Google Ads API constraint: Ad.final_urls is IMMUTABLE on existing ads.
  // (The Google Ads UI's "edit final URL" hides this by doing remove+create
  // behind the scenes.) We do the same: fetch full ad content, create a
  // twin ad in the same ad group with the new URL, then remove the old one.
  // Batched via googleAds:mutate so both ops happen atomically per pair.

  // 1) Fetch each ad's full content — need headlines/descriptions/etc so
  //    we can recreate it perfectly with just the URL changed.
  const idFromRn = (rn: string) => rn.split("/").pop() || "";
  const ids = input.adResourceNames.map(idFromRn).filter(Boolean);
  if (ids.length === 0) throw new Error("No valid ad resource names");

  const rows = await search(env, `
    SELECT ad_group.resource_name, ad_group_ad.resource_name,
           ad_group_ad.status, ad_group_ad.ad.type,
           ad_group_ad.ad.responsive_search_ad.headlines,
           ad_group_ad.ad.responsive_search_ad.descriptions,
           ad_group_ad.ad.responsive_search_ad.path1,
           ad_group_ad.ad.responsive_search_ad.path2,
           ad_group_ad.ad.expanded_text_ad.headline_part1,
           ad_group_ad.ad.expanded_text_ad.headline_part2,
           ad_group_ad.ad.expanded_text_ad.headline_part3,
           ad_group_ad.ad.expanded_text_ad.description,
           ad_group_ad.ad.expanded_text_ad.description2,
           ad_group_ad.ad.expanded_text_ad.path1,
           ad_group_ad.ad.expanded_text_ad.path2
    FROM ad_group_ad
    WHERE ad_group_ad.ad.id IN (${ids.join(",")})
      AND ad_group_ad.status != 'REMOVED'
  `);
  if (rows.length === 0) throw new Error("None of those ads exist / are already removed");

  // 2) Build a single mutate batch: (create new, remove old) per ad. Google
  //    Ads' generic googleAds:mutate endpoint atomically handles mixed ops.
  const mutateOperations: any[] = [];
  let created = 0;

  for (const r of rows) {
    const adGroupRn = r.adGroup?.resourceName;
    const oldRn = r.adGroupAd?.resourceName;
    const type = r.adGroupAd?.ad?.type;
    if (!adGroupRn || !oldRn) continue;

    let newAd: any = null;
    if (type === "RESPONSIVE_SEARCH_AD") {
      const rsa = r.adGroupAd?.ad?.responsiveSearchAd || {};
      newAd = {
        finalUrls: [url],
        responsiveSearchAd: {
          headlines: rsa.headlines || [],
          descriptions: rsa.descriptions || [],
          ...(rsa.path1 ? { path1: rsa.path1 } : {}),
          ...(rsa.path2 ? { path2: rsa.path2 } : {}),
        },
      };
    } else if (type === "EXPANDED_TEXT_AD") {
      const eta = r.adGroupAd?.ad?.expandedTextAd || {};
      newAd = {
        finalUrls: [url],
        expandedTextAd: {
          headlinePart1: eta.headlinePart1 || "",
          headlinePart2: eta.headlinePart2 || "",
          ...(eta.headlinePart3 ? { headlinePart3: eta.headlinePart3 } : {}),
          description: eta.description || "",
          ...(eta.description2 ? { description2: eta.description2 } : {}),
          ...(eta.path1 ? { path1: eta.path1 } : {}),
          ...(eta.path2 ? { path2: eta.path2 } : {}),
        },
      };
    } else {
      // Unsupported ad type — skip. Owner can update from Google Ads UI.
      continue;
    }

    // Create the twin with the new URL. Keep same status as original.
    mutateOperations.push({
      adGroupAdOperation: {
        create: {
          adGroup: adGroupRn,
          status: r.adGroupAd?.status || "ENABLED",
          ad: newAd,
        },
      },
    });
    // Then remove the old one. Google Ads API executes ops in order.
    mutateOperations.push({
      adGroupAdOperation: { remove: oldRn },
    });
    created++;
  }

  if (mutateOperations.length === 0) {
    throw new Error("None of the ads are a supported type (Responsive Search Ad or Expanded Text Ad)");
  }

  // 3) Fire the batch via the generic googleAds:mutate endpoint.
  const res = await fetch(
    `${BASE}/customers/${env.customerId}/googleAds:mutate`,
    { method: "POST", headers: await headers(env), body: JSON.stringify({ mutateOperations }) },
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`googleAds:mutate failed: ${res.status} ${errText.slice(0, 500)}`);
  }
  return { updated: created };
}

/** Pause a single keyword by its criterion resource name. Idempotent-ish. */
export async function pauseKeyword(criterionResourceName: string): Promise<{ ok: true }> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  await mutate(env, "adGroupCriteria", [{
    update: { resourceName: criterionResourceName, status: "PAUSED" },
    updateMask: "status",
  }]);
  return { ok: true };
}

/** Re-enable a paused keyword. */
export async function enableKeyword(criterionResourceName: string): Promise<{ ok: true }> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  await mutate(env, "adGroupCriteria", [{
    update: { resourceName: criterionResourceName, status: "ENABLED" },
    updateMask: "status",
  }]);
  return { ok: true };
}

/**
 * Add campaign-level negative keywords. Match type defaults to BROAD so a
 * negative "gratis" blocks any query containing that word — which is
 * usually what you want for lead-quality negatives.
 */
export async function addNegativeKeywords(input: {
  campaignId: string;
  keywords: string[];
  matchType?: "BROAD" | "PHRASE" | "EXACT";
}): Promise<{ added: number; skipped: string[] }> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  const cid = input.campaignId.replace(/\D/g, "");
  if (!cid) throw new Error("Bad campaign id");
  const matchType = input.matchType || "BROAD";
  const clean = Array.from(new Set(
    input.keywords.map(k => k.trim().toLowerCase()).filter(k => k && k.length <= 80)
  ));
  if (!clean.length) return { added: 0, skipped: [] };

  const operations = clean.map(k => ({
    create: {
      campaign: `customers/${env.customerId}/campaigns/${cid}`,
      negative: true,
      keyword: { text: k, matchType },
      status: "ENABLED",
    },
  }));

  try {
    await mutate(env, "campaignCriteria", operations);
    return { added: clean.length, skipped: [] };
  } catch (e: any) {
    // Some may already exist — retry one-by-one to skip duplicates.
    let added = 0;
    const skipped: string[] = [];
    for (const k of clean) {
      try {
        await mutate(env, "campaignCriteria", [{
          create: {
            campaign: `customers/${env.customerId}/campaigns/${cid}`,
            negative: true,
            keyword: { text: k, matchType },
            status: "ENABLED",
          },
        }]);
        added++;
      } catch (err: any) {
        skipped.push(k);
      }
    }
    if (added === 0 && skipped.length === clean.length) {
      throw new Error(`Could not add any negatives: ${(e as Error).message}`);
    }
    return { added, skipped };
  }
}

/** Change campaign status: ENABLED / PAUSED. */
export async function setCampaignStatus(campaignId: string, status: "ENABLED" | "PAUSED"): Promise<{ ok: true }> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  const cid = campaignId.replace(/\D/g, "");
  await mutate(env, "campaigns", [{
    update: { resourceName: `customers/${env.customerId}/campaigns/${cid}`, status },
    updateMask: "status",
  }]);
  return { ok: true };
}

/** Update daily budget for a campaign (in IDR, converted to micros). */
export async function updateCampaignBudget(input: {
  campaignId: string;
  newDailyBudgetIdr: number;
}): Promise<{ ok: true }> {
  const env = readEnv();
  if (!env) throw new Error("Google Ads not configured");
  const cid = input.campaignId.replace(/\D/g, "");
  // Look up the budget resource this campaign uses.
  const rows = await search(env, `
    SELECT campaign_budget.resource_name
    FROM campaign WHERE campaign.id = ${cid} LIMIT 1
  `);
  const budgetRn = rows?.[0]?.campaignBudget?.resourceName;
  if (!budgetRn) throw new Error("Campaign has no budget resource");
  const microsCapped = Math.min(input.newDailyBudgetIdr, env.dailyCapIdr || Infinity);
  await mutate(env, "campaignBudgets", [{
    update: { resourceName: budgetRn, amountMicros: String(Math.round(microsCapped) * 1_000_000) },
    updateMask: "amount_micros",
  }]);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE CONVERSION IMPORT
//
// Real-world problem: browser-side gtag conversion firing misses ~30-50% of
// actual payments because:
//   - Students pay via mobile banking app and never return to /success page
//   - Adblockers block gtag entirely (15-25% of users)
//   - Slow-loading success page → student closes tab before fire
//   - The tag ID was wrong for weeks before we noticed
//
// Fix: fire conversions FROM THE SERVER on the Xendit webhook. Every paid
// order gets uploaded to Google Ads regardless of what the browser did.
//
// Requires GCLID → so we capture it from the specta_attr cookie at checkout
// time and store it on the payment entity. If GCLID is missing (organic,
// direct, or Meta traffic) the upload is skipped — Google Ads can only
// attribute clicks it knows about.
// ─────────────────────────────────────────────────────────────────────────────

/** In-memory cache of conversion-action names → their Google Ads resource names.
 *  Populated on first upload; cleared every hour to pick up new actions. */
let conversionActionCache: { at: number; byName: Map<string, string> } | null = null;

async function getConversionActionByName(env: Env, name: string): Promise<string | null> {
  if (conversionActionCache && Date.now() - conversionActionCache.at < 60 * 60 * 1000) {
    return conversionActionCache.byName.get(name) || null;
  }
  const rows = await search(env, `
    SELECT conversion_action.id, conversion_action.name, conversion_action.resource_name
    FROM conversion_action
    WHERE conversion_action.status = 'ENABLED'
  `);
  const map = new Map<string, string>();
  for (const r of rows) {
    const rn = r.conversionAction?.resourceName;
    const nm = r.conversionAction?.name;
    if (rn && nm) map.set(nm, rn);
  }
  conversionActionCache = { at: Date.now(), byName: map };
  return map.get(name) || null;
}

/** The 4 conversion action names the site uses.
 *  Must match what the owner named them in Google Ads → Goals → Conversion actions. */
export type ConversionKind =
  | "Mock Test purchased"
  | "AI Tutor subscribed"
  | "IGCSE subscribed"
  | "Student registered";

/**
 * Upload one conversion to Google Ads. Idempotent: Google dedupes by
 * `gclid + conversionAction + gclidDateTime` so re-running with the same
 * order is safe. Value is in IDR (not micros — the API takes floats).
 *
 * Returns:
 *   { uploaded: true }  — Google accepted
 *   { uploaded: false, reason }  — skipped or Google rejected (logged)
 *
 * NEVER throws — callers should be able to fire-and-forget from a webhook.
 */
export async function uploadOfflineConversion(input: {
  kind: ConversionKind;
  gclid: string | null | undefined;
  valueIdr: number;
  occurredAt: Date;
  orderId?: string | null;
}): Promise<{ uploaded: boolean; reason?: string }> {
  try {
    const env = readEnv();
    if (!env) return { uploaded: false, reason: "Google Ads not configured" };
    if (!input.gclid) return { uploaded: false, reason: "no gclid (organic/direct/other-source click)" };
    if (!(input.valueIdr > 0)) return { uploaded: false, reason: "value must be > 0" };

    const conversionAction = await getConversionActionByName(env, input.kind);
    if (!conversionAction) {
      console.error(`[GoogleAds] uploadOfflineConversion: conversion action "${input.kind}" not found in account`);
      return { uploaded: false, reason: `conversion action "${input.kind}" not found in Google Ads account` };
    }

    // Google Ads accepts either RFC3339 with timezone or "yyyy-MM-dd HH:mm:ss+ZZ:ZZ".
    // We use Jakarta local time (WIB, +07:00) to match how sales are reported to owner.
    const dt = new Date(input.occurredAt.getTime() + 7 * 60 * 60 * 1000)
      .toISOString().replace("T", " ").replace(/\.\d+Z$/, "+07:00");

    const body = {
      conversions: [{
        gclid: input.gclid,
        conversionAction,
        conversionDateTime: dt,
        conversionValue: input.valueIdr,
        currencyCode: "IDR",
        ...(input.orderId ? { orderId: String(input.orderId).slice(0, 64) } : {}),
      }],
      partialFailure: true,
      validateOnly: false,
    };

    const res = await fetch(
      `${BASE}/customers/${env.customerId}:uploadClickConversions`,
      { method: "POST", headers: await headers(env), body: JSON.stringify(body) },
    );
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      console.error("[GoogleAds] uploadOfflineConversion failed:", res.status, JSON.stringify(data).slice(0, 400));
      return { uploaded: false, reason: `${res.status} ${JSON.stringify(data).slice(0, 200)}` };
    }
    if (data?.partialFailureError) {
      console.warn("[GoogleAds] uploadOfflineConversion partial failure:", JSON.stringify(data.partialFailureError).slice(0, 400));
      return { uploaded: false, reason: `partial: ${data.partialFailureError.message || "unknown"}` };
    }
    console.log(`[GoogleAds] conversion uploaded: ${input.kind} value=${input.valueIdr} order=${input.orderId || "n/a"} gclid=${input.gclid.slice(0, 12)}…`);
    return { uploaded: true };
  } catch (e) {
    console.error("[GoogleAds] uploadOfflineConversion crashed:", (e as Error).message);
    return { uploaded: false, reason: (e as Error).message };
  }
}
