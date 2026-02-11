import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { GraduationCap, ChevronRight, ChevronDown, CheckCircle2, Sparkles, ArrowRight, Phone, Star, Quote, Award, BookOpen, FileText, Plane, Users, Globe, Target, Clock, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Scholarship tracks data
const scholarshipTracks = [
  {
    id: "china",
    title: "China Scholarships",
    flag: "🇨🇳",
    badge: "100% FULL SCHOLARSHIP",
    badgeColor: "from-red-500 to-amber-500",
    cardBg: "from-red-50 to-amber-50",
    borderColor: "border-red-200",
    description: "Full 100% scholarship to Chinese universities, guaranteed by SpecTa Education. Some programs include accommodation and living allowance.",
    covered: ["Full Tuition (100%)", "Some include Accommodation", "Some include Living Allowance", "Academic Support"],
    requirements: ["Minimum GPA requirement", "English proficiency (IELTS/equivalent)", "SpecTa Education guidance"],
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&h=400&fit=crop",
  },
  {
    id: "mila_malaysia",
    title: "Mila University Malaysia",
    flag: "🇲🇾",
    badge: "100% TUITION SCHOLARSHIP",
    badgeColor: "from-blue-500 to-cyan-500",
    cardBg: "from-blue-50 to-cyan-50",
    borderColor: "border-blue-200",
    description: "100% tuition scholarship at Mila University, Malaysia. Study in one of Southeast Asia's most vibrant countries with full tuition coverage.",
    covered: ["Full Tuition (100%)", "World-class Education", "Multicultural Campus", "Career Opportunities"],
    requirements: ["Minimum GPA requirement", "English proficiency", "SpecTa Education application support"],
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&h=400&fit=crop",
  },
  {
    id: "lpdp",
    title: "LPDP Scholarship",
    flag: "🇮🇩",
    badge: "GOVERNMENT FUNDED",
    badgeColor: "from-emerald-500 to-teal-500",
    cardBg: "from-emerald-50 to-teal-50",
    borderColor: "border-emerald-200",
    description: "Indonesian government scholarship (LPDP) for studying abroad. SpecTa has helped many students successfully secure this prestigious scholarship.",
    covered: ["Full Tuition Coverage", "Living Allowance", "Round-trip Airfare", "Book & Research Allowance"],
    requirements: ["Indonesian citizen", "Minimum GPA requirement", "IELTS score", "Essay & interview preparation"],
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop",
  },
];

// Eligibility checker questions
const eligibilitySteps = [
  {
    id: 1,
    question: "What's your education level?",
    icon: "🎓",
    options: [
      { label: "SMA / SMK", value: "sma", icon: "📚" },
      { label: "D3 / Diploma", value: "d3", icon: "📋" },
      { label: "S1 / Bachelor's", value: "s1", icon: "🎓" },
      { label: "S2 / Master's", value: "s2", icon: "🏆" },
    ],
  },
  {
    id: 2,
    question: "What's your approximate GPA?",
    icon: "📊",
    type: "gpa_slider",
    options: [],
  },
  {
    id: 3,
    question: "Which scholarship interests you?",
    icon: "🌟",
    options: [
      { label: "China 🇨🇳", value: "china", icon: "🇨🇳" },
      { label: "Mila University 🇲🇾", value: "mila_malaysia", icon: "🇲🇾" },
      { label: "LPDP 🇮🇩", value: "lpdp", icon: "🇮🇩" },
      { label: "Not Sure Yet 🤔", value: "not_sure", icon: "🤔" },
    ],
  },
  {
    id: 4,
    question: "Do you have an IELTS / English test score?",
    icon: "📝",
    options: [
      { label: "Yes, I have a score", value: "yes", icon: "✅" },
      { label: "Not yet", value: "not_yet", icon: "⏳" },
      { label: "Planning to take", value: "planning", icon: "📅" },
    ],
  },
];

// Success stories from Google Reviews
const successStories = [
  {
    name: "Jo Yudianto",
    destination: "Fully Funded Scholarship",
    text: "I am deeply grateful to have been awarded a fully funded Postgraduate Scholarship through SpecTa. I extend my sincere appreciation to Ms. Wulan for her unwavering support throughout the preparation and enrollment process.",
    highlight: "Full Scholarship Winner",
  },
  {
    name: "Amada",
    destination: "China (XJTLU) + Scholarship",
    text: "Best agency ever!! I didn't even know where I wanted to study when I first visited SpecTa, and now here I am studying in China at XJTLU with a scholarship. They guided me from nothing to everything.",
    highlight: "XJTLU + Scholarship",
  },
  {
    name: "Jocelyn Lim",
    destination: "Australia (UTS)",
    text: "I've had the most lovely experience with the team at SpecTa Education! Ms. Fitri has been very supportive this whole time and helped me through the whole process of applying for college at UTS and for my Australian student visa without any problems.",
    highlight: "UTS Australia",
  },
  {
    name: "Iesha S",
    destination: "Australia (UQ)",
    text: "SpecTa has been very helpful throughout my university and visa application process. Through their help, I was able to gain admission to UQ and acquire my Australian student visa.",
    highlight: "University of Queensland",
  },
];

// FAQ data
const faqs = [
  {
    q: "Is the 100% scholarship really free?",
    a: "Yes! The 100% scholarship covers your full tuition fees. Some China scholarship programs even include accommodation and living allowance. You'll only need to cover personal expenses like food and transportation in some cases.",
  },
  {
    q: "What GPA do I need to qualify?",
    a: "GPA requirements vary by scholarship and university. Generally, a competitive GPA is expected, but don't worry if yours isn't perfect — SpecTa will assess your full profile and find the best match for you. Book a free consultation to get personalized advice.",
  },
  {
    q: "Do I need IELTS to apply?",
    a: "Most scholarships require English proficiency proof (IELTS, TOEFL, or equivalent). If you don't have a score yet, SpecTa offers IELTS preparation courses to help you achieve your target score. Some programs may accept alternative English tests.",
  },
  {
    q: "What is LPDP and how do I apply?",
    a: "LPDP (Lembaga Pengelola Dana Pendidikan) is the Indonesian government's prestigious scholarship for studying abroad. It covers tuition, living costs, airfare, and more. SpecTa has extensive experience helping students prepare their LPDP applications, essays, and interviews.",
  },
  {
    q: "How long does the scholarship process take?",
    a: "The timeline varies: China scholarships typically take 2-4 months from application to acceptance. LPDP follows the government's annual timeline. Mila University Malaysia can be processed within 1-2 months. SpecTa will guide you through every step and deadline.",
  },
  {
    q: "Can SpecTa guarantee I'll get the scholarship?",
    a: "For our China university partnerships, SpecTa has a strong track record of securing 100% scholarships for qualified students. For LPDP and other competitive scholarships, we provide comprehensive preparation and guidance to maximize your chances. We've helped 200+ students secure scholarships!",
  },
];

// How it works steps
const howItWorks = [
  {
    step: 1,
    title: "Free Consultation",
    description: "Tell us your dream — we'll find the right scholarship for you",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-100",
  },
  {
    step: 2,
    title: "Profile Assessment",
    description: "We evaluate your GPA, IELTS, and match you with scholarships",
    icon: Target,
    color: "text-purple-500",
    bg: "bg-purple-100",
  },
  {
    step: 3,
    title: "Application Support",
    description: "We handle the paperwork, essays, and submissions for you",
    icon: FileText,
    color: "text-orange-500",
    bg: "bg-orange-100",
  },
  {
    step: 4,
    title: "You're In!",
    description: "Scholarship secured — time to pack your bags and fly!",
    icon: Plane,
    color: "text-emerald-500",
    bg: "bg-emerald-100",
  },
];

// GPA Slider Component
function GPASlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const getEmoji = (gpa: number) => {
    if (gpa < 2.5) return "😅";
    if (gpa < 3.0) return "😊";
    if (gpa < 3.5) return "🤩";
    return "🏆";
  };

  const getMessage = (gpa: number) => {
    if (gpa < 2.5) return "Let's explore your options!";
    if (gpa < 3.0) return "Good foundation!";
    if (gpa < 3.5) return "Strong candidate!";
    return "Excellent! Top scholarships await!";
  };

  return (
    <div className="space-y-6 px-4">
      <div className="text-center">
        <div className="text-6xl mb-2">{getEmoji(value)}</div>
        <div className="text-3xl font-bold text-white">{value.toFixed(1)}</div>
        <div className="text-white/80 text-sm mt-1">{getMessage(value)}</div>
      </div>
      <input
        type="range"
        min="2.0"
        max="4.0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer bg-white/30 accent-yellow-400"
      />
      <div className="flex justify-between text-xs text-white/60">
        <span>2.0</span>
        <span>2.5</span>
        <span>3.0</span>
        <span>3.5</span>
        <span>4.0</span>
      </div>
    </div>
  );
}

