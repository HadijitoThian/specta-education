/**
 * CRM Student 360 (Phase 2). Details + stage + counselor + the quick-log bar
 * (the engine) + timeline + tasks + document checklist.
 */
import { useState } from "react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { CrmShell, StageBadge, STAGE_META, CRM_OFFICES, inputCls } from "./CrmShell";

const PURPLE = "#9C27B0";
const officeLabel = (v: string | null | undefined) => CRM_OFFICES.find(o => o.value === v)?.label ?? "—";
const fmt = (d: Date | string | null) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const fmtDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

const ACTIVITY_OPTIONS = [
  { value: "call", label: "📞 Call" },
  { value: "whatsapp", label: "💬 WhatsApp" },
  { value: "meeting", label: "🤝 Meeting" },
  { value: "email", label: "✉️ Email" },
  { value: "note", label: "📝 Note" },
  { value: "document", label: "📄 Document" },
  { value: "other", label: "• Other" },
];

export default function CrmStudentProfile() {
  const [, params] = useRoute<{ id: string }>("/crm/students/:id");
  const id = Number(params?.id);
  const utils = trpc.useUtils();
  const q = trpc.students.get.useQuery({ id }, { enabled: Number.isFinite(id) });
  const stages = trpc.students.stages.useQuery();
  const counselors = trpc.students.counselors.useQuery();
  const refetch = () => utils.students.get.invalidate({ id });

  const setStage = trpc.students.setStage.useMutation({ onSuccess: refetch });
  const assign = trpc.students.assign.useMutation({ onSuccess: refetch });

  if (q.isLoading) return <CrmShell active="/crm/students"><div className="text-slate-400">Loading…</div></CrmShell>;
  if (q.isError || !q.data) return <CrmShell active="/crm/students"><div className="text-slate-500">Student not found. <Link href="/crm/students" className="text-purple-700 underline">Back</Link></div></CrmShell>;

  const { student, counselorName, activities, documents, tasks } = q.data;

  return (
    <CrmShell active="/crm/students">
      <Link href="/crm/students" className="text-sm text-slate-500 hover:underline">← All students</Link>

      {/* Header */}
      <div className="mt-3 bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{student.studentName}</h1>
              <StageBadge stage={student.pipelineStage} />
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {student.studentPhone || "no phone"} · {student.studentEmail || "no email"}
            </div>
            <div className="text-sm text-slate-500">
              {(student.preferredCountry || "country —")}{student.programInterest ? ` · ${student.programInterest}` : ""}
              {student.intakeDate ? ` · intake ${student.intakeDate}` : ""} · {officeLabel(student.office)}
            </div>
          </div>
          <div className="flex flex-col gap-2 w-56">
            <label className="text-xs text-slate-500">Stage
              <select value={student.pipelineStage} onChange={e => setStage.mutate({ id, stage: e.target.value as any })} className={inputCls}>
                {stages.data?.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-500">Counselor
              <select value={student.assignedCounselorId ?? ""} onChange={e => assign.mutate({ id, counselorId: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                <option value="">— unassigned —</option>
                {counselors.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
        </div>
        {/* Parent (powers Monday report) */}
        <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
          <span className="text-slate-400">Parent/guardian: </span>
          {student.parentName || student.parentEmail || student.parentPhone
            ? <span className="text-slate-700">{student.parentName || "—"} · {student.parentPhone || "no WhatsApp"} · {student.parentEmail || "no email"}</span>
            : <span className="text-amber-600">⚠ none set — needed for the Monday parent report</span>}
          <EditDetails student={student} onSaved={refetch} />
        </div>
      </div>

      {/* Quick log + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <div className="lg:col-span-2 space-y-5">
          <QuickLog id={id} onSaved={refetch} />
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="font-semibold text-slate-800 mb-3">Activity timeline</div>
            {activities.length === 0 && <div className="text-sm text-slate-400">No activity logged yet.</div>}
            <ul className="space-y-3">
              {activities.map(a => (
                <li key={a.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: PURPLE }} />
                  <div>
                    <div className="text-sm text-slate-800 font-medium">{a.title}</div>
                    {a.description && <div className="text-sm text-slate-600">{a.description}</div>}
                    <div className="text-xs text-slate-400">{fmt(a.createdAt)}{a.staffEmail ? ` · ${a.staffEmail}` : ""}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tasks + documents */}
        <div className="space-y-5">
          <Tasks studentId={id} tasks={tasks} onChange={refetch} />
          <Documents studentId={id} documents={documents} onChange={refetch} />
        </div>
      </div>
    </CrmShell>
  );
}

function QuickLog({ id, onSaved }: { id: number; onSaved: () => void }) {
  const [type, setType] = useState("call");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const log = trpc.students.logActivity.useMutation({
    onSuccess: () => { setTitle(""); setNote(""); onSaved(); },
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    log.mutate({ id, activityType: type as any, title: title.trim(), description: note.trim() || undefined });
  };
  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="font-semibold text-slate-800 mb-2 text-sm">Log an activity</div>
      <div className="flex gap-2">
        <select value={type} onChange={e => setType(e.target.value)} className={`${inputCls} max-w-[150px]`}>
          {ACTIVITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What happened? (e.g. Called about transcript)" className={inputCls} />
        <button type="submit" disabled={log.isPending || !title.trim()} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 shrink-0" style={{ background: PURPLE }}>
          Log
        </button>
      </div>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional detail…" className={`${inputCls} mt-2`} />
    </form>
  );
}

function EditDetails({ student, onSaved }: { student: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>(null);
  const update = trpc.students.update.useMutation({ onSuccess: () => { setOpen(false); onSaved(); } });
  const start = () => {
    setF({
      studentName: student.studentName ?? "", studentPhone: student.studentPhone ?? "", studentEmail: student.studentEmail ?? "",
      parentName: student.parentName ?? "", parentPhone: student.parentPhone ?? "", parentEmail: student.parentEmail ?? "",
      preferredCountry: student.preferredCountry ?? "", programInterest: student.programInterest ?? "",
      studyLevel: student.studyLevel ?? "", intakeDate: student.intakeDate ?? "", office: student.office ?? "", notes: student.notes ?? "",
    });
    setOpen(true);
  };
  const set = (k: string, v: string) => setF((s: any) => ({ ...s, [k]: v }));
  if (!open) return <button onClick={start} className="ml-2 text-xs text-purple-700 hover:underline">Edit details</button>;
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[
        ["studentName", "Student name"], ["studentPhone", "Student phone"], ["studentEmail", "Student email"],
        ["parentName", "Parent name"], ["parentPhone", "Parent phone"], ["parentEmail", "Parent email"],
        ["preferredCountry", "Country"], ["programInterest", "Program"], ["studyLevel", "Study level"], ["intakeDate", "Intake"],
      ].map(([k, label]) => (
        <label key={k} className="block"><span className="block text-xs text-slate-500 mb-1">{label}</span>
          <input value={f[k]} onChange={e => set(k, e.target.value)} className={inputCls} />
        </label>
      ))}
      <label className="block"><span className="block text-xs text-slate-500 mb-1">Office</span>
        <select value={f.office} onChange={e => set("office", e.target.value)} className={inputCls}>
          <option value="">— none —</option>
          {CRM_OFFICES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <div className="sm:col-span-3 flex gap-3">
        <button onClick={() => update.mutate({ id: student.id, ...f, office: f.office || null })} disabled={update.isPending} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: PURPLE }}>Save</button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
      </div>
    </div>
  );
}

function Tasks({ studentId, tasks, onChange }: { studentId: number; tasks: any[]; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const add = trpc.students.addTask.useMutation({ onSuccess: () => { setTitle(""); setDue(""); onChange(); } });
  const toggle = trpc.students.toggleTask.useMutation({ onSuccess: onChange });
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="font-semibold text-slate-800 mb-3 text-sm">Tasks</div>
      <ul className="space-y-2 mb-3">
        {tasks.length === 0 && <li className="text-sm text-slate-400">No tasks.</li>}
        {tasks.map(t => (
          <li key={t.id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={t.status === "done"} onChange={e => toggle.mutate({ id: t.id, done: e.target.checked })} className="mt-1" />
            <span className={t.status === "done" ? "line-through text-slate-400" : "text-slate-700"}>
              {t.title}{t.dueDate ? <span className="text-xs text-slate-400"> · due {fmtDate(t.dueDate)}</span> : ""}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="New task…" className={inputCls} />
        <input type="date" value={due} onChange={e => setDue(e.target.value)} className={`${inputCls} max-w-[150px]`} />
      </div>
      <button onClick={() => title.trim() && add.mutate({ studentId, title: title.trim(), dueDate: due || undefined })} disabled={add.isPending || !title.trim()} className="mt-2 text-sm text-purple-700 hover:underline disabled:opacity-50">+ Add task</button>
    </div>
  );
}

function Documents({ studentId, documents, onChange }: { studentId: number; documents: any[]; onChange: () => void }) {
  const [label, setLabel] = useState("");
  const add = trpc.students.addDocument.useMutation({ onSuccess: () => { setLabel(""); onChange(); } });
  const setStatus = trpc.students.setDocStatus.useMutation({ onSuccess: onChange });
  const next: Record<string, string> = { pending: "submitted", submitted: "verified", verified: "pending", rejected: "pending" };
  const color: Record<string, string> = { pending: "#9ca3af", submitted: "#f59e0b", verified: "#22c55e", rejected: "#ef4444" };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="font-semibold text-slate-800 mb-3 text-sm">Documents</div>
      <ul className="space-y-2 mb-3">
        {documents.length === 0 && <li className="text-sm text-slate-400">No documents tracked.</li>}
        {documents.map(d => (
          <li key={d.id} className="flex items-center justify-between text-sm">
            <span className="text-slate-700">{d.docLabel}</span>
            <button onClick={() => setStatus.mutate({ id: d.id, status: next[d.status] as any })} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color[d.status]}1a`, color: color[d.status] }}>
              {d.status}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Passport, Transcript…" className={inputCls} />
        <button onClick={() => label.trim() && add.mutate({ studentId, docType: label.trim().toLowerCase().replace(/\s+/g, "_"), docLabel: label.trim() })} disabled={add.isPending || !label.trim()} className="px-3 py-2 rounded-lg text-white text-sm shrink-0 disabled:opacity-50" style={{ background: PURPLE }}>Add</button>
      </div>
      <div className="text-xs text-slate-400 mt-1">Tap a status to cycle pending → submitted → verified.</div>
    </div>
  );
}
