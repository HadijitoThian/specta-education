/**
 * AI IELTS Tutor — evaluation engines.
 *
 * The teaching core: not just a band score, but corrective feedback that helps
 * a student actually FIX their writing/speaking — inline corrections, a model
 * rewrite at a higher band, prioritized next steps, and targeted drills.
 *
 * Reuses the existing stack: invokeLLM (DeepSeek) for grading, Whisper
 * (transcribeAudioBuffer) for speech, ElevenLabs (synthesize) for the examiner
 * voice. Output is strict-shaped via defensive JSON parsing (DeepSeek ignores
 * json_schema, so we prompt the shape + normalize).
 */
import { invokeLLM } from "./_core/llm";

function llmText(res: any): string {
  const c = res?.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : "";
}
function parseJsonLoose(text: string): any {
  try { return JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch { /* */ } } return {}; }
}
const clampBand = (n: any): number => {
  const v = Math.round((Number(n) || 0) * 2) / 2; // nearest 0.5
  return Math.max(0, Math.min(9, v));
};
const crit = (c: any) => ({ band: clampBand(c?.band), comment: String(c?.comment || "") });
const strArr = (a: any) => (Array.isArray(a) ? a.map((x: any) => String(x)).filter(Boolean) : []);
/** Pick the first present key from an object (tolerates snake_case / variants). */
const pick = (obj: any, keys: string[]) => { for (const k of keys) if (obj && obj[k]) return obj[k]; return {}; };

/** Objective fluency signals derived from Whisper segment timestamps. */
export interface FluencyMetrics { wpm: number; pauseCount: number; longPauseCount: number; pausePct: number; hasTiming: boolean }
export function computeFluency(segments: Array<{ start: number; end: number }> | undefined, durationSec: number, words: number): FluencyMetrics {
  const wpm = durationSec > 0 ? Math.round((words / durationSec) * 60) : 0;
  if (!segments || segments.length < 2) return { wpm, pauseCount: 0, longPauseCount: 0, pausePct: 0, hasTiming: false };
  let pauseCount = 0, longPause = 0, totalPause = 0;
  for (let i = 1; i < segments.length; i++) {
    const gap = (segments[i].start ?? 0) - (segments[i - 1].end ?? 0);
    if (gap > 0.7) { pauseCount++; totalPause += gap; if (gap > 2) longPause++; }
  }
  const total = durationSec || (segments[segments.length - 1].end ?? 0);
  const pausePct = total > 0 ? Math.round((totalPause / total) * 100) : 0;
  return { wpm, pauseCount, longPauseCount: longPause, pausePct, hasTiming: true };
}
function fluencyLine(m: FluencyMetrics | undefined, wpm: number): string {
  if (m && m.hasTiming) return `OBJECTIVE TIMING measured from the actual audio: ~${m.wpm} words/min, ${m.pauseCount} noticeable pauses (${m.longPauseCount} long pauses over 2s), silence ≈ ${m.pausePct}% of the answer. Use these REAL signals to score Fluency & Coherence: smooth pacing with few long pauses = higher fluency; many long pauses/hesitations = lower. Don't guess fluency — use these numbers.`;
  return `Approximate speaking rate: ~${wpm} words/min.`;
}

// ── Writing ──────────────────────────────────────────────────────────────────
export interface WritingFeedback {
  overallBand: number;
  criteria: {
    taskResponse: { band: number; comment: string };
    coherenceCohesion: { band: number; comment: string };
    lexicalResource: { band: number; comment: string };
    grammaticalRange: { band: number; comment: string };
  };
  corrections: Array<{ original: string; fix: string; explanation: string; type: string }>;
  modelAnswer: string;
  strengths: string[];
  improvements: string[];
  drills: Array<{ focus: string; instruction: string }>;
  wordCount: number;
}

