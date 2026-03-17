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
import {
  getAgentConfig,
  upsertAgentConfig,
  getAllAgentConfigs,
} from "./db";

let schedulerInterval: NodeJS.Timeout | null = null;

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
      isActive: true,
      runIntervalMinutes: 480,
    },
    {
      agentName: "seo_optimizer",
      displayName: "SEO Optimizer",
      description: "Audits all pages for SEO health (meta tags, OG, structured data, alt texts), generates AI recommendations, suggests internal links, and sends weekly reports",
      isActive: true,
      runIntervalMinutes: 10080, // Weekly
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

  for (const config of configs) {
    if (!config.isActive) continue;

    // Check if agent is due to run
    const shouldRun = !config.lastRunAt || 
      (config.nextRunAt && now >= config.nextRunAt) ||
      (now.getTime() - new Date(config.lastRunAt).getTime() > config.runIntervalMinutes * 60 * 1000);

    if (!shouldRun) continue;

    // Special handling for time-sensitive agents
    if (config.agentName === "central_reporter") {
      const utcHour = now.getUTCHours();
      const wibHour = (utcHour + 7) % 24;
      if (wibHour !== 9 && wibHour !== 8) continue;
      if (config.lastRunAt) {
        const lastRunDate = new Date(config.lastRunAt).toISOString().split("T")[0];
        const todayDate = now.toISOString().split("T")[0];
        if (lastRunDate === todayDate) continue;
      }
    }

    // Aptitude nurture runs at 10AM WIB
    if (config.agentName === "aptitude_nurture") {
      const utcHour = now.getUTCHours();
      const wibHour = (utcHour + 7) % 24;
      if (wibHour !== 10) continue;
      if (config.lastRunAt) {
        const lastRunDate = new Date(config.lastRunAt).toISOString().split("T")[0];
        const todayDate = now.toISOString().split("T")[0];
        if (lastRunDate === todayDate) continue;
      }
    }

    // Re-engagement runs at 2PM WIB
    if (config.agentName === "re_engagement") {
      const utcHour = now.getUTCHours();
      const wibHour = (utcHour + 7) % 24;
      if (wibHour !== 14) continue;
      if (config.lastRunAt) {
        const lastRunDate = new Date(config.lastRunAt).toISOString().split("T")[0];
        const todayDate = now.toISOString().split("T")[0];
        if (lastRunDate === todayDate) continue;
      }
    }

    console.log(`[Scheduler] Running agent: ${config.displayName}`);

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

  console.log("[Scheduler] Starting AI Agent Scheduler (11 agents)...");
  
  initializeAgents().catch(err => {
    console.error("[Scheduler] Failed to initialize agents:", err);
  });

  schedulerInterval = setInterval(() => {
    checkAndRunAgents().catch(err => {
      console.error("[Scheduler] Error in check cycle:", err);
    });
  }, 5 * 60 * 1000);

  setTimeout(() => {
    checkAndRunAgents().catch(err => {
      console.error("[Scheduler] Error in initial check:", err);
    });
  }, 30 * 1000);
}

/**
 * Stop the scheduler
 */
export function stopAgentScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Stopped");
  }
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
    default:
      throw new Error(`Unknown agent: ${agentName}`);
  }
}
