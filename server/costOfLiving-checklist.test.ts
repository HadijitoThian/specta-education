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

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
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

// =============================================
// COST OF LIVING TESTS
// =============================================
describe("costOfLiving", () => {
  describe("getByCountry", () => {
    it("returns structured cost data for a valid country slug", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.costOfLiving.getByCountry({ countrySlug: "singapore" });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("cities");
      expect(result).toHaveProperty("byCity");
      expect(result).toHaveProperty("country");
      expect(result).toHaveProperty("localCurrency");
      expect(result.cities.length).toBeGreaterThan(0);
      expect(result.country).toBe("Singapore");
    });

    it("returns data with all expected categories per city", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.costOfLiving.getByCountry({ countrySlug: "uk" });
      
      const firstCity = result.cities[0];
      const cityData = result.byCity[firstCity];
      const categories = new Set(cityData.map(r => r.category));
      expect(categories.has("rent")).toBe(true);
      expect(categories.has("food")).toBe(true);
      expect(categories.has("transport")).toBe(true);
      expect(categories.has("utilities")).toBe(true);
      expect(categories.has("entertainment")).toBe(true);
    });

    it("returns empty data for non-existent country", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.costOfLiving.getByCountry({ countrySlug: "nonexistent" });
      
      expect(result.cities).toEqual([]);
      expect(result.country).toBe("");
    });

    it("returns multiple cities for countries with multiple cities", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.costOfLiving.getByCountry({ countrySlug: "uk" });
      
      expect(result.cities.length).toBeGreaterThanOrEqual(2);
    });

    it("returns bilingual notes in city data", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.costOfLiving.getByCountry({ countrySlug: "australia" });
      
      const firstCity = result.cities[0];
      const cityData = result.byCity[firstCity];
      const withNotes = cityData.filter(r => r.notes);
      expect(withNotes.length).toBeGreaterThan(0);
      const withNotesId = cityData.filter(r => r.notesId);
      expect(withNotesId.length).toBeGreaterThan(0);
    });

    it("has valid USD amounts (min <= max)", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.costOfLiving.getByCountry({ countrySlug: "canada" });
      
      for (const city of result.cities) {
        for (const item of result.byCity[city]) {
          expect(item.amountMinUsd).toBeLessThanOrEqual(item.amountMaxUsd);
          expect(item.amountMinLocal).toBeLessThanOrEqual(item.amountMaxLocal);
        }
      }
    });

    it("returns local currency information", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.costOfLiving.getByCountry({ countrySlug: "usa" });
      
      expect(result.localCurrency).toBeTruthy();
      for (const city of result.cities) {
        for (const item of result.byCity[city]) {
          expect(item.amountMinLocal).toBeGreaterThan(0);
        }
      }
    });

    it("returns data for all 8 seeded countries", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const slugs = ["singapore", "china", "uk", "australia", "canada", "usa", "ireland", "netherlands"];
      
      for (const slug of slugs) {
        const result = await caller.costOfLiving.getByCountry({ countrySlug: slug });
        expect(result.cities.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================
// CHECKLIST TESTS
// =============================================
describe("checklist", () => {
  describe("getItems", () => {
    it("returns all checklist items (public endpoint)", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.checklist.getItems();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(30);
    });

    it("returns items with all required fields", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.checklist.getItems();
      
      const firstItem = result[0];
      expect(firstItem).toHaveProperty("id");
      expect(firstItem).toHaveProperty("phase");
      expect(firstItem).toHaveProperty("category");
      expect(firstItem).toHaveProperty("title");
      expect(firstItem).toHaveProperty("titleId");
      expect(firstItem).toHaveProperty("sortOrder");
    });

    it("returns items with valid phases", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.checklist.getItems();
      
      const validPhases = ["12_months", "9_months", "6_months", "3_months", "1_month", "2_weeks", "departure"];
      for (const item of result) {
        expect(validPhases).toContain(item.phase);
      }
    });

    it("returns items with bilingual titles", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.checklist.getItems();
      
      for (const item of result) {
        expect(item.title).toBeTruthy();
        expect(item.titleId).toBeTruthy();
      }
    });

    it("returns items sorted by phase and sortOrder", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.checklist.getItems();
      
      // Items within same phase should be sorted by sortOrder
      const phaseGroups: Record<string, typeof result> = {};
      for (const item of result) {
        if (!phaseGroups[item.phase]) phaseGroups[item.phase] = [];
        phaseGroups[item.phase].push(item);
      }
      
      for (const items of Object.values(phaseGroups)) {
        for (let i = 1; i < items.length; i++) {
          expect(items[i].sortOrder).toBeGreaterThanOrEqual(items[i - 1].sortOrder);
        }
      }
    });

    it("covers all 7 timeline phases", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.checklist.getItems();
      
      const phases = new Set(result.map(r => r.phase));
      expect(phases.size).toBe(7);
      expect(phases.has("12_months")).toBe(true);
      expect(phases.has("9_months")).toBe(true);
      expect(phases.has("6_months")).toBe(true);
      expect(phases.has("3_months")).toBe(true);
      expect(phases.has("1_month")).toBe(true);
      expect(phases.has("2_weeks")).toBe(true);
      expect(phases.has("departure")).toBe(true);
    });
  });

  describe("getUserProgress (protected)", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      
      await expect(caller.checklist.getUserProgress()).rejects.toThrow();
    });

    it("returns empty progress for new user", async () => {
      const caller = appRouter.createCaller(createAuthContext(99999));
      const result = await caller.checklist.getUserProgress();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("toggleItem (protected)", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      
      await expect(
        caller.checklist.toggleItem({ checklistItemId: 1, isCompleted: true })
      ).rejects.toThrow();
    });

    it("successfully toggles a checklist item for authenticated user", async () => {
      const caller = appRouter.createCaller(createAuthContext(88888));
      
      // Get items first
      const items = await caller.checklist.getItems();
      const firstItemId = items[0].id;
      
      // Toggle on
      const result = await caller.checklist.toggleItem({ checklistItemId: firstItemId, isCompleted: true });
      expect(result).toHaveProperty("success", true);
      
      // Verify progress
      const progress = await caller.checklist.getUserProgress();
      const toggled = progress.find(p => p.checklistItemId === firstItemId);
      expect(toggled).toBeDefined();
      expect(toggled?.isCompleted).toBe(true);
      
      // Toggle off
      await caller.checklist.toggleItem({ checklistItemId: firstItemId, isCompleted: false });
      const progress2 = await caller.checklist.getUserProgress();
      const toggled2 = progress2.find(p => p.checklistItemId === firstItemId);
      expect(toggled2?.isCompleted).toBe(false);
    });
  });

  describe("updateNotes (protected)", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      
      await expect(
        caller.checklist.updateNotes({ checklistItemId: 1, notes: "test" })
      ).rejects.toThrow();
    });

    it("saves notes for a checklist item", async () => {
      const caller = appRouter.createCaller(createAuthContext(77777));
      
      const items = await caller.checklist.getItems();
      const firstItemId = items[0].id;
      
      const result = await caller.checklist.updateNotes({ checklistItemId: firstItemId, notes: "My test note" });
      expect(result).toHaveProperty("success", true);
      
      const progress = await caller.checklist.getUserProgress();
      const noted = progress.find(p => p.checklistItemId === firstItemId);
      expect(noted).toBeDefined();
      expect(noted?.notes).toBe("My test note");
    });
  });
});
