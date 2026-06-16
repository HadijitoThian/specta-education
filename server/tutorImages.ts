/**
 * AI IELTS Tutor — landing imagery, generated once via DeepInfra FLUX and
 * stored at fixed R2 keys (served through the /files proxy). Idempotent: a KV
 * marker means it only generates once. Bump the marker version to regenerate.
 */
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { getSchedulerState, setSchedulerState } from "./db";

const MARKER = "tutor_landing_images_v1";
const STYLE = ", professional photography, natural soft lighting, photorealistic, high detail, clean modern composition, vibrant but tasteful";

type ImgDef = { key: string; size: string; prompt: string };
const IMAGES: ImgDef[] = [
  { key: "tutor/landing/hero.jpg", size: "1024x576", prompt: "A cheerful young Indonesian university student studying English for the IELTS exam on a laptop at a tidy desk with notebooks and a coffee, confident smile, bright airy room, plenty of empty copy space on the right side" },
  { key: "tutor/landing/writing.jpg", size: "768x768", prompt: "Close-up of a young student's hand writing an English essay neatly in a notebook with a pen beside an open laptop, focused warm study scene" },
  { key: "tutor/landing/speaking.jpg", size: "768x768", prompt: "A young Indonesian student wearing headphones speaking into a laptop microphone while practicing English speaking, smiling and engaged, bright modern room" },
  { key: "tutor/landing/community.jpg", size: "1024x576", prompt: "A diverse group of happy young Indonesian university students celebrating success together holding books and notebooks on a bright campus, warm friendly mood" },
];

async function genBuffer(prompt: string, size: string): Promise<Buffer> {
  const res = await fetch("https://api.deepinfra.com/v1/openai/images/generations", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${ENV.deepinfraApiKey}` },
    body: JSON.stringify({ model: ENV.deepinfraImageModel, prompt: prompt + STYLE, n: 1, size, response_format: "b64_json" }),
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
