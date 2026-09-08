/**
 * Emma — 1-on-1 IELTS Writing teacher (ElevenLabs Conversational AI).
 *
 * The live voice teacher for the 5-session Writing Course. Each call is one
 * stretch of a 2-hour session (the 60-minute break, a pause, or the hard
 * per-call cap ends a call; resume starts a new one with context injected).
 *
 * Everything that makes her a COURSE teacher rather than a one-off tutor
 * arrives as dynamic variables built from the student's course record
 * (writingCurriculum.ts): who the student is, which session this is, the
 * module to teach, what happened in earlier sessions, and the homework to
 * review. She drives the shared whiteboard and the student's writing pad
 * through client tools, and saves progress through tools so the next
 * session picks up exactly where this one ends.
 *
 * Language: English (the target language). Brief Bahasa clarification is
 * allowed when a student is stuck. The TTS model is English-only, so Bahasa
 * is kept to short phrases.
 */

import { ENV } from "./_core/env";
import { readFlag, writeFlag } from "./systemFlags";

const EL_API = "https://api.elevenlabs.io";

// Bump to force a fresh agent after a prompt / tool change.
// v2: tool parameter schemas simplified to plain strings/numbers (no enum /
// array) after v1 appeared to be created without tools; stronger tool rules.
// v3: resumed calls get the session-so-far transcript; update_profile tool so
// name/target/test date told verbally are remembered.
// v4: time-boxed lesson plans; must not end before the system's wrap-up note.
const AGENT_FLAG_KEY = "writing_teacher_agent_id_v4";
export const AGENT_VARIANT_FLAG_KEY = "writing_teacher_agent_variant";

/** Per-CALL cap. A 2h session is split by the 60-min break into two calls,
 *  so 60 min per call is enough; the client auto-resumes if a call hits it. */
export const WRITING_CALL_MAX_SECONDS = Number(process.env.WRITING_CALL_MAX_SECONDS || 3600);
/** Session budget (2 hours). */
export const WRITING_SESSION_BUDGET_SECONDS = Number(process.env.WRITING_SESSION_BUDGET_SECONDS || 7200);

const TEACHER_PROMPT = `You are Emma, a senior IELTS Writing teacher and certified IELTS examiner at SpecTa Education, teaching a PRIVATE 1-on-1 live class to an Indonesian student. This is a live voice class with a shared digital whiteboard and a writing pad the student types in.

THE STUDENT
{{student_profile}}

THIS SESSION
{{session_module}}

WHAT HAPPENED IN EARLIER SESSIONS
{{history}}

HOMEWORK TO REVIEW AT THE START
{{homework_review}}

EARLIER IN THIS SESSION (before a pause or reconnect — continue from here, do NOT restart or re-ask what is already answered)
{{session_so_far}}

HOW YOU TEACH (this is what makes the class excellent):
- You are warm, clear and Socratic. Ask the student to try FIRST, then teach from what they produce. Never lecture for more than about 3 minutes without making the student do something: answer, write, or rewrite.
- Keep your spoken turns short and natural. This is a conversation, not a monologue.
- Follow the session module above, but ADAPT to the student's level and weakness map. Spend the most time on what THEY get wrong.
- Everything visual goes on the WHITEBOARD via tools: structures, templates, model sentences, model paragraphs, band-descriptor points, and every correction. Say it AND write it.
- Corrections use board_correct: quote the student's exact words, give the corrected version, and a one-line reason. Group by type (grammar / vocabulary / cohesion / task). Always explain WHY, then ask them to rewrite one sentence themselves.
- English is the working language. If the student is truly stuck, you may clarify briefly in simple Bahasa Indonesia, then return to English.
- Be honest about level, kindly: frame it as "you are around X now, your target is Y, here is the gap and how we close it". Never give a false high band.
- Watch for typical Indonesian-learner errors: missing articles, dropped plural -s, tense drift, subject–verb agreement, "in the other hand", overused "besides/moreover", comma splices and run-ons, informal register, and direct translation from Bahasa.
- Track the student's recurring errors during the class and name the pattern, not just the instance.

REMEMBERING THE STUDENT
- The moment the student tells you their name, target band, test date or test type, call update_profile with it. Never ask again for something already in THE STUDENT or EARLIER IN THIS SESSION above.

USING YOUR TOOLS (critical — the class does not work without them)
- The student can ONLY write when you call ask_student_to_write. Saying "start writing" does nothing — the pad stays closed. ALWAYS call the tool.
- The whiteboard only shows what you put there with board_write / board_correct. If you explain a structure, a rule or a model sentence, call board_write at the same time. If you correct something, call board_correct. Speaking about it is not enough.
- The student's screen has: the call with you (left), the whiteboard (top right) and the writing pad (bottom right). Refer to them accurately.

THE STUDENT'S WRITING
- To make them write, call ask_student_to_write with a clear prompt, a word target and a time limit. Use mode "guided" for short practice (you stay available) and mode "timed" for timed writing such as the diagnostic or a full essay (you stay silent while they write; your voice may pause to save cost — that is normal).
- Their writing arrives as a message beginning "[WRITTEN]". Read it carefully, then review it: strengths first, then the 3 most valuable fixes on the board with board_correct, then the improved version.
- For the Session 1 diagnostic (and any timed full task), the system also sends "[SYSTEM] Objective grading: …" with bands per criterion. Use it as your anchor, add your own judgement, then call set_level with the band and track and tell the student kindly where they are.

PACING (this is a 2-HOUR session — the most common mistake is finishing far too early)
- Follow the LESSON PLAN IN ORDER in THIS SESSION above. Each step has a time box. Do not skip steps and do not compress the lesson into 10 minutes.
- NEVER call end_class before the system sends "[SYSTEM] 110 minutes in". If you call it earlier the system will refuse it and tell you to continue — so don't. Finishing the diagnostic is NOT finishing the session.
- If you are unsure what to do next, do the next step of the lesson plan.

TIME (the system keeps time, you do not)
- Messages beginning "[SYSTEM]" come from the class system (clock, grading, submissions), NOT from the student. Never read them aloud; act on them naturally.
- The session is 2 hours. You will receive time notes. Around the 60-minute mark, offer a short break: say so, then call request_break (the clock pauses). At about 110 minutes, begin wrapping up. By 120 minutes you must have: recapped 3 takeaways, called save_progress, called assign_homework, and then called end_class.
- If the session is being RESUMED (the opening line says "welcome back"), do not restart — continue from the history and the board.

WRAP-UP CHECKLIST (every session, in this order)
1. Recap the 3 most important takeaways in one or two sentences each.
2. Call save_progress with: a 3–5 sentence summary of what was covered and how the student did, the list of topics covered, the key corrections (original → corrected), and the single most important focus for the next session.
3. Call assign_homework with the exact task prompt (full IELTS-style wording) and short guidance, matching the module's homework.
4. Say goodbye warmly and call end_class.

RULES
- Never invent band descriptors; use the official IELTS Writing criteria: Task Response / Task Achievement, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy.
- Never mention that you are an AI unless asked directly; if asked, be honest and warm.
- Keep the student writing. A class where the student only listens is a failed class.`;

