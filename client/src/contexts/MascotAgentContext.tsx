import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

// Mascot emotion states
export type MascotEmotion = "neutral" | "happy" | "excited" | "curious" | "supportive" | "celebrating" | "thinking" | "waving";

// Mascot action types
export type MascotAction = 
  | { type: "speak"; message: string; emotion?: MascotEmotion }
  | { type: "gesture"; gesture: "point" | "wave" | "celebrate" | "think" | "nod" }
  | { type: "highlight"; elementId: string }
  | { type: "navigate"; path: string };

// User interaction tracking
interface UserContext {
  visitCount: number;
  lastVisit: number;
  pagesVisited: string[];
  chatStarted: boolean;
  documentsUploaded: number;
  idleTime: number;
  currentPage: string;
  hasInteractedWithMascot: boolean;
  preferredCountry?: string;
  studyLevel?: string;
}

// Proactive tips based on context
interface ProactiveTip {
  id: string;
  trigger: (ctx: UserContext) => boolean;
  message: string;
  emotion: MascotEmotion;
  priority: number;
  cooldown: number; // ms before showing again
  lastShown?: number;
}

interface MascotAgentContextType {
  // State
  emotion: MascotEmotion;
  isVisible: boolean;
  isSpeaking: boolean;
  currentMessage: string;
  showBubble: boolean;
  
  // Actions
  setEmotion: (emotion: MascotEmotion) => void;
  speak: (message: string, emotion?: MascotEmotion, duration?: number) => void;
  performAction: (action: MascotAction) => void;
  hideMascot: () => void;
  showMascot: () => void;
  
  // User context
  userContext: UserContext;
  updateUserContext: (updates: Partial<UserContext>) => void;
  
  // Proactive features
  triggerProactiveTip: () => void;
  dismissCurrentTip: () => void;
}

const MascotAgentContext = createContext<MascotAgentContextType | null>(null);

// Proactive tips configuration
const proactiveTips: ProactiveTip[] = [
  {
    id: "welcome-new",
    trigger: (ctx) => ctx.visitCount === 1 && !ctx.hasInteractedWithMascot,
    message: "Welcome to SpecTa Education! 🎓 I'm here to help you explore study abroad opportunities. Click me anytime to chat!",
    emotion: "excited",
    priority: 10,
    cooldown: 0
  },
  {
    id: "welcome-returning",
    trigger: (ctx) => ctx.visitCount > 1 && !ctx.hasInteractedWithMascot && Date.now() - ctx.lastVisit > 86400000,
    message: "Welcome back! 👋 Ready to continue exploring your study abroad journey?",
    emotion: "happy",
    priority: 9,
    cooldown: 86400000
  },
  {
    id: "idle-prompt",
    trigger: (ctx) => ctx.idleTime > 30000 && !ctx.chatStarted,
    message: "Looking for something specific? I can help you find universities, scholarships, or answer any questions about studying abroad!",
    emotion: "curious",
    priority: 5,
    cooldown: 60000
  },
  {
    id: "destinations-tip",
    trigger: (ctx) => ctx.currentPage === "/destinations" && ctx.idleTime > 10000,
    message: "Each country has unique opportunities! Would you like me to help you compare destinations based on your preferences?",
    emotion: "supportive",
    priority: 6,
    cooldown: 120000
  },
  {
    id: "ielts-tip",
    trigger: (ctx) => ctx.currentPage === "/ielts" && ctx.idleTime > 10000,
    message: "IELTS preparation is key to your success! Our experienced teachers can help you achieve your target score. Want to know more?",
    emotion: "supportive",
    priority: 6,
    cooldown: 120000
  },
  {
    id: "contact-encourage",
    trigger: (ctx) => ctx.currentPage === "/contact" && !ctx.chatStarted,
    message: "Great that you're reaching out! You can also chat with me right now for instant answers, or fill out the form for a personal consultation.",
    emotion: "happy",
    priority: 7,
    cooldown: 60000
  },
  {
    id: "document-reminder",
    trigger: (ctx) => ctx.chatStarted && ctx.documentsUploaded === 0 && ctx.idleTime > 45000,
    message: "Don't forget - you can upload your documents (passport, transcripts) directly in our chat to speed up your application!",
    emotion: "supportive",
    priority: 4,
    cooldown: 300000
  },
  {
    id: "explore-more",
    trigger: (ctx) => ctx.pagesVisited.length === 1 && ctx.idleTime > 20000,
    message: "There's so much to explore! Check out our destinations, IELTS programs, or read success stories from our students.",
    emotion: "curious",
    priority: 3,
    cooldown: 180000
  }
];

