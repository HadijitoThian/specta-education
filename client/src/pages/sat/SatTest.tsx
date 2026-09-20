/**
 * /sat/test/:sessionId — Bluebook-style timed test runner (diagnostic + full mock).
 * Server owns the clock: the module deadline comes from the API, answers are
 * saved as you go, and an expired module is auto-submitted. No feedback until
 * the report.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Flag, Calculator as CalcIcon, ChevronLeft, ChevronRight, Eye, EyeOff, Grid3x3 } from "lucide-react";
import SatCalculator from "./SatCalculator";

type PubQ = { id: number; format: "mc" | "spr"; passage: string | null; stem: string; choices: string[] | null };
const LETTERS = ["A", "B", "C", "D"];
const SECTION = { rw: "Reading and Writing", math: "Math" } as const;
const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export default function SatTest() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = Number(sessionId);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.sat.me.useQuery(undefined, { retry: false });
  const session = trpc.sat.testSession.useQuery({ sessionId: id }, { enabled: !!me.data && Number.isFinite(id), refetchOnWindowFocus: false });
  const startModule = trpc.sat.startModule.useMutation({ onSuccess: (d) => { utils.sat.testSession.setData({ sessionId: id }, d); } });
  const submit = trpc.sat.submitModule.useMutation({ onSuccess: (d) => { utils.sat.testSession.setData({ sessionId: id }, d); setIdx(0); setReview(false); if (d.status === "completed") navigate(`/sat/test/${id}/report`); } });
  const save = trpc.sat.saveAnswer.useMutation();
  const abandon = trpc.sat.abandonTest.useMutation({ onSuccess: () => navigate("/sat") });

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [review, setReview] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [calc, setCalc] = useState(false);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const submittedFor = useRef<number | null>(null);
  const sprTimer = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const d = session.data;
  // Hydrate saved answers + clock offset when the module changes.
  useEffect(() => {
    if (!d) return;
    offset.current = d.serverNow - Date.now();
    const a: Record<number, string> = {}; for (const s of d.saved) a[s.questionId] = s.answer; setAnswers(a);
    try { setMarked(JSON.parse(sessionStorage.getItem(`sat_marked_${id}_${d.currentModule}`) || "{}")); } catch { setMarked({}); }
    if (d.status === "completed") navigate(`/sat/test/${id}/report`);
  }, [d?.currentModule, d?.status, d?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { sessionStorage.setItem(`sat_marked_${id}_${d?.currentModule ?? 0}`, JSON.stringify(marked)); } catch { /* */ } }, [marked, id, d?.currentModule]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now() + offset.current), 500); return () => clearInterval(t); }, []);

  const remaining = d?.deadline ? d.deadline - now : null;
  const breakLeft = d?.breakUntil ? d.breakUntil - now : null;
  // Auto-submit on expiry (once per module); auto-resume after the break.
  useEffect(() => {
    if (!d) return;
    if (d.status === "active" && d.started && remaining !== null && remaining <= 0 && submittedFor.current !== d.currentModule && !submit.isPending) { submittedFor.current = d.currentModule; submit.mutate({ sessionId: id }); }
    if (d.status === "break" && breakLeft !== null && breakLeft <= 0 && !startModule.isPending) startModule.mutate({ sessionId: id });
  }, [remaining, breakLeft, d?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs: PubQ[] = (d?.questions as PubQ[]) || [];
  const q = qs[idx];
  const setAnswer = (qid: number, val: string, debounce = false) => {
    setAnswers(a => ({ ...a, [qid]: val }));
    if (debounce) { clearTimeout(sprTimer.current[qid]); sprTimer.current[qid] = setTimeout(() => save.mutate({ sessionId: id, questionId: qid, answer: val }), 600); }
    else save.mutate({ sessionId: id, questionId: qid, answer: val });
  };
  const answered = qs.filter(x => (answers[x.id] || "").trim()).length;

  if (!d) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  // ── Break ──
  if (d.status === "break") return (
    <Shell title="Break">
      <div className="max-w-md mx-auto text-center py-16">
        <div className="text-[11px] uppercase tracking-wider text-slate-500">Break</div>
        <div className="text-6xl font-black my-4 tabular-nums">{mmss(breakLeft ?? 0)}</div>
        <p className="text-slate-600 text-sm">Reading and Writing is done. Math starts automatically when the break ends. Stretch, drink water, don't look up answers.</p>
        <button onClick={() => startModule.mutate({ sessionId: id })} disabled={startModule.isPending} className="mt-6 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold">Resume now</button>
      </div>
    </Shell>
  );

  // ── Module intro ──
  if (d.status === "active" && !d.started && d.module) return (
    <Shell title={d.kind === "mock" ? "Full practice test" : "Diagnostic"}>
      <div className="max-w-md mx-auto text-center py-16">
        <div className="text-[11px] uppercase tracking-wider text-slate-500">{d.kind === "mock" ? `Module ${d.currentModule + 1} of ${d.totalModules}` : `Part ${d.currentModule + 1} of ${d.totalModules}`}</div>
        <h1 className="text-2xl font-black mt-1">{SECTION[d.module.section]}{d.kind === "mock" ? ` · Module ${d.module.stage}` : ""}</h1>
        <div className="text-slate-600 mt-2">{d.module.count} questions · {d.module.minutes} minutes</div>
        <ul className="text-left text-sm text-slate-600 mt-6 space-y-1.5 bg-white rounded-2xl border border-slate-200 p-4">
          <li>• The timer starts when you press Start and doesn't pause.</li>
          <li>• You can move between questions and mark any for review.</li>
          <li>• When time runs out the module submits by itself.</li>
          {d.module.section === "math" && <li>• A calculator is available from the top bar.</li>}
          <li>• No answers are shown until the end of the test.</li>
        </ul>
        <button onClick={() => startModule.mutate({ sessionId: id })} disabled={startModule.isPending} className="mt-6 px-8 py-3 rounded-xl bg-slate-900 text-white font-bold">Start</button>
        <div className="mt-4"><button onClick={() => { if (confirm("Exit this test? Your progress will not be scored.")) abandon.mutate({ sessionId: id }); }} className="text-xs text-slate-400 underline">Exit test</button></div>
      </div>
    </Shell>
  );

  if (d.status !== "active" || !d.module) return <Shell title="Test"><div className="p-8 text-center text-slate-500">This test is {d.status}.</div></Shell>;

  const timerCls = remaining !== null && remaining < 5 * 60000 ? "text-red-600" : "text-slate-900";
  const header = (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-3 text-sm">
        <div className="font-semibold truncate">{SECTION[d.module.section]}{d.kind === "mock" ? ` · Module ${d.module.stage}` : ""}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTimer(v => !v)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">{showTimer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
          <span className={`font-mono font-bold tabular-nums w-14 text-center ${timerCls}`}>{showTimer ? mmss(remaining ?? 0) : "••:••"}</span>
        </div>
        <div className="flex items-center gap-2">
          {d.module.section === "math" && <button onClick={() => setCalc(v => !v)} className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${calc ? "bg-slate-900 text-white border-slate-900" : "border-slate-300"}`}><CalcIcon className="w-3.5 h-3.5" />Calculator</button>}
          <button onClick={() => { if (confirm("Exit this test? Your progress will not be scored.")) abandon.mutate({ sessionId: id }); }} className="text-xs text-slate-400 hover:text-slate-700">Exit</button>
        </div>
      </div>
    </div>
  );

  // ── Review screen ──
  if (review) return (
    <div className="min-h-screen bg-slate-100">{header}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-xl font-black">Check your work</h2>
        <p className="text-sm text-slate-600 mt-1">{answered} of {qs.length} answered. Click a question to go back to it. Submit when you're ready or wait for the timer.</p>
        <div className="grid grid-cols-9 sm:grid-cols-14 gap-1.5 mt-5">{qs.map((x, i) => { const has = (answers[x.id] || "").trim(); return <button key={x.id} onClick={() => { setIdx(i); setReview(false); }} className={`relative h-9 rounded-lg text-sm font-semibold border ${has ? "bg-slate-900 text-white border-slate-900" : "bg-white border-dashed border-slate-400 text-slate-700"}`}>{i + 1}{marked[x.id] && <Flag className="w-3 h-3 absolute -top-1 -right-1 text-red-500 fill-red-500" />}</button>; })}</div>
        <div className="mt-6 flex justify-between"><button onClick={() => setReview(false)} className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm">Back</button><button onClick={() => submit.mutate({ sessionId: id })} disabled={submit.isPending} className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-60">{submit.isPending ? "Submitting…" : "Submit module"}</button></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">{header}
      {calc && <SatCalculator onClose={() => setCalc(false)} />}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-5">
        {q && (
          <div className={`grid gap-5 ${q.passage ? "lg:grid-cols-2" : "max-w-3xl mx-auto"}`}>
            {q.passage && <div className="bg-white rounded-2xl border border-slate-200 p-5 text-[15px] leading-relaxed whitespace-pre-wrap font-serif">{q.passage}</div>}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-slate-900 text-white text-sm font-bold flex items-center justify-center">{idx + 1}</span>
                <button onClick={() => setMarked(m => ({ ...m, [q.id]: !m[q.id] }))} className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${marked[q.id] ? "border-red-300 text-red-600 bg-red-50" : "border-slate-300 text-slate-600"}`}><Flag className={`w-3.5 h-3.5 ${marked[q.id] ? "fill-red-500" : ""}`} />Mark for review</button>
              </div>
              <div className="font-medium leading-relaxed whitespace-pre-wrap mb-4">{q.stem}</div>
              {q.format === "mc" && q.choices ? (
                <div className="space-y-2">{q.choices.map((c, i) => { const L = LETTERS[i]; const picked = (answers[q.id] || "") === L; return (
                  <button key={L} onClick={() => setAnswer(q.id, picked ? "" : L)} className={`w-full text-left flex gap-3 items-start border-2 rounded-xl px-3 py-2.5 transition ${picked ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}>
                    <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${picked ? "bg-slate-900 text-white border-slate-900" : "border-slate-300"}`}>{L}</span><span className="leading-relaxed">{c}</span>
                  </button>); })}</div>
              ) : (
                <div><input value={answers[q.id] || ""} onChange={e => setAnswer(q.id, e.target.value, true)} placeholder="Your answer" className="w-full sm:w-64 border-2 border-slate-300 rounded-xl px-3 py-2.5 text-lg font-mono" /><div className="text-xs text-slate-500 mt-1">Integer, decimal or fraction. No units or symbols.</div></div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Bottom bar */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600 truncate">{me.data?.name}</div>
          <div className="relative">
            <button onClick={() => setShowNav(v => !v)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center gap-1.5"><Grid3x3 className="w-4 h-4" />Question {idx + 1} of {qs.length}</button>
            {showNav && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[320px] bg-white rounded-2xl shadow-xl border border-slate-200 p-3">
                <div className="grid grid-cols-9 gap-1.5">{qs.map((x, i) => { const has = (answers[x.id] || "").trim(); return <button key={x.id} onClick={() => { setIdx(i); setShowNav(false); }} className={`relative h-8 rounded-md text-xs font-semibold border ${i === idx ? "ring-2 ring-indigo-500" : ""} ${has ? "bg-slate-900 text-white border-slate-900" : "bg-white border-dashed border-slate-400"}`}>{i + 1}{marked[x.id] && <Flag className="w-2.5 h-2.5 absolute -top-1 -right-1 text-red-500 fill-red-500" />}</button>; })}</div>
                <button onClick={() => { setReview(true); setShowNav(false); }} className="mt-3 w-full text-xs font-semibold py-1.5 rounded-lg border border-slate-300">Go to review page</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-40 flex items-center"><ChevronLeft className="w-4 h-4" />Back</button>
            {idx < qs.length - 1
              ? <button onClick={() => setIdx(i => i + 1)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center">Next<ChevronRight className="w-4 h-4" /></button>
              : <button onClick={() => setReview(true)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold">Review</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  useEffect(() => { document.title = `${title} · SpecTa SAT Self-Prep`; }, [title]);
  return <div className="min-h-screen bg-slate-100"><div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 text-sm font-semibold">{title}</div><div className="px-4">{children}</div></div>;
}
