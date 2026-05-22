/**
 * Agent Scheduler — Orchestrates all AI agents
 * 
 * Runs as a background process that checks agent schedules
 * and triggers execution when due.
 */

import { runCrmDistributorAgent } from "./agentCrmDistributor";
import { runSeoBuilderAgent } from "./agentSeoBuilder";
import { runCentralReporterAgent } from "./agentCentralReporter";
import { runLeadHunterAgent } from "./agentLeadHunter";
import { runCompetitorMonitorAgent } from "./agentCompetitorMonitor";
import { runUniversityScoutAgent } from "./agentUniversityScout";
import { runAptitudeNurtureAgent } from "./agentAptitudeNurture";
import { runReEngagementAgent } from "./agentReEngagement";
import { runWhatsAppBroadcastAgent } from "./agentWhatsAppBroadcast";
import { runContentAmplifierAgent } from "./agentContentAmplifier";
import { runSeoOptimizerAgent } from "./agentSeoOptimizer";
import { runGeneralManagerCycle, generateAndSendExecutiveReport } from "./agentGeneralManager";
import {
  getAgentConfig,
  upsertAgentConfig,
  getAllAgentConfigs,
  resetDbConnection,
  getDailyReportByDate,
  getDb,
} from "./db";
import { gmExecutiveReports } from "../drizzle/schema";
import { eq } from "drizzle-orm";

let schedulerInterval: NodeJS.Timeout | null = null;
let gmInterval: NodeJS.Timeout | null = null;
let lastGmRunAt: Date | null = null;

/**
 * Run the GM cycle ONCE DAILY at 8AM WIB only.
 * Called every hour by the scheduler — skips silently outside the 8AM window.
 */
async function runGmCycle(): Promise<void> {
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const nowWib = new Date(now.getTime() + wibOffset);
  const wibHour = nowWib.getUTCHours();
  const todayWib = nowWib.toISOString().split("T")[0];

  // Only run during 8AM WIB window (8:00–8:59 AM)
  const is8amWindow = wibHour === 8;
  if (!is8amWindow) return;

  // DB-backed daily guard: ensures GM runs exactly once per day even if server restarts
  try {
    const db = await getDb();
    if (db) {
      const existing = await db.select()
        .from(gmExecutiveReports)
        .where(eq(gmExecutiveReports.reportDate, todayWib))
        .limit(1)
        .catch(() => []);
      if (existing.length > 0 && existing[0].status === "sent") {
        console.log(`[GM] Executive report already sent today (${todayWib}), skipping`);
        return;
      }
    }
  } catch (e) {
    console.error("[GM] DB guard check failed (non-fatal):", e);
  }

  console.log(`[GM] Running daily 8AM WIB cycle (${todayWib})`);
  lastGmRunAt = now;

  try {
    const result = await runGeneralManagerCycle();
    await generateAndSendExecutiveReport(result);
  } catch (err: unknown) {
    console.error("[GM] Cycle error:", err);
  }
}

/**
 * Initialize agent configs in the database
 */
