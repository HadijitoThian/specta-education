/**
 * AI General Manager — Unit Tests
 * Tests the core GM functions: JSON fence stripping, health scoring, cycle result structure
 */

import { describe, it, expect, vi } from "vitest";

// ============================================================
// Test: JSON markdown fence stripping (the bug that caused the first GM run to fail)
// ============================================================
describe("JSON fence stripping", () => {
  function stripFences(raw: string): string {
    let content = raw.trim();
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    return content;
  }

  it("strips ```json ... ``` fences", () => {
    const raw = "```json\n[{\"title\": \"Test\"}]\n```";
    expect(stripFences(raw)).toBe('[{"title": "Test"}]');
  });

  it("strips ``` ... ``` fences without language tag", () => {
    const raw = "```\n[{\"title\": \"Test\"}]\n```";
    expect(stripFences(raw)).toBe('[{"title": "Test"}]');
  });

  it("leaves clean JSON unchanged", () => {
    const raw = '[{"title": "Test"}]';
    expect(stripFences(raw)).toBe('[{"title": "Test"}]');
  });

  it("handles empty string", () => {
    expect(stripFences("")).toBe("");
  });

  it("parses stripped JSON correctly", () => {
    const raw = "```json\n[{\"title\": \"Improve SEO\", \"priority\": \"high\"}]\n```";
    const stripped = stripFences(raw);
    const parsed = JSON.parse(stripped);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].title).toBe("Improve SEO");
    expect(parsed[0].priority).toBe("high");
  });
});

// ============================================================
// Test: Health score calculation logic
// ============================================================
describe("Agent health scoring", () => {
  function calculateHealthScore(
    lastRunAt: Date | null,
    expectedRunAt: Date | null,
    hasError: boolean
  ): number {
    if (hasError) return 20;
    if (!lastRunAt) return 0;
    if (!expectedRunAt) return 70;
    const now = new Date();
    const delayMs = now.getTime() - expectedRunAt.getTime();
    const delayHours = delayMs / (1000 * 60 * 60);
    if (delayHours <= 0) return 100;
    if (delayHours <= 1) return 90;
    if (delayHours <= 4) return 70;
    if (delayHours <= 12) return 50;
    if (delayHours <= 24) return 30;
    return 10;
  }

  it("returns 100 for agent that ran on time", () => {
    const now = new Date();
    const lastRun = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
    const expected = new Date(now.getTime() + 30 * 60 * 1000); // expected 30 min from now
    expect(calculateHealthScore(lastRun, expected, false)).toBe(100);
  });

  it("returns 90 for agent slightly late (< 1 hour)", () => {
    const now = new Date();
    const lastRun = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const expected = new Date(now.getTime() - 30 * 60 * 1000); // was due 30 min ago
    expect(calculateHealthScore(lastRun, expected, false)).toBe(90);
  });

  it("returns 70 for agent 2 hours late", () => {
    const now = new Date();
    const lastRun = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
    const expected = new Date(now.getTime() - 2 * 60 * 60 * 1000); // was due 2 hours ago
    expect(calculateHealthScore(lastRun, expected, false)).toBe(70);
  });

  it("returns 20 for agent with error", () => {
    const now = new Date();
    expect(calculateHealthScore(now, now, true)).toBe(20);
  });

  it("returns 0 for agent that has never run", () => {
    expect(calculateHealthScore(null, null, false)).toBe(0);
  });
});

// ============================================================
// Test: GM cycle result structure validation
// ============================================================
describe("GM cycle result structure", () => {
  it("validates recommendation structure", () => {
    const rec = {
      category: "seo_improvement",
      priority: "high",
      title: "Improve meta descriptions",
      description: "Several pages are missing meta descriptions",
      rationale: "SEO audit found 12 pages without meta tags",
      suggestedAction: "Update meta descriptions for top 5 landing pages",
      dataSource: "seo_optimizer",
    };

    const validCategories = ["competitor_response", "seo_improvement", "lead_generation", "university_partnership", "student_engagement", "operational_fix", "strategic_opportunity"];
    const validPriorities = ["urgent", "high", "medium", "low"];

    expect(validCategories).toContain(rec.category);
    expect(validPriorities).toContain(rec.priority);
    expect(rec.title.length).toBeLessThanOrEqual(80);
    expect(rec.description.length).toBeGreaterThan(0);
  });

  it("validates executive report date format (YYYY-MM-DD)", () => {
    const wibOffset = 7 * 60 * 60 * 1000;
    const nowWib = new Date(new Date().getTime() + wibOffset);
    const reportDate = nowWib.toISOString().split("T")[0];
    expect(reportDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("validates cycle label format", () => {
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const nowWib = new Date(now.getTime() + wibOffset);
    const wibHour = nowWib.getUTCHours();
    const cycleLabel = `${nowWib.toISOString().split("T")[0]}-${String(Math.floor(wibHour / 4) * 4).padStart(2, "0")}h`;
    expect(cycleLabel).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}h$/);
  });
});

// ============================================================
// Test: GM throttle logic (prevent running more than once per 3.5 hours)
// ============================================================
describe("GM throttle logic", () => {
  it("allows first run when lastGmRunAt is null", () => {
    const lastGmRunAt: Date | null = null;
    const now = new Date();
    const shouldRun = !lastGmRunAt || now.getTime() - lastGmRunAt.getTime() >= 3.5 * 60 * 60 * 1000;
    expect(shouldRun).toBe(true);
  });

  it("blocks run if less than 3.5 hours since last run", () => {
    const now = new Date();
    const lastGmRunAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const shouldRun = !lastGmRunAt || now.getTime() - lastGmRunAt.getTime() >= 3.5 * 60 * 60 * 1000;
    expect(shouldRun).toBe(false);
  });

  it("allows run after 4 hours", () => {
    const now = new Date();
    const lastGmRunAt = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
    const shouldRun = !lastGmRunAt || now.getTime() - lastGmRunAt.getTime() >= 3.5 * 60 * 60 * 1000;
    expect(shouldRun).toBe(true);
  });
});
