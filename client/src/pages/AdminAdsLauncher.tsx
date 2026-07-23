import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// Suggested negatives per product — click a chip, they're added instantly.
const NEGATIVE_PRESETS: Record<string, string[]> = {
  general:      ["gratis", "free", "download", "pdf", "kunci jawaban", "materi", "youtube", "video", "job", "lowongan", "kerja"],
  ielts:        ["gratis", "free", "cara belajar", "materi", "download", "pdf", "tips", "soal", "contoh", "kunci jawaban", "video", "youtube", "harga", "job", "lowongan"],
  studyabroad:  ["gratis", "job", "lowongan", "kerja", "part time", "visa kerja", "cara membuat", "cara mengurus"],
};

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
        <AgentActivityCard />
        <LiveCampaignsCard />
        <LauncherCard />
        <LaunchedList />
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// AI Ads Agent activity — daily audit results + pending suggestions
// ────────────────────────────────────────────────────────────────────────────

function AgentActivityCard() {
  const utils = trpc.useUtils();
  const pending = trpc.marketing.adsMonitorLog.useQuery({ limit: 50, onlyPending: true }, {
    refetchOnWindowFocus: false, staleTime: 60 * 1000,
  });
  const recent = trpc.marketing.adsMonitorLog.useQuery({ limit: 20, onlyPending: false }, {
    refetchOnWindowFocus: false, staleTime: 60 * 1000,
  });
  const [showHistory, setShowHistory] = useState(false);

  const audit = trpc.marketing.runAdsAudit.useMutation({
    onSuccess: (r: any) => {
      const auto = r.autoPaused + r.autoNegativesAdded;
      alert(`✅ Audit complete.\n\n${r.campaignsAudited} campaigns checked.\n${auto} action${auto === 1 ? "" : "s"} taken automatically.\n${r.suggestions.length} suggestion${r.suggestions.length === 1 ? "" : "s"} queued for review.`);
      pending.refetch();
      recent.refetch();
      utils.marketing.liveGoogleAdsCampaigns.invalidate();
    },
    onError: (e) => alert(`❌ ${e.message}`),
  });

  const ack = trpc.marketing.acknowledgeAdsAction.useMutation({
    onSuccess: () => { pending.refetch(); recent.refetch(); },
    onError: (e) => alert(`❌ ${e.message}`),
  });

  const auto = (recent.data || []).filter((l: any) => l.executedAutomatically).length;
  const suggestionCount = pending.data?.length || 0;

  return (
    <section className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            🤖 AI Ads Agent
            <span className="text-xs font-normal text-slate-500">daily audit + autonomous actions</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Watches every enabled campaign every day. Auto-pauses waste, auto-adds standard negatives (when enabled),
            queues risky calls for you to review. Undo anything in the campaign editor below.
          </p>
        </div>
        <button
          onClick={() => audit.mutate()}
          disabled={audit.isPending}
          className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {audit.isPending ? "Auditing…" : "Run audit now"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded border border-slate-200 p-3">
          <div className="text-2xl font-bold text-amber-600">{suggestionCount}</div>
          <div className="text-xs text-slate-500 mt-1">Suggestions pending your review</div>
        </div>
        <div className="bg-white rounded border border-slate-200 p-3">
          <div className="text-2xl font-bold text-emerald-600">{auto}</div>
          <div className="text-xs text-slate-500 mt-1">Auto-actions in last 20 events</div>
        </div>
        <div className="bg-white rounded border border-slate-200 p-3">
          <div className="text-2xl font-bold text-slate-700">
            {pending.isLoading ? "…" : (recent.data?.[0] ? new Date(recent.data[0].createdAt as any).toLocaleDateString() : "—")}
          </div>
          <div className="text-xs text-slate-500 mt-1">Last audit run</div>
        </div>
      </div>

      {pending.isLoading && <div className="text-sm text-slate-400">Loading agent activity…</div>}

      {pending.data && pending.data.length > 0 && (
        <div className="bg-white rounded border border-amber-200 p-4">
          <h3 className="font-semibold text-sm text-slate-900 mb-3">📋 Pending suggestions ({pending.data.length})</h3>
          <div className="space-y-3">
            {pending.data.map((s: any) => (
              <div key={s.id} className="border border-slate-200 rounded p-3 bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-mono text-indigo-700 uppercase mb-1">
                      {s.action.replace(/^suggest_/, "").replace(/_/g, " ")}
                    </div>
                    <div className="font-medium text-sm">{s.campaignName}</div>
                    {s.target && (
                      <div className="text-xs text-slate-500 mt-1 font-mono">→ {s.target}</div>
                    )}
                    <div className="text-xs text-slate-600 mt-2">{s.reason}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Flagged {new Date(s.createdAt).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <button
                    onClick={() => ack.mutate({ id: s.id })}
                    disabled={ack.isPending}
                    className="text-xs px-3 py-1 rounded border border-slate-300 hover:bg-slate-100 whitespace-nowrap"
                  >
                    Reviewed ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            💡 To act on a suggestion: scroll down to <strong>What's currently running</strong>, click the matching campaign row to open its editor, then apply the change (URL / pause / budget / negative). Mark "Reviewed" here once done or if you disagree with the suggestion.
          </div>
        </div>
      )}

      {pending.data && pending.data.length === 0 && !pending.isLoading && (
        <div className="bg-white rounded border border-emerald-200 p-4 text-sm text-emerald-800">
          🎉 No pending suggestions. Every campaign looks healthy at last audit.
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          {showHistory ? "▾ Hide" : "▸ Show"} recent history ({recent.data?.length || 0})
        </button>
        {showHistory && recent.data && recent.data.length > 0 && (
          <div className="mt-2 space-y-1 max-h-80 overflow-y-auto">
            {recent.data.map((r: any) => (
              <div key={r.id} className="text-xs bg-white rounded border border-slate-200 p-2 flex items-start gap-2">
                <span className={`px-1.5 py-0.5 rounded font-semibold shrink-0 ${r.executedAutomatically ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {r.executedAutomatically ? "AUTO" : "SUGGESTED"}
                </span>
                <div className="flex-1">
                  <span className="font-mono text-indigo-700">{r.action.replace(/^suggest_/, "").replace(/_/g, " ")}</span>
                  <span className="text-slate-500 mx-1">·</span>
                  <span className="text-slate-700">{r.campaignName}</span>
                  {r.target && <span className="text-slate-400 font-mono ml-2">{r.target}</span>}
                  <div className="text-slate-400">{new Date(r.createdAt).toLocaleString("id-ID")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-500 border-t border-indigo-200 pt-3">
        <strong>Automatic actions off by default.</strong> To let the agent auto-pause waste keywords and auto-add negatives without asking, set Railway env var <code>ADS_MONITOR_AUTO_APPLY=true</code>. Recommended after 2-3 weeks of watching the suggestions to build trust.
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Live campaigns — "what's actually in the Google Ads account right now"
// ────────────────────────────────────────────────────────────────────────────

function LiveCampaignsCard() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const q = trpc.marketing.liveGoogleAdsCampaigns.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 min — Google Ads API isn't cheap to hit
  });

  if (q.isLoading) {
    return (
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="text-sm text-slate-400">Loading current Google Ads campaigns…</div>
      </section>
    );
  }
  if (q.error) {
    return (
      <section className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        Can't reach Google Ads API: {q.error.message}
      </section>
    );
  }
  if (!q.data?.configured) {
    return (
      <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
        Google Ads API isn't configured. Set the <code>GOOGLE_ADS_*</code> env vars on Railway to see live campaigns here.
      </section>
    );
  }

  const campaigns = q.data.campaigns;
  const enabled = campaigns.filter(c => c.status === "ENABLED");
  const paused = campaigns.filter(c => c.status === "PAUSED");
  const enabledCount = enabled.length;
  const pausedCount = paused.length;

  const enabledWhatsApp = enabled.filter(c => c.goesToWhatsApp).length;
  const enabledWebsite = enabled.filter(c => !c.goesToWhatsApp).length;

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-900">What's currently running in Google Ads</h2>
          <p className="text-sm text-slate-500">
            Live snapshot from the Google Ads API — where each campaign sends clicks and how it's performing.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{enabledCount}</div>
            <div className="text-xs text-slate-500">enabled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{pausedCount}</div>
            <div className="text-xs text-slate-500">paused</div>
          </div>
        </div>
      </div>

      {enabledCount > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded border border-emerald-200 bg-emerald-50">
            <div className="text-xs text-emerald-800 uppercase tracking-wide">CTAs go to WhatsApp</div>
            <div className="text-2xl font-bold text-emerald-900">{enabledWhatsApp} <span className="text-sm font-normal">/ {enabledCount} enabled</span></div>
          </div>
          <div className="p-3 rounded border border-blue-200 bg-blue-50">
            <div className="text-xs text-blue-800 uppercase tracking-wide">CTAs go to website</div>
            <div className="text-2xl font-bold text-blue-900">{enabledWebsite} <span className="text-sm font-normal">/ {enabledCount} enabled</span></div>
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center">
          No campaigns in the Google Ads account.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Campaign</th>
                <th className="py-2 pr-2">Destination</th>
                <th className="py-2 pr-2 text-right">Budget/day</th>
                <th className="py-2 pr-2 text-right">Clicks 30d</th>
                <th className="py-2 pr-2 text-right">Cost 30d</th>
                <th className="py-2 pr-2 text-right">Conv 30d</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <React.Fragment key={c.campaignId}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(expandedId === c.campaignId ? null : c.campaignId)}>
                    <td className="py-2 pr-2">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="font-medium flex items-center gap-2">
                        <span>{expandedId === c.campaignId ? "▾" : "▸"}</span>
                        {c.campaignName}
                      </div>
                      <div className="text-xs text-slate-500 ml-4">{c.channelType.replace(/_/g, " ").toLowerCase()} · {c.adGroupCount} ad group{c.adGroupCount === 1 ? "" : "s"}</div>
                    </td>
                    <td className="py-2 pr-2">
                      {c.destinations.length === 0 ? (
                        <span className="text-xs text-slate-400">no ads yet</span>
                      ) : (
                        <div className="space-y-1">
                          {c.goesToWhatsApp && (
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold mr-1">→ WhatsApp</span>
                          )}
                          {!c.goesToWhatsApp && (
                            <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-semibold mr-1">→ Website</span>
                          )}
                          {c.destinations.slice(0, 3).map((u: string, i: number) => (
                            <div key={i} className="text-xs text-slate-500 font-mono break-all">{u}</div>
                          ))}
                          {c.destinations.length > 3 && (
                            <div className="text-xs text-slate-400">+ {c.destinations.length - 3} more</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right text-xs">Rp {c.dailyBudgetIdr.toLocaleString("id-ID")}</td>
                    <td className="py-2 pr-2 text-right text-xs">{c.metricsLast30d.clicks.toLocaleString("id-ID")}</td>
                    <td className="py-2 pr-2 text-right text-xs">Rp {c.metricsLast30d.costIdr.toLocaleString("id-ID")}</td>
                    <td className="py-2 pr-2 text-right text-xs">{c.metricsLast30d.conversions.toFixed(1)}</td>
                  </tr>
                  {expandedId === c.campaignId && (
                    <tr className="border-b border-slate-100">
                      <td colSpan={7} className="p-4 bg-slate-50">
                        <CampaignEditor
                          campaignId={c.campaignId}
                          campaignName={c.campaignName}
                          currentStatus={c.status}
                          currentBudgetIdr={c.dailyBudgetIdr}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-500">
        Data cached 5 min · pulled directly from Google Ads API · click{" "}
        <a href="https://ads.google.com/aw/campaigns" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          Manage in Google Ads
        </a>{" "}to change status / budget.
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === "ENABLED") return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">🟢 ENABLED</span>;
  if (s === "PAUSED")  return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-semibold">⏸ PAUSED</span>;
  return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">{s}</span>;
}

// ────────────────────────────────────────────────────────────────────────────
// CampaignEditor — the expanded row: change URL, pause keywords, add negatives
// ────────────────────────────────────────────────────────────────────────────

function CampaignEditor({
  campaignId,
  campaignName,
  currentStatus,
  currentBudgetIdr,
}: {
  campaignId: string;
  campaignName: string;
  currentStatus: string;
  currentBudgetIdr: number;
}) {
  const utils = trpc.useUtils();
  const detail = trpc.marketing.campaignDetail.useQuery({ campaignId }, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const [newUrl, setNewUrl] = useState("");
  const [newBudget, setNewBudget] = useState<number | "">("");
  const [newNegatives, setNewNegatives] = useState("");

  const refreshAll = () => {
    detail.refetch();
    utils.marketing.liveGoogleAdsCampaigns.invalidate();
  };

  const updateUrl = trpc.marketing.updateAdFinalUrls.useMutation({
    onSuccess: (d) => { alert(`✅ Updated ${d.updated} ad(s). Give Google Ads ~5 min to reflect it.`); setNewUrl(""); refreshAll(); },
    onError: (e) => alert(`❌ ${e.message}`),
  });
  const pauseKw = trpc.marketing.pauseKeyword.useMutation({
    onSuccess: () => { refreshAll(); },
    onError: (e) => alert(`❌ ${e.message}`),
  });
  const enableKw = trpc.marketing.enableKeyword.useMutation({
    onSuccess: () => { refreshAll(); },
    onError: (e) => alert(`❌ ${e.message}`),
  });
  const addNegs = trpc.marketing.addNegativeKeywords.useMutation({
    onSuccess: (d) => {
      alert(`✅ Added ${d.added} negative(s)${d.skipped.length ? ` (${d.skipped.length} skipped as duplicates)` : ""}.`);
      setNewNegatives("");
      refreshAll();
    },
    onError: (e) => alert(`❌ ${e.message}`),
  });
  const setStatus = trpc.marketing.setCampaignStatus.useMutation({
    onSuccess: () => { refreshAll(); },
    onError: (e) => alert(`❌ ${e.message}`),
  });
  const setBudget = trpc.marketing.updateCampaignBudget.useMutation({
    onSuccess: () => { alert("✅ Budget updated."); setNewBudget(""); refreshAll(); },
    onError: (e) => alert(`❌ ${e.message}`),
  });

  if (detail.isLoading) return <div className="text-sm text-slate-400">Loading campaign details…</div>;
  if (detail.error) return <div className="text-sm text-red-600">Can't load: {detail.error.message}</div>;
  if (!detail.data) return <div className="text-sm text-slate-400">No detail available.</div>;

  const { ads, keywords, negatives } = detail.data;
  const activeKeywords = keywords.filter((k: any) => !k.isNegative);
  // Detect the most-common current URL to preselect the field.
  const currentUrls = Array.from(new Set(ads.flatMap((a: any) => a.finalUrls)));

  // Presets — guess based on campaign name.
  const presetKey =
    /ielts/i.test(campaignName)         ? "ielts" :
    /studi|study|abroad|destination/i.test(campaignName) ? "studyabroad" :
    "general";
  const presetNegs = NEGATIVE_PRESETS[presetKey] || NEGATIVE_PRESETS.general;
  const alreadyNegative = new Set(negatives.map(n => n.toLowerCase()));
  const availablePresets = presetNegs.filter(n => !alreadyNegative.has(n.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* ── Row 1: Landing URL + Campaign controls ────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded border border-slate-200 p-4">
          <h3 className="font-semibold text-sm mb-2">🎯 Landing URL (Final URL)</h3>
          <p className="text-xs text-slate-500 mb-3">
            Where clicks go. All ads in this campaign share this. Change here → applies to every ad.
          </p>
          <div className="mb-2">
            <div className="text-xs text-slate-600 mb-1">Current:</div>
            {currentUrls.length === 0 ? (
              <div className="text-xs text-slate-400 italic">no ads yet</div>
            ) : (
              currentUrls.map((u: unknown, i: number) => (
                <div key={i} className="text-xs font-mono text-slate-700 break-all bg-slate-50 p-2 rounded mb-1">{String(u)}</div>
              ))
            )}
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-600 block">New URL (with https://)</label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://www.spectaeducation.com/ielts/mock-test"
                className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => {
                if (!newUrl || ads.length === 0) return;
                if (!window.confirm(`Update Final URL for all ${ads.length} ad(s) in "${campaignName}" to:\n\n${newUrl}\n\n?`)) return;
                updateUrl.mutate({
                  adResourceNames: ads.map((a: any) => a.resourceName),
                  newFinalUrl: newUrl,
                });
              }}
              disabled={!newUrl || updateUrl.isPending || ads.length === 0}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {updateUrl.isPending ? "Updating…" : `Update ${ads.length} ad${ads.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>

        <div className="bg-white rounded border border-slate-200 p-4">
          <h3 className="font-semibold text-sm mb-2">⚙️ Campaign controls</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-600 w-24">Status:</div>
              <StatusPill status={currentStatus} />
              <button
                onClick={() => {
                  const target = currentStatus === "ENABLED" ? "PAUSED" : "ENABLED";
                  if (!window.confirm(`${target === "ENABLED" ? "Enable" : "Pause"} "${campaignName}"?`)) return;
                  setStatus.mutate({ campaignId, status: target as any });
                }}
                disabled={setStatus.isPending}
                className="text-xs px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
              >
                {currentStatus === "ENABLED" ? "Pause" : "Enable"}
              </button>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-600 block">Daily budget (IDR) — current: Rp {currentBudgetIdr.toLocaleString("id-ID")}</label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder={String(currentBudgetIdr)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={() => {
                  if (!newBudget || newBudget <= 0) return;
                  if (!window.confirm(`Change daily budget to Rp ${Number(newBudget).toLocaleString("id-ID")}?`)) return;
                  setBudget.mutate({ campaignId, newDailyBudgetIdr: Number(newBudget) });
                }}
                disabled={!newBudget || setBudget.isPending}
                className="px-4 py-2 rounded bg-slate-800 text-white text-sm font-semibold disabled:opacity-50"
              >
                {setBudget.isPending ? "…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Keywords table ─────────────────────────────────────── */}
      <div className="bg-white rounded border border-slate-200 p-4">
        <h3 className="font-semibold text-sm mb-2">🔑 Keywords (last 30 days) — click Pause to stop wasteful ones</h3>
        {activeKeywords.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center">No keywords found.</div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-2">Keyword</th>
                  <th className="py-2 pr-2">Match</th>
                  <th className="py-2 pr-2 text-right">Cost 30d</th>
                  <th className="py-2 pr-2 text-right">Clicks</th>
                  <th className="py-2 pr-2 text-right">CTR</th>
                  <th className="py-2 pr-2 text-right">Conv</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {activeKeywords.map((k: any) => {
                  const isWaste = k.cost30dIdr > 5000 && k.conversions30d === 0 && k.clicks30d >= 3;
                  return (
                    <tr key={k.criterionResourceName} className={`border-b border-slate-100 ${isWaste ? "bg-red-50" : ""}`}>
                      <td className="py-2 pr-2 font-mono text-xs">{k.text}</td>
                      <td className="py-2 pr-2 text-xs text-slate-500">{k.matchType.toLowerCase()}</td>
                      <td className="py-2 pr-2 text-right text-xs">Rp {k.cost30dIdr.toLocaleString("id-ID")}</td>
                      <td className="py-2 pr-2 text-right text-xs">{k.clicks30d}</td>
                      <td className="py-2 pr-2 text-right text-xs">{k.ctr30d.toFixed(2)}%</td>
                      <td className="py-2 pr-2 text-right text-xs">{k.conversions30d.toFixed(1)}</td>
                      <td className="py-2 pr-2"><StatusPill status={k.status} /></td>
                      <td className="py-2 pr-2 text-right">
                        {k.status === "ENABLED" ? (
                          <button
                            onClick={() => pauseKw.mutate({ criterionResourceName: k.criterionResourceName })}
                            disabled={pauseKw.isPending}
                            className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => enableKw.mutate({ criterionResourceName: k.criterionResourceName })}
                            disabled={enableKw.isPending}
                            className="text-xs px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            Enable
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2 text-xs text-slate-500">
          🔴 Red rows = spent &gt;Rp 5k with 0 conversions over 3+ clicks — likely waste. Consider pausing.
        </div>
      </div>

      {/* ── Row 3: Negative keywords ──────────────────────────────────── */}
      <div className="bg-white rounded border border-slate-200 p-4">
        <h3 className="font-semibold text-sm mb-2">🚫 Negative keywords (block junk clicks)</h3>

        {availablePresets.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-slate-600 mb-2">
              Quick-add commonly-recommended negatives for this campaign type:
            </div>
            <div className="flex flex-wrap gap-2">
              {availablePresets.map(n => (
                <button
                  key={n}
                  onClick={() => addNegs.mutate({ campaignId, keywords: [n], matchType: "BROAD" })}
                  disabled={addNegs.isPending}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300"
                >
                  + {n}
                </button>
              ))}
              <button
                onClick={() => {
                  if (!window.confirm(`Add ALL ${availablePresets.length} recommended negatives at once?`)) return;
                  addNegs.mutate({ campaignId, keywords: availablePresets, matchType: "BROAD" });
                }}
                disabled={addNegs.isPending}
                className="text-xs px-3 py-1 rounded bg-slate-800 text-white font-semibold hover:bg-slate-900"
              >
                + Add all {availablePresets.length}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 items-end mb-3">
          <div className="flex-1">
            <label className="text-xs text-slate-600 block">Custom negatives (comma or newline separated)</label>
            <textarea
              value={newNegatives}
              onChange={(e) => setNewNegatives(e.target.value)}
              placeholder="tips, review, jurusan lain"
              rows={2}
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            onClick={() => {
              const list = newNegatives.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
              if (!list.length) return;
              addNegs.mutate({ campaignId, keywords: list, matchType: "BROAD" });
            }}
            disabled={!newNegatives.trim() || addNegs.isPending}
            className="px-4 py-2 rounded bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {addNegs.isPending ? "Adding…" : "Add"}
          </button>
        </div>

        {negatives.length > 0 && (
          <div>
            <div className="text-xs text-slate-600 mb-2">Currently blocking ({negatives.length}):</div>
            <div className="flex flex-wrap gap-1">
              {negatives.map((n: string, i: number) => (
                <span key={i} className="inline-block px-2 py-0.5 rounded bg-red-50 text-red-700 text-[11px] font-mono border border-red-200">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
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