export async function evaluateWriting(taskType: string, prompt: string, essay: string): Promise<WritingFeedback> {
  const wordCount = (essay.trim().match(/\S+/g) || []).length;
  // CALL 1 — compact grading JSON (NO model rewrite, so the JSON can't truncate).
  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a certified IELTS Writing examiner AND a supportive tutor for Indonesian students. Score strictly against the official IELTS band descriptors for the four criteria (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy). Bands are 0–9 in 0.5 steps; overall is the average rounded to the nearest 0.5. Be specific and kind. Output valid JSON only — no markdown, no prose outside the JSON.`,
      },
      {
        role: "user",
        content: `IELTS Writing ${taskType === "task1" ? "Task 1" : "Task 2"}.

TASK PROMPT:
${prompt}

STUDENT'S ANSWER (${wordCount} words):
${essay}

Return ONLY this JSON (keep comments short):
{
  "overallBand": 6.5,
  "criteria": {
    "taskResponse": { "band": 6.5, "comment": "1 sentence" },
    "coherenceCohesion": { "band": 6, "comment": "1 sentence" },
    "lexicalResource": { "band": 6.5, "comment": "1 sentence" },
    "grammaticalRange": { "band": 6, "comment": "1 sentence" }
  },
  "corrections": [ { "original": "phrase from their text", "fix": "corrected", "explanation": "one line", "type": "grammar|vocabulary|cohesion|task|spelling" } ],
  "strengths": ["2-3 short strengths"],
  "improvements": ["3-5 short prioritized next steps"],
  "drills": [ { "focus": "weakest criterion", "instruction": "a short exercise" } ]
}
Provide 6-10 corrections.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const raw = llmText(res);
  const p = parseJsonLoose(raw);
  const c = p.criteria || p.scores || {};
  const taskResponse = crit(pick(c, ["taskResponse", "task_response", "taskAchievement", "task_achievement", "tr"]));
  const coherenceCohesion = crit(pick(c, ["coherenceCohesion", "coherence_cohesion", "coherenceAndCohesion", "cc"]));
  const lexicalResource = crit(pick(c, ["lexicalResource", "lexical_resource", "lexis", "lr"]));
  const grammaticalRange = crit(pick(c, ["grammaticalRange", "grammatical_range", "grammaticalRangeAndAccuracy", "grammatical_range_and_accuracy", "gra"]));
  const bands = [taskResponse.band, coherenceCohesion.band, lexicalResource.band, grammaticalRange.band].filter(b => b > 0);
  let overall = clampBand(p.overallBand ?? p.overall ?? p.band ?? 0);
  if (!overall && bands.length) overall = clampBand(bands.reduce((a, b) => a + b, 0) / bands.length);
  if (!overall && !bands.length) {
    console.error("[Tutor] writing grade parse failed. Raw:", raw.slice(0, 600));
    throw new Error("Penilaian gagal diproses — silakan coba lagi.");
  }

  // CALL 2 — the model rewrite as PLAIN TEXT (large but no JSON to break).
  // Best-effort: if it fails, the rest of the feedback still shows.
  let modelAnswer = "";
  try {
    const mres = await invokeLLM({
      messages: [
        { role: "system", content: "You are an IELTS examiner. Rewrite the student's essay at ~band 8, keeping their ideas but improving structure, cohesion, vocabulary and grammar. Output ONLY the rewritten essay as plain prose." },
        { role: "user", content: `TASK:\n${prompt}\n\nSTUDENT ESSAY:\n${essay}\n\nRewrite at band 8:` },
      ],
      max_tokens: 1200,
    });
    modelAnswer = llmText(mres).trim();
  } catch (e) { console.warn("[Tutor] model-answer gen failed:", (e as Error).message); }

  return {
    overallBand: overall,
    criteria: { taskResponse, coherenceCohesion, lexicalResource, grammaticalRange },
    corrections: (Array.isArray(p.corrections) ? p.corrections : []).slice(0, 20).map((x: any) => ({
      original: String(x?.original || ""), fix: String(x?.fix || ""),
      explanation: String(x?.explanation || ""), type: String(x?.type || "grammar"),
    })).filter((x: any) => x.original || x.fix),
    modelAnswer,
    strengths: strArr(p.strengths),
    improvements: strArr(p.improvements),
    drills: (Array.isArray(p.drills) ? p.drills : []).slice(0, 5).map((d: any) => ({ focus: String(d?.focus || ""), instruction: String(d?.instruction || "") })),
    wordCount,
  };
}

