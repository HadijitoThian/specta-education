import PDFDocument from "pdfkit";
import { storagePut } from "./storage";
import crypto from "crypto";

// ========== LABELS ==========
const riasecLabels: Record<string, { id: string; en: string; emoji: string }> = {
  R: { id: "Realistis", en: "Realistic", emoji: "🔧" },
  I: { id: "Investigatif", en: "Investigative", emoji: "🔬" },
  A: { id: "Artistik", en: "Artistic", emoji: "🎨" },
  S: { id: "Sosial", en: "Social", emoji: "🤝" },
  E: { id: "Enterprising", en: "Enterprising", emoji: "💼" },
  C: { id: "Konvensional", en: "Conventional", emoji: "📊" },
};

const miLabels: Record<string, { id: string; en: string; emoji: string }> = {
  linguistic: { id: "Linguistik", en: "Linguistic", emoji: "📝" },
  logical: { id: "Logis-Matematis", en: "Logical-Mathematical", emoji: "🧮" },
  spatial: { id: "Visual-Spasial", en: "Visual-Spatial", emoji: "🎯" },
  musical: { id: "Musikal", en: "Musical", emoji: "🎵" },
  kinesthetic: { id: "Kinestetik", en: "Kinesthetic", emoji: "🏃" },
  interpersonal: { id: "Interpersonal", en: "Interpersonal", emoji: "👥" },
  intrapersonal: { id: "Intrapersonal", en: "Intrapersonal", emoji: "🧘" },
  naturalistic: { id: "Naturalis", en: "Naturalistic", emoji: "🌿" },
};

// ========== COLOR PALETTE ==========
const COLORS = {
  teal: "#0d9488",
  tealLight: "#ccfbf1",
  purple: "#7c3aed",
  purpleLight: "#f5f3ff",
  dark: "#0f172a",
  gray: "#475569",
  lightGray: "#f1f5f9",
  white: "#ffffff",
  green: "#16a34a",
  greenLight: "#f0fdf4",
  blue: "#1e40af",
  blueLight: "#eff6ff",
  amber: "#92400e",
  amberLight: "#fffbeb",
  red: "#ef4444",
};

interface PdfReportData {
  studentName: string;
  language: "id" | "en";
  hollandCode: string;
  riasecScores: Record<string, number>;
  miScores: Record<string, number>;
  aiAnalysis: any;
}

function drawScoreBar(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  score: number,
  color: string
): number {
  // Label and score
  doc.fontSize(9).fillColor(COLORS.dark).text(label, x, y, { width: width - 40 });
  doc.fontSize(9).fillColor(color).text(`${score}%`, x + width - 35, y, { width: 35, align: "right" });

  // Background bar
  const barY = y + 13;
  doc.roundedRect(x, barY, width, 7, 3).fill("#e2e8f0");
  // Score bar
  const barWidth = Math.max((score / 100) * width, 5);
  doc.roundedRect(x, barY, barWidth, 7, 3).fill(color);

  return barY + 14;
}

function addSectionTitle(doc: PDFKit.PDFDocument, text: string, color: string, y: number): number {
  doc.fontSize(13).fillColor(color).text(text, 50, y);
  return y + 20;
}

function addParagraph(doc: PDFKit.PDFDocument, text: string, y: number, options?: { width?: number; x?: number }): number {
  const x = options?.x || 50;
  const width = options?.width || 495;
  doc.fontSize(9.5).fillColor(COLORS.gray);
  doc.text(text || "", x, y, { width, lineGap: 3 });
  return doc.y + 8;
}

function checkPageBreak(doc: PDFKit.PDFDocument, neededHeight: number): number {
  if (doc.y + neededHeight > 750) {
    doc.addPage();
    return 50;
  }
  return doc.y;
}

