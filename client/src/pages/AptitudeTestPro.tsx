import { useState, useCallback, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Brain, Clock, Sparkles, ShieldCheck,
  AlertTriangle, Mail, GripVertical, CheckCircle2, ChevronRight,
  BookOpen, Target, Lightbulb, Users, PenTool, BarChart3, ShieldX, Download
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AptitudeReportDownload from "@/components/AptitudeReportPDF";
import {
  profilDiriFields,
  riasecProQuestions,
  miPairs,
  personalityQuestions,
  sjtQuestions,
  creativeQuestions,
  rankingExercises,
  proSectionLabels,
} from "../../../shared/proQuestions";

type Lang = "id" | "en";
type Phase = "intro" | "leadCapture" | "section1" | "section2" | "section3" | "section4" | "section5" | "section6" | "section7" | "analyzing" | "emailSent";


// ========== SCORING HELPERS ==========
function computeRiasecScores(answers: Record<string, number>) {
  const scores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const counts: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const q of riasecProQuestions) {
    const val = answers[q.id];
    if (val !== undefined) {
      scores[q.category] += val;
      counts[q.category] += 1;
    }
  }
  const normalized: Record<string, number> = {};
  for (const key of Object.keys(scores)) {
    const maxPossible = counts[key] * 5;
    normalized[key] = maxPossible > 0 ? Math.round((scores[key] / maxPossible) * 100) : 0;
  }
  return normalized;
}

function computeMiScores(forcedChoices: Record<string, string>) {
  const scores: Record<string, number> = {};
  for (const pair of miPairs) {
    const chosen = forcedChoices[pair.id];
    if (chosen === "A") {
      scores[pair.optionA.category] = (scores[pair.optionA.category] || 0) + 1;
    } else if (chosen === "B") {
      scores[pair.optionB.category] = (scores[pair.optionB.category] || 0) + 1;
    }
  }
  // Normalize to 0-100 (max possible per category varies based on how many pairs include it)
  const maxCounts: Record<string, number> = {};
  for (const pair of miPairs) {
    maxCounts[pair.optionA.category] = (maxCounts[pair.optionA.category] || 0) + 1;
    maxCounts[pair.optionB.category] = (maxCounts[pair.optionB.category] || 0) + 1;
  }
  const normalized: Record<string, number> = {};
  for (const key of Object.keys(maxCounts)) {
    normalized[key] = maxCounts[key] > 0 ? Math.round(((scores[key] || 0) / maxCounts[key]) * 100) : 0;
  }
  return normalized;
}

function computePersonalityProfile(answers: Record<string, string>) {
  const traits: Record<string, string[]> = {};
  for (const q of personalityQuestions) {
    const chosen = answers[q.id];
    if (chosen === "A") {
      const dim = q.dimension;
      if (!traits[dim]) traits[dim] = [];
      traits[dim].push(q.optionA.trait);
    } else if (chosen === "B") {
      const dim = q.dimension;
      if (!traits[dim]) traits[dim] = [];
      traits[dim].push(q.optionB.trait);
    }
  }
  return traits;
}

function computeSjtProfile(answers: Record<string, string>) {
  const allTraits: string[] = [];
  for (const q of sjtQuestions) {
    const chosen = answers[q.id];
    const option = q.options.find(o => o.value === chosen);
    if (option) {
      allTraits.push(...option.traits);
    }
  }
  // Count trait frequency
  const traitCounts: Record<string, number> = {};
  for (const t of allTraits) {
    traitCounts[t] = (traitCounts[t] || 0) + 1;
  }
  return traitCounts;
}

// ========== PROGRESS BAR ==========
function SectionProgressBar({ currentSection, totalSections, lang }: { currentSection: number; totalSections: number; lang: Lang }) {
  const sections = proSectionLabels.sections;
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex items-center justify-between mb-3">
        {sections.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i + 1 < currentSection
                  ? "bg-green-500 text-white"
                  : i + 1 === currentSection
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white ring-2 ring-indigo-300 ring-offset-2"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {i + 1 < currentSection ? "✓" : s.icon}
            </div>
            {i < sections.length - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 mx-0.5 transition-all duration-300 ${
                i + 1 < currentSection ? "bg-green-500" : "bg-gray-200"
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600">
          {sections[currentSection - 1]?.title[lang]} ({currentSection}/{totalSections})
        </p>
      </div>
    </div>
  );
}

// ========== TIMER ==========
function Timer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
      <Clock className="w-3.5 h-3.5" />
      <span className="font-mono">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
    </div>
  );
}

