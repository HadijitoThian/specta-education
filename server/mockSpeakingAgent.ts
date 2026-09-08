/**
 * IELTS Mock Test — LIVE Speaking examiner (ElevenLabs Conversational AI).
 *
 * Replaces the turn-based recorded speaking section with a real-time
 * conversation that runs EXACTLY like the real IELTS Speaking test:
 *   Part 1 (4–5 min interview) → Part 2 (cue card: 1 min prep, 1–2 min
 *   long turn, rounding-off question) → Part 3 (4–5 min discussion) → the
 *   examiner closes the test and the call ends automatically.
 *
 * This examiner is deliberately the OPPOSITE of the practice partner in
 * liveSpeakingAgent.ts: neutral, formal, never corrects, never gives
 * feedback, never reveals a score. All marking happens afterwards and lands
 * only in the final mock report / PDF.
 *
 * Standardisation: the questions come from the admin-authored prompts for
 * the specific test (ieltsSpeakingPrompts), injected per call as dynamic
 * variables — so every candidate on the same test gets the same questions.
 *
 * Timing is enforced by the client: it runs the clocks (Part 1/3 limits,
 * Part 2's 60s prep + 120s talk) and sends "[SYSTEM] …" messages to the
 * examiner at each boundary. A hard max_duration_seconds is the backstop so
 * the call always ends on its own.
 */

import { ENV } from "./_core/env";
import { readFlag, writeFlag } from "./systemFlags";

const EL_API = "https://api.elevenlabs.io";

// Bump to force a fresh agent after a prompt / tool change.
const AGENT_FLAG_KEY = "mock_speaking_examiner_agent_id_v1";

/** Hard cap. A real test runs 11–14 minutes; 15 is the safety ceiling. */
export const MOCK_SPEAKING_MAX_SECONDS = Number(process.env.MOCK_SPEAKING_MAX_SECONDS || 900);

/** Live-call starts allowed per attempt (refresh/reconnect protection —
 *  each start spends real ElevenLabs minutes). */
export const MOCK_SPEAKING_MAX_STARTS = Number(process.env.MOCK_SPEAKING_MAX_STARTS || 3);

const EXAMINER_PROMPT = `You are Emma, a certified IELTS Speaking examiner conducting an OFFICIAL, TIMED IELTS Speaking test with a candidate. This is a test, NOT a lesson. Behave exactly like a real examiner.

CANDIDATE: {{candidate_name}}

EXAMINER BEHAVIOUR (strict):
- Neutral, polite, professional. Keep your own turns SHORT — the candidate must do the talking.
- NEVER correct the candidate. NEVER give feedback, hints, vocabulary, praise beyond a neutral "Thank you." or "Okay.", and NEVER comment on how well they are doing.
- NEVER reveal or hint at a band score.
- If the candidate asks for help or the meaning of a word, do not explain — repeat or rephrase the question once, neutrally.
- If the candidate goes silent, prompt once neutrally ("Take your time."), then move on.
- If the candidate speaks Indonesian, say "Please answer in English." and continue.
- Do NOT read out anything in square brackets. Messages beginning with "[SYSTEM]" come from the test system's clock, NOT from the candidate — obey them silently and move on to the instructed step.

TEST SCRIPT — follow this order exactly:

INTRODUCTION (you have already greeted them and asked their name in your first message)
- Acknowledge their name briefly, then call the tool start_part with part 1 and begin Part 1 immediately.

PART 1 — Interview (about 4–5 minutes)
- Say: "In this first part, I'd like to ask you some questions about yourself."
- Ask these questions, one at a time, in order (ask a brief natural follow-up only if an answer is very short):
{{part1_questions}}
- Move on when the questions are done or when you receive "[SYSTEM] Part 1 time is over".

PART 2 — Long turn (cue card)
- Call the tool start_part with part 2.
- Say: "Now I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. You can make some notes if you wish. Here is your topic."
- Then call the tool show_cue_card with the full cue card text below, and read the TOPIC LINE aloud (only the first line, not every bullet):
{{part2_cue_card}}
- Then STOP TALKING and wait in silence. Do not speak again until you receive "[SYSTEM] Preparation time is over".
- When you receive it, say: "All right? Remember, you have one to two minutes for this, so don't worry if I stop you. I'll tell you when the time is up. Can you start speaking now, please?"
- Let the candidate speak WITHOUT interrupting. Do not respond to pauses. Only when you receive "[SYSTEM] Two minutes are up" (or the candidate has clearly finished after at least a minute), say "Thank you." and ask ONE short rounding-off question related to the topic.

PART 3 — Discussion (about 4–5 minutes)
- Call the tool start_part with part 3.
- Say: "We've been talking about [the Part 2 topic], and I'd like to discuss with you one or two more general questions related to this."
- Ask these questions, one at a time, in order, probing more abstractly ("Why do you think that is?", "How might that change in the future?") if answers are short:
{{part3_questions}}
- End when the questions are done or when you receive "[SYSTEM] Part 3 time is over".

END OF TEST
- Say exactly: "Thank you. That is the end of the Speaking test."
- Then immediately call the tool finish_test. Do not say anything else after that.

If any question list above says "none", use standard IELTS questions on everyday topics for that part instead.`;

