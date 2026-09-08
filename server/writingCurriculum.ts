/**
 * Emma's IELTS Writing Course — the 5-session curriculum + the text builders
 * that turn a student's course record into the context Emma teaches from.
 *
 * Every session follows one rhythm: review homework → teach one module →
 * guided practice with live board correction → rewrite → homework → save
 * progress. The module content adapts to the student's TRACK (from their
 * diagnosed band) and TEST TYPE (Academic vs General for Task 1), and the
 * personalised WEAKNESS MAP built in Session 1 steers every later session.
 *
 * These builders produce plain text injected into the agent prompt as
 * dynamic variables at the start of each call (see writingClassAgent.ts).
 */

import type { WritingCourse, WritingCourseSession, WritingHomework } from "../drizzle/schema";

export type Track = "foundation" | "developing" | "advanced";
export type TestType = "academic" | "general";

export function trackForBand(band: number | null | undefined): Track {
  const b = Number(band);
  if (!Number.isFinite(b) || b <= 5.5) return "foundation";
  if (b < 7) return "developing";
  return "advanced";
}

export const TRACK_LABEL: Record<Track, string> = {
  foundation: "Foundation (band 5.5 and below)",
  developing: "Developing (band 6.0–6.5)",
  advanced: "Advanced (band 7 and above)",
};

interface SessionModule {
  number: number;
  title: string;
  objectives: string[];
  teach: Record<Track, string>;         // what to teach, by track
  task1?: Record<TestType, string>;     // Task 1 branch (sessions 4–5)
  practice: string;
  homework: { taskType: "task1" | "task2" | "both"; guidance: string };
  timing: string;
}

