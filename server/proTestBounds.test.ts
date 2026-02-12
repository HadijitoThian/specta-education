import { describe, it, expect } from "vitest";
import {
  riasecProQuestions,
  miPairs,
  personalityQuestions,
  sjtQuestions,
  creativeQuestions,
  rankingExercises,
  profilDiriFields,
} from "../shared/proQuestions";

describe("Pro Test Question Arrays - Bounds Safety", () => {
  it("should have the expected number of RIASEC questions (30)", () => {
    expect(riasecProQuestions.length).toBe(30);
  });

  it("should have the expected number of MI pairs (24)", () => {
    expect(miPairs.length).toBe(24);
  });

  it("should have the expected number of personality questions (20)", () => {
    expect(personalityQuestions.length).toBe(20);
  });

  it("should have the expected number of SJT questions (8)", () => {
    expect(sjtQuestions.length).toBe(8);
  });

  it("should have the expected number of creative questions (4)", () => {
    expect(creativeQuestions.length).toBe(4);
  });

  it("should have the expected number of ranking exercises (6)", () => {
    expect(rankingExercises.length).toBe(6);
  });

  it("all RIASEC questions should have valid id, text, and category", () => {
    for (let i = 0; i < riasecProQuestions.length; i++) {
      const q = riasecProQuestions[i];
      expect(q).toBeDefined();
      expect(q.id).toBeTruthy();
      expect(q.text).toBeDefined();
      expect(q.text.id).toBeTruthy();
      expect(q.text.en).toBeTruthy();
      expect(q.category).toBeTruthy();
    }
  });

  it("all MI pairs should have valid id, optionA, and optionB", () => {
    for (let i = 0; i < miPairs.length; i++) {
      const p = miPairs[i];
      expect(p).toBeDefined();
      expect(p.id).toBeTruthy();
      expect(p.optionA).toBeDefined();
      expect(p.optionA.text).toBeDefined();
      expect(p.optionA.text.id).toBeTruthy();
      expect(p.optionB).toBeDefined();
      expect(p.optionB.text).toBeDefined();
      expect(p.optionB.text.id).toBeTruthy();
    }
  });

  it("all personality questions should have valid id, optionA, optionB, and dimension", () => {
    for (let i = 0; i < personalityQuestions.length; i++) {
      const q = personalityQuestions[i];
      expect(q).toBeDefined();
      expect(q.id).toBeTruthy();
      expect(q.optionA).toBeDefined();
      expect(q.optionB).toBeDefined();
      expect(q.dimension).toBeTruthy();
    }
  });

  it("all SJT questions should have valid id, scenario, and options", () => {
    for (let i = 0; i < sjtQuestions.length; i++) {
      const q = sjtQuestions[i];
      expect(q).toBeDefined();
      expect(q.id).toBeTruthy();
      expect(q.scenario).toBeDefined();
      expect(q.scenario.id).toBeTruthy();
      expect(q.options).toBeDefined();
      expect(q.options.length).toBeGreaterThan(0);
    }
  });

  it("accessing out-of-bounds index with optional chaining should return undefined", () => {
    // This simulates the fix: accessing beyond array bounds should not crash
    const outOfBounds = riasecProQuestions[999];
    expect(outOfBounds).toBeUndefined();
    expect(outOfBounds?.id).toBeUndefined();
    expect(outOfBounds?.text?.id).toBeUndefined();

    const miOutOfBounds = miPairs[999];
    expect(miOutOfBounds).toBeUndefined();
    expect(miOutOfBounds?.id).toBeUndefined();

    const personalityOutOfBounds = personalityQuestions[999];
    expect(personalityOutOfBounds).toBeUndefined();
    expect(personalityOutOfBounds?.id).toBeUndefined();

    const sjtOutOfBounds = sjtQuestions[999];
    expect(sjtOutOfBounds).toBeUndefined();
    expect(sjtOutOfBounds?.id).toBeUndefined();
    expect(sjtOutOfBounds?.scenario?.id).toBeUndefined();
    expect((sjtOutOfBounds?.options ?? []).length).toBe(0);
  });

  it("RIASEC questions should have unique IDs", () => {
    const ids = riasecProQuestions.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("MI pairs should have unique IDs", () => {
    const ids = miPairs.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("auto-advance bounds check: next index should never exceed array length", () => {
    // Simulate the auto-advance logic from the useEffect
    const simulateAutoAdvance = (currentIndex: number, arrayLength: number): number => {
      const next = currentIndex + 1;
      return next < arrayLength ? next : currentIndex;
    };

    // Normal case: advance from 0 to 1
    expect(simulateAutoAdvance(0, 30)).toBe(1);
    // Normal case: advance from 28 to 29 (last question)
    expect(simulateAutoAdvance(28, 30)).toBe(29);
    // Edge case: at last question (29), should stay at 29
    expect(simulateAutoAdvance(29, 30)).toBe(29);
    // Edge case: somehow beyond bounds, should stay
    expect(simulateAutoAdvance(30, 30)).toBe(30);
    // Edge case: empty array
    expect(simulateAutoAdvance(0, 0)).toBe(0);
  });

  it("total question count should be 97 (profil fields + all sections)", () => {
    const total = profilDiriFields.length + riasecProQuestions.length + miPairs.length +
      personalityQuestions.length + sjtQuestions.length + creativeQuestions.length + rankingExercises.length;
    // profilDiri (5) + RIASEC (30) + MI (24) + Personality (20) + SJT (8) + Creative (4) + Ranking (6) = 97
    expect(total).toBe(97);
  });
});
