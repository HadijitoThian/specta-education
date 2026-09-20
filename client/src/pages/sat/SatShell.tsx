/**
 * SpecTa SAT Self-Prep — shared shell for student pages.
 * Own header (no site Navigation): SAT students only ever see the SAT area.
 */
import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { LogOut, Loader2 } from "lucide-react";

export const SAT_LOGO = "/specta-logo.png";

export function masteryColor(p: number): string {
  if (p < 0.25) return "bg-slate-200 text-slate-700";
  if (p < 0.5) return "bg-amber-100 text-amber-800";
  if (p < 0.75) return "bg-sky-100 text-sky-800";
  if (p < 0.9) return "bg-emerald-100 text-emerald-800";
  return "bg-emerald-500 text-white";
}
export function masteryBar(p: number): string {
  if (p < 0.25) return "bg-slate-300";
  if (p < 0.5) return "bg-amber-400";
  if (p < 0.75) return "bg-sky-500";
  return "bg-emerald-500";
}
export const MASTERY_TEXT: Record<string, { en: string; id: string }> = {
  new: { en: "Not started", id: "Belum mulai" },
  building: { en: "Building", id: "Mulai paham" },
  developing: { en: "Developing", id: "Berkembang" },
  solid: { en: "Solid", id: "Kuat" },
  mastered: { en: "Mastered", id: "Dikuasai" },
};

/** Requires a signed-in SAT student; redirects to /sat/login otherwise. */
export default function SatShell({ children, title, back }: { children: ReactNode; title?: string; back?: string }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.sat.me.useQuery(undefined, { retry: false, staleTime: 60000 });
  const logout = trpc.sat.logout.useMutation({ onSuccess: () => { utils.invalidate(); navigate("/sat/login"); } });
  const setPrefs = trpc.sat.setPrefs.useMutation({ onSuccess: () => utils.invalidate() });

  useEffect(() => { if (me.isFetched && !me.data) navigate("/sat/login"); }, [me.isFetched, me.data, navigate]);
  useEffect(() => { document.title = `${title ? title + " · " : ""}SpecTa SAT Self-Prep`; }, [title]);

  if (!me.data) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  const lang = me.data.lang;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {back ? <Link href={back} className="text-sm text-slate-500 hover:text-slate-900">←</Link> : null}
            <Link href="/sat" className="flex items-center gap-2 min-w-0">
              <img src={SAT_LOGO} alt="SpecTa" className="h-7 w-auto" />
              <span className="font-black tracking-tight truncate">SAT Self-Prep</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex rounded-full border border-slate-200 overflow-hidden text-xs font-semibold">
              {(["en", "id"] as const).map(l => (
                <button key={l} onClick={() => setPrefs.mutate({ lang: l })} className={`px-2.5 py-1 ${lang === l ? "bg-slate-900 text-white" : "text-slate-600"}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <span className="hidden sm:inline text-slate-600 truncate max-w-[140px]">{me.data.name}</span>
            <button onClick={() => logout.mutate()} title="Sign out" className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      <footer className="max-w-5xl mx-auto px-4 pb-8 text-[11px] text-slate-400">SAT® is a registered trademark of College Board, which is not affiliated with and does not endorse this product.</footer>
    </div>
  );
}
