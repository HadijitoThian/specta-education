/**
 * Agent 2 — CRM & Follow-Up Distributor
 * 
 * Responsibilities:
 * 1. Scan all lead sources for unassigned leads
 * 2. Assign leads to counselors using round-robin + workload balancing
 * 3. Create follow-up email sequences for each assignment
 * 4. Process due follow-up actions (send emails)
 * 5. Escalate stale leads (no contact after 48h)
 * 6. Notify counselors of new assignments
 */

import {
  getAllLeads,
  getAllScholarshipLeads,
  getAllCounselors,
  getLeadAssignmentByLeadId,
  getLeadAssignmentById,
  createLeadAssignment,
  createFollowUpAction,
  getDueFollowUpActions,
  updateFollowUpAction,
  updateLeadAssignment,
  getStaleAssignments,
  createAgentRunLog,
  updateAgentRunLog,
  updateAgentConfig,
  getAllLeadAssignments,
  getFollowUpActionsByAssignment,
} from "./db";
import { sendEmail } from "./email";
import { notifyOwner } from "./_core/notification";

// Counselor roster with specializations
const COUNSELOR_ROSTER = [
  { name: "Fitriana", email: "fitriana@spectaeducation.com" },
  { name: "Wulan", email: "wulan@spectaeducation.com" },
  { name: "Jenny", email: "jenny@spectaeducation.com" },
  { name: "Intar", email: "intar@spectaeducation.com" },
  { name: "Nezwa", email: "nezwa@spectaeducation.com" },
];

// Follow-up schedule: day offsets and email types
const FOLLOW_UP_SCHEDULE = [
  { dayOffset: 0, type: "email_counselor" as const, subject: "🔔 New Lead Assigned: {{studentName}}", template: "counselor_assignment" },
  { dayOffset: 0, type: "email_student" as const, subject: "Welcome to SpecTa Education! 🎓", template: "student_welcome" },
  { dayOffset: 1, type: "reminder" as const, subject: "Reminder: Follow up with {{studentName}}", template: "counselor_reminder_1" },
  { dayOffset: 3, type: "email_student" as const, subject: "How can we help you study abroad? 🌏", template: "student_followup_1" },
  { dayOffset: 7, type: "reminder" as const, subject: "⚠️ 7-day follow-up: {{studentName}}", template: "counselor_reminder_2" },
  { dayOffset: 14, type: "email_student" as const, subject: "Your study abroad journey awaits! ✈️", template: "student_followup_2" },
  { dayOffset: 30, type: "email_student" as const, subject: "Still thinking about studying abroad? 🤔", template: "student_followup_3" },
];

/**
 * Main agent execution function
 */
export async function runCrmDistributorAgent(): Promise<{
  leadsAssigned: number;
  followUpsSent: number;
  escalations: number;
  errors: number;
}> {
  const startTime = Date.now();
  let leadsAssigned = 0;
  let followUpsSent = 0;
  let escalations = 0;
  let errors = 0;

  // Create run log
  const runLog = await createAgentRunLog({
    agentName: "crm_distributor",
    status: "running",
    summary: "Starting CRM distribution cycle...",
    startedAt: new Date(),
  });

  try {
    // Step 1: Assign unassigned leads — gated by env flag.
    //
    // The owner asked (Sep 2026) to disable auto-assignment "for now" — admin
    // wants to assign new leads to counselors manually from the CRM cockpit.
    // Set CRM_AUTO_ASSIGN_ENABLED=true on Railway to re-enable round-robin.
    //
    // Follow-ups + escalations (steps 2 & 3) keep running — those operate on
    // already-assigned leads and matter regardless of how the lead got assigned.
    const autoAssignEnabled = String(process.env.CRM_AUTO_ASSIGN_ENABLED || "").toLowerCase() === "true";
    if (autoAssignEnabled) {
      const assignResult = await assignUnassignedLeads();
      leadsAssigned = assignResult.assigned;
      errors += assignResult.errors;
    } else {
      console.log("[CRM Agent] Auto-assignment SKIPPED (CRM_AUTO_ASSIGN_ENABLED not 'true'). New leads stay unassigned for admin to assign manually.");
    }

    // Step 2: Process due follow-up actions
    const followUpResult = await processDueFollowUps();
    followUpsSent = followUpResult.sent;
    errors += followUpResult.errors;

    // Step 3: Escalate stale leads
    const escalationResult = await escalateStaleLeads();
    escalations = escalationResult.escalated;
    errors += escalationResult.errors;

    // Update run log
    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: errors > 0 ? "partial" : "success",
        summary: `Assigned ${leadsAssigned} leads, sent ${followUpsSent} follow-ups, escalated ${escalations} leads`,
        details: JSON.stringify({ leadsAssigned, followUpsSent, escalations, errors }),
        itemsProcessed: leadsAssigned + followUpsSent + escalations,
        itemsSucceeded: leadsAssigned + followUpsSent + escalations - errors,
        itemsFailed: errors,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      });
    }

    // Update agent config
    await updateAgentConfig("crm_distributor", {
      lastRunAt: new Date(),
      nextRunAt: new Date(Date.now() + 60 * 60 * 1000), // next run in 1 hour
    });

  } catch (err) {
    console.error("[CRM Agent] Fatal error:", err);
    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      });
    }
  }

  return { leadsAssigned, followUpsSent, escalations, errors };
}

