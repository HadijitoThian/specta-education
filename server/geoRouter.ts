/**
 * GEO — answer pages + FAQ + AI-referral analytics.
 *   public  `geo`        — pages for the site (/jawab, /answers, /faq)
 *   admin   `admin.geo`  — seed bank, generation, review/publish, analytics
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, gte, isNotNull } from "drizzle-orm";

import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { answerPages, visitorTracking } from "../drizzle/schema";
import { SEED_QUESTIONS, FAQ_ITEMS, CATEGORY_LABEL, type SeedQuestion } from "./geoSeeds";
import { generateAnswerPair, categoryOf, pagePath } from "./geoAnswers";

function assertAdmin(ctx: { user: { role: string } | null }) {
  if (!ctx.user || ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only." });
}

const LANG = z.enum(["id", "en"]);

// ── Background generation queue ──────────────────────────────────────────
// Generating a Bahasa + English pair takes 2–5 minutes — far longer than a
// web request may live — so the mutation only ENQUEUES; a single worker
// runs jobs one at a time (rate-limit friendly) and the admin page polls.
interface Job { key: string; label: string; status: "queued" | "running" | "done" | "error"; error?: string; startedAt?: number; finishedAt?: number; queuedAt: number; run: () => Promise<unknown> }
const jobs = new Map<string, Job>();
let workerBusy = false;

async function pumpQueue(): Promise<void> {
  if (workerBusy) return;
  const next = Array.from(jobs.values()).filter(j => j.status === "queued").sort((a, b) => a.queuedAt - b.queuedAt)[0];
  if (!next) return;
  workerBusy = true;
  next.status = "running"; next.startedAt = Date.now();
  try {
    await next.run();
    next.status = "done";
  } catch (e) {
    next.status = "error"; next.error = String((e as Error)?.message || e).slice(0, 400);
    console.error(`[GEO] job ${next.key} failed:`, next.error);
  } finally {
    next.finishedAt = Date.now();
    workerBusy = false;
    // Forget finished jobs after an hour.
    for (const [k, j] of Array.from(jobs.entries())) if (j.finishedAt && Date.now() - j.finishedAt > 3600000) jobs.delete(k);
    void pumpQueue();
  }
}

function enqueue(key: string, label: string, run: () => Promise<unknown>): { started: boolean; reason?: string } {
  const existing = jobs.get(key);
  if (existing && (existing.status === "queued" || existing.status === "running")) return { started: false, reason: "already " + existing.status };
  jobs.set(key, { key, label, status: "queued", queuedAt: Date.now(), run });
  void pumpQueue();
  return { started: true };
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 120);
}

const light = (p: typeof answerPages.$inferSelect) => ({
  id: p.id, slug: p.slug, lang: p.lang, questionKey: p.questionKey, pairSlug: p.pairSlug, category: p.category,
  question: p.question, directAnswer: p.directAnswer, status: p.status,
  publishedAt: p.publishedAt, lastReviewedAt: p.lastReviewedAt, updatedAt: p.updatedAt, path: pagePath(p),
});

/** Hosts that identify AI-assistant referrals. Google AI Overviews arrive as
 *  plain google.com and cannot be separated from organic search. */
const AI_HOSTS: Array<[RegExp, string]> = [
  [/chatgpt\.com|chat\.openai\.com|openai\.com/i, "ChatGPT"],
  [/perplexity\.ai/i, "Perplexity"],
  [/gemini\.google\.com|bard\.google\.com/i, "Gemini"],
  [/copilot\.microsoft\.com|bing\.com\/chat|edgeservices\.bing/i, "Copilot"],
  [/claude\.ai/i, "Claude"],
  [/you\.com/i, "You.com"],
  [/meta\.ai/i, "Meta AI"],
  [/grok\.com|x\.ai/i, "Grok"],
  [/duckduckgo\.com\/.*ai|duck\.ai/i, "DuckDuckGo AI"],
];