// Page-specific greetings
const pageGreetings: Record<string, { message: string; emotion: MascotEmotion }> = {
  "/": { message: "Welcome! Ready to start your study abroad journey?", emotion: "excited" },
  "/about": { message: "Learn about our team and how we've helped thousands of students!", emotion: "happy" },
  "/ielts": { message: "IELTS preparation is crucial! Let me help you get started.", emotion: "supportive" },
  "/destinations": { message: "So many amazing countries to choose from! Which one interests you?", emotion: "curious" },
  "/articles": { message: "Great resources here! These articles can help you prepare.", emotion: "happy" },
  "/contact": { message: "Ready to take the next step? I'm here to help!", emotion: "excited" }
};

export function MascotAgentProvider({ children }: { children: ReactNode }) {
  // Core state
  const [emotion, setEmotion] = useState<MascotEmotion>("neutral");
  const [isVisible, setIsVisible] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  
  // User context from localStorage
  const [userContext, setUserContext] = useState<UserContext>(() => {
    if (typeof window === "undefined") {
      return {
        visitCount: 1,
        lastVisit: Date.now(),
        pagesVisited: ["/"],
        chatStarted: false,
        documentsUploaded: 0,
        idleTime: 0,
        currentPage: "/",
        hasInteractedWithMascot: false
      };
    }
    
    const stored = localStorage.getItem("specta-user-context");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        visitCount: parsed.visitCount + 1,
        lastVisit: Date.now(),
        idleTime: 0,
        currentPage: window.location.pathname
      };
    }
    
    return {
      visitCount: 1,
      lastVisit: Date.now(),
      pagesVisited: [window.location.pathname],
      chatStarted: false,
      documentsUploaded: 0,
      idleTime: 0,
      currentPage: window.location.pathname,
      hasInteractedWithMascot: false
    };
  });
  
  // Refs for timers
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tipCooldownsRef = useRef<Record<string, number>>({});
  
  // Save user context to localStorage
  useEffect(() => {
    localStorage.setItem("specta-user-context", JSON.stringify(userContext));
  }, [userContext]);
  
  // Track idle time
  useEffect(() => {
    const resetIdle = () => {
      setUserContext(prev => ({ ...prev, idleTime: 0 }));
    };
    
    const incrementIdle = () => {
      setUserContext(prev => ({ ...prev, idleTime: prev.idleTime + 1000 }));
    };
    
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);
    window.addEventListener("click", resetIdle);
    window.addEventListener("scroll", resetIdle);
    
    idleTimerRef.current = setInterval(incrementIdle, 1000);
    
    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("click", resetIdle);
      window.removeEventListener("scroll", resetIdle);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, []);
  
  // Track page changes
  useEffect(() => {
    const handlePageChange = () => {
      const currentPath = window.location.pathname;
      setUserContext(prev => ({
        ...prev,
        currentPage: currentPath,
        pagesVisited: prev.pagesVisited.includes(currentPath) 
          ? prev.pagesVisited 
          : [...prev.pagesVisited, currentPath],
        idleTime: 0
      }));
      
      // Show page-specific greeting
      const greeting = pageGreetings[currentPath];
      if (greeting && !userContext.hasInteractedWithMascot) {
        setTimeout(() => {
          speak(greeting.message, greeting.emotion, 5000);
        }, 1500);
      }
    };
    
    // Initial page greeting for new visitors
    if (userContext.visitCount === 1 && !userContext.hasInteractedWithMascot) {
      setTimeout(() => {
        speak("Hi there! 👋 I'm SpecTa, your study abroad assistant. Click me to chat!", "waving", 6000);
      }, 2000);
    }
    
    window.addEventListener("popstate", handlePageChange);
    return () => window.removeEventListener("popstate", handlePageChange);
  }, [userContext.visitCount, userContext.hasInteractedWithMascot]);
  
  // Speak function with text-to-speech
  const speak = useCallback((message: string, newEmotion: MascotEmotion = "neutral", duration: number = 4000) => {
    // Clear any existing speech timer
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
    }
    
    setCurrentMessage(message);
    setEmotion(newEmotion);
    setShowBubble(true);
    setIsSpeaking(true);
    
    // Use Web Speech API if available and voice is enabled
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const voiceEnabled = localStorage.getItem("specta-voice-enabled") === "true";
      if (voiceEnabled) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message.replace(/[🎓👋]/g, ""));
        utterance.rate = 1;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
          v.name.includes("Google") || v.name.includes("Female") || v.name.includes("Samantha")
        );
        if (preferredVoice) utterance.voice = preferredVoice;
        
        window.speechSynthesis.speak(utterance);
      }
    }
    
    // Auto-hide bubble after duration
    speechTimerRef.current = setTimeout(() => {
      setShowBubble(false);
      setIsSpeaking(false);
      setEmotion("neutral");
    }, duration);
  }, []);
  
  // Perform mascot action
  const performAction = useCallback((action: MascotAction) => {
    switch (action.type) {
      case "speak":
        speak(action.message, action.emotion);
        break;
      case "gesture":
        const gestureEmotions: Record<string, MascotEmotion> = {
          point: "curious",
          wave: "waving",
          celebrate: "celebrating",
          think: "thinking",
          nod: "happy"
        };
        setEmotion(gestureEmotions[action.gesture] || "neutral");
        setTimeout(() => setEmotion("neutral"), 2000);
        break;
      case "highlight":
        // Could add visual highlighting of elements
        const element = document.getElementById(action.elementId);
        if (element) {
          element.classList.add("mascot-highlight");
          setTimeout(() => element.classList.remove("mascot-highlight"), 3000);
        }
        break;
      case "navigate":
        window.location.href = action.path;
        break;
    }
  }, [speak]);
  
  // Update user context
  const updateUserContext = useCallback((updates: Partial<UserContext>) => {
    setUserContext(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Trigger proactive tip based on current context
  const triggerProactiveTip = useCallback(() => {
    const now = Date.now();
    
    // Find applicable tips sorted by priority
    const applicableTips = proactiveTips
      .filter(tip => {
        const lastShown = tipCooldownsRef.current[tip.id] || 0;
        return tip.trigger(userContext) && (now - lastShown > tip.cooldown);
      })
      .sort((a, b) => b.priority - a.priority);
    
    if (applicableTips.length > 0) {
      const tip = applicableTips[0];
      tipCooldownsRef.current[tip.id] = now;
      speak(tip.message, tip.emotion, 6000);
    }
  }, [userContext, speak]);
  
  // Dismiss current tip
  const dismissCurrentTip = useCallback(() => {
    setShowBubble(false);
    setIsSpeaking(false);
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);
  
  // Check for proactive tips periodically
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (!showBubble && !isSpeaking && userContext.idleTime > 15000) {
        triggerProactiveTip();
      }
    }, 5000);
    
    return () => clearInterval(checkInterval);
  }, [showBubble, isSpeaking, userContext.idleTime, triggerProactiveTip]);
  
  const value: MascotAgentContextType = {
    emotion,
    isVisible,
    isSpeaking,
    currentMessage,
    showBubble,
    setEmotion,
    speak,
    performAction,
    hideMascot: () => setIsVisible(false),
    showMascot: () => setIsVisible(true),
    userContext,
    updateUserContext,
    triggerProactiveTip,
    dismissCurrentTip
  };
  
  return (
    <MascotAgentContext.Provider value={value}>
      {children}
    </MascotAgentContext.Provider>
  );
}

export function useMascotAgent() {
  const context = useContext(MascotAgentContext);
  if (!context) {
    throw new Error("useMascotAgent must be used within a MascotAgentProvider");
  }
  return context;
}
