/**
 * Agent 12 — SEO Optimizer Agent
 * 
 * Responsibilities:
 * 1. Audit all published pages for SEO health (meta tags, OG, structured data, alt texts)
 * 2. Generate optimized meta titles/descriptions using AI
 * 3. Suggest internal linking opportunities between blog articles
 * 4. Calculate overall SEO score and track over time
 * 5. Auto-update sitemap.xml with all published pages
 * 6. Send weekly SEO health report to admin
 */

import { invokeLLM } from "./_core/llm";
import { createAgentRunLog, updateAgentRunLog } from "./db";
import { sendEmail } from "./email";
import { drizzle } from "drizzle-orm/mysql2";
import {
  blogPosts,
  seoPageAudits,
  seoRecommendations,
  seoScoreHistory,
} from "../drizzle/schema";
import { sql, desc, eq, and } from "drizzle-orm";

const ADMIN_EMAIL = "hadi@spectaeducation.com";
// MUST be the www subdomain. The apex 301-redirects to www, so pointing SEO
// links at the apex means Google (and users clicking through) hit a redirect.
// Worse, Google rejects canonicals that redirect — which broke Request
// Indexing on /igcse/practice in July 2026 until we fixed this.
const BASE_URL = "https://www.spectaeducation.com";

// Static pages to audit — must match actual App.tsx routes
const STATIC_PAGES = [
  { url: "/", title: "Home" },
  { url: "/about", title: "About Us" },
  { url: "/ielts", title: "IELTS Preparation" },
  { url: "/destinations", title: "Study Destinations" },
  { url: "/scholarships", title: "Scholarships" },
  { url: "/play/aptitude", title: "AI Aptitude Test" },
  { url: "/compare", title: "Compare Destinations" },
  { url: "/simulator", title: "Study Abroad Simulator" },
  { url: "/blog", title: "Blog" },
  { url: "/contact", title: "Contact" },
  { url: "/apply", title: "Quick Apply" },
  { url: "/book", title: "Book Consultation" },
  { url: "/malaysia", title: "Study in Malaysia" },
];

interface AuditResult {
  pageUrl: string;
  pageTitle: string;
  metaTitle: string | null;
  metaTitleLength: number;
  metaTitleScore: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  metaDescriptionScore: number;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  h1Count: number;
  h2Count: number;
  imageCount: number;
  imagesWithAlt: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  hasCanonical: boolean;
  hasStructuredData: boolean;
  isIndexable: boolean;
  loadTimeMs: number;
  overallScore: number;
  issues: string[];
  recommendations: string[];
  targetKeyword: string | null;
  keywordInTitle: boolean;
  keywordInDescription: boolean;
  keywordInH1: boolean;
  keywordDensity: string;
}

/**
 * Audit a single page by fetching and analyzing its HTML
 */
