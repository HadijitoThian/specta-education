/**
 * CRM Students list (Phase 2). Filter by stage / office / mine, search, add.
 * Click a row to open the Student 360 page.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { CrmShell, StageBadge, CRM_OFFICES, inputCls } from "./CrmShell";

const PURPLE = "#9C27B0";

function timeAgo(d: Date | string | null) {
  if (!d) return "no activity yet";
  const t = new Date(d).getTime();
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CrmStudents() {
  const [, setLocation] = useLocation();
  const [stage, setStage] = useState<string>(() => new URLSearchParams(window.location.search).get("stage") || "");
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [adding, setAdding] = useState(false);

  const me = trpc.team.me.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const unassigned = trpc.students.unassignedCount.useQuery(undefined, { retry: false });
  const [distMsg, setDistMsg] = useState<string | null>(null);
  const distribute = trpc.students.distributeUnassigned.useMutation({
    onSuccess: r => {
      setDistMsg(`Distributed ${r.assigned} lead${r.assigned === 1 ? "" : "s"}: ` + (r.perCounsellor.map(p => `${p.name} ${p.count}`).join(", ") || "none"));
      utils.students.unassignedCount.invalidate();
      list.refetch();
    },
    onError: e => setDistMsg(e.message),
  });
  const stages = trpc.students.stages.useQuery();
  const list = trpc.students.list.useQuery({
    stage: (stage || undefined) as any,
    search: search.trim() || undefined,
    mineOnly: mineOnly || undefined,
  });

  return (
    <CrmShell active="/crm/students">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Students</h1>
          <p className="text-slate-500 mt-1">Everyone in your pipeline.</p>
        </div>
        <div className="flex gap-2">
          {me.data?.isOwner && (unassigned.data?.count ?? 0) > 0 && (
            <button
              onClick={() => { if (confirm(`Evenly distribute ${unassigned.data!.count} unassigned lead(s) across offices & counsellors?`)) distribute.mutate(); }}
              disabled={distribute.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
            >
              {distribute.isPending ? "Distributing…" : `Distribute ${unassigned.data!.count} unassigned`}
            </button>
          )}
          <button onClick={() => setAdding(true)} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: PURPLE }}>
            + Add student
          </button>
        </div>
      </div>
      {distMsg && <div className="mt-4 bg-purple-50 text-purple-800 text-sm rounded-lg px-4 py-2">{distMsg}</div>}

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, email…"
          className={`${inputCls} max-w-xs`}
        />
        <select value={stage} onChange={e => setStage(e.target.value)} className={`${inputCls} max-w-[200px]`}>
          <option value="">All stages</option>
          {stages.data?.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
          My students only
        </label>
      </div>

      {adding && <AddStudent onClose={() => setAdding(false)} onSaved={() => { setAdding(false); list.refetch(); }} />}

      {/* Table */}
      <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Counselor</th>
              <th className="px-4 py-3">Goal</th>
              <th className="px-4 py-3">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {list.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No students yet — add your first one.</td></tr>}
            {list.data?.map(s => (
              <tr key={s.id} onClick={() => setLocation(`/crm/students/${s.id}`)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{s.studentName}</div>
                  <div className="text-xs text-slate-400">{s.studentPhone || s.studentEmail || "—"}</div>
                </td>
                <td className="px-4 py-3"><StageBadge stage={s.pipelineStage} /></td>
                <td className="px-4 py-3 text-slate-600">{s.counselorName || <span className="text-slate-300">unassigned</span>}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.preferredCountry || "—"}{s.programInterest ? ` · ${s.programInterest}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-500">{timeAgo(s.lastActivityAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CrmShell>
  );
}

function AddStudent({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const counselors = trpc.students.counselors.useQuery();
  const [f, setF] = useState({
    studentName: "", studentPhone: "", studentEmail: "",
    parentName: "", parentPhone: "", parentEmail: "",
    preferredCountry: "", programInterest: "", studyLevel: "", intakeDate: "",
    office: "", assignedCounselorId: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));
  const create = trpc.students.create.useMutation({ onSuccess: onSaved, onError: e => setErr(e.message) });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    create.mutate({
      studentName: f.studentName,
      studentPhone: f.studentPhone || undefined,
      studentEmail: f.studentEmail || undefined,
      parentName: f.parentName || undefined,
      parentPhone: f.parentPhone || undefined,
      parentEmail: f.parentEmail || undefined,
      preferredCountry: f.preferredCountry || undefined,
      programInterest: f.programInterest || undefined,
      studyLevel: f.studyLevel || undefined,
      intakeDate: f.intakeDate || undefined,
      office: (f.office || undefined) as any,
      assignedCounselorId: f.assignedCounselorId ? Number(f.assignedCounselorId) : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="mt-5 bg-white border border-slate-200 rounded-xl p-5">
      <div className="font-semibold text-slate-800 mb-3">New student</div>
      {err && <div className="mb-3 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <L label="Student name *"><input required value={f.studentName} onChange={e => set("studentName", e.target.value)} className={inputCls} /></L>
        <L label="Student phone (WhatsApp)"><input value={f.studentPhone} onChange={e => set("studentPhone", e.target.value)} className={inputCls} /></L>
        <L label="Student email"><input value={f.studentEmail} onChange={e => set("studentEmail", e.target.value)} className={inputCls} /></L>
        <L label="Parent name"><input value={f.parentName} onChange={e => set("parentName", e.target.value)} className={inputCls} /></L>
        <L label="Parent phone (WhatsApp)"><input value={f.parentPhone} onChange={e => set("parentPhone", e.target.value)} className={inputCls} /></L>
        <L label="Parent email"><input value={f.parentEmail} onChange={e => set("parentEmail", e.target.value)} className={inputCls} /></L>
        <L label="Target country"><input value={f.preferredCountry} onChange={e => set("preferredCountry", e.target.value)} className={inputCls} /></L>
        <L label="Program / major"><input value={f.programInterest} onChange={e => set("programInterest", e.target.value)} className={inputCls} /></L>
        <L label="Study level"><input value={f.studyLevel} onChange={e => set("studyLevel", e.target.value)} className={inputCls} placeholder="e.g. Bachelor's" /></L>
        <L label="Target intake"><input value={f.intakeDate} onChange={e => set("intakeDate", e.target.value)} className={inputCls} placeholder="e.g. Sept 2026" /></L>
        <L label="Office">
          <select value={f.office} onChange={e => set("office", e.target.value)} className={inputCls}>
            <option value="">— none —</option>
            {CRM_OFFICES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </L>
        <L label="Assign counselor">
          <select value={f.assignedCounselorId} onChange={e => set("assignedCounselorId", e.target.value)} className={inputCls}>
            <option value="">— unassigned —</option>
            {counselors.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </L>
      </div>
      <div className="flex gap-3 mt-4">
        <button type="submit" disabled={create.isPending} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: PURPLE }}>
          {create.isPending ? "Saving…" : "Add student"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
      </div>
    </form>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
