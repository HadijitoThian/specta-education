/**
 * ElevenLabs Text-to-Speech helper.
 *
 * Used by:
 *   - IELTS Listening content generation (admin tool) — generate the four
 *     listening sections, upload audio to R2, persist URLs in DB.
 *   - IELTS Speaking live agent — stream examiner voice during the test.
 *
 * Two surfaces:
 *   - `synthesize()`     — returns a complete Buffer (good for storing in R2)
 *   - `synthesizeStream()` — returns a ReadableStream (good for low-latency
 *                            live use cases)
 *
 * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
 */

import { ENV } from "./env";

const API_BASE = "https://api.elevenlabs.io/v1";

export type SynthesizeOptions = {
  text: string;
  /** Voice ID from ElevenLabs voice library. Falls back to ENV default. */
  voiceId?: string;
  /** Model ID. Defaults to env-configured (turbo for speed, multilingual_v2 for quality). */
  modelId?: string;
  /** Output format. `mp3_44100_128` is the default; `mp3_22050_32` is smaller. */
  outputFormat?:
    | "mp3_22050_32"
    | "mp3_44100_64"
    | "mp3_44100_96"
    | "mp3_44100_128"
    | "mp3_44100_192";
  /** 0-1; 0 = expressive, 1 = stable. IELTS narration: 0.4-0.6 is natural. */
  stability?: number;
  /** 0-1; how strongly to match the voice. IELTS: 0.7-0.8 is good. */
  similarityBoost?: number;
};

function assertKey() {
  if (!ENV.elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
}

function buildBody(opts: SynthesizeOptions) {
  return JSON.stringify({
    text: opts.text,
    model_id: opts.modelId ?? ENV.elevenLabsModelId,
    voice_settings: {
      stability: opts.stability ?? 0.5,
      similarity_boost: opts.similarityBoost ?? 0.75,
    },
  });
}

function buildUrl(voiceId: string, outputFormat?: string) {
  const url = new URL(`${API_BASE}/text-to-speech/${voiceId}`);
  if (outputFormat) {
    url.searchParams.set("output_format", outputFormat);
  }
  return url.toString();
}

/**
 * Synthesize text to a complete audio buffer. Use for content generation
 * (Listening sections) where we upload the result to R2.
 */
export async function synthesize(opts: SynthesizeOptions): Promise<Buffer> {
  assertKey();

  const voiceId = opts.voiceId ?? ENV.elevenLabsDefaultVoiceId;
  const url = buildUrl(voiceId, opts.outputFormat ?? "mp3_44100_128");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "audio/mpeg",
      "content-type": "application/json",
      "xi-api-key": ENV.elevenLabsApiKey,
    },
    body: buildBody(opts),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Stream audio as it's generated. Use for the live Speaking agent so the
 * student hears the examiner with minimal latency. Returns the raw fetch
 * Response so callers can pipe it to a WebSocket or HTTP response.
 */
export async function synthesizeStream(
  opts: SynthesizeOptions
): Promise<Response> {
  assertKey();

  const voiceId = opts.voiceId ?? ENV.elevenLabsDefaultVoiceId;
  // /stream endpoint variant for low-latency.
  const url = `${API_BASE}/text-to-speech/${voiceId}/stream${
    opts.outputFormat ? `?output_format=${opts.outputFormat}` : ""
  }`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "audio/mpeg",
      "content-type": "application/json",
      "xi-api-key": ENV.elevenLabsApiKey,
    },
    body: buildBody(opts),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS stream failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  return response;
}

/**
 * Recommended voice mapping for IELTS Listening sections. Real IELTS rotates
 * accents (British, Australian, New Zealand, American). We mirror that.
 */
export const LISTENING_VOICE_MAP = {
  /** Section 1: everyday social conversation (e.g., booking accommodation) */
  section1: {
    primary: "EXAVITQu4vr4xnSDxMaL",   // British female
    secondary: "ErXwobaYiN019PkySvjV", // British male
  },
  /** Section 2: monologue in social context (welcome talk, tour) */
  section2: {
    primary: "VR6AewLTigWG4xSOukaG", // Australian male
  },
  /** Section 3: educational conversation (tutorial, group work) */
  section3: {
    primary: "21m00Tcm4TlvDq8ikWAM",   // American academic female
    secondary: "EXAVITQu4vr4xnSDxMaL", // British female
  },
  /** Section 4: academic lecture */
  section4: {
    primary: "ErXwobaYiN019PkySvjV", // British male, academic tone
  },
  /**
   * Exam narrator — reads the standard IELTS-style instructions ("This is the
   * Listening test…", reading-time and check cues). A calm British male
   * announcer, kept DISTINCT from every section speaker.
   */
  narrator: "onwK4e9ZLuTAKqWW03F9", // Daniel — British male, news/announcer tone
} as const;
