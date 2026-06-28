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

  // ═══════════════════════════════════════════════════════════════════════════
  // Week 9 expansion — filling gap topics + extra high-frequency questions.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 1.4 Fractions, decimals and percentages ────────────────────────────────
  { topicCode: "1.4", marks: 3,
    question: "Write the recurring decimal 0.\\overline{27} (i.e. 0.272727…) as a fraction in its simplest form.",
    markScheme: "Let x = 0.272727… **(M1)** for setting up.\n100x = 27.272727… → 99x = 27 **(M1)**\nx = 27/99 = **3/11  (A1)** for simplification.\nCommon error: writing 27/100 (treating it as a terminating decimal).",
    source: "exam-style" },

  // ── 1.7 Indices I ──────────────────────────────────────────────────────────
  { topicCode: "1.7", marks: 3,
    question: "Simplify, giving your answer as a single power of 2:\n(2^5 × 2^{-3}) ÷ 2^{-4}",
    markScheme: "Numerator: 2^{5+(-3)} = 2^2 **(M1)**\nDivide: 2^2 ÷ 2^{-4} = 2^{2-(-4)} = 2^6 **(M1)**\n**Answer: 2^6  (A1)** (accept 64).\nTrap: writing 2^{2/(-4)} or computing 2^2 − 2^{-4} — index laws not arithmetic.",
    source: "exam-style" },

  { topicCode: "1.7", marks: 2,
    question: "Evaluate 16^{3/4}, showing your method.",
    markScheme: "16^{1/4} = 2 (the fourth root) **(M1)**\n2^3 = **8  (A1)**\nAccept 16^{3/4} = (16^{1/4})^3 or (16^3)^{1/4} = 4096^{1/4} = 8.",
    source: "exam-style" },

  // ── 1.8 Standard form ──────────────────────────────────────────────────────
  { topicCode: "1.8", marks: 3,
    question: "The distance from the Earth to the Sun is approximately 1.5 × 10^{11} m.\nLight travels at 3 × 10^8 m/s.\nWork out how long it takes light to travel from the Sun to the Earth, giving your answer in standard form.",
    markScheme: "Time = distance ÷ speed = (1.5 × 10^{11}) ÷ (3 × 10^8) **(M1)**\nDivide coefficients and subtract indices: 0.5 × 10^3 **(M1)**\n**Answer: 5 × 10^2 s  (A1)** (accept 500 s).\nCommon error: leaving the answer as 0.5 × 10^3 — not standard form (1 ≤ A < 10).",
    source: "exam-style" },

  { topicCode: "1.8", marks: 2,
    question: "Work out (4.2 × 10^6) + (3.5 × 10^5), giving your answer in standard form.",
    markScheme: "Convert to the same power: 4.2 × 10^6 + 0.35 × 10^6 **(M1)**\n= 4.55 × 10^6 **(A1)**\nTrap: adding indices (giving 7.7 × 10^{11}). Indices are only added when multiplying, not when adding numbers.",
    source: "exam-style" },

  // ── 1.13 Percentages — extra question ──────────────────────────────────────
  { topicCode: "1.13", marks: 4,
    question: "Jamal's salary increased by 8% in 2023 and then decreased by 5% in 2024.\nHis salary at the end of 2024 was \\$56,772.\nWork out his salary at the start of 2023.",
    markScheme: "Combined multiplier: 1.08 × 0.95 = 1.026 **(M1)**\nOriginal = 56772 ÷ 1.026 **(M2)**\n**Answer: \\$55,333.33 (or \\$55,333 to nearest dollar)  (A1)**\nTrap: doing 56772 × 0.95 × 1.08 (forwards instead of reverse).",
    source: "exam-style" },

  // ── 1.16 Exponential growth and decay ──────────────────────────────────────
  { topicCode: "1.16", marks: 3,
    question: "A radioactive substance has a half-life such that its mass decreases by 12% each year.\nThe initial mass is 80 g. Find the mass after 5 years, correct to 3 significant figures.",
    markScheme: "Decay multiplier per year: 1 − 0.12 = 0.88 **(M1)**\nMass after 5 years: 80 × 0.88^5 **(M1)**\n**Answer: 42.2 g (3 s.f.)  (A1)**\n(Exact: 42.1611…). Trap: subtracting 12% each year linearly → 80 − 5(9.6) = 32 g. Compound decay, not simple.",
    source: "exam-style" },

  // ── 2.2 Algebraic manipulation ─────────────────────────────────────────────
  { topicCode: "2.2", marks: 3,
    question: "Factorise fully: 12x²y − 18xy²",
    markScheme: "Identify HCF = 6xy **(M1)**\n12x²y − 18xy² = 6xy(…  …) **(M1)** structure.\n**Answer: 6xy(2x − 3y)  (A1)**\nCommon partial: 6(2x²y − 3xy²) — not fully factorised, B0 unless 6xy taken out.",
    source: "exam-style" },

  { topicCode: "2.2", marks: 3,
    question: "Expand and simplify:  (2x − 3)(x² + 4x − 5)",
    markScheme: "2x × (x² + 4x − 5) = 2x³ + 8x² − 10x **(M1)**\n−3 × (x² + 4x − 5) = −3x² − 12x + 15 **(M1)**\nCollect: **2x³ + 5x² − 22x + 15  (A1)**\nWatch the signs on the −3 multiplication.",
    source: "exam-style" },

  // ── 2.3 Algebraic fractions ────────────────────────────────────────────────
  { topicCode: "2.3", marks: 4,
    question: "Simplify fully:  (x² − 9) / (x² + 5x + 6)",
    markScheme: "Factor numerator: (x − 3)(x + 3) **(M1)**\nFactor denominator: (x + 2)(x + 3) **(M1)**\nCancel (x + 3): (x − 3)/(x + 2) **(M1)**\n**Answer: (x − 3)/(x + 2)  (A1)**\nDo NOT cancel x² — cancel only common FACTORS, never common terms.",
    source: "exam-style" },

  // ── 2.4 Indices II (algebraic) ─────────────────────────────────────────────
  { topicCode: "2.4", marks: 3,
    question: "Simplify:  (3a^2 b^{-1})^3 × (2ab^4)",
    markScheme: "First bracket: 27a^6 b^{-3} **(M1)**\nMultiply: 27 × 2 = 54;  a^{6+1} = a^7;  b^{-3+4} = b^1 **(M1)**\n**Answer: 54a^7 b  (A1)**\nCommon error: forgetting to cube the 3 → giving 3a^6 b^{-3}.",
    source: "exam-style" },

  // ── 2.6 Quadratics — extra (formula) ───────────────────────────────────────
  { topicCode: "2.6", marks: 4,
    question: "Solve  2x² − 5x − 4 = 0, giving each answer correct to 2 decimal places.",
    markScheme: "Identify a = 2, b = −5, c = −4 **(B1)**\nUse x = (−b ± √(b² − 4ac))/(2a) → x = (5 ± √(25 + 32))/4 = (5 ± √57)/4 **(M2)** for substitution and discriminant correct.\n**Answers: x = 3.14 or x = −0.64  (A1)** (both required, 2 d.p.).\nIf discriminant wrong: max M1 and FT.",
    source: "exam-style" },

  { topicCode: "2.6", marks: 3,
    question: "Factorise and hence solve:  x² + 2x − 15 = 0",
    markScheme: "Find two numbers with product −15 and sum +2 → +5 and −3 **(M1)**\n(x + 5)(x − 3) = 0 **(M1)**\n**Answers: x = −5 or x = 3  (A1)**.\nMUST list both — losing the negative root is the classic exam trap.",
    source: "exam-style" },

  // ── 2.9 Graphs of functions ────────────────────────────────────────────────
  { topicCode: "2.9", marks: 4,
    question: "f(x) = x³ − 3x + 1.\n(a) Find f(2).\n(b) The graph of y = f(x) crosses the x-axis between x = 0 and x = 1. Use trial and improvement to find this root correct to 1 decimal place.",
    markScheme: "(a) f(2) = 8 − 6 + 1 = **3**  **(B1)**\n(b) f(0) = 1, f(1) = −1 → root between **(M1)**\n  Trial x = 0.5: f(0.5) = 0.125 − 1.5 + 1 = −0.375 → root between 0 and 0.5 **(M1)**\n  Trial x = 0.3: f(0.3) ≈ 0.127 → root between 0.3 and 0.5\n  Refine to **x ≈ 0.3 (1 d.p.)**  **(A1)** (accept 0.3 with working shown).\nAccept any valid trial-and-improvement table that narrows correctly.",
    source: "exam-style" },

  // ── 2.10 Functions — extra ─────────────────────────────────────────────────
  { topicCode: "2.10", marks: 3,
    question: "f(x) = 3x − 2 and g(x) = x² + 1.\n(a) Find fg(2).\n(b) Find gf(x), simplified.",
    markScheme: "(a) g(2) = 5 **(M1)**, fg(2) = f(5) = 13 **(A1)**\n(b) f(x) = 3x − 2, so gf(x) = (3x − 2)² + 1\n  = 9x² − 12x + 4 + 1 = **9x² − 12x + 5  (A1)**\nCommon error: doing fg(x) instead of gf(x) — composite order matters.",
    source: "exam-style" },

  // ── 2.11 Inverse functions ─────────────────────────────────────────────────
  { topicCode: "2.11", marks: 3,
    question: "f(x) = (2x + 5)/3.\nFind the inverse function f⁻¹(x).",
    markScheme: "Let y = (2x + 5)/3 **(M1)** start of swap.\nSwap x and y: x = (2y + 5)/3 → 3x = 2y + 5 → y = (3x − 5)/2 **(M1)**\n**f⁻¹(x) = (3x − 5)/2  (A1)**.\nAlternative method (rearrange directly for x): equally valid.",
    source: "exam-style" },

  // ── 3.1 Coordinates ────────────────────────────────────────────────────────
  { topicCode: "3.1", marks: 3,
    question: "A is (−1, 4) and B is (5, −2). M is the midpoint of AB.\n(a) Find the coordinates of M.\n(b) Find the length AB, leaving your answer as a surd in its simplest form.",
    markScheme: "(a) M = ((−1+5)/2, (4+(−2))/2) = **(2, 1)  (B1)**\n(b) AB = √((5−(−1))² + (−2−4)²) = √(36 + 36) **(M1)** for Pythagoras\n  = √72 = **6√2  (A1)** for surd simplification.\n  Accept 6√2 only — √72 is not 'simplest form'.",
    source: "exam-style" },

  // ── 4.4 Similarity ─────────────────────────────────────────────────────────
  { topicCode: "4.4", marks: 4,
    question: "Two similar cylinders have heights in the ratio 2 : 5.\nThe volume of the smaller cylinder is 56 cm³.\n(a) Find the ratio of their surface areas.\n(b) Find the volume of the larger cylinder.",
    markScheme: "(a) Length ratio 2:5 → area ratio 2²:5² = **4 : 25  (B1)**\n(b) Volume ratio = 2³:5³ = 8:125 **(M1)**\n  Larger volume = 56 × (125/8) **(M1)**\n  = **875 cm³  (A1)**\nKey rule: areas scale by k², volumes by k³ — the most-tested similarity trap.",
    source: "exam-style" },

  { topicCode: "4.4", marks: 3,
    question: "Triangle ABC is similar to triangle PQR. AB = 6 cm, BC = 9 cm and PQ = 10 cm.\nFind the length of QR.",
    markScheme: "Scale factor PQ/AB = 10/6 = 5/3 **(M1)**\nQR = BC × scale factor = 9 × 5/3 **(M1)**\n**QR = 15 cm  (A1)**.\nTrap: dividing by 5/3 instead of multiplying. Always check which triangle is bigger.",
    source: "exam-style" },

  // ── 4.6 Angles in polygons / parallel lines ────────────────────────────────
  { topicCode: "4.6", marks: 3,
    question: "The interior angle of a regular polygon is 156°.\n(a) Find the size of each exterior angle.\n(b) Hence find the number of sides.",
    markScheme: "(a) Exterior = 180 − 156 = **24°  (B1)**\n(b) Number of sides = 360 / exterior angle = 360 / 24 **(M1)**\n= **15 sides  (A1)**.\nKey rule: exterior angles of any polygon sum to 360°. This is the fastest route — don't use the interior-sum formula (n−2)×180.",
    source: "exam-style" },

  // ── 4.7 Circle theorems intro ──────────────────────────────────────────────
  { topicCode: "4.7", marks: 4,
    question: "In a circle, AB is a chord and O is the centre. Angle AOB = 84°. P is a point on the major arc.\nFind, giving reasons:\n(a) the angle APB at the circumference,\n(b) the angle OAB (where the triangle OAB is isosceles since OA = OB).",
    markScheme: "(a) Angle at centre = 2 × angle at circumference (same arc)\n  → angle APB = 84/2 = **42°  (B1, B1 reason)**\n(b) Triangle OAB isosceles with OA = OB **(M1)**\n  Angles at base equal: 2 × angle OAB + 84 = 180 → angle OAB = (180 − 84)/2 = **48°  (A1)**\nMust state the circle theorem in part (a) for the reason mark.",
    source: "exam-style" },

  // ── 5.2 Area and perimeter ─────────────────────────────────────────────────
  { topicCode: "5.2", marks: 4,
    question: "A circular path of width 1.5 m surrounds a circular pond of radius 4 m (so the outer radius is 5.5 m).\nCalculate the area of the path, leaving your answer in terms of π.",
    markScheme: "Outer area: π(5.5)² = 30.25π **(M1)**\nInner area: π(4)² = 16π **(M1)**\nPath area = outer − inner = 30.25π − 16π **(M1)**\n**= 14.25π m²  (A1)**\nCommon error: π(5.5 − 4)² = 2.25π — outer radius² minus inner radius² is NOT the same as (difference)².",
    source: "exam-style" },

  // ── 5.5 Volume ─────────────────────────────────────────────────────────────
  { topicCode: "5.5", marks: 4,
    question: "A solid metal sphere of radius 6 cm is melted and recast into a cylinder of radius 4 cm.\nFind the height of the cylinder, leaving π in your working but giving the final answer to 1 decimal place.\n(Volume of sphere = (4/3)πr³; volume of cylinder = πr²h.)",
    markScheme: "Volume of sphere = (4/3)π(6)³ = 288π **(M1)**\nSet equal to cylinder: π(4)²h = 288π → 16h = 288 **(M1, M1)**\nh = 288/16 = **18.0 cm  (A1)**\nThe π cancels — common error is leaving it in.",
    source: "exam-style" },

  // ── 6.1 Pythagoras ─────────────────────────────────────────────────────────
  { topicCode: "6.1", marks: 3,
    question: "A right-angled triangle has hypotenuse 17 cm and one other side 8 cm.\nFind the length of the third side.",
    markScheme: "17² = 8² + x² **(M1)** (Pythagoras correctly applied with hypotenuse identified)\nx² = 289 − 64 = 225 **(M1)**\n**x = 15 cm  (A1)**\nCheck: a 3-4-5 multiple (3 × 5 = 15). Watch students who do x² = 17² + 8² — they've put the hypotenuse on the wrong side.",
    source: "exam-style" },

  { topicCode: "6.1", marks: 4,
    question: "ABCD is a rectangle with AB = 12 cm. The diagonal AC = 13 cm.\n(a) Find the length BC.\n(b) Hence find the area of the rectangle.",
    markScheme: "(a) BC² = 13² − 12² = 169 − 144 = 25 **(M1)** → BC = **5 cm  (A1)**\n(b) Area = 12 × 5 = **60 cm²  (M1, A1)**.\n5-12-13 is one of the common Pythagorean triples worth memorising.",
    source: "exam-style" },

  // ── 6.4 Bearings ───────────────────────────────────────────────────────────
  { topicCode: "6.4", marks: 4,
    question: "Town B is 12 km due East of town A. Town C is on a bearing of 130° from A, with AC = 9 km.\n(a) Find the bearing of A from C.\n(b) Find the distance BC (use the cosine rule: c² = a² + b² − 2ab cos C; the angle BAC = 40°).",
    markScheme: "(a) Reverse bearing: 130 − 180… use 130 + 180 = 310° (since 130 < 180) **(M1, A1)**\n(b) BC² = 12² + 9² − 2(12)(9)cos(40°) **(M1)** correct cosine-rule substitution\n  = 144 + 81 − 216(0.766) = 225 − 165.5 = 59.5\n  BC = **7.71 km (3 s.f.)  (A1)**\nKey rule: reverse bearings differ by 180° (modulo 360).",
    source: "exam-style" },

  // ── 6.5 3D trigonometry ────────────────────────────────────────────────────
  { topicCode: "6.5", marks: 5,
    question: "A cuboid has dimensions 6 cm × 8 cm × 24 cm. Find the angle between the longest space diagonal and the base, to 1 decimal place.",
    markScheme: "Diagonal of base (6×8 rectangle): d = √(6² + 8²) = √100 = 10 cm **(M1, A1)**\nSpace diagonal vs base forms right triangle with vertical = 24 and horizontal = 10\ntan θ = 24/10 **(M1)**\nθ = arctan(2.4) = **67.4°  (A2)**\nTrap: dividing the wrong way (10/24 gives 22.6° — the angle the diagonal makes with the vertical, not the base).",
    source: "exam-style" },

  // ── 7.1 Transformations ────────────────────────────────────────────────────
  { topicCode: "7.1", marks: 4,
    question: "Triangle T has vertices (1, 1), (3, 1), (1, 4).\n(a) Triangle T is reflected in the line y = x to give T'. Write down the coordinates of T'.\n(b) Triangle T is enlarged by scale factor 2, centre (0, 0). Write down the coordinates of the image T''.",
    markScheme: "(a) Reflection in y = x: swap (x, y). **T': (1, 1), (1, 3), (4, 1)  (B2)** all three correct; B1 for any 1–2.\n(b) Enlargement scale factor 2 from origin: multiply each coord by 2. **T'': (2, 2), (6, 2), (2, 8)  (B2)** all three.\nKey: reflection in y = x swaps coordinates; enlargement from origin scales them.",
    source: "exam-style" },

  // ── 7.3 Magnitude of a vector ──────────────────────────────────────────────
  { topicCode: "7.3", marks: 2,
    question: "Find the magnitude of the vector **a** = (5, −12)ᵀ, giving an exact answer.",
    markScheme: "|**a**| = √(5² + (−12)²) **(M1)**\n= √(25 + 144) = √169 = **13  (A1)**.\n5-12-13 is a Pythagorean triple — recognise and you save calculator time.",
    source: "exam-style" },

  // ── 8.1 Probability ────────────────────────────────────────────────────────
  { topicCode: "8.1", marks: 3,
    question: "A bag contains 4 red balls, 5 blue balls and 3 green balls. One ball is drawn at random.\n(a) Find P(red).\n(b) Find P(not blue).",
    markScheme: "Total = 12 balls **(B1)**\n(a) P(red) = **4/12 = 1/3  (B1)**\n(b) P(not blue) = (4 + 3)/12 = **7/12  (B1)**\nKey: probabilities sum to 1, so P(not X) = 1 − P(X). Either method is fine.",
    source: "exam-style" },

  { topicCode: "8.1", marks: 4,
    question: "The probability that it rains on a given day is 0.3. The probability that Aisha takes her umbrella, given that it rains, is 0.9. Given that it does NOT rain, the probability that she takes her umbrella is 0.2.\nFind the probability that, on a randomly chosen day, Aisha takes her umbrella.",
    markScheme: "P(rains and takes) = 0.3 × 0.9 = 0.27 **(M1)**\nP(no rain and takes) = 0.7 × 0.2 = 0.14 **(M1)**\nP(takes umbrella) = 0.27 + 0.14 **(M1)**\n**= 0.41  (A1)**\nUse a tree or table. Add the two 'takes umbrella' branches — they are mutually exclusive.",
    source: "exam-style" },

  // ── 8.3 Conditional probability ────────────────────────────────────────────
  { topicCode: "8.3", marks: 3,
    question: "In a class of 30 students: 18 study French, 15 study German, and 8 study both.\nA student is picked at random. Given that she studies French, find the probability that she also studies German.",
    markScheme: "Using conditional probability: P(G | F) = P(G ∩ F) / P(F) **(M1)**\n= (8/30) / (18/30) = 8/18 **(M1)**\n**= 4/9  (A1)**\nShort cut: of the 18 French students, 8 also do German → 8/18 = 4/9.\nTrap: dividing by 30 (the total) instead of by 18 (the 'given' subset).",
    source: "exam-style" },

  // ── 8.2 Tree diagrams — extra ──────────────────────────────────────────────
  { topicCode: "8.2", marks: 4,
    question: "A box contains 7 black pens and 3 red pens. Two pens are taken at random WITHOUT replacement.\nFind the probability that the two pens are of different colours.",
    markScheme: "P(black then red) = 7/10 × 3/9 = 21/90 **(M1)**\nP(red then black) = 3/10 × 7/9 = 21/90 **(M1)**\nDifferent = sum: 42/90 **(M1)**\n**= 7/15  (A1)**\nMust account for both orders. Notice denominators 10 then 9 — without replacement.",
    source: "exam-style" },

  // ── 9.3 Mean from frequency table ──────────────────────────────────────────
  { topicCode: "9.3", marks: 4,
    question: "The number of goals scored in 40 football matches is shown below.\n  Goals: 0, 1, 2, 3, 4\n  Frequency: 6, 12, 10, 8, 4\nCalculate the mean number of goals per match.",
    markScheme: "Σ(fx): 0×6 + 1×12 + 2×10 + 3×8 + 4×4 **(M1)** for setting up.\n= 0 + 12 + 20 + 24 + 16 = 72 **(M1)**\nΣf = 40 **(B1)**\nMean = 72/40 = **1.8 goals  (A1)**\nTrap: dividing by 5 (the number of categories) instead of 40 (the total frequency).",
    source: "exam-style" },

  { topicCode: "9.3", marks: 3,
    question: "Find the median of the data:  4, 7, 9, 12, 14, 16, 19, 21",
    markScheme: "8 values — median is between the 4th and 5th when ordered **(M1)**.\nValues are already ordered: 4th = 12, 5th = 14.\nMedian = (12 + 14)/2 **(M1)**\n**= 13  (A1)**.\nFor an even count of n values, the median is the mean of the (n/2)th and (n/2+1)th terms.",
    source: "exam-style" },

  // ── 9.7 Scatter diagrams ───────────────────────────────────────────────────
  { topicCode: "9.7", marks: 3,
    question: "The scatter diagram shows the marks of 8 students in a Maths test (M) and a Science test (S). The points lie roughly along a line of best fit with positive gradient.\n(a) Describe the correlation between M and S.\n(b) A student scored 65 in Maths but was absent for Science. Using the line of best fit (M = 30 → S = 35, M = 80 → S = 80), estimate her Science mark.",
    markScheme: "(a) **Positive correlation  (B1)** (or 'strong positive' if the points cluster closely).\n(b) Gradient of line = (80 − 35)/(80 − 30) = 45/50 = 0.9 **(M1)**\n  At M = 65: S = 35 + 0.9 × (65 − 30) = 35 + 31.5 = **66.5 (accept 65–68)  (A1)**\nDon't extrapolate beyond the data range — exam often asks why a prediction is unreliable.",
    source: "exam-style" },

  // ── 2.13 Gradients of curves (numerical) ───────────────────────────────────
  { topicCode: "2.13", marks: 4,
    question: "The point P(2, 5) lies on the curve y = x² + 1. The point Q lies on the curve with x-coordinate 2 + h.\n(a) Find the gradient of the chord PQ in terms of h.\n(b) Use your result to write down the gradient of the tangent to the curve at P.",
    markScheme: "(a) Q is (2 + h, (2 + h)² + 1) = (2 + h, 5 + 4h + h²) **(M1)**\n  Gradient = ((5 + 4h + h²) − 5) / ((2 + h) − 2) = (4h + h²)/h **(M1)**\n  = **4 + h  (A1)**\n(b) As h → 0, gradient → **4**  **(B1)** — this is the gradient of the tangent at P.\nThis is the foundation of differentiation 'from first principles'.",
    source: "exam-style" },

  // ── 2.14 Differentiation — extra ───────────────────────────────────────────
  { topicCode: "2.14", marks: 4,
    question: "y = 2x³ − 9x² + 12x − 5.\n(a) Find dy/dx.\n(b) Find the x-coordinates of the stationary points.",
    markScheme: "(a) dy/dx = **6x² − 18x + 12  (B2)** B1 for any 2 terms correct.\n(b) Set dy/dx = 0: 6x² − 18x + 12 = 0 → x² − 3x + 2 = 0 **(M1)**\n  (x − 1)(x − 2) = 0 → **x = 1 or x = 2  (A1)**.\nAlways set the derivative equal to zero AND factor — a common error is to read the answer from the original curve y.",
    source: "exam-style" },

  // ── 1.19 Sequences — extra (term-to-term) ──────────────────────────────────
  { topicCode: "1.19", marks: 4,
    question: "Here are the first four terms of a sequence:  5, 11, 21, 35, …\n(a) Find the nth-term formula. (Hint: it is a quadratic in n.)\n(b) Hence find the 10th term.",
    markScheme: "(a) Differences: 6, 10, 14 → second differences = 4 → so a = 4/2 = 2 **(M1)** (the n² coefficient)\n  Try u_n = 2n² + bn + c. n=1 gives 2 + b + c = 5; n=2 gives 8 + 2b + c = 11. Subtract: 6 + b = 6 → b = 0 **(M1)**, c = 3 **(M1)**\n  **u_n = 2n² + 3  (A1)**\n(b) u_{10} = 2(100) + 3 = **203** (no extra marks if (a) wrong, FT applies).\nKey rule: second difference = 2a for a quadratic sequence.",
    source: "exam-style" },

  // ── 3.3 Length of a line segment ───────────────────────────────────────────
  { topicCode: "3.3", marks: 3,
    question: "Find the equation of the perpendicular bisector of the line segment joining A(2, 1) and B(8, 5).",
    markScheme: "Midpoint M = (5, 3) **(B1)**\nGradient of AB = (5 − 1)/(8 − 2) = 4/6 = 2/3\nGradient of perpendicular = −3/2 **(M1)**\nUsing y − 3 = −3/2(x − 5): **y = −(3/2)x + 21/2  (A1)** (accept 2y = −3x + 21).\nKey rule: perpendicular gradients multiply to −1.",
    source: "exam-style" },

  // ── 4.8 Circle theorems — extra ────────────────────────────────────────────
  { topicCode: "4.8", marks: 4,
    question: "A, B, C, D are points on a circle. ABCD is a cyclic quadrilateral. Angle BAD = 78° and angle ABC = 96°.\nFind angle BCD and angle ADC, giving a reason for each.",
    markScheme: "Opposite angles of a cyclic quadrilateral sum to 180° **(B1 for reason)**\nangle BCD = 180 − 78 = **102°  (B1)**\nangle ADC = 180 − 96 = **84°  (B1)**\nStating the reason (cyclic quad opposite angles) is needed for full marks — don't just write the numbers.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 1–2 MARK QUICK QUESTIONS — Paper 2 (Extended) openers / quick wins.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "1.7", marks: 1,
    question: "Simplify, leaving your answer as a single power of 5:  5^7 × 5^2",
    markScheme: "Add the indices when multiplying powers of the same base.\n**5^9  (B1)**",
    source: "exam-style" },

  { topicCode: "1.7", marks: 2,
    question: "Evaluate, without a calculator:  25^{1/2} + 27^{1/3}",
    markScheme: "25^{1/2} = √25 = 5 **(M1)**\n27^{1/3} = ³√27 = 3\nTotal = 5 + 3 = **8  (A1)**",
    source: "exam-style" },

  { topicCode: "1.4", marks: 2,
    question: "Write the decimal 0.625 as a fraction in its simplest form.",
    markScheme: "0.625 = 625/1000 **(M1)** for any fraction equal to 0.625.\nDivide top and bottom by 125: 625/1000 = **5/8  (A1)**",
    source: "exam-style" },

  { topicCode: "1.11", marks: 2,
    question: "Write the ratio 24 : 36 in its simplest form.",
    markScheme: "Common factor of 24 and 36 is 12 (HCF) **(M1)**.\nDivide both by 12: **2 : 3  (A1)**\nA ratio is in simplest form when there is no common factor other than 1.",
    source: "exam-style" },

  { topicCode: "2.1", marks: 1,
    question: "Simplify:  5x + 3 + 2x − 7",
    markScheme: "Collect like terms: (5x + 2x) + (3 − 7) = **7x − 4  (B1)**",
    source: "exam-style" },

  { topicCode: "2.2", marks: 1,
    question: "Expand:  3(2x + 5)",
    markScheme: "Multiply each term inside the bracket by 3.\n**6x + 15  (B1)**",
    source: "exam-style" },

  { topicCode: "2.6", marks: 2,
    question: "Factorise fully:  x² − 16",
    markScheme: "Recognise this as a difference of two squares: a² − b² = (a − b)(a + b) **(M1)**\nHere a = x, b = 4.\n**(x − 4)(x + 4)  (A1)**",
    source: "exam-style" },

  { topicCode: "6.1", marks: 2,
    question: "A right-angled triangle has the two shorter sides of length 5 cm and 12 cm. Calculate the length of the hypotenuse.",
    markScheme: "Use h² = 5² + 12² = 25 + 144 = 169 **(M1)**\nh = √169 = **13 cm  (A1)**\nMemorise 5-12-13 — a common Pythagorean triple.",
    source: "exam-style" },

  { topicCode: "9.3", marks: 1,
    question: "State the mode of this set of numbers:  3, 5, 5, 7, 9, 5, 11, 8",
    markScheme: "Mode = the most frequently occurring value.\n5 appears three times — more than any other.\n**Mode = 5  (B1)**",
    source: "exam-style" },

  { topicCode: "1.6", marks: 2,
    question: "Without a calculator, work out:  −8 + (−3) × 4",
    markScheme: "BIDMAS / BODMAS: multiply BEFORE adding.\n(−3) × 4 = −12 **(M1)**\nThen −8 + (−12) = **−20  (A1)**\nTrap: working left-to-right → (−8 + (−3)) × 4 = −44. WRONG order of operations.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5+ MARK LONGER-RESPONSE QUESTIONS — Paper 2 back-end / Paper 4 style.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "2.6", marks: 6,
    question: "Consider the equation  2x² + 5x − 3 = 0.\n(a) Calculate the discriminant.\n(b) Hence state how many real solutions the equation has.\n(c) Solve the equation using the quadratic formula, giving exact answers.\n(d) State whether the parabola y = 2x² + 5x − 3 has a minimum or maximum point, and briefly justify.",
    markScheme: "(a) Discriminant = b² − 4ac = 5² − 4(2)(−3) = 25 + 24 = **49  (M1, A1)**\n(b) Discriminant > 0 → **two distinct real solutions  (B1)**\n(c) x = (−b ± √D) / (2a) = (−5 ± 7) / 4 **(M1)**\n  x = 2/4 = **1/2** or x = −12/4 = **−3**  **(A1)**\n(d) Coefficient of x² (= 2) is **positive**, so the parabola opens UPWARDS → **minimum** point.  **(B1)**\nKey rule: a > 0 → minimum (smile); a < 0 → maximum (frown).",
    source: "exam-style" },

  { topicCode: "5.5", marks: 5,
    question: "A solid is made by joining a cone of radius 3 cm and height 4 cm to a cylinder of the same radius and height 10 cm. The cone sits on top of the cylinder.\n(Volume of cone = (1/3)πr²h; volume of cylinder = πr²h.)\n(a) Calculate the total volume of the solid in terms of π.\n(b) The solid is made of metal of density 7.8 g/cm³. Calculate its mass to the nearest gram.",
    markScheme: "(a) V_cone = (1/3)π(3)²(4) = (1/3)(9)(4)π = 12π **(M1, A1)**\n  V_cyl = π(3)²(10) = 90π **(M1)**\n  **V_total = 102π cm³  (A1)** (= 320.4 cm³ to 1 d.p.)\n(b) Mass = density × volume = 7.8 × 102π = 7.8 × 320.44… **(M1)**\n  Mass ≈ **2499 g (3 s.f.)  (A1 — max 5)**\nNote: \"in terms of π\" means leave π in your answer; don't multiply it out.",
    source: "exam-style" },

  { topicCode: "6.3", marks: 6,
    question: "In triangle ABC: AB = 8.0 cm, AC = 6.0 cm, and angle BAC = 70°.\n(a) Calculate the length BC using the cosine rule.\n(b) Calculate the area of triangle ABC.\n(c) Calculate the size of angle ABC using the sine rule.",
    markScheme: "(a) BC² = b² + c² − 2bc cos A = 6² + 8² − 2(6)(8) cos 70° **(M1)**\n  = 36 + 64 − 96(0.342) = 100 − 32.83 = 67.17 **(M1)**\n  **BC = 8.20 cm (3 s.f.)  (A1)**\n(b) Area = ½ bc sin A = ½ (6)(8) sin 70° = 24 × 0.9397 **(M1)**\n  **Area = 22.6 cm² (3 s.f.)  (A1)**\n(c) sin(ABC)/b = sin A/a → sin(ABC) = 6 sin 70° / 8.20 = 0.6877 **(M1)**\n  **angle ABC = 43.4° (3 s.f.)  (A1 — max 6)**\nAll three sides + one angle: cosine rule first, then sine rule. The largest angle is opposite the largest side.",
    source: "exam-style" },

  { topicCode: "9.6", marks: 6,
    question: "A cumulative frequency curve passes through these points (time t in minutes vs cumulative frequency):\n  (0, 0)  (5, 8)  (10, 25)  (15, 60)  (20, 88)  (25, 96)  (30, 100)\n\n(a) State the total number of students timed.\n(b) Estimate the median from the curve.\n(c) Estimate the interquartile range.\n(d) Estimate how many students took LESS than 12 minutes.",
    markScheme: "(a) Maximum cumulative frequency = **100 students  (B1)**\n(b) Median at CF = 50 → read off → approx **t = 13 minutes  (B1)** (accept 12.5–13.5)\n(c) LQ at CF = 25 → t = 10; UQ at CF = 75 → t ≈ 17.5 **(M1)**\n  IQR = 17.5 − 10 = **7.5 minutes  (A1)**\n(d) At t = 12, read CF off the curve: ≈ 40 **(M1, A1 — max 6)**\nUse N/4 and 3N/4 (not (N+1)/4) for continuous data; estimates should fall within ±1 of the official mark.",
    source: "exam-style" },

  { topicCode: "8.2", marks: 5,
    question: "A box contains 5 red balls and 4 blue balls. Three balls are drawn at random WITHOUT replacement.\n(a) Draw or describe a tree diagram for the three draws.\n(b) Calculate the probability that all three balls are the same colour.\n(c) Calculate the probability that exactly two balls are red.",
    markScheme: "(a) Tree diagram with branches R/B at each stage, with probabilities updating as balls are removed (denominators 9, 8, 7). **(B1)**\n(b) P(RRR) = 5/9 × 4/8 × 3/7 = 60/504 **(M1)**\n  P(BBB) = 4/9 × 3/8 × 2/7 = 24/504 **(M1)**\n  Same colour = sum = 84/504 = **1/6  (A1)**\n(c) Exactly 2 reds = P(RRB) + P(RBR) + P(BRR), each = 5/9 × 4/8 × 4/7 = 80/504 **(M1)**\n  Total = 3 × 80/504 = 240/504 = **10/21  (A1 — max 5)**\nKey: without replacement → denominators decrease (9, 8, 7); 'exactly 2 reds' = sum of all orderings.",
    source: "exam-style" },
];

