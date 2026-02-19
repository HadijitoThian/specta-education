import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@spectaeducation.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

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

describe("Drip Campaign System", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let publicCaller: ReturnType<typeof appRouter.createCaller>;
  let testCampaignId: number;
  let testStepId: number;
  let testEnrollmentId: number;
  let testUnsubscribeToken: string;

  beforeAll(() => {
    adminCaller = appRouter.createCaller(createAdminContext());
    publicCaller = appRouter.createCaller(createPublicContext());
  });

  // ==========================================
  // Campaign CRUD
  // ==========================================
  describe("Campaign Management", () => {
    it("should create a new campaign", async () => {
      const campaign = await adminCaller.dripCampaign.createCampaign({
        name: "Test Campaign",
        description: "A test drip campaign",
        triggerSource: "manual",
        isActive: true,
      });

      expect(campaign).toBeTruthy();
      expect(campaign!.name).toBe("Test Campaign");
      expect(campaign!.description).toBe("A test drip campaign");
      expect(campaign!.triggerSource).toBe("manual");
      expect(campaign!.isActive).toBe(true);
      testCampaignId = campaign!.id;
    });

    it("should list campaigns with stats", async () => {
      const campaigns = await adminCaller.dripCampaign.listCampaigns();
      expect(Array.isArray(campaigns)).toBe(true);
      expect(campaigns.length).toBeGreaterThan(0);

      const testCampaign = campaigns.find((c) => c.id === testCampaignId);
      expect(testCampaign).toBeTruthy();
      expect(testCampaign!.stepCount).toBe(0);
      expect(testCampaign!.totalEnrolled).toBe(0);
    });

    it("should get a single campaign", async () => {
      const campaign = await adminCaller.dripCampaign.getCampaign({
        id: testCampaignId,
      });
      expect(campaign).toBeTruthy();
      expect(campaign!.name).toBe("Test Campaign");
    });

    it("should update a campaign", async () => {
      const updated = await adminCaller.dripCampaign.updateCampaign({
        id: testCampaignId,
        name: "Updated Campaign",
        isActive: false,
      });
      expect(updated).toBeTruthy();
      expect(updated!.name).toBe("Updated Campaign");
      expect(updated!.isActive).toBe(false);

      // Re-activate for further tests
      await adminCaller.dripCampaign.updateCampaign({
        id: testCampaignId,
        isActive: true,
      });
    });
  });

  // ==========================================
  // Email Steps
  // ==========================================
  describe("Email Steps", () => {
    it("should create an email step", async () => {
      const step = await adminCaller.dripCampaign.createStep({
        campaignId: testCampaignId,
        stepOrder: 1,
        subject: "Welcome {{name}}!",
        htmlContent: "<h1>Hello {{name}}</h1><p>Welcome to our program!</p>",
        delayDays: 3,
        isActive: true,
      });

      expect(step).toBeTruthy();
      expect(step!.subject).toBe("Welcome {{name}}!");
      expect(step!.delayDays).toBe(3);
      expect(step!.stepOrder).toBe(1);
      testStepId = step!.id;
    });

    it("should create a second email step", async () => {
      const step = await adminCaller.dripCampaign.createStep({
        campaignId: testCampaignId,
        stepOrder: 2,
        subject: "Follow up for {{name}}",
        htmlContent: "<h1>Hi {{name}}</h1><p>Just checking in!</p>",
        delayDays: 3,
        isActive: true,
      });

      expect(step).toBeTruthy();
      expect(step!.stepOrder).toBe(2);
    });

    it("should list steps for a campaign", async () => {
      const steps = await adminCaller.dripCampaign.listSteps({
        campaignId: testCampaignId,
      });
      expect(steps.length).toBe(2);
      expect(steps[0].stepOrder).toBe(1);
      expect(steps[1].stepOrder).toBe(2);
    });

    it("should update a step", async () => {
      const updated = await adminCaller.dripCampaign.updateStep({
        id: testStepId,
        subject: "Updated Subject {{name}}",
        delayDays: 5,
      });
      expect(updated).toBeTruthy();
      expect(updated!.subject).toBe("Updated Subject {{name}}");
      expect(updated!.delayDays).toBe(5);
    });

    it("should toggle step active status", async () => {
      const disabled = await adminCaller.dripCampaign.updateStep({
        id: testStepId,
        isActive: false,
      });
      expect(disabled!.isActive).toBe(false);

      const enabled = await adminCaller.dripCampaign.updateStep({
        id: testStepId,
        isActive: true,
      });
      expect(enabled!.isActive).toBe(true);
    });
  });

  // ==========================================
  // Enrollments
  // ==========================================
  describe("Enrollments", () => {
    it("should manually enroll a contact", async () => {
      const enrollment = await adminCaller.dripCampaign.enrollContact({
        campaignId: testCampaignId,
        contactEmail: "test-drip@example.com",
        contactName: "Test Student",
        contactPhone: "+6281234567890",
      });

      expect(enrollment).toBeTruthy();
      expect(enrollment!.contactEmail).toBe("test-drip@example.com");
      expect(enrollment!.contactName).toBe("Test Student");
      expect(enrollment!.status).toBe("active");
      expect(enrollment!.currentStepOrder).toBe(0);
      expect(enrollment!.unsubscribeToken).toBeTruthy();
      testEnrollmentId = enrollment!.id;
      testUnsubscribeToken = enrollment!.unsubscribeToken;
    });

    it("should prevent duplicate enrollment", async () => {
      await expect(
        adminCaller.dripCampaign.enrollContact({
          campaignId: testCampaignId,
          contactEmail: "test-drip@example.com",
          contactName: "Test Student",
        })
      ).rejects.toThrow("Contact is already enrolled");
    });

    it("should list enrollments for a campaign", async () => {
      const enrollments = await adminCaller.dripCampaign.listEnrollments({
        campaignId: testCampaignId,
      });
      expect(enrollments.length).toBeGreaterThan(0);
      const found = enrollments.find((e) => e.id === testEnrollmentId);
      expect(found).toBeTruthy();
    });

    it("should pause an enrollment", async () => {
      const result = await adminCaller.dripCampaign.updateEnrollmentStatus({
        id: testEnrollmentId,
        status: "paused",
      });
      expect(result.success).toBe(true);

      const enrollments = await adminCaller.dripCampaign.listEnrollments({
        campaignId: testCampaignId,
      });
      const found = enrollments.find((e) => e.id === testEnrollmentId);
      expect(found!.status).toBe("paused");
    });

    it("should resume an enrollment", async () => {
      const result = await adminCaller.dripCampaign.updateEnrollmentStatus({
        id: testEnrollmentId,
        status: "active",
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================
  // Analytics
  // ==========================================
  describe("Analytics", () => {
    it("should return campaign analytics", async () => {
      const analytics = await adminCaller.dripCampaign.getCampaignAnalytics({
        campaignId: testCampaignId,
      });

      expect(analytics).toBeTruthy();
      expect(analytics.totalEnrolled).toBeGreaterThanOrEqual(1);
      expect(analytics.active).toBeGreaterThanOrEqual(0);
      expect(typeof analytics.totalSent).toBe("number");
      expect(typeof analytics.totalOpened).toBe("number");
      expect(typeof analytics.totalClicked).toBe("number");
    });
  });

  // ==========================================
  // Unsubscribe (public)
  // ==========================================
  describe("Unsubscribe", () => {
    it("should unsubscribe with valid token", async () => {
      const result = await publicCaller.dripCampaign.unsubscribe({
        token: testUnsubscribeToken,
      });
      expect(result.success).toBe(true);
      expect(result.alreadyUnsubscribed).toBe(false);
    });

    it("should handle already unsubscribed", async () => {
      const result = await publicCaller.dripCampaign.unsubscribe({
        token: testUnsubscribeToken,
      });
      expect(result.success).toBe(true);
      expect(result.alreadyUnsubscribed).toBe(true);
    });

    it("should reject invalid token", async () => {
      await expect(
        publicCaller.dripCampaign.unsubscribe({
          token: "invalid-token-that-does-not-exist",
        })
      ).rejects.toThrow("Invalid unsubscribe token");
    });
  });

  // ==========================================
  // Trigger Processing
  // ==========================================
  describe("Processing", () => {
    it("should trigger manual processing without errors", async () => {
      const result = await adminCaller.dripCampaign.triggerProcessing();
      expect(typeof result.sent).toBe("number");
      expect(typeof result.errors).toBe("number");
    });
  });

  // ==========================================
  // Cleanup
  // ==========================================
  describe("Cleanup", () => {
    it("should delete a step", async () => {
      const result = await adminCaller.dripCampaign.deleteStep({
        id: testStepId,
      });
      expect(result.success).toBe(true);
    });

    it("should delete the test campaign and all related data", async () => {
      const result = await adminCaller.dripCampaign.deleteCampaign({
        id: testCampaignId,
      });
      expect(result.success).toBe(true);

      const campaign = await adminCaller.dripCampaign.getCampaign({
        id: testCampaignId,
      });
      expect(campaign).toBeNull();
    });
  });
});
