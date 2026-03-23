/**
 * AI GEO Monitor Agent
 *
 * Tracks SpecTa Education's visibility in AI-generated answers.
 * Simulates queries to AI engines using our built-in LLM and checks
 * if SpecTa Education is mentioned as a recommended service.
 *
 * This agent runs daily and stores results in the gm_recommendations table
 * with type "GEO_MONITOR" so the AI GM can include them in the executive report.
 */

import { invokeLLM } from "./_core/llm";
import { getDb, withDbRetry } from "./db";
import { gmRecommendations } from "../drizzle/schema";

// The queries that potential SpecTa Education students would ask AI engines
const GEO_TEST_QUERIES = [
  "Apa konsultan study abroad terbaik di Indonesia?",
  "Di mana kursus IELTS terbaik di Jakarta?",
  "Rekomendasi agen kuliah luar negeri terpercaya di Indonesia",
  "Konsultan pendidikan luar negeri terbaik Jakarta",
  "Best IELTS preparation course in Jakarta Indonesia",
  "Best study abroad consultant in Indonesia",
  "How to study in Australia from Indonesia consultant",
  "Rekomendasi konsultan kuliah di Australia dari Indonesia",
];

// Keywords that indicate SpecTa Education is mentioned
const SPECTA_KEYWORDS = [
  "specta education",
  "spectaeducation",
  "specta",
  "pt specta",
];

interface GeoQueryResult {
  query: string;
  mentioned: boolean;
  mentionContext: string | null;
  competitors: string[];
  fullResponse: string;
}

interface GeoMonitorReport {
  queriesRun: number;
  mentionCount: number;
  mentionRate: number; // 0-100%
  results: GeoQueryResult[];
  topCompetitors: { name: string; count: number }[];
  recommendations: string[];
  timestamp: string;
}

/**
 * Run a single GEO query and check if SpecTa Education is mentioned
 */