// ── Speaking ─────────────────────────────────────────────────────────────────
export interface SpeakingFeedback {
  overallBand: number;
  criteria: {
    fluencyCoherence: { band: number; comment: string };
    lexicalResource: { band: number; comment: string };
    grammaticalRange: { band: number; comment: string };
    pronunciation: { band: number; comment: string };
  };
  observations: { fillerWords: string[]; repetitions: string[]; grammarErrors: Array<{ error: string; fix: string }>; speakingRateWpm: number; pauseCount?: number; longPauseCount?: number };
  corrections: Array<{ original: string; fix: string; explanation: string }>;
  modelAnswer: string;
  upgradedAnswer: string;
  improvements: string[];
  tips: string[];
}

export async function evaluateSpeaking(part: string, question: string, transcript: string, durationSec: number, metrics?: FluencyMetrics): Promise<SpeakingFeedback> {
  const words = (transcript.trim().match(/\S+/g) || []).length;
  const wpm = durationSec > 0 ? Math.round((words / durationSec) * 60) : 0;
  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a certified IELTS Speaking examiner AND a tutor for Indonesian students. Score FAIRLY and accurately against the official band descriptors for Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation (0–9, 0.5 steps) — like a real, encouraging examiner. Do NOT be stricter than a real examiner; reward genuine fluency, vocabulary range and clear communication.

CALIBRATION (important for fairness):
- You are reading an AUTO-GENERATED TRANSCRIPT — you CANNOT hear pace, intonation or accent. So do NOT penalise Pronunciation for what you can't hear: assume clear, intelligible pronunciation and score it AT LEAST at the level of their Fluency/Lexical performance unless the transcript shows obvious word confusion.
- The transcript may have imperfect punctuation, run-ons or fragments from speech-to-text. IGNORE those artifacts — judge the actual ideas and language, not transcription noise.
- A fluent, well-developed answer with good range and only minor errors is typically band 6.5–7.5, not 6.0. Don't under-score competent speakers.
- Speaking rate ~120-150 wpm is natural (this answer: ${wpm} wpm).
Output valid JSON only.`,
      },
      {
        role: "user",
        content: `IELTS Speaking ${part}. Examiner question: "${question}"

STUDENT'S SPOKEN ANSWER (transcribed, ${words} words, ${durationSec}s):
${transcript || "(no speech detected)"}

${fluencyLine(metrics, wpm)}

Return ONLY this JSON:
{
  "overallBand": 6.0,
  "criteria": {
    "fluencyCoherence": { "band": 6, "comment": "..." },
    "lexicalResource": { "band": 6, "comment": "..." },
    "grammaticalRange": { "band": 6, "comment": "..." },
    "pronunciation": { "band": 6, "comment": "estimated from transcript — note the limitation" }
  },
  "observations": {
    "fillerWords": ["um", "you know"],
    "repetitions": ["words/phrases they overused"],
    "grammarErrors": [ { "error": "what they said", "fix": "correct form" } ]
  },
  "corrections": [ { "original": "phrase they used", "fix": "better version", "explanation": "one line" } ],
  "improvements": ["3-5 prioritized next steps"],
  "tips": ["2-4 concrete fluency/pronunciation tips for an Indonesian speaker"]
}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1800,
  });

  const raw = llmText(res);
  const p = parseJsonLoose(raw);
  const c = p.criteria || p.scores || {};
  const o = p.observations || {};
  const fluencyCoherence = crit(pick(c, ["fluencyCoherence", "fluency_coherence", "fluencyAndCoherence", "fc"]));
  const lexicalResource = crit(pick(c, ["lexicalResource", "lexical_resource", "lr"]));
  const grammaticalRange = crit(pick(c, ["grammaticalRange", "grammatical_range", "grammaticalRangeAndAccuracy", "gra"]));
  const pronunciation = crit(pick(c, ["pronunciation", "pron"]));
  const sBands = [fluencyCoherence.band, lexicalResource.band, grammaticalRange.band, pronunciation.band].filter(b => b > 0);
  let sOverall = clampBand(p.overallBand ?? p.overall ?? p.band ?? 0);
  if (!sOverall && sBands.length) sOverall = clampBand(sBands.reduce((a, b) => a + b, 0) / sBands.length);
  if (!sOverall && !sBands.length) {
    console.error("[Tutor] speaking grade parse failed. Raw:", raw.slice(0, 600));
    throw new Error("Penilaian gagal diproses — silakan coba lagi.");
  }

  // Model + upgraded answers as plain text (best-effort, no JSON to break).
  let modelAnswer = "", upgradedAnswer = "";
  try {
    const mres = await invokeLLM({
      messages: [
        { role: "system", content: "You are an IELTS speaking examiner. Output ONLY two clearly labelled plain-text answers." },
        { role: "user", content: `Question: "${question}"\nStudent said: "${transcript || "(no speech)"}"\n\nWrite:\nMODEL: a natural band-8 answer to the question.\nUPGRADED: the student's own answer rewritten at a higher band (keep their content).` },
      ],
      max_tokens: 900,
    });
    const txt = llmText(mres);
    const mm = txt.match(/MODEL:\s*([\s\S]*?)(?:\n\s*UPGRADED:|$)/i);
    const um = txt.match(/UPGRADED:\s*([\s\S]*)$/i);
    modelAnswer = (mm?.[1] || "").trim();
    upgradedAnswer = (um?.[1] || "").trim();
  } catch (e) { console.warn("[Tutor] speaking model/upgraded gen failed:", (e as Error).message); }

  return {
    overallBand: sOverall,
    criteria: { fluencyCoherence, lexicalResource, grammaticalRange, pronunciation },
    observations: {
      fillerWords: strArr(o.fillerWords),
      repetitions: strArr(o.repetitions),
      grammarErrors: (Array.isArray(o.grammarErrors) ? o.grammarErrors : []).slice(0, 12).map((g: any) => ({ error: String(g?.error || ""), fix: String(g?.fix || "") })),
      speakingRateWpm: wpm,
      pauseCount: metrics?.hasTiming ? metrics.pauseCount : undefined,
      longPauseCount: metrics?.hasTiming ? metrics.longPauseCount : undefined,
    },
    corrections: (Array.isArray(p.corrections) ? p.corrections : []).slice(0, 15).map((x: any) => ({ original: String(x?.original || ""), fix: String(x?.fix || ""), explanation: String(x?.explanation || "") })),
    modelAnswer,
    upgradedAnswer,
    improvements: strArr(p.improvements),
    tips: strArr(p.tips),
  };
}

