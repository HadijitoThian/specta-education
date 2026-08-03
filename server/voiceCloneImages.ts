/**
 * Voice Clone landing imagery, generated once via DeepInfra FLUX-1.1-pro and
 * stored at fixed R2 keys (served through the /files proxy). Idempotent: a KV
 * marker means it only generates once. Bump the marker version to regenerate.
 */
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { getSchedulerState, setSchedulerState } from "./db";

const MARKER = "voice_clone_landing_images_v1";
const MODEL = "black-forest-labs/FLUX-1.1-pro";
const STYLE = ", cinematic lifestyle photography, shot on 35mm, soft natural window light, shallow depth of field, vibrant rich colors, ultra realistic, sharp focus, high resolution, aspirational and uplifting mood, purple-pink-magenta accent lighting, no text, no watermark, no logos, no captions";

type ImgDef = { key: string; size: string; prompt: string };
const IMAGES: ImgDef[] = [
  {
    key: "voice-clone/landing/hero.jpg",
    size: "1024x576",
    prompt: "A confident young Indonesian woman wearing modern over-ear headphones with a subtle purple-pink glow, speaking into a sleek podcast microphone at a clean minimalist desk, eyes bright and focused, genuine expression of pleasant surprise as if hearing her own voice for the first time, soft magenta and violet rim lighting, dark modern background with bokeh, lots of empty negative space on the right side of the frame for text overlay",
  },
  {
    key: "voice-clone/landing/waveform.jpg",
    size: "1024x576",
    prompt: "Abstract elegant audio waveform visualization made of glowing purple, fuchsia and pink light ribbons flowing horizontally on a very dark navy background, futuristic AI voice technology aesthetic, sense of two voices comparing side by side, sharp neon glow, cinematic tech mood",
  },
  {
    key: "voice-clone/landing/recording.jpg",
    size: "768x768",
    prompt: "A cheerful young Indonesian university student holding a smartphone close to their mouth like recording a voice note, expressive engaged smile, warm evening light in a modern bedroom study space with plants and fairy lights, cozy aspirational learning atmosphere",
  },
  {
    key: "voice-clone/landing/result.jpg",
    size: "768x768",
    prompt: "A happy young Indonesian man sitting in a stylish coffee shop wearing wireless earbuds, laughing joyfully while looking at his laptop screen, laptop showing an abstract audio-comparison interface with glowing purple accent, sense of surprise and delight, warm afternoon window light",
  },
];

async function genBuffer(prompt: string, size: string): Promise<Buffer> {
  const res = await fetch("https://api.deepinfra.com/v1/openai/images/generations", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${ENV.deepinfraApiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: prompt + STYLE,
      n: 1,
      size,
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `DeepInfra ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`
    );
  }
  const data: any = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, "base64");
  const url = data?.data?.[0]?.url;
  if (url) {
    const r = await fetch(url);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error("no image in DeepInfra response");
}

/** Generate the Voice Clone landing images once (best-effort). */
export async function ensureVoiceCloneImages(): Promise<void> {
  if (!ENV.deepinfraApiKey) {
    console.log("[VoiceCloneImages] skipped — no DEEPINFRA_API_KEY");
    return;
  }
  if ((await getSchedulerState(MARKER)) === "done") return;
  let allOk = true;
  for (const img of IMAGES) {
    try {
      const buf = await genBuffer(img.prompt, img.size);
      await storagePut(img.key, buf, "image/jpeg");
      console.log("[VoiceCloneImages] generated", img.key);
    } catch (e) {
      allOk = false;
      console.error("[VoiceCloneImages] failed", img.key, (e as Error).message);
    }
  }
  if (allOk) await setSchedulerState(MARKER, "done");
}

let started = false;
export function startVoiceCloneImages() {
  if (started) return;
  started = true;
  setTimeout(() => {
    void ensureVoiceCloneImages();
  }, 60 * 1000);
}
