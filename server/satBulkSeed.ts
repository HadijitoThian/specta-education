/**
 * SpecTa SAT Self-Prep — one-time bulk seed of the question bank + lessons.
 *
 * Runs in the background after boot (no admin click needed) until every skill
 * has at least TARGET_PER_CELL questions per difficulty and a lesson.
 * Idempotent and restart-safe: each skill×difficulty cell is skipped once it
 * has enough rows, so a redeploy mid-run simply continues where it left off.
 *
 * Approval policy for the seed: questions whose blind-solve check AGREES are
 * approved automatically (so the 10 students can start); the rest stay as
 * drafts for Hadi to review in /admin/sat. Lessons are approved on creation.
 *
 * Kill switch: SAT_BULK_SEED=off. Tuning: SAT_BULK_SEED_TARGET (default 8),
 * SAT_BULK_SEED_CONCURRENCY (default 3).
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { satSkills, satQuestions } from "../drizzle/schema";
import { generateQuestions, generateLesson } from "./satQuestionGenerator";
import { readFlag, writeFlag } from "./systemFlags";

const TARGET = Number(process.env.SAT_BULK_SEED_TARGET || 8);
const CONCURRENCY = Math.max(1, Number(process.env.SAT_BULK_SEED_CONCURRENCY || 3));
const PROGRESS_FLAG = "sat_bulk_seed_progress";
const DONE_FLAG = "sat_bulk_seed_done_v1";

export interface SeedProgress { state: "idle" | "running" | "done" | "error"; startedAt?: string; finishedAt?: string; cellsTotal: number; cellsDone: number; generated: number; approved: number; lessons: number; errors: number; lastError?: string; current?: string[] }
let running = false;
let progress: SeedProgress = { state: "idle", cellsTotal: 0, cellsDone: 0, generated: 0, approved: 0, lessons: 0, errors: 0, current: [] };
export function getSeedProgress(): SeedProgress { return progress; }
async function persist() { try { await writeFlag(PROGRESS_FLAG, JSON.stringify({ ...progress, current: undefined })); } catch { /* */ } }

export async function runSatBulkSeed(): Promise<void> {
  if (running) return;
  if ((process.env.SAT_BULK_SEED || "on").toLowerCase() === "off") return;
  const db = await getDb(); if (!db) return;
  if (await readFlag(DONE_FLAG)) { progress = { ...progress, state: "done" }; return; }
  running = true;
  progress = { state: "running", startedAt: new Date().toISOString(), cellsTotal: 0, cellsDone: 0, generated: 0, approved: 0, lessons: 0, errors: 0, current: [] };
  try {
    const skills = await db.select().from(satSkills).orderBy(satSkills.sortOrder);
    // Work list: every skill × difficulty that is still short, plus lessons.
    const counts = await db.select({ skillId: satQuestions.skillId, difficulty: satQuestions.difficulty, n: sql<number>`count(*)` }).from(satQuestions).groupBy(satQuestions.skillId, satQuestions.difficulty);
    const have = new Map(counts.map(c => [`${c.skillId}:${c.difficulty}`, Number(c.n)]));
    type Cell = { kind: "q"; skill: typeof skills[number]; difficulty: 1 | 2 | 3 } | { kind: "lesson"; skill: typeof skills[number] };
    const cells: Cell[] = [];
    for (const d of [1, 2, 3] as const) for (const k of skills) if ((have.get(`${k.id}:${d}`) || 0) < TARGET) cells.push({ kind: "q", skill: k, difficulty: d });
    for (const k of skills) if (k.lessonStatus === "none" || !k.lessonEn) cells.push({ kind: "lesson", skill: k });
    progress.cellsTotal = cells.length;
    console.log(`[SAT seed] ${cells.length} cells to fill (target ${TARGET}/cell, concurrency ${CONCURRENCY})`);
    let i = 0;
    const worker = async () => {
      while (i < cells.length) {
        const cell = cells[i++];
        const label = cell.kind === "q" ? `${cell.skill.code} D${cell.difficulty}` : `${cell.skill.code} lesson`;
        progress.current = [...(progress.current || []), label];
        try {
          if (cell.kind === "q") {
            const need = TARGET - (have.get(`${cell.skill.id}:${cell.difficulty}`) || 0);
            const drafts = await generateQuestions(cell.skill, cell.difficulty, Math.min(12, Math.max(4, need)));
            for (const d of drafts) {
              const approve = d.checks.blindSolveAgrees === true;
              await db.insert(satQuestions).values({
                skillId: cell.skill.id, section: cell.skill.section, difficulty: cell.difficulty, format: d.format, passage: d.passage, stem: d.stem,
                choices: d.choices, answer: d.answer, acceptedAnswers: d.acceptedAnswers, explanationEn: d.explanationEn, explanationId: d.explanationId || null,
                distractorNotes: d.distractorNotes, checks: d.checks, status: approve ? "approved" : "draft", source: "seed", reviewedAt: approve ? new Date() : null,
              });
              progress.generated++; if (approve) progress.approved++;
            }
          } else {
            const { en, id } = await generateLesson(cell.skill);
            await db.update(satSkills).set({ lessonEn: en, lessonId: id, lessonStatus: "approved" }).where(eq(satSkills.id, cell.skill.id));
            progress.lessons++;
          }
        } catch (e) {
          progress.errors++; progress.lastError = `${label}: ${String((e as Error)?.message || e).slice(0, 200)}`;
          console.warn(`[SAT seed] ${progress.lastError}`);
        } finally {
          progress.cellsDone++; progress.current = (progress.current || []).filter(x => x !== label);
          if (progress.cellsDone % 3 === 0) await persist();
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    progress.state = "done"; progress.finishedAt = new Date().toISOString();
    await writeFlag(DONE_FLAG, new Date().toISOString());
    console.log(`[SAT seed] done: ${progress.generated} questions (${progress.approved} auto-approved), ${progress.lessons} lessons, ${progress.errors} errors`);
  } catch (e) {
    progress.state = "error"; progress.lastError = String((e as Error)?.message || e).slice(0, 300);
    console.error("[SAT seed] failed:", progress.lastError);
  } finally { running = false; await persist(); }
}

/** Retry cells that are still short (e.g. after LLM errors) — admin button. */
export async function restartSatBulkSeed(): Promise<void> {
  if (running) return;
  try { await writeFlag(DONE_FLAG, ""); } catch { /* */ }
  void runSatBulkSeed();
}
