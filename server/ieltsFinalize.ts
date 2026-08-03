/**
 * Finalise an IELTS mock attempt:
 *   - Compute final bands (Listening, Reading, Writing, Speaking, Overall)
 *   - Persist to ieltsMockScores
 *   - Render branded PDF report, upload to R2
 *   - Email the student the PDF + summary
 *   - Transition attempt status to "completed"
 */

import { and, eq } from "drizzle-orm";
import {
  ieltsListeningAnswers,
  ieltsListeningQuestions,
  ieltsListeningSections,
  ieltsMockAttempts,
  ieltsMockScores,
  ieltsMockTests,
  ieltsReadingAnswers,
  ieltsReadingPassages,
  ieltsReadingQuestions,
  ieltsSpeakingResponses,
  ieltsWritingResponses,
  ieltsWritingTasks,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";
import { renderIeltsReportPdf, type IeltsReportData } from "./ieltsReportPdf";
import { crossSellBlocksHtml } from "./crossSellBlocks";
import { gradeObjectiveAnswers } from "./ieltsGrading";

// ---------------------------------------------------------------------------
// Band conversion tables (official IELTS public conversions)
// ---------------------------------------------------------------------------

/** Listening Academic + General both use this table. Raw 0-40 → band. */
const LISTENING_BAND_BY_RAW: number[] = [
  // index = raw correct count
  1.0, 1.5, 2.0, 2.0, 2.5, 2.5, 3.0, 3.0, 3.5, 3.5, // 0-9
  4.0, 4.0, 4.0, 4.5, 4.5, 4.5, 5.0, 5.0, 5.5, 5.5, // 10-19
  5.5, 5.5, 5.5, 6.0, 6.0, 6.0, 6.5, 6.5, 7.0, 7.0, // 20-29
  7.0, 7.0, 7.5, 7.5, 7.5, 8.0, 8.0, 8.0, 8.5, 8.5, // 30-39
  9.0,                                              // 40
];

/** Reading Academic raw 0-40 → band. */
const READING_ACADEMIC_BAND_BY_RAW: number[] = [
  1.0, 1.5, 2.0, 2.0, 2.5, 2.5, 3.0, 3.0, 3.5, 3.5, // 0-9
  4.0, 4.0, 4.0, 4.5, 4.5, 4.5, 5.0, 5.0, 5.5, 5.5, // 10-19
  5.5, 5.5, 5.5, 6.0, 6.0, 6.0, 6.5, 6.5, 7.0, 7.0, // 20-29
  7.0, 7.0, 7.5, 7.5, 7.5, 8.0, 8.0, 8.0, 8.5, 8.5, // 30-39
  9.0,                                              // 40
];

/** Reading General Training raw 0-40 → band. Cutoffs are harder. */
const READING_GENERAL_BAND_BY_RAW: number[] = [
  0.0, 1.0, 1.0, 1.5, 1.5, 2.0, 2.0, 2.0, 2.5, 2.5, // 0-9
  3.0, 3.0, 3.0, 3.5, 3.5, 3.5, 4.0, 4.0, 4.0, 4.5, // 10-19
  4.5, 4.5, 4.5, 5.0, 5.0, 5.0, 5.5, 5.5, 6.0, 6.0, // 20-29
  6.0, 6.5, 6.5, 7.0, 7.0, 7.0, 7.5, 8.0, 8.0, 8.5, // 30-39
  9.0,                                              // 40
];

function rawToBand(raw: number, table: number[]): number {
  const clamped = Math.max(0, Math.min(40, Math.round(raw)));
  return table[clamped];
}

export function listeningRawToBand(raw: number): number {
  return rawToBand(raw, LISTENING_BAND_BY_RAW);
}

export function readingRawToBand(
  raw: number,
  testType: "academic" | "general"
): number {
  return rawToBand(
    raw,
    testType === "academic"
      ? READING_ACADEMIC_BAND_BY_RAW
      : READING_GENERAL_BAND_BY_RAW
  );
}

/** Round to nearest 0.5 in [0, 9]. */
export function roundToHalfBand(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n * 2) / 2;
  return Math.max(0, Math.min(9, rounded));
}

