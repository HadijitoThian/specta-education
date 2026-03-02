import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

console.log(`\n========================================`);
console.log(`  SpecTa Education - 2-Week Activity Report`);
console.log(`  Period: ${twoWeeksAgo} to ${now}`);
console.log(`========================================\n`);

// 1. CHATBOT CONVERSATIONS
console.log(`--- 1. CHATBOT CONVERSATIONS ---`);
const [convTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM conversations WHERE createdAt >= ?`, [twoWeeksAgo]);
const [convByStatus] = await conn.execute(`SELECT status, COUNT(*) as cnt FROM conversations WHERE createdAt >= ? GROUP BY status ORDER BY cnt DESC`, [twoWeeksAgo]);
const [convByDay] = await conn.execute(`SELECT DATE(createdAt) as day, COUNT(*) as cnt FROM conversations WHERE createdAt >= ? GROUP BY DATE(createdAt) ORDER BY day`, [twoWeeksAgo]);
console.log(`Total new conversations: ${convTotal[0].cnt}`);
console.log(`By status:`, convByStatus.map(r => `${r.status}: ${r.cnt}`).join(', '));
console.log(`By day:`);
convByDay.forEach(r => console.log(`  ${r.day}: ${r.cnt} conversations`));

// 2. CHAT MESSAGES
console.log(`\n--- 2. CHAT MESSAGES ---`);
const [msgTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM messages WHERE createdAt >= ?`, [twoWeeksAgo]);
const [msgByRole] = await conn.execute(`SELECT role, COUNT(*) as cnt FROM messages WHERE createdAt >= ? GROUP BY role`, [twoWeeksAgo]);
console.log(`Total messages: ${msgTotal[0].cnt}`);
console.log(`By role:`, msgByRole.map(r => `${r.role}: ${r.cnt}`).join(', '));

// 3. LEADS
console.log(`\n--- 3. LEADS ---`);
const [leadsTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM leads WHERE createdAt >= ?`, [twoWeeksAgo]);
const [leadsByStatus] = await conn.execute(`SELECT status, COUNT(*) as cnt FROM leads WHERE createdAt >= ? GROUP BY status ORDER BY cnt DESC`, [twoWeeksAgo]);
const [leadsByDay] = await conn.execute(`SELECT DATE(createdAt) as day, COUNT(*) as cnt FROM leads WHERE createdAt >= ? GROUP BY DATE(createdAt) ORDER BY day`, [twoWeeksAgo]);
const [recentLeads] = await conn.execute(`SELECT studentName, studentEmail, studentPhone, preferredCountry, status, createdAt FROM leads WHERE createdAt >= ? ORDER BY createdAt DESC LIMIT 20`, [twoWeeksAgo]);
console.log(`Total new leads: ${leadsTotal[0].cnt}`);
console.log(`By status:`, leadsByStatus.map(r => `${r.status}: ${r.cnt}`).join(', '));
console.log(`By day:`);
leadsByDay.forEach(r => console.log(`  ${r.day}: ${r.cnt} leads`));
console.log(`Recent leads:`);
recentLeads.forEach(r => console.log(`  ${r.studentName || 'N/A'} | ${r.studentEmail || 'N/A'} | ${r.studentPhone || 'N/A'} | ${r.preferredCountry || 'N/A'} | ${r.status} | ${r.createdAt}`));

// 4. APTITUDE TEST (Tes Bakat AI)
console.log(`\n--- 4. APTITUDE TEST (Tes Bakat AI) ---`);
const [aptTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM aptitudeResults WHERE createdAt >= ?`, [twoWeeksAgo]);
const [aptByDay] = await conn.execute(`SELECT DATE(createdAt) as day, COUNT(*) as cnt FROM aptitudeResults WHERE createdAt >= ? GROUP BY DATE(createdAt) ORDER BY day`, [twoWeeksAgo]);
const [aptByLang] = await conn.execute(`SELECT language, COUNT(*) as cnt FROM aptitudeResults WHERE createdAt >= ? GROUP BY language`, [twoWeeksAgo]);
const [recentApt] = await conn.execute(`SELECT studentName, studentEmail, hollandCode, createdAt FROM aptitudeResults WHERE createdAt >= ? ORDER BY createdAt DESC LIMIT 10`, [twoWeeksAgo]);
console.log(`Total test completions: ${aptTotal[0].cnt}`);
console.log(`By language:`, aptByLang.map(r => `${r.language}: ${r.cnt}`).join(', '));
console.log(`By day:`);
aptByDay.forEach(r => console.log(`  ${r.day}: ${r.cnt} tests`));
console.log(`Recent test takers:`);
recentApt.forEach(r => console.log(`  ${r.studentName} | ${r.studentEmail} | Holland: ${r.hollandCode} | ${r.createdAt}`));

