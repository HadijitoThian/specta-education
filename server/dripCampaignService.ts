import crypto from "crypto";
import {
  getDueEnrollments,
  getDripEmailStepsByCampaignId,
  getDripCampaignById,
  updateDripEnrollment,
  createDripEmailLog,
  createDripEnrollment,
  getDripEnrollmentByEmailAndCampaign,
  getAllDripCampaigns,
  getAllLeads,
  getAllScholarshipLeads,
  getAllQuizResults,
  getAllAptitudeResults,
  getCampaignPerformanceMetrics,
} from "./db";
import { sendEmail } from "./email";
import { notifyOwner } from "./_core/notification";

/**
 * Process all due drip campaign emails.
 * Called periodically (e.g. every hour) by the scheduler.
 */
export async function processDripEmails(): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  try {
    const dueEnrollments = await getDueEnrollments();
    
    if (dueEnrollments.length === 0) {
      return { sent: 0, errors: 0 };
    }

    console.log(`[DripCampaign] Processing ${dueEnrollments.length} due enrollments`);

    for (const enrollment of dueEnrollments) {
      try {
        const campaign = await getDripCampaignById(enrollment.campaignId);
        if (!campaign || !campaign.isActive) {
          // Campaign deactivated, pause enrollment
          await updateDripEnrollment(enrollment.id, { status: "paused" });
          continue;
        }

        const steps = await getDripEmailStepsByCampaignId(enrollment.campaignId);
        const activeSteps = steps.filter(s => s.isActive);
        
        // Find the next step to send
        const nextStepOrder = enrollment.currentStepOrder + 1;
        const nextStep = activeSteps.find(s => s.stepOrder === nextStepOrder);

        if (!nextStep) {
          // No more steps — mark as completed
          await updateDripEnrollment(enrollment.id, {
            status: "completed",
            completedAt: new Date(),
            nextSendAt: null,
          });
          console.log(`[DripCampaign] Enrollment ${enrollment.id} completed (no more steps)`);
          continue;
        }

        // Personalize the email content
        const personalizedHtml = personalizeContent(nextStep.htmlContent, {
          name: enrollment.contactName,
          email: enrollment.contactEmail,
          unsubscribeToken: enrollment.unsubscribeToken,
        });

        const personalizedSubject = personalizeContent(nextStep.subject, {
          name: enrollment.contactName,
          email: enrollment.contactEmail,
          unsubscribeToken: enrollment.unsubscribeToken,
        });

        // Send the email
        const success = await sendEmail({
          to: enrollment.contactEmail,
          subject: personalizedSubject,
          html: personalizedHtml,
        });

        // Log the email
        await createDripEmailLog({
          enrollmentId: enrollment.id,
          stepId: nextStep.id,
          contactEmail: enrollment.contactEmail,
          subject: personalizedSubject,
          status: success ? "sent" : "failed",
        });

        if (success) {
          sent++;
          
          // Find the next step after this one
          const followingStep = activeSteps.find(s => s.stepOrder === nextStepOrder + 1);
          
          if (followingStep) {
            // Calculate next send time
            const nextSendAt = new Date();
            nextSendAt.setDate(nextSendAt.getDate() + followingStep.delayDays);
            
            await updateDripEnrollment(enrollment.id, {
              currentStepOrder: nextStepOrder,
              lastEmailSentAt: new Date(),
              nextSendAt,
            });
          } else {
            // This was the last step
            await updateDripEnrollment(enrollment.id, {
              currentStepOrder: nextStepOrder,
              lastEmailSentAt: new Date(),
              nextSendAt: null,
              status: "completed",
              completedAt: new Date(),
            });
          }
          
          console.log(`[DripCampaign] Sent step ${nextStepOrder} to ${enrollment.contactEmail} (campaign: ${campaign.name})`);
        } else {
          errors++;
          console.error(`[DripCampaign] Failed to send step ${nextStepOrder} to ${enrollment.contactEmail}`);
        }
      } catch (err) {
        errors++;
        console.error(`[DripCampaign] Error processing enrollment ${enrollment.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[DripCampaign] Fatal error in processDripEmails:", err);
  }

  // Notify owner if any emails were sent
  if (sent > 0 || errors > 0) {
    try {
      await notifyOwner({
        title: `📧 Drip Campaign Report: ${sent} emails sent`,
        content: [
          `Drip Campaign Email Processing Complete`,
          ``,
          `✅ Emails sent successfully: ${sent}`,
          errors > 0 ? `❌ Errors: ${errors}` : ``,
          ``,
          `Time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}`,
          ``,
          `You can view detailed analytics in the Admin Dashboard → Campaigns tab.`,
        ].filter(Boolean).join("\n"),
      });
    } catch (notifyErr) {
      console.error("[DripCampaign] Failed to notify owner:", notifyErr);
    }
  }

  return { sent, errors };
}

/**
 * Enroll a contact into all matching campaigns based on trigger source.
 * Prevents duplicate enrollments.
 */
export async function autoEnrollContact({
  email,
  name,
  phone,
  triggerSource,
}: {
  email: string;
  name: string;
  phone?: string;
  triggerSource: "aptitude_test" | "contact_form" | "scholarship_form" | "quiz" | "pro_purchase";
}): Promise<number> {
  let enrolled = 0;

  try {
    const allCampaigns = await getAllDripCampaigns();
    const matchingCampaigns = allCampaigns.filter(
      c => c.isActive && c.triggerSource === triggerSource
    );

    for (const campaign of matchingCampaigns) {
      // Check if already enrolled
      const existing = await getDripEnrollmentByEmailAndCampaign(email, campaign.id);
      if (existing) {
        console.log(`[DripCampaign] ${email} already enrolled in campaign "${campaign.name}"`);
        continue;
      }

      // Get the first step to calculate initial nextSendAt
      const steps = await getDripEmailStepsByCampaignId(campaign.id);
      const firstStep = steps.find(s => s.isActive && s.stepOrder === 1);
      
      let nextSendAt: Date | null = null;
      if (firstStep) {
        nextSendAt = new Date();
        nextSendAt.setDate(nextSendAt.getDate() + firstStep.delayDays);
      }

      const unsubscribeToken = crypto.randomBytes(32).toString("hex");

      await createDripEnrollment({
        campaignId: campaign.id,
        contactEmail: email,
        contactName: name,
        contactPhone: phone,
        source: triggerSource,
        currentStepOrder: 0,
        status: "active",
        nextSendAt,
        unsubscribeToken,
      });

      enrolled++;
      console.log(`[DripCampaign] Enrolled ${email} in campaign "${campaign.name}"`);
    }
  } catch (err) {
    console.error(`[DripCampaign] Error auto-enrolling ${email}:`, err);
  }

  return enrolled;
}

/**
 * Bulk enroll all leads from all sources into a specific campaign.
 * Collects leads from: leads table, scholarship_leads, quiz_results, aptitude_results.
 * Skips contacts already enrolled in this campaign.
 */
export async function bulkEnrollAllLeads(campaignId: number): Promise<{ enrolled: number; skipped: number; total: number }> {
  let enrolled = 0;
  let skipped = 0;

  try {
    const campaign = await getDripCampaignById(campaignId);
    if (!campaign) throw new Error("Campaign not found");

    // Collect all unique email contacts from all sources
    const contactMap = new Map<string, { email: string; name: string; phone?: string; source: string }>();

    // 1. Leads table
    try {
      const leads = await getAllLeads();
      for (const lead of leads) {
        if (lead.studentEmail && !contactMap.has(lead.studentEmail)) {
          contactMap.set(lead.studentEmail, {
            email: lead.studentEmail,
            name: lead.studentName || "Student",
            phone: lead.studentPhone || undefined,
            source: "contact_form",
          });
        }
      }
    } catch (e) {
      console.error("[BulkEnroll] Error fetching leads:", e);
    }

    // 2. Scholarship leads
    try {
      const scholarshipLeads = await getAllScholarshipLeads();
      for (const lead of scholarshipLeads) {
        if (lead.studentEmail && !contactMap.has(lead.studentEmail)) {
          contactMap.set(lead.studentEmail, {
            email: lead.studentEmail,
            name: lead.studentName || "Student",
            phone: lead.studentPhone || undefined,
            source: "scholarship_form",
          });
        }
      }
    } catch (e) {
      console.error("[BulkEnroll] Error fetching scholarship leads:", e);
    }

    // 3. Quiz results
    try {
      const quizResults = await getAllQuizResults();
      for (const result of quizResults) {
        if (result.studentEmail && !contactMap.has(result.studentEmail)) {
          contactMap.set(result.studentEmail, {
            email: result.studentEmail,
            name: result.studentName || "Student",
            phone: result.studentPhone || undefined,
            source: "quiz",
          });
        }
      }
    } catch (e) {
      console.error("[BulkEnroll] Error fetching quiz results:", e);
    }

    // 4. Aptitude test results
    try {
      const aptitudeResults = await getAllAptitudeResults();
      for (const result of aptitudeResults) {
        if (result.studentEmail && !contactMap.has(result.studentEmail)) {
          contactMap.set(result.studentEmail, {
            email: result.studentEmail,
            name: result.studentName || "Student",
            phone: result.studentPhone || undefined,
            source: "aptitude_test",
          });
        }
      }
    } catch (e) {
      console.error("[BulkEnroll] Error fetching aptitude results:", e);
    }

    const total = contactMap.size;
    console.log(`[BulkEnroll] Found ${total} unique contacts across all sources`);

    // Get first step for nextSendAt calculation
    const steps = await getDripEmailStepsByCampaignId(campaignId);
    const firstStep = steps.find(s => s.isActive && s.stepOrder === 1);

    const entries = Array.from(contactMap.entries());
    for (const [email, contact] of entries) {
      // Check if already enrolled
      const existing = await getDripEnrollmentByEmailAndCampaign(email, campaignId);
      if (existing) {
        skipped++;
        continue;
      }

      let nextSendAt: Date | null = null;
      if (firstStep) {
        nextSendAt = new Date();
        nextSendAt.setDate(nextSendAt.getDate() + firstStep.delayDays);
      }

      const unsubscribeToken = crypto.randomBytes(32).toString("hex");

      await createDripEnrollment({
        campaignId,
        contactEmail: email,
        contactName: contact.name,
        contactPhone: contact.phone,
        source: contact.source,
        currentStepOrder: 0,
        status: "active",
        nextSendAt,
        unsubscribeToken,
      });

      enrolled++;
    }

    console.log(`[BulkEnroll] Campaign "${campaign.name}": ${enrolled} enrolled, ${skipped} skipped (already enrolled)`);

    // Notify owner
    await notifyOwner({
      title: `📢 Bulk Enrollment Complete: ${campaign.name}`,
      content: `Bulk enrollment completed for campaign "${campaign.name}"\n\nTotal leads found: ${total}\nNewly enrolled: ${enrolled}\nAlready enrolled (skipped): ${skipped}`,
    }).catch(() => {});

  } catch (err) {
    console.error("[BulkEnroll] Error:", err);
    throw err;
  }

  return { enrolled, skipped, total: enrolled + skipped };
}

/**
 * Check campaign performance and send smart alerts to owner.
 * Called after processing drip emails or on a schedule.
 * Alerts on: low open rates (<15%), high unsubscribe rates (>10%), low click rates (<3%)
 */
export async function checkCampaignPerformanceAlerts(): Promise<void> {
  try {
    const metrics = await getCampaignPerformanceMetrics();
    if (metrics.length === 0) return;

    const alerts: string[] = [];

    for (const campaign of metrics) {
      const issues: string[] = [];

      // Low open rate alert (< 15%)
      if (campaign.openRate < 15 && campaign.totalSent >= 20) {
        issues.push(`⚠️ Low open rate: ${campaign.openRate}% (industry avg: 20-25%). Tip: Try more compelling subject lines, use personalization ({{name}}), or test sending at different times.`);
      }

      // High unsubscribe rate alert (> 10%)
      if (campaign.unsubscribeRate > 10 && campaign.totalEnrolled >= 10) {
        issues.push(`🚨 High unsubscribe rate: ${campaign.unsubscribeRate}%. Tip: Review email frequency (consider longer delays between emails), ensure content is relevant, or add more value before CTAs.`);
      }

      // Low click rate alert (< 3%)
      if (campaign.clickRate < 3 && campaign.totalSent >= 20) {
        issues.push(`📉 Low click rate: ${campaign.clickRate}%. Tip: Make CTAs more prominent, use action-oriented button text, and ensure links are relevant to the email content.`);
      }

      // Good performance recognition
      if (campaign.openRate >= 30 && campaign.clickRate >= 8 && campaign.totalSent >= 20) {
        issues.push(`🌟 Excellent performance! Open rate: ${campaign.openRate}%, Click rate: ${campaign.clickRate}%. This campaign is performing above industry averages.`);
      }

      if (issues.length > 0) {
        alerts.push(`📊 Campaign: "${campaign.campaignName}"\n   Sent: ${campaign.totalSent} | Opens: ${campaign.openRate}% | Clicks: ${campaign.clickRate}% | Unsubs: ${campaign.unsubscribeRate}%\n   ${issues.join("\n   ")}`);
      }
    }

    if (alerts.length > 0) {
      await notifyOwner({
        title: `📊 Campaign Performance Alert`,
        content: [
          `Campaign Performance Report`,
          ``,
          ...alerts,
          ``,
          `Time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}`,
          `View detailed analytics in Admin Dashboard → Campaigns tab.`,
        ].join("\n"),
      });
      console.log(`[DripCampaign] Sent performance alerts for ${alerts.length} campaigns`);
    }
  } catch (err) {
    console.error("[DripCampaign] Error checking performance alerts:", err);
  }
}

/**
 * Replace template variables in email content.
 * Supported: {{name}}, {{email}}, {{unsubscribe_url}}
 */
function personalizeContent(content: string, vars: {
  name: string;
  email: string;
  unsubscribeToken: string;
}): string {
  const baseUrl = process.env.VITE_APP_URL || (process.env.NODE_ENV === "production" ? "https://spectaeducation.com" : "http://localhost:3000");
  const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${vars.unsubscribeToken}`;

  return content
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{email\}\}/g, vars.email)
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
}
