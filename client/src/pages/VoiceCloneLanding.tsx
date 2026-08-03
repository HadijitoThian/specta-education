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
        title="Voice Clone — Dengar Suara Kamu di Band 8 IELTS | SpecTa Education"
        description="Rekam 3 pertanyaan IELTS Speaking, AI clone suara kamu dan generate Band 8 audio di suara kamu sendiri. Rp 49.000."
      />
      <Navigation currentPage="voice-clone" />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4 bg-gradient-to-br from-purple-700 via-fuchsia-700 to-pink-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-amber-400 text-slate-900 text-xs font-black uppercase tracking-wider mb-4">
                🔥 New · SpecTa Voice Clone
              </span>
              <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
                Dengar Suara Kamu Sendiri —<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-amber-200">Di Band 8 IELTS</span>
              </h1>
              <p className="text-lg text-white/95 mb-6 leading-relaxed max-w-lg">
                Rekam 3 pertanyaan IELTS Speaking (5 menit total). AI clone suara kamu, lalu perbaiki grammar & vocab jawaban kamu ke level Band 8. Terus dengar hasilnya dalam <strong>SUARA KAMU SENDIRI</strong>.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                {[
                  ["🎙️", "Rekam 3 pertanyaan"],
                  ["🤖", "AI grade + rewrite"],
                  ["✨", "Dengar di Band 8"],
                ].map(([e, t]) => (
                  <div key={t} className="flex items-center gap-2 px-3 py-2 bg-white/15 backdrop-blur-sm rounded-lg text-sm">
                    <span>{e}</span><span>{t}</span>
                  </div>
                ))}
              </div>
              <a
                href="#buy"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-lg px-8 py-4 rounded-xl shadow-xl transition"
              >
                Mulai Rekam — {IDR(49000)} →
              </a>
              <p className="text-xs text-white/70 mt-3">
                ✓ Bayar sekali · ✓ Hasil dalam menit · ✓ Suara auto-hapus 90 hari · ✓ 100% private
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
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
                <div className="text-xs uppercase tracking-wider opacity-80 font-bold mb-2">Contoh sebelum & sesudah</div>
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-xs opacity-70 mb-2">🎤 Rekaman kamu (asli):</div>
                    <div className="text-sm italic">"My hometown is Jakarta, uh, it's very big city. There are many, uh, many people and cars. I like the food there because is very delicious..."</div>
                  </div>
                  <div className="bg-amber-400/20 border-2 border-amber-400/50 rounded-xl p-4">
                    <div className="text-xs text-amber-200 font-bold mb-2">✨ AI di Band 8 (suara kamu):</div>
                    <div className="text-sm italic">"My hometown is Jakarta, which is a bustling metropolis and one of Southeast Asia's most vibrant capitals. Beyond the crowds and traffic, what I love most is its incredible culinary diversity — from street-side satay to sophisticated fine dining..."</div>
                  </div>
                </div>
                <div className="mt-3 text-[10px] opacity-70 text-center">Illustrative example. Actual results use your real recording.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Cara kerja — 3 langkah</h2>
            <p className="text-slate-600">Total waktu: 5-10 menit termasuk processing.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              ["1", "Bayar Rp 49k", "Checkout 1-klik via Xendit (BCA, Mandiri, GoPay, DANA, OVO, ShopeePay, kartu kredit).", null],
              ["2", "Rekam 3 pertanyaan", "Kami kasih 1 pertanyaan Part 1, 1 cue card Part 2, dan 1 pertanyaan Part 3. Rekam dengan mikrofon HP/laptop.", "/files/voice-clone/landing/recording.jpg"],
              ["3", "Dengar di Band 8", "AI clone suara kamu + generate Band 8 audio. Sampai dalam menit.", "/files/voice-clone/landing/result.jpg"],
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
                <div className="p-6">
                  <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-lg mb-3">{n}</div>
                  <h3 className="font-bold text-slate-900 mb-1">{t}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{d}</p>
                </div>
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
              ["🎯", "Persis rubrik IELTS", "AI kami dilatih pada official IELTS Speaking band descriptors. Fluency, lexical, grammar, pronunciation — semua di-optimize ke Band 8."],
              ["🔥", "Motivasi 10× lebih kuat", "\"This is what future-me sounds like\" — moment yang bikin kamu MAU latihan setiap hari. Bukan cuma target abstrak."],
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
              ["Berapa lama processing-nya?", "Setelah bayar + rekam 3 pertanyaan (5 menit), AI processing memakan waktu 30-90 detik. Total dari bayar sampai dengar hasil: sekitar 6-10 menit."],
              ["Apakah harus punya IELTS Mock Test dulu?", "Tidak. Fitur ini standalone — siapa saja bisa beli. Kalau kamu sudah beli IELTS Mock Test kami, kamu juga bisa reuse rekaman dari sana (via halaman report Mock)."],
              ["Bagaimana AI tahu suara saya di Band 8?", "AI kami dilatih pada official IELTS Speaking band descriptors. Kami rewrite jawaban kamu — perbaiki grammar, vocab, linking devices — sesuai rubrik Band 8, LALU generate audio di suara kloningan kamu."],
              ["Apakah aman? Suara saya tidak dibagikan kan?", "100% private. Voice model kamu disimpan hanya untuk generate Band 8 audio, lalu auto-delete dalam 90 hari. Tidak dishare, tidak dipakai untuk train model lain, tidak akan pernah dijual."],
              ["Berapa lama audio Band 8 saya bisa diakses?", "Audio Band 8 kamu tetap bisa didengar/download selamanya. Yang auto-delete dalam 90 hari adalah voice model (agar tidak bisa disalahgunakan untuk clone lain)."],
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
