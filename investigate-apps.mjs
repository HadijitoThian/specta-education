import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

console.log('=== INVESTIGATING 58 APPLICATIONS ===\n');

// 1. Get all applications from last 2 weeks
const [apps] = await conn.execute(
  `SELECT id, referenceNumber, fullName, email, phone, currentSchool, educationLevel, 
   ieltsScore, selectedUniversities, status, assignedCounselor, additionalNotes,
   createdAt, updatedAt 
   FROM applications WHERE createdAt >= ? ORDER BY createdAt ASC`, 
  [twoWeeksAgo]
);

console.log(`Total applications found: ${apps.length}\n`);

// 2. Check for patterns - duplicate emails, names, timing
const emailCounts = {};
const nameCounts = {};
const timestamps = [];
const testPatterns = ['test', 'demo', 'example', 'fake', 'sample', 'asdf', 'qwerty', 'xxx', 'aaa', 'bbb'];

let suspiciousCount = 0;
let realCount = 0;

for (const app of apps) {
  emailCounts[app.email] = (emailCounts[app.email] || 0) + 1;
  nameCounts[app.fullName] = (nameCounts[app.fullName] || 0) + 1;
  timestamps.push(new Date(app.createdAt).getTime());
  
  const isTestLike = testPatterns.some(p => 
    (app.fullName || '').toLowerCase().includes(p) || 
    (app.email || '').toLowerCase().includes(p) ||
    (app.phone || '').toLowerCase().includes(p)
  );
  
  if (isTestLike) suspiciousCount++;
  
  console.log(`#${app.id} | ${app.referenceNumber || 'N/A'} | ${app.fullName} | ${app.email} | ${app.phone} | ${app.currentSchool || 'N/A'} | ${app.educationLevel || 'N/A'} | ${app.status} | ${app.createdAt}`);
  
  // Parse selected universities
  try {
    const unis = JSON.parse(app.selectedUniversities || '[]');
    if (unis.length > 0) {
      console.log(`  → Universities: ${unis.map(u => `${u.university || u.name || 'N/A'} (${u.country || 'N/A'})`).join(', ')}`);
    }
  } catch(e) {
    console.log(`  → Universities: ${app.selectedUniversities?.substring(0, 100)}`);
  }
}

// 3. Duplicate analysis
console.log(`\n=== DUPLICATE ANALYSIS ===`);
const dupEmails = Object.entries(emailCounts).filter(([k, v]) => v > 1);
const dupNames = Object.entries(nameCounts).filter(([k, v]) => v > 1);
console.log(`Duplicate emails: ${dupEmails.length > 0 ? dupEmails.map(([k,v]) => `${k} (${v}x)`).join(', ') : 'None'}`);
console.log(`Duplicate names: ${dupNames.length > 0 ? dupNames.map(([k,v]) => `${k} (${v}x)`).join(', ') : 'None'}`);

// 4. Timing analysis - were they submitted in rapid succession?
console.log(`\n=== TIMING ANALYSIS ===`);
if (timestamps.length > 1) {
  const gaps = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push(timestamps[i] - timestamps[i-1]);
  }
  const avgGap = gaps.reduce((a,b) => a+b, 0) / gaps.length;
  const minGap = Math.min(...gaps);
  const maxGap = Math.max(...gaps);
  console.log(`Average time between submissions: ${(avgGap / 1000).toFixed(1)}s`);
  console.log(`Fastest gap: ${(minGap / 1000).toFixed(1)}s`);
  console.log(`Longest gap: ${(maxGap / 1000 / 60).toFixed(1)} minutes`);
  
  // Count submissions within 1 second of each other (likely automated)
  const rapidFire = gaps.filter(g => g < 1000).length;
  console.log(`Submissions within 1 second of each other: ${rapidFire}`);
  const within5sec = gaps.filter(g => g < 5000).length;
  console.log(`Submissions within 5 seconds of each other: ${within5sec}`);
}

// 5. Unique emails
console.log(`\n=== UNIQUE ANALYSIS ===`);
console.log(`Unique emails: ${Object.keys(emailCounts).length}`);
console.log(`Unique names: ${Object.keys(nameCounts).length}`);
console.log(`Suspicious (test-like) entries: ${suspiciousCount}`);
console.log(`Likely real entries: ${apps.length - suspiciousCount}`);

// 6. Check date distribution
console.log(`\n=== DATE DISTRIBUTION ===`);
const byDate = {};
apps.forEach(a => {
  const d = new Date(a.createdAt).toISOString().slice(0, 10);
  byDate[d] = (byDate[d] || 0) + 1;
});
Object.entries(byDate).sort().forEach(([d, c]) => console.log(`  ${d}: ${c} applications`));

await conn.end();
process.exit(0);
