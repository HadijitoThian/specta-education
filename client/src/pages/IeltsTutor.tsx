/**
 * AI IELTS Tutor — standalone student app (/ielts/tutor).
 *
 * Reuses the student-portal account engine (studentPortal.selfRegister/login →
 * student_portal_token → leadId), but is a self-contained tutor experience:
 * sign up → free taster (1 writing + 1 speaking) → subscribe. Speaking + Writing
 * with corrective feedback from the tutor engine.
 */
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

const PINK = "#E91E8C";
const PURPLE = "#9C27B0";
const CORAL = "#FF6B4A";
const LOGO = "https://www.spectaeducation.com/files/migrated/QxrYSewOYzAuPIEN.jpeg";
const IMG_STUDENTS = "/files/migrated/QxFYGzgmpzrKbZOs.jpg";
const IMG_MASCOT = "/files/migrated/saxLOcubreWkfnzl.png";
// AI-generated (DeepInfra) landing imagery; falls back to the students photo
// until the server has generated them (~1 min after deploy).
// ?v= cache-buster: avoids browsers serving a stale 404 cached before the
// server finished generating the images (bump when regenerating).
const GEN_HERO = "/files/tutor/landing/hero.jpg?v=2";
const GEN_WRITING = "/files/tutor/landing/writing.jpg?v=2";
const GEN_SPEAKING = "/files/tutor/landing/speaking.jpg?v=2";
const GEN_COMMUNITY = "/files/tutor/landing/community.jpg?v=2";
const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_STUDENTS; };

const PLANS = [
  { id: "w2", label: "2 Weeks", price: "Rp 149.000", per: "Exam sprint" },
  { id: "m1", label: "1 Month", price: "Rp 249.000", per: "Unlimited practice", tag: "Most popular" },
];

const card = "bg-white rounded-2xl shadow-sm border border-slate-200";
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300";
const bandColor = (b: number) => (b >= 7 ? "#16a34a" : b >= 6 ? "#f59e0b" : "#ef4444");

function Band({ value }: { value: number }) {
  return <span className="inline-flex items-center justify-center rounded-lg text-white font-bold text-sm px-2 py-0.5" style={{ background: bandColor(value) }}>{value.toFixed(1)}</span>;
}
function CriteriaRow({ label, c }: { label: string; c: any }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Band value={Number(c?.band || 0)} />
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-500">{c?.comment}</div>
      </div>
    </div>
  );
}

export default function IeltsTutor() {
  const utils = trpc.useUtils();
  const status = trpc.tutor.status.useQuery(undefined, { retry: false });

  if (status.isLoading) return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  if (!status.data?.loggedIn) return <AuthGate onAuthed={() => utils.tutor.status.invalidate()} />;
  return <TutorApp status={status.data} />;
}

