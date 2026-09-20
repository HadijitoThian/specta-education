/**
 * SpecTa SAT Self-Prep — question-bank quality audit.
 *
 * Every question (draft or approved) that hasn't been audited yet goes
 * through two gates:
 *   1. Structural: 4 distinct non-empty choices with the key in A–D, numeric
 *      SPR answers, a real RW passage, a usable explanation, no reference to
 *      an image/figure that isn't described, no duplicate stem in the skill.
 *   2. Independent LLM audit against Digital SAT standards: solves the item
 *      itself, checks single defensible answer, distractor quality, stem
 *      style, difficulty label, explanation correctness, language.
 * Failures are retired (approved) or rejected (draft) with the reasons saved
 * in checks.audit so Hadi can see why in /admin/sat. Passing items keep their
 * status and get checks.audit = { pass: true, score }.
 *
 * Runs after the bulk seed and 60 s after every boot (idempotent: audited
 * items are skipped). Kill switch SAT_AUDIT=off. Concurrency SAT_AUDIT_CONCURRENCY (3).
 */

import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { satQuestions, satSkills, type SatQuestion } from "../drizzle/schema";
import { llmJson } from "./satQuestionGenerator";
import { parseNumeric } from "./satEngine";
import { SECTION_STYLE } from "./satSkills";

const CONCURRENCY = Math.max(1, Number(process.env.SAT_AUDIT_CONCURRENCY || 3));
export interface AuditProgress { state: "idle" | "running" | "done" | "error"; total: number; done: number; passed: number; failedStructural: number; failedLlm: number; errors: number; startedAt?: string; finishedAt?: string; lastError?: string }
let running = false;
let progress: AuditProgress = { state: "idle", total: 0, done: 0, passed: 0, failedStructural: 0, failedLlm: 0, errors: 0 };
export function getAuditProgress(): AuditProgress { return progress; }

const IMAGE_WORDS = /\b(figure|diagram|graph (above|below|shown)|table (above|below|shown)|as shown|in the (image|picture)|pictured)\b/i;

export function structuralProblems(q: SatQuestion, siblingsNormalizedStems: Set<string>): string[] {
  const p: string[] = [];
  const stem = (q.stem || "").trim();
  if (stem.length < 15) p.push("stem too short");
  if (q.format === "mc") {
    const ch = (q.choices as string[] | null) || [];
    if (ch.length !== 4) p.push(`expected 4 choices, got ${ch.length}`);
    if (ch.some(c => !String(c || "").trim())) p.push("empty choice");
    if (new Set(ch.map(c => String(c).trim().toLowerCase())).size !== ch.length) p.push("duplicate choices");
    if (!/^[A-D]$/.test(String(q.answer || "").trim().toUpperCase())) p.push(`answer key '${q.answer}' is not A–D`);
    if (ch.some(c => /\b(all|none) of the above\b/i.test(String(c)))) p.push("'all/none of the above' is not used on the SAT");
  } else {
    if (parseNumeric(String(q.answer || "")) === null) p.push(`SPR answer '${q.answer}' is not numeric`);
  }
  if (q.section === "rw") {
    const words = (q.passage || "").trim().split(/\s+/).filter(Boolean).length;
    if (words < 20) p.push(`RW passage too short (${words} words)`);
    if (words > 220) p.push(`RW passage too long (${words} words)`);
  }
  if ((q.explanationEn || "").trim().length < 40) p.push("explanation missing or too short");
  const text = `${q.passage || ""} ${stem} ${((q.choices as string[] | null) || []).join(" ")}`;
  if (IMAGE_WORDS.test(text) && !/\b(values?|data|table below:|as follows|listed)\b/i.test(text)) p.push("refers to a figure/graph that is not described in words");
  const norm = stem.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (siblingsNormalizedStems.has(norm)) p.push("duplicate of another question in this skill");
  return p;
}

interface LlmVerdict { pass: boolean; score: number; solvedAnswer: string; keyAgrees: boolean; issues: string[]; difficultyOk: boolean }

