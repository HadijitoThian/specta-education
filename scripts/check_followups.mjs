import { createPool } from "/home/ubuntu/specta-education/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js";

const pool = createPool({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const conn = await pool.getConnection();

// Check count of pending follow-up actions
const [pending] = await conn.query("SELECT COUNT(*) as cnt FROM follow_up_actions WHERE status = 'pending'");
console.log("Pending follow-up actions:", pending[0].cnt);

// Check count of all follow-up actions
const [all] = await conn.query("SELECT COUNT(*) as cnt FROM follow_up_actions");
console.log("Total follow-up actions:", all[0].cnt);

// Check leads table
const [leads] = await conn.query("SELECT COUNT(*) as cnt FROM leads");
console.log("Leads in DB:", leads[0].cnt);

// Check lead_assignments table
const [assignments] = await conn.query("SELECT COUNT(*) as cnt FROM lead_assignments");
console.log("Lead assignments in DB:", assignments[0].cnt);

// Show sample pending actions
const [samples] = await conn.query("SELECT id, assignmentId, actionType, dayOffset, status, scheduledAt, LEFT(content, 300) as content_preview FROM follow_up_actions WHERE status = 'pending' LIMIT 5");
console.log("\nSample pending actions:");
for (const s of samples) {
  console.log(JSON.stringify(s, null, 2));
}

conn.release();
await pool.end();
