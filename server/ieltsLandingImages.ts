/**
 * IELTS landing-page image generation (server-side, idempotent).
 *
 * Used by:
 *   - POST /api/internal/init-landing-images (one-shot remote trigger)
 *   - scripts/generate-ielts-landing-images.ts (local run, same logic)
 *
 * For each defined image: HEAD-check R2. If the key already exists, skip.
 * Otherwise call DeepInfra FLUX-1.1-pro, upload to R2.
 */

import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { ENV } from "./_core/env";

const STYLE_SUFFIX =
  ", photorealistic, professional photography, soft natural lighting, " +
  "shallow depth of field, warm color grading, editorial style, " +
  "clean modern interior, high resolution, magazine quality";

export type Job = {
  key: string;
  prompt: string;
  width?: number;
  height?: number;
};

export const JOBS: Job[] = [
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

function getStorage(): { client: S3Client; bucket: string } {
  if (ENV.r2AccountId && ENV.r2AccessKeyId && ENV.r2SecretAccessKey && ENV.r2Bucket) {
    return {
      client: new S3Client({
        region: "auto",
        endpoint: `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: ENV.r2AccessKeyId,
          secretAccessKey: ENV.r2SecretAccessKey,
        },
      }),
      bucket: ENV.r2Bucket,
    };
  }
  if (ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsS3Bucket) {
    return {
      client: new S3Client({
        region: ENV.awsRegion,
        credentials: {
          accessKeyId: ENV.awsAccessKeyId,
          secretAccessKey: ENV.awsSecretAccessKey,
        },
      }),
      bucket: ENV.awsS3Bucket,
    };
  }
  throw new Error("No storage provider configured");
}

async function existsInStorage(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function generateOne(job: Job): Promise<Buffer> {
  if (!ENV.deepinfraApiKey) {
    throw new Error("DEEPINFRA_API_KEY is not configured");
  }
  const res = await fetch(
    "https://api.deepinfra.com/v1/openai/images/generations",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${ENV.deepinfraApiKey}`,
      },
      body: JSON.stringify({
        model: ENV.deepinfraImageModel,
        prompt: job.prompt + STYLE_SUFFIX,
        n: 1,
        size: `${job.width ?? 1024}x${job.height ?? 1024}`,
        response_format: "b64_json",
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`DeepInfra ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = (await res.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };
  const first = data.data?.[0];
  if (!first) throw new Error("Empty response from DeepInfra");
  if (first.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first.url) {
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) throw new Error(`Failed to fetch image URL: ${imgRes.status}`);
    return Buffer.from(await imgRes.arrayBuffer());
  }
  throw new Error("Neither b64_json nor url in response");
}

export type RunResult = {
  ok: boolean;
  generated: string[];
  skipped: string[];
  failed: Array<{ key: string; error: string }>;
};

/**
 * Idempotent: only generates images that don't already exist in R2. Safe
 * to call multiple times. Used by the public /api/internal/init-landing-
 * images endpoint and the CLI script.
 */
export async function runLandingImageGeneration(): Promise<RunResult> {
  const { client, bucket } = getStorage();
  const out: RunResult = { ok: true, generated: [], skipped: [], failed: [] };

  for (const job of JOBS) {
    try {
      const exists = await existsInStorage(client, bucket, job.key);
      if (exists) {
        out.skipped.push(job.key);
        continue;
      }
      const buf = await generateOne(job);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: job.key,
          Body: buf,
          ContentType: "image/png",
        })
      );
      out.generated.push(job.key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ieltsLandingImages] ${job.key} failed:`, msg);
      out.failed.push({ key: job.key, error: msg });
      out.ok = false;
    }
  }
  return out;
}
