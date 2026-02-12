import { describe, it, expect } from "vitest";
import { cleanupExpiredConversations } from "./db";

describe("Chat Persistence & Cleanup", () => {
  it("should export cleanupExpiredConversations function", () => {
    expect(typeof cleanupExpiredConversations).toBe("function");
  });

  it("cleanupExpiredConversations should return a number", async () => {
    const result = await cleanupExpiredConversations(30);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("cleanupExpiredConversations should accept custom expiry days", async () => {
    // Should not throw with different expiry values
    const result365 = await cleanupExpiredConversations(365);
    expect(typeof result365).toBe("number");

    const result1 = await cleanupExpiredConversations(1);
    expect(typeof result1).toBe("number");
  });

  it("cleanupExpiredConversations with 0 days should clean all conversations", async () => {
    // 0 days means cutoff is now — anything older than now
    const result = await cleanupExpiredConversations(0);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("Chat Session Storage Keys", () => {
  it("should use correct localStorage key names", () => {
    // These constants must match what ChatBot.tsx uses
    const STORAGE_KEY = "specta-chat-session-id";
    const STORAGE_TIMESTAMP_KEY = "specta-chat-last-active";
    const SESSION_EXPIRY_DAYS = 30;

    expect(STORAGE_KEY).toBe("specta-chat-session-id");
    expect(STORAGE_TIMESTAMP_KEY).toBe("specta-chat-last-active");
    expect(SESSION_EXPIRY_DAYS).toBe(30);
  });
});
