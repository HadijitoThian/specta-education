import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import StudyAbroadChecklist from "@/components/StudyAbroadChecklist";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { ClipboardCheck, LogIn, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MyJourney() {
  const { user, loading } = useAuth();
  const isLoading = loading;
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-24 pb-8 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <ClipboardCheck className="w-4 h-4" />
              Study Abroad Checklist
            </div>
            <h1 className="text-4xl font-bold mb-3">
              Your Study Abroad Journey
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Track your preparation progress from 12 months before departure to the big day. 
              Check off tasks as you complete them and stay organized throughout your journey.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Lacak persiapan kamu dari 12 bulan sebelum keberangkatan hingga hari H.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 pb-20">
        <div className="container">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse space-y-4 w-full max-w-3xl mx-auto">
                <div className="h-24 bg-muted rounded-2xl"></div>
                <div className="h-16 bg-muted rounded-xl"></div>
                <div className="h-16 bg-muted rounded-xl"></div>
                <div className="h-16 bg-muted rounded-xl"></div>
              </div>
            </div>
          ) : user ? (
            <StudyAbroadChecklist />
          ) : (
            <motion.div
              className="max-w-lg mx-auto text-center py-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Sign In to Start Your Journey</h2>
              <p className="text-muted-foreground mb-2">
                Create a free account to access your personalized study abroad checklist. 
                Track your progress, add notes, and never miss an important step.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Masuk untuk mengakses checklist studi luar negeri yang dipersonalisasi untukmu.
              </p>
              <a href={getLoginUrl()}>
                <Button size="lg" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In / Create Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
      <ChatBotButton onClick={() => setIsChatOpen(true)} />
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[600px] rounded-2xl shadow-2xl overflow-hidden">
          <ChatBot />
        </div>
      )}
    </div>
  );
}
