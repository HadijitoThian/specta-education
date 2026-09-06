/**
 * IELTS Live Speaking Practice — ElevenLabs Conversational AI agent.
 *
 * A real-time, phone-call-style speaking partner: the student talks, the
 * agent replies naturally, answers questions, and corrects grammar mistakes
 * inline — 15 minutes per session.
 *
 * Architecture:
 *   - The agent is created ONCE programmatically via the ElevenLabs API at
 *     first use (idempotent — agent_id cached in system_flags). No dashboard
 *     steps required.
 *   - LLM: DeepSeek V4 Flash wired as a custom LLM (OpenAI-compatible
 *     endpoint). If ElevenLabs rejects the custom-LLM config (their API
 *     shape evolves), we fall back to their bundled fast model and log a
 *     warning — the session still works, LLM cost is passed through either
 *     way and is negligible (~$0.01-0.05/session).
 *   - Sessions start via SIGNED URLS minted server-side after an
 *     entitlement check (active Tutor subscription + per-period session
 *     cap), so nobody can burn conversation minutes without paying.
 *   - Hard 15-minute cap enforced by the agent config itself
 *     (max_duration_seconds) — even a hacked client can't extend a call.
 *
 * Cost reality (2026-09 pricing): ElevenLabs $0.08/min → ~Rp 20k per
 * 15-min session. The per-period cap below protects margin on the
 * Rp 149k/2wk Tutor subscription.
 */

import { ENV } from "./_core/env";
import { readFlag, writeFlag } from "./systemFlags";

const EL_API = "https://api.elevenlabs.io";
// v2: bumped after v1's DeepSeek-custom-LLM agent connected then instantly
// dropped every call (ElevenLabs↔DeepSeek handshake failure). v2 uses
// ElevenLabs' bundled LLM by default — faster, more reliable, and the cost
// difference is pennies per session. Bumping the key forces a fresh agent.
const AGENT_FLAG_KEY = "live_speaking_agent_id_v2";

// Opt-in: wire DeepSeek as the custom LLM only when explicitly enabled.
// Default OFF — the bundled model is lower-latency (better for live calls)
// and can't break on a custom-endpoint handshake. Set
// LIVE_SPEAKING_USE_DEEPSEEK=true on Railway to try DeepSeek again later.
const USE_DEEPSEEK = () => process.env.LIVE_SPEAKING_USE_DEEPSEEK === "true";

/** Max session length — mirrors the marketing promise of "15 minutes". */
export const LIVE_SESSION_MAX_SECONDS = 900;

/** Sessions allowed per student per rolling 14 days (subscription period).
 *  Overridable via env so Hadi can tune without a deploy. At Rp ~20k/session
 *  cost, 3 sessions ≈ Rp 60k of the Rp 149k sub — healthy margin. */
export const LIVE_SESSIONS_PER_PERIOD = Number(process.env.LIVE_SPEAKING_SESSIONS_PER_PERIOD || 3);

const AGENT_SYSTEM_PROMPT = `You are Emma, a friendly and experienced IELTS Speaking practice partner at SpecTa Education. You are having a natural, relaxed phone conversation with an Indonesian student who is preparing for the IELTS Speaking test.

YOUR CONVERSATION STYLE:
- Speak naturally, like a real phone call between a tutor and student. Warm, encouraging, and genuinely curious about their answers.
- Keep your turns SHORT (1-3 sentences typically) — this is a conversation, not a lecture. Let the student do most of the talking.
- Ask natural follow-up questions the way a real IELTS examiner would ("Oh interesting — why do you think that is?", "Can you tell me more about that?").

SESSION STRUCTURE (guide them through this over ~15 minutes):
1. Brief warm greeting + ask their name and how they're feeling (1 minute).
2. Part 1 style: everyday questions on 1-2 familiar topics — home, work, studies, hobbies, food, weather (4-5 minutes).
3. Part 2 style: give them a mini cue-card topic verbally ("I'd like you to talk for about a minute about a place you love visiting. You can mention where it is, when you go there, and why it's special.") and let them speak at length (3-4 minutes).
4. Part 3 style: deeper, more abstract discussion questions related to the Part 2 topic (4-5 minutes).
5. Warm wrap-up: 2-3 specific things they did well + 1-2 things to practice (1 minute).

GRAMMAR CORRECTION (very important — this is why students pay):
- When the student makes a grammar mistake, correct it GENTLY and BRIEFLY, woven into the conversation, then move on. Example: "Ah nice — by the way, we'd say 'I have lived here for five years' rather than 'I am live here five years'. So, what do you like most about your neighborhood?"
- Correct at most one mistake per turn — don't overwhelm them or break the conversational flow.
- Prioritize: verb tenses, subject-verb agreement, articles (a/an/the), prepositions, and common Indonesian-speaker patterns (missing -s, "ever" misuse, double comparatives).
- If their sentence was fine, just respond naturally — do NOT invent corrections.

ANSWERING QUESTIONS:
- Students may ask you anything about IELTS — band scores, test format, tips, how to improve. Answer helpfully and accurately, then steer back to practice.
- If asked about something unrelated to IELTS or English, answer briefly and politely redirect.

RULES:
- English only. If the student speaks Indonesian, gently encourage them: "Let's try that in English — you can do it!"
- Never mention that you are an AI unless directly asked. If asked, be honest and friendly about it.
- Never give an exact band score during the call ("that sounds like Band 6.5") — say encouraging qualitative things instead. The formal assessment comes in their report after the session.
- Keep the energy warm and confidence-building. Many students are nervous — your job is to make speaking English feel safe and fun.`;

