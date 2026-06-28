/**
 * One-off: generates the dashboard imagery for the IGCSE AI Teacher
 * (/igcse/app) using DeepInfra FLUX-1.1-pro, then uploads each to R2
 * with a predictable key. The dashboard references them via /files/<key>.
 *
 * Usage (in Railway Console with DEEPINFRA_API_KEY available):
 *   pnpm tsx scripts/generate-igcse-landing-images.ts
 *
 * Cost: ~$0.04 per image × 7 = ~$0.30 one-time.
 * Re-running overwrites the previous images (same keys).
 *
 * Casting brief: Indonesian high-school students (ages 14–17), fair skin,
 * neat school appearance, modern study setting. Each subject image shows
 * a different student so the dashboard feels representative (different
 * hair lengths, framings, neutral expressions).
 */

import { storagePut } from "../server/storage";

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY ?? "";
const MODEL = process.env.DEEPINFRA_IMAGE_MODEL ?? "black-forest-labs/FLUX-1.1-pro";

const STYLE_SUFFIX =
  ", photorealistic, professional photography, soft natural lighting, " +
  "shallow depth of field, warm color grading, editorial style, " +
  "clean modern interior, high resolution, magazine quality";

// For the 5 subject tiles we use a still-life suffix instead of a 'clean
// modern interior' one — keeps the set visually cohesive (warm light wood
// desk, soft window light, top-down or close-up, no human figures).
const STILL_LIFE_SUFFIX =
  ", photorealistic editorial still life, top-down flat-lay perspective, " +
  "warm natural side lighting, shallow depth of field, light oak wooden " +
  "desk surface, soft shadows, magazine-quality colour grading, " +
  "no people, no hands, clean composition, high resolution";

type Job = {
  key: string;
  prompt: string;
  width?: number;
  height?: number;
};

