/**
 * AI IELTS Tutor — landing imagery, generated once via DeepInfra FLUX and
 * stored at fixed R2 keys (served through the /files proxy). Idempotent: a KV
 * marker means it only generates once. Bump the marker version to regenerate.
 */
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { getSchedulerState, setSchedulerState } from "./db";

const MARKER = "tutor_landing_images_v2";
// Force the highest-quality model for landing imagery, regardless of any
// global DEEPINFRA_IMAGE_MODEL override.
const MODEL = "black-forest-labs/FLUX-1.1-pro";
const STYLE = ", cinematic lifestyle photography, shot on 35mm, soft natural golden-hour light, shallow depth of field, vibrant rich colors, ultra realistic, sharp focus, high resolution, aspirational and uplifting mood, no text, no watermark, no logos";

type ImgDef = { key: string; size: string; prompt: string };
const IMAGES: ImgDef[] = [
  { key: "tutor/landing/hero.jpg", size: "1024x576", prompt: "A confident, happy young Indonesian woman studying English for her IELTS exam on a laptop in a bright, stylish modern study space, headphones and notebooks on a clean desk, warm light streaming through a large window, genuine joyful smile, lots of empty negative space on the right side of the frame for text" },
  { key: "tutor/landing/writing.jpg", size: "768x768", prompt: "Beautiful top-down flat-lay of writing an English essay by hand in a neat open notebook with an elegant pen, a laptop edge, a cup of coffee and a small plant on a clean light wooden desk, cozy aesthetic study scene" },
  { key: "tutor/landing/speaking.jpg", size: "768x768", prompt: "A cheerful young Indonesian man wearing sleek modern headphones speaking confidently into a laptop, practicing English speaking, expressive and engaged, colorful bright contemporary room, energetic vibe" },
  { key: "tutor/landing/community.jpg", size: "1024x576", prompt: "A vibrant, joyful group of diverse young Indonesian university students laughing together outdoors on a sunny green campus, holding books and notebooks, energetic and aspirational, bright airy atmosphere" },
];

async function genBuffer(prompt: string, size: string): Promise<Buffer> {
  const res = await fetch("https://api.deepinfra.com/v1/openai/images/generations", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${ENV.deepinfraApiKey}` },
    body: JSON.stringify({ model: MODEL, prompt: prompt + STYLE, n: 1, size, response_format: "b64_json" }),
  });
  if (!res.ok) throw new Error(`DeepInfra ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const data: any = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, "base64");
  const url = data?.data?.[0]?.url;
  if (url) { const r = await fetch(url); return Buffer.from(await r.arrayBuffer()); }
  throw new Error("no image in DeepInfra response");
}

/** Generate the landing images once (best-effort). */
export async function ensureTutorImages(): Promise<void> {
  if (!ENV.deepinfraApiKey) { console.log("[TutorImages] skipped — no DEEPINFRA_API_KEY"); return; }
  if ((await getSchedulerState(MARKER)) === "done") return;
  let allOk = true;
  for (const img of IMAGES) {
    try {
      const buf = await genBuffer(img.prompt, img.size);
      await storagePut(img.key, buf, "image/jpeg");
      console.log("[TutorImages] generated", img.key);
    } catch (e) {
      allOk = false;
      console.error("[TutorImages] failed", img.key, (e as Error).message);
    }
  }
  if (allOk) await setSchedulerState(MARKER, "done");
}

let started = false;
export function startTutorImages() {
  if (started) return;
  started = true;
  // Generate shortly after boot so a deploy auto-populates the images once.
  setTimeout(() => { void ensureTutorImages(); }, 45 * 1000);
}