export const CURRICULUM: SessionModule[] = [
  {
    number: 1,
    title: "Diagnosis and Foundations",
    objectives: [
      "Learn the student's goals: target band, test date, test type, what they find hardest.",
      "Run the written diagnostic and establish baseline bands per criterion.",
      "Teach how IELTS Writing is marked and the architecture of a Task 2 essay.",
      "Build the personal weakness map that steers sessions 2–5.",
    ],
    teach: {
      foundation: "How the 4 criteria work in plain terms. What 'a clear position' means and why examiners punish unclear ones. Simple essay shape: intro (say the topic + your view), 2 body paragraphs (one idea each), short conclusion. Sentence accuracy basics: subject–verb agreement, articles, plural -s, one tense per idea.",
      developing: "The 4 criteria and what separates 6.0 from 7.0 in each. The 5 Task 2 question types and what each demands. Essay architecture: paraphrase + thesis, topic sentences, PEEL body paragraphs, a conclusion that restates the position without new ideas. Why memorised phrases cost marks.",
      advanced: "How examiners read a 7+ script: precise position, fully extended ideas, natural cohesion, controlled complexity. The 5 question types with the traps in each. Architecture for 7.5+: nuanced thesis, concession, balanced development, precise conclusions. Avoiding over-formal or memorised language.",
    },
    practice: "Written diagnostic: a short timed Task 2 (20 minutes, ~180–220 words) and a mini Task 1 (an overview + one detail paragraph, or a short letter for General). Then guided practice: plan and write an introduction and one body paragraph on a new question; correct it live on the board.",
    homework: { taskType: "task2", guidance: "One full Task 2 essay, timed 40 minutes, 250+ words. Apply the essay architecture from today." },
    timing: "~10 min goals · ~30 min diagnostic (student writes, you stay quiet) · ~35 min teaching · ~35 min guided practice · ~10 min wrap-up + homework",
  },
  {
    number: 2,
    title: "Task 2 — Ideas, Structure and Coherence",
    objectives: [
      "Review the homework essay: the top three fixes.",
      "Generate ideas fast and plan an essay in 5 minutes.",
      "Develop paragraphs properly: topic sentence → explanation → example → link.",
      "Use cohesion naturally, without connector-stuffing; templates for all 5 question types.",
    ],
    teach: {
      foundation: "A 3-step plan: my view, reason 1, reason 2. One idea per paragraph. Topic sentence first, then explain it in 2–3 sentences, then one example. Basic linking that is actually correct: firstly / secondly / for example / however / in conclusion. Referencing words (this, these, it) to avoid repeating nouns.",
      developing: "5-minute planning method with idea banks by theme. PEEL paragraphs with fully extended ideas. Cohesion: pronoun referencing, substitution, logical sequencing, sentence-level linking instead of paragraph-opening connectors. Paraphrasing the question properly. Templates for opinion, discussion, advantages/disadvantages, problem/solution, double question.",
      advanced: "Argument design: concession + rebuttal, weighing, conditional reasoning. Coherence at the essay level: a thesis that the whole essay tracks. Cohesion that is invisible: referencing chains, lexical cohesion, parallel structure. Fitting the answer to the exact question type — especially double questions and 'to what extent'.",
    },
    practice: "Full plan + two body paragraphs on a new question, written in the pad. Correct live on the board (coherence + cohesion cards). Rewrite one paragraph applying the correction.",
    homework: { taskType: "task2", guidance: "A Task 2 essay of a DIFFERENT question type from last time. Timed 40 minutes." },
    timing: "~20 min homework review · ~35 min teaching · ~45 min guided practice + rewrite · ~10 min wrap-up + homework · take the break around 60 min",
  },
  {
    number: 3,
    title: "Grammatical Range and Lexical Resource",
    objectives: [
      "Review the homework essay with a grammar and vocabulary lens.",
      "Widen grammatical range with control: complex sentences that stay accurate.",
      "Upgrade vocabulary: collocation, paraphrase, topic language, register; kill memorised phrases.",
      "Target the student's own recurring errors from the weakness map.",
    ],
    teach: {
      foundation: "Accuracy first: subject–verb agreement, articles (a/an/the), plural -s, consistent tense, word order. Then TWO complex patterns done correctly: 'because/although' clauses and simple relative clauses (which/who). Vocabulary: precise everyday words over vague ones (thing, good, bad), basic collocations, avoiding direct translation from Bahasa.",
      developing: "Complex sentences with control: conditionals, relative clauses, passives where natural, participle clauses. Tense consistency across paragraphs. Common Indonesian-learner errors: 'in the other hand', overusing 'besides/moreover', dropped -s, comma splices, run-ons. Vocabulary: collocation, paraphrase without distortion, topic vocabulary sets, formal register.",
      advanced: "Range with precision: inversion, cleft sentences, nominalisation, hedging language. Error-free stretches matter more than showing off. Lexical precision: less common items used naturally, collocation accuracy, idiomatic-but-formal phrasing, avoiding lexical repetition through substitution. Eliminating any memorised-sounding language.",
    },
    practice: "Sentence-upgrading drills on the board (the student rewrites 5 sentences using target structures), then a body paragraph that must use three target structures. Correct live with grammar/vocabulary cards.",
    homework: { taskType: "task2", guidance: "A timed 40-minute Task 2 essay. Consciously use the three target structures from today." },
    timing: "~20 min homework review · ~40 min teaching + drills · ~40 min paragraph practice · ~10 min wrap-up · break around 60 min",
  },
  {
    number: 4,
    title: "Task 1",
    objectives: [
      "Review the homework essay briefly.",
      "Master Task 1 format, timing and the overview paragraph.",
      "Select, group and compare key features; use the language of change and comparison.",
      "Cover the student's test type: Academic data/process/map, or General letters.",
    ],
    teach: {
      foundation: "Task 1 rules: 20 minutes, 150+ words, no opinion. The 3-part shape: introduction (paraphrase the task), overview (the 2–3 biggest features), details (grouped, with numbers). Simple trend language: increased/decreased/remained stable, from … to …, the highest/lowest. General: the 4 letter types, opening/closing lines, cover every bullet.",
      developing: "The overview as the band-7 key: what to include, what to leave out. Grouping and comparing rather than listing. Language of trends, proportions and comparison with accuracy; process language (sequence, passive); map language (location, change). General: tone and register by recipient, purpose sentence, fully developed bullets, appropriate sign-off.",
      advanced: "Selecting the most significant features under time pressure. Precise, varied comparison and change language; avoiding mechanical templates. Complex data (multiple charts, mixed units), processes with cycles, before/after maps. General: nuanced tone, persuasive/complaint letters with appropriate force, natural formality.",
    },
    task1: {
      academic: "Focus on Academic Task 1: line/bar/pie/table data, processes, maps. Practise with a data set described in text on the board (you cannot show an image, so present the numbers clearly as a small table).",
      general: "Focus on General Training Task 1: formal, semi-formal and informal letters. Practise with a letter task that has three bullet points.",
    },
    practice: "Write an introduction + overview + one detail paragraph for a Task 1 (or a full short letter for General). Correct live. Then a second, different Task 1 type.",
    homework: { taskType: "both", guidance: "One Task 1 (20 minutes) AND one Task 2 (40 minutes), done as a set." },
    timing: "~15 min homework review · ~40 min teaching · ~50 min practice on two Task 1 types · ~10 min wrap-up · break around 60 min",
  },
  {
    number: 5,
    title: "Full Simulation and Exam Strategy",
    objectives: [
      "Review the homework set (Task 1 + Task 2).",
      "Run a complete timed Writing test in class: Task 1 (20 min) then Task 2 (40 min).",
      "Mark both tasks in detail on the board, band per criterion.",
      "Exam strategy: time management, a checking routine, last-minute traps; final progress report and plan.",
    ],
    teach: {
      foundation: "The exam routine: 3 min plan, write, 2 min check. What to check: -s endings, articles, tense, capital letters, word count. Keep it simple and clear rather than ambitious. The checking routine practised out loud.",
      developing: "Time allocation and recovery if running late. A checking routine targeted at the student's own error list. Managing an unfamiliar topic. How to make sure the position is clear in the intro, body and conclusion.",
      advanced: "Fine-tuning for 7.5+: precision over range, cutting anything that sounds memorised, making the overview and the thesis unmissable. Handling unusual question phrasings. A ruthless 3-minute check focused on their few remaining error types.",
    },
    task1: {
      academic: "The simulation uses an Academic Task 1 (data described as a table on the board).",
      general: "The simulation uses a General Training letter task.",
    },
    practice: "The full timed test in the pad (Task 1 then Task 2). You stay silent while they write. Then detailed marking on the board: a band per criterion for each task, the three most valuable fixes, and a final before/after comparison with the Session 1 baseline.",
    homework: { taskType: "both", guidance: "A weekly plan until the test: one full timed Writing test per week, self-checked with the routine from today." },
    timing: "~15 min homework review · ~65 min timed test (silent) · ~30 min marking on the board · ~10 min strategy + progress report",
  },
];

