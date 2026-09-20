/** /sat — student home: this week, assignments, and the skill tree with mastery. */
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ClipboardList, Flame, Target, CalendarClock, Sparkles, FileText } from "lucide-react";
import SatShell, { masteryBar, MASTERY_TEXT } from "./SatShell";

const T = {
  en: { week: "This week", answered: "answered", accuracy: "accuracy", days: "active days", minutes: "minutes", assignments: "Assignments from your teacher", noAssign: "No assignments yet.", start: "Start", continue: "Continue", done: "Done", due: "Due", skills: "Skill tree", rw: "Reading & Writing", math: "Math", ofTest: "of the section", practise: "Practise", lesson: "Lesson", noQ: "Coming soon", questions: "questions", target: "Target score", testDate: "Test date", set: "Set", tip: "Pick a skill and do 8 questions. Aim for two or three skills a day." },
  id: { week: "Minggu ini", answered: "dijawab", accuracy: "akurasi", days: "hari aktif", minutes: "menit", assignments: "Tugas dari gurumu", noAssign: "Belum ada tugas.", start: "Mulai", continue: "Lanjutkan", done: "Selesai", due: "Batas", skills: "Peta skill", rw: "Reading & Writing", math: "Matematika", ofTest: "dari bagian ini", practise: "Latihan", lesson: "Pelajaran", noQ: "Segera hadir", questions: "soal", target: "Target skor", testDate: "Tanggal tes", set: "Simpan", tip: "Pilih satu skill dan kerjakan 8 soal. Targetkan dua atau tiga skill sehari." },
};

