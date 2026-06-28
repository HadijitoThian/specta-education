/**
 * IGCSE Exam Practice — attempt page at `/igcse/practice/attempt/:id`.
 *
 * Shows the question (with KaTeX for any inline LaTeX), a step-by-step chat
 * where the student types working and the AI Teacher grades each step
 * Socratically. The AI never reveals the final answer — it asks probing
 * questions or gives tier-escalating hints until the student gets there.
 *
 * Buttons:
 *  - Submit step      → grades current working
 *  - 💡 Hint          → escalates through tier 1 / 2 / 3 nudges
 *  - Reveal mark scheme → gives up; shows the full Cambridge-style scheme
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";

// ── KaTeX loader (CDN, idempotent) — mirrors IgcseLesson ─────────────────────
let katexReady: Promise<any> | null = null;
function loadKatex(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).katex) return Promise.resolve((window as any).katex);
  if (katexReady) return katexReady;
  katexReady = new Promise((resolve) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).katex);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return katexReady;
}

/** Render text that may contain inline math: `$...$` or `\(...\)`, and
 *  display math: `$$...$$` or `\[...\]`. Falls back to plain text if KaTeX
 *  hasn't loaded yet. Also renders **bold** and \n as line breaks. */
function RichText({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadKatex().then((k) => {
      if (cancelled || !ref.current) return;
      if (!k) return;
      // Find all .math-render placeholders and typeset them.
      ref.current.querySelectorAll<HTMLElement>("[data-tex]").forEach(el => {
        const tex = el.getAttribute("data-tex") || "";
        const display = el.getAttribute("data-display") === "1";
        try { k.render(tex, el, { displayMode: display, throwOnError: false, output: "html" }); }
        catch { el.textContent = tex; }
      });
    });
    return () => { cancelled = true; };
  }, [text]);

  // Tokenise math + bold + line breaks into HTML.
  const html = useMemo(() => {
    let s = escapeHtml(text);
    // Display math $$...$$
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => `<span data-tex="${attrEscape(tex)}" data-display="1"></span>`);
    // Inline math $...$
    s = s.replace(/\$([^$\n]+?)\$/g, (_m, tex) => `<span data-tex="${attrEscape(tex)}"></span>`);
    // **bold**
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Newlines
    s = s.replace(/\n/g, "<br/>");
    return s;
  }, [text]);

  return <div ref={ref} className="whitespace-pre-wrap break-words leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
