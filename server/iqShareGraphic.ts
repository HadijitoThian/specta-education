/**
 * SpecTa IQ Discovery — Instagram-shareable result graphic.
 *
 * 1080×1080 PNG generated from an SVG template, ready for IG Story upload.
 * Contains: student name, big score, archetype label + emoji + tagline,
 * mini radar chart, SpecTa branding, subtle purple gradient background.
 *
 * SVG → PNG via `sharp` (already in package.json for image processing).
 */

import sharp from "sharp";
import type { IqScoreResult, IqDomain } from "./iqQuestionTypes";

// ── Sizing ────────────────────────────────────────────────────────────────
const W = 1080;
const H = 1080;

// ── Palette ──────────────────────────────────────────────────────────────
const P = {
  bg1: "#1e1b4b",       // top of gradient
  bg2: "#581c87",       // middle
  bg3: "#831843",       // bottom
  ink: "#ffffff",
  purple: "#c4b5fd",
  fuchsia: "#f0abfc",
  rose: "#fda4af",
  glow: "#a855f7",
  softInk: "rgba(255,255,255,0.7)",
  faintInk: "rgba(255,255,255,0.4)",
  cardBg: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.12)",
};

// ── Mini radar (200x200 fits inside the card) ────────────────────────────
function miniRadar(perDomain: Record<IqDomain, { scaledBand: number }>): string {
  const domains: IqDomain[] = ["fluid", "quantitative", "verbal", "spatial", "memory"];
  const cx = 100, cy = 100, maxR = 75, maxBand = 17;
  const angleFor = (i: number) => (Math.PI * 2 * i) / domains.length - Math.PI / 2;
  const point = (i: number, r: number) => ({ x: cx + r * Math.cos(angleFor(i)), y: cy + r * Math.sin(angleFor(i)) });
  const rings = [0.5, 1].map(f => domains.map((_, i) => point(i, maxR * f)).map(p => `${p.x},${p.y}`).join(" "));
  const dataPts = domains.map((d, i) => {
    const band = Math.max(0, Math.min(maxBand, perDomain[d]?.scaledBand ?? 0));
    return point(i, (band / maxBand) * maxR);
  });
  const dataPoly = dataPts.map(p => `${p.x},${p.y}`).join(" ");
  return `
    ${rings.map(r => `<polygon points="${r}" fill="none" stroke="${P.faintInk}" stroke-width="1" />`).join("")}
    ${domains.map((_, i) => {
      const p = point(i, maxR);
      return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="${P.faintInk}" stroke-width="1" />`;
    }).join("")}
    <polygon points="${dataPoly}" fill="url(#radar-fill)" fill-opacity="0.7" stroke="${P.rose}" stroke-width="2.5" stroke-linejoin="round" />
    ${dataPts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${P.rose}" stroke="white" stroke-width="1.5" />`).join("")}`;
}

// ── SVG template ─────────────────────────────────────────────────────────
function renderSvg(input: {
  studentName: string;
  score: IqScoreResult;
}): string {
  const { studentName, score } = input;
  const arch = score.archetype;
  const displayName = (studentName || "Kamu").trim();
  // Truncate very long names for layout safety
  const nameSafe = displayName.length > 20 ? displayName.slice(0, 19) + "…" : displayName;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${P.bg1}" />
        <stop offset="55%" stop-color="${P.bg2}" />
        <stop offset="100%" stop-color="${P.bg3}" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stop-color="${P.glow}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${P.glow}" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="iq-fill" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${P.purple}" />
        <stop offset="50%" stop-color="${P.fuchsia}" />
        <stop offset="100%" stop-color="${P.rose}" />
      </linearGradient>
      <linearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${P.purple}" />
        <stop offset="100%" stop-color="${P.rose}" />
      </linearGradient>
    </defs>

    <!-- Background gradient + ambient glow -->
    <rect width="${W}" height="${H}" fill="url(#bg)" />
    <rect width="${W}" height="${H}" fill="url(#glow)" />

    <!-- Top: SpecTa branding + product label -->
    <g font-family="Helvetica, sans-serif">
      <text x="${W / 2}" y="120" fill="${P.purple}" font-size="24" font-weight="700" text-anchor="middle" letter-spacing="6">SPECTA IQ DISCOVERY</text>
      <text x="${W / 2}" y="160" fill="${P.softInk}" font-size="18" text-anchor="middle">Hasil ${nameSafe}</text>
    </g>

    <!-- Big IQ number -->
    <g font-family="Helvetica, sans-serif">
      <text x="${W / 2}" y="230" fill="${P.softInk}" font-size="20" font-weight="600" text-anchor="middle" letter-spacing="4">ESTIMASI IQ</text>
      <text x="${W / 2}" y="440" fill="url(#iq-fill)" font-size="260" font-weight="900" text-anchor="middle" letter-spacing="-8">${score.fsiq}</text>
      <text x="${W / 2}" y="490" fill="${P.softInk}" font-size="24" text-anchor="middle">± ${score.confidenceRange}  ·  Persentil ${score.percentile}</text>
    </g>

    <!-- Middle: Archetype card -->
    <g transform="translate(${W / 2 - 380}, 550)">
      <rect x="0" y="0" width="760" height="260" rx="32" fill="${P.cardBg}" stroke="${P.cardBorder}" stroke-width="1.5" />
      <g font-family="Helvetica, sans-serif">
        <text x="380" y="55" fill="${P.purple}" font-size="18" font-weight="700" text-anchor="middle" letter-spacing="4">ARKETIP KOGNITIFMU</text>

        <!-- Emoji rendered as text (SVG native) -->
        <text x="200" y="175" font-size="120" text-anchor="middle">${arch.emoji}</text>

        <!-- Label + tagline -->
        <text x="440" y="140" fill="${P.ink}" font-size="44" font-weight="800">${arch.labelId}</text>
        <text x="440" y="185" fill="${P.softInk}" font-size="22" font-style="italic">"${arch.tagline.id}"</text>
      </g>

      <!-- Mini radar to the right -->
      <g transform="translate(560, 30)">
        ${miniRadar(score.perDomain)}
      </g>
    </g>

    <!-- Bottom footer -->
    <g font-family="Helvetica, sans-serif">
      <text x="${W / 2}" y="990" fill="${P.softInk}" font-size="22" text-anchor="middle" font-weight="600">Discover otakmu sendiri</text>
      <text x="${W / 2}" y="1020" fill="${P.purple}" font-size="20" text-anchor="middle" font-weight="700">spectaeducation.com/iq-discovery</text>
      <text x="${W / 2}" y="1050" fill="${P.faintInk}" font-size="14" text-anchor="middle" font-style="italic">Estimasi berbasis AI · bukan pengganti tes IQ klinis</text>
    </g>
  </svg>`;
}

// ── Public entry ──────────────────────────────────────────────────────────
export interface IqShareGraphicInput {
  studentName: string;
  score: IqScoreResult;
}

/** Render the 1080×1080 PNG share graphic and return the buffer. */
export async function generateIqShareGraphic(input: IqShareGraphicInput): Promise<Buffer> {
  const svg = renderSvg(input);
  const png = await sharp(Buffer.from(svg))
    .png({ quality: 90, compressionLevel: 6 })
    .resize(W, H)
    .toBuffer();
  return png;
}
