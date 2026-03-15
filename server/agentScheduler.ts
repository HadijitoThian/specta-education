/**
 * Agent Scheduler — Orchestrates all AI agents
 * 
 * Runs as a background process that checks agent schedules
 * and triggers execution when due.
 */

import { runCrmDistributorAgent } from "./agentCrmDistributor";
import { runSeoBuilderAgent } from "./agentSeoBuilder";
import { runCentralReporterAgent } from "./agentCentralReporter";
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
      description: "Assigns leads to counselors, manages follow-up sequences, and escalates stale leads",
      isActive: true,
      runIntervalMinutes: 60, // every hour
    },
    {
      agentName: "seo_builder",
      displayName: "SEO Content Builder",
      description: "Generates and publishes SEO-optimized blog articles targeting study abroad keywords",
      isActive: true,
      runIntervalMinutes: 480, // every 8 hours
    },
    {
      agentName: "central_reporter",
      displayName: "Central Reporter",
      description: "Compiles daily reports and sends 9AM briefing email to admin",
      isActive: true,
      runIntervalMinutes: 1440, // daily
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

    // Special handling for central_reporter — only run at 9AM WIB (2AM UTC)
    if (config.agentName === "central_reporter") {
      const utcHour = now.getUTCHours();
      const wibHour = (utcHour + 7) % 24;
      // Only run between 8:30-9:30 WIB
      if (wibHour !== 9 && wibHour !== 8) continue;
      // Don't run if already ran today
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

  console.log("[Scheduler] Starting AI Agent Scheduler...");
  
  // Initialize agents on startup
  initializeAgents().catch(err => {
    console.error("[Scheduler] Failed to initialize agents:", err);
  });

  // Run check every 5 minutes
  schedulerInterval = setInterval(() => {
    checkAndRunAgents().catch(err => {
      console.error("[Scheduler] Error in check cycle:", err);
    });
  }, 5 * 60 * 1000);

  // Also run immediately after a short delay (let server fully start)
  setTimeout(() => {
    checkAndRunAgents().catch(err => {
      console.error("[Scheduler] Error in initial check:", err);
    });
  }, 30 * 1000); // 30 seconds after startup
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
export async function triggerAgent(agentName: string): Promise<any> {
  console.log(`[Scheduler] Manual trigger: ${agentName}`);
  
  switch (agentName) {
    case "crm_distributor":
      return runCrmDistributorAgent();
    case "seo_builder":
      return runSeoBuilderAgent();
    case "central_reporter":
      return runCentralReporterAgent();
    default:
      throw new Error(`Unknown agent: ${agentName}`);
  }
}
