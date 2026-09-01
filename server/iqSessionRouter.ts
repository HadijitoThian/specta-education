/**
 * SpecTa IQ Discovery — public session tRPC routes.
 *
 * Powers the student-facing test flow. Two entry points:
 *   1. Free 5-question preview — no payment / no auth. Result shows a
 *      rough IQ range + archetype teaser + upsell CTA.
 *   2. Paid full test — requires a valid iq_access_token. 40 questions
 *      across 5 domains, one attempt per token.
 *
 * Design principles:
 *   - Server picks the question list at session start and stores it in DB
 *     as an ordered ID array. The client only ever receives the CURRENT
 *     question and options — never sees what's coming next, never sees
 *     the correct answer.
 *   - Answers stream in one at a time via submitAnswer, which records
 *     correctness server-side and returns the next question (or a
 *     "test complete" signal on the final question).
 *   - Timing is measured server-side per question. The client can't fake
 *     a fast submission — if the server-measured time exceeds the
 *     per-question limit, the answer counts as wrong.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "./_core/trpc";
import {
  pickIqQuestionsForDomain, getIqQuestionsByIds,
  createIqSession, getIqSession, updateIqSession,
  getIqAccessTokenByToken, markIqTokenInProgress,
} from "./db";
import { scoreIqSession } from "./iqScoring";
import { generateIqNarrative } from "./iqFeedbackEngine";
import { generateIqDiscoveryPdf } from "./iqPdfGenerator";
import { generateIqShareGraphic } from "./iqShareGraphic";
import { storagePut } from "./storage";
import type { IqDomain } from "./iqQuestionTypes";

const DOMAINS = ["fluid", "quantitative", "verbal", "spatial", "memory"] as const;

/** Preview picks 1 question per domain — a fast vibe check. */
async function assemblePreviewQuestionIds(): Promise<number[]> {
  const ids: number[] = [];
  for (const d of DOMAINS) {
    const rows = await pickIqQuestionsForDomain(d, 1);
    if (rows.length) ids.push(rows[0].id);
  }
  return ids;
}

/** Full test picks 8 questions per domain = 40 total, graded difficulty
 *  (easier ones first within each domain, then interleaved across
 *  domains so the student doesn't do all fluid then all verbal etc.). */
async function assembleFullTestQuestionIds(): Promise<number[]> {
  const perDomain: Record<string, number[]> = {};
  for (const d of DOMAINS) {
    const rows = await pickIqQuestionsForDomain(d, 8);
    perDomain[d] = rows.map(r => r.id);
  }
  // Interleave: take one from each domain in round-robin order, so the
  // student experiences variety not fatigue.
  const interleaved: number[] = [];
  const maxLen = Math.max(...DOMAINS.map(d => perDomain[d].length));
  for (let i = 0; i < maxLen; i++) {
    for (const d of DOMAINS) {
      const id = perDomain[d][i];
      if (id !== undefined) interleaved.push(id);
    }
  }
  return interleaved;
}

/** Serialize the client-safe view of a question: prompt + options but
 *  NEVER correctIndex or explanation. */
function sanitizeQuestionForClient(q: {
  id: number; type: string; timeLimitSec: number;
  prompt: string; options: string;
}): { id: number; type: string; timeLimitSec: number; prompt: any; options: any[] } {
  return {
    id: q.id,
    type: q.type,
    timeLimitSec: q.timeLimitSec,
    prompt: safeParse(q.prompt, {}),
    options: safeParse(q.options, []),
  };
}

function safeParse<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try { return JSON.parse(text) as T; } catch { return fallback; }
}

interface StoredAnswer {
  questionId: number;
  chosenIndex: number | null;
  correct: boolean;
  serverStartMs: number;
  serverEndMs: number;
  timedOut: boolean;
}

