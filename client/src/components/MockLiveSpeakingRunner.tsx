/**
 * MockLiveSpeakingRunner — the LIVE Speaking section of the IELTS Mock Test.
 *
 * A real-time call with the examiner agent that runs exactly like the real
 * IELTS Speaking test: Part 1 → Part 2 (cue card, 1-minute prep, 1–2 minute
 * long turn) → Part 3 → the examiner closes the test and the call ends on
 * its own. No feedback is shown — marking happens afterwards and appears
 * only in the final mock report / PDF.
 *
 * This component runs the clocks (the examiner agent can't keep time on its
 * own) and nudges the examiner with "[SYSTEM] …" messages at each boundary.
 * It also records the candidate's microphone for the whole test so
 * Pronunciation can be marked from the actual audio, and submits the
 * transcript + recording when the test ends (by the examiner, the hard time
 * cap, an early exit, or a dropped connection — whichever comes first).
 */

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { trpc } from "@/lib/trpc";
import { Loader2, Mic, MicOff, Clock, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";

const PART1_LIMIT_S = 300;   // ~4–5 min
const PREP_S = 60;           // Part 2 preparation (real test: 1 minute)
const TALK_S = 120;          // Part 2 long turn (real test: up to 2 minutes)
const PART3_LIMIT_S = 300;   // ~4–5 min

type Phase = "lobby" | "connecting" | "live" | "submitting" | "error";
interface Turn { role: "examiner" | "student"; part: 1 | 2 | 3; text: string }

export default function MockLiveSpeakingRunner(props: { token: string; onFinished: () => void }) {
  return (
    <ConversationProvider>
      <RunnerInner {...props} />
    </ConversationProvider>
  );
}

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const c of candidates) {
    try { if ((MediaRecorder as any).isTypeSupported?.(c)) return c; } catch { /* */ }
  }
  return "audio/webm";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

