import { describe, it, expect } from "vitest";

describe("agentSeoOptimizer", () => {
  it("exports runSeoOptimizerAgent function", async () => {
    const mod = await import("./agentSeoOptimizer");
    expect(typeof mod.runSeoOptimizerAgent).toBe("function");
  });

  it("module loads without errors", async () => {
    const mod = await import("./agentSeoOptimizer");
    expect(mod).toBeDefined();
    // The module should export the main runner
    expect(mod.runSeoOptimizerAgent).toBeDefined();
  });

  it("seo_page_audits and seo_scores tables exist in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.seoPageAudits).toBeDefined();
    expect(schema.seoScoreHistory).toBeDefined();
    expect(schema.seoRecommendations).toBeDefined();
  });
});
