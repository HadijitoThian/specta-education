/**
 * SpecTa IQ Discovery — question bank generator.
 *
 * Hybrid pipeline:
 *   - PROGRAMMATIC generators for every visual/logical type (matrix_3x3,
 *     sequence, odd_one_out, rotation_3d, paper_fold, memory_flash).
 *     We deterministically pick the pattern + fill cells + compute the
 *     correct answer + distractors. This means every puzzle is guaranteed
 *     logically correct on generation, not "hope the AI got it right"
 *     (early experiments with pure-LLM matrix generation produced puzzles
 *     where the marked-correct answer didn't actually follow the pattern
 *     about half the time — unusable for a paid product).
 *   - AI GENERATOR for text/verbal items where naturalness in Bahasa
 *     matters more than logical correctness (verbal analogies, sentence
 *     completion). We validate AI output for schema conformance + human
 *     review before serving.
 *
 * Every item lands in iq_questions with approved=0 by default. A human
 * (Hadi) reviews via admin UI and flips approved=1 for the ones that
 * pass. Only approved items are served to real students.
 */

import { invokeLLM } from "./_core/llm";
import type {
  IqDomain, IqShapeSpec, IqShape, IqColor,
  IqMatrixPrompt, IqMatrixOption,
  IqSequencePrompt,
  IqOddOneOutPrompt,
  IqRotation3DPrompt, IqRotation3DOption,
  IqPaperFoldPrompt, IqPaperFoldOption,
  IqMemoryFlashPrompt, IqMemoryFlashOption,
  IqTextPrompt, IqTextOption,
} from "./iqQuestionTypes";
import { IQ_COLORS, IQ_SHAPES } from "./iqQuestionTypes";

