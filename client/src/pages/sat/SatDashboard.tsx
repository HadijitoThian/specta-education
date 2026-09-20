/** /sat — student home: this week, assignments, and the skill tree with mastery. */
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ClipboardList, Flame, Target } from "lucide-react";
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
  const utils = trpc.useUtils();
  const startDrill = trpc.sat.startDrill.useMutation({ onSuccess: (d) => navigate(`/sat/drill/${d.attemptId}`) });
  const startAssignment = trpc.sat.startAssignment.useMutation({ onSuccess: (d) => navigate(`/sat/drill/${d.attemptId}`) });
  const setPrefs = trpc.sat.setPrefs.useMutation({ onSuccess: () => utils.sat.me.invalidate() });
  const [target, setTarget] = useState<string>("");
  const [date, setDate] = useState<string>("");

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
          { label: t.days, value: w?.activeDays ?? "–", icon: <Flame className="w-4 h-4 text-orange-500" /> },
          { label: t.minutes, value: w?.minutes ?? "–" },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">{c.icon}{t.week} · {c.label}</div>
            <div className="text-2xl font-black mt-1">{c.value}</div>
          </div>
        ))}
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
