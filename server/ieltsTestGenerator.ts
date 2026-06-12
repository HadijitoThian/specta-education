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
      "A monologue by a MALE speaker. Use a male first name from this set: DAVID, MARK, JAMES, TOM, MIKE, PAUL, GEORGE, OLIVER, HENRY, WILLIAM. Speaker label format MUST be like 'DAVID:' or 'GUIDE:' (and the speaker introduces himself naturally — 'Hello everyone, I'm David and I'll be your guide today'). Single coherent topic: a welcome talk at a wildlife sanctuary, a radio show about a local event, a tour intro at a museum. CRITICAL: end with one complete sentence (e.g., 'I hope you enjoy your visit.'). Never trail off mid-sentence. CRITICAL: the speaker is MALE, so any self-introduction or name reference must be a male name. Include standard IELTS audio cues like 'Now look at questions 14 to 20' before the second batch of questions begins in the transcript.",
    questionTypes:
      "Mix of multiple_choice (3-4 questions) and note_completion (6-7 questions). The note_completion prompts MUST use this exact format: prepend '[GROUP: <header text>]' on a line by itself ONLY at the first question under each group. The line of the question itself is a bullet point with the fill-in blank, e.g.:\n  Question 14 prompt: '[GROUP: History of the sanctuary]\\n- Founded in .......... by a group of volunteers'\n  Question 15 prompt: '- Currently houses ............ different species'\n  Question 16 prompt: '[GROUP: Safety rules]\\n- Do not approach the .............'\nUse 2-3 distinct GROUP headers across the note_completion questions. NEVER use map_labelling. Each question must test a UNIQUE fact — no two questions may share an opening phrase.",
  },
  {
    sectionNumber: 3,
    difficulty:
      "MEDIUM-HARD (band 6-7.5). Academic vocabulary and abstract opinions. Include 3+ distractors: speakers disagree and change their minds ('I thought it was the sample size, but actually it's the methodology'), one speaker proposes an idea another rejects, and the questions PARAPHRASE heavily (the answer is never the exact words spoken). The MCQ distractor options should all be plausible things mentioned in the audio.",
    theme:
      "An academic discussion between 3 named participants: ONE MALE student, ONE FEMALE student, and ONE tutor (any gender). MUST USE these specific labels: 'TOM:' for the MALE student, 'MAYA:' for the FEMALE student, and 'DR.WATSON:' for the tutor. Do not deviate from these names or labels. They discuss a research project, essay, or assignment with disagreement and viewpoints. Each student has a distinct opinion and the tutor mediates. Include standard IELTS audio cues like 'Now look at questions 25 to 30' before the second batch begins.",
    questionTypes:
      "5 multiple_choice questions (questions 21-25) + 5 sentence_completion questions (questions 26-30).\n  MCQ format (21-25): each MCQ prompt may reference a speaker for a clear hook, e.g., 'What does MAYA think about the methodology?' or 'According to DR. WATSON, the main issue with the studies is...'. Provide exactly 3 options (A, B, C) that are all plausible things mentioned in the audio.\n  Sentence completion format (26-30): begin this batch with the audio cue 'Now look at questions 26 to 30.' These are gap-fill sentences ABOUT THE CONTENT of the discussion — NOT 'who said it' matching. Instruction style: 'Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.' Each prompt is a single sentence summarising a point from the discussion with ONE '..........' blank, where the missing word(s) are a key term actually spoken (paraphrase the surrounding sentence so the answer isn't given away). Example: 'The team agreed that the biggest limitation was the small .......... .' Each stem must be UNIQUE — never reuse an opening phrase. Do NOT use speaker names as answer options anywhere in questions 26-30.",
  },
  {
    sectionNumber: 4,
    difficulty:
      "HARDEST (band 6.5-8.5). Dense academic monologue with sophisticated vocabulary and complex sentence structures. The answers are NEVER stated word-for-word — the student must understand a paraphrased idea and extract the key term. Include subtle qualifications ('while early studies suggested X, more recent work points to Y'). Fast, information-rich delivery. This section separates strong candidates from average ones.",
    theme:
      "An academic lecture by a named professor (e.g., 'PROF.MILLER:' or 'DR.CHEN:'). Single speaker. Pick ONE specific research topic. Structure the lecture into 3-4 CLEARLY DISTINCT subsections, each with its own focus and content. End with one complete sentence. Never repeat the same phrase to introduce different subsections. Include standard IELTS audio cues like 'Before you listen to the next part, you have time to look at questions 35 to 40' midway through.",
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

  return issues;
}

