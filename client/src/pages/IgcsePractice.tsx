/**
 * IGCSE Exam Practice — list page at `/igcse/practice`.
 *
 * Students browse curated Cambridge-style exam questions grouped by topic,
 * pick one, and the AI Teacher coaches them Socratically through the working
 * (in IgcsePracticeAttempt at `/igcse/practice/attempt/:id`).
 *
 * Authored exam-style questions only — no scraped past papers.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

export default function IgcsePractice() {
  const [, setLocation] = useLocation();
  const status = trpc.igcse.status.useQuery(undefined, { retry: false });
  const topics = trpc.igcse.listTopics.useQuery();
  const examples = trpc.igcse.listExamples.useQuery({});
  const attempts = trpc.igcse.listAttempts.useQuery({ limit: 50 }, { enabled: !!status.data?.loggedIn });

  const startAttempt = trpc.igcse.startAttempt.useMutation({
    onSuccess: (d) => setLocation(`/igcse/practice/attempt/${d.attemptId}`),
    onError: (e) => alert(e?.message || "Couldn't start. Please try again."),
  });

  useEffect(() => {
    document.title = "IGCSE Exam Practice — SpecTa Education";
    window.scrollTo(0, 0);
  }, []);

  // Filters
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [marksFilter, setMarksFilter] = useState<"all" | "1-2" | "3-4" | "5+">("all");

  const topicByCode = useMemo(() => {
    const m = new Map<string, string>();
    (topics.data || []).forEach((t: any) => m.set(t.code, t.name));
    return m;
  }, [topics.data]);

  const attemptsByExample = useMemo(() => {
    const m = new Map<number, { tries: number; bestMarks: number; best: any }>();
    (attempts.data || []).forEach((a: any) => {
      const prev = m.get(a.exampleId) || { tries: 0, bestMarks: -1, best: null };
      const me = a.marksEarned ?? -1;
      m.set(a.exampleId, {
        tries: prev.tries + 1,
        bestMarks: Math.max(prev.bestMarks, me),
        best: me > prev.bestMarks ? a : prev.best,
      });
    });
    return m;
  }, [attempts.data]);

  const filtered = useMemo(() => {
    let list = examples.data || [];
    if (topicFilter !== "all") list = list.filter((e: any) => e.topicCode === topicFilter);
    if (marksFilter !== "all") {
      list = list.filter((e: any) => {
        if (marksFilter === "1-2") return e.marks <= 2;
        if (marksFilter === "3-4") return e.marks >= 3 && e.marks <= 4;
        return e.marks >= 5;
      });
    }
    return list;
  }, [examples.data, topicFilter, marksFilter]);

  // Group by topicCode
  const grouped = useMemo(() => {
    const m = new Map<string, any[]>();
    filtered.forEach((e: any) => {
      const arr = m.get(e.topicCode) || [];
      arr.push(e);
      m.set(e.topicCode, arr);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // Available topic codes (only those with at least one question seeded)
  const availableTopicCodes = useMemo(() => {
    const set = new Set<string>();
    (examples.data || []).forEach((e: any) => set.add(e.topicCode));
    return Array.from(set).sort();
  }, [examples.data]);

  if (status.isLoading) {
    return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  }
  if (!status.data?.loggedIn) {
    // Send them to the gated app to log in / start a trial.
    setLocation("/igcse/app");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title="IGCSE Exam Practice — SpecTa Education" description="Practice Cambridge IGCSE Math exam-style questions with AI coaching." noindex />
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/igcse/app" className="font-extrabold text-violet-700 hover:underline">SpecTa</Link>
            <span className="font-bold text-slate-700">· Exam Practice</span>
          </div>
          <Link href="/igcse/app" className="text-sm text-slate-500 hover:text-slate-800">← Back to classroom</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Intro */}
        <div className={`${card} p-6`}>
          <h1 className="text-2xl font-extrabold text-slate-900">Exam Practice</h1>
          <p className="text-sm text-slate-600 mt-1">
            Pick an exam-style question. Type your working step-by-step — the AI Teacher will check each step,
            guide you when you're stuck, and reveal the full Cambridge-style mark scheme at the end.
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            All questions are authored to Cambridge IGCSE 0580 Extended style — not verbatim past papers.
          </p>
        </div>

        {/* Filters */}
        <div className={`${card} p-4 flex flex-wrap gap-3 items-center`}>
          <label className="text-sm text-slate-600">Topic
            <select
              value={topicFilter}
              onChange={e => setTopicFilter(e.target.value)}
              className="ml-2 border border-slate-300 rounded-md px-2 py-1 text-sm"
            >
              <option value="all">All topics</option>
              {availableTopicCodes.map(code => (
                <option key={code} value={code}>{code} — {topicByCode.get(code) || "(unnamed)"}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">Difficulty
            <select
              value={marksFilter}
              onChange={e => setMarksFilter(e.target.value as any)}
              className="ml-2 border border-slate-300 rounded-md px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="1-2">1–2 marks (quick)</option>
              <option value="3-4">3–4 marks (typical)</option>
              <option value="5+">5+ marks (harder)</option>
            </select>
          </label>
          <span className="ml-auto text-xs text-slate-500">{filtered.length} question{filtered.length === 1 ? "" : "s"}</span>
        </div>

        {/* List */}
        {examples.isLoading && <div className="text-center text-slate-400 py-8">Loading questions…</div>}
        {!examples.isLoading && filtered.length === 0 && (
          <div className={`${card} p-8 text-center text-slate-500`}>
            No questions match these filters yet. Try clearing the topic filter.
          </div>
        )}

        {grouped.map(([code, items]) => (
          <section key={code} className={`${card} p-5`}>
            <div className="mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-violet-700">{code}</div>
              <h2 className="font-bold text-slate-900">{topicByCode.get(code) || "Topic"}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map((ex: any) => {
                const att = attemptsByExample.get(ex.id);
                const preview = ex.question.replace(/\n/g, " ").slice(0, 110) + (ex.question.length > 110 ? "…" : "");
                return (
                  <button
                    key={ex.id}
                    onClick={() => startAttempt.mutate({ exampleId: ex.id })}
                    disabled={startAttempt.isPending}
                    className="text-left rounded-xl border border-slate-200 hover:border-violet-400 hover:bg-violet-50 p-4 transition disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700">
                        {ex.marks} mark{ex.marks === 1 ? "" : "s"}
                      </span>
                      {att && (
                        <span className="text-[11px] text-slate-500">
                          {att.bestMarks >= 0
                            ? <>Best: <strong className="text-emerald-700">{att.bestMarks}/{ex.marks}</strong></>
                            : <>Tried {att.tries}×</>}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-700 line-clamp-3">{preview}</div>
                    <div className="mt-3 text-xs text-violet-700 font-semibold">Start →</div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Recent attempts */}
        {(attempts.data || []).length > 0 && (
          <section className={`${card} p-5`}>
            <h3 className="font-semibold text-slate-900 mb-3">Recent attempts</h3>
            <ul className="divide-y divide-slate-100">
              {(attempts.data || []).slice(0, 10).map((a: any) => (
                <li key={a.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-slate-700">{a.topicCode}</span>
                    <span className="text-slate-400"> · {new Date(a.startedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.status === "completed" ? (
                      <span className="text-emerald-700 font-semibold">
                        {a.marksEarned ?? 0}/{a.marks} {a.revealed ? "· revealed" : ""}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold">In progress</span>
                    )}
                    <Link href={`/igcse/practice/attempt/${a.id}`} className="text-violet-700 hover:underline">View</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
