/**
 * /ielts/tutor/live — real-time IELTS Speaking practice call.
 *
 * Phone-call-style conversation with the ElevenLabs agent ("Emma"):
 * the student talks, Emma replies naturally, corrects grammar inline,
 * and guides them through a Part 1 → 2 → 3 style session in 15 minutes.
 *
 * Flow: entitlement check (tutor sub + session quota) → mic permission →
 * start (signed URL from server) → live call UI (timer, speaking
 * indicator, mute, end) → done screen.
 *
 * The 15-minute cap is enforced server-side by the agent config
 * (max_duration_seconds) — the countdown here is cosmetic UX.
 */

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import {
  Loader2, Mic, MicOff, PhoneOff, Phone, Clock, Sparkles,
  ShieldCheck, MessageCircle, GraduationCap, Volume2,
} from "lucide-react";

const PINK = "#E91E8C";
const PURPLE = "#9C27B0";

type Phase = "intro" | "connecting" | "live" | "ended";

/** The SDK's hooks require a ConversationProvider ancestor — the default
 *  export wraps the actual page so useConversation works. */
export default function IeltsTutorLive() {
  return (
    <ConversationProvider>
      <IeltsTutorLiveInner />
    </ConversationProvider>
  );
}

interface TranscriptEntry { role: "emma" | "you"; text: string }