// ========== MAIN COMPONENT ==========
export default function AptitudeTestPro() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tokenParam = params.get("token");
  const lang: Lang = "id";

  // Token validation
  const tokenQuery = trpc.aptitude.validateToken.useQuery(
    { token: tokenParam || "" },
    { enabled: !!tokenParam, retry: false }
  );
  const useTokenMutation = trpc.aptitude.useToken.useMutation();
  const completeTokenMutation = trpc.aptitude.completeToken.useMutation();

  // Phase & state
  const [phase, setPhase] = useState<Phase>("intro");
  const [testStartTime, setTestStartTime] = useState<number>(0);

  // Lead capture
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");

  // Section 1: Profil Diri
  const [profilAnswers, setProfilAnswers] = useState<Record<string, string>>({});

  // Section 2: RIASEC (Likert 1-5)
  const [riasecAnswers, setRiasecAnswers] = useState<Record<string, number>>({});
  const [riasecIndex, setRiasecIndex] = useState(0);

  // Section 3: MI (Forced Choice)
  const [miAnswers, setMiAnswers] = useState<Record<string, string>>({});
  const [miIndex, setMiIndex] = useState(0);

  // Section 4: Personality (This or That)
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, string>>({});
  const [personalityIndex, setPersonalityIndex] = useState(0);

  // Section 5: SJT
  const [sjtAnswers, setSjtAnswers] = useState<Record<string, string>>({});
  const [sjtIndex, setSjtIndex] = useState(0);

  // Section 6: Creative (Open-ended)
  const [creativeAnswers, setCreativeAnswers] = useState<Record<string, string>>({});
  const [creativeIndex, setCreativeIndex] = useState(0);

  // Section 7: Ranking
  const [rankingAnswers, setRankingAnswers] = useState<Record<string, string[]>>({});
  const [rankingIndex, setRankingIndex] = useState(0);

  // Analysis
  const analyzeMutation = trpc.aptitude.analyzeProResults.useMutation();
  const [analysisError, setAnalysisError] = useState("");
  const [savedResultId, setSavedResultId] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Ref for scroll
  const topRef = useRef<HTMLDivElement>(null);
  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Initialize ranking answers with default order
  useEffect(() => {
    const initial: Record<string, string[]> = {};
    for (const ex of rankingExercises) {
      initial[ex.id] = ex.items.map(item => item.value);
    }
    setRankingAnswers(initial);
  }, []);

  // Auto-advance effects — watch answer count AND current index
  // When user answers the current question, auto-advance to next unanswered (or next) after a short delay
  const riasecAnswerCount = Object.keys(riasecAnswers).length;
  useEffect(() => {
    if (phase !== "section2" || riasecAnswerCount === 0) return;
    const currentQ = riasecProQuestions[riasecIndex];
    if (!currentQ) return; // bounds check
    if (riasecAnswers[currentQ.id] !== undefined && riasecIndex < riasecProQuestions.length - 1) {
      const timer = setTimeout(() => {
        setRiasecIndex(prev => {
          const next = prev + 1;
          return next < riasecProQuestions.length ? next : prev;
        });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [riasecAnswerCount, riasecIndex, phase]);

  const miAnswerCount = Object.keys(miAnswers).length;
  useEffect(() => {
    if (phase !== "section3" || miAnswerCount === 0) return;
    const currentP = miPairs[miIndex];
    if (!currentP) return;
    if (miAnswers[currentP.id] !== undefined && miIndex < miPairs.length - 1) {
      const timer = setTimeout(() => {
        setMiIndex(prev => {
          const next = prev + 1;
          return next < miPairs.length ? next : prev;
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [miAnswerCount, miIndex, phase]);

  const personalityAnswerCount = Object.keys(personalityAnswers).length;
  useEffect(() => {
    if (phase !== "section4" || personalityAnswerCount === 0) return;
    const currentQ = personalityQuestions[personalityIndex];
    if (!currentQ) return;
    if (personalityAnswers[currentQ.id] !== undefined && personalityIndex < personalityQuestions.length - 1) {
      const timer = setTimeout(() => {
        setPersonalityIndex(prev => {
          const next = prev + 1;
          return next < personalityQuestions.length ? next : prev;
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [personalityAnswerCount, personalityIndex, phase]);

  const sjtAnswerCount = Object.keys(sjtAnswers).length;
  useEffect(() => {
    if (phase !== "section5" || sjtAnswerCount === 0) return;
    const currentQ = sjtQuestions[sjtIndex];
    if (!currentQ) return;
    if (sjtAnswers[currentQ.id] !== undefined && sjtIndex < sjtQuestions.length - 1) {
      const timer = setTimeout(() => {
        setSjtIndex(prev => {
          const next = prev + 1;
          return next < sjtQuestions.length ? next : prev;
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sjtAnswerCount, sjtIndex, phase]);

  // Token validation gate
  if (tokenParam) {
    if (tokenQuery.isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Memvalidasi link akses...</p>
          </div>
        </div>
      );
    }
    if (tokenQuery.isError || !tokenQuery.data?.valid) {
      const reason = tokenQuery.data?.reason;
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {reason === "expired" ? <Clock className="w-8 h-8 text-red-500" /> :
               reason === "already_used" ? <ShieldX className="w-8 h-8 text-red-500" /> :
               <AlertTriangle className="w-8 h-8 text-red-500" />}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {reason === "expired" ? "Link Sudah Kedaluwarsa" :
               reason === "already_used" ? "Link Sudah Digunakan" :
               "Link Tidak Valid"}
            </h2>
            <p className="text-gray-600 mb-6">
              {reason === "expired" ? "Link tes ini sudah melewati batas waktu. Silakan hubungi admin untuk link baru." :
               reason === "already_used" ? "Link tes ini sudah pernah digunakan. Setiap link hanya bisa digunakan satu kali." :
               "Link tes ini tidak valid. Pastikan Anda menggunakan link yang benar."}
            </p>
            <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition-colors">
              Hubungi Admin via WhatsApp
            </a>
          </div>
        </div>
      );
    }
  }

  // No token = no access
  if (!tokenParam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Terbatas</h2>
          <p className="text-gray-600 mb-6">
            Tes Bakat AI Pro hanya bisa diakses melalui link khusus. Silakan hubungi SpecTa Education untuk mendapatkan link akses Anda.
          </p>
          <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition-colors">
            Hubungi Kami via WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ========== HANDLERS ==========
  const handleStartTest = () => {
    if (!studentName.trim() || !studentEmail.trim() || !studentPhone.trim()) return;
    // Claim the token
    useTokenMutation.mutate(
      { token: tokenParam!, name: studentName, email: studentEmail, phone: studentPhone },
      {
        onSuccess: () => {
          setTestStartTime(Date.now());
          setPhase("section1");
          scrollToTop();
        },
        onError: () => {
          setAnalysisError("Token sudah tidak valid. Silakan hubungi admin.");
        },
      }
    );
  };

  const handleSubmit = async () => {
    setPhase("analyzing");
    scrollToTop();

    const riasecScores = computeRiasecScores(riasecAnswers);
    const miScores = computeMiScores(miAnswers);
    const personalityProfile = computePersonalityProfile(personalityAnswers);
    const sjtProfile = computeSjtProfile(sjtAnswers);

    try {
      const result = await analyzeMutation.mutateAsync({
        studentName,
        studentEmail,
        studentPhone,
        profilDiri: profilAnswers,
        riasecScores,
        riasecAnswers,
        miScores,
        miAnswers,
        personalityProfile,
        personalityAnswers,
        sjtProfile,
        sjtAnswers,
        creativeAnswers,
        rankingAnswers,
        language: lang,
      });

      // Store resultId and pdfUrl for PDF download
      if (result.resultId) {
        setSavedResultId(result.resultId);
      }
      if (result.pdfUrl) {
        setPdfUrl(result.pdfUrl);
      }

      // Complete the token
      if (tokenParam && result.resultId) {
        completeTokenMutation.mutate({ token: tokenParam, resultId: result.resultId });
      }

      setPhase("emailSent");
      scrollToTop();
    } catch (err: any) {
      setAnalysisError(err.message || "Terjadi kesalahan saat menganalisis hasil tes.");
      setPhase("emailSent");
    }
  };

  // ========== SECTION NAVIGATION ==========
  const sectionPhases: Phase[] = ["section1", "section2", "section3", "section4", "section5", "section6", "section7"];
  const currentSectionNum = sectionPhases.indexOf(phase) + 1;

  const goNextSection = () => {
    const idx = sectionPhases.indexOf(phase);
    if (idx < sectionPhases.length - 1) {
      setPhase(sectionPhases[idx + 1]);
      scrollToTop();
    } else {
      handleSubmit();
    }
  };

  const goPrevSection = () => {
    const idx = sectionPhases.indexOf(phase);
    if (idx > 0) {
      setPhase(sectionPhases[idx - 1]);
      scrollToTop();
    }
  };

  // Section completion checks
  const isSection1Complete = () => {
    return profilDiriFields.filter(f => f.required).every(f => (profilAnswers[f.id] || "").trim() !== "");
  };
  const isSection2Complete = () => {
    const unanswered = riasecProQuestions.filter(q => riasecAnswers[q.id] === undefined);

    return unanswered.length === 0;
  };
  const isSection3Complete = () => miPairs.every(p => miAnswers[p.id] !== undefined);
  const isSection4Complete = () => personalityQuestions.every(q => personalityAnswers[q.id] !== undefined);
  const isSection5Complete = () => sjtQuestions.every(q => sjtAnswers[q.id] !== undefined);
  const isSection6Complete = () => creativeQuestions.every(q => (creativeAnswers[q.id] || "").length >= q.minLength);
  const isSection7Complete = () => rankingExercises.every(ex => rankingAnswers[ex.id]?.length > 0);

  const isCurrentSectionComplete = () => {
    switch (phase) {
      case "section1": return isSection1Complete();
      case "section2": return isSection2Complete();
      case "section3": return isSection3Complete();
      case "section4": return isSection4Complete();
      case "section5": return isSection5Complete();
      case "section6": return isSection6Complete();
      case "section7": return isSection7Complete();
      default: return false;
    }
  };

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div ref={topRef} />

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="min-h-screen">
          <Navigation currentPage="aptitude-pro" />
          <div className="container max-w-4xl mx-auto py-12 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" /> Premium AI Assessment
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Tes Bakat AI <span className="text-gradient-specta">Pro</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Tes bakat komprehensif dengan 7 dimensi penilaian dan analisis AI mendalam.
                Temukan potensi tersembunyimu dan dapatkan rekomendasi jurusan & karir yang tepat.
              </p>
            </motion.div>

            {/* Section overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {proSectionLabels.sections.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">{s.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{s.title[lang]}</h3>
                      <p className="text-xs text-gray-500">{s.duration}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.56 }}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-4 shadow-sm text-white"
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-8 h-8" />
                  <div>
                    <h3 className="font-semibold text-sm">Analisis AI Mendalam</h3>
                    <p className="text-xs text-indigo-100">Hasil dikirim ke email</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Important notes */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Perhatian Penting:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Tes ini membutuhkan waktu sekitar <strong>25 menit</strong>. Pastikan Anda memiliki waktu yang cukup.</li>
                    <li><strong>Jangan refresh atau tutup halaman</strong> selama tes berlangsung.</li>
                    <li>Jawab dengan jujur — tidak ada jawaban benar atau salah.</li>
                    <li>Link ini hanya bisa digunakan <strong>satu kali</strong>.</li>
                    <li>Hasil lengkap akan dikirim ke email Anda.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => { setPhase("leadCapture"); scrollToTop(); }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                Mulai Tes Bakat AI Pro
              </button>
            </div>
          </div>
          <Footer />
        </div>
      )}

      {/* ===== LEAD CAPTURE PHASE ===== */}
      {phase === "leadCapture" && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Data Diri</h2>
              <p className="text-sm text-gray-500 mt-1">Hasil tes akan dikirim ke email Anda</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Nama lengkap Anda"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="email@contoh.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp *</label>
                <input
                  type="tel" value={studentPhone} onChange={e => setStudentPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>

            {analysisError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{analysisError}</div>
            )}

            <button
              onClick={handleStartTest}
              disabled={!studentName.trim() || !studentEmail.trim() || !studentPhone.trim() || useTokenMutation.isPending}
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {useTokenMutation.isPending ? "Memvalidasi..." : "Mulai Tes →"}
            </button>
          </motion.div>
        </div>
      )}

      {/* ===== TEST SECTIONS ===== */}
      {sectionPhases.includes(phase) && (
        <div className="min-h-screen py-6 px-4">
          <div className="max-w-3xl mx-auto">
            {/* Header with timer */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Tes Bakat AI Pro</h2>
              {testStartTime > 0 && <Timer startTime={testStartTime} />}
            </div>

            {/* Section progress */}
            <SectionProgressBar currentSection={currentSectionNum} totalSections={7} lang={lang} />

            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                {/* ===== SECTION 1: PROFIL DIRI ===== */}
                {phase === "section1" && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="text-3xl">👤</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Profil Diri</h3>
                        <p className="text-sm text-gray-500">Ceritakan tentang dirimu</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      {profilDiriFields.map(field => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {field.label[lang]} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === "text" && (
                            <input
                              type="text"
                              value={profilAnswers[field.id] || ""}
                              onChange={e => setProfilAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                              placeholder={field.placeholder?.[lang]}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                          )}
                          {field.type === "select" && (
                            <select
                              value={profilAnswers[field.id] || ""}
                              onChange={e => setProfilAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                            >
                              <option value="">— Pilih —</option>
                              {field.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label[lang]}</option>
                              ))}
                            </select>
                          )}
                          {field.type === "textarea" && (
                            <textarea
                              value={profilAnswers[field.id] || ""}
                              onChange={e => setProfilAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                              placeholder={field.placeholder?.[lang]}
                              rows={3}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== SECTION 2: RIASEC LIKERT ===== */}
                {phase === "section2" && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-3xl">🎯</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Minat Karir</h3>
                        <p className="text-sm text-gray-500">Seberapa setuju kamu dengan pernyataan berikut?</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-6">Pertanyaan {riasecIndex + 1} dari {riasecProQuestions.length}</div>

                    {/* Progress bar for this section */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
                      <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((riasecIndex + 1) / riasecProQuestions.length) * 100}%` }} />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div key={riasecIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <p className="text-lg font-medium text-gray-900 mb-6 text-center">
                          "{riasecProQuestions[riasecIndex]?.text?.[lang] ?? ""}"
                        </p>
                        <div className="flex justify-center gap-2 sm:gap-3 mb-4">
                          {proSectionLabels.likertScale.map(scale => (
                            <button
                              key={scale.value}
                              onClick={() => {
                                setRiasecAnswers(prev => ({ ...prev, [riasecProQuestions[riasecIndex]?.id]: scale.value }));
                              }}
                              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl font-bold text-lg transition-all ${
                                riasecAnswers[riasecProQuestions[riasecIndex]?.id] === scale.value
                                  ? "bg-pink-500 text-white ring-2 ring-pink-300 ring-offset-2 scale-110"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {scale.value}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 px-2">
                          <span>Sangat Tidak Setuju</span>
                          <span>Sangat Setuju</span>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Question dot navigator */}
                    <div className="flex flex-wrap justify-center gap-1.5 mt-6 mb-4">
                      {riasecProQuestions.map((q, i) => (
                        <button
                          key={q.id}
                          onClick={() => setRiasecIndex(i)}
                          className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                            i === riasecIndex
                              ? "bg-pink-500 text-white ring-2 ring-pink-300 ring-offset-1 scale-110"
                              : riasecAnswers[q.id] !== undefined
                                ? "bg-pink-100 text-pink-600 hover:bg-pink-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    {/* Unanswered warning */}
                    {(() => {
                      const unanswered = riasecProQuestions.filter(q => riasecAnswers[q.id] === undefined);
                      if (unanswered.length > 0 && unanswered.length <= 5) {
                        return (
                          <div className="text-center text-sm text-amber-600 bg-amber-50 rounded-lg py-2 px-3 mb-4">
                            {unanswered.length} pertanyaan belum dijawab: {unanswered.map((q, i) => (
                              <button key={q.id} onClick={() => setRiasecIndex(riasecProQuestions.indexOf(q))}
                                className="underline font-medium hover:text-amber-700 mx-0.5">#{riasecProQuestions.indexOf(q) + 1}</button>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Mini nav for RIASEC */}
                    <div className="flex justify-between mt-4">
                      <button
                        onClick={() => setRiasecIndex(prev => Math.max(0, prev - 1))}
                        disabled={riasecIndex === 0}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30"
                      >
                        <ArrowLeft className="w-4 h-4" /> Sebelumnya
                      </button>
                      <button
                        onClick={() => {
                          if (riasecIndex < riasecProQuestions.length - 1) {
                            setRiasecIndex(prev => prev + 1);
                          }
                        }}
                        disabled={riasecIndex >= riasecProQuestions.length - 1 || !riasecAnswers[riasecProQuestions[riasecIndex]?.id]}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-30"
                      >
                        Selanjutnya <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== SECTION 3: MI FORCED CHOICE ===== */}
                {phase === "section3" && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-3xl">🧠</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Kecerdasan Majemuk</h3>
                        <p className="text-sm text-gray-500">Pilih pernyataan yang LEBIH menggambarkan dirimu</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-6">Pasangan {miIndex + 1} dari {miPairs.length}</div>

                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
                      <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((miIndex + 1) / miPairs.length) * 100}%` }} />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div key={miIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {["A", "B"].map(choice => {
                            const option = choice === "A" ? miPairs[miIndex]?.optionA : miPairs[miIndex]?.optionB;
                            const isSelected = miAnswers[miPairs[miIndex]?.id] === choice;
                            return (
                              <button
                                key={choice}
                                onClick={() => {
                                  setMiAnswers(prev => ({ ...prev, [miPairs[miIndex]?.id]: choice }));
                                }}
                                className={`p-5 rounded-xl border-2 text-left transition-all ${
                                  isSelected
                                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <div className={`text-xs font-bold mb-2 ${isSelected ? "text-amber-600" : "text-gray-400"}`}>
                                  Pilihan {choice}
                                </div>
                                <p className={`text-sm font-medium ${isSelected ? "text-amber-900" : "text-gray-700"}`}>
                                  {option.text[lang]}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Question dot navigator */}
                    <div className="flex flex-wrap justify-center gap-1.5 mt-6 mb-4">
                      {miPairs.map((p, i) => (
                        <button key={p.id} onClick={() => setMiIndex(i)}
                          className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                            i === miIndex ? "bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-1 scale-110"
                              : miAnswers[p.id] !== undefined ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}>{i + 1}</button>
                      ))}
                    </div>
                    {(() => {
                      const unanswered = miPairs.filter(p => miAnswers[p.id] === undefined);
                      if (unanswered.length > 0 && unanswered.length <= 5) {
                        return (<div className="text-center text-sm text-amber-600 bg-amber-50 rounded-lg py-2 px-3 mb-4">
                          {unanswered.length} pasangan belum dijawab: {unanswered.map(p => (
                            <button key={p.id} onClick={() => setMiIndex(miPairs.indexOf(p))}
                              className="underline font-medium hover:text-amber-700 mx-0.5">#{miPairs.indexOf(p) + 1}</button>
                          ))}
                        </div>);
                      }
                      return null;
                    })()}
                    <div className="flex justify-between mt-4">
                      <button onClick={() => setMiIndex(prev => Math.max(0, prev - 1))} disabled={miIndex === 0}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
                        <ArrowLeft className="w-4 h-4" /> Sebelumnya
                      </button>
                      <button onClick={() => { if (miIndex < miPairs.length - 1) setMiIndex(prev => prev + 1); }}
                        disabled={miIndex >= miPairs.length - 1 || !miAnswers[miPairs[miIndex]?.id]}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-30">
                        Selanjutnya <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== SECTION 4: PERSONALITY THIS-OR-THAT ===== */}
                {phase === "section4" && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-3xl">💎</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Kepribadian & Nilai</h3>
                        <p className="text-sm text-gray-500">Mana yang lebih menggambarkan dirimu?</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-6">Pertanyaan {personalityIndex + 1} dari {personalityQuestions.length}</div>

                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((personalityIndex + 1) / personalityQuestions.length) * 100}%` }} />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div key={personalityIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                          {["A", "B"].map(choice => {
                            const q = personalityQuestions[personalityIndex];
                            const option = choice === "A" ? q.optionA : q.optionB;
                            const isSelected = personalityAnswers[q.id] === choice;
                            return (
                              <button
                                key={choice}
                                onClick={() => {
                                  setPersonalityAnswers(prev => ({ ...prev, [q.id]: choice }));
                                }}
                                className={`flex-1 p-6 rounded-xl border-2 text-center transition-all ${
                                  isSelected
                                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 scale-[1.02]"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <p className={`text-sm font-medium ${isSelected ? "text-emerald-900" : "text-gray-700"}`}>
                                  {option.text[lang]}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex justify-center mt-3">
                          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">atau</span>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Question dot navigator */}
                    <div className="flex flex-wrap justify-center gap-1.5 mt-6 mb-4">
                      {personalityQuestions.map((q, i) => (
                        <button key={q.id} onClick={() => setPersonalityIndex(i)}
                          className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                            i === personalityIndex ? "bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-1 scale-110"
                              : personalityAnswers[q.id] !== undefined ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}>{i + 1}</button>
                      ))}
                    </div>
                    {(() => {
                      const unanswered = personalityQuestions.filter(q => personalityAnswers[q.id] === undefined);
                      if (unanswered.length > 0 && unanswered.length <= 5) {
                        return (<div className="text-center text-sm text-amber-600 bg-amber-50 rounded-lg py-2 px-3 mb-4">
                          {unanswered.length} pertanyaan belum dijawab: {unanswered.map(q => (
                            <button key={q.id} onClick={() => setPersonalityIndex(personalityQuestions.indexOf(q))}
                              className="underline font-medium hover:text-amber-700 mx-0.5">#{personalityQuestions.indexOf(q) + 1}</button>
                          ))}
                        </div>);
                      }
                      return null;
                    })()}
                    <div className="flex justify-between mt-4">
                      <button onClick={() => setPersonalityIndex(prev => Math.max(0, prev - 1))} disabled={personalityIndex === 0}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
                        <ArrowLeft className="w-4 h-4" /> Sebelumnya
                      </button>
                      <button onClick={() => { if (personalityIndex < personalityQuestions.length - 1) setPersonalityIndex(prev => prev + 1); }}
                        disabled={personalityIndex >= personalityQuestions.length - 1 || !personalityAnswers[personalityQuestions[personalityIndex]?.id]}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-30">
                        Selanjutnya <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== SECTION 5: SJT SCENARIOS ===== */}
                {phase === "section5" && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-3xl">🎭</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Penilaian Situasi</h3>
                        <p className="text-sm text-gray-500">Apa yang akan kamu lakukan dalam situasi ini?</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-6">Skenario {sjtIndex + 1} dari {sjtQuestions.length}</div>

                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
                      <div className="bg-violet-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((sjtIndex + 1) / sjtQuestions.length) * 100}%` }} />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div key={sjtIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        {/* Scenario box */}
                        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-6">
                          <p className="text-sm font-medium text-violet-900 leading-relaxed">
                            {sjtQuestions[sjtIndex]?.scenario?.[lang] ?? ""}
                          </p>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                          {(sjtQuestions[sjtIndex]?.options ?? []).map(option => {
                            const isSelected = sjtAnswers[sjtQuestions[sjtIndex]?.id] === option.value;
                            return (
                              <button
                                key={option.value}
                                onClick={() => {
                                  setSjtAnswers(prev => ({ ...prev, [sjtQuestions[sjtIndex]?.id]: option.value }));
                                }}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                                  isSelected
                                    ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                  isSelected ? "bg-violet-500 text-white" : "bg-gray-200 text-gray-500"
                                }`}>
                                  {option.value}
                                </div>
                                <p className={`text-sm ${isSelected ? "text-violet-900 font-medium" : "text-gray-700"}`}>
                                  {option.text[lang]}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Question dot navigator */}
                    <div className="flex flex-wrap justify-center gap-1.5 mt-6 mb-4">
                      {sjtQuestions.map((q, i) => (
                        <button key={q.id} onClick={() => setSjtIndex(i)}
                          className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                            i === sjtIndex ? "bg-violet-500 text-white ring-2 ring-violet-300 ring-offset-1 scale-110"
                              : sjtAnswers[q.id] !== undefined ? "bg-violet-100 text-violet-600 hover:bg-violet-200"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}>{i + 1}</button>
                      ))}
                    </div>
                    {(() => {
                      const unanswered = sjtQuestions.filter(q => sjtAnswers[q.id] === undefined);
                      if (unanswered.length > 0 && unanswered.length <= 3) {
                        return (<div className="text-center text-sm text-amber-600 bg-amber-50 rounded-lg py-2 px-3 mb-4">
                          {unanswered.length} skenario belum dijawab: {unanswered.map(q => (
                            <button key={q.id} onClick={() => setSjtIndex(sjtQuestions.indexOf(q))}
                              className="underline font-medium hover:text-amber-700 mx-0.5">#{sjtQuestions.indexOf(q) + 1}</button>
                          ))}
                        </div>);
                      }
                      return null;
                    })()}
                    <div className="flex justify-between mt-4">
                      <button onClick={() => setSjtIndex(prev => Math.max(0, prev - 1))} disabled={sjtIndex === 0}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
                        <ArrowLeft className="w-4 h-4" /> Sebelumnya
                      </button>
                      <button onClick={() => { if (sjtIndex < sjtQuestions.length - 1) setSjtIndex(prev => prev + 1); }}
                        disabled={sjtIndex >= sjtQuestions.length - 1 || !sjtAnswers[sjtQuestions[sjtIndex]?.id]}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-30">
                        Selanjutnya <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== SECTION 6: CREATIVE OPEN-ENDED ===== */}
                {phase === "section6" && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-3xl">✍️</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Pemikiran Kreatif</h3>
                        <p className="text-sm text-gray-500">Tuliskan jawabanmu dengan jujur dan detail</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-6">Pertanyaan {creativeIndex + 1} dari {creativeQuestions.length}</div>

                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
                      <div className="bg-red-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((creativeIndex + 1) / creativeQuestions.length) * 100}%` }} />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div key={creativeIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
                          <p className="text-sm font-medium text-red-900 leading-relaxed">
                            {creativeQuestions[creativeIndex]?.text?.[lang] ?? ""}
                          </p>
                        </div>

                        <textarea
                          value={creativeAnswers[creativeQuestions[creativeIndex]?.id] || ""}
                          onChange={e => setCreativeAnswers(prev => ({ ...prev, [creativeQuestions[creativeIndex]?.id]: e.target.value }))}
                          placeholder={creativeQuestions[creativeIndex]?.placeholder?.[lang]}
                          rows={6}
                          maxLength={creativeQuestions[creativeIndex]?.maxLength}
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                        />
                        <div className="flex justify-between mt-2 text-xs">
                          <span className={`${
                            (creativeAnswers[creativeQuestions[creativeIndex]?.id] || "").length < (creativeQuestions[creativeIndex]?.minLength ?? 0)
                              ? "text-red-500" : "text-green-600"
                          }`}>
                            {(creativeAnswers[creativeQuestions[creativeIndex]?.id] || "").length} / min {creativeQuestions[creativeIndex]?.minLength ?? 0} karakter
                          </span>
                          <span className="text-gray-400">
                            max {creativeQuestions[creativeIndex]?.maxLength ?? 0}
                          </span>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-between mt-6">
                      <button onClick={() => setCreativeIndex(prev => Math.max(0, prev - 1))} disabled={creativeIndex === 0}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
                        <ArrowLeft className="w-4 h-4" /> Sebelumnya
                      </button>
                      <button onClick={() => { if (creativeIndex < creativeQuestions.length - 1) setCreativeIndex(prev => prev + 1); }}
                        disabled={creativeIndex >= creativeQuestions.length - 1}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-30">
                        Selanjutnya <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== SECTION 7: RANKING ===== */}
                {phase === "section7" && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-3xl">📊</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Prioritas Hidup</h3>
                        <p className="text-sm text-gray-500">Seret dan urutkan dari yang paling penting</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-6">Latihan {rankingIndex + 1} dari {rankingExercises.length}</div>

                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
                      <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((rankingIndex + 1) / rankingExercises.length) * 100}%` }} />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div key={rankingIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-5">
                          <p className="text-sm font-medium text-sky-900">
                            {rankingExercises[rankingIndex]?.instruction?.[lang] ?? ""}
                          </p>
                        </div>

                        <Reorder.Group
                          axis="y"
                          values={rankingAnswers[rankingExercises[rankingIndex]?.id] || []}
                          onReorder={(newOrder) => {
                            setRankingAnswers(prev => ({ ...prev, [rankingExercises[rankingIndex]?.id]: newOrder }));
                          }}
                          className="space-y-2"
                        >
                          {(rankingAnswers[rankingExercises[rankingIndex]?.id] || []).map((itemValue, idx) => {
                            const item = rankingExercises[rankingIndex]?.items?.find(i => i.value === itemValue);
                            if (!item) return null;
                            return (
                              <Reorder.Item
                                key={itemValue}
                                value={itemValue}
                                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                    idx === 0 ? "bg-sky-500 text-white" :
                                    idx === 1 ? "bg-sky-400 text-white" :
                                    idx === 2 ? "bg-sky-300 text-white" :
                                    "bg-gray-200 text-gray-500"
                                  }`}>
                                    {idx + 1}
                                  </div>
                                  <span className="text-sm font-medium text-gray-800">{item.label[lang]}</span>
                                </div>
                                <GripVertical className="w-5 h-5 text-gray-400 shrink-0" />
                              </Reorder.Item>
                            );
                          })}
                        </Reorder.Group>

                        <p className="text-xs text-gray-400 mt-3 text-center">💡 Seret item untuk mengubah urutan</p>
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-between mt-6">
                      <button onClick={() => setRankingIndex(prev => Math.max(0, prev - 1))} disabled={rankingIndex === 0}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
                        <ArrowLeft className="w-4 h-4" /> Sebelumnya
                      </button>
                      <button onClick={() => { if (rankingIndex < rankingExercises.length - 1) setRankingIndex(prev => prev + 1); }}
                        disabled={rankingIndex >= rankingExercises.length - 1}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-30">
                        Selanjutnya <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Section navigation buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={goPrevSection}
                disabled={phase === "section1"}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Bagian Sebelumnya
              </button>
              <button
                onClick={goNextSection}
                disabled={!isCurrentSectionComplete()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  phase === "section7"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {phase === "section7" ? (
                  <>Kirim & Analisis <Sparkles className="w-4 h-4" /></>
                ) : (
                  <>Bagian Selanjutnya <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ANALYZING PHASE ===== */}
      {phase === "analyzing" && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-md">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">AI Sedang Menganalisis...</h2>
            <p className="text-gray-600 mb-2">Menganalisis 7 dimensi penilaian dari jawaban Anda</p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>🎯 Minat karir & RIASEC profile</p>
              <p>🧠 Kecerdasan majemuk</p>
              <p>💎 Kepribadian & nilai hidup</p>
              <p>🎭 Soft skills & penilaian situasi</p>
              <p>✍️ Analisis pemikiran kreatif</p>
              <p>📊 Prioritas & preferensi</p>
            </div>
            <p className="text-xs text-gray-400 mt-6">Proses ini membutuhkan waktu 30-60 detik...</p>
          </motion.div>
        </div>
      )}

      {/* ===== EMAIL SENT PHASE ===== */}
      {phase === "emailSent" && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
            {analysisError ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h2>
                <p className="text-gray-600 mb-6">{analysisError}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Tes Selesai! 🎉</h2>
                <p className="text-gray-600 mb-2">
                  Terima kasih, <strong>{studentName}</strong>!
                </p>
                <p className="text-gray-600 mb-6">
                  Hasil analisis AI Pro lengkap sedang dikirim ke <strong>{studentEmail}</strong>.
                  Silakan cek inbox (dan folder spam) Anda dalam beberapa menit.
                </p>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 text-left">
                  <h3 className="text-sm font-semibold text-indigo-900 mb-2">Laporan Anda mencakup:</h3>
                  <ul className="text-xs text-indigo-700 space-y-1">
                    <li>✅ Profil kepribadian lengkap (Big Five + RIASEC)</li>
                    <li>✅ Peta kecerdasan majemuk</li>
                    <li>✅ Analisis soft skills dari penilaian situasi</li>
                    <li>✅ Analisis AI dari jawaban kreatif Anda</li>
                    <li>✅ Rekomendasi jurusan kuliah (5 pilihan terbaik)</li>
                    <li>✅ Prospek karir & jalur profesional</li>
                    <li>✅ Ringkasan untuk orang tua</li>
                  </ul>
                </div>
              </>
            )}

            {!analysisError && (pdfUrl || savedResultId) && (
              <div className="mb-4 space-y-2">
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    {lang === "id" ? "Download Laporan PDF" : "Download PDF Report"}
                  </a>
                ) : savedResultId ? (
                  <AptitudeReportDownload resultId={savedResultId} studentName={studentName} language={lang} />
                ) : null}
                <p className="text-xs text-gray-400 mt-1">
                  {lang === "id" ? "PDF juga dikirim sebagai lampiran email" : "PDF is also attached to your email"}
                </p>
              </div>
            )}

            <a
              href="https://wa.me/6281287878055?text=Halo%20SpecTa%2C%20saya%20baru%20saja%20menyelesaikan%20Tes%20Bakat%20AI%20Pro"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition-colors"
            >
              💬 Konsultasi Hasil via WhatsApp
            </a>
          </motion.div>
        </div>
      )}
    </div>
  );
}
