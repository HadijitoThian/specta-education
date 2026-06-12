/**
 * Shared answer-grading logic for IELTS Listening & Reading.
 *
 * Two real-world matching concerns this handles:
 *
 *  1. Choice questions (MCQ, matching, map labelling, etc.) are presented to
 *     the student as "A. Full option text". The answer key stores just the
 *     letter ("A"). A naive full-string compare therefore marks a correct
 *     letter pick as wrong. We compare the leading option LETTER instead.
 *
 *  2. Completion questions must tolerate cosmetic differences that IELTS
 *     markers ignore: case, surrounding punctuation, hyphen-vs-space
 *     ("cross-sectional" == "cross sectional"), and collapsed whitespace.
 */

/** Question types where the answer is a labelled option (compare by letter). */
const CHOICE_TYPES = new Set([
  "mcq",
  "multi_select",
  "matching",
  "matching_headings",
  "matching_features",
  "matching_information",
  "matching_sentence_endings",
  "map_labelling",
]);

/**
 * Normalise free-text for comparison: lowercase, hyphens/dashes → spaces,
 * strip punctuation, collapse whitespace.
 */
export function normalizeAnswerText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[-–—_/]/g, " ") // hyphens, dashes, underscores, slashes → space
    .replace(/[.,;:!?'"“”‘’()[\]{}]/g, "") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract the leading option letter from a labelled answer.
 *   "A. Rehabilitating injured wildlife" → "a"
 *   "B) Tom"                              → "b"
 *   "A"                                   → "a"
 * Returns null if the string doesn't begin with a standalone letter label.
 */
function optionLetter(s: string): string | null {
  const m = s.trim().match(/^([A-Za-z])\s*(?:[.)\]:-]|$|\s)/);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Returns true if `student` is a correct answer for a question whose accepted
 * answers are `correctAnswers` and whose type is `questionType`.
 */
export function isAnswerCorrect(
  student: string | null | undefined,
  correctAnswers: string[],
  questionType: string
): boolean {
  const st = (student ?? "").trim();
  if (st.length === 0) return false;
  if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
    return false;
  }

  if (CHOICE_TYPES.has(questionType)) {
    const studentLetter = optionLetter(st);
    for (const c of correctAnswers) {
      const correctLetter = optionLetter(c);
      // Primary: compare option letters when both look like labels.
      if (studentLetter && correctLetter && studentLetter === correctLetter) {
        return true;
      }
      // Fallback: full normalised-text match (handles keys stored as text).
      if (normalizeAnswerText(c) === normalizeAnswerText(st)) return true;
    }
    return false;
  }

  // Completion / short-answer: normalised free-text comparison. Also compare
  // with ALL spaces removed so spacing differences never fail a correct
  // answer (e.g. "guest house" == "guesthouse", "10 am" == "10am").
  const stNorm = normalizeAnswerText(st);
  const stNoSpace = stNorm.replace(/\s+/g, "");
  return correctAnswers.some(c => {
    const cNorm = normalizeAnswerText(c);
    return cNorm === stNorm || cNorm.replace(/\s+/g, "") === stNoSpace;
  });
}

// ---------------------------------------------------------------------------
// Context-aware (LLM) grading for completion / short-answer questions.
// ---------------------------------------------------------------------------

/**
 * Completion-style question types whose answers can sensibly be judged in
 * context (free text the student types). Choice-style and True/False/Not Given
 * questions are NOT here — those are graded deterministically.
 */
const SEMANTIC_TYPES = new Set([
  "form_completion",
  "note_completion",
  "sentence_completion",
  "summary_completion",
  "table_completion",
  "flowchart_completion",
  "diagram_labelling",
  "short_answer",
]);

export function isSemanticType(questionType: string): boolean {
  return SEMANTIC_TYPES.has(questionType);
}

type SemanticItem = {
  id: number;
  prompt: string;
  acceptedAnswers: string[];
  studentAnswer: string;
};