const FIRST_MESSAGE = "Good afternoon. My name is Emma, and I'll be your examiner today. This is the IELTS Speaking test. Can you tell me your full name, please?";

// ── Client tools (implemented in the browser runner) ─────────────────────
const TOOLS = [
  {
    type: "client",
    name: "start_part",
    description: "Signal that a test part is starting. Call at the beginning of Part 1, Part 2 and Part 3.",
    parameters: {
      type: "object",
      properties: { part: { type: "integer", description: "The part number: 1, 2 or 3." } },
      required: ["part"],
    },
    expects_response: false,
  },
  {
    type: "client",
    name: "show_cue_card",
    description: "Display the Part 2 cue card to the candidate and start their one-minute preparation time. Call once, when you hand over the topic.",
    parameters: {
      type: "object",
      properties: { text: { type: "string", description: "The full cue card text (topic line plus the 'You should say' bullets)." } },
      required: ["text"],
    },
    expects_response: false,
  },
  {
    type: "client",
    name: "finish_test",
    description: "End the Speaking test. Call immediately after saying 'That is the end of the Speaking test.'",
    parameters: { type: "object", properties: {}, required: [] },
    expects_response: false,
  },
];

async function elFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${EL_API}${path}`, {
    ...init,
    headers: {
      "xi-api-key": ENV.elevenLabsApiKey,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function buildAgentPayload(withTools: boolean): any {
  const promptConfig: any = {
    prompt: EXAMINER_PROMPT,
    llm: process.env.MOCK_SPEAKING_LLM || "gemini-2.0-flash",
  };
  if (withTools) promptConfig.tools = TOOLS;
  return {
    name: "SpecTa IELTS Mock Speaking Examiner",
    conversation_config: {
      agent: {
        prompt: promptConfig,
        first_message: FIRST_MESSAGE,
        language: "en",
      },
      tts: {
        // English agents must use flash/turbo v2 (multilingual v2.5 rejected).
        voice_id: ENV.elevenLabsDefaultVoiceId,
        model_id: "eleven_flash_v2",
        stability: 0.6,
        similarity_boost: 0.85,
        use_speaker_boost: true,
      },
      conversation: {
        max_duration_seconds: MOCK_SPEAKING_MAX_SECONDS,
      },
    },
  };
}

async function createAgent(): Promise<string> {
  {
    const res = await elFetch("/v1/convai/agents/create", {
      method: "POST",
      body: JSON.stringify(buildAgentPayload(true)),
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data?.agent_id) {
        console.log(`[MockSpeaking] ✅ Examiner agent created WITH tools: ${data.agent_id}`);
        return data.agent_id;
      }
    } else {
      console.warn(`[MockSpeaking] tool-enabled creation rejected (${res.status}): ${(await res.text()).slice(0, 300)} — retrying without tools`);
    }
  }
  // Without tools the client falls back to detecting parts from the
  // examiner's words; the test still runs and is graded.
  const res = await elFetch("/v1/convai/agents/create", {
    method: "POST",
    body: JSON.stringify(buildAgentPayload(false)),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs mock examiner creation failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data: any = await res.json();
  if (!data?.agent_id) throw new Error("ElevenLabs mock examiner creation returned no agent_id");
  console.log(`[MockSpeaking] ✅ Examiner agent created WITHOUT tools (fallback): ${data.agent_id}`);
  return data.agent_id;
}

export async function ensureMockSpeakingAgent(): Promise<string> {
  if (!ENV.elevenLabsApiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const existing = await readFlag(AGENT_FLAG_KEY);
  if (existing) return existing;
  const agentId = await createAgent();
  await writeFlag(AGENT_FLAG_KEY, agentId);
  return agentId;
}

export async function getMockSpeakingSignedUrl(): Promise<{ signedUrl: string; agentId: string }> {
  const agentId = await ensureMockSpeakingAgent();
  const res = await elFetch(`/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`ElevenLabs mock examiner signed-url failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data: any = await res.json();
  if (!data?.signed_url) throw new Error("ElevenLabs returned no signed_url for the mock examiner");
  return { signedUrl: data.signed_url, agentId };
}

/**
 * Fetch the recorded conversation audio (both sides, MP3) from ElevenLabs.
 * Used as the pronunciation-audio fallback when the browser recording is
 * unavailable. Recordings can take a few seconds to be ready after the call.
 */
export async function fetchConversationAudio(conversationId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await elFetch(`/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`, { method: "GET" });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 1000) {
          return { buffer, mimeType: res.headers.get("content-type") || "audio/mpeg" };
        }
      } else if (res.status !== 404 && res.status !== 425) {
        console.warn(`[MockSpeaking] conversation audio fetch failed (${res.status})`);
        return null;
      }
    } catch (e) {
      console.warn("[MockSpeaking] conversation audio fetch threw:", (e as Error).message);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  return null;
}
