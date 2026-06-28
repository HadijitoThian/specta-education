import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MascotAgentProvider } from "./contexts/MascotAgentContext";
import { useVisitorTracking } from "./hooks/useVisitorTracking";
import { captureAttribution } from "./lib/attribution";

// ── Critical path: eagerly loaded (homepage + 404) ───────────────────────────
// These are the only pages loaded on initial visit. Keep this list minimal.
import Home from "./pages/Home";
import NotFound from "@/pages/NotFound";

// ── Stale-chunk recovery ──────────────────────────────────────────────────────
// After a new deploy, the hashed chunk filenames change. A browser that loaded
// the OLD index.html will request a chunk (e.g. IELTS-<oldhash>.js) that no
// longer exists → "Failed to fetch dynamically imported module". Instead of
// showing an error, transparently reload ONCE to pull the fresh index.html.
// A sessionStorage timestamp guards against an infinite reload loop.
function reloadOnceForStaleChunk(): boolean {
  try {
    const KEY = "chunk-reload-ts";
    const last = Number(sessionStorage.getItem(KEY) || "0");
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
      return true;
    }
  } catch { /* sessionStorage may be unavailable */ }
  return false;
}

function lazyWithReload(factory: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // Likely a stale chunk after a redeploy — reload to fetch new assets.
      if (reloadOnceForStaleChunk()) {
        // Return a never-resolving promise so React keeps the fallback up
        // until the reload navigates away (avoids flashing the error screen).
        return new Promise<{ default: ComponentType<any> }>(() => {});
      }
      throw err;
    }
  });
}

// Vite also emits this when its preload helper fails to load a chunk.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    reloadOnceForStaleChunk();
  });
}

