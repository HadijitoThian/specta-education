/**
 * Google Ranking Tracker — Feature 2
 * 
 * Checks real Google search positions for target keywords.
 * Uses Google Custom Search JSON API (free tier: 100 queries/day)
 * or falls back to scraping Google search results.
 * 
 * Tracks:
 * - SpecTa's position for each keyword
 * - Competitor positions for the same keywords
 * - Historical ranking trends
 * - New ranking opportunities
 */

import { eq, desc, and, gte, sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { getTrackingDb } from "./db";

// Was: local `drizzle(process.env.DATABASE_URL)` — a brand new, never-closed
// pool on every call. Now uses the shared isolated tracking pool (db.ts
// getTrackingDb) so this scheduled tracker can't leak connections or starve
// the main pool that login/checkout/admin depend on.
async function getDb() {
  return getTrackingDb();
}

// ==========================================
// Target Keywords for Ranking
// ==========================================
export const TARGET_KEYWORDS = [
  // Indonesian keywords (high-value)
  { keyword: "konsultan kuliah australia jakarta", locale: "id", priority: "high" },
  { keyword: "kuliah di luar negeri", locale: "id", priority: "high" },
  { keyword: "ielts preparation jakarta", locale: "id", priority: "high" },
  { keyword: "beasiswa australia untuk indonesia", locale: "id", priority: "medium" },
  { keyword: "konsultan pendidikan luar negeri", locale: "id", priority: "high" },
  { keyword: "biaya kuliah di australia", locale: "id", priority: "medium" },
  { keyword: "kuliah di inggris dari indonesia", locale: "id", priority: "medium" },
  { keyword: "kuliah di kanada dari indonesia", locale: "id", priority: "medium" },
  { keyword: "visa pelajar australia", locale: "id", priority: "medium" },
  { keyword: "tes ielts jakarta", locale: "id", priority: "medium" },
  // English keywords
  { keyword: "study abroad consultant indonesia", locale: "en", priority: "high" },
  { keyword: "study in australia from indonesia", locale: "en", priority: "high" },
  { keyword: "education consultant jakarta", locale: "en", priority: "medium" },
  { keyword: "ielts preparation indonesia", locale: "en", priority: "medium" },
  { keyword: "study abroad indonesia", locale: "en", priority: "medium" },
];

// Competitor domains to track
const COMPETITOR_DOMAINS = [
  "idp.com",
  "suneducationgroup.com",
  "ausg.com.au",
  "aeccglobal.com",
  "gostudy.id",
  "studyzone.co.id",
  "racc.co.id",
  "eduspiral.com",
  "jmeducation.com",
];

const OUR_DOMAIN = "spectaeducation.com";

// ==========================================
// Google Search Scraper (lightweight)
// ==========================================
async function scrapeGoogleResults(keyword: string, locale: string = "id"): Promise<Array<{
  position: number;
  url: string;
  title: string;
  domain: string;
  snippet: string;
}>> {
  const results: Array<{
    position: number;
    url: string;
    title: string;
    domain: string;
    snippet: string;
  }> = [];

  try {
    // Use Google's search with parameters for Indonesia
    const gl = locale === "id" ? "id" : "us";
    const hl = locale === "id" ? "id" : "en";
    const query = encodeURIComponent(keyword);
    const url = `https://www.google.com/search?q=${query}&gl=${gl}&hl=${hl}&num=30`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": locale === "id" ? "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7" : "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.warn(`[RankTracker] Google returned ${response.status} for "${keyword}"`);
      return results;
    }

    const html = await response.text();

    // Parse search results from HTML
    // Google organic results are in divs with class "g"
    const resultBlocks = html.split('<div class="g"');
    
    let position = 0;
    for (let i = 1; i < resultBlocks.length && position < 30; i++) {
      const block = resultBlocks[i];
      position++;

      // Extract URL
      const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/);
      if (!urlMatch) continue;
      const resultUrl = urlMatch[1];

      // Extract domain
      try {
        const domain = new URL(resultUrl).hostname.replace("www.", "");
        
        // Extract title
        const titleMatch = block.match(/<h3[^>]*>(.*?)<\/h3>/);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        // Extract snippet
        const snippetMatch = block.match(/<span[^>]*class="[^"]*"[^>]*>(.*?)<\/span>/);
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim().substring(0, 200) : "";

        results.push({
          position,
          url: resultUrl,
          title,
          domain,
          snippet,
        });
      } catch {
        continue;
      }
    }

    // If HTML parsing didn't work well, try alternative parsing
    if (results.length < 3) {
      // Try parsing with a different pattern (Google sometimes uses different structures)
      const altPattern = /href="\/url\?q=(https?:\/\/[^&"]+)/g;
      let altMatch;
      let altPos = 0;
      while ((altMatch = altPattern.exec(html)) !== null && altPos < 30) {
        altPos++;
        const resultUrl = decodeURIComponent(altMatch[1]);
        try {
          const domain = new URL(resultUrl).hostname.replace("www.", "");
          // Skip Google's own domains
          if (domain.includes("google.") || domain.includes("youtube.") || domain.includes("gstatic.")) continue;
          
          results.push({
            position: altPos,
            url: resultUrl,
            title: "",
            domain,
            snippet: "",
          });
        } catch {
          continue;
        }
      }
    }
  } catch (err) {
    console.error(`[RankTracker] Error scraping Google for "${keyword}":`, err);
  }

  return results;
}

