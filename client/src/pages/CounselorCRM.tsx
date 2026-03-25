import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Phone, MessageCircle, Mail, FileText, CheckCircle2, Clock, AlertCircle,
  Plus, ChevronRight, Users, TrendingUp, Target, Award, Calendar,
  Zap, Star, BarChart3, ArrowRight, RefreshCw, User, BookOpen
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type PipelineStage = "new" | "contacted" | "qualified" | "enrolled" | "in_progress" | "completed" | "lost";
type TaskPriority = "urgent" | "high" | "medium" | "low";
type TaskStatus = "pending" | "in_progress" | "done" | "skipped";

const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string; bg: string }[] = [
  { id: "new", label: "New Lead", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  { id: "contacted", label: "Contacted", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  { id: "qualified", label: "Qualified", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  { id: "in_progress", label: "In Progress", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  { id: "enrolled", label: "Enrolled", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  { id: "completed", label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  { id: "lost", label: "Lost", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  urgent: { label: "Urgent", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: "🔴" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: "🟠" },
  medium: { label: "Medium", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: "🟡" },
  low: { label: "Low", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: "🟢" },
};

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="w-3 h-3" />,
  whatsapp: <MessageCircle className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  document_request: <FileText className="w-3 h-3" />,
  follow_up: <RefreshCw className="w-3 h-3" />,
  consultation: <User className="w-3 h-3" />,
  other: <BookOpen className="w-3 h-3" />,
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CounselorCRM() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "tasks" | "performance">("pipeline");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | "all">("all");

  // Queries
  const { data: pipelineData, refetch: refetchPipeline } = trpc.crm.getMyPipeline.useQuery();
  const { data: tasksData, refetch: refetchTasks } = trpc.crm.getTodayTasks.useQuery();
  const { data: allTasksData, refetch: refetchAllTasks } = trpc.crm.getAllTasks.useQuery();
  const { data: perfData, refetch: refetchPerf } = trpc.crm.getMyPerformance.useQuery();

  // Mutations
  const updateStage = trpc.crm.updatePipelineStage.useMutation({
    onSuccess: () => { refetchPipeline(); toast.success("Stage updated"); },
  });
  const updateTask = trpc.crm.updateTask.useMutation({
    onSuccess: () => { refetchTasks(); refetchAllTasks(); toast.success("Task updated"); },
  });
  const createTask = trpc.crm.createTask.useMutation({
    onSuccess: () => { refetchTasks(); refetchAllTasks(); setNewTaskOpen(false); toast.success("Task created"); },
  });
  const deleteTask = trpc.crm.deleteTask.useMutation({
    onSuccess: () => { refetchTasks(); refetchAllTasks(); },
  });

  // Pipeline grouped by stage
  const pipelineByStage = useMemo(() => {
    const grouped: Record<PipelineStage, any[]> = {
      new: [], contacted: [], qualified: [], in_progress: [], enrolled: [], completed: [], lost: [],
    };
    ((pipelineData as any)?.pipeline || []).forEach((item: any) => {
      const stage = item.pipeline.stage as PipelineStage;
      if (grouped[stage]) grouped[stage].push(item);
    });
    return grouped;
  }, [pipelineData]);

  const todayTasks = tasksData?.tasks || [];
  const allTasks = allTasksData?.tasks || [];
  const perf = perfData?.performance?.[0];

  // New task form state
  const [taskForm, setTaskForm] = useState({
    title: "", taskType: "follow_up" as any, priority: "medium" as any,
    description: "", dueDate: "", relatedName: "",
  });

  const handleCreateTask = () => {
    if (!taskForm.title.trim()) return;
    createTask.mutate({
      title: taskForm.title,
      taskType: taskForm.taskType,
      priority: taskForm.priority,
      description: taskForm.description || undefined,
      dueDate: taskForm.dueDate || undefined,
      relatedName: taskForm.relatedName || undefined,
      relatedType: "general",
    });
  };

  const kpis = [
    { label: "Leads Assigned", value: perf?.leadsAssigned ?? 0, icon: <Users className="w-5 h-5" />, color: "text-blue-400" },
    { label: "Contacted", value: perf?.leadsContacted ?? 0, icon: <Phone className="w-5 h-5" />, color: "text-yellow-400" },
    { label: "Qualified", value: perf?.leadsQualified ?? 0, icon: <Target className="w-5 h-5" />, color: "text-purple-400" },
    { label: "Converted", value: perf?.leadsConverted ?? 0, icon: <Award className="w-5 h-5" />, color: "text-green-400" },
    { label: "Active Apps", value: perf?.applicationsActive ?? 0, icon: <BookOpen className="w-5 h-5" />, color: "text-orange-400" },
    { label: "Conversion Rate", value: `${perf?.conversionRate ?? "0.0"}%`, icon: <TrendingUp className="w-5 h-5" />, color: "text-emerald-400" },
    { label: "Tasks Done Today", value: perf?.tasksCompleted ?? 0, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-cyan-400" },
    { label: "Tasks Pending", value: perf?.tasksPending ?? 0, icon: <Clock className="w-5 h-5" />, color: "text-red-400" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1424]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/staff-dashboard">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#f59e0b]" />
                CRM Workspace
              </h1>
              <p className="text-xs text-white/40">Your daily counselor command center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              className="text-white/60 hover:text-white"
              onClick={() => { refetchPipeline(); refetchTasks(); refetchPerf(); }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold gap-2">
                  <Plus className="w-4 h-4" /> New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0d1424] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-white/70">Task Title *</Label>
                    <Input
                      placeholder="e.g. Call Ahmad about UK application"
                      className="bg-white/5 border-white/10 text-white mt-1"
                      value={taskForm.title}
                      onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/70">Type</Label>
                      <Select value={taskForm.taskType} onValueChange={v => setTaskForm(f => ({ ...f, taskType: v as any }))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                          <SelectItem value="call">📞 Call</SelectItem>
                          <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                          <SelectItem value="email">📧 Email</SelectItem>
                          <SelectItem value="follow_up">🔄 Follow Up</SelectItem>
                          <SelectItem value="consultation">👤 Consultation</SelectItem>
                          <SelectItem value="document_request">📄 Document Request</SelectItem>
                          <SelectItem value="other">📋 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white/70">Priority</Label>
                      <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v as any }))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                          <SelectItem value="urgent">🔴 Urgent</SelectItem>
                          <SelectItem value="high">🟠 High</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="low">🟢 Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/70">Student Name (optional)</Label>
                    <Input
                      placeholder="e.g. Ahmad Fauzi"
                      className="bg-white/5 border-white/10 text-white mt-1"
                      value={taskForm.relatedName}
                      onChange={e => setTaskForm(f => ({ ...f, relatedName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-white/70">Due Date (optional)</Label>
                    <Input
                      type="datetime-local"
                      className="bg-white/5 border-white/10 text-white mt-1"
                      value={taskForm.dueDate}
                      onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-white/70">Notes (optional)</Label>
                    <Textarea
                      placeholder="Additional context..."
                      className="bg-white/5 border-white/10 text-white mt-1 resize-none"
                      rows={2}
                      value={taskForm.description}
                      onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <Button
                    className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold"
                    onClick={handleCreateTask}
                    disabled={createTask.isPending || !taskForm.title.trim()}
                  >
                    {createTask.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-[1600px] mx-auto px-6 flex gap-1 pb-0">
          {[
            { id: "pipeline", label: "Pipeline", icon: <BarChart3 className="w-4 h-4" /> },
            { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, badge: todayTasks.length },
            { id: "performance", label: "Performance", icon: <TrendingUp className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#f59e0b] text-[#f59e0b]"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-[#f59e0b] text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {kpis.map((kpi, i) => (
            <Card key={i} className="bg-[#0d1424]/80 border-white/10">
              <CardContent className="p-3 text-center">
                <div className={`flex justify-center mb-1 ${kpi.color}`}>{kpi.icon}</div>
                <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-xs text-white/40 leading-tight">{kpi.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Pipeline Tab ── */}
        {activeTab === "pipeline" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Lead Pipeline</h2>
              <div className="flex gap-2">
                <Button
                  variant="ghost" size="sm"
                  className={`text-xs ${selectedStage === "all" ? "text-[#f59e0b]" : "text-white/50"}`}
                  onClick={() => setSelectedStage("all")}
                >All</Button>
                {PIPELINE_STAGES.slice(0, 4).map(s => (
                  <Button
                    key={s.id}
                    variant="ghost" size="sm"
                    className={`text-xs ${selectedStage === s.id ? s.color : "text-white/50"}`}
                    onClick={() => setSelectedStage(s.id)}
                  >{s.label}</Button>
                ))}
              </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {PIPELINE_STAGES.map(stage => {
                const leads = pipelineByStage[stage.id] || [];
                if (selectedStage !== "all" && selectedStage !== stage.id) return null;
                return (
                  <div key={stage.id} className={`rounded-xl border p-3 min-h-[200px] ${stage.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                      <span className={`text-xs rounded-full px-2 py-0.5 ${stage.bg} ${stage.color} border`}>
                        {leads.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {leads.map((item: any) => (
                        <LeadCard
                          key={item.lead.id}
                          item={item}
                          stages={PIPELINE_STAGES}
                          onStageChange={(leadId, newStage) => updateStage.mutate({ leadId, stage: newStage })}
                        />
                      ))}
                      {leads.length === 0 && (
                        <div className="text-center text-white/20 text-xs py-4">No leads</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tasks Tab ── */}
        {activeTab === "tasks" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Tasks */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#f59e0b]" />
                Today's Tasks
                <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30">{todayTasks.length}</Badge>
              </h2>
              <div className="space-y-2">
                {todayTasks.length === 0 ? (
                  <Card className="bg-[#0d1424]/80 border-white/10">
                    <CardContent className="p-6 text-center text-white/40">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      <p className="text-sm">All caught up! No tasks for today.</p>
                    </CardContent>
                  </Card>
                ) : (
                  todayTasks.map((task: any) => (
                    <TaskCard key={task.id} task={task} onUpdate={(id, status) => updateTask.mutate({ id, status })} onDelete={(id) => deleteTask.mutate({ id })} />
                  ))
                )}
              </div>
            </div>

            {/* All Pending Tasks */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                All Pending
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  {allTasks.filter((t: any) => t.status === "pending" || t.status === "in_progress").length}
                </Badge>
              </h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {allTasks
                  .filter((t: any) => t.status === "pending" || t.status === "in_progress")
                  .map((task: any) => (
                    <TaskCard key={task.id} task={task} onUpdate={(id, status) => updateTask.mutate({ id, status })} onDelete={(id) => deleteTask.mutate({ id })} />
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Performance Tab ── */}
        {activeTab === "performance" && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#f59e0b]" />
              My Performance (Last 30 Days)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {kpis.map((kpi, i) => (
                <Card key={i} className="bg-[#0d1424]/80 border-white/10">
                  <CardContent className="p-5">
                    <div className={`flex items-center gap-3 mb-2 ${kpi.color}`}>
                      {kpi.icon}
                      <span className="text-sm text-white/60">{kpi.label}</span>
                    </div>
                    <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Performance History */}
            {(perfData?.performance?.length ?? 0) > 1 && (
              <Card className="bg-[#0d1424]/80 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#f59e0b]" />
                    Performance History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/40 border-b border-white/10">
                          <th className="text-left py-2 pr-4">Date</th>
                          <th className="text-right py-2 pr-4">Assigned</th>
                          <th className="text-right py-2 pr-4">Contacted</th>
                          <th className="text-right py-2 pr-4">Qualified</th>
                          <th className="text-right py-2 pr-4">Converted</th>
                          <th className="text-right py-2">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {perfData?.performance?.slice(0, 10).map((p: any, i: number) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-2 pr-4 text-white/60">{p.snapshotDate}</td>
                            <td className="py-2 pr-4 text-right text-blue-400">{p.leadsAssigned}</td>
                            <td className="py-2 pr-4 text-right text-yellow-400">{p.leadsContacted}</td>
                            <td className="py-2 pr-4 text-right text-purple-400">{p.leadsQualified}</td>
                            <td className="py-2 pr-4 text-right text-green-400">{p.leadsConverted}</td>
                            <td className="py-2 text-right text-emerald-400 font-semibold">{p.conversionRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lead Card Component ──────────────────────────────────────────────────────
function LeadCard({ item, stages, onStageChange }: {
  item: any;
  stages: typeof PIPELINE_STAGES;
  onStageChange: (leadId: number, stage: PipelineStage) => void;
}) {
  const [showMove, setShowMove] = useState(false);
  const lead = item.lead;
  const pipeline = item.pipeline;
  const score = pipeline.leadScore ?? 50;
  const scoreColor = score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="bg-[#0a0f1e]/80 border border-white/10 rounded-lg p-2.5 text-xs hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="font-medium text-white truncate flex-1">{lead.studentName}</span>
        <span className={`font-bold ${scoreColor} shrink-0`}>{score}</span>
      </div>
      {lead.preferredCountry && (
        <div className="text-white/40 mb-1.5">🌍 {lead.preferredCountry}</div>
      )}
      <div className="flex items-center gap-1 flex-wrap">
        <Link href={`/crm/lead/${lead.id}`}>
          <button className="text-[#f59e0b] hover:text-[#d97706] flex items-center gap-0.5">
            View <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
        <button
          className="text-white/40 hover:text-white ml-auto"
          onClick={() => setShowMove(!showMove)}
        >
          Move →
        </button>
      </div>
      {showMove && (
        <div className="mt-2 grid grid-cols-2 gap-1">
          {stages.filter(s => s.id !== pipeline.stage).map(s => (
            <button
              key={s.id}
              className={`text-xs px-1.5 py-1 rounded border ${s.bg} ${s.color} hover:opacity-80`}
              onClick={() => { onStageChange(lead.id, s.id); setShowMove(false); }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task Card Component ──────────────────────────────────────────────────────
function TaskCard({ task, onUpdate, onDelete }: {
  task: any;
  onUpdate: (id: number, status: TaskStatus) => void;
  onDelete: (id: number) => void;
}) {
  const priority = PRIORITY_CONFIG[task.priority as TaskPriority] ?? PRIORITY_CONFIG.medium;
  const isDone = task.status === "done";
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;

  return (
    <div className={`bg-[#0d1424]/80 border rounded-lg p-3 transition-all ${
      isDone ? "border-white/5 opacity-50" : isOverdue ? "border-red-500/30" : "border-white/10 hover:border-white/20"
    }`}>
      <div className="flex items-start gap-3">
        <button
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            isDone ? "bg-green-500 border-green-500" : "border-white/30 hover:border-green-400"
          }`}
          onClick={() => onUpdate(task.id, isDone ? "pending" : "done")}
        >
          {isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isDone ? "line-through text-white/40" : "text-white"}`}>
              {task.title}
            </span>
            <Badge className={`text-xs px-1.5 py-0 border ${priority.color}`}>
              {priority.icon} {priority.label}
            </Badge>
          </div>
          {task.relatedName && (
            <div className="text-xs text-white/50 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" /> {task.relatedName}
            </div>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-white/40">
              {TASK_TYPE_ICONS[task.taskType] ?? TASK_TYPE_ICONS.other}
              {task.taskType.replace("_", " ")}
            </span>
            {task.dueDate && (
              <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-white/40"}`}>
                <Clock className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {task.isAiGenerated && (
              <span className="text-xs text-purple-400 flex items-center gap-1">
                <Star className="w-3 h-3" /> AI
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {!isDone && (
            <button
              className="text-xs text-white/30 hover:text-yellow-400 transition-colors"
              onClick={() => onUpdate(task.id, "in_progress")}
              title="Mark in progress"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
          <button
            className="text-xs text-white/30 hover:text-red-400 transition-colors"
            onClick={() => onDelete(task.id)}
            title="Delete task"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