const JOBS: Job[] = [
  // ── Hero — welcome banner for the top of the dashboard ──────────────────
  {
    key: "igcse/dashboard/hero.png",
    prompt:
      "A bright modern study room with warm afternoon light. A confident young Indonesian high-school student, around 16 years old, fair skin tone, neatly groomed, wearing a clean white shirt school uniform with a navy tie, sits at a clean white desk with an open notebook and a tablet displaying mathematical diagrams. Smiling gently at the camera. Soft window light from the left. Blurred bookshelves and a small potted plant in the background. Hopeful, inspiring, aspirational mood." +
      STYLE_SUFFIX,
    width: 1344,
    height: 768,
  },

  // ── Mode-card images: Learn vs Practice ─────────────────────────────────
  {
    key: "igcse/dashboard/mode-learn.png",
    prompt:
      "An Indonesian high-school student, around 15 years old, fair skin, neat shoulder-length hair, wearing a clean white shirt school uniform, sitting at a desk speaking thoughtfully to a laptop with a friendly engaged expression. Open notebook beside the laptop. Warm soft window light, blurred home study background, conversational and engaging mood. Camera angle: 3/4 from the side." +
      STYLE_SUFFIX,
    width: 1024,
    height: 768,
  },
  {
    key: "igcse/dashboard/mode-practice.png",
    prompt:
      "An Indonesian high-school student, around 16 years old, fair skin, short neat hair, wearing a clean white shirt school uniform, focused expression, writing in a notebook with a pencil while looking at a tablet showing a Cambridge-style exam question. Hand visible writing. Soft natural light, blurred modern study desk background, determined and focused mood." +
      STYLE_SUFFIX,
    width: 1024,
    height: 768,
  },

  // ── Subject tiles — themed STILL LIFES (no humans) ─────────────────────
  // The five subject tiles share a cohesive aesthetic: warm light-oak desk,
  // soft natural side light, top-down or close-up still life, subject-
  // specific objects. Each one evokes its subject's "vibe" without using
  // a model.

  {
    key: "igcse/dashboard/subject-math.png",
    prompt:
      "A beautiful flat-lay still life on a light oak wooden desk: an open mathematics notebook showing elegant hand-drawn geometric diagrams (a perfect circle with inscribed triangle, a smooth parabolic curve, a coordinate grid with a plotted line), neatly handwritten algebraic equations in dark blue ink, beside it a wooden ruler, a brass compass, a clear plastic protractor, a sharpened yellow pencil. A small fresh leaf in the corner for warmth. Pristine, organised, inspiring an elegant mathematical mood." +
      STILL_LIFE_SUFFIX,
    width: 768,
    height: 768,
  },
  {
    key: "igcse/dashboard/subject-physics.png",
    prompt:
      "A still-life scene on a light oak wooden desk: a small Newton's cradle (5 polished steel balls suspended on threads), beside it a glass triangular prism splitting a thin beam of white light into a soft visible spectrum on the desk surface, a brass pocket compass, an open notebook page with hand-drawn force-arrow vectors and a pendulum sketch. Soft warm window light from the side, slight shimmer on the glass and brass, scientific and curious atmosphere." +
      STILL_LIFE_SUFFIX,
    width: 768,
    height: 768,
  },
  {
    key: "igcse/dashboard/subject-chemistry.png",
    prompt:
      "A beautiful close-up still life of three clear glass laboratory conical (Erlenmeyer) flasks on a clean white tile surface, each holding a different coloured liquid (one pale sky blue, one pale spring green, one soft amber-yellow). Light catches the curved glass and produces gentle highlights and reflections. Behind them, slightly out of focus, a periodic-table chart on the wall and a small molecular ball-and-stick model of water. Warm soft window light from the left. Clean, curious, scientific mood." +
      STILL_LIFE_SUFFIX,
    width: 768,
    height: 768,
  },
  {
    key: "igcse/dashboard/subject-economics.png",
    prompt:
      "A flat-lay still life on a light oak wooden desk: an open notebook page showing a neatly hand-drawn supply-and-demand graph with two crossing curves labelled S and D and an equilibrium point marked, beside it a small stack of crisp paper currency (neutral generic banknotes, no recognisable country), three vintage brass coins arranged casually, a magnifying glass resting on a printed line graph, and a fountain pen across the corner. Warm soft side lighting, analytical and thoughtful mood." +
      STILL_LIFE_SUFFIX,
    width: 768,
    height: 768,
  },
  {
    key: "igcse/dashboard/subject-business.png",
    prompt:
      "A flat-lay still life of a planning workspace on a light oak wooden desk: an open leather-bound notebook showing a neatly hand-drawn business diagram (a SWOT 2×2 grid with quadrants labelled, an arrow chart, a small mind map), beside it a sleek black fountain pen, a small wooden desk calendar, a porcelain coffee cup on a saucer with light steam, a smartphone face down, a few colourful sticky notes with strategic words. Warm soft window light, professional and aspirational mood." +
      STILL_LIFE_SUFFIX,
    width: 768,
    height: 768,
  },
];

const DEEPINFRA_IMAGE_URL = "https://api.deepinfra.com/v1/openai/images/generations";

async function generateOne(job: Job): Promise<Buffer> {
  const res = await fetch(DEEPINFRA_IMAGE_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${DEEPINFRA_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: job.prompt,
      n: 1,
      size: `${job.width ?? 1024}x${job.height ?? 1024}`,
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }
  const data = (await res.json()) as { data: Array<{ b64_json?: string; url?: string }> };
  const first = data.data?.[0];
  if (!first) throw new Error("Empty response from DeepInfra");
  if (first.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first.url) {
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) throw new Error(`Failed to fetch generated image url: ${imgRes.status}`);
    return Buffer.from(await imgRes.arrayBuffer());
  }
  throw new Error("Neither b64_json nor url in response");
}

async function main() {
  if (!DEEPINFRA_API_KEY) {
    throw new Error("DEEPINFRA_API_KEY is not set in this environment");
  }
  console.log(`Generating ${JOBS.length} images with ${MODEL}...\n`);

  for (const job of JOBS) {
    process.stdout.write(`  ${job.key}... `);
    try {
      const buf = await generateOne(job);
      const { url } = await storagePut(job.key, buf, "image/png");
      console.log(`OK  ${(buf.byteLength / 1024).toFixed(0)} KB`);
      console.log(`    storage url: ${url}`);
      console.log(`    page url:    /files/${job.key}\n`);
    } catch (err) {
      console.log("FAILED");
      console.error("    ", err instanceof Error ? err.message : err, "\n");
    }
  }

  console.log("Done. Reference each image as /files/<key> in the React page.");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
