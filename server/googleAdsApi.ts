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

const API_VERSION = "v17";
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
      name: `${campaign.name} ${new Date().toISOString().slice(0, 10)}`,
      status: "PAUSED",
      advertisingChannelType: "SEARCH",
      manualCpc: { enhancedCpcEnabled: false },
      campaignBudget: budgetRN,
      networkSettings: { targetGoogleSearch: true, targetSearchNetwork: false, targetContentNetwork: false, targetPartnerSearchNetwork: false },
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
