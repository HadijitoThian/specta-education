import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { 
  Sparkles, ChevronRight, ChevronLeft, Globe, GraduationCap, 
  DollarSign, MapPin, BookOpen, Trophy, Download, Share2,
  Sun, Cloud, Snowflake, TreePine, Waves, Building2, Music,
  Utensils, Briefcase, Heart, Users, Plane, Star, Check,
  ArrowRight, Loader2
} from "lucide-react";

// Quiz questions data
const QUESTIONS = [
  {
    id: 1,
    question: "What's your ideal weekend?",
    emoji: "🎉",
    options: [
      { text: "Beach & surfing", icon: "🏖️", value: "beach" },
      { text: "Museums & history", icon: "🏛️", value: "culture" },
      { text: "Shopping & nightlife", icon: "🛍️", value: "nightlife" },
      { text: "Nature & hiking", icon: "🏔️", value: "nature" },
      { text: "Food adventures", icon: "🍜", value: "food" },
    ],
  },
  {
    id: 2,
    question: "Pick your dream weather",
    emoji: "☀️",
    options: [
      { text: "Sunny & warm all year", icon: "☀️", value: "sunny" },
      { text: "Four distinct seasons", icon: "🍂", value: "seasons" },
      { text: "Cool & rainy vibes", icon: "🌧️", value: "rainy" },
      { text: "Tropical & humid", icon: "🌴", value: "tropical" },
      { text: "Snowy winters", icon: "❄️", value: "snowy" },
    ],
  },
  {
    id: 3,
    question: "What matters most in a city?",
    emoji: "🏙️",
    options: [
      { text: "Safety & cleanliness", icon: "🛡️", value: "safety" },
      { text: "Affordable living", icon: "💰", value: "affordable" },
      { text: "Vibrant nightlife", icon: "🎶", value: "nightlife" },
      { text: "Rich culture & arts", icon: "🎭", value: "culture" },
      { text: "Job opportunities", icon: "💼", value: "jobs" },
    ],
  },
  {
    id: 4,
    question: "Your budget for tuition per year?",
    emoji: "💸",
    options: [
      { text: "Under $5,000", icon: "💵", value: "under5k" },
      { text: "$5,000 – $15,000", icon: "💰", value: "5k-15k" },
      { text: "$15,000 – $30,000", icon: "💎", value: "15k-30k" },
      { text: "$30,000+", icon: "👑", value: "30k+" },
    ],
  },
  {
    id: 5,
    question: "How important is being near other Indonesian students?",
    emoji: "🇮🇩",
    options: [
      { text: "Very important!", icon: "🤝", value: "very" },
      { text: "Nice to have", icon: "👋", value: "nice" },
      { text: "Don't really mind", icon: "🤷", value: "neutral" },
      { text: "Prefer full diversity", icon: "🌍", value: "diverse" },
    ],
  },
  {
    id: 6,
    question: "What do you want to study?",
    emoji: "📚",
    options: [
      { text: "Business & Management", icon: "📊", value: "business" },
      { text: "Engineering & Tech", icon: "⚙️", value: "engineering" },
      { text: "Arts & Design", icon: "🎨", value: "arts" },
      { text: "IT & Computer Science", icon: "💻", value: "it" },
      { text: "Medicine & Health", icon: "🏥", value: "medicine" },
      { text: "Social Sciences", icon: "🌍", value: "social_sciences" },
    ],
  },
  {
    id: 7,
    question: "Pick a cuisine you'd love to eat daily",
    emoji: "🍽️",
    options: [
      { text: "Fish & chips", icon: "🐟", value: "british" },
      { text: "Burgers & BBQ", icon: "🍔", value: "american" },
      { text: "Dim sum & noodles", icon: "🥟", value: "chinese" },
      { text: "Pasta & pizza", icon: "🍝", value: "italian" },
      { text: "Nasi lemak & satay", icon: "🍛", value: "asian" },
    ],
  },
  {
    id: 8,
    question: "Your IELTS score (or expected)?",
    emoji: "📝",
    options: [
      { text: "Below 5.5", icon: "📖", value: "below5.5" },
      { text: "5.5 – 6.0", icon: "📗", value: "5.5-6.0" },
      { text: "6.0 – 6.5", icon: "📘", value: "6.0-6.5" },
      { text: "6.5+", icon: "📕", value: "6.5+" },
      { text: "Haven't taken it yet", icon: "❓", value: "none" },
    ],
  },
  {
    id: 9,
    question: "After graduation, you want to...",
    emoji: "🎓",
    options: [
      { text: "Work abroad", icon: "🌏", value: "work-abroad" },
      { text: "Return to Indonesia", icon: "🏠", value: "return" },
      { text: "Start a business", icon: "🚀", value: "business" },
      { text: "Continue to Masters", icon: "🎓", value: "masters" },
    ],
  },
  {
    id: 10,
    question: "Pick your vibe",
    emoji: "✨",
    options: [
      { text: "Big city energy", icon: "🏙️", value: "city" },
      { text: "Quiet campus town", icon: "🌿", value: "quiet" },
      { text: "Cultural hub", icon: "🎭", value: "cultural" },
      { text: "Coastal living", icon: "🏖️", value: "coastal" },
    ],
  },
];

