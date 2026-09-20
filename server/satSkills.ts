/**
 * SpecTa SAT Self-Prep — the skill tree (Digital SAT blueprint, 2026).
 *
 * Section → domain → skill. Domain shares mirror College Board's published
 * distribution (RW: Craft & Structure ~28%, Information & Ideas ~26%,
 * Standard English Conventions ~26%, Expression of Ideas ~20%; Math: Algebra
 * ~35%, Advanced Math ~35%, Problem-Solving & Data Analysis ~15%, Geometry &
 * Trigonometry ~15%). Lessons are generated per skill (satQuestionGenerator)
 * and approved by admin; this file is the authoritative list of skills and
 * their outcomes, which also drives question generation.
 */

export interface SkillSeed {
  section: "rw" | "math";
  domain: string;
  domainCode: string;
  code: string;
  title: string;
  outcomes: string;
}

export const DOMAIN_SHARE: Record<string, number> = {
  CS: 28, II: 26, SEC: 26, EOI: 20,
  ALG: 35, ADV: 35, PSDA: 15, GEO: 15,
};

export const DOMAIN_LABEL: Record<string, { en: string; id: string }> = {
  CS: { en: "Craft and Structure", id: "Craft and Structure (kata & struktur)" },
  II: { en: "Information and Ideas", id: "Information and Ideas (informasi & gagasan)" },
  SEC: { en: "Standard English Conventions", id: "Standard English Conventions (tata bahasa)" },
  EOI: { en: "Expression of Ideas", id: "Expression of Ideas (ungkapan gagasan)" },
  ALG: { en: "Algebra", id: "Aljabar" },
  ADV: { en: "Advanced Math", id: "Matematika Lanjut" },
  PSDA: { en: "Problem-Solving and Data Analysis", id: "Pemecahan Masalah & Analisis Data" },
  GEO: { en: "Geometry and Trigonometry", id: "Geometri & Trigonometri" },
};

const rw = (domainCode: string, domain: string, code: string, title: string, outcomes: string): SkillSeed =>
  ({ section: "rw", domain, domainCode, code, title, outcomes });
const math = (domainCode: string, domain: string, code: string, title: string, outcomes: string): SkillSeed =>
  ({ section: "math", domain, domainCode, code, title, outcomes });

