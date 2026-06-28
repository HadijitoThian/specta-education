/**
 * Cambridge IGCSE 0580 (Extended) — curated exam-style exemplars.
 *
 * Authored content (NOT scraped past papers). Each exemplar pairs a question
 * with a Cambridge-style mark scheme — the way the actual exam awards method
 * (M1), accuracy (A1), and follow-through (FT) marks. The AI teacher uses
 * these as RAG grounding so it teaches the way the real exam is marked.
 *
 * Coverage prioritises the topics that the highest mark-value questions on
 * Paper 2 / Paper 4 tend to come from. We can add more later.
 *
 * Seeded once on startup (idempotent: only inserts when the table is empty).
 */
import { getDb } from "./db";
import { igcseExamples } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Ex = { topicCode: string; marks: number; question: string; markScheme: string; source?: string };

// Authored mark schemes follow Cambridge conventions: M = method mark,
// A = accuracy/answer mark, B = independent mark, FT = follow-through.
const EXAMPLES: Ex[] = [
  // ── 1.13 Percentages ────────────────────────────────────────────────────────
  { topicCode: "1.13", marks: 3,
    question: "A laptop is reduced in a sale by 18%. The sale price is $574.\nFind the original price of the laptop.",
    markScheme: "574 ÷ 0.82 oe **(M2)** — accept any correct reverse-percentage method.\nIf M2 not gained: 100 − 18 = 82 seen **(M1)**.\n**Answer: $700  (A1)**\nCommon error: 574 × 1.18 = 677.32 (treating it as a percentage increase) — 0 marks.",
    source: "exam-style" },

  { topicCode: "1.13", marks: 3,
    question: "Aisha invests $4000 at a rate of 3.5% per year compound interest.\nWork out the value of her investment at the end of 4 years.",
    markScheme: "4000 × (1.035)^{4} **(M2)** — the compound multiplier raised to the correct power.\nIf M2 not gained: 1.035 or (1 + 3.5/100) seen **(M1)**.\n**Answer: $4590.78 to 2 d.p. (accept $4590.77 — 4590.80)  (A1)**\nNote: simple interest would give $4560 — common student trap.",
    source: "exam-style" },

  // ── 1.11 Ratio and proportion ──────────────────────────────────────────────
  { topicCode: "1.11", marks: 3,
    question: "A sum of money is shared between Adi, Bina and Cipta in the ratio 3 : 5 : 8.\nAdi receives $66. Work out the total amount of money shared.",
    markScheme: "66 ÷ 3 = 22 (value of one share) **(M1)**\n22 × (3 + 5 + 8) **(M1)**\n**Answer: $352  (A1)**",
    source: "exam-style" },

  // ── 1.10 Limits of accuracy (upper/lower bounds) ───────────────────────────
  { topicCode: "1.10", marks: 4,
    question: "The length of a rectangle is 12.4 cm correct to 1 decimal place.\nThe width is 7.8 cm correct to 1 decimal place.\nCalculate the upper bound of the area of the rectangle.",
    markScheme: "Upper length = 12.45, upper width = 7.85 **(B1, B1)**\nArea = 12.45 × 7.85 **(M1)**\n**Answer: 97.7325 cm² (accept 97.7 cm² or better)  (A1)**\nNote: 12.45 and 7.85 are the upper bounds even though 12.45 would round to 12.5 — the convention is to take the boundary value.",
    source: "exam-style" },

  // ── 1.18 Surds ─────────────────────────────────────────────────────────────
  { topicCode: "1.18", marks: 3,
    question: "Simplify, giving your answer in the form a + b\\sqrt{c} where a, b, c are integers:\n(\\sqrt{5} + 3)(\\sqrt{5} - 1)",
    markScheme: "Expansion: 5 − √5 + 3√5 − 3 **(M2)** — all four terms correct.\n  If M2 not gained: at least two correct products **(M1)**.\nSimplify: 5 − 3 + (3 − 1)√5 = 2 + 2√5\n**Answer: 2 + 2√5  (A1)**",
    source: "exam-style" },

  // ── 1.19 Sequences ─────────────────────────────────────────────────────────
  { topicCode: "1.19", marks: 3,
    question: "Find the nth term of the sequence:\n2,  6,  12,  20,  30,  …",
    markScheme: "Differences are 4, 6, 8, 10 → second differences = 2 → quadratic.\n  Try n² + n: 1+1=2, 4+2=6, 9+3=12, 16+4=20 ✓ **(M2)**\n  If M2 not gained: identifies quadratic AND attempts an n² formula **(M1)**.\n**Answer: n² + n  (or equivalent: n(n + 1))   (A1)**",
    source: "exam-style" },

  // ── 2.6 Quadratic equations ────────────────────────────────────────────────
  { topicCode: "2.6", marks: 4,
    question: "Solve the equation 2x^{2} - 5x - 3 = 0, giving your answers correct to 2 decimal places.",
    markScheme: "Use formula: x = (5 ± √(25 + 24)) / 4 **(M2)** — correct substitution.\n  If M2 not gained: √(b² − 4ac) attempted with at least one sign correct **(M1)**.\n√49 = 7 → x = (5 + 7)/4  or  (5 − 7)/4\n**Answers: x = 3.00  or  x = −0.50  (A1, A1)**\nNote: this one factorises as (2x + 1)(x − 3) = 0 — students who spot that get the marks too, but the question SAID 'correct to 2 d.p.' so the formula method is the safer route.",
    source: "exam-style" },

  { topicCode: "2.6", marks: 3,
    question: "By completing the square, write x^{2} - 8x + 11 in the form (x - p)^{2} + q, where p and q are integers.\nHence find the minimum value of x^{2} - 8x + 11.",
    markScheme: "(x − 4)² − 16 + 11 = (x − 4)² − 5 **(M2)** — both p and q correct.\n  If M2 not gained: (x − 4)² seen **(M1)**.\nMinimum at x = 4 → **value = −5  (A1)**.",
    source: "exam-style" },

  // ── 2.5 Simultaneous equations ─────────────────────────────────────────────
  { topicCode: "2.5", marks: 5,
    question: "Solve the simultaneous equations:\n  y = x^{2} - 3x + 4\n  y = 2x - 2",
    markScheme: "Set equal: x² − 3x + 4 = 2x − 2 **(M1)**\n  Rearrange: x² − 5x + 6 = 0 **(M1)**\n  Factorise: (x − 2)(x − 3) = 0 **(M1)**\n  x = 2  →  y = 2(2) − 2 = 2\n  x = 3  →  y = 2(3) − 2 = 4\n**Answers: (2, 2) and (3, 4)  (A1, A1)**\nMust pair x and y values together for both A marks.",
    source: "exam-style" },

  // ── 2.7 Inequalities ───────────────────────────────────────────────────────
  { topicCode: "2.7", marks: 3,
    question: "Solve the inequality:  5 - 3x < 17.",
    markScheme: "−3x < 12 **(M1)**\nDivide by −3 AND reverse the inequality **(M1)** — the key examined skill.\n**Answer: x > −4  (A1)**\nMost common error: forgetting to reverse the inequality when dividing by a negative.",
    source: "exam-style" },

  // ── 2.10 Functions ─────────────────────────────────────────────────────────
  { topicCode: "2.10", marks: 4,
    question: "f(x) = 2x + 1,    g(x) = x^{2} - 3.\n(a) Find fg(2).\n(b) Find f^{-1}(x).",
    markScheme: "(a) g(2) = 4 − 3 = 1 **(M1)**.  f(1) = 2 + 1 = **3**  (A1)\n(b) Let y = 2x + 1 → x = (y − 1)/2 **(M1)** → **f⁻¹(x) = (x − 1)/2**  (A1)\nNote on (a): students sometimes do gf(2) by mistake — order matters: fg(2) means f(g(2)).",
    source: "exam-style" },

  // ── 2.14 Differentiation ───────────────────────────────────────────────────
  { topicCode: "2.14", marks: 4,
    question: "A curve has equation y = x^{3} - 6x^{2} + 5.\nFind the coordinates of the two stationary points.",
    markScheme: "dy/dx = 3x² − 12x **(M1)**\n  Set = 0: 3x(x − 4) = 0 → x = 0 or x = 4 **(M1)**\n  y(0) = 5,  y(4) = 64 − 96 + 5 = −27\n**Answers: (0, 5) and (4, −27)  (A1, A1)**",
    source: "exam-style" },

  // ── 3.2 Equation of a straight line ────────────────────────────────────────
  { topicCode: "3.2", marks: 4,
    question: "A is the point (−2, 7) and B is the point (4, −5).\nFind the equation of the line AB in the form y = mx + c.",
    markScheme: "Gradient = (−5 − 7) / (4 − (−2)) = −12/6 = −2 **(M2)** — fully correct.\n  If M2 not gained: rise/run set up with correct signs OR correct difference **(M1)**.\nUsing A: 7 = −2(−2) + c → c = 3 **(M1)**\n**Answer: y = −2x + 3  (A1)**",
    source: "exam-style" },

  // ── 4.8 Circle theorems ────────────────────────────────────────────────────
  { topicCode: "4.8", marks: 3,
    question: "A, B, C and D lie on a circle, centre O. Angle BAD = 78°.\n(a) Write down the size of angle BCD.\n(b) Give a reason for your answer.",
    markScheme: "(a) **102°  (B1)**\n(b) Opposite angles of a cyclic quadrilateral sum to 180° **(B1)** — accept 'cyclic quadrilateral' if the student names it.\nAlso accept correct reasoning via angle at the centre.",
    source: "exam-style" },

  // ── 5.3 Circles, arcs and sectors ──────────────────────────────────────────
  { topicCode: "5.3", marks: 4,
    question: "A sector of a circle has radius 8 cm and angle 135°.\nCalculate the area of the sector. Give your answer in terms of π.",
    markScheme: "Sector area = (θ/360) × π r² **(M1)**\n  = (135/360) × π × 64\n  = (3/8) × 64π **(M1)**  — accept 24π directly\n**Answer: 24π cm²  (A2)** — 1 mark for unsimplified equivalent.\nIf student gives 75.4 cm² as decimal: deduct 1 (question said 'in terms of π').",
    source: "exam-style" },

  // ── 5.4 Surface area & volume ─────────────────────────────────────────────
  { topicCode: "5.4", marks: 4,
    question: "A solid cone has base radius 6 cm and slant height 10 cm.\nCalculate the total surface area of the cone. Give your answer in terms of π.",
    markScheme: "Curved surface = π r l = π × 6 × 10 = 60π **(M1, A1)**\nBase area = π × 6² = 36π **(M1)**\nTotal = 60π + 36π\n**Answer: 96π cm²  (A1)**\nCommon error: omitting the circular base (60π only) — 2 marks lost.",
    source: "exam-style" },

  // ── 6.2 Right-angled trig ──────────────────────────────────────────────────
  { topicCode: "6.2", marks: 3,
    question: "In triangle ABC, angle B = 90°, AB = 5 cm and AC = 13 cm.\nFind the size of angle BAC, correct to 1 decimal place.",
    markScheme: "Cos(BAC) = adj / hyp = 5/13 **(M1)** — correct ratio chosen.\nBAC = cos⁻¹(5/13) **(M1)**\n**Answer: 67.4°  (A1)**\nAlternative: find BC first (=12) using Pythagoras then use sin or tan — also full marks.",
    source: "exam-style" },

  // ── 6.3 Sine and cosine rules ──────────────────────────────────────────────
  { topicCode: "6.3", marks: 4,
    question: "In triangle PQR, PQ = 7 cm, QR = 9 cm and angle PQR = 112°.\nCalculate the length PR, correct to 3 significant figures.",
    markScheme: "Cosine rule: PR² = 7² + 9² − 2(7)(9)cos(112°) **(M2)** — fully correct.\n  If M2 not gained: cosine rule structure with one error **(M1)**.\nPR² = 49 + 81 − 126 × cos(112°) = 49 + 81 − 126 × (−0.3746) = 177.20…\nPR = √177.20 **(M1)**\n**Answer: PR = 13.3 cm  (A1)**\nKey trap: cos(112°) is NEGATIVE — students who forget this get PR ≈ 9.\nMore.",
    source: "exam-style" },

  // ── 7.2 Vectors ─────────────────────────────────────────────────────────────
  { topicCode: "7.2", marks: 3,
    question: "Vectors a = (3, -1) and b = (-2, 4) (column vectors).\nFind the magnitude |3a + 2b|. Give your answer correct to 1 decimal place.",
    markScheme: "3a = (9, −3), 2b = (−4, 8), 3a + 2b = (5, 5) **(M2)** — both components correct.\n  If M2 not gained: 3a or 2b correct **(M1)**.\nMagnitude = √(5² + 5²) = √50\n**Answer: 7.1  (A1)**",
    source: "exam-style" },

  // ── 8.2 Combined probability (tree diagrams) ───────────────────────────────
  { topicCode: "8.2", marks: 4,
    question: "A bag contains 5 red counters and 3 blue counters. Two counters are taken at random WITHOUT replacement.\nFind the probability that the two counters are different colours.",
    markScheme: "P(RB) = 5/8 × 3/7 = 15/56 **(M1)** — note denominator changes to 7.\nP(BR) = 3/8 × 5/7 = 15/56 **(M1)**\nP(different) = 15/56 + 15/56 **(M1)**\n**Answer: 30/56 = 15/28  (A1)**  (accept decimal 0.536 or better)\nCommon error: forgetting the second draw is from 7 (with-replacement mistake).",
    source: "exam-style" },

  // ── 9.5 Histograms (frequency density) ─────────────────────────────────────
  { topicCode: "9.5", marks: 4,
    question: "The masses of 80 apples are recorded:\n  100 < m ≤ 120 → 12 apples\n  120 < m ≤ 140 → 28 apples\n  140 < m ≤ 200 → 30 apples\n  200 < m ≤ 220 → 10 apples\n\nCalculate the frequency density for each class, and state which bar would be the tallest on a histogram.",
    markScheme: "Frequency density = frequency / class width.\n  100–120: 12/20 = 0.6\n  120–140: 28/20 = 1.4\n  140–200: 30/60 = 0.5\n  200–220: 10/20 = 0.5\n**(M3, A1)** for all four correct.\n**Tallest bar: 120 ≤ m ≤ 140 (frequency density 1.4)**.\nThe 140–200 class has the most apples (30) but the WIDEST bar — students who name that as 'tallest' have the classic misconception.",
    source: "exam-style" },

  // ── 9.6 Cumulative frequency ───────────────────────────────────────────────
  { topicCode: "9.6", marks: 3,
    question: "The cumulative frequency curve for the times taken by 200 students to complete a puzzle passes through the points (10, 32), (15, 90), (20, 150), and (25, 188).\nUse the curve to estimate the interquartile range. (Read off and state both quartiles.)",
    markScheme: "Lower quartile at cumulative frequency = 50 → approx 12 minutes **(B1)**\nUpper quartile at cumulative frequency = 150 → 20 minutes **(B1)** (read off directly)\nIQR = 20 − 12 = **8 minutes  (A1)**\nAccept LQ in range 11.5–12.5; UQ exact at 20.\nWatch: use 200/4 and 3(200)/4 — not (200+1)/4 — for continuous data.",
    source: "exam-style" },
];

// Idempotent seeder, mirrors seedIgcseTopicsIfEmpty.
export async function seedIgcseExamplesIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };
  try {
    const existing = await db.execute(sql`SELECT COUNT(*) AS c FROM igcse_examples`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const count = Number(list?.[0]?.c ?? 0);
    if (count > 0) return { seeded: 0 };

    const rows = EXAMPLES.map((e, i) => ({
      topicCode: e.topicCode,
      syllabus: "CIE_0580",
      tier: "extended" as const,
      marks: e.marks,
      question: e.question,
      markScheme: e.markScheme,
      source: e.source || "exam-style",
      sortOrder: i,
    }));
    if (!rows.length) return { seeded: 0 };
    await db.insert(igcseExamples).values(rows);
    console.log(`[IGCSE] Seeded ${rows.length} exam exemplars.`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Exemplar seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
