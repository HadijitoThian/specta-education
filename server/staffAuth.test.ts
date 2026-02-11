import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@spectaeducation.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUserContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("staffAuth", () => {
  describe("createAccount", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.staffAuth.createAccount({
          name: "Test Staff",
          email: "test@spectaeducation.com",
          password: "temp123",
          role: "counselor",
        })
      ).rejects.toThrow();
    });

    it("requires admin or general_manager role", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.staffAuth.createAccount({
        name: "Test Staff",
        email: "test@spectaeducation.com",
        password: "temp123",
        role: "counselor",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("admin");
    });

    it("validates input fields", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Empty name should fail validation
      await expect(
        caller.staffAuth.createAccount({
          name: "",
          email: "test@spectaeducation.com",
          password: "temp123",
          role: "counselor",
        })
      ).rejects.toThrow();

      // Short password should fail validation
      await expect(
        caller.staffAuth.createAccount({
          name: "Test Staff",
          email: "test@spectaeducation.com",
          password: "ab",
          role: "counselor",
        })
      ).rejects.toThrow();
    });
  });

  describe("login", () => {
    it("rejects empty credentials", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.staffAuth.login({
          email: "",
          password: "",
        })
      ).rejects.toThrow();
    });

    it("rejects non-existent email", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.staffAuth.login({
        email: "nonexistent@spectaeducation.com",
        password: "somepassword",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getAccounts", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.staffAuth.getAccounts()).rejects.toThrow();
    });

    it("returns list for any authenticated user (filtered server-side)", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.staffAuth.getAccounts();
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns list for admin users", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.staffAuth.getAccounts();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("changePassword", () => {
    it("rejects unauthenticated requests", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.staffAuth.changePassword({
          currentPassword: "old123",
          newPassword: "new123",
        })
      ).rejects.toThrow();
    });
  });
});