export const SKILL_SEEDS: SkillSeed[] = [
  // ── Reading & Writing · Craft and Structure ──
  rw("CS", "Craft and Structure", "CS-1", "Words in context",
    "Choose the most precise word or phrase for a blank using the surrounding sentence; recognise connotation, register and collocation; eliminate near-synonyms that don't fit the logic."),
  rw("CS", "Craft and Structure", "CS-2", "Text structure and purpose",
    "Identify the overall structure of a short passage (e.g. claim then evidence, problem then solution) and the main purpose of the passage or of a specific sentence within it."),
  rw("CS", "Craft and Structure", "CS-3", "Cross-text connections",
    "Compare two short texts on the same topic: identify how one author would respond to the other's claim, and where they agree or disagree."),
  // ── Reading & Writing · Information and Ideas ──
  rw("II", "Information and Ideas", "II-1", "Central ideas and details",
    "State the main idea of a passage and locate the detail that best supports a given statement; distinguish central from peripheral information."),
  rw("II", "Information and Ideas", "II-2", "Command of evidence (textual)",
    "Pick the quotation or finding that most directly supports or weakens a claim, including from bulleted research notes."),
  rw("II", "Information and Ideas", "II-3", "Command of evidence (quantitative)",
    "Read a table or graph and choose the data point that completes a sentence accurately; avoid options that are true but irrelevant to the claim."),
  rw("II", "Information and Ideas", "II-4", "Inferences",
    "Complete a logical conclusion that follows from the text's premises without adding outside assumptions; recognise the difference between 'supported' and 'stated'."),
  // ── Reading & Writing · Standard English Conventions ──
  rw("SEC", "Standard English Conventions", "SEC-1", "Sentence boundaries",
    "Fix run-ons, comma splices and fragments using periods, semicolons, colons and coordinating conjunctions correctly."),
  rw("SEC", "Standard English Conventions", "SEC-2", "Subject-verb agreement",
    "Match verbs to their true subjects across intervening phrases, collective nouns, and inverted or compound subjects."),
  rw("SEC", "Standard English Conventions", "SEC-3", "Pronoun clarity and agreement",
    "Choose pronouns that agree in number and person with clear antecedents; avoid ambiguous 'it/they/this'."),
  rw("SEC", "Standard English Conventions", "SEC-4", "Verb tense, mood and voice",
    "Keep tense consistent with the passage's timeline; use perfect and progressive forms correctly; recognise when passive is appropriate."),
  rw("SEC", "Standard English Conventions", "SEC-5", "Modifiers and parallel structure",
    "Place modifiers next to what they modify; make items in a list or comparison grammatically parallel."),
  rw("SEC", "Standard English Conventions", "SEC-6", "Punctuation within sentences",
    "Use commas, dashes and parentheses for non-essential elements; apostrophes for possession vs plurals; punctuate lists and titles correctly."),
  // ── Reading & Writing · Expression of Ideas ──
  rw("EOI", "Expression of Ideas", "EOI-1", "Transitions",
    "Choose the transition word or phrase that reflects the logical relationship between two sentences (addition, contrast, cause, example, sequence)."),
  rw("EOI", "Expression of Ideas", "EOI-2", "Rhetorical synthesis",
    "From bulleted notes, choose the sentence that best achieves a stated goal (e.g. emphasise a difference, introduce a person to a new audience)."),

  // ── Math · Algebra ──
  math("ALG", "Algebra", "ALG-1", "Linear equations in one variable",
    "Solve linear equations including those with fractions, parentheses and variables on both sides; identify equations with no or infinitely many solutions."),
  math("ALG", "Algebra", "ALG-2", "Linear equations in two variables and graphs",
    "Convert between slope-intercept, standard and point-slope forms; interpret slope and intercepts in context; read lines from graphs."),
  math("ALG", "Algebra", "ALG-3", "Linear functions and modelling",
    "Build and interpret linear functions from word problems and tables; evaluate f(x); interpret rate of change and initial value."),
  math("ALG", "Algebra", "ALG-4", "Systems of two linear equations",
    "Solve by substitution, elimination or graphing; determine the number of solutions from coefficients; set up systems from context."),
  math("ALG", "Algebra", "ALG-5", "Linear inequalities",
    "Solve and graph one- and two-variable linear inequalities and systems of inequalities; identify which point satisfies a system."),
  // ── Math · Advanced Math ──
  math("ADV", "Advanced Math", "ADV-1", "Equivalent expressions",
    "Factor, expand and simplify polynomial and rational expressions; rewrite expressions to reveal structure (completing the square, factoring out)."),
  math("ADV", "Advanced Math", "ADV-2", "Quadratic equations and functions",
    "Solve by factoring, the quadratic formula and completing the square; find vertex, axis, intercepts; use the discriminant."),
  math("ADV", "Advanced Math", "ADV-3", "Exponential functions and growth",
    "Model growth and decay; interpret base and exponent in context; convert percentage change to a factor; compare linear and exponential models."),
  math("ADV", "Advanced Math", "ADV-4", "Polynomials, radicals and rational equations",
    "Work with higher-degree polynomials and their zeros; solve radical and rational equations and check for extraneous solutions."),
  math("ADV", "Advanced Math", "ADV-5", "Nonlinear systems and function notation",
    "Solve a linear-quadratic system; interpret and transform functions (shifts, reflections); compose and evaluate functions."),
  // ── Math · Problem-Solving and Data Analysis ──
  math("PSDA", "Problem-Solving and Data Analysis", "PSDA-1", "Ratios, rates and proportions",
    "Set up and solve proportions; unit conversions; scale factors; rate problems."),
  math("PSDA", "Problem-Solving and Data Analysis", "PSDA-2", "Percentages",
    "Percent change, percent of a quantity, reverse percentages; successive percentage changes."),
  math("PSDA", "Problem-Solving and Data Analysis", "PSDA-3", "Statistics: centre and spread",
    "Mean, median, mode, range and standard deviation (conceptually); effect of outliers; compare distributions from tables and dot plots."),
  math("PSDA", "Problem-Solving and Data Analysis", "PSDA-4", "Probability and two-way tables",
    "Simple and conditional probability from tables; relative frequencies."),
  math("PSDA", "Problem-Solving and Data Analysis", "PSDA-5", "Scatterplots, models and inference",
    "Interpret lines of best fit; evaluate whether a sample supports a conclusion about a population; margin of error conceptually."),
  // ── Math · Geometry and Trigonometry ──
  math("GEO", "Geometry and Trigonometry", "GEO-1", "Area, perimeter and volume",
    "Compute and reason about area, perimeter, surface area and volume of standard shapes and composite figures."),
  math("GEO", "Geometry and Trigonometry", "GEO-2", "Lines, angles and triangles",
    "Parallel lines and transversals; triangle angle sums; similar and congruent triangles; Pythagorean theorem."),
  math("GEO", "Geometry and Trigonometry", "GEO-3", "Right-triangle trigonometry",
    "Sine, cosine and tangent ratios; special right triangles; solve for sides and angles in context."),
  math("GEO", "Geometry and Trigonometry", "GEO-4", "Circles",
    "Equation of a circle; arc length and sector area; angles and chords; radians and degrees."),
];

/** Blueprint style rules the generator follows per section. */
export const SECTION_STYLE = {
  rw: `Digital SAT Reading & Writing style: ONE short passage of 25–150 words (literary, history/social studies, humanities or science), followed by ONE question with FOUR choices (A–D). Every item is self-contained. Passages are original — never adapted from College Board, Khan Academy or published tests. Questions use the official stems where natural: "Which choice completes the text with the most logical and precise word or phrase?", "Which choice best states the main purpose of the text?", "Which finding, if true, would most directly support the claim?", "Which choice most logically completes the text?", "Which choice completes the text so that it conforms to the conventions of Standard English?", "Which choice most effectively uses information from the notes to accomplish this goal?" (for notes-based items, provide 3–5 bullet notes and a stated goal in the passage field). Exactly one correct answer; the three distractors must each be attractive for a specific, nameable reason.`,
  math: `Digital SAT Math style: a concise problem, usually 1–4 sentences, sometimes with a small table described in text or a described graph/figure (state all needed values in words; no images). About 75% multiple choice with FOUR choices (A–D), about 25% student-produced response (spr) with a single numeric answer (integer, decimal or fraction; give accepted equivalent forms). Realistic contexts (business, science, everyday) or pure algebra as the real test does. A calculator is always available on the real test, so do not rely on arithmetic tricks; test understanding. Exactly one correct answer; distractors reflect specific common errors (sign error, wrong operation, solved for the wrong quantity, misread the question).`,
};
