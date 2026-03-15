import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock drizzle-orm/mysql2 and schema
vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../drizzle/schema", () => ({
  visitorTracking: { id: "id", sessionId: "sessionId", lastActivityAt: "lastActivityAt", isHighIntent: "isHighIntent" },
  competitorIntelligence: { id: "id" },
  socialMentions: { id: "id" },
  agentRunLogs: { id: "id" },
  competitorProfiles: { id: "id" },
}));

describe("Google Ranking Tracker", () => {
  it("should export checkKeywordRanking function", async () => {
    const mod = await import("./googleRankingTracker");
    expect(typeof mod.checkKeywordRanking).toBe("function");
  });

  it("should export runRankingCheck function", async () => {
    const mod = await import("./googleRankingTracker");
    expect(typeof mod.runRankingCheck).toBe("function");
  });

  it("should export getLatestRankingData function", async () => {
    const mod = await import("./googleRankingTracker");
    expect(typeof mod.getLatestRankingData).toBe("function");
  });

  it("checkKeywordRanking should be callable", async () => {
    const mod = await import("./googleRankingTracker");
    // Just verify it's a function — actual HTTP call would need network
    expect(typeof mod.checkKeywordRanking).toBe("function");
  });
});

describe("Competitor Scraper", () => {
  it("should export runCompetitorScan function", async () => {
    const mod = await import("./competitorScraper");
    expect(typeof mod.runCompetitorScan).toBe("function");
  });

  it("should export getCompetitorScanData function", async () => {
    const mod = await import("./competitorScraper");
    expect(typeof mod.getCompetitorScanData).toBe("function");
  });

  it("should export COMPETITOR_SITES constant", async () => {
    const mod = await import("./competitorScraper");
    expect(Array.isArray(mod.COMPETITOR_SITES)).toBe(true);
    expect(mod.COMPETITOR_SITES.length).toBeGreaterThan(0);
    // Each site should have name and url
    mod.COMPETITOR_SITES.forEach((site: any) => {
      expect(site).toHaveProperty("name");
      expect(site).toHaveProperty("urls");
      expect(Array.isArray(site.urls)).toBe(true);
    });
  });
});

describe("Social Media Scraper", () => {
  it("should export runSocialMediaScan function", async () => {
    const mod = await import("./socialMediaScraper");
    expect(typeof mod.runSocialMediaScan).toBe("function");
  });

  it("should export getSocialMediaData function", async () => {
    const mod = await import("./socialMediaScraper");
    expect(typeof mod.getSocialMediaData).toBe("function");
  });
});

describe("Visitor Tracking Integration", () => {
  it("should export trackVisitorBehavior function", async () => {
    const mod = await import("./agentLeadHunter");
    expect(typeof mod.trackVisitorBehavior).toBe("function");
  });

  it("should export getVisitorAnalytics function", async () => {
    const mod = await import("./agentLeadHunter");
    expect(typeof mod.getVisitorAnalytics).toBe("function");
  });

  it("trackVisitorBehavior should accept correct parameters", async () => {
    const mod = await import("./agentLeadHunter");
    // Verify function signature accepts the right params
    expect(typeof mod.trackVisitorBehavior).toBe("function");
    expect(mod.trackVisitorBehavior.length).toBe(1); // 1 parameter (data object)
  });
});

describe("Keyword Configuration", () => {
  it("should have Indonesian study abroad keywords configured", async () => {
    const mod = await import("./googleRankingTracker");
    // The module should have TARGET_KEYWORDS
    expect(mod.TARGET_KEYWORDS).toBeDefined();
    expect(Array.isArray(mod.TARGET_KEYWORDS)).toBe(true);
    expect(mod.TARGET_KEYWORDS.length).toBeGreaterThan(5);
    // Should include Indonesian keywords
    const hasIndonesian = mod.TARGET_KEYWORDS.some((kw: any) => 
      kw.keyword.includes("kuliah") || kw.keyword.includes("konsultan") || kw.keyword.includes("pendidikan")
    );
    expect(hasIndonesian).toBe(true);
  });
});
