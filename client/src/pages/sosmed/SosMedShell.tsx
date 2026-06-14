/**
 * Social Media workspace shell (/sosmed) — Phase 1. Access: site admin, CRM
 * "owner", or "marketing" team members. Provides the sidebar + access gate.
 */
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const CORAL = "#FF6B4A";
const PINK = "#E91E8C";
const PURPLE = "#9C27B0";

type NavItem = { label: string; href: string; soon?: boolean };
const NAV: NavItem[] = [
  { label: "Home", href: "/sosmed" },
  { label: "Brand Kit", href: "/sosmed/brand-kit" },
  { label: "Art Director", href: "/sosmed/art-director" },
  { label: "Content Studio", href: "/sosmed/content" },
  { label: "Calendar", href: "/sosmed/calendar", soon: true },
];

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">{children}</div>
    </div>
  );
}

export const sosmedInput =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300";

export function SosMedShell({ active, children }: { active: string; children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { logout, loading: authLoading, isAuthenticated } = useAuth();
  const meQuery = trpc.sosmed.me.useQuery(undefined, { retry: false });

  if (authLoading || meQuery.isLoading) return <Centered>Loading…</Centered>;

  if (!isAuthenticated) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold mb-2">Please sign in</h1>
        <a href="/login" className="inline-block px-4 py-2 rounded-lg text-white font-medium" style={{ background: PURPLE }}>Go to sign in</a>
      </Centered>
    );
  }

  const me = meQuery.data;
  if (!me || !me.canAccess) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold mb-2">No marketing access</h1>
        <p className="text-sm text-slate-600 mb-4">Ask the administrator to add you to the marketing team.</p>
        <button onClick={() => logout()} className="text-sm text-slate-500 underline">Sign out</button>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="text-lg font-bold" style={{ background: `linear-gradient(90deg, ${CORAL}, ${PINK})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            SpecTa Studio
          </div>
          <div className="text-xs text-slate-400">Social Media</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => {
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
              <Link key={n.href} href={n.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${isActive ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
                style={isActive ? { background: PINK } : undefined}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="text-sm font-medium text-slate-700 truncate">{me.name || me.email}</div>
          <div className="text-xs text-slate-400 mb-2">Marketing</div>
          <div className="flex items-center gap-3 text-xs">
            <button onClick={() => { logout().then(() => setLocation("/login")); }} className="text-slate-500 hover:text-slate-700 underline">Sign out</button>
            {me.isOwner && <a href="/crm" className="text-slate-400 hover:text-slate-600">CRM</a>}
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