// 5. APTITUDE PRO ORDERS (Paid Tests)
console.log(`\n--- 5. APTITUDE PRO ORDERS (Paid) ---`);
const [ordersTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM aptitudeProOrders WHERE createdAt >= ?`, [twoWeeksAgo]);
const [ordersByStatus] = await conn.execute(`SELECT status, COUNT(*) as cnt, SUM(amount) as total FROM aptitudeProOrders WHERE createdAt >= ? GROUP BY status`, [twoWeeksAgo]);
const [paidOrders] = await conn.execute(`SELECT customerName, customerEmail, amount, status, paidAt, createdAt FROM aptitudeProOrders WHERE createdAt >= ? ORDER BY createdAt DESC LIMIT 10`, [twoWeeksAgo]);
console.log(`Total orders: ${ordersTotal[0].cnt}`);
console.log(`By status:`, ordersByStatus.map(r => `${r.status}: ${r.cnt} (IDR ${r.total || 0})`).join(', '));
console.log(`Recent orders:`);
paidOrders.forEach(r => console.log(`  ${r.customerName} | ${r.customerEmail} | IDR ${r.amount} | ${r.status} | ${r.createdAt}`));

// 6. ACCESS TOKENS
console.log(`\n--- 6. APTITUDE ACCESS TOKENS ---`);
const [tokensTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM aptitudeAccessTokens WHERE createdAt >= ?`, [twoWeeksAgo]);
const [tokensByStatus] = await conn.execute(`SELECT status, COUNT(*) as cnt FROM aptitudeAccessTokens WHERE createdAt >= ? GROUP BY status`, [twoWeeksAgo]);
console.log(`Total tokens created: ${tokensTotal[0].cnt}`);
console.log(`By status:`, tokensByStatus.map(r => `${r.status}: ${r.cnt}`).join(', '));

// 7. SCHOLARSHIP LEADS
console.log(`\n--- 7. SCHOLARSHIP LEADS ---`);
const [scholTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM scholarshipLeads WHERE createdAt >= ?`, [twoWeeksAgo]);
const [scholByStatus] = await conn.execute(`SELECT status, COUNT(*) as cnt FROM scholarshipLeads WHERE createdAt >= ? GROUP BY status`, [twoWeeksAgo]);
const [recentSchol] = await conn.execute(`SELECT studentName, studentEmail, scholarshipInterest, educationLevel, status, createdAt FROM scholarshipLeads WHERE createdAt >= ? ORDER BY createdAt DESC LIMIT 10`, [twoWeeksAgo]);
console.log(`Total scholarship leads: ${scholTotal[0].cnt}`);
console.log(`By status:`, scholByStatus.map(r => `${r.status}: ${r.cnt}`).join(', '));
recentSchol.forEach(r => console.log(`  ${r.studentName} | ${r.studentEmail} | ${r.scholarshipInterest} | ${r.educationLevel} | ${r.status}`));

// 8. QUIZ RESULTS (Country Match)
console.log(`\n--- 8. COUNTRY MATCH QUIZ ---`);
const [quizTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM quizResults WHERE createdAt >= ?`, [twoWeeksAgo]);
const [quizByCountry] = await conn.execute(`SELECT topMatch, COUNT(*) as cnt FROM quizResults WHERE createdAt >= ? GROUP BY topMatch ORDER BY cnt DESC`, [twoWeeksAgo]);
console.log(`Total quiz completions: ${quizTotal[0].cnt}`);
console.log(`Top matched countries:`, quizByCountry.map(r => `${r.topMatch}: ${r.cnt}`).join(', '));