export const geoRouter = router({
  faq: publicProcedure.query(() => FAQ_ITEMS),
  categories: publicProcedure.query(() => CATEGORY_LABEL),

  listAnswers: publicProcedure
    .input(z.object({ lang: LANG, category: z.string().max(40).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const where = input.category
        ? and(eq(answerPages.status, "published"), eq(answerPages.lang, input.lang), eq(answerPages.category, input.category))
        : and(eq(answerPages.status, "published"), eq(answerPages.lang, input.lang));
      const rows = await db.select().from(answerPages).where(where).orderBy(desc(answerPages.publishedAt));
      return rows.map(light);
    }),

  getAnswer: publicProcedure
    .input(z.object({ lang: LANG, slug: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [p] = await db.select().from(answerPages)
        .where(and(eq(answerPages.slug, input.slug), eq(answerPages.lang, input.lang), eq(answerPages.status, "published"))).limit(1);
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Answer not found." });
      const related = await db.select().from(answerPages)
        .where(and(eq(answerPages.status, "published"), eq(answerPages.lang, input.lang), eq(answerPages.category, p.category)))
        .orderBy(desc(answerPages.publishedAt)).limit(6);
      return { page: p, related: related.filter(r => r.id !== p.id).slice(0, 5).map(light) };
    }),
});

export const geoAdminRouter = router({
  /** The seed bank with what exists per language. */
  seeds: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(answerPages);
    const byKey = new Map<string, { id?: typeof rows[number]; en?: typeof rows[number] }>();
    for (const r of rows) {
      const e = byKey.get(r.questionKey) || {};
      (e as any)[r.lang] = r;
      byKey.set(r.questionKey, e);
    }
    return SEED_QUESTIONS.map(s => {
      const e = byKey.get(s.key) || {};
      return {
        key: s.key, category: s.category, questionId: s.id.question, questionEn: s.en.question,
        id: e.id ? { pageId: e.id.id, status: e.id.status } : null,
        en: e.en ? { pageId: e.en.id, status: e.en.status } : null,
      };
    });
  }),

  /** Generate (or regenerate) the Bahasa + English pair for a seed key. */
  generate: protectedProcedure
    .input(z.object({ key: z.string().min(1).max(120) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const seed = SEED_QUESTIONS.find(s => s.key === input.key);
      if (!seed) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown seed key." });
      return enqueue(seed.key, seed.en.question, () => generateAndStore(seed));
    }),

  /** Status of background generation jobs (the admin page polls this). */
  jobs: protectedProcedure.query(({ ctx }) => {
    assertAdmin(ctx);
    return Array.from(jobs.values()).map(j => ({ key: j.key, label: j.label, status: j.status, error: j.error, startedAt: j.startedAt, finishedAt: j.finishedAt, queuedAt: j.queuedAt }));
  }),

  /** Generate a pair for a custom question (not in the seed bank). */
  generateCustom: protectedProcedure
    .input(z.object({ questionId: z.string().min(8).max(500), questionEn: z.string().min(8).max(500), category: z.string().max(40) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const key = `custom-${slugify(input.questionEn).slice(0, 60)}-${Date.now().toString(36)}`;
      const seed: SeedQuestion = {
        key, category: categoryOf(input.category),
        id: { question: input.questionId.trim(), slug: slugify(input.questionId) },
        en: { question: input.questionEn.trim(), slug: slugify(input.questionEn) },
      };
      return enqueue(seed.key, seed.en.question, () => generateAndStore(seed));
    }),

  list: protectedProcedure
    .input(z.object({ status: z.enum(["draft", "published", "archived"]).optional() }).optional())
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = input?.status
        ? await db.select().from(answerPages).where(eq(answerPages.status, input.status)).orderBy(desc(answerPages.updatedAt))
        : await db.select().from(answerPages).orderBy(desc(answerPages.updatedAt));
      return rows.map(light);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [p] = await db.select().from(answerPages).where(eq(answerPages.id, input.id)).limit(1);
      if (!p) throw new TRPCError({ code: "NOT_FOUND" });
      return p;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      question: z.string().min(5).max(500).optional(),
      directAnswer: z.string().min(20).max(2000).optional(),
      metaTitle: z.string().max(255).optional(),
      metaDescription: z.string().max(400).optional(),
      keywords: z.string().max(600).optional(),
      content: z.any().optional(),
      sources: z.array(z.object({ title: z.string().max(200), url: z.string().url().max(500) })).max(10).optional(),
      verifyNotes: z.string().max(4000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...fields } = input;
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) if (v !== undefined) patch[k] = v;
      patch.lastReviewedAt = new Date();
      await db.update(answerPages).set(patch).where(eq(answerPages.id, id));
      return { ok: true };
    }),

  setStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(["draft", "published", "archived"]) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [p] = await db.select().from(answerPages).where(eq(answerPages.id, input.id)).limit(1);
      if (!p) throw new TRPCError({ code: "NOT_FOUND" });
      const now = new Date();
      await db.update(answerPages).set({
        status: input.status,
        ...(input.status === "published" ? { publishedAt: p.publishedAt ?? now, lastReviewedAt: now } : {}),
      }).where(eq(answerPages.id, input.id));
      return { ok: true };
    }),

  /** AI-assistant referrals from visitor tracking. */
  aiReferrals: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }).optional())
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 86400000);
      const rows = await db.select({ referrerUrl: visitorTracking.referrerUrl, pagesVisited: visitorTracking.pagesVisited, convertedToLead: visitorTracking.convertedToLead })
        .from(visitorTracking)
        .where(and(gte(visitorTracking.firstVisitAt, since), isNotNull(visitorTracking.referrerUrl)))
        .limit(50000);
      const bySource = new Map<string, { sessions: number; leads: number; pages: Map<string, number> }>();
      let total = 0;
      for (const r of rows) {
        const ref = String(r.referrerUrl || "");
        const hit = AI_HOSTS.find(([re]) => re.test(ref));
        if (!hit) continue;
        total++;
        const e = bySource.get(hit[1]) || { sessions: 0, leads: 0, pages: new Map() };
        e.sessions++;
        if (r.convertedToLead) e.leads++;
        try {
          const pages: string[] = JSON.parse(String(r.pagesVisited || "[]"));
          const first = pages[0];
          if (first) e.pages.set(first, (e.pages.get(first) || 0) + 1);
        } catch { /* */ }
        bySource.set(hit[1], e);
      }
      return {
        days, totalAiSessions: total, totalSessionsWithReferrer: rows.length,
        sources: Array.from(bySource.entries()).map(([source, e]) => ({
          source, sessions: e.sessions, leads: e.leads,
          topLandingPages: Array.from(e.pages.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, n]) => ({ page, n })),
        })).sort((a, b) => b.sessions - a.sessions),
      };
    }),
});

