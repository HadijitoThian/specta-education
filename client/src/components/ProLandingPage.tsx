import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Brain, Sparkles, Users, Target, Palette, BarChart3, Crown,
  CheckCircle, ArrowRight, Loader2, Clock, ShieldCheck, FileText,
  Mail, Star, BookOpen, Zap
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

type Lang = "id" | "en";

interface ProLandingPageProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const sections = [
  { icon: BookOpen, color: "from-blue-500 to-blue-600", title: { id: "Profil Diri", en: "Personal Profile" }, desc: { id: "Data dasar untuk personalisasi", en: "Basic data for personalization" }, duration: "2 min" },
  { icon: Brain, color: "from-indigo-500 to-indigo-600", title: { id: "RIASEC Pro", en: "RIASEC Pro" }, desc: { id: "Minat & kepribadian mendalam", en: "Deep interest & personality" }, duration: "5 min" },
  { icon: Sparkles, color: "from-purple-500 to-purple-600", title: { id: "Multiple Intelligence", en: "Multiple Intelligence" }, desc: { id: "Profil kecerdasan majemuk", en: "Multiple intelligence profile" }, duration: "4 min" },
  { icon: Users, color: "from-pink-500 to-pink-600", title: { id: "Personality", en: "Personality" }, desc: { id: "Tipe kepribadian detail", en: "Detailed personality type" }, duration: "4 min" },
  { icon: Target, color: "from-orange-500 to-orange-600", title: { id: "Situational Judgment", en: "Situational Judgment" }, desc: { id: "Pengambilan keputusan", en: "Decision-making skills" }, duration: "4 min" },
  { icon: Palette, color: "from-teal-500 to-teal-600", title: { id: "Creative Assessment", en: "Creative Assessment" }, desc: { id: "Potensi kreativitas", en: "Creativity potential" }, duration: "3 min" },
  { icon: BarChart3, color: "from-emerald-500 to-emerald-600", title: { id: "Ranking & Prioritas", en: "Ranking & Priorities" }, desc: { id: "Nilai & preferensi hidup", en: "Values & life preferences" }, duration: "3 min" },
];

const testimonials = [
  { name: "Sarah M.", school: "SMAN 3 Jakarta", text: { id: "Hasil tesnya sangat detail! Saya jadi tahu jurusan yang benar-benar cocok untuk saya.", en: "The results were very detailed! I now know which major truly suits me." } },
  { name: "Rizki A.", school: "SMA Labschool", text: { id: "Analisis AI-nya luar biasa. Bahkan orang tua saya terkesan dengan laporannya.", en: "The AI analysis was incredible. Even my parents were impressed with the report." } },
  { name: "Dina P.", school: "SMAN 1 Bandung", text: { id: "Lebih lengkap dari tes bakat manapun yang pernah saya coba. Worth it banget!", en: "More comprehensive than any aptitude test I've tried. Totally worth it!" } },
];

