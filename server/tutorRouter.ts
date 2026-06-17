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
import { nanoid } from "nanoid";

import { router, publicProcedure } from "./_core/trpc";
import {
  evaluateWriting, evaluateSpeaking, generateWritingTask, generateSpeakingQuestions,
  generatePart1Test, evaluateSpeakingQuick, summarizePart1Test, computeFluency,
} from "./tutorEngine";
import {
  getActiveTutorSubscription, countTutorSessions, createTutorSession,
  listTutorSessions, getTutorSession, updateTutorSession,
  getLeadById, createTutorSubscription,
} from "./db";
import { transcribeAudioBuffer } from "./_core/voiceTranscription";
import { synthesize } from "./_core/elevenlabs";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";
import { TUTOR_PLANS, tutorExternalId, createTutorInvoice } from "./xenditService";

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

/** Testing override — set TUTOR_FREE_TESTING=true for unlimited free access
 *  during local QA. HARD-DISABLED in production: even if the env var is left
 *  set on Railway, the paywall is always enforced when NODE_ENV=production, so
 *  the bypass can never accidentally ship live. The 1-try free taster below is
 *  unaffected. */
const FREE_TESTING = () =>
  process.env.NODE_ENV !== "production" && process.env.TUTOR_FREE_TESTING === "true";

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
      subscription: sub
        ? { plan: sub.plan, expiresAt: sub.expiresAt, isFree: String(sub.xenditInvoiceId || "").startsWith("FREE") }
        : null,
      freeRemaining: testing
        ? { writing: 999, speaking: 999 }
        : { writing: Math.max(0, FREE_LIMIT - writingUsed), speaking: Math.max(0, FREE_LIMIT - speakingUsed) },
    };
  }),

  // ── Payments (Xendit) ──
  /** Create a Xendit invoice for a tutor subscription plan; returns the hosted invoice URL. */
  createCheckout: publicProcedure
    .input(z.object({ plan: z.enum(["w2", "m1"]) }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      if (!ENV.xenditSecretKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payments are not configured yet. Please contact support." });
      }
      const lead = await getLeadById(leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });

      const plan = TUTOR_PLANS[input.plan];
      const externalId = tutorExternalId();

      // Record a pending subscription keyed by the invoice external id.
      await createTutorSubscription({
        leadId,
        plan: input.plan,
        status: "pending",
        amount: String(plan.amount) as any,
        currency: "IDR",
        xenditInvoiceId: externalId,
      });

      // Xendit requires an ABSOLUTE URL. Fall back to the prod domain so we
      // never redirect a paying customer to localhost if APP_URL is unset.
      const base = ENV.appUrl?.replace(/\/+$/, "")
        || "https://specta-education-production.up.railway.app";
      const successRedirectUrl = `${base}/ielts/tutor?paid=1`;
      const failureRedirectUrl = `${base}/ielts/tutor?paid=0`;

      try {
        const invoice = await createTutorInvoice({
          externalId,
          plan: input.plan,
          customerName: (lead as any).name || "Student",
          customerEmail: (lead as any).email,
          customerPhone: (lead as any).phone || undefined,
          successRedirectUrl,
          failureRedirectUrl,
        });
        return { invoiceUrl: invoice.invoice_url };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  /** Redeem an admin-issued free-access link → grants a free subscription for
   *  the signed-in student. The token is a signed JWT (purpose "tutor-free-pass"
   *  with `days`). Reusable until the link expires; each student gets their own. */
  redeemFreePass: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));

      // Verify the signed link.
      let days = 7;
      try {
        const { payload } = await jwtVerify(
          input.token,
          new TextEncoder().encode(ENV.cookieSecret),
        );
        if ((payload as any)?.purpose !== "tutor-free-pass") {
          throw new Error("bad purpose");
        }
        const d = Number((payload as any).days);
        if (Number.isFinite(d) && d >= 1 && d <= 90) days = Math.floor(d);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This free-access link is invalid or has expired." });
      }

      // If they already have active access, don't stack — just report it.
      const existing = await getActiveTutorSubscription(leadId);
      if (existing) {
        return { alreadyActive: true as const, expiresAt: existing.expiresAt };
      }

      const startsAt = new Date();
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      // plan is a required enum; "w2" is the closest bucket. The UI shows
      // "Free trial" (not the plan name) because xenditInvoiceId starts FREE-.
      await createTutorSubscription({
        leadId,
        plan: "w2",
        status: "active",
        amount: "0" as any,
        currency: "IDR",
        xenditInvoiceId: `FREE-${nanoid(10)}`,
        startsAt,
        expiresAt,
      });
      return { alreadyActive: false as const, expiresAt };
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

      // Store the recording (best-effort) so the answer is replayable later in
      // the end-of-test summary and in History.
      let audioUrl: string | undefined;
      try {
        const ext = (input.mimeType || "").includes("mp4") ? "mp4" : (input.mimeType || "").includes("wav") ? "wav" : "webm";
        const put = await storagePut(`tutor/speaking/${leadId}/${Date.now()}-q${input.index}.${ext}`, buffer, input.mimeType || "audio/webm");
        audioUrl = `/files/${put.key}`;
      } catch { /* non-critical */ }

      const words = (transcript.match(/\S+/g) || []).length;
      const metrics = computeFluency((tr as any).segments, input.durationSec, words);
      const fb = await evaluateSpeakingQuick(input.question, transcript, input.durationSec, metrics);
      return { transcript, audioUrl, ...fb };
    }),

  /** Finish the test: summarize all answers into a band + recurring mistakes + plan. */
  speakingTestFinish: publicProcedure
    .input(z.object({
      sessionId: z.number(),
      answers: z.array(z.object({
        question: z.string(),
        transcript: z.string(),
        band: z.number(),
        audioUrl: z.string().optional(),
      })).min(1),
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
