/**
 * AI General Manager Agent
 *
 * Runs every 4 hours to:
 * 1. Evaluate health of all AI agents (healthy / warning / critical / missed)
 * 2. Auto-heal missed agents by triggering them
 * 3. Collect cross-agent intelligence (competitors, SEO, leads, partnerships)
 * 4. Generate LLM-powered strategic recommendations for Hadi
 * 5. At 08:00 WIB: compile and send the daily Executive Report
 *
 * The GM never takes irreversible actions (no emails to clients, no external posts).
 * It only observes, evaluates, self-heals internal agents, and advises Hadi.
 */

import { invokeLLM } from "./_core/llm";
import { sendEmail } from "./email";
import { getDb, withDbRetry, getAllAgentConfigs, getAgentRunLogs } from "./db";
import {
  gmHealthChecks,
  gmRecommendations,
  gmExecutiveReports,
  agentRunLogs,
  seoScoreHistory,
  leads,
  applications,
  universityPartnerships,
  universityReplyQueue,
  competitorIntelligence,
} from "../drizzle/schema";
import { desc, gte, eq, and, count, sql } from "drizzle-orm";
import { triggerAgent } from "./agentScheduler";

// ============================================================
// Types
// ============================================================
interface AgentHealthStatus {
  agentName: string;
  displayName: string;
  status: "healthy" | "warning" | "critical" | "missed" | "recovered";
  lastRunAt: Date | null;
  expectedRunAt: Date | null;
  wasAutoHealed: boolean;
  errorSummary: string | null;
  outputSummary: string | null;
  healthScore: number;
}

interface OperationalMetrics {
  newLeads24h: number;
  totalLeads: number;
  newApplications24h: number;
  totalApplications: number;
  pendingUniversityReplies: number;
  activePartnerships: number;
  seoScore: number;
  competitorAlerts: number;
  agentHealthAvg: number;
}

interface GmCycleResult {
  cycleLabel: string;
  agentStatuses: AgentHealthStatus[];
  metrics: OperationalMetrics;
  recommendations: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    rationale: string;
    suggestedAction: string;
    dataSource: string;
  }>;
  autoHealedAgents: string[];
  isReportDay: boolean;
}

// ============================================================
// Agent expected run intervals (in minutes)
// ============================================================
const AGENT_INTERVALS: Record<string, number> = {
  crm_distributor: 60,
  seo_builder: 480,
  central_reporter: 1440,
  lead_hunter: 120,
  competitor_monitor: 1440,
  university_scout: 1440,
  aptitude_nurture: 1440,
  re_engagement: 1440,
  content_amplifier: 480,
  seo_optimizer: 10080,
};

// Agents the GM is allowed to auto-heal (trigger if missed)
const AUTO_HEAL_ELIGIBLE = [
  "crm_distributor",
  "lead_hunter",
  "content_amplifier",
];