// ── Landing / sales page + auth ───────────────────────────────────────────────
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
      if (f.password.length < 8) return setErr("Password must be at least 8 characters.");
      register.mutate({ name: f.name, email: f.email, phone: f.phone || undefined, password: f.password });
    } else {
      login.mutate({ email: f.email, password: f.password });
    }
  };

  const goForm = (m: "signup" | "login" = "signup") => { setMode(m); document.getElementById("daftar")?.scrollIntoView({ behavior: "smooth", block: "center" }); };

  const AuthCard = (
    <div id="daftar" className={`${card} p-6 scroll-mt-24`}>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "signup" ? "text-white" : "text-slate-600 bg-slate-100"}`} style={mode === "signup" ? { background: PINK } : {}}>Sign up free</button>
        <button onClick={() => setMode("login")} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "login" ? "text-white" : "text-slate-600 bg-slate-100"}`} style={mode === "login" ? { background: PINK } : {}}>Log in</button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <>
            <input className={inp} placeholder="Full name" value={f.name} onChange={e => set("name", e.target.value)} />
            <input className={inp} placeholder="WhatsApp number (optional)" value={f.phone} onChange={e => set("phone", e.target.value)} />
          </>
        )}
        <input className={inp} type="email" placeholder="Email" value={f.email} onChange={e => set("email", e.target.value)} required />
        <input className={inp} type="password" placeholder="Password (min 8 characters)" value={f.password} onChange={e => set("password", e.target.value)} required />
        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: PINK }}>
          {busy ? "Please wait…" : mode === "signup" ? "Start Free Now" : "Log in"}
        </button>
        {mode === "signup" && <p className="text-[11px] text-center text-slate-400">Free 1 Writing + 1 Speaking. No credit card.</p>}
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2"><img src={LOGO} alt="SpecTa" className="h-8 object-contain" /><span className="font-bold">AI IELTS Tutor</span></div>
          <button onClick={() => goForm("login")} className="text-sm font-medium text-slate-600 hover:text-slate-900">Log in</button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: `radial-gradient(900px 400px at 80% -10%, ${PINK}22, transparent), radial-gradient(700px 400px at 0% 10%, ${PURPLE}1a, transparent)` }} />
        <div className="max-w-6xl mx-auto px-4 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${PINK}1a`, color: PINK }}>🎓 Your personal AI IELTS tutor</span>
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mt-4">Raise your <span style={{ color: PINK }}>IELTS</span> band — starting today.</h1>
            <p className="text-lg text-slate-600 mt-4">Practice <strong>Speaking</strong> & <strong>Writing</strong> anytime. The AI scores your band, shows you <strong>every mistake</strong>, and gives you a <strong>higher-band model answer</strong> — like having a private IELTS teacher 24/7.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={() => goForm("signup")} className="px-6 py-3 rounded-xl text-white font-semibold shadow-lg" style={{ background: PINK }}>Try Free Now →</button>
              <a href="#pricing" className="px-6 py-3 rounded-xl font-semibold border border-slate-300">See Pricing</a>
            </div>
            <p className="text-sm text-slate-500 mt-3">✅ Free 1 Writing + 1 Speaking · no credit card</p>
          </div>
          <div className="lg:pl-6">{AuthCard}</div>
        </div>
        {/* Hero image band */}
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="relative rounded-3xl overflow-hidden h-52 lg:h-72 shadow-md">
            <img src={GEN_HERO} onError={onImgErr} alt="Student practising English for IELTS with SpecTa" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${PURPLE}cc, transparent 60%)` }} />
            <div className="absolute inset-0 flex items-center">
              <p className="text-white font-bold text-xl lg:text-2xl px-6 lg:px-10 max-w-md">Join thousands of Indonesian students reaching their target band.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[["Since 2005", "Trusted consultant"], ["10,000+", "Students trained"], ["200+", "Scholarships"], ["4.9★", "Rating"]].map(([a, b]) => (
            <div key={a}><div className="text-2xl font-extrabold" style={{ color: PURPLE }}>{a}</div><div className="text-xs text-slate-500">{b}</div></div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-4xl mx-auto px-4 py-14 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold">Studying for IELTS alone is hard.</h2>
        <p className="text-slate-600 mt-3">You write essays but don't know what's wrong. You practice speaking but no one scores you. Private IELTS tutoring is expensive and rigid. <strong>AI Tutor fixes all of it</strong> — instant feedback, anytime, at an affordable price.</p>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl lg:text-3xl font-bold text-center">How it works — 3 steps</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {[["1", "Practice", "Write a Task 1/2 essay, or answer a speaking question out loud."], ["2", "AI scores it", "Get an estimated band across all 4 criteria + every mistake corrected."], ["3", "Improve", "See a higher-band model answer & a practice plan. Repeat, track your progress."]].map(([n, t, d]) => (
              <div key={n} className={`${card} p-6 text-center`}>
                <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white font-bold" style={{ background: PINK }}>{n}</div>
                <h3 className="font-bold mt-3">{t}</h3>
                <p className="text-sm text-slate-500 mt-1">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature deep-dives */}
      <section className="max-w-5xl mx-auto px-4 py-14 grid md:grid-cols-2 gap-6">
        <div className={`${card} overflow-hidden`}>
          <img src={GEN_WRITING} onError={onImgErr} alt="Writing practice" className="w-full h-40 object-cover" />
          <div className="p-7">
            <div className="text-4xl">✍️</div>
            <h3 className="text-xl font-bold mt-2">Writing Coach</h3>
            <p className="text-slate-600 mt-1">Write Task 1 or Task 2 — scored like a real examiner.</p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {["Band across the 4 official IELTS criteria", "Sentence-by-sentence corrections: what's wrong & how to fix it", "A band-8 model answer built from your own essay", "A practice plan targeting your weaknesses"].map(x => <li key={x} className="flex gap-2"><span style={{ color: PINK }}>✓</span>{x}</li>)}
            </ul>
          </div>
        </div>
        <div className={`${card} overflow-hidden`}>
          <img src={GEN_SPEAKING} onError={onImgErr} alt="Speaking practice" className="w-full h-40 object-cover" />
          <div className="p-7">
            <div className="text-4xl">🎤</div>
            <h3 className="text-xl font-bold mt-2">Speaking Partner</h3>
            <p className="text-slate-600 mt-1">An AI examiner asks, you answer out loud — scored instantly.</p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {["Part 1, 2 & 3 questions like the real test", "Band for fluency, vocabulary, grammar & pronunciation", "Filler-word & speaking-rate analysis", "A model answer + your own answer, upgraded"].map(x => <li key={x} className="flex gap-2"><span style={{ color: PINK }}>✓</span>{x}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* Credibility band with photo */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8 items-center">
          <div className="rounded-2xl overflow-hidden h-56 shadow-sm"><img src={GEN_COMMUNITY} onError={onImgErr} alt="Indonesian students succeeding with SpecTa" className="w-full h-full object-cover" /></div>
          <div>
            <h2 className="text-2xl font-bold">Backed by SpecTa Education</h2>
            <p className="text-slate-600 mt-2">We've helped Indonesian students master English and study abroad since 2005 — <strong>10,000+ students trained</strong> and 200+ scholarships won. The same expertise now powers your AI tutor.</p>
            <button onClick={() => goForm("signup")} className="mt-4 px-5 py-2.5 rounded-lg text-white font-semibold" style={{ background: PURPLE }}>Start Free</button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-2xl lg:text-3xl font-bold text-center">Why SpecTa AI Tutor?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {[["⚡", "Instant feedback", "Results in seconds, not waiting for a teacher."], ["🕐", "24/7", "Practice whenever you want, as much as you want."], ["💸", "Far cheaper", "A fraction of the cost of private IELTS tutoring."], ["🎯", "Band-descriptor accurate", "Scoring follows the official IELTS criteria."], ["📈", "Track progress", "Watch your band rise over time."], ["🇮🇩", "Built for Indonesians", "Clear explanations and targeted tips."]].map(([i, t, d]) => (
            <div key={t} className={`${card} p-5`}><div className="text-2xl">{i}</div><div className="font-semibold mt-1">{t}</div><div className="text-sm text-slate-500">{d}</div></div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-16 scroll-mt-20">
          <h2 className="text-2xl lg:text-3xl font-bold text-center">Affordable pricing, maximum results</h2>
          <p className="text-center text-slate-500 mt-2">Start free. Subscribe for unlimited practice.</p>
          <div className="grid sm:grid-cols-2 gap-5 mt-8 max-w-2xl mx-auto">
            {PLANS.map(p => (
              <div key={p.id} className={`${card} p-6 text-center relative`} style={p.tag ? { boxShadow: `0 0 0 2px ${PINK}` } as any : {}}>
                {p.tag && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-white px-3 py-0.5 rounded-full" style={{ background: PINK }}>{p.tag}</span>}
                <div className="font-semibold text-slate-700">{p.label}</div>
                <div className="text-3xl font-extrabold my-2">{p.price}</div>
                <div className="text-xs text-slate-500">{p.per}</div>
                <ul className="text-sm text-slate-600 mt-4 space-y-1 text-left">
                  {["Unlimited Writing", "Unlimited Speaking", "Corrections + model answers", "Track your band"].map(x => <li key={x} className="flex gap-2"><span style={{ color: PINK }}>✓</span>{x}</li>)}
                </ul>
                <button onClick={() => goForm("signup")} className="w-full mt-5 py-2.5 rounded-lg text-white font-semibold" style={{ background: p.tag ? PINK : PURPLE }}>Start Free</button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">Try it free — no credit card. Pay only if you love it.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold text-center">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {[
            ["Is it really free?", "Yes — you get 1 full Writing + 1 Speaking evaluation free, with scoring and corrections, no credit card. Subscribe only if you want to keep going."],
            ["How accurate is the scoring?", "The AI scores against the official IELTS band descriptors for each criterion. It's a very helpful estimate for practice, though official scores still come from IELTS."],
            ["Is it good for beginners?", "Absolutely. Every correction comes with an explanation, and a high-band model answer shows you exactly what to aim for."],
            ["Do I need an app?", "No. Just open it in your phone or laptop browser. For speaking, allow microphone access."],
          ].map(([q, a]) => (
            <div key={q} className={`${card} p-4`}><div className="font-semibold">{q}</div><div className="text-sm text-slate-600 mt-1">{a}</div></div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-white relative overflow-hidden" style={{ background: `linear-gradient(120deg, ${PURPLE}, ${PINK})` }}>
        <img src={IMG_MASCOT} alt="" className="hidden sm:block absolute right-6 bottom-0 h-40 opacity-90 pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center relative">
          <h2 className="text-3xl font-extrabold">Ready to raise your IELTS band?</h2>
          <p className="text-white/85 mt-2">Start free today. Your first practice takes 5 minutes.</p>
          <button onClick={() => goForm("signup")} className="mt-6 bg-white rounded-xl px-8 py-3 font-bold" style={{ color: PINK }}>Start Free Now →</button>
        </div>
      </section>

      <footer className="text-center text-xs text-slate-400 py-6">© {new Date().getFullYear()} SpecTa Education · AI IELTS Tutor</footer>
    </div>
  );
}

// ── Logged-in app ─────────────────────────────────────────────────────────────
type View = "home" | "writing" | "speaking";

function TutorApp({ status }: { status: any }) {
  const utils = trpc.useUtils();
  const [view, setView] = useState<View>("home");
  const [openId, setOpenId] = useState<number | null>(null);
  const sub = status.subscription;
  const free = status.freeRemaining || { writing: 0, speaking: 0 };

  const logout = trpc.studentPortal.logout.useMutation({ onSuccess: () => window.location.reload() });
  const goHome = () => { setOpenId(null); setView("home"); };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-2">
            <img src={LOGO} alt="SpecTa" className="h-8 object-contain" />
            <span className="font-bold text-slate-800">AI IELTS Tutor</span>
          </button>
          <div className="flex items-center gap-3 text-sm">
            {sub
              ? <span className="text-green-700 font-medium">✓ {sub.plan === "w2" ? "2 Minggu" : "1 Bulan"}</span>
              : <span className="text-slate-500">Free trial</span>}
            <button onClick={() => logout.mutate()} className="text-slate-500 hover:text-slate-700 underline">Keluar</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {openId != null ? <SessionView id={openId} onBack={goHome} />
          : view === "home" ? <Home free={free} hasSub={!!sub} onPick={setView} onOpen={setOpenId} />
          : view === "writing" ? <WritingCoach onBack={() => { setView("home"); utils.tutor.status.invalidate(); }} />
          : <SpeakingPartner onBack={() => { setView("home"); utils.tutor.status.invalidate(); }} />}
      </main>
    </div>
  );
}

/** Reopen a past session from history, rendering its saved feedback. */
function SessionView({ id, onBack }: { id: number; onBack: () => void }) {
  const q = trpc.tutor.getSession.useQuery({ id });
  if (q.isLoading) return <div className="text-center text-slate-400 py-12">Loading…</div>;
  const s: any = q.data;
  if (!s || !s.feedback) {
    return <div className="py-12 text-center"><button onClick={onBack} className="text-sm text-slate-500">← Kembali</button><div className="text-slate-500 mt-3">Sesi ini tidak bisa dibuka.</div></div>;
  }
  if (s.skill === "writing") return <WritingResult fb={s.feedback} onAgain={onBack} onBack={onBack} />;
  return <SpeakingResult fb={s.feedback} transcript={s.response || ""} audioUrl={s.audioUrl || undefined} onAgain={onBack} onBack={onBack} />;
}

function Home({ free, hasSub, onPick, onOpen }: { free: any; hasSub: boolean; onPick: (v: View) => void; onOpen: (id: number) => void }) {
  const history = trpc.tutor.listSessions.useQuery();
  return (
    <div className="space-y-6">
      {!hasSub && <PricingBanner free={free} />}
      <div className="grid sm:grid-cols-2 gap-4">
        <button onClick={() => onPick("writing")} className={`${card} p-6 text-left hover:shadow-md transition`}>
          <div className="text-3xl">✍️</div>
          <h3 className="font-bold text-lg text-slate-800 mt-2">Writing Coach</h3>
          <p className="text-sm text-slate-500 mt-1">Tulis Task 1/2 → dinilai 4 kriteria, koreksi langsung + contoh jawaban band tinggi.</p>
          {!hasSub && <p className="text-xs mt-2 font-medium" style={{ color: PINK }}>{free.writing} gratis tersisa</p>}
        </button>
        <button onClick={() => onPick("speaking")} className={`${card} p-6 text-left hover:shadow-md transition`}>
          <div className="text-3xl">🎤</div>
          <h3 className="font-bold text-lg text-slate-800 mt-2">Speaking Partner</h3>
          <p className="text-sm text-slate-500 mt-1">Penguji AI bertanya, kamu jawab lisan → dinilai + tips memperbaiki kelancaran & grammar.</p>
          {!hasSub && <p className="text-xs mt-2 font-medium" style={{ color: PINK }}>{free.speaking} gratis tersisa</p>}
        </button>
      </div>

      {!!history.data?.length && (
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-slate-800 mb-3">Riwayat Latihan</h3>
          <div className="divide-y">
            {history.data.map((s: any) => (
              <button key={s.id} onClick={() => onOpen(s.id)} className="w-full flex items-center justify-between py-2 text-sm text-left hover:bg-slate-50 rounded px-2 -mx-2">
                <div>
                  <span className="font-medium capitalize">{s.skill === "writing" ? "✍️ Writing" : "🎤 Speaking"}</span>
                  <span className="text-slate-400"> · {new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                  <span className="text-slate-300"> · lihat →</span>
                </div>
                {s.overallBand != null && <Band value={Number(s.overallBand)} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function useTutorCheckout() {
  const m = trpc.tutor.createCheckout.useMutation({
    onSuccess: (d: any) => { if (d?.invoiceUrl) window.location.href = d.invoiceUrl; },
    onError: (e: any) => alert(e?.message || "Gagal membuka pembayaran. Coba lagi ya."),
  });
  return {
    checkout: (plan: "w2" | "m1") => m.mutate({ plan }),
    pending: m.isPending,
    pendingPlan: (m.variables as any)?.plan as ("w2" | "m1" | undefined),
  };
}

function PricingBanner({ free }: { free: any }) {
  const { checkout, pending, pendingPlan } = useTutorCheckout();
  return (
    <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(120deg, ${PURPLE}, ${PINK})` }}>
      <div className="font-bold text-lg">Langganan untuk latihan tanpa batas</div>
      <div className="text-white/85 text-sm mt-0.5">Sisa gratis: {free.writing} writing · {free.speaking} speaking. Setelah itu, pilih paket:</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {PLANS.map(p => (
          <button
            key={p.id}
            disabled={pending}
            onClick={() => checkout(p.id as "w2" | "m1")}
            className="bg-white/15 hover:bg-white/25 transition rounded-xl p-3 text-center disabled:opacity-60"
          >
            <div className="text-xs">{p.label}</div>
            <div className="font-bold">{p.price}</div>
            <div className="text-[10px] text-white/80">{p.per}</div>
            {p.tag && <div className="text-[10px] mt-0.5 bg-white/25 rounded px-1 inline-block">{p.tag}</div>}
            {pending && pendingPlan === p.id && <div className="text-[10px] mt-1">Membuka…</div>}
          </button>
        ))}
      </div>
      <div className="text-white/70 text-[11px] text-center mt-2">Pembayaran aman via Xendit (kartu, e-wallet, transfer bank)</div>
    </div>
  );
}

