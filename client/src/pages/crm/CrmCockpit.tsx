/**
 * CRM Owner Cockpit (Phase 4) — the monitoring view: headline stats, pipeline
 * funnel, this week's parent-report status, per-counselor activity, and
 * attention alerts (stale students / missing parent contact). Owner only.
 */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CrmShell, STAGE_META } from "./CrmShell";

const PURPLE = "#9C27B0";

function timeAgo(d: string | null) {
  if (!d) return "never";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function Stat({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-3xl font-bold" style={{ color: color || "#1f2937" }}>{value}</div>
      <div className="text-sm font-medium text-slate-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function CrmCockpit() {
  const q = trpc.cockpit.overview.useQuery(undefined, { retry: false });

  if (q.isLoading) return <CrmShell active="/crm/cockpit"><div className="text-slate-400">Loading…</div></CrmShell>;
  if (q.isError || !q.data) {
    return <CrmShell active="/crm/cockpit"><div className="text-slate-500">{q.error?.message || "Could not load the cockpit."}</div></CrmShell>;
  }
  const { stats, funnel, team, alerts, reports } = q.data;
  const maxFunnel = Math.max(1, ...funnel.map(f => f.count));
  const coverage = stats.activeStudents > 0 ? Math.round((stats.withParent / stats.activeStudents) * 100) : 0;

  return (
    <CrmShell active="/crm/cockpit">
      <h1 className="text-2xl font-bold text-slate-800">Cockpit</h1>
      <p className="text-slate-500 mt-1">Your live view of the whole pipeline and team.</p>

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Stat label="Active students" value={stats.activeStudents} />
        <Stat label="New this week" value={stats.newThisWeek} color={PURPLE} />
        <Stat label="Enrolled" value={stats.enrolled} color="#22c55e" />
        <Stat label="Parent-contact coverage" value={`${coverage}%`} sub={`${stats.withParent}/${stats.activeStudents} have a parent email`} color={coverage >= 80 ? "#22c55e" : "#f59e0b"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
        {/* Funnel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="font-semibold text-slate-800 mb-4">Pipeline</div>
          <div className="space-y-2">
            {funnel.map(f => {
              const meta = STAGE_META[f.stage];
              return (
                <Link key={f.stage} href={`/crm/students?stage=${f.stage}`} className="flex items-center gap-3 group">
                  <div className="w-28 text-xs text-slate-500 text-right shrink-0">{f.label}</div>
                  <div className="flex-1 bg-slate-100 rounded h-6 overflow-hidden">
                    <div className="h-6 rounded flex items-center justify-end pr-2 text-xs font-semibold text-white" style={{ width: `${Math.max(8, (f.count / maxFunnel) * 100)}%`, background: meta?.color || PURPLE }}>
                      {f.count > 0 ? f.count : ""}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {stats.inactive > 0 && <div className="text-xs text-slate-400 mt-3">+ {stats.inactive} inactive (off pipeline)</div>}
        </div>

        {/* Reports this week */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-slate-800">Parent reports — week of {reports.weekOf}</div>
            <Link href="/crm/reports" className="text-sm text-purple-700 hover:underline">Open queue →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Drafts to review" value={reports.counts.draft} color="#64748b" />
            <Stat label="Approved" value={reports.counts.approved} color="#2563eb" />
            <Stat label="Sent" value={reports.counts.sent} color="#22c55e" />
            <Stat label="Failed" value={reports.counts.failed} color={reports.counts.failed > 0 ? "#ef4444" : "#9ca3af"} />
          </div>
        </div>
      </div>

      {/* Team activity */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mt-6">
        <div className="font-semibold text-slate-800 mb-3">Team activity (last 7 days)</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-left text-xs uppercase tracking-wide border-b border-slate-100">
              <th className="py-2">Member</th>
              <th className="py-2 text-center">Assigned</th>
              <th className="py-2 text-center">Students touched</th>
              <th className="py-2 text-center">Updates logged</th>
              <th className="py-2 text-center">Tasks done</th>
              <th className="py-2 text-center">Open tasks</th>
            </tr>
          </thead>
          <tbody>
            {team.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-400">No team members yet.</td></tr>}
            {team.map(m => (
              <tr key={m.id} className="border-b border-slate-50">
                <td className="py-2 font-medium text-slate-700">{m.name}</td>
                <td className="py-2 text-center text-slate-600">{m.assigned}</td>
                <td className="py-2 text-center text-slate-600">{m.studentsTouched}</td>
                <td className="py-2 text-center font-semibold" style={{ color: m.activitiesLogged > 0 ? PURPLE : "#cbd5e1" }}>{m.activitiesLogged}</td>
                <td className="py-2 text-center text-slate-600">{m.tasksDone}</td>
                <td className="py-2 text-center text-slate-600">{m.openTasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attention alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="font-semibold text-slate-800 mb-1">⏰ Needs attention <span className="text-slate-400 font-normal text-sm">({alerts.staleTotal})</span></div>
          <div className="text-xs text-slate-400 mb-3">No activity in 14+ days.</div>
          {alerts.stale.length === 0 && <div className="text-sm text-emerald-600">All caught up 🎉</div>}
          <ul className="space-y-1">
            {alerts.stale.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <Link href={`/crm/students/${s.id}`} className="text-slate-700 hover:text-purple-700 hover:underline">{s.studentName}</Link>
                <span className="text-xs text-slate-400">{s.counselor || "unassigned"} · {timeAgo(s.lastActivity)}</span>
              </li>
            ))}
          </ul>
          {alerts.staleTotal > alerts.stale.length && <div className="text-xs text-slate-400 mt-2">+ {alerts.staleTotal - alerts.stale.length} more</div>}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="font-semibold text-slate-800 mb-1">⚠ Missing parent contact <span className="text-slate-400 font-normal text-sm">({alerts.missingParentTotal})</span></div>
          <div className="text-xs text-slate-400 mb-3">These students won't get a Monday report until a parent email is added.</div>
          {alerts.missingParent.length === 0 && <div className="text-sm text-emerald-600">Every active student has a parent contact 🎉</div>}
          <ul className="space-y-1">
            {alerts.missingParent.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <Link href={`/crm/students/${s.id}`} className="text-slate-700 hover:text-purple-700 hover:underline">{s.studentName}</Link>
                <span className="text-xs text-slate-400">{s.counselor || "unassigned"}</span>
              </li>
            ))}
          </ul>
          {alerts.missingParentTotal > alerts.missingParent.length && <div className="text-xs text-slate-400 mt-2">+ {alerts.missingParentTotal - alerts.missingParent.length} more</div>}
        </div>
      </div>
    </CrmShell>
  );
}
