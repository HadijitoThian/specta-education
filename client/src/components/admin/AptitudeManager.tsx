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

  const issueAccess = trpc.aptitude.issueProAccessToEmail.useMutation({
    onSuccess: d => { toast.success(`✅ Access link emailed to ${d.email}`); setAccessEmail(""); setAccessName(""); },
    onError: e => toast.error(`❌ ${e.message}`),
  });
  const resendResult = trpc.aptitude.resendAptitudeResult.useMutation({
    onSuccess: d => { toast.success(`✅ Result re-sent to ${d.name} (${d.email})`); setResendEmail(""); },
    onError: e => toast.error(`❌ ${e.message}`),
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
          <p className="text-xs text-gray-500 mt-0.5 mb-3">Student finished but never got the email? Their result is saved — regenerate the PDF and re-send it.</p>
          <div className="space-y-2">
            <input type="email" placeholder="student@email.com" value={resendEmail} onChange={e => setResendEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button
              onClick={() => { if (!emailValid(resendEmail.trim())) return toast.error("Enter a valid email."); resendResult.mutate({ email: resendEmail.trim() }); }}
              disabled={resendResult.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >{resendResult.isPending ? "Sending…" : "Resend result"}</button>
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