/** Compact, readable text of one session's module for the agent. */
export function buildSessionModuleText(course: WritingCourse, sessionNumber: number): string {
  const mod = CURRICULUM[Math.min(Math.max(sessionNumber, 1), 5) - 1];
  const track = trackForBand((course.currentLevel as any)?.band ?? (course.baseline as any)?.overall ?? null);
  const testType = (course.testType || "academic") as TestType;
  const plan = (course.plan as any)?.[String(mod.number)] as { focus?: string } | undefined;
  const lines = [
    `SESSION ${mod.number} OF 5 — ${mod.title}`,
    `Student track: ${TRACK_LABEL[track]}. Test type: ${testType === "general" ? "General Training" : "Academic"}.`,
    ``,
    `OBJECTIVES:`,
    ...mod.objectives.map(o => `- ${o}`),
    ``,
    `WHAT TO TEACH (for this track):`,
    mod.teach[track],
  ];
  if (mod.task1) lines.push(``, `TASK 1 BRANCH: ${mod.task1[testType]}`);
  if (plan?.focus) lines.push(``, `PERSONAL FOCUS FOR THIS SESSION (from the weakness map): ${plan.focus}`);
  lines.push(
    ``,
    `GUIDED PRACTICE: ${mod.practice}`,
    ``,
    `HOMEWORK TO ASSIGN AT THE END: ${mod.homework.taskType === "both" ? "Task 1 + Task 2" : mod.homework.taskType === "task1" ? "Task 1" : "Task 2"} — ${mod.homework.guidance}`,
    ``,
    `SUGGESTED TIMING (2 hours): ${mod.timing}`,
  );
  return lines.join("\n");
}

