import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Brain, ChevronDown, Globe2, GraduationCap, Heart, Sparkles, Users, BookOpen, Briefcase, BarChart3, Share2, RotateCcw, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  riasecQuestions,
  miQuestions,
  personalQuestions,
  riasecTypes,
  miTypes,
  likertLabels,
  uiLabels,
} from "../../../shared/aptitudeQuestions";

type Lang = "id" | "en";
type Phase = "intro" | "leadCapture" | "section1" | "section2" | "section3" | "analyzing" | "emailSent" | "results";

// Scoring helpers
function computeRiasecScores(answers: Record<string, number>) {
  const scores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const counts: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const q of riasecQuestions) {
    const val = answers[q.id];
    if (val !== undefined) {
      scores[q.category] = (scores[q.category] || 0) + val;
      counts[q.category] = (counts[q.category] || 0) + 1;
    }
  }
  // Normalize to 0-100
  const normalized: Record<string, number> = {};
  for (const key of Object.keys(scores)) {
    const maxPossible = counts[key] * 5;
    normalized[key] = maxPossible > 0 ? Math.round((scores[key] / maxPossible) * 100) : 0;
  }
  return normalized;
}

function computeMiScores(answers: Record<string, number>) {
  const scores: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const q of miQuestions) {
    const val = answers[q.id];
    if (val !== undefined) {
      scores[q.category] = (scores[q.category] || 0) + val;
      counts[q.category] = (counts[q.category] || 0) + 1;
    }
  }
  const normalized: Record<string, number> = {};
  for (const key of Object.keys(scores)) {
    const maxPossible = counts[key] * 5;
    normalized[key] = maxPossible > 0 ? Math.round((scores[key] / maxPossible) * 100) : 0;
  }
  return normalized;
}

function getTopN(scores: Record<string, number>, n: number) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function getHollandCode(scores: Record<string, number>) {
  return getTopN(scores, 3).map(([k]) => k).join("");
}

// Likert scale component
function LikertScale({ value, onChange, labels }: { value: number | undefined; onChange: (v: number) => void; labels: string[] }) {
  return (
    <div className="flex items-center justify-between gap-1 sm:gap-2 mt-4">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`flex-1 flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl transition-all duration-200 ${
            value === v
              ? "bg-teal-500 text-white shadow-lg scale-105"
              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
          }`}
        >
          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all ${
            value === v ? "border-white bg-white/20" : "border-gray-300"
          }`}>
            {value === v && <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white" />}
          </div>
          <span className="text-[10px] sm:text-xs font-medium leading-tight text-center">{labels[v - 1]}</span>
        </button>
      ))}
    </div>
  );
}

// Multi-select chip component
function MultiSelectChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all duration-200 text-sm font-medium ${
        selected
          ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        selected ? "border-teal-500 bg-teal-500" : "border-gray-300"
      }`}>
        {selected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </div>
      {label}
    </button>
  );
}

