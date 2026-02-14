import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Crown, Brain, Sparkles, Users, Target, Palette, BarChart3, ArrowRight, Loader2, CheckCircle, Clock, Zap } from "lucide-react";

type Lang = "id" | "en";

interface ProUpsellCardProps {
  lang: Lang;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
}

const DISCOUNT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const DISCOUNT_PRICE = 59000;
const REGULAR_PRICE = 79000;
const STORAGE_KEY = "proUpsellTimerStart";

function getTimerStart(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return parseInt(stored, 10);
  const now = Date.now();
  localStorage.setItem(STORAGE_KEY, now.toString());
  return now;
}

function getTimeRemaining(startTime: number): { hours: number; minutes: number; seconds: number; expired: boolean } {
  const elapsed = Date.now() - startTime;
  const remaining = DISCOUNT_DURATION_MS - elapsed;
  if (remaining <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, expired: false };
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

  // Discount timer state
  const [timerStart] = useState(() => getTimerStart());
  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(timerStart));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(timerStart));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStart]);

  const isDiscounted = !timeLeft.expired;
  const currentPrice = isDiscounted ? DISCOUNT_PRICE : REGULAR_PRICE;
  const priceLabel = `Rp ${currentPrice.toLocaleString("id-ID")}`;

  const createOrderMutation = trpc.aptitude.createProOrder.useMutation();

  const handlePurchase = async () => {
    if (!name.trim() || !email.trim()) return;
    try {
      const result = await createOrderMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        source: "upsell",
        useDiscountPrice: isDiscounted,
      });
      window.location.href = result.invoiceUrl;
    } catch (err) {
      console.error("Failed to create order:", err);
    }
  };

  const comp = comparisonData[lang];
  const features = proFeatures[lang];

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.75 }}
      className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-1 mb-6 shadow-xl"
    >
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl overflow-hidden">
        {/* Discount Timer Banner */}
        {isDiscounted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-red-500 via-orange-500 to-red-500 px-4 py-3 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-white">
              <Zap className="w-4 h-4 text-yellow-200 animate-pulse" />
              <span className="text-sm font-bold">
                {lang === "id" ? "PROMO TERBATAS!" : "LIMITED TIME OFFER!"}
              </span>
              <Zap className="w-4 h-4 text-yellow-200 animate-pulse" />
            </div>
            <div className="flex items-center justify-center gap-3 mt-2">
              <Clock className="w-4 h-4 text-yellow-200" />
              <div className="flex gap-1.5">
                <span className="bg-white/20 rounded-md px-2 py-1 text-white font-mono font-bold text-lg min-w-[2.5rem] text-center">
                  {pad(timeLeft.hours)}
                </span>
                <span className="text-white font-bold text-lg">:</span>
                <span className="bg-white/20 rounded-md px-2 py-1 text-white font-mono font-bold text-lg min-w-[2.5rem] text-center">
                  {pad(timeLeft.minutes)}
                </span>
                <span className="text-white font-bold text-lg">:</span>
                <span className="bg-white/20 rounded-md px-2 py-1 text-white font-mono font-bold text-lg min-w-[2.5rem] text-center">
                  {pad(timeLeft.seconds)}
                </span>
              </div>
            </div>
            <p className="text-white/90 text-xs mt-1.5">
              {lang === "id"
                ? "Upgrade dalam 24 jam dan hemat Rp 20.000!"
                : "Upgrade within 24 hours and save Rp 20,000!"}
            </p>
          </motion.div>
        )}

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
            {isDiscounted ? (
              <>
                <span className="text-white/50 text-sm line-through mr-2">Rp 149.000</span>
                <span className="text-white/60 text-base line-through mr-2">Rp 79.000</span>
                <span className="text-3xl font-bold text-yellow-300">{priceLabel}</span>
                <div className="mt-1">
                  <span className="inline-block bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    {lang === "id" ? "HEMAT Rp 20.000!" : "SAVE Rp 20,000!"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="text-white/60 text-sm line-through mr-2">Rp 149.000</span>
                <span className="text-3xl font-bold text-white">{priceLabel}</span>
              </>
            )}
          </div>

          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className={`w-full max-w-sm mx-auto font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-base ${
                isDiscounted
                  ? "bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-gray-900"
                  : "bg-yellow-400 hover:bg-yellow-300 text-gray-900"
              }`}
            >
              {isDiscounted
                ? lang === "id" ? "Ambil Promo Sekarang!" : "Claim Discount Now!"
                : lang === "id" ? "Upgrade Sekarang" : "Upgrade Now"}
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
                className={`w-full font-bold py-4 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-base ${
                  isDiscounted
                    ? "bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 disabled:opacity-50 text-gray-900"
                    : "bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900"
                }`}
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {lang === "id" ? "Memproses..." : "Processing..."}
                  </>
                ) : (
                  <>
                    {lang === "id" ? `Bayar ${priceLabel}` : `Pay ${priceLabel}`}
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
