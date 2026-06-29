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

// ── Dashboard imagery (generated via scripts/generate-igcse-landing-images.ts).
// References R2-backed /files/<key> URLs. If the image hasn't been generated yet
// the <img> onError handler gracefully hides it so the dashboard still looks
// clean. To regenerate: `pnpm tsx scripts/generate-igcse-landing-images.ts`.
const IMG = {
  hero:        "/files/igcse/dashboard/hero.png",
  modeLearn:   "/files/igcse/dashboard/mode-learn.png",
  modePractice:"/files/igcse/dashboard/mode-practice.png",
  math:        "/files/igcse/dashboard/subject-math.png",
  physics:     "/files/igcse/dashboard/subject-physics.png",
  chemistry:   "/files/igcse/dashboard/subject-chemistry.png",
  economics:   "/files/igcse/dashboard/subject-economics.png",
  business:    "/files/igcse/dashboard/subject-business.png",
};

/** <img> that:
 *   • appends ?v=<version> from the server's last-regen timestamp so we
 *     bypass the browser cache after the admin clicks "Regenerate".
 *   • hides itself if the src 404s, so missing assets degrade gracefully. */
function SafeImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const ver = trpc.igcse.dashboardImagesVersion.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  }).data?.version || 0;
  const finalSrc = ver > 0 ? `${src}?v=${ver}` : src;
  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

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
    document.title = "IGCSE AI Teacher — SpecTa Education";
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
      <SEO title="IGCSE AI Teacher — Sign in" description="Sign in to start your free trial of the IGCSE AI Teacher." noindex />
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="https://www.spectaeducation.com" className="flex items-center gap-2" title="Back to SpecTa Education">
            <span className="font-extrabold text-violet-700">SpecTa</span>
            <span className="font-bold text-slate-700">· IGCSE AI</span>
          </a>
          <a href="https://www.spectaeducation.com" className="hidden sm:inline text-sm font-medium text-slate-500 hover:text-slate-900">← Main site</a>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-10 pb-16">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-2xl font-extrabold text-slate-900">Start your free trial</h1>
          <p className="text-sm text-slate-500 mt-1">30 minutes free with the IGCSE AI Teacher. No card needed.</p>
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
      <SEO title="IGCSE AI Teacher — Your classroom" description="Your IGCSE AI Teacher classroom." noindex />
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-violet-700">SpecTa</span>
            <span className="font-bold text-slate-700">· IGCSE AI</span>
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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ── HERO ───────────────────────────────────────────────────────────
            Big welcome banner with a student image. Status (subscription
            or trial counter) lives on top of the gradient so it's the
            first thing the student sees on every visit. */}
        <section
          className="relative overflow-hidden rounded-3xl shadow-lg"
          style={{ background: `linear-gradient(120deg, ${PURPLE} 0%, ${PINK} 100%)` }}
        >
          <div className="grid md:grid-cols-[1.3fr_1fr] gap-0 items-stretch">
            <div className="p-7 md:p-10 text-white relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-3">
                ✨ Cambridge IGCSE · 5 subjects
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold leading-tight">
                Selamat datang —<br />
                ready to learn today?
              </h1>
              <p className="text-white/90 mt-3 max-w-md text-sm md:text-base">
                Math, Physics, Chemistry, Economics, Business. Talk to your AI teacher
                by voice, watch her work on the digital board, and practise exam-style questions.
              </p>

              {/* Status pill — subscription state or free-trial remaining */}
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-sm">
                {sub ? (
                  <>
                    <span className="text-emerald-200 font-bold">✓ Subscription active</span>
                    <span className="text-white/70">·</span>
                    <span className="text-white">{sub.plan === "m1" ? "1 Month — 30 hours" : sub.plan}</span>
                    {sub.expiresAt && (
                      <>
                        <span className="text-white/70">·</span>
                        <span className="text-white">expires {new Date(sub.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-amber-200 font-bold">🎁 Free trial</span>
                    <span className="text-white/70">·</span>
                    <span className="text-white"><strong>{remainingMin}</strong> of 30 minutes left</span>
                  </>
                )}
              </div>
            </div>
            <div className="relative h-48 md:h-auto">
              <SafeImg
                src={IMG.hero}
                alt="Indonesian high-school student studying"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Subtle gradient fade so the image blends into the gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700/40 via-transparent to-transparent md:from-purple-700/30 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* ── TWO MODES — image-rich Learn vs Practice cards ─────────────── */}
        <section className="grid sm:grid-cols-2 gap-4">
          <a href="#topics" className={`${card} group overflow-hidden hover:border-violet-400 hover:shadow-md transition`}>
            <div className="relative h-40 bg-violet-50">
              <SafeImg
                src={IMG.modeLearn}
                alt="Student in a one-to-one lesson with the AI Teacher"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/0 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-xs font-bold uppercase tracking-wider text-violet-700">
                📚 Learn mode
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-slate-900">Start a lesson</h3>
              <p className="text-sm text-slate-600 mt-1">Pick a topic and chat with the AI Teacher — she'll explain step-by-step on the digital board, by voice or text.</p>
              <div className="mt-3 text-sm font-semibold text-violet-700 group-hover:translate-x-1 transition">Pick a topic →</div>
            </div>
          </a>
          <Link href="/igcse/practice" className={`${card} group overflow-hidden hover:border-violet-400 hover:shadow-md transition`}>
            <div className="relative h-40 bg-rose-50">
              <SafeImg
                src={IMG.modePractice}
                alt="Student practising Cambridge exam-style questions"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/0 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-xs font-bold uppercase tracking-wider text-rose-700">
                📝 Exam Practice
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-slate-900">Try exam-style questions</h3>
              <p className="text-sm text-slate-600 mt-1">Tackle Cambridge-style questions — the AI grades each step of your working and guides you when you're stuck, without giving the answer away.</p>
              <div className="mt-3 text-sm font-semibold text-rose-700 group-hover:translate-x-1 transition">Try a question →</div>
            </div>
          </Link>
        </section>

        {/* ── SUBJECTS at-a-glance — visual subject gallery ──────────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2 className="text-lg font-bold text-slate-900">Your 5 subjects</h2>
            <span className="text-xs text-slate-500">Click any subject to start →</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SubjectTile href="#topics" image={IMG.math}      emoji="📐" name="Mathematics"    syllabus="0580" colour="violet" />
            <SubjectTile href="#topics" image={IMG.physics}   emoji="⚛️" name="Physics"        syllabus="0625" colour="sky" />
            <SubjectTile href="#topics" image={IMG.chemistry} emoji="🧪" name="Chemistry"      syllabus="0620" colour="emerald" />
            <SubjectTile href="#topics" image={IMG.economics} emoji="💹" name="Economics"      syllabus="0455" colour="amber" />
            <SubjectTile href="#topics" image={IMG.business}  emoji="💼" name="Business Studies" syllabus="0450" colour="rose" />
          </div>
        </section>

        {/* ── Topic picker (Learn-mode launcher) ─────────────────────────── */}
        <div id="topics" />
        <TopicPicker disabled={!status.hasAccess} disabledReason={!status.hasAccess ? "Your free trial is done. Subscribe below to keep learning." : undefined} />

        {/* ── Subscribe — 3-tier picker (hidden once active) ─────────────── */}
        {!sub && <SubscribeCard checkout={checkout} />}

        {/* ── Recent lessons ─────────────────────────────────────────────── */}
        <RecentLessons />

        {/* ── How it works strip (replaces stale 'Coming soon') ──────────── */}
        <section className={`${card} p-6`}>
          <h3 className="font-bold text-slate-900 mb-3">How your AI teacher works</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-2xl mb-1">🎙️</div>
              <div className="font-semibold text-slate-800">Speak naturally</div>
              <p className="text-slate-600 mt-0.5">Ask out loud in English or Bahasa — the AI listens and answers in real time.</p>
            </div>
            <div>
              <div className="text-2xl mb-1">✏️</div>
              <div className="font-semibold text-slate-800">Watch her write</div>
              <p className="text-slate-600 mt-0.5">Equations, diagrams and working appear step-by-step on a shared digital whiteboard.</p>
            </div>
            <div>
              <div className="text-2xl mb-1">🎯</div>
              <div className="font-semibold text-slate-800">Get exam-ready</div>
              <p className="text-slate-600 mt-0.5">Practice Cambridge-style questions, graded with M/A mark conventions, with hints when you're stuck.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Subscribe card — 3-tier picker + Monthly/Annual toggle + subjects + parent email ──
// Carries all the state for the checkout flow. Calls igcse.createCheckout when
// the student clicks the tier's button; backend redirects to the Xendit hosted invoice.

const PLAN_DEFS = {
  m1: { tier: 1, subjects: 1, hours:  6, monthly: 399_000 },
  m2: { tier: 2, subjects: 2, hours: 12, monthly: 699_000 },
  m3: { tier: 3, subjects: 3, hours: 18, monthly: 849_000 },
  a1: { tier: 1, subjects: 1, hours:  6, monthly: 399_000, annual: 3_990_000 },
  a2: { tier: 2, subjects: 2, hours: 12, monthly: 699_000, annual: 6_990_000 },
  a3: { tier: 3, subjects: 3, hours: 18, monthly: 849_000, annual: 8_490_000 },
} as const;

type SubjectKey = "math" | "physics" | "chemistry" | "economics" | "business";
const SUBJECT_OPTIONS: { key: SubjectKey; emoji: string; name: string; syllabus: string }[] = [
  { key: "math",      emoji: "📐", name: "Mathematics",      syllabus: "0580" },
  { key: "physics",   emoji: "⚛️", name: "Physics",          syllabus: "0625" },
  { key: "chemistry", emoji: "🧪", name: "Chemistry",        syllabus: "0620" },
  { key: "economics", emoji: "💹", name: "Economics",        syllabus: "0455" },
  { key: "business",  emoji: "💼", name: "Business Studies", syllabus: "0450" },
];
const fmtIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

function SubscribeCard({ checkout }: { checkout: any }) {
  const [tier, setTier] = useState<1 | 2 | 3>(2); // default highlight the popular middle
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [subjects, setSubjects] = useState<SubjectKey[]>(["math"]);
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");

  // Resolve the plan code from tier + period.
  const planCode = (period === "annual" ? `a${tier}` : `m${tier}`) as "m1"|"m2"|"m3"|"a1"|"a2"|"a3";
  const plan = PLAN_DEFS[planCode];

  // Cap the subjects array to the tier's subjectsLimit so the UI can't get
  // out of sync (e.g. user picks 3 subjects then drops to Tier 1).
  useEffect(() => {
    setSubjects(prev => prev.slice(0, tier));
  }, [tier]);

  const toggleSubject = (k: SubjectKey) => {
    setSubjects(prev => {
      if (prev.includes(k)) return prev.filter(s => s !== k);
      if (prev.length >= tier) return [...prev.slice(1), k]; // FIFO — kick the oldest selection
      return [...prev, k];
    });
  };

  const total = period === "annual" ? (PLAN_DEFS[`a${tier}` as const].annual!) : plan.monthly;
  const annualSaving = PLAN_DEFS[`a${tier}` as const];
  const savings = period === "annual" && annualSaving.annual ? (annualSaving.monthly * 12 - annualSaving.annual) : 0;

  const isValidEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parentEmail.trim());
  const canSubscribe = subjects.length === tier && isValidEmail && !checkout.isPending;

  return (
    <div className="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl" style={{ background: `linear-gradient(120deg, ${PURPLE}, ${PINK})` }}>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/80 font-bold">Choose your plan</div>
            <div className="font-extrabold text-xl md:text-2xl">Bayar 1 bimbel, dapat hingga 3 mata pelajaran</div>
          </div>
          {/* Monthly / Annual toggle */}
          <div className="inline-flex rounded-full bg-white/15 backdrop-blur-sm p-1 text-xs">
            <button type="button" onClick={() => setPeriod("monthly")}
              className={`px-3 py-1.5 rounded-full font-semibold ${period === "monthly" ? "bg-white text-violet-700" : "text-white/90"}`}>Monthly</button>
            <button type="button" onClick={() => setPeriod("annual")}
              className={`px-3 py-1.5 rounded-full font-semibold ${period === "annual" ? "bg-white text-violet-700" : "text-white/90"}`}>
              Annual <span className="ml-1 text-[10px] bg-amber-300 text-amber-900 px-1.5 py-0.5 rounded-full">2 bulan gratis</span>
            </button>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          {([1, 2, 3] as const).map(t => {
            const p = PLAN_DEFS[`m${t}` as const];
            const aprice = PLAN_DEFS[`a${t}` as const].annual!;
            const display = period === "annual" ? aprice : p.monthly;
            const isSelected = tier === t;
            return (
              <button type="button" key={t} onClick={() => setTier(t)}
                className={`text-left rounded-2xl p-4 transition border-2 ${isSelected ? "bg-white text-slate-900 border-white shadow-lg" : "bg-white/10 text-white border-white/20 hover:bg-white/15"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-violet-700" : "text-white/80"}`}>{t} {t === 1 ? "subject" : "subjects"}</span>
                  {t === 2 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isSelected ? "bg-amber-100 text-amber-800" : "bg-amber-300 text-amber-900"}`}>POPULAR</span>}
                </div>
                <div className="font-extrabold text-2xl">{fmtIDR(display)}</div>
                <div className={`text-xs ${isSelected ? "text-slate-500" : "text-white/70"}`}>
                  {p.hours} hours/month · pooled
                  {period === "annual" && <><br />= 12 months for the price of 10</>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Subject picker */}
        <div className="mt-5">
          <div className="text-sm font-semibold mb-2">
            Pick {tier} {tier === 1 ? "subject" : "subjects"} ({subjects.length} of {tier} selected)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SUBJECT_OPTIONS.map(s => {
              const isSelected = subjects.includes(s.key);
              return (
                <button type="button" key={s.key} onClick={() => toggleSubject(s.key)}
                  className={`rounded-xl p-3 text-left transition border-2 ${isSelected ? "bg-white text-slate-900 border-white shadow" : "bg-white/10 text-white border-white/20 hover:bg-white/15"}`}>
                  <div className="text-xl">{s.emoji}</div>
                  <div className="text-xs font-semibold mt-1">{s.name}</div>
                  <div className={`text-[10px] font-mono ${isSelected ? "text-violet-600" : "text-white/70"}`}>CIE {s.syllabus}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parent email */}
        <div className="mt-5">
          <div className="text-sm font-semibold mb-2">Parent details — for the weekly progress report</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              type="email"
              placeholder="parent@email.com"
              value={parentEmail}
              onChange={e => setParentEmail(e.target.value)}
              className="bg-white/95 text-slate-900 placeholder:text-slate-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <input
              type="text"
              placeholder="Parent name (optional)"
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              className="bg-white/95 text-slate-900 placeholder:text-slate-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <p className="text-[11px] text-white/75 mt-1.5">
            We send a weekly progress report every Sunday (hours used + topics covered + what to focus on next).
          </p>
        </div>

        {/* Total + CTA */}
        <div className="mt-6 rounded-2xl bg-white/15 p-4 backdrop-blur-sm flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/80">{period === "annual" ? "Annual total" : "Monthly total"}</div>
            <div className="font-extrabold text-3xl">{fmtIDR(total)}</div>
            {savings > 0 && <div className="text-xs text-amber-200 font-semibold">Save {fmtIDR(savings)} vs monthly</div>}
          </div>
          <button
            onClick={() => checkout.mutate({
              plan: planCode,
              subjects,
              parentEmail: parentEmail.trim(),
              parentName: parentName.trim() || undefined,
            })}
            disabled={!canSubscribe}
            className="bg-white text-violet-700 font-bold px-6 py-3 rounded-xl shadow disabled:opacity-50"
          >
            {checkout.isPending ? "Opening Xendit…" : "Subscribe →"}
          </button>
        </div>
        {!isValidEmail && parentEmail.length > 0 && (
          <p className="text-xs text-amber-200 mt-2">Please enter a valid parent email.</p>
        )}
        {subjects.length !== tier && (
          <p className="text-xs text-amber-200 mt-2">Pick exactly {tier} {tier === 1 ? "subject" : "subjects"} to continue.</p>
        )}
        <p className="text-[11px] text-white/70 mt-3">Secure payment via Xendit (cards, e-wallets, bank transfer). Cancel anytime.</p>
      </div>
    </div>
  );
}

// ── Subject tile — pretty card with student image + name + syllabus chip ──
function SubjectTile({
  href, image, emoji, name, syllabus, colour,
}: {
  href: string;
  image: string;
  emoji: string;
  name: string;
  syllabus: string;
  colour: "violet" | "sky" | "emerald" | "amber" | "rose";
}) {
  // Colour palette per subject — keeps the tile gallery visually distinct.
  const palette: Record<string, { bg: string; text: string; ring: string }> = {
    violet:  { bg: "bg-violet-50",  text: "text-violet-700",  ring: "hover:ring-violet-300" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-700",     ring: "hover:ring-sky-300" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "hover:ring-emerald-300" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   ring: "hover:ring-amber-300" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-700",    ring: "hover:ring-rose-300" },
  };
  const p = palette[colour];
  return (
    <a href={href}
       className={`${card} group overflow-hidden hover:shadow-md transition hover:ring-2 ${p.ring}`}>
      <div className={`relative h-28 ${p.bg}`}>
        <SafeImg
          src={image}
          alt={`${name} student`}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
        <div className="absolute top-1.5 left-1.5 text-xl drop-shadow-sm">{emoji}</div>
      </div>
      <div className="p-3">
        <div className="font-semibold text-slate-900 text-sm leading-tight">{name}</div>
        <div className={`text-[10px] font-mono ${p.text} mt-0.5`}>CIE {syllabus}</div>
      </div>
    </a>
  );
}

// ── Topic picker ─────────────────────────────────────────────────────────────
function TopicPicker({ disabled, disabledReason }: { disabled?: boolean; disabledReason?: string }) {
  const [subject, setSubject] = useState<"math" | "physics" | "economics" | "business" | "chemistry">("math");
  const topics = trpc.igcse.listTopics.useQuery({ subject }, { staleTime: 5 * 60_000 });
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "id">("en");
  const [, setLocation] = useLocation();
  const create = trpc.igcse.createSession.useMutation({
    onSuccess: (s) => { if (s?.id) setLocation(`/igcse/lesson/${s.id}`); },
    onError: (e) => alert(e?.message || "Couldn't start the lesson — please try again."),
  });

  // Reset open accordion when switching subject so users see the new tree.
  useEffect(() => { setOpenArea(null); }, [subject]);

  const areas = useMemo(() => {
    const map = new Map<string, { code: string; name: string; items: any[] }>();
    for (const t of (topics.data || [])) {
      const cur = map.get(t.areaCode) || { code: t.areaCode, name: t.areaName, items: [] };
      cur.items.push(t);
      map.set(t.areaCode, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [topics.data]);

  const syllabusLabel =
    subject === "physics"   ? "CAMBRIDGE 0625 · EXTENDED"
  : subject === "economics" ? "CAMBRIDGE 0455"
  : subject === "business"  ? "CAMBRIDGE 0450"
  : subject === "chemistry" ? "CAMBRIDGE 0620 · EXTENDED"
  :                           "CAMBRIDGE 0580 · EXTENDED";

  return (
    <div className={`${card} p-6`}>
      <div className="flex items-center justify-between mb-1 gap-3">
        <h2 className="text-lg font-bold text-slate-900">Pick a topic to learn 📚</h2>
        <span className="text-[11px] font-mono text-violet-700 bg-violet-50 px-2 py-0.5 rounded hidden sm:inline">{syllabusLabel}</span>
      </div>

      {/* Subject toggle: Math / Physics / Economics */}
      <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-sm mb-3 flex-wrap" role="group" aria-label="Subject">
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
