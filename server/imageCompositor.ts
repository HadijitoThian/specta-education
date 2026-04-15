/**
 * SpecTa Education Instagram Image Compositor
 * Uses Python Pillow (via child_process) for reliable text rendering.
 * Sharp SVG text was broken on production — Pillow is the proven replacement.
 */

import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { fileURLToPath } from "url";
import { storagePut } from "./storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECTA_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663225686644/HYZQfmGzLP8hwhgd2UnqHZ/specta_logo_official_9fa82bda.jpeg";

const PYTHON_SCRIPT = path.join(__dirname, "compose_image.py");

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

function runPythonCompositor(payload: object, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [PYTHON_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      if (stderr) console.warn("[compositor] Python stderr:", stderr);
      try {
        const result = JSON.parse(stdout.trim());
        if (result.success) {
          resolve();
        } else {
          reject(new Error(result.error || "Compositor failed"));
        }
      } catch (e) {
        reject(new Error(`Python output parse error: ${stdout} | ${stderr}`));
      }
    });

    proc.on("error", (err) => reject(err));

    // Send JSON payload via stdin
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

export async function composeInstagramImage(input: CompositorInput): Promise<{ success: boolean; imageBuffer?: Buffer; error?: string }> {
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `specta_composed_${Date.now()}.jpg`);

  const payload = {
    background_url: input.backgroundUrl || input.backgroundImageUrl || "",
    headline: input.headline,
    subheadline: input.subheadline,
    cta: input.cta || input.ctaText || "DAFTAR SEKARANG",
    badge: input.badge || "",
    copyright: input.copyright || "© 2026 SpecTa Education | spectaeducation.com | @spectaeducation",
    logo_url: SPECTA_LOGO_URL,
    output_path: outputPath,
  };

  try {
    await runPythonCompositor(payload, outputPath);
    const imageBuffer = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch (_) {}
    return { success: true, imageBuffer };
  } catch (err: any) {
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
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
