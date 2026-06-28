/**
 * IGCSE AI Teacher — lesson room (Week 4: chat + interactive whiteboard).
 *
 * The AI now returns BOTH a spoken-style reply (chat bubble) AND ordered
 * "board commands" (titles, steps, prose lines, LaTeX equations) that we
 * render onto a shared whiteboard panel. Equations are typeset with KaTeX
 * (loaded once via CDN — no npm dependency added). New board items "appear"
 * one at a time so it feels like a teacher writing.
 *
 * Coming next (Week 5): student drawing layer over the board, diagram
 * templates (number lines, axes, triangles). Week 6: voice pipeline.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";

const PURPLE = "#7c3aed";
const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

// ── KaTeX loader (CDN, idempotent) ───────────────────────────────────────────
let katexReady: Promise<any> | null = null;
function loadKatex(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).katex) return Promise.resolve((window as any).katex);
  if (katexReady) return katexReady;
  katexReady = new Promise((resolve) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).katex);
    script.onerror = () => resolve(null); // fall back to raw latex text
    document.head.appendChild(script);
  });
  return katexReady;
}

function KatexEquation({ latex }: { latex: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadKatex().then((k) => {
      if (cancelled || !ref.current) return;
      if (!k) { ref.current.textContent = latex; return; }
      try { k.render(latex, ref.current, { displayMode: true, throwOnError: false, output: "html" }); }
      catch { if (ref.current) ref.current.textContent = latex; }
    });
    return () => { cancelled = true; };
  }, [latex]);
  return <div ref={ref} className="my-1 overflow-x-auto" />;
}

function BoardItem({ item }: { item: any }) {
  switch (item?.type) {
    case "title":
      return <h3 className="text-base font-bold text-violet-900 mt-3 first:mt-0">{item.text}</h3>;
    case "step":
      return (
        <div className="flex gap-2 mt-2 text-sm">
          <span className="font-mono font-bold text-violet-700 shrink-0">{item.n ?? "•"}.</span>
          <span className="text-slate-800">{item.text}</span>
        </div>
      );
    case "text":
      return <p className="text-sm text-slate-700 mt-2">{item.text}</p>;
    case "equation":
      return <KatexEquation latex={String(item.latex || "")} />;
    default:
      return null;
  }
}

function BoardPanel({ items, displayed }: { items: any[]; displayed: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Autoscroll the board to the latest item as it's revealed.
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [displayed]);
  return (
    <div className={`${card} overflow-hidden flex flex-col h-full`}>
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 flex items-center justify-between">
        <span>📋 Whiteboard</span>
        <span className="text-slate-400">{displayed}/{items.length}</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="h-full grid place-items-center text-center text-slate-400 text-sm">
            <div>
              <div className="text-3xl mb-2">✏️</div>
              <div>The teacher's working will appear here.</div>
              <div className="text-xs text-slate-300 mt-1">Ask a question to get started.</div>
            </div>
          </div>
        ) : (
          <div>
            {items.slice(0, displayed).map((item, i) => <BoardItem key={i} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Lesson page ──────────────────────────────────────────────────────────────
export default function IgcseLesson() {
  const [, params] = useRoute<{ id: string }>("/igcse/lesson/:id");
  const sessionId = Number(params?.id ?? 0);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const session = trpc.igcse.getSession.useQuery({ id: sessionId }, { enabled: sessionId > 0, retry: false });
  const topics = trpc.igcse.listTopics.useQuery(undefined, { staleTime: 5 * 60_000 });
  const status = trpc.igcse.status.useQuery(undefined, { refetchInterval: 30_000 });

  const topic = useMemo(() => {
    if (!session.data?.topicId || !topics.data) return null;
    return topics.data.find((t: any) => t.id === session.data!.topicId) || null;
  }, [session.data?.topicId, topics.data]);

  // Local transcript + board mirror.
  const [turns, setTurns] = useState<any[]>([]);
  const [boardItems, setBoardItems] = useState<any[]>([]);
  const [displayed, setDisplayed] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement | null>(null);

  // Sync from server when session loads / changes.
  useEffect(() => {
    if (!session.data) return;
    setTurns(((session.data.transcript as any[]) || []));
    const initialBoard = (session.data.boardSnapshot as any[]) || [];
    setBoardItems(initialBoard);
    setDisplayed(initialBoard.length); // restore fully — no replay
  }, [session.data?.id]);

  // Reveal new board items one-by-one as they arrive.
  useEffect(() => {
    if (displayed >= boardItems.length) return;
    const t = setTimeout(() => setDisplayed(d => d + 1), 600);
    return () => clearTimeout(t);
  }, [boardItems.length, displayed]);

  // Track elapsed lesson time client-side (sent on each message).
  const startRef = useRef<number>(Date.now());
  useEffect(() => { startRef.current = Date.now(); }, [session.data?.id]);

  const sendMessage = trpc.igcse.sendMessage.useMutation({
    onSuccess: (d) => {
      setTurns(t => [...t, { role: "ai", text: d.speech, board: d.board || [], ts: Date.now() }]);
      if (Array.isArray(d.board) && d.board.length) {
        setBoardItems(b => [...b, ...d.board]);
      }
      setSending(false);
      utils.igcse.status.invalidate();
      setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 50);
    },
    onError: (e) => {
      setSending(false);
      alert(e?.message || "Something went wrong. Try again.");
    },
  });
  const endSession = trpc.igcse.endSession.useMutation({ onSuccess: () => setLocation("/igcse/app") });

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    setTurns(t => [...t, { role: "student", text: msg, ts: Date.now() }]);
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 30);
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
    <div className="h-screen bg-slate-50 flex flex-col">
      <SEO title={`Lesson — ${topic?.title || "IGCSE Math"}`} description="IGCSE Math AI Teacher lesson." noindex />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
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

      {/* Body: chat + board */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 p-3">
          {/* Chat column */}
          <div className={`${card} overflow-hidden flex flex-col`}>
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">💬 Tutor chat</div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {turns.length === 0 ? (
                <div className="text-center text-slate-500">
                  <div className="text-3xl mb-1">👋</div>
                  <div className="font-bold text-slate-800">Ready when you are</div>
                  <p className="text-sm mt-1">
                    Ask anything about <strong>{topic?.title || "your topic"}</strong>.<br/>
                    Try "Can you teach me this from scratch?" or paste a problem.
                  </p>
                </div>
              ) : (
                turns.map((t, i) => <Bubble key={i} role={t.role} text={t.text} />)
              )}
              {sending && <Bubble role="ai" text="…" pulsing />}
            </div>
          </div>

          {/* Board column */}
          <div className="overflow-hidden">
            <BoardPanel items={boardItems} displayed={displayed} />
          </div>
        </div>
      </main>

      {/* Input bar */}
      <div className="bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={submit} className="max-w-6xl mx-auto px-4 py-3 flex items-end gap-2">
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
              if (!confirm("End this lesson?")) return;
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
          Enter to send · Shift+Enter for new line · voice + sketch coming soon
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
        className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
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
