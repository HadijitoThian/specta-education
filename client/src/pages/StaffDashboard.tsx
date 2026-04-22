import { useEffect, useState, useRef, useMemo } from "react";
import { SEO } from '@/components/SEO';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2, LogOut, Upload, FileText, Users, Download, Lock, Eye, EyeOff,
  ChevronDown, ChevronUp, GraduationCap, Globe, Phone, Mail, Calendar,
  StickyNote, Building2, BookOpen, PlusCircle, X
} from "lucide-react";
import { useLocation } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  reviewing: "bg-yellow-100 text-yellow-800",
  processing: "bg-purple-100 text-purple-800",
  on_hold: "bg-orange-100 text-orange-800",
  offer_received: "bg-emerald-100 text-emerald-800",
  accepted: "bg-green-100 text-green-800",
  enrolled: "bg-teal-100 text-teal-800",
  rejected: "bg-red-100 text-red-800",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  transcript: "Transcript",
  passport: "Passport",
  ielts: "IELTS Score",
  certificate: "Certificate",
  offer_letter: "Offer Letter",
  visa: "Visa",
  other: "Other",
};

export default function StaffDashboard() {
  useEffect(() => {
    document.title = "Staff Dashboard | SpecTa Education";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'SpecTa Education staff dashboard. Manage student applications, track consultations, and monitor team performance.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'SpecTa Education staff dashboard. Manage student applications, track consultations, and monitor team performance.';
      document.head.appendChild(meta);
    }
  }, []);

  const [, setLocation] = useLocation();
  const { data: meData, isLoading: meLoading, isFetching: meFetching } = trpc.staffAuth.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes — don't refetch on every navigation
    retry: false,
  });
  const { data: appsData, isLoading: appsLoading, refetch: refetchApps } = trpc.staffAuth.getMyApplications.useQuery();
  const logoutMutation = trpc.staffAuth.logout.useMutation();
  const changePasswordMutation = trpc.staffAuth.changePassword.useMutation();
  const uploadDocMutation = trpc.staffAuth.uploadDocumentForStudent.useMutation();
  const addNoteMutation = trpc.staffAuth.addNoteForStudent.useMutation();
  const updateStatusMutation = trpc.staffAuth.updateApplicationStatus.useMutation({
    onSuccess: () => refetchApps()
  });

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Expanded application state
  const [expandedApp, setExpandedApp] = useState<number | null>(null);

  // Upload state
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("other");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note state
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const [noteContent, setNoteContent] = useState("");

  const staffUser = meData?.staff;
  const applications = useMemo(() => appsData?.applications || [], [appsData]);

  // Redirect to login — MUST be inside useEffect, never in render phase
  // Calling setLocation/navigate in render causes React infinite re-render loops
  useEffect(() => {
    if (!meLoading && !meFetching && !staffUser) {
      setLocation("/staff-login");
    }
  }, [meLoading, meFetching, staffUser, setLocation]);

  useEffect(() => {
    if (staffUser?.mustChangePassword) {
      setLocation("/staff-login");
    }
  }, [staffUser, setLocation]);

  // Show loading while auth is being checked
  if (meLoading || meFetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!staffUser) return null;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    toast.success("Logged out successfully");
    setLocation("/staff-login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    try {
      const result = await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      if (result.success) {
        toast.success("Password changed successfully!");
        setShowChangePassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error || "Failed to change password");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleFileUpload = async (applicationId: number, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    setUploadingFor(applicationId);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadDocMutation.mutateAsync({
          applicationId,
          fileName: file.name,
          fileType: file.type,
          fileData: base64,
          documentType: selectedDocType as any,
        });
        if (result.success) {
          toast.success(`Document "${file.name}" uploaded successfully!`);
          refetchApps();
        } else {
          toast.error(result.error || "Upload failed");
        }
        setUploadingFor(null);
        setSelectedDocType("other");
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploadingFor(null);
    }
  };

  const handleAddNote = async (applicationId: number) => {
    if (!noteContent.trim()) {
      toast.error("Note content cannot be empty");
      return;
    }
    try {
      const result = await addNoteMutation.mutateAsync({
        applicationId,
        content: noteContent.trim(),
        isPublic: true,
      });
      if (result.success) {
        toast.success("Note added successfully!");
        setNoteContent("");
        setNoteFor(null);
        refetchApps();
      } else {
        toast.error(result.error || "Failed to add note");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add note");
    }
  };

  const parseUniversities = (json: string) => {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  };

  if (meLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <SEO
        title="Staff Dashboard | SpecTa Education"
        description="Staff management dashboard for SpecTa Education."
        noindex
      />
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Staff Dashboard</h1>
              <p className="text-xs text-gray-500">Welcome, {staffUser?.name} ({staffUser?.role})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePassword(!showChangePassword)}
            >
              <Lock className="w-4 h-4 mr-1" /> Change Password
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Change Password Card */}
        {showChangePassword && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription>Update your login password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700" disabled={changingPassword}>
                    {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Update Password
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowChangePassword(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
                <p className="text-xs text-gray-500">Assigned Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.reduce((sum: number, app: any) => sum + (app.documents?.length || 0), 0)}
                </p>
                <p className="text-xs text-gray-500">Total Documents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.reduce((sum: number, app: any) => {
                    try { return sum + JSON.parse(app.selectedUniversities || "[]").length; } catch { return sum; }
                  }, 0)}
                </p>
                <p className="text-xs text-gray-500">University Applications</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CRM Dashboard - available to all staff */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">🎯 Counselor CRM Dashboard</p>
              <p className="text-sm text-gray-600">Manage your leads, tasks, pipeline, and student profiles with AI assistance.</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setLocation("/crm")}>
              Open CRM Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Admin link for admin role */}
        {staffUser?.role === "admin" && (
          <Card className="mb-6 border-rose-200 bg-rose-50">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Admin Access</p>
                <p className="text-sm text-gray-600">You have admin privileges. Access the full admin dashboard.</p>
              </div>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => setLocation("/admin")}>
                Go to Admin Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Applications List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-rose-600" />
              Your Assigned Students
            </CardTitle>
            <CardDescription>
              {applications.length > 0
                ? `You have ${applications.length} student${applications.length > 1 ? "s" : ""} assigned to you.`
                : "Students assigned to you will appear here."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
                <p className="text-gray-500">Loading your students...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No students assigned yet.</p>
                <p className="text-sm mt-1">Your admin will assign students to you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app: any) => {
                  const universities = parseUniversities(app.selectedUniversities);
                  const isExpanded = expandedApp === app.id;
                  const docs = app.documents || [];
                  const notes = app.notes || [];

                  return (
                    <div
                      key={app.id}
                      className="border rounded-lg overflow-hidden transition-all"
                    >
                      {/* Application Header - Always visible */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{app.fullName}</h3>
                              <Badge variant="outline" className="text-xs font-mono">
                                {app.referenceNumber}
                              </Badge>
                              <Badge className={`text-xs ${STATUS_COLORS[app.status] || "bg-gray-100 text-gray-800"}`}>
                                {app.status?.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {app.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {app.phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {new Date(app.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {universities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {universities.map((uni: any, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    <Building2 className="w-3 h-3 mr-1" />
                                    {uni.university} · {uni.program}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge variant="outline" className="text-xs">
                              {docs.length} doc{docs.length !== 1 ? "s" : ""}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4 space-y-4">
                          {/* Status Update */}
                          <div className="flex items-center gap-3 mb-3">
                            <label className="text-sm font-medium text-gray-700">Update Status:</label>
                            <select
                              value={app.status}
                              onChange={(e) => {
                                if (confirm(`Change status to "${e.target.value.replace(/_/g, ' ')}"?`)) {
                                  updateStatusMutation.mutate({ applicationId: app.id, status: e.target.value as any });
                                }
                              }}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
                            >
                              <option value="submitted">Submitted</option>
                              <option value="reviewing">Reviewing</option>
                              <option value="processing">Processing</option>
                              <option value="on_hold">On Hold</option>
                              <option value="offer_received">Offer Received</option>
                              <option value="accepted">Accepted</option>
                              <option value="enrolled">Enrolled</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                          </div>

                          {/* Student Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {app.currentSchool && (
                              <div>
                                <span className="text-gray-500">School:</span>{" "}
                                <span className="font-medium">{app.currentSchool}</span>
                              </div>
                            )}
                            {app.educationLevel && (
                              <div>
                                <span className="text-gray-500">Education:</span>{" "}
                                <span className="font-medium">{app.educationLevel}</span>
                              </div>
                            )}
                            {app.ieltsScore && (
                              <div>
                                <span className="text-gray-500">IELTS:</span>{" "}
                                <span className="font-medium">{app.ieltsScore}</span>
                              </div>
                            )}
                            {app.additionalNotes && (
                              <div className="col-span-2">
                                <span className="text-gray-500">Student Notes:</span>{" "}
                                <span className="font-medium">{app.additionalNotes}</span>
                              </div>
                            )}
                          </div>

                          {/* Existing Documents from Application */}
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
                              <FileText className="w-4 h-4" /> Application Documents
                            </h4>
                            <div className="space-y-1">
                              {/* Original application documents (transcript, passport, etc.) */}
                              {app.transcriptUrl && (
                                <a href={app.transcriptUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-1.5 rounded hover:bg-blue-50">
                                  <FileText className="w-4 h-4 text-green-600" />
                                  <span>Transcript</span>
                                  <Download className="w-3 h-3 ml-auto" />
                                </a>
                              )}
                              {app.passportUrl && (
                                <a href={app.passportUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-1.5 rounded hover:bg-blue-50">
                                  <FileText className="w-4 h-4 text-orange-600" />
                                  <span>Passport</span>
                                  <Download className="w-3 h-3 ml-auto" />
                                </a>
                              )}
                              {app.ieltsDocUrl && (
                                <a href={app.ieltsDocUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-1.5 rounded hover:bg-blue-50">
                                  <FileText className="w-4 h-4 text-red-600" />
                                  <span>IELTS Score</span>
                                  <Download className="w-3 h-3 ml-auto" />
                                </a>
                              )}
                              {app.certificateUrl && (
                                <a href={app.certificateUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-1.5 rounded hover:bg-blue-50">
                                  <FileText className="w-4 h-4 text-purple-600" />
                                  <span>Certificate</span>
                                  <Download className="w-3 h-3 ml-auto" />
                                </a>
                              )}
                              {/* Additional uploaded documents */}
                              {docs.map((doc: any) => (
                                <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-1.5 rounded hover:bg-blue-50">
                                  <FileText className="w-4 h-4 text-gray-600" />
                                  <span>{doc.fileName}</span>
                                  <Badge variant="outline" className="text-[10px] ml-1">
                                    {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {doc.uploadedBy}
                                  </Badge>
                                  <Download className="w-3 h-3 ml-auto" />
                                </a>
                              ))}
                              {!app.transcriptUrl && !app.passportUrl && !app.ieltsDocUrl && !app.certificateUrl && docs.length === 0 && (
                                <p className="text-xs text-gray-400 py-2">No documents uploaded yet.</p>
                              )}
                            </div>
                          </div>

                          {/* Upload Document */}
                          <div className="border rounded-lg p-3 bg-white">
                            <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
                              <Upload className="w-4 h-4" /> Upload Document for {app.fullName}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={selectedDocType}
                                onChange={(e) => setSelectedDocType(e.target.value)}
                                className="text-sm border rounded px-2 py-1.5 bg-white"
                              >
                                <option value="transcript">Transcript</option>
                                <option value="passport">Passport</option>
                                <option value="ielts">IELTS Score</option>
                                <option value="certificate">Certificate</option>
                                <option value="offer_letter">Offer Letter</option>
                                <option value="visa">Visa</option>
                                <option value="other">Other</option>
                              </select>
                              <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(app.id, file);
                                }}
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFor === app.id}
                              >
                                {uploadingFor === app.id ? (
                                  <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Uploading...</>
                                ) : (
                                  <><Upload className="w-4 h-4 mr-1" /> Choose File</>
                                )}
                              </Button>
                              <span className="text-xs text-gray-400">PDF, JPG, PNG, DOC (max 10MB)</span>
                            </div>
                          </div>

                          {/* Notes Section */}
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
                              <StickyNote className="w-4 h-4" /> Notes ({notes.length})
                            </h4>
                            {notes.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {notes.map((note: any) => (
                                  <div key={note.id} className="bg-white border rounded p-2.5 text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-gray-700">{note.authorName}</span>
                                      <span className="text-xs text-gray-400">
                                        {new Date(note.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-gray-600">{note.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {noteFor === app.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={noteContent}
                                  onChange={(e) => setNoteContent(e.target.value)}
                                  placeholder="Write a note about this student..."
                                  className="text-sm"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-rose-600 hover:bg-rose-700"
                                    onClick={() => handleAddNote(app.id)}
                                    disabled={addNoteMutation.isPending}
                                  >
                                    {addNoteMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                    ) : null}
                                    Save Note
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setNoteFor(null); setNoteContent(""); }}
                                  >
                                    <X className="w-4 h-4 mr-1" /> Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setNoteFor(app.id)}
                              >
                                <PlusCircle className="w-4 h-4 mr-1" /> Add Note
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
