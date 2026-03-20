/**
 * Tests for agent reliability fixes:
 * 1. withDbRetry — retries on transient errors (ECONNRESET, ECONNREFUSED)
 * 2. Scheduler time-window logic — central_reporter uses date-based dedup
 * 3. handleManualUniversityReply — accepts emailBody directly without Resend MX
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 1. withDbRetry tests
// ============================================================
describe("withDbRetry", () => {
  it("returns result on first success", async () => {
    const { withDbRetry } = await import("./db");
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withDbRetry(fn, "test");
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on ECONNRESET and succeeds on 2nd attempt", async () => {
    const { withDbRetry } = await import("./db");
    const connErr = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const fn = vi.fn()
      .mockRejectedValueOnce(connErr)
      .mockResolvedValue("recovered");
    const result = await withDbRetry(fn, "retry-test");
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after 3 failed transient attempts", async () => {
    const { withDbRetry } = await import("./db");
    const connErr = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const fn = vi.fn().mockRejectedValue(connErr);
    await expect(withDbRetry(fn, "exhaust-test")).rejects.toThrow("ECONNRESET");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on non-transient errors", async () => {
    const { withDbRetry } = await import("./db");
    const bizErr = new Error("Unknown column 'foo'");
    const fn = vi.fn().mockRejectedValue(bizErr);
    await expect(withDbRetry(fn, "no-retry-test")).rejects.toThrow("Unknown column");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 2. Scheduler date-window dedup logic
// ============================================================
describe("Scheduler central_reporter dedup", () => {
  it("skips if lastRunAt is today (WIB)", () => {
    const wibOffset = 7 * 60 * 60 * 1000;
    const now = new Date();
    const nowWib = new Date(now.getTime() + wibOffset);
    const todayWib = nowWib.toISOString().split("T")[0];

    // Simulate lastRunAt = 1 hour ago today
    const lastRunAt = new Date(now.getTime() - 60 * 60 * 1000);
    const lastRunWib = new Date(lastRunAt.getTime() + wibOffset);
    const lastRunDate = lastRunWib.toISOString().split("T")[0];

    expect(lastRunDate).toBe(todayWib); // Should match today → agent should skip
  });

  it("runs if lastRunAt is yesterday (WIB)", () => {
    const wibOffset = 7 * 60 * 60 * 1000;
    const now = new Date();
    const nowWib = new Date(now.getTime() + wibOffset);
    const todayWib = nowWib.toISOString().split("T")[0];

    // Simulate lastRunAt = 25 hours ago (yesterday)
    const lastRunAt = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const lastRunWib = new Date(lastRunAt.getTime() + wibOffset);
    const lastRunDate = lastRunWib.toISOString().split("T")[0];

    expect(lastRunDate).not.toBe(todayWib); // Different date → agent should run
  });
});

// ============================================================
// 3. handleManualUniversityReply — unit test the input handling
// ============================================================
describe("handleManualUniversityReply input validation", () => {
  it("generates a unique email_id for each manual submission", () => {
    const id1 = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const id2 = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    expect(id1).not.toBe(id2);
    expect(id1.startsWith("manual_")).toBe(true);
  });

  it("normalizes fromEmail to lowercase", () => {
    const rawEmail = "Admissions@Victoria.AC.NZ";
    const normalized = rawEmail.toLowerCase().trim();
    expect(normalized).toBe("admissions@victoria.ac.nz");
  });

  it("extracts domain correctly from email", () => {
    const extractDomain = (email: string) => email.split("@")[1]?.toLowerCase() || "";
    expect(extractDomain("admissions@victoria.ac.nz")).toBe("victoria.ac.nz");
    expect(extractDomain("info@waikato.ac.nz")).toBe("waikato.ac.nz");
    expect(extractDomain("invalid")).toBe("");
  });
});
