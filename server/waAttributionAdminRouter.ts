/**
 * WhatsApp attribution — admin tRPC routes.
 *
 * Mounted under `admin.waAttribution` in the main app router. All procedures
 * require role === "admin". Powers `/admin/wa-links`: create trackable
 * WhatsApp campaign codes, view click → message → conversion funnel per
 * campaign, and inspect individual sessions with GCLID + upload status.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "./_core/trpc";
import {
  listCampaigns, createCampaign, setCampaignActive,
  getCampaignStats, getRecentSessions,
  type WaProduct, type WaPlatform,
} from "./waAttribution";

function assertAdmin(ctx: { user: { role: string } | null }) {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
}

const PRODUCTS = [
  "mock", "tutor", "igcse", "ielts_course", "study_abroad",
  "scholarship", "aptitude", "consult", "other",
] as const satisfies readonly WaProduct[];

const PLATFORMS = [
  "google_ads", "meta_ads", "instagram_ads", "instagram_organic",
  "tiktok_ads", "tiktok_organic", "youtube_ads", "email", "sms",
  "organic", "direct", "referral", "unknown",
] as const satisfies readonly WaPlatform[];

/** Default target WhatsApp number. Falls back to the owner's public number
 *  if the WA_DEFAULT_PHONE env var isn't set. Numbers are stored as raw
 *  digits (no + or spaces) since Meta's wa.me expects that format. */
function defaultPhone(): string {
  return (process.env.WA_DEFAULT_PHONE || "6281121500028").replace(/\D/g, "");
}

export const waAttributionAdminRouter = router({
  /** List all campaigns (paginated implicitly by frontend). */
  listCampaigns: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx);
      return { items: await listCampaigns(input?.includeInactive ?? false) };
    }),

  /** Aggregated stats per campaign for the funnel dashboard. */
  campaignStats: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx);
      return { items: await getCampaignStats(input?.days ?? 30) };
    }),

  /** Recent sessions for the per-click debugging view. */
  recentSessions: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx);
      return { items: await getRecentSessions(input?.limit ?? 50) };
    }),

  /**
   * Create a new trackable campaign code. Returns the ready-to-use URL
   * for marketing to paste into their ad platform.
   */
  createCampaign: protectedProcedure
    .input(z.object({
      code: z.string()
        .min(3).max(100)
        .regex(/^[a-z0-9-]+$/i, "Lowercase letters, digits, and dashes only")
        .transform(s => s.toLowerCase()),
      name: z.string().min(3).max(200),
      product: z.enum(PRODUCTS),
      platform: z.enum(PLATFORMS),
      greeting: z.string().max(500).optional(),
      targetPhone: z.string().max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const targetPhone = (input.targetPhone || defaultPhone()).replace(/\D/g, "");
      if (targetPhone.length < 10) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "targetPhone must be a valid E.164 phone (digits only)" });
      }
      try {
        await createCampaign({
          code: input.code,
          name: input.name,
          product: input.product,
          platform: input.platform,
          greeting: input.greeting ?? null,
          targetPhone,
          createdBy: (ctx.user as any)?.id,
        });
      } catch (e) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Could not create campaign — code "${input.code}" may already exist.`,
        });
      }
      const base = (process.env.APP_URL || "https://www.spectaeducation.com").replace(/\/+$/, "");
      return {
        code: input.code,
        url: `${base}/wa/${input.code}`,
      };
    }),

  /** Toggle a campaign's isActive flag. */
  setCampaignActive: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      await setCampaignActive(input.id, input.isActive);
      return { ok: true };
    }),
});
