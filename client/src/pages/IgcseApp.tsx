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
import { useEffect, useRef, useState } from "react";
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

        {/* Classroom placeholder (the session room lands in Weeks 3–6) */}
        <div className={`${card} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your classroom 🎓</h2>
              <p className="text-sm text-slate-600 mt-1">
                The interactive whiteboard + voice classroom is rolling out in private beta.
                You're locked in early — we'll email you the moment it opens to your account.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap">PRIVATE BETA</span>
          </div>
        </div>

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

        {/* What's coming next */}
        <div className={`${card} p-6`}>
          <h3 className="font-semibold text-slate-900 mb-2">What's coming next</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
            <li>Pick any topic from the Cambridge IGCSE 0580 tree.</li>
            <li>Talk to the AI tutor in real time — in English or Bahasa.</li>
            <li>Watch step-by-step working appear on a digital whiteboard.</li>
            <li>Sketch your own answers — the AI checks your working.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