async function auditPage(pageUrl: string, pageTitle: string): Promise<AuditResult> {
  const fullUrl = `${BASE_URL}${pageUrl}`;
  const startTime = Date.now();
  
  let html = "";
  let loadTimeMs = 0;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(fullUrl, { 
      signal: controller.signal,
      redirect: "follow", // Follow 301/302 redirects (e.g., www → non-www)
      headers: { "User-Agent": "SpecTa-SEO-Auditor/1.0 (compatible; Googlebot/2.1)" }
    });
    clearTimeout(timeout);
    loadTimeMs = Date.now() - startTime;
    html = await response.text();
  } catch (err) {
    console.error(`[SEO Optimizer] Failed to fetch ${fullUrl}:`, err);
    return createEmptyAudit(pageUrl, pageTitle);
  }

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Extract meta title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaTitle = titleMatch ? titleMatch[1].trim() : null;
  const metaTitleLength = metaTitle ? metaTitle.length : 0;
  let metaTitleScore = 0;
  if (metaTitle) {
    if (metaTitleLength >= 30 && metaTitleLength <= 60) metaTitleScore = 100;
    else if (metaTitleLength >= 20 && metaTitleLength <= 70) metaTitleScore = 70;
    else if (metaTitleLength > 0) metaTitleScore = 40;
    if (metaTitleLength > 60) issues.push(`Meta title too long (${metaTitleLength} chars, recommended: 30-60)`);
    if (metaTitleLength < 30 && metaTitleLength > 0) issues.push(`Meta title too short (${metaTitleLength} chars, recommended: 30-60)`);
  } else {
    issues.push("Missing meta title");
    metaTitleScore = 0;
  }

  // Extract meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) ||
                     html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i);
  const metaDescription = descMatch ? descMatch[1].trim() : null;
  const metaDescriptionLength = metaDescription ? metaDescription.length : 0;
  let metaDescriptionScore = 0;
  if (metaDescription) {
    if (metaDescriptionLength >= 120 && metaDescriptionLength <= 160) metaDescriptionScore = 100;
    else if (metaDescriptionLength >= 80 && metaDescriptionLength <= 200) metaDescriptionScore = 70;
    else if (metaDescriptionLength > 0) metaDescriptionScore = 40;
    if (metaDescriptionLength > 160) issues.push(`Meta description too long (${metaDescriptionLength} chars, recommended: 120-160)`);
    if (metaDescriptionLength < 80 && metaDescriptionLength > 0) issues.push(`Meta description too short (${metaDescriptionLength} chars, recommended: 120-160)`);
  } else {
    issues.push("Missing meta description");
    metaDescriptionScore = 0;
  }

  // Open Graph tags
  const hasOgTitle = /property=["']og:title["']/i.test(html);
  const hasOgDescription = /property=["']og:description["']/i.test(html);
  const hasOgImage = /property=["']og:image["']/i.test(html);
  if (!hasOgTitle) issues.push("Missing Open Graph title (og:title)");
  if (!hasOgDescription) issues.push("Missing Open Graph description (og:description)");
  if (!hasOgImage) issues.push("Missing Open Graph image (og:image)");

  // Heading analysis
  const h1Matches = html.match(/<h1[^>]*>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>/gi) || [];
  const h1Count = h1Matches.length;
  const h2Count = h2Matches.length;
  if (h1Count === 0) issues.push("No H1 tag found — every page should have exactly one H1");
  if (h1Count > 1) issues.push(`Multiple H1 tags found (${h1Count}) — use only one H1 per page`);

  // Image analysis
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  const imageCount = imgMatches.length;
  const imagesWithAlt = imgMatches.filter(img => /alt=["'][^"']+["']/i.test(img)).length;
  const missingAlt = imageCount - imagesWithAlt;
  if (missingAlt > 0) issues.push(`${missingAlt} image(s) missing alt text`);

  // Word count (rough estimate from visible text)
  const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

  // Links
  const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["']/gi) || [];
  let internalLinks = 0;
  let externalLinks = 0;
  for (const link of linkMatches) {
    const hrefMatch = link.match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      const href = hrefMatch[1];
      if (href.startsWith("/") || href.includes("spectaeducation.com")) {
        internalLinks++;
      } else if (href.startsWith("http")) {
        externalLinks++;
      }
    }
  }

  // Technical SEO
  const hasCanonical = /rel=["']canonical["']/i.test(html);
  const hasStructuredData = /application\/ld\+json/i.test(html);
  const isIndexable = !/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  
  if (!hasCanonical) issues.push("Missing canonical tag");
  if (!hasStructuredData) issues.push("No structured data (JSON-LD) found");

  // Load time assessment
  if (loadTimeMs > 3000) issues.push(`Slow page load (${loadTimeMs}ms — target: under 3000ms)`);

  // Calculate overall score
  const scores = {
    metaTitle: metaTitleScore,
    metaDescription: metaDescriptionScore,
    ogTags: (hasOgTitle ? 33 : 0) + (hasOgDescription ? 33 : 0) + (hasOgImage ? 34 : 0),
    headings: h1Count === 1 ? 100 : (h1Count === 0 ? 0 : 50),
    images: imageCount > 0 ? Math.round((imagesWithAlt / imageCount) * 100) : 100,
    canonical: hasCanonical ? 100 : 0,
    structuredData: hasStructuredData ? 100 : 0,
    loadTime: loadTimeMs <= 1000 ? 100 : (loadTimeMs <= 3000 ? 70 : 30),
  };
  
  const overallScore = Math.round(
    scores.metaTitle * 0.2 +
    scores.metaDescription * 0.2 +
    scores.ogTags * 0.1 +
    scores.headings * 0.15 +
    scores.images * 0.1 +
    scores.canonical * 0.1 +
    scores.structuredData * 0.1 +
    scores.loadTime * 0.05
  );

  return {
    pageUrl,
    pageTitle,
    metaTitle,
    metaTitleLength,
    metaTitleScore,
    metaDescription,
    metaDescriptionLength,
    metaDescriptionScore,
    hasOgTitle,
    hasOgDescription,
    hasOgImage,
    h1Count,
    h2Count,
    imageCount,
    imagesWithAlt,
    wordCount,
    internalLinks,
    externalLinks,
    hasCanonical,
    hasStructuredData,
    isIndexable,
    loadTimeMs,
    overallScore,
    issues,
    recommendations,
    targetKeyword: null,
    keywordInTitle: false,
    keywordInDescription: false,
    keywordInH1: false,
    keywordDensity: "0%",
  };
}

function createEmptyAudit(pageUrl: string, pageTitle: string): AuditResult {
  return {
    pageUrl, pageTitle,
    metaTitle: null, metaTitleLength: 0, metaTitleScore: 0,
    metaDescription: null, metaDescriptionLength: 0, metaDescriptionScore: 0,
    hasOgTitle: false, hasOgDescription: false, hasOgImage: false,
    h1Count: 0, h2Count: 0, imageCount: 0, imagesWithAlt: 0,
    wordCount: 0, internalLinks: 0, externalLinks: 0,
    hasCanonical: false, hasStructuredData: false, isIndexable: true,
    loadTimeMs: 0, overallScore: 0,
    issues: ["Failed to fetch page"], recommendations: [],
    targetKeyword: null, keywordInTitle: false, keywordInDescription: false,
    keywordInH1: false, keywordDensity: "0%",
  };
}

/**
 * Generate AI-powered SEO recommendations for a page
 */
async function generateSeoRecommendations(audit: AuditResult): Promise<{
  suggestedTitle: string | null;
  suggestedDescription: string | null;
  recommendations: string[];
}> {
  if (audit.issues.length === 0) {
    return { suggestedTitle: null, suggestedDescription: null, recommendations: [] };
  }

  try {
    const prompt = `You are an SEO expert for SpecTa Education (www.spectaeducation.com), an Indonesian education consultancy helping students study abroad in Australia, UK, Canada, New Zealand, and Ireland.

Analyze this page audit and provide recommendations:

Page: ${audit.pageUrl} (${audit.pageTitle})
Current Meta Title: ${audit.metaTitle || "MISSING"}
Current Meta Description: ${audit.metaDescription || "MISSING"}
Issues Found: ${audit.issues.join("; ")}
Word Count: ${audit.wordCount}
H1 Count: ${audit.h1Count}
Images: ${audit.imageCount} total, ${audit.imagesWithAlt} with alt text

Respond in JSON format:
{
  "suggestedTitle": "Optimized meta title (30-60 chars) or null if current is good",
  "suggestedDescription": "Optimized meta description (120-160 chars) or null if current is good",
  "recommendations": ["actionable recommendation 1", "recommendation 2", ...]
}

Rules:
- Include "SpecTa Education" in the title when appropriate
- Use bilingual approach (English primary, Indonesian keywords where natural)
- Focus on study abroad, IELTS, scholarships, university matching keywords
- Be specific and actionable`;

    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "seo_recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestedTitle: { type: ["string", "null"], description: "Suggested meta title" },
              suggestedDescription: { type: ["string", "null"], description: "Suggested meta description" },
              recommendations: { type: "array", items: { type: "string" }, description: "Actionable recommendations" },
            },
            required: ["suggestedTitle", "suggestedDescription", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (content && typeof content === "string") {
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`[SEO Optimizer] AI recommendation failed for ${audit.pageUrl}:`, err);
  }

  return { suggestedTitle: null, suggestedDescription: null, recommendations: [] };
}

/**
 * Generate internal linking suggestions between blog posts
 */
async function generateInternalLinkingSuggestions(db: ReturnType<typeof drizzle>): Promise<Array<{ from: string; to: string; anchorText: string }>> {
  try {
    const posts = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      targetKeyword: blogPosts.targetKeyword,
      excerpt: blogPosts.excerpt,
    }).from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.createdAt))
      .limit(20);

    if (posts.length < 2) return [];

    const postList = posts.map(p => `- "${p.title}" (slug: ${p.slug}, keyword: ${p.targetKeyword || "none"})`).join("\n");

    const response = await invokeLLM({
      messages: [{
        role: "user",
        content: `You are an SEO specialist. Suggest internal links between these blog posts for SpecTa Education:

${postList}

Suggest up to 10 internal linking opportunities. Each suggestion should connect related topics.
Respond in JSON: { "links": [{ "fromSlug": "source-slug", "toSlug": "target-slug", "anchorText": "suggested anchor text" }] }`,
      }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "internal_links",
          strict: true,
          schema: {
            type: "object",
            properties: {
              links: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    fromSlug: { type: "string" },
                    toSlug: { type: "string" },
                    anchorText: { type: "string" },
                  },
                  required: ["fromSlug", "toSlug", "anchorText"],
                  additionalProperties: false,
                },
              },
            },
            required: ["links"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (content && typeof content === "string") {
      const parsed = JSON.parse(content);
      return (parsed.links || []).map((l: any) => ({
        from: `/blog/${l.fromSlug}`,
        to: `/blog/${l.toSlug}`,
        anchorText: l.anchorText,
      }));
    }
  } catch (err) {
    console.error("[SEO Optimizer] Internal linking suggestion failed:", err);
  }
  return [];
}

/**
 * Send weekly SEO report email
 */
async function sendSeoReport(
  audits: AuditResult[],
  overallScore: number,
  criticalIssues: number,
  warnings: number,
  linkSuggestions: Array<{ from: string; to: string; anchorText: string }>,
  previousScore: number | null = null,
  scoreDrop: number = 0,
): Promise<void> {
  const topIssues = audits
    .flatMap(a => a.issues.map(issue => ({ page: a.pageUrl, issue })))
    .slice(0, 15);

  const issueRows = topIssues.map(i => 
    `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-size:14px;">${i.page}</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:14px;">${i.issue}</td></tr>`
  ).join("");

  const pageScoreRows = audits
    .sort((a, b) => a.overallScore - b.overallScore)
    .map(a => {
      const color = a.overallScore >= 80 ? "#22c55e" : a.overallScore >= 50 ? "#f59e0b" : "#ef4444";
      return `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-size:14px;">${a.pageTitle}</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:14px;">${a.pageUrl}</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:14px;color:${color};font-weight:bold;">${a.overallScore}/100</td></tr>`;
    }).join("");

  const linkRows = linkSuggestions.slice(0, 5).map(l =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-size:14px;">${l.from}</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:14px;">${l.to}</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:14px;">${l.anchorText}</td></tr>`
  ).join("");

  const scoreColor = overallScore >= 80 ? "#22c55e" : overallScore >= 50 ? "#f59e0b" : "#ef4444";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:700px;margin:0 auto;padding:24px;">
  <div style="background:linear-gradient(135deg,#1e40af,#7c3aed);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">🔍 Weekly SEO Health Report</h1>
    <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">SpecTa Education — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
  </div>
  
  <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:120px;height:120px;border-radius:50%;border:8px solid ${scoreColor};line-height:104px;font-size:36px;font-weight:bold;color:${scoreColor};">${overallScore}</div>
      <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Overall SEO Score (out of 100)</p>
    </div>
    
    <div style="display:flex;gap:16px;margin-bottom:24px;">
      <div style="flex:1;background:#fef2f2;padding:16px;border-radius:8px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:#ef4444;">${criticalIssues}</div>
        <div style="font-size:12px;color:#991b1b;">Critical Issues</div>
      </div>
      <div style="flex:1;background:#fffbeb;padding:16px;border-radius:8px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:#f59e0b;">${warnings}</div>
        <div style="font-size:12px;color:#92400e;">Warnings</div>
      </div>
      <div style="flex:1;background:#f0fdf4;padding:16px;border-radius:8px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:#22c55e;">${audits.length}</div>
        <div style="font-size:12px;color:#166534;">Pages Audited</div>
      </div>
    </div>

    <h2 style="font-size:18px;margin:24px 0 12px;color:#1f2937;">📊 Page Scores</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;font-size:13px;">Page</th><th style="padding:8px;text-align:left;font-size:13px;">URL</th><th style="padding:8px;text-align:left;font-size:13px;">Score</th></tr>
      ${pageScoreRows}
    </table>

    <h2 style="font-size:18px;margin:24px 0 12px;color:#1f2937;">⚠️ Top Issues</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;font-size:13px;">Page</th><th style="padding:8px;text-align:left;font-size:13px;">Issue</th></tr>
      ${issueRows}
    </table>

    ${linkRows ? `
    <h2 style="font-size:18px;margin:24px 0 12px;color:#1f2937;">🔗 Internal Linking Suggestions</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;font-size:13px;">From</th><th style="padding:8px;text-align:left;font-size:13px;">Link To</th><th style="padding:8px;text-align:left;font-size:13px;">Anchor Text</th></tr>
      ${linkRows}
    </table>` : ""}

    <div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:8px;text-align:center;">
      <a href="${BASE_URL}/admin/agents" style="display:inline-block;padding:12px 24px;background:#1e40af;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">View Full Report in Dashboard</a>
    </div>
  </div>
</div>
</body>
</html>`;

  const trendText = previousScore !== null
    ? (scoreDrop > 0 ? ` ⬇️ dropped from ${previousScore}` : scoreDrop < 0 ? ` ⬆️ up from ${previousScore}` : ` (stable)`)
    : "";
  const subjectEmoji = criticalIssues > 0 ? "🚨" : scoreDrop >= 5 ? "⚠️" : "🔍";
  
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `${subjectEmoji} SEO Report: Score ${overallScore}/100${trendText} — ${criticalIssues} critical issues | SpecTa Education`,
    html,
  });
}

/**
 * Main agent execution function
 */
export async function runSeoOptimizerAgent(): Promise<{
  pagesAudited: number;
  issuesFound: number;
  recommendationsGenerated: number;
  overallScore: number;
  errors: number;
}> {
  const startTime = Date.now();
  let pagesAudited = 0;
  let issuesFound = 0;
  let recommendationsGenerated = 0;
  let errors = 0;
  let overallScore = 0;

  const runLog = await createAgentRunLog({
    agentName: "seo_optimizer",
    status: "running",
    summary: "Starting SEO audit cycle...",
    startedAt: new Date(),
  });

  try {
    const db = drizzle(process.env.DATABASE_URL!);

    // Step 1: Collect all pages to audit (static + blog posts)
    const publishedPosts = await db.select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      targetKeyword: blogPosts.targetKeyword,
    }).from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.createdAt))
      .limit(30);

    const blogPages = publishedPosts.map(p => ({
      url: `/blog/${p.slug}`,
      title: p.title,
      targetKeyword: p.targetKeyword,
    }));

    const allPages = [
      ...STATIC_PAGES.map(p => ({ ...p, targetKeyword: null as string | null })),
      ...blogPages,
    ];

    console.log(`[SEO Optimizer] Auditing ${allPages.length} pages (${STATIC_PAGES.length} static + ${blogPages.length} blog)...`);

    // Step 2: Audit each page
    const allAudits: AuditResult[] = [];
    for (const page of allPages) {
      try {
        const audit = await auditPage(page.url, page.title);
        if (page.targetKeyword) {
          audit.targetKeyword = page.targetKeyword;
          const kw = page.targetKeyword.toLowerCase();
          audit.keywordInTitle = (audit.metaTitle || "").toLowerCase().includes(kw);
          audit.keywordInDescription = (audit.metaDescription || "").toLowerCase().includes(kw);
        }
        allAudits.push(audit);
        pagesAudited++;
        issuesFound += audit.issues.length;

        // Save audit to database
        await db.insert(seoPageAudits).values({
          pageUrl: audit.pageUrl,
          pageTitle: audit.pageTitle,
          metaTitle: audit.metaTitle,
          metaTitleLength: audit.metaTitleLength,
          metaTitleScore: audit.metaTitleScore,
          metaDescription: audit.metaDescription,
          metaDescriptionLength: audit.metaDescriptionLength,
          metaDescriptionScore: audit.metaDescriptionScore,
          hasOgTitle: audit.hasOgTitle,
          hasOgDescription: audit.hasOgDescription,
          hasOgImage: audit.hasOgImage,
          h1Count: audit.h1Count,
          h2Count: audit.h2Count,
          imageCount: audit.imageCount,
          imagesWithAlt: audit.imagesWithAlt,
          wordCount: audit.wordCount,
          internalLinks: audit.internalLinks,
          externalLinks: audit.externalLinks,
          hasCanonical: audit.hasCanonical,
          hasStructuredData: audit.hasStructuredData,
          isIndexable: audit.isIndexable,
          loadTimeMs: audit.loadTimeMs,
          overallScore: audit.overallScore,
          issues: JSON.stringify(audit.issues),
          recommendations: JSON.stringify(audit.recommendations),
          targetKeyword: audit.targetKeyword,
          keywordInTitle: audit.keywordInTitle,
          keywordInDescription: audit.keywordInDescription,
          keywordInH1: audit.keywordInH1,
          keywordDensity: audit.keywordDensity,
          auditedAt: new Date(),
        });

        // Small delay between fetches to be polite
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`[SEO Optimizer] Error auditing ${page.url}:`, err);
        errors++;
      }
    }

    // Step 3: Generate AI recommendations for pages with issues
    const pagesWithIssues = allAudits.filter(a => a.issues.length > 0).slice(0, 10);
    for (const audit of pagesWithIssues) {
      try {
        const aiRecs = await generateSeoRecommendations(audit);
        
        // Save recommendations
        if (aiRecs.suggestedTitle) {
          await db.insert(seoRecommendations).values({
            pageUrl: audit.pageUrl,
            type: "meta_title",
            severity: audit.metaTitleScore < 50 ? "critical" : "warning",
            title: "Optimize Meta Title",
            description: `Current: "${audit.metaTitle || 'MISSING'}" → Suggested: "${aiRecs.suggestedTitle}"`,
            currentValue: audit.metaTitle || "",
            suggestedValue: aiRecs.suggestedTitle,
            status: "open",
          });
          recommendationsGenerated++;
        }

        if (aiRecs.suggestedDescription) {
          await db.insert(seoRecommendations).values({
            pageUrl: audit.pageUrl,
            type: "meta_description",
            severity: audit.metaDescriptionScore < 50 ? "critical" : "warning",
            title: "Optimize Meta Description",
            description: `Current: "${audit.metaDescription || 'MISSING'}" → Suggested: "${aiRecs.suggestedDescription}"`,
            currentValue: audit.metaDescription || "",
            suggestedValue: aiRecs.suggestedDescription,
            status: "open",
          });
          recommendationsGenerated++;
        }

        for (const rec of aiRecs.recommendations) {
          await db.insert(seoRecommendations).values({
            pageUrl: audit.pageUrl,
            type: "keyword_optimization",
            severity: "info",
            title: rec.substring(0, 255),
            description: rec,
            status: "open",
          });
          recommendationsGenerated++;
        }

        audit.recommendations = aiRecs.recommendations;
      } catch (err) {
        console.error(`[SEO Optimizer] AI recommendation error for ${audit.pageUrl}:`, err);
        errors++;
      }
    }

    // Step 4: Generate internal linking suggestions
    const linkSuggestions = await generateInternalLinkingSuggestions(db);
    for (const link of linkSuggestions) {
      await db.insert(seoRecommendations).values({
        pageUrl: link.from,
        type: "internal_links",
        severity: "info",
        title: `Add internal link to ${link.to}`,
        description: `Link from "${link.from}" to "${link.to}" using anchor text: "${link.anchorText}"`,
        suggestedValue: `<a href="${link.to}">${link.anchorText}</a>`,
        status: "open",
      });
      recommendationsGenerated++;
    }

    // Step 5: Calculate overall site score
    overallScore = allAudits.length > 0
      ? Math.round(allAudits.reduce((sum, a) => sum + a.overallScore, 0) / allAudits.length)
      : 0;

    const criticalIssues = allAudits.flatMap(a => a.issues).filter(i => 
      i.includes("Missing meta") || i.includes("No H1") || i.includes("Missing canonical")
    ).length;
    const warnings = issuesFound - criticalIssues;

    // Save score history
    await db.insert(seoScoreHistory).values({
      overallScore,
      metaScore: Math.round(allAudits.reduce((s, a) => s + (a.metaTitleScore + a.metaDescriptionScore) / 2, 0) / Math.max(allAudits.length, 1)),
      contentScore: Math.round(allAudits.reduce((s, a) => s + (a.h1Count === 1 ? 100 : 0), 0) / Math.max(allAudits.length, 1)),
      technicalScore: Math.round(allAudits.reduce((s, a) => s + (a.hasCanonical ? 50 : 0) + (a.hasStructuredData ? 50 : 0), 0) / Math.max(allAudits.length, 1)),
      pagesAudited,
      issuesFound,
      issuesFixed: 0,
      topIssues: JSON.stringify(allAudits.flatMap(a => a.issues).slice(0, 5)),
      reportSentAt: new Date(),
    });

    // Step 6: Smart email filtering — only send if there's something worth reporting
    // Get previous score from history to compare
    const previousScores = await db.select({
      overallScore: seoScoreHistory.overallScore,
      issuesFound: seoScoreHistory.issuesFound,
    }).from(seoScoreHistory)
      .orderBy(desc(seoScoreHistory.createdAt))
      .limit(2);
    
    const previousScore = previousScores.length >= 2 ? previousScores[1].overallScore : null;
    const scoreDrop = previousScore !== null ? previousScore - overallScore : 0;
    const shouldSendEmail = 
      criticalIssues > 0 ||          // Always send if critical issues exist
      scoreDrop >= 5 ||               // Send if score dropped 5+ points
      previousScore === null;          // Always send first time (no history)
    
    if (shouldSendEmail) {
      console.log(`[SEO Optimizer] Sending email: criticalIssues=${criticalIssues}, scoreDrop=${scoreDrop}, previousScore=${previousScore}`);
      await sendSeoReport(allAudits, overallScore, criticalIssues, warnings, linkSuggestions, previousScore, scoreDrop);
    } else {
      console.log(`[SEO Optimizer] Skipping email: score stable at ${overallScore}/100, 0 critical issues (saved Resend quota)`);
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const summary = `Audited ${pagesAudited} pages, found ${issuesFound} issues, generated ${recommendationsGenerated} recommendations. Overall score: ${overallScore}/100`;
    
    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: errors > 0 ? "partial" : "success",
        summary,
        completedAt: new Date(),
        details: JSON.stringify({
          pagesAudited, issuesFound, recommendationsGenerated, overallScore,
          criticalIssues, warnings, linkSuggestions: linkSuggestions.length,
          durationSeconds: duration,
        }),
        itemsProcessed: pagesAudited,
        itemsSucceeded: pagesAudited - errors,
        durationMs: Date.now() - startTime,
      });
    }

    console.log(`[SEO Optimizer] ${summary}`);
  } catch (err) {
    console.error("[SEO Optimizer] Agent failed:", err);
    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: "failed",
        summary: `Agent failed: ${err instanceof Error ? err.message : String(err)}`,
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      });
    }
    errors++;
  }

  return { pagesAudited, issuesFound, recommendationsGenerated, overallScore, errors };
}
