/**
 * CRM Phase 3 — create the crm_parent_reports table.
 * Idempotent (CREATE TABLE IF NOT EXISTS).
 *
 * Run in the Railway Console:
 *   node scripts/crm-phase3-migrate.cjs
 */
const mysql = require("mysql2/promise");

const SQL = `
CREATE TABLE IF NOT EXISTS crm_parent_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leadId INT NOT NULL,
  weekOf VARCHAR(10) NOT NULL,
  status ENUM('draft','approved','sent','failed','skipped') NOT NULL DEFAULT 'draft',
  summaryNote TEXT NULL,
  snapshot TEXT NULL,
  channelEmail BOOLEAN NOT NULL DEFAULT 1,
  channelWhatsapp BOOLEAN NOT NULL DEFAULT 0,
  parentName VARCHAR(255) NULL,
  parentEmail VARCHAR(320) NULL,
  reviewedBy VARCHAR(320) NULL,
  sentAt TIMESTAMP NULL,
  error TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_week (weekOf),
  INDEX idx_lead_week (leadId, weekOf)
)`;

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  await c.query(SQL);
  await c.end();
  console.log("Done — crm_parent_reports ready. CRM Phase 3 table created.");
})().catch(e => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
