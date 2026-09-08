/**
 * /jawab/:slug (Bahasa) and /answers/:slug (English) — one GEO answer page.
 * The server pre-renders the same content for crawlers (seoMetaInjector);
 * this is the human-facing render.
 */

import { Link, useRoute } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowRight, Languages, CalendarDays } from "lucide-react";

const PINK = "#E91E8C";

export default function AnswerPage() {
  const [isId, pId] = useRoute<{ slug: string }>("/jawab/:slug");
  const [, pEn] = useRoute<{ slug: string }>("/answers/:slug");
  const lang: "id" | "en" = isId ? "id" : "en";
  const slug = (isId ? pId?.slug : pEn?.slug) || "";
  const q = trpc.geo.getAnswer.useQuery({ lang, slug }, { enabled: !!slug, retry: false });
  const cats = trpc.geo.categories.useQuery(undefined, { staleTime: Infinity });

  const t = lang === "id"
    ? { home: "Beranda", index: "Jawab", updated: "Diperbarui", facts: "Fakta penting", faq: "Pertanyaan terkait", takeaways: "Intinya", sources: "Sumber", related: "Jawaban lain di topik ini", twin: "Read in English", notfound: "Halaman tidak ditemukan.", back: "Lihat semua jawaban", cta: "Konsultasi gratis dengan SpecTa" }
    : { home: "Home", index: "Answers", updated: "Updated", facts: "Key facts", faq: "Related questions", takeaways: "Key takeaways", sources: "Sources", related: "More answers on this topic", twin: "Baca dalam Bahasa Indonesia", notfound: "Page not found.", back: "See all answers", cta: "Free consultation with SpecTa" };
  const indexPath = lang === "id" ? "/jawab" : "/answers";

  if (q.isLoading) {
    return <Shell><div className="py-20 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-slate-400" /></div></Shell>;
  }
  if (q.isError || !q.data) {
    return (
      <Shell>
        <SEO title={`${t.notfound} | SpecTa Education`} description={t.notfound} noindex />
        <div className="py-20 text-center">
          <h1 className="text-2xl font-black text-slate-900">{t.notfound}</h1>
          <Link href={indexPath} className="inline-block mt-4 underline" style={{ color: PINK }}>{t.back}</Link>
        </div>
      </Shell>
    );
  }

  const { page: p, related } = q.data;
  const c = p.content as any;
  const sources = (p.sources as Array<{ title: string; url: string }>) || [];
  const updated = new Date((p.lastReviewedAt || p.publishedAt || p.updatedAt) as any);
  const updatedStr = updated.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { year: "numeric", month: "long", day: "numeric" });
  const twinHref = p.pairSlug ? `/${lang === "id" ? "answers" : "jawab"}/${p.pairSlug}` : null;
  const catLabel = (cats.data as any)?.[p.category]?.[lang] || p.category;

  return (
    <Shell>
      <SEO title={p.metaTitle || `${p.question} | SpecTa Education`} description={p.metaDescription || p.directAnswer.slice(0, 158)} keywords={p.keywords || undefined} />
      <article className="max-w-3xl mx-auto px-4">
        <nav className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mb-4">
          <Link href="/" className="hover:underline">{t.home}</Link><span>›</span>
          <Link href={indexPath} className="hover:underline">{t.index}</Link><span>›</span>
          <span className="text-slate-700">{catLabel}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: "#FCE7F3", color: PINK }}>{catLabel}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {t.updated} {updatedStr}</span>
          {twinHref && <Link href={twinHref} className="text-xs flex items-center gap-1 underline text-indigo-700"><Languages className="w-3.5 h-3.5" /> {t.twin}</Link>}
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight" style={{ textWrap: "balance" as any }}>{p.question}</h1>

        <div className="mt-6 rounded-2xl border-2 p-5 text-lg leading-relaxed text-slate-900" style={{ borderColor: PINK, background: "#FFF5FA" }}>
          {p.directAnswer}
        </div>
        {c.intro && <p className="mt-5 text-slate-700 leading-relaxed">{c.intro}</p>}

        {c.facts?.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3">{t.facts}</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  {c.facts.map((f: any, i: number) => (
                    <tr key={i} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                      <th scope="row" className="text-left font-semibold text-slate-800 px-4 py-2.5 align-top w-2/5">{f.label}</th>
                      <td className="px-4 py-2.5 text-slate-800">{f.value}{f.note && <div className="text-xs text-slate-500 mt-0.5">{f.note}</div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(c.sections || []).map((s: any, i: number) => (
          <section key={i} className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{s.heading}</h2>
            {(s.paragraphs || []).map((para: string, j: number) => <p key={j} className="text-slate-700 leading-relaxed mb-3">{para}</p>)}
            {s.bullets?.length > 0 && <ul className="list-disc pl-5 space-y-1.5 text-slate-700">{s.bullets.map((b: string, j: number) => <li key={j}>{b}</li>)}</ul>}
          </section>
        ))}

        {c.keyTakeaways?.length > 0 && (
          <section className="mt-8 rounded-2xl bg-indigo-50 border border-indigo-100 p-5">
            <h2 className="text-lg font-bold text-indigo-900 mb-2">{t.takeaways}</h2>
            <ul className="space-y-1.5 text-slate-800">{c.keyTakeaways.map((k: string, i: number) => <li key={i} className="flex gap-2"><span className="text-indigo-500 font-bold">✓</span>{k}</li>)}</ul>
          </section>
        )}

        {c.faqs?.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3">{t.faq}</h2>
            <div className="space-y-2">
              {c.faqs.map((f: any, i: number) => (
                <details key={i} className="rounded-xl border border-slate-200 bg-white p-4 group">
                  <summary className="font-semibold text-slate-900 cursor-pointer list-none flex justify-between items-center gap-3">{f.question}<span className="text-slate-400 group-open:rotate-90 transition">›</span></summary>
                  <p className="mt-2 text-slate-700 leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {c.cta && (
          <div className="mt-8">
            <Link href={c.cta.href} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold shadow-lg" style={{ background: "linear-gradient(90deg,#E91E8C,#9C27B0)" }}>
              {c.cta.text || t.cta} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {sources.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">{t.sources}</h2>
            <ul className="text-sm space-y-1">{sources.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="underline text-indigo-700">{s.title}</a></li>)}</ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-10 border-t border-slate-200 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">{t.related}</h2>
            <ul className="space-y-2">{related.map(r => <li key={r.id}><Link href={r.path} className="text-slate-900 font-medium hover:underline">{r.question}</Link></li>)}</ul>
          </section>
        )}
      </article>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="pt-24 pb-16">{children}</main>
      <Footer />
    </div>
  );
}
