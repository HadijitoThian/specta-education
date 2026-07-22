/**
 * WhatsApp click attribution — the bridge between a Google/Meta ad click and
 * the eventual Emma-mediated payment. Fixes the "GCLID lost when browser
 * hands off to WhatsApp app" problem that makes ad ROI invisible.
 *
 * How it works end-to-end:
 *
 *   1. Marketing generates a trackable link at /admin/wa-links, e.g.
 *      https://www.spectaeducation.com/wa/tutor-gad-jul26
 *
 *   2. The ad on Google Ads / IG uses that link. When a student clicks it,
 *      /wa/:code (see server/_core/index.ts) reads the current
 *      specta_attr cookie for GCLID + UTMs, INSERTs a wa_sessions row with
 *      a fresh sessionId, and 302-redirects to wa.me with a pre-filled
 *      message containing "[REF:WA-abc123]".
 *
 *   3. Student hits Send in WhatsApp. Emma bot (separate service) receives
 *      the message, parses the [REF:...], calls GET /api/wa/lookup/:sessionId
 *      on our server, gets back { product, greeting, gclid, ... }, and
 *      personalises her reply. When she creates the CRM lead she passes
 *      { phone, waSessionId } — we then link the session row to the leadId
 *      and copy GCLID + UTMs onto the leads row (via attribution.ts fields).
 *
 *   4. Days later the student pays via Xendit. Webhook fires → we look up
 *      the lead's wa_session → if a GCLID is stored, we upload an offline
 *      conversion to the Google Ads API (uploadOfflineConversion) so
 *      Google's Smart Bidding sees "ad #47 → Rp 249k paid customer" and
 *      bids more aggressively on that ad next time.
 *
 * The design keeps the WhatsApp bot (which lives in a separate Railway
 * service — see server/crmBotApi.ts docstring) as a thin client. All the
 * attribution logic + Google Ads integration lives here in the CRM.
 */

import crypto from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import type { LeadAttribution } from "./attribution";

// ── DB SCHEMA ──────────────────────────────────────────────────────────────

/**
 * Idempotent CREATE TABLE for the two attribution tables. Runs on boot.
 * Uses raw SQL (not Drizzle) so it's self-contained and won't drift with
 * the shared schema.ts. Every ALTER/CREATE is wrapped in its own try so
 * duplicate-object errors are harmless on subsequent boots.
 */
export async function ensureWaAttributionSchema(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const stmts = [
    // wa_sessions — one row per click on a trackable /wa/:code link.
    // Bounded lifespan (expiresAt ~90d out) so this table doesn't grow
    // forever; a nightly cleanup can drop expired unconverted rows.
    `CREATE TABLE IF NOT EXISTS wa_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sessionId VARCHAR(32) NOT NULL UNIQUE,
      campaignCode VARCHAR(100) NOT NULL,
      product VARCHAR(24) NOT NULL,
      platform VARCHAR(24) NOT NULL,
      utmSource VARCHAR(120) NULL,
      utmMedium VARCHAR(120) NULL,
      utmCampaign VARCHAR(160) NULL,
      utmTerm VARCHAR(160) NULL,
      utmContent VARCHAR(160) NULL,
      gclid VARCHAR(255) NULL,
      referrer VARCHAR(512) NULL,
      landingPage VARCHAR(512) NULL,
      userAgent VARCHAR(512) NULL,
      ipAddress VARCHAR(45) NULL,
      leadId INT NULL,
      messagedAt TIMESTAMP NULL,
      clickedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      convertedAt TIMESTAMP NULL,
      conversionKind VARCHAR(24) NULL,
      conversionValueIdr DECIMAL(12, 2) NULL,
      offlineUploadedAt TIMESTAMP NULL,
      offlineUploadStatus VARCHAR(24) NULL,
      offlineUploadError VARCHAR(512) NULL,
      expiresAt TIMESTAMP NOT NULL,
      INDEX idx_wa_sessions_sessionId (sessionId),
      INDEX idx_wa_sessions_leadId (leadId),
      INDEX idx_wa_sessions_campaignCode (campaignCode),
      INDEX idx_wa_sessions_clickedAt (clickedAt),
      INDEX idx_wa_sessions_gclid (gclid(191))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // wa_campaigns — the catalog of trackable link codes. Admin maintains
    // this via /admin/wa-links. Each row is a template that /wa/:code
    // reads to know product + greeting + platform.
    `CREATE TABLE IF NOT EXISTS wa_campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      product VARCHAR(24) NOT NULL,
      platform VARCHAR(24) NOT NULL,
      greeting TEXT NULL,
      targetPhone VARCHAR(20) NOT NULL,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_wa_campaigns_code (code),
      INDEX idx_wa_campaigns_product (product)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e) {
      console.error("[waAttribution] schema stmt failed:", (e as Error).message);
    }
  }
}

