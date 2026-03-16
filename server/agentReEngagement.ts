/**
 * Agent 8 — Re-Engagement Agent
 * 
 * Identifies cold leads (7+ days no response) and sends personalised
 * re-engagement emails with new offers, success stories, or urgency triggers.
 * Schedule: Daily at 2:00 PM
 */

import { createAgentRunLog, updateAgentRunLog } from "./db";
import { sendEmail } from "./email";
import { invokeLLM } from "./_core/llm";
import { drizzle } from "drizzle-orm/mysql2";
import { leads, aptitudeResults } from "../drizzle/schema";
import { sql, and } from "drizzle-orm";

interface ColdLead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  source: "chatbot" | "aptitude" | "scholarship";
  daysSinceLastContact: number;
  interest?: string;
}

const RE_ENGAGEMENT_TEMPLATES = [
  { name: "success_story", subject: "🎓 Teman kamu sudah diterima di Australia! Kapan giliran kamu?", hook: "Share a success story of a student who got accepted" },
  { name: "scholarship_alert", subject: "💰 Beasiswa baru tersedia! Deadline segera", hook: "Mention a scholarship opportunity with urgency" },
  { name: "free_consultation", subject: "📞 Konsultasi GRATIS masih tersedia untuk kamu!", hook: "Remind about free consultation offer" },
  { name: "new_feature", subject: "🆕 SpecTa 2.0 punya fitur baru! Coba sekarang", hook: "Highlight new AI features on the platform" },
];

export async function runReEngagementAgent(): Promise<{ coldLeadsFound: number; emailsSent: number; errors: number }> {
  const runLog = await createAgentRunLog({ agentName: "re_engagement", status: "running", startedAt: new Date() });
  let coldLeadsFound = 0;
  let emailsSent = 0;
  let errors = 0;

  try {
    const db = drizzle(process.env.DATABASE_URL!);
    const coldLeads: ColdLead[] = [];

    // Source 1: Chatbot leads with no response for 7+ days
    const chatbotLeads = await db.select().from(leads).where(
      and(sql`status IN ('new', 'contacted')`, sql`created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`, sql`(re_engagement_sent IS NULL OR re_engagement_sent = 0)`)
    ).limit(15);

    for (const lead of chatbotLeads) {
      coldLeads.push({
        id: lead.id, name: lead.studentName || "Student", email: lead.studentEmail || "",
        phone: lead.studentPhone || null, source: "chatbot",
        daysSinceLastContact: Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000),
        interest: lead.preferredCountry || undefined,
      });
    }

    // Source 2: Aptitude test completers who never followed up (14+ days)
    const aptitudeLeads = await db.select().from(aptitudeResults).where(
      and(sql`created_at < DATE_SUB(NOW(), INTERVAL 14 DAY)`, sql`(re_engagement_sent IS NULL OR re_engagement_sent = 0)`)
    ).limit(15);

    for (const lead of aptitudeLeads) {
      if (!lead.studentEmail) continue;
      coldLeads.push({
        id: lead.id, name: lead.studentName || "Student", email: lead.studentEmail,
        phone: lead.studentPhone || null, source: "aptitude",
        daysSinceLastContact: Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000),
        interest: lead.hollandCode ? `Holland Code: ${lead.hollandCode}` : undefined,
      });
    }

    coldLeadsFound = coldLeads.length;
    console.log(`[Re-Engagement] Found ${coldLeadsFound} cold leads`);

    for (const lead of coldLeads) {
      if (!lead.email) continue;
      try {
        const template = RE_ENGAGEMENT_TEMPLATES[lead.id % RE_ENGAGEMENT_TEMPLATES.length];
        let emailBody = "";
        try {
          const llmResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are a friendly education counselor at SpecTa Education. Write a short re-engagement email in Bahasa Indonesia (max 100 words). Be warm, not pushy. Include a clear CTA." },
              { role: "user", content: `Write a re-engagement email for ${lead.name} who showed interest ${lead.daysSinceLastContact} days ago (source: ${lead.source}, interest: ${lead.interest || "study abroad"}). Theme: ${template.hook}. End with link to https://www.spectaeducation.com/contact or WhatsApp https://wa.me/62818668277` }
            ],
          });
          const content = llmResponse.choices?.[0]?.message?.content;
          emailBody = typeof content === "string" ? content : "";
        } catch {
          emailBody = `Hai ${lead.name}! Kami dari SpecTa Education ingin mengingatkan bahwa konsultasi GRATIS masih tersedia untuk kamu. Hubungi kami di WhatsApp: +62 818 668 277`;
        }

        const emailHtml = `<div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;text-align:center;border-radius:12px 12px 0 0;"><h2 style="color:#fff;margin:0;">SpecTa Education</h2></div>
          <div style="padding:24px;background:#fff;"><div style="white-space:pre-line;color:#4a5568;line-height:1.7;">${emailBody}</div>
          <div style="text-align:center;margin:24px 0;"><a href="https://www.spectaeducation.com/contact" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">📞 Konsultasi Gratis</a></div>
          <div style="text-align:center;"><a href="https://wa.me/62818668277" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;">💬 WhatsApp Kami</a></div></div>
          <div style="background:#f7fafc;padding:16px;text-align:center;border-radius:0 0 12px 12px;"><p style="color:#a0aec0;font-size:11px;margin:0;">SpecTa Education — Indonesia's First AI-Powered Study Abroad Platform</p></div></div>`;

        await sendEmail({ to: lead.email, subject: template.subject, html: emailHtml });

        if (lead.source === "chatbot") {
          await db.execute(sql`UPDATE leads SET re_engagement_sent = 1 WHERE id = ${lead.id}`);
        } else if (lead.source === "aptitude") {
          await db.execute(sql`UPDATE aptitude_results SET re_engagement_sent = 1 WHERE id = ${lead.id}`);
        }
        emailsSent++;
        console.log(`[Re-Engagement] Sent to ${lead.email} (${lead.source}, ${lead.daysSinceLastContact}d cold)`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`[Re-Engagement] Error for ${lead.email}:`, err);
        errors++;
      }
    }

    if (runLog) {
      await updateAgentRunLog(runLog.id, { status: "success", completedAt: new Date(), summary: `Found ${coldLeadsFound} cold leads, sent ${emailsSent} re-engagement emails, ${errors} errors`, itemsProcessed: coldLeadsFound });
    }
  } catch (err) {
    console.error("[Re-Engagement] Fatal error:", err);
    if (runLog) {
      await updateAgentRunLog(runLog.id, { status: "failed", completedAt: new Date(), summary: `Fatal error: ${err instanceof Error ? err.message : String(err)}` });
    }
    errors++;
  }

  return { coldLeadsFound, emailsSent, errors };
}
