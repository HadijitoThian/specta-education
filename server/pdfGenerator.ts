
// @ts-ignore - pdfmake/js/Printer lacks type declarations
import PdfPrinterModule from "pdfmake/js/Printer.js";
const PdfPrinter = (PdfPrinterModule as any).default || PdfPrinterModule;
import { storagePut } from "./storage";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { TDocumentDefinitions, Content, StyleDictionary } from "pdfmake/interfaces";

// ========== LOGO PATH ==========
const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);
const LOGO_PATH = path.join(__dirname_esm, "assets", "specta-logo.jpeg");
const LOGO_CDN_URL = "/files/migrated/oLYlgeIIkWTCNMTB.jpeg";

// ========== LABELS ==========
const riasecLabels: Record<string, { id: string; en: string; desc_id: string; desc_en: string }> = {
  R: {
    id: "Realistis", en: "Realistic",
    desc_id: "Kamu menyukai aktivitas yang melibatkan pekerjaan tangan, alat, mesin, atau alam. Kamu cenderung praktis, suka memecahkan masalah secara langsung, dan lebih memilih tindakan nyata daripada teori.",
    desc_en: "You enjoy activities involving hands-on work, tools, machines, or nature. You tend to be practical, prefer solving problems directly, and favor concrete action over abstract theory.",
  },
  I: {
    id: "Investigatif", en: "Investigative",
    desc_id: "Kamu memiliki rasa ingin tahu yang tinggi dan senang menganalisis, meneliti, serta memahami bagaimana sesuatu bekerja. Kamu menikmati pemecahan masalah yang kompleks dan berpikir kritis.",
    desc_en: "You have a strong curiosity and enjoy analyzing, researching, and understanding how things work. You thrive on complex problem-solving and critical thinking.",
  },
  A: {
    id: "Artistik", en: "Artistic",
    desc_id: "Kamu memiliki jiwa kreatif dan ekspresif. Kamu menikmati seni, desain, musik, tulisan, atau bentuk ekspresi lainnya. Kamu lebih suka lingkungan yang fleksibel dan tidak terstruktur.",
    desc_en: "You have a creative and expressive spirit. You enjoy art, design, music, writing, or other forms of expression. You prefer flexible, unstructured environments.",
  },
  S: {
    id: "Sosial", en: "Social",
    desc_id: "Kamu senang bekerja dengan orang lain, membantu, mengajar, atau membimbing. Kamu memiliki empati tinggi dan kemampuan komunikasi yang baik. Kamu merasa puas ketika bisa membuat perbedaan dalam kehidupan orang lain.",
    desc_en: "You enjoy working with others, helping, teaching, or mentoring. You have high empathy and strong communication skills. You feel fulfilled when making a difference in others' lives.",
  },
  E: {
    id: "Enterprising", en: "Enterprising",
    desc_id: "Kamu adalah pemimpin alami yang suka mengambil inisiatif, mempengaruhi orang lain, dan mengelola proyek. Kamu tertarik pada kewirausahaan, bisnis, dan peluang untuk memimpin.",
    desc_en: "You are a natural leader who enjoys taking initiative, influencing others, and managing projects. You are drawn to entrepreneurship, business, and leadership opportunities.",
  },
  C: {
    id: "Konvensional", en: "Conventional",
    desc_id: "Kamu menyukai keteraturan, data, dan sistem yang terorganisir. Kamu teliti, detail-oriented, dan bekerja dengan baik dalam lingkungan yang terstruktur dengan prosedur yang jelas.",
    desc_en: "You enjoy order, data, and organized systems. You are meticulous, detail-oriented, and work well in structured environments with clear procedures.",
  },
};

const miLabels: Record<string, { id: string; en: string; desc_id: string; desc_en: string }> = {
  linguistic: {
    id: "Linguistik", en: "Linguistic",
    desc_id: "Kemampuan menggunakan kata-kata secara efektif, baik secara lisan maupun tulisan. Kamu mahir dalam membaca, menulis, bercerita, dan menjelaskan konsep kompleks dengan jelas.",
    desc_en: "The ability to use words effectively, both orally and in writing. You excel at reading, writing, storytelling, and explaining complex concepts clearly.",
  },
  logical: {
    id: "Logis-Matematis", en: "Logical-Mathematical",
    desc_id: "Kemampuan berpikir logis, menganalisis pola, dan menyelesaikan masalah matematis. Kamu unggul dalam penalaran deduktif, pemikiran abstrak, dan pemecahan masalah sistematis.",
    desc_en: "The ability to think logically, analyze patterns, and solve mathematical problems. You excel in deductive reasoning, abstract thinking, and systematic problem-solving.",
  },
  spatial: {
    id: "Visual-Spasial", en: "Visual-Spatial",
    desc_id: "Kemampuan memvisualisasikan dan memanipulasi objek dalam ruang. Kamu berpikir dalam gambar, memiliki kesadaran spasial yang kuat, dan mahir dalam desain, navigasi, atau arsitektur.",
    desc_en: "The ability to visualize and manipulate objects in space. You think in pictures, have strong spatial awareness, and excel in design, navigation, or architecture.",
  },
  musical: {
    id: "Musikal", en: "Musical",
    desc_id: "Kemampuan memahami, menciptakan, dan mengapresiasi musik. Kamu sensitif terhadap ritme, nada, dan melodi, serta mungkin memiliki bakat dalam memainkan instrumen atau menyanyi.",
    desc_en: "The ability to understand, create, and appreciate music. You are sensitive to rhythm, pitch, and melody, and may have talent in playing instruments or singing.",
  },
  kinesthetic: {
    id: "Kinestetik", en: "Kinesthetic",
    desc_id: "Kemampuan menggunakan tubuh secara efektif untuk mengekspresikan ide atau memecahkan masalah. Kamu belajar dengan melakukan, memiliki koordinasi fisik yang baik, dan unggul dalam aktivitas yang melibatkan gerakan.",
    desc_en: "The ability to use your body effectively to express ideas or solve problems. You learn by doing, have good physical coordination, and excel in activities involving movement.",
  },
  interpersonal: {
    id: "Interpersonal", en: "Interpersonal",
    desc_id: "Kemampuan memahami dan berinteraksi secara efektif dengan orang lain. Kamu pandai membaca emosi, motivasi, dan niat orang lain, serta mahir dalam kerja tim dan kepemimpinan.",
    desc_en: "The ability to understand and interact effectively with others. You are skilled at reading others' emotions, motivations, and intentions, and excel in teamwork and leadership.",
  },
  intrapersonal: {
    id: "Intrapersonal", en: "Intrapersonal",
    desc_id: "Kemampuan memahami diri sendiri secara mendalam, termasuk emosi, kekuatan, kelemahan, dan motivasi. Kamu memiliki kesadaran diri yang tinggi dan kemampuan refleksi yang baik.",
    desc_en: "The ability to understand yourself deeply, including your emotions, strengths, weaknesses, and motivations. You have high self-awareness and strong reflective abilities.",
  },
  naturalistic: {
    id: "Naturalis", en: "Naturalistic",
    desc_id: "Kemampuan mengenali, mengkategorikan, dan memahami pola dalam alam dan lingkungan. Kamu memiliki koneksi kuat dengan alam dan tertarik pada ilmu biologi, ekologi, atau konservasi.",
    desc_en: "The ability to recognize, categorize, and understand patterns in nature and the environment. You have a strong connection to nature and interest in biology, ecology, or conservation.",
  },
};

