import { SEO } from '@/components/SEO';
import { useEffect, useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Sparkles, ArrowRight, ChevronLeft, ChevronRight, Loader2,
  Download, Share2, GraduationCap, MapPin, BookOpen, Users,
  Briefcase, Heart, Star, Zap, Shield, Compass, Coffee,
  Utensils, Music, Sun, Snowflake, TreePine, Globe
} from "lucide-react";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AnimatePresence, motion } from "framer-motion";

// 5 fun visual-tap questions
const PERSONA_QUESTIONS = [
  {
    id: 1,
    question: "Pick your ideal weekend",
    emoji: "🎉",
    options: [
      { text: "Beach party & surfing", icon: "🏖️", value: "beach", color: "from-cyan-400 to-blue-500" },
      { text: "Museum hopping & cafes", icon: "🏛️", value: "culture", color: "from-amber-400 to-orange-500" },
      { text: "Gaming & Netflix", icon: "🎮", value: "gaming", color: "from-violet-400 to-purple-500" },
      { text: "Hiking in nature", icon: "🏔️", value: "nature", color: "from-emerald-400 to-green-500" },
      { text: "Cooking with friends", icon: "👨‍🍳", value: "cooking", color: "from-rose-400 to-pink-500" },
    ],
  },
  {
    id: 2,
    question: "Your go-to comfort food?",
    emoji: "🍜",
    options: [
      { text: "Nasi goreng & satay", icon: "🍛", value: "indonesian", color: "from-red-400 to-rose-500" },
      { text: "Pizza & pasta", icon: "🍕", value: "italian", color: "from-orange-400 to-amber-500" },
      { text: "Sushi & ramen", icon: "🍣", value: "japanese", color: "from-pink-400 to-fuchsia-500" },
      { text: "Dim sum & dumplings", icon: "🥟", value: "chinese", color: "from-yellow-400 to-orange-500" },
      { text: "Burgers & fries", icon: "🍔", value: "western", color: "from-blue-400 to-indigo-500" },
    ],
  },
  {
    id: 3,
    question: "Pick a superpower",
    emoji: "⚡",
    options: [
      { text: "Teleportation", icon: "✨", value: "teleport", color: "from-indigo-400 to-violet-500" },
      { text: "Speak every language", icon: "🗣️", value: "polyglot", color: "from-teal-400 to-cyan-500" },
      { text: "Read minds", icon: "🧠", value: "mindread", color: "from-purple-400 to-pink-500" },
      { text: "Time travel", icon: "⏰", value: "timetravel", color: "from-blue-400 to-sky-500" },
      { text: "Fly anywhere", icon: "🦅", value: "fly", color: "from-amber-400 to-yellow-500" },
    ],
  },
  {
    id: 4,
    question: "Your study style?",
    emoji: "📚",
    options: [
      { text: "Cafe with coffee", icon: "☕", value: "cafe", color: "from-amber-500 to-orange-400" },
      { text: "Library silence", icon: "🤫", value: "library", color: "from-slate-400 to-gray-500" },
      { text: "Group study squad", icon: "👥", value: "group", color: "from-blue-400 to-indigo-500" },
      { text: "Late night grinder", icon: "🌙", value: "nightowl", color: "from-indigo-500 to-purple-600" },
      { text: "Morning person", icon: "🌅", value: "morning", color: "from-orange-400 to-rose-500" },
    ],
  },
  {
    id: 5,
    question: "What scares you most about going abroad?",
    emoji: "😰",
    options: [
      { text: "Being alone", icon: "😔", value: "alone", color: "from-blue-400 to-slate-500" },
      { text: "The food", icon: "🤢", value: "food", color: "from-green-400 to-emerald-500" },
      { text: "The weather", icon: "🥶", value: "weather", color: "from-cyan-400 to-blue-600" },
      { text: "Speaking English", icon: "😅", value: "english", color: "from-amber-400 to-red-400" },
      { text: "Missing family", icon: "🏠", value: "family", color: "from-rose-400 to-pink-500" },
    ],
  },
];

