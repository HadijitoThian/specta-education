import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock invokeLLM to avoid real API calls
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            personaName: "The Adventurous Foodie Scholar",
            emoji: "🧭",
            tagline: "Will travel 10,000 km for the perfect nasi goreng substitute",
            traits: ["Curious", "Food-driven", "Social", "Adaptable"],
            idealCountry: "Australia",
            idealCountryFlag: "🇦🇺",
            idealCountryReason: "Your love for adventure and food makes Australia the perfect match!",
            spiritUniversity: "University of Melbourne",
            spiritUniReason: "A vibrant campus with the best food trucks nearby.",
            studyStyle: "Studies best with a flat white in hand at a cozy cafe.",
            socialStyle: "The one who organizes potluck dinners with international friends.",
            survivalTip: "Download every food delivery app on day one.",
            bestBuddy: "The Library Ninja",
            worstEnemy: "The Homesick Procrastinator",
            packingEssential: "A rice cooker and 5kg of Indomie",
            futureHeadline: "Indonesian Student Opens Best Nasi Goreng Restaurant in Melbourne",
            colorTheme: "amber",
          }),
        },
      },
    ],
  }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock DB functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    createPersonaResult: vi.fn().mockResolvedValue({
      id: 1,
      personaName: "The Adventurous Foodie Scholar",
      personaData: "{}",
      answers: "[]",
      createdAt: new Date(),
    }),
    getAllPersonaResults: vi.fn().mockResolvedValue([]),
  };
});

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

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@spectaeducation.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("persona.generate", () => {
  it("generates a persona from answers", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.persona.generate({
      answers: [
        { questionId: 1, questionText: "Pick your ideal weekend", answer: "Beach party & surfing" },
        { questionId: 2, questionText: "Your go-to comfort food?", answer: "Nasi goreng & satay" },
        { questionId: 3, questionText: "Pick a superpower", answer: "Teleportation" },
        { questionId: 4, questionText: "Your study style?", answer: "Cafe with coffee" },
        { questionId: 5, questionText: "What scares you most about going abroad?", answer: "The food" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.persona).toBeDefined();
    expect(result.persona).not.toBeNull();
    expect(result.persona!.personaName).toBe("The Adventurous Foodie Scholar");
    expect(result.persona!.traits).toHaveLength(4);
    expect(result.persona!.idealCountry).toBe("Australia");
    expect(result.persona!.colorTheme).toBe("amber");
    expect(result.persona!.emoji).toBe("🧭");
    expect(result.persona!.spiritUniversity).toBe("University of Melbourne");
    expect(result.persona!.bestBuddy).toBe("The Library Ninja");
    expect(result.persona!.worstEnemy).toBe("The Homesick Procrastinator");
    expect(result.persona!.packingEssential).toBeTruthy();
    expect(result.persona!.futureHeadline).toBeTruthy();
  });
});

describe("persona.saveResult", () => {
  it("saves a persona result with student info", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.persona.saveResult({
      studentName: "Test Student",
      studentEmail: "test@example.com",
      answers: JSON.stringify([]),
      personaName: "The Adventurous Foodie Scholar",
      personaData: JSON.stringify({ colorTheme: "amber" }),
    });

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  it("saves a persona result without student info (skipped lead)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.persona.saveResult({
      answers: JSON.stringify([]),
      personaName: "The Library Ninja",
      personaData: JSON.stringify({ colorTheme: "blue" }),
    });

    expect(result.success).toBe(true);
  });
});

describe("persona.getAll", () => {
  it("returns results for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.persona.getAll();
    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
  });
});