// 9. PERSONA RESULTS
console.log(`\n--- 9. STUDY ABROAD PERSONA ---`);
const [personaTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM personaResults WHERE createdAt >= ?`, [twoWeeksAgo]);
console.log(`Total persona generations: ${personaTotal[0].cnt}`);

// 10. SIMULATOR SESSIONS
console.log(`\n--- 10. STUDY ABROAD SIMULATOR ---`);
const [simTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM simulatorSessions WHERE createdAt >= ?`, [twoWeeksAgo]);
const [simByStatus] = await conn.execute(`SELECT status, COUNT(*) as cnt FROM simulatorSessions WHERE createdAt >= ? GROUP BY status`, [twoWeeksAgo]);
const [simByCountry] = await conn.execute(`SELECT country, COUNT(*) as cnt FROM simulatorSessions WHERE createdAt >= ? GROUP BY country ORDER BY cnt DESC`, [twoWeeksAgo]);
console.log(`Total simulator sessions: ${simTotal[0].cnt}`);
console.log(`By status:`, simByStatus.map(r => `${r.status}: ${r.cnt}`).join(', '));
console.log(`By country:`, simByCountry.map(r => `${r.country}: ${r.cnt}`).join(', '));

// 11. APPLICATIONS
console.log(`\n--- 11. APPLICATIONS ---`);
const [appTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM applications WHERE createdAt >= ?`, [twoWeeksAgo]);
const [appByStatus] = await conn.execute(`SELECT status, COUNT(*) as cnt FROM applications WHERE createdAt >= ? GROUP BY status`, [twoWeeksAgo]);
console.log(`Total new applications: ${appTotal[0].cnt}`);
console.log(`By status:`, appByStatus.map(r => `${r.status}: ${r.cnt}`).join(', '));

// 12. APPOINTMENTS (Consultations)
console.log(`\n--- 12. CONSULTATION BOOKINGS ---`);
const [apptTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM appointments WHERE createdAt >= ?`, [twoWeeksAgo]);
const [apptByStatus] = await conn.execute(`SELECT status, COUNT(*) as cnt FROM appointments WHERE createdAt >= ? GROUP BY status`, [twoWeeksAgo]);
const [apptByType] = await conn.execute(`SELECT consultationType, COUNT(*) as cnt FROM appointments WHERE createdAt >= ? GROUP BY consultationType ORDER BY cnt DESC`, [twoWeeksAgo]);
console.log(`Total bookings: ${apptTotal[0].cnt}`);
console.log(`By status:`, apptByStatus.map(r => `${r.status}: ${r.cnt}`).join(', '));
console.log(`By type:`, apptByType.map(r => `${r.consultationType}: ${r.cnt}`).join(', '));

// 13. WHATSAPP MESSAGES
console.log(`\n--- 13. WHATSAPP CONTACT FORM ---`);
const [waTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM whatsappMessages WHERE createdAt >= ?`, [twoWeeksAgo]);
console.log(`Total WhatsApp form submissions: ${waTotal[0].cnt}`);

// 14. DOCUMENTS UPLOADED
console.log(`\n--- 14. DOCUMENTS UPLOADED ---`);
const [docTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM documents WHERE createdAt >= ?`, [twoWeeksAgo]);
const [docByType] = await conn.execute(`SELECT documentType, COUNT(*) as cnt FROM documents WHERE createdAt >= ? GROUP BY documentType`, [twoWeeksAgo]);
console.log(`Total documents uploaded: ${docTotal[0].cnt}`);
console.log(`By type:`, docByType.map(r => `${r.documentType}: ${r.cnt}`).join(', '));

