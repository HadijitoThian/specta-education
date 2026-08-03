import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  Award,
  Headphones,
  BookOpen,
  FileText,
  MessageCircle,
  Download,
  Clock,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function IeltsMockReport() {
  const [, params] = useRoute<{ token: string }>(
    "/ielts/mock-test/report/:token"
  );
  const token = params?.token ?? "";
  const { user, loading: authLoading } = useAuth();

  const reportQuery = trpc.ielts.getReport.useQuery(
    { token },
    {
      enabled: !!token,
      refetchOnWindowFocus: false,
      // Auto-poll every 4s while still grading.
      refetchInterval: q => {
        const data = q.state.data;
        return data && "ready" in data && !data.ready ? 4000 : false;
      },
    }
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!token) {
    return (
      <Shell>
        <Card>Missing attempt token.</Card>
      </Shell>
    );
  }
  if (authLoading || reportQuery.isLoading) {
    return (
      <Shell>
        <Card>Loading…</Card>
      </Shell>
    );
  }
  if (reportQuery.isError) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold mb-2">Could not load report</h1>
          <p className="text-sm text-slate-600">{reportQuery.error.message}</p>
        </Card>
      </Shell>
    );
  }

  const isAdmin = user?.role === "admin";

  const data = reportQuery.data!;
  if ("ready" in data && !data.ready) {
    return (
      <Shell>
        <Card>
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-blue-600 mx-auto mb-3 animate-pulse" />
            <h1 className="text-xl font-semibold mb-2">
              Grading your test…
            </h1>
            <p className="text-sm text-slate-600">
              Our AI is scoring Writing and Speaking against the IELTS
              rubric. This usually takes about a minute. The page will
              refresh automatically.
            </p>
            <p className="text-xs text-slate-400 mt-2">Status: {data.status}</p>
          </div>
        </Card>
      </Shell>
    );
  }

  const bands = data.bands;
  const test = data.test;
  const completedStr = data.completedAt
    ? new Date(data.completedAt).toLocaleString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO
        title="Your IELTS Mock Report | SpecTa Education"
        description="Detailed band-score report from your SpecTa IELTS Mock Test."
      />
      <Navigation currentPage="ielts" />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/ielts/mock-test"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to mock test
          </Link>

          {/* Header */}
          <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-700 rounded-3xl shadow-lg p-7 text-white mb-6">
            <div className="text-xs uppercase tracking-wider opacity-80">
              SpecTa IELTS Mock Report
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              Your band-score breakdown
            </h1>
            <div className="text-sm opacity-90 mt-1">
              {test
                ? `${test.title} · ${test.testType === "academic" ? "Academic" : "General Training"} · Code ${test.code}`
                : "—"}
            </div>
            <div className="text-xs opacity-75 mt-1">Completed {completedStr}</div>
          </div>

          {/* Overall + skill grid */}
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <OverallCard band={bands.overall} />
            <div className="grid grid-cols-2 gap-3">
              <SkillBand
                icon={Headphones}
                label="Listening"
                band={bands.listening}
                sub={`${bands.listeningRaw}/40 correct`}
                colour="bg-blue-50 border-blue-200 text-blue-900"
              />
              <SkillBand
                icon={BookOpen}
                label="Reading"
                band={bands.reading}
                sub={`${bands.readingRaw}/40 correct`}
                colour="bg-emerald-50 border-emerald-200 text-emerald-900"
              />
              <SkillBand
                icon={FileText}
                label="Writing"
                band={bands.writing}
                sub="AI-graded"
                colour="bg-purple-50 border-purple-200 text-purple-900"
              />
              <SkillBand
                icon={MessageCircle}
                label="Speaking"
                band={bands.speaking}
                sub="AI-graded"
                colour="bg-rose-50 border-rose-200 text-rose-900"
              />
            </div>
          </div>

          {/* Voice Clone upsell — the emotional-hook feature */}
          <VoiceCloneUpsell attemptToken={token} />

          {/* PDF download */}
          {data.reportPdfUrl ? (
            <a
              href={data.reportPdfUrl}
              download={`SpecTa-IELTS-Mock-Report.pdf`}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    Download PDF report
                  </div>
                  <div className="text-xs text-slate-500">
                    Branded SpecTa report with all sub-scores and feedback
                  </div>
                </div>
              </div>
              <div className="text-sm text-blue-600 font-medium">Download</div>
            </a>
          ) : null}

          {/* Writing detail */}
          <Section title="Writing — per-task breakdown" icon={FileText}>
            {data.writing.length === 0 ? (
              <Empty>No Writing tasks submitted.</Empty>
            ) : (
              data.writing.map(t => (
                <SubScoreBlock
                  key={t.taskNumber}
                  title={`Task ${t.taskNumber}`}
                  band={t.taskBand}
                  rows={[
                    [
                      t.taskNumber === 1 ? "Task Achievement" : "Task Response",
                      t.scoreTA,
                      t.feedback?.ta,
                    ],
                    ["Coherence & Cohesion", t.scoreCC, t.feedback?.cc],
                    ["Lexical Resource", t.scoreLR, t.feedback?.lr],
                    [
                      "Grammatical Range & Accuracy",
                      t.scoreGRA,
                      t.feedback?.gra,
                    ],
                  ]}
                  meta={`${t.wordCount} words`}
                />
              ))
            )}
          </Section>

          {/* Speaking detail */}
          <Section title="Speaking — per-part breakdown" icon={MessageCircle}>
            {data.speaking.length === 0 ? (
              <Empty>No Speaking parts submitted.</Empty>
            ) : (
              data.speaking.map(p => (
                <SubScoreBlock
                  key={p.partNumber}
                  title={`Part ${p.partNumber}`}
                  band={p.partBand}
                  rows={[
                    ["Fluency & Coherence", p.scoreFC, p.feedback?.fc],
                    ["Lexical Resource", p.scoreLR, p.feedback?.lr],
                    [
                      "Grammatical Range & Accuracy",
                      p.scoreGRA,
                      p.feedback?.gra,
                    ],
                    ["Pronunciation*", p.scoreP, p.feedback?.p],
                  ]}
                />
              ))
            )}
            <p className="text-xs text-slate-500 italic mt-3 px-1">
              * Pronunciation is estimated from transcript fluency markers
              (filler words, hesitation). An audio examiner would assess it
              directly.
            </p>
          </Section>

          {/* Admin: re-grade this attempt with the latest grading logic */}
          {isAdmin ? <AdminRegrade token={token} /> : null}

          {/* Admin-only: per-question answer review (students never see this) */}
          {isAdmin ? <ListeningReview token={token} /> : null}

          {/* Disclaimer */}
          <div className="text-xs text-slate-500 text-center leading-relaxed mt-8 mb-6 px-4">
            This is a SpecTa Education practice mock test. It is not an
            official IELTS score and is not affiliated with British Council,
            IDP, or Cambridge Assessment English.
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation currentPage="ielts" />
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">{children}</div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      {children}
    </div>
  );
}

