import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, FileText, CheckCircle2, Clock, XCircle, Upload,
  LogOut, BookOpen, Globe, Calendar, DollarSign, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Eye, Download, User
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  verified: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

const APP_STATUS_COLORS: Record<string, string> = {
  Preparing: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  Submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Under Review": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Conditional Offer": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Unconditional Offer": "bg-green-500/20 text-green-400 border-green-500/30",
  Enrolled: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  Withdrawn: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function DocItem({ doc, onUpload }: { doc: any; onUpload: (docId: number, file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onUpload(doc.id, file);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const statusIcon = {
    verified: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    submitted: <Clock className="w-4 h-4 text-blue-400" />,
    rejected: <XCircle className="w-4 h-4 text-red-400" />,
    pending: <AlertCircle className="w-4 h-4 text-yellow-400" />,
  }[doc.status as string] ?? <AlertCircle className="w-4 h-4 text-yellow-400" />;

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {statusIcon}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{doc.docType}</p>
          {doc.notes && <p className="text-xs text-slate-500 truncate">{doc.notes}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <Badge className={`text-xs border ${STATUS_COLORS[doc.status] ?? "bg-slate-500/20 text-slate-400"}`}>
          {doc.status}
        </Badge>
        {doc.fileUrl && (
          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:text-white">
              <Eye className="w-3 h-3" />
            </Button>
          </a>
        )}
        {doc.status !== "verified" && (
          <>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileChange} />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-violet-400 hover:text-violet-300"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function StudentPortalDashboard() {
  const [, setLocation] = useLocation();
  const [expandedApps, setExpandedApps] = useState<Set<number>>(new Set());
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.studentPortal.getDashboard.useQuery();
  const logoutMutation = trpc.studentPortal.logout.useMutation({
    onSuccess: () => setLocation("/student/login"),
  });

  const uploadMutation = trpc.crm.uploadCrmDocument.useMutation({
    onSuccess: () => utils.studentPortal.getDashboard.invalidate(),
  });

  const handleUpload = async (docId: number, file: File) => {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await uploadMutation.mutateAsync({
          docId,
          leadId: (data as any)?.lead?.id ?? 0,
          fileName: file.name,
          fileMimeType: file.type,
          fileData: base64,
        });
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleApp = (id: number) => {
    setExpandedApps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-white font-semibold text-lg mb-2">Session Expired</h2>
          <p className="text-slate-400 text-sm mb-4">Please sign in again to access your dashboard.</p>
          <Button onClick={() => setLocation("/student/login")} className="bg-violet-600 hover:bg-violet-700">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const { lead, documents } = data as any;
  const pendingDocs = documents.filter((d: any) => d.status === "pending");
  const submittedDocs = documents.filter((d: any) => d.status === "submitted");
  const verifiedDocs = documents.filter((d: any) => d.status === "verified");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">SpecTa Education</p>
              <p className="text-slate-500 text-xs">Student Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium">{lead.studentName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/20 rounded-2xl p-5">
          <h1 className="text-xl font-bold text-white mb-1">Hi, {lead.studentName?.split(" ")[0]}! 👋</h1>
          <p className="text-slate-300 text-sm">Here's your study abroad journey at a glance.</p>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Globe className="w-4 h-4 text-violet-400" />
              <span>{lead.preferredCountry || "Country TBD"}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>{lead.studyLevel || "Level TBD"} — {lead.programMajor || "Program TBD"}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{pendingDocs.length}</p>
              <p className="text-slate-400 text-xs mt-1">Docs Needed</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{submittedDocs.length}</p>
              <p className="text-slate-400 text-xs mt-1">Under Review</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{verifiedDocs.length}</p>
              <p className="text-slate-400 text-xs mt-1">Verified</p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Progress */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Your Journey</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const stages = ["New Lead", "Contacted", "Qualified", "In Progress", "Enrolled", "Completed"];
              const statusMap: Record<string, number> = {
                new: 0, contacted: 1, qualified: 2, in_progress: 3, enrolled: 4, completed: 5
              };
              const currentIdx = statusMap[lead.status] ?? 0;
              return (
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {stages.map((stage, idx) => (
                    <div key={stage} className="flex items-center gap-1">
                      <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                        idx < currentIdx ? "bg-violet-600/30 text-violet-300" :
                        idx === currentIdx ? "bg-violet-600 text-white" :
                        "bg-slate-700 text-slate-500"
                      }`}>
                        {stage}
                      </div>
                      {idx < stages.length - 1 && (
                        <div className={`w-4 h-0.5 flex-shrink-0 ${idx < currentIdx ? "bg-violet-500" : "bg-slate-700"}`} />
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-400" />
                My Documents
              </CardTitle>
              {pendingDocs.length > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                  {pendingDocs.length} pending upload
                </Badge>
              )}
            </div>
            {pendingDocs.length > 0 && (
              <p className="text-yellow-400/80 text-xs mt-1">
                ⚠️ Please upload the pending documents to keep your application moving forward.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No documents assigned yet. Your counselor will add them soon.</p>
            ) : (
              <div>
                {documents.map((doc: any) => (
                  <DocItem key={doc.id} doc={doc} onUpload={handleUpload} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Counselor */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium text-sm">Need help?</p>
                <p className="text-slate-400 text-xs mt-0.5">Your counselor is here to support you</p>
              </div>
              <a
                href={`https://wa.me/628118120820?text=${encodeURIComponent(`Hi, I'm ${lead.studentName} and I need help with my application.`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  💬 WhatsApp Us
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
