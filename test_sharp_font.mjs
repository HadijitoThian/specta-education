import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read Poppins font and convert to base64 for SVG embedding
const fontBold = fs.readFileSync(path.join(__dirname, 'server/fonts/Poppins-Bold.ttf'));
const fontRegular = fs.readFileSync(path.join(__dirname, 'server/fonts/Poppins-Regular.ttf'));
const fontBoldB64 = fontBold.toString('base64');
const fontRegularB64 = fontRegular.toString('base64');

// Build SVG with embedded fonts
const svg = `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Poppins';
        font-weight: 700;
        src: url('data:font/ttf;base64,${fontBoldB64}') format('truetype');
      }
      @font-face {
        font-family: 'Poppins';
        font-weight: 400;
        src: url('data:font/ttf;base64,${fontRegularB64}') format('truetype');
      }
    </style>
  </defs>
  <rect width="1080" height="1080" fill="#1a3a5c"/>
  <text x="540" y="650" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="64" fill="white">KULIAH DI MONASH</text>
  <text x="540" y="730" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="64" fill="white">UNIVERSITY!</text>
  <text x="540" y="800" text-anchor="middle" font-family="Poppins" font-weight="400" font-size="28" fill="#e0e0e0">Dapatkan LOA Melalui SpecTa Education</text>
  <text x="540" y="870" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="26" fill="white">DAFTAR SEKARANG</text>
  <text x="540" y="1060" text-anchor="middle" font-family="Poppins" font-weight="400" font-size="15" fill="#c8c8c8">© 2026 SpecTa Education | spectaeducation.com | @spectaeducation</text>
</svg>`;

try {
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 92 })
    .toFile('/tmp/sharp_embedded_font_test.jpg');
  console.log('SUCCESS - check /tmp/sharp_embedded_font_test.jpg');
} catch (e) {
  console.error('FAIL:', e);
}