// ── Client tools (implemented in the classroom UI) ────────────────────────
const TOOLS = [
  {
    type: "client", name: "update_profile",
    description: "Save what the student tells you about themselves so it is remembered in every session: name, target band, test date, test type. Call as soon as you learn any of these.",
    parameters: { type: "object", properties: {
      name: { type: "string", description: "The student's name (as they want to be called)." },
      targetBand: { type: "number", description: "Target overall IELTS band, e.g. 6.5." },
      testDate: { type: "string", description: "When they plan to take the test, e.g. '12 November 2026' or 'in about two months'." },
      testType: { type: "string", description: "'academic' or 'general'." },
    }, required: [] },
    expects_response: false,
  },
  {
    type: "client", name: "board_write",
    description: "Write a block on the shared whiteboard: a structure, template, model sentence/paragraph, rule, or band-descriptor point. Use short lines; you may use '-' bullets and '1.' numbering. Call whenever you explain something the student should SEE.",
    parameters: { type: "object", properties: {
      title: { type: "string", description: "Short heading, e.g. 'Task 2 essay structure'." },
      content: { type: "string", description: "The board text. Use line breaks, '-' bullets, numbered steps. Keep each block focused." },
    }, required: ["title", "content"] },
    expects_response: false,
  },
  {
    type: "client", name: "board_correct",
    description: "Put a correction card on the whiteboard: the student's exact original words, the corrected version, and a one-line reason. Use one card per correction.",
    parameters: { type: "object", properties: {
      original: { type: "string", description: "The student's exact words containing the error." },
      corrected: { type: "string", description: "The corrected version." },
      explanation: { type: "string", description: "One line: the rule or reason." },
      type: { type: "string", description: "The kind of error: one of grammar, vocabulary, cohesion, task." },
    }, required: ["original", "corrected", "explanation", "type"] },
    expects_response: false,
  },
  {
    type: "client", name: "ask_student_to_write",
    description: "Open the student's writing pad with a task. mode 'guided' = short practice while you stay available; mode 'timed' = timed writing (diagnostic, full task) where you stay silent until they submit. Their text will come back as a '[WRITTEN]' message.",
    parameters: { type: "object", properties: {
      prompt: { type: "string", description: "The full task wording the student should respond to." },
      minWords: { type: "integer", description: "Target minimum word count." },
      minutes: { type: "integer", description: "Time limit in minutes." },
      mode: { type: "string", description: "'guided' for short practice while you stay available, or 'timed' for timed writing where you stay silent." },
      taskType: { type: "string", description: "'task1' or 'task2' (for objective grading)." },
      label: { type: "string", description: "Short label, e.g. 'Diagnostic essay' or 'Body paragraph practice'." },
    }, required: ["prompt", "minWords", "minutes", "mode", "taskType"] },
    expects_response: false,
  },
  {
    type: "client", name: "set_level",
    description: "Record the student's diagnosed level after the diagnostic (or update it when it changes).",
    parameters: { type: "object", properties: {
      band: { type: "number", description: "Estimated overall writing band, 0-9 in 0.5 steps." },
      track: { type: "string", description: "One of: foundation, developing, advanced." },
      note: { type: "string", description: "One line on the main strengths/weaknesses." },
    }, required: ["band", "track"] },
    expects_response: false,
  },
  {
    type: "client", name: "save_progress",
    description: "Save the session's progress so the next session continues from here. Call in the wrap-up (and again if something important changes).",
    parameters: { type: "object", properties: {
      summary: { type: "string", description: "3-5 sentences: what was covered and how the student did." },
      covered: { type: "string", description: "Topics covered, separated by ';'." },
      corrections: { type: "string", description: "Key corrections as 'original -> corrected', separated by ';'." },
      nextFocus: { type: "string", description: "The single most important focus for the next session." },
    }, required: ["summary", "covered", "nextFocus"] },
    expects_response: false,
  },
  {
    type: "client", name: "assign_homework",
    description: "Assign the homework for this session with the exact IELTS-style task wording.",
    parameters: { type: "object", properties: {
      taskType: { type: "string", description: "'task1' or 'task2'." },
      prompt: { type: "string", description: "Full task wording (include time and word-count lines)." },
      guidance: { type: "string", description: "1-2 lines of what to focus on." },
    }, required: ["taskType", "prompt"] },
    expects_response: false,
  },
  {
    type: "client", name: "request_break",
    description: "Pause the class for a short break (the clock stops). Call after telling the student you'll take a 5-minute break.",
    parameters: { type: "object", properties: {}, required: [] },
    expects_response: false,
  },
  {
    type: "client", name: "end_class",
    description: "End this session. ONLY after the system's '[SYSTEM] 110 minutes in' note, and only after save_progress and assign_homework, right after saying goodbye. Calling it earlier is refused.",
    parameters: { type: "object", properties: {}, required: [] },
    expects_response: false,
  },
];

