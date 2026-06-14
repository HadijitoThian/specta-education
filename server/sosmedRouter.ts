/**
 * Social Media workspace (/sosmed) — server (Phase 1). Mounted as `sosmed`.
 *
 * Access: site admin, crmRole "owner", or crmRole "marketing" (active). The
 * marketing team does NOT get the student CRM — that's gated separately.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { brandKit, sosmedContent } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { composeInstagramImage } from "./imageCompositor";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";

type Slide = { headline: string; subheadline: string; imagePrompt: string; imageUrl?: string | null };

function parseSlides(raw: string | null): Slide[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}

/** R2 object key from a storagePut URL (the part after the host). */
function r2KeyFromUrl(url: string): string {
  try { return new URL(url).pathname.replace(/^\/+/, ""); } catch { return ""; }
}
function appBase(): string {
  const b = ENV.appUrl?.replace(/\/+$/, "") || "https://www.spectaeducation.com";
  return /^https?:\/\//i.test(b) ? b : `https://${b}`;
}

function isOwner(u: { role: string; crmRole: string | null }) {
  return u.role === "admin" || u.crmRole === "owner";
}
function canAccessSosmed(u: { role: string; crmRole: string | null; crmActive: boolean }) {
  return isOwner(u) || (u.crmRole === "marketing" && u.crmActive);
}
function assertSosmed(u: { role: string; crmRole: string | null; crmActive: boolean }) {
  if (!canAccessSosmed(u)) throw new TRPCError({ code: "FORBIDDEN", message: "Marketing access required." });
}

