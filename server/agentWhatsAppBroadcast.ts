/**
 * Agent 9 — WhatsApp Broadcast Agent
 * 
 * Framework for sending WhatsApp broadcasts to leads via Fonnte/Wablas API.
 * Currently in "dry run" mode until API key is configured.
 * Supports: aptitude_followup, promotion, event_reminder, custom campaigns
 */

import { createAgentRunLog, updateAgentRunLog } from "./db";
import { invokeLLM } from "./_core/llm";
import { drizzle } from "drizzle-orm/mysql2";
import { leads, aptitudeResults } from "../drizzle/schema";
import { sql } from "drizzle-orm";

const FONNTE_API_KEY = process.env.FONNTE_API_KEY || "";
const FONNTE_API_URL = "https://api.fonnte.com/send";
const WA_API_CONFIGURED = !!FONNTE_API_KEY;

interface BroadcastResult {
  totalTargets: number;
  messagesSent: number;
  errors: number;
  dryRun: boolean;
  messages: Array<{ phone: string; name: string; status: string; preview?: string }>;
}

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!WA_API_CONFIGURED) {
    console.log(`[WA Broadcast] DRY RUN - Would send to ${phone}: ${message.substring(0, 50)}...`);
    return true;
  }
  try {
    const response = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: { "Authorization": FONNTE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ target: phone, message, countryCode: "62" }),
    });
    const result = await response.json();
    return result.status === true;
  } catch (err) {
    console.error(`[WA Broadcast] Failed to send to ${phone}:`, err);
    return false;
  }
}

async function getTargetPhones(campaignType: string): Promise<Array<{ phone: string; name: string; interest?: string }>> {
  const db = drizzle(process.env.DATABASE_URL!);
  const targets: Array<{ phone: string; name: string; interest?: string }> = [];

  if (campaignType === "aptitude_followup") {
    const results = await db.select().from(aptitudeResults).where(
      sql`student_phone IS NOT NULL AND student_phone != ''`
    ).limit(50);
    for (const r of results) {
      if (r.studentPhone) targets.push({ phone: r.studentPhone, name: r.studentName || "Student", interest: r.hollandCode || undefined });
    }
  } else {
    const chatLeads = await db.select().from(leads).where(
      sql`student_phone IS NOT NULL AND student_phone != ''`
    ).limit(50);
    for (const l of chatLeads) {
      if (l.studentPhone) targets.push({ phone: l.studentPhone, name: l.studentName || "Student", interest: l.preferredCountry || undefined });
    }
    const aptLeads = await db.select().from(aptitudeResults).where(
      sql`student_phone IS NOT NULL AND student_phone != ''`
    ).limit(50);
    for (const a of aptLeads) {
      if (a.studentPhone) targets.push({ phone: a.studentPhone, name: a.studentName || "Student", interest: a.hollandCode || undefined });
    }
  }

  // Deduplicate by phone number
  const seen = new Set<string>();
  return targets.filter(t => {
    const normalized = t.phone.replace(/\D/g, "");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

async function generateMessage(campaignType: string, name: string, interest?: string, customMessage?: string): Promise<string> {
  if (customMessage) return customMessage.replace("{{name}}", name).replace("{{interest}}", interest || "study abroad");

  const prompts: Record<string, string> = {
    aptitude_followup: `Write a short WhatsApp message (max 200 chars) in Bahasa Indonesia for ${name} who completed an aptitude test (${interest || ""}). Remind them to book a free consultation at SpecTa Education.`,
    promotion: `Write a short WhatsApp promo (max 200 chars) in Bahasa Indonesia for ${name}. Promote SpecTa Education's free consultation for studying abroad.`,
    event_reminder: `Write a short WhatsApp reminder (max 200 chars) in Bahasa Indonesia for ${name}. Remind about SpecTa Education's upcoming free webinar about studying in Australia.`,
    custom: `Write a short WhatsApp message (max 200 chars) in Bahasa Indonesia for ${name} about SpecTa Education study abroad services.`,
  };

  try {
    const llmResponse = await invokeLLM({
      messages: [
        { role: "system", content: "You are a WhatsApp marketing assistant for SpecTa Education. Write short, casual messages in Bahasa Indonesia." },
        { role: "user", content: prompts[campaignType] || prompts.custom }
      ],
    });
    const content = llmResponse.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : `Hai ${name}! 👋 Konsultasi GRATIS kuliah ke luar negeri di SpecTa Education. Hubungi: wa.me/62818668277`;
  } catch {
    return `Hai ${name}! 👋 Konsultasi GRATIS kuliah ke luar negeri di SpecTa Education. Hubungi: wa.me/62818668277`;
  }
}

export async function runWhatsAppBroadcastAgent(
  campaignType: string = "promotion",
  customMessage?: string,
  targetPhones?: string[]
): Promise<BroadcastResult> {
  const runLog = await createAgentRunLog({ agentName: "whatsapp_broadcast", status: "running", startedAt: new Date() });
  const result: BroadcastResult = { totalTargets: 0, messagesSent: 0, errors: 0, dryRun: !WA_API_CONFIGURED, messages: [] };

  try {
    let targets: Array<{ phone: string; name: string; interest?: string }>;
    if (targetPhones && targetPhones.length > 0) {
      targets = targetPhones.map(p => ({ phone: p, name: "Student" }));
    } else {
      targets = await getTargetPhones(campaignType);
    }

    result.totalTargets = targets.length;
    console.log(`[WA Broadcast] Campaign: ${campaignType}, Targets: ${targets.length}, Mode: ${WA_API_CONFIGURED ? "LIVE" : "DRY RUN"}`);

    for (const target of targets) {
      try {
        const message = await generateMessage(campaignType, target.name, target.interest, customMessage);
        const sent = await sendWhatsApp(target.phone, message);
        if (sent) {
          result.messagesSent++;
          result.messages.push({ phone: target.phone, name: target.name, status: WA_API_CONFIGURED ? "sent" : "dry_run", preview: message.substring(0, 80) });
        } else {
          result.errors++;
          result.messages.push({ phone: target.phone, name: target.name, status: "failed" });
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch {
        result.errors++;
        result.messages.push({ phone: target.phone, name: target.name, status: "error" });
      }
    }

    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: "success", completedAt: new Date(),
        summary: `Campaign: ${campaignType} | Targets: ${result.totalTargets} | Sent: ${result.messagesSent} | Errors: ${result.errors} | Mode: ${result.dryRun ? "DRY RUN" : "LIVE"}`,
        itemsProcessed: result.totalTargets,
      });
    }
  } catch (err) {
    console.error("[WA Broadcast] Fatal error:", err);
    if (runLog) {
      await updateAgentRunLog(runLog.id, { status: "failed", completedAt: new Date(), summary: `Fatal error: ${err instanceof Error ? err.message : String(err)}` });
    }
    result.errors++;
  }

  return result;
}
