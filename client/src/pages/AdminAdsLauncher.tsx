import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * /admin/ads-launcher — 1-click Google Ads campaign creation.
 *
 * Owner picks a product from the catalog, optionally overrides the daily
 * budget, and clicks Launch. Behind the scenes:
 *   1. LLM writes a full campaign (headlines, keywords, negatives, sitelinks)
 *   2. Draft saved to ad_campaigns
 *   3. Campaign pushed to Google Ads via API — always PAUSED
 *
 * Nothing spends until the owner clicks Enable in Google Ads. This page just
 * removes the friction of the LLM/CSV/upload dance. From here to running a new
 * campaign should be < 30 seconds.
 */
export default function AdminAdsLauncher() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Google Ads — 1-click launcher</h1>
            <p className="text-sm text-slate-500">
              Pick a product → AI writes a full campaign → pushed to Google Ads as PAUSED.
              Nothing spends until you review + enable it.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="text-slate-600 hover:text-slate-900">← /admin</Link>
            <a
              href="https://ads.google.com/aw/campaigns"
              target="_blank" rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Open Google Ads →
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <LauncherCard />
        <LaunchedList />
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Launcher — the main action card
// ────────────────────────────────────────────────────────────────────────────

function LauncherCard() {
  const catalog = trpc.marketing.productCatalog.useQuery(undefined, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [customBudget, setCustomBudget] = useState<number | "">("");
  const [result, setResult] = useState<any>(null);

  const selected = catalog.data?.find(p => p.key === selectedKey) || null;
  const dailyBudget = customBudget || selected?.suggestedDailyBudgetIdr || 0;

  const launch = trpc.marketing.launchProductCampaign.useMutation({
    onSuccess: (d) => {
      setResult({ ok: true, ...d });
      utils.marketing.launchedCampaigns.invalidate();
    },
    onError: (e) => setResult({ ok: false, error: e.message }),
  });

  const onLaunch = () => {
    if (!selected) return;
    const confirmed = window.confirm(
      `Launch a Google Ads campaign for "${selected.label}" at Rp ${dailyBudget.toLocaleString("id-ID")}/day?\n\n` +
      `The AI will write ~15 headlines, ~50 keywords, and 20 negative keywords. ` +
      `The campaign will be created PAUSED — no spend until you enable it in Google Ads.`
    );
    if (!confirmed) return;
    launch.mutate({ productKey: selected.key, dailyBudgetIdr: Number(dailyBudget) });
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6">
      <h2 className="font-semibold text-slate-900 mb-4">1. Pick a product to advertise</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {catalog.isLoading && <div className="text-sm text-slate-400 col-span-full">Loading products…</div>}
        {catalog.data?.map(p => {
          const isSel = p.key === selectedKey;
          return (
            <button
              key={p.key}
              onClick={() => { setSelectedKey(p.key); setCustomBudget(""); setResult(null); }}
              className={`text-left p-4 rounded-lg border-2 transition ${
                isSel
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-900">{p.label}</div>
                {isSel && <span className="text-blue-600">✓</span>}
              </div>
              <div className="text-xs text-slate-500 mt-1">{p.description}</div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{p.priceLabel}</span>
                <span className="text-slate-400 font-mono">{p.landingPath}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          <h2 className="font-semibold text-slate-900 mt-8 mb-4">2. Daily budget</h2>

          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="text-xs text-slate-600 block">Daily budget (IDR)</label>
              <input
                type="number"
                value={customBudget}
                onChange={(e) => setCustomBudget(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={String(selected.suggestedDailyBudgetIdr)}
                className="mt-1 w-48 border border-slate-300 rounded px-3 py-2 text-sm"
              />
              <div className="text-xs text-slate-500 mt-1">
                Suggested: Rp {selected.suggestedDailyBudgetIdr.toLocaleString("id-ID")}
              </div>
            </div>
            <div className="text-sm text-slate-500">
              Effective: <span className="font-semibold text-slate-900">Rp {Number(dailyBudget).toLocaleString("id-ID")}/day</span>
              {" · "}
              <span>~ Rp {Math.round(Number(dailyBudget) * 30).toLocaleString("id-ID")}/month if left running</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onLaunch}
              disabled={launch.isPending}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {launch.isPending ? "AI is writing the campaign…" : "🚀 Launch to Google Ads (paused)"}
            </button>
            {launch.isPending && (
              <span className="text-xs text-slate-500">
                This takes 15-45 seconds — AI is drafting headlines + keywords.
              </span>
            )}
          </div>
        </>
      )}

      {result && (
        <div className={`mt-6 p-4 rounded-lg border ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          {result.ok ? (
            <>
              <div className="font-semibold text-emerald-900">✅ Campaign launched!</div>
              <div className="mt-2 text-sm text-emerald-900 space-y-1">
                <div><strong>{result.name}</strong></div>
                <div>
                  {result.adGroupCount} ad group{result.adGroupCount === 1 ? "" : "s"} ·{" "}
                  {result.keywordCount} keywords ·{" "}
                  {result.negativeCount} negatives ·{" "}
                  {result.headlineCount} headlines
                </div>
                <div>Budget: Rp {result.dailyBudgetIdr.toLocaleString("id-ID")}/day (PAUSED)</div>
                <div className="text-xs font-mono text-emerald-800 break-all mt-2">
                  {result.googleAdsResourceName}
                </div>
              </div>
              <div className="mt-3 flex gap-3 flex-wrap">
                <a
                  href="https://ads.google.com/aw/campaigns"
                  target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                >
                  Review + enable in Google Ads →
                </a>
                <button
                  onClick={() => { setResult(null); setSelectedKey(null); setCustomBudget(""); }}
                  className="px-3 py-1.5 rounded border border-emerald-300 text-emerald-900 text-sm hover:bg-emerald-100"
                >
                  Launch another
                </button>
              </div>
              <div className="mt-3 text-xs text-emerald-800 border-t border-emerald-200 pt-2">
                <strong>Next step in Google Ads:</strong> open the campaign, check the ads read well,
                then flip Status from PAUSED → ENABLED. Budget starts spending immediately after that.
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-red-900">❌ Launch failed</div>
              <div className="mt-2 text-sm text-red-900 break-words">{result.error}</div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// List of previously launched campaigns
// ────────────────────────────────────────────────────────────────────────────

function LaunchedList() {
  const q = trpc.marketing.launchedCampaigns.useQuery(undefined, { refetchOnWindowFocus: false });

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900">Previously launched campaigns</h2>
        <a
          href="https://ads.google.com/aw/campaigns"
          target="_blank" rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Manage in Google Ads →
        </a>
      </div>

      {q.isLoading && <div className="text-sm text-slate-400">Loading…</div>}
      {q.data && q.data.length === 0 && (
        <div className="text-sm text-slate-500 py-6 text-center">
          Nothing yet — pick a product above and click Launch.
        </div>
      )}
      {q.data && q.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-2">Launched</th>
                <th className="py-2 pr-2">Campaign</th>
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Daily budget</th>
                <th className="py-2 pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((c: any) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 pr-2 font-medium">{c.name}</td>
                  <td className="py-2 pr-2 text-xs font-mono">{c.product}</td>
                  <td className="py-2 pr-2">Rp {Number(c.dailyBudget || 0).toLocaleString("id-ID")}</td>
                  <td className="py-2 pr-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      c.status === "live"
                        ? "bg-emerald-100 text-emerald-800"
                        : c.status === "draft"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {c.status === "live" ? "in Google Ads" : c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