async function llmAudit(q: SatQuestion, skill: { title: string; outcomes: string; section: "rw" | "math" }): Promise<LlmVerdict> {
  const choices = (q.choices as string[] | null);
  const prompt = `You are a senior Digital SAT item reviewer (College Board style guide, 2024–2026 format). Audit ONE practice item written by another author. Be strict: real students will train on it.

SKILL: ${skill.title} — ${skill.outcomes}
SECTION STYLE RULES: ${SECTION_STYLE[skill.section]}
DECLARED DIFFICULTY: ${q.difficulty} (1 easy, 2 medium, 3 hard)

ITEM
${q.passage ? `Passage/setup:\n${q.passage}\n\n` : ""}Question: ${q.stem}
${choices ? choices.map((c, i) => `${"ABCD"[i]}. ${c}`).join("\n") : "(student-produced numeric response)"}
Author's answer key: ${q.answer}
Author's explanation: ${q.explanationEn}

TASKS
1. Solve the item yourself from scratch BEFORE looking at the key. Give your answer.
2. Check: exactly one defensible correct answer? Each distractor clearly wrong (not arguably right)? For RW: passage self-contained, question answerable from the text alone, stem uses genuine Digital SAT phrasing? For Math: all needed values stated in words, calculator-neutral, realistic numbers, SPR answer is a single number?
3. Is the declared difficulty reasonable (within ±1)?
4. Is the explanation correct and consistent with the key?
5. Language: natural, error-free US English; no copied College Board content.

Return JSON ONLY:
{ "solvedAnswer": "letter or number", "keyAgrees": true|false, "pass": true|false, "score": 1-5, "difficultyOk": true|false, "issues": ["short, specific problems; empty if none"] }
Rules: pass=false if keyAgrees=false, or the item is ambiguous, or has a factual/mathematical error, or breaks the section style badly. score 5 = test-ready, 3 = usable with minor flaws, 1 = unusable.`;
  const raw = await llmJson([{ role: "system", content: "You are a meticulous SAT item reviewer. Output valid JSON only." }, { role: "user", content: prompt }], { model: "deepseek-v4-pro", maxTokens: 900, timeoutMs: 120000 });
  const v = raw || {};
  const solved = String(v.solvedAnswer ?? "").trim();
  let keyAgrees = !!v.keyAgrees;
  // Trust our own comparison over the model's flag.
  if (q.format === "mc") keyAgrees = solved.toUpperCase().replace(/[^A-D]/g, "").slice(0, 1) === String(q.answer).toUpperCase();
  else { const a = parseNumeric(solved), b = parseNumeric(String(q.answer)); if (a !== null && b !== null) keyAgrees = Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-4); }
  return { pass: !!v.pass && keyAgrees, score: Math.max(1, Math.min(5, Number(v.score) || 1)), solvedAnswer: solved, keyAgrees, issues: Array.isArray(v.issues) ? v.issues.map((x: any) => String(x).slice(0, 200)).slice(0, 6) : [], difficultyOk: v.difficultyOk !== false };
}

export async function runSatAudit(): Promise<void> {
  if (running) return;
  if ((process.env.SAT_AUDIT || "on").toLowerCase() === "off") return;
  const db = await getDb(); if (!db) return;
  running = true;
  progress = { state: "running", total: 0, done: 0, passed: 0, failedStructural: 0, failedLlm: 0, errors: 0, startedAt: new Date().toISOString() };
  try {
    const skills = await db.select({ id: satSkills.id, title: satSkills.title, outcomes: satSkills.outcomes, section: satSkills.section }).from(satSkills);
    const sk = new Map(skills.map(s => [s.id, s]));
    const all = await db.select().from(satQuestions).where(inArray(satQuestions.status, ["draft", "approved"]));
    const todo = all.filter(q => !(q.checks as any)?.audit);
    progress.total = todo.length;
    if (!todo.length) { progress.state = "done"; progress.finishedAt = new Date().toISOString(); return; }
    console.log(`[SAT audit] auditing ${todo.length} questions (concurrency ${CONCURRENCY})`);
    // Stems already seen per skill (earlier ids win) for duplicate detection.
    const seen = new Map<number, Set<string>>();
    const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    for (const q of all.filter(q => (q.checks as any)?.audit?.pass)) { const set = seen.get(q.skillId) || new Set(); set.add(norm(q.stem)); seen.set(q.skillId, set); }
    const fail = async (q: SatQuestion, audit: Record<string, unknown>) => {
      await db.update(satQuestions).set({ status: q.status === "approved" ? "retired" : "rejected", checks: { ...((q.checks as any) || {}), audit }, reviewedAt: new Date() }).where(eq(satQuestions.id, q.id));
    };
    let i = 0;
    const worker = async () => {
      while (i < todo.length) {
        const q = todo[i++];
        try {
          const set = seen.get(q.skillId) || new Set<string>();
          const problems = structuralProblems(q, set);
          if (problems.length) { await fail(q, { pass: false, stage: "structural", issues: problems, at: new Date().toISOString() }); progress.failedStructural++; continue; }
          const skill = sk.get(q.skillId);
          const v = await llmAudit(q, skill ? { title: skill.title, outcomes: skill.outcomes || "", section: skill.section } : { title: "SAT", outcomes: "", section: q.section });
          const audit = { pass: v.pass && v.score >= 3, stage: "llm", score: v.score, keyAgrees: v.keyAgrees, solvedAnswer: v.solvedAnswer, difficultyOk: v.difficultyOk, issues: v.issues, at: new Date().toISOString() };
          if (!audit.pass) { await fail(q, audit); progress.failedLlm++; }
          else {
            await db.update(satQuestions).set({ checks: { ...((q.checks as any) || {}), audit } }).where(eq(satQuestions.id, q.id));
            set.add(norm(q.stem)); seen.set(q.skillId, set); progress.passed++;
          }
        } catch (e) {
          progress.errors++; progress.lastError = `#${q.id}: ${String((e as Error)?.message || e).slice(0, 160)}`;
          console.warn(`[SAT audit] ${progress.lastError}`);
        } finally { progress.done++; }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    progress.state = "done"; progress.finishedAt = new Date().toISOString();
    console.log(`[SAT audit] done: ${progress.passed} passed, ${progress.failedStructural} structural fails, ${progress.failedLlm} LLM fails, ${progress.errors} errors`);
  } catch (e) {
    progress.state = "error"; progress.lastError = String((e as Error)?.message || e).slice(0, 300);
    console.error("[SAT audit] failed:", progress.lastError);
  } finally { running = false; }
}
