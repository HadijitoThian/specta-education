// @ts-ignore - pdfmake CJS module
import PdfPrinterModule from "pdfmake/js/Printer";
const PdfPrinter = (PdfPrinterModule as any).default || PdfPrinterModule;
import { storagePut } from "./storage";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { TDocumentDefinitions, Content, ContentColumns, ContentStack, ContentText, ContentCanvas, StyleDictionary } from "pdfmake/interfaces";

// ========== LOGO PATH ==========
const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);
const LOGO_PATH = path.join(__dirname_esm, "assets", "specta-logo.jpeg");
const LOGO_CDN_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/oLYlgeIIkWTCNMTB.jpeg";

// ========== LABELS ==========
const riasecLabels: Record<string, { id: string; en: string }> = {
  R: { id: "Realistis", en: "Realistic" },
  I: { id: "Investigatif", en: "Investigative" },
  A: { id: "Artistik", en: "Artistic" },
  S: { id: "Sosial", en: "Social" },
  E: { id: "Enterprising", en: "Enterprising" },
  C: { id: "Konvensional", en: "Conventional" },
};

const miLabels: Record<string, { id: string; en: string }> = {
  linguistic: { id: "Linguistik", en: "Linguistic" },
  logical: { id: "Logis-Matematis", en: "Logical-Mathematical" },
  spatial: { id: "Visual-Spasial", en: "Visual-Spatial" },
  musical: { id: "Musikal", en: "Musical" },
  kinesthetic: { id: "Kinestetik", en: "Kinesthetic" },
  interpersonal: { id: "Interpersonal", en: "Interpersonal" },
  intrapersonal: { id: "Intrapersonal", en: "Intrapersonal" },
  naturalistic: { id: "Naturalis", en: "Naturalistic" },
};

// ========== COLORS ==========
const C = {
  navy: "#1a2744",
  navyLight: "#2a3d5f",
  teal: "#0d9488",
  tealLight: "#e0f7f5",
  tealMuted: "#b2dfdb",
  purple: "#6d28d9",
  purpleLight: "#f3f0ff",
  dark: "#1e293b",
  gray: "#475569",
  grayMedium: "#94a3b8",
  grayLight: "#cbd5e1",
  lightBg: "#f8fafc",
  lighterBg: "#f1f5f9",
  white: "#ffffff",
  green: "#059669",
  amber: "#b45309",
  blue: "#2563eb",
  gold: "#d97706",
};

interface PdfReportData {
  studentName: string;
  language: "id" | "en";
  hollandCode: string;
  riasecScores: Record<string, number>;
  miScores: Record<string, number>;
  aiAnalysis: any;
}

