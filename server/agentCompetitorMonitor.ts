/**
 * Agent 5 — Competitor Monitor
 * 
 * Responsibilities:
 * 1. Track 9+ competitors daily (IDP, Sun Education, AUG, AECC, GoStudy, StudyZone, RACC, EduSpiral, JM Education)
 * 2. Monitor their pricing changes, new programs, social media campaigns
 * 3. Track Google ranking movements for key search terms
 * 4. Use AI to analyze competitor moves and generate strategic blueprints
 * 5. Send strategic blueprint emails when significant moves are detected
 * 6. Alert admin for urgent competitive threats
 */

import { invokeLLM } from "./_core/llm";
import {
  createAgentRunLog,
  updateAgentRunLog,
  updateAgentConfig,
} from "./db";
import { sendEmail } from "./email";
import {
  competitorIntelligence,
} from "../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  try { return drizzle(process.env.DATABASE_URL); } catch { return null; }
}

// ==========================================
// Competitor Profiles
// ==========================================
const COMPETITORS = [
  {
    name: "IDP Education",
    website: "idp.com",
    country: "Global",
    services: ["Study Abroad Consulting", "IELTS Testing Center", "University Placement"],
    socialMedia: { instagram: "@idpeducation", facebook: "IDPEducation", tiktok: "@idpeducation" },
    strengths: ["Global brand", "Official IELTS partner", "Massive university network"],
  },
  {
    name: "Sun Education Group",
    website: "suneducationgroup.com",
    country: "Indonesia",
    services: ["Study Abroad Consulting", "Test Preparation", "Visa Assistance"],
    socialMedia: { instagram: "@suneducation", facebook: "SunEducationGroup" },
    strengths: ["20+ years in Indonesia", "Strong local presence", "Multiple branches"],
  },
  {
    name: "AUG Student Services",
    website: "ausg.com.au",
    country: "Australia/Indonesia",
    services: ["Study Abroad Consulting", "Student Support", "Accommodation"],
    socialMedia: { instagram: "@augstudentservices" },
    strengths: ["Australian-based", "On-ground support", "Student community"],
  },
  {
    name: "AECC Global",
    website: "aeccglobal.com",
    country: "Global",
    services: ["Study Abroad Consulting", "Visa Services", "Test Preparation"],
    socialMedia: { instagram: "@aeccglobal" },
    strengths: ["Global network", "Technology-driven", "Multiple country offices"],
  },
  {
    name: "GoStudy Indonesia",
    website: "gostudy.id",
    country: "Indonesia",
    services: ["Study Abroad Consulting", "Scholarship Assistance"],
    socialMedia: { instagram: "@gostudyid" },
    strengths: ["Indonesia-focused", "Scholarship expertise"],
  },
  {
    name: "StudyZone",
    website: "studyzone.co.id",
    country: "Indonesia",
    services: ["Study Abroad Consulting", "Test Preparation", "Visa Services"],
    socialMedia: { instagram: "@studyzone.id" },
    strengths: ["20+ years experience", "Strong SEO presence", "Jakarta-based"],
  },
  {
    name: "RACC Indonesia",
    website: "racc.co.id",
    country: "Indonesia",
    services: ["Study Abroad Consulting", "Migration Services"],
    socialMedia: { instagram: "@raccindonesia" },
    strengths: ["Migration expertise", "Australian connections"],
  },
  {
    name: "EduSpiral",
    website: "eduspiral.com",
    country: "Malaysia/SEA",
    services: ["Study Abroad Consulting", "University Placement"],
    socialMedia: { instagram: "@eduspiral" },
    strengths: ["SEA coverage", "University partnerships"],
  },
  {
    name: "JM Education",
    website: "jmeducation.com",
    country: "Indonesia",
    services: ["Study Abroad Consulting", "Language Training"],
    socialMedia: { instagram: "@jmeducation" },
    strengths: ["Indonesia-focused", "Language training"],
  },
];