// Select option component
function SelectOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
        selected
          ? "border-teal-500 bg-teal-50 text-teal-800"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? "border-teal-500" : "border-gray-300"
        }`}>
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />}
        </div>
        <span className="text-sm sm:text-base">{label}</span>
      </div>
    </button>
  );
}

// Progress bar component
function ProgressBar({ current, total, lang }: { current: number; total: number; lang: Lang }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>{current} {uiLabels.questionOf[lang]} {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

// Radar chart for RIASEC
function RiasecChart({ scores, lang }: { scores: Record<string, number>; lang: Lang }) {
  const dimensions = ["R", "I", "A", "S", "E", "C"] as const;
  const size = 260;
  const center = size / 2;
  const maxR = 100;
  const levels = [20, 40, 60, 80, 100];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (value / maxR) * (center - 40);
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const dataPoints = dimensions.map((d, i) => getPoint(i, scores[d] || 0));
  const pathData = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] mx-auto">
      {/* Grid levels */}
      {levels.map((level) => {
        const pts = dimensions.map((_, i) => getPoint(i, level));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        return <path key={level} d={d} fill="none" stroke="#e5e7eb" strokeWidth="1" />;
      })}
      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <path d={pathData} fill="rgba(20, 184, 166, 0.2)" stroke="#14b8a6" strokeWidth="2.5" />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#14b8a6" stroke="white" strokeWidth="2" />
      ))}
      {/* Labels */}
      {dimensions.map((d, i) => {
        const p = getPoint(i, 120);
        const type = riasecTypes[d];
        return (
          <text key={d} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-bold" fill={type.color}>
            {type.emoji} {type.name[lang]}
          </text>
        );
      })}
    </svg>
  );
}

// Bar chart for MI
function MiChart({ scores, lang }: { scores: Record<string, number>; lang: Lang }) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-3">
      {sorted.map(([key, value]) => {
        const type = miTypes[key as keyof typeof miTypes];
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-lg w-7 text-center">{type.emoji}</span>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700">{type.name[lang]}</span>
                <span className="text-gray-500">{value}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: type.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AptitudeTest() {
  const [, setLocation] = useLocation();
  const [lang, setLang] = useState<Lang>("id");
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [leadInfo, setLeadInfo] = useState({ name: "", email: "", phone: "" });
  const [aiResult, setAiResult] = useState<any>(null);

  const analyzeMutation = trpc.aptitude.analyzeResults.useMutation();
  // Results are saved as part of analyzeResults mutation (no separate save needed)

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // All questions in current section
  const sectionQuestions = useMemo(() => {
    if (phase === "section1") return riasecQuestions;
    if (phase === "section2") return miQuestions;
    if (phase === "section3") return personalQuestions;
    return [];
  }, [phase]);

  const totalAnswered = Object.keys(answers).length;
  const totalQuestions = riasecQuestions.length + miQuestions.length + personalQuestions.length;

  const currentQuestion = sectionQuestions[currentQ];

  const handleLikertAnswer = (value: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    // Auto-advance after short delay
    setTimeout(() => {
      if (currentQ < sectionQuestions.length - 1) {
        setCurrentQ((prev) => prev + 1);
      }
    }, 300);
  };

  const handleSelectAnswer = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleMultiSelectAnswer = (value: string) => {
    if (!currentQuestion) return;
    const current = (answers[currentQuestion.id] as string) || "";
    const selected = current ? current.split(",") : [];
    if (selected.includes(value)) {
      const updated = selected.filter((v) => v !== value);
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: updated.join(",") }));
    } else {
      const updated = [...selected, value];
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: updated.join(",") }));
    }
  };

  const handleNext = () => {
    if (currentQ < sectionQuestions.length - 1) {
      setCurrentQ((prev) => prev + 1);
    } else {
      // Move to next section
      if (phase === "section1") {
        setPhase("section2");
        setCurrentQ(0);
      } else if (phase === "section2") {
        setPhase("section3");
        setCurrentQ(0);
      } else if (phase === "section3") {
        // All done, submit directly (lead info already captured)
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setCurrentQ((prev) => prev - 1);
    } else {
      if (phase === "section2") {
        setPhase("section1");
        setCurrentQ(riasecQuestions.length - 1);
      } else if (phase === "section3") {
        setPhase("section2");
        setCurrentQ(miQuestions.length - 1);
      } else if (phase === "section1") {
        setPhase("leadCapture");
      }
    }
  };

  const handleSubmit = async () => {
    setPhase("analyzing");

    // Compute scores
    const riasecScores = computeRiasecScores(answers as Record<string, number>);
    const miScores = computeMiScores(answers as Record<string, number>);
    const hollandCode = getHollandCode(riasecScores);
    const topMi = getTopN(miScores, 3);

    // Personal answers (convert multiselect comma-separated to arrays)
    const personalAnswers: Record<string, string | string[]> = {};
    for (const q of personalQuestions) {
      if (answers[q.id]) {
        const val = answers[q.id] as string;
        if (q.type === "multiselect" && val.includes(",")) {
          personalAnswers[q.id] = val.split(",");
        } else if (q.type === "multiselect") {
          personalAnswers[q.id] = val ? [val] : [];
        } else {
          personalAnswers[q.id] = val;
        }
      }
    }

    try {
      const riasecAnswers: Record<string, number> = {};
      for (const q of riasecQuestions) {
        if (typeof answers[q.id] === 'number') riasecAnswers[q.id] = answers[q.id] as number;
      }
      const miAnswersMap: Record<string, number> = {};
      for (const q of miQuestions) {
        if (typeof answers[q.id] === 'number') miAnswersMap[q.id] = answers[q.id] as number;
      }

      const result = await analyzeMutation.mutateAsync({
        language: lang,
        riasecAnswers,
        miAnswers: miAnswersMap,
        personalAnswers,
        studentName: leadInfo.name,
        studentEmail: leadInfo.email,
        studentPhone: leadInfo.phone || undefined,
      });

      const analysis = result.aiAnalysis || {};
      setAiResult({
        personalitySnapshot: analysis.personalitySnapshot?.description
          ? `${analysis.personalitySnapshot.emoji || ''} ${analysis.personalitySnapshot.title || ''} — ${analysis.personalitySnapshot.description}`
          : analysis.personalitySnapshot || '',
        riasecAnalysis: analysis.riasecAnalysis || '',
        miAnalysis: analysis.miAnalysis || '',
        crossAnalysis: analysis.crossAnalysis || '',
        majorRecommendations: (analysis.recommendedMajors || []).map((m: any) => ({
          name: m.name,
          compatibility: m.compatibilityScore || 0,
          reason: m.reason || '',
          careers: m.careers || [],
        })),
        careerOutlook: (analysis.recommendedMajors || []).flatMap((m: any) =>
          (m.careers || []).map((c: string) => ({ title: c, description: `${lang === 'id' ? 'Karir dari jurusan' : 'Career from'} ${m.name}` }))
        ),
        parentSummary: analysis.parentSummary || '',
        studyTips: analysis.studyTips || '',
        riasecScores,
        miScores,
        hollandCode,
      });

      setPhase("emailSent");
    } catch {
      // On error, still show email sent confirmation
      setPhase("emailSent");
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setCurrentQ(0);
    setAiResult(null);
    setLeadInfo({ name: "", email: "", phone: "" });
    setPhase("leadCapture");
    window.scrollTo(0, 0);
  };

  const isCurrentAnswered = currentQuestion ? (() => {
    const val = answers[currentQuestion.id];
    if (val === undefined) return false;
    // For multiselect, check that at least one option is selected
    if ("type" in currentQuestion && (currentQuestion as any).type === "multiselect") {
      return typeof val === "string" && val.length > 0;
    }
    return true;
  })() : false;

  // ========== INTRO PHASE ==========
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation currentPage="play" />
        <div className="pt-24 pb-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {/* Language toggle */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex bg-white rounded-full p-1 shadow-sm border border-gray-200">
                  <button
                    onClick={() => setLang("id")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      lang === "id" ? "bg-teal-500 text-white shadow" : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    🇮🇩 Bahasa Indonesia
                  </button>
                  <button
                    onClick={() => setLang("en")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      lang === "en" ? "bg-teal-500 text-white shadow" : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              <div className="text-6xl mb-6">🧠</div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{uiLabels.title[lang]}</h1>
              <p className="text-lg text-gray-600 mb-8">{uiLabels.subtitle[lang]}</p>

              {/* What you'll discover */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 text-left">
                <h3 className="font-semibold text-gray-800 mb-4 text-center">
                  {lang === "id" ? "Apa yang akan kamu dapatkan:" : "What you'll discover:"}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { icon: <Brain className="w-4 h-4" />, text: lang === "id" ? "Profil kepribadian RIASEC kamu" : "Your RIASEC personality profile", color: "teal" },
                    { icon: <Sparkles className="w-4 h-4" />, text: lang === "id" ? "Top 3 kecerdasan dominan kamu" : "Your top 3 dominant intelligences", color: "purple" },
                    { icon: <GraduationCap className="w-4 h-4" />, text: lang === "id" ? "3 jurusan yang paling cocok" : "3 best-fit college majors", color: "emerald" },
                    { icon: <Briefcase className="w-4 h-4" />, text: lang === "id" ? "Prospek karir untuk setiap jurusan" : "Career outlook for each major", color: "blue" },
                    { icon: <Heart className="w-4 h-4" />, text: lang === "id" ? "Personality snapshot yang bisa di-share" : "Shareable personality snapshot", color: "pink" },
                    { icon: <Users className="w-4 h-4" />, text: lang === "id" ? "Ringkasan untuk orang tua" : "Parent-friendly summary", color: "amber" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <div className={`w-8 h-8 rounded-lg bg-${item.color}-100 flex items-center justify-center text-${item.color}-600 flex-shrink-0`}>
                        {item.icon}
                      </div>
                      <span className="text-sm text-gray-700">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test info */}
              <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> 51 {lang === "id" ? "pertanyaan" : "questions"}
                </span>
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" /> RIASEC + MI
                </span>
                <span>⏱️ 10-15 {lang === "id" ? "menit" : "minutes"}</span>
              </div>

              <button
                onClick={() => setPhase("leadCapture")}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold px-8 py-4 rounded-2xl text-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                {uiLabels.startButton[lang]} →
              </button>

              <button
                onClick={() => setLocation("/play")}
                className="block mx-auto mt-4 text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                ← {lang === "id" ? "Kembali ke SpecTa Play" : "Back to SpecTa Play"}
              </button>
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ========== QUESTION PHASES ==========
  if (phase === "section1" || phase === "section2" || phase === "section3") {
    const sectionTitle = phase === "section1" ? uiLabels.section1Title[lang] : phase === "section2" ? uiLabels.section2Title[lang] : uiLabels.section3Title[lang];
    const sectionSubtitle = phase === "section1" ? uiLabels.section1Subtitle[lang] : phase === "section2" ? uiLabels.section2Subtitle[lang] : uiLabels.section3Subtitle[lang];
    const sectionColor = phase === "section1" ? "teal" : phase === "section2" ? "purple" : "amber";
    const sectionNum = phase === "section1" ? 1 : phase === "section2" ? 2 : 3;

    // Calculate global progress
    const s1Answered = riasecQuestions.filter((q) => answers[q.id] !== undefined).length;
    const s2Answered = miQuestions.filter((q) => answers[q.id] !== undefined).length;
    const s3Answered = personalQuestions.filter((q) => answers[q.id] !== undefined).length;
    const globalAnswered = s1Answered + s2Answered + s3Answered;

    const isLastQuestion = currentQ === sectionQuestions.length - 1;
    const isLastSection = phase === "section3";

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setLocation("/play/aptitude")} className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              {lang === "id" ? "Keluar" : "Exit"}
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full bg-${sectionColor}-100 text-${sectionColor}-700`}>
                {lang === "id" ? "Bagian" : "Part"} {sectionNum}/3
              </span>
              <button
                onClick={() => setLang(lang === "id" ? "en" : "id")}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-full border border-gray-200"
              >
                {lang === "id" ? "EN" : "ID"}
              </button>
            </div>
          </div>

          {/* Global progress */}
          <ProgressBar current={globalAnswered} total={totalQuestions} lang={lang} />

          {/* Section title */}
          <div className="mt-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900">{sectionTitle}</h2>
            <p className="text-sm text-gray-500 mt-1">{sectionSubtitle}</p>
          </div>

          {/* Question card */}
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">
                    Q{currentQ + 1}/{sectionQuestions.length}
                  </span>
                  {"category" in currentQuestion && (phase === "section1" || phase === "section2") && (
                    <span className="text-xs text-gray-400">
                      {phase === "section1"
                        ? riasecTypes[(currentQuestion as any).category as keyof typeof riasecTypes]?.emoji
                        : miTypes[(currentQuestion as any).category as keyof typeof miTypes]?.emoji}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  {currentQuestion.text[lang]}
                </h3>

                {/* Answer input */}
                {!("type" in currentQuestion) && (
                  <LikertScale
                    value={answers[currentQuestion.id] as number | undefined}
                    onChange={handleLikertAnswer}
                    labels={phase === "section1" ? likertLabels.riasec[lang] : likertLabels.mi[lang]}
                  />
                )}

                {"type" in currentQuestion && (currentQuestion as any).type === "select" && "options" in currentQuestion && (
                  <div className="space-y-2 mt-4">
                    {((currentQuestion as any).options || []).map((opt: any) => (
                      <SelectOption
                        key={opt.value}
                        label={opt.label[lang]}
                        selected={answers[currentQuestion.id] === opt.value}
                        onClick={() => handleSelectAnswer(opt.value)}
                      />
                    ))}
                  </div>
                )}

                {"type" in currentQuestion && (currentQuestion as any).type === "multiselect" && "options" in currentQuestion && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-3">
                      {lang === "id" ? "Pilih beberapa yang sesuai (ketuk untuk memilih/batal)" : "Select all that apply (tap to select/deselect)"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {((currentQuestion as any).options || []).map((opt: any) => {
                        const currentVal = (answers[currentQuestion.id] as string) || "";
                        const selectedArr = currentVal ? currentVal.split(",") : [];
                        return (
                          <MultiSelectChip
                            key={opt.value}
                            label={opt.label[lang]}
                            selected={selectedArr.includes(opt.value)}
                            onClick={() => handleMultiSelectAnswer(opt.value)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {"type" in currentQuestion && (currentQuestion as any).type === "text" && (
                  <textarea
                    value={(answers[currentQuestion.id] as string) || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                    placeholder={lang === "id" ? "Tulis jawaban kamu di sini..." : "Write your answer here..."}
                    className="w-full mt-4 p-4 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {uiLabels.backButton[lang]}
            </button>

            <button
              onClick={handleNext}
              disabled={!isCurrentAnswered}
              className={`flex items-center gap-2 font-medium px-6 py-2.5 rounded-xl text-sm transition-all ${
                isCurrentAnswered
                  ? "bg-teal-500 text-white hover:bg-teal-600 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isLastQuestion && isLastSection ? uiLabels.submitButton[lang] : uiLabels.nextButton[lang]}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick jump dots */}
          <div className="flex justify-center gap-1 mt-6 flex-wrap">
            {sectionQuestions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentQ(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentQ
                    ? "bg-teal-500 scale-125"
                    : answers[q.id] !== undefined
                    ? "bg-teal-300"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========== LEAD CAPTURE PHASE (BEFORE TEST) ==========
  if (phase === "leadCapture") {
    const isFormValid = leadInfo.name.trim() && leadInfo.email.trim() && leadInfo.phone.trim();
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📝</div>
              <h2 className="text-2xl font-bold text-gray-900">{lang === "id" ? "Sebelum Mulai" : "Before We Start"}</h2>
              <p className="text-sm text-gray-500 mt-2">{lang === "id" ? "Isi data kamu dulu ya! Hasil tes akan dikirim ke email kamu setelah selesai." : "Fill in your details first! Results will be sent to your email after completion."}</p>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-6 text-center">
              <span className="text-teal-700 text-sm font-medium">📧 {lang === "id" ? "Hasil lengkap tes bakat AI akan dikirim ke email kamu" : "Complete AI aptitude results will be sent to your email"}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{uiLabels.leadCaptureName[lang]} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={leadInfo.name}
                  onChange={(e) => setLeadInfo((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={lang === "id" ? "Contoh: Budi Santoso" : "e.g. John Doe"}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{uiLabels.leadCaptureEmail[lang]} <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={leadInfo.email}
                  onChange={(e) => setLeadInfo((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{uiLabels.leadCapturePhone[lang]} <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={leadInfo.phone}
                  onChange={(e) => setLeadInfo((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="+62 812 3456 7890"
                />
              </div>
            </div>

            <button
              onClick={() => setPhase("section1")}
              disabled={!isFormValid}
              className={`w-full mt-6 font-semibold py-3.5 rounded-xl text-sm transition-all ${
                isFormValid
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {uiLabels.startButton[lang]} →
            </button>

            <button onClick={() => setPhase("intro")} className="block mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600">
              ← {uiLabels.backButton[lang]}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ========== ANALYZING PHASE ==========
  if (phase === "analyzing") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
            <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🧠</div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{uiLabels.analyzingTitle[lang]}</h2>
          <p className="text-sm text-gray-500 max-w-sm">{uiLabels.analyzingSubtitle[lang]}</p>

          {/* Fun loading messages */}
          <div className="mt-6 space-y-2">
            {[
              lang === "id" ? "🔍 Menganalisis profil RIASEC kamu..." : "🔍 Analyzing your RIASEC profile...",
              lang === "id" ? "🧮 Menghitung kecerdasan dominan..." : "🧮 Calculating dominant intelligences...",
              lang === "id" ? "🎯 Mencocokkan jurusan yang tepat..." : "🎯 Matching the right majors...",
            ].map((msg, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 1.5 }}
                className="text-sm text-gray-400"
              >
                {msg}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ========== EMAIL SENT CONFIRMATION PHASE ==========
  if (phase === "emailSent") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📧</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {lang === "id" ? "Hasil Sudah Dikirim!" : "Results Sent!"}
            </h2>
            <p className="text-gray-600 mb-2">
              {lang === "id"
                ? `Hai ${leadInfo.name}! Hasil lengkap tes bakat AI kamu sudah dikirim ke:`
                : `Hi ${leadInfo.name}! Your complete AI aptitude results have been sent to:`}
            </p>
            <p className="text-teal-600 font-semibold text-lg mb-6">{leadInfo.email}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-amber-800 text-sm">
                {lang === "id"
                  ? "💡 Cek folder inbox atau spam kamu ya. Email berisi profil kepribadian, rekomendasi jurusan, prospek karir, dan ringkasan untuk orang tua."
                  : "💡 Check your inbox or spam folder. The email contains your personality profile, major recommendations, career outlook, and parent summary."}
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-xl p-6 text-white mb-6">
              <h3 className="font-bold mb-2">{lang === "id" ? "Mau konsultasi lebih lanjut?" : "Want further consultation?"}</h3>
              <p className="text-white/80 text-sm mb-4">{lang === "id" ? "Tim SpecTa siap bantu kamu memilih jurusan dan universitas yang tepat!" : "The SpecTa team is ready to help you choose the right major and university!"}</p>
              <a
                href="https://wa.me/6281287878055?text=Hi%20SpecTa!%20Saya%20baru%20selesai%20Tes%20Bakat%20AI%20dan%20ingin%20konsultasi%20lebih%20lanjut!"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-red-600 font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-all text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                {lang === "id" ? "Chat via WhatsApp" : "Chat via WhatsApp"}
              </a>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {uiLabels.retakeButton[lang]}
              </button>
              <button
                onClick={() => setLocation("/play")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                ← {lang === "id" ? "Kembali ke SpecTa Play" : "Back to SpecTa Play"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ========== RESULTS PHASE ==========
  if (phase === "results" && aiResult) {
    const { riasecScores, miScores, hollandCode } = aiResult;
    const topRiasec = getTopN(riasecScores, 3);
    const topMi = getTopN(miScores, 3);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="text-5xl mb-4">🎓</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{uiLabels.resultsTitle[lang]}</h1>
            {leadInfo.name && (
              <p className="text-gray-500">{lang === "id" ? `Halo ${leadInfo.name}! Ini hasil tes bakat kamu:` : `Hi ${leadInfo.name}! Here are your aptitude test results:`}</p>
            )}
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setLang("id")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${lang === "id" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                🇮🇩 ID
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${lang === "en" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                🇬🇧 EN
              </button>
            </div>
          </motion.div>

          {/* Personality Snapshot */}
          {aiResult.personalitySnapshot && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl p-6 text-white mb-6 shadow-lg"
            >
              <h3 className="font-bold text-lg mb-2">{uiLabels.personalityTitle[lang]}</h3>
              <p className="text-white/90 text-sm leading-relaxed">{aiResult.personalitySnapshot}</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="bg-white/20 rounded-xl px-4 py-2">
                  <span className="text-xs opacity-80">Holland Code</span>
                  <p className="text-2xl font-bold tracking-wider">{hollandCode}</p>
                </div>
                <div className="flex gap-1">
                  {topRiasec.map(([key]) => (
                    <span key={key} className="text-2xl">{riasecTypes[key as keyof typeof riasecTypes]?.emoji}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* RIASEC Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6"
          >
            <h3 className="font-bold text-lg text-gray-900 mb-4">{uiLabels.hollandCodeTitle[lang]}</h3>
            <RiasecChart scores={riasecScores} lang={lang} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {topRiasec.map(([key, score]) => {
                const type = riasecTypes[key as keyof typeof riasecTypes];
                return (
                  <div key={key} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{type.emoji}</span>
                      <span className="font-semibold text-sm" style={{ color: type.color }}>{type.name[lang]}</span>
                    </div>
                    <div className="text-xs text-gray-500">{score}%</div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{type.description[lang]}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* MI Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6"
          >
            <h3 className="font-bold text-lg text-gray-900 mb-4">{uiLabels.intelligenceTitle[lang]}</h3>
            <MiChart scores={miScores} lang={lang} />
          </motion.div>

          {/* AI Analysis Sections */}
          {(aiResult.riasecAnalysis || aiResult.miAnalysis || aiResult.crossAnalysis) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 space-y-4"
            >
              {aiResult.riasecAnalysis && (
                <div>
                  <h4 className="font-semibold text-sm text-teal-700 mb-1 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    {lang === "id" ? "Analisis Minat & Kepribadian" : "Interest & Personality Analysis"}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{aiResult.riasecAnalysis}</p>
                </div>
              )}
              {aiResult.miAnalysis && (
                <div>
                  <h4 className="font-semibold text-sm text-purple-700 mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {lang === "id" ? "Analisis Kecerdasan" : "Intelligence Analysis"}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{aiResult.miAnalysis}</p>
                </div>
              )}
              {aiResult.crossAnalysis && (
                <div className="bg-gradient-to-r from-teal-50 to-purple-50 rounded-xl p-4">
                  <h4 className="font-semibold text-sm text-gray-800 mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {lang === "id" ? "Insight Unik Kamu" : "Your Unique Insight"}
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{aiResult.crossAnalysis}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Major Recommendations */}
          {aiResult.majorRecommendations && aiResult.majorRecommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6"
            >
              <h3 className="font-bold text-lg text-gray-900 mb-4">{uiLabels.majorTitle[lang]}</h3>
              <div className="space-y-4">
                {aiResult.majorRecommendations.map((major: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{major.name}</h4>
                        {major.nameEn && major.nameEn !== major.name && (
                          <span className="text-xs text-gray-400">{major.nameEn}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">
                        <span className="text-xs font-bold">{major.compatibility}%</span>
                        <span className="text-xs">{uiLabels.compatibilityLabel[lang]}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{major.reason}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Career Outlook */}
          {aiResult.careerOutlook && aiResult.careerOutlook.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6"
            >
              <h3 className="font-bold text-lg text-gray-900 mb-4">{uiLabels.careerTitle[lang]}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {aiResult.careerOutlook.map((career: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-sm text-gray-800">{career.title}</span>
                    </div>
                    <p className="text-xs text-gray-500">{career.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Parent Summary */}
          {aiResult.parentSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-lg text-amber-900">{uiLabels.parentTitle[lang]}</h3>
              </div>
              <p className="text-xs text-amber-700 mb-3">{uiLabels.parentSubtitle[lang]}</p>
              <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">{aiResult.parentSummary}</p>
            </motion.div>
          )}

          {/* Study Tips */}
          {aiResult.studyTips && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-blue-900">{lang === "id" ? "Tips Persiapan" : "Preparation Tips"}</h3>
              </div>
              <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-line">{aiResult.studyTips}</p>
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-8 text-center text-white mb-6 shadow-lg"
          >
            <h3 className="text-xl font-bold mb-2">{uiLabels.ctaTitle[lang]}</h3>
            <p className="text-white/80 text-sm mb-6">{uiLabels.ctaSubtitle[lang]}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://wa.me/6281287878055?text=Hi%20SpecTa!%20Saya%20baru%20selesai%20Tes%20Bakat%20AI%20dan%20ingin%20konsultasi%20lebih%20lanjut!"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-red-600 font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-all text-sm flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                {uiLabels.ctaButton[lang]}
              </a>
              <button
                onClick={() => setLocation("/book")}
                className="bg-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/30 transition-all text-sm"
              >
                {lang === "id" ? "Book Konsultasi" : "Book Consultation"}
              </button>
            </div>
          </motion.div>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {uiLabels.retakeButton[lang]}
            </button>
            <button
              onClick={() => setLocation("/play")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              ← {lang === "id" ? "Kembali ke SpecTa Play" : "Back to SpecTa Play"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
