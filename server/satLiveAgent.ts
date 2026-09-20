/**
 * SpecTa SAT Self-Prep — Phase 3: live voice Emma for one question.
 *
 * One ElevenLabs conversational agent (English, flash TTS) whose prompt is
 * filled per call with dynamic variables: the question, choices, correct
 * answer, explanation and the student's own answer. Emma coaches Socratically,
 * never just reads the answer out, and keeps it to a few minutes.
 *
 * Bump AGENT_FLAG_KEY to recreate the agent after a prompt change.
 * Env: SAT_TUTOR_VOICE (falls back to WRITING_TEACHER_VOICE / default voice),
 *      SAT_TUTOR_LLM (default gemini-2.0-flash), SAT_LIVE_MAX_SECONDS (1800 per call),
 *      SAT_LIVE_DAILY_MINUTES (60 free per student per day; more via paid credit, see satCredits.ts).
 */

import { ENV } from "./_core/env";
import { readFlag, writeFlag } from "./systemFlags";

const EL_API = "https://api.elevenlabs.io";
const AGENT_FLAG_KEY = "sat_tutor_agent_id_v2";
export const SAT_LIVE_MAX_SECONDS = Number(process.env.SAT_LIVE_MAX_SECONDS || 1800);
export const SAT_LIVE_DAILY_MINUTES = Number(process.env.SAT_LIVE_DAILY_MINUTES || 60);

const PROMPT = `You are Emma, SpecTa Education's SAT tutor, on a short live voice call with a student who is stuck on ONE Digital SAT question. Speak English (if lang_note says the student prefers Bahasa Indonesia, you may mix in short Bahasa phrases to keep them comfortable, but keep SAT terms in English). Warm, quick, encouraging, like a great private tutor. Sentences short: this is voice.

STUDENT: {{student_name}}. {{lang_note}}
SKILL: {{skill_title}}

THE QUESTION (you can see it; the student has it on screen):
{{question_text}}
{{choices_text}}
CORRECT ANSWER: {{correct_answer}}
STUDENT'S ANSWER SO FAR: {{student_answer}}
OFFICIAL EXPLANATION (your reference; do not read it aloud verbatim): {{explanation}}

HOW TO COACH
1. Start from what they did: ask what they tried or what confused them (one question, then listen).
2. Never announce the answer first. Guide with one small step at a time: a question, a hint, a check. Let THEM say the answer.
3. If they are stuck twice on the same step, give that step, then hand the next one back to them.
4. When they get it, confirm briefly, then give the one reusable takeaway for this skill in one sentence.
5. If they ask for a similar question, make ONE up on the spot in the same style and coach it the same way.
6. Stay focused and efficient: the student has a daily minutes allowance. When they have got it and have no more questions, say bye warmly and tell them to press End call.
7. Stay on SAT. If asked about SpecTa's other services, say the SpecTa team can help on WhatsApp and return to the question.
8. Never claim to see anything you were not given. Never make up College Board facts.`;

async function elFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${EL_API}${path}`, { ...init, headers: { "xi-api-key": ENV.elevenLabsApiKey, "content-type": "application/json", ...(init.headers || {}) } });
}

function payload(withTurn: boolean): any {
  return {
    name: "SpecTa SAT Tutor (Emma)",
    conversation_config: {
      agent: {
        prompt: { prompt: PROMPT, llm: process.env.SAT_TUTOR_LLM || "gemini-2.0-flash" },
        first_message: "{{opening_line}}",
        language: "en",
      },
      tts: {
        voice_id: process.env.SAT_TUTOR_VOICE || process.env.WRITING_TEACHER_VOICE || ENV.elevenLabsDefaultVoiceId,
        model_id: "eleven_flash_v2",
        stability: 0.55, similarity_boost: 0.85, use_speaker_boost: true,
      },
      conversation: { max_duration_seconds: SAT_LIVE_MAX_SECONDS },
      ...(withTurn ? { turn: { turn_timeout: 20, silence_end_call_timeout: -1 } } : {}),
    },
  };
}

async function createAgent(): Promise<string> {
  let lastErr = "";
  for (const withTurn of [true, false]) {
    const res = await elFetch("/v1/convai/agents/create", { method: "POST", body: JSON.stringify(payload(withTurn)) });
    if (res.ok) {
      const data: any = await res.json();
      if (data?.agent_id) { console.log(`[SAT live] agent created (${withTurn ? "turn" : "bare"}): ${data.agent_id}`); return data.agent_id; }
    } else lastErr = `${res.status}: ${(await res.text()).slice(0, 300)}`;
  }
  throw new Error(`ElevenLabs SAT tutor creation failed (${lastErr})`);
}

export async function ensureSatTutorAgent(): Promise<string> {
  if (!ENV.elevenLabsApiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const existing = await readFlag(AGENT_FLAG_KEY);
  if (existing) return existing;
  const id = await createAgent();
  await writeFlag(AGENT_FLAG_KEY, id);
  return id;
}

export async function getSatTutorSignedUrl(): Promise<string> {
  const agentId = await ensureSatTutorAgent();
  const res = await elFetch(`/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, { method: "GET" });
  if (!res.ok) throw new Error(`ElevenLabs SAT tutor signed-url failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data: any = await res.json();
  if (!data?.signed_url) throw new Error("ElevenLabs returned no signed_url for the SAT tutor");
  return data.signed_url;
}

/** Every dynamic variable referenced in the prompt must always be present. */
export function buildDynamicVariables(args: { studentName: string; lang: "en" | "id"; skillTitle: string; passage: string | null; stem: string; choices: string[] | null; answer: string; explanation: string; studentAnswer: string | null; format: "mc" | "spr" }): Record<string, string> {
  const first = args.studentName.split(" ")[0] || "there";
  const choices = args.choices ? args.choices.map((c, i) => `${"ABCD"[i]}. ${c}`).join("\n") : "(Student-produced response: the student types a number.)";
  return {
    student_name: args.studentName,
    lang_note: args.lang === "id" ? "The student prefers Bahasa Indonesia explanations." : "The student prefers English.",
    skill_title: args.skillTitle,
    question_text: `${args.passage ? args.passage + "\n\n" : ""}${args.stem}`,
    choices_text: choices,
    correct_answer: args.format === "mc" ? args.answer.toUpperCase() : args.answer,
    explanation: args.explanation,
    student_answer: args.studentAnswer ? args.studentAnswer : "(nothing yet)",
    opening_line: `Hi ${first}! Emma here. I can see the question. Tell me, what did you try first, or where did it get confusing?`,
  };
}
