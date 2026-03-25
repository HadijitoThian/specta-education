import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GraduationCap, FileText, CheckCircle2, Clock, XCircle, Upload,
  LogOut, Globe, Calendar, Loader2, AlertCircle, Eye, User,
  MessageCircle, Star, BookOpen, Heart, Send, Trash2, Plus,
  ChevronRight, Sparkles, MapPin, Award, Target, Zap, Home,
  Settings, Bot, X, Camera, Edit3, Save, Bell, TrendingUp,
  BookMarked, Video, Phone, Gift, Copy, Check, Users, Trophy
} from "lucide-react";

// ─── Journey Stage Map (student-friendly names) ──────────────────────────────
const JOURNEY_STAGES = [
  { key: "new_lead", label: "Getting Started", icon: "🌱", color: "from-slate-500 to-slate-600" },
  { key: "contacted", label: "Planning", icon: "📋", color: "from-blue-500 to-blue-600" },
  { key: "qualified", label: "Preparing", icon: "📚", color: "from-violet-500 to-violet-600" },
  { key: "in_progress", label: "In Progress", icon: "🚀", color: "from-amber-500 to-orange-500" },
  { key: "enrolled", label: "Offer Received", icon: "🎉", color: "from-emerald-500 to-green-600" },
  { key: "completed", label: "Enrolled!", icon: "🎓", color: "from-pink-500 to-rose-600" },
];

const STAGE_INDEX: Record<string, number> = {
  new_lead: 0, contacted: 1, qualified: 2, in_progress: 3, enrolled: 4, completed: 5,
};

// ─── Status colors ────────────────────────────────────────────────────────────
const DOC_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  submitted: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  verified: "bg-green-500/20 text-green-300 border-green-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  initial_consultation: "Initial Consultation",
  application_review: "Application Review",
  visa_guidance: "Visa Guidance",
  scholarship_advice: "Scholarship Advice",
  general_inquiry: "General Inquiry",
};

const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300",
  confirmed: "bg-green-500/20 text-green-300",
  completed: "bg-blue-500/20 text-blue-300",
  cancelled: "bg-red-500/20 text-red-300",
};

// ─── Study Tips ───────────────────────────────────────────────────────────────
const STUDY_TIPS = [
  "Start your personal statement early — great essays take time to craft! ✍️",
  "Research scholarship deadlines — many close 6 months before intake! 💰",
  "Prepare your IELTS/TOEFL early — most universities require 6.0+ 📝",
  "Connect with current students at your target university on LinkedIn 🤝",
  "Keep digital copies of all your documents in the cloud ☁️",
  "Apply to a mix of reach, match, and safety schools for best results 🎯",
  "Check visa processing times — some countries take 3+ months! 🛂",
  "Your counselor is your best resource — don't hesitate to ask questions! 💬",
];

// ─── Nav Items ────────────────────────────────────────────────────────────────
type NavTab = "home" | "ai" | "appointments" | "documents" | "wishlist" | "profile" | "refer";

