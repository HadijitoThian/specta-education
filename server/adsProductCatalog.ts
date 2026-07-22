/**
 * Product catalog for the 1-click Google Ads campaign launcher.
 *
 * Each entry pre-fills the LLM brief so the owner can just pick a product from
 * a dropdown → click Launch → done. The LLM (in adsCopilot.generateCampaign)
 * takes it from here: writes headlines, chooses keywords, sets negatives,
 * generates sitelinks + callouts. googleAdsApi.pushCampaignLive then creates
 * the campaign in the Google Ads account — always PAUSED, so nothing spends
 * until the owner enables it manually in Google Ads.
 *
 * Add a new product = add a row here. No other code changes needed.
 */

export interface ProductBrief {
  /** URL slug the admin picks (also used as the code in ad_campaigns). */
  key: string;

  /** Human-facing label in the admin dropdown. */
  label: string;

  /** One-line description shown under the label in the picker. */
  description: string;

  /** How the LLM will describe the product to Google Ads (used as `brief.product`). */
  product: string;

  /** The primary conversion action we want from clicks. */
  goal: string;

  /** Landing page path — must be a real, indexable URL on the site. */
  landingPath: string;

  /** Default daily budget in IDR. Owner can override in the form. */
  suggestedDailyBudgetIdr: number;

  /** Human-readable emoji + short pricing note for the picker card. */
  priceLabel: string;

  /** Which Google Ads conversion action this campaign should optimise for.
   *  Must match a name in Google Ads → Goals → Conversion actions. Used later
   *  once we bind campaigns to specific conversion goals. */
  primaryConversionAction:
    | "Mock Test purchased"
    | "AI Tutor subscribed"
    | "IGCSE subscribed"
    | "Student registered"
    | "WhatsApp clicked";
}

