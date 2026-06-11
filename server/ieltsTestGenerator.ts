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
    theme:
      "A telephone conversation about booking a holiday cottage. Two speakers: customer (female, British) calling Coastal Cottages, and agent (male, British) taking the booking. Cover: name, dates, number of adults/children, location preference (near beach), bedrooms, vehicle reg, special requirements (cot for baby, wheelchair access), payment method, booking reference.",
    questionTypes: "Mostly form_completion (8-9 questions), with maybe 1-2 short_answer. Answers are short — names, numbers, dates, simple phrases.",
  },
  {
    sectionNumber: 2,
    theme:
      "A monologue: welcome talk by a guide at a wildlife sanctuary. Single speaker (male, Australian). Cover: history (founded 1992), number of animals and species, safety rules (no feeding, no photography in nursery, stay on path), tour schedule, facilities (cafe, gift shop, picnic area, first-aid station), where to meet at end.",
    questionTypes: "Mix of multiple choice (3-4) and note_completion (6-7). Notes are structured under headers like 'History', 'Facilities', 'Tour schedule', 'Safety rules' with missing words to fill in (1-3 words each). Do NOT use map_labelling.",
  },
  {
    sectionNumber: 3,
    theme:
      "An educational discussion: two university students (one American female, one British female) meeting with their tutor (male, British) about a comparative essay on urban migration in two countries. Discuss: structure, methodological differences, key researchers, deadlines, presentation format.",
    questionTypes: "Mix of multiple_choice (4-5) and matching (5-6). Matching pairs researchers with their findings/positions.",
  },
  {
    sectionNumber: 4,
    theme:
      "An academic lecture by a university professor (male, British, academic tone) on the economics of small-scale fisheries. Cover: definition (vessels under 12m), global statistics (40M people directly employed), main challenges (industrial competition, climate change, market access), policy recommendations (community rights, subsidies, infrastructure), case studies (Indonesia, Senegal).",
    questionTypes: "All note_completion or summary_completion. Notes are structured with section headers and missing words to fill in.",
  },
];

async function generateListeningSection(
  sectionNumber: 1 | 2 | 3 | 4,
  startingQuestionNumber: number
): Promise<ListeningSectionDraft> {
  const blueprint = SECTION_BLUEPRINTS.find(b => b.sectionNumber === sectionNumber)!;

  const system = `You are writing IELTS Listening test content. You must produce content that matches the official IELTS Listening band-7 difficulty.

Return JSON ONLY with this exact shape:
{
  "transcript": "Full transcript with speaker labels like 'AGENT:' or 'GUIDE:' on each line. ~600-900 words. Natural conversational/lecture rhythm. Include numbers, dates, names, places that match the questions.",
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
- Match the section blueprint exactly.`;

  const user = `Section ${sectionNumber} blueprint:
${blueprint.theme}

Question types for this section:
${blueprint.questionTypes}

Generate the section now. JSON only.`;

  return llmJson<ListeningSectionDraft>(system, user, 4000);
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

async function ttsListeningSection(
  testCode: string,
  sectionNumber: 1 | 2 | 3 | 4,
  transcript: string
): Promise<string> {
  // Strip speaker labels for cleaner audio playback. The label informs voice
  // choice (future), but for v1 we use a single voice per section.
  const cleaned = transcript
    .split("\n")
    .map(line => line.replace(/^[A-Z][A-Z0-9 ]{1,20}:\s*/, ""))
    .filter(l => l.trim().length > 0)
    .join(" ");

  const audio = await ttsSynthesize({
    text: cleaned,
    voiceId: voiceForSection(sectionNumber),
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    stability: 0.5,
    similarityBoost: 0.75,
  });

  const key = `ielts/audio/${testCode}/section-${sectionNumber}-${nanoid(6)}.mp3`;
  await storagePut(key, audio, "audio/mpeg");
  return key;
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
        section.transcript
      );
    } catch (e: any) {
      errors.push(`L${i + 1} TTS: ${e.message}`);
    }
    const inserted = await db.insert(ieltsListeningSections).values({
      testId,
      sectionNumber: i + 1,
      audioKey,
      durationSec: section.durationSec ?? null,
      transcript: section.transcript,
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
