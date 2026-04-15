/**
 * SpecTa Education Instagram Image Compositor
 * Pure Node.js: Sharp + opentype.js (text→SVG paths).
 * Text is converted to vector shapes — NO font dependency on the server.
 * Works on any production server regardless of installed fonts.
 */

import sharp from "sharp";
import opentype from "opentype.js";
import * as path from "path";
import { fileURLToPath } from "url";
import { storagePut } from "./storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECTA_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663225686644/HYZQfmGzLP8hwhgd2UnqHZ/specta_logo_official_9fa82bda.jpeg";

// ── Load Poppins fonts with opentype.js at startup ─────────────────────────
const FONTS_DIR = path.join(__dirname, "fonts");

let fontBold: opentype.Font | null = null;
let fontRegular: opentype.Font | null = null;
let fontSemiBold: opentype.Font | null = null;

try {
  fontBold = opentype.loadSync(path.join(FONTS_DIR, "Poppins-Bold.ttf"));
  fontRegular = opentype.loadSync(path.join(FONTS_DIR, "Poppins-Regular.ttf"));
  fontSemiBold = opentype.loadSync(path.join(FONTS_DIR, "Poppins-SemiBold.ttf"));
  console.log("[compositor] Poppins fonts loaded via opentype.js");
} catch (e: any) {
  console.error("[compositor] Failed to load Poppins fonts:", e.message);
}

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

// ── Helper: convert text to SVG <path> string using opentype.js ────────────
function textToSvgPath(
  font: opentype.Font,
  text: string,
  fontSize: number,
  x: number,
  y: number,
  fill: string,
  opacity?: number,
  anchor?: "start" | "middle" | "end"
): string {
  const otPath = font.getPath(text, 0, 0, fontSize);
  const bbox = otPath.getBoundingBox();
  const textWidth = bbox.x2 - bbox.x1;

  let offsetX = x;
  if (anchor === "middle") {
    offsetX = x - textWidth / 2 - bbox.x1;
  } else if (anchor === "end") {
    offsetX = x - textWidth - bbox.x1;
  } else {
    offsetX = x - bbox.x1;
  }
  const offsetY = y;

  // Re-generate path at the correct position
  const positioned = font.getPath(text, offsetX, offsetY, fontSize);
  const pathData = positioned.toPathData(2);

  if (!pathData || pathData.length < 5) return "";

  const opacityAttr = opacity !== undefined && opacity < 1 ? ` fill-opacity="${opacity}"` : "";
  return `<path d="${pathData}" fill="${fill}"${opacityAttr}/>`;
}

// ── Helper: measure text width ─────────────────────────────────────────────
function measureTextWidth(font: opentype.Font, text: string, fontSize: number): number {
  const otPath = font.getPath(text, 0, 0, fontSize);
  const bbox = otPath.getBoundingBox();
  return bbox.x2 - bbox.x1;
}

// ── Helper: wrap text into lines that fit within maxWidth ──────────────────
function wrapText(font: opentype.Font, text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const w = measureTextWidth(font, test, fontSize);
    if (w <= maxWidth) {
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
    return 128;
  }
}

