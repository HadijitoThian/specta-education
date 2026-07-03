import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * /admin/ielts-tutor — admin oversight for the AI IELTS Tutor subscription
 * product. Parallels /admin/ielts-tests. Admin-only.
 *
 * Panels:
 *  - Headline stat cards (active subs, MRR, revenue 30d, sessions 7d, etc.)
 *  - Subscription list (filter by status × paid/free) with extend & cancel
 *  - Recent sessions table (writing/speaking, band, when)
 *  - Free-trial funnel (leads who tried but never paid)
 *  - Grant free access to a specific email
 *  - Create shareable free-pass link (reuses admin.ielts.createTutorFreePass)
 */
export default function AdminIeltsTutor() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="p-8">
        <p className="text-red-600">Admins only.</p>
        <Link href="/admin" className="text-blue-600 underline">← Back to /admin</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI IELTS Tutor — Admin</h1>
            <p className="text-sm text-slate-500">Subscription oversight, revenue, sessions, free-trial funnel.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="text-slate-600 hover:text-slate-900">/admin</Link>
            <Link href="/admin/ielts-tests" className="text-slate-600 hover:text-slate-900">Mock Test admin →</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <StatsCard />
        <GrantAndLinkCard />
        <SubscriptionsCard />
        <RecentSessionsCard />
        <FreeTrialFunnelCard />
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────────────────────

function StatsCard() {
  const q = trpc.admin.tutor.stats.useQuery(undefined, { refetchOnWindowFocus: false });
  const s = q.data;

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      <Stat label="Active subscriptions" value={s?.activeSubs ?? "—"} sub={s ? `${s.activePaidSubs} paid · ${s.activeFreeSubs} free` : ""} loading={q.isLoading} />
      <Stat label="MRR (active paid)" value={s ? fmtIdr(s.mrrIdr) : "—"} sub="proxy: Σ plan × active" loading={q.isLoading} />
      <Stat label="Revenue (last 30d)" value={s ? fmtIdr(s.revenue30dIdr) : "—"} sub="starts in last 30 days" loading={q.isLoading} />
      <Stat label="New subs (7d)" value={s?.newSubs7d ?? "—"} loading={q.isLoading} />
      <Stat label="Expiring (next 7d)" value={s?.expiring7d ?? "—"} tone="warn" loading={q.isLoading} />
      <Stat label="Sessions (7d)" value={s?.sessions7d ?? "—"} sub={s ? `${s.sessionsToday} today` : ""} loading={q.isLoading} />
      <Stat label="Paying users (all-time)" value={s?.paidUsersAllTime ?? "—"} loading={q.isLoading} />
      <Stat label="Free-trial only" value={s?.freeTrialUsers ?? "—"} sub="never paid" loading={q.isLoading} />
    </section>
  );
}

function Stat({ label, value, sub, tone, loading }: { label: string; value: any; sub?: string; tone?: "warn"; loading?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone === "warn" ? "text-amber-600" : "text-slate-900"}`}>
        {loading ? <span className="text-slate-300">…</span> : value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Grant & shareable-link card
// ────────────────────────────────────────────────────────────────────────────

function GrantAndLinkCard() {
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(7);
  const [plan, setPlan] = useState<"w2" | "m1">("w2");
  const [result, setResult] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const grant = trpc.admin.tutor.grantFreeAccess.useMutation({
    onSuccess: (d: any) => {
      setResult(
        d.extendedExistingSub
          ? `✅ Existing sub #${d.subscriptionId} extended. New expiry: ${new Date(d.expiresAt).toLocaleString()}`
          : `✅ Granted free sub #${d.subscriptionId}. Expires: ${new Date(d.expiresAt).toLocaleString()}`
      );
      utils.admin.tutor.stats.invalidate();
      utils.admin.tutor.listSubscriptions.invalidate();
      setEmail("");
    },
    onError: (e: any) => setResult(`❌ ${e.message}`),
  });

  const createLink = trpc.admin.ielts.createTutorFreePass.useMutation({
    onSuccess: (d: any) => {
      // Copy the URL to clipboard automatically for convenience.
      try { navigator.clipboard.writeText(d.url); } catch {}
      setResult(`🔗 Link (copied): ${d.url}`);
    },
    onError: (e: any) => setResult(`❌ ${e.message}`),
  });

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <h2 className="font-semibold text-slate-900 mb-3">Grant free access</h2>
      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-slate-600">Student email (must already be a registered lead)</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Days</label>
          <input
            type="number" min={1} max={365}
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 7)))}
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Plan bucket</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as any)}
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
          >
            <option value="w2">w2 (2 weeks)</option>
            <option value="m1">m1 (1 month)</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={() => { setResult(null); grant.mutate({ email, days, plan }); }}
          disabled={!email || grant.isPending}
          className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {grant.isPending ? "Granting…" : "Grant to this email"}
        </button>
        <button
          onClick={() => { setResult(null); createLink.mutate({ days }); }}
          disabled={createLink.isPending}
          className="px-4 py-2 rounded bg-pink-600 text-white text-sm font-semibold disabled:opacity-50"
          title="Create a shareable free-pass link (anyone who opens it registers + gets access)"
        >
          {createLink.isPending ? "Creating…" : "✨ Create shareable link"}
        </button>
      </div>
      {result && <div className="mt-3 text-sm p-2 bg-slate-100 rounded break-all">{result}</div>}
      <p className="mt-3 text-xs text-slate-500">
        <strong>Grant to email</strong> = one specific student who's already registered (adds a FREE- sub or extends
        their active one). <strong>Shareable link</strong> = anyone with the URL can redeem (they register + get {days} days).
      </p>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subscriptions