function OverallCard({ band }: { band: number }) {
  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 text-amber-300 text-xs uppercase tracking-wider font-semibold">
          <Award className="w-4 h-4" /> Overall Band
        </div>
        <div className="text-6xl font-extrabold text-amber-300 mt-3 leading-none">
          {band.toFixed(1)}
        </div>
      </div>
      <p className="text-xs text-slate-300 mt-4 leading-relaxed">
        Average of all 4 skill bands, rounded per the IELTS overall band rule.
      </p>
    </div>
  );
}

function SkillBand({
  icon: Icon,
  label,
  band,
  sub,
  colour,
}: {
  icon: any;
  label: string;
  band: number;
  sub: string;
  colour: string;
}) {
  return (
    <div className={`rounded-2xl border ${colour} p-4`}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold mt-2">{band.toFixed(1)}</div>
      <div className="text-xs opacity-70 mt-0.5">{sub}</div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-slate-500" />
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SubScoreBlock({
  title,
  band,
  rows,
  meta,
}: {
  title: string;
  band: number | null;
  rows: Array<[string, number | null, string | undefined]>;
  meta?: string;
}) {
  return (
    <div className="border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-slate-900">{title}</div>
          {meta ? (
            <div className="text-xs text-slate-500 mt-0.5">{meta}</div>
          ) : null}
        </div>
        <div className="text-2xl font-bold text-blue-700">
          {band === null ? "—" : band.toFixed(1)}
        </div>
      </div>
      <div className="space-y-2.5">
        {rows.map(([label, score, fb]) => (
          <div
            key={label}
            className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3"
          >
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                {label}
              </div>
              {fb ? (
                <div className="text-sm text-slate-700 leading-relaxed mt-0.5">
                  {fb}
                </div>
              ) : null}
            </div>
            <div className="text-lg font-bold text-blue-700 sm:w-12 sm:text-right shrink-0">
              {score === null ? "—" : score.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminRegrade({ token }: { token: string }) {
  const utils = trpc.useUtils();
  const diagQuery = trpc.admin.ielts.speakingDiagnostic.useQuery(
    { token },
    { refetchOnWindowFocus: false }
  );
  const regradeMut = trpc.admin.ielts.regradeAttempt.useMutation({
    onSuccess: () => {
      utils.ielts.getReport.invalidate({ token });
      utils.ielts.listeningReview.invalidate({ token });
      utils.admin.ielts.speakingDiagnostic.invalidate({ token });
    },
  });

  const diag = diagQuery.data;
  const studentTurns = diag?.turns.filter(t => t.role === "student") ?? [];

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold text-amber-900">Admin · Re-grade attempt</div>
          <div className="text-xs text-amber-800 mt-0.5">
            Re-transcribes any speaking audio with no transcript, re-grades
            Speaking, and recomputes all bands + PDF with the latest logic.
          </div>
        </div>
        <button
          onClick={() => regradeMut.mutate({ token })}
          disabled={regradeMut.isPending}
          className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-sm font-semibold px-4 py-2 rounded-lg shrink-0"
        >
          {regradeMut.isPending ? "Re-grading…" : "Re-grade now"}
        </button>
      </div>

      {/* Speaking diagnostic */}
      <div className="mt-4 border-t border-amber-200 pt-3">
        <div className="text-xs font-semibold text-amber-900 mb-1">
          Speaking data check
        </div>
        {diagQuery.isLoading ? (
          <div className="text-xs text-amber-800">Checking…</div>
        ) : diagQuery.isError ? (
          <div className="text-xs text-red-600">{diagQuery.error.message}</div>
        ) : diag ? (
          studentTurns.length === 0 ? (
            <div className="text-xs text-red-700">
              No student speaking turns were saved for this attempt — the
              recordings never reached the server, so there is nothing to
              grade. (Conversation rows total: {diag.turns.length}.)
            </div>
          ) : (
            <div className="text-xs text-amber-900">
              <div className="mb-1">
                {studentTurns.length} student turn(s) ·{" "}
                {diag.gradedParts.length} graded part(s)
              </div>
              <div className="overflow-hidden rounded-lg border border-amber-200 bg-white/60">
                <table className="w-full">
                  <thead className="text-[10px] uppercase text-amber-700">
                    <tr>
                      <th className="px-2 py-1 text-left">Part</th>
                      <th className="px-2 py-1 text-left">Transcript chars</th>
                      <th className="px-2 py-1 text-left">Audio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentTurns.map((t, i) => (
                      <tr key={i} className="border-t border-amber-100">
                        <td className="px-2 py-1">{t.partNumber}</td>
                        <td className="px-2 py-1">{t.textLen}</td>
                        <td className="px-2 py-1">
                          {!t.hasAudioKey
                            ? "no key"
                            : t.audioBytes === -1
                              ? "MISSING in storage"
                              : `${t.audioBytes} bytes`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : null}
      </div>

      {regradeMut.isSuccess ? (
        <div className="text-xs text-amber-900 mt-3">
          Done — Speaking parts graded: {regradeMut.data.speakingPartsGraded},
          re-transcribed turns: {regradeMut.data.speakingReTranscribed}. Refresh
          to see updated bands.
        </div>
      ) : null}
      {regradeMut.isError ? (
        <div className="text-xs text-red-600 mt-3">{regradeMut.error.message}</div>
      ) : null}
    </div>
  );
}

function ListeningReview({ token }: { token: string }) {
  const reviewQuery = trpc.ielts.listeningReview.useQuery(
    { token },
    { enabled: !!token, refetchOnWindowFocus: false }
  );

  return (
    <Section title="Listening — answer review" icon={Headphones}>
      {reviewQuery.isLoading ? (
        <Empty>Loading your answers…</Empty>
      ) : reviewQuery.isError ? (
        <Empty>Could not load your answers.</Empty>
      ) : !reviewQuery.data || reviewQuery.data.length === 0 ? (
        <Empty>No Listening answers recorded.</Empty>
      ) : (
        <div className="space-y-5">
          {reviewQuery.data.map(s => (
            <div key={s.sectionNumber}>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Section {s.sectionNumber}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2">Your answer</th>
                      <th className="px-3 py-2">Correct answer</th>
                      <th className="px-3 py-2 w-12 text-center">✓</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.questions.map(q => (
                      <tr
                        key={q.questionNumber}
                        className={q.isCorrect ? "bg-white" : "bg-rose-50/40"}
                      >
                        <td className="px-3 py-2 font-mono text-slate-400 align-top">
                          {q.questionNumber}
                        </td>
                        <td
                          className={`px-3 py-2 align-top ${
                            q.isCorrect
                              ? "text-slate-900"
                              : "text-rose-700 font-medium"
                          }`}
                        >
                          {q.yourAnswer ? q.yourAnswer : <span className="text-slate-400 italic">—</span>}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-700">
                          {q.correctAnswers.join("  /  ")}
                        </td>
                        <td className="px-3 py-2 text-center align-top">
                          {q.isCorrect ? (
                            <Check className="w-4 h-4 text-emerald-600 inline" />
                          ) : (
                            <X className="w-4 h-4 text-rose-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-slate-500 italic text-center py-4">
      {children}
    </div>
  );
}

// ============================================================================
// Voice Clone Upsell — "Hear yourself at Band 8"
// ============================================================================

function VoiceCloneUpsell({ attemptToken }: { attemptToken: string }) {
  const { user } = useAuth();
  const sessionQuery = trpc.ielts.getVoiceCloneSession.useQuery(
    { attemptToken },
    {
      enabled: !!attemptToken,
      refetchOnWindowFocus: false,
      // Poll every 4s while processing so the audio auto-appears on completion.
      refetchInterval: q => {
        const d = q.state.data;
        return d && (d.status === "pending" || d.status === "processing") ? 4000 : false;
      },
    },
  );

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startCheckout = trpc.ielts.startVoiceCloneCheckout.useMutation();

  const session = sessionQuery.data;

  // Session is READY — show the "hear yourself at Band 8" player + comparison
  if (session && session.status === "ready") {
    return (
      <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-3xl shadow-lg p-6 md:p-7 text-white mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80 font-bold">🎙️ Voice Clone · Part {session.targetedPartNumber}</div>
            <h3 className="text-lg md:text-xl font-bold mt-1">Ini suara kamu di Band 8 🚀</h3>
          </div>
          <span className="text-[10px] bg-white/20 rounded-full px-3 py-1 uppercase font-bold tracking-wider">Ready</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider opacity-80 font-bold mb-2">Rekaman kamu (asli)</div>
            {session.originalAudioUrl ? (
              <audio controls src={session.originalAudioUrl} className="w-full" />
            ) : (
              <div className="text-xs italic opacity-70">Audio tidak tersedia</div>
            )}
            <div className="mt-3 text-sm leading-relaxed opacity-95">"{session.originalTranscript?.slice(0, 400)}{(session.originalTranscript?.length || 0) > 400 ? "…" : ""}"</div>
          </div>
          <div className="bg-white/20 border-2 border-white/40 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-amber-200 font-bold mb-2">✨ Suara kamu di Band 8</div>
            {session.band8AudioUrl ? (
              <audio controls src={session.band8AudioUrl} className="w-full" autoPlay={false} />
            ) : (
              <div className="text-xs italic opacity-70">Audio tidak tersedia</div>
            )}
            <div className="mt-3 text-sm leading-relaxed">"{session.band8Transcript?.slice(0, 400)}{(session.band8Transcript?.length || 0) > 400 ? "…" : ""}"</div>
          </div>
        </div>

        {session.changesSummary && (
          <div className="mt-4 bg-white/10 rounded-lg p-3 text-sm">
            <div className="text-xs uppercase tracking-wider opacity-80 font-bold mb-1">Apa yang berubah?</div>
            {session.changesSummary}
          </div>
        )}

        <div className="mt-4 text-xs opacity-75">
          🔒 Voice clone kamu auto-hapus dalam 90 hari. Tidak dibagikan atau digunakan untuk hal lain.
        </div>
      </div>
    );
  }

  // Session is PROCESSING — show polling state
  if (session && (session.status === "processing" || session.status === "pending")) {
    return (
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-lg p-6 md:p-7 text-white mb-6 text-center">
        <div className="text-lg font-bold mb-2">🎙️ Cloning your voice...</div>
        <div className="text-sm opacity-90 mb-3">
          {session.status === "pending"
            ? "Menunggu konfirmasi pembayaran... (biasanya <1 menit)"
            : "AI sedang mengkloning suara kamu + generating Band 8 audio (~30-90 detik)"}
        </div>
        <div className="inline-block h-2 w-40 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/80 animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  // Session FAILED — show fallback
  if (session && session.status === "failed") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 text-sm">
        <div className="font-bold text-red-900">Voice Clone gagal diproses</div>
        <div className="text-red-700 mt-1">{session.errorMessage || "Terjadi error tak dikenal."}</div>
        <div className="text-red-600 mt-2 text-xs">Hubungi hello@testprep.id / SpecTa admin untuk refund atau retry.</div>
      </div>
    );
  }

  // No session yet — show the UPSELL card with checkout form
  return (
    <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-3xl shadow-xl p-6 md:p-7 text-white mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] bg-amber-400 text-slate-900 rounded-full px-3 py-1 uppercase font-black tracking-wider">🔥 NEW</span>
        <span className="text-xs opacity-90 font-medium">Fitur baru khusus untuk kamu</span>
      </div>
      <h3 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">
        Mau dengar suara kamu di Band 8?
      </h3>
      <p className="text-white/95 text-sm md:text-base mb-4 leading-relaxed">
        AI kami akan clone suara kamu, lalu perbaiki jawaban Speaking terlemah kamu ke level Band 8 — grammar, vocabulary, dan struktur kalimat semua di-upgrade. Terus dengar hasilnya dalam <strong>SUARA KAMU SENDIRI</strong>. Powerful psychology hack: "This is what future-me sounds like."
      </p>

      <div className="bg-white/10 rounded-xl p-4 mb-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-black text-amber-300">Rp 49.000</span>
          <span className="text-xs opacity-75">one-off · one Speaking response</span>
        </div>
        <div className="text-xs opacity-80 mt-1">✓ Suara kamu asli · ✓ Text Band 8 vs asli side-by-side · ✓ Deliver dalam menit</div>
      </div>

      <form onSubmit={async e => {
        e.preventDefault();
        setError(null);
        if (!name.trim() || !email.trim()) return setError("Nama dan email required");
        if (!consent) return setError("Kamu harus setuju dengan consent voice cloning");
        try {
          const res = await startCheckout.mutateAsync({
            attemptToken,
            customerName: name.trim(),
            customerEmail: email.trim(),
            customerPhone: phone.trim() || undefined,
            consentGiven: true,
          });
          if (res.alreadyReady) {
            sessionQuery.refetch();
            return;
          }
          if (res.bundleFree) {
            sessionQuery.refetch();
            return;
          }
          if (res.invoiceUrl) window.location.href = res.invoiceUrl;
        } catch (err: any) {
          setError(err?.message ?? "Checkout gagal");
        }
      }} className="space-y-2">
        <input
          type="text" placeholder="Nama lengkap" value={name} onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 placeholder:text-white/60 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <input
          type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 placeholder:text-white/60 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <input
          type="tel" placeholder="WhatsApp (optional)" value={phone} onChange={e => setPhone(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 placeholder:text-white/60 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <label className="flex items-start gap-2 text-xs opacity-90 mt-2 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
          <span>
            Saya setuju SpecTa mengkloning suara saya untuk fitur ini saja. Voice model auto-delete dalam 90 hari.
            <a href="/privacy" target="_blank" className="underline ml-1">Privacy policy</a>.
          </span>
        </label>
        {error && <div className="text-xs bg-red-500/20 border border-red-300/50 rounded-lg px-3 py-2">{error}</div>}
        <button
          type="submit"
          disabled={startCheckout.isPending}
          className="w-full mt-3 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-base shadow-lg transition disabled:opacity-60"
        >
          {startCheckout.isPending ? "Redirecting to checkout…" : "🎙️ Dengar Suara Saya di Band 8 — Rp 49.000"}
        </button>
      </form>
    </div>
  );
}