/** The student as Emma should know them. */
export function buildStudentProfileText(course: WritingCourse): string {
  const lvl = course.currentLevel as any;
  const base = course.baseline as any;
  const weak = (course.weaknessMap as any[]) || [];
  const lines = [
    `Name: ${course.studentName || "unknown — ask"}`,
    `Test type: ${course.testType === "general" ? "General Training" : "Academic"}`,
    `Target band: ${course.targetBand ? Number(course.targetBand).toFixed(1) : "unknown — ask"}`,
    `Test date: ${course.testDate || "unknown — ask"}`,
    `Sessions completed: ${course.sessionsCompleted} of ${course.totalSessions}`,
  ];
  if (lvl?.band) lines.push(`Current level: about band ${Number(lvl.band).toFixed(1)} (${TRACK_LABEL[trackForBand(lvl.band)]})`);
  else lines.push(`Current level: NOT YET DIAGNOSED — run the diagnostic in this session.`);
  if (base?.criteria) {
    const c = base.criteria;
    lines.push(`Baseline (Session 1 diagnostic): TR ${fmt(c.taskResponse)} · CC ${fmt(c.coherenceCohesion)} · LR ${fmt(c.lexicalResource)} · GRA ${fmt(c.grammaticalRange)} · overall ${fmt(base.overall)}`);
  }
  if (weak.length) {
    lines.push(`Weakness map (priority order):`);
    for (const w of weak.slice(0, 8)) lines.push(`- [${w.criterion}] ${w.issue}${w.status === "improving" ? " (improving)" : w.status === "fixed" ? " (fixed)" : ""}`);
  }
  return lines.join("\n");
}

const fmt = (n: any) => (Number.isFinite(Number(n)) ? Number(n).toFixed(1) : "?");

/** What happened in earlier sessions + the latest homework result. */
export function buildHistoryText(sessions: WritingCourseSession[], homework: WritingHomework[]): string {
  const done = sessions.filter(s => s.status === "completed").sort((a, b) => a.sessionNumber - b.sessionNumber);
  if (!done.length) return "This is the student's first session. No history yet.";
  const lines: string[] = [];
  for (const s of done) {
    lines.push(`Session ${s.sessionNumber}: ${s.summary || "(no summary saved)"}`);
    const covered = (s.covered as any[]) || [];
    if (covered.length) lines.push(`  Covered: ${covered.slice(0, 10).join("; ")}`);
    const corr = (s.corrections as any[]) || [];
    if (corr.length) lines.push(`  Key corrections: ${corr.slice(0, 6).map((c: any) => typeof c === "string" ? c : `${c.original} → ${c.corrected}`).join(" | ")}`);
  }
  return lines.join("\n");
}

/** The most recent graded homework, condensed for the review step. */
export function buildHomeworkReviewText(homework: WritingHomework[]): string {
  const graded = homework.filter(h => h.status === "graded").sort((a, b) => (b.gradedAt?.getTime() || 0) - (a.gradedAt?.getTime() || 0));
  const pending = homework.filter(h => h.status === "assigned");
  if (!graded.length) {
    return pending.length
      ? `Homework was assigned but NOT submitted: ${pending.map(h => `${h.taskType} — "${h.prompt.slice(0, 80)}…"`).join("; ")}. Ask about it kindly, then continue.`
      : "No homework to review.";
  }
  const out: string[] = [];
  for (const h of graded.slice(0, 2)) {
    const fb = h.feedback as any;
    const sc = h.scores as any;
    out.push(`${h.taskType.toUpperCase()} — "${h.prompt.slice(0, 100)}" · ${h.wordCount || "?"} words · overall ${fmt(h.overallBand)}`);
    if (sc) out.push(`  Bands: TR ${fmt(sc.taskResponse)} · CC ${fmt(sc.coherenceCohesion)} · LR ${fmt(sc.lexicalResource)} · GRA ${fmt(sc.grammaticalRange)}`);
    if (fb?.improvements?.length) out.push(`  Top fixes: ${fb.improvements.slice(0, 3).join(" | ")}`);
    if (fb?.corrections?.length) out.push(`  Sample errors: ${fb.corrections.slice(0, 3).map((c: any) => `"${c.original}" → "${c.fix}"`).join(" | ")}`);
    if (h.submission) out.push(`  Submission (excerpt): ${h.submission.slice(0, 900)}${h.submission.length > 900 ? "…" : ""}`);
  }
  return out.join("\n");
}

