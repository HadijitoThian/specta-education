/** /sat/test/:sessionId/report — scores, domain breakdown, and every question reviewed. */
import { useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import SatShell from "./SatShell";

const LETTERS = ["A", "B", "C", "D"];
const SECTION = { rw: "Reading and Writing", math: "Math" } as const;

export default function SatTestReport() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = Number(sessionId);
  const me = trpc.sat.me.useQuery(undefined, { retry: false });
  const lang = (me.data?.lang || "en") as "en" | "id";
  const r = trpc.sat.testReport.useQuery({ sessionId: id }, { enabled: !!me.data && Number.isFinite(id) });
  const [filter, setFilter] = useState<"all" | "wrong">("wrong");
  const [open, setOpen] = useState<number | null>(null);
  if (r.isLoading || !r.data) return <SatShell back="/sat"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></SatShell>;
  const { scores, modules, domainLabels } = r.data;
  const title = r.data.kind === "mock" ? "Full practice test" : "Diagnostic";
  return (
    <SatShell title={`${title} report`} back="/sat">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-900 text-white rounded-2xl p-6 text-center">
          <div className="text-[11px] uppercase tracking-wider text-slate-300">{title} · {r.data.completedAt ? new Date(r.data.completedAt).toLocaleDateString() : ""}</div>
          <div className="text-6xl font-black my-2">{scores.total}</div>
          <div className="flex justify-center gap-8 text-sm">
            <div><div className="text-2xl font-bold">{scores.rw}</div><div className="text-slate-300">Reading & Writing</div><div className="text-[11px] text-slate-400">{scores.sections.rw.correct}/{scores.sections.rw.total} correct{scores.sections.rw.route !== "standard" ? ` · routed ${scores.sections.rw.route}` : ""}</div></div>
            <div><div className="text-2xl font-bold">{scores.math}</div><div className="text-slate-300">Math</div><div className="text-[11px] text-slate-400">{scores.sections.math.correct}/{scores.sections.math.total} correct{scores.sections.math.route !== "standard" ? ` · routed ${scores.sections.math.route}` : ""}</div></div>
          </div>
          <div className="text-[11px] text-slate-400 mt-4">SpecTa's own score estimate on the 400–1600 scale. Official scores come only from College Board tests.</div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          {(["rw", "math"] as const).map(sec => (
            <div key={sec} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="font-bold mb-2">{SECTION[sec]} by area</div>
              {Object.entries(scores.sections[sec].byDomain).map(([code, v]) => { const p = v.total ? v.correct / v.total : 0; return (
                <div key={code} className="mb-2"><div className="flex justify-between text-xs"><span>{domainLabels[code] || code}</span><span className="text-slate-500">{v.correct}/{v.total}</span></div><div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden"><div className={`h-full ${p < 0.5 ? "bg-amber-400" : p < 0.75 ? "bg-sky-500" : "bg-emerald-500"}`} style={{ width: `${Math.round(p * 100)}%` }} /></div></div>
              ); })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-8 mb-3">
          <h2 className="font-bold">Review questions</h2>
          <div className="flex gap-1 text-xs">{(["wrong", "all"] as const).map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full border ${filter === f ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"}`}>{f === "wrong" ? "Wrong & skipped" : "All"}</button>)}</div>
        </div>
        {modules.map(m => (
          <div key={m.index} className="mb-6">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{SECTION[m.section]}{r.data!.kind === "mock" ? ` · Module ${m.stage}${m.variant !== "standard" ? ` (${m.variant})` : ""}` : ""}</div>
            <div className="space-y-2">
              {m.questions.filter(q => filter === "all" || !q.correct).map(q => {
                const isOpen = open === q.id; const skipped = !q.given;
                return (
                  <div key={q.id} className="bg-white rounded-xl border border-slate-200">
                    <button onClick={() => setOpen(isOpen ? null : q.id)} className="w-full text-left px-4 py-3 flex items-center gap-3">
                      {q.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : skipped ? <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      <span className="text-xs text-slate-500 w-6">{q.n}</span>
                      <span className="flex-1 text-sm truncate">{q.stem}</span>
                      <Link href={`/sat/skill/${q.skillCode}`} onClick={e => e.stopPropagation()} className="text-[11px] text-indigo-700 whitespace-nowrap">{q.skillCode}</Link>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-sm">
                        {q.passage && <div className="font-serif whitespace-pre-wrap leading-relaxed mb-3 pb-3 border-b border-slate-100">{q.passage}</div>}
                        <div className="font-semibold whitespace-pre-wrap mb-2">{q.stem}</div>
                        {q.choices ? <ol className="space-y-1 mb-3">{(q.choices as string[]).map((c, i) => { const L = LETTERS[i]; const isAns = L === q.answer; const mine = L === (q.given || "").toUpperCase(); return <li key={L} className={`flex gap-2 rounded-lg px-2 py-1 ${isAns ? "bg-emerald-50 text-emerald-800 font-semibold" : mine ? "bg-red-50 text-red-700" : ""}`}><span className="w-5">{L}.</span><span>{c}</span></li>; })}</ol>
                          : <div className="mb-3">Your answer: <b>{q.given || "—"}</b> · Correct: <b className="text-emerald-700">{q.answer}</b></div>}
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Explanation</div>
                        <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{lang === "id" && q.explanationId ? q.explanationId : q.explanationEn}</p>
                        <div className="text-xs text-slate-500 mt-2">{q.skillTitle} · <Link href={`/sat/skill/${q.skillCode}`} className="underline">Lesson</Link></div>
                      </div>
                    )}
                  </div>
                );
              })}
              {m.questions.filter(q => filter === "all" || !q.correct).length === 0 && <div className="text-sm text-slate-500">All correct in this module. 🎉</div>}
            </div>
          </div>
        ))}
      </div>
    </SatShell>
  );
}