export async function initializeAgents(): Promise<void> {
  const agents = [
    {
      agentName: "crm_distributor",
      displayName: "CRM & Follow-Up Distributor",
      description: "Assigns leads to counselors (chatbot + aptitude + scholarship), manages follow-up sequences, and escalates stale leads",
      isActive: true,
      runIntervalMinutes: 60,
    },
    {
      agentName: "seo_builder",
      displayName: "SEO Content Builder",
      description: "Generates and publishes SEO-optimized blog articles targeting study abroad keywords",
      isActive: true,
      runIntervalMinutes: 480,
    },
    {
      agentName: "central_reporter",
      displayName: "Central Reporter",
      description: "Compiles daily reports (chatbot + aptitude + IELTS + applications) and sends 9AM briefing email",
      isActive: true,
      runIntervalMinutes: 1440,
    },
    {
      agentName: "lead_hunter",
      displayName: "Lead Hunter",
      description: "Tracks website visitor behavior, scans social media for lead signals, and scores engagement",
      isActive: true,
      runIntervalMinutes: 120,
    },
    {
      agentName: "competitor_monitor",
      displayName: "Competitor Monitor",
      description: "Tracks 9+ competitors daily, monitors their strategies, and sends strategic blueprints",
      isActive: true,
      runIntervalMinutes: 1440,
    },
    {
      agentName: "university_scout",
      displayName: "University Partner Scout",
      description: "Finds university partnership opportunities across Australia, UK, Ireland, Canada, and New Zealand",
      isActive: true,
      runIntervalMinutes: 1440,
    },
    {
      agentName: "aptitude_nurture",
      displayName: "Aptitude Lead Nurture",
      description: "Sends personalised follow-up emails to aptitude test completers based on their Holland Code results",
      isActive: true,
      runIntervalMinutes: 1440,
    },
    {
      agentName: "re_engagement",
      displayName: "Re-Engagement Agent",
      description: "Identifies cold leads (7+ days no response) and sends personalised re-engagement emails",
      isActive: true,
      runIntervalMinutes: 1440,
    },
    {
      agentName: "whatsapp_broadcast",
      displayName: "WhatsApp Broadcast",
      description: "Sends WhatsApp broadcasts to leads via Fonnte API. Currently in dry-run mode until API key configured.",
      isActive: false, // Disabled until API key is configured
      runIntervalMinutes: 10080, // Weekly
    },
    {
      agentName: "content_amplifier",
      displayName: "Content Amplifier",
      description: "Converts published blog posts into Instagram captions, TikTok scripts, WhatsApp messages, Twitter threads, and LinkedIn posts",
      isActive: false, // Disabled — no output was being used
      runIntervalMinutes: 480,
    },
    {
      agentName: "seo_optimizer",
      displayName: "SEO Optimizer",
      description: "Audits all pages for SEO health (meta tags, OG, structured data, alt texts), generates AI recommendations, suggests internal links, and sends weekly reports",
      isActive: true,
      runIntervalMinutes: 10080, // Weekly
    },
    {
      agentName: "ai_general_manager",
      displayName: "AI General Manager",
      description: "Oversees all AI agents every 4 hours, performs health checks, auto-heals missed agents, generates strategic recommendations, and sends daily 8 AM executive report",
      isActive: true,
      runIntervalMinutes: 240, // Every 4 hours
    },
  ];

  for (const agent of agents) {
    const existing = await getAgentConfig(agent.agentName);
    if (!existing) {
      await upsertAgentConfig(agent);
      console.log(`[Scheduler] Initialized agent: ${agent.displayName}`);
    }
  }
}

/**
 * Check and run agents that are due
 */