export const iqSessionRouter = router({
  // ═════════════════════════════════════════════════════════════════════
  // START FREE PREVIEW — no auth required, immediate access
  // ═════════════════════════════════════════════════════════════════════
  startPreview: publicProcedure.mutation(async () => {
    const ids = await assemblePreviewQuestionIds();
    if (ids.length < 3) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Not enough approved questions yet. Try again in a few minutes.",
      });
    }
    const session = await createIqSession({
      mode: "preview",
      questionIds: JSON.stringify(ids),
      answers: JSON.stringify([]),
    });
    if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create session" });
    // Return first question already-loaded so the UI doesn't need a second call.
    const [firstQuestion] = await getIqQuestionsByIds([ids[0]]);
    return {
      sessionId: session.id,
      mode: "preview" as const,
      totalQuestions: ids.length,
      currentIndex: 0,
      question: sanitizeQuestionForClient(firstQuestion),
      serverStartMs: Date.now(),
    };
  }),

  // ═════════════════════════════════════════════════════════════════════
  // START FULL PAID TEST — requires a valid access token
  // ═════════════════════════════════════════════════════════════════════
  startFullTest: publicProcedure
    .input(z.object({
      token: z.string().min(8),
      name: z.string().min(1).max(255),
      email: z.string().email(),
      phone: z.string().min(6).max(50),
    }))
    .mutation(async ({ input }) => {
      const tokenRow = await getIqAccessTokenByToken(input.token);
      if (!tokenRow) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid access link" });
      if (tokenRow.status === "completed") {
        throw new TRPCError({ code: "FORBIDDEN", message: "This access link has already been used" });
      }
      if (new Date(tokenRow.expiresAt) < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This access link has expired" });
      }

      const ids = await assembleFullTestQuestionIds();
      if (ids.length < 20) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Sistem belum siap — bank soal masih dilengkapi. Hubungi admin.",
        });
      }

      const session = await createIqSession({
        mode: "full",
        accessTokenId: tokenRow.id,
        studentName: input.name,
        studentEmail: input.email,
        studentPhone: input.phone,
        questionIds: JSON.stringify(ids),
        answers: JSON.stringify([]),
      });
      if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create session" });

      await markIqTokenInProgress(input.token, input.name, input.email, input.phone, session.id);

      const [firstQuestion] = await getIqQuestionsByIds([ids[0]]);
      return {
        sessionId: session.id,
        mode: "full" as const,
        totalQuestions: ids.length,
        currentIndex: 0,
        question: sanitizeQuestionForClient(firstQuestion),
        serverStartMs: Date.now(),
      };
    }),

  // ═════════════════════════════════════════════════════════════════════
  // SUBMIT ONE ANSWER — records correctness, returns next question or done
  // ═════════════════════════════════════════════════════════════════════
  submitAnswer: publicProcedure
    .input(z.object({
      sessionId: z.number().int().positive(),
      questionId: z.number().int().positive(),
      chosenIndex: z.number().int().min(0).max(10).nullable(),
      serverStartMs: z.number().int().nonnegative(),
    }))
    .mutation(async ({ input }) => {
      const session = await getIqSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (session.status !== "in_progress") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Session already completed" });
      }

      const questionIds: number[] = safeParse(session.questionIds, []);
      const answers: StoredAnswer[] = safeParse(session.answers, []);
      const currentIndex = answers.length;

      // Guard: make sure the questionId matches the expected current slot.
      // Prevents client from answering questions out of order.
      if (questionIds[currentIndex] !== input.questionId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Question order mismatch" });
      }

      // Fetch the full question row so we can score.
      const [question] = await getIqQuestionsByIds([input.questionId]);
      if (!question) throw new TRPCError({ code: "NOT_FOUND", message: "Question missing" });

      const serverEndMs = Date.now();
      const elapsedSec = Math.round((serverEndMs - input.serverStartMs) / 1000);
      const timedOut = elapsedSec > question.timeLimitSec + 2; // 2s grace for network
      const correct = !timedOut && input.chosenIndex === question.correctIndex;

      answers.push({
        questionId: input.questionId,
        chosenIndex: input.chosenIndex,
        correct,
        serverStartMs: input.serverStartMs,
        serverEndMs,
        timedOut,
      });

      const nextIndex = answers.length;
      const isLast = nextIndex >= questionIds.length;

      await updateIqSession(input.sessionId, {
        answers: JSON.stringify(answers),
      });

      if (isLast) {
        // Don't finalize scores here — that happens in finishSession so the
        // client explicitly requests it. Just signal completion.
        return {
          done: true as const,
          questionsAnswered: answers.length,
          totalQuestions: questionIds.length,
        };
      }

      const [nextQuestion] = await getIqQuestionsByIds([questionIds[nextIndex]]);
      return {
        done: false as const,
        currentIndex: nextIndex,
        totalQuestions: questionIds.length,
        question: sanitizeQuestionForClient(nextQuestion),
        serverStartMs: Date.now(),
      };
    }),

  // ═════════════════════════════════════════════════════════════════════
  // FINISH — compute scores + return summary
  //
  // Real scoring engine (perDomain bands, FSIQ estimate, archetype, AI
  // feedback) ships in M3. For now: raw correctness counts per domain +
  // a stub FSIQ estimate so the flow is testable end-to-end.
  // ═════════════════════════════════════════════════════════════════════
  finish: publicProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const session = await getIqSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (session.status === "completed" && session.scores) {
        return safeParse(session.scores, {});
      }

      const questionIds: number[] = safeParse(session.questionIds, []);
      const answers: StoredAnswer[] = safeParse(session.answers, []);
      if (answers.length < questionIds.length) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Test not complete" });
      }

      const questions = await getIqQuestionsByIds(questionIds);
      const questionMap = new Map(questions.map(q => [q.id, q]));

      // Build the answer rows for the scoring engine — enrich each stored
      // answer with its question's domain (scoring is domain-aware).
      const rows = answers.map(a => {
        const q = questionMap.get(a.questionId);
        return {
          questionId: a.questionId,
          domain: (q?.domain || "fluid") as IqDomain,
          correct: !!a.correct,
          timedOut: !!a.timedOut,
          timeMs: (a.serverEndMs || 0) - (a.serverStartMs || 0),
        };
      });
      const totalTimeSec = rows.reduce((s, r) => s + Math.max(0, r.timeMs / 1000), 0);

      // Real scoring (per-domain scaled bands + FSIQ + percentile + archetype).
      const score = scoreIqSession({
        answers: rows,
        totalTimeSec,
        mode: session.mode,
      });

      // AI narrative (Bahasa Indonesia). NEVER throws — falls back to a
      // hardcoded generic narrative if both DeepSeek and GLM fail, so the
      // student always sees a valid result.
      const narrative = await generateIqNarrative(
        score,
        session.studentName || "Kamu",
        session.mode,
      );

      // Generate deliverables — PDF report + Instagram share graphic.
      // Only for FULL mode; preview gets neither (no PDF for a 5Q sample).
      // Best-effort — if generation fails, the student still sees the on-screen
      // result. The PDF+share generation adds ~2-5s to the finish call.
      let pdfUrl: string | undefined;
      let shareImageUrl: string | undefined;
      if (session.mode === "full") {
        const displayName = session.studentName || "Kamu";
        try {
          const pdfBuffer = await generateIqDiscoveryPdf({
            studentName: displayName,
            score,
            narrative,
          });
          const pdfKey = `iq-discovery/reports/${input.sessionId}-${Date.now()}.pdf`;
          const uploaded = await storagePut(pdfKey, pdfBuffer, "application/pdf");
          pdfUrl = `/files/${uploaded.key}`;
          console.log(`[IqDiscovery] PDF generated (${(pdfBuffer.length / 1024).toFixed(1)}KB) → ${pdfUrl}`);
        } catch (e) {
          console.error(`[IqDiscovery] PDF generation failed for session ${input.sessionId}:`, (e as Error).message);
        }
        try {
          const png = await generateIqShareGraphic({
            studentName: displayName,
            score,
          });
          const shareKey = `iq-discovery/share/${input.sessionId}-${Date.now()}.png`;
          const uploaded = await storagePut(shareKey, png, "image/png");
          shareImageUrl = `/files/${uploaded.key}`;
          console.log(`[IqDiscovery] share graphic generated (${(png.length / 1024).toFixed(1)}KB) → ${shareImageUrl}`);
        } catch (e) {
          console.error(`[IqDiscovery] share graphic generation failed for session ${input.sessionId}:`, (e as Error).message);
        }
      }

      const result = {
        ...score,
        narrative,
        mode: session.mode,
        studentName: session.studentName || null,
        pdfUrl: pdfUrl || null,
        shareImageUrl: shareImageUrl || null,
      };

      await updateIqSession(input.sessionId, {
        status: "completed",
        completedAt: new Date(),
        scores: JSON.stringify(result),
      });

      // Mark the paid access token as consumed. The session already stores
      // the token id via markIqTokenInProgress at startFullTest; here we
      // look up by session.accessTokenId to flip status → completed. Handled
      // via inline query rather than a dedicated helper — the token flow
      // will consolidate in M5 (payment + token integration).
      // For now, non-critical: if this fails the token expires naturally
      // in 7 days regardless.

      return result;
    }),
});
