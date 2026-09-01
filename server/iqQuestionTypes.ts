/**
 * SpecTa IQ Discovery — shared question type definitions.
 *
 * Every question in the bank has a `type` field that tells the client
 * which renderer to draw with, and dictates the shape of `prompt` and
 * `options` JSON. Keeping these types in one place means the AI
 * generator, the server validator, and the client SVG renderer all agree
 * on the wire format.
 *
 * Design principle: prompt + options are STRUCTURED, not raw HTML/SVG.
 * The client's typed renderer converts structured data → SVG. This means:
 *   - We can programmatically verify the correct answer (never rely on
 *     the AI saying "the answer is B").
 *   - We can regenerate visuals with new palettes / sizes without
 *     regenerating the question bank.
 *   - Malicious payloads can't inject arbitrary markup.
 */

// ── Palette (colorblind-safe, high-contrast) ─────────────────────────────
// Same 6 colors used across all visual questions. Chosen for:
//   - High contrast on light and dark backgrounds
//   - Distinguishable by shape as a backup for colorblind students
//   - Consistent with SpecTa Education brand palette (red/indigo core)
export const IQ_COLORS = ["red", "blue", "green", "yellow", "purple", "orange"] as const;
export type IqColor = typeof IQ_COLORS[number];

// Concrete hex values — kept here so client renderer and any thumbnail
// / share-image generator use the same values.
export const IQ_COLOR_HEX: Record<IqColor, string> = {
  red:    "#ef4444",
  blue:   "#3b82f6",
  green:  "#22c55e",
  yellow: "#eab308",
  purple: "#a855f7",
  orange: "#f97316",
};

export const IQ_SHAPES = ["circle", "square", "triangle", "diamond", "hexagon", "star"] as const;
export type IqShape = typeof IQ_SHAPES[number];

// ── Domain definitions ───────────────────────────────────────────────────
export const IQ_DOMAINS = ["fluid", "quantitative", "verbal", "spatial", "memory"] as const;
export type IqDomain = typeof IQ_DOMAINS[number];

export const IQ_DOMAIN_LABELS: Record<IqDomain, { id: string; en: string }> = {
  fluid:        { id: "Penalaran Logika",   en: "Fluid Reasoning" },
  quantitative: { id: "Penalaran Angka",    en: "Quantitative Reasoning" },
  verbal:       { id: "Penalaran Verbal",   en: "Verbal Reasoning" },
  spatial:      { id: "Penalaran Spasial",  en: "Visual-Spatial Reasoning" },
  memory:       { id: "Memori Kerja",       en: "Working Memory" },
};

// ── Renderer types ───────────────────────────────────────────────────────
// Every value here is a string constant (not enum) so we can add new
// renderers in the future without a schema migration on the `type` column.
export const IQ_TYPES = {
  // Pure text question — verbal analogies, sentence completion, some numerical
  TEXT: "text",
  // 3×3 matrix puzzle — shapes with color/size/rotation attributes. Client
  // draws each cell as an SVG. 8 cells shown, 9th is "?".
  MATRIX_3X3: "matrix_3x3",
  // Odd one out — 4 shapes, pick the one that doesn't fit the pattern.
  ODD_ONE_OUT: "odd_one_out",
  // Visual sequence — row of 4-5 shapes with one missing at the end.
  SEQUENCE: "sequence",
  // Mental rotation — a 3D shape shown as an isometric SVG + 4 rotated
  // options. Answer = the one that's a valid rotation of the original.
  ROTATION_3D: "rotation_3d",
  // Paper folding — SVG of a paper folded k times with a punch/cut,
  // options = 4 possible unfolded patterns.
  PAPER_FOLD: "paper_fold",
  // Working memory flash — server sends a sequence, client shows it for
  // N seconds, then hides and asks recall (forward or reverse).
  MEMORY_FLASH: "memory_flash",
} as const;

// ── Prompt / option JSON shapes per type ─────────────────────────────────
// The AI generator produces these; the server persists them verbatim;
// the client renders them. All values are plain data, no code.

/** A single visual cell / shape used by matrix, sequence, odd-one-out. */
export interface IqShapeSpec {
  shape: IqShape;
  color: IqColor;
  /** 1 (small) to 3 (large). */
  size: 1 | 2 | 3;
  /** Rotation in degrees, multiples of 45. */
  rotation?: 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
  /** Optional inner count (e.g. 2 dots inside the shape). */
  count?: 1 | 2 | 3 | 4;
}

