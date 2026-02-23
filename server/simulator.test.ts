import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import { db } from "./db";
import { simulatorSessions, simulatorChoices, simulatorResults } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Simulator System", () => {
  const mockContext: Context = {
    user: null,
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(mockContext);

  let testSessionId: string;

  describe("Start Simulation", () => {
    it("should create a new simulation session and return first scenario", async () => {
      const result = await caller.simulator.start({
        studentName: "Test Student",
        studentEmail: "test@example.com",
        studentPhone: "+62812345678",
        country: "australia",
        universityTier: "mid_tier",
        intendedMajor: "computer_science",
        budgetLevel: "moderate",
        personalityType: "balanced",
      });

      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("scenario");
      expect(result).toHaveProperty("currentDay", 1);
      expect(result).toHaveProperty("stats");

      // Verify scenario structure
      expect(result.scenario).toHaveProperty("day", 1);
      expect(result.scenario).toHaveProperty("type", "arrival");
      expect(result.scenario).toHaveProperty("title");
      expect(result.scenario).toHaveProperty("scenarioText");
      expect(result.scenario).toHaveProperty("choices");
      expect(result.scenario.choices).toHaveLength(3);

      // Verify stats
      expect(result.stats).toHaveProperty("budget", 500);
      expect(result.stats).toHaveProperty("mood", 50);
      expect(result.stats).toHaveProperty("connections", 0);
      expect(result.stats).toHaveProperty("academic", 50);

      // Save for next tests
      testSessionId = result.sessionId;

      // Verify database record
      const session = await db.query.simulatorSessions.findFirst({
        where: eq(simulatorSessions.sessionId, testSessionId),
      });

      expect(session).toBeDefined();
      expect(session?.studentName).toBe("Test Student");
      expect(session?.country).toBe("australia");
      expect(session?.status).toBe("in_progress");
    }, 30000); // 30s timeout for AI generation

    it("should validate required fields", async () => {
      await expect(
        caller.simulator.start({
          studentName: "",
          studentEmail: "test@example.com",
          country: "australia",
          universityTier: "mid_tier",
          intendedMajor: "computer_science",
          budgetLevel: "moderate",
        })
      ).rejects.toThrow();
    });
  });

  describe("Submit Choice", () => {
    it("should process choice and return next scenario", async () => {
      // First, start a session
      const startResult = await caller.simulator.start({
        studentName: "Choice Test Student",
        studentEmail: "choicetest@example.com",
        country: "australia",
        universityTier: "mid_tier",
        intendedMajor: "engineering",
        budgetLevel: "moderate",
      });

      const sessionId = startResult.sessionId;
      const firstScenario = startResult.scenario;

      // Submit a choice
      const result = await caller.simulator.submitChoice({
        sessionId,
        day: 1,
        scenarioType: firstScenario.type,
        scenarioText: firstScenario.scenarioText,
        choiceOptions: firstScenario.choices,
        selectedChoice: "A",
        choiceText: firstScenario.choices[0].text,
      });

      expect(result).toHaveProperty("complete", false);
      expect(result).toHaveProperty("aiResponse");
      expect(result).toHaveProperty("impacts");
      expect(result).toHaveProperty("nextScenario");

      // Verify impacts structure
      expect(result.impacts).toHaveProperty("budget");
      expect(result.impacts).toHaveProperty("mood");
      expect(result.impacts).toHaveProperty("connections");
      expect(result.impacts).toHaveProperty("academic");

      // Verify next scenario
      expect(result.nextScenario).toHaveProperty("day", 2);
      expect(result.nextScenario).toHaveProperty("type", "social");

      // Verify choice was saved to database
      const choices = await db.query.simulatorChoices.findMany({
        where: eq(simulatorChoices.sessionId, sessionId),
      });

      expect(choices).toHaveLength(1);
      expect(choices[0].day).toBe(1);
      expect(choices[0].selectedChoice).toBe("A");
    }, 30000);

    it("should complete simulation after day 3", async () => {
      // Start a session
      const startResult = await caller.simulator.start({
        studentName: "Complete Test",
        studentEmail: "complete@example.com",
        country: "australia",
        universityTier: "top10",
        intendedMajor: "business",
        budgetLevel: "comfortable",
      });

      const sessionId = startResult.sessionId;

      // Submit Day 1 choice
      const day1Result = await caller.simulator.submitChoice({
        sessionId,
        day: 1,
        scenarioType: "arrival",
        scenarioText: "Day 1 scenario",
        choiceOptions: [
          { label: "A", text: "Option A" },
          { label: "B", text: "Option B" },
          { label: "C", text: "Option C" },
        ],
        selectedChoice: "B",
        choiceText: "Option B",
      });

      expect(day1Result.complete).toBe(false);

      // Submit Day 2 choice
      const day2Result = await caller.simulator.submitChoice({
        sessionId,
        day: 2,
        scenarioType: "social",
        scenarioText: "Day 2 scenario",
        choiceOptions: [
          { label: "A", text: "Option A" },
          { label: "B", text: "Option B" },
          { label: "C", text: "Option C" },
        ],
        selectedChoice: "A",
        choiceText: "Option A",
      });

      expect(day2Result.complete).toBe(false);

      // Submit Day 3 choice (should complete)
      const day3Result = await caller.simulator.submitChoice({
        sessionId,
        day: 3,
        scenarioType: "academic",
        scenarioText: "Day 3 scenario",
        choiceOptions: [
          { label: "A", text: "Option A" },
          { label: "B", text: "Option B" },
          { label: "C", text: "Option C" },
        ],
        selectedChoice: "C",
        choiceText: "Option C",
      });

      expect(day3Result.complete).toBe(true);
      expect(day3Result).toHaveProperty("report");
      expect(day3Result.report).toHaveProperty("readinessScore");
      expect(day3Result.report).toHaveProperty("socialScore");
      expect(day3Result.report).toHaveProperty("financialScore");
      expect(day3Result.report).toHaveProperty("academicScore");
      expect(day3Result.report).toHaveProperty("emotionalScore");
      expect(day3Result.report).toHaveProperty("strengths");
      expect(day3Result.report).toHaveProperty("weaknesses");
      expect(day3Result.report).toHaveProperty("recommendations");

      // Verify session status updated
      const session = await db.query.simulatorSessions.findFirst({
        where: eq(simulatorSessions.sessionId, sessionId),
      });

      expect(session?.status).toBe("completed");
      expect(session?.completedAt).toBeDefined();

      // Verify result was saved
      const result = await db.query.simulatorResults.findFirst({
        where: eq(simulatorResults.sessionId, sessionId),
      });

      expect(result).toBeDefined();
      expect(result?.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result?.readinessScore).toBeLessThanOrEqual(100);
    }, 60000); // 60s timeout for full flow
  });

  describe("Get Report", () => {
    it("should retrieve completed simulation report", async () => {
      // Complete a simulation first
      const startResult = await caller.simulator.start({
        studentName: "Report Test",
        studentEmail: "report@example.com",
        country: "australia",
        universityTier: "mid_tier",
        intendedMajor: "arts",
        budgetLevel: "tight",
      });

      const sessionId = startResult.sessionId;

      // Submit all 3 days
      for (let day = 1; day <= 3; day++) {
        await caller.simulator.submitChoice({
          sessionId,
          day,
          scenarioType: day === 1 ? "arrival" : day === 2 ? "social" : "academic",
          scenarioText: `Day ${day} scenario`,
          choiceOptions: [
            { label: "A", text: "Option A" },
            { label: "B", text: "Option B" },
            { label: "C", text: "Option C" },
          ],
          selectedChoice: "A",
          choiceText: "Option A",
        });
      }

      // Get report
      const report = await caller.simulator.getReport({ sessionId });

      expect(report).toHaveProperty("readinessScore");
      expect(report).toHaveProperty("socialScore");
      expect(report).toHaveProperty("financialScore");
      expect(report).toHaveProperty("academicScore");
      expect(report).toHaveProperty("emotionalScore");
      expect(report.strengths).toBeInstanceOf(Array);
      expect(report.weaknesses).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.strengths.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    }, 60000);

    it("should throw error for non-existent session", async () => {
      await expect(
        caller.simulator.getReport({ sessionId: "non-existent-session" })
      ).rejects.toThrow();
    });
  });

  describe("Get Session", () => {
    it("should retrieve session with choices and result", async () => {
      // Complete a simulation
      const startResult = await caller.simulator.start({
        studentName: "Session Test",
        studentEmail: "session@example.com",
        country: "australia",
        universityTier: "budget",
        intendedMajor: "sciences",
        budgetLevel: "moderate",
      });

      const sessionId = startResult.sessionId;

      // Submit one choice
      await caller.simulator.submitChoice({
        sessionId,
        day: 1,
        scenarioType: "arrival",
        scenarioText: "Test scenario",
        choiceOptions: [
          { label: "A", text: "Option A" },
          { label: "B", text: "Option B" },
          { label: "C", text: "Option C" },
        ],
        selectedChoice: "B",
        choiceText: "Option B",
      });

      // Get session
      const sessionData = await caller.simulator.getSession({ sessionId });

      expect(sessionData).toHaveProperty("session");
      expect(sessionData).toHaveProperty("choices");
      expect(sessionData).toHaveProperty("result");
      expect(sessionData.session.sessionId).toBe(sessionId);
      expect(sessionData.choices).toHaveLength(1);
      expect(sessionData.choices[0].day).toBe(1);
    }, 30000);
  });
});