export default function ProLandingPage({ lang, setLang }: ProLandingPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showForm, setShowForm] = useState(false);

  const createOrderMutation = trpc.aptitude.createProOrder.useMutation();

  const handlePurchase = async () => {
    if (!name.trim() || !email.trim()) return;
    try {
      const result = await createOrderMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        source: "landing",
      });
      window.location.href = result.invoiceUrl;
    } catch (err) {
      console.error("Failed to create order:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navigation currentPage="aptitude-pro" />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/50 to-transparent" />
        <div className="container max-w-5xl mx-auto px-4 relative">
          {/* Language toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-white rounded-full p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setLang("id")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${lang === "id" ? "bg-indigo-500 text-white shadow" : "text-gray-600 hover:text-gray-800"}`}
              >
                🇮🇩 Bahasa Indonesia
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${lang === "en" ? "bg-indigo-500 text-white shadow" : "text-gray-600 hover:text-gray-800"}`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 px-5 py-2.5 rounded-full text-sm font-semibold mb-6 shadow-sm">
              <Crown className="w-4 h-4 text-yellow-500" />
              {lang === "id" ? "Tes Bakat Paling Komprehensif" : "Most Comprehensive Aptitude Test"}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-5 leading-tight">
              {lang === "id" ? (
                <>Temukan Potensi <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Terbaikmu</span></>
              ) : (
                <>Discover Your <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">True Potential</span></>
              )}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              {lang === "id"
                ? "7 dimensi penilaian AI mendalam — dari minat, kecerdasan, kepribadian, hingga kreativitas. Dapatkan laporan PDF lengkap dengan rekomendasi jurusan & karir."
                : "7 in-depth AI assessment dimensions — from interests, intelligence, personality, to creativity. Get a complete PDF report with major & career recommendations."}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-10">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5 text-indigo-500" />
                <span className="font-medium">~25 {lang === "id" ? "menit" : "minutes"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span className="font-medium">{lang === "id" ? "Analisis AI" : "AI Analysis"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FileText className="w-5 h-5 text-purple-500" />
                <span className="font-medium">{lang === "id" ? "Laporan PDF 10+ halaman" : "10+ page PDF report"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-5 h-5 text-blue-500" />
                <span className="font-medium">{lang === "id" ? "Dikirim ke email" : "Sent to email"}</span>
              </div>
            </div>

            {/* Price Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8"
            >
              <div className="mb-4">
                <span className="text-gray-400 text-sm line-through mr-2">Rp 149.000</span>
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
                  {lang === "id" ? "HEMAT 47%" : "SAVE 47%"}
                </span>
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">Rp 79.000</div>
              <p className="text-gray-500 text-sm mb-6">{lang === "id" ? "Sekali bayar, akses selamanya" : "One-time payment, lifetime access"}</p>

              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
                >
                  {lang === "id" ? "Beli Sekarang" : "Buy Now"}
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <div className="space-y-3 text-left">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "id" ? "Nama Lengkap" : "Full Name"} *</label>
                    <input
                      type="text"
                      placeholder={lang === "id" ? "Nama lengkap kamu" : "Your full name"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      placeholder="email@contoh.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "id" ? "No. WhatsApp" : "WhatsApp Number"} ({lang === "id" ? "opsional" : "optional"})</label>
                    <input
                      type="tel"
                      placeholder="08xxxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={!name.trim() || !email.trim() || createOrderMutation.isPending}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {lang === "id" ? "Memproses..." : "Processing..."}
                      </>
                    ) : (
                      <>
                        {lang === "id" ? "Bayar Rp 79.000" : "Pay Rp 79.000"}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  {createOrderMutation.isError && (
                    <p className="text-red-500 text-xs text-center">
                      {lang === "id" ? "Gagal membuat pembayaran. Silakan coba lagi." : "Failed to create payment. Please try again."}
                    </p>
                  )}
                  <p className="text-gray-400 text-xs text-center pt-1">
                    {lang === "id"
                      ? "Pembayaran aman via Xendit • Transfer bank, e-wallet, QRIS"
                      : "Secure payment via Xendit • Bank transfer, e-wallet, QRIS"}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 7 Sections Overview */}
      <section className="py-16 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {lang === "id" ? "7 Dimensi Penilaian Mendalam" : "7 In-Depth Assessment Dimensions"}
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              {lang === "id"
                ? "Setiap dimensi dirancang oleh pakar psikologi untuk mengungkap potensi terbaikmu"
                : "Each dimension is designed by psychology experts to reveal your best potential"}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{s.title[lang]}</h3>
                    <span className="text-xs text-gray-400">{s.duration}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{s.desc[lang]}</p>
              </motion.div>
            ))}
            {/* AI Analysis card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.56 }}
              className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-5 text-white"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{lang === "id" ? "Analisis AI Mendalam" : "Deep AI Analysis"}</h3>
                  <span className="text-xs text-indigo-200">{lang === "id" ? "Laporan PDF lengkap" : "Complete PDF report"}</span>
                </div>
              </div>
              <p className="text-xs text-indigo-100">{lang === "id" ? "Hasil dikirim langsung ke email kamu" : "Results sent directly to your email"}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {lang === "id" ? "Apa yang Kamu Dapatkan?" : "What Do You Get?"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                {lang === "id" ? "Laporan PDF 10+ Halaman" : "10+ Page PDF Report"}
              </h3>
              <ul className="space-y-3">
                {[
                  { id: "Profil RIASEC Pro lengkap dengan grafik", en: "Complete RIASEC Pro profile with charts" },
                  { id: "Peta kecerdasan majemuk detail", en: "Detailed multiple intelligence map" },
                  { id: "Analisis kepribadian mendalam", en: "In-depth personality analysis" },
                  { id: "Rekomendasi jurusan dengan % kecocokan", en: "Major recommendations with % match" },
                  { id: "Prospek karir dan estimasi gaji", en: "Career prospects and salary estimates" },
                  { id: "Tips persiapan kuliah personal", en: "Personalized college prep tips" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {item[lang]}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                {lang === "id" ? "Analisis AI Mendalam" : "Deep AI Analysis"}
              </h3>
              <ul className="space-y-3">
                {[
                  { id: "Analisis cross-dimensional unik", en: "Unique cross-dimensional analysis" },
                  { id: "Insight kepribadian yang jarang diketahui", en: "Rarely known personality insights" },
                  { id: "Rekomendasi karir berdasarkan 7 dimensi", en: "Career recommendations based on 7 dimensions" },
                  { id: "Ringkasan untuk orang tua", en: "Summary for parents" },
                  { id: "Strategi belajar yang sesuai", en: "Suitable learning strategies" },
                  { id: "Potensi kreativitas & inovasi", en: "Creativity & innovation potential" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    {item[lang]}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {lang === "id" ? "Kata Mereka" : "What They Say"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-50 rounded-xl p-5 border border-gray-100"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 mb-4 italic">"{t.text[lang]}"</p>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.school}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700">
        <div className="container max-w-3xl mx-auto px-4 text-center text-white">
          <Crown className="w-12 h-12 text-yellow-300 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {lang === "id" ? "Siap Temukan Potensi Terbaikmu?" : "Ready to Discover Your True Potential?"}
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            {lang === "id"
              ? "Bergabung dengan ribuan siswa yang sudah menemukan jurusan dan karir impian mereka."
              : "Join thousands of students who have found their dream major and career."}
          </p>
          <div className="max-w-sm mx-auto">
            <div className="mb-4">
              <span className="text-white/60 text-sm line-through mr-2">Rp 149.000</span>
              <span className="text-4xl font-bold">Rp 79.000</span>
            </div>
            {!showForm ? (
              <button
                onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                {lang === "id" ? "Beli Sekarang" : "Buy Now"}
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                {lang === "id" ? "Isi Form di Atas" : "Fill Form Above"}
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            <p className="text-white/50 text-xs mt-4">
              {lang === "id"
                ? "Pembayaran aman via Xendit • Transfer bank, e-wallet, QRIS"
                : "Secure payment via Xendit • Bank transfer, e-wallet, QRIS"}
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