// ── All other pages: lazy loaded (code-split into separate chunks) ────────────
// Each lazy() call creates a separate JS chunk that is only downloaded when
// the user navigates to that route. This dramatically reduces initial bundle size.
const About = lazyWithReload(() => import("./pages/About"));
const IELTS = lazyWithReload(() => import("./pages/IELTS"));
const IELTSPractice = lazyWithReload(() => import("./pages/IELTSPractice"));
const IeltsTutor = lazyWithReload(() => import("./pages/IeltsTutor"));
const IeltsTutorRedeem = lazyWithReload(() => import("./pages/IeltsTutorRedeem"));
const Igcse = lazyWithReload(() => import("./pages/Igcse"));
const IgcseApp = lazyWithReload(() => import("./pages/IgcseApp"));
const IgcseLesson = lazyWithReload(() => import("./pages/IgcseLesson"));
const Destinations = lazyWithReload(() => import("./pages/Destinations"));
const CountryPage = lazyWithReload(() => import("./pages/CountryPage"));
const Malaysia = lazyWithReload(() => import("./pages/Malaysia"));
const Articles = lazyWithReload(() => import("./pages/Articles"));
const Contact = lazyWithReload(() => import("./pages/Contact"));
const Compare = lazyWithReload(() => import("./pages/Compare"));
const Apply = lazyWithReload(() => import("./pages/Apply"));
const BookConsultation = lazyWithReload(() => import("./pages/BookConsultation"));
const TrackApplication = lazyWithReload(() => import("./pages/TrackApplication"));
const MyJourney = lazyWithReload(() => import("./pages/MyJourney"));
const Scholarships = lazyWithReload(() => import("./pages/Scholarships"));
const Play = lazyWithReload(() => import("./pages/Play"));
const Quiz = lazyWithReload(() => import("./pages/Quiz"));
const Persona = lazyWithReload(() => import("./pages/Persona"));
const AptitudeTest = lazyWithReload(() => import("./pages/AptitudeTest"));
const AptitudeTestPro = lazyWithReload(() => import("./pages/AptitudeTestPro"));
const ProPaymentSuccess = lazyWithReload(() => import("./pages/ProPaymentSuccess"));
const Blog = lazyWithReload(() => import("./pages/Blog"));
const BlogPost = lazyWithReload(() => import("./pages/BlogPost"));
const Simulator = lazyWithReload(() => import("./pages/Simulator"));
const SimulatorExperience = lazyWithReload(() => import("./pages/SimulatorExperience"));
const SimulatorReport = lazyWithReload(() => import("./pages/SimulatorReport"));
const AIAnswers = lazyWithReload(() => import("./pages/AIAnswers"));
const Unsubscribe = lazyWithReload(() => import("./pages/Unsubscribe"));
const Login = lazyWithReload(() => import("./pages/Login"));
const ForgotPassword = lazyWithReload(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithReload(() => import("./pages/ResetPassword"));
// Staff / Admin routes (heavy — definitely lazy)
const StaffDashboard = lazyWithReload(() => import("./pages/StaffDashboard"));
const CounselorCRM = lazyWithReload(() => import("./pages/CounselorCRM"));
const StudentProfile360 = lazyWithReload(() => import("./pages/StudentProfile360"));
// New clean CRM (Phase 1+) — replaces the dormant CounselorCRM workspace.
const CrmHome = lazyWithReload(() => import("./pages/crm/CrmHome"));
const CrmTeam = lazyWithReload(() => import("./pages/crm/CrmTeam"));
const CrmStudents = lazyWithReload(() => import("./pages/crm/CrmStudents"));
const CrmStudentProfile = lazyWithReload(() => import("./pages/crm/CrmStudentProfile"));
const CrmReports = lazyWithReload(() => import("./pages/crm/CrmReports"));
const CrmCockpit = lazyWithReload(() => import("./pages/crm/CrmCockpit"));
const IntakeForm = lazyWithReload(() => import("./pages/crm/IntakeForm"));
const StudentJourney = lazyWithReload(() => import("./pages/crm/StudentJourney"));
const SosMedHome = lazyWithReload(() => import("./pages/sosmed/SosMedHome"));
const SosMedBrandKit = lazyWithReload(() => import("./pages/sosmed/SosMedBrandKit"));
const SosMedContent = lazyWithReload(() => import("./pages/sosmed/SosMedContent"));
const SosMedArtDirector = lazyWithReload(() => import("./pages/sosmed/SosMedArtDirector"));
const TeamChat = lazyWithReload(() => import("./pages/TeamChat"));
const UniversityDatabase = lazyWithReload(() => import("./pages/UniversityDatabase"));
const AIFollowUpAssistant = lazyWithReload(() => import("./pages/AIFollowUpAssistant"));
const AdminDashboard = lazyWithReload(() => import("./pages/AdminDashboard"));
const AdminDashboardLegacy = lazyWithReload(() => import("./pages/AdminDashboardLegacy"));
const AgentCommandCenter = lazyWithReload(() => import("./pages/AgentCommandCenter"));
const SocialMediaManager = lazyWithReload(() => import("./pages/SocialMediaManager"));
const AdsAgent = lazyWithReload(() => import("./pages/AdsAgent"));
const AdminIeltsTests = lazyWithReload(() => import("./pages/AdminIeltsTests"));
const IeltsMockTest = lazyWithReload(() => import("./pages/IeltsMockTest"));
const IeltsFreeRedeem = lazyWithReload(() => import("./pages/IeltsFreeRedeem"));
const IeltsMockSuccess = lazyWithReload(() => import("./pages/IeltsMockSuccess"));
const IeltsMockTake = lazyWithReload(() => import("./pages/IeltsMockTake"));
const IeltsMockReport = lazyWithReload(() => import("./pages/IeltsMockReport"));
// Student portal
const StudentPortalLogin = lazyWithReload(() => import("./pages/StudentPortalLogin"));
const StudentPortalRegister = lazyWithReload(() => import("./pages/StudentPortalRegister"));
const StudentPortalDashboard = lazyWithReload(() => import("./pages/StudentPortalDashboard"));

// ── Minimal loading fallback ──────────────────────────────────────────────────
// Intentionally lightweight: no spinner library, just a plain div.
// This avoids loading extra JS while the route chunk downloads.
function PageLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#e63946", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Router() {
  // Track real visitor behavior on every page
  useVisitorTracking();
  // Lock in first-touch marketing attribution (UTM / gclid) on first landing.
  useEffect(() => { captureAttribution(); }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* ── Auth ── */}
        <Route path={"/login"} component={Login} />
        {/* Public sign-up retired — dashboards are internal-only. */}
        <Route path={"/signup"}>{() => <Redirect to="/login" />}</Route>
        <Route path={"/forgot-password"} component={ForgotPassword} />
        <Route path={"/reset-password"} component={ResetPassword} />

        {/* ── Public pages ── */}
        <Route path={"/"} component={Home} />
        <Route path={"/about"} component={About} />
        <Route path={"/ielts"} component={IELTS} />
        <Route path={"/ielts/practice"} component={IELTSPractice} />
        <Route path={"/ielts/tutor"} component={IeltsTutor} />
        <Route path={"/ielts/tutor/redeem/:token"} component={IeltsTutorRedeem} />
        <Route path={"/igcse"} component={Igcse} />
        <Route path={"/igcse/app"} component={IgcseApp} />
        <Route path={"/igcse/lesson/:id"} component={IgcseLesson} />
        <Route path={"/destinations"} component={Destinations} />
        <Route path={"/destinations/:slug"} component={CountryPage} />
        <Route path={"/malaysia"} component={Malaysia} />
        <Route path={"/articles"} component={Articles} />
        <Route path={"/contact"} component={Contact} />
        <Route path={"/compare"} component={Compare} />
        <Route path={"/apply"} component={Apply} />
        <Route path={"/book"} component={BookConsultation} />
        <Route path={"/track"} component={TrackApplication} />
        <Route path={"/my-journey"} component={MyJourney} />
        <Route path={"/track/:token"} component={TrackApplication} />
        <Route path={"/scholarships"} component={Scholarships} />
        <Route path={"/play"} component={Play} />
        <Route path={"/play/quiz"} component={Quiz} />
        <Route path={"/play/persona"} component={Persona} />
        <Route path={"/play/aptitude"} component={AptitudeTest} />
        <Route path={"/test/pro"} component={AptitudeTestPro} />
        <Route path={"/test/pro/payment-success"} component={ProPaymentSuccess} />
        {/* Keep old /quiz route as redirect for SEO */}
        <Route path={"/quiz"}>{() => <Redirect to="/play/quiz" />}</Route>
        <Route path={"/blog"} component={Blog} />
        <Route path={"/blog/:slug"} component={BlogPost} />
        <Route path={"/simulator"} component={Simulator} />
        <Route path={"/simulator/experience"} component={SimulatorExperience} />
        <Route path={"/simulator/report"} component={SimulatorReport} />
        <Route path={"/ai-answers"} component={AIAnswers} />
        <Route path={"/faq"} component={AIAnswers} />
        <Route path={"/unsubscribe"} component={Unsubscribe} />
        {/* ── Staff / CRM ── */}
        {/* Old staff login retired — everyone uses /login now. */}
        <Route path={"/staff-login"}>{() => <Redirect to="/login" />}</Route>
        <Route path={"/staff-dashboard"} component={StaffDashboard} />
        <Route path={"/crm"} component={CrmHome} />
        <Route path={"/crm/team"} component={CrmTeam} />
        <Route path={"/crm/students"} component={CrmStudents} />
        <Route path={"/crm/students/:id"} component={CrmStudentProfile} />
        <Route path={"/crm/reports"} component={CrmReports} />
        <Route path={"/crm/cockpit"} component={CrmCockpit} />
        {/* Public student intake (counselor QR/link) — no login */}
        <Route path={"/join/:token"} component={IntakeForm} />
        <Route path={"/join"} component={IntakeForm} />
        <Route path={"/journey/:token"} component={StudentJourney} />
        {/* Social media studio */}
        <Route path={"/sosmed"} component={SosMedHome} />
        <Route path={"/SosMed"} component={SosMedHome} />
        <Route path={"/sosmed/brand-kit"} component={SosMedBrandKit} />
        <Route path={"/sosmed/content"} component={SosMedContent} />
        <Route path={"/sosmed/art-director"} component={SosMedArtDirector} />
        {/* Legacy dormant CRM pages — retained until later phases replace them. */}
        <Route path={"/crm/legacy"} component={CounselorCRM} />
        <Route path={"/crm/lead/:id"} component={StudentProfile360} />
        <Route path={"/crm/team-chat"} component={TeamChat} />
        <Route path={"/crm/universities"} component={UniversityDatabase} />
        <Route path={"/crm/ai-assistant"} component={AIFollowUpAssistant} />
        {/* ── Student portal ── */}
        <Route path={"/student/login"} component={StudentPortalLogin} />
        <Route path={"/student/register"} component={StudentPortalRegister} />
        <Route path={"/student/dashboard"} component={StudentPortalDashboard} />
        {/* ── Admin ── */}
        <Route path={"/admin"} component={AdminDashboard} />
        <Route path={"/admin/legacy"} component={AdminDashboardLegacy} />
        <Route path={"/admin/agents"} component={AgentCommandCenter} />
        <Route path={"/admin/social-media"} component={SocialMediaManager} />
        <Route path={"/admin/ads-agent"} component={AdsAgent} />
        <Route path={"/admin/ielts-tests"} component={AdminIeltsTests} />
        <Route path={"/ielts/mock-test"} component={IeltsMockTest} />
        <Route path={"/ielts/redeem/:token"} component={IeltsFreeRedeem} />
        <Route path={"/ielts/mock-test/success"} component={IeltsMockSuccess} />
        <Route path={"/ielts/mock-test/take/:token"} component={IeltsMockTake} />
        <Route path={"/ielts/mock-test/report/:token"} component={IeltsMockReport} />
        {/* ── Fallbacks ── */}
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <MascotAgentProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </MascotAgentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
