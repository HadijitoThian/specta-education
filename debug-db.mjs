import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

const [convs] = await conn.execute('SELECT id, sessionId, studentName, studentPhone, status FROM conversations ORDER BY id DESC LIMIT 10');
console.log('=== Conversations ===');
for (const c of convs) {
  const [msgs] = await conn.execute('SELECT COUNT(*) as cnt FROM messages WHERE conversationId = ?', [c.id]);
  console.log(`Conv #${c.id} | session: ${c.sessionId?.substring(0,15)}... | name: ${c.studentName} | phone: ${c.studentPhone} | status: ${c.status} | messages: ${msgs[0].cnt}`);
  
  // Show last 3 messages
  const [lastMsgs] = await conn.execute('SELECT role, SUBSTRING(content, 1, 80) as preview FROM messages WHERE conversationId = ? ORDER BY id DESC LIMIT 3', [c.id]);
  for (const m of lastMsgs.reverse()) {
    console.log(`  [${m.role}] ${m.preview}...`);
  }
}

await conn.end();
process.exit(0);
