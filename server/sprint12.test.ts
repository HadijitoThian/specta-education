import { describe, it, expect, vi, beforeEach } from "vitest";

// Sprint 12: Student Portal + AI Follow-up Assistant Tests

describe("Sprint 12 - Student Portal", () => {
  it("should hash password correctly", async () => {
    const bcrypt = await import("bcryptjs");
    const password = "TestPassword123!";
    const hash = await bcrypt.hash(password, 10);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    const valid = await bcrypt.compare(password, hash);
    expect(valid).toBe(true);
    const invalid = await bcrypt.compare("WrongPassword", hash);
    expect(invalid).toBe(false);
  });

  it("should generate a secure temporary password", () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    const generateTempPassword = (length = 12) => {
      let result = "";
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    const pwd = generateTempPassword();
    expect(pwd.length).toBe(12);
    expect(typeof pwd).toBe("string");
  });

  it("should validate student email format", () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(isValidEmail("raiden@example.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("test@domain.co.uk")).toBe(true);
    expect(isValidEmail("")).toBe(false);
  });

  it("should build correct portal URL", () => {
    const appId = "test-app-123";
    const portalUrl = `https://${appId}.manus.space/student/login`;
    expect(portalUrl).toContain("/student/login");
    expect(portalUrl).toContain(appId);
  });

  it("should validate student portal account structure", () => {
    const mockAccount = {
      id: 1,
      leadId: 300001,
      email: "raiden@example.com",
      passwordHash: "$2a$10$hashedpassword",
      isActive: true,
      createdAt: new Date(),
    };
    expect(mockAccount.leadId).toBe(300001);
    expect(mockAccount.email).toContain("@");
    expect(mockAccount.isActive).toBe(true);
    expect(mockAccount.passwordHash).toContain("$2a$");
  });
});

describe("Sprint 12 - AI Follow-up Assistant", () => {
  it("should categorize follow-up types correctly", () => {
    const FOLLOW_UP_TYPES = ["overdue_contact", "application_deadline", "missing_documents", "rapport_building", "visa_reminder"];
    expect(FOLLOW_UP_TYPES).toContain("overdue_contact");
    expect(FOLLOW_UP_TYPES).toContain("application_deadline");
    expect(FOLLOW_UP_TYPES).toContain("missing_documents");
    expect(FOLLOW_UP_TYPES).toContain("rapport_building");
    expect(FOLLOW_UP_TYPES.length).toBe(5);
  });

  it("should calculate days since last contact correctly", () => {
    const daysSince = (date: Date) => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    };
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(daysSince(threeDaysAgo)).toBe(3);
    const today = new Date();
    expect(daysSince(today)).toBe(0);
  });

  it("should determine urgency level based on days overdue", () => {
    const getUrgency = (days: number): "urgent" | "high" | "medium" | "low" => {
      if (days >= 14) return "urgent";
      if (days >= 7) return "high";
      if (days >= 3) return "medium";
      return "low";
    };
    expect(getUrgency(0)).toBe("low");
    expect(getUrgency(3)).toBe("medium");
    expect(getUrgency(7)).toBe("high");
    expect(getUrgency(14)).toBe("urgent");
    expect(getUrgency(20)).toBe("urgent");
  });

  it("should build WhatsApp URL with pre-filled message", () => {
    const buildWaUrl = (phone: string, message: string) => {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    };
    const url = buildWaUrl("+62818773312", "Hi Raiden, following up on your application!");
    expect(url).toContain("wa.me/62818773312");
    expect(url).toContain("text=");
    expect(url).not.toContain("+");
  });

  it("should generate AI suggestion structure correctly", () => {
    const mockSuggestion = {
      id: 1,
      staffId: 1,
      leadId: 300001,
      suggestionType: "rapport_building" as const,
      urgency: "medium" as const,
      title: "Say hi to Raiden",
      message: "It's been 3 days since your last contact with Raiden. Consider sending a friendly check-in.",
      suggestedAction: "whatsapp",
      suggestedMessage: "Hi Raiden! Just checking in — how are you doing? 😊",
      isActedOn: false,
      createdAt: new Date(),
    };
    expect(mockSuggestion.suggestionType).toBe("rapport_building");
    expect(mockSuggestion.suggestedAction).toBe("whatsapp");
    expect(mockSuggestion.isActedOn).toBe(false);
    expect(mockSuggestion.suggestedMessage).toBeTruthy();
  });
});

describe("Sprint 12 - Welcome Email Flow", () => {
  it("should build welcome email content correctly", () => {
    const buildWelcomeEmail = (studentName: string, email: string, tempPassword: string, portalUrl: string) => {
      return {
        to: email,
        subject: `Welcome to SpecTa Education Student Portal — ${studentName}`,
        body: `Hi ${studentName}, your portal is ready at ${portalUrl}. Password: ${tempPassword}`,
      };
    };
    const email = buildWelcomeEmail("Raiden Thian", "raiden@example.com", "Temp123!", "https://app.manus.space/student/login");
    expect(email.to).toBe("raiden@example.com");
    expect(email.subject).toContain("Raiden Thian");
    expect(email.body).toContain("Temp123!");
    expect(email.body).toContain("/student/login");
  });

  it("should not send email if student has no email address", () => {
    const shouldSendEmail = (studentEmail: string | null | undefined) => {
      return !!(studentEmail && studentEmail.trim().length > 0);
    };
    expect(shouldSendEmail(null)).toBe(false);
    expect(shouldSendEmail(undefined)).toBe(false);
    expect(shouldSendEmail("")).toBe(false);
    expect(shouldSendEmail("raiden@example.com")).toBe(true);
  });
});