// ============================================================
// Health Evaluation
// ============================================================
async function evaluateAgentHealth(db: any): Promise<AgentHealthStatus[]> {
  const configs = await getAllAgentConfigs();
  const now = new Date();
  const statuses: AgentHealthStatus[] = [];

  for (const config of configs) {
    if (config.agentName === "ai_general_manager") continue; // Skip self

    const intervalMs = (AGENT_INTERVALS[config.agentName] || 1440) * 60 * 1000;
    const gracePeriodMs = Math.min(intervalMs * 0.25, 60 * 60 * 1000); // 25% grace or 1h max
    const expectedRunAt = config.lastRunAt
      ? new Date(new Date(config.lastRunAt).getTime() + intervalMs)
      : new Date(now.getTime() - intervalMs); // Never ran = overdue

    const overdueMs = now.getTime() - expectedRunAt.getTime();
    const isOverdue = overdueMs > gracePeriodMs;
    const isVeryOverdue = overdueMs > intervalMs * 1.5;

    // Get last run log for error info
    const recentLogs = await withDbRetry(
      () =>
        db
          .select()
          .from(agentRunLogs)
          .where(eq(agentRunLogs.agentName, config.agentName))
          .orderBy(desc(agentRunLogs.createdAt))
          .limit(1),
      `GM: get last log for ${config.agentName}`
    ).catch(() => []) as any[];

    const lastLog = recentLogs[0];
    const hasRecentError = lastLog?.status === "error";

    let status: AgentHealthStatus["status"];
    let healthScore: number;

    if (!config.isActive) {
      status = "healthy"; // Disabled agents are not a concern
      healthScore = 100;
    } else if (!config.lastRunAt) {
      status = "missed";
      healthScore = 0;
    } else if (isVeryOverdue && hasRecentError) {
      status = "critical";
      healthScore = 10;
    } else if (isVeryOverdue) {
      status = "critical";
      healthScore = 20;
    } else if (isOverdue && hasRecentError) {
      status = "warning";
      healthScore = 40;
    } else if (isOverdue) {
      status = "warning";
      healthScore = 60;
    } else if (hasRecentError) {
      status = "warning";
      healthScore = 70;
    } else {
      status = "healthy";
      healthScore = 100;
    }

    statuses.push({
      agentName: config.agentName,
      displayName: config.displayName,
      status,
      lastRunAt: config.lastRunAt ? new Date(config.lastRunAt) : null,
      expectedRunAt,
      wasAutoHealed: false,
      errorSummary: hasRecentError ? lastLog?.errorMessage?.slice(0, 200) || "Unknown error" : null,
      outputSummary: lastLog?.outputSummary?.slice(0, 300) || null,
      healthScore,
    });
  }

  return statuses;
}

// ============================================================
// Auto-Healing
// ============================================================
async function autoHealAgents(statuses: AgentHealthStatus[]): Promise<string[]> {
  const healed: string[] = [];

  for (const s of statuses) {
    if (!AUTO_HEAL_ELIGIBLE.includes(s.agentName)) continue;
    if (s.status !== "missed" && s.status !== "critical") continue;

    try {
      console.log(`[GM] Auto-healing agent: ${s.displayName}`);
      await triggerAgent(s.agentName);
      s.wasAutoHealed = true;
      s.status = "recovered";
      healed.push(s.displayName);
    } catch (err) {
      console.error(`[GM] Failed to auto-heal ${s.agentName}:`, err);
    }
  }

  return healed;
}

// ============================================================
// Collect Operational Metrics
// ============================================================
async function collectMetrics(db: any): Promise<OperationalMetrics> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    newLeadsResult,
    totalLeadsResult,
    newAppsResult,
    totalAppsResult,
    pendingRepliesResult,
    activePartnershipsResult,
    latestSeoResult,
    competitorAlertsResult,
  ] = await Promise.allSettled([
    withDbRetry(() =>
      db.select({ cnt: count() }).from(leads).where(gte(leads.createdAt, yesterday))
    ).then((r: any) => r[0]?.cnt || 0),
    withDbRetry(() =>
      db.select({ cnt: count() }).from(leads)
    ).then((r: any) => r[0]?.cnt || 0),
    withDbRetry(() =>
      db.select({ cnt: count() }).from(applications).where(gte(applications.createdAt, yesterday))
    ).then((r: any) => r[0]?.cnt || 0),
    withDbRetry(() =>
      db.select({ cnt: count() }).from(applications)
    ).then((r: any) => r[0]?.cnt || 0),
    withDbRetry(() =>
      db.select({ cnt: count() }).from(universityReplyQueue)
        .where(eq(universityReplyQueue.approvalStatus, "pending_review"))
    ).then((r: any) => r[0]?.cnt || 0),
    withDbRetry(() =>
      db.select({ cnt: count() }).from(universityPartnerships)
        .where(eq(universityPartnerships.outreachStatus, "partnered"))
    ).then((r: any) => r[0]?.cnt || 0),
    withDbRetry(() =>
      db.select({ overallScore: seoScoreHistory.overallScore })
        .from(seoScoreHistory)
        .orderBy(desc(seoScoreHistory.createdAt))
        .limit(1)
    ).then((r: any) => r[0]?.overallScore || 0),
    withDbRetry(() =>
      db.select({ cnt: count() }).from(competitorIntelligence)
        .where(gte(competitorIntelligence.detectedAt, yesterday))
    ).then((r: any) => r[0]?.cnt || 0),
  ]);

  return {
    newLeads24h: newLeadsResult.status === "fulfilled" ? newLeadsResult.value : 0,
    totalLeads: totalLeadsResult.status === "fulfilled" ? totalLeadsResult.value : 0,
    newApplications24h: newAppsResult.status === "fulfilled" ? newAppsResult.value : 0,
    totalApplications: totalAppsResult.status === "fulfilled" ? totalAppsResult.value : 0,
    pendingUniversityReplies: pendingRepliesResult.status === "fulfilled" ? pendingRepliesResult.value : 0,
    activePartnerships: activePartnershipsResult.status === "fulfilled" ? activePartnershipsResult.value : 0,
    seoScore: latestSeoResult.status === "fulfilled" ? latestSeoResult.value : 0,
    competitorAlerts: competitorAlertsResult.status === "fulfilled" ? competitorAlertsResult.value : 0,
    agentHealthAvg: 0, // Filled after health check
  };
}