// ── Writing Coach ─────────────────────────────────────────────────────────────
/** Free, client-side examiner voice via the browser's Web Speech API. */
function speakExaminer(text: string) {
  const synth = window.speechSynthesis;
  if (!synth) { alert("Browser kamu belum mendukung suara otomatis. Baca pertanyaannya ya."); return; }

  const doSpeak = () => {
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB";
      u.rate = 0.95;
      const voices = synth.getVoices();
      const v = voices.find(x => /en-GB/i.test(x.lang)) || voices.find(x => /en-US/i.test(x.lang)) || voices.find(x => /^en/i.test(x.lang));
      if (v) u.voice = v;
      u.onerror = (e: any) => console.warn("[TTS] error", e?.error);
      // Chrome quirk: a paused/idle engine can swallow the first utterance.
      if (synth.paused) synth.resume();
      synth.speak(u);
    } catch (e) { console.warn("[TTS] speak failed", e); }
  };

  // Voices are often not loaded on the first interaction — speak once they are,
  // with a timeout fallback in case the event never fires.
  if (synth.getVoices().length > 0) { doSpeak(); return; }
  let done = false;
  const run = () => { if (done) return; done = true; doSpeak(); };
  synth.addEventListener("voiceschanged", run, { once: true });
  setTimeout(run, 400);
}