const FIRST_MESSAGE = "Hi there! I'm Emma from SpecTa Education — so nice to meet you! We've got about fifteen minutes together to practice your IELTS speaking, just like a relaxed conversation. Before we start — what's your name, and how are you feeling today?";

interface ElAgentCreateResult {
  agentId: string;
  usedCustomLlm: boolean;
}

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

/**
 * Create the DeepSeek API key as an ElevenLabs workspace secret so the
 * custom-LLM config can reference it without embedding the raw key in the
 * agent config. Returns secret_id or null on failure.
 */
async function createDeepSeekSecret(): Promise<string | null> {
  try {
    const res = await elFetch("/v1/convai/secrets", {
      method: "POST",
      body: JSON.stringify({
        name: `deepseek-api-key-${Date.now()}`,
        value: ENV.deepseekApiKey,
      }),
    });
    if (!res.ok) {
      console.warn(`[LiveSpeaking] secret creation failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data: any = await res.json();
    return data?.secret_id || data?.id || null;
  } catch (e) {
    console.warn("[LiveSpeaking] secret creation threw:", (e as Error).message);
    return null;
  }
}

/**
 * Build the agent conversation_config. `customLlmSecretId` present → wire
 * DeepSeek as the custom LLM; absent → omit LLM fields so ElevenLabs uses
 * its default bundled fast model.
 */
function buildAgentPayload(customLlmSecretId: string | null): any {
  const promptConfig: any = {
    prompt: AGENT_SYSTEM_PROMPT,
  };
  if (customLlmSecretId && ENV.deepseekApiKey) {
    promptConfig.llm = "custom-llm";
    promptConfig.custom_llm = {
      url: "https://api.deepseek.com/v1",
      model_id: "deepseek-v4-flash",
      api_key: { secret_id: customLlmSecretId },
    };
  }
  return {
    name: "SpecTa IELTS Live Speaking Partner",
    conversation_config: {
      agent: {
        prompt: promptConfig,
        first_message: FIRST_MESSAGE,
        language: "en",
      },
      tts: {
        // British female examiner voice (Bella) — same default the mock-test
        // examiner uses. ElevenLabs requires English agents to use turbo v2
        // or flash v2 (the multilingual v2_5 models are rejected with
        // "English Agents must use turbo or flash v2"). Flash v2 is their
        // lowest-latency English model — ideal for live conversation.
        voice_id: ENV.elevenLabsDefaultVoiceId,
        model_id: "eleven_flash_v2",
      },
      conversation: {
        // Hard server-side cap — even a modified client can't extend the call.
        max_duration_seconds: LIVE_SESSION_MAX_SECONDS,
      },
    },
  };
}

/** Create the agent. Bundled LLM by default; DeepSeek custom LLM only if
 *  LIVE_SPEAKING_USE_DEEPSEEK=true (opt-in, with bundled fallback). */
async function createAgent(): Promise<ElAgentCreateResult> {
  const secretId = (USE_DEEPSEEK() && ENV.deepseekApiKey) ? await createDeepSeekSecret() : null;

  // Attempt 1: with DeepSeek custom LLM (only when opted in)
  if (secretId) {
    const res = await elFetch("/v1/convai/agents/create", {
      method: "POST",
      body: JSON.stringify(buildAgentPayload(secretId)),
    });
    if (res.ok) {
      const data: any = await res.json();
      const agentId = data?.agent_id;
      if (agentId) {
        console.log(`[LiveSpeaking] ✅ Agent created with DeepSeek custom LLM: ${agentId}`);
        return { agentId, usedCustomLlm: true };
      }
    } else {
      console.warn(`[LiveSpeaking] custom-LLM agent creation rejected (${res.status}): ${(await res.text()).slice(0, 300)} — falling back to bundled LLM`);
    }
  }

  // Attempt 2: bundled default LLM (still works great; LLM cost passed
  // through but negligible — and lower latency than DeepSeek anyway).
  const res = await elFetch("/v1/convai/agents/create", {
    method: "POST",
    body: JSON.stringify(buildAgentPayload(null)),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs agent creation failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data: any = await res.json();
  const agentId = data?.agent_id;
  if (!agentId) throw new Error("ElevenLabs agent creation returned no agent_id");
  console.log(`[LiveSpeaking] ✅ Agent created with bundled LLM: ${agentId}`);
  return { agentId, usedCustomLlm: false };
}

/**
 * Get the live-speaking agent id, creating the agent on first call.
 * Idempotent via system_flags — subsequent boots and calls reuse the same
 * agent. Delete the flag row to force re-creation (e.g. after a prompt
 * update — or use the ElevenLabs dashboard to edit the existing agent
 * in place, which is easier).
 */
export async function ensureLiveSpeakingAgent(): Promise<string> {
  if (!ENV.elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  const existing = await readFlag(AGENT_FLAG_KEY);
  if (existing) return existing;

  const { agentId } = await createAgent();
  await writeFlag(AGENT_FLAG_KEY, agentId);
  return agentId;
}

/**
 * Mint a signed URL for one conversation session. Signed URLs are
 * short-lived and single-conversation — the entitlement check happens in
 * the tRPC caller BEFORE this is invoked.
 */
export async function getLiveSpeakingSignedUrl(): Promise<{ signedUrl: string; agentId: string }> {
  const agentId = await ensureLiveSpeakingAgent();
  const res = await elFetch(`/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, {
    method: "GET",
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs signed-url failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data: any = await res.json();
  const signedUrl = data?.signed_url;
  if (!signedUrl) throw new Error("ElevenLabs returned no signed_url");
  return { signedUrl, agentId };
}