// Color palette for each question
const QUESTION_COLORS = [
  { bg: "from-rose-500 to-orange-400", card: "bg-rose-50", accent: "text-rose-600", border: "border-rose-200", selected: "bg-rose-500" },
  { bg: "from-amber-400 to-yellow-300", card: "bg-amber-50", accent: "text-amber-600", border: "border-amber-200", selected: "bg-amber-500" },
  { bg: "from-emerald-500 to-teal-400", card: "bg-emerald-50", accent: "text-emerald-600", border: "border-emerald-200", selected: "bg-emerald-500" },
  { bg: "from-blue-500 to-cyan-400", card: "bg-blue-50", accent: "text-blue-600", border: "border-blue-200", selected: "bg-blue-500" },
  { bg: "from-red-500 to-rose-400", card: "bg-red-50", accent: "text-red-600", border: "border-red-200", selected: "bg-red-500" },
  { bg: "from-violet-500 to-purple-400", card: "bg-violet-50", accent: "text-violet-600", border: "border-violet-200", selected: "bg-violet-500" },
  { bg: "from-orange-500 to-amber-400", card: "bg-orange-50", accent: "text-orange-600", border: "border-orange-200", selected: "bg-orange-500" },
  { bg: "from-sky-500 to-blue-400", card: "bg-sky-50", accent: "text-sky-600", border: "border-sky-200", selected: "bg-sky-500" },
  { bg: "from-fuchsia-500 to-pink-400", card: "bg-fuchsia-50", accent: "text-fuchsia-600", border: "border-fuchsia-200", selected: "bg-fuchsia-500" },
  { bg: "from-indigo-500 to-violet-400", card: "bg-indigo-50", accent: "text-indigo-600", border: "border-indigo-200", selected: "bg-indigo-500" },
];

// Match percentage color
function getMatchColor(pct: number) {
  if (pct >= 85) return "text-emerald-500";
  if (pct >= 70) return "text-blue-500";
  if (pct >= 60) return "text-amber-500";
  return "text-gray-500";
}

function getMatchBg(pct: number) {
  if (pct >= 85) return "from-emerald-500 to-teal-400";
  if (pct >= 70) return "from-blue-500 to-cyan-400";
  if (pct >= 60) return "from-amber-500 to-yellow-400";
  return "from-gray-400 to-gray-300";
}

type CountryResult = {
  country: string;
  flag: string;
  matchPercentage: number;
  tagline: string;
  reasons: string[];
  universities: { name: string; program: string; tuitionRange: string }[];
  monthlyCost: string;
  popularMajors: string[];
  funFact: string;
};

