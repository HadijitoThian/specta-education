/**
 * Social Media (SosMed) Phase 1 migration:
 *   - add 'marketing' to users.crmRole enum
 *   - create brand_kit table + seed one row from the SpecTa DNA research
 * Idempotent.
 *
 * Run in the Railway Console:
 *   node scripts/sosmed-phase1-migrate.cjs
 */
const mysql = require("mysql2/promise");

const ANGLES = [
  "100% Scholarship Stories — real alumni, before/after (high school → fully funded).",
  "Weekly Parent Report teaser — \"The only agency in Indonesia that does this.\"",
  "IELTS Mock Test value — Rp 79.000 vs the real exam (risk-free band score).",
  "Which-country-fits-you quiz / destination carousel.",
  "Tes Bakat AI reveal — \"AI told me my real major.\"",
  "Student success highlight reels (IELTS journeys).",
  "IELTS tips carousels — \"5 things IELTS teachers wish you knew.\"",
  "Day-in-the-life: counsellor / office behind-the-scenes.",
  "Scholarship eligibility checklist — \"Let's check YOURS.\"",
  "IELTS Mock walkthrough — all 4 skills, AI-graded, PDF report.",
  "Parent testimonials (trust, visa handled, child placed).",
  "University spotlights (partner unis + rankings).",
  "Cost-of-study comparisons by country.",
  "IELTS score transformation — \"5.0 → 7.0, here's how.\"",
  "Free-consultation CTA — \"No commitment, just 20 minutes.\"",
].join("\n");

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);

  // 1) extend the crmRole enum
  await c.query(
    "ALTER TABLE users MODIFY COLUMN crmRole " +
      "ENUM('none','owner','counselor','ielts_instructor','visa_specialist','front_desk','marketing') " +
      "NOT NULL DEFAULT 'none'"
  );
  console.log("  = crmRole enum now includes 'marketing'");

  // 2) brand_kit table
  await c.query(`CREATE TABLE IF NOT EXISTS brand_kit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brandName VARCHAR(160) NOT NULL DEFAULT 'SpecTa Education',
    logoUrl VARCHAR(500) NULL,
    primaryColor VARCHAR(16) NOT NULL DEFAULT '#E91E8C',
    secondaryColor VARCHAR(16) NOT NULL DEFAULT '#9C27B0',
    accentColor VARCHAR(16) NOT NULL DEFAULT '#FF6B4A',
    fontHeading VARCHAR(80) NOT NULL DEFAULT 'Poppins',
    fontBody VARCHAR(80) NOT NULL DEFAULT 'Poppins',
    toneOfVoice TEXT NULL,
    targetAudience TEXT NULL,
    keyOffers TEXT NULL,
    doList TEXT NULL,
    dontList TEXT NULL,
    contentAngles TEXT NULL,
    hashtags TEXT NULL,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);

  // 3) seed one row if empty
  const [[{ n }]] = await c.query("SELECT COUNT(*) AS n FROM brand_kit");
  if (n === 0) {
    await c.query(
      `INSERT INTO brand_kit
        (logoUrl, toneOfVoice, targetAudience, keyOffers, doList, dontList, contentAngles, hashtags)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        "https://www.spectaeducation.com/files/migrated/QxrYSewOYzAuPIEN.jpeg",
        "Professional, warm and empowering. Bilingual Indonesian + English (lead in the audience's language). Action-driven and trustworthy — never pushy. Parents are decision-makers, so stay family-aware.",
        "Indonesian SMA/SMK & undergraduate students (18–24) aiming to study abroad, plus their parents (decision-makers). Also scholarship seekers.",
        "Study-abroad counseling (free consult); IELTS prep (score + money-back guarantee); IELTS Mock Test Rp 79.000 (AI-graded, 4 skills); Tes Bakat AI aptitude test; 100% scholarships (China, Mila Malaysia, LPDP); 10+ destinations; automatic weekly parent progress reports.",
        "Use real alumni names + scores; lead with student outcomes; spotlight the weekly-parent-report USP; bilingual captions; one clear CTA (WhatsApp +62 818 218 388 / free consultation); on-brand colors + logo; authentic photos of real students/offices.",
        "Don't fake guarantees or numbers; avoid uncanny AI faces for 'students'; don't over-promise visas/scholarships; no IELTS/Cambridge trademark misuse; never sound salesy/pushy; keep claims truthful (1000+ students, 200+ scholarships, since 2005).",
        ANGLES,
        "#SpecTaEducation #KuliahDiLuarNegeri #StudyAbroad #BeasiswaLuarNegeri #IELTS #IELTSPreparation #StudyAbroadIndonesia #Beasiswa #IELTSIndonesia #KuliahKeLuarNegeri",
      ]
    );
    console.log("  + seeded brand_kit row");
  } else {
    console.log("  = brand_kit already has data, not reseeding");
  }

  await c.end();
  console.log("\nDone — SosMed Phase 1 ready (marketing role + brand_kit).");
})().catch(e => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
