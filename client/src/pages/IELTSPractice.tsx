import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { BookOpen, PenTool, Headphones, Mic, Clock, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle, Star, Loader2, User, Mail, Phone, RefreshCw, Play, Pause, Volume2, RotateCcw } from "lucide-react";
import { Streamdown } from "streamdown";

type Section = "reading" | "writing" | "listening" | "speaking";
type Phase = "register" | "select" | "practice" | "scoring" | "results";

const SECTIONS = [
  { id: "reading" as Section, label: "Reading", icon: BookOpen, color: "from-emerald-500 to-teal-600", bgLight: "bg-emerald-50", textColor: "text-emerald-700", description: "Academic passage with comprehension questions", time: "15 min", questions: "8 questions" },
  { id: "writing" as Section, label: "Writing", icon: PenTool, color: "from-blue-500 to-indigo-600", bgLight: "bg-blue-50", textColor: "text-blue-700", description: "Task 2 essay with AI scoring on all 4 criteria", time: "40 min", questions: "1 essay" },
  { id: "listening" as Section, label: "Listening", icon: Headphones, color: "from-purple-500 to-violet-600", bgLight: "bg-purple-50", textColor: "text-purple-700", description: "Realistic IELTS Section 1 conversation with audio playback", time: "10 min", questions: "6 questions" },
  { id: "speaking" as Section, label: "Speaking", icon: Mic, color: "from-orange-500 to-red-500", bgLight: "bg-orange-50", textColor: "text-orange-700", description: "All 3 parts with sample answers & tips", time: "15 min", questions: "3 parts" },
];