export const PRODUCT_CATALOG: readonly ProductBrief[] = [
  {
    key: "ielts-mock-test",
    label: "IELTS Mock Test",
    description: "One-off Rp 79k — 4-skill AI-graded full test with PDF report.",
    product:
      "SpecTa IELTS Mock Test — Rp 79.000 sekali bayar. Latihan mock IELTS 4 skill (Listening, Reading, Writing, Speaking) dengan AI grading dan report PDF profesional. Cocok untuk yang mau tahu skor prediksi sebelum ambil tes IELTS resmi.",
    goal: "Get instant one-off Mock Test purchases (Rp 79.000). Buyers pay via Xendit invoice.",
    landingPath: "/ielts/mock-test",
    suggestedDailyBudgetIdr: 50000,
    priceLabel: "Rp 79k · sekali bayar",
    primaryConversionAction: "Mock Test purchased",
  },
  {
    key: "ielts-tutor",
    label: "AI IELTS Tutor (subscription)",
    description: "Unlimited Writing + Speaking practice, Rp 149-249k/period.",
    product:
      "SpecTa AI IELTS Tutor — subscription Rp 149.000/2 minggu atau Rp 249.000/bulan. Latihan unlimited Writing + Speaking dengan AI grading instant, model answer, dan mock Speaking Part 1 lengkap. Free trial: 1 Writing + 1 Speaking evaluation.",
    goal: "Free trial signups that convert to paid subscriptions (Rp 149-249k).",
    landingPath: "/ielts/tutor",
    suggestedDailyBudgetIdr: 75000,
    priceLabel: "Rp 149-249k · langganan",
    primaryConversionAction: "AI Tutor subscribed",
  },
  {
    key: "ielts-course",
    label: "IELTS Course (classroom)",
    description: "Kelapa Gading, PIK, Gading Serpong — VIP/80/40/short/private.",
    product:
      "SpecTa IELTS Course — kursus IELTS reguler tatap muka di 3 cabang Jakarta (Kelapa Gading, PIK, Gading Serpong). Paket VIP Guarantee 80 sesi, 80 sesi reguler, 40 sesi, Short Course 20 sesi, dan Private 1-on-1. Guru berpengalaman, garansi skor.",
    goal: "Book free consultation to sign up for a classroom IELTS course.",
    landingPath: "/ielts",
    suggestedDailyBudgetIdr: 100000,
    priceLabel: "kelas tatap muka · 3 cabang",
    primaryConversionAction: "WhatsApp clicked",
  },
  {
    key: "igcse-teacher",
    label: "IGCSE AI Teacher",
    description: "Math, Physics, Chemistry, Biology, Economics, Business — Rp 299k/mo.",
    product:
      "SpecTa IGCSE AI Teacher — Rp 299.000/bulan. Guru AI untuk 6 mata pelajaran IGCSE (Math 0580, Physics 0625, Chemistry 0620, Biology 0610, Economics 0455, Business 0450). Interactive whiteboard, voice conversation, exam-style practice. Free trial 30 menit.",
    goal: "Parents sign up for the 30-minute free trial → convert to paid subscription (Rp 299k).",
    landingPath: "/igcse",
    suggestedDailyBudgetIdr: 100000,
    priceLabel: "Rp 299k/bulan · langganan",
    primaryConversionAction: "IGCSE subscribed",
  },
  {
    key: "study-abroad",
    label: "Study Abroad Consulting",
    description: "10+ negara, konsultasi gratis 30 menit, sejak 2005.",
    product:
      "SpecTa Study Abroad Consulting — konsultan pendidikan luar negeri terpercaya sejak 2005. 1000+ pelajar terbantu, 10+ negara tujuan (Australia, UK, USA, Kanada, Singapura, Malaysia, China, Irlandia, Belanda, Selandia Baru). 3 cabang di Jakarta. Konsultasi 30 menit gratis.",
    goal: "Book a free 30-minute consultation call — WhatsApp or contact form.",
    landingPath: "/book",
    suggestedDailyBudgetIdr: 150000,
    priceLabel: "konsultasi gratis · 10+ negara",
    primaryConversionAction: "WhatsApp clicked",
  },
  {
    key: "scholarships",
    label: "Scholarships (Beasiswa)",
    description: "China 100%, Malaysia Mila, LPDP prep. 200+ placed.",
    product:
      "SpecTa Scholarship Guidance — bantuan aplikasi beasiswa kuliah luar negeri. Beasiswa China 100%, Malaysia Mila University, dan persiapan LPDP. 200+ pelajar berhasil dapat beasiswa sejak 2005. Konsultasi gratis, panduan aplikasi lengkap.",
    goal: "Book a scholarship consultation to start their application journey.",
    landingPath: "/scholarships",
    suggestedDailyBudgetIdr: 100000,
    priceLabel: "gratis konsultasi beasiswa",
    primaryConversionAction: "WhatsApp clicked",
  },
  {
    key: "aptitude-test",
    label: "Tes Bakat AI (Aptitude Test)",
    description: "RIASEC + Multiple Intelligences. Free tier + Rp 79k Pro.",
    product:
      "SpecTa Tes Bakat AI — asesmen bakat dan karier untuk siswa SMA yang bingung pilih jurusan. RIASEC + Multiple Intelligences + AI matching ke jurusan dan universitas. Free tier tersedia, Pro report PDF lengkap Rp 79.000.",
    goal: "Get students (or worried parents) to complete the free aptitude test, upgrade to Pro (Rp 79k).",
    landingPath: "/play/aptitude",
    suggestedDailyBudgetIdr: 50000,
    priceLabel: "gratis · Pro Rp 79k",
    primaryConversionAction: "Mock Test purchased",
  },
] as const;

export type ProductKey = (typeof PRODUCT_CATALOG)[number]["key"];

export function getProduct(key: string): ProductBrief | null {
  return PRODUCT_CATALOG.find(p => p.key === key) || null;
}

export function productKeys(): ProductKey[] {
  return PRODUCT_CATALOG.map(p => p.key);
}
