import { describe, it, expect } from "vitest";

// Test the shared aptitude questions structure
describe("Aptitude Questions Structure", () => {
  it("should have multiselect type for subjects and hobbies questions", async () => {
    const { personalQuestions } = await import("../shared/aptitudeQuestions");
    
    // Q2 should be multiselect (subjects)
    const q2 = personalQuestions.find(q => q.id === "P2");
    expect(q2).toBeDefined();
    expect(q2?.type).toBe("multiselect");
    expect(q2?.options).toBeDefined();
    expect(q2?.options?.length).toBeGreaterThan(0);
    
    // Q3 should be multiselect (hobbies)
    const q3 = personalQuestions.find(q => q.id === "P3");
    expect(q3).toBeDefined();
    expect(q3?.type).toBe("multiselect");
    expect(q3?.options).toBeDefined();
    expect(q3?.options?.length).toBeGreaterThan(0);
  });

  it("should have options with both id and en labels for multiselect questions", async () => {
    const { personalQuestions } = await import("../shared/aptitudeQuestions");
    
    const q2 = personalQuestions.find(q => q.id === "P2");
    if (q2?.options) {
      for (const opt of q2.options) {
        expect(opt.value).toBeDefined();
        expect(opt.label.id).toBeDefined();
        expect(opt.label.en).toBeDefined();
      }
    }
    
    const q3 = personalQuestions.find(q => q.id === "P3");
    if (q3?.options) {
      for (const opt of q3.options) {
        expect(opt.value).toBeDefined();
        expect(opt.label.id).toBeDefined();
        expect(opt.label.en).toBeDefined();
      }
    }
  });

  it("should have all required personal questions (P1-P5)", async () => {
    const { personalQuestions } = await import("../shared/aptitudeQuestions");
    
    const ids = personalQuestions.map(q => q.id);
    expect(ids).toContain("P1");
    expect(ids).toContain("P2");
    expect(ids).toContain("P3");
    expect(ids).toContain("P4");
    expect(ids).toContain("P5");
  });
});

// Test the email function exists and has correct signature
describe("Aptitude Results Email", () => {
  it("should export sendAptitudeResultsEmail function", async () => {
    const emailModule = await import("./email");
    expect(typeof emailModule.sendAptitudeResultsEmail).toBe("function");
  });

  it("should handle email sending gracefully when SMTP is not configured", async () => {
    const { sendAptitudeResultsEmail } = await import("./email");
    
    // This should not throw, just return false when SMTP is not configured
    const result = await sendAptitudeResultsEmail({
      to: "test@example.com",
      studentName: "Test Student",
      language: "id",
      hollandCode: "RIA",
      riasecScores: { R: 80, I: 70, A: 65, S: 50, E: 45, C: 40 },
      miScores: { linguistic: 75, logical: 80, spatial: 60, musical: 50, kinesthetic: 55, interpersonal: 65, intrapersonal: 70, naturalistic: 45 },
      aiAnalysis: {
        personalitySnapshot: { title: "Test Title", emoji: "🧠", description: "Test description" },
        riasecAnalysis: "Test RIASEC analysis",
        miAnalysis: "Test MI analysis",
        crossAnalysis: "Test cross analysis",
        recommendedMajors: [
          { name: "Computer Science", compatibilityScore: 95, reason: "Test reason", careers: ["Software Engineer"] }
        ],
        careerOutlook: "Test career outlook",
        parentSummary: "Test parent summary",
        studyTips: "Test study tips",
      },
    });
    
    // Should return boolean (true if sent, false if failed)
    expect(typeof result).toBe("boolean");
  }, 15000);
});

// Test multiselect answer handling logic
describe("Multiselect Answer Handling", () => {
  it("should correctly handle comma-separated multiselect values", () => {
    // Simulate the multiselect answer handling logic from AptitudeTest.tsx
    const handleMultiSelect = (current: string, value: string): string => {
      const selected = current ? current.split(",") : [];
      if (selected.includes(value)) {
        return selected.filter(v => v !== value).join(",");
      } else {
        return [...selected, value].join(",");
      }
    };

    // Add first selection
    expect(handleMultiSelect("", "math")).toBe("math");
    
    // Add second selection
    expect(handleMultiSelect("math", "science")).toBe("math,science");
    
    // Remove first selection
    expect(handleMultiSelect("math,science", "math")).toBe("science");
    
    // Add third selection
    expect(handleMultiSelect("math,science", "art")).toBe("math,science,art");
    
    // Remove middle selection
    expect(handleMultiSelect("math,science,art", "science")).toBe("math,art");
  });

  it("should correctly convert comma-separated to arrays for submission", () => {
    const convertMultiselect = (val: string): string[] => {
      if (val.includes(",")) {
        return val.split(",");
      }
      return val ? [val] : [];
    };

    expect(convertMultiselect("math,science,art")).toEqual(["math", "science", "art"]);
    expect(convertMultiselect("math")).toEqual(["math"]);
    expect(convertMultiselect("")).toEqual([]);
  });
});
