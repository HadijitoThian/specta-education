/**
 * Art Director (Phase 3 / Part B). Brief the AI designer in chat, upload
 * reference images it learns from, and maintain a saved Visual Style that every
 * generated post follows.
 */
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { SosMedShell, sosmedInput } from "./SosMedShell";

const PINK = "#E91E8C";
const CORAL = "#FF6B4A";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function SosMedArtDirector() {
  const utils = trpc.useUtils();
  const kit = trpc.sosmed.getBrandKit.useQuery(undefined, { retry: false });
  const [style, setStyle] = useState("");
  const [chat, setChat] = useState<{ role: "you" | "agent"; text: string; img?: string }[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);

  useEffect(() => { if (kit.data) setStyle(kit.data.visualStyle || ""); }, [kit.data?.id]);

  const chatMut = trpc.sosmed.artDirectorChat.useMutation();
  const saveKit = trpc.sosmed.updateBrandKit.useMutation({ onSuccess: () => { setMsg("Visual Style saved ✓"); utils.sosmed.getBrandKit.invalidate(); } });

  const send = async () => {
    const text = input.trim();
    if (!text && !refFile) return;
    setInput("");
    let referenceBase64: string | undefined;
    let referenceMime: string | undefined;
    let preview: string | undefined;
    if (refFile) {
      referenceBase64 = await fileToBase64(refFile);
      referenceMime = refFile.type || "image/png";
      preview = URL.createObjectURL(refFile);
    }
    setChat(c => [...c, { role: "you", text: text || "(reference image)", img: preview }]);
    setRefFile(null);
    setPending(true);
    try {
      const r = await chatMut.mutateAsync({ message: text || undefined, referenceBase64, referenceMime });
      setStyle(r.visualStyle || "");
      utils.sosmed.getBrandKit.invalidate();
      setChat(c => [...c, { role: "agent", text: r.reply + (r.referenceAnalyzed ? " (learned from your reference)" : "") }]);
    } catch (e: any) {
      setChat(c => [...c, { role: "agent", text: "Sorry — " + e.message }]);
    } finally {
      setPending(false);
    }
  };

  return (
    <SosMedShell active="/sosmed/art-director">
      <h1 className="text-2xl font-bold text-slate-800">Art Director</h1>
      <p className="text-slate-500 mt-1">Brief the designer, upload references it learns from. Every new post follows the saved Visual Style.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Chat */}
        <div className="border border-slate-200 rounded-xl p-3 flex flex-col h-[30rem]">
          <div className="text-sm font-semibold text-slate-800 mb-2">Chat with the Art Director</div>
          <div className="flex-1 overflow-auto space-y-2 text-sm">
            {chat.length === 0 && (
              <div className="text-xs text-slate-400">
                Try: "Use warm, candid photography with our pink/purple accents", or upload a post you love and say "make designs like this".
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === "you" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 ${m.role === "you" ? "text-white" : "bg-slate-100 text-slate-700"}`} style={m.role === "you" ? { background: CORAL } : undefined}>
                  {m.img && <img src={m.img} alt="ref" className="rounded-lg mb-1 max-h-28" />}
                  {m.text}
                </div>
              </div>
            ))}
            {pending && <div className="text-xs text-slate-400">analyzing…</div>}
          </div>
          {refFile && <div className="text-xs text-slate-500 mt-2">📎 {refFile.name} <button onClick={() => setRefFile(null)} className="text-red-500">✕</button></div>}
          <div className="flex gap-2 mt-2">
            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm shrink-0">📎</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setRefFile(e.target.files?.[0] || null)} />
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Describe the design you want…" className={sosmedInput} />
            <button onClick={send} disabled={pending || (!input.trim() && !refFile)} className="px-3 py-2 rounded-lg text-white text-sm shrink-0 disabled:opacity-50" style={{ background: PINK }}>Send</button>
          </div>
        </div>

        {/* Visual Style */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Saved Visual Style</span>
            <button onClick={() => saveKit.mutate({ visualStyle: style })} disabled={saveKit.isPending} className="text-xs font-medium hover:underline" style={{ color: PINK }}>{saveKit.isPending ? "Saving…" : "Save"}</button>
          </div>
          <textarea value={style} onChange={e => setStyle(e.target.value)} rows={14} className={sosmedInput} placeholder="The Art Director will build this from your chat + references. You can also edit it directly." />
          {msg && <div className="mt-2 text-sm text-pink-700">{msg}</div>}
          <p className="text-[11px] text-slate-400 mt-2">This guides the AI image generation for every new post. Edit it anytime, or let the chat evolve it.</p>
        </div>
      </div>
    </SosMedShell>
  );
}
