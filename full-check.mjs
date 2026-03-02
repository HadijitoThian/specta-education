import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

// Appointments
console.log('=== APPOINTMENTS (past 2 weeks) ===');
const [appts] = await conn.execute(
  `SELECT id, fullName, email, phone, consultationType, status, createdAt FROM appointments WHERE createdAt >= ? ORDER BY createdAt DESC`,
  [twoWeeksAgo]
);
appts.forEach(a => console.log(`#${a.id} | ${a.fullName} | ${a.email} | ${a.phone} | ${a.consultationType} | ${a.status} | ${a.createdAt}`));
const testAppts = appts.filter(a => a.email?.includes('test') || a.email?.includes('example') || a.fullName?.toLowerCase().includes('test'));
console.log(`Total: ${appts.length} | Test-like: ${testAppts.length} | Likely real: ${appts.length - testAppts.length}`);

// Simulator - check unique real users
console.log('\n=== SIMULATOR SESSIONS (past 2 weeks) ===');
const [sims] = await conn.execute(
  `SELECT studentEmail, COUNT(*) as cnt FROM simulatorSessions WHERE createdAt >= ? GROUP BY studentEmail ORDER BY cnt DESC`,
  [twoWeeksAgo]
);
sims.forEach(s => console.log(`${s.studentEmail}: ${s.cnt} sessions`));
const testSims = sims.filter(s => s.studentEmail?.includes('test') || s.studentEmail?.includes('example'));
const realSimCount = sims.filter(s => !s.studentEmail?.includes('test') && !s.studentEmail?.includes('example')).reduce((a, s) => a + Number(s.cnt), 0);
console.log(`Unique emails: ${sims.length} | Test-like emails: ${testSims.length} | Real sessions: ${realSimCount}`);

// Quiz results - check real
console.log('\n=== QUIZ RESULTS (past 2 weeks) ===');
const [quizzes] = await conn.execute(
  `SELECT studentName, studentEmail, topMatch, createdAt FROM quizResults WHERE createdAt >= ? ORDER BY createdAt DESC`,
  [twoWeeksAgo]
);
quizzes.forEach(q => console.log(`${q.studentName || 'N/A'} | ${q.studentEmail || 'N/A'} | ${q.topMatch} | ${q.createdAt}`));

// Persona results
console.log('\n=== PERSONA RESULTS (past 2 weeks) ===');
const [personas] = await conn.execute(
  `SELECT studentName, studentEmail, personaName, createdAt FROM personaResults WHERE createdAt >= ? ORDER BY createdAt DESC`,
  [twoWeeksAgo]
);
personas.forEach(p => console.log(`${p.studentName || 'N/A'} | ${p.studentEmail || 'N/A'} | ${p.personaName} | ${p.createdAt}`));

// Users - check the 33 registrations
console.log('\n=== USER REGISTRATIONS (past 2 weeks) ===');
const [users] = await conn.execute(
  `SELECT id, name, email, role, createdAt FROM users WHERE createdAt >= ? ORDER BY createdAt DESC LIMIT 35`,
  [twoWeeksAgo]
);
users.forEach(u => console.log(`#${u.id} | ${u.name} | ${u.email} | ${u.role} | ${u.createdAt}`));
const testUsers = users.filter(u => u.email?.includes('test') || u.email?.includes('example') || u.name?.toLowerCase().includes('test'));
console.log(`Total: ${users.length} | Test-like: ${testUsers.length} | Likely real: ${users.length - testUsers.length}`);

await conn.end();
process.exit(0);