// ============================================================
// LLM-Powered Strategic Recommendations
// ============================================================
async function generateStrategicRecommendations(
  statuses: AgentHealthStatus[],
  metrics: OperationalMetrics,
  db: any
): Promise<GmCycleResult["recommendations"]> {
  // Gather recent intelligence data
  const [recentCompetitors, recentSeoHistory, pendingReplies] = await Promise.allSettled([
    withDbRetry(() =>
      db.select({
        competitorName: competitorIntelligence.competitorName,
        intelligenceType: competitorIntelligence.intelligenceType,
        title: competitorIntelligence.title,
        severity: competitorIntelligence.severity,
      })
        .from(competitorIntelligence)
        .orderBy(desc(competitorIntelligence.detectedAt))
        .limit(10)
    ).catch(() => []),
    withDbRetry(() =>
      db.select()
        .from(seoScoreHistory)
        .orderBy(desc(seoScoreHistory.createdAt))
        .limit(3)
    ).catch(() => []),
    withDbRetry(() =>
      db.select({
        universityName: universityReplyQueue.universityName,
        classification: universityReplyQueue.classification,
        urgency: universityReplyQueue.urgency,
        receivedAt: universityReplyQueue.receivedAt,
      })
        .from(universityReplyQueue)
        .where(eq(universityReplyQueue.approvalStatus, "pending_review"))
        .limit(5)
    ).catch(() => []),
  ]);

  const competitorData: any[] = recentCompetitors.status === "fulfilled" ? (recentCompetitors.value as any[]) : [];
  const seoData: any[] = recentSeoHistory.status === "fulfilled" ? (recentSeoHistory.value as any[]) : [];
  const repliesData: any[] = pendingReplies.status === "fulfilled" ? (pendingReplies.value as any[]) : [];

  const criticalAgents = statuses.filter(s => s.status === "critical" || s.status === "missed");
  const warningAgents = statuses.filter(s => s.status === "warning");

  const prompt = `You are the AI General Manager of SpecTa Education, an Indonesian study abroad consultancy. 
You have just completed your 4-hour operational review cycle. Based on the data below, generate 5-8 strategic recommendations for the CEO (Hadi).

=== OPERATIONAL DATA ===
Agent Health:
${statuses.map(s => `- ${s.displayName}: ${s.status.toUpperCase()} (score: ${s.healthScore}/100)${s.errorSummary ? ` | Error: ${s.errorSummary}` : ""}`).join("\n")}

Key Metrics (last 24h):
- New Leads: ${metrics.newLeads24h} | Total Leads: ${metrics.totalLeads}
- New Applications: ${metrics.newApplications24h} | Total Applications: ${metrics.totalApplications}
- Pending University Replies: ${metrics.pendingUniversityReplies}
- Active University Partnerships: ${metrics.activePartnerships}
- SEO Health Score: ${metrics.seoScore}/100
- New Competitor Intelligence: ${metrics.competitorAlerts} alerts

Recent Competitor Moves:
${competitorData.length > 0 ? competitorData.map((c: any) => `- ${c.competitorName}: ${c.changeType} — ${c.description} (${c.severity})`).join("\n") : "No new competitor intelligence in last 24h"}

SEO Trend:
${seoData.length > 0 ? seoData.map((s: any) => `- Score: ${s.overallScore}/100 | Issues: ${s.issuesFound} | Fixed: ${s.issuesFixed}`).join("\n") : "No recent SEO data"}

Pending University Replies Requiring Attention:
${repliesData.length > 0 ? repliesData.map((r: any) => `- ${r.universityName}: ${r.classification} (urgency: ${r.urgency})`).join("\n") : "None pending"}

Critical/Missed Agents: ${criticalAgents.length > 0 ? criticalAgents.map(a => a.displayName).join(", ") : "None"}
Warning Agents: ${warningAgents.length > 0 ? warningAgents.map(a => a.displayName).join(", ") : "None"}

=== INSTRUCTIONS ===
Generate 5-8 strategic recommendations. Each must be:
1. Specific and actionable (not generic advice)
2. Based on the actual data above
3. Categorized correctly
4. Prioritized by urgency

Return ONLY valid JSON array:
[
  {
    "category": "competitor_response" | "seo_improvement" | "lead_generation" | "university_partnership" | "student_engagement" | "operational_fix" | "strategic_opportunity",
    "priority": "urgent" | "high" | "medium" | "low",
    "title": "Short action title (max 80 chars)",
    "description": "Detailed explanation of what needs to be done and why (2-3 sentences)",
    "rationale": "What data triggered this recommendation",
    "suggestedAction": "Specific next step Hadi should take today",
    "dataSource": "Which agent/data source this came from"
  }
]`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an AI General Manager. Return only valid JSON arrays, no markdown, no explanation." },
        { role: "user", content: prompt },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    // Strip markdown code fences if present (LLM sometimes wraps JSON in ```json ... ```)
    let content = typeof rawContent === "string" ? rawContent.trim() : "[]";
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    if (!content || content === "") content = "[]";
    // Handle both array and {recommendations: [...]} formats
    let parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.recommendations && Array.isArray(parsed.recommendations)) return parsed.recommendations;
    // Try to find any array in the object
    const firstArray = Object.values(parsed).find(v => Array.isArray(v));
    return (firstArray as any[]) || [];
  } catch (err) {
    console.error("[GM] Failed to generate recommendations:", err);
    return [];
  }
}

