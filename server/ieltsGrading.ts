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

  // Completion / short-answer: normalised free-text comparison.
  const stNorm = normalizeAnswerText(st);
  return correctAnswers.some(c => normalizeAnswerText(c) === stNorm);
}
