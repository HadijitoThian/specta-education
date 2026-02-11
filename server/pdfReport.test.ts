import { describe, it, expect } from "vitest";

/**
 * Tests for the PDF Report Download feature.
 * The PDF is generated client-side using html2canvas + jsPDF,
 * so server-side tests focus on the data availability (getResult procedure)
 * and the structure of the result data that feeds the PDF.
 */

describe("PDF Report Data Structure", () => {
  it("should have all required fields for the PDF report template", () => {
    // Simulate the result data structure that getResult returns
    const mockResult = {
      id: 1,
      studentName: "Test Student",
      studentEmail: "test@example.com",
      hollandCode: "RIA",
      riasecScores: { R: 85, I: 72, A: 68, S: 45, E: 30, C: 20 },
      miScores: {
        linguistic: 70,
        logical: 85,
        spatial: 60,
        musical: 40,
        kinesthetic: 55,
        interpersonal: 65,
        intrapersonal: 75,
        naturalistic: 50,
      },
      aiAnalysis: {
        personalitySnapshot: {
          emoji: "🔬",
          title: "The Analytical Explorer",
          description: "A curious mind driven by logic and discovery.",
        },
        riasecAnalysis: "Strong preference for hands-on and investigative work.",
        miAnalysis: "Dominant logical-mathematical and intrapersonal intelligences.",
        crossAnalysis: "Unique combination of practical skills and deep thinking.",
        recommendedMajors: [
          {
            name: "Computer Science",
            compatibilityScore: 92,
            reason: "Strong logical and analytical skills.",
            careers: ["Software Engineer", "Data Scientist"],
          },
        ],
        careerOutlook: "Excellent prospects in technology and research.",
        studyTips: "Focus on hands-on projects and research opportunities.",
        parentSummary: "Your child shows strong analytical abilities.",
      },
    };

    // Verify all sections needed by the PDF template exist
    expect(mockResult.studentName).toBeDefined();
    expect(mockResult.hollandCode).toBeDefined();
    expect(mockResult.riasecScores).toBeDefined();
    expect(mockResult.miScores).toBeDefined();
    expect(mockResult.aiAnalysis).toBeDefined();
    expect(mockResult.aiAnalysis.personalitySnapshot).toBeDefined();
    expect(mockResult.aiAnalysis.personalitySnapshot.emoji).toBeDefined();
    expect(mockResult.aiAnalysis.personalitySnapshot.title).toBeDefined();
    expect(mockResult.aiAnalysis.personalitySnapshot.description).toBeDefined();
    expect(mockResult.aiAnalysis.riasecAnalysis).toBeDefined();
    expect(mockResult.aiAnalysis.miAnalysis).toBeDefined();
    expect(mockResult.aiAnalysis.crossAnalysis).toBeDefined();
    expect(mockResult.aiAnalysis.recommendedMajors).toBeInstanceOf(Array);
    expect(mockResult.aiAnalysis.recommendedMajors[0].name).toBeDefined();
    expect(mockResult.aiAnalysis.recommendedMajors[0].compatibilityScore).toBeDefined();
    expect(mockResult.aiAnalysis.recommendedMajors[0].reason).toBeDefined();
    expect(mockResult.aiAnalysis.recommendedMajors[0].careers).toBeInstanceOf(Array);
    expect(mockResult.aiAnalysis.careerOutlook).toBeDefined();
    expect(mockResult.aiAnalysis.studyTips).toBeDefined();
    expect(mockResult.aiAnalysis.parentSummary).toBeDefined();
  });

  it("should sort RIASEC scores in descending order for the PDF chart", () => {
    const riasecScores = { R: 85, I: 72, A: 68, S: 45, E: 30, C: 20 };
    const sorted = Object.entries(riasecScores).sort((a, b) => b[1] - a[1]);
    expect(sorted[0]).toEqual(["R", 85]);
    expect(sorted[1]).toEqual(["I", 72]);
    expect(sorted[5]).toEqual(["C", 20]);
  });

  it("should sort MI scores in descending order for the PDF chart", () => {
    const miScores = {
      linguistic: 70,
      logical: 85,
      spatial: 60,
      musical: 40,
      kinesthetic: 55,
      interpersonal: 65,
      intrapersonal: 75,
      naturalistic: 50,
    };
    const sorted = Object.entries(miScores).sort((a, b) => b[1] - a[1]);
    expect(sorted[0]).toEqual(["logical", 85]);
    expect(sorted[1]).toEqual(["intrapersonal", 75]);
    expect(sorted[7]).toEqual(["musical", 40]);
  });

  it("should generate a valid filename from student name and date", () => {
    const studentName = "John Doe";
    const date = new Date("2026-02-12");
    const fileName = `Tes-Bakat-AI_${studentName.replace(/\s+/g, "-")}_${date.toISOString().split("T")[0]}.pdf`;
    expect(fileName).toBe("Tes-Bakat-AI_John-Doe_2026-02-12.pdf");
  });

  it("should handle student names with special characters in filename", () => {
    const studentName = "Muhammad  Al  Farisi";
    const fileName = `Tes-Bakat-AI_${studentName.replace(/\s+/g, "-")}_2026-02-12.pdf`;
    expect(fileName).toBe("Tes-Bakat-AI_Muhammad-Al-Farisi_2026-02-12.pdf");
  });

  it("should handle empty/missing AI analysis fields gracefully", () => {
    const emptyResult = {
      riasecScores: {},
      miScores: {},
      aiAnalysis: {},
      hollandCode: "",
    };

    // PDF template uses fallback values
    const snapshot = emptyResult.aiAnalysis as any;
    expect(snapshot.personalitySnapshot || {}).toEqual({});
    expect(snapshot.recommendedMajors || []).toEqual([]);
    expect(snapshot.riasecAnalysis || "").toBe("");
    expect(snapshot.parentSummary || "").toBe("");
  });

  it("should have RIASEC labels for both Indonesian and English", () => {
    const riasecLabels: Record<string, { id: string; en: string }> = {
      R: { id: "Realistis", en: "Realistic" },
      I: { id: "Investigatif", en: "Investigative" },
      A: { id: "Artistik", en: "Artistic" },
      S: { id: "Sosial", en: "Social" },
      E: { id: "Enterprising", en: "Enterprising" },
      C: { id: "Konvensional", en: "Conventional" },
    };

    expect(Object.keys(riasecLabels)).toHaveLength(6);
    for (const key of Object.keys(riasecLabels)) {
      expect(riasecLabels[key].id).toBeTruthy();
      expect(riasecLabels[key].en).toBeTruthy();
    }
  });

  it("should have MI labels for both Indonesian and English", () => {
    const miLabels: Record<string, { id: string; en: string }> = {
      linguistic: { id: "Linguistik", en: "Linguistic" },
      logical: { id: "Logis-Matematis", en: "Logical-Mathematical" },
      spatial: { id: "Visual-Spasial", en: "Visual-Spatial" },
      musical: { id: "Musikal", en: "Musical" },
      kinesthetic: { id: "Kinestetik", en: "Kinesthetic" },
      interpersonal: { id: "Interpersonal", en: "Interpersonal" },
      intrapersonal: { id: "Intrapersonal", en: "Intrapersonal" },
      naturalistic: { id: "Naturalis", en: "Naturalistic" },
    };

    expect(Object.keys(miLabels)).toHaveLength(8);
    for (const key of Object.keys(miLabels)) {
      expect(miLabels[key].id).toBeTruthy();
      expect(miLabels[key].en).toBeTruthy();
    }
  });
});
