/**
 * AI Google Ads Co-pilot (Phase B).
 *
 * Describe what you want to advertise → AI generates a full Google Search
 * campaign (ad groups, keywords, RSA copy, negatives, extensions, budget) with
 * UTM-tagged URLs that feed the Growth dashboard. Export to a Google Ads Editor
 * CSV and import. A drafting tool — you review everything before it goes live.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Loader2, Download, Trash2, ArrowLeft, Plus, Copy } from "lucide-react";

const LANDING_PAGES = [
  { path: "/ielts", label: "IELTS Preparation" },
  { path: "/scholarships", label: "Scholarships" },
  { path: "/destinations", label: "Study Destinations" },
  { path: "/destinations/australia", label: "Study in Australia" },
  { path: "/book", label: "Book Consultation" },
  { path: "/contact", label: "Contact / Free Consult" },
  { path: "/play/aptitude", label: "Tes Bakat AI" },
];

type Campaign = any;

export default function AdsCopilot() {
  const utils = trpc.useUtils();
  const list = trpc.marketing.listCampaigns.useQuery();
  const [openId, setOpenId] = useState<number | null>(null);

  // Brief form
  const [product, setProduct] = useState("");
  const [goal, setGoal] = useState("");
  const [landingPath, setLandingPath] = useState("/contact");
  const [budget, setBudget] = useState("");

  const generate = trpc.marketing.generateCampaign.useMutation({
    onSuccess: (c) => { toast.success("Campaign generated — review it below."); utils.marketing.listCampaigns.invalidate(); setProduct(""); setGoal(""); setBudget(""); if (c) setOpenId(c.id); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.marketing.deleteCampaign.useMutation({
    onSuccess: () => { toast.success("Deleted"); utils.marketing.listCampaigns.invalidate(); setOpenId(null); },
    onError: (e) => toast.error(e.message),
  });
  const exportCsv = trpc.marketing.exportCampaignCsv.useMutation({
    onSuccess: ({ csv, filename }) => {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      utils.marketing.listCampaigns.invalidate();
      toast.success("CSV downloaded — import it in Google Ads Editor.");
    },
    onError: (e) => toast.error(e.message),
  });

  const detail = trpc.marketing.getCampaign.useQuery({ id: openId! }, { enabled: openId != null });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };

  // ── Detail view ──────────────────────────────────────────────────────────
  if (openId != null) {
    const c: Campaign = detail.data;
    const p = c?.payload;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          {c && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCsv.mutate({ id: c.id })} disabled={exportCsv.isPending}>
                {exportCsv.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-1" /> Download CSV</>}
              </Button>
              <Button size="sm" variant="outline" className="text-red-500" onClick={() => { if (confirm("Delete this campaign?")) del.mutate({ id: c.id }); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {detail.isLoading || !p ? (
          <div className="p-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold">{p.campaignName}</h2>
              <div className="text-sm text-gray-500 mt-1">Suggested budget: Rp {Number(p.dailyBudgetSuggested || 0).toLocaleString("id-ID")}/day</div>
              <div className="text-xs text-gray-500 mt-1 break-all">Final URL: <code>{p.finalUrlBase}</code></div>
            </div>

            {/* Ad groups + keywords */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Ad groups &amp; keywords</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {p.adGroups?.map((ag: any, i: number) => (
                  <div key={i}>
                    <div className="font-medium text-sm mb-1">{ag.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {ag.keywords?.map((kw: any, j: number) => (
                        <Badge key={j} variant="outline" className="text-xs font-normal">
                          {kw.text} <span className="text-gray-400 ml-1">{kw.matchType}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* RSA copy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  Responsive Search Ad
                  <Button size="sm" variant="ghost" onClick={() => copy([...(p.responsiveSearchAd?.headlines || []), ...(p.responsiveSearchAd?.descriptions || [])].join("\n"), "Ad copy")}>
                    <Copy className="w-3 h-3 mr-1" /> Copy all
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Headlines ({p.responsiveSearchAd?.headlines?.length})</div>
                  <ul className="space-y-1 text-sm">
                    {p.responsiveSearchAd?.headlines?.map((h: string, i: number) => (
                      <li key={i} className="flex justify-between gap-2"><span>{h}</span><span className="text-gray-300 text-xs">{h.length}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Descriptions ({p.responsiveSearchAd?.descriptions?.length})</div>
                  <ul className="space-y-1 text-sm">
                    {p.responsiveSearchAd?.descriptions?.map((d: string, i: number) => (
                      <li key={i} className="flex justify-between gap-2"><span>{d}</span><span className="text-gray-300 text-xs">{d.length}</span></li>
                    ))}
                  </ul>
                  <div className="text-xs text-gray-400 mt-2">Display path: /{p.responsiveSearchAd?.path1}/{p.responsiveSearchAd?.path2}</div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-5">
              <Card>
                <CardHeader><CardTitle className="text-sm">Negative keywords</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {p.negativeKeywords?.map((n: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">−{n}</Badge>)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Extensions</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Sitelinks</div>
                    {p.sitelinks?.map((s: any, i: number) => <div key={i}>{s.text} <span className="text-gray-400 text-xs">{s.url}</span></div>)}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1 mt-2">Callouts</div>
                    <div className="flex flex-wrap gap-1">{p.callouts?.map((co: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{co}</Badge>)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Matched landing page copy */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Matched landing-page copy</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="text-lg font-bold">{p.landingCopy?.heroHeadline}</div>
                <div className="text-gray-600">{p.landingCopy?.subheadline}</div>
                <ul className="list-disc ml-5 mt-2">{p.landingCopy?.bullets?.map((b: string, i: number) => <li key={i}>{b}</li>)}</ul>
                <div className="mt-2"><Badge className="bg-emerald-600">{p.landingCopy?.cta}</Badge></div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  // ── List + generate view ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Megaphone className="w-6 h-6 text-indigo-600" /> Google Ads Co-pilot</h2>
        <p className="text-sm text-gray-500">Describe what to advertise — AI drafts a full campaign with UTM tags that report back into Growth.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">New campaign</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <Input placeholder="What to advertise (e.g. IELTS preparation course)" value={product} onChange={e => setProduct(e.target.value)} />
            <Input placeholder="Goal (e.g. book free consultations)" value={goal} onChange={e => setGoal(e.target.value)} />
            <select value={landingPath} onChange={e => setLandingPath(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {LANDING_PAGES.map(l => <option key={l.path} value={l.path}>{l.label} ({l.path})</option>)}
            </select>
            <Input placeholder="Daily budget Rp (optional)" inputMode="numeric" value={budget} onChange={e => setBudget(e.target.value)} />
          </div>
          <Button
            onClick={() => { if (!product) { toast.error("Tell me what to advertise"); return; } generate.mutate({ product, goal: goal || undefined, landingPath, dailyBudget: budget ? parseFloat(budget) : undefined }); }}
            disabled={generate.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {generate.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating campaign…</> : <><Plus className="w-4 h-4 mr-1" /> Generate campaign</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Saved campaigns</CardTitle></CardHeader>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : !list.data?.length ? (
            <div className="p-10 text-center text-gray-500">No campaigns yet. Generate your first above.</div>
          ) : (
            <div className="divide-y">
              {list.data.map((c: Campaign) => (
                <div key={c.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <button className="text-left" onClick={() => setOpenId(c.id)}>
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.product} · {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={c.status === "exported" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{c.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(c.id)}>Open</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
