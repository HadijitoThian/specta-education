import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

const [apps] = await conn.execute(
  `SELECT fullName, email, phone, currentSchool, createdAt FROM applications WHERE createdAt >= ? AND email != 'applicant@test.com' ORDER BY createdAt ASC`,
  [twoWeeksAgo]
);
console.log('=== NON-TEST APPLICATIONS ===');
console.log('Total:', apps.length);
apps.forEach(a => console.log(`${a.fullName} | ${a.email} | ${a.phone} | ${a.currentSchool || 'N/A'} | ${a.createdAt}`));

// Also check total test data across all tables
const [totalTestApps] = await conn.execute(`SELECT COUNT(*) as cnt FROM applications WHERE email = 'applicant@test.com'`);
console.log(`\nTotal test applications (all time): ${totalTestApps[0].cnt}`);

// Check simulator sessions - are those real?
const [simSessions] = await conn.execute(
  `SELECT studentName, studentEmail, country, status, createdAt FROM simulatorSessions WHERE createdAt >= ? ORDER BY createdAt DESC LIMIT 10`,
  [twoWeeksAgo]
);
console.log('\n=== RECENT SIMULATOR SESSIONS ===');
simSessions.forEach(s => console.log(`${s.studentName} | ${s.studentEmail} | ${s.country} | ${s.status} | ${s.createdAt}`));

// Check unique simulator emails
const [simUnique] = await conn.execute(
  `SELECT COUNT(DISTINCT studentEmail) as cnt, COUNT(*) as total FROM simulatorSessions WHERE createdAt >= ?`,
  [twoWeeksAgo]
);
console.log(`\nSimulator: ${simUnique[0].total} sessions from ${simUnique[0].cnt} unique emails`);

// Check consultation bookings
const [bookings] = await conn.execute(
  `SELECT studentName, studentEmail, studentPhone, consultationType, status, createdAt FROM appointments WHERE createdAt >= ? ORDER BY createdAt DESC`,
  [twoWeeksAgo]
);
console.log('\n=== CONSULTATION BOOKINGS ===');
bookings.forEach(b => console.log(`${b.studentName} | ${b.studentEmail} | ${b.studentPhone} | ${b.consultationType} | ${b.status} | ${b.createdAt}`));

await conn.end();
process.exit(0);
