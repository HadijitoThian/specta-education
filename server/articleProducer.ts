/**
 * Article Producer (SEO + GEO).
 *
 * The dormant agent system used to auto-write blog posts. This is the clean
 * rebuild: a single, self-contained module that writes search-engine AND
 * AI-assistant optimised articles for the SpecTa Education blog.
 *
 * GEO (Generative Engine Optimisation) tuning baked into every article:
 *  - A "Key takeaways" answer block at the top (LLMs quote these directly).
 *  - A real FAQ section (pairs with the server-side Article/FAQ schema).
 *  - Natural internal links to our money pages (/ielts, /destinations, etc.).
 *  - Bilingual (Indonesian-primary) voice matching the brand kit.
 *
 * Two entry points share one prompt + save path:
 *  - produceArticle()        — generate + save one post (manual "Produce now").
 *  - runScheduledProduction()— weekly, picks the next topic, saves a DRAFT for
 *                              the team to review before publishing.
 *
 * The scheduler is OFF unless ARTICLE_PRODUCER_ENABLED=true, so it never spends
 * LLM tokens or publishes anything without the owner opting in.
 */
import { invokeLLM } from "./_core/llm";
import {
  createBlogPost,
  getBlogPostBySlug,
  listBlogTags,
  createBlogTag,
  setPostTags,
  listPublishedBlogPosts,
} from "./db";

const BASE_URL = "https://www.spectaeducation.com";

// Internal links the AI is told to weave in naturally — our highest-value pages.
const INTERNAL_LINKS = [
  { url: "/ielts", anchor: "IELTS preparation" },
  { url: "/ielts/practice", anchor: "free IELTS practice test" },
  { url: "/destinations", anchor: "study abroad destinations" },
  { url: "/scholarships", anchor: "scholarships" },
  { url: "/play/aptitude", anchor: "Tes Bakat AI" },
  { url: "/book", anchor: "free consultation" },
  { url: "/contact", anchor: "contact SpecTa Education" },
];

// Curated evergreen topic bank for the weekly scheduler. Rotated by post count
// so we don't repeat until the list is exhausted. Real topics + keywords.
export const ARTICLE_TOPIC_BANK: { topic: string; keyword: string }[] = [
  { topic: "Panduan lengkap kuliah di Australia untuk mahasiswa Indonesia 2026", keyword: "kuliah di Australia" },
  { topic: "Cara mendapatkan beasiswa 100% kuliah di China (CSC Scholarship)", keyword: "beasiswa China" },
  { topic: "Tips meningkatkan skor IELTS dari band 5.0 ke 7.0", keyword: "tips IELTS band 7" },
  { topic: "Biaya kuliah di luar negeri: perbandingan 10 negara untuk pelajar Indonesia", keyword: "biaya kuliah luar negeri" },
  { topic: "Cara memilih jurusan kuliah yang tepat dengan tes bakat AI", keyword: "memilih jurusan kuliah" },
  { topic: "Panduan visa pelajar UK untuk mahasiswa Indonesia langkah demi langkah", keyword: "visa pelajar UK" },
  { topic: "5 kesalahan umum saat mendaftar universitas luar negeri dan cara menghindarinya", keyword: "daftar universitas luar negeri" },
  { topic: "Kuliah di Singapura vs Malaysia: mana yang cocok untuk kamu?", keyword: "kuliah di Singapura" },
  { topic: "Apa itu IELTS Mock Test dan kenapa penting sebelum tes asli", keyword: "IELTS mock test" },
  { topic: "Persiapan kuliah ke luar negeri: timeline 12 bulan untuk siswa SMA", keyword: "persiapan kuliah luar negeri" },
  { topic: "Beasiswa LPDP 2026: syarat, tahapan, dan tips lolos seleksi", keyword: "beasiswa LPDP" },
  { topic: "Cara menulis personal statement yang memukau untuk aplikasi universitas", keyword: "personal statement universitas" },
];

export interface ProduceOptions {
  topic: string;
  targetKeyword?: string;
  tone?: string;
  language?: string;
  status?: "draft" | "published";
  authorId?: number;
  categoryId?: number;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  suggestedTags: string[];
}

/** Build the GEO + SEO generation prompt for a topic. */
function buildMessages(topic: string, keyword: string | undefined, tone: string, lang: string) {
  const linkList = INTERNAL_LINKS.map(l => `- "${l.anchor}" → ${l.url}`).join("\n");
  return [
    {
      role: "system" as const,
      content: `You are the senior content writer for SpecTa Education, Indonesia's trusted study-abroad consultant since 2005 (1000+ students placed, 200+ scholarships, offices in Jakarta & Tangerang). You write blog articles that rank on Google AND get cited by AI assistants (ChatGPT, Perplexity, Gemini, Claude).

Voice: ${tone}. Language: ${lang}. Warm, empowering, trustworthy, never pushy — parents are decision-makers too.

GEO + SEO rules (follow ALL):
1. Open the article body with a <div class="key-takeaways"><h2>Key Takeaways</h2><ul>…4-6 concise factual bullets…</ul></div> that directly answers the topic — AI assistants quote these.
2. Use semantic HTML: h2/h3 headings, short paragraphs, <ul>/<ol> lists. NO <h1> (the page supplies it). NO inline styles except the key-takeaways wrapper class.
3. Weave in 2-4 of these internal links naturally as <a href="…">anchor</a> where relevant:
${linkList}
4. End with an "FAQ" <h2> followed by 4-5 <h3> questions, each answered in 1-2 sentences (factual, quotable).
5. Be specific and truthful — real numbers, real steps. Never invent fake guarantees or statistics. Mention SpecTa Education's free consultation once near the end as a soft CTA.
6. Minimum 1200 words of genuinely useful content. Use the target keyword naturally 3-5 times.

Output MUST be valid JSON only.`,
    },
    {
      role: "user" as const,
      content: `Write a comprehensive, GEO-optimised blog article about: "${topic}"
${keyword ? `Primary SEO keyword: "${keyword}"` : ""}

Return JSON:
{
  "title": "SEO title including the keyword (max ~65 chars)",
  "slug": "url-friendly-slug-in-english",
  "excerpt": "2-3 sentence summary for preview cards and AI snippets",
  "metaTitle": "SEO meta title (max 60 chars)",
  "metaDescription": "SEO meta description (max 155 chars)",
  "content": "Full article as clean HTML following ALL the GEO rules above",
  "suggestedTags": ["3-5 short topical tags"]
}`,
    },
  ];
}