// Big Five labels
const bigFiveLabels: Record<string, { id: string; en: string }> = {
  openness: { id: "Keterbukaan", en: "Openness" },
  conscientiousness: { id: "Kesadaran", en: "Conscientiousness" },
  extraversion: { id: "Ekstraversi", en: "Extraversion" },
  agreeableness: { id: "Keramahan", en: "Agreeableness" },
  neuroticism: { id: "Neurotisisme", en: "Neuroticism" },
};

// ========== COLORS ==========
const C = {
  navy: "#1a2744",
  navyLight: "#2a3d5f",
  teal: "#0d9488",
  tealLight: "#e0f7f5",
  tealMuted: "#5eead4",
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
  red: "#dc2626",
};

interface PdfReportData {
  studentName: string;
  language: "id" | "en";
  hollandCode: string;
  riasecScores: Record<string, number>;
  miScores: Record<string, number>;
  aiAnalysis: any;
  isPro?: boolean;
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
    margin: [0, 20, 0, 10] as [number, number, number, number],
    columns: [
      {
        canvas: [
          { type: "rect", x: 0, y: 0, w: 4, h: 22, r: 2, color: accentColor }
        ],
        width: 8,
      },
      {
        text: title.toUpperCase(),
        fontSize: 13,
        bold: true,
        color: C.dark,
        characterSpacing: 0.5,
        width: "*",
        margin: [6, 2, 0, 0] as [number, number, number, number],
      }
    ],
  };
}

function dividerLine(color?: string): Content {
  return {
    canvas: [
      { type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: color || "#e2e8f0" }
    ],
    margin: [0, 0, 0, 10] as [number, number, number, number],
  };
}

function paragraph(text: string, opts?: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean; lineHeight?: number; margin?: [number, number, number, number] }): Content {
  return {
    text: stripEmoji(text),
    fontSize: opts?.fontSize || 9.5,
    color: opts?.color || C.gray,
    bold: opts?.bold || false,
    italics: opts?.italic || false,
    lineHeight: opts?.lineHeight || 1.55,
    margin: opts?.margin || [0, 0, 0, 8] as [number, number, number, number],
  };
}

