import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT id, universityName, country, outreachStatus, approvalStatus,
    CASE WHEN outreachEmailDraft IS NOT NULL THEN 'YES' ELSE 'NO' END as hasDraft,
    COALESCE(outreachRecipientEmail, agentRecruitmentEmail, internationalOfficeEmail) as contactEmail
   FROM university_partnerships 
   WHERE approvalStatus = 'pending_draft'
   ORDER BY id DESC`
);

console.log('Total pending:', rows.length);
for (const p of rows) {
  console.log(`[${p.id}] ${p.universityName} (${p.country}) - ${p.outreachStatus} - Draft: ${p.hasDraft} - Email: ${p.contactEmail || 'NONE'}`);
}

await conn.end();
process.exit(0);
