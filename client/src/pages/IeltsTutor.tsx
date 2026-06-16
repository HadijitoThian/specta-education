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

const PLANS = [
  { id: "m1", label: "1 Month", price: "Rp 149.000", per: "Rp 149rb/bln" },
  { id: "m3", label: "3 Months", price: "Rp 349.000", per: "Rp 116rb/bln", tag: "Hemat 22%" },
  { id: "m6", label: "6 Months", price: "Rp 599.000", per: "Rp 100rb/bln", tag: "Best value" },
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
      if (f.name.trim().length < 2) return setErr("Masukkan namamu.");
      if (f.password.length < 8) return setErr("Password minimal 8 karakter.");
      register.mutate({ name: f.name, email: f.email, phone: f.phone || undefined, password: f.password });
    } else {
      login.mutate({ email: f.email, password: f.password });
    }
  };

  const goForm = (m: "signup" | "login" = "signup") => { setMode(m); document.getElementById("daftar")?.scrollIntoView({ behavior: "smooth", block: "center" }); };

  const AuthCard = (
    <div id="daftar" className={`${card} p-6 scroll-mt-24`}>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "signup" ? "text-white" : "text-slate-600 bg-slate-100"}`} style={mode === "signup" ? { background: PINK } : {}}>Daftar Gratis</button>
        <button onClick={() => setMode("login")} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "login" ? "text-white" : "text-slate-600 bg-slate-100"}`} style={mode === "login" ? { background: PINK } : {}}>Masuk</button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <>
            <input className={inp} placeholder="Nama lengkap" value={f.name} onChange={e => set("name", e.target.value)} />
            <input className={inp} placeholder="No. WhatsApp (opsional)" value={f.phone} onChange={e => set("phone", e.target.value)} />
          </>
        )}
        <input className={inp} type="email" placeholder="Email" value={f.email} onChange={e => set("email", e.target.value)} required />
        <input className={inp} type="password" placeholder="Password (min 8 karakter)" value={f.password} onChange={e => set("password", e.target.value)} required />
        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: PINK }}>
          {busy ? "Memproses…" : mode === "signup" ? "Mulai Gratis Sekarang" : "Masuk"}
        </button>
        {mode === "signup" && <p className="text-[11px] text-center text-slate-400">Gratis 1 Writing + 1 Speaking. Tanpa kartu kredit.</p>}
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2"><img src={LOGO} alt="SpecTa" className="h-8 object-contain" /><span className="font-bold">AI IELTS Tutor</span></div>
          <button onClick={() => goForm("login")} className="text-sm font-medium text-slate-600 hover:text-slate-900">Masuk</button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: `radial-gradient(900px 400px at 80% -10%, ${PINK}22, transparent), radial-gradient(700px 400px at 0% 10%, ${PURPLE}1a, transparent)` }} />
        <div className="max-w-6xl mx-auto px-4 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${PINK}1a`, color: PINK }}>🎓 Guru IELTS pribadi berbasis AI</span>
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mt-4">Naikkan Band <span style={{ color: PINK }}>IELTS</span>-mu, mulai hari ini.</h1>
            <p className="text-lg text-slate-600 mt-4">Latihan <strong>Speaking</strong> & <strong>Writing</strong> kapan saja. AI menilai band-mu, menunjukkan <strong>kesalahanmu satu per satu</strong>, dan memberi <strong>contoh jawaban band tinggi</strong> — seperti punya guru IELTS pribadi 24 jam.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={() => goForm("signup")} className="px-6 py-3 rounded-xl text-white font-semibold shadow-lg" style={{ background: PINK }}>Coba Gratis Sekarang →</button>
              <a href="#harga" className="px-6 py-3 rounded-xl font-semibold border border-slate-300">Lihat Harga</a>
            </div>
            <p className="text-sm text-slate-500 mt-3">✅ Gratis 1 Writing + 1 Speaking · tanpa kartu kredit</p>
          </div>
          <div className="lg:pl-6">{AuthCard}</div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[["Sejak 2005", "Konsultan tepercaya"], ["1000+", "Pelajar terbantu"], ["200+", "Beasiswa"], ["4.9★", "Rating"]].map(([a, b]) => (
            <div key={a}><div className="text-2xl font-extrabold" style={{ color: PURPLE }}>{a}</div><div className="text-xs text-slate-500">{b}</div></div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-4xl mx-auto px-4 py-14 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold">Latihan IELTS sendiri itu sulit.</h2>
        <p className="text-slate-600 mt-3">Kamu menulis esai tapi tidak tahu salahnya di mana. Kamu latihan speaking tapi tidak ada yang menilai. Les privat IELTS mahal (jutaan rupiah) dan jadwalnya kaku. <strong>AI Tutor menyelesaikan semuanya</strong> — feedback instan, kapan saja, dengan harga terjangkau.</p>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl lg:text-3xl font-bold text-center">Cara kerjanya — 3 langkah</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {[["1", "Latihan", "Tulis esai (Task 1/2) atau jawab pertanyaan speaking secara lisan."], ["2", "Dinilai AI", "Dapat estimasi band per 4 kriteria + koreksi setiap kesalahan."], ["3", "Perbaiki", "Lihat contoh jawaban band tinggi & rencana latihan. Ulangi, pantau progres."]].map(([n, t, d]) => (
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
        <div className={`${card} p-7`}>
          <div className="text-4xl">✍️</div>
          <h3 className="text-xl font-bold mt-2">Writing Coach</h3>
          <p className="text-slate-600 mt-1">Tulis Task 1 atau Task 2 — langsung dinilai seperti penguji asli.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            {["Band per 4 kriteria resmi IELTS", "Koreksi tiap kalimat: salahnya apa & perbaikannya", "Contoh jawaban band 8 dari esaimu sendiri", "Rencana latihan untuk kelemahanmu"].map(x => <li key={x} className="flex gap-2"><span style={{ color: PINK }}>✓</span>{x}</li>)}
          </ul>
        </div>
        <div className={`${card} p-7`}>
          <div className="text-4xl">🎤</div>
          <h3 className="text-xl font-bold mt-2">Speaking Partner</h3>
          <p className="text-slate-600 mt-1">Penguji AI bertanya, kamu jawab lisan — langsung dinilai.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            {["Pertanyaan Part 1, 2 & 3 seperti tes asli", "Band fluency, vocabulary, grammar & pronunciation", "Deteksi filler words & kecepatan bicara", "Contoh jawaban + versi jawabanmu yang ditingkatkan"].map(x => <li key={x} className="flex gap-2"><span style={{ color: PINK }}>✓</span>{x}</li>)}
          </ul>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl lg:text-3xl font-bold text-center">Kenapa AI Tutor SpecTa?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {[["⚡", "Feedback instan", "Hasil dalam hitungan detik, bukan menunggu guru."], ["🕐", "24/7", "Latihan kapan pun kamu mau, sebanyak yang kamu mau."], ["💸", "Jauh lebih murah", "Sebagian kecil dari biaya les privat IELTS."], ["🎯", "Sesuai band descriptor", "Penilaian mengikuti kriteria resmi IELTS."], ["📈", "Pantau progres", "Lihat band-mu naik dari waktu ke waktu."], ["🇮🇩", "Untuk pelajar Indonesia", "Penjelasan dwibahasa, tips khusus."]].map(([i, t, d]) => (
              <div key={t} className={`${card} p-5`}><div className="text-2xl">{i}</div><div className="font-semibold mt-1">{t}</div><div className="text-sm text-slate-500">{d}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="max-w-5xl mx-auto px-4 py-16 scroll-mt-20">
        <h2 className="text-2xl lg:text-3xl font-bold text-center">Harga terjangkau, hasil maksimal</h2>
        <p className="text-center text-slate-500 mt-2">Mulai gratis. Langganan untuk latihan tanpa batas.</p>
        <div className="grid md:grid-cols-3 gap-5 mt-8">
          {PLANS.map(p => (
            <div key={p.id} className={`${card} p-6 text-center relative ${p.tag === "Best value" ? "ring-2" : ""}`} style={p.tag === "Best value" ? { boxShadow: `0 0 0 2px ${PINK}` } as any : {}}>
              {p.tag && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-white px-3 py-0.5 rounded-full" style={{ background: PINK }}>{p.tag}</span>}
              <div className="font-semibold text-slate-700">{p.label}</div>
              <div className="text-3xl font-extrabold my-2">{p.price}</div>
              <div className="text-xs text-slate-500">{p.per}</div>
              <ul className="text-sm text-slate-600 mt-4 space-y-1 text-left">
                {["Writing tanpa batas", "Speaking tanpa batas", "Koreksi + contoh jawaban", "Pantau progres band"].map(x => <li key={x} className="flex gap-2"><span style={{ color: PINK }}>✓</span>{x}</li>)}
              </ul>
              <button onClick={() => goForm("signup")} className="w-full mt-5 py-2.5 rounded-lg text-white font-semibold" style={{ background: p.tag === "Best value" ? PINK : PURPLE }}>Mulai Gratis</button>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">Coba gratis dulu — tanpa kartu kredit. Bayar hanya kalau kamu suka.</p>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-center">Pertanyaan umum</h2>
          <div className="mt-6 space-y-3">
            {[
              ["Apakah benar-benar gratis?", "Ya — kamu dapat 1 Writing + 1 Speaking gratis lengkap dengan penilaian & koreksi, tanpa kartu kredit. Langganan hanya kalau kamu mau lanjut."],
              ["Seberapa akurat penilaiannya?", "AI menilai mengikuti band descriptor resmi IELTS untuk tiap kriteria. Ini estimasi yang sangat membantu untuk latihan, walau penilaian resmi tetap dari IELTS."],
              ["Apakah cocok untuk pemula?", "Sangat cocok. Setiap koreksi disertai penjelasan, dan ada contoh jawaban band tinggi supaya kamu tahu targetnya."],
              ["Butuh aplikasi?", "Tidak. Cukup buka di browser HP atau laptop. Untuk speaking, izinkan akses mikrofon."],
            ].map(([q, a]) => (
              <div key={q} className={`${card} p-4`}><div className="font-semibold">{q}</div><div className="text-sm text-slate-600 mt-1">{a}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-white" style={{ background: `linear-gradient(120deg, ${PURPLE}, ${PINK})` }}>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-extrabold">Siap naikkan band IELTS-mu?</h2>
          <p className="text-white/85 mt-2">Mulai gratis hari ini. Latihan pertama selesai dalam 5 menit.</p>
          <button onClick={() => goForm("signup")} className="mt-6 bg-white rounded-xl px-8 py-3 font-bold" style={{ color: PINK }}>Mulai Gratis Sekarang →</button>
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
              ? <span className="text-green-700 font-medium">✓ {sub.plan === "m1" ? "1 Bulan" : sub.plan === "m3" ? "3 Bulan" : "6 Bulan"}</span>
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
  return <SpeakingResult fb={s.feedback} transcript={s.response || ""} onAgain={onBack} onBack={onBack} />;
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

function PricingBanner({ free }: { free: any }) {
  return (
    <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(120deg, ${PURPLE}, ${PINK})` }}>
      <div className="font-bold text-lg">Langganan untuk latihan tanpa batas</div>
      <div className="text-white/85 text-sm mt-0.5">Sisa gratis: {free.writing} writing · {free.speaking} speaking. Setelah itu, pilih paket:</div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {PLANS.map(p => (
          <div key={p.id} className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-xs">{p.label}</div>
            <div className="font-bold">{p.price}</div>
            <div className="text-[10px] text-white/80">{p.per}</div>
            {p.tag && <div className="text-[10px] mt-0.5 bg-white/25 rounded px-1 inline-block">{p.tag}</div>}
          </div>
        ))}
      </div>
      <button onClick={() => alert("Pembayaran langganan segera hadir — gunakan latihan gratismu dulu ya!")} className="mt-3 w-full bg-white rounded-lg py-2 text-sm font-semibold" style={{ color: PINK }}>
        Pilih Paket
      </button>
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
function SpeakingPartner({ onBack }: { onBack: () => void }) {
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

  if (fb) return <SpeakingResult fb={fb} transcript={transcript} onAgain={() => { setFb(null); setAudio(null); setQuestion(""); }} onBack={onBack} />;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500">← Kembali</button>
      <h2 className="text-2xl font-bold text-slate-800">🎤 Speaking Partner</h2>

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
    </div>
  );
}

function SpeakingResult({ fb, transcript, onAgain, onBack }: { fb: any; transcript: string; onAgain: () => void; onBack: () => void }) {
  const [showT, setShowT] = useState(false);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500">← Kembali</button>
      <div className={`${card} p-5 text-center`}>
        <div className="text-sm text-slate-500">Estimasi Band Keseluruhan</div>
        <div className="text-5xl font-extrabold my-1" style={{ color: bandColor(fb.overallBand) }}>{fb.overallBand.toFixed(1)}</div>
        <div className="text-xs text-slate-400">Kecepatan bicara: {fb.observations?.speakingRateWpm} kata/menit</div>
      </div>
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
  return (
    <div className="rounded-2xl p-5 text-white text-center" style={{ background: `linear-gradient(120deg, ${PURPLE}, ${PINK})` }}>
      <div className="font-bold text-lg">Jatah gratis {skill} sudah dipakai 🎉</div>
      <div className="text-white/85 text-sm mt-1">Langganan untuk latihan tanpa batas dengan feedback lengkap.</div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {PLANS.map(p => (
          <div key={p.id} className="bg-white/15 rounded-xl p-3"><div className="text-xs">{p.label}</div><div className="font-bold text-sm">{p.price}</div></div>
        ))}
      </div>
      <button onClick={() => alert("Pembayaran langganan segera hadir!")} className="mt-3 bg-white rounded-lg py-2 px-6 text-sm font-semibold" style={{ color: PINK }}>Pilih Paket</button>
    </div>
  );
}