async function runGeoQuery(query: string): Promise<GeoQueryResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant answering questions about studying abroad from Indonesia. 
          Answer naturally and honestly based on your knowledge. 
          If you know of specific consultants or services, mention them by name.
          Keep answers concise (2-3 paragraphs max).`,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    const fullResponse = typeof rawContent === "string" ? rawContent : "";
    const lowerResponse = fullResponse.toLowerCase();

    // Check if SpecTa Education is mentioned
    const mentioned = SPECTA_KEYWORDS.some((kw) =>
      lowerResponse.includes(kw.toLowerCase())
    );

    // Extract mention context (surrounding text)
    let mentionContext: string | null = null;
    if (mentioned) {
      const mentionIdx = SPECTA_KEYWORDS.reduce((idx, kw) => {
        const found = lowerResponse.indexOf(kw.toLowerCase());
        return found !== -1 && (idx === -1 || found < idx) ? found : idx;
      }, -1);

      if (mentionIdx !== -1) {
        const start = Math.max(0, mentionIdx - 50);
        const end = Math.min(fullResponse.length, mentionIdx + 100);
        mentionContext = "..." + fullResponse.slice(start, end) + "...";
      }
    }

    // Extract competitor mentions (common Indonesian study abroad consultants)
    const knownCompetitors = [
      "IDP Education",
      "EF Education",
      "British Council",
      "IALF",
      "Edlink",
      "SUN Education",
      "Hotcourses",
      "SI-UK",
      "Dunia Edukasi",
      "Global Edukasi",
      "Konsultan Pendidikan",
    ];

    const competitors = knownCompetitors.filter((c) =>
      lowerResponse.includes(c.toLowerCase())
    );

    return {
      query,
      mentioned,
      mentionContext,
      competitors,
      fullResponse: fullResponse.slice(0, 500), // Store first 500 chars
    };
  } catch (error) {
    console.error(`[GeoMonitor] Error running query "${query}":`, error);
    return {
      query,
      mentioned: false,
      mentionContext: null,
      competitors: [],
      fullResponse: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Generate strategic GEO improvement recommendations using LLM
 */
async function generateGeoRecommendations(
  report: Omit<GeoMonitorReport, "recommendations">
): Promise<string[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a GEO (Generative Engine Optimization) expert for SpecTa Education, 
          an Indonesian study abroad consultancy. Analyze the AI visibility data and provide 
          3-5 specific, actionable recommendations to improve SpecTa Education's mentions 
          in AI-generated answers. Be specific and practical.`,
        },
        {
          role: "user",
          content: `GEO Monitor Report for SpecTa Education:
          
- Queries tested: ${report.queriesRun}
- Times mentioned: ${report.mentionCount}/${report.queriesRun} (${report.mentionRate.toFixed(0)}%)
- Competitors appearing in answers: ${report.topCompetitors.map((c) => c.name).join(", ") || "None detected"}

Sample queries where SpecTa was NOT mentioned:
${report.results
  .filter((r) => !r.mentioned)
  .slice(0, 3)
  .map((r) => `- "${r.query}"`)
  .join("\n")}

Based on this data, what specific actions should SpecTa Education take to improve their GEO visibility?
Focus on: content strategy, third-party mentions, structured data, and brand authority building.
Return as a JSON array of 3-5 recommendation strings.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "geo_recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleanContent);
    return parsed.recommendations || [];
  } catch (error) {
    console.error("[GeoMonitor] Error generating recommendations:", error);
    return [
      "Publish more authoritative content about IELTS preparation and study abroad on spectaeducation.com/blog",
      "Get SpecTa Education mentioned on high-authority Indonesian education websites and forums",
      "Create a Wikipedia entry or Wikidata entity for SpecTa Education",
      "Submit SpecTa Education to Indonesian business directories and education portals",
    ];
  }
}

/**
 * Main GEO Monitor run function
 */
export async function runGeoMonitor(): Promise<GeoMonitorReport> {
  console.log("[GeoMonitor] Starting AI GEO visibility check...");

  // Run all queries
  const results: GeoQueryResult[] = [];
  for (const query of GEO_TEST_QUERIES) {
    const result = await runGeoQuery(query);
    results.push(result);
    console.log(
      `[GeoMonitor] Query: "${query.slice(0, 40)}..." → Mentioned: ${result.mentioned}`
    );
    // Small delay between queries
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Calculate stats
  const mentionCount = results.filter((r) => r.mentioned).length;
  const mentionRate = (mentionCount / results.length) * 100;

  // Aggregate competitor mentions
  const competitorCounts: Record<string, number> = {};
  results.forEach((r) => {
    r.competitors.forEach((c) => {
      competitorCounts[c] = (competitorCounts[c] || 0) + 1;
    });
  });
  const topCompetitors = Object.entries(competitorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const partialReport = {
    queriesRun: results.length,
    mentionCount,
    mentionRate,
    results,
    topCompetitors,
    timestamp: new Date().toISOString(),
  };

  // Generate recommendations
  const recommendations = await generateGeoRecommendations(partialReport);

  const report: GeoMonitorReport = {
    ...partialReport,
    recommendations,
  };

  // Store results in the database as a GM recommendation
  try {
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    const priority = mentionRate < 25 ? "high" : mentionRate < 50 ? "medium" : "low";
    const title =
      mentionRate < 25
        ? `🚨 GEO Alert: SpecTa Education mentioned in only ${mentionRate.toFixed(0)}% of AI queries`
        : mentionRate < 50
        ? `⚠️ GEO Update: SpecTa Education mentioned in ${mentionRate.toFixed(0)}% of AI queries`
        : `✅ GEO Progress: SpecTa Education mentioned in ${mentionRate.toFixed(0)}% of AI queries`;
    const today = new Date().toISOString().slice(0, 10);
    const competitorSummary = topCompetitors.length > 0
      ? `Competitors appearing in AI answers: ${topCompetitors.map((c) => `${c.name} (${c.count}x)`).join(", ")}.`
      : "No major competitors detected in AI answers.";
    const queriesWithout = results.filter((r) => !r.mentioned).map((r) => r.query).slice(0, 3).join(" | ");
    await withDbRetry(() =>
      db.insert(gmRecommendations).values({
        reportDate: today,
        category: "seo_improvement",
        priority,
        title,
        description: `AI GEO Monitor ran ${results.length} test queries. SpecTa Education mentioned ${mentionCount}/${results.length} times (${mentionRate.toFixed(0)}%). ${competitorSummary} Missed queries: ${queriesWithout}`,
        rationale: `Recommendations: ${recommendations.join(" | ")}`,
        suggestedAction: recommendations.slice(0, 2).join(" | "),
        dataSource: "GEO Monitor",
        status: "pending",
      })
    );
    console.log(`[GeoMonitor] Results stored. Mention rate: ${mentionRate.toFixed(0)}%`);
  } catch (error) {
     console.error("[GeoMonitor] Error storing results:", error);
  }
  return report;
}

/**
 * Get the latest GEO monitor report from the database
 */
export async function getLatestGeoReport() {
  try {
    const db = await getDb();
    if (!db) return null;
    const { eq, desc } = await import("drizzle-orm");
    const rows = await withDbRetry(() =>
      db
        .select()
        .from(gmRecommendations)
        .where(eq(gmRecommendations.category, "seo_improvement"))
        .orderBy(desc(gmRecommendations.createdAt))
        .limit(1)
    ) as Array<typeof gmRecommendations.$inferSelect>;
    return rows[0] || null;
  } catch (error) {
    console.error("[GeoMonitor] Error fetching latest report:", error);
    return null;
  }
}
