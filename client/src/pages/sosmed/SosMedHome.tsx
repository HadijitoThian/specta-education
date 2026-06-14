/**
 * Social Media Studio — Home (Phase 1). Welcome + the brand kit at a glance +
 * what's coming.
 */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SosMedShell } from "./SosMedShell";

const PINK = "#E91E8C";

export default function SosMedHome() {
  const me = trpc.sosmed.me.useQuery(undefined, { retry: false });
  const kit = trpc.sosmed.getBrandKit.useQuery(undefined, { retry: false });
  const name = me.data?.name?.split(" ")[0] || "there";

  return (
    <SosMedShell active="/sosmed">
      <h1 className="text-2xl font-bold text-slate-800">Welcome, {name} 👋</h1>
      <p className="text-slate-500 mt-1">Your social media content studio for SpecTa Education.</p>

      <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-800">Brand Kit</div>
          <Link href="/sosmed/brand-kit" className="text-sm font-medium hover:underline" style={{ color: PINK }}>Edit →</Link>
        </div>
        <p className="text-sm text-slate-500 mt-1">The single source of truth every content agent reads. Keep it sharp.</p>
        {kit.data && (
          <div className="flex items-center gap-3 mt-4">
            {kit.data.logoUrl && <img src={kit.data.logoUrl} alt="logo" className="h-9 object-contain" />}
            <div className="flex gap-1.5">
              {[kit.data.primaryColor, kit.data.secondaryColor, kit.data.accentColor].map((c, i) => (
                <span key={i} title={c} className="w-7 h-7 rounded-full border border-slate-200" style={{ background: c }} />
              ))}
            </div>
            <div className="text-xs text-slate-400">{kit.data.fontHeading} / {kit.data.fontBody}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {[
          { title: "Content Studio", desc: "Generate posts, carousels & captions with the agents", phase: "Phase 2" },
          { title: "Nezwa ↔ Agents chat", desc: "Brief & refine content with the AI team", phase: "Phase 3" },
          { title: "Editor", desc: "Edit copy, swap images, apply templates", phase: "Phase 3" },
          { title: "Calendar", desc: "Plan ~5 posts/week", phase: "Phase 4" },
        ].map(c => (
          <div key={c.title} className="bg-white rounded-xl border border-dashed border-slate-200 p-5 opacity-80">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{c.phase} — coming</div>
            <div className="text-lg font-semibold text-slate-700 mt-1">{c.title}</div>
            <div className="text-sm text-slate-500 mt-1">{c.desc}</div>
          </div>
        ))}
      </div>
    </SosMedShell>
  );
}
