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
  observations: { fillerWords: string[]; repetitions: string[]; grammarErrors: Array<{ error: string; fix: string }>; speakingRateWpm: number };
  corrections: Array<{ original: string; fix: string; explanation: string }>;
  modelAnswer: string;
  upgradedAnswer: string;
  improvements: string[];
  tips: string[];
}

export async function evaluateSpeaking(part: string, question: string, transcript: string, durationSec: number): Promise<SpeakingFeedback> {
  const words = (transcript.trim().match(/\S+/g) || []).length;
  const wpm = durationSec > 0 ? Math.round((words / durationSec) * 60) : 0;
  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a certified IELTS Speaking examiner AND a tutor for Indonesian students. Score against the official band descriptors for Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation (0–9, 0.5 steps).

IMPORTANT: you are reading a TRANSCRIPT, so you CANNOT fully judge pronunciation/accent — estimate it conservatively from word choice/spelling cues and say so. Focus your most confident feedback on fluency, vocabulary, and grammar. A natural speaking rate is ~120-150 wpm (this answer: ${wpm} wpm). Help them improve. Output valid JSON only.`,
      },
      {
        role: "user",
        content: `IELTS Speaking ${part}. Examiner question: "${question}"

STUDENT'S SPOKEN ANSWER (transcribed, ${words} words, ${durationSec}s):
${transcript || "(no speech detected)"}

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
