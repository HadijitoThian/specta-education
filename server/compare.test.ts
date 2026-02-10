import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module to avoid actual API calls
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "## University Comparison\n\nHere is a detailed comparison of the selected universities...",
        },
      },
    ],
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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("compare.analyzeUniversities", () => {
  it("returns a successful comparison with selectedProgram", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      universities: [
        {
          name: "University of Melbourne",
          country: "Australia",
          ranking: "#13",
          type: "Public",
          tuition: "$30,000 - $50,000/year",
          programs: ["All disciplines", "Medicine"],
        },
        {
          name: "Taylor's University",
          country: "Malaysia",
          ranking: "#284",
          type: "Private",
          tuition: "$5,000 - $12,000/year",
          programs: ["Business", "Hospitality"],
        },
      ],
      selectedProgram: "Business & Management",
    };

    const result = await caller.compare.analyzeUniversities(input);
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("message");
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("returns a successful comparison without selectedProgram (general)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      universities: [
        {
          name: "University of Oxford",
          country: "United Kingdom",
          ranking: "#3",
          type: "Public",
          tuition: "$30,000 - $55,000/year",
          programs: ["All disciplines", "PPE"],
        },
        {
          name: "MIT",
          country: "USA",
          ranking: "#1",
          type: "Private",
          tuition: "$55,000 - $60,000/year",
          programs: ["Engineering", "Computer Science"],
        },
      ],
    };

    const result = await caller.compare.analyzeUniversities(input);
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("message");
  });

  it("rejects input with missing required university fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.compare.analyzeUniversities({
        universities: [
          {
            name: "Test University",
            // missing country, ranking, type, tuition, programs
          } as any,
        ],
      })
    ).rejects.toThrow();
  });

  it("handles LLM failure gracefully", async () => {
    // Override the mock for this test to simulate failure
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockRejectedValueOnce(new Error("LLM service unavailable"));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      universities: [
        {
          name: "University of Melbourne",
          country: "Australia",
          ranking: "#13",
          type: "Public",
          tuition: "$30,000 - $50,000/year",
          programs: ["All disciplines"],
        },
        {
          name: "Taylor's University",
          country: "Malaysia",
          ranking: "#284",
          type: "Private",
          tuition: "$5,000 - $12,000/year",
          programs: ["Business"],
        },
      ],
    };

    const result = await caller.compare.analyzeUniversities(input);
    expect(result).toHaveProperty("success", false);
    expect(result.message).toContain("error");
  });
});
