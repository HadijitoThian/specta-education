/**
 * Agent — University Partnership Reply Handler
 *
 * Responsibilities:
 * 1. Receive inbound email webhook from Resend (email.received event)
 * 2. Check if sender matches a university we sent outreach to
 * 3. Fetch full email body from Resend API
 * 4. Use LLM to classify reply (interested/needs_more_info/declined/counter_offer/meeting_request)
 * 5. Draft an appropriate response
 * 6. Queue it for Hadi's approval in the Agent Command Center
 * 7. Send notification to Hadi that a reply needs review
 * 8. When approved, send the drafted response via email
 */

import { invokeLLM } from "./_core/llm";
import { sendEmail } from "./email";
import { getDb as getSharedDb, withDbRetry } from "./db";
import { universityPartnerships, universityReplyQueue } from "../drizzle/schema";
import { eq, or, like, and, isNotNull } from "drizzle-orm";

async function getDb() {
  return getSharedDb();
}

// ==========================================
// Resend API helpers
// ==========================================

/**
 * Fetch the full email body from Resend's Received Emails API
 */
async function fetchEmailBody(emailId: string): Promise<string | null> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[ReplyHandler] Failed to fetch email body for ${emailId}: ${response.status}`);
      return null;
    }

    const data = await response.json() as any;
    // Try text body first, then HTML (strip tags)
    if (data.text) return data.text;
    if (data.html) {
      // Strip HTML tags for plain text
      return data.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    return null;
  } catch (err) {
    console.error("[ReplyHandler] Error fetching email body:", err);
    return null;
  }
}

// ==========================================
// Match sender to university outreach record
// ==========================================

/**
 * Extract domain from email address
 */
function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

/**
 * Find the university partnership record that matches the sender
 */
async function findMatchingUniversity(
  fromEmail: string,
  subject: string,
  db: any
): Promise<{ id: number; universityName: string; country: string; outreachRecipientEmail: string | null } | null> {
  const senderDomain = extractDomain(fromEmail);
  const senderEmailLower = fromEmail.toLowerCase();

  // Get all universities that have been sent outreach (email_sent, follow_up_sent, responded)
  const sentUniversities = await db.select({
    id: universityPartnerships.id,
    universityName: universityPartnerships.universityName,
    country: universityPartnerships.country,
    outreachRecipientEmail: universityPartnerships.outreachRecipientEmail,
    agentRecruitmentEmail: universityPartnerships.agentRecruitmentEmail,
    internationalOfficeEmail: universityPartnerships.internationalOfficeEmail,
    websiteUrl: universityPartnerships.websiteUrl,
  })
    .from(universityPartnerships)
    .where(
      or(
        eq(universityPartnerships.outreachStatus, "email_sent"),
        eq(universityPartnerships.outreachStatus, "follow_up_sent"),
        eq(universityPartnerships.outreachStatus, "responded"),
        eq(universityPartnerships.outreachStatus, "meeting_scheduled"),
        eq(universityPartnerships.outreachStatus, "agreement_pending"),
      )
    );

  if (!sentUniversities.length) return null;

  // Strategy 1: Exact email match
  for (const uni of sentUniversities) {
    const knownEmails = [
      uni.outreachRecipientEmail,
      uni.agentRecruitmentEmail,
      uni.internationalOfficeEmail,
    ].filter(Boolean).map(e => e!.toLowerCase());

    if (knownEmails.includes(senderEmailLower)) {
      return uni;
    }
  }

  // Strategy 2: Domain match against university website
  for (const uni of sentUniversities) {
    if (!uni.websiteUrl) continue;
    try {
      const uniDomain = new URL(uni.websiteUrl.startsWith("http") ? uni.websiteUrl : `https://${uni.websiteUrl}`).hostname
        .replace("www.", "")
        .toLowerCase();
      if (senderDomain === uniDomain || senderDomain.endsWith(`.${uniDomain}`)) {
        return uni;
      }
    } catch {}
  }

  // Strategy 3: University name in subject line (fallback)
  const subjectLower = subject.toLowerCase();
  for (const uni of sentUniversities) {
    const uniNameWords = uni.universityName.toLowerCase().split(" ").filter((w: string) => w.length > 3);
    const matchCount = uniNameWords.filter((w: string) => subjectLower.includes(w)).length;
    if (matchCount >= 2) {
      return uni;
    }
  }

  return null;
}