// ── TYPES ──────────────────────────────────────────────────────────────────

export type WaProduct =
  | "mock"
  | "tutor"
  | "igcse"
  | "ielts_course"
  | "study_abroad"
  | "scholarship"
  | "aptitude"
  | "consult"
  | "other";

export type WaPlatform =
  | "google_ads"
  | "meta_ads"
  | "instagram_ads"
  | "instagram_organic"
  | "tiktok_ads"
  | "tiktok_organic"
  | "youtube_ads"
  | "email"
  | "sms"
  | "organic"
  | "direct"
  | "referral"
  | "unknown";

export interface WaCampaign {
  id: number;
  code: string;
  name: string;
  product: WaProduct;
  platform: WaPlatform;
  greeting: string | null;
  targetPhone: string;
  isActive: boolean;
}

export interface WaSession {
  id: number;
  sessionId: string;
  campaignCode: string;
  product: WaProduct;
  platform: WaPlatform;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  referrer: string | null;
  landingPage: string | null;
  leadId: number | null;
  messagedAt: Date | null;
  clickedAt: Date;
  convertedAt: Date | null;
  conversionKind: string | null;
  conversionValueIdr: string | null;
  offlineUploadedAt: Date | null;
  offlineUploadStatus: string | null;
  offlineUploadError: string | null;
}

// ── CAMPAIGN CRUD ─────────────────────────────────────────────────────────