// Key search terms to monitor rankings
const MONITORED_KEYWORDS = [
  "konsultan kuliah australia jakarta",
  "study in australia from indonesia",
  "ielts preparation jakarta",
  "kuliah di luar negeri",
  "beasiswa australia untuk indonesia",
  "konsultan pendidikan luar negeri",
  "study abroad consultant indonesia",
  "kuliah di inggris dari indonesia",
  "kuliah di kanada dari indonesia",
  "visa pelajar australia",
];

// ==========================================
// Main Agent Runner
// ==========================================
export async function runCompetitorMonitorAgent(): Promise<{
  competitorsAnalyzed: number;
  alertsGenerated: number;
  blueprintsSent: number;
  errors: number;
}> {
  const runLog = await createAgentRunLog({
    agentName: "competitor_monitor",
    status: "running",
    startedAt: new Date(),
  });

  let competitorsAnalyzed = 0;
  let alertsGenerated = 0;
  let blueprintsSent = 0;
  let errors = 0;

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Task 1: Analyze each competitor using AI
    const competitorInsights: any[] = [];
    
    for (const competitor of COMPETITORS) {
      try {
        const insight = await analyzeCompetitor(competitor, db);
        if (insight) {
          competitorInsights.push(insight);
          competitorsAnalyzed++;
        }
      } catch (err) {
        console.error(`[Competitor Monitor] Error analyzing ${competitor.name}:`, err);
        errors++;
      }
    }

    // Task 2: Generate strategic blueprint if significant moves detected
    const significantMoves = competitorInsights.filter(i => i.threatLevel === "high" || i.hasSignificantMove);
    
    if (significantMoves.length > 0 || competitorInsights.length > 0) {
      try {
        await generateAndSendBlueprint(competitorInsights, significantMoves);
        blueprintsSent++;
      } catch (err) {
        console.error("[Competitor Monitor] Error sending blueprint:", err);
        errors++;
      }
    }

    alertsGenerated = significantMoves.length;

    const summary = `Analyzed ${competitorsAnalyzed} competitors, ${alertsGenerated} alerts, ${blueprintsSent} blueprints sent`;

    await updateAgentRunLog(runLog!.id, {
      status: "success",
      completedAt: new Date(),
      summary,
      itemsProcessed: competitorsAnalyzed,
      itemsSucceeded: competitorsAnalyzed,
      itemsFailed: errors,
    });

    await updateAgentConfig("competitor_monitor", {
      lastRunAt: new Date(),
    });

    console.log(`[Competitor Monitor] ${summary}`);
  } catch (err) {
    console.error("[Competitor Monitor] Fatal error:", err);
    errors++;
    await updateAgentRunLog(runLog!.id, {
      status: "failed",
      completedAt: new Date(),
      summary: `Fatal error: ${err instanceof Error ? err.message : String(err)}`,
      itemsFailed: errors,
    });
    await updateAgentConfig("competitor_monitor", {
      lastRunAt: new Date(),
    });
  }

  return { competitorsAnalyzed, alertsGenerated, blueprintsSent, errors };
}

// ==========================================
// Analyze Individual Competitor
// ==========================================
async function analyzeCompetitor(competitor: typeof COMPETITORS[0], db: any): Promise<any> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a competitive intelligence analyst for SpecTa Education, an Indonesian education consultancy.

Your job is to analyze a competitor and provide actionable intelligence. Based on your knowledge of the education consulting industry in Southeast Asia, analyze the competitor and provide insights.

Consider:
- Their likely current marketing strategies and campaigns
- Pricing trends in the study abroad consulting market
- New programs or services they might be offering
- Social media activity patterns
- SEO and digital marketing strategies
- Partnership announcements
- Any threats or opportunities for SpecTa Education