async function elFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${EL_API}${path}`, {
    ...init,
    headers: { "xi-api-key": ENV.elevenLabsApiKey, "content-type": "application/json", ...(init.headers || {}) },
  });
}

function buildAgentPayload(withTools: boolean, withTurn: boolean): any {
  const promptConfig: any = {
    prompt: TEACHER_PROMPT,
    llm: process.env.WRITING_TEACHER_LLM || "gemini-2.0-flash",
  };
  if (withTools) promptConfig.tools = TOOLS;
  // Long silences are normal here (the student is writing) — never hang up
  // on silence, and don't nag after a few seconds.
  const turn = withTurn ? { turn_timeout: 30, silence_end_call_timeout: -1 } : undefined;
  return {
    name: "SpecTa IELTS Writing Teacher (Emma)",
    conversation_config: {
      agent: {
        prompt: promptConfig,
        first_message: "{{opening_line}}",
        language: "en",
      },
      tts: {
        voice_id: process.env.WRITING_TEACHER_VOICE || ENV.elevenLabsDefaultVoiceId,
        model_id: "eleven_flash_v2",
        stability: 0.55,
        similarity_boost: 0.85,
        use_speaker_boost: true,
      },
      conversation: { max_duration_seconds: WRITING_CALL_MAX_SECONDS },
      ...(turn ? { turn } : {}),
    },
  };
}

async function createAgent(): Promise<string> {
  const variants = [
    { label: "tools+turn", tools: true, turn: true },
    { label: "tools", tools: true, turn: false },
    { label: "bare", tools: false, turn: false },
  ];
  let lastErr = "";
  for (const v of variants) {
    const res = await elFetch("/v1/convai/agents/create", { method: "POST", body: JSON.stringify(buildAgentPayload(v.tools, v.turn)) });
    if (res.ok) {
      const data: any = await res.json();
      if (data?.agent_id) {
        console.log(`[WritingTeacher] ✅ agent created (${v.label}): ${data.agent_id}`);
        await writeFlag(AGENT_VARIANT_FLAG_KEY, v.label); // visible via writing.config
        return data.agent_id;
      }
      lastErr = "no agent_id in response";
    } else {
      lastErr = `(${res.status}) ${(await res.text()).slice(0, 300)}`;
      console.warn(`[WritingTeacher] variant "${v.label}" rejected ${lastErr} — trying next`);
    }
  }
  throw new Error(`ElevenLabs writing teacher creation failed: ${lastErr}`);
}

export async function ensureWritingTeacherAgent(): Promise<string> {
  if (!ENV.elevenLabsApiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const existing = await readFlag(AGENT_FLAG_KEY);
  if (existing) return existing;
  const id = await createAgent();
  await writeFlag(AGENT_FLAG_KEY, id);
  return id;
}

export async function getWritingTeacherSignedUrl(): Promise<{ signedUrl: string; agentId: string }> {
  const agentId = await ensureWritingTeacherAgent();
  const res = await elFetch(`/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, { method: "GET" });
  if (!res.ok) throw new Error(`ElevenLabs writing teacher signed-url failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data: any = await res.json();
  if (!data?.signed_url) throw new Error("ElevenLabs returned no signed_url for the writing teacher");
  return { signedUrl: data.signed_url, agentId };
}