// ── Main compose function ──────────────────────────────────────────────────
export async function composeInstagramImage(input: CompositorInput): Promise<{ success: boolean; imageBuffer?: Buffer; error?: string }> {
  const W = 1080;
  const H = 1080;

  if (!fontBold || !fontRegular) {
    return { success: false, error: "Poppins fonts not loaded" };
  }

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

    // ── Step 3: Build SVG overlay with text as PATHS (not font text) ───────
    let svgPaths = "";

    // Dark gradient overlay (bottom 58%)
    const gradientId = "grad_" + Date.now();
    svgPaths += `
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

    // ── Badge (top right) ──────────────────────────────────────────────────
    if (badge && fontBold) {
      const badgeFontSize = 20;
      const badgeTextW = measureTextWidth(fontBold, badge, badgeFontSize);
      const badgePadX = 24;
      const badgeW = badgeTextW + badgePadX * 2;
      const badgeH = 44;
      const badgeX = W - badgeW - 28;
      const badgeY = 24;

      svgPaths += `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="8" fill="#d4af37" fill-opacity="0.94"/>`;
      svgPaths += textToSvgPath(fontBold, badge, badgeFontSize, badgeX + badgeW / 2, badgeY + 30, "#1a1a1a", undefined, "middle");
    }

    // ── Headline ───────────────────────────────────────────────────────────
    let headlineFontSize = 64;
    let headlineLines = headline ? wrapText(fontBold, headline, headlineFontSize, W - 100) : [];
    if (headlineLines.length > 3) {
      headlineFontSize = 52;
      headlineLines = wrapText(fontBold, headline, headlineFontSize, W - 100);
    }
    if (headlineLines.length > 4) {
      headlineFontSize = 44;
      headlineLines = wrapText(fontBold, headline, headlineFontSize, W - 100);
    }

    const lineHeight = headlineFontSize + 16;
    const totalHeadlineH = headlineLines.length * lineHeight;

    // ── Subheadline ────────────────────────────────────────────────────────
    const subFont = fontRegular;
    const subFontSize = 26;
    const subLines = subheadline ? wrapText(subFont, subheadline, subFontSize, W - 140) : [];
    const subLineH = 38;
    const totalSubH = subLines.length * subLineH;

    // ── Layout: stack from bottom up ───────────────────────────────────────
    const copyrightY = H - 14;
    const ctaCenterY = H - 82;
    const ctaH = 56;
    // Don't include arrow in text — draw it as SVG chevron instead
    const ctaTextW = measureTextWidth(fontBold, cta, 24);
    const ctaW = Math.min(ctaTextW + 120, 520);
    const subBottom = ctaCenterY - ctaH / 2 - 22;
    const subTop = subBottom - totalSubH;
    const headlineBottom = subTop - 18;
    const headlineTop = headlineBottom - totalHeadlineH;

    // Headline with shadow
    for (let i = 0; i < headlineLines.length; i++) {
      const y = headlineTop + i * lineHeight + lineHeight;
      const line = headlineLines[i];
      // Shadow
      svgPaths += textToSvgPath(fontBold, line, headlineFontSize, W / 2 + 2, y + 3, "black", 0.5, "middle");
      // Main text
      svgPaths += textToSvgPath(fontBold, line, headlineFontSize, W / 2, y, "white", undefined, "middle");
    }

    // Subheadline
    for (let i = 0; i < subLines.length; i++) {
      const y = subTop + i * subLineH + subLineH;
      svgPaths += textToSvgPath(subFont, subLines[i], subFontSize, W / 2, y, "#f0f0f0", 0.92, "middle");
    }

    // ── CTA button ─────────────────────────────────────────────────────────
    const ctaX = W / 2 - ctaW / 2;
    const ctaY = ctaCenterY - ctaH / 2;
    svgPaths += `<rect x="${ctaX}" y="${ctaY}" width="${ctaW}" height="${ctaH}" rx="28" fill="#e63946"/>`;
    // Render CTA text slightly left of center to make room for arrow
    svgPaths += textToSvgPath(fontBold, cta, 24, W / 2 - 16, ctaCenterY + 9, "white", undefined, "middle");
    // Draw arrow chevron as SVG path (no font needed)
    const arrowX = W / 2 + ctaTextW / 2 + 8;
    const arrowY = ctaCenterY;
    svgPaths += `<path d="M${arrowX} ${arrowY - 8} L${arrowX + 10} ${arrowY} L${arrowX} ${arrowY + 8}" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

    // ── Copyright bar ──────────────────────────────────────────────────────
    svgPaths += `<rect x="0" y="${H - 40}" width="${W}" height="40" fill="black" fill-opacity="0.65"/>`;
    svgPaths += textToSvgPath(fontRegular, copyright, 14, W / 2, copyrightY, "#c8c8c8", undefined, "middle");

    const svgOverlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svgPaths}</svg>`;

    // ── Step 4: Composite overlay onto background ──────────────────────────
    const overlayBuffer = Buffer.from(svgOverlay);
    let composited = await sharp(bgBuffer)
      .composite([{ input: overlayBuffer, top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer();

    // ── Step 5: Composite SpecTa logo with smart brightness detection ──────
    try {
      const logoRaw = await downloadImage(SPECTA_LOGO_URL);
      const logoResized = await sharp(logoRaw)
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
