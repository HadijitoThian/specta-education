/**
 * SosMed — add brand_kit.visualStyle (the Art Director's learned design style).
 * Idempotent.
 *   node scripts/sosmed-artdirector-migrate.cjs
 */
const mysql = require("mysql2/promise");

(async () => {
  const c = await mysql.createConnection({ uri: process.env.DATABASE_URL, charset: "utf8mb4" });
  try {
    await c.query("ALTER TABLE brand_kit ADD COLUMN visualStyle TEXT NULL");
    console.log("  + added brand_kit.visualStyle");
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") console.log("  = visualStyle already exists");
    else throw e;
  }
  await c.end();
  console.log("Done — Art Director visual style ready.");
})().catch(e => { console.error("Failed:", e.message); process.exit(1); });
