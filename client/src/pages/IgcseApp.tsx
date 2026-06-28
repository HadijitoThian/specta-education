/**
 * IGCSE AI Teacher — gated app shell at `/igcse/app`.
 *
 * Week 2 scope: auth gate + free-trial counter + subscription checkout.
 * The session room (whiteboard + voice) lands in Weeks 3–6 and will mount
 * inside the signed-in dashboard area below.
 *
 * Reuses the existing student-portal auth (sign-in cookie → leadId), same
 * pattern used by the AI IELTS Tutor.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";

const PURPLE = "#7c3aed";
const PINK = "#db2777";

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const inp = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm";

export default function IgcseApp() {
  const utils = trpc.useUtils();
  const status = trpc.igcse.status.useQuery(undefined, { retry: false });
  const pollsRef = useRef(0);
  const justPaid = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("paid") === "1";

  // After returning from Xendit with ?paid=1, briefly poll status so the new
  // subscription appears the moment the webhook flips it active.
  trpc.igcse.status.useQuery(undefined, {
    enabled: justPaid,
    refetchInterval: q => {
      if (!justPaid) return false;
      const sub = (q.state.data as any)?.subscription;
      if (sub) return false;
      if (pollsRef.current++ > 20) return false;
      return 2500;
    },
  });

  useEffect(() => {
    document.title = "IGCSE Math AI Teacher — SpecTa Education";
    window.scrollTo(0, 0);
    if (justPaid) {
      try { window.history.replaceState({}, "", "/igcse/app"); } catch { /* ignore */ }
    }
  }, [justPaid]);

  if (status.isLoading) {
    return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  }
  if (!status.data?.loggedIn) {
    return <AuthGate onAuthed={() => utils.igcse.status.invalidate()} />;
  }
  return <Dashboard status={status.data} />;
}

// ── Auth gate ────────────────────────────────────────────────────────────────
function AuthGate({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));

  const register = trpc.studentPortal.selfRegister.useMutation({ onSuccess: onAuthed, onError: e => setErr(e.message) });
  const login = trpc.studentPortal.login.useMutation({ onSuccess: onAuthed, onError: e => setErr(e.message) });
  const busy = register.isPending || login.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (mode === "signup") {
      if (f.name.trim().length < 2) return setErr("Please enter your name.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return setErr("Please enter a valid email.");
      if (f.password.length < 8) return setErr("Password must be at least 8 characters.");
      register.mutate({ name: f.name, email: f.email, phone: f.phone || undefined, password: f.password });
    } else {
      login.mutate({ email: f.email, password: f.password });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title="IGCSE Math AI Teacher — Sign in" description="Sign in to start your free trial of the IGCSE Math AI Teacher." noindex />
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="https://www.spectaeducation.com" className="flex items-center gap-2" title="Back to SpecTa Education">
            <span className="font-extrabold text-violet-700">SpecTa</span>
            <span className="font-bold text-slate-700">· IGCSE Math AI</span>
          </a>
          <a href="https://www.spectaeducation.com" className="hidden sm:inline text-sm font-medium text-slate-500 hover:text-slate-900">← Main site</a>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-10 pb-16">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-2xl font-extrabold text-slate-900">Start your free trial</h1>
          <p className="text-sm text-slate-500 mt-1">30 minutes free with the IGCSE Math AI Teacher. No card needed.</p>
        </div>

        <div className={`${card} p-6`}>
          <div className="flex gap-2 mb-4">
            <button type="button" onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "signup" ? "text-white" : "text-slate-600 bg-slate-100"}`} style={mode === "signup" ? { background: PURPLE } : {}}>Sign up free</button>
            <button type="button" onClick={() => setMode("login")} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "login" ? "text-white" : "text-slate-600 bg-slate-100"}`} style={mode === "login" ? { background: PURPLE } : {}}>Log in</button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <input className={inp} placeholder="Full name" value={f.name} onChange={e => set("name", e.target.value)} />
                <input className={inp} placeholder="WhatsApp / Phone (optional)" value={f.phone} onChange={e => set("phone", e.target.value)} />
              </>
            )}
            <input className={inp} type="email" placeholder="Email" value={f.email} onChange={e => set("email", e.target.value)} required />
            <input className={inp} type="password" placeholder="Password (min 8 characters)" value={f.password} onChange={e => set("password", e.target.value)} required />
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: PURPLE }}>
              {busy ? "Please wait…" : mode === "signup" ? "Start free trial" : "Log in"}
            </button>
            {mode === "signup" && <p className="text-[11px] text-center text-slate-400">30 minutes free. No credit card.</p>}
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          <a href="/igcse" className="underline">← Back to overview</a>
        </p>
      </div>
    </div>
  );
}