function attrEscape(s: string) { return s.replace(/"/g, "&quot;"); }

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

export default function IgcsePracticeAttempt() {
  const params = useParams<{ id: string }>();
  const attemptId = Number(params.id);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const status = trpc.igcse.status.useQuery(undefined, { retry: false });
  const att = trpc.igcse.getAttempt.useQuery(
    { attemptId },
    { enabled: Number.isFinite(attemptId) && attemptId > 0, retry: false },
  );

  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = "Exam Practice — SpecTa Education";
  }, []);
  useEffect(() => {
    // Autoscroll on new steps
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [att.data?.steps?.length]);

  const submit = trpc.igcse.submitStep.useMutation({
    onSuccess: () => { setDraft(""); utils.igcse.getAttempt.invalidate({ attemptId }); },
    onError: (e) => alert(e?.message || "Couldn't submit. Try again."),
  });
  const hint = trpc.igcse.requestHint.useMutation({
    onSuccess: () => utils.igcse.getAttempt.invalidate({ attemptId }),
    onError: (e) => alert(e?.message || "Couldn't get hint."),
  });
  const reveal = trpc.igcse.revealMarkScheme.useMutation({
    onSuccess: () => utils.igcse.getAttempt.invalidate({ attemptId }),
    onError: (e) => alert(e?.message || "Couldn't reveal."),
  });

  if (status.isLoading || att.isLoading) {
    return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  }
  if (!status.data?.loggedIn) {
    setLocation("/igcse/app");
    return null;
  }
  if (att.error || !att.data) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500">
        Attempt not found.{" "}
        <Link href="/igcse/practice" className="text-violet-700 underline ml-1">Back to practice</Link>
      </div>
    );
  }

  const a = att.data.attempt;
  const completed = a.status === "completed";
  const sending = submit.isPending || hint.isPending || reveal.isPending;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SEO title="Exam Practice — SpecTa Education" description="Practice IGCSE exam questions with AI coaching." noindex />
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/igcse/practice" className="text-sm text-slate-500 hover:text-slate-800 shrink-0">← Practice</Link>
            <span className="text-slate-300">·</span>
            <span className="font-semibold text-slate-700 truncate">{a.topicCode} · {a.marks} mark{a.marks === 1 ? "" : "s"}</span>
          </div>
          <div className="text-sm">
            {completed ? (
              <span className="text-emerald-700 font-semibold">
                ✓ {a.marksEarned ?? 0}/{a.marks} {a.revealed ? "(revealed)" : ""}
              </span>
            ) : (
              <span className="text-amber-600 font-semibold">In progress</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 grid md:grid-cols-[1fr_1.4fr] gap-6">
        {/* Question panel */}
        <section className={`${card} p-5 md:sticky md:top-20 md:self-start`}>
          <div className="text-xs uppercase tracking-wider text-violet-700 font-bold mb-1">Question</div>
          <RichText text={att.data.question} />
          <div className="mt-3 text-xs text-slate-500">
            Worth {a.marks} mark{a.marks === 1 ? "" : "s"} · topic {a.topicCode}
          </div>
          {completed && att.data.markScheme && (
            <details className="mt-4 rounded-lg bg-violet-50 border border-violet-100 p-3" open>
              <summary className="cursor-pointer font-semibold text-violet-900 text-sm">📋 Mark scheme</summary>
              <div className="mt-2 text-sm text-slate-800">
                <RichText text={att.data.markScheme} />
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                Conventions: <strong>M</strong>=method · <strong>A</strong>=accuracy · <strong>B</strong>=independent · <strong>FT</strong>=follow-through.
              </p>
            </details>
          )}
        </section>

        {/* Coaching chat */}
        <section className={`${card} flex flex-col min-h-[60vh]`}>
          <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {att.data.steps.map((s) => (
              <StepBubble key={s.id} step={s} />
            ))}
            {sending && (
              <div className="text-sm text-slate-400 italic">Tutor is thinking…</div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-100 p-3 space-y-2">
            {!completed ? (
              <>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Type your next step of working…  (you can use $...$ for math, e.g. $x^2 + 3x = 0$)"
                  rows={3}
                  disabled={sending}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-violet-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && draft.trim() && !sending) {
                      e.preventDefault();
                      submit.mutate({ attemptId, text: draft.trim() });
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => hint.mutate({ attemptId })}
                      disabled={sending}
                      className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                      title="Get a hint (escalates with each request)"
                    >
                      💡 Hint
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Reveal the mark scheme? This ends the attempt and marks it as revealed.")) {
                          reveal.mutate({ attemptId });
                        }
                      }}
                      disabled={sending}
                      className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Reveal mark scheme
                    </button>
                  </div>
                  <button
                    onClick={() => submit.mutate({ attemptId, text: draft.trim() })}
                    disabled={!draft.trim() || sending}
                    className="text-sm font-semibold px-4 py-2 rounded-lg bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50"
                  >
                    Submit step →
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">Tip: press Ctrl+Enter to submit.</p>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-slate-600">
                  ✓ Attempt complete. <strong>{a.marksEarned ?? 0}/{a.marks}</strong> mark{a.marks === 1 ? "" : "s"} earned.
                </div>
                <Link href="/igcse/practice" className="text-sm font-semibold px-4 py-2 rounded-lg bg-violet-700 text-white hover:bg-violet-800">
                  Try another question →
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StepBubble({ step }: { step: any }) {
  const isStudent = step.role === "student";
  const isSystem = step.role === "system"; // reveal
  if (isSystem) {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
        <div className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-1">📋 Mark scheme</div>
        <div className="text-sm text-slate-800">
          <RichText text={step.text} />
        </div>
      </div>
    );
  }
  const tone = step.verdict === "correct" ? "border-emerald-200 bg-emerald-50"
    : step.verdict === "wrong" ? "border-rose-200 bg-rose-50"
    : step.verdict === "partial" ? "border-amber-200 bg-amber-50"
    : step.verdict === "hint" ? "border-amber-200 bg-amber-50"
    : "border-slate-200 bg-white";
  const icon = step.verdict === "correct" ? "✅"
    : step.verdict === "wrong" ? "❌"
    : step.verdict === "partial" ? "⚠️"
    : step.verdict === "hint" ? "💡"
    : isStudent ? "🧑" : "🤖";
  return (
    <div className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-xl border px-3 py-2 ${isStudent ? "bg-violet-700 text-white border-violet-700" : tone}`}>
        {!isStudent && <div className="text-[11px] font-bold opacity-70 mb-0.5">{icon} Tutor</div>}
        <div className={`text-sm ${isStudent ? "text-white" : "text-slate-800"}`}>
          <RichText text={step.text} />
        </div>
      </div>
    </div>
  );
}
