/**
 * Re-fill the SpecTa Brand Kit from the DNA research. Fills ONLY empty fields
 * (won't overwrite anything you've customised), and never touches the logos or
 * the Art Director visual style. Safe to run anytime.
 *
 *   node scripts/sosmed-seed-brandkit.cjs
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

const FIELDS = {
  brandName: "SpecTa Education",
  primaryColor: "#E91E8C",
  secondaryColor: "#9C27B0",
  accentColor: "#FF6B4A",
  fontHeading: "Poppins",
  fontBody: "Poppins",
  toneOfVoice: "Professional, warm and empowering. Bilingual Indonesian + English (lead in the audience's language). Action-driven and trustworthy — never pushy. Parents are decision-makers, so stay family-aware.",
  targetAudience: "Indonesian SMA/SMK & undergraduate students (18–24) aiming to study abroad, plus their parents (decision-makers). Also scholarship seekers.",
  keyOffers: "Study-abroad counseling (free consult); IELTS prep (score + money-back guarantee); IELTS Mock Test Rp 79.000 (AI-graded, 4 skills); Tes Bakat AI aptitude test; 100% scholarships (China, Mila Malaysia, LPDP); 10+ destinations; automatic weekly parent progress reports. Since 2005 · 1000+ students · 200+ scholarships · 4.9★.",
  doList: "Use real alumni names + scores; lead with student outcomes; spotlight the weekly-parent-report USP; bilingual captions; one clear CTA (WhatsApp +62 818 218 388 / free consultation); on-brand colors + logo; authentic photos of real students/offices.",
  dontList: "Don't fake guarantees or numbers; avoid uncanny AI faces for 'students'; don't over-promise visas/scholarships; no IELTS/Cambridge trademark misuse; never sound salesy/pushy; keep claims truthful (1000+ students, 200+ scholarships, since 2005).",
  contentAngles: ANGLES,
  hashtags: "#SpecTaEducation #KuliahDiLuarNegeri #StudyAbroad #BeasiswaLuarNegeri #IELTS #IELTSPreparation #StudyAbroadIndonesia #Beasiswa #IELTSIndonesia #KuliahKeLuarNegeri",
};

(async () => {
  const c = await mysql.createConnection({ uri: process.env.DATABASE_URL, charset: "utf8mb4" });
  const [[{ n }]] = await c.query("SELECT COUNT(*) AS n FROM brand_kit");
  if (n === 0) {
    const cols = Object.keys(FIELDS);
    await c.query(`INSERT INTO brand_kit (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, Object.values(FIELDS));
    console.log("  + created + seeded brand_kit row");
  } else {
    // Fill only blank fields; never clobber customised values.
    const sets = Object.keys(FIELDS).map(k => `${k} = IF(${k} IS NULL OR ${k} = '', ?, ${k})`);
    await c.query(`UPDATE brand_kit SET ${sets.join(", ")}`, Object.values(FIELDS));
    console.log("  = filled any empty brand_kit fields");
  }
  await c.end();
  console.log("Done — Brand Kit completed (logos + visual style left untouched).");
})().catch(e => { console.error("Failed:", e.message); process.exit(1); });
