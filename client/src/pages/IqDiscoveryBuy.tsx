/**
 * /iq-discovery/beli — checkout page for the Rp 59k SpecTa IQ Discovery.
 *
 * Collects name + email + phone, creates a Xendit invoice via
 * trpc.iq.createInvoice, then redirects the browser to the Xendit
 * payment URL. Attribution (gclid + UTM) captured from URL/sessionStorage
 * so the Xendit webhook can upload the offline conversion to Google Ads.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Loader2, ShieldCheck, Lock, Sparkles, Trophy } from "lucide-react";

export default function IqDiscoveryBuy() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const failed = params.get("payment") === "failed";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [attribution, setAttribution] = useState<{ gclid?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string }>({});

  // Capture / restore attribution on mount. Preferred order: URL params →
  // sessionStorage (from an earlier landing hit) → nothing.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const fromUrl = {
        gclid: url.searchParams.get("gclid") || undefined,
        utmSource: url.searchParams.get("utm_source") || undefined,
        utmMedium: url.searchParams.get("utm_medium") || undefined,
        utmCampaign: url.searchParams.get("utm_campaign") || undefined,
      };
      const anyUrl = Object.values(fromUrl).some(Boolean);
      if (anyUrl) {
        setAttribution(fromUrl);
        sessionStorage.setItem("iq_attribution", JSON.stringify(fromUrl));
        return;
      }
      const stored = sessionStorage.getItem("iq_attribution");
      if (stored) setAttribution(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const createInvoice = trpc.iq.createInvoice.useMutation({
    onSuccess: (d) => {
      if (d?.invoiceUrl) {
        window.location.href = d.invoiceUrl;
      }
    },
    onError: (e) => alert(e.message),
  });

  const canSubmit = name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && phone.trim().length >= 6 && !createInvoice.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navigation />
      <main className="max-w-xl mx-auto p-4 pt-20 pb-16">
        <div className="text-center mb-8">
          <div className="inline-block text-5xl mb-3">🧠</div>
          <div className="text-xs uppercase tracking-widest text-indigo-600 font-bold mb-2">SpecTa IQ Discovery</div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
            <span style={{ background: "linear-gradient(90deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Discover otakmu</span> hari ini.
          </h1>
        </div>

        {failed && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
            Pembayaran sebelumnya gagal atau dibatalkan. Coba lagi di bawah — kalau masih bermasalah, WhatsApp <a href="https://wa.me/62818218388" className="underline font-semibold">0818-2183-8388</a>.
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Product summary card */}
          <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
            <div className="flex items-baseline gap-3">
              <div className="text-4xl font-black">Rp 59.000</div>
              <div className="text-lg line-through opacity-60">Rp 89.000</div>
            </div>
            <div className="text-sm text-indigo-100 mt-1">Diskon peluncuran · Hemat Rp 30.000</div>
            <ul className="mt-4 space-y-1.5 text-sm text-indigo-100">
              <li>✓ 40 soal · 5 dimensi kognitif</li>
              <li>✓ Estimasi IQ + arketip kognitif</li>
              <li>✓ Laporan PDF 6 halaman</li>
              <li>✓ Gambar Instagram Story</li>
              <li>✓ Rekomendasi jurusan/karir</li>
            </ul>
          </div>

          {/* Lead form */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Data pembeli</h2>
            <p className="text-xs text-slate-500 mb-4">Link akses akan dikirim ke email kamu setelah pembayaran berhasil.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nama sesuai KTP / rapor"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@kamu.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="08XXXXXXXXXX"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                />
              </div>

              <button
                onClick={() => createInvoice.mutate({
                  name: name.trim(),
                  email: email.trim(),
                  phone: phone.trim(),
                  ...attribution,
                })}
                disabled={!canSubmit}
                className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
              >
                {createInvoice.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
                {createInvoice.isPending ? "Membuka Xendit…" : "Bayar Sekarang · Rp 59k"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-500 justify-center">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Aman via Xendit</span>
              <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> SSL encrypted</span>
              <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Link akses dalam ~1 menit</span>
            </div>

            <p className="mt-3 text-[10px] text-slate-400 text-center italic">
              Estimasi berbasis AI · Bukan pengganti tes IQ klinis · Untuk tujuan self-discovery
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