// ────────────────────────────────────────────────────────────────────────────

function SubscriptionsCard() {
  const [status, setStatus] = useState<"active" | "pending" | "expired" | "cancelled" | "all">("active");
  const [kind, setKind] = useState<"all" | "paid" | "free">("all");
  const q = trpc.admin.tutor.listSubscriptions.useQuery({ status, kind, limit: 100, offset: 0 });
  const utils = trpc.useUtils();

  const extend = trpc.admin.tutor.extendSubscription.useMutation({
    onSuccess: () => {
      utils.admin.tutor.listSubscriptions.invalidate();
      utils.admin.tutor.stats.invalidate();
    },
  });
  const cancel = trpc.admin.tutor.cancelSubscription.useMutation({
    onSuccess: () => {
      utils.admin.tutor.listSubscriptions.invalidate();
      utils.admin.tutor.stats.invalidate();
    },
  });

  const onExtend = (id: number) => {
    const raw = window.prompt("Extend by how many days?", "7");
    if (!raw) return;
    const days = Math.max(1, Math.min(365, Number(raw) || 0));
    if (!days) return;
    extend.mutate({ id, days });
  };
  const onCancel = (id: number, name: string | null) => {
    if (!window.confirm(`Cancel subscription #${id}${name ? ` (${name})` : ""}? Access will be cut immediately.`)) return;
    cancel.mutate({ id });
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-semibold text-slate-900">Subscriptions</h2>
        <div className="flex gap-2 text-sm">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="border border-slate-300 rounded px-2 py-1">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="border border-slate-300 rounded px-2 py-1">
            <option value="all">Paid + Free</option>
            <option value="paid">Paid only</option>
            <option value="free">Free only</option>
          </select>
        </div>
        {q.isFetching && <span className="text-xs text-slate-400">refreshing…</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-2">ID</th>
              <th className="py-2 pr-2">Student</th>
              <th className="py-2 pr-2">Plan</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2">Started</th>
              <th className="py-2 pr-2">Expires</th>
              <th className="py-2 pr-2">Invoice</th>
              <th className="py-2 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={8} className="py-6 text-center text-slate-400">Loading…</td></tr>}
            {q.data && q.data.items.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-slate-400">No subscriptions match.</td></tr>
            )}
            {q.data?.items.map((r: any) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-2 font-mono text-xs">#{r.id}</td>
                <td className="py-2 pr-2">
                  <div className="font-medium">{r.studentName || <span className="text-slate-400">(no name)</span>}</div>
                  <div className="text-xs text-slate-500">{r.studentEmail || "—"}</div>
                </td>
                <td className="py-2 pr-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-xs font-mono">{r.plan}</span>
                  {r.isFree && <span className="ml-1 text-[10px] text-emerald-700">FREE</span>}
                </td>
                <td className="py-2 pr-2"><StatusPill status={r.status} /></td>
                <td className="py-2 pr-2 text-xs">{r.startsAt ? new Date(r.startsAt).toLocaleDateString() : "—"}</td>
                <td className="py-2 pr-2 text-xs">
                  <ExpiryCell expiresAt={r.expiresAt} />
                </td>
                <td className="py-2 pr-2 text-xs font-mono break-all">{r.xenditInvoiceId || "—"}</td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  <button onClick={() => onExtend(r.id)} className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 mr-1">Extend</button>
                  {r.status === "active" && (
                    <button onClick={() => onCancel(r.id, r.studentName)} className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {q.data?.hasMore && <p className="text-xs text-slate-500 mt-2">Showing first 100. Refine filters to narrow the list.</p>}
    </section>
  );
}

function ExpiryCell({ expiresAt }: { expiresAt: string | Date | null }) {
  if (!expiresAt) return <span className="text-slate-400">—</span>;
  const d = new Date(expiresAt);
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const past = diffMs < 0;
  const soon = !past && days <= 7;
  return (
    <span className={past ? "text-red-600" : soon ? "text-amber-600 font-medium" : "text-slate-700"}>
      {d.toLocaleDateString()} {past ? `(-${-days}d)` : `(${days}d)`}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const colour =
    status === "active" ? "bg-emerald-100 text-emerald-800" :
    status === "expired" ? "bg-slate-200 text-slate-700" :
    status === "cancelled" ? "bg-red-100 text-red-700" :
    "bg-amber-100 text-amber-800";
  return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${colour}`}>{status}</span>;
}

// ────────────────────────────────────────────────────────────────────────────
// Recent sessions
// ────────────────────────────────────────────────────────────────────────────

function RecentSessionsCard() {
  const [skill, setSkill] = useState<"all" | "writing" | "speaking">("all");
  const q = trpc.admin.tutor.recentSessions.useQuery({ skill, limit: 50 });

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-semibold text-slate-900">Recent sessions</h2>
        <select value={skill} onChange={(e) => setSkill(e.target.value as any)} className="text-sm border border-slate-300 rounded px-2 py-1">
          <option value="all">All skills</option>
          <option value="writing">Writing</option>
          <option value="speaking">Speaking</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-2">When</th>
              <th className="py-2 pr-2">Student</th>
              <th className="py-2 pr-2">Skill</th>
              <th className="py-2 pr-2">Task</th>
              <th className="py-2 pr-2">Band</th>
              <th className="py-2 pr-2">Duration</th>
              <th className="py-2 pr-2">Free?</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={7} className="py-6 text-center text-slate-400">Loading…</td></tr>}
            {q.data && q.data.items.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-slate-400">No sessions yet.</td></tr>
            )}
            {q.data?.items.map((r: any) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-2 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-2">
                  <div className="font-medium">{r.studentName || <span className="text-slate-400">(no name)</span>}</div>
                  <div className="text-xs text-slate-500">{r.studentEmail || "—"}</div>
                </td>
                <td className="py-2 pr-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${r.skill === "writing" ? "bg-indigo-100 text-indigo-800" : "bg-fuchsia-100 text-fuchsia-800"}`}>{r.skill}</span>
                </td>
                <td className="py-2 pr-2 text-xs font-mono">{r.taskType || "—"}</td>
                <td className="py-2 pr-2 font-semibold">{r.overallBand ?? "—"}</td>
                <td className="py-2 pr-2 text-xs">{r.durationSec ? `${Math.round(r.durationSec)}s` : "—"}</td>
                <td className="py-2 pr-2 text-xs">{r.isFree ? "yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Free-trial funnel
// ────────────────────────────────────────────────────────────────────────────

function FreeTrialFunnelCard() {
  const q = trpc.admin.tutor.freeTrialFunnel.useQuery({ limit: 50 });
  const totalTried = q.data?.items.length ?? 0;

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-semibold text-slate-900">Free-trial funnel — didn't convert yet</h2>
        <span className="text-xs text-slate-500">Leads who tried the free taster but haven't bought a paid sub.</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-2">Last tried</th>
              <th className="py-2 pr-2">Student</th>
              <th className="py-2 pr-2">Contact</th>
              <th className="py-2 pr-2">Writing</th>
              <th className="py-2 pr-2">Speaking</th>
              <th className="py-2 pr-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={6} className="py-6 text-center text-slate-400">Loading…</td></tr>}
            {q.data && totalTried === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-400">No unconverted free-trial users. Nice.</td></tr>
            )}
            {q.data?.items.map((r: any) => (
              <tr key={r.leadId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-2 text-xs">{r.lastTriedAt ? new Date(r.lastTriedAt).toLocaleDateString() : "—"}</td>
                <td className="py-2 pr-2">
                  <div className="font-medium">{r.studentName || <span className="text-slate-400">(no name)</span>}</div>
                </td>
                <td className="py-2 pr-2 text-xs">
                  <div>{r.studentEmail || "—"}</div>
                  <div className="text-slate-500">{r.studentPhone || ""}</div>
                </td>
                <td className="py-2 pr-2">{r.writingCount}</td>
                <td className="py-2 pr-2">{r.speakingCount}</td>
                <td className="py-2 pr-2 font-semibold">{r.sessionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Utils
// ────────────────────────────────────────────────────────────────────────────

function fmtIdr(n: number): string {
  if (!n || n <= 0) return "Rp 0";
  return "Rp " + n.toLocaleString("id-ID");
}
