/**
 * CRM Home — landing inside the team workspace. Shows the signed-in person's
 * own student-intake link + QR (to share/print), plus quick links.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CrmShell } from "./CrmShell";

const PURPLE = "#9C27B0";

export default function CrmHome() {
  const me = trpc.team.me.useQuery(undefined, { retry: false });
  const intake = trpc.team.intakeLink.useQuery(undefined, { retry: false });
  const name = me.data?.name?.split(" ")[0] || "there";
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.spectaeducation.com";
  const link = intake.data ? `${origin}/join/${intake.data.token}` : "";
  const qr = link ? `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=200&margin=1` : "";

  const copy = () => { if (link) { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } };

  const quick = [
    { label: "Students", href: "/crm/students", desc: "Manage your pipeline" },
    { label: "Parent Reports", href: "/crm/reports", desc: "Review & send weekly updates" },
    ...(me.data?.isOwner ? [
      { label: "Cockpit", href: "/crm/cockpit", desc: "Monitor the whole team" },
      { label: "Team", href: "/crm/team", desc: "Manage team members" },
    ] : []),
  ];

  return (
    <CrmShell active="/crm">
      <h1 className="text-2xl font-bold text-slate-800">Welcome, {name} 👋</h1>
      <p className="text-slate-500 mt-1">Your SpecTa team workspace.</p>

      {/* Intake link / QR */}
      <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5">
        <div className="font-semibold text-slate-800">Your student intake link</div>
        <p className="text-sm text-slate-500 mt-1">
          Share this link or QR with prospective students. Anyone who fills it in is added to your students automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-5 mt-4 items-center sm:items-start">
          {qr && <img src={qr} alt="Intake QR code" className="w-40 h-40 border border-slate-200 rounded-lg p-1 bg-white shrink-0" />}
          <div className="flex-1 w-full">
            <div className="flex gap-2">
              <input readOnly value={link || "Generating…"} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50" />
              <button onClick={copy} disabled={!link} className="px-4 py-2 rounded-lg text-white text-sm font-medium shrink-0 disabled:opacity-50" style={{ background: PURPLE }}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Tip: put the QR on a flyer or your Instagram bio. {link && <a href={link} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline">Preview the form →</a>}
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {quick.map(c => (
          <Link key={c.href} href={c.href} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-purple-300 hover:shadow-sm transition">
            <div className="text-lg font-semibold text-slate-800">{c.label}</div>
            <div className="text-sm text-slate-500 mt-1">{c.desc}</div>
          </Link>
        ))}
      </div>
    </CrmShell>
  );
}
