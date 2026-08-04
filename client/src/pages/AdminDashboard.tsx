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
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2, LogOut, Home, Sparkles, FileText, TrendingUp, Megaphone, Brain, GraduationCap, Mic } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import BlogManager from "@/components/admin/BlogManager";
import GrowthDashboard from "@/components/admin/GrowthDashboard";
import AdsCopilot from "@/components/admin/AdsCopilot";
import GrowthInsights from "@/components/admin/GrowthInsights";
import AptitudeManager from "@/components/admin/AptitudeManager";
import IgcseAdmin from "@/components/admin/IgcseAdmin";
import VoiceCloneAdmin from "@/components/admin/VoiceCloneAdmin";

export default function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin Dashboard | SpecTa Education";
  }, []);

  const { user, loading, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<"blog" | "growth" | "ads" | "insights" | "aptitude" | "igcse" | "voice-clone">("blog");

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
            <Link href="/admin/ielts-tutor">
              <Button variant="outline" size="sm" className="bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100">
                <Sparkles className="w-4 h-4 mr-2" /> AI IELTS Tutor
              </Button>
            </Link>
            <Link href="/admin/ads-launcher">
              <Button variant="outline" size="sm" className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">
                <Sparkles className="w-4 h-4 mr-2" /> Ads Launcher
              </Button>
            </Link>
            <Link href="/admin/wa-links">
              <Button variant="outline" size="sm" className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                <Sparkles className="w-4 h-4 mr-2" /> WA Attribution
              </Button>
            </Link>
            <span className="hidden sm:inline text-sm text-muted-foreground">Welcome, {user?.name || "Admin"}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="container py-8">
        <div className="flex gap-2 mb-6">
          <Button variant={tab === "blog" ? "default" : "outline"} size="sm" onClick={() => setTab("blog")}>
            <FileText className="w-4 h-4 mr-2" /> Blog &amp; Articles
          </Button>
          <Button variant={tab === "growth" ? "default" : "outline"} size="sm" onClick={() => setTab("growth")}>
            <TrendingUp className="w-4 h-4 mr-2" /> Growth &amp; Conversion
          </Button>
          <Button variant={tab === "ads" ? "default" : "outline"} size="sm" onClick={() => setTab("ads")}>
            <Megaphone className="w-4 h-4 mr-2" /> Ads Co-pilot
          </Button>
          <Button variant={tab === "insights" ? "default" : "outline"} size="sm" onClick={() => setTab("insights")}>
            <Brain className="w-4 h-4 mr-2" /> Insights
          </Button>
          <Button variant={tab === "aptitude" ? "default" : "outline"} size="sm" onClick={() => setTab("aptitude")}>
            <Brain className="w-4 h-4 mr-2" /> Tes Bakat (Pro)
          </Button>
          <Button variant={tab === "igcse" ? "default" : "outline"} size="sm" onClick={() => setTab("igcse")}>
            <GraduationCap className="w-4 h-4 mr-2" /> IGCSE
          </Button>
          <Button variant={tab === "voice-clone" ? "default" : "outline"} size="sm" onClick={() => setTab("voice-clone")}>
            <Mic className="w-4 h-4 mr-2" /> Voice Clone
          </Button>
        </div>
        {tab === "blog" ? <BlogManager />
          : tab === "growth" ? <GrowthDashboard />
          : tab === "ads" ? <AdsCopilot />
          : tab === "aptitude" ? <AptitudeManager />
          : tab === "igcse" ? <IgcseAdmin />
          : tab === "voice-clone" ? <VoiceCloneAdmin />
          : <GrowthInsights />}
      </main>
    </div>
  );
}
