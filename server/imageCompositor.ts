/**
 * SpecTa Education — Server-Side Image Compositor
 *
 * Pipeline:
 * 1. AI generates a clean background scene (no text, no logo)
 * 2. This module downloads the background
 * 3. Composites the REAL SpecTa logo (from CDN) onto top-left
 * 4. Adds all text overlays (headline, subheadline, CTA, copyright) with 100% correct spelling
 * 5. Returns the final composed image uploaded to S3
 */

import sharp from "sharp";
import { storagePut } from "./storage";

// Official SpecTa Education logo CDN URL
const SPECTA_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663225686644/HYZQfmGzLP8hwhgd2UnqHZ/specta_logo_official_9fa82bda.jpeg";

// SpecTa brand colors
const BRAND = {
  red: { r: 230, g: 57, b: 70 },
  black: { r: 26, g: 26, b: 26 },
  white: { r: 255, g: 255, b: 255 },
  gold: { r: 212, g: 175, b: 55 },
  darkOverlay: "rgba(0,0,0,0.55)",
};

export interface CompositorInput {
  backgroundImageUrl: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  badge?: string;
  copyright?: string;
}

/**
 * Download an image from a URL and return as Buffer
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url} (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Wrap text to fit within maxWidth characters per line
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxCharsPerLine) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Build SVG text overlay for the image
 */
function buildTextOverlaySVG(
  width: number,
  height: number,
  headline: string,
  subheadline: string,
  ctaText: string,
  badge?: string,
  copyright?: string
): string {
  const headlineLines = wrapText(headline.toUpperCase(), 22);
  const subLines = wrapText(subheadline, 38);

  // Calculate vertical positions from bottom
  const copyrightY = height - 28;
  const ctaY = height - 80;
  const ctaWidth = Math.min(ctaText.length * 18 + 60, 500);
  const ctaX = width / 2 - ctaWidth / 2;
  const ctaHeight = 56;

  // Subheadline block
  const subLineHeight = 34;
  const subBlockHeight = subLines.length * subLineHeight;
  const subStartY = ctaY - 30 - subBlockHeight;

  // Headline block
  const headlineLineHeight = 64;
  const headlineBlockHeight = headlineLines.length * headlineLineHeight;
  const headlineStartY = subStartY - 20 - headlineBlockHeight;

  // Dark gradient overlay at bottom (for text readability)
  const gradientStartY = Math.max(headlineStartY - 40, height * 0.4);

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bottomGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.82)" />
    </linearGradient>
    <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.15)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0)" />
    </linearGradient>
  </defs>
  
  <!-- Bottom gradient overlay for text readability -->
  <rect x="0" y="${gradientStartY}" width="${width}" height="${height - gradientStartY}" fill="url(#bottomGrad)" />
  <!-- Top gradient for logo area -->
  <rect x="0" y="0" width="${width}" height="120" fill="url(#topGrad)" />
`;

  // Badge (top-right)
  if (badge) {
    const badgeText = badge.toUpperCase();
    const badgeWidth = badgeText.length * 14 + 32;
    const badgeX = width - badgeWidth - 24;
    svg += `
  <!-- Badge -->
  <rect x="${badgeX}" y="24" width="${badgeWidth}" height="44" rx="6" fill="#D4AF37" />
  <text x="${badgeX + badgeWidth / 2}" y="51" font-family="Noto Sans" font-weight="900" font-size="15" fill="#1A1A1A" text-anchor="middle" dominant-baseline="middle">${escapeXml(badgeText)}</text>
`;
  }

  // Headline lines
  headlineLines.forEach((line, i) => {
    const y = headlineStartY + i * headlineLineHeight + headlineLineHeight * 0.75;
    // Shadow
    svg += `  <text x="${width / 2 + 2}" y="${y + 2}" font-family="Noto Sans" font-weight="900" font-size="58" fill="rgba(0,0,0,0.6)" text-anchor="middle">${escapeXml(line)}</text>\n`;
    // Main text
    svg += `  <text x="${width / 2}" y="${y}" font-family="Noto Sans" font-weight="900" font-size="58" fill="#FFFFFF" text-anchor="middle" stroke="#E63946" stroke-width="1">${escapeXml(line)}</text>\n`;
  });

  // Subheadline lines
  subLines.forEach((line, i) => {
    const y = subStartY + i * subLineHeight + subLineHeight * 0.75;
    svg += `  <text x="${width / 2}" y="${y}" font-family="Noto Sans" font-weight="600" font-size="26" fill="#F0F0F0" text-anchor="middle">${escapeXml(line)}</text>\n`;
  });

  // CTA Button
  svg += `
  <!-- CTA Button -->
  <rect x="${ctaX}" y="${ctaY - ctaHeight / 2}" width="${ctaWidth}" height="${ctaHeight}" rx="28" fill="#E63946" />
  <text x="${width / 2}" y="${ctaY + 8}" font-family="Noto Sans" font-weight="900" font-size="22" fill="#FFFFFF" text-anchor="middle">${escapeXml(ctaText.toUpperCase())} →</text>
`;

  // Copyright footer
  const copyrightText = copyright || "© SpecTa Education | spectaeducation.com | @spectaeducation";
  svg += `
  <!-- Copyright footer -->
  <rect x="0" y="${copyrightY - 20}" width="${width}" height="36" fill="rgba(0,0,0,0.5)" />
  <text x="${width / 2}" y="${copyrightY}" font-family="Noto Sans" font-size="14" fill="#CCCCCC" text-anchor="middle">${escapeXml(copyrightText)}</text>
`;

  svg += `</svg>`;
  return svg;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Main compositor function
 * Takes an AI-generated background URL + text content
 * Returns a final composed image URL uploaded to S3
 */
export async function composeInstagramPost(input: CompositorInput): Promise<string> {
  const TARGET_SIZE = 1080;

  // 1. Download background image
  const bgBuffer = await fetchImageBuffer(input.backgroundImageUrl);

  // 2. Resize background to 1080x1080
  const bgResized = await sharp(bgBuffer)
    .resize(TARGET_SIZE, TARGET_SIZE, { fit: "cover", position: "center" })
    .jpeg({ quality: 92 })
    .toBuffer();

  // 3. Download and resize the real SpecTa logo
  const logoBuffer = await fetchImageBuffer(SPECTA_LOGO_URL);
  const logoResized = await sharp(logoBuffer)
    .resize(180, 65, { fit: "inside", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // ensure white background
    .jpeg({ quality: 95 })
    .toBuffer();

  // 4. Build text overlay SVG
  const textSvg = buildTextOverlaySVG(
    TARGET_SIZE,
    TARGET_SIZE,
    input.headline,
    input.subheadline,
    input.ctaText,
    input.badge,
    input.copyright
  );
  const textBuffer = Buffer.from(textSvg);

  // 5. Build logo white background patch (rounded rectangle)
  const logoPatchSvg = `<svg width="200" height="76" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="200" height="76" rx="8" fill="white" opacity="0.95"/>
  </svg>`;

  // 6. Composite everything together
  const finalBuffer = await sharp(bgResized)
    .composite([
      // Text overlays (gradient + headline + CTA + copyright)
      { input: textBuffer, top: 0, left: 0 },
      // Logo white background patch
      { input: Buffer.from(logoPatchSvg), top: 20, left: 20 },
      // Real SpecTa logo
      { input: logoResized, top: 26, left: 24 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  // 7. Upload to S3 and return URL
  const key = `social-posts/composed-${Date.now()}.jpg`;
  const { url } = await storagePut(key, finalBuffer, "image/jpeg");
  return url;
}
