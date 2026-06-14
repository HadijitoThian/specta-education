/**
 * Growth Intelligence (Growth Phase C).
 *
 * Three AI helpers that turn raw data into decisions:
 *  1. generatePerformanceDigest() — reads conversion + spend and writes a
 *     plain-language "what's working / do this next" digest.
 *  2. runGeoMonitor() — asks our AI model common buyer questions and records
 *     whether SpecTa is named (a directional GEO-visibility signal).
 *  3. analyzeContentGaps() — finds blog topics we're missing, ready to hand to
 *     the Article Producer.
 *
 * Weekly schedulers are OFF unless GROWTH_INSIGHTS_ENABLED=true.
 */
import { invokeLLM } from "./_core/llm";
import {
  getLeadsForAttribution,
  listMarketingSpend,
  listPublishedBlogPosts,
  createGrowthDigest,
  insertGeoSnapshots,
  getDb,
} from "./db";
import { brandKit, type GrowthDigest } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

/** Coerce an invokeLLM response's message content to a plain string. */
function llmText(res: any): string {
  const c = res?.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : "";
}
function parseJsonLoose(text: string): any {
  try { return JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch { /* */ } } return {}; }
}

const POST_CONSULT = new Set(["consultation", "ielts_prep", "shortlist", "application", "offer", "visa", "pre_departure", "enrolled"]);

