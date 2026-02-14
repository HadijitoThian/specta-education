import { describe, it, expect, vi } from "vitest";

// Mock the env module
vi.mock("./_core/env", () => ({
  ENV: {
    resendApiKey: "test_resend_key",
    smtpFrom: "noreply@spectaeducation.com",
    databaseUrl: "mysql://test",
  },
}));

describe("Email System (Resend)", () => {
  describe("Core sendEmail function", () => {
    it("should export sendEmail function", async () => {
      const mod = await import("./email");
      expect(mod.sendEmail).toBeDefined();
      expect(typeof mod.sendEmail).toBe("function");
    });

    it("should not import nodemailer", async () => {
      // The email.ts should no longer use nodemailer
      const fs = await import("fs");
      const content = fs.readFileSync("server/email.ts", "utf-8");
      expect(content).not.toContain("import nodemailer");
      expect(content).not.toContain("require(\"nodemailer\")");
    });

    it("should use Resend API endpoint", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/email.ts", "utf-8");
      expect(content).toContain("https://api.resend.com");
      expect(content).toContain("resendApiKey");
    });

    it("should support attachments with base64 encoding", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/email.ts", "utf-8");
      expect(content).toContain("toString(\"base64\")");
    });
  });

  describe("verifySmtpConnection (now Resend verification)", () => {
    it("should export verifySmtpConnection function", async () => {
      const mod = await import("./email");
      expect(mod.verifySmtpConnection).toBeDefined();
      expect(typeof mod.verifySmtpConnection).toBe("function");
    });
  });

  describe("Email template functions", () => {
    it("should export sendStaffWelcomeEmail", async () => {
      const mod = await import("./email");
      expect(mod.sendStaffWelcomeEmail).toBeDefined();
      expect(typeof mod.sendStaffWelcomeEmail).toBe("function");
    });

    it("should export sendDocumentNotificationEmail", async () => {
      const mod = await import("./email");
      expect(mod.sendDocumentNotificationEmail).toBeDefined();
      expect(typeof mod.sendDocumentNotificationEmail).toBe("function");
    });

    it("should export sendPasswordResetEmail", async () => {
      const mod = await import("./email");
      expect(mod.sendPasswordResetEmail).toBeDefined();
      expect(typeof mod.sendPasswordResetEmail).toBe("function");
    });

    it("should export sendCounselorAssignmentEmail", async () => {
      const mod = await import("./email");
      expect(mod.sendCounselorAssignmentEmail).toBeDefined();
      expect(typeof mod.sendCounselorAssignmentEmail).toBe("function");
    });

    it("should export sendStudentNotificationEmail", async () => {
      const mod = await import("./email");
      expect(mod.sendStudentNotificationEmail).toBeDefined();
      expect(typeof mod.sendStudentNotificationEmail).toBe("function");
    });

    it("should export sendAptitudeResultsEmail", async () => {
      const mod = await import("./email");
      expect(mod.sendAptitudeResultsEmail).toBeDefined();
      expect(typeof mod.sendAptitudeResultsEmail).toBe("function");
    });
  });

  describe("Resend API integration", () => {
    it("should use FROM_EMAIL with spectaeducation.com domain", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/email.ts", "utf-8");
      expect(content).toContain("noreply@spectaeducation.com");
    });

    it("should handle missing API key gracefully", async () => {
      // Reset modules to test with empty key
      vi.resetModules();
      vi.mock("./_core/env", () => ({
        ENV: {
          resendApiKey: "",
          smtpFrom: "noreply@spectaeducation.com",
          databaseUrl: "mysql://test",
        },
      }));

      const mod = await import("./email");
      const result = await mod.sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });
      expect(result).toBe(false);
    });
  });
});
