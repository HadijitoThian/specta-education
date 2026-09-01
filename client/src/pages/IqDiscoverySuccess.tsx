/**
 * /iq-discovery/payment-success — post-Xendit landing after successful pay.
 *
 * Polls trpc.iq.checkOrderStatus every 2 seconds (max ~90s) until the
 * webhook marks the order as paid + issues an access token. Then:
 *   - If accessToken returned inline → redirect to /iq-discovery?token=X
 *   - If still pending after timeout → show "check your email" fallback
 *     (webhook + email flow is guaranteed by the server, so student always
 *     eventually gets access).
 */

import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, Mail, AlertCircle } from "lucide-react";

export default function IqDiscoverySuccess() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const externalId = params.get("order") || "";

  const [attempts, setAttempts] = useState(0);
  const [redirected, setRedirected] = useState(false);
  const MAX_ATTEMPTS = 45; // 45 × 2s = 90s

  const statusQuery = trpc.iq.checkOrderStatus.useQuery(
    { externalId },
    {
      enabled: !!externalId && !redirected,
      refetchInterval: 2000,
      refetchIntervalInBackground: true,
    }
  );

  useEffect(() => {
    if (!statusQuery.data) return;
    setAttempts(a => a + 1);
    if (statusQuery.data.status === "paid" && statusQuery.data.accessToken && !redirected) {
      setRedirected(true);
      // Small delay so the "verified" state is visible before jumping.
      setTimeout(() => {
        window.location.href = `/iq-discovery?token=${statusQuery.data!.accessToken}`;
      }, 1200);
    }
  }, [statusQuery.data, redirected]);

  const timedOut = attempts >= MAX_ATTEMPTS && statusQuery.data?.status !== "paid";
  const paid = statusQuery.data?.status === "paid" && !!statusQuery.data?.accessToken;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navigation />
      <main className="max-w-xl mx-auto p-4 pt-24 pb-16">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
          {!externalId ? (
            <>
              <AlertCircle className="w-14 h-14 mx-auto text-amber-500 mb-3" />
              <h1 className="text-xl font-bold text-slate-900">Order tidak ditemukan</h1>
              <p className="text-sm text-slate-600 mt-2">
                Buka lagi dari email konfirmasi, atau ke <a href="/iq-discovery" className="text-indigo-600 underline">/iq-discovery</a>.
              </p>
            </>
          ) : paid ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">Pembayaran berhasil! 🎉</h1>
              <p className="text-sm text-slate-600 mt-2">Mengarahkan ke tes dalam sedetik…</p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mt-6" />
            </>
          ) : timedOut ? (
            <>
              <Mail className="w-14 h-14 mx-auto text-indigo-500 mb-3" />
              <h1 className="text-xl font-bold text-slate-900">Cek email kamu 📧</h1>
              <p className="text-sm text-slate-600 mt-2">
                Pembayaran sedang diverifikasi. Link akses tes sedang dikirim ke email kamu — biasanya dalam 1-2 menit. Kalau belum masuk dalam 10 menit, WhatsApp <a href="https://wa.me/62818218388" className="text-indigo-600 underline font-semibold">0818-2183-8388</a>.
              </p>
              <div className="text-[10px] text-slate-400 mt-4">Order: {externalId}</div>
            </>
          ) : (
            <>
              <Loader2 className="w-14 h-14 animate-spin mx-auto text-indigo-500 mb-3" />
              <h1 className="text-xl font-bold text-slate-900">Memverifikasi pembayaran…</h1>
              <p className="text-sm text-slate-600 mt-2">
                Xendit sedang konfirmasi ke bank kamu. Biasanya 5-30 detik. Jangan tutup tab ini.
              </p>
              <div className="text-[10px] text-slate-400 mt-4">
                Order: {externalId}  ·  Attempt {attempts}/{MAX_ATTEMPTS}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
