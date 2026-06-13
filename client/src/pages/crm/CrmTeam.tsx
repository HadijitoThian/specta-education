/**
 * CRM Team Management (Phase 1, admin/owner only).
 * Add team members (one login each), set role + office, activate/deactivate,
 * and reset passwords. Team members are rows in the `users` table.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CrmShell, CRM_OFFICES, CRM_ROLE_OPTIONS, ROLE_LABEL } from "./CrmShell";

const PURPLE = "#9C27B0";
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300";
const officeLabel = (v: string | null) =>
  CRM_OFFICES.find(o => o.value === v)?.label ?? "—";

type FormState = {
  id: number | null;
  name: string;
  email: string;
  password: string;
  crmRole: string;
  office: string;
  phone: string;
  jobTitle: string;
};
const EMPTY: FormState = {
  id: null, name: "", email: "", password: "", crmRole: "counselor", office: "", phone: "", jobTitle: "",
};

export default function CrmTeam() {
  const utils = trpc.useUtils();
  const list = trpc.team.list.useQuery();
  const [form, setForm] = useState<FormState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => utils.team.list.invalidate();
  const create = trpc.team.create.useMutation({ onSuccess: () => { refresh(); setForm(null); }, onError: e => setErr(e.message) });
  const update = trpc.team.update.useMutation({ onSuccess: () => { refresh(); setForm(null); }, onError: e => setErr(e.message) });
  const setActive = trpc.team.setActive.useMutation({ onSuccess: refresh, onError: e => setErr(e.message) });
  const resetPw = trpc.team.resetPassword.useMutation({ onError: e => setErr(e.message) });

  const set = (k: keyof FormState, v: string) => setForm(f => (f ? { ...f, [k]: v } : f));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form) return;
    if (form.id == null) {
      create.mutate({
        name: form.name, email: form.email, password: form.password,
        crmRole: form.crmRole as any, office: (form.office || undefined) as any,
        phone: form.phone || undefined, jobTitle: form.jobTitle || undefined,
      });
    } else {
      update.mutate({
        id: form.id, name: form.name, crmRole: form.crmRole as any,
        office: (form.office || null) as any, phone: form.phone || null, jobTitle: form.jobTitle || null,
      });
    }
  };

  const editMember = (m: any) =>
    setForm({
      id: m.id, name: m.name ?? "", email: m.email ?? "", password: "",
      crmRole: m.crmRole === "none" ? "counselor" : m.crmRole,
      office: m.office ?? "", phone: m.phone ?? "", jobTitle: m.jobTitle ?? "",
    });

  const doResetPw = (m: any) => {
    const pw = window.prompt(`New password for ${m.name || m.email} (min 8 characters):`);
    if (!pw) return;
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    resetPw.mutate({ id: m.id, password: pw }, { onSuccess: () => window.alert("Password updated.") });
  };

  const saving = create.isPending || update.isPending;

  return (
    <CrmShell active="/crm/team">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team</h1>
          <p className="text-slate-500 mt-1">Everyone who works in the dashboard. One login each.</p>
        </div>
        {!form && (
          <button onClick={() => { setErr(null); setForm({ ...EMPTY }); }} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: PURPLE }}>
            + Add team member
          </button>
        )}
      </div>

      {err && <div className="mt-4 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{err}</div>}

      {/* Add / edit form */}
      {form && (
        <form onSubmit={submit} className="mt-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="font-semibold text-slate-800 mb-3">{form.id == null ? "New team member" : "Edit team member"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name">
              <input required value={form.name} onChange={e => set("name", e.target.value)} className={inp} />
            </Field>
            <Field label="Job title (optional)">
              <input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} className={inp} placeholder="e.g. Senior Counselor" />
            </Field>
            <Field label="Email (their login)">
              <input required type="email" disabled={form.id != null} value={form.email} onChange={e => set("email", e.target.value)} className={`${inp} disabled:bg-slate-100 disabled:text-slate-400`} />
            </Field>
            {form.id == null && (
              <Field label="Temporary password (min 8)">
                <input required minLength={8} value={form.password} onChange={e => set("password", e.target.value)} className={inp} />
              </Field>
            )}
            <Field label="Role">
              <select value={form.crmRole} onChange={e => set("crmRole", e.target.value)} className={inp}>
                {CRM_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Office">
              <select value={form.office} onChange={e => set("office", e.target.value)} className={inp}>
                <option value="">— none —</option>
                {CRM_OFFICES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Phone (optional)">
              <input value={form.phone} onChange={e => set("phone", e.target.value)} className={inp} />
            </Field>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: PURPLE }}>
              {saving ? "Saving…" : form.id == null ? "Create member" : "Save changes"}
            </button>
            <button type="button" onClick={() => { setForm(null); setErr(null); }} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Office</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {list.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No team members yet.</td></tr>}
            {list.data?.map(m => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{m.name || "—"}</div>
                  <div className="text-xs text-slate-400">{m.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {m.role === "admin" ? "Owner (admin)" : (ROLE_LABEL[m.crmRole] ?? m.crmRole)}
                </td>
                <td className="px-4 py-3 text-slate-600">{officeLabel(m.office)}</td>
                <td className="px-4 py-3">
                  {m.crmActive
                    ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                    : <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Inactive</span>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => editMember(m)} className="text-xs text-purple-700 hover:underline mr-3">Edit</button>
                  <button onClick={() => doResetPw(m)} className="text-xs text-slate-500 hover:underline mr-3">Reset password</button>
                  {m.role !== "admin" && (
                    <button onClick={() => setActive.mutate({ id: m.id, crmActive: !m.crmActive })} className="text-xs text-slate-500 hover:underline">
                      {m.crmActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-3">
        New members sign in at <span className="font-mono">/login</span> with their email and the temporary password you set. Tell them to change it after first sign-in.
      </p>
    </CrmShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