async function generateListeningSection(
  sectionNumber: 1 | 2 | 3 | 4,
  startingQuestionNumber: number,
  attempt = 1
): Promise<ListeningSectionDraft> {
  const blueprint = SECTION_BLUEPRINTS.find(b => b.sectionNumber === sectionNumber)!;

  const system = `You are writing IELTS Listening test content matching the OFFICIAL international IELTS standard.

=== DIFFICULTY FOR THIS SECTION (Section ${sectionNumber}) ===
${blueprint.difficulty}

Real IELTS gets progressively harder from Section 1 (easiest) to Section 4 (hardest). Respect the tier above exactly. The single most important quality marker: real IELTS uses AUDIO DISTRACTORS — the speaker mentions a wrong option before the right one, corrects themselves, or the question paraphrases the audio so the answer isn't the literal words spoken. Build these in per the tier above.


Return JSON ONLY with this exact shape:
{
  "audioIntro": "A short noun phrase the narrator reads after 'You will hear', describing the recording — e.g. 'a conversation between a student and an accommodation officer about renting a room' or 'a talk given to new museum volunteers'. No speaker labels, no quotes, no trailing full stop.",
  "example": ${sectionNumber === 1 ? `{ "lines": "A SHORT 2-3 line standalone example exchange WITH speaker labels that demonstrates how an answer is given (do NOT reuse any of the 10 real answers)", "answer": "the example answer, 1-3 words" }` : "null"},
  "transcript": "Full transcript with speaker labels like 'AGENT:' or 'GUIDE:' on each line. ~600-900 words. Natural conversational/lecture rhythm. Include numbers, dates, names, places that match the questions. Insert ONE line containing exactly [[SPLIT]] at the natural midpoint between the first half of questions (${startingQuestionNumber}-${startingQuestionNumber + 4}) and the second half (${startingQuestionNumber + 5}-${startingQuestionNumber + 9}). Do NOT write any spoken instructions, reading-time cues, or 'now look at questions…' lines — the system adds all narrator instructions automatically.",
  "durationSec": number,
  "questions": [
    {
      "questionNumber": number,
      "questionType": "form_completion" | "note_completion" | "sentence_completion" | "summary_completion" | "short_answer" | "mcq" | "matching" | "map_labelling",
      "prompt": "The full question text the student sees. For form/note completion, include the fill-in line like 'Name: ......(1)......'.",
      "options": null | ["A. ...", "B. ...", "C. ..."],
      "correctAnswers": ["accepted variant 1", "accepted variant 2 (e.g. lowercase)"]
    }
  ]
}

Rules:
- Exactly 10 questions per section.
- Question numbers start at ${startingQuestionNumber} and go up by 1.
- correctAnswers must match EXACTLY what's in the transcript (case-insensitive accepted).
- For form_completion / note_completion: keep answers short (1-3 words max).
- For mcq: provide 3 plain-text options like "A. Something", "B. Something".
- For map_labelling: options are letters A-H labeling pre-known locations. correctAnswer is a single letter.
- Transcript MUST be self-contained — every answer should be derivable from the transcript by a careful listener.
- Match the section blueprint exactly.
- The transcript MUST contain exactly ONE line that is just [[SPLIT]] (nothing else on that line), placed at the natural midpoint between the two halves of questions. Do NOT write any "now look at questions…" cues or other spoken instructions — the narrator instructions are added by the system.
- "audioIntro" is REQUIRED. ${sectionNumber === 1 ? '"example" is REQUIRED for Section 1: a short standalone exchange whose answer is NOT one of the 10 real answers.' : '"example" must be null for this section.'}`;

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
- For completion: keep answers to 1-3 words and ensure they appear verbatim in the passage.
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

type WritingDraft = {
  task1: {
    prompt: string;
    chartImagePrompt: string; // For FLUX image generation
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
    "prompt": "Full Task 1 prompt. Must describe a chart/graph/diagram. Open with 'The chart below shows…' or similar. End with 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.'",
    "chartImagePrompt": "Short description of the chart visual to generate. Be specific about chart type, axes, data series, time periods. This prompt will be sent to an image generator."
  },
  "task2": {
    "prompt": "Full Task 2 prompt. Must be a discursive essay question (discuss-both-views, advantages/disadvantages, agree/disagree, or two-part question). End with: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.'"
  }
}

Rules:
- Task 1 chart should be a believable real-world data scenario (consumer behavior, education, environment, economics).
- Task 2 should be a meaty topic with multiple legitimate viewpoints, suitable for band 7+ responses.
- Indonesia-relevant data scenarios for Task 1 are great (e.g., smartphone usage by age group in Indonesia).`;

  const user = `Generate one Academic Task 1 + Task 2 pair now. JSON only.`;

  return llmJson<WritingDraft>(system, user, 1500);
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

/**
 * One silent MPEG-1 Layer III frame at 44.1 kHz / 128 kbps / joint-stereo —
 * the SAME format ElevenLabs returns (mp3_44100_128). All-zero main data
 * decodes to silence, and MP3 frames are independent so these concatenate
 * cleanly with the spoken segments. Header: FF FB 90 64.
 */
const SILENT_MP3_FRAME = Buffer.concat([
  Buffer.from([0xff, 0xfb, 0x90, 0x64]),
  Buffer.alloc(413), // frame length 417 bytes total for this format
]);
const MP3_FRAMES_PER_SEC = 44100 / 1152; // ≈ 38.28

/** Build a silent MP3 buffer of roughly `seconds` length. */
function silentMp3(seconds: number): Buffer {
  const n = Math.max(1, Math.round(seconds * MP3_FRAMES_PER_SEC));
  return Buffer.concat(new Array(n).fill(SILENT_MP3_FRAME));
}

/** Synthesize narrator instruction text (chunked) into one MP3 buffer. */
async function ttsNarrate(text: string): Promise<Buffer> {
  const bufs: Buffer[] = [];
  for (const chunk of chunkTextForTTS(text.trim(), 1500)) {
    if (!chunk) continue;
    try {
      bufs.push(
        await ttsSynthesize({
          text: chunk,
          voiceId: LISTENING_VOICE_MAP.narrator,
          modelId: "eleven_multilingual_v2",
          outputFormat: "mp3_44100_128",
          stability: 0.6,
          similarityBoost: 0.75,
        })
      );
    } catch (err) {
      console.warn(`[IELTS Gen] narrator TTS failed:`, err);
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
          await ttsSynthesize({
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
  const fullTranscript = draft.transcript;

  // Split the dialogue into two halves at the [[SPLIT]] marker (fallback:
  // split the parsed segments down the middle).
  let part1Text: string;
  let part2Text: string;
  if (fullTranscript.includes("[[SPLIT]]")) {
    const idx = fullTranscript.indexOf("[[SPLIT]]");
    part1Text = fullTranscript.slice(0, idx);
    part2Text = fullTranscript.slice(idx + "[[SPLIT]]".length);
  } else {
    const segs = parseTranscript(fullTranscript);
    const mid = Math.ceil(segs.length / 2);
    part1Text = segs
      .slice(0, mid)
      .map(s => `${s.speaker}: ${s.text}`)
      .join("\n");
    part2Text = segs
      .slice(mid)
      .map(s => `${s.speaker}: ${s.text}`)
      .join("\n");
  }

  const part1 = parseTranscript(part1Text);
  const part2 = parseTranscript(part2Text);
  const allSpeakers = Array.from(
    new Set([...part1, ...part2].map(s => s.speaker))
  );
  const voiceMap = buildSpeakerVoiceMap(sectionNumber, allSpeakers);

  const a = startingQuestionNumber;
  const b = startingQuestionNumber + 4;
  const c = startingQuestionNumber + 5;
  const d = startingQuestionNumber + 9;

  const buffers: Buffer[] = [];
  const push = (buf: Buffer) => {
    if (buf && buf.length > 0) buffers.push(buf);
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

  // First half: reading time, then play.
  push(
    await ttsNarrate(
      `First, you have some time to look at questions ${a} to ${b}.`
    )
  );
  push(silentMp3(READ_PAUSE_SEC));
  push(await ttsNarrate(`Now listen and answer questions ${a} to ${b}.`));
  push(await ttsSpeakSegments(part1, sectionNumber, voiceMap));

  // Second half: reading time, then play.
  push(
    await ttsNarrate(
      `Before you hear the rest, you have some time to look at questions ${c} to ${d}.`
    )
  );
  push(silentMp3(READ_PAUSE_SEC));
  push(await ttsNarrate(`Now listen and answer questions ${c} to ${d}.`));
  push(await ttsSpeakSegments(part2, sectionNumber, voiceMap));

  // End of section: check time.
  push(
    await ttsNarrate(
      `That is the end of Section ${sectionNumber}. You now have some time to check your answers.`
    )
  );
  push(silentMp3(CHECK_PAUSE_SEC));

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

async function generateChartImage(
  testCode: string,
  chartImagePrompt: string
): Promise<string | null> {
  if (!ENV.deepinfraApiKey) return null;
  const fullPrompt = `Clean modern data visualization chart: ${chartImagePrompt}. Professional design, clear labels, axis lines, legend, neutral color palette (blue and amber), white background, presentation quality. Photographed flat with subtle shadow. No people, no logos.`;
  const res = await fetch(
    "https://api.deepinfra.com/v1/openai/images/generations",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${ENV.deepinfraApiKey}`,
      },
      body: JSON.stringify({
        model: ENV.deepinfraImageModel,
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    }
  );
  if (!res.ok) {
    console.warn(`[IELTS Gen] FLUX chart failed: ${res.status}`);
    return null;
  }
  const data = (await res.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };
  const first = data.data?.[0];
  if (!first) return null;
  let buffer: Buffer;
  if (first.b64_json) {
    buffer = Buffer.from(first.b64_json, "base64");
  } else if (first.url) {
    const imgRes = await fetch(first.url);
    buffer = Buffer.from(await imgRes.arrayBuffer());
  } else {
    return null;
  }
  const key = `ielts/writing/${testCode}/task-1-${nanoid(6)}.png`;
  await storagePut(key, buffer, "image/png");
  return key;
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
}): Promise<GenerateTestResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Idempotent: if test exists, return its id and do nothing.
  const existing = await db
    .select()
    .from(ieltsMockTests)
    .where(eq(ieltsMockTests.code, args.code))
    .limit(1);
  if (existing.length > 0) {
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

  const [listening, reading, writing, speaking] = await Promise.all([
    Promise.all(listeningPromises),
    Promise.all(readingPromises),
    writingPromise,
    speakingPromise,
  ]);

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

  // Hard guard: if we still don't have all 4 listening sections, abort the
  // whole generation rather than save a broken 3-section test. The caller
  // (admin Regenerate / endpoint) will see the error and can retry.
  const missingListening = listening.filter(s => !s).length;
  const missingReading = reading.filter(p => !p).length;
  if (missingListening > 0 || missingReading > 0) {
    throw new Error(
      `Generation incomplete: ${missingListening} listening section(s) and ${missingReading} reading passage(s) failed after retries. Errors: ${errors.join(" | ")}`
    );
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

  // Step 3: Listening audio gen + persist.
  console.log("[IELTS Gen] Synthesizing Listening audio...");
  let listeningCount = 0;
  for (let i = 0; i < 4; i++) {
    const section = listening[i];
    if (!section) continue;
    let audioKey = "";
    try {
      audioKey = await ttsListeningSection(
        args.code,
        (i + 1) as 1 | 2 | 3 | 4,
        section,
        i * 10 + 1
      );
    } catch (e: any) {
      errors.push(`L${i + 1} TTS: ${e.message}`);
    }
    // Store the dialogue transcript without the internal [[SPLIT]] marker.
    const storedTranscript = section.transcript
      .replace(/\[\[SPLIT\]\]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const inserted = await db.insert(ieltsListeningSections).values({
      testId,
      sectionNumber: i + 1,
      audioKey,
      durationSec: section.durationSec ?? null,
      transcript: storedTranscript,
    });
    const sectionId = (inserted as any)[0]?.insertId as number;
    if (section.questions.length > 0) {
      await db.insert(ieltsListeningQuestions).values(
        section.questions.map(q => ({
          sectionId,
          questionNumber: q.questionNumber,
          questionType: q.questionType as any,
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
          questionType: q.questionType as any,
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
      chartKey = await generateChartImage(args.code, writing.task1.chartImagePrompt);
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