// Color themes for persona cards
const COLOR_THEMES: Record<string, { bg: string; accent: string; light: string; gradient: string }> = {
  rose: { bg: "from-rose-500 to-pink-600", accent: "text-rose-500", light: "bg-rose-50", gradient: "from-rose-100 to-pink-100" },
  amber: { bg: "from-amber-500 to-orange-600", accent: "text-amber-500", light: "bg-amber-50", gradient: "from-amber-100 to-orange-100" },
  emerald: { bg: "from-emerald-500 to-green-600", accent: "text-emerald-500", light: "bg-emerald-50", gradient: "from-emerald-100 to-green-100" },
  blue: { bg: "from-blue-500 to-indigo-600", accent: "text-blue-500", light: "bg-blue-50", gradient: "from-blue-100 to-indigo-100" },
  violet: { bg: "from-violet-500 to-purple-600", accent: "text-violet-500", light: "bg-violet-50", gradient: "from-violet-100 to-purple-100" },
  orange: { bg: "from-orange-500 to-red-500", accent: "text-orange-500", light: "bg-orange-50", gradient: "from-orange-100 to-red-100" },
  cyan: { bg: "from-cyan-500 to-teal-600", accent: "text-cyan-500", light: "bg-cyan-50", gradient: "from-cyan-100 to-teal-100" },
  fuchsia: { bg: "from-fuchsia-500 to-pink-600", accent: "text-fuchsia-500", light: "bg-fuchsia-50", gradient: "from-fuchsia-100 to-pink-100" },
  indigo: { bg: "from-indigo-500 to-blue-600", accent: "text-indigo-500", light: "bg-indigo-50", gradient: "from-indigo-100 to-blue-100" },
  teal: { bg: "from-teal-500 to-emerald-600", accent: "text-teal-500", light: "bg-teal-50", gradient: "from-teal-100 to-emerald-100" },
};

const QUESTION_BG_COLORS = [
  "from-cyan-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
];

type PersonaData = {
  personaName: string;
  emoji: string;
  tagline: string;
  traits: string[];
  idealCountry: string;
  idealCountryFlag: string;
  idealCountryReason: string;
  spiritUniversity: string;
  spiritUniReason: string;
  studyStyle: string;
  socialStyle: string;
  survivalTip: string;
  bestBuddy: string;
  worstEnemy: string;
  packingEssential: string;
  futureHeadline: string;
  colorTheme: string;
};

