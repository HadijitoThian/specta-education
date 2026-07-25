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
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const emailValid = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

export default function AptitudeManager() {
  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.aptitude.listProOrders.useQuery();

  const [accessEmail, setAccessEmail] = useState("");
  const [accessName, setAccessName] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendToOverride, setResendToOverride] = useState("");

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
      toast.success(`✅ REGENERATED for ${d.name}: new PDF is ${d.pdfSizeKb}KB with ${d.recommendedMajorsCount} majors. Sent to ${d.email}${d.ownerCopied ? " (BCC'd to owner)" : ""}.`, { duration: 8000 });
    },
    onError: e => toast.error(`❌ ${e.message}`, { duration: 10000 }),
  });
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
                if (!window.confirm(`Regenerate FULL analysis for ${resendEmail.trim()}?\n\nThis will:\n1. Re-run the AI analysis (3 attempts with retry)\n2. Overwrite the saved analysis in DB\n3. Generate a fresh 10-15 page PDF\n4. Email it to ${override || "the student"}\n5. BCC you (owner)\n\nMay take 30-90 seconds. Continue?`)) return;
                regenerateAnalysis.mutate({ email: resendEmail.trim(), toOverride: override || undefined, sendApology: true });
              }}
              disabled={regenerateAnalysis.isPending}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-semibold px-6 py-2 rounded-lg whitespace-nowrap"
            >{regenerateAnalysis.isPending ? "Regenerating (30-90s)…" : "🔥 Regenerate + Send"}</button>
          </div>
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
