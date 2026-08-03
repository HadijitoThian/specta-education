/**
 * Standalone Voice Clone result page — polls session status, shows
 * side-by-side player once processing is done.
 */

import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { SEO } from "@/components/SEO";

export default function VoiceCloneResult() {
  const [, params] = useRoute<{ sessionToken: string }>("/voice-clone/result/:sessionToken");
  const sessionToken = params?.sessionToken || "";
  const query = trpc.ielts.getVoiceCloneSessionByToken.useQuery(
    { sessionToken },
    {
      enabled: !!sessionToken,
      refetchInterval: q => {
        const d = q.state.data;
        return d && (d.status === "pending" || d.status === "processing") ? 4000 : false;
      },
      refetchOnWindowFocus: false,
    },
  );
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const s = query.data;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title="Voice Clone Result | SpecTa Education" description="Dengar suara kamu di IELTS Band 8." />
      <Navigation currentPage="voice-clone" />
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/voice-clone" className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block">← Kembali ke Voice Clone</Link>

          {!sessionToken || query.isError && (
            <Card><h1 className="text-xl font-bold">Sesi tidak ditemukan</h1></Card>
          )}

          {query.isLoading && <Card>Loading…</Card>}

          {s && s.status === "processing" && (
            <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white text-center">
              <div className="text-4xl mb-4">🎙️</div>
              <h1 className="text-2xl font-black mb-2">Cloning your voice...</h1>
              <p className="text-white/90 mb-6">AI sedang mengkloning suara kamu + generating Band 8 audio (~30-90 detik).</p>
              <div className="inline-block h-2 w-56 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/80 animate-pulse w-3/4" />
              </div>
              <p className="text-xs opacity-70 mt-6">Halaman ini otomatis refresh saat hasil siap.</p>
            </div>
          )}

          {s && s.status === "pending" && (
            <Card>
              <h1 className="text-xl font-bold mb-2">Menunggu processing…</h1>
              <p className="text-sm text-slate-600">Kalau kamu belum selesai rekam 3 pertanyaan, kembali ke halaman rekaman.</p>
              <Link href={`/voice-clone/record/${sessionToken}`} className="inline-block mt-3 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold">
                Kembali rekam
              </Link>
            </Card>
          )}

          {s && s.status === "failed" && (
            <Card>
              <h1 className="text-xl font-bold text-red-700 mb-2">Voice Clone gagal diproses</h1>
              <p className="text-sm text-red-600 mb-3">{s.errorMessage || "Terjadi error yang tidak diketahui."}</p>
              <p className="text-sm text-slate-600">Hubungi <a href="mailto:info@spectaeducation.com" className="underline text-purple-700">info@spectaeducation.com</a> untuk refund atau retry.</p>
            </Card>
          )}

          {s && s.status === "ready" && (
            <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-3xl shadow-2xl p-6 md:p-8 text-white">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">✨</div>
                <h1 className="text-2xl md:text-3xl font-black mb-1">
                  {s.customerName || "You"} — Band 8
                </h1>
                <p className="text-white/85 text-sm">Part {s.targetedPartNumber} · rewritten to Band 8 level in your own voice</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wider opacity-80 font-bold mb-2">🎤 Rekaman kamu (asli)</div>
                  {s.originalAudioUrl ? (
                    <audio controls src={s.originalAudioUrl} className="w-full" />
                  ) : <div className="text-xs italic opacity-70">Audio tidak tersedia</div>}
                  <div className="mt-3 text-sm leading-relaxed opacity-95 max-h-40 overflow-y-auto">
                    "{s.originalTranscript}"
                  </div>
                </div>
                <div className="bg-white/20 border-2 border-white/40 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wider text-amber-200 font-black mb-2">✨ Kamu di Band 8</div>
                  {s.band8AudioUrl ? (
                    <audio controls src={s.band8AudioUrl} className="w-full" />
                  ) : <div className="text-xs italic opacity-70">Audio tidak tersedia</div>}
                  <div className="mt-3 text-sm leading-relaxed max-h-40 overflow-y-auto">
                    "{s.band8Transcript}"
                  </div>
                </div>
              </div>

              {s.changesSummary && (
                <div className="mt-4 bg-white/10 rounded-lg p-3 text-sm">
                  <div className="text-xs uppercase tracking-wider opacity-80 font-black mb-1">Apa yang berubah?</div>
                  {s.changesSummary}
                </div>
              )}

              <div className="mt-4 text-center">
                <div className="text-xs opacity-75">
                  🔒 Voice clone auto-hapus 90 hari · Audio Band 8 tersimpan selamanya untuk kamu
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="text-center">
                  <p className="text-sm mb-3">Mau prep IELTS lebih lengkap?</p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Link href="/ielts/mock-test" className="px-4 py-2 bg-white text-purple-700 rounded-lg text-sm font-bold hover:bg-amber-50">
                      Coba IELTS Mock Test →
                    </Link>
                    <Link href="/ielts/tutor" className="px-4 py-2 bg-amber-400 text-slate-900 rounded-lg text-sm font-bold hover:bg-amber-300">
                      Latihan dengan AI Tutor →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">{children}</div>;
}
