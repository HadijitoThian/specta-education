/**
 * Live voice Emma for one SAT question (Phase 3).
 * Small card inside the drill's Emma panel: Start → speaking indicator +
 * transcript + countdown → End. Minutes are capped per day on the server.
 */
import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2, Mic, PhoneOff, Phone } from "lucide-react";

type Line = { role: "student" | "emma"; text: string };

export default function SatLiveEmma(props: { questionId: number; studentAnswer?: string; lang: "en" | "id"; onClose: () => void }) {
  return <ConversationProvider><Inner {...props} /></ConversationProvider>;
}

function Inner({ questionId, studentAnswer, lang, onClose }: { questionId: number; studentAnswer?: string; lang: "en" | "id"; onClose: () => void }) {
  const [phase, setPhase] = useState<"idle" | "connecting" | "live" | "ended">("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState<number>(0);
  const liveId = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  const maxSec = useRef<number>(600);
  const endedRef = useRef(false);
  const t = lang === "id"
    ? { title: "Bicara dengan Emma", sub: "Panggilan suara singkat tentang soal ini. Jelaskan apa yang kamu coba, Emma memandu langkah demi langkah.", start: "Mulai panggilan", end: "Akhiri", connecting: "Menghubungkan…", listening: "Emma mendengarkan… bicara saja", speaking: "Emma berbicara", ended: "Panggilan selesai", close: "Tutup", left: "tersisa hari ini" }
    : { title: "Talk to Emma", sub: "A short voice call about this question. Say what you tried and Emma guides you step by step.", start: "Start call", end: "End call", connecting: "Connecting…", listening: "Emma is listening… just speak", speaking: "Emma is speaking", ended: "Call ended", close: "Close", left: "left today" };

  const utils = trpc.useUtils();
  const quota = trpc.sat.liveQuota.useQuery();
  const liveEnd = trpc.sat.liveEnd.useMutation({ onSuccess: () => { utils.sat.liveQuota.invalidate(); } });
  const finish = () => {
    if (endedRef.current) return; endedRef.current = true;
    const secs = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    if (liveId.current) liveEnd.mutate({ liveSessionId: liveId.current, seconds: secs });
    setPhase("ended");
  };
  const conversation = useConversation({
    onConnect: () => { setPhase("live"); startedAt.current = Date.now(); },
    onDisconnect: () => finish(),
    onError: (m: any) => { setErr(String(typeof m === "string" ? m : m?.message || "Connection error").slice(0, 200)); finish(); },
    onMessage: (msg: any) => {
      const source = msg?.source || msg?.role; const text = String(msg?.message ?? msg?.text ?? "").trim();
      if (!text) return;
      setLines(l => [...l.slice(-30), { role: source === "user" ? "student" : "emma", text }]);
    },
  });
  const start = trpc.sat.liveStart.useMutation({
    onSuccess: async (d) => {
      liveId.current = d.liveSessionId; maxSec.current = d.maxSeconds; setLeft(d.maxSeconds);
      try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setErr("Microphone permission is needed."); setPhase("idle"); return; }
      try { await conversation.startSession({ signedUrl: d.signedUrl, dynamicVariables: d.dynamicVariables } as any); }
      catch (e: any) { setErr(String(e?.message || e).slice(0, 200)); setPhase("idle"); }
    },
    onError: (e) => { setErr(e.message); setPhase("idle"); },
  });

  useEffect(() => {
    if (phase !== "live") return;
    const iv = setInterval(() => {
      const rem = maxSec.current - Math.round((Date.now() - startedAt.current) / 1000);
      setLeft(Math.max(0, rem));
      if (rem <= 0) { try { conversation.endSession(); } catch { /* */ } finish(); }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { try { conversation.endSession(); } catch { /* */ } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const speaking = conversation.isSpeaking;
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-sm">
      <div className="flex items-center justify-between mb-1"><div className="font-bold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-indigo-600" />{t.title}</div>{phase !== "live" && <button onClick={onClose} className="text-xs text-slate-500">{t.close}</button>}</div>
      {phase === "idle" && <>
        <p className="text-xs text-slate-600 mb-1">{t.sub}</p>
        {quota.data && (
          <div className="text-[11px] text-slate-600 mb-2 rounded-lg bg-white/70 px-2 py-1.5">
            {lang === "id"
              ? <>Gratis <b>{quota.data.freeMinutesPerWeek / 60} jam/minggu</b> · sisa minggu ini <b>{Math.floor(quota.data.freeRemainingSec / 60)} menit</b> (reset Senin){quota.data.creditSec > 0 ? <> · kredit <b>{Math.floor(quota.data.creditSec / 60)} menit</b></> : null}. Perlu lebih? <Link href="/sat/credits" className="underline text-indigo-700">Beli kredit Rp {quota.data.pricePerHour.toLocaleString("id-ID")}/jam</Link></>
              : <>Free <b>{quota.data.freeMinutesPerWeek / 60} hours/week</b> · <b>{Math.floor(quota.data.freeRemainingSec / 60)} min</b> left this week (resets Monday){quota.data.creditSec > 0 ? <> · credit <b>{Math.floor(quota.data.creditSec / 60)} min</b></> : null}. Need more? <Link href="/sat/credits" className="underline text-indigo-700">Buy credit at Rp {quota.data.pricePerHour.toLocaleString("id-ID")}/hour</Link></>}
          </div>
        )}
        {err && <div className="text-xs text-red-600 mb-2">{err} {/used|habis/i.test(err) && <Link href="/sat/credits" className="underline font-semibold">{lang === "id" ? "Beli kredit" : "Buy credit"}</Link>}</div>}
        <button onClick={() => { setErr(null); endedRef.current = false; setLines([]); setPhase("connecting"); start.mutate({ questionId, studentAnswer }); }} className="w-full py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"><Mic className="w-3.5 h-3.5" />{t.start}</button>
      </>}
      {phase === "connecting" && <div className="text-xs text-slate-600 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />{t.connecting}</div>}
      {phase === "live" && <>
        <div className="flex items-center justify-between mb-2">
          <div className={`text-xs font-semibold flex items-center gap-1.5 ${speaking ? "text-indigo-700" : "text-emerald-700"}`}><span className={`w-2 h-2 rounded-full ${speaking ? "bg-indigo-600 animate-pulse" : "bg-emerald-500"}`} />{speaking ? t.speaking : t.listening}</div>
          <div className="text-[11px] font-mono text-slate-500">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1 mb-2">{lines.slice(-6).map((l, i) => <div key={i} className={`text-xs rounded-lg px-2 py-1 ${l.role === "emma" ? "bg-white text-slate-800" : "bg-indigo-100 text-slate-700 text-right"}`}>{l.text}</div>)}</div>
        <button onClick={() => { try { conversation.endSession(); } catch { /* */ } finish(); }} className="w-full py-2 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"><PhoneOff className="w-3.5 h-3.5" />{t.end}</button>
      </>}
      {phase === "ended" && <>
        <div className="text-xs text-slate-600 mb-2">{t.ended}{err ? ` · ${err}` : ""}</div>
        <div className="max-h-32 overflow-y-auto space-y-1 mb-2">{lines.slice(-8).map((l, i) => <div key={i} className={`text-xs rounded-lg px-2 py-1 ${l.role === "emma" ? "bg-white text-slate-800" : "bg-indigo-100 text-slate-700 text-right"}`}>{l.text}</div>)}</div>
        <button onClick={() => { setPhase("idle"); setErr(null); }} className="w-full py-2 rounded-lg border border-indigo-300 text-indigo-700 font-bold text-xs">{t.start}</button>
      </>}
    </div>
  );
}
