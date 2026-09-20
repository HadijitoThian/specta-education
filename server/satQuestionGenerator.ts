/**
 * SpecTa SAT Self-Prep — AI content generation with verification.
 *
 *   generateQuestions(skill, difficulty, count, format)
 *     → drafts items to the Digital SAT blueprint (own content, never College
 *       Board material), then BLIND-SOLVES each item with a second model and
 *       records whether the answer keys agree. Everything is stored as a
 *       DRAFT for admin approval; nothing reaches students unapproved.
 *   generateLesson(skill) → a compact two-language lesson (draft).
 *
 * All calls are time-bounded with a fast-model fallback.
 */

import { invokeLLM, invokeLLMFallback } from "./_core/llm";
import { SECTION_STYLE } from "./satSkills";
import type { SatSkill } from "../drizzle/schema";
import { parseNumeric } from "./satEngine";

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms))]);
}
function extractJson(text: string): any {
  try { return JSON.parse(text); } catch { /* */ }
  const a = text.search(/[\[{]/);
  const b = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
  if (a < 0 || b <= a) throw new Error("no JSON in LLM output");
  return JSON.parse(text.slice(a, b + 1));
}
async function llm(messages: Array<{ role: "system" | "user"; content: string }>, opts: { model?: string; maxTokens?: number; timeoutMs?: number } = {}): Promise<string> {
  const attempts: Array<() => Promise<any>> = [
    () => withTimeout(invokeLLM({ model: opts.model || "deepseek-v4-pro", messages, response_format: { type: "json_object" }, max_tokens: opts.maxTokens || 6000 }), opts.timeoutMs || 180000, "DeepSeek"),
    () => withTimeout(invokeLLM({ model: "deepseek-v4-flash", messages, response_format: { type: "json_object" }, max_tokens: opts.maxTokens || 6000 }), 120000, "DeepSeek flash"),
    () => withTimeout(invokeLLMFallback({ messages, response_format: { type: "json_object" } }), 150000, "GLM"),
  ];
  let last = "";
  for (const run of attempts) {
    try {
      const res = await run();
      const t = res.choices?.[0]?.message?.content;
      if (typeof t === "string" && t) return t;
      last = "empty";
    } catch (e) { last = (e as Error).message; console.warn("[SAT gen] attempt failed:", last); }
  }
  throw new Error(last || "LLM failed");
}

export interface DraftQuestion {
  passage: string | null; stem: string; format: "mc" | "spr"; choices: string[] | null;
  answer: string; acceptedAnswers: string[]; explanationEn: string; explanationId: string;
  distractorNotes: Record<string, string> | null;
  checks: { blindSolveAgrees: boolean | null; blindAnswer: string | null; model: string; notes?: string };
}

const DIFF_LABEL: Record<number, string> = { 1: "easy (Module 1 / easier Module 2 level)", 2: "medium", 3: "hard (harder Module 2 level — subtle, multi-step)" };

export async function generateQuestions(skill: SatSkill, difficulty: 1 | 2 | 3, count: number, format?: "mc" | "spr"): Promise<DraftQuestion[]> {
  const fmtRule = skill.section === "math"
    ? (format ? `All items must be format "${format}".` : `About 3 in 4 items multiple choice ("mc"), the rest student-produced response ("spr").`)
    : `All items are multiple choice ("mc") with four choices.`;
  const prompt = `You write ORIGINAL practice items for the Digital SAT. Never reproduce, adapt or paraphrase College Board, Khan Academy or any published test item — invent fresh passages, numbers and contexts.

SECTION: ${skill.section === "rw" ? "Reading and Writing" : "Math"}
DOMAIN: ${skill.domain}
SKILL: ${skill.code} — ${skill.title}
WHAT THE SKILL TESTS: ${skill.outcomes}
DIFFICULTY: ${DIFF_LABEL[difficulty]}
COUNT: ${count}
${fmtRule}

STYLE RULES:
${SECTION_STYLE[skill.section]}

QUALITY RULES:
- Exactly ONE correct answer. Each distractor wrong for a specific, nameable reason.
- The stem must be answerable from the passage/problem alone. No trivia.
- Vary contexts across items (different topics, names, numbers). No two items alike.
- For "spr": "answer" is the exact numeric answer; "acceptedAnswers" lists equivalent forms (e.g. "0.5", "1/2", ".5").
- Explanations: "explanationEn" = 3–6 sentences, teach the method and why the right answer is right; "explanationId" = the same in natural Bahasa Indonesia (keep technical English terms).
- "distractorNotes" (mc only): one short line per wrong letter explaining the error it represents.

Return JSON ONLY: { "items": [ { "passage": "..." or null, "stem": "...", "format": "mc"|"spr", "choices": ["...","...","...","..."] or null, "answer": "B" or "12", "acceptedAnswers": [], "explanationEn": "...", "explanationId": "...", "distractorNotes": { "A": "...", "C": "...", "D": "..." } or null } ] }`;

  const raw = await llm([{ role: "system", content: "You are an expert Digital SAT item writer. Output valid JSON only." }, { role: "user", content: prompt }]);
  const parsed = extractJson(raw);
  const items: any[] = Array.isArray(parsed) ? parsed : (parsed?.items || []);
  const drafts: DraftQuestion[] = [];
  for (const it of items.slice(0, count)) {
    const fmt: "mc" | "spr" = it?.format === "spr" ? "spr" : "mc";
    const choices = fmt === "mc" ? (Array.isArray(it?.choices) ? it.choices.map((c: any) => String(c).trim()).slice(0, 4) : null) : null;
    const answer = String(it?.answer ?? "").trim();
    const stem = String(it?.stem ?? "").trim();
    if (!stem || !answer || (fmt === "mc" && (!choices || choices.length !== 4 || !/^[A-D]$/i.test(answer)))) continue;
    const d: DraftQuestion = {
      passage: it?.passage ? String(it.passage).trim() : null,
      stem, format: fmt, choices,
      answer: fmt === "mc" ? answer.toUpperCase() : answer,
      acceptedAnswers: Array.isArray(it?.acceptedAnswers) ? it.acceptedAnswers.map(String) : [],
      explanationEn: String(it?.explanationEn ?? "").trim(),
      explanationId: String(it?.explanationId ?? "").trim(),
      distractorNotes: fmt === "mc" && it?.distractorNotes && typeof it.distractorNotes === "object" ? it.distractorNotes : null,
      checks: { blindSolveAgrees: null, blindAnswer: null, model: "deepseek-v4-pro" },
    };
    if (!d.explanationEn) continue;
    drafts.push(d);
  }
  // Blind-solve every draft with a different call (no answer shown).
  for (const d of drafts) {
    try {
      const ans = await blindSolve(d);
      d.checks.blindAnswer = ans;
      d.checks.blindSolveAgrees = agrees(d, ans);
    } catch (e) {
      d.checks.notes = `blind solve failed: ${(e as Error).message}`;
    }
  }
  return drafts;
}

async function blindSolve(d: DraftQuestion): Promise<string> {
  const q = `${d.passage ? `PASSAGE / SETUP:\n${d.passage}\n\n` : ""}QUESTION:\n${d.stem}${d.choices ? `\n\nCHOICES:\n${d.choices.map((c, i) => `${"ABCD"[i]}. ${c}`).join("\n")}` : ""}`;
  const prompt = `Solve this Digital SAT item carefully. Show nothing but the final answer in JSON.
${q}

Return JSON ONLY: { "answer": "${d.choices ? "the letter A, B, C or D" : "the numeric answer"}" }`;
  const raw = await llm([{ role: "system", content: "You are a meticulous SAT solver. Output valid JSON only." }, { role: "user", content: prompt }], { model: "deepseek-v4-flash", maxTokens: 400, timeoutMs: 90000 });
  const parsed = extractJson(raw);
  return String(parsed?.answer ?? "").trim();
}

function agrees(d: DraftQuestion, blind: string): boolean {
  if (d.format === "mc") return blind.toUpperCase().replace(/[^A-D]/g, "").slice(0, 1) === d.answer;
  const b = parseNumeric(blind), a = parseNumeric(d.answer);
  if (b !== null && a !== null) return Math.abs(a - b) <= Math.max(1e-6, Math.abs(a) * 1e-4);
  return blind.replace(/\s+/g, "").toLowerCase() === d.answer.replace(/\s+/g, "").toLowerCase();
}

// ── Lessons ───────────────────────────────────────────────────────────────
export interface Lesson { summary: string; rule: string; steps: string[]; example: { question: string; solution: string }; trap: string; quickCheck: { question: string; answer: string } }

export async function generateLesson(skill: SatSkill): Promise<{ en: Lesson; id: Lesson }> {
  const base = `Write a compact self-study lesson for one Digital SAT skill. Audience: Indonesian high-school students preparing alone at home. Tight, concrete, no fluff.

SECTION: ${skill.section === "rw" ? "Reading and Writing" : "Math"} · DOMAIN: ${skill.domain}
SKILL: ${skill.code} — ${skill.title}
WHAT IT TESTS: ${skill.outcomes}

Return JSON ONLY:
{
  "summary": "2 sentences: what this skill is and how the SAT tests it",
  "rule": "the core rule/method in 3–5 sentences",
  "steps": ["4–6 short steps to attack this question type"],
  "example": { "question": "one original SAT-style item (with choices if MC)", "solution": "worked solution, 4–8 sentences" },
  "trap": "the most common mistake and how to avoid it",
  "quickCheck": { "question": "one short self-check item", "answer": "its answer" }
}`;
  const en = extractJson(await llm([{ role: "system", content: "You are a senior SAT teacher. Output valid JSON only." }, { role: "user", content: base + "\n\nLANGUAGE: English." }], { maxTokens: 3000 }));
  const id = extractJson(await llm([{ role: "system", content: "You are a senior SAT teacher. Output valid JSON only." }, { role: "user", content: base + "\n\nLANGUAGE: natural Bahasa Indonesia (keep technical English terms and the example item itself in English)." }], { maxTokens: 3000 }));
  const norm = (x: any): Lesson => ({
    summary: String(x?.summary || ""), rule: String(x?.rule || ""),
    steps: Array.isArray(x?.steps) ? x.steps.map(String).slice(0, 8) : [],
    example: { question: String(x?.example?.question || ""), solution: String(x?.example?.solution || "") },
    trap: String(x?.trap || ""), quickCheck: { question: String(x?.quickCheck?.question || ""), answer: String(x?.quickCheck?.answer || "") },
  });
  return { en: norm(en), id: norm(id) };
}

// ── Tutor ─────────────────────────────────────────────────────────────────
export async function tutorReply(args: {
  mode: "explain" | "whyWrong" | "hint" | "similar" | "ask";
  lang: "en" | "id";
  question: { passage: string | null; stem: string; choices: string[] | null; answer: string; explanationEn: string; format: "mc" | "spr" };
  studentAnswer?: string;
  message?: string;
  history?: Array<{ role: "student" | "emma"; text: string }>;
}): Promise<string> {
  const q = args.question;
  const langLine = args.lang === "id" ? "Reply in natural Bahasa Indonesia (keep English technical terms)." : "Reply in clear, simple English.";
  const task = {
    explain: "Explain step by step how to get the correct answer, teaching the method a student can reuse. End with the one-line takeaway.",
    whyWrong: `The student answered "${args.studentAnswer ?? ""}". Explain precisely why that is wrong (what error it represents), then show the correct reasoning. Be kind and specific.`,
    hint: "Give ONE hint that moves the student forward without revealing the answer. One or two sentences.",
    similar: "Write ONE new original item that tests the same skill in the same style (with choices if multiple choice), then on a new line 'Answer:' with the answer and a 2-sentence explanation.",
    ask: `The student asks: "${args.message ?? ""}". Answer helpfully in the context of this item, in at most 6 sentences.`,
  }[args.mode];
  const hist = (args.history || []).slice(-6).map(h => `${h.role === "student" ? "Student" : "Emma"}: ${h.text}`).join("\n");
  const prompt = `You are Emma, SpecTa's SAT tutor: precise, warm, never long-winded. ${langLine}

THE ITEM
${q.passage ? `Passage/setup: ${q.passage}\n` : ""}Question: ${q.stem}
${q.choices ? q.choices.map((c, i) => `${"ABCD"[i]}. ${c}`).join("\n") : "(student-produced response)"}
Correct answer: ${q.answer}
Reference explanation: ${q.explanationEn}
${hist ? `\nRECENT CONVERSATION\n${hist}\n` : ""}
TASK: ${task}
Plain text only (no markdown headers). Keep it under 180 words unless writing a similar item.`;
  const messages = [{ role: "system" as const, content: "You are Emma, an expert, concise SAT tutor." }, { role: "user" as const, content: prompt }];
  try {
    const res = await withTimeout(invokeLLM({ model: "deepseek-v4-flash", messages, max_tokens: 700 }), 45000, "tutor");
    const t = res.choices?.[0]?.message?.content;
    if (typeof t === "string" && t.trim()) return t.trim();
  } catch (e) { console.warn("[SAT tutor] flash failed:", (e as Error).message); }
  const res = await withTimeout(invokeLLMFallback({ messages }), 45000, "tutor fallback");
  const t = res.choices?.[0]?.message?.content;
  return typeof t === "string" && t.trim() ? t.trim() : "Sorry — I couldn't answer that just now. Try again in a moment.";
}
