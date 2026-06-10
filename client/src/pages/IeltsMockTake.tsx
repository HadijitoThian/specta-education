import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Headphones, BookOpen, FileText, MessageCircle, Lock, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function IeltsMockTake() {
  const [, params] = useRoute<{ token: string }>("/ielts/mock-test/take/:token");
  const token = params?.token ?? "";
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const attemptQuery = trpc.ielts.getAttempt.useQuery(
    { token },
    { enabled: !!token && !!user, refetchOnWindowFocus: false }
  );

  const startSkill = trpc.ielts.startSkill.useMutation({
    onSuccess: () => {
      utils.ielts.getAttempt.invalidate({ token });
    },
  });

  // ----- Gates -----

  if (!token) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold mb-2">Missing attempt token</h1>
          <Link href="/ielts/mock-test" className="text-blue-600 hover:underline">
            Back to mock test page
          </Link>
        </Card>
      </Shell>
    );
  }

  if (authLoading || attemptQuery.isLoading) {
    return (
      <Shell>
        <Card>Loading…</Card>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold mb-2">Sign in to take your test</h1>
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </Card>
      </Shell>
    );
  }

  if (attemptQuery.isError) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold mb-2">Attempt not found</h1>
          <p className="text-sm text-slate-600">
            The link may have expired or belongs to a different account.
          </p>
        </Card>
      </Shell>
    );
  }

  const status = attemptQuery.data?.attempt.status;
  const test = attemptQuery.data?.test;
  const paidAt = attemptQuery.data?.attempt.paidAt;

  if (!paidAt) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold mb-2">Awaiting payment</h1>
          <p className="text-sm text-slate-600">
            Once your payment is confirmed by Xendit, this page will unlock
            automatically.
          </p>
        </Card>
      </Shell>
    );
  }

  // ----- Dispatch by status -----

  if (status === "ready") {
    return (
      <Shell>
        <Lobby
          test={test}
          onStartListening={() => startSkill.mutate({ token, skill: "listening" })}
          starting={startSkill.isPending}
        />
      </Shell>
    );
  }

  if (status === "listening") {
    return (
      <Shell>
        <ListeningRunner
          token={token}
          onFinished={() => setLocation(`/ielts/mock-test/take/${token}`)}
        />
      </Shell>
    );
  }

  if (status === "reading") {
    return (
      <Shell wide>
        <ReadingRunner
          token={token}
          onFinished={() => setLocation(`/ielts/mock-test/take/${token}`)}
        />
      </Shell>
    );
  }

  if (status === "writing") {
    return (
      <Shell wide>
        <WritingRunner
          token={token}
          onFinished={() => setLocation(`/ielts/mock-test/take/${token}`)}
        />
      </Shell>
    );
  }

  if (status === "speaking") {
    return (
      <Shell>
        <SpeakingRunner
          token={token}
          onFinished={() => setLocation(`/ielts/mock-test/take/${token}`)}
        />
      </Shell>
    );
  }

  if (status === "grading" || status === "completed") {
    setLocation(`/ielts/mock-test/report/${token}`);
    return (
      <Shell>
        <Card>Loading your report…</Card>
      </Shell>
    );
  }

  if (status === "abandoned") {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold mb-2">This attempt was cancelled</h1>
          <p className="text-sm text-slate-600">
            If you'd like to take another mock test,{" "}
            <Link href="/ielts/mock-test" className="text-blue-600 hover:underline">
              purchase a new attempt
            </Link>
            .
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>Unknown attempt status: {status}</Card>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------

function Lobby({
  test,
  onStartListening,
  starting,
}: {
  test?: { code: string; title: string; testType: "academic" | "general" } | null;
  onStartListening: () => void;
  starting: boolean;
}) {
  return (
    <Card>
      <SEO
        title="Your IELTS Mock Test | SpecTa Education"
        description="Take your purchased SpecTa IELTS Mock Test — Listening, Reading, Writing, Speaking."
      />
      <div className="mb-6">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full mb-2">
          Unlocked
        </span>
        <h1 className="text-2xl font-bold text-slate-900">
          {test ? test.title : "Your IELTS mock test"}
        </h1>
        {test ? (
          <p className="text-sm text-slate-500 mt-1">
            {test.testType === "academic" ? "Academic" : "General Training"} · Code {test.code}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <SkillCard icon={Headphones} title="Listening" detail="~30 min · 40 Q" active />
        <SkillCard icon={BookOpen} title="Reading" detail="60 min · 40 Q" />
        <SkillCard icon={FileText} title="Writing" detail="60 min · T1+T2" />
        <SkillCard icon={MessageCircle} title="Speaking" detail="Live AI examiner" />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-6">
        <strong>Before you start the Listening section:</strong>
        <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-900/80">
          <li>Put on your headphones and check the volume.</li>
          <li>The audio plays <strong>once</strong>. You can't pause or rewind.</li>
          <li>You'll have time after each section to finalise your answers.</li>
          <li>Don't close this tab — answers auto-save every few seconds.</li>
        </ul>
      </div>

      <button
        onClick={onStartListening}
        disabled={starting}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 rounded-lg transition shadow flex items-center justify-center gap-2"
      >
        {starting ? "Starting…" : "Start Listening"}
        <ArrowRight className="w-4 h-4" />
      </button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Listening Runner
// ---------------------------------------------------------------------------

type Question = {
  id: number;
  sectionId: number;
  questionNumber: number;
  questionType: string;
  prompt: string;
  options: unknown;
};

type Section = {
  id: number;
  sectionNumber: number;
  audioUrl: string | null;
  durationSec: number | null;
  questions: Question[];
};

function ListeningRunner({
  token,
  onFinished,
}: {
  token: string;
  onFinished: () => void;
}) {
  const contentQuery = trpc.ielts.getListeningContent.useQuery(
    { token },
    { refetchOnWindowFocus: false }
  );

  const saveMut = trpc.ielts.saveListeningAnswers.useMutation();
  const finishMut = trpc.ielts.finishListening.useMutation({
    onSuccess: onFinished,
  });

  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [audioFinished, setAudioFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPositionRef = useRef(0);

  // Once content arrives, hydrate any saved answers (resume support).
  useEffect(() => {
    if (contentQuery.data?.existingAnswers) {
      setAnswers(prev => {
        const next = { ...prev };
        for (const a of contentQuery.data!.existingAnswers) {
          next[a.questionId] = a.answer;
        }
        return next;
      });
    }
  }, [contentQuery.data]);

  // Debounced auto-save every ~4 seconds when answers change.
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const t = setTimeout(() => {
      const payload = Object.entries(answers).map(([qid, val]) => ({
        questionId: Number(qid),
        answer: val,
      }));
      saveMut.mutate({ token, answers: payload });
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  const sections: Section[] = (contentQuery.data?.sections as any) ?? [];
  const totalQuestions = useMemo(
    () => sections.reduce((sum, s) => sum + s.questions.length, 0),
    [sections]
  );
  const answeredCount = Object.values(answers).filter(v => v.trim().length > 0).length;

  // Timer: shared across all sections, server-enforced cap.
  const timeLimitSec = contentQuery.data?.timeLimitSec ?? 35 * 60;
  const startedAt = contentQuery.data?.attempt.startedAt
    ? new Date(contentQuery.data.attempt.startedAt).getTime()
    : Date.now();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secondsLeft = Math.max(
    0,
    timeLimitSec - Math.floor((now - startedAt) / 1000)
  );
  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  // Auto-submit if time runs out.
  useEffect(() => {
    if (secondsLeft === 0 && !finishMut.isPending && contentQuery.data) {
      const payload = Object.entries(answers).map(([qid, val]) => ({
        questionId: Number(qid),
        answer: val,
      }));
      if (payload.length > 0) saveMut.mutate({ token, answers: payload });
      finishMut.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (contentQuery.isLoading) {
    return <Card>Loading Listening section…</Card>;
  }
  if (contentQuery.isError) {
    return (
      <Card>
        <h1 className="text-xl font-semibold mb-2">Could not load Listening</h1>
        <p className="text-sm text-slate-600">{contentQuery.error.message}</p>
      </Card>
    );
  }

  const section = sections[sectionIdx];
  if (!section) {
    return (
      <Card>
        <h1 className="text-xl font-semibold mb-2">No section data</h1>
      </Card>
    );
  }

  const handleAdvance = () => {
    // Save current state before advancing.
    const payload = Object.entries(answers).map(([qid, val]) => ({
      questionId: Number(qid),
      answer: val,
    }));
    if (payload.length > 0) {
      saveMut.mutate({ token, answers: payload });
    }
    setAudioFinished(false);
    lastPositionRef.current = 0;
    if (sectionIdx + 1 < sections.length) {
      setSectionIdx(sectionIdx + 1);
    } else {
      finishMut.mutate({ token });
    }
  };

  const isLastSection = sectionIdx + 1 >= sections.length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="text-sm text-slate-600 font-medium">
          Listening · Section{" "}
          <span className="text-slate-900 font-bold">{section.sectionNumber}</span> of {sections.length}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            {answeredCount}/{totalQuestions} answered
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono ${
              secondsLeft < 60
                ? "bg-red-100 text-red-700"
                : secondsLeft < 5 * 60
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {mm}:{ss}
          </div>
        </div>
      </div>

      {/* Audio player */}
      <div className="px-6 pt-6">
        <div className="bg-slate-100 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">
                Audio · Section {section.sectionNumber}
              </div>
              <div className="text-xs text-slate-500">
                Plays once. No rewind. No pause.
              </div>
            </div>
            {audioFinished ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 text-xs">
                <CheckCircle2 className="w-3 h-3" /> Audio done
              </span>
            ) : null}
          </div>
          {section.audioUrl ? (
            <audio
              ref={audioRef}
              src={section.audioUrl}
              autoPlay
              controls
              controlsList="nodownload noplaybackrate"
              className="w-full"
              onTimeUpdate={() => {
                if (audioRef.current) {
                  lastPositionRef.current = audioRef.current.currentTime;
                }
              }}
              onSeeking={() => {
                // Block seek backward; allow it to land where it was.
                if (audioRef.current) {
                  audioRef.current.currentTime = lastPositionRef.current;
                }
              }}
              onEnded={() => setAudioFinished(true)}
            />
          ) : (
            <div className="text-sm text-red-600">
              No audio available for this section. Tell admin to upload it.
            </div>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="px-6 py-6">
        <div className="space-y-5">
          {section.questions.map(q => (
            <QuestionRow
              key={q.id}
              q={q}
              value={answers[q.id] ?? ""}
              onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
            />
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-500">
          {audioFinished ? (
            <span className="text-emerald-700">Ready to move on.</span>
          ) : (
            <span>Wait for the audio to finish before advancing.</span>
          )}
        </div>
        <button
          onClick={handleAdvance}
          disabled={!audioFinished || finishMut.isPending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2"
        >
          {isLastSection
            ? finishMut.isPending
              ? "Finishing…"
              : "Submit Listening"
            : "Next section"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reading Runner
// ---------------------------------------------------------------------------

type Passage = {
  id: number;
  passageNumber: number;
  title: string;
  body: string;
  questions: Question[];
};

function ReadingRunner({
  token,
  onFinished,
}: {
  token: string;
  onFinished: () => void;
}) {
  const contentQuery = trpc.ielts.getReadingContent.useQuery(
    { token },
    { refetchOnWindowFocus: false }
  );

  const saveMut = trpc.ielts.saveReadingAnswers.useMutation();
  const finishMut = trpc.ielts.finishReading.useMutation({
    onSuccess: onFinished,
  });

  const [passageIdx, setPassageIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    if (contentQuery.data?.existingAnswers) {
      setAnswers(prev => {
        const next = { ...prev };
        for (const a of contentQuery.data!.existingAnswers) {
          next[a.questionId] = a.answer;
        }
        return next;
      });
    }
  }, [contentQuery.data]);

  // Debounced auto-save every ~4s.
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const t = setTimeout(() => {
      const payload = Object.entries(answers).map(([qid, val]) => ({
        questionId: Number(qid),
        answer: val,
      }));
      saveMut.mutate({ token, answers: payload });
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  const passages: Passage[] = (contentQuery.data?.passages as any) ?? [];
  const totalQuestions = useMemo(
    () => passages.reduce((sum, p) => sum + p.questions.length, 0),
    [passages]
  );
  const answeredCount = Object.values(answers).filter(v => v.trim().length > 0).length;

  const timeLimitSec = contentQuery.data?.timeLimitSec ?? 60 * 60;
  const startedAt = contentQuery.data?.attempt.startedAt
    ? new Date(contentQuery.data.attempt.startedAt).getTime()
    : Date.now();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Reading uses its own 60-min budget — but startedAt is shared across the
  // whole attempt, so we cap to the time since *Reading* began heuristically
  // (best-effort): subtract any time already spent on Listening assumed at
  // most 35 min. For now we just use a simple 60-min countdown from now.
  // (Refined later when we add explicit per-skill start timestamps.)
  const [readingStarted] = useState(() => Date.now());
  const secondsLeft = Math.max(
    0,
    timeLimitSec - Math.floor((now - readingStarted) / 1000)
  );
  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  useEffect(() => {
    if (secondsLeft === 0 && !finishMut.isPending && contentQuery.data) {
      const payload = Object.entries(answers).map(([qid, val]) => ({
        questionId: Number(qid),
        answer: val,
      }));
      if (payload.length > 0) saveMut.mutate({ token, answers: payload });
      finishMut.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (contentQuery.isLoading) {
    return <Card>Loading Reading section…</Card>;
  }
  if (contentQuery.isError) {
    return (
      <Card>
        <h1 className="text-xl font-semibold mb-2">Could not load Reading</h1>
        <p className="text-sm text-slate-600">{contentQuery.error.message}</p>
      </Card>
    );
  }

  const passage = passages[passageIdx];
  if (!passage) {
    return (
      <Card>
        <h1 className="text-xl font-semibold mb-2">No passage data</h1>
      </Card>
    );
  }

  const handleAdvance = () => {
    const payload = Object.entries(answers).map(([qid, val]) => ({
      questionId: Number(qid),
      answer: val,
    }));
    if (payload.length > 0) saveMut.mutate({ token, answers: payload });
    if (passageIdx + 1 < passages.length) {
      setPassageIdx(passageIdx + 1);
      window.scrollTo(0, 0);
    } else {
      finishMut.mutate({ token });
    }
  };

  const isLastPassage = passageIdx + 1 >= passages.length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="text-sm text-slate-600 font-medium">
          Reading · Passage{" "}
          <span className="text-slate-900 font-bold">{passage.passageNumber}</span> of {passages.length}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            {answeredCount}/{totalQuestions} answered
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono ${
              secondsLeft < 60
                ? "bg-red-100 text-red-700"
                : secondsLeft < 5 * 60
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {mm}:{ss}
          </div>
        </div>
      </div>

      {/* Split pane */}
      <div className="grid lg:grid-cols-2 gap-6 p-6">
        {/* Passage */}
        <div className="lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto pr-2">
          <h2 className="text-lg font-bold text-slate-900 mb-3 sticky top-0 bg-white py-2">
            Passage {passage.passageNumber}: {passage.title}
          </h2>
          <article className="prose prose-sm max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
            {passage.body}
          </article>
        </div>

        {/* Questions */}
        <div className="lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto pl-2">
          <h2 className="text-lg font-bold text-slate-900 mb-3 sticky top-0 bg-white py-2">
            Questions
          </h2>
          <div className="space-y-4">
            {passage.questions.map(q => (
              <QuestionRow
                key={q.id}
                q={q}
                value={answers[q.id] ?? ""}
                onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-500">
          You can revisit any answer within this passage before advancing.
        </div>
        <button
          onClick={handleAdvance}
          disabled={finishMut.isPending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2"
        >
          {isLastPassage
            ? finishMut.isPending
              ? "Finishing…"
              : "Submit Reading"
            : "Next passage"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Writing Runner
// ---------------------------------------------------------------------------

type WritingTask = {
  id: number;
  taskNumber: number;
  taskFormat: "chart" | "letter" | "essay";
  prompt: string;
  imageUrl: string | null;
  minWords: number;
  timeLimitSec: number;
};

function WritingRunner({
  token,
  onFinished,
}: {
  token: string;
  onFinished: () => void;
}) {
  const contentQuery = trpc.ielts.getWritingContent.useQuery(
    { token },
    { refetchOnWindowFocus: false }
  );

  const saveMut = trpc.ielts.saveWritingDraft.useMutation();
  const finishMut = trpc.ielts.finishWriting.useMutation({
    onSuccess: onFinished,
  });

  const [taskIdx, setTaskIdx] = useState(0);
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [taskStartedAt, setTaskStartedAt] = useState<number>(Date.now());

  useEffect(() => {
    if (contentQuery.data?.existingResponses) {
      setTexts(prev => {
        const next = { ...prev };
        for (const r of contentQuery.data!.existingResponses) {
          next[r.taskId] = r.studentText;
        }
        return next;
      });
    }
  }, [contentQuery.data]);

  // Reset task timer when switching tasks.
  useEffect(() => {
    setTaskStartedAt(Date.now());
  }, [taskIdx]);

  const tasks: WritingTask[] = (contentQuery.data?.tasks as any) ?? [];
  const task = tasks[taskIdx];

  const text = (task && texts[task.id]) ?? "";
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  // Debounced autosave every ~6s.
  useEffect(() => {
    if (!task) return;
    if (text.length === 0) return;
    const t = setTimeout(() => {
      saveMut.mutate({ token, taskId: task.id, text });
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, task]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = task
    ? Math.max(
        0,
        task.timeLimitSec - Math.floor((now - taskStartedAt) / 1000)
      )
    : 0;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  // Auto-advance if time runs out.
  useEffect(() => {
    if (!task) return;
    if (secondsLeft === 0 && !finishMut.isPending && contentQuery.data) {
      void handleAdvance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (contentQuery.isLoading) {
    return <Card>Loading Writing tasks…</Card>;
  }
  if (contentQuery.isError) {
    return (
      <Card>
        <h1 className="text-xl font-semibold mb-2">Could not load Writing</h1>
        <p className="text-sm text-slate-600">{contentQuery.error.message}</p>
      </Card>
    );
  }
  if (!task) return <Card>No Writing tasks for this test.</Card>;

  const wordsHit = wordCount >= task.minWords;
  const isLastTask = taskIdx + 1 >= tasks.length;

  async function handleAdvance() {
    // Save final state for this task.
    if (task && text.length > 0) {
      await saveMut.mutateAsync({ token, taskId: task.id, text });
    }
    if (isLastTask) {
      finishMut.mutate({ token });
    } else {
      setTaskIdx(taskIdx + 1);
      window.scrollTo(0, 0);
    }
  }

  const finishing = finishMut.isPending;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="text-sm text-slate-600 font-medium">
          Writing · Task{" "}
          <span className="text-slate-900 font-bold">{task.taskNumber}</span> of {tasks.length}
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              wordsHit
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            {wordCount} / {task.minWords} words
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono ${
              secondsLeft < 60
                ? "bg-red-100 text-red-700"
                : secondsLeft < 5 * 60
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {mm}:{ss}
          </div>
        </div>
      </div>

      {/* Split: prompt + image (left) / textarea (right) */}
      <div className="grid lg:grid-cols-2 gap-6 p-6">
        <div className="lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto pr-2">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
            Task {task.taskNumber} prompt
          </div>
          {task.imageUrl ? (
            <div className="mb-4 rounded-xl overflow-hidden border border-slate-200">
              <img
                src={task.imageUrl}
                alt={`Task ${task.taskNumber} visual`}
                className="w-full h-auto object-contain bg-white"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : null}
          <article className="prose prose-sm max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
            {task.prompt}
          </article>
          <div className="mt-4 text-xs text-slate-500">
            Minimum {task.minWords} words · Recommended time{" "}
            {Math.round(task.timeLimitSec / 60)} min
          </div>
        </div>

        <div className="lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto pl-2">
          <textarea
            value={text}
            onChange={e =>
              setTexts(prev => ({ ...prev, [task.id]: e.target.value }))
            }
            placeholder={`Write your response to Task ${task.taskNumber} here…`}
            className="w-full h-[60vh] p-4 border border-slate-300 rounded-xl text-sm text-slate-800 font-serif leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <div className="text-xs text-slate-400 mt-2 flex justify-between">
            <span>Auto-saves every few seconds.</span>
            <span>{saveMut.isPending ? "Saving…" : "Saved."}</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-500">
          {finishing
            ? "AI is grading your responses against the IELTS rubric — this can take up to a minute…"
            : wordsHit
              ? "You've hit the word target. You can polish or submit."
              : `${task.minWords - wordCount} more words to hit the minimum.`}
        </div>
        <button
          onClick={() => void handleAdvance()}
          disabled={finishing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2"
        >
          {isLastTask
            ? finishing
              ? "Grading…"
              : "Submit Writing"
            : "Next task"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Speaking Runner (live AI examiner, turn-based)
// ---------------------------------------------------------------------------

type ConversationTurn = {
  id: number;
  partNumber: number;
  turnOrder: number;
  role: "examiner" | "student";
  text: string;
  audioUrl: string | null;
};

function SpeakingRunner({
  token,
  onFinished,
}: {
  token: string;
  onFinished: () => void;
}) {
  const utils = trpc.useUtils();
  const stateQuery = trpc.ielts.getSpeakingState.useQuery(
    { token },
    { refetchOnWindowFocus: false }
  );
  const nextTurnMut = trpc.ielts.nextExaminerTurn.useMutation({
    onSuccess: () => utils.ielts.getSpeakingState.invalidate({ token }),
  });
  const submitMut = trpc.ielts.submitStudentTurn.useMutation({
    onSuccess: () => utils.ielts.getSpeakingState.invalidate({ token }),
  });
  const finishMut = trpc.ielts.finishSpeaking.useMutation({
    onSuccess: onFinished,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [examinerPlayedFor, setExaminerPlayedFor] = useState<number | null>(null);

  if (stateQuery.isLoading) {
    return <Card>Loading Speaking session…</Card>;
  }
  if (stateQuery.isError) {
    return (
      <Card>
        <h1 className="text-xl font-semibold mb-2">Could not start Speaking</h1>
        <p className="text-sm text-slate-600">{stateQuery.error.message}</p>
      </Card>
    );
  }

  const conversation: ConversationTurn[] =
    (stateQuery.data?.conversation as any) ?? [];
  const allPromptsDone = !!stateQuery.data?.allPromptsDone;
  const nextPrompt = stateQuery.data?.nextPrompt ?? null;
  const lastExaminerTurn = [...conversation]
    .reverse()
    .find(t => t.role === "examiner");
  const examinerCount = conversation.filter(t => t.role === "examiner").length;
  const studentCount = conversation.filter(t => t.role === "student").length;
  // The student should respond if examiner has more turns than student.
  const awaitingStudent = examinerCount > studentCount;

  const partLabel = lastExaminerTurn
    ? `Part ${lastExaminerTurn.partNumber}`
    : nextPrompt
      ? `Part ${nextPrompt.partNumber}`
      : "";

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: pickMimeType(),
      });
      chunksRef.current = [];
      mr.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        stream.getTracks().forEach(t => t.stop());
        // Real IELTS rules: no re-record, no preview. Auto-submit immediately.
        void autoSubmitBlob(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (err: any) {
      setMicError(
        err?.message ??
          "Couldn't access your microphone. Please allow mic access and reload."
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function autoSubmitBlob(blob: Blob) {
    if (!lastExaminerTurn) return;
    const base64 = await blobToBase64(blob);
    await submitMut.mutateAsync({
      token,
      partNumber: lastExaminerTurn.partNumber,
      base64,
      contentType: blob.type || "audio/webm",
    });
  }

  async function playNextExaminerTurn() {
    setExaminerPlayedFor(null);
    await nextTurnMut.mutateAsync({ token });
  }

  async function finish() {
    finishMut.mutate({ token });
  }

  // Auto-play examiner audio once it arrives.
  useEffect(() => {
    if (!lastExaminerTurn) return;
    if (examinerPlayedFor === lastExaminerTurn.id) return;
    if (!awaitingStudent) return;
    if (lastExaminerTurn.audioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.src = lastExaminerTurn.audioUrl;
      void audioPlayerRef.current.play().catch(() => {});
      setExaminerPlayedFor(lastExaminerTurn.id);
    } else if (!lastExaminerTurn.audioUrl) {
      // No audio (TTS failed) — mark as played so UI moves on.
      setExaminerPlayedFor(lastExaminerTurn.id);
    }
  }, [lastExaminerTurn, awaitingStudent, examinerPlayedFor]);

  // Lobby — no turns yet.
  if (conversation.length === 0 && !allPromptsDone) {
    return (
      <Card>
        <h1 className="text-xl font-semibold mb-2">
          Speaking — live AI examiner
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          You'll have a real conversation with an AI IELTS examiner ("Emma")
          across 3 parts:
        </p>
        <ul className="list-disc list-inside text-sm text-slate-600 mb-6 space-y-1">
          <li>
            <strong>Part 1</strong> — short questions about familiar topics
          </li>
          <li>
            <strong>Part 2</strong> — a 1-2 minute long-turn cue-card
          </li>
          <li>
            <strong>Part 3</strong> — abstract discussion related to Part 2
          </li>
        </ul>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-6">
          <strong>Before you start:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-900/80">
            <li>Allow microphone access when prompted.</li>
            <li>Speak naturally — Emma will respond like a real examiner.</li>
            <li>Each answer is recorded, transcribed, and graded.</li>
          </ul>
        </div>
        <button
          onClick={() => playNextExaminerTurn()}
          disabled={nextTurnMut.isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 rounded-lg transition shadow flex items-center justify-center gap-2"
        >
          {nextTurnMut.isPending ? "Starting Emma…" : "Start Speaking"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </Card>
    );
  }

  // All prompts done — finish button.
  if (allPromptsDone && examinerCount === studentCount) {
    return (
      <Card>
        <h1 className="text-xl font-semibold mb-2">All parts complete 🎉</h1>
        <p className="text-sm text-slate-600 mb-4">
          Emma has finished her questions. Click below to submit Speaking —
          our AI grader will score your responses against the IELTS rubric
          (this takes up to a minute).
        </p>
        <button
          onClick={finish}
          disabled={finishMut.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition"
        >
          {finishMut.isPending
            ? "Grading Speaking…"
            : "Submit Speaking & Finish Test"}
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-xs uppercase tracking-wider text-blue-700 font-semibold mb-1">
        {partLabel} · Speaking
      </div>
      <h1 className="text-xl font-semibold mb-4">Live AI examiner: Emma</h1>

      {/* Conversation log */}
      <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
        {conversation.map(t =>
          t.role === "examiner" ? (
            <div key={t.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                E
              </div>
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-2xl rounded-tl-sm px-4 py-2">
                <div className="text-sm text-slate-800 whitespace-pre-wrap">{t.text}</div>
                {t.audioUrl ? (
                  <audio
                    src={t.audioUrl}
                    controls
                    className="mt-2 w-full max-w-sm"
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div key={t.id} className="flex items-start gap-3 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                You
              </div>
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tr-sm px-4 py-2">
                <div className="text-sm text-slate-800 whitespace-pre-wrap italic">
                  {t.text || "(transcribing…)"}
                </div>
                {t.audioUrl ? (
                  <audio
                    src={t.audioUrl}
                    controls
                    className="mt-2 w-full max-w-sm"
                  />
                ) : null}
              </div>
            </div>
          )
        )}
      </div>

      <audio ref={audioPlayerRef} hidden />

      {/* Cue card display (Part 2 only) */}
      {lastExaminerTurn?.partNumber === 2 &&
      stateQuery.data?.prompts.find(
        p =>
          p.partNumber === 2 &&
          p.promptOrder === conversation.filter(c => c.role === "examiner" && c.partNumber === 2).length
      )?.cueCardText ? (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-4">
          <div className="text-xs uppercase tracking-wider text-amber-800 font-semibold mb-2">
            Your cue card
          </div>
          <div className="text-sm text-slate-800 whitespace-pre-wrap">
            {
              stateQuery.data!.prompts.find(
                p =>
                  p.partNumber === 2 &&
                  p.promptOrder ===
                    conversation.filter(
                      c => c.role === "examiner" && c.partNumber === 2
                    ).length
              )?.cueCardText
            }
          </div>
          <div className="text-xs text-amber-700 mt-2">
            You'll have ~1 minute to prepare, then speak for 1-2 minutes.
          </div>
        </div>
      ) : null}

      {micError ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          {micError}
        </div>
      ) : null}

      {/* Control row — real-IELTS rules: no preview, no re-record. */}
      {awaitingStudent ? (
        submitMut.isPending ? (
          <button
            disabled
            className="w-full bg-slate-300 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            Sending your response…
          </button>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            ⏺ Stop recording &amp; submit
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            🎤 Start recording your answer
          </button>
        )
      ) : (
        <button
          onClick={() => playNextExaminerTurn()}
          disabled={nextTurnMut.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          {nextTurnMut.isPending ? "Emma is thinking…" : "Next question"}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </Card>
  );
}

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const c of candidates) {
    try {
      if ((MediaRecorder as any).isTypeSupported?.(c)) return c;
    } catch {}
  }
  return "audio/webm";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  // Chunk to avoid call-stack issues with very large arrays.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK))
    );
  }
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// Question renderer
// ---------------------------------------------------------------------------

function QuestionRow({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  const options = Array.isArray(q.options) ? (q.options as string[]) : null;

  // Fixed-option Reading types that don't carry their own options array.
  const fixedOptions: string[] | null =
    q.questionType === "tfng"
      ? ["TRUE", "FALSE", "NOT GIVEN"]
      : q.questionType === "ynng"
        ? ["YES", "NO", "NOT GIVEN"]
        : null;

  // Reading "matching" variants — all rendered as a dropdown of options.
  const isMatching =
    q.questionType === "matching" ||
    q.questionType === "map_labelling" ||
    q.questionType === "matching_headings" ||
    q.questionType === "matching_information" ||
    q.questionType === "matching_features" ||
    q.questionType === "matching_sentence_endings";

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {q.questionNumber}
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {q.prompt}
          </div>

          <div className="mt-3">
            {fixedOptions ? (
              <div className="flex flex-wrap gap-2">
                {fixedOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      value === opt
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : q.questionType === "mcq" && options ? (
              <div className="space-y-1">
                {options.map((opt, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 rounded px-2 py-1"
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={value === opt}
                      onChange={() => onChange(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : q.questionType === "multi_select" && options ? (
              <div className="space-y-1">
                {options.map((opt, i) => {
                  const selected = value
                    .split("|")
                    .map(s => s.trim())
                    .filter(Boolean);
                  const isChecked = selected.includes(opt);
                  return (
                    <label
                      key={i}
                      className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = isChecked
                            ? selected.filter(s => s !== opt)
                            : [...selected, opt];
                          onChange(next.join("|"));
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            ) : isMatching && options ? (
              <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— pick one —</option>
                {options.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Your answer"
                className="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={120}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell + helpers
// ---------------------------------------------------------------------------

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation currentPage="ielts" />
      <div className="pt-24 pb-12 px-4">
        <div className={wide ? "max-w-6xl mx-auto" : "max-w-3xl mx-auto"}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      {children}
    </div>
  );
}

function SkillCard({
  icon: Icon,
  title,
  detail,
  active,
}: {
  icon: any;
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        active
          ? "border-blue-300 bg-blue-50"
          : "border-slate-200 bg-slate-50 opacity-70"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${active ? "text-blue-700" : "text-slate-500"}`} />
        <span className={`text-sm font-semibold ${active ? "text-blue-900" : "text-slate-700"}`}>
          {title}
        </span>
        {!active ? <Lock className="w-3 h-3 text-slate-400 ml-auto" /> : null}
      </div>
      <div className="text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