export async function generatePdfReport(data: PdfReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `AI Aptitude Test Report - ${data.studentName}`,
        Author: "SpecTa Education",
        Subject: "AI Aptitude Test Results",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const isId = data.language === "id";
    const snapshot = data.aiAnalysis?.personalitySnapshot || {};
    const majors = data.aiAnalysis?.recommendedMajors || [];
    const sortedRiasec = Object.entries(data.riasecScores).sort((a, b) => (b[1] as number) - (a[1] as number));
    const sortedMi = Object.entries(data.miScores).sort((a, b) => (b[1] as number) - (a[1] as number));

    // ===== PAGE 1: HEADER =====
    // Teal header bar
    doc.rect(0, 0, 595, 120).fill(COLORS.teal);
    doc.fontSize(10).fillColor("rgba(255,255,255,0.7)").text("SPECTA EDUCATION", 50, 30, { align: "center" });
    doc.fontSize(22).fillColor(COLORS.white).text(
      isId ? "Laporan Tes Bakat AI" : "AI Aptitude Test Report",
      50, 52, { align: "center" }
    );
    doc.fontSize(10).fillColor("rgba(255,255,255,0.8)").text(
      `${data.studentName}  •  ${new Date().toLocaleDateString(isId ? "id-ID" : "en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      50, 82, { align: "center" }
    );

    let y = 140;

    // ===== PERSONALITY SNAPSHOT =====
    doc.roundedRect(50, y, 495, 80, 10).fill(COLORS.teal);
    doc.fontSize(10).fillColor("rgba(255,255,255,0.7)").text(
      isId ? "Profil Kepribadian" : "Personality Profile", 65, y + 10
    );
    doc.fontSize(16).fillColor(COLORS.white).text(
      `${snapshot.emoji || ""} ${snapshot.title || ""}`, 65, y + 26
    );
    doc.fontSize(8.5).fillColor("rgba(255,255,255,0.85)").text(
      (snapshot.description || "").substring(0, 200), 65, y + 48, { width: 350, lineGap: 2 }
    );

    // Holland Code badge
    doc.roundedRect(430, y + 12, 100, 55, 8).fill("rgba(255,255,255,0.2)");
    doc.fontSize(8).fillColor("rgba(255,255,255,0.7)").text("Holland Code", 430, y + 18, { width: 100, align: "center" });
    doc.fontSize(22).fillColor(COLORS.white).text(data.hollandCode, 430, y + 32, { width: 100, align: "center" });

    y += 95;

    // ===== RIASEC ANALYSIS =====
    if (data.aiAnalysis?.riasecAnalysis) {
      y = checkPageBreak(doc, 80);
      y = addSectionTitle(doc, isId ? "Analisis Minat & Kepribadian" : "Interest & Personality Analysis", COLORS.teal, y);
      y = addParagraph(doc, data.aiAnalysis.riasecAnalysis, y);
    }

    // ===== RIASEC SCORES =====
    y = checkPageBreak(doc, 30 * sortedRiasec.length + 30);
    doc.roundedRect(50, y, 495, sortedRiasec.length * 24 + 30, 8).fill(COLORS.lightGray);
    y += 10;
    doc.fontSize(11).fillColor(COLORS.dark).text(
      isId ? "Skor RIASEC" : "RIASEC Scores", 65, y
    );
    y += 18;
    for (const [key, score] of sortedRiasec) {
      const label = `${riasecLabels[key]?.emoji || ""} ${isId ? riasecLabels[key]?.id : riasecLabels[key]?.en} (${key})`;
      y = drawScoreBar(doc, 65, y, 465, label, score as number, COLORS.teal);
    }
    y += 10;

    // ===== MI ANALYSIS =====
    if (data.aiAnalysis?.miAnalysis) {
      y = checkPageBreak(doc, 80);
      y = addSectionTitle(doc, isId ? "Analisis Kecerdasan" : "Intelligence Analysis", COLORS.purple, y);
      y = addParagraph(doc, data.aiAnalysis.miAnalysis, y);
    }

    // ===== MI SCORES =====
    y = checkPageBreak(doc, 30 * sortedMi.length + 30);
    doc.roundedRect(50, y, 495, sortedMi.length * 24 + 30, 8).fill(COLORS.lightGray);
    y += 10;
    doc.fontSize(11).fillColor(COLORS.dark).text(
      isId ? "Skor Kecerdasan Majemuk" : "Multiple Intelligence Scores", 65, y
    );
    y += 18;
    for (const [key, score] of sortedMi) {
      const label = `${miLabels[key]?.emoji || ""} ${isId ? miLabels[key]?.id : miLabels[key]?.en}`;
      y = drawScoreBar(doc, 65, y, 465, label, score as number, COLORS.purple);
    }
    y += 10;

    // ===== CROSS-DIMENSIONAL INSIGHT =====
    const crossAnalysis = data.aiAnalysis?.crossAnalysis || data.aiAnalysis?.crossDimensionalInsight;
    if (crossAnalysis) {
      y = checkPageBreak(doc, 80);
      doc.roundedRect(50, y, 495, 10, 8).fill(COLORS.tealLight); // will be resized
      y = addSectionTitle(doc, isId ? "Insight Unik Kamu" : "Your Unique Insight", COLORS.teal, y + 5);
      y = addParagraph(doc, crossAnalysis, y);
    }

    // ===== SOFT SKILLS ANALYSIS =====
    if (data.aiAnalysis?.softSkillsAnalysis) {
      y = checkPageBreak(doc, 80);
      y = addSectionTitle(doc, isId ? "Analisis Soft Skills" : "Soft Skills Analysis", COLORS.teal, y);
      y = addParagraph(doc, data.aiAnalysis.softSkillsAnalysis, y);
    }

    // ===== CREATIVE THINKING ANALYSIS =====
    if (data.aiAnalysis?.creativeThinkingAnalysis) {
      y = checkPageBreak(doc, 80);
      y = addSectionTitle(doc, isId ? "Analisis Pemikiran Kreatif" : "Creative Thinking Analysis", COLORS.purple, y);
      y = addParagraph(doc, data.aiAnalysis.creativeThinkingAnalysis, y);
    }

    // ===== VALUES ANALYSIS =====
    if (data.aiAnalysis?.valuesAnalysis) {
      y = checkPageBreak(doc, 80);
      y = addSectionTitle(doc, isId ? "Analisis Nilai & Prioritas" : "Values & Priorities Analysis", COLORS.teal, y);
      y = addParagraph(doc, data.aiAnalysis.valuesAnalysis, y);
    }

    // ===== RECOMMENDED MAJORS =====
    if (majors.length > 0) {
      y = checkPageBreak(doc, 60);
      y = addSectionTitle(doc, isId ? "Rekomendasi Jurusan" : "Recommended Majors", COLORS.dark, y);

      for (let i = 0; i < majors.length; i++) {
        const m = majors[i];
        y = checkPageBreak(doc, 80);

        // Major card
        doc.roundedRect(50, y, 495, 10, 6).fill(COLORS.lightGray); // placeholder, actual height varies
        doc.fontSize(11).fillColor(COLORS.dark).text(`#${i + 1} ${m.name}`, 60, y + 5);
        doc.fontSize(9).fillColor(COLORS.teal).text(
          `${m.compatibilityScore}% ${isId ? "cocok" : "match"}`,
          440, y + 6, { width: 100, align: "right" }
        );
        y += 22;
        doc.fontSize(9).fillColor(COLORS.gray).text(m.reason || "", 60, y, { width: 475, lineGap: 2 });
        y = doc.y + 5;

        // Careers
        if (m.careers?.length) {
          doc.fontSize(8).fillColor(COLORS.green);
          doc.text(`${isId ? "Karir" : "Careers"}: ${m.careers.join(" • ")}`, 60, y, { width: 475 });
          y = doc.y + 3;
        }

        // Salary & growth
        if (m.salaryRange) {
          doc.fontSize(8).fillColor(COLORS.gray);
          doc.text(`${isId ? "Gaji" : "Salary"}: ${m.salaryRange}`, 60, y, { width: 475 });
          y = doc.y + 3;
        }
        if (m.growthOutlook) {
          doc.fontSize(8).fillColor(COLORS.gray);
          doc.text(`${isId ? "Prospek" : "Outlook"}: ${m.growthOutlook}`, 60, y, { width: 475 });
          y = doc.y + 3;
        }

        y += 8;
      }
    }

    // ===== STRENGTHS & WEAKNESSES =====
    const sw = data.aiAnalysis?.strengthsAndWeaknesses;
    if (sw) {
      y = checkPageBreak(doc, 100);
      y = addSectionTitle(doc, isId ? "Kekuatan & Area Pengembangan" : "Strengths & Areas for Growth", COLORS.teal, y);

      if (sw.strengths?.length) {
        doc.fontSize(10).fillColor(COLORS.green).text(isId ? "Kekuatan:" : "Strengths:", 60, y);
        y = doc.y + 4;
        for (const s of sw.strengths) {
          y = checkPageBreak(doc, 15);
          doc.fontSize(9).fillColor(COLORS.gray).text(`  ✓  ${s}`, 60, y, { width: 475 });
          y = doc.y + 2;
        }
        y += 5;
      }

      if (sw.areasForGrowth?.length) {
        y = checkPageBreak(doc, 15);
        doc.fontSize(10).fillColor(COLORS.amber).text(isId ? "Area Pengembangan:" : "Areas for Growth:", 60, y);
        y = doc.y + 4;
        for (const a of sw.areasForGrowth) {
          y = checkPageBreak(doc, 15);
          doc.fontSize(9).fillColor(COLORS.gray).text(`  →  ${a}`, 60, y, { width: 475 });
          y = doc.y + 2;
        }
        y += 5;
      }
    }

    // ===== LEARNING STYLE =====
    if (data.aiAnalysis?.learningStyle) {
      y = checkPageBreak(doc, 60);
      y = addSectionTitle(doc, isId ? "Gaya Belajar" : "Learning Style", COLORS.blue, y);
      y = addParagraph(doc, data.aiAnalysis.learningStyle, y);
    }

    // ===== CAREER OUTLOOK =====
    if (data.aiAnalysis?.careerOutlook) {
      y = checkPageBreak(doc, 80);
      doc.roundedRect(50, y, 495, 10, 8).fill(COLORS.lightGray);
      y = addSectionTitle(doc, isId ? "Prospek Karir" : "Career Outlook", COLORS.dark, y + 5);
      y = addParagraph(doc, data.aiAnalysis.careerOutlook, y);
    }

    // ===== ACTION PLAN =====
    if (data.aiAnalysis?.actionPlan?.length) {
      y = checkPageBreak(doc, 80);
      y = addSectionTitle(doc, isId ? "Langkah Selanjutnya" : "Action Plan", COLORS.teal, y);
      for (let i = 0; i < data.aiAnalysis.actionPlan.length; i++) {
        y = checkPageBreak(doc, 15);
        doc.fontSize(9).fillColor(COLORS.dark).text(`${i + 1}. ${data.aiAnalysis.actionPlan[i]}`, 60, y, { width: 475, lineGap: 2 });
        y = doc.y + 3;
      }
      y += 5;
    }

    // ===== PARENT SUMMARY =====
    if (data.aiAnalysis?.parentSummary) {
      y = checkPageBreak(doc, 100);
      doc.roundedRect(50, y, 495, 10, 8).fill(COLORS.amberLight);
      y += 5;
      doc.fontSize(12).fillColor(COLORS.amber).text(
        isId ? "Ringkasan untuk Orang Tua" : "Parent Summary", 65, y
      );
      y += 18;
      doc.fontSize(8).fillColor(COLORS.amber).text(
        isId ? "Bagikan bagian ini kepada orang tua Anda" : "Share this section with your parents",
        65, y
      );
      y += 14;
      doc.fontSize(9.5).fillColor(COLORS.amber).text(
        data.aiAnalysis.parentSummary, 65, y, { width: 465, lineGap: 3 }
      );
      y = doc.y + 15;
    }

    // ===== FOOTER =====
    y = checkPageBreak(doc, 60);
    doc.moveTo(50, y).lineTo(545, y).strokeColor("#e2e8f0").lineWidth(1).stroke();
    y += 15;
    doc.fontSize(8).fillColor("#94a3b8").text(
      isId
        ? "Laporan ini dihasilkan oleh AI SpecTa Education. Untuk konsultasi lebih lanjut:"
        : "This report was generated by SpecTa Education AI. For further consultation:",
      50, y, { align: "center" }
    );
    y += 12;
    doc.fontSize(9).fillColor(COLORS.teal).text(
      "wa.me/6281287878055  •  spectaeducation.com",
      50, y, { align: "center" }
    );
    y += 14;
    doc.fontSize(7).fillColor("#cbd5e1").text(
      `© ${new Date().getFullYear()} SpecTa Education. All rights reserved.`,
      50, y, { align: "center" }
    );

    doc.end();
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
