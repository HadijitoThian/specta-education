/**
 * Renders the branded "SpecTa IELTS Mock Report" PDF. Inspired by the
 * official IELTS Test Report Form layout (tabular band breakdown) but
 * deliberately uses SpecTa branding — no IELTS / Cambridge / British
 * Council logos or wording — to stay clear of trademark issues.
 */

// @ts-ignore - pdfmake printer lacks types
import PdfPrinterModule from "pdfmake/js/Printer.js";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";

const PdfPrinter = (PdfPrinterModule as any).default || PdfPrinterModule;

const FONTS = {
  Roboto: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

export type IeltsReportData = {
  studentName: string;
  studentEmail: string;
  testCode: string;
  testTitle: string;
  testType: "academic" | "general";
  completedAt: Date;

  listening: {
    band: number;
    rawScore: number;
    totalQuestions: number;
  };
  reading: {
    band: number;
    rawScore: number;
    totalQuestions: number;
  };
  writing: {
    band: number;
    taskFeedback: Array<{
      taskNumber: number;
      taskBand: number | null;
      scoreTA: number | null;
      scoreCC: number | null;
      scoreLR: number | null;
      scoreGRA: number | null;
      wordCount: number;
      isTaskTwo: boolean;
      feedback: { ta?: string; cc?: string; lr?: string; gra?: string } | null;
    }>;
  };
  speaking: {
    band: number;
    partFeedback: Array<{
      partNumber: number;
      partBand: number | null;
      scoreFC: number | null;
      scoreLR: number | null;
      scoreGRA: number | null;
      scoreP: number | null;
      feedback: { fc?: string; lr?: string; gra?: string; p?: string } | null;
    }>;
  };
  overallBand: number;
};

const COLORS = {
  primary: "#1e3a8a",
  accent: "#f59e0b",
  ink: "#0f172a",
  muted: "#475569",
  subtle: "#94a3b8",
  divider: "#e2e8f0",
  panel: "#f8fafc",
};

function band(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

export async function renderIeltsReportPdf(
  data: IeltsReportData
): Promise<Buffer> {
  const printer = new PdfPrinter(FONTS);

  const dateStr = data.completedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const headerBand: Content = {
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              {
                text: "SpecTa IELTS Mock Report",
                style: "brandSmall",
              },
              { text: "Band Score Report", style: "brandBig", margin: [0, 2, 0, 0] },
              {
                text: `${data.testTitle} · ${data.testType === "academic" ? "Academic" : "General Training"} · Code ${data.testCode}`,
                style: "brandSub",
                margin: [0, 6, 0, 0],
              },
            ],
            fillColor: COLORS.primary,
            color: "#fff",
            margin: [22, 22, 22, 22],
            border: [false, false, false, false],
          },
        ],
      ],
    },
    layout: { defaultBorder: false },
  };

  const studentBlock: Content = {
    columns: [
      [
        { text: "Test taker", style: "label" },
        { text: data.studentName, style: "value" },
      ],
      [
        { text: "Email", style: "label" },
        { text: data.studentEmail || "—", style: "value" },
      ],
      [
        { text: "Completed", style: "label" },
        { text: dateStr, style: "value" },
      ],
    ],
    columnGap: 16,
    margin: [22, 18, 22, 14],
  };

  const bandTable: Content = {
    table: {
      widths: ["*", 80, 80],
      body: [
        [
          { text: "Skill", style: "tableHeader" },
          { text: "Raw / Notes", style: "tableHeader", alignment: "right" },
          { text: "Band", style: "tableHeader", alignment: "right" },
        ],
        [
          { text: "Listening", style: "skill" },
          {
            text: `${data.listening.rawScore} / ${data.listening.totalQuestions}`,
            style: "raw",
            alignment: "right",
          },
          { text: band(data.listening.band), style: "bandCell", alignment: "right" },
        ],
        [
          { text: "Reading", style: "skill" },
          {
            text: `${data.reading.rawScore} / ${data.reading.totalQuestions}`,
            style: "raw",
            alignment: "right",
          },
          { text: band(data.reading.band), style: "bandCell", alignment: "right" },
        ],
        [
          { text: "Writing", style: "skill" },
          {
            text: "AI-graded",
            style: "raw",
            alignment: "right",
          },
          { text: band(data.writing.band), style: "bandCell", alignment: "right" },
        ],
        [
          { text: "Speaking", style: "skill" },
          {
            text: "AI-graded",
            style: "raw",
            alignment: "right",
          },
          { text: band(data.speaking.band), style: "bandCell", alignment: "right" },
        ],
      ],
    },
    layout: {
      hLineColor: () => COLORS.divider,
      vLineColor: () => COLORS.divider,
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
    },
    margin: [22, 0, 22, 8],
  };

  const overallBox: Content = {
    table: {
      widths: ["*", 100],
      body: [
        [
          {
            text: "Overall Band",
            fillColor: COLORS.ink,
            color: "#fff",
            margin: [12, 12, 12, 12],
            border: [false, false, false, false],
            fontSize: 14,
            bold: true,
          },
          {
            text: band(data.overallBand),
            fillColor: COLORS.ink,
            color: COLORS.accent,
            alignment: "right",
            margin: [12, 8, 12, 8],
            border: [false, false, false, false],
            fontSize: 26,
            bold: true,
          },
        ],
      ],
    },
    layout: { defaultBorder: false },
    margin: [22, 4, 22, 20],
  };

  // ----- Writing detail -----
  const writingDetail: Content[] = [
    { text: "Writing — per-task breakdown", style: "h2", margin: [22, 12, 22, 8] },
  ];
  for (const t of data.writing.taskFeedback) {
    writingDetail.push({
      table: {
        widths: ["*", "*", "*", "*"],
        body: [
          [
            { text: `Task ${t.taskNumber}`, style: "subHeader", colSpan: 4 },
            {},
            {},
            {},
          ],
          [
            { text: t.isTaskTwo ? "Task Response" : "Task Achievement", style: "criterion" },
            { text: "Coherence & Cohesion", style: "criterion" },
            { text: "Lexical Resource", style: "criterion" },
            { text: "Grammatical Range & Accuracy", style: "criterion" },
          ],
          [
            { text: band(t.scoreTA), style: "subBand", alignment: "center" },
            { text: band(t.scoreCC), style: "subBand", alignment: "center" },
            { text: band(t.scoreLR), style: "subBand", alignment: "center" },
            { text: band(t.scoreGRA), style: "subBand", alignment: "center" },
          ],
        ],
      },
      layout: {
        hLineColor: () => COLORS.divider,
        vLineColor: () => COLORS.divider,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
      margin: [22, 0, 22, 6],
    });
    if (t.feedback) {
      writingDetail.push({
        stack: [
          feedbackLine("Task Resp.", t.feedback.ta),
          feedbackLine("Coh./Coh.", t.feedback.cc),
          feedbackLine("Lex. Res.", t.feedback.lr),
          feedbackLine("Gram.", t.feedback.gra),
        ],
        margin: [22, 0, 22, 10],
      });
    }
  }

  // ----- Speaking detail -----
  const speakingDetail: Content[] = [
    { text: "Speaking — per-part breakdown", style: "h2", margin: [22, 6, 22, 8] },
  ];
  for (const p of data.speaking.partFeedback) {
    speakingDetail.push({
      table: {
        widths: ["*", "*", "*", "*"],
        body: [
          [
            { text: `Part ${p.partNumber}`, style: "subHeader", colSpan: 4 },
            {},
            {},
            {},
          ],
          [
            { text: "Fluency & Coherence", style: "criterion" },
            { text: "Lexical Resource", style: "criterion" },
            { text: "Grammatical R&A", style: "criterion" },
            { text: "Pronunciation*", style: "criterion" },
          ],
          [
            { text: band(p.scoreFC), style: "subBand", alignment: "center" },
            { text: band(p.scoreLR), style: "subBand", alignment: "center" },
            { text: band(p.scoreGRA), style: "subBand", alignment: "center" },
            { text: band(p.scoreP), style: "subBand", alignment: "center" },
          ],
        ],
      },
      layout: {
        hLineColor: () => COLORS.divider,
        vLineColor: () => COLORS.divider,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
      margin: [22, 0, 22, 6],
    });
    if (p.feedback) {
      speakingDetail.push({
        stack: [
          feedbackLine("Flu./Coh.", p.feedback.fc),
          feedbackLine("Lex. Res.", p.feedback.lr),
          feedbackLine("Gram.", p.feedback.gra),
          feedbackLine("Pron.", p.feedback.p),
        ],
        margin: [22, 0, 22, 10],
      });
    }
  }
  speakingDetail.push({
    text:
      "* Pronunciation is estimated from transcript fluency markers — an audio examiner would assess it directly.",
    style: "footnote",
    margin: [22, 2, 22, 8],
  });

  const disclaimer: Content = {
    text:
      "This is a SpecTa Education practice mock test. It is not an official IELTS score and is not affiliated with British Council, IDP, or Cambridge Assessment English. Use this report to prepare for the real IELTS exam.",
    style: "disclaimer",
    margin: [22, 12, 22, 22],
  };

  const docDef: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [0, 0, 0, 22],
    content: [
      headerBand,
      studentBlock,
      bandTable,
      overallBox,
      ...writingDetail,
      ...speakingDetail,
      disclaimer,
    ],
    styles: {
      brandSmall: {
        fontSize: 9,
        characterSpacing: 1.4,
        color: "rgba(255,255,255,0.85)",
      },
      brandBig: { fontSize: 22, bold: true, color: "#fff" },
      brandSub: { fontSize: 11, color: "#cbd5e1" },
      label: { fontSize: 9, color: COLORS.subtle, characterSpacing: 0.6 },
      value: { fontSize: 12, color: COLORS.ink, bold: true, margin: [0, 2, 0, 0] },
      tableHeader: {
        fontSize: 10,
        color: COLORS.subtle,
        bold: true,
        margin: [10, 8, 10, 8],
      },
      skill: { fontSize: 12, color: COLORS.ink, bold: true, margin: [10, 10, 10, 10] },
      raw: { fontSize: 11, color: COLORS.muted, margin: [10, 12, 10, 10] },
      bandCell: { fontSize: 16, color: COLORS.primary, bold: true, margin: [10, 8, 12, 8] },
      h2: { fontSize: 14, bold: true, color: COLORS.ink },
      subHeader: { fontSize: 11, color: COLORS.muted, bold: true, margin: [8, 6, 8, 4] },
      criterion: { fontSize: 9, color: COLORS.subtle, margin: [6, 4, 6, 2] },
      subBand: { fontSize: 14, bold: true, color: COLORS.primary, margin: [4, 4, 4, 6] },
      footnote: { fontSize: 8, color: COLORS.subtle, italics: true },
      disclaimer: { fontSize: 8, color: COLORS.subtle, alignment: "center" },
    },
    defaultStyle: { font: "Roboto", fontSize: 10, color: COLORS.ink },
  };

  // pdfmake 0.3.x: createPdfKitDocument returns an OutputDocument whose
  // getBuffer() resolves to a Buffer. (The old 0.2.x API returned a raw
  // PDFKit stream with .on('data'/'end') — that no longer exists, which was
  // silently failing report-PDF generation.)
  // pdfmake 0.3.x: createPdfKitDocument is ASYNC and resolves to a PDFKit
  // document (a readable stream). The previous code never awaited it, so
  // `pdfDoc` was a Promise with no `.on` — silently failing every report PDF.
  const pdfDoc: any = await printer.createPdfKitDocument(docDef);
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", (err: any) => reject(err));
    pdfDoc.end();
  });
}

function feedbackLine(label: string, text: string | undefined): Content {
  if (!text) return { text: "" };
  return {
    text: [
      { text: `${label}:  `, bold: true, color: COLORS.muted },
      { text, color: COLORS.ink },
    ],
    fontSize: 10,
    lineHeight: 1.35,
    margin: [0, 0, 0, 4],
  };
}
