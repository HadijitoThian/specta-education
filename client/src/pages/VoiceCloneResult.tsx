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
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-3xl shadow-2xl p-6 md:p-8 text-white">
                <div className="text-center">
                  <div className="text-4xl mb-2">✨</div>
                  <h1 className="text-2xl md:text-3xl font-black mb-1">
                    {s.customerName || "You"} — Band 8
                  </h1>
                  <p className="text-white/85 text-sm">
                    {s.parts && s.parts.length > 1
                      ? `Semua ${s.parts.length} bagian IELTS Speaking · rewritten to Band 8 in your own cloned voice`
                      : `Part ${s.targetedPartNumber} · rewritten to Band 8 level in your own voice`}
                  </p>
                </div>
              </div>

              {(s.parts && s.parts.length > 0 ? s.parts : [{
                partNumber: s.targetedPartNumber,
                originalTranscript: s.originalTranscript,
                originalAudioUrl: s.originalAudioUrl,
                band8Transcript: s.band8Transcript,
                band8AudioUrl: s.band8AudioUrl,
                changesSummary: s.changesSummary,
              }]).map((p: any) => (
                <div key={p.partNumber} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-5 py-3 flex items-center justify-between">
                    <div className="font-black text-lg">Part {p.partNumber}</div>
                    <div className="text-xs uppercase tracking-wider opacity-90">
                      {p.partNumber === 1 ? "Intro & interview" : p.partNumber === 2 ? "Long turn (cue card)" : "Discussion"}
                    </div>
                  </div>
                  <div className="p-5 grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">🎤 Rekaman kamu (asli)</div>
                      {p.originalAudioUrl ? (
                        <audio
                          key={p.originalAudioUrl}
                          controls
                          preload="metadata"
                          src={p.originalAudioUrl}
                          className="w-full"
                        />
                      ) : <div className="text-xs italic text-slate-500">Audio tidak tersedia</div>}
                      <div className="mt-3 text-sm leading-relaxed text-slate-700 max-h-40 overflow-y-auto">
                        "{p.originalTranscript}"
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-purple-50 border-2 border-amber-300 rounded-xl p-4">
                      <div className="text-xs uppercase tracking-wider text-purple-700 font-black mb-2">✨ Kamu di Band 8</div>
                      {p.band8AudioUrl ? (
                        <audio
                          key={p.band8AudioUrl}
                          controls
                          preload="metadata"
                          src={p.band8AudioUrl}
                          className="w-full"
                        />
                      ) : <div className="text-xs italic text-slate-500">Audio tidak tersedia</div>}
                      <div className="mt-3 text-sm leading-relaxed text-slate-800 max-h-40 overflow-y-auto">
                        "{p.band8Transcript}"
                      </div>
                    </div>
                  </div>
                  {p.changesSummary && (
                    <div className="mx-5 mb-5 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                      <div className="text-xs uppercase tracking-wider text-slate-500 font-black mb-1">Apa yang berubah?</div>
                      {p.changesSummary}
                    </div>
                  )}
                </div>
              ))}

              <div className="bg-gradient-to-br from-purple-700 via-fuchsia-700 to-pink-700 rounded-2xl p-6 text-white">
                <div className="text-center mb-3">
                  <div className="text-xs opacity-75">
                    🔒 Voice clone auto-hapus 90 hari · Audio Band 8 tersimpan selamanya untuk kamu
                  </div>
                </div>
                <div className="pt-4 border-t border-white/20">
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
