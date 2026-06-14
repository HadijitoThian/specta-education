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

type Layer = {
  id: string;
  kind: "text" | "logo";
  role?: string;
  text?: string;
  x: number; y: number; width?: number;
  fontFamily?: string; fontSize?: number; color?: string; weight?: number;
  align?: "left" | "center" | "right";
  logoVariant?: "color" | "white"; logoWidth?: number;
};
type Slide = { headline: string; subheadline: string; imagePrompt: string; imageUrl?: string | null; backgroundUrl?: string | null; layers?: Layer[] };

function parseSlides(raw: string | null): Slide[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}

let _lid = 0;
const lid = () => `l${Date.now().toString(36)}${(_lid++).toString(36)}`;

/** Default editable layers for a freshly generated slide (logo + headline + subheadline). */
function defaultLayers(headline: string, subheadline: string, kit: any): Layer[] {
  const font = kit?.fontHeading || "Poppins";
  return [
    { id: lid(), kind: "logo", role: "logo", x: 0.045, y: 0.045, logoVariant: "color", logoWidth: 230 },
    { id: lid(), kind: "text", role: "headline", text: headline || "Headline", x: 0.06, y: 0.70, width: 0.88, fontFamily: font, fontSize: 70, color: "#ffffff", weight: 800, align: "left" },
    { id: lid(), kind: "text", role: "subheadline", text: subheadline || "", x: 0.06, y: 0.855, width: 0.88, fontFamily: kit?.fontBody || font, fontSize: 32, color: "#ffffff", weight: 500, align: "left" },
    { id: lid(), kind: "text", role: "footer", text: `© ${new Date().getFullYear()} ${kit?.brandName || "SpecTa Education"} · spectaeducation.com · @spectaeducation`, x: 0.06, y: 0.95, width: 0.88, fontFamily: kit?.fontBody || font, fontSize: 20, color: "#ffffff", weight: 400, align: "left" },
  ];
}

/** Vision-analyze a reference image (via DeepInfra) into reusable style cues. */
async function analyzeReferenceStyle(base64: string, mime: string): Promise<string> {
  const key = process.env.DEEPINFRA_API_KEY;
  if (!key) return "";
  const model = process.env.DEEPINFRA_VISION_MODEL || "meta-llama/Llama-3.2-90B-Vision-Instruct";
  try {
    const res = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Describe the visual DESIGN STYLE of this social-media image so it can be replicated: colour palette, mood, lighting, composition/layout, photography vs illustration, and typography vibe. Give 4-6 concise lines of reusable style cues only." },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        }],
      }),
    });
    if (!res.ok) return "";
    const j: any = await res.json().catch(() => ({}));
    return j?.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

/** Generate just the background image (no baked text) via FLUX, served via /files. */
async function renderBackground(prompt: string): Promise<{ url: string | null; error?: string }> {
  try {
    const bg = await generateImage({ prompt, width: 1024, height: 1024 });
    const key = r2KeyFromUrl(bg.url || "");
    return { url: key ? `/files/${key}` : bg.url || null };
  } catch (e: any) {
    return { url: null, error: e?.message || "image generation failed" };
  }
}

/** R2 object key from a storagePut URL (the part after the host). */
function r2KeyFromUrl(url: string): string {
  try { return new URL(url).pathname.replace(/^\/+/, ""); } catch { return ""; }
}
function appBase(): string {
  const b = ENV.appUrl?.replace(/\/+$/, "") || "https://www.spectaeducation.com";
  return /^https?:\/\//i.test(b) ? b : `https://${b}`;
}

/** Generate one branded slide image (FLUX background + text/logo compositor),
 *  served via the /files proxy. Best-effort; returns { url, error }. */
