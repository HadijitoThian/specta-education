/**
 * CRM Parent Reports (Phase 3) — the weekly review queue.
 * Owner generates this week's drafts, the assigned counselor/owner reviews each
 * (edit intro note, pick which activities show), then approves & sends (email).
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { CrmShell, inputCls } from "./CrmShell";

const PURPLE = "#9C27B0";
const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#64748b" },
  approved: { label: "Approved", color: "#2563eb" },
  sent: { label: "Sent", color: "#22c55e" },
  failed: { label: "Failed", color: "#ef4444" },
  skipped: { label: "Skipped", color: "#9ca3af" },
};
function StatusChip({ s }: { s: string }) {
  const m = STATUS[s] ?? { label: s, color: "#6b7280" };
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${m.color}1a`, color: m.color }}>{m.label}</span>;
}

export default function CrmReports() {
  const me = trpc.team.me.useQuery(undefined, { retry: false });
  const isOwner = !!me.data?.isOwner;
  const utils = trpc.useUtils();
  const list = trpc.reports.list.useQuery({});
  const [selected, setSelected] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => utils.reports.list.invalidate();
  const generate = trpc.reports.generateNow.useMutation({
    onSuccess: r => { setMsg(`Generated ${r.created} draft(s) (${r.skipped} skipped).`); refresh(); },
    onError: e => setMsg(e.message),
  });
  const sendDue = trpc.reports.sendDue.useMutation({
    onSuccess: r => { setMsg(`Sent ${r.sent}, failed ${r.failed}, held ${r.held}.`); refresh(); },
    onError: e => setMsg(e.message),
  });
  const testWa = trpc.reports.testWhatsApp.useMutation({
    onSuccess: () => setMsg("WhatsApp test sent ✓ — check that phone (must have messaged the bot in the last 24h)."),
    onError: e => setMsg(e.message),
  });

  const reports = list.data?.reports ?? [];
  const weekOf = list.data?.weekOf;

  return (
    <CrmShell active="/crm/reports">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parent Reports</h1>
          <p className="text-slate-500 mt-1">Week of {weekOf || "…"} — review, then send. Email now; WhatsApp soon.</p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => generate.mutate()} disabled={generate.isPending} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {generate.isPending ? "Generating…" : "Generate this week's drafts"}
            </button>
            <button onClick={() => { if (confirm("Send all approved reports (and drafts that have content) now?")) sendDue.mutate({}); }} disabled={sendDue.isPending} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ background: PURPLE }}>
              {sendDue.isPending ? "Sending…" : "Send all ready"}
            </button>
            <button onClick={() => { const p = window.prompt("Send a test WhatsApp to which number? (e.g. 0812xxxxxxx)"); if (p) testWa.mutate({ phone: p }); }} disabled={testWa.isPending} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              {testWa.isPending ? "Testing…" : "Test WhatsApp"}
            </button>
          </div>
        )}
      </div>

      {msg && <div className="mt-4 bg-purple-50 text-purple-800 text-sm rounded-lg px-4 py-2">{msg}</div>}

      <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Updates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Review</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!list.isLoading && reports.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                No reports for this week yet.{isOwner ? " Click “Generate this week's drafts” above." : ""}
              </td></tr>
            )}
            {reports.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{r.studentName}<div className="text-xs text-slate-400 font-normal">{r.stageLabel}</div></td>
                <td className="px-4 py-3 text-slate-600">{r.hasParent ? (r.parentName || r.parentEmail) : <span className="text-amber-600">⚠ no parent contact</span>}</td>
                <td className="px-4 py-3 text-slate-600">{r.includedCount} update{r.includedCount === 1 ? "" : "s"}</td>
                <td className="px-4 py-3"><StatusChip s={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelected(r.id)} className="text-sm text-purple-700 hover:underline">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected != null && (
        <ReviewPanel id={selected} onClose={() => setSelected(null)} onChanged={refresh} />
      )}
    </CrmShell>
  );
}

function ReviewPanel({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const q = trpc.reports.get.useQuery({ id });
  const [note, setNote] = useState("");
  const [includes, setIncludes] = useState<Record<number, boolean>>({});
  const [wa, setWa] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    if (q.data) {
      setNote(q.data.summaryNote ?? "");
      setWa(!!q.data.channelWhatsapp);
      const m: Record<number, boolean> = {};
      q.data.snapshotParsed?.activities.forEach(a => { m[a.id] = a.include; });
      setIncludes(m);
    }
  }, [q.data?.id]);

  const [busy, setBusy] = useState(false);
  const after = () => { utils.reports.get.invalidate({ id }); onChanged(); };
  const save = trpc.reports.updateDraft.useMutation();
  const approve = trpc.reports.approve.useMutation();
  const skip = trpc.reports.skip.useMutation({ onSuccess: () => { setMsg("Skipped."); after(); } });
  const sendOne = trpc.reports.sendOne.useMutation();

  if (q.isLoading) return <div className="mt-5 bg-white border rounded-xl p-5 text-slate-400">Loading…</div>;
  if (!q.data) return null;
  const snap = q.data.snapshotParsed;
  const r = q.data;
  const isSent = r.status === "sent";

  // Clear success confirmation after a send.
  if (justSent) {
    return (
      <div className="mt-5 bg-white border-2 border-emerald-200 rounded-xl p-8 text-center">
        <div className="text-5xl mb-2">✅</div>
        <div className="text-xl font-bold text-slate-800">Report sent!</div>
        <div className="text-sm text-slate-600 mt-1">
          The weekly progress report was emailed to <strong>{r.parentName || "the parent"}</strong> at <strong>{r.parentEmail}</strong>.
        </div>
        <div className="flex gap-3 justify-center mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: PURPLE }}>
            Back to reports
          </button>
          <button onClick={() => setLocation(`/crm/students/${r.leadId}`)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50">
            Open {snap?.studentName || "student"}'s page
          </button>
        </div>
      </div>
    );
  }

  // Always persist the current editor state (note + which activities show)
  // before approving or sending, so the note is never lost.
  const persist = () =>
    save.mutateAsync({ id, summaryNote: note, channelWhatsapp: wa, includeActivityIds: Object.entries(includes).filter(([, v]) => v).map(([k]) => Number(k)) });

  const doSave = async () => { setBusy(true); setMsg(null); try { await persist(); setMsg("Saved."); after(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const doApprove = async () => { setBusy(true); setMsg(null); try { await persist(); await approve.mutateAsync({ id }); setMsg("Approved & saved."); after(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } };
  const doSend = async () => {
    if (!r.parentEmail) { setMsg("No parent email set."); return; }
    if (!confirm("Send this report to the parent now?")) return;
    setBusy(true); setMsg(null);
    try {
      // The note + included activities ride along with the send itself, so
      // whatever is in the box right now is what the parent receives.
      await sendOne.mutateAsync({
        id,
        summaryNote: note,
        channelWhatsapp: wa,
        includeActivityIds: Object.entries(includes).filter(([, v]) => v).map(([k]) => Number(k)),
      });
      setJustSent(true); after();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="mt-5 bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-800">Review: {snap?.studentName}</div>
        <button onClick={onClose} className="text-sm text-slate-500 hover:underline">Close</button>
      </div>
      {msg && <div className="mt-2 text-sm text-purple-700">{msg}</div>}
      <div className="text-xs text-slate-400 mt-1">To: {r.parentName || "Parent"} · {r.parentEmail || "no email"} · status: {r.status}{r.error ? ` · error: ${r.error}` : ""}</div>

      {/* Snapshot preview */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="text-sm font-semibold text-slate-700 mb-2">What the parent will see</div>
          <div className="text-sm text-slate-600 space-y-1">
            <div>Stage: <span className="font-medium">{snap?.stageLabel}</span></div>
            {snap?.country && <div>Destination: {snap.country}</div>}
            {snap?.program && <div>Program: {snap.program}</div>}
            {snap?.intake && <div>Target intake: {snap.intake}</div>}
            {snap && snap.docsTotal > 0 && <div>Documents: {snap.docsSubmitted}/{snap.docsTotal} submitted</div>}
          </div>
          <label className="block mt-3">
            <span className="block text-xs font-medium text-slate-500 mb-1">Personal note to the parent (optional)</span>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className={inputCls} placeholder="e.g. Andi did great in this week's mock test — keep encouraging him!" />
          </label>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-700 mb-2">This week's activity — tick what to include</div>
          {snap && snap.activities.length === 0 && <div className="text-sm text-amber-600">No activity logged this week. An empty report is held (not auto-sent).</div>}
          <ul className="space-y-1 max-h-56 overflow-auto">
            {snap?.activities.map(a => (
              <li key={a.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={includes[a.id] ?? a.include} onChange={e => setIncludes(s => ({ ...s, [a.id]: e.target.checked }))} className="mt-1" />
                <span className="text-slate-700">
                  <span className="text-xs text-slate-400">{new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · </span>
                  {a.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Channels */}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <input
          id={`wa-${id}`}
          type="checkbox"
          checked={wa}
          disabled={!q.data.whatsappReady || !q.data.parentPhone}
          onChange={e => setWa(e.target.checked)}
        />
        <label htmlFor={`wa-${id}`} className={(!q.data.whatsappReady || !q.data.parentPhone) ? "text-slate-400" : "text-slate-700"}>
          Also send to parent's WhatsApp
        </label>
        {!q.data.parentPhone && <span className="text-xs text-amber-600">— no parent phone on file</span>}
        {q.data.parentPhone && !q.data.whatsappReady && <span className="text-xs text-slate-400">— WhatsApp not connected yet</span>}
      </div>

      {/* Actions */}
      {isSent ? (
        <div className="mt-5 flex items-center gap-3">
          <span className="text-sm font-semibold text-emerald-700">✓ Sent to {r.parentEmail}</span>
          <button onClick={doSend} disabled={busy} className="text-sm text-slate-500 hover:underline disabled:opacity-50">Resend</button>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2 items-center">
          <button onClick={doSave} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">Save changes</button>
          <button onClick={doApprove} disabled={busy || r.status !== "draft"} className="px-4 py-2 rounded-lg text-sm font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50">{r.status === "approved" ? "Approved ✓" : "Approve"}</button>
          <button onClick={doSend} disabled={busy || !r.parentEmail} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ background: PURPLE }}>
            {busy ? "Sending…" : "Send now"}
          </button>
          <button onClick={() => skip.mutate({ id })} disabled={busy || skip.isPending} className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100">Skip this week</button>
        </div>
      )}
    </div>
  );
}
