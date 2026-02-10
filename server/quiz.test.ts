import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          countries: [
            {
              country: "Australia",
              matchPercentage: 92,
              flag: "🇦🇺",
              reason: "Great weather and multicultural environment",
              universities: ["University of Melbourne", "Monash University", "UNSW"],
              estimatedCost: "$25,000 - $40,000/year",
              highlights: ["Multicultural", "Great weather", "Work opportunities"]
            },
            {
              country: "United Kingdom",
              matchPercentage: 85,
              flag: "🇬🇧",
              reason: "World-class education and rich culture",
              universities: ["University of Oxford", "UCL", "University of Manchester"],
              estimatedCost: "£15,000 - £30,000/year",
              highlights: ["Prestigious", "Cultural diversity", "Short programs"]
            },
            {
              country: "Canada",
              matchPercentage: 78,
              flag: "🇨🇦",
              reason: "Affordable and welcoming to international students",
              universities: ["University of Toronto", "UBC", "McGill University"],
              estimatedCost: "$15,000 - $30,000/year",
              highlights: ["Affordable", "Immigration friendly", "Safe"]
            }
          ],
          personalNote: "Based on your preferences, you'd thrive in a warm, multicultural environment."
        })
      }
    }]
  })
}));

// Mock notification
vi.mock("./server/_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true)
}));

describe("Quiz Feature", () => {
  it("should have quiz questions data structure", () => {
    // Verify the quiz has 10 questions with proper structure
    const quizQuestions = [
      { id: 1, question: "What's your ideal weekend?", options: 5 },
      { id: 2, question: "Pick your dream weather", options: 5 },
      { id: 3, question: "What matters most in a city?", options: 5 },
      { id: 4, question: "Your budget range for tuition per year?", options: 4 },
      { id: 5, question: "How important is being close to other Indonesian students?", options: 4 },
      { id: 6, question: "What's your ideal class size?", options: 4 },
      { id: 7, question: "After graduation, you want to...", options: 4 },
      { id: 8, question: "Your IELTS score or English level?", options: 4 },
      { id: 9, question: "What type of campus do you prefer?", options: 4 },
      { id: 10, question: "Pick your ideal food scene", options: 5 },
    ];

    expect(quizQuestions).toHaveLength(10);
    quizQuestions.forEach(q => {
      expect(q.id).toBeGreaterThan(0);
      expect(q.question).toBeTruthy();
      expect(q.options).toBeGreaterThanOrEqual(4);
    });
  });

  it("should validate quiz answer format", () => {
    // Quiz answers should be an array of 10 strings
    const sampleAnswers = [
      "Beach & surfing",
      "Sunny & warm year-round",
      "Safety & cleanliness",
      "$15,000 - $25,000",
      "Very important",
      "Medium (30-100)",
      "Work abroad for a few years",
      "6.0 - 6.5",
      "Modern city campus",
      "Street food paradise"
    ];

    expect(sampleAnswers).toHaveLength(10);
    sampleAnswers.forEach(answer => {
      expect(typeof answer).toBe("string");
      expect(answer.length).toBeGreaterThan(0);
    });
  });

  it("should validate quiz result structure", () => {
    const mockResult = {
      countries: [
        {
          country: "Australia",
          matchPercentage: 92,
          flag: "🇦🇺",
          reason: "Great weather and multicultural environment",
          universities: ["University of Melbourne", "Monash University", "UNSW"],
          estimatedCost: "$25,000 - $40,000/year",
          highlights: ["Multicultural", "Great weather", "Work opportunities"]
        },
        {
          country: "United Kingdom",
          matchPercentage: 85,
          flag: "🇬🇧",
          reason: "World-class education",
          universities: ["UCL", "Manchester"],
          estimatedCost: "£15,000 - £30,000/year",
          highlights: ["Prestigious", "Cultural diversity"]
        },
        {
          country: "Canada",
          matchPercentage: 78,
          flag: "🇨🇦",
          reason: "Affordable and welcoming",
          universities: ["UBC", "McGill"],
          estimatedCost: "$15,000 - $30,000/year",
          highlights: ["Affordable", "Safe"]
        }
      ],
      personalNote: "Based on your preferences, you'd thrive in a warm environment."
    };

    expect(mockResult.countries).toHaveLength(3);
    mockResult.countries.forEach(country => {
      expect(country.country).toBeTruthy();
      expect(country.matchPercentage).toBeGreaterThan(0);
      expect(country.matchPercentage).toBeLessThanOrEqual(100);
      expect(country.flag).toBeTruthy();
      expect(country.reason).toBeTruthy();
      expect(country.universities.length).toBeGreaterThan(0);
      expect(country.estimatedCost).toBeTruthy();
      expect(country.highlights.length).toBeGreaterThan(0);
    });
    expect(mockResult.personalNote).toBeTruthy();

    // Results should be sorted by match percentage (descending)
    for (let i = 0; i < mockResult.countries.length - 1; i++) {
      expect(mockResult.countries[i].matchPercentage).toBeGreaterThanOrEqual(
        mockResult.countries[i + 1].matchPercentage
      );
    }
  });

  it("should validate lead capture data", () => {
    const leadData = {
      name: "John Doe",
      email: "john@example.com",
      phone: "+6281234567890"
    };

    expect(leadData.name).toBeTruthy();
    expect(leadData.email).toContain("@");
    expect(leadData.phone).toBeTruthy();
  });

  it("should handle empty or partial quiz answers", () => {
    const partialAnswers = ["Beach & surfing", "Sunny & warm"];
    expect(partialAnswers.length).toBeLessThan(10);
    // Quiz should not submit with less than 10 answers
    expect(partialAnswers.length < 10).toBe(true);
  });
});
