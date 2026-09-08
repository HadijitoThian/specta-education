/**
 * /ielts/tutor/live/writing — Emma's 1-on-1 IELTS Writing Course classroom.
 *
 * 5 sessions × 2 hours. The course record on the server is the student's
 * memory; each session start injects it into Emma. This page is:
 *   - the course overview (progress, homework, start/resume),
 *   - the live classroom: call pane + shared whiteboard + writing pad,
 *   - the break / pause / end screens.
 *
 * Clock: session elapsed time ticks only while the voice call is connected
 * and not on a break; it is saved to the server every 30s and on every
 * pause/end, so a resumed session picks up exactly where it stopped.
 * A pause or break ENDS the call (no billing) and resume mints a new one
 * with the saved context. Timed writing of 15+ minutes also drops the call
 * ("quiet mode"); the text is sent to Emma when the call resumes.
 */

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import {
  Loader2, Mic, MicOff, Clock, Pause, Play, PhoneOff, BookOpen, PenLine,
  CheckCircle2, Circle, Send, Coffee, Sparkles, AlertTriangle,
} from "lucide-react";

const KEY_STORAGE = "specta_writing_student_key";
const NOTES_STORAGE = (sid: number) => `specta_writing_notes_${sid}`;
const QUIET_MODE_MIN_MINUTES = 15;   // timed writing ≥ this drops the voice call

type Phase = "overview" | "connecting" | "class" | "paused" | "ended";
interface Card { id: string; kind: "note" | "correction"; title?: string; content?: string; original?: string; corrected?: string; explanation?: string; type?: string; at: number }
interface Turn { role: "emma" | "you"; text: string }
interface WritingTask { prompt: string; minWords: number; minutes: number; mode: "guided" | "timed"; taskType: "task1" | "task2"; label?: string; table?: any }