// Reusable chat modal
function ChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      <SEO
        title="Student Persona Quiz | SpecTa Education"
        description="Discover your student persona and find the perfect study abroad destination. Take our fun personality quiz to match your learning style."
      />
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-red-500 to-rose-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <span className="text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="font-semibold">SpecTa AI Assistant</h3>
                  <p className="text-xs text-white/80">Online • Ready to help</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <span className="text-xl">✕</span>
              </button>
            </div>
            <ChatBot />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Persona() {
  useEffect(() => {
    document.title = "Student Persona Quiz | SpecTa Education";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Discover your student persona with SpecTa Education. Find out what type of international student you are and get tailored advice.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Discover your student persona with SpecTa Education. Find out what type of international student you are and get tailored advice.';
      document.head.appendChild(meta);
    }
  }, []);

  const [phase, setPhase] = useState<"intro" | "questions" | "lead" | "generating" | "result">("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const generateMutation = trpc.persona.generate.useMutation();
  const saveResultMutation = trpc.persona.saveResult.useMutation();

  const handleAnswer = useCallback((questionId: number, value: string) => {
    setSelectedOption(value);
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    // Auto-advance after a short delay
    setTimeout(() => {
      setSelectedOption(null);
      if (currentQ < PERSONA_QUESTIONS.length - 1) {
        setCurrentQ(prev => prev + 1);
      }
    }, 500);
  }, [currentQ]);

  const handlePrev = () => {
    if (currentQ > 0) {
      setSelectedOption(null);
      setCurrentQ(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    setPhase("lead");
  };

  const handleGenerate = async (skipLead = false) => {
    setPhase("generating");

    const formattedAnswers = PERSONA_QUESTIONS.map(q => ({
      questionId: q.id,
      questionText: q.question,
      answer: q.options.find(o => o.value === answers[q.id])?.text || answers[q.id] || "Not answered",
    }));

    try {
      const response = await generateMutation.mutateAsync({ answers: formattedAnswers });
      if (response.success && response.persona) {
        setPersona(response.persona);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);

        // Save result
        await saveResultMutation.mutateAsync({
          studentName: skipLead ? undefined : leadName || undefined,
          studentEmail: skipLead ? undefined : leadEmail || undefined,
          answers: JSON.stringify(formattedAnswers),
          personaName: response.persona.personaName,
          personaData: JSON.stringify(response.persona),
        });
      }
      setPhase("result");
    } catch (error) {
      console.error("Persona generation failed:", error);
      setPhase("result");
    }
  };

  const allAnswered = Object.keys(answers).length === PERSONA_QUESTIONS.length;
  const progress = (Object.keys(answers).length / PERSONA_QUESTIONS.length) * 100;

  // Download persona card as image
  const handleDownload = async () => {
    if (!resultRef.current || !persona) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(resultRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `my-study-abroad-persona-${persona.personaName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  // Confetti particles
  const ConfettiEffect = () => {
    if (!showConfetti) return null;
    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-5%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'][i % 7],
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>
    );
  };

  // INTRO SCREEN
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
        <Navigation />
        <div className="max-w-2xl w-full text-center pt-16">
          {/* Floating character emojis */}
          <div className="relative mb-8">
            <div className="absolute -top-8 left-1/4 text-5xl animate-bounce" style={{ animationDelay: '0s' }}>🎭</div>
            <div className="absolute -top-4 right-1/4 text-4xl animate-bounce" style={{ animationDelay: '0.5s' }}>🌟</div>
            <div className="absolute top-0 left-[15%] text-3xl animate-bounce" style={{ animationDelay: '1s' }}>🎓</div>
            <div className="absolute -top-6 right-[15%] text-4xl animate-bounce" style={{ animationDelay: '1.5s' }}>✨</div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl mt-16">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">30-Second Fun Test</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              My Study Abroad<br />
              <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                Persona
              </span>
            </h1>

            <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
              5 quick taps to reveal your unique study abroad personality! Get a shareable character card.
            </p>

            {/* Example persona cards preview */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {["🧭 The Adventurous Explorer", "📚 The Library Ninja", "🍜 The Foodie Scholar", "🎮 The Midnight Coder", "🌏 The Social Butterfly"].map((p) => (
                <span key={p} className="bg-white/15 rounded-full px-3 py-1.5 text-white/80 text-xs">
                  {p}
                </span>
              ))}
            </div>

            <button
              onClick={() => setPhase("questions")}
              className="group bg-white text-purple-600 font-bold text-lg px-8 py-4 rounded-2xl hover:bg-yellow-300 hover:text-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              Discover My Persona
              <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-white/50 text-sm mt-4">No sign-up required • Share on Instagram</p>
          </div>
        </div>
        <ChatBotButton onClick={() => setIsChatOpen(true)} />
        <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
    );
  }

  // QUESTIONS SCREEN
  if (phase === "questions") {
    const q = PERSONA_QUESTIONS[currentQ];
    const bgColor = QUESTION_BG_COLORS[currentQ];

    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgColor} transition-all duration-700 flex flex-col`}>
        <Navigation />
        {/* Progress bar */}
        <div className="pt-20 px-4">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm">{currentQ + 1} of {PERSONA_QUESTIONS.length}</span>
              <span className="text-white/70 text-sm">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <div className="text-center mb-8">
              <span className="text-6xl mb-4 block">{q.emoji}</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">{q.question}</h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {q.options.map((option) => {
                const isSelected = answers[q.id] === option.value;
                const isJustSelected = selectedOption === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(q.id, option.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                      isSelected
                        ? "bg-white text-gray-800 shadow-lg scale-[1.02]"
                        : "bg-white/15 text-white hover:bg-white/25 hover:scale-[1.01]"
                    } ${isJustSelected ? "animate-pulse" : ""}`}
                  >
                    <span className="text-2xl flex-shrink-0">{option.icon}</span>
                    <span className="font-medium text-left flex-1">{option.text}</span>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={handlePrev}
                className={`flex items-center gap-2 text-white/70 hover:text-white transition-colors ${
                  currentQ === 0 ? "invisible" : ""
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>

              {currentQ === PERSONA_QUESTIONS.length - 1 && allAnswered && (
                <button
                  onClick={handleSubmit}
                  className="bg-white text-gray-800 font-bold text-lg py-3 px-8 rounded-2xl hover:bg-yellow-300 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Reveal My Persona!
                </button>
              )}
            </div>
          </div>
        </div>
        <ChatBotButton onClick={() => setIsChatOpen(true)} />
        <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
    );
  }

  // LEAD CAPTURE SCREEN
  if (phase === "lead") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
        <Navigation />
        <div className="max-w-md w-full pt-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="text-center mb-6">
              <span className="text-5xl mb-3 block">🎭</span>
              <h2 className="text-2xl font-bold text-white mb-2">Almost There!</h2>
              <p className="text-white/70">Enter your details to get personalized study abroad tips based on your persona</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-1">Name</label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-white/15 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white/15 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>

            <button
              onClick={() => handleGenerate(false)}
              className="w-full mt-6 bg-white text-purple-600 font-bold text-lg py-4 rounded-2xl hover:bg-yellow-300 hover:text-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Generate My Persona!
            </button>

            <button
              onClick={() => handleGenerate(true)}
              className="w-full mt-3 text-white/40 hover:text-white/60 text-sm py-2 transition-colors"
            >
              Skip and see results →
            </button>
          </div>
        </div>
        <ChatBotButton onClick={() => setIsChatOpen(true)} />
        <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
    );
  }

  // GENERATING SCREEN
  if (phase === "generating") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
        <Navigation />
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-white/30 animate-ping" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-4 rounded-full border-4 border-white/40 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl animate-spin" style={{ animationDuration: '3s' }}>🎭</span>
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Creating Your Persona...</h2>
          <p className="text-white/70 text-lg">Our AI is crafting your unique study abroad character</p>
          <div className="flex justify-center gap-2 mt-6">
            {["🧭", "📚", "🍜", "🎮", "🌏", "🎭"].map((emoji, i) => (
              <span
                key={i}
                className="text-2xl animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
        <ChatBotButton onClick={() => setIsChatOpen(true)} />
        <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
    );
  }

  // RESULT SCREEN
  const theme = persona ? (COLOR_THEMES[persona.colorTheme] || COLOR_THEMES.violet) : COLOR_THEMES.violet;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <ConfettiEffect />

      {persona && (
        <>
          {/* Hero persona card */}
          <div className={`bg-gradient-to-br ${theme.bg} pt-24 pb-16 px-4`}>
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span className="text-white/90 text-sm font-medium">Your Study Abroad Persona</span>
              </div>

              <div className="text-7xl mb-4">{persona.emoji}</div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">{persona.personaName}</h1>
              <p className="text-white/90 text-xl max-w-lg mx-auto italic">"{persona.tagline}"</p>

              {/* Traits */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {persona.traits.map((trait, i) => (
                  <span key={i} className="bg-white/20 backdrop-blur rounded-full px-4 py-1.5 text-white text-sm font-medium">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Shareable Card (for download) */}
          <div className="max-w-2xl mx-auto px-4 -mt-8">
            <div
              ref={resultRef}
              className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
            >
              {/* Card header */}
              <div className={`bg-gradient-to-r ${theme.bg} p-6 text-center`}>
                <div className="text-5xl mb-2">{persona.emoji}</div>
                <h2 className="text-2xl font-bold text-white">{persona.personaName}</h2>
                <p className="text-white/80 text-sm italic">"{persona.tagline}"</p>
                <div className="flex justify-center gap-2 mt-3">
                  {persona.traits.map((trait, i) => (
                    <span key={i} className="bg-white/20 rounded-full px-3 py-1 text-white text-xs">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card body */}
              <div className="p-6 space-y-5">
                {/* Ideal country */}
                <div className={`${theme.light} rounded-2xl p-4`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{persona.idealCountryFlag}</span>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Your Ideal Country</p>
                      <p className="font-bold text-gray-800 text-lg">{persona.idealCountry}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">{persona.idealCountryReason}</p>
                </div>

                {/* Spirit university */}
                <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Spirit University</p>
                    <p className="font-bold text-gray-800">{persona.spiritUniversity}</p>
                    <p className="text-gray-600 text-sm">{persona.spiritUniReason}</p>
                  </div>
                </div>

                {/* Study & Social style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Study Style</p>
                    </div>
                    <p className="text-gray-700 text-sm">{persona.studyStyle}</p>
                  </div>
                  <div className="bg-pink-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-pink-500" />
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Social Style</p>
                    </div>
                    <p className="text-gray-700 text-sm">{persona.socialStyle}</p>
                  </div>
                </div>

                {/* Survival tip */}
                <div className="bg-amber-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-amber-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Survival Tip</p>
                  </div>
                  <p className="text-gray-700 text-sm">{persona.survivalTip}</p>
                </div>

                {/* Best buddy & worst enemy */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Best Buddy</p>
                    <p className="font-bold text-emerald-700 text-sm">{persona.bestBuddy}</p>
                  </div>
                  <div className="bg-red-50 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Worst Enemy</p>
                    <p className="font-bold text-red-700 text-sm">{persona.worstEnemy}</p>
                  </div>
                </div>

                {/* Packing essential */}
                <div className="bg-violet-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-violet-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Must-Pack Item</p>
                  </div>
                  <p className="text-gray-700 text-sm">{persona.packingEssential}</p>
                </div>

                {/* Future headline */}
                <div className={`bg-gradient-to-r ${theme.gradient} rounded-2xl p-4 border border-gray-100`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Your Future Headline</p>
                  </div>
                  <p className="text-gray-800 font-semibold text-sm italic">"{persona.futureHeadline}"</p>
                </div>

                {/* SpecTa branding */}
                <div className="text-center pt-2 border-t border-gray-100">
                  <p className="text-gray-400 text-xs">Generated by SpecTa Education • spectaeducation.com/play</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <button
                onClick={handleDownload}
                className={`flex items-center gap-2 bg-gradient-to-r ${theme.bg} text-white font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-all hover:scale-105 active:scale-95`}
              >
                <Download className="w-5 h-5" />
                Download Card
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `I'm "${persona.personaName}" - My Study Abroad Persona!`,
                      text: `${persona.tagline} - Find your persona at spectaeducation.com/play`,
                      url: window.location.origin + "/play",
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(
                      `I'm "${persona.personaName}" - ${persona.tagline}! Find your Study Abroad Persona at ${window.location.origin}/play`
                    );
                    alert("Link copied to clipboard!");
                  }
                }}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>

            {/* Cross-promotion */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Want to Know Your Ideal Country?</h3>
              <p className="text-white/80 mb-6">Take our 10-question Country Quiz for a detailed destination match!</p>
              <Link href="/play/quiz">
                <button className="bg-white text-indigo-600 font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 hover:text-indigo-700 transition-all hover:scale-105 active:scale-95">
                  Take the Country Quiz →
                </button>
              </Link>
            </div>

            {/* CTAs */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to Start Your Journey?</h3>
              <p className="text-gray-500 mb-6">Our counselors can help you apply to {persona.spiritUniversity} and more!</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/book"
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-all"
                >
                  Book Free Consultation
                </Link>
                <Link
                  href={`/destinations/${persona.idealCountry.toLowerCase().replace(/\s+/g, '-')}`}
                  className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Explore {persona.idealCountry}
                </Link>
                <a
                  href="https://wa.me/6281287878055?text=Hi%20SpecTa!%20I%20just%20got%20my%20Study%20Abroad%20Persona%20and%20I'd%20like%20to%20know%20more!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-600 transition-all"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            {/* Retake */}
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  setPhase("intro");
                  setCurrentQ(0);
                  setAnswers({});
                  setPersona(null);
                  setLeadName("");
                  setLeadEmail("");
                }}
                className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
              >
                ← Try again with different answers
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fallback if no persona */}
      {!persona && phase === "result" && (
        <div className="min-h-screen flex items-center justify-center p-4 pt-20">
          <div className="text-center">
            <span className="text-6xl mb-4 block">😅</span>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
            <p className="text-gray-500 mb-6">Our AI had a hiccup. Let's try again!</p>
            <button
              onClick={() => {
                setPhase("intro");
                setCurrentQ(0);
                setAnswers({});
              }}
              className="bg-purple-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-purple-700 transition-all"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      <Footer />
      <ChatBotButton onClick={() => setIsChatOpen(true)} />
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
