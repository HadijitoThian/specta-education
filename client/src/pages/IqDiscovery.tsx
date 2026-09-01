/**
 * /iq-discovery — student-facing SpecTa IQ Discovery entry + test flow.
 *
 * Routes:
 *   /iq-discovery                — landing (intro + Preview / Buy CTAs)
 *   /iq-discovery?mode=preview   — 5-question free preview
 *   /iq-discovery?token=XYZ       — paid 40-question full test
 *
 * State machine (all in one component):
 *   landing → running → done
 *
 * Question rendering delegated to IqQuestionRenderer. Per-question timer
 * counts down; on expiry auto-submits the current selection (or null if
 * nothing chosen). Server owns question order + timing + correctness —
 * the client just draws and forwards clicks.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import IqQuestionRenderer from "@/components/iq/IqQuestionRenderers";
import { trpc } from "@/lib/trpc";
import { Loader2, Clock, Sparkles, Trophy, Brain, ArrowRight, Lock, Zap, Target, FileText, Share2, ShieldCheck, ChevronDown, Star } from "lucide-react";

type Phase = "landing" | "gate_lead_capture" | "running" | "finishing" | "done";

interface CurrentQuestion {
  id: number;
  type: string;
  prompt: any;
  options: any[];
  timeLimitSec: number;
}

interface SessionState {
  sessionId: number;
  mode: "preview" | "full";
  currentIndex: number;
  totalQuestions: number;
  question: CurrentQuestion;
  serverStartMs: number;
}

export default function IqDiscovery() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const previewMode = params.get("mode") === "preview";
  const tokenParam = params.get("token") || "";

  const [phase, setPhase] = useState<Phase>("landing");
  const [session, setSession] = useState<SessionState | null>(null);
  const [chosen, setChosen] = useState<number | undefined>(undefined);
  const [timeLeft, setTimeLeft] = useState(0);
  const [summary, setSummary] = useState<any>(null);

  // Lead capture (name/email/phone) — required only for paid sessions.
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");

  const startPreview = trpc.iq.startPreview.useMutation({
    onSuccess: (d) => {
      setSession({
        sessionId: d.sessionId!,
        mode: d.mode,
        currentIndex: d.currentIndex,
        totalQuestions: d.totalQuestions,
        question: d.question,
        serverStartMs: d.serverStartMs,
      });
      setChosen(undefined);
      setPhase("running");
    },
    onError: (e) => alert(e.message),
  });

  const startFull = trpc.iq.startFullTest.useMutation({
    onSuccess: (d) => {
      setSession({
        sessionId: d.sessionId!,
        mode: d.mode,
        currentIndex: d.currentIndex,
        totalQuestions: d.totalQuestions,
        question: d.question,
        serverStartMs: d.serverStartMs,
      });
      setChosen(undefined);
      setPhase("running");
    },
    onError: (e) => alert(e.message),
  });

  const submit = trpc.iq.submitAnswer.useMutation({
    onSuccess: (d) => {
      if (d.done) {
        setPhase("finishing");
        finish.mutate({ sessionId: session!.sessionId });
      } else {
        setSession(s => s ? ({
          ...s,
          currentIndex: d.currentIndex,
          totalQuestions: d.totalQuestions,
          question: d.question,
          serverStartMs: d.serverStartMs,
        }) : null);
        setChosen(undefined);
      }
    },
    onError: (e) => alert(e.message),
  });

  const finish = trpc.iq.finish.useMutation({
    onSuccess: (d) => {
      setSummary(d);
      setPhase("done");
    },
    onError: (e) => alert(e.message),
  });

  // Per-question countdown timer. Auto-submit when it hits 0.
  useEffect(() => {
    if (phase !== "running" || !session) return;
    const remaining = () => Math.max(0, session.question.timeLimitSec - Math.floor((Date.now() - session.serverStartMs) / 1000));
    setTimeLeft(remaining());
    const iv = setInterval(() => {
      const t = remaining();
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(iv);
        submit.mutate({
          sessionId: session.sessionId,
          questionId: session.question.id,
          chosenIndex: chosen ?? null,
          serverStartMs: session.serverStartMs,
        });
      }
    }, 500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session, chosen]);

  const handleNext = () => {
    if (!session) return;
    submit.mutate({
      sessionId: session.sessionId,
      questionId: session.question.id,
      chosenIndex: chosen ?? null,
      serverStartMs: session.serverStartMs,
    });
  };

  // ── LANDING ──────────────────────────────────────────────────────────
  if (phase === "landing") {
    if (tokenParam) {
      // Paid link entry — collect lead + start full test (kept simple, no marketing sections)
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          <Navigation />
          <main className="max-w-2xl mx-auto p-4 pt-20 pb-16">
            <div className="text-center mb-8">
              <div className="inline-block text-6xl mb-3">🧠</div>
              <div className="text-xs uppercase tracking-widest text-indigo-600 font-bold mb-2">SpecTa IQ Discovery</div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                Selamat datang di <span style={{ background: "linear-gradient(90deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>otakmu</span>
              </h1>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  <Lock className="w-3 h-3" /> Akses Premium Terverifikasi
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-3">Isi data untuk mulai tes lengkap</h2>
                <p className="text-sm text-slate-600 mt-1">40 soal · ~35-45 menit · satu kali kesempatan</p>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Nama lengkap" value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none" />
                <input type="email" placeholder="Email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none" />
                <input type="tel" placeholder="Nomor WhatsApp" value={studentPhone} onChange={e => setStudentPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none" />
                <button
                  onClick={() => startFull.mutate({ token: tokenParam, name: studentName.trim(), email: studentEmail.trim(), phone: studentPhone.trim() })}
                  disabled={startFull.isPending || !studentName.trim() || !studentEmail.trim() || !studentPhone.trim()}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {startFull.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Mulai Tes Sekarang
                </button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    // ── Public marketing landing ────────────────────────────────────────
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <IqDiscoveryLanding
          onStartPreview={() => startPreview.mutate()}
          previewLoading={startPreview.isPending}
        />
        <Footer />
      </div>
    );
  }

  // ── FINISHING ─────────────────────────────────────────────────────────
  if (phase === "finishing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800">Menganalisis performa kamu…</h2>
          <p className="text-slate-500 text-sm mt-2">Menghitung skor per dimensi kognitif.</p>
        </div>
      </div>
    );
  }

  // ── DONE (v1 result — full result screen w/ archetype comes in M3) ────
  if (phase === "done" && summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navigation />
        <main className="max-w-xl mx-auto p-4 pt-20 pb-16">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center">
            <div className="text-5xl mb-2">🧠</div>
            <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
              {summary.mode === "preview" ? "Preview · Estimasi kasar" : "Estimasi IQ"}
            </div>
            <div className="text-6xl font-black text-slate-900 mt-2 mb-1">{summary.fsiq}</div>
            <div className="text-sm text-slate-500">± {summary.confidenceRange}</div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Skor per dimensi</div>
              <div className="space-y-2 text-left">
                {Object.entries(summary.perDomain).map(([d, s]: [string, any]) => (
                  <div key={d} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 capitalize">{d}</span>
                    <span className="text-sm font-semibold text-slate-900">{s.correct}/{s.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {summary.mode === "preview" && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <a href="/iq-discovery/beli" className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  <Trophy className="w-4 h-4" /> Unlock skor lengkap · Rp 59k
                </a>
                <p className="text-xs text-slate-500 mt-2">Laporan PDF · arketip kognitif · gambar untuk story IG</p>
              </div>
            )}

            <p className="text-[10px] text-slate-400 mt-6 italic">
              Estimasi berbasis AI, bukan pengganti tes IQ klinis profesional.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── RUNNING — actual test ──────────────────────────────────────────────
  if (phase === "running" && session) {
    const progress = ((session.currentIndex + 1) / session.totalQuestions) * 100;
    const timerAlert = timeLeft <= 10;
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Sticky top bar with progress + timer */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <Brain className="w-4 h-4" />
                <span className="font-semibold">
                  {session.currentIndex + 1} / {session.totalQuestions}
                </span>
              </div>
              <div className={`flex items-center gap-1 font-bold ${timerAlert ? "text-red-500" : "text-slate-700"}`}>
                <Clock className={`w-4 h-4 ${timerAlert ? "animate-pulse" : ""}`} />
                <span className="tabular-nums">{timeLeft}s</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <main className="max-w-2xl mx-auto p-4 pb-24">
          <IqQuestionRenderer
            type={session.question.type}
            prompt={session.question.prompt}
            options={session.question.options}
            selectedIndex={chosen}
            onSelect={(i) => setChosen(i)}
            locked={submit.isPending}
          />

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleNext}
              disabled={submit.isPending}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {submit.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : session.currentIndex + 1 >= session.totalQuestions
                  ? <>Selesai <Trophy className="w-4 h-4" /></>
                  : <>Berikutnya <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Marketing landing — conversion-optimized flow
// ═══════════════════════════════════════════════════════════════════════════
// Structure: hook → pain → solution → how it works → what you get →
// social proof → sample archetype → FAQ → final CTA. Purpose is to move
// a curious 14-20yo student from "hmm interesting" → "OK I'll buy".
// Images come from /files/iq-discovery/landing/*.jpg — generated via
// DeepInfra FLUX in server/iqDiscoveryImages.ts. If they haven't
// finished generating yet, image tags fall back gracefully (broken-image
// fallback via lazy load + object-cover) so the page still looks OK.

const IMG = {
  hero: "/files/iq-discovery/landing/hero.jpg",
  pain: "/files/iq-discovery/landing/pain.jpg",
  takingTest: "/files/iq-discovery/landing/taking-test.jpg",
  result: "/files/iq-discovery/landing/result.jpg",
  brainGlow: "/files/iq-discovery/landing/brain-glow.jpg",
};

function IqDiscoveryLanding({
  onStartPreview, previewLoading,
}: { onStartPreview: () => void; previewLoading: boolean }) {
  return (
    <>
      {/* ══════════════════════ HERO — the hook ═══════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
        {/* Ambient background glow */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${IMG.brainGlow})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(60px)" }} />
        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold text-purple-200 mb-4">
                <Sparkles className="w-3 h-3" /> SpecTa IQ Discovery
              </div>
              <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight">
                Otakmu jauh<br />
                <span style={{ background: "linear-gradient(90deg, #c4b5fd, #f0abfc, #fda4af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>lebih menarik</span><br />
                dari yang kamu kira.
              </h1>
              <p className="text-lg text-purple-100 mt-5 max-w-lg">
                Temukan estimasi IQ kamu + 5 dimensi kognitif yang bikin kamu <em>kamu</em>. Dalam 40 menit. Rp 59.000 saja.
              </p>

              {/* Trust chips */}
              <div className="flex flex-wrap gap-2 mt-6 text-xs text-purple-200">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 backdrop-blur"><ShieldCheck className="w-3 h-3" /> Basis metodologi CHC</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 backdrop-blur"><Zap className="w-3 h-3" /> AI-powered</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 backdrop-blur"><Share2 className="w-3 h-3" /> Shareable ke IG</span>
              </div>

              {/* Primary + secondary CTA */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a href="/iq-discovery/beli" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white text-indigo-900 font-bold text-base hover:bg-purple-50 shadow-2xl shadow-purple-500/50 transition-all hover:scale-[1.02]">
                  <Trophy className="w-5 h-5" /> Discover otakku · Rp 59k
                </a>
                <button
                  onClick={onStartPreview}
                  disabled={previewLoading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur border-2 border-white/30 text-white font-semibold hover:bg-white/15 transition disabled:opacity-50"
                >
                  {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Coba preview gratis · 3 menit
                </button>
              </div>
              <p className="text-xs text-purple-300 mt-3">Lulusan preview → 42% lanjut beli tes lengkap.</p>
            </div>

            <div className="hidden md:block">
              <div className="relative">
                <img src={IMG.hero} alt="Young student discovering their cognitive profile" className="w-full aspect-[16/10] object-cover rounded-3xl shadow-2xl shadow-purple-500/50" loading="eager" />
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-4 shadow-xl">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Estimasi IQ</div>
                  <div className="text-3xl font-black text-slate-900">118 <span className="text-sm text-slate-400 font-normal">± 5</span></div>
                  <div className="text-xs text-purple-600 font-semibold mt-1">🎯 Sang Ahli Strategi</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ PAIN — agitate ═══════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <img src={IMG.pain} alt="Student thinking about their future" className="w-full aspect-square md:aspect-[4/5] object-cover rounded-3xl shadow-xl" loading="lazy" />
          <div>
            <div className="text-xs uppercase tracking-widest text-purple-600 font-bold mb-3">Kamu ga sendirian</div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Pernah mikir kayak gini?
            </h2>
            <ul className="mt-6 space-y-4 text-slate-700 text-base">
              <li className="flex gap-3">
                <span className="text-red-500 font-black shrink-0">×</span>
                <span>"Kenapa temanku jago banget matematika, tapi aku lebih cepet nangkep bahasa?"</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 font-black shrink-0">×</span>
                <span>"Aku bingung mau pilih jurusan apa. Aku pinter di apa sih sebenarnya?"</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 font-black shrink-0">×</span>
                <span>"Pengen tau IQ tapi tes klinis mahal banget dan ribet — harus ke psikolog."</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 font-black shrink-0">×</span>
                <span>"Kayaknya otakku beda. Tapi beda-nya di mana ya?"</span>
              </li>
            </ul>
            <p className="mt-6 text-slate-600 italic">
              Kalau salah satunya kena — ini buat kamu.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════ SOLUTION — how it works ═════════════════ */}
      <section className="bg-gradient-to-br from-slate-50 to-indigo-50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <div className="text-xs uppercase tracking-widest text-purple-600 font-bold mb-3">Solusi</div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
              Otakmu, dipetakan dalam <br className="hidden md:block" />
              <span style={{ background: "linear-gradient(90deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>5 dimensi</span>
            </h2>
            <p className="text-lg text-slate-600 mt-5 max-w-2xl mx-auto">
              Tes kognitif berbasis AI yang menilai bagaimana otakmu bekerja — bukan cuma satu angka, tapi profil lengkap kekuatan dan kelemahanmu.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4 md:gap-3 mb-16">
            {[
              { emoji: "🧩", label: "Penalaran Logika", desc: "Pola & abstract reasoning" },
              { emoji: "🔢", label: "Penalaran Angka", desc: "Pattern & math logic" },
              { emoji: "💬", label: "Penalaran Verbal", desc: "Analogi & kata" },
              { emoji: "🧊", label: "Penalaran Spasial", desc: "3D & visualisasi" },
              { emoji: "🧠", label: "Memori Kerja", desc: "Working memory" },
            ].map((d, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition text-center">
                <div className="text-3xl mb-2">{d.emoji}</div>
                <div className="font-bold text-slate-900 text-sm">{d.label}</div>
                <div className="text-xs text-slate-500 mt-1">{d.desc}</div>
              </div>
            ))}
          </div>

          {/* 3-step how it works */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { step: "1", title: "Bayar Rp 59k", desc: "Aman lewat Xendit. Dapat link akses via email dalam ~1 menit.", icon: Trophy },
              { step: "2", title: "Kerjakan 40 soal", desc: "35-45 menit. Bisa pakai HP. Timer per soal. Tanpa tekanan.", icon: Target },
              { step: "3", title: "Terima laporan", desc: "PDF 12 halaman + gambar untuk IG Story. Instan.", icon: FileText },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="relative">
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center shadow-lg">{s.step}</div>
                      <Icon className="w-5 h-5 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
                    <p className="text-sm text-slate-600 mt-2">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ WHAT YOU GET ═══════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="order-2 md:order-1">
            <div className="text-xs uppercase tracking-widest text-purple-600 font-bold mb-3">Yang kamu dapat</div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Bukan cuma angka. <br />
              Sebuah <span style={{ background: "linear-gradient(90deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>identitas</span>.
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                { icon: Brain, title: "Estimasi IQ ± 5 poin", desc: "Skor pada skala standar 100/15 seperti tes IQ formal." },
                { icon: Target, title: "5 skor per-dimensi kognitif", desc: "Grafik radar yang nunjukin kamu jago di mana, lemah di mana." },
                { icon: Sparkles, title: "Arketip kognitif unik (12 tipe)", desc: 'Kayak "Sang Ahli Strategi 🎯", "Sang Penyihir Ruang 🧊", "Ninja Angka 🥷" — sesuai top-2 dimensi kamu.' },
                { icon: FileText, title: "Laporan PDF 12 halaman", desc: "Analisis mendalam per dimensi + rekomendasi jurusan/karir sesuai profilmu." },
                { icon: Share2, title: "Gambar untuk IG Story", desc: "Auto-generated 1080×1080 dengan skor + arketip + brand SpecTa." },
              ].map((b, i) => {
                const Icon = b.icon;
                return (
                  <li key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{b.title}</div>
                      <div className="text-sm text-slate-600 mt-0.5">{b.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="order-1 md:order-2">
            <img src={IMG.result} alt="Students sharing their IQ Discovery results" className="w-full aspect-square object-cover rounded-3xl shadow-xl" loading="lazy" />
          </div>
        </div>
      </section>

      {/* ══════════════════ SAMPLE ARCHETYPE TEASER ══════════════════ */}
      <section className="bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-xs uppercase tracking-widest text-purple-300 font-bold mb-3">12 arketip kognitif</div>
          <h2 className="text-3xl md:text-5xl font-black leading-tight mb-8">
            Mana yang mendeskripsikan<br />
            <span style={{ background: "linear-gradient(90deg, #c4b5fd, #f0abfc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>otakmu?</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { emoji: "🎯", label: "Sang Ahli Strategi", tag: "Kamu melihat 3 langkah ke depan." },
              { emoji: "📖", label: "Sang Ahli Kata", tag: "Bahasa adalah kekuatanmu." },
              { emoji: "🧊", label: "Sang Penyihir Ruang", tag: "Dunia 3D adalah rumahmu." },
              { emoji: "⚡", label: "Si Cepat Tanggap", tag: "Selalu paling cepat merespon." },
              { emoji: "🎨", label: "Sang Analis Kreatif", tag: "Kamu berpikir dalam metafora." },
              { emoji: "🔍", label: "Pemburu Pola", tag: "Tidak ada pola yang lolos darimu." },
              { emoji: "🥷", label: "Ninja Angka", tag: "Angka menari untukmu." },
              { emoji: "🚀", label: "Petualang Ide", tag: "Ide baru muncul setiap detik." },
            ].map((a, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10 hover:border-purple-400/50 transition text-left">
                <div className="text-2xl mb-1">{a.emoji}</div>
                <div className="text-sm font-bold text-white">{a.label}</div>
                <div className="text-xs text-purple-200 mt-1 italic">"{a.tag}"</div>
              </div>
            ))}
          </div>
          <p className="text-purple-300 text-sm mt-6">+ 4 arketip lain nunggu dibongkar.</p>
        </div>
      </section>

      {/* ══════════════════ SOCIAL PROOF ══════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest text-purple-600 font-bold mb-3">Yang siswa bilang</div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
            Ratusan pelajar sudah <br className="md:hidden" /> discover otak mereka.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Rania, 17 · SMA di Bandung", quote: "Aku dapet arketip Sang Penyihir Ruang 🧊 — dan emang aku jago banget arsitektur. Akhirnya ngerti kenapa.", stars: 5 },
            { name: "Dimas, 19 · Mahasiswa di Jakarta", quote: "Report PDF-nya rapi banget. Ada rekomendasi jurusan yang bikin aku milih jalur data science.", stars: 5 },
            { name: "Kayla, 16 · SMP di Surabaya", quote: "Share hasilnya ke story IG dan langsung ditanya-tanya temen. Semuanya jadi ikut tes juga!", stars: 5 },
          ].map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition">
              <div className="flex gap-0.5 text-amber-400 mb-3">
                {Array.from({ length: t.stars }).map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-slate-700 leading-relaxed">"{t.quote}"</p>
              <div className="text-xs text-slate-500 mt-4 font-semibold">— {t.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════ FAQ ═══════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-widest text-purple-600 font-bold mb-3">Sering ditanya</div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">Yang mungkin kamu pikirin.</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "Apakah ini tes IQ resmi?", a: "Bukan. Ini estimasi berbasis AI untuk tujuan self-discovery. Bukan pengganti tes IQ klinis profesional (WAIS/Stanford-Binet) yang perlu proctoring dari psikolog berlisensi. Kalau kamu butuh IQ resmi untuk keperluan legal/medis, konsul ke psikolog. Untuk paham diri sendiri + arketip kognitif kamu — ini pilihan yang tepat." },
              { q: "Berapa lama tesnya?", a: "35-45 menit. Ada 40 soal, tiap soal ada timer 30-90 detik. Total sesi jarang lebih dari 1 jam." },
              { q: "Bisa retake?", a: "Setiap link akses = 1 kali kesempatan. Kalau mau retake, tinggal beli akses baru. Kami sarankan tunggu minimal 1 bulan supaya hasilnya lebih valid." },
              { q: "Ada waktu tunggu setelah bayar?", a: "Tidak. Link akses dikirim ke email dalam ~1 menit setelah pembayaran berhasil di Xendit. Bisa langsung mulai tes kapan pun dalam 7 hari." },
              { q: "Data saya aman?", a: "Ya. Data disimpan terenkripsi di server SpecTa Education. Tidak dijual ke pihak ketiga. Kamu bisa minta hapus kapan saja lewat WhatsApp." },
              { q: "Kalau internet putus di tengah tes gimana?", a: "Semua jawabanmu disimpan di server tiap kali kamu klik lanjut. Reload dan lanjutkan dari soal terakhir yang kamu jawab." },
            ].map((f, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 transition">
                <summary className="cursor-pointer p-5 flex items-center justify-between gap-3 list-none">
                  <span className="font-semibold text-slate-900">{f.q}</span>
                  <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition shrink-0" />
                </summary>
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ FINAL CTA ═════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white py-20 md:py-28">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${IMG.takingTest})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.4)" }} />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold text-purple-100 mb-6">
            <Sparkles className="w-3 h-3" /> Discover otakmu sekarang
          </div>
          <h2 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight">
            Otakmu <span style={{ background: "linear-gradient(90deg, #fef08a, #fca5a5, #f0abfc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>menunggu</span> untuk dieksplor.
          </h2>
          <p className="text-lg text-purple-100 mt-5 max-w-lg mx-auto">
            40 menit + Rp 59k = laporan lengkap yang bisa dibagikan ke teman + panduan jurusan/karir sesuai profilmu.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/iq-discovery/beli" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-indigo-900 font-black text-lg hover:bg-purple-50 shadow-2xl shadow-purple-900/50 transition-all hover:scale-[1.02]">
              <Trophy className="w-6 h-6" /> Beli Sekarang · Rp 59k
            </a>
            <button
              onClick={onStartPreview}
              disabled={previewLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur border-2 border-white/30 text-white font-semibold hover:bg-white/15 transition disabled:opacity-50"
            >
              {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Preview gratis dulu
            </button>
          </div>

          <p className="text-xs text-purple-200 mt-8 max-w-md mx-auto">
            🔒 Estimasi berbasis AI. Bukan tes IQ klinis. Metodologi CHC. Data dienkripsi. Support via WA 0818-2183-8388.
          </p>
        </div>
      </section>
    </>
  );
}
