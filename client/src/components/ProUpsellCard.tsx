import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Crown, Brain, Sparkles, Users, Target, Palette, BarChart3, ArrowRight, Loader2, CheckCircle } from "lucide-react";

type Lang = "id" | "en";

interface ProUpsellCardProps {
  lang: Lang;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
}

const proFeatures = {
  id: [
    { icon: Brain, label: "RIASEC Pro — Analisis minat & kepribadian mendalam" },
    { icon: Sparkles, label: "Multiple Intelligence — Profil kecerdasan majemuk" },
    { icon: Users, label: "Personality Profiling — Tipe kepribadian detail" },
    { icon: Target, label: "Situational Judgment — Pengambilan keputusan" },
    { icon: Palette, label: "Creative Assessment — Potensi kreativitas" },
    { icon: BarChart3, label: "Ranking & Prioritas — Nilai & preferensi" },
  ],
  en: [
    { icon: Brain, label: "RIASEC Pro — Deep interest & personality analysis" },
    { icon: Sparkles, label: "Multiple Intelligence — Full intelligence profile" },
    { icon: Users, label: "Personality Profiling — Detailed personality type" },
    { icon: Target, label: "Situational Judgment — Decision-making skills" },
    { icon: Palette, label: "Creative Assessment — Creativity potential" },
    { icon: BarChart3, label: "Ranking & Priorities — Values & preferences" },
  ],
};

const comparisonData = {
  id: {
    free: { title: "Versi Gratis", items: ["3 bagian tes", "RIASEC dasar", "Multiple Intelligence dasar", "Analisis AI singkat", "Rekomendasi jurusan"] },
    pro: { title: "Versi Pro", items: ["7 bagian tes mendalam", "RIASEC Pro + Personality", "Multiple Intelligence lengkap", "Situational Judgment Test", "Creative & Ranking Assessment", "Laporan PDF 10+ halaman", "Analisis AI mendalam", "Rekomendasi karir & gaji"] },
  },
  en: {
    free: { title: "Free Version", items: ["3 test sections", "Basic RIASEC", "Basic Multiple Intelligence", "Brief AI analysis", "Major recommendations"] },
    pro: { title: "Pro Version", items: ["7 in-depth test sections", "RIASEC Pro + Personality", "Full Multiple Intelligence", "Situational Judgment Test", "Creative & Ranking Assessment", "10+ page PDF report", "Deep AI analysis", "Career & salary recommendations"] },
  },
};

export default function ProUpsellCard({ lang, studentName, studentEmail, studentPhone }: ProUpsellCardProps) {
  const [name, setName] = useState(studentName || "");
  const [email, setEmail] = useState(studentEmail || "");
  const [phone, setPhone] = useState(studentPhone || "");
  const [showForm, setShowForm] = useState(false);

  const createOrderMutation = trpc.aptitude.createProOrder.useMutation();

  const handlePurchase = async () => {
    if (!name.trim() || !email.trim()) return;
    try {
      const result = await createOrderMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        source: "upsell",
      });
      // Redirect to Xendit payment page
      window.location.href = result.invoiceUrl;
    } catch (err) {
      console.error("Failed to create order:", err);
    }
  };

  const price = "Rp 79.000";
  const comp = comparisonData[lang];
  const features = proFeatures[lang];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.75 }}
      className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-1 mb-6 shadow-xl"
    >
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
            <Crown className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-semibold">
              {lang === "id" ? "Upgrade ke Pro" : "Upgrade to Pro"}
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2">
            {lang === "id" ? "Mau Tahu Lebih Dalam?" : "Want to Go Deeper?"}
          </h3>
          <p className="text-white/80 text-sm max-w-md mx-auto">
            {lang === "id"
              ? "Tes Bakat AI Pro menganalisis 7 dimensi kepribadian kamu secara mendalam — dari minat, kecerdasan, hingga kreativitas dan pengambilan keputusan."
              : "AI Aptitude Test Pro analyzes 7 dimensions of your personality in depth — from interests, intelligence, to creativity and decision-making."}
          </p>
        </div>

        {/* Comparison Table */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Free column */}
            <div className="bg-white/10 rounded-xl p-4">
              <h4 className="text-white/60 text-xs font-semibold uppercase mb-3">{comp.free.title}</h4>
              <ul className="space-y-2">
                {comp.free.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/70 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Pro column */}
            <div className="bg-white/20 rounded-xl p-4 border border-white/20">
              <h4 className="text-yellow-300 text-xs font-semibold uppercase mb-3 flex items-center gap-1">
                <Crown className="w-3 h-3" /> {comp.pro.title}
              </h4>
              <ul className="space-y-2">
                {comp.pro.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-white text-xs">
                    <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-yellow-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 7 Sections */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {features.map((f, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-2.5 flex items-start gap-2">
                <f.icon className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
                <span className="text-white/90 text-xs leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price & CTA */}
        <div className="bg-white/10 px-6 py-6 text-center">
          <div className="mb-4">
            <span className="text-white/60 text-sm line-through mr-2">Rp 149.000</span>
            <span className="text-3xl font-bold text-white">{price}</span>
          </div>

          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full max-w-sm mx-auto bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-base"
            >
              {lang === "id" ? "Upgrade Sekarang" : "Upgrade Now"}
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="max-w-sm mx-auto space-y-3">
              <input
                type="text"
                placeholder={lang === "id" ? "Nama lengkap" : "Full name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/50 border border-white/20 focus:border-white/40 focus:outline-none text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/50 border border-white/20 focus:border-white/40 focus:outline-none text-sm"
              />
              <input
                type="tel"
                placeholder={lang === "id" ? "No. WhatsApp (opsional)" : "WhatsApp number (optional)"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/50 border border-white/20 focus:border-white/40 focus:outline-none text-sm"
              />
              <button
                onClick={handlePurchase}
                disabled={!name.trim() || !email.trim() || createOrderMutation.isPending}
                className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold py-4 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-base"
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {lang === "id" ? "Memproses..." : "Processing..."}
                  </>
                ) : (
                  <>
                    {lang === "id" ? `Bayar ${price}` : `Pay ${price}`}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              {createOrderMutation.isError && (
                <p className="text-red-300 text-xs text-center">
                  {lang === "id" ? "Gagal membuat pembayaran. Silakan coba lagi." : "Failed to create payment. Please try again."}
                </p>
              )}
            </div>
          )}

          <p className="text-white/50 text-xs mt-4">
            {lang === "id"
              ? "Pembayaran aman via Xendit • Transfer bank, e-wallet, QRIS"
              : "Secure payment via Xendit • Bank transfer, e-wallet, QRIS"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
