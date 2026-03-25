import mysql from 'mysql2/promise';
import crypto from 'crypto';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const content = fs.readFileSync('./drizzle/0030_far_sister_grimm.sql', 'utf8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  console.log('Migration hash:', hash);
  
  // Check if already applied
  const [existing] = await conn.execute('SELECT id FROM __drizzle_migrations WHERE hash = ?', [hash]);
  if (existing.length > 0) {
    console.log('Migration already marked as applied');
  } else {
    await conn.execute('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [hash, Date.now()]);
    console.log('✅ Migration marked as applied');
  }
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await conn.end();
}
