/**
 * CRM Home (Phase 1) — landing inside the team workspace. For now it welcomes
 * the user and shows what's live vs coming. Real dashboards land in later phases.
 */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CrmShell } from "./CrmShell";

export default function CrmHome() {
  const me = trpc.team.me.useQuery(undefined, { retry: false });
  const name = me.data?.name?.split(" ")[0] || "there";

  return (
    <CrmShell active="/crm">
      <h1 className="text-2xl font-bold text-slate-800">Welcome, {name} 👋</h1>
      <p className="text-slate-500 mt-1">This is the SpecTa team dashboard. We're building it in phases.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Live now</div>
          <div className="text-lg font-semibold text-slate-800 mt-1">Team & access</div>
          <p className="text-sm text-slate-500 mt-1">One login for the whole team, with roles and offices.</p>
          {me.data?.isOwner && (
            <Link href="/crm/team" className="inline-block mt-3 text-sm font-medium text-purple-700 hover:underline">
              Manage team →
            </Link>
          )}
        </div>

        {[
          { title: "Student profiles & pipeline", phase: "Phase 2" },
          { title: "Monday parent reports", phase: "Phase 3" },
          { title: "Owner cockpit & monitoring", phase: "Phase 4" },
        ].map(c => (
          <div key={c.title} className="bg-white rounded-xl border border-dashed border-slate-200 p-5 opacity-80">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{c.phase} — coming</div>
            <div className="text-lg font-semibold text-slate-700 mt-1">{c.title}</div>
          </div>
        ))}
      </div>
    </CrmShell>
  );
}
