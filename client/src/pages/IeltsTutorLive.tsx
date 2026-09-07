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
  HelpCircle, ExternalLink, ArrowUpRight,
} from "lucide-react";

const PINK = "#E91E8C";
const PURPLE = "#9C27B0";

type Phase = "intro" | "connecting" | "live" | "ended";
/** Which agent this call is with: the IELTS examiner, or the SpecTa concierge. */
type Mode = "ielts" | "concierge";
/** Concierge voice/persona the student picked. */
type Persona = "emma" | "arron";

interface LinkCard { title: string; url: string; subtitle?: string }

/** Turn a tool-provided url into a safe href. Allows same-site relative paths
 *  and https/wa.me/mailto/tel; anything else (javascript:, data:, etc.) is
 *  dropped. Returns null if unsafe. */
function safeHref(raw: string): string | null {
  const u = (raw || "").trim();
  if (!u) return null;
  if (u.startsWith("/")) return u;                       // same-site path
  if (/^https:\/\//i.test(u)) return u;                  // https only
  if (/^(mailto:|tel:)/i.test(u)) return u;
  if (/^wa\.me\//i.test(u)) return `https://${u}`;
  if (/^(www\.)?spectaeducation\./i.test(u)) return `https://${u}`;
  return null;
}
const isExternal = (href: string) => /^https?:/i.test(href);

// ── Concierge memory (per-browser, no login) ──────────────────────────────
// The concierge agents call the `remember_user` tool once they learn who
// they're talking to; we persist it here so a returning student is greeted by
// name and doesn't start from scratch. Shared between Emma & Arron (same
// student). localStorage may be unavailable (private mode) — always guarded.
const CONCIERGE_MEMORY_KEY = "specta_concierge_memory_v1";
interface ConciergeMemory { name?: string; interest?: string; updatedAt?: number }

function readConciergeMemory(): ConciergeMemory {
  try { const raw = localStorage.getItem(CONCIERGE_MEMORY_KEY); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}
function writeConciergeMemory(patch: Partial<ConciergeMemory>) {
  try {
    const next = { ...readConciergeMemory(), ...patch, updatedAt: Date.now() };
    localStorage.setItem(CONCIERGE_MEMORY_KEY, JSON.stringify(next));
  } catch { /* storage unavailable — memory just won't persist */ }
}

/** The spoken opening line, personalized from memory. New users get a warm
 *  persona-flavored intro; returning users get greeted by name (no re-intro). */
function buildOpeningLine(persona: Persona, mem: ConciergeMemory): string {
  const name = (mem.name || "").trim();
  const interest = (mem.interest || "").trim();
  if (name) {
    if (persona === "arron") {
      return interest
        ? `Yoo ${name}, balik lagi nih! Asik! Kemarin kita sempat ngobrolin soal ${interest} — mau lanjut, atau ada hal lain yang mau kamu tanyain?`
        : `Yoo ${name}, balik lagi nih! Seneng banget! Ada yang bisa aku bantuin hari ini?`;
    }
    return interest
      ? `Halo lagi, ${name}! Seneng kamu balik ngobrol sama aku. Terakhir kita sempat bahas soal ${interest} — mau lanjut, atau ada hal lain yang mau kamu tanyain?`
      : `Halo lagi, ${name}! Seneng kamu balik ngobrol sama aku. Ada yang bisa aku bantu hari ini?`;
  }
  if (persona === "arron") {
    return "Haloo! Aku Arron dari SpecTa Education, seneng banget bisa ngobrol bareng kamu! Kamu bisa tanya apa aja ke aku — soal IELTS, tes minat bakat, IQ, atau rencana kuliah ke luar negeri. Jadi, ada yang pengen kamu tanyain hari ini?";
  }
  return "Halo, selamat datang di SpecTa Education! Aku Emma, asisten kamu di sini, dan aku senang bisa ngobrol sama kamu. Aku siap bantu jawab apa aja — mulai dari IELTS, tes minat dan bakat, IQ, sampai rencana kuliah ke luar negeri. Jadi, ada yang bisa aku bantu hari ini?";
}

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
  const [assessment, setAssessment] = useState<any>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("ielts");
  const [persona, setPersona] = useState<Persona>("emma");
  const [links, setLinks] = useState<LinkCard[]>([]);
  const [mem, setMem] = useState<ConciergeMemory>({});
  const modeRef = useRef<Mode>("ielts");
  const endedByUserRef = useRef(false);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const assessedRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const status = trpc.tutor.liveSpeakingStatus.useQuery();

  const assess = trpc.tutor.liveSpeakingAssess.useMutation({
    retry: 1,               // recover from a transient timeout before giving up
    retryDelay: 1500,
    onSuccess: (d) => setAssessment(d),
    onError: () => setAssessment({ __failed: true }),
  });

  // Keep a ref copy of the transcript so we can read the final version at
  // hang-up time without stale-closure issues.
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // Refresh the shown "remembered as" name whenever we land back on the intro
  // (e.g. after a call where the agent called remember_user).
  useEffect(() => { if (phase === "intro" || phase === "ended") setMem(readConciergeMemory()); }, [phase]);

  // Jump to the top when the results/recap screen opens, so the score is right
  // there instead of leaving the student scrolled where the call controls were.
  useEffect(() => { if (phase === "ended") window.scrollTo(0, 0); }, [phase]);

  // When the call ends, fire the assessment ONCE using the captured transcript.
  // Only the IELTS examiner call produces a band report — the concierge call
  // is a Q&A, so it has no assessment.
  const runAssessment = () => {
    if (modeRef.current === "concierge") return;
    if (assessedRef.current) return;
    assessedRef.current = true;
    const t = transcriptRef.current;
    const studentTurns = t.filter(x => x.role === "you").length;
    if (studentTurns === 0) { setAssessment({ __empty: true }); return; }
    assess.mutate({ sessionId, transcript: t.map(x => ({ role: x.role, text: x.text.slice(0, 4000) })).slice(0, 200) });
  };

  const conversation = useConversation({
    // Client tool: the concierge Emma calls show_link to surface a clickable
    // card for a SpecTa page she mentions. Fire-and-forget (returns void).
    clientTools: {
      show_link: (p: any) => {
        try {
          const url = String(p?.url || "").trim();
          const title = String(p?.title || "Buka halaman").trim();
          const subtitle = p?.subtitle ? String(p.subtitle).trim() : undefined;
          if (!url || !safeHref(url)) return;
          setLinks(prev => (prev.some(l => l.url === url) ? prev : [...prev, { title, url, subtitle }]));
        } catch { /* non-critical */ }
      },
      // Persist who we're talking to so returning students are remembered.
      remember_user: (p: any) => {
        try {
          const name = p?.name ? String(p.name).trim().slice(0, 60) : undefined;
          const interest = p?.interest ? String(p.interest).trim().slice(0, 120) : undefined;
          if (name || interest) writeConciergeMemory({ ...(name ? { name } : {}), ...(interest ? { interest } : {}) });
        } catch { /* non-critical */ }
      },
    },
    onConnect: () => { endedByUserRef.current = false; assessedRef.current = false; setAssessment(null); setTranscript([]); setPhase("live"); },
    onDisconnect: (details?: any) => {
      runAssessment(); // fire the assessment the moment the call ends
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
      setSessionId(d.sessionId ?? null);
      // startSession is fire-and-forget in this SDK version; connection
      // outcome arrives via onConnect / onError callbacks above.
      conversation.startSession({ signedUrl: d.signedUrl });
    },
    onError: (e) => {
      setErrorMsg(e.message);
      setPhase("intro");
    },
  });

  const conciergeStart = trpc.tutor.conciergeStart.useMutation({
    onSuccess: (d) => {
      setMaxSeconds(d.maxSeconds);
      setSecondsLeft(d.maxSeconds);
      setRemaining(null);
      setSessionId(null);
      // Personalize from memory: greet returning students by name, and pass
      // known_name/known_interest so the agent doesn't re-ask. These resolve
      // the {{opening_line}} / {{known_name}} / {{known_interest}} placeholders
      // baked into the agent config.
      const mem = readConciergeMemory();
      const p: Persona = (d.persona as Persona) || "emma";
      conversation.startSession({
        signedUrl: d.signedUrl,
        dynamicVariables: {
          opening_line: buildOpeningLine(p, mem),
          known_name: (mem.name || "").trim() || "kosong",
          known_interest: (mem.interest || "").trim() || "kosong",
        },
      });
    },
    onError: (e) => {
      setErrorMsg(e.message);
      setPhase("intro");
    },
  });

  /** Start a call. `m` selects the agent; `p` picks the concierge voice. */
  const beginCall = async (m: Mode, p: Persona = "emma") => {
    setErrorMsg(null);
    setMode(m);
    modeRef.current = m;
    setPersona(p);
    setLinks([]);
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
    if (m === "concierge") conciergeStart.mutate({ persona: p });
    else start.mutate();
  };

  const endCall = () => {
    endedByUserRef.current = true; // mark hang-up as intentional (no error msg)
    try { conversation.endSession(); } catch { /* already closed */ }
    runAssessment();
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

  // Who the student is talking to (name + avatar) for the call UI.
  const callName = mode === "concierge" ? (persona === "arron" ? "Arron" : "Emma") : "Emma";
  const callEmoji = mode === "concierge" ? (persona === "arron" ? "🧑🏻‍💼" : "💁🏻‍♀️") : "👩🏻‍🏫";

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
                  onClick={() => beginCall("ielts")}
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

          {/* ── Concierge test card (internal QA only) ── */}
          <div className="mt-5 bg-white rounded-3xl shadow-xl border-2 border-dashed border-indigo-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">Tes Internal</span>
              <span className="text-[10px] text-slate-400">belum dipublikasikan</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-xl shadow" style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}>💬</div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-900 leading-tight">Tanya SpecTa — pilih siapa yang mau kamu ajak ngobrol</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Tanya apa saja soal SpecTa: IELTS, tes aptitude, IQ, kuliah ke luar negeri, harga, atau cara daftar. Dijawab pakai suara (Bahasa Indonesia) + kasih link yang bisa langsung kamu klik.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => beginCall("concierge", "emma")}
                disabled={conciergeStart.isPending}
                className="rounded-2xl p-4 text-white font-black flex flex-col items-center gap-1.5 shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #E91E8C, #9C27B0)" }}
              >
                <span className="text-3xl">💁🏻‍♀️</span>
                <span className="text-base">Emma</span>
                <span className="text-[11px] font-medium opacity-90">suara perempuan</span>
              </button>
              <button
                onClick={() => beginCall("concierge", "arron")}
                disabled={conciergeStart.isPending}
                className="rounded-2xl p-4 text-white font-black flex flex-col items-center gap-1.5 shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #4f46e5, #0ea5e9)" }}
              >
                <span className="text-3xl">🧑🏻‍💼</span>
                <span className="text-base">Arron</span>
                <span className="text-[11px] font-medium opacity-90">suara laki-laki</span>
              </button>
            </div>
            {mem.name ? (
              <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-center gap-2">
                <span>👋 Kamu dikenali sebagai <strong>{mem.name}</strong>{mem.interest ? ` · ${mem.interest}` : ""}</span>
                <button
                  onClick={() => { try { localStorage.removeItem(CONCIERGE_MEMORY_KEY); } catch { /* */ } setMem({}); }}
                  className="underline text-slate-400 hover:text-slate-600"
                >
                  Lupakan
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-3 text-center flex items-center justify-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Untuk evaluasi tim — sebelum diputuskan tayang di homepage.
              </p>
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
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl" style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}>{callEmoji}</div>
          </div>
          <h2 className="text-xl font-bold">Menghubungkan ke {callName}…</h2>
          <p className="text-purple-200 text-sm mt-2">Siapkan dirimu — percakapan dimulai sebentar lagi.</p>
        </div>
      </div>
    );
  }

  // ── LIVE CALL ───────────────────────────────────────────────────────
  if (phase === "live") {
    const agentSpeaking = conversation.isSpeaking;
    return (
      // Fixed dynamic-viewport height + hidden overflow: header and controls
      // stay pinned, only the transcript scrolls — so End call is always in view.
      <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col p-4">
        {/* ── Header: name + status + timer ── */}
        <div className="shrink-0 flex items-center justify-between max-w-2xl mx-auto w-full pt-2">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11">
              {agentSpeaking && <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: PINK }} />}
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}>{callEmoji}</div>
            </div>
            <div>
              <div className="text-white font-bold leading-tight">{callName}</div>
              <div className="text-[11px] text-purple-200 flex items-center gap-1">
                {agentSpeaking
                  ? <><Volume2 className="w-3 h-3 animate-pulse" /> speaking…</>
                  : <><Mic className="w-3 h-3" style={{ color: "#4ade80" }} /> your turn</>}
              </div>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold tabular-nums flex items-center gap-1.5
            ${timeDanger ? "bg-red-500/20 text-red-300" : "bg-white/10 text-purple-100"}`}>
            <Clock className={`w-4 h-4 ${timeDanger ? "animate-pulse" : ""}`} />
            {mmss(secondsLeft)}
          </div>
        </div>

        {/* ── "Just speak" hint ── */}
        <div className="shrink-0 max-w-2xl mx-auto w-full mt-2 text-center text-[12px] text-purple-200/80 flex items-center justify-center gap-1.5">
          <Mic className="w-3.5 h-3.5" style={{ color: "#4ade80" }} />
          Just speak — no need to press anything. {callName} is always listening.
        </div>

        {/* ── Live transcript — read the questions + your answers ── */}
        <div className="flex-1 max-w-2xl mx-auto w-full my-3 min-h-0">
          <div className="h-full bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4 overflow-y-auto">
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-purple-300/70 px-6">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">Percakapan akan muncul di sini saat kamu dan Emma bicara.</p>
                {mode === "concierge" ? (
                  <p className="text-xs mt-2 text-purple-300/50">Tanya apa saja soal SpecTa — Emma jawab pakai suara dan kasih link yang bisa langsung kamu klik di bawah.</p>
                ) : (
                  <p className="text-xs mt-2 text-purple-300/50">Kamu bisa <strong>membaca</strong> setiap pertanyaan Emma sambil mendengarkan — terutama berguna untuk cue card Part 2.</p>
                )}
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
                        {t.role === "you" ? "Kamu" : callName}
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

        {/* ── Link cards Emma surfaced (concierge mode) ── */}
        {mode === "concierge" && links.length > 0 && (
          <div className="shrink-0 max-w-2xl mx-auto w-full mb-2">
            <div className="text-[11px] uppercase tracking-widest font-bold text-purple-300 mb-1.5 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Link dari Emma
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {links.map((l, i) => {
                const href = safeHref(l.url);
                if (!href) return null;
                const ext = isExternal(href);
                return (
                  <a
                    key={i}
                    href={href}
                    {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="shrink-0 max-w-[220px] bg-white rounded-xl px-3 py-2 shadow hover:shadow-md transition flex items-center gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1">
                        {l.title}{ext && <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />}
                      </div>
                      {l.subtitle && <div className="text-[11px] text-slate-500 truncate">{l.subtitle}</div>}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Controls (pinned) ── */}
        <div className="shrink-0 flex items-end justify-center gap-6 pb-1">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition
                ${muted ? "bg-amber-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <span className="text-[11px] text-purple-200/80">{muted ? "Muted" : "Mute"}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/40 transition"
              aria-label="End call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-[11px] text-purple-200/80">End call</span>
          </div>
        </div>
      </div>
    );
  }

  // ── ENDED — concierge recap (no band report) ────────────────────────
  if (mode === "concierge") {
    const shown = links.map(l => ({ ...l, href: safeHref(l.url) })).filter(l => l.href);
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <Navigation />
        <main className="max-w-xl mx-auto p-4 pt-24 pb-16 space-y-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 text-center">
            <div className="text-4xl mb-2">👋</div>
            <h1 className="text-2xl font-black text-slate-900">Sampai jumpa!</h1>
            <p className="text-slate-600 mt-1 text-sm">Semoga membantu ya! Ini link yang {callName} kasih selama ngobrol.</p>
            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">{errorMsg}</div>
            )}
          </div>

          {shown.length > 0 ? (
            <div className="bg-white rounded-3xl shadow border border-slate-200 p-4 space-y-2">
              {shown.map((l, i) => {
                const ext = isExternal(l.href!);
                return (
                  <a
                    key={i}
                    href={l.href!}
                    {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #4f46e5, #9C27B0)" }}>
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1">{l.title}{ext && <ExternalLink className="w-3 h-3 text-slate-400" />}</div>
                      {l.subtitle && <div className="text-xs text-slate-500 truncate">{l.subtitle}</div>}
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow border border-slate-200 p-6 text-center text-sm text-slate-600">
              {callName} tidak menyematkan link kali ini. Butuh bantuan langsung? <a href="https://wa.me/62818218388" target="_blank" rel="noopener noreferrer" className="underline font-semibold" style={{ color: PINK }}>WhatsApp admin</a>.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button
              onClick={() => beginCall("concierge", persona)}
              className="px-5 py-3 rounded-xl text-white font-semibold text-sm text-center"
              style={{ background: "linear-gradient(90deg, #4f46e5, #9C27B0)" }}
            >
              Tanya {callName} lagi
            </button>
            <button
              onClick={() => { setMode("ielts"); modeRef.current = "ielts"; setPhase("intro"); setErrorMsg(null); setLinks([]); }}
              className="px-5 py-3 rounded-xl font-semibold text-sm border-2"
              style={{ borderColor: PINK, color: PINK }}
            >
              ← Kembali
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── ENDED — IELTS with instant assessment ───────────────────────────
  const bandColor = (b: number) => b >= 7 ? "#10b981" : b >= 6 ? "#6366f1" : b >= 5 ? "#f59e0b" : "#ef4444";
  const a = assessment && !assessment.__failed && !assessment.__empty ? assessment : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <Navigation />
      <main className="max-w-xl mx-auto p-4 pt-24 pb-16 space-y-4">
        {/* Header card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h1 className="text-2xl font-black text-slate-900">Sesi selesai!</h1>
          <p className="text-slate-600 mt-1 text-sm">Kerja bagus! Ini hasil latihanmu bareng Emma.</p>
          {errorMsg && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">{errorMsg}</div>
          )}
        </div>

        {/* Assessment states */}
        {assess.isPending && (
          <div className="bg-white rounded-3xl shadow border border-slate-200 p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-3" />
            <p className="text-sm text-slate-600">Emma sedang menilai speaking kamu…</p>
            <p className="text-xs text-slate-400 mt-1">Estimasi band + koreksi grammar sedang disiapkan.</p>
          </div>
        )}

        {assessment?.__empty && (
          <div className="bg-white rounded-3xl shadow border border-slate-200 p-6 text-center text-sm text-slate-600">
            Percakapan terlalu singkat untuk dinilai. Coba lagi dan bicara lebih banyak — jawab tiap pertanyaan dengan beberapa kalimat!
          </div>
        )}
        {assessment?.__failed && (
          <div className="bg-white rounded-3xl shadow border border-slate-200 p-6 text-center text-sm text-slate-600">
            Penilaian gagal dimuat. Kerja bagus sudah menyelesaikan sesi — coba lagi nanti.
          </div>
        )}

        {a && (
          <>
            {/* Overall band */}
            <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 rounded-3xl p-6 text-center text-white shadow-xl">
              <div className="text-xs uppercase tracking-widest text-purple-300 font-semibold">Estimasi Band Speaking</div>
              <div className="text-6xl font-black my-1" style={{ color: bandColor(a.overallBand) === "#6366f1" ? "#c4b5fd" : bandColor(a.overallBand) }}>{a.overallBand.toFixed(1)}</div>
              <div className="text-[11px] text-purple-300">berdasarkan ~{a.wordCount} kata yang kamu ucapkan</div>
            </div>

            {/* Per-criterion */}
            <div className="bg-white rounded-3xl shadow border border-slate-200 p-6 space-y-4">
              <div className="text-xs uppercase tracking-widest text-purple-600 font-bold">Per Kriteria</div>
              {([
                ["Fluency & Coherence", a.criteria.fluency],
                ["Lexical Resource", a.criteria.lexical],
                ["Grammatical Range & Accuracy", a.criteria.grammar],
              ] as const).map(([label, c]: any, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-800">{label}</span>
                    <span className="text-sm font-black tabular-nums px-2 py-0.5 rounded" style={{ color: bandColor(c.band), background: `${bandColor(c.band)}15` }}>{c.band.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.comment}</p>
                </div>
              ))}
              <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                <span className="text-sm">🔊</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">{a.pronunciationNote}</p>
              </div>
            </div>

            {/* Summary */}
            {a.summary && (
              <div className="bg-white rounded-3xl shadow border border-slate-200 p-6">
                <div className="text-xs uppercase tracking-widest text-purple-600 font-bold mb-2">Ringkasan</div>
                <p className="text-sm text-slate-700 leading-relaxed">{a.summary}</p>
              </div>
            )}

            {/* Grammar corrections */}
            {a.corrections?.length > 0 && (
              <div className="bg-white rounded-3xl shadow border border-slate-200 p-6">
                <div className="text-xs uppercase tracking-widest text-purple-600 font-bold mb-3">Koreksi Grammar</div>
                <div className="space-y-3">
                  {a.corrections.map((c: any, i: number) => (
                    <div key={i} className="text-sm">
                      <span className="line-through text-red-500">{c.original}</span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="text-green-700 font-medium">{c.fixed}</span>
                      {c.note && <div className="text-[11px] text-slate-400 mt-0.5">{c.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {a.strengths?.length > 0 && (
              <div className="bg-white rounded-3xl shadow border border-slate-200 p-6">
                <div className="text-xs uppercase tracking-widest text-green-600 font-bold mb-3">Kekuatan Kamu</div>
                <ul className="space-y-1.5">
                  {a.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700"><span className="text-green-500 font-bold">✓</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Practice plan */}
            {a.improvements?.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 p-6">
                <div className="text-xs uppercase tracking-widest text-indigo-700 font-bold mb-3">Rencana Latihan</div>
                <ul className="space-y-2">
                  {a.improvements.map((s: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700"><span className="text-indigo-500 font-bold">→</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <a href="/ielts/tutor" className="px-5 py-3 rounded-xl text-white font-semibold text-sm text-center" style={{ background: PURPLE }}>
            ← Kembali ke AI Tutor
          </a>
          <button
            onClick={() => { setPhase("intro"); setErrorMsg(null); setAssessment(null); status.refetch(); }}
            className="px-5 py-3 rounded-xl font-semibold text-sm border-2"
            style={{ borderColor: PINK, color: PINK }}
          >
            Mulai sesi lagi
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
