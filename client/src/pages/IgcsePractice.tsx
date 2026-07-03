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
  const [subject, setSubject] = useState<"math" | "physics" | "economics" | "business" | "chemistry" | "biology">("math");
  const status = trpc.igcse.status.useQuery(undefined, { retry: false });
  const topics = trpc.igcse.listTopics.useQuery({ subject });
  const examples = trpc.igcse.listExamples.useQuery({ subject });
  const attempts = trpc.igcse.listAttempts.useQuery({ limit: 50 }, { enabled: !!status.data?.loggedIn });
  const weak = trpc.igcse.weaknesses.useQuery(undefined, { enabled: !!status.data?.loggedIn });

  const startAttempt = trpc.igcse.startAttempt.useMutation({
    onSuccess: (d) => setLocation(`/igcse/practice/attempt/${d.attemptId}`),
    onError: (e: any) => {
      // Anonymous visitors need to register / log in before they can attempt.
      // The server-side auth error surfaces as UNAUTHORIZED — redirect them
      // through the classroom's AuthGate rather than showing a raw alert.
      const code = e?.data?.code || e?.shape?.data?.code;
      if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
        setLocation("/igcse/app");
        return;
      }
      alert(e?.message || "Couldn't start. Please try again.");
    },
  });

  useEffect(() => {
    document.title = "IGCSE Exam Practice — SpecTa Education";
    window.scrollTo(0, 0);
  }, []);

  // Filters — reset when subject changes (different topic codes).
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [marksFilter, setMarksFilter] = useState<"all" | "1-2" | "3-4" | "5+">("all");
  useEffect(() => {
    setTopicFilter("all");
    setMarksFilter("all");
  }, [subject]);

  const topicByCode = useMemo(() => {
    const m = new Map<string, string>();
    (topics.data || []).forEach((t: any) => m.set(t.code, t.title || t.name));
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

  // Count questions per difficulty bucket for the current topic filter.
  // Shown as "(n)" next to each option so students see what's available
  // without being blocked from clicking an empty bucket.
  const markBucketCounts = useMemo(() => {
    let scope = examples.data || [];
    if (topicFilter !== "all") scope = scope.filter((e: any) => e.topicCode === topicFilter);
    const c = { "1-2": 0, "3-4": 0, "5+": 0 } as Record<string, number>;
    scope.forEach((e: any) => {
      if (e.marks <= 2) c["1-2"] += 1;
      else if (e.marks <= 4) c["3-4"] += 1;
      else c["5+"] += 1;
    });
    return c;
  }, [examples.data, topicFilter]);

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
  // Anonymous visitors are NOT redirected away — this page is a public SEO
  // surface (searches like "IGCSE math practice questions" should land here).
  // The topic list + example questions come from public tRPC endpoints; only
  // starting an attempt requires an account. If an anon user clicks "Start",
  // startAttempt returns an auth error and the onError handler sends them to
  // /igcse/app to register / log in.
  const loggedIn = !!status.data?.loggedIn;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* No `noindex` — this page must be indexable. Only the private per-user
          attempt page (IgcsePracticeAttempt) is noindex, which is correct. */}
      <SEO title="IGCSE Exam Practice — SpecTa Education" description="Practice Cambridge IGCSE Math, Physics, Chemistry, Biology, Economics & Business exam-style questions with AI coaching. Free preview, Cambridge-style mark schemes." />
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
            All questions are authored to Cambridge IGCSE {subject === "physics" ? "0625 (Physics)" : subject === "economics" ? "0455 (Economics)" : subject === "business" ? "0450 (Business Studies)" : subject === "chemistry" ? "0620 (Chemistry)" : subject === "biology" ? "0610 (Biology)" : "0580 (Math)"} style — not verbatim past papers.
          </p>

          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-sm mt-4 flex-wrap" role="group" aria-label="Subject">
            <button type="button" onClick={() => setSubject("math")}
              className={`px-4 py-1.5 font-semibold ${subject === "math" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              📐 Mathematics
            </button>
            <button type="button" onClick={() => setSubject("physics")}
              className={`px-4 py-1.5 font-semibold border-l border-slate-300 ${subject === "physics" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              ⚛️ Physics
            </button>
            <button type="button" onClick={() => setSubject("economics")}
              className={`px-4 py-1.5 font-semibold border-l border-slate-300 ${subject === "economics" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              💹 Economics
            </button>
            <button type="button" onClick={() => setSubject("business")}
              className={`px-4 py-1.5 font-semibold border-l border-slate-300 ${subject === "business" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              💼 Business
            </button>
            <button type="button" onClick={() => setSubject("chemistry")}
              className={`px-4 py-1.5 font-semibold border-l border-slate-300 ${subject === "chemistry" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              🧪 Chemistry
            </button>
            <button type="button" onClick={() => setSubject("biology")}
              className={`px-4 py-1.5 font-semibold border-l border-slate-300 ${subject === "biology" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              🧬 Biology
            </button>
          </div>
        </div>

        {/* Weakness-targeting — only shown if student has at least 1 weak topic */}
        {weak.data && weak.data.ranked.length > 0 && (
          <WeaknessCard
            ranked={weak.data.ranked}
            topicByCode={topicByCode}
            examples={examples.data || []}
            onStart={(exampleId) => startAttempt.mutate({ exampleId })}
          />
        )}

        {/* Cambridge specimen papers — official, free, real exam questions */}
        <SpecimenPapersPanel />

        {/* Paste-your-own-question CTA */}
        <Link href="/igcse/practice/custom" className={`${card} block p-5 hover:border-violet-400 transition`}>
          <div className="flex items-center gap-3">
            <div className="text-2xl">✍️</div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Paste your own question</h3>
              <p className="text-sm text-slate-600">Bring a question from a specimen paper, textbook, or past test — the AI will coach you step by step.</p>
            </div>
            <span className="text-violet-700 font-bold">→</span>
          </div>
        </Link>

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
              <option value="all">All ({markBucketCounts["1-2"] + markBucketCounts["3-4"] + markBucketCounts["5+"]})</option>
              <option value="1-2">1–2 marks (quick) · {markBucketCounts["1-2"]}</option>
              <option value="3-4">3–4 marks (typical) · {markBucketCounts["3-4"]}</option>
              <option value="5+">5+ marks (harder) · {markBucketCounts["5+"]}</option>
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

// ── Weakness-targeting card ──────────────────────────────────────────────────
// Surfaces the topics where the student is scoring below 70% (or where they've
// revealed every attempt without solving) and points them at fresh questions
// to try in those topics. Drives the "keep practising — get unstuck on bounds
// today" loop.

function WeaknessCard({
  ranked, topicByCode, examples, onStart,
}: {
  ranked: any[];
  topicByCode: Map<string, string>;
  examples: any[];
  onStart: (exampleId: number) => void;
}) {
  // For each weak topic, suggest up to 2 questions the student hasn't fully
  // mastered. (We don't track "attempted" per example here; just pick top of
  // sort order in the topic.)
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🎯</div>
        <div className="flex-1">
          <h2 className="font-bold text-rose-900">Focus areas</h2>
          <p className="text-sm text-slate-700 mt-1">
            Based on your attempts, these are the topics where you've lost the most marks.
            Worth practising next.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {ranked.map((t) => {
          const pct = Math.round(t.accuracy * 100);
          const qsForTopic = examples.filter(e => e.topicCode === t.topicCode).slice(0, 2);
          return (
            <div key={t.topicCode} className="rounded-xl bg-white border border-rose-100 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">{t.topicCode}</span>
                  <span className="ml-2 font-semibold text-slate-800">{topicByCode.get(t.topicCode) || "Custom"}</span>
                </div>
                <div className="text-xs text-slate-600">
                  {t.marksAttempted > 0
                    ? <>Accuracy: <strong className={pct < 50 ? "text-rose-700" : "text-amber-700"}>{pct}%</strong> · {t.marksEarned}/{t.marksAttempted} marks</>
                    : <>Tried {t.attempts}× · revealed</>}
                </div>
              </div>
              {qsForTopic.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {qsForTopic.map(q => (
                    <button
                      key={q.id}
                      onClick={() => onStart(q.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Try a {q.marks}-mark question →
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">No bank question for this topic yet — try pasting one from a specimen paper.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Cambridge specimen papers panel ─────────────────────────────────────────
// Path B: link to Cambridge's free, official specimen papers and mark schemes
// on cambridgeinternational.org. We don't host the PDFs — we signpost. The
// student can copy a real exam question into Learn mode to discuss with the
// AI Teacher, or use our authored bank below for graded step-by-step practice.

const SPECIMENS: Array<{ year: string; paper: string; tier: "Core" | "Extended"; url: string }> = [
  // Cambridge publishes specimen papers for each syllabus update. These links
  // point to the official 0580 specimen-paper / mark-scheme PDFs on
  // cambridgeinternational.org. If a link 404s after a syllabus refresh, the
  // student is still on Cambridge's own site and can navigate from there.
  { year: "2025", paper: "Paper 2 (Extended) — Specimen",      tier: "Extended", url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/" },
  { year: "2025", paper: "Paper 4 (Extended) — Specimen",      tier: "Extended", url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/" },
  { year: "2025", paper: "Paper 1 (Core) — Specimen",          tier: "Core",     url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/" },
  { year: "2025", paper: "Paper 3 (Core) — Specimen",          tier: "Core",     url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/" },
];

function SpecimenPapersPanel() {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
      <div className="flex items-start gap-3">
        <div className="text-2xl">📄</div>
        <div className="flex-1">
          <h2 className="font-bold text-emerald-900">Official Cambridge specimen papers</h2>
          <p className="text-sm text-slate-700 mt-1">
            Cambridge publishes free specimen papers for the current 0580 syllabus on their official site.
            These are <strong>real exam-format papers</strong> with official mark schemes — use them alongside the
            authored practice questions below.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            💡 <strong>Tip:</strong> open a specimen paper, find a question you want help with,
            then copy it into <em>Learn mode</em> back on your dashboard — the AI Teacher will walk
            you through it step by step.
          </p>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-2">
        {SPECIMENS.map((p, i) => (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm hover:border-emerald-400 transition"
          >
            <div>
              <div className="font-semibold text-slate-800">{p.paper}</div>
              <div className="text-[11px] text-slate-500">cambridgeinternational.org · {p.tier}</div>
            </div>
            <span className="text-emerald-700 font-bold">↗</span>
          </a>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 mt-3">
        Opens on cambridgeinternational.org · © Cambridge Assessment International Education.
      </p>
    </section>
  );
}
