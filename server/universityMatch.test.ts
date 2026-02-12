import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Helper: create an admin context for protected procedures
function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@spectaeducation.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// Helper: create a regular user context
function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// Helper: create a public (unauthenticated) context
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("universityMatch", () => {
  // ===== ADMIN CRUD TESTS =====

  describe("listUniversities (admin)", () => {
    it("returns a list of universities for admin users", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.universityMatch.getAllUniversities();
      expect(Array.isArray(result)).toBe(true);
      // We seeded 15 universities
      expect(result.length).toBeGreaterThanOrEqual(15);
      // Each university should have expected fields
      const uni = result[0];
      expect(uni).toHaveProperty("id");
      expect(uni).toHaveProperty("name");
      expect(uni).toHaveProperty("country");
      expect(uni).toHaveProperty("city");
    });

    it("returns empty array for regular users", async () => {
      const caller = appRouter.createCaller(createUserContext());
      const result = await caller.universityMatch.getAllUniversities();
      expect(result).toEqual([]);
    });
  });

  describe("getProgramsByUniversity (admin)", () => {
    it("returns programs for a given university", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      // Taylor's University has ID 1 from seed
      const programs = await caller.universityMatch.getProgramsByUniversity({ universityId: 1 });
      expect(Array.isArray(programs)).toBe(true);
      expect(programs.length).toBeGreaterThanOrEqual(4); // Taylor's has 5 programs
      const prog = programs[0];
      expect(prog).toHaveProperty("programName");
      expect(prog).toHaveProperty("riasecCodes");
      expect(prog).toHaveProperty("miTypes");
    });
  });

  describe("createUniversity (admin)", () => {
    it("creates a new university successfully", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const newUni = await caller.universityMatch.createUniversity({
        name: "Test University",
        country: "Indonesia",
        city: "Jakarta",
        tuitionMinUsd: 5000,
        tuitionMaxUsd: 10000,
        ieltsMin: "6.0",
        scholarshipAvailable: true,
      });
      expect(newUni).toHaveProperty("id");
      expect(newUni.name).toBe("Test University");
      expect(newUni.country).toBe("Indonesia");
    });

    it("rejects creation by regular users", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.universityMatch.createUniversity({
          name: "Unauthorized University",
          country: "Indonesia",
          city: "Jakarta",
        })
      ).rejects.toThrow("Admin only");
    });
  });

  describe("updateUniversity (admin)", () => {
    it("updates a university successfully", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      // First create one to update
      const created = await caller.universityMatch.createUniversity({
        name: "Update Test University",
        country: "Thailand",
        city: "Bangkok",
      });
      const result = await caller.universityMatch.updateUniversity({
        id: created.id,
        name: "Updated University Name",
        city: "Chiang Mai",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("createProgram (admin)", () => {
    it("creates a new program for a university", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      // Use university ID 1 (Taylor's)
      const prog = await caller.universityMatch.createProgram({
        universityId: 1,
        programName: "Test Program",
        degreeLevel: "master",
        fieldOfStudy: "Data Science",
        riasecCodes: "ICE",
        miTypes: "logical,spatial",
      });
      expect(prog).toHaveProperty("id");
      expect(prog.programName).toBe("Test Program");
    });

    it("rejects program creation by regular users", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.universityMatch.createProgram({
          universityId: 1,
          programName: "Unauthorized Program",
          degreeLevel: "bachelor",
          fieldOfStudy: "Test",
          riasecCodes: "IRC",
          miTypes: "logical",
        })
      ).rejects.toThrow("Admin only");
    });
  });

  // ===== MATCHING ALGORITHM TESTS =====

  describe("getRecommendations (public)", () => {
    it("returns recommendations for a strong I-R-C profile", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { I: 90, R: 80, C: 70, A: 30, S: 20, E: 10 },
        miScores: { logical: 90, spatial: 80, intrapersonal: 60, linguistic: 30, interpersonal: 20, musical: 10, kinesthetic: 15, naturalistic: 25 },
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(10);

      // Results should be sorted by matchScore descending
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].matchScore).toBeGreaterThanOrEqual(result[i].matchScore);
      }

      // Top results should be CS/IT/Engineering programs (IRC profile)
      const topProgram = result[0];
      expect(topProgram).toHaveProperty("university");
      expect(topProgram).toHaveProperty("program");
      expect(topProgram).toHaveProperty("matchScore");
      expect(topProgram).toHaveProperty("riasecMatch");
      expect(topProgram).toHaveProperty("miMatch");
      expect(topProgram.matchScore).toBeGreaterThan(50);
    });

    it("returns recommendations for an E-S-A profile (business/social)", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { E: 90, S: 80, A: 70, I: 30, R: 20, C: 40 },
        miScores: { interpersonal: 90, linguistic: 80, intrapersonal: 60, logical: 30, spatial: 20, musical: 10, kinesthetic: 15, naturalistic: 25 },
      });
      expect(result.length).toBeGreaterThan(0);

      // Top results should lean toward business/hospitality/communication programs
      const topProgramFields = result.slice(0, 5).map(r => r.program.fieldOfStudy.toLowerCase());
      const hasBusinessOrSocial = topProgramFields.some(f =>
        f.includes("business") || f.includes("hospitality") || f.includes("communication") || f.includes("marketing") || f.includes("international")
      );
      expect(hasBusinessOrSocial).toBe(true);
    });

    it("returns recommendations for an A-I-S profile (creative/artistic)", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { A: 95, I: 75, S: 65, E: 30, R: 20, C: 10 },
        miScores: { spatial: 90, kinesthetic: 80, musical: 70, linguistic: 40, logical: 30, interpersonal: 20, intrapersonal: 15, naturalistic: 10 },
      });
      expect(result.length).toBeGreaterThan(0);

      // Top results should include arts/design/music programs
      const topProgramFields = result.slice(0, 5).map(r => r.program.fieldOfStudy.toLowerCase());
      const hasCreative = topProgramFields.some(f =>
        f.includes("art") || f.includes("design") || f.includes("music") || f.includes("film") || f.includes("animation")
      );
      expect(hasCreative).toBe(true);
    });

    it("filters by country preference", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { I: 90, R: 80, C: 70, A: 30, S: 20, E: 10 },
        miScores: { logical: 90, spatial: 80, intrapersonal: 60, linguistic: 30, interpersonal: 20, musical: 10, kinesthetic: 15, naturalistic: 25 },
        countryPreference: "Malaysia",
      });
      expect(result.length).toBeGreaterThan(0);
      // All results should be from Malaysia
      for (const rec of result) {
        expect(rec.university.country).toBe("Malaysia");
      }
    });

    it("filters by budget", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { I: 90, R: 80, C: 70, A: 30, S: 20, E: 10 },
        miScores: { logical: 90, spatial: 80, intrapersonal: 60, linguistic: 30, interpersonal: 20, musical: 10, kinesthetic: 15, naturalistic: 25 },
        budgetMaxUsd: 10000,
      });
      // Should only return affordable universities (Malaysia, Xiamen)
      for (const rec of result) {
        if (rec.university.tuitionMinUsd) {
          expect(rec.university.tuitionMinUsd).toBeLessThanOrEqual(10000);
        }
      }
    });

    it("filters by degree level", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { I: 90, R: 80, C: 70, A: 30, S: 20, E: 10 },
        miScores: { logical: 90, spatial: 80, intrapersonal: 60, linguistic: 30, interpersonal: 20, musical: 10, kinesthetic: 15, naturalistic: 25 },
        degreeLevel: "bachelor",
      });
      for (const rec of result) {
        expect(rec.program.degreeLevel).toBe("bachelor");
      }
    });

    it("excludes elite universities", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { I: 90, R: 80, C: 70, A: 30, S: 20, E: 10 },
        miScores: { logical: 90, spatial: 80, intrapersonal: 60, linguistic: 30, interpersonal: 20, musical: 10, kinesthetic: 15, naturalistic: 25 },
      });
      const eliteNames = ["oxford", "cambridge", "mit", "harvard", "stanford"];
      for (const rec of result) {
        const nameLower = rec.university.name.toLowerCase();
        for (const elite of eliteNames) {
          expect(nameLower).not.toContain(elite);
        }
      }
    });

    it("returns empty array when no universities match", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      // All scores at 0 should produce no matches above threshold
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { X: 1, Y: 1, Z: 1 },
        miScores: { unknown1: 1, unknown2: 1, unknown3: 1 },
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("match scores are within valid range", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { I: 90, R: 80, C: 70, A: 30, S: 20, E: 10 },
        miScores: { logical: 90, spatial: 80, intrapersonal: 60, linguistic: 30, interpersonal: 20, musical: 10, kinesthetic: 15, naturalistic: 25 },
      });
      for (const rec of result) {
        expect(rec.matchScore).toBeGreaterThan(20); // minimum threshold
        expect(rec.matchScore).toBeLessThanOrEqual(100);
        expect(rec.riasecMatch).toBeGreaterThanOrEqual(0);
        // RIASEC can exceed 100 when position bonuses are applied (max ~120)
        expect(rec.riasecMatch).toBeLessThanOrEqual(120);
        expect(rec.miMatch).toBeGreaterThanOrEqual(0);
        expect(rec.miMatch).toBeLessThanOrEqual(100);
      }
    });

    it("returns max 10 recommendations", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.universityMatch.getRecommendations({
        riasecScores: { I: 50, R: 50, C: 50, A: 50, S: 50, E: 50 },
        miScores: { logical: 50, spatial: 50, interpersonal: 50, linguistic: 50, intrapersonal: 50, musical: 50, kinesthetic: 50, naturalistic: 50 },
      });
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });
});
