/**
 * GlobalChatBot — the SpecTa AI assistant, mounted ONCE at the app root
 * (see App.tsx) so it appears on every public page automatically.
 *
 * Historically the ChatBot was imported page-by-page. Every new page had to
 * remember to add the code, and paid product pages built after the pattern
 * changed (Tutor, Mock Test, IGCSE, IELTS Practice, FAQ, etc.) shipped
 * without it. Rather than fix the same bug six more times, this component
 * centralises the widget so any new page in App.tsx automatically inherits
 * the chatbot without extra work.
 *
 * The path-based skip list below hides the widget on pages where it would
 * be inappropriate:
 *   - admin / staff / CRM / social-media dashboards → internal, not for
 *     students
 *   - /login, /reset-password, /forgot-password → auth flows should stay
 *     focused
 *   - /ielts/mock-test/take/* → active exam; the widget would be a
 *     distraction (and a cheating vector) during a timed test
 *   - /igcse/lesson/* + /igcse/practice/attempt/* → inside a paid lesson,
 *     the student already has a full AI teacher on screen
 *   - /join/*, /journey/* → single-purpose intake flows
 *
 * Everything else — home, about, all destinations, all IELTS/IGCSE product
 * landings, blog, articles, FAQ, scholarships — gets the widget.
 */

import { lazy, Suspense, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useLocation } from "wouter";

const ChatBot = lazy(() => import("@/components/ChatBot"));
const ChatBotButton = lazy(() => import("@/components/ChatBotButton"));

// Prefix-match: any pathname that startsWith one of these hides the widget.
const HIDE_ON_PREFIXES: string[] = [
  "/admin",
  "/staff",
  "/crm",
  "/sosmed",
  "/SosMed",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/join",
  "/journey",
  "/student/dashboard",
  "/student/portal",
  "/ielts/mock-test/take",
  "/ielts/mock-test/report",
  "/igcse/lesson",
  "/igcse/practice/attempt",
  "/igcse/practice/custom",
  "/ielts/tutor/redeem",
  "/ielts/redeem",
];

function shouldShowOn(pathname: string): boolean {
  return !HIDE_ON_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export default function GlobalChatBot() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Close the modal automatically on any route change — otherwise the widget
  // would stay open across pages and follow the student into a private area
  // where we hide the button (visually inconsistent).
  useEffect(() => { setIsOpen(false); }, [location]);

  if (!shouldShowOn(location)) return null;

  return (
    <>
      <Suspense fallback={null}>
        <ChatBotButton onClick={() => setIsOpen(true)} />
      </Suspense>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
          >
            <motion.div
              className="w-full max-w-lg h-[600px] max-h-[85vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground">
                <div className="flex items-center gap-3">
                  <motion.img
                    src="/files/migrated/saxLOcubreWkfnzl.png"
                    alt="SpecTa AI"
                    className="w-10 h-10 object-contain"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div>
                    <h3 className="font-semibold">SpecTa AI Assistant</h3>
                    <p className="text-xs text-primary-foreground/80">Online • Ready to help</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-primary-foreground/10 rounded-full transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Suspense fallback={<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTopColor: "#e63946", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /></div>}>
                <ChatBot />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
