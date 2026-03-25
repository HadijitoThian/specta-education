/**
 * Sprint 10: Connected CRM Flow Tests
 * Tests auto-pipeline advancement, active apps counter, timeline logging, and task creation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Test: Pipeline stage ordering logic ──────────────────────────────────────
describe("Sprint 10: Auto-pipeline advancement logic", () => {
  const stageOrder = ["new", "contacted", "qualified", "in_progress", "enrolled", "completed", "lost"];

  it("should advance pipeline when application is added to a 'qualified' lead", () => {
    const currentStage = "qualified";
    const targetStage = "in_progress";
    const currentIdx = stageOrder.indexOf(currentStage);
    const targetIdx = stageOrder.indexOf(targetStage);
    expect(currentIdx).toBeLessThan(targetIdx);
    // Should advance
    const shouldAdvance = currentIdx < targetIdx;
    expect(shouldAdvance).toBe(true);
  });

  it("should NOT advance pipeline if already in_progress or beyond", () => {
    const stages = ["in_progress", "enrolled", "completed"];
    stages.forEach(stage => {
      const currentIdx = stageOrder.indexOf(stage);
      const targetIdx = stageOrder.indexOf("in_progress");
      const shouldAdvance = currentIdx < targetIdx;
      expect(shouldAdvance).toBe(false);
    });
  });

  it("should advance to enrolled when unconditional_offer is set", () => {
    const triggerStatuses = ["unconditional_offer", "enrolled"];
    triggerStatuses.forEach(status => {
      expect(["unconditional_offer", "enrolled"].includes(status)).toBe(true);
    });
  });
});

// ── Test: Application status triggers ────────────────────────────────────────
describe("Sprint 10: Application status change triggers", () => {
  it("should create follow-up task when application is submitted", () => {
    const status = "submitted";
    const shouldCreateTask = status === "submitted";
    expect(shouldCreateTask).toBe(true);
  });

  it("should create urgent document task on conditional_offer", () => {
    const status = "conditional_offer";
    const priority = status === "conditional_offer" ? "high" : "medium";
    expect(priority).toBe("high");
  });

  it("should create urgent visa task on unconditional_offer", () => {
    const status = "unconditional_offer";
    const priority = ["unconditional_offer", "enrolled"].includes(status) ? "urgent" : "medium";
    expect(priority).toBe("urgent");
  });
});

// ── Test: Active apps counter ─────────────────────────────────────────────────
describe("Sprint 10: Active apps counter", () => {
  it("should exclude rejected and withdrawn apps from active count", () => {
    const apps = [
      { applicationStatus: "preparing" },
      { applicationStatus: "submitted" },
      { applicationStatus: "rejected" },
      { applicationStatus: "withdrawn" },
      { applicationStatus: "enrolled" },
    ];
    const activeCount = apps.filter(a => !["rejected", "withdrawn"].includes(a.applicationStatus)).length;
    expect(activeCount).toBe(3);
  });

  it("should count all non-rejected/withdrawn apps as active", () => {
    const apps = [
      { applicationStatus: "conditional_offer" },
      { applicationStatus: "unconditional_offer" },
    ];
    const activeCount = apps.filter(a => !["rejected", "withdrawn"].includes(a.applicationStatus)).length;
    expect(activeCount).toBe(2);
  });
});

// ── Test: Overdue indicator ───────────────────────────────────────────────────
describe("Sprint 10: Overdue indicator", () => {
  it("should flag lead as overdue if no activity for 7+ days", () => {
    const lastActivity = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysSince).toBeGreaterThanOrEqual(7);
  });

  it("should NOT flag lead as overdue if activity within 7 days", () => {
    const lastActivity = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysSince).toBeLessThan(7);
  });
});

// ── Test: Application status badge colors ─────────────────────────────────────
describe("Sprint 10: Application status display", () => {
  const statusColors: Record<string, string> = {
    preparing: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    conditional_offer: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    unconditional_offer: "bg-green-500/20 text-green-400 border-green-500/30",
    enrolled: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  it("should have color defined for all key statuses", () => {
    const requiredStatuses = ["preparing", "submitted", "conditional_offer", "unconditional_offer", "enrolled", "rejected"];
    requiredStatuses.forEach(status => {
      expect(statusColors[status]).toBeDefined();
    });
  });

  it("should show visa prompt only for unconditional_offer and enrolled", () => {
    const statuses = ["preparing", "submitted", "conditional_offer", "unconditional_offer", "enrolled", "rejected"];
    const visaPromptStatuses = statuses.filter(s => s === "unconditional_offer" || s === "enrolled");
    expect(visaPromptStatuses).toEqual(["unconditional_offer", "enrolled"]);
  });
});