// ==========================================
// LLM Classification & Response Drafting
// ==========================================

interface ReplyAnalysis {
  classification: "interested" | "needs_more_info" | "declined" | "counter_offer" | "meeting_request" | "unknown";
  classificationReason: string;
  sentiment: "positive" | "neutral" | "negative";
  urgency: "low" | "medium" | "high";
  keyPoints: string[];
  draftedSubject: string;
  draftedResponse: string;
}

async function analyzeReplyAndDraftResponse(
  universityName: string,
  country: string,
  emailBody: string,
  subject: string,
  fromName: string | null
): Promise<ReplyAnalysis> {
  const prompt = `You are an expert education consultant at SpecTa Education, Indonesia's leading AI-powered study abroad platform.

You received a reply from ${universityName} (${country}) in response to our partnership outreach email.

INCOMING EMAIL:
Subject: ${subject}
From: ${fromName || "Unknown"}
Body:
${emailBody}

Analyze this reply and draft a professional response. Return a JSON object with:
{
  "classification": one of: "interested" | "needs_more_info" | "declined" | "counter_offer" | "meeting_request" | "unknown",
  "classificationReason": "Brief explanation of why you classified it this way (1-2 sentences)",
  "sentiment": "positive" | "neutral" | "negative",
  "urgency": "low" | "medium" | "high" (high = they want a quick response or meeting soon),
  "keyPoints": ["array", "of", "key", "points", "from", "their", "reply"],
  "draftedSubject": "Re: [appropriate subject line]",
  "draftedResponse": "Full professional email response in English. Be warm, professional, and enthusiastic about the partnership. Reference specific points from their reply. Sign off as Hadi Jito Thian, CEO of SpecTa Education."
}

Guidelines for drafting the response:
- If "interested": Express enthusiasm, propose next steps (video call, send MOU draft), mention our track record (since 2005, 1000+ students placed)
- If "needs_more_info": Provide detailed info about SpecTa's capabilities, student volume, marketing reach in Indonesia
- If "declined": Thank them graciously, ask if we can revisit in 6 months, leave door open
- If "counter_offer": Acknowledge their terms, show flexibility, propose a call to discuss
- If "meeting_request": Confirm availability, suggest 2-3 time slots (WIB timezone), prepare agenda
- Always mention SpecTa Education's unique AI-powered platform as a differentiator`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: "You are an expert education consultant. Always respond with valid JSON only." as string },
        { role: "user" as const, content: prompt as string },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "reply_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              classification: { type: "string", enum: ["interested", "needs_more_info", "declined", "counter_offer", "meeting_request", "unknown"] },
              classificationReason: { type: "string" },
              sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
              urgency: { type: "string", enum: ["low", "medium", "high"] },
              keyPoints: { type: "array", items: { type: "string" } },
              draftedSubject: { type: "string" },
              draftedResponse: { type: "string" },
            },
            required: ["classification", "classificationReason", "sentiment", "urgency", "keyPoints", "draftedSubject", "draftedResponse"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (!content) throw new Error("No LLM response");
    return JSON.parse(content) as ReplyAnalysis;
  } catch (err) {
    console.error("[ReplyHandler] LLM analysis failed:", err);
    // Return a fallback
    return {
      classification: "unknown",
      classificationReason: "Could not analyze reply automatically",
      sentiment: "neutral",
      urgency: "medium",
      keyPoints: ["Please review this reply manually"],
      draftedSubject: `Re: ${subject}`,
      draftedResponse: `Dear ${fromName || "Partnership Team"},\n\nThank you for your reply regarding our partnership proposal.\n\nWe would love to discuss this further. Please let me know a convenient time for a call.\n\nBest regards,\nHadi Jito Thian\nCEO, SpecTa Education\nhadi@spectaeducation.com`,
    };
  }
}

// ==========================================
// Manual Reply Handler — paste email from Gmail
// ==========================================

/**
 * Handle a manually submitted university reply (pasted from Gmail or forwarded email).
 * This works WITHOUT Resend inbound MX records — Hadi pastes the email content directly.
 */
