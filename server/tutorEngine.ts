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
  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a certified IELTS Writing examiner AND a supportive tutor for Indonesian students. Score strictly against the official IELTS band descriptors for the four criteria (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy). Bands are 0–9 in 0.5 steps; overall is the average rounded to the nearest 0.5.

Your goal is to help the student IMPROVE, not just grade. Be specific and kind. Explanations may use simple Indonesian where helpful, but corrections/model answer stay in English. Output valid JSON only.`,
      },
      {
        role: "user",
        content: `IELTS Writing ${taskType === "task1" ? "Task 1" : "Task 2"}.

TASK PROMPT:
${prompt}

STUDENT'S ANSWER (${wordCount} words):
${essay}

Return ONLY this JSON:
{
  "overallBand": 6.5,
  "criteria": {
    "taskResponse": { "band": 6.5, "comment": "1-2 sentences" },
    "coherenceCohesion": { "band": 6, "comment": "..." },
    "lexicalResource": { "band": 6.5, "comment": "..." },
    "grammaticalRange": { "band": 6, "comment": "..." }
  },
  "corrections": [
    { "original": "exact phrase from their text", "fix": "corrected version", "explanation": "why (the rule), one line", "type": "grammar|vocabulary|cohesion|task|spelling" }
  ],
  "modelAnswer": "A full rewrite of THEIR essay at ~band 8, keeping their ideas but upgrading structure, cohesion, vocabulary and grammar.",
  "strengths": ["2-3 genuine strengths"],
  "improvements": ["3-5 prioritized, concrete next steps — most impactful first"],
  "drills": [ { "focus": "their weakest criterion", "instruction": "a short targeted exercise they can do now" } ]
}
Provide 6-12 of the most useful corrections.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const p = parseJsonLoose(llmText(res));
  const c = p.criteria || {};
  return {
    overallBand: clampBand(p.overallBand),
    criteria: {
      taskResponse: crit(c.taskResponse),
      coherenceCohesion: crit(c.coherenceCohesion),
      lexicalResource: crit(c.lexicalResource),
      grammaticalRange: crit(c.grammaticalRange),
    },
    corrections: (Array.isArray(p.corrections) ? p.corrections : []).slice(0, 20).map((x: any) => ({
      original: String(x?.original || ""), fix: String(x?.fix || ""),
      explanation: String(x?.explanation || ""), type: String(x?.type || "grammar"),
    })).filter((x: any) => x.original || x.fix),
    modelAnswer: String(p.modelAnswer || ""),
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
  "modelAnswer": "A band-8 example answer to the SAME question.",
  "upgradedAnswer": "THEIR answer rewritten at a higher band, keeping their content but improving fluency, vocab and grammar.",
  "improvements": ["3-5 prioritized next steps"],
  "tips": ["2-4 concrete fluency/pronunciation tips for an Indonesian speaker"]
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const p = parseJsonLoose(llmText(res));
  const c = p.criteria || {};
  const o = p.observations || {};
  return {
    overallBand: clampBand(p.overallBand),
    criteria: {
      fluencyCoherence: crit(c.fluencyCoherence),
      lexicalResource: crit(c.lexicalResource),
      grammaticalRange: crit(c.grammaticalRange),
      pronunciation: crit(c.pronunciation),
    },
    observations: {
      fillerWords: strArr(o.fillerWords),
      repetitions: strArr(o.repetitions),
      grammarErrors: (Array.isArray(o.grammarErrors) ? o.grammarErrors : []).slice(0, 12).map((g: any) => ({ error: String(g?.error || ""), fix: String(g?.fix || "") })),
      speakingRateWpm: wpm,
    },
    corrections: (Array.isArray(p.corrections) ? p.corrections : []).slice(0, 15).map((x: any) => ({ original: String(x?.original || ""), fix: String(x?.fix || ""), explanation: String(x?.explanation || "") })),
    modelAnswer: String(p.modelAnswer || ""),
    upgradedAnswer: String(p.upgradedAnswer || ""),
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
