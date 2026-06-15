/**
 * Marketing / Growth router (Phase A) — mounted as `marketing`.
 *
 * Closes the loop between ad spend → leads → enrolled students:
 *  - attributionReport: groups leads by channel + campaign, with funnel counts
 *    (leads → consultations → enrolled) and, when spend is entered, cost-per-lead
 *    and cost-per-enrollment.
 *  - spend CRUD: manual monthly ad-spend entry (Google Ads API sync is later).
 *
 * Admin-only. All numbers are derived from first-touch attribution captured on
 * the lead at creation (see server/attribution.ts).
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import {
  getLeadsForAttribution,
  listMarketingSpend,
  createMarketingSpend,
  updateMarketingSpend,
  deleteMarketingSpend,
  listAdCampaigns,
  getAdCampaign,
  createAdCampaign,
  updateAdCampaign,
  deleteAdCampaign,
  replaceMonthlySpend,
} from "./db";
import { generateCampaign, campaignToCsv, type GeneratedCampaign } from "./adsCopilot";
import { generatePerformanceDigest, runGeoMonitor, analyzeContentGaps } from "./growthInsights";
import { listGrowthDigests, listGeoSnapshots } from "./db";
import { isGoogleAdsConfigured, getStatus as googleAdsStatus, syncPerformance, pushCampaignLive, getRecommendations, applyRecommendation } from "./googleAdsApi";

// Stages that count as "reached a consultation" (everything past new_lead, on-pipeline).
const POST_CONSULT = new Set([
  "consultation", "ielts_prep", "shortlist", "application", "offer", "visa", "pre_departure", "enrolled",
]);

function classify(l: { utmSource: string | null; gclid: string | null }): string {
  if (l.utmSource) return l.utmSource.toLowerCase();
  if (l.gclid) return "google";
  return "organic/direct";
}

function requireAdmin(ctx: any) {
  if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}

export const marketingRouter = router({
  /** Conversion + ROI report grouped by channel/campaign. */
  attributionReport: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).optional())
    .query(async ({ input, ctx }) => {
      requireAdmin(ctx);
      const month = input?.month;
      const [leads, spend] = await Promise.all([
        getLeadsForAttribution({ month }),
        listMarketingSpend(month),
      ]);

      type Row = {
        channel: string; campaign: string;
        leads: number; consultations: number; enrolled: number;
        spend: number; clicks: number; impressions: number;
      };
      const groups = new Map<string, Row>();
      const keyOf = (c: string, cam: string) => `${c}||${cam}`;
      const ensure = (channel: string, campaign: string): Row => {
        const k = keyOf(channel, campaign);
        let g = groups.get(k);
        if (!g) { g = { channel, campaign, leads: 0, consultations: 0, enrolled: 0, spend: 0, clicks: 0, impressions: 0 }; groups.set(k, g); }
        return g;
      };

      for (const l of leads) {
        const channel = classify(l);
        const campaign = (l.utmCampaign || "(none)").toLowerCase();
        const g = ensure(channel, campaign);
        g.leads += 1;
        if (POST_CONSULT.has(l.pipelineStage)) g.consultations += 1;
        if (l.pipelineStage === "enrolled") g.enrolled += 1;
      }

      // Attach spend to its matching group (exact source+campaign, or source-level → "(none)").
      for (const s of spend) {
        const channel = s.source.toLowerCase();
        const campaign = (s.campaign || "(none)").toLowerCase();
        const g = ensure(channel, campaign);
        g.spend += Number(s.amount || 0);
        g.clicks += s.clicks || 0;
        g.impressions += s.impressions || 0;
      }

      const rows = Array.from(groups.values()).map(g => ({
        ...g,
        convRate: g.leads ? g.enrolled / g.leads : 0,
        cpl: g.leads && g.spend ? g.spend / g.leads : null,
        cpa: g.enrolled && g.spend ? g.spend / g.enrolled : null,
        ctr: g.impressions && g.clicks ? g.clicks / g.impressions : null,
      })).sort((a, b) => b.spend - a.spend || b.leads - a.leads);

      const totals = rows.reduce((t, r) => ({
        leads: t.leads + r.leads, consultations: t.consultations + r.consultations,
        enrolled: t.enrolled + r.enrolled, spend: t.spend + r.spend,
        clicks: t.clicks + r.clicks, impressions: t.impressions + r.impressions,
      }), { leads: 0, consultations: 0, enrolled: 0, spend: 0, clicks: 0, impressions: 0 });

      return {
        month: month || "all",
        rows,
        totals: {
          ...totals,
          convRate: totals.leads ? totals.enrolled / totals.leads : 0,
          cpl: totals.leads && totals.spend ? totals.spend / totals.leads : null,
          cpa: totals.enrolled && totals.spend ? totals.spend / totals.enrolled : null,
        },
      };
    }),

  // ── Ad-spend entry ─────────────────────────────────────────────────────────
  listSpend: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).optional())
    .query(async ({ input, ctx }) => {
      requireAdmin(ctx);
      return listMarketingSpend(input?.month);
    }),

  addSpend: protectedProcedure
    .input(z.object({
      source: z.string().min(1).max(120),
      campaign: z.string().max(160).optional(),
      medium: z.string().max(120).optional(),
      periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
      amount: z.number().nonnegative(),
      currency: z.string().max(8).optional(),
      clicks: z.number().int().nonnegative().optional(),
      impressions: z.number().int().nonnegative().optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      return createMarketingSpend({
        source: input.source.trim().toLowerCase(),
        campaign: input.campaign?.trim() || null,
        medium: input.medium?.trim() || null,
        periodMonth: input.periodMonth,
        amount: String(input.amount) as any,
        currency: input.currency || "IDR",
        clicks: input.clicks ?? null,
        impressions: input.impressions ?? null,
        notes: input.notes?.trim() || null,
      });
    }),

  updateSpend: protectedProcedure
    .input(z.object({
      id: z.number(),
      source: z.string().min(1).max(120).optional(),
      campaign: z.string().max(160).nullable().optional(),
      medium: z.string().max(120).nullable().optional(),
      periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      amount: z.number().nonnegative().optional(),
      currency: z.string().max(8).optional(),
      clicks: z.number().int().nonnegative().nullable().optional(),
      impressions: z.number().int().nonnegative().nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      const { id, amount, source, ...rest } = input;
      await updateMarketingSpend(id, {
        ...rest,
        ...(source ? { source: source.trim().toLowerCase() } : {}),
        ...(amount !== undefined ? { amount: String(amount) as any } : {}),
      } as any);
      return { success: true };
    }),

  deleteSpend: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      await deleteMarketingSpend(input.id);
      return { success: true };
    }),

  /**
   * Import a Google Ads performance export (parsed client-side into rows).
   * Replaces all google spend for the month so re-imports don't duplicate.
   * Campaign names are slugified to match the utm_campaign on the ad URLs.
   */
  importGoogleAdsSpend: protectedProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      currency: z.string().max(8).optional(),
      rows: z.array(z.object({
        campaign: z.string().max(160).optional(),
        amount: z.number().nonnegative(),
        clicks: z.number().int().nonnegative().optional(),
        impressions: z.number().int().nonnegative().optional(),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      const slug = (s?: string) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const rows = input.rows.map(r => ({
        source: "google",
        medium: "cpc",
        campaign: r.campaign ? slug(r.campaign) || null : null,
        periodMonth: input.month,
        amount: String(r.amount) as any,
        currency: input.currency || "IDR",
        clicks: r.clicks ?? null,
        impressions: r.impressions ?? null,
        notes: "Imported from Google Ads",
      }));
      const count = await replaceMonthlySpend("google", input.month, rows as any);
      return { count };
    }),

  // ── AI Google Ads Co-pilot (Phase B) ─────────────────────────────────────────
  /** Generate a full campaign from a brief and save it as a draft. */
  generateCampaign: protectedProcedure
    .input(z.object({
      product: z.string().min(1).max(120),
      goal: z.string().max(255).optional(),
      landingPath: z.string().max(255).optional(),
      dailyBudget: z.number().nonnegative().optional(),
      language: z.string().max(120).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      let gen: GeneratedCampaign;
      try {
        gen = await generateCampaign(input);
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
      const saved = await createAdCampaign({
        name: gen.campaignName,
        product: input.product.slice(0, 120),
        goal: input.goal,
        landingPath: input.landingPath || "/contact",
        dailyBudget: String(input.dailyBudget ?? gen.dailyBudgetSuggested ?? 0) as any,
        payload: gen as any,
        status: "draft",
        createdBy: ctx.user.id,
      });
      return saved;
    }),

  listCampaigns: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    return listAdCampaigns();
  }),

  getCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      requireAdmin(ctx);
      const c = await getAdCampaign(input.id);
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
      return c;
    }),

  /** Return the Google Ads Editor CSV text for a saved campaign. */
  exportCampaignCsv: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      const c = await getAdCampaign(input.id);
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
      const csv = campaignToCsv(c.payload as unknown as GeneratedCampaign, c.name);
      await updateAdCampaign(c.id, { status: "exported" });
      return { csv, filename: `${c.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv` };
    }),

  deleteCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      await deleteAdCampaign(input.id);
      return { success: true };
    }),

  // ── Growth Intelligence (Phase C) ────────────────────────────────────────────
  /** Generate (and save) an AI performance digest for the current month. */
  generateDigest: protectedProcedure.mutation(async ({ ctx }) => {
    requireAdmin(ctx);
    try { return await generatePerformanceDigest(); }
    catch (e) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message }); }
  }),
  listDigests: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    return listGrowthDigests(12);
  }),

  /** Run the GEO visibility monitor now. */
  runGeoMonitor: protectedProcedure.mutation(async ({ ctx }) => {
    requireAdmin(ctx);
    try { return await runGeoMonitor(); }
    catch (e) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message }); }
  }),
  geoSnapshots: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    return listGeoSnapshots(200);
  }),

  /** AI content-gap analysis (ephemeral) — feed results to blog.produceArticle. */
  contentGaps: protectedProcedure.mutation(async ({ ctx }) => {
    requireAdmin(ctx);
    try { return await analyzeContentGaps(); }
    catch (e) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message }); }
  }),

  // ── Google Ads live API (Phase D) ────────────────────────────────────────────
  /** Connection status — tells the UI whether credentials are set + working. */
  googleAdsStatus: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    if (!isGoogleAdsConfigured()) return { configured: false as const };
    return googleAdsStatus();
  }),

  /** D1: pull real spend/clicks/impressions for a month from Google Ads. */
  googleAdsSync: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      try { return { count: await syncPerformance(input.month) }; }
      catch (e) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message }); }
    }),

  /** D2: push a saved Co-pilot campaign live (created PAUSED for review). */
  googleAdsPush: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      const c = await getAdCampaign(input.id);
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
      try { return await pushCampaignLive(c); }
      catch (e) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message }); }
    }),

  /** D3 Advisor: AI optimization suggestions (read-only — you approve each). */
  adsRecommendations: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    if (!isGoogleAdsConfigured()) return [];
    try { return await getRecommendations(); }
    catch (e) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message }); }
  }),

  /** D3 Advisor: apply one approved suggestion. */
  adsApplyRecommendation: protectedProcedure
    .input(z.object({
      type: z.enum(["pause_keyword", "scale_budget"]),
      resourceName: z.string(),
      amountMicros: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx);
      try { return await applyRecommendation(input); }
      catch (e) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message }); }
    }),
});
