/**
 * CRM intake/QR — add token columns:
 *   users.intakeToken   (per-counselor public intake link)
 *   leads.journeyToken  (student passwordless "My Journey" link)
 * Idempotent.
 *
 * Run in the Railway Console:
 *   node scripts/crm-phase5-intake-migrate.cjs
 */
const mysql = require("mysql2/promise");

const COLUMNS = [
  ["users", "intakeToken", "VARCHAR(32) NULL"],
  ["leads", "journeyToken", "VARCHAR(32) NULL"],
];

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  let added = 0, skipped = 0;
  for (const [table, name, def] of COLUMNS) {
    try {
      await c.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
      console.log(`  + added ${table}.${name}`);
      added++;
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log(`  = ${table}.${name} already exists, skipped`);
        skipped++;
      } else {
        throw e;
      }
    }
  }
  await c.end();
  console.log(`\nDone — ${added} added, ${skipped} already existed. Intake/journey columns ready.`);
})().catch(e => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
