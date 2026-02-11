import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2, LogOut, Upload, FileText, Users, Download, Lock, Eye, EyeOff,
  ChevronDown, ChevronUp
} from "lucide-react";
import { useLocation } from "wouter";

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const { data: meData, isLoading: meLoading, refetch: refetchMe } = trpc.staffAuth.me.useQuery();
  const logoutMutation = trpc.staffAuth.logout.useMutation();
  const changePasswordMutation = trpc.staffAuth.changePassword.useMutation();

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Document upload state
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded application state
  const [expandedApp, setExpandedApp] = useState<number | null>(null);

  const staffUser = meData?.staff;

  // Redirect to login if not authenticated
  if (!meLoading && !staffUser) {
    setLocation("/staff-login");
    return null;
  }

  // Redirect to login if must change password
  if (staffUser?.mustChangePassword) {
    setLocation("/staff-login");
    return null;
  }

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

  if (meLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

        {/* Welcome Card */}
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Welcome to SpecTa Education Staff Portal
              </h2>
              <p className="text-gray-600">
                {staffUser?.role === "counselor"
                  ? "View your assigned students, manage applications, and upload documents."
                  : staffUser?.role === "admin"
                  ? "You have full admin access. Visit the Admin Dashboard for complete management."
                  : "Access your assigned tasks and responsibilities."}
              </p>
              {staffUser?.role === "admin" && (
                <Button
                  className="mt-4 bg-rose-600 hover:bg-rose-700"
                  onClick={() => setLocation("/admin")}
                >
                  Go to Admin Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for future counselor-specific features */}
        {staffUser?.role === "counselor" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                Your Assigned Students
              </CardTitle>
              <CardDescription>
                Students and applications assigned to you will appear here.
                Contact your admin for assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No students assigned yet.</p>
                <p className="text-sm mt-1">Your admin will assign students to you.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
