/**
 * Weekly CRM Performance Report Agent
 * 
 * Runs every Monday at 8AM WIB and sends a formatted HTML email to the CEO
 * summarising each counselor's weekly performance metrics.
 */
import { getAllLeads, getAllStaffAccounts } from "./db";
import { sendEmail } from "./email";

const CEO_EMAIL = "hadi@spectaeducation.com";

function formatDate(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export async function runWeeklyPerformanceReport(): Promise<{ sent: boolean; error?: string }> {
  try {
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    // Only run on Mondays (day 1)
    if (wibNow.getDay() !== 1) {
      return { sent: false };
    }

    // Get date range: last 7 days
    const weekStart = new Date(wibNow.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = wibNow;

    // Fetch all leads and staff
    const allLeads = await getAllLeads() as any[];
    const allStaff = await getAllStaffAccounts() as any[];

    // Filter leads created this week
    const weekLeads = allLeads.filter((l: any) => {
      const created = new Date(l.createdAt);
      return created >= weekStart && created <= weekEnd;
    });

    // Build per-counselor stats
    const counselorStats: Record<string, {
      name: string; email: string; role: string;
      newLeads: number; contacted: number; qualified: number; enrolled: number; lost: number; total: number;
    }> = {};

    for (const staff of allStaff) {
      counselorStats[staff.email] = {
        name: staff.name || staff.email,
        email: staff.email,
        role: staff.role || "counselor",
        newLeads: 0, contacted: 0, qualified: 0, enrolled: 0, lost: 0, total: 0,
      };
    }

    // Count leads by assigned counselor and stage
    for (const lead of weekLeads) {
      const counselorEmail = lead.assignedCounselor || lead.assignedTo;
      if (counselorEmail && counselorStats[counselorEmail]) {
        counselorStats[counselorEmail].total++;
        const stage = lead.pipelineStage || "new";
        if (stage === "new") counselorStats[counselorEmail].newLeads++;
        else if (stage === "contacted") counselorStats[counselorEmail].contacted++;
        else if (stage === "qualified") counselorStats[counselorEmail].qualified++;
        else if (stage === "enrolled") counselorStats[counselorEmail].enrolled++;
        else if (stage === "lost") counselorStats[counselorEmail].lost++;
      }
    }

    // Overall stats
    const totalLeadsThisWeek = weekLeads.length;
    const totalEnrolled = weekLeads.filter((l: any) => l.pipelineStage === "enrolled").length;
    const conversionRate = totalLeadsThisWeek > 0 ? ((totalEnrolled / totalLeadsThisWeek) * 100).toFixed(1) : "0";

    // Build HTML email
    const statsRows = Object.values(counselorStats)
      .filter(s => s.role !== "admin" || s.total > 0)
      .sort((a, b) => b.total - a.total)
      .map(s => `
        <tr style="border-bottom: 1px solid #2a2a3e;">
          <td style="padding: 12px 16px; color: #fff; font-weight: 500;">${s.name}</td>
          <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px;">${s.email}</td>
          <td style="padding: 12px 16px; text-align: center; color: #60a5fa; font-weight: 700;">${s.total}</td>
          <td style="padding: 12px 16px; text-align: center; color: #a78bfa;">${s.contacted}</td>
          <td style="padding: 12px 16px; text-align: center; color: #34d399;">${s.qualified}</td>
          <td style="padding: 12px 16px; text-align: center; color: #f59e0b; font-weight: 700;">${s.enrolled}</td>
          <td style="padding: 12px 16px; text-align: center; color: #f87171;">${s.lost}</td>
        </tr>
      `).join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:32px 16px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1f3e,#0d1424);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">📊</div>
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Weekly CRM Performance Report</h1>
      <p style="color:#94a3b8;margin:0;font-size:14px;">${formatDate(weekStart)} — ${formatDate(weekEnd)}</p>
    </div>

    <!-- Summary Cards -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
      <div style="background:#1a1f3e;border:1px solid rgba(96,165,250,0.3);border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:32px;font-weight:700;color:#60a5fa;">${totalLeadsThisWeek}</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px;">New Leads This Week</div>
      </div>
      <div style="background:#1a1f3e;border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:32px;font-weight:700;color:#f59e0b;">${totalEnrolled}</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Enrolled This Week</div>
      </div>
      <div style="background:#1a1f3e;border:1px solid rgba(52,211,153,0.3);border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:32px;font-weight:700;color:#34d399;">${conversionRate}%</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Conversion Rate</div>
      </div>
    </div>

    <!-- Counselor Table -->
    <div style="background:#1a1f3e;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.1);">
        <h2 style="color:#fff;font-size:18px;margin:0;">👥 Counselor Performance</h2>
        <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;">New leads added this week by each counselor</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(255,255,255,0.05);">
            <th style="padding:12px 16px;text-align:left;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;">Counselor</th>
            <th style="padding:12px 16px;text-align:left;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;">Email</th>
            <th style="padding:12px 16px;text-align:center;color:#60a5fa;font-size:12px;font-weight:600;text-transform:uppercase;">Total</th>
            <th style="padding:12px 16px;text-align:center;color:#a78bfa;font-size:12px;font-weight:600;text-transform:uppercase;">Contacted</th>
            <th style="padding:12px 16px;text-align:center;color:#34d399;font-size:12px;font-weight:600;text-transform:uppercase;">Qualified</th>
            <th style="padding:12px 16px;text-align:center;color:#f59e0b;font-size:12px;font-weight:600;text-transform:uppercase;">Enrolled</th>
            <th style="padding:12px 16px;text-align:center;color:#f87171;font-size:12px;font-weight:600;text-transform:uppercase;">Lost</th>
          </tr>
        </thead>
        <tbody>
          ${statsRows || '<tr><td colspan="7" style="padding:24px;text-align:center;color:#94a3b8;">No new leads this week</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#4a5568;font-size:12px;">
      <p>This report was automatically generated by SpecTa Education CRM</p>
      <p>© ${new Date().getFullYear()} SpecTa Education · <a href="https://www.spectaeducation.com" style="color:#e91e8c;text-decoration:none;">spectaeducation.com</a></p>
    </div>
  </div>
</body>
</html>`;

    const sent = await sendEmail({
      to: CEO_EMAIL,
      subject: `📊 SpecTa Weekly CRM Report — ${formatDate(weekStart)} to ${formatDate(weekEnd)}`,
      html,
    });

    console.log(`[WeeklyReport] Email sent to ${CEO_EMAIL}: ${sent}`);
    return { sent };
  } catch (error: any) {
    console.error("[WeeklyReport] Failed:", error);
    return { sent: false, error: error.message };
  }
}
