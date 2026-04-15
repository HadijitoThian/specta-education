/**
 * SpecTa Education Instagram Image Compositor
 * Pure Node.js implementation using Sharp + SVG with embedded base64 fonts.
 * No Python dependency — works on production server.
 */

import sharp from "sharp";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { fileURLToPath } from "url";
import { storagePut } from "./storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECTA_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663225686644/HYZQfmGzLP8hwhgd2UnqHZ/specta_logo_official_9fa82bda.jpeg";

// ── Load and embed Poppins fonts as base64 at startup ──────────────────────
const FONTS_DIR = path.join(__dirname, "fonts");
let fontBoldB64 = "";
let fontRegularB64 = "";
let fontSemiBoldB64 = "";

try {
  fontBoldB64 = fs.readFileSync(path.join(FONTS_DIR, "Poppins-Bold.ttf")).toString("base64");
  fontRegularB64 = fs.readFileSync(path.join(FONTS_DIR, "Poppins-Regular.ttf")).toString("base64");
  fontSemiBoldB64 = fs.readFileSync(path.join(FONTS_DIR, "Poppins-SemiBold.ttf")).toString("base64");
} catch (e) {
  console.warn("[compositor] Could not load Poppins fonts, will use system fallback");
}

function getFontFaceCSS(): string {
  if (!fontBoldB64) return "";
  return `
    @font-face {
      font-family: 'Poppins';
      font-weight: 700;
      src: url('data:font/ttf;base64,${fontBoldB64}') format('truetype');
    }
    @font-face {
      font-family: 'Poppins';
      font-weight: 600;
      src: url('data:font/ttf;base64,${fontSemiBoldB64}') format('truetype');
    }
    @font-face {
      font-family: 'Poppins';
      font-weight: 400;
      src: url('data:font/ttf;base64,${fontRegularB64}') format('truetype');
    }
  `;
}

const FONT_FAMILY = fontBoldB64 ? "Poppins" : "sans-serif";

export interface CompositorInput {
  backgroundUrl?: string;
  backgroundImageUrl?: string;
  headline: string;
  subheadline: string;
  cta?: string;
  ctaText?: string;
  badge?: string;
  copyright?: string;
}

// ── Helper: escape XML special characters ──────────────────────────────────
function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// ── Helper: wrap text into lines that fit within maxWidth ──────────────────
function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  // Approximate: each character is ~0.55 * fontSize pixels wide for Poppins Bold
  const charWidth = fontSize * 0.55;
  const maxChars = Math.floor(maxWidth / charWidth);
  
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= maxChars) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Helper: download image as buffer ───────────────────────────────────────
async function downloadImage(url: string): Promise<Buffer> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

// ── Helper: measure average brightness of a region ─────────────────────────
async function measureBrightness(imgBuffer: Buffer, x: number, y: number, w: number, h: number): Promise<number> {
  try {
    const region = await sharp(imgBuffer)
      .extract({ left: x, top: y, width: w, height: h })
      .grayscale()
      .raw()
      .toBuffer();
    const sum = region.reduce((acc, val) => acc + val, 0);
    return sum / region.length;
  } catch {
    return 128; // default medium
  }
}

