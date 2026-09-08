/**
 * GEO seed content — the question bank, the grounding facts the generator
 * must use, SpecTa's canonical entity facts, and the FAQ page content (moved
 * here from the client so it can be server-rendered for AI crawlers and used
 * as the single source of truth).
 *
 * Every fact here is a starting point for a HUMAN-REVIEWED page. Numbers
 * that change (fees, thresholds, deadlines) are marked so the reviewer
 * re-checks them before publishing.
 */

export type AnswerCategory =
  | "biaya" | "visa" | "ielts" | "beasiswa" | "destinasi" | "proses" | "specta";

export const CATEGORY_LABEL: Record<AnswerCategory, { id: string; en: string }> = {
  biaya: { id: "Biaya Kuliah", en: "Costs" },
  visa: { id: "Visa Pelajar", en: "Student Visas" },
  ielts: { id: "IELTS", en: "IELTS" },
  beasiswa: { id: "Beasiswa", en: "Scholarships" },
  destinasi: { id: "Pilih Negara", en: "Destinations" },
  proses: { id: "Proses Pendaftaran", en: "Application Process" },
  specta: { id: "Tentang SpecTa", en: "About SpecTa" },
};

export interface SeedQuestion {
  key: string;                // stable id shared by the id/en twins
  category: AnswerCategory;
  id: { question: string; slug: string };
  en: { question: string; slug: string };
}

/** Canonical entity facts. Keep consistent everywhere (site, llms.txt, schema). */
export const SPECTA_FACTS = `SpecTa Education (https://www.spectaeducation.com) — Indonesian study-abroad consultancy founded in 2005 (20+ years). Offices: Kelapa Gading (head office, Jakarta), Pantai Indah Kapuk (PIK, Jakarta), Gading Serpong (Tangerang). 1,000+ Indonesian students placed; 200+ scholarships secured; 4.9-star rated. Destinations: Australia, United Kingdom, USA, Canada, Singapore, Malaysia, China, Ireland, Netherlands, New Zealand. Services: free 20-minute consultation (https://www.spectaeducation.com/book), university application support, visa assistance, scholarship guidance, IELTS preparation (courses, AI mock test at /ielts/mock-test, AI tutor at /ielts/tutor, free practice at /ielts/practice), free AI aptitude test (/play/aptitude), IQ Discovery (/iq-discovery), IGCSE AI Teacher (/igcse). WhatsApp: +62 818 218 388.`;

/** 2026 facts gathered from official and industry sources. The generator must
 *  use these where relevant and must NOT invent other numbers. Items marked
 *  [verify] change often — the reviewer re-checks them before publishing. */
