/**
 * Agent 8 — Central Reporter
 * 
 * Responsibilities:
 * 1. Compile daily report from all active agents
 * 2. Aggregate KPIs: leads, conversions, SEO, follow-ups
 * 3. Send formatted daily briefing email at 9AM WIB
 * 4. Store report in database for dashboard viewing
 */

import {
  getAllLeads,
  getAllScholarshipLeads,
  getAllApplications,
  getAllLeadAssignments,
  getAllSeoContentEntries,
  getAllRecentAgentRuns,
  getAllAgentConfigs,
  getAllCounselors,
  createDailyReport,
  getDailyReportByDate,
  updateDailyReport,
  createAgentRunLog,
  updateAgentRunLog,
  updateAgentConfig,
  getStaleAssignments,
  getDueFollowUpActions,
  getAnalyticsKPIs,
  listPublishedBlogPosts,
} from "./db";
import { sendEmail } from "./email";

const ADMIN_EMAIL = "hadi@spectaeducation.com";

/**
 * Main agent execution function — generates and sends daily report
 */
export async function runCentralReporterAgent(): Promise<{
  reportGenerated: boolean;
  emailSent: boolean;
  errors: number;
}> {
  const startTime = Date.now();
  let reportGenerated = false;
  let emailSent = false;
  let errors = 0;

  const runLog = await createAgentRunLog({
    agentName: "central_reporter",
    status: "running",
    summary: "Generating daily report...",
    startedAt: new Date(),
  });

  try {
    // Collect all data
    const reportData = await collectReportData();
    
    // Generate report date (WIB timezone)
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(now.getTime() + wibOffset);
    const reportDate = wibDate.toISOString().split("T")[0];

    // Check if report already exists for today
    const existingReport = await getDailyReportByDate(reportDate);
    
    // Build the report
    const reportHtml = buildReportEmail(reportData, reportDate);
    const reportSummary = buildReportSummary(reportData);

    if (existingReport) {
      await updateDailyReport(existingReport.id, {
        htmlContent: reportHtml,
        metrics: JSON.stringify(reportData),
        summary: reportSummary,
        sentAt: new Date(),
        status: "sent",
      });
    } else {
      await createDailyReport({
        reportDate,
        htmlContent: reportHtml,
        metrics: JSON.stringify(reportData),
        summary: reportSummary,
        sentTo: ADMIN_EMAIL,
        sentAt: new Date(),
        status: "sent",
      });
    }
    reportGenerated = true;

    // Send email
    const sent = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `📊 SpecTa AI Daily Report — ${formatDate(reportDate)}`,
      html: reportHtml,
    });
    emailSent = sent;
    if (!sent) errors++;

    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: errors > 0 ? "partial" : "success",
        summary: `Daily report ${reportGenerated ? "generated" : "failed"}, email ${emailSent ? "sent" : "failed"}`,
        details: JSON.stringify({ reportDate, reportGenerated, emailSent }),
        itemsProcessed: 1,
        itemsSucceeded: emailSent ? 1 : 0,
        itemsFailed: emailSent ? 0 : 1,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      });
    }

    await updateAgentConfig("central_reporter", {
      lastRunAt: new Date(),
      // Next run tomorrow at 9AM WIB (2AM UTC)
      nextRunAt: getNextRunTime(),
    });

  } catch (err) {
    console.error("[Reporter Agent] Fatal error:", err);
    errors++;
    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      });
    }
  }

  return { reportGenerated, emailSent, errors };
}

/**
 * Calculate next 9AM WIB run time
 */
