/**
 * CRM Phase 2 — add the student-pipeline columns to the `leads` table.
 * Idempotent: safe to run more than once.
 *
 * Run in the Railway Console:
 *   node scripts/crm-phase2-migrate.cjs
 */
const mysql = require("mysql2/promise");

const COLUMNS = [
  ["parentPhone", "VARCHAR(50) NULL"],
  ["pipelineStage", "ENUM('new_lead','consultation','ielts_prep','shortlist','application','offer','visa','pre_departure','enrolled','inactive') NOT NULL DEFAULT 'new_lead'"],
  ["assignedCounselorId", "INT NULL"],
  ["office", "ENUM('kelapa_gading','pik','gading_serpong') NULL"],
];

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  let added = 0, skipped = 0;
  for (const [name, def] of COLUMNS) {
    try {
      await c.query(`ALTER TABLE leads ADD COLUMN ${name} ${def}`);
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
  console.log(`\nDone — ${added} added, ${skipped} already existed. CRM Phase 2 columns ready.`);
})().catch(e => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
