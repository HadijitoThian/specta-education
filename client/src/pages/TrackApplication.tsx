import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Search, Mail, CheckCircle, Clock, FileText, MessageSquare, Upload, AlertCircle, ArrowRight, Shield, Loader2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useRoute } from "wouter";

const STATUS_STEPS = [
  { key: "submitted", label: "Submitted", icon: "📋" },
  { key: "reviewing", label: "Reviewing", icon: "🔍" },
  { key: "processing", label: "Processing", icon: "⚙️" },
  { key: "on_hold", label: "On Hold", icon: "⏸️" },
  { key: "offer_received", label: "Offer Received", icon: "🎉" },
  { key: "accepted", label: "Accepted", icon: "✅" },
  { key: "enrolled", label: "Enrolled", icon: "🎓" },
];

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  reviewing: "bg-yellow-100 text-yellow-700",
  processing: "bg-indigo-100 text-indigo-700",
  on_hold: "bg-orange-100 text-orange-700",
  offer_received: "bg-green-100 text-green-700",
  accepted: "bg-emerald-100 text-emerald-700",
  enrolled: "bg-teal-100 text-teal-700",
  rejected: "bg-red-100 text-red-700",
};

export default function TrackApplication() {
  const [, params] = useRoute("/track/:token");
  const token = params?.token || "";

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"enter_email" | "links_ready" | "viewing">(token ? "viewing" : "enter_email");
  const [trackingLinks, setTrackingLinks] = useState<{ referenceNumber: string | null; trackingToken: string }[]>([]);
  const [newNote, setNewNote] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);

  const requestMagicLink = trpc.tracker.requestMagicLink.useMutation({
    onSuccess: (data) => {
      if (data.success && data.applications) {
        setTrackingLinks(data.applications);
        setPhase("links_ready");
      }
    },
  });

  const appQuery = trpc.tracker.getByToken.useQuery(
    { token },
    { enabled: !!token && phase === "viewing" }
  );

  const addNoteMutation = trpc.tracker.addStudentNote.useMutation({
    onSuccess: () => {
      setNewNote("");
      appQuery.refetch();
    },
  });

  const handleRequestLink = () => {
    if (!email) return;
    requestMagicLink.mutate({ email });
  };

  // ===== ENTER EMAIL PHASE =====
  if (phase === "enter_email") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="container max-w-lg pt-32 pb-20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Application</h1>
            <p className="text-gray-600">Enter the email address you used when applying. We'll generate a secure tracking link for you.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRequestLink()}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <button
              onClick={handleRequestLink}
              disabled={!email || requestMagicLink.isPending}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {requestMagicLink.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Looking up your applications...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Find My Applications
                </>
              )}
            </button>

            {requestMagicLink.isError && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                Something went wrong. Please try again.
              </div>
            )}

            {requestMagicLink.data && !requestMagicLink.data.success && (
              <div className="mt-4 p-4 bg-amber-50 text-amber-700 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {requestMagicLink.data.error || "No applications found for this email."}
              </div>
            )}

            <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Shield className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">Your tracking link is valid for 24 hours and is tied to your email address. Only you can access your application details.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== LINKS READY PHASE =====
  if (phase === "links_ready") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="container max-w-lg pt-32 pb-20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Applications Found!</h1>
            <p className="text-gray-600">We found {trackingLinks.length} application(s) for <strong>{email}</strong>. Click to view details.</p>
          </div>

          <div className="space-y-4">
            {trackingLinks.map((link, i) => (
              <a
                key={i}
                href={`/track/${link.trackingToken}`}
                className="block bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-0.5 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Reference Number</p>
                    <p className="text-lg font-bold text-gray-900 font-mono">{link.referenceNumber || `Application #${i + 1}`}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </a>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            These links expire in 24 hours. You can request new links anytime.
          </p>
        </div>
      </div>
    );
  }

  // ===== VIEWING APPLICATION PHASE =====
  if (phase === "viewing") {
    if (appQuery.isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <Navigation />
          <div className="container max-w-lg pt-40 pb-20 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading your application...</p>
          </div>
        </div>
      );
    }

    if (!appQuery.data?.success || !appQuery.data?.application) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <Navigation />
          <div className="container max-w-lg pt-32 pb-20 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired or Invalid</h1>
            <p className="text-gray-600 mb-6">{appQuery.data?.error || "This tracking link is no longer valid."}</p>
            <a href="/track" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all">
              Request New Link
            </a>
          </div>
        </div>
      );
    }

    const app = appQuery.data.application;
    const notes = appQuery.data.notes || [];
    const documents = appQuery.data.documents || [];
    const universities = (() => {
      try { return JSON.parse(app.selectedUniversities); } catch { return []; }
    })();

    const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === app.status);
    const statusHistory = (() => {
      try { return JSON.parse(app.statusHistory || "[]"); } catch { return []; }
    })();

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="container max-w-4xl pt-28 pb-20">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Application Reference</p>
                <h1 className="text-2xl font-bold text-gray-900 font-mono">{app.referenceNumber || "N/A"}</h1>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'}`}>
                {app.status === "rejected" ? "❌ Rejected" : STATUS_STEPS.find(s => s.key === app.status)?.icon} {app.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </div>
            </div>

            {/* Progress Bar */}
            {app.status !== "rejected" && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        i <= currentStepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {i < currentStepIndex ? '✓' : step.icon}
                      </div>
                      <span className={`text-[10px] mt-1 text-center hidden sm:block ${i <= currentStepIndex ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Applicant Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Applicant</p>
                <p className="font-medium text-gray-900">{app.fullName}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Assigned Counselor</p>
                <p className="font-medium text-gray-900">{app.assignedCounselor || "Pending Assignment"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Applied On</p>
                <p className="font-medium text-gray-900">{new Date(app.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Universities Applied */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCapIcon /> Universities Applied
                </h3>
                <div className="space-y-3">
                  {universities.map((uni: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{uni.university || uni.name}</p>
                        <p className="text-sm text-gray-500">{uni.program && `${uni.program} · `}{uni.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Timeline */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="w-full flex items-center justify-between font-bold text-gray-900"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" /> Status Timeline
                  </span>
                  {showTimeline ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {showTimeline && (
                  <div className="mt-4 space-y-3">
                    {statusHistory.length > 0 ? statusHistory.map((entry: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{entry.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                          <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()} · by {entry.updatedBy}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-gray-400">No status updates yet.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes / Communication */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" /> Messages
                </h3>
                
                {notes.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {notes.map((note: any) => (
                      <div key={note.id} className={`p-4 rounded-xl ${note.authorName === app.fullName ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{note.authorName}</span>
                          <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-700">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mb-6">No messages yet. Send a message to your counselor below.</p>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newNote.trim()) {
                        addNoteMutation.mutate({ token, content: newNote.trim() });
                      }
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Send a message to your counselor..."
                  />
                  <button
                    onClick={() => {
                      if (newNote.trim()) {
                        addNoteMutation.mutate({ token, content: newNote.trim() });
                      }
                    }}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Documents */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Documents
                </h3>
                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                          <p className="text-xs text-gray-400">{doc.documentType} · {doc.uploadedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No documents uploaded yet.</p>
                )}
              </div>

              {/* Need Help */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
                <h3 className="font-bold mb-2">Need Help?</h3>
                <p className="text-blue-100 text-sm mb-4">Contact your counselor directly via WhatsApp for immediate assistance.</p>
                <a
                  href="https://wa.me/62819668278?text=Hi%20SpecTa!%20I%20need%20help%20with%20my%20application."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur rounded-xl text-sm font-medium hover:bg-white/30 transition-all"
                >
                  Chat on WhatsApp <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function GraduationCapIcon() {
  return (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 14l9-5-9-5-9 5 9 5z" />
      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zM12 14v7" />
    </svg>
  );
}
