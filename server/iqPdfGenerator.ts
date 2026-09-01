/**
 * SpecTa IQ Discovery — PDF report generator.
 *
 * Produces a ~6-7 page premium-feeling PDF report using pdfmake. Sections:
 *   1. Cover — big score, archetype, student name, date
 *   2. Radar chart of 5 dimensions (SVG rendered inline)
 *   3. Overall AI narrative summary
 *   4. Per-domain deep dives
 *   5. Strengths + growth areas
 *   6. Career recommendations
 *   7. Legal disclaimer + closing
 *
 * Kept lean — pdfmake pattern matches server/pdfGenerator.ts and
 * server/voiceCloneReportPdf.ts for consistency.
 */

// @ts-ignore - pdfmake/js/Printer lacks type declarations
import PdfPrinterModule from "pdfmake/js/Printer.js";
const PdfPrinter = (PdfPrinterModule as any).default || PdfPrinterModule;
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { TDocumentDefinitions, Content, StyleDictionary } from "pdfmake/interfaces";

import type { IqScoreResult, IqDomain } from "./iqQuestionTypes";
import type { IqNarrative } from "./iqFeedbackEngine";

// ── Brand palette ────────────────────────────────────────────────────────
const C = {
  indigoDeep: "#1e1b4b",     // hero background
  indigoStrong: "#6366f1",
  purple: "#a855f7",
  fuchsia: "#ec4899",
  amber: "#f59e0b",
  green: "#10b981",
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  white: "#ffffff",
};

// ── Logo (best-effort) ───────────────────────────────────────────────────
const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);
const LOGO_PATH = path.join(__dirname_esm, "assets", "specta-logo.jpeg");

function loadLogoBase64(): string | null {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      const buf = fs.readFileSync(LOGO_PATH);
      return `data:image/jpeg;base64,${buf.toString("base64")}`;
    }
  } catch { /* ignore */ }
  return null;
}

