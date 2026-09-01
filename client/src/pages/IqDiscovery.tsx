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
import { Loader2, Clock, Sparkles, Trophy, Brain, ArrowRight, Lock } from "lucide-react";

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navigation />
        <main className="max-w-2xl mx-auto p-4 pt-20 pb-16">
          <div className="text-center mb-8">
            <div className="inline-block text-6xl mb-3">🧠</div>
            <div className="text-xs uppercase tracking-widest text-indigo-600 font-bold mb-2">SpecTa IQ Discovery</div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Seberapa cerdas <span style={{ background: "linear-gradient(90deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>otakmu</span>?
            </h1>
            <p className="text-slate-600 mt-3 max-w-md mx-auto">
              Tes kognitif AI dalam 5 dimensi. Estimasi IQ + arketip kognitif kamu yang bisa dibagikan.
            </p>
          </div>

          {tokenParam ? (
            // ── Paid link entry — collect lead + start full test ─────────
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
          ) : (
            // ── Public landing — preview or upsell ───────────────────────
            <div className="space-y-4">
              {/* Preview card */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">⚡</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">Preview Gratis · 3 menit</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      5 soal dari 5 dimensi kognitif. Dapatkan estimasi kasar + preview arketip kamu.
                    </p>
                    <button
                      onClick={() => startPreview.mutate()}
                      disabled={startPreview.isPending}
                      className="mt-3 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                    >
                      {startPreview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Mulai Preview
                    </button>
                  </div>
                </div>
              </div>

              {/* Full-test upsell */}
              <div className="rounded-2xl shadow-lg border-2 border-indigo-300 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur">Populer</div>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🎯</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">Tes Lengkap · 40 soal</h3>
                    <p className="text-sm text-indigo-100 mt-1">
                      Estimasi IQ ± 5 · 5 skor per-dimensi · Arketip lengkap · Laporan PDF · Gambar untuk story IG
                    </p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <div className="text-2xl font-black">Rp 59.000</div>
                      <div className="text-xs text-indigo-200 line-through">Rp 89.000</div>
                    </div>
                    <a href="/iq-discovery/beli" className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50">
                      <Trophy className="w-4 h-4" /> Beli Sekarang
                    </a>
                  </div>
                </div>
              </div>

              {/* Trust footer */}
              <div className="text-center text-xs text-slate-500 pt-4">
                🔒 Estimasi berbasis AI — bukan pengganti tes IQ klinis profesional. Untuk tujuan self-discovery.
              </div>
            </div>
          )}
        </main>
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
