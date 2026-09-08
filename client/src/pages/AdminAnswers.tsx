/**
 * /admin/answers — the GEO engine's control room.
 *   1. AI-assistant referrals (last 30/90 days) so we can see citations turn into visits.
 *   2. The seed bank: generate the Bahasa + English pair for any question.
 *   3. Review & publish: edit the direct answer, meta and notes, then publish.
 *   4. The monthly citation check-list.
 * Admin-only. Nothing goes live until Hadi presses Publish.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, CheckCircle2, ExternalLink, RefreshCw, Archive, Eye } from "lucide-react";

type Status = "draft" | "published" | "archived";
const CITATION_PROMPTS = [
  "konsultan study abroad terbaik di Jakarta",
  "biaya kuliah di Australia 2026 untuk pelajar Indonesia",
  "syarat visa pelajar Australia 2026 untuk WNI",
  "apakah IELTS 6.0 cukup untuk kuliah di Australia",
  "beasiswa kuliah S1 luar negeri untuk pelajar Indonesia 2026",
  "kuliah di Malaysia atau Australia lebih baik",
  "kursus IELTS terbaik di Jakarta",
  "cara mendapatkan band 7 IELTS writing",
  "kapan mendaftar kuliah di Inggris intake September 2027",
  "bukti dana visa pelajar Australia 2026",
  "best study abroad consultant Indonesia",
  "cost of studying in the UK for Indonesian students 2026",
  "Genuine Student requirement Australia how to answer",
  "IELTS mock test with AI examiner Indonesia",
  "full scholarship Malaysia for Indonesian students",
];

export default function AdminAnswers() {
  const utils = trpc.useUtils();
  const [days, setDays] = useState<30 | 90>(30);
  const [filter, setFilter] = useState<Status | "all">("draft");
  const [selected, setSelected] = useState<number | null>(null);
  const [customId, setCustomId] = useState("");
  const [customEn, setCustomEn] = useState("");
  const [customCat, setCustomCat] = useState("proses");
  const [msg, setMsg] = useState<string | null>(null);

  const referrals = trpc.admin.geo.aiReferrals.useQuery({ days });
  const seeds = trpc.admin.geo.seeds.useQuery();
  const pages = trpc.admin.geo.list.useQuery(filter === "all" ? undefined : { status: filter });
  const cats = trpc.geo.categories.useQuery(undefined, { staleTime: Infinity });
  const refreshAll = () => { utils.admin.geo.seeds.invalidate(); utils.admin.geo.list.invalidate(); };
  // Background generation: poll while anything is queued/running; refresh
  // the lists whenever a job finishes.
  const jobs = trpc.admin.geo.jobs.useQuery(undefined, { refetchInterval: 4000 });
  const activeJobs = (jobs.data || []).filter(j => j.status === "queued" || j.status === "running").length;
  const prevActive = useRef(0);
  useEffect(() => { if (prevActive.current > activeJobs) refreshAll(); prevActive.current = activeJobs; }, [activeJobs]); // eslint-disable-line react-hooks/exhaustive-deps
  const jobFor = (key: string) => (jobs.data || []).find(j => j.key === key);

  const generate = trpc.admin.geo.generate.useMutation({
    onSuccess: (d) => { setMsg(d.started ? "Queued. Generating the Bahasa + English pair takes 2–5 minutes — the row shows progress and the drafts appear below when done." : `Not started: ${d.reason}`); jobs.refetch(); },
    onError: (e) => setMsg(`Error: ${e.message}`),
  });
  const generateCustom = trpc.admin.geo.generateCustom.useMutation({
    onSuccess: (d) => { setMsg(d.started ? "Queued. The custom pair will appear as drafts in 2–5 minutes." : `Not started: ${d.reason}`); setCustomId(""); setCustomEn(""); jobs.refetch(); },
    onError: (e) => setMsg(`Error: ${e.message}`),
  });
  const setStatus = trpc.admin.geo.setStatus.useMutation({ onSuccess: () => { refreshAll(); setMsg("Status updated."); } });

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setChecks(JSON.parse(localStorage.getItem("specta_geo_checks") || "{}")); } catch { /* */ } }, []);
  const toggleCheck = (k: string) => { const n = { ...checks, [k]: !checks[k] }; setChecks(n); try { localStorage.setItem("specta_geo_checks", JSON.stringify(n)); } catch { /* */ } };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="pt-24 pb-16 max-w-6xl mx-auto px-4 space-y-8">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Admin · GEO</div>
          <h1 className="text-2xl font-black text-slate-900">Answer pages for AI search</h1>
          <p className="text-sm text-slate-600 mt-1">Generate → review → publish. Published pages are server-rendered for AI crawlers and listed in the sitemap and llms.txt automatically.</p>
          {msg && <div className="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-900">{msg}</div>}
        </div>

        {/* 1. AI referrals */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Visits from AI assistants</h2>
            <div className="flex gap-1 text-xs">
              {([30, 90] as const).map(d => <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 rounded-full border ${days === d ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-600"}`}>{d} days</button>)}
            </div>
          </div>
          {referrals.isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : referrals.data ? (
            <div>
              <div className="text-sm text-slate-700 mb-3"><b>{referrals.data.totalAiSessions}</b> sessions arrived from AI assistants out of {referrals.data.totalSessionsWithReferrer} with a referrer. Google AI Overviews arrive as google.com and can't be separated from search.</div>
              {referrals.data.sources.length === 0 ? <div className="text-sm text-slate-500">No AI-assistant referrals yet in this window. Citations usually show 4–8 weeks after pages go live.</div> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-1">Source</th><th>Sessions</th><th>Leads</th><th>Top landing pages</th></tr></thead>
                  <tbody>{referrals.data.sources.map(s => (
                    <tr key={s.source} className="border-t border-slate-100"><td className="py-2 font-semibold">{s.source}</td><td>{s.sessions}</td><td>{s.leads}</td><td className="text-xs text-slate-600">{s.topLandingPages.map(p => `${p.page} (${p.n})`).join(" · ")}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          ) : null}
        </section>

        {/* 2. Seed bank */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Question bank ({seeds.data?.length || 0})</h2>
            <button onClick={() => {
              const next = (seeds.data || []).filter(s => !s.id && !s.en).slice(0, 3);
              if (!next.length) { setMsg("Every seed question already has pages."); return; }
              setMsg(`Queued ${next.length} pairs — they run one after another in the background (2–5 minutes each).`);
              next.forEach(s => generate.mutate({ key: s.key }));
            }} disabled={activeJobs > 0} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold flex items-center gap-1 disabled:opacity-50"><Sparkles className="w-3.5 h-3.5" /> {activeJobs > 0 ? `${activeJobs} in progress…` : "Generate next 3 missing"}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-1">Category</th><th>Question (ID / EN)</th><th>ID</th><th>EN</th><th></th></tr></thead>
              <tbody>{(seeds.data || []).map(s => (
                <tr key={s.key} className="border-t border-slate-100 align-top">
                  <td className="py-2 text-xs text-slate-500 whitespace-nowrap">{(cats.data as any)?.[s.category]?.en || s.category}</td>
                  <td className="py-2"><div className="text-slate-900">{s.questionId}</div><div className="text-xs text-slate-500">{s.questionEn}</div></td>
                  <td className="py-2"><Badge s={s.id?.status} /></td>
                  <td className="py-2"><Badge s={s.en?.status} /></td>
                  <td className="py-2 text-right">
                    {(() => { const j = jobFor(s.key); if (j && (j.status === "queued" || j.status === "running")) return <span className="text-xs text-indigo-700 animate-pulse">{j.status === "running" ? "generating…" : "queued"}</span>; return null; })()}
                    {(() => { const j = jobFor(s.key); if (j && j.status === "error") return <div className="text-[11px] text-red-600 max-w-[220px] text-right">{j.error}</div>; return null; })()}
                    {(() => { const j = jobFor(s.key); const busy = !!j && (j.status === "queued" || j.status === "running"); return (
                      <button onClick={() => generate.mutate({ key: s.key })} disabled={busy} className="text-xs px-2.5 py-1 rounded-lg border border-indigo-300 text-indigo-700 font-semibold disabled:opacity-50">{s.id || s.en ? "Regenerate" : "Generate"}</button>
                    ); })()}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4 grid md:grid-cols-[1fr_1fr_140px_auto] gap-2 items-start">
            <input value={customId} onChange={e => setCustomId(e.target.value)} placeholder="Pertanyaan baru (Bahasa)" className="border rounded-lg px-3 py-2 text-sm" />
            <input value={customEn} onChange={e => setCustomEn(e.target.value)} placeholder="Same question (English)" className="border rounded-lg px-3 py-2 text-sm" />
            <select value={customCat} onChange={e => setCustomCat(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">{Object.entries((cats.data as any) || {}).map(([k, v]: any) => <option key={k} value={k}>{v.en}</option>)}</select>
            <button onClick={() => generateCustom.mutate({ questionId: customId, questionEn: customEn, category: customCat })} disabled={generateCustom.isPending || customId.length < 8 || customEn.length < 8} className="text-sm px-3 py-2 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50">{generateCustom.isPending ? "Generating…" : "Generate custom"}</button>
          </div>
        </section>

        {/* 3. Review & publish */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-bold text-slate-900">Review & publish</h2>
            <div className="flex gap-1 text-xs">{(["draft", "published", "archived", "all"] as const).map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full border ${filter === f ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"}`}>{f}</button>)}</div>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
              {pages.isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : (pages.data || []).length === 0 ? <div className="text-sm text-slate-500">Nothing here yet.</div> : (pages.data || []).map(p => (
                <button key={p.id} onClick={() => setSelected(p.id)} className={`w-full text-left rounded-xl border p-3 ${selected === p.id ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500"><span className="uppercase font-bold">{p.lang}</span><Badge s={p.status} /><span>{(cats.data as any)?.[p.category]?.en || p.category}</span></div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">{p.question}</div>
                </button>
              ))}
            </div>
            <div>{selected ? <Editor id={selected} onStatus={(s) => setStatus.mutate({ id: selected, status: s })} onSaved={() => { refreshAll(); setMsg("Saved."); }} /> : <div className="text-sm text-slate-500 p-4">Select a page to review it.</div>}</div>
          </div>
        </section>

        {/* 4. Citation check */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-1">Monthly citation check</h2>
          <p className="text-sm text-slate-600 mb-3">Once a month, run each prompt in ChatGPT, Perplexity and Google AI Mode. Tick it if SpecTa is cited or linked. Expect the first citations 4–8 weeks after publishing.</p>
          <ul className="grid md:grid-cols-2 gap-1.5">{CITATION_PROMPTS.map(p => (
            <li key={p}><label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" checked={!!checks[p]} onChange={() => toggleCheck(p)} className="mt-1" /><span>{p}</span></label></li>
          ))}</ul>
        </section>
      </main>
    </div>
  );
}

function Badge({ s }: { s?: string | null }) {
  if (!s) return <span className="text-[11px] text-slate-400">—</span>;
  const cls = s === "published" ? "bg-emerald-100 text-emerald-700" : s === "draft" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cls}`}>{s}</span>;
}

function Editor({ id, onStatus, onSaved }: { id: number; onStatus: (s: Status) => void; onSaved: () => void }) {
  const q = trpc.admin.geo.get.useQuery({ id });
  const update = trpc.admin.geo.update.useMutation({ onSuccess: () => { q.refetch(); onSaved(); } });
  const [form, setForm] = useState<{ question: string; directAnswer: string; metaTitle: string; metaDescription: string; keywords: string; contentJson: string }>({ question: "", directAnswer: "", metaTitle: "", metaDescription: "", keywords: "", contentJson: "" });
  const [showJson, setShowJson] = useState(false);
  useEffect(() => {
    if (q.data) setForm({
      question: q.data.question, directAnswer: q.data.directAnswer, metaTitle: q.data.metaTitle || "", metaDescription: q.data.metaDescription || "", keywords: q.data.keywords || "",
      contentJson: JSON.stringify(q.data.content, null, 2),
    });
  }, [q.data]);
  const path = useMemo(() => q.data ? `/${q.data.lang === "id" ? "jawab" : "answers"}/${q.data.slug}` : "", [q.data]);
  if (q.isLoading || !q.data) return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  const p = q.data;
  const c = p.content as any;
  const save = () => {
    let content: any = undefined;
    if (showJson) { try { content = JSON.parse(form.contentJson); } catch { alert("Content JSON is invalid."); return; } }
    update.mutate({ id, question: form.question, directAnswer: form.directAnswer, metaTitle: form.metaTitle, metaDescription: form.metaDescription, keywords: form.keywords, ...(content ? { content } : {}) });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="uppercase font-bold">{p.lang}</span><Badge s={p.status} /><span>{p.slug}</span></div>
        <div className="flex gap-1.5">
          {p.status === "published" && <a href={path} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Open</a>}
          {p.status !== "published" && <button onClick={() => onStatus("published")} className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Publish</button>}
          {p.status === "published" && <button onClick={() => onStatus("draft")} className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-700 font-semibold flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Unpublish</button>}
          {p.status !== "archived" && <button onClick={() => onStatus("archived")} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 flex items-center gap-1"><Archive className="w-3.5 h-3.5" /> Archive</button>}
        </div>
      </div>
      {p.verifyNotes && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 whitespace-pre-wrap"><b>Check before publishing:</b>{"\n"}{p.verifyNotes}</div>}
      <label className="block text-xs font-semibold text-slate-600">Question (H1)<input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></label>
      <label className="block text-xs font-semibold text-slate-600">Direct answer (the paragraph AI engines quote)<textarea value={form.directAnswer} onChange={e => setForm({ ...form, directAnswer: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[110px]" /></label>
      <div className="grid md:grid-cols-2 gap-2">
        <label className="block text-xs font-semibold text-slate-600">Meta title ({form.metaTitle.length}/60)<input value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></label>
        <label className="block text-xs font-semibold text-slate-600">Keywords<input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></label>
      </div>
      <label className="block text-xs font-semibold text-slate-600">Meta description ({form.metaDescription.length}/160)<textarea value={form.metaDescription} onChange={e => setForm({ ...form, metaDescription: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[60px]" /></label>

      <details className="rounded-xl border border-slate-200 p-3">
        <summary className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Preview body</summary>
        <div className="mt-3 text-sm text-slate-800 space-y-3 max-h-[420px] overflow-y-auto">
          {c.facts?.length > 0 && <table className="text-xs w-full"><tbody>{c.facts.map((f: any, i: number) => <tr key={i} className="border-t"><th className="text-left py-1 pr-2 align-top">{f.label}</th><td className="py-1">{f.value}{f.note ? ` (${f.note})` : ""}</td></tr>)}</tbody></table>}
          {(c.sections || []).map((s: any, i: number) => <div key={i}><div className="font-bold">{s.heading}</div>{(s.paragraphs || []).map((x: string, j: number) => <p key={j} className="mt-1">{x}</p>)}{s.bullets?.length > 0 && <ul className="list-disc pl-5 mt-1">{s.bullets.map((b: string, j: number) => <li key={j}>{b}</li>)}</ul>}</div>)}
          {c.faqs?.length > 0 && <div><div className="font-bold">FAQ</div>{c.faqs.map((f: any, i: number) => <p key={i} className="mt-1"><b>{f.question}</b> {f.answer}</p>)}</div>}
          {(p.sources as any[])?.length > 0 && <div className="text-xs text-slate-500">Sources: {(p.sources as any[]).map((s: any) => s.url).join(" · ")}</div>}
        </div>
      </details>
      <details className="rounded-xl border border-slate-200 p-3" onToggle={(e) => setShowJson((e.target as HTMLDetailsElement).open)}>
        <summary className="text-xs font-semibold text-slate-700 cursor-pointer">Edit body (JSON, advanced)</summary>
        <textarea value={form.contentJson} onChange={e => setForm({ ...form, contentJson: e.target.value })} className="mt-2 w-full border rounded-lg px-3 py-2 font-mono text-xs min-h-[260px]" />
      </details>
      <button onClick={save} disabled={update.isPending} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">{update.isPending ? "Saving…" : "Save changes"}</button>
    </div>
  );
}
