/**
 * SosMed Phase 2 — create the sosmed_content table (generated post drafts).
 * Idempotent.
 *   node scripts/sosmed-phase2-migrate.cjs
 */
const mysql = require("mysql2/promise");

const SQL = `
CREATE TABLE IF NOT EXISTS sosmed_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brief TEXT NULL,
  format ENUM('single','carousel') NOT NULL DEFAULT 'single',
  caption TEXT NULL,
  hashtags TEXT NULL,
  slides TEXT NULL,
  status ENUM('draft','approved','scheduled','posted') NOT NULL DEFAULT 'draft',
  createdBy INT NULL,
  createdByName VARCHAR(160) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created (createdAt)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

(async () => {
  const c = await mysql.createConnection({ uri: process.env.DATABASE_URL, charset: "utf8mb4" });
  await c.query(SQL);
  // Ensure emojis work even if the table pre-existed with a narrower charset.
  await c.query("ALTER TABLE sosmed_content CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await c.end();
  console.log("Done — sosmed_content ready (utf8mb4). SosMed Phase 2 table ready.");
})().catch(e => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
