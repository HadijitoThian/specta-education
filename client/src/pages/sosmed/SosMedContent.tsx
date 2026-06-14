/**
 * Content Studio (Phase 2). Brief → AI generates an on-brand caption + hashtags
 * + branded slide image(s). Drafts grid + detail view. (Editing comes in Phase 3.)
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { SosMedShell, sosmedInput } from "./SosMedShell";

const PINK = "#E91E8C";
const CORAL = "#FF6B4A";

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

type EditSlide = { headline: string; subheadline: string; imagePrompt: string; imageUrl?: string | null };

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

  const setSlide = (i: number, k: keyof EditSlide, v: string) => setSlides(s => s.map((sl, j) => (j === i ? { ...sl, [k]: v } : sl)));
  const copy = (text: string, what: string) => { navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); };

  const doSave = () => { setMsg(null); save.mutate({ id, caption, hashtags, slides }); };

  const doRegen = async (i: number) => {
    setRegenIdx(i); setMsg(null);
    try {
      const r = await regen.mutateAsync({ id, slideIndex: i, prompt: slides[i].imagePrompt, headline: slides[i].headline, subheadline: slides[i].subheadline });
      setSlides(s => s.map((sl, j) => (j === i ? { ...sl, imageUrl: r.imageUrl } : sl)));
      if (r.error) setMsg(`Slide ${i + 1}: ${r.error}`);
      refreshList();
    } catch (e: any) { setMsg(e.message); } finally { setRegenIdx(null); }
  };

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
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: slides + copy editor */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex gap-4 overflow-auto pb-2">
                {slides.map((s, i) => (
                  <div key={i} className="shrink-0 w-52">
                    <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center relative">
                      {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-300 text-xs px-2 text-center">no image</span>}
                      {regenIdx === i && <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs text-slate-600">Regenerating…</div>}
                    </div>
                    <input value={s.headline} onChange={e => setSlide(i, "headline", e.target.value)} className={`${sosmedInput} mt-2`} placeholder="Headline" />
                    <input value={s.subheadline} onChange={e => setSlide(i, "subheadline", e.target.value)} className={`${sosmedInput} mt-1`} placeholder="Subheadline" />
                    <textarea value={s.imagePrompt} onChange={e => setSlide(i, "imagePrompt", e.target.value)} rows={2} className={`${sosmedInput} mt-1 text-xs`} placeholder="Image prompt" />
                    <div className="flex items-center justify-between mt-1">
                      <button onClick={() => doRegen(i)} disabled={regenIdx !== null} className="text-xs text-purple-700 hover:underline disabled:opacity-50">↻ Regenerate</button>
                      {s.imageUrl && <a href={s.imageUrl} download={`specta-slide-${i + 1}.png`} className="text-xs text-pink-600 hover:underline">⬇ Download</a>}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Caption</span>
                  <button onClick={() => copy(caption, "cap")} className="text-xs text-pink-600 hover:underline">{copied === "cap" ? "Copied ✓" : "Copy"}</button>
                </div>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={6} className={`${sosmedInput} mt-1`} />
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
            </div>

            {/* Right: agent chat */}
            <div className="border border-slate-200 rounded-xl p-3 flex flex-col h-[28rem]">
              <div className="text-sm font-semibold text-slate-800 mb-2">Ask the agent</div>
              <div className="flex-1 overflow-auto space-y-2 text-sm">
                {chat.length === 0 && <div className="text-xs text-slate-400">e.g. "make the caption shorter", "more playful tone", "add a stronger CTA", "translate caption fully to Indonesian".</div>}
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
              <div className="text-[11px] text-slate-400 mt-1">Chat edits the copy. Use ↻ Regenerate for images.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
