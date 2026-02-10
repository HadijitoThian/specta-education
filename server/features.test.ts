import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@specta.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@specta.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ==========================================
// APPOINTMENT BOOKING TESTS
// ==========================================
describe("appointment", () => {
  it("returns available time slots for a given date", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.appointment.getAvailableSlots({
      date: "2026-03-15",
    });

    expect(result).toHaveProperty("slots");
    expect(result).toHaveProperty("closed");
    expect(Array.isArray(result.slots)).toBe(true);
  });

  it("successfully books an appointment with valid data", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.appointment.book({
      fullName: "Test Student",
      email: "test@student.com",
      phone: "+628123456789",
      date: "2026-04-20",
      timeSlot: "10:00",
      consultationType: "general",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("appointment");
    expect(result.appointment).toHaveProperty("id");
  });

  it("rejects booking with invalid email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.appointment.book({
        fullName: "Test Student",
        email: "invalid-email",
        phone: "+628123456789",
        date: "2026-04-20",
        timeSlot: "10:00",
        consultationType: "general",
      })
    ).rejects.toThrow();
  });

  it("rejects booking with empty name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.appointment.book({
        fullName: "",
        email: "test@student.com",
        phone: "+628123456789",
        date: "2026-04-20",
        timeSlot: "10:00",
        consultationType: "general",
      })
    ).rejects.toThrow();
  });
});

// ==========================================
// APPLICATION SUBMIT & TRACKING TESTS
// ==========================================
describe("application", () => {
  it("submits an application and returns reference number", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.application.submit({
      fullName: "Test Applicant",
      email: "applicant@test.com",
      phone: "+628111222333",
      currentSchool: "Test High School",
      selectedUniversities: JSON.stringify([
        { university: "University of Melbourne", country: "Australia", program: "Computer Science" },
      ]),
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("referenceNumber");
    expect(result.referenceNumber).toMatch(/^SPECTA-/);
  });

  it("rejects application with missing required fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.application.submit({
        fullName: "",
        email: "applicant@test.com",
        phone: "+628111222333",
        selectedUniversities: "[]",
      })
    ).rejects.toThrow();
  });
});

// ==========================================
// TRACKER (MAGIC LINK) TESTS
// ==========================================
describe("tracker", () => {
  it("returns error for non-existent email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.tracker.requestMagicLink({
      email: "nonexistent@email.com",
    });

    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("error");
  });

  it("returns error for invalid token", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.tracker.getByToken({
      token: "invalid-token-12345",
    });

    expect(result).toHaveProperty("success", false);
  });
});

// ==========================================
// ADMIN ACCESS CONTROL TESTS
// ==========================================
describe("admin access control", () => {
  it("admin can view appointments", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.getAppointments();

    expect(result).toHaveProperty("appointments");
    expect(Array.isArray(result.appointments)).toBe(true);
  });

  it("non-admin gets empty appointments", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.admin.getAppointments();

    expect(result.appointments).toEqual([]);
  });

  it("admin can view IELTS practice results", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.getIeltsPracticeResults();

    expect(result).toHaveProperty("results");
    expect(Array.isArray(result.results)).toBe(true);
  });

  it("non-admin gets empty IELTS results", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.admin.getIeltsPracticeResults();

    expect(result.results).toEqual([]);
  });

  it("admin can view all applications", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.application.getAll();

    expect(result).toHaveProperty("applications");
    expect(Array.isArray(result.applications)).toBe(true);
  });

  it("non-admin gets empty applications list", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.application.getAll();

    expect(result.applications).toEqual([]);
  });
});

// ==========================================
// IELTS PRACTICE TESTS
// ==========================================
describe("ieltsPractice", () => {
  it("generates reading questions via AI", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.ieltsPractice.generateQuestions({
      section: "reading",
      count: 3,
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("data");
    // The result should have data with questions from AI
    expect(result.data).toBeTruthy();
  }, 30000); // 30s timeout for AI call

  it("rejects invalid section type", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.ieltsPractice.generateQuestions({
        section: "invalid" as any,
        count: 3,
      })
    ).rejects.toThrow();
  });
});
