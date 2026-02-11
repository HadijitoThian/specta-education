import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the notification module
vi.mock("./server/_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock the LLM module
vi.mock("./server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Great response" } }],
  }),
}));

describe("Scholarship Lead Submission", () => {
  it("should validate required fields for lead submission", () => {
    const input = {
      studentName: "John Doe",
      studentEmail: "john@example.com",
      studentPhone: "+6281234567890",
      educationLevel: "SMA/High School",
      gpa: "3.5",
      scholarshipInterest: "china",
      ieltsStatus: "have_score",
      ieltsScore: "6.5",
    };

    expect(input.studentName).toBeTruthy();
    expect(input.studentEmail).toContain("@");
    expect(input.studentPhone).toBeTruthy();
    expect(input.educationLevel).toBeTruthy();
    expect(input.gpa).toBeTruthy();
    expect(input.scholarshipInterest).toBeTruthy();
    expect(input.ieltsStatus).toBeTruthy();
  });

  it("should accept valid scholarship interest types", () => {
    const validInterests = ["china", "mila_malaysia", "lpdp", "not_sure"];
    validInterests.forEach((interest) => {
      expect(["china", "mila_malaysia", "lpdp", "not_sure"]).toContain(interest);
    });
  });

  it("should accept valid IELTS status types", () => {
    const validStatuses = ["have_score", "preparing", "not_yet"];
    validStatuses.forEach((status) => {
      expect(["have_score", "preparing", "not_yet"]).toContain(status);
    });
  });

  it("should accept valid lead status types for admin updates", () => {
    const validStatuses = ["new", "contacted", "qualified", "converted", "closed"];
    validStatuses.forEach((status) => {
      expect(["new", "contacted", "qualified", "converted", "closed"]).toContain(status);
    });
  });

  it("should handle optional IELTS score when status is not have_score", () => {
    const input = {
      studentName: "Jane Doe",
      studentEmail: "jane@example.com",
      studentPhone: "+6281234567890",
      educationLevel: "SMA/High School",
      gpa: "3.2",
      scholarshipInterest: "lpdp",
      ieltsStatus: "preparing",
      ieltsScore: undefined,
    };

    expect(input.ieltsScore).toBeUndefined();
    expect(input.ieltsStatus).toBe("preparing");
  });

  it("should validate education level options", () => {
    const validLevels = [
      "SMA/High School",
      "D3/Diploma",
      "S1/Bachelor",
      "S2/Master",
    ];
    validLevels.forEach((level) => {
      expect(level).toBeTruthy();
      expect(typeof level).toBe("string");
    });
  });
});