export default function Quiz() {
  const [phase, setPhase] = useState<"intro" | "quiz" | "lead" | "analyzing" | "results">("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [animDir, setAnimDir] = useState<"left" | "right">("right");
  const [results, setResults] = useState<CountryResult[]>([]);
  const [expandedCountry, setExpandedCountry] = useState<number | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const analyzeMutation = trpc.quiz.analyze.useMutation();
  const saveResultMutation = trpc.quiz.saveResult.useMutation();

  const handleAnswer = useCallback((questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    // Auto-advance after a short delay
    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setAnimDir("right");
        setCurrentQ(prev => prev + 1);
      }
    }, 400);
  }, [currentQ]);

  const handlePrev = () => {
    if (currentQ > 0) {
      setAnimDir("left");
      setCurrentQ(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentQ < QUESTIONS.length - 1 && answers[QUESTIONS[currentQ].id]) {
      setAnimDir("right");
      setCurrentQ(prev => prev + 1);
    }
  };

  const handleSubmitQuiz = () => {
    setPhase("lead");
  };

  const handleAnalyze = async (skipLead = false) => {
    setPhase("analyzing");

    const formattedAnswers = QUESTIONS.map(q => ({
      questionId: q.id,
      questionText: q.question,
      answer: q.options.find(o => o.value === answers[q.id])?.text || answers[q.id] || "Not answered",
    }));

    try {
      const response = await analyzeMutation.mutateAsync({ answers: formattedAnswers });
      if (response.success && response.results.length > 0) {
        setResults(response.results);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);

        // Save result
        await saveResultMutation.mutateAsync({
          studentName: skipLead ? undefined : leadName || undefined,
          studentEmail: skipLead ? undefined : leadEmail || undefined,
          studentPhone: skipLead ? undefined : leadPhone || undefined,
          answers: JSON.stringify(formattedAnswers),
          matchedCountries: JSON.stringify(response.results),
          topMatch: response.results[0].country,
        });
      }
      setPhase("results");
    } catch (error) {
      console.error("Quiz analysis failed:", error);
      setPhase("results");
    }
  };

  const allAnswered = Object.keys(answers).length === QUESTIONS.length;
  const progress = (Object.keys(answers).length / QUESTIONS.length) * 100;
  const colors = QUESTION_COLORS[currentQ];

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          {/* Floating emojis */}
          <div className="relative mb-8">
            <div className="absolute -top-8 left-1/4 text-5xl animate-bounce" style={{ animationDelay: '0s' }}>🌏</div>
            <div className="absolute -top-4 right-1/4 text-4xl animate-bounce" style={{ animationDelay: '0.5s' }}>✈️</div>
            <div className="absolute top-0 left-1/6 text-3xl animate-bounce" style={{ animationDelay: '1s' }}>🎓</div>
            <div className="absolute -top-6 right-1/6 text-4xl animate-bounce" style={{ animationDelay: '1.5s' }}>🌟</div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl mt-16">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">2-Minute Fun Quiz</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Which Country<br />
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Fits You?
              </span>
            </h1>

            <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
              Answer 10 fun questions and our AI will match you with your perfect study abroad destination!
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {["🇦🇺 Australia", "🇬🇧 UK", "🇺🇸 USA", "🇨🇦 Canada", "🇨🇳 China", "🇲🇾 Malaysia", "🇸🇬 Singapore", "🇮🇪 Ireland", "🇳🇱 Netherlands", "🇳🇿 New Zealand"].map((c) => (
                <span key={c} className="bg-white/15 rounded-full px-3 py-1 text-white/80 text-sm">
                  {c}
                </span>
              ))}
            </div>

            <button
              onClick={() => setPhase("quiz")}
              className="group bg-white text-indigo-600 font-bold text-lg px-8 py-4 rounded-2xl hover:bg-yellow-300 hover:text-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              Start the Quiz
              <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-white/50 text-sm mt-4">No sign-up required • Results in seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // QUIZ QUESTIONS SCREEN
  if (phase === "quiz") {
    const q = QUESTIONS[currentQ];
    const isAnswered = !!answers[q.id];

    return (
      <div className={`min-h-screen bg-gradient-to-br ${colors.bg} transition-all duration-700 flex flex-col`}>
        {/* Progress bar */}
        <div className="w-full bg-black/10 h-2">
          <div
            className="h-full bg-white rounded-r-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4">
          <button
            onClick={handlePrev}
            disabled={currentQ === 0}
            className="flex items-center gap-1 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Back</span>
          </button>
          <span className="text-white/80 font-medium text-sm">
            {currentQ + 1} of {QUESTIONS.length}
          </span>
          <button
            onClick={handleNext}
            disabled={!isAnswered || currentQ === QUESTIONS.length - 1}
            className="flex items-center gap-1 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
          >
            <span className="text-sm hidden sm:inline">Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Question card */}
        <div className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="max-w-xl w-full">
            {/* Question */}
            <div className="text-center mb-8" key={q.id}>
              <span className="text-6xl mb-4 block animate-bounce">{q.emoji}</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {q.question}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                const isSelected = answers[q.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(q.id, opt.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left group
                      ${isSelected
                        ? "bg-white shadow-lg scale-[1.02]"
                        : "bg-white/15 hover:bg-white/25 hover:scale-[1.01]"
                      }`}
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                    <span className={`font-medium text-lg ${isSelected ? "text-gray-800" : "text-white"}`}>
                      {opt.text}
                    </span>
                    {isSelected && (
                      <Check className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submit button (only on last question) */}
            {currentQ === QUESTIONS.length - 1 && allAnswered && (
              <button
                onClick={handleSubmitQuiz}
                className="w-full mt-6 bg-white text-gray-800 font-bold text-lg py-4 rounded-2xl hover:bg-yellow-300 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                See My Results!
              </button>
            )}

            {/* Quick navigation dots */}
            <div className="flex justify-center gap-2 mt-6">
              {QUESTIONS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (answers[QUESTIONS[idx].id] || idx <= currentQ) {
                      setAnimDir(idx > currentQ ? "right" : "left");
                      setCurrentQ(idx);
                    }
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentQ
                      ? "bg-white w-8"
                      : answers[QUESTIONS[idx].id]
                      ? "bg-white/70"
                      : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LEAD CAPTURE SCREEN
  if (phase === "lead") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <span className="text-5xl mb-3 block">🎯</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Almost There!</h2>
              <p className="text-gray-500">
                Enter your details to save your results and get personalized university recommendations from our counselors.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="e.g., Sarah"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="sarah@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="+62 812 3456 7890"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <button
              onClick={() => handleAnalyze(false)}
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              <Sparkles className="inline-block w-5 h-5 mr-2" />
              Reveal My Results!
            </button>

            <button
              onClick={() => handleAnalyze(true)}
              className="w-full mt-3 text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors"
            >
              Skip and see results →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ANALYZING SCREEN
  if (phase === "analyzing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-white/30 animate-ping" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-4 rounded-full border-4 border-white/40 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe className="w-16 h-16 text-white animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Analyzing Your Answers...</h2>
          <p className="text-white/70 text-lg">Our AI is matching you with the perfect destination</p>
          <div className="flex justify-center gap-1 mt-6">
            {["🇦🇺", "🇬🇧", "🇺🇸", "🇨🇦", "🇨🇳", "🇲🇾"].map((flag, i) => (
              <span
                key={i}
                className="text-2xl animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // RESULTS SCREEN
  return (
    <div className="min-h-screen bg-gray-50" ref={resultRef}>
      <ConfettiEffect />

      {/* Hero result */}
      {results.length > 0 && (
        <div className={`bg-gradient-to-br ${getMatchBg(results[0].matchPercentage)} py-16 px-4`}>
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">Your #1 Match</span>
            </div>

            <div className="text-7xl mb-4">{results[0].flag}</div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{results[0].country}</h1>
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-6 py-2 mb-4">
              <span className="text-white font-bold text-2xl">{results[0].matchPercentage}%</span>
              <span className="text-white/80">match</span>
            </div>
            <p className="text-white/90 text-xl max-w-lg mx-auto">{results[0].tagline}</p>

            {/* Fun fact */}
            <div className="mt-6 bg-white/15 backdrop-blur rounded-2xl p-4 max-w-md mx-auto">
              <p className="text-white/80 text-sm">
                <Star className="inline-block w-4 h-4 mr-1 text-yellow-300" />
                <strong>Fun fact:</strong> {results[0].funFact}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All results */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Your Top 5 Matches</h2>

        <div className="space-y-4">
          {results.map((country, idx) => (
            <div
              key={country.country}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md ${
                expandedCountry === idx ? "ring-2 ring-indigo-200" : ""
              }`}
            >
              {/* Country header */}
              <button
                onClick={() => setExpandedCountry(expandedCountry === idx ? null : idx)}
                className="w-full flex items-center gap-4 p-5 text-left"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{country.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      {idx === 0 && (
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          #1 MATCH
                        </span>
                      )}
                      <h3 className="font-bold text-gray-800 text-lg">{country.country}</h3>
                    </div>
                    <p className="text-gray-500 text-sm">{country.tagline}</p>
                  </div>
                </div>

                {/* Match percentage circle */}
                <div className="flex-shrink-0 text-center">
                  <div className={`text-2xl font-bold ${getMatchColor(country.matchPercentage)}`}>
                    {country.matchPercentage}%
                  </div>
                  <div className="text-xs text-gray-400">match</div>
                </div>

                <ChevronRight
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${
                    expandedCountry === idx ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Expanded details */}
              {expandedCountry === idx && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2">
                  {/* Reasons */}
                  <div className="mb-5">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      Why it fits you
                    </h4>
                    <div className="space-y-2">
                      {country.reasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 text-sm">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Universities */}
                  <div className="mb-5">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-500" />
                      Recommended Universities
                    </h4>
                    <div className="grid gap-2">
                      {country.universities.map((uni, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{uni.name}</p>
                            <p className="text-gray-500 text-xs">{uni.program}</p>
                          </div>
                          <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-lg">{uni.tuitionRange}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <DollarSign className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Monthly Cost</p>
                      <p className="font-semibold text-gray-800 text-sm">{country.monthlyCost}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 text-center">
                      <BookOpen className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Popular Majors</p>
                      <p className="font-semibold text-gray-800 text-sm">{country.popularMajors.slice(0, 2).join(", ")}</p>
                    </div>
                  </div>

                  {/* Fun fact */}
                  <div className="bg-yellow-50 rounded-xl p-3 mb-4">
                    <p className="text-sm text-gray-600">
                      <Star className="inline-block w-4 h-4 mr-1 text-yellow-500" />
                      <strong>Fun fact:</strong> {country.funFact}
                    </p>
                  </div>

                  {/* CTAs */}
                  <div className="flex gap-2">
                    <Link
                      href={`/destinations/${country.country.toLowerCase().replace(/\s+/g, '-')}`}
                      className="flex-1 bg-indigo-600 text-white text-center py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Explore {country.country}
                    </Link>
                    <Link
                      href="/book"
                      className="flex-1 bg-gray-100 text-gray-700 text-center py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Book Consultation
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTAs */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-2">Ready to Start Your Journey?</h3>
            <p className="text-white/80 mb-6">Our counselors can help you apply to your top-matched universities</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/apply"
                className="bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-yellow-300 hover:text-indigo-700 transition-all"
              >
                Quick Apply Now
              </Link>
              <Link
                href="/book"
                className="bg-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
              >
                Book Free Consultation
              </Link>
              <a
                href="https://wa.me/6281287878055?text=Hi%20SpecTa!%20I%20just%20took%20the%20Country%20Quiz%20and%20I'd%20like%20to%20know%20more!"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-600 transition-all"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Retake quiz */}
        <div className="text-center mt-8">
          <button
            onClick={() => {
              setPhase("intro");
              setCurrentQ(0);
              setAnswers({});
              setResults([]);
              setExpandedCountry(null);
              setLeadName("");
              setLeadEmail("");
              setLeadPhone("");
            }}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            ← Retake the quiz
          </button>
        </div>
      </div>

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
