/**
 * Content Studio (Phase 2). Brief → AI generates an on-brand caption + hashtags
 * + branded slide image(s). Drafts grid + detail view. (Editing comes in Phase 3.)
 */
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { SosMedShell, sosmedInput } from "./SosMedShell";

const PINK = "#E91E8C";
const CORAL = "#FF6B4A";
const FONTS = ["Poppins", "Montserrat", "Oswald", "Playfair Display", "Lora", "Inter", "Bebas Neue", "Anton"];
const PREVIEW = 380; // px; canvas exports at 1080
const SCALE = PREVIEW / 1080;

export default function SosMedContent() {
  const utils = trpc.useUtils();
  const list = trpc.sosmed.listContent.useQuery(undefined, { retry: false });
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState<"single" | "carousel">("carousel");
  const [slideCount, setSlideCount] = useState(4);
  const [msg, setMsg] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  const suggest = trpc.sosmed.suggestIdeas.useMutation({ onSuccess: r => setIdeas(r.ideas), onError: e => setMsg(e.message) });
  const generate = trpc.sosmed.generateContent.useMutation({
    onSuccess: r => {
      setMsg(r.imageError ? `Draft created — copy ready, but images need setup (${r.imageError}).` : "Draft created ✓");
      setBrief("");
      utils.sosmed.listContent.invalidate();
      setOpenId(r.id);
    },
    onError: e => setMsg(e.message),
  });

  return (
    <SosMedShell active="/sosmed/content">
      <h1 className="text-2xl font-bold text-slate-800">Content Studio</h1>
      <p className="text-slate-500 mt-1">Describe a post; the agents draft it on-brand from your Brand Kit.</p>

      {/* New post */}
      <div className="mt-5 bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-slate-800 text-sm">New post</div>
          <button onClick={() => suggest.mutate()} disabled={suggest.isPending} className="text-sm font-medium hover:underline disabled:opacity-50" style={{ color: CORAL }}>
            {suggest.isPending ? "Thinking…" : "💡 Suggest ideas"}
          </button>
        </div>
        {ideas.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {ideas.map((idea, i) => (
              <button key={i} onClick={() => setBrief(idea)} className="text-xs text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600">{idea}</button>
            ))}
          </div>
        )}
        <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3} placeholder="e.g. Carousel about 100% China scholarships — feature a real alumni success story" className={sosmedInput} />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <select value={format} onChange={e => setFormat(e.target.value as any)} className={`${sosmedInput} max-w-[180px]`}>
            <option value="single">Single image</option>
            <option value="carousel">Carousel</option>
          </select>
          {format === "carousel" && (
            <select value={slideCount} onChange={e => setSlideCount(Number(e.target.value))} className={`${sosmedInput} max-w-[140px]`}>
              {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} slides</option>)}
            </select>
          )}
          <button
            onClick={() => brief.trim() && generate.mutate({ brief: brief.trim(), format, slideCount: format === "carousel" ? slideCount : undefined })}
            disabled={generate.isPending || !brief.trim()}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ background: PINK }}
          >
            {generate.isPending ? "Generating… (can take ~30s)" : "✨ Generate"}
          </button>
        </div>
        {msg && <div className="mt-3 bg-pink-50 text-pink-800 text-sm rounded-lg px-4 py-2">{msg}</div>}
      </div>

      {/* Drafts */}
      <div className="mt-6">
        <div className="font-semibold text-slate-800 mb-3">Drafts</div>
        {list.isLoading && <div className="text-slate-400 text-sm">Loading…</div>}
        {!list.isLoading && (list.data?.length ?? 0) === 0 && <div className="text-slate-400 text-sm">No drafts yet — generate your first post above.</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {list.data?.map(d => (
            <button key={d.id} onClick={() => setOpenId(d.id)} className="text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-pink-300 hover:shadow-sm transition">
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                {d.thumbnail ? <img src={d.thumbnail} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-300 text-xs">no image</span>}
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 line-clamp-2">{d.brief}</div>
                <div className="text-[11px] text-slate-400 mt-1">{d.format === "carousel" ? `Carousel · ${d.slideCount}` : "Single"} · {d.status}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {openId != null && <DraftDetail id={openId} onClose={() => setOpenId(null)} onDeleted={() => { setOpenId(null); utils.sosmed.listContent.invalidate(); }} />}
    </SosMedShell>
  );
}

type Layer = {
  id: string; kind: "text" | "logo"; role?: string; text?: string;
  x: number; y: number; width?: number;
  fontFamily?: string; fontSize?: number; color?: string; weight?: number;
  align?: "left" | "center" | "right"; logoVariant?: "color" | "white"; logoWidth?: number;
};
type EditSlide = { headline: string; subheadline: string; imagePrompt: string; imageUrl?: string | null; backgroundUrl?: string | null; layers?: Layer[] };

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = String(text).split(/\s+/); const lines: string[] = []; let line = "";
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
async function exportSlideToPng(slide: EditSlide, kit: any, filename: string) {
  const C = 1080; const cv = document.createElement("canvas"); cv.width = C; cv.height = C;
  const ctx = cv.getContext("2d")!;
  const bgSrc = slide.backgroundUrl || slide.imageUrl;
  if (bgSrc) {
    try { const bg = await loadImg(bgSrc); const r = Math.max(C / bg.width, C / bg.height); const w = bg.width * r, h = bg.height * r; ctx.drawImage(bg, (C - w) / 2, (C - h) / 2, w, h); }
    catch { ctx.fillStyle = "#222"; ctx.fillRect(0, 0, C, C); }
  } else { ctx.fillStyle = "#222"; ctx.fillRect(0, 0, C, C); }
  try { await (document as any).fonts?.ready; } catch { /* ignore */ }
  for (const L of slide.layers || []) {
    if (L.kind === "logo") {
      const url = L.logoVariant === "white" ? kit?.logoWhiteUrl : kit?.logoUrl;
      if (url) { try { const lg = await loadImg(url); const lw = L.logoWidth || 230; const lh = lg.height * (lw / lg.width); ctx.drawImage(lg, L.x * C, L.y * C, lw, lh); } catch { /* skip */ } }
    } else if (L.kind === "text" && L.text) {
      const size = L.fontSize || 48; ctx.font = `${L.weight || 700} ${size}px "${L.fontFamily || "Poppins"}"`;
      ctx.fillStyle = L.color || "#fff"; ctx.textAlign = (L.align || "left") as CanvasTextAlign; ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = size * 0.16; ctx.shadowOffsetY = 2;
      const maxW = (L.width || 0.8) * C; const lines = wrapText(ctx, L.text, maxW); const lh = size * 1.16;
      const tx = L.align === "center" ? L.x * C + maxW / 2 : L.align === "right" ? L.x * C + maxW : L.x * C;
      lines.forEach((ln, i) => ctx.fillText(ln, tx, L.y * C + i * lh));
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
  }
  await new Promise<void>(res => cv.toBlob(b => { if (b) { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = filename; a.click(); URL.revokeObjectURL(u); } res(); }, "image/png"));
}

function DraftDetail({ id, onClose, onDeleted }: { id: number; onClose: () => void; onDeleted: () => void }) {
  const utils = trpc.useUtils();
  const q = trpc.sosmed.getContent.useQuery({ id });
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [slides, setSlides] = useState<EditSlide[]>([]);
  const [status, setStatus] = useState("draft");
  const [chat, setChat] = useState<{ role: "you" | "agent"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) {
      setCaption(q.data.caption || "");
      setHashtags(q.data.hashtags || "");
      setSlides(q.data.slidesParsed as EditSlide[]);
      setStatus(q.data.status);
    }
  }, [q.data?.id]);

  const refreshList = () => utils.sosmed.listContent.invalidate();
  const save = trpc.sosmed.updateContent.useMutation({ onSuccess: () => { setMsg("Saved ✓"); refreshList(); }, onError: e => setMsg(e.message) });
  const del = trpc.sosmed.deleteContent.useMutation({ onSuccess: onDeleted });
  const approve = trpc.sosmed.setStatus.useMutation({ onSuccess: () => { setStatus("approved"); setMsg("Approved ✓"); refreshList(); } });
  const regen = trpc.sosmed.regenerateImage.useMutation();
  const chatEdit = trpc.sosmed.chatEditContent.useMutation();

  const copy = (text: string, what: string) => { navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); };

  const kitQ = trpc.sosmed.getBrandKit.useQuery(undefined, { retry: false });
  const kit = kitQ.data;
  const swatches = [kit?.primaryColor, kit?.secondaryColor, kit?.accentColor, "#ffffff", "#000000"].filter(Boolean) as string[];
  const [activeIdx, setActiveIdx] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<EditSlide[][]>([]);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const active: EditSlide | undefined = slides[activeIdx];
  const updateLayers = (fn: (ls: Layer[]) => Layer[]) =>
    setSlides(s => s.map((sl, j) => (j === activeIdx ? { ...sl, layers: fn(sl.layers || []) } : sl)));
  const patchLayer = (lyrId: string, patch: Partial<Layer>) => updateLayers(ls => ls.map(l => (l.id === lyrId ? { ...l, ...patch } : l)));
  const cloneSlides = (ss: EditSlide[]) => ss.map(s => ({ ...s, layers: (s.layers || []).map(l => ({ ...l })) }));
  const snapshot = () => setHistory(h => [...h.slice(-29), cloneSlides(slides)]);
  const undo = () => setHistory(h => { if (!h.length) return h; setSlides(h[h.length - 1]); setSelId(null); return h.slice(0, -1); });
  const removeLayer = (lyrId: string) => { snapshot(); updateLayers(ls => ls.filter(l => l.id !== lyrId)); setSelId(s => (s === lyrId ? null : s)); };
  const addTextLayer = () => { snapshot(); const nid = `t${Date.now()}`; updateLayers(ls => [...ls, { id: nid, kind: "text", text: "New text", x: 0.1, y: 0.1, width: 0.8, fontFamily: kit?.fontHeading || "Poppins", fontSize: 48, color: "#ffffff", weight: 700, align: "left" }]); setSelId(nid); };
  const selLayer = (active?.layers || []).find(l => l.id === selId) || null;

  const startDrag = (e: React.PointerEvent, l: Layer) => {
    e.stopPropagation(); setSelId(l.id); snapshot();
    if (!stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    dragRef.current = { id: l.id, ox: (e.clientX - r.left) / r.width - l.x, oy: (e.clientY - r.top) / r.height - l.y };
  };
  const onStageMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - dragRef.current.ox;
    const y = (e.clientY - r.top) / r.height - dragRef.current.oy;
    patchLayer(dragRef.current.id, { x: Math.max(0, Math.min(0.98, x)), y: Math.max(0, Math.min(0.98, y)) });
  };

  const doSave = () => { setMsg(null); save.mutate({ id, caption, hashtags, slides }); };

  const doRegen = async (i: number) => {
    setRegenIdx(i); setMsg(null);
    try {
      const r = await regen.mutateAsync({ id, slideIndex: i, prompt: slides[i].imagePrompt });
      setSlides(s => s.map((sl, j) => (j === i ? { ...sl, imageUrl: r.imageUrl, backgroundUrl: r.imageUrl } : sl)));
      if (r.error) setMsg(`Slide ${i + 1}: ${r.error}`);
      refreshList();
    } catch (e: any) { setMsg(e.message); } finally { setRegenIdx(null); }
  };

  const doExport = async () => { if (!active) return; setExporting(true); try { await exportSlideToPng(active, kit, `specta-slide-${activeIdx + 1}.png`); } catch (e: any) { setMsg(e.message); } finally { setExporting(false); } };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    setChat(c => [...c, { role: "you", text }]);
    try {
      const r = await chatEdit.mutateAsync({ id, message: text });
      setCaption(r.caption || "");
      setHashtags(r.hashtags || "");
      setSlides(prev => prev.map((sl, i) => (r.slides[i] ? { ...sl, headline: r.slides[i].headline, subheadline: r.slides[i].subheadline } : sl)));
      setChat(c => [...c, { role: "agent", text: r.reply }]);
      refreshList();
    } catch (e: any) {
      setChat(c => [...c, { role: "agent", text: "Sorry — " + e.message }]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-800">Edit draft <span className="text-xs font-normal text-slate-400">· {status}</span></div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:underline">Close</button>
        </div>
        {msg && <div className="mt-2 text-sm text-pink-700">{msg}</div>}

        {q.isLoading ? <div className="text-slate-400 mt-4">Loading…</div> : !q.data ? <div className="text-slate-500 mt-4">Not found.</div> : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
            {/* Left: canvas preview + slide tabs + export */}
            <div>
              {slides.length > 1 && (
                <div className="flex gap-1 mb-2">
                  {slides.map((_, i) => (
                    <button key={i} onClick={() => { setActiveIdx(i); setSelId(null); }} className={`text-xs px-2 py-1 rounded ${i === activeIdx ? "text-white" : "bg-slate-100 text-slate-500"}`} style={i === activeIdx ? { background: PINK } : undefined}>Slide {i + 1}</button>
                  ))}
                </div>
              )}
              <div
                ref={stageRef}
                onPointerMove={onStageMove}
                onPointerUp={() => (dragRef.current = null)}
                onPointerLeave={() => (dragRef.current = null)}
                onClick={() => setSelId(null)}
                className="relative bg-slate-200 rounded-lg overflow-hidden select-none"
                style={{ width: PREVIEW, height: PREVIEW }}
              >
                {(active?.backgroundUrl || active?.imageUrl) && <img src={(active.backgroundUrl || active.imageUrl) as string} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />}
                {regenIdx === activeIdx && <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm text-slate-600 z-20">Regenerating…</div>}
                {(active?.layers || []).map(l => {
                  const sel = l.id === selId;
                  if (l.kind === "logo") {
                    const url = l.logoVariant === "white" ? kit?.logoWhiteUrl : kit?.logoUrl;
                    return (
                      <img key={l.id} src={url || ""} alt="logo" onPointerDown={e => startDrag(e, l)}
                        className={`absolute object-contain cursor-move ${sel ? "ring-2 ring-pink-500" : ""}`}
                        style={{ left: l.x * PREVIEW, top: l.y * PREVIEW, width: (l.logoWidth || 230) * SCALE }} draggable={false} />
                    );
                  }
                  return (
                    <div key={l.id} onPointerDown={e => startDrag(e, l)}
                      className={`absolute cursor-move ${sel ? "ring-2 ring-pink-500" : ""}`}
                      style={{
                        left: l.x * PREVIEW, top: l.y * PREVIEW, width: (l.width || 0.8) * PREVIEW,
                        fontFamily: `"${l.fontFamily || "Poppins"}"`, fontSize: (l.fontSize || 48) * SCALE,
                        color: l.color || "#fff", fontWeight: l.weight || 700, textAlign: l.align || "left",
                        lineHeight: 1.16, textShadow: "0 2px 8px rgba(0,0,0,0.45)", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                      {l.text}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={addTextLayer} className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50">+ Text</button>
                <button onClick={undo} disabled={history.length === 0} className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40">↶ Undo</button>
                <button onClick={() => doRegen(activeIdx)} disabled={regenIdx !== null} className="text-xs px-2 py-1 rounded border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50">↻ Regenerate image</button>
                <button onClick={doExport} disabled={exporting} className="text-xs px-2 py-1 rounded text-white disabled:opacity-50" style={{ background: PINK }}>{exporting ? "Exporting…" : "⬇ Download PNG"}</button>
              </div>

              {/* Layers list — select / delete any element */}
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Layers</div>
                <div className="space-y-1">
                  {(active?.layers || []).length === 0 && <div className="text-xs text-slate-400">No layers.</div>}
                  {(active?.layers || []).map(l => (
                    <div key={l.id} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${l.id === selId ? "bg-pink-50" : "bg-slate-50"}`}>
                      <button onClick={() => setSelId(l.id)} className="truncate text-left flex-1 text-slate-600">
                        {l.kind === "logo" ? "🅛 Logo" : (l.text?.trim() || "(empty text)").slice(0, 32)}
                      </button>
                      <button onClick={() => removeLayer(l.id)} className="text-slate-400 hover:text-red-500 ml-2 shrink-0" title="Delete layer">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layer toolbar */}
              {selLayer && selLayer.kind === "text" && (
                <div className="mt-3 border border-slate-200 rounded-lg p-3 space-y-2 text-sm">
                  <textarea value={selLayer.text || ""} onChange={e => patchLayer(selLayer.id, { text: e.target.value })} rows={2} className={sosmedInput} />
                  <div className="flex gap-2">
                    <select value={selLayer.fontFamily} onChange={e => patchLayer(selLayer.id, { fontFamily: e.target.value })} className={`${sosmedInput} text-xs`}>
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <input type="number" value={selLayer.fontSize} onChange={e => patchLayer(selLayer.id, { fontSize: Number(e.target.value) })} className={`${sosmedInput} w-20 text-xs`} title="Font size" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="color" value={selLayer.color || "#ffffff"} onChange={e => patchLayer(selLayer.id, { color: e.target.value })} className="h-8 w-10 rounded border" />
                    {swatches.map(c => <button key={c} onClick={() => patchLayer(selLayer.id, { color: c })} className="w-6 h-6 rounded-full border border-slate-200" style={{ background: c }} title={c} />)}
                  </div>
                  <div className="flex items-center gap-2">
                    {(["left", "center", "right"] as const).map(a => (
                      <button key={a} onClick={() => patchLayer(selLayer.id, { align: a })} className={`text-xs px-2 py-1 rounded border ${selLayer.align === a ? "border-pink-400 text-pink-700" : "border-slate-300 text-slate-500"}`}>{a}</button>
                    ))}
                    {[400, 600, 700, 800].map(w => (
                      <button key={w} onClick={() => patchLayer(selLayer.id, { weight: w })} className={`text-xs px-2 py-1 rounded border ${selLayer.weight === w ? "border-pink-400 text-pink-700" : "border-slate-300 text-slate-500"}`}>{w}</button>
                    ))}
                    <button onClick={() => removeLayer(selLayer.id)} className="text-xs text-red-500 hover:underline ml-auto">Delete</button>
                  </div>
                </div>
              )}
              {selLayer && selLayer.kind === "logo" && (
                <div className="mt-3 border border-slate-200 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Logo:</span>
                    {(["color", "white"] as const).map(v => (
                      <button key={v} onClick={() => patchLayer(selLayer.id, { logoVariant: v })} className={`text-xs px-2 py-1 rounded border ${selLayer.logoVariant === v ? "border-pink-400 text-pink-700" : "border-slate-300 text-slate-500"}`}>{v}</button>
                    ))}
                    <input type="number" value={selLayer.logoWidth || 230} onChange={e => patchLayer(selLayer.id, { logoWidth: Number(e.target.value) })} className={`${sosmedInput} w-20 text-xs`} title="Logo width" />
                  </div>
                </div>
              )}
              <div className="text-[11px] text-slate-400 mt-2">Click a layer to edit; drag to move. The PNG exports at 1080×1080.</div>
            </div>

            {/* Right: copy + chat */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Caption</span>
                  <button onClick={() => copy(caption, "cap")} className="text-xs text-pink-600 hover:underline">{copied === "cap" ? "Copied ✓" : "Copy"}</button>
                </div>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={5} className={`${sosmedInput} mt-1`} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hashtags</span>
                  <button onClick={() => copy(hashtags, "tags")} className="text-xs text-pink-600 hover:underline">{copied === "tags" ? "Copied ✓" : "Copy"}</button>
                </div>
                <textarea value={hashtags} onChange={e => setHashtags(e.target.value)} rows={2} className={`${sosmedInput} mt-1`} />
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={doSave} disabled={save.isPending} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: PINK }}>{save.isPending ? "Saving…" : "Save"}</button>
                <button onClick={() => approve.mutate({ id, status: "approved" })} disabled={approve.isPending} className="px-4 py-2 rounded-lg text-sm font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Approve</button>
                <button onClick={() => { if (confirm("Delete this draft?")) del.mutate({ id }); }} className="text-sm text-red-500 hover:underline ml-auto">Delete</button>
              </div>

              {/* Agent chat */}
              <div className="border border-slate-200 rounded-xl p-3 flex flex-col h-72">
                <div className="text-sm font-semibold text-slate-800 mb-2">Ask the agent (copy)</div>
                <div className="flex-1 overflow-auto space-y-2 text-sm">
                  {chat.length === 0 && <div className="text-xs text-slate-400">e.g. "shorter caption", "more playful", "stronger CTA", "fully Indonesian".</div>}
                  {chat.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "you" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 ${m.role === "you" ? "text-white" : "bg-slate-100 text-slate-700"}`} style={m.role === "you" ? { background: CORAL } : undefined}>{m.text}</div>
                    </div>
                  ))}
                  {chatEdit.isPending && <div className="text-xs text-slate-400">thinking…</div>}
                </div>
                <div className="flex gap-2 mt-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendChat(); }} placeholder="Tell the agent what to change…" className={sosmedInput} />
                  <button onClick={sendChat} disabled={chatEdit.isPending || !chatInput.trim()} className="px-3 py-2 rounded-lg text-white text-sm shrink-0 disabled:opacity-50" style={{ background: PINK }}>Send</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