export async function checkAndRunAgents(): Promise<void> {
  const configs = await getAllAgentConfigs();
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const nowWib = new Date(now.getTime() + wibOffset);
  const wibHour = nowWib.getUTCHours();
  const todayWib = nowWib.toISOString().split("T")[0];

  for (const config of configs) {
    if (!config.isActive) continue;

    // -------------------------------------------------------
    // TIME-SENSITIVE AGENTS: use time-window logic, NOT nextRunAt
    // -------------------------------------------------------
    if (config.agentName === "central_reporter") {
      // Run between 8-10 AM WIB (2-hour catch-up window)
      if (wibHour < 8 || wibHour >= 10) continue;
      // Check if already sent today (WIB date)
      if (config.lastRunAt) {
        const lastRunWib = new Date(new Date(config.lastRunAt).getTime() + wibOffset);
        const lastRunDate = lastRunWib.toISOString().split("T")[0];
        if (lastRunDate === todayWib) continue;
      }
      // Also check DB to avoid duplicate if server restarted
      const existingReport = await getDailyReportByDate(todayWib).catch(() => null);
      if (existingReport?.status === "sent") {
        console.log(`[Scheduler] central_reporter: report already sent today (${todayWib}), skipping`);
        // Update lastRunAt so scheduler knows it ran today
        await upsertAgentConfig({ agentName: config.agentName, displayName: config.displayName, lastRunAt: now, nextRunAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) }).catch(() => {});
        continue;
      }
      console.log(`[Scheduler] Running agent: ${config.displayName} (${wibHour}:xx WIB)`);
      await upsertAgentConfig({ agentName: config.agentName, displayName: config.displayName, lastRunAt: now, nextRunAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) }).catch(() => {});
      try { await runCentralReporterAgent(); } catch (err) { console.error(`[Scheduler] Error running central_reporter:`, err); }
      continue;
    }

    if (config.agentName === "aptitude_nurture") {
      // Run at 10 AM WIB (1-hour window: 10-11)
      if (wibHour < 10 || wibHour >= 11) continue;
      if (config.lastRunAt) {
        const lastRunWib = new Date(new Date(config.lastRunAt).getTime() + wibOffset);
        if (lastRunWib.toISOString().split("T")[0] === todayWib) continue;
      }
      console.log(`[Scheduler] Running agent: ${config.displayName}`);
      await upsertAgentConfig({ agentName: config.agentName, displayName: config.displayName, lastRunAt: now, nextRunAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) }).catch(() => {});
      try { await runAptitudeNurtureAgent(); } catch (err) { console.error(`[Scheduler] Error running aptitude_nurture:`, err); }
      continue;
    }

    if (config.agentName === "re_engagement") {
      // Run at 2 PM WIB (1-hour window: 14-15)
      if (wibHour < 14 || wibHour >= 15) continue;
      if (config.lastRunAt) {
        const lastRunWib = new Date(new Date(config.lastRunAt).getTime() + wibOffset);
        if (lastRunWib.toISOString().split("T")[0] === todayWib) continue;
      }
      console.log(`[Scheduler] Running agent: ${config.displayName}`);
      await upsertAgentConfig({ agentName: config.agentName, displayName: config.displayName, lastRunAt: now, nextRunAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) }).catch(() => {});
      try { await runReEngagementAgent(); } catch (err) { console.error(`[Scheduler] Error running re_engagement:`, err); }
      continue;
    }

    // -------------------------------------------------------
    // INTERVAL-BASED AGENTS: run when interval has elapsed
    // -------------------------------------------------------
    const intervalMs = config.runIntervalMinutes * 60 * 1000;
    const lastRun = config.lastRunAt ? new Date(config.lastRunAt).getTime() : 0;
    const elapsed = now.getTime() - lastRun;
    if (elapsed < intervalMs) continue;

    console.log(`[Scheduler] Running agent: ${config.displayName} (${Math.round(elapsed / 60000)}min since last run)`);

    // CRITICAL: Update lastRunAt BEFORE running to prevent duplicate runs
    const nextRunAt = new Date(now.getTime() + intervalMs);
    await upsertAgentConfig({
      agentName: config.agentName,
      displayName: config.displayName,
      lastRunAt: now,
      nextRunAt,
    });

    try {
      switch (config.agentName) {
        case "crm_distributor":
          await runCrmDistributorAgent();
          break;
        case "seo_builder":
          await runSeoBuilderAgent();
          break;
        case "central_reporter":
          await runCentralReporterAgent();
          break;
        case "lead_hunter":
          await runLeadHunterAgent();
          break;
        case "competitor_monitor":
          await runCompetitorMonitorAgent();
          break;
        case "university_scout":
          await runUniversityScoutAgent();
          break;
        case "aptitude_nurture":
          await runAptitudeNurtureAgent();
          break;
        case "re_engagement":
          await runReEngagementAgent();
          break;
        case "whatsapp_broadcast":
          await runWhatsAppBroadcastAgent();
          break;
        case "content_amplifier":
          await runContentAmplifierAgent();
          break;
        case "seo_optimizer":
          await runSeoOptimizerAgent();
          break;
        default:
          console.log(`[Scheduler] Unknown agent: ${config.agentName}`);
      }
    } catch (err) {
      console.error(`[Scheduler] Error running ${config.agentName}:`, err);
    }
  }
}

