/**
 * Growth Dashboard (Phase A) — closed-loop conversion + ad-ROI.
 *
 * Shows, per marketing channel/campaign: leads → consultations → enrolled,
 * conversion rate, and (when ad spend is entered) cost-per-lead and
 * cost-per-enrollment. Enter monthly ad spend below to unlock the cost columns.
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, Loader2, DollarSign } from "lucide-react";

function monthOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [{ value: "", label: "All time" }];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const value = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value, label: m.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) });
  }
  return out;
}

const rp = (n: number | null | undefined) =>
  n == null ? "—" : "Rp " + Math.round(n).toLocaleString("id-ID");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

export default function GrowthDashboard() {
  const months = useMemo(monthOptions, []);
  const thisMonth = months[1]?.value || "";
  const [month, setMonth] = useState<string>(thisMonth);

  const utils = trpc.useUtils();
  const report = trpc.marketing.attributionReport.useQuery({ month: month || undefined });
  const spendList = trpc.marketing.listSpend.useQuery({ month: month || undefined });

  // Spend entry form
  const [src, setSrc] = useState("google");
  const [campaign, setCampaign] = useState("");
  const [medium, setMedium] = useState("cpc");
  const [amount, setAmount] = useState("");
  const [clicks, setClicks] = useState("");
  const [impressions, setImpressions] = useState("");

  const invalidate = () => {
    utils.marketing.attributionReport.invalidate();
    utils.marketing.listSpend.invalidate();
  };
  const addSpend = trpc.marketing.addSpend.useMutation({
    onSuccess: () => { toast.success("Spend added"); invalidate(); setAmount(""); setClicks(""); setImpressions(""); setCampaign(""); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSpend = trpc.marketing.deleteSpend.useMutation({
    onSuccess: () => { toast.success("Spend removed"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!src || !amt || isNaN(amt)) { toast.error("Enter a source and amount"); return; }
    if (!month) { toast.error("Pick a specific month to record spend"); return; }
    addSpend.mutate({
      source: src,
      campaign: campaign || undefined,
      medium: medium || undefined,
      periodMonth: month,
      amount: amt,
      clicks: clicks ? parseInt(clicks) : undefined,
      impressions: impressions ? parseInt(impressions) : undefined,
    });
  };

  const rows = report.data?.rows || [];
  const totals = report.data?.totals;

  return (
    <div className="space-y-6">
      {/* Header + month picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" /> Growth & Conversion
          </h2>
          <p className="text-sm text-gray-500">Which channels actually produce enrolled students — and what each one costs.</p>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Leads", value: totals.leads.toLocaleString() },
            { label: "Consultations", value: totals.consultations.toLocaleString() },
            { label: "Enrolled", value: totals.enrolled.toLocaleString() },
            { label: "Conversion", value: pct(totals.convRate) },
            { label: "Cost / enrollment", value: rp(totals.cpa) },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Attribution table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">By channel &amp; campaign</CardTitle></CardHeader>
        <CardContent className="p-0">
          {report.isLoading ? (
            <div className="p-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : !rows.length ? (
            <div className="p-10 text-center text-gray-500">No leads in this period yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Channel", "Campaign", "Leads", "Consult.", "Enrolled", "Conv.", "Spend", "Cost/lead", "Cost/enroll"].map(h => (
                      <th key={h} className="text-left p-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 font-medium capitalize">{r.channel}</td>
                      <td className="p-3 text-gray-500">{r.campaign === "(none)" ? "—" : r.campaign}</td>
                      <td className="p-3">{r.leads}</td>
                      <td className="p-3">{r.consultations}</td>
                      <td className="p-3 font-semibold text-emerald-700">{r.enrolled}</td>
                      <td className="p-3">{pct(r.convRate)}</td>
                      <td className="p-3">{r.spend ? rp(r.spend) : "—"}</td>
                      <td className="p-3">{rp(r.cpl)}</td>
                      <td className="p-3">{rp(r.cpa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ad spend entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" /> Ad spend {month ? `· ${months.find(m => m.value === month)?.label}` : "(pick a month to record)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Input placeholder="Source (e.g. google)" value={src} onChange={e => setSrc(e.target.value)} />
            <Input placeholder="Campaign (optional)" value={campaign} onChange={e => setCampaign(e.target.value)} />
            <Input placeholder="Medium (cpc)" value={medium} onChange={e => setMedium(e.target.value)} />
            <Input placeholder="Amount (Rp)" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
            <Input placeholder="Clicks (opt)" inputMode="numeric" value={clicks} onChange={e => setClicks(e.target.value)} />
            <Input placeholder="Impressions (opt)" inputMode="numeric" value={impressions} onChange={e => setImpressions(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={addSpend.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {addSpend.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Add spend</>}
          </Button>

          {!!spendList.data?.length && (
            <div className="border-t pt-3 space-y-2">
              {spendList.data.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                  <div>
                    <span className="font-medium capitalize">{s.source}</span>
                    {s.campaign && <span className="text-gray-500"> · {s.campaign}</span>}
                    <span className="text-gray-400"> · {s.periodMonth}</span>
                    {!!s.clicks && <span className="text-gray-400"> · {s.clicks} clicks</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{rp(Number(s.amount))}</span>
                    <button onClick={() => deleteSpend.mutate({ id: s.id })} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400">
            Tip: tag your ad links with <code>utm_source</code>, <code>utm_campaign</code> (Google Ads adds <code>gclid</code> automatically). Match the <em>Source</em> / <em>Campaign</em> here to those tags so cost-per-enrollment lines up.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
