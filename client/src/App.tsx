import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MascotAgentProvider } from "./contexts/MascotAgentContext";
import { useVisitorTracking } from "./hooks/useVisitorTracking";

// ── Critical path: eagerly loaded (homepage + 404) ───────────────────────────
// These are the only pages loaded on initial visit. Keep this list minimal.
import Home from "./pages/Home";
import NotFound from "@/pages/NotFound";

// ── All other pages: lazy loaded (code-split into separate chunks) ────────────
// Each lazy() call creates a separate JS chunk that is only downloaded when
// the user navigates to that route. This dramatically reduces initial bundle size.
const About = lazy(() => import("./pages/About"));
const Destinations = lazy(() => import("./pages/Destinations"));
const CountryPage = lazy(() => import("./pages/CountryPage"));
const Malaysia = lazy(() => import("./pages/Malaysia"));
const Articles = lazy(() => import("./pages/Articles"));
const Contact = lazy(() => import("./pages/Contact"));
const Compare = lazy(() => import("./pages/Compare"));
const Apply = lazy(() => import("./pages/Apply"));
const BookConsultation = lazy(() => import("./pages/BookConsultation"));
const TrackApplication = lazy(() => import("./pages/TrackApplication"));
const MyJourney = lazy(() => import("./pages/MyJourney"));
const Scholarships = lazy(() => import("./pages/Scholarships"));
const Play = lazy(() => import("./pages/Play"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Persona = lazy(() => import("./pages/Persona"));
const AptitudeTest = lazy(() => import("./pages/AptitudeTest"));
const AptitudeTestPro = lazy(() => import("./pages/AptitudeTestPro"));
const ProPaymentSuccess = lazy(() => import("./pages/ProPaymentSuccess"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Simulator = lazy(() => import("./pages/Simulator"));
const SimulatorExperience = lazy(() => import("./pages/SimulatorExperience"));
const SimulatorReport = lazy(() => import("./pages/SimulatorReport"));
const AIAnswers = lazy(() => import("./pages/AIAnswers"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
// Staff / Admin routes (heavy — definitely lazy)
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const CounselorCRM = lazy(() => import("./pages/CounselorCRM"));
const StudentProfile360 = lazy(() => import("./pages/StudentProfile360"));
const TeamChat = lazy(() => import("./pages/TeamChat"));
const UniversityDatabase = lazy(() => import("./pages/UniversityDatabase"));
const AIFollowUpAssistant = lazy(() => import("./pages/AIFollowUpAssistant"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AgentCommandCenter = lazy(() => import("./pages/AgentCommandCenter"));
const SocialMediaManager = lazy(() => import("./pages/SocialMediaManager"));
const AdsAgent = lazy(() => import("./pages/AdsAgent"));
const AdminIeltsTests = lazy(() => import("./pages/AdminIeltsTests"));
const IeltsMockTest = lazy(() => import("./pages/IeltsMockTest"));
const IeltsMockSuccess = lazy(() => import("./pages/IeltsMockSuccess"));
const IeltsMockTake = lazy(() => import("./pages/IeltsMockTake"));
const IeltsMockReport = lazy(() => import("./pages/IeltsMockReport"));
// Student portal
const StudentPortalLogin = lazy(() => import("./pages/StudentPortalLogin"));
const StudentPortalRegister = lazy(() => import("./pages/StudentPortalRegister"));
const StudentPortalDashboard = lazy(() => import("./pages/StudentPortalDashboard"));

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

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* ── Auth ── */}
        <Route path={"/login"} component={Login} />
        <Route path={"/signup"} component={Signup} />
        <Route path={"/forgot-password"} component={ForgotPassword} />
        <Route path={"/reset-password"} component={ResetPassword} />

        {/* ── Public pages ── */}
        <Route path={"/"} component={Home} />
        <Route path={"/about"} component={About} />
        {/* Old IELTS study pages removed — the IELTS Mock Test is the offering. */}
        <Route path={"/ielts"} component={IeltsMockTest} />
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
        <Route path={"/staff-login"} component={StaffLogin} />
        <Route path={"/staff-dashboard"} component={StaffDashboard} />
        <Route path={"/crm"} component={CounselorCRM} />
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
        <Route path={"/admin/agents"} component={AgentCommandCenter} />
        <Route path={"/admin/social-media"} component={SocialMediaManager} />
        <Route path={"/admin/ads-agent"} component={AdsAgent} />
        <Route path={"/admin/ielts-tests"} component={AdminIeltsTests} />
        <Route path={"/ielts/mock-test"} component={IeltsMockTest} />
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
