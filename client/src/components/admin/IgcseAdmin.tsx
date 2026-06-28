/**
 * IGCSE admin overview — aggregated stats + recent attempts feed.
 * Read-only oversight for the IGCSE Math AI Teacher product.
 */
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

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