function tableToText(t: any): string {
  if (!t) return "";
  const head = t.columns.join(" | ");
  const rows = t.rows.map((r: string[]) => r.join(" | ")).join("\n");
  return `${t.title}${t.unit ? ` (${t.unit})` : ""}\n${head}\n${rows}`;
}

function WritingCoach({ onBack }: { onBack: () => void }) {
  const [taskType, setTaskType] = useState<"task1" | "task2">("task2");
  const [prompt, setPrompt] = useState("");
  const [table, setTable] = useState<any>(null);
  const [essay, setEssay] = useState("");
  const [fb, setFb] = useState<any>(null);
  const [paywall, setPaywall] = useState(false);

  const genTask = trpc.tutor.writingTask.useMutation({ onSuccess: d => { setPrompt(d.prompt); setTable((d as any).table || null); } });
  const evalW = trpc.tutor.evaluateWriting.useMutation({
    onSuccess: d => setFb(d.feedback),
    onError: e => { if (e.data?.code === "FORBIDDEN") setPaywall(true); else alert(e.message); },
  });
  const words = (essay.trim().match(/\S+/g) || []).length;
  const fullPrompt = prompt + (table ? `\n\n[DATA TABLE]\n${tableToText(table)}` : "");

  if (fb) return <WritingResult fb={fb} onAgain={() => { setFb(null); setEssay(""); setPrompt(""); }} onBack={onBack} />;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500">← Kembali</button>
      <h2 className="text-2xl font-bold text-slate-800">✍️ Writing Coach</h2>

      <div className={`${card} p-5 space-y-3`}>
        <div className="flex gap-2">
          {(["task1", "task2"] as const).map(t => (
            <button key={t} onClick={() => setTaskType(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${taskType === t ? "text-white" : "bg-slate-100 text-slate-600"}`} style={taskType === t ? { background: PURPLE } : {}}>{t === "task1" ? "Task 1" : "Task 2"}</button>
          ))}
          <button onClick={() => { setTable(null); genTask.mutate({ taskType }); }} disabled={genTask.isPending} className="ml-auto text-sm px-3 py-1.5 rounded-lg border border-slate-300">{genTask.isPending ? "…" : "🎲 Buat soal"}</button>
        </div>
        <textarea className={inp} rows={prompt ? 4 : 2} placeholder="Tempel/ketik soal IELTS Writing di sini, atau klik 'Buat soal'." value={prompt} onChange={e => { setPrompt(e.target.value); setTable(null); }} />
        {table && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <div className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50">{table.title}{table.unit ? ` (${table.unit})` : ""}</div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-y">{table.columns.map((c: string, i: number) => <th key={i} className="text-left px-3 py-1.5 font-medium text-slate-600">{c}</th>)}</tr></thead>
              <tbody>{table.rows.map((r: string[], i: number) => <tr key={i} className="border-b last:border-0">{r.map((cell, j) => <td key={j} className="px-3 py-1.5">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${card} p-5 space-y-2`}>
        <div className="flex justify-between text-xs text-slate-500"><span>Jawabanmu</span><span>{words} kata (min {taskType === "task1" ? 150 : 250})</span></div>
        <textarea className={inp} rows={12} placeholder="Tulis esai-mu di sini…" value={essay} onChange={e => setEssay(e.target.value)} />
        <button onClick={() => evalW.mutate({ taskType, prompt: fullPrompt, essay })} disabled={evalW.isPending || words < 20 || !prompt} className="w-full py-2.5 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: PINK }}>
          {evalW.isPending ? "Menilai…" : "Dapatkan Penilaian & Koreksi"}
        </button>
      </div>

      {paywall && <Paywall skill="writing" />}
    </div>
  );
}

function WritingResult({ fb, onAgain, onBack }: { fb: any; onAgain: () => void; onBack: () => void }) {
  const [showModel, setShowModel] = useState(false);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500">← Kembali</button>
      <div className={`${card} p-5 text-center`}>
        <div className="text-sm text-slate-500">Estimasi Band Keseluruhan</div>
        <div className="text-5xl font-extrabold my-1" style={{ color: bandColor(fb.overallBand) }}>{fb.overallBand.toFixed(1)}</div>
      </div>
      <div className={`${card} p-5`}>
        <h3 className="font-semibold text-slate-800 mb-1">Penilaian per Kriteria</h3>
        <CriteriaRow label="Task Response" c={fb.criteria.taskResponse} />
        <CriteriaRow label="Coherence & Cohesion" c={fb.criteria.coherenceCohesion} />
        <CriteriaRow label="Lexical Resource" c={fb.criteria.lexicalResource} />
        <CriteriaRow label="Grammatical Range & Accuracy" c={fb.criteria.grammaticalRange} />
      </div>

      {!!fb.corrections?.length && (
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-slate-800 mb-2">🔧 Koreksi ({fb.corrections.length})</h3>
          <div className="space-y-2">
            {fb.corrections.map((c: any, i: number) => (
              <div key={i} className="text-sm border border-slate-100 rounded-lg p-2">
                <div><span className="line-through text-red-500">{c.original}</span> → <span className="text-green-700 font-medium">{c.fix}</span></div>
                <div className="text-xs text-slate-500 mt-0.5">{c.explanation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fb.modelAnswer && (
        <div className={`${card} p-5`}>
          <button onClick={() => setShowModel(s => !s)} className="font-semibold text-slate-800 flex items-center gap-2">📝 Contoh Jawaban Band Tinggi {showModel ? "▲" : "▼"}</button>
          {showModel && <div className="text-sm text-slate-700 whitespace-pre-wrap mt-2 leading-relaxed">{fb.modelAnswer}</div>}
        </div>
      )}

      <TwoCol strengths={fb.strengths} improvements={fb.improvements} />
      {!!fb.drills?.length && (
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-slate-800 mb-2">🎯 Latihan yang Disarankan</h3>
          {fb.drills.map((d: any, i: number) => <div key={i} className="text-sm mb-1"><strong>{d.focus}:</strong> {d.instruction}</div>)}
        </div>
      )}
      <button onClick={onAgain} className="w-full py-2.5 rounded-lg text-white font-semibold" style={{ background: PURPLE }}>Latihan Lagi</button>
    </div>
  );
}

function TwoCol({ strengths, improvements }: { strengths: string[]; improvements: string[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {!!strengths?.length && (
        <div className={`${card} p-5`}><h3 className="font-semibold text-green-700 mb-2">✅ Kelebihan</h3><ul className="list-disc ml-5 text-sm space-y-1">{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
      )}
      {!!improvements?.length && (
        <div className={`${card} p-5`}><h3 className="font-semibold mb-2" style={{ color: CORAL }}>📈 Yang Perlu Diperbaiki</h3><ul className="list-disc ml-5 text-sm space-y-1">{improvements.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
      )}
    </div>
  );
}

// ── Speaking Partner ──────────────────────────────────────────────────────────
/** Guided full Part-1 test: 7 connected questions, per-answer feedback, summary. */
function SpeakingTest() {
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [test, setTest] = useState<{ sessionId: number; topic: string; questions: string[] } | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<{ base64: string; mime: string; dur: number; url: string } | null>(null);
  const [qfb, setQfb] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [paywall, setPaywall] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);

  const start = trpc.tutor.speakingTestStart.useMutation({
    onSuccess: d => { setTest({ sessionId: d.sessionId!, topic: d.topic, questions: d.questions }); setPhase("running"); setIdx(0); setAnswers([]); setQfb(null); setAudio(null); },
    onError: e => { if (e.data?.code === "FORBIDDEN") setPaywall(true); else alert(e.message); },
  });
  const answer = trpc.tutor.speakingTestAnswer.useMutation({
    onSuccess: d => { setQfb(d); setTranscript(d.transcript); },
    onError: e => alert(e.message),
  });
  const finish = trpc.tutor.speakingTestFinish.useMutation({
    onSuccess: d => { setSummary(d); setPhase("done"); },
    onError: e => alert(e.message),
  });

  const question = test?.questions[idx] || "";
  const total = test?.questions.length || 7;

  // Auto-play the examiner ~2s after a new (unanswered) question appears.
  useEffect(() => {
    if (phase !== "running" || !question || qfb) return;
    const t = setTimeout(() => speakExaminer(question), 2000);
    return () => clearTimeout(t);
  }, [phase, question, qfb]);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const dur = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
        const reader = new FileReader();
        reader.onloadend = () => setAudio({ base64: String(reader.result).split(",")[1] || "", mime: mr.mimeType || "audio/webm", dur, url: URL.createObjectURL(blob) });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      startRef.current = Date.now(); mr.start(); recRef.current = mr; setRecording(true);
    } catch { alert("Tidak bisa mengakses mikrofon. Izinkan akses mic di browser."); }
  };
  const stopRec = () => { recRef.current?.stop(); setRecording(false); };

  const next = () => {
    if (!test || !qfb) return;
    const updated = [...answers, { question, transcript, band: qfb.band, fixes: qfb.fixes, better: qfb.better, tip: qfb.tip }];
    setAnswers(updated); setQfb(null); setAudio(null); setTranscript("");
    if (idx + 1 >= total) {
      finish.mutate({ sessionId: test.sessionId, answers: updated.map(a => ({ question: a.question, transcript: a.transcript, band: a.band })) });
    } else { setIdx(idx + 1); }
  };

  if (paywall) return <Paywall skill="speaking" />;

  if (phase === "intro") {
    return (
      <div className={`${card} p-6 text-center`}>
        <div className="text-3xl">🎧</div>
        <h3 className="font-bold text-lg mt-2">Tes Speaking — Part 1</h3>
        <p className="text-sm text-slate-500 mt-1">Penguji AI menanyakan 7 pertanyaan tentang satu topik, persis seperti tes asli. Jawab lisan, dapat feedback tiap jawaban, lalu ringkasan band & cara memperbaiki di akhir.</p>
        <button onClick={() => start.mutate()} disabled={start.isPending} className="mt-4 px-6 py-3 rounded-xl text-white font-semibold" style={{ background: PINK }}>{start.isPending ? "Menyiapkan…" : "Mulai Tes Part 1"}</button>
      </div>
    );
  }

  if (phase === "done" && summary) {
    return (
      <div className="space-y-4">
        <div className={`${card} p-5 text-center`}>
          <div className="text-sm text-slate-500">Estimasi Band Part 1</div>
          <div className="text-5xl font-extrabold my-1" style={{ color: bandColor(summary.overallBand) }}>{summary.overallBand.toFixed(1)}</div>
        </div>
        {summary.summary && <div className={`${card} p-5 text-sm text-slate-700`}>{summary.summary}</div>}
        {!!summary.recurringMistakes?.length && <div className={`${card} p-5`}><h3 className="font-semibold text-slate-800 mb-2">Kesalahan yang berulang</h3><ul className="list-disc ml-5 text-sm space-y-1">{summary.recurringMistakes.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul></div>}
        {!!summary.improvements?.length && <div className={`${card} p-5`}><h3 className="font-semibold mb-2" style={{ color: CORAL }}>Rencana latihan</h3><ul className="list-disc ml-5 text-sm space-y-1">{summary.improvements.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul></div>}
        <button onClick={() => { setPhase("intro"); setTest(null); setSummary(null); }} className="w-full py-2.5 rounded-lg text-white font-semibold" style={{ background: PURPLE }}>Tes Lagi</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Topik: <strong className="text-slate-700 capitalize">{test?.topic}</strong></span>
        <span>Pertanyaan {idx + 1} / {total}</span>
      </div>
      <div className={`${card} p-5`}>
        <div className="text-base text-slate-800">{question}</div>
        <button onClick={() => speakExaminer(question)} className="mt-2 text-xs px-2 py-1 rounded border border-slate-300">🔊 Dengar penguji</button>
      </div>

      {!qfb ? (
        <div className={`${card} p-5 text-center space-y-3`}>
          {!recording
            ? <button onClick={startRec} className="px-6 py-3 rounded-full text-white font-semibold" style={{ background: PINK }}>● Mulai Rekam</button>
            : <button onClick={stopRec} className="px-6 py-3 rounded-full text-white font-semibold animate-pulse" style={{ background: CORAL }}>■ Berhenti Rekam</button>}
          {audio && !recording && (
            <div className="space-y-2">
              <audio controls src={audio.url} className="mx-auto" />
              <button onClick={() => test && answer.mutate({ sessionId: test.sessionId, index: idx, question, audioBase64: audio.base64, mimeType: audio.mime, durationSec: audio.dur })} disabled={answer.isPending} className="w-full py-2.5 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: PURPLE }}>{answer.isPending ? "Menilai…" : "Kirim Jawaban"}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {audio && (
            <div className={`${card} p-4`}>
              <div className="text-xs font-medium text-slate-500 mb-2">🔊 Dengar jawabanmu</div>
              <audio controls src={audio.url} className="w-full" />
            </div>
          )}
          <div className={`${card} p-5`}>
            <div className="flex items-center gap-2"><Band value={qfb.band} /><span className="text-sm text-slate-500">estimasi jawaban ini</span></div>
            {!!qfb.fixes?.length && <div className="mt-3 space-y-2">{qfb.fixes.map((c: any, i: number) => <div key={i} className="text-sm"><span className="line-through text-red-500">{c.original}</span> → <span className="text-green-700 font-medium">{c.fix}</span></div>)}</div>}
            {qfb.better && <div className="mt-2 text-sm"><span className="text-slate-500">Contoh lebih baik: </span>{qfb.better}</div>}
            {qfb.tip && <div className="mt-2 text-sm" style={{ color: CORAL }}>💡 {qfb.tip}</div>}
          </div>
          <button onClick={next} disabled={finish.isPending} className="w-full py-2.5 rounded-lg text-white font-semibold" style={{ background: PINK }}>{idx + 1 >= total ? (finish.isPending ? "Membuat ringkasan…" : "Selesai & Lihat Ringkasan") : "Pertanyaan Berikutnya →"}</button>
        </div>
      )}
    </div>
  );
}

function SpeakingPartner({ onBack }: { onBack: () => void }) {
  const [smode, setSmode] = useState<"quick" | "test">("quick");
  const [part, setPart] = useState<"part1" | "part2" | "part3">("part1");
  const [question, setQuestion] = useState("");
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<{ base64: string; mime: string; dur: number; url: string } | null>(null);
  const [fb, setFb] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [paywall, setPaywall] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);

  const genQ = trpc.tutor.speakingQuestions.useMutation({ onSuccess: d => setQuestion(d.questions[0] || "") });
  const evalS = trpc.tutor.evaluateSpeaking.useMutation({
    onSuccess: d => { setFb(d.feedback); setTranscript(d.transcript); },
    onError: e => { if (e.data?.code === "FORBIDDEN") setPaywall(true); else alert(e.message); },
  });

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const dur = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = String(reader.result).split(",")[1] || "";
          setAudio({ base64: b64, mime: mr.mimeType || "audio/webm", dur, url: URL.createObjectURL(blob) });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      startRef.current = Date.now();
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch { alert("Tidak bisa mengakses mikrofon. Izinkan akses mic di browser."); }
  };
  const stopRec = () => { recRef.current?.stop(); setRecording(false); };

  if (fb) return <SpeakingResult fb={fb} transcript={transcript} audioUrl={audio?.url} onAgain={() => { setFb(null); setAudio(null); setQuestion(""); }} onBack={onBack} />;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500">← Kembali</button>
      <h2 className="text-2xl font-bold text-slate-800">🎤 Speaking Partner</h2>

      <div className="flex gap-2">
        <button onClick={() => setSmode("quick")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${smode === "quick" ? "text-white" : "bg-slate-100 text-slate-600"}`} style={smode === "quick" ? { background: PINK } : {}}>Latihan Cepat</button>
        <button onClick={() => setSmode("test")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${smode === "test" ? "text-white" : "bg-slate-100 text-slate-600"}`} style={smode === "test" ? { background: PINK } : {}}>Tes Lengkap (Part 1)</button>
      </div>

      {smode === "test" ? <SpeakingTest /> : <>
      <div className={`${card} p-5 space-y-3`}>
        <div className="flex gap-2">
          {(["part1", "part2", "part3"] as const).map(p => (
            <button key={p} onClick={() => setPart(p)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${part === p ? "text-white" : "bg-slate-100 text-slate-600"}`} style={part === p ? { background: PURPLE } : {}}>{p === "part1" ? "Part 1" : p === "part2" ? "Part 2" : "Part 3"}</button>
          ))}
          <button onClick={() => genQ.mutate({ part })} disabled={genQ.isPending} className="ml-auto text-sm px-3 py-1.5 rounded-lg border border-slate-300">{genQ.isPending ? "…" : "🎲 Pertanyaan"}</button>
        </div>
        {question && (
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-800 whitespace-pre-wrap">{question}</div>
            <button onClick={() => speakExaminer(question)} className="mt-2 text-xs px-2 py-1 rounded border border-slate-300">🔊 Dengar penguji</button>
          </div>
        )}
      </div>

      {question && (
        <div className={`${card} p-5 text-center space-y-3`}>
          {!recording
            ? <button onClick={startRec} className="px-6 py-3 rounded-full text-white font-semibold" style={{ background: PINK }}>● Mulai Rekam</button>
            : <button onClick={stopRec} className="px-6 py-3 rounded-full text-white font-semibold animate-pulse" style={{ background: CORAL }}>■ Berhenti Rekam</button>}
          {audio && !recording && (
            <div className="space-y-2">
              <audio controls src={audio.url} className="mx-auto" />
              <button onClick={() => evalS.mutate({ part, question, audioBase64: audio.base64, mimeType: audio.mime, durationSec: audio.dur })} disabled={evalS.isPending} className="w-full py-2.5 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: PURPLE }}>
                {evalS.isPending ? "Menilai…" : "Dapatkan Penilaian & Tips"}
              </button>
            </div>
          )}
        </div>
      )}

      {paywall && <Paywall skill="speaking" />}
      </>}
    </div>
  );
}

function SpeakingResult({ fb, transcript, audioUrl, onAgain, onBack }: { fb: any; transcript: string; audioUrl?: string; onAgain: () => void; onBack: () => void }) {
  const [showT, setShowT] = useState(false);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500">← Kembali</button>
      <div className={`${card} p-5 text-center`}>
        <div className="text-sm text-slate-500">Estimasi Band Keseluruhan</div>
        <div className="text-5xl font-extrabold my-1" style={{ color: bandColor(fb.overallBand) }}>{fb.overallBand.toFixed(1)}</div>
        <div className="text-xs text-slate-400">
          Kecepatan bicara: {fb.observations?.speakingRateWpm} kata/menit
          {fb.observations?.pauseCount != null && <> · {fb.observations.pauseCount} jeda{fb.observations.longPauseCount ? ` (${fb.observations.longPauseCount} jeda panjang)` : ""}</>}
        </div>
      </div>
      {audioUrl && (
        <div className={`${card} p-4`}>
          <div className="text-xs font-medium text-slate-500 mb-2">🔊 Dengar rekamanmu</div>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
      <div className={`${card} p-5`}>
        <h3 className="font-semibold text-slate-800 mb-1">Penilaian per Kriteria</h3>
        <CriteriaRow label="Fluency & Coherence" c={fb.criteria.fluencyCoherence} />
        <CriteriaRow label="Lexical Resource" c={fb.criteria.lexicalResource} />
        <CriteriaRow label="Grammatical Range & Accuracy" c={fb.criteria.grammaticalRange} />
        <CriteriaRow label="Pronunciation (estimasi)" c={fb.criteria.pronunciation} />
      </div>

      {(fb.observations?.fillerWords?.length || fb.observations?.repetitions?.length) ? (
        <div className={`${card} p-5 text-sm`}>
          {!!fb.observations.fillerWords?.length && <div><strong>Filler words:</strong> {fb.observations.fillerWords.join(", ")}</div>}
          {!!fb.observations.repetitions?.length && <div className="mt-1"><strong>Pengulangan:</strong> {fb.observations.repetitions.join(", ")}</div>}
        </div>
      ) : null}

      {!!fb.corrections?.length && (
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-slate-800 mb-2">🔧 Koreksi</h3>
          {fb.corrections.map((c: any, i: number) => (
            <div key={i} className="text-sm border border-slate-100 rounded-lg p-2 mb-2">
              <div><span className="line-through text-red-500">{c.original}</span> → <span className="text-green-700 font-medium">{c.fix}</span></div>
              {c.explanation && <div className="text-xs text-slate-500 mt-0.5">{c.explanation}</div>}
            </div>
          ))}
        </div>
      )}

      {fb.upgradedAnswer && (
        <div className={`${card} p-5`}><h3 className="font-semibold text-slate-800 mb-1">⬆️ Jawabanmu yang Ditingkatkan</h3><div className="text-sm text-slate-700 whitespace-pre-wrap">{fb.upgradedAnswer}</div></div>
      )}
      {fb.modelAnswer && (
        <div className={`${card} p-5`}><h3 className="font-semibold text-slate-800 mb-1">📝 Contoh Jawaban Band 8</h3><div className="text-sm text-slate-700 whitespace-pre-wrap">{fb.modelAnswer}</div></div>
      )}
      <TwoCol strengths={[]} improvements={fb.improvements} />
      {!!fb.tips?.length && (
        <div className={`${card} p-5`}><h3 className="font-semibold mb-2" style={{ color: CORAL }}>💡 Tips</h3><ul className="list-disc ml-5 text-sm space-y-1">{fb.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul></div>
      )}
      {transcript && (
        <div className={`${card} p-5`}>
          <button onClick={() => setShowT(s => !s)} className="font-semibold text-slate-800">📄 Transkrip {showT ? "▲" : "▼"}</button>
          {showT && <div className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{transcript}</div>}
        </div>
      )}
      <button onClick={onAgain} className="w-full py-2.5 rounded-lg text-white font-semibold" style={{ background: PURPLE }}>Latihan Lagi</button>
    </div>
  );
}

function Paywall({ skill }: { skill: string }) {
  const { checkout, pending, pendingPlan } = useTutorCheckout();
  return (
    <div className="rounded-2xl p-5 text-white text-center" style={{ background: `linear-gradient(120deg, ${PURPLE}, ${PINK})` }}>
      <div className="font-bold text-lg">Jatah gratis {skill} sudah dipakai 🎉</div>
      <div className="text-white/85 text-sm mt-1">Langganan untuk latihan tanpa batas dengan feedback lengkap.</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {PLANS.map(p => (
          <button
            key={p.id}
            disabled={pending}
            onClick={() => checkout(p.id as "w2" | "m1")}
            className="bg-white/15 hover:bg-white/25 transition rounded-xl p-3 disabled:opacity-60"
          >
            <div className="text-xs">{p.label}</div>
            <div className="font-bold text-sm">{p.price}</div>
            {p.tag && <div className="text-[10px] mt-0.5 bg-white/25 rounded px-1 inline-block">{p.tag}</div>}
            {pending && pendingPlan === p.id && <div className="text-[10px] mt-1">Membuka…</div>}
          </button>
        ))}
      </div>
      <div className="text-white/70 text-[11px] mt-2">Pembayaran aman via Xendit</div>
    </div>
  );
}
