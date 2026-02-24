import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getConversationBySessionId: vi.fn().mockResolvedValue(null),
    createConversation: vi.fn().mockResolvedValue({
      id: 1,
      sessionId: "test-session-123",
      studentName: null,
      studentPhone: null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    updateConversation: vi.fn().mockResolvedValue(undefined),
    createLead: vi.fn().mockResolvedValue({
      id: 1,
      conversationId: 1,
      studentName: "Test Student",
      studentPhone: "081234567890",
      status: "new",
    }),
    getMessagesByConversationId: vi.fn().mockResolvedValue([]),
    getAllLeads: vi.fn().mockResolvedValue([]),
  };
});

// Mock email functions
vi.mock("./email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./email")>();
  return {
    ...actual,
    sendLeadNotificationEmail: vi.fn().mockResolvedValue({ success: true }),
  };
});

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          summary: "Student interested in studying engineering in Australia",
          tags: ["Australia", "Undergraduate"]
        })
      }
    }]
  }),
}));

function createPublicContext(): TrpcContext {
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

describe("chat.captureLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures a lead with name and phone", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.captureLead({
      sessionId: "test-session-123",
      name: "Test Student",
      phone: "081234567890",
    });

    expect(result.success).toBe(true);
    expect(result.leadId).toBeDefined();
  });

  it("captures an anonymous lead when phone is skipped", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.captureLead({
      sessionId: "test-session-456",
      name: "Anonymous User",
      isAnonymous: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty name", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.captureLead({
        sessionId: "test-session-789",
        name: "",
      })
    ).rejects.toThrow();
  });
});

describe("chat.summarizeIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when no conversation found", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.summarizeIntent({
      sessionId: "nonexistent-session",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No conversation found");
  });

  it("returns error when not enough messages", async () => {
    const { getConversationBySessionId, getMessagesByConversationId } = await import("./db");
    (getConversationBySessionId as any).mockResolvedValueOnce({
      id: 1,
      sessionId: "test-session",
      studentName: "Test",
    });
    (getMessagesByConversationId as any).mockResolvedValueOnce([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello!" },
    ]);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.summarizeIntent({
      sessionId: "test-session",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not enough messages to summarize");
  });

  it("summarizes intent with tags when enough messages exist", async () => {
    const { getConversationBySessionId, getMessagesByConversationId, getAllLeads } = await import("./db");
    (getConversationBySessionId as any).mockResolvedValueOnce({
      id: 1,
      sessionId: "test-session-full",
      studentName: "Test Student",
      studentPhone: "081234567890",
    });
    (getMessagesByConversationId as any).mockResolvedValueOnce([
      { role: "user", content: "I want to study in Australia" },
      { role: "assistant", content: "Great choice!" },
      { role: "user", content: "I'm interested in engineering" },
      { role: "assistant", content: "Engineering is popular" },
      { role: "user", content: "What about scholarships?" },
      { role: "assistant", content: "There are many options" },
    ]);
    (getAllLeads as any).mockResolvedValueOnce([
      { id: 1, conversationId: 1, studentName: "Test Student" }
    ]);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.summarizeIntent({
      sessionId: "test-session-full",
    });

    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBe(true);
  });
});

describe("chat.getHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty messages and null leadState for new session", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getHistory({
      sessionId: "new-session",
    });

    expect(result.messages).toEqual([]);
    expect(result.leadState).toBeNull();
  });

  it("returns leadState for returning user with captured lead", async () => {
    const { getConversationBySessionId, getMessagesByConversationId } = await import("./db");
    (getConversationBySessionId as any).mockResolvedValueOnce({
      id: 1,
      sessionId: "returning-session",
      studentName: "Returning Student",
      studentPhone: "081234567890",
    });
    (getMessagesByConversationId as any).mockResolvedValueOnce([
      { role: "assistant", content: "Hi there!", createdAt: new Date() },
      { role: "user", content: "Hello", createdAt: new Date() },
    ]);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getHistory({
      sessionId: "returning-session",
    });

    expect(result.messages.length).toBe(2);
    expect(result.leadState).toEqual({
      name: "Returning Student",
      phone: "081234567890",
    });
  });
});
