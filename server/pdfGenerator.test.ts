import { describe, it, expect } from "vitest";
import { generatePdfReport } from "./pdfGenerator";

const mockData = {
  studentName: "Test Student",
  language: "id" as const,
  hollandCode: "RIA",
  riasecScores: { R: 85, I: 72, A: 68, S: 45, E: 30, C: 20 },
  miScores: {
    linguistic: 70,
    logical: 85,
    spatial: 60,
    musical: 40,
    kinesthetic: 55,
    interpersonal: 75,
    intrapersonal: 65,
    naturalistic: 50,
  },
  aiAnalysis: {
    personalitySnapshot: {
      title: "The Analytical Creator",
      emoji: "🧠🎨",
      description: "A deeply analytical mind with creative flair.",
    },
    riasecAnalysis: "Strong realistic and investigative interests.",
    miAnalysis: "Logical-mathematical intelligence is dominant.",
    softSkillsAnalysis: "Good leadership and teamwork skills.",
    creativeThinkingAnalysis: "Shows innovative problem-solving approach.",
    valuesAnalysis: "Values knowledge and personal growth.",
    crossDimensionalInsight: "Unique combination of analytical and creative abilities.",
    recommendedMajors: [
      {
        name: "Computer Science",
        compatibilityScore: 95,
        reason: "Strong logical and analytical skills align perfectly.",
        careers: ["Software Engineer", "Data Scientist", "AI Researcher"],
        salaryRange: "Rp 10-30 juta/bulan",
        growthOutlook: "High demand in tech industry.",
      },
      {
        name: "Engineering",
        compatibilityScore: 88,
        reason: "Realistic interests combined with logical thinking.",
        careers: ["Mechanical Engineer", "Civil Engineer"],
        salaryRange: "Rp 8-25 juta/bulan",
        growthOutlook: "Steady growth expected.",
      },
    ],
    strengthsAndWeaknesses: {
      strengths: ["Analytical thinking", "Problem solving", "Creativity"],
      areasForGrowth: ["Public speaking", "Networking"],
    },
    learningStyle: "Prefers structured, logical learning environments.",
    careerOutlook: "Excellent prospects in technology and engineering fields.",
    parentSummary: "Anak Bapak/Ibu memiliki kemampuan analitis yang sangat baik.",
    actionPlan: ["Explore coding bootcamps", "Join robotics club", "Take advanced math courses"],
  },
};

describe("PDF Generator", () => {
  it("should generate a valid PDF buffer", async () => {
    const buffer = await generatePdfReport(mockData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000); // PDF should be at least 1KB
    // Check PDF magic bytes (%PDF-)
    const header = buffer.subarray(0, 5).toString("ascii");
    expect(header).toBe("%PDF-");
  }, 15000);

  it("should generate PDF in English language", async () => {
    const enData = { ...mockData, language: "en" as const };
    const buffer = await generatePdfReport(enData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    const header = buffer.subarray(0, 5).toString("ascii");
    expect(header).toBe("%PDF-");
  }, 15000);

  it("should handle missing AI analysis fields gracefully", async () => {
    const minimalData = {
      studentName: "Minimal Student",
      language: "id" as const,
      hollandCode: "SEC",
      riasecScores: { R: 10, I: 20, A: 30, S: 80, E: 70, C: 60 },
      miScores: { linguistic: 50, logical: 50, spatial: 50, musical: 50, kinesthetic: 50, interpersonal: 50, intrapersonal: 50, naturalistic: 50 },
      aiAnalysis: {
        personalitySnapshot: { title: "Test", emoji: "🧠", description: "Test desc" },
        recommendedMajors: [],
      },
    };
    const buffer = await generatePdfReport(minimalData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
  }, 15000);

  it("should handle empty AI analysis object", async () => {
    const emptyAnalysis = {
      studentName: "Empty Analysis",
      language: "id" as const,
      hollandCode: "RIA",
      riasecScores: { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 },
      miScores: { linguistic: 50, logical: 50, spatial: 50, musical: 50, kinesthetic: 50, interpersonal: 50, intrapersonal: 50, naturalistic: 50 },
      aiAnalysis: {},
    };
    const buffer = await generatePdfReport(emptyAnalysis);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
  }, 15000);

  it("should handle student names with special characters", async () => {
    const specialData = { ...mockData, studentName: "Muhammad Al-Farisi bin Abdullah" };
    const buffer = await generatePdfReport(specialData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  }, 15000);
});
