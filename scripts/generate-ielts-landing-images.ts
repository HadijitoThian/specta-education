/**
 * One-off: generates the marketing images for the IELTS Mock Test landing
 * page using DeepInfra FLUX-1.1-pro, then uploads each to R2 with a
 * predictable key. The landing page references them via /files/<key>.
 *
 * Usage (in Railway Console):
 *   pnpm tsx scripts/generate-ielts-landing-images.ts
 *
 * Cost: ~$0.04 per image × 7 = ~$0.30 one-time.
 *
 * Re-running overwrites the previous images (same keys).
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
  {
    key: "ielts/landing/hero.png",
    prompt:
      "A confident young Southeast Asian university student, 20 years old, wearing comfortable casual clothes, sitting at a clean modern white desk with a laptop, wearing white over-ear headphones, looking thoughtful and engaged, taking notes in a notebook, soft window light from the side, blurred modern home study room background with plants and bookshelves, hopeful and inspiring mood",
    width: 1344,
    height: 896,
  },
  {
    key: "ielts/landing/skill-listening.png",
    prompt:
      "Close-up portrait of a young Southeast Asian student wearing premium white over-ear headphones, eyes closed gently in concentration, peaceful focused expression, soft side light, neutral cream background, editorial portrait",
    width: 1024,
    height: 1024,
  },
  {
    key: "ielts/landing/skill-reading.png",
    prompt:
      "Young Southeast Asian student reading from a tablet at a wooden desk, holding a pen ready to take notes, soft natural morning light from a window, modern cozy study room, warm tones, focused expression, hands and tablet in sharp focus",
    width: 1024,
    height: 1024,
  },
  {
    key: "ielts/landing/skill-writing.png",
    prompt:
      "Hands of a young Southeast Asian student typing on a sleek modern laptop, partial view of an essay document on the screen, clean white desk, notebook and coffee mug next to the laptop, soft window light, top-down 45 degree angle, productive focused atmosphere",
    width: 1024,
    height: 1024,
  },
  {
    key: "ielts/landing/skill-speaking.png",
    prompt:
      "A young Southeast Asian student speaking confidently into a small desktop microphone, gesturing naturally with one hand, looking at a laptop screen, warm engaged expression, clean modern home office, blurred bookshelf in background, soft warm lighting",
    width: 1024,
    height: 1024,
  },
  {
    key: "ielts/landing/success-students.png",
    prompt:
      "Three diverse young Southeast Asian university students, mixed gender, smiling and high-fiving in a bright modern study lounge, laptops open on a table, celebratory moment, warm natural lighting, slight motion blur on hands, joyful inspiring scene, editorial lifestyle photography",
    width: 1344,
    height: 896,
  },
  {
    key: "ielts/landing/report-mockup.png",
    prompt:
      "A clean modern certificate-style score report document laid flat on a wooden desk, showing a band score chart and four skill rows with horizontal bar graphs in blue and amber tones, sleek typography (text deliberately blurred and unreadable), a fountain pen and small succulent plant beside it, soft daylight from the top-left, premium editorial product photography, no logos, no recognizable branding, no readable words",
    width: 1024,
    height: 1024,
  },
];

async function generateOne(job: Job): Promise<Buffer> {
  const res = await fetch(
    "https://api.deepinfra.com/v1/openai/images/generations",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${DEEPINFRA_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: job.prompt + STYLE_SUFFIX,
        n: 1,
        size: `${job.width ?? 1024}x${job.height ?? 1024}`,
        response_format: "b64_json",
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }

  const data = (await res.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };
  const first = data.data?.[0];
  if (!first) throw new Error("Empty response from DeepInfra");

  if (first.b64_json) {
    return Buffer.from(first.b64_json, "base64");
  }
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
      // Page references /files/<key> served via Railway, so also print that.
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
