/**
 * Question picker for standalone Voice Clone recording sessions.
 *
 * Tries the existing IELTS Speaking prompt bank first (from the Mock Test /
 * Tutor systems) so we don't duplicate curated content. Falls back to
 * hardcoded canonical IELTS-style questions if the bank is empty.
 *
 * Returns exactly 3 questions:
 *   - 1 Part 1 (intro Q&A, ~30-45s answer)
 *   - 1 Part 2 (cue card, ~1-2 min speech)
 *   - 1 Part 3 (discussion, ~30-60s answer)
 */

import { sql } from "drizzle-orm";
import { getDb } from "./db";

export interface VoiceCloneQuestion {
  partNumber: 1 | 2 | 3;
  questionText: string;
}

// Hardcoded canonical IELTS-style questions per Part.
// Real IELTS-authentic phrasing, covering common topics rotated for variety.
const FALLBACK_BANK: Record<1 | 2 | 3, string[]> = {
  1: [
    "Let's talk about your hometown. Where is it, and what do you like most about living there?",
    "Do you enjoy travelling? Tell me about a country or city you'd love to visit someday and why.",
    "How do you usually spend your weekends? Has this changed since you were a child?",
    "Tell me about a hobby or interest you've had for a long time. What made you start it?",
    "Do you prefer studying alone or in a group? Why?",
  ],
  2: [
    "Describe a memorable trip you have taken. You should say:\n- Where you went\n- Who you went with\n- What you did there\n- And explain why it was memorable for you.",
    "Describe a person who has had a big influence on your life. You should say:\n- Who this person is\n- How you know them\n- What qualities they have\n- And explain how they influenced you.",
    "Describe a skill you would like to learn. You should say:\n- What the skill is\n- How you would learn it\n- How long you think it would take\n- And explain why you'd like to learn it.",
    "Describe a book or movie that made a strong impression on you. You should say:\n- What it was about\n- When you first encountered it\n- Why you liked it\n- And explain what you learned from it.",
    "Describe a challenge you overcame recently. You should say:\n- What the challenge was\n- How you approached it\n- What you did to overcome it\n- And explain how you felt afterwards.",
  ],
  3: [
    "How do you think travel has changed in the last twenty years? Do you think these changes are mostly positive or negative?",
    "In your opinion, what role should influential people play in society? Should they have any special responsibilities?",
    "Do you think schools should focus more on teaching practical skills or academic subjects? Why?",
    "How important is it for people to keep learning new things throughout their lives? What are the main challenges adults face when they try to learn something new?",
    "How does overcoming challenges affect a person's growth? Do you think people can learn more from success or from failure?",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Try to pull one Part 1, one Part 2, one Part 3 question from the curated
 * IELTS Speaking prompt bank (either Tutor's or Mock's, whichever exists).
 * Falls back to hardcoded questions for parts with no matching bank entries.
 */
export async function pickStandaloneQuestions(): Promise<VoiceCloneQuestion[]> {
  const db = await getDb();
  const chosen: VoiceCloneQuestion[] = [];

  for (const partNumber of [1, 2, 3] as const) {
    let fromBank: string | null = null;

    if (db) {
      try {
        // Try tutor_speaking_prompts first (has "questions" JSON array per row)
        const tutorRows: any = await db.execute(sql`
          SELECT questions, cueCard FROM tutor_speaking_prompts
          WHERE partNumber = ${partNumber} AND status = 'published'
          ORDER BY RAND() LIMIT 1
        `);
        const tutorList = Array.isArray(tutorRows[0]) ? tutorRows[0] : tutorRows;
        const tutorRow = tutorList[0];
        if (tutorRow) {
          if (partNumber === 2 && tutorRow.cueCard) {
            // Part 2 = cue card. Format as a real IELTS Part 2 prompt.
            let cc: any = tutorRow.cueCard;
            if (typeof cc === "string") { try { cc = JSON.parse(cc); } catch {} }
            if (cc?.topic) {
              const bullets = Array.isArray(cc.bulletPoints) ? cc.bulletPoints.map((b: string) => `- ${b}`).join("\n") : "";
              fromBank = `${cc.topic}${bullets ? "\nYou should say:\n" + bullets : ""}`;
            }
          } else if (tutorRow.questions) {
            let qs: any = tutorRow.questions;
            if (typeof qs === "string") { try { qs = JSON.parse(qs); } catch {} }
            if (Array.isArray(qs) && qs.length > 0) {
              const q = qs[Math.floor(Math.random() * qs.length)];
              if (typeof q === "string") fromBank = q;
            }
          }
        }
      } catch {
        // table may not exist yet — fall through
      }

      // If tutor bank had nothing for this part, try the Mock Test bank
      if (!fromBank) {
        try {
          const mockRows: any = await db.execute(sql`
            SELECT questions, cueCard FROM ielts_speaking_prompts
            WHERE partNumber = ${partNumber} LIMIT 5
          `);
          const mockList = Array.isArray(mockRows[0]) ? mockRows[0] : mockRows;
          if (mockList.length > 0) {
            const row = mockList[Math.floor(Math.random() * mockList.length)];
            if (partNumber === 2 && row.cueCard) {
              let cc: any = row.cueCard;
              if (typeof cc === "string") { try { cc = JSON.parse(cc); } catch {} }
              if (cc?.topic) {
                const bullets = Array.isArray(cc.bulletPoints) ? cc.bulletPoints.map((b: string) => `- ${b}`).join("\n") : "";
                fromBank = `${cc.topic}${bullets ? "\nYou should say:\n" + bullets : ""}`;
              }
            } else if (row.questions) {
              let qs: any = row.questions;
              if (typeof qs === "string") { try { qs = JSON.parse(qs); } catch {} }
              if (Array.isArray(qs) && qs.length > 0) {
                const q = qs[Math.floor(Math.random() * qs.length)];
                if (typeof q === "string") fromBank = q;
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    chosen.push({
      partNumber,
      questionText: fromBank || pickRandom(FALLBACK_BANK[partNumber]),
    });
  }

  return chosen;
}