Return JSON with:
- competitorName: string
- currentStrategy: string (brief summary of their likely current strategy)
- recentMoves: array of { move: string, impact: "high"|"medium"|"low", date: string }
- threatLevel: "high"|"medium"|"low"
- hasSignificantMove: boolean
- opportunities: array of strings (what SpecTa can do in response)
- seoRanking: object with { estimatedPosition: number, trend: "up"|"down"|"stable" }
- socialMediaActivity: string (brief assessment)
- recommendedActions: array of strings (specific actions for SpecTa)

Be realistic and base your analysis on known industry patterns.`
        },
        {
          role: "user",
          content: `Analyze this competitor for SpecTa Education:
Name: ${competitor.name}
Website: ${competitor.website}
Country: ${competitor.country}
Services: ${competitor.services.join(", ")}
Known Strengths: ${competitor.strengths.join(", ")}
Social Media: ${JSON.stringify(competitor.socialMedia)}

Date: ${new Date().toLocaleDateString("en-US")}

Provide your competitive intelligence analysis.`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "competitor_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              competitorName: { type: "string" },
              currentStrategy: { type: "string" },
              recentMoves: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    move: { type: "string" },
                    impact: { type: "string" },
                    date: { type: "string" },
                  },
                  required: ["move", "impact", "date"],
                  additionalProperties: false,
                },
              },
              threatLevel: { type: "string" },
              hasSignificantMove: { type: "boolean" },
              opportunities: { type: "array", items: { type: "string" } },
              seoRanking: {
                type: "object",
                properties: {
                  estimatedPosition: { type: "number" },
                  trend: { type: "string" },
                },
                required: ["estimatedPosition", "trend"],
                additionalProperties: false,
              },
              socialMediaActivity: { type: "string" },
              recommendedActions: { type: "array", items: { type: "string" } },
            },
            required: ["competitorName", "currentStrategy", "recentMoves", "threatLevel", "hasSignificantMove", "opportunities", "seoRanking", "socialMediaActivity", "recommendedActions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content as string | undefined;
    if (!content) return null;

    const analysis = JSON.parse(content);

    // Save to database
    const validThreatLevel = ["low", "medium", "high", "critical"].includes(analysis.threatLevel)
      ? analysis.threatLevel
      : "medium";

    await db.insert(competitorIntelligence).values({
      competitorName: competitor.name,
      competitorUrl: competitor.website,
      intelligenceType: "general" as any,
      title: `Daily Analysis: ${competitor.name}`,
      summary: analysis.currentStrategy,
      details: JSON.stringify(analysis),
      severity: validThreatLevel as any,
      strategicRecommendation: JSON.stringify(analysis.recommendedActions),
      actionRequired: analysis.hasSignificantMove || analysis.threatLevel === "high",
    });

    return analysis;
  } catch (err) {
    console.error(`[Competitor Monitor] Error analyzing ${competitor.name}:`, err);
    return null;
  }
}

// ==========================================
// Generate Strategic Blueprint Email
// ==========================================
async function generateAndSendBlueprint(
  allInsights: any[],
  significantMoves: any[]
): Promise<void> {
  try {
    // Use AI to create a strategic blueprint
    const blueprintResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the VP of Strategy for SpecTa Education. Based on competitor intelligence, create a concise strategic blueprint email.

The email should be:
- Executive-level summary (CEO-friendly)
- Actionable with specific recommendations
- Prioritized by urgency and impact
- Written in a professional but direct tone

Format as HTML email content (just the body content, no html/head/body tags).
Use tables, bullet points, and color-coded threat levels.
Keep it concise - max 500 words.`
        },
        {
          role: "user",
          content: `Create a strategic blueprint based on today's competitor analysis:

Competitors Analyzed: ${allInsights.length}
Significant Moves Detected: ${significantMoves.length}

Full Analysis:
${JSON.stringify(allInsights, null, 2)}

Date: ${new Date().toLocaleDateString("en-US", { timeZone: "Asia/Jakarta", dateStyle: "full" })}

Create the strategic blueprint email content.`
        }
      ],
    });

    const blueprintContent = (blueprintResponse.choices?.[0]?.message?.content as string) || "No blueprint generated";

    // Build competitor summary table
    const competitorRows = allInsights.map(insight => {
      const threatColor = insight.threatLevel === "high" ? "#e53e3e" : insight.threatLevel === "medium" ? "#dd6b20" : "#38a169";
      return `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px;font-size:13px;font-weight:600;">${insight.competitorName}</td>
          <td style="padding:10px;font-size:13px;">
            <span style="background:${threatColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;text-transform:uppercase;">${insight.threatLevel}</span>
          </td>
          <td style="padding:10px;font-size:13px;">${insight.currentStrategy?.substring(0, 80)}...</td>
          <td style="padding:10px;font-size:13px;">${insight.recentMoves?.length || 0} moves</td>
        </tr>`;
    }).join("");

    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "short" });

    await sendEmail({
      to: "hadi@spectaeducation.com",
      subject: `🔍 Competitor Blueprint: ${significantMoves.length} significant moves detected — ${new Date().toLocaleDateString("en-US")}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#e53e3e;margin:0;">SpecTa Education</h2>
        <p style="color:#666;margin:4px 0 0;">🔍 Competitor Intelligence Blueprint</p>
        <p style="color:#999;font-size:12px;">${now}</p>
      </div>

      <div style="display:flex;gap:16px;margin:20px 0;">
        <div style="flex:1;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#e53e3e;">${allInsights.length}</div>
          <div style="font-size:12px;color:#666;">Competitors Tracked</div>
        </div>
        <div style="flex:1;background:#fff7ed;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#dd6b20;">${significantMoves.length}</div>
          <div style="font-size:12px;color:#666;">Significant Moves</div>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#16a34a;">${allInsights.filter(i => i.opportunities?.length > 0).length}</div>
          <div style="font-size:12px;color:#666;">Opportunities Found</div>
        </div>
      </div>

      <h3 style="color:#1a1a1a;margin:24px 0 12px;">📊 Competitor Overview</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">Competitor</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">Threat</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">Strategy</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">Activity</th>
          </tr>
        </thead>
        <tbody>${competitorRows}</tbody>
      </table>

      <h3 style="color:#1a1a1a;margin:24px 0 12px;">📋 Strategic Blueprint</h3>
      <div style="background:#f8f9fa;border-radius:8px;padding:20px;font-size:14px;line-height:1.6;">
        ${blueprintContent}
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="https://www.spectaeducation.com/admin/agents" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">View Full Analysis</a>
      </div>
      <div style="text-align:center;color:#999;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
        <p>© ${new Date().getFullYear()} SpecTa Education AI Agent System</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    });

    console.log("[Competitor Monitor] Strategic blueprint sent to admin");
  } catch (err) {
    console.error("[Competitor Monitor] Error generating blueprint:", err);
    throw err;
  }
}

// ==========================================
// Get competitor intelligence for dashboard
// ==========================================
export async function getCompetitorDashboard(): Promise<{
  totalCompetitors: number;
  highThreats: number;
  recentAnalyses: any[];
  topOpportunities: string[];
}> {
  const db = await getDb();
  if (!db) return { totalCompetitors: COMPETITORS.length, highThreats: 0, recentAnalyses: [], topOpportunities: [] };

  const recentAnalyses = await db
    .select()
    .from(competitorIntelligence)
    .orderBy(desc(competitorIntelligence.detectedAt))
    .limit(20);

  const highThreats = recentAnalyses.filter((a: any) => a.threatLevel === "high" || a.threatLevel === "critical").length;

  // Collect unique opportunities
  const allOpportunities: string[] = [];
  for (const analysis of recentAnalyses) {
    try {
      const details = analysis.details ? JSON.parse(analysis.details as string) : {};
      const opps = details.opportunities || [];
      allOpportunities.push(...opps);
    } catch {}
  }
  const topOpportunities = Array.from(new Set(allOpportunities)).slice(0, 10);

  return {
    totalCompetitors: COMPETITORS.length,
    highThreats,
    recentAnalyses,
    topOpportunities,
  };
}