/**
 * Use the LLM as an IELTS examiner to judge completion answers that failed the
 * exact-match check. Accepts context-equivalent answers (e.g. "through a
 * friend" for "a friend"; a specific detail where the key is a generic "Yes")
 * but still rejects misspellings of the target word and wrong information.
 *
 * Returns the set of item ids judged correct. Fails safe: on any error it
 * returns an empty set (so deterministic grading stands).
 */
export async function semanticGradeCompletions(
  items: SemanticItem[]
): Promise<Set<number>> {
  const correct = new Set<number>();
  if (items.length === 0) return correct;

  // Lazy import to keep this module's deterministic exports dependency-free.
  const { invokeLLM } = await import("./_core/llm");

  const system = `You are an experienced IELTS examiner marking gap-fill (completion / short-answer) responses for the Listening and Reading papers.

For each item you get the question prompt, the official accepted answer(s), and the student's answer. Decide if the student should be awarded the mark.

Mark CORRECT (true) when the student's answer conveys the same required information as ANY accepted answer, including when the student:
- adds extra leading/function words around the right phrase (e.g. accepted "a friend", student "through a friend");
- uses a reasonable synonym or equivalent phrasing of the accepted answer;
- gives the specific correct detail when the accepted answer is generic or poorly worded (e.g. accepted "Yes" but the student writes the exact experience the prompt is asking about);
- differs only in articles, capitalisation, hyphenation, or formatting.

Mark INCORRECT (false) when the student's answer:
- is empty or blank;
- contains a clear spelling mistake of the target word (IELTS penalises misspellings, e.g. "Tusday" for "Tuesday");
- states different, missing, or contradictory information;
- stuffs in content that belongs to a different blank such that this blank's required value is wrong.

Return STRICT JSON only: {"results":[{"id":<number>,"correct":<boolean>}]}. Include every id exactly once.`;

  const payload = {
    items: items.map(i => ({
      id: i.id,
      question: i.prompt,
      accepted_answers: i.acceptedAnswers,
      student_answer: i.studentAnswer,
    })),
  };

  try {
    const res = await invokeLLM({
      model: "deepseek-v4-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });
    const content = res.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : "";
    const parsed = JSON.parse(text) as {
      results?: Array<{ id: number; correct: boolean }>;
    };
    for (const r of parsed.results ?? []) {
      if (r && typeof r.id === "number" && r.correct === true) {
        correct.add(r.id);
      }
    }
  } catch (err) {
    console.error("[IELTS semantic grade] failed:", err);
  }
  return correct;
}

/**
 * Grade a full set of objective (Listening/Reading) answers: deterministic
 * matching first, then a single batched LLM pass over the completion answers
 * that failed, to award context-equivalent responses. Returns a map of
 * questionId -> isCorrect.
 */
export async function gradeObjectiveAnswers(
  questions: Array<{
    id: number;
    questionType: string;
    prompt: string;
    correctAnswers: string[];
  }>,
  answers: Array<{ questionId: number; studentAnswer: string | null }>
): Promise<Map<number, boolean>> {
  const qById = new Map(questions.map(q => [q.id, q]));
  const result = new Map<number, boolean>();
  const semanticCandidates: SemanticItem[] = [];

  for (const a of answers) {
    const q = qById.get(a.questionId);
    if (!q) continue;
    const deterministic = isAnswerCorrect(
      a.studentAnswer,
      q.correctAnswers,
      q.questionType
    );
    result.set(a.questionId, deterministic);

    if (
      !deterministic &&
      isSemanticType(q.questionType) &&
      (a.studentAnswer ?? "").trim().length > 0
    ) {
      semanticCandidates.push({
        id: a.questionId,
        prompt: q.prompt,
        acceptedAnswers: q.correctAnswers,
        studentAnswer: a.studentAnswer!.trim(),
      });
    }
  }

  if (semanticCandidates.length > 0) {
    const accepted = await semanticGradeCompletions(semanticCandidates);
    accepted.forEach(id => result.set(id, true));
  }

  return result;
}