function monthLabel(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function prevMonthLabel(d: Date) { const m = new Date(d.getFullYear(), d.getMonth() - 1, 1); return monthLabel(m); }

/** Aggregate leads + spend for a month into per-channel/campaign rows + totals. */
async function aggregate(month: string) {
  const [leads, spend] = await Promise.all([getLeadsForAttribution({ month }), listMarketingSpend(month)]);
  const groups = new Map<string, any>();
  const key = (c: string, cam: string) => `${c}||${cam}`;
  const g = (channel: string, campaign: string) => {
    const k = key(channel, campaign);
    let row = groups.get(k);
    if (!row) { row = { channel, campaign, leads: 0, consultations: 0, enrolled: 0, spend: 0 }; groups.set(k, row); }
    return row;
  };
  for (const l of leads) {
    const channel = l.utmSource ? l.utmSource.toLowerCase() : l.gclid ? "google" : "organic/direct";
    const campaign = (l.utmCampaign || "(none)").toLowerCase();
    const row = g(channel, campaign);
    row.leads++;
    if (POST_CONSULT.has(l.pipelineStage)) row.consultations++;
    if (l.pipelineStage === "enrolled") row.enrolled++;
  }
  for (const s of spend) {
    const row = g(s.source.toLowerCase(), (s.campaign || "(none)").toLowerCase());
    row.spend += Number(s.amount || 0);
  }
  const rows = Array.from(groups.values());
  const totals = rows.reduce((t, r) => ({ leads: t.leads + r.leads, consultations: t.consultations + r.consultations, enrolled: t.enrolled + r.enrolled, spend: t.spend + r.spend }), { leads: 0, consultations: 0, enrolled: 0, spend: 0 });
  return { rows, totals };
}

/** Build + save a performance digest comparing this month to last month. */
export async function generatePerformanceDigest(): Promise<GrowthDigest | null> {
  const now = new Date();
  const cur = monthLabel(now);
  const prev = prevMonthLabel(now);
  const [a, b] = await Promise.all([aggregate(cur), aggregate(prev)]);

  const metrics = { month: cur, prevMonth: prev, current: a, previous: b.totals };
  const fmt = (r: any[]) => r.sort((x, y) => y.spend - x.spend || y.leads - x.leads).slice(0, 12)
    .map(x => `${x.channel}/${x.campaign}: ${x.leads} leads, ${x.consultations} consult, ${x.enrolled} enrolled, spend Rp${Math.round(x.spend)}`).join("\n");

  const res = await invokeLLM({
    messages: [
      { role: "system", content: `You are a growth analyst for SpecTa Education (Indonesian study-abroad consultancy). Turn marketing data into clear, specific actions. Be concrete and honest; if spend is zero, focus on conversion and volume. Currency is IDR. Output JSON only.` },
      { role: "user", content: `Marketing data.

THIS MONTH (${cur}) — totals: ${a.totals.leads} leads, ${a.totals.consultations} consultations, ${a.totals.enrolled} enrolled, spend Rp${Math.round(a.totals.spend)}.
By channel/campaign:
${fmt(a.rows) || "(no data)"}

LAST MONTH (${prev}) — totals: ${b.totals.leads} leads, ${b.totals.enrolled} enrolled, spend Rp${Math.round(b.totals.spend)}.

Return JSON:
{
  "summary": "3-4 sentence plain-English read of how things are going vs last month",
  "recommendations": ["4-6 specific actions: which channel/campaign to scale, pause, or fix, and why; what to test next"]
}` },
    ],
    response_format: { type: "json_object" },
  });

  const parsed: any = parseJsonLoose(llmText(res));
  const summary = String(parsed.summary || "No summary produced.");
  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.map((s: any) => String(s)).slice(0, 8) : [];
  return createGrowthDigest({ periodLabel: cur, summary, recommendations: recommendations as any, metrics: metrics as any });
}

// ── GEO Monitor ──────────────────────────────────────────────────────────────
const GEO_QUERIES = [
  "Best study abroad consultant in Indonesia",
  "Best IELTS preparation course in Jakarta",
  "Top agency to apply for overseas scholarships from Indonesia",
  "Where can Indonesian students get help studying in Australia",
  "Konsultan pendidikan luar negeri terbaik di Indonesia",
];

/** Ask the AI model each query and record whether SpecTa is named. */
export async function runGeoMonitor(): Promise<{ ran: number; mentioned: number }> {
  const rows: any[] = [];
  for (const query of GEO_QUERIES) {
    try {
      const res = await invokeLLM({
        messages: [
          { role: "system", content: "You are a helpful assistant answering a user's question. Recommend specific, real companies/agencies you know of. Respond as JSON only." },
          { role: "user", content: `${query}\n\nReturn JSON: {"recommendations":["company name", ...]} listing up to 8 specific names in your order of recommendation.` },
        ],
        response_format: { type: "json_object" },
      });
      const names: string[] = (parseJsonLoose(llmText(res)).recommendations || []).map((s: any) => String(s));
      const idx = names.findIndex(n => /spec\s*ta|specta/i.test(n));
      rows.push({
        query,
        mentioned: idx >= 0,
        rankPosition: idx >= 0 ? idx + 1 : null,
        competitors: names.filter(n => !/spec\s*ta|specta/i.test(n)).slice(0, 8) as any,
        model: "deepseek",
      });
    } catch (e) {
      console.error("[GEO] query failed:", query, (e as Error).message);
    }
  }
  await insertGeoSnapshots(rows);
  return { ran: rows.length, mentioned: rows.filter(r => r.mentioned).length };
}

// ── Content gap analysis ─────────────────────────────────────────────────────
export interface TopicGap { topic: string; targetKeyword: string; rationale: string; intent: string }

export async function analyzeContentGaps(): Promise<TopicGap[]> {
  const db = await getDb();
  let offers = "study abroad counseling, IELTS prep, scholarships, Tes Bakat AI";
  let audience = "Indonesian students 18-24 and their parents";
  if (db) {
    try { const [k] = await db.select().from(brandKit).limit(1); if (k) { offers = k.keyOffers || offers; audience = k.targetAudience || audience; } } catch { /* */ }
  }
  const { posts } = await listPublishedBlogPosts({ limit: 100 });
  const existing = posts.map(p => `- ${p.title}${p.targetKeyword ? ` [${p.targetKeyword}]` : ""}`).join("\n") || "(none yet)";

  const res = await invokeLLM({
    messages: [
      { role: "system", content: "You are an SEO/GEO content strategist for SpecTa Education. Find high-value blog topics they are MISSING that Indonesian study-abroad seekers search for and that AI assistants get asked. Avoid duplicating existing posts. Output JSON only." },
      { role: "user", content: `Offers: ${offers}\nAudience: ${audience}\n\nEXISTING PUBLISHED POSTS:\n${existing}\n\nReturn JSON: {"gaps":[{"topic":"article title idea","targetKeyword":"primary keyword","rationale":"why it's worth writing (search demand / conversion)","intent":"awareness|consideration|decision"}]} with 6-10 prioritized gaps (highest opportunity first).` },
    ],
    response_format: { type: "json_object" },
  });
  const gaps: any[] = parseJsonLoose(llmText(res)).gaps || [];
  return gaps.map(g => ({
    topic: String(g.topic || ""), targetKeyword: String(g.targetKeyword || ""),
    rationale: String(g.rationale || ""), intent: String(g.intent || ""),
  })).filter(g => g.topic).slice(0, 10);
}

// ── Weekly scheduler ─────────────────────────────────────────────────────────
let started = false;
let lastWeek = "";
function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil((((t.getTime() - ys.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, "0")}`;
}

async function tick() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // WIB
  if (now.getUTCDay() !== 1 || now.getUTCHours() < 8) return; // Monday 08:00 WIB
  const wk = isoWeek(now);
  if (lastWeek === wk) return;
  lastWeek = wk;
  try {
    const [digest, geo] = await Promise.all([generatePerformanceDigest(), runGeoMonitor()]);
    if (digest) {
      const recs = (digest.recommendations as string[] | null) || [];
      await notifyOwner({
        title: `Weekly Growth Digest — ${digest.periodLabel}`,
        content: `${digest.summary}\n\nRecommended actions:\n${recs.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\nGEO visibility: SpecTa named in ${geo.mentioned}/${geo.ran} AI answers this week.`,
      });
    }
    console.log(`[GrowthInsights] weekly digest + GEO monitor done for ${wk}`);
  } catch (e) {
    console.error("[GrowthInsights] weekly tick failed:", (e as Error).message);
  }
}

export function startGrowthInsightsScheduler() {
  if (started) return;
  if (process.env.GROWTH_INSIGHTS_ENABLED !== "true") {
    console.log("[GrowthInsights] scheduler disabled (set GROWTH_INSIGHTS_ENABLED=true for weekly digest + GEO monitor).");
    return;
  }
  started = true;
  console.log("[GrowthInsights] weekly scheduler started (Mon 08:00 WIB).");
  setInterval(() => { void tick(); }, 30 * 60 * 1000);
  setTimeout(() => { void tick(); }, 90 * 1000);
}
