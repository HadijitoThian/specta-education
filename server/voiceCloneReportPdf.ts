/**
 * Voice Clone study report PDF — mirrors the branded look of the Mock Test
 * report (ieltsReportPdf.ts) but focused on Speaking:
 *   - Cover with overall band + per-criterion breakdown
 *   - Per-part sections: transcripts (yours vs Band 8), vocab/grammar/discourse
 *     upgrades tables, changes summary
 *   - Personalized action plan
 *   - Cross-sell footer (Mock + Tutor)
 *
 * Called from voiceCloneService AFTER TTS finishes but BEFORE marking session
 * "ready" so the PDF is already stored when the user's polling picks up ready.
 */

// @ts-ignore - pdfmake printer lacks types
import PdfPrinterModule from "pdfmake/js/Printer.js";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import type { VoiceCloneResult } from "./voiceCloneService";

const PdfPrinter = (PdfPrinterModule as any).default || PdfPrinterModule;

const FONTS = {
  Roboto: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const COLORS = {
  primary: "#6b21a8",   // purple-800
  accent: "#c026d3",    // fuchsia-600
  amber: "#f59e0b",
  ink: "#0f172a",
  muted: "#475569",
  subtle: "#94a3b8",
  divider: "#e2e8f0",
  panel: "#faf5ff",     // purple-50
  amberPanel: "#fef3c7",
  danger: "#dc2626",
  success: "#059669",
};

const CRITERIA_LABELS: Record<string, string> = {
  fluency: "Fluency & Coherence",
  lexical: "Lexical Resource",
  grammar: "Grammatical Range & Accuracy",
  pronunciation: "Pronunciation",
};

function bandTint(b: number): string {
  if (b >= 8) return "#d1fae5";
  if (b >= 7) return "#ecfccb";
  if (b >= 6) return "#fef3c7";
  if (b >= 5) return "#fed7aa";
  return "#fecaca";
}

function safe(s: any): string {
  if (s === null || s === undefined) return "";
  return String(s);
}

export interface VoiceCloneReportInput {
  studentName: string;
  studentEmail: string;
  completedAt: Date;
  result: VoiceCloneResult;
}

export async function renderVoiceCloneReportPdf(
  input: VoiceCloneReportInput,
): Promise<Buffer> {
  const printer = new PdfPrinter(FONTS);
  const { result, studentName, studentEmail, completedAt } = input;
  const { assessment, parts } = result;

  const dateStr = completedAt.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Cover header
  const cover: any = {
    stack: [
      {
        columns: [
          { text: "SpecTa Education", style: "brand", color: COLORS.primary, width: "*" },
          { text: dateStr, style: "small", color: COLORS.muted, alignment: "right" },
        ],
      },
      { canvas: [{ type: "line", x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 2, lineColor: COLORS.accent }], margin: [0, 4, 0, 12] },
      { text: "SpecTa Voice Clone — Band 8 Study Report", style: "h1", color: COLORS.ink },
      { text: `${studentName} · ${studentEmail}`, style: "subtle", color: COLORS.muted, margin: [0, 2, 0, 20] },
    ],
  };

  // Overall band pill + weakest highlight
  const overallCard: any = {
    table: {
      widths: ["*", "auto"],
      body: [[
        {
          stack: [
            { text: "OVERALL SPEAKING BAND", style: "eyebrow", color: COLORS.muted },
            { text: Number(assessment.overallBand).toFixed(1), fontSize: 42, bold: true, color: COLORS.primary, margin: [0, 4, 0, 0] },
            { text: `Weakest area: ${CRITERIA_LABELS[assessment.weakestCriterion] || assessment.weakestCriterion}`, style: "small", color: COLORS.danger, margin: [0, 4, 0, 0] },
          ],
        },
        {
          stack: [
            { text: "🎙️", fontSize: 42, alignment: "center" },
            { text: `${parts.length} parts analyzed`, style: "small", alignment: "center", color: COLORS.muted, margin: [0, 4, 0, 0] },
          ],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => COLORS.panel,
      paddingLeft: () => 16,
      paddingRight: () => 16,
      paddingTop: () => 16,
      paddingBottom: () => 16,
    },
    margin: [0, 0, 0, 16],
  };

  // Per-criterion breakdown
  const criteriaTable: any = {
    table: {
      widths: ["*", 60, "*"],
      headerRows: 1,
      body: [
        [
          { text: "CRITERION", style: "th", color: COLORS.muted },
          { text: "BAND", style: "th", color: COLORS.muted, alignment: "center" },
          { text: "FEEDBACK", style: "th", color: COLORS.muted },
        ],
        ...(["fluency", "lexical", "grammar", "pronunciation"] as const).map(k => {
          const c: any = (assessment as any)[k] || { band: 0, feedback: "" };
          const isWeakest = assessment.weakestCriterion === k;
          return [
            {
              text: CRITERIA_LABELS[k] + (isWeakest ? "  ⚠" : ""),
              bold: true,
              color: isWeakest ? COLORS.danger : COLORS.ink,
            },
            {
              text: Number(c.band).toFixed(1),
              alignment: "center",
              bold: true,
              fillColor: bandTint(c.band),
            },
            { text: safe(c.feedback), color: COLORS.muted, fontSize: 9 },
          ];
        }),
      ],
    },
    layout: {
      hLineWidth: (i: number) => (i === 0 || i === 1 ? 1 : 0.5),
      hLineColor: () => COLORS.divider,
      vLineWidth: () => 0,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 12],
  };

  const actionPlan: any = {
    table: {
      widths: ["*"],
      body: [[
        {
          stack: [
            { text: "🎯 YOUR PERSONALIZED ACTION PLAN", style: "eyebrow", color: COLORS.primary, margin: [0, 0, 0, 4] },
            { text: safe(assessment.actionPlan), color: COLORS.ink, fontSize: 10, lineHeight: 1.4 },
          ],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => COLORS.panel,
      paddingLeft: () => 14,
      paddingRight: () => 14,
      paddingTop: () => 12,
      paddingBottom: () => 12,
    },
    margin: [0, 0, 0, 20],
  };

  // Per-part sections
  const partSections: any[] = [];
  for (const p of parts) {
    const partLabel = p.partNumber === 1 ? "Intro & interview" : p.partNumber === 2 ? "Long turn (cue card, ~2 min)" : "Discussion";

    partSections.push(
      { text: `Part ${p.partNumber} — ${partLabel}`, style: "h2", color: COLORS.primary, pageBreak: "before", margin: [0, 0, 0, 8] },
      {
        columns: [
          { width: "auto", text: `Your answer: ${p.originalWordCount} words`, style: "small", color: COLORS.muted },
          { width: "*", text: `Band 8 target: ${p.band8WordCount} words`, style: "small", color: COLORS.success, alignment: "right" },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ["*", "*"],
          headerRows: 1,
          body: [
            [
              { text: "YOUR ORIGINAL", style: "th", color: COLORS.muted, fillColor: "#f1f5f9" },
              { text: "REWRITTEN AT BAND 8", style: "th", color: COLORS.primary, fillColor: "#faf5ff" },
            ],
            [
              { text: safe(p.originalTranscript), fontSize: 9, color: COLORS.muted, italics: true },
              { text: safe(p.band8Text), fontSize: 9, color: COLORS.ink },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 1 : 0.5),
          hLineColor: () => COLORS.divider,
          vLineWidth: () => 0.5,
          vLineColor: () => COLORS.divider,
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 12],
      },
    );

    if (p.changesSummary) {
      partSections.push({
        text: safe(p.changesSummary),
        fontSize: 9,
        italics: true,
        color: COLORS.muted,
        margin: [0, 0, 0, 12],
      });
    }

    if (p.vocabularyUpgrades?.length) {
      partSections.push(
        { text: "📖 Vocabulary Upgrades", style: "h3", color: COLORS.primary, margin: [0, 6, 0, 6] },
        {
          table: {
            widths: ["*", "*", "*"],
            headerRows: 1,
            body: [
              [
                { text: "Yours", style: "th", color: COLORS.muted, fillColor: "#f1f5f9" },
                { text: "Band 8", style: "th", color: COLORS.primary, fillColor: "#faf5ff" },
                { text: "Why", style: "th", color: COLORS.muted, fillColor: "#f1f5f9" },
              ],
              ...p.vocabularyUpgrades.map(v => [
                { text: safe(v.original), fontSize: 8, italics: true, color: COLORS.muted },
                { text: safe(v.band8), fontSize: 8, bold: true, color: COLORS.primary },
                { text: safe(v.note), fontSize: 8, color: COLORS.muted },
              ]),
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            hLineColor: () => COLORS.divider,
            vLineWidth: () => 0.5,
            vLineColor: () => COLORS.divider,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 0, 0, 12],
        },
      );
    }

    if (p.grammarUpgrades?.length) {
      partSections.push(
        { text: "✍️ Grammar Upgrades", style: "h3", color: COLORS.primary, margin: [0, 6, 0, 6] },
        {
          table: {
            widths: ["*", "*", 90],
            headerRows: 1,
            body: [
              [
                { text: "Yours", style: "th", color: COLORS.muted, fillColor: "#f1f5f9" },
                { text: "Band 8", style: "th", color: COLORS.primary, fillColor: "#faf5ff" },
                { text: "Rule", style: "th", color: COLORS.muted, fillColor: "#f1f5f9" },
              ],
              ...p.grammarUpgrades.map(g => [
                { text: safe(g.original), fontSize: 8, italics: true, color: COLORS.muted },
                { text: safe(g.band8), fontSize: 8, bold: true, color: COLORS.primary },
                { text: safe(g.rule), fontSize: 8, color: COLORS.muted },
              ]),
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            hLineColor: () => COLORS.divider,
            vLineWidth: () => 0.5,
            vLineColor: () => COLORS.divider,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 0, 0, 12],
        },
      );
    }

    if (p.discourseMarkersMissed?.length) {
      partSections.push({
        table: {
          widths: ["*"],
          body: [[
            {
              stack: [
                { text: "🔗 Discourse markers Band 8 uses (that you missed)", style: "eyebrow", color: COLORS.success, margin: [0, 0, 0, 6] },
                { text: p.discourseMarkersMissed.join(" · "), fontSize: 9, color: COLORS.ink, bold: true },
              ],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => "#ecfdf5",
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 10,
          paddingBottom: () => 10,
        },
        margin: [0, 0, 0, 12],
      });
    }
  }

  // Cross-sell footer
  const crossSell: any = {
    table: {
      widths: ["*"],
      body: [[
        {
          stack: [
            { text: "READY TO KEEP IMPROVING?", style: "eyebrow", color: COLORS.primary, alignment: "center", margin: [0, 0, 0, 6] },
            {
              text: "SpecTa AI IELTS Tutor",
              bold: true,
              alignment: "center",
              fontSize: 14,
              color: COLORS.ink,
              margin: [0, 0, 0, 4],
            },
            {
              text: "Chat + voice practice 24/7 with an AI tutor trained on official IELTS band descriptors. Rp 99k/month.",
              fontSize: 9,
              color: COLORS.muted,
              alignment: "center",
              margin: [0, 0, 0, 6],
            },
            {
              text: "→ spectaeducation.com/ielts/tutor",
              fontSize: 10,
              color: COLORS.primary,
              alignment: "center",
              bold: true,
            },
          ],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => COLORS.amberPanel,
      paddingLeft: () => 16,
      paddingRight: () => 16,
      paddingTop: () => 16,
      paddingBottom: () => 16,
    },
    margin: [0, 20, 0, 0],
    pageBreak: "before",
  };

  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 50],
    content: [
      cover,
      overallCard,
      { text: "IELTS SPEAKING BAND BREAKDOWN", style: "eyebrow", color: COLORS.muted, margin: [0, 0, 0, 6] },
      criteriaTable,
      actionPlan,
      ...partSections,
      crossSell,
    ],
    styles: {
      brand: { fontSize: 14, bold: true },
      h1: { fontSize: 22, bold: true },
      h2: { fontSize: 15, bold: true },
      h3: { fontSize: 11, bold: true },
      subtle: { fontSize: 9 },
      small: { fontSize: 9 },
      th: { fontSize: 9, bold: true },
      eyebrow: { fontSize: 9, bold: true, characterSpacing: 1 },
    },
    defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.35 },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "SpecTa Education · Voice Clone Study Report", fontSize: 8, color: COLORS.subtle, margin: [40, 20, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, fontSize: 8, color: COLORS.subtle, alignment: "right", margin: [0, 20, 40, 0] },
      ],
    }),
  };

  const pdfDoc = printer.createPdfKitDocument(doc);
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on("data", (c: Buffer) => chunks.push(c));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}
