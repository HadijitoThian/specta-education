/**
 * IGCSE admin overview — aggregated stats + recent attempts feed.
 * Read-only oversight for the IGCSE Math AI Teacher product.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Image as ImageIcon, Database } from "lucide-react";

export default function IgcseAdmin() {
  const stats = trpc.igcse.adminStats.useQuery();
  const recent = trpc.igcse.adminRecentAttempts.useQuery({ limit: 50 });

  if (stats.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading IGCSE metrics…
      </div>
    );
  }

  const s = stats.data;
  if (!s) {
    return <div className="text-muted-foreground">No IGCSE data yet.</div>;
  }

  const fmtIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">IGCSE Math AI Teacher</h2>
        <p className="text-sm text-muted-foreground">Subscriptions, lesson activity, exam-practice attempts.</p>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Active subscriptions" value={String(s.subscriptions.active)} sub={`+${s.subscriptions.pending} pending`} />
        <Stat label="Revenue collected" value={fmtIDR(s.subscriptions.revenueIDR)} sub="active + expired plans" />
        <Stat label="Lesson hours" value={String(s.sessions.totalLessonHours)} sub={`${s.sessions.total} sessions`} />
        <Stat label="Exam-practice attempts" value={String(s.attempts.total)} sub={`${s.attempts.completed} completed · ${s.attempts.revealed} revealed`} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Stat label="Avg attempt accuracy" value={`${s.attempts.accuracy}%`} sub={`${s.attempts.marksEarned}/${s.attempts.marksTotal} marks earned`} />
        <Stat label="Question bank" value={String(s.bank.exemplars)} sub={`+${s.bank.customQuestions} student-pasted`} />
      </div>

      {/* Dashboard image regeneration */}
      <DashboardImageRegenCard />

      {/* Force-reseed all subjects (recovery + diagnostic). */}
      <ReseedSubjectsCard />

      {/* Recent attempts feed */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Recent attempts</h3>
          <p className="text-xs text-muted-foreground">Most recent 50 attempts across all students.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2">Student</th>
                <th className="text-left px-4 py-2">Topic</th>
                <th className="text-left px-4 py-2">Score</th>
                <th className="text-left px-4 py-2">Hints</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Started</th>
              </tr>
            </thead>
            <tbody>
              {recent.isLoading && (
                <tr><td className="px-4 py-4 text-muted-foreground" colSpan={6}>Loading…</td></tr>
              )}
              {!recent.isLoading && (recent.data || []).length === 0 && (
                <tr><td className="px-4 py-4 text-muted-foreground" colSpan={6}>No attempts yet.</td></tr>
              )}
              {(recent.data || []).map((a: any) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div className="font-medium">{a.leadName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.leadEmail || `lead #${a.leadId}`}</div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{a.topicCode}</td>
                  <td className="px-4 py-2">
                    {a.status === "completed"
                      ? <span className={`font-semibold ${(a.marksEarned ?? 0) / a.marks >= 0.7 ? "text-emerald-700" : "text-amber-700"}`}>{a.marksEarned ?? 0}/{a.marks}</span>
                      : <span className="text-muted-foreground">—/{a.marks}</span>}
                  </td>
                  <td className="px-4 py-2 text-xs">{a.hintsUsed > 0 ? `${a.hintsUsed}×` : "—"}</td>
                  <td className="px-4 py-2">
                    {a.status === "completed"
                      ? (a.revealed ? <span className="text-slate-500 text-xs">revealed</span> : <span className="text-emerald-700 text-xs">✓ done</span>)
                      : <span className="text-amber-600 text-xs">in progress</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {a.startedAt ? new Date(a.startedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

// ── /admin → IGCSE → Dashboard image regeneration ──────────────────────────
// One-click replacement for the old `pnpm tsx scripts/generate-igcse-landing-
// images.ts` console command. Triggers the same server-side helper; polls
// progress every 2 s while a run is in flight.

function DashboardImageRegenCard() {
  const utils = trpc.useUtils();
  const [subset, setSubset] = useState<"all" | "subjects" | "humans">("all");

  // Live status — polls every 2s while running, then stops.
  const status = trpc.igcse.adminDashboardImageStatus.useQuery(undefined, {
    refetchInterval: q => {
      const s = q.state.data;
      return s && s.state === "running" ? 2000 : false;
    },
  });

  const regen = trpc.igcse.adminRegenerateDashboardImages.useMutation({
    onSuccess: () => {
      // Immediately start polling.
      utils.igcse.adminDashboardImageStatus.invalidate();
    },
    onError: e => alert(e?.message || "Couldn't start. Try again."),
  });

  const s = status.data;
  const running = s?.state === "running";
  const subsetCost: Record<string, string> = {
    all: "~$0.32 · 8 images",
    subjects: "~$0.20 · 5 images (subjects only)",
    humans: "~$0.12 · 3 images (hero + 2 mode cards)",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <ImageIcon className="w-5 h-5 mt-0.5 text-violet-600" />
        <div className="flex-1">
          <h3 className="font-semibold">Dashboard images</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Regenerates the IGCSE dashboard imagery (hero + mode cards + 5 subject tiles) via DeepInfra
            FLUX-1.1-pro and uploads to R2. Same R2 keys → overwrites in place. Live on next page reload.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground">Subset:
              <select
                value={subset}
                onChange={e => setSubset(e.target.value as any)}
                disabled={running}
                className="ml-2 border border-border rounded px-2 py-1 text-xs bg-background"
              >
                <option value="all">All images</option>
                <option value="subjects">Subject tiles only</option>
                <option value="humans">Hero + mode cards only</option>
              </select>
            </label>
            <span className="text-xs text-muted-foreground">· {subsetCost[subset]}</span>
            <button
              onClick={() => regen.mutate({ subset })}
              disabled={running || regen.isPending}
              className="ml-auto bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
            >
              {running ? "Generating…" : regen.isPending ? "Starting…" : "Regenerate now"}
            </button>
          </div>

          {/* Live status / last-run summary */}
          {s && (
            <div className="mt-3 rounded-lg border border-border p-3 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">
                  {s.state === "running" && <>🔄 Generating — {s.completed} / {s.total}{s.current ? <> · {s.current}</> : null}</>}
                  {s.state === "done"    && <span className="text-emerald-700">✓ Done — {s.results.filter(r => r.ok).length}/{s.total} succeeded</span>}
                  {s.state === "failed"  && <span className="text-rose-700">⚠️ Some images failed — {s.results.filter(r => r.ok).length}/{s.total} succeeded</span>}
                </span>
                {s.finishedAt && (
                  <span className="text-muted-foreground">{Math.round(((s.finishedAt - s.startedAt) / 1000) * 10) / 10}s</span>
                )}
              </div>
              <ul className="space-y-0.5">
                {s.results.map((r, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="font-mono">{r.key}</span>
                    {r.ok
                      ? <span className="text-emerald-700">OK · {Math.round((r.bytes! / 1024))} KB</span>
                      : <span className="text-rose-700" title={r.error}>FAILED</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-2">
            Tip: reload <code>/igcse/app</code> after the run finishes to see the new images.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── /admin → IGCSE → Force-reseed all subjects ─────────────────────────────
// Idempotent diagnostic + recovery button. Runs every topic + exemplar seeder
// and reports what happened per subject. Use when:
//   • a fresh deploy didn't pick up a subject's content (e.g. subject enum
//     widening failed silently on prod)
//   • you want to see at a glance what's actually in the DB right now
// Re-running on a healthy DB is harmless — each seeder skips already-seeded rows.

function ReseedSubjectsCard() {
  const reseed = trpc.igcse.adminReseedAllSubjects.useMutation({
    onError: e => alert(e?.message || "Couldn't run reseed."),
  });
  const r = reseed.data;
  const grandTotalTopics = r?.counts ? Object.values(r.counts).reduce((s: number, v: any) => s + (v?.topics || 0), 0) : 0;
  const grandTotalEx = r?.counts ? Object.values(r.counts).reduce((s: number, v: any) => s + (v?.examples || 0), 0) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <Database className="w-5 h-5 mt-0.5 text-violet-600" />
        <div className="flex-1">
          <h3 className="font-semibold">Subject content (topics + exam questions)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Force-runs every IGCSE topic + exemplar seeder and shows what's currently in the DB.
            Idempotent — each seeder skips already-seeded rows. Use this if a subject is missing
            after a deploy.
          </p>

          <button
            onClick={() => reseed.mutate()}
            disabled={reseed.isPending}
            className="mt-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
          >
            {reseed.isPending ? "Running…" : "Reseed all subjects"}
          </button>

          {r && (
            <div className="mt-4 rounded-lg border border-border overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Subject</th>
                    <th className="text-right px-3 py-2">+ Topics this run</th>
                    <th className="text-right px-3 py-2">+ Questions this run</th>
                    <th className="text-right px-3 py-2">Total topics</th>
                    <th className="text-right px-3 py-2">Total questions</th>
                    <th className="text-left px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {r.results.map((row, i) => {
                    const key = row.subject.toLowerCase();
                    const c: any = r.counts?.[key] || { topics: 0, examples: 0 };
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{row.subject}</td>
                        <td className="px-3 py-2 text-right">{row.topicsSeeded}</td>
                        <td className="px-3 py-2 text-right">{row.examplesSeeded}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.topics}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.examples}</td>
                        <td className="px-3 py-2 text-rose-700" title={row.error}>
                          {row.error ? row.error.slice(0, 60) + "…" : ""}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-border bg-muted/20 font-semibold">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right">{r.results.reduce((s, x) => s + x.topicsSeeded, 0)}</td>
                    <td className="px-3 py-2 text-right">{r.results.reduce((s, x) => s + x.examplesSeeded, 0)}</td>
                    <td className="px-3 py-2 text-right font-mono">{grandTotalTopics}</td>
                    <td className="px-3 py-2 text-right font-mono">{grandTotalEx}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-2">
            Tip: if a subject shows 0 total topics here, the subject enum on igcse_topics may not have been widened on this DB.
            Re-running the button after a deploy will retry the enum-widening and the seed.
          </p>
        </div>
      </div>
    </div>
  );
}
