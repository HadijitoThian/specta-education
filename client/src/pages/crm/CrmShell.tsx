/**
 * CRM workspace shell (Phase 1) — the dedicated internal dashboard for the
 * SpecTa team. Single login: anyone with a CRM role (or the site admin) gets
 * in. Provides the sidebar nav + access gate; pages render inside it.
 */
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const PINK = "#E91E8C";
const PURPLE = "#9C27B0";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  counselor: "Counselor",
  ielts_instructor: "IELTS Instructor",
  visa_specialist: "Visa Specialist",
  front_desk: "Front Desk",
  marketing: "Marketing",
  none: "—",
};

type NavItem = { label: string; href: string; ownerOnly?: boolean; soon?: boolean };
const NAV: NavItem[] = [
  { label: "Home", href: "/crm" },
  { label: "Cockpit", href: "/crm/cockpit", ownerOnly: true },
  { label: "Students", href: "/crm/students" },
  { label: "Parent Reports", href: "/crm/reports" },
  { label: "Team", href: "/crm/team", ownerOnly: true },
];

export const STAGE_META: Record<string, { label: string; color: string }> = {
  new_lead: { label: "New Lead", color: "#3b82f6" },
  consultation: { label: "Consultation", color: "#8b5cf6" },
  ielts_prep: { label: "IELTS Prep", color: "#f59e0b" },
  shortlist: { label: "Shortlist", color: "#0ea5e9" },
  application: { label: "Application", color: "#f97316" },
  offer: { label: "Offer", color: "#14b8a6" },
  visa: { label: "Visa", color: "#6366f1" },
  pre_departure: { label: "Pre-Departure", color: "#a855f7" },
  enrolled: { label: "Enrolled", color: "#22c55e" },
  inactive: { label: "Inactive", color: "#9ca3af" },
};

export function StageBadge({ stage }: { stage: string }) {
  const m = STAGE_META[stage] ?? { label: stage, color: "#6b7280" };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${m.color}1a`, color: m.color }}>
      {m.label}
    </span>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">{children}</div>
    </div>
  );
}

export function CrmShell({ active, children }: { active: string; children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { logout, loading: authLoading, isAuthenticated } = useAuth();
  const meQuery = trpc.team.me.useQuery(undefined, { retry: false });

  if (authLoading || meQuery.isLoading) {
    return <Centered>Loading…</Centered>;
  }

  if (!isAuthenticated) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold mb-2">Please sign in</h1>
        <p className="text-sm text-slate-600 mb-4">The team dashboard requires a SpecTa account.</p>
        <a href="/login" className="inline-block px-4 py-2 rounded-lg text-white font-medium" style={{ background: PURPLE }}>
          Go to sign in
        </a>
      </Centered>
    );
  }

  const me = meQuery.data;
  if (!me || !me.canAccess) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold mb-2">No CRM access</h1>
        <p className="text-sm text-slate-600 mb-4">
          Your account isn't set up as a team member yet. Ask the administrator to add you in the Team settings.
        </p>
        <button onClick={() => logout()} className="text-sm text-slate-500 underline">
          Sign out
        </button>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="text-lg font-bold" style={{ color: PINK }}>SpecTa CRM</div>
          <div className="text-xs text-slate-400">Team Dashboard</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.filter(n => !n.ownerOnly || me.isOwner).map(n => {
            const isActive = active === n.href;
            if (n.soon) {
              return (
                <div key={n.href} className="px-3 py-2 rounded-lg text-sm text-slate-300 flex items-center justify-between cursor-default">
                  <span>{n.label}</span>
                  <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">soon</span>
                </div>
              );
            }
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? "text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
                style={isActive ? { background: PURPLE } : undefined}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="text-sm font-medium text-slate-700 truncate">{me.name || me.email}</div>
          <div className="text-xs text-slate-400 mb-2">{ROLE_LABEL[me.crmRole] ?? me.crmRole}</div>
          <div className="flex items-center gap-3 text-xs">
            <button onClick={() => { logout().then(() => setLocation("/login")); }} className="text-slate-500 hover:text-slate-700 underline">
              Sign out
            </button>
            <a href="/admin" className="text-slate-400 hover:text-slate-600">Admin</a>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

export const CRM_OFFICES = [
  { value: "kelapa_gading", label: "Kelapa Gading (HO)" },
  { value: "pik", label: "Pantai Indah Kapuk" },
  { value: "gading_serpong", label: "Gading Serpong" },
  { value: "singkawang", label: "Singkawang" },
];
export const CRM_ROLE_OPTIONS = [
  { value: "counselor", label: "Counselor" },
  { value: "ielts_instructor", label: "IELTS Instructor" },
  { value: "visa_specialist", label: "Visa Specialist" },
  { value: "front_desk", label: "Front Desk" },
  { value: "marketing", label: "Marketing (Social Media studio only)" },
  { value: "owner", label: "Owner (full access)" },
];
export { ROLE_LABEL };