export default function SatDashboard() {
  const [, navigate] = useLocation();
  const me = trpc.sat.me.useQuery(undefined, { retry: false });
  const lang = (me.data?.lang || "en") as "en" | "id";
  const t = T[lang];
  const skills = trpc.sat.skills.useQuery(undefined, { enabled: !!me.data });
  const progress = trpc.sat.progress.useQuery(undefined, { enabled: !!me.data });
  const assignments = trpc.sat.assignments.useQuery(undefined, { enabled: !!me.data });
  const plan = trpc.sat.plan.useQuery(undefined, { enabled: !!me.data });
  const tests = trpc.sat.tests.useQuery(undefined, { enabled: !!me.data });
  const startTest = trpc.sat.startTest.useMutation({ onSuccess: (d) => navigate(`/sat/test/${d.sessionId}`) });
  const openTest = (tests.data || []).find(x => x.status === "active" || x.status === "break");
  const utils = trpc.useUtils();
  const startDrill = trpc.sat.startDrill.useMutation({ onSuccess: (d) => navigate(`/sat/drill/${d.attemptId}`) });
  const startAssignment = trpc.sat.startAssignment.useMutation({ onSuccess: (d) => navigate(`/sat/drill/${d.attemptId}`) });
  const setPrefs = trpc.sat.setPrefs.useMutation({ onSuccess: () => utils.sat.me.invalidate() });
  const [target, setTarget] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const official = trpc.sat.officialScores.useQuery(undefined, { enabled: !!me.data });
  const quota = trpc.sat.liveQuota.useQuery(undefined, { enabled: !!me.data });
  const addOfficial = trpc.sat.addOfficialScore.useMutation({ onSuccess: () => { utils.sat.officialScores.invalidate(); utils.sat.plan.invalidate(); setOs({ rw: "", math: "", date: "", source: "bluebook" }); } });
  const delOfficial = trpc.sat.deleteOfficialScore.useMutation({ onSuccess: () => { utils.sat.officialScores.invalidate(); utils.sat.plan.invalidate(); } });
  const [os, setOs] = useState<{ rw: string; math: string; date: string; source: "bluebook" | "real" | "other" }>({ rw: "", math: "", date: "", source: "bluebook" });

  const grouped = useMemo(() => {
    const out: Record<"rw" | "math", Record<string, NonNullable<typeof skills.data>>> = { rw: {}, math: {} };
    for (const k of skills.data || []) { const g = out[k.section as "rw" | "math"]; (g[k.domainLabel] ||= []).push(k); }
    return out;
  }, [skills.data]);

  const w = progress.data?.week;
  const acc = w && w.answered ? Math.round((w.correct / w.answered) * 100) : null;

  return (
    <SatShell>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black">{lang === "id" ? "Halo" : "Hi"}, {me.data?.name?.split(" ")[0]} 👋</h1>
          <p className="text-sm text-slate-600">{t.tip}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1 text-slate-600"><Target className="w-3.5 h-3.5" />{t.target}
            <input value={target || (me.data?.targetScore ?? "")} onChange={e => setTarget(e.target.value)} onBlur={() => { const n = Number(target); if (n >= 400 && n <= 1600) setPrefs.mutate({ targetScore: n }); }} placeholder="1400" className="w-16 border rounded-lg px-2 py-1 text-xs" />
          </label>
          <label className="flex items-center gap-1 text-slate-600">{t.testDate}
            <input type="date" value={date || (me.data?.testDate ?? "")} onChange={e => { setDate(e.target.value); setPrefs.mutate({ testDate: e.target.value }); }} className="border rounded-lg px-2 py-1 text-xs" />
          </label>
        </div>
      </div>

      {/* This week */}
      <section className="grid sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: t.answered, value: w?.answered ?? "–" },
          { label: t.accuracy, value: acc === null ? "–" : `${acc}%` },
          { label: lang === "id" ? "hari berturut" : "day streak", value: progress.data?.streak ?? "–", icon: <Flame className="w-4 h-4 text-orange-500" /> },
          { label: t.minutes, value: w?.minutes ?? "–" },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">{c.icon}{t.week} · {c.label}</div>
            <div className="text-2xl font-black mt-1">{c.value}</div>
          </div>
        ))}
      </section>

      {/* Access expiry */}
      {me.data?.accessUntil && (() => { const days = Math.ceil((me.data!.accessUntil! - Date.now()) / 86400000); const dateStr = new Date(me.data!.accessUntil!).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric" }); return (
        <div className={`mb-4 rounded-2xl px-4 py-2.5 text-sm border ${days <= 7 ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-white border-slate-200 text-slate-600"}`}>
          {lang === "id" ? <>Akses platform sampai <b>{dateStr}</b>{days <= 7 ? <> · tinggal <b>{Math.max(0, days)} hari</b>. Hubungi SpecTa untuk perpanjang.</> : null}</> : <>Platform access until <b>{dateStr}</b>{days <= 7 ? <> · <b>{Math.max(0, days)} day{days === 1 ? "" : "s"}</b> left. Contact SpecTa to extend.</> : null}</>}
        </div>
      ); })()}

      {/* Live Emma minutes */}
      {quota.data && (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <div>
            🎧 {lang === "id" ? <>Bicara dengan Emma: gratis <b>{quota.data.freeMinutesPerWeek / 60} jam per minggu</b> (reset Senin). Sisa minggu ini <b>{Math.floor(quota.data.freeRemainingSec / 60)} menit</b>{quota.data.creditSec > 0 ? <>, kredit <b>{Math.floor(quota.data.creditSec / 60)} menit</b></> : null}.</> : <>Talk to Emma: <b>{quota.data.freeMinutesPerWeek / 60} free hours a week</b> (resets Monday). <b>{Math.floor(quota.data.freeRemainingSec / 60)} min</b> left this week{quota.data.creditSec > 0 ? <>, credit <b>{Math.floor(quota.data.creditSec / 60)} min</b></> : null}.</>}
          </div>
          <Link href="/sat/credits" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white">{lang === "id" ? `Beli kredit · Rp ${quota.data.pricePerHour.toLocaleString("id-ID")}/jam` : `Buy credit · Rp ${quota.data.pricePerHour.toLocaleString("id-ID")}/hour`}</Link>
        </div>
      )}

      {/* Today's plan + predicted score + tests */}
      <section className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-1">
          <h2 className="font-bold flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-indigo-600" />{lang === "id" ? "Rencana hari ini" : "Today's plan"}</h2>
          <div className="text-xs text-slate-500 mb-3">{plan.data?.daysToTest !== null && plan.data?.daysToTest !== undefined ? <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{plan.data.daysToTest > 0 ? (lang === "id" ? `${plan.data.daysToTest} hari lagi menuju tes` : `${plan.data.daysToTest} days to your test`) : (lang === "id" ? "Hari tes!" : "Test day!")}</span> : (lang === "id" ? "±20 menit" : "About 20 minutes")}</div>
          {plan.isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : (plan.data?.items.length || 0) === 0 ? <div className="text-sm text-slate-500">{lang === "id" ? "Belum ada soal yang disetujui. Cek lagi nanti." : "No approved content yet. Check back soon."}</div> : (
            <ol className="space-y-2">{plan.data!.items.map((it, i) => (
              <li key={it.code} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0"><div className="font-medium truncate">{it.title}</div><div className="text-[11px] text-slate-500">{it.section === "rw" ? "RW" : "Math"} · {it.reason === "new" ? (lang === "id" ? "baru" : "new") : it.reason === "weak" ? (lang === "id" ? "perlu latihan" : "needs work") : (lang === "id" ? "ulas" : "review")} · {it.minutes} min</div></div>
                {it.action === "lesson" ? <Link href={`/sat/skill/${it.code}`} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300">{t.lesson}</Link> : <button onClick={() => startDrill.mutate({ code: it.code, count: 8 })} disabled={startDrill.isPending} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-900 text-white disabled:opacity-60">{t.practise}</button>}
              </li>
            ))}</ol>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold mb-1">{lang === "id" ? "Perkiraan skor" : "Predicted score"}</h2>
          {plan.data ? (
            <>
              <div className="text-4xl font-black">{plan.data.predicted.practised === 0 && !plan.data.predicted.lastMock && !plan.data.predicted.lastOfficial ? "—" : plan.data.predicted.total}<span className="text-sm text-slate-400 font-semibold"> / 1600</span></div>
              <div className="text-xs text-slate-500 mt-1">{plan.data.predicted.practised === 0 && !plan.data.predicted.lastMock && !plan.data.predicted.lastOfficial ? (lang === "id" ? "Belum ada data" : "No data yet") : `RW ${plan.data.predicted.rw} · Math ${plan.data.predicted.math}`}{plan.data.targetScore ? ` · ${lang === "id" ? "target" : "target"} ${plan.data.targetScore}` : ""}</div>
              <div className="text-[11px] text-slate-400 mt-2">{plan.data.predicted.practised === 0 && !plan.data.predicted.lastMock && !plan.data.predicted.lastOfficial ? (lang === "id" ? "Kerjakan diagnostik untuk mendapat perkiraan." : "Take the diagnostic to get an estimate.") : plan.data.predicted.basis === "calibrated" ? (lang === "id" ? `Dikalibrasi dengan skor resmi ${plan.data.predicted.lastOfficial?.total}.` : `Calibrated with your official score of ${plan.data.predicted.lastOfficial?.total}.`) : plan.data.predicted.basis === "blend" ? (lang === "id" ? "Dari mock terakhir + latihan harian." : "From your latest mock + daily practice.") : (lang === "id" ? "Dari latihan harian; mock akan mempertajam." : "From daily practice; a full mock will sharpen this.")}</div>
            </>
          ) : <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-indigo-600" />{lang === "id" ? "Tes" : "Tests"}</h2>
          {openTest ? <Link href={`/sat/test/${openTest.id}`} className="block text-center text-sm font-bold px-3 py-2 rounded-xl bg-amber-500 text-white mb-2">{lang === "id" ? "Lanjutkan tes yang berjalan" : "Resume test in progress"} →</Link> : (
            <div className="flex flex-col gap-2 mb-2">
              {!plan.data?.hasDiagnostic && <button onClick={() => startTest.mutate({ kind: "diagnostic" })} disabled={startTest.isPending} className="text-sm font-bold px-3 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-60">{lang === "id" ? "Tes diagnostik" : "Diagnostic test"} <span className="font-normal text-slate-300">· 49 q · 67 min</span></button>}
              <button onClick={() => startTest.mutate({ kind: "mock" })} disabled={startTest.isPending} className="text-sm font-bold px-3 py-2 rounded-xl border-2 border-slate-900 disabled:opacity-60">{lang === "id" ? "Tes lengkap" : "Full practice test"} <span className="font-normal text-slate-500">· 98 q · 2h 14m</span></button>
            </div>
          )}
          {startTest.error && <div className="text-xs text-red-600 mb-2">{startTest.error.message}</div>}
          <ul className="text-xs divide-y divide-slate-100">{(tests.data || []).filter(x => x.status === "completed").slice(0, 4).map(x => <li key={x.id} className="py-1.5 flex justify-between"><span>{x.kind === "mock" ? (lang === "id" ? "Tes lengkap" : "Full test") : (lang === "id" ? "Diagnostik" : "Diagnostic")} · {x.completedAt ? new Date(x.completedAt).toLocaleDateString() : ""}</span><Link href={`/sat/test/${x.id}/report`} className="font-bold text-indigo-700">{x.scores?.total ?? "—"} →</Link></li>)}</ul>
        </div>
      </section>

      {/* Official scores (calibration) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="font-bold">{lang === "id" ? "Skor resmi" : "Official scores"}</h2>
          <span className="text-xs text-slate-500">{lang === "id" ? "Masukkan skor Bluebook practice test atau SAT asli agar perkiraan lebih akurat." : "Enter Bluebook practice test or real SAT scores to calibrate your prediction."}</span>
        </div>
        <form onSubmit={e => { e.preventDefault(); const rw = Number(os.rw), math = Number(os.math); if (rw >= 200 && rw <= 800 && math >= 200 && math <= 800) addOfficial.mutate({ source: os.source, testDate: os.date || undefined, rw, math }); }} className="flex flex-wrap gap-2 items-center text-xs mb-3">
          <select value={os.source} onChange={e => setOs(o => ({ ...o, source: e.target.value as any }))} className="border rounded-lg px-2 py-1.5"><option value="bluebook">Bluebook practice</option><option value="real">Real SAT</option><option value="other">Other</option></select>
          <input type="date" value={os.date} onChange={e => setOs(o => ({ ...o, date: e.target.value }))} className="border rounded-lg px-2 py-1.5" />
          <input value={os.rw} onChange={e => setOs(o => ({ ...o, rw: e.target.value }))} placeholder="RW 200–800" className="border rounded-lg px-2 py-1.5 w-28" />
          <input value={os.math} onChange={e => setOs(o => ({ ...o, math: e.target.value }))} placeholder="Math 200–800" className="border rounded-lg px-2 py-1.5 w-28" />
          <button type="submit" disabled={addOfficial.isPending} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50">{lang === "id" ? "Simpan" : "Add"}</button>
        </form>
        {(official.data?.length || 0) > 0 ? <ul className="text-sm divide-y divide-slate-100">{official.data!.map(o => <li key={o.id} className="py-1.5 flex items-center justify-between"><span>{o.source === "real" ? "Real SAT" : o.source === "bluebook" ? "Bluebook" : "Other"}{o.testDate ? ` · ${o.testDate}` : ""} · RW {o.rw} · Math {o.math}</span><span className="flex items-center gap-3"><b>{o.total}</b><button onClick={() => delOfficial.mutate({ id: o.id })} className="text-xs text-slate-400 hover:text-red-600">✕</button></span></li>)}</ul> : <div className="text-xs text-slate-400">{lang === "id" ? "Belum ada skor resmi." : "No official scores yet."}</div>}
      </section>

      {/* Assignments */}
      {(assignments.data?.length || 0) > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <h2 className="font-bold flex items-center gap-2 mb-3"><ClipboardList className="w-4 h-4 text-indigo-600" />{t.assignments}</h2>
          <ul className="divide-y divide-slate-100">
            {assignments.data!.map(a => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{a.title}</div>
                  <div className="text-xs text-slate-500">{a.count} {t.questions}{a.dueAt ? ` · ${t.due} ${new Date(a.dueAt).toLocaleDateString()}` : ""}{a.note ? ` · ${a.note}` : ""}</div>
                </div>
                {a.status === "completed"
                  ? <Link href={`/sat/drill/${a.attemptId}`} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">{t.done} ✓</Link>
                  : <button onClick={() => startAssignment.mutate({ assignmentId: a.id })} disabled={startAssignment.isPending} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-60">{a.status === "in_progress" ? t.continue : t.start}</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Skill tree */}
      <h2 className="font-bold mb-3">{t.skills}</h2>
      {skills.isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : (
        <div className="grid lg:grid-cols-2 gap-5">
          {(["rw", "math"] as const).map(section => (
            <div key={section} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black">{t[section]}</h3>
                {progress.data && (() => { const ds = progress.data.domains.filter(d => (section === "rw" ? ["CS", "II", "SEC", "EOI"] : ["ALG", "ADV", "PSDA", "GEO"]).includes(d.code)); const m = ds.length ? ds.reduce((x, d) => x + d.mastery * d.share, 0) / ds.reduce((x, d) => x + d.share, 0) : 0.2; return <span className="text-xs text-slate-500">{Math.round(m * 100)}% {lang === "id" ? "dikuasai" : "mastered"}</span>; })()}
              </div>
              {Object.entries(grouped[section]).map(([domain, list]) => (
                <div key={domain} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-sm">{domain}</span>
                    <span className="text-[11px] text-slate-500">~{list[0]?.domainShare}% {t.ofTest}</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {list.map(k => (
                      <li key={k.code} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400">{k.code}</span>
                            <span className="font-medium text-sm truncate">{k.title}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${masteryBar(k.mastery.pKnown)}`} style={{ width: `${Math.round(k.mastery.pKnown * 100)}%` }} /></div>
                            <span className="text-[11px] text-slate-500 w-24 truncate">{MASTERY_TEXT[k.mastery.label][lang]}{k.mastery.attempts ? ` · ${k.mastery.correct}/${k.mastery.attempts}` : ""}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {k.hasLesson && <Link href={`/sat/skill/${k.code}`} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">{t.lesson}</Link>}
                          {k.questionCount > 0
                            ? <button onClick={() => startDrill.mutate({ code: k.code, count: 8 })} disabled={startDrill.isPending} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-900 text-white disabled:opacity-60">{t.practise}</button>
                            : <span className="text-[11px] text-slate-400 px-2">{t.noQ}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </SatShell>
  );
}