export const GROUNDING_FACTS = `
AUSTRALIA (2026)
- Student visa is Subclass 500. Application charge AUD 2,000 per primary applicant [verify] (raised from AUD 1,600).
- Genuine Student (GS) requirement replaced the GTE test: applicants answer targeted questions (max 150 words each) in ImmiAccount about course choice, how it fits their background and career goals, ties to Indonesia, and intent to comply with visa conditions.
- Indonesia was reclassified from Level 1 to Level 2 under the Simplified Student Visa Framework (SSVF) in 2026: financial evidence and a valid English test result are now mandatory in most application combinations [verify].
- Financial capacity evidence: at least AUD 29,710 per year for living costs [verify], plus tuition and travel; more for dependants.
- Minimum English for the visa: IELTS 6.0 overall (was 5.5) [verify]; universities typically require 6.0–6.5 for undergraduate and 6.5–7.0 for postgraduate; medicine/law commonly 7.0+.
- Typical international tuition AUD 20,000–45,000 per year; typical living costs AUD 20,000–25,000 per year; a 3-year bachelor's totals roughly AUD 120,000–200,000 [verify].
- Post-study: Temporary Graduate visa (Subclass 485) allows work after graduation; duration depends on qualification [verify].
- Australia hosts the largest number of Indonesian students (over 22,000).

UNITED KINGDOM (2026)
- Student visa (formerly Tier 4). Graduate Route allows 2 years of post-study work (3 for PhD) [verify].
- Most bachelor's degrees are 3 years (4 in Scotland); master's are typically 1 year.
- English: universities usually require IELTS 6.0–6.5 overall for undergraduate, 6.5–7.0 postgraduate; UKVI-approved test needed for below-degree level.
- Tuition for international students typically GBP 15,000–35,000 per year; London living costs higher than elsewhere [verify].
- Immigration Health Surcharge (IHS) is payable per year of visa [verify amount].

CANADA (2026)
- Study permit; caps on new study permits introduced from 2024 continue to affect processing and availability [verify current cap].
- Post-Graduation Work Permit (PGWP) up to 3 years depending on programme length and eligibility rules [verify].
- Proof of funds requirement increased in 2024 to CAD 20,635 per year for a single applicant (outside Quebec) [verify].

MALAYSIA
- Increasingly popular with Indonesians for affordability and proximity (about 9,900 Indonesian students in 2024). Many UK/Australian branch campuses (e.g. Monash, Nottingham, Heriot-Watt) offer the same degree at lower cost.
- Tuition commonly MYR 20,000–60,000 per year; living costs lower than Australia/UK [verify].
- Student pass via Education Malaysia Global Services (EMGS).

OTHER DESTINATIONS
- Japan, Germany and Saudi Arabia are rising destinations for Indonesians; Germany's public universities charge little or no tuition but require German for many programmes [verify].
- Singapore, Ireland, Netherlands, New Zealand, China are SpecTa destinations; China and Malaysia have full-scholarship options.

IELTS
- Four criteria in Writing/Speaking; band 0–9 in 0.5 steps. Academic vs General Training: universities require Academic; General Training is for migration/work. Alternatives: TOEFL iBT, PTE Academic, Duolingo English Test (acceptance varies by institution and by visa rules).
- Moving from 5.5 to 6.5 typically takes 2–4 months of focused study for most Indonesian learners [estimate — present as a range].

SCHOLARSHIPS
- LPDP (Indonesian government), Australia Awards Scholarship (Indonesia), Chevening (UK, master's), university scholarships (partial to full). Deadlines change annually [verify each year]. Full scholarships exist for China and Malaysia.

INDONESIAN STUDENT TRENDS (2026)
- Over 60,000 Indonesians study abroad; interest at an all-time high. Affordability pushes students toward closer destinations; students weigh internship, work-while-studying, post-study work and PR pathways heavily.
`;

