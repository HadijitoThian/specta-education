/**
 * AI Ads Agent — Google Ads + Meta Ads autonomous manager
 * Analyzes campaign performance, scores with AI, auto-pauses/scales, emails Hadi on every action
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  adsCampaigns, adsAdsets, adsPerformanceSnapshots,
  adsAgentActions, adsAgentConfig, adsGeneratedCopy,
  AdsAgentConfig,
} from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import nodemailer from "nodemailer";

// ─── Email Helper ─────────────────────────────────────────────────────────────

async function sendAdsAgentEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"SpecTa AI Ads Agent" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to, subject, html: htmlBody,
    });
    return true;
  } catch (err) {
    console.error("[AdsAgent] Email failed:", err);
    return false;
  }
}

function buildActionEmailHtml(
  actions: Array<{ platform: string; entityName: string; action: string; reason: string; previousValue?: string | null; newValue?: string | null; status: string }>,
  runSummary: string
): string {
  const actionRows = actions.map(a => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
        <span style="background:${a.platform === 'google' ? '#4285F4' : '#1877F2'};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${a.platform.toUpperCase()}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:500;">${a.entityName || a.action}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
        <span style="background:${a.action === 'pause' ? '#FEE2E2' : a.action === 'scale_budget' ? '#DCFCE7' : '#FEF9C3'};color:${a.action === 'pause' ? '#991B1B' : a.action === 'scale_budget' ? '#166534' : '#854D0E'};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${a.action.replace(/_/g, ' ').toUpperCase()}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6B7280;">${a.reason}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;">${a.previousValue ? `<span style="color:#EF4444;">${a.previousValue}</span> → ` : ''}${a.newValue ? `<span style="color:#10B981;">${a.newValue}</span>` : '—'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;background:#F9FAFB;margin:0;padding:20px;">
    <div style="max-width:700px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#E63946,#C1121F);padding:24px 32px;">
        <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">🤖 SpecTa AI Ads Agent Report</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
      </div>
      <div style="padding:24px 32px;">
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#166534;">${runSummary}</p>
        </div>
        ${actions.length > 0 ? `
        <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 16px;">Actions Taken (${actions.length})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#F9FAFB;">
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6B7280;font-size:11px;text-transform:uppercase;">Platform</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6B7280;font-size:11px;text-transform:uppercase;">Campaign</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6B7280;font-size:11px;text-transform:uppercase;">Action</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6B7280;font-size:11px;text-transform:uppercase;">AI Reason</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6B7280;font-size:11px;text-transform:uppercase;">Change</th>
          </tr></thead>
          <tbody>${actionRows}</tbody>
        </table>` : '<p style="color:#6B7280;font-size:14px;">No actions taken — all campaigns within acceptable thresholds.</p>'}
      </div>
      <div style="background:#F9FAFB;padding:16px 32px;border-top:1px solid #F0F0F0;">
        <p style="margin:0;font-size:12px;color:#9CA3AF;">Automated report from SpecTa AI Ads Agent. Log in to admin dashboard to review or override actions.</p>
      </div>
    </div></body></html>`;
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────

export async function getAdsAgentConfig(): Promise<AdsAgentConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(adsAgentConfig).limit(1);
  if (rows.length === 0) {
    await db.insert(adsAgentConfig).values({
      autoMode: 1, runIntervalHours: 6,
      redCplThreshold: "500000", yellowCplThreshold: "250000",
      redCtrThreshold: "0.5", minSpendForAction: "100000",
      scaleBudgetMultiplier: "1.3", maxDailyBudgetCapIdr: "5000000",
      notificationEmail: "hadi@spectaeducation.com", isEnabled: 1,
    });
    const seeded = await db.select().from(adsAgentConfig).limit(1);
    return seeded[0];
  }
  return rows[0];
}

export async function getAllAdsCampaigns() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(adsCampaigns).orderBy(desc(adsCampaigns.createdAt));
}

export async function getRecentSnapshots(days = 7) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return db.select().from(adsPerformanceSnapshots)
    .where(gte(adsPerformanceSnapshots.createdAt, cutoff))
    .orderBy(desc(adsPerformanceSnapshots.createdAt));
}

export async function getAgentActions(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(adsAgentActions).orderBy(desc(adsAgentActions.createdAt)).limit(limit);
}

export async function getGeneratedCopy(limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(adsGeneratedCopy).orderBy(desc(adsGeneratedCopy.createdAt)).limit(limit);
}

// ─── Google Ads API Connector ─────────────────────────────────────────────────

interface CampaignMetrics {
  id: string; name: string; status: string; budget: number;
  impressions: number; clicks: number; spend: number;
  conversions: number; leads: number; ctr: number; cpc: number; cpl: number;
}

// Match googleAdsApi.ts (the primary integration) — one env var, one default,
// so a future version bump is a single-line change. v17 was hardcoded here
// originally and silently rotted; using the same env var prevents that
// from happening again.
const GOOGLE_ADS_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v22";
const GOOGLE_ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_VERSION}`;

async function fetchGoogleAdsCampaigns(customerId: string, developerToken: string, accessToken: string): Promise<CampaignMetrics[]> {
  const query = `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date DURING LAST_7_DAYS AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 50`;
  const response = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}`, "developer-token": developerToken },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Google Ads API error: ${response.status} ${await response.text()}`);
  const data = await response.json();
  return (data.results || []).map((row: any) => {
    const spendIdr = Number(row.metrics?.costMicros || 0) / 1_000_000;
    const conversions = Number(row.metrics?.conversions || 0);
    const cpcIdr = Number(row.metrics?.averageCpc || 0) / 1_000_000;
    return {
      id: row.campaign?.id || "", name: row.campaign?.name || "",
      status: row.campaign?.status || "UNKNOWN",
      budget: Number(row.campaignBudget?.amountMicros || 0) / 1_000_000,
      impressions: Number(row.metrics?.impressions || 0),
      clicks: Number(row.metrics?.clicks || 0),
      spend: spendIdr, conversions, leads: conversions,
      ctr: Number(row.metrics?.ctr || 0) * 100,
      cpc: cpcIdr, cpl: conversions > 0 ? spendIdr / conversions : 0,
    };
  });
}

async function pauseGoogleAdsCampaign(campaignId: string, customerId: string, developerToken: string, accessToken: string): Promise<void> {
  const response = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/campaigns:mutate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}`, "developer-token": developerToken },
    body: JSON.stringify({ operations: [{ update: { resourceName: `customers/${customerId}/campaigns/${campaignId}`, status: "PAUSED" }, updateMask: "status" }] }),
  });
  if (!response.ok) throw new Error(`Google Ads pause error: ${response.status} ${await response.text()}`);
}

async function updateGoogleAdsBudget(campaignId: string, newAmountMicros: number, customerId: string, developerToken: string, accessToken: string): Promise<void> {
  // First get the budget ID for this campaign
  const query = `SELECT campaign.id, campaign_budget.id FROM campaign WHERE campaign.id = '${campaignId}'`;
  const searchResp = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}`, "developer-token": developerToken },
    body: JSON.stringify({ query }),
  });
  if (!searchResp.ok) throw new Error(`Google Ads budget search error: ${searchResp.status}`);
  const searchData = await searchResp.json();
  const budgetId = searchData.results?.[0]?.campaignBudget?.id;
  if (!budgetId) throw new Error("Could not find budget ID for campaign");

  const response = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/campaignBudgets:mutate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}`, "developer-token": developerToken },
    body: JSON.stringify({ operations: [{ update: { resourceName: `customers/${customerId}/campaignBudgets/${budgetId}`, amountMicros: newAmountMicros }, updateMask: "amountMicros" }] }),
  });
  if (!response.ok) throw new Error(`Google Ads budget update error: ${response.status} ${await response.text()}`);
}

// ─── Meta Ads API Connector ───────────────────────────────────────────────────

async function fetchMetaAdsCampaigns(adAccountId: string, accessToken: string): Promise<CampaignMetrics[]> {
  const fields = "id,name,status,objective,daily_budget,insights.date_preset(last_7d){impressions,clicks,spend,actions,ctr,cpc}";
  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?fields=${fields}&access_token=${accessToken}&limit=50`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Meta Ads API error: ${response.status} ${await response.text()}`);
  const data = await response.json();
  return (data.data || []).map((c: any) => {
    const insights = c.insights?.data?.[0] || {};
    const actions: Array<{ action_type: string; value: string }> = insights.actions || [];
    const leads = Number(actions.find(a => a.action_type === "lead")?.value || 0);
    const spend = Number(insights.spend || 0);
    const clicks = Number(insights.clicks || 0);
    return {
      id: c.id, name: c.name, status: c.status, budget: Number(c.daily_budget || 0),
      impressions: Number(insights.impressions || 0), clicks, spend, conversions: leads, leads,
      ctr: Number(insights.ctr || 0), cpc: Number(insights.cpc || 0),
      cpl: leads > 0 ? spend / leads : 0,
    };
  });
}

async function pauseMetaAdsCampaign(campaignId: string, accessToken: string): Promise<void> {
  const response = await fetch(`https://graph.facebook.com/v19.0/${campaignId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "PAUSED", access_token: accessToken }),
  });
  if (!response.ok) throw new Error(`Meta pause error: ${response.status} ${await response.text()}`);
}

async function updateMetaAdsBudget(campaignId: string, newDailyBudget: number, accessToken: string): Promise<void> {
  const response = await fetch(`https://graph.facebook.com/v19.0/${campaignId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ daily_budget: Math.round(newDailyBudget), access_token: accessToken }),
  });
  if (!response.ok) throw new Error(`Meta budget update error: ${response.status} ${await response.text()}`);
}

// ─── AI Scoring Engine ────────────────────────────────────────────────────────

interface ScoredCampaign {
  externalId: string; name: string; platform: "google" | "meta";
  score: "green" | "yellow" | "red"; reasoning: string;
  metrics: { impressions: number; clicks: number; spend: number; leads: number; ctr: number; cpc: number; cpl: number };
  recommendedAction: "scale_budget" | "pause" | "generate_copy" | "alert_only" | null;
  currentBudget: number; status: string;
}

async function scoreWithAI(
  campaigns: Array<{ platform: string; name: string; externalId: string; metrics: object; currentBudget: number; status: string }>,
  config: AdsAgentConfig
): Promise<ScoredCampaign[]> {
  const prompt = `You are an expert digital advertising analyst for SpecTa Education, an Indonesian study abroad consultancy.

SCORING RULES:
- GREEN (scale_budget): CTR > 2%, CPL < IDR ${config.yellowCplThreshold}, good leads → increase budget
- YELLOW (generate_copy): CTR 0.5-2% OR CPL IDR ${config.yellowCplThreshold}-${config.redCplThreshold} → new ad copy needed
- RED (pause): CTR < ${config.redCtrThreshold}% OR CPL > IDR ${config.redCplThreshold} OR zero leads with spend > IDR ${config.minSpendForAction} → pause

CAMPAIGNS: ${JSON.stringify(campaigns, null, 2)}

Return ONLY a JSON array (no markdown, no explanation):
[{"externalId":"id","score":"green|yellow|red","reasoning":"2-3 sentences","recommendedAction":"scale_budget|pause|generate_copy|alert_only"}]`;

  const response = await invokeLLM({ messages: [
    { role: "system", content: "Return only a valid JSON array. No markdown. No explanation." },
    { role: "user", content: prompt },
  ]});

  const rawContent = response.choices?.[0]?.message?.content;
  let parsed: Array<{ externalId: string; score: string; reasoning: string; recommendedAction: string }> = [];
  try {
    const jsonStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const match = jsonStr.match(/\[[\s\S]*\]/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    console.error("[AdsAgent] AI scoring parse error:", rawContent);
  }

  return campaigns.map(c => {
    const ai = parsed.find(p => p.externalId === c.externalId) || { score: "yellow", reasoning: "Insufficient data", recommendedAction: "alert_only" };
    const m = c.metrics as any;
    return {
      externalId: c.externalId, name: c.name, platform: c.platform as "google" | "meta",
      score: ai.score as "green" | "yellow" | "red", reasoning: ai.reasoning,
      metrics: { impressions: m.impressions || 0, clicks: m.clicks || 0, spend: m.spend || 0, leads: m.leads || 0, ctr: m.ctr || 0, cpc: m.cpc || 0, cpl: m.cpl || 0 },
      recommendedAction: ai.recommendedAction as any,
      currentBudget: c.currentBudget, status: c.status,
    };
  });
}

// ─── AI Copy Generator ────────────────────────────────────────────────────────

async function generateReplacementCopy(campaign: ScoredCampaign) {
  const prompt = `You are a top ad copywriter for SpecTa Education (Indonesian study abroad consultancy).

UNDERPERFORMING CAMPAIGN: "${campaign.name}" on ${campaign.platform}
Performance: CTR ${campaign.metrics.ctr.toFixed(2)}%, CPL IDR ${Math.round(campaign.metrics.cpl).toLocaleString()}, Leads: ${campaign.metrics.leads}
Diagnosis: ${campaign.reasoning}

Write high-converting replacement copy for Indonesian students 17-28 interested in studying abroad.
Brand voice: Inspiring, aspirational, urgent. Mix Bahasa Indonesia + English.

Return ONLY this JSON (no markdown):
{"headline1":"max 30 chars","headline2":"max 30 chars","headline3":"max 30 chars","description1":"max 90 chars","description2":"max 90 chars","primaryText":"2-3 sentences for Meta feed","callToAction":"LEARN_MORE|APPLY_NOW|GET_QUOTE|CONTACT_US","targetAudience":"ideal audience segment","reasoning":"why this will perform better"}`;

  const response = await invokeLLM({ messages: [
    { role: "system", content: "Return only valid JSON. No markdown." },
    { role: "user", content: prompt },
  ]});
  const rawContent = response.choices?.[0]?.message?.content;
  try {
    const jsonStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { console.error("[AdsAgent] Copy gen parse error"); }
  return {
    headline1: "Kuliah di Luar Negeri", headline2: "Konsultasi Gratis", headline3: "SpecTa Education",
    description1: "Raih impianmu kuliah di universitas terbaik dunia",
    description2: "Konsultasi gratis dengan counselor berpengalaman",
    primaryText: "Wujudkan impian kuliah di luar negeri bersama SpecTa Education. Konsultasi GRATIS sekarang!",
    callToAction: "LEARN_MORE", targetAudience: "Indonesian students 17-28 interested in studying abroad",
    reasoning: "Fallback copy — AI generation failed",
  };
}

// ─── Main Agent Runner ────────────────────────────────────────────────────────

export async function runAdsAgent(): Promise<{ success: boolean; actionsCount: number; summary: string; errors: string[] }> {
  const errors: string[] = [];
  const executedActions: Array<{ platform: string; entityName: string; action: string; reason: string; previousValue?: string | null; newValue?: string | null; status: string }> = [];

  const config = await getAdsAgentConfig();
  if (!config.isEnabled) return { success: true, actionsCount: 0, summary: "Agent is disabled.", errors: [] };

  const googleCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const googleDevToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const googleAccessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;
  const metaAdAccountId = process.env.META_ADS_ACCOUNT_ID;
  const metaAccessToken = process.env.META_ADS_ACCESS_TOKEN;
  const hasGoogle = !!(googleCustomerId && googleDevToken && googleAccessToken);
  const hasMeta = !!(metaAdAccountId && metaAccessToken);

  if (!hasGoogle && !hasMeta) {
    const msg = "No API credentials configured. Add GOOGLE_ADS_* and/or META_ADS_* environment variables.";
    const db = await getDb();
  if (!db) throw new Error("Database not available");
    await db.update(adsAgentConfig).set({ lastRunAt: new Date(), nextRunAt: new Date(Date.now() + config.runIntervalHours * 3600000) }).where(eq(adsAgentConfig.id, config.id));
    return { success: false, actionsCount: 0, summary: msg, errors: [msg] };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const campaignsToScore: Array<{ platform: string; name: string; externalId: string; metrics: object; currentBudget: number; status: string }> = [];
  const today = new Date().toISOString().split("T")[0];

  // ── Google Ads ──────────────────────────────────────────────────────────────
  if (hasGoogle) {
    try {
      const gCampaigns = await fetchGoogleAdsCampaigns(googleCustomerId!, googleDevToken!, googleAccessToken!);
      for (const c of gCampaigns) {
        const existing = await db.select().from(adsCampaigns).where(and(eq(adsCampaigns.externalId, c.id), eq(adsCampaigns.platform, "google"))).limit(1);
        const dbStatus = c.status === "ENABLED" ? "active" : c.status === "PAUSED" ? "paused" : "unknown" as any;
        if (existing.length === 0) {
          await db.insert(adsCampaigns).values({ platform: "google", externalId: c.id, name: c.name, status: dbStatus, dailyBudgetMicros: String(c.budget * 1_000_000), currency: "IDR", lastSyncedAt: new Date() });
        } else {
          await db.update(adsCampaigns).set({ name: c.name, status: dbStatus, dailyBudgetMicros: String(c.budget * 1_000_000), lastSyncedAt: new Date() }).where(eq(adsCampaigns.id, existing[0].id));
        }
        await db.insert(adsPerformanceSnapshots).values({ platform: "google", entityType: "campaign", externalId: c.id, snapshotDate: today, impressions: c.impressions, clicks: c.clicks, spend: String(Math.round(c.spend)), conversions: c.conversions, leads: c.leads, ctr: String(c.ctr.toFixed(4)), cpc: String(Math.round(c.cpc)), cpl: c.leads > 0 ? String(Math.round(c.spend / c.leads)) : "0" });
        if (c.status === "ENABLED") {
          campaignsToScore.push({ platform: "google", name: c.name, externalId: c.id, metrics: { impressions: c.impressions, clicks: c.clicks, spend: c.spend, leads: c.leads, ctr: c.ctr, cpc: c.cpc, cpl: c.cpl }, currentBudget: c.budget, status: "active" });
        }
      }
    } catch (err: any) { errors.push(`Google Ads: ${err.message}`); }
  }

  // ── Meta Ads ────────────────────────────────────────────────────────────────
  if (hasMeta) {
    try {
      const mCampaigns = await fetchMetaAdsCampaigns(metaAdAccountId!, metaAccessToken!);
      for (const c of mCampaigns) {
        const existing = await db.select().from(adsCampaigns).where(and(eq(adsCampaigns.externalId, c.id), eq(adsCampaigns.platform, "meta"))).limit(1);
        const dbStatus = c.status === "ACTIVE" ? "active" : c.status === "PAUSED" ? "paused" : "unknown" as any;
        if (existing.length === 0) {
          await db.insert(adsCampaigns).values({ platform: "meta", externalId: c.id, name: c.name, status: dbStatus, dailyBudgetMicros: String(c.budget), currency: "IDR", lastSyncedAt: new Date() });
        } else {
          await db.update(adsCampaigns).set({ name: c.name, status: dbStatus, dailyBudgetMicros: String(c.budget), lastSyncedAt: new Date() }).where(eq(adsCampaigns.id, existing[0].id));
        }
        await db.insert(adsPerformanceSnapshots).values({ platform: "meta", entityType: "campaign", externalId: c.id, snapshotDate: today, impressions: c.impressions, clicks: c.clicks, spend: String(Math.round(c.spend)), leads: c.leads, ctr: String(c.ctr.toFixed(4)), cpc: String(Math.round(c.cpc)), cpl: String(Math.round(c.cpl)) });
        if (c.status === "ACTIVE") {
          campaignsToScore.push({ platform: "meta", name: c.name, externalId: c.id, metrics: { impressions: c.impressions, clicks: c.clicks, spend: c.spend, leads: c.leads, ctr: c.ctr, cpc: c.cpc, cpl: c.cpl }, currentBudget: c.budget, status: "active" });
        }
      }
    } catch (err: any) { errors.push(`Meta Ads: ${err.message}`); }
  }

  if (campaignsToScore.length === 0) {
    await db.update(adsAgentConfig).set({ lastRunAt: new Date() }).where(eq(adsAgentConfig.id, config.id));
    return { success: true, actionsCount: 0, summary: "No active campaigns found.", errors };
  }

  // ── AI Scoring ──────────────────────────────────────────────────────────────
  let scoredCampaigns: ScoredCampaign[] = [];
  try {
    scoredCampaigns = await scoreWithAI(campaignsToScore, config);
    for (const sc of scoredCampaigns) {
      await db.update(adsPerformanceSnapshots).set({ aiScore: sc.score, aiReasoning: sc.reasoning }).where(and(eq(adsPerformanceSnapshots.externalId, sc.externalId), eq(adsPerformanceSnapshots.snapshotDate, today)));
    }
  } catch (err: any) { errors.push(`AI scoring: ${err.message}`); }

  // ── Auto-Actions ────────────────────────────────────────────────────────────
  if (config.autoMode) {
    for (const sc of scoredCampaigns) {
      if (!sc.recommendedAction || sc.recommendedAction === "alert_only") continue;
      if (sc.metrics.spend < Number(config.minSpendForAction)) continue;

      let actionStatus: "executed" | "failed" | "skipped" = "skipped";
      let errorMsg: string | undefined;
      let previousValue: string | undefined;
      let newValue: string | undefined;

      try {
        if (sc.recommendedAction === "pause") {
          previousValue = "ACTIVE"; newValue = "PAUSED";
          if (sc.platform === "google" && hasGoogle) {
            await pauseGoogleAdsCampaign(sc.externalId, googleCustomerId!, googleDevToken!, googleAccessToken!);
            await db.update(adsCampaigns).set({ status: "paused" }).where(and(eq(adsCampaigns.externalId, sc.externalId), eq(adsCampaigns.platform, "google")));
          } else if (sc.platform === "meta" && hasMeta) {
            await pauseMetaAdsCampaign(sc.externalId, metaAccessToken!);
            await db.update(adsCampaigns).set({ status: "paused" }).where(and(eq(adsCampaigns.externalId, sc.externalId), eq(adsCampaigns.platform, "meta")));
          }
          actionStatus = "executed";
        } else if (sc.recommendedAction === "scale_budget") {
          const multiplier = Number(config.scaleBudgetMultiplier);
          const maxBudget = Number(config.maxDailyBudgetCapIdr);
          const newBudget = Math.min(sc.currentBudget * multiplier, maxBudget);
          previousValue = `IDR ${Math.round(sc.currentBudget).toLocaleString()}`;
          newValue = `IDR ${Math.round(newBudget).toLocaleString()}`;
          if (sc.platform === "google" && hasGoogle) {
            await updateGoogleAdsBudget(sc.externalId, newBudget * 1_000_000, googleCustomerId!, googleDevToken!, googleAccessToken!);
            await db.update(adsCampaigns).set({ dailyBudgetMicros: String(newBudget * 1_000_000) }).where(and(eq(adsCampaigns.externalId, sc.externalId), eq(adsCampaigns.platform, "google")));
          } else if (sc.platform === "meta" && hasMeta) {
            await updateMetaAdsBudget(sc.externalId, newBudget, metaAccessToken!);
            await db.update(adsCampaigns).set({ dailyBudgetMicros: String(newBudget) }).where(and(eq(adsCampaigns.externalId, sc.externalId), eq(adsCampaigns.platform, "meta")));
          }
          actionStatus = "executed";
        } else if (sc.recommendedAction === "generate_copy") {
          const copy = await generateReplacementCopy(sc);
          await db.insert(adsGeneratedCopy).values({ platform: sc.platform, externalId: sc.externalId, entityName: sc.name, headline1: copy.headline1, headline2: copy.headline2, headline3: copy.headline3, description1: copy.description1, description2: copy.description2, primaryText: copy.primaryText, callToAction: copy.callToAction, targetAudience: copy.targetAudience, aiReasoning: copy.reasoning });
          newValue = "New copy generated";
          actionStatus = "executed";
        }
      } catch (err: any) {
        actionStatus = "failed";
        errorMsg = err.message;
        errors.push(`Action failed for ${sc.name}: ${err.message}`);
      }

      await db.insert(adsAgentActions).values({ platform: sc.platform, entityType: "campaign", externalId: sc.externalId, entityName: sc.name, action: sc.recommendedAction, reason: sc.reasoning, previousValue, newValue, status: actionStatus, errorMessage: errorMsg, executedAt: actionStatus === "executed" ? new Date() : undefined });

      if (actionStatus === "executed") {
        executedActions.push({ platform: sc.platform, entityName: sc.name, action: sc.recommendedAction, reason: sc.reasoning, previousValue, newValue, status: actionStatus });
      }
    }
  }

  // ── Update timestamps ───────────────────────────────────────────────────────
  await db.update(adsAgentConfig).set({ lastRunAt: new Date(), nextRunAt: new Date(Date.now() + config.runIntervalHours * 3600000) }).where(eq(adsAgentConfig.id, config.id));

  // ── Email notification ──────────────────────────────────────────────────────
  const summary = `Agent ran at ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB. Analyzed ${scoredCampaigns.length} campaigns. Executed ${executedActions.length} action(s). ${errors.length > 0 ? `⚠️ ${errors.length} error(s).` : '✅ No errors.'}`;
  if (config.notificationEmail) {
    const emailSent = await sendAdsAgentEmail(config.notificationEmail, `🤖 SpecTa AI Ads Agent — ${executedActions.length} action(s) taken`, buildActionEmailHtml(executedActions, summary));
    if (emailSent && executedActions.length > 0) {
      await db.update(adsAgentActions).set({ emailSent: 1 }).where(eq(adsAgentActions.emailSent, 0));
    }
  }

  return { success: true, actionsCount: executedActions.length, summary, errors };
}

// ─── tRPC Router ──────────────────────────────────────────────────────────────

export const adsAgentRouter = router({
  getOverview: protectedProcedure.query(async () => {
    const [campaigns, snapshots, config, actions, generatedCopies] = await Promise.all([
      getAllAdsCampaigns(), getRecentSnapshots(7), getAdsAgentConfig(), getAgentActions(100), getGeneratedCopy(20),
    ]);
    return { campaigns, snapshots, config, actions, generatedCopies };
  }),

  getActions: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
  if (!db) throw new Error("Database not available");
      return db.select().from(adsAgentActions).orderBy(desc(adsAgentActions.createdAt)).limit(input.limit);
    }),

  runAgent: protectedProcedure.mutation(async () => {
    return runAdsAgent();
  }),

  updateConfig: protectedProcedure
    .input(z.object({
      autoMode: z.number().optional(),
      runIntervalHours: z.number().optional(),
      redCplThreshold: z.string().optional(),
      yellowCplThreshold: z.string().optional(),
      redCtrThreshold: z.string().optional(),
      minSpendForAction: z.string().optional(),
      scaleBudgetMultiplier: z.string().optional(),
      maxDailyBudgetCapIdr: z.string().optional(),
      notificationEmail: z.string().optional(),
      isEnabled: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
  if (!db) throw new Error("Database not available");
      const config = await getAdsAgentConfig();
      await db.update(adsAgentConfig).set({ ...input, updatedAt: new Date() }).where(eq(adsAgentConfig.id, config.id));
      return { success: true };
    }),

  manualOverride: protectedProcedure
    .input(z.object({
      platform: z.enum(["google", "meta"]),
      externalId: z.string(),
      entityName: z.string(),
      action: z.enum(["pause", "resume", "scale_budget"]),
      reason: z.string().default("Manual override by admin"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
  if (!db) throw new Error("Database not available");
      const config = await getAdsAgentConfig();
      const googleCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
      const googleDevToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      const googleAccessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;
      const metaAccessToken = process.env.META_ADS_ACCESS_TOKEN;

      let status: "executed" | "failed" = "executed";
      let errorMsg: string | undefined;
      let previousValue: string | undefined;
      let newValue: string | undefined;

      try {
        if (input.action === "pause") {
          previousValue = "ACTIVE"; newValue = "PAUSED";
          if (input.platform === "google" && googleCustomerId && googleDevToken && googleAccessToken) {
            await pauseGoogleAdsCampaign(input.externalId, googleCustomerId, googleDevToken, googleAccessToken);
          } else if (input.platform === "meta" && metaAccessToken) {
            await pauseMetaAdsCampaign(input.externalId, metaAccessToken);
          }
          await db.update(adsCampaigns).set({ status: "paused" }).where(and(eq(adsCampaigns.externalId, input.externalId), eq(adsCampaigns.platform, input.platform)));
        } else if (input.action === "scale_budget") {
          const campaigns = await db.select().from(adsCampaigns).where(and(eq(adsCampaigns.externalId, input.externalId), eq(adsCampaigns.platform, input.platform))).limit(1);
          if (campaigns.length > 0) {
            const currentBudget = Number(campaigns[0].dailyBudgetMicros || 0);
            const budgetIdr = input.platform === "google" ? currentBudget / 1_000_000 : currentBudget;
            const newBudget = Math.min(budgetIdr * Number(config.scaleBudgetMultiplier), Number(config.maxDailyBudgetCapIdr));
            previousValue = `IDR ${Math.round(budgetIdr).toLocaleString()}`;
            newValue = `IDR ${Math.round(newBudget).toLocaleString()}`;
            if (input.platform === "google" && googleCustomerId && googleDevToken && googleAccessToken) {
              await updateGoogleAdsBudget(input.externalId, newBudget * 1_000_000, googleCustomerId, googleDevToken, googleAccessToken);
            } else if (input.platform === "meta" && metaAccessToken) {
              await updateMetaAdsBudget(input.externalId, newBudget, metaAccessToken);
            }
          }
        }
      } catch (err: any) { status = "failed"; errorMsg = err.message; }

      await db.insert(adsAgentActions).values({ platform: input.platform, entityType: "campaign", externalId: input.externalId, entityName: input.entityName, action: input.action, reason: input.reason, previousValue, newValue, status, errorMessage: errorMsg, executedAt: status === "executed" ? new Date() : undefined, emailSent: 0 });

      if (config.notificationEmail) {
        await sendAdsAgentEmail(config.notificationEmail, `🔧 SpecTa Ads — Manual Override: ${input.action} on ${input.entityName}`, buildActionEmailHtml([{ platform: input.platform, entityName: input.entityName, action: input.action, reason: input.reason, previousValue, newValue, status }], `Manual override by admin at ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`));
      }

      if (status === "failed") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: errorMsg || "Action failed" });
      return { success: true, previousValue, newValue };
    }),

  getGeneratedCopy: protectedProcedure.query(async () => getGeneratedCopy(30)),

  markCopyApplied: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
  if (!db) throw new Error("Database not available");
      await db.update(adsGeneratedCopy).set({ isApplied: 1 }).where(eq(adsGeneratedCopy.id, input.id));
      return { success: true };
    }),

  syncCampaigns: protectedProcedure.mutation(async () => runAdsAgent()),
});
