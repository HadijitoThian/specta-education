/**
 * AI IELTS Tutor router (mounted as `tutor`).
 *
 * Standalone paid product. Students sign in via the existing student portal
 * (student_portal_token cookie → leads.id). Free taster: 1 writing + 1 speaking
 * evaluation. After that, an active subscription (1/3/6 months) is required.
 *
 * Reuses tutorEngine (grading/feedback), Whisper (speech), ElevenLabs (examiner
 * voice), and R2 (audio storage). Payment (Xendit) is wired separately.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";

import { router, publicProcedure } from "./_core/trpc";
import {
  evaluateWriting, evaluateSpeaking, generateWritingTask, generateSpeakingQuestions,
  generatePart1Test, evaluateSpeakingQuick, summarizePart1Test, computeFluency,
} from "./tutorEngine";
import {
  getActiveTutorSubscription, countTutorSessions, createTutorSession,
  listTutorSessions, getTutorSession, updateTutorSession,
} from "./db";
import { transcribeAudioBuffer } from "./_core/voiceTranscription";
import { synthesize } from "./_core/elevenlabs";
import { storagePut } from "./storage";

const FREE_LIMIT = 1; // free evaluations per skill before a subscription is needed

/** Resolve the logged-in student's leadId from the portal cookie. */
async function resolveLead(ctx: any): Promise<number | null> {
  try {
    const cookieHeader = ctx?.req?.headers?.cookie || "";
    const token = parseCookies(cookieHeader)["student_portal_token"];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    const leadId = Number((payload as any).leadId);
    return Number.isFinite(leadId) ? leadId : null;
  } catch { return null; }
}

function requireLead(leadId: number | null): number {
  if (!leadId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to use the AI Tutor." });
  return leadId;
}

/** Testing override — set TUTOR_FREE_TESTING=true in Railway for unlimited free
 *  access during QA. REMOVE it before launch so the paywall is enforced. */
const FREE_TESTING = () => process.env.TUTOR_FREE_TESTING === "true";

/** Gate a practice: active subscription → unlimited; else allow the free taster. */
async function gate(leadId: number, skill: "speaking" | "writing"): Promise<{ isFree: boolean }> {
  if (FREE_TESTING()) return { isFree: true };
  const sub = await getActiveTutorSubscription(leadId);
  if (sub) return { isFree: false };
  const used = await countTutorSessions(leadId, skill);
  if (used >= FREE_LIMIT) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You've used your free ${skill} evaluation. Subscribe to keep practising with unlimited feedback.`,
    });
  }
  return { isFree: true };
}

