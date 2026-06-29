/**
 * IGCSE Exam Practice — paste-your-own-question composer at
 * `/igcse/practice/custom`.
 *
 * Closes Path B: a student can paste a question (e.g. from a Cambridge
 * specimen paper) and the AI Teacher coaches them through it Socratically.
 * No official mark scheme is available — the AI uses general 0580 marking
 * principles instead and is conservative about claiming "correct answer".
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

const TOPIC_HINTS = [
  { code: "", name: "I'm not sure / mixed" },
  // ── Math 0580
  { code: "1.13", name: "Math · Percentages" },
  { code: "1.11", name: "Math · Ratio and proportion" },
  { code: "2.6",  name: "Math · Quadratic equations" },
  { code: "2.10", name: "Math · Functions" },
  { code: "2.14", name: "Math · Differentiation" },
  { code: "4.4",  name: "Math · Similarity" },
  { code: "4.8",  name: "Math · Circle theorems" },
  { code: "5.5",  name: "Math · Volume" },
  { code: "6.1",  name: "Math · Pythagoras" },
  { code: "6.2",  name: "Math · Right-angled trigonometry" },
  { code: "7.1",  name: "Math · Transformations" },
  { code: "8.1",  name: "Math · Probability" },
  { code: "9.6",  name: "Math · Cumulative frequency" },
  // ── Physics 0625
  { code: "P1.2",  name: "Physics · Motion" },
  { code: "P1.5",  name: "Physics · Forces" },
  { code: "P1.6",  name: "Physics · Momentum" },
  { code: "P1.7",  name: "Physics · Energy, work, power" },
  { code: "P3.2",  name: "Physics · Light + refraction" },
  { code: "P4.2",  name: "Physics · Electrical quantities" },
  { code: "P4.3",  name: "Physics · Electric circuits" },
  { code: "P5.2",  name: "Physics · Radioactivity" },
  // ── Economics 0455
  { code: "E1.3",  name: "Econ · Opportunity cost" },
  { code: "E2.5",  name: "Econ · Market equilibrium" },
  { code: "E2.7",  name: "Econ · Price elasticity of demand" },
  { code: "E2.10", name: "Econ · Market failure" },
  { code: "E3.7",  name: "Econ · Firms' costs + revenue" },
  { code: "E4.2",  name: "Econ · Fiscal + monetary policy" },
  { code: "E4.4",  name: "Econ · Unemployment" },
  { code: "E4.5",  name: "Econ · Inflation" },
  { code: "E6.2",  name: "Econ · Free trade vs protectionism" },
  { code: "E6.3",  name: "Econ · Exchange rates" },
  // ── Business Studies 0450
  { code: "B1.3",  name: "Business · Enterprise + growth" },
  { code: "B1.4",  name: "Business · Types of business organisation" },
  { code: "B1.5",  name: "Business · Stakeholders" },
  { code: "B2.1",  name: "Business · Motivating workers" },
  { code: "B2.2",  name: "Business · Leadership + management" },
  { code: "B3.1",  name: "Business · Marketing + customer" },
  { code: "B3.3",  name: "Business · Product life cycle" },
  { code: "B3.4",  name: "Business · Pricing strategies" },
  { code: "B4.2",  name: "Business · Break-even analysis" },
  { code: "B5.1",  name: "Business · Sources of finance" },
  { code: "B5.5",  name: "Business · Ratio analysis" },
  { code: "B6.1",  name: "Business · Economic environment" },
  // ── Chemistry 0620
  { code: "Ch2.1",  name: "Chemistry · Atomic structure" },
  { code: "Ch2.4",  name: "Chemistry · Ionic bonding" },
  { code: "Ch2.5",  name: "Chemistry · Covalent bonding" },
  { code: "Ch3.2",  name: "Chemistry · Balancing equations" },
  { code: "Ch3.4",  name: "Chemistry · Mole calculations" },
  { code: "Ch4.1",  name: "Chemistry · Electrolysis" },
  { code: "Ch5.1",  name: "Chemistry · Exothermic / endothermic" },
  { code: "Ch6.2",  name: "Chemistry · Rate of reaction" },
  { code: "Ch6.4",  name: "Chemistry · Redox" },
  { code: "Ch7.1",  name: "Chemistry · Acids + bases" },
  { code: "Ch7.4",  name: "Chemistry · Tests for ions + gases" },
  { code: "Ch8.2",  name: "Chemistry · Group I (alkali metals)" },
  { code: "Ch8.3",  name: "Chemistry · Group VII (halogens)" },
  { code: "Ch9.2",  name: "Chemistry · Metal extraction" },
  { code: "Ch11.1", name: "Chemistry · Crude oil + fractional distillation" },
  { code: "Ch11.3", name: "Chemistry · Alkenes" },
  { code: "Ch11.6", name: "Chemistry · Polymers" },
  // ── Biology 0610
  { code: "Bi1.1",  name: "Biology · MRS GREN + characteristics of life" },
  { code: "Bi2.1",  name: "Biology · Cells + organelles" },
  { code: "Bi3.2",  name: "Biology · Osmosis" },
  { code: "Bi5.1",  name: "Biology · Enzymes + lock-and-key" },
  { code: "Bi6.1",  name: "Biology · Photosynthesis" },
  { code: "Bi7.2",  name: "Biology · Digestion + enzymes" },
  { code: "Bi9.1",  name: "Biology · Heart + circulation" },
  { code: "Bi11.2", name: "Biology · Gas exchange in alveoli" },
  { code: "Bi12.1", name: "Biology · Aerobic + anaerobic respiration" },
  { code: "Bi14.3", name: "Biology · Hormones + homeostasis" },
  { code: "Bi17.2", name: "Biology · Monohybrid inheritance + Punnett squares" },
  { code: "Bi18.1", name: "Biology · Natural selection + evolution" },
  { code: "Bi19.1", name: "Biology · Food chains + energy flow" },
];

export default function IgcsePracticeCustom() {
  const [, setLocation] = useLocation();
  const status = trpc.igcse.status.useQuery(undefined, { retry: false });

  const [question, setQuestion] = useState("");
  const [marks, setMarks] = useState(4);
  const [topicCode, setTopicCode] = useState("");

  const start = trpc.igcse.startCustomAttempt.useMutation({
    onSuccess: (d) => setLocation(`/igcse/practice/attempt/${d.attemptId}`),
    onError: (e) => alert(e?.message || "Couldn't start. Please try again."),
  });

  useEffect(() => {
    document.title = "Paste a question — Exam Practice — SpecTa Education";
    window.scrollTo(0, 0);
  }, []);

  if (status.isLoading) {
    return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  }
  if (!status.data?.loggedIn) {
    setLocation("/igcse/app");
    return null;
  }

  const canSubmit = question.trim().length >= 10 && marks >= 1 && marks <= 20;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title="Paste a question — SpecTa Education" description="Paste an exam question for AI-guided coaching." noindex />
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/igcse/practice" className="text-sm text-slate-500 hover:text-slate-800">← Practice</Link>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-slate-700">Paste your own question</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <div className={`${card} p-6`}>
          <h1 className="text-2xl font-extrabold text-slate-900">Bring your own question</h1>
          <p className="text-sm text-slate-600 mt-1">
            Copy a question from a Cambridge specimen paper, a textbook, or a past test.
            The AI Teacher will coach you through it step by step — without an official mark scheme,
            it uses standard Cambridge 0580 marking principles instead.
          </p>
        </div>

        <div className={`${card} p-5 space-y-4`}>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">Question</label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={"Paste the full question text here.\n\nTip: you can include LaTeX between $...$ for math, e.g. \"Solve $2x^2 - 5x - 4 = 0$, giving each answer to 2 d.p.\""}
              rows={10}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:border-violet-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">{question.trim().length} characters · minimum 10.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">How many marks?</label>
              <input
                type="number"
                value={marks}
                onChange={e => setMarks(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                min={1}
                max={20}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">Look at the right margin of the original paper.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Topic (optional)</label>
              <select
                value={topicCode}
                onChange={e => setTopicCode(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              >
                {TOPIC_HINTS.map(t => (
                  <option key={t.code || "_none"} value={t.code}>{t.code ? `${t.code} — ${t.name}` : t.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Helps the AI focus its coaching.</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <Link href="/igcse/practice" className="text-sm text-slate-500 hover:text-slate-800">Cancel</Link>
            <button
              onClick={() => start.mutate({ question: question.trim(), marks, topicCode: topicCode || undefined })}
              disabled={!canSubmit || start.isPending}
              className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50"
            >
              {start.isPending ? "Starting…" : "Start coaching →"}
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 px-1">
          ℹ️ Without an official mark scheme, the AI will be conservative about declaring an answer
          "correct" and may flag if your chosen technique differs from what Cambridge usually marks.
        </div>
      </main>
    </div>
  );
}