const NAV_ITEMS: { id: NavTab; label: string; icon: any; badge?: string }[] = [
  { id: "home", label: "My Journey", icon: Home },
  { id: "ai", label: "AI Advisor", icon: Bot, badge: "AI" },
  { id: "appointments", label: "Book Session", icon: Calendar },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "refer", label: "Refer & Earn", icon: Gift, badge: "🎁" },
  { id: "profile", label: "Profile", icon: Settings },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentPortalDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.studentPortal.getDashboard.useQuery();
  const { data: profile, isLoading: profileLoading } = trpc.studentPortal.getProfile.useQuery();
  const { data: appointments } = trpc.studentPortal.getAppointments.useQuery();
  const { data: wishlist } = trpc.studentPortal.getWishlist.useQuery();
  const { data: aiHistory } = trpc.studentPortal.getAiChatHistory.useQuery();
  const { data: notifications, refetch: refetchNotifs } = trpc.studentPortal.getNotifications.useQuery();
  const { data: unreadCount } = trpc.studentPortal.getUnreadCount.useQuery(undefined, { refetchInterval: 30000 });
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const markReadMutation = trpc.studentPortal.markRead.useMutation({ onSuccess: () => { refetchNotifs(); utils.studentPortal.getUnreadCount.invalidate(); } });
  const markAllReadMutation = trpc.studentPortal.markAllRead.useMutation({ onSuccess: () => { refetchNotifs(); utils.studentPortal.getUnreadCount.invalidate(); } });

  const logoutMutation = trpc.studentPortal.logout.useMutation({
    onSuccess: () => setLocation("/student/login"),
  });

  const tipIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % STUDY_TIPS.length;
  const todayTip = STUDY_TIPS[tipIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-400">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-white font-semibold text-lg mb-2">Session Expired</h2>
          <p className="text-slate-400 text-sm mb-4">Please sign in again to access your dashboard.</p>
          <Button onClick={() => setLocation("/student/login")} className="bg-violet-600 hover:bg-violet-700">Sign In</Button>
        </div>
      </div>
    );
  }

  const { lead, documents } = data as any;
  const firstName = lead.studentName?.split(" ")[0] ?? "there";
  const stageIndex = STAGE_INDEX[lead.pipelineStage] ?? 0;
  const currentStage = JOURNEY_STAGES[stageIndex];
  const progressPercent = Math.round(((stageIndex) / (JOURNEY_STAGES.length - 1)) * 100);
  const verifiedDocs = documents.filter((d: any) => d.status === "verified").length;
  const pendingDocs = documents.filter((d: any) => d.status === "pending").length;
  const avatarUrl = profile?.avatarUrl;

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/80 border-r border-slate-700/50 backdrop-blur-sm fixed h-full z-20">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">SpecTa Education</p>
              <p className="text-slate-500 text-xs">Student Portal</p>
            </div>
          </div>
        </div>

        {/* Profile mini card */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-violet-500/50" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{lead.studentName}</p>
              <p className="text-slate-500 text-xs truncate">{lead.preferredCountry || "Study Abroad"}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-500 text-xs">Journey Progress</span>
              <span className="text-violet-400 text-xs font-semibold">{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-xs bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Notification Bell */}
        <div className="px-3 pb-2 relative">
          <button
            onClick={() => setShowNotifPanel(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all relative"
          >
            <Bell className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Notifications</span>
            {(unreadCount ?? 0) > 0 && (
              <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{unreadCount}</span>
            )}
          </button>
          {/* Notification dropdown panel */}
          {showNotifPanel && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <span className="text-white font-semibold text-sm">Notifications</span>
                {(unreadCount ?? 0) > 0 && (
                  <button onClick={() => markAllReadMutation.mutate()} className="text-xs text-violet-400 hover:text-violet-300">Mark all read</button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                {(!notifications || (notifications as any[]).length === 0) ? (
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No notifications yet</p>
                  </div>
                ) : (
                  (notifications as any[]).map((n: any) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        markReadMutation.mutate({ id: n.id });
                        if (n.actionTab) setActiveTab(n.actionTab as NavTab);
                        setShowNotifPanel(false);
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/50 transition-all ${
                        n.isRead ? "opacity-60" : "bg-violet-500/5"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && <div className="w-2 h-2 bg-violet-400 rounded-full mt-1.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{n.title}</p>
                          {n.message && <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{n.message}</p>}
                          <p className="text-slate-600 text-xs mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {/* Logout */}
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={() => logoutMutation.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700/50 backdrop-blur-sm z-20">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === item.id ? "text-violet-400" : "text-slate-500"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-10 bg-slate-900/90 border-b border-slate-700/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-600 to-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">SpecTa Portal</span>
          </div>
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover border border-violet-500/50" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {firstName[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          {/* ── HOME TAB ── */}
          {activeTab === "home" && (
            <HomeTab
              lead={lead}
              profile={profile}
              firstName={firstName}
              currentStage={currentStage}
              stageIndex={stageIndex}
              progressPercent={progressPercent}
              verifiedDocs={verifiedDocs}
              pendingDocs={pendingDocs}
              appointments={appointments}
              todayTip={todayTip}
              onNavigate={setActiveTab}
            />
          )}

          {/* ── AI ADVISOR TAB ── */}
          {activeTab === "ai" && (
            <AIAdvisorTab lead={lead} profile={profile} aiHistory={aiHistory} utils={utils} />
          )}

          {/* ── APPOINTMENTS TAB ── */}
          {activeTab === "appointments" && (
            <AppointmentsTab appointments={appointments} utils={utils} />
          )}

          {/* ── DOCUMENTS TAB ── */}
          {activeTab === "documents" && (
            <DocumentsTab utils={utils} />
          )}

          {/* ── WISHLIST TAB ── */}
          {activeTab === "wishlist" && (
            <WishlistTab wishlist={wishlist} utils={utils} />
          )}

          {/* ── REFER & EARN TAB ── */}
          {activeTab === "refer" && (
            <ReferEarnTab lead={lead} utils={utils} />
          )}

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <ProfileTab lead={lead} profile={profile} utils={utils} />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({ lead, profile, firstName, currentStage, stageIndex, progressPercent, verifiedDocs, pendingDocs, appointments, todayTip, onNavigate }: any) {
  const upcomingAppt = appointments?.find((a: any) => a.status === "confirmed" || a.status === "pending");

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/60 via-blue-900/40 to-slate-900/60 border border-violet-500/20 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Welcome back,</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {firstName}! {currentStage?.icon}
              </h1>
              <p className="text-slate-300 text-sm">
                You're currently in the <span className="text-violet-300 font-semibold">{currentStage?.label}</span> stage of your journey
              </p>
            </div>
            <div className="hidden md:flex flex-col items-center bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-3xl font-bold text-white">{progressPercent}%</span>
              <span className="text-slate-400 text-xs mt-1">Complete</span>
            </div>
          </div>

          {/* Journey progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              {JOURNEY_STAGES.map((stage, i) => (
                <div key={stage.key} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                    i <= stageIndex
                      ? "bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/30"
                      : "bg-slate-700/50 border border-slate-600/50"
                  }`}>
                    {i < stageIndex ? "✓" : stage.icon}
                  </div>
                  <span className={`text-xs hidden md:block text-center leading-tight ${i <= stageIndex ? "text-violet-300" : "text-slate-600"}`}>
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{verifiedDocs}</div>
          <div className="text-slate-400 text-xs mt-1">Docs Verified</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{pendingDocs}</div>
          <div className="text-slate-400 text-xs mt-1">Docs Pending</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{appointments?.length ?? 0}</div>
          <div className="text-slate-400 text-xs mt-1">Sessions</div>
        </div>
      </div>

      {/* Upcoming appointment */}
      {upcomingAppt && (
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-emerald-300 font-semibold text-sm">Upcoming Session</p>
            <p className="text-slate-300 text-xs mt-0.5">
              {SESSION_TYPE_LABELS[upcomingAppt.sessionType]} · {upcomingAppt.appointmentDate} at {upcomingAppt.appointmentTime}
            </p>
          </div>
          <Badge className={`text-xs ${APPOINTMENT_STATUS_COLORS[upcomingAppt.status]}`}>
            {upcomingAppt.status}
          </Badge>
        </div>
      )}

      {/* Study info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300 text-sm font-medium">Study Destination</span>
          </div>
          <p className="text-white font-semibold">{lead.preferredCountry || profile?.dreamCountry || "Not set yet"}</p>
          <p className="text-slate-400 text-xs mt-1">{lead.studyLevel || "Level TBD"} · {lead.programInterest || profile?.dreamProgram || "Program TBD"}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-violet-400" />
            <span className="text-slate-300 text-sm font-medium">Target Intake</span>
          </div>
          <p className="text-white font-semibold">
            {profile?.intakeMonth && profile?.intakeYear
              ? `${profile.intakeMonth} ${profile.intakeYear}`
              : lead.intakeDate || "Not set yet"}
          </p>
          <p className="text-slate-400 text-xs mt-1">Your planned start date</p>
        </div>
      </div>

      {/* Daily tip */}
      <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/20 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide mb-1">Today's Tip</p>
            <p className="text-slate-300 text-sm leading-relaxed">{todayTip}</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-slate-300 text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Bot, label: "Ask AI Advisor", color: "from-violet-600/20 to-blue-600/20 border-violet-500/30 text-violet-300", tab: "ai" as NavTab },
            { icon: Calendar, label: "Book Session", color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/30 text-emerald-300", tab: "appointments" as NavTab },
            { icon: FileText, label: "My Documents", color: "from-blue-600/20 to-cyan-600/20 border-blue-500/30 text-blue-300", tab: "documents" as NavTab },
            { icon: Heart, label: "Uni Wishlist", color: "from-pink-600/20 to-rose-600/20 border-pink-500/30 text-pink-300", tab: "wishlist" as NavTab },
          ].map(action => (
            <button
              key={action.tab}
              onClick={() => onNavigate(action.tab)}
              className={`bg-gradient-to-br ${action.color} border rounded-xl p-4 text-center hover:scale-105 transition-transform`}
            >
              <action.icon className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs font-medium">{action.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Motivation note */}
      {profile?.motivationNote && (
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-violet-400" />
            <span className="text-slate-300 text-sm font-medium">My Motivation</span>
          </div>
          <p className="text-slate-400 text-sm italic">"{profile.motivationNote}"</p>
        </div>
      )}
    </div>
  );
}

// ─── AI ADVISOR TAB ───────────────────────────────────────────────────────────
function AIAdvisorTab({ lead, profile, aiHistory, utils }: any) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aiHistory) {
      setMessages(aiHistory.map((h: any) => ({ role: h.role, content: h.content })));
    }
  }, [aiHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const chatMutation = trpc.studentPortal.aiAdvisorChat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      setIsTyping(false);
      utils.studentPortal.getAiChatHistory.invalidate();
    },
    onError: () => setIsTyping(false),
  });

  const clearMutation = trpc.studentPortal.clearAiChat.useMutation({
    onSuccess: () => {
      setMessages([]);
      utils.studentPortal.getAiChatHistory.invalidate();
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setMessage("");
    setIsTyping(true);
    chatMutation.mutate({ message: userMsg });
  };

  const QUICK_QUESTIONS = [
    "What documents do I need for my application?",
    "How do I prepare for my IELTS exam?",
    "What scholarships are available for me?",
    "What's the visa process like?",
    "How do I write a strong personal statement?",
    "What are the best universities for my program?",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <Bot className="w-6 h-6 text-violet-400" />
            AI Study Advisor
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Ask me anything about studying abroad!</p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearMutation.mutate()}
            className="text-slate-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 max-w-md">
                <p className="text-slate-200 text-sm leading-relaxed">
                  Hi {lead.studentName?.split(" ")[0]}! 👋 I'm SpecTa AI, your personal study abroad advisor. I can help you with university selection, applications, visas, scholarships, and more. What would you like to know?
                </p>
              </div>
            </div>
            <div className="ml-11">
              <p className="text-slate-500 text-xs mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => { setMessage(q); }}
                    className="text-xs bg-slate-800/60 border border-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full hover:border-violet-500/50 hover:text-violet-300 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "user"
                ? "bg-gradient-to-br from-violet-600 to-blue-600"
                : "bg-gradient-to-br from-slate-700 to-slate-600"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/30 text-white rounded-tr-sm"
                : "bg-slate-800/60 border border-slate-700/50 text-slate-200 rounded-tl-sm"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <Input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask anything about studying abroad..."
          className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 rounded-xl"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isTyping}
          className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 rounded-xl px-4"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── APPOINTMENTS TAB ─────────────────────────────────────────────────────────
function AppointmentsTab({ appointments, utils }: any) {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sessionType, setSessionType] = useState("initial_consultation");
  const [notes, setNotes] = useState("");

  const bookMutation = trpc.studentPortal.bookAppointment.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setDate(""); setTime(""); setNotes("");
      utils.studentPortal.getAppointments.invalidate();
    },
  });

  const TIME_SLOTS = ["10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">Book a Session</h2>
          <p className="text-slate-400 text-sm mt-0.5">Schedule a counselling session with our team</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Book Now
        </Button>
      </div>

      {/* Session types info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { type: "initial_consultation", icon: "🌟", desc: "First meeting with your counselor" },
          { type: "application_review", icon: "📋", desc: "Review your university applications" },
          { type: "visa_guidance", icon: "🛂", desc: "Visa application support" },
          { type: "scholarship_advice", icon: "💰", desc: "Find scholarships for you" },
          { type: "general_inquiry", icon: "💬", desc: "Any questions you have" },
        ].map(s => (
          <div key={s.type} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-slate-200 text-xs font-medium">{SESSION_TYPE_LABELS[s.type]}</p>
            <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Booking form */}
      {showForm && (
        <div className="bg-slate-800/60 border border-violet-500/30 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Schedule Your Session</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Session Type</Label>
              <select
                value={sessionType}
                onChange={e => setSessionType(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
              >
                {Object.entries(SESSION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Preferred Date</Label>
              <Input
                type="date"
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Preferred Time</Label>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {TIME_SLOTS.map(t => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    time === t
                      ? "bg-violet-600 text-white"
                      : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Tell us what you'd like to discuss..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 rounded-xl resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => bookMutation.mutate({ appointmentDate: date, appointmentTime: time, sessionType: sessionType as any, notes })}
              disabled={!date || !time || bookMutation.isPending}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 flex-1"
            >
              {bookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
              Confirm Booking
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400">Cancel</Button>
          </div>
        </div>
      )}

      {/* Appointments list */}
      <div className="space-y-3">
        <h3 className="text-slate-300 text-sm font-semibold">Your Sessions</h3>
        {!appointments || appointments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No sessions booked yet</p>
            <p className="text-xs mt-1">Book your first counselling session above!</p>
          </div>
        ) : (
          appointments.map((appt: any) => (
            <div key={appt.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{SESSION_TYPE_LABELS[appt.sessionType]}</p>
                <p className="text-slate-400 text-xs mt-0.5">{appt.appointmentDate} at {appt.appointmentTime}</p>
                {appt.counselorNotes && <p className="text-slate-500 text-xs mt-1 italic">"{appt.counselorNotes}"</p>}
                {appt.meetingLink && (
                  <a href={appt.meetingLink} target="_blank" rel="noopener noreferrer" className="text-violet-400 text-xs mt-1 flex items-center gap-1 hover:text-violet-300">
                    <Video className="w-3 h-3" /> Join Meeting
                  </a>
                )}
              </div>
              <Badge className={`text-xs ${APPOINTMENT_STATUS_COLORS[appt.status]}`}>{appt.status}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────────────────────
// ─── DOCUMENT TYPES ──────────────────────────────────────────────────────────
const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport", icon: "🛂", desc: "Valid for 18+ months" },
  { value: "transcript", label: "Academic Transcript", icon: "📋", desc: "School/university grades" },
  { value: "ielts", label: "IELTS / English Certificate", icon: "📝", desc: "English proficiency proof" },
  { value: "personal_statement", label: "Personal Statement", icon: "✍️", desc: "Your motivation letter" },
  { value: "recommendation", label: "Recommendation Letter", icon: "📨", desc: "From teacher or employer" },
  { value: "birth_certificate", label: "Birth Certificate", icon: "📄", desc: "Official birth document" },
  { value: "photo", label: "Passport-size Photo", icon: "🖼️", desc: "4x6 cm, white background" },
  { value: "financial_proof", label: "Financial Proof", icon: "🏦", desc: "Bank statement / sponsor letter" },
  { value: "diploma", label: "Diploma / Certificate", icon: "🎓", desc: "Graduation certificate" },
  { value: "cv_resume", label: "CV / Resume", icon: "📌", desc: "Work and education history" },
  { value: "other", label: "Other Document", icon: "📎", desc: "Any other required document" },
];

function getDocIcon(mimeType: string): string {
  if (!mimeType) return "📄";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  return "📄";
}

function DocumentsTab({ utils }: any) {
  const { data: documents = [], isLoading } = trpc.studentPortal.listDocuments.useQuery();
  const uploadMutation = trpc.studentPortal.uploadDocument.useMutation({
    onSuccess: () => utils.studentPortal.listDocuments.invalidate(),
    onError: (err: any) => alert(err.message),
  });
  const deleteMutation = trpc.studentPortal.deleteDocument.useMutation({
    onSuccess: () => utils.studentPortal.listDocuments.invalidate(),
    onError: (err: any) => alert(err.message),
  });

  const [showUpload, setShowUpload] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verified = (documents as any[]).filter((d: any) => d.status === "verified").length;
  const submitted = (documents as any[]).filter((d: any) => d.status === "submitted").length;
  const pending = (documents as any[]).filter((d: any) => d.status === "pending").length;
  const rejected = (documents as any[]).filter((d: any) => d.status === "rejected").length;

  const handleFileSelect = async (file: File) => {
    if (!selectedDocType) { alert("Please select a document type first."); return; }
    if (file.size > 16 * 1024 * 1024) { alert("File too large. Maximum size is 16MB."); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) { alert("Unsupported file type. Please upload PDF, JPG, PNG, or Word documents."); return; }
    setUploadProgress(`Uploading ${file.name}...`);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const docTypeInfo = DOCUMENT_TYPES.find(d => d.value === selectedDocType);
      const label = customLabel.trim() || docTypeInfo?.label || selectedDocType;
      try {
        await uploadMutation.mutateAsync({
          docType: selectedDocType,
          docLabel: label,
          fileName: file.name,
          fileType: file.type,
          fileBase64: base64,
        });
        setShowUpload(false);
        setSelectedDocType("");
        setCustomLabel("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) { /* handled by onError */ }
      setUploadProgress(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">Document Vault</h2>
          <p className="text-slate-400 text-sm mt-0.5">Upload and manage your application documents securely</p>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-xl gap-2"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Verified", count: verified, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
          { label: "Submitted", count: submitted, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Pending", count: pending, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
          { label: "Rejected", count: rejected, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-3 text-center`}>
            <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="bg-slate-800/80 border border-violet-500/30 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-violet-400" /> Upload New Document
          </h3>
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Document Type *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOCUMENT_TYPES.map(dt => (
                <button
                  key={dt.value}
                  onClick={() => setSelectedDocType(dt.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedDocType === dt.value
                      ? "border-violet-500 bg-violet-500/20 text-white"
                      : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="text-lg mb-1">{dt.icon}</div>
                  <div className="text-xs font-medium leading-tight">{dt.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-tight">{dt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {selectedDocType === "other" && (
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Document Name *</Label>
              <Input
                placeholder="e.g. Medical Certificate"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
              />
            </div>
          )}
          {selectedDocType && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragOver ? "border-violet-400 bg-violet-500/10" : "border-slate-600 hover:border-slate-500"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadProgress ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  <p className="text-violet-300 text-sm">{uploadProgress}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-300 text-sm font-medium">Drop your file here or click to browse</p>
                  <p className="text-slate-500 text-xs mt-1">PDF, JPG, PNG, Word — max 16MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => { setShowUpload(false); setSelectedDocType(""); setCustomLabel(""); }} className="text-slate-400">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Documents list */}
      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" /></div>
      ) : (documents as any[]).length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 opacity-30" />
          </div>
          <p className="text-slate-300 font-medium">No documents yet</p>
          <p className="text-xs mt-1">Click "Upload Document" to add your first document</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(documents as any[]).map((doc: any) => (
<DocVaultItem key={doc.id} doc={doc} onDelete={(id) => deleteMutation.mutate({ docId: id })} deleteLoading={deleteMutation.isPending} onUploadSuccess={() => utils.studentPortal.listDocuments.invalidate()} />
          ))}
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
        <div className="text-blue-400 text-lg">☁️</div>
        <div>
          <p className="text-blue-300 text-sm font-medium">Secure Cloud Storage</p>
          <p className="text-slate-500 text-xs mt-0.5">All your documents are encrypted and stored securely on cloud. Your counselor can view and verify them directly.</p>
        </div>
      </div>
    </div>
  );
}

//// ─── DOC VAULT ITEM ──────────────────────────────────────────────────────────
function DocVaultItem({ doc, onDelete, deleteLoading, onUploadSuccess }: {
  doc: any;
  onDelete: (id: number) => void;
  deleteLoading: boolean;
  onUploadSuccess: () => void;
}) {
  const quickUploadRef = useRef<HTMLInputElement>(null);
  const [quickUploading, setQuickUploading] = useState(false);
  const uploadMutation = trpc.studentPortal.uploadDocument.useMutation({
    onSuccess: () => { onUploadSuccess(); setQuickUploading(false); },
    onError: (err: any) => { alert(err.message); setQuickUploading(false); },
  });

  // Counselor-requested = pending + no file uploaded yet + has staffEmail (set by counselor)
  const isCounselorRequested = doc.status === "pending" && !doc.fileUrl && doc.staffEmail;

  const handleQuickUpload = async (file: File) => {
    if (file.size > 16 * 1024 * 1024) { alert("File too large. Max 16MB."); return; }
    setQuickUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await uploadMutation.mutateAsync({
        docType: doc.docType,
        docLabel: doc.docLabel || doc.docType,
        fileName: file.name,
        fileType: file.type,
        fileBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`rounded-xl p-4 border ${
      isCounselorRequested
        ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20"
        : "bg-slate-800/60 border-slate-700/50"
    }`}>
      {/* Action Required Banner for counselor-requested docs */}
      {isCounselorRequested && (
        <div className="flex items-center gap-2 mb-3 bg-amber-500/20 rounded-lg px-3 py-2">
          <span className="text-amber-400 text-sm">⚠️</span>
          <p className="text-amber-300 text-xs font-semibold">Action Required — Your counselor has requested this document</p>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
          isCounselorRequested ? "bg-amber-500/20" : "bg-slate-700/50"
        }`}>
          {doc.fileMimeType ? getDocIcon(doc.fileMimeType) : (DOCUMENT_TYPES.find((d: any) => d.value === doc.docType)?.icon ?? "📄")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white text-sm font-semibold">{doc.docLabel || doc.docType}</p>
            <Badge className={`text-xs border ${DOC_STATUS_COLORS[doc.status] ?? "bg-slate-500/20 text-slate-400"}`}>
              {doc.status === "submitted" ? "Under Review" : doc.status === "verified" ? "✓ Verified" : doc.status === "rejected" ? "✗ Rejected" : "Pending"}
            </Badge>
          </div>
          {doc.fileName && <p className="text-slate-500 text-xs mt-0.5 truncate">📎 {doc.fileName}</p>}
          {doc.notes && (
            <p className={`text-xs mt-1 rounded-lg px-2 py-1 ${
              isCounselorRequested ? "text-amber-300 bg-amber-500/10" : "text-amber-400 bg-amber-500/10"
            }`}>💬 Counselor: {doc.notes}</p>
          )}
          {doc.submittedAt && (
            <p className="text-slate-600 text-xs mt-1">Uploaded {new Date(doc.submittedAt).toLocaleDateString()}</p>
          )}
          {/* Quick upload button for counselor-requested docs */}
          {isCounselorRequested && (
            <div className="mt-3">
              <input
                ref={quickUploadRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQuickUpload(f); e.target.value = ""; }}
              />
              <Button
                size="sm"
                onClick={() => quickUploadRef.current?.click()}
                disabled={quickUploading}
                className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold rounded-lg gap-1.5 h-8"
              >
                {quickUploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</> : <><Upload className="w-3 h-3" /> Upload Now</>}
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {doc.fileUrl && (
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-400 hover:text-white"><Eye className="w-3.5 h-3.5" /></Button>
            </a>
          )}
          {doc.status !== "verified" && (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-red-400 hover:text-red-300"
              onClick={() => { if (confirm("Delete this document?")) onDelete(doc.id); }}
              disabled={deleteLoading}
            ><Trash2 className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WISHLIST TAB ──────────────────────────────────────────────────────────
function WishlistTab({ wishlist, utils }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [uniName, setUniName] = useState("");
  const [country, setCountry] = useState("");
  const [program, setProgram] = useState("");
  const [notes, setNotes] = useState("");

  const addMutation = trpc.studentPortal.addToWishlist.useMutation({
    onSuccess: () => {
      setShowAdd(false);
      setUniName(""); setCountry(""); setProgram(""); setNotes("");
      utils.studentPortal.getWishlist.invalidate();
    },
  });

  const removeMutation = trpc.studentPortal.removeFromWishlist.useMutation({
    onSuccess: () => utils.studentPortal.getWishlist.invalidate(),
  });

  const COUNTRIES = ["Australia", "United Kingdom", "Canada", "USA", "Singapore", "Malaysia", "Netherlands", "New Zealand", "Ireland", "China"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">University Wishlist</h2>
          <p className="text-slate-400 text-sm mt-0.5">Save universities you're interested in</p>
        </div>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add University
        </Button>
      </div>

      {showAdd && (
        <div className="bg-slate-800/60 border border-pink-500/30 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Add to Wishlist</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">University Name *</Label>
              <Input value={uniName} onChange={e => setUniName(e.target.value)} placeholder="e.g. University of Melbourne" className="bg-slate-700/50 border-slate-600 text-white focus:border-pink-500 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Country *</Label>
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-500">
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Program of Interest</Label>
            <Input value={program} onChange={e => setProgram(e.target.value)} placeholder="e.g. Bachelor of Computer Science" className="bg-slate-700/50 border-slate-600 text-white focus:border-pink-500 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why do you like this university?" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-pink-500 rounded-xl resize-none" rows={2} />
          </div>
          <div className="flex gap-3">
            <Button onClick={() => addMutation.mutate({ universityName: uniName, country, program, notes })} disabled={!uniName || !country || addMutation.isPending} className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 flex-1">
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Heart className="w-4 h-4 mr-2" />}
              Add to Wishlist
            </Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-slate-400">Cancel</Button>
          </div>
        </div>
      )}

      {!wishlist || wishlist.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Your wishlist is empty</p>
          <p className="text-xs mt-1">Add universities you're dreaming about!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wishlist.map((item: any) => (
            <div key={item.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 relative group">
              <button
                onClick={() => removeMutation.mutate({ id: item.id })}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-600/20 to-rose-600/20 border border-pink-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-5 h-5 text-pink-400" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-white font-semibold text-sm">{item.universityName}</p>
                  <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {item.country}
                  </p>
                  {item.program && <p className="text-violet-300 text-xs mt-1">{item.program}</p>}
                  {item.notes && <p className="text-slate-500 text-xs mt-1 italic">"{item.notes}"</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
function ProfileTab({ lead, profile, utils }: any) {
  const [bio, setBio] = useState(profile?.bio || "");
  const [intakeMonth, setIntakeMonth] = useState(profile?.intakeMonth || "");
  const [intakeYear, setIntakeYear] = useState(profile?.intakeYear || "");
  const [dreamCountry, setDreamCountry] = useState(profile?.dreamCountry || lead.preferredCountry || "");
  const [dreamProgram, setDreamProgram] = useState(profile?.dreamProgram || lead.programInterest || "");
  const [motivationNote, setMotivationNote] = useState(profile?.motivationNote || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl || null);
  const [avatarData, setAvatarData] = useState<{ base64: string; mimeType: string; fileName: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [parentName, setParentName] = useState(lead.parentName || "");
  const [parentEmail, setParentEmail] = useState(lead.parentEmail || "");
  const [parentSaved, setParentSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMutation = trpc.studentPortal.updateProfile.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      utils.studentPortal.getProfile.invalidate();
    },
  });

  const updateParentMutation = trpc.studentPortal.updateParentInfo.useMutation({
    onSuccess: () => {
      setParentSaved(true);
      setTimeout(() => setParentSaved(false), 2000);
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setAvatarData({ base64: result.split(",")[1], mimeType: file.type, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateMutation.mutate({
      bio, intakeMonth, intakeYear, dreamCountry, dreamProgram, motivationNote,
      ...(avatarData ? { avatarBase64: avatarData.base64, avatarMimeType: avatarData.mimeType, avatarFileName: avatarData.fileName } : {}),
    });
  };

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const YEARS = ["2025", "2026", "2027", "2028"];
  const COUNTRIES = ["Australia", "United Kingdom", "Canada", "USA", "Singapore", "Malaysia", "Netherlands", "New Zealand", "Ireland", "China"];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-white font-bold text-xl">My Profile</h2>
        <p className="text-slate-400 text-sm mt-0.5">Personalize your study abroad journey</p>
      </div>

      {/* Avatar section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-violet-400" />
          Profile Photo
        </h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-violet-500/50" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-violet-500/50">
                {lead.studentName?.[0]?.toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center hover:bg-violet-700 transition-colors shadow-lg"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="text-white font-semibold">{lead.studentName}</p>
            <p className="text-slate-400 text-sm">{lead.studentEmail}</p>
            <button onClick={() => fileInputRef.current?.click()} className="text-violet-400 text-xs mt-1 hover:text-violet-300">
              Change photo
            </button>
          </div>
        </div>
      </div>

      {/* Study goals */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-400" />
          Study Goals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Dream Country</Label>
            <select value={dreamCountry} onChange={e => setDreamCountry(e.target.value)} className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              <option value="">Select country</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Dream Program</Label>
            <Input value={dreamProgram} onChange={e => setDreamProgram(e.target.value)} placeholder="e.g. Computer Science" className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Target Intake Month</Label>
            <select value={intakeMonth} onChange={e => setIntakeMonth(e.target.value)} className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              <option value="">Select month</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Target Intake Year</Label>
            <select value={intakeYear} onChange={e => setIntakeYear(e.target.value)} className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              <option value="">Select year</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* About me */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-violet-400" />
          About Me
        </h3>
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm">Short Bio</Label>
          <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us a bit about yourself..." className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 rounded-xl resize-none" rows={3} />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm">My Motivation ✨</Label>
          <Textarea value={motivationNote} onChange={e => setMotivationNote(e.target.value)} placeholder="Why do you want to study abroad? What's your dream?" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 rounded-xl resize-none" rows={3} />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className={`w-full py-3 rounded-xl font-semibold transition-all ${saved ? "bg-green-600 hover:bg-green-600" : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"}`}
      >
        {updateMutation.isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
        ) : saved ? (
          <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved!</>
        ) : (
          <><Save className="w-4 h-4 mr-2" /> Save Profile</>
        )}
      </Button>

      {/* Parent / Guardian */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span className="text-lg">👨‍👩‍👧</span>
          Parent / Guardian Info
        </h3>
        <p className="text-slate-400 text-xs">Your counselor will send weekly progress reports to your parent's email every Monday.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Parent / Guardian Name</Label>
            <Input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="e.g. John Doe" className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Parent / Guardian Email</Label>
            <Input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="parent@email.com" className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500 rounded-xl" />
          </div>
        </div>
        <Button
          onClick={() => updateParentMutation.mutate({ parentName, parentEmail })}
          disabled={updateParentMutation.isPending}
          className={`w-full py-2.5 rounded-xl font-semibold transition-all text-sm ${parentSaved ? "bg-green-600 hover:bg-green-600" : "bg-slate-700 hover:bg-slate-600 border border-slate-600"}`}
        >
          {updateParentMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
          ) : parentSaved ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Parent Info Saved!</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Parent Info</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── REFER & EARN TAB ─────────────────────────────────────────────────────────
function ReferEarnTab({ lead, utils }: any) {
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [friendPhone, setFriendPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const { data: stats, isLoading } = trpc.studentPortal.getReferralStats.useQuery();

  const inviteMutation = trpc.studentPortal.inviteFriend.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        setSuccessMsg("This friend was already invited!");
      } else {
        setSuccessMsg(`Invitation sent to ${friendEmail}! 🎉`);
        setFriendName(""); setFriendEmail(""); setFriendPhone("");
      }
      utils.studentPortal.getReferralStats.invalidate();
      setTimeout(() => setSuccessMsg(""), 4000);
    },
  });

  const claimMutation = trpc.studentPortal.claimReward.useMutation({
    onSuccess: () => utils.studentPortal.getReferralStats.invalidate(),
  });

  const referralCode = stats?.code?.code ?? "Loading...";
  const referralLink = `https://spectaeducation.com/student/register?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`Hey! I'm using SpecTa Education to plan my study abroad journey and it's amazing 🎓\n\nJoin me using my referral link and get started for free:\n${referralLink}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const REWARDS_MAP: Record<string, { icon: string; color: string; desc: string }> = {
    ielts_mock_test: { icon: "📝", color: "from-blue-600/20 to-cyan-600/20 border-blue-500/30", desc: "Practice IELTS with our expert-designed mock test" },
    priority_session: { icon: "⚡", color: "from-amber-600/20 to-orange-600/20 border-amber-500/30", desc: "Skip the queue — get a priority counselling session" },
    scholarship_guide: { icon: "💰", color: "from-emerald-600/20 to-green-600/20 border-emerald-500/30", desc: "Exclusive guide to 50+ scholarships for your destination" },
    application_fee_waiver: { icon: "🎫", color: "from-violet-600/20 to-purple-600/20 border-violet-500/30", desc: "Application fee waiver for one university application" },
  };

  const REWARD_MILESTONES = [
    { count: 1, type: "ielts_mock_test", label: "Free IELTS Mock Test", icon: "📝" },
    { count: 2, type: "priority_session", label: "Priority Session", icon: "⚡" },
    { count: 3, type: "scholarship_guide", label: "Scholarship Guide", icon: "💰" },
    { count: 4, type: "application_fee_waiver", label: "Fee Waiver", icon: "🎫" },
  ];

  const completedCount = stats?.completedReferrals ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-900/50 via-rose-900/30 to-slate-900/60 border border-pink-500/20 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Refer & Earn</h2>
              <p className="text-slate-400 text-sm">Invite friends, earn amazing rewards!</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Share your unique referral link with friends. When they sign up and book a counselling session, you both win! 🎉
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-pink-400">{stats?.totalReferrals ?? 0}</div>
          <div className="text-slate-400 text-xs mt-1">Invited</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{completedCount}</div>
          <div className="text-slate-400 text-xs mt-1">Completed</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats?.rewards?.length ?? 0}</div>
          <div className="text-slate-400 text-xs mt-1">Rewards</div>
        </div>
      </div>

      {/* Reward milestones */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          Reward Milestones
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {REWARD_MILESTONES.map(m => {
            const unlocked = completedCount >= m.count;
            return (
              <div key={m.type} className={`rounded-xl p-3 border text-center transition-all ${unlocked ? "bg-gradient-to-br from-amber-600/20 to-yellow-600/20 border-amber-500/40" : "bg-slate-700/30 border-slate-600/30 opacity-60"}`}>
                <div className="text-3xl mb-1">{m.icon}</div>
                <p className={`text-xs font-semibold ${unlocked ? "text-amber-300" : "text-slate-400"}`}>{m.label}</p>
                <p className={`text-xs mt-0.5 ${unlocked ? "text-emerald-400" : "text-slate-500"}`}>
                  {unlocked ? "✓ Unlocked!" : `${m.count} referral${m.count > 1 ? "s" : ""}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your referral code */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          Your Referral Code
        </h3>
        <div className="bg-slate-900/60 border border-violet-500/30 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-xs mb-2">Share this code with friends</p>
          <p className="text-3xl font-bold text-violet-300 tracking-widest font-mono">{referralCode}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-slate-300 text-sm truncate font-mono">
            {referralLink}
          </div>
          <Button onClick={copyLink} className={`px-4 rounded-xl transition-all ${copied ? "bg-green-600 hover:bg-green-600" : "bg-violet-600 hover:bg-violet-700"}`}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <Button onClick={shareWhatsApp} className="w-full bg-green-600 hover:bg-green-700 rounded-xl">
          <span className="mr-2">📲</span>
          Share via WhatsApp
        </Button>
      </div>

      {/* Invite a friend form */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Send className="w-4 h-4 text-pink-400" />
          Send Direct Invitation
        </h3>
        {successMsg && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-green-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Friend's Name</Label>
            <Input value={friendName} onChange={e => setFriendName(e.target.value)} placeholder="e.g. Sarah Lim" className="bg-slate-700/50 border-slate-600 text-white focus:border-pink-500 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Friend's Email *</Label>
            <Input type="email" value={friendEmail} onChange={e => setFriendEmail(e.target.value)} placeholder="sarah@email.com" className="bg-slate-700/50 border-slate-600 text-white focus:border-pink-500 rounded-xl" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-sm">Friend's Phone (optional)</Label>
          <Input value={friendPhone} onChange={e => setFriendPhone(e.target.value)} placeholder="+60 12 345 6789" className="bg-slate-700/50 border-slate-600 text-white focus:border-pink-500 rounded-xl" />
        </div>
        <Button
          onClick={() => inviteMutation.mutate({ friendEmail, friendName, friendPhone })}
          disabled={!friendEmail || inviteMutation.isPending}
          className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 rounded-xl"
        >
          {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Send Invitation Email
        </Button>
      </div>

      {/* My referrals list */}
      {stats?.referrals && stats.referrals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-slate-300 text-sm font-semibold">My Referrals</h3>
          {stats.referrals.map((ref: any) => (
            <div key={ref.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-700/50 rounded-full flex items-center justify-center text-sm font-bold text-slate-300">
                {ref.friendName?.[0]?.toUpperCase() ?? ref.friendEmail[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{ref.friendName || ref.friendEmail}</p>
                <p className="text-slate-500 text-xs truncate">{ref.friendEmail}</p>
              </div>
              <Badge className={`text-xs ${
                ref.status === "completed" ? "bg-green-500/20 text-green-300" :
                ref.status === "booked_session" ? "bg-blue-500/20 text-blue-300" :
                ref.status === "signed_up" ? "bg-violet-500/20 text-violet-300" :
                "bg-slate-500/20 text-slate-400"
              }`}>
                {ref.status === "pending" ? "Invited" :
                 ref.status === "signed_up" ? "Signed Up" :
                 ref.status === "booked_session" ? "Booked Session" : "Completed ✓"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* My rewards */}
      {stats?.rewards && stats.rewards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-slate-300 text-sm font-semibold">My Rewards</h3>
          {stats.rewards.map((reward: any) => {
            const info = REWARDS_MAP[reward.rewardType] ?? { icon: "🎁", color: "from-slate-600/20 to-slate-700/20 border-slate-500/30", desc: "" };
            return (
              <div key={reward.id} className={`bg-gradient-to-r ${info.color} border rounded-xl p-4 flex items-center gap-4`}>
                <div className="text-3xl">{info.icon}</div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{reward.rewardLabel}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{info.desc}</p>
                  {reward.expiresAt && (
                    <p className="text-slate-500 text-xs mt-1">Expires: {new Date(reward.expiresAt).toLocaleDateString()}</p>
                  )}
                </div>
                {reward.status === "pending" ? (
                  <Button
                    size="sm"
                    onClick={() => claimMutation.mutate({ rewardId: reward.id })}
                    disabled={claimMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-xs"
                  >
                    Claim!
                  </Button>
                ) : (
                  <Badge className="bg-green-500/20 text-green-300 text-xs">
                    {reward.status === "claimed" ? "Claimed ✓" : "Redeemed ✓"}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