function infoBox(text: string, bgColor: string, textColor: string, borderColor?: string): Content {
  return {
    table: {
      widths: ["*"],
      body: [[{
        text: stripEmoji(text),
        fontSize: 9.5,
        color: textColor,
        lineHeight: 1.55,
        margin: [14, 12, 14, 12] as [number, number, number, number],
        border: [false, false, false, false],
      }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => bgColor,
    },
    margin: [0, 0, 0, 12] as [number, number, number, number],
  };
}

function scoreBar(label: string, score: number, barColor: string, bgColor: string, description?: string): Content {
  const barWidth = 340;
  const fillWidth = Math.max((score / 100) * barWidth, 8);
  const items: Content[] = [
    {
      columns: [
        { text: label, fontSize: 9.5, color: C.dark, width: "*", bold: true },
        { text: `${score}%`, fontSize: 9.5, color: barColor, bold: true, alignment: "right" as const, width: 40 },
      ],
    },
    {
      canvas: [
        { type: "rect", x: 0, y: 0, w: barWidth, h: 7, r: 3.5, color: bgColor },
        { type: "rect", x: 0, y: 0, w: fillWidth, h: 7, r: 3.5, color: barColor },
      ],
      margin: [0, 3, 0, 3] as [number, number, number, number],
    },
  ];
  if (description) {
    items.push({
      text: stripEmoji(description),
      fontSize: 8.5,
      color: C.grayMedium,
      lineHeight: 1.4,
      margin: [0, 0, 0, 2] as [number, number, number, number],
    });
  }
  return {
    margin: [8, 0, 8, 10] as [number, number, number, number],
    stack: items,
  };
}

function majorCard(m: any, index: number, isId: boolean): Content {
  const cs = m.compatibilityScore || 0;
  const pillColor = cs >= 85 ? C.green : cs >= 70 ? C.teal : C.amber;
  const items: Content[] = [];

  // Header: rank badge + name + score pill
  items.push({
    columns: [
      {
        table: {
          widths: [22],
          body: [[{
            text: `${index + 1}`,
            fontSize: 11,
            color: C.white,
            alignment: "center" as const,
            fillColor: C.navy,
            margin: [0, 3, 0, 3] as [number, number, number, number],
          }]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        width: 26,
      },
      { text: m.name || "", fontSize: 12, color: C.dark, bold: true, width: "*", margin: [8, 3, 0, 0] as [number, number, number, number] },
      {
        table: {
          widths: [60],
          body: [[{
            text: `${cs}% ${isId ? "cocok" : "match"}`,
            fontSize: 8.5,
            color: C.white,
            alignment: "center" as const,
            fillColor: pillColor,
            margin: [0, 3, 0, 3] as [number, number, number, number],
          }]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        width: 64,
      }
    ],
    margin: [0, 0, 0, 6] as [number, number, number, number],
  });

  // Reason / description (the main elaboration)
  if (m.reason) {
    items.push({
      text: stripEmoji(m.reason),
      fontSize: 9.5,
      color: C.gray,
      lineHeight: 1.5,
      margin: [34, 0, 0, 6] as [number, number, number, number],
    });
  }

  // Careers as pills
  if (m.careers?.length) {
    items.push({
      columns: [
        { text: isId ? "Karir: " : "Careers: ", fontSize: 8.5, color: C.teal, bold: true, width: 40 },
        { text: m.careers.join("  |  "), fontSize: 8.5, color: C.gray, width: "*" },
      ],
      margin: [34, 0, 0, 4] as [number, number, number, number],
    });
  }

  // Salary + outlook
  if (m.salaryRange || m.growthOutlook) {
    const parts: string[] = [];
    if (m.salaryRange) parts.push(`${isId ? "Gaji" : "Salary"}: ${stripEmoji(m.salaryRange)}`);
    if (m.growthOutlook) parts.push(`${isId ? "Prospek" : "Outlook"}: ${stripEmoji(m.growthOutlook)}`);
    items.push({
      text: parts.join("  |  "),
      fontSize: 8,
      color: C.grayMedium,
      margin: [34, 0, 0, 4] as [number, number, number, number],
    });
  }

  return {
    stack: items,
    margin: [0, 0, 0, 12] as [number, number, number, number],
  };
}

function bulletList(items: string[], color: string, prefix: string): Content {
  return {
    stack: items.map(item => ({
      columns: [
        { text: prefix, fontSize: 10, color: color, width: 14, bold: true },
        { text: stripEmoji(item), fontSize: 9.5, color: C.gray, lineHeight: 1.5, width: "*" },
      ],
      margin: [10, 0, 0, 5] as [number, number, number, number],
    })),
  };
}

function numberedStep(step: string, index: number): Content {
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
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        width: 22,
      },
      { text: stripEmoji(step), fontSize: 9.5, color: C.dark, lineHeight: 1.5, width: "*", margin: [6, 1, 0, 0] as [number, number, number, number] },
    ],
    margin: [0, 0, 0, 7] as [number, number, number, number],
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
  const bigFive = data.aiAnalysis?.bigFiveProfile || {};
  const sortedRiasec = Object.entries(data.riasecScores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const sortedMi = Object.entries(data.miScores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const topRiasec = sortedRiasec.slice(0, 3);
  const topMi = sortedMi.slice(0, 3);
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
      const resp = await fetch(LOGO_CDN_URL);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        logoBase64 = `data:image/jpeg;base64,${buf.toString("base64")}`;
      }
    }
  } catch (_) {}

  // ========== BUILD CONTENT ==========
  const content: Content[] = [];

  // ===================================================================
  // COVER PAGE — White background with teal/navy accents
  // ===================================================================

  // Top teal accent bar
  content.push({
    canvas: [
      { type: "rect", x: -50, y: -40, w: 595, h: 6, color: C.teal },
    ],
    absolutePosition: { x: 0, y: 0 },
  } as any);

  // Logo (on white background — no white block issue)
  if (logoBase64) {
    content.push({
      image: logoBase64,
      width: 160,
      alignment: "center" as const,
      margin: [0, 50, 0, 25] as [number, number, number, number],
    });
  }

  // Decorative teal line
  content.push({
    canvas: [
      { type: "line", x1: 170, y1: 0, x2: 325, y2: 0, lineWidth: 2.5, lineColor: C.teal },
    ],
    margin: [0, 5, 0, 20] as [number, number, number, number],
  });

  // Report type label
  content.push({
    text: isId ? "LAPORAN RESMI" : "OFFICIAL REPORT",
    fontSize: 10,
    color: C.grayMedium,
    alignment: "center" as const,
    characterSpacing: 5,
    margin: [0, 0, 0, 8] as [number, number, number, number],
  });

  // Main title
  content.push({
    text: isId ? "Tes Bakat AI" : "AI Aptitude Test",
    fontSize: 30,
    color: C.navy,
    alignment: "center" as const,
    bold: true,
    margin: [0, 0, 0, 8] as [number, number, number, number],
  });

  // Subtitle
  content.push({
    text: isId ? "Analisis Komprehensif Minat, Kecerdasan & Kepribadian" : "Comprehensive Interest, Intelligence & Personality Analysis",
    fontSize: 12,
    color: C.gray,
    alignment: "center" as const,
    margin: [0, 0, 0, 35] as [number, number, number, number],
  });

  // Student info card (navy box)
  content.push({
    table: {
      widths: [4, "*"],
      body: [[
        { text: "", fillColor: C.teal, border: [false, false, false, false] },
        {
          stack: [
            { text: isId ? "DISIAPKAN UNTUK" : "PREPARED FOR", fontSize: 8, color: C.grayLight, characterSpacing: 2, margin: [0, 0, 0, 6] as [number, number, number, number] },
            { text: data.studentName, fontSize: 22, color: C.white, bold: true, margin: [0, 0, 0, 6] as [number, number, number, number] },
            { text: dateStr, fontSize: 9, color: C.grayLight },
          ],
          fillColor: C.navy,
          margin: [14, 12, 14, 12] as [number, number, number, number],
          border: [false, false, false, false],
        }
      ]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [70, 0, 70, 20] as [number, number, number, number],
  });

  // Holland Code badge
  content.push({
    table: {
      widths: [110],
      body: [[{
        stack: [
          { text: "HOLLAND CODE", fontSize: 7, color: C.white, alignment: "center" as const, characterSpacing: 2, margin: [0, 0, 0, 4] as [number, number, number, number] },
          { text: data.hollandCode, fontSize: 28, color: C.white, alignment: "center" as const, bold: true },
        ],
        fillColor: C.teal,
        margin: [0, 8, 0, 8] as [number, number, number, number],
        border: [false, false, false, false],
      }]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 12, paddingRight: () => 12, paddingTop: () => 0, paddingBottom: () => 0 },
    alignment: "center" as const,
    margin: [180, 0, 180, 30] as [number, number, number, number],
  });

  // Top traits summary
  const topTraitsText = isId
    ? `Tipe dominan: ${topRiasec.map(([k]) => riasecLabels[k]?.id || k).join(", ")} | Kecerdasan utama: ${topMi.map(([k]) => miLabels[k]?.id || k).join(", ")}`
    : `Dominant types: ${topRiasec.map(([k]) => riasecLabels[k]?.en || k).join(", ")} | Top intelligences: ${topMi.map(([k]) => miLabels[k]?.en || k).join(", ")}`;

  content.push({
    text: topTraitsText,
    fontSize: 9,
    color: C.gray,
    alignment: "center" as const,
    lineHeight: 1.4,
    margin: [40, 0, 40, 40] as [number, number, number, number],
  });

  // Bottom contact info
  content.push({
    text: "spectaeducation.com  |  wa.me/62818218388  |  info@spectaeducation.com",
    fontSize: 8,
    color: C.grayMedium,
    alignment: "center" as const,
    margin: [0, 10, 0, 5] as [number, number, number, number],
  });
  content.push({
    text: isId ? "Dokumen ini bersifat rahasia dan hanya untuk penggunaan pribadi" : "This document is confidential and for personal use only",
    fontSize: 7,
    color: C.grayMedium,
    alignment: "center" as const,
  });

  // Bottom teal accent bar
  content.push({
    canvas: [
      { type: "rect", x: -50, y: 0, w: 595, h: 6, color: C.teal },
    ],
    absolutePosition: { x: 0, y: 836 },
  } as any);

  // ===== PAGE BREAK =====
  content.push({ text: "", pageBreak: "after" as const });

  // ===================================================================
  // PAGE 2: PERSONALITY PROFILE & BIG FIVE
  // ===================================================================

  // Personality snapshot card
  const snapTitle = stripEmoji(snapshot.title || (isId ? "Profil Anda" : "Your Profile"));
  const snapDesc = stripEmoji(snapshot.description || "");

  content.push({
    table: {
      widths: [4, "*", 85],
      body: [[
        { text: "", fillColor: C.teal, border: [false, false, false, false] },
        {
          stack: [
            { text: isId ? "PROFIL KEPRIBADIAN" : "PERSONALITY PROFILE", fontSize: 8, color: C.grayLight, characterSpacing: 2, margin: [0, 0, 0, 5] as [number, number, number, number] },
            { text: snapTitle, fontSize: 16, color: C.white, bold: true, margin: [0, 0, 0, 8] as [number, number, number, number] },
            { text: snapDesc, fontSize: 9, color: C.grayLight, lineHeight: 1.45 },
          ],
          fillColor: C.navy,
          margin: [14, 12, 10, 12] as [number, number, number, number],
          border: [false, false, false, false],
        },
        {
          stack: [
            { text: "HOLLAND CODE", fontSize: 7, color: C.grayMedium, alignment: "center" as const, characterSpacing: 1, margin: [0, 10, 0, 5] as [number, number, number, number] },
            { text: data.hollandCode, fontSize: 24, color: C.teal, alignment: "center" as const, bold: true },
          ],
          fillColor: C.navyLight,
          border: [false, false, false, false],
        }
      ]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [0, 0, 0, 16] as [number, number, number, number],
  });

  // Big Five Personality Profile
  if (bigFive && Object.keys(bigFive).length > 0) {
    content.push(sectionTitle(isId ? "Profil Kepribadian Big Five" : "Big Five Personality Profile", C.purple));
    content.push(dividerLine(C.purple));
    content.push(paragraph(
      isId
        ? "Model Big Five adalah kerangka psikologi yang paling banyak diterima secara ilmiah untuk memahami kepribadian. Berikut adalah profil kepribadian Anda berdasarkan lima dimensi utama:"
        : "The Big Five model is the most scientifically accepted psychological framework for understanding personality. Here is your personality profile across the five key dimensions:"
    ));

    for (const [trait, data_bf] of Object.entries(bigFive) as [string, any][]) {
      const label = bigFiveLabels[trait];
      if (!label || !data_bf) continue;
      const level = stripEmoji(data_bf.level || "");
      const desc = stripEmoji(data_bf.description || "");
      content.push({
        table: {
          widths: [4, "*"],
          body: [[
            { text: "", fillColor: C.purple, border: [false, false, false, false] },
            {
              stack: [
                {
                  columns: [
                    { text: isId ? label.id : label.en, fontSize: 10, color: C.dark, bold: true, width: "*" },
                    { text: level, fontSize: 9, color: C.purple, bold: true, alignment: "right" as const, width: 80 },
                  ],
                  margin: [0, 0, 0, 4] as [number, number, number, number],
                },
                { text: desc, fontSize: 9, color: C.gray, lineHeight: 1.45 },
              ],
              margin: [10, 8, 10, 8] as [number, number, number, number],
              fillColor: C.purpleLight,
              border: [false, false, false, false],
            }
          ]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        margin: [0, 0, 0, 6] as [number, number, number, number],
      });
    }
  }

  // ===================================================================
  // RIASEC ANALYSIS (detailed)
  // ===================================================================
  if (data.aiAnalysis?.riasecAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Minat & Kepribadian (RIASEC)" : "Interest & Personality Analysis (RIASEC)", C.teal));
    content.push(dividerLine(C.teal));
    content.push(paragraph(data.aiAnalysis.riasecAnalysis));
  }

  // RIASEC Scores with descriptions for top 3
  content.push(sectionTitle(isId ? "Skor RIASEC" : "RIASEC Scores", C.teal));
  content.push(dividerLine(C.teal));
  content.push(paragraph(
    isId
      ? "Skor RIASEC mengukur enam dimensi minat karir berdasarkan teori Holland. Skor yang lebih tinggi menunjukkan kecocokan yang lebih kuat dengan tipe tersebut."
      : "RIASEC scores measure six career interest dimensions based on Holland's theory. Higher scores indicate stronger alignment with that type."
  ));

  for (let i = 0; i < sortedRiasec.length; i++) {
    const [key, score] = sortedRiasec[i];
    const lbl = riasecLabels[key] || { id: key, en: key, desc_id: "", desc_en: "" };
    const label = `${isId ? lbl.id : lbl.en} (${key})`;
    // Show description for top 3 types
    const desc = i < 3 ? (isId ? lbl.desc_id : lbl.desc_en) : undefined;
    content.push(scoreBar(label, score as number, C.teal, C.tealLight, desc));
  }

  // ===================================================================
  // MI ANALYSIS (detailed)
  // ===================================================================
  if (data.aiAnalysis?.miAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Kecerdasan Majemuk" : "Multiple Intelligence Analysis", C.purple));
    content.push(dividerLine(C.purple));
    content.push(paragraph(data.aiAnalysis.miAnalysis));
  }

  // MI Scores with descriptions for top 3
  content.push(sectionTitle(isId ? "Skor Kecerdasan Majemuk" : "Multiple Intelligence Scores", C.purple));
  content.push(dividerLine(C.purple));
  content.push(paragraph(
    isId
      ? "Teori Kecerdasan Majemuk Howard Gardner mengidentifikasi delapan jenis kecerdasan. Setiap orang memiliki kombinasi unik dari kecerdasan-kecerdasan ini."
      : "Howard Gardner's Multiple Intelligence theory identifies eight types of intelligence. Each person has a unique combination of these intelligences."
  ));

  for (let i = 0; i < sortedMi.length; i++) {
    const [key, score] = sortedMi[i];
    const lbl = miLabels[key] || { id: key, en: key, desc_id: "", desc_en: "" };
    const label = isId ? lbl.id : lbl.en;
    const desc = i < 3 ? (isId ? lbl.desc_id : lbl.desc_en) : undefined;
    content.push(scoreBar(label, score as number, C.purple, C.purpleLight, desc));
  }

  // ===================================================================
  // CROSS-DIMENSIONAL INSIGHT
  // ===================================================================
  const crossAnalysis = data.aiAnalysis?.crossAnalysis || data.aiAnalysis?.crossDimensionalInsight;
  if (crossAnalysis) {
    content.push(sectionTitle(isId ? "Insight Lintas Dimensi" : "Cross-Dimensional Insight", C.teal));
    content.push(dividerLine(C.teal));
    content.push(paragraph(
      isId
        ? "Bagian ini menganalisis bagaimana kombinasi unik profil RIASEC dan Kecerdasan Majemuk Anda menciptakan kekuatan yang tidak dimiliki oleh satu dimensi saja."
        : "This section analyzes how your unique combination of RIASEC profile and Multiple Intelligences creates strengths that no single dimension alone possesses."
    ));
    content.push(infoBox(crossAnalysis, C.tealLight, C.dark));
  }

  // ===================================================================
  // SOFT SKILLS ANALYSIS
  // ===================================================================
  if (data.aiAnalysis?.softSkillsAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Soft Skills" : "Soft Skills Analysis", C.teal));
    content.push(dividerLine(C.teal));
    content.push(paragraph(
      isId
        ? "Soft skills adalah keterampilan non-teknis yang sangat penting untuk kesuksesan di dunia kerja dan akademik. Berikut adalah analisis soft skills Anda berdasarkan profil tes:"
        : "Soft skills are non-technical abilities crucial for success in both academic and professional settings. Here is your soft skills analysis based on your test profile:"
    ));
    content.push(paragraph(data.aiAnalysis.softSkillsAnalysis));
  }

  // ===================================================================
  // CREATIVE THINKING ANALYSIS
  // ===================================================================
  if (data.aiAnalysis?.creativeThinkingAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Pemikiran Kreatif" : "Creative Thinking Analysis", C.purple));
    content.push(dividerLine(C.purple));
    content.push(paragraph(
      isId
        ? "Kemampuan berpikir kreatif adalah salah satu keterampilan paling dicari di abad ke-21. Berikut adalah analisis gaya berpikir kreatif Anda:"
        : "Creative thinking ability is one of the most sought-after skills in the 21st century. Here is an analysis of your creative thinking style:"
    ));
    content.push(paragraph(data.aiAnalysis.creativeThinkingAnalysis));
  }

  // ===================================================================
  // VALUES & PRIORITIES
  // ===================================================================
  if (data.aiAnalysis?.valuesAnalysis) {
    content.push(sectionTitle(isId ? "Analisis Nilai & Prioritas" : "Values & Priorities Analysis", C.teal));
    content.push(dividerLine(C.teal));
    content.push(paragraph(
      isId
        ? "Memahami nilai-nilai inti Anda sangat penting untuk memilih karir dan jurusan yang akan memberikan kepuasan jangka panjang, bukan hanya kesuksesan finansial."
        : "Understanding your core values is essential for choosing a career and major that will provide long-term fulfillment, not just financial success."
    ));
    content.push(paragraph(data.aiAnalysis.valuesAnalysis));
  }

  // ===================================================================
  // RECOMMENDED MAJORS (expanded)
  // ===================================================================
  if (majors.length > 0) {
    content.push(sectionTitle(isId ? "Rekomendasi Jurusan" : "Recommended Majors", C.navy));
    content.push(dividerLine(C.navy));
    content.push(paragraph(
      isId
        ? `Berdasarkan analisis komprehensif profil RIASEC, Kecerdasan Majemuk, kepribadian, dan nilai-nilai Anda, berikut adalah ${majors.length} jurusan yang paling sesuai dengan potensi Anda. Setiap rekomendasi disertai dengan alasan detail mengapa jurusan tersebut cocok untuk Anda.`
        : `Based on a comprehensive analysis of your RIASEC profile, Multiple Intelligences, personality, and values, here are the ${majors.length} majors that best match your potential. Each recommendation includes a detailed explanation of why that major suits you.`
    ));

    for (let i = 0; i < majors.length; i++) {
      content.push(majorCard(majors[i], i, isId));
      if (i < majors.length - 1) {
        content.push({
          canvas: [{ type: "line", x1: 30, y1: 0, x2: 465, y2: 0, lineWidth: 0.5, lineColor: "#e2e8f0" }],
          margin: [0, 0, 0, 8] as [number, number, number, number],
        });
      }
    }
  }

  // ===================================================================
  // STRENGTHS & AREAS FOR GROWTH
  // ===================================================================
  const sw = data.aiAnalysis?.strengthsAndWeaknesses;
  if (sw) {
    content.push(sectionTitle(isId ? "Kekuatan & Area Pengembangan" : "Strengths & Areas for Growth", C.teal));
    content.push(dividerLine(C.teal));
    content.push(paragraph(
      isId
        ? "Mengenali kekuatan Anda membantu membangun kepercayaan diri, sementara memahami area pengembangan memungkinkan Anda untuk tumbuh secara strategis."
        : "Recognizing your strengths builds confidence, while understanding growth areas enables you to develop strategically."
    ));

    if (sw.strengths?.length) {
      content.push({ text: isId ? "Kekuatan Utama" : "Key Strengths", fontSize: 10.5, color: C.green, bold: true, margin: [0, 4, 0, 8] as [number, number, number, number] });
      content.push(bulletList(sw.strengths, C.green, "+"));
    }
    if (sw.areasForGrowth?.length) {
      content.push({ text: isId ? "Area Pengembangan" : "Areas for Growth", fontSize: 10.5, color: C.amber, bold: true, margin: [0, 10, 0, 8] as [number, number, number, number] });
      content.push(bulletList(sw.areasForGrowth, C.amber, ">"));
    }
  }

  // ===================================================================
  // LEARNING STYLE
  // ===================================================================
  if (data.aiAnalysis?.learningStyle) {
    content.push(sectionTitle(isId ? "Gaya Belajar" : "Learning Style", C.blue));
    content.push(dividerLine(C.blue));
    content.push(paragraph(
      isId
        ? "Memahami gaya belajar Anda akan membantu Anda memilih universitas dan program studi yang paling sesuai dengan cara Anda menyerap informasi."
        : "Understanding your learning style will help you choose universities and study programs that best match how you absorb information."
    ));
    content.push(infoBox(data.aiAnalysis.learningStyle, C.lightBg, C.dark));
  }

  // ===================================================================
  // CAREER OUTLOOK
  // ===================================================================
  if (data.aiAnalysis?.careerOutlook) {
    content.push(sectionTitle(isId ? "Prospek Karir" : "Career Outlook", C.blue));
    content.push(dividerLine(C.blue));
    content.push(paragraph(
      isId
        ? "Berdasarkan tren pasar kerja global dan profil unik Anda, berikut adalah pandangan tentang prospek karir Anda di masa depan."
        : "Based on global job market trends and your unique profile, here is an outlook on your future career prospects."
    ));
    content.push(paragraph(data.aiAnalysis.careerOutlook));
  }

  // ===================================================================
  // ACTION PLAN
  // ===================================================================
  if (data.aiAnalysis?.actionPlan?.length) {
    content.push(sectionTitle(isId ? "Langkah Selanjutnya" : "Your Action Plan", C.teal));
    content.push(dividerLine(C.teal));
    content.push(paragraph(
      isId
        ? "Berikut adalah langkah-langkah konkret yang dapat Anda ambil sekarang untuk memulai perjalanan studi Anda:"
        : "Here are concrete steps you can take now to begin your study journey:"
    ));
    for (let i = 0; i < data.aiAnalysis.actionPlan.length; i++) {
      content.push(numberedStep(data.aiAnalysis.actionPlan[i], i));
    }
  }

  // ===================================================================
  // PARENT SUMMARY
  // ===================================================================
  if (data.aiAnalysis?.parentSummary) {
    content.push(sectionTitle(isId ? "Ringkasan untuk Orang Tua" : "Parent Summary", C.gold));
    content.push(dividerLine(C.gold));
    content.push(paragraph(
      isId
        ? "Bagian ini ditujukan untuk orang tua/wali. Silakan bagikan halaman ini kepada mereka untuk membantu mereka memahami potensi dan arah karir putra/putri mereka."
        : "This section is intended for parents/guardians. Please share this page with them to help them understand their child's potential and career direction.",
      { italic: true, color: C.grayMedium }
    ));
    content.push({
      table: {
        widths: [4, "*"],
        body: [[
          { text: "", fillColor: C.gold, border: [false, false, false, false] },
          {
            text: stripEmoji(data.aiAnalysis.parentSummary),
            fontSize: 9.5,
            color: C.amber,
            lineHeight: 1.55,
            margin: [14, 12, 14, 12] as [number, number, number, number],
            border: [false, false, false, false],
          }
        ]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: (_i: number, _node: any, col: number) => col === 1 ? "#fffbeb" : null,
      },
      margin: [0, 0, 0, 16] as [number, number, number, number],
    });
  }

  // ===================================================================
  // PRO UPSELL PAGE (only for free test)
  // ===================================================================
  if (!data.isPro) {
    content.push({
      text: "",
      pageBreak: "before" as const,
    });

    // Purple gradient header background
    content.push({
      canvas: [
        { type: "rect", x: -50, y: -55, w: 595, h: 280, color: "#4338ca" },
      ],
      absolutePosition: { x: 0, y: (content.length > 20 ? 0 : 0) },
    } as any);

    // Upsell header
    content.push({
      text: isId ? "MAU TAHU LEBIH DALAM?" : "WANT TO GO DEEPER?",
      fontSize: 24,
      bold: true,
      color: C.white,
      alignment: "center" as const,
      margin: [0, 20, 0, 8] as [number, number, number, number],
    });

    content.push({
      text: isId
        ? "Upgrade ke Tes Bakat AI Pro untuk analisis 7 dimensi kepribadian secara mendalam"
        : "Upgrade to AI Aptitude Test Pro for in-depth 7-dimension personality analysis",
      fontSize: 11,
      color: "#c7d2fe",
      alignment: "center" as const,
      lineHeight: 1.4,
      margin: [30, 0, 30, 20] as [number, number, number, number],
    });

    // Discount badge
    content.push({
      columns: [
        { width: "*", text: "" },
        {
          width: "auto",
          table: {
            widths: ["auto"],
            body: [[{
              text: isId ? "PROMO TERBATAS - HEMAT Rp 20.000!" : "LIMITED OFFER - SAVE Rp 20,000!",
              fontSize: 10,
              color: C.white,
              bold: true,
              alignment: "center" as const,
              margin: [16, 6, 16, 6] as [number, number, number, number],
              border: [false, false, false, false],
            }]],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            fillColor: () => "#ef4444",
          },
        },
        { width: "*", text: "" },
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number],
    });

    // Comparison table
    const freeItems = isId
      ? ["3 bagian tes", "RIASEC dasar", "Multiple Intelligence dasar", "Analisis AI singkat", "Rekomendasi jurusan"]
      : ["3 test sections", "Basic RIASEC", "Basic Multiple Intelligence", "Brief AI analysis", "Major recommendations"];
    const proItems = isId
      ? ["7 bagian tes mendalam", "RIASEC Pro + Personality", "Multiple Intelligence lengkap", "Situational Judgment Test", "Creative & Ranking Assessment", "Laporan PDF 10+ halaman", "Analisis AI mendalam", "Rekomendasi karir & gaji"]
      : ["7 in-depth test sections", "RIASEC Pro + Personality", "Full Multiple Intelligence", "Situational Judgment Test", "Creative & Ranking Assessment", "10+ page PDF report", "Deep AI analysis", "Career & salary recommendations"];

    const maxRows = Math.max(freeItems.length, proItems.length);
    const tableBody: any[][] = [
      [
        { text: isId ? "VERSI GRATIS" : "FREE VERSION", fontSize: 9, bold: true, color: C.grayMedium, alignment: "center" as const, margin: [0, 6, 0, 6] as [number, number, number, number], border: [false, false, false, true], borderColor: ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"] },
        { text: isId ? "VERSI PRO" : "PRO VERSION", fontSize: 9, bold: true, color: "#1e1b4b", alignment: "center" as const, margin: [0, 6, 0, 6] as [number, number, number, number], border: [false, false, false, true], borderColor: ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"] },
      ],
    ];
    for (let i = 0; i < maxRows; i++) {
      tableBody.push([
        { text: freeItems[i] ? `  ${freeItems[i]}` : "", fontSize: 9, color: C.gray, margin: [0, 4, 0, 4] as [number, number, number, number], border: [false, false, false, false] },
        { text: proItems[i] ? `  ${proItems[i]}` : "", fontSize: 9, color: C.dark, bold: true, margin: [0, 4, 0, 4] as [number, number, number, number], border: [false, false, false, false] },
      ]);
    }

    content.push({
      table: {
        widths: ["*", "*"],
        body: tableBody,
      },
      layout: {
        hLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
        vLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
        hLineColor: () => "#e2e8f0",
        vLineColor: () => "#e2e8f0",
        fillColor: (rowIndex: number, _node: any, columnIndex: number) => {
          if (rowIndex === 0) return columnIndex === 1 ? "#f3f0ff" : "#f8fafc";
          return columnIndex === 1 ? "#faf5ff" : null;
        },
        paddingLeft: () => 10,
        paddingRight: () => 10,
      },
      margin: [20, 0, 20, 24] as [number, number, number, number],
    });

    // Pricing section
    content.push({
      columns: [
        { width: "*", text: "" },
        {
          width: "auto",
          stack: [
            {
              text: [
                { text: "Rp 149.000  ", fontSize: 12, color: C.grayLight, decoration: "lineThrough" as const },
                { text: "Rp 79.000  ", fontSize: 14, color: C.grayMedium, decoration: "lineThrough" as const },
              ],
              alignment: "center" as const,
              margin: [0, 0, 0, 4] as [number, number, number, number],
            },
            {
              text: "Rp 59.000",
              fontSize: 32,
              bold: true,
              color: C.purple,
              alignment: "center" as const,
              margin: [0, 0, 0, 4] as [number, number, number, number],
            },
            {
              text: isId ? "Harga promo terbatas!" : "Limited time offer!",
              fontSize: 10,
              color: C.red,
              bold: true,
              alignment: "center" as const,
              margin: [0, 0, 0, 16] as [number, number, number, number],
            },
          ],
        },
        { width: "*", text: "" },
      ],
    });

    // CTA button
    content.push({
      columns: [
        { width: "*", text: "" },
        {
          width: "auto",
          table: {
            widths: ["auto"],
            body: [[{
              text: isId ? "UPGRADE KE PRO SEKARANG" : "UPGRADE TO PRO NOW",
              fontSize: 14,
              color: C.white,
              bold: true,
              alignment: "center" as const,
              margin: [30, 12, 30, 12] as [number, number, number, number],
              border: [false, false, false, false],
            }]],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            fillColor: () => C.purple,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        },
        { width: "*", text: "" },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    });

    // URL
    content.push({
      text: "spectaeducation.com/test/pro",
      fontSize: 11,
      color: C.purple,
      bold: true,
      alignment: "center" as const,
      decoration: "underline" as const,
      link: "https://www.spectaeducation.com/test/pro",
      margin: [0, 0, 0, 16] as [number, number, number, number],
    });

    // Payment info
    content.push({
      text: isId
        ? "Pembayaran aman via Xendit  |  Hasil langsung ke email"
        : "Secure payment via Xendit  |  Results sent to your email",
      fontSize: 8.5,
      color: C.grayMedium,
      alignment: "center" as const,
      margin: [0, 0, 0, 0] as [number, number, number, number],
    });
  }

  // ===================================================================
  // BACK COVER -- CTA
  // ===================================================================
  content.push({
    text: "",
    pageBreak: "before" as const,
  });

  // Spacer to push content to center of page
  content.push({
    text: "",
    margin: [0, 180, 0, 0] as [number, number, number, number],
  });

  // Logo on back cover
  if (logoBase64) {
    content.push({
      image: logoBase64,
      width: 140,
      alignment: "center" as const,
      margin: [0, 0, 0, 30] as [number, number, number, number],
    });
  }

  content.push({
    text: isId ? "Siap Memulai Perjalanan Studi Anda?" : "Ready to Start Your Study Journey?",
    fontSize: 20,
    color: C.navy,
    bold: true,
    alignment: "center" as const,
    margin: [0, 0, 0, 12] as [number, number, number, number],
  });

  content.push({
    text: isId
      ? "Tim konselor berpengalaman kami siap membantu Anda menemukan universitas dan jurusan yang tepat.\nKonsultasi pertama GRATIS!"
      : "Our experienced counselor team is ready to help you find the right university and major.\nFirst consultation is FREE!",
    fontSize: 10,
    color: C.grayMedium,
    alignment: "center" as const,
    lineHeight: 1.5,
    margin: [30, 0, 30, 20] as [number, number, number, number],
  });

  // WhatsApp CTA - centered using columns trick
  content.push({
    columns: [
      { width: "*", text: "" },
      {
        width: "auto",
        table: {
          widths: ["auto"],
          body: [[{
            text: "WhatsApp: +62 818 218 388",
            fontSize: 13,
            color: C.white,
            bold: true,
            alignment: "center" as const,
            margin: [30, 10, 30, 10] as [number, number, number, number],
            border: [false, false, false, false],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => C.teal,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
      { width: "*", text: "" },
    ],
    margin: [0, 0, 0, 16] as [number, number, number, number],
  });

  content.push({
    text: "www.spectaeducation.com  |  info@spectaeducation.com",
    fontSize: 9,
    color: C.grayMedium,
    alignment: "center" as const,
    margin: [0, 0, 0, 40] as [number, number, number, number],
  });

  // Divider line
  content.push({
    canvas: [{ type: "line", x1: 150, y1: 0, x2: 345, y2: 0, lineWidth: 1, lineColor: C.grayLight }],
    margin: [0, 0, 0, 16] as [number, number, number, number],
  });

  // Disclaimer
  content.push({
    text: isId
      ? "Laporan ini dihasilkan oleh teknologi AI SpecTa Education dan dimaksudkan sebagai panduan profesional. Hasil tes harus diinterpretasikan bersama dengan konselor pendidikan profesional untuk mendapatkan manfaat maksimal. Semua data bersifat rahasia dan dilindungi oleh kebijakan privasi kami."
      : "This report was generated by SpecTa Education AI technology and is intended as professional guidance. Test results should be interpreted together with a professional education counselor for maximum benefit. All data is confidential and protected by our privacy policy.",
    fontSize: 7,
    color: C.grayLight,
    alignment: "center" as const,
    lineHeight: 1.4,
    margin: [40, 0, 40, 8] as [number, number, number, number],
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
    header: (currentPage: number, _pageCount: number) => {
      if (currentPage === 1) return null;
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
      if (currentPage === 1) return null;
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
