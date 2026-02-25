import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const conn = await mysql.createConnection(DATABASE_URL);

// Get the latest conversation
const [convs] = await conn.execute('SELECT id, sessionId, studentName FROM conversations ORDER BY id DESC LIMIT 1');
const conv = convs[0];
console.log('Conversation:', conv);

// Get messages for this conversation
const [msgs] = await conn.execute('SELECT id, role, SUBSTRING(content, 1, 60) as preview FROM messages WHERE conversationId = ? ORDER BY createdAt ASC', [conv.id]);
console.log(`\n=== ${msgs.length} messages ===`);
for (const m of msgs) {
  console.log(`  #${m.id} [${m.role}] ${m.preview}...`);
}

// Check: does the getHistory query work as expected?
const [convBySession] = await conn.execute('SELECT id, sessionId, studentName, studentPhone FROM conversations WHERE sessionId = ?', [conv.sessionId]);
console.log('\nLookup by sessionId:', convBySession.length > 0 ? 'FOUND' : 'NOT FOUND');

await conn.end();
process.exit(0);
