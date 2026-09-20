/**
 * /sat/drill/:attemptId — the question runner.
 * One question at a time → instant check → explanation (EN/ID) → Emma panel
 * (explain / why was I wrong / hint / similar / free question) → next.
 * Resumable: reloads answered questions from the server.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Flag, CheckCircle2, XCircle, Sparkles, Send } from "lucide-react";
import SatShell, { MASTERY_TEXT } from "./SatShell";

type PubQ = { id: number; skillId: number; section: string; difficulty: number; format: "mc" | "spr"; passage: string | null; stem: string; choices: string[] | null };
type Result = { correct: boolean; answer: string; explanationEn: string; explanationId: string | null; distractorNotes: Record<string, string> | null; given: string };
type Msg = { role: "student" | "emma"; text: string };

const LETTERS = ["A", "B", "C", "D"];

export default function SatDrill() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const id = Number(attemptId);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.sat.me.useQuery(undefined, { retry: false });
  const lang = (me.data?.lang || "en") as "en" | "id";
  const t = lang === "id"
    ? { of: "dari", check: "Periksa", next: "Berikutnya", finish: "Selesai", correct: "Benar!", wrong: "Belum tepat", yourAns: "Jawabanmu", ansIs: "Jawaban yang benar", typeAns: "Ketik jawabanmu (angka, desimal, atau pecahan)", explain: "Penjelasan", emma: "Tanya Emma", explainMore: "Jelaskan lagi", why: "Kenapa aku salah?", hint: "Beri petunjuk", similar: "Soal serupa", ask: "Tanya apa saja…", flag: "Laporkan soal", flagged: "Terima kasih, sudah dilaporkan", summary: "Ringkasan latihan", score: "Skor", back: "Kembali ke dashboard", again: "Latihan lagi", avg: "rata-rata per soal", mastery: "Penguasaan skill", thinking: "Emma sedang berpikir…" }
    : { of: "of", check: "Check", next: "Next", finish: "Finish", correct: "Correct!", wrong: "Not quite", yourAns: "Your answer", ansIs: "Correct answer", typeAns: "Type your answer (integer, decimal or fraction)", explain: "Explanation", emma: "Ask Emma", explainMore: "Explain again", why: "Why was I wrong?", hint: "Give me a hint", similar: "Similar question", ask: "Ask anything…", flag: "Report a problem", flagged: "Thanks, reported", summary: "Practice summary", score: "Score", back: "Back to dashboard", again: "Practise again", avg: "avg per question", mastery: "Skill mastery", thinking: "Emma is thinking…" };

  const attempt = trpc.sat.attempt.useQuery({ attemptId: id }, { enabled: !!me.data && Number.isFinite(id), staleTime: Infinity });
  const questions: PubQ[] = (attempt.data?.questions as PubQ[]) || [];
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [choice, setChoice] = useState<string>("");
  const [startedAt, setStartedAt] = useState(Date.now());
  const [finished, setFinished] = useState<{ correct: number; total: number; answered: number; avgTimeMs: number; mastery: { pKnown: number; label: string } | null } | null>(null);
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [chat, setChat] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  // Resume: hydrate answered items and jump to the first unanswered.
  useEffect(() => {
    if (!attempt.data) return;
    const r: Record<number, Result> = {};
    for (const a of attempt.data.answered) r[a.questionId] = { correct: a.correct, answer: a.question?.answer || "", explanationEn: a.question?.explanationEn || "", explanationId: a.question?.explanationId || null, distractorNotes: (a.question?.distractorNotes as Record<string, string> | null) || null, given: a.answer || "" };
    setResults(r);
    const first = (attempt.data.questions as PubQ[]).findIndex(q => !r[q.id]);
    setIdx(first === -1 ? 0 : first);
  }, [attempt.data]);

  const q = questions[idx];
  const res = q ? results[q.id] : undefined;
  const answeredCount = Object.keys(results).length;

  const answer = trpc.sat.answer.useMutation({
    onSuccess: (d) => {
      setResults(r => ({ ...r, [d.question.id]: { correct: d.correct, answer: d.question.answer, explanationEn: d.question.explanationEn, explanationId: d.question.explanationId, distractorNotes: d.question.distractorNotes, given: choice } }));
    },
  });
  const finish = trpc.sat.finishDrill.useMutation({ onSuccess: (d) => { setFinished(d); utils.sat.skills.invalidate(); utils.sat.progress.invalidate(); utils.sat.assignments.invalidate(); topRef.current?.scrollIntoView({ behavior: "smooth" }); } });
  const flag = trpc.sat.flagQuestion.useMutation();
  const tutor = trpc.sat.tutor.useMutation({ onSuccess: (d) => setChat(c => [...c, { role: "emma", text: d.text }]) });
  const startDrill = trpc.sat.startDrill.useMutation({ onSuccess: (d) => { setFinished(null); setResults({}); setChat([]); navigate(`/sat/drill/${d.attemptId}`); } });

  useEffect(() => { setChoice(""); setChat([]); setStartedAt(Date.now()); topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [idx]);

  const explanation = res ? (lang === "id" && res.explanationId ? res.explanationId : res.explanationEn) : "";
  const askEmma = (mode: "explain" | "whyWrong" | "hint" | "similar" | "ask", message?: string) => {
    if (!q) return;
    const label = mode === "ask" ? message! : mode === "explain" ? t.explainMore : mode === "whyWrong" ? t.why : mode === "hint" ? t.hint : t.similar;
    const history = chat.slice(-8);
    setChat(c => [...c, { role: "student", text: label }]);
    tutor.mutate({ questionId: q.id, mode, studentAnswer: res?.given || choice || undefined, message, history });
  };

  const progressPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <SatShell title={attempt.data?.title} back="/sat">
      <div ref={topRef} />
      {attempt.isLoading || !attempt.data ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : finished ? (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">{t.summary}</div>
          <h1 className="text-xl font-black mt-1">{attempt.data.title}</h1>
          <div className="text-5xl font-black my-4">{finished.correct}<span className="text-2xl text-slate-400">/{finished.total}</span></div>
          <div className="text-sm text-slate-600">{Math.round(finished.avgTimeMs / 1000)}s {t.avg}</div>
          {finished.mastery && <div className="mt-3 inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100">{t.mastery}: {MASTERY_TEXT[finished.mastery.label]?.[lang]} · {Math.round(finished.mastery.pKnown * 100)}%</div>}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/sat" className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm">{t.back}</Link>
            {attempt.data.skillCode && <button onClick={() => startDrill.mutate({ code: attempt.data!.skillCode!, count: 8 })} disabled={startDrill.isPending} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-60">{t.again} →</button>}
          </div>
        </div>
      ) : q ? (
        <div className="grid lg:grid-cols-[1fr_340px] gap-5">
          <div>
            {/* Progress */}
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">{attempt.data.title}</span>
              <span>{idx + 1} {t.of} {questions.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4"><div className="h-full bg-slate-900 transition-all" style={{ width: `${progressPct}%` }} /></div>

            {/* Question */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              {q.passage && <div className="text-[15px] leading-relaxed whitespace-pre-wrap mb-4 pb-4 border-b border-slate-100 font-serif">{q.passage}</div>}
              <div className="font-semibold leading-relaxed whitespace-pre-wrap mb-4">{q.stem}</div>
              {q.format === "mc" && q.choices ? (
                <div className="space-y-2">
                  {q.choices.map((c, i) => {
                    const L = LETTERS[i];
                    const picked = (res ? res.given : choice).toUpperCase() === L;
                    const isAns = res && res.answer.toUpperCase() === L;
                    const cls = res ? (isAns ? "border-emerald-500 bg-emerald-50" : picked ? "border-red-400 bg-red-50" : "border-slate-200 opacity-70") : picked ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400";
                    return (
                      <button key={L} disabled={!!res} onClick={() => setChoice(L)} className={`w-full text-left flex gap-3 items-start border-2 rounded-xl px-3 py-2.5 transition ${cls}`}>
                        <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${picked || isAns ? "border-current" : "border-slate-300"}`}>{L}</span>
                        <span className="leading-relaxed">{c}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input value={res ? res.given : choice} disabled={!!res} onChange={e => setChoice(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && choice.trim() && !res) answer.mutate({ attemptId: id, questionId: q.id, answer: choice.trim(), timeMs: Date.now() - startedAt }); }} placeholder={t.typeAns} className={`w-full border-2 rounded-xl px-3 py-2.5 text-lg font-mono ${res ? (res.correct ? "border-emerald-500 bg-emerald-50" : "border-red-400 bg-red-50") : "border-slate-300"}`} />
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <button onClick={() => { if (!flagged[q.id]) { flag.mutate({ questionId: q.id }); setFlagged(f => ({ ...f, [q.id]: true })); } }} className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"><Flag className="w-3.5 h-3.5" />{flagged[q.id] ? t.flagged : t.flag}</button>
                {!res ? (
                  <button onClick={() => answer.mutate({ attemptId: id, questionId: q.id, answer: choice.trim(), timeMs: Date.now() - startedAt })} disabled={!choice.trim() || answer.isPending} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2">{answer.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{t.check}</button>
                ) : idx < questions.length - 1 ? (
                  <button onClick={() => setIdx(i => i + 1)} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm">{t.next} →</button>
                ) : (
                  <button onClick={() => finish.mutate({ attemptId: id })} disabled={finish.isPending} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-60">{t.finish} ✓</button>
                )}
              </div>
              {answer.error && <div className="text-sm text-red-600 mt-2">{answer.error.message}</div>}
            </div>

            {/* Result + explanation */}
            {res && (
              <div className={`mt-4 rounded-2xl border p-5 ${res.correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-center gap-2 font-bold">{res.correct ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-500" />}{res.correct ? t.correct : t.wrong}</div>
                {!res.correct && <div className="text-sm mt-1 text-slate-700">{t.yourAns}: <b>{res.given}</b> · {t.ansIs}: <b>{res.answer}</b></div>}
                {explanation ? <><div className="text-[11px] uppercase tracking-wider text-slate-500 mt-3 mb-1">{t.explain}</div><p className="leading-relaxed whitespace-pre-wrap text-slate-800">{explanation}</p></> : null}
                {!res.correct && res.distractorNotes && res.distractorNotes[res.given.toUpperCase()] && <p className="mt-2 text-sm text-slate-700 italic">{res.distractorNotes[res.given.toUpperCase()]}</p>}
              </div>
            )}
          </div>

          {/* Emma */}
          <aside className="bg-white rounded-2xl border border-slate-200 p-4 lg:sticky lg:top-20 self-start">
            <div className="flex items-center gap-2 font-bold mb-3"><Sparkles className="w-4 h-4 text-indigo-600" />{t.emma}</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {!res && <button onClick={() => askEmma("hint")} className="text-xs px-2.5 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50">{t.hint}</button>}
              {res && <button onClick={() => askEmma("explain")} className="text-xs px-2.5 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50">{t.explainMore}</button>}
              {res && !res.correct && <button onClick={() => askEmma("whyWrong")} className="text-xs px-2.5 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50">{t.why}</button>}
              {res && <button onClick={() => askEmma("similar")} className="text-xs px-2.5 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50">{t.similar}</button>}
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto text-sm">
              {chat.map((m, i) => <div key={i} className={`rounded-xl px-3 py-2 whitespace-pre-wrap leading-relaxed ${m.role === "emma" ? "bg-indigo-50 text-slate-800" : "bg-slate-100 text-slate-700 text-right"}`}>{m.text}</div>)}
              {tutor.isPending && <div className="text-xs text-slate-400 animate-pulse">{t.thinking}</div>}
              {tutor.error && <div className="text-xs text-red-600">{tutor.error.message}</div>}
            </div>
            <form onSubmit={e => { e.preventDefault(); if (chatInput.trim()) { askEmma("ask", chatInput.trim()); setChatInput(""); } }} className="mt-3 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={t.ask} className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm" />
              <button type="submit" disabled={tutor.isPending || !chatInput.trim()} className="px-3 rounded-xl bg-indigo-600 text-white disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </form>
          </aside>
        </div>
      ) : null}
    </SatShell>
  );
}
