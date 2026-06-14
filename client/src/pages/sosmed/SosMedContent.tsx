/**
 * Content Studio (Phase 2). Brief → AI generates an on-brand caption + hashtags
 * + branded slide image(s). Drafts grid + detail view. (Editing comes in Phase 3.)
 */
import { useState } from "react";
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

function DraftDetail({ id, onClose, onDeleted }: { id: number; onClose: () => void; onDeleted: () => void }) {
  const q = trpc.sosmed.getContent.useQuery({ id });
  const del = trpc.sosmed.deleteContent.useMutation({ onSuccess: onDeleted });
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, what: string) => { navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-800">Draft</div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:underline">Close</button>
        </div>
        {q.isLoading ? <div className="text-slate-400 mt-4">Loading…</div> : q.data ? (
          <div className="mt-4">
            {/* Slides */}
            <div className="flex gap-3 overflow-auto pb-2">
              {q.data.slidesParsed.map((s, i) => (
                <div key={i} className="shrink-0 w-48">
                  <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-300 text-xs px-2 text-center">{s.headline || "no image"}</span>}
                  </div>
                  <div className="text-xs font-medium text-slate-700 mt-1">{s.headline}</div>
                  <div className="text-[11px] text-slate-400">{s.subheadline}</div>
                  {s.imageUrl && (
                    <a href={s.imageUrl} download={`specta-slide-${i + 1}.png`} className="inline-block mt-1 text-xs text-pink-600 hover:underline">⬇ Download</a>
                  )}
                </div>
              ))}
            </div>

            {/* Caption */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Caption</div>
                <button onClick={() => copy(q.data!.caption || "", "caption")} className="text-xs text-pink-600 hover:underline">{copied === "caption" ? "Copied ✓" : "Copy"}</button>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap mt-1 bg-slate-50 rounded-lg p-3">{q.data.caption}</div>
            </div>

            {/* Hashtags */}
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hashtags</div>
                <button onClick={() => copy(q.data!.hashtags || "", "tags")} className="text-xs text-pink-600 hover:underline">{copied === "tags" ? "Copied ✓" : "Copy"}</button>
              </div>
              <div className="text-sm text-slate-500 mt-1">{q.data.hashtags}</div>
            </div>

            <div className="mt-5 flex justify-between items-center">
              <div className="text-xs text-slate-400">Editing & scheduling come in the next phases.</div>
              <button onClick={() => { if (confirm("Delete this draft?")) del.mutate({ id }); }} className="text-sm text-red-500 hover:underline">Delete</button>
            </div>
          </div>
        ) : <div className="text-slate-500 mt-4">Not found.</div>}
      </div>
    </div>
  );
}
