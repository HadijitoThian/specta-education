import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from '@/components/SEO';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, FileText, MessageSquare, Phone, Mail, Globe, 
  Calendar, Clock, ChevronRight, ExternalLink, Loader2,
  LogOut, Home, CalendarCheck, BookOpen, Search, ClipboardList, Edit, Save, X,
  UserPlus, Shield, Briefcase, BarChart3, Trash2, ToggleLeft, ToggleRight, Download,
  Upload, Eye, EyeOff, KeyRound, UserCog, RefreshCw, Link2, Copy, Plus, CheckCircle2, Building2,
  CreditCard, TrendingUp, DollarSign, Bot
} from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { getLoginUrl } from "@/const";
import AptitudeReportDownload from "@/components/AptitudeReportPDF";
import UniversityManager from "@/components/UniversityManager";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import DripCampaignManager from "@/components/admin/DripCampaignManager";
import BlogManager from "@/components/admin/BlogManager";
import CommentModeration from "@/components/admin/CommentModeration";
import DataManagement from "@/components/admin/DataManagement";

type TabType = "analytics" | "leads" | "conversations" | "documents" | "appointments" | "applications" | "ielts" | "counselors" | "team" | "scholarshipLeads" | "staff" | "accessLinks" | "universities" | "proOrders" | "campaigns" | "blog" | "comments" | "dataManagement";

const APP_STATUS_OPTIONS = [
  "submitted", "reviewing", "processing", "on_hold", 
  "offer_received", "accepted", "enrolled", "rejected"
];

const APP_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  reviewing: "bg-yellow-100 text-yellow-800",
  processing: "bg-indigo-100 text-indigo-800",
  on_hold: "bg-orange-100 text-orange-800",
  offer_received: "bg-green-100 text-green-800",
  accepted: "bg-emerald-100 text-emerald-800",
  enrolled: "bg-teal-100 text-teal-800",
  rejected: "bg-red-100 text-red-800",
};

const SPECIALIZATIONS = [
  "UK Universities", "USA Universities", "Australia Universities", 
  "Canada Universities", "China Universities", "Malaysia Universities",
  "IELTS Preparation", "Visa Support", "Scholarship Advisory", "General Counseling"
];