/**
 * Scan all lead sources and assign unassigned leads to counselors
 */
async function assignUnassignedLeads(): Promise<{ assigned: number; errors: number }> {
  let assigned = 0;
  let errors = 0;

  try {
    // Get active counselors from DB, fallback to roster
    let counselors = await getAllCounselors(true);
    if (counselors.length === 0) {
      // Use hardcoded roster
      counselors = COUNSELOR_ROSTER.map((c, i) => ({
        id: i + 1,
        name: c.name,
        email: c.email,
        phone: null,
        specialization: null,
        isActive: true,
        activeApplications: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    // Get existing assignments to calculate workload
    const existingAssignments = await getAllLeadAssignments();
    const counselorWorkload: Record<string, number> = {};
    for (const c of counselors) {
      counselorWorkload[c.email] = 0;
    }
    for (const a of existingAssignments) {
      if (!["converted", "closed"].includes(a.status)) {
        counselorWorkload[a.counselorEmail] = (counselorWorkload[a.counselorEmail] || 0) + 1;
      }
    }

    // Source 1: Chatbot leads (only unassigned ones)
    const { getUnassignedLeads, markLeadAsAssigned } = await import("./db");
    const chatbotLeads = await getUnassignedLeads();
    for (const lead of chatbotLeads) {
      const counselor = pickCounselor(counselors, counselorWorkload);
      if (!counselor) break;
      try {
        const chatbotAssignment = await createLeadAssignment({
          leadId: lead.id,
          leadSource: "chatbot",
          counselorId: counselor.id,
          counselorName: counselor.name,
          counselorEmail: counselor.email,
          studentName: lead.studentName || "Unknown Student",
          studentEmail: lead.studentEmail || undefined,
          studentPhone: lead.studentPhone || undefined,
          preferredCountry: lead.preferredCountry || undefined,
          status: "assigned",
          priority: determinePriority(lead),
          nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        // Mark as assigned immediately so it is never re-processed even if lead_assignments is cleared
        await markLeadAsAssigned(lead.id);
        counselorWorkload[counselor.email] = (counselorWorkload[counselor.email] || 0) + 1;
        assigned++;
        await createFollowUpSchedule(chatbotAssignment?.id ?? 0, counselor, lead.studentName || "Student", lead.studentEmail, lead.studentPhone, lead.preferredCountry);
        await sendAdminAssignmentNotification({
          studentName: lead.studentName || "Unknown Student",
          studentEmail: lead.studentEmail || "N/A",
          studentPhone: lead.studentPhone || "N/A",
          preferredCountry: lead.preferredCountry || "Not specified",
          counselorName: counselor.name,
          counselorEmail: counselor.email,
          leadSource: "Chatbot",
          priority: determinePriority(lead),
        });
      } catch (err) {
        console.error("[CRM Agent] Failed to assign lead " + lead.id + ":", err);
        errors++;
      }
    }

      // Source 2: Scholarship leads
    const { getUnassignedScholarshipLeads, markScholarshipAsAssigned } = await import("./db");
    const scholarshipLeads = await getUnassignedScholarshipLeads();
    for (const lead of scholarshipLeads) {
      const counselor = pickCounselor(counselors, counselorWorkload);
      if (!counselor) break;
      try {
        const scholarshipAssignment = await createLeadAssignment({
          leadId: lead.id,
          leadSource: "scholarship",
          counselorId: counselor.id,
          counselorName: counselor.name,
          counselorEmail: counselor.email,
          studentName: lead.studentName,
          studentEmail: lead.studentEmail,
          studentPhone: lead.studentPhone,
          status: "assigned",
          priority: "high",
          nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        // Mark as assigned immediately so it's never re-processed even if lead_assignments is cleared
        await markScholarshipAsAssigned(lead.id);
        counselorWorkload[counselor.email] = (counselorWorkload[counselor.email] || 0) + 1;
        assigned++;
        await createFollowUpSchedule(scholarshipAssignment?.id ?? 0, counselor, lead.studentName, lead.studentEmail, lead.studentPhone);
        await sendAdminAssignmentNotification({
          studentName: lead.studentName,
          studentEmail: lead.studentEmail || "N/A",
          studentPhone: lead.studentPhone || "N/A",
          preferredCountry: "Scholarship Interest",
          counselorName: counselor.name,
          counselorEmail: counselor.email,
          leadSource: "Scholarship Form",
          priority: "high",
        });
      } catch (err) {
        console.error(`[CRM Agent] Failed to assign scholarship lead ${lead.id}:`, err);
        errors++;
      }
    }

        // Source 3: Aptitude test leads (students who completed the test)
    const { getUnassignedAptitudeResults, markAptitudeAsAssigned } = await import("./db");
    const aptitudeResults = await getUnassignedAptitudeResults();
    for (const result of aptitudeResults) {
      if (!result.studentEmail) continue;
      const counselor = pickCounselor(counselors, counselorWorkload);
      if (!counselor) break;
      try {
        const aptitudeAssignment = await createLeadAssignment({
          leadId: result.id,
          leadSource: "aptitude_test",
          counselorId: counselor.id,
          counselorEmail: counselor.email,
          counselorName: counselor.name,
          studentName: result.studentName || "Unknown",
          studentEmail: result.studentEmail,
          studentPhone: result.studentPhone || null,
          status: "assigned",
          priority: "medium",
          nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        // Mark as assigned immediately so it's never re-processed even if lead_assignments is cleared
        await markAptitudeAsAssigned(result.id);
        counselorWorkload[counselor.email] = (counselorWorkload[counselor.email] || 0) + 1;
        assigned++;
        await createFollowUpSchedule(aptitudeAssignment?.id ?? 0, counselor, result.studentName || "Student", result.studentEmail, result.studentPhone);
        await sendAdminAssignmentNotification({
          studentName: result.studentName || "Unknown",
          studentEmail: result.studentEmail,
          studentPhone: result.studentPhone || "N/A",
          preferredCountry: `Holland Code: ${result.hollandCode || "N/A"}`,
          counselorName: counselor.name,
          counselorEmail: counselor.email,
          leadSource: "Aptitude Test",
          priority: "medium",
        });
      } catch (err) {
        console.error(`[CRM Agent] Failed to assign aptitude lead ${result.id}:`, err);
        errors++;
      }
    }

    console.log(`[CRM Agent] Assigned ${assigned} new leads (${errors} errors)`);
  } catch (err) {
    console.error("[CRM Agent] Error in assignUnassignedLeads:", err);
    errors++;
  }

  return { assigned, errors };
}

/**
 * Pick the counselor with the lowest workload (round-robin with balancing)
 */
function pickCounselor(
  counselors: Array<{ id: number; name: string; email: string }>,
  workload: Record<string, number>
): { id: number; name: string; email: string } | null {
  if (counselors.length === 0) return null;

  let minLoad = Infinity;
  let selected = counselors[0];

  for (const c of counselors) {
    const load = workload[c.email] || 0;
    if (load < minLoad) {
      minLoad = load;
      selected = c;
    }
  }

  return selected;
}

/**
 * Determine lead priority based on available data
 */
function determinePriority(lead: any): "low" | "medium" | "high" | "urgent" {
  // Has phone + email + country = high intent
  if (lead.studentPhone && lead.studentEmail && lead.preferredCountry) return "high";
  // Has email + country = medium-high
  if (lead.studentEmail && lead.preferredCountry) return "medium";
  // Has phone = medium
  if (lead.studentPhone) return "medium";
  return "low";
}

/**
 * Create the full follow-up schedule for a new assignment
 */
async function createFollowUpSchedule(
  assignmentId: number,
  counselor: { name: string; email: string },
  studentName: string,
  studentEmail?: string | null,
  studentPhone?: string | null,
  preferredCountry?: string | null
): Promise<void> {
  const now = new Date();

  for (const step of FOLLOW_UP_SCHEDULE) {
    const scheduledAt = new Date(now.getTime() + step.dayOffset * 24 * 60 * 60 * 1000);
    const subject = step.subject
      .replace("{{studentName}}", studentName)
      .replace("{{counselorName}}", counselor.name);

    // Skip student emails if no email available
    if (step.type === "email_student" && !studentEmail) continue;

    await createFollowUpAction({
      assignmentId,
      actionType: step.type,
      dayOffset: step.dayOffset,
      subject,
      content: JSON.stringify({
        template: step.template,
        counselorName: counselor.name,
        counselorEmail: counselor.email,
        studentName,
        studentEmail,
        studentPhone,
        preferredCountry,
      }),
      status: "pending",
      scheduledAt,
    });
  }
}

/**
 * Process all due follow-up actions
 */
async function processDueFollowUps(): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;
  try {
    const dueActions = await getDueFollowUpActions();
    console.log(`[CRM Agent] Processing ${dueActions.length} due follow-up actions`);
    for (const action of dueActions) {
      try {
        // Guard: skip orphaned follow-up actions whose assignment no longer exists in the DB
        // This prevents emails being sent for leads that were deleted via Data Management cleanup
        if (action.assignmentId > 0) {
          const assignment = await getLeadAssignmentById(action.assignmentId);
          if (!assignment) {
            console.log(`[CRM Agent] Skipping orphaned follow-up ${action.id} — assignment ${action.assignmentId} no longer exists`);
            await updateFollowUpAction(action.id, { status: "skipped", errorMessage: "Assignment deleted" });
            continue;
          }
        } else {
          // assignmentId = 0 means it was created from old data before proper FK tracking — skip it
          console.log(`[CRM Agent] Skipping legacy follow-up ${action.id} with assignmentId=0`);
          await updateFollowUpAction(action.id, { status: "skipped", errorMessage: "Legacy record — no valid assignment" });
          continue;
        }
        const data = JSON.parse(action.content || "{}");
        let success = false;

        if (action.actionType === "email_counselor") {
          success = await sendCounselorNotification(data);
        } else if (action.actionType === "email_student") {
          success = await sendStudentFollowUp(data, action.dayOffset);
        } else if (action.actionType === "reminder") {
          success = await sendCounselorReminder(data, action.dayOffset);
        } else if (action.actionType === "escalation") {
          success = await sendEscalationAlert(data);
        }

        await updateFollowUpAction(action.id, {
          status: success ? "sent" : "failed",
          sentAt: success ? new Date() : undefined,
          errorMessage: success ? undefined : "Email send failed",
        });

        if (success) sent++;
        else errors++;
      } catch (err) {
        console.error(`[CRM Agent] Error processing follow-up ${action.id}:`, err);
        await updateFollowUpAction(action.id, {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        errors++;
      }
    }
  } catch (err) {
    console.error("[CRM Agent] Error in processDueFollowUps:", err);
    errors++;
  }

  return { sent, errors };
}

/**
 * Escalate leads that have been assigned but not contacted for 48+ hours
 */
async function escalateStaleLeads(): Promise<{ escalated: number; errors: number }> {
  let escalated = 0;
  let errors = 0;

  // Safety: cap escalation emails per run to prevent email floods from old/bulk data
  const MAX_ESCALATIONS_PER_RUN = 5;
  // Safety: skip assignments older than 7 days — these are clearly old/test data
  const MAX_ASSIGNMENT_AGE_DAYS = 7;
  const maxAgeMs = MAX_ASSIGNMENT_AGE_DAYS * 24 * 60 * 60 * 1000;

  try {
    const staleAssignments = await getStaleAssignments(48);
    console.log(`[CRM Agent] Found ${staleAssignments.length} stale assignments to escalate`);

    for (const assignment of staleAssignments) {
      // Rate-limit guard: stop after MAX_ESCALATIONS_PER_RUN emails per cycle
      if (escalated >= MAX_ESCALATIONS_PER_RUN) {
        console.log(`[CRM Agent] Escalation cap reached (${MAX_ESCALATIONS_PER_RUN}/run). Remaining assignments will be escalated in next cycle.`);
        break;
      }

      // Age guard: skip assignments older than 7 days — mark as escalated without emailing
      const ageMs = Date.now() - new Date(assignment.assignedAt).getTime();
      if (ageMs > maxAgeMs) {
        console.log(`[CRM Agent] Skipping old assignment ${assignment.id} (${assignment.studentName}) — older than ${MAX_ASSIGNMENT_AGE_DAYS} days, marking escalated without email`);
        await updateLeadAssignment(assignment.id, {
          status: "escalated",
          escalatedAt: new Date(),
          escalationReason: `Auto-escalated without email — assignment older than ${MAX_ASSIGNMENT_AGE_DAYS} days`,
        });
        continue;
      }

      try {
        await updateLeadAssignment(assignment.id, {
          status: "escalated",
          escalatedAt: new Date(),
          escalationReason: "No contact within 48 hours of assignment",
        });

        // Send escalation email to admin
        await sendEmail({
          to: "hadi@spectaeducation.com",
          subject: `⚠️ Lead Escalation: ${assignment.studentName} (assigned to ${assignment.counselorName})`,
          html: buildEscalationEmail(assignment),
        });

        escalated++;
      } catch (err) {
        console.error(`[CRM Agent] Error escalating assignment ${assignment.id}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("[CRM Agent] Error in escalateStaleLeads:", err);
    errors++;
  }

  return { escalated, errors };
}

// ==========================================
// Email Templates
// ==========================================

function sendCounselorNotification(data: any): Promise<boolean> {
  return sendEmail({
    to: data.counselorEmail,
    subject: `🔔 New Lead Assigned: ${data.studentName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#e53e3e;margin:0;">SpecTa Education</h2>
        <p style="color:#666;margin:4px 0 0;">AI Agent CRM System</p>
      </div>
      <h3 style="color:#1a1a1a;">Hi ${data.counselorName}, you have a new lead! 🎯</h3>
      <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #e53e3e;">
        <p style="margin:4px 0;"><strong>Student:</strong> ${data.studentName}</p>
        ${data.studentEmail ? `<p style="margin:4px 0;"><strong>Email:</strong> ${data.studentEmail}</p>` : ""}
        ${data.studentPhone ? `<p style="margin:4px 0;"><strong>Phone:</strong> ${data.studentPhone}</p>` : ""}
        ${data.preferredCountry ? `<p style="margin:4px 0;"><strong>Interested in:</strong> ${data.preferredCountry}</p>` : ""}
      </div>
      <p style="color:#333;line-height:1.6;">Please reach out to this student within <strong>24 hours</strong>. The AI system will track your follow-up progress.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://www.spectaeducation.com/staff-dashboard" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">View in Dashboard</a>
      </div>
      <div style="text-align:center;color:#999;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
        <p>© ${new Date().getFullYear()} SpecTa Education AI Agent System</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  });
}

function sendStudentFollowUp(data: any, dayOffset: number): Promise<boolean> {
  if (!data.studentEmail) return Promise.resolve(false);

  const templates: Record<number, { subject: string; body: string }> = {
    0: {
      subject: "Welcome to SpecTa Education! 🎓",
      body: `
        <h3>Hai ${data.studentName}! 👋</h3>
        <p>Terima kasih sudah menghubungi SpecTa Education! Kami sangat senang bisa membantu perjalanan studi kamu ke luar negeri.</p>
        <p>Konselor kami, <strong>${data.counselorName}</strong>, akan segera menghubungi kamu untuk membahas rencana studi kamu lebih lanjut.</p>
        <p><em>Thank you for reaching out to SpecTa Education! We're excited to help you with your study abroad journey. Our counselor, <strong>${data.counselorName}</strong>, will contact you soon.</em></p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://www.spectaeducation.com/book" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">Book a Free Consultation</a>
        </div>
      `,
    },
    3: {
      subject: "How can we help you study abroad? 🌏",
      body: `
        <h3>Hai ${data.studentName}! 🌟</h3>
        <p>Sudah beberapa hari sejak kamu menghubungi kami. Apakah ada pertanyaan tentang kuliah di luar negeri yang bisa kami bantu?</p>
        ${data.preferredCountry ? `<p>Kami melihat kamu tertarik untuk belajar di <strong>${data.preferredCountry}</strong> — kami punya banyak informasi dan partner universitas di sana!</p>` : ""}
        <p><em>It's been a few days since you reached out. Do you have any questions about studying abroad that we can help with?</em></p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://www.spectaeducation.com/destinations" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">Explore Destinations</a>
        </div>
      `,
    },
    14: {
      subject: "Your study abroad journey awaits! ✈️",
      body: `
        <h3>Hai ${data.studentName}! ✈️</h3>
        <p>Kami ingin mengingatkan bahwa SpecTa Education siap membantu kamu kapan saja. Jangan ragu untuk menghubungi kami jika ada pertanyaan!</p>
        <p>Tahukah kamu? Kami juga menyediakan:</p>
        <ul>
          <li>🎯 Tes Bakat AI untuk menemukan jurusan yang cocok</li>
          <li>📚 Persiapan IELTS dengan jaminan skor</li>
          <li>🏫 Bantuan aplikasi ke 500+ universitas partner</li>
          <li>💰 Informasi beasiswa terbaru</li>
        </ul>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://www.spectaeducation.com/play/aptitude" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">Take Free Aptitude Test</a>
        </div>
      `,
    },
    30: {
      subject: "Still thinking about studying abroad? 🤔",
      body: `
        <h3>Hai ${data.studentName}! 🤔</h3>
        <p>Sudah sebulan sejak kamu pertama kali menghubungi SpecTa Education. Kami masih di sini untuk membantu!</p>
        <p>Banyak mahasiswa kami yang memulai perjalanan mereka dengan satu pertanyaan sederhana. Jika kamu siap untuk mengambil langkah selanjutnya, kami siap membantu.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://www.spectaeducation.com/contact" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">Contact Us</a>
        </div>
      `,
    },
  };

  const template = templates[dayOffset];
  if (!template) return Promise.resolve(false);

  return sendEmail({
    to: data.studentEmail,
    subject: template.subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#e53e3e;margin:0;">SpecTa Education</h2>
      </div>
      <div style="color:#333;line-height:1.6;font-size:15px;">
        ${template.body}
      </div>
      <div style="text-align:center;color:#999;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
        <p>© ${new Date().getFullYear()} SpecTa Education • <a href="https://www.spectaeducation.com" style="color:#e53e3e;">spectaeducation.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  });
}

function sendCounselorReminder(data: any, dayOffset: number): Promise<boolean> {
  const urgency = dayOffset >= 7 ? "⚠️ URGENT" : "📋 Reminder";

  return sendEmail({
    to: data.counselorEmail,
    subject: `${urgency}: Follow up with ${data.studentName} (Day ${dayOffset})`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#e53e3e;margin:0;">SpecTa Education</h2>
        <p style="color:#666;margin:4px 0 0;">AI Agent Follow-Up Reminder</p>
      </div>
      <h3 style="color:#1a1a1a;">${urgency}: Follow-up needed</h3>
      <p style="color:#333;line-height:1.6;">Hi ${data.counselorName}, this is a Day ${dayOffset} reminder to follow up with your assigned lead:</p>
      <div style="background:#fff3cd;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #ffc107;">
        <p style="margin:4px 0;"><strong>Student:</strong> ${data.studentName}</p>
        ${data.studentEmail ? `<p style="margin:4px 0;"><strong>Email:</strong> ${data.studentEmail}</p>` : ""}
        ${data.studentPhone ? `<p style="margin:4px 0;"><strong>Phone:</strong> ${data.studentPhone}</p>` : ""}
      </div>
      ${dayOffset >= 7 ? `<p style="color:#dc3545;font-weight:bold;">⚠️ This lead will be escalated to management if not contacted within 48 hours.</p>` : ""}
      <div style="text-align:center;margin:24px 0;">
        <a href="https://www.spectaeducation.com/staff-dashboard" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">Open Dashboard</a>
      </div>
    </div>
  </div>
</body>
</html>`,
  });
}

function sendEscalationAlert(data: any): Promise<boolean> {
  return sendEmail({
    to: "hadi@spectaeducation.com",
    subject: `🚨 Lead Escalation: ${data.studentName}`,
    html: buildEscalationEmail(data),
  });
}

/**
 * Send admin notification when a new lead is assigned to a counselor
 */
async function sendAdminAssignmentNotification(data: {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  preferredCountry: string;
  counselorName: string;
  counselorEmail: string;
  leadSource: string;
  priority: string;
}): Promise<void> {
  try {
    const priorityColors: Record<string, string> = {
      urgent: "#dc3545",
      high: "#fd7e14",
      medium: "#ffc107",
      low: "#28a745",
    };
    const priorityColor = priorityColors[data.priority] || "#6c757d";
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "short" });

    await sendEmail({
      to: "hadi@spectaeducation.com",
      subject: `📋 New Lead Assigned: ${data.studentName} → ${data.counselorName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#e53e3e;margin:0;">SpecTa Education</h2>
        <p style="color:#666;margin:4px 0 0;">AI Agent — New Lead Assignment</p>
      </div>
      <h3 style="color:#1a1a1a;margin-bottom:16px;">New lead has been assigned! 📋</h3>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 8px;color:#666;font-weight:600;width:140px;">Student Name</td>
          <td style="padding:10px 8px;color:#1a1a1a;font-weight:600;">${data.studentName}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 8px;color:#666;font-weight:600;">Email</td>
          <td style="padding:10px 8px;color:#1a1a1a;">${data.studentEmail}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 8px;color:#666;font-weight:600;">Phone</td>
          <td style="padding:10px 8px;color:#1a1a1a;">${data.studentPhone}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 8px;color:#666;font-weight:600;">Interest</td>
          <td style="padding:10px 8px;color:#1a1a1a;">${data.preferredCountry}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 8px;color:#666;font-weight:600;">Lead Source</td>
          <td style="padding:10px 8px;color:#1a1a1a;">${data.leadSource}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 8px;color:#666;font-weight:600;">Priority</td>
          <td style="padding:10px 8px;"><span style="background:${priorityColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;text-transform:uppercase;">${data.priority}</span></td>
        </tr>
        <tr>
          <td style="padding:10px 8px;color:#666;font-weight:600;">Assigned To</td>
          <td style="padding:10px 8px;color:#e53e3e;font-weight:700;">${data.counselorName} (${data.counselorEmail})</td>
        </tr>
      </table>
      <p style="color:#888;font-size:13px;margin-top:12px;">Assigned at: ${now}</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://www.spectaeducation.com/admin/agents" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;margin-right:8px;">View Agent Dashboard</a>
        <a href="https://www.spectaeducation.com/admin" style="display:inline-block;background:#333;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">Admin Dashboard</a>
      </div>
      <div style="text-align:center;color:#999;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
        <p>© ${new Date().getFullYear()} SpecTa Education AI Agent System</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    });
    console.log(`[CRM Agent] Admin notified: ${data.studentName} → ${data.counselorName}`);
  } catch (err) {
    console.error("[CRM Agent] Failed to send admin notification:", err);
  }
}

function buildEscalationEmail(assignment: any): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#dc3545;margin:0;">🚨 Lead Escalation Alert</h2>
        <p style="color:#666;margin:4px 0 0;">SpecTa Education AI Agent System</p>
      </div>
      <p style="color:#333;line-height:1.6;">A lead has been escalated because the assigned counselor has not made contact within 48 hours.</p>
      <div style="background:#f8d7da;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #dc3545;">
        <p style="margin:4px 0;"><strong>Student:</strong> ${assignment.studentName}</p>
        <p style="margin:4px 0;"><strong>Email:</strong> ${assignment.studentEmail || "N/A"}</p>
        <p style="margin:4px 0;"><strong>Phone:</strong> ${assignment.studentPhone || "N/A"}</p>
        <p style="margin:4px 0;"><strong>Country Interest:</strong> ${assignment.preferredCountry || "N/A"}</p>
        <p style="margin:4px 0;"><strong>Assigned to:</strong> ${assignment.counselorName} (${assignment.counselorEmail})</p>
        <p style="margin:4px 0;"><strong>Assigned at:</strong> ${new Date(assignment.assignedAt).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}</p>
      </div>
      <p style="color:#333;line-height:1.6;"><strong>Action needed:</strong> Please reassign this lead or follow up directly.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://www.spectaeducation.com/admin" style="display:inline-block;background:#dc3545;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">Open Admin Dashboard</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
