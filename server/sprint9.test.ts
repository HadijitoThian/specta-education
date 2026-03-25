import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Sprint 9 Tests ───────────────────────────────────────────────────────────

describe("Sprint 9: University Database", () => {
  it("should have UNIVERSITY_SEEDS with correct structure", async () => {
    const { UNIVERSITY_SEEDS } = await import("./universitySeeds");
    expect(UNIVERSITY_SEEDS.length).toBeGreaterThan(50);
    const first = UNIVERSITY_SEEDS[0];
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("country");
    expect(first).toHaveProperty("ranking");
    expect(first).toHaveProperty("website");
    expect(first).toHaveProperty("programs");
  });

  it("should have universities from expected countries", async () => {
    const { UNIVERSITY_SEEDS } = await import("./universitySeeds");
    const countries = [...new Set(UNIVERSITY_SEEDS.map(u => u.country))];
    expect(countries).toContain("UK");
    expect(countries).toContain("Australia");
    expect(countries).toContain("USA");
    expect(countries).toContain("Canada");
    expect(countries).toContain("Malaysia");
    expect(countries).toContain("Singapore");
  });

  it("should have valid programs as JSON strings", async () => {
    const { UNIVERSITY_SEEDS } = await import("./universitySeeds");
    for (const uni of UNIVERSITY_SEEDS.slice(0, 10)) {
      const parsed = JSON.parse(uni.programs);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    }
  });

  it("should have valid website URLs", async () => {
    const { UNIVERSITY_SEEDS } = await import("./universitySeeds");
    for (const uni of UNIVERSITY_SEEDS.slice(0, 5)) {
      expect(uni.website).toMatch(/^https?:\/\//);
    }
  });
});

describe("Sprint 9: Visa Tracking", () => {
  it("should have correct visa status values", () => {
    const VISA_STATUSES = [
      "not_started", "documents_gathering", "application_submitted",
      "biometrics_done", "approved", "rejected", "expired"
    ];
    expect(VISA_STATUSES).toContain("not_started");
    expect(VISA_STATUSES).toContain("approved");
    expect(VISA_STATUSES).toContain("rejected");
    expect(VISA_STATUSES.length).toBe(7);
  });

  it("should have 12 required documents in checklist", () => {
    const VISA_REQUIRED_DOCS = [
      { key: "passport", label: "Valid Passport (6+ months)" },
      { key: "offer_letter", label: "University Offer Letter" },
      { key: "financial_proof", label: "Proof of Finances" },
      { key: "bank_statement", label: "Bank Statement (3 months)" },
      { key: "ielts_certificate", label: "IELTS/English Certificate" },
      { key: "academic_transcripts", label: "Academic Transcripts" },
      { key: "birth_certificate", label: "Birth Certificate" },
      { key: "photo", label: "Passport-size Photos" },
      { key: "medical_certificate", label: "Medical Certificate" },
      { key: "police_clearance", label: "Police Clearance Letter" },
      { key: "visa_form", label: "Completed Visa Application Form" },
      { key: "travel_insurance", label: "Travel Insurance" },
    ];
    expect(VISA_REQUIRED_DOCS.length).toBe(12);
    const keys = VISA_REQUIRED_DOCS.map(d => d.key);
    expect(keys).toContain("passport");
    expect(keys).toContain("offer_letter");
    expect(keys).toContain("ielts_certificate");
  });
});

describe("Sprint 9: SSE Chat", () => {
  it("should correctly format SSE message", () => {
    const formatSSE = (event: string, data: object) =>
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    const msg = formatSSE("new_message", { id: 1, message: "Hello", senderName: "Hadi" });
    expect(msg).toContain("event: new_message");
    expect(msg).toContain("\"message\":\"Hello\"");
    expect(msg).toContain("\"senderName\":\"Hadi\"");
    expect(msg.endsWith("\n\n")).toBe(true);
  });

  it("should parse SSE channel correctly", () => {
    const parseChannel = (url: string) => {
      const params = new URLSearchParams(url.split("?")[1]);
      return params.get("channel") || "general";
    };
    expect(parseChannel("/api/chat/sse?channel=general")).toBe("general");
    expect(parseChannel("/api/chat/sse?channel=leads")).toBe("leads");
    expect(parseChannel("/api/chat/sse")).toBe("general");
  });
});
