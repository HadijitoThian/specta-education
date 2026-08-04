/**
 * Standalone Voice Clone product landing page.
 *
 * Anyone can buy this — no Mock Test required. Rp 49k. After payment,
 * user records 3 IELTS Speaking questions (Part 1, 2, 3) on the
 * following page, then AI clones their voice and generates a Band 8
 * version in their own voice.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

const IDR = (n: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", minimumFractionDigits: 0,
}).format(n);

export default function VoiceCloneLanding() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkout = trpc.ielts.createStandaloneVoiceCloneCheckout.useMutation();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) return setError("Nama dan email required");
    if (!consent) return setError("Kamu harus setuju dengan consent voice cloning");
    try {
      const res = await checkout.mutateAsync({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim() || undefined,
        consentGiven: true,
      });
      window.location.href = res.invoiceUrl;
    } catch (err: any) {
      setError(err?.message ?? "Checkout gagal");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Voice Clone — IELTS Band Score + Semua 3 Bagian di Band 8 + PDF Report | SpecTa Education"
        description="Dapat IELTS Speaking band score per kriteria, SEMUA 3 bagian di-rewrite ke Band 8 di suara kamu sendiri, vocabulary + grammar teardown, PDF study report ke email. Rp 49.000."
      />
      <Navigation currentPage="voice-clone" />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4 bg-gradient-to-br from-purple-700 via-fuchsia-700 to-pink-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-amber-400 text-slate-900 text-xs font-black uppercase tracking-wider mb-4">
                🎓 Full Study Report · Powered by AI
              </span>
              <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
                IELTS Speaking Band 8 —<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-amber-200">Di Suara Kamu Sendiri</span>
              </h1>
              <p className="text-lg text-white/95 mb-6 leading-relaxed max-w-lg">
                Dapat <strong>IELTS band score</strong> per kriteria (Fluency, Lexical, Grammar, Pronunciation), <strong>SEMUA 3 bagian Speaking</strong> di-rewrite ke Band 8 dalam suara kloningan kamu, plus <strong>PDF study report</strong> lengkap ke email.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  ["📊", "IELTS Band Score"],
                  ["🎙️", "3 Bagian di Band 8"],
                  ["📖", "Vocab + Grammar Teardown"],
                  ["📄", "PDF Report ke Email"],
                  ["🎯", "Shadowing Practice"],
                ].map(([e, t]) => (
                  <div key={t} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 backdrop-blur-sm rounded-lg text-xs md:text-sm">
                    <span>{e}</span><span>{t}</span>
                  </div>
                ))}
              </div>
              <a
                href="#buy"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-lg px-8 py-4 rounded-xl shadow-xl transition"
              >
                Mulai Sekarang — {IDR(49000)} →
              </a>
              <p className="text-xs text-white/85 mt-3">
                <span className="line-through text-white/50">Setara Rp 300k+ untuk sesi coaching IELTS 1-on-1</span> · dapat semua di <strong>Rp 49k</strong>
              </p>
              <p className="text-xs text-white/70 mt-2">
                ✓ Bayar sekali · ✓ Hasil dalam ~5 menit · ✓ Suara auto-hapus 90 hari · ✓ 100% private
              </p>
            </div>

            <div className="hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-5 border border-white/20">
                <img
                  src="/files/voice-clone/landing/hero.jpg"
                  alt="Voice Clone — hear yourself at Band 8"
                  className="w-full h-72 object-cover"
                  loading="eager"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent pointer-events-none" />
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs uppercase tracking-wider opacity-80 font-bold">Contoh hasil kamu</div>
                  <div className="px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/50 text-emerald-100 text-[10px] font-black">Overall Band 6.5 → 8.0</div>
                </div>
                <div className="space-y-2">
                  {[
                    ["Part 1", "Intro & interview", "amber"],
                    ["Part 2", "Long turn (2 min)", "yellow"],
                    ["Part 3", "Discussion", "orange"],
                  ].map(([p, sub]) => (
                    <div key={p as string} className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-400/30 border border-amber-300/40 flex items-center justify-center text-xs font-black shrink-0">{(p as string).replace("Part ", "P")}</div>
                      <div className="flex-1">
                        <div className="text-xs opacity-70">{sub}</div>
                        <div className="text-sm font-bold flex items-center gap-2 mt-0.5">
                          🎤 Original + ✨ Band 8 (suara kamu)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/15">
                  <div className="text-xs text-white/85 flex items-center gap-2">
                    <span>📄</span> <span>PDF study report + vocab/grammar teardown dikirim ke email.</span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] opacity-60 text-center">Semua bagian di-rewrite, bukan cuma yang terlemah.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — 4 steps */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Cara kerja — 4 langkah</h2>
            <p className="text-slate-600">Total waktu: ~10 menit dari bayar sampai terima PDF report di email.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              ["1", "Bayar Rp 49k", "Checkout 1-klik via Xendit (BCA, Mandiri, GoPay, DANA, OVO, ShopeePay, kartu kredit).", null],
              ["2", "Rekam 3 pertanyaan", "1 pertanyaan Part 1, 1 cue card Part 2, dan 1 pertanyaan Part 3. Rekam dengan mikrofon HP/laptop.", "/files/voice-clone/landing/recording.jpg"],
              ["3", "AI process (~2 menit)", "Kamu lihat progress live: transcribing → grading → cloning voice → rewriting Part 1/2/3 → generating Band 8 audio.", null],
              ["4", "Terima hasil + PDF", "Dengar SEMUA 3 bagian di Band 8 (suara kamu). PDF study report + full teardown dikirim ke email.", "/files/voice-clone/landing/result.jpg"],
            ].map(([n, t, d, img]) => (
              <div key={n as string} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
                {img && (
                  <img
                    src={img as string}
                    alt={t as string}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="p-5">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-lg mb-3">{n}</div>
                  <h3 className="font-bold text-slate-900 mb-1 text-sm">{t}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apa yang kamu dapat — the full deliverables */}
      <section className="py-16 px-4 bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-black uppercase tracking-wider mb-3">
              📦 Isi lengkap paket
            </span>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Apa yang kamu dapat</h2>
            <p className="text-slate-600">Semuanya di Rp 49.000. Bukan sekadar 1 audio Band 8 — ini paket study lengkap.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              ["📊", "IELTS Band Score per Kriteria", "Dinilai di 4 kriteria official IELTS Speaking: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation. Plus overall band + kriteria terlemah kamu diidentifikasi."],
              ["🎯", "Personalized Action Plan", "3-4 kalimat spesifik: kriteria mana yang harus kamu fokusin, latihan konkret apa yang harus dilakukan. Bukan tips generik — personalized ke performance kamu."],
              ["🎙️", "SEMUA 3 Bagian di Band 8", "Bukan cuma 1 bagian yang terlemah. Part 1 (~30 detik), Part 2 (~2 menit penuh), Part 3 (~1 menit). Semua di-rewrite ke Band 8, semua di-generate di suara kloningan kamu."],
              ["📖", "Vocabulary Upgrade Table", "Setiap bagian: 5-10 upgrade kata/frasa. \"Kata kamu → Kata Band 8 → Kenapa lebih kuat\". Table lengkap yang bisa kamu save + hafalin."],
              ["✍️", "Grammar Upgrade Table", "Setiap bagian: 3-8 upgrade struktur kalimat. \"Kalimat kamu → Kalimat Band 8 → Nama rule\" (relative clause, conditional, dll). Belajar grammar dari kesalahan kamu sendiri."],
              ["🔗", "Discourse Markers Missed", "\"However\", \"as far as I'm concerned\", \"moreover\" — connector Band 8 yang kamu belum pakai. Setiap bagian punya list-nya."],
              ["📄", "Full PDF Study Report", "Semua di atas dibundel di PDF branded yang dikirim ke email kamu + bisa di-download dari result page. Study offline, print, share ke tutor kamu."],
              ["🎯", "Shadowing Practice Mode", "Audio Band 8 auto-pause 2 detik di setiap kalimat — kamu tinggal ulangi keras-keras. Latihan speaking yang terbukti efektif."],
              ["🔁", "A/B Compare + Speed Control", "Compare mode: original kamu → Band 8 back-to-back tanpa jeda. Speed selector 0.75× / 1× / 1.25× buat study slow-mo atau practice keeping up."],
            ].map(([emoji, title, desc]) => (
              <div key={title} className="bg-white rounded-2xl p-5 border-2 border-purple-100 shadow-sm hover:shadow-md hover:border-purple-300 transition">
                <div className="text-3xl mb-2">{emoji}</div>
                <h3 className="font-bold text-slate-900 mb-1 text-sm">{title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waveform visual band */}
      <section
        className="h-40 md:h-56 bg-slate-900 bg-cover bg-center relative"
        style={{ backgroundImage: "url(/files/voice-clone/landing/waveform.jpg)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/70 via-fuchsia-900/50 to-pink-900/70" />
        <div className="relative h-full container flex items-center justify-center">
          <p className="text-white text-lg md:text-2xl font-bold text-center px-4">
            Dua versi. Satu suara. <span className="text-amber-300">Yours.</span>
          </p>
        </div>
      </section>

      {/* Why it works */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Kenapa ini powerful?</h2>
            <p className="text-slate-600">Bukan sekadar tools latihan — ini "cermin" masa depan kamu.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              ["🧠", "Learning by contrast", "Otak kamu belajar 10× lebih cepat waktu kamu bisa BANDINGKAN versi diri sendiri sekarang vs versi 'best'. Bukan lihat orang lain — lihat DIRI KAMU."],
              ["🎯", "Persis rubrik IELTS", "AI kami dilatih pada official IELTS Speaking band descriptors. Fluency, lexical, grammar, pronunciation — semua di-graded + di-optimize ke Band 8."],
              ["📄", "Bisa study offline", "Full PDF study report dikirim ke email — vocab table, grammar table, action plan, transcripts. Persis seperti punya IELTS coach 1-on-1, tapi bisa dibawa kemana-mana."],
              ["🔥", "Motivasi 10× lebih kuat", "\"This is what future-me sounds like\" — moment yang bikin kamu MAU latihan setiap hari. Bukan cuma target abstrak."],
              ["🎙️", "Shadowing terbukti efektif", "Metode shadowing (dengar → ulangi keras-keras) adalah teknik yang dipakai polyglot & voice actor. Kami build langsung di tools kami."],
              ["🔒", "100% private", "Voice clone auto-hapus 90 hari. Tidak dishare, tidak dipakai untuk hal lain. Consent required."],
            ].map(([e, t, d]) => (
              <div key={t} className="flex gap-4 p-5 bg-white rounded-2xl border border-slate-200">
                <div className="text-3xl">{e}</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{t}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Buy form */}
      <section id="buy" className="py-16 px-4 bg-gradient-to-br from-purple-900 via-purple-800 to-fuchsia-900 text-white">
        <div className="container">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black mb-2">Mulai rekam sekarang</h2>
              <p className="text-white/85">Rp 49.000 · one-off · no subscription</p>
            </div>

            <form onSubmit={handleBuy} className="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Nama lengkap</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">WhatsApp (optional)</label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <label className="flex items-start gap-2 text-xs text-slate-600 mb-3 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" required />
                <span>
                  Saya setuju SpecTa mengkloning suara saya UNTUK FITUR INI SAJA. Voice model auto-delete dalam 90 hari. Tidak dishare atau digunakan untuk hal lain. <Link href="/privacy" className="underline">Privacy policy</Link>.
                </span>
              </label>
              {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
              <button
                type="submit"
                disabled={checkout.isPending}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:from-slate-400 disabled:to-slate-500 text-white font-black text-base shadow-lg transition"
              >
                {checkout.isPending ? "Redirecting to checkout…" : `🎙️ Beli & Mulai Rekam — ${IDR(49000)}`}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">FAQ</h2>
          <div className="space-y-3">
            {[
              ["Berapa lama processing-nya?", "Setelah bayar + rekam 3 pertanyaan (5 menit), AI processing memakan waktu ~90-180 detik. Kamu bisa lihat progress live: loading → transcribing → grading → cloning voice → rewriting Part 1/2/3 → generating audio → PDF → email. Total dari bayar sampai terima PDF di email: sekitar 8-12 menit."],
              ["Apakah SEMUA 3 bagian akan di-rewrite atau cuma yang terlemah?", "SEMUA 3 bagian. Part 1 (intro & interview), Part 2 (cue card long turn ~2 menit), dan Part 3 (discussion) — semuanya di-rewrite ke Band 8 dan di-generate di suara kloningan kamu. Bagian terlemah kamu di-highlight sebagai fokus utama, tapi kamu dapat semua 3."],
              ["Apa isi PDF study report-nya?", "PDF lengkap yang berisi: (1) Overall band + per-criterion IELTS band score kamu, (2) personalized action plan, (3) untuk setiap bagian: transcript original + Band 8 side-by-side, vocabulary upgrade table, grammar upgrade table dengan nama rule, discourse markers yang kamu lewatkan. Dikirim ke email + bisa di-download dari result page."],
              ["Apakah harus punya IELTS Mock Test dulu?", "Tidak. Fitur ini standalone — siapa saja bisa beli. Kalau kamu sudah beli IELTS Mock Test kami, kamu juga bisa reuse rekaman dari sana (via halaman report Mock)."],
              ["Bagaimana AI tahu suara saya di Band 8?", "AI kami di-graded pertama di 4 kriteria official IELTS Speaking (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation), lalu di-rewrite ke Band 8 sesuai rubrik. Rewrite MEMPERTAHANKAN konten + opini kamu — cuma perbaiki cara penyampaian. Lalu di-generate audio di suara kloningan kamu via ElevenLabs."],
              ["Apakah aman? Suara saya tidak dibagikan kan?", "100% private. Voice model kamu disimpan hanya untuk generate Band 8 audio, lalu auto-delete dalam 90 hari. Tidak dishare, tidak dipakai untuk train model lain, tidak akan pernah dijual."],
              ["Berapa lama audio Band 8 saya bisa diakses?", "Audio Band 8 kamu + PDF report tetap bisa didengar/download selamanya. Yang auto-delete dalam 90 hari hanya voice model (agar tidak bisa disalahgunakan untuk clone lain)."],
              ["Apa itu Shadowing Mode dan A/B Compare?", "Shadowing Mode: audio Band 8 auto-pause 2 detik di setiap kalimat, jadi kamu tinggal ulangi keras-keras — metode praktis yang dipakai polyglot & voice actor. A/B Compare: single player yang play original kamu → langsung sambung ke Band 8 tanpa jeda, jadi kontrasnya jelas."],
            ].map(([q, a], i) => (
              <details key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">{q}</summary>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
