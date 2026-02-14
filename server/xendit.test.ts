import { describe, it, expect } from "vitest";

describe("Xendit API Key Validation", () => {
  it("should have XENDIT_SECRET_KEY configured", () => {
    const key = process.env.XENDIT_SECRET_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
    expect(key!.startsWith("xnd_")).toBe(true);
  });

  it("should have XENDIT_WEBHOOK_TOKEN configured", () => {
    const token = process.env.XENDIT_WEBHOOK_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(0);
  });

  it("should be able to reach Xendit API", async () => {
    const key = process.env.XENDIT_SECRET_KEY;
    if (!key) {
      console.warn("Skipping Xendit API test - no key configured");
      return;
    }

    const response = await fetch("https://api.xendit.co/balance", {
      headers: {
        Authorization: `Basic ${Buffer.from(key + ":").toString("base64")}`,
      },
    });

    // 200 = valid key, 401 = invalid key
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("balance");
  }, 15000);
});