function AgentAssignmentsWidget() {
  const { data: assignments, isLoading } = trpc.agents.getLeadAssignments.useQuery({}, {
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading assignments...</div>;
  if (!assignments || assignments.length === 0) return <div className="text-sm text-muted-foreground">No lead assignments yet. New leads will be automatically assigned to counselors.</div>;

  const recent = assignments.slice(0, 8);
  const statusColors: Record<string, string> = {
    assigned: "bg-blue-100 text-blue-700",
    contacted: "bg-green-100 text-green-700",
    follow_up: "bg-yellow-100 text-yellow-700",
    qualified: "bg-indigo-100 text-indigo-700",
    converted: "bg-emerald-100 text-emerald-700",
    closed: "bg-gray-100 text-gray-700",
    escalated: "bg-red-100 text-red-700",
  };
  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500 text-white",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Student</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Contact</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Assigned To</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Source</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Priority</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Assigned</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((a: any) => (
            <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-2 px-3 font-medium">{a.studentName}</td>
              <td className="py-2 px-3">
                <div>{a.studentEmail || "-"}</div>
                <div className="text-muted-foreground">{a.studentPhone || "-"}</div>
              </td>
              <td className="py-2 px-3 font-medium text-red-600">{a.counselorName}</td>
              <td className="py-2 px-3">
                <span className="bg-muted px-2 py-0.5 rounded text-[10px]">{a.leadSource}</span>
              </td>
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${priorityColors[a.priority] || "bg-gray-100 text-gray-700"}`}>{a.priority}</span>
              </td>
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusColors[a.status] || "bg-gray-100 text-gray-700"}`}>{a.status}</span>
              </td>
              <td className="py-2 px-3 text-muted-foreground">{new Date(a.assignedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {assignments.length > 8 && (
        <div className="text-center mt-3">
          <Link href="/admin/agents">
            <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-700">
              View all {assignments.length} assignments →
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin Dashboard | SpecTa Education";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'SpecTa Education admin dashboard. Manage content, users, analytics, and system settings for the education platform.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'SpecTa Education admin dashboard. Manage content, users, analytics, and system settings for the education platform.';
      document.head.appendChild(meta);
    }
  }, []);

  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editCounselor, setEditCounselor] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [adminNoteAppId, setAdminNoteAppId] = useState<number | null>(null);
  const [adminNoteIsInternal, setAdminNoteIsInternal] = useState(false);
  
  // Counselor form state
  const [showAddCounselor, setShowAddCounselor] = useState(false);
  const [counselorName, setCounselorName] = useState("");
  const [counselorEmail, setCounselorEmail] = useState("");
  const [counselorPhone, setCounselorPhone] = useState("");
  const [counselorSpec, setCounselorSpec] = useState("");
  const [editingCounselorId, setEditingCounselorId] = useState<number | null>(null);
  
  // Document filter state
  const [docFilter, setDocFilter] = useState<"all" | "chatbot" | "application" | "tracker">("all");
  const [docSearch, setDocSearch] = useState("");

  // Staff management state
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"admin" | "counselor" | "staff">("counselor");
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [resetPasswordStaffId, setResetPasswordStaffId] = useState<number | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  
  // Monitoring modal state
  const [monitorCounselor, setMonitorCounselor] = useState<string | null>(null);
  const [monitorStudentId, setMonitorStudentId] = useState<number | null>(null);

  // Lead filter state
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");
  const [expandedLeadTranscript, setExpandedLeadTranscript] = useState<number | null>(null);

  // Access links state
  const [linkCount, setLinkCount] = useState(10);
  const [linkExpiry, setLinkExpiry] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  const utils = trpc.useUtils();

  const isAdminOrGM = user?.role === 'admin' || user?.role === 'general_manager';

  const { data: leadsData, isLoading: leadsLoading } = trpc.admin.getLeads.useQuery(undefined, {
    enabled: isAuthenticated && isAdminOrGM
  });

  const { data: conversationsData, isLoading: conversationsLoading } = trpc.admin.getConversations.useQuery(undefined, {
    enabled: isAuthenticated && isAdminOrGM
  });

  const { data: documentsData, isLoading: documentsLoading } = trpc.admin.getDocuments.useQuery(undefined, {
    enabled: isAuthenticated && isAdminOrGM
  });

  const { data: conversationMessages } = trpc.admin.getConversationMessages.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId && isAuthenticated && isAdminOrGM }
  );

  const { data: appointmentsData, isLoading: appointmentsLoading } = trpc.admin.getAppointments.useQuery(undefined, {
    enabled: isAuthenticated && isAdminOrGM && activeTab === 'appointments'
  });

  const { data: applicationsData, isLoading: applicationsLoading } = trpc.application.getAll.useQuery(undefined, {
    enabled: isAuthenticated && isAdminOrGM && activeTab === 'applications'
  });

  const { data: ieltsData, isLoading: ieltsLoading } = trpc.admin.getIeltsPracticeResults.useQuery(undefined, {
    enabled: isAuthenticated && isAdminOrGM && activeTab === 'ielts'
  });

  // Counselor queries
  const { data: counselorsData, isLoading: counselorsLoading } = trpc.counselor.getAll.useQuery(undefined, {
    enabled: isAuthenticated && isAdminOrGM
  });

  // Use staff accounts with role=counselor for assignment dropdown (merged with old counselors)
  const { data: activeCounselorsData } = trpc.counselor.getActive.useQuery(undefined, {
    enabled: isAuthenticated && isAdminOrGM
  });

  // Scholarship leads
  const { data: scholarshipLeadsData, isLoading: scholarshipLeadsLoading } = trpc.scholarship.getLeads.useQuery(undefined, {
    enabled: isAuthenticated && isAdminOrGM && activeTab === 'scholarshipLeads'
  });

  // Team management (admin only)
  const { data: usersData, isLoading: usersLoading } = trpc.userManagement.getUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin' && activeTab === 'team'
  });

  // Staff management (admin only)
  const { data: staffData, isLoading: staffLoading } = trpc.staffManagement.getAll.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin'
  });

  const updateLeadMutation = trpc.admin.updateLead.useMutation();

  const updateAppointmentMutation = trpc.admin.updateAppointmentStatus.useMutation({
    onSuccess: () => utils.admin.getAppointments.invalidate()
  });

  const updateApplicationMutation = trpc.admin.updateApplicationFull.useMutation({
    onSuccess: () => {
      setEditingAppId(null);
      utils.application.getAll.invalidate();
      utils.counselor.getAll.invalidate();
    }
  });

  const addAdminNoteMutation = trpc.admin.addApplicationNote.useMutation({
    onSuccess: () => {
      setAdminNote("");
      setAdminNoteAppId(null);
      utils.application.getAll.invalidate();
    }
  });

  // Counselor mutations
  const createCounselorMutation = trpc.counselor.create.useMutation({
    onSuccess: () => {
      setShowAddCounselor(false);
      setCounselorName("");
      setCounselorEmail("");
      setCounselorPhone("");
      setCounselorSpec("");
      utils.counselor.getAll.invalidate();
      utils.counselor.getActive.invalidate();
    }
  });

  const updateCounselorMutation = trpc.counselor.update.useMutation({
    onSuccess: () => {
      setEditingCounselorId(null);
      setCounselorName("");
      setCounselorEmail("");
      setCounselorPhone("");
      setCounselorSpec("");
      utils.counselor.getAll.invalidate();
      utils.counselor.getActive.invalidate();
    }
  });

  const deleteCounselorMutation = trpc.counselor.delete.useMutation({
    onSuccess: () => {
      utils.counselor.getAll.invalidate();
      utils.counselor.getActive.invalidate();
    }
  });

  const updateScholarshipLeadMutation = trpc.scholarship.updateLead.useMutation({
    onSuccess: () => utils.scholarship.getLeads.invalidate()
  });

  // User role mutation (admin only)
  const updateRoleMutation = trpc.userManagement.updateRole.useMutation({
    onSuccess: () => utils.userManagement.getUsers.invalidate()
  });

  // Staff management mutations
  const createStaffMutation = trpc.staffManagement.create.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        setShowAddStaff(false);
        setStaffName(""); setStaffEmail(""); setStaffPassword(""); setStaffRole("counselor");
        utils.staffManagement.getAll.invalidate();
      }
    }
  });

  const updateStaffMutation = trpc.staffManagement.update.useMutation({
    onSuccess: () => utils.staffManagement.getAll.invalidate()
  });

  const deleteStaffMutation = trpc.staffManagement.delete.useMutation({
    onSuccess: () => utils.staffManagement.getAll.invalidate()
  });

  const resetPasswordMutation = trpc.staffManagement.resetPassword.useMutation({
    onSuccess: () => {
      setResetPasswordStaffId(null);
      setResetNewPassword("");
      utils.staffManagement.getAll.invalidate();
    }
  });

  // Monitoring queries
  const { data: counselorDetail, isLoading: counselorDetailLoading } = trpc.admin.getCounselorDetail.useQuery(
    { counselorName: monitorCounselor! },
    { enabled: !!monitorCounselor && isAuthenticated && isAdminOrGM }
  );

  const { data: studentDetail, isLoading: studentDetailLoading } = trpc.admin.getStudentDetail.useQuery(
    { applicationId: monitorStudentId! },
    { enabled: !!monitorStudentId && isAuthenticated && isAdminOrGM }
  );

  // Admin delete mutations
  const deleteApplicationMutation = trpc.adminDelete.deleteApplication.useMutation({
    onSuccess: () => { utils.application.getAll.invalidate(); utils.admin.getLeads.invalidate(); }
  });

  const deleteDocumentMutation = trpc.adminDelete.deleteDocument.useMutation({
    onSuccess: () => utils.admin.getDocuments.invalidate()
  });

  const deleteLeadMutation = trpc.adminDelete.deleteLead.useMutation({
    onSuccess: () => utils.admin.getLeads.invalidate()
  });

  const deleteAppointmentMutation = trpc.adminDelete.deleteAppointment.useMutation({
    onSuccess: () => utils.admin.getAppointments.invalidate()
  });

  const deleteScholarshipLeadMutation = trpc.adminDelete.deleteScholarshipLead.useMutation({
    onSuccess: () => utils.scholarship.getLeads.invalidate()
  });

  const deleteConversationMutation = trpc.adminDelete.deleteConversation.useMutation({
    onSuccess: () => { utils.admin.getConversations.invalidate(); utils.admin.getDocuments.invalidate(); utils.admin.getLeads.invalidate(); }
  });

  // Access links queries & mutations
  const { data: accessLinksData, isLoading: accessLinksLoading } = trpc.aptitude.listLinks.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin' && activeTab === 'accessLinks'
  });

  // Pro Orders tracking
  const { data: proOrdersData, isLoading: proOrdersLoading } = trpc.aptitude.listProOrders.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin' && activeTab === 'proOrders'
  });

  const generateLinksMutation = trpc.aptitude.generateLinks.useMutation({
    onSuccess: () => {
      utils.aptitude.listLinks.invalidate();
      setLinkCount(10);
      setLinkExpiry("");
    }
  });

  const deleteLinkMutation = trpc.aptitude.deleteLink.useMutation({
    onSuccess: () => utils.aptitude.listLinks.invalidate()
  });

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/test/pro?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const copyAllUnused = () => {
    const unused = accessLinksData?.filter((l: any) => l.status === 'unused' && new Date(l.expiresAt) > new Date()) || [];
    const urls = unused.map((l: any) => `${window.location.origin}/test/pro?token=${l.token}`).join('\n');
    navigator.clipboard.writeText(urls);
    setCopiedToken('all');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
      <SEO
        title="Admin Dashboard | SpecTa Education"
        description="Administration dashboard for SpecTa Education management."
        noindex
      />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">Please log in to access the admin dashboard.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary hover:bg-primary/90">
              Log In
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (!isAdminOrGM) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to access this page.</p>
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'general_manager': return 'bg-purple-100 text-purple-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeCounselors = activeCounselorsData?.counselors || [];
  // Get staff accounts with counselor role for the assignment dropdown
  const staffCounselors = (staffData?.staff || []).filter((s: any) => s.role === 'counselor' && s.isActive);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/QxrYSewOYzAuPIEN.jpeg" alt="SpecTa Education" className="h-10 object-contain" />
            </Link>
            <span className="text-sm font-medium text-muted-foreground">Admin Dashboard</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user?.role || 'user')}`}>
              {user?.role === 'general_manager' ? 'General Manager' : user?.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/agents">
              <Button variant="outline" size="sm" className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100">
                <Bot className="w-4 h-4 mr-2" />
                AI Agents
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.name || 'Admin'}
            </span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold">{leadsData?.leads?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Leads</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-xl font-bold">{conversationsData?.conversations?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Chats</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{documentsData?.documents?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Docs</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{appointmentsData?.appointments?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Bookings</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{applicationsData?.applications?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Applications</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{ieltsData?.results?.length || 0}</div>
                <div className="text-xs text-muted-foreground">IELTS</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{counselorsData?.counselors?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Counselors</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{activeCounselors.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Agent - Recent Lead Assignments */}
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Agent — Recent Lead Assignments</h3>
                <p className="text-xs text-muted-foreground">Auto-assigned by CRM Distributor Agent</p>
              </div>
            </div>
            <Link href="/admin/agents">
              <Button variant="outline" size="sm" className="text-xs">
                <Eye className="w-3 h-3 mr-1" /> View All Agents
              </Button>
            </Link>
          </div>
          <AgentAssignmentsWidget />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant={activeTab === 'analytics' ? 'default' : 'outline'} onClick={() => setActiveTab('analytics')} size="sm">
            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
          </Button>
          <Button variant={activeTab === 'leads' ? 'default' : 'outline'} onClick={() => setActiveTab('leads')} size="sm">
            <Users className="w-4 h-4 mr-2" /> Leads
          </Button>
          <Button variant={activeTab === 'applications' ? 'default' : 'outline'} onClick={() => setActiveTab('applications')} size="sm">
            <ClipboardList className="w-4 h-4 mr-2" /> Applications
          </Button>
          <Button variant={activeTab === 'appointments' ? 'default' : 'outline'} onClick={() => setActiveTab('appointments')} size="sm">
            <CalendarCheck className="w-4 h-4 mr-2" /> Appointments
          </Button>
          <Button variant={activeTab === 'counselors' ? 'default' : 'outline'} onClick={() => setActiveTab('counselors')} size="sm">
            <Briefcase className="w-4 h-4 mr-2" /> Counselors
          </Button>
          <Button variant={activeTab === 'ielts' ? 'default' : 'outline'} onClick={() => setActiveTab('ielts')} size="sm">
            <BookOpen className="w-4 h-4 mr-2" /> IELTS Practice
          </Button>
          <Button variant={activeTab === 'conversations' ? 'default' : 'outline'} onClick={() => setActiveTab('conversations')} size="sm">
            <MessageSquare className="w-4 h-4 mr-2" /> Conversations
          </Button>
          <Button variant={activeTab === 'documents' ? 'default' : 'outline'} onClick={() => setActiveTab('documents')} size="sm">
            <FileText className="w-4 h-4 mr-2" /> Documents
          </Button>
          <Button variant={activeTab === 'scholarshipLeads' ? 'default' : 'outline'} onClick={() => setActiveTab('scholarshipLeads')} size="sm">
            <Globe className="w-4 h-4 mr-2" /> Scholarship Leads
          </Button>
          {user?.role === 'admin' && (
            <>
              <Button variant={activeTab === 'staff' ? 'default' : 'outline'} onClick={() => setActiveTab('staff')} size="sm">
                <UserCog className="w-4 h-4 mr-2" /> Staff Accounts
              </Button>
              <Button variant={activeTab === 'team' ? 'default' : 'outline'} onClick={() => setActiveTab('team')} size="sm">
                <Shield className="w-4 h-4 mr-2" /> Team Management
              </Button>
              <Button variant={activeTab === 'accessLinks' ? 'default' : 'outline'} onClick={() => setActiveTab('accessLinks')} size="sm">
                <Link2 className="w-4 h-4 mr-2" /> Access Links
              </Button>
              <Button variant={activeTab === 'universities' ? 'default' : 'outline'} onClick={() => setActiveTab('universities')} size="sm">
                <Building2 className="w-4 h-4 mr-2" /> Universities
              </Button>
              <Button variant={activeTab === 'proOrders' ? 'default' : 'outline'} onClick={() => setActiveTab('proOrders')} size="sm">
                <CreditCard className="w-4 h-4 mr-2" /> Pro Orders
              </Button>
              <Button variant={activeTab === 'campaigns' ? 'default' : 'outline'} onClick={() => setActiveTab('campaigns')} size="sm">
                <Mail className="w-4 h-4 mr-2" /> Campaigns
              </Button>
              <Button variant={activeTab === 'blog' ? 'default' : 'outline'} onClick={() => setActiveTab('blog')} size="sm">
                <FileText className="w-4 h-4 mr-2" /> Blog
              </Button>
              <Button variant={activeTab === 'comments' ? 'default' : 'outline'} onClick={() => setActiveTab('comments')} size="sm">
                <MessageSquare className="w-4 h-4 mr-2" /> Comments
              </Button>
              <Button variant={activeTab === 'dataManagement' ? 'default' : 'outline'} onClick={() => setActiveTab('dataManagement')} size="sm">
                <Trash2 className="w-4 h-4 mr-2" /> Data Management
              </Button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* ===== LEADS TAB ===== */}
          {activeTab === 'analytics' && (
            <div className="p-4">
              <AnalyticsDashboard />
            </div>
          )}

          {activeTab === 'leads' && (
            <div>
              {/* Search and Filter Bar */}
              <div className="p-4 border-b border-border bg-muted/30 flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  placeholder="Search by name, phone, or tags..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-border rounded-md bg-background"
                />
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-border rounded-md bg-background"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="closed">Closed</option>
                </select>
                <span className="text-xs text-muted-foreground">
                  {leadsData?.leads?.length || 0} total leads
                </span>
              </div>

              {leadsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : leadsData?.leads?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No leads yet. Leads will appear here when students provide their contact information via the AI chatbot.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leadsData?.leads
                    ?.filter((lead: any) => {
                      const searchLower = leadSearch.toLowerCase();
                      const matchesSearch = !leadSearch || 
                        lead.studentName?.toLowerCase().includes(searchLower) ||
                        lead.studentPhone?.toLowerCase().includes(searchLower) ||
                        lead.studentEmail?.toLowerCase().includes(searchLower) ||
                        lead.tags?.toLowerCase().includes(searchLower) ||
                        lead.intentSummary?.toLowerCase().includes(searchLower);
                      const matchesStatus = leadStatusFilter === 'all' || lead.status === leadStatusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((lead: any) => {
                      const tags: string[] = (() => { try { return JSON.parse(lead.tags || '[]'); } catch { return []; } })();
                      const isExpanded = expandedLeadTranscript === lead.id;
                      return (
                        <div key={lead.id} className="p-6 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-semibold text-lg">{lead.studentName}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                                  {lead.status}
                                </span>
                                {lead.source === 'chatbot' && (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    Chatbot
                                  </span>
                                )}
                                {lead.isAnonymous && (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                                    Anonymous
                                  </span>
                                )}
                              </div>

                              {/* Contact Info Row */}
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {lead.studentPhone && (
                                  <a href={`tel:${lead.studentPhone}`} className="flex items-center gap-1 hover:text-foreground">
                                    <Phone className="w-4 h-4" /> {lead.studentPhone}
                                  </a>
                                )}
                                {lead.studentEmail && (
                                  <a href={`mailto:${lead.studentEmail}`} className="flex items-center gap-1 hover:text-foreground">
                                    <Mail className="w-4 h-4" /> {lead.studentEmail}
                                  </a>
                                )}
                                {lead.preferredCountry && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="w-4 h-4" /> {lead.preferredCountry}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" /> {formatDate(lead.createdAt)}
                                </span>
                              </div>

                              {/* Intent Summary */}
                              {lead.intentSummary && (
                                <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                                  <p className="text-sm text-foreground"><strong>Intent:</strong> {lead.intentSummary}</p>
                                </div>
                              )}

                              {/* Tags */}
                              {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {tags.map((tag: string, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Transcript Toggle */}
                              {lead.chatTranscript && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => setExpandedLeadTranscript(isExpanded ? null : lead.id)}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {isExpanded ? 'Hide Transcript' : 'View Chat Transcript'}
                                  </button>
                                  {isExpanded && (
                                    <div className="mt-2 p-3 bg-muted rounded-lg border border-border/50 max-h-60 overflow-y-auto">
                                      <pre className="text-xs whitespace-pre-wrap font-sans text-muted-foreground">{lead.chatTranscript}</pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 ml-4 shrink-0">
                              {lead.studentPhone && (
                                <a href={`https://wa.me/${lead.studentPhone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline">
                                    <Phone className="w-4 h-4 mr-1" /> WhatsApp
                                  </Button>
                                </a>
                              )}
                              <select
                                value={lead.status}
                                onChange={(e) => updateLeadMutation.mutate({ id: lead.id, status: e.target.value as any })}
                                className="px-3 py-1 text-sm border border-border rounded-md bg-background"
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="converted">Converted</option>
                                <option value="closed">Closed</option>
                              </select>
                              {user?.role === 'admin' && (
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => {
                                  if (confirm(`Delete lead ${lead.studentName}? This cannot be undone.`)) {
                                    deleteLeadMutation.mutate({ id: lead.id });
                                  }
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ===== APPLICATIONS TAB ===== */}
          {activeTab === 'applications' && (
            <div>
              {applicationsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : applicationsData?.applications?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No applications yet. Applications will appear here when students submit Quick Apply forms.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {applicationsData?.applications?.map((app) => {
                    const universities = (() => { try { return JSON.parse(app.selectedUniversities); } catch { return []; } })();
                    const isEditing = editingAppId === app.id;
                    
                    return (
                      <div key={app.id} className="p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-lg cursor-pointer hover:text-primary hover:underline" onClick={() => setMonitorStudentId(app.id)}>{app.fullName}</h3>
                              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {app.referenceNumber || `#${app.id}`}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${APP_STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800'}`}>
                                {app.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <a href={`mailto:${app.email}`} className="flex items-center gap-1 hover:text-foreground">
                                <Mail className="w-3.5 h-3.5" /> {app.email}
                              </a>
                              <a href={`tel:${app.phone}`} className="flex items-center gap-1 hover:text-foreground">
                                <Phone className="w-3.5 h-3.5" /> {app.phone}
                              </a>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> {formatDate(app.createdAt)}
                              </span>
                              {app.assignedCounselor && (
                                <span className="flex items-center gap-1 text-blue-600 font-medium cursor-pointer hover:underline" onClick={() => setMonitorCounselor(app.assignedCounselor!)}>
                                  <Briefcase className="w-3.5 h-3.5" /> {app.assignedCounselor}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <Button size="sm" onClick={() => {
                                  updateApplicationMutation.mutate({
                                    id: app.id,
                                    status: editStatus as any,
                                    assignedCounselor: editCounselor || undefined
                                  });
                                }} disabled={updateApplicationMutation.isPending}>
                                  <Save className="w-4 h-4 mr-1" /> Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingAppId(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => {
                                  setEditingAppId(app.id);
                                  setEditStatus(app.status);
                                  setEditCounselor(app.assignedCounselor || "");
                                }}>
                                  <Edit className="w-4 h-4 mr-1" /> Edit
                                </Button>
                                {user?.role === 'admin' && (
                                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => {
                                    if (confirm(`Delete application from ${app.fullName}? This cannot be undone.`)) {
                                      deleteApplicationMutation.mutate({ id: app.id });
                                    }
                                  }}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="bg-muted/50 rounded-lg p-4 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                              >
                                {APP_STATUS_OPTIONS.map(s => (
                                  <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned Counselor</label>
                              <select
                                value={editCounselor}
                                onChange={(e) => setEditCounselor(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                              >
                                <option value="">-- Select Counselor --</option>
                                {staffCounselors.map((c: any) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name} ({c.email})
                                  </option>
                                ))}
                                {/* Fallback: also show old counselors not in staff accounts */}
                                {activeCounselors.filter(c => !staffCounselors.some((sc: any) => sc.name.toLowerCase() === c.name.toLowerCase())).map((c) => (
                                  <option key={`old-${c.id}`} value={c.name}>
                                    {c.name} {c.specialization ? `(${c.specialization})` : ''} — legacy
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Documents links */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {app.transcriptUrl && (
                            <a href={app.transcriptUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full hover:bg-green-100 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Transcript
                            </a>
                          )}
                          {app.passportUrl && (
                            <a href={app.passportUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Passport
                            </a>
                          )}
                          {app.ieltsDocUrl && (
                            <a href={app.ieltsDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full hover:bg-purple-100 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> IELTS Score
                            </a>
                          )}
                          {app.certificateUrl && (
                            <a href={app.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full hover:bg-amber-100 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Certificate
                            </a>
                          )}
                        </div>

                        {/* Universities */}
                        {universities.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {universities.map((uni: any, i: number) => (
                              <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                                {uni.university || uni.name} {uni.program ? `· ${uni.program}` : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Add Note */}
                        {adminNoteAppId === app.id ? (
                          <div className="bg-muted/30 rounded-lg p-3 mt-2">
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="Write a note..."
                                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                              />
                              <Button size="sm" onClick={() => {
                                if (adminNote.trim()) {
                                  addAdminNoteMutation.mutate({
                                    applicationId: app.id,
                                    content: adminNote.trim(),
                                    isPublic: !adminNoteIsInternal
                                  });
                                }
                              }} disabled={addAdminNoteMutation.isPending}>
                                Send
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setAdminNoteAppId(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={adminNoteIsInternal}
                                onChange={(e) => setAdminNoteIsInternal(e.target.checked)}
                                className="rounded"
                              />
                              Internal note (not visible to student)
                            </label>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                            setAdminNoteAppId(app.id);
                            setAdminNote("");
                            setAdminNoteIsInternal(false);
                          }}>
                            <MessageSquare className="w-3.5 h-3.5 mr-1" /> Add Note
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== APPOINTMENTS TAB ===== */}
          {activeTab === 'appointments' && (
            <div>
              {appointmentsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : appointmentsData?.appointments?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No appointments yet. Bookings will appear here when students schedule consultations.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {appointmentsData?.appointments?.map((apt) => (
                    <div key={apt.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{apt.fullName}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAppointmentStatusColor(apt.status)}`}>
                              {apt.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {apt.timeSlot}
                            </span>
                            <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs">
                              {apt.consultationType}
                            </span>
                            <a href={`mailto:${apt.email}`} className="flex items-center gap-1 hover:text-foreground">
                              <Mail className="w-3.5 h-3.5" /> {apt.email}
                            </a>
                            <a href={`tel:${apt.phone}`} className="flex items-center gap-1 hover:text-foreground">
                              <Phone className="w-3.5 h-3.5" /> {apt.phone}
                            </a>
                          </div>
                          {apt.notes && (
                            <p className="text-sm text-muted-foreground italic">"{apt.notes}"</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <a href={`https://wa.me/${apt.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Phone className="w-4 h-4 mr-1" /> WhatsApp
                            </Button>
                          </a>
                          <select
                            value={apt.status}
                            onChange={(e) => updateAppointmentMutation.mutate({ id: apt.id, status: e.target.value as any })}
                            className="px-3 py-1 text-sm border border-border rounded-md bg-background"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          {user?.role === 'admin' && (
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => {
                              if (confirm(`Delete appointment for ${apt.fullName}? This cannot be undone.`)) {
                                deleteAppointmentMutation.mutate({ id: apt.id });
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== COUNSELORS TAB ===== */}
          {activeTab === 'counselors' && (
            <div>
              {/* Add Counselor Button */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-lg">Counselor Management</h3>
                <Button size="sm" onClick={() => {
                  setShowAddCounselor(true);
                  setEditingCounselorId(null);
                  setCounselorName("");
                  setCounselorEmail("");
                  setCounselorPhone("");
                  setCounselorSpec("");
                }}>
                  <UserPlus className="w-4 h-4 mr-2" /> Add Counselor
                </Button>
              </div>

              {/* Add/Edit Counselor Form */}
              {(showAddCounselor || editingCounselorId !== null) && (
                <div className="p-4 bg-muted/30 border-b border-border">
                  <h4 className="font-medium mb-3">{editingCounselorId ? 'Edit Counselor' : 'Add New Counselor'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                      <input
                        type="text"
                        value={counselorName}
                        onChange={(e) => setCounselorName(e.target.value)}
                        placeholder="Full name"
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
                      <input
                        type="email"
                        value={counselorEmail}
                        onChange={(e) => setCounselorEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                      <input
                        type="text"
                        value={counselorPhone}
                        onChange={(e) => setCounselorPhone(e.target.value)}
                        placeholder="+62..."
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Specialization</label>
                      <select
                        value={counselorSpec}
                        onChange={(e) => setCounselorSpec(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                      >
                        <option value="">-- Select --</option>
                        {SPECIALIZATIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {editingCounselorId ? (
                      <Button size="sm" onClick={() => {
                        if (counselorName && counselorEmail) {
                          updateCounselorMutation.mutate({
                            id: editingCounselorId,
                            name: counselorName,
                            email: counselorEmail,
                            phone: counselorPhone || undefined,
                            specialization: counselorSpec || undefined,
                          });
                        }
                      }} disabled={updateCounselorMutation.isPending || !counselorName || !counselorEmail}>
                        <Save className="w-4 h-4 mr-1" /> Update Counselor
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => {
                        if (counselorName && counselorEmail) {
                          createCounselorMutation.mutate({
                            name: counselorName,
                            email: counselorEmail,
                            phone: counselorPhone || undefined,
                            specialization: counselorSpec || undefined,
                          });
                        }
                      }} disabled={createCounselorMutation.isPending || !counselorName || !counselorEmail}>
                        <UserPlus className="w-4 h-4 mr-1" /> Add Counselor
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => {
                      setShowAddCounselor(false);
                      setEditingCounselorId(null);
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Counselors List */}
              {counselorsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : counselorsData?.counselors?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No counselors added yet. Click "Add Counselor" to register your team members.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {counselorsData?.counselors?.map((counselor) => (
                    <div key={counselor.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">
                                {counselor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold">{counselor.name}</h3>
                              <div className="flex items-center gap-2">
                                {counselor.specialization && (
                                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                    {counselor.specialization}
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${counselor.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {counselor.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-[52px]">
                            <a href={`mailto:${counselor.email}`} className="flex items-center gap-1 hover:text-foreground">
                              <Mail className="w-3.5 h-3.5" /> {counselor.email}
                            </a>
                            {counselor.phone && (
                              <a href={`tel:${counselor.phone}`} className="flex items-center gap-1 hover:text-foreground">
                                <Phone className="w-3.5 h-3.5" /> {counselor.phone}
                              </a>
                            )}
                            <span className="flex items-center gap-1 font-medium text-indigo-600">
                              <ClipboardList className="w-3.5 h-3.5" /> {counselor.activeApplications || 0} active applications
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            updateCounselorMutation.mutate({
                              id: counselor.id,
                              isActive: !counselor.isActive
                            });
                          }}>
                            {counselor.isActive ? <ToggleRight className="w-4 h-4 mr-1 text-green-600" /> : <ToggleLeft className="w-4 h-4 mr-1" />}
                            {counselor.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingCounselorId(counselor.id);
                            setShowAddCounselor(false);
                            setCounselorName(counselor.name);
                            setCounselorEmail(counselor.email);
                            setCounselorPhone(counselor.phone || "");
                            setCounselorSpec(counselor.specialization || "");
                          }}>
                            <Edit className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => {
                            if (confirm(`Are you sure you want to remove ${counselor.name}?`)) {
                              deleteCounselorMutation.mutate({ id: counselor.id });
                            }
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== IELTS PRACTICE TAB ===== */}
          {activeTab === 'ielts' && (
            <div>
              {ieltsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : ieltsData?.results?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No IELTS practice results yet. Results will appear here when students complete practice tests.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {ieltsData?.results?.map((result: any) => (
                    <div key={result.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{result.studentName}</h3>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                              {result.section.toUpperCase()}
                            </span>
                            {result.score !== null && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Score: {result.score}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <a href={`mailto:${result.studentEmail}`} className="flex items-center gap-1 hover:text-foreground">
                              <Mail className="w-3.5 h-3.5" /> {result.studentEmail}
                            </a>
                            {result.studentPhone && (
                              <a href={`tel:${result.studentPhone}`} className="flex items-center gap-1 hover:text-foreground">
                                <Phone className="w-3.5 h-3.5" /> {result.studentPhone}
                              </a>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {formatDate(result.createdAt)}
                            </span>
                          </div>
                        </div>
                        <a href={`https://wa.me/${result.studentPhone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline">
                            <Phone className="w-4 h-4 mr-1" /> Follow Up
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== CONVERSATIONS TAB ===== */}
          {activeTab === 'conversations' && (
            <div className="grid md:grid-cols-2 divide-x divide-border">
              <div>
                {conversationsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : conversationsData?.conversations?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No conversations yet.
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y divide-border">
                      {conversationsData?.conversations?.map((conv) => (
                        <div key={conv.id} className={`flex items-center gap-1 hover:bg-muted/50 transition-colors ${
                            selectedConversationId === conv.id ? 'bg-muted' : ''
                          }`}>
                          <button
                            onClick={() => setSelectedConversationId(conv.id)}
                            className="flex-1 p-4 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{conv.studentName || 'Anonymous'}</div>
                                <div className="text-sm text-muted-foreground">{conv.preferredCountry || 'No country selected'}</div>
                              </div>
                              <div className="text-xs text-muted-foreground">{formatDate(conv.createdAt)}</div>
                            </div>
                          </button>
                          {user?.role === 'admin' && (
                            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 mr-2 shrink-0" onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete conversation with ${conv.studentName || 'Anonymous'}? All messages and related documents will be deleted.`)) {
                                deleteConversationMutation.mutate({ id: conv.id });
                              }
                            }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              <div>
                {selectedConversationId ? (
                  <ScrollArea className="h-[500px] p-4">
                    <div className="space-y-4">
                      {conversationMessages?.messages?.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">{formatDate(msg.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                    Select a conversation to view messages
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== DOCUMENTS TAB (UNIFIED VIEW) ===== */}
          {activeTab === 'documents' && (
            <div>
              {/* Header with filters */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">All Documents</h3>
                  <span className="text-sm text-muted-foreground">
                    {(() => {
                      const chatbotCount = documentsData?.documents?.length || 0;
                      const appCount = documentsData?.applicationDocuments?.length || 0;
                      return `${chatbotCount + appCount} total documents`;
                    })()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex gap-1">
                    {(["all", "chatbot", "application", "tracker"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setDocFilter(f)}
                        className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                          docFilter === f
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {f === "all" ? "All" : f === "chatbot" ? "AI Chatbot" : f === "application" ? "Quick Apply" : "Track My App"}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by student name, email, or reference..."
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background"
                    />
                  </div>
                </div>
              </div>

              {documentsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : (() => {
                // Build unified document list
                const allDocs: Array<{
                  id: string;
                  fileName: string;
                  documentType: string;
                  fileUrl: string;
                  source: "chatbot" | "application" | "tracker";
                  studentName?: string;
                  studentEmail?: string;
                  referenceNumber?: string;
                  uploadedBy?: string;
                  createdAt: any;
                }> = [];

                // Add chatbot documents
                (documentsData?.documents || []).forEach((doc: any) => {
                  allDocs.push({
                    id: `chat-${doc.id}`,
                    fileName: doc.fileName,
                    documentType: doc.documentType || "Document",
                    fileUrl: doc.fileUrl,
                    source: "chatbot",
                    studentName: doc.studentName || doc.conversationId ? `Chat #${doc.conversationId}` : undefined,
                    studentEmail: doc.studentEmail,
                    createdAt: doc.createdAt,
                  });
                });

                // Add application documents
                (documentsData?.applicationDocuments || []).forEach((doc: any) => {
                  allDocs.push({
                    id: `app-${doc.id}`,
                    fileName: doc.fileName,
                    documentType: doc.documentType || "Document",
                    fileUrl: doc.fileUrl,
                    source: doc.uploadedBy === "student" && doc.applicationId ? "application" : "tracker",
                    studentName: doc.studentName || doc.appStudentName,
                    studentEmail: doc.studentEmail || doc.appStudentEmail,
                    referenceNumber: doc.referenceNumber || doc.appReferenceNumber,
                    uploadedBy: doc.uploadedBy,
                    createdAt: doc.createdAt,
                  });
                });

                // Apply filters
                let filtered = allDocs;
                if (docFilter !== "all") {
                  filtered = filtered.filter(d => d.source === docFilter);
                }
                if (docSearch.trim()) {
                  const q = docSearch.toLowerCase();
                  filtered = filtered.filter(d =>
                    (d.studentName || "").toLowerCase().includes(q) ||
                    (d.studentEmail || "").toLowerCase().includes(q) ||
                    (d.referenceNumber || "").toLowerCase().includes(q) ||
                    d.fileName.toLowerCase().includes(q)
                  );
                }

                // Sort by date descending
                filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-muted-foreground">
                      {allDocs.length === 0 ? "No documents uploaded yet." : "No documents match your filter."}
                    </div>
                  );
                }

                const sourceColors: Record<string, string> = {
                  chatbot: "bg-purple-100 text-purple-800",
                  application: "bg-blue-100 text-blue-800",
                  tracker: "bg-green-100 text-green-800",
                };
                const sourceLabels: Record<string, string> = {
                  chatbot: "AI Chatbot",
                  application: "Quick Apply",
                  tracker: "Track My App",
                };

                return (
                  <div className="divide-y divide-border">
                    {filtered.map((doc) => (
                      <div key={doc.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{doc.fileName}</div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${sourceColors[doc.source]}`}>
                                  {sourceLabels[doc.source]}
                                </span>
                                <span className="px-2 py-0.5 bg-muted rounded text-xs">{doc.documentType}</span>
                                <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
                              </div>
                              {(doc.studentName || doc.studentEmail || doc.referenceNumber) && (
                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                  {doc.studentName && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" /> {doc.studentName}
                                    </span>
                                  )}
                                  {doc.studentEmail && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" /> {doc.studentEmail}
                                    </span>
                                  )}
                                  {doc.referenceNumber && (
                                    <span className="flex items-center gap-1">
                                      <ClipboardList className="w-3 h-3" /> {doc.referenceNumber}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">
                                <ExternalLink className="w-4 h-4 mr-1" /> View
                              </Button>
                            </a>
                            <a href={doc.fileUrl} download={doc.fileName}>
                              <Button size="sm" variant="outline">
                                <Download className="w-4 h-4" />
                              </Button>
                            </a>
                            {user?.role === 'admin' && (
                              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => {
                                if (confirm(`Delete this document? This cannot be undone.`)) {
                                  const docIdNum = parseInt(doc.id.replace(/^(chat-|app-)/, ''), 10);
                                    deleteDocumentMutation.mutate({ id: docIdNum, type: doc.source === 'chatbot' ? 'chatbot' : 'application' });
                                }
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ===== SCHOLARSHIP LEADS TAB ===== */}
          {activeTab === 'scholarshipLeads' && (
            <div>
              {scholarshipLeadsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : !scholarshipLeadsData || scholarshipLeadsData.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No scholarship leads yet. Leads will appear here when students use the eligibility checker.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {scholarshipLeadsData.map((lead) => {
                    const interestMap: Record<string, string> = {
                      china: "\ud83c\udde8\ud83c\uddf3 China 100%",
                      mila_malaysia: "\ud83c\uddf2\ud83c\uddfe Mila University",
                      lpdp: "\ud83c\uddee\ud83c\udde9 LPDP",
                      not_sure: "\ud83e\udd14 Not Sure",
                    };
                    const statusColors: Record<string, string> = {
                      new: "bg-blue-100 text-blue-800",
                      contacted: "bg-yellow-100 text-yellow-800",
                      qualified: "bg-green-100 text-green-800",
                      converted: "bg-emerald-100 text-emerald-800",
                      closed: "bg-gray-100 text-gray-800",
                    };
                    return (
                      <div key={lead.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{lead.studentName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                                {lead.status}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-0.5">
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.studentEmail}</span>
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.studentPhone}</span>
                              </div>
                              <div className="flex items-center gap-4 flex-wrap mt-1">
                                <span><strong>Education:</strong> {lead.educationLevel}</span>
                                <span><strong>GPA:</strong> {lead.gpa}</span>
                                <span><strong>Interest:</strong> {interestMap[lead.scholarshipInterest] || lead.scholarshipInterest}</span>
                                <span><strong>IELTS:</strong> {lead.ieltsStatus}{lead.ieltsScore ? ` (${lead.ieltsScore})` : ''}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDate(lead.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={lead.status}
                              onChange={(e) => updateScholarshipLeadMutation.mutate({ id: lead.id, status: e.target.value as any })}
                              className="text-xs border border-border rounded px-2 py-1 bg-background"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="qualified">Qualified</option>
                              <option value="converted">Converted</option>
                              <option value="closed">Closed</option>
                            </select>
                            {user?.role === 'admin' && (
                              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => {
                                if (confirm(`Delete scholarship lead ${lead.studentName}? This cannot be undone.`)) {
                                  deleteScholarshipLeadMutation.mutate({ id: lead.id });
                                }
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== STAFF ACCOUNTS TAB (Admin Only) ===== */}
          {activeTab === 'staff' && user?.role === 'admin' && (
            <div>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Staff Accounts</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage staff login accounts. Staff can log in at <strong>/staff-login</strong> with their email and password.
                  </p>
                </div>
                <Button size="sm" className="bg-primary" onClick={() => setShowAddStaff(!showAddStaff)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Add Staff
                </Button>
              </div>

              {/* Add Staff Form */}
              {showAddStaff && (
                <div className="p-4 bg-muted/50 border-b border-border">
                  <h4 className="font-medium mb-3">Create New Staff Account</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                      <input className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background" placeholder="e.g. John Doe" value={staffName} onChange={e => setStaffName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <input className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background" placeholder="e.g. john@spectaeducation.com" type="email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Password</label>
                      <div className="relative">
                        <input className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background pr-10" placeholder="Min 6 characters" type={showStaffPassword ? 'text' : 'password'} value={staffPassword} onChange={e => setStaffPassword(e.target.value)} />
                        <button type="button" onClick={() => setShowStaffPassword(!showStaffPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Role</label>
                      <select className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background" value={staffRole} onChange={e => setStaffRole(e.target.value as any)}>
                        <option value="counselor">Counselor</option>
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="bg-primary" disabled={createStaffMutation.isPending || !staffName || !staffEmail || staffPassword.length < 6}
                      onClick={() => createStaffMutation.mutate({ name: staffName, email: staffEmail, password: staffPassword, role: staffRole })}>
                      {createStaffMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
                      Create & Send Welcome Email
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddStaff(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {staffLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
              ) : !staffData?.staff?.length ? (
                <div className="p-8 text-center text-muted-foreground">No staff accounts yet. Click "Add Staff" to create one.</div>
              ) : (
                <div className="divide-y divide-border">
                  {staffData.staff.map((s: any) => (
                    <div key={s.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.isActive ? 'bg-primary/10' : 'bg-red-100'}`}>
                            <span className={`text-sm font-bold ${s.isActive ? 'text-primary' : 'text-red-600'}`}>
                              {(s.name || 'S').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{s.name}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                s.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                s.role === 'counselor' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {s.role}
                              </span>
                              {!s.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">Inactive</span>}
                              {s.mustChangePassword && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Must change password</span>}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {s.email}</span>
                              {s.lastLoginAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last login: {new Date(s.lastLoginAt).toLocaleDateString()}</span>}
                              {!s.lastLoginAt && <span className="flex items-center gap-1 text-amber-600"><Clock className="w-3 h-3" /> Never logged in</span>}
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created: {new Date(s.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Toggle Active */}
                          <Button variant="ghost" size="sm" title={s.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => { if (confirm(`${s.isActive ? 'Deactivate' : 'Activate'} ${s.name}?`)) updateStaffMutation.mutate({ id: s.id, isActive: !s.isActive }); }}>
                            {s.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-red-600" />}
                          </Button>
                          {/* Reset Password */}
                          <Button variant="ghost" size="sm" title="Reset Password"
                            onClick={() => { setResetPasswordStaffId(resetPasswordStaffId === s.id ? null : s.id); setResetNewPassword(''); }}>
                            <KeyRound className="w-4 h-4 text-amber-600" />
                          </Button>
                          {/* Delete */}
                          <Button variant="ghost" size="sm" title="Delete Staff"
                            onClick={() => { if (confirm(`Delete staff account for ${s.name}? This cannot be undone.`)) deleteStaffMutation.mutate({ id: s.id }); }}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      {/* Reset Password Form */}
                      {resetPasswordStaffId === s.id && (
                        <div className="mt-3 ml-[52px] p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm font-medium mb-2">Reset password for {s.name}</p>
                          <div className="flex gap-2 items-center">
                            <input className="px-3 py-1.5 text-sm border border-border rounded-md bg-background w-48" placeholder="New password (min 6 chars)" type="text" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} />
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={resetNewPassword.length < 6 || resetPasswordMutation.isPending}
                              onClick={() => resetPasswordMutation.mutate({ id: s.id, newPassword: resetNewPassword })}>
                              {resetPasswordMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                              Reset & Email
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setResetPasswordStaffId(null)}>Cancel</Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">A password reset email will be sent to {s.email}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== ACCESS LINKS TAB (Admin Only) ===== */}
          {activeTab === 'accessLinks' && user?.role === 'admin' && (
            <div>
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-lg">Tes Bakat AI — Access Links</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate single-use links for the aptitude test. Each link can only be used once.
                </p>
              </div>

              {/* Generate Links Form */}
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Number of Links</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={linkCount}
                      onChange={(e) => setLinkCount(parseInt(e.target.value) || 1)}
                      className="w-24 px-3 py-2 text-sm border border-border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={linkExpiry}
                      onChange={(e) => setLinkExpiry(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 text-sm border border-border rounded-md bg-background"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!linkExpiry) return;
                      generateLinksMutation.mutate({
                        count: linkCount,
                        expiresAt: new Date(linkExpiry + 'T23:59:59').toISOString(),
                      });
                    }}
                    disabled={!linkExpiry || generateLinksMutation.isPending}
                    size="sm"
                  >
                    {generateLinksMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Generate {linkCount} Links
                  </Button>
                  {(accessLinksData?.filter((l: any) => l.status === 'unused' && new Date(l.expiresAt) > new Date()).length || 0) > 0 && (
                    <Button onClick={copyAllUnused} variant="outline" size="sm">
                      {copiedToken === 'all' ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copiedToken === 'all' ? 'Copied All!' : 'Copy All Unused'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Links Table */}
              {accessLinksLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
              ) : !accessLinksData?.length ? (
                <div className="p-8 text-center text-muted-foreground">No access links generated yet. Create some above!</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium">#</th>
                        <th className="text-left p-3 font-medium">Link</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Used By</th>
                        <th className="text-left p-3 font-medium">Expires</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessLinksData.map((link: any, idx: number) => {
                        const isExpired = new Date(link.expiresAt) < new Date();
                        const effectiveStatus = isExpired && link.status === 'unused' ? 'expired' : link.status;
                        const statusColorMap: Record<string, string> = {
                          unused: 'bg-green-100 text-green-800',
                          in_progress: 'bg-yellow-100 text-yellow-800',
                          completed: 'bg-blue-100 text-blue-800',
                          expired: 'bg-red-100 text-red-800',
                        };
                        const statusColor = statusColorMap[effectiveStatus] || 'bg-gray-100 text-gray-800';
                        return (
                          <tr key={link.id} className="border-b border-border hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground">{idx + 1}</td>
                            <td className="p-3">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                ...{link.token.slice(-8)}
                              </code>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                {effectiveStatus.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3">
                              {link.usedByName ? (
                                <div>
                                  <div className="font-medium">{link.usedByName}</div>
                                  <div className="text-xs text-muted-foreground">{link.usedByEmail}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-3 text-xs">
                              {new Date(link.expiresAt).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                {effectiveStatus === 'unused' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyToClipboard(link.token)}
                                      className="h-7 px-2"
                                    >
                                      {copiedToken === link.token ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (confirm('Delete this unused link?')) {
                                          deleteLinkMutation.mutate({ id: link.id });
                                        }
                                      }}
                                      className="h-7 px-2 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                                {effectiveStatus === 'completed' && link.resultId && (
                                  <div className="flex items-center gap-2">
                                    <AptitudeReportDownload resultId={link.resultId} studentName={link.usedByName || 'Student'} language="id" />
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="p-3 text-xs text-muted-foreground border-t border-border">
                    Total: {accessLinksData.length} links · 
                    Unused: {accessLinksData.filter((l: any) => l.status === 'unused' && new Date(l.expiresAt) > new Date()).length} · 
                    Used: {accessLinksData.filter((l: any) => l.status === 'completed').length} · 
                    In Progress: {accessLinksData.filter((l: any) => l.status === 'in_progress').length} · 
                    Expired: {accessLinksData.filter((l: any) => l.status === 'expired' || (l.status === 'unused' && new Date(l.expiresAt) < new Date())).length}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== TEAM MANAGEMENT TAB (Admin Only) ===== */}
          {activeTab === 'team' && user?.role === 'admin' && (
            <div>
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-lg">Team Management</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage user roles. Users need to log in at least once before they appear here. 
                  Promote users to <strong>General Manager</strong> to give them full dashboard access.
                </p>
              </div>
              {usersLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : usersData?.users?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No users found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {usersData?.users?.map((u: any) => (
                    <div key={u.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">
                                {(u.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold">{u.name || 'Unnamed User'}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadge(u.role)}`}>
                                {u.role === 'general_manager' ? 'General Manager' : u.role === 'admin' ? 'Admin' : 'User'}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-[52px]">
                            {u.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" /> {u.email}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> Joined {formatDate(u.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Last login {formatDate(u.lastSignedIn)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {u.id !== user?.id && (
                            <select
                              value={u.role}
                              onChange={(e) => {
                                if (confirm(`Change ${u.name || 'this user'}'s role to ${e.target.value === 'general_manager' ? 'General Manager' : e.target.value}?`)) {
                                  updateRoleMutation.mutate({ userId: u.id, role: e.target.value as any });
                                }
                              }}
                              className="px-3 py-1 text-sm border border-border rounded-md bg-background"
                            >
                              <option value="user">User</option>
                              <option value="general_manager">General Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                          {u.id === user?.id && (
                            <span className="text-xs text-muted-foreground italic px-3 py-1">You</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* ===== UNIVERSITIES TAB ===== */}
          {activeTab === 'universities' && user?.role === 'admin' && (
            <UniversityManager />
          )}

          {/* ===== PRO ORDERS TAB (Admin Only) ===== */}
          {activeTab === 'proOrders' && user?.role === 'admin' && (
            <div>
              {/* Revenue Summary Cards */}
              {!proOrdersLoading && proOrdersData && (
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Tes Bakat AI Pro — Revenue Dashboard
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-700">
                        Rp {((proOrdersData as any[]).filter((o: any) => o.status === 'paid').reduce((sum: number, o: any) => sum + (o.amount || 0), 0)).toLocaleString('id-ID')}
                      </div>
                      <div className="text-xs text-green-600 mt-1">Total Revenue</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">
                        {(proOrdersData as any[]).filter((o: any) => o.status === 'paid').length}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">Paid Orders</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-700">
                        {(proOrdersData as any[]).filter((o: any) => o.status === 'pending').length}
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">Pending</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-700">
                        {(proOrdersData as any[]).length}
                      </div>
                      <div className="text-xs text-purple-600 mt-1">Total Orders</div>
                    </div>
                  </div>

                  {/* Source Breakdown */}
                  <div className="flex gap-4 text-sm">
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                      Landing: {(proOrdersData as any[]).filter((o: any) => o.source === 'landing').length}
                    </span>
                    <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full">
                      Upsell: {(proOrdersData as any[]).filter((o: any) => o.source === 'upsell').length}
                    </span>
                  </div>
                </div>
              )}

              {/* Orders Table */}
              {proOrdersLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
              ) : !proOrdersData || (proOrdersData as any[]).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No Pro orders yet. Orders will appear here when students purchase the Tes Bakat AI Pro.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium">Order ID</th>
                        <th className="text-left p-3 font-medium">Customer</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Amount</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Source</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(proOrdersData as any[]).map((order: any) => (
                        <tr key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{order.externalId}</span>
                          </td>
                          <td className="p-3 font-medium">{order.customerName}</td>
                          <td className="p-3 text-muted-foreground">{order.customerEmail}</td>
                          <td className="p-3 font-medium">Rp {(order.amount || 0).toLocaleString('id-ID')}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              order.status === 'paid' ? 'bg-green-100 text-green-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              order.source === 'upsell' ? 'bg-orange-50 text-orange-700' : 'bg-indigo-50 text-indigo-700'
                            }`}>
                              {order.source}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="p-3">
                            {order.xenditInvoiceUrl && order.status === 'pending' ? (
                              <a href={order.xenditInvoiceUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="text-xs">
                                  <ExternalLink className="w-3 h-3 mr-1" /> Invoice
                                </Button>
                              </a>
                            ) : order.paidAt ? (
                              <span className="text-xs text-green-600">
                                Paid {new Date(order.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'campaigns' && user?.role === 'admin' && (
            <div className="p-4">
              <DripCampaignManager />
            </div>
          )}

          {activeTab === 'blog' && user?.role === 'admin' && (
            <div className="p-4">
              <BlogManager />
            </div>
          )}

          {activeTab === 'comments' && user?.role === 'admin' && (
            <div className="p-4">
              <CommentModeration />
            </div>
          )}
          {activeTab === 'dataManagement' && user?.role === 'admin' && (
            <div className="p-4">
              <DataManagement />
            </div>
          )}
        </div>
      </div>

      {/* ===== COUNSELOR MONITORING MODAL ===== */}
      <Dialog open={!!monitorCounselor} onOpenChange={(open) => { if (!open) setMonitorCounselor(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Counselor: {counselorDetail?.counselor?.name || monitorCounselor}
            </DialogTitle>
            <DialogDescription>
              Monitor counselor activity, assigned students, and progress
            </DialogDescription>
          </DialogHeader>
          {counselorDetailLoading ? (
            <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
          ) : counselorDetail ? (
            <div className="space-y-6">
              {/* Counselor Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{counselorDetail.stats?.totalStudents || 0}</div>
                  <div className="text-xs text-blue-600">Assigned Students</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{counselorDetail.stats?.totalDocuments || 0}</div>
                  <div className="text-xs text-green-600">Documents</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-700">{counselorDetail.stats?.totalNotes || 0}</div>
                  <div className="text-xs text-purple-600">Notes</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-700">
                    {counselorDetail.counselor?.email || 'N/A'}
                  </div>
                  <div className="text-xs text-orange-600">Email</div>
                </div>
              </div>

              {/* Status Breakdown */}
              {counselorDetail.stats?.byStatus && Object.keys(counselorDetail.stats.byStatus).length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-2">Status Breakdown</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(counselorDetail.stats.byStatus).map(([status, count]) => (
                      <span key={status} className={`px-3 py-1 rounded-full text-xs font-medium ${APP_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
                        {status.replace(/_/g, ' ')}: {count as number}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Students List */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Assigned Students</h4>
                {counselorDetail.applications?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students assigned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {counselorDetail.applications?.map((app: any) => {
                      const universities = (() => { try { return JSON.parse(app.selectedUniversities); } catch { return []; } })();
                      return (
                        <div key={app.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="font-semibold cursor-pointer hover:text-primary hover:underline" onClick={() => { setMonitorCounselor(null); setMonitorStudentId(app.id); }}>
                                {app.fullName}
                              </h5>
                              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                <span>{app.email}</span>
                                <span>{app.referenceNumber}</span>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${APP_STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800'}`}>
                              {app.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {universities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {universities.map((u: any, i: number) => (
                                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                  {u.university || u.name} · {u.program || u.course}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{app.documents?.length || 0} documents</span>
                            <span>{app.notes?.length || 0} notes</span>
                            <span>Created: {formatDate(app.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data found.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== STUDENT MONITORING MODAL ===== */}
      <Dialog open={!!monitorStudentId} onOpenChange={(open) => { if (!open) setMonitorStudentId(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Student: {studentDetail?.application?.fullName || 'Loading...'}
            </DialogTitle>
            <DialogDescription>
              Full student profile with application progress, documents, notes, and conversations
            </DialogDescription>
          </DialogHeader>
          {studentDetailLoading ? (
            <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
          ) : studentDetail ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">Documents ({studentDetail.documents?.length || 0})</TabsTrigger>
                <TabsTrigger value="notes">Notes ({studentDetail.notes?.length || 0})</TabsTrigger>
                <TabsTrigger value="conversation">Conversation</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm"><strong>Name:</strong> {studentDetail.application.fullName}</div>
                    <div className="text-sm"><strong>Email:</strong> {studentDetail.application.email}</div>
                    <div className="text-sm"><strong>Phone:</strong> {studentDetail.application.phone}</div>
                    <div className="text-sm"><strong>Reference:</strong> {studentDetail.application.referenceNumber}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm"><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs font-medium ${APP_STATUS_COLORS[studentDetail.application.status] || 'bg-gray-100 text-gray-800'}`}>{studentDetail.application.status.replace(/_/g, ' ')}</span></div>
                    <div className="text-sm"><strong>Counselor:</strong> {studentDetail.application.assignedCounselor ? <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => { setMonitorStudentId(null); setMonitorCounselor(studentDetail.application.assignedCounselor!); }}>{studentDetail.application.assignedCounselor}</span> : 'Not assigned'}</div>
                    <div className="text-sm"><strong>School:</strong> {studentDetail.application.currentSchool || 'N/A'}</div>
                    <div className="text-sm"><strong>IELTS:</strong> {studentDetail.application.ieltsScore || 'N/A'}</div>
                  </div>
                </div>

                {/* Universities */}
                {(() => {
                  const unis = (() => { try { return JSON.parse(studentDetail.application.selectedUniversities); } catch { return []; } })();
                  return unis.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Selected Universities</h4>
                      <div className="space-y-1">
                        {unis.map((u: any, i: number) => (
                          <div key={i} className="text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded flex justify-between">
                            <span>{u.university || u.name}</span>
                            <span className="text-blue-500">{u.program || u.course} · {u.country}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Status History Timeline */}
                {studentDetail.statusHistory?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Status History</h4>
                    <div className="space-y-2">
                      {studentDetail.statusHistory.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${APP_STATUS_COLORS[entry.status] || 'bg-gray-100 text-gray-800'}`}>
                            {entry.status?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
                          </span>
                          {entry.updatedBy && <span className="text-xs text-muted-foreground">by {entry.updatedBy}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-4">
                {studentDetail.documents?.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {studentDetail.documents?.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <div className="text-sm font-medium">{doc.fileName}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.documentType} · Uploaded by {doc.uploadedBy} · {formatDate(doc.createdAt)}
                          </div>
                        </div>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline"><ExternalLink className="w-3.5 h-3.5 mr-1" /> View</Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="mt-4">
                {studentDetail.notes?.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">No notes yet.</p>
                ) : (
                  <div className="space-y-3">
                    {studentDetail.notes?.map((note: any) => (
                      <div key={note.id} className={`p-3 rounded-lg border ${note.isPublic ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{note.authorName}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${note.isPublic ? 'bg-green-200 text-green-800' : 'bg-orange-200 text-orange-800'}`}>
                              {note.isPublic ? 'Public' : 'Internal'}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Conversation Tab */}
              <TabsContent value="conversation" className="mt-4">
                {!studentDetail.conversation ? (
                  <p className="text-sm text-muted-foreground p-4">No chatbot conversation found for this student.</p>
                ) : (
                  <div>
                    <div className="text-xs text-muted-foreground mb-3">
                      Conversation started: {formatDate(studentDetail.conversation.createdAt)} · 
                      {studentDetail.conversationMessages?.length || 0} messages
                    </div>
                    <ScrollArea className="h-[400px] border border-border rounded-lg p-4">
                      <div className="space-y-3">
                        {studentDetail.conversationMessages?.map((msg: any) => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                              msg.role === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-foreground'
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">No data found.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