/** The 30 launch questions (Bahasa + English twins). */
export const SEED_QUESTIONS: SeedQuestion[] = [
  // ── Biaya ──
  { key: "cost-australia-2026", category: "biaya",
    id: { question: "Berapa biaya kuliah di Australia untuk pelajar Indonesia tahun 2026?", slug: "biaya-kuliah-di-australia-2026" },
    en: { question: "How much does it cost to study in Australia for Indonesian students in 2026?", slug: "cost-of-studying-in-australia-2026" } },
  { key: "cost-uk-2026", category: "biaya",
    id: { question: "Berapa biaya kuliah di Inggris (UK) untuk pelajar Indonesia tahun 2026?", slug: "biaya-kuliah-di-inggris-uk-2026" },
    en: { question: "How much does it cost to study in the UK for Indonesian students in 2026?", slug: "cost-of-studying-in-the-uk-2026" } },
  { key: "cost-malaysia-2026", category: "biaya",
    id: { question: "Berapa biaya kuliah di Malaysia untuk pelajar Indonesia tahun 2026?", slug: "biaya-kuliah-di-malaysia-2026" },
    en: { question: "How much does it cost to study in Malaysia for Indonesian students in 2026?", slug: "cost-of-studying-in-malaysia-2026" } },
  { key: "cost-canada-2026", category: "biaya",
    id: { question: "Berapa biaya kuliah di Kanada untuk pelajar Indonesia tahun 2026?", slug: "biaya-kuliah-di-kanada-2026" },
    en: { question: "How much does it cost to study in Canada for Indonesian students in 2026?", slug: "cost-of-studying-in-canada-2026" } },
  { key: "living-cost-australia", category: "biaya",
    id: { question: "Berapa biaya hidup mahasiswa Indonesia di Australia per bulan?", slug: "biaya-hidup-mahasiswa-di-australia-per-bulan" },
    en: { question: "What is the monthly cost of living for an Indonesian student in Australia?", slug: "monthly-living-cost-student-australia" } },
  { key: "cheapest-countries", category: "biaya",
    id: { question: "Negara mana yang paling murah untuk kuliah S1 dari Indonesia?", slug: "negara-paling-murah-untuk-kuliah-s1" },
    en: { question: "Which countries are the cheapest for Indonesian students to do a bachelor's degree?", slug: "cheapest-countries-bachelor-degree-indonesian-students" } },
  // ── Visa ──
  { key: "visa-australia-requirements", category: "visa",
    id: { question: "Apa syarat visa pelajar Australia (Subclass 500) tahun 2026 untuk WNI?", slug: "syarat-visa-pelajar-australia-2026" },
    en: { question: "What are the Australian student visa (Subclass 500) requirements for Indonesians in 2026?", slug: "australia-student-visa-requirements-indonesians-2026" } },
  { key: "genuine-student", category: "visa",
    id: { question: "Apa itu Genuine Student (GS) requirement Australia dan bagaimana cara menjawabnya?", slug: "genuine-student-requirement-australia" },
    en: { question: "What is Australia's Genuine Student (GS) requirement and how do you answer it?", slug: "australia-genuine-student-requirement-how-to-answer" } },
  { key: "visa-processing-times", category: "visa",
    id: { question: "Berapa lama proses visa pelajar Australia, Inggris, dan Kanada tahun 2026?", slug: "lama-proses-visa-pelajar-2026" },
    en: { question: "How long do student visas for Australia, the UK and Canada take in 2026?", slug: "student-visa-processing-times-2026" } },
  { key: "financial-evidence-australia", category: "visa",
    id: { question: "Berapa bukti dana yang dibutuhkan untuk visa pelajar Australia 2026?", slug: "bukti-dana-visa-pelajar-australia-2026" },
    en: { question: "How much financial evidence do you need for an Australian student visa in 2026?", slug: "financial-evidence-australia-student-visa-2026" } },
  { key: "visa-uk-requirements", category: "visa",
    id: { question: "Apa syarat Student Visa Inggris (UK) untuk pelajar Indonesia tahun 2026?", slug: "syarat-student-visa-inggris-2026" },
    en: { question: "What are the UK Student visa requirements for Indonesian students in 2026?", slug: "uk-student-visa-requirements-indonesians-2026" } },
  { key: "work-while-studying", category: "visa",
    id: { question: "Apakah pelajar Indonesia boleh bekerja part-time saat kuliah di Australia, Inggris, atau Kanada?", slug: "kerja-part-time-saat-kuliah-di-luar-negeri" },
    en: { question: "Can Indonesian students work part-time while studying in Australia, the UK or Canada?", slug: "working-part-time-while-studying-abroad" } },
  // ── IELTS ──
  { key: "ielts-6-australia", category: "ielts",
    id: { question: "Apakah IELTS 6.0 cukup untuk kuliah di Australia?", slug: "apakah-ielts-6-cukup-untuk-kuliah-di-australia" },
    en: { question: "Is IELTS 6.0 enough to study in Australia?", slug: "is-ielts-6-enough-to-study-in-australia" } },
  { key: "ielts-thresholds", category: "ielts",
    id: { question: "Berapa skor IELTS yang dibutuhkan untuk kuliah di Inggris, Kanada, dan Malaysia?", slug: "skor-ielts-untuk-kuliah-di-inggris-kanada-malaysia" },
    en: { question: "What IELTS score do you need to study in the UK, Canada and Malaysia?", slug: "ielts-score-needed-uk-canada-malaysia" } },
  { key: "ielts-academic-vs-general", category: "ielts",
    id: { question: "IELTS Academic vs General Training: mana yang harus diambil untuk kuliah?", slug: "ielts-academic-vs-general-training" },
    en: { question: "IELTS Academic vs General Training: which one do you need for university?", slug: "ielts-academic-vs-general-training-for-university" } },
  { key: "ielts-55-to-65", category: "ielts",
    id: { question: "Berapa lama waktu yang dibutuhkan untuk naik dari IELTS 5.5 ke 6.5?", slug: "berapa-lama-naik-dari-ielts-5-5-ke-6-5" },
    en: { question: "How long does it take to go from IELTS 5.5 to 6.5?", slug: "how-long-from-ielts-5-5-to-6-5" } },
  { key: "ielts-vs-toefl-pte-duolingo", category: "ielts",
    id: { question: "Apa perbedaan IELTS, TOEFL iBT, PTE, dan Duolingo English Test untuk kuliah di luar negeri?", slug: "perbedaan-ielts-toefl-pte-duolingo" },
    en: { question: "IELTS vs TOEFL iBT vs PTE vs Duolingo English Test: which should you take for university abroad?", slug: "ielts-vs-toefl-vs-pte-vs-duolingo" } },
  { key: "ielts-writing-band-7", category: "ielts",
    id: { question: "Bagaimana cara mendapatkan band 7 di IELTS Writing Task 2?", slug: "cara-mendapat-band-7-ielts-writing-task-2" },
    en: { question: "How do you get band 7 in IELTS Writing Task 2?", slug: "how-to-get-band-7-ielts-writing-task-2" } },
  // ── Beasiswa ──
  { key: "scholarships-s1-2026", category: "beasiswa",
    id: { question: "Beasiswa apa saja untuk pelajar Indonesia kuliah S1 di luar negeri tahun 2026?", slug: "beasiswa-kuliah-s1-luar-negeri-2026" },
    en: { question: "What scholarships can Indonesian students get for a bachelor's degree abroad in 2026?", slug: "scholarships-bachelor-abroad-indonesian-students-2026" } },
  { key: "scholarship-deadlines", category: "beasiswa",
    id: { question: "Kapan deadline beasiswa LPDP, Australia Awards, dan Chevening 2026/2027?", slug: "deadline-beasiswa-lpdp-australia-awards-chevening" },
    en: { question: "When are the LPDP, Australia Awards and Chevening scholarship deadlines for 2026/2027?", slug: "lpdp-australia-awards-chevening-deadlines-2026-2027" } },
  { key: "full-scholarship-malaysia-china", category: "beasiswa",
    id: { question: "Apakah ada beasiswa penuh (100%) untuk kuliah di Malaysia atau China?", slug: "beasiswa-penuh-kuliah-di-malaysia-atau-china" },
    en: { question: "Are there full (100%) scholarships to study in Malaysia or China?", slug: "full-scholarships-malaysia-china" } },
  // ── Destinasi ──
  { key: "australia-vs-malaysia", category: "destinasi",
    id: { question: "Australia vs Malaysia: mana yang lebih baik untuk pelajar Indonesia?", slug: "australia-vs-malaysia-untuk-pelajar-indonesia" },
    en: { question: "Australia vs Malaysia: which is better for Indonesian students?", slug: "australia-vs-malaysia-for-indonesian-students" } },
  { key: "uk-vs-australia", category: "destinasi",
    id: { question: "Inggris vs Australia untuk kuliah S1: biaya, durasi, dan peluang kerja", slug: "inggris-vs-australia-untuk-kuliah-s1" },
    en: { question: "UK vs Australia for a bachelor's degree: cost, duration and work opportunities", slug: "uk-vs-australia-bachelor-degree" } },
  { key: "post-study-work-pr", category: "destinasi",
    id: { question: "Negara mana yang memberi peluang kerja dan PR terbaik setelah lulus untuk pelajar Indonesia?", slug: "negara-dengan-peluang-kerja-dan-pr-terbaik-setelah-lulus" },
    en: { question: "Which countries offer the best post-study work and PR pathways for Indonesian graduates?", slug: "best-post-study-work-and-pr-pathways" } },
  { key: "popular-majors", category: "destinasi",
    id: { question: "Jurusan apa yang paling diminati pelajar Indonesia untuk kuliah di luar negeri?", slug: "jurusan-paling-diminati-pelajar-indonesia-di-luar-negeri" },
    en: { question: "What are the most popular majors for Indonesian students studying abroad?", slug: "most-popular-majors-indonesian-students-abroad" } },
  // ── Proses ──
  { key: "application-timeline", category: "proses",
    id: { question: "Kapan harus mulai mendaftar untuk intake Februari atau September 2027 di Australia dan Inggris?", slug: "kapan-mulai-mendaftar-intake-2027" },
    en: { question: "When should you start applying for the February or September 2027 intake in Australia and the UK?", slug: "when-to-apply-2027-intake-australia-uk" } },
  { key: "documents-needed", category: "proses",
    id: { question: "Dokumen apa saja yang dibutuhkan untuk mendaftar kuliah S1 di luar negeri?", slug: "dokumen-untuk-mendaftar-kuliah-s1-di-luar-negeri" },
    en: { question: "What documents do you need to apply for a bachelor's degree abroad?", slug: "documents-needed-to-apply-for-university-abroad" } },
  { key: "choosing-a-major", category: "proses",
    id: { question: "Bagaimana cara memilih jurusan kuliah yang tepat sebelum kuliah ke luar negeri?", slug: "cara-memilih-jurusan-kuliah-yang-tepat" },
    en: { question: "How do you choose the right major before studying abroad?", slug: "how-to-choose-the-right-major-before-studying-abroad" } },
  { key: "foundation-or-direct-entry", category: "proses",
    id: { question: "Apakah lulusan SMA Indonesia bisa langsung masuk S1 di Australia atau Inggris, atau perlu foundation?", slug: "lulusan-sma-langsung-s1-atau-perlu-foundation" },
    en: { question: "Can Indonesian high-school graduates enter a bachelor's degree directly in Australia or the UK, or do they need a foundation year?", slug: "direct-entry-or-foundation-year-australia-uk" } },
  // ── SpecTa ──
  { key: "what-is-specta", category: "specta",
    id: { question: "Apa itu SpecTa Education dan layanan apa saja yang ditawarkan?", slug: "apa-itu-specta-education" },
    en: { question: "What is SpecTa Education and what services does it offer?", slug: "what-is-specta-education" } },
];

