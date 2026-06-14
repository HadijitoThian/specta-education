/**
 * AI Google Ads Co-pilot (Growth Phase B).
 *
 * Generates a complete, review-ready Google Search campaign from a short brief:
 * ad groups (keyword themes), keywords with match types, negative keywords,
 * Responsive Search Ad copy (headlines/descriptions within Google's character
 * limits), sitelink + callout extensions, a suggested daily budget, and matched
 * landing-page copy.
 *
 * Every ad group's final URL is UTM-tagged (utm_source=google&utm_medium=cpc&
 * utm_campaign=<campaign>) so the resulting leads flow straight into the Phase A
 * conversion dashboard — you can measure cost-per-enrollment per campaign.
 *
 * This is a *drafting* tool: output is exported as a Google Ads Editor CSV and
 * pasted in. Live API automation is a later phase.
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { brandKit } from "../drizzle/schema";

const BASE_URL = "https://www.spectaeducation.com";

export interface CampaignBrief {
  product: string;          // "IELTS preparation", "100% scholarships", ...
  goal?: string;            // "book free consultations"
  landingPath?: string;     // "/ielts"
  dailyBudget?: number;     // in IDR
  language?: string;
}

export interface GeneratedCampaign {
  campaignName: string;
  finalUrlBase: string;     // landing page with UTM tags
  dailyBudgetSuggested: number;
  adGroups: Array<{
    name: string;
    keywords: Array<{ text: string; matchType: "broad" | "phrase" | "exact" }>;
  }>;
  negativeKeywords: string[];
  responsiveSearchAd: {
    headlines: string[];      // ≤30 chars each, up to 15
    descriptions: string[];   // ≤90 chars each, up to 4
    path1?: string;
    path2?: string;
  };
  sitelinks: Array<{ text: string; url: string; description?: string }>;
  callouts: string[];
  landingCopy: {
    heroHeadline: string;
    subheadline: string;
    bullets: string[];
    cta: string;
  };
}

function slugCampaign(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "campaign";
}

async function readBrandKit() {
  try {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db.select().from(brandKit).limit(1);
    return row || null;
  } catch {
    return null;
  }
}


const clip = (s: any, n: number) => (typeof s === "string" ? s : String(s ?? "")).trim().slice(0, n);
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

/** Coerce whatever the model returned into a safe GeneratedCampaign shape. */
function normalizeCampaign(p: any, fallbackName: string): Omit<GeneratedCampaign, "finalUrlBase"> {
  p = p && typeof p === "object" ? p : {};
  const rsaRaw = p.responsiveSearchAd || p.rsa || p.ad || {};

  const adGroups = arr(p.adGroups || p.ad_groups).map((g: any) => ({
    name: clip(g?.name || g?.adGroup || "Ad group", 120),
    keywords: arr(g?.keywords).map((k: any) => {
      const text = typeof k === "string" ? k : (k?.text || k?.keyword || "");
      let mt = String((typeof k === "object" && (k?.matchType || k?.match)) || "phrase").toLowerCase();
      if (!["broad", "phrase", "exact"].includes(mt)) mt = "phrase";
      return { text: clip(text, 80), matchType: mt as "broad" | "phrase" | "exact" };
    }).filter(k => k.text),
  })).filter(g => g.keywords.length);

  const headlines = Array.from(new Set(arr(rsaRaw.headlines || rsaRaw.headline).map((h: any) => clip(h, 30)).filter(Boolean))).slice(0, 15);
  const descriptions = Array.from(new Set(arr(rsaRaw.descriptions || rsaRaw.description).map((d: any) => clip(d, 90)).filter(Boolean))).slice(0, 4);

  return {
    campaignName: clip(p.campaignName || p.name || fallbackName, 180) || fallbackName,
    dailyBudgetSuggested: Number(p.dailyBudgetSuggested || p.dailyBudget || p.budget || 0) || 0,
    adGroups,
    negativeKeywords: arr(p.negativeKeywords || p.negatives).map((n: any) => clip(typeof n === "string" ? n : n?.text, 80)).filter(Boolean),
    responsiveSearchAd: {
      headlines,
      descriptions,
      path1: clip(rsaRaw.path1 || "", 15).replace(/\s+/g, ""),
      path2: clip(rsaRaw.path2 || "", 15).replace(/\s+/g, ""),
    },
    sitelinks: arr(p.sitelinks).map((s: any) => ({
      text: clip(s?.text || s?.title, 25),
      url: clip(s?.url || s?.link || "/", 200),
      description: clip(s?.description || "", 120),
    })).filter(s => s.text),
    callouts: arr(p.callouts).map((c: any) => clip(typeof c === "string" ? c : c?.text, 25)).filter(Boolean),
    landingCopy: {
      heroHeadline: clip(p.landingCopy?.heroHeadline || p.landingCopy?.headline || "", 120),
      subheadline: clip(p.landingCopy?.subheadline || p.landingCopy?.subtitle || "", 300),
      bullets: arr(p.landingCopy?.bullets).map((b: any) => clip(typeof b === "string" ? b : b?.text, 160)).filter(Boolean),
      cta: clip(p.landingCopy?.cta || "Book a free consultation", 60),
    },
  };
}