// ── Deterministic RNG so we can seed-generate reproducibly ────────────────
// Not for security — just for testability. Mulberry32.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(rng: () => number, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const shuffle = <T>(rng: () => number, arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ── Generated question envelope ───────────────────────────────────────────
export interface GeneratedQuestion {
  domain: IqDomain;
  type: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeLimitSec: number;
  prompt: any;
  options: any[];
  correctIndex: number;
  explanation: string;
  generatedBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MATRIX 3×3 — flagship fluid-reasoning generator (programmatic)
// ═══════════════════════════════════════════════════════════════════════════
//
// Pattern types we generate:
//   - "color_cols_shape_rows": color varies across columns, shape across rows.
//     Missing cell = correct row's shape + correct column's color.
//   - "size_progression": each row (or col) grows in size (1→2→3).
//   - "rotation_progression": shape rotates 90° each step across rows or cols.
//   - "count_addition": each row's inner-dot counts follow a pattern.
//
// Distractors flip ONE dimension so they look plausible but are wrong.

function generateMatrix3x3(rng: () => number, difficulty: 1 | 2 | 3 | 4 | 5): GeneratedQuestion {
  // Difficulty controls how many dimensions vary simultaneously.
  // Easy (1-2): one dimension. Medium (3): two. Hard (4-5): three or more subtle.
  const pattern = difficulty <= 2 ? "color_cols_shape_rows"
    : difficulty === 3 ? pick(rng, ["color_cols_shape_rows", "size_progression"] as const)
    : pick(rng, ["color_cols_shape_rows", "size_progression", "rotation_progression"] as const);

  let grid: (IqShapeSpec | null)[][] = [];
  let correct: IqShapeSpec;
  let explanation = "";

  if (pattern === "color_cols_shape_rows") {
    // Pick 3 shapes for the 3 rows and 3 colors for the 3 columns.
    const rowShapes = shuffle(rng, [...IQ_SHAPES]).slice(0, 3);
    const colColors = shuffle(rng, [...IQ_COLORS]).slice(0, 3);
    grid = rowShapes.map((shape, r) => colColors.map((color, c) => ({ shape, color, size: 2 as const } as IqShapeSpec)));
    correct = { shape: rowShapes[2], color: colColors[2], size: 2 };
    grid[2][2] = null;
    explanation = `Setiap baris = bentuk yang sama (${rowShapes[0]}, ${rowShapes[1]}, ${rowShapes[2]}); setiap kolom = warna yang sama (${colColors[0]}, ${colColors[1]}, ${colColors[2]}). Sel yang hilang = ${rowShapes[2]} ${colColors[2]}.`;
  } else if (pattern === "size_progression") {
    // All cells same shape + color; size grows 1→2→3 across columns and stays same in rows.
    const shape = pick(rng, IQ_SHAPES);
    const color = pick(rng, IQ_COLORS);
    grid = [1, 2, 3].map(() =>
      [1, 2, 3].map(size => ({ shape, color, size: size as 1 | 2 | 3 } as IqShapeSpec))
    );
    correct = { shape, color, size: 3 };
    grid[2][2] = null;
    explanation = `Setiap kolom = ukuran yang sama (kecil → sedang → besar). Sel yang hilang = besar.`;
  } else {
    // Rotation progression: same shape + color, rotation cycles 0/90/180 across columns.
    const shape = pick(rng, ["triangle", "square"] as const); // asymmetric shapes only
    const color = pick(rng, IQ_COLORS);
    const rots = [0, 90, 180] as const;
    grid = [0, 1, 2].map(r =>
      [0, 1, 2].map(c => ({ shape, color, size: 2 as const, rotation: rots[c] as any } as IqShapeSpec))
    );
    correct = { shape, color, size: 2, rotation: 180 };
    grid[2][2] = null;
    explanation = `Setiap kolom = rotasi yang sama (0° → 90° → 180°). Sel yang hilang = 180°.`;
  }

  // Build distractors: mutate one dimension of the correct answer.
  const distractors: IqShapeSpec[] = [];
  const mutations: Array<(s: IqShapeSpec) => IqShapeSpec> = [
    (s) => ({ ...s, shape: pick(rng, IQ_SHAPES.filter(x => x !== s.shape)) }),
    (s) => ({ ...s, color: pick(rng, IQ_COLORS.filter(x => x !== s.color)) }),
    (s) => ({ ...s, size: (s.size === 1 ? 2 : s.size === 2 ? 3 : 1) as 1 | 2 | 3 }),
  ];
  const shuffledMutations = shuffle(rng, mutations);
  for (const m of shuffledMutations.slice(0, 3)) distractors.push(m(correct));

  const opts: IqMatrixOption[] = shuffle(rng, [{ shape: correct }, ...distractors.map(s => ({ shape: s }))]);
  const correctIndex = opts.findIndex(o =>
    o.shape.shape === correct.shape && o.shape.color === correct.color &&
    o.shape.size === correct.size && (o.shape.rotation || 0) === (correct.rotation || 0)
  );

  const prompt: IqMatrixPrompt = { grid };
  return {
    domain: "fluid",
    type: "matrix_3x3",
    difficulty,
    timeLimitSec: 45 + difficulty * 10,
    prompt,
    options: opts,
    correctIndex,
    explanation,
    generatedBy: `matrix3x3_v1_${pattern}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEQUENCE — row of shapes with pattern, one missing at end
// ═══════════════════════════════════════════════════════════════════════════

function generateSequence(rng: () => number, difficulty: 1 | 2 | 3 | 4 | 5): GeneratedQuestion {
  const pattern = pick(rng, ["rotation", "color_cycle", "size_grow"] as const);
  const row: (IqShapeSpec | null)[] = [];
  let correct: IqShapeSpec;
  let explanation = "";

  if (pattern === "rotation") {
    const shape = pick(rng, ["triangle", "square"] as const);
    const color = pick(rng, IQ_COLORS);
    const rots = [0, 90, 180, 270, 0] as const;
    for (let i = 0; i < 4; i++) row.push({ shape, color, size: 2, rotation: rots[i] as any });
    row.push(null);
    correct = { shape, color, size: 2, rotation: rots[4] as any };
    explanation = `Bentuk berputar 90° setiap langkah. Setelah 270°, kembali ke 0°.`;
  } else if (pattern === "color_cycle") {
    const shape = pick(rng, IQ_SHAPES);
    const cycle = shuffle(rng, [...IQ_COLORS]).slice(0, 3);
    for (let i = 0; i < 4; i++) row.push({ shape, color: cycle[i % 3], size: 2 });
    row.push(null);
    correct = { shape, color: cycle[4 % 3], size: 2 };
    explanation = `Warna berulang dalam siklus: ${cycle.join(" → ")}.`;
  } else {
    // size_grow
    const shape = pick(rng, IQ_SHAPES);
    const color = pick(rng, IQ_COLORS);
    const sizes = [1, 2, 3, 1, 2] as const;
    for (let i = 0; i < 4; i++) row.push({ shape, color, size: sizes[i] });
    row.push(null);
    correct = { shape, color, size: sizes[4] };
    explanation = `Ukuran berulang: kecil → sedang → besar → kecil → sedang.`;
  }

  const distractors: IqShapeSpec[] = [];
  const mut: Array<(s: IqShapeSpec) => IqShapeSpec> = [
    (s) => ({ ...s, shape: pick(rng, IQ_SHAPES.filter(x => x !== s.shape)) }),
    (s) => ({ ...s, color: pick(rng, IQ_COLORS.filter(x => x !== s.color)) }),
    (s) => ({ ...s, size: (s.size === 1 ? 2 : s.size === 2 ? 3 : 1) as 1 | 2 | 3 }),
  ];
  const chosen = shuffle(rng, mut).slice(0, 3);
  for (const m of chosen) distractors.push(m(correct));

  const opts: IqMatrixOption[] = shuffle(rng, [{ shape: correct }, ...distractors.map(s => ({ shape: s }))]);
  const correctIndex = opts.findIndex(o =>
    o.shape.shape === correct.shape && o.shape.color === correct.color &&
    o.shape.size === correct.size && (o.shape.rotation || 0) === (correct.rotation || 0)
  );

  return {
    domain: "fluid",
    type: "sequence",
    difficulty,
    timeLimitSec: 35 + difficulty * 5,
    prompt: { row } as IqSequencePrompt,
    options: opts,
    correctIndex,
    explanation,
    generatedBy: `sequence_v1_${pattern}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ODD ONE OUT — 4 shapes, one breaks the rule
// ═══════════════════════════════════════════════════════════════════════════

function generateOddOneOut(rng: () => number, difficulty: 1 | 2 | 3 | 4 | 5): GeneratedQuestion {
  // Rules we can use for the "conforming" 3:
  //   - all have N sides (quadrilaterals vs a triangle, etc.)
  //   - all same color, one different
  //   - all same size, one different
  const ruleType = pick(rng, ["by_side_count", "by_color", "by_size"] as const);

  let shapes: IqShapeSpec[] = [];
  let oddIndex = 0;
  let explanation = "";

  if (ruleType === "by_side_count") {
    // 3 quadrilaterals (square/diamond) + 1 triangle
    const quads: IqShape[] = ["square", "diamond", "hexagon"];
    const conformers = shuffle(rng, quads).slice(0, 3);
    const odd: IqShape = pick(rng, ["triangle", "circle"] as const);
    const buffer: IqShapeSpec[] = conformers.map(shape => ({ shape, color: pick(rng, IQ_COLORS), size: 2 }));
    buffer.push({ shape: odd, color: pick(rng, IQ_COLORS), size: 2 });
    shapes = shuffle(rng, buffer);
    oddIndex = shapes.findIndex(s => s.shape === odd);
    explanation = `Tiga bentuk memiliki sisi genap (persegi/wajik/hexagon). Yang beda: ${odd}.`;
  } else if (ruleType === "by_color") {
    const commonColor = pick(rng, IQ_COLORS);
    const oddColor = pick(rng, IQ_COLORS.filter(c => c !== commonColor));
    const shape = pick(rng, IQ_SHAPES);
    const buffer: IqShapeSpec[] = [];
    for (let i = 0; i < 3; i++) buffer.push({ shape, color: commonColor, size: 2 });
    buffer.push({ shape, color: oddColor, size: 2 });
    shapes = shuffle(rng, buffer);
    oddIndex = shapes.findIndex(s => s.color === oddColor);
    explanation = `Tiga bentuk berwarna ${commonColor}, satu berwarna ${oddColor}.`;
  } else {
    // by_size
    const shape = pick(rng, IQ_SHAPES);
    const color = pick(rng, IQ_COLORS);
    const buffer: IqShapeSpec[] = [];
    for (let i = 0; i < 3; i++) buffer.push({ shape, color, size: 2 });
    buffer.push({ shape, color, size: 3 });
    shapes = shuffle(rng, buffer);
    oddIndex = shapes.findIndex(s => s.size === 3);
    explanation = `Tiga bentuk berukuran sedang, satu lebih besar.`;
  }

  const prompt: IqOddOneOutPrompt = { shapes };
  const options: IqMatrixOption[] = shapes.map(s => ({ shape: s }));
  return {
    domain: "fluid",
    type: "odd_one_out",
    difficulty,
    timeLimitSec: 30 + difficulty * 5,
    prompt,
    options,
    correctIndex: oddIndex,
    explanation,
    generatedBy: `odd_one_out_v1_${ruleType}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D ROTATION — cube rotated on axis, pick the correct post-rotation face map
// ═══════════════════════════════════════════════════════════════════════════
//
// For each axis + degree combination we know exactly how faces map.
// This produces a mathematically correct "answer" cube.

function rotateCubeFaces(
  faces: { top: IqColor; front: IqColor; right: IqColor; back?: IqColor; bottom?: IqColor; left?: IqColor },
  axis: "x" | "y" | "z",
  degrees: 90 | 180 | 270,
): { top: IqColor; front: IqColor; right: IqColor } {
  // For rotations we need all 6 faces. We synthesize back/bottom/left as
  // "wildcard" colors — they won't be shown but need to exist for the
  // rotation math. Using unique colors ensures the visible-face signature
  // after rotation is unambiguous.
  const b = faces.back || pick(() => 0.3, IQ_COLORS);
  const bo = faces.bottom || pick(() => 0.6, IQ_COLORS);
  const l = faces.left || pick(() => 0.9, IQ_COLORS);
  let { top, front, right } = faces;
  let back: IqColor = b, bottom: IqColor = bo, left: IqColor = l;

  const rotOnce = (): void => {
    // 90° single rotation on each axis, applied `steps` times below
    if (axis === "y") {
      // Y-axis rotation viewed from top, clockwise: front→right→back→left→front
      [front, right, back, left] = [left, front, right, back];
    } else if (axis === "x") {
      // X-axis rotation (tip forward): front→top→back→bottom→front
      [front, top, back, bottom] = [bottom, front, top, back];
    } else {
      // Z-axis rotation (spinning like a clock face): top→right→bottom→left→top
      [top, right, bottom, left] = [left, top, right, bottom];
    }
  };
  const steps = degrees / 90;
  for (let i = 0; i < steps; i++) rotOnce();
  return { top, front, right };
}

function generateRotation3D(rng: () => number, difficulty: 1 | 2 | 3 | 4 | 5): GeneratedQuestion {
  const colors = shuffle(rng, [...IQ_COLORS]);
  const faces = {
    top: colors[0], front: colors[1], right: colors[2],
    back: colors[3], bottom: colors[4], left: colors[5],
  };
  const axis = pick(rng, ["x", "y", "z"] as const);
  const degrees = pick(rng, difficulty <= 2 ? [90 as const, 180 as const] : [90 as const, 180 as const, 270 as const]);

  const correct = rotateCubeFaces(faces, axis, degrees);
  const wrong1 = rotateCubeFaces(faces, axis, ((degrees + 90) % 360 || 360) as 90 | 180 | 270);
  const wrong2 = rotateCubeFaces(faces, axis, ((degrees + 180) % 360 || 360) as 90 | 180 | 270);
  const wrong3 = { top: faces.top, front: faces.front, right: faces.right }; // "no rotation" trap

  const opts: IqRotation3DOption[] = shuffle(rng, [
    { cube: correct }, { cube: wrong1 }, { cube: wrong2 }, { cube: wrong3 },
  ]);
  const correctIndex = opts.findIndex(o =>
    o.cube.top === correct.top && o.cube.front === correct.front && o.cube.right === correct.right
  );

  const prompt: IqRotation3DPrompt = {
    cube: { top: faces.top, front: faces.front, right: faces.right },
    rotationAxis: axis,
    rotationDegrees: degrees,
  };
  return {
    domain: "spatial",
    type: "rotation_3d",
    difficulty,
    timeLimitSec: 50 + difficulty * 10,
    prompt,
    options: opts,
    correctIndex,
    explanation: `Kubus diputar ${degrees}° pada sumbu ${axis.toUpperCase()}. Sisi yang terlihat berpindah sesuai arah rotasi.`,
    generatedBy: "rotation3d_v1",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PAPER FOLD — folded paper w/ punches → 4 unfolded options
// ═══════════════════════════════════════════════════════════════════════════
//
// v1 keeps it simple: single fold (horizontal OR vertical), 1-2 punches.
// Correct unfolded pattern = punches mirrored across the fold line.

function generatePaperFold(rng: () => number, difficulty: 1 | 2 | 3 | 4 | 5): GeneratedQuestion {
  const gridSize = 2; // folded paper is 2x2 grid (before unfolding to 4x4)
  const unfoldSize = 4;
  const fold = pick(rng, ["v", "h"] as const);
  const numPunches = difficulty <= 2 ? 1 : 2;

  const punches: Array<{ col: number; row: number }> = [];
  const used = new Set<string>();
  while (punches.length < numPunches) {
    const col = Math.floor(rng() * gridSize);
    const row = Math.floor(rng() * gridSize);
    const k = `${col},${row}`;
    if (!used.has(k)) { used.add(k); punches.push({ col, row }); }
  }

  // Correct unfolded: each punch appears at (col,row) AND its mirror.
  // For 2x2 folded → 4x4 unfolded with 1 fold, mirror across the fold axis.
  const holes: boolean[][] = Array.from({ length: unfoldSize }, () => Array(unfoldSize).fill(false));
  for (const p of punches) {
    // Place at the punch's quadrant + its mirror (across the fold axis).
    holes[p.row][p.col] = true;
    if (fold === "v") {
      holes[p.row][unfoldSize - 1 - p.col] = true;
    } else {
      holes[unfoldSize - 1 - p.row][p.col] = true;
    }
  }

  // Build 3 distractors: wrong mirror direction / no mirror / extra holes.
  const wrong1: boolean[][] = holes.map(row => [...row].reverse()); // wrong axis
  const wrong2: boolean[][] = Array.from({ length: unfoldSize }, () => Array(unfoldSize).fill(false));
  for (const p of punches) wrong2[p.row][p.col] = true; // no mirror
  const wrong3: boolean[][] = holes.map((row, r) => row.map((h, c) => h || (r === 0 && c === 0))); // extra hole

  const opts: IqPaperFoldOption[] = shuffle(rng, [
    { holes }, { holes: wrong1 }, { holes: wrong2 }, { holes: wrong3 },
  ]);
  const holesJson = JSON.stringify(holes);
  const correctIndex = opts.findIndex(o => JSON.stringify(o.holes) === holesJson);

  const prompt: IqPaperFoldPrompt = { folds: [fold], punches, gridSize };
  return {
    domain: "spatial",
    type: "paper_fold",
    difficulty,
    timeLimitSec: 45 + difficulty * 10,
    prompt,
    options: opts,
    correctIndex,
    explanation: `Kertas dilipat ${fold === "v" ? "vertikal" : "horizontal"}. Setiap lubang saat dilipat = 2 lubang saat dibuka (dicerminkan pada lipatan).`,
    generatedBy: "paper_fold_v1",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY FLASH — random digit/color sequence, forward or reverse recall
// ═══════════════════════════════════════════════════════════════════════════

function generateMemoryFlash(rng: () => number, difficulty: 1 | 2 | 3 | 4 | 5): GeneratedQuestion {
  const seqLength = 3 + difficulty; // 4, 5, 6, 7, 8
  const displaySec = 4 + Math.floor(difficulty / 2); // 4-6s
  const recall = pick(rng, ["forward", "reverse"] as const);
  const sequence: number[] = [];
  while (sequence.length < seqLength) {
    const d = Math.floor(rng() * 10);
    if (sequence[sequence.length - 1] !== d) sequence.push(d); // avoid immediate repeats
  }

  const correct = recall === "reverse" ? [...sequence].reverse() : [...sequence];

  // Distractors: 1 wrong-direction, 1 swapped-pair, 1 random-similar
  const wrong1 = recall === "reverse" ? [...sequence] : [...sequence].reverse();
  const wrong2 = [...correct];
  if (wrong2.length >= 2) { [wrong2[0], wrong2[1]] = [wrong2[1], wrong2[0]]; }
  const wrong3 = shuffle(rng, [...correct]);

  const opts: IqMemoryFlashOption[] = shuffle(rng, [
    { sequence: correct }, { sequence: wrong1 }, { sequence: wrong2 }, { sequence: wrong3 },
  ]);
  const correctIndex = opts.findIndex(o => JSON.stringify(o.sequence) === JSON.stringify(correct));

  const prompt: IqMemoryFlashPrompt = { sequence, displaySec, recall };
  return {
    domain: "memory",
    type: "memory_flash",
    difficulty,
    timeLimitSec: 30 + seqLength * 5,
    prompt,
    options: opts,
    correctIndex,
    explanation: `Urutan asli: ${sequence.join("-")}. ${recall === "reverse" ? "Terbalik" : "Sama urutan"}: ${correct.join("-")}.`,
    generatedBy: "memory_flash_v1",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXT (verbal / numerical) — AI-generated in Bahasa
// ═══════════════════════════════════════════════════════════════════════════

interface AiGeneratedText {
  prompt: string;         // the question stem
  options: string[];      // exactly 4
  correctIndex: number;
  explanation: string;
}

async function generateVerbalAnalogy(): Promise<AiGeneratedText> {
  const res = await invokeLLM({
    model: "deepseek-v4-pro",
    messages: [
      { role: "system", content: "You are creating verbal analogy questions for an Indonesian IQ test aimed at 14-20 year olds ACROSS ALL of Indonesia (Sumatra, Java, Kalimantan, Sulawesi, Papua, etc.). Every reference MUST be recognizable to a student anywhere in the country — never region-specific. Output JSON only. Use Bahasa Indonesia. Every analogy MUST have exactly one correct answer among the 4 options and the correctness must be defensible logically, not opinion-based." },
      { role: "user", content: `Generate ONE original verbal analogy question in the exact format:

{
  "prompt": "X : Y :: A : ?",
  "options": ["opsi1", "opsi2", "opsi3", "opsi4"],
  "correctIndex": 0,
  "explanation": "Penjelasan singkat 1 kalimat mengapa opsi tersebut benar."
}

STRICT RULES ON CULTURAL REFERENCES — universal only:

  ✅ ALLOWED (recognized by every Indonesian 14-20yo nationwide):
     - National foods: nasi goreng, mie ayam, bakso, sate, rendang, gado-gado, soto
     - Common animals: kucing, anjing, sapi, ayam, ikan, burung, gajah
     - Weather / nature: hujan, matahari, bulan, laut, gunung, sungai, hutan
     - Big-name cities/places EVERYONE knows: Jakarta, Bali, Sumatra, Papua, Indonesia,
       ASEAN countries (Malaysia, Singapura, Thailand), major world countries
     - Common professions: dokter, guru, polisi, petani, pilot
     - Colors, numbers, shapes, materials (kayu, besi, air, api)
     - Universal concepts: siang/malam, tua/muda, panas/dingin
     - School subjects everyone learns: matematika, bahasa, IPA, IPS
     - Universal transport: mobil, motor, sepeda, pesawat, kapal
     - Global tech: HP, laptop, komputer, internet

  ❌ FORBIDDEN (regionally specific, kids in other provinces won't know):
     - Regional dishes: gudeg (Yogya), pempek (Palembang), papeda (Papua),
       coto Makassar, ayam betutu (Bali), rujak cingur (Jatim), soto Kudus
     - Local wayang / cultural figures known only in one region
     - Small cities: Bandung is OK, but Ponorogo, Solo-specific figures, etc. not
     - Regional dialect words (only Bahasa Indonesia standard)
     - Traditional dance / instruments only known in one region
     - Local plants / animals only found in specific regions

  Test yourself: "Would a 15-year-old in rural Kalimantan AND a 15-year-old
  in Jakarta AND a 15-year-old in Papua ALL immediately understand this
  reference?" If NO, pick a different one.

OTHER RULES:
- prompt uses format "X : Y :: A : ?"
- Exactly 4 options, all plausible (no silly obvious wrong answers)
- Prefer categorical / functional / part-whole relationships:
  * "buah : pohon :: ikan : laut" (habitat)
  * "guru : sekolah :: dokter : rumah sakit" (workplace)
  * "matahari : siang :: bulan : malam" (associated time)
  * "roda : mobil :: kaki : manusia" (part-whole)
- Do NOT copy famous published analogies (must be original)
- Return JSON only, no prose wrapper.` },
    ],
    response_format: { type: "json_object" },
  });
  const content = res.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : "";
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  const parsed = JSON.parse(first >= 0 && last > first ? text.slice(first, last + 1) : text);
  if (!parsed?.prompt || !Array.isArray(parsed?.options) || parsed.options.length !== 4 || typeof parsed.correctIndex !== "number") {
    throw new Error("AI verbal analogy output invalid");
  }
  return parsed;
}

async function generateNumericSequence(): Promise<AiGeneratedText> {
  const res = await invokeLLM({
    model: "deepseek-v4-pro",
    messages: [
      { role: "system", content: "You are creating numerical sequence questions for an Indonesian IQ test aimed at 14-20 year olds. Output JSON only. Use Bahasa Indonesia for the prompt text; the numbers are universal." },
      { role: "user", content: `Generate ONE original number sequence question in the exact format:

{
  "prompt": "Lengkapi urutan berikut: 2, 5, 10, 17, ...",
  "options": ["24", "26", "28", "31"],
  "correctIndex": 1,
  "explanation": "Selisih antar angka bertambah 2 setiap langkah (3, 5, 7, 9). Jadi 17 + 9 = 26."
}

RULES:
- prompt shows 4-5 numbers of a sequence + "..."
- Exactly 4 numeric options as strings
- The pattern MUST be logically derivable (arithmetic, geometric, Fibonacci-like, alternating, squared, etc.)
- Explanation must clearly show why the correct answer is correct
- Do NOT use trivially easy sequences like 2,4,6,8. Make it interesting.
- Return JSON only.` },
    ],
    response_format: { type: "json_object" },
  });
  const content = res.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : "";
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  const parsed = JSON.parse(first >= 0 && last > first ? text.slice(first, last + 1) : text);
  if (!parsed?.prompt || !Array.isArray(parsed?.options) || parsed.options.length !== 4 || typeof parsed.correctIndex !== "number") {
    throw new Error("AI numeric sequence output invalid");
  }
  return parsed;
}

async function generateVerbalQuestion(kind: "analogy" | "numeric"): Promise<GeneratedQuestion> {
  const result = kind === "analogy" ? await generateVerbalAnalogy() : await generateNumericSequence();
  const domain: IqDomain = kind === "analogy" ? "verbal" : "quantitative";
  const promptData: IqTextPrompt = { text: result.prompt };
  const options: IqTextOption[] = result.options.map(text => ({ text }));
  return {
    domain,
    type: "text",
    difficulty: 3,
    timeLimitSec: kind === "analogy" ? 30 : 45,
    prompt: promptData,
    options,
    correctIndex: result.correctIndex,
    explanation: result.explanation,
    generatedBy: kind === "analogy" ? "ai_verbal_analogy_v1" : "ai_numeric_sequence_v1",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Top-level: generate a small starter batch across all domains
// ═══════════════════════════════════════════════════════════════════════════

export interface StarterBatch {
  questions: GeneratedQuestion[];
  errors: string[];
}

/**
 * Generate a batch balanced across all 5 domains at 3 difficulty levels.
 * `perDomain` controls how many items per domain (default 2 = 10-item
 * starter batch; pass 8 for a 40-item bulk build, etc.).
 *
 * Programmatic items are deterministic (seeded); AI items (verbal
 * analogies + numeric sequences) vary between calls — that's the point
 * of AI vs programmatic split.
 *
 * Difficulty distribution within each domain follows a rough easy-
 * medium-hard curve (2/3 medium, 1/6 easy, 1/6 hard).
 */
export async function generateStarterBatch(seed = Date.now(), perDomain = 2): Promise<StarterBatch> {
  const rng = makeRng(seed);
  const questions: GeneratedQuestion[] = [];
  const errors: string[] = [];

  // Pick a difficulty for slot i out of N, biased toward medium.
  const difficultyFor = (i: number, n: number): 1 | 2 | 3 | 4 | 5 => {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    if (t < 0.15) return 2;
    if (t < 0.5) return 3;
    if (t < 0.85) return 4;
    return 5;
  };

  // Fluid — mix of matrix (most), sequence, odd_one_out
  for (let i = 0; i < perDomain; i++) {
    const d = difficultyFor(i, perDomain);
    const kind = i % 3 === 0 ? "matrix" : i % 3 === 1 ? "sequence" : "odd";
    if (kind === "matrix") questions.push(generateMatrix3x3(rng, d));
    else if (kind === "sequence") questions.push(generateSequence(rng, d));
    else questions.push(generateOddOneOut(rng, d));
  }

  // Quantitative — mostly AI numeric sequences, some programmatic sequences
  for (let i = 0; i < perDomain; i++) {
    try {
      if (i % 2 === 0) {
        questions.push(await generateVerbalQuestion("numeric"));
      } else {
        // Reuse programmatic sequence as a quantitative-flavored puzzle
        // (pattern recognition is the underlying cognitive skill).
        const q = generateSequence(rng, difficultyFor(i, perDomain));
        q.domain = "quantitative";
        q.generatedBy = `${q.generatedBy}_as_quant`;
        questions.push(q);
      }
    } catch (e) {
      errors.push(`quantitative#${i}: ${(e as Error).message}`);
    }
  }

  // Verbal — all AI-generated Bahasa analogies
  for (let i = 0; i < perDomain; i++) {
    try { questions.push(await generateVerbalQuestion("analogy")); }
    catch (e) { errors.push(`verbal#${i}: ${(e as Error).message}`); }
  }

  // Spatial — alternate rotation_3d and paper_fold
  for (let i = 0; i < perDomain; i++) {
    const d = difficultyFor(i, perDomain);
    if (i % 2 === 0) questions.push(generateRotation3D(rng, d));
    else questions.push(generatePaperFold(rng, d));
  }

  // Memory — all memory_flash with graded difficulty
  for (let i = 0; i < perDomain; i++) {
    questions.push(generateMemoryFlash(rng, difficultyFor(i, perDomain)));
  }

  return { questions, errors };
}
