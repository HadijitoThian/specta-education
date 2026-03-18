import { useState, useEffect } from "react";
import { SEO } from '@/components/SEO';
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Bot, Activity, Users, FileText, Mail, Play, RefreshCw,
  TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock,
  ArrowLeft, Zap, BarChart3, Send, Eye, Search, Globe,
  Shield, GraduationCap, Crosshair, Building2, MapPin
} from "lucide-react";

export default function AgentCommandCenter() {
  const { user, isLoading: authLoading } = useAuth() as any;
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // Phase 1 queries
  const { data: dashboardStats, isLoading, refetch } = trpc.agents.getDashboardStats.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: runLogs } = trpc.agents.getRunLogs.useQuery({ limit: 50 });
  const { data: assignments } = trpc.agents.getLeadAssignments.useQuery({});
  const { data: seoContent } = trpc.agents.getSeoContent.useQuery({});
  const { data: dailyReports } = trpc.agents.getDailyReports.useQuery({ limit: 7 });

  // Phase 2 queries
  const { data: visitorAnalytics } = trpc.agents.getVisitorAnalytics.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: competitorDashboard } = trpc.agents.getCompetitorDashboard.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: partnershipPipeline } = trpc.agents.getPartnershipPipeline.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Phase 2 Real Data queries
  const { data: rankingData, refetch: refetchRankings } = trpc.agents.getRankingData.useQuery(undefined, {
    refetchInterval: 120000,
  });
  const { data: competitorScanData, refetch: refetchScan } = trpc.agents.getCompetitorScanData.useQuery(undefined, {
    refetchInterval: 120000,
  });
  const { data: socialMediaData, refetch: refetchSocial } = trpc.agents.getSocialMediaData.useQuery(undefined, {
    refetchInterval: 120000,
  });

  const runRankingCheck = trpc.agents.runRankingCheck.useMutation({
    onSuccess: (data) => {
      refetchRankings();
      toast.success(`Ranking check complete: ${data.keywordsChecked} keywords checked`);
    },
    onError: (err) => toast.error(err.message),
  });
  const runCompetitorScan = trpc.agents.runCompetitorScan.useMutation({
    onSuccess: (data) => {
      refetchScan();
      toast.success(`Competitor scan complete: ${data.competitorsScanned} sites scanned`);
    },
    onError: (err) => toast.error(err.message),
  });
  const runSocialMediaScan = trpc.agents.runSocialMediaScan.useMutation({
    onSuccess: (data) => {
      refetchSocial();
      toast.success(`Social scan complete: ${data.mentionsFound} mentions found`);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleAgent = trpc.agents.toggleAgent.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Agent status changed successfully.");
    },
  });

  const triggerAgent = trpc.agents.triggerAgent.useMutation({
    onSuccess: (_, vars) => {
      refetch();
      toast.success(`${vars.agentName} has been manually triggered.`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateAssignment = trpc.agents.updateAssignment.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Lead assignment updated.");
    },
  });

  const updatePartnership = trpc.agents.updatePartnershipStatus.useMutation({
    onSuccess: () => {
      toast.success("Partnership status updated.");
    },
  });

  const dismissCompetitor = trpc.agents.dismissCompetitorAlert.useMutation({
    onSuccess: () => {
      toast.success("Alert dismissed.");
    },
  });

  // Approval workflow mutations
  const { data: pendingApprovals, refetch: refetchApprovals } = trpc.agents.getPendingApprovals.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const submitForApproval = trpc.agents.submitForApproval.useMutation({
    onSuccess: () => { refetchApprovals(); toast.success("Draft submitted for approval. Check your email!"); },
    onError: (err) => toast.error(err.message),
  });
  const submitAllForApproval = trpc.agents.submitAllForApproval.useMutation({
    onSuccess: (data) => { refetchApprovals(); toast.success(`${data.count} drafts submitted for approval.`); },
    onError: (err) => toast.error(err.message),
  });
  const approveOutreach = trpc.agents.approveOutreach.useMutation({
    onSuccess: () => { refetchApprovals(); toast.success("Outreach email sent to university!"); },
    onError: (err) => toast.error(err.message),
  });
  const rejectOutreach = trpc.agents.rejectOutreach.useMutation({
    onSuccess: () => { refetchApprovals(); toast.success("Outreach rejected."); },
    onError: (err) => toast.error(err.message),
  });
  const updateDraft = trpc.agents.updateOutreachDraft.useMutation({
    onSuccess: () => { refetchApprovals(); toast.success("Draft updated."); },
    onError: (err) => toast.error(err.message),
  });
  const [editingDraft, setEditingDraft] = useState<any>(null);
  const [expandedCompetitor, setExpandedCompetitor] = useState<number | null>(null);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><RefreshCw className="animate-spin h-8 w-8 text-red-500" /></div>;
  if (!user || (user.role !== "admin" && user.role !== "general_manager")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-4">You need admin access to view the Agent Command Center.</p>
            <Button onClick={() => navigate("/admin")}>Go to Admin</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardStats;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Agent Command Center | SpecTa Education Admin"
        description="AI Agent management dashboard"
        noindex={true}
      />
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="container max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate("/admin")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Bot className="h-7 w-7" />
                  <h1 className="text-2xl font-bold">AI Agent Command Center</h1>
                </div>
                <p className="text-red-100 text-sm mt-1">Monitor and control your AI workforce — {stats?.agents?.length || 0} agents active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/20" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="secondary" size="sm" onClick={() => triggerAgent.mutate({ agentName: "central_reporter" })} disabled={triggerAgent.isPending}>
                <Send className="h-4 w-4 mr-2" />
                Send Report Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-6">
        {/* KPI Cards — expanded with Phase 2 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Leads Assigned</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.leads?.total || 0}</p>
                </div>
                <Users className="h-8 w-8 text-red-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{stats?.leads?.active || 0} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Converted</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.leads?.converted || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{stats?.leads?.total ? Math.round((stats.leads.converted / stats.leads.total) * 100) : 0}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Escalated</p>
                  <p className="text-2xl font-bold text-amber-600">{stats?.leads?.escalated || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Needs attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">SEO Articles</p>
                  <p className="text-2xl font-bold text-blue-600">{stats?.seo?.published || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{stats?.seo?.inProgress || 0} in progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Competitors</p>
                  <p className="text-2xl font-bold text-purple-600">{competitorDashboard?.totalCompetitors || 0}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{competitorDashboard?.highThreats || 0} threats</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Partnerships</p>
                  <p className="text-2xl font-bold text-indigo-600">{partnershipPipeline?.totalIdentified || 0}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-indigo-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{partnershipPipeline?.byCountry ? Object.keys(partnershipPipeline.byCountry).length : 0} countries</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs — expanded with Phase 2 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview"><Bot className="h-4 w-4 mr-1" />Agents</TabsTrigger>
            <TabsTrigger value="leads"><Users className="h-4 w-4 mr-1" />Leads</TabsTrigger>
            <TabsTrigger value="visitors"><Crosshair className="h-4 w-4 mr-1" />Visitors</TabsTrigger>
            <TabsTrigger value="competitors"><Shield className="h-4 w-4 mr-1" />Competitors</TabsTrigger>
            <TabsTrigger value="partnerships"><GraduationCap className="h-4 w-4 mr-1" />Partnerships</TabsTrigger>
            <TabsTrigger value="rankings"><TrendingUp className="h-4 w-4 mr-1" />Rankings</TabsTrigger>
            <TabsTrigger value="social"><Globe className="h-4 w-4 mr-1" />Social</TabsTrigger>
            <TabsTrigger value="scraper"><Search className="h-4 w-4 mr-1" />Scraper</TabsTrigger>
            <TabsTrigger value="seo"><FileText className="h-4 w-4 mr-1" />SEO</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="h-4 w-4 mr-1" />Logs</TabsTrigger>
            <TabsTrigger value="reports"><Mail className="h-4 w-4 mr-1" />Reports</TabsTrigger>
          </TabsList>

          {/* ===== AGENTS OVERVIEW TAB ===== */}
          <TabsContent value="overview">
            <div className="grid gap-4">
              {stats?.agents?.map((agent: any) => {
                const lastRun = stats.recentRuns?.find((r: any) => r.agentName === agent.agentName);
                const agentIcon = getAgentIcon(agent.agentName);
                return (
                  <Card key={agent.agentName}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${agent.isActive ? "bg-green-50" : "bg-gray-100"}`}>
                            {agentIcon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{agent.displayName}</h3>
                            <p className="text-sm text-gray-500">{agent.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant={agent.isActive ? "default" : "secondary"}>
                                {agent.isActive ? "Active" : "Paused"}
                              </Badge>
                              {lastRun && (
                                <Badge variant={lastRun.status === "success" ? "default" : lastRun.status === "failed" ? "destructive" : "secondary"} className={lastRun.status === "success" ? "bg-green-100 text-green-700" : ""}>
                                  {lastRun.status === "success" ? <CheckCircle className="h-3 w-3 mr-1" /> : lastRun.status === "failed" ? <XCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                  Last: {lastRun.status}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-400">
                                Every {agent.runIntervalMinutes < 60 ? `${agent.runIntervalMinutes}m` : agent.runIntervalMinutes < 1440 ? `${Math.round(agent.runIntervalMinutes / 60)}h` : `${Math.round(agent.runIntervalMinutes / 1440)}d`}
                              </span>
                              {agent.lastRunAt && (
                                <span className="text-xs text-gray-400">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {new Date(agent.lastRunAt).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}
                                </span>
                              )}
                            </div>
                            {lastRun?.summary && (
                              <p className="text-xs text-gray-500 mt-1">{lastRun.summary}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={agent.isActive}
                            onCheckedChange={(checked) => toggleAgent.mutate({ agentName: agent.agentName, isActive: checked })}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => triggerAgent.mutate({ agentName: agent.agentName })}
                            disabled={triggerAgent.isPending || !agent.isActive}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Run Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Counselor Performance */}
              {stats?.counselorStats && Object.keys(stats.counselorStats).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Counselor Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Counselor</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-500">Assigned</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-500">Contacted</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-500">Converted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(stats.counselorStats).map(([name, data]: [string, any]) => (
                            <tr key={name} className="border-b last:border-0">
                              <td className="py-2 px-3 font-medium">{name}</td>
                              <td className="py-2 px-3 text-center">{data.assigned}</td>
                              <td className="py-2 px-3 text-center">{data.contacted}</td>
                              <td className="py-2 px-3 text-center text-green-600 font-medium">{data.converted}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ===== LEAD PIPELINE TAB ===== */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>Lead Assignments</CardTitle>
                <CardDescription>All leads assigned by the CRM Agent to counselors</CardDescription>
              </CardHeader>
              <CardContent>
                {assignments && assignments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-3 font-medium text-gray-500">Student</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-500">Email</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-500">Counselor</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-500">Source</th>
                          <th className="text-center py-3 px-3 font-medium text-gray-500">Priority</th>
                          <th className="text-center py-3 px-3 font-medium text-gray-500">Status</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-500">Assigned</th>
                          <th className="text-center py-3 px-3 font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((a: any) => (
                          <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium">{a.studentName}</td>
                            <td className="py-2 px-3 text-gray-500">{a.studentEmail || "-"}</td>
                            <td className="py-2 px-3">{a.counselorName}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-xs">{a.leadSource}</Badge>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Badge className={
                                a.priority === "urgent" ? "bg-red-100 text-red-700" :
                                a.priority === "high" ? "bg-orange-100 text-orange-700" :
                                a.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                                "bg-gray-100 text-gray-700"
                              }>{a.priority}</Badge>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Badge className={
                                a.status === "converted" ? "bg-green-100 text-green-700" :
                                a.status === "escalated" ? "bg-red-100 text-red-700" :
                                a.status === "contacted" ? "bg-blue-100 text-blue-700" :
                                a.status === "follow_up" ? "bg-purple-100 text-purple-700" :
                                "bg-gray-100 text-gray-700"
                              }>{a.status}</Badge>
                            </td>
                            <td className="py-2 px-3 text-xs text-gray-400">
                              {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <select
                                className="text-xs border rounded px-2 py-1"
                                value={a.status}
                                onChange={(e) => updateAssignment.mutate({ id: a.id, status: e.target.value as any })}
                              >
                                <option value="assigned">Assigned</option>
                                <option value="contacted">Contacted</option>
                                <option value="follow_up">Follow Up</option>
                                <option value="qualified">Qualified</option>
                                <option value="converted">Converted</option>
                                <option value="closed">Closed</option>
                                <option value="escalated">Escalated</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No lead assignments yet. The CRM Agent will assign leads automatically.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== VISITOR ANALYTICS TAB (Phase 2 - Lead Hunter) ===== */}
          <TabsContent value="visitors">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Visitor Intelligence</h2>
                  <p className="text-sm text-gray-500">Website visitor behavior tracked by the Lead Hunter Agent</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => triggerAgent.mutate({ agentName: "lead_hunter" })} disabled={triggerAgent.isPending}>
                  <Crosshair className="h-4 w-4 mr-1" />
                  Scan Now
                </Button>
              </div>

              {/* Visitor Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Visitors (24h)</p>
                    <p className="text-2xl font-bold">{visitorAnalytics?.totalVisitors24h || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">High Intent</p>
                    <p className="text-2xl font-bold text-red-600">{visitorAnalytics?.highIntentVisitors || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Top Pages</p>
                    <p className="text-2xl font-bold text-green-600">{visitorAnalytics?.topPages?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Social Mentions</p>
                    <p className="text-2xl font-bold text-blue-600">{visitorAnalytics?.recentSocialMentions?.length || 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent High-Intent Visitors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crosshair className="h-5 w-5 text-red-500" />
                    Recent High-Intent Visitors
                  </CardTitle>
                  <CardDescription>Visitors showing strong interest based on behavior scoring</CardDescription>
                </CardHeader>
                <CardContent>
                  {visitorAnalytics?.recentHighIntent && visitorAnalytics.recentHighIntent.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Session</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Pages Visited</th>
                            <th className="text-center py-3 px-3 font-medium text-gray-500">Score</th>
                            <th className="text-center py-3 px-3 font-medium text-gray-500">Intent</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Source</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visitorAnalytics.recentHighIntent.map((v: any) => (
                            <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 px-3 font-mono text-xs">{v.sessionId?.substring(0, 12)}...</td>
                              <td className="py-2 px-3 text-xs">{v.pagesVisited || "-"}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`font-bold ${(v.engagementScore || 0) >= 70 ? "text-red-600" : (v.engagementScore || 0) >= 40 ? "text-amber-600" : "text-gray-500"}`}>
                                  {v.engagementScore || 0}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <Badge className={
                                  v.intentLevel === "high" ? "bg-red-100 text-red-700" :
                                  v.intentLevel === "medium" ? "bg-amber-100 text-amber-700" :
                                  "bg-gray-100 text-gray-700"
                                }>{v.intentLevel || "low"}</Badge>
                              </td>
                              <td className="py-2 px-3 text-xs">{v.utmSource || v.referrer || "direct"}</td>
                              <td className="py-2 px-3 text-xs text-gray-400">
                                {v.firstVisitAt ? new Date(v.firstVisitAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No visitor data yet. The Lead Hunter Agent will start tracking visitors automatically.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== COMPETITOR MONITOR TAB (Phase 2) ===== */}
          <TabsContent value="competitors">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Competitor Intelligence</h2>
                  <p className="text-sm text-gray-500">Strategic insights from monitoring 9+ competitors</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => triggerAgent.mutate({ agentName: "competitor_monitor" })} disabled={triggerAgent.isPending}>
                  <Shield className="h-4 w-4 mr-1" />
                  Scan Now
                </Button>
              </div>

              {/* Competitor Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Competitors Tracked</p>
                    <p className="text-2xl font-bold">{competitorDashboard?.totalCompetitors || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Total Analyses</p>
                    <p className="text-2xl font-bold text-purple-600">{competitorDashboard?.recentAnalyses?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">High Threats</p>
                    <p className="text-2xl font-bold text-amber-600">{competitorDashboard?.highThreats || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Opportunities</p>
                    <p className="text-2xl font-bold text-green-600">{competitorDashboard?.topOpportunities?.length || 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Competitor Alerts — Expandable */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    Intelligence Alerts
                  </CardTitle>
                  <CardDescription>Click on any competitor to view full analysis, strategy, and recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  {competitorDashboard?.recentAnalyses && competitorDashboard.recentAnalyses.length > 0 ? (
                    <div className="space-y-3">
                      {competitorDashboard.recentAnalyses.map((alert: any) => {
                        // Parse the details JSON if available
                        let details: any = null;
                        try { details = alert.details ? JSON.parse(alert.details) : null; } catch { details = null; }
                        let recommendations: string[] = [];
                        try { recommendations = alert.strategicRecommendation ? JSON.parse(alert.strategicRecommendation) : []; } catch { recommendations = alert.strategicRecommendation ? [alert.strategicRecommendation] : []; }
                        const isExpanded = expandedCompetitor === alert.id;

                        return (
                          <div key={alert.id} className={`border rounded-lg transition-all ${isExpanded ? 'ring-2 ring-purple-300 bg-white' : 'hover:bg-gray-50'}`}>
                            {/* Clickable Header */}
                            <div
                              className="p-4 cursor-pointer"
                              onClick={() => setExpandedCompetitor(isExpanded ? null : alert.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">{alert.competitorName}</span>
                                    <Badge className={
                                      alert.severity === "critical" ? "bg-red-100 text-red-700" :
                                      alert.severity === "high" ? "bg-orange-100 text-orange-700" :
                                      alert.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                                      "bg-gray-100 text-gray-700"
                                    }>{alert.severity}</Badge>
                                    {alert.status === "reviewed" && <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Reviewed</Badge>}
                                  </div>
                                  <p className="text-sm text-gray-600">{details?.currentStrategy?.substring(0, 150) || alert.analysis?.substring(0, 150) || 'Click to view full analysis'}...</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {alert.detectedAt ? new Date(alert.detectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Eye className={`h-5 w-5 transition-transform ${isExpanded ? 'text-purple-600 rotate-180' : 'text-gray-400'}`} />
                                </div>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="px-4 pb-4 border-t">
                                {/* Current Strategy */}
                                {details?.currentStrategy && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1"><Crosshair className="h-4 w-4 text-purple-500" />Current Strategy</h4>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{details.currentStrategy}</p>
                                  </div>
                                )}

                                {/* Recent Moves */}
                                {details?.recentMoves && details.recentMoves.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1"><Activity className="h-4 w-4 text-orange-500" />Recent Moves</h4>
                                    <div className="space-y-2">
                                      {details.recentMoves.map((move: any, i: number) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                          <Badge className={
                                            move.impact === "high" ? "bg-red-100 text-red-700 mt-0.5" :
                                            move.impact === "medium" ? "bg-yellow-100 text-yellow-700 mt-0.5" :
                                            "bg-gray-100 text-gray-700 mt-0.5"
                                          }>{move.impact}</Badge>
                                          <div className="flex-1">
                                            <p className="text-sm text-gray-700">{move.move}</p>
                                            {move.date && <p className="text-xs text-gray-400 mt-1">{move.date}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* SEO & Social Media */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                  {details?.seoRanking && (
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                      <h4 className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1"><BarChart3 className="h-4 w-4" />SEO Position</h4>
                                      <p className="text-lg font-bold text-blue-700">#{details.seoRanking.estimatedPosition || '?'}</p>
                                      <p className="text-xs text-blue-600">Trend: {details.seoRanking.trend || 'unknown'}</p>
                                    </div>
                                  )}
                                  {details?.socialMediaActivity && (
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                      <h4 className="text-sm font-semibold text-purple-800 mb-1 flex items-center gap-1"><Globe className="h-4 w-4" />Social Media</h4>
                                      <p className="text-xs text-purple-700">{details.socialMediaActivity}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Opportunities */}
                                {details?.opportunities && details.opportunities.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1"><TrendingUp className="h-4 w-4 text-green-500" />Opportunities for SpecTa</h4>
                                    <ul className="space-y-1">
                                      {details.opportunities.map((opp: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2 p-2 bg-green-50 rounded">
                                          <span className="text-green-500 mt-0.5 shrink-0">+</span>
                                          <span>{opp}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Strategic Recommendations */}
                                {recommendations.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1"><Zap className="h-4 w-4 text-red-500" />Recommended Actions</h4>
                                    <ol className="space-y-2">
                                      {recommendations.map((rec: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-700 flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                          <span className="bg-red-200 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                                  {(alert.status === "new" || alert.status === "pending") && (
                                    <Button size="sm" variant="outline" onClick={() => dismissCompetitor.mutate({ id: alert.id })}>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Mark as Reviewed
                                    </Button>
                                  )}
                                  {alert.sourceUrl && (
                                    <Button size="sm" variant="outline" onClick={() => window.open(alert.sourceUrl, '_blank')}>
                                      <Globe className="h-4 w-4 mr-1" />
                                      Visit Website
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No competitor intelligence yet. The Competitor Monitor will scan daily.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== UNIVERSITY PARTNERSHIPS TAB (Phase 2) ===== */}
          <TabsContent value="partnerships">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">University Partnership Pipeline</h2>
                  <p className="text-sm text-gray-500">Partnership opportunities across Australia, UK, Ireland, Canada, and New Zealand</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => triggerAgent.mutate({ agentName: "university_scout" })} disabled={triggerAgent.isPending}>
                  <Globe className="h-4 w-4 mr-1" />
                  Scout Now
                </Button>
              </div>

              {/* Country Summary */}
              {partnershipPipeline?.byCountry && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(partnershipPipeline.byCountry).map(([country, count]: [string, any]) => (
                    <Card key={country}>
                      <CardContent className="pt-4 pb-4 text-center">
                        <MapPin className="h-5 w-5 mx-auto mb-1 text-indigo-500" />
                        <p className="text-2xl font-bold text-indigo-600">{count}</p>
                        <p className="text-xs text-gray-500">{country}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Outreach Approval Queue */}
              <Card className="border-2 border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-orange-500" />
                    Outreach Approval Queue
                  </CardTitle>
                  <CardDescription className="flex items-center justify-between">
                    <span>Review and approve outreach emails before they're sent to universities</span>
                    <Button size="sm" variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50" onClick={() => submitAllForApproval.mutate()} disabled={submitAllForApproval.isPending}>
                      <Send className="h-4 w-4 mr-1" />
                      Submit All Drafts for Approval
                    </Button>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingApprovals && pendingApprovals.length > 0 ? (
                    <div className="space-y-4">
                      {pendingApprovals.map((item: any) => (
                        <div key={item.id} className={`border rounded-lg p-4 ${
                          item.approvalStatus === 'pending_approval' ? 'border-orange-200 bg-orange-50/50' :
                          item.approvalStatus === 'approved' || item.approvalStatus === 'sent' ? 'border-green-200 bg-green-50/50' :
                          'border-red-200 bg-red-50/50'
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-base">{item.universityName}</h4>
                              <p className="text-sm text-gray-500">{item.country} {item.worldRanking ? `• World Rank #${item.worldRanking}` : ''}</p>
                              <p className="text-sm text-gray-500 mt-1">To: <span className="font-medium">{item.outreachRecipientEmail || 'No email set'}</span></p>
                            </div>
                            <Badge className={
                              item.approvalStatus === 'pending_approval' ? 'bg-orange-100 text-orange-700' :
                              item.approvalStatus === 'approved' ? 'bg-blue-100 text-blue-700' :
                              item.approvalStatus === 'sent' ? 'bg-green-100 text-green-700' :
                              item.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }>{(item.approvalStatus || '').replace(/_/g, ' ')}</Badge>
                          </div>

                          {/* Email Preview */}
                          {item.outreachEmailSubject && (
                            <div className="bg-white border rounded-md p-3 mb-3">
                              <p className="text-sm font-medium text-gray-700 mb-1">Subject: {item.outreachEmailSubject}</p>
                              <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-4">{item.outreachEmailDraft}</p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {item.approvalStatus === 'pending_approval' && (
                            <div className="flex items-center gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approveOutreach.mutate({ id: item.id })} disabled={approveOutreach.isPending}>
                                <CheckCircle className="h-4 w-4 mr-1" /> Approve & Send
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingDraft(item)}>
                                <FileText className="h-4 w-4 mr-1" /> Edit Draft
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => rejectOutreach.mutate({ id: item.id })} disabled={rejectOutreach.isPending}>
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                          {item.approvalStatus === 'sent' && item.outreachSentAt && (
                            <p className="text-xs text-green-600">Sent on {new Date(item.outreachSentAt).toLocaleDateString()}</p>
                          )}
                          {item.approvalStatus === 'rejected' && (
                            <p className="text-xs text-red-600">Rejected{item.rejectionReason ? `: ${item.rejectionReason}` : ''}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No outreach emails pending approval.</p>
                      <p className="text-xs mt-1">Click "Submit All Drafts" to send draft_ready partnerships for your review.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Edit Draft Modal */}
              {editingDraft && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle>Edit Outreach Draft — {editingDraft.universityName}</CardTitle>
                      <CardDescription>Modify the email before approving</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Recipient Email</label>
                        <input
                          type="email"
                          className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                          defaultValue={editingDraft.outreachRecipientEmail || ''}
                          onChange={(e) => editingDraft._recipientEmail = e.target.value}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Subject</label>
                        <input
                          type="text"
                          className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                          defaultValue={editingDraft.outreachEmailSubject || ''}
                          onChange={(e) => editingDraft._subject = e.target.value}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email Body</label>
                        <textarea
                          className="w-full mt-1 border rounded-md px-3 py-2 text-sm min-h-[300px]"
                          defaultValue={editingDraft.outreachEmailDraft || ''}
                          onChange={(e) => editingDraft._body = e.target.value}
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="outline" onClick={() => setEditingDraft(null)}>Cancel</Button>
                        <Button onClick={() => {
                          const updates: any = { id: editingDraft.id };
                          if (editingDraft._subject) updates.subject = editingDraft._subject;
                          if (editingDraft._body) updates.body = editingDraft._body;
                          if (editingDraft._recipientEmail) updates.recipientEmail = editingDraft._recipientEmail;
                          updateDraft.mutate(updates);
                          setEditingDraft(null);
                        }} disabled={updateDraft.isPending}>
                          Save Changes
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                          // Save changes first, then approve
                          const updates: any = { id: editingDraft.id };
                          if (editingDraft._subject) updates.subject = editingDraft._subject;
                          if (editingDraft._body) updates.body = editingDraft._body;
                          if (editingDraft._recipientEmail) updates.recipientEmail = editingDraft._recipientEmail;
                          if (Object.keys(updates).length > 1) updateDraft.mutate(updates);
                          approveOutreach.mutate({ id: editingDraft.id });
                          setEditingDraft(null);
                        }} disabled={approveOutreach.isPending}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Save & Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Partnership Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-500" />
                    Partnership Opportunities
                  </CardTitle>
                  <CardDescription>Universities identified for potential partnership</CardDescription>
                </CardHeader>
                <CardContent>
                  {partnershipPipeline?.recentOpportunities && partnershipPipeline.recentOpportunities.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-3 font-medium text-gray-500">University</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Country</th>
                            <th className="text-center py-3 px-3 font-medium text-gray-500">World Rank</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Type</th>
                            <th className="text-center py-3 px-3 font-medium text-gray-500">Has Agent?</th>
                            <th className="text-center py-3 px-3 font-medium text-gray-500">Status</th>
                            <th className="text-center py-3 px-3 font-medium text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partnershipPipeline.recentOpportunities.map((uni: any) => (
                            <tr key={uni.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 px-3">
                                <div>
                                  <span className="font-medium">{uni.universityName}</span>
                                  {uni.websiteUrl && (
                                    <a href={uni.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs ml-2 hover:underline">
                                      <Globe className="h-3 w-3 inline" />
                                    </a>
                                  )}
                                </div>
                                {uni.internationalOfficeEmail && (
                                  <p className="text-xs text-gray-400">{uni.internationalOfficeEmail}</p>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-xs">{uni.country}</Badge>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {uni.worldRanking ? `#${uni.worldRanking}` : "-"}
                              </td>
                              <td className="py-2 px-3 text-xs">{(uni.partnershipType || "").replace(/_/g, " ")}</td>
                              <td className="py-2 px-3 text-center">
                                {uni.hasExistingIndonesianAgent === false ? (
                                  <Badge className="bg-green-100 text-green-700">No — Opportunity!</Badge>
                                ) : uni.hasExistingIndonesianAgent === true ? (
                                  <Badge className="bg-gray-100 text-gray-600">Yes</Badge>
                                ) : (
                                  <span className="text-gray-400">Unknown</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <Badge className={
                                  uni.outreachStatus === "partnered" ? "bg-green-100 text-green-700" :
                                  uni.outreachStatus === "email_sent" || uni.outreachStatus === "follow_up_sent" ? "bg-blue-100 text-blue-700" :
                                  uni.outreachStatus === "responded" || uni.outreachStatus === "meeting_scheduled" ? "bg-purple-100 text-purple-700" :
                                  uni.outreachStatus === "rejected" || uni.outreachStatus === "no_response" ? "bg-red-100 text-red-700" :
                                  "bg-gray-100 text-gray-700"
                                }>{(uni.outreachStatus || "identified").replace(/_/g, " ")}</Badge>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <select
                                  className="text-xs border rounded px-2 py-1"
                                  value={uni.outreachStatus || "identified"}
                                  onChange={(e) => updatePartnership.mutate({ id: uni.id, status: e.target.value as any })}
                                >
                                  <option value="identified">Identified</option>
                                  <option value="researching">Researching</option>
                                  <option value="draft_ready">Draft Ready</option>
                                  <option value="email_sent">Email Sent</option>
                                  <option value="follow_up_sent">Follow-up Sent</option>
                                  <option value="responded">Responded</option>
                                  <option value="meeting_scheduled">Meeting Scheduled</option>
                                  <option value="agreement_pending">Agreement Pending</option>
                                  <option value="partnered">Partnered</option>
                                  <option value="rejected">Rejected</option>
                                  <option value="no_response">No Response</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No partnerships discovered yet. The University Scout Agent will find opportunities daily.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== GOOGLE RANKINGS TAB ===== */}
          <TabsContent value="rankings">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Google Ranking Tracker</h2>
                  <p className="text-sm text-gray-500">Real-time Google search position tracking for your target keywords</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => runRankingCheck.mutate()} disabled={runRankingCheck.isPending}>
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {runRankingCheck.isPending ? "Checking..." : "Check Rankings"}
                </Button>
              </div>

              {/* Ranking Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Keywords Tracked</p>
                    <p className="text-2xl font-bold">{rankingData?.keywordsTracked || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Avg Position</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {rankingData?.ourRankings?.length ? Math.round(rankingData.ourRankings.filter((r: any) => r.position).reduce((sum: number, k: any) => sum + (k.position || 100), 0) / Math.max(rankingData.ourRankings.filter((r: any) => r.position).length, 1)) : "-"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Top 10 Keywords</p>
                    <p className="text-2xl font-bold text-green-600">
                      {rankingData?.keywordsInTop10 || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Last Checked</p>
                    <p className="text-sm font-medium">
                      {rankingData?.lastChecked ? new Date(rankingData.lastChecked).toLocaleString("en-US", { timeZone: "Asia/Jakarta", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Keyword Rankings Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Keyword Rankings
                  </CardTitle>
                  <CardDescription>Real Google search positions for your target keywords</CardDescription>
                </CardHeader>
                <CardContent>
                  {rankingData?.ourRankings && rankingData.ourRankings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Keyword</th>
                            <th className="text-center py-3 px-3 font-medium text-gray-500">Position</th>
                            <th className="text-center py-3 px-3 font-medium text-gray-500">Change</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Top Result</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Last Checked</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankingData.ourRankings.map((kw: any, i: number) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium">{kw.keyword}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`font-bold text-lg ${
                                  kw.position && kw.position <= 3 ? "text-green-600" :
                                  kw.position && kw.position <= 10 ? "text-blue-600" :
                                  kw.position && kw.position <= 20 ? "text-amber-600" :
                                  "text-gray-400"
                                }`}>
                                  {kw.position || "N/A"}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {kw.change !== undefined && kw.change !== null && kw.change !== 0 ? (
                                  <Badge className={kw.change > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                    {kw.change > 0 ? `+${kw.change}` : kw.change}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-xs text-gray-500 max-w-[200px] truncate">-</td>
                              <td className="py-2 px-3 text-xs text-gray-400">
                                {rankingData.lastChecked ? new Date(rankingData.lastChecked).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No ranking data yet. Click "Check Rankings" to run your first scan.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== SOCIAL MEDIA TAB ===== */}
          <TabsContent value="social">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Social Media Monitor</h2>
                  <p className="text-sm text-gray-500">Real-time social media mentions and lead signals from public platforms</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => runSocialMediaScan.mutate()} disabled={runSocialMediaScan.isPending}>
                  <Globe className="h-4 w-4 mr-1" />
                  {runSocialMediaScan.isPending ? "Scanning..." : "Scan Social"}
                </Button>
              </div>

              {/* Social Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Total Mentions</p>
                    <p className="text-2xl font-bold">{socialMediaData?.totalMentions || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Lead Opportunities</p>
                    <p className="text-2xl font-bold text-red-600">{socialMediaData?.leadOpportunities || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Brand Mentions</p>
                    <p className="text-2xl font-bold text-blue-600">{socialMediaData?.brandMentions || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Last Scanned</p>
                    <p className="text-sm font-medium">
                      {socialMediaData?.lastScanned ? new Date(socialMediaData.lastScanned).toLocaleString("en-US", { timeZone: "Asia/Jakarta", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Breakdown */}
              {socialMediaData?.platformBreakdown && socialMediaData.platformBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Platform Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {socialMediaData.platformBreakdown.map((p: any) => (
                        <div key={p.platform} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                          <span className="font-medium capitalize">{p.platform}</span>
                          <Badge variant="secondary">{p.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Mentions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Recent Social Mentions
                  </CardTitle>
                  <CardDescription>Public social media posts about study abroad from Indonesia</CardDescription>
                </CardHeader>
                <CardContent>
                  {socialMediaData?.recentMentions && socialMediaData.recentMentions.length > 0 ? (
                    <div className="space-y-3">
                      {socialMediaData.recentMentions.map((m: any, i: number) => (
                        <div key={i} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="capitalize">{m.platform}</Badge>
                                <Badge className={
                                  m.sentiment === "positive" ? "bg-green-100 text-green-700" :
                                  m.sentiment === "negative" ? "bg-red-100 text-red-700" :
                                  "bg-gray-100 text-gray-700"
                                }>{m.sentiment}</Badge>
                                {m.isLeadOpportunity && <Badge className="bg-red-500 text-white">Lead Signal</Badge>}
                              </div>
                              <p className="text-sm text-gray-700 mt-1">{m.content?.substring(0, 200)}{m.content?.length > 200 ? "..." : ""}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-gray-400">Relevance: {m.relevanceScore}/100</span>
                                {m.sourceUrl && (
                                  <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">View Source</a>
                                )}
                                <span className="text-xs text-gray-400">
                                  {m.detectedAt ? new Date(m.detectedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No social mentions yet. Click "Scan Social" to run your first scan.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== COMPETITOR SCRAPER TAB ===== */}
          <TabsContent value="scraper">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Competitor Website Scraper</h2>
                  <p className="text-sm text-gray-500">Real-time monitoring of competitor website changes and updates</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => runCompetitorScan.mutate()} disabled={runCompetitorScan.isPending}>
                  <Search className="h-4 w-4 mr-1" />
                  {runCompetitorScan.isPending ? "Scanning..." : "Scan Competitors"}
                </Button>
              </div>

              {/* Scraper Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Sites Monitored</p>
                    <p className="text-2xl font-bold">{competitorScanData?.competitorsMonitored || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Changes Detected</p>
                    <p className="text-2xl font-bold text-amber-600">{competitorScanData?.recentChanges?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Scan History</p>
                    <p className="text-2xl font-bold text-green-600">{competitorScanData?.scanHistory?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-gray-500">Last Scan</p>
                    <p className="text-sm font-medium">
                      {competitorScanData?.lastScanned ? new Date(competitorScanData.lastScanned).toLocaleString("en-US", { timeZone: "Asia/Jakarta", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Changes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-amber-500" />
                    Recent Website Changes
                  </CardTitle>
                  <CardDescription>Detected changes on competitor websites</CardDescription>
                </CardHeader>
                <CardContent>
                  {competitorScanData?.recentChanges && competitorScanData.recentChanges.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Competitor</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Change Type</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Details</th>
                            <th className="text-center py-3 px-3 font-medium text-gray-500">Severity</th>
                            <th className="text-left py-3 px-3 font-medium text-gray-500">Detected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitorScanData.recentChanges.map((c: any, i: number) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium">{c.competitor}</td>
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="capitalize">{c.changeType?.replace("_", " ") || "general"}</Badge>
                              </td>
                              <td className="py-2 px-3 text-xs text-gray-600 max-w-[300px] truncate">{c.details}</td>
                              <td className="py-2 px-3 text-center">
                                <Badge className={
                                  c.changeType === "new_page" ? "bg-amber-500 text-white" :
                                  c.changeType === "content_change" ? "bg-blue-100 text-blue-700" :
                                  "bg-gray-100 text-gray-700"
                                }>{c.changeType || "unknown"}</Badge>
                              </td>
                              <td className="py-2 px-3 text-xs text-gray-400">
                                {c.detectedAt ? new Date(c.detectedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No website changes detected yet. Click "Scan Competitors" to run your first scan.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== SEO TAB (Content Calendar + SEO Optimizer) ===== */}
          <TabsContent value="seo">
            <div className="space-y-6">
              {/* SEO Content Calendar */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>SEO Content Calendar</CardTitle>
                      <CardDescription>Articles planned, generated, and published by the SEO Agent</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => triggerAgent.mutate({ agentName: "seo_builder" })} disabled={triggerAgent.isPending}>
                      <Zap className="h-4 w-4 mr-1" />
                      Generate Article
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {seoContent && seoContent.length > 0 ? (
                    <div className="space-y-3">
                      {seoContent.map((entry: any) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{entry.title || entry.targetKeyword}</h4>
                              <Badge className={
                                entry.status === "published" ? "bg-green-100 text-green-700" :
                                entry.status === "generated" ? "bg-blue-100 text-blue-700" :
                                entry.status === "generating" ? "bg-purple-100 text-purple-700" :
                                entry.status === "planned" ? "bg-gray-100 text-gray-700" :
                                "bg-red-100 text-red-700"
                              }>{entry.status}</Badge>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Keyword: <span className="text-gray-600">{entry.targetKeyword}</span>
                              {entry.scheduledDate && ` • Scheduled: ${entry.scheduledDate}`}
                              {entry.publishedAt && ` • Published: ${new Date(entry.publishedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          {entry.blogPostId && (
                            <Button size="sm" variant="ghost" onClick={() => window.open(`/blog/${entry.slug || ""}`, "_blank")}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No SEO content yet. The SEO Agent will plan and generate articles automatically.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEO Optimizer Dashboard */}
              <SeoOptimizerSection />
            </div>
          </TabsContent>

          {/* ===== ACTIVITY LOG TAB ===== */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Agent Activity Log</CardTitle>
                <CardDescription>Recent execution history of all agents</CardDescription>
              </CardHeader>
              <CardContent>
                {runLogs && runLogs.length > 0 ? (
                  <div className="space-y-2">
                    {runLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className={`p-2 rounded-lg ${
                          log.status === "success" ? "bg-green-50" :
                          log.status === "failed" ? "bg-red-50" :
                          log.status === "partial" ? "bg-yellow-50" :
                          "bg-blue-50"
                        }`}>
                          {log.status === "success" ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                           log.status === "failed" ? <XCircle className="h-4 w-4 text-red-600" /> :
                           log.status === "running" ? <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" /> :
                           <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{formatAgentName(log.agentName)}</span>
                            <Badge variant="outline" className="text-xs">{log.status}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{log.summary}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            {new Date(log.startedAt).toLocaleString("en-US", { timeZone: "Asia/Jakarta", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {log.durationMs && (
                            <p className="text-xs text-gray-300">{(log.durationMs / 1000).toFixed(1)}s</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No activity logs yet. Agents will log their activity when they run.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== DAILY REPORTS TAB ===== */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daily Reports</CardTitle>
                    <CardDescription>Reports sent to hadi@spectaeducation.com every day at 9AM WIB</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => triggerAgent.mutate({ agentName: "central_reporter" })} disabled={triggerAgent.isPending}>
                    <Send className="h-4 w-4 mr-1" />
                    Send Now
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dailyReports && dailyReports.length > 0 ? (
                  <div className="space-y-3">
                    {dailyReports.map((report: any) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium">{formatReportDate(report.reportDate)}</h4>
                          <p className="text-sm text-gray-500 mt-1">{report.summary}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={report.status === "sent" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {report.status === "sent" ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No reports generated yet. The first report will be sent at 9AM WIB tomorrow.</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => triggerAgent.mutate({ agentName: "central_reporter" })}>
                      Generate Test Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function getAgentIcon(agentName: string) {
  switch (agentName) {
    case "crm_distributor":
      return <Users className="h-6 w-6 text-green-600" />;
    case "seo_builder":
      return <FileText className="h-6 w-6 text-blue-600" />;
    case "central_reporter":
      return <Mail className="h-6 w-6 text-amber-600" />;
    case "lead_hunter":
      return <Crosshair className="h-6 w-6 text-red-600" />;
    case "competitor_monitor":
      return <Shield className="h-6 w-6 text-purple-600" />;
    case "university_scout":
      return <GraduationCap className="h-6 w-6 text-indigo-600" />;
    case "seo_optimizer":
      return <Search className="h-6 w-6 text-teal-600" />;
    default:
      return <Bot className="h-6 w-6 text-gray-600" />;
  }
}

function formatAgentName(name: string): string {
  const names: Record<string, string> = {
    crm_distributor: "CRM & Follow-Up",
    seo_builder: "SEO Builder",
    central_reporter: "Central Reporter",
    lead_hunter: "Lead Hunter",
    competitor_monitor: "Competitor Monitor",
    university_scout: "University Scout",
    seo_optimizer: "SEO Optimizer",
  };
  return names[name] || name;
}

function formatReportDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** SEO Optimizer Dashboard Section */
function SeoOptimizerSection() {
  const { data: seoStats, isLoading, refetch } = trpc.agents.getSeoStats.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const triggerSeo = trpc.agents.triggerSeoOptimizer.useMutation({
    onSuccess: () => { refetch(); toast.success("SEO audit started! This may take a few minutes."); },
    onError: (err) => toast.error(err.message),
  });
  const updateRec = trpc.agents.updateSeoRecommendation.useMutation({
    onSuccess: () => { refetch(); toast.success("Recommendation updated."); },
    onError: (err) => toast.error(err.message),
  });

  const score = seoStats?.currentScore;
  const scoreColor = (s: number) => s >= 80 ? "text-green-600" : s >= 50 ? "text-yellow-600" : "text-red-600";
  const scoreBg = (s: number) => s >= 80 ? "bg-green-50 border-green-200" : s >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-teal-600" />
                SEO Optimizer
              </CardTitle>
              <CardDescription>Audits all pages for SEO health, generates AI recommendations, and tracks score over time</CardDescription>
            </div>
            <Button size="sm" onClick={() => triggerSeo.mutate()} disabled={triggerSeo.isPending}>
              {triggerSeo.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
              Run Audit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400"><RefreshCw className="h-8 w-8 mx-auto animate-spin mb-2" /><p>Loading SEO data...</p></div>
          ) : !score ? (
            <div className="text-center py-8 text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="mb-3">No SEO audit data yet. Run your first audit to see results.</p>
              <Button size="sm" onClick={() => triggerSeo.mutate()} disabled={triggerSeo.isPending}>
                <Zap className="h-4 w-4 mr-1" /> Run First Audit
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`p-4 rounded-lg border text-center ${scoreBg(score.overallScore)}`}>
                <div className={`text-3xl font-bold ${scoreColor(score.overallScore)}`}>{score.overallScore}</div>
                <div className="text-xs text-gray-500 mt-1">Overall Score</div>
              </div>
              <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 text-center">
                <div className="text-3xl font-bold text-blue-600">{score.metaScore || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Meta Tags</div>
              </div>
              <div className="p-4 rounded-lg border bg-purple-50 border-purple-200 text-center">
                <div className="text-3xl font-bold text-purple-600">{score.contentScore || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Content</div>
              </div>
              <div className="p-4 rounded-lg border bg-indigo-50 border-indigo-200 text-center">
                <div className="text-3xl font-bold text-indigo-600">{score.technicalScore || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Technical</div>
              </div>
              <div className="p-4 rounded-lg border bg-gray-50 border-gray-200 text-center">
                <div className="text-3xl font-bold text-gray-700">{score.pagesAudited}</div>
                <div className="text-xs text-gray-500 mt-1">Pages Audited</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Counts */}
      {seoStats?.issueCounts && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-red-200">
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-red-600">{seoStats.issueCounts.critical}</div>
              <div className="text-xs text-gray-500">Critical Issues</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{seoStats.issueCounts.warning}</div>
              <div className="text-xs text-gray-500">Warnings</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{seoStats.issueCounts.info}</div>
              <div className="text-xs text-gray-500">Suggestions</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Page Audit Results */}
      {seoStats?.pageAudits && seoStats.pageAudits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Page Audit Results</CardTitle>
            <CardDescription>SEO health score for each page on spectaeducation.com</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Page</th>
                    <th className="pb-2 font-medium text-center">Score</th>
                    <th className="pb-2 font-medium text-center">Meta Title</th>
                    <th className="pb-2 font-medium text-center">Meta Desc</th>
                    <th className="pb-2 font-medium text-center">OG Tags</th>
                    <th className="pb-2 font-medium text-center">H1</th>
                    <th className="pb-2 font-medium text-center">Canonical</th>
                    <th className="pb-2 font-medium text-center">Schema</th>
                    <th className="pb-2 font-medium text-right">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {seoStats.pageAudits.sort((a: any, b: any) => a.overallScore - b.overallScore).map((audit: any) => (
                    <tr key={audit.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        <div className="font-medium">{audit.pageTitle || audit.pageUrl}</div>
                        <div className="text-xs text-gray-400">{audit.pageUrl}</div>
                      </td>
                      <td className="py-2 text-center">
                        <span className={`font-bold ${scoreColor(audit.overallScore)}`}>{audit.overallScore}</span>
                      </td>
                      <td className="py-2 text-center">{audit.metaTitleScore >= 70 ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : audit.metaTitleScore > 0 ? <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}</td>
                      <td className="py-2 text-center">{audit.metaDescriptionScore >= 70 ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : audit.metaDescriptionScore > 0 ? <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}</td>
                      <td className="py-2 text-center">{audit.hasOgTitle && audit.hasOgDescription && audit.hasOgImage ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}</td>
                      <td className="py-2 text-center">{audit.h1Count === 1 ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}</td>
                      <td className="py-2 text-center">{audit.hasCanonical ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}</td>
                      <td className="py-2 text-center">{audit.hasStructuredData ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}</td>
                      <td className="py-2 text-right">
                        <Badge variant="outline" className={audit.issues?.length > 3 ? "text-red-600" : audit.issues?.length > 0 ? "text-yellow-600" : "text-green-600"}>
                          {audit.issues?.length || 0}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      {seoStats?.recommendations && seoStats.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Recommendations</CardTitle>
            <CardDescription>Actionable improvements suggested by the SEO Optimizer AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {seoStats.recommendations.map((rec: any) => (
                <div key={rec.id} className={`p-3 rounded-lg border ${
                  rec.severity === "critical" ? "border-red-200 bg-red-50" :
                  rec.severity === "warning" ? "border-yellow-200 bg-yellow-50" :
                  "border-blue-200 bg-blue-50"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          rec.severity === "critical" ? "bg-red-100 text-red-700" :
                          rec.severity === "warning" ? "bg-yellow-100 text-yellow-700" :
                          "bg-blue-100 text-blue-700"
                        }>{rec.severity}</Badge>
                        <Badge variant="outline" className="text-xs">{rec.type.replace(/_/g, " ")}</Badge>
                        <span className="text-xs text-gray-400">{rec.pageUrl}</span>
                      </div>
                      <h4 className="font-medium text-sm mt-2">{rec.title}</h4>
                      {rec.description && <p className="text-xs text-gray-600 mt-1">{rec.description}</p>}
                      {rec.suggestedValue && (
                        <div className="mt-2 p-2 bg-white rounded border text-xs">
                          <span className="text-gray-400">Suggested: </span>
                          <span className="text-green-700 font-medium">{rec.suggestedValue}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-3">
                      <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" onClick={() => updateRec.mutate({ id: rec.id, status: "applied" })}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:bg-gray-100" onClick={() => updateRec.mutate({ id: rec.id, status: "dismissed" })}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Runs */}
      {seoStats?.recentRuns && seoStats.recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audit History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {seoStats.recentRuns.map((run: any) => (
                <div key={run.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    run.status === "success" ? "bg-green-50" :
                    run.status === "failed" ? "bg-red-50" :
                    run.status === "partial" ? "bg-yellow-50" :
                    "bg-blue-50"
                  }`}>
                    {run.status === "success" ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                     run.status === "failed" ? <XCircle className="h-4 w-4 text-red-600" /> :
                     run.status === "running" ? <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" /> :
                     <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{run.summary || "SEO Audit"}</p>
                    {run.details && (
                      <p className="text-xs text-gray-400">
                        Score: {run.details.overallScore}/100 • {run.details.pagesAudited} pages • {run.details.issuesFound} issues • {run.details.recommendationsGenerated} recommendations
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(run.startedAt).toLocaleString("en-US", { timeZone: "Asia/Jakarta", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
