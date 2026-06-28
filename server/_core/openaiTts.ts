/**
 * OpenAI Text-to-Speech helper.
 *
 * Used as the cheap fallback when ElevenLabs credit is exhausted (or its API
 * key isn't configured). About 1/20th the cost of ElevenLabs at comparable
 * quality, slightly higher first-byte latency (~300–500ms vs Flash's ~75ms),
 * good multilingual support (English + Bahasa via the same multilingual model).
 *
 * Docs: https://platform.openai.com/docs/api-reference/audio/createSpeech
 */

import { ENV } from "./env";

const API_URL = "https://api.openai.com/v1/audio/speech";

export type OpenAiTtsVoice =
  | "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type OpenAiTtsModel =
  | "tts-1"           // fast, default — good for live conversation
  | "tts-1-hd"        // higher quality, slower (~2x latency)
  | "gpt-4o-mini-tts"; // newer, balanced

export interface OpenAiTtsOptions {
  text: string;
  /** Voice. `nova` (warm female) reads naturally as a teacher. */
  voice?: OpenAiTtsVoice;
  /** Model. `tts-1` is the right choice for live tutoring latency. */
  model?: OpenAiTtsModel;
  /** Default `mp3`. */
  format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
  /** Playback speed. 0.25–4.0. Default 1.0. */
  speed?: number;
}

export async function synthesizeOpenAI(opts: OpenAiTtsOptions): Promise<Buffer> {
  if (!ENV.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const body: Record<string, unknown> = {
    model: opts.model ?? "tts-1",
    input: opts.text,
    voice: opts.voice ?? "nova",
    response_format: opts.format ?? "mp3",
  };
  if (opts.speed != null && isFinite(opts.speed)) {
    body.speed = Math.max(0.25, Math.min(4.0, opts.speed));
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.openAiApiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `OpenAI TTS failed (${res.status} ${res.statusText})${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }
  return Buffer.from(await res.arrayBuffer());
}