// ============================================================
// Save Health Checks to DB
// ============================================================
async function saveHealthChecks(
  db: any,
  cycleLabel: string,
  statuses: AgentHealthStatus[]
): Promise<void> {
  for (const s of statuses) {
    await withDbRetry(
      () =>
        db.insert(gmHealthChecks).values({
          cycleLabel,
          agentName: s.agentName,
          agentDisplayName: s.displayName,
          status: s.status,
          lastRunAt: s.lastRunAt,
          expectedRunAt: s.expectedRunAt,
          wasAutoHealed: s.wasAutoHealed,
          errorSummary: s.errorSummary,
          outputSummary: s.outputSummary,
          healthScore: s.healthScore,
        }),
      `GM: save health check for ${s.agentName}`
    ).catch(err => console.error(`[GM] Failed to save health check for ${s.agentName}:`, err));
  }
}

// ============================================================
// Save Recommendations to DB
// ============================================================
async function saveRecommendations(
  db: any,
  reportDate: string,
  recommendations: GmCycleResult["recommendations"]
): Promise<void> {
  for (const rec of recommendations) {
    await withDbRetry(
      () =>
        db.insert(gmRecommendations).values({
          reportDate,
          category: rec.category as any,
          priority: rec.priority as any,
          title: rec.title.slice(0, 499),
          description: rec.description,
          rationale: rec.rationale,
          suggestedAction: rec.suggestedAction,
          dataSource: rec.dataSource,
        }),
      `GM: save recommendation`
    ).catch(err => console.error("[GM] Failed to save recommendation:", err));
  }
}

