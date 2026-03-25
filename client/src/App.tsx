import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MascotAgentProvider } from "./contexts/MascotAgentContext";
import Home from "./pages/Home";
import About from "./pages/About";
import IELTS from "./pages/IELTS";
import Destinations from "./pages/Destinations";
import Articles from "./pages/Articles";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/AdminDashboard";
import Malaysia from "./pages/Malaysia";
import CountryPage from "./pages/CountryPage";
import Compare from "./pages/Compare";
import Apply from "./pages/Apply";
import BookConsultation from "./pages/BookConsultation";
import IELTSPractice from "./pages/IELTSPractice";
import TrackApplication from "./pages/TrackApplication";
import Quiz from "./pages/Quiz";
import Persona from "./pages/Persona";
import Play from "./pages/Play";
import Scholarships from "./pages/Scholarships";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import AptitudeTest from "./pages/AptitudeTest";
import AptitudeTestPro from "./pages/AptitudeTestPro";
import ProPaymentSuccess from "./pages/ProPaymentSuccess";
import MyJourney from "./pages/MyJourney";
import Unsubscribe from "./pages/Unsubscribe";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Simulator from "./pages/Simulator";
import SimulatorExperience from "./pages/SimulatorExperience";
import SimulatorReport from "./pages/SimulatorReport";
import AgentCommandCenter from "./pages/AgentCommandCenter";
import CounselorCRM from "./pages/CounselorCRM";
import StudentProfile360 from "./pages/StudentProfile360";
import TeamChat from "./pages/TeamChat";
import UniversityDatabase from "./pages/UniversityDatabase";
import { useVisitorTracking } from "./hooks/useVisitorTracking";
import AIAnswers from "./pages/AIAnswers";

function Router() {
  // Track real visitor behavior on every page
  useVisitorTracking();

  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/about"} component={About} />
      <Route path={"/ielts"} component={IELTS} />
      <Route path={"/ielts/practice"} component={IELTSPractice} />
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
      <Route path={"/staff-login"} component={StaffLogin} />
      <Route path={"/staff-dashboard"} component={StaffDashboard} />
      <Route path={"/crm"} component={CounselorCRM} />
      <Route path={"/crm/lead/:id"} component={StudentProfile360} />
      <Route path={"/crm/team-chat"} component={TeamChat} />
      <Route path={"/crm/universities"} component={UniversityDatabase} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/agents"} component={AgentCommandCenter} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/blog/:slug"} component={BlogPost} />
      <Route path={"/simulator"} component={Simulator} />
      <Route path={"/simulator/experience"} component={SimulatorExperience} />
      <Route path={"/simulator/report"} component={SimulatorReport} />
      <Route path={"/ai-answers"} component={AIAnswers} />
      <Route path={"/faq"} component={AIAnswers} />
      <Route path={"/unsubscribe"} component={Unsubscribe} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
