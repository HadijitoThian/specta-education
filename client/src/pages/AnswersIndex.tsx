/** /jawab (Bahasa) and /answers (English) — index of published answer pages. */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { Loader2, Search } from "lucide-react";

const PINK = "#E91E8C";

export default function AnswersIndex() {
  const [location] = useLocation();
  const lang: "id" | "en" = location.startsWith("/answers") ? "en" : "id";
  const [qText, setQText] = useState("");
  const list = trpc.geo.listAnswers.useQuery({ lang });
  const cats = trpc.geo.categories.useQuery(undefined, { staleTime: Infinity });

  const t = lang === "id"
    ? { title: "Jawab: panduan kuliah luar negeri & IELTS 2026", sub: "Jawaban langsung dan berbasis fakta untuk pertanyaan pelajar Indonesia. Setiap halaman ditinjau oleh tim SpecTa dan diberi tanggal pembaruan.", search: "Cari pertanyaan…", empty: "Belum ada jawaban di sini. Segera hadir.", twin: "English version", faq: "FAQ singkat" }
    : { title: "Answers: study abroad & IELTS guide 2026", sub: "Direct, fact-based answers for Indonesian students. Every page is reviewed by the SpecTa team and dated.", search: "Search questions…", empty: "No answers here yet. Coming soon.", twin: "Versi Bahasa Indonesia", faq: "Quick FAQ" };

  const items = (list.data || []).filter(i => !qText || (i.question + " " + i.directAnswer).toLowerCase().includes(qText.toLowerCase()));
  const byCat = new Map<string, typeof items>();
  for (const i of items) byCat.set(i.category, [...(byCat.get(i.category) || []), i]);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <SEO title={`${lang === "id" ? "Jawab: Panduan Kuliah Luar Negeri & IELTS 2026" : "Answers: Study Abroad & IELTS Guide 2026"} | SpecTa Education`} description={t.sub} />
      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: PINK }}>SpecTa Education</div>
          <Link href={lang === "id" ? "/answers" : "/jawab"} className="text-xs underline text-indigo-700">{t.twin}</Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900" style={{ textWrap: "balance" as any }}>{t.title}</h1>
        <p className="mt-3 text-slate-600 max-w-2xl">{t.sub}</p>
        <div className="mt-5 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input value={qText} onChange={e => setQText(e.target.value)} placeholder={t.search} className="w-full border rounded-xl pl-9 pr-3 py-2.5 text-sm" />
        </div>

        {list.isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-slate-500">{t.empty} <Link href="/faq" className="underline">{t.faq}</Link></p>
        ) : (
          <div className="mt-8 space-y-8">
            {Array.from(byCat.entries()).map(([cat, rows]) => (
              <section key={cat}>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">{(cats.data as any)?.[cat]?.[lang] || cat}</h2>
                <ul className="space-y-2">
                  {rows.map(r => (
                    <li key={r.id}>
                      <Link href={r.path} className="block rounded-xl border border-slate-200 p-4 hover:border-pink-300 hover:bg-pink-50/30 transition">
                        <div className="font-semibold text-slate-900">{r.question}</div>
                        <div className="text-sm text-slate-600 mt-1 line-clamp-2">{r.directAnswer}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
