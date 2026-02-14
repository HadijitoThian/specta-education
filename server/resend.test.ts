import { describe, it, expect } from "vitest";

describe("Resend API Key Validation", () => {
  it("should have RESEND_API_KEY configured", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
    expect(key!.startsWith("re_")).toBe(true);
  });

  it("should be able to reach Resend API", async () => {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.warn("Skipping Resend API test - no key configured");
      return;
    }

    // Use the domains endpoint to validate the key without sending an email
    const response = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    // 200 = valid key, 401/403 = invalid key
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("data");
  }, 15000);
});