export async function handleManualUniversityReply(input: {
  fromEmail: string;
  fromName?: string | null;
  subject: string;
  emailBody: string;
  universityPartnershipId?: number | null;
}): Promise<{
  processed: boolean;
  reason: string;
  queueId?: number;
}> {
  const db = await getDb();
  if (!db) return { processed: false, reason: "Database unavailable" };

  const fromEmail = input.fromEmail.toLowerCase().trim();
  const fromName = input.fromName?.trim() || null;
  const { subject, emailBody } = input;
  const email_id = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[ReplyHandler] Manual submission from: ${fromEmail}, subject: ${subject}`);

  // Find matching university — first try by partnership ID, then by domain/subject
  let university: any = null;
  if (input.universityPartnershipId) {
    const rows = await withDbRetry(() => db.select().from(universityPartnerships)
      .where(eq(universityPartnerships.id, input.universityPartnershipId!))
      .limit(1), "find uni by id");
    university = rows[0] || null;
  }
  if (!university) {
    university = await findMatchingUniversity(fromEmail, subject, db);
  }
  if (!university) {
    // Create a placeholder so the reply is not lost — use the email domain as university name
    const domain = extractDomain(fromEmail);
    console.warn(`[ReplyHandler] No matching university for ${fromEmail} — storing as unmatched`);
    university = { id: 0, universityName: domain, country: "Unknown" };
  }

  // Analyze with LLM and draft response
  const analysis = await analyzeReplyAndDraftResponse(
    university.universityName,
    university.country,
    emailBody,
    subject,
    fromName
  );

  // Save to reply queue
  const inserted = await withDbRetry(() => db.insert(universityReplyQueue).values({
    universityPartnershipId: university.id || 0,
    universityName: university.universityName,
    universityCountry: university.country,
    resendEmailId: email_id,
    fromEmail,
    fromName,
    subject,
    emailBody,
    receivedAt: new Date(),
    classification: analysis.classification,
    classificationReason: analysis.classificationReason,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency,
    keyPoints: JSON.stringify(analysis.keyPoints),
    draftedResponse: analysis.draftedResponse,
    draftedSubject: analysis.draftedSubject,
    approvalStatus: "pending_review",
  }), "insert reply queue");

  const queueId = (inserted as any).insertId;

  // Update university partnership status if we have a real match
  if (university.id) {
    await withDbRetry(() => db.update(universityPartnerships)
      .set({ outreachStatus: "responded", responseReceived: emailBody?.substring(0, 500) || subject })
      .where(eq(universityPartnerships.id, university.id)), "update uni status").catch(() => {});
  }

  // Send notification to Hadi
  const classLabel: Record<string, string> = {
    interested: "🎉 INTERESTED", needs_more_info: "❓ Needs More Info",
    declined: "❌ Declined", counter_offer: "🤝 Counter Offer",
    meeting_request: "📅 Meeting Request", unknown: "❓ Unknown",
  };
  await sendEmail({
    to: "hadi@spectaeducation.com",
    subject: `🏫 University Reply Queued: ${university.universityName} — ${classLabel[analysis.classification]}`,
    html: `<p>A reply from <strong>${fromEmail}</strong> (${university.universityName}) has been classified as <strong>${classLabel[analysis.classification]}</strong> and is waiting for your approval in the <a href="https://www.spectaeducation.com/admin/agents">Agent Command Center → Partnerships tab</a>.</p>`,
  }).catch(() => {});

  console.log(`[ReplyHandler] Manual reply queued from ${university.universityName} (queue ID: ${queueId})`);
  return { processed: true, reason: `Queued reply from ${university.universityName} for approval`, queueId };
}

// ==========================================
// Main Handler — called from webhook endpoint
// ==========================================

export interface InboundEmailEvent {
  type: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

export async function handleInboundUniversityReply(event: InboundEmailEvent): Promise<{
  processed: boolean;
  reason: string;
  queueId?: number;
}> {
  const db = await getDb();
  if (!db) return { processed: false, reason: "Database unavailable" };

  const { email_id, from, subject } = event.data;

  // Parse from field: "Name <email@domain.com>" or just "email@domain.com"
  const fromMatch = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
  const fromName = fromMatch?.[1]?.trim() || null;
  const fromEmail = fromMatch?.[2]?.trim().toLowerCase() || from.toLowerCase();

  console.log(`[ReplyHandler] Processing inbound email from: ${fromEmail}, subject: ${subject}`);

  // Check for duplicate (same email_id already processed)
  const existing = await db.select({ id: universityReplyQueue.id })
    .from(universityReplyQueue)
    .where(eq(universityReplyQueue.resendEmailId, email_id))
    .limit(1);

  if (existing.length > 0) {
    return { processed: false, reason: "Already processed (duplicate email_id)" };
  }

  // Find matching university
  const university = await findMatchingUniversity(fromEmail, subject, db);
  if (!university) {
    console.log(`[ReplyHandler] No matching university found for sender: ${fromEmail}`);
    return { processed: false, reason: `No matching university outreach found for ${fromEmail}` };
  }

  console.log(`[ReplyHandler] Matched to university: ${university.universityName}`);

  // Fetch full email body from Resend API
  const emailBody = await fetchEmailBody(email_id);
  if (!emailBody) {
    console.warn(`[ReplyHandler] Could not fetch email body for ${email_id}`);
  }

  // Analyze with LLM and draft response
  const analysis = await analyzeReplyAndDraftResponse(
    university.universityName,
    university.country,
    emailBody || `[Email body unavailable - Subject: ${subject}]`,
    subject,
    fromName
  );

  // Save to reply queue
  const inserted = await db.insert(universityReplyQueue).values({
    universityPartnershipId: university.id,
    universityName: university.universityName,
    universityCountry: university.country,
    resendEmailId: email_id,
    fromEmail,
    fromName,
    subject,
    emailBody: emailBody || null,
    receivedAt: new Date(event.data.created_at),
    classification: analysis.classification,
    classificationReason: analysis.classificationReason,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency,
    keyPoints: JSON.stringify(analysis.keyPoints),
    draftedResponse: analysis.draftedResponse,
    draftedSubject: analysis.draftedSubject,
    approvalStatus: "pending_review",
  });

  const queueId = (inserted as any).insertId;

  // Update university partnership status to "responded"
  await db.update(universityPartnerships)
    .set({ outreachStatus: "responded", responseReceived: emailBody?.substring(0, 500) || subject })
    .where(eq(universityPartnerships.id, university.id));

  // Send notification to Hadi
  const classificationLabel: Record<string, string> = {
    interested: "🎉 INTERESTED",
    needs_more_info: "❓ Needs More Info",
    declined: "❌ Declined",
    counter_offer: "🤝 Counter Offer",
    meeting_request: "📅 Meeting Request",
    unknown: "❓ Unknown",
  };

  const urgencyLabel: Record<string, string> = {
    high: "🔴 HIGH",
    medium: "🟡 MEDIUM",
    low: "🟢 LOW",
  };

  await sendEmail({
    to: "hadi@spectaeducation.com",
    subject: `🏫 University Reply: ${university.universityName} — ${classificationLabel[analysis.classification]}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f7; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 24px; color: white;">
      <h1 style="margin: 0; font-size: 20px;">🏫 University Partnership Reply</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Action required — please review and approve a response</p>
    </div>

    <!-- University Info -->
    <div style="padding: 24px; border-bottom: 1px solid #f0f0f0;">
      <h2 style="margin: 0 0 8px; font-size: 18px; color: #1a1a2e;">${university.universityName}</h2>
      <p style="margin: 0; color: #666; font-size: 14px;">📍 ${university.country} &nbsp;|&nbsp; From: ${fromName ? `${fromName} &lt;${fromEmail}&gt;` : fromEmail}</p>
      <p style="margin: 8px 0 0; color: #666; font-size: 14px;">📧 Subject: ${subject}</p>
    </div>

    <!-- Classification -->
    <div style="padding: 24px; border-bottom: 1px solid #f0f0f0; background: #fafafa;">
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <div style="background: white; border-radius: 8px; padding: 12px 16px; border: 1px solid #e5e5e5;">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Classification</div>
          <div style="font-size: 16px; font-weight: 700; color: #1a1a2e;">${classificationLabel[analysis.classification]}</div>
        </div>
        <div style="background: white; border-radius: 8px; padding: 12px 16px; border: 1px solid #e5e5e5;">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Urgency</div>
          <div style="font-size: 16px; font-weight: 700; color: #1a1a2e;">${urgencyLabel[analysis.urgency]}</div>
        </div>
        <div style="background: white; border-radius: 8px; padding: 12px 16px; border: 1px solid #e5e5e5;">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Sentiment</div>
          <div style="font-size: 16px; font-weight: 700; color: #1a1a2e;">${analysis.sentiment}</div>
        </div>
      </div>
      <p style="margin: 16px 0 0; color: #555; font-size: 14px; line-height: 1.6;"><strong>Analysis:</strong> ${analysis.classificationReason}</p>
      ${analysis.keyPoints.length > 0 ? `
      <div style="margin-top: 12px;">
        <strong style="font-size: 13px; color: #333;">Key Points:</strong>
        <ul style="margin: 8px 0 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.8;">
          ${analysis.keyPoints.map(p => `<li>${p}</li>`).join("")}
        </ul>
      </div>` : ""}
    </div>

    <!-- Drafted Response Preview -->
    <div style="padding: 24px; border-bottom: 1px solid #f0f0f0;">
      <h3 style="margin: 0 0 12px; font-size: 15px; color: #333;">📝 AI-Drafted Response (pending your approval)</h3>
      <div style="background: #f8f9fa; border-left: 3px solid #e53e3e; padding: 16px; border-radius: 0 8px 8px 0; font-size: 14px; color: #444; line-height: 1.7; white-space: pre-wrap;">${analysis.draftedResponse}</div>
    </div>

    <!-- Action Buttons -->
    <div style="padding: 24px; text-align: center;">
      <p style="margin: 0 0 16px; color: #666; font-size: 14px;">Review the full reply and take action in the Agent Command Center:</p>
      <a href="https://www.spectaeducation.com/admin/agents?tab=university-replies" 
         style="display: inline-block; background: #e53e3e; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 0 8px;">
        👀 Review &amp; Approve
      </a>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 24px; background: #f8f9fa; text-align: center; border-top: 1px solid #f0f0f0;">
      <p style="margin: 0; font-size: 12px; color: #999;">SpecTa Education AI Agent System &nbsp;|&nbsp; University Partnership Reply Handler</p>
    </div>
  </div>
</body>
</html>`,
  });

  console.log(`[ReplyHandler] Queued reply from ${university.universityName} for approval (queue ID: ${queueId})`);

  return { processed: true, reason: "Successfully queued for approval", queueId };
}

// ==========================================
// Send Approved Response
// ==========================================

export async function sendApprovedResponse(queueId: number, useEditedResponse: boolean = false): Promise<{
  success: boolean;
  message: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable" };

  const items = await db.select().from(universityReplyQueue)
    .where(eq(universityReplyQueue.id, queueId))
    .limit(1);

  if (!items.length) return { success: false, message: "Reply not found in queue" };

  const item = items[0];

  if (item.approvalStatus === "sent") {
    return { success: false, message: "Response already sent" };
  }

  const responseBody = useEditedResponse && item.editedResponse ? item.editedResponse : item.draftedResponse;
  const subject = item.draftedSubject || `Re: Partnership Inquiry — SpecTa Education`;

  if (!responseBody) {
    return { success: false, message: "No response body available" };
  }

  try {
    await sendEmail({
      to: item.fromEmail,
      subject,
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.7;">
${responseBody.replace(/\n/g, "<br>")}
<br><br>
<div style="border-top: 1px solid #eee; padding-top: 16px; margin-top: 16px; font-size: 13px; color: #666;">
  <strong>Hadi Jito Thian</strong><br>
  CEO &amp; Founder, SpecTa Education<br>
  Indonesia's First AI-Powered Study Abroad Platform<br>
  📧 hadi@spectaeducation.com | 🌐 www.spectaeducation.com<br>
  📍 Jakarta, Indonesia
</div>
</div>`,

    });

    // Update queue record
    await db.update(universityReplyQueue)
      .set({
        approvalStatus: "sent",
        sentAt: new Date(),
      })
      .where(eq(universityReplyQueue.id, queueId));

    // Update university partnership status
    await db.update(universityPartnerships)
      .set({ outreachStatus: "follow_up_sent" })
      .where(eq(universityPartnerships.id, item.universityPartnershipId));

    return { success: true, message: `Response sent to ${item.fromEmail}` };
  } catch (err: any) {
    await db.update(universityReplyQueue)
      .set({ approvalStatus: "failed" })
      .where(eq(universityReplyQueue.id, queueId));
    return { success: false, message: `Failed to send: ${err.message}` };
  }
}