/** Derive a weakness map from diagnostic criteria (lowest first). */
export function weaknessMapFromCriteria(criteria: Record<string, { band: number; comment: string }>): Array<{ criterion: string; issue: string; priority: number; status: string }> {
  const label: Record<string, string> = {
    taskResponse: "Task Response", coherenceCohesion: "Coherence & Cohesion", lexicalResource: "Lexical Resource", grammaticalRange: "Grammatical Range & Accuracy",
  };
  return Object.entries(criteria)
    .map(([k, v]) => ({ criterion: label[k] || k, band: Number(v?.band) || 0, issue: (v?.comment || "").slice(0, 220) }))
    .sort((a, b) => a.band - b.band)
    .map((w, i) => ({ criterion: w.criterion, issue: w.issue, priority: i + 1, status: "open" }));
}

/** Personalise the per-session focus from the weakness map. */
export function planFromWeaknessMap(weak: Array<{ criterion: string; issue: string }>): Record<string, { focus: string }> {
  const top = weak.slice(0, 3).map(w => `${w.criterion}: ${w.issue}`).join(" / ");
  const byCrit = (name: string) => weak.find(w => w.criterion.startsWith(name))?.issue;
  return {
    "2": { focus: byCrit("Coherence") || byCrit("Task Response") || top },
    "3": { focus: [byCrit("Grammatical"), byCrit("Lexical")].filter(Boolean).join(" / ") || top },
    "4": { focus: byCrit("Task Response") || top },
    "5": { focus: top },
  };
}

/** What was said earlier in THIS session (before a pause / call cap), so a
 *  resumed call continues instead of restarting. Last ~40 turns. */
export function buildSessionSoFarText(transcript: unknown): string {
  const turns = Array.isArray(transcript) ? (transcript as Array<{ role?: string; text?: string }>) : [];
  const recent = turns.filter(t => t && typeof t.text === "string" && t.text.trim()).slice(-40);
  if (!recent.length) return "Nothing yet — this is the start of the session.";
  return recent.map(t => `${t.role === "you" ? "STUDENT" : "EMMA"}: ${String(t.text).slice(0, 700)}`).join("\n");
}

/** Emma's first spoken line for this call. */
export function buildOpeningLine(course: WritingCourse, sessionNumber: number, resume: boolean, elapsedSeconds: number): string {
  const name = course.studentName ? ` ${course.studentName}` : "";
  const mod = CURRICULUM[sessionNumber - 1];
  if (resume) {
    const mins = Math.round(elapsedSeconds / 60);
    return `Welcome back${name}! We've done about ${mins} minutes of Session ${sessionNumber}, ${mod.title}. Let's pick up exactly where we left off. Are you ready to continue?`;
  }
  if (sessionNumber === 1) {
    return `Hello${name}, and welcome! I'm Emma, your IELTS Writing teacher. Over our five sessions together we'll fix the specific things holding your writing back, step by step, for both Task 1 and Task 2. Today is about understanding where you are right now and building your foundations. Before we start, tell me: what band are you aiming for, and when is your test?`;
  }
  return `Hello${name}, welcome to Session ${sessionNumber}, ${mod.title}. Before we start today's work, let's look at your homework together. How did you find it?`;
}
