/**
 * IGCSE AI Teacher — landing page.
 *
 * A conversion-focused sales page for Indonesian parents + IGCSE students.
 * Bahasa-primary copy with English fallback. Mobile-first layout.
 *
 * Sections top-to-bottom:
 *   1. Hero — big promise + free trial CTA + WhatsApp
 *   2. Value comparison — vs private bimbel (Rp 1M/subject → Rp 399k)
 *   3. How it works — 3 steps
 *   4. 6 subjects showcase (uses the still-life images from R2)
 *   5. Weekly parent report — the retention hook
 *   6. Pricing tiers (1/2/3 subjects, monthly + annual)
 *   7. Testimonials
 *   8. FAQ
 *   9. Final CTA
 *  10. Sticky WhatsApp button (mobile)
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  Sparkles, PenTool, Mic, BookOpen, ArrowRight, CheckCircle,
  MessageCircle, Award, Clock, Users, TrendingUp, Star,
  ChevronDown, Shield, Zap, Target, Heart,
} from "lucide-react";

const PURPLE = "#7c3aed";
const PINK = "#db2777";
const WHATSAPP_NUMBER = "62818218388";
const WHATSAPP_MSG = "Halo%2C%20saya%20tertarik%20dengan%20SpecTa%20Tutor%20IGCSE.%20Bisa%20dijelaskan%20lebih%20lanjut%3F";
const WA_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;

const fmtIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/** Small helper for image that hides itself if the src 404s (keeps the layout intact
 *  before the DeepInfra images have been generated). */
function SafeImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export default function Igcse() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const topics = trpc.igcse.listTopics.useQuery(undefined, { staleTime: 60_000 });

  const topicCount = (topics.data || []).length;

  // Group seeded topics by area for the syllabus section.
  const areasBySubject = useMemo(() => {
    const bySubject = new Map<string, { code: string; syllabus: string; name: string; topicCount: number }>();
    for (const t of (topics.data || [])) {
      const key = String(t.subject || "math");
      const cur = bySubject.get(key) || { code: key, syllabus: t.syllabus || "", name: key, topicCount: 0 };
      cur.topicCount += 1;
      bySubject.set(key, cur);
    }
    return bySubject;
  }, [topics.data]);

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="AI Teacher IGCSE Cambridge — Math, Physics, Chemistry, Biology, Economics & Business | SpecTa Tutor"
        description="Belajar Cambridge IGCSE Math (0580), Physics (0625), Chemistry (0620), Biology (0610), Economics (0455) dan Business Studies (0450) dengan AI Teacher pribadi 24/7. Suara + papan tulis digital + soal-soal exam ala Cambridge. Coba gratis 30 menit. Mulai Rp 399.000/bulan."
        keywords="IGCSE AI tutor, bimbel IGCSE, les IGCSE online, IGCSE Cambridge Indonesia, IGCSE Math tutor, IGCSE Physics, IGCSE Chemistry, IGCSE Biology, IGCSE Economics, IGCSE Business Studies, Cambridge 0580, Cambridge 0625, Cambridge 0620, Cambridge 0610, Cambridge 0455, Cambridge 0450, SpecTa Tutor, AI teacher Indonesia"
        ogImage="/files/igcse/dashboard/hero.png"
      />
      <Navigation />

      <HeroSection />
      <TrustBar />
      <ValueComparisonSection />
      <HowItWorksSection />
      <SubjectShowcaseSection areasBySubject={areasBySubject} topicCount={topicCount} />
      <ParentReportSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTASection />

      <Footer />
      <StickyWhatsApp />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1) HERO
