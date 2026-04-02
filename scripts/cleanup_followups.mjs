import { createPool } from "/home/ubuntu/specta-education/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js";

const pool = createPool({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const conn = await pool.getConnection();

// Delete ALL pending follow-up actions (orphaned - leads were deleted)
const [result] = await conn.query("DELETE FROM follow_up_actions WHERE status = 'pending'");
console.log("Deleted pending follow-up actions:", result.affectedRows);

// Also mark any 'failed' ones as skipped so they don't retry
const [result2] = await conn.query("UPDATE follow_up_actions SET status = 'skipped' WHERE status = 'failed'");
console.log("Marked failed actions as skipped:", result2.affectedRows);

// Final count
const [remaining] = await conn.query("SELECT status, COUNT(*) as cnt FROM follow_up_actions GROUP BY status");
console.log("\nRemaining follow-up actions by status:");
for (const r of remaining) {
  console.log(`  ${r.status}: ${r.cnt}`);
}

conn.release();
await pool.end();
console.log("\nDone! All orphaned follow-up actions cleaned up.");