// ── Content generators ───────────────────────────────────────────────────────
export interface WritingTask {
  taskType: string;
  prompt: string;
  // Task 1 always ships its own data as a TABLE the UI renders — so the student
  // actually has something to describe (no "graph below" with no graph).
  table?: { title: string; unit?: string; columns: string[]; rows: string[][] };
}

export async function generateWritingTask(taskType: "task1" | "task2"): Promise<WritingTask> {
  if (taskType === "task2") {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: "You are an IELTS content writer. Output JSON only." },
        { role: "user", content: `Create one IELTS Writing Task 2 essay prompt (opinion/discussion/problem-solution) on a common topic. Return {"prompt":"full task wording incl. 'You should spend about 40 minutes on this task.' and 'Write at least 250 words.'"}` },
      ],
      response_format: { type: "json_object" },
    });
    const p = parseJsonLoose(llmText(res));
    return { taskType, prompt: String(p.prompt || "") };
  }

  // Task 1 — the AI returns ONLY the data; the prompt wording is built in code,
  // so it can never reference a chart that isn't shown.
  const res = await invokeLLM({
    messages: [
      { role: "system", content: "You generate the DATA for an IELTS Academic Writing Task 1 table. Return ONLY a JSON data table with REAL, realistic numbers. Do NOT write any task wording. Output JSON only." },
      { role: "user", content: `Generate one realistic IELTS Task 1 data table (4-6 columns, 3-6 rows) on a common topic (e.g. population, energy, spending, transport, employment).
Return JSON: { "subject": "what the data shows, e.g. 'the percentage of households with internet access in four countries between 2000 and 2020'", "title": "short table caption", "unit": "e.g. %, millions, USD", "columns": ["col1","col2",...], "rows": [["r1c1","r1c2",...], ...] }` },
    ],
    response_format: { type: "json_object" },
  });
  const p = parseJsonLoose(llmText(res));
  const columns = strArr(p.columns);
  const rows = (Array.isArray(p.rows) ? p.rows : []).map((r: any) => (Array.isArray(r) ? r.map((c: any) => String(c)) : [])).filter((r: any[]) => r.length);
  if (!columns.length || !rows.length) throw new Error("Could not generate the task — please try again.");

  const subject = String(p.subject || p.title || "the data in the table below");
  const prompt = `The table below shows ${subject}.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nYou should spend about 20 minutes on this task. Write at least 150 words.`;
  const table = { title: String(p.title || "Data"), unit: p.unit ? String(p.unit) : undefined, columns, rows };
  return { taskType, prompt, table };
}

