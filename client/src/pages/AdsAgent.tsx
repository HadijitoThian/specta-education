import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Bot, Play, RefreshCw, Settings, TrendingUp, TrendingDown,
  Pause, Zap, FileText, AlertTriangle, CheckCircle, Clock,
  DollarSign, MousePointer, Eye, Target, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AiScore = "green" | "yellow" | "red";
type Platform = "google" | "meta";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: AiScore | null | undefined }) {
  if (!score) return <Badge variant="outline" className="text-gray-400">Pending</Badge>;
  const map = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-200",
    yellow: "bg-amber-100 text-amber-800 border-amber-200",
    red: "bg-red-100 text-red-800 border-red-200",
  };
  const label = { green: "🟢 Scale Up", yellow: "🟡 Optimise", red: "🔴 Pause" };
  return <Badge className={`${map[score]} border font-semibold text-xs`}>{label[score]}</Badge>;
}

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <Badge className={`${platform === "google" ? "bg-blue-100 text-blue-800" : "bg-indigo-100 text-indigo-800"} border-0 text-xs font-semibold`}>
      {platform === "google" ? "Google" : "Meta"}
    </Badge>
  );
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, string> = {
    pause: "bg-red-100 text-red-800",
    scale_budget: "bg-emerald-100 text-emerald-800",
    generate_copy: "bg-amber-100 text-amber-800",
    alert_only: "bg-gray-100 text-gray-700",
    resume: "bg-blue-100 text-blue-800",
  };
  return <Badge className={`${map[action] || "bg-gray-100 text-gray-700"} border-0 text-xs font-semibold`}>{action.replace(/_/g, " ").toUpperCase()}</Badge>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "executed") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === "failed") return <AlertTriangle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-gray-400" />;
}