// 15. IELTS PRACTICE
console.log(`\n--- 15. IELTS PRACTICE TESTS ---`);
const [ieltsTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM ieltsPracticeResults WHERE createdAt >= ?`, [twoWeeksAgo]);
const [ieltsBySection] = await conn.execute(`SELECT section, COUNT(*) as cnt FROM ieltsPracticeResults WHERE createdAt >= ? GROUP BY section`, [twoWeeksAgo]);
console.log(`Total IELTS practice attempts: ${ieltsTotal[0].cnt}`);
console.log(`By section:`, ieltsBySection.map(r => `${r.section}: ${r.cnt}`).join(', '));

// 16. DRIP CAMPAIGN ACTIVITY
console.log(`\n--- 16. DRIP CAMPAIGN EMAILS ---`);
const [dripTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM dripEmailLogs WHERE createdAt >= ?`, [twoWeeksAgo]);
const [dripByStatus] = await conn.execute(`SELECT status, COUNT(*) as cnt FROM dripEmailLogs WHERE createdAt >= ? GROUP BY status`, [twoWeeksAgo]);
const [dripEnrollTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM dripEnrollments WHERE createdAt >= ?`, [twoWeeksAgo]);
console.log(`Total drip emails sent: ${dripTotal[0].cnt}`);
console.log(`By status:`, dripByStatus.map(r => `${r.status}: ${r.cnt}`).join(', '));
console.log(`New enrollments: ${dripEnrollTotal[0].cnt}`);

// 17. BLOG ACTIVITY
console.log(`\n--- 17. BLOG ---`);
const [blogTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM blog_posts WHERE createdAt >= ?`, [twoWeeksAgo]);
const [commentTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM blog_comments WHERE createdAt >= ?`, [twoWeeksAgo]);
console.log(`New blog posts: ${blogTotal[0].cnt}`);
console.log(`New comments: ${commentTotal[0].cnt}`);

// 18. USER REGISTRATIONS
console.log(`\n--- 18. USER REGISTRATIONS ---`);
const [userTotal] = await conn.execute(`SELECT COUNT(*) as cnt FROM users WHERE createdAt >= ?`, [twoWeeksAgo]);
const [usersByDay] = await conn.execute(`SELECT DATE(createdAt) as day, COUNT(*) as cnt FROM users WHERE createdAt >= ? GROUP BY DATE(createdAt) ORDER BY day`, [twoWeeksAgo]);
console.log(`Total new users: ${userTotal[0].cnt}`);
usersByDay.forEach(r => console.log(`  ${r.day}: ${r.cnt} users`));

// SUMMARY
console.log(`\n========================================`);
console.log(`  SUMMARY - Key Metrics (Past 2 Weeks)`);
console.log(`========================================`);
console.log(`  Chatbot Conversations: ${convTotal[0].cnt}`);
console.log(`  Chat Messages: ${msgTotal[0].cnt}`);
console.log(`  Leads Captured: ${leadsTotal[0].cnt}`);
console.log(`  Aptitude Tests Completed: ${aptTotal[0].cnt}`);
console.log(`  Pro Orders: ${ordersTotal[0].cnt}`);
console.log(`  Scholarship Leads: ${scholTotal[0].cnt}`);
console.log(`  Country Quiz Completions: ${quizTotal[0].cnt}`);
console.log(`  Persona Generations: ${personaTotal[0].cnt}`);
console.log(`  Simulator Sessions: ${simTotal[0].cnt}`);
console.log(`  Applications: ${appTotal[0].cnt}`);
console.log(`  Consultation Bookings: ${apptTotal[0].cnt}`);
console.log(`  WhatsApp Forms: ${waTotal[0].cnt}`);
console.log(`  Documents Uploaded: ${docTotal[0].cnt}`);
console.log(`  IELTS Practice: ${ieltsTotal[0].cnt}`);
console.log(`  Drip Emails Sent: ${dripTotal[0].cnt}`);
console.log(`  New Users: ${userTotal[0].cnt}`);
console.log(`========================================\n`);

await conn.end();
process.exit(0);
