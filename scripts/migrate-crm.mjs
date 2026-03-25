import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Make conversationId nullable for manual CRM entries
  await conn.execute('ALTER TABLE leads MODIFY COLUMN conversationId int NULL');
  console.log('✅ conversationId is now nullable');

  // Check existing columns
  const [cols] = await conn.execute('DESCRIBE leads');
  const colNames = cols.map(r => r.Field);
  console.log('Existing columns:', colNames.join(', '));

  // Add assignedCounselor if missing
  if (!colNames.includes('assignedCounselor')) {
    await conn.execute('ALTER TABLE leads ADD COLUMN assignedCounselor varchar(255) NULL');
    console.log('✅ Added assignedCounselor column');
  } else {
    console.log('ℹ️  assignedCounselor already exists');
  }

  // Add programInterest if missing
  if (!colNames.includes('programInterest')) {
    await conn.execute('ALTER TABLE leads ADD COLUMN programInterest varchar(255) NULL');
    console.log('✅ Added programInterest column');
  } else {
    console.log('ℹ️  programInterest already exists');
  }

  console.log('✅ Migration complete');
} catch (e) {
  console.error('Migration error:', e.message);
} finally {
  await conn.end();
}