export default function IELTSPractice() {
  useEffect(() => {
    document.title = "IELTS Practice Tests | SpecTa Education";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Practice IELTS with SpecTa Education. Free practice tests for reading, writing, listening, and speaking sections.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Practice IELTS with SpecTa Education. Free practice tests for reading, writing, listening, and speaking sections.';
      document.head.appendChild(meta);
    }
  }, []);

  const [phase, setPhase] = useState<Phase>("register");
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [studentInfo, setStudentInfo] = useState({ name: "", email: "", phone: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [essayText, setEssayText] = useState("");
  const [speakingAnswers, setSpeakingAnswers] = useState<Record<string, string>>({});
  const [resultData, setResultData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const playAudio = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Natural IELTS listening speed
    utterance.pitch = 1;
    utterance.lang = 'en-GB';
    // Try to pick a clear English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang === 'en-GB' && v.name.includes('Female')) 
      || voices.find(v => v.lang === 'en-GB') 
      || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
    
    utterance.onstart = () => { setIsPlaying(true); setAudioProgress(0); };
    utterance.onend = () => { setIsPlaying(false); setAudioProgress(100); setPlayCount(c => c + 1); };
    utterance.onpause = () => setIsPlaying(false);
    utterance.onresume = () => setIsPlaying(true);
    
    // Simulate progress based on faster rate
    const words = text.split(/\s+/).length;
    const estimatedDuration = (words / 3.2) * 1000; // ~3.2 words/sec at 1.1 rate
    let startTime = Date.now();
    const progressInterval = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(progressInterval); return; }
      const elapsed = Date.now() - startTime;
      setAudioProgress(Math.min(95, (elapsed / estimatedDuration) * 100));
    }, 200);
    
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const pauseAudio = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  }, []);

  const resumeAudio = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    }
  }, []);

  const stopAudio = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setAudioProgress(0);
  }, []);

  // Cleanup speech on unmount or section change
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, [selectedSection]);

  const generateMutation = trpc.ieltsPractice.generateQuestions.useMutation();
  const scoreMutation = trpc.ieltsPractice.scoreAnswers.useMutation();

  const handleRegister = () => {
    if (!studentInfo.name || !studentInfo.email) return;
    setPhase("select");
  };

  const handleStartPractice = (section: Section) => {
    setSelectedSection(section);
    setAnswers({});
    setEssayText("");
    setSpeakingAnswers({});
    setResultData(null);
    generateMutation.mutate(
      { section, difficulty: "intermediate" },
      { onSuccess: () => setPhase("practice") }
    );
  };

  const handleSubmitAnswers = () => {
    if (!selectedSection || !generateMutation.data?.data) return;
    setPhase("scoring");

    let questionsStr = JSON.stringify(generateMutation.data.data);
    let answersStr = "";

    if (selectedSection === "reading" || selectedSection === "listening") {
      answersStr = JSON.stringify(answers);
    } else if (selectedSection === "writing") {
      answersStr = essayText;
    } else {
      answersStr = JSON.stringify(speakingAnswers);
    }

    scoreMutation.mutate({
      section: selectedSection,
      questions: questionsStr,
      answers: answersStr,
      studentName: studentInfo.name,
      studentEmail: studentInfo.email,
      studentPhone: studentInfo.phone || undefined,
    }, {
      onSuccess: (data) => {
        if (data.success) {
          setResultData(data.data);
          setPhase("results");
        }
      }
    });
  };

  const questionData = generateMutation.data?.data;

  // ===== REGISTER PHASE =====
  if (phase === "register") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <Navigation />
        <div className="container max-w-lg pt-32 pb-20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <BookOpen className="w-4 h-4" />
              IELTS AI Practice
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Your Practice Session</h1>
            <p className="text-gray-600">Enter your details to begin. Your results will be saved and scored by AI.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={studentInfo.name}
                  onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Your full name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={studentInfo.email}
                  onChange={(e) => setStudentInfo({ ...studentInfo, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={studentInfo.phone}
                  onChange={(e) => setStudentInfo({ ...studentInfo, phone: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="+62 xxx xxxx xxxx"
                />
              </div>
            </div>
            <button
              onClick={handleRegister}
              disabled={!studentInfo.name || !studentInfo.email}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg"
            >
              Continue to Practice →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== SECTION SELECT PHASE =====
  if (phase === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <Navigation />
        <section className="pt-28 pb-6 px-4">
          <div className="container max-w-4xl text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Practice Section</span>
            </h1>
            <p className="text-gray-600 mb-2">Welcome, <strong>{studentInfo.name}</strong>! Select a section to practice.</p>
          </div>
        </section>

        {/* Warning */}
        <div className="container max-w-3xl mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-800 font-medium text-sm">Important: Do not reload or refresh the page during the test.</p>
              <p className="text-amber-700 text-xs mt-1">Your progress will be lost if you leave or refresh the page.</p>
            </div>
          </div>
        </div>

        <div className="container max-w-3xl pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => handleStartPractice(section.id)}
                  disabled={generateMutation.isPending}
                  className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left border border-gray-100"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{section.label}</h3>
                  <p className="text-gray-500 text-sm mb-3">{section.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`${section.bgLight} ${section.textColor} px-2.5 py-1 rounded-full font-medium`}>
                      <Clock className="w-3 h-3 inline mr-1" />{section.time}
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">{section.questions}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {generateMutation.isPending && (
            <div className="mt-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Generating your practice questions with AI...</p>
              <p className="text-gray-400 text-sm mt-1">This may take a few seconds</p>
            </div>
          )}

          {generateMutation.isError && (
            <div className="mt-6 bg-red-50 text-red-700 p-4 rounded-xl text-center">
              Failed to generate questions. Please try again.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== PRACTICE PHASE =====
  if (phase === "practice" && questionData && selectedSection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <Navigation />
        <div className="container max-w-4xl pt-28 pb-20">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setPhase("select")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${SECTIONS.find(s => s.id === selectedSection)?.bgLight} ${SECTIONS.find(s => s.id === selectedSection)?.textColor}`}>
              {selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)} Practice
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-amber-800 text-sm font-medium">Do not reload this page. Your progress will be lost.</p>
          </div>

          {/* READING SECTION */}
          {selectedSection === "reading" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{((questionData as any).title || "").replace(/<[^>]*>/g, "")}</h2>
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-xl">
                  {(() => {
                    const raw = (questionData as any).passage || "";
                    // Strip all HTML tags
                    const cleaned = raw.replace(/<[^>]*>/g, "");
                    // Split by double newlines or multiple newlines for paragraphs
                    const paragraphs = cleaned.split(/\n\n+/).filter((p: string) => p.trim());
                    if (paragraphs.length <= 1) {
                      // If no paragraph breaks found, try splitting by sentences (every ~3-4 sentences)
                      const sentences = cleaned.split(/(?<=[.!?])\s+/);
                      const chunks: string[] = [];
                      for (let i = 0; i < sentences.length; i += 4) {
                        chunks.push(sentences.slice(i, i + 4).join(" "));
                      }
                      return chunks.map((chunk: string, idx: number) => (
                        <p key={idx} className="mb-4 last:mb-0 text-[15px] leading-7">{chunk.trim()}</p>
                      ));
                    }
                    return paragraphs.map((para: string, idx: number) => (
                      <p key={idx} className="mb-4 last:mb-0 text-[15px] leading-7">{para.trim()}</p>
                    ));
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Questions</h3>
                <div className="space-y-6">
                  {(questionData as any).questions?.map((q: any) => (
                    <div key={q.id} className="p-4 bg-gray-50 rounded-xl">
                      <p className="font-medium text-gray-900 mb-3">Q{q.id}. {q.question}</p>
                      {q.type === "multiple_choice" && q.options ? (
                        <div className="space-y-2">
                          {q.options.map((opt: string, i: number) => (
                            <label key={i} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${answers[`q${q.id}`] === opt.charAt(0) ? 'bg-indigo-100 border border-indigo-300' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                              <input
                                type="radio"
                                name={`q${q.id}`}
                                value={opt.charAt(0)}
                                checked={answers[`q${q.id}`] === opt.charAt(0)}
                                onChange={(e) => setAnswers({ ...answers, [`q${q.id}`]: e.target.value })}
                                className="accent-indigo-600"
                              />
                              <span className="text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : q.type === "true_false_notgiven" ? (
                        <div className="flex gap-3">
                          {["True", "False", "Not Given"].map(opt => (
                            <button
                              key={opt}
                              onClick={() => setAnswers({ ...answers, [`q${q.id}`]: opt })}
                              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${answers[`q${q.id}`] === opt ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={answers[`q${q.id}`] || ""}
                          onChange={(e) => setAnswers({ ...answers, [`q${q.id}`]: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Type your answer..."
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSubmitAnswers} className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 shadow-lg transition-all flex items-center gap-2">
                  Submit Answers <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* WRITING SECTION */}
          {selectedSection === "writing" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mb-3">
                  <PenTool className="w-4 h-4" />
                  {(questionData as any).taskType}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{(questionData as any).question}</h2>
                <p className="text-gray-600 text-sm bg-blue-50 p-4 rounded-xl">{(questionData as any).instructions}</p>
                
                {(questionData as any).tips && (
                  <div className="mt-4 space-y-1">
                    <p className="text-sm font-medium text-gray-700">Tips:</p>
                    {(questionData as any).tips.map((tip: string, i: number) => (
                      <p key={i} className="text-sm text-gray-500">• {tip}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Your Essay</h3>
                  <span className="text-sm text-gray-400">{essayText.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm leading-relaxed"
                  placeholder="Write your essay here... (minimum 250 words recommended)"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSubmitAnswers}
                  disabled={essayText.split(/\s+/).filter(Boolean).length < 50}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg transition-all flex items-center gap-2"
                >
                  Submit Essay <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* LISTENING SECTION */}
          {selectedSection === "listening" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Listening Practice</h2>
                <p className="text-sm text-gray-500 mb-4">{(questionData as any).scenario}</p>
                
                {/* Audio Player */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 mb-4 border border-purple-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                      <Headphones className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-purple-900">Audio Recording</h3>
                      <p className="text-xs text-purple-600">Listen carefully — you can replay up to 2 times (played {playCount}/2)</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-purple-200 rounded-full h-2 mb-4">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-violet-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!isPlaying ? (
                      <button
                        onClick={() => {
                          if (playCount >= 2 && audioProgress === 100) return;
                          if (window.speechSynthesis.paused) { resumeAudio(); }
                          else { playAudio((questionData as any).transcript); }
                        }}
                        disabled={playCount >= 2 && audioProgress === 100}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 shadow-md transition-all"
                      >
                        <Play className="w-4 h-4" /> {audioProgress > 0 && audioProgress < 100 ? 'Resume' : 'Play Audio'}
                      </button>
                    ) : (
                      <button
                        onClick={pauseAudio}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 shadow-md transition-all"
                      >
                        <Pause className="w-4 h-4" /> Pause
                      </button>
                    )}
                    <button
                      onClick={() => { stopAudio(); playAudio((questionData as any).transcript); }}
                      disabled={playCount >= 2}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-sm hover:bg-purple-50 disabled:opacity-50 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" /> Replay
                    </button>
                    <div className="flex items-center gap-1 ml-auto text-purple-600">
                      <Volume2 className="w-4 h-4" />
                      <span className="text-xs font-medium">British English</span>
                    </div>
                  </div>
                  
                  {playCount >= 2 && audioProgress === 100 && (
                    <p className="text-xs text-purple-600 mt-3 font-medium">You've used both listening attempts. Answer the questions below.</p>
                  )}
                </div>

                {/* Instructions - no transcript shown */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800 font-medium">Instructions:</p>
                  <p className="text-sm text-amber-700 mt-1">Listen to the audio carefully and answer the questions below. You may play the audio up to 2 times, just like in the real IELTS test. The transcript is hidden — focus on listening!</p>
                </div>

                {(questionData as any).tips && (
                  <div className="bg-gray-50 rounded-xl p-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Listening Tips:</p>
                    {(questionData as any).tips.map((tip: string, i: number) => (
                      <p key={i} className="text-sm text-gray-500">• {tip}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Questions</h3>
                <div className="space-y-6">
                  {(questionData as any).questions?.map((q: any) => (
                    <div key={q.id} className="p-4 bg-gray-50 rounded-xl">
                      <p className="font-medium text-gray-900 mb-3">Q{q.id}. {q.question}</p>
                      {q.type === "multiple_choice" && q.options ? (
                        <div className="space-y-2">
                          {q.options.map((opt: string, i: number) => (
                            <label key={i} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${answers[`q${q.id}`] === opt.charAt(0) ? 'bg-purple-100 border border-purple-300' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                              <input
                                type="radio"
                                name={`q${q.id}`}
                                value={opt.charAt(0)}
                                checked={answers[`q${q.id}`] === opt.charAt(0)}
                                onChange={(e) => setAnswers({ ...answers, [`q${q.id}`]: e.target.value })}
                                className="accent-purple-600"
                              />
                              <span className="text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={answers[`q${q.id}`] || ""}
                          onChange={(e) => setAnswers({ ...answers, [`q${q.id}`]: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                          placeholder="Type your answer..."
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSubmitAnswers} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-violet-700 shadow-lg transition-all flex items-center gap-2">
                  Submit Answers <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SPEAKING SECTION */}
          {selectedSection === "speaking" && (
            <div className="space-y-6">
              {/* Part 1 */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-2 text-orange-600 font-medium text-sm mb-4">
                  <Mic className="w-4 h-4" />
                  Part 1 - Introduction & Interview
                </div>
                <h3 className="font-bold text-gray-900 mb-4">Topic: {(questionData as any).part1?.topic}</h3>
                <div className="space-y-4">
                  {(questionData as any).part1?.questions?.map((q: string, i: number) => (
                    <div key={i}>
                      <p className="font-medium text-gray-800 mb-2">Q{i + 1}. {q}</p>
                      <textarea
                        value={speakingAnswers[`p1q${i}`] || ""}
                        onChange={(e) => setSpeakingAnswers({ ...speakingAnswers, [`p1q${i}`]: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none text-sm"
                        placeholder="Type what you would say..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Part 2 */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-2 text-orange-600 font-medium text-sm mb-4">
                  <Mic className="w-4 h-4" />
                  Part 2 - Long Turn (Cue Card)
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-4">
                  <p className="text-orange-900 whitespace-pre-line text-sm leading-relaxed">{(questionData as any).part2?.cueCard}</p>
                </div>
                <textarea
                  value={speakingAnswers["p2"] || ""}
                  onChange={(e) => setSpeakingAnswers({ ...speakingAnswers, p2: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none text-sm"
                  placeholder="Write your 1-2 minute response here..."
                />
              </div>

              {/* Part 3 */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-2 text-orange-600 font-medium text-sm mb-4">
                  <Mic className="w-4 h-4" />
                  Part 3 - Discussion
                </div>
                <h3 className="font-bold text-gray-900 mb-4">Topic: {(questionData as any).part3?.topic}</h3>
                <div className="space-y-4">
                  {(questionData as any).part3?.questions?.map((q: string, i: number) => (
                    <div key={i}>
                      <p className="font-medium text-gray-800 mb-2">Q{i + 1}. {q}</p>
                      <textarea
                        value={speakingAnswers[`p3q${i}`] || ""}
                        onChange={(e) => setSpeakingAnswers({ ...speakingAnswers, [`p3q${i}`]: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none text-sm"
                        placeholder="Type what you would say..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              {(questionData as any).tips && (
                <div className="bg-amber-50 rounded-2xl p-6">
                  <h3 className="font-bold text-amber-900 mb-3">Speaking Tips</h3>
                  {(questionData as any).tips.map((tip: string, i: number) => (
                    <p key={i} className="text-sm text-amber-800 mb-1">• {tip}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={handleSubmitAnswers} className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-red-700 shadow-lg transition-all flex items-center gap-2">
                  Submit for AI Scoring <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== SCORING PHASE =====
  if (phase === "scoring") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <Navigation />
        <div className="container max-w-lg pt-40 pb-20 text-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">AI is Scoring Your Answers</h2>
          <p className="text-gray-500">Our AI examiner is analyzing your responses and generating detailed feedback. This may take 10-20 seconds...</p>
          <div className="mt-8 flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== RESULTS PHASE =====
  if (phase === "results" && resultData) {
    const sectionConfig = SECTIONS.find(s => s.id === selectedSection);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <Navigation />
        <div className="container max-w-4xl pt-28 pb-20">
          {/* Score Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="text-green-600 font-medium">Practice Complete</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Estimated Band Score</h1>
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${sectionConfig?.color} text-white text-4xl font-bold shadow-xl my-4`}>
              {resultData.bandScore || "N/A"}
            </div>
            <p className="text-gray-500 mt-2">{selectedSection?.charAt(0).toUpperCase()}{selectedSection?.slice(1)} Section</p>
          </div>

          {/* Detailed Results */}
          {(selectedSection === "reading" || selectedSection === "listening") && resultData.questionResults && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Score: {resultData.correctCount}/{resultData.totalQuestions} correct
              </h3>
              <div className="space-y-3">
                {resultData.questionResults.map((qr: any) => (
                  <div key={qr.id} className={`p-4 rounded-xl ${qr.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 ${qr.correct ? 'text-green-600' : 'text-red-600'}`}>
                        {qr.correct ? '✓' : '✗'}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">Question {qr.id}</p>
                        <p className="text-sm text-gray-600 mt-1">Your answer: <strong>{qr.studentAnswer || '(no answer)'}</strong></p>
                        {!qr.correct && <p className="text-sm text-green-700 mt-1">Correct: <strong>{qr.correctAnswer}</strong></p>}
                        {qr.explanation && <p className="text-xs text-gray-500 mt-1">{qr.explanation}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Writing/Speaking Criteria */}
          {(selectedSection === "writing" || selectedSection === "speaking") && resultData.criteria && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Scoring Criteria Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(resultData.criteria).map(([key, val]: [string, any]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-lg font-bold text-indigo-600">{val.band}</span>
                    </div>
                    <p className="text-xs text-gray-500">{val.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">AI Feedback</h3>
            <div className="prose prose-sm max-w-none text-gray-700">
              <Streamdown>{resultData.overallFeedback || resultData.feedback || "Great effort! Keep practicing to improve your score."}</Streamdown>
            </div>
            
            {resultData.strengths && (
              <div className="mt-6">
                <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2"><Star className="w-4 h-4" /> Strengths</h4>
                {resultData.strengths.map((s: string, i: number) => (
                  <p key={i} className="text-sm text-gray-600 mb-1">✓ {s}</p>
                ))}
              </div>
            )}

            {resultData.improvements && (
              <div className="mt-4">
                <h4 className="font-bold text-amber-700 mb-2">Areas to Improve</h4>
                {resultData.improvements.map((s: string, i: number) => (
                  <p key={i} className="text-sm text-gray-600 mb-1">→ {s}</p>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => setPhase("select")}
              className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Practice Another Section
            </button>
            <a
              href="/ielts"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Explore IELTS Courses
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <Navigation />
      <div className="container max-w-lg pt-40 pb-20 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
