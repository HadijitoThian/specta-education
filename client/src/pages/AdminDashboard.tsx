import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, FileText, MessageSquare, Phone, Mail, Globe, 
  Calendar, Clock, ChevronRight, ExternalLink, Loader2,
  LogOut, Home, CalendarCheck, BookOpen, Search, ClipboardList, Edit, Save, X,
  UserPlus, Shield, Briefcase, BarChart3, Trash2, ToggleLeft, ToggleRight, Download,
  Upload, Eye, EyeOff, KeyRound, UserCog, RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { getLoginUrl } from "@/const";

type TabType = "leads" | "conversations" | "documents" | "appointments" | "applications" | "ielts" | "counselors" | "team" | "scholarshipLeads" | "staff";

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

export default function AdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("leads");
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
    enabled: isAuthenticated && user?.role === 'admin' && (activeTab === 'staff')
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
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
            </>
          )}
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* ===== LEADS TAB ===== */}
          {activeTab === 'leads' && (
            <div>
              {leadsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : leadsData?.leads?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No leads yet. Leads will appear here when students provide their contact information.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leadsData?.leads?.map((lead) => (
                    <div key={lead.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{lead.studentName}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                          </div>
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
                        </div>
                        <div className="flex gap-2">
                          <a href={`https://wa.me/${lead.studentPhone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Phone className="w-4 h-4 mr-1" /> WhatsApp
                            </Button>
                          </a>
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
                  ))}
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
                              <h3 className="font-semibold text-lg">{app.fullName}</h3>
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
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
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
                                {activeCounselors.map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name} {c.specialization ? `(${c.specialization})` : ''} — {c.activeApplications || 0} active
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
        </div>
      </div>
    </div>
  );
}
