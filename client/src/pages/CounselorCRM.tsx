import { useState, useMemo, useEffect } from "react";
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
import { Link, useLocation } from "wouter";
import {
  Phone, MessageCircle, Mail, FileText, CheckCircle2, Clock, AlertCircle,
  Plus, ChevronRight, Users, TrendingUp, Target, Award, Calendar,
  Zap, Star, BarChart3, ArrowRight, RefreshCw, User, BookOpen,
  Search, Filter, UserPlus, Eye, Crown, Edit2, Upload, X, Download,
  GripVertical, Bell, CheckCheck, MessageSquare, GraduationCap, Brain, LogOut
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
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"pipeline" | "tasks" | "students" | "performance" | "ceo">("pipeline");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | "all">("all");

  // Logout
  const logoutMutation = trpc.staffAuth.logout.useMutation({
    onSuccess: () => {
      toast.success("Logged out successfully");
      setLocation("/staff-login");
    },
  });

  // Auth check
  const { data: meData, isLoading: meLoading, isFetching: meFetching } = trpc.staffAuth.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes — don't refetch on every navigation
    retry: false,
  });
  const staffUser = meData?.staff;
  const isAdmin = staffUser?.role === "admin";

  useEffect(() => {
    // Only redirect when query is fully settled (not loading AND not background refetching)
    if (!meLoading && !meFetching && !staffUser) {
      setLocation("/staff-login");
    }
  }, [meLoading, meFetching, staffUser, setLocation]);

  // Queries
  const { data: pipelineData, refetch: refetchPipeline } = trpc.crm.getMyPipeline.useQuery(
    undefined, { enabled: !!staffUser }
  );
  const { data: tasksData, refetch: refetchTasks } = trpc.crm.getTodayTasks.useQuery(
    undefined, { enabled: !!staffUser }
  );
  const { data: allTasksData, refetch: refetchAllTasks } = trpc.crm.getAllTasks.useQuery(
    undefined, { enabled: !!staffUser }
  );
  const { data: perfData, refetch: refetchPerf } = trpc.crm.getMyPerformance.useQuery(
    undefined, { enabled: !!staffUser }
  );
  const { data: studentsData, refetch: refetchStudents } = trpc.crm.getMyStudents.useQuery(
    undefined, { enabled: !!staffUser }
  );
  const { data: allPerfData, refetch: refetchAllPerf } = trpc.crm.getAllPerformance.useQuery(
    undefined, { enabled: !!staffUser && isAdmin }
  );
  const { data: leadSourceData } = trpc.crm.getLeadSourceAnalytics.useQuery(
    undefined, { enabled: !!staffUser && isAdmin }
  );

  // Mutations
  const updateStage = trpc.crm.updatePipelineStage.useMutation({
    onSuccess: () => { refetchPipeline(); toast.success("Stage updated"); },
  });
  const updateTask = trpc.crm.updateTask.useMutation({
    onSuccess: () => { refetchTasks(); refetchAllTasks(); toast.success("Task updated"); },
  });
  const createTask = trpc.crm.createTask.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        refetchTasks(); refetchAllTasks(); setNewTaskOpen(false);
        setTaskForm({ title: "", taskType: "follow_up", priority: "medium", description: "", dueDate: "", relatedName: "" });
        toast.success("Task berhasil dibuat!");
      } else {
        toast.error(data.error || "Gagal membuat task");
      }
    },
    onError: (err) => toast.error("Error: " + err.message),
  });
  const deleteTask = trpc.crm.deleteTask.useMutation({
    onSuccess: () => { refetchTasks(); refetchAllTasks(); toast.success("Task dihapus"); },
  });
  const addStudent = trpc.crm.addStudent.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        refetchStudents(); refetchPipeline(); setAddStudentOpen(false);
        setStudentForm({ studentName: "", studentEmail: "", studentPhone: "", preferredCountry: "", studyLevel: "", intakeDate: "", programInterest: "", notes: "", assignedCounselor: "" });
        toast.success("Student berhasil ditambahkan!");
      } else {
        toast.error(data.error || "Gagal menambahkan student");
      }
    },
    onError: (err) => toast.error("Error: " + err.message),
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
  const allStudents = studentsData?.students || [];
  const allPerf = allPerfData?.performance || [];

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: "", taskType: "follow_up" as any, priority: "medium" as any,
    description: "", dueDate: "", relatedName: "",
  });
  const [studentForm, setStudentForm] = useState({
    studentName: "", studentEmail: "", studentPhone: "",
    preferredCountry: "", studyLevel: "", intakeDate: "",
    programInterest: "", notes: "", assignedCounselor: "",
  });

  // Student list filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentCountryFilter, setStudentCountryFilter] = useState("all");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");

  // Edit student state
  const [editStudentOpen, setEditStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Bulk CSV import state
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");

  // Mutations for Sprint 3
  const editStudent = trpc.crm.editStudent.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        refetchStudents(); refetchPipeline(); setEditStudentOpen(false);
        toast.success("Profil student berhasil diupdate!");
      } else {
        toast.error(data.error || "Gagal update student");
      }
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const bulkImport = trpc.crm.bulkImportStudents.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        refetchStudents(); refetchPipeline(); setCsvImportOpen(false); setCsvPreview([]);
        toast.success(`Berhasil import ${data.imported} student!${data.errors.length > 0 ? ` (${data.errors.length} error)` : ""}`);
      } else {
        toast.error(data.error || "Gagal import");
      }
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const handleOpenEdit = (student: any) => {
    setEditingStudent(student);
    setEditForm({
      studentName: student.studentName || "",
      studentEmail: student.studentEmail || "",
      studentPhone: student.studentPhone || "",
      preferredCountry: student.preferredCountry || "",
      studyLevel: student.studyLevel || "",
      intakeDate: student.intakeDate || "",
      programInterest: student.programInterest || "",
      notes: student.notes || "",
      status: student.status || "new",
      assignedCounselor: student.assignedCounselor || "",
    });
    setEditStudentOpen(true);
  };

  const handleEditStudent = () => {
    if (!editingStudent) return;
    editStudent.mutate({ leadId: editingStudent.id, ...editForm });
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { setCsvError("File CSV harus memiliki header dan minimal 1 baris data"); return; }
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/["']/g, ""));
        const rows = lines.slice(1).map(line => {
          const vals = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
          const obj: any = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
          return obj;
        }).filter(r => r.name || r.studentname || r["student name"]);
        const mapped = rows.map(r => ({
          studentName: r.name || r.studentname || r["student name"] || "",
          studentEmail: r.email || r.studentemail || r["student email"] || "",
          studentPhone: r.phone || r.studentphone || r["phone number"] || r.whatsapp || "",
          preferredCountry: r.country || r.preferredcountry || r["preferred country"] || "",
          studyLevel: r.level || r.studylevel || r["study level"] || "",
          intakeDate: r.intake || r.intakedate || r["intake date"] || "",
          programInterest: r.program || r.programinterest || r["program interest"] || r.major || "",
          notes: r.notes || r.note || "",
        }));
        setCsvPreview(mapped);
      } catch (err) {
        setCsvError("Gagal membaca file CSV. Pastikan format benar.");
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImport = () => {
    if (csvPreview.length === 0) return;
    bulkImport.mutate({ students: csvPreview });
  };

  const filteredStudents = useMemo(() => {
    return allStudents.filter((s: any) => {
      const matchSearch = !studentSearch ||
        s.studentName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentEmail?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentPhone?.includes(studentSearch);
      const matchCountry = studentCountryFilter === "all" || s.preferredCountry === studentCountryFilter;
      const matchStatus = studentStatusFilter === "all" || s.status === studentStatusFilter;
      return matchSearch && matchCountry && matchStatus;
    });
  }, [allStudents, studentSearch, studentCountryFilter, studentStatusFilter]);

  const uniqueCountries = useMemo(() => {
    const countries = allStudents.map((s: any) => s.preferredCountry).filter(Boolean);
    return Array.from(new Set(countries)) as string[];
  }, [allStudents]);

  const handleCreateTask = () => {
    if (!taskForm.title.trim()) { toast.error("Judul task harus diisi"); return; }
    if (!staffUser) { toast.error("Anda harus login terlebih dahulu"); return; }
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

  const handleAddStudent = () => {
    if (!studentForm.studentName.trim()) { toast.error("Nama student harus diisi"); return; }
    if (!staffUser) { toast.error("Anda harus login terlebih dahulu"); return; }
    addStudent.mutate({
      studentName: studentForm.studentName,
      studentEmail: studentForm.studentEmail || undefined,
      studentPhone: studentForm.studentPhone || undefined,
      preferredCountry: studentForm.preferredCountry || undefined,
      studyLevel: studentForm.studyLevel || undefined,
      intakeDate: studentForm.intakeDate || undefined,
      programInterest: studentForm.programInterest || undefined,
      notes: studentForm.notes || undefined,
      assignedCounselor: studentForm.assignedCounselor || undefined,
    });
  };

  const kpis = [
    { label: "Leads Assigned", value: perf?.leadsAssigned ?? 0, icon: <Users className="w-5 h-5" />, color: "text-blue-400" },
    { label: "Contacted", value: perf?.leadsContacted ?? 0, icon: <Phone className="w-5 h-5" />, color: "text-yellow-400" },
    { label: "Qualified", value: perf?.leadsQualified ?? 0, icon: <Target className="w-5 h-5" />, color: "text-purple-400" },
    { label: "Converted", value: perf?.leadsConverted ?? 0, icon: <Award className="w-5 h-5" />, color: "text-green-400" },
    { label: "Active Apps", value: perf?.applicationsActive ?? 0, icon: <BookOpen className="w-5 h-5" />, color: "text-orange-400" },
    { label: "Conversion Rate", value: `${perf?.conversionRate ?? "0.0"}%`, icon: <TrendingUp className="w-5 h-5" />, color: "text-emerald-400" },
    { label: "Tasks Done", value: perf?.tasksCompleted ?? 0, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-cyan-400" },
    { label: "Tasks Pending", value: perf?.tasksPending ?? 0, icon: <Clock className="w-5 h-5" />, color: "text-red-400" },
  ];

  if (meLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-white/60 text-sm animate-pulse">Loading CRM...</div>
      </div>
    );
  }

  if (!staffUser) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60 text-sm mb-4">Login sebagai staff untuk mengakses CRM</div>
          <Link href="/staff-login">
            <Button className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold">Login Staff</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "pipeline", label: "Pipeline", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, badge: todayTasks.length },
    { id: "students", label: "Students", icon: <Users className="w-4 h-4" />, badge: allStudents.length },
    { id: "performance", label: "Performance", icon: <TrendingUp className="w-4 h-4" /> },
    ...(isAdmin ? [{ id: "ceo", label: "CEO View", icon: <Crown className="w-4 h-4" />, adminOnly: true }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1424]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <Link href="/staff-dashboard">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-1 px-2">
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/QxrYSewOYzAuPIEN.jpeg" alt="SpecTa Education" className="h-7 sm:h-8 w-auto object-contain rounded" />
                <span className="hidden sm:inline">CRM Workspace</span>
                <span className="sm:hidden">CRM</span>
              </h1>
              <p className="text-xs text-white/40 hidden sm:block">{staffUser.name} · {isAdmin ? "Admin" : "Counselor"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white"
              onClick={() => { refetchPipeline(); refetchTasks(); refetchPerf(); refetchStudents(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>

            {/* Notification Bell */}
            <NotificationBell staffEmail={staffUser.email} />
            {/* Team Chat Button */}
            <Link href="/crm/team-chat">
              <Button size="sm" variant="outline" className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10 gap-1 px-2 sm:px-3">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Team Chat</span>
              </Button>
            </Link>
            {/* University Database Button */}
            <Link href="/crm/universities">
              <Button size="sm" variant="outline" className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 gap-1 px-2 sm:px-3">
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Universities</span>
              </Button>
            </Link>

            {/* AI Follow-up Assistant Button */}
            <Link href="/crm/ai-assistant">
              <Button size="sm" variant="outline" className="border-violet-500/40 text-violet-400 hover:bg-violet-500/10 gap-1 px-2 sm:px-3">
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">AI Assistant</span>
              </Button>
            </Link>

            {/* CSV Import Button */}
            <Button size="sm" variant="outline" className="border-green-500/40 text-green-400 hover:bg-green-500/10 gap-1 px-2 sm:px-3"
              onClick={() => setCsvImportOpen(true)}>
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            {/* Logout Button */}
            <Button size="sm" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1 px-2 sm:px-3"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
            </Button>

            {/* Edit Student Dialog */}
            <Dialog open={editStudentOpen} onOpenChange={setEditStudentOpen}>
              <DialogContent className="bg-[#0d1424] border-white/10 text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-[#f59e0b]" /> Edit Profil Student
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-white/70">Nama Lengkap *</Label>
                    <Input className="bg-white/5 border-white/10 text-white mt-1"
                      value={editForm.studentName || ""} onChange={e => setEditForm((f: any) => ({ ...f, studentName: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/70">Email</Label>
                      <Input type="email" className="bg-white/5 border-white/10 text-white mt-1"
                        value={editForm.studentEmail || ""} onChange={e => setEditForm((f: any) => ({ ...f, studentEmail: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-white/70">No. HP / WhatsApp</Label>
                      <Input className="bg-white/5 border-white/10 text-white mt-1"
                        value={editForm.studentPhone || ""} onChange={e => setEditForm((f: any) => ({ ...f, studentPhone: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/70">Negara Tujuan</Label>
                      <Select value={editForm.preferredCountry || ""} onValueChange={v => setEditForm((f: any) => ({ ...f, preferredCountry: v }))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue placeholder="Pilih negara" /></SelectTrigger>
                        <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                          <SelectItem value="Malaysia">🇲🇾 Malaysia</SelectItem>
                          <SelectItem value="Singapore">🇸🇬 Singapore</SelectItem>
                          <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                          <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                          <SelectItem value="United States">🇺🇸 United States</SelectItem>
                          <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                          <SelectItem value="New Zealand">🇳🇿 New Zealand</SelectItem>
                          <SelectItem value="Ireland">🇮🇪 Ireland</SelectItem>
                          <SelectItem value="Netherlands">🇳🇱 Netherlands</SelectItem>
                          <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                          <SelectItem value="China">🇨🇳 China</SelectItem>
                          <SelectItem value="Japan">🇯🇵 Japan</SelectItem>
                          <SelectItem value="South Korea">🇰🇷 South Korea</SelectItem>
                          <SelectItem value="Other">🌍 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white/70">Jenjang Studi</Label>
                      <Select value={editForm.studyLevel || ""} onValueChange={v => setEditForm((f: any) => ({ ...f, studyLevel: v }))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue placeholder="Pilih jenjang" /></SelectTrigger>
                        <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                          <SelectItem value="High School">High School</SelectItem>
                          <SelectItem value="Foundation">Foundation</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Bachelor">Bachelor (S1)</SelectItem>
                          <SelectItem value="Master">Master (S2)</SelectItem>
                          <SelectItem value="PhD">PhD (S3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/70">Program / Jurusan</Label>
                      <Input className="bg-white/5 border-white/10 text-white mt-1"
                        value={editForm.programInterest || ""} onChange={e => setEditForm((f: any) => ({ ...f, programInterest: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-white/70">Target Intake</Label>
                      <Input className="bg-white/5 border-white/10 text-white mt-1"
                        value={editForm.intakeDate || ""} onChange={e => setEditForm((f: any) => ({ ...f, intakeDate: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/70">Status</Label>
                    <Select value={editForm.status || "new"} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                        <SelectItem value="new">New Lead</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isAdmin && (
                    <div>
                      <Label className="text-white/70">Assign ke Counselor (email)</Label>
                      <Input className="bg-white/5 border-white/10 text-white mt-1"
                        value={editForm.assignedCounselor || ""} onChange={e => setEditForm((f: any) => ({ ...f, assignedCounselor: e.target.value }))} />
                    </div>
                  )}
                  <div>
                    <Label className="text-white/70">Catatan</Label>
                    <Textarea className="bg-white/5 border-white/10 text-white mt-1 resize-none" rows={2}
                      value={editForm.notes || ""} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <Button className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold"
                    onClick={handleEditStudent} disabled={editStudent.isPending || !editForm.studentName?.trim()}>
                    {editStudent.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* CSV Import Dialog */}
            <Dialog open={csvImportOpen} onOpenChange={(o) => { setCsvImportOpen(o); if (!o) { setCsvPreview([]); setCsvError(""); } }}>
              <DialogContent className="bg-[#0d1424] border-white/10 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-[#f59e0b]" /> Bulk Import via CSV
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60">
                    <p className="font-semibold text-white/80 mb-1">Format CSV yang diterima:</p>
                    <code className="text-green-400">name, email, phone, country, level, intake, program, notes</code>
                    <p className="mt-1">Baris pertama harus berupa header. Kolom bisa dalam urutan apapun.</p>
                    <a href="data:text/csv;charset=utf-8,name,email,phone,country,level,intake,program,notes%0AJohn Doe,john@email.com,+62812345,Malaysia,Bachelor,September 2025,Computer Science,Interested in scholarship"
                      download="template_import.csv" className="text-[#f59e0b] hover:underline flex items-center gap-1 mt-2">
                      <Download className="w-3 h-3" /> Download template CSV
                    </a>
                  </div>
                  <div>
                    <Label className="text-white/70">Upload File CSV</Label>
                    <input type="file" accept=".csv,.txt" className="hidden" id="csv-upload"
                      onChange={handleCsvFile} />
                    <label htmlFor="csv-upload" className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-white/20 rounded-lg p-6 cursor-pointer hover:border-[#f59e0b]/50 hover:bg-[#f59e0b]/5 transition-colors">
                      <Upload className="w-5 h-5 text-white/40" />
                      <span className="text-white/60 text-sm">Klik untuk pilih file CSV</span>
                    </label>
                    {csvError && <p className="text-red-400 text-xs mt-2">{csvError}</p>}
                  </div>
                  {csvPreview.length > 0 && (
                    <div>
                      <p className="text-white/70 text-sm mb-2">{csvPreview.length} student siap diimport:</p>
                      <div className="max-h-48 overflow-y-auto bg-white/5 rounded-lg">
                        <table className="w-full text-xs">
                          <thead><tr className="text-white/40 border-b border-white/10">
                            <th className="text-left p-2">Nama</th><th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Negara</th><th className="text-left p-2">Program</th>
                          </tr></thead>
                          <tbody>
                            {csvPreview.slice(0, 20).map((s, i) => (
                              <tr key={i} className="border-b border-white/5">
                                <td className="p-2 text-white">{s.studentName}</td>
                                <td className="p-2 text-white/60">{s.studentEmail || "—"}</td>
                                <td className="p-2 text-white/60">{s.preferredCountry || "—"}</td>
                                <td className="p-2 text-white/60">{s.programInterest || "—"}</td>
                              </tr>
                            ))}
                            {csvPreview.length > 20 && <tr><td colSpan={4} className="p-2 text-white/40 text-center">...dan {csvPreview.length - 20} lainnya</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      <Button className="w-full mt-3 bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold"
                        onClick={handleBulkImport} disabled={bulkImport.isPending}>
                        {bulkImport.isPending ? `Mengimport ${csvPreview.length} student...` : `Import ${csvPreview.length} Student`}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Student */}
            <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/10 gap-2">
                  <UserPlus className="w-4 h-4" /> Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0d1424] border-white/10 text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#f59e0b]" /> Tambah Student Baru
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-white/70">Nama Lengkap *</Label>
                    <Input placeholder="e.g. Ahmad Fauzi" className="bg-white/5 border-white/10 text-white mt-1"
                      value={studentForm.studentName} onChange={e => setStudentForm(f => ({ ...f, studentName: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/70">Email</Label>
                      <Input type="email" placeholder="email@example.com" className="bg-white/5 border-white/10 text-white mt-1"
                        value={studentForm.studentEmail} onChange={e => setStudentForm(f => ({ ...f, studentEmail: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-white/70">No. HP / WhatsApp</Label>
                      <Input placeholder="+62 812 3456 7890" className="bg-white/5 border-white/10 text-white mt-1"
                        value={studentForm.studentPhone} onChange={e => setStudentForm(f => ({ ...f, studentPhone: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/70">Negara Tujuan</Label>
                      <Select value={studentForm.preferredCountry} onValueChange={v => setStudentForm(f => ({ ...f, preferredCountry: v }))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                          <SelectValue placeholder="Pilih negara" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                          <SelectItem value="Malaysia">🇲🇾 Malaysia</SelectItem>
                          <SelectItem value="Singapore">🇸🇬 Singapore</SelectItem>
                          <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                          <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                          <SelectItem value="United States">🇺🇸 United States</SelectItem>
                          <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                          <SelectItem value="New Zealand">🇳🇿 New Zealand</SelectItem>
                          <SelectItem value="Ireland">🇮🇪 Ireland</SelectItem>
                          <SelectItem value="Netherlands">🇳🇱 Netherlands</SelectItem>
                          <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                          <SelectItem value="China">🇨🇳 China</SelectItem>
                          <SelectItem value="Japan">🇯🇵 Japan</SelectItem>
                          <SelectItem value="South Korea">🇰🇷 South Korea</SelectItem>
                          <SelectItem value="Other">🌍 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white/70">Jenjang Studi</Label>
                      <Select value={studentForm.studyLevel} onValueChange={v => setStudentForm(f => ({ ...f, studyLevel: v }))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                          <SelectValue placeholder="Pilih jenjang" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                          <SelectItem value="High School">High School</SelectItem>
                          <SelectItem value="Foundation">Foundation</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Bachelor">Bachelor (S1)</SelectItem>
                          <SelectItem value="Master">Master (S2)</SelectItem>
                          <SelectItem value="PhD">PhD (S3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/70">Program / Jurusan</Label>
                      <Input placeholder="e.g. Computer Science" className="bg-white/5 border-white/10 text-white mt-1"
                        value={studentForm.programInterest} onChange={e => setStudentForm(f => ({ ...f, programInterest: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-white/70">Target Intake</Label>
                      <Input placeholder="e.g. September 2025" className="bg-white/5 border-white/10 text-white mt-1"
                        value={studentForm.intakeDate} onChange={e => setStudentForm(f => ({ ...f, intakeDate: e.target.value }))} />
                    </div>
                  </div>
                  {isAdmin && (
                    <div>
                      <Label className="text-white/70">Assign ke Counselor (email)</Label>
                      <Input placeholder="email counselor (kosong = assign ke Anda)" className="bg-white/5 border-white/10 text-white mt-1"
                        value={studentForm.assignedCounselor} onChange={e => setStudentForm(f => ({ ...f, assignedCounselor: e.target.value }))} />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/70">Nama Orang Tua</Label>
                      <Input placeholder="e.g. Bapak Ahmad" className="bg-white/5 border-white/10 text-white mt-1"
                        value={(studentForm as any).parentName || ""} onChange={e => setStudentForm(f => ({ ...f, parentName: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-white/70">Email Orang Tua</Label>
                      <Input type="email" placeholder="parent@email.com" className="bg-white/5 border-white/10 text-white mt-1"
                        value={(studentForm as any).parentEmail || ""} onChange={e => setStudentForm(f => ({ ...f, parentEmail: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/70">Catatan Awal</Label>
                    <Textarea placeholder="Informasi tambahan tentang student ini..." className="bg-white/5 border-white/10 text-white mt-1 resize-none"
                      rows={2} value={studentForm.notes} onChange={e => setStudentForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <Button className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold"
                    onClick={handleAddStudent} disabled={addStudent.isPending || !studentForm.studentName.trim()}>
                    {addStudent.isPending ? "Menambahkan..." : "Tambah Student"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* New Task */}
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold gap-2">
                  <Plus className="w-4 h-4" /> New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0d1424] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Buat Task Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-white/70">Judul Task *</Label>
                    <Input placeholder="e.g. Call Ahmad tentang aplikasi UK" className="bg-white/5 border-white/10 text-white mt-1"
                      value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/70">Tipe</Label>
                      <Select value={taskForm.taskType} onValueChange={v => setTaskForm(f => ({ ...f, taskType: v as any }))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
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
                      <Label className="text-white/70">Prioritas</Label>
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
                    <Label className="text-white/70">Nama Student (opsional)</Label>
                    <Input placeholder="e.g. Ahmad Fauzi" className="bg-white/5 border-white/10 text-white mt-1"
                      value={taskForm.relatedName} onChange={e => setTaskForm(f => ({ ...f, relatedName: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-white/70">Deadline (opsional)</Label>
                    <Input type="datetime-local" className="bg-white/5 border-white/10 text-white mt-1"
                      value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-white/70">Catatan (opsional)</Label>
                    <Textarea placeholder="Konteks tambahan..." className="bg-white/5 border-white/10 text-white mt-1 resize-none"
                      rows={2} value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <Button className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold"
                    onClick={handleCreateTask} disabled={createTask.isPending || !taskForm.title.trim()}>
                    {createTask.isPending ? "Membuat..." : "Buat Task"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-[1600px] mx-auto px-2 sm:px-6 flex gap-0 sm:gap-1 pb-0 overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "border-[#f59e0b] text-[#f59e0b]" : "border-transparent text-white/50 hover:text-white/80"
              } ${(tab as any).adminOnly ? "text-amber-300" : ""}`}>
              {tab.icon}
              {tab.label}
              {(tab as any).badge !== undefined && (tab as any).badge > 0 && (
                <span className="bg-[#f59e0b] text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {(tab as any).badge}
                </span>
              )}
              {(tab as any).adminOnly && <Crown className="w-3 h-3 text-amber-400" />}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-6">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 mb-4 sm:mb-6">
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

        {/* Pipeline Tab */}
        {activeTab === "pipeline" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Lead Pipeline</h2>
              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" size="sm"
                  className={`text-xs ${selectedStage === "all" ? "text-[#f59e0b]" : "text-white/50"}`}
                  onClick={() => setSelectedStage("all")}>All</Button>
                {PIPELINE_STAGES.slice(0, 4).map(s => (
                  <Button key={s.id} variant="ghost" size="sm"
                    className={`text-xs ${selectedStage === s.id ? s.color : "text-white/50"}`}
                    onClick={() => setSelectedStage(s.id)}>{s.label}</Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {PIPELINE_STAGES.map(stage => {
                const leads = pipelineByStage[stage.id] || [];
                if (selectedStage !== "all" && selectedStage !== stage.id) return null;
                return (
                  <div key={stage.id} className={`rounded-xl border p-3 min-h-[200px] ${stage.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                      <span className={`text-xs rounded-full px-2 py-0.5 ${stage.bg} ${stage.color} border`}>{leads.length}</span>
                    </div>
                    <div className="space-y-2">
                      {leads.map((item: any) => (
                        <LeadCard key={item.lead.id} item={item} stages={PIPELINE_STAGES}
                          onStageChange={(leadId, newStage) => updateStage.mutate({ leadId, stage: newStage })} />
                      ))}
                      {leads.length === 0 && <div className="text-center text-white/20 text-xs py-4">No leads</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#f59e0b]" />
                Tasks Hari Ini
                <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30">{todayTasks.length}</Badge>
              </h2>
              <div className="space-y-2">
                {todayTasks.length === 0 ? (
                  <Card className="bg-[#0d1424]/80 border-white/10">
                    <CardContent className="p-6 text-center text-white/40">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      <p className="text-sm">Tidak ada task untuk hari ini.</p>
                      <p className="text-xs mt-1">Buat task baru dengan tombol "New Task" di atas.</p>
                    </CardContent>
                  </Card>
                ) : todayTasks.map((task: any) => (
                  <TaskCard key={task.id} task={task}
                    onUpdate={(id, status) => updateTask.mutate({ id, status })}
                    onDelete={(id) => deleteTask.mutate({ id })} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Semua Pending
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  {allTasks.filter((t: any) => t.status === "pending" || t.status === "in_progress").length}
                </Badge>
              </h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {allTasks.filter((t: any) => t.status === "pending" || t.status === "in_progress").length === 0 ? (
                  <Card className="bg-[#0d1424]/80 border-white/10">
                    <CardContent className="p-6 text-center text-white/40">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      <p className="text-sm">Semua task sudah selesai!</p>
                    </CardContent>
                  </Card>
                ) : allTasks.filter((t: any) => t.status === "pending" || t.status === "in_progress").map((task: any) => (
                  <TaskCard key={task.id} task={task}
                    onUpdate={(id, status) => updateTask.mutate({ id, status })}
                    onDelete={(id) => deleteTask.mutate({ id })} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#f59e0b]" />
                Daftar Student
                <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30">{filteredStudents.length}</Badge>
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <Input placeholder="Cari nama, email, telepon..."
                    className="bg-white/5 border-white/10 text-white pl-9 w-64"
                    value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                </div>
                <Select value={studentCountryFilter} onValueChange={setStudentCountryFilter}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white w-40">
                    <Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="Negara" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                    <SelectItem value="all">Semua Negara</SelectItem>
                    {uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1424] border-white/10 text-white">
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <Card className="bg-[#0d1424]/80 border-white/10">
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-white/20" />
                  <p className="text-white/60 mb-2">
                    {allStudents.length === 0 ? "Belum ada student di CRM Anda." : "Tidak ada student yang cocok dengan filter."}
                  </p>
                  {allStudents.length === 0 && (
                    <Button className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold mt-3 gap-2"
                      onClick={() => setAddStudentOpen(true)}>
                      <UserPlus className="w-4 h-4" /> Tambah Student Pertama
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="bg-[#0d1424]/80 border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 text-xs">
                        <th className="text-left py-3 px-4">Nama Student</th>
                        <th className="text-left py-3 px-4">Kontak</th>
                        <th className="text-left py-3 px-4">Tujuan</th>
                        <th className="text-left py-3 px-4">Program</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Tanggal Masuk</th>
                        <th className="text-left py-3 px-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student: any) => (
                        <StudentRow key={student.id} student={student} onEdit={handleOpenEdit} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === "performance" && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#f59e0b]" /> Performa Saya (30 Hari Terakhir)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {kpis.map((kpi, i) => (
                <Card key={i} className="bg-[#0d1424]/80 border-white/10">
                  <CardContent className="p-5">
                    <div className={`flex items-center gap-3 mb-2 ${kpi.color}`}>{kpi.icon}<span className="text-sm text-white/60">{kpi.label}</span></div>
                    <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {(perfData?.performance?.length ?? 0) > 1 && (
              <Card className="bg-[#0d1424]/80 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#f59e0b]" /> Riwayat Performa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/40 border-b border-white/10">
                          <th className="text-left py-2 pr-4">Tanggal</th>
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
                            <td className="py-2 text-right text-emerald-400">{p.conversionRate}%</td>
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

        {/* CEO View Tab */}
        {activeTab === "ceo" && isAdmin && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> CEO Overview — Semua Counselor
              </h2>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2" onClick={() => refetchAllPerf()}>
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>

            {allPerf.length === 0 ? (
              <Card className="bg-[#0d1424]/80 border-white/10">
                <CardContent className="p-12 text-center">
                  <Crown className="w-12 h-12 mx-auto mb-4 text-white/20" />
                  <p className="text-white/60">Belum ada data performa counselor hari ini.</p>
                  <p className="text-xs text-white/40 mt-2">Data akan muncul setelah setiap counselor login ke CRM.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Total Leads", value: allPerf.reduce((s: number, p: any) => s + (p.leadsAssigned || 0), 0), color: "text-blue-400", icon: <Users className="w-5 h-5" /> },
                    { label: "Total Converted", value: allPerf.reduce((s: number, p: any) => s + (p.leadsConverted || 0), 0), color: "text-green-400", icon: <Award className="w-5 h-5" /> },
                    { label: "Active Applications", value: allPerf.reduce((s: number, p: any) => s + (p.applicationsActive || 0), 0), color: "text-orange-400", icon: <BookOpen className="w-5 h-5" /> },
                    { label: "Avg Conversion", value: allPerf.length > 0 ? (allPerf.reduce((s: number, p: any) => s + parseFloat(p.conversionRate || "0"), 0) / allPerf.length).toFixed(1) + "%" : "0%", color: "text-emerald-400", icon: <TrendingUp className="w-5 h-5" /> },
                  ].map((card, i) => (
                    <Card key={i} className="bg-[#0d1424]/80 border-white/10">
                      <CardContent className="p-5">
                        <div className={`flex items-center gap-3 mb-2 ${card.color}`}>{card.icon}<span className="text-sm text-white/60">{card.label}</span></div>
                        <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-[#0d1424]/80 border-white/10 mb-6">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-amber-400" /> Performa Per Counselor (Hari Ini)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-white/40 border-b border-white/10 text-xs">
                            <th className="text-left py-3 pr-4">Counselor</th>
                            <th className="text-right py-3 pr-4">Leads</th>
                            <th className="text-right py-3 pr-4">Contacted</th>
                            <th className="text-right py-3 pr-4">Qualified</th>
                            <th className="text-right py-3 pr-4">Converted</th>
                            <th className="text-right py-3 pr-4">Apps Active</th>
                            <th className="text-right py-3 pr-4">Tasks Done</th>
                            <th className="text-right py-3 pr-4">Tasks Pending</th>
                            <th className="text-right py-3">Conversion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allPerf.sort((a: any, b: any) => (b.leadsConverted || 0) - (a.leadsConverted || 0)).map((p: any, i: number) => {
                            const convRate = parseFloat(p.conversionRate || "0");
                            const rateColor = convRate >= 20 ? "text-green-400" : convRate >= 10 ? "text-yellow-400" : "text-red-400";
                            return (
                              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-3 pr-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-xs font-bold text-[#f59e0b]">
                                      {p.staffEmail?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                    <div>
                                      <div className="text-white font-medium">{p.staffEmail?.split("@")[0] || "Unknown"}</div>
                                      <div className="text-white/40 text-xs">{p.staffEmail}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 pr-4 text-right text-blue-400 font-semibold">{p.leadsAssigned || 0}</td>
                                <td className="py-3 pr-4 text-right text-yellow-400">{p.leadsContacted || 0}</td>
                                <td className="py-3 pr-4 text-right text-purple-400">{p.leadsQualified || 0}</td>
                                <td className="py-3 pr-4 text-right text-green-400 font-semibold">{p.leadsConverted || 0}</td>
                                <td className="py-3 pr-4 text-right text-orange-400">{p.applicationsActive || 0}</td>
                                <td className="py-3 pr-4 text-right text-cyan-400">{p.tasksCompleted || 0}</td>
                                <td className="py-3 pr-4 text-right text-red-400">{p.tasksPending || 0}</td>
                                <td className={`py-3 text-right font-bold ${rateColor}`}>{p.conversionRate || "0.0"}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Source Analytics */}
                <Card className="bg-[#0d1424]/80 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#f59e0b]" /> Lead Source Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {((leadSourceData as any)?.sources || []).map((src: any, i: number) => {
                        const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"];
                        const textColors = ["text-blue-400", "text-green-400", "text-purple-400", "text-orange-400", "text-pink-400"];
                        const total = ((leadSourceData as any)?.sources || []).reduce((s: number, x: any) => s + (x.count || 0), 0);
                        const pct = total > 0 ? Math.round((src.count / total) * 100) : 0;
                        return (
                          <div key={i} className="bg-white/5 rounded-lg p-3 text-center">
                            <div className={`text-2xl font-bold ${textColors[i % textColors.length]}`}>{src.count}</div>
                            <div className="text-white/60 text-xs mt-1 capitalize">{src.source?.replace(/_/g, " ") || "Unknown"}</div>
                            <div className="mt-2 bg-white/10 rounded-full h-1.5">
                              <div className={`${colors[i % colors.length]} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-white/40 text-xs mt-1">{pct}%</div>
                          </div>
                        );
                      })}
                      {((leadSourceData as any)?.sources || []).length === 0 && (
                        <div className="col-span-4 text-center text-white/40 py-4 text-sm">No lead source data yet</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <div>
                  <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#f59e0b]" /> Distribusi Student per Counselor
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {allPerf.map((p: any, i: number) => {
                      const name = p.staffEmail?.split("@")[0] || "Unknown";
                      const total = p.leadsAssigned || 0;
                      const converted = p.leadsConverted || 0;
                      const pct = total > 0 ? Math.round((converted / total) * 100) : 0;
                      return (
                        <Card key={i} className="bg-[#0d1424]/80 border-white/10">
                          <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-sm font-bold text-[#f59e0b] mx-auto mb-2">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-white font-medium text-sm capitalize">{name}</div>
                            <div className="text-white/40 text-xs mt-1">{total} leads</div>
                            <div className="mt-2 bg-white/10 rounded-full h-1.5">
                              <div className="bg-[#f59e0b] h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <div className="text-xs text-emerald-400 mt-1">{pct}% converted</div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({ item, stages, onStageChange }: {
  item: any; stages: typeof PIPELINE_STAGES;
  onStageChange: (leadId: number, stage: PipelineStage) => void;
}) {
  const [showMove, setShowMove] = useState(false);
  const lead = item.lead;
  const pipeline = item.pipeline;
  const score = pipeline.leadScore ?? 50;
  const scoreColor = score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400";
  const activeAppsCount = item.activeAppsCount ?? 0;
  // Overdue: no activity for 7+ days
  const lastActivity = item.lastActivityAt ? new Date(item.lastActivityAt) : null;
  const daysSinceActivity = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = daysSinceActivity !== null && daysSinceActivity >= 7;

  return (
    <div className={`bg-[#0a0f1e]/80 border rounded-lg p-2.5 text-xs hover:border-white/20 transition-colors ${
      isOverdue ? "border-red-500/40" : "border-white/10"
    }`}>
      {isOverdue && (
        <div className="flex items-center gap-1 text-red-400 mb-1.5 bg-red-500/10 rounded px-1.5 py-0.5">
          <span className="text-xs">⚠️ No activity {daysSinceActivity}d</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="font-medium text-white truncate flex-1">{lead.studentName}</span>
        <span className={`font-bold ${scoreColor} shrink-0`}>{score}</span>
      </div>
      {lead.preferredCountry && <div className="text-white/40 mb-1">🌍 {lead.preferredCountry}</div>}
      {/* Active Apps Badge */}
      {activeAppsCount > 0 && (
        <div className="flex items-center gap-1 mb-1.5">
          <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded px-1.5 py-0.5 text-xs">
            📚 {activeAppsCount} app{activeAppsCount > 1 ? "s" : ""}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1 flex-wrap">
        <Link href={`/crm/lead/${lead.id}`}>
          <button className="text-[#f59e0b] hover:text-[#d97706] flex items-center gap-0.5">
            View <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
        {lead.studentPhone && (
          <a
            href={`https://wa.me/${lead.studentPhone.replace(/[^0-9]/g, "")}?text=Hi ${encodeURIComponent(lead.studentName)}, this is from SpecTa Education. Following up on your study abroad application.`}
            target="_blank" rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 flex items-center gap-0.5"
            title="WhatsApp">
            <MessageCircle className="w-3 h-3" /> WA
          </a>
        )}
        <button className="text-white/40 hover:text-white ml-auto" onClick={() => setShowMove(!showMove)}>Move →</button>
      </div>
      {showMove && (
        <div className="mt-2 grid grid-cols-2 gap-1">
          {stages.filter(s => s.id !== pipeline.stage).map(s => (
            <button key={s.id} className={`text-xs px-1.5 py-1 rounded border ${s.bg} ${s.color} hover:opacity-80`}
              onClick={() => { onStageChange(lead.id, s.id); setShowMove(false); }}>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
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
        <button className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          isDone ? "bg-green-500 border-green-500" : "border-white/30 hover:border-green-400"
        }`} onClick={() => onUpdate(task.id, isDone ? "pending" : "done")}>
          {isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isDone ? "line-through text-white/40" : "text-white"}`}>{task.title}</span>
            <Badge className={`text-xs px-1.5 py-0 border ${priority.color}`}>{priority.icon} {priority.label}</Badge>
          </div>
          {task.relatedName && (
            <div className="text-xs text-white/50 mt-0.5 flex items-center gap-1"><User className="w-3 h-3" /> {task.relatedName}</div>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-white/40">
              {TASK_TYPE_ICONS[task.taskType] ?? TASK_TYPE_ICONS.other}
              {task.taskType?.replace("_", " ")}
            </span>
            {task.dueDate && (
              <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-white/40"}`}>
                <Clock className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {task.isAiGenerated && <span className="text-xs text-purple-400 flex items-center gap-1"><Star className="w-3 h-3" /> AI</span>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {!isDone && (
            <button className="text-xs text-white/30 hover:text-yellow-400 transition-colors"
              onClick={() => onUpdate(task.id, "in_progress")} title="Mark in progress">
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
          <button className="text-xs text-white/30 hover:text-red-400 transition-colors"
            onClick={() => onDelete(task.id)} title="Delete task">×</button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Row ──────────────────────────────────────────────────────────────
function StudentRow({ student, onEdit }: { student: any; onEdit: (s: any) => void }) {
  const statusColors: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    contacted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    qualified: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    converted: "bg-green-500/20 text-green-400 border-green-500/30",
    closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-xs font-bold text-[#f59e0b] shrink-0">
            {student.studentName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="text-white font-medium text-sm">{student.studentName}</div>
            {student.source === "crm_manual" && <span className="text-xs text-white/30">Manual Entry</span>}
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="space-y-0.5">
          {student.studentEmail && <div className="text-xs text-white/60 flex items-center gap-1"><Mail className="w-3 h-3" /> {student.studentEmail}</div>}
          {student.studentPhone && <div className="text-xs text-white/60 flex items-center gap-1"><Phone className="w-3 h-3" /> {student.studentPhone}</div>}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm text-white/80">{student.preferredCountry || "—"}</div>
        {student.studyLevel && <div className="text-xs text-white/40">{student.studyLevel}</div>}
      </td>
      <td className="py-3 px-4">
        <div className="text-sm text-white/80">{student.programInterest || student.intakeDate || "—"}</div>
      </td>
      <td className="py-3 px-4">
        <Badge className={`text-xs border ${statusColors[student.status] || statusColors.new}`}>{student.status}</Badge>
      </td>
      <td className="py-3 px-4 text-xs text-white/40">
        {new Date(student.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <Link href={`/crm/lead/${student.id}`}>
            <Button size="sm" variant="ghost" className="text-[#f59e0b] hover:text-[#d97706] hover:bg-[#f59e0b]/10 h-7 px-2 gap-1">
              <Eye className="w-3 h-3" /> View
            </Button>
          </Link>
          <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 px-2"
            onClick={() => onEdit(student)} title="Edit student">
            <Edit2 className="w-3 h-3" />
          </Button>
          {student.studentPhone && (
            <a href={`https://wa.me/${student.studentPhone.replace(/[^0-9]/g, "")}?text=Hi ${encodeURIComponent(student.studentName)}, this is from SpecTa Education. Following up on your study abroad consultation.`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-7 px-2" title="WhatsApp">
                <MessageCircle className="w-3 h-3" />
              </Button>
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Notification Bell Component ─────────────────────────────────────────────
function NotificationBell({ staffEmail }: { staffEmail: string }) {
  const [open, setOpen] = useState(false);
  const { data, refetch } = trpc.crm.getNotifications.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });
  const markRead = trpc.crm.markNotificationRead.useMutation({ onSuccess: () => refetch() });
  const markAllRead = trpc.crm.markAllNotificationsRead.useMutation({ onSuccess: () => refetch() });

  const notifications = (data as any)?.notifications || [];
  const unread = (data as any)?.unread || 0;

  const typeIcons: Record<string, string> = {
    new_lead: "👤", task_due: "⏰", stage_change: "🔄",
    appointment: "📅", doc_update: "📄", system: "🔔",
  };

  return (
    <div className="relative">
      <Button
        variant="ghost" size="sm"
        className="relative text-white/60 hover:text-white"
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#e91e8c] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0d1424] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-white font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-[#e91e8c] hover:text-[#c2185b] flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${notif.isRead ? "opacity-60" : ""}`}
                  onClick={() => {
                    if (!notif.isRead) markRead.mutate({ id: notif.id });
                    if (notif.actionUrl) window.location.href = notif.actionUrl;
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{typeIcons[notif.type] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${notif.isRead ? "text-white/60" : "text-white"}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{notif.message}</p>
                      )}
                      <p className="text-xs text-white/30 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 bg-[#e91e8c] rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