function getNextRunTime(): Date {
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibNow = new Date(now.getTime() + wibOffset);
  
  // Set to tomorrow 9AM WIB
  const tomorrow = new Date(wibNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  // Convert back to UTC
  return new Date(tomorrow.getTime() - wibOffset);
}

/**
 * Collect all data needed for the report
 */
async function collectReportData() {
  // Leads
  const allLeads = await getAllLeads();
  const scholarshipLeads = await getAllScholarshipLeads();
  const applications = await getAllApplications();
  const assignments = await getAllLeadAssignments();
  const staleAssignments = await getStaleAssignments(48);
  const dueFollowUps = await getDueFollowUpActions();

  // SEO
  const seoEntries = await getAllSeoContentEntries();
  const publishedPosts = await listPublishedBlogPosts({ limit: 100, offset: 0 });

  // Agent runs
  const recentRuns = await getAllRecentAgentRuns(50);
  const agentConfigs = await getAllAgentConfigs();

  // Counselors
  const counselors = await getAllCounselors(true);

  // Time-based metrics (last 24h, last 7d, last 30d)
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;
  const last7d = now - 7 * 24 * 60 * 60 * 1000;
  const last30d = now - 30 * 24 * 60 * 60 * 1000;

  const newLeads24h = allLeads.filter(l => l.createdAt && new Date(l.createdAt).getTime() > last24h).length;
  const newLeads7d = allLeads.filter(l => l.createdAt && new Date(l.createdAt).getTime() > last7d).length;
  const newLeads30d = allLeads.filter(l => l.createdAt && new Date(l.createdAt).getTime() > last30d).length;

  const newScholarship24h = scholarshipLeads.filter(l => l.createdAt && new Date(l.createdAt).getTime() > last24h).length;

  // Assignment stats
  const assignedToday = assignments.filter(a => a.assignedAt && new Date(a.assignedAt).getTime() > last24h).length;
  const convertedTotal = assignments.filter(a => a.status === "converted").length;
  const escalatedTotal = assignments.filter(a => a.status === "escalated").length;

  // Counselor performance
  const counselorPerformance = counselors.map(c => {
    const myAssignments = assignments.filter(a => a.counselorEmail === c.email);
    const active = myAssignments.filter(a => !["converted", "closed"].includes(a.status)).length;
    const converted = myAssignments.filter(a => a.status === "converted").length;
    const escalated = myAssignments.filter(a => a.status === "escalated").length;
    return {
      name: c.name,
      email: c.email,
      totalAssigned: myAssignments.length,
      active,
      converted,
      escalated,
      conversionRate: myAssignments.length > 0 ? Math.round((converted / myAssignments.length) * 100) : 0,
    };
  });

  // SEO stats
  const articlesPublished = seoEntries.filter(e => e.status === "published").length;
  const articlesPlanned = seoEntries.filter(e => e.status === "planned").length;
  const articlesInProgress = seoEntries.filter(e => ["generating", "generated", "review"].includes(e.status)).length;
  const publishedLast7d = seoEntries.filter(e => e.status === "published" && e.publishedAt && new Date(e.publishedAt).getTime() > last7d).length;

  // Agent health
  const agentHealth = agentConfigs.map(config => {
    const runs = recentRuns.filter(r => r.agentName === config.agentName);
    const lastRun = runs[0];
    const failedRuns = runs.filter(r => r.status === "failed").length;
    return {
      name: config.agentName,
      enabled: config.isActive,
      lastRun: lastRun?.startedAt,
      lastStatus: lastRun?.status || "never_run",
      failedRunsLast24h: failedRuns,
    };
  });

  return {
    timestamp: new Date().toISOString(),
    leads: {
      total: allLeads.length,
      new24h: newLeads24h,
      new7d: newLeads7d,
      new30d: newLeads30d,
      scholarshipTotal: scholarshipLeads.length,
      scholarshipNew24h: newScholarship24h,
    },
    assignments: {
      total: assignments.length,
      assignedToday,
      converted: convertedTotal,
      escalated: escalatedTotal,
      stale: staleAssignments.length,
      pendingFollowUps: dueFollowUps.length,
    },
    applications: {
      total: applications.length,
    },
    seo: {
      totalArticles: articlesPublished,
      planned: articlesPlanned,
      inProgress: articlesInProgress,
      publishedLast7d,
      totalBlogPosts: publishedPosts.posts?.length || 0,
    },
    counselorPerformance,
    agentHealth,
  };
}

/**
 * Build the report summary text
 */
function buildReportSummary(data: any): string {
  return `Leads: ${data.leads.new24h} new (${data.leads.total} total) | Assignments: ${data.assignments.assignedToday} today | SEO: ${data.seo.publishedLast7d} articles this week | Escalations: ${data.assignments.stale} stale`;
}

/**
 * Build the beautiful HTML report email
 */
function buildReportEmail(data: any, reportDate: string): string {
  const counselorRows = data.counselorPerformance.map((c: any) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:500;">${c.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${c.totalAssigned}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${c.active}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${c.converted}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${c.escalated > 0 ? `<span style="color:#dc3545;font-weight:bold;">${c.escalated}</span>` : "0"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;">${c.conversionRate}%</td>
    </tr>
  `).join("");

  const agentRows = data.agentHealth.map((a: any) => {
    const statusColor = a.lastStatus === "success" ? "#28a745" : a.lastStatus === "failed" ? "#dc3545" : a.lastStatus === "partial" ? "#ffc107" : "#6c757d";
    const statusIcon = a.lastStatus === "success" ? "✅" : a.lastStatus === "failed" ? "❌" : a.lastStatus === "partial" ? "⚠️" : "⏸️";
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatAgentName(a.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${a.enabled ? "🟢 Active" : "🔴 Off"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${statusIcon} <span style="color:${statusColor};">${a.lastStatus}</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${a.lastRun ? formatTimeAgo(new Date(a.lastRun)) : "Never"}</td>
      </tr>
    `;
  }).join("");

  // Action items
  const actionItems: string[] = [];
  if (data.assignments.stale > 0) {
    actionItems.push(`⚠️ <strong>${data.assignments.stale} leads need immediate attention</strong> — assigned but not contacted for 48+ hours`);
  }
  if (data.assignments.pendingFollowUps > 0) {
    actionItems.push(`📋 ${data.assignments.pendingFollowUps} follow-up actions are due`);
  }
  if (data.seo.planned > 3) {
    actionItems.push(`📝 ${data.seo.planned} SEO articles are planned and waiting to be generated`);
  }
  const failedAgents = data.agentHealth.filter((a: any) => a.lastStatus === "failed");
  if (failedAgents.length > 0) {
    actionItems.push(`🔧 ${failedAgents.length} agent(s) had failures in the last run — check the Agent Command Center`);
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:20px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#e53e3e,#c53030);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">📊 SpecTa AI Daily Report</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">${formatDate(reportDate)} • Generated by AI Agent System</p>
    </div>

    <div style="background:#fff;padding:0;border-radius:0 0 16px 16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      
      <!-- KPI Cards -->
      <div style="padding:24px 24px 0;">
        <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">Key Metrics</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding:8px;">
              <div style="background:#fff5f5;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#e53e3e;">${data.leads.new24h}</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">New Leads (24h)</div>
              </div>
            </td>
            <td style="padding:8px;">
              <div style="background:#f0fff4;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#38a169;">${data.assignments.converted}</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">Converted</div>
              </div>
            </td>
            <td style="padding:8px;">
              <div style="background:#fffbeb;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#d69e2e;">${data.assignments.stale}</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">Need Attention</div>
              </div>
            </td>
            <td style="padding:8px;">
              <div style="background:#ebf8ff;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#3182ce;">${data.seo.totalArticles}</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">SEO Articles</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Action Items -->
      ${actionItems.length > 0 ? `
      <div style="padding:24px 24px 0;">
        <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">🎯 Action Items</h2>
        <div style="background:#fff8e1;border-radius:8px;padding:16px;border-left:4px solid #ffc107;">
          ${actionItems.map(item => `<p style="margin:6px 0;color:#333;font-size:14px;line-height:1.5;">${item}</p>`).join("")}
        </div>
      </div>
      ` : ""}

      <!-- Lead Pipeline -->
      <div style="padding:24px 24px 0;">
        <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">📈 Lead Pipeline</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">Total Leads (All Time)</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.leads.total}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">New Leads (Last 7 Days)</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.leads.new7d}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">New Leads (Last 30 Days)</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.leads.new30d}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">Scholarship Leads</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.leads.scholarshipTotal}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">Assigned Today</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.assignments.assignedToday}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">Total Applications</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.applications.total}</td>
          </tr>
        </table>
      </div>

      <!-- Counselor Performance -->
      <div style="padding:24px 24px 0;">
        <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">👥 Counselor Performance</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:10px 12px;text-align:left;font-weight:600;color:#555;">Counselor</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600;color:#555;">Assigned</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600;color:#555;">Active</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600;color:#555;">Converted</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600;color:#555;">Escalated</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600;color:#555;">Rate</th>
            </tr>
          </thead>
          <tbody>
            ${counselorRows || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#999;">No counselor data yet</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- SEO Performance -->
      <div style="padding:24px 24px 0;">
        <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">🔍 SEO Content</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">Articles Published (Total)</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.seo.totalArticles}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">Published This Week</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.seo.publishedLast7d}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">In Progress</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.seo.inProgress}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">Planned</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.seo.planned}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-size:14px;">Total Blog Posts</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1a1a1a;">${data.seo.totalBlogPosts}</td>
          </tr>
        </table>
      </div>

      <!-- Agent System Health -->
      <div style="padding:24px 24px 0;">
        <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">🤖 AI Agent System Health</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:8px 12px;text-align:left;font-weight:600;color:#555;">Agent</th>
              <th style="padding:8px 12px;text-align:center;font-weight:600;color:#555;">Status</th>
              <th style="padding:8px 12px;text-align:center;font-weight:600;color:#555;">Last Run</th>
              <th style="padding:8px 12px;text-align:center;font-weight:600;color:#555;">Last Active</th>
            </tr>
          </thead>
          <tbody>
            ${agentRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#999;">No agent data yet</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="padding:24px;text-align:center;border-top:1px solid #eee;margin-top:24px;">
        <a href="https://www.spectaeducation.com/admin" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;margin-bottom:16px;">Open Admin Dashboard</a>
        <p style="color:#999;font-size:12px;margin:12px 0 0;">This report was automatically generated by SpecTa AI Agent System.<br>© ${new Date().getFullYear()} SpecTa Education</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// Utility Functions
// ==========================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAgentName(name: string): string {
  const names: Record<string, string> = {
    crm_distributor: "CRM & Follow-Up",
    seo_builder: "SEO Builder",
    central_reporter: "Central Reporter",
    lead_hunter: "Lead Hunter",
    competitor_monitor: "Competitor Monitor",
    scholarship_scout: "Scholarship Scout",
    social_media: "Social Media",
    partner_scout: "Partner Scout",
  };
  return names[name] || name;
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
