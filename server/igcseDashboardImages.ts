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

// Hero needs a human; we keep that one editorial. Subject tiles + mode cards
// switched to grounded, candid object photography (no humans, no hands) to
// avoid the AI-generated 'plastic skin' / wrong-fingers look.
const STYLE_SUFFIX =
  ", photorealistic, professional photography, soft natural lighting, " +
  "shallow depth of field, warm color grading, editorial style, " +
  "clean modern interior, high resolution, magazine quality";

const STILL_LIFE_SUFFIX =
  ", grounded candid documentary photography, natural lighting only, " +
  "shot on a 50mm lens, real textures (wood grain, paper grain, ink bleed, " +
  "natural fingerprints on glass), light oak wooden desk surface, " +
  "soft warm side window light, gentle realistic shadows, mild film grain, " +
  "muted natural colour palette, no people, no hands, no faces, " +
  "no perfect symmetry, slightly imperfect composition, high resolution";

// Wider 3/4-view variant for the two mode-card images (1024x768 horizontal).
const DESK_SCENE_SUFFIX =
  ", grounded candid documentary photography of a real desk scene, " +
  "shot on a 50mm lens at f/2.8, three-quarter angle view from one side " +
  "(not top-down), natural lighting only — warm afternoon light from a " +
  "window off to one side, real textures (wood grain, paper grain, fabric, " +
  "ceramic), light oak wooden desk surface, gentle realistic shadows, " +
  "mild film grain, muted natural colour palette, lived-in feel — like " +
  "the person just stepped away — no people, no hands, no faces, " +
  "slightly imperfect natural composition, high resolution";

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

  // ── Mode cards — desk scenes (no people, no hands; matches still-life feel) ──
  {
    key: "igcse/dashboard/mode-learn.png",
    prompt:
      "A warm, lived-in desk scene on a light oak wooden desk, photographed at " +
      "a three-quarter angle. An open thin silver laptop sits centred with its " +
      "screen showing a soft warm glow (slightly out of focus so the screen " +
      "content is barely legible). To the right of the laptop, a wireless " +
      "earbud case lies open. To the left, an open spiral notebook with " +
      "casual hand-drawn diagrams and short notes in blue ink, a freshly " +
      "sharpened pencil resting across it. A white ceramic mug of tea with " +
      "soft steam rising. A small house plant just inside frame. Warm " +
      "late-afternoon sunlight from a window on the left throws gentle " +
      "shadows across the desk. The scene looks like a real student just " +
      "stepped away from a tutoring session. Conversational, friendly, inviting." +
      DESK_SCENE_SUFFIX,
    width: 1024,
    height: 768,
  },
  {
    key: "igcse/dashboard/mode-practice.png",
    prompt:
      "A focused exam-prep desk scene on a light oak wooden desk, photographed " +
      "at a three-quarter angle. A printed exam paper headed 'Cambridge IGCSE " +
      "— Question Paper' in subtle black serif type lies in the middle of the " +
      "desk (the body text is gently out of focus, not legible — just block-" +
      "shapes implying paragraphs and question numbers). A sharpened HB " +
      "pencil and a black ball-point pen rest neatly on top of the paper. A " +
      "small round analog desk clock sits beside it showing about ten past " +
      "the hour. A clear plastic ruler and a scientific calculator are " +
      "nearby. A folded pair of reading glasses sits at the edge. Cool morning " +
      "light from a window on the right throws crisp shadows. The mood is " +
      "quiet, focused, determined — like a student has just sat down to " +
      "start a timed practice paper." +
      DESK_SCENE_SUFFIX,
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
    key: "igcse/dashboard/subject-biology.png",
    prompt:
      "A beautiful still life on a light oak wooden desk: an open vintage biology field notebook showing neat hand-drawn pencil sketches of a leaf cross-section and a cell with labelled organelles (nucleus, mitochondria, chloroplasts), beside it a brass magnifying glass resting partly over a fresh deep-green fern leaf and a small pressed flower, a clear glass microscope slide with a dark specimen, and a pair of small rounded plant tweezers. Warm soft window light from the side highlights the green of the leaf and the curl of the pages. Calm, curious, natural-science mood." +
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

// Last successful regen time — used by the dashboard as a cache-bust token on
// image URLs (?v=<this>) so freshly-uploaded images appear immediately instead
// of fighting the browser cache. Memory-only; resets on server restart, which
// is fine — re-running the admin button bumps it again.
let lastFinishedAt = 0;
export function getDashboardImagesVersion(): number {
  return lastFinishedAt;
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

  // Bump the cache-bust token so the dashboard picks up the new images on
  // its next load (even with the same R2 URLs).
  if (progress.results.some(r => r.ok)) {
    lastFinishedAt = progress.finishedAt;
  }

  return progress;
}
