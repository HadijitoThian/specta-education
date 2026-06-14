/**
 * SosMed — make transparent + white PNG logos from the current logo and wire
 * them into the Brand Kit (so the compositor drops the white box and adapts:
 * white logo on dark photos, colour logo on bright photos).
 *
 * Run in the Railway Console (needs DATABASE_URL + R2_* env):
 *   node scripts/sosmed-logo-migrate.cjs
 */
const mysql = require("mysql2/promise");
const sharp = require("sharp");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const BASE = "https://www.spectaeducation.com";
const FALLBACK_LOGO = `${BASE}/files/migrated/QxrYSewOYzAuPIEN.jpeg`;
const WHITE_CUTOFF = 235; // pixels brighter than this on all channels => background

(async () => {
  const c = await mysql.createConnection({ uri: process.env.DATABASE_URL, charset: "utf8mb4" });

  // 1) ensure column exists
  try {
    await c.query("ALTER TABLE brand_kit ADD COLUMN logoWhiteUrl VARCHAR(500) NULL");
    console.log("  + added brand_kit.logoWhiteUrl");
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") console.log("  = logoWhiteUrl already exists");
    else throw e;
  }

  // 2) source logo
  const [[row]] = await c.query("SELECT logoUrl FROM brand_kit LIMIT 1");
  const src = (row && row.logoUrl) || FALLBACK_LOGO;
  console.log("  source logo:", src);
  const buf = Buffer.from(await (await fetch(src)).arrayBuffer());

  // 3) transparent (colour) + white versions
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const color = Buffer.from(data);
  const white = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > WHITE_CUTOFF && g > WHITE_CUTOFF && b > WHITE_CUTOFF) {
      color[i + 3] = 0; // remove white background
      white[i + 3] = 0;
    } else {
      white[i] = 255; white[i + 1] = 255; white[i + 2] = 255; // recolour shape to white
    }
  }
  const colorPng = await sharp(color, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const whitePng = await sharp(white, { raw: { width, height, channels: 4 } }).png().toBuffer();

  // 4) upload to R2
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
  const stamp = Date.now();
  const colorKey = `brand/logo-color-${stamp}.png`;
  const whiteKey = `brand/logo-white-${stamp}.png`;
  for (const [key, body] of [[colorKey, colorPng], [whiteKey, whitePng]]) {
    await s3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, Body: body, ContentType: "image/png" }));
    console.log(`  + uploaded ${key} (${body.length} bytes)`);
  }

  // 5) point the brand kit at the new logos
  const colorUrl = `${BASE}/files/${colorKey}`;
  const whiteUrl = `${BASE}/files/${whiteKey}`;
  await c.query("UPDATE brand_kit SET logoUrl = ?, logoWhiteUrl = ?", [colorUrl, whiteUrl]);
  await c.end();
  console.log(`\nDone — Brand Kit now uses transparent logos:\n  colour: ${colorUrl}\n  white : ${whiteUrl}`);
})().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