// ── Main compose function ──────────────────────────────────────────────────
export async function composeInstagramImage(input: CompositorInput): Promise<{ success: boolean; imageBuffer?: Buffer; error?: string }> {
  const W = 1080;
  const H = 1080;

  try {
    // ── Step 1: Prepare background ─────────────────────────────────────────
    const bgUrl = input.backgroundUrl || input.backgroundImageUrl || "";
    let bgBuffer: Buffer;

    if (bgUrl) {
      try {
        const rawBg = await downloadImage(bgUrl);
        bgBuffer = await sharp(rawBg).resize(W, H, { fit: "cover" }).jpeg().toBuffer();
      } catch (e) {
        console.warn("[compositor] Background download failed, using fallback");
        bgBuffer = await sharp({
          create: { width: W, height: H, channels: 4, background: { r: 26, g: 58, b: 92, alpha: 1 } },
        }).jpeg().toBuffer();
      }
    } else {
      bgBuffer = await sharp({
        create: { width: W, height: H, channels: 4, background: { r: 26, g: 58, b: 92, alpha: 1 } },
      }).jpeg().toBuffer();
    }

    // ── Step 2: Prepare text data ──────────────────────────────────────────
    const headline = input.headline || "";
    const subheadline = input.subheadline || "";
    const cta = input.cta || input.ctaText || "DAFTAR SEKARANG";
    const badge = input.badge || "";
    const copyright = input.copyright || "\u00A9 2026 SpecTa Education | spectaeducation.com | @spectaeducation";

    // ── Step 3: Build SVG text overlay ─────────────────────────────────────
    // Wrap headline
    let headlineFontSize = 64;
    let headlineLines = wrapText(headline, headlineFontSize, W - 100);
    if (headlineLines.length > 3) {
      headlineFontSize = 52;
      headlineLines = wrapText(headline, headlineFontSize, W - 100);
    }

    const lineHeight = headlineFontSize + 16;
    const totalHeadlineH = headlineLines.length * lineHeight;

    // Subheadline lines
    const subLines = subheadline ? wrapText(subheadline, 26, W - 140) : [];
    const subLineH = 38;
    const totalSubH = subLines.length * subLineH;

    // Layout: stack from bottom up
    const copyrightY = H - 18;
    const ctaCenterY = H - 85;
    const ctaH = 56;
    const ctaW = Math.min(cta.length * 18 + 80, 520);
    const subBottom = ctaCenterY - ctaH / 2 - 22;
    const subTop = subBottom - totalSubH;
    const headlineBottom = subTop - 18;
    const headlineTop = headlineBottom - totalHeadlineH;

    // Build SVG elements
    let svgElements = "";

    // Dark gradient overlay (bottom 58%)
    const gradientId = "grad_" + Date.now();
    svgElements += `
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="black" stop-opacity="0"/>
          <stop offset="35%" stop-color="black" stop-opacity="0"/>
          <stop offset="65%" stop-color="black" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.85"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#${gradientId})"/>
    `;

    // Badge (top right)
    if (badge) {
      const badgeW = badge.length * 14 + 40;
      const badgeX = W - badgeW - 28;
      svgElements += `
        <rect x="${badgeX}" y="24" width="${badgeW}" height="44" rx="8" fill="#d4af37" fill-opacity="0.94"/>
        <text x="${badgeX + badgeW / 2}" y="52" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" font-size="20" fill="#1a1a1a">${escXml(badge)}</text>
      `;
    }

    // Headline with shadow
    for (let i = 0; i < headlineLines.length; i++) {
      const y = headlineTop + i * lineHeight + lineHeight / 2 + headlineFontSize * 0.35;
      const line = escXml(headlineLines[i]);
      // Shadow
      svgElements += `<text x="${W / 2 + 2}" y="${y + 3}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" font-size="${headlineFontSize}" fill="black" fill-opacity="0.5">${line}</text>`;
      // Main
      svgElements += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" font-size="${headlineFontSize}" fill="white">${line}</text>`;
    }

    // Subheadline
    for (let i = 0; i < subLines.length; i++) {
      const y = subTop + i * subLineH + subLineH / 2 + 9;
      svgElements += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="400" font-size="26" fill="#f0f0f0" fill-opacity="0.92">${escXml(subLines[i])}</text>`;
    }

    // CTA button
    const ctaX = W / 2 - ctaW / 2;
    const ctaY = ctaCenterY - ctaH / 2;
    svgElements += `
      <rect x="${ctaX}" y="${ctaY}" width="${ctaW}" height="${ctaH}" rx="28" fill="#e63946"/>
      <text x="${W / 2}" y="${ctaCenterY + 9}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" font-size="24" fill="white">${escXml(cta)}  \u2192</text>
    `;

    // Copyright bar
    svgElements += `
      <rect x="0" y="${H - 40}" width="${W}" height="40" fill="black" fill-opacity="0.65"/>
      <text x="${W / 2}" y="${copyrightY}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="400" font-size="14" fill="#c8c8c8">${escXml(copyright)}</text>
    `;

    const svgOverlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs><style>${getFontFaceCSS()}</style></defs>
      ${svgElements}
    </svg>`;

    // ── Step 4: Composite overlay onto background ──────────────────────────
    const overlayBuffer = Buffer.from(svgOverlay);
    let composited = await sharp(bgBuffer)
      .composite([{ input: overlayBuffer, top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer();

    // ── Step 5: Composite SpecTa logo with smart brightness detection ──────
    try {
      const logoRaw = await downloadImage(SPECTA_LOGO_URL);
      let logoResized = await sharp(logoRaw)
        .resize({ width: 180, height: 90, fit: "inside" })
        .png()
        .toBuffer();

      const logoMeta = await sharp(logoResized).metadata();
      const logoW = logoMeta.width || 180;
      const logoH = logoMeta.height || 90;
      const logoX = 24;
      const logoY = 24;
      const pad = 12;

      // Measure brightness of background under logo area
      const brightness = await measureBrightness(
        composited,
        logoX, logoY,
        Math.min(logoW + pad * 2, W - logoX),
        Math.min(logoH + pad * 2, H - logoY)
      );

      if (brightness > 160) {
        // Bright background — place logo directly, no backdrop
        composited = await sharp(composited)
          .composite([{ input: logoResized, top: logoY, left: logoX }])
          .jpeg({ quality: 92 })
          .toBuffer();
      } else if (brightness > 100) {
        // Medium — subtle semi-transparent white backdrop
        const backdropSvg = `<svg width="${logoW + pad * 2}" height="${logoH + pad * 2}">
          <rect width="${logoW + pad * 2}" height="${logoH + pad * 2}" rx="10" fill="white" fill-opacity="0.35"/>
        </svg>`;
        composited = await sharp(composited)
          .composite([
            { input: Buffer.from(backdropSvg), top: logoY, left: logoX },
            { input: logoResized, top: logoY + pad, left: logoX + pad },
          ])
          .jpeg({ quality: 92 })
          .toBuffer();
      } else {
        // Dark — white rounded backdrop for full visibility
        const backdropSvg = `<svg width="${logoW + pad * 2}" height="${logoH + pad * 2}">
          <rect width="${logoW + pad * 2}" height="${logoH + pad * 2}" rx="12" fill="white" fill-opacity="0.85"/>
        </svg>`;
        composited = await sharp(composited)
          .composite([
            { input: Buffer.from(backdropSvg), top: logoY, left: logoX },
            { input: logoResized, top: logoY + pad, left: logoX + pad },
          ])
          .jpeg({ quality: 92 })
          .toBuffer();
      }

      console.log(`[compositor] Logo placed. Brightness: ${brightness.toFixed(0)} (${brightness > 160 ? "bright-no box" : brightness > 100 ? "medium-subtle" : "dark-white box"})`);
    } catch (e: any) {
      console.warn("[compositor] Logo overlay failed:", e.message);
    }

    return { success: true, imageBuffer: composited };
  } catch (err: any) {
    console.error("[compositor] Error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * composeInstagramPost — called from socialMedia.ts
 * Composes the image and uploads to S3, returns the CDN URL.
 */
export async function composeInstagramPost(input: CompositorInput): Promise<string> {
  const result = await composeInstagramImage(input);
  if (!result.success || !result.imageBuffer) {
    throw new Error(result.error || "Image composition failed");
  }

  // Upload to S3
  const key = `social-posts/composed-${Date.now()}.jpg`;
  const { url } = await storagePut(key, result.imageBuffer, "image/jpeg");
  return url;
}
