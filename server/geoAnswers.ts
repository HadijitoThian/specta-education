/**
 * GEO answer pages — generation, validation, HTML rendering and JSON-LD.
 *
 * A page is a structured JSON document (not free HTML) so it renders
 * deterministically both for crawlers (server-side, in the pre-render
 * container) and for humans (React). Shape:
 *   { intro?, sections[{heading, paragraphs[], bullets?[]}],
 *     facts[{label, value, note?}], faqs[{question, answer}],
 *     keyTakeaways[], cta? }
 *
 * The generator is grounded on geoSeeds.GROUNDING_FACTS and must flag every
 * number the reviewer should re-check. Nothing is published without a human.
 */

import { invokeLLM, invokeLLMFallback } from "./_core/llm";
import { SPECTA_FACTS, GROUNDING_FACTS, CATEGORY_LABEL, type AnswerCategory, type SeedQuestion } from "./geoSeeds";
import type { AnswerPage } from "../drizzle/schema";

export interface AnswerContent {
  intro?: string;
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
  facts: Array<{ label: string; value: string; note?: string }>;
  faqs: Array<{ question: string; answer: string }>;
  keyTakeaways: string[];
  cta?: { text: string; href: string };
}

export interface GeneratedAnswer {
  question: string;
  directAnswer: string;
  content: AnswerContent;
  sources: Array<{ title: string; url: string }>;
  verifyNotes: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

const BASE_URL = "https://www.spectaeducation.com";

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms))]);
}

function parseLooseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* extract */ }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no JSON object in LLM output");
  return JSON.parse(text.slice(a, b + 1));
}

function buildPrompt(seed: SeedQuestion, lang: "id" | "en", reference?: GeneratedAnswer): string {
  const q = seed[lang].question;
  const langName = lang === "id" ? "Bahasa Indonesia (natural, clear, for students and parents)" : "English (clear, international)";
  const ref = reference
    ? `\nREFERENCE (the ${lang === "en" ? "Bahasa" : "English"} twin of this page — keep every fact and number IDENTICAL; adapt wording, do not translate word-for-word):\n${JSON.stringify({ directAnswer: reference.directAnswer, facts: reference.content.facts, keyTakeaways: reference.content.keyTakeaways, sources: reference.sources }, null, 0)}\n`
    : "";
  return `You write answer pages for SpecTa Education that AI search engines (ChatGPT, Perplexity, Google AI Overviews) will cite. Write in ${langName}.

THE QUESTION (this is the page title): ${q}
CATEGORY: ${CATEGORY_LABEL[seed.category][lang]}
AUDIENCE: Indonesian high-school students, undergraduates and their parents planning to study abroad.
${ref}
ABOUT SPECTA (use naturally, never as the main subject unless the question is about SpecTa):
${SPECTA_FACTS}

GROUNDING FACTS (use these; do NOT invent other numbers; keep ranges as ranges; anything marked [verify] must appear in verifyNotes):
${GROUNDING_FACTS}

WRITE FOR CITATION:
- Start with a DIRECT ANSWER of 40–70 words that fully answers the question with the key numbers. AI engines lift this paragraph.
- Then 3–5 sections, each with a specific heading and 1–3 short paragraphs (max ~90 words each); use bullets for lists. Every claim concrete.
- A facts table of 4–8 rows: label, value (with currency/year), optional note.
- 3–5 FAQs that a student would ask next, each answered in 1–3 sentences.
- 3–5 key takeaways, one line each.
- Mention the year 2026 where facts are time-bound. Present uncertain numbers as ranges and say they change.
- One CTA to SpecTa: the most relevant of /book (free consultation), /ielts/mock-test, /ielts/tutor, /scholarships, /destinations/<country>, /play/aptitude, /compare.
- No fluff, no marketing adjectives, no "in today's world". Facts first.

SOURCES: list 3–6 authoritative sources with real URLs you are confident exist: official government sites (immi.homeaffairs.gov.au, gov.uk, canada.ca, educationmalaysia.gov.my), ielts.org, lpdp.kemenkeu.go.id, australiaawardsindonesia.org, chevening.org, official university pages. Do not invent deep links; prefer the site's main relevant page.

Return JSON ONLY:
{
  "directAnswer": "...",
  "content": {
    "intro": "optional 1–2 sentence context",
    "sections": [{ "heading": "...", "paragraphs": ["..."], "bullets": ["..."] }],
    "facts": [{ "label": "...", "value": "...", "note": "..." }],
    "faqs": [{ "question": "...", "answer": "..." }],
    "keyTakeaways": ["..."],
    "cta": { "text": "...", "href": "/book" }
  },
  "sources": [{ "title": "...", "url": "https://..." }],
  "verifyNotes": "bullet list of the numbers/dates a human must re-check before publishing, with what to check",
  "metaTitle": "≤ 60 chars, includes the year if time-bound, ends with | SpecTa Education",
  "metaDescription": "140–160 chars, the direct answer condensed",
  "keywords": "6–10 comma-separated search phrases in the page language"
}`;
}

