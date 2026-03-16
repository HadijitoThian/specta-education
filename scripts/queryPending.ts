import { getDb } from '../server/_core/db';
import { universityPartnerships } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB'); process.exit(1); }
  
  const pending = await db.select({
    id: universityPartnerships.id,
    name: universityPartnerships.universityName,
    country: universityPartnerships.country,
    outreachStatus: universityPartnerships.outreachStatus,
    recipientEmail: universityPartnerships.outreachRecipientEmail,
    agentEmail: universityPartnerships.agentRecruitmentEmail,
    contactEmail: universityPartnerships.internationalOfficeEmail,
  }).from(universityPartnerships)
    .where(eq(universityPartnerships.approvalStatus, 'pending_draft'));

  console.log('Total pending:', pending.length);
  for (const p of pending) {
    const email = p.recipientEmail || p.agentEmail || p.contactEmail || 'NONE';
    console.log(`[${p.id}] ${p.name} (${p.country}) - ${p.outreachStatus} - Email: ${email}`);
  }
  process.exit(0);
}

main();
