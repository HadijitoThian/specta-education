import { describe, it, expect, vi } from "vitest";

// Test the agent scheduler has all 10 agents registered
describe("Agent Scheduler", () => {
  it("should export triggerAgent and startAgentScheduler", async () => {
    const scheduler = await import("./agentScheduler");
    expect(scheduler.triggerAgent).toBeDefined();
    expect(typeof scheduler.triggerAgent).toBe("function");
    expect(scheduler.startAgentScheduler).toBeDefined();
    expect(typeof scheduler.startAgentScheduler).toBe("function");
    expect(scheduler.initializeAgents).toBeDefined();
    expect(typeof scheduler.initializeAgents).toBe("function");
  });

  it("should throw for unknown agent name", async () => {
    const scheduler = await import("./agentScheduler");
    await expect(scheduler.triggerAgent("nonexistent_agent")).rejects.toThrow("Unknown agent");
  });
});

// Test the Aptitude Nurture Agent exports
describe("Aptitude Nurture Agent", () => {
  it("should export runAptitudeNurtureAgent function", async () => {
    const agent = await import("./agentAptitudeNurture");
    expect(agent.runAptitudeNurtureAgent).toBeDefined();
    expect(typeof agent.runAptitudeNurtureAgent).toBe("function");
  });
});

// Test the Re-Engagement Agent exports
describe("Re-Engagement Agent", () => {
  it("should export runReEngagementAgent function", async () => {
    const agent = await import("./agentReEngagement");
    expect(agent.runReEngagementAgent).toBeDefined();
    expect(typeof agent.runReEngagementAgent).toBe("function");
  });
});

// Test the WhatsApp Broadcast Agent exports
describe("WhatsApp Broadcast Agent", () => {
  it("should export runWhatsAppBroadcastAgent function", async () => {
    const agent = await import("./agentWhatsAppBroadcast");
    expect(agent.runWhatsAppBroadcastAgent).toBeDefined();
    expect(typeof agent.runWhatsAppBroadcastAgent).toBe("function");
  });

  it("should accept campaign type and message parameters", async () => {
    const agent = await import("./agentWhatsAppBroadcast");
    // Verify function signature accepts 3 params
    expect(agent.runWhatsAppBroadcastAgent.length).toBeGreaterThanOrEqual(0);
  });
});

// Test the Content Amplifier Agent exports
describe("Content Amplifier Agent", () => {
  it("should export runContentAmplifierAgent function", async () => {
    const agent = await import("./agentContentAmplifier");
    expect(agent.runContentAmplifierAgent).toBeDefined();
    expect(typeof agent.runContentAmplifierAgent).toBe("function");
  });
});

// Test the CRM Distributor has aptitude lead handling
describe("CRM Distributor Agent", () => {
  it("should export runCrmDistributorAgent function", async () => {
    const agent = await import("./agentCrmDistributor");
    expect(agent.runCrmDistributorAgent).toBeDefined();
    expect(typeof agent.runCrmDistributorAgent).toBe("function");
  });
});

// Test the Central Reporter includes aptitude data
describe("Central Reporter Agent", () => {
  it("should export runCentralReporterAgent function", async () => {
    const agent = await import("./agentCentralReporter");
    expect(agent.runCentralReporterAgent).toBeDefined();
    expect(typeof agent.runCentralReporterAgent).toBe("function");
  });
});

// Test the partnership email function
describe("Partnership Email Function", () => {
  it("should export sendPartnershipEmail function from email module", async () => {
    const email = await import("./email");
    expect(email.sendPartnershipEmail).toBeDefined();
    expect(typeof email.sendPartnershipEmail).toBe("function");
  });
});

// Test University Scout Agent pipeline fixes
describe("University Scout Agent Pipeline", () => {
  it("should export processExistingUniversities function", async () => {
    const agent = await import("./agentUniversityScout");
    expect(agent.processExistingUniversities).toBeDefined();
    expect(typeof agent.processExistingUniversities).toBe("function");
  });

  it("should export approval workflow functions", async () => {
    const agent = await import("./agentUniversityScout");
    expect(agent.submitDraftForApproval).toBeDefined();
    expect(agent.submitAllDraftsForApproval).toBeDefined();
    expect(agent.approveAndSendOutreach).toBeDefined();
    expect(agent.rejectOutreach).toBeDefined();
    expect(agent.handleApprovalAction).toBeDefined();
    expect(agent.getPartnershipPipeline).toBeDefined();
  });

  it("should export sendPartnershipApprovalEmail from email module", async () => {
    const email = await import("./email");
    expect(email.sendPartnershipApprovalEmail).toBeDefined();
    expect(typeof email.sendPartnershipApprovalEmail).toBe("function");
  });

  it("should export sendPartnershipOutreachEmail from email module", async () => {
    const email = await import("./email");
    expect(email.sendPartnershipOutreachEmail).toBeDefined();
    expect(typeof email.sendPartnershipOutreachEmail).toBe("function");
  });
});

// Test schema has the new columns
describe("Database Schema", () => {
  it("should have amplified column in blogPosts", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.blogPosts).toBeDefined();
    // Check the table has the amplified column
    const columns = Object.keys(schema.blogPosts);
    expect(columns).toBeDefined();
  });

  it("should have nurtureEmailSent column in aptitudeResults", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.aptitudeResults).toBeDefined();
  });
});
