/**
 * IGCSE AI Teacher router (mounted as `igcse`).
 *
 * Phase 1 scaffold for the Math 0580 (Extended) tutor experience at /igcse.
 * Reuses the existing student-portal session pattern (cookie → leadId).
 *
 * Endpoints in this scaffold:
 *  - listTopics                 — the Cambridge IGCSE 0580 topic tree
 *  - status                     — is the student signed in? does she have access?
 *  - createSession              — start a lesson on a topic; returns sessionId
 *  - listSessions               — history (most recent first)
 *  - getSession                 — full session record
 *  - endSession                 — mark a session as ended (with duration)
 *  - appendTranscript           — append turns to the live transcript (audio
 *                                 + board updates plug in later in Week 4–6)
 *
 * The voice + whiteboard pipeline (Whisper → DeepSeek V4 → ElevenLabs Flash,
 * tldraw board commands) lands in subsequent commits; this scaffold gives us
 * routes and storage to wire those into.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { and, desc, eq, sql } from "drizzle-orm";

import { router, publicProcedure, adminProcedure } from "./_core/trpc";
import { getDb, getActiveIgcseSubscription, createIgcseSubscription, getIgcseLifetimeSecondsUsed, getLeadById } from "./db";
import { igcseTopics, igcseSessions, igcseExamples, igcseAttempts, igcseAttemptSteps, type IgcseSession } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { IGCSE_PLANS, igcseExternalId, createIgcseInvoice } from "./xenditService";
import { invokeLLM } from "./_core/llm";
import { synthesize as ttsSynthesize } from "./_core/elevenlabs";
import { synthesizeOpenAI } from "./_core/openaiTts";

const FREE_TRIAL_SECONDS = 30 * 60; // 30 minutes lifetime free trial

/**
 * Curated ElevenLabs voices students can pick for the tutor. Each maps to an
 * approximate OpenAI fallback voice (different accents in OpenAI's tts-1)
 * so the fallback feels reasonably close when ElevenLabs credit runs out.
 */
const IGCSE_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — British female", gender: "f", accent: "British", openaiFallback: "shimmer" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — American female", gender: "f", accent: "American", openaiFallback: "nova" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — British male",   gender: "m", accent: "British", openaiFallback: "onyx" },
  { id: "VR6AewLTigWG4xSOukaG", label: "Adam — Australian male",  gender: "m", accent: "Australian", openaiFallback: "echo" },
] as const;
type VoiceId = typeof IGCSE_VOICES[number]["id"];
const DEFAULT_VOICE: VoiceId = "EXAVITQu4vr4xnSDxMaL";

/** Resolve the signed-in student's leadId from the student-portal cookie. */
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
  if (!leadId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in first." });
  return leadId;
}

