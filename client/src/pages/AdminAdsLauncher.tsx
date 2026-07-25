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
        <ConversionActionsAudit />
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
      {/* ── Row 0: AI Health Diagnosis ────────────────────────────────── */}
      <HealthDiagnosisCard campaignId={campaignId} />

      {/* ── Row 0.5: Expand Campaign Structure (add ad groups) ────────── */}
      <ExpandStructureCard
        campaignId={campaignId}
        campaignName={campaignName}
        currentUrls={currentUrls as string[]}
        onRefresh={refreshAll}
      />

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
// Health Diagnosis — why isn't this campaign getting impressions?
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Conversion Actions Audit — every action + its label + status + fire count
// ────────────────────────────────────────────────────────────────────────────

/**
 * The 5 labels our client code fires to today. Kept in sync with
 * client/src/lib/googleAds.ts so the audit can flag mismatches (e.g. "your
 * code fires to label X, but that action is INACTIVE — you probably meant
 * the (1) duplicate which is ACTIVE").
 */
const CLIENT_FIRE_LABELS: Record<string, string> = {
  mockTest: "6BE9CJav_tMcEIiLhcgD",
  tutor: "rM1JCOjU_tMcEIiLhcgD",
  igcse: "yINBCJq6-9McEIiLhcgD",
  aptitudePro: "mZcWCJ6krtUcEIiLhcgD",
  whatsapp: "UGXtCIKG-tMcEIiLhcgD",
};

