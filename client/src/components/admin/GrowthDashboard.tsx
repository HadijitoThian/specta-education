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

interface ParsedSpendRow { campaign?: string; amount: number; clicks?: number; impressions?: number }

/** Parse a pasted Google Ads report (CSV or tab-separated) into spend rows. */
function parseGoogleAds(text: string): ParsedSpendRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delim = lines.some(l => l.includes("\t")) ? "\t" : ",";
  const split = (l: string) => l.split(delim).map(c => c.trim().replace(/^"|"$/g, ""));
  let headerIdx = lines.findIndex(l => /campaign/i.test(l) && /(cost|spend|clicks|impr)/i.test(l));
  if (headerIdx < 0) headerIdx = 0;
  const header = split(lines[headerIdx]).map(h => h.toLowerCase());
  const col = (...names: string[]) => header.findIndex(h => names.some(n => h.includes(n)));
  const ci = { campaign: col("campaign"), cost: col("cost", "spend"), clicks: col("click"), impr: col("impr") };
  const num = (s?: string) => { const d = (s || "").replace(/[^0-9]/g, ""); return d ? parseInt(d, 10) : 0; };
  const out: ParsedSpendRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = split(lines[i]);
    const campRaw = ci.campaign >= 0 ? cells[ci.campaign] : "";
    if (/^total|^---/i.test(campRaw || "")) continue;
    const amount = ci.cost >= 0 ? num(cells[ci.cost]) : 0;
    if (!amount && !campRaw) continue;
    out.push({
      campaign: campRaw || undefined,
      amount,
      clicks: ci.clicks >= 0 ? (num(cells[ci.clicks]) || undefined) : undefined,
      impressions: ci.impr >= 0 ? (num(cells[ci.impr]) || undefined) : undefined,
    });
  }
  return out.filter(r => r.amount > 0 || r.campaign);
}

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

  // Google Ads live API (dormant until credentials are set)
  const gAds = trpc.marketing.googleAdsStatus.useQuery(undefined, { retry: false });
  const gAdsSync = trpc.marketing.googleAdsSync.useMutation({
    onSuccess: (r) => { toast.success(`Synced ${r.count} campaign(s) from Google Ads`); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Google Ads import
  const [importText, setImportText] = useState("");
  const parsedImport = useMemo(() => parseGoogleAds(importText), [importText]);
  const importGoogle = trpc.marketing.importGoogleAdsSpend.useMutation({
    onSuccess: (r) => { toast.success(`Imported ${r.count} campaign(s) from Google Ads`); invalidate(); setImportText(""); },
    onError: (e) => toast.error(e.message),
  });
  const handleImport = () => {
    if (!month) { toast.error("Pick a specific month first"); return; }
    if (!parsedImport.length) { toast.error("Nothing to import — paste your Google Ads report"); return; }
    importGoogle.mutate({ month, rows: parsedImport });
  };

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

      {/* Google Ads live connection (Phase D) */}
      {gAds.data?.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Google Ads — live sync</span>
              <Button size="sm" variant="outline" onClick={() => month ? gAdsSync.mutate({ month }) : toast.error("Pick a month")} disabled={gAdsSync.isPending}>
                {gAdsSync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync now"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gAds.data.ok
              ? <p className="text-sm text-green-700">✓ Connected{gAds.data.accountName ? ` to ${gAds.data.accountName}` : ""}. Spend, clicks &amp; impressions auto-sync daily — no manual paste needed.</p>
              : <p className="text-sm text-red-600">Credentials set but connection failed: {gAds.data.error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Import from Google Ads (manual fallback) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" /> Import from Google Ads {month ? `· ${months.find(m => m.value === month)?.label}` : "(pick a month first)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            In Google Ads → <strong>Campaigns</strong>, select the month, then <strong>Download</strong> the report (CSV). Open it and paste the contents below — we read Campaign, Cost, Clicks &amp; Impressions automatically. Re-importing replaces this month's Google spend (no duplicates).
          </p>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            rows={6}
            placeholder={"Paste your Google Ads report here (CSV or tab-separated).\nExample:\nCampaign, Cost, Clicks, Impr.\nielts-mock-test, 250000, 180, 9000"}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          {parsedImport.length > 0 && (
            <div className="border rounded-lg divide-y text-sm">
              <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500">{parsedImport.length} campaign(s) detected — preview</div>
              {parsedImport.slice(0, 10).map((r, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5">
                  <span>{r.campaign || "(unnamed)"}</span>
                  <span className="text-gray-500">{rp(r.amount)}{r.clicks ? ` · ${r.clicks} clicks` : ""}{r.impressions ? ` · ${r.impressions} impr` : ""}</span>
                </div>
              ))}
            </div>
          )}
          <Button onClick={handleImport} disabled={importGoogle.isPending || !parsedImport.length} className="bg-blue-600 hover:bg-blue-700">
            {importGoogle.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Import {parsedImport.length || ""} campaign(s)</>}
          </Button>
          <p className="text-xs text-gray-400">Amounts are read as whole IDR. Campaign names are matched to your ad URLs' <code>utm_campaign</code> automatically.</p>
        </CardContent>
      </Card>
    </div>
  );
}
