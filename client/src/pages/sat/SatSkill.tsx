/** /sat/skill/:code — the approved lesson for one skill, then "Practise". */
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Lightbulb, AlertTriangle } from "lucide-react";
import SatShell from "./SatShell";

type Lesson = { summary: string; rule: string; steps: string[]; example: { question: string; solution: string }; trap: string; quickCheck: { question: string; answer: string } };

export default function SatSkill() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const me = trpc.sat.me.useQuery(undefined, { retry: false });
  const lang = (me.data?.lang || "en") as "en" | "id";
  const q = trpc.sat.lesson.useQuery({ code }, { enabled: !!me.data && !!code });
  const startDrill = trpc.sat.startDrill.useMutation({ onSuccess: (d) => navigate(`/sat/drill/${d.attemptId}`) });
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const lesson = q.data?.lesson as Lesson | null | undefined;
  const t = lang === "id"
    ? { rule: "Aturannya", steps: "Langkah-langkah", example: "Contoh", showSol: "Lihat penyelesaian", hide: "Sembunyikan", trap: "Jebakan umum", check: "Cek cepat", showAns: "Lihat jawaban", practise: "Latihan 8 soal", none: "Pelajaran untuk skill ini belum tersedia. Kamu tetap bisa latihan.", outcomes: "Yang akan kamu kuasai" }
    : { rule: "The rule", steps: "Steps", example: "Worked example", showSol: "Show solution", hide: "Hide", trap: "Common trap", check: "Quick check", showAns: "Show answer", practise: "Practise 8 questions", none: "The lesson for this skill isn't ready yet. You can still practise.", outcomes: "What you'll be able to do" };

  return (
    <SatShell title={q.data?.skill.title} back="/sat">
      {q.isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : q.data ? (
        <article className="max-w-3xl">
          <div className="text-[11px] font-mono text-slate-400">{q.data.skill.code} · {q.data.skill.domain}</div>
          <h1 className="text-2xl font-black mb-1">{q.data.skill.title}</h1>
          <p className="text-sm text-slate-600 mb-5"><b>{t.outcomes}:</b> {q.data.skill.outcomes}</p>

          {lesson ? (
            <div className="space-y-4">
              <p className="text-base leading-relaxed">{lesson.summary}</p>
              <section className="bg-slate-900 text-white rounded-2xl p-5">
                <div className="text-[11px] uppercase tracking-wider text-slate-300 mb-1">{t.rule}</div>
                <div className="text-lg font-semibold leading-snug">{lesson.rule}</div>
              </section>
              <section className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">{t.steps}</div>
                <ol className="space-y-2 list-none">{lesson.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span><span className="leading-relaxed">{s}</span></li>)}</ol>
              </section>
              <section className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">{t.example}</div>
                <p className="whitespace-pre-wrap leading-relaxed">{lesson.example.question}</p>
                <button onClick={() => setShowSolution(v => !v)} className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300">{showSolution ? t.hide : t.showSol}</button>
                {showSolution && <p className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-800 bg-slate-50 rounded-xl p-3">{lesson.example.solution}</p>}
              </section>
              <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div><div className="text-[11px] uppercase tracking-wider text-amber-700 mb-1">{t.trap}</div><p className="leading-relaxed text-amber-900">{lesson.trap}</p></div>
              </section>
              <section className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" />{t.check}</div>
                <p className="whitespace-pre-wrap leading-relaxed">{lesson.quickCheck.question}</p>
                <button onClick={() => setShowAnswer(v => !v)} className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300">{showAnswer ? t.hide : t.showAns}</button>
                {showAnswer && <p className="mt-3 font-semibold text-emerald-700">{lesson.quickCheck.answer}</p>}
              </section>
            </div>
          ) : <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">{t.none}</div>}

          <div className="mt-6 flex items-center gap-3">
            <button onClick={() => startDrill.mutate({ code, count: 8 })} disabled={startDrill.isPending} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-60 flex items-center gap-2">{startDrill.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{t.practise} →</button>
            {startDrill.error && <span className="text-sm text-red-600">{startDrill.error.message}</span>}
          </div>
        </article>
      ) : null}
    </SatShell>
  );
}
