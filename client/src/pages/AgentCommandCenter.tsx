import { useState } from "react";
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

              {/* Competitor Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    Intelligence Alerts
                  </CardTitle>
                  <CardDescription>Recent competitor moves and strategic recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  {competitorDashboard?.recentAnalyses && competitorDashboard.recentAnalyses.length > 0 ? (
                    <div className="space-y-3">
                      {competitorDashboard.recentAnalyses.map((alert: any) => (
                        <div key={alert.id} className="p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{alert.competitorName}</span>
                                <Badge className={
                                  alert.alertType === "pricing_change" ? "bg-red-100 text-red-700" :
                                  alert.alertType === "new_program" ? "bg-blue-100 text-blue-700" :
                                  alert.alertType === "marketing_campaign" ? "bg-purple-100 text-purple-700" :
                                  alert.alertType === "partnership" ? "bg-green-100 text-green-700" :
                                  "bg-gray-100 text-gray-700"
                                }>{(alert.alertType || "").replace(/_/g, " ")}</Badge>
                                <Badge className={
                                  alert.severity === "critical" ? "bg-red-100 text-red-700" :
                                  alert.severity === "high" ? "bg-orange-100 text-orange-700" :
                                  alert.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                                  "bg-gray-100 text-gray-700"
                                }>{alert.severity}</Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                              {alert.recommendation && (
                                <div className="bg-blue-50 p-3 rounded-lg mt-2">
                                  <p className="text-xs font-medium text-blue-700 mb-1">Recommended Action:</p>
                                  <p className="text-xs text-blue-600">{alert.recommendation}</p>
                                </div>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                {alert.detectedAt ? new Date(alert.detectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {alert.status === "pending" && (
                                <Button size="sm" variant="outline" onClick={() => dismissCompetitor.mutate({ id: alert.id })}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Reviewed
                                </Button>
                              )}
                              {alert.status === "reviewed" && (
                                <Badge className="bg-green-100 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Reviewed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
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

          {/* ===== SEO CONTENT TAB ===== */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SEO Content Calendar</CardTitle>
                    <CardDescription>Articles planned, generated, and published by the SEO Agent</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => triggerAgent.mutate({ agentName: "seo_builder" })} disabled={triggerAgent.isPending}>
                    <Zap className="h-4 w-4 mr-1" />
                    Generate Now
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
