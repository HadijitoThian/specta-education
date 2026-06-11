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

  const status = attemptQuery.data?.attempt.status;

  // Redirect to the report once grading/completed. Done in an effect (NOT
  // during render) to avoid a render-time side effect that breaks hooks.
  useEffect(() => {
    if (status === "grading" || status === "completed") {
      setLocation(`/ielts/mock-test/report/${token}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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
    // The useEffect above handles the actual redirect; just show a spinner.
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

/**
 * Smart questions area for Listening. Renders different layouts depending
 * on what's in the section:
 *   - If most questions are note_completion with [GROUP: ...] headers,
 *     render a unified "notes" view (one structured outline with input
 *     fields inline at each blank).
 *   - If multiple questions are matching (Section 3 pattern), render a
 *     compact table with a single shared legend.
 *   - Otherwise, fall back to the default per-question card list.
 */
function ListeningQuestionsArea({
  section,
  answers,
  onChange,
}: {
  section: Section;
  answers: Record<number, string>;
  onChange: (qid: number, val: string) => void;
}) {
  const qs = section.questions;
  const noteCompCount = qs.filter(q => q.questionType === "note_completion")
    .length;
  const matchingCount = qs.filter(
    q =>
      q.questionType === "matching" ||
      q.questionType === "matching_headings" ||
      q.questionType === "matching_features"
  ).length;

  const notesQuestions = qs.filter(q => q.questionType === "note_completion");
  const matchingQuestions = qs.filter(
    q =>
      q.questionType === "matching" ||
      q.questionType === "matching_headings" ||
      q.questionType === "matching_features"
  );
  const otherQuestions = qs.filter(
    q =>
      q.questionType !== "note_completion" &&
      !(
        q.questionType === "matching" ||
        q.questionType === "matching_headings" ||
        q.questionType === "matching_features"
      )
  );

  return (
    <div className="space-y-5">
      {/* Default questions first (e.g., the MCQ batch in Section 2/3). */}
      {otherQuestions.length > 0 ? (
        <div className="grid sm:grid-cols-1 gap-2">
          {otherQuestions.map(q => (
            <QuestionRow
              key={q.id}
              q={q}
              value={answers[q.id] ?? ""}
              onChange={val => onChange(q.id, val)}
              compact
            />
          ))}
        </div>
      ) : null}

      {/* Matching block (Section 3 pattern). */}
      {matchingCount >= 3 ? (
        <MatchingTable
          questions={matchingQuestions}
          answers={answers}
          onChange={onChange}
        />
      ) : null}

      {/* Notes view (Section 4 + Section 2 note batch). */}
      {noteCompCount >= 5 ? (
        <NotesView
          questions={notesQuestions}
          answers={answers}
          onChange={onChange}
        />
      ) : noteCompCount > 0 ? (
        // Few note_completion questions — render them in the default list.
        notesQuestions.map(q => (
          <QuestionRow
            key={q.id}
            q={q}
            value={answers[q.id] ?? ""}
            onChange={val => onChange(q.id, val)}
            compact
          />
        ))
      ) : null}
    </div>
  );
}

/** Parses "[GROUP: header]\n- bullet line" out of a question prompt. */
function parseNotePrompt(prompt: string): { group: string | null; line: string } {
  const trimmed = prompt.trim();
  const groupMatch = trimmed.match(/^\[GROUP:\s*([^\]]+)\]\s*\n?([\s\S]*)$/i);
  if (groupMatch) {
    return { group: groupMatch[1].trim(), line: groupMatch[2].trim() };
  }
  return { group: null, line: trimmed };
}

/**
 * Notes-view layout. Groups consecutive note_completion questions by their
 * leading [GROUP: ...] header (or "Notes" fallback) and renders each group
 * as a header followed by bullet rows with input fields inline at the
 * `..........` placeholder.
 */
function NotesView({
  questions,
  answers,
  onChange,
}: {
  questions: Question[];
  answers: Record<number, string>;
  onChange: (qid: number, val: string) => void;
}) {
  // Group by walking through the question list. A question inherits the
  // previous group if it doesn't define one.
  const groups: Array<{ header: string; items: Question[] }> = [];
  let currentHeader = "Notes";
  let currentItems: Question[] = [];
  for (const q of questions) {
    const parsed = parseNotePrompt(q.prompt);
    if (parsed.group && parsed.group !== currentHeader) {
      if (currentItems.length > 0) {
        groups.push({ header: currentHeader, items: currentItems });
      }
      currentHeader = parsed.group;
      currentItems = [q];
    } else {
      currentItems.push(q);
    }
  }
  if (currentItems.length > 0) {
    groups.push({ header: currentHeader, items: currentItems });
  }

  return (
    <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 space-y-4">
      <div className="text-xs uppercase tracking-wider text-amber-900/70 font-semibold">
        Notes
      </div>
      {groups.map((g, gi) => (
        <div key={gi}>
          <div className="font-bold text-slate-900 mb-2 text-sm">
            {g.header}
          </div>
          <ul className="space-y-1.5 pl-1">
            {g.items.map(q => {
              const parsed = parseNotePrompt(q.prompt);
              const line = parsed.line.replace(/^\-\s*/, "");
              // Split the line at the placeholder (.......... of any length).
              const parts = line.split(/\.{3,}/);
              const before = parts[0]?.trim() ?? "";
              const after = parts.slice(1).join(" ").trim();
              return (
                <li
                  key={q.id}
                  className="text-sm text-slate-800 leading-relaxed flex flex-wrap items-baseline gap-1.5"
                >
                  <span className="w-6 text-xs font-bold text-slate-500 shrink-0">
                    {q.questionNumber}.
                  </span>
                  <span>•</span>
                  <span>{before}</span>
                  <input
                    type="text"
                    value={answers[q.id] ?? ""}
                    onChange={e => onChange(q.id, e.target.value)}
                    placeholder="answer"
                    className="inline-block min-w-[6rem] max-w-[14rem] border-b-2 border-amber-400 focus:outline-none focus:border-amber-600 bg-white/70 px-1.5 py-0 text-sm font-medium"
                    maxLength={80}
                  />
                  {after ? <span>{after}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Matching-table layout. Shows a single legend of options at the top, then
 * a compact list of questions with a dropdown next to each.
 */
function MatchingTable({
  questions,
  answers,
  onChange,
}: {
  questions: Question[];
  answers: Record<number, string>;
  onChange: (qid: number, val: string) => void;
}) {
  // Collect the unique option set across all matching questions.
  const optionSet = new Set<string>();
  for (const q of questions) {
    const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
    for (const o of opts) optionSet.add(o);
  }
  const options = Array.from(optionSet);

  return (
    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
        Matching — pick one for each question
      </div>
      {options.length > 0 ? (
        <div className="text-xs text-slate-600 mb-3 bg-white rounded-lg border border-slate-200 px-3 py-2">
          <div className="font-semibold mb-1">Options:</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {options.map((o, i) => (
              <span key={i}>{o}</span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        {questions.map(q => {
          const opts = Array.isArray(q.options) ? (q.options as string[]) : options;
          // Render the prompt (strip any [GROUP:...] markers just in case).
          const cleanPrompt = q.prompt
            .replace(/^\[GROUP:[^\]]+\]\s*\n?/i, "")
            .trim();
          return (
            <div
              key={q.id}
              className="flex items-start gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {q.questionNumber}
              </div>
              <div className="flex-1 text-sm text-slate-800 leading-relaxed">
                {cleanPrompt}
              </div>
              <select
                value={answers[q.id] ?? ""}
                onChange={e => onChange(q.id, e.target.value)}
                className="border border-slate-300 rounded-md px-2 py-1 text-sm w-28 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {opts.map((o, i) => (
                  <option key={i} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Custom audio status indicator for Listening. No pause, no seek, no
 * controls — just an animated "playing" pill + elapsed time. Reads from
 * the hidden <audio> element via the shared ref.
 *
 * Also detects stalled playback as a fallback to the browser's `ended`
 * event, which is unreliable on concatenated MP3 streams.
 */
function ListeningAudioStatus({
  playing,
  finished,
  audioRef,
  onForceFinished,
}: {
  playing: boolean;
  finished: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onForceFinished: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastTimeRef = useRef(0);
  const lastChangeAtRef = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      const el = audioRef.current;
      if (!el) return;
      const now = Date.now();
      const ct = el.currentTime || 0;
      setElapsed(ct);
      setDuration(el.duration || 0);

      // Stalled-detection: if currentTime hasn't advanced for 2.5s after
      // playback has begun, treat the audio as finished. This catches the
      // case where concatenated MP3s confuse the browser and the `ended`
      // event never fires.
      if (!finished && ct > 1) {
        if (Math.abs(ct - lastTimeRef.current) > 0.05) {
          lastTimeRef.current = ct;
          lastChangeAtRef.current = now;
        } else if (now - lastChangeAtRef.current > 2500) {
          onForceFinished();
        }
      }

      // Also: if the audio has reached end of its known duration, force.
      if (
        !finished &&
        el.duration &&
        Number.isFinite(el.duration) &&
        ct >= el.duration - 0.25
      ) {
        onForceFinished();
      }
    }, 500);
    return () => clearInterval(t);
  }, [audioRef, finished, onForceFinished]);

  const mm = (n: number) =>
    `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white border-slate-200">
      <div
        className={`relative w-3 h-3 rounded-full ${
          finished
            ? "bg-emerald-500"
            : playing
              ? "bg-red-500"
              : "bg-slate-300"
        }`}
      >
        {playing && !finished ? (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
        ) : null}
      </div>
      <div className="text-sm font-medium text-slate-800 flex-1">
        {finished
          ? "Audio finished — you can advance"
          : playing
            ? "Audio is playing — no pause"
            : "Audio paused (waiting for preview)"}
      </div>
      <div className="text-xs text-slate-500 font-mono">
        {mm(elapsed)}
        {duration > 0 && Number.isFinite(duration) ? ` / ${mm(duration)}` : ""}
      </div>
    </div>
  );
}

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

  const utils = trpc.useUtils();
  const saveMut = trpc.ielts.saveListeningAnswers.useMutation();
  const finishMut = trpc.ielts.finishListening.useMutation({
    onSuccess: async () => {
      // Bust the cached attempt status so the wrapper re-fetches and
      // routes to Reading. Without this, the wrapper keeps showing
      // ListeningRunner because the cached query still says "listening".
      await utils.ielts.getAttempt.invalidate({ token });
      onFinished();
    },
  });

  const [sectionIdx, setSectionIdx] = useState(0);
  // Show the one-time pre-test intro card with the example question.
  const [showIntro, setShowIntro] = useState(true);
  // Per-section preview period — student reads questions before audio plays.
  // Real IELTS gives ~30 seconds; we mirror that.
  const PREVIEW_SECONDS = 30;
  const [previewLeft, setPreviewLeft] = useState(PREVIEW_SECONDS);
  const [previewing, setPreviewing] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [audioFinished, setAudioFinished] = useState(false);

  // Countdown ticker for preview period.
  useEffect(() => {
    if (!previewing) return;
    if (previewLeft <= 0) {
      setPreviewing(false);
      return;
    }
    const t = setInterval(() => setPreviewLeft(n => n - 1), 1000);
    return () => clearInterval(t);
  }, [previewing, previewLeft]);

  // Reset preview when changing sections.
  useEffect(() => {
    setPreviewing(true);
    setPreviewLeft(PREVIEW_SECONDS);
  }, [sectionIdx]);
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

  // One-time intro before the entire Listening test.
  if (showIntro) {
    return (
      <Card>
        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-2">
          Listening — how it works
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Welcome to Section 1
        </h1>
        <p className="text-sm text-slate-700 leading-relaxed mb-4">
          You'll hear <strong>4 audio sections</strong>. Each plays{" "}
          <strong>once only</strong> — you cannot pause, rewind, or replay.
          Before each section starts, you get <strong>30 seconds</strong> to
          read through the questions.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Example
          </div>
          <p className="text-xs text-slate-600 mb-2">
            <em>You'll hear:</em> "Could I take your full name, please?" &nbsp;
            "Yes, it's Jennifer Lawson."
          </p>
          <p className="text-xs text-slate-600 mb-3">
            <em>The form on your screen looks like this:</em>
          </p>
          <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                E
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-800">
                  Name: ...........................
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  → Type the answer:{" "}
                  <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono text-xs">
                    Jennifer Lawson
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 mb-5">
          <strong>Tips:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Headphones on, volume tested.</li>
            <li>
              Use the preview seconds to read every question — you'll catch
              answers faster.
            </li>
            <li>Answers are case-insensitive and auto-saved as you type.</li>
          </ul>
        </div>

        <button
          onClick={() => setShowIntro(false)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          OK, I'm ready — go to Section 1
        </button>
      </Card>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* STICKY HEADER — section info + timer + audio status always visible
          while the user scrolls through questions during audio playback. */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50">
          <div className="text-sm text-slate-600 font-medium">
            Listening · Section{" "}
            <span className="text-slate-900 font-bold">
              {section.sectionNumber}
            </span>{" "}
            of {sections.length}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">
              {answeredCount}/{totalQuestions} answered
            </div>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono ${
                secondsLeft < 60
                  ? "bg-red-100 text-red-700"
                  : secondsLeft < 5 * 60
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-200 text-slate-700"
              }`}
            >
              <Clock className="w-3 h-3" />
              {mm}:{ss}
            </div>
          </div>
        </div>
        {/* Audio strip — compact, sticky with the header */}
        <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Headphones className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                Audio · Plays once · No pause
              </div>
            </div>
            {previewing ? (
              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-mono shrink-0">
                Plays in {previewLeft}s
              </span>
            ) : audioFinished ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 text-xs shrink-0">
                <CheckCircle2 className="w-3 h-3" /> Done
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 text-xs shrink-0">
                <span className="relative w-2 h-2 rounded-full bg-red-500">
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
                </span>
                Playing
              </span>
            )}
            {section.audioUrl ? (
              <>
                {/* Hidden audio element — no native controls. */}
                <audio
                  ref={audioRef}
                  src={previewing ? undefined : section.audioUrl}
                  autoPlay={!previewing}
                  onTimeUpdate={() => {
                    if (audioRef.current) {
                      lastPositionRef.current = audioRef.current.currentTime;
                      if (
                        audioRef.current.paused &&
                        !audioRef.current.ended
                      ) {
                        void audioRef.current.play().catch(() => {});
                      }
                    }
                  }}
                  onPause={() => {
                    if (audioRef.current && !audioRef.current.ended) {
                      void audioRef.current.play().catch(() => {});
                    }
                  }}
                  onSeeking={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime =
                        lastPositionRef.current;
                    }
                  }}
                  onEnded={() => setAudioFinished(true)}
                />
                {/* Hidden stalled-detector — keeps the audio-finished
                    fallback alive but doesn't render anything visible. */}
                <div className="hidden">
                  <ListeningAudioStatus
                    playing={!previewing && !audioFinished}
                    finished={audioFinished}
                    audioRef={audioRef}
                    onForceFinished={() => setAudioFinished(true)}
                  />
                </div>
              </>
            ) : null}
          </div>
          {previewing ? (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-amber-900 flex items-center justify-between">
              <span>
                <strong>Preview time.</strong> Read the questions below.
                Audio starts in {previewLeft}s.
              </span>
              <button
                onClick={() => {
                  setPreviewLeft(0);
                  setPreviewing(false);
                }}
                className="ml-2 underline font-semibold hover:text-amber-700 shrink-0"
              >
                Skip →
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* QUESTIONS — compact, smart-rendered by section type */}
      <div className="px-5 py-4">
        <ListeningQuestionsArea
          section={section}
          answers={answers}
          onChange={(qid, val) =>
            setAnswers(prev => ({ ...prev, [qid]: val }))
          }
        />
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

  const utils = trpc.useUtils();
  const saveMut = trpc.ielts.saveReadingAnswers.useMutation();
  const finishMut = trpc.ielts.finishReading.useMutation({
    onSuccess: async () => {
      await utils.ielts.getAttempt.invalidate({ token });
      onFinished();
    },
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

  const utils = trpc.useUtils();
  const saveMut = trpc.ielts.saveWritingDraft.useMutation();
  const finishMut = trpc.ielts.finishWriting.useMutation({
    onSuccess: async () => {
      await utils.ielts.getAttempt.invalidate({ token });
      onFinished();
    },
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
    onSuccess: async () => {
      await utils.ielts.getAttempt.invalidate({ token });
      onFinished();
    },
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [examinerPlayedFor, setExaminerPlayedFor] = useState<number | null>(null);

  // --- Derived values (safe even while loading; `?? []` guards undefined). ---
  // These MUST be computed before any early return so the hooks below run on
  // every render (React rules-of-hooks).
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

  // Auto-play examiner audio once it arrives. MUST be before early returns.
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
  compact,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
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

  // Strip [GROUP:...] markers so they don't appear in cards (notes view
  // handles grouping separately).
  const cleanPrompt = q.prompt.replace(/^\[GROUP:[^\]]+\]\s*\n?/i, "").trim();

  return (
    <div
      className={`border border-slate-200 rounded-xl ${compact ? "px-3 py-2.5" : "p-4"}`}
    >
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {q.questionNumber}
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-800 whitespace-pre-wrap leading-snug">
            {cleanPrompt}
          </div>

          <div className={compact ? "mt-2" : "mt-3"}>
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