function normalize(seed: SeedQuestion, lang: "id" | "en", raw: any): GeneratedAnswer {
  const str = (v: any, max = 5000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  const c = raw?.content || {};
  const content: AnswerContent = {
    intro: str(c.intro, 600) || undefined,
    sections: arr(c.sections).slice(0, 8).map((s: any) => ({
      heading: str(s?.heading, 160),
      paragraphs: arr(s?.paragraphs).map((p: any) => str(p, 1200)).filter(Boolean).slice(0, 5),
      bullets: arr(s?.bullets).map((b: any) => str(b, 400)).filter(Boolean).slice(0, 12),
    })).filter((s: any) => s.heading && (s.paragraphs.length || s.bullets.length)),
    facts: arr(c.facts).slice(0, 12).map((f: any) => ({ label: str(f?.label, 120), value: str(f?.value, 200), note: str(f?.note, 300) || undefined })).filter((f: any) => f.label && f.value),
    faqs: arr(c.faqs).slice(0, 8).map((f: any) => ({ question: str(f?.question, 300), answer: str(f?.answer, 900) })).filter((f: any) => f.question && f.answer),
    keyTakeaways: arr(c.keyTakeaways).map((t: any) => str(t, 300)).filter(Boolean).slice(0, 6),
    cta: c.cta && str(c.cta.href, 200).startsWith("/") ? { text: str(c.cta.text, 120) || (lang === "id" ? "Konsultasi gratis dengan SpecTa" : "Free consultation with SpecTa"), href: str(c.cta.href, 200) } : { text: lang === "id" ? "Konsultasi gratis dengan SpecTa" : "Free consultation with SpecTa", href: "/book" },
  };
  const directAnswer = str(raw?.directAnswer, 1200);
  if (!directAnswer || content.sections.length < 2) throw new Error("generated page too thin");
  return {
    question: seed[lang].question,
    directAnswer,
    content,
    sources: arr(raw?.sources).slice(0, 8).map((s: any) => ({ title: str(s?.title, 200), url: str(s?.url, 500) })).filter((s: any) => /^https?:\/\//.test(s.url)),
    verifyNotes: str(raw?.verifyNotes, 3000),
    metaTitle: str(raw?.metaTitle, 120) || `${seed[lang].question} | SpecTa Education`,
    metaDescription: str(raw?.metaDescription, 320) || directAnswer.slice(0, 158),
    keywords: str(raw?.keywords, 400),
  };
}

async function callLLM(prompt: string): Promise<any> {
  const messages = [
    { role: "system" as const, content: "You are a meticulous education writer. Output valid JSON only." },
    { role: "user" as const, content: prompt },
  ];
  try {
    const res = await withTimeout(invokeLLM({ model: "deepseek-v4-pro", messages, response_format: { type: "json_object" }, max_tokens: 7000 }), 110000, "DeepSeek");
    const t = res.choices?.[0]?.message?.content;
    if (typeof t === "string" && t) return parseLooseJson(t);
  } catch (e) {
    console.warn("[GEO] DeepSeek generation failed:", (e as Error).message);
  }
  const res = await withTimeout(invokeLLMFallback({ messages, response_format: { type: "json_object" } }), 110000, "GLM");
  const t = res.choices?.[0]?.message?.content;
  if (typeof t !== "string" || !t) throw new Error("no LLM content");
  return parseLooseJson(t);
}

/** Generate the Bahasa page first, then the English twin from it. */
export async function generateAnswerPair(seed: SeedQuestion): Promise<{ id: GeneratedAnswer; en: GeneratedAnswer }> {
  const idRaw = await callLLM(buildPrompt(seed, "id"));
  const id = normalize(seed, "id", idRaw);
  const enRaw = await callLLM(buildPrompt(seed, "en", id));
  const en = normalize(seed, "en", enRaw);
  return { id, en };
}

// ── Rendering (server-side, for crawlers) ─────────────────────────────────

const esc = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function pagePath(p: Pick<AnswerPage, "lang" | "slug">): string {
  return `/${p.lang === "id" ? "jawab" : "answers"}/${p.slug}`;
}

/** Readable HTML for the pre-render container. Plain semantic markup. */
export function renderAnswerHtml(p: AnswerPage): string {
  const c = p.content as AnswerContent;
  const lang = p.lang;
  const updated = (p.lastReviewedAt || p.publishedAt || p.updatedAt) as Date;
  const updatedStr = updated ? new Date(updated).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { year: "numeric", month: "long", day: "numeric" }) : "";
  const t = lang === "id"
    ? { updated: "Diperbarui", facts: "Fakta penting", faq: "Pertanyaan terkait", takeaways: "Intinya", sources: "Sumber", twin: "Read this in English" }
    : { updated: "Updated", facts: "Key facts", faq: "Related questions", takeaways: "Key takeaways", sources: "Sources", twin: "Baca dalam Bahasa Indonesia" };
  const twinHref = p.pairSlug ? `/${lang === "id" ? "answers" : "jawab"}/${p.pairSlug}` : null;
  const parts: string[] = [];
  parts.push(`<article lang="${lang}">`);
  parts.push(`<p><small>${esc(t.updated)}: ${esc(updatedStr)} · SpecTa Education</small></p>`);
  parts.push(`<h1>${esc(p.question)}</h1>`);
  parts.push(`<p><strong>${esc(p.directAnswer)}</strong></p>`);
  if (c.intro) parts.push(`<p>${esc(c.intro)}</p>`);
  if (c.facts?.length) {
    parts.push(`<h2>${esc(t.facts)}</h2><table><tbody>`);
    for (const f of c.facts) parts.push(`<tr><th scope="row">${esc(f.label)}</th><td>${esc(f.value)}${f.note ? ` <small>(${esc(f.note)})</small>` : ""}</td></tr>`);
    parts.push(`</tbody></table>`);
  }
  for (const s of c.sections || []) {
    parts.push(`<h2>${esc(s.heading)}</h2>`);
    for (const para of s.paragraphs || []) parts.push(`<p>${esc(para)}</p>`);
    if (s.bullets?.length) parts.push(`<ul>${s.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>`);
  }
  if (c.keyTakeaways?.length) parts.push(`<h2>${esc(t.takeaways)}</h2><ul>${c.keyTakeaways.map(k => `<li>${esc(k)}</li>`).join("")}</ul>`);
  if (c.faqs?.length) {
    parts.push(`<h2>${esc(t.faq)}</h2>`);
    for (const f of c.faqs) parts.push(`<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`);
  }
  const sources = (p.sources as Array<{ title: string; url: string }>) || [];
  if (sources.length) parts.push(`<h2>${esc(t.sources)}</h2><ul>${sources.map(s => `<li><a href="${esc(s.url)}" rel="nofollow noopener">${esc(s.title)}</a></li>`).join("")}</ul>`);
  if (c.cta) parts.push(`<p><a href="${esc(c.cta.href)}">${esc(c.cta.text)}</a></p>`);
  if (twinHref) parts.push(`<p><a href="${esc(twinHref)}">${esc(t.twin)}</a></p>`);
  parts.push(`</article>`);
  return parts.join("\n");
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SpecTa Education",
    url: BASE_URL,
    foundingDate: "2005",
    description: "Indonesian study-abroad consultancy since 2005: university applications, visas, scholarships and IELTS preparation for Indonesian students.",
    areaServed: "ID",
    address: [
      { "@type": "PostalAddress", addressLocality: "Kelapa Gading, Jakarta", addressCountry: "ID" },
      { "@type": "PostalAddress", addressLocality: "Pantai Indah Kapuk, Jakarta", addressCountry: "ID" },
      { "@type": "PostalAddress", addressLocality: "Gading Serpong, Tangerang", addressCountry: "ID" },
    ],
    contactPoint: { "@type": "ContactPoint", telephone: "+62-818-218-388", contactType: "customer service", availableLanguage: ["id", "en"] },
  };
}