const ARTICLE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "blog_article",
    strict: true,
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        excerpt: { type: "string" },
        metaTitle: { type: "string" },
        metaDescription: { type: "string" },
        content: { type: "string" },
        suggestedTags: { type: "array", items: { type: "string" } },
      },
      required: ["title", "slug", "excerpt", "metaTitle", "metaDescription", "content", "suggestedTags"],
      additionalProperties: false,
    },
  },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `article-${Date.now()}`;
}

/** Make sure the slug is unique in the DB (append -2, -3, … if needed). */
async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await getBlogPostBySlug(slug);
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

/** Generate one article via the LLM (no DB write). */
export async function generateArticleContent(opts: ProduceOptions): Promise<GeneratedArticle> {
  const tone = opts.tone || "professional, warm and informative";
  const lang = opts.language || "bilingual (Indonesian primary, English secondary)";
  const res = await invokeLLM({
    messages: buildMessages(opts.topic, opts.targetKeyword, tone, lang),
    response_format: ARTICLE_SCHEMA,
  });
  const text = res.choices?.[0]?.message?.content as string | undefined;
  if (!text) throw new Error("Article generation returned no content");
  return JSON.parse(text) as GeneratedArticle;
}

/** Resolve tag names → tag IDs, creating any that don't exist yet. */
async function resolveTagIds(names: string[]): Promise<number[]> {
  if (!names.length) return [];
  const existing = await listBlogTags();
  const byName = new Map(existing.map(t => [t.name.toLowerCase(), t.id]));
  const ids: number[] = [];
  for (const raw of names.slice(0, 6)) {
    const name = raw.trim();
    if (!name) continue;
    const hit = byName.get(name.toLowerCase());
    if (hit) { ids.push(hit); continue; }
    const created = await createBlogTag({ name, slug: slugify(name) });
    if (created) { ids.push(created.id); byName.set(name.toLowerCase(), created.id); }
  }
  return ids;
}

/**
 * Generate AND persist an article. Returns the created post (or throws).
 * Defaults to "draft" so a human reviews before it goes live.
 */
export async function produceArticle(opts: ProduceOptions) {
  const article = await generateArticleContent(opts);
  const status = opts.status || "draft";
  const slug = await ensureUniqueSlug(slugify(article.slug || article.title));

  const post = await createBlogPost({
    title: article.title,
    slug,
    excerpt: article.excerpt,
    content: article.content,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    targetKeyword: opts.targetKeyword,
    categoryId: opts.categoryId,
    authorId: opts.authorId,
    status,
    publishedAt: status === "published" ? new Date() : undefined,
  });
  if (!post) throw new Error("Failed to save generated article");

  const tagIds = await resolveTagIds(article.suggestedTags);
  if (tagIds.length) await setPostTags(post.id, tagIds);

  console.log(`[ArticleProducer] ${status} created: "${article.title}" → ${BASE_URL}/blog/${slug}`);
  return { ...post, tags: article.suggestedTags, url: `${BASE_URL}/blog/${slug}` };
}

/** Pick the next topic from the bank, rotating by how many posts already exist. */
export async function pickNextTopic(): Promise<{ topic: string; keyword: string }> {
  try {
    const { total } = await listPublishedBlogPosts({ limit: 1 });
    return ARTICLE_TOPIC_BANK[total % ARTICLE_TOPIC_BANK.length];
  } catch {
    return ARTICLE_TOPIC_BANK[0];
  }
}

// ── Weekly scheduler ─────────────────────────────────────────────────────────
let started = false;
let lastRunWeek = "";

function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Produce one DRAFT for the current week (idempotent per week, per process). */
export async function runScheduledProduction(): Promise<void> {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // WIB
  const day = now.getUTCDay(); // 0=Sun
  const hour = now.getUTCHours();
  const week = isoWeek(now);
  // Every Tuesday from 08:00 WIB, once per week.
  if (day !== 2 || hour < 8 || lastRunWeek === week) return;
  lastRunWeek = week;
  try {
    const { topic, keyword } = await pickNextTopic();
    await produceArticle({ topic, targetKeyword: keyword, status: "draft" });
    console.log(`[ArticleProducer] weekly draft produced for ${week}: ${topic}`);
  } catch (e) {
    console.error("[ArticleProducer] weekly run failed:", (e as Error).message);
  }
}

export function startArticleProducerScheduler() {
  if (started) return;
  if (process.env.ARTICLE_PRODUCER_ENABLED !== "true") {
    console.log("[ArticleProducer] scheduler disabled (set ARTICLE_PRODUCER_ENABLED=true to enable weekly drafts).");
    return;
  }
  started = true;
  console.log("[ArticleProducer] weekly scheduler started (Tue 08:00 WIB → 1 review-ready draft).");
  setInterval(() => { void runScheduledProduction(); }, 30 * 60 * 1000);
  setTimeout(() => { void runScheduledProduction(); }, 60 * 1000);
}