export const igcseRouter = router({
  /** Voices the student can choose for the tutor. */
  listVoices: publicProcedure.query(async () => {
    return IGCSE_VOICES.map(v => ({ id: v.id, label: v.label, gender: v.gender, accent: v.accent }));
  }),

  /** Public: list every seeded IGCSE topic, optionally filtered by subject. */
  listTopics: publicProcedure
    .input(z.object({ subject: z.enum(["math", "physics", "economics"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = input?.subject
        ? await db.select().from(igcseTopics).where(eq(igcseTopics.subject, input.subject)).orderBy(igcseTopics.sortOrder)
        : await db.select().from(igcseTopics).orderBy(igcseTopics.sortOrder);
      return rows;
    }),

  /** Sign-in + access status: subscription + free-trial counter for the gate. */
  status: publicProcedure.query(async ({ ctx }) => {
    const leadId = await resolveLead(ctx);
    if (!leadId) return { loggedIn: false as const };
    const sub = await getActiveIgcseSubscription(leadId);
    const usedSec = await getIgcseLifetimeSecondsUsed(leadId);
    const freeRemainingSec = Math.max(0, FREE_TRIAL_SECONDS - usedSec);
    return {
      loggedIn: true as const,
      subscription: sub ? { plan: sub.plan, expiresAt: sub.expiresAt, hoursLimit: sub.hoursLimit } : null,
      freeTrial: {
        totalSec: FREE_TRIAL_SECONDS,
        usedSec,
        remainingSec: freeRemainingSec,
      },
      hasAccess: !!sub || freeRemainingSec > 0,
    };
  }),

  /** Create a Xendit invoice for the IGCSE subscription plan; returns the hosted invoice URL. */
  createCheckout: publicProcedure
    .input(z.object({ plan: z.enum(["m1"]).default("m1") }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      if (!ENV.xenditSecretKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payments are not configured yet." });
      }
      const lead = await getLeadById(leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
      const plan = IGCSE_PLANS[input.plan];
      const externalId = igcseExternalId();
      await createIgcseSubscription({
        leadId,
        plan: input.plan,
        status: "pending",
        amount: String(plan.amount) as any,
        currency: "IDR",
        hoursLimit: plan.hoursLimit,
        xenditInvoiceId: externalId,
      });
      // Never redirect a paying customer to localhost if APP_URL is unset.
      const base = ENV.appUrl?.replace(/\/+$/, "")
        || "https://specta-education-production.up.railway.app";
      try {
        const invoice = await createIgcseInvoice({
          externalId,
          plan: input.plan,
          customerName: (lead as any).name || (lead as any).studentName || "Student",
          customerEmail: (lead as any).email || (lead as any).studentEmail,
          customerPhone: (lead as any).phone || (lead as any).studentPhone || undefined,
          successRedirectUrl: `${base}/igcse/app?paid=1`,
          failureRedirectUrl: `${base}/igcse/app?paid=0`,
        });
        return { invoiceUrl: invoice.invoice_url };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  /** Start a new lesson on a topic (or free-form if topicId is omitted). */
  createSession: publicProcedure
    .input(z.object({
      topicId: z.number().int().positive().optional(),
      language: z.enum(["en", "id"]).default("en"),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const r = await db.insert(igcseSessions).values({
        leadId,
        topicId: input.topicId ?? null,
        language: input.language,
        transcript: [] as any,
        boardSnapshot: null,
      });
      const id = (r as any)[0].insertId;
      const [row] = await db.select().from(igcseSessions).where(eq(igcseSessions.id, id)).limit(1);
      return row as IgcseSession;
    }),

  /** A student's lesson history (most recent first). */
  listSessions: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ input, ctx }) => {
      const leadId = await resolveLead(ctx);
      if (!leadId) return [];
      const db = await getDb();
      if (!db) return [];
      return db.select()
        .from(igcseSessions)
        .where(eq(igcseSessions.leadId, leadId))
        .orderBy(desc(igcseSessions.startedAt))
        .limit(input?.limit ?? 20);
    }),

  /** Get one session by id (caller must own it). */
  getSession: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [row] = await db.select().from(igcseSessions)
        .where(and(eq(igcseSessions.id, input.id), eq(igcseSessions.leadId, leadId)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /** Mark a session ended; record duration + accumulated cost so far. */
  endSession: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      durationSec: z.number().int().min(0).max(60 * 60 * 12).optional(),
      costCents: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const patch: any = { status: "ended", endedAt: new Date() };
      if (input.durationSec != null) patch.durationSec = input.durationSec;
      if (input.costCents != null) patch.costCents = input.costCents;
      await db.update(igcseSessions).set(patch)
        .where(and(eq(igcseSessions.id, input.id), eq(igcseSessions.leadId, leadId)));
      return { ok: true as const };
    }),

  /** Append a turn to the live transcript. Lightweight — heavier audio/board
   *  state is persisted by the session room when it lands in later weeks. */
  appendTranscript: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      turn: z.object({
        role: z.enum(["student", "ai", "system"]),
        text: z.string().min(1).max(8000),
        ts: z.number().int().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [row] = await db.select().from(igcseSessions)
        .where(and(eq(igcseSessions.id, input.id), eq(igcseSessions.leadId, leadId)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const existing = (row.transcript as any[]) || [];
      const updated = [...existing, { ...input.turn, ts: input.turn.ts ?? Date.now() }];
      await db.update(igcseSessions).set({ transcript: updated as any })
        .where(eq(igcseSessions.id, input.id));
      return { ok: true as const, count: updated.length };
    }),

  /**
   * Student sends a message in a lesson — DeepSeek replies with topic-grounded
   * Cambridge IGCSE Math teaching. Persists both turns to the transcript and
   * updates the running duration so the free-trial counter ticks accurately
   * even if the student closes the tab without ending the session.
   *
   * Whiteboard "board commands" and voice are layered on in Weeks 4–6.
   */
  sendMessage: publicProcedure
    .input(z.object({
      sessionId: z.number().int().positive(),
      message: z.string().min(1).max(4000),
      elapsedSec: z.number().int().min(0).max(60 * 60 * 12).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Load session + topic
      const [session] = await db.select().from(igcseSessions)
        .where(and(eq(igcseSessions.id, input.sessionId), eq(igcseSessions.leadId, leadId)))
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });

      let topic: any = null;
      if (session.topicId) {
        const [t] = await db.select().from(igcseTopics).where(eq(igcseTopics.id, session.topicId)).limit(1);
        topic = t || null;
      }

      // Pull up to 3 curated Cambridge-style exemplars for this topic. The AI
      // uses them as grounding so it teaches in real exam style + marks the way
      // an examiner would. Random ordering each turn so we don't always cite
      // the same one if the student keeps asking related questions.
      let exemplars: any[] = [];
      if (topic?.code) {
        const all = await db.select().from(igcseExamples)
          .where(eq(igcseExamples.topicCode, topic.code));
        exemplars = all.sort(() => Math.random() - 0.5).slice(0, 3);
      }

      // Gate: must have access (active subscription OR free-trial time remaining).
      const sub = await getActiveIgcseSubscription(leadId);
      if (!sub) {
        const used = await getIgcseLifetimeSecondsUsed(leadId);
        if (used >= FREE_TRIAL_SECONDS) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Your 30-minute free trial is done — subscribe to keep learning." });
        }
      }

      const lang = session.language === "id" ? "id" : "en";
      // Last 20 turns, but skip our own "Sorry — I got distracted" fallbacks so
      // the model isn't taught to keep apologising once one slips in.
      const history = (((session.transcript as any[]) || [])
        .filter((t: any) => {
          if (t.role !== "ai") return true;
          const tx = String(t.text || "");
          return !tx.startsWith("Sorry — I got distracted") && !tx.startsWith("Maaf — koneksiku terputus");
        }))
        .slice(-20);

      // Pedagogy system prompt — grounded in the Cambridge topic's LO PLUS
      // a handful of curated exam-style exemplars (Week 7 RAG). The AI uses
      // them so its working + mark-scheme commentary match what an examiner
      // would actually award in Paper 2 / Paper 4.
      const exemplarsBlock = exemplars.length
        ? `\n\nCAMBRIDGE-STYLE EXAM EXEMPLARS for this topic (use as guidance for question style and how the exam awards marks — DO NOT just copy them verbatim; refer to them when teaching the technique):\n\n${exemplars
            .map((e, i) => `Exemplar ${i + 1} (${e.marks} marks${e.source ? ", " + e.source : ""}):\nQuestion:\n${e.question}\n\nMark scheme (Cambridge convention: M = method, A = accuracy, B = independent, FT = follow-through):\n${e.markScheme}`)
            .join("\n\n---\n\n")}\n`
        : "";

      const subject: "math" | "physics" | "economics" =
        topic?.subject === "physics" ? "physics"
        : topic?.subject === "economics" ? "economics"
        : "math";
      const syllabusCode = subject === "physics" ? "0625" : subject === "economics" ? "0455" : "0580";
      const subjectIntro =
        subject === "physics"   ? `You are an experienced Cambridge IGCSE Physics tutor for syllabus 0625 (Extended tier).`
      : subject === "economics" ? `You are an experienced Cambridge IGCSE Economics tutor for syllabus 0455.`
      :                           `You are an experienced Cambridge IGCSE Mathematics tutor for syllabus 0580 (Extended tier).`;
      const physicsConventions = subject === "physics" ? `
PHYSICS-SPECIFIC CONVENTIONS (apply throughout):
- ALWAYS state SI units in final answers (m, kg, s, N, J, W, A, V, Ω, Pa, Hz, etc.). A numerical answer without units loses the answer mark.
- Quote final answers to 2 or 3 significant figures unless the question says otherwise.
- Use g = 9.8 N/kg (or 10 N/kg if the question specifies). Speed of sound ≈ 340 m/s in air. Speed of light c = 3 × 10⁸ m/s.
- Key formulas: F = ma, W = mg, ρ = m/V, p = F/A, p = ρgh, Q = It, V = IR, P = IV, ΔE = mcΔθ, KE = ½mv², ΔGPE = mgΔh, v = fλ, n = sin i / sin r, sin c = 1/n, Vₚ/Vₛ = Nₚ/Nₛ.
- Vector quantities (force, velocity, momentum) need a direction stated.
- Show working an examiner can mark: write the formula, substitute values, then evaluate.
- For graphs, the gradient and area under the line usually have physical meaning (e.g. v–t graph: gradient = acceleration, area = distance).
` : "";
      const economicsConventions = subject === "economics" ? `
ECONOMICS-SPECIFIC CONVENTIONS (apply throughout):
- Cambridge IGCSE Economics is mostly DEFINITIONS + DIAGRAMS + EVALUATION — almost no calculations.
- Train the student on COMMAND WORDS — they signal the mark count:
    "Define" / "State" → 2 marks (give the precise definition; one mark per accurate part).
    "Identify" / "Give an example" → 1 mark each.
    "Explain" → 4 marks (define + apply + show cause→effect).
    "Analyse" → 6 marks (multiple cause→effect chains; use linking words: "this leads to…", "as a result…").
    "Discuss" / "Evaluate" / "To what extent…" → 8 marks (BOTH SIDES + JUSTIFIED CONCLUSION).
- Mark scheme uses ASSESSMENT OBJECTIVES (AOs):
    AO1 Knowledge (state/define)
    AO2 Application (use the data / context in the question)
    AO3 Analysis (cause→effect chains)
    AO4 Evaluation (judgment + conclusion)
- For an 8-mark "Discuss" question, you MUST give arguments FOR and arguments AGAINST, then conclude. One-sided answers max out around L2.
- Diagrams are essential — encourage demand/supply diagrams (with shifts vs movements clearly distinguished), PPC diagrams, cost curves. Label axes (price/quantity, etc.), curves (D, S), and equilibria (P*, Q*).
- Apply economic theory to REAL-WORLD context whenever the question mentions a specific country, industry, or product. Generic answers lose application marks.
- Use precise terminology: "ceteris paribus", "aggregate demand", "elastic vs inelastic", "real vs nominal", "appreciation vs depreciation". Define jargon when you use it.
` : "";

      const sysPrompt = `${subjectIntro}
${topic ? `You are teaching: ${topic.title} (Topic ${topic.code}, Area: ${topic.areaName}).

Cambridge syllabus learning outcomes for this topic:
${topic.learningOutcomes || "(general topic — guide the student through key skills.)"}` : `The student hasn't picked a specific topic yet — help them pick one from the IGCSE ${syllabusCode} Extended syllabus.`}
${physicsConventions}${economicsConventions}${exemplarsBlock}
Your teaching style:
- Patient, encouraging private tutor. Never condescending.
- Socratic: ask a question or check understanding BEFORE explaining; let the student think.
- When solving, show step-by-step working — small steps, each on its own board line.
- When a student makes a mistake, point to WHERE the slip happened and ask them to retry before giving the answer.
- Celebrate progress in one short line ("Nice — that's the right move.").
- If they go off-topic, gently bring them back to ${topic?.title || "the current topic"}.

EXAM-AWARE pedagogy (Week 7):
- Talk to the student about how the exam awards marks. When a question is worth N marks, briefly explain what each mark is for (e.g. "1 mark for the right method, 2 for the answer"). Use Cambridge's convention: M = method, A = accuracy, B = independent, FT = follow-through.
- Flag the common student traps the exemplar mark schemes highlight (e.g. forgetting to reverse the inequality, treating reverse-percentage as a normal percentage, dropping the base of a cone).
- When the student asks for "a practice question" or "give me an exam-style question", pose one that mirrors the EXEMPLAR style above — but vary the numbers / context. Never copy an exemplar verbatim back at them.
- Don't pretend to quote specific past papers verbatim. You may say "this is the type of question that comes up in Paper 2" or "Paper 4 likes to test this with…".

Language: respond in ${lang === "id" ? "Bahasa Indonesia, naturally and warmly" : "clear English"}.

OUTPUT FORMAT — return a SINGLE JSON object with this exact shape (no extra text):
{
  "speech": "<2–3 short sentences you would SAY OUT LOUD to the student — conversational, drip-feed, ask back when natural>",
  "board": [ <ordered list of board commands you would WRITE on the board, can be empty for purely conversational turns> ]
}

Each board command is one of:
  { "type": "title", "text": "<the heading for this step or problem>" }
  { "type": "text",  "text": "<a short prose label, e.g. 'So we use the quadratic formula'>" }
  { "type": "step",  "n": <integer step number>, "text": "<one-line description of what we're doing this step>" }
  { "type": "equation", "latex": "<a single equation in valid LaTeX, e.g. x^{2} + 5x + 6 = 0>" }
  { "type": "number_line", "from": <number>, "to": <number>, "marks": [ { "x": <number>, "label": "<short>" }, … ] }
  { "type": "triangle", "sides": { "a": <number>, "b": <number>, "c": <number> }, "labels": { "a": "<e.g. 3 cm>", "b": "<>", "c": "<>", "A": "<angle at vertex A, e.g. 90°>", "B": "<>", "C": "<>" } }
  { "type": "axes",
      "xRange": [<min>, <max>], "yRange": [<min>, <max>],
      "title": "<optional short>",
      "points":    [ { "x": <num>, "y": <num>, "label": "<optional>" }, … ],
      "lines":     [ { "x1": <num>, "y1": <num>, "x2": <num>, "y2": <num>, "label": "<optional>" }, … ],
      "functions": [ { "kind": "linear",    "m": <num>, "c": <num>, "label": "<optional>" }
                   | { "kind": "quadratic", "a": <num>, "b": <num>, "c": <num>, "label": "<optional>" }
                   , … ]
  }

When to USE diagrams (don't force them, but reach for them when they teach):
- number_line for inequalities, signed numbers, intervals, set ranges.
- triangle for trig / Pythagoras / geometry. Side labels include units; angles are degrees.
- axes for coordinate geometry, plotting linear/quadratic functions, transformations, and "sketch the curve" questions.
- For function plots, prefer "functions" (we plot exactly); use "lines" for arbitrary segments and "points" to mark intercepts or solutions.

LaTeX rules (IMPORTANT — equations render with KaTeX):
- Always use proper LaTeX. NEVER write plain "x^2" — write "x^{2}".
- Fractions: \\frac{a}{b}. Square roots: \\sqrt{x} or \\sqrt[3]{x}. Greek letters: \\pi, \\theta, \\alpha.
- Subscripts: x_{1}. Multiplication: use a space, or \\cdot. Equal-or-greater: \\geq, \\leq, \\neq.
- For a system or "x = … or x = …", inline it as one equation: x = -2 \\;\\text{or}\\; x = -3.
- Keep each equation to ONE LINE. Break multi-step working into multiple equation commands so the student sees it build up.

Rules:
- For conversational turns (greetings, "I understand", "yes that's right"), keep \`board\` empty.
- For teaching/solving, drip-feed: 3–8 board items per turn is plenty. Don't dump 20 lines at once.
- Don't invent verbatim past-paper questions — describe the type of question instead.
- Never produce ANY text outside the JSON object. JSON only.`;

      const messages = [
        { role: "system" as const, content: sysPrompt },
        ...history.map((t: any) => {
          // Replay assistant turns as the JSON STRUCTURE the model originally
          // produced. Without this, the model sees its prior replies as plain
          // prose and abandons the JSON output contract on the next turn —
          // returning {} or empty fields, which triggered our fallback. This
          // keeps the conversation pattern consistent end-to-end.
          if (t.role === "ai") {
            return {
              role: "assistant" as const,
              content: JSON.stringify({
                speech: t.text || "",
                board: Array.isArray(t.board) ? t.board : [],
              }),
            };
          }
          return {
            role: (t.role === "student" ? "user" : "system") as "user" | "system",
            content: String(t.text || ""),
          };
        }),
        { role: "user" as const, content: input.message },
      ];

      let speech = "";
      let boardOut: any[] = [];
      try {
        const res: any = await invokeLLM({
          messages,
          response_format: { type: "json_object" as const },
        });
        const c = res?.choices?.[0]?.message?.content;
        const rawText = (typeof c === "string" ? c : "").trim();
        let parsed: any = {};
        try {
          // Strip ```json fences if present (some models add them).
          const clean = rawText.replace(/^```json\s*|\s*```$/g, "").trim();
          parsed = JSON.parse(clean);
        } catch {
          // Fallback: treat the whole response as speech, no board.
          parsed = { speech: rawText, board: [] };
        }
        speech = String(parsed.speech || "").trim();
        if (Array.isArray(parsed.board)) {
          boardOut = parsed.board.filter((b: any) =>
            b && typeof b === "object" && typeof b.type === "string"
          ).slice(0, 30); // safety cap
        }
        // Last-resort: if the model returned valid JSON with everything empty
        // BUT we still got some raw text, use that as speech rather than the
        // generic apology — better to show the model's actual words than to
        // fall back blindly.
        if (!speech && !boardOut.length && rawText && rawText !== "{}") {
          console.warn("[IGCSE] empty parsed reply — falling back to rawText:", rawText.slice(0, 200));
          speech = rawText.slice(0, 1500);
        }
        if (!speech && !boardOut.length) {
          speech = lang === "id"
            ? "Maaf — koneksiku terputus sebentar. Bisa ulangi pertanyaannya?"
            : "Sorry — I got distracted. Could you say that again?";
        }
      } catch (e) {
        console.error("[IGCSE] sendMessage LLM error:", e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The tutor couldn't respond. Please try again." });
      }

      // Persist transcript + appended board commands + duration.
      const now = Date.now();
      const updatedTranscript = [
        ...((session.transcript as any[]) || []),
        { role: "student", text: input.message, ts: now },
        { role: "ai", text: speech, board: boardOut, ts: now + 1 },
      ];
      const existingBoard: any[] = Array.isArray(session.boardSnapshot) ? (session.boardSnapshot as any[]) : [];
      const newBoard = [...existingBoard, ...boardOut.map(b => ({ ...b, _at: now + 1 }))].slice(-200);
      const patch: any = { transcript: updatedTranscript, boardSnapshot: newBoard };
      if (input.elapsedSec != null && input.elapsedSec > (session.durationSec || 0)) {
        patch.durationSec = input.elapsedSec;
      }
      await db.update(igcseSessions).set(patch).where(eq(igcseSessions.id, input.sessionId));

      return { speech, board: boardOut, turns: updatedTranscript.length };
    }),

  /** Change the session's language mid-lesson. Drives both the AI's response
   *  language (system prompt branches on session.language) and the client's
   *  SpeechRecognition language. */
  updateSessionLanguage: publicProcedure
    .input(z.object({ id: z.number().int().positive(), language: z.enum(["en", "id"]) }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(igcseSessions).set({ language: input.language })
        .where(and(eq(igcseSessions.id, input.id), eq(igcseSessions.leadId, leadId)));
      return { ok: true as const, language: input.language };
    }),

  /**
   * Synthesize the AI tutor's spoken reply via ElevenLabs Flash v2.5 (low
   * latency, multilingual — supports English + Bahasa Indonesia). Returns
   * base64-encoded mp3 the client decodes and plays. Owner-scoped to the
   * session so it can't be abused as a free TTS endpoint.
   */
  synthesizeSpeech: publicProcedure
    .input(z.object({
      sessionId: z.number().int().positive(),
      text: z.string().min(1).max(2000),
      /** ElevenLabs voice id from listVoices; defaults to Sarah. */
      voiceId: z.string().max(64).optional(),
      /** Playback speed (~0.8–1.3). Default 1.1 — faster than out-of-the-box. */
      speed: z.number().min(0.7).max(1.3).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [session] = await db.select().from(igcseSessions)
        .where(and(eq(igcseSessions.id, input.sessionId), eq(igcseSessions.leadId, leadId)))
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      // Fallback chain: ElevenLabs (best quality) → OpenAI (cheap, still great)
      // → throw (client then falls back to browser-native SpeechSynthesis).
      const charCount = input.text.length;
      const requestedVoiceId = (IGCSE_VOICES.find(v => v.id === input.voiceId)?.id) ?? DEFAULT_VOICE;
      const speed = input.speed ?? 1.1;
      const voiceMeta = IGCSE_VOICES.find(v => v.id === requestedVoiceId) ?? IGCSE_VOICES[0];

      // 1) ElevenLabs Flash v2.5 — multilingual, low first-byte latency.
      try {
        console.log(`[IGCSE] TTS via ElevenLabs voice=${voiceMeta.label} speed=${speed} (${charCount} chars)`);
        const buf = await ttsSynthesize({
          text: input.text,
          modelId: "eleven_flash_v2_5",
          voiceId: requestedVoiceId,
          stability: 0.5,
          similarityBoost: 0.75,
          speed,
        });
        return { audioBase64: buf.toString("base64"), mimeType: "audio/mpeg", source: "elevenlabs" as const };
      } catch (elevenError) {
        console.warn(`[IGCSE] ElevenLabs failed — falling back to OpenAI: ${(elevenError as Error).message}`);
      }

      // 2) OpenAI tts-1 — pick a voice that roughly matches the requested
      //    gender/accent so the fallback doesn't sound jarringly different.
      try {
        console.log(`[IGCSE] TTS via OpenAI voice=${voiceMeta.openaiFallback} speed=${speed} (${charCount} chars)`);
        const buf = await synthesizeOpenAI({
          text: input.text,
          model: "tts-1",
          voice: voiceMeta.openaiFallback as any,
          format: "mp3",
          speed,
        });
        return { audioBase64: buf.toString("base64"), mimeType: "audio/mpeg", source: "openai" as const };
      } catch (openaiError) {
        console.error(`[IGCSE] OpenAI TTS also failed: ${(openaiError as Error).message}`);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Voice unavailable: ${(openaiError as Error).message}`,
        });
      }
    }),

  // ────────────────────────────────────────────────────────────────────────────
  // EXAM PRACTICE (Week 8) — students attempt curated exam-style questions and
  // the AI coaches them Socratically: it grades each step, gives hint-tiered
  // nudges when wrong, and NEVER hands them the answer until they ask for the
  // mark scheme reveal at the end.
  // ────────────────────────────────────────────────────────────────────────────

  /** Public: list available exam-practice questions, optionally filtered by
   *  topic and/or subject. Excludes private user-pasted custom questions.
   *  Subject is inferred from the topicCode prefix:
   *    "P*" → physics, "E*" → economics, otherwise → math. */
  listExamples: publicProcedure
    .input(z.object({
      topicCode: z.string().max(16).optional(),
      subject: z.enum(["math", "physics", "economics"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = input?.topicCode
        ? await db.select().from(igcseExamples).where(eq(igcseExamples.topicCode, input.topicCode))
        : await db.select().from(igcseExamples);
      const subjectOf = (code: string): "physics" | "economics" | "math" =>
        code.startsWith("P") ? "physics" : code.startsWith("E") ? "economics" : "math";
      return rows
        .filter(r => !String(r.source || "").startsWith("custom-"))
        .filter(r => !input?.subject || subjectOf(r.topicCode) === input.subject)
        .sort((a, b) => a.topicCode.localeCompare(b.topicCode) || a.sortOrder - b.sortOrder)
        .map(r => ({
          id: r.id,
          topicCode: r.topicCode,
          marks: r.marks,
          question: r.question,
          source: r.source,
          tier: r.tier,
        }));
    }),

  /** Student's recent attempts (with example meta), most recent first. */
  listAttempts: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
    .query(async ({ input, ctx }) => {
      const leadId = await resolveLead(ctx);
      if (!leadId) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(igcseAttempts)
        .where(eq(igcseAttempts.leadId, leadId))
        .orderBy(desc(igcseAttempts.startedAt))
        .limit(input?.limit ?? 30);
      return rows;
    }),

  /** Start a new attempt on a specific exam-style question. */
  startAttempt: publicProcedure
    .input(z.object({ exampleId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Gate: must have access.
      const sub = await getActiveIgcseSubscription(leadId);
      if (!sub) {
        const used = await getIgcseLifetimeSecondsUsed(leadId);
        if (used >= FREE_TRIAL_SECONDS) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Your 30-minute free trial is done — subscribe to keep practising." });
        }
      }

      const [ex] = await db.select().from(igcseExamples).where(eq(igcseExamples.id, input.exampleId));
      if (!ex) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

      const result: any = await db.insert(igcseAttempts).values({
        leadId,
        exampleId: ex.id,
        topicCode: ex.topicCode,
        marks: ex.marks,
        status: "in_progress",
      });
      const attemptId = Number(result?.insertId ?? result?.[0]?.insertId ?? 0);

      const opening = `This question is worth **${ex.marks} mark${ex.marks === 1 ? "" : "s"}**. Read it carefully, then show me your first step. I'll guide you — but I won't hand you the answer.`;
      await db.insert(igcseAttemptSteps).values({
        attemptId,
        role: "tutor",
        text: opening,
        verdict: "none",
      });

      return { attemptId, question: ex.question, marks: ex.marks, topicCode: ex.topicCode, opening };
    }),

  /** Fetch the full attempt with all steps (for resume / detail view). */
  getAttempt: publicProcedure
    .input(z.object({ attemptId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [att] = await db.select().from(igcseAttempts)
        .where(and(eq(igcseAttempts.id, input.attemptId), eq(igcseAttempts.leadId, leadId)));
      if (!att) throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found" });
      const [ex] = await db.select().from(igcseExamples).where(eq(igcseExamples.id, att.exampleId));
      const steps = await db.select().from(igcseAttemptSteps)
        .where(eq(igcseAttemptSteps.attemptId, input.attemptId))
        .orderBy(igcseAttemptSteps.id);
      return {
        attempt: att,
        question: ex?.question || "",
        marks: ex?.marks || 0,
        topicCode: att.topicCode,
        // markScheme is only sent if the attempt has been completed or revealed.
        markScheme: (att.status === "completed" || att.revealed === 1) ? (ex?.markScheme || "") : "",
        steps,
      };
    }),

  /**
   * Student submits a working step. AI grades it Socratically:
   *  - verdict ∈ {correct, partial, wrong}
   *  - reply NEVER contains the next numeric answer — it asks a probing
   *    question or points at the misconception.
   *  - only when the student has actually finished (all marks earned or
   *    they ask to reveal) does the full mark scheme appear.
   */
  submitStep: publicProcedure
    .input(z.object({
      attemptId: z.number().int().positive(),
      text: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [att] = await db.select().from(igcseAttempts)
        .where(and(eq(igcseAttempts.id, input.attemptId), eq(igcseAttempts.leadId, leadId)));
      if (!att) throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found" });
      if (att.status !== "in_progress") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This attempt is already completed." });
      }

      const [ex] = await db.select().from(igcseExamples).where(eq(igcseExamples.id, att.exampleId));
      if (!ex) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

      // Persist student step first.
      await db.insert(igcseAttemptSteps).values({
        attemptId: input.attemptId,
        role: "student",
        text: input.text,
        verdict: "none",
      });

      // Load the running conversation (last 30 steps to cap tokens).
      const prior = await db.select().from(igcseAttemptSteps)
        .where(eq(igcseAttemptSteps.attemptId, input.attemptId))
        .orderBy(igcseAttemptSteps.id);
      const history = prior.slice(-30);

      const hasOfficialScheme = !!(ex.markScheme && ex.markScheme.trim().length > 0);
      const code = String(ex.topicCode || "");
      const isPhysics = code.startsWith("P");
      const isEconomics = code.startsWith("E");
      const subjectLabel = isPhysics ? "Physics (0625 Extended)" : isEconomics ? "Economics (0455)" : "Math (0580 Extended)";
      const sysPrompt = [
        `You are a Cambridge IGCSE ${subjectLabel} exam coach.`,
        "The student is attempting a real exam-style question. Your job is to GUIDE them to the answer, never hand it to them.",
        ...(isPhysics ? [
          "",
          "PHYSICS RULES: insist on SI units in final answers (no units → loses the A mark). Quote answers to 2-3 s.f. Vectors need a direction. Always require: formula → substitution → evaluation.",
        ] : []),
        ...(isEconomics ? [
          "",
          "ECONOMICS RULES: use Cambridge command-word convention. Make sure the student knows what the command word demands (Define→2, Identify→1, Explain→4, Analyse→6, Discuss/Evaluate→8). For 'Discuss/Evaluate', insist on BOTH SIDES + a justified CONCLUSION — one-sided answers cap at L2. Push for ANALYSIS chains (\"this leads to… because…\") not just lists. For diagram-required questions, ask them to describe the diagram if they can't sketch (axes labelled, curves labelled, equilibrium marked, shifts explained).",
        ] : []),
        "",
        "QUESTION:",
        ex.question,
        "",
        `MARKS: ${ex.marks}`,
        "",
        hasOfficialScheme
          ? "FULL MARK SCHEME (FOR YOUR EYES ONLY — DO NOT QUOTE OR REVEAL VERBATIM):\n" + ex.markScheme
          : "NOTE: This is a question the student pasted in (e.g. from a Cambridge specimen paper). You do NOT have the official mark scheme. Coach using your knowledge of standard Cambridge IGCSE 0580 marking: identify likely method marks (M), accuracy marks (A), and independent marks (B), and estimate how the marks would be allocated. Be conservative — say so if you're unsure which technique the examiner expects.",
        "",
        "RULES — these are non-negotiable:",
        "1. NEVER state the final numeric answer or any intermediate numeric answer the mark scheme uses.",
        "2. NEVER copy the mark scheme text into your reply.",
        "3. If the student's step is correct → confirm briefly (e.g. \"✅ That's the method mark — you've earned M1. What's your next step?\") and ask for the next step.",
        "4. If the student's step is partially right → confirm the correct part, point at what's missing, ask a leading question. Do NOT give the missing piece directly.",
        "5. If the student's step is wrong → DO NOT correct them with the right number. Instead ask a probing question that exposes the misconception. Examples: \"What does 'reduced by 18%' tell us about the relationship between sale price and original price?\" or \"Are you sure 0.82 of the original equals the sale price, or is it the other way round?\"",
        "6. If the student has now produced the correct final answer (matching the mark scheme, or a mathematically correct answer if no scheme is provided) → CONGRATULATE them, summarise which M / A marks they earned, and set complete=true. DO NOT keep asking for more steps.",
        "7. If the student says they're stuck, give them a HINT (not the answer). Hints escalate in tiers — start with a conceptual nudge, never a numeric one.",
        "",
        "Output STRICT JSON only — no prose, no fences:",
        '{ "verdict": "correct" | "partial" | "wrong" | "hint", "reply": "<your Socratic reply>", "marksEarned": <integer or null>, "complete": <true|false> }',
        "",
        "verdict meaning:",
        "  correct = this step is a fully valid method/answer mark line",
        "  partial = step is on the right track but missing something",
        "  wrong   = step contains a real error",
        "  hint    = student asked for a hint or got stuck",
        "",
        "Set complete=true ONLY when the student has reached the final answer the mark scheme expects.",
        "When complete=true, marksEarned MUST be the number of marks the student has demonstrably earned (0–" + ex.marks + ").",
      ].join("\n");

      const messages = [
        { role: "system" as const, content: sysPrompt },
        ...history.map(h => ({
          role: (h.role === "student" ? "user" : "system") as "user" | "system",
          content: h.role === "tutor" ? `Previous tutor reply: ${h.text}` : h.text,
        })),
      ];

      let verdict: "correct" | "partial" | "wrong" | "hint" = "partial";
      let reply = "Could you walk me through that step again?";
      let complete = false;
      let marksEarned: number | null = null;
      try {
        const res: any = await invokeLLM({
          messages,
          response_format: { type: "json_object" as const },
        });
        const c = res?.choices?.[0]?.message?.content;
        const raw = (typeof c === "string" ? c : "").trim();
        const clean = raw.replace(/^```json\s*|\s*```$/g, "").trim();
        const parsed = JSON.parse(clean);
        if (typeof parsed.reply === "string" && parsed.reply.trim()) reply = parsed.reply.trim();
        if (["correct", "partial", "wrong", "hint"].includes(parsed.verdict)) verdict = parsed.verdict;
        complete = !!parsed.complete;
        if (parsed.marksEarned != null && Number.isFinite(Number(parsed.marksEarned))) {
          marksEarned = Math.max(0, Math.min(ex.marks, Math.round(Number(parsed.marksEarned))));
        }
      } catch (e) {
        console.error("[IGCSE] submitStep LLM error:", (e as Error).message);
      }

      // Persist tutor reply.
      await db.insert(igcseAttemptSteps).values({
        attemptId: input.attemptId,
        role: "tutor",
        text: reply,
        verdict,
      });

      // If marked complete, finalise the attempt.
      if (complete) {
        await db.update(igcseAttempts).set({
          status: "completed",
          marksEarned: marksEarned ?? ex.marks,
          completedAt: new Date(),
        }).where(eq(igcseAttempts.id, input.attemptId));
      }

      return {
        verdict,
        reply,
        complete,
        marksEarned,
        // Only ship the full mark scheme when the attempt is genuinely complete.
        markScheme: complete ? ex.markScheme : "",
      };
    }),

  /** Student asks for a hint. Increments the hint counter and asks the LLM
   *  for a tier-appropriate nudge (escalates with each request). */
  requestHint: publicProcedure
    .input(z.object({ attemptId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [att] = await db.select().from(igcseAttempts)
        .where(and(eq(igcseAttempts.id, input.attemptId), eq(igcseAttempts.leadId, leadId)));
      if (!att) throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found" });
      if (att.status !== "in_progress") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This attempt is already completed." });
      }
      const [ex] = await db.select().from(igcseExamples).where(eq(igcseExamples.id, att.exampleId));
      if (!ex) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

      const tier = Math.min((att.hintsUsed ?? 0) + 1, 3); // 1, 2, 3 (cap at 3)
      const tierGuide = tier === 1
        ? "TIER 1 — gentle conceptual nudge. Point at the topic / formula / idea they should consider. NO numbers."
        : tier === 2
          ? "TIER 2 — clearer hint. Name the specific technique and the FIRST line of working they should set up. Still no final number."
          : "TIER 3 — strong scaffolding. Walk through the structure of the solution, but with placeholders or with the technique only — DO NOT give the final numeric answer.";

      const prior = await db.select().from(igcseAttemptSteps)
        .where(eq(igcseAttemptSteps.attemptId, input.attemptId))
        .orderBy(igcseAttemptSteps.id);
      const history = prior.slice(-20);

      const hintCode = String(ex.topicCode || "");
      const isPhysicsHint = hintCode.startsWith("P");
      const isEconomicsHint = hintCode.startsWith("E");
      const subjectLabelHint = isPhysicsHint ? "Physics (0625 Extended)" : isEconomicsHint ? "Economics (0455)" : "Math (0580 Extended)";
      const sysPrompt = [
        `You are a Cambridge IGCSE ${subjectLabelHint} exam coach. The student has asked for a hint.`,
        "",
        "QUESTION:",
        ex.question,
        "",
        "MARK SCHEME (FOR YOUR EYES ONLY — DO NOT REVEAL THE FINAL NUMERIC ANSWER):",
        ex.markScheme,
        "",
        tierGuide,
        "",
        "Output STRICT JSON only:",
        '{ "reply": "<your hint, friendly, in 1-3 sentences>" }',
      ].join("\n");

      const messages = [
        { role: "system" as const, content: sysPrompt },
        ...history.map(h => ({
          role: (h.role === "student" ? "user" : "system") as "user" | "system",
          content: h.role === "tutor" ? `Previous tutor reply: ${h.text}` : h.text,
        })),
        { role: "user" as const, content: `Please give me a tier-${tier} hint.` },
      ];

      let reply = "Think about what the question is asking you to find first, then identify which IGCSE topic it belongs to.";
      try {
        const res: any = await invokeLLM({
          messages,
          response_format: { type: "json_object" as const },
        });
        const c = res?.choices?.[0]?.message?.content;
        const raw = (typeof c === "string" ? c : "").trim();
        const clean = raw.replace(/^```json\s*|\s*```$/g, "").trim();
        const parsed = JSON.parse(clean);
        if (typeof parsed.reply === "string" && parsed.reply.trim()) reply = parsed.reply.trim();
      } catch (e) {
        console.error("[IGCSE] requestHint LLM error:", (e as Error).message);
      }

      await db.insert(igcseAttemptSteps).values({
        attemptId: input.attemptId,
        role: "tutor",
        text: `💡 Hint (tier ${tier}): ${reply}`,
        verdict: "hint",
      });
      await db.update(igcseAttempts)
        .set({ hintsUsed: tier })
        .where(eq(igcseAttempts.id, input.attemptId));

      return { reply, tier };
    }),

  /** Student gives up and asks for the mark scheme. Marks the attempt as
   *  revealed (still counts as completed) and returns the full scheme. */
  revealMarkScheme: publicProcedure
    .input(z.object({ attemptId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [att] = await db.select().from(igcseAttempts)
        .where(and(eq(igcseAttempts.id, input.attemptId), eq(igcseAttempts.leadId, leadId)));
      if (!att) throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found" });
      const [ex] = await db.select().from(igcseExamples).where(eq(igcseExamples.id, att.exampleId));
      if (!ex) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

      await db.insert(igcseAttemptSteps).values({
        attemptId: input.attemptId,
        role: "system",
        text: ex.markScheme,
        verdict: "reveal",
      });
      await db.update(igcseAttempts).set({
        status: "completed",
        revealed: 1,
        marksEarned: att.marksEarned ?? 0,
        completedAt: new Date(),
      }).where(eq(igcseAttempts.id, input.attemptId));

      return { markScheme: ex.markScheme };
    }),

  /**
   * Custom-question attempt (Path B closure): the student pastes a question
   * — typically from a Cambridge specimen paper — and we start a Socratic
   * coaching attempt without an official mark scheme. The prompt switches
   * to "no scheme provided" mode and the AI coaches using general 0580
   * marking principles.
   *
   * Stored as a private igcse_examples row tagged source=`custom-${leadId}`
   * with an empty markScheme. listExamples filters these out so they don't
   * appear in the public bank.
   */
  startCustomAttempt: publicProcedure
    .input(z.object({
      question: z.string().min(10).max(2000),
      marks: z.number().int().min(1).max(20),
      topicCode: z.string().max(16).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const leadId = requireLead(await resolveLead(ctx));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Gate: must have access.
      const sub = await getActiveIgcseSubscription(leadId);
      if (!sub) {
        const used = await getIgcseLifetimeSecondsUsed(leadId);
        if (used >= FREE_TRIAL_SECONDS) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Your 30-minute free trial is done — subscribe to keep practising." });
        }
      }

      // Create a private example row tagged to this student.
      const insExample: any = await db.insert(igcseExamples).values({
        topicCode: input.topicCode || "custom",
        syllabus: "CIE_0580",
        tier: "extended" as const,
        marks: input.marks,
        question: input.question.trim(),
        markScheme: "", // empty → submitStep switches to "no official scheme" coaching mode
        source: `custom-${leadId}`,
        sortOrder: 0,
      });
      const exampleId = Number(insExample?.insertId ?? insExample?.[0]?.insertId ?? 0);

      const insAttempt: any = await db.insert(igcseAttempts).values({
        leadId,
        exampleId,
        topicCode: input.topicCode || "custom",
        marks: input.marks,
        status: "in_progress",
      });
      const attemptId = Number(insAttempt?.insertId ?? insAttempt?.[0]?.insertId ?? 0);

      const opening = `I don't have an official mark scheme for this one — but I'll coach you through it using standard Cambridge 0580 marking. This question is worth **${input.marks} mark${input.marks === 1 ? "" : "s"}**. Show me your first step.`;
      await db.insert(igcseAttemptSteps).values({
        attemptId,
        role: "tutor",
        text: opening,
        verdict: "none",
      });

      return { attemptId, exampleId, opening };
    }),

  /**
   * Per-topic weakness summary for the signed-in student. Returns the
   * topics where they're scoring below 50% (or have never tried), ranked by
   * total marks lost. The /igcse/practice page uses this to surface
   * "🎯 Focus areas: try these 3 questions next" suggestions.
   */
  weaknesses: publicProcedure.query(async ({ ctx }) => {
    const leadId = await resolveLead(ctx);
    if (!leadId) return { ranked: [], totalAttempted: 0, completed: 0 };
    const db = await getDb();
    if (!db) return { ranked: [], totalAttempted: 0, completed: 0 };

    const atts = await db.select().from(igcseAttempts).where(eq(igcseAttempts.leadId, leadId));
    if (!atts.length) return { ranked: [], totalAttempted: 0, completed: 0 };

    // Aggregate per topic: total marks attempted, marks earned, attempts count.
    const byTopic = new Map<string, { topicCode: string; attempts: number; marksAttempted: number; marksEarned: number; revealed: number; lastAt: number }>();
    for (const a of atts) {
      const t = byTopic.get(a.topicCode) || { topicCode: a.topicCode, attempts: 0, marksAttempted: 0, marksEarned: 0, revealed: 0, lastAt: 0 };
      t.attempts += 1;
      if (a.status === "completed") {
        t.marksAttempted += a.marks;
        t.marksEarned += (a.marksEarned ?? 0);
        if (a.revealed === 1) t.revealed += 1;
      }
      const startedTs = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      if (startedTs > t.lastAt) t.lastAt = startedTs;
      byTopic.set(a.topicCode, t);
    }

    const ranked = Array.from(byTopic.values())
      .map(t => ({
        ...t,
        accuracy: t.marksAttempted > 0 ? t.marksEarned / t.marksAttempted : 0,
        marksLost: Math.max(0, t.marksAttempted - t.marksEarned),
      }))
      // Surface weakest: under 70% accuracy AND at least 1 completed attempt,
      // or topics where every attempt was revealed (= gave up).
      .filter(t => (t.marksAttempted > 0 && t.accuracy < 0.7) || (t.attempts > 0 && t.revealed === t.attempts))
      .sort((a, b) => b.marksLost - a.marksLost || a.accuracy - b.accuracy)
      .slice(0, 5);

    const totalAttempted = atts.length;
    const completed = atts.filter(a => a.status === "completed").length;
    return { ranked, totalAttempted, completed };
  }),

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN — read-only oversight for /admin
  // ────────────────────────────────────────────────────────────────────────────

  /** Aggregated IGCSE metrics for the admin dashboard. */
  adminStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const allSubs = await db.execute(sql`SELECT status, amount, currency FROM igcse_subscriptions`);
    const subsList: any[] = Array.isArray(allSubs[0]) ? allSubs[0] : (allSubs as any);
    let activeSubs = 0;
    let pendingSubs = 0;
    let revenueIDR = 0;
    for (const s of subsList) {
      if (s.status === "active") activeSubs++;
      else if (s.status === "pending") pendingSubs++;
      if ((s.status === "active" || s.status === "expired") && (s.currency === "IDR" || !s.currency)) {
        revenueIDR += Number(s.amount || 0);
      }
    }

    const sessRow = await db.execute(sql`SELECT COUNT(*) AS c, COALESCE(SUM(durationSec), 0) AS s FROM igcse_sessions`);
    const sessList: any[] = Array.isArray(sessRow[0]) ? sessRow[0] : (sessRow as any);
    const totalSessions = Number(sessList?.[0]?.c ?? 0);
    const totalLessonSec = Number(sessList?.[0]?.s ?? 0);

    const attRow = await db.execute(sql`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN revealed=1 THEN 1 ELSE 0 END) AS revealed,
        COALESCE(SUM(marks), 0) AS marksTotal,
        COALESCE(SUM(marksEarned), 0) AS marksEarned
      FROM igcse_attempts
    `);
    const attList: any[] = Array.isArray(attRow[0]) ? attRow[0] : (attRow as any);
    const a0 = attList?.[0] ?? {};
    const totalAttempts = Number(a0.total ?? 0);
    const completedAttempts = Number(a0.completed ?? 0);
    const revealedAttempts = Number(a0.revealed ?? 0);
    const marksTotal = Number(a0.marksTotal ?? 0);
    const marksEarned = Number(a0.marksEarned ?? 0);

    const exRow = await db.execute(sql`
      SELECT COUNT(*) AS bank,
        SUM(CASE WHEN source LIKE 'custom-%' THEN 1 ELSE 0 END) AS customQs
      FROM igcse_examples
    `);
    const exList: any[] = Array.isArray(exRow[0]) ? exRow[0] : (exRow as any);
    const exemplarBankSize = Number(exList?.[0]?.bank ?? 0) - Number(exList?.[0]?.customQs ?? 0);
    const customQuestions = Number(exList?.[0]?.customQs ?? 0);

    return {
      subscriptions: { active: activeSubs, pending: pendingSubs, revenueIDR },
      sessions: { total: totalSessions, totalLessonHours: Math.round((totalLessonSec / 3600) * 10) / 10 },
      attempts: {
        total: totalAttempts,
        completed: completedAttempts,
        revealed: revealedAttempts,
        marksTotal,
        marksEarned,
        accuracy: marksTotal > 0 ? Math.round((marksEarned / marksTotal) * 1000) / 10 : 0, // %
      },
      bank: { exemplars: exemplarBankSize, customQuestions },
    };
  }),

  /** Recent attempts across all students for the admin attempt feed. */
  adminRecentAttempts: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`
        SELECT
          a.id, a.leadId, a.topicCode, a.marks, a.marksEarned, a.status, a.revealed,
          a.hintsUsed, a.startedAt, a.completedAt,
          l.name AS leadName, l.email AS leadEmail
        FROM igcse_attempts a
        LEFT JOIN leads l ON l.id = a.leadId
        ORDER BY a.startedAt DESC
        LIMIT ${input?.limit ?? 50}
      `);
      const list: any[] = Array.isArray(rows[0]) ? rows[0] : (rows as any);
      return list;
    }),
});
