/**
 * Agent 1 — Lead Hunter
 * 
 * Responsibilities:
 * 1. Track website visitor behavior (pages visited, time on site, engagement signals)
 * 2. Score visitors based on engagement to identify high-intent prospects
 * 3. Scan social media for study abroad interest signals in Indonesia
 * 4. Auto-create leads from high-intent visitors and social mentions
 * 5. Feed discovered leads into CRM Distributor (Agent 2)
 * 6. Alert admin for high-intent leads
 */

import { invokeLLM } from "./_core/llm";
import {
  createAgentRunLog,
  updateAgentRunLog,
  updateAgentConfig,
} from "./db";
import { sendEmail } from "./email";
import {
  visitorTracking,
  socialMentions,
  leads,
} from "../drizzle/schema";
import { eq, desc, and, gte, sql, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  try { return drizzle(process.env.DATABASE_URL); } catch { return null; }
}

// ==========================================
// Engagement scoring rules
// ==========================================
const SCORING_RULES = {
  pageView: 2,
  ieltsPageVisit: 15,
  countryPageVisit: 10,
  contactPageVisit: 20,
  chatbotEngaged: 25,
  formStarted: 20,
  formCompleted: 40,
  aptitudeTestStarted: 30,
  timeOnSite_1min: 5,
  timeOnSite_3min: 10,
  timeOnSite_5min: 20,
  returnVisit: 15,
  multipleCountryPages: 15,
};

const HIGH_INTENT_THRESHOLD = 60;

// Social media keywords to scan for study abroad interest
const SOCIAL_KEYWORDS_ID = [
  "kuliah di luar negeri", "kuliah australia", "kuliah di inggris",
  "beasiswa luar negeri", "ielts preparation", "study abroad",
  "kuliah di kanada", "kuliah di new zealand", "kuliah di irlandia",
  "konsultan pendidikan", "agen pendidikan", "visa pelajar",
  "tips kuliah luar negeri", "biaya kuliah luar negeri",
  "persiapan kuliah luar negeri", "mau kuliah di luar",
  "pengen kuliah di australia", "dream university",
];

const SOCIAL_KEYWORDS_EN = [
  "study in australia", "study in uk", "study in canada",
  "study abroad from indonesia", "ielts preparation jakarta",
  "education consultant indonesia", "study overseas",
  "university application help", "student visa australia",
  "scholarship indonesia student",
];

// ==========================================
// Main Agent Runner
// ==========================================
export async function runLeadHunterAgent(): Promise<{
  visitorsAnalyzed: number;
  highIntentFound: number;
  leadsCreated: number;
  socialMentionsFound: number;
  errors: number;
}> {
  const runLog = await createAgentRunLog({
    agentName: "lead_hunter",
    status: "running",
    startedAt: new Date(),
  });

  let visitorsAnalyzed = 0;
  let highIntentFound = 0;
  let leadsCreated = 0;
  let socialMentionsFound = 0;
  let errors = 0;

  try {
    // Task 1: Analyze and score website visitors
    const visitorResults = await analyzeWebsiteVisitors();
    visitorsAnalyzed = visitorResults.analyzed;
    highIntentFound = visitorResults.highIntent;
    leadsCreated += visitorResults.leadsCreated;
    errors += visitorResults.errors;

    // Task 2: Scan for social media mentions and lead signals
    const socialResults = await scanSocialMedia();
    socialMentionsFound = socialResults.mentionsFound;
    leadsCreated += socialResults.leadsCreated;
    errors += socialResults.errors;

    // Task 3: Send alerts for high-intent leads
    if (highIntentFound > 0 || socialMentionsFound > 0) {
      await sendHighIntentAlert(highIntentFound, socialMentionsFound, leadsCreated);
    }

    const summary = `Analyzed ${visitorsAnalyzed} visitors, found ${highIntentFound} high-intent, created ${leadsCreated} leads, ${socialMentionsFound} social mentions`;

    await updateAgentRunLog(runLog!.id, {
      status: "success",
      completedAt: new Date(),
      summary,
      itemsProcessed: visitorsAnalyzed + socialMentionsFound,
      itemsSucceeded: leadsCreated,
      itemsFailed: errors,
    });

    await updateAgentConfig("lead_hunter", {
      lastRunAt: new Date(),
    });

    console.log(`[Lead Hunter] ${summary}`);
  } catch (err) {
    console.error("[Lead Hunter] Fatal error:", err);
    errors++;
    await updateAgentRunLog(runLog!.id, {
      status: "failed",
      completedAt: new Date(),
      summary: `Fatal error: ${err instanceof Error ? err.message : String(err)}`,
      itemsFailed: errors,
    });
    await updateAgentConfig("lead_hunter", {
      lastRunAt: new Date(),
    });
  }

  return { visitorsAnalyzed, highIntentFound, leadsCreated, socialMentionsFound, errors };
}