export const tutorRouter = router({
  /** Account + access status for the tutor UI. */
  status: publicProcedure.query(async ({ ctx }) => {
    const leadId = await resolveLead(ctx);
    if (!leadId) return { loggedIn: false as const };
    const sub = await getActiveTutorSubscription(leadId);
    const [writingUsed, speakingUsed] = await Promise.all([
      countTutorSessions(leadId, "writing"),
      countTutorSessions(leadId, "speaking"),
    ]);
    const testing = FREE_TESTING();
    return {
      loggedIn: true as const,
      testing,
      subscription: sub ? { plan: sub.plan, expiresAt: sub.expiresAt } : null,
      freeRemaining: testing
        ? { writing: 999, speaking: 999 }
        : { writing: Math.max(0, FREE_LIMIT - writingUsed), speaking: Math.max(0, FREE_LIMIT - speakingUsed) },
    };
  }),

  // ── Content ──
  writingTask: publicProcedure
    .input(z.object({ taskType: z.enum(["task1", "task2"]) }))
    .mutation(async ({ input }) => generateWritingTask(input.taskType)),

  speakingQuestions: publicProcedure
    .input(z.object({ part: z.enum(["part1", "part2", "part3"]) }))
    .mutation(async ({ input }) => generateSpeakingQuestions(input.part)),

  /** Synthesize an examiner voice clip for a question (returns an audio URL). */
  examinerAudio: publicProcedure
    .input(z.object({ text: z.string().min(1).max(1200) }))
    .mutation(async ({ input }) => {
      try {
        const buf = await synthesize({ text: input.text });
        const { url } = await storagePut(`tutor/examiner/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`, buf, "audio/mpeg");
        return { url };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  // ── Evaluations ──
  evaluateWriting: publicProcedure
    .input(z.object({
      taskType: z.enum(["task1", "task2"]),
      prompt: z.string().min(1).max(4000),
      essay: z.string().min(20).max(8000),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const { isFree } = await gate(leadId, "writing");
      const fb = await evaluateWriting(input.taskType, input.prompt, input.essay);
      const session = await createTutorSession({
        leadId, skill: "writing", taskType: input.taskType, prompt: input.prompt,
        response: input.essay, overallBand: String(fb.overallBand) as any,
        scores: fb.criteria as any, feedback: fb as any, isFree,
      });
      return { sessionId: session?.id, feedback: fb };
    }),

  evaluateSpeaking: publicProcedure
    .input(z.object({
      part: z.enum(["part1", "part2", "part3"]),
      question: z.string().min(1).max(1200),
      audioBase64: z.string().min(100),
      mimeType: z.string().max(60).optional(),
      durationSec: z.number().int().positive().max(600),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const { isFree } = await gate(leadId, "speaking");

      const buffer = Buffer.from(input.audioBase64, "base64");
      if (buffer.length > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Recording too large (max ~20MB)." });

      // Transcribe
      const tr = await transcribeAudioBuffer({ buffer, mimeType: input.mimeType || "audio/webm" });
      if ("error" in tr) {
        console.error("[Tutor] transcription failed:", tr.error, tr.details);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Transcription failed: ${tr.error}${tr.details ? ` — ${tr.details}` : ""}` });
      }
      const transcript = (tr.text || "").trim();

      // Store the recording (best-effort)
      let audioUrl: string | undefined;
      try {
        const ext = (input.mimeType || "").includes("mp4") ? "mp4" : (input.mimeType || "").includes("wav") ? "wav" : "webm";
        const put = await storagePut(`tutor/speaking/${leadId}/${Date.now()}.${ext}`, buffer, input.mimeType || "audio/webm");
        audioUrl = `/files/${put.key}`; // proxy path so it plays back from history
      } catch { /* non-critical */ }

      const words = (transcript.match(/\S+/g) || []).length;
      const metrics = computeFluency((tr as any).segments, input.durationSec, words);
      const fb = await evaluateSpeaking(input.part, input.question, transcript, input.durationSec, metrics);
      const session = await createTutorSession({
        leadId, skill: "speaking", taskType: input.part, prompt: input.question,
        response: transcript, audioUrl, durationSec: input.durationSec,
        overallBand: String(fb.overallBand) as any, scores: fb.criteria as any, feedback: fb as any, isFree,
      });
      return { sessionId: session?.id, transcript, feedback: fb };
    }),

  // ── Full Speaking Test — Part 1 (guided) ──
  /** Start a Part-1 test: consumes one free speaking use, returns 7 questions. */
  speakingTestStart: publicProcedure.mutation(async ({ ctx }) => {
    const leadId = requireLead(await resolveLead(ctx));
    const { isFree } = await gate(leadId, "speaking");
    const { topic, questions } = await generatePart1Test();
    const session = await createTutorSession({
      leadId, skill: "speaking", taskType: "part1", prompt: topic,
      feedback: { topic, questions, answers: [] } as any, isFree,
    });
    return { sessionId: session?.id, topic, questions };
  }),

  /** Evaluate one answer in a running test (not gated — the test was gated at start). */
  speakingTestAnswer: publicProcedure
    .input(z.object({
      sessionId: z.number(),
      index: z.number().int().min(0).max(20),
      question: z.string().min(1).max(1200),
      audioBase64: z.string().min(100),
      mimeType: z.string().max(60).optional(),
      durationSec: z.number().int().positive().max(600),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const session = await getTutorSession(input.sessionId, leadId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      const buffer = Buffer.from(input.audioBase64, "base64");
      if (buffer.length > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Recording too large." });
      const tr = await transcribeAudioBuffer({ buffer, mimeType: input.mimeType || "audio/webm" });
      if ("error" in tr) {
        console.error("[Tutor] test transcription failed:", tr.error, tr.details);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Transcription failed: ${tr.error}${tr.details ? ` — ${tr.details}` : ""}` });
      }
      const transcript = (tr.text || "").trim();
      const words = (transcript.match(/\S+/g) || []).length;
      const metrics = computeFluency((tr as any).segments, input.durationSec, words);
      const fb = await evaluateSpeakingQuick(input.question, transcript, input.durationSec, metrics);
      return { transcript, ...fb };
    }),

  /** Finish the test: summarize all answers into a band + recurring mistakes + plan. */
  speakingTestFinish: publicProcedure
    .input(z.object({
      sessionId: z.number(),
      answers: z.array(z.object({ question: z.string(), transcript: z.string(), band: z.number() })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const session = await getTutorSession(input.sessionId, leadId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const topic = (session.feedback as any)?.topic || "Part 1";
      const result = await summarizePart1Test(topic, input.answers);
      await updateTutorSession(input.sessionId, {
        overallBand: String(result.overallBand) as any,
        scores: { overallBand: result.overallBand } as any,
        feedback: { ...(session.feedback as any), answers: input.answers, ...result } as any,
      });
      return result;
    }),

  // ── History ──
  listSessions: publicProcedure.query(async ({ ctx }) => {
    const leadId = await resolveLead(ctx);
    if (!leadId) return [];
    const rows = await listTutorSessions(leadId, 50);
    return rows.map(r => ({
      id: r.id, skill: r.skill, taskType: r.taskType, overallBand: r.overallBand,
      createdAt: r.createdAt, prompt: (r.prompt || "").slice(0, 140),
    }));
  }),

  getSession: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const s = await getTutorSession(input.id, leadId);
      if (!s) throw new TRPCError({ code: "NOT_FOUND" });
      return s;
    }),
});