// ==========================================
// Check ranking for a single keyword
// ==========================================
export async function checkKeywordRanking(keyword: string, locale: string = "id"): Promise<{
  keyword: string;
  locale: string;
  ourPosition: number | null;
  ourUrl: string | null;
  competitorPositions: Array<{ domain: string; position: number; url: string }>;
  topResults: Array<{ position: number; domain: string; title: string; url: string }>;
  totalResults: number;
  checkedAt: Date;
}> {
  const searchResults = await scrapeGoogleResults(keyword, locale);

  // Find our position
  let ourPosition: number | null = null;
  let ourUrl: string | null = null;
  
  for (const result of searchResults) {
    if (result.domain.includes(OUR_DOMAIN) || result.domain.includes("spectaeducation")) {
      ourPosition = result.position;
      ourUrl = result.url;
      break;
    }
  }

  // Find competitor positions
  const competitorPositions: Array<{ domain: string; position: number; url: string }> = [];
  for (const result of searchResults) {
    for (const compDomain of COMPETITOR_DOMAINS) {
      if (result.domain.includes(compDomain.replace("www.", ""))) {
        competitorPositions.push({
          domain: compDomain,
          position: result.position,
          url: result.url,
        });
        break;
      }
    }
  }

  return {
    keyword,
    locale,
    ourPosition,
    ourUrl,
    competitorPositions,
    topResults: searchResults.slice(0, 10).map(r => ({
      position: r.position,
      domain: r.domain,
      title: r.title,
      url: r.url,
    })),
    totalResults: searchResults.length,
    checkedAt: new Date(),
  };
}

