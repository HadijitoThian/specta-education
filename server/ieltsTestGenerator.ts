/**
 * Full IELTS Academic test generator.
 *
 * Generates ALL content for one test in one run:
 *   - 4 Listening sections (transcript + audio via ElevenLabs + 40 questions)
 *   - 3 Reading passages (body + 40 questions)
 *   - 2 Writing tasks (prompts + FLUX-generated chart image for T1 Academic)
 *   - 3 Speaking parts (~18 prompts total)
 *
 * Idempotent: if a test with the given code already exists, returns its id
 * and does NOTHING. So it's safe to retrigger.
 *
 * Uses DeepSeek for all text content, ElevenLabs for Listening audio,
 * DeepInfra FLUX for Writing Task 1 chart. Total time: ~3-5 minutes.
 * Total cost: ~$0.20 per test (LLM tokens + TTS + 1 image).
 */

import { and, eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { synthesize as ttsSynthesize, LISTENING_VOICE_MAP } from "./_core/elevenlabs";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import {
  ieltsMockTests,
  ieltsListeningSections,
  ieltsListeningQuestions,
  ieltsReadingPassages,
  ieltsReadingQuestions,
  ieltsWritingTasks,
  ieltsSpeakingPrompts,
} from "../drizzle/schema";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// LLM helpers — each one produces strict JSON for one logical unit
// ---------------------------------------------------------------------------

// Coerce an LLM-produced question type into a value the DB enum accepts, so a
// stray "multiple_choice"/"table_completion" never throws an enum error
// mid-insert (which previously left half-built tests).
const LISTENING_TYPES = new Set([
  "mcq", "multi_select", "matching", "map_labelling", "form_completion",
  "note_completion", "sentence_completion", "summary_completion", "short_answer",
]);
const READING_TYPES = new Set([
  "tfng", "ynng", "mcq", "matching_headings", "matching_information",
  "matching_features", "matching_sentence_endings", "sentence_completion",
  "summary_completion", "note_completion", "table_completion",
  "flowchart_completion", "diagram_labelling", "short_answer",
]);

function normalizeQuestionType(raw: string, kind: "listening" | "reading"): string {
  const t = (raw ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  const valid = kind === "listening" ? LISTENING_TYPES : READING_TYPES;
  if (valid.has(t)) return t;
  const synonyms: Record<string, string> = {
    multiple_choice: "mcq",
    multiplechoice: "mcq",
    choice: "mcq",
    multi_answer: "multi_select",
    multiple_answer: "multi_select",
    map_labeling: "map_labelling",
    plan_labelling: "map_labelling",
    plan_labeling: "map_labelling",
    diagram_labeling: kind === "reading" ? "diagram_labelling" : "map_labelling",
    diagram_labelling: kind === "reading" ? "diagram_labelling" : "map_labelling",
    form: "form_completion",
    forms_completion: "form_completion",
    notes_completion: "note_completion",
    table_completion: kind === "reading" ? "table_completion" : "note_completion",
    flow_chart_completion: kind === "reading" ? "flowchart_completion" : "note_completion",
    flowchart_completion: kind === "reading" ? "flowchart_completion" : "note_completion",
    sentence: "sentence_completion",
    summary: "summary_completion",
    short_answer_question: "short_answer",
    true_false_not_given: "tfng",
    yes_no_not_given: "ynng",
    matching: kind === "reading" ? "matching_information" : "matching",
    matching_people: "matching",
    matching_paragraphs: "matching_information",
  };
  if (synonyms[t] && valid.has(synonyms[t])) return synonyms[t];
  // Reasonable last-resort defaults.
  return kind === "listening" ? "short_answer" : "short_answer";
}

/** Delete a test and all of its child rows by code. Safe no-op if absent. */
async function deleteTestByCode(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  code: string
): Promise<void> {
  const [t] = await db
    .select({ id: ieltsMockTests.id })
    .from(ieltsMockTests)
    .where(eq(ieltsMockTests.code, code))
    .limit(1);
  if (!t) return;
  const sections = await db
    .select({ id: ieltsListeningSections.id })
    .from(ieltsListeningSections)
    .where(eq(ieltsListeningSections.testId, t.id));
  for (const s of sections) {
    await db
      .delete(ieltsListeningQuestions)
      .where(eq(ieltsListeningQuestions.sectionId, s.id));
  }
  await db
    .delete(ieltsListeningSections)
    .where(eq(ieltsListeningSections.testId, t.id));
  const passages = await db
    .select({ id: ieltsReadingPassages.id })
    .from(ieltsReadingPassages)
    .where(eq(ieltsReadingPassages.testId, t.id));
  for (const p of passages) {
    await db
      .delete(ieltsReadingQuestions)
      .where(eq(ieltsReadingQuestions.passageId, p.id));
  }
  await db
    .delete(ieltsReadingPassages)
    .where(eq(ieltsReadingPassages.testId, t.id));
  await db.delete(ieltsWritingTasks).where(eq(ieltsWritingTasks.testId, t.id));
  await db
    .delete(ieltsSpeakingPrompts)
    .where(eq(ieltsSpeakingPrompts.testId, t.id));
  await db.delete(ieltsMockTests).where(eq(ieltsMockTests.id, t.id));
}

async function llmJson<T>(system: string, user: string, maxTokens = 4000): Promise<T> {
  const res = await invokeLLM({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
  });
  const raw = res.choices?.[0]?.message?.content;
  if (typeof raw !== "string") throw new Error("LLM returned no content");
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 300)}`);
  }
}

type ListeningSectionDraft = {
  transcript: string;
  durationSec: number;
  /** Short noun phrase for the narrator's "You will hear …" intro. */
  audioIntro?: string;
  /** The last question number covered BEFORE the [[SPLIT]] (the first batch).
   *  The narrator announces exactly this boundary so it matches the audio. */
  firstBatchEnd?: number;
  /** Section 1 only — a short worked example played before the test begins. */
  example?: { lines: string; answer: string } | null;
  questions: Array<{
    questionNumber: number;
    questionType: string;
    prompt: string;
    options: string[] | null;
    correctAnswers: string[];
  }>;
};

const SECTION_BLUEPRINTS = [
  {
    sectionNumber: 1,
    difficulty:
      "EASIEST (band 4-5.5 entry). Everyday vocabulary. Answers are stated clearly and directly. Use AT MOST ONE gentle distractor in the whole section (e.g., the customer gives a date then says a different one — 'the 15th, no sorry, the 16th'). Speech is at a relaxed, clear pace.",
    theme:
      "A telephone conversation. Speaker labels: 'CUSTOMER:' (the person calling) and 'AGENT:' (the service-side speaker). The agent collects booking/enquiry information from the customer. Choose ONE coherent scenario: booking a holiday cottage, registering for a community course, opening a bank account, hiring a tour bus. CRITICAL: end the conversation cleanly when the form is complete — e.g., the agent confirms a reference number and the customer says 'Thanks, bye'. ABSOLUTELY DO NOT include a summary, recap, or list of what was just said.",
    questionTypes:
      "Questions are form_completion ONLY (10 questions). Format the prompt for each question as a single line of a form like: 'Name: ......(1)......' or 'Departure date: ......(3)......'. Each correctAnswer is a short literal phrase from the transcript (1-3 words: a name, a number, a date, a place). No MCQ, no matching, no summary, no list.",
  },
  {
    sectionNumber: 2,
    difficulty:
      "EASY-MEDIUM (band 5-6.5). Slightly richer vocabulary. Include 2 distractors across the section — e.g., the speaker gives a time then corrects it, or lists several facilities but only one matches the question. The question wording should PARAPHRASE the audio (not use the exact same words).",
    theme:
      "A monologue by a MALE speaker. Use a male first name from this set: DAVID, MARK, JAMES, TOM, MIKE, PAUL, GEORGE, OLIVER, HENRY, WILLIAM. Speaker label format MUST be like 'DAVID:' or 'GUIDE:' (and the speaker introduces himself naturally — 'Hello everyone, I'm David and I'll be your guide today'). Single coherent topic: a welcome talk at a wildlife sanctuary, a radio show about a local event, a tour intro at a museum. CRITICAL: end with one complete sentence (e.g., 'I hope you enjoy your visit.'). Never trail off mid-sentence. CRITICAL: the speaker is MALE, so any self-introduction or name reference must be a male name.",
    questionTypes:
      "Authentic Section 2 mix across the 10 questions: 3-4 multiple_choice + 3 matching + 3-4 note_completion. Keep each TYPE in a contiguous block (all MCQ together, then all matching together, then all notes together) in question-number order.\n  - multiple_choice: 3 plausible options each (A/B/C), real distractors mentioned in the talk.\n  - matching: a SINGLE shared option list of 4-5 items (e.g. 'A. the cafe', 'B. the gift shop', 'C. the main hall', 'D. the garden', 'E. the library') repeated as the options on EACH of the 3 matching questions; each question names a thing/person and asks which option it matches. correctAnswers are single letters, SHUFFLED (never A,B,C in order) and options MAY repeat. Do NOT use map_labelling (no on-screen map).\n  - note_completion: use '[GROUP: <header>]' on its own line at the first question of each group, then bullet lines with '..........' blanks. 2-3 group headers. The first note question's prompt also carries the [LIMIT: ...] tag.\nEach question tests a UNIQUE fact — no two questions may share an opening phrase.",
  },
  {
    sectionNumber: 3,
    difficulty:
      "MEDIUM-HARD (band 6-7.5). Academic vocabulary and abstract opinions. Include 3+ distractors: speakers disagree and change their minds ('I thought it was the sample size, but actually it's the methodology'), one speaker proposes an idea another rejects, and the questions PARAPHRASE heavily (the answer is never the exact words spoken). The MCQ distractor options should all be plausible things mentioned in the audio.",
    theme:
      "An academic discussion between 3 named participants: ONE MALE student, ONE FEMALE student, and ONE tutor (any gender). MUST USE these specific labels: 'TOM:' for the MALE student, 'MAYA:' for the FEMALE student, and 'DR.WATSON:' for the tutor. Do not deviate from these names or labels. They discuss a research project, essay, or assignment with disagreement and viewpoints. Each student has a distinct opinion and the tutor mediates.",
    questionTypes:
      "5 multiple_choice questions (questions 21-25) + 5 sentence_completion questions (questions 26-30).\n  MCQ format (21-25): each MCQ prompt may reference a speaker for a clear hook, e.g., 'What does MAYA think about the methodology?' or 'According to DR. WATSON, the main issue with the studies is...'. Provide exactly 3 options (A, B, C) that are all plausible things mentioned in the audio.\n  Sentence completion format (26-30): these are gap-fill sentences ABOUT THE CONTENT of the discussion — NOT 'who said it' matching. Instruction style: 'Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.' Each prompt is a single sentence summarising a point from the discussion with ONE '..........' blank, where the missing word(s) are a key term actually spoken (paraphrase the surrounding sentence so the answer isn't given away). Example: 'The team agreed that the biggest limitation was the small .......... .' Each stem must be UNIQUE — never reuse an opening phrase. Do NOT use speaker names as answer options anywhere in questions 26-30.",
  },
  {
    sectionNumber: 4,
    difficulty:
      "HARDEST (band 6.5-8.5). Dense academic monologue with sophisticated vocabulary and complex sentence structures. The answers are NEVER stated word-for-word — the student must understand a paraphrased idea and extract the key term. Include subtle qualifications ('while early studies suggested X, more recent work points to Y'). Fast, information-rich delivery. This section separates strong candidates from average ones.",
    theme:
      "An academic lecture by a named professor (e.g., 'PROF.MILLER:' or 'DR.CHEN:'). Single speaker. Pick ONE specific research topic. Structure the lecture into 3-4 CLEARLY DISTINCT subsections, each with its own focus and content. End with one complete sentence. Never repeat the same phrase to introduce different subsections.",
    questionTypes:
      "10 note_completion questions presented as a UNIFIED set of student notes. CRITICAL FORMAT: each prompt MUST be in this exact form:\n  - First question under a NEW group: '[GROUP: <header text>]\\n- <bullet line with fill-in blank using ..........>'\n  - Subsequent questions under the same group: '- <bullet line with fill-in blank using ..........>'\n  Example sequence:\n    Q31 prompt: '[GROUP: Definitions and scope]\\n- Small-scale fisheries: vessels under .......... metres'\n    Q32 prompt: '- Worldwide, around .......... million people directly depend'\n    Q33 prompt: '[GROUP: Main challenges]\\n- Industrial fishing fleets compete for ..........'\n    Q34 prompt: '- Climate change reduces ..........'\n  Use 3-4 distinct GROUP headers across the 10 questions. Each question stem must be UNIQUE — never use the same opening phrase twice.",
  },
];

/**
 * Validate a generated Listening section against real-IELTS constraints.
 * Returns an array of issue strings. Empty array = pass.
 */
function validateListeningSection(
  section: ListeningSectionDraft,
  sectionNumber: 1 | 2 | 3 | 4
): string[] {
  const issues: string[] = [];

  // 1. Exact question count.
  if (section.questions.length !== 10) {
    issues.push(
      `Expected exactly 10 questions, got ${section.questions.length}`
    );
  }

  // 2. No matching answers in sequential alphabetical/roman order.
  const matchingQs = section.questions.filter(q =>
    ["matching", "map_labelling"].includes(q.questionType)
  );
  if (matchingQs.length >= 4) {
    const letters = matchingQs
      .map(q => (q.correctAnswers[0] ?? "").trim().toUpperCase())
      .filter(s => s.length >= 1);
    // Check for strictly sequential ASCII order (A,B,C,D,... or letter pairs).
    const allSingleLetter = letters.every(l => /^[A-Z]$/.test(l));
    if (allSingleLetter && letters.length >= 4) {
      let isSequential = true;
      for (let i = 1; i < letters.length; i++) {
        if (letters[i].charCodeAt(0) !== letters[i - 1].charCodeAt(0) + 1) {
          isSequential = false;
          break;
        }
      }
      if (isSequential) {
        issues.push(
          `Matching answers are in sequential order (${letters.join(",")}) — must be shuffled`
        );
      }
    }
  }

  // 3. No two questions share the first 6 words of their prompt
  //    (excluding the section header).
  const stems = section.questions.map(q =>
    q.prompt
      .replace(/\(\d+\)/g, "")
      .replace(/\.{2,}/g, "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .slice(0, 6)
      .join(" ")
  );
  const stemCounts: Record<string, number> = {};
  for (const s of stems) {
    if (s.length < 10) continue; // skip very short prompts (just headers)
    stemCounts[s] = (stemCounts[s] ?? 0) + 1;
  }
  for (const [stem, count] of Object.entries(stemCounts)) {
    if (count >= 2) {
      issues.push(
        `${count} questions share opening "${stem.slice(0, 40)}…" — must be unique`
      );
    }
  }

  // 4. Transcript ends with a proper sentence-final punctuation.
  const trimmed = section.transcript.trim();
  const lastChar = trimmed.slice(-1);
  if (!['"', "'", ".", "!", "?", "”", ")"].includes(lastChar)) {
    issues.push(
      `Transcript doesn't end with sentence-final punctuation. Tail: "…${trimmed.slice(-40)}"`
    );
  }

  // 5. Section 1: must be predominantly form_completion.
  if (sectionNumber === 1) {
    const formCount = section.questions.filter(
      q => q.questionType === "form_completion"
    ).length;
    if (formCount < 8) {
      issues.push(
        `Section 1 should be predominantly form_completion (≥8); got ${formCount}`
      );
    }
  }

  // 6. Section 1 must not contain a summary section.
  if (sectionNumber === 1) {
    const lower = trimmed.toLowerCase();
    if (/\b(to summari[sz]e|let me summar|in summary|so to recap)\b/.test(lower)) {
      issues.push(`Section 1 transcript contains a forbidden summary phrase`);
    }
  }

  // 7. Section 3 must use MCQ (21-25) + sentence_completion (26-30) — NOT
  //    speaker-matching ("who said it"), which felt inauthentic.
  if (sectionNumber === 3) {
    const matchingS3 = section.questions.filter(
      q => q.questionType === "matching"
    ).length;
    if (matchingS3 > 0) {
      issues.push(
        `Section 3 must not use speaker-matching questions — use sentence_completion for questions 26-30`
      );
    }
    const scS3 = section.questions.filter(
      q => q.questionType === "sentence_completion"
    ).length;
    if (scS3 < 4) {
      issues.push(
        `Section 3 should include ~5 sentence_completion questions (26-30); got ${scS3}`
      );
    }
  }

  // 8. Completion answers MUST appear verbatim in the transcript (a listener
  //    must be able to hear the exact word). This catches the "answers aren't
  //    in the audio" problem (esp. Section 3).
  const normTranscript = section.transcript
    .toLowerCase()
    .replace(/[-–—_/]/g, " ")
    .replace(/[.,;:!?'"“”‘’()[\]{}]/g, "")
    .replace(/\s+/g, " ");
  const completionTypes = new Set([
    "form_completion",
    "note_completion",
    "sentence_completion",
    "summary_completion",
    "short_answer",
  ]);
  let missingInTranscript = 0;
  for (const q of section.questions) {
    if (!completionTypes.has(q.questionType)) continue;
    const found = (q.correctAnswers ?? []).some(ans => {
      const a = String(ans)
        .toLowerCase()
        .replace(/[-–—_/]/g, " ")
        .replace(/[.,;:!?'"“”‘’()[\]{}]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!a) return false;
      return (
        normTranscript.includes(a) ||
        normTranscript.replace(/\s+/g, "").includes(a.replace(/\s+/g, ""))
      );
    });
    if (!found) missingInTranscript++;
  }
  if (missingInTranscript > 2) {
    issues.push(
      `${missingInTranscript} completion answer(s) do not appear in the transcript — every gap answer must be a word actually spoken in the audio`
    );
  }

  // 9. Split alignment: firstBatchEnd must be within the section's range.
  if (sectionNumber !== 4 && section.firstBatchEnd != null) {
    const lo = (sectionNumber - 1) * 10 + 1;
    const hi = lo + 9;
    if (section.firstBatchEnd < lo + 2 || section.firstBatchEnd > hi - 2) {
      issues.push(
        `firstBatchEnd (${section.firstBatchEnd}) should be between ${lo + 2} and ${hi - 2}`
      );
    }
  }

  return issues;
}

async function generateListeningSection(
  sectionNumber: 1 | 2 | 3 | 4,
  startingQuestionNumber: number,
  attempt = 1
): Promise<ListeningSectionDraft> {
  const blueprint = SECTION_BLUEPRINTS.find(b => b.sectionNumber === sectionNumber)!;
  const needsSplit = sectionNumber !== 4; // Section 4 plays straight through.

  const splitFieldNote = needsSplit
    ? `Insert ONE line containing exactly [[SPLIT]] at the natural midpoint between the first half of questions (${startingQuestionNumber}-${startingQuestionNumber + 4}) and the second half (${startingQuestionNumber + 5}-${startingQuestionNumber + 9}).`
    : `Do NOT include any [[SPLIT]] marker — this section is played straight through.`;

  const system = `You are writing IELTS Listening test content matching the OFFICIAL international IELTS standard.

=== DIFFICULTY FOR THIS SECTION (Section ${sectionNumber}) ===
${blueprint.difficulty}

Real IELTS gets progressively harder from Section 1 (easiest) to Section 4 (hardest). Respect the tier above exactly. The single most important quality marker: real IELTS uses AUDIO DISTRACTORS — the speaker mentions a wrong option before the right one, corrects themselves, or the question paraphrases the audio so the answer isn't the literal words spoken. Build these in per the tier above.


Return JSON ONLY with this exact shape:
{
  "audioIntro": "A short noun phrase the narrator reads after 'You will hear', describing the recording — e.g. 'a conversation between a student and an accommodation officer about renting a room' or 'a talk given to new museum volunteers'. No speaker labels, no quotes, no trailing full stop.",
  "example": ${sectionNumber === 1 ? `{ "lines": "A SHORT 2-3 line standalone example exchange WITH speaker labels that demonstrates how an answer is given (do NOT reuse any of the 10 real answers)", "answer": "the example answer, 1-3 words" }` : "null"},${needsSplit ? `\n  "firstBatchEnd": "The LAST question number covered BEFORE the [[SPLIT]] — an integer between ${startingQuestionNumber + 2} and ${startingQuestionNumber + 7}. The audio before [[SPLIT]] must answer questions ${startingQuestionNumber} through this number; the audio after answers the rest. The narrator announces EXACTLY this boundary, so it MUST match where you place [[SPLIT]].",` : ""}
  "transcript": "Full transcript with speaker labels like 'AGENT:' or 'GUIDE:' on each line. ~600-900 words. Natural conversational/lecture rhythm with realistic interjections (mm, right, I see). Include numbers, dates, names, places that match the questions. ${splitFieldNote} Do NOT write any spoken instructions, reading-time cues, or 'now look at questions…' lines — the system adds all narrator instructions automatically.",
  "durationSec": number,
  "questions": [
    {
      "questionNumber": number,
      "questionType": "form_completion" | "note_completion" | "sentence_completion" | "summary_completion" | "short_answer" | "mcq" | "matching",
      "prompt": "The full question text the student sees. For form/note completion, include the fill-in line like 'Name: ......(1)......'.",
      "options": null | ["A. ...", "B. ...", "C. ..."],
      "correctAnswers": ["accepted variant 1", "accepted variant 2 (e.g. lowercase)"]
    }
  ]
}

Rules:
- Exactly 10 questions per section.
- Question numbers start at ${startingQuestionNumber} and go up by 1.${needsSplit ? `\n- SPLIT ALIGNMENT (critical): the questions answered in the FIRST half of the audio (before [[SPLIT]]) must be EXACTLY questions ${startingQuestionNumber} to firstBatchEnd, IN ORDER. Place [[SPLIT]] right after the audio content that answers question firstBatchEnd. Questions must be answered in the audio in the SAME ORDER as their numbers. Set firstBatchEnd to match.` : ""}
- ANSWERS MUST BE HEARD: for every completion / short_answer question, the exact word(s) in correctAnswers MUST appear VERBATIM in the transcript (the listener must be able to write down what they hear). You may paraphrase the QUESTION wording, but NEVER the answer word itself.
- NUMBER/NAME CLARITY (so TTS reads them slowly and clearly): write phone numbers, postcodes, reference codes and spelled-out names digit-by-digit / letter-by-letter separated by commas, e.g. a phone number as "oh, two, oh, seven — double four, nine, one, three", a postcode as "B, N, one — three, X, F", a surname as "that's S, M, I, T, H". Never write a long number as one run-on token.
- WORD LIMITS (real IELTS): every completion / short-answer question must obey a stated word limit. For the FIRST completion question of each contiguous completion block, PREFIX its prompt with a limit tag on its own line: '[LIMIT: NO MORE THAN TWO WORDS AND/OR A NUMBER]' (or 'ONE WORD AND/OR A NUMBER' / 'NO MORE THAN THREE WORDS' as appropriate). Every correctAnswer in that block MUST obey that limit. Keep completion answers short (1-3 words).
- For mcq: provide exactly 3 plain-text options like "A. Something", "B. Something", "C. Something". All 3 must be plausible (real distractors). The audio MUST clearly support the correct option. correctAnswers is the single letter, e.g. ["A"].
- For matching: provide a shared option list (e.g. ["A. ...","B. ...","C. ...","D. ...","E. ..."]) repeated on each matching question; correctAnswers is the single letter. Answers MUST be shuffled (not A,B,C,D…) and may repeat options.
- Match the section blueprint exactly.${needsSplit ? "\n- The transcript MUST contain exactly ONE line that is just [[SPLIT]] (nothing else on that line), at the firstBatchEnd boundary described above." : "\n- Do NOT include a [[SPLIT]] marker."} Do NOT write any "now look at questions…" cues or other spoken instructions — the narrator instructions are added by the system.
- "audioIntro" is REQUIRED.${needsSplit ? ' "firstBatchEnd" is REQUIRED.' : ""} ${sectionNumber === 1 ? '"example" is REQUIRED for Section 1: a short standalone exchange whose answer is NOT one of the 10 real answers.' : '"example" must be null for this section.'}`;

  const user = `Section ${sectionNumber} blueprint:
${blueprint.theme}

Question types for this section:
${blueprint.questionTypes}

Generate the section now. JSON only.`;

  const draft = await llmJson<ListeningSectionDraft>(system, user, 4000);

  // Validate. If it fails, retry up to 3 times with explicit feedback.
  const issues = validateListeningSection(draft, sectionNumber);
  if (issues.length === 0) return draft;

  if (attempt >= 3) {
    console.warn(
      `[IELTS Gen] Section ${sectionNumber} still has issues after ${attempt} attempts; accepting anyway:`,
      issues
    );
    return draft;
  }

  console.warn(
    `[IELTS Gen] Section ${sectionNumber} attempt ${attempt} failed validation. Retrying with feedback:`,
    issues
  );

  // Recursive retry with the failures fed back into the prompt.
  const feedbackSystem = `${system}

PREVIOUS ATTEMPT FAILED these validation checks — fix ALL of them this time:
${issues.map(i => `- ${i}`).join("\n")}

These rules are NON-NEGOTIABLE. Do not produce another draft that violates them.`;

  // Reuse user prompt; new system carries the feedback.
  const draftRetry = await llmJson<ListeningSectionDraft>(
    feedbackSystem,
    user,
    4000
  );
  const retryIssues = validateListeningSection(draftRetry, sectionNumber);
  if (retryIssues.length === 0) return draftRetry;

  // Try one more time recursively if attempts remain.
  return generateListeningSection(
    sectionNumber,
    startingQuestionNumber,
    attempt + 1
  );
}

type ReadingPassageDraft = {
  title: string;
  body: string;
  wordCount: number;
  questions: Array<{
    questionNumber: number;
    questionType: string;
    prompt: string;
    options: string[] | null;
    correctAnswers: string[];
  }>;
};

const READING_BLUEPRINTS = [
  {
    passageNumber: 1,
    topic:
      "Popular science / nature article. Choose a topic like soil microbiology, deep-sea hydrothermal vents, the cognitive abilities of octopuses, or how plants communicate underground. ~850-950 words. Accessible language but with subject-specific vocabulary.",
    questionMix:
      "Question types: TRUE / FALSE / NOT GIVEN (5-6 questions), sentence_completion (3-4, NO MORE THAN TWO WORDS), short_answer (2-3).",
  },
  {
    passageNumber: 2,
    topic:
      "Social science / education / psychology feature. Choose a topic like why we forget what we read, the economics of remote work, the history of public libraries, or the cognitive science of bilingualism. ~950-1100 words. More dense, with researchers' names and named studies.",
    questionMix:
      "Question types: matching_headings (5 questions — provide 7 candidate headings i, ii, iii, iv, v, vi, vii, then match them to 5 paragraphs A-E. CRITICAL: the correct headings MUST NOT be in sequential order (i, ii, iii, iv, v) — shuffle them randomly so the correct answer pattern looks something like iv, ii, vi, i, v or similar. Repeat: NEVER use sequential ordering for correct answers.), yes/no/not_given (4 questions about the writer's views — mix YES, NO, and NOT GIVEN; don't make them all the same), short_answer (4 questions).",
  },
  {
    passageNumber: 3,
    topic:
      "Development economics / policy / public health analysis. Choose a topic like clean cookstoves in rural India, vaccine cold chains in sub-Saharan Africa, climate adaptation in coastal Bangladesh, or microfinance impact studies. ~1000-1100 words. More argumentative, multiple researcher positions.",
    questionMix:
      "Question types: matching_features (5 questions — match researchers A-F to findings 27-31. CRITICAL: shuffle the correct answer letters — DO NOT make the answers go A, B, C, D, E in order. A real example pattern would be C, E, A, F, B.), summary_completion (5 questions, complete the summary using words from a word list of 10 candidates), mcq (3 questions about author's main argument).",
  },
];

async function generateReadingPassage(
  passageNumber: 1 | 2 | 3,
  startingQuestionNumber: number
): Promise<ReadingPassageDraft> {
  const blueprint = READING_BLUEPRINTS.find(b => b.passageNumber === passageNumber)!;

  const system = `You are writing IELTS Academic Reading test content. The passage must match the official IELTS Academic Reading register: editorial / Nature / Economist style. Question difficulty targets bands 6.5 - 8.

Return JSON ONLY:
{
  "title": "Short evocative title",
  "body": "Full passage body. Use plain paragraphs separated by blank lines. ~900-1100 words.",
  "wordCount": number,
  "questions": [
    {
      "questionNumber": number,
      "questionType": "tfng" | "ynng" | "mcq" | "matching_headings" | "matching_information" | "matching_features" | "matching_sentence_endings" | "sentence_completion" | "summary_completion" | "note_completion" | "short_answer",
      "prompt": "The full question text. For matching: include the statement to be matched. For summary_completion: give the surrounding sentence with a blank.",
      "options": null | ["A. ...", "B. ..."] (for mcq, matching_headings, matching_features, matching_sentence_endings, summary_completion word list),
      "correctAnswers": ["primary answer", "lowercase variant"]
    }
  ]
}

Rules:
- Question numbers start at ${startingQuestionNumber} and go up by 1.
- For TFNG: correctAnswers is ["TRUE"] or ["FALSE"] or ["NOT GIVEN"].
- For YNNG: correctAnswers is ["YES"] or ["NO"] or ["NOT GIVEN"].
- For matching: correctAnswer is a single letter like ["A"].
- matching_features (match a statement to a person/researcher): the passage MUST name the people (e.g. Dr Helena Marsh, Professor Adeyemi…). EVERY matching_features question must carry the SAME full options list of those named people, formatted ["A. Dr Helena Marsh", "B. Professor Adeyemi", … up to F]. The question's "prompt" is a paraphrased CLAIM/STATEMENT (not a verbatim quote) that exactly one of them made; correctAnswers is that person's letter. Provide MORE people than questions (e.g. 6 people A–F for 5 questions) so some are not used, and the same person may be the answer to more than one. Shuffle the answer letters.
- Body must support every correct answer — be precise.
- Avoid copyright issues — write original prose, do not paraphrase a specific published work.
- CRITICAL — Anti-pattern detection: for ANY matching-style question (matching_headings, matching_features, matching_information, matching_sentence_endings), the correct answer letters/roman numerals MUST be in random order. A student must NOT be able to guess by clicking i, ii, iii, iv, v or A, B, C, D, E sequentially. Shuffle deliberately. Failure to shuffle is a test-killer.
- For T/F/NG and Y/N/NG questions: mix the answers — don't make them all TRUE or all NOT GIVEN. A natural mix is roughly 1/3, 1/3, 1/3.`;

  const user = `Passage ${passageNumber} topic:
${blueprint.topic}

Question mix:
${blueprint.questionMix}

Generate the passage and all questions now. JSON only.`;

  return llmJson<ReadingPassageDraft>(system, user, 6000);
}

type WritingChart = {
  type: "bar" | "line" | "pie";
  title: string;
  xLabels: string[];
  yAxisLabel?: string;
  series: Array<{ label: string; data: number[] }>;
};

type WritingDraft = {
  task1: {
    prompt: string;
    chart: WritingChart;
  };
  task2: {
    prompt: string;
  };
};

async function generateWritingTasks(): Promise<WritingDraft> {
  const system = `You are writing IELTS Academic Writing test prompts. Match the official IELTS register exactly.

Return JSON ONLY:
{
  "task1": {
    "prompt": "Full Task 1 prompt. Open with a sentence describing the visual, e.g. 'The chart below shows the percentage of households with internet access in four countries between 2010 and 2020.' Then a new line, then EXACTLY: 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.' Then a new line, then: 'Write at least 150 words.' The prompt must accurately describe the data in the chart object below.",
    "chart": {
      "type": "bar | line | pie",
      "title": "Chart title shown above the chart",
      "xLabels": ["category or time labels, e.g. \\"2010\\",\\"2015\\",\\"2020\\""],
      "yAxisLabel": "what the y-axis measures, e.g. \\"Percentage (%)\\" (omit for pie)",
      "series": [ { "label": "series name (e.g. a country)", "data": [12, 34, 62] } ]
    }
  },
  "task2": {
    "prompt": "Full Task 2 prompt. A discursive essay question (discuss-both-views, advantages/disadvantages, agree/disagree, or two-part). End with: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.'"
  }
}

Rules:
- The chart data MUST be concrete real-looking numbers. For bar/line: every series.data array length MUST equal xLabels length. For pie: ONE series whose data length equals xLabels length and values sum to ~100.
- 2-4 series for bar/line; clear, comparable, realistic values.
- The Task 1 prompt's opening sentence MUST match the chart (same metric, units, categories, time period).
- Task 2 should be a meaty topic with multiple legitimate viewpoints, suitable for band 7+ responses.
- Indonesia-relevant scenarios for Task 1 are great (e.g., smartphone usage by age group in Indonesia).`;

  const user = `Generate one Academic Task 1 + Task 2 pair now. JSON only.`;

  return llmJson<WritingDraft>(system, user, 1800);
}

type SpeakingDraft = {
  parts: Array<{
    partNumber: 1 | 2 | 3;
    prompts: Array<{
      promptOrder: number;
      prompt: string;
      cueCardText?: string;
    }>;
  }>;
};

async function generateSpeakingPrompts(): Promise<SpeakingDraft> {
  const system = `You are writing IELTS Speaking test prompts for a live AI examiner ("Emma").

Return JSON ONLY:
{
  "parts": [
    {
      "partNumber": 1,
      "prompts": [
        { "promptOrder": 1, "prompt": "Examiner's question, conversational and natural." }
        // 8-10 questions across 2 topic sets
      ]
    },
    {
      "partNumber": 2,
      "prompts": [
        {
          "promptOrder": 1,
          "prompt": "The examiner introduces the cue card and tells the student they have 1 minute to prepare and 1-2 minutes to speak. Example: 'Now I'd like you to talk about a topic. You have one minute to prepare. Please describe…'",
          "cueCardText": "The full cue card text with 'You should say:' bullet points and 'and explain why…'"
        }
      ]
    },
    {
      "partNumber": 3,
      "prompts": [
        { "promptOrder": 1, "prompt": "Abstract discussion question related to the Part 2 topic." }
        // 5-7 questions
      ]
    }
  ]
}

Rules:
- Part 1 topics should be familiar/everyday (work/study, hometown, hobbies, food, technology, weather).
- Group Part 1 prompts into 2 topic sets (4-5 questions each).
- Part 2 cue card should be specific and concrete (a person, place, event, object, experience).
- Part 3 questions should be abstract, comparative, hypothetical — band 7+ probing.
- Speaker voice in prompts should sound natural, warm, and professional.
- Examiner always speaks in English.`;

  const user = `Generate the Speaking content now. JSON only.`;

  return llmJson<SpeakingDraft>(system, user, 2500);
}

// ---------------------------------------------------------------------------
// Audio + image generation
// ---------------------------------------------------------------------------

/** Choose voice for a section. Real IELTS rotates accents per section. */
function voiceForSection(section: 1 | 2 | 3 | 4): string {
  switch (section) {
    case 1:
      return LISTENING_VOICE_MAP.section1.primary;
    case 2:
      return LISTENING_VOICE_MAP.section2.primary;
    case 3:
      return LISTENING_VOICE_MAP.section3.primary;
    case 4:
      return LISTENING_VOICE_MAP.section4.primary;
  }
}

type Segment = { speaker: string; text: string };

/** Parse a transcript with SPEAKER: lines into ordered segments, grouping
 *  consecutive lines from the same speaker so we minimise TTS calls. */
function parseTranscript(transcript: string): Segment[] {
  const lines = transcript.split(/\r?\n/);
  const segments: Segment[] = [];
  let current: Segment | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([A-Z][A-Z0-9 .'_-]{0,30}):\s*(.*)$/);
    if (m) {
      const speaker = m[1].trim();
      const text = m[2].trim();
      if (current && current.speaker === speaker) {
        current.text += " " + text;
      } else {
        if (current && current.text.trim()) segments.push(current);
        current = { speaker, text };
      }
    } else if (current) {
      // Continuation of previous speaker's line.
      current.text += " " + line;
    } else {
      // Pre-label narration — treat as unlabeled segment.
      segments.push({ speaker: "_NARRATOR", text: line });
    }
  }
  if (current && current.text.trim()) segments.push(current);
  return segments.filter(s => s.text.trim().length > 0);
}

// Common English first names by gender — used to pick the right voice
// when a section's speaker is labelled by personal name.
const MALE_FIRST_NAMES = new Set([
  "TOM", "TOMMY", "JAMES", "JIM", "JAMIE", "MARK", "LIAM", "DAVID", "DAVE",
  "JOHN", "MIKE", "MICHAEL", "ALEX", "ALEXANDER", "BEN", "BENJAMIN", "CHRIS",
  "CHRISTOPHER", "DAN", "DANIEL", "ETHAN", "GEORGE", "HENRY", "HARRY",
  "JACK", "JACOB", "JOE", "JOSEPH", "KEVIN", "LUKE", "MATTHEW", "MATT",
  "NICK", "NICHOLAS", "OLIVER", "OLLIE", "PAUL", "PETER", "PETE", "PHILIP",
  "PHIL", "RICHARD", "RICK", "ROBERT", "ROB", "RYAN", "SAM", "SAMUEL",
  "SIMON", "STEVE", "STEVEN", "STEPHEN", "THOMAS", "WILLIAM", "WILL",
  "WATSON", "EDWARD", "ED", "ANDREW", "ANDY", "TIM", "TIMOTHY",
]);
const FEMALE_FIRST_NAMES = new Set([
  "MAYA", "SARAH", "SARA", "LISA", "EMMA", "EMILY", "EM", "ANNA", "ANNE",
  "CHLOE", "JESSICA", "JESS", "OLIVIA", "SOPHIA", "SOPHIE", "AVA", "MIA",
  "ISABELLA", "BELLA", "CHARLOTTE", "AMELIA", "ELLA", "GRACE", "LILY",
  "HANNAH", "RACHEL", "REBECCA", "BECKY", "JENNIFER", "JENNY", "MICHELLE",
  "AMANDA", "LAURA", "KATHERINE", "KATE", "KATIE", "LUCY", "ZOE", "ZOEY",
  "PRIYA", "AMIRA", "FATIMA", "AISHA", "LILA", "NORA", "RUBY", "MOLLY",
  "POPPY", "FREYA", "EVIE", "FLORENCE", "MIRA", "AANYA", "DIYA",
]);

/** Extract the speaker's first name from a label like "DR. WATSON" or "MAYA". */
function speakerFirstName(speaker: string): string {
  const stripped = speaker
    .replace(/^DR\.?|^MR\.?|^MRS\.?|^MS\.?|^PROF\.?|^PROFESSOR/i, "")
    .trim();
  const first = stripped.split(/\s+/)[0] ?? "";
  return first.toUpperCase();
}

function detectGender(speaker: string): "male" | "female" | "unknown" {
  const first = speakerFirstName(speaker);
  if (MALE_FIRST_NAMES.has(first)) return "male";
  if (FEMALE_FIRST_NAMES.has(first)) return "female";
  return "unknown";
}

/** Decide which ElevenLabs voice each detected speaker should use. */
function buildSpeakerVoiceMap(
  sectionNumber: 1 | 2 | 3 | 4,
  uniqueSpeakers: string[]
): Map<string, string> {
  const map = new Map<string, string>();
  const fallback = voiceForSection(sectionNumber);

  if (sectionNumber === 1) {
    // 2 speakers: the service-side speaker (agent/operator/receptionist) is
    // male; the caller/customer is female. Heuristic by label keyword.
    const malePatterns = /AGENT|OPERATOR|RECEPTIONIST|HOTEL|STAFF|MANAGER|CLERK/i;
    let maleSpeaker = uniqueSpeakers.find(s => malePatterns.test(s));
    if (!maleSpeaker && uniqueSpeakers.length >= 2) maleSpeaker = uniqueSpeakers[1];
    if (!maleSpeaker && uniqueSpeakers.length === 1) maleSpeaker = uniqueSpeakers[0];
    const femaleSpeaker = uniqueSpeakers.find(s => s !== maleSpeaker) ?? uniqueSpeakers[0];
    if (maleSpeaker)
      map.set(maleSpeaker, LISTENING_VOICE_MAP.section1.secondary); // British male
    if (femaleSpeaker)
      map.set(femaleSpeaker, LISTENING_VOICE_MAP.section1.primary); // British female
  } else if (sectionNumber === 3) {
    // 3 speakers: tutor + 2 students. Assign each a DISTINCT voice from its
    // gender pool so two same-gender speakers (e.g. a male student + a male
    // tutor) never share a voice. We have 2 male and 2 female voices.
    const tutorPatterns = /TUTOR|PROFESSOR|TEACHER|DR\.?\b|MR\.?\b|MS\.?\b|MRS\.?\b|PROF\.?|LECTURER/i;
    let tutor = uniqueSpeakers.find(s => tutorPatterns.test(s));
    if (!tutor && uniqueSpeakers.length >= 1) tutor = uniqueSpeakers[uniqueSpeakers.length - 1];

    // Distinct voice pools per gender (British male + Australian male;
    // American female + British female).
    const malePool = [
      LISTENING_VOICE_MAP.section4.primary, // British male (Antoni)
      LISTENING_VOICE_MAP.section2.primary, // Australian male (Arnold)
    ];
    const femalePool = [
      LISTENING_VOICE_MAP.section3.primary, // American female (Rachel)
      LISTENING_VOICE_MAP.section1.primary, // British female (Bella)
    ];

    // Assign tutor first for a stable allocation, then the other speakers.
    const ordered = tutor
      ? [tutor, ...uniqueSpeakers.filter(s => s !== tutor)]
      : [...uniqueSpeakers];

    let maleIdx = 0;
    let femaleIdx = 0;
    for (const sp of ordered) {
      const gender = detectGender(sp);
      if (gender === "male") {
        map.set(sp, malePool[maleIdx % malePool.length]);
        maleIdx++;
      } else {
        // female or unknown → cycle the female pool for variety/distinctness
        map.set(sp, femalePool[femaleIdx % femalePool.length]);
        femaleIdx++;
      }
    }
  } else if (sectionNumber === 2) {
    // Section 2 default is Australian male. If the speaker is labelled
    // with a clearly-female name, swap to British female.
    for (const speaker of uniqueSpeakers) {
      const gender = detectGender(speaker);
      if (gender === "female") {
        map.set(speaker, LISTENING_VOICE_MAP.section1.primary); // British female
      }
      // else: fallthrough to section default (Australian male) below.
    }
  } else if (sectionNumber === 4) {
    // Section 4 default is British male. Same fallback for female labels.
    for (const speaker of uniqueSpeakers) {
      const gender = detectGender(speaker);
      if (gender === "female") {
        map.set(speaker, LISTENING_VOICE_MAP.section1.primary); // British female
      }
    }
  }

  // Anyone left unmapped gets the fallback (section default voice).
  for (const s of uniqueSpeakers) {
    if (!map.has(s)) map.set(s, fallback);
  }
  return map;
}

// Reading/checking pause lengths (seconds) — matched to the real test.
const READ_PAUSE_SEC = 20;
const CHECK_PAUSE_SEC = 30;

type Mp3FrameInfo = {
  header: Buffer; // exact 4-byte header copied from a real frame
  frameLength: number;
  sampleRate: number;
  samplesPerFrame: number;
};

/**
 * Find the first valid MPEG audio (Layer III) frame in a buffer and return its
 * header + geometry. We copy the EXACT header (which encodes channel mode,
 * sample rate, bitrate) so our silent frames are byte-compatible with the
 * surrounding ElevenLabs speech — otherwise a format mismatch (e.g. mono vs
 * joint-stereo) makes browsers stall at the silence and stop playing.
 */
function detectMp3Frame(buf: Buffer): Mp3FrameInfo | null {
  const V1_BITRATES = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
  ];
  const V2_BITRATES = [
    0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
  ];
  for (let i = 0; i + 4 <= buf.length; i++) {
    if (buf[i] !== 0xff) continue;
    if ((buf[i + 1] & 0xe0) !== 0xe0) continue; // sync
    const verBits = (buf[i + 1] >> 3) & 0x3;
    const layerBits = (buf[i + 1] >> 1) & 0x3;
    if (layerBits !== 0b01) continue; // Layer III only
    const bitrateIdx = (buf[i + 2] >> 4) & 0xf;
    const srIdx = (buf[i + 2] >> 2) & 0x3;
    const padding = (buf[i + 2] >> 1) & 0x1;
    if (bitrateIdx === 0 || bitrateIdx === 0xf || srIdx === 0x3) continue;
    const isMpeg1 = verBits === 0b11;
    const isMpeg2 = verBits === 0b10;
    const isMpeg25 = verBits === 0b00;
    if (!isMpeg1 && !isMpeg2 && !isMpeg25) continue;
    const bitrate = (isMpeg1 ? V1_BITRATES : V2_BITRATES)[bitrateIdx] * 1000;
    const srTable = isMpeg1
      ? [44100, 48000, 32000]
      : isMpeg2
        ? [22050, 24000, 16000]
        : [11025, 12000, 8000];
    const sampleRate = srTable[srIdx];
    const samplesPerFrame = isMpeg1 ? 1152 : 576;
    const coef = isMpeg1 ? 144 : 72;
    const frameLength = Math.floor((coef * bitrate) / sampleRate) + padding;
    if (frameLength < 8) continue;
    return {
      header: Buffer.from([buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]),
      frameLength,
      sampleRate,
      samplesPerFrame,
    };
  }
  return null;
}

// Fallback frame: MPEG-1 Layer III, 44.1kHz/128k, joint-stereo (FF FB 90 64).
const FALLBACK_FRAME: Mp3FrameInfo = {
  header: Buffer.from([0xff, 0xfb, 0x90, 0x64]),
  frameLength: 417,
  sampleRate: 44100,
  samplesPerFrame: 1152,
};

/**
 * Build a silent MP3 buffer of ~`seconds` length using `tmpl`'s exact frame
 * format. All-zero frame bodies decode to silence; reusing the real header
 * keeps the stream format constant so playback continues seamlessly.
 */
function silentMp3(seconds: number, tmpl: Mp3FrameInfo): Buffer {
  const frame = Buffer.concat([
    tmpl.header,
    Buffer.alloc(Math.max(0, tmpl.frameLength - 4)),
  ]);
  const n = Math.max(
    1,
    Math.round((seconds * tmpl.sampleRate) / tmpl.samplesPerFrame)
  );
  return Buffer.concat(new Array(n).fill(frame));
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * ElevenLabs synthesis with retries for transient failures (rate limits /
 * brief network errors). Throws if all attempts fail.
 */
async function synthWithRetry(
  opts: Parameters<typeof ttsSynthesize>[0],
  attempts = 3
): Promise<Buffer> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await ttsSynthesize(opts);
    } catch (err) {
      lastErr = err;
      console.warn(`[IELTS Gen] TTS attempt ${i + 1}/${attempts} failed:`, err);
      if (i < attempts - 1) await sleep(800 * (i + 1));
    }
  }
  throw lastErr;
}

/** Synthesize narrator instruction text (chunked) into one MP3 buffer. */
async function ttsNarrate(text: string): Promise<Buffer> {
  // Narrator voice, with a fallback to a known-good voice if the configured
  // narrator voice id isn't available on the account (so instructions are
  // never silently dropped).
  const voiceCandidates = [
    LISTENING_VOICE_MAP.narrator,
    LISTENING_VOICE_MAP.section1.primary, // British female (ENV default — always available)
  ];
  const bufs: Buffer[] = [];
  for (const chunk of chunkTextForTTS(text.trim(), 1500)) {
    if (!chunk) continue;
    let done = false;
    for (const voiceId of voiceCandidates) {
      try {
        bufs.push(
          await synthWithRetry({
            text: chunk,
            voiceId,
            modelId: "eleven_multilingual_v2",
            outputFormat: "mp3_44100_128",
            stability: 0.6,
            similarityBoost: 0.75,
          })
        );
        done = true;
        break;
      } catch (err) {
        console.warn(`[IELTS Gen] narrator TTS failed (voice ${voiceId}):`, err);
      }
    }
    if (!done) {
      console.warn(`[IELTS Gen] narrator chunk dropped (all voices failed)`);
    }
  }
  return Buffer.concat(bufs);
}

/** Synthesize a block of speaker segments (multi-voice) into one MP3 buffer. */
async function ttsSpeakSegments(
  segments: Segment[],
  sectionNumber: 1 | 2 | 3 | 4,
  voiceMap: Map<string, string>
): Promise<Buffer> {
  const bufs: Buffer[] = [];
  for (const seg of segments) {
    const voiceId = voiceMap.get(seg.speaker) ?? voiceForSection(sectionNumber);
    for (const chunk of chunkTextForTTS(seg.text, 1800)) {
      if (!chunk) continue;
      try {
        bufs.push(
          await synthWithRetry({
            text: chunk,
            voiceId,
            modelId: "eleven_multilingual_v2",
            outputFormat: "mp3_44100_128",
            stability: 0.5,
            similarityBoost: 0.75,
          })
        );
      } catch (err) {
        console.warn(
          `[IELTS Gen] TTS chunk failed in section ${sectionNumber} (speaker ${seg.speaker}):`,
          err
        );
      }
    }
  }
  return Buffer.concat(bufs);
}

function defaultAudioIntro(sectionNumber: 1 | 2 | 3 | 4): string {
  switch (sectionNumber) {
    case 1:
      return "a conversation between two people in an everyday situation";
    case 2:
      return "a talk given by one speaker";
    case 3:
      return "a discussion between students and their tutor";
    case 4:
      return "part of a university lecture";
  }
}

/**
 * Assemble a Listening section's audio with real-IELTS-style narrated
 * instructions: opening (Section 1), section intro, a worked example
 * (Section 1), reading-time pauses before each half, and a check pause at
 * the end. The dialogue is split into two halves at the [[SPLIT]] marker.
 */
async function ttsListeningSection(
  testCode: string,
  sectionNumber: 1 | 2 | 3 | 4,
  draft: ListeningSectionDraft,
  startingQuestionNumber: number
): Promise<string> {
  // Strip the split marker; Section 4 is played straight through.
  const fullTranscript = draft.transcript;
  const straightThrough = sectionNumber === 4;

  // Sections 1-3 split into two halves at [[SPLIT]] (fallback: midpoint).
  let part1Text = fullTranscript;
  let part2Text = "";
  if (!straightThrough) {
    if (fullTranscript.includes("[[SPLIT]]")) {
      const idx = fullTranscript.indexOf("[[SPLIT]]");
      part1Text = fullTranscript.slice(0, idx);
      part2Text = fullTranscript.slice(idx + "[[SPLIT]]".length);
    } else {
      const segs = parseTranscript(fullTranscript);
      const mid = Math.ceil(segs.length / 2);
      part1Text = segs.slice(0, mid).map(s => `${s.speaker}: ${s.text}`).join("\n");
      part2Text = segs.slice(mid).map(s => `${s.speaker}: ${s.text}`).join("\n");
    }
  } else {
    part1Text = fullTranscript.replace(/\[\[SPLIT\]\]/g, " ");
  }

  const part1 = parseTranscript(part1Text);
  const part2 = parseTranscript(part2Text);
  const allSpeakers = Array.from(
    new Set([...part1, ...part2].map(s => s.speaker))
  );
  const voiceMap = buildSpeakerVoiceMap(sectionNumber, allSpeakers);

  const a = startingQuestionNumber;
  const last = startingQuestionNumber + 9;
  // Boundary between the two halves — announced by the narrator. Use the
  // LLM-reported firstBatchEnd so the announcement matches where the audio
  // actually splits (fallback: the midpoint).
  let b = startingQuestionNumber + 4;
  if (
    draft.firstBatchEnd != null &&
    draft.firstBatchEnd > a &&
    draft.firstBatchEnd < last
  ) {
    b = draft.firstBatchEnd;
  }
  const c = b + 1;
  const d = last;

  const buffers: Buffer[] = [];
  let speechBytes = 0; // bytes of actual spoken transcript audio (not silence)
  // Frame template for silence — detected from the first real ElevenLabs
  // buffer so the silent frames match its exact format (channel mode etc.).
  let frameTmpl: Mp3FrameInfo | null = null;
  const push = (buf: Buffer) => {
    if (buf && buf.length > 0) {
      buffers.push(buf);
      if (!frameTmpl) frameTmpl = detectMp3Frame(buf);
    }
  };
  const pushSilence = (seconds: number) => {
    push(silentMp3(seconds, frameTmpl ?? FALLBACK_FRAME));
  };
  const pushSpeech = (buf: Buffer) => {
    speechBytes += buf.length;
    push(buf);
  };

  // Opening — Section 1 only (introduces the whole test).
  if (sectionNumber === 1) {
    push(
      await ttsNarrate(
        "This is the Listening test. You will hear four separate recordings and you will have to answer questions on each one. There will be time for you to read the questions before you listen, and time to check your answers. The recording will be played once only. The test is in four sections."
      )
    );
  }

  // Section intro.
  const intro = draft.audioIntro?.trim() || defaultAudioIntro(sectionNumber);
  push(await ttsNarrate(`Section ${sectionNumber}. You will hear ${intro}.`));

  // Worked example — Section 1 only.
  if (sectionNumber === 1 && draft.example?.lines?.trim()) {
    push(await ttsNarrate("First, look at the example."));
    push(await ttsSpeakSegments(parseTranscript(draft.example.lines), sectionNumber, voiceMap));
    push(
      await ttsNarrate(
        `The answer is ${draft.example.answer}. That is the example. Now we shall begin.`
      )
    );
  }

  if (straightThrough) {
    // Section 4: read all questions once, then play straight through.
    push(
      await ttsNarrate(
        `First, you have some time to look at questions ${a} to ${last}.`
      )
    );
    pushSilence(READ_PAUSE_SEC + 10); // a little longer — all 10 at once
    push(await ttsNarrate(`Now listen and answer questions ${a} to ${last}.`));
    pushSpeech(await ttsSpeakSegments(part1, sectionNumber, voiceMap));
  } else {
    // First half: reading time, then play.
    push(
      await ttsNarrate(
        `First, you have some time to look at questions ${a} to ${b}.`
      )
    );
    pushSilence(READ_PAUSE_SEC);
    push(await ttsNarrate(`Now listen and answer questions ${a} to ${b}.`));
    pushSpeech(await ttsSpeakSegments(part1, sectionNumber, voiceMap));

    // Second half: reading time, then play.
    push(
      await ttsNarrate(
        `Before you hear the rest, you have some time to look at questions ${c} to ${d}.`
      )
    );
    pushSilence(READ_PAUSE_SEC);
    push(await ttsNarrate(`Now listen and answer questions ${c} to ${d}.`));
    pushSpeech(await ttsSpeakSegments(part2, sectionNumber, voiceMap));
  }

  // End of section: check time.
  push(
    await ttsNarrate(
      `That is the end of Section ${sectionNumber}. You now have some time to check your answers.`
    )
  );
  pushSilence(CHECK_PAUSE_SEC);

  // Fail loudly if the spoken transcript produced essentially no audio — this
  // means ElevenLabs failed for the whole section (e.g. credits exhausted or
  // rate-limited). Better to abort than ship a section that's only narration
  // + silence, which the player would blow straight through.
  if (speechBytes < 3000) {
    throw new Error(
      `Section ${sectionNumber} produced no speech audio (${speechBytes} bytes) — ElevenLabs likely failed (check credits / rate limit).`
    );
  }

  const combined = Buffer.concat(buffers);
  const key = `ielts/audio/${testCode}/section-${sectionNumber}-${nanoid(6)}.mp3`;
  await storagePut(key, combined, "audio/mpeg");
  return key;
}

/**
 * Split text at sentence boundaries so each chunk stays under `maxLen`
 * characters. Prevents ElevenLabs from truncating the tail of long requests.
 */
function chunkTextForTTS(text: string, maxLen: number): string[] {
  const cleaned = text.trim();
  if (cleaned.length <= maxLen) return [cleaned];
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current.length === 0) {
      current = s;
    } else if (current.length + 1 + s.length <= maxLen) {
      current += " " + s;
    } else {
      chunks.push(current);
      current = s;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/**
 * Render the Task 1 chart as a REAL, accurately-labelled chart using QuickChart
 * (Chart.js as a service). FLUX/diffusion image models cannot render correct
 * numeric data — they produce a chart-shaped picture with garbled/absent
 * values — so we build a precise Chart.js config from the LLM's data instead.
 */
async function generateChartImage(
  testCode: string,
  chart: WritingChart | undefined | null
): Promise<string | null> {
  if (!chart || !Array.isArray(chart.series) || chart.series.length === 0) {
    return null;
  }
  const palette = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
  const isPie = chart.type === "pie";
  const datasets = chart.series.map((s, i) => ({
    label: s.label,
    data: s.data,
    ...(isPie
      ? { backgroundColor: palette }
      : {
          backgroundColor: palette[i % palette.length],
          borderColor: palette[i % palette.length],
          fill: false,
        }),
  }));
  const config = {
    type: chart.type === "line" ? "line" : chart.type === "pie" ? "pie" : "bar",
    data: { labels: chart.xLabels, datasets },
    options: {
      plugins: {
        title: { display: true, text: chart.title, font: { size: 16 } },
        legend: { display: true },
      },
      ...(isPie
        ? {}
        : {
            scales: {
              y: {
                title: { display: !!chart.yAxisLabel, text: chart.yAxisLabel ?? "" },
                beginAtZero: true,
              },
            },
          }),
    },
  };
  const url =
    "https://quickchart.io/chart?w=720&h=440&bkg=white&v=4&c=" +
    encodeURIComponent(JSON.stringify(config));
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[IELTS Gen] QuickChart failed: ${res.status}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const key = `ielts/writing/${testCode}/task-1-${nanoid(6)}.png`;
    await storagePut(key, buffer, "image/png");
    return key;
  } catch (err) {
    console.warn(`[IELTS Gen] QuickChart error:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export type GenerateTestResult = {
  alreadyExists: boolean;
  testId: number;
  testCode: string;
  listeningSections: number;
  readingPassages: number;
  writingTasks: number;
  speakingPrompts: number;
  chartImageGenerated: boolean;
  errors: string[];
};

export async function generateAcademicTest(args: {
  code: string;
  title: string;
  /** Replace an existing test with this code (delete it only AFTER the new
   *  content + audio are fully generated, so a failure leaves the old test
   *  intact). When false (default), an existing test is left untouched. */
  replace?: boolean;
}): Promise<GenerateTestResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // If a test with this code exists: when not replacing, return it untouched
  // (idempotent). When replacing, we keep it for now and only delete it once
  // the new content is fully ready (just before inserting — see below).
  const existing = await db
    .select()
    .from(ieltsMockTests)
    .where(eq(ieltsMockTests.code, args.code))
    .limit(1);
  if (existing.length > 0 && !args.replace) {
    return {
      alreadyExists: true,
      testId: existing[0].id,
      testCode: existing[0].code,
      listeningSections: 0,
      readingPassages: 0,
      writingTasks: 0,
      speakingPrompts: 0,
      chartImageGenerated: false,
      errors: [],
    };
  }

  const errors: string[] = [];

  // Step 1: kick off content generation in parallel.
  console.log("[IELTS Gen] Generating content via DeepSeek...");
  const listeningPromises = ([1, 2, 3, 4] as const).map((n, idx) =>
    generateListeningSection(n, 1 + idx * 10).catch(e => {
      errors.push(`Listening S${n}: ${e.message}`);
      return null;
    })
  );
  const readingPromises = ([1, 2, 3] as const).map((n, idx) =>
    generateReadingPassage(n, 1 + idx * 13).catch(e => {
      errors.push(`Reading P${n}: ${e.message}`);
      return null;
    })
  );
  const writingPromise = generateWritingTasks().catch(e => {
    errors.push(`Writing: ${e.message}`);
    return null;
  });
  const speakingPromise = generateSpeakingPrompts().catch(e => {
    errors.push(`Speaking: ${e.message}`);
    return null;
  });

  const [listening, reading] = await Promise.all([
    Promise.all(listeningPromises),
    Promise.all(readingPromises),
  ]);
  let writing = await writingPromise;
  let speaking = await speakingPromise;

  // Step 1b: any section/passage that came back null (LLM threw / invalid
  // JSON) gets a sequential retry — up to 2 attempts each — so we NEVER
  // end up with fewer than 4 listening sections or 3 reading passages.
  for (let i = 0; i < 4; i++) {
    if (listening[i]) continue;
    const sectionNumber = (i + 1) as 1 | 2 | 3 | 4;
    for (let retry = 0; retry < 2 && !listening[i]; retry++) {
      try {
        console.log(
          `[IELTS Gen] Sequential retry for Listening section ${sectionNumber} (try ${retry + 1})`
        );
        listening[i] = await generateListeningSection(
          sectionNumber,
          1 + i * 10
        );
      } catch (e: any) {
        errors.push(
          `Listening S${sectionNumber} retry ${retry + 1}: ${e.message}`
        );
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    if (reading[i]) continue;
    const passageNumber = (i + 1) as 1 | 2 | 3;
    for (let retry = 0; retry < 2 && !reading[i]; retry++) {
      try {
        console.log(
          `[IELTS Gen] Sequential retry for Reading passage ${passageNumber} (try ${retry + 1})`
        );
        reading[i] = await generateReadingPassage(passageNumber, 1 + i * 13);
      } catch (e: any) {
        errors.push(
          `Reading P${passageNumber} retry ${retry + 1}: ${e.message}`
        );
      }
    }
  }

  // Writing + Speaking get the same retry treatment so a regenerate never
  // produces a test that's missing a whole skill (e.g. "writing is gone").
  for (let retry = 0; retry < 2 && !writing; retry++) {
    try {
      console.log(`[IELTS Gen] Sequential retry for Writing (try ${retry + 1})`);
      writing = await generateWritingTasks();
    } catch (e: any) {
      errors.push(`Writing retry ${retry + 1}: ${e.message}`);
    }
  }
  for (let retry = 0; retry < 2 && !speaking; retry++) {
    try {
      console.log(`[IELTS Gen] Sequential retry for Speaking (try ${retry + 1})`);
      speaking = await generateSpeakingPrompts();
    } catch (e: any) {
      errors.push(`Speaking retry ${retry + 1}: ${e.message}`);
    }
  }

  // Hard guard: if any whole skill is still missing, abort rather than save a
  // broken test. The caller (admin Regenerate / endpoint) sees the error and
  // can retry — far better than silently shipping a test with no Writing.
  const missingListening = listening.filter(s => !s).length;
  const missingReading = reading.filter(p => !p).length;
  if (missingListening > 0 || missingReading > 0 || !writing || !speaking) {
    throw new Error(
      `Generation incomplete: ${missingListening} listening section(s), ${missingReading} reading passage(s)` +
        `${!writing ? ", Writing" : ""}${!speaking ? ", Speaking" : ""} failed after retries. Errors: ${errors.join(" | ")}`
    );
  }

  // Step 1c: synthesize ALL listening audio BEFORE any DB write. If any
  // section's audio fails (after per-section retries), abort the whole run so
  // we never persist a half-built test (e.g. only 2 sections with audio). The
  // R2 key only needs the test code, so this can run before inserting rows.
  console.log("[IELTS Gen] Synthesizing Listening audio (pre-insert)...");
  const audioKeys: string[] = [];
  for (let i = 0; i < 4; i++) {
    const section = listening[i]!;
    let audioKey = "";
    for (let attempt = 0; attempt < 2 && !audioKey; attempt++) {
      try {
        audioKey = await ttsListeningSection(
          args.code,
          (i + 1) as 1 | 2 | 3 | 4,
          section,
          i * 10 + 1
        );
      } catch (e: any) {
        errors.push(`L${i + 1} TTS try ${attempt + 1}: ${e.message}`);
        console.error(`[IELTS Gen] Section ${i + 1} TTS failed:`, e.message);
      }
    }
    if (!audioKey) {
      throw new Error(
        `Listening Section ${i + 1} audio failed after retries — aborting BEFORE saving so no broken test ships. ` +
          `This is almost always ElevenLabs (check credits / rate limit). Errors: ${errors.join(" | ")}`
      );
    }
    audioKeys[i] = audioKey;
  }

  // Replace mode: now that all content + audio are ready, delete the old test
  // (with all child rows) so the swap is effectively atomic — a failure above
  // would have aborted before reaching here, leaving the old test intact.
  if (args.replace && existing.length > 0) {
    console.log("[IELTS Gen] Deleting previous test before insert...");
    await deleteTestByCode(db, args.code);
  }

  // Step 2: insert the test row.
  console.log("[IELTS Gen] Inserting test row...");
  const insertedTest = await db.insert(ieltsMockTests).values({
    code: args.code,
    title: args.title,
    testType: "academic",
    notes: `Auto-generated by ieltsTestGenerator on ${new Date().toISOString()}. REVIEW BEFORE PUBLISHING.`,
    isPublished: false,
  });
  const testId = (insertedTest as any)[0]?.insertId as number;

  // Step 3: persist Listening sections (audio already generated above).
  console.log("[IELTS Gen] Inserting Listening sections...");
  let listeningCount = 0;
  for (let i = 0; i < 4; i++) {
    const section = listening[i];
    if (!section) continue;
    // Store the dialogue transcript without the internal [[SPLIT]] marker.
    const storedTranscript = section.transcript
      .replace(/\[\[SPLIT\]\]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const inserted = await db.insert(ieltsListeningSections).values({
      testId,
      sectionNumber: i + 1,
      audioKey: audioKeys[i],
      durationSec: section.durationSec ?? null,
      transcript: storedTranscript,
    });
    const sectionId = (inserted as any)[0]?.insertId as number;
    if (section.questions.length > 0) {
      await db.insert(ieltsListeningQuestions).values(
        section.questions.map(q => ({
          sectionId,
          questionNumber: q.questionNumber,
          questionType: normalizeQuestionType(q.questionType, "listening") as any,
          prompt: q.prompt,
          options: q.options ?? null,
          correctAnswers: q.correctAnswers,
          maxScore: 1,
        }))
      );
    }
    listeningCount++;
  }

  // Step 4: Reading passages + questions.
  console.log("[IELTS Gen] Inserting Reading passages...");
  let readingCount = 0;
  for (let i = 0; i < 3; i++) {
    const passage = reading[i];
    if (!passage) continue;
    const inserted = await db.insert(ieltsReadingPassages).values({
      testId,
      passageNumber: i + 1,
      title: passage.title,
      body: passage.body,
      wordCount: passage.wordCount ?? null,
    });
    const passageId = (inserted as any)[0]?.insertId as number;
    if (passage.questions.length > 0) {
      await db.insert(ieltsReadingQuestions).values(
        passage.questions.map(q => ({
          passageId,
          questionNumber: q.questionNumber,
          questionType: normalizeQuestionType(q.questionType, "reading") as any,
          prompt: q.prompt,
          options: q.options ?? null,
          correctAnswers: q.correctAnswers,
          maxScore: 1,
        }))
      );
    }
    readingCount++;
  }

  // Step 5: Writing tasks + Task 1 chart image.
  console.log("[IELTS Gen] Generating Writing chart and tasks...");
  let chartGenerated = false;
  let chartKey: string | null = null;
  if (writing) {
    try {
      chartKey = await generateChartImage(args.code, writing.task1.chart);
      chartGenerated = !!chartKey;
    } catch (e: any) {
      errors.push(`Chart gen: ${e.message}`);
    }
    await db.insert(ieltsWritingTasks).values([
      {
        testId,
        taskNumber: 1,
        taskFormat: "chart",
        prompt: writing.task1.prompt,
        imageKey: chartKey,
        minWords: 150,
        timeLimitSec: 1200,
      },
      {
        testId,
        taskNumber: 2,
        taskFormat: "essay",
        prompt: writing.task2.prompt,
        imageKey: null,
        minWords: 250,
        timeLimitSec: 2400,
      },
    ]);
  }

  // Step 6: Speaking prompts.
  console.log("[IELTS Gen] Inserting Speaking prompts...");
  let speakingCount = 0;
  if (speaking) {
    for (const part of speaking.parts) {
      if (part.prompts.length === 0) continue;
      await db.insert(ieltsSpeakingPrompts).values(
        part.prompts.map(p => ({
          testId,
          partNumber: part.partNumber,
          promptOrder: p.promptOrder,
          prompt: p.prompt,
          cueCardText: p.cueCardText ?? null,
          followUpHint: null,
        }))
      );
      speakingCount += part.prompts.length;
    }
  }

  return {
    alreadyExists: false,
    testId,
    testCode: args.code,
    listeningSections: listeningCount,
    readingPassages: readingCount,
    writingTasks: writing ? 2 : 0,
    speakingPrompts: speakingCount,
    chartImageGenerated: chartGenerated,
    errors,
  };
}

/**
 * Regenerate ONLY the text skills (Reading, Writing, Speaking) of an existing
 * test, IN PLACE — the test row and all Listening sections + audio are left
 * completely untouched. This uses ZERO ElevenLabs credits (the chart uses
 * QuickChart, which is free). Content is generated first; the old rows for a
 * skill are only deleted+replaced once the new content is ready, so a failure
 * leaves the existing content intact.
 */
export async function regenerateTextContent(args: {
  code: string;
  reading?: boolean;
  writing?: boolean;
  speaking?: boolean;
}): Promise<{
  readingPassages: number;
  writingTasks: number;
  speakingPrompts: number;
  chartImageGenerated: boolean;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [test] = await db
    .select()
    .from(ieltsMockTests)
    .where(eq(ieltsMockTests.code, args.code))
    .limit(1);
  if (!test) throw new Error(`Test ${args.code} not found`);
  const testId = test.id;
  const errors: string[] = [];

  // --- Generate everything requested FIRST (no DB writes yet) ---
  let reading: (ReadingPassageDraft | null)[] | null = null;
  if (args.reading) {
    reading = [null, null, null];
    for (let i = 0; i < 3; i++) {
      for (let r = 0; r < 3 && !reading[i]; r++) {
        try {
          reading[i] = await generateReadingPassage((i + 1) as 1 | 2 | 3, 1 + i * 13);
        } catch (e: any) {
          errors.push(`Reading P${i + 1} try ${r + 1}: ${e.message}`);
        }
      }
    }
    if (reading.some(p => !p)) {
      throw new Error(
        `Reading generation failed — existing content kept. Errors: ${errors.join(" | ")}`
      );
    }
  }

  let writing: WritingDraft | null = null;
  if (args.writing) {
    for (let r = 0; r < 3 && !writing; r++) {
      try {
        writing = await generateWritingTasks();
      } catch (e: any) {
        errors.push(`Writing try ${r + 1}: ${e.message}`);
      }
    }
    if (!writing) {
      throw new Error(
        `Writing generation failed — existing content kept. Errors: ${errors.join(" | ")}`
      );
    }
  }

  let speaking: SpeakingDraft | null = null;
  if (args.speaking) {
    for (let r = 0; r < 3 && !speaking; r++) {
      try {
        speaking = await generateSpeakingPrompts();
      } catch (e: any) {
        errors.push(`Speaking try ${r + 1}: ${e.message}`);
      }
    }
    if (!speaking) {
      throw new Error(
        `Speaking generation failed — existing content kept. Errors: ${errors.join(" | ")}`
      );
    }
  }

  // --- Swap in the new content (delete old rows for that skill, insert new) ---
  let readingPassages = 0;
  if (reading) {
    const passages = await db
      .select({ id: ieltsReadingPassages.id })
      .from(ieltsReadingPassages)
      .where(eq(ieltsReadingPassages.testId, testId));
    for (const p of passages) {
      await db
        .delete(ieltsReadingQuestions)
        .where(eq(ieltsReadingQuestions.passageId, p.id));
    }
    await db
      .delete(ieltsReadingPassages)
      .where(eq(ieltsReadingPassages.testId, testId));
    for (let i = 0; i < 3; i++) {
      const passage = reading[i]!;
      const inserted = await db.insert(ieltsReadingPassages).values({
        testId,
        passageNumber: i + 1,
        title: passage.title,
        body: passage.body,
        wordCount: passage.wordCount ?? null,
      });
      const passageId = (inserted as any)[0]?.insertId as number;
      if (passage.questions.length > 0) {
        await db.insert(ieltsReadingQuestions).values(
          passage.questions.map(q => ({
            passageId,
            questionNumber: q.questionNumber,
            questionType: normalizeQuestionType(q.questionType, "reading") as any,
            prompt: q.prompt,
            options: q.options ?? null,
            correctAnswers: q.correctAnswers,
            maxScore: 1,
          }))
        );
      }
      readingPassages++;
    }
  }

  let writingTasks = 0;
  let chartImageGenerated = false;
  if (writing) {
    let chartKey: string | null = null;
    try {
      chartKey = await generateChartImage(args.code, writing.task1.chart);
      chartImageGenerated = !!chartKey;
    } catch (e: any) {
      errors.push(`Chart gen: ${e.message}`);
    }
    await db.delete(ieltsWritingTasks).where(eq(ieltsWritingTasks.testId, testId));
    await db.insert(ieltsWritingTasks).values([
      {
        testId,
        taskNumber: 1,
        taskFormat: "chart",
        prompt: writing.task1.prompt,
        imageKey: chartKey,
        minWords: 150,
        timeLimitSec: 1200,
      },
      {
        testId,
        taskNumber: 2,
        taskFormat: "essay",
        prompt: writing.task2.prompt,
        imageKey: null,
        minWords: 250,
        timeLimitSec: 2400,
      },
    ]);
    writingTasks = 2;
  }

  let speakingPrompts = 0;
  if (speaking) {
    await db
      .delete(ieltsSpeakingPrompts)
      .where(eq(ieltsSpeakingPrompts.testId, testId));
    for (const part of speaking.parts) {
      if (part.prompts.length === 0) continue;
      await db.insert(ieltsSpeakingPrompts).values(
        part.prompts.map(p => ({
          testId,
          partNumber: part.partNumber,
          promptOrder: p.promptOrder,
          prompt: p.prompt,
          cueCardText: p.cueCardText ?? null,
          followUpHint: null,
        }))
      );
      speakingPrompts += part.prompts.length;
    }
  }

  return { readingPassages, writingTasks, speakingPrompts, chartImageGenerated, errors };
}
