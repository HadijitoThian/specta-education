import { useEffect } from "react";
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
      enabled: !!token && !!user,
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
  if (!user) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold mb-2">Sign in to see your report</h1>
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </Card>
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

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-slate-500 italic text-center py-4">
      {children}
    </div>
  );
}