export interface IqTextPrompt {
  text: string;
  /** Optional context line — e.g. "Perhatikan pola berikut:" */
  context?: string;
}
export interface IqTextOption { text: string }

export interface IqMatrixPrompt {
  /** 3×3 grid. The [2][2] cell (bottom-right) MUST be null — that's the
   *  unknown slot the student picks. */
  grid: Array<Array<IqShapeSpec | null>>;
  /** Optional intro text ("Complete the pattern:") — usually omitted. */
  hint?: string;
}
export interface IqMatrixOption { shape: IqShapeSpec }

export interface IqSequencePrompt {
  /** Row of shapes with one missing (position marked with null). */
  row: Array<IqShapeSpec | null>;
  hint?: string;
}

export interface IqOddOneOutPrompt {
  /** 4 shapes shown. Correct answer = index of the one that doesn't fit. */
  shapes: IqShapeSpec[];
  hint?: string;
}

export interface IqRotation3DPrompt {
  /** The reference shape rendered as an isometric-cube description.
   *  Each visible face gets a color; the client renders in isometric view. */
  cube: { top: IqColor; front: IqColor; right: IqColor };
  /** Rotation to apply — the student picks which option matches. */
  rotationAxis: "x" | "y" | "z";
  rotationDegrees: 90 | 180 | 270;
}
export interface IqRotation3DOption {
  cube: { top: IqColor; front: IqColor; right: IqColor };
}

export interface IqPaperFoldPrompt {
  /** How the paper is folded before punching, described as a sequence
   *  of horizontal/vertical/diagonal folds. */
  folds: Array<"h" | "v" | "d1" | "d2">;
  /** Punch positions on the folded paper as (col, row) 0-indexed grid. */
  punches: Array<{ col: number; row: number }>;
  gridSize: number; // e.g. 4 for a 4×4 folded paper
}
export interface IqPaperFoldOption {
  /** Where holes appear when unfolded. Grid of booleans. */
  holes: boolean[][];
}

export interface IqMemoryFlashPrompt {
  /** Sequence to memorize — digits, colors, or shapes. */
  sequence: Array<number | IqColor | IqShapeSpec>;
  /** How many seconds to display before hiding. */
  displaySec: number;
  /** Direction the student should recall in. */
  recall: "forward" | "reverse";
}
export interface IqMemoryFlashOption {
  /** A candidate answer sequence — student picks the one matching the correct recall. */
  sequence: Array<number | IqColor | IqShapeSpec>;
}

// Discriminated union used by the client renderer entrypoint.
export type IqQuestionType =
  | { type: "text"; prompt: IqTextPrompt; options: IqTextOption[] }
  | { type: "matrix_3x3"; prompt: IqMatrixPrompt; options: IqMatrixOption[] }
  | { type: "sequence"; prompt: IqSequencePrompt; options: IqMatrixOption[] } // reuses shape option
  | { type: "odd_one_out"; prompt: IqOddOneOutPrompt; options: IqMatrixOption[] }
  | { type: "rotation_3d"; prompt: IqRotation3DPrompt; options: IqRotation3DOption[] }
  | { type: "paper_fold"; prompt: IqPaperFoldPrompt; options: IqPaperFoldOption[] }
  | { type: "memory_flash"; prompt: IqMemoryFlashPrompt; options: IqMemoryFlashOption[] };

// ── Scoring ──────────────────────────────────────────────────────────────
/** Full-scale IQ estimate produced by scoring engine. Clamped [70, 140]. */
export interface IqScoreResult {
  /** Estimated full-scale IQ, on the standard 100/15 scale. Clamped. */
  fsiq: number;
  /** ± range for the confidence interval shown in the report (5-8 typical). */
  confidenceRange: number;
  /** Percentile 1-99. */
  percentile: number;
  perDomain: Record<IqDomain, { correct: number; total: number; scaledBand: number }>;
  archetype: IqArchetype;
  /** Total time in seconds (informational, not used for scoring). */
  totalTimeSec: number;
}

// ── The 12 cognitive archetypes ─────────────────────────────────────────
// Assigned based on the student's top-2 domain scores. Order-insensitive:
// { fluid, spatial } and { spatial, fluid } both → "Spatial Wizard".
// Kept as data so the report + share graphic can look them up by ID.
export interface IqArchetype {
  id: string;
  labelId: string;      // Bahasa Indonesia
  labelEn: string;      // English
  emoji: string;
  /** Top 2 domains that map to this archetype (order-insensitive). */
  topDomains: [IqDomain, IqDomain];
  /** Short punchy description — appears on share graphic. */
  tagline: { id: string; en: string };
}