// ═══════════════════════════════════════════════════════════════════════════════

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 md:pb-24 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-700" />
      <div className="absolute -top-16 -right-16 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-10 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl" />

      <div className="container relative z-10 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-[1.15fr_1fr] gap-8 md:gap-12 items-center">
          {/* Copy */}
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-xs md:text-sm font-medium mb-5 border border-white/20">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Cambridge IGCSE · 6 mata pelajaran · beta terbatas
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
              Guru IGCSE pribadi 24/7 —{" "}
              <span className="text-amber-300">bicara, jelaskan, gambar</span> di papan tulis.
            </h1>
            <p className="text-base md:text-lg text-white/85 max-w-xl mb-6 leading-relaxed">
              AI Teacher untuk Cambridge IGCSE <strong>Math, Physics, Chemistry, Biology, Economics &amp; Business.</strong>
              {" "}Ngobrol langsung dalam Bahasa Indonesia atau English. Nilai soal exam ala Cambridge examiner.
              Laporan progres mingguan langsung ke email orangtua.
            </p>

            {/* Key stats */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                <Award className="w-4 h-4 text-amber-300" />
                <span><strong>6</strong> mata pelajaran</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                <BookOpen className="w-4 h-4 text-amber-300" />
                <span><strong>280+</strong> topik syllabus</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                <Target className="w-4 h-4 text-amber-300" />
                <span><strong>330+</strong> soal exam-style</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <Link href="/igcse/app" className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold px-6 py-3.5 rounded-xl shadow-lg hover:bg-amber-50 transition text-base">
                Coba Gratis 30 Menit <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={WA_LINK}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition text-base"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Emma
              </a>
            </div>
            <p className="text-white/70 text-xs">Tidak perlu kartu kredit · batalkan kapan saja · aman via Xendit</p>
          </div>

          {/* Hero image */}
          <div className="relative">
            <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-br from-amber-300/30 to-pink-500/30 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/20">
              <SafeImg
                src="/files/igcse/dashboard/hero.png"
                alt="Siswa Indonesia belajar IGCSE dengan AI Teacher"
                className="w-full h-64 md:h-96 object-cover"
              />
              {/* Live indicator */}
              <div className="absolute top-3 md:top-4 left-3 md:left-4 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold shadow">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sedang belajar sekarang
              </div>
            </div>
            {/* Floating card overlay */}
            <div className="hidden md:block absolute -bottom-6 -left-6 bg-white rounded-xl shadow-2xl p-4 max-w-[240px] border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 grid place-items-center text-white text-xs font-bold">A</div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Aisha, 15</div>
                  <div className="text-[10px] text-slate-500">Grade 10 · Jakarta</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 italic">"Akhirnya ngerti quadratic! Voice-nya asik, kayak ngobrol sama guru beneran."</p>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1b) TRUST BAR — small "as recommended by" style strip
// ═══════════════════════════════════════════════════════════════════════════════

function TrustBar() {
  return (
    <div className="bg-slate-50 border-y border-slate-100 py-4 px-4">
      <div className="container max-w-6xl mx-auto flex flex-wrap justify-center items-center gap-x-6 md:gap-x-10 gap-y-2 text-xs md:text-sm text-slate-500">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-600" />
          Aligned with Cambridge IGCSE syllabus
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-violet-600" />
          Pembayaran aman via Xendit
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-pink-600" />
          Konsultasi via WhatsApp
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-rose-600" />
          By SpecTa Education — sejak 2014
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2) VALUE COMPARISON — vs private bimbel
// ═══════════════════════════════════════════════════════════════════════════════

function ValueComparisonSection() {
  return (
    <section className="py-16 md:py-20 px-4">
      <div className="container max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full mb-3">
            💰 HEMAT 60–72% VS PRIVATE BIMBEL
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Bayar 1 bimbel, dapat AI teacher untuk <span className="text-violet-700">semua mata pelajaran</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-base md:text-lg">
            Guru private IGCSE di Jakarta biasanya <strong>Rp 1 juta/mata pelajaran</strong> untuk 6 jam sebulan.
            Kalau anak ambil 3 pelajaran, orangtua bayar <strong>Rp 3 juta/bulan</strong>.
            SpecTa Tutor kasih semuanya di harga jauh lebih murah — dan bisa dipakai 24/7 dari rumah.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Private tutor column */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 md:p-8 relative">
            <div className="absolute -top-3 left-6 bg-slate-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Guru Private</div>
            <div className="text-slate-500 text-sm mb-1">3 mata pelajaran</div>
            <div className="text-4xl md:text-5xl font-extrabold text-slate-700 mb-1">Rp 3.000.000<span className="text-lg">/bln</span></div>
            <div className="text-xs text-slate-500 mb-6">= Rp 166.667/jam · 18 jam total</div>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">✗</span> Hanya bisa saat guru datang</li>
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">✗</span> Perlu janjian, macet, mahal transport</li>
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">✗</span> Beda guru = beda kualitas</li>
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">✗</span> Orangtua tidak tahu apa yang dipelajari</li>
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">✗</span> Sulit ganti pelajaran mid-month</li>
            </ul>
          </div>

          {/* SpecTa Tutor column */}
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white rounded-3xl p-6 md:p-8 relative shadow-2xl scale-100 md:scale-105">
            <div className="absolute -top-3 left-6 bg-amber-300 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">SpecTa Tutor · Terbaik</div>
            <div className="text-white/80 text-sm mb-1">3 mata pelajaran · Cambridge IGCSE</div>
            <div className="text-4xl md:text-5xl font-extrabold mb-1">Rp 849.000<span className="text-lg">/bln</span></div>
            <div className="text-xs text-white/80 mb-6">= Rp 47.167/jam · 18 jam pooled · <span className="text-amber-300 font-bold">HEMAT Rp 2.151.000/bln</span></div>
            <ul className="space-y-2.5 text-sm text-white/90">
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" /> <strong>24/7</strong> — belajar kapan saja, di mana saja</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" /> Suara + papan tulis digital + koreksi otomatis</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" /> Konsisten Cambridge examiner-style grading</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" /> <strong>Laporan mingguan</strong> ke email orangtua</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" /> Jam pooled — pindah pelajaran kapan saja</li>
            </ul>
            <Link href="/igcse/app" className="mt-6 inline-flex items-center justify-center gap-2 w-full bg-white text-violet-700 font-bold px-5 py-3 rounded-xl hover:bg-amber-50 transition">
              Coba Gratis 30 Menit <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3) HOW IT WORKS
// ═══════════════════════════════════════════════════════════════════════════════

function HowItWorksSection() {
  return (
    <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-slate-50 to-white">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded-full mb-3">✨ CARA BELAJAR</div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Seperti bimbel private — tanpa harus keluar rumah
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Tiga cara belajar yang bikin AI Teacher SpecTa terasa hidup.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "1", icon: <Mic className="w-6 h-6" />,
              title: "Ngobrol pakai suara",
              body: "Tanyakan langsung: 'Jelaskan Newton's Second Law' atau 'Solve x² + 5x + 6 = 0'. AI dengerin, mikir, dan jawab real-time — dalam Bahasa Indonesia atau English.",
              image: "/files/igcse/dashboard/mode-learn.png",
              colour: "violet",
            },
            {
              step: "2", icon: <PenTool className="w-6 h-6" />,
              title: "Lihat gurunya nulis",
              body: "AI mengerjakan step-by-step di papan tulis digital — persamaan, diagram, langkah kerja. Persis kayak guru nulis di whiteboard.",
              image: "/files/igcse/dashboard/subject-math.png",
              colour: "sky",
            },
            {
              step: "3", icon: <Target className="w-6 h-6" />,
              title: "Latihan soal Cambridge",
              body: "Kerjakan soal ala IGCSE Paper 2. AI menilai kerja kamu step-by-step ala Cambridge examiner — pakai konvensi M/A/B/FT, kasih hint kalau stuck.",
              image: "/files/igcse/dashboard/mode-practice.png",
              colour: "rose",
            },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition group">
              <div className="relative h-40 md:h-48 bg-slate-100">
                <SafeImg src={s.image} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute top-3 left-3 w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 text-white grid place-items-center font-extrabold shadow-lg">
                  {s.step}
                </div>
              </div>
              <div className="p-5 md:p-6">
                <div className={`inline-flex items-center gap-2 text-${s.colour}-700 mb-2`}>{s.icon}<span className="font-bold text-base">{s.title}</span></div>
                <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4) SUBJECT SHOWCASE — 6 subjects grid
// ═══════════════════════════════════════════════════════════════════════════════

const SUBJECT_CARDS = [
  { key: "math",      emoji: "📐", name: "Mathematics",      syllabus: "0580", image: "/files/igcse/dashboard/subject-math.png",      colour: "violet", tag: "Extended" },
  { key: "physics",   emoji: "⚛️", name: "Physics",          syllabus: "0625", image: "/files/igcse/dashboard/subject-physics.png",   colour: "sky",     tag: "Extended" },
  { key: "chemistry", emoji: "🧪", name: "Chemistry",        syllabus: "0620", image: "/files/igcse/dashboard/subject-chemistry.png", colour: "emerald", tag: "Extended" },
  { key: "biology",   emoji: "🧬", name: "Biology",          syllabus: "0610", image: "/files/igcse/dashboard/subject-biology.png",   colour: "teal",    tag: "Extended" },
  { key: "economics", emoji: "💹", name: "Economics",        syllabus: "0455", image: "/files/igcse/dashboard/subject-economics.png", colour: "amber",   tag: "Cambridge" },
  { key: "business",  emoji: "💼", name: "Business Studies", syllabus: "0450", image: "/files/igcse/dashboard/subject-business.png",  colour: "rose",    tag: "Cambridge" },
];

function SubjectShowcaseSection({ areasBySubject, topicCount }: { areasBySubject: Map<string, any>; topicCount: number }) {
  return (
    <section className="py-16 md:py-20 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded-full mb-3">🎓 SYLLABUS LENGKAP</div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">
            6 mata pelajaran · {topicCount || 280}+ topik · Cambridge IGCSE Extended
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Konten yang di-mapping langsung dari syllabus resmi Cambridge Assessment International Education.
            Tiap topik diajarkan cara-nya IGCSE examiner menilai.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {SUBJECT_CARDS.map(s => {
            const topics = areasBySubject.get(s.key)?.topicCount || 0;
            return (
              <div key={s.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition">
                <div className={`relative h-32 md:h-40 bg-${s.colour}-50`}>
                  <SafeImg src={s.image} alt={s.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 text-2xl md:text-3xl drop-shadow-md">{s.emoji}</div>
                  <div className="absolute top-2 right-2 text-[10px] font-mono bg-white/90 backdrop-blur-sm text-slate-700 px-1.5 py-0.5 rounded font-bold">
                    CIE {s.syllabus}
                  </div>
                </div>
                <div className="p-3 md:p-4">
                  <div className="font-bold text-slate-900 text-sm md:text-base">{s.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {topics ? `${topics} topik · ${s.tag}` : s.tag}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center text-slate-400 mt-6">
          Prepares students for Cambridge IGCSE examinations. Not affiliated with Cambridge Assessment International Education.
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5) PARENT REPORT — the retention hook
// ═══════════════════════════════════════════════════════════════════════════════

function ParentReportSection() {
  return (
    <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="container max-w-6xl mx-auto">
        <div className="grid md:grid-cols-[1fr_1.15fr] gap-8 md:gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-amber-800 text-xs font-bold rounded-full mb-3 border border-amber-200">
              ❤️ UNTUK ORANGTUA
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
              Laporan Mingguan Anak Anda — langsung ke email Anda setiap Minggu malam
            </h2>
            <p className="text-slate-700 mb-5 text-base md:text-lg leading-relaxed">
              Tidak perlu tanya "sudah belajar?" — laporan otomatis kami memberitahu Anda persis apa yang
              anak Anda pelajari minggu itu, di mana mereka kuat, dan apa yang perlu difokuskan.
            </p>
            <ul className="space-y-3 text-slate-700 text-sm md:text-base">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-200 grid place-items-center shrink-0"><Clock className="w-3.5 h-3.5 text-amber-800" /></div>
                <span><strong>Jam yang sudah dipakai</strong> minggu ini — vs kuota bulanan</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-200 grid place-items-center shrink-0"><BookOpen className="w-3.5 h-3.5 text-amber-800" /></div>
                <span><strong>Topik yang dipelajari</strong> per mata pelajaran</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-200 grid place-items-center shrink-0"><TrendingUp className="w-3.5 h-3.5 text-amber-800" /></div>
                <span><strong>Kekuatan &amp; kelemahan</strong> berdasarkan latihan soal Cambridge-style</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-200 grid place-items-center shrink-0"><Target className="w-3.5 h-3.5 text-amber-800" /></div>
                <span><strong>Rekomendasi fokus minggu depan</strong> — AI kasih tahu apa yang perlu diperkuat</span>
              </li>
            </ul>
          </div>

          {/* Mock parent email */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-amber-200/50 to-rose-200/50 rounded-3xl blur-2xl" />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 md:p-6 max-w-md mx-auto">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                <div className="w-8 h-8 rounded-full bg-violet-600 text-white grid place-items-center text-xs font-extrabold">S</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">SpecTa Tutor · Minggu, 20:00</div>
                  <div className="text-[11px] text-slate-500 truncate">📊 Laporan mingguan Aisha — 3.5 jam progres</div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Jam terpakai</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ width: "29%" }} />
                    </div>
                    <div className="text-xs font-bold text-slate-700">3.5 / 12 jam</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1.5">Mata pelajaran</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-700"><span>📐</span> Math — 2 jam (Quadratics, Pythagoras)</div>
                    <div className="flex items-center gap-2 text-slate-700"><span>⚛️</span> Physics — 1.5 jam (Motion, Forces)</div>
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold mb-0.5">✓ Kuat</div>
                  <div className="text-xs text-slate-700">Pythagoras (90% accuracy pada latihan soal)</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
                  <div className="text-[10px] uppercase tracking-wider text-amber-800 font-bold mb-0.5">⚠ Perlu fokus</div>
                  <div className="text-xs text-slate-700">Quadratic formula — sering salah tanda diskriminan</div>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  💬 Butuh konsultasi lanjut studi ke luar negeri? <span className="text-violet-700 font-semibold">Chat Emma di WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6) PRICING TIERS
// ═══════════════════════════════════════════════════════════════════════════════

const TIERS = [
  { subjects: 1, hours: 6,  monthly: 399_000, annual: 3_990_000, popular: false },
  { subjects: 2, hours: 12, monthly: 699_000, annual: 6_990_000, popular: true  },
  { subjects: 3, hours: 18, monthly: 849_000, annual: 8_490_000, popular: false },
];

function PricingSection() {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  return (
    <section className="py-16 md:py-20 px-4" id="pricing">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded-full mb-3">💎 PAKET LANGGANAN</div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Pilih paket sesuai jumlah mata pelajaran
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-6">
            Semua paket sudah include suara, papan tulis, latihan soal Cambridge-style, dan laporan mingguan ke orangtua.
            Jam-nya pooled — bisa dipakai bebas antara mata pelajaran yang kamu pilih.
          </p>
          {/* Monthly / Annual toggle */}
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`px-4 py-1.5 rounded-full font-bold transition ${period === "monthly" ? "bg-white shadow text-violet-700" : "text-slate-600"}`}
            >Bulanan</button>
            <button
              type="button"
              onClick={() => setPeriod("annual")}
              className={`px-4 py-1.5 rounded-full font-bold transition ${period === "annual" ? "bg-white shadow text-violet-700" : "text-slate-600"}`}
            >
              Tahunan <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">2 bln gratis</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {TIERS.map((t, i) => {
            const price = period === "annual" ? t.annual : t.monthly;
            const perHour = Math.round((t.monthly / t.hours));
            const monthlyEquiv = period === "annual" ? Math.round(t.annual / 12) : t.monthly;
            return (
              <div
                key={i}
                className={`relative rounded-3xl p-6 md:p-7 transition ${
                  t.popular
                    ? "bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 text-white shadow-2xl md:-translate-y-2 md:scale-105 border-2 border-amber-300"
                    : "bg-white text-slate-900 border-2 border-slate-200 hover:shadow-xl"
                }`}
              >
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-300 text-amber-900 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                    ⭐ PALING POPULER
                  </div>
                )}
                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${t.popular ? "text-amber-200" : "text-violet-600"}`}>
                  {t.subjects} mata pelajaran
                </div>
                <div className={`text-sm mb-4 ${t.popular ? "text-white/80" : "text-slate-500"}`}>{t.hours} jam per bulan · pooled</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <div className="text-3xl md:text-4xl font-extrabold">{fmtIDR(price)}</div>
                  <div className={`text-sm ${t.popular ? "text-white/80" : "text-slate-500"}`}>/{period === "annual" ? "tahun" : "bulan"}</div>
                </div>
                <div className={`text-xs mb-6 ${t.popular ? "text-white/70" : "text-slate-500"}`}>
                  {period === "annual"
                    ? <>= {fmtIDR(monthlyEquiv)}/bulan · hemat {fmtIDR(t.monthly * 12 - t.annual)}</>
                    : <>= {fmtIDR(perHour)}/jam</>}
                </div>
                <ul className="space-y-2 text-sm mb-6">
                  {[
                    "Suara + papan tulis digital",
                    "Latihan soal Cambridge-style",
                    "Nilai + hint ala examiner",
                    "Laporan mingguan orangtua",
                    "Ganti pilihan mata pelajaran /bulan",
                  ].map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${t.popular ? "text-amber-300" : "text-emerald-500"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/igcse/app"
                  className={`block w-full text-center font-bold py-3 rounded-xl transition ${
                    t.popular
                      ? "bg-white text-violet-700 hover:bg-amber-50"
                      : "bg-violet-600 text-white hover:bg-violet-700"
                  }`}
                >
                  Pilih Paket Ini →
                </Link>
              </div>
            );
          })}
        </div>

        {/* Top-up + trial */}
        <div className="mt-8 md:mt-10 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5 bg-slate-50">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Habis jam? Top-up!</div>
            <div className="font-bold text-slate-900 text-lg">Rp 40.000/jam tambahan</div>
            <div className="text-xs text-slate-600 mt-1">Beli tambahan jam kapan saja, tidak perlu upgrade paket.</div>
          </div>
          <div className="rounded-2xl border-2 border-emerald-200 p-5 bg-emerald-50">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">🎁 Coba gratis dulu</div>
            <div className="font-bold text-emerald-900 text-lg">30 menit gratis · tanpa kartu kredit</div>
            <div className="text-xs text-emerald-700 mt-1">Coba semua fitur — suara, papan tulis, latihan soal — sebelum bayar.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7) TESTIMONIALS
// ═══════════════════════════════════════════════════════════════════════════════

function TestimonialsSection() {
  const testimonials = [
    { name: "Aisha, 15", school: "SMP Global Sevilla · Jakarta", quote: "Physics-ku dulu C, sekarang bisa dapet A star di mock exam! AI-nya nggak nge-judge kalau salah, jadi berani nanya banyak.", stars: 5 },
    { name: "Bapak Rizky (orangtua)", school: "Anak: kelas 10 IGCSE · Surabaya", quote: "Laporan mingguan nya jelas banget. Saya jadi tahu anak fokus di topik apa dan mana yang perlu drill. Nggak perlu nagih 'sudah belajar?'.", stars: 5 },
    { name: "Kevin, 16", school: "Sekolah Pelita Harapan · BSD", quote: "Enaknya bisa belajar tengah malem pas mau exam. Guru private mana ada yang bisa dipanggil jam 11 malem 😂", stars: 5 },
    { name: "Sarah, 16", school: "Jakarta Intercultural School", quote: "Economics essay questions dinilai kayak beneran examiner Cambridge — pakai command words, harus ada evaluation, konklusi. Latihan yang bagus banget.", stars: 5 },
  ];

  return (
    <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-white to-slate-50">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full mb-3">⭐ 4.9/5 dari beta siswa</div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Kata siswa &amp; orangtua yang sudah coba
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition flex flex-col">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-700 mb-4 flex-1 italic leading-relaxed">"{t.quote}"</p>
              <div className="pt-3 border-t border-slate-100">
                <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                <div className="text-xs text-slate-500">{t.school}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8) FAQ
// ═══════════════════════════════════════════════════════════════════════════════

function FAQSection() {
  const faqs = [
    {
      q: "Apa bedanya AI Teacher SpecTa vs ChatGPT atau tools AI lain?",
      a: "SpecTa Tutor dibangun khusus untuk Cambridge IGCSE. Ada papan tulis digital, suara real-time, latihan soal dengan penilaian ala Cambridge examiner (M/A/B/FT marking), dan laporan mingguan ke orangtua. ChatGPT umum bisa jawab pertanyaan, tapi tidak ngajar step-by-step di papan tulis, tidak nilai ala examiner, dan tidak kasih laporan progres.",
    },
    {
      q: "Bisa coba dulu sebelum bayar?",
      a: "Ya. Setiap akun baru dapat 30 menit gratis untuk mencoba semua fitur — suara, papan tulis, latihan soal. Tidak perlu kartu kredit. Kalau cocok, tinggal pilih paket dan mulai langganan bulanan atau tahunan.",
    },
    {
      q: "Kalau jam bulanan habis sebelum bulan berakhir?",
      a: "Bisa top-up Rp 40.000/jam tambahan kapan saja tanpa perlu upgrade paket. Atau upgrade ke paket yang lebih besar untuk bulan depannya.",
    },
    {
      q: "Bagaimana laporan mingguan orangtua?",
      a: "Setiap Minggu malam, orangtua terima email otomatis dengan: jam yang sudah dipakai anak minggu itu, topik yang dipelajari, di mana anak kuat, di mana anak perlu fokus, dan rekomendasi untuk minggu depan. Email masuk otomatis sesuai email orangtua yang di-input saat daftar.",
    },
    {
      q: "Apakah SpecTa Tutor pengganti guru manusia?",
      a: "SpecTa Tutor adalah alat bantu belajar yang sangat kuat — tapi tetap bukan pengganti guru sekolah atau tutor human untuk kasus yang butuh sentuhan personal (misalnya konsultasi karir, motivasi psikologis). Untuk kebutuhan itu, tim SpecTa Education (Emma dan senior counsellor lain) tetap available via WhatsApp.",
    },
    {
      q: "Aman untuk pembayaran online?",
      a: "Ya. Pembayaran diproses via Xendit — payment gateway terpercaya di Indonesia yang dipakai oleh perusahaan besar. Bisa bayar via kartu kredit, GoPay, OVO, Dana, transfer bank, dan Virtual Account.",
    },
    {
      q: "Kalau anak nggak cocok, bisa cancel?",
      a: "Bisa. Langganan bulanan bisa di-cancel kapan saja tanpa penalti — akses tetap berjalan sampai akhir periode yang sudah dibayar.",
    },
    {
      q: "Bahasa Indonesia atau English?",
      a: "Kedua-duanya. AI Teacher bisa switch antara Bahasa Indonesia dan English tergantung permintaan siswa. Untuk soal exam Cambridge, disarankan latihan dalam English karena exam Cambridge dalam English.",
    },
  ];

  return (
    <section className="py-16 md:py-20 px-4">
      <div className="container max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full mb-3">❓ FAQ</div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900">
            Pertanyaan yang sering ditanyakan
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <FAQItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600 mb-3">Masih ada pertanyaan?</p>
          <a
            href={WA_LINK}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-3 rounded-xl shadow transition"
          >
            <MessageCircle className="w-4 h-4" /> Chat Emma di WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 md:p-5 text-left hover:bg-slate-50 transition"
      >
        <span className="font-semibold text-slate-900 text-sm md:text-base">{q}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9) FINAL CTA
// ═══════════════════════════════════════════════════════════════════════════════

function FinalCTASection() {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-14 text-center text-white shadow-2xl" style={{ background: `linear-gradient(120deg, ${PURPLE}, ${PINK})` }}>
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-amber-300/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="text-5xl md:text-6xl mb-4">🎓</div>
            <h2 className="text-2xl md:text-4xl font-extrabold mb-3">
              Mulai belajar Cambridge IGCSE hari ini
            </h2>
            <p className="text-white/90 mb-8 max-w-2xl mx-auto text-base md:text-lg">
              Coba 30 menit gratis. Tidak perlu kartu kredit. Kalau tidak cocok — tidak usah bayar sepeserpun.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/igcse/app" className="inline-flex items-center gap-2 bg-white text-violet-700 font-extrabold px-7 py-4 rounded-xl shadow-xl hover:bg-amber-50 transition text-base">
                Mulai Sekarang · Gratis 30 Menit <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={WA_LINK}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-7 py-4 rounded-xl shadow-xl transition text-base"
              >
                <MessageCircle className="w-4 h-4" /> Konsultasi via WhatsApp
              </a>
            </div>
            <p className="text-white/70 text-xs mt-6">Aman via Xendit · batalkan kapan saja · sudah 100+ siswa aktif</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STICKY WHATSAPP (mobile-friendly floating button)
// ═══════════════════════════════════════════════════════════════════════════════

function StickyWhatsApp() {
  return (
    <a
      href={WA_LINK}
      target="_blank" rel="noopener noreferrer"
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl px-4 py-3 md:px-5 md:py-3.5 flex items-center gap-2 font-bold transition hover:scale-105"
      aria-label="Chat via WhatsApp"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="hidden sm:inline">Chat WhatsApp</span>
    </a>
  );
}
