/**
 * IGCSE AI Teacher — lesson room (Week 3: basic text chat).
 *
 * Mounted at `/igcse/lesson/:id`. The student picks a topic from the
 * dashboard which creates an igcse_session and routes here. Each turn calls
 * `igcse.sendMessage`, which uses DeepSeek with a Cambridge-IGCSE-grounded
 * pedagogy prompt and persists transcript + duration server-side.
 *
 * Whiteboard (tldraw + KaTeX board commands) lands in Weeks 4–5; voice
 * (Deepgram → DeepSeek V4 → ElevenLabs Flash) in Week 6 — both will mount
 * inside this same room.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";

const PURPLE = "#7c3aed";
const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

export default function IgcseLesson() {
  const [, params] = useRoute<{ id: string }>("/igcse/lesson/:id");
  const sessionId = Number(params?.id ?? 0);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const session = trpc.igcse.getSession.useQuery({ id: sessionId }, { enabled: sessionId > 0, retry: false });
  const topics = trpc.igcse.listTopics.useQuery(undefined, { staleTime: 5 * 60_000 });
  const status = trpc.igcse.status.useQuery(undefined, { refetchInterval: 30_000 });

  // Find the topic associated with this session (for the header + grounding).
  const topic = useMemo(() => {
    if (!session.data?.topicId || !topics.data) return null;
    return topics.data.find((t: any) => t.id === session.data!.topicId) || null;
  }, [session.data?.topicId, topics.data]);

  // Local transcript mirror — updated optimistically when the student sends.
  const initialTranscript = (session.data?.transcript as any[]) || [];
  const [turns, setTurns] = useState<any[]>(initialTranscript);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Sync local transcript when the server-side session loads.
  useEffect(() => {
    setTurns((session.data?.transcript as any[]) || []);
  }, [session.data?.id]);

  // Track elapsed time client-side; sent on each message so the server can
  // update durationSec (which feeds the free-trial counter).
  const startRef = useRef<number>(Date.now());
  useEffect(() => { startRef.current = Date.now(); }, [session.data?.id]);

  const sendMessage = trpc.igcse.sendMessage.useMutation({
    onSuccess: (d) => {
      setTurns(t => [...t, { role: "ai", text: d.reply, ts: Date.now() }]);
      setSending(false);
      utils.igcse.status.invalidate(); // refresh free-trial counter
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    },
    onError: (e) => {
      setSending(false);
      // If the trial just expired mid-session, the server returns FORBIDDEN.
      if (e.data?.code === "FORBIDDEN") {
        alert(e.message);
      } else {
        alert(e?.message || "Something went wrong. Try again.");
      }
    },
  });

  const endSession = trpc.igcse.endSession.useMutation({
    onSuccess: () => setLocation("/igcse/app"),
  });

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    setTurns(t => [...t, { role: "student", text: msg, ts: Date.now() }]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 30);
    const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
    sendMessage.mutate({ sessionId, message: msg, elapsedSec });
  };

  if (session.isLoading) return <Centered><div className="text-slate-400">Loading lesson…</div></Centered>;
  if (session.isError || !session.data) return (
    <Centered>
      <div className="text-center">
        <h2 className="font-bold text-slate-800 mb-2">Lesson not found</h2>
        <Link href="/igcse/app" className="text-violet-700 underline text-sm">← Back to your classroom</Link>
      </div>
    </Centered>
  );

  const sub = (status.data as any)?.subscription;
  const ft = (status.data as any)?.freeTrial as { remainingSec?: number } | undefined;
  const remainingMin = ft?.remainingSec != null ? Math.floor(ft.remainingSec / 60) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SEO title={`Lesson — ${topic?.title || "IGCSE Math"}`} description="IGCSE Math AI Teacher lesson." noindex />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/igcse/app" className="text-sm text-slate-500 hover:text-slate-900">← Classroom</Link>
          <div className="min-w-0 text-center">
            <div className="text-[11px] font-mono text-violet-700">{topic?.code ?? "—"} · {topic?.areaName ?? "IGCSE Math"}</div>
            <div className="text-sm font-semibold text-slate-800 truncate">{topic?.title || "Free-form lesson"}</div>
          </div>
          <div className="text-xs whitespace-nowrap">
            {sub
              ? <span className="text-green-700 font-medium">✓ Active</span>
              : remainingMin != null
                ? <span className="text-slate-500">{remainingMin} min trial left</span>
                : <span className="text-slate-400">—</span>}
          </div>
        </div>
      </header>

      {/* Transcript */}
      <main ref={scrollRef as any} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {turns.length === 0 ? (
            <div className={`${card} p-6 text-center`}>
              <div className="text-3xl mb-1">👋</div>
              <h2 className="font-bold text-slate-900">Ready when you are</h2>
              <p className="text-sm text-slate-600 mt-1">
                Ask anything about <strong>{topic?.title || "your topic"}</strong> — try "Can you teach me this from scratch?"
                or "Explain question: solve 2x + 7 = 19".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {turns.map((t, i) => (
                <Bubble key={i} role={t.role} text={t.text} />
              ))}
              {sending && <Bubble role="ai" text="…" pulsing />}
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <div className="bg-white border-t border-slate-200">
        <form onSubmit={submit} className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={topic ? `Ask about ${topic.title}…` : "Ask a math question…"}
            rows={1}
            className="flex-1 resize-none px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50"
            style={{ background: PURPLE }}
          >
            {sending ? "…" : "Send"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm("End this lesson? You can pick another topic from your classroom.")) return;
              const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
              endSession.mutate({ id: sessionId, durationSec: elapsedSec });
            }}
            className="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800"
            title="End this lesson"
          >
            End
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center pb-2">
          Press Enter to send · Shift+Enter for a new line · whiteboard + voice rolling out soon
        </p>
      </div>
    </div>
  );
}

function Bubble({ role, text, pulsing }: { role: string; text: string; pulsing?: boolean }) {
  const isStudent = role === "student";
  return (
    <div className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isStudent
            ? "bg-violet-600 text-white rounded-br-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
        } ${pulsing ? "animate-pulse" : ""}`}
      >
        {text}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen grid place-items-center bg-slate-50 px-4">{children}</div>;
}