function ConversionActionsAudit() {
  const q = trpc.marketing.listConversionActions.useQuery(undefined, {
    refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000,
  });

  if (q.isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded p-4 text-sm text-slate-500">
        Loading conversion actions from Google Ads…
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
        Can't load conversion actions: {q.error.message}
      </div>
    );
  }
  const actions = q.data || [];
  if (!actions.length) {
    return (
      <div className="bg-white border border-slate-200 rounded p-4 text-sm text-slate-500">
        No conversion actions found in this Google Ads account.
      </div>
    );
  }

  // Which labels does our client code point at? Reverse-lookup to detect
  // "code fires here → but this action is orphaned/duplicate".
  const clientLabels = new Set(Object.values(CLIENT_FIRE_LABELS));
  const kindByLabel = new Map(Object.entries(CLIENT_FIRE_LABELS).map(([k, v]) => [v, k]));

  return (
    <div className="bg-white border border-slate-200 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">🎯 Conversion Actions Audit</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Every action in the account + its label + whether your site code fires to it. Flags duplicates and orphans.
          </p>
        </div>
        <button onClick={() => q.refetch()} className="text-xs text-indigo-600 hover:underline">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Category</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2">Label</th>
              <th className="py-2 pr-2">Code fires here?</th>
              <th className="py-2 pr-2 text-right">30d convs</th>
            </tr>
          </thead>
          <tbody>
            {actions.map(a => {
              const codeFiresHere = a.eventLabel && clientLabels.has(a.eventLabel);
              const kind = a.eventLabel ? kindByLabel.get(a.eventLabel) : null;
              const isDuplicate = / \(\d+\)$/.test(a.name);
              const isEnabled = a.status === "ENABLED";
              return (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-medium text-slate-900">
                    {a.name}
                    {isDuplicate && (
                      <span className="ml-1 text-[10px] text-amber-600" title="Name ends in (n) — likely an auto-created duplicate">⚠️ dup</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-slate-600">{a.category.replace(/_/g, " ").toLowerCase()}</td>
                  <td className="py-2 pr-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {a.status}
                    </span>
                    {!a.includeInConversionsMetric && (
                      <span className="ml-1 text-[10px] text-slate-500" title="Not counted in 'Conversions' metric — Smart Bidding ignores it">excluded</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 font-mono text-slate-600 whitespace-nowrap">
                    {a.eventLabel || <span className="text-slate-400 italic">no label</span>}
                  </td>
                  <td className="py-2 pr-2">
                    {codeFiresHere ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        ✅ {kind}{!isEnabled && " (⚠️ but action is orphaned)"}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-slate-700">{a.conversions30d.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Diagnoses */}
      <div className="mt-4 space-y-2">
        {(() => {
          const diags: Array<{ kind: "warn" | "ok"; msg: string }> = [];
          // For each client label, find where it points.
          for (const [kind, label] of Object.entries(CLIENT_FIRE_LABELS)) {
            const target = actions.find(a => a.eventLabel === label);
            if (!target) {
              diags.push({ kind: "warn", msg: `Code kind "${kind}" fires to label ${label} — but no conversion action in the account has that label. Nothing is recording.` });
              continue;
            }
            if (target.status !== "ENABLED") {
              diags.push({ kind: "warn", msg: `Code kind "${kind}" fires to "${target.name}" — but that action is ${target.status}. Fire is not being counted.` });
              continue;
            }
            if (!target.includeInConversionsMetric) {
              diags.push({ kind: "warn", msg: `Code kind "${kind}" fires to "${target.name}" — it's enabled but NOT included in the "Conversions" metric. Smart Bidding ignores it. Fix: edit action → include in Conversions = Yes.` });
              continue;
            }
            diags.push({ kind: "ok", msg: `"${kind}" → "${target.name}" — healthy, ${target.conversions30d.toFixed(0)} convs in 30d.` });
          }
          // Duplicate detection.
          const nameCounts = new Map<string, number>();
          for (const a of actions) {
            const base = a.name.replace(/ \(\d+\)$/, "");
            nameCounts.set(base, (nameCounts.get(base) || 0) + 1);
          }
          nameCounts.forEach((count, base) => {
            if (count > 1) {
              diags.push({ kind: "warn", msg: `"${base}" has ${count} versions — clean up duplicates (keep the one your code fires to, delete the others).` });
            }
          });
          return diags.map((d, i) => (
            <div key={i} className={`text-xs px-3 py-2 rounded border ${d.kind === "warn" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
              {d.kind === "warn" ? "⚠️" : "✅"} {d.msg}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

function HealthDiagnosisCard({ campaignId }: { campaignId: string }) {
  const q = trpc.marketing.diagnoseCampaignHealth.useQuery(
    { campaignId },
    { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  );

  if (q.isLoading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded p-4 text-sm text-slate-500">
        🩺 Diagnosing campaign health…
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
        Health check failed: {q.error.message}
      </div>
    );
  }
  const d = q.data;
  if (!d) return null;

  const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
  const severityColor = (s: string) =>
    s === "critical" ? "bg-red-50 border-red-200 text-red-800"
    : s === "warning" ? "bg-amber-50 border-amber-200 text-amber-800"
    : "bg-emerald-50 border-emerald-200 text-emerald-800";
  const severityIcon = (s: string) =>
    s === "critical" ? "🚨" : s === "warning" ? "⚠️" : "✅";

  const activeKws = d.keywords.filter(k => k.impressions > 0).length;

  return (
    <div className="bg-white border border-slate-200 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">🩺 AI Health Diagnosis · last 7 days</h3>
        <button
          onClick={() => q.refetch()}
          className="text-xs text-indigo-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* Diagnoses */}
      <div className="space-y-2 mb-4">
        {d.diagnoses.map((diag, i) => (
          <div key={i} className={`border rounded p-3 text-xs ${severityColor(diag.severity)}`}>
            <div className="font-semibold">{severityIcon(diag.severity)} {diag.reason}</div>
            <div className="mt-1 opacity-90">{diag.detail}</div>
            <div className="mt-2 pt-2 border-t border-current border-opacity-20">
              <strong>Fix:</strong> {diag.suggestedFix}
            </div>
          </div>
        ))}
      </div>

      {/* Impression share panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center mb-3">
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase text-slate-500">Impression Share</div>
          <div className="font-bold text-slate-900">{pct(d.impressionShare.searchImpressionShare)}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase text-slate-500">Lost to Budget</div>
          <div className="font-bold text-slate-900">{pct(d.impressionShare.lostToBudget)}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase text-slate-500">Lost to Rank</div>
          <div className="font-bold text-slate-900">{pct(d.impressionShare.lostToRank)}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase text-slate-500">Top of Page</div>
          <div className="font-bold text-slate-900">{pct(d.impressionShare.topImpressionShare)}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase text-slate-500">Absolute Top</div>
          <div className="font-bold text-slate-900">{pct(d.impressionShare.absoluteTopImpressionShare)}</div>
        </div>
      </div>

      {/* Metrics + keyword liveness */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center mb-3">
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase text-slate-500">Impressions</div>
          <div className="font-bold text-slate-900">{d.metrics.impressions.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase text-slate-500">Clicks</div>
          <div className="font-bold text-slate-900">{d.metrics.clicks.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase text-slate-500">Spend</div>
          <div className="font-bold text-slate-900">Rp {d.metrics.costIdr.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase text-slate-500">Live keywords</div>
          <div className="font-bold text-slate-900">{activeKws} / {d.keywords.length}</div>
        </div>
      </div>

      {/* Search terms — what people actually typed */}
      {d.searchTerms.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
            Show top {d.searchTerms.length} search queries that triggered ads
          </summary>
          <div className="mt-2 bg-slate-50 border border-slate-200 rounded p-2 max-h-48 overflow-y-auto">
            {d.searchTerms.map((s, i) => (
              <div key={i} className="flex justify-between border-b border-slate-100 py-1 last:border-b-0">
                <span className="font-mono text-slate-700">{s.text}</span>
                <span className="text-slate-500 tabular-nums">{s.impressions} impr · {s.clicks} clicks</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Expand Structure — add new ad groups to an existing campaign
// ────────────────────────────────────────────────────────────────────────────

/**
 * Curated ad-group presets per product family. Each preset is a proven-good
 * theme with 4-8 Bahasa Indonesia keywords + a themed RSA. Owner picks which
 * to add; server pushes them via addAdGroupsToCampaign.
 */
type PresetAdGroup = {
  key: string;
  name: string;
  theme: string;               // one-line description
  keywords: Array<{ text: string; matchType: "phrase" | "exact" | "broad" }>;
  headlines: string[];         // themed to this ad group
  descriptions: string[];      // shared across an ad group
};

const AD_GROUP_PRESETS: Record<string, { landingPath: string; groups: PresetAdGroup[] }> = {
  "ielts-mock": {
    landingPath: "/ielts/mock-test",
    groups: [
      {
        key: "simulasi",
        name: "Simulasi IELTS",
        theme: "Users searching for full IELTS exam simulation",
        keywords: [
          { text: "simulasi ielts", matchType: "phrase" },
          { text: "simulasi test ielts", matchType: "phrase" },
          { text: "simulasi ielts online", matchType: "phrase" },
          { text: "tes simulasi ielts", matchType: "broad" },
          { text: "ielts simulasi", matchType: "phrase" },
          { text: "persiapan simulasi ielts", matchType: "broad" },
        ],
        // Copy avoids anything that could be flagged as "offering leaked
        // IELTS content." Focus on the DIAGNOSTIC / SELF-ASSESSMENT angle,
        // not on the "we give you the exam" angle. This is what got
        // Prediksi Skor IELTS approved when Simulasi + Latihan were flagged.
        headlines: [
          "Cek Kesiapan IELTS Kamu",
          "Tes Persiapan IELTS AI",
          "Prediksi Band IELTS",
          "Assessment 4 Skill",
          "Hasil dalam Menit",
          "AI Feedback per Skill",
          "PDF Report Personal",
          "Rp 79.000 Sekali Bayar",
          "SpecTa Since 2005",
          "10.000+ Siswa Percaya",
          "Kerjakan Kapan Aja",
          "Coba Sekarang",
        ],
        descriptions: [
          "Cek kesiapan kamu sebelum tes IELTS resmi. AI feedback 4 skill dalam hitungan menit.",
          "Rp 79.000 sekali bayar. PDF report personal dengan analisis per skill kamu.",
          "Dari SpecTa Education. Sudah dipercaya 10.000+ siswa Indonesia sejak 2005.",
          "Kerjakan di HP/laptop. Analisis kekuatan + kelemahan kamu sebelum tes resmi.",
        ],
      },
      {
        key: "prediksi",
        name: "Prediksi Skor IELTS",
        theme: "High-intent — users who want to check their band before real exam",
        keywords: [
          { text: "prediksi skor ielts", matchType: "phrase" },
          { text: "prediksi band ielts", matchType: "phrase" },
          { text: "tes prediksi ielts", matchType: "phrase" },
          { text: "cek skor ielts", matchType: "broad" },
          { text: "test skor ielts", matchType: "broad" },
          { text: "cek band ielts", matchType: "phrase" },
        ],
        headlines: [
          "Prediksi Skor IELTS Kamu",
          "Cek Band IELTS Sekarang",
          "Tes Prediksi IELTS AI",
          "Skor Prediksi Rp 79k",
          "Akurat Sesuai Rubrik",
          "AI Grading 4 Skill",
          "Report Dalam Menit",
          "Sebelum Tes Resmi",
          "PDF Report Lengkap",
          "SpecTa Since 2005",
          "10rb+ Siswa Terpercaya",
          "Kerjakan Kapan Aja",
        ],
        descriptions: [
          "Cek prediksi band IELTS kamu sebelum ambil tes resmi. AI grading akurat, Rp 79k.",
          "Full 4-skill mock test. Hasil + PDF report profesional dikirim ke email instan.",
          "Sesuai rubrik official IELTS band descriptors. Cocok untuk yang siap tes IELTS resmi.",
          "SpecTa Education — konsultan pendidikan sejak 2005, 10.000+ siswa terpercaya.",
        ],
      },
      {
        key: "latihan",
        name: "Latihan Soal IELTS", // keep original name so retry heals the existing empty group in Google Ads
        theme: "Practice-seeking users looking for structured IELTS drill",
        // Removed "soal" (questions/content) keywords — Google Ads scanner
        // reads that as "we sell leaked exam questions" which is PROHIBITED.
        // Focus on the PRACTICE / DRILL / SKILL-BUILDING angle instead.
        keywords: [
          { text: "latihan ielts", matchType: "phrase" },
          { text: "latihan ielts online", matchType: "phrase" },
          { text: "persiapan ielts online", matchType: "broad" },
          { text: "belajar ielts online", matchType: "broad" },
          { text: "kursus ielts online", matchType: "broad" },
          { text: "ielts test practice indonesia", matchType: "broad" },
        ],
        headlines: [
          "Latihan IELTS Terstruktur",
          "Persiapan IELTS AI",
          "Belajar IELTS Online",
          "AI Feedback per Skill",
          "Rp 79.000 Sekali Bayar",
          "4 Skill Lengkap",
          "PDF Report Personal",
          "Analisis Kekuatan Kamu",
          "SpecTa Since 2005",
          "10.000+ Siswa Percaya",
          "Kerjakan Kapan Aja",
          "Mulai Sekarang",
        ],
        descriptions: [
          "Persiapan IELTS terstruktur 4 skill. AI feedback per skill untuk asah kekuatan kamu.",
          "Rp 79.000 sekali bayar, tanpa subscription. Hasil + PDF report langsung ke email.",
          "Cocok untuk yang mau siap sebelum ambil IELTS resmi. Kerjakan di HP atau laptop.",
          "SpecTa Education — 10.000+ siswa terpercaya, sejak 2005.",
        ],
      },
    ],
  },
  "aptitude-pro": {
    landingPath: "/test/pro",
    groups: [
      {
        key: "tes-minat-bakat",
        name: "Tes Minat Bakat",
        theme: "Parents/students searching for interest & aptitude assessment",
        keywords: [
          { text: "tes minat bakat", matchType: "phrase" },
          { text: "tes minat bakat online", matchType: "phrase" },
          { text: "tes minat bakat gratis", matchType: "broad" },
          { text: "tes bakat online", matchType: "phrase" },
          { text: "cek minat bakat", matchType: "broad" },
        ],
        headlines: [
          "Tes Minat Bakat AI",
          "Rekomendasi Jurusan AI",
          "RIASEC + MI Analysis",
          "PDF Report 20+ Halaman",
          "Rp 79.000 Sekali Bayar",
          "45 Menit Selesai",
          "Analisis AI Mendalam",
          "5 Jurusan Rekomendasi",
          "SpecTa Since 2005",
          "Ringkasan Ortu Included",
          "Kerjakan Sekarang →",
          "Career Outlook 10 Thn",
        ],
        descriptions: [
          "Tes bakat AI lengkap: RIASEC + Multiple Intelligences + rekomendasi jurusan.",
          "Rp 79.000 sekali bayar. PDF report profesional 20+ halaman untuk kamu + orangtua.",
          "5 rekomendasi jurusan universitas yang cocok, plus career outlook 10 tahun.",
          "Dari SpecTa Education, konsultan pendidikan sejak 2005.",
        ],
      },
      {
        key: "pilih-jurusan",
        name: "Pilih Jurusan Kuliah",
        theme: "Students confused about which major to pick",
        keywords: [
          { text: "pilih jurusan kuliah", matchType: "phrase" },
          { text: "tes pilih jurusan", matchType: "phrase" },
          { text: "bingung pilih jurusan", matchType: "broad" },
          { text: "rekomendasi jurusan", matchType: "broad" },
          { text: "jurusan yang cocok", matchType: "broad" },
        ],
        headlines: [
          "Bingung Pilih Jurusan?",
          "Tes Bakat AI 45 Menit",
          "5 Rekomendasi Jurusan",
          "Analisis AI Mendalam",
          "Rp 79.000 Sekali Bayar",
          "PDF Report Lengkap",
          "Ringkasan Untuk Ortu",
          "Career Outlook 10 Thn",
          "SpecTa Since 2005",
          "10rb+ Siswa Terpercaya",
          "Coba Sekarang →",
          "Hasil Detail + Akurat",
        ],
        descriptions: [
          "Bingung pilih jurusan kuliah? Tes bakat AI kami analisa minat + bakat + kecerdasan kamu.",
          "5 rekomendasi jurusan + universitas terbaik yang cocok, plus career outlook 10 tahun.",
          "Rp 79.000 sekali bayar. PDF report komprehensif untuk kamu + orangtua.",
          "SpecTa Education, konsultan pendidikan terpercaya sejak 2005.",
        ],
      },
    ],
  },
};

function pickPresetKey(campaignName: string): string | null {
  const n = campaignName.toLowerCase();
  if (/ielts.*mock|mock.*ielts/.test(n)) return "ielts-mock";
  if (/bakat|aptitude|tes bakat/.test(n)) return "aptitude-pro";
  return null;
}

function ExpandStructureCard({
  campaignId,
  campaignName,
  currentUrls,
  onRefresh,
}: {
  campaignId: string;
  campaignName: string;
  currentUrls: string[];
  onRefresh: () => void;
}) {
  const presetKey = pickPresetKey(campaignName);
  const preset = presetKey ? AD_GROUP_PRESETS[presetKey] : null;
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [customFinalUrl, setCustomFinalUrl] = useState("");

  const detail = trpc.marketing.campaignDetail.useQuery({ campaignId }, { refetchOnWindowFocus: false, staleTime: 60 * 1000 });
  const existingAdGroups = new Set((detail.data as any)?.ads?.map((a: any) => a.adGroupName?.toLowerCase()) || []);

  const addMutation = trpc.marketing.addAdGroupsToCampaign.useMutation({
    onSuccess: (d: any) => {
      alert(`✅ Added ${d.created.length} ad group(s). ${d.errors.length ? `\n\n⚠️ ${d.errors.length} error(s):\n${d.errors.map((e: any) => `${e.name}: ${e.error}`).join("\n")}` : ""}\n\nGoogle Ads will index the new ads in ~5-10 min.`);
      setSelected({});
      onRefresh();
    },
    onError: (e) => alert(`❌ ${e.message}`),
  });

  if (!preset) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs text-slate-500">
        No proven ad-group preset for this campaign yet. Add one to <code>AD_GROUP_PRESETS</code> in <code>AdminAdsLauncher.tsx</code>.
      </div>
    );
  }

  // Auto-suggest final URL from existing ads, or use preset's landing path
  const defaultFinalUrl = currentUrls[0] || `https://www.spectaeducation.com${preset.landingPath}`;
  const finalUrl = customFinalUrl.trim() || defaultFinalUrl;

  const toAdd = preset.groups.filter(g => selected[g.key]);

  return (
    <div className="bg-white border border-slate-200 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">🧩 Expand Campaign Structure</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add proven-good ad groups to this campaign. Each group is a themed keyword cluster + matched RSA copy. Improves Quality Score + captures more search intent.
          </p>
        </div>
      </div>

      {/* Preset picker */}
      <div className="space-y-2 mb-4">
        {preset.groups.map(g => {
          const alreadyExists = existingAdGroups.has(g.name.toLowerCase());
          return (
            <label
              key={g.key}
              className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition ${
                alreadyExists ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed" :
                selected[g.key] ? "bg-indigo-50 border-indigo-300" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected[g.key] || false}
                disabled={alreadyExists}
                onChange={(e) => setSelected(prev => ({ ...prev, [g.key]: e.target.checked }))}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-slate-900">{g.name}</span>
                  {alreadyExists && <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded">already exists</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{g.theme}</p>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {g.keywords.length} keywords · {g.headlines.length} headlines · {g.descriptions.length} descriptions
                </div>
                {selected[g.key] && (
                  <div className="mt-2 pt-2 border-t border-indigo-200 space-y-1.5">
                    <div className="text-[11px]">
                      <strong className="text-slate-700">Keywords:</strong>{" "}
                      <span className="font-mono text-slate-600">{g.keywords.map(k => `${k.text} [${k.matchType[0]}]`).join(" · ")}</span>
                    </div>
                    <div className="text-[11px]">
                      <strong className="text-slate-700">Sample headline:</strong>{" "}
                      <span className="text-slate-600">"{g.headlines[0]}"</span>
                    </div>
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* Final URL */}
      <div className="mb-3">
        <label className="text-[11px] text-slate-600 block mb-1">Final URL (where new ads will send clicks)</label>
        <input
          type="url"
          value={customFinalUrl || defaultFinalUrl}
          onChange={(e) => setCustomFinalUrl(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
          placeholder="https://www.spectaeducation.com/ielts/mock-test"
        />
      </div>

      {/* Add button */}
      <button
        onClick={() => {
          if (toAdd.length === 0) return alert("Select at least one ad group first.");
          if (!window.confirm(`Add ${toAdd.length} new ad group(s) to "${campaignName}"?\n\n${toAdd.map(g => `• ${g.name} (${g.keywords.length} keywords)`).join("\n")}\n\nFinal URL: ${finalUrl}\n\nAd groups will be ENABLED immediately.`)) return;
          // Defensive: truncate to Google Ads limits BEFORE hitting the
          // Zod validator. Real limits: name ≤120, keyword ≤80, headline
          // ≤30, description ≤90. Any preset that accidentally exceeds
          // these gets silently trimmed instead of blowing up validation.
          addMutation.mutate({
            campaignId,
            adGroups: toAdd.map(g => ({
              name: g.name.slice(0, 120),
              keywords: g.keywords.map(k => ({ text: k.text.slice(0, 80), matchType: k.matchType })),
              rsa: {
                headlines: g.headlines.map(h => h.slice(0, 30)),
                descriptions: g.descriptions.map(d => d.slice(0, 90)),
              },
              finalUrl,
            })),
          });
        }}
        disabled={addMutation.isPending || toAdd.length === 0}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-4 py-2.5 rounded"
      >
        {addMutation.isPending ? "Adding…" : toAdd.length > 0 ? `Add ${toAdd.length} ad group${toAdd.length > 1 ? "s" : ""} to campaign` : "Select ad groups to add"}
      </button>
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
