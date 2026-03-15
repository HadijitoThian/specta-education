/**
 * Competitor Website Change Detector — Feature 3
 * 
 * Scrapes 9+ competitor websites daily to detect:
 * - New programs or services added
 * - Pricing changes
 * - New pages or content
 * - Promotions and campaigns
 * - Website structure changes
 * 
 * Uses content hashing to detect changes between scans.
 * AI analyzes changes and generates strategic recommendations.
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, desc, and, sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import * as crypto from "crypto";

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  try { return drizzle(process.env.DATABASE_URL); } catch { return null; }
}

// ==========================================
// Competitor Websites to Monitor
// ==========================================
export const COMPETITOR_SITES = [
  {
    name: "IDP Education",
    urls: [
      "https://www.idp.com/indonesia/",
      "https://www.idp.com/indonesia/study-in-australia/",
      "https://www.idp.com/indonesia/ielts/",
    ],
    domain: "idp.com",
  },
  {
    name: "Sun Education Group",
    urls: [
      "https://www.suneducationgroup.com/",
      "https://www.suneducationgroup.com/study-abroad/",
    ],
    domain: "suneducationgroup.com",
  },
  {
    name: "AUG Student Services",
    urls: [
      "https://www.ausg.com.au/",
      "https://www.ausg.com.au/study-in-australia/",
    ],
    domain: "ausg.com.au",
  },
  {
    name: "AECC Global",
    urls: [
      "https://www.aeccglobal.com/",
      "https://www.aeccglobal.com/indonesia/",
    ],
    domain: "aeccglobal.com",
  },
  {
    name: "GoStudy Indonesia",
    urls: [
      "https://www.gostudy.id/",
    ],
    domain: "gostudy.id",
  },
  {
    name: "StudyZone",
    urls: [
      "https://www.studyzone.co.id/",
    ],
    domain: "studyzone.co.id",
  },
  {
    name: "RACC Indonesia",
    urls: [
      "https://www.racc.co.id/",
    ],
    domain: "racc.co.id",
  },
  {
    name: "EduSpiral",
    urls: [
      "https://eduspiral.com/",
    ],
    domain: "eduspiral.com",
  },
  {
    name: "JM Education",
    urls: [
      "https://www.jmeducation.com/",
    ],
    domain: "jmeducation.com",
  },
];

// ==========================================
// Scrape a single URL and extract key content
// ==========================================
async function scrapeUrl(url: string): Promise<{
  success: boolean;
  html: string;
  textContent: string;
  contentHash: string;
  title: string;
  metaDescription: string;
  headings: string[];
  links: string[];
  statusCode: number;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        html: "",
        textContent: "",
        contentHash: "",
        title: "",
        metaDescription: "",
        headings: [],
        links: [],
        statusCode: response.status,
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Extract meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*?)["']/i);
    const metaDescription = metaMatch ? metaMatch[1].trim() : "";

    // Extract headings (h1-h3)
    const headings: string[] = [];
    const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
    let hMatch;
    while ((hMatch = headingRegex.exec(html)) !== null) {
      const text = hMatch[1].replace(/<[^>]+>/g, "").trim();
      if (text && text.length > 2) headings.push(text);
    }

    // Extract text content (strip HTML tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 5000); // Limit to 5000 chars for hashing

    // Extract internal links
    const links: string[] = [];
    const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
    let lMatch;
    while ((lMatch = linkRegex.exec(html)) !== null) {
      links.push(lMatch[1]);
    }

    // Generate content hash for change detection
    const contentHash = crypto
      .createHash("sha256")
      .update(textContent + title + metaDescription + headings.join("|"))
      .digest("hex")
      .substring(0, 16);

    return {
      success: true,
      html,
      textContent,
      contentHash,
      title,
      metaDescription,
      headings: headings.slice(0, 20),
      links: links.slice(0, 50),
      statusCode: response.status,
    };
  } catch (err: any) {
    return {
      success: false,
      html: "",
      textContent: "",
      contentHash: "",
      title: "",
      metaDescription: "",
      headings: [],
      links: [],
      statusCode: 0,
      error: err.message || "Unknown error",
    };
  }
}

// ==========================================
// Detect changes between current and previous scan
// ==========================================
function detectChanges(
  current: { title: string; metaDescription: string; headings: string[]; textContent: string },
  previous: { title: string; metaDescription: string; headings: string[]; textContent: string }
): {
  hasChanges: boolean;
  titleChanged: boolean;
  metaChanged: boolean;
  newHeadings: string[];
  removedHeadings: string[];
  contentSimilarity: number;
} {
  const titleChanged = current.title !== previous.title;
  const metaChanged = current.metaDescription !== previous.metaDescription;

  const prevHeadingSet = new Set(previous.headings);
  const currHeadingSet = new Set(current.headings);
  const newHeadings = current.headings.filter(h => !prevHeadingSet.has(h));
  const removedHeadings = previous.headings.filter(h => !currHeadingSet.has(h));

  // Simple content similarity (Jaccard-like)
  const prevWordsArr = previous.textContent.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const currWordsArr = current.textContent.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const prevWords = new Set(prevWordsArr);
  const currWords = new Set(currWordsArr);
  const intersection = Array.from(prevWords).filter(w => currWords.has(w));
  const union = new Set(Array.from(prevWords).concat(Array.from(currWords)));
  const contentSimilarity = union.size > 0 ? Math.round((intersection.length / union.size) * 100) : 100;

  const hasChanges = titleChanged || metaChanged || newHeadings.length > 0 || removedHeadings.length > 0 || contentSimilarity < 90;

  return {
    hasChanges,
    titleChanged,
    metaChanged,
    newHeadings,
    removedHeadings,
    contentSimilarity,
  };
}

// ==========================================
// Run competitor scan for all sites
// ==========================================
export async function runCompetitorScan(): Promise<{
  competitorsScanned: number;
  changesDetected: number;
  significantChanges: Array<{
    competitor: string;
    url: string;
    changeType: string;
    details: string;
  }>;
  errors: number;
}> {
  const db = await getDb();
  let competitorsScanned = 0;
  let changesDetected = 0;
  let errors = 0;
  const significantChanges: Array<{
    competitor: string;
    url: string;
    changeType: string;
    details: string;
  }> = [];

  const allScanResults: any[] = [];

  for (const competitor of COMPETITOR_SITES) {
    try {
      for (const url of competitor.urls) {
        try {
          const scrapeResult = await scrapeUrl(url);
          
          if (!scrapeResult.success) {
            console.warn(`[CompetitorScraper] Failed to scrape ${url}: ${scrapeResult.error}`);
            errors++;
            continue;
          }

          // Get previous scan data from database
          let previousData: any = null;
          if (db) {
            try {
              const { competitorProfiles } = await import("../drizzle/schema");
              const [profile] = await db
                .select()
                .from(competitorProfiles)
                .where(eq(competitorProfiles.websiteUrl, competitor.domain))
                .limit(1);

              if (profile && profile.lastSnapshotHash) {
                // Check if content hash changed
                if (profile.lastSnapshotHash === scrapeResult.contentHash) {
                  // No changes
                  continue;
                }
                // Content changed — load previous data for comparison
                previousData = profile.description ? JSON.parse(profile.description) : null;
              }

              // Update the profile with new scan data
              if (profile) {
                await db.update(competitorProfiles)
                  .set({
                    lastScannedAt: new Date(),
                    lastSnapshotHash: scrapeResult.contentHash,
                    description: JSON.stringify({
                      title: scrapeResult.title,
                      metaDescription: scrapeResult.metaDescription,
                      headings: scrapeResult.headings,
                      textContent: scrapeResult.textContent.substring(0, 2000),
                      scannedAt: new Date().toISOString(),
                    }),
                  })
                  .where(eq(competitorProfiles.id, profile.id));
              } else {
                // Create new profile
                await db.insert(competitorProfiles).values({
                  name: competitor.name,
                  websiteUrl: competitor.domain,
                  lastScannedAt: new Date(),
                  lastSnapshotHash: scrapeResult.contentHash,
                  description: JSON.stringify({
                    title: scrapeResult.title,
                    metaDescription: scrapeResult.metaDescription,
                    headings: scrapeResult.headings,
                    textContent: scrapeResult.textContent.substring(0, 2000),
                    scannedAt: new Date().toISOString(),
                  }),
                });
              }
            } catch (dbErr) {
              console.error(`[CompetitorScraper] DB error for ${competitor.name}:`, dbErr);
            }
          }

          // If we have previous data, detect changes
          if (previousData) {
            const changes = detectChanges(
              {
                title: scrapeResult.title,
                metaDescription: scrapeResult.metaDescription,
                headings: scrapeResult.headings,
                textContent: scrapeResult.textContent,
              },
              previousData
            );

            if (changes.hasChanges) {
              changesDetected++;
              const changeDetails: string[] = [];
              if (changes.titleChanged) changeDetails.push(`Title changed: "${previousData.title}" → "${scrapeResult.title}"`);
              if (changes.metaChanged) changeDetails.push(`Meta description updated`);
              if (changes.newHeadings.length > 0) changeDetails.push(`New sections: ${changes.newHeadings.join(", ")}`);
              if (changes.removedHeadings.length > 0) changeDetails.push(`Removed sections: ${changes.removedHeadings.join(", ")}`);
              if (changes.contentSimilarity < 90) changeDetails.push(`Content similarity: ${changes.contentSimilarity}% (significant rewrite)`);

              significantChanges.push({
                competitor: competitor.name,
                url,
                changeType: changes.contentSimilarity < 70 ? "major_update" : "minor_update",
                details: changeDetails.join("; "),
              });

              // Store in competitor_intelligence table
              if (db) {
                try {
                  const { competitorIntelligence } = await import("../drizzle/schema");
                  await db.insert(competitorIntelligence).values({
                    competitorName: competitor.name,
                    competitorUrl: url,
                    intelligenceType: "website_change" as any,
                    title: `Website Change: ${competitor.name}`,
                    summary: changeDetails.join("; "),
                    details: JSON.stringify({
                      changes,
                      currentTitle: scrapeResult.title,
                      currentMeta: scrapeResult.metaDescription,
                      currentHeadings: scrapeResult.headings,
                      previousTitle: previousData.title,
                      previousMeta: previousData.metaDescription,
                      url,
                    }),
                    severity: changes.contentSimilarity < 70 ? "high" as any : "medium" as any,
                    actionRequired: changes.contentSimilarity < 70,
                  });
                } catch (dbErr) {
                  console.error(`[CompetitorScraper] Error saving intelligence:`, dbErr);
                }
              }
            }
          }

          allScanResults.push({
            competitor: competitor.name,
            url,
            title: scrapeResult.title,
            headings: scrapeResult.headings.slice(0, 5),
            contentHash: scrapeResult.contentHash,
            hasChanges: previousData ? true : false,
          });

          // Delay between requests
          await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
        } catch (urlErr) {
          console.error(`[CompetitorScraper] Error scraping ${url}:`, urlErr);
          errors++;
        }
      }
      competitorsScanned++;
    } catch (compErr) {
      console.error(`[CompetitorScraper] Error processing ${competitor.name}:`, compErr);
      errors++;
    }
  }

  // If significant changes detected, use AI to analyze
  if (significantChanges.length > 0) {
    try {
      const aiResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a competitive intelligence analyst. Analyze website changes detected on competitor sites and provide strategic recommendations for SpecTa Education."
          },
          {
            role: "user",
            content: `The following changes were detected on competitor websites today:

${significantChanges.map(c => `- ${c.competitor} (${c.url}): ${c.details}`).join("\n")}

What do these changes likely mean? What should SpecTa Education do in response? Keep it concise (3-5 bullet points).`
          }
        ],
      });

      const aiAnalysis = aiResponse.choices?.[0]?.message?.content;
      if (aiAnalysis && typeof aiAnalysis === "string") {
        // Store AI analysis
        if (db) {
          const { createAgentRunLog, updateAgentRunLog } = await import("./db");
          const log = await createAgentRunLog({
            agentName: "competitor_scraper",
            status: "success",
            startedAt: new Date(),
          });
          if (log) {
            await updateAgentRunLog(log.id, {
              status: "success",
              completedAt: new Date(),
              summary: `Scanned ${competitorsScanned} competitors, detected ${changesDetected} changes. ${significantChanges.length} significant.`,
              itemsProcessed: competitorsScanned,
              itemsSucceeded: changesDetected,
              itemsFailed: errors,
              details: JSON.stringify({
                significantChanges,
                allScanResults,
                aiAnalysis,
                scannedAt: new Date().toISOString(),
              }),
            });
          }
        }
      }
    } catch (aiErr) {
      console.error("[CompetitorScraper] AI analysis error:", aiErr);
    }
  } else {
    // Log even if no changes
    if (db) {
      try {
        const { createAgentRunLog, updateAgentRunLog } = await import("./db");
        const log = await createAgentRunLog({
          agentName: "competitor_scraper",
          status: "success",
          startedAt: new Date(),
        });
        if (log) {
          await updateAgentRunLog(log.id, {
            status: "success",
            completedAt: new Date(),
            summary: `Scanned ${competitorsScanned} competitors, no significant changes detected.`,
            itemsProcessed: competitorsScanned,
            itemsSucceeded: 0,
            itemsFailed: errors,
            details: JSON.stringify({
              allScanResults,
              scannedAt: new Date().toISOString(),
            }),
          });
        }
      } catch (logErr) {
        console.error("[CompetitorScraper] Error logging:", logErr);
      }
    }
  }

  return {
    competitorsScanned,
    changesDetected,
    significantChanges,
    errors,
  };
}

// ==========================================
// Get latest competitor scan data for dashboard
// ==========================================
export async function getCompetitorScanData(): Promise<{
  lastScanned: Date | null;
  competitorsMonitored: number;
  recentChanges: Array<{
    competitor: string;
    url: string;
    changeType: string;
    details: string;
    detectedAt: Date;
  }>;
  scanHistory: Array<{
    date: Date;
    competitorsScanned: number;
    changesDetected: number;
  }>;
}> {
  const db = await getDb();
  if (!db) return {
    lastScanned: null,
    competitorsMonitored: COMPETITOR_SITES.length,
    recentChanges: [],
    scanHistory: [],
  };

  try {
    const { competitorIntelligence, agentRunLogs } = await import("../drizzle/schema");

    // Get recent website changes
    const recentChanges = await db
      .select()
      .from(competitorIntelligence)
      .where(eq(competitorIntelligence.intelligenceType, "website_change"))
      .orderBy(desc(competitorIntelligence.detectedAt))
      .limit(20);

    // Get scan history
    const scanLogs = await db
      .select()
      .from(agentRunLogs)
      .where(eq(agentRunLogs.agentName, "competitor_scraper"))
      .orderBy(desc(agentRunLogs.startedAt))
      .limit(10);

    return {
      lastScanned: scanLogs.length > 0 ? scanLogs[0].startedAt : null,
      competitorsMonitored: COMPETITOR_SITES.length,
      recentChanges: recentChanges.map((c: any) => ({
        competitor: c.competitorName,
        url: c.competitorUrl || "",
        changeType: c.severity || "medium",
        details: c.summary || "",
        detectedAt: c.detectedAt,
      })),
      scanHistory: scanLogs.map((l: any) => ({
        date: l.startedAt,
        competitorsScanned: l.itemsProcessed || 0,
        changesDetected: l.itemsSucceeded || 0,
      })),
    };
  } catch (err) {
    console.error("[CompetitorScraper] Error getting scan data:", err);
    return {
      lastScanned: null,
      competitorsMonitored: COMPETITOR_SITES.length,
      recentChanges: [],
      scanHistory: [],
    };
  }
}
