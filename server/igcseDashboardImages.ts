/**
 * IGCSE dashboard image generation — server-side.
 *
 * Used by:
 *   • scripts/generate-igcse-landing-images.ts (CLI / Railway Console)
 *   • the admin endpoint igcseRouter.adminRegenerateDashboardImages
 *     (UI button on /admin → IGCSE tab)
 *
 * Generates the same 8 dashboard images via DeepInfra (FLUX-1.1-pro) and
 * uploads them to R2 with predictable keys. Re-running overwrites the
 * previous images (same keys). Cost ≈ \$0.32 per full run.
 *
 * Casting brief:
 *   • Hero + the two mode cards: Indonesian high-school students aged
 *     14–17, fair skin, neat school appearance. Aspirational study moods.
 *   • The five subject tiles: editorial still-lifes (no people, no hands)
 *     on a light oak wooden desk with warm window light — each tile shows
 *     subject-specific objects (Newton's cradle for physics, Erlenmeyer
 *     flasks for chemistry, hand-drawn supply-and-demand for economics,
 *     etc.).
 */
import { storagePut } from "./storage";
import { ENV } from "./_core/env";

const DEEPINFRA_IMAGE_URL = "https://api.deepinfra.com/v1/openai/images/generations";

const STYLE_SUFFIX =
  ", photorealistic, professional photography, soft natural lighting, " +
  "shallow depth of field, warm color grading, editorial style, " +
  "clean modern interior, high resolution, magazine quality";

const STILL_LIFE_SUFFIX =
  ", photorealistic editorial still life, top-down flat-lay perspective, " +
  "warm natural side lighting, shallow depth of field, light oak wooden " +
  "desk surface, soft shadows, magazine-quality colour grading, " +
  "no people, no hands, clean composition, high resolution";

export type Job = {
  key: string;
  prompt: string;
  width?: number;
  height?: number;
};

/** The full set of dashboard images. Predictable keys → safe to re-run. */
export const DASHBOARD_JOBS: Job[] = [
  // ── Hero ─────────────────────────────────────────────────────────────────
  {
    key: "igcse/dashboard/hero.png",
    prompt:
      "A bright modern study room with warm afternoon light. A confident young Indonesian high-school student, around 16 years old, fair skin tone, neatly groomed, wearing a clean white shirt school uniform with a navy tie, sits at a clean white desk with an open notebook and a tablet displaying mathematical diagrams. Smiling gently at the camera. Soft window light from the left. Blurred bookshelves and a small potted plant in the background. Hopeful, inspiring, aspirational mood." +
      STYLE_SUFFIX,
    width: 1344,
    height: 768,
  },

  // ── Mode cards: Learn / Practice (humans) ────────────────────────────────
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

  // ── Subject tiles — themed STILL LIFES (no humans) ──────────────────────
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

async function generateOne(job: Job): Promise<Buffer> {
  if (!ENV.deepinfraApiKey) {
    throw new Error("DEEPINFRA_API_KEY is not configured on the server.");
  }
  const model = ENV.deepinfraImageModel || "black-forest-labs/FLUX-1.1-pro";
  const res = await fetch(DEEPINFRA_IMAGE_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${ENV.deepinfraApiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: job.prompt,
      n: 1,
      size: `${job.width ?? 1024}x${job.height ?? 1024}`,
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`DeepInfra ${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
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

export type GenerateProgress = {
  state: "running" | "done" | "failed";
  completed: number; // jobs finished (success or failure)
  total: number;
  current?: string; // key currently being generated
  results: Array<{ key: string; ok: boolean; bytes?: number; error?: string }>;
  startedAt: number;
  finishedAt?: number;
  error?: string; // top-level fatal
};

// In-memory progress tracker so the admin UI can poll it.
let progress: GenerateProgress | null = null;
export function getDashboardImageProgress(): GenerateProgress | null {
  return progress;
}

/**
 * Generate (or regenerate) the dashboard image set. Idempotent in the sense
 * that it always overwrites the same R2 keys. Updates the in-memory progress
 * tracker as it goes so the admin UI can show a live status.
 *
 * Accepts an optional `subset` param so the admin button can offer "just the
 * 5 subject tiles" without burning extra cost on the hero + mode cards.
 */
export async function generateIgcseDashboardImages(opts?: {
  subset?: "all" | "subjects" | "humans";
}): Promise<GenerateProgress> {
  const subset = opts?.subset ?? "all";
  const filtered = DASHBOARD_JOBS.filter(j => {
    if (subset === "all") return true;
    if (subset === "subjects") return j.key.includes("/subject-");
    if (subset === "humans") return !j.key.includes("/subject-");
    return true;
  });

  progress = {
    state: "running",
    completed: 0,
    total: filtered.length,
    results: [],
    startedAt: Date.now(),
  };

  for (const job of filtered) {
    progress.current = job.key;
    try {
      const buf = await generateOne(job);
      await storagePut(job.key, buf, "image/png");
      progress.results.push({ key: job.key, ok: true, bytes: buf.byteLength });
      console.log(`[IGCSE images] ${job.key} OK (${(buf.byteLength / 1024).toFixed(0)} KB)`);
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      progress.results.push({ key: job.key, ok: false, error: msg });
      console.error(`[IGCSE images] ${job.key} FAILED: ${msg}`);
    } finally {
      progress.completed += 1;
    }
  }

  progress.current = undefined;
  progress.state = progress.results.every(r => r.ok) ? "done" : "failed";
  progress.finishedAt = Date.now();
  return progress;
}