/**
 * Start the scheduler loop (runs every 5 minutes)
 */
export function startAgentScheduler(): void {
  if (schedulerInterval) {
    console.log("[Scheduler] Already running");
    return;
  }

  console.log("[Scheduler] Starting AI Agent Scheduler (11 agents + AI General Manager)...");
  
  initializeAgents().catch(err => {
    console.error("[Scheduler] Failed to initialize agents:", err);
  });

  schedulerInterval = setInterval(() => {
    checkAndRunAgents().catch(async (err) => {
      console.error("[Scheduler] Error in check cycle:", err);
      // If it's a connection error, reset the pool so next cycle gets a fresh connection
      const errMsg = err?.message || String(err);
      const isCause = err?.cause?.message || "";
      if (errMsg.includes("ECONNRESET") || isCause.includes("ECONNRESET") ||
          errMsg.includes("ECONNREFUSED") || isCause.includes("ECONNREFUSED") ||
          errMsg.includes("ETIMEDOUT") || isCause.includes("ETIMEDOUT")) {
        console.log("[Scheduler] DB connection error detected — resetting pool...");
        await resetDbConnection().catch(() => {});
      }
    });
  }, 60 * 60 * 1000); // Every 60 minutes (was 5 min — reduced to cut compute cost)

  // Delay initial run by 5 minutes so any manual DB operations or deployments
  // can complete before agents start assigning leads and sending emails.
  setTimeout(() => {
    checkAndRunAgents().catch(err => {
      console.error("[Scheduler] Error in initial check:", err);
    });
  }, 5 * 60 * 1000); // 5 minutes

  // GM runs once daily at 8AM WIB only (checked every 60 min alongside the main scheduler)
  // No separate gmInterval needed — the runGmCycle() 8AM window check handles it
  gmInterval = setInterval(() => {
    runGmCycle().catch((err: unknown) => console.error("[GM] Interval error:", err));
  }, 60 * 60 * 1000); // Check every hour — runGmCycle() only executes during 8AM WIB window

  // First GM check after 10 minutes (let agents settle first)
  setTimeout(() => {
    runGmCycle().catch((err: unknown) => console.error("[GM] Initial run error:", err));
  }, 10 * 60 * 1000); // 10 minutes
}

/**
 * Stop the scheduler
 */
export function stopAgentScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  if (gmInterval) {
    clearInterval(gmInterval);
    gmInterval = null;
  }
  console.log("[Scheduler] Stopped");
}

/**
 * Manually trigger a specific agent
 */
export async function triggerAgent(agentName: string, params?: any): Promise<any> {
  console.log(`[Scheduler] Manual trigger: ${agentName}`);
  
  switch (agentName) {
    case "crm_distributor":
      return runCrmDistributorAgent();
    case "seo_builder":
      return runSeoBuilderAgent();
    case "central_reporter":
      return runCentralReporterAgent();
    case "lead_hunter":
      return runLeadHunterAgent();
    case "competitor_monitor":
      return runCompetitorMonitorAgent();
    case "university_scout":
      return runUniversityScoutAgent();
    case "aptitude_nurture":
      return runAptitudeNurtureAgent();
    case "re_engagement":
      return runReEngagementAgent();
    case "whatsapp_broadcast":
      return runWhatsAppBroadcastAgent(
        params?.campaignType || "promotion",
        params?.customMessage,
        params?.targetPhones
      );
    case "content_amplifier":
      return runContentAmplifierAgent(params?.blogId);
    case "seo_optimizer":
      return runSeoOptimizerAgent();
    case "ai_general_manager":
      return runGmCycle();
    default:
      throw new Error(`Unknown agent: ${agentName}`);
  }
}