export const IQ_ARCHETYPES: IqArchetype[] = [
  { id: "strategist",     labelId: "Sang Ahli Strategi",      labelEn: "The Strategic Thinker", emoji: "🎯", topDomains: ["fluid", "quantitative"], tagline: { id: "Kamu melihat 3 langkah ke depan.", en: "You see 3 moves ahead." } },
  { id: "wordsmith",      labelId: "Sang Ahli Kata",           labelEn: "The Wordsmith",         emoji: "📖", topDomains: ["verbal", "memory"],       tagline: { id: "Bahasa adalah kekuatanmu.", en: "Language is your superpower." } },
  { id: "spatial_wizard", labelId: "Sang Penyihir Ruang",      labelEn: "The Spatial Wizard",    emoji: "🧊", topDomains: ["spatial", "fluid"],        tagline: { id: "Dunia 3D adalah rumahmu.", en: "3D worlds are second nature." } },
  { id: "quick_draw",     labelId: "Si Cepat Tanggap",         labelEn: "The Quick Draw",         emoji: "⚡", topDomains: ["memory", "verbal"],        tagline: { id: "Selalu paling cepat merespon.", en: "First to answer, always." } },
  { id: "creative",       labelId: "Sang Analis Kreatif",      labelEn: "The Creative Analyst",  emoji: "🎨", topDomains: ["verbal", "fluid"],         tagline: { id: "Kamu berpikir dalam metafora.", en: "You think in metaphors." } },
  { id: "pattern_hunter", labelId: "Pemburu Pola",             labelEn: "The Pattern Hunter",    emoji: "🔍", topDomains: ["fluid", "spatial"],        tagline: { id: "Tidak ada pola yang lolos darimu.", en: "Nothing escapes your eye." } },
  { id: "number_ninja",   labelId: "Ninja Angka",              labelEn: "The Number Ninja",      emoji: "🥷", topDomains: ["quantitative", "memory"],  tagline: { id: "Angka menari untukmu.", en: "Numbers dance for you." } },
  { id: "architect",      labelId: "Sang Arsitek",             labelEn: "The Architect",         emoji: "🏛️", topDomains: ["spatial", "quantitative"], tagline: { id: "Bangunan besar dari detail kecil.", en: "You build big from tiny details." } },
  { id: "orator",         labelId: "Sang Orator",              labelEn: "The Orator",             emoji: "🎤", topDomains: ["verbal", "quantitative"], tagline: { id: "Kata dan logika, kombinasi maut.", en: "Words + logic = your deadly combo." } },
  { id: "adventurer",     labelId: "Petualang Ide",            labelEn: "The Idea Adventurer",   emoji: "🚀", topDomains: ["fluid", "memory"],         tagline: { id: "Ide baru muncul setiap detik.", en: "New ideas every second." } },
  { id: "engineer",       labelId: "Sang Insinyur",             labelEn: "The Engineer",           emoji: "⚙️", topDomains: ["quantitative", "spatial"], tagline: { id: "Kamu membangun solusi, bukan mimpi.", en: "You build solutions, not dreams." } },
  { id: "storyteller",    labelId: "Pendongeng",                labelEn: "The Storyteller",        emoji: "📚", topDomains: ["verbal", "spatial"],       tagline: { id: "Kata-katamu menghidupkan gambar.", en: "Your words paint pictures." } },
];

/** Look up the archetype for a top-2 pair (order-insensitive). Falls back to
 *  a generic "Balanced Mind" archetype if no explicit mapping exists. */
export function pickArchetype(top1: IqDomain, top2: IqDomain): IqArchetype {
  const pair = [top1, top2].sort().join("|");
  for (const a of IQ_ARCHETYPES) {
    const key = [...a.topDomains].sort().join("|");
    if (key === pair) return a;
  }
  // Fallback when top-2 domains match none of the 12 mapped pairs
  return {
    id: "balanced",
    labelId: "Pemikir Serba Bisa",
    labelEn: "The Balanced Mind",
    emoji: "🧠",
    topDomains: [top1, top2],
    tagline: { id: "Otak seimbang di semua sisi.", en: "Balanced across the board." },
  };
}