function IeltsTutorLiveInner() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [maxSeconds, setMaxSeconds] = useState(900);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const endedByUserRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const status = trpc.tutor.liveSpeakingStatus.useQuery();

  const conversation = useConversation({
    onConnect: () => { endedByUserRef.current = false; setTranscript([]); setPhase("live"); },
    onDisconnect: (details?: any) => {
      // A normal user hang-up reports reason "user" — that's not an error,
      // so don't show a scary message. Only surface genuine technical drops.
      try {
        const reason = String(details?.reason || details?.message || (typeof details === "string" ? details : "")).toLowerCase();
        const isUserEnd = endedByUserRef.current || reason === "user" || reason.includes("user") || reason === "agent" || reason === "";
        if (!isUserEnd) {
          console.error("[LiveSpeaking] disconnect reason:", details);
          setErrorMsg(`Panggilan terputus karena masalah teknis: ${String(details?.reason || details?.message || "unknown").slice(0, 200)}. Coba mulai lagi.`);
        }
      } catch { /* ignore */ }
      setPhase(p => (p === "live" || p === "connecting" ? "ended" : p));
    },
    onError: (message: any) => {
      console.error("[LiveSpeaking] conversation error:", message);
      const raw = typeof message === "string" ? message : (message?.message || JSON.stringify(message));
      setErrorMsg(`Error teknis: ${String(raw).slice(0, 400)}`);
      setPhase("ended");
    },
    // Live transcript: the SDK emits a message per completed utterance from
    // either side. Append it so the student can READ Emma's questions (huge
    // for Part 2 cue cards) and see their own answers transcribed.
    onMessage: (msg: any) => {
      try {
        const source = msg?.source || msg?.role;   // "ai"/"agent" vs "user"
        const text = (msg?.message ?? msg?.text ?? "").toString().trim();
        if (!text) return;
        const role: "emma" | "you" = (source === "user" || source === "human") ? "you" : "emma";
        setTranscript(prev => {
          // Coalesce consecutive same-role fragments into one bubble.
          const last = prev[prev.length - 1];
          if (last && last.role === role) {
            const merged = [...prev];
            merged[merged.length - 1] = { role, text: `${last.text} ${text}`.trim() };
            return merged;
          }
          return [...prev, { role, text }];
        });
      } catch { /* non-critical */ }
    },
  });
  const muted = conversation.isMuted;

  // Auto-scroll the transcript to the newest line.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript]);

  const start = trpc.tutor.liveSpeakingStart.useMutation({
    onSuccess: (d) => {
      setMaxSeconds(d.maxSeconds);
      setSecondsLeft(d.maxSeconds);
      setRemaining(d.remaining);
      // startSession is fire-and-forget in this SDK version; connection
      // outcome arrives via onConnect / onError callbacks above.
      conversation.startSession({ signedUrl: d.signedUrl });
    },
    onError: (e) => {
      setErrorMsg(e.message);
      setPhase("intro");
    },
  });

  const beginCall = async () => {
    setErrorMsg(null);
    setPhase("connecting");
    try {
      // Ask for the mic BEFORE burning a session slot — if the student
      // denies permission we bail out with zero quota used.
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMsg("Kami butuh akses mikrofon untuk sesi live. Izinkan akses mic di browser lalu coba lagi.");
      setPhase("intro");
      return;
    }
    start.mutate();
  };

  const endCall = () => {
    endedByUserRef.current = true; // mark hang-up as intentional (no error msg)
    try { conversation.endSession(); } catch { /* already closed */ }
    setPhase("ended");
  };

  // Countdown timer during live phase.
  useEffect(() => {
    if (phase !== "live") {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          // Server enforces the real cap; this just ends the UI cleanly.
          try { conversation.endSession(); } catch { /* already closed */ }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Mic mute toggle — native to the SDK in this version.
  const toggleMute = () => conversation.setMuted(!conversation.isMuted);

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const timeDanger = secondsLeft <= 60;

  // ── INTRO / GATE ────────────────────────────────────────────────────
  if (phase === "intro") {
    const st = status.data;
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <Navigation />
        <main className="max-w-xl mx-auto p-4 pt-24 pb-16">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">📞</div>
            <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: PINK }}>SpecTa AI Tutor · Live</div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mb-2">
              🎉 GRATIS selama Beta
            </div>
            <h1 className="text-3xl font-black text-slate-900 leading-tight">
              Latihan Speaking<br />
              <span style={{ background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>langsung ngobrol.</span>
            </h1>
            <p className="text-slate-600 mt-3">
              15 menit percakapan real-time dengan Emma — partner AI kamu. Natural seperti telepon: kamu bicara, dia jawab, tanya balik, dan koreksi grammar kamu langsung.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6">
            <ul className="space-y-3 text-sm text-slate-700 mb-6">
              <li className="flex gap-3"><MessageCircle className="w-5 h-5 shrink-0" style={{ color: PINK }} /> Percakapan dua arah — kamu juga bisa bertanya apa saja soal IELTS</li>
              <li className="flex gap-3"><GraduationCap className="w-5 h-5 shrink-0" style={{ color: PURPLE }} /> Dipandu gaya Part 1 → 2 → 3 seperti tes asli</li>
              <li className="flex gap-3"><Sparkles className="w-5 h-5 shrink-0 text-amber-500" /> Koreksi grammar halus di tengah percakapan</li>
              <li className="flex gap-3"><Clock className="w-5 h-5 shrink-0 text-slate-400" /> 15 menit per sesi · otomatis berakhir</li>
            </ul>

            {status.isLoading ? (
              <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
            ) : st?.allowed ? (
              // Allowed (open beta = anyone, or entitled member) → show call CTA.
              <div className="text-center">
                {typeof (st as any).remaining === "number" && (st as any).limit && (
                  <p className="text-xs text-slate-500 mb-3">Sisa kuota: <strong>{(st as any).remaining}</strong> dari {(st as any).limit} sesi / 14 hari</p>
                )}
                <button
                  onClick={beginCall}
                  disabled={start.isPending}
                  className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-3 shadow-lg transition-transform hover:scale-[1.01]"
                  style={{ background: `linear-gradient(90deg, ${PINK}, ${PURPLE})` }}
                >
                  <Phone className="w-6 h-6" /> Mulai Panggilan
                </button>
                <p className="text-[11px] text-slate-400 mt-3 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Kami akan minta izin mikrofon — percakapan hanya untuk penilaian kamu.
                </p>
              </div>
            ) : st?.reason === "subscription" ? (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-3">Live speaking practice adalah fitur premium untuk pelanggan AI Tutor.</p>
                <a href="/ielts/tutor" className="inline-block px-6 py-3 rounded-xl text-white font-semibold" style={{ background: PURPLE }}>Lihat Paket AI Tutor →</a>
              </div>
            ) : st?.reason === "limit" ? (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-1">Kuota live session kamu sudah terpakai.</p>
                <p className="text-xs text-slate-500">Kuota reset otomatis. Butuh lebih? <a href="https://wa.me/62818218388" className="underline font-semibold" style={{ color: PINK }}>WhatsApp admin</a>.</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-3">Masuk dulu untuk mulai latihan live.</p>
                <a href="/ielts/tutor" className="inline-block px-6 py-3 rounded-xl text-white font-semibold" style={{ background: PINK }}>Masuk / Daftar di AI Tutor →</a>
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{errorMsg}</div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── CONNECTING ──────────────────────────────────────────────────────
  if (phase === "connecting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: PINK }} />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl" style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}>📞</div>
          </div>
          <h2 className="text-xl font-bold">Menghubungkan ke Emma…</h2>
          <p className="text-purple-200 text-sm mt-2">Siapkan dirimu — percakapan dimulai sebentar lagi.</p>
        </div>
      </div>
    );
  }

  // ── LIVE CALL ───────────────────────────────────────────────────────
  if (phase === "live") {
    const agentSpeaking = conversation.isSpeaking;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col p-4">
        {/* ── Header: timer + compact Emma status ── */}
        <div className="flex items-center justify-between max-w-2xl mx-auto w-full pt-2">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11">
              {agentSpeaking && <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: PINK }} />}
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}>👩🏻‍🏫</div>
            </div>
            <div>
              <div className="text-white font-bold leading-tight">Emma</div>
              <div className="text-[11px] text-purple-200 flex items-center gap-1">
                {agentSpeaking
                  ? <><Volume2 className="w-3 h-3 animate-pulse" /> sedang bicara…</>
                  : <><Mic className="w-3 h-3" style={{ color: "#4ade80" }} /> giliran kamu</>}
              </div>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold tabular-nums flex items-center gap-1.5
            ${timeDanger ? "bg-red-500/20 text-red-300" : "bg-white/10 text-purple-100"}`}>
            <Clock className={`w-4 h-4 ${timeDanger ? "animate-pulse" : ""}`} />
            {mmss(secondsLeft)}
          </div>
        </div>

        {/* ── Live transcript — read Emma's questions + your answers ── */}
        <div className="flex-1 max-w-2xl mx-auto w-full my-4 min-h-0">
          <div className="h-full bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4 overflow-y-auto">
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-purple-300/70 px-6">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">Percakapan akan muncul di sini saat kamu dan Emma bicara.</p>
                <p className="text-xs mt-2 text-purple-300/50">Kamu bisa <strong>membaca</strong> setiap pertanyaan Emma sambil mendengarkan — terutama berguna untuk cue card Part 2.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transcript.map((t, i) => (
                  <div key={i} className={`flex ${t.role === "you" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                      ${t.role === "you"
                        ? "bg-white/15 text-white rounded-br-sm"
                        : "bg-white text-slate-800 rounded-bl-sm"}`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${t.role === "you" ? "text-purple-200" : "text-pink-600"}`}>
                        {t.role === "you" ? "Kamu" : "Emma"}
                      </div>
                      {t.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex items-center justify-center gap-4 pb-2">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition
              ${muted ? "bg-amber-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/40 transition"
            aria-label="End call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    );
  }

  // ── ENDED ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <Navigation />
      <main className="max-w-xl mx-auto p-4 pt-24 pb-16">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-black text-slate-900">Sesi selesai!</h1>
          <p className="text-slate-600 mt-2 text-sm">
            Kerja bagus! Latihan konsisten seperti ini adalah cara tercepat menaikkan band Speaking kamu.
          </p>
          {typeof remaining === "number" && (
            <p className="text-xs text-slate-500 mt-3">Sisa kuota live session: <strong>{remaining}</strong> / 14 hari ke depan</p>
          )}
          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">{errorMsg}</div>
          )}
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <a href="/ielts/tutor" className="px-5 py-3 rounded-xl text-white font-semibold text-sm" style={{ background: PURPLE }}>
              ← Kembali ke AI Tutor
            </a>
            <button
              onClick={() => { setPhase("intro"); setErrorMsg(null); status.refetch(); }}
              className="px-5 py-3 rounded-xl font-semibold text-sm border-2"
              style={{ borderColor: PINK, color: PINK }}
            >
              Mulai sesi lagi
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
