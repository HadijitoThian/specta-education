/**
 * TestPrep.id — homepage.
 *
 * This is the self-serve, AI-first sibling of SpecTa Education. Positioned
 * for cost-conscious students who want to prep for tests (IELTS, IGCSE,
 * Aptitude, UTBK, TOEFL, SAT) without a human counselor — cheaper, faster,
 * DIY.
 *
 * Same underlying test-taking + AI-grading + PDF-report infrastructure as
 * SpecTa. Different branding, different funnel, different price positioning.
 *
 * Kept intentionally compact for the launch — a single scrollable page that
 * says: what tests we offer, why AI is better, and how to try one now. We
 * grow this over time as feature requests come in from real users.
 */
import { useEffect } from "react";
import { Link } from "wouter";

const INDIGO = "#4338ca";
const PINK = "#db2777";

const TESTS = [
  {
    key: "ielts-mock",
    emoji: "🎧",
    title: "IELTS Mock Test",
    desc: "Full 4-skill exam-condition mock — AI-graded to the official IELTS band scale, PDF report emailed.",
    price: "Rp 79.000",
    href: "/ielts/mock-test",
    badge: "Most popular",
  },
  {
    key: "ielts-tutor",
    emoji: "✍️",
    title: "AI IELTS Tutor",
    desc: "Unlimited Writing + Speaking practice with AI feedback, model answers, and band tracking.",
    price: "Rp 149.000 / 2 weeks",
    href: "/ielts/tutor",
  },
  {
    key: "aptitude",
    emoji: "🧠",
    title: "Aptitude Test Pro",
    desc: "RIASEC personality + Multiple Intelligences + AI major-recommendation. Comprehensive PDF report.",
    price: "Rp 79.000",
    href: "/test/pro",
  },
  {
    key: "igcse",
    emoji: "📚",
    title: "IGCSE AI Teacher",
    desc: "One-on-one AI tutor for Math, Physics, Chemistry, Biology, Economics, Business. 30-min free trial.",
    price: "Rp 299.000 / month",
    href: "/igcse",
  },
  {
    key: "utbk",
    emoji: "🎯",
    title: "UTBK AI Practice",
    desc: "National university entrance exam prep with adaptive difficulty and score prediction.",
    price: "Coming soon",
    href: "#",
    disabled: true,
  },
  {
    key: "toefl",
    emoji: "🌏",
    title: "TOEFL AI Tutor",
    desc: "Full TOEFL prep with AI grading. For US-bound students.",
    price: "Coming soon",
    href: "#",
    disabled: true,
  },
];

const REASONS = [
  { emoji: "⚡", title: "Instant AI feedback", desc: "No waiting for a human teacher — AI grades your practice in seconds, 24/7." },
  { emoji: "💸", title: "10× cheaper than kursus", desc: "Rp 79k–299k vs Rp 3–8 million for classroom courses. Same rigor, no rent overhead." },
  { emoji: "📊", title: "Real IELTS-band scoring", desc: "Graded against the exact official rubric. Track your band improve over time." },
  { emoji: "🔓", title: "Learn anywhere, anytime", desc: "Phone, laptop, mobile data — no schedule, no commute." },
];

