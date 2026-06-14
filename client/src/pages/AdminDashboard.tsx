/**
 * Admin Dashboard — lean publishing console.
 *
 * The old 20-tab dashboard is parked at /admin/legacy (AdminDashboardLegacy).
 * Day-to-day team work now lives in dedicated workspaces:
 *   - CRM (students, team, reports)      → /crm
 *   - Social Media Studio                → /sosmed
 *   - IELTS Mock Test admin              → /admin/ielts-tests
 *
 * This page is intentionally minimal: the Blog Manager (incl. the GEO Article
 * Producer) plus a quick link to the IELTS Mock Test admin. Rebuild other tools
 * here only when they're actually needed.
 */
import { useEffect } from "react";
import { Link } from "wouter";
import { Loader2, LogOut, Home, Sparkles, FileText } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import BlogManager from "@/components/admin/BlogManager";

export default function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin Dashboard | SpecTa Education";
  }, []);

  const { user, loading, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SEO title="Admin Dashboard | SpecTa Education" description="Administration dashboard for SpecTa Education management." noindex />
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
            <Button className="bg-primary hover:bg-primary/90">Log In</Button>
          </a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to access this page.</p>
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90">
              <Home className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin Dashboard | SpecTa Education" description="Administration dashboard for SpecTa Education management." noindex />

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/">
              <img src="/files/migrated/QxrYSewOYzAuPIEN.jpeg" alt="SpecTa Education" className="h-10 object-contain" />
            </Link>
            <span className="text-sm font-medium text-muted-foreground">Admin Dashboard</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/ielts-tests">
              <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
                <Sparkles className="w-4 h-4 mr-2" /> IELTS Mock Tests
              </Button>
            </Link>
            <span className="hidden sm:inline text-sm text-muted-foreground">Welcome, {user?.name || "Admin"}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Body — Blog Manager (incl. GEO Article Producer) */}
      <main className="container py-8">
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>Publishing console — manage blog articles and produce SEO/GEO content.</span>
        </div>
        <BlogManager />
      </main>
    </div>
  );
}