/** Round overall band per IELTS rule (.25 → up to next .5, .75 → up to next whole). */
export function roundOverall(n: number): number {
  if (!Number.isFinite(n)) return 0;
  // IELTS overall rounding:
  //   - .25 → up (e.g. 6.25 → 6.5)
  //   - .75 → up (e.g. 6.75 → 7.0)
  //   - otherwise nearest half-band
  const frac = n - Math.floor(n);
  let rounded: number;
  if (frac >= 0.75) rounded = Math.ceil(n);
  else if (frac >= 0.25) rounded = Math.floor(n) + 0.5;
  else rounded = Math.floor(n);
  return Math.max(0, Math.min(9, rounded));
}

// ---------------------------------------------------------------------------
// Finalisation
// ---------------------------------------------------------------------------

export type FinalizeResult = {
  attemptToken: string;
  listening: { raw: number; total: number; band: number };
  reading: { raw: number; total: number; band: number };
  writing: { band: number };
  speaking: { band: number };
  overallBand: number;
  reportPdfKey: string | null;
  emailSent: boolean;
};

export async function finalizeAttempt(
  attemptId: number
): Promise<FinalizeResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [attempt] = await db
    .select()
    .from(ieltsMockAttempts)
    .where(eq(ieltsMockAttempts.id, attemptId))
    .limit(1);
  if (!attempt) throw new Error(`Attempt ${attemptId} not found`);

  const [test] = await db
    .select()
    .from(ieltsMockTests)
    .where(eq(ieltsMockTests.id, attempt.testId))
    .limit(1);
  if (!test) throw new Error("Test not found for attempt");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, attempt.userId))
    .limit(1);

  // ---- Listening ----
  const lSections = await db
    .select({ id: ieltsListeningSections.id })
    .from(ieltsListeningSections)
    .where(eq(ieltsListeningSections.testId, attempt.testId));
  const lSectionIds = lSections.map(s => s.id);

  let listeningTotal = 0;
  let listeningRaw = 0;
  if (lSectionIds.length > 0) {
    const lQRows = await db
      .select({
        id: ieltsListeningQuestions.id,
        sectionId: ieltsListeningQuestions.sectionId,
        questionType: ieltsListeningQuestions.questionType,
        prompt: ieltsListeningQuestions.prompt,
        correctAnswers: ieltsListeningQuestions.correctAnswers,
      })
      .from(ieltsListeningQuestions);
    const ourQs = lQRows.filter(q => lSectionIds.includes(q.sectionId));
    listeningTotal = ourQs.length;
    const lAns = await db
      .select()
      .from(ieltsListeningAnswers)
      .where(eq(ieltsListeningAnswers.attemptId, attempt.id));
    // Deterministic + context-aware (LLM) grading, recomputed from the stored
    // answers (don't trust historical isCorrect, which predates fixes). Then
    // persist the result so the report's answer-review reflects it.
    const graded = await gradeObjectiveAnswers(
      ourQs.map(q => ({
        id: q.id,
        questionType: q.questionType,
        prompt: q.prompt,
        correctAnswers: (q.correctAnswers ?? []) as string[],
      })),
      lAns.map(a => ({ questionId: a.questionId, studentAnswer: a.studentAnswer }))
    );
    for (const a of lAns) {
      const ok = graded.get(a.questionId) ?? false;
      if (a.isCorrect !== ok) {
        await db
          .update(ieltsListeningAnswers)
          .set({ isCorrect: ok })
          .where(eq(ieltsListeningAnswers.id, a.id));
      }
      if (ok) listeningRaw++;
    }
  }
  const listeningBand = listeningRawToBand(listeningRaw);

  // ---- Reading ----
  const rPassages = await db
    .select({ id: ieltsReadingPassages.id })
    .from(ieltsReadingPassages)
    .where(eq(ieltsReadingPassages.testId, attempt.testId));
  const rPassageIds = rPassages.map(p => p.id);

  let readingTotal = 0;
  let readingRaw = 0;
  if (rPassageIds.length > 0) {
    const rQRows = await db
      .select({
        id: ieltsReadingQuestions.id,
        passageId: ieltsReadingQuestions.passageId,
        questionType: ieltsReadingQuestions.questionType,
        prompt: ieltsReadingQuestions.prompt,
        correctAnswers: ieltsReadingQuestions.correctAnswers,
      })
      .from(ieltsReadingQuestions);
    const ourRQs = rQRows.filter(q => rPassageIds.includes(q.passageId));
    readingTotal = ourRQs.length;
    const rAns = await db
      .select()
      .from(ieltsReadingAnswers)
      .where(eq(ieltsReadingAnswers.attemptId, attempt.id));
    const graded = await gradeObjectiveAnswers(
      ourRQs.map(q => ({
        id: q.id,
        questionType: q.questionType,
        prompt: q.prompt,
        correctAnswers: (q.correctAnswers ?? []) as string[],
      })),
      rAns.map(a => ({ questionId: a.questionId, studentAnswer: a.studentAnswer }))
    );
    for (const a of rAns) {
      const ok = graded.get(a.questionId) ?? false;
      if (a.isCorrect !== ok) {
        await db
          .update(ieltsReadingAnswers)
          .set({ isCorrect: ok })
          .where(eq(ieltsReadingAnswers.id, a.id));
      }
      if (ok) readingRaw++;
    }
  }
  const readingBand = readingRawToBand(readingRaw, test.testType);

  // ---- Writing ----
  const wTasks = await db
    .select()
    .from(ieltsWritingTasks)
    .where(eq(ieltsWritingTasks.testId, attempt.testId));
  const wResponses = await db
    .select()
    .from(ieltsWritingResponses)
    .where(eq(ieltsWritingResponses.attemptId, attempt.id));
  const writingBands = wResponses
    .map(r => (r.taskBand ? Number(r.taskBand) : null))
    .filter((n): n is number => n !== null);
  // IELTS: Task 2 weighted twice as much as Task 1.
  const t1 = wResponses.find(r =>
    wTasks.find(t => t.id === r.taskId && t.taskNumber === 1)
  );
  const t2 = wResponses.find(r =>
    wTasks.find(t => t.id === r.taskId && t.taskNumber === 2)
  );
  const t1Band = t1?.taskBand ? Number(t1.taskBand) : null;
  const t2Band = t2?.taskBand ? Number(t2.taskBand) : null;
  let writingBand = 0;
  if (t1Band !== null && t2Band !== null) {
    writingBand = roundToHalfBand((t1Band + t2Band * 2) / 3);
  } else if (writingBands.length > 0) {
    writingBand = roundToHalfBand(
      writingBands.reduce((s, n) => s + n, 0) / writingBands.length
    );
  }

  // ---- Speaking ----
  const sResponses = await db
    .select()
    .from(ieltsSpeakingResponses)
    .where(eq(ieltsSpeakingResponses.attemptId, attempt.id));
  const speakingBands = sResponses
    .map(r => (r.partBand ? Number(r.partBand) : null))
    .filter((n): n is number => n !== null);
  const speakingBand =
    speakingBands.length > 0
      ? roundToHalfBand(
          speakingBands.reduce((s, n) => s + n, 0) / speakingBands.length
        )
      : 0;

  // ---- Overall ----
  const overallBand = roundOverall(
    (listeningBand + readingBand + writingBand + speakingBand) / 4
  );

  // ---- Build report data + render PDF ----
  const writingFeedback: IeltsReportData["writing"]["taskFeedback"] = [];
  for (const task of wTasks.sort((a, b) => a.taskNumber - b.taskNumber)) {
    const resp = wResponses.find(r => r.taskId === task.id);
    if (!resp) continue;
    writingFeedback.push({
      taskNumber: task.taskNumber,
      taskBand: resp.taskBand ? Number(resp.taskBand) : null,
      scoreTA: resp.scoreTA ? Number(resp.scoreTA) : null,
      scoreCC: resp.scoreCC ? Number(resp.scoreCC) : null,
      scoreLR: resp.scoreLR ? Number(resp.scoreLR) : null,
      scoreGRA: resp.scoreGRA ? Number(resp.scoreGRA) : null,
      feedback: (resp.feedback as any) ?? null,
      wordCount: resp.wordCount,
      isTaskTwo: task.taskNumber === 2,
    });
  }

  const speakingFeedback: IeltsReportData["speaking"]["partFeedback"] = [];
  for (const r of sResponses.sort((a, b) => a.partNumber - b.partNumber)) {
    speakingFeedback.push({
      partNumber: r.partNumber,
      partBand: r.partBand ? Number(r.partBand) : null,
      scoreFC: r.scoreFC ? Number(r.scoreFC) : null,
      scoreLR: r.scoreLR ? Number(r.scoreLR) : null,
      scoreGRA: r.scoreGRA ? Number(r.scoreGRA) : null,
      scoreP: r.scoreP ? Number(r.scoreP) : null,
      feedback: (r.feedback as any) ?? null,
    });
  }

  const reportData: IeltsReportData = {
    studentName: user?.name ?? "Test Taker",
    studentEmail: user?.email ?? "",
    testCode: test.code,
    testTitle: test.title,
    testType: test.testType,
    completedAt: new Date(),
    listening: {
      band: listeningBand,
      rawScore: listeningRaw,
      totalQuestions: listeningTotal,
    },
    reading: {
      band: readingBand,
      rawScore: readingRaw,
      totalQuestions: readingTotal,
    },
    writing: {
      band: writingBand,
      taskFeedback: writingFeedback,
    },
    speaking: {
      band: speakingBand,
      partFeedback: speakingFeedback,
    },
    overallBand,
  };

  // Render + upload PDF
  let pdfKey: string | null = null;
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await renderIeltsReportPdf(reportData);
    pdfKey = `ielts/reports/${attempt.attemptToken}.pdf`;
    await storagePut(pdfKey, pdfBuffer, "application/pdf");
  } catch (err) {
    console.error("[IELTS Finalize] PDF generation failed:", err);
  }

  // Persist scores row (idempotent upsert).
  const [existingScores] = await db
    .select()
    .from(ieltsMockScores)
    .where(eq(ieltsMockScores.attemptId, attempt.id))
    .limit(1);
  if (existingScores) {
    await db
      .update(ieltsMockScores)
      .set({
        listeningBand: String(listeningBand),
        listeningRawScore: listeningRaw,
        readingBand: String(readingBand),
        readingRawScore: readingRaw,
        writingBand: String(writingBand),
        speakingBand: String(speakingBand),
        overallBand: String(overallBand),
        reportPdfKey: pdfKey,
      })
      .where(eq(ieltsMockScores.id, existingScores.id));
  } else {
    await db.insert(ieltsMockScores).values({
      attemptId: attempt.id,
      listeningBand: String(listeningBand),
      listeningRawScore: listeningRaw,
      readingBand: String(readingBand),
      readingRawScore: readingRaw,
      writingBand: String(writingBand),
      speakingBand: String(speakingBand),
      overallBand: String(overallBand),
      reportPdfKey: pdfKey,
    });
  }

  // Email the student — prefer the email entered on the purchase form, fall
  // back to the account email.
  const reportToEmail = attempt.customerEmail || user?.email;
  const reportToName = attempt.customerName || user?.name || "Student";
  let emailSent = false;
  if (reportToEmail && ENV.resendApiKey) {
    try {
      emailSent = await sendReportEmail({
        toEmail: reportToEmail,
        toName: reportToName,
        reportData,
        pdfBuffer,
        pdfUrl: pdfKey
          ? `${ENV.appUrl.replace(/\/+$/, "")}/files/${pdfKey}`
          : null,
        reportUrl: `${ENV.appUrl.replace(/\/+$/, "")}/ielts/mock-test/report/${attempt.attemptToken}`,
      });
      if (emailSent) {
        await db
          .update(ieltsMockScores)
          .set({ reportSentAt: new Date() })
          .where(eq(ieltsMockScores.attemptId, attempt.id));
      }
    } catch (err) {
      console.error("[IELTS Finalize] Email send failed:", err);
    }
  }

  // Flip status to completed.
  await db
    .update(ieltsMockAttempts)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(ieltsMockAttempts.id, attempt.id));

  return {
    attemptToken: attempt.attemptToken,
    listening: {
      raw: listeningRaw,
      total: listeningTotal,
      band: listeningBand,
    },
    reading: { raw: readingRaw, total: readingTotal, band: readingBand },
    writing: { band: writingBand },
    speaking: { band: speakingBand },
    overallBand,
    reportPdfKey: pdfKey,
    emailSent,
  };
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