export async function generateSpeakingQuestions(part: "part1" | "part2" | "part3"): Promise<{ part: string; topic?: string; questions: string[] }> {
  const res = await invokeLLM({
    messages: [
      { role: "system", content: "You are an IELTS Speaking examiner creating authentic questions. Output JSON only." },
      { role: "user", content:
        part === "part1" ? `Create 4 IELTS Speaking Part 1 questions on one everyday topic. Return {"topic":"...","questions":["q1","q2","q3","q4"]}`
        : part === "part2" ? `Create one IELTS Speaking Part 2 cue card. Return {"topic":"Describe ...","questions":["the cue card with 'You should say:' bullet points as a single string"]}`
        : `Create 4 IELTS Speaking Part 3 discussion questions (abstract, opinion-based) tied to a common theme. Return {"topic":"...","questions":["q1","q2","q3","q4"]}` },
    ],
    response_format: { type: "json_object" },
  });
  const p = parseJsonLoose(llmText(res));
  return { part, topic: p.topic ? String(p.topic) : undefined, questions: strArr(p.questions).slice(0, 6) };
}

// ── Full Speaking Test — Part 1 (guided, like the real exam) ─────────────────
const PART1_TOPICS = [
  "your hometown", "your work or studies", "your daily routine", "hobbies and free time",
  "food and cooking", "music", "travel and holidays", "technology and mobile phones",
  "weather and seasons", "reading and books", "sports and exercise", "friends",
  "shopping", "your home", "nature and the outdoors", "art", "festivals and celebrations",
  "transport", "the internet", "childhood",
];

/** Generate a fresh Part-1 set: a random topic + 7 connected questions. */
export async function generatePart1Test(): Promise<{ topic: string; questions: string[] }> {
  const seed = PART1_TOPICS[Math.floor(Math.random() * PART1_TOPICS.length)];
  const res = await invokeLLM({
    messages: [
      { role: "system", content: "You are an IELTS Speaking Part 1 examiner. Produce natural, connected Part-1 questions like the real test. Output JSON only." },
      { role: "user", content: `Create exactly 7 IELTS Speaking Part 1 questions about "${seed}" (and closely related sub-topics). They should feel like a real, flowing Part 1 — short, personal, everyday questions. Return {"topic":"${seed}","questions":["q1",...,"q7"]}` },
    ],
    response_format: { type: "json_object" },
    max_tokens: 600,
  });
  const p = parseJsonLoose(llmText(res));
  let questions = strArr(p.questions).slice(0, 7);
  if (questions.length < 3) throw new Error("Could not generate questions — please try again.");
  return { topic: String(p.topic || seed), questions };
}

