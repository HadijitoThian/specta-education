import { useState } from "react";
import React from "react";
import { useRoute, Link } from "wouter";
import AICounselorAssistant from "@/components/AICounselorAssistant";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone, MessageCircle, Mail, FileText, ChevronRight, User, Globe,
  GraduationCap, Calendar, Clock, CheckCircle2, AlertCircle, Plus,
  BookOpen, Star, ArrowRight, TrendingUp, Zap, RefreshCw, ExternalLink, Brain, Lightbulb
} from "lucide-react";

type PipelineStage = "new" | "contacted" | "qualified" | "enrolled" | "in_progress" | "completed" | "lost";

const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string; bg: string }[] = [
  { id: "new", label: "New Lead", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  { id: "contacted", label: "Contacted", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  { id: "qualified", label: "Qualified", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  { id: "in_progress", label: "In Progress", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  { id: "enrolled", label: "Enrolled", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  { id: "completed", label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  { id: "lost", label: "Lost", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
];

export default function StudentProfile360() {
  const [, params] = useRoute("/crm/lead/:id");
  const leadId = parseInt(params?.id ?? "0");

  const [noteOpen, setNoteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [scoreExplainOpen, setScoreExplainOpen] = useState(false);
  const [scoreExplanation, setScoreExplanation] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "tasks" | "documents" | "appointments" | "timeline" | "applications" | "ai">("overview");

  // Queries
  const { data: leadData, refetch: refetchLead } = trpc.crm.getLeadWithPipeline.useQuery({ leadId }, { enabled: leadId > 0 });
  const { data: notesData, refetch: refetchNotes } = trpc.crm.getNotesByLead.useQuery({ leadId }, { enabled: leadId > 0 });
  const { data: tasksData, refetch: refetchTasks } = trpc.crm.getAllTasks.useQuery();
  const { data: appsData } = trpc.application.getAll.useQuery(undefined, { enabled: leadId > 0 });

  // Mutations
  const addNote = trpc.crm.addConsultationNote.useMutation({
    onSuccess: () => { refetchNotes(); setNoteOpen(false); toast.success("Note saved & AI expanded!"); },
    onError: (e) => toast.error(e.message),
  });
  const createTask = trpc.crm.createTask.useMutation({
    onSuccess: () => { refetchTasks(); setTaskOpen(false); toast.success("Task created"); },
  });
  const updateStage = trpc.crm.updatePipelineStage.useMutation({
    onSuccess: () => { refetchLead(); setStageOpen(false); toast.success("Stage updated"); },
  });
  const updateTask = trpc.crm.updateTask.useMutation({
    onSuccess: () => refetchTasks(),
  });
  const explainScore = trpc.crm.explainScore.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setScoreExplanation(String(data.explanation || ""));
        setScoreExplainOpen(true);
      } else {
        toast.error(String(data.explanation || "Failed to generate explanation"));
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Note form
  const [noteForm, setNoteForm] = useState({
    rawNote: "", consultationType: "call" as any, outcome: "neutral" as any,
    durationMinutes: "", nextStepAction: "", nextStepDueDate: "",
  });

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: "", taskType: "follow_up" as any, priority: "medium" as any, dueDate: "",
  });

  const lead = (leadData as any)?.lead;
  const pipeline = (leadData as any)?.pipeline;
  const notes = (notesData as any)?.notes || [];
  const applications = (appsData as any)?.applications || [];
  const allTasks = (tasksData as any)?.tasks || [];
  const leadTasks = allTasks.filter((t: any) => t.relatedType === "lead" && t.relatedId === leadId);

  const currentStage = PIPELINE_STAGES.find(s => s.id === (pipeline?.stage ?? "new")) ?? PIPELINE_STAGES[0];

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-white/40 text-center">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Loading student profile...</p>
        </div>
      </div>
    );
  }

  const handleAddNote = () => {
    if (!noteForm.rawNote.trim()) return;
    addNote.mutate({
      relatedType: "lead",
      relatedId: leadId,
      studentName: lead.studentName,
      rawNote: noteForm.rawNote,
      consultationType: noteForm.consultationType,
      outcome: noteForm.outcome,
      durationMinutes: noteForm.durationMinutes ? parseInt(noteForm.durationMinutes) : undefined,
      nextStepAction: noteForm.nextStepAction || undefined,
      nextStepDueDate: noteForm.nextStepDueDate || undefined,
    });
  };

  const handleCreateTask = () => {
    if (!taskForm.title.trim()) return;
    createTask.mutate({
      title: taskForm.title,
      taskType: taskForm.taskType,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate || undefined,
      relatedType: "lead",
      relatedId: leadId,
      relatedName: lead.studentName,
    });
  };

  const scoreColor = (pipeline?.leadScore ?? 50) >= 70 ? "text-green-400" : (pipeline?.leadScore ?? 50) >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1424]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            <Link href="/crm">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" />
                CRM
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-base sm:text-xl font-bold text-white truncate">{lead.studentName}</h1>
              <p className="text-xs text-white/40 hidden sm:block truncate">{lead.email} · {lead.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick Action Buttons */}
              {lead.phone && (
                <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 px-2 sm:px-3">
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`}>
                  <Button size="sm" variant="outline" className="border-white/20 text-white gap-1 px-2 sm:px-3">
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">Call</span>
                  </Button>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`}>
                  <Button size="sm" variant="outline" className="border-white/20 text-white gap-1 px-2 sm:px-3 hidden sm:flex">
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">Email</span>
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column: Student Info + Quick Actions ── */}
          <div className="space-y-4">
            {/* Profile Card */}
            <Card className="bg-[#0d1424]/80 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-black font-bold text-lg">
                    {lead.studentName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{lead.studentName}</div>
                    <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${scoreColor}`}>Score: {pipeline?.leadScore ?? 50}/100</span>
                    <button
                      onClick={() => explainScore.mutate({ leadId })}
                      disabled={explainScore.isPending}
                      className="text-white/30 hover:text-[#f59e0b] transition-colors"
                      title="AI: Explain this score"
                    >
                      {explainScore.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  </div>
                </div>

                {/* Pipeline Stage */}
                <div className="mb-4">
                  <div className="text-xs text-white/40 mb-2">Pipeline Stage</div>
                  <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${currentStage.bg}`}>
                    <span className={`text-sm font-medium ${currentStage.color}`}>{currentStage.label}</span>
                    <Dialog open={stageOpen} onOpenChange={setStageOpen}>
                      <DialogTrigger asChild>
                        <button className="text-xs text-white/40 hover:text-white">Change →</button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#0d1424] border-white/10 text-white">
                        <DialogHeader><DialogTitle>Move to Stage</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {PIPELINE_STAGES.filter(s => s.id !== currentStage.id).map(s => (
                            <button
                              key={s.id}
                              className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${s.bg} ${s.color} hover:opacity-80 transition-opacity`}
                              onClick={() => updateStage.mutate({ leadId, stage: s.id })}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="space-y-2 text-sm">
                  {lead.preferredCountry && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Globe className="w-4 h-4 text-[#f59e0b]" />
                      <span>{lead.preferredCountry}</span>
                    </div>
                  )}
                  {lead.studyLevel && (
                    <div className="flex items-center gap-2 text-white/70">
                      <GraduationCap className="w-4 h-4 text-[#f59e0b]" />
                      <span>{lead.studyLevel}</span>
                    </div>
                  )}
                  {(lead as any).programInterest && (
                    <div className="flex items-center gap-2 text-white/70">
                      <BookOpen className="w-4 h-4 text-[#f59e0b]" />
                      <span>{(lead as any).programInterest}</span>
                    </div>
                  )}
                  {lead.source && (
                    <div className="flex items-center gap-2 text-white/70">
                      <TrendingUp className="w-4 h-4 text-[#f59e0b]" />
                      <span>Source: {lead.source}</span>
                    </div>
                  )}
                  {lead.assignedCounselor && (
                    <div className="flex items-center gap-2 text-white/70">
                      <User className="w-4 h-4 text-[#f59e0b]" />
                      <span>{lead.assignedCounselor}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-white/40">
                    <Calendar className="w-4 h-4" />
                    <span>Added {new Date(lead.createdAt).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-[#0d1424]/80 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#f59e0b]" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {/* Add Note */}
                <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30 justify-start gap-2" variant="outline">
                      <BookOpen className="w-4 h-4" /> Add Consultation Note
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0d1424] border-white/10 text-white max-w-lg">
                    <DialogHeader><DialogTitle>Add Consultation Note</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-white/70">Type</Label>
                          <Select value={noteForm.consultationType} onValueChange={v => setNoteForm(f => ({ ...f, consultationType: v as any }))}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                              <SelectItem value="call">📞 Phone Call</SelectItem>
                              <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                              <SelectItem value="in_person">🤝 In Person</SelectItem>
                              <SelectItem value="email">📧 Email</SelectItem>
                              <SelectItem value="online_meeting">💻 Online Meeting</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-white/70">Outcome</Label>
                          <Select value={noteForm.outcome} onValueChange={v => setNoteForm(f => ({ ...f, outcome: v as any }))}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                              <SelectItem value="positive">✅ Positive</SelectItem>
                              <SelectItem value="neutral">➡️ Neutral</SelectItem>
                              <SelectItem value="negative">❌ Negative</SelectItem>
                              <SelectItem value="no_answer">📵 No Answer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-white/70">Duration (minutes)</Label>
                        <Input
                          type="number" placeholder="e.g. 15"
                          className="bg-white/5 border-white/10 text-white mt-1"
                          value={noteForm.durationMinutes}
                          onChange={e => setNoteForm(f => ({ ...f, durationMinutes: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className="text-white/70">Your Notes *</Label>
                        <Textarea
                          placeholder="Write your brief notes here... AI will expand them into a professional record."
                          className="bg-white/5 border-white/10 text-white mt-1 resize-none"
                          rows={4}
                          value={noteForm.rawNote}
                          onChange={e => setNoteForm(f => ({ ...f, rawNote: e.target.value }))}
                        />
                        <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                          <Star className="w-3 h-3" /> AI will automatically expand your notes into a professional record
                        </p>
                      </div>
                      <div>
                        <Label className="text-white/70">Next Step Action (optional)</Label>
                        <Input
                          placeholder="e.g. Send IELTS brochure, Follow up in 3 days"
                          className="bg-white/5 border-white/10 text-white mt-1"
                          value={noteForm.nextStepAction}
                          onChange={e => setNoteForm(f => ({ ...f, nextStepAction: e.target.value }))}
                        />
                      </div>
                      {noteForm.nextStepAction && (
                        <div>
                          <Label className="text-white/70">Next Step Due Date</Label>
                          <Input
                            type="datetime-local"
                            className="bg-white/5 border-white/10 text-white mt-1"
                            value={noteForm.nextStepDueDate}
                            onChange={e => setNoteForm(f => ({ ...f, nextStepDueDate: e.target.value }))}
                          />
                        </div>
                      )}
                      <Button
                        className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold"
                        onClick={handleAddNote}
                        disabled={addNote.isPending || !noteForm.rawNote.trim()}
                      >
                        {addNote.isPending ? "Saving & AI Expanding..." : "Save Note"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Add Task */}
                <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 justify-start gap-2" variant="outline">
                      <CheckCircle2 className="w-4 h-4" /> Create Follow-up Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0d1424] border-white/10 text-white">
                    <DialogHeader><DialogTitle>Create Task for {lead.studentName}</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label className="text-white/70">Task *</Label>
                        <Input
                          placeholder="e.g. Send UK university brochure"
                          className="bg-white/5 border-white/10 text-white mt-1"
                          value={taskForm.title}
                          onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-white/70">Type</Label>
                          <Select value={taskForm.taskType} onValueChange={v => setTaskForm(f => ({ ...f, taskType: v as any }))}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                              <SelectItem value="call">📞 Call</SelectItem>
                              <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                              <SelectItem value="email">📧 Email</SelectItem>
                              <SelectItem value="follow_up">🔄 Follow Up</SelectItem>
                              <SelectItem value="document_request">📄 Document Request</SelectItem>
                              <SelectItem value="consultation">👤 Consultation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-white/70">Priority</Label>
                          <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v as any }))}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
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
                        <Label className="text-white/70">Due Date</Label>
                        <Input type="datetime-local" className="bg-white/5 border-white/10 text-white mt-1" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
                      </div>
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        onClick={handleCreateTask}
                        disabled={createTask.isPending || !taskForm.title.trim()}
                      >
                        {createTask.isPending ? "Creating..." : "Create Task"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {lead.phone && (
                  <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}?text=Halo ${lead.studentName}, saya dari SpecTa Education ingin menindaklanjuti konsultasi studi luar negeri Anda.`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-600/30 justify-start gap-2" variant="outline">
                      <MessageCircle className="w-4 h-4" /> WhatsApp with Template
                    </Button>
                  </a>
                )}
                <ParentReportButton lead={lead} leadId={leadId} />
              </CardContent>
            </Card>

            {/* Lead Tasks Summary */}
            <Card className="bg-[#0d1424]/80 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-400" /> Tasks ({leadTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {leadTasks.length === 0 ? (
                  <p className="text-xs text-white/30">No tasks yet</p>
                ) : (
                  leadTasks.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="flex items-center gap-2">
                      <button
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${task.status === "done" ? "bg-green-500 border-green-500" : "border-white/30"}`}
                        onClick={() => updateTask.mutate({ id: task.id, status: task.status === "done" ? "pending" : "done" })}
                      >
                        {task.status === "done" && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <span className={`text-xs flex-1 truncate ${task.status === "done" ? "line-through text-white/30" : "text-white/70"}`}>
                        {task.title}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right Column: Tabs ── */}
          <div className="lg:col-span-2">
            {/* Tab Nav */}
            <div className="flex gap-1 border-b border-white/10 mb-4">
              {[
                { id: "overview", label: "Overview", icon: <User className="w-4 h-4" /> },
                { id: "notes", label: `Notes (${notes.length})`, icon: <BookOpen className="w-4 h-4" /> },
                { id: "tasks", label: `Tasks (${leadTasks.length})`, icon: <CheckCircle2 className="w-4 h-4" /> },
                { id: "documents", label: "📄 Documents", icon: null },
                { id: "appointments", label: "📅 Appointments", icon: null },
                { id: "timeline", label: "🕐 Timeline", icon: null },
                { id: "applications", label: `Applications (${applications.length})`, icon: <FileText className="w-4 h-4" /> },
                { id: "ai", label: "🤖 AI Assistant", icon: null },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id ? "border-[#f59e0b] text-[#f59e0b]" : "border-transparent text-white/50 hover:text-white/80"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <Card className="bg-[#0d1424]/80 border-white/10">
                  <CardHeader><CardTitle className="text-white text-sm">Student Information</CardTitle></CardHeader>
                  <CardContent className="p-5 pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {[
                        { label: "Full Name", value: lead.studentName },
                        { label: "Email", value: lead.email },
                        { label: "Phone", value: lead.phone },
                        { label: "Preferred Country", value: lead.preferredCountry },
                        { label: "Study Level", value: lead.studyLevel },
                        { label: "Program / Major", value: (lead as any).programInterest },
                        { label: "Budget", value: lead.budget },
                        { label: "IELTS Score", value: lead.ieltsScore },
                        { label: "Source", value: lead.source },
                        { label: "Status", value: lead.status },
                        { label: "Assigned Counselor", value: lead.assignedCounselor },
                      ].filter(f => f.value).map((field, i) => (
                        <div key={i}>
                          <div className="text-white/40 text-xs mb-0.5">{field.label}</div>
                          <div className="text-white font-medium">{field.value}</div>
                        </div>
                      ))}
                    </div>
                    {lead.notes && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="text-white/40 text-xs mb-1">Initial Notes</div>
                        <p className="text-white/70 text-sm">{lead.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pipeline Progress */}
                <Card className="bg-[#0d1424]/80 border-white/10">
                  <CardHeader><CardTitle className="text-white text-sm">Pipeline Progress</CardTitle></CardHeader>
                  <CardContent className="p-5 pt-0">
                    <div className="flex items-center gap-1">
                      {PIPELINE_STAGES.filter(s => s.id !== "lost").map((stage, i, arr) => {
                        const stageOrder = ["new", "contacted", "qualified", "in_progress", "enrolled", "completed"];
                        const currentIdx = stageOrder.indexOf(pipeline?.stage ?? "new");
                        const thisIdx = stageOrder.indexOf(stage.id);
                        const isActive = stage.id === pipeline?.stage;
                        const isPast = thisIdx < currentIdx;
                        return (
                          <div key={stage.id} className="flex items-center flex-1">
                            <div className={`flex-1 text-center py-1.5 rounded text-xs font-medium transition-all ${
                              isActive ? `${stage.bg} ${stage.color} border` :
                              isPast ? "bg-white/10 text-white/60" : "bg-white/5 text-white/20"
                            }`}>
                              {stage.label}
                            </div>
                            {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-white/20 shrink-0 mx-0.5" />}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-medium">Consultation History</h3>
                  <Button size="sm" className="bg-[#f59e0b] hover:bg-[#d97706] text-black gap-2" onClick={() => setNoteOpen(true)}>
                    <Plus className="w-4 h-4" /> Add Note
                  </Button>
                </div>
                {notes.length === 0 ? (
                  <Card className="bg-[#0d1424]/80 border-white/10">
                    <CardContent className="p-8 text-center text-white/40">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No consultation notes yet. Add your first note above.</p>
                    </CardContent>
                  </Card>
                ) : (
                  notes.map((note: any) => (
                    <Card key={note.id} className="bg-[#0d1424]/80 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-xs ${
                              note.outcome === "positive" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                              note.outcome === "negative" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              note.outcome === "no_answer" ? "bg-gray-500/20 text-gray-400 border-gray-500/30" :
                              "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            }`}>
                              {note.outcome === "positive" ? "✅" : note.outcome === "negative" ? "❌" : note.outcome === "no_answer" ? "📵" : "➡️"} {note.outcome}
                            </Badge>
                            <Badge className="text-xs bg-white/10 text-white/60 border-white/20">
                              {note.consultationType}
                            </Badge>
                            {note.durationMinutes && (
                              <Badge className="text-xs bg-white/10 text-white/60 border-white/20">
                                {note.durationMinutes} min
                              </Badge>
                            )}
                            {note.isAiExpanded && (
                              <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                                <Star className="w-2.5 h-2.5 mr-1" /> AI Expanded
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-white/30 shrink-0">
                            {new Date(note.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                          {note.expandedNote || note.rawNote}
                        </div>
                        {note.nextStepAction && (
                          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-[#f59e0b]">
                            <ArrowRight className="w-3 h-3" />
                            <span className="font-medium">Next: </span>
                            <span>{note.nextStepAction}</span>
                            {note.nextStepDueDate && (
                              <span className="text-white/40">· {new Date(note.nextStepDueDate).toLocaleDateString("id-ID")}</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-medium">Tasks for {lead.studentName}</h3>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setTaskOpen(true)}>
                    <Plus className="w-4 h-4" /> Add Task
                  </Button>
                </div>
                {leadTasks.length === 0 ? (
                  <Card className="bg-[#0d1424]/80 border-white/10">
                    <CardContent className="p-8 text-center text-white/40">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No tasks yet. Create a follow-up task above.</p>
                    </CardContent>
                  </Card>
                ) : (
                  leadTasks.map((task: any) => (
                    <Card key={task.id} className={`bg-[#0d1424]/80 border ${task.status === "done" ? "border-white/5 opacity-60" : "border-white/10"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <button
                            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${task.status === "done" ? "bg-green-500 border-green-500" : "border-white/30 hover:border-green-400"}`}
                            onClick={() => updateTask.mutate({ id: task.id, status: task.status === "done" ? "pending" : "done" })}
                          >
                            {task.status === "done" && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </button>
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${task.status === "done" ? "line-through text-white/40" : "text-white"}`}>{task.title}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                              <span>{task.taskType.replace("_", " ")}</span>
                              {task.dueDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(task.dueDate).toLocaleDateString("id-ID")}</span>}
                              {task.isAiGenerated && <span className="text-purple-400 flex items-center gap-1"><Star className="w-3 h-3" /> AI</span>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Applications Tab */}
            {activeTab === "applications" && (
              <div className="space-y-3">
                <h3 className="text-white font-medium">Applications ({applications.length})</h3>
                {applications.length === 0 ? (
                  <Card className="bg-[#0d1424]/80 border-white/10">
                    <CardContent className="p-8 text-center text-white/40">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No applications yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  applications.map((app: any) => (
                    <Card key={app.id} className="bg-[#0d1424]/80 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-white">{app.universityName || "University"}</div>
                            <div className="text-sm text-white/50">{app.programName} · {app.country}</div>
                            <div className="text-xs text-white/30 mt-1">Ref: {app.referenceNumber}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={`text-xs ${
                              app.status === "approved" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                              app.status === "rejected" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            }`}>{app.status}</Badge>
                            <Link href={`/staff-dashboard/applications/${app.id}`}>
                              <button className="text-xs text-[#f59e0b] flex items-center gap-1">
                                View <ExternalLink className="w-3 h-3" />
                              </button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ── Documents Tab ── */}
            {activeTab === "documents" && (
              <DocumentChecklist leadId={leadId} />
            )}

            {/* ── Appointments Tab ── */}
            {activeTab === "appointments" && (
              <AppointmentsPanel leadId={leadId} studentName={lead.studentName} studentEmail={lead.studentEmail} studentPhone={lead.studentPhone} />
            )}

            {/* ── Timeline Tab ── */}
            {activeTab === "timeline" && (
              <ActivityTimeline leadId={leadId} />
            )}

            {/* ── AI Assistant Tab ── */}
            {activeTab === "ai" && (
              <div className="h-full" style={{ minHeight: "560px" }}>
                <AICounselorAssistant
                  leadId={leadId}
                  studentName={lead.studentName}
                  preferredCountry={lead.preferredCountry}
                  studyLevel={lead.studyLevel}
                />
              </div>
            )}
           </div>
        </div>
      </div>

      {/* ── Score Explanation Modal ── */}
      <Dialog open={scoreExplainOpen} onOpenChange={setScoreExplainOpen}>
        <DialogContent className="bg-[#0d1424] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#f59e0b]" />
              AI Score Explanation
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/5">
              <div className={`text-2xl font-bold ${scoreColor}`}>{pipeline?.leadScore ?? 50}</div>
              <div>
                <div className="text-xs text-white/40">Current Lead Score</div>
                <div className="text-sm text-white/70">{lead.studentName}</div>
              </div>
            </div>
            <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{scoreExplanation}</div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
              <Button size="sm" onClick={() => setScoreExplainOpen(false)} className="bg-[#e91e8c] hover:bg-[#c2185b]">
                Got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ─── Document Checklist Component ────────────────────────────────────────────
function DocumentChecklist({ leadId }: { leadId: number }) {
  const { data, refetch } = trpc.crm.getDocChecklist.useQuery({ leadId });
  const initMut = trpc.crm.initDocChecklist.useMutation({ onSuccess: () => refetch() });
  const updateMut = trpc.crm.updateDocStatus.useMutation({ onSuccess: () => refetch() });
  const docs = (data as any)?.docs || [];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    submitted: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    verified: "bg-green-500/20 text-green-300 border-green-500/30",
    rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  const statusIcons: Record<string, string> = { pending: "⏳", submitted: "📤", verified: "✅", rejected: "❌" };
  const submitted = docs.filter((d: any) => d.status === "submitted" || d.status === "verified").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Document Checklist</h3>
          <p className="text-white/50 text-xs mt-1">{submitted}/{docs.length} documents ready</p>
        </div>
        {docs.length === 0 && (
          <button onClick={() => initMut.mutate({ leadId })} disabled={initMut.isPending}
            className="px-3 py-1.5 bg-[#e91e8c] text-white text-xs rounded-lg hover:bg-[#c2185b] transition-colors">
            {initMut.isPending ? "Initializing..." : "Initialize Checklist"}
          </button>
        )}
      </div>
      {docs.length > 0 && (
        <div className="w-full bg-white/10 rounded-full h-2 mb-4">
          <div className="bg-gradient-to-r from-[#e91e8c] to-[#f59e0b] h-2 rounded-full transition-all"
            style={{ width: `${docs.length > 0 ? (submitted / docs.length) * 100 : 0}%` }} />
        </div>
      )}
      {docs.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <p className="text-4xl mb-3">📋</p>
          <p>No documents yet. Click "Initialize Checklist" to add the standard 8 documents.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-lg">{statusIcons[doc.status] || "📄"}</span>
                <div>
                  <p className="text-white text-sm font-medium">{doc.docLabel}</p>
                  {doc.notes && <p className="text-white/40 text-xs mt-0.5">{doc.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[doc.status]}`}>{doc.status}</span>
                <select
                  value={doc.status}
                  onChange={e => updateMut.mutate({ leadId, docType: doc.docType, docLabel: doc.docLabel, status: e.target.value as any })}
                  className="text-xs bg-white/10 border border-white/20 text-white rounded px-2 py-1">
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Appointments Panel Component ────────────────────────────────────────────
function AppointmentsPanel({ leadId, studentName, studentEmail, studentPhone }: { leadId: number; studentName: string; studentEmail?: string; studentPhone?: string }) {
  const { data, refetch } = trpc.crm.getAppointmentsByLead.useQuery({ leadId });
  const createMut = trpc.crm.createAppointmentCrm.useMutation({ onSuccess: () => { refetch(); setOpen(false); } });
  const updateMut = trpc.crm.updateAppointmentStatus.useMutation({ onSuccess: () => refetch() });
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    appointmentType: "initial_consultation" as any,
    scheduledAt: "", durationMinutes: 30, location: "", meetingLink: "", notes: ""
  });
  const appointments = (data as any)?.appointments || [];

  const typeLabels: Record<string, string> = {
    initial_consultation: "Initial Consultation", follow_up: "Follow Up",
    document_review: "Document Review", offer_discussion: "Offer Discussion",
    visa_prep: "Visa Preparation", other: "Other",
  };
  const statusColors: Record<string, string> = {
    scheduled: "text-blue-300", completed: "text-green-300",
    cancelled: "text-red-300", no_show: "text-yellow-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Appointments ({appointments.length})</h3>
        <button onClick={() => setOpen(true)}
          className="px-3 py-1.5 bg-[#e91e8c] text-white text-xs rounded-lg hover:bg-[#c2185b] transition-colors">
          + Book Appointment
        </button>
      </div>
      {open && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <h4 className="text-white font-medium text-sm">New Appointment for {studentName}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs">Type</label>
              <select value={form.appointmentType} onChange={e => setForm(f => ({ ...f, appointmentType: e.target.value as any }))}
                className="w-full mt-1 bg-white/10 border border-white/20 text-white rounded px-2 py-1.5 text-sm">
                {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs">Date & Time</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full mt-1 bg-white/10 border border-white/20 text-white rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-white/60 text-xs">Duration (minutes)</label>
              <input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                className="w-full mt-1 bg-white/10 border border-white/20 text-white rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-white/60 text-xs">Location / Platform</label>
              <input type="text" placeholder="e.g. Zoom, Office, WhatsApp" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full mt-1 bg-white/10 border border-white/20 text-white rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-white/60 text-xs">Meeting Link (optional)</label>
            <input type="text" placeholder="https://zoom.us/..." value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))}
              className="w-full mt-1 bg-white/10 border border-white/20 text-white rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-white/60 text-xs">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full mt-1 bg-white/10 border border-white/20 text-white rounded px-2 py-1.5 text-sm resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate({ leadId, studentName, studentEmail, studentPhone, ...form })}
              disabled={!form.scheduledAt || createMut.isPending}
              className="px-4 py-2 bg-[#e91e8c] text-white text-sm rounded-lg hover:bg-[#c2185b] disabled:opacity-50">
              {createMut.isPending ? "Booking..." : "Book Appointment"}
            </button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20">Cancel</button>
          </div>
        </div>
      )}
      {appointments.length === 0 && !open ? (
        <div className="text-center py-12 text-white/40">
          <p className="text-4xl mb-3">📅</p>
          <p>No appointments yet. Book the first consultation!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt: any) => (
            <div key={appt.id} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{typeLabels[appt.appointmentType] || appt.appointmentType}</p>
                  <p className="text-white/50 text-xs mt-0.5">{new Date(appt.scheduledAt).toLocaleString()} · {appt.durationMinutes} min</p>
                  {appt.location && <p className="text-white/40 text-xs">{appt.location}</p>}
                  {appt.meetingLink && (
                    <a href={appt.meetingLink} target="_blank" rel="noreferrer" className="text-[#e91e8c] text-xs hover:underline">Join Meeting</a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${statusColors[appt.status]}`}>{appt.status}</span>
                  <select value={appt.status} onChange={e => updateMut.mutate({ id: appt.id, status: e.target.value as any })}
                    className="text-xs bg-white/10 border border-white/20 text-white rounded px-2 py-1">
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              </div>
              {appt.notes && <p className="text-white/40 text-xs mt-2 border-t border-white/10 pt-2">{appt.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity Timeline Component ─────────────────────────────────────────────
function ActivityTimeline({ leadId }: { leadId: number }) {
  const { data } = trpc.crm.getActivityTimeline.useQuery({ leadId });
  const timeline = (data as any)?.timeline || [];

  const typeIcons: Record<string, string> = {
    doc_updated: "📄", appointment_booked: "📅", email_sent: "📧",
    note_added: "📝", task_created: "✅", stage_changed: "🔄",
    student_added: "👤", ai_chat: "🤖", default: "📌",
  };
  const typeColors: Record<string, string> = {
    doc_updated: "bg-blue-500/20 border-blue-500/30",
    appointment_booked: "bg-purple-500/20 border-purple-500/30",
    email_sent: "bg-green-500/20 border-green-500/30",
    note_added: "bg-yellow-500/20 border-yellow-500/30",
    task_created: "bg-orange-500/20 border-orange-500/30",
    stage_changed: "bg-pink-500/20 border-pink-500/30",
    default: "bg-white/5 border-white/10",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">Activity Timeline ({timeline.length} events)</h3>
      {timeline.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <p className="text-4xl mb-3">🕐</p>
          <p>No activity recorded yet. Actions like booking appointments, updating documents, and adding notes will appear here.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/10" />
          <div className="space-y-3">
            {[...timeline].reverse().map((event: any) => (
              <div key={event.id} className="flex gap-4 relative">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-lg flex-shrink-0 z-10 ${typeColors[event.activityType] || typeColors.default}`}>
                  {typeIcons[event.activityType] || typeIcons.default}
                </div>
                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                  <p className="text-white text-sm font-medium">{event.title}</p>
                  {event.description && <p className="text-white/50 text-xs mt-1">{event.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {event.staffEmail && <span className="text-white/30 text-xs">{event.staffEmail}</span>}
                    <span className="text-white/30 text-xs">·</span>
                    <span className="text-white/30 text-xs">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Parent Report Button Component ──────────────────────────────────────────
function ParentReportButton({ lead, leadId }: { lead: any; leadId: number }) {
  const [open, setOpen] = useState(false);
  const [parentEmail, setParentEmail] = useState(lead.parentEmail || "");
  const [parentName, setParentName] = useState(lead.parentName || "");

  const sendReport = trpc.crm.sendParentReport.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success(`Progress report sent to ${parentEmail}!`);
        setOpen(false);
      } else {
        toast.error(data.error || "Failed to send report");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-600/30 justify-start gap-2" variant="outline">
          <Mail className="w-4 h-4" /> Send Parent Report
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d1424] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" /> Send Progress Report to Parent
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-sm text-purple-300">
            This will send a detailed progress report for <strong>{lead.studentName}</strong> to their parent/guardian via email.
          </div>
          <div>
            <Label className="text-white/70">Parent Name</Label>
            <Input
              placeholder="e.g. Bapak/Ibu Ahmad"
              className="bg-white/5 border-white/10 text-white mt-1"
              value={parentName}
              onChange={e => setParentName(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-white/70">Parent Email *</Label>
            <Input
              type="email"
              placeholder="parent@email.com"
              className="bg-white/5 border-white/10 text-white mt-1"
              value={parentEmail}
              onChange={e => setParentEmail(e.target.value)}
            />
          </div>
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            onClick={() => sendReport.mutate({ leadId, parentEmail, parentName: parentName || undefined })}
            disabled={sendReport.isPending || !parentEmail.trim()}
          >
            {sendReport.isPending ? "Sending Report..." : "Send Progress Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