export async function listCampaigns(includeInactive = false): Promise<WaCampaign[]> {
  const db = await getDb();
  if (!db) return [];
  const where = includeInactive ? sql`` : sql`WHERE isActive = TRUE`;
  const rows: any = await db.execute(sql`
    SELECT id, code, name, product, platform, greeting, targetPhone, isActive
    FROM wa_campaigns ${where}
    ORDER BY createdAt DESC
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return list.map(r => ({
    id: Number(r.id),
    code: r.code,
    name: r.name,
    product: r.product,
    platform: r.platform,
    greeting: r.greeting ?? null,
    targetPhone: r.targetPhone,
    isActive: !!r.isActive,
  }));
}

export async function getCampaignByCode(code: string): Promise<WaCampaign | null> {
  const db = await getDb();
  if (!db) return null;
  const rows: any = await db.execute(sql`
    SELECT id, code, name, product, platform, greeting, targetPhone, isActive
    FROM wa_campaigns WHERE code = ${code} AND isActive = TRUE LIMIT 1
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  const r = list?.[0];
  if (!r) return null;
  return {
    id: Number(r.id), code: r.code, name: r.name,
    product: r.product, platform: r.platform,
    greeting: r.greeting ?? null, targetPhone: r.targetPhone,
    isActive: !!r.isActive,
  };
}

export async function createCampaign(input: {
  code: string;
  name: string;
  product: WaProduct;
  platform: WaPlatform;
  greeting?: string | null;
  targetPhone: string;
  createdBy?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.execute(sql`
    INSERT INTO wa_campaigns (code, name, product, platform, greeting, targetPhone, createdBy)
    VALUES (${input.code}, ${input.name}, ${input.product}, ${input.platform},
            ${input.greeting ?? null}, ${input.targetPhone}, ${input.createdBy ?? null})
  `);
}

export async function setCampaignActive(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE wa_campaigns SET isActive = ${isActive} WHERE id = ${id}`);
}

// ── SESSION CREATION ──────────────────────────────────────────────────────

/**
 * Generate a short URL-safe session ID. 16 base64url chars ≈ 96 bits of
 * entropy — plenty for a 90-day rolling window.
 */
function newSessionId(): string {
  return "WA-" + crypto.randomBytes(12).toString("base64url");
}

/**
 * Create a click session and return the WhatsApp URL the caller should
 * redirect to. This is the heart of the /wa/:code handler.
 */
export async function createSessionAndBuildUrl(input: {
  campaign: WaCampaign;
  attribution: LeadAttribution;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{ sessionId: string; whatsappUrl: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const sessionId = newSessionId();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  await db.execute(sql`
    INSERT INTO wa_sessions
      (sessionId, campaignCode, product, platform,
       utmSource, utmMedium, utmCampaign, utmTerm, utmContent,
       gclid, referrer, landingPage, userAgent, ipAddress, expiresAt)
    VALUES
      (${sessionId}, ${input.campaign.code}, ${input.campaign.product}, ${input.campaign.platform},
       ${input.attribution.utmSource ?? null}, ${input.attribution.utmMedium ?? null},
       ${input.attribution.utmCampaign ?? null}, ${input.attribution.utmTerm ?? null},
       ${input.attribution.utmContent ?? null},
       ${input.attribution.gclid ?? null},
       ${input.referrer ?? input.attribution.attributionReferrer ?? null},
       ${input.attribution.landingPage ?? null},
       ${input.userAgent ?? null}, ${input.ipAddress ?? null}, ${expiresAt})
  `);

  const phone = input.campaign.targetPhone.replace(/\D/g, "");
  const rawText = (input.campaign.greeting || "Halo, saya mau info tentang SpecTa Education")
    .trim();
  // Embed the ref code so Emma can identify the session from the first
  // message. Kept in a bracketed tag so Emma can strip it out cleanly
  // before showing the conversation to a human counsellor.
  const text = `${rawText} [REF:${sessionId}]`;
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  return { sessionId, whatsappUrl };
}

// ── SESSION LOOKUP + LEAD LINK ────────────────────────────────────────────

export async function getSession(sessionId: string): Promise<WaSession | null> {
  const db = await getDb();
  if (!db) return null;
  const rows: any = await db.execute(sql`
    SELECT id, sessionId, campaignCode, product, platform,
           utmSource, utmMedium, utmCampaign, utmTerm, utmContent,
           gclid, referrer, landingPage, leadId,
           messagedAt, clickedAt, convertedAt, conversionKind, conversionValueIdr,
           offlineUploadedAt, offlineUploadStatus, offlineUploadError
    FROM wa_sessions WHERE sessionId = ${sessionId} LIMIT 1
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  const r = list?.[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    sessionId: r.sessionId,
    campaignCode: r.campaignCode,
    product: r.product,
    platform: r.platform,
    utmSource: r.utmSource, utmMedium: r.utmMedium, utmCampaign: r.utmCampaign,
    utmTerm: r.utmTerm, utmContent: r.utmContent,
    gclid: r.gclid, referrer: r.referrer, landingPage: r.landingPage,
    leadId: r.leadId ? Number(r.leadId) : null,
    messagedAt: r.messagedAt ? new Date(r.messagedAt) : null,
    clickedAt: new Date(r.clickedAt),
    convertedAt: r.convertedAt ? new Date(r.convertedAt) : null,
    conversionKind: r.conversionKind,
    conversionValueIdr: r.conversionValueIdr ?? null,
    offlineUploadedAt: r.offlineUploadedAt ? new Date(r.offlineUploadedAt) : null,
    offlineUploadStatus: r.offlineUploadStatus,
    offlineUploadError: r.offlineUploadError,
  };
}

/**
 * Called by the bot API when Emma links a session to a lead in the CRM.
 * Stamps the leadId + messagedAt onto the wa_sessions row AND propagates
 * the session's stored GCLID / UTMs onto the leads row so downstream code
 * (attribution reports, offline conversion upload) can find it.
 */
export async function attachSessionToLead(sessionId: string, leadId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const session = await getSession(sessionId);
  if (!session) return;

  // Update the wa_sessions row.
  await db.execute(sql`
    UPDATE wa_sessions
    SET leadId = ${leadId}, messagedAt = COALESCE(messagedAt, NOW())
    WHERE sessionId = ${sessionId}
  `);

  // Backfill attribution onto the lead row if it doesn't already have it.
  // Only writes fields that are currently NULL — first-touch wins.
  await db.execute(sql`
    UPDATE leads SET
      utmSource     = COALESCE(utmSource, ${session.utmSource}),
      utmMedium     = COALESCE(utmMedium, ${session.utmMedium}),
      utmCampaign   = COALESCE(utmCampaign, ${session.utmCampaign}),
      utmTerm       = COALESCE(utmTerm, ${session.utmTerm}),
      utmContent    = COALESCE(utmContent, ${session.utmContent}),
      gclid         = COALESCE(gclid, ${session.gclid}),
      landingPage   = COALESCE(landingPage, ${session.landingPage}),
      source        = COALESCE(source, ${"whatsapp:" + session.campaignCode})
    WHERE id = ${leadId}
  `);
}

/**
 * Called by Xendit webhook when a purchase confirms. Looks up any
 * wa_session tied to the paying lead and records the conversion. Also
 * schedules an offline conversion upload if we have a GCLID.
 */
export async function recordConversion(input: {
  leadId: number;
  conversionKind: "mockTest" | "tutor" | "igcse";
  valueIdr: number;
}): Promise<{ sessionId: string; gclid: string | null } | null> {
  const db = await getDb();
  if (!db) return null;

  const rows: any = await db.execute(sql`
    SELECT sessionId, gclid FROM wa_sessions
    WHERE leadId = ${input.leadId} AND convertedAt IS NULL
    ORDER BY clickedAt DESC LIMIT 1
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  const r = list?.[0];
  if (!r) return null;

  await db.execute(sql`
    UPDATE wa_sessions SET
      convertedAt = NOW(),
      conversionKind = ${input.conversionKind},
      conversionValueIdr = ${input.valueIdr}
    WHERE sessionId = ${r.sessionId}
  `);
  return { sessionId: r.sessionId, gclid: r.gclid ?? null };
}

// ── STATS FOR ADMIN DASHBOARD ─────────────────────────────────────────────

/** Aggregated stats per campaign for /admin/wa-links dashboard. */
export interface WaCampaignStats {
  code: string;
  name: string;
  product: WaProduct;
  platform: WaPlatform;
  isActive: boolean;
  clicks: number;
  messaged: number;
  converted: number;
  revenueIdr: number;
}

export async function getCampaignStats(days = 30): Promise<WaCampaignStats[]> {
  const db = await getDb();
  if (!db) return [];
  const rows: any = await db.execute(sql`
    SELECT
      c.code, c.name, c.product, c.platform, c.isActive,
      COUNT(s.id) AS clicks,
      SUM(CASE WHEN s.messagedAt IS NOT NULL THEN 1 ELSE 0 END) AS messaged,
      SUM(CASE WHEN s.convertedAt IS NOT NULL THEN 1 ELSE 0 END) AS converted,
      COALESCE(SUM(s.conversionValueIdr), 0) AS revenueIdr
    FROM wa_campaigns c
    LEFT JOIN wa_sessions s
      ON s.campaignCode = c.code
     AND s.clickedAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    GROUP BY c.code, c.name, c.product, c.platform, c.isActive
    ORDER BY clicks DESC, c.createdAt DESC
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return list.map(r => ({
    code: r.code,
    name: r.name,
    product: r.product,
    platform: r.platform,
    isActive: !!r.isActive,
    clicks: Number(r.clicks || 0),
    messaged: Number(r.messaged || 0),
    converted: Number(r.converted || 0),
    revenueIdr: Number(r.revenueIdr || 0),
  }));
}

/** Recent sessions with lead + student info for the funnel view. */
export async function getRecentSessions(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const rows: any = await db.execute(sql`
    SELECT
      s.sessionId, s.campaignCode, s.product, s.platform,
      s.gclid, s.clickedAt, s.messagedAt, s.convertedAt,
      s.conversionKind, s.conversionValueIdr,
      s.offlineUploadStatus,
      l.id AS leadId, l.studentName, l.studentEmail, l.studentPhone
    FROM wa_sessions s
    LEFT JOIN leads l ON l.id = s.leadId
    ORDER BY s.clickedAt DESC
    LIMIT ${limit}
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return list.map(r => ({
    sessionId: r.sessionId,
    campaignCode: r.campaignCode,
    product: r.product,
    platform: r.platform,
    gclid: r.gclid,
    clickedAt: new Date(r.clickedAt),
    messagedAt: r.messagedAt ? new Date(r.messagedAt) : null,
    convertedAt: r.convertedAt ? new Date(r.convertedAt) : null,
    conversionKind: r.conversionKind,
    conversionValueIdr: r.conversionValueIdr ? Number(r.conversionValueIdr) : null,
    offlineUploadStatus: r.offlineUploadStatus,
    leadId: r.leadId ? Number(r.leadId) : null,
    studentName: r.studentName ?? null,
    studentEmail: r.studentEmail ?? null,
    studentPhone: r.studentPhone ?? null,
  }));
}

// ── GOOGLE ADS OFFLINE CONVERSION UPLOAD ──────────────────────────────────

/**
 * Upload a click-based offline conversion to Google Ads so its Smart Bidding
 * can attribute the eventual payment back to the specific ad click. Fires
 * from the Xendit webhook (after recordConversion links the payment to a
 * wa_session with a stored GCLID).
 *
 * Uses the Google Ads REST API v21+ `:uploadClickConversions` endpoint.
 * Needs the same env vars as googleAdsApi.ts:
 *   GOOGLE_ADS_DEVELOPER_TOKEN, CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN,
 *   CUSTOMER_ID, LOGIN_CUSTOMER_ID
 *
 * Conversion action label mapping is hardcoded to match the labels the
 * browser gtag currently fires, so Google Ads sees the offline upload as
 * "the same conversion action" and dedupes appropriately.
 */
const OFFLINE_LABEL_BY_KIND: Record<"mockTest" | "tutor" | "igcse", string> = {
  mockTest: "6BE9CJav_tMcEIiLhcgD",
  tutor:    "rM1JCOjU_tMcEIiLhcgD",
  igcse:    "yINBCJq6-9McEIiLhcgD",
};

interface GadsEnv {
  devToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  loginCustomerId: string;
}

function readGadsEnv(): GadsEnv | null {
  const e = process.env;
  const devToken = e.GOOGLE_ADS_DEVELOPER_TOKEN;
  const clientId = e.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = e.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = e.GOOGLE_ADS_REFRESH_TOKEN;
  const customerId = (e.GOOGLE_ADS_CUSTOMER_ID || "").replace(/\D/g, "");
  const loginCustomerId = (e.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replace(/\D/g, "");
  if (!devToken || !clientId || !clientSecret || !refreshToken || !customerId || !loginCustomerId) return null;
  return { devToken, clientId, clientSecret, refreshToken, customerId, loginCustomerId };
}

let cachedGadsToken: { value: string; exp: number } | null = null;

async function getGadsAccessToken(env: GadsEnv): Promise<string> {
  if (cachedGadsToken && Date.now() < cachedGadsToken.exp) return cachedGadsToken.value;
  const body = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: env.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`OAuth token failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedGadsToken = { value: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedGadsToken.value;
}

/**
 * Push an offline conversion to Google Ads. Best-effort — records success
 * or failure on the wa_sessions row for later retry / debugging.
 */
export async function uploadOfflineConversion(input: {
  sessionId: string;
  gclid: string;
  conversionKind: "mockTest" | "tutor" | "igcse";
  valueIdr: number;
  conversionAtIso?: string; // ISO datetime of the conversion; defaults to now
}): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, error: "DB unavailable" };

  const env = readGadsEnv();
  if (!env) {
    // Google Ads not configured — mark the session so we can retry later.
    await db.execute(sql`
      UPDATE wa_sessions
      SET offlineUploadStatus = 'skipped_no_config'
      WHERE sessionId = ${input.sessionId}
    `);
    return { ok: false, error: "Google Ads not configured" };
  }

  const label = OFFLINE_LABEL_BY_KIND[input.conversionKind];
  const version = process.env.GOOGLE_ADS_API_VERSION || "v21";
  const url = `https://googleads.googleapis.com/${version}/customers/${env.customerId}:uploadClickConversions`;

  const at = input.conversionAtIso || new Date().toISOString();
  // Google Ads expects: "YYYY-MM-DD HH:MM:SS+00:00" — convert from ISO.
  const conversionDateTime = at.replace("T", " ").replace(/\.\d+Z$/, "+00:00").replace("Z", "+00:00");

  const body = {
    conversions: [
      {
        gclid: input.gclid,
        conversionAction: `customers/${env.customerId}/conversionActions/${label}`,
        conversionDateTime,
        conversionValue: input.valueIdr,
        currencyCode: "IDR",
        orderId: input.sessionId,
      },
    ],
    partialFailure: true,
    validateOnly: false,
  };

  try {
    const token = await getGadsAccessToken(env);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "developer-token": env.devToken,
        "login-customer-id": env.loginCustomerId,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();

    // Google returns 200 for partial failures too — check the results.
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }

    if (!res.ok) {
      await db.execute(sql`
        UPDATE wa_sessions SET
          offlineUploadStatus = 'failed',
          offlineUploadError = ${text.slice(0, 500)}
        WHERE sessionId = ${input.sessionId}
      `);
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    // Check partial-failure results.
    if (json?.partialFailureError) {
      const err = JSON.stringify(json.partialFailureError).slice(0, 500);
      await db.execute(sql`
        UPDATE wa_sessions SET
          offlineUploadStatus = 'partial_failure',
          offlineUploadError = ${err}
        WHERE sessionId = ${input.sessionId}
      `);
      return { ok: false, error: err };
    }

    await db.execute(sql`
      UPDATE wa_sessions SET
        offlineUploadedAt = NOW(),
        offlineUploadStatus = 'success',
        offlineUploadError = NULL
      WHERE sessionId = ${input.sessionId}
    `);
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 500);
    await db.execute(sql`
      UPDATE wa_sessions SET
        offlineUploadStatus = 'error',
        offlineUploadError = ${msg}
      WHERE sessionId = ${input.sessionId}
    `);
    return { ok: false, error: msg };
  }
}