async function sendReportEmail(opts: {
  toEmail: string;
  toName: string;
  reportData: IeltsReportData;
  pdfBuffer: Buffer | null;
  pdfUrl?: string | null;
  reportUrl?: string | null;
}): Promise<boolean> {
  if (!ENV.resendApiKey) return false;

  const { reportData } = opts;
  // A hosted download link guarantees the student can get the PDF even if a
  // mail provider strips the attachment.
  const downloadButton =
    opts.pdfUrl || opts.reportUrl
      ? `<div style="margin:4px 0 18px 0;"><a href="${opts.pdfUrl ?? opts.reportUrl}" style="display:inline-block;background:#4338ca;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:8px;">Download your PDF report</a></div>`
      : "";
  const bandRow = (label: string, value: number) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#475569;">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#0f172a;">${value.toFixed(1)}</td></tr>`;

  // Hardcoded absolute logo URL — same brand mark as site nav + admin.
  // Emails need HTTPS-absolute URLs and email clients treat this CDN path as
  // known-good so images render on first open (no "load images" prompt).
  const logo = "https://www.spectaeducation.com/files/migrated/QxrYSewOYzAuPIEN.jpeg";
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="text-align:center;padding:22px 24px 6px 24px;">
    <a href="https://www.spectaeducation.com" style="text-decoration:none;">
      <img src="${logo}" alt="SpecTa Education"
           width="140" height="46" border="0"
           style="height:46px;width:auto;display:inline-block;object-fit:contain;color:#4338ca;font-size:20px;font-weight:800;font-family:Arial,sans-serif;" />
    </a>
  </div>
  <div style="background:linear-gradient(135deg,#1d4ed8,#4338ca,#7c3aed);padding:28px 24px;color:#fff;">
    <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.85;">SpecTa IELTS Mock Report</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;">Your band-score report is ready</div>
  </div>
  <div style="padding:24px;color:#0f172a;">
    <p style="margin:0 0 12px 0;">Hi ${escape(opts.toName)},</p>
    <p style="margin:0 0 16px 0;color:#475569;line-height:1.6;">You finished <strong>${escape(reportData.testTitle)}</strong> (${reportData.testType === "academic" ? "Academic" : "General Training"}). Your full report is attached as a PDF (and downloadable below), and here's a quick summary:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0 20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      ${bandRow("Listening", reportData.listening.band)}
      ${bandRow("Reading", reportData.reading.band)}
      ${bandRow("Writing", reportData.writing.band)}
      ${bandRow("Speaking", reportData.speaking.band)}
      <tr><td style="padding:10px 12px;background:#0f172a;color:#facc15;font-weight:700;">Overall Band</td><td style="padding:10px 12px;background:#0f172a;color:#facc15;font-weight:700;text-align:right;font-size:18px;">${reportData.overallBand.toFixed(1)}</td></tr>
    </table>
    ${downloadButton}
    <p style="margin:0 0 8px 0;color:#475569;line-height:1.6;">Open the PDF (attached, or via the button above) to see per-criterion sub-scores and feedback for Writing and Speaking.</p>
    <p style="margin:16px 0 0 0;font-size:13px;color:#94a3b8;">Practice again or buy another attempt at <a href="${ENV.appUrl}/ielts/mock-test" style="color:#4338ca;">${ENV.appUrl}/ielts/mock-test</a>.</p>
    ${crossSellBlocksHtml({ exclude: ["mock", "practice"], appUrl: ENV.appUrl, source: "mock-report", language: "en" })}
  </div>
  <div style="padding:14px 24px;background:#f1f5f9;color:#64748b;font-size:11px;line-height:1.5;">
    This is a SpecTa Education practice mock test. It is not an official IELTS score and is not affiliated with British Council, IDP, or Cambridge Assessment English.
  </div>
</div>
</body></html>`;

  const text = `Hi ${opts.toName},

Your SpecTa IELTS Mock Report is ready.

Listening: ${reportData.listening.band.toFixed(1)}
Reading:   ${reportData.reading.band.toFixed(1)}
Writing:   ${reportData.writing.band.toFixed(1)}
Speaking:  ${reportData.speaking.band.toFixed(1)}
OVERALL:   ${reportData.overallBand.toFixed(1)}

The full PDF report is attached.${
    opts.pdfUrl || opts.reportUrl
      ? ` You can also download it here: ${opts.pdfUrl ?? opts.reportUrl}`
      : ""
  }

Take another mock test any time at ${ENV.appUrl}/ielts/mock-test.

— SpecTa Education
`;

  const attachments = opts.pdfBuffer
    ? [
        {
          filename: `SpecTa-IELTS-Mock-Report-${reportData.testCode}.pdf`,
          content: opts.pdfBuffer.toString("base64"),
          content_type: "application/pdf",
        },
      ]
    : undefined;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${ENV.resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: ENV.smtpFrom,
      to: opts.toEmail,
      subject: `Your SpecTa IELTS Mock Report — Overall Band ${reportData.overallBand.toFixed(1)}`,
      html,
      text,
      attachments,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn(`[IELTS Email] Resend failed (${res.status}): ${detail}`);
    return false;
  }
  return true;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
