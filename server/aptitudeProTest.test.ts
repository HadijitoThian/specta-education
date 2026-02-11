import { describe, it, expect } from "vitest";

// Test the Pro question bank
describe("Pro Question Bank - Section Exports", () => {
  it("should export all 7 section question arrays", async () => {
    const pq = await import("../shared/proQuestions");
    
    expect(pq.profilDiriFields).toBeDefined();
    expect(pq.riasecProQuestions).toBeDefined();
    expect(pq.miPairs).toBeDefined();
    expect(pq.personalityQuestions).toBeDefined();
    expect(pq.sjtQuestions).toBeDefined();
    expect(pq.creativeQuestions).toBeDefined();
    expect(pq.rankingExercises).toBeDefined();
    expect(pq.proSectionLabels).toBeDefined();
  });

  it("should have correct question counts per section", async () => {
    const pq = await import("../shared/proQuestions");
    
    expect(pq.profilDiriFields.length).toBe(5);
    expect(pq.riasecProQuestions.length).toBe(30);
    expect(pq.miPairs.length).toBe(24);
    expect(pq.personalityQuestions.length).toBe(20);
    expect(pq.sjtQuestions.length).toBe(8);
    expect(pq.creativeQuestions.length).toBe(4);
    expect(pq.rankingExercises.length).toBe(6);
  });

  it("should have approximately 97 total questions for ~25 min test", async () => {
    const pq = await import("../shared/proQuestions");
    
    const totalQuestions = pq.profilDiriFields.length +
      pq.riasecProQuestions.length +
      pq.miPairs.length +
      pq.personalityQuestions.length +
      pq.sjtQuestions.length +
      pq.creativeQuestions.length +
      pq.rankingExercises.length;
    
    expect(totalQuestions).toBe(97);
  });
});

describe("Pro Question Bank - RIASEC", () => {
  it("should have RIASEC questions with correct categories", async () => {
    const { riasecProQuestions } = await import("../shared/proQuestions");
    
    for (const q of riasecProQuestions) {
      expect(["R", "I", "A", "S", "E", "C"]).toContain(q.category);
      expect(q.id).toBeDefined();
      expect(q.text.id).toBeDefined();
      expect(q.text.en).toBeDefined();
    }
  });

  it("should have 5 questions per RIASEC dimension", async () => {
    const { riasecProQuestions } = await import("../shared/proQuestions");
    
    const dimCounts: Record<string, number> = {};
    for (const q of riasecProQuestions) {
      dimCounts[q.category] = (dimCounts[q.category] || 0) + 1;
    }
    for (const dim of ["R", "I", "A", "S", "E", "C"]) {
      expect(dimCounts[dim]).toBe(5);
    }
  });
});

describe("Pro Question Bank - MI Forced Choice", () => {
  it("should have MI pairs with optionA and optionB", async () => {
    const { miPairs } = await import("../shared/proQuestions");
    
    for (const q of miPairs) {
      expect(q.optionA).toBeDefined();
      expect(q.optionB).toBeDefined();
      expect(q.optionA.category).toBeDefined();
      expect(q.optionB.category).toBeDefined();
      expect(q.optionA.text.id).toBeDefined();
      expect(q.optionB.text.id).toBeDefined();
    }
  });
});

describe("Pro Question Bank - Personality", () => {
  it("should have this-or-that questions with dimensions", async () => {
    const { personalityQuestions } = await import("../shared/proQuestions");
    
    for (const q of personalityQuestions) {
      expect(q.dimension).toBeDefined();
      expect(q.optionA).toBeDefined();
      expect(q.optionB).toBeDefined();
      expect(q.optionA.trait).toBeDefined();
      expect(q.optionB.trait).toBeDefined();
    }
  });
});

describe("Pro Question Bank - SJT", () => {
  it("should have scenario questions with options and traits", async () => {
    const { sjtQuestions } = await import("../shared/proQuestions");
    
    for (const q of sjtQuestions) {
      expect(q.scenario).toBeDefined();
      expect(q.scenario.id).toBeDefined();
      expect(q.scenario.en).toBeDefined();
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      
      for (const opt of q.options) {
        expect(opt.traits).toBeDefined();
        expect(opt.traits.length).toBeGreaterThan(0);
        expect(opt.text.id).toBeDefined();
        expect(opt.text.en).toBeDefined();
      }
    }
  });
});

describe("Pro Question Bank - Creative", () => {
  it("should have open-ended questions with placeholders", async () => {
    const { creativeQuestions } = await import("../shared/proQuestions");
    
    for (const q of creativeQuestions) {
      expect(q.text.id).toBeDefined();
      expect(q.text.en).toBeDefined();
      expect(q.placeholder.id).toBeDefined();
      expect(q.placeholder.en).toBeDefined();
    }
  });
});

describe("Pro Question Bank - Ranking", () => {
  it("should have ranking exercises with items", async () => {
    const { rankingExercises } = await import("../shared/proQuestions");
    
    for (const q of rankingExercises) {
      expect(q.items.length).toBeGreaterThanOrEqual(4);
      for (const item of q.items) {
        expect(item.value).toBeDefined();
        expect(item.label.id).toBeDefined();
        expect(item.label.en).toBeDefined();
      }
    }
  });
});

describe("Pro Aptitude Analysis Procedure", () => {
  it("should have analyzeProResults procedure in the aptitude router", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("aptitude.analyzeProResults");
  });
});

describe("Pro Test Component", () => {
  it("should have AptitudeTestPro component file", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("/home/ubuntu/specta-education/client/src/pages/AptitudeTestPro.tsx");
    expect(exists).toBe(true);
  });

  it("should have the /test/pro route in App.tsx", async () => {
    const fs = await import("fs");
    const appContent = fs.readFileSync("/home/ubuntu/specta-education/client/src/App.tsx", "utf-8");
    expect(appContent).toContain("/test/pro");
    expect(appContent).toContain("AptitudeTestPro");
  });
});