export const sosmedRouter = router({
  /** Who am I, for the SosMed workspace (gates access + nav). */
  me: protectedProcedure.query(({ ctx }) => {
    const u = ctx.user;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      crmRole: u.crmRole,
      isOwner: isOwner(u),
      canAccess: canAccessSosmed(u),
    };
  }),

  getBrandKit: protectedProcedure.query(async ({ ctx }) => {
    assertSosmed(ctx.user);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [row] = await db.select().from(brandKit).limit(1);
    return row ?? null;
  }),

  updateBrandKit: protectedProcedure
    .input(
      z.object({
        brandName: z.string().max(160).optional(),
        logoUrl: z.string().max(500).nullable().optional(),
        logoWhiteUrl: z.string().max(500).nullable().optional(),
        primaryColor: z.string().max(16).optional(),
        secondaryColor: z.string().max(16).optional(),
        accentColor: z.string().max(16).optional(),
        fontHeading: z.string().max(80).optional(),
        fontBody: z.string().max(80).optional(),
        toneOfVoice: z.string().max(4000).nullable().optional(),
        targetAudience: z.string().max(4000).nullable().optional(),
        keyOffers: z.string().max(4000).nullable().optional(),
        doList: z.string().max(4000).nullable().optional(),
        dontList: z.string().max(4000).nullable().optional(),
        contentAngles: z.string().max(8000).nullable().optional(),
        hashtags: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) if (v !== undefined) patch[k] = v;
      const [existing] = await db.select({ id: brandKit.id }).from(brandKit).limit(1);
      if (!existing) {
        await db.insert(brandKit).values(patch as any);
      } else if (Object.keys(patch).length) {
        await db.update(brandKit).set(patch).where(eq(brandKit.id, existing.id));
      }
      return { ok: true };
    }),

  /** Suggest post ideas from the Brand Kit (angles + offers). */
  suggestIdeas: protectedProcedure.mutation(async ({ ctx }) => {
    assertSosmed(ctx.user);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [kit] = await db.select().from(brandKit).limit(1);
    const system =
      "You are a social-media strategist for SpecTa Education (Indonesian study-abroad consultancy). " +
      "Using the brand kit, propose 8 fresh, specific Instagram post ideas (mix of carousels, single posts, tips, stories, offers). " +
      'Output STRICT JSON: { "ideas": string[] } — each idea is one short sentence (a brief a content team could run with).';
    const res = await invokeLLM({
      model: "deepseek-v4-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ angles: kit?.contentAngles, offers: kit?.keyOffers, audience: kit?.targetAudience }) },
      ],
    });
    const content = res.choices?.[0]?.message?.content;
    try {
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");
      return { ideas: Array.isArray(parsed.ideas) ? parsed.ideas.slice(0, 8) : [] };
    } catch {
      return { ideas: [] };
    }
  }),

  /** Generate an on-brand draft (caption + hashtags + branded slide image(s)). */
  generateContent: protectedProcedure
    .input(z.object({
      brief: z.string().min(3).max(1000),
      format: z.enum(["single", "carousel"]),
      slideCount: z.number().int().min(2).max(6).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [kit] = await db.select().from(brandKit).limit(1);
      const n = input.format === "carousel" ? (input.slideCount ?? 4) : 1;

      const system =
        `You are the content team (strategist + copywriter) for ${kit?.brandName || "SpecTa Education"}, an Indonesian study-abroad consultancy. ` +
        `TONE: ${kit?.toneOfVoice || "warm, professional, empowering, bilingual ID/EN, never pushy"}. ` +
        `AUDIENCE: ${kit?.targetAudience || "Indonesian students 18-24 + their parents"}. ` +
        `OFFERS: ${kit?.keyOffers || ""}. DO: ${kit?.doList || ""}. DON'T: ${kit?.dontList || ""}. ` +
        `Create an Instagram ${input.format} post for the brief. Output STRICT JSON: ` +
        `{ "caption": string (engaging, on-brand, bilingual where natural, 3-6 short lines, emojis ok, one clear CTA), ` +
        `"hashtags": string (10-15 relevant hashtags, space-separated), ` +
        `"slides": array of ${n} objects, each { "headline": short punchy on-image text max 6 words, ` +
        `"subheadline": supporting line max 10 words, "imagePrompt": a vivid ENGLISH text-to-image prompt for a clean, ` +
        `photoreal background that fits the slide — describe scene/subject/lighting/style, do NOT include any text or logos in the image } } ` +
        (n > 1 ? `Make slide 1 a strong hook and the last slide a CTA. ` : ``) +
        `Keep claims truthful. Return ONLY the JSON.`;

      const res = await invokeLLM({
        model: "deepseek-v4-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ brief: input.brief, slideCount: n, brandColors: { primary: kit?.primaryColor, accent: kit?.accentColor } }) },
        ],
      });
      const content = res.choices?.[0]?.message?.content;
      let parsed: any = {};
      try { parsed = JSON.parse(typeof content === "string" ? content : "{}"); } catch { /* keep empty */ }

      const caption: string = parsed.caption || "";
      const hashtags: string = parsed.hashtags || kit?.hashtags || "";
      const slides: Slide[] = (Array.isArray(parsed.slides) ? parsed.slides : []).slice(0, n).map((s: any) => ({
        headline: String(s?.headline || "").slice(0, 80),
        subheadline: String(s?.subheadline || "").slice(0, 140),
        imagePrompt: String(s?.imagePrompt || input.brief).slice(0, 600),
        imageUrl: null,
      }));

      // Best-effort branded images (works once DEEPINFRA_API_KEY is set).
      let imageError: string | null = null;
      for (const s of slides) {
        try {
          const bg = await generateImage({ prompt: s.imagePrompt, width: 1024, height: 1024 });
          const bgUrl = bg.url || "";
          const bgKey = r2KeyFromUrl(bgUrl);
          // Serve via the same-origin /files proxy (the R2 public URL isn't exposed).
          let imageUrl = bgKey ? `/files/${bgKey}` : bgUrl;
          try {
            const comp = await composeInstagramImage({
              backgroundUrl: bgKey ? `${appBase()}/files/${bgKey}` : bgUrl,
              headline: s.headline,
              subheadline: s.subheadline,
              logoUrl: kit?.logoUrl || undefined,
              logoWhiteUrl: kit?.logoWhiteUrl || undefined,
            });
            if (comp.success && comp.imageBuffer) {
              const put = await storagePut(`sosmed/${nanoid(10)}.png`, comp.imageBuffer, "image/png");
              imageUrl = `/files/${put.key}`;
            }
          } catch { /* fall back to raw background (via proxy) */ }
          s.imageUrl = imageUrl;
        } catch (e: any) {
          s.imageUrl = null;
          if (!imageError) imageError = e?.message || "image generation failed";
        }
      }

      const r = await db.insert(sosmedContent).values({
        brief: input.brief,
        format: input.format,
        caption,
        hashtags,
        slides: JSON.stringify(slides),
        status: "draft",
        createdBy: ctx.user.id,
        createdByName: ctx.user.name || null,
      });
      const id = (r as any)[0]?.insertId as number;
      return { id, imageError, hasCaption: !!caption };
    }),

  listContent: protectedProcedure.query(async ({ ctx }) => {
    assertSosmed(ctx.user);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db
      .select({ id: sosmedContent.id, brief: sosmedContent.brief, format: sosmedContent.format, status: sosmedContent.status, slides: sosmedContent.slides, createdByName: sosmedContent.createdByName, createdAt: sosmedContent.createdAt })
      .from(sosmedContent)
      .orderBy(desc(sosmedContent.id))
      .limit(100);
    return rows.map(r => {
      const slides = parseSlides(r.slides);
      return { id: r.id, brief: r.brief, format: r.format, status: r.status, slideCount: slides.length, thumbnail: slides[0]?.imageUrl ?? null, createdByName: r.createdByName, createdAt: r.createdAt };
    });
  }),

  getContent: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(sosmedContent).where(eq(sosmedContent.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return { ...row, slidesParsed: parseSlides(row.slides) };
    }),

  deleteContent: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(sosmedContent).where(eq(sosmedContent.id, input.id));
      return { ok: true };
    }),
});