async function renderSlideImage(
  prompt: string,
  headline: string,
  subheadline: string,
  kit: { logoUrl?: string | null; logoWhiteUrl?: string | null } | undefined
): Promise<{ url: string | null; error?: string }> {
  try {
    const bg = await generateImage({ prompt, width: 1024, height: 1024 });
    const bgUrl = bg.url || "";
    const bgKey = r2KeyFromUrl(bgUrl);
    let url = bgKey ? `/files/${bgKey}` : bgUrl;
    try {
      const comp = await composeInstagramImage({
        backgroundUrl: bgKey ? `${appBase()}/files/${bgKey}` : bgUrl,
        headline,
        subheadline,
        logoUrl: kit?.logoUrl || undefined,
        logoWhiteUrl: kit?.logoWhiteUrl || undefined,
      });
      if (comp.success && comp.imageBuffer) {
        const put = await storagePut(`sosmed/${nanoid(10)}.png`, comp.imageBuffer, "image/png");
        url = `/files/${put.key}`;
      }
    } catch { /* fall back to raw background via proxy */ }
    return { url };
  } catch (e: any) {
    return { url: null, error: e?.message || "image generation failed" };
  }
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
        visualStyle: z.string().max(4000).nullable().optional(),
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

  /** Art Director chat — brief the designer, upload references, evolve the Visual Style. */
  artDirectorChat: protectedProcedure
    .input(z.object({
      message: z.string().max(1000).optional(),
      referenceBase64: z.string().optional(),
      referenceMime: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [kit] = await db.select().from(brandKit).limit(1);
      let refAnalysis = "";
      if (input.referenceBase64) refAnalysis = await analyzeReferenceStyle(input.referenceBase64, input.referenceMime || "image/png");
      if (!input.message && !refAnalysis) {
        return { reply: "Add a note or upload a reference image to get started.", visualStyle: kit?.visualStyle || "", referenceAnalyzed: false };
      }
      const system =
        "You are the Art Director for SpecTa Education's social media (an Indonesian study-abroad consultancy). " +
        "You maintain a concise VISUAL STYLE guide that the image generator follows. Given the current style, the user's " +
        "instruction, and any reference-image analysis, update the guide. Return STRICT JSON: " +
        '{ "reply": a friendly 1-2 sentence response to the user, ' +
        '"visualStyle": the full updated visual-style guide — concise (4-8 lines) reusable cues only: colour palette, mood, ' +
        "lighting, composition/layout, photography-vs-illustration, typography vibe. Keep it authentic and brand-appropriate. }";
      const res = await invokeLLM({
        model: "deepseek-v4-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ currentVisualStyle: kit?.visualStyle || "", instruction: input.message || "", referenceAnalysis: refAnalysis }) },
        ],
      });
      const content = res.choices?.[0]?.message?.content;
      let parsed: any = {};
      try { parsed = JSON.parse(typeof content === "string" ? content : "{}"); } catch { /* keep */ }
      const visualStyle = typeof parsed.visualStyle === "string" ? parsed.visualStyle : (kit?.visualStyle || "");
      if (kit) await db.update(brandKit).set({ visualStyle }).where(eq(brandKit.id, kit.id));
      else await db.insert(brandKit).values({ visualStyle } as any);
      return { reply: typeof parsed.reply === "string" ? parsed.reply : "Updated the visual style.", visualStyle, referenceAnalyzed: !!refAnalysis };
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

      // Generate the background only; text + logo become editable layers the
      // team styles + exports in the studio. Best-effort (needs DEEPINFRA key).
      let imageError: string | null = null;
      const styleSuffix = kit?.visualStyle ? ` Visual style: ${kit.visualStyle}` : "";
      for (const s of slides) {
        const r = await renderBackground(s.imagePrompt + styleSuffix);
        s.backgroundUrl = r.url;
        s.imageUrl = r.url; // thumbnail = background
        s.layers = defaultLayers(s.headline, s.subheadline, kit);
        if (r.error && !imageError) imageError = r.error;
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

  /** Save manual edits to a draft (caption / hashtags / slide text). */
  updateContent: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      caption: z.string().max(8000).optional(),
      hashtags: z.string().max(2000).optional(),
      slides: z.array(z.object({
        headline: z.string().max(120),
        subheadline: z.string().max(200),
        imagePrompt: z.string().max(800),
        imageUrl: z.string().nullable().optional(),
        backgroundUrl: z.string().nullable().optional(),
        layers: z.array(z.any()).optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const patch: Record<string, unknown> = {};
      if (input.caption !== undefined) patch.caption = input.caption;
      if (input.hashtags !== undefined) patch.hashtags = input.hashtags;
      if (input.slides !== undefined) patch.slides = JSON.stringify(input.slides);
      if (Object.keys(patch).length) await db.update(sosmedContent).set(patch).where(eq(sosmedContent.id, input.id));
      return { ok: true };
    }),

  setStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(["draft", "approved", "scheduled", "posted"]) }))
    .mutation(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(sosmedContent).set({ status: input.status }).where(eq(sosmedContent.id, input.id));
      return { ok: true };
    }),

  /** Regenerate the image for one slide (optionally with new prompt/text). */
  regenerateImage: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      slideIndex: z.number().int().min(0),
      prompt: z.string().max(800).optional(),
      headline: z.string().max(120).optional(),
      subheadline: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(sosmedContent).where(eq(sosmedContent.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const slides = parseSlides(row.slides);
      const s = slides[input.slideIndex];
      if (!s) throw new TRPCError({ code: "BAD_REQUEST", message: "No such slide" });
      if (input.prompt !== undefined) s.imagePrompt = input.prompt;
      if (input.headline !== undefined) s.headline = input.headline;
      if (input.subheadline !== undefined) s.subheadline = input.subheadline;
      const [kitR] = await db.select({ visualStyle: brandKit.visualStyle }).from(brandKit).limit(1);
      const r = await renderBackground(s.imagePrompt + (kitR?.visualStyle ? ` Visual style: ${kitR.visualStyle}` : ""));
      s.backgroundUrl = r.url;
      s.imageUrl = r.url;
      await db.update(sosmedContent).set({ slides: JSON.stringify(slides) }).where(eq(sosmedContent.id, input.id));
      return { imageUrl: r.url, backgroundUrl: r.url, error: r.error ?? null };
    }),

  /** Brief the agent in chat — it edits the copy (caption/hashtags/slide text). */
  chatEditContent: protectedProcedure
    .input(z.object({ id: z.number().int(), message: z.string().min(1).max(1000) }))
    .mutation(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(sosmedContent).where(eq(sosmedContent.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const [kit] = await db.select().from(brandKit).limit(1);
      const slides = parseSlides(row.slides);

      const system =
        `You are the content editor for ${kit?.brandName || "SpecTa Education"}'s social team. ` +
        `TONE: ${kit?.toneOfVoice || "warm, professional, bilingual ID/EN"}. ` +
        `Given the CURRENT draft and the user's instruction, apply it and return STRICT JSON: ` +
        `{ "reply": short note on what you changed (1 sentence), ` +
        `"caption": the full updated caption, "hashtags": updated hashtags, ` +
        `"slides": array (same length, ${slides.length}) of { "headline", "subheadline" } updated as needed }. ` +
        `Only change what the instruction asks; keep everything else. If they ask about images, say so in "reply" ` +
        `(you can't change images here) and leave slide text as-is. Return ONLY JSON.`;
      const res = await invokeLLM({
        model: "deepseek-v4-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({
            instruction: input.message,
            current: { caption: row.caption, hashtags: row.hashtags, slides: slides.map(s => ({ headline: s.headline, subheadline: s.subheadline })) },
          }) },
        ],
      });
      const content = res.choices?.[0]?.message?.content;
      let parsed: any = {};
      try { parsed = JSON.parse(typeof content === "string" ? content : "{}"); } catch { /* keep */ }

      const newCaption = typeof parsed.caption === "string" ? parsed.caption : row.caption;
      const newHashtags = typeof parsed.hashtags === "string" ? parsed.hashtags : row.hashtags;
      if (Array.isArray(parsed.slides)) {
        parsed.slides.forEach((ps: any, i: number) => {
          if (slides[i]) {
            if (typeof ps?.headline === "string") slides[i].headline = ps.headline;
            if (typeof ps?.subheadline === "string") slides[i].subheadline = ps.subheadline;
          }
        });
      }
      // Keep the on-image text layers in sync with the edited copy.
      for (const s of slides) {
        if (Array.isArray(s.layers)) {
          for (const L of s.layers) {
            if (L.role === "headline") L.text = s.headline;
            else if (L.role === "subheadline") L.text = s.subheadline;
          }
        }
      }
      await db.update(sosmedContent).set({ caption: newCaption, hashtags: newHashtags, slides: JSON.stringify(slides) }).where(eq(sosmedContent.id, input.id));
      return { reply: typeof parsed.reply === "string" ? parsed.reply : "Updated.", caption: newCaption, hashtags: newHashtags, slides };
    }),
});
