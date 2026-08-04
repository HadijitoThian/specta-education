/**
 * Standalone Voice Clone result page — polls session status, shows
 * side-by-side player once processing is done.
 */

import { useEffect, useState } from "react";
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

          {s && s.status === "processing" && <ProcessingProgress step={s.progressStep || null} label={s.progressLabel || null} />}

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
                  {(s as any).pdfUrl && (
                    <a href={(s as any).pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-sm">
                      📄 Download Study PDF
                    </a>
                  )}
                </div>
              </div>

              {(s as any).assessment && <AssessmentCard a={(s as any).assessment} />}

              {(s.parts && s.parts.length > 0 ? s.parts : [{
                partNumber: s.targetedPartNumber,
                originalTranscript: s.originalTranscript,
                originalWordCount: 0,
                originalAudioUrl: s.originalAudioUrl,
                band8Transcript: s.band8Transcript,
                band8WordCount: 0,
                band8AudioUrl: s.band8AudioUrl,
                changesSummary: s.changesSummary,
                vocabularyUpgrades: [],
                grammarUpgrades: [],
                discourseMarkersMissed: [],
              }]).map((p: any) => (
                <PartCard key={p.partNumber} p={p} />
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

// ─── Per-criterion IELTS Speaking assessment card ────────────────────────
const CRITERIA_LABELS: Record<string, string> = {
  fluency: "Fluency & Coherence",
  lexical: "Lexical Resource",
  grammar: "Grammatical Range & Accuracy",
  pronunciation: "Pronunciation",
};

function bandColor(band: number): string {
  if (band >= 8) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (band >= 7) return "bg-lime-100 text-lime-800 border-lime-300";
  if (band >= 6) return "bg-amber-100 text-amber-800 border-amber-300";
  if (band >= 5) return "bg-orange-100 text-orange-800 border-orange-300";
  return "bg-red-100 text-red-800 border-red-300";
}

function AssessmentCard({ a }: { a: any }) {
  const criteria: Array<{ key: "fluency" | "lexical" | "grammar" | "pronunciation" }> = [
    { key: "fluency" }, { key: "lexical" }, { key: "grammar" }, { key: "pronunciation" },
  ];
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
        <div className="font-black text-lg">Your IELTS Speaking Score</div>
        <div className={`px-3 py-1 rounded-full font-black text-lg border-2 ${bandColor(a.overallBand)}`}>
          Overall {Number(a.overallBand).toFixed(1)}
        </div>
      </div>
      <div className="p-5 grid md:grid-cols-2 gap-4">
        {criteria.map(({ key }) => {
          const c = a[key] || { band: 0, feedback: "" };
          const isWeakest = a.weakestCriterion === key;
          return (
            <div key={key} className={`rounded-xl border p-4 ${isWeakest ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-slate-600 font-bold">
                  {CRITERIA_LABELS[key]}{isWeakest && <span className="ml-2 text-red-700">⚠ WEAKEST</span>}
                </div>
                <div className={`px-2 py-0.5 rounded-full text-sm font-black border ${bandColor(c.band)}`}>{Number(c.band).toFixed(1)}</div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{c.feedback}</p>
            </div>
          );
        })}
      </div>
      {a.actionPlan && (
        <div className="mx-5 mb-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 border-2 border-purple-200 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-purple-700 font-black mb-1">🎯 Your Personalized Action Plan</div>
          <p className="text-sm text-slate-800 leading-relaxed">{a.actionPlan}</p>
        </div>
      )}
    </div>
  );
}

// ─── Per-part card — audio + transcripts + learning teardown ─────────────
function PartCard({ p }: { p: any }) {
  const [showTeardown, setShowTeardown] = useState(false);
  const hasTeardown = (p.vocabularyUpgrades?.length || 0) + (p.grammarUpgrades?.length || 0) + (p.discourseMarkersMissed?.length || 0) > 0;
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-5 py-3 flex items-center justify-between">
        <div className="font-black text-lg">Part {p.partNumber}</div>
        <div className="text-xs uppercase tracking-wider opacity-90">
          {p.partNumber === 1 ? "Intro & interview" : p.partNumber === 2 ? "Long turn (cue card)" : "Discussion"}
        </div>
      </div>
      <div className="p-5 grid md:grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2 flex justify-between">
            <span>🎤 Rekaman kamu (asli)</span>
            {p.originalWordCount ? <span className="text-slate-400">{p.originalWordCount} kata</span> : null}
          </div>
          {p.originalAudioUrl ? (
            <audio key={p.originalAudioUrl} controls preload="metadata" src={p.originalAudioUrl} className="w-full" />
          ) : <div className="text-xs italic text-slate-500">Audio tidak tersedia</div>}
          <div className="mt-3 text-sm leading-relaxed text-slate-700 max-h-40 overflow-y-auto">"{p.originalTranscript}"</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-purple-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-purple-700 font-black mb-2 flex justify-between">
            <span>✨ Kamu di Band 8</span>
            {p.band8WordCount ? <span className="text-purple-500">{p.band8WordCount} kata</span> : null}
          </div>
          {p.band8AudioUrl ? (
            <audio key={p.band8AudioUrl} controls preload="metadata" src={p.band8AudioUrl} className="w-full" />
          ) : <div className="text-xs italic text-slate-500">Audio tidak tersedia</div>}
          <div className="mt-3 text-sm leading-relaxed text-slate-800 max-h-40 overflow-y-auto">"{p.band8Transcript}"</div>
        </div>
      </div>
      {p.changesSummary && (
        <div className="mx-5 mb-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-black mb-1">Apa yang berubah?</div>
          {p.changesSummary}
        </div>
      )}
      {hasTeardown && (
        <div className="mx-5 mb-5">
          <button
            onClick={() => setShowTeardown(v => !v)}
            className="w-full text-left text-sm font-bold text-purple-700 hover:text-purple-900 flex items-center justify-between px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
          >
            📚 {showTeardown ? "Sembunyikan" : "Tampilkan"} learning teardown ({(p.vocabularyUpgrades?.length || 0) + (p.grammarUpgrades?.length || 0) + (p.discourseMarkersMissed?.length || 0)} items)
            <span>{showTeardown ? "▲" : "▼"}</span>
          </button>
          {showTeardown && (
            <div className="mt-3 space-y-4">
              {p.vocabularyUpgrades?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-600 font-black mb-2">📖 Vocabulary Upgrades</div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-xs">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold w-1/3">Yours</th>
                          <th className="px-3 py-2 text-left font-semibold w-1/3">Band 8</th>
                          <th className="px-3 py-2 text-left font-semibold">Why</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.vocabularyUpgrades.map((v: any, i: number) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-600 italic">{v.original}</td>
                            <td className="px-3 py-2 text-purple-700 font-semibold">{v.band8}</td>
                            <td className="px-3 py-2 text-slate-600 text-xs">{v.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {p.grammarUpgrades?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-600 font-black mb-2">✍️ Grammar Upgrades</div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-xs">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold w-2/5">Yours</th>
                          <th className="px-3 py-2 text-left font-semibold w-2/5">Band 8</th>
                          <th className="px-3 py-2 text-left font-semibold">Rule</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.grammarUpgrades.map((g: any, i: number) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-600 italic text-xs">{g.original}</td>
                            <td className="px-3 py-2 text-purple-700 font-semibold text-xs">{g.band8}</td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{g.rule}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {p.discourseMarkersMissed?.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider text-emerald-700 font-black mb-2">🔗 Discourse markers Band 8 uses (that you missed)</div>
                  <div className="flex flex-wrap gap-2">
                    {p.discourseMarkersMissed.map((m: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-white border border-emerald-300 text-emerald-800 text-xs font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Processing progress — named phases with check-marks ────────────────
const PIPELINE_STEPS: Array<{ key: string; label: string }> = [
  { key: "loading", label: "Loading your recordings" },
  { key: "transcribing", label: "Transcribing with AI" },
  { key: "assessing", label: "Grading against IELTS rubric" },
  { key: "cloning_voice", label: "Cloning your voice (~30-60s)" },
  { key: "rewriting_p1", label: "Rewriting Part 1 at Band 8" },
  { key: "rewriting_p2", label: "Rewriting Part 2 at Band 8 (~2 min target)" },
  { key: "rewriting_p3", label: "Rewriting Part 3 at Band 8" },
  { key: "synthesizing", label: "Generating Band 8 audio in your voice" },
  { key: "rendering_pdf", label: "Building your study PDF" },
  { key: "delivering", label: "Emailing your report" },
];

function ProcessingProgress({ step, label }: { step: string | null; label: string | null }) {
  const activeIdx = step ? PIPELINE_STEPS.findIndex(s => s.key === step) : -1;
  return (
    <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-3xl shadow-2xl p-6 md:p-8 text-white">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎙️</div>
        <h1 className="text-2xl font-black mb-1">Building your Voice Clone report…</h1>
        <p className="text-white/85 text-sm">Currently: <strong>{label || PIPELINE_STEPS[Math.max(0, activeIdx)]?.label || "Preparing…"}</strong></p>
        <p className="text-white/60 text-xs mt-1">Total estimated time: 90-180 seconds. Halaman ini auto-refresh setiap 4 detik.</p>
      </div>
      <ul className="space-y-2 max-w-md mx-auto">
        {PIPELINE_STEPS.map((s, i) => {
          const done = activeIdx > i;
          const active = activeIdx === i;
          return (
            <li key={s.key} className="flex items-center gap-3 text-sm">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black shrink-0 ${
                done ? "bg-emerald-300 text-emerald-900" : active ? "bg-amber-300 text-amber-900 animate-pulse" : "bg-white/15 text-white/50"
              }`}>
                {done ? "✓" : active ? "•" : i + 1}
              </span>
              <span className={done ? "opacity-70 line-through decoration-white/40" : active ? "font-bold" : "opacity-60"}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

