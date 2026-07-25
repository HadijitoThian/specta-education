/**
 * Aptitude (Tes Bakat AI Pro) management for the new admin dashboard.
 *
 * Brings the Pro-order tracking + support tools out of the legacy dashboard:
 *   - Send a Pro access link by email (for customers with no order row, e.g.
 *     paid before the migration)
 *   - Resend a completed result (for students who finished but never got the
 *     email — the result is saved; we regenerate the PDF and re-send)
 *   - Orders table with resend-link / mark-paid actions
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const emailValid = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

// ── Regen jobs in-flight tracker ──────────────────────────────────────
// Since regen is fire-and-forget (browser gets instant response, server
// runs 3-5 min), we track dispatched jobs in localStorage so the UI can
// show "🚀 Job running for X (2m ago)" and disable duplicate clicks.
// Auto-clears after 10 min (jobs longer than that = probably failed).
const JOB_STORE_KEY = "spectaAptitudeRegenJobs";
const JOB_MAX_AGE_MS = 10 * 60 * 1000;

type RegenJob = { studentEmail: string; sendTo: string; startedAt: number; name?: string };

function loadRunningJobs(): RegenJob[] {
  try {
    const raw = localStorage.getItem(JOB_STORE_KEY);
    if (!raw) return [];
    const jobs: RegenJob[] = JSON.parse(raw);
    const now = Date.now();
    return jobs.filter(j => now - j.startedAt < JOB_MAX_AGE_MS);
  } catch { return []; }
}
function saveRunningJobs(jobs: RegenJob[]) {
  try { localStorage.setItem(JOB_STORE_KEY, JSON.stringify(jobs)); } catch {}
}
function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s ago`;
}

export default function AptitudeManager() {
  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.aptitude.listProOrders.useQuery();

  const [accessEmail, setAccessEmail] = useState("");
  const [accessName, setAccessName] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendToOverride, setResendToOverride] = useState("");

  // In-flight regen jobs (persists across refresh via localStorage)
  const [runningJobs, setRunningJobs] = useState<RegenJob[]>(() => loadRunningJobs());
  // Force re-render every 5s so the "Xm Ys ago" labels stay fresh + expired jobs auto-clear
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setNowTick(n => n + 1);
      // Auto-clear expired jobs
      const jobs = loadRunningJobs();
      if (jobs.length !== runningJobs.length) {
        setRunningJobs(jobs);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [runningJobs.length]);

  // Read-only "did this student complete the test?" lookup
  const [lookupInput, setLookupInput] = useState("");
  const [lookupEmail, setLookupEmail] = useState<string | null>(null);
  const lookup = trpc.aptitude.lookupAptitudeResult.useQuery(
    { email: lookupEmail || "" },
    { enabled: !!lookupEmail },
  );

  const issueAccess = trpc.aptitude.issueProAccessToEmail.useMutation({
    onSuccess: d => { toast.success(`✅ Access link emailed to ${d.email}`); setAccessEmail(""); setAccessName(""); },
    onError: e => toast.error(`❌ ${e.message}`),
  });
  const resendResult = trpc.aptitude.resendAptitudeResult.useMutation({
    onSuccess: d => { toast.success(`✅ Result re-sent to ${d.name} (${d.email})`); setResendEmail(""); },
    onError: e => toast.error(`❌ ${e.message}`),
  });
  const regenerateAnalysis = trpc.aptitude.regenerateAptitudeAnalysis.useMutation({
    onSuccess: (d: any) => {
      // Add to in-flight jobs so UI shows "🚀 Job running for X (Ns ago)"
      // and duplicate clicks for the same email are blocked.
      const newJob: RegenJob = {
        studentEmail: d.originalStudentEmail,
        sendTo: d.email,
        startedAt: Date.now(),
        name: d.name,
      };
      const jobs = loadRunningJobs().filter(j => j.studentEmail !== newJob.studentEmail).concat([newJob]);
      saveRunningJobs(jobs);
      setRunningJobs(jobs);
      toast.success(
        `🚀 Regen JOB STARTED for ${d.name}. Fresh PDF → ${d.email} in 2-6 min. You'll get an owner-notification email when done (success or failure). Watch Railway logs: filter "RegenJob".`,
        { duration: 12000 },
      );
      // Clear the inputs so it's clearer that the action was received
      setResendEmail("");
    },
    onError: e => toast.error(`❌ ${e.message}`, { duration: 10000 }),
  });

  // Check if a regen is currently in flight for this student
  const activeJob = runningJobs.find(j => j.studentEmail.toLowerCase() === resendEmail.trim().toLowerCase());
  const resendLink = trpc.aptitude.resendProAccessLink.useMutation({
    onSuccess: d => { toast.success(`✅ Access link resent to ${d.email}`); utils.aptitude.listProOrders.invalidate(); },
    onError: e => toast.error(`❌ ${e.message}`),
  });
  const markPaid = trpc.aptitude.markOrderPaidAndSendLink.useMutation({
    onSuccess: d => { toast.success(`✅ Marked paid. Link sent to ${d.email}`); utils.aptitude.listProOrders.invalidate(); },
    onError: e => toast.error(`❌ ${e.message}`),
  });

  const list = (orders as any[]) || [];
  const paid = list.filter(o => o.status === "paid");
  const revenue = paid.reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">🧠 Tes Bakat AI Pro</h2>
        <p className="text-sm text-gray-500">Orders, access links, and result re-sends for the aptitude test.</p>
      </div>

      {/* Read-only lookup: did this student complete the test? */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-sm text-gray-900">🔍 Check if a student completed the test</h3>
        <p className="text-xs text-gray-500 mt-0.5 mb-3">Read-only — looks up saved results by email. Sends nothing.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            placeholder="student@email.com"
            value={lookupInput}
            onChange={e => setLookupInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && emailValid(lookupInput.trim())) setLookupEmail(lookupInput.trim()); }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={() => { if (!emailValid(lookupInput.trim())) return toast.error("Enter a valid email."); setLookupEmail(lookupInput.trim()); }}
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-5 py-2 rounded-lg whitespace-nowrap"
          >Check</button>
        </div>
        {lookupEmail && (
          <div className="mt-3 text-sm">
            {lookup.isLoading ? (
              <span className="text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking…</span>
            ) : !lookup.data?.found ? (
              <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ❌ No completed test found for <strong>{lookupEmail}</strong>. She likely didn't finish, or used a different email.
              </div>
            ) : (
              <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                ✅ Found <strong>{lookup.data.count}</strong> completed test{lookup.data.count > 1 ? "s" : ""} for {lookupEmail}:
                <ul className="mt-1 ml-4 list-disc text-gray-700">
                  {lookup.data.results.map(r => (
                    <li key={r.id}>
                      {r.name} · {r.completedAt ? new Date(r.completedAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      {r.hollandCode ? ` · Holland ${r.hollandCode}` : ""}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-1">Use "Resend result" above to email it to her.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Support tools */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-sm text-gray-900">📧 Send a Pro access link by email</h3>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">For a paid customer who isn't in the orders list (e.g. paid before the migration). Mints a fresh single-use link.</p>
          <div className="space-y-2">
            <input type="email" placeholder="customer@email.com" value={accessEmail} onChange={e => setAccessEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input type="text" placeholder="Name (optional)" value={accessName} onChange={e => setAccessName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button
              onClick={() => { if (!emailValid(accessEmail.trim())) return toast.error("Enter a valid email."); issueAccess.mutate({ email: accessEmail.trim(), name: accessName.trim() || undefined }); }}
              disabled={issueAccess.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >{issueAccess.isPending ? "Sending…" : "Send access link"}</button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-sm text-gray-900">🔁 Resend a completed result</h3>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">Student finished but never got the email? Their result is saved — regenerate the PDF and re-send it. Leave the "Send to" blank to send to the original student, or enter your own email to receive a copy.</p>
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-gray-600 block">Student's original email (to look up the report)</label>
            <input type="email" placeholder="student@email.com" value={resendEmail} onChange={e => setResendEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <label className="text-[11px] font-medium text-gray-600 block mt-2">Send to (optional — leave blank to send to student)</label>
            <input type="email" placeholder="your-email@example.com (optional)" value={resendToOverride} onChange={e => setResendToOverride(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button
              onClick={() => {
                if (!emailValid(resendEmail.trim())) return toast.error("Enter a valid student email.");
                const override = resendToOverride.trim();
                if (override && !emailValid(override)) return toast.error("Enter a valid override email or leave it blank.");
                resendResult.mutate({ email: resendEmail.trim(), toOverride: override || undefined });
              }}
              disabled={resendResult.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >{resendResult.isPending ? "Sending…" : (resendToOverride.trim() ? "Send copy to me" : "Resend to student")}</button>
          </div>
        </div>

        {/* 🔥 REGENERATE FULL ANALYSIS — for broken PDFs (e.g. Cherise incident) */}
        <div className="bg-white border-2 border-orange-300 rounded-xl p-5 md:col-span-2">
          <h3 className="font-semibold text-sm text-orange-900">🔥 Regenerate FULL AI analysis (fix broken PDFs)</h3>
          <p className="text-xs text-orange-700 mt-0.5 mb-3">
            For students whose original PDF is broken/thin (missing majors, career outlook, parent summary — i.e. only 4 pages).
            This re-runs the full AI analysis with the new reliable pipeline, overwrites the saved analysis, generates a fresh
            PDF, and emails it (BCC'd to you). Use this to fix Cherise Felica Daulat + any other affected buyers.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="student email (finds most recent Pro result)"
              value={resendEmail}
              onChange={e => setResendEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-orange-300 rounded-lg text-sm"
            />
            <input
              type="email"
              placeholder="send to me instead (optional)"
              value={resendToOverride}
              onChange={e => setResendToOverride(e.target.value)}
              className="flex-1 px-3 py-2 border border-orange-300 rounded-lg text-sm"
            />
            <button
              onClick={() => {
                if (!emailValid(resendEmail.trim())) return toast.error("Enter a valid student email.");
                const override = resendToOverride.trim();
                if (override && !emailValid(override)) return toast.error("Enter a valid override email or leave it blank.");
                if (activeJob) return toast.error(`Job already running for ${resendEmail.trim()} (started ${formatElapsed(Date.now() - activeJob.startedAt)}). Wait for it to complete before retrying.`);
                if (!window.confirm(`Regenerate FULL analysis for ${resendEmail.trim()}?\n\nThis will START a background job that:\n1. Re-runs the AI analysis (3 attempts with retry)\n2. Overwrites the saved analysis in DB\n3. Generates a fresh 10-15 page PDF\n4. Emails it to ${override || "the student"} (BCC you)\n\nThe browser returns immediately. The job runs on server for 2-6 min.\nYou'll get an owner-notification email when done (success OR failure).\nContinue?`)) return;
                regenerateAnalysis.mutate({ email: resendEmail.trim(), toOverride: override || undefined, sendApology: true });
              }}
              disabled={regenerateAnalysis.isPending || !!activeJob}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2 rounded-lg whitespace-nowrap"
            >{regenerateAnalysis.isPending ? "Starting…" : activeJob ? `⏳ Running (${formatElapsed(Date.now() - activeJob.startedAt)})` : "🔥 Regenerate + Send"}</button>
          </div>

          {/* In-flight regen jobs panel — persists across refresh via localStorage */}
          {runningJobs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-orange-200">
              <div className="text-[11px] font-semibold text-orange-900 uppercase tracking-wide mb-2">
                🚀 Regen jobs in flight ({runningJobs.length})
              </div>
              <div className="space-y-2">
                {runningJobs.map(j => {
                  const elapsedMs = Date.now() - j.startedAt;
                  const isProbablyDone = elapsedMs > 6 * 60 * 1000;  // >6 min = probably finished
                  return (
                    <div key={j.studentEmail + j.startedAt} className="flex items-center justify-between gap-3 bg-white border border-orange-200 rounded-lg px-3 py-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {j.name || j.studentEmail}
                          <span className="ml-2 text-slate-500 font-normal">→ {j.sendTo}</span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {isProbablyDone
                            ? <span className="text-emerald-700 font-medium">Probably done · check email + Railway logs</span>
                            : <>Started {formatElapsed(elapsedMs)} · check email in {Math.max(0, 5 - Math.floor(elapsedMs / 60000))}-{Math.max(1, 6 - Math.floor(elapsedMs / 60000))} min</>
                          }
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const filtered = runningJobs.filter(x => !(x.studentEmail === j.studentEmail && x.startedAt === j.startedAt));
                          saveRunningJobs(filtered);
                          setRunningJobs(filtered);
                        }}
                        className="text-slate-400 hover:text-slate-600 text-[10px] px-2 py-1 rounded"
                        title="Remove from list (doesn't cancel the server job)"
                      >Clear</button>
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-slate-500 mt-2">
                💡 Jobs auto-clear from this list after 10 min. Server-side job continues regardless. Confirm success via the owner-notification email or Railway logs (filter: <code>RegenJob</code>).
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-50 rounded-lg p-4 text-center"><div className="text-xl font-bold text-green-700">Rp {revenue.toLocaleString("id-ID")}</div><div className="text-xs text-green-600 mt-1">Revenue</div></div>
        <div className="bg-blue-50 rounded-lg p-4 text-center"><div className="text-xl font-bold text-blue-700">{paid.length}</div><div className="text-xs text-blue-600 mt-1">Paid</div></div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center"><div className="text-xl font-bold text-yellow-700">{list.filter(o => o.status === "pending").length}</div><div className="text-xs text-yellow-600 mt-1">Pending</div></div>
        <div className="bg-purple-50 rounded-lg p-4 text-center"><div className="text-xl font-bold text-purple-700">{list.length}</div><div className="text-xs text-purple-600 mt-1">Total</div></div>
      </div>

      {/* Orders table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-600" /></div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No Pro orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <th className="p-3 font-medium">Customer</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">Amount</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Action</th>
              </tr></thead>
              <tbody>
                {list.map((o: any) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium">{o.customerName}</td>
                    <td className="p-3 text-gray-500">{o.customerEmail}</td>
                    <td className="p-3">Rp {(o.amount || 0).toLocaleString("id-ID")}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.status === "paid" ? "bg-green-100 text-green-800" : o.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}>{o.status}</span></td>
                    <td className="p-3 text-gray-400 text-xs">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}</td>
                    <td className="p-3">
                      {o.status === "paid" ? (
                        <button disabled={resendLink.isPending} onClick={() => resendLink.mutate({ externalId: o.externalId })} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100">📧 Resend link</button>
                      ) : (
                        <button disabled={markPaid.isPending} onClick={() => { if (confirm(`Mark ${o.customerName} paid and send access link to ${o.customerEmail}?`)) markPaid.mutate({ externalId: o.externalId }); }} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white">✅ Mark paid &amp; send</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
