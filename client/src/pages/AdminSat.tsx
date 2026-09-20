/**
 * /admin/sat — SpecTa SAT Self-Prep control room (admin only).
 *   Students  — create accounts (temp password emailed), toggle access, reset password
 *   Skills    — generate + approve lessons, generate questions per skill
 *   Questions — review drafts (blind-solve flag), edit, approve/reject
 *   Assign    — auto-build an assignment from approved skills for chosen students
 *   Heatmap   — class × skill mastery; "teach next" list for the offline class
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, XCircle, UserPlus, KeyRound } from "lucide-react";

type Tab = "students" | "skills" | "questions" | "assign" | "heatmap";
const LETTERS = ["A", "B", "C", "D"];

export default function AdminSat() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("students");
  const [msg, setMsg] = useState<string | null>(null);
  const jobs = trpc.admin.sat.jobs.useQuery(undefined, { refetchInterval: 4000 });
  const active = (jobs.data || []).filter(j => j.status === "queued" || j.status === "running");
  const prevActive = useRef(0);
  useEffect(() => { if (prevActive.current > active.length) { utils.admin.sat.skills.invalidate(); utils.admin.sat.questions.invalidate(); } prevActive.current = active.length; }, [active.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="pt-24 pb-16 max-w-6xl mx-auto px-4 space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Admin · SAT Self-Prep</div>
          <h1 className="text-2xl font-black text-slate-900">SpecTa SAT Self-Prep</h1>
          <p className="text-sm text-slate-600 mt-1">Students sign in at <a className="underline" href="/sat/login" target="_blank" rel="noreferrer">/sat/login</a>. Nothing reaches students until a lesson or question is approved here.</p>
          {msg && <div className="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-900 flex justify-between gap-3"><span>{msg}</span><button onClick={() => setMsg(null)} className="text-xs">✕</button></div>}
          {active.length > 0 && <div className="mt-2 text-xs text-indigo-700 animate-pulse">{active.length} generation job{active.length > 1 ? "s" : ""} in progress: {active.map(j => j.label).join(" · ")}</div>}
          {(jobs.data || []).filter(j => j.status === "error").slice(0, 2).map(j => <div key={j.key} className="mt-1 text-xs text-red-600">{j.label}: {j.error}</div>)}
        </div>
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {([["students", "Students"], ["skills", "Skills & lessons"], ["questions", "Question bank"], ["assign", "Assignments"], ["heatmap", "Class heatmap"]] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === k ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{l}</button>
          ))}
        </div>
        {tab === "students" && <Students setMsg={setMsg} />}
        {tab === "skills" && <Skills setMsg={setMsg} />}
        {tab === "questions" && <Questions setMsg={setMsg} />}
        {tab === "assign" && <Assign setMsg={setMsg} />}
        {tab === "heatmap" && <Heatmap />}
      </main>
    </div>
  );
}

// ── Students ──────────────────────────────────────────────────────────────
function Students({ setMsg }: { setMsg: (m: string) => void }) {
  const utils = trpc.useUtils();
  const list = trpc.admin.sat.students.useQuery();
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [sendEmail, setSendEmail] = useState(true);
  const create = trpc.admin.sat.createStudent.useMutation({
    onSuccess: (d) => { setMsg(`Account created. Temporary password: ${d.tempPassword}${d.emailed ? " (emailed to the student)" : " — email NOT sent, share it manually"}`); setEmail(""); setName(""); utils.admin.sat.students.invalidate(); },
    onError: (e) => setMsg(`Error: ${e.message}`),
  });
  const setActive = trpc.admin.sat.setStudentActive.useMutation({ onSuccess: () => utils.admin.sat.students.invalidate() });
  const reset = trpc.admin.sat.resetStudentPassword.useMutation({ onSuccess: (d) => setMsg(`New temporary password: ${d.tempPassword}${d.emailed ? " (emailed)" : " — email NOT sent"}`) });
  return (
    <section className="space-y-4">
      <form onSubmit={e => { e.preventDefault(); create.mutate({ email, name, sendEmail }); }} className="bg-white rounded-2xl border border-slate-200 p-5 grid md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@email.com" className="border rounded-lg px-3 py-2 text-sm" />
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="border rounded-lg px-3 py-2 text-sm" />
        <label className="text-xs text-slate-600 flex items-center gap-1"><input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} /> Email login</label>
        <button type="submit" disabled={create.isPending} className="text-sm px-3 py-2 rounded-lg bg-slate-900 text-white font-semibold flex items-center gap-1 disabled:opacity-50"><UserPlus className="w-4 h-4" />Create account</button>
      </form>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500"><th className="p-3">Student</th><th>Access</th><th>Answered</th><th>Last active</th><th>Last login</th><th></th></tr></thead>
          <tbody>{(list.data || []).map(s => (
            <tr key={s.id} className="border-t border-slate-100">
              <td className="p-3"><div className="font-semibold">{s.name}</div><div className="text-xs text-slate-500">{s.email}{s.targetScore ? ` · target ${s.targetScore}` : ""}{s.testDate ? ` · test ${s.testDate}` : ""}</div></td>
              <td><button onClick={() => setActive.mutate({ id: s.id, active: !s.active })} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{s.active ? "Active" : "Off"}</button></td>
              <td>{s.answered}</td>
              <td className="text-xs text-slate-600">{s.lastActive ? new Date(s.lastActive as any).toLocaleDateString() : "–"}</td>
              <td className="text-xs text-slate-600">{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString() : "never"}</td>
              <td className="p-3 text-right"><button onClick={() => { if (confirm(`Reset password for ${s.name}?`)) reset.mutate({ id: s.id, sendEmail: true }); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 flex items-center gap-1 ml-auto"><KeyRound className="w-3 h-3" />Reset password</button></td>
            </tr>
          ))}</tbody>
        </table>
        {list.data?.length === 0 && <div className="p-5 text-sm text-slate-500">No SAT students yet. Create the first account above.</div>}
      </div>
    </section>
  );
}

// ── Skills & lessons ──────────────────────────────────────────────────────
function Skills({ setMsg }: { setMsg: (m: string) => void }) {
  const utils = trpc.useUtils();
  const skills = trpc.admin.sat.skills.useQuery();
  const [open, setOpen] = useState<string | null>(null);
  const genLesson = trpc.admin.sat.generateLesson.useMutation({ onSuccess: (d) => { setMsg(d.started ? "Lesson queued (about 1–2 minutes)." : `Not started: ${d.reason}`); utils.admin.sat.jobs.invalidate(); } });
  const setLesson = trpc.admin.sat.setLessonStatus.useMutation({ onSuccess: () => utils.admin.sat.skills.invalidate() });
  const genQ = trpc.admin.sat.generateQuestions.useMutation({ onSuccess: (d) => { setMsg(d.started ? "Questions queued (about 2–4 minutes per batch). Review them in the Question bank tab." : `Not started: ${d.reason}`); utils.admin.sat.jobs.invalidate(); } });
  const bySection = useMemo(() => ({ rw: (skills.data || []).filter(s => s.section === "rw"), math: (skills.data || []).filter(s => s.section === "math") }), [skills.data]);
  const genAll = (section: "rw" | "math", diff: 1 | 2 | 3) => { const list = bySection[section]; setMsg(`Queued ${list.length} batches for ${section.toUpperCase()} difficulty ${diff}. They run one by one in the background.`); list.forEach(k => genQ.mutate({ code: k.code, difficulty: diff, count: 6 })); };
  return (
    <section className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-600 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800">Bulk generate 6 questions per skill:</span>
        {(["rw", "math"] as const).map(sec => ([1, 2, 3] as const).map(d => <button key={sec + d} onClick={() => genAll(sec, d)} className="px-2.5 py-1 rounded-lg border border-indigo-300 text-indigo-700 font-semibold">{sec.toUpperCase()} · D{d}</button>))}
        <span className="text-slate-400">D1 easy · D2 medium · D3 hard. Each batch costs a few cents and takes 2–4 minutes.</span>
      </div>
      {(["rw", "math"] as const).map(sec => (
        <div key={sec} className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <div className="px-4 py-2.5 bg-slate-50 border-b font-bold">{sec === "rw" ? "Reading & Writing" : "Math"}</div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500"><th className="p-3">Skill</th><th>Lesson</th><th>Questions (draft / approved)</th><th className="text-right p-3">Generate</th></tr></thead>
            <tbody>{bySection[sec].map(k => (
              <>
                <tr key={k.code} className="border-t border-slate-100 align-top">
                  <td className="p-3"><span className="font-mono text-[10px] text-slate-400 mr-2">{k.code}</span><b>{k.title}</b><div className="text-xs text-slate-500 max-w-md">{k.outcomes}</div></td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${k.lessonStatus === "approved" ? "bg-emerald-100 text-emerald-800" : k.lessonStatus === "draft" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{k.lessonStatus}</span>
                      {k.job === "running" || k.job === "queued" ? <span className="text-[11px] text-indigo-700 animate-pulse">{k.job}…</span> : null}
                      <button onClick={() => genLesson.mutate({ code: k.code })} className="text-[11px] px-2 py-0.5 rounded border border-slate-300">{k.lessonStatus === "none" ? "Generate" : "Regenerate"}</button>
                      {k.lessonStatus !== "none" && <button onClick={() => setOpen(open === k.code ? null : k.code)} className="text-[11px] px-2 py-0.5 rounded border border-slate-300">{open === k.code ? "Hide" : "Preview"}</button>}
                      {k.lessonStatus === "draft" && <button onClick={() => setLesson.mutate({ code: k.code, status: "approved" })} className="text-[11px] px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold">Approve</button>}
                      {k.lessonStatus === "approved" && <button onClick={() => setLesson.mutate({ code: k.code, status: "draft" })} className="text-[11px] px-2 py-0.5 rounded border border-slate-300">Unpublish</button>}
                    </div>
                  </td>
                  <td className="p-3 text-sm"><span className="text-amber-700 font-semibold">{k.counts.draft}</span> / <span className="text-emerald-700 font-semibold">{k.counts.approved}</span></td>
                  <td className="p-3 text-right whitespace-nowrap">{([1, 2, 3] as const).map(d => <button key={d} onClick={() => genQ.mutate({ code: k.code, difficulty: d, count: 6 })} className="text-[11px] px-2 py-0.5 rounded border border-indigo-300 text-indigo-700 ml-1">+6 D{d}</button>)}</td>
                </tr>
                {open === k.code && (
                  <tr key={k.code + "-lesson"} className="bg-slate-50"><td colSpan={4} className="p-4"><LessonPreview en={k.lessonEn as any} id={k.lessonId as any} /></td></tr>
                )}
              </>
            ))}</tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

function LessonPreview({ en, id }: { en: any; id: any }) {
  const [lang, setLang] = useState<"en" | "id">("en");
  const l = lang === "en" ? en : id;
  if (!l) return <div className="text-sm text-slate-500">No lesson content.</div>;
  return (
    <div className="text-sm space-y-2 max-w-3xl">
      <div className="flex gap-1">{(["en", "id"] as const).map(x => <button key={x} onClick={() => setLang(x)} className={`text-[11px] px-2 py-0.5 rounded ${lang === x ? "bg-slate-900 text-white" : "border border-slate-300"}`}>{x.toUpperCase()}</button>)}</div>
      <p>{l.summary}</p>
      <p className="font-semibold">Rule: {l.rule}</p>
      <ol className="list-decimal pl-5 space-y-1">{(l.steps || []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
      <p className="whitespace-pre-wrap"><b>Example:</b> {l.example?.question}</p>
      <p className="whitespace-pre-wrap text-slate-700"><b>Solution:</b> {l.example?.solution}</p>
      <p className="text-amber-800"><b>Trap:</b> {l.trap}</p>
      <p><b>Quick check:</b> {l.quickCheck?.question} → <i>{l.quickCheck?.answer}</i></p>
    </div>
  );
}

// ── Question bank ─────────────────────────────────────────────────────────
function Questions({ setMsg }: { setMsg: (m: string) => void }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"draft" | "approved" | "rejected" | "retired">("draft");
  const [section, setSection] = useState<"rw" | "math" | undefined>(undefined);
  const [code, setCode] = useState("");
  const skills = trpc.admin.sat.skills.useQuery();
  const list = trpc.admin.sat.questions.useQuery({ status, section, code: code || undefined, limit: 150 });
  const setQ = trpc.admin.sat.setQuestionStatus.useMutation({ onSuccess: () => { utils.admin.sat.questions.invalidate(); utils.admin.sat.skills.invalidate(); } });
  const update = trpc.admin.sat.updateQuestion.useMutation({ onSuccess: () => { utils.admin.sat.questions.invalidate(); setMsg("Saved."); } });
  const [editing, setEditing] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const rows = list.data || [];
  return (
    <section className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center gap-2 text-xs">
        {(["draft", "approved", "rejected", "retired"] as const).map(s => <button key={s} onClick={() => { setStatus(s); setSelected(new Set()); }} className={`px-3 py-1 rounded-full border ${status === s ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"}`}>{s}</button>)}
        <span className="mx-2 text-slate-300">|</span>
        {([undefined, "rw", "math"] as const).map(s => <button key={String(s)} onClick={() => setSection(s)} className={`px-3 py-1 rounded-full border ${section === s ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-600"}`}>{s ? s.toUpperCase() : "All"}</button>)}
        <select value={code} onChange={e => setCode(e.target.value)} className="border rounded-lg px-2 py-1"><option value="">All skills</option>{(skills.data || []).map(k => <option key={k.code} value={k.code}>{k.code} · {k.title}</option>)}</select>
        <span className="text-slate-500">{rows.length} shown</span>
        {selected.size > 0 && status === "draft" && <>
          <button onClick={() => { setQ.mutate({ ids: Array.from(selected), status: "approved" }); setSelected(new Set()); }} className="ml-auto px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold">Approve {selected.size}</button>
          <button onClick={() => { setQ.mutate({ ids: Array.from(selected), status: "rejected" }); setSelected(new Set()); }} className="px-3 py-1 rounded-lg bg-red-600 text-white font-semibold">Reject {selected.size}</button>
        </>}
        {status === "draft" && rows.length > 0 && <button onClick={() => setSelected(new Set(rows.filter(r => (r.checks as any)?.blindSolveAgrees).map(r => r.id)))} className="px-3 py-1 rounded-lg border border-slate-300">Select all blind-check ✓</button>}
      </div>
      {list.isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : rows.length === 0 ? <div className="text-sm text-slate-500 p-4">Nothing here. Generate questions from the Skills tab.</div> : rows.map(r => (
        <div key={r.id} className={`bg-white rounded-2xl border p-4 ${selected.has(r.id) ? "border-indigo-400" : "border-slate-200"}`}>
          <div className="flex items-start gap-3">
            {status === "draft" && <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="mt-1" />}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mb-2">
                <span className="font-mono">#{r.id}</span><span className="font-semibold text-slate-700">{r.skillCode} · {r.skillTitle}</span><span>D{r.difficulty}</span><span className="uppercase">{r.format}</span>
                {(r.checks as any)?.blindSolveAgrees ? <span className="text-emerald-700 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />blind-solve agrees</span> : <span className="text-red-600 flex items-center gap-0.5"><XCircle className="w-3 h-3" />blind-solve disagrees ({(r.checks as any)?.blindSolveAnswer ?? "?"})</span>}
                {r.timesServed > 0 && <span>served {r.timesServed} · {r.timesServed ? Math.round((r.timesCorrect / r.timesServed) * 100) : 0}% correct</span>}
                {r.flags > 0 && <span className="text-red-600 font-semibold">⚑ {r.flags} flag{r.flags > 1 ? "s" : ""}</span>}
              </div>
              {editing === r.id ? <QuestionEditor q={r} onSave={(patch) => { update.mutate({ id: r.id, ...patch }); setEditing(null); }} onCancel={() => setEditing(null)} /> : (
                <>
                  {r.passage && <div className="text-sm whitespace-pre-wrap font-serif text-slate-800 mb-2 pb-2 border-b border-slate-100">{r.passage}</div>}
                  <div className="text-sm font-semibold whitespace-pre-wrap">{r.stem}</div>
                  {!!r.choices && <ol className="mt-2 space-y-1 text-sm">{(r.choices as string[]).map((c, i) => <li key={i} className={`flex gap-2 ${LETTERS[i] === r.answer ? "text-emerald-700 font-semibold" : "text-slate-700"}`}><span className="w-5 shrink-0">{LETTERS[i]}.</span><span>{c}</span></li>)}</ol>}
                  {r.format === "spr" && <div className="text-sm mt-1 text-emerald-700 font-semibold">Answer: {r.answer}{(r.acceptedAnswers as string[] | null)?.length ? ` (also ${(r.acceptedAnswers as string[]).join(", ")})` : ""}</div>}
                  <details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer">Explanation & distractor notes</summary>
                    <p className="mt-1 whitespace-pre-wrap">{r.explanationEn}</p>
                    {r.explanationId && <p className="mt-1 whitespace-pre-wrap text-slate-500">ID: {r.explanationId}</p>}
                    {!!r.distractorNotes && <ul className="mt-1">{Object.entries(r.distractorNotes as Record<string, string>).map(([k, v]) => <li key={k}><b>{k}:</b> {String(v)}</li>)}</ul>}
                  </details>
                </>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {r.status !== "approved" && <button onClick={() => setQ.mutate({ ids: [r.id], status: "approved" })} className="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white font-semibold">Approve</button>}
              {r.status !== "rejected" && r.status !== "retired" && <button onClick={() => setQ.mutate({ ids: [r.id], status: r.status === "approved" ? "retired" : "rejected" })} className="text-[11px] px-2 py-1 rounded border border-red-300 text-red-700">{r.status === "approved" ? "Retire" : "Reject"}</button>}
              <button onClick={() => setEditing(editing === r.id ? null : r.id)} className="text-[11px] px-2 py-1 rounded border border-slate-300">Edit</button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function QuestionEditor({ q, onSave, onCancel }: { q: any; onSave: (p: any) => void; onCancel: () => void }) {
  const [passage, setPassage] = useState<string>(q.passage || "");
  const [stem, setStem] = useState<string>(q.stem);
  const [choices, setChoices] = useState<string[]>((q.choices as string[]) || ["", "", "", ""]);
  const [answer, setAnswer] = useState<string>(q.answer);
  const [expl, setExpl] = useState<string>(q.explanationEn || "");
  const [explId, setExplId] = useState<string>(q.explanationId || "");
  return (
    <div className="space-y-2 text-sm">
      <textarea value={passage} onChange={e => setPassage(e.target.value)} placeholder="Passage (optional)" rows={4} className="w-full border rounded-lg px-2 py-1 font-serif" />
      <textarea value={stem} onChange={e => setStem(e.target.value)} rows={2} className="w-full border rounded-lg px-2 py-1 font-semibold" />
      {q.format === "mc" && choices.map((c, i) => <div key={i} className="flex gap-2 items-center"><span className="w-5">{LETTERS[i]}.</span><input value={c} onChange={e => setChoices(cs => cs.map((x, j) => j === i ? e.target.value : x))} className="flex-1 border rounded-lg px-2 py-1" /></div>)}
      <div className="flex gap-2 items-center"><span>Answer</span><input value={answer} onChange={e => setAnswer(e.target.value)} className="w-32 border rounded-lg px-2 py-1 font-mono" /></div>
      <textarea value={expl} onChange={e => setExpl(e.target.value)} placeholder="Explanation (EN)" rows={3} className="w-full border rounded-lg px-2 py-1" />
      <textarea value={explId} onChange={e => setExplId(e.target.value)} placeholder="Penjelasan (ID)" rows={3} className="w-full border rounded-lg px-2 py-1" />
      <div className="flex gap-2"><button onClick={() => onSave({ passage: passage || null, stem, choices: q.format === "mc" ? choices : undefined, answer: answer.trim(), explanationEn: expl, explanationId: explId || null })} className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold">Save</button><button onClick={onCancel} className="px-3 py-1 rounded-lg border text-xs">Cancel</button></div>
    </div>
  );
}

// ── Assignments ───────────────────────────────────────────────────────────
function Assign({ setMsg }: { setMsg: (m: string) => void }) {
  const utils = trpc.useUtils();
  const students = trpc.admin.sat.students.useQuery();
  const skills = trpc.admin.sat.skills.useQuery();
  const list = trpc.admin.sat.assignments.useQuery();
  const [title, setTitle] = useState(""); const [note, setNote] = useState(""); const [dueAt, setDueAt] = useState("");
  const [sids, setSids] = useState<Set<number>>(new Set()); const [codes, setCodes] = useState<Set<string>>(new Set()); const [perSkill, setPerSkill] = useState(5);
  const create = trpc.admin.sat.createAssignment.useMutation({ onSuccess: (d) => { setMsg(`Assignment created with ${d.questionCount} questions.`); setTitle(""); setNote(""); setCodes(new Set()); utils.admin.sat.assignments.invalidate(); }, onError: (e) => setMsg(`Error: ${e.message}`) });
  const tog = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); setter(n); };
  return (
    <section className="grid lg:grid-cols-2 gap-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-bold">New assignment</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title, e.g. Week 3 — Algebra homework" className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note to students (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2 items-center text-sm"><label>Due <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} className="border rounded-lg px-2 py-1" /></label><label>Per skill <input type="number" min={1} max={15} value={perSkill} onChange={e => setPerSkill(Number(e.target.value))} className="w-16 border rounded-lg px-2 py-1" /></label></div>
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">Students <button onClick={() => setSids(new Set((students.data || []).filter(s => s.active).map(s => s.id)))} className="ml-2 text-[11px] underline">all active</button></div>
          <div className="flex flex-wrap gap-1">{(students.data || []).filter(s => s.active).map(s => <button key={s.id} onClick={() => tog(sids, s.id, setSids)} className={`text-xs px-2.5 py-1 rounded-full border ${sids.has(s.id) ? "bg-slate-900 text-white border-slate-900" : "border-slate-300"}`}>{s.name}</button>)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">Skills (only those with approved questions)</div>
          <div className="flex flex-wrap gap-1">{(skills.data || []).filter(k => k.counts.approved > 0).map(k => <button key={k.code} onClick={() => tog(codes, k.code, setCodes)} className={`text-xs px-2.5 py-1 rounded-full border ${codes.has(k.code) ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300"}`}>{k.code} ({k.counts.approved})</button>)}</div>
        </div>
        <button onClick={() => create.mutate({ title, note: note || undefined, studentIds: Array.from(sids), auto: { codes: Array.from(codes), perSkill }, dueAt: dueAt || undefined })} disabled={!title || !sids.size || !codes.size || create.isPending} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">Create assignment</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold mb-3">Sent</h2>
        <ul className="divide-y divide-slate-100 text-sm">{(list.data || []).map(a => <li key={a.id} className="py-2 flex justify-between gap-3"><div><b>{a.title}</b><div className="text-xs text-slate-500">{a.count} questions · {a.dueAt ? `due ${new Date(a.dueAt).toLocaleDateString()}` : "no due date"}</div></div><div className="text-xs text-slate-600 text-right">{a.completed}/{a.students} done</div></li>)}</ul>
        {list.data?.length === 0 && <div className="text-sm text-slate-500">No assignments yet.</div>}
      </div>
    </section>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────
function Heatmap() {
  const h = trpc.admin.sat.heatmap.useQuery();
  if (h.isLoading) return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  if (!h.data) return null;
  const cell = (sid: number, kid: number) => h.data!.cells.find(c => c.studentId === sid && c.skillId === kid);
  const color = (p?: number) => p === undefined ? "bg-slate-50 text-slate-300" : p < 0.25 ? "bg-slate-200" : p < 0.5 ? "bg-amber-200" : p < 0.75 ? "bg-sky-200" : p < 0.9 ? "bg-emerald-200" : "bg-emerald-500 text-white";
  return (
    <section className="space-y-4">
      {h.data.teachNext.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="font-bold mb-1">Teach next in class</div>
          <div className="text-sm text-slate-700">Lowest class-average mastery among practised skills: {h.data.teachNext.map(t => `${t.code} ${t.title} (${Math.round((t.avg || 0) * 100)}%)`).join(" · ")}</div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="text-[11px]">
          <thead><tr><th className="p-2 text-left sticky left-0 bg-white">Student</th>{h.data.skills.map(k => <th key={k.id} className="p-1 font-mono font-normal text-slate-500 whitespace-nowrap" title={k.title}>{k.code}</th>)}</tr></thead>
          <tbody>{h.data.students.map(s => <tr key={s.id} className="border-t border-slate-100"><td className="p-2 font-semibold sticky left-0 bg-white whitespace-nowrap">{s.name}</td>{h.data!.skills.map(k => { const c = cell(s.id, k.id); return <td key={k.id} className={`p-1 text-center ${color(c?.pKnown)}`} title={c ? `${k.title}: ${Math.round(c.pKnown * 100)}% (${c.attempts} tries)` : k.title}>{c ? Math.round(c.pKnown * 100) : "·"}</td>; })}</tr>)}</tbody>
        </table>
        {h.data.students.length === 0 && <div className="p-4 text-sm text-slate-500">No active students yet.</div>}
      </div>
    </section>
  );
}