export default function TestPrepHome() {
  useEffect(() => {
    document.title = "TestPrep.id — AI Test Prep for Indonesian Students";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "AI-powered IELTS, IGCSE, Aptitude, and UTBK practice for Indonesian students. Cheaper than kursus, faster than tutors, personalized to you.";
    if (meta) meta.setAttribute("content", desc);
  }, []);

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #f1f5f9", background: "#fff", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: INDIGO, letterSpacing: -0.5 }}>TestPrep</span>
            <span style={{ fontSize: 22, fontWeight: 400, color: "#64748b", letterSpacing: -0.3 }}>.id</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="#tests" style={{ padding: "8px 14px", color: "#334155", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Tests</a>
            <a href="#why" style={{ padding: "8px 14px", color: "#334155", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Why AI</a>
            <a href="/for-partners" style={{ padding: "8px 14px", color: "#334155", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>For Consultants</a>
            <a href="#tests" style={{ padding: "8px 18px", background: INDIGO, color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Try free</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 20px 60px", background: `linear-gradient(180deg, #eef2ff 0%, #fff 100%)` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <span style={{ display: "inline-block", padding: "6px 14px", background: "#fce7f3", color: PINK, borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
            🇮🇩 AI Test Prep for Indonesia
          </span>
          <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, color: "#0f172a", margin: "20px 0 18px", letterSpacing: -1.5 }}>
            Latihan tes IELTS, IGCSE & Aptitude<br /><span style={{ color: INDIGO }}>dengan AI — kapanpun, dari HP kamu.</span>
          </h1>
          <p style={{ fontSize: 18, color: "#475569", lineHeight: 1.6, margin: "0 auto 32px", maxWidth: 660 }}>
            No kursus, no tutor mahal, no jadwal fixed. AI grade jawaban kamu dalam hitungan detik, dengan feedback yang sama detilnya seperti guru IELTS professional.
            <br />Mulai dari <strong>Rp 79.000</strong>.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <a href="#tests" style={{ padding: "14px 30px", background: INDIGO, color: "#fff", textDecoration: "none", borderRadius: 12, fontWeight: 700, fontSize: 15 }}>
              Lihat semua tes →
            </a>
            <a href="/ielts/practice" style={{ padding: "14px 30px", background: "#fff", color: INDIGO, textDecoration: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, border: `2px solid ${INDIGO}` }}>
              Coba gratis dulu
            </a>
          </div>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 18 }}>
            ✅ Bayar sekali — no subscription trap · ✅ Report PDF instant · ✅ Sudah dipakai 10.000+ siswa Indonesia
          </p>
        </div>
      </section>

      {/* Tests grid */}
      <section id="tests" style={{ padding: "60px 20px", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 34, fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>Semua tes yang kamu butuhkan</h2>
            <p style={{ fontSize: 16, color: "#64748b", margin: 0 }}>Dari persiapan IELTS sampai Tes Bakat AI — semua diskor oleh AI, dalam detik, dengan PDF report profesional.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {TESTS.map(t => (
              <a key={t.key} href={t.disabled ? "#" : t.href} onClick={t.disabled ? (e) => e.preventDefault() : undefined}
                style={{
                  display: "block", padding: 24, borderRadius: 16, border: "1px solid #e2e8f0",
                  background: "#fff", textDecoration: "none", color: "inherit", position: "relative",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  opacity: t.disabled ? 0.55 : 1, cursor: t.disabled ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => { if (!t.disabled) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(67,56,202,0.10)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {t.badge && (
                  <span style={{ position: "absolute", top: -10, right: 16, padding: "3px 10px", background: PINK, color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999 }}>
                    {t.badge}
                  </span>
                )}
                <div style={{ fontSize: 32, marginBottom: 10 }}>{t.emoji}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{t.title}</h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.55, margin: "0 0 14px", minHeight: 66 }}>{t.desc}</p>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.disabled ? "#94a3b8" : INDIGO }}>{t.price}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Why AI */}
      <section id="why" style={{ padding: "60px 20px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>Kenapa AI, bukan kursus tradisional?</h2>
            <p style={{ fontSize: 16, color: "#64748b", margin: 0 }}>Alasan kenapa 10.000+ siswa Indonesia switch dari les tradisional ke AI test prep.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {REASONS.map(r => (
              <div key={r.title} style={{ padding: 20, borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{r.emoji}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{r.title}</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55, margin: 0 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For partners */}
      <section style={{ padding: "60px 20px", background: `linear-gradient(135deg, ${INDIGO} 0%, #6366f1 100%)`, color: "#fff", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(255,255,255,0.2)", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
            For Ed Consultants
          </span>
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: "18px 0 12px" }}>Punya konsultan pendidikan?<br />White-label TestPrep untuk brand kamu.</h2>
          <p style={{ fontSize: 15, opacity: 0.9, margin: "0 0 26px", lineHeight: 1.6 }}>
            Jalankan IELTS Mock, Aptitude Test, dan AI Tutor dengan branding kamu sendiri. Kamu simpan 70% revenue dari setiap sale. Kami handle teknologi + AI + payment.
          </p>
          <a href="/for-partners" style={{ display: "inline-block", padding: "14px 30px", background: "#fff", color: INDIGO, textDecoration: "none", borderRadius: 12, fontWeight: 700, fontSize: 15 }}>
            Lihat program partner →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 20px 30px", background: "#0f172a", color: "#94a3b8" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>TestPrep</span>
              <span style={{ fontSize: 20, fontWeight: 400, color: "#94a3b8" }}>.id</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              AI-powered test preparation for Indonesian students. From <a href="https://www.spectaeducation.com" style={{ color: "#a5b4fc" }}>SpecTa Education</a>.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Tests</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href="/ielts/mock-test" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>IELTS Mock Test</a>
              <a href="/ielts/tutor" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>AI IELTS Tutor</a>
              <a href="/test/pro" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>Aptitude Test</a>
              <a href="/igcse" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>IGCSE AI Teacher</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Partners</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href="/for-partners" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>White-label program</a>
              <a href="/affiliate" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>Affiliate program</a>
              <a href="/api-docs" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>API access</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Legal</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href="/terms" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>Terms</a>
              <a href="/privacy" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>Privacy</a>
              <a href="/refund" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>Refund policy</a>
              <a href="mailto:hello@testprep.id" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>hello@testprep.id</a>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "30px auto 0", paddingTop: 20, borderTop: "1px solid #1e293b", textAlign: "center", fontSize: 12 }}>
          © {new Date().getFullYear()} TestPrep.id · A product of SpecTa Education
        </div>
      </footer>
    </div>
  );
}