async function generateAndStore(seed: SeedQuestion) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  let pair;
  try {
    pair = await generateAnswerPair(seed);
  } catch (e) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Generation failed: ${(e as Error).message}` });
  }
  const ids: Record<"id" | "en", number> = { id: 0, en: 0 };
  for (const lang of ["id", "en"] as const) {
    const g = pair[lang];
    const slug = seed[lang].slug;
    const pairSlug = seed[lang === "id" ? "en" : "id"].slug;
    const [existing] = await db.select().from(answerPages).where(and(eq(answerPages.questionKey, seed.key), eq(answerPages.lang, lang))).limit(1);
    const values = {
      slug, lang, questionKey: seed.key, pairSlug, category: seed.category,
      question: g.question, directAnswer: g.directAnswer, content: g.content, sources: g.sources,
      verifyNotes: g.verifyNotes, metaTitle: g.metaTitle, metaDescription: g.metaDescription, keywords: g.keywords,
    };
    if (existing) {
      // Regeneration: keep a published page live but replace its text as a fresh draft only if it was a draft.
      if (existing.status === "draft") {
        await db.update(answerPages).set(values).where(eq(answerPages.id, existing.id));
      } else {
        await db.update(answerPages).set({ ...values, status: "draft" }).where(eq(answerPages.id, existing.id));
      }
      ids[lang] = existing.id;
    } else {
      const res = await db.insert(answerPages).values({ ...values, status: "draft" });
      ids[lang] = Number((res as any)[0]?.insertId || 0);
    }
  }
  return { ok: true, ids, verifyNotes: pair.id.verifyNotes };
}