// ============================================================
// Main GM Cycle (runs every 4 hours)
// ============================================================
export async function runGeneralManagerCycle(): Promise<GmCycleResult> {
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const nowWib = new Date(now.getTime() + wibOffset);
  const wibHour = nowWib.getUTCHours();
  const todayWib = nowWib.toISOString().split("T")[0];
  const cycleLabel = `${todayWib} ${String(wibHour).padStart(2, "0")}:00 WIB`;

  console.log(`[GM] Starting 4-hour cycle: ${cycleLabel}`);

  const db = await getDb();
  if (!db) throw new Error("[GM] Database not available");

  // 1. Evaluate all agent health
  const agentStatuses = await evaluateAgentHealth(db);

  // 2. Auto-heal eligible missed agents
  const autoHealedAgents = await autoHealAgents(agentStatuses);

  // 3. Collect operational metrics
  const metrics = await collectMetrics(db);
  metrics.agentHealthAvg = Math.round(
    agentStatuses.reduce((sum, s) => sum + s.healthScore, 0) / Math.max(agentStatuses.length, 1)
  );

  // 4. Generate strategic recommendations
  const recommendations = await generateStrategicRecommendations(agentStatuses, metrics, db);

  // 5. Save health checks and recommendations to DB
  await saveHealthChecks(db, cycleLabel, agentStatuses);
  await saveRecommendations(db, todayWib, recommendations);

  const isReportDay = wibHour >= 7 && wibHour < 9; // 8 AM window

  console.log(`[GM] Cycle complete: ${agentStatuses.length} agents checked, ${autoHealedAgents.length} healed, ${recommendations.length} recommendations`);

  return {
    cycleLabel,
    agentStatuses,
    metrics,
    recommendations,
    autoHealedAgents,
    isReportDay,
  };
}