function formatIdr(val: string | number | null | undefined): string {
  const n = Number(val || 0);
  if (n >= 1_000_000) return `IDR ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `IDR ${(n / 1_000).toFixed(0)}rb`;
  return `IDR ${n.toFixed(0)}`;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdsAgent() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRunning, setIsRunning] = useState(false);

  const { data, isLoading, refetch } = trpc.adsAgent.getOverview.useQuery();
  const runAgentMutation = trpc.adsAgent.runAgent.useMutation({
    onSuccess: (result) => {
      setIsRunning(false);
      toast.success(result.actionsCount > 0 ? `✅ Agent ran — ${result.actionsCount} action(s) taken` : "✅ Agent ran — no actions needed", { description: result.summary });
      refetch();
    },
    onError: (err) => {
      setIsRunning(false);
      toast.error("Agent run failed: " + err.message);
    },
  });

  const updateConfigMutation = trpc.adsAgent.updateConfig.useMutation({
    onSuccess: () => { toast.success("Settings saved"); refetch(); },
  });

  const manualOverrideMutation = trpc.adsAgent.manualOverride.useMutation({
    onSuccess: (res) => {
      toast.success(`Override executed: ${res.previousValue || ""} → ${res.newValue || ""}`);
      refetch();
    },
      onError: (err) => toast.error("Override failed: " + err.message),
  });

  const markCopyApplied = trpc.adsAgent.markCopyApplied.useMutation({
    onSuccess: () => { toast.success("Marked as applied"); refetch(); },
  });

  const config = data?.config;
  const campaigns = data?.campaigns || [];
  const snapshots = data?.snapshots || [];
  const actions = data?.actions || [];
  const generatedCopies = data?.generatedCopies || [];

  // Get latest snapshot per campaign
  const latestSnapshotMap = new Map<string, typeof snapshots[0]>();
  for (const s of snapshots) {
    const key = `${s.platform}-${s.externalId}`;
    if (!latestSnapshotMap.has(key)) latestSnapshotMap.set(key, s);
  }

  // Stats
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const pausedCampaigns = campaigns.filter(c => c.status === "paused").length;
  const snapshotValues = Array.from(latestSnapshotMap.values());
  const greenCount = snapshotValues.filter(s => s.aiScore === "green").length;
  const redCount = snapshotValues.filter(s => s.aiScore === "red").length;
  const totalSpend = snapshotValues.reduce((sum, s) => sum + Number(s.spend || 0), 0);
  const totalLeads = snapshotValues.reduce((sum, s) => sum + (s.leads || 0), 0);

  const handleRunAgent = () => {
    setIsRunning(true);
    runAgentMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bot className="w-12 h-12 text-red-500 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500">Loading AI Ads Agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Ads Agent</h1>
            <p className="text-sm text-gray-500">
              {config?.isEnabled ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse" />
                  Auto-mode active · Next run: {formatDate(config.nextRunAt)}
                </span>
              ) : (
                <span className="text-gray-400">Agent disabled</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleRunAgent}
            disabled={isRunning}
          >
            {isRunning ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
            {isRunning ? "Running..." : "Run Agent Now"}
          </Button>
        </div>
      </div>

      {/* No credentials notice */}
      {campaigns.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">API Credentials Not Yet Connected</p>
            <p className="text-sm text-amber-700 mt-1">The agent is ready. Once you provide your Google Ads and Meta Ads API credentials in Settings → Secrets, the agent will automatically sync your campaigns and start optimizing.</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Active Campaigns", value: activeCampaigns, icon: <Target className="w-4 h-4 text-blue-500" />, color: "text-blue-700" },
          { label: "Paused", value: pausedCampaigns, icon: <Pause className="w-4 h-4 text-gray-400" />, color: "text-gray-600" },
          { label: "Scaling (Green)", value: greenCount, icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, color: "text-emerald-700" },
          { label: "Needs Pause (Red)", value: redCount, icon: <TrendingDown className="w-4 h-4 text-red-500" />, color: "text-red-700" },
          { label: "7-Day Spend", value: formatIdr(totalSpend), icon: <DollarSign className="w-4 h-4 text-purple-500" />, color: "text-purple-700" },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm bg-white">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="overview" className="rounded-md text-sm">Campaigns</TabsTrigger>
          <TabsTrigger value="actions" className="rounded-md text-sm">Action Log ({actions.length})</TabsTrigger>
          <TabsTrigger value="copy" className="rounded-md text-sm">Generated Copy ({generatedCopies.length})</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-md text-sm">Settings</TabsTrigger>
        </TabsList>

        {/* ── Campaigns Tab ── */}
        <TabsContent value="overview" className="mt-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No campaigns synced yet</p>
              <p className="text-sm mt-1">Click "Run Agent Now" to sync your campaigns from Google Ads and Meta Ads</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => {
                const snapshot = latestSnapshotMap.get(`${campaign.platform}-${campaign.externalId}`);
                return (
                  <Card key={campaign.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <PlatformBadge platform={campaign.platform as Platform} />
                            <ScoreBadge score={snapshot?.aiScore as AiScore} />
                            <Badge variant="outline" className={`text-xs ${campaign.status === "active" ? "text-emerald-700 border-emerald-200" : "text-gray-500"}`}>
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="font-semibold text-gray-900 truncate">{campaign.name}</p>
                          {snapshot?.aiReasoning && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{snapshot.aiReasoning}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="grid grid-cols-3 gap-3 text-center">
                            {[
                              { icon: <Eye className="w-3 h-3" />, label: "Impr", val: (snapshot?.impressions || 0).toLocaleString() },
                              { icon: <MousePointer className="w-3 h-3" />, label: "CTR", val: `${(Number(snapshot?.ctr || 0) * 100).toFixed(1)}%` },
                              { icon: <DollarSign className="w-3 h-3" />, label: "CPL", val: formatIdr(snapshot?.cpl) },
                            ].map((m, i) => (
                              <div key={i} className="text-center">
                                <div className="flex items-center justify-center gap-0.5 text-gray-400 mb-0.5">{m.icon}<span className="text-xs">{m.label}</span></div>
                                <p className="text-sm font-semibold text-gray-800">{m.val}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1 mt-2 justify-end">
                            {campaign.status === "active" && (
                              <Button
                                size="sm" variant="outline"
                                className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => manualOverrideMutation.mutate({ platform: campaign.platform as Platform, externalId: campaign.externalId, entityName: campaign.name, action: "pause", reason: "Manual pause by admin" })}
                              >
                                <Pause className="w-3 h-3 mr-1" /> Pause
                              </Button>
                            )}
                            <Button
                              size="sm" variant="outline"
                              className="text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => manualOverrideMutation.mutate({ platform: campaign.platform as Platform, externalId: campaign.externalId, entityName: campaign.name, action: "scale_budget", reason: "Manual budget scale by admin" })}
                            >
                              <Zap className="w-3 h-3 mr-1" /> Scale
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Action Log Tab ── */}
        <TabsContent value="actions" className="mt-4">
          {actions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No actions taken yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map(action => (
                <Card key={action.id} className="border border-gray-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <StatusIcon status={action.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <PlatformBadge platform={action.platform as Platform} />
                          <ActionBadge action={action.action} />
                          {action.emailSent ? (
                            <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">📧 Email sent</Badge>
                          ) : null}
                        </div>
                        <p className="font-medium text-gray-900 text-sm">{action.entityName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{action.reason}</p>
                        {(action.previousValue || action.newValue) && (
                          <p className="text-xs mt-1">
                            {action.previousValue && <span className="text-red-500 font-medium">{action.previousValue}</span>}
                            {action.previousValue && action.newValue && <ChevronRight className="w-3 h-3 inline mx-1 text-gray-400" />}
                            {action.newValue && <span className="text-emerald-600 font-medium">{action.newValue}</span>}
                          </p>
                        )}
                        {action.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">Error: {action.errorMessage}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">{formatDate(action.createdAt)}</p>
                        <Badge variant="outline" className={`text-xs mt-1 ${action.status === "executed" ? "text-emerald-600 border-emerald-200" : action.status === "failed" ? "text-red-600 border-red-200" : "text-gray-500"}`}>
                          {action.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Generated Copy Tab ── */}
        <TabsContent value="copy" className="mt-4">
          {generatedCopies.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No replacement copy generated yet</p>
              <p className="text-sm mt-1">The agent generates new ad copy for Yellow-scored campaigns automatically</p>
            </div>
          ) : (
            <div className="space-y-4">
              {generatedCopies.map(copy => (
                <Card key={copy.id} className={`border shadow-sm ${copy.isApplied ? "opacity-60 border-gray-100" : "border-amber-200 bg-amber-50/30"}`}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={copy.platform as Platform} />
                        <span className="font-semibold text-gray-900 text-sm">{copy.entityName}</span>
                        {copy.isApplied ? <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Applied</Badge> : <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">New</Badge>}
                      </div>
                      {!copy.isApplied && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => markCopyApplied.mutate({ id: copy.id })}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Mark Applied
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[copy.headline1, copy.headline2, copy.headline3].filter(Boolean).map((h, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-400 mb-0.5">Headline {i + 1}</p>
                          <p className="text-sm font-semibold text-gray-900">{h}</p>
                        </div>
                      ))}
                    </div>
                    {copy.primaryText && (
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Primary Text (Meta)</p>
                        <p className="text-sm text-gray-800">{copy.primaryText}</p>
                      </div>
                    )}
                    {copy.aiReasoning && (
                      <p className="text-xs text-gray-500 italic">💡 {copy.aiReasoning}</p>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(copy.createdAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="mt-4">
          {config && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" /> Agent Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Agent Enabled</Label>
                      <p className="text-xs text-gray-500">Turn the autonomous agent on/off</p>
                    </div>
                    <Switch
                      checked={!!config.isEnabled}
                      onCheckedChange={(v) => updateConfigMutation.mutate({ isEnabled: v ? 1 : 0 })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Auto-Execute Mode</Label>
                      <p className="text-xs text-gray-500">Agent acts without approval</p>
                    </div>
                    <Switch
                      checked={!!config.autoMode}
                      onCheckedChange={(v) => updateConfigMutation.mutate({ autoMode: v ? 1 : 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Run Interval (hours)</Label>
                    <Input
                      type="number" defaultValue={config.runIntervalHours}
                      className="mt-1 h-8 text-sm"
                      onBlur={(e) => updateConfigMutation.mutate({ runIntervalHours: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Notification Email</Label>
                    <Input
                      type="email" defaultValue={config.notificationEmail || ""}
                      className="mt-1 h-8 text-sm"
                      onBlur={(e) => updateConfigMutation.mutate({ notificationEmail: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> Performance Thresholds</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Red CPL Threshold (IDR)", key: "redCplThreshold", val: config.redCplThreshold, hint: "Pause if CPL exceeds this" },
                    { label: "Yellow CPL Threshold (IDR)", key: "yellowCplThreshold", val: config.yellowCplThreshold, hint: "Optimise if CPL exceeds this" },
                    { label: "Red CTR Threshold (%)", key: "redCtrThreshold", val: config.redCtrThreshold, hint: "Pause if CTR below this" },
                    { label: "Min Spend to Act (IDR)", key: "minSpendForAction", val: config.minSpendForAction, hint: "Only act after this spend" },
                    { label: "Scale Budget Multiplier", key: "scaleBudgetMultiplier", val: config.scaleBudgetMultiplier, hint: "e.g. 1.3 = +30% budget" },
                    { label: "Max Daily Budget Cap (IDR)", key: "maxDailyBudgetCapIdr", val: config.maxDailyBudgetCapIdr, hint: "Never scale above this" },
                  ].map(({ label, key, val, hint }) => (
                    <div key={key}>
                      <Label className="text-xs font-medium text-gray-700">{label}</Label>
                      <p className="text-xs text-gray-400 mb-1">{hint}</p>
                      <Input
                        type="text" defaultValue={val || ""}
                        className="h-8 text-sm"
                        onBlur={(e) => updateConfigMutation.mutate({ [key]: e.target.value } as any)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-amber-200 bg-amber-50/30 md:col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-800 text-sm">API Credentials Required</p>
                      <p className="text-xs text-amber-700 mt-1">To connect live Google Ads and Meta Ads data, add these secrets in <strong>Settings → Secrets</strong>:</p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {[
                          "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN",
                          "GOOGLE_ADS_ACCESS_TOKEN", "META_ADS_ACCOUNT_ID", "META_ADS_ACCESS_TOKEN",
                        ].map(k => (
                          <code key={k} className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded font-mono">{k}</code>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