function RunnerInner({ token, onFinished }: { token: string; onFinished: () => void }) {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [part, setPart] = useState<1 | 2 | 3>(1);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [cueCard, setCueCard] = useState<string | null>(null);
  const [prepLeft, setPrepLeft] = useState<number | null>(null);
  const [talkLeft, setTalkLeft] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [maxSeconds, setMaxSeconds] = useState(900);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const partRef = useRef<1 | 2 | 3>(1);
  const transcriptRef = useRef<Turn[]>([]);
  const submittedRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const endedByTestRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const pendingRef = useRef<any>(null); // last payload, for retry after a failed submit
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [transcript]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout); timersRef.current = [];
    intervalsRef.current.forEach(clearInterval); intervalsRef.current = [];
  };
  const after = (ms: number, fn: () => void) => { const t = setTimeout(fn, ms); timersRef.current.push(t); return t; };
  const every = (ms: number, fn: () => void) => { const i = setInterval(fn, ms); intervalsRef.current.push(i); return i; };
  useEffect(() => () => { clearTimers(); stopRecorder().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startLive = trpc.ielts.startLiveSpeaking.useMutation();
  const finishLive = trpc.ielts.finishLiveSpeaking.useMutation({
    onSuccess: () => onFinished(),
    onError: (e) => { setErrorMsg(e.message); setPhase("error"); },
  });

  // ── Recording (candidate mic only) ──
  async function startRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: pickMimeType(), audioBitsPerSecond: 32000 });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(1000);
      recorderRef.current = mr;
    } catch (e) {
      console.warn("[MockSpeaking] recorder unavailable:", (e as Error).message);
    }
  }
  function stopRecorder(): Promise<Blob | null> {
    return new Promise(resolve => {
      const mr = recorderRef.current;
      const finish = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: mr?.mimeType || "audio/webm" }) : null;
        resolve(blob);
      };
      if (!mr || mr.state === "inactive") return finish();
      mr.onstop = finish;
      try { mr.stop(); } catch { finish(); }
    });
  }

  // ── Part clocks + examiner nudges ──
  const nudge = (text: string) => { try { conversation.sendUserMessage(text); } catch { /* */ } };

  function beginPart(p: 1 | 2 | 3) {
    if (p < partRef.current) return;
    partRef.current = p; setPart(p);
    if (p === 1) {
      after(PART1_LIMIT_S * 1000, () => { if (partRef.current === 1) nudge("[SYSTEM] Part 1 time is over. Move to Part 2 now."); });
    }
    if (p === 3) {
      setCueCard(null); setPrepLeft(null); setTalkLeft(null);
      after(PART3_LIMIT_S * 1000, () => { if (partRef.current === 3) nudge("[SYSTEM] Part 3 time is over. End the test now."); });
    }
  }

  function showCueCard(text: string) {
    if (partRef.current < 2) beginPart(2);
    setCueCard(text);
    // Preparation: mute the mic so silence/notes don't confuse turn-taking,
    // count down 60s, then tell the examiner to invite the candidate to speak.
    try { conversation.setMuted(true); } catch { /* */ }
    // Tell the examiner prep has started (context only — doesn't trigger a
    // reply) so she holds her silence for the full minute.
    try {
      conversation.sendContextualUpdate(
        "PREPARATION TIME has started: the candidate is silently preparing for one minute. Do not speak until you receive '[SYSTEM] Preparation time is over'."
      );
    } catch { /* */ }
    let left = PREP_S; setPrepLeft(left);
    const iv = every(1000, () => {
      left -= 1; setPrepLeft(left);
      if (left <= 0) {
        clearInterval(iv);
        setPrepLeft(null);
        try { conversation.setMuted(false); } catch { /* */ }
        nudge("[SYSTEM] Preparation time is over. Ask the candidate to begin speaking now.");
        let talk = TALK_S; setTalkLeft(talk);
        const iv2 = every(1000, () => {
          talk -= 1; setTalkLeft(talk);
          if (talk <= 0) {
            clearInterval(iv2);
            setTalkLeft(null);
            nudge("[SYSTEM] Two minutes are up. Stop the candidate politely, ask one short rounding-off question, then move to Part 3.");
          }
        });
      }
    });
  }

  // ── Submit (once) ──
  async function submit(reason: string) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearTimers();
    setPhase("submitting");
    const blob = await stopRecorder();
    let audioBase64: string | undefined;
    let audioMimeType: string | undefined;
    if (blob && blob.size > 2000) {
      try { audioBase64 = await blobToBase64(blob); audioMimeType = blob.type || "audio/webm"; } catch { /* */ }
    }
    const payload = {
      token,
      conversationId: conversationIdRef.current || undefined,
      transcript: transcriptRef.current.slice(0, 300).map(t => ({ role: t.role, part: t.part, text: t.text.slice(0, 6000) })),
      audioBase64,
      audioMimeType,
      endReason: reason,
    };
    pendingRef.current = payload;
    finishLive.mutate(payload);
  }

  const conversation = useConversation({
    clientTools: {
      start_part: (p: any) => { const n = Number(p?.part); if (n === 1 || n === 2 || n === 3) beginPart(n); },
      show_cue_card: (p: any) => { const t = String(p?.text || "").trim(); if (t) showCueCard(t); },
      finish_test: () => {
        endedByTestRef.current = true;
        try { conversation.endSession(); } catch { /* */ }
        void submit("examiner_finished");
      },
    },
    onConnect: () => {
      submittedRef.current = false;
      endedByTestRef.current = false;
      try { conversationIdRef.current = conversation.getId(); } catch { /* */ }
      setPhase("live");
      void startRecorder();
      // Elapsed clock + hard cap (server enforces the real cap; this ends the UI cleanly).
      let s = 0;
      every(1000, () => {
        s += 1; setElapsed(s);
        if (s >= maxSeconds) { try { conversation.endSession(); } catch { /* */ } }
      });
      beginPart(1);
    },
    onDisconnect: () => {
      // Whatever ended the call, submit what we have (examiner close, time cap, drop).
      void submit(endedByTestRef.current ? "examiner_finished" : "disconnected");
    },
    onError: (message: any) => {
      const raw = typeof message === "string" ? message : (message?.message || JSON.stringify(message));
      console.error("[MockSpeaking] conversation error:", raw);
      if (transcriptRef.current.some(t => t.role === "student")) {
        void submit("error");
      } else {
        setErrorMsg(`Connection error: ${String(raw).slice(0, 300)}`);
        setPhase("error");
      }
    },
    onMessage: (msg: any) => {
      try {
        const source = msg?.source || msg?.role;
        const text = (msg?.message ?? msg?.text ?? "").toString().trim();
        if (!text) return;
        const role: "examiner" | "student" = (source === "user" || source === "human") ? "student" : "examiner";
        // Fallback part detection if the examiner's tools aren't available.
        if (role === "examiner") {
          if (partRef.current < 2 && /\bpart\s*(two|2)\b/i.test(text)) beginPart(2);
          else if (partRef.current < 3 && /\bpart\s*(three|3)\b/i.test(text)) beginPart(3);
        }
        setTranscript(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === role && last.part === partRef.current) {
            const merged = [...prev];
            merged[merged.length - 1] = { ...last, text: `${last.text} ${text}`.trim() };
            return merged;
          }
          return [...prev, { role, part: partRef.current, text }];
        });
      } catch { /* */ }
    },
  });

  async function begin() {
    setErrorMsg(null);
    setPhase("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMsg("We need microphone access for the Speaking test. Allow the mic in your browser and try again.");
      setPhase("lobby");
      return;
    }
    startLive.mutate({ token }, {
      onSuccess: (d) => {
        setMaxSeconds(d.maxSeconds);
        conversation.startSession({ signedUrl: d.signedUrl, dynamicVariables: d.dynamicVariables });
      },
      onError: (e) => { setErrorMsg(e.message); setPhase("lobby"); },
    });
  }

  function endEarly() {
    setConfirmEnd(false);
    endedByTestRef.current = true;
    try { conversation.endSession(); } catch { /* */ }
    void submit("ended_early");
  }

  // ── LOBBY ──
  if (phase === "lobby") {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="text-xs uppercase tracking-wider text-blue-700 font-semibold mb-1">Speaking · Live examiner</div>
        <h1 className="text-xl font-semibold mb-2">IELTS Speaking test</h1>
        <p className="text-sm text-slate-600 mb-4">
          You'll have a live conversation with your examiner, Emma — exactly like the real test.
        </p>
        <ul className="text-sm text-slate-700 space-y-1.5 mb-4">
          <li><strong>Part 1</strong> — questions about you (4–5 min)</li>
          <li><strong>Part 2</strong> — a cue card: 1 minute to prepare, then speak for 1–2 minutes</li>
          <li><strong>Part 3</strong> — a discussion on the Part 2 topic (4–5 min)</li>
        </ul>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-5">
          <strong>This is a test, not practice:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-900/80">
            <li>The examiner will not correct you or give feedback.</li>
            <li>Just speak — no buttons to press. It is timed.</li>
            <li>The test ends automatically. Your marks appear in your final report.</li>
          </ul>
        </div>
        {errorMsg && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{errorMsg}</div>}
        <button
          onClick={begin}
          disabled={startLive.isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 rounded-lg transition shadow flex items-center justify-center gap-2"
        >
          {startLive.isPending ? "Connecting…" : "Start Speaking test"} <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[11px] text-slate-400 mt-3 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> We'll ask for microphone access. Your answers are recorded for marking only.
        </p>
      </div>
    );
  }

  // ── CONNECTING ──
  if (phase === "connecting") {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
        <div className="font-semibold">Connecting to your examiner…</div>
        <div className="text-sm text-slate-500 mt-1">The test begins in a moment.</div>
      </div>
    );
  }

  // ── SUBMITTING ──
  if (phase === "submitting") {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
        <div className="font-semibold">That's the end of the Speaking test.</div>
        <div className="text-sm text-slate-500 mt-1">Submitting and marking your test — this takes up to a minute. Please don't close this page.</div>
      </div>
    );
  }

  // ── ERROR ──
  if (phase === "error") {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
          <div>
            <h1 className="text-lg font-semibold mb-1">Something went wrong</h1>
            <p className="text-sm text-slate-600">{errorMsg}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {pendingRef.current && (
            <button
              onClick={() => { setErrorMsg(null); setPhase("submitting"); finishLive.mutate(pendingRef.current); }}
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold"
            >
              Retry submitting
            </button>
          )}
          {!pendingRef.current && (
            <button
              onClick={() => { setErrorMsg(null); submittedRef.current = false; setTranscript([]); setPhase("lobby"); }}
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── LIVE TEST ──
  const speaking = conversation.isSpeaking;
  const muted = conversation.isMuted;
  const left = Math.max(0, maxSeconds - elapsed);
  return (
    <div className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden flex flex-col" style={{ height: "min(100dvh - 120px, 720px)" }}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            {speaking && <div className="absolute inset-0 rounded-full animate-ping bg-blue-500 opacity-30" />}
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold">E</div>
          </div>
          <div>
            <div className="font-semibold leading-tight">Emma · Examiner</div>
            <div className="text-[11px] text-slate-300 flex items-center gap-1">
              {speaking ? <>speaking…</> : <><Mic className="w-3 h-3 text-emerald-400" /> your turn</>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-blue-300 font-semibold">Part {part}</div>
          <div className={`text-sm font-bold tabular-nums flex items-center gap-1 justify-end ${left <= 60 ? "text-red-300" : "text-slate-200"}`}>
            <Clock className="w-3.5 h-3.5" /> {mmss(left)}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 mt-2 text-center text-[12px] text-slate-300/90">
        Just speak — no need to press anything. Emma is listening.
      </div>

      {/* Cue card (Part 2) */}
      {cueCard && (
        <div className="shrink-0 mx-4 mt-3 bg-amber-50 text-slate-900 rounded-xl p-4 border-2 border-amber-300">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700">Part 2 · Cue card</div>
            {prepLeft !== null && <div className="text-xs font-bold text-amber-800">Prepare: {mmss(prepLeft)}</div>}
            {talkLeft !== null && <div className="text-xs font-bold text-emerald-700">Speak: {mmss(talkLeft)}</div>}
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{cueCard}</div>
          {prepLeft !== null && <div className="text-[11px] text-amber-700 mt-2">Your mic is off while you prepare. You can make notes.</div>}
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 min-h-0 mx-4 my-3 bg-white/5 rounded-xl border border-white/10 p-3 overflow-y-auto">
        {transcript.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 text-center px-4">The conversation will appear here.</div>
        ) : (
          <div className="space-y-2">
            {transcript.map((t, i) => (
              <div key={i} className={`flex ${t.role === "student" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${t.role === "student" ? "bg-white/15 text-white" : "bg-white text-slate-800"}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${t.role === "student" ? "text-slate-300" : "text-blue-600"}`}>
                    {t.role === "student" ? "You" : "Emma"}
                  </div>
                  {t.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-end justify-center gap-6 pb-4">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => conversation.setMuted(!muted)}
            disabled={prepLeft !== null}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition ${muted ? "bg-amber-500" : "bg-white/10 hover:bg-white/20"} disabled:opacity-50`}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <span className="text-[11px] text-slate-300">{muted ? "Muted" : "Mute"}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          {confirmEnd ? (
            <div className="flex items-center gap-2">
              <button onClick={endEarly} className="px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold">Yes, end now</button>
              <button onClick={() => setConfirmEnd(false)} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmEnd(true)} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs">
              End test early
            </button>
          )}
          <span className="text-[11px] text-slate-400">the test ends by itself</span>
        </div>
      </div>
    </div>
  );
}