export default function Scholarships() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [checkerStep, setCheckerStep] = useState(0); // 0 = not started, 1-4 = questions, 5 = lead form, 6 = result
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [gpaValue, setGpaValue] = useState(3.0);
  const [ieltsScore, setIeltsScore] = useState("");
  const [leadForm, setLeadForm] = useState({ name: "", email: "", phone: "" });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
  const checkerRef = useRef<HTMLDivElement>(null);

  const submitLeadMutation = trpc.scholarship.submitLead.useMutation({
    onSuccess: () => {
      setCheckerStep(6);
    },
    onError: () => {
      toast.error("Failed to submit. Please try again.");
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAnswer = (stepId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [stepId.toString()]: value }));
    if (stepId === 2) {
      // GPA step handled separately
    } else if (stepId === 4 && value === "yes") {
      // Show IELTS score input before advancing
      return;
    }
    setTimeout(() => setCheckerStep((prev) => prev + 1), 300);
  };

  const handleGpaNext = () => {
    setAnswers((prev) => ({ ...prev, "2": gpaValue.toFixed(1) }));
    setCheckerStep(3);
  };

  const handleIeltsNext = () => {
    setAnswers((prev) => ({ ...prev, "4": "yes" }));
    setCheckerStep(5);
  };

  const handleSubmitLead = () => {
    if (!leadForm.name || !leadForm.email || !leadForm.phone) {
      toast.error("Please fill all fields — we need your info to connect you with the right counselor.");
      return;
    }
    submitLeadMutation.mutate({
      studentName: leadForm.name,
      studentEmail: leadForm.email,
      studentPhone: leadForm.phone,
      educationLevel: answers["1"] || "",
      gpa: answers["2"] || gpaValue.toFixed(1),
      scholarshipInterest: answers["3"] || "",
      ieltsStatus: answers["4"] || "",
      ieltsScore: ieltsScore || undefined,
    });
  };

  const getMatchedScholarships = () => {
    const interest = answers["3"];
    if (interest === "not_sure") return ["China Scholarships", "Mila University Malaysia", "LPDP Scholarship"];
    if (interest === "china") return ["China 100% Scholarship"];
    if (interest === "mila_malaysia") return ["Mila University Malaysia 100% Scholarship"];
    if (interest === "lpdp") return ["LPDP Government Scholarship"];
    return ["Multiple Scholarship Options"];
  };

  const scrollToChecker = () => {
    setCheckerStep(1);
    setTimeout(() => {
      checkerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const currentStep = eligibilitySteps[checkerStep - 1];

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="scholarships" />

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 relative overflow-hidden">
        {/* Animated sparkles background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute text-4xl"
            style={{ top: "10%", left: "8%" }}
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            ✨
          </motion.div>
          <motion.div
            className="absolute text-3xl"
            style={{ top: "20%", right: "10%" }}
            animate={{ y: [0, 15, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            🎓
          </motion.div>
          <motion.div
            className="absolute text-5xl"
            style={{ bottom: "25%", left: "15%" }}
            animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            💰
          </motion.div>
          <motion.div
            className="absolute text-4xl"
            style={{ bottom: "15%", right: "12%" }}
            animate={{ y: [0, 18, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          >
            🌟
          </motion.div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 rounded-full text-amber-600 text-sm font-semibold mb-6 border border-amber-200"
            >
              <Award className="w-4 h-4" />
              200+ Students Secured Full Scholarships
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              100% Scholarship?{" "}
              <span className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                Yes, It's Real.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
            >
              Full tuition, accommodation, and even living allowance — fully covered. SpecTa Education has helped <strong>200+ students</strong> secure full scholarships to study abroad.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-bold text-lg px-8 shadow-lg shadow-amber-500/25"
                onClick={scrollToChecker}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Check My Eligibility
              </Button>
              <a href="https://wa.me/62819668278?text=Hi,%20I'm%20interested%20in%20scholarship%20opportunities.%20Can%20you%20help%20me?" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="font-semibold text-lg px-8">
                  <Phone className="w-5 h-5 mr-2" />
                  Book Free Consultation
                </Button>
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Guaranteed Scholarships</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>15+ Years Experience</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>200+ Scholarship Winners</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scholarship Tracks Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Scholarship Opportunities
            </motion.h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore our three scholarship tracks — each offering incredible opportunities for Indonesian students
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {scholarshipTracks.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -8 }}
                className={`bg-card rounded-2xl overflow-hidden border ${track.borderColor} shadow-sm hover:shadow-xl transition-all duration-300`}
              >
                {/* Card Image */}
                <div className="relative h-48 overflow-hidden">
                  <img src={track.image} alt={track.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className={`bg-gradient-to-r ${track.badgeColor} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg`}>
                      {track.badge}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="text-3xl">{track.flag}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{track.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{track.description}</p>

                  {/* What's Covered */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2 text-emerald-600">What's Covered:</h4>
                    <ul className="space-y-1.5">
                      {track.covered.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Requirements (expandable) */}
                  <button
                    onClick={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
                    className="text-sm text-primary font-medium flex items-center gap-1 mb-4 hover:underline"
                  >
                    Requirements
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedTrack === track.id ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {expandedTrack === track.id && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-1.5 mb-4 overflow-hidden"
                      >
                        {track.requirements.map((req, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>

                  <Button
                    className="w-full"
                    onClick={scrollToChecker}
                  >
                    I Want This! <Sparkles className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Eligibility Checker */}
      <section className="py-20" ref={checkerRef}>
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold mb-4"
              >
                Am I Eligible? 🤔
              </motion.h2>
              <p className="text-muted-foreground">
                Answer 4 quick questions and we'll match you with the right scholarship
              </p>
            </div>

            {/* Checker Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl overflow-hidden shadow-2xl"
            >
              {checkerStep === 0 && (
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 p-8 md:p-12 text-center text-white">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold mb-3">Scholarship Eligibility Checker</h3>
                  <p className="text-white/80 mb-6 max-w-md mx-auto">
                    Just 4 quick taps and we'll tell you which scholarships you may qualify for!
                  </p>
                  <Button
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-yellow-300 hover:text-purple-700 font-bold text-lg px-8 shadow-lg"
                    onClick={() => setCheckerStep(1)}
                  >
                    Let's Check! →
                  </Button>
                </div>
              )}

              {checkerStep >= 1 && checkerStep <= 4 && currentStep && (
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 p-6 md:p-10 text-white">
                  {/* Progress */}
                  <div className="flex items-center gap-2 mb-6">
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          s <= checkerStep ? "bg-yellow-400" : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">{currentStep.icon}</div>
                    <h3 className="text-xl md:text-2xl font-bold">{currentStep.question}</h3>
                  </div>

                  {currentStep.type === "gpa_slider" ? (
                    <div className="space-y-6">
                      <GPASlider value={gpaValue} onChange={setGpaValue} />
                      <div className="text-center">
                        <Button
                          size="lg"
                          className="bg-white text-purple-600 hover:bg-yellow-300 hover:text-purple-700 font-bold px-8"
                          onClick={handleGpaNext}
                        >
                          Next →
                        </Button>
                      </div>
                    </div>
                  ) : checkerStep === 4 && answers["4"] === "yes" ? (
                    <div className="space-y-4">
                      <div className="bg-white/10 rounded-2xl p-4">
                        <label className="text-white/80 text-sm mb-2 block">Enter your IELTS score (optional):</label>
                        <input
                          type="text"
                          placeholder="e.g. 6.5"
                          value={ieltsScore}
                          onChange={(e) => setIeltsScore(e.target.value)}
                          className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div className="text-center">
                        <Button
                          size="lg"
                          className="bg-white text-purple-600 hover:bg-yellow-300 hover:text-purple-700 font-bold px-8"
                          onClick={handleIeltsNext}
                        >
                          Next →
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentStep.options.map((option) => (
                        <motion.button
                          key={option.value}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleAnswer(currentStep.id, option.value)}
                          className="bg-white/15 hover:bg-white/25 border border-white/20 rounded-2xl p-4 text-left transition-all flex items-center gap-3"
                        >
                          <span className="text-2xl">{option.icon}</span>
                          <span className="font-medium">{option.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {checkerStep === 5 && (
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 p-6 md:p-10 text-white">
                  <div className="text-center mb-6">
                    <div className="text-5xl mb-3">🎉</div>
                    <h3 className="text-2xl font-bold mb-2">Great News!</h3>
                    <p className="text-white/80">
                      Based on your profile, you may qualify for{" "}
                      <strong className="text-yellow-300">{getMatchedScholarships().length} scholarship(s)</strong>!
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                      {getMatchedScholarships().map((s, i) => (
                        <span key={i} className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-6 space-y-4">
                    <p className="text-center text-white/80 text-sm mb-4">
                      Enter your details and our scholarship counselor will contact you within 24 hours!
                    </p>
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      value={leadForm.name}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={leadForm.email}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <input
                      type="tel"
                      placeholder="WhatsApp Number"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black font-bold text-lg shadow-lg"
                      onClick={handleSubmitLead}
                      disabled={submitLeadMutation.isPending}
                    >
                      {submitLeadMutation.isPending ? "Submitting..." : "Get My Free Scholarship Consultation 🎓"}
                    </Button>
                  </div>
                </div>
              )}

              {checkerStep === 6 && (
                <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 md:p-12 text-center text-white">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                  >
                    <div className="text-6xl mb-4">🎊</div>
                    <h3 className="text-2xl font-bold mb-3">You're All Set!</h3>
                    <p className="text-white/90 max-w-md mx-auto mb-6">
                      Our scholarship counselor will reach out to you within 24 hours. In the meantime, explore more about our scholarship programs below!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <a href="https://wa.me/62819668278?text=Hi,%20I%20just%20completed%20the%20scholarship%20eligibility%20checker%20on%20your%20website.%20I'd%20like%20to%20know%20more!" target="_blank" rel="noopener noreferrer">
                        <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold">
                          <Phone className="w-5 h-5 mr-2" />
                          Chat Now on WhatsApp
                        </Button>
                      </a>
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white text-white hover:bg-white/10"
                        onClick={() => {
                          setCheckerStep(0);
                          setAnswers({});
                          setLeadForm({ name: "", email: "", phone: "" });
                          setIeltsScore("");
                          setGpaValue(3.0);
                        }}
                      >
                        Check Again
                      </Button>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full text-yellow-600 text-sm font-medium mb-4"
            >
              <Star className="w-4 h-4 fill-yellow-500" />
              Real Student Reviews from Google
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Scholarship Success Stories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real students who secured full scholarships with SpecTa Education's help
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {successStories.map((story, index) => (
              <motion.div
                key={index}
                className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -3 }}
              >
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
                <div className="flex items-center gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">"{story.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{story.name}</div>
                    <div className="text-xs text-muted-foreground">{story.destination}</div>
                  </div>
                  <span className="text-[10px] font-medium bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">
                    {story.highlight}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <a
              href="https://www.google.com/maps/search/SpecTa+Education"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              View all reviews on Google Maps
            </a>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your scholarship journey in 4 simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-6">
              {howItWorks.map((step, index) => (
                <motion.div
                  key={step.step}
                  className="text-center relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                >
                  {/* Connector line */}
                  {index < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/20" />
                  )}

                  <div className={`w-20 h-20 ${step.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10`}>
                    <step.icon className={`w-9 h-9 ${step.color}`} />
                  </div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">STEP {step.step}</div>
                  <h3 className="font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Everything you need to know about our scholarship programs
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-semibold pr-4">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20">
        <div className="container">
          <motion.div
            className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Decorative elements */}
            <div className="absolute top-4 left-8 text-4xl opacity-20 animate-bounce">🎓</div>
            <div className="absolute top-6 right-12 text-3xl opacity-20 animate-bounce" style={{ animationDelay: "0.5s" }}>💰</div>
            <div className="absolute bottom-4 left-1/4 text-3xl opacity-20 animate-bounce" style={{ animationDelay: "1s" }}>✈️</div>
            <div className="absolute bottom-6 right-1/4 text-4xl opacity-20 animate-bounce" style={{ animationDelay: "1.5s" }}>🌟</div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Limited Scholarship Slots Available!
              </h2>
              <p className="text-white/90 max-w-2xl mx-auto mb-8 text-lg">
                Every semester, only a limited number of full scholarships are available. Don't miss your chance — talk to our counselors today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="https://wa.me/62819668278?text=Hi,%20I'm%20interested%20in%20scholarship%20opportunities!" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-white text-amber-600 hover:bg-amber-50 font-bold text-lg px-8 shadow-lg">
                    <Phone className="w-5 h-5 mr-2" />
                    WhatsApp Us
                  </Button>
                </a>
                <Link href="/book">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-bold text-lg px-8">
                    Book Consultation
                  </Button>
                </Link>
                <Link href="/apply">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-bold text-lg px-8">
                    Quick Apply
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />

      {/* Chatbot */}
      <ChatBotButton onClick={() => setIsChatOpen(true)} />
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg h-[600px] max-h-[80vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground">
                <div className="flex items-center gap-3">
                  <motion.img
                    src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/saxLOcubreWkfnzl.png"
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
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-primary-foreground/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ChatBot />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