/**
 * Per-question incremental seeder.
 *
 * Compares each EXAMPLES entry against rows already in the DB using
 * (topicCode + first 120 chars of question text) as a stable de-dup key.
 * Inserts only the ones not already present, so:
 *   • adding a NEW topic to EXAMPLES → auto-seeds on next deploy
 *   • adding ADDITIONAL questions to an already-seeded topic → also auto-seeds
 *   • re-running has no effect (all keys match)
 */
export async function seedIgcseExamplesIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };
  try {
    // Build a set of (topicCode + question prefix) keys already in the DB
    // for non-Physics (Math + any other future subjects sharing this seeder).
    const existing = await db.execute(sql`SELECT topicCode, question FROM igcse_examples WHERE topicCode NOT LIKE 'P%'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const dedupKey = (code: string, q: string) => `${code}::${q.slice(0, 120)}`;
    const present = new Set<string>(list.map((r: any) => dedupKey(String(r?.topicCode || ""), String(r?.question || ""))));

    const rows: any[] = [];
    let sortOrder = 0;
    for (const e of EXAMPLES) {
      if (present.has(dedupKey(e.topicCode, e.question))) continue;
      rows.push({
        topicCode: e.topicCode,
        syllabus: "CIE_0580",
        tier: "extended" as const,
        marks: e.marks,
        question: e.question,
        markScheme: e.markScheme,
        source: e.source || "exam-style",
        sortOrder: sortOrder++,
      });
    }

    if (!rows.length) {
      console.log(`[IGCSE] Math exemplars already complete (${list.length} rows in DB, ${EXAMPLES.length} in seed file).`);
      return { seeded: 0 };
    }
    await db.insert(igcseExamples).values(rows);
    console.log(`[IGCSE] Seeded ${rows.length} new Math exemplars (total now ${list.length + rows.length}).`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Exemplar seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
