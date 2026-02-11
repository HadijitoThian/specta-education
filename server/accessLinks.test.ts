import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Test the access token db helpers
describe("Access Token DB Helpers", () => {
  it("should export all required db helper functions", async () => {
    const db = await import("./db");
    expect(typeof db.createAccessTokens).toBe("function");
    expect(typeof db.getAccessTokenByToken).toBe("function");
    expect(typeof db.listAccessTokens).toBe("function");
    expect(typeof db.markTokenInProgress).toBe("function");
    expect(typeof db.markTokenCompleted).toBe("function");
    expect(typeof db.deleteAccessToken).toBe("function");
  });

  it("should generate tokens and retrieve them", async () => {
    const { createAccessTokens, listAccessTokens, deleteAccessToken } = await import("./db");
    
    // Create 3 test tokens with expiry 1 day from now
    const expiresAt = new Date(Date.now() + 86400000);
    const tokens = Array.from({ length: 3 }, () => ({
      token: crypto.randomBytes(16).toString("hex"),
      expiresAt,
    }));
    const created = await createAccessTokens(tokens);
    
    expect(created).toBeDefined();
    expect(created.length).toBe(3);
    
    // Each token should have a unique string
    const tokenStrings = created.map(t => t.token);
    const uniqueTokens = new Set(tokenStrings);
    expect(uniqueTokens.size).toBe(3);
    
    // Each should have status "unused"
    for (const t of created) {
      expect(t.status).toBe("unused");
    }
    
    // List all tokens
    const allTokens = await listAccessTokens();
    expect(allTokens.length).toBeGreaterThanOrEqual(3);
    
    // Clean up test tokens
    for (const t of created) {
      await deleteAccessToken(t.id);
    }
  });

  it("should validate and claim a token correctly", async () => {
    const { createAccessTokens, getAccessTokenByToken, markTokenInProgress, markTokenCompleted, deleteAccessToken } = await import("./db");
    
    // Create a single test token
    const expiresAt = new Date(Date.now() + 86400000);
    const tokenStr = crypto.randomBytes(16).toString("hex");
    const [created] = await createAccessTokens([{ token: tokenStr, expiresAt }]);
    
    // Validate - should be unused
    const found = await getAccessTokenByToken(tokenStr);
    expect(found).toBeDefined();
    expect(found!.status).toBe("unused");
    
    // Claim it (mark in progress)
    const claimed = await markTokenInProgress(tokenStr, "Test User", "test@example.com", "+62812345");
    expect(claimed).toBe(true);
    
    // Validate again - should be in_progress
    const inProgress = await getAccessTokenByToken(tokenStr);
    expect(inProgress!.status).toBe("in_progress");
    expect(inProgress!.usedByName).toBe("Test User");
    expect(inProgress!.usedByEmail).toBe("test@example.com");
    
    // Complete it
    const completed = await markTokenCompleted(tokenStr, 999);
    expect(completed).toBe(true);
    
    // Validate again - should be completed
    const completedRow = await getAccessTokenByToken(tokenStr);
    expect(completedRow!.status).toBe("completed");
    expect(completedRow!.resultId).toBe(999);
    
    // Clean up - need to force delete since it's completed (deleteAccessToken only deletes unused)
    // We'll leave it as completed for now, the test DB will clean up
  });

  it("should not allow claiming an already completed token", async () => {
    const { createAccessTokens, markTokenInProgress, markTokenCompleted } = await import("./db");
    
    const expiresAt = new Date(Date.now() + 86400000);
    const tokenStr = crypto.randomBytes(16).toString("hex");
    await createAccessTokens([{ token: tokenStr, expiresAt }]);
    
    // Claim and complete
    await markTokenInProgress(tokenStr, "User 1", "user1@test.com", "+62812345");
    await markTokenCompleted(tokenStr, 100);
    
    // Try to claim again - should fail (markTokenInProgress only updates unused tokens)
    const secondClaim = await markTokenInProgress(tokenStr, "User 2", "user2@test.com", "+62812346");
    expect(secondClaim).toBe(false);
  });

  it("should handle expired token detection", async () => {
    const { createAccessTokens, getAccessTokenByToken, deleteAccessToken } = await import("./db");
    
    // Create a token that already expired (1 second ago)
    const expiresAt = new Date(Date.now() - 1000);
    const tokenStr = crypto.randomBytes(16).toString("hex");
    const [created] = await createAccessTokens([{ token: tokenStr, expiresAt }]);
    
    // Get token - it exists but is expired
    const found = await getAccessTokenByToken(tokenStr);
    expect(found).toBeDefined();
    expect(new Date(found!.expiresAt).getTime()).toBeLessThan(Date.now());
    
    // Clean up
    await deleteAccessToken(created.id);
  });

  it("should return null for non-existent token", async () => {
    const { getAccessTokenByToken } = await import("./db");
    
    const found = await getAccessTokenByToken("non-existent-token-xyz-" + Date.now());
    expect(found).toBeNull();
  });
});

// Test the schema definition
describe("Access Token Schema", () => {
  it("should have aptitudeAccessTokens table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.aptitudeAccessTokens).toBeDefined();
  });
});