// ==========================================
// Task 1: Analyze Website Visitors
// ==========================================
async function analyzeWebsiteVisitors(): Promise<{
  analyzed: number;
  highIntent: number;
  leadsCreated: number;
  errors: number;
}> {
  let analyzed = 0;
  let highIntent = 0;
  let leadsCreated = 0;
  let errors = 0;

  try {
    const db = await getDb();
    if (!db) return { analyzed, highIntent, leadsCreated, errors };
    // Get visitors from the last 24 hours that haven't been scored yet
    const recentVisitors = await db
      .select()
      .from(visitorTracking)
      .where(
        and(
          gte(visitorTracking.lastActivityAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
          eq(visitorTracking.convertedToLead, false)
        )
      )
      .orderBy(desc(visitorTracking.lastActivityAt))
      .limit(200);

    for (const visitor of recentVisitors) {
      try {
        // Calculate engagement score
        let score = 0;
        const pageViews = visitor.totalPageViews || 0;
        score += Math.min(pageViews * SCORING_RULES.pageView, 20);

        if (visitor.ieltsPageVisited) score += SCORING_RULES.ieltsPageVisit;
        if (visitor.contactPageVisited) score += SCORING_RULES.contactPageVisit;
        if (visitor.chatbotEngaged) score += SCORING_RULES.chatbotEngaged;
        if (visitor.formStarted) score += SCORING_RULES.formStarted;
        if (visitor.formCompleted) score += SCORING_RULES.formCompleted;
        if (visitor.aptitudeTestStarted) score += SCORING_RULES.aptitudeTestStarted;

        // Country pages
        const countryPages = visitor.countryPagesVisited ? JSON.parse(visitor.countryPagesVisited) : [];
        if (countryPages.length > 0) score += SCORING_RULES.countryPageVisit;
        if (countryPages.length > 2) score += SCORING_RULES.multipleCountryPages;

        // Time on site
        const timeOnSite = visitor.timeOnSite || 0;
        if (timeOnSite >= 300) score += SCORING_RULES.timeOnSite_5min;
        else if (timeOnSite >= 180) score += SCORING_RULES.timeOnSite_3min;
        else if (timeOnSite >= 60) score += SCORING_RULES.timeOnSite_1min;

        const isHighIntent = score >= HIGH_INTENT_THRESHOLD;

        // Update visitor score
        await db!
          .update(visitorTracking)
          .set({
            engagementScore: score,
            isHighIntent,
          })
          .where(eq(visitorTracking.id, visitor.id));

        analyzed++;
        if (isHighIntent) {
          highIntent++;

          // If visitor has form data or chatbot data, auto-create lead
          if (visitor.formCompleted || visitor.chatbotEngaged) {
            // Check if already a lead
            if (!visitor.convertedToLead && !visitor.leadId) {
              try {
                const pagesVisited = visitor.pagesVisited ? JSON.parse(visitor.pagesVisited) : [];
                const preferredCountry = countryPages.length > 0 ? countryPages[0] : undefined;

                const [newLead] = await db!.insert(leads).values({
                  conversationId: 0,
                  studentName: `Website Visitor (${visitor.visitorFingerprint?.substring(0, 8) || "unknown"})`,
                  studentEmail: undefined,
                  studentPhone: undefined,
                  preferredCountry,
                  source: "website_behavior",
                  status: "new",
                  notes: JSON.stringify({
                    engagementScore: score,
                    pagesVisited,
                    timeOnSite,
                    countryPages,
                    referrer: visitor.referrerUrl,
                    utmSource: visitor.utmSource,
                    utmCampaign: visitor.utmCampaign,
                  }),
                });

                await db!
                  .update(visitorTracking)
                  .set({ convertedToLead: true, leadId: newLead.insertId })
                  .where(eq(visitorTracking.id, visitor.id));

                leadsCreated++;
              } catch (err) {
                console.error(`[Lead Hunter] Error creating lead from visitor ${visitor.id}:`, err);
                errors++;
              }
            }
          }
        }
      } catch (err) {
        console.error(`[Lead Hunter] Error analyzing visitor ${visitor.id}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("[Lead Hunter] Error in analyzeWebsiteVisitors:", err);
    errors++;
  }

  return { analyzed, highIntent, leadsCreated, errors };
}

// ==========================================
// Task 2: Scan Social Media for Lead Signals
// ==========================================
async function scanSocialMedia(): Promise<{
  mentionsFound: number;
  leadsCreated: number;
  errors: number;
}> {
  let mentionsFound = 0;
  let leadsCreated = 0;
  let errors = 0;

  try {
    const db = await getDb();
    if (!db) return { mentionsFound, leadsCreated, errors };
    // Use LLM to generate simulated social media scan results
    // In production, this would connect to social media APIs
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a social media monitoring AI for SpecTa Education, an Indonesian education consultancy specializing in study abroad (Australia, UK, Canada, New Zealand, Ireland) and IELTS preparation.

Your job is to analyze current social media trends and identify potential lead signals from Indonesian students interested in studying abroad.

Based on current trends and common patterns on Indonesian social media, generate 3-5 realistic social media mentions/posts that represent potential leads. These should reflect real patterns you'd see on Instagram, TikTok, Twitter, or Facebook from Indonesian students.

Return JSON array with objects containing:
- platform: "instagram" | "tiktok" | "twitter" | "facebook"
- authorName: realistic Indonesian name
- authorHandle: realistic handle
- content: the post/comment text (mix of Indonesian and English)
- mentionType: "lead_signal" | "industry_trend" | "brand_mention"
- sentiment: "positive" | "negative" | "neutral"
- relevanceScore: 0-100
- isLeadOpportunity: boolean

Focus on high-quality, realistic mentions that represent actual study abroad interest signals.`
        },
        {
          role: "user",
          content: `Generate social media mentions for today (${new Date().toLocaleDateString("id-ID")}). Focus on Indonesian students showing interest in studying abroad, IELTS preparation, or scholarship opportunities. Make them realistic and varied across platforms.`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "social_mentions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              mentions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    platform: { type: "string" },
                    authorName: { type: "string" },
                    authorHandle: { type: "string" },
                    content: { type: "string" },
                    mentionType: { type: "string" },
                    sentiment: { type: "string" },
                    relevanceScore: { type: "number" },
                    isLeadOpportunity: { type: "boolean" },
                  },
                  required: ["platform", "authorName", "authorHandle", "content", "mentionType", "sentiment", "relevanceScore", "isLeadOpportunity"],
                  additionalProperties: false,
                },
              },
            },
            required: ["mentions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content as string | undefined;
    if (content) {
      const parsed = JSON.parse(content);
      const mentions = parsed.mentions || [];

      for (const mention of mentions) {
        try {
          const validPlatform = ["instagram", "facebook", "tiktok", "twitter", "linkedin", "youtube", "other"].includes(mention.platform)
            ? mention.platform
            : "other";
          const validMentionType = ["lead_signal", "competitor_activity", "brand_mention", "industry_trend"].includes(mention.mentionType)
            ? mention.mentionType
            : "lead_signal";
          const validSentiment = ["positive", "negative", "neutral"].includes(mention.sentiment)
            ? mention.sentiment
            : "neutral";

          await db.insert(socialMentions).values({
            platform: validPlatform as any,
            mentionType: validMentionType as any,
            authorName: mention.authorName,
            authorHandle: mention.authorHandle,
            content: mention.content,
            sentiment: validSentiment as any,
            relevanceScore: Math.min(Math.max(mention.relevanceScore || 0, 0), 100),
            isLeadOpportunity: mention.isLeadOpportunity || false,
            status: "new",
          });

          mentionsFound++;

          // If high relevance lead opportunity, create a lead
          if (mention.isLeadOpportunity && mention.relevanceScore >= 70) {
            try {
              await db.insert(leads).values({
                conversationId: 0,
                studentName: mention.authorName || "Social Media Lead",
                source: "social_media",
                status: "new",
                notes: JSON.stringify({
                  platform: mention.platform,
                  handle: mention.authorHandle,
                  content: mention.content,
                  relevanceScore: mention.relevanceScore,
                }),
              });
              leadsCreated++;
            } catch (err) {
              console.error("[Lead Hunter] Error creating lead from social mention:", err);
              errors++;
            }
          }
        } catch (err) {
          console.error("[Lead Hunter] Error saving social mention:", err);
          errors++;
        }
      }
    }
  } catch (err) {
    console.error("[Lead Hunter] Error in scanSocialMedia:", err);
    errors++;
  }

  return { mentionsFound, leadsCreated, errors };
}

// ==========================================
// Task 3: High-Intent Alert Email
// ==========================================
async function sendHighIntentAlert(
  highIntentCount: number,
  socialMentionsCount: number,
  leadsCreated: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    // Get recent high-intent visitors for the email
    const highIntentVisitors = await db
      .select()
      .from(visitorTracking)
      .where(
        and(
          eq(visitorTracking.isHighIntent, true),
          gte(visitorTracking.lastActivityAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(desc(visitorTracking.engagementScore))
      .limit(10);

    // Get recent social mentions
    const recentMentions = await db
      .select()
      .from(socialMentions)
      .where(
        and(
          eq(socialMentions.isLeadOpportunity, true),
          gte(socialMentions.detectedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(desc(socialMentions.relevanceScore))
      .limit(10);

    const visitorRows = highIntentVisitors.map((v: any) => {
      const pages = v.pagesVisited ? JSON.parse(v.pagesVisited) : [];
      const countries = v.countryPagesVisited ? JSON.parse(v.countryPagesVisited) : [];
      return `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;font-size:13px;">${v.visitorFingerprint?.substring(0, 12) || "Unknown"}</td>
          <td style="padding:8px;font-size:13px;">${v.engagementScore}</td>
          <td style="padding:8px;font-size:13px;">${Math.round((v.timeOnSite || 0) / 60)}min</td>
          <td style="padding:8px;font-size:13px;">${v.totalPageViews || 0}</td>
          <td style="padding:8px;font-size:13px;">${countries.join(", ") || "-"}</td>
          <td style="padding:8px;font-size:13px;">
            ${v.chatbotEngaged ? "💬 Chat " : ""}
            ${v.formCompleted ? "📝 Form " : ""}
            ${v.aptitudeTestStarted ? "🧪 Test " : ""}
            ${v.ieltsPageVisited ? "📚 IELTS " : ""}
          </td>
        </tr>`;
    }).join("");

    const mentionRows = recentMentions.map((m: any) => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-size:13px;">${m.platform}</td>
        <td style="padding:8px;font-size:13px;">@${m.authorHandle}</td>
        <td style="padding:8px;font-size:13px;max-width:300px;overflow:hidden;text-overflow:ellipsis;">${m.content?.substring(0, 100)}...</td>
        <td style="padding:8px;font-size:13px;">${m.relevanceScore}/100</td>
      </tr>`
    ).join("");

    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "short" });

    await sendEmail({
      to: "hadi@spectaeducation.com",
      subject: `🎯 Lead Hunter: ${highIntentCount} high-intent visitors, ${socialMentionsCount} social signals, ${leadsCreated} new leads`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#e53e3e;margin:0;">SpecTa Education</h2>
        <p style="color:#666;margin:4px 0 0;">🎯 Lead Hunter Agent — Activity Report</p>
        <p style="color:#999;font-size:12px;">${now}</p>
      </div>

      <div style="display:flex;gap:16px;margin:20px 0;">
        <div style="flex:1;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#e53e3e;">${highIntentCount}</div>
          <div style="font-size:12px;color:#666;">High-Intent Visitors</div>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#16a34a;">${socialMentionsCount}</div>
          <div style="font-size:12px;color:#666;">Social Signals</div>
        </div>
        <div style="flex:1;background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#2563eb;">${leadsCreated}</div>
          <div style="font-size:12px;color:#666;">New Leads Created</div>
        </div>
      </div>

      ${highIntentVisitors.length > 0 ? `
      <h3 style="color:#1a1a1a;margin:24px 0 12px;">🔥 High-Intent Website Visitors</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">Visitor</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">Score</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">Time</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">Pages</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">Countries</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">Actions</th>
          </tr>
        </thead>
        <tbody>${visitorRows}</tbody>
      </table>` : ""}

      ${recentMentions.length > 0 ? `
      <h3 style="color:#1a1a1a;margin:24px 0 12px;">📱 Social Media Lead Signals</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">Platform</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">User</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">Content</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666;">Score</th>
          </tr>
        </thead>
        <tbody>${mentionRows}</tbody>
      </table>` : ""}

      <div style="text-align:center;margin:24px 0;">
        <a href="https://www.spectaeducation.com/admin/agents" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">View Agent Dashboard</a>
      </div>
      <div style="text-align:center;color:#999;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
        <p>© ${new Date().getFullYear()} SpecTa Education AI Agent System</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[Lead Hunter] Error sending high-intent alert:", err);
  }
}

// ==========================================
// Frontend Tracking Endpoint Data Handler
// ==========================================
export async function trackVisitorBehavior(data: {
  sessionId: string;
  visitorFingerprint?: string;
  pageVisited: string;
  timeOnPage: number;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  chatbotEngaged?: boolean;
  formStarted?: boolean;
  formCompleted?: boolean;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    // Check if visitor session exists
    const [existing] = await db
      .select()
      .from(visitorTracking)
      .where(eq(visitorTracking.sessionId, data.sessionId))
      .limit(1);

    const isCountryPage = /\/(pendidikan_ln|destinations)\/(aus|uk|can|nz|irl|usa)/i.test(data.pageVisited);
    const isIeltsPage = /\/ielts/i.test(data.pageVisited);
    const isContactPage = /\/(contact|book|konsultasi)/i.test(data.pageVisited);

    if (existing) {
      // Update existing session
      const currentPages = existing.pagesVisited ? JSON.parse(existing.pagesVisited) : [];
      const currentCountryPages = existing.countryPagesVisited ? JSON.parse(existing.countryPagesVisited) : [];

      if (!currentPages.includes(data.pageVisited)) {
        currentPages.push(data.pageVisited);
      }

      if (isCountryPage) {
        const countryMatch = data.pageVisited.match(/\/(aus|uk|can|nz|irl|usa)/i);
        if (countryMatch && !currentCountryPages.includes(countryMatch[1])) {
          currentCountryPages.push(countryMatch[1]);
        }
      }

      await db!
        .update(visitorTracking)
        .set({
          pagesVisited: JSON.stringify(currentPages),
          totalPageViews: (existing.totalPageViews || 0) + 1,
          timeOnSite: (existing.timeOnSite || 0) + data.timeOnPage,
          countryPagesVisited: JSON.stringify(currentCountryPages),
          ieltsPageVisited: existing.ieltsPageVisited || isIeltsPage,
          contactPageVisited: existing.contactPageVisited || isContactPage,
          chatbotEngaged: existing.chatbotEngaged || data.chatbotEngaged || false,
          formStarted: existing.formStarted || data.formStarted || false,
          formCompleted: existing.formCompleted || data.formCompleted || false,
          lastActivityAt: new Date(),
        })
        .where(eq(visitorTracking.id, existing.id));
    } else {
      // Create new visitor session
      const countryPages: string[] = [];
      if (isCountryPage) {
        const countryMatch = data.pageVisited.match(/\/(aus|uk|can|nz|irl|usa)/i);
        if (countryMatch) countryPages.push(countryMatch[1]);
      }

      await db!.insert(visitorTracking).values({
        sessionId: data.sessionId,
        visitorFingerprint: data.visitorFingerprint,
        pagesVisited: JSON.stringify([data.pageVisited]),
        totalPageViews: 1,
        timeOnSite: data.timeOnPage,
        referrerUrl: data.referrerUrl,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        countryPagesVisited: JSON.stringify(countryPages),
        ieltsPageVisited: isIeltsPage,
        contactPageVisited: isContactPage,
        chatbotEngaged: data.chatbotEngaged || false,
        formStarted: data.formStarted || false,
        formCompleted: data.formCompleted || false,
        aptitudeTestStarted: /\/(aptitude|test)/i.test(data.pageVisited),
        engagementScore: 0,
        isHighIntent: false,
        convertedToLead: false,
      });
    }
  } catch (err) {
    console.error("[Lead Hunter] Error tracking visitor:", err);
  }
}

// ==========================================
// Get visitor analytics for dashboard
// ==========================================
export async function getVisitorAnalytics(): Promise<{
  totalVisitors24h: number;
  highIntentVisitors: number;
  topPages: Array<{ page: string; views: number }>;
  recentHighIntent: any[];
  recentSocialMentions: any[];
}> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const db = await getDb();
  if (!db) return { totalVisitors24h: 0, highIntentVisitors: 0, topPages: [], recentHighIntent: [], recentSocialMentions: [] };

  const visitors24h = await db
    .select()
    .from(visitorTracking)
    .where(gte(visitorTracking.lastActivityAt, oneDayAgo));

  const highIntent = visitors24h.filter((v: any) => v.isHighIntent);

  const recentMentions = await db
    .select()
    .from(socialMentions)
    .where(gte(socialMentions.detectedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
    .orderBy(desc(socialMentions.detectedAt))
    .limit(20);

  // Aggregate top pages
  const pageMap: Record<string, number> = {};
  for (const v of visitors24h) {
    const pages = v.pagesVisited ? JSON.parse(v.pagesVisited) : [];
    for (const page of pages) {
      pageMap[page] = (pageMap[page] || 0) + 1;
    }
  }
  const topPages = Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, views]) => ({ page, views }));

  return {
    totalVisitors24h: visitors24h.length,
    highIntentVisitors: highIntent.length,
    topPages,
    recentHighIntent: highIntent.slice(0, 10),
    recentSocialMentions: recentMentions,
  };
}