function studentKey(): string {
  try {
    let k = localStorage.getItem(KEY_STORAGE);
    if (!k) {
      k = (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY_STORAGE, k);
    }
    return k;
  } catch { return "anon-" + Math.random().toString(36).slice(2, 14); }
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const hhmm = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const words = (t: string) => (t.trim().match(/\S+/g) || []).length;

export default function WritingClassroom() {
  return (
    <ConversationProvider>
      <ClassroomInner />
    </ConversationProvider>
  );
}

function ClassroomInner() {
  const key = useRef(studentKey()).current;
  const utils = trpc.useUtils();
  const config = trpc.writing.config.useQuery(undefined, { staleTime: Infinity });
  const courseQ = trpc.writing.getCourse.useQuery({ studentKey: key }, { refetchOnWindowFocus: false });

  const [phase, setPhase] = useState<Phase>("overview");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionNumber, setSessionNumber] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [budget, setBudget] = useState(7200);
  const [board, setBoard] = useState<Card[]>([]);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [task, setTask] = useState<WritingTask | null>(null);
  const [padText, setPadText] = useState("");
  const [taskLeft, setTaskLeft] = useState<number | null>(null);
  const [level, setLevel] = useState<{ band: number; track: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<"class" | "board" | "write">("class");
  const [endSummary, setEndSummary] = useState<string | null>(null);
  const [quiet, setQuiet] = useState(false);       // voice dropped for timed writing
  const [pausedReason, setPausedReason] = useState<string>("");

  // Setup form (first session)
  const [name, setName] = useState("");
  const [testType, setTestType] = useState<"academic" | "general">("academic");
  const [targetBand, setTargetBand] = useState("6.5");
  const [testDate, setTestDate] = useState("");

  const sessionIdRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const budgetRef = useRef(7200);
  const boardRef = useRef<Card[]>([]);
  const transcriptRef = useRef<Turn[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const taskTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentionalEndRef = useRef(false);
  const endedRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const pendingMsgsRef = useRef<string[]>([]);
  const taskRef = useRef<WritingTask | null>(null);
  const boardEndRef = useRef<HTMLDivElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { boardRef.current = board; boardEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [board]);
  useEffect(() => { transcriptRef.current = transcript; transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [transcript]);
  useEffect(() => { taskRef.current = task; }, [task]);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  const start = trpc.writing.startSession.useMutation();
  const save = trpc.writing.saveSession.useMutation();
  const progress = trpc.writing.recordProgress.useMutation();
  const setLevelMut = trpc.writing.setLevel.useMutation();
  const grade = trpc.writing.gradeWriting.useMutation();
  const assign = trpc.writing.assignHomework.useMutation();
  const complete = trpc.writing.completeSession.useMutation();
  const submitHw = trpc.writing.submitHomework.useMutation({ onSuccess: () => utils.writing.getCourse.invalidate({ studentKey: key }) });

  // ── helpers ──
  const addCard = (c: Omit<Card, "id" | "at">) => setBoard(prev => [...prev, { ...c, id: Math.random().toString(36).slice(2), at: Date.now() }]);
  const say = (text: string) => { try { conversation.sendUserMessage(text); } catch { pendingMsgsRef.current.push(text); } };
  const stopClocks = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (saveRef.current) { clearInterval(saveRef.current); saveRef.current = null; }
  };
  const persist = (status?: "active" | "paused") => {
    if (!sessionIdRef.current) return Promise.resolve();
    return save.mutateAsync({
      studentKey: key, sessionId: sessionIdRef.current, elapsedSeconds: elapsedRef.current,
      board: boardRef.current, transcript: transcriptRef.current.slice(-400),
      conversationId: conversationIdRef.current || undefined, status,
    }).then(() => undefined).catch(() => undefined);
  };
  const sentNotes = (): Set<number> => {
    try { return new Set(JSON.parse(localStorage.getItem(NOTES_STORAGE(sessionIdRef.current || 0)) || "[]")); } catch { return new Set(); }
  };
  const markNote = (m: number) => {
    try { const s = sentNotes(); s.add(m); localStorage.setItem(NOTES_STORAGE(sessionIdRef.current || 0), JSON.stringify(Array.from(s))); } catch { /* */ }
  };
  const TIME_NOTES: Array<[number, string]> = [
    [30, "[SYSTEM] 30 minutes into the session."],
    [55, "[SYSTEM] 55 minutes in. Around the 60-minute mark, offer the student a short 5-minute break, then call request_break."],
    [90, "[SYSTEM] 90 minutes in. 30 minutes remain."],
    [110, "[SYSTEM] 110 minutes in. Begin wrapping up now: recap the 3 takeaways, call save_progress, call assign_homework, then end_class."],
    [118, "[SYSTEM] Only 2 minutes remain. Finish now: save_progress, assign_homework, then end_class."],
  ];

  const startClocks = () => {
    stopClocks();
    tickRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      const min = Math.floor(elapsedRef.current / 60);
      for (const [m, text] of TIME_NOTES) {
        if (min === m && elapsedRef.current % 60 === 0 && !sentNotes().has(m)) { markNote(m); say(text); }
      }
      if (elapsedRef.current >= budgetRef.current) void finishSession("Time is up — the 2 hours are complete.");
    }, 1000);
    saveRef.current = setInterval(() => { void persist("active"); }, 30000);
  };

  // ── conversation ──
  const conversation = useConversation({
    clientTools: {
      board_write: (p: any) => { addCard({ kind: "note", title: String(p?.title || ""), content: String(p?.content || "") }); },
      board_correct: (p: any) => { addCard({ kind: "correction", original: String(p?.original || ""), corrected: String(p?.corrected || ""), explanation: String(p?.explanation || ""), type: String(p?.type || "grammar") }); },
      ask_student_to_write: (p: any) => {
        const t: WritingTask = {
          prompt: String(p?.prompt || ""), minWords: Number(p?.minWords) || 150, minutes: Number(p?.minutes) || 10,
          mode: p?.mode === "timed" ? "timed" : "guided", taskType: p?.taskType === "task1" ? "task1" : "task2", label: p?.label ? String(p.label) : undefined,
        };
        openTask(t);
      },
      set_level: (p: any) => {
        const band = Number(p?.band); if (!Number.isFinite(band)) return;
        const track = String(p?.track || "");
        setLevel({ band, track });
        setLevelMut.mutate({ studentKey: key, band, track: (["foundation", "developing", "advanced"].includes(track) ? track : undefined) as any, note: p?.note ? String(p.note) : undefined });
      },
      save_progress: (p: any) => {
        if (!sessionIdRef.current) return;
        setEndSummary(String(p?.summary || ""));
        progress.mutate({
          studentKey: key, sessionId: sessionIdRef.current, summary: String(p?.summary || ""),
          covered: Array.isArray(p?.covered) ? p.covered.map(String).slice(0, 40) : [],
          corrections: Array.isArray(p?.corrections) ? p.corrections.map(String).slice(0, 60) : [],
          nextFocus: p?.nextFocus ? String(p.nextFocus) : undefined,
        });
      },
      assign_homework: (p: any) => {
        if (!sessionIdRef.current) return;
        assign.mutate({ studentKey: key, sessionId: sessionIdRef.current, taskType: p?.taskType === "task1" ? "task1" : "task2", prompt: String(p?.prompt || ""), guidance: p?.guidance ? String(p.guidance) : undefined },
          { onSuccess: () => utils.writing.getCourse.invalidate({ studentKey: key }) });
      },
      request_break: () => { void pauseSession("Break time. Take 5 minutes — your clock is paused.", true); },
      end_class: () => { void finishSession(null); },
    },
    onConnect: () => {
      try { conversationIdRef.current = conversation.getId(); } catch { /* */ }
      intentionalEndRef.current = false;
      setQuiet(false);
      setPhase("class");
      startClocks();
      // Deliver anything queued while the call was down (e.g. timed writing).
      const q = pendingMsgsRef.current.splice(0);
      if (q.length) setTimeout(() => q.forEach(m => { try { conversation.sendUserMessage(m); } catch { /* */ } }), 1500);
    },
    onDisconnect: () => {
      stopClocks();
      void persist(intentionalEndRef.current ? undefined : "paused");
      if (endedRef.current) return;
      if (!intentionalEndRef.current) {
        // Call cap or a drop: keep everything, let them resume in one tap.
        setPausedReason("The call ended (connection or the 60-minute call limit). Everything is saved — tap Resume to continue.");
        setPhase("paused");
      }
    },
    onError: (m: any) => {
      const raw = typeof m === "string" ? m : (m?.message || JSON.stringify(m));
      console.error("[WritingClass] error:", raw);
      setErrorMsg(`Technical error: ${String(raw).slice(0, 300)}`);
    },
    onMessage: (msg: any) => {
      try {
        const source = msg?.source || msg?.role;
        const text = (msg?.message ?? msg?.text ?? "").toString().trim();
        if (!text) return;
        const role: "emma" | "you" = (source === "user" || source === "human") ? "you" : "emma";
        if (role === "you" && text.startsWith("[")) return; // our own [SYSTEM]/[WRITTEN] messages
        setTranscript(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === role) { const m = [...prev]; m[m.length - 1] = { role, text: `${last.text} ${text}`.trim() }; return m; }
          return [...prev, { role, text }];
        });
      } catch { /* */ }
    },
  });

  // ── session lifecycle ──
  async function beginOrResume() {
    setErrorMsg(null);
    setPhase("connecting");
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setErrorMsg("We need microphone access for the class. Allow the mic and try again."); setPhase("overview"); return; }
    const isNew = !courseQ.data;
    start.mutate({
      studentKey: key,
      ...(isNew ? { studentName: name.trim() || undefined, testType, targetBand: Number(targetBand) || undefined, testDate: testDate.trim() || undefined } : {}),
    }, {
      onSuccess: (d) => {
        sessionIdRef.current = d.session.id; setSessionId(d.session.id);
        setSessionNumber(d.session.sessionNumber);
        elapsedRef.current = d.session.elapsedSeconds; setElapsed(d.session.elapsedSeconds);
        budgetRef.current = d.session.budgetSeconds; setBudget(d.session.budgetSeconds);
        const b = (d.session.board as Card[]) || []; setBoard(b);
        const t = (d.session.transcript as Turn[]) || []; setTranscript(t);
        if (d.course.currentLevel && (d.course.currentLevel as any).band) setLevel({ band: Number((d.course.currentLevel as any).band), track: String((d.course.currentLevel as any).track || "") });
        endedRef.current = false;
        conversation.startSession({ signedUrl: d.signedUrl, dynamicVariables: d.dynamicVariables });
      },
      onError: (e) => { setErrorMsg(e.message); setPhase("overview"); },
    });
  }

  async function pauseSession(reason: string, isBreak = false) {
    intentionalEndRef.current = true;
    stopClocks();
    await persist("paused");
    try { conversation.endSession(); } catch { /* */ }
    setPausedReason(reason || (isBreak ? "On a break." : "Paused."));
    setPhase("paused");
  }

  async function finishSession(note: string | null) {
    if (endedRef.current) return;
    endedRef.current = true;
    intentionalEndRef.current = true;
    stopClocks();
    if (note) setEndSummary(prev => prev || note);
    try { conversation.endSession(); } catch { /* */ }
    if (sessionIdRef.current) {
      await complete.mutateAsync({ studentKey: key, sessionId: sessionIdRef.current, elapsedSeconds: elapsedRef.current, board: boardRef.current, transcript: transcriptRef.current.slice(-400) }).catch(() => undefined);
    }
    utils.writing.getCourse.invalidate({ studentKey: key });
    setPhase("ended");
  }

  // ── writing pad ──
  function openTask(t: WritingTask) {
    setTask(t); setPadText(""); setMobileTab("write");
    if (taskTimerRef.current) clearInterval(taskTimerRef.current);
    let left = t.minutes * 60; setTaskLeft(left);
    taskTimerRef.current = setInterval(() => {
      left -= 1; setTaskLeft(left);
      if (left <= 0) { clearInterval(taskTimerRef.current!); taskTimerRef.current = null; setTaskLeft(0); }
    }, 1000);
    if (t.mode === "timed") {
      try { conversation.setMuted(true); } catch { /* */ }
      if (t.minutes >= QUIET_MODE_MIN_MINUTES) {
        // Quiet mode: drop the voice call while they write (no billing). The
        // session clock keeps running because writing time is class time.
        intentionalEndRef.current = true;
        setQuiet(true);
        try { conversation.endSession(); } catch { /* */ }
        // keep ticking elapsed while writing
        if (!tickRef.current) startClocks();
      }
    }
  }

  async function submitWriting() {
    const t = taskRef.current; if (!t) return;
    const text = padText.trim(); if (words(text) < 10) return;
    if (taskTimerRef.current) { clearInterval(taskTimerRef.current); taskTimerRef.current = null; }
    setTaskLeft(null);
    setTranscript(prev => [...prev, { role: "you", text: `✍️ ${t.label || "Writing"} (${words(text)} words): ${text}` }]);
    const msgs: string[] = [`[WRITTEN] (${t.label || t.taskType}, ${words(text)} words)\n${text}`];
    // Objective grading for timed tasks (and the Session-1 diagnostic).
    if (t.mode === "timed" && words(text) >= 40) {
      const isDiagnostic = sessionNumber === 1 && t.taskType === "task2" && !(courseQ.data?.course as any)?.baseline;
      try {
        const g = await grade.mutateAsync({ studentKey: key, taskType: t.taskType, prompt: t.prompt, text, purpose: isDiagnostic ? "diagnostic" : "practice" });
        if (g.graded) {
          const c = g.criteria;
          msgs.push(`[SYSTEM] Objective grading: overall ${g.overallBand.toFixed(1)} · TR ${c.taskResponse.band.toFixed(1)} · CC ${c.coherenceCohesion.band.toFixed(1)} · LR ${c.lexicalResource.band.toFixed(1)} · GRA ${c.grammaticalRange.band.toFixed(1)}. Top fixes: ${g.improvements.slice(0, 3).join(" | ")}. Sample errors: ${g.corrections.slice(0, 3).map((x: any) => `"${x.original}" → "${x.fix}"`).join(" | ")}. Use this as your anchor, add your judgement${isDiagnostic ? ", then call set_level" : ""}.`);
          if (isDiagnostic) { setLevel({ band: g.overallBand, track: "" }); utils.writing.getCourse.invalidate({ studentKey: key }); }
        }
      } catch { /* Emma reviews without the anchor */ }
    }
    setTask(null); setPadText(""); setMobileTab("class");
    if (quiet) {
      // Bring Emma back with the writing queued for delivery on connect.
      pendingMsgsRef.current.push(...msgs);
      setQuiet(false);
      setPhase("connecting");
      start.mutate({ studentKey: key }, {
        onSuccess: (d) => { conversation.startSession({ signedUrl: d.signedUrl, dynamicVariables: d.dynamicVariables }); },
        onError: (e) => { setErrorMsg(e.message); setPausedReason("Could not reconnect. Tap Resume to try again."); setPhase("paused"); },
      });
    } else {
      try { conversation.setMuted(false); } catch { /* */ }
      msgs.forEach(say);
    }
  }

  useEffect(() => () => { stopClocks(); if (taskTimerRef.current) clearInterval(taskTimerRef.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden" && phase === "class") void persist("active"); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OVERVIEW ──
  if (phase === "overview" || phase === "ended") {
    const data = courseQ.data;
    const course = data?.course;
    const sessions = data?.sessions || [];
    const homework = data?.homework || [];
    const current = sessions.find(s => s.status === "active" || s.status === "paused");
    const nextNum = (course?.sessionsCompleted || 0) + 1;
    const complete = !!course && course.sessionsCompleted >= course.totalSessions;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navigation />
        <main className="max-w-3xl mx-auto p-4 pt-24 pb-16 space-y-4">
          {phase === "ended" && (
            <div className="bg-white rounded-3xl shadow-xl border border-emerald-200 p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h1 className="text-2xl font-black text-slate-900">Session {sessionNumber} complete</h1>
              {endSummary && <p className="text-sm text-slate-700 mt-3 text-left bg-slate-50 rounded-xl p-4 leading-relaxed">{endSummary}</p>}
              <p className="text-xs text-slate-500 mt-3">Your homework is below. Submit it before the next session so Emma can review it with you.</p>
            </div>
          )}

          <div className="text-center">
            <div className="text-xs uppercase tracking-widest font-bold text-indigo-600">SpecTa · Emma's Writing Course</div>
            <h1 className="text-3xl font-black text-slate-900 mt-1">IELTS Writing, 1-on-1 with Emma</h1>
            <p className="text-slate-600 mt-2 text-sm">5 sessions × 2 hours · Task 1 + Task 2 · a plan built around <em>your</em> weaknesses.</p>
            {config.data?.openTrial && <span className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">Trial · free · no login</span>}
          </div>

          {courseQ.isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
          ) : !course ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-3">
              <h2 className="font-bold text-slate-900">Before your first session</h2>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTestType("academic")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold border-2 ${testType === "academic" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}>Academic</button>
                <button onClick={() => setTestType("general")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold border-2 ${testType === "general" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}>General Training</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={targetBand} onChange={e => setTargetBand(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm">
                  {["5.5", "6.0", "6.5", "7.0", "7.5", "8.0"].map(b => <option key={b} value={b}>Target band {b}</option>)}
                </select>
                <input value={testDate} onChange={e => setTestDate(e.target.value)} placeholder="Test date (e.g. 12 Nov 2026)" className="border rounded-xl px-3 py-2.5 text-sm" />
              </div>
              {errorMsg && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{errorMsg}</div>}
              <button onClick={beginOrResume} disabled={start.isPending} className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg" style={{ background: "linear-gradient(90deg,#4f46e5,#9C27B0)" }}>
                <Play className="w-5 h-5" /> Start Session 1
              </button>
              <p className="text-[11px] text-slate-400 text-center">Session 1 begins with a short written diagnostic so Emma can plan your course.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold text-slate-900">{course.studentName || "Student"} · {course.testType === "general" ? "General Training" : "Academic"}</div>
                    <div className="text-xs text-slate-500">Target band {course.targetBand ? Number(course.targetBand).toFixed(1) : "—"}{(course.currentLevel as any)?.band ? ` · currently ~${Number((course.currentLevel as any).band).toFixed(1)}` : ""}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">{course.sessionsCompleted}/{course.totalSessions} done</div>
                </div>
                <ol className="space-y-2 mb-5">
                  {[1, 2, 3, 4, 5].map(n => {
                    const s = sessions.find(x => x.sessionNumber === n);
                    const titles = ["Diagnosis & Foundations", "Task 2: Ideas, Structure & Coherence", "Grammar Range & Lexical Resource", "Task 1", "Full Simulation & Exam Strategy"];
                    const done = s?.status === "completed";
                    const active = s && (s.status === "active" || s.status === "paused");
                    return (
                      <li key={n} className={`flex items-center gap-3 p-3 rounded-xl border ${done ? "border-emerald-200 bg-emerald-50/50" : active ? "border-indigo-300 bg-indigo-50/60" : "border-slate-100"}`}>
                        {done ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <Circle className={`w-5 h-5 shrink-0 ${active ? "text-indigo-500" : "text-slate-300"}`} />}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">Session {n} · {titles[n - 1]}</div>
                          {s && s.status !== "not_started" && <div className="text-[11px] text-slate-500">{hhmm(s.elapsedSeconds)} used{done ? " · completed" : active ? " · in progress" : ""}</div>}
                          {done && s?.summary && <div className="text-xs text-slate-600 mt-1 line-clamp-2">{s.summary}</div>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {errorMsg && <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{errorMsg}</div>}
                {complete ? (
                  <div className="text-center text-sm text-emerald-700 font-semibold">🎓 Course complete. Congratulations!</div>
                ) : (
                  <button onClick={beginOrResume} disabled={start.isPending} className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg" style={{ background: "linear-gradient(90deg,#4f46e5,#9C27B0)" }}>
                    {current ? <><Play className="w-5 h-5" /> Resume Session {current.sessionNumber} · {hhmm(current.elapsedSeconds)} used</> : <><Play className="w-5 h-5" /> Start Session {nextNum}</>}
                  </button>
                )}
              </div>

              {/* Homework */}
              {homework.length > 0 && (
                <div className="bg-white rounded-3xl shadow border border-slate-200 p-6">
                  <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><PenLine className="w-4 h-4 text-indigo-600" /> Homework</h2>
                  <div className="space-y-4">
                    {homework.map(h => <HomeworkItem key={h.id} h={h} onSubmit={(text) => submitHw.mutate({ studentKey: key, homeworkId: h.id, text })} pending={submitHw.isPending} />)}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="text-center"><Link href="/ielts/tutor/live" className="text-sm text-slate-500 underline">← Back</Link></div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── CONNECTING ──
  if (phase === "connecting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 text-white text-center">
        <div>
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-indigo-300" />
          <div className="text-xl font-bold">Connecting to Emma…</div>
          <div className="text-indigo-200 text-sm mt-1">Your classroom is opening.</div>
        </div>
      </div>
    );
  }

  // ── PAUSED / BREAK ──
  if (phase === "paused") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 text-white">
        <div className="max-w-md w-full text-center">
          <Coffee className="w-12 h-12 mx-auto mb-4 text-amber-300" />
          <h2 className="text-2xl font-bold">Paused</h2>
          <p className="text-indigo-200 text-sm mt-2">{pausedReason}</p>
          <div className="mt-4 text-sm text-indigo-100">Session {sessionNumber} · <span className="font-mono">{hhmm(elapsed)}</span> of {hhmm(budget)} used · clock stopped</div>
          {errorMsg && <div className="mt-3 p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-sm text-red-100">{errorMsg}</div>}
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={beginOrResume} className="px-6 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(90deg,#4f46e5,#9C27B0)" }}><Play className="w-5 h-5" /> Resume</button>
            <button onClick={() => { setPhase("overview"); utils.writing.getCourse.invalidate({ studentKey: key }); }} className="px-6 py-3 rounded-xl font-semibold border border-white/30 text-white">Leave for now</button>
          </div>
          <p className="text-[11px] text-indigo-300/70 mt-4">You can come back any time — even tomorrow. Emma remembers everything.</p>
        </div>
      </div>
    );
  }

  // ── CLASS ──
  const speaking = conversation.isSpeaking;
  const muted = conversation.isMuted;
  const left = Math.max(0, budget - elapsed);
  const boardPane = (
    <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden">
      <div className="shrink-0 px-4 py-2.5 border-b flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest font-bold text-indigo-700 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Whiteboard</div>
        {level && <div className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">~Band {level.band.toFixed(1)}{level.track ? ` · ${level.track}` : ""}</div>}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {board.length === 0 && <div className="text-sm text-slate-400 text-center py-10">Emma will write here as she teaches.</div>}
        {board.map(c => c.kind === "note" ? (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            {c.title && <div className="font-bold text-slate-900 mb-1.5">{c.title}</div>}
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{c.content}</div>
          </div>
        ) : (
          <div key={c.id} className={`rounded-xl border-2 p-4 shadow-sm bg-white ${c.type === "grammar" ? "border-red-200" : c.type === "vocabulary" ? "border-amber-200" : c.type === "cohesion" ? "border-sky-200" : "border-purple-200"}`}>
            <div className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${c.type === "grammar" ? "text-red-600" : c.type === "vocabulary" ? "text-amber-600" : c.type === "cohesion" ? "text-sky-600" : "text-purple-600"}`}>Correction · {c.type}</div>
            <div className="text-sm"><span className="line-through text-red-500">{c.original}</span></div>
            <div className="text-sm mt-1 text-emerald-700 font-medium">✓ {c.corrected}</div>
            {c.explanation && <div className="text-xs text-slate-500 mt-1.5">{c.explanation}</div>}
          </div>
        ))}
        <div ref={boardEndRef} />
      </div>
    </div>
  );
  const writePane = (
    <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden">
      <div className="shrink-0 px-4 py-2.5 border-b flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest font-bold text-indigo-700 flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> {task?.label || "Writing pad"}</div>
        {task && taskLeft !== null && <div className={`text-xs font-bold ${taskLeft <= 60 ? "text-red-600" : "text-slate-600"}`}>⏱ {mmss(taskLeft)}</div>}
      </div>
      {task ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 px-4 py-3 bg-amber-50 border-b border-amber-100 text-sm text-slate-800 whitespace-pre-wrap max-h-40 overflow-y-auto">{task.prompt}</div>
          <textarea value={padText} onChange={e => setPadText(e.target.value)} placeholder="Write here…" className="flex-1 min-h-0 w-full p-4 text-sm leading-relaxed outline-none resize-none" />
          <div className="shrink-0 px-4 py-2.5 border-t flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{words(padText)} words · target {task.minWords}{task.mode === "timed" ? " · timed" : ""}{quiet ? " · Emma is waiting quietly" : ""}</div>
            <button onClick={submitWriting} disabled={words(padText) < 10 || grade.isPending} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
              {grade.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send to Emma
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400 text-center px-6">When Emma gives you a writing task, it appears here.</div>
      )}
    </div>
  );
  const classPane = (
    <div className="h-full flex flex-col bg-slate-900 text-white rounded-2xl overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            {speaking && <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500 opacity-30" />}
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold">E</div>
          </div>
          <div>
            <div className="font-semibold leading-tight">Emma · Writing teacher</div>
            <div className="text-[11px] text-slate-300 flex items-center gap-1">{quiet ? <>quiet mode · write in peace</> : speaking ? <>speaking…</> : <><Mic className="w-3 h-3 text-emerald-400" /> your turn</>}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">Session {sessionNumber}</div>
          <div className={`text-sm font-bold tabular-nums flex items-center gap-1 justify-end ${left <= 300 ? "text-red-300" : "text-slate-200"}`}><Clock className="w-3.5 h-3.5" /> {hhmm(left)} left</div>
        </div>
      </div>
      <div className="shrink-0 px-4 mt-2 text-center text-[12px] text-slate-300/90">Just speak — no need to press anything. Emma is listening.</div>
      {errorMsg && <div className="shrink-0 mx-4 mt-2 p-2 rounded-lg bg-red-500/20 border border-red-400/40 text-xs text-red-100 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{errorMsg}</div>}
      <div className="flex-1 min-h-0 mx-4 my-3 bg-white/5 rounded-xl border border-white/10 p-3 overflow-y-auto">
        {transcript.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-slate-400 text-center px-4">The conversation will appear here.</div> : (
          <div className="space-y-2">
            {transcript.map((t, i) => (
              <div key={i} className={`flex ${t.role === "you" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed ${t.role === "you" ? "bg-white/15 text-white" : "bg-white text-slate-800"}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${t.role === "you" ? "text-slate-300" : "text-indigo-600"}`}>{t.role === "you" ? "You" : "Emma"}</div>
                  {t.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-end justify-center gap-5 pb-4">
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => conversation.setMuted(!muted)} disabled={quiet} className={`w-12 h-12 rounded-full flex items-center justify-center ${muted ? "bg-amber-500" : "bg-white/10 hover:bg-white/20"} disabled:opacity-40`} aria-label="Mute">{muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</button>
          <span className="text-[11px] text-slate-300">{muted ? "Muted" : "Mute"}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => void pauseSession("Paused. Your time is saved.")} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Pause"><Pause className="w-5 h-5" /></button>
          <span className="text-[11px] text-slate-300">Pause</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => { if (confirm("End this session now? Emma will save your progress.")) void finishSession("Session ended early."); }} className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center" aria-label="End session"><PhoneOff className="w-5 h-5" /></button>
          <span className="text-[11px] text-slate-300">End</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-3 flex flex-col">
      {/* mobile tabs */}
      <div className="lg:hidden shrink-0 grid grid-cols-3 gap-1 mb-2 bg-white/10 rounded-xl p-1">
        {(["class", "board", "write"] as const).map(t => (
          <button key={t} onClick={() => setMobileTab(t)} className={`py-1.5 rounded-lg text-xs font-semibold ${mobileTab === t ? "bg-white text-slate-900" : "text-white/80"}`}>
            {t === "class" ? "Class" : t === "board" ? "Board" : task ? "✍️ Write" : "Write"}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-3">
        <div className={`h-full min-h-0 ${mobileTab === "class" ? "" : "hidden lg:block"}`}>{classPane}</div>
        <div className={`h-full min-h-0 lg:grid lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-3 ${mobileTab === "class" ? "hidden lg:grid" : ""}`}>
          <div className={`h-full min-h-0 ${mobileTab === "board" ? "" : "hidden lg:block"}`}>{boardPane}</div>
          <div className={`h-full min-h-0 ${mobileTab === "write" ? "" : "hidden lg:block"}`}>{writePane}</div>
        </div>
      </div>
      {quiet && <div className="shrink-0 mt-2 text-center text-[11px] text-indigo-200"><Sparkles className="w-3 h-3 inline mr-1" />Quiet mode: Emma's voice is paused while you write. She returns when you send your writing.</div>}
    </div>
  );
}

function HomeworkItem({ h, onSubmit, pending }: { h: any; onSubmit: (t: string) => void; pending: boolean }) {
  const [text, setText] = useState("");
  const fb = h.feedback as any;
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">{h.taskType === "task1" ? "Task 1" : "Task 2"} · from Session {h.sessionNumber}</div>
        <div className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${h.status === "graded" ? "bg-emerald-100 text-emerald-700" : h.status === "submitted" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{h.status}</div>
      </div>
      <div className="text-sm text-slate-800 whitespace-pre-wrap">{h.prompt}</div>
      {h.guidance && <div className="text-xs text-slate-500 mt-1">Focus: {h.guidance}</div>}
      {h.status === "graded" ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-bold text-slate-900">Band {Number(h.overallBand).toFixed(1)} <span className="text-xs font-normal text-slate-500">· {h.wordCount} words</span></div>
          {h.scores && <div className="text-xs text-slate-600 mt-1">TR {Number(h.scores.taskResponse).toFixed(1)} · CC {Number(h.scores.coherenceCohesion).toFixed(1)} · LR {Number(h.scores.lexicalResource).toFixed(1)} · GRA {Number(h.scores.grammaticalRange).toFixed(1)}</div>}
          {fb?.improvements?.length > 0 && <ul className="mt-2 space-y-1">{fb.improvements.slice(0, 3).map((s: string, i: number) => <li key={i} className="text-xs text-slate-700">→ {s}</li>)}</ul>}
          <div className="text-[11px] text-slate-400 mt-2">Emma will go through this with you at the start of your next session.</div>
        </div>
      ) : (
        <div className="mt-3">
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste or type your answer here…" className="w-full border rounded-xl p-3 text-sm min-h-[140px]" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">{words(text)} words</span>
            <button onClick={() => onSubmit(text)} disabled={words(text) < 50 || pending} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">{pending ? "Grading…" : "Submit homework"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