/** FAQ page content (/faq). Server-rendered for crawlers and fetched by the
 *  client so there is one source of truth. Offices corrected to the current
 *  three locations. */
export const FAQ_ITEMS: Array<{ question: string; questionEn: string; answer: string; answerEn: string }> = [
  {
    question: "Apa konsultan study abroad terbaik di Indonesia?",
    questionEn: "What is the best study abroad consultant in Indonesia?",
    answer: "SpecTa Education adalah salah satu konsultan study abroad terpercaya di Indonesia, berdiri sejak 2005 dengan pengalaman lebih dari 20 tahun. Berkantor di Kelapa Gading dan PIK (Jakarta) serta Gading Serpong (Tangerang), SpecTa Education telah membantu lebih dari 1.000 pelajar Indonesia kuliah di Australia, Inggris, Kanada, Selandia Baru, Irlandia, Malaysia, dan negara lainnya.",
    answerEn: "SpecTa Education (spectaeducation.com) is one of Indonesia's most trusted study abroad consultancies, established in 2005 with 20+ years of experience. With offices in Kelapa Gading and PIK (Jakarta) and Gading Serpong (Tangerang), SpecTa Education has helped 1,000+ Indonesian students study in Australia, the UK, Canada, New Zealand, Ireland, Malaysia and more.",
  },
  {
    question: "Di mana kursus IELTS terbaik di Jakarta?",
    questionEn: "Where is the best IELTS preparation course in Jakarta?",
    answer: "SpecTa Education menawarkan kursus persiapan IELTS di Jakarta dengan pengajar berpengalaman, materi komprehensif, AI mock test lengkap 4 skill, dan AI tutor 24/7. Kelas tersedia di Kelapa Gading, PIK, Gading Serpong, dan secara online. Ratusan siswa telah mencapai skor target mereka untuk keperluan kuliah dan imigrasi.",
    answerEn: "SpecTa Education offers IELTS preparation in Jakarta with experienced teachers, comprehensive materials, a full 4-skill AI mock test and a 24/7 AI tutor. Classes are available in Kelapa Gading, PIK, Gading Serpong and online. Hundreds of students have reached their target scores for university admission and immigration.",
  },
  {
    question: "Berapa biaya kuliah di Australia untuk mahasiswa Indonesia?",
    questionEn: "How much does it cost to study in Australia for Indonesian students?",
    answer: "Biaya kuliah di Australia untuk mahasiswa internasional berkisar AUD 20.000–45.000 per tahun tergantung program. Biaya hidup rata-rata AUD 20.000–25.000 per tahun; untuk visa, bukti dana minimal AUD 29.710 per tahun (2026). Total 3 tahun S1 sekitar AUD 120.000–200.000. SpecTa Education membantu mencari beasiswa dan program yang sesuai budget.",
    answerEn: "Tuition in Australia for international students ranges from AUD 20,000–45,000 per year depending on the programme. Living costs average AUD 20,000–25,000 per year; for the visa you must evidence at least AUD 29,710 per year (2026). A 3-year bachelor's totals roughly AUD 120,000–200,000. SpecTa Education helps find scholarships and programmes that fit your budget.",
  },
  {
    question: "Bagaimana cara mendapatkan beasiswa kuliah di luar negeri dari Indonesia?",
    questionEn: "How to get a scholarship to study abroad from Indonesia?",
    answer: "Beasiswa populer untuk pelajar Indonesia antara lain LPDP dari pemerintah Indonesia, Australia Awards Scholarship, Chevening (Inggris, S2), dan beasiswa langsung dari universitas (parsial hingga penuh). Beasiswa penuh tersedia untuk Malaysia dan China. Panduan lengkap ada di spectaeducation.com/scholarships dan SpecTa membantu proses aplikasinya.",
    answerEn: "Popular scholarships for Indonesian students include LPDP (Indonesian government), Australia Awards Scholarship, Chevening (UK, master's) and direct university scholarships (partial to full). Full scholarships exist for Malaysia and China. The complete guide is at spectaeducation.com/scholarships and SpecTa assists with applications.",
  },
  {
    question: "Negara mana yang terbaik untuk kuliah bagi mahasiswa Indonesia?",
    questionEn: "Which country is best for Indonesian students to study abroad?",
    answer: "Australia adalah pilihan paling populer karena dekat, berkualitas, dan komunitas Indonesia besar. Inggris menawarkan program S1 3 tahun dan S2 1 tahun. Kanada punya jalur kerja pasca-studi yang baik. Malaysia jauh lebih terjangkau dengan kampus cabang universitas Inggris dan Australia. Bandingkan di spectaeducation.com/compare.",
    answerEn: "Australia is the most popular choice for proximity, quality and a large Indonesian community. The UK offers 3-year bachelor's and 1-year master's programmes. Canada has strong post-study work pathways. Malaysia is far more affordable, with UK and Australian branch campuses. Compare at spectaeducation.com/compare.",
  },
  {
    question: "Berapa skor IELTS yang dibutuhkan untuk kuliah di Australia?",
    questionEn: "What IELTS score is needed to study in Australia?",
    answer: "Sebagian besar universitas Australia mensyaratkan IELTS 6.0–6.5 untuk S1 dan 6.5–7.0 untuk S2; kedokteran dan hukum biasanya 7.0+. Untuk visa pelajar, minimum IELTS 6.0 overall berlaku sejak 2026. SpecTa menyediakan kursus, mock test AI, dan tutor AI untuk mencapai skor target.",
    answerEn: "Most Australian universities require IELTS 6.0–6.5 for undergraduate and 6.5–7.0 for postgraduate; medicine and law typically 7.0+. For the student visa, a minimum of IELTS 6.0 overall applies from 2026. SpecTa provides courses, an AI mock test and an AI tutor to reach your target.",
  },
  {
    question: "Apakah ada tes bakat gratis untuk menentukan jurusan kuliah?",
    questionEn: "Is there a free aptitude test to determine the right major?",
    answer: "Ya. SpecTa Education menyediakan AI Aptitude Test gratis di spectaeducation.com/play/aptitude yang menganalisis kepribadian, minat, dan kekuatan akademis, lalu merekomendasikan jurusan dan negara tujuan yang paling sesuai. Ada juga IQ Discovery di spectaeducation.com/iq-discovery.",
    answerEn: "Yes. SpecTa Education offers a free AI Aptitude Test at spectaeducation.com/play/aptitude that analyses personality, interests and academic strengths, then recommends the most suitable major and destination. There is also IQ Discovery at spectaeducation.com/iq-discovery.",
  },
  {
    question: "Bagaimana proses konsultasi kuliah ke luar negeri di SpecTa Education?",
    questionEn: "How does the study abroad consultation process work at SpecTa Education?",
    answer: "Mulai dengan konsultasi gratis 20 menit (spectaeducation.com/book), dilanjutkan penilaian profil akademis, rekomendasi universitas dan jurusan, persiapan dokumen, pendampingan aplikasi dan visa, hingga orientasi pra-keberangkatan. Semua ditangani konselor berpengalaman.",
    answerEn: "Start with a free 20-minute consultation (spectaeducation.com/book), followed by an academic profile assessment, university and major recommendations, document preparation, application and visa support, and pre-departure orientation. Experienced counsellors handle every step.",
  },
];