/** Generate a full campaign for a brief. Does NOT save — caller persists. */
export async function generateCampaign(brief: CampaignBrief): Promise<GeneratedCampaign> {
  const kit = await readBrandKit();
  const lang = brief.language || "bilingual (Indonesian primary, English secondary)";
  const landingPath = brief.landingPath || "/contact";

  const brandContext = kit
    ? `Brand: ${kit.brandName || "SpecTa Education"}. Tone: ${kit.toneOfVoice || "professional, warm, trustworthy"}. Audience: ${kit.targetAudience || "Indonesian students 18-24 and their parents"}. Key offers: ${kit.keyOffers || "study abroad counseling, IELTS prep, scholarships"}. Do: ${kit.doList || ""}. Don't: ${kit.dontList || ""}.`
    : "Brand: SpecTa Education — Indonesia's trusted study-abroad consultant since 2005 (1000+ students, 200+ scholarships, 4.9★).";

  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a senior Google Ads strategist for SpecTa Education. Produce a high-converting Google Search campaign that wins enrolled students, not just clicks.

${brandContext}

HARD RULES (Google Ads limits — never exceed):
- Headlines: provide 12-15, each MAX 30 characters. Vary them: include the keyword, a benefit, social proof (since 2005 / 1000+ students), and a CTA. At least one must contain a clear CTA.
- Descriptions: provide 4, each MAX 90 characters.
- path1/path2: MAX 15 characters each, no spaces.
- 3-5 ad groups, each a tight keyword theme (single intent). 8-15 keywords per ad group, mixing phrase and exact match; avoid pure broad unless useful.
- 15-25 negative keywords to block junk traffic (free, jobs, gratis, lowongan, etc. where relevant).
- 4 sitelinks (url is a relative path like /ielts), 6-8 callouts.
- Landing-page copy must MESSAGE-MATCH the ads (same promise) to maximise Quality Score + conversion.
- Language: ${lang}. Truthful only — no fake guarantees/numbers.
Output valid JSON only.`,
      },
      {
        role: "user",
        content: `Create a Google Search campaign.
Product / service to advertise: "${brief.product}"
Primary goal: ${brief.goal || "get free-consultation leads (WhatsApp / form)"}
Landing page path: ${landingPath}
${brief.dailyBudget ? `Daily budget hint: Rp ${brief.dailyBudget}` : "Suggest a sensible daily budget in IDR for the Indonesian market."}

Return ONLY a JSON object with EXACTLY this shape (no markdown, no commentary):
{
  "campaignName": "string",
  "dailyBudgetSuggested": 100000,
  "adGroups": [{ "name": "string", "keywords": [{ "text": "string", "matchType": "phrase" }] }],
  "negativeKeywords": ["string"],
  "responsiveSearchAd": { "headlines": ["string (<=30 chars)"], "descriptions": ["string (<=90 chars)"], "path1": "string", "path2": "string" },
  "sitelinks": [{ "text": "string", "url": "/path", "description": "string" }],
  "callouts": ["string"],
  "landingCopy": { "heroHeadline": "string", "subheadline": "string", "bullets": ["string"], "cta": "string" }
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = res.choices?.[0]?.message?.content as string | undefined;
  if (!text) throw new Error("Campaign generation returned no content");

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Some models wrap JSON in prose or code fences — extract the object.
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI did not return valid JSON — please try again.");
    parsed = JSON.parse(m[0]);
  }
  // Some models nest the result under a wrapper key.
  if (parsed && !parsed.responsiveSearchAd && !parsed.adGroups) {
    const inner = parsed.campaign || parsed.data || parsed.result;
    if (inner && typeof inner === "object") parsed = inner;
  }

  const gen = normalizeCampaign(parsed, brief.product);
  if (!gen.responsiveSearchAd.headlines.length || !gen.adGroups.length) {
    throw new Error("AI returned an incomplete campaign — please try again.");
  }

  const campaignSlug = slugCampaign(gen.campaignName || brief.product);
  const finalUrlBase = `${BASE_URL}${landingPath}?utm_source=google&utm_medium=cpc&utm_campaign=${campaignSlug}`;

  return { ...gen, finalUrlBase };
}

/**
 * Build a Google Ads Editor-compatible CSV. Google Ads Editor accepts a CSV
 * with a "Row Type"-style layout; we emit the widely-supported keyword + RSA
 * import format (one section). It imports keywords and the RSA per ad group.
 */
export function campaignToCsv(c: GeneratedCampaign, campaignName: string): string {
  const esc = (v: string | number | undefined) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = [
    "Campaign", "Ad Group", "Keyword", "Match Type", "Final URL",
    ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
    ...Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`),
    "Path 1", "Path 2",
  ];
  const lines: string[] = [headers.map(esc).join(",")];

  const h = c.responsiveSearchAd.headlines;
  const d = c.responsiveSearchAd.descriptions;
  const adCols = [
    ...Array.from({ length: 15 }, (_, i) => h[i] || ""),
    ...Array.from({ length: 4 }, (_, i) => d[i] || ""),
    c.responsiveSearchAd.path1 || "",
    c.responsiveSearchAd.path2 || "",
  ];

  for (const ag of c.adGroups) {
    // One RSA row per ad group (keyword blank), then keyword rows.
    lines.push([campaignName, ag.name, "", "", c.finalUrlBase, ...adCols].map(esc).join(","));
    for (const kw of ag.keywords) {
      const mt = kw.matchType === "exact" ? "Exact" : kw.matchType === "phrase" ? "Phrase" : "Broad";
      lines.push([campaignName, ag.name, kw.text, mt, c.finalUrlBase, ...Array(21).fill("")].map(esc).join(","));
    }
  }
  // Negatives as their own rows.
  for (const neg of c.negativeKeywords) {
    lines.push([campaignName, "", neg, "Campaign Negative", "", ...Array(21).fill("")].map(esc).join(","));
  }
  return lines.join("\n");
}
