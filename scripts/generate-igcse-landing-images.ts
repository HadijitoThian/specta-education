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

  // ── Subject portraits — one per subject ────────────────────────────────
  {
    key: "igcse/dashboard/subject-math.png",
    prompt:
      "Portrait of an Indonesian high-school student, around 16 years old, fair skin, neat appearance, wearing a clean white shirt school uniform, calmly looking at an open mathematics textbook with geometric diagrams and equations visible. Soft natural light from a window. Editorial portrait style, focused and analytical mood." +
      STYLE_SUFFIX,
    width: 768,
    height: 768,
  },
  {
    key: "igcse/dashboard/subject-physics.png",
    prompt:
      "Portrait of an Indonesian high-school student, around 16 years old, fair skin, neat appearance, wearing a clean white shirt school uniform with a navy tie, looking at a physics worksheet showing force diagrams and circuit diagrams. Soft natural light, slight smile, curious and engaged expression." +
      STYLE_SUFFIX,
    width: 768,
    height: 768,
  },
  {
    key: "igcse/dashboard/subject-chemistry.png",
    prompt:
      "Portrait of an Indonesian high-school student, around 16 years old, fair skin, hair tied back, wearing a clean white shirt school uniform under a clean lab coat, holding a small glass beaker with clear liquid. Soft natural laboratory light, clean modern school chemistry lab in the blurred background. Focused, careful, curious expression." +
      STYLE_SUFFIX,
    width: 768,
    height: 768,
  },
  {
    key: "igcse/dashboard/subject-economics.png",
    prompt:
      "Portrait of an Indonesian high-school student, around 17 years old, fair skin, neat shoulder-length hair, wearing a clean white shirt school uniform with a navy blazer, looking at a notebook with hand-drawn supply-and-demand diagrams and graphs. Soft natural light, thoughtful and analytical expression. Modern study room blurred in the background." +
      STYLE_SUFFIX,
    width: 768,
    height: 768,
  },
  {
    key: "igcse/dashboard/subject-business.png",
    prompt:
      "Portrait of an Indonesian high-school student, around 17 years old, fair skin, neat appearance, wearing a clean white shirt school uniform with a navy blazer, smiling confidently while looking at a tablet showing a business case study. Soft natural light, modern professional study setting blurred in the background. Confident, ambitious, aspirational mood." +
      STYLE_SUFFIX,
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
