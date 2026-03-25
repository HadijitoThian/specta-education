/**
 * Auto Weekly Parent Email Agent
 *
 * Runs every Monday at 9AM WIB.
 * For every active student who has a parentEmail set, sends a
 * personalised HTML progress report to their parent/guardian.
 */
import { getAllLeads, getCrmDocsByLead, getActivityTimeline } from "./db";
import { sendEmail } from "./email";

function formatDate(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function stageLabel(stage: string) {
  const map: Record<string, string> = {
    new: "New Lead",
    contacted: "Contacted",
    qualified: "Qualified",
    in_progress: "In Progress",
    enrolled: "Enrolled ✅",
    completed: "Completed 🎓",
    lost: "Inactive",
  };
  return map[stage] || stage;
}

function stageColor(stage: string) {
  const map: Record<string, string> = {
    new: "#3b82f6",
    contacted: "#f59e0b",
    qualified: "#8b5cf6",
    in_progress: "#f97316",
    enrolled: "#22c55e",
    completed: "#10b981",
    lost: "#ef4444",
  };
  return map[stage] || "#6b7280";
}

export async function runAutoParentWeeklyEmail(): Promise<{ sent: number; skipped: number; errors: number }> {
  const now = new Date();
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  // Only run on Mondays (day 1) between 9:00–9:59 WIB
  if (wibNow.getDay() !== 1 || wibNow.getHours() !== 9) {
    return { sent: 0, skipped: 0, errors: 0 };
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const allLeads = (await getAllLeads()) as any[];

    // Filter: only leads with parentEmail and not lost/completed
    const activeLeads = allLeads.filter(
      (l: any) => l.parentEmail && l.parentEmail.trim() && l.status !== "lost"
    );

    for (const lead of activeLeads) {
      try {
        // Get documents
        const docs = (await getCrmDocsByLead(lead.id)) as any[];
        const submitted = docs.filter((d: any) => d.status === "submitted" || d.status === "verified").length;
        const total = docs.length;

        // Get last 3 timeline activities
        const timeline = (await getActivityTimeline(lead.id)) as any[];
        const recentActivities = timeline.slice(0, 3);

        const activityRows = recentActivities.length > 0
          ? recentActivities.map((a: any) => `
            <tr>
              <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#666;font-size:12px;">${new Date(a.createdAt).toLocaleDateString("id-ID")}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;">${a.title || a.activityType}</td>
            </tr>`).join("")
          : `<tr><td colspan="2" style="padding:8px;color:#999;font-size:13px;">No recent activity recorded yet.</td></tr>`;

        const stageColor_ = stageColor(lead.pipelineStage || lead.status || "new");
        const stageLabel_ = stageLabel(lead.pipelineStage || lead.status || "new");

        const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#f8f9fa;padding:20px;border-radius:12px;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#e91e8c,#9c27b0);padding:24px 20px;border-radius:10px;text-align:center;margin-bottom:20px;">
    <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">SpecTa Education</h1>
    <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">Weekly Student Progress Report</p>
    <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:12px;">${formatDate(wibNow)}</p>
  </div>

  <!-- Greeting -->
  <div style="background:white;border-radius:10px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <p style="margin:0 0 12px;font-size:15px;color:#333;">Dear <strong>${lead.parentName || "Parent/Guardian"}</strong>,</p>
    <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
      Here is the weekly progress update for your child <strong>${lead.studentName}</strong> 
      from SpecTa Education. We are committed to keeping you informed every step of the way.
    </p>
  </div>

  <!-- Current Status -->
  <div style="background:white;border-radius:10px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h3 style="margin:0 0 14px;font-size:15px;color:#333;border-bottom:2px solid #f0f0f0;padding-bottom:8px;">📊 Current Status</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#fafafa;">
        <td style="padding:8px;font-weight:600;color:#555;font-size:13px;width:45%;">Student Name</td>
        <td style="padding:8px;font-size:13px;color:#333;">${lead.studentName}</td>
      </tr>
      <tr>
        <td style="padding:8px;font-weight:600;color:#555;font-size:13px;">Consultation Stage</td>
        <td style="padding:8px;">
          <span style="background:${stageColor_}20;color:${stageColor_};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${stageLabel_}</span>
        </td>
      </tr>
      <tr style="background:#fafafa;">
        <td style="padding:8px;font-weight:600;color:#555;font-size:13px;">Preferred Country</td>
        <td style="padding:8px;font-size:13px;color:#333;">${lead.preferredCountry || "Not specified yet"}</td>
      </tr>
      <tr>
        <td style="padding:8px;font-weight:600;color:#555;font-size:13px;">Program / Major</td>
        <td style="padding:8px;font-size:13px;color:#333;">${lead.programInterest || "Not specified yet"}</td>
      </tr>
      <tr style="background:#fafafa;">
        <td style="padding:8px;font-weight:600;color:#555;font-size:13px;">Study Level</td>
        <td style="padding:8px;font-size:13px;color:#333;">${lead.studyLevel || "Not specified yet"}</td>
      </tr>
      <tr>
        <td style="padding:8px;font-weight:600;color:#555;font-size:13px;">Target Intake</td>
        <td style="padding:8px;font-size:13px;color:#333;">${lead.intakeDate || "Not specified yet"}</td>
      </tr>
      ${total > 0 ? `
      <tr style="background:#fafafa;">
        <td style="padding:8px;font-weight:600;color:#555;font-size:13px;">Documents Ready</td>
        <td style="padding:8px;font-size:13px;color:#333;">
          <span style="color:${submitted === total ? "#22c55e" : "#f59e0b"};font-weight:600;">${submitted}/${total}</span> documents submitted
        </td>
      </tr>` : ""}
    </table>
  </div>

  <!-- Recent Activity -->
  <div style="background:white;border-radius:10px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h3 style="margin:0 0 14px;font-size:15px;color:#333;border-bottom:2px solid #f0f0f0;padding-bottom:8px;">🕐 Recent Activity (This Week)</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f8f9fa;">
        <th style="padding:6px 8px;text-align:left;font-size:12px;color:#888;font-weight:600;">Date</th>
        <th style="padding:6px 8px;text-align:left;font-size:12px;color:#888;font-weight:600;">Activity</th>
      </tr>
      ${activityRows}
    </table>
  </div>

  <!-- Next Steps -->
  <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:10px;padding:18px;margin-bottom:16px;">
    <h3 style="margin:0 0 10px;font-size:14px;color:#92400e;">💡 What Happens Next?</h3>
    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
      Our counselor is actively working with ${lead.studentName} to find the best university match. 
      If you have any questions or would like to discuss the progress, please don't hesitate to contact us.
    </p>
  </div>

  <!-- Contact -->
  <div style="background:white;border-radius:10px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-align:center;">
    <p style="margin:0 0 8px;font-size:13px;color:#555;">Questions? Contact us anytime:</p>
    <p style="margin:0;font-size:14px;font-weight:600;color:#e91e8c;">📱 +62 811 8120 820</p>
    <p style="margin:4px 0 0;font-size:13px;color:#555;">
      <a href="mailto:info@spectaeducation.com" style="color:#9c27b0;text-decoration:none;">info@spectaeducation.com</a>
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#aaa;">
      SpecTa Education — Your Study Abroad Partner Since 2005<br/>
      You are receiving this because you are listed as the parent/guardian of ${lead.studentName}.
    </p>
  </div>
</div>`;

        await sendEmail({
          to: lead.parentEmail,
          subject: `📊 Weekly Progress Report: ${lead.studentName} — SpecTa Education`,
          html: emailHtml,
        });

        sent++;
        console.log(`[ParentWeeklyEmail] Sent to ${lead.parentEmail} for student ${lead.studentName}`);
      } catch (e: any) {
        errors++;
        console.error(`[ParentWeeklyEmail] Failed for ${lead.studentName}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error("[ParentWeeklyEmail] Fatal error:", e.message);
    errors++;
  }

  console.log(`[ParentWeeklyEmail] Done — sent: ${sent}, skipped: ${skipped}, errors: ${errors}`);
  return { sent, skipped, errors };
}