export interface QuickSpeakingFeedback {
  band: number;
  fixes: Array<{ original: string; fix: string }>;
  better: string;
  tip: string;
}

/** Light, fast per-answer feedback for the guided test (one compact call). */
export async function evaluateSpeakingQuick(question: string, transcript: string, durationSec: number, metrics?: FluencyMetrics): Promise<QuickSpeakingFeedback> {
  const words = (transcript.trim().match(/\S+/g) || []).length;
  const wpm = durationSec > 0 ? Math.round((words / durationSec) * 60) : 0;
  const res = await invokeLLM({
    messages: [
      { role: "system", content: "You are a friendly IELTS Speaking examiner giving quick, encouraging feedback on a single Part-1 answer. Score FAIRLY (like a real examiner, not strict). You're reading an auto-generated transcript: do NOT penalise pronunciation/accent you can't hear, and ignore transcription punctuation/fragment artifacts — judge the real language and communication. A fluent answer with good range and only minor errors is typically 6.5–7.5, not 6.0. Be concise. Output JSON only." },
      { role: "user", content: `Question: "${question}"
Student's answer (transcribed, ${words} words): ${transcript || "(no speech detected)"}
${fluencyLine(metrics, wpm)}

Return JSON: { "band": 6.0, "fixes": [ {"original":"what they said","fix":"better version"} ], "better": "one improved sample sentence answering the question", "tip": "one short tip" }
Give 1-3 fixes max. Keep everything short.` },
    ],
    response_format: { type: "json_object" },
    max_tokens: 600,
  });
  const p = parseJsonLoose(llmText(res));
  return {
    band: clampBand(p.band ?? p.overallBand ?? 0) || 5,
    fixes: (Array.isArray(p.fixes) ? p.fixes : []).slice(0, 3).map((x: any) => ({ original: String(x?.original || ""), fix: String(x?.fix || "") })).filter((x: any) => x.fix),
    better: String(p.better || ""),
    tip: String(p.tip || ""),
  };
}

/** Aggregate the whole Part-1 test into a band + recurring mistakes + plan. */
export async function summarizePart1Test(topic: string, answers: Array<{ question: string; transcript: string; band: number }>): Promise<{ overallBand: number; summary: string; recurringMistakes: string[]; improvements: string[] }> {
  const bands = answers.map(a => a.band).filter(b => b > 0);
  const avg = bands.length ? clampBand(bands.reduce((s, b) => s + b, 0) / bands.length) : 5;
  const transcriptBlock = answers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.transcript || "(no answer)"}`).join("\n\n");
  let summary = "", recurringMistakes: string[] = [], improvements: string[] = [];
  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: "You are an IELTS Speaking examiner summarising a student's whole Part 1 performance for a tutor report. Be specific and encouraging. Output JSON only." },
        { role: "user", content: `Topic: ${topic}\nEstimated overall Part-1 band: ${avg}\n\nAll answers:\n${transcriptBlock}\n\nReturn JSON: { "summary": "2-3 sentence overall read of their Part-1 speaking", "recurringMistakes": ["patterns of errors across answers, e.g. tense, articles, fillers"], "improvements": ["3-5 prioritized practice steps"] }` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });
    const p = parseJsonLoose(llmText(res));
    summary = String(p.summary || "");
    recurringMistakes = strArr(p.recurringMistakes);
    improvements = strArr(p.improvements);
  } catch (e) { console.warn("[Tutor] part1 summary failed:", (e as Error).message); }
  return { overallBand: avg, summary, recurringMistakes, improvements };
}