export function answerJsonLd(p: AnswerPage): Record<string, unknown>[] {
  const c = p.content as AnswerContent;
  const url = `${BASE_URL}${pagePath(p)}`;
  const modified = new Date((p.lastReviewedAt || p.updatedAt) as Date).toISOString();
  const published = new Date((p.publishedAt || p.createdAt) as Date).toISOString();
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.question,
    description: p.directAnswer,
    inLanguage: p.lang,
    datePublished: published,
    dateModified: modified,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "SpecTa Education", url: BASE_URL },
    publisher: { "@type": "Organization", name: "SpecTa Education", url: BASE_URL },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: p.question, acceptedAnswer: { "@type": "Answer", text: p.directAnswer } },
      ...(c.faqs || []).map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    ],
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "SpecTa Education", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: p.lang === "id" ? "Jawab" : "Answers", item: `${BASE_URL}/${p.lang === "id" ? "jawab" : "answers"}` },
      { "@type": "ListItem", position: 3, name: p.question, item: url },
    ],
  };
  return [article, faq, crumbs, organizationJsonLd()];
}

export function faqPageJsonLd(items: Array<{ question: string; answer: string }>): Record<string, unknown>[] {
  return [
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) },
    organizationJsonLd(),
  ];
}

export function categoryOf(v: string): AnswerCategory {
  return (Object.keys(CATEGORY_LABEL) as AnswerCategory[]).includes(v as AnswerCategory) ? (v as AnswerCategory) : "proses";
}
