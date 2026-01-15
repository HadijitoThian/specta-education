import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
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

function createUserContext(): TrpcContext {
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

describe("chat.getHistory", () => {
  it("returns empty messages for new session", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getHistory({
      sessionId: "test-session-" + Date.now()
    });

    expect(result).toHaveProperty("messages");
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBe(0);
  });
});

describe("chat.sendMessage", () => {
  it("accepts a message and returns a response", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);

    const sessionId = "test-session-" + Date.now();

    // Send a simple greeting message
    const result = await caller.chat.sendMessage({
      sessionId,
      message: "Hello, I want to study abroad",
      conversationHistory: [
        { role: "user", content: "Hello, I want to study abroad" }
      ]
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
    expect(typeof result.message).toBe("string");
  }, 30000);
});

describe("admin.getLeads", () => {
  it("returns leads for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getLeads();

    expect(result).toHaveProperty("leads");
    expect(Array.isArray(result.leads)).toBe(true);
  });

  it("returns empty leads for non-admin users (graceful handling)", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // The router returns empty array for non-admins instead of throwing
    const result = await caller.admin.getLeads();
    expect(result.leads).toEqual([]);
  });
});

describe("admin.getConversations", () => {
  it("returns conversations for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getConversations();

    expect(result).toHaveProperty("conversations");
    expect(Array.isArray(result.conversations)).toBe(true);
  });
});

describe("admin.getDocuments", () => {
  it("returns documents for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getDocuments();

    expect(result).toHaveProperty("documents");
    expect(Array.isArray(result.documents)).toBe(true);
  });
});
