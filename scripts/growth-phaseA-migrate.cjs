/**
 * Growth Phase A migration — marketing attribution + spend.
 *
 * Adds first-touch attribution columns to `leads` and creates the
 * `marketing_spend` table used by the conversion dashboard. Idempotent —
 * safe to run multiple times.
 *
 *   node scripts/growth-phaseA-migrate.cjs
 */
const mysql = require("mysql2/promise");

const LEAD_COLUMNS = [
  ["utmSource", "VARCHAR(120) NULL"],
  ["utmMedium", "VARCHAR(120) NULL"],
  ["utmCampaign", "VARCHAR(160) NULL"],
  ["utmTerm", "VARCHAR(160) NULL"],
  ["utmContent", "VARCHAR(160) NULL"],
  ["gclid", "VARCHAR(255) NULL"],
  ["landingPage", "VARCHAR(512) NULL"],
  ["attributionReferrer", "VARCHAR(512) NULL"],
];

(async () => {
  const c = await mysql.createConnection({ uri: process.env.DATABASE_URL, charset: "utf8mb4" });

  // 1) Add attribution columns to leads (only if missing).
  const [cols] = await c.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads'"
  );
  const have = new Set(cols.map((r) => r.COLUMN_NAME));
  for (const [name, type] of LEAD_COLUMNS) {
    if (have.has(name)) {
      console.log(`  = leads.${name} already exists`);
    } else {
      await c.query(`ALTER TABLE leads ADD COLUMN \`${name}\` ${type}`);
      console.log(`  + added leads.${name}`);
    }
  }

  // 2) Create marketing_spend table (only if missing).
  await c.query(`
    CREATE TABLE IF NOT EXISTS marketing_spend (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source VARCHAR(120) NOT NULL,
      campaign VARCHAR(160) NULL,
      medium VARCHAR(120) NULL,
      periodMonth VARCHAR(7) NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
      clicks INT NULL,
      impressions INT NULL,
      notes TEXT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log("  = marketing_spend table ready");

  await c.end();
  console.log("Done — Growth Phase A schema is in place.");
})().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
