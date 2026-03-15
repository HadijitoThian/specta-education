import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "hadi@spectaeducation.com",
    name: "Hadi",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "student@example.com",
    name: "Student",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("AI Agent Command Center", () => {
  describe("agents.getConfigs", () => {
    it("returns agent configs for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const configs = await caller.agents.getConfigs();
      expect(Array.isArray(configs)).toBe(true);
      // Should have at least the 3 agents we initialized
      expect(configs.length).toBeGreaterThanOrEqual(6);

      const agentNames = configs.map(c => c.agentName);
      expect(agentNames).toContain("crm_distributor");
      expect(agentNames).toContain("seo_builder");
      expect(agentNames).toContain("central_reporter");
      expect(agentNames).toContain("lead_hunter");
      expect(agentNames).toContain("competitor_monitor");
      expect(agentNames).toContain("university_scout");
    });

    it("denies access for regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.agents.getConfigs()).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("agents.getDashboardStats", () => {
    it("returns dashboard stats for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.agents.getDashboardStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("agents");
      expect(stats).toHaveProperty("leads");
      expect(stats).toHaveProperty("seo");
      expect(stats).toHaveProperty("counselorStats");
      expect(stats).toHaveProperty("recentRuns");
    });

    it("denies access for regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.agents.getDashboardStats()).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("agents.getRunLogs", () => {
    it("returns run logs for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const logs = await caller.agents.getRunLogs({ limit: 10 });
      expect(Array.isArray(logs)).toBe(true);
    });

    it("can filter by agent name", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const logs = await caller.agents.getRunLogs({ agentName: "crm_distributor", limit: 10 });
      expect(Array.isArray(logs)).toBe(true);
      // All returned logs should be for the specified agent
      for (const log of logs) {
        expect(log.agentName).toBe("crm_distributor");
      }
    });
  });

  describe("agents.getLeadAssignments", () => {
    it("returns lead assignments for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const assignments = await caller.agents.getLeadAssignments({});
      expect(Array.isArray(assignments)).toBe(true);
    });

    it("denies access for regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.agents.getLeadAssignments({})).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("agents.getSeoContent", () => {
    it("returns SEO content entries for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const content = await caller.agents.getSeoContent({});
      expect(Array.isArray(content)).toBe(true);
    });
  });

  describe("agents.getDailyReports", () => {
    it("returns daily reports for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const reports = await caller.agents.getDailyReports({ limit: 7 });
      expect(Array.isArray(reports)).toBe(true);
    });
  });

  describe("agents.toggleAgent", () => {
    it("denies access for regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.agents.toggleAgent({ agentName: "crm_distributor", isActive: false })
      ).rejects.toThrow("FORBIDDEN");
    });

    it("allows admin to toggle agent", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Toggle off
      const result = await caller.agents.toggleAgent({ agentName: "crm_distributor", isActive: false });
      expect(result).toEqual({ success: true });

      // Verify it's off
      const configs = await caller.agents.getConfigs();
      const crmAgent = configs.find(c => c.agentName === "crm_distributor");
      expect(crmAgent?.isActive).toBe(false);

      // Toggle back on
      await caller.agents.toggleAgent({ agentName: "crm_distributor", isActive: true });
      const configsAfter = await caller.agents.getConfigs();
      const crmAgentAfter = configsAfter.find(c => c.agentName === "crm_distributor");
      expect(crmAgentAfter?.isActive).toBe(true);
    });
  });

  // ===== Phase 2 Agent Tests =====

  describe("agents.getVisitorAnalytics", () => {
    it("returns visitor analytics for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const analytics = await caller.agents.getVisitorAnalytics();
      expect(analytics).toBeDefined();
      expect(analytics).toHaveProperty("totalVisitors24h");
      expect(analytics).toHaveProperty("highIntentVisitors");
      expect(analytics).toHaveProperty("topPages");
      expect(analytics).toHaveProperty("recentHighIntent");
      expect(analytics).toHaveProperty("recentSocialMentions");
      expect(typeof analytics.totalVisitors24h).toBe("number");
      expect(Array.isArray(analytics.topPages)).toBe(true);
    });

    it("denies access for regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.agents.getVisitorAnalytics()).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("agents.getCompetitorDashboard", () => {
    it("returns competitor dashboard for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const dashboard = await caller.agents.getCompetitorDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard).toHaveProperty("totalCompetitors");
      expect(dashboard).toHaveProperty("highThreats");
      expect(dashboard).toHaveProperty("recentAnalyses");
      expect(dashboard).toHaveProperty("topOpportunities");
      expect(typeof dashboard.totalCompetitors).toBe("number");
      expect(dashboard.totalCompetitors).toBeGreaterThan(0);
      expect(Array.isArray(dashboard.recentAnalyses)).toBe(true);
    });

    it("denies access for regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.agents.getCompetitorDashboard()).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("agents.getPartnershipPipeline", () => {
    it("returns partnership pipeline for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const pipeline = await caller.agents.getPartnershipPipeline();
      expect(pipeline).toBeDefined();
      expect(pipeline).toHaveProperty("totalIdentified");
      expect(pipeline).toHaveProperty("totalContacted");
      expect(pipeline).toHaveProperty("totalNegotiating");
      expect(pipeline).toHaveProperty("totalSigned");
      expect(pipeline).toHaveProperty("byCountry");
      expect(pipeline).toHaveProperty("recentOpportunities");
      expect(typeof pipeline.totalIdentified).toBe("number");
      expect(typeof pipeline.byCountry).toBe("object");
      expect(Array.isArray(pipeline.recentOpportunities)).toBe(true);
    });

    it("denies access for regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.agents.getPartnershipPipeline()).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("agents.dismissCompetitorAlert", () => {
    it("denies access for regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.agents.dismissCompetitorAlert({ id: 1 })
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("agents.updatePartnershipStatus", () => {
    it("denies access for regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.agents.updatePartnershipStatus({ id: 1, status: "researching" })
      ).rejects.toThrow("FORBIDDEN");
    });
  });
});
