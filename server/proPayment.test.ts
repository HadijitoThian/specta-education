import { describe, it, expect, vi } from "vitest";

// Mock the env module
vi.mock("./_core/env", () => ({
  ENV: {
    xenditSecretKey: "test_xendit_key",
    xenditWebhookToken: "test_webhook_token",
    resendApiKey: "test_resend_key",
    smtpFrom: "noreply@spectaeducation.com",
    databaseUrl: "mysql://test",
  },
}));

describe("Pro Payment Flow", () => {
  describe("Xendit Service", () => {
    it("should export createProTestInvoice function", async () => {
      const mod = await import("./xenditService");
      expect(mod.createProTestInvoice).toBeDefined();
      expect(typeof mod.createProTestInvoice).toBe("function");
    });

    it("should export verifyWebhookToken function", async () => {
      const mod = await import("./xenditService");
      expect(mod.verifyWebhookToken).toBeDefined();
      expect(typeof mod.verifyWebhookToken).toBe("function");
    });

    it("should export generateExternalId function", async () => {
      const mod = await import("./xenditService");
      expect(mod.generateExternalId).toBeDefined();
      const id = mod.generateExternalId();
      expect(id).toMatch(/^TESBAKAT-PRO-/);
    });

    it("should export getProTestPrice function returning 79000", async () => {
      const mod = await import("./xenditService");
      expect(mod.getProTestPrice()).toBe(79000);
    });
  });

  describe("Resend Service", () => {
    it("should export sendProAccessLinkEmail function", async () => {
      const mod = await import("./resendService");
      expect(mod.sendProAccessLinkEmail).toBeDefined();
      expect(typeof mod.sendProAccessLinkEmail).toBe("function");
    });

    it("should export sendPaymentConfirmationEmail function", async () => {
      const mod = await import("./resendService");
      expect(mod.sendPaymentConfirmationEmail).toBeDefined();
      expect(typeof mod.sendPaymentConfirmationEmail).toBe("function");
    });
  });

  describe("Webhook Verification", () => {
    it("should verify webhook token correctly", async () => {
      const mod = await import("./xenditService");
      // Valid token
      const validResult = mod.verifyWebhookToken("test_webhook_token");
      expect(validResult).toBe(true);
      // Invalid token
      const invalidResult = mod.verifyWebhookToken("wrong_token");
      expect(invalidResult).toBe(false);
    });
  });

  describe("ProLandingPage Component", () => {
    it("should be importable as a React component", async () => {
      const mod = await import("../client/src/components/ProLandingPage");
      expect(mod.default).toBeDefined();
    });
  });

  describe("ProUpsellCard Component", () => {
    it("should be importable as a React component", async () => {
      const mod = await import("../client/src/components/ProUpsellCard");
      expect(mod.default).toBeDefined();
    });
  });

  describe("ProPaymentSuccess Page", () => {
    it("should be importable as a React component", async () => {
      const mod = await import("../client/src/pages/ProPaymentSuccess");
      expect(mod.default).toBeDefined();
    });
  });
});