// ── Signed-in dashboard ──────────────────────────────────────────────────────
function Dashboard({ status }: { status: any }) {
  const sub = status.subscription;
  const ft = status.freeTrial as { totalSec: number; usedSec: number; remainingSec: number };
  const remainingMin = Math.floor((ft?.remainingSec ?? 0) / 60);
  const usedMin = Math.floor((ft?.usedSec ?? 0) / 60);

  const checkout = trpc.igcse.createCheckout.useMutation({
    onSuccess: d => { if (d?.invoiceUrl) window.location.href = d.invoiceUrl; },
    onError: e => alert(e?.message || "Couldn't open checkout. Please try again."),
  });
  const logout = trpc.studentPortal.logout.useMutation({ onSuccess: () => window.location.reload() });

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title="IGCSE Math AI Teacher — Your classroom" description="Your IGCSE Math AI Teacher classroom." noindex />
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-violet-700">SpecTa</span>
            <span className="font-bold text-slate-700">· IGCSE Math AI</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a href="https://www.spectaeducation.com" className="hidden sm:inline text-slate-400 hover:text-slate-700">← Main site</a>
            {sub
              ? <span className="text-green-700 font-medium">✓ Active</span>
              : <span className="text-slate-500">{remainingMin} min trial left</span>}
            <button onClick={() => logout.mutate()} className="text-slate-500 hover:text-slate-700 underline">Log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Headline status */}
        <div className={`${card} p-6`}>
          {sub ? (
            <>
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">✓ Subscription active</div>
              <p className="text-sm text-slate-600">
                Plan: <strong>{sub.plan === "m1" ? "1 Month — 30 hours" : sub.plan}</strong>
                {sub.expiresAt ? <> · renews/expires <strong>{new Date(sub.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</strong></> : null}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">🎁 Free trial</div>
              <p className="text-sm text-slate-600">
                <strong>{remainingMin}</strong> of 30 free minutes remaining
                {usedMin > 0 ? <> ({usedMin} min used)</> : null}.
              </p>
            </>
          )}
        </div>

        {/* Two main modes: Learn (Socratic chat) vs Practice (graded exam questions) */}
        <div className="grid sm:grid-cols-2 gap-3">
          <a href="#topics" className={`${card} p-5 hover:border-violet-400 transition`}>
            <div className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-1">📚 Learn mode</div>
            <h3 className="font-bold text-slate-900">Start a lesson</h3>
            <p className="text-sm text-slate-600 mt-1">Pick a topic and chat with the AI Teacher — she'll explain step by step on the digital board, by voice or text.</p>
          </a>
          <Link href="/igcse/practice" className={`${card} p-5 hover:border-violet-400 transition`}>
            <div className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-1">📝 Exam Practice</div>
            <h3 className="font-bold text-slate-900">Try exam-style questions</h3>
            <p className="text-sm text-slate-600 mt-1">Tackle Cambridge-style questions — the AI grades each step of your working and guides you when you're stuck, without giving the answer.</p>
          </Link>
        </div>

        {/* Topic picker — pick a Cambridge syllabus topic and start a lesson. */}
        <div id="topics" />
        <TopicPicker disabled={!status.hasAccess} disabledReason={!status.hasAccess ? "Your free trial is done. Subscribe below to keep learning." : undefined} />

        {/* Subscribe card — hidden once active */}
        {!sub && (
          <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(120deg, ${PURPLE}, ${PINK})` }}>
            <div className="font-bold text-lg">Unlock unlimited learning</div>
            <p className="text-white/85 text-sm mt-0.5">
              Free trial gives you a taste. The full plan unlocks the whole Cambridge IGCSE 0580 Extended syllabus, 30 hours/month.
            </p>
            <div className="mt-4 rounded-xl bg-white/15 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-white/80">1 Month plan</div>
                <div className="font-extrabold text-2xl">Rp 299.000</div>
                <div className="text-xs text-white/80">30 hours of tutoring · cancel anytime</div>
              </div>
              <button
                onClick={() => checkout.mutate({ plan: "m1" })}
                disabled={checkout.isPending}
                className="bg-white text-violet-700 font-bold px-5 py-2.5 rounded-xl shadow disabled:opacity-60"
              >
                {checkout.isPending ? "Opening…" : "Subscribe →"}
              </button>
            </div>
            <p className="text-[11px] text-white/70 mt-3">Secure payment via Xendit (cards, e-wallets, bank transfer).</p>
          </div>
        )}

        {/* Recent lessons */}
        <RecentLessons />

        {/* What's coming next */}
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-slate-900 mb-1.5">What's coming soon</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
            <li><strong>Interactive whiteboard</strong> — the AI's working appears step-by-step (Weeks 4–5).</li>
            <li><strong>Voice mode</strong> — talk to the tutor like a real lesson (Week 6).</li>
            <li>For now: <strong>text chat with topic-grounded AI teaching</strong> — try it above.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

// ── Topic picker ─────────────────────────────────────────────────────────────
function TopicPicker({ disabled, disabledReason }: { disabled?: boolean; disabledReason?: string }) {
  const topics = trpc.igcse.listTopics.useQuery(undefined, { staleTime: 5 * 60_000 });
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "id">("en");
  const [, setLocation] = useLocation();
  const create = trpc.igcse.createSession.useMutation({
    onSuccess: (s) => { if (s?.id) setLocation(`/igcse/lesson/${s.id}`); },
    onError: (e) => alert(e?.message || "Couldn't start the lesson — please try again."),
  });

  const areas = useMemo(() => {
    const map = new Map<string, { code: string; name: string; items: any[] }>();
    for (const t of (topics.data || [])) {
      const cur = map.get(t.areaCode) || { code: t.areaCode, name: t.areaName, items: [] };
      cur.items.push(t);
      map.set(t.areaCode, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [topics.data]);

  return (
    <div className={`${card} p-6`}>
      <div className="flex items-center justify-between mb-1 gap-3">
        <h2 className="text-lg font-bold text-slate-900">Pick a topic to learn 📚</h2>
        <span className="text-[11px] font-mono text-violet-700 bg-violet-50 px-2 py-0.5 rounded hidden sm:inline">CAMBRIDGE 0580 · EXTENDED</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-slate-600 flex-1 min-w-0">Choose any topic — the AI will guide you through it step by step.</p>
        <div className="inline-flex rounded-md border border-slate-300 overflow-hidden text-xs" role="group" aria-label="Lesson language">
          <span className="px-2 py-1 bg-slate-50 text-slate-500 border-r border-slate-300">Language</span>
          <button type="button" onClick={() => setLang("en")}
            className={`px-2 py-1 font-semibold ${lang === "en" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>EN</button>
          <button type="button" onClick={() => setLang("id")}
            className={`px-2 py-1 font-semibold border-l border-slate-300 ${lang === "id" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>ID</button>
        </div>
      </div>

      {disabled && (
        <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{disabledReason}</div>
      )}

      {topics.isLoading ? (
        <div className="text-center text-slate-400 py-10 text-sm">Loading syllabus…</div>
      ) : !areas.length ? (
        <div className="text-center text-slate-400 py-10 text-sm">Topic tree is being prepared — refresh in a moment.</div>
      ) : (
        <div className="space-y-2">
          {areas.map(a => {
            const open = openArea === a.code;
            return (
              <div key={a.code} className="border border-slate-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOpenArea(open ? null : a.code)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-mono text-violet-700 bg-violet-50 px-2 py-0.5 rounded">{a.code}</span>
                    <span className="font-semibold text-slate-900">{a.name}</span>
                    <span className="text-xs text-slate-400">· {a.items.length} topics</span>
                  </span>
                  <span className="text-slate-400">{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-4 py-3 grid sm:grid-cols-2 gap-2">
                    {a.items.map((t: any) => (
                      <button
                        key={t.id}
                        disabled={disabled || create.isPending}
                        onClick={() => create.mutate({ topicId: t.id, language: lang })}
                        className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-violet-400 hover:bg-violet-50 disabled:opacity-50 disabled:hover:bg-white text-sm group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-slate-400">{t.code}</span>
                          <span className="text-[10px] text-violet-600 opacity-0 group-hover:opacity-100">Start →</span>
                        </div>
                        <div className="font-medium text-slate-800 mt-0.5">{t.title}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Recent lessons ───────────────────────────────────────────────────────────
function RecentLessons() {
  const list = trpc.igcse.listSessions.useQuery({ limit: 10 });
  if (!list.data?.length) return null;
  return (
    <div className={`${card} p-5`}>
      <h3 className="font-semibold text-slate-900 mb-2">Recent lessons</h3>
      <div className="divide-y">
        {list.data.map((s: any) => (
          <Link
            key={s.id}
            href={`/igcse/lesson/${s.id}`}
            className="flex items-center justify-between py-2 text-sm hover:bg-slate-50 rounded px-2 -mx-2"
          >
            <div className="text-slate-700">
              Lesson #{s.id}
              <span className="text-slate-400"> · {new Date(s.startedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
              {s.durationSec > 0 && <span className="text-slate-400"> · {Math.round(s.durationSec / 60)} min</span>}
            </div>
            <span className="text-xs text-slate-400">{s.status === "active" ? "in progress" : "ended"} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
