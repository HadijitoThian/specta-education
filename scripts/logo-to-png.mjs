// One-off: convert SpecTa Logo png.jpeg (checkerboard-transparent baked in) → real transparent PNG.
// Strategy: keep only red-ish (SpecTa + heart) and purple-ish (Education outline) pixels; everything else → transparent.
import { Jimp } from "jimp";
import { readFile, writeFile } from "node:fs/promises";

const SRC = "C:/specta-education-railway/client/public/SpecTa Logo png.jpeg";
const DST = "C:/specta-education-railway/client/public/specta-logo.png";

const img = await Jimp.read(await readFile(SRC));
const { width, height } = img.bitmap;
console.log(`Loaded ${width}x${height}`);

let kept = 0, cleared = 0;

img.scan(0, 0, width, height, function (x, y, idx) {
  const r = this.bitmap.data[idx];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];

  // Red-family (SpecTa lettering + heart): high R, low G, low-to-mid B
  const isRed = r > 150 && g < 130 && b < 130 && r - Math.max(g, b) > 30;
  // Purple-family (Education outline + SpecTa outline): mid R, low G, high B, and R < B roughly
  const isPurple = r > 40 && r < 160 && g < 100 && b > 80 && Math.abs(r - b) < 90 && b >= r - 10;
  // Dark (any strong ink)
  const isDark = r < 90 && g < 90 && b < 90;

  if (isRed || isPurple || isDark) {
    kept++;
  } else {
    // Transparent — kill checkerboard, white, gray
    this.bitmap.data[idx + 3] = 0;
    cleared++;
  }
});

console.log(`Kept ${kept} / cleared ${cleared} pixels (${((100 * kept) / (kept + cleared)).toFixed(1)}% kept)`);

// Crop transparent margins (bounding box of non-transparent pixels)
let minX = width, minY = height, maxX = 0, maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    if (img.bitmap.data[idx + 3] > 0) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const pad = 12;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(width - 1, maxX + pad);
maxY = Math.min(height - 1, maxY + pad);
console.log(`BBox: ${minX},${minY} → ${maxX},${maxY} (${maxX - minX + 1}x${maxY - minY + 1})`);
img.crop({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });

const buf = await img.getBuffer("image/png");
await writeFile(DST, buf);
console.log(`Wrote ${DST} (${buf.length} bytes)`);
