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
  ArrowLeft, Zap, BarChart3, Send, Eye
} from "lucide-react";

export default function AgentCommandCenter() {
  const { user, isLoading: authLoading } = useAuth() as any;
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: dashboardStats, isLoading, refetch } = trpc.agents.getDashboardStats.useQuery(undefined, {
    refetchInterval: 30000, // refresh every 30s
  });
  const { data: runLogs } = trpc.agents.getRunLogs.useQuery({ limit: 50 });
  const { data: assignments } = trpc.agents.getLeadAssignments.useQuery({});
  const { data: seoContent } = trpc.agents.getSeoContent.useQuery({});
  const { data: dailyReports } = trpc.agents.getDailyReports.useQuery({ limit: 7 });

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
                <p className="text-red-100 text-sm mt-1">Monitor and control your AI workforce</p>
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
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Leads Assigned</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.leads?.total || 0}</p>
                </div>
                <Users className="h-10 w-10 text-red-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{stats?.leads?.active || 0} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Converted</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.leads?.converted || 0}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{stats?.leads?.total ? Math.round((stats.leads.converted / stats.leads.total) * 100) : 0}% conversion rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Escalated</p>
                  <p className="text-3xl font-bold text-amber-600">{stats?.leads?.escalated || 0}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-amber-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Needs attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">SEO Articles</p>
                  <p className="text-3xl font-bold text-blue-600">{stats?.seo?.published || 0}</p>
                </div>
                <FileText className="h-10 w-10 text-blue-100" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{stats?.seo?.inProgress || 0} in progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview"><Bot className="h-4 w-4 mr-2" />Agents</TabsTrigger>
            <TabsTrigger value="leads"><Users className="h-4 w-4 mr-2" />Lead Pipeline</TabsTrigger>
            <TabsTrigger value="seo"><FileText className="h-4 w-4 mr-2" />SEO Content</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="h-4 w-4 mr-2" />Activity Log</TabsTrigger>
            <TabsTrigger value="reports"><Mail className="h-4 w-4 mr-2" />Daily Reports</TabsTrigger>
          </TabsList>

          {/* Agents Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-4">
              {stats?.agents?.map((agent: any) => {
                const lastRun = stats.recentRuns?.find((r: any) => r.agentName === agent.agentName);
                return (
                  <Card key={agent.agentName}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${agent.isActive ? "bg-green-50" : "bg-gray-100"}`}>
                            <Bot className={`h-6 w-6 ${agent.isActive ? "text-green-600" : "text-gray-400"}`} />
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

          {/* Lead Pipeline Tab */}
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
                                a.status === "in_progress" ? "bg-purple-100 text-purple-700" :
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

          {/* SEO Content Tab */}
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

          {/* Activity Log Tab */}
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

          {/* Daily Reports Tab */}
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

function formatAgentName(name: string): string {
  const names: Record<string, string> = {
    crm_distributor: "CRM & Follow-Up",
    seo_builder: "SEO Builder",
    central_reporter: "Central Reporter",
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
