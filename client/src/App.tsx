import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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

function Router() {
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
      <Route path={"/track/:token"} component={TrackApplication} />
      <Route path={"/quiz"} component={Quiz} />
      <Route path={"/admin"} component={AdminDashboard} />
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
