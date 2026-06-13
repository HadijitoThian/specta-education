/**
 * CRM Phase 1 — add the team/role columns to the `users` table.
 * Idempotent: safe to run more than once (skips columns that already exist).
 *
 * Run in the Railway Console:
 *   node scripts/crm-phase1-migrate.cjs
 */
const mysql = require("mysql2/promise");

const COLUMNS = [
  ["crmRole", "ENUM('none','owner','counselor','ielts_instructor','visa_specialist','front_desk') NOT NULL DEFAULT 'none'"],
  ["office", "ENUM('kelapa_gading','pik','gading_serpong') NULL"],
  ["phone", "VARCHAR(50) NULL"],
  ["jobTitle", "VARCHAR(120) NULL"],
  ["crmActive", "BOOLEAN NOT NULL DEFAULT 1"],
];

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  let added = 0;
  let skipped = 0;
  for (const [name, def] of COLUMNS) {
    try {
      await c.query(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
      console.log(`  + added ${name}`);
      added++;
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log(`  = ${name} already exists, skipped`);
        skipped++;
      } else {
        throw e;
      }
    }
  }
  await c.end();
  console.log(`\nDone — ${added} added, ${skipped} already existed. CRM Phase 1 columns ready.`);
})().catch(e => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