// ==========================================
// Run full ranking check for all keywords
// ==========================================
export async function runRankingCheck(): Promise<{
  keywordsChecked: number;
  ourRankings: Array<{ keyword: string; position: number | null; change: number | null }>;
  competitorRankings: Array<{ competitor: string; avgPosition: number; keywords: number }>;
  opportunities: string[];
  errors: number;
}> {
  const db = await getDb();
  let keywordsChecked = 0;
  let errors = 0;
  const allResults: Array<ReturnType<typeof checkKeywordRanking> extends Promise<infer T> ? T : never> = [];
  const ourRankings: Array<{ keyword: string; position: number | null; change: number | null }> = [];

  // Check each keyword with a delay to avoid rate limiting
  for (const kw of TARGET_KEYWORDS) {
    try {
      const result = await checkKeywordRanking(kw.keyword, kw.locale);
      allResults.push(result);
      keywordsChecked++;

      ourRankings.push({
        keyword: kw.keyword,
        position: result.ourPosition,
        change: null, // Will be calculated from historical data
      });

      // Add delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    } catch (err) {
      console.error(`[RankTracker] Error checking "${kw.keyword}":`, err);
      errors++;
    }
  }

  // Aggregate competitor rankings
  const competitorMap: Record<string, { totalPosition: number; count: number }> = {};
  for (const result of allResults) {
    for (const comp of result.competitorPositions) {
      if (!competitorMap[comp.domain]) {
        competitorMap[comp.domain] = { totalPosition: 0, count: 0 };
      }
      competitorMap[comp.domain].totalPosition += comp.position;
      competitorMap[comp.domain].count++;
    }
  }

  const competitorRankings = Object.entries(competitorMap).map(([competitor, data]) => ({
    competitor,
    avgPosition: Math.round(data.totalPosition / data.count * 10) / 10,
    keywords: data.count,
  })).sort((a, b) => a.avgPosition - b.avgPosition);

  // Store results in database
  if (db) {
    try {
      // Store in a JSON column in agent_logs for now
      const { createAgentRunLog, updateAgentRunLog } = await import("./db");
      const log = await createAgentRunLog({
        agentName: "ranking_tracker",
        status: "success",
        startedAt: new Date(),
      });
      if (log) {
        await updateAgentRunLog(log.id, {
          status: "success",
          completedAt: new Date(),
          summary: `Checked ${keywordsChecked} keywords. SpecTa found in top 30 for ${ourRankings.filter(r => r.position !== null).length} keywords.`,
          itemsProcessed: keywordsChecked,
          itemsSucceeded: ourRankings.filter(r => r.position !== null).length,
          itemsFailed: errors,
          details: JSON.stringify({
            ourRankings,
            competitorRankings,
            fullResults: allResults,
            checkedAt: new Date().toISOString(),
          }),
        });
      }
    } catch (err) {
      console.error("[RankTracker] Error saving results:", err);
    }
  }

  // Generate opportunities using AI
  let opportunities: string[] = [];
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an SEO strategist for SpecTa Education (spectaeducation.com), an Indonesian education consultancy. Analyze ranking data and suggest opportunities."
        },
        {
          role: "user",
          content: `Based on today's Google ranking check:

Our Rankings:
${ourRankings.map(r => `- "${r.keyword}": Position ${r.position || "Not found in top 30"}`).join("\n")}

Competitor Rankings:
${competitorRankings.map(r => `- ${r.competitor}: Avg position ${r.avgPosition} (found for ${r.keywords} keywords)`).join("\n")}

Suggest 5 specific, actionable SEO opportunities for SpecTa Education. Return as JSON array of strings.`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "seo_opportunities",
          strict: true,
          schema: {
            type: "object",
            properties: {
              opportunities: { type: "array", items: { type: "string" } },
            },
            required: ["opportunities"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (content && typeof content === "string") {
      const parsed = JSON.parse(content);
      opportunities = parsed.opportunities || [];
    }
  } catch (err) {
    console.error("[RankTracker] Error generating opportunities:", err);
  }

  return {
    keywordsChecked,
    ourRankings,
    competitorRankings,
    opportunities,
    errors,
  };
}

// ==========================================
// Get latest ranking data for dashboard
// ==========================================
export async function getLatestRankingData(): Promise<{
  lastChecked: Date | null;
  ourRankings: Array<{ keyword: string; position: number | null; change: number | null }>;
  competitorRankings: Array<{ competitor: string; avgPosition: number; keywords: number }>;
  opportunities: string[];
  keywordsTracked: number;
  keywordsInTop10: number;
  keywordsInTop30: number;
}> {
  const db = await getDb();
  if (!db) return {
    lastChecked: null,
    ourRankings: [],
    competitorRankings: [],
    opportunities: [],
    keywordsTracked: TARGET_KEYWORDS.length,
    keywordsInTop10: 0,
    keywordsInTop30: 0,
  };

  try {
    const { agentRunLogs } = await import("../drizzle/schema");
    const [latestLog] = await db
      .select()
      .from(agentRunLogs)
      .where(eq(agentRunLogs.agentName, "ranking_tracker"))
      .orderBy(desc(agentRunLogs.startedAt))
      .limit(1);

    if (!latestLog || !latestLog.details) {
      return {
        lastChecked: null,
        ourRankings: [],
        competitorRankings: [],
        opportunities: [],
        keywordsTracked: TARGET_KEYWORDS.length,
        keywordsInTop10: 0,
        keywordsInTop30: 0,
      };
    }

    const details = JSON.parse(latestLog.details as string);
    const ourRankings = details.ourRankings || [];
    const competitorRankings = details.competitorRankings || [];

    return {
      lastChecked: latestLog.startedAt,
      ourRankings,
      competitorRankings,
      opportunities: details.opportunities || [],
      keywordsTracked: TARGET_KEYWORDS.length,
      keywordsInTop10: ourRankings.filter((r: any) => r.position && r.position <= 10).length,
      keywordsInTop30: ourRankings.filter((r: any) => r.position !== null).length,
    };
  } catch (err) {
    console.error("[RankTracker] Error getting latest data:", err);
    return {
      lastChecked: null,
      ourRankings: [],
      competitorRankings: [],
      opportunities: [],
      keywordsTracked: TARGET_KEYWORDS.length,
      keywordsInTop10: 0,
      keywordsInTop30: 0,
    };
  }
}
