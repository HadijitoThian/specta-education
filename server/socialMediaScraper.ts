/**
 * Social Media Scraper — Feature 4
 * 
 * Scrapes public social media content related to study abroad from Indonesia.
 * Uses public web scraping (no API keys needed) to find:
 * - Twitter/X posts about studying abroad
 * - Public forum discussions (Kaskus, Reddit)
 * - Google News mentions
 * - YouTube video mentions
 * 
 * Identifies potential leads from social conversations.
 * Stores mentions with AI-powered sentiment analysis.
 * 
 * NOTE: Instagram/Facebook/TikTok require official APIs (deferred to Feature 5).
 * This scraper focuses on publicly accessible platforms.
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, desc, and, sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  try { return drizzle(process.env.DATABASE_URL); } catch { return null; }
}

// ==========================================
// Search Keywords for Social Monitoring
// ==========================================
export const SOCIAL_KEYWORDS = [
  // Indonesian keywords
  "kuliah di luar negeri",
  "beasiswa australia",
  "konsultan pendidikan",
  "study abroad indonesia",
  "ielts preparation jakarta",
  "kuliah di australia",
  "kuliah di inggris",
  "kuliah di kanada",
  "visa pelajar",
  "biaya kuliah luar negeri",
  // Brand mentions
  "specta education",
  "spectaeducation",
  // Competitor mentions
  "idp education indonesia",
  "sun education",
];

// ==========================================
// Scrape Google News for study abroad mentions
// ==========================================
async function scrapeGoogleNews(keyword: string): Promise<Array<{
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedAt: string;
}>> {
  const results: Array<{
    title: string;
    url: string;
    source: string;
    snippet: string;
    publishedAt: string;
  }> = [];

  try {
    const query = encodeURIComponent(keyword);
    const url = `https://news.google.com/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "id-ID,id;q=0.9",
      },
    });

    if (!response.ok) return results;

    const html = await response.text();

    // Parse news articles from Google News HTML
    // Look for article elements with titles and links
    const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let match;
    while ((match = articlePattern.exec(html)) !== null && results.length < 10) {
      const articleHtml = match[1];
      
      // Extract title and link
      const linkMatch = articleHtml.match(/<a[^>]*href="\.\/articles\/([^"]+)"[^>]*>(.*?)<\/a>/);
      const titleMatch = articleHtml.match(/<h[34][^>]*>(.*?)<\/h[34]>/);
      const sourceMatch = articleHtml.match(/<div[^>]*data-n-tid[^>]*>(.*?)<\/div>/);
      const timeMatch = articleHtml.match(/<time[^>]*datetime="([^"]*)"[^>]*>/);

      const title = (titleMatch ? titleMatch[1] : "").replace(/<[^>]+>/g, "").trim();
      if (!title) continue;

      results.push({
        title,
        url: linkMatch ? `https://news.google.com/articles/${linkMatch[1]}` : "",
        source: sourceMatch ? sourceMatch[1].replace(/<[^>]+>/g, "").trim() : "Unknown",
        snippet: title,
        publishedAt: timeMatch ? timeMatch[1] : new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error(`[SocialScraper] Google News error for "${keyword}":`, err);
  }

  return results;
}

// ==========================================
// Scrape Google for social media mentions
// ==========================================
async function scrapeGoogleForSocialMentions(keyword: string): Promise<Array<{
  platform: string;
  title: string;
  url: string;
  snippet: string;
  authorName: string;
}>> {
  const results: Array<{
    platform: string;
    title: string;
    url: string;
    snippet: string;
    authorName: string;
  }> = [];

  try {
    // Search Google for social media posts about the keyword
    const platforms = [
      { site: "twitter.com OR x.com", platform: "twitter" },
      { site: "reddit.com", platform: "reddit" },
      { site: "kaskus.co.id", platform: "kaskus" },
      { site: "youtube.com", platform: "youtube" },
      { site: "linkedin.com", platform: "linkedin" },
    ];

    for (const p of platforms) {
      try {
        const query = encodeURIComponent(`${keyword} site:${p.site}`);
        const url = `https://www.google.com/search?q=${query}&gl=id&hl=id&num=5&tbs=qdr:w`; // Last week

        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html",
            "Accept-Language": "id-ID,id;q=0.9",
          },
        });

        if (!response.ok) continue;

        const html = await response.text();

        // Parse search results
        const resultBlocks = html.split('<div class="g"');
        for (let i = 1; i < resultBlocks.length && results.length < 30; i++) {
          const block = resultBlocks[i];
          
          const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/);
          if (!urlMatch) continue;
          const resultUrl = urlMatch[1];

          // Skip Google's own URLs
          if (resultUrl.includes("google.com")) continue;

          const titleMatch = block.match(/<h3[^>]*>(.*?)<\/h3>/);
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

          const snippetMatch = block.match(/<span[^>]*>(.*?)<\/span>/);
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";

          // Extract author from URL or title
          let authorName = "";
          if (p.platform === "twitter" || p.platform === "reddit") {
            const authorMatch = resultUrl.match(/(?:twitter|x)\.com\/([^/]+)|reddit\.com\/(?:r|u)\/([^/]+)/);
            authorName = authorMatch ? (authorMatch[1] || authorMatch[2] || "") : "";
          }

          results.push({
            platform: p.platform,
            title,
            url: resultUrl,
            snippet: snippet.substring(0, 300),
            authorName,
          });
        }

        // Delay between platform searches
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      } catch (platformErr) {
        console.error(`[SocialScraper] Error searching ${p.platform}:`, platformErr);
      }
    }
  } catch (err) {
    console.error(`[SocialScraper] Error in social search for "${keyword}":`, err);
  }

  return results;
}

// ==========================================
// Analyze mentions with AI for sentiment and lead potential
// ==========================================
async function analyzeMentions(mentions: Array<{
  platform: string;
  title: string;
  url: string;
  snippet: string;
  authorName: string;
}>): Promise<Array<{
  platform: string;
  title: string;
  url: string;
  snippet: string;
  authorName: string;
  sentiment: "positive" | "negative" | "neutral";
  isLeadOpportunity: boolean;
  mentionType: "lead_signal" | "competitor_activity" | "brand_mention" | "industry_trend";
  relevanceScore: number;
}>> {
  if (mentions.length === 0) return [];

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a social media analyst for SpecTa Education, an Indonesian study abroad consultancy. 
Analyze social media mentions and classify each one.

For each mention, determine:
1. sentiment: positive/negative/neutral
2. isLeadOpportunity: true if the person seems to be looking for study abroad help
3. mentionType: lead_signal (someone asking about studying abroad), competitor_activity (competitor marketing), brand_mention (mentions SpecTa), industry_trend (general industry news)
4. relevanceScore: 0-100 how relevant to SpecTa's business

Return JSON array matching the input order.`
        },
        {
          role: "user",
          content: `Analyze these ${mentions.length} social media mentions:\n\n${mentions.map((m, i) => `${i+1}. [${m.platform}] "${m.title}" - ${m.snippet}`).join("\n\n")}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mention_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              analyses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
                    isLeadOpportunity: { type: "boolean" },
                    mentionType: { type: "string", enum: ["lead_signal", "competitor_activity", "brand_mention", "industry_trend"] },
                    relevanceScore: { type: "integer" },
                  },
                  required: ["sentiment", "isLeadOpportunity", "mentionType", "relevanceScore"],
                  additionalProperties: false,
                },
              },
            },
            required: ["analyses"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return mentions.map(m => ({
      ...m,
      sentiment: "neutral" as const,
      isLeadOpportunity: false,
      mentionType: "industry_trend" as const,
      relevanceScore: 30,
    }));

    const parsed = JSON.parse(content);
    const analyses = parsed.analyses || [];

    return mentions.map((m, i) => ({
      ...m,
      sentiment: analyses[i]?.sentiment || "neutral",
      isLeadOpportunity: analyses[i]?.isLeadOpportunity || false,
      mentionType: analyses[i]?.mentionType || "industry_trend",
      relevanceScore: analyses[i]?.relevanceScore || 30,
    }));
  } catch (err) {
    console.error("[SocialScraper] AI analysis error:", err);
    return mentions.map(m => ({
      ...m,
      sentiment: "neutral" as const,
      isLeadOpportunity: false,
      mentionType: "industry_trend" as const,
      relevanceScore: 30,
    }));
  }
}

// ==========================================
// Run full social media scan
// ==========================================
export async function runSocialMediaScan(): Promise<{
  keywordsSearched: number;
  mentionsFound: number;
  leadOpportunities: number;
  brandMentions: number;
  competitorMentions: number;
  topMentions: Array<{
    platform: string;
    title: string;
    url: string;
    sentiment: string;
    isLead: boolean;
    relevanceScore: number;
  }>;
  errors: number;
}> {
  const db = await getDb();
  let keywordsSearched = 0;
  let mentionsFound = 0;
  let errors = 0;
  const allMentions: Array<{
    platform: string;
    title: string;
    url: string;
    snippet: string;
    authorName: string;
  }> = [];

  // Search for each keyword
  for (const keyword of SOCIAL_KEYWORDS.slice(0, 8)) { // Limit to 8 keywords per run
    try {
      const socialResults = await scrapeGoogleForSocialMentions(keyword);
      allMentions.push(...socialResults);
      keywordsSearched++;

      // Delay between keywords
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    } catch (err) {
      console.error(`[SocialScraper] Error for "${keyword}":`, err);
      errors++;
    }
  }

  // Also check Google News
  try {
    const newsResults = await scrapeGoogleNews("kuliah luar negeri indonesia");
    allMentions.push(...newsResults.map(n => ({
      platform: "news",
      title: n.title,
      url: n.url,
      snippet: n.snippet,
      authorName: n.source,
    })));
  } catch (err) {
    console.error("[SocialScraper] News scraping error:", err);
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueMentions = allMentions.filter(m => {
    if (!m.url || seenUrls.has(m.url)) return false;
    seenUrls.add(m.url);
    return true;
  });

  mentionsFound = uniqueMentions.length;

  // Analyze mentions with AI (in batches of 15)
  const analyzedMentions: Array<{
    platform: string;
    title: string;
    url: string;
    snippet: string;
    authorName: string;
    sentiment: "positive" | "negative" | "neutral";
    isLeadOpportunity: boolean;
    mentionType: "lead_signal" | "competitor_activity" | "brand_mention" | "industry_trend";
    relevanceScore: number;
  }> = [];

  for (let i = 0; i < uniqueMentions.length; i += 15) {
    const batch = uniqueMentions.slice(i, i + 15);
    const analyzed = await analyzeMentions(batch);
    analyzedMentions.push(...analyzed);
  }

  // Store in database
  if (db && analyzedMentions.length > 0) {
    try {
      const { socialMentions } = await import("../drizzle/schema");
      
      for (const mention of analyzedMentions) {
        try {
          // Check if URL already exists
          const [existing] = await db
            .select()
            .from(socialMentions)
            .where(eq(socialMentions.sourceUrl, mention.url))
            .limit(1);

          if (!existing) {
            await db.insert(socialMentions).values({
              platform: (mention.platform === "news" ? "other" : mention.platform === "kaskus" ? "other" : mention.platform) as any,
              mentionType: mention.mentionType,
              authorName: mention.authorName || null,
              authorHandle: mention.authorName || null,
              content: mention.snippet,
              sourceUrl: mention.url,
              sentiment: mention.sentiment,
              relevanceScore: mention.relevanceScore,
              isLeadOpportunity: mention.isLeadOpportunity,
              status: "new",
            });
          }
        } catch (insertErr) {
          // Skip duplicates
        }
      }
    } catch (dbErr) {
      console.error("[SocialScraper] DB error:", dbErr);
    }
  }

  // Count categories
  const leadOpportunities = analyzedMentions.filter(m => m.isLeadOpportunity).length;
  const brandMentions = analyzedMentions.filter(m => m.mentionType === "brand_mention").length;
  const competitorMentions = analyzedMentions.filter(m => m.mentionType === "competitor_activity").length;

  // Log the run
  if (db) {
    try {
      const { createAgentRunLog, updateAgentRunLog } = await import("./db");
      const log = await createAgentRunLog({
        agentName: "social_scraper",
        status: "success",
        startedAt: new Date(),
      });
      if (log) {
        await updateAgentRunLog(log.id, {
          status: "success",
          completedAt: new Date(),
          summary: `Searched ${keywordsSearched} keywords, found ${mentionsFound} mentions. ${leadOpportunities} lead opportunities, ${brandMentions} brand mentions.`,
          itemsProcessed: keywordsSearched,
          itemsSucceeded: mentionsFound,
          itemsFailed: errors,
          details: JSON.stringify({
            analyzedMentions: analyzedMentions.slice(0, 30), // Store top 30
            leadOpportunities,
            brandMentions,
            competitorMentions,
            scannedAt: new Date().toISOString(),
          }),
        });
      }
    } catch (logErr) {
      console.error("[SocialScraper] Log error:", logErr);
    }
  }

  return {
    keywordsSearched,
    mentionsFound,
    leadOpportunities,
    brandMentions,
    competitorMentions,
    topMentions: analyzedMentions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20)
      .map(m => ({
        platform: m.platform,
        title: m.title,
        url: m.url,
        sentiment: m.sentiment,
        isLead: m.isLeadOpportunity,
        relevanceScore: m.relevanceScore,
      })),
    errors,
  };
}

// ==========================================
// Get latest social media data for dashboard
// ==========================================
export async function getSocialMediaData(): Promise<{
  lastScanned: Date | null;
  totalMentions: number;
  leadOpportunities: number;
  brandMentions: number;
  recentMentions: Array<{
    platform: string;
    content: string;
    sourceUrl: string;
    sentiment: string;
    isLeadOpportunity: boolean;
    relevanceScore: number;
    detectedAt: Date;
  }>;
  platformBreakdown: Array<{ platform: string; count: number }>;
}> {
  const db = await getDb();
  if (!db) return {
    lastScanned: null,
    totalMentions: 0,
    leadOpportunities: 0,
    brandMentions: 0,
    recentMentions: [],
    platformBreakdown: [],
  };

  try {
    const { socialMentions, agentRunLogs } = await import("../drizzle/schema");

    // Get total counts
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(socialMentions);
    const totalMentions = countResult?.count || 0;

    const [leadCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(socialMentions)
      .where(eq(socialMentions.isLeadOpportunity, true));
    const leadOpportunities = leadCount?.count || 0;

    const [brandCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(socialMentions)
      .where(eq(socialMentions.mentionType, "brand_mention"));
    const brandMentions = brandCount?.count || 0;

    // Get recent mentions
    const recentMentions = await db
      .select()
      .from(socialMentions)
      .orderBy(desc(socialMentions.detectedAt))
      .limit(20);

    // Get platform breakdown
    const platformBreakdown = await db
      .select({
        platform: socialMentions.platform,
        count: sql<number>`COUNT(*)`,
      })
      .from(socialMentions)
      .groupBy(socialMentions.platform);

    // Get last scan time
    const [lastScan] = await db
      .select()
      .from(agentRunLogs)
      .where(eq(agentRunLogs.agentName, "social_scraper"))
      .orderBy(desc(agentRunLogs.startedAt))
      .limit(1);

    return {
      lastScanned: lastScan?.startedAt || null,
      totalMentions,
      leadOpportunities,
      brandMentions,
      recentMentions: recentMentions.map((m: any) => ({
        platform: m.platform,
        content: m.content || "",
        sourceUrl: m.sourceUrl || "",
        sentiment: m.sentiment || "neutral",
        isLeadOpportunity: m.isLeadOpportunity || false,
        relevanceScore: m.relevanceScore || 0,
        detectedAt: m.detectedAt,
      })),
      platformBreakdown: platformBreakdown.map((p: any) => ({
        platform: p.platform,
        count: p.count,
      })),
    };
  } catch (err) {
    console.error("[SocialScraper] Error getting data:", err);
    return {
      lastScanned: null,
      totalMentions: 0,
      leadOpportunities: 0,
      brandMentions: 0,
      recentMentions: [],
      platformBreakdown: [],
    };
  }
}
