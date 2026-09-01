/**
 * Reusable cross-sell HTML blocks for transactional/completion emails.
 *
 * Every product completion or receipt email should call this to append
 * "next product" upsells so no send goes out without cross-promotion.
 *
 * Usage:
 *   html += crossSellBlocksHtml({ exclude: ["mock"], appUrl, source: "mock-report" });
 *
 * Pass the current product's slug in `exclude` so users don't get
 * upsold to a product they just used.
 */

type ProductSlug = "tutor" | "voice-clone" | "mock" | "aptitude-pro" | "practice" | "iq-discovery";

interface Opts {
  exclude?: ProductSlug[];
  appUrl: string;
  source: string;      // used as utm_content for attribution
  language?: "en" | "id";
}

interface Card {
  slug: ProductSlug;
  emoji: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
  gradient: string;
  border: string;
  ctaBg: string;
}

export function crossSellBlocksHtml(opts: Opts): string {
  const base = opts.appUrl.replace(/\/+$/, "");
  const lang = opts.language || "en";
  const utm = (path: string) =>
    `${base}${path}?utm_source=email&utm_medium=cross_sell&utm_campaign=product_completion&utm_content=${encodeURIComponent(opts.source)}`;

  const cards: Card[] = [
    {
      slug: "voice-clone",
      emoji: "🎙️",
      headline: lang === "id" ? "Dengar suara kamu di Band 8" : "Hear yourself speak at Band 8",
      body: lang === "id"
        ? "Rekam 3 pertanyaan Speaking, AI kloning suara kamu + generate versi Band 8 dalam suara kamu sendiri. Hanya Rp 49.000, hasil dalam 5-10 menit."
        : "Record 3 IELTS Speaking questions. Our AI clones your voice and generates a Band 8 version in your own voice. Just Rp 49,000, results in 5-10 minutes.",
      cta: lang === "id" ? "🎙️ Coba Voice Clone — Rp 49k →" : "🎙️ Try Voice Clone — Rp 49k →",
      href: utm("/voice-clone"),
      gradient: "linear-gradient(135deg,#faf5ff,#fdf2f8)",
      border: "#e9d5ff",
      ctaBg: "linear-gradient(135deg,#7c3aed,#c026d3)",
    },
    {
      slug: "tutor",
      emoji: "✨",
      headline: lang === "id" ? "AI IELTS Tutor 1-on-1" : "Your personal AI IELTS Tutor",
      body: lang === "id"
        ? "Ngobrol via chat/voice dengan AI Tutor kami kapan saja. Latihan Writing, Speaking, Reading, Listening dengan feedback instan sesuai official IELTS band descriptors."
        : "Chat and voice-practice 24/7 with our AI Tutor. Get instant feedback on Writing, Speaking, Reading, and Listening — graded against the official IELTS band descriptors.",
      cta: lang === "id" ? "✨ Mulai AI Tutor → Rp 99k/bulan" : "✨ Start AI Tutor → Rp 99k/month",
      href: utm("/ielts/tutor"),
      gradient: "linear-gradient(135deg,#fdf2f8,#fce7f3)",
      border: "#fbcfe8",
      ctaBg: "linear-gradient(135deg,#ec4899,#db2777)",
    },
    {
      slug: "mock",
      emoji: "📝",
      headline: lang === "id" ? "Full Mock Test — sim IELTS lengkap" : "Full Mock Test — full 4-skill simulation",
      body: lang === "id"
        ? "Simulasi IELTS 4-skill lengkap dengan grading Writing & Speaking oleh AI + PDF report per-criterion. Cuma Rp 79.000."
        : "Complete 4-skill IELTS simulation with AI-graded Writing & Speaking plus a per-criterion PDF report. Only Rp 79,000.",
      cta: lang === "id" ? "📝 Ambil Mock Test → Rp 79k" : "📝 Take Mock Test → Rp 79k",
      href: utm("/ielts/mock-test"),
      gradient: "linear-gradient(135deg,#eff6ff,#dbeafe)",
      border: "#bfdbfe",
      ctaBg: "linear-gradient(135deg,#2563eb,#4f46e5)",
    },
    {
      slug: "iq-discovery",
      emoji: "🧠",
      headline: lang === "id" ? "Kenalan sama otakmu — SpecTa IQ Discovery" : "Meet your brain — SpecTa IQ Discovery",
      body: lang === "id"
        ? "40 soal, 5 dimensi kognitif. Estimasi IQ + arketip unik + laporan PDF + gambar untuk IG Story. Rp 59.000, hasil dalam 45 menit."
        : "40 questions, 5 cognitive dimensions. IQ estimate + unique archetype + PDF report + IG Story image. Rp 59,000, results in 45 minutes.",
      cta: lang === "id" ? "🧠 Discover otakmu → Rp 59k" : "🧠 Discover your brain → Rp 59k",
      href: utm("/iq-discovery"),
      gradient: "linear-gradient(135deg,#eef2ff,#f3e8ff)",
      border: "#c7d2fe",
      ctaBg: "linear-gradient(135deg,#4f46e5,#a855f7)",
    },
    {
      slug: "aptitude-pro",
      emoji: "🧠",
      headline: lang === "id" ? "Laporan Pro Aptitude 30+ halaman" : "Pro Aptitude Report — 30+ pages",
      body: lang === "id"
        ? "Analisis mendalam kepribadian + rekomendasi top-5 major + roadmap karier + universitas cocok. Rp 79.000, hasil hari yang sama."
        : "Deep personality analysis + top-5 university major matches + career roadmap + best-fit universities. Rp 79,000, delivered same day.",
      cta: lang === "id" ? "🧠 Upgrade ke Pro → Rp 79k" : "🧠 Upgrade to Pro → Rp 79k",
      href: utm("/aptitude-test?pro=1"),
      gradient: "linear-gradient(135deg,#fef3c7,#fde68a)",
      border: "#fcd34d",
      ctaBg: "linear-gradient(135deg,#d97706,#b45309)",
    },
    {
      slug: "practice",
      emoji: "⚡",
      headline: lang === "id" ? "AI Practice Test — GRATIS" : "AI Practice Test — FREE",
      body: lang === "id"
        ? "Coba latihan singkat gratis untuk Reading atau Listening — hasil instan tanpa perlu daftar."
        : "Try a quick free Reading or Listening practice — instant AI grading, no sign-up required.",
      cta: lang === "id" ? "⚡ Latihan Gratis →" : "⚡ Try Free Practice →",
      href: utm("/ielts/practice"),
      gradient: "linear-gradient(135deg,#ecfdf5,#d1fae5)",
      border: "#a7f3d0",
      ctaBg: "linear-gradient(135deg,#059669,#047857)",
    },
  ];

  const excluded = new Set(opts.exclude || []);
  const active = cards.filter(c => !excluded.has(c.slug)).slice(0, 3);
  if (active.length === 0) return "";

  const heading = lang === "id" ? "Coba juga produk lain SpecTa" : "Also from SpecTa Education";
  const subheading = lang === "id"
    ? "Kombinasi terbaik untuk siap IELTS + siap kuliah:"
    : "The best combo for IELTS-ready + uni-ready students:";

  const cardsHtml = active.map(c => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 14px 0;">
      <tr>
        <td style="border:2px solid ${c.border};border-radius:14px;padding:18px;background:${c.gradient};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="vertical-align:top;width:48px;font-size:32px;line-height:1;padding-right:12px;">${c.emoji}</td>
              <td style="vertical-align:top;">
                <div style="font-weight:800;color:#0f172a;font-size:16px;line-height:1.3;margin:0 0 6px 0;">${c.headline}</div>
                <div style="color:#334155;font-size:13px;line-height:1.55;margin:0 0 12px 0;">${c.body}</div>
                <a href="${c.href}" style="display:inline-block;background:${c.ctaBg};color:#fff;text-decoration:none;padding:9px 18px;border-radius:8px;font-weight:700;font-size:13px;">${c.cta}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `).join("");

  return `
    <div style="margin:28px 0 8px 0;padding:22px 20px 6px 20px;border-top:2px dashed #e5e7eb;">
      <div style="text-align:center;margin:0 0 16px 0;">
        <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:4px;">${heading}</div>
        <div style="color:#475569;font-size:13px;">${subheading}</div>
      </div>
      ${cardsHtml}
    </div>
  `;
}
