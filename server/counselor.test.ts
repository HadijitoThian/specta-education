import { describe, expect, it, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Track test counselor IDs for cleanup
const testCounselorIds: number[] = [];

function createContext(role: "admin" | "general_manager" | "user" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// Clean up test counselors after all tests
afterAll(async () => {
  if (testCounselorIds.length > 0) {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    for (const id of testCounselorIds) {
      try {
        await caller.counselor.delete({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
});

describe("counselor management", () => {
  it("admin can create a counselor", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const uniqueEmail = `test-counselor-${Date.now()}@specta-test.com`;

    const result = await caller.counselor.create({
      name: "Test Counselor Admin",
      email: uniqueEmail,
      phone: "+6281234567890",
      specialization: "UK Universities",
    });

    expect(result.success).toBe(true);
    expect(result.counselor).toBeTruthy();
    expect(result.counselor?.name).toBe("Test Counselor Admin");
    expect(result.counselor?.email).toBe(uniqueEmail);
    expect(result.counselor?.specialization).toBe("UK Universities");

    // Track for cleanup
    if (result.counselor?.id) testCounselorIds.push(result.counselor.id);
  });

  it("general manager can create a counselor", async () => {
    const ctx = createContext("general_manager");
    const caller = appRouter.createCaller(ctx);
    const uniqueEmail = `test-gm-${Date.now()}@specta-test.com`;

    const result = await caller.counselor.create({
      name: "Test Counselor GM",
      email: uniqueEmail,
    });

    expect(result.success).toBe(true);
    expect(result.counselor).toBeTruthy();

    // Track for cleanup
    if (result.counselor?.id) testCounselorIds.push(result.counselor.id);
  });

  it("regular user cannot create a counselor", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    const uniqueEmail = `test-blocked-${Date.now()}@specta-test.com`;

    const result = await caller.counselor.create({
      name: "Blocked Counselor",
      email: uniqueEmail,
    });

    expect(result.success).toBe(false);
    expect(result.counselor).toBeNull();
  });

  it("admin can list all counselors", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counselor.getAll();

    expect(result.counselors).toBeDefined();
    expect(Array.isArray(result.counselors)).toBe(true);
  });

  it("admin can list active counselors", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counselor.getActive();

    expect(result.counselors).toBeDefined();
    expect(Array.isArray(result.counselors)).toBe(true);
  });

  it("regular user gets empty counselor list", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counselor.getAll();

    expect(result.counselors).toEqual([]);
  });

  it("regular user cannot delete a counselor", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counselor.delete({ id: 999 });

    expect(result.success).toBe(false);
  });
});

describe("team management", () => {
  it("admin can list all users", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userManagement.getUsers();

    expect(result.users).toBeDefined();
    expect(Array.isArray(result.users)).toBe(true);
  });

  it("general manager cannot list users (admin only)", async () => {
    const ctx = createContext("general_manager");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userManagement.getUsers();

    expect(result.users).toEqual([]);
  });

  it("regular user cannot list users", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userManagement.getUsers();

    expect(result.users).toEqual([]);
  });

  it("admin can update user role", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    // This will try to update a non-existent user, but should not throw
    const result = await caller.userManagement.updateRole({
      userId: 999,
      role: "general_manager",
    });

    // The function returns success even if user doesn't exist (no rows affected)
    expect(result).toBeDefined();
  });

  it("non-admin cannot update user role", async () => {
    const ctx = createContext("general_manager");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userManagement.updateRole({
      userId: 999,
      role: "admin",
    });

    expect(result.success).toBe(false);
  });
});