// ========== Strip emoji ==========
function stripEmoji(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/[\uFE00-\uFE0F]/g, "")
    .replace(/\u200D/g, "")
    .replace(/\u20E3/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ========== pdfmake helpers ==========
function sectionTitle(title: string, accentColor: string): Content {
  return {
    margin: [0, 18, 0, 8] as [number, number, number, number],
    columns: [
      {
        canvas: [
          { type: "rect", x: 0, y: 0, w: 4, h: 20, r: 2, color: accentColor }
        ],
        width: 8,
      },
      {
        text: title,
        style: "sectionHeading",
        width: "*",
        margin: [4, 1, 0, 0] as [number, number, number, number],
      }
    ],
  };
}

function dividerLine(color?: string): Content {
  return {
    canvas: [
      { type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: color || "#e2e8f0" }
    ],
    margin: [0, 2, 0, 8] as [number, number, number, number],
  };
}

function scoreBar(label: string, score: number, barColor: string, bgColor: string): Content {
  const barWidth = 350;
  const fillWidth = Math.max((score / 100) * barWidth, 8);
  return {
    margin: [10, 0, 10, 6] as [number, number, number, number],
    stack: [
      {
        columns: [
          { text: label, fontSize: 9, color: C.dark, width: "*" },
          {
            table: {
              widths: [36],
              body: [[{
                text: `${score}%`,
                fontSize: 8,
                color: C.white,
                alignment: "center" as const,
                fillColor: barColor,
                margin: [0, 1, 0, 1] as [number, number, number, number],
              }]],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
            width: 40,
          }
        ],
      },
      {
        canvas: [
          { type: "rect", x: 0, y: 0, w: barWidth, h: 6, r: 3, color: bgColor },
          { type: "rect", x: 0, y: 0, w: fillWidth, h: 6, r: 3, color: barColor },
        ],
        margin: [0, 3, 0, 4] as [number, number, number, number],
      }
    ],
  };
}

function majorCard(m: any, index: number, isId: boolean): Content {
  const cs = m.compatibilityScore || 0;
  const pillColor = cs >= 80 ? C.green : cs >= 60 ? C.teal : C.amber;
  const items: Content[] = [];

  // Header row with rank, name, score
  items.push({
    columns: [
      {
        table: {
          widths: [20],
          body: [[{
            text: `${index + 1}`,
            fontSize: 10,
            color: C.white,
            alignment: "center" as const,
            fillColor: C.navy,
            margin: [0, 3, 0, 3] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        width: 24,
      },
      { text: m.name || "", fontSize: 12, color: C.dark, bold: true, width: "*", margin: [6, 3, 0, 0] as [number, number, number, number] },
      {
        table: {
          widths: [58],
          body: [[{
            text: `${cs}% ${isId ? "cocok" : "match"}`,
            fontSize: 8,
            color: C.white,
            alignment: "center" as const,
            fillColor: pillColor,
            margin: [0, 3, 0, 3] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        width: 62,
      }
    ],
    margin: [0, 0, 0, 4] as [number, number, number, number],
  });

  if (m.reason) {
    items.push({ text: stripEmoji(m.reason), fontSize: 9, color: C.gray, lineHeight: 1.4, margin: [30, 0, 0, 3] as [number, number, number, number] });
  }
  if (m.careers?.length) {
    items.push({
      text: [
        { text: isId ? "Karir: " : "Careers: ", fontSize: 8, color: C.teal, bold: true },
        { text: m.careers.join("  |  "), fontSize: 8, color: C.gray },
      ],
      margin: [30, 0, 0, 2] as [number, number, number, number],
    });
  }
  if (m.salaryRange || m.growthOutlook) {
    const parts: string[] = [];
    if (m.salaryRange) parts.push(`${isId ? "Gaji" : "Salary"}: ${m.salaryRange}`);
    if (m.growthOutlook) parts.push(`${isId ? "Prospek" : "Outlook"}: ${m.growthOutlook}`);
    items.push({ text: parts.join("  |  "), fontSize: 8, color: C.grayMedium, margin: [30, 0, 0, 2] as [number, number, number, number] });
  }

  return {
    stack: items,
    margin: [0, 0, 0, 10] as [number, number, number, number],
  };
}

function bulletList(items: string[], color: string, prefix: string): Content {
  return {
    stack: items.map(item => ({
      columns: [
        { text: prefix, fontSize: 10, color: color, width: 14, bold: true },
        { text: stripEmoji(item), fontSize: 9, color: C.gray, lineHeight: 1.4, width: "*" },
      ],
      margin: [10, 0, 0, 4] as [number, number, number, number],
    })),
  };
}

function actionStep(step: string, index: number): Content {
  return {
    columns: [
      {
        table: {
          widths: [18],
          body: [[{
            text: `${index + 1}`,
            fontSize: 8,
            color: C.white,
            alignment: "center" as const,
            fillColor: C.teal,
            margin: [0, 2, 0, 2] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        width: 22,
      },
      { text: stripEmoji(step), fontSize: 9.5, color: C.dark, lineHeight: 1.4, width: "*", margin: [6, 1, 0, 0] as [number, number, number, number] },
    ],
    margin: [0, 0, 0, 6] as [number, number, number, number],
  };
}

// ========== MAIN GENERATOR ==========
export async function generatePdfReport(data: PdfReportData): Promise<Buffer> {
  const printer = new PdfPrinter({
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  });

  const isId = data.language === "id";
  const snapshot = data.aiAnalysis?.personalitySnapshot || {};
  const majors = data.aiAnalysis?.recommendedMajors || [];
  const sortedRiasec = Object.entries(data.riasecScores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const sortedMi = Object.entries(data.miScores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const dateStr = new Date().toLocaleDateString(isId ? "id-ID" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Load logo as base64 (local file first, CDN fallback)
  let logoBase64 = "";
  try {
    if (fs.existsSync(LOGO_PATH)) {
      const logoBuffer = fs.readFileSync(LOGO_PATH);
      logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
    } else {
      // Fallback: fetch from CDN
      const resp = await fetch(LOGO_CDN_URL);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        logoBase64 = `data:image/jpeg;base64,${buf.toString("base64")}`;
      }
    }
  } catch (_) {}

  // ========== BUILD CONTENT ==========
  const content: Content[] = [];

  // ===== COVER PAGE =====
  // Teal top accent bar
  content.push({
    canvas: [
      { type: "rect", x: -50, y: -40, w: 595, h: 842, color: C.navy },
      { type: "rect", x: -50, y: -40, w: 595, h: 6, color: C.teal },
      { type: "rect", x: -50, y: 796, w: 595, h: 6, color: C.teal },
    ],
    absolutePosition: { x: 0, y: 0 },
  } as any);

  // Logo
  if (logoBase64) {
    content.push({
      image: logoBase64,
      width: 150,
      alignment: "center" as const,
      margin: [0, 80, 0, 20] as [number, number, number, number],
    });
  }

  // Decorative line
  content.push({
    canvas: [
      { type: "line", x1: 180, y1: 0, x2: 315, y2: 0, lineWidth: 2, lineColor: C.teal },
    ],
    margin: [0, 10, 0, 15] as [number, number, number, number],
  });

  // Title
  content.push({
    text: isId ? "LAPORAN RESMI" : "OFFICIAL REPORT",
    fontSize: 11,
    color: C.tealMuted,
    alignment: "center" as const,
    characterSpacing: 4,
    margin: [0, 0, 0, 8] as [number, number, number, number],
  });
  content.push({
    text: isId ? "Tes Bakat AI" : "AI Aptitude Test",
    fontSize: 28,
    color: C.white,
    alignment: "center" as const,
    bold: true,
    margin: [0, 0, 0, 8] as [number, number, number, number],
  });
  content.push({
    text: isId ? "Analisis Komprehensif Minat & Kecerdasan" : "Comprehensive Interest & Intelligence Analysis",
    fontSize: 13,
    color: C.grayLight,
    alignment: "center" as const,
    margin: [0, 0, 0, 30] as [number, number, number, number],
  });

  // Student info card
  content.push({
    table: {
      widths: [4, "*"],
      body: [[
        { text: "", fillColor: C.teal, border: [false, false, false, false] },
        {
          stack: [
            { text: isId ? "DISIAPKAN UNTUK" : "PREPARED FOR", fontSize: 8, color: C.grayMedium, characterSpacing: 2, margin: [0, 0, 0, 6] as [number, number, number, number] },
            { text: data.studentName, fontSize: 20, color: C.white, bold: true, margin: [0, 0, 0, 6] as [number, number, number, number] },
            { text: dateStr, fontSize: 9, color: C.grayLight },
          ],
          fillColor: C.navyLight,
          margin: [12, 10, 12, 10] as [number, number, number, number],
          border: [false, false, false, false],
        }
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [80, 0, 80, 25] as [number, number, number, number],
  });

  // Holland Code badge
  content.push({
    table: {
      widths: [100],
      body: [[{
        stack: [
          { text: "HOLLAND CODE", fontSize: 7, color: C.tealMuted, alignment: "center" as const, characterSpacing: 2, margin: [0, 0, 0, 4] as [number, number, number, number] },
          { text: data.hollandCode, fontSize: 26, color: C.white, alignment: "center" as const, bold: true },
        ],
        fillColor: C.teal,
        margin: [0, 8, 0, 8] as [number, number, number, number],
        border: [false, false, false, false],
      }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 10,
      paddingRight: () => 10,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    alignment: "center" as const,
    margin: [185, 0, 185, 40] as [number, number, number, number],
  });

  // Bottom contact info
  content.push({
    text: "spectaeducation.com  |  wa.me/6281287878055",
    fontSize: 8,
    color: C.grayMedium,
    alignment: "center" as const,
    margin: [0, 30, 0, 5] as [number, number, number, number],
  });
  content.push({
    text: isId ? "Dokumen ini bersifat rahasia dan hanya untuk penggunaan pribadi" : "This document is confidential and for personal use only",
    fontSize: 7,
    color: C.grayMedium,
    alignment: "center" as const,
  });

  // ===== PAGE BREAK =====
  content.push({ text: "", pageBreak: "after" as const });

  // ===== PERSONALITY PROFILE CARD =====
  const snapTitle = stripEmoji(snapshot.title || (isId ? "Profil Anda" : "Your Profile"));
  const snapDesc = stripEmoji((snapshot.description || "").substring(0, 300));

  content.push({
    table: {
      widths: [4, "*", 80],
      body: [[
        { text: "", fillColor: C.teal, border: [false, false, false, false] },
        {
          stack: [
            { text: isId ? "PROFIL KEPRIBADIAN" : "PERSONALITY PROFILE", fontSize: 8, color: C.tealMuted, characterSpacing: 2, margin: [0, 0, 0, 4] as [number, number, number, number] },
            { text: snapTitle, fontSize: 16, color: C.white, bold: true, margin: [0, 0, 0, 6] as [number, number, number, number] },
            { text: snapDesc, fontSize: 8.5, color: C.grayLight, lineHeight: 1.4 },
          ],
          fillColor: C.navy,
          margin: [12, 10, 8, 10] as [number, number, number, number],
          border: [false, false, false, false],
        },
        {
          stack: [
            { text: "HOLLAND CODE", fontSize: 7, color: C.grayMedium, alignment: "center" as const, characterSpacing: 1, margin: [0, 8, 0, 4] as [number, number, number, number] },
            { text: data.hollandCode, fontSize: 22, color: C.teal, alignment: "center" as const, bold: true },
          ],
          fillColor: C.navyLight,
          border: [false, false, false, false],
        }
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 15] as [number, number, number, number],
  });

  // ===== RIASEC ANALYSIS =====
  if (data.aiAnalysis?.riasecAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Minat & Kepribadian" : "Interest & Personality Analysis", C.teal));
    content.push(dividerLine());
    content.push({ text: stripEmoji(data.aiAnalysis.riasecAnalysis), fontSize: 9.5, color: C.gray, lineHeight: 1.5, margin: [0, 0, 0, 10] as [number, number, number, number] });
  }

  // ===== RIASEC SCORES =====
  content.push(sectionTitle(isId ? "Skor RIASEC" : "RIASEC Scores", C.teal));
  content.push(dividerLine(C.teal));

  for (const [key, score] of sortedRiasec) {
    const lbl = riasecLabels[key] || { id: key, en: key };
    const label = `${isId ? lbl.id : lbl.en} (${key})`;
    content.push(scoreBar(label, score as number, C.teal, C.tealLight));
  }

  // ===== MI ANALYSIS =====
  if (data.aiAnalysis?.miAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Kecerdasan Majemuk" : "Multiple Intelligence Analysis", C.purple));
    content.push(dividerLine());
    content.push({ text: stripEmoji(data.aiAnalysis.miAnalysis), fontSize: 9.5, color: C.gray, lineHeight: 1.5, margin: [0, 0, 0, 10] as [number, number, number, number] });
  }

  // ===== MI SCORES =====
  content.push(sectionTitle(isId ? "Skor Kecerdasan Majemuk" : "Multiple Intelligence Scores", C.purple));
  content.push(dividerLine(C.purple));

  for (const [key, score] of sortedMi) {
    const lbl = miLabels[key] || { id: key, en: key };
    const label = `${isId ? lbl.id : lbl.en}`;
    content.push(scoreBar(label, score as number, C.purple, C.purpleLight));
  }

  // ===== CROSS-DIMENSIONAL INSIGHT =====
  const crossAnalysis = data.aiAnalysis?.crossAnalysis || data.aiAnalysis?.crossDimensionalInsight;
  if (crossAnalysis) {
    content.push(sectionTitle(isId ? "Insight Unik Kamu" : "Your Unique Insight", C.teal));
    content.push(dividerLine());
    content.push({ text: stripEmoji(crossAnalysis), fontSize: 9.5, color: C.gray, lineHeight: 1.5, margin: [0, 0, 0, 10] as [number, number, number, number] });
  }

  // ===== SOFT SKILLS =====
  if (data.aiAnalysis?.softSkillsAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Soft Skills" : "Soft Skills Analysis", C.teal));
    content.push(dividerLine());
    content.push({ text: stripEmoji(data.aiAnalysis.softSkillsAnalysis), fontSize: 9.5, color: C.gray, lineHeight: 1.5, margin: [0, 0, 0, 10] as [number, number, number, number] });
  }

  // ===== CREATIVE THINKING =====
  if (data.aiAnalysis?.creativeThinkingAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Pemikiran Kreatif" : "Creative Thinking Analysis", C.purple));
    content.push(dividerLine());
    content.push({ text: stripEmoji(data.aiAnalysis.creativeThinkingAnalysis), fontSize: 9.5, color: C.gray, lineHeight: 1.5, margin: [0, 0, 0, 10] as [number, number, number, number] });
  }

  // ===== VALUES =====
  if (data.aiAnalysis?.valuesAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Nilai & Prioritas" : "Values & Priorities Analysis", C.teal));
    content.push(dividerLine());
    content.push({ text: stripEmoji(data.aiAnalysis.valuesAnalysis), fontSize: 9.5, color: C.gray, lineHeight: 1.5, margin: [0, 0, 0, 10] as [number, number, number, number] });
  }

  // ===== RECOMMENDED MAJORS =====
  if (majors.length > 0) {
    content.push(sectionTitle(isId ? "Rekomendasi Jurusan" : "Recommended Majors", C.navy));
    content.push(dividerLine());
    for (let i = 0; i < majors.length; i++) {
      content.push(majorCard(majors[i], i, isId));
      if (i < majors.length - 1) {
        content.push({
          canvas: [{ type: "line", x1: 15, y1: 0, x2: 480, y2: 0, lineWidth: 0.5, lineColor: "#e2e8f0" }],
          margin: [0, 0, 0, 8] as [number, number, number, number],
        });
      }
    }
  }

  // ===== STRENGTHS & AREAS FOR GROWTH =====
  const sw = data.aiAnalysis?.strengthsAndWeaknesses;
  if (sw) {
    content.push(sectionTitle(isId ? "Kekuatan & Area Pengembangan" : "Strengths & Areas for Growth", C.teal));
    content.push(dividerLine());

    if (sw.strengths?.length) {
      content.push({ text: isId ? "Kekuatan" : "Strengths", fontSize: 10, color: C.green, bold: true, margin: [0, 0, 0, 6] as [number, number, number, number] });
      content.push(bulletList(sw.strengths, C.green, "+"));
    }
    if (sw.areasForGrowth?.length) {
      content.push({ text: isId ? "Area Pengembangan" : "Areas for Growth", fontSize: 10, color: C.amber, bold: true, margin: [0, 8, 0, 6] as [number, number, number, number] });
      content.push(bulletList(sw.areasForGrowth, C.amber, ">"));
    }
  }

  // ===== LEARNING STYLE =====
  if (data.aiAnalysis?.learningStyle) {
    content.push(sectionTitle(isId ? "Gaya Belajar" : "Learning Style", C.blue));
    content.push(dividerLine());
    content.push({ text: stripEmoji(data.aiAnalysis.learningStyle), fontSize: 9.5, color: C.gray, lineHeight: 1.5, margin: [0, 0, 0, 10] as [number, number, number, number] });
  }

  // ===== CAREER OUTLOOK =====
  if (data.aiAnalysis?.careerOutlook) {
    content.push(sectionTitle(isId ? "Prospek Karir" : "Career Outlook", C.blue));
    content.push(dividerLine());
    content.push({ text: stripEmoji(data.aiAnalysis.careerOutlook), fontSize: 9.5, color: C.gray, lineHeight: 1.5, margin: [0, 0, 0, 10] as [number, number, number, number] });
  }

  // ===== ACTION PLAN =====
  if (data.aiAnalysis?.actionPlan?.length) {
    content.push(sectionTitle(isId ? "Langkah Selanjutnya" : "Action Plan", C.teal));
    content.push(dividerLine());
    for (let i = 0; i < data.aiAnalysis.actionPlan.length; i++) {
      content.push(actionStep(data.aiAnalysis.actionPlan[i], i));
    }
  }

  // ===== PARENT SUMMARY =====
  if (data.aiAnalysis?.parentSummary) {
    content.push(sectionTitle(isId ? "Ringkasan untuk Orang Tua" : "Parent Summary", C.gold));
    content.push(dividerLine(C.gold));
    content.push({
      table: {
        widths: ["*"],
        body: [[{
          text: stripEmoji(data.aiAnalysis.parentSummary),
          fontSize: 9.5,
          color: C.amber,
          lineHeight: 1.5,
          margin: [12, 10, 12, 10] as [number, number, number, number],
          border: [false, false, false, false],
        }]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => "#fffbeb",
      },
      margin: [0, 0, 0, 15] as [number, number, number, number],
    });
  }

  // ===== CTA BOX =====
  content.push({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1.5, lineColor: C.teal }],
    margin: [0, 15, 0, 15] as [number, number, number, number],
  });

  content.push({
    table: {
      widths: ["*"],
      body: [[{
        stack: [
          {
            canvas: [{ type: "rect", x: -12, y: -4, w: 519, h: 4, color: C.teal }],
          },
          {
            text: isId ? "Siap Memulai Perjalanan Studi Anda?" : "Ready to Start Your Study Journey?",
            fontSize: 14,
            color: C.white,
            bold: true,
            alignment: "center" as const,
            margin: [0, 10, 0, 8] as [number, number, number, number],
          },
          {
            text: isId
              ? "Tim konselor berpengalaman kami siap membantu Anda menemukan universitas dan jurusan yang tepat."
              : "Our experienced counselor team is ready to help you find the right university and major.",
            fontSize: 9.5,
            color: C.grayLight,
            alignment: "center" as const,
            lineHeight: 1.4,
            margin: [20, 0, 20, 10] as [number, number, number, number],
          },
          {
            text: "WhatsApp: +62 812-8787-8055",
            fontSize: 10,
            color: C.teal,
            alignment: "center" as const,
            bold: true,
            margin: [0, 0, 0, 4] as [number, number, number, number],
          },
          {
            text: "www.spectaeducation.com  |  info@spectaeducation.com",
            fontSize: 9,
            color: C.grayLight,
            alignment: "center" as const,
          },
        ],
        fillColor: C.navy,
        margin: [0, 0, 0, 0] as [number, number, number, number],
        border: [false, false, false, false],
      }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 12,
      paddingRight: () => 12,
      paddingTop: () => 4,
      paddingBottom: () => 12,
    },
    margin: [0, 0, 0, 15] as [number, number, number, number],
  });

  // Disclaimer
  content.push({
    text: isId
      ? "Laporan ini dihasilkan oleh teknologi AI SpecTa Education dan dimaksudkan sebagai panduan. Hasil tes harus diinterpretasikan bersama dengan konselor pendidikan profesional. Semua data bersifat rahasia."
      : "This report was generated by SpecTa Education AI technology and is intended as guidance. Test results should be interpreted together with a professional education counselor. All data is confidential.",
    fontSize: 7,
    color: C.grayMedium,
    alignment: "center" as const,
    lineHeight: 1.4,
    margin: [0, 0, 0, 8] as [number, number, number, number],
  });

  content.push({
    text: `\u00A9 ${new Date().getFullYear()} SpecTa Education. All rights reserved.`,
    fontSize: 7,
    color: C.grayLight,
    alignment: "center" as const,
  });

  // ========== DOCUMENT DEFINITION ==========
  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4" as const,
    pageMargins: [50, 55, 50, 55] as [number, number, number, number],
    defaultStyle: {
      font: "Helvetica",
      fontSize: 10,
      color: C.dark,
    },
    styles: {
      sectionHeading: {
        fontSize: 13,
        bold: true,
        color: C.dark,
      },
    } as StyleDictionary,
    header: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return null; // no header on cover
      return {
        stack: [
          {
            canvas: [
              { type: "rect", x: 0, y: 0, w: 595, h: 4, color: C.teal },
              { type: "rect", x: 0, y: 4, w: 595, h: 28, color: C.navy },
            ],
          },
          {
            columns: [
              { text: "SPECTA EDUCATION", fontSize: 7.5, color: C.grayLight, margin: [50, 0, 0, 0] as [number, number, number, number] },
              { text: isId ? "Laporan Tes Bakat AI" : "AI Aptitude Test Report", fontSize: 7.5, color: C.grayLight, alignment: "right" as const, margin: [0, 0, 50, 0] as [number, number, number, number] },
            ],
            margin: [0, -18, 0, 0] as [number, number, number, number],
          },
        ],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return null; // no footer on cover
      return {
        columns: [
          { text: `\u00A9 ${new Date().getFullYear()} SpecTa Education`, fontSize: 7, color: C.grayMedium, margin: [50, 0, 0, 0] as [number, number, number, number] },
          { text: "CONFIDENTIAL", fontSize: 6.5, color: C.grayMedium, alignment: "center" as const },
          { text: `${currentPage} / ${pageCount}`, fontSize: 7, color: C.grayMedium, alignment: "right" as const, margin: [0, 0, 50, 0] as [number, number, number, number] },
        ],
        margin: [0, 10, 0, 0] as [number, number, number, number],
      };
    },
    content,
    info: {
      title: `AI Aptitude Test Report - ${data.studentName}`,
      author: "SpecTa Education",
      subject: "AI Aptitude Test Results",
      creator: "SpecTa Education AI Platform",
    },
  };

  const pdfDoc = await (printer as any).createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate PDF and upload to S3, returning the public URL
 */
export async function generateAndUploadPdfReport(data: PdfReportData): Promise<string> {
  const pdfBuffer = await generatePdfReport(data);
  const suffix = crypto.randomBytes(6).toString("hex");
  const safeName = data.studentName.replace(/[^a-zA-Z0-9]/g, "-");
  const fileKey = `aptitude-reports/${safeName}-${suffix}.pdf`;

  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
  return url;
}