// ── Radar chart as SVG (inline into PDF) ─────────────────────────────────
function buildRadarSvg(perDomain: Record<IqDomain, { scaledBand: number }>): string {
  const domains: IqDomain[] = ["fluid", "quantitative", "verbal", "spatial", "memory"];
  const labels: Record<IqDomain, string> = {
    fluid: "Logika",
    quantitative: "Angka",
    verbal: "Verbal",
    spatial: "Spasial",
    memory: "Memori",
  };
  const cx = 200, cy = 200, maxR = 130, maxBand = 17;
  const angleFor = (i: number) => (Math.PI * 2 * i) / domains.length - Math.PI / 2;
  const point = (i: number, r: number) => ({ x: cx + r * Math.cos(angleFor(i)), y: cy + r * Math.sin(angleFor(i)) });

  // 4 concentric grid rings
  const rings = [0.25, 0.5, 0.75, 1].map(f => domains.map((_, i) => point(i, maxR * f)).map(p => `${p.x},${p.y}`).join(" "));

  // Data polygon
  const dataPts = domains.map((d, i) => {
    const band = Math.max(0, Math.min(maxBand, perDomain[d]?.scaledBand ?? 0));
    return point(i, (band / maxBand) * maxR);
  });
  const dataPoly = dataPts.map(p => `${p.x},${p.y}`).join(" ");

  // Axis lines + labels
  const axes = domains.map((d, i) => {
    const p = point(i, maxR);
    const lp = point(i, maxR + 25);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="${C.slate200}" stroke-width="1" />
      <text x="${lp.x}" y="${lp.y}" text-anchor="middle" alignment-baseline="middle" font-size="12" font-weight="700" fill="${C.slate700}">${labels[d]}</text>
      <text x="${lp.x}" y="${lp.y + 14}" text-anchor="middle" alignment-baseline="middle" font-size="11" fill="${C.slate400}">${perDomain[d]?.scaledBand ?? 0}</text>`;
  }).join("\n");

  const dataDots = dataPts.map(p =>
    `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${C.indigoStrong}" stroke="white" stroke-width="2" />`
  ).join("");

  return `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${C.indigoStrong}" />
        <stop offset="100%" stop-color="${C.fuchsia}" />
      </linearGradient>
    </defs>
    ${rings.map(r => `<polygon points="${r}" fill="none" stroke="${C.slate200}" stroke-width="1" />`).join("")}
    ${axes}
    <polygon points="${dataPoly}" fill="url(#rg)" fill-opacity="0.35" stroke="${C.purple}" stroke-width="2.5" stroke-linejoin="round" />
    ${dataDots}
  </svg>`;
}

// ── Public entry ──────────────────────────────────────────────────────────
export interface IqPdfInput {
  studentName: string;
  score: IqScoreResult;
  narrative: IqNarrative;
}

export async function generateIqDiscoveryPdf(input: IqPdfInput): Promise<Buffer> {
  const printer = new PdfPrinter({
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  });

  const { studentName, score, narrative } = input;
  const logo = loadLogoBase64();
  const dateStr = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
  const domains: IqDomain[] = ["fluid", "quantitative", "verbal", "spatial", "memory"];
  const domainLabels: Record<IqDomain, string> = {
    fluid: "Penalaran Logika",
    quantitative: "Penalaran Angka",
    verbal: "Penalaran Verbal",
    spatial: "Penalaran Spasial",
    memory: "Memori Kerja",
  };
  const domainEmoji: Record<IqDomain, string> = {
    fluid: "[LOGIKA]",
    quantitative: "[ANGKA]",
    verbal: "[VERBAL]",
    spatial: "[SPASIAL]",
    memory: "[MEMORI]",
  };

  const styles: StyleDictionary = {
    coverTitle: { fontSize: 28, bold: true, color: C.white, alignment: "center" },
    coverEyebrow: { fontSize: 10, color: "#c4b5fd", alignment: "center", characterSpacing: 2 },
    coverIq: { fontSize: 96, bold: true, color: "#fda4af", alignment: "center", lineHeight: 1 },
    coverConfidence: { fontSize: 12, color: "#c4b5fd", alignment: "center" },
    coverArchetype: { fontSize: 22, bold: true, color: C.white, alignment: "center" },
    coverTagline: { fontSize: 11, italics: true, color: "#c4b5fd", alignment: "center" },
    coverName: { fontSize: 14, bold: true, color: C.white, alignment: "center" },
    coverDate: { fontSize: 10, color: "#a5b4fc", alignment: "center" },
    h1: { fontSize: 22, bold: true, color: C.slate900, margin: [0, 12, 0, 6] as [number, number, number, number] },
    h2: { fontSize: 14, bold: true, color: C.indigoStrong, margin: [0, 10, 0, 4] as [number, number, number, number] },
    body: { fontSize: 11, color: C.slate700, lineHeight: 1.5 },
    small: { fontSize: 9, color: C.slate500 },
    domainLabel: { fontSize: 12, bold: true, color: C.slate900 },
    domainScore: { fontSize: 10, color: C.slate500 },
    strengthBullet: { fontSize: 11, color: C.slate700, lineHeight: 1.5, margin: [0, 0, 0, 4] as [number, number, number, number] },
    disclaimer: { fontSize: 8, italics: true, color: C.slate400, alignment: "center", lineHeight: 1.4 },
  };

  const content: Content[] = [];

  // ═══════════════ COVER PAGE ═══════════════
  content.push({
    // Fill the whole page with the dark gradient by using a background rectangle
    // and stacking content on top via absolute positioning.
    stack: [
      // Top ribbon with logo (if present) — small, unobtrusive
      logo ? { image: logo, width: 90, alignment: "center", margin: [0, 0, 0, 30] as [number, number, number, number] } : { text: "SpecTa Education", style: "coverConfidence", margin: [0, 0, 0, 30] as [number, number, number, number] },
      { text: "SPECTA IQ DISCOVERY", style: "coverEyebrow" },
      { text: "Estimasi IQ", style: "coverEyebrow", margin: [0, 24, 0, 0] as [number, number, number, number] },
      { text: String(score.fsiq), style: "coverIq" },
      { text: `± ${score.confidenceRange}  ·  Persentil ${score.percentile}`, style: "coverConfidence", margin: [0, 4, 0, 32] as [number, number, number, number] },
      {
        canvas: [{ type: "line", x1: 100, y1: 0, x2: 400, y2: 0, lineWidth: 1, lineColor: "#4c1d95" }],
        margin: [0, 0, 0, 24] as [number, number, number, number],
      },
      { text: "ARKETIP KOGNITIFMU", style: "coverEyebrow" },
      { text: score.archetype.labelId, style: "coverArchetype", margin: [0, 6, 0, 4] as [number, number, number, number] },
      { text: `"${score.archetype.tagline.id}"`, style: "coverTagline", margin: [0, 0, 0, 40] as [number, number, number, number] },
      {
        canvas: [{ type: "line", x1: 100, y1: 0, x2: 400, y2: 0, lineWidth: 1, lineColor: "#4c1d95" }],
        margin: [0, 0, 0, 24] as [number, number, number, number],
      },
      { text: studentName || "Kamu", style: "coverName" },
      { text: dateStr, style: "coverDate", margin: [0, 4, 0, 0] as [number, number, number, number] },
    ],
    margin: [0, 100, 0, 0] as [number, number, number, number],
    pageBreak: "after",
  });

  // ═══════════════ RADAR CHART PAGE ═══════════════
  content.push({ text: "Skor per Dimensi Kognitif", style: "h1" });
  content.push({ text: "Otakmu bekerja dalam 5 dimensi. Berikut kekuatanmu di masing-masing.", style: "body", margin: [0, 0, 0, 20] as [number, number, number, number] });
  content.push({
    svg: buildRadarSvg(score.perDomain),
    width: 400,
    alignment: "center",
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Domain summary table
  content.push({
    table: {
      widths: ["*", "auto"],
      body: domains.map(d => [
        { text: `${domainEmoji[d]}  ${domainLabels[d]}`, style: "domainLabel", border: [false, false, false, true], borderColor: [C.slate200, C.slate200, C.slate200, C.slate200] },
        { text: `${score.perDomain[d]?.scaledBand ?? 0} / 17`, style: "domainScore", alignment: "right", border: [false, false, false, true] },
      ]),
    },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => C.slate200 },
    margin: [0, 0, 0, 20] as [number, number, number, number],
    pageBreak: "after",
  });

  // ═══════════════ OVERALL NARRATIVE ═══════════════
  if (narrative.summary) {
    content.push({ text: "Analisis Personal", style: "h1" });
    content.push({ text: narrative.summary, style: "body", margin: [0, 6, 0, 20] as [number, number, number, number] });
  }

  // ═══════════════ PER-DOMAIN DEEP DIVES ═══════════════
  content.push({ text: "Deep Dive: 5 Dimensi Kognitifmu", style: "h1", pageBreak: narrative.summary ? undefined : "before" });
  for (const d of domains) {
    content.push({ text: `${domainEmoji[d]} ${domainLabels[d]} — ${score.perDomain[d]?.scaledBand ?? 0}/17`, style: "h2" });
    content.push({ text: narrative.perDomain[d] || "", style: "body", margin: [0, 0, 0, 12] as [number, number, number, number] });
  }

  // ═══════════════ STRENGTHS + GROWTH ═══════════════
  content.push({ text: "Kekuatanmu", style: "h1", pageBreak: "before" });
  content.push({
    ul: narrative.strengths.map(s => ({ text: s, style: "strengthBullet" })),
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  content.push({ text: "Area untuk Tumbuh", style: "h1" });
  content.push({ text: "Setiap orang punya ruang untuk berkembang. Ini area di mana investasi waktu berlatih akan memberikan lompatan terbesar untukmu.", style: "body", margin: [0, 0, 0, 8] as [number, number, number, number] });
  content.push({
    ul: narrative.growthAreas.map(s => ({ text: s, style: "strengthBullet" })),
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // ═══════════════ CAREER RECOMMENDATIONS ═══════════════
  content.push({ text: "Rekomendasi Jurusan & Karir", style: "h1", pageBreak: "before" });
  content.push({ text: "Berdasarkan arketip kognitifmu, ini beberapa jalur belajar dan karir yang secara profil paling cocok untukmu:", style: "body", margin: [0, 0, 0, 12] as [number, number, number, number] });
  for (const c of narrative.careerHints) {
    content.push({
      columns: [
        { text: "→", width: 20, color: C.indigoStrong, bold: true, fontSize: 13 },
        { text: c, style: "body" },
      ],
      margin: [0, 0, 0, 8] as [number, number, number, number],
    });
  }

  // ═══════════════ CLOSING + DISCLAIMER ═══════════════
  content.push({
    stack: [
      { text: "Terus jelajahi otakmu.", style: "h2", alignment: "center", color: C.indigoStrong, margin: [0, 30, 0, 8] as [number, number, number, number] },
      { text: "Hasil ini adalah titik awal, bukan definisi diri. Otakmu terus berkembang — teruslah belajar, bereksperimen, dan menemukan minat baru.", style: "body", alignment: "center", margin: [40, 0, 40, 30] as [number, number, number, number] },
      {
        canvas: [{ type: "line", x1: 100, y1: 0, x2: 400, y2: 0, lineWidth: 0.5, lineColor: C.slate200 }],
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },
      { text: "Estimasi berbasis AI menggunakan metodologi kognitif CHC (Cattell-Horn-Carroll). Bukan pengganti tes IQ klinis profesional yang perlu proctoring dari psikolog berlisensi. Untuk tujuan self-discovery dan pengembangan diri. SpecTa Education tidak bertanggung jawab atas keputusan penting (jurusan, karir, kepegawaian) yang diambil semata-mata berdasarkan hasil ini — konsultasikan dengan konselor pendidikan atau psikolog untuk keputusan besar.", style: "disclaimer", margin: [20, 0, 20, 0] as [number, number, number, number] },
      { text: "SpecTa Education · spectaeducation.com · WhatsApp 0818-2183-8388", style: "disclaimer", margin: [0, 12, 0, 0] as [number, number, number, number] },
    ],
    pageBreak: "before",
  });

  // ═══════════════ DOCUMENT DEFINITION ═══════════════
  const docDef: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    defaultStyle: { font: "Helvetica", color: C.slate700, fontSize: 11 },
    styles,
    background: ((currentPage: number) => {
      // Cover page = dark gradient. Other pages = plain background (return
      // empty canvas array which pdfmake accepts as "draw nothing").
      if (currentPage === 1) {
        return {
          canvas: [
            { type: "rect", x: 0, y: 0, w: 595, h: 842, color: C.indigoDeep } as any,
            // Layered gradient hint via 2 lower-alpha rects
            { type: "rect", x: 0, y: 0, w: 595, h: 300, color: "#4c1d95", fillOpacity: 0.5 } as any,
            { type: "rect", x: 0, y: 600, w: 595, h: 300, color: "#831843", fillOpacity: 0.3 } as any,
          ],
        };
      }
      return { canvas: [] as any[] };
    }) as any,
    footer: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return null; // no footer on cover
      return {
        text: `SpecTa IQ Discovery  ·  ${studentName || "Kamu"}  ·  Halaman ${currentPage} / ${pageCount}`,
        style: "disclaimer",
        margin: [40, 20, 40, 0] as [number, number, number, number],
      };
    },
    content,
  };

  // Build the PDF and collect chunks into a single buffer.
  return new Promise((resolve, reject) => {
    try {
      const doc = printer.createPdfKitDocument(docDef);
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
