/**
 * IQ Discovery landing imagery, generated once via DeepInfra FLUX-1.1-pro
 * and stored at fixed R2 keys (served through the /files proxy). Idempotent
 * via a KV marker — only runs once. Bump the version to regenerate.
 */
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { getSchedulerState, setSchedulerState } from "./db";

const MARKER = "iq_discovery_landing_images_v1";
const MODEL = "black-forest-labs/FLUX-1.1-pro";

// Shared style anchor for consistent brand look across all landing images.
// Purple + indigo palette to match SpecTa brand + tech-forward feel.
const STYLE = ", cinematic lifestyle photography, shot on 35mm, soft natural window light, shallow depth of field, vibrant rich colors, ultra realistic, sharp focus, high resolution, aspirational mood, purple-indigo-magenta accent lighting, tech-forward aesthetic, no text on any surface, no watermark, no logos, no captions, no writing";

type ImgDef = { key: string; size: string; prompt: string };

const IMAGES: ImgDef[] = [
  // HERO — "moment of discovery" — the hook image
  {
    key: "iq-discovery/landing/hero.jpg",
    size: "1024x576",
    prompt: "Portrait of a curious young Indonesian teenager (17-19 years old) looking at their smartphone screen with an expression of wonder and delight, phone screen glowing with a subtle purple-indigo light illuminating their face, dimly lit modern bedroom in the background with a small desk lamp and study materials softly out of focus, ethereal purple particles floating around the phone suggesting AI intelligence and thought, cinematic close-up composition, warm skin tones contrasted with cool tech lighting, sense of self-discovery and realization, plenty of negative space on the right for text overlay",
  },
  // PAIN / RELATABLE — student contemplating study choices
  {
    key: "iq-discovery/landing/pain.jpg",
    size: "1024x576",
    prompt: "Contemplative young Indonesian student (16-18 years old) sitting at a wooden desk surrounded by multiple textbooks from different subjects — math, science, language, arts — softly blurred in background, chin resting thoughtfully on hand, gazing away from camera with a mildly overwhelmed but hopeful expression, warm afternoon window light from the left, slight purple tone in shadows, sense of uncertainty about which path to choose, relatable and empathetic mood, generous negative space on the right",
  },
  // SOLUTION — someone actively taking a test on phone, engaged
  {
    key: "iq-discovery/landing/taking-test.jpg",
    size: "1024x576",
    prompt: "Young Indonesian student (17-20 years old) sitting comfortably on a modern couch holding a smartphone in both hands, fully focused on a puzzle displayed on the screen (colorful geometric shapes glowing softly in purple and pink), slight smile of engaged concentration, evening ambient lighting with soft purple LED accents on the walls, cozy but modern aesthetic, sense of enjoyment and challenge, cinematic composition",
  },
  // RESULT / SHAREABLE — celebrating a discovered archetype
  {
    key: "iq-discovery/landing/result.jpg",
    size: "1024x576",
    prompt: "Two young Indonesian students (18-20 years old) sitting side by side on a bright modern rooftop or balcony at golden hour, both looking at their phones showing colorful cognitive-profile result cards, both laughing and pointing at each other's screens as they compare results, sense of joy and social sharing, warm sunset light with subtle purple gradient in the sky, aspirational youthful energy, Instagram-worthy composition",
  },
  // ARCHETYPE / VISUAL SYMBOL — abstract representation for section headers
  {
    key: "iq-discovery/landing/brain-glow.jpg",
    size: "768x768",
    prompt: "Beautiful abstract 3D visualization of a stylized human brain rendered in glowing purple, magenta and indigo geometric light patterns, made of interconnected glowing nodes and flowing energy trails like a neural network, floating in dark space with soft particle effects, futuristic AI aesthetic, symmetrical composition, cinematic tech mood, minimalist and elegant",
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

/** Generate the IQ Discovery landing images once (best-effort). */
export async function ensureIqDiscoveryImages(): Promise<void> {
  if (!ENV.deepinfraApiKey) {
    console.log("[IqDiscoveryImages] skipped — no DEEPINFRA_API_KEY");
    return;
  }
  if ((await getSchedulerState(MARKER)) === "done") return;
  let allOk = true;
  for (const img of IMAGES) {
    try {
      const buf = await genBuffer(img.prompt, img.size);
      await storagePut(img.key, buf, "image/jpeg");
      console.log("[IqDiscoveryImages] generated", img.key);
    } catch (e) {
      allOk = false;
      console.error("[IqDiscoveryImages] failed", img.key, (e as Error).message);
    }
  }
  if (allOk) await setSchedulerState(MARKER, "done");
}

let started = false;
export function startIqDiscoveryImages() {
  if (started) return;
  started = true;
  // Delay 90s post-boot to avoid piling on top of other boot-time tasks.
  setTimeout(() => {
    void ensureIqDiscoveryImages();
  }, 90 * 1000);
}
