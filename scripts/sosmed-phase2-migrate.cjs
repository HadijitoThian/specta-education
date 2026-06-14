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
)`;

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  await c.query(SQL);
  await c.end();
  console.log("Done — sosmed_content ready. SosMed Phase 2 table created.");
})().catch(e => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
