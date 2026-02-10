import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

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

describe("counselor management", () => {
  it("admin can create a counselor", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counselor.create({
      name: "Sarah Johnson",
      email: "sarah@specta.com",
      phone: "+6281234567890",
      specialization: "UK Universities",
    });

    expect(result.success).toBe(true);
    expect(result.counselor).toBeTruthy();
    expect(result.counselor?.name).toBe("Sarah Johnson");
    expect(result.counselor?.email).toBe("sarah@specta.com");
    expect(result.counselor?.specialization).toBe("UK Universities");
  });

  it("general manager can create a counselor", async () => {
    const ctx = createContext("general_manager");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counselor.create({
      name: "GM Counselor",
      email: "gm-counselor@specta.com",
    });

    expect(result.success).toBe(true);
    expect(result.counselor).toBeTruthy();
  });

  it("regular user cannot create a counselor", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counselor.create({
      name: "Blocked Counselor",
      email: "blocked@specta.com",
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
