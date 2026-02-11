import { describe, expect, it } from "vitest";
import { verifySmtpConnection, sendEmail } from "./email";

describe("SMTP Email Service", () => {
  it("verifies SMTP connection is working", async () => {
    const result = await verifySmtpConnection();
    expect(result).toBe(true);
  }, 15000);

  it("sends a test email successfully", async () => {
    const result = await sendEmail({
      to: "spectae@spectaeducation.com",
      subject: "SpecTa Education - SMTP Test",
      html: "<h1>SMTP Test</h1><p>This is a test email from SpecTa Education system. If you received this, SMTP is working correctly.</p>",
    });
    expect(result).toBe(true);
  }, 15000);
});