// ============================================================
// Daily Executive Report (sent at 8 AM WIB)
// ============================================================
export async function generateAndSendExecutiveReport(cycleResult: GmCycleResult): Promise<void> {
  const { agentStatuses, metrics, recommendations, autoHealedAgents, cycleLabel } = cycleResult;
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const nowWib = new Date(now.getTime() + wibOffset);
  const todayWib = nowWib.toISOString().split("T")[0];
  const db = await getDb();
  if (!db) return;

  // Check if already sent today
  const existing = await withDbRetry(
    () =>
      db.select().from(gmExecutiveReports)
        .where(eq(gmExecutiveReports.reportDate, todayWib))
        .limit(1),
    "GM: check existing report"
  ).catch(() => []);

  if (existing.length > 0 && existing[0].status === "sent") {
    console.log(`[GM] Executive report already sent today (${todayWib}), skipping`);
    return;
  }

  // Generate executive summary via LLM
  const criticalCount = agentStatuses.filter(s => s.status === "critical" || s.status === "missed").length;
  const healthyCount = agentStatuses.filter(s => s.status === "healthy" || s.status === "recovered").length;
  const urgentRecs = recommendations.filter(r => r.priority === "urgent" || r.priority === "high");

  const summaryPrompt = `You are the AI General Manager of SpecTa Education. Write a concise executive summary for the daily 8 AM report to the CEO (Hadi).

Operations Status:
- ${healthyCount}/${agentStatuses.length} agents healthy
- ${criticalCount} critical/missed agents
- ${autoHealedAgents.length} agents auto-healed: ${autoHealedAgents.join(", ") || "none"}
- New leads (24h): ${metrics.newLeads24h} | Applications: ${metrics.newApplications24h}
- SEO Score: ${metrics.seoScore}/100
- Pending university replies: ${metrics.pendingUniversityReplies}
- Competitor alerts: ${metrics.competitorAlerts}
- Top urgent recommendations: ${urgentRecs.slice(0, 3).map(r => r.title).join("; ") || "none"}

Write 3-4 sentences. Be direct, professional, and highlight what needs Hadi's attention today. Address Hadi by name.`;

  let executiveSummary = "";
  try {
    const summaryResp = await invokeLLM({
      messages: [
        { role: "system", content: "You are an AI General Manager writing a concise executive summary. Be direct and professional." },
        { role: "user", content: summaryPrompt },
      ],
    });
    const rawSummary = summaryResp.choices[0]?.message?.content;
    executiveSummary = typeof rawSummary === "string" ? rawSummary : "";
  } catch {
    executiveSummary = `Good morning Hadi. ${healthyCount}/${agentStatuses.length} agents are operating normally. ${criticalCount > 0 ? `${criticalCount} agents need attention.` : "All systems are stable."} ${urgentRecs.length > 0 ? `${urgentRecs.length} high-priority recommendations require your review.` : ""}`;
  }

  // Build HTML email
  const priorityColor: Record<string, string> = {
    urgent: "#dc2626",
    high: "#ea580c",
    medium: "#2563eb",
    low: "#16a34a",
  };
  const statusColor: Record<string, string> = {
    healthy: "#16a34a",
    recovered: "#16a34a",
    warning: "#d97706",
    critical: "#dc2626",
    missed: "#dc2626",
  };
  const categoryIcon: Record<string, string> = {
    competitor_response: "⚔️",
    seo_improvement: "📈",
    lead_generation: "🎯",
    university_partnership: "🎓",
    student_engagement: "👥",
    operational_fix: "🔧",
    strategic_opportunity: "💡",
  };

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SpecTa AI GM — Daily Executive Report</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:680px;margin:0 auto;background:#ffffff;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px 40px;text-align:center;">
    <div style="font-size:13px;color:#fca5a5;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">AI General Manager</div>
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Daily Executive Report</h1>
    <div style="color:#fca5a5;font-size:14px;margin-top:8px;">${cycleLabel.replace(" WIB", "")} WIB &nbsp;·&nbsp; SpecTa Education</div>
  </div>

  <!-- Executive Summary -->
  <div style="padding:32px 40px;background:#fff7ed;border-bottom:1px solid #fed7aa;">
    <div style="font-size:11px;font-weight:700;color:#ea580c;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">📋 Executive Summary</div>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#1e293b;">${executiveSummary}</p>
  </div>

  <!-- Operations Dashboard -->
  <div style="padding:32px 40px;">
    <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:20px;">🤖 Agent Operations Status</div>
    <div style="display:grid;gap:8px;">
      ${agentStatuses.map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:4px solid ${statusColor[s.status] || "#94a3b8"};">
        <div>
          <div style="font-weight:600;font-size:14px;color:#1e293b;">${s.displayName}</div>
          ${s.errorSummary ? `<div style="font-size:12px;color:#dc2626;margin-top:2px;">⚠ ${s.errorSummary.slice(0, 100)}</div>` : ""}
          ${s.wasAutoHealed ? `<div style="font-size:12px;color:#16a34a;margin-top:2px;">✓ Auto-healed by GM</div>` : ""}
        </div>
        <div style="text-align:right;">
          <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${statusColor[s.status]}22;color:${statusColor[s.status]};text-transform:uppercase;">${s.status}</span>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Score: ${s.healthScore}/100</div>
        </div>
      </div>`).join("")}
    </div>
  </div>

  <!-- Key Metrics -->
  <div style="padding:0 40px 32px;">
    <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:20px;">📊 Key Metrics (Last 24 Hours)</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
      <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#16a34a;">${metrics.newLeads24h}</div>
        <div style="font-size:12px;color:#166534;margin-top:4px;">New Leads</div>
        <div style="font-size:11px;color:#86efac;">${metrics.totalLeads} total</div>
      </div>
      <div style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#2563eb;">${metrics.newApplications24h}</div>
        <div style="font-size:12px;color:#1e40af;margin-top:4px;">New Applications</div>
        <div style="font-size:11px;color:#93c5fd;">${metrics.totalApplications} total</div>
      </div>
      <div style="background:#fef3c7;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#d97706;">${metrics.seoScore}</div>
        <div style="font-size:12px;color:#92400e;margin-top:4px;">SEO Score</div>
        <div style="font-size:11px;color:#fcd34d;">out of 100</div>
      </div>
      <div style="background:#fdf2f8;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#9333ea;">${metrics.pendingUniversityReplies}</div>
        <div style="font-size:12px;color:#6b21a8;margin-top:4px;">Pending Replies</div>
        <div style="font-size:11px;color:#d8b4fe;">need approval</div>
      </div>
      <div style="background:#fff1f2;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#e11d48;">${metrics.competitorAlerts}</div>
        <div style="font-size:12px;color:#9f1239;margin-top:4px;">Competitor Alerts</div>
        <div style="font-size:11px;color:#fda4af;">new today</div>
      </div>
      <div style="background:#f0f9ff;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#0284c7;">${metrics.agentHealthAvg}</div>
        <div style="font-size:12px;color:#075985;margin-top:4px;">Avg Health Score</div>
        <div style="font-size:11px;color:#7dd3fc;">across all agents</div>
      </div>
    </div>
  </div>

  <!-- Strategic Recommendations -->
  <div style="padding:0 40px 32px;">
    <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:20px;">💡 GM Strategic Recommendations</div>
    ${recommendations.length === 0 ? `<p style="color:#64748b;font-size:14px;">No recommendations at this time. All systems operating normally.</p>` :
      recommendations
        .sort((a, b) => {
          const order = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (order[a.priority as keyof typeof order] || 2) - (order[b.priority as keyof typeof order] || 2);
        })
        .map((rec, i) => `
      <div style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <div style="background:${priorityColor[rec.priority] || "#64748b"}11;padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;">${categoryIcon[rec.category] || "📌"}</span>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;color:#1e293b;">${rec.title}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${rec.category.replace(/_/g, " ").toUpperCase()} &nbsp;·&nbsp; Source: ${rec.dataSource}</div>
          </div>
          <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${priorityColor[rec.priority] || "#64748b"};color:#fff;text-transform:uppercase;">${rec.priority}</span>
        </div>
        <div style="padding:14px 18px;">
          <p style="margin:0 0 8px;font-size:14px;color:#334155;line-height:1.6;">${rec.description}</p>
          <div style="background:#f8fafc;border-radius:6px;padding:10px 14px;margin-top:8px;">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Suggested Action</div>
            <div style="font-size:13px;color:#1e293b;">${rec.suggestedAction}</div>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-top:8px;font-style:italic;">Why: ${rec.rationale}</div>
        </div>
      </div>`).join("")}
  </div>

  <!-- Auto-Healed Notice -->
  ${autoHealedAgents.length > 0 ? `
  <div style="padding:0 40px 32px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;">
      <div style="font-weight:700;color:#166534;margin-bottom:6px;">✅ GM Auto-Healing Actions</div>
      <p style="margin:0;font-size:13px;color:#166534;">The GM automatically restarted the following agents that were missed or critical: <strong>${autoHealedAgents.join(", ")}</strong>. No action required from you.</p>
    </div>
  </div>` : ""}

  <!-- Footer -->
  <div style="background:#1e293b;padding:24px 40px;text-align:center;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">SpecTa Education AI General Manager &nbsp;·&nbsp; Next report: Tomorrow 08:00 WIB</p>
    <p style="margin:8px 0 0;color:#475569;font-size:11px;">This report was autonomously generated. All recommendations require your approval before action.</p>
  </div>

</div>
</body>
</html>`;

  // Save to DB
  const operationsReport = agentStatuses
    .map(s => `${s.displayName}: ${s.status} (${s.healthScore}/100)${s.errorSummary ? ` — ${s.errorSummary}` : ""}`)
    .join("\n");

  let reportId: number | null = null;
  try {
    const insertResult = await withDbRetry(
      () =>
        db.insert(gmExecutiveReports).values({
          reportDate: todayWib,
          totalAgents: agentStatuses.length,
          healthyAgents: agentStatuses.filter(s => s.status === "healthy" || s.status === "recovered").length,
          warningAgents: agentStatuses.filter(s => s.status === "warning").length,
          criticalAgents: agentStatuses.filter(s => s.status === "critical" || s.status === "missed").length,
          autoHealedCount: autoHealedAgents.length,
          metricsSnapshot: JSON.stringify(metrics),
          executiveSummary,
          operationsReport,
          recommendationsJson: JSON.stringify(recommendations),
          htmlContent,
          sentTo: "hadi@spectaeducation.com",
          status: "generated",
        }),
      "GM: save executive report"
    );
    reportId = (insertResult as any).insertId;
  } catch (err) {
    console.error("[GM] Failed to save executive report to DB:", err);
  }

  // Send email
  try {
    await sendEmail({
      to: "hadi@spectaeducation.com",
      subject: `🤖 GM Daily Report — ${todayWib} | ${agentStatuses.filter(s => s.status === "healthy" || s.status === "recovered").length}/${agentStatuses.length} Agents Healthy | ${recommendations.filter(r => r.priority === "urgent" || r.priority === "high").length} High-Priority Actions`,
      html: htmlContent,
    });

    if (reportId) {
      await withDbRetry(
        () =>
          db.update(gmExecutiveReports)
            .set({ status: "sent", sentAt: new Date() })
            .where(eq(gmExecutiveReports.id, reportId!)),
        "GM: mark report sent"
      ).catch(() => {});
    }

    console.log(`[GM] Executive report sent to hadi@spectaeducation.com`);
  } catch (err) {
    console.error("[GM] Failed to send executive report email:", err);
    if (reportId) {
      await withDbRetry(
        () =>
          db.update(gmExecutiveReports)
            .set({ status: "failed" })
            .where(eq(gmExecutiveReports.id, reportId!)),
        "GM: mark report failed"
      ).catch(() => {});
    }
  }
}

// ============================================================
// DB helper functions for tRPC endpoints
// ============================================================
export async function getLatestGmReport() {
  const db = await getDb();
  if (!db) return null;
  const rows = await withDbRetry(
    () =>
      db.select().from(gmExecutiveReports)
        .orderBy(desc(gmExecutiveReports.createdAt))
        .limit(1),
    "GM: get latest report"
  ).catch(() => []);
  return rows[0] || null;
}

export async function getGmReports(limit = 7) {
  const db = await getDb();
  if (!db) return [];
  return withDbRetry(
    () =>
      db.select().from(gmExecutiveReports)
        .orderBy(desc(gmExecutiveReports.createdAt))
        .limit(limit),
    "GM: get reports"
  ).catch(() => []);
}

export async function getGmRecommendations(date?: string) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(gmRecommendations)
    .orderBy(desc(gmRecommendations.createdAt))
    .limit(50);
  return withDbRetry(() => query, "GM: get recommendations").catch(() => []);
}

export async function acknowledgeGmRecommendation(id: number) {
  const db = await getDb();
  if (!db) return;
  await withDbRetry(
    () =>
      db.update(gmRecommendations)
        .set({ status: "acknowledged", acknowledgedAt: new Date() })
        .where(eq(gmRecommendations.id, id)),
    "GM: acknowledge recommendation"
  );
}

export async function updateGmRecommendationStatus(id: number, status: "acknowledged" | "in_progress" | "done" | "dismissed") {
  const db = await getDb();
  if (!db) return;
  await withDbRetry(
    () =>
      db.update(gmRecommendations)
        .set({ status, acknowledgedAt: status === "acknowledged" ? new Date() : undefined })
        .where(eq(gmRecommendations.id, id)),
    "GM: update recommendation status"
  );
}

export async function getGmHealthHistory(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return withDbRetry(
    () =>
      db.select().from(gmHealthChecks)
        .orderBy(desc(gmHealthChecks.createdAt))
        .limit(limit),
    "GM: get health history"
  ).catch(() => []);
}
