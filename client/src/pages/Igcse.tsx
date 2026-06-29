/**
 * IGCSE AI Teacher — landing page (Phase 1 scaffold).
 *
 * Lives at /igcse. For Phase 1 this is a sales landing that:
 *  - explains the product (interactive AI teacher with whiteboard + voice),
 *  - lists the Cambridge IGCSE 0580 Extended topic areas (live from the
 *    seeded topic tree, so the route works end-to-end), and
 *  - shows a clear "private beta" CTA until the session room (whiteboard +
 *    voice) lands in subsequent weeks.
 */
import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Sparkles, PenTool, Mic, BookOpen, ArrowRight, CheckCircle } from "lucide-react";

const PURPLE = "#7c3aed";

export default function Igcse() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const topics = trpc.igcse.listTopics.useQuery(undefined, { staleTime: 60_000 });

  // Group seeded topics by Cambridge syllabus area (C1..C9) for display.
  const areas = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number; sample: string[] }>();
    for (const t of (topics.data || [])) {
      const cur = map.get(t.areaCode) || { code: t.areaCode, name: t.areaName, count: 0, sample: [] };
      cur.count += 1;
      if (cur.sample.length < 4) cur.sample.push(t.title);
      map.set(t.areaCode, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [topics.data]);

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Cambridge IGCSE AI Tutor — Math, Physics, Chemistry, Biology, Economics & Business | SpecTa"
        description="Belajar Cambridge IGCSE Math (0580), Physics (0625), Chemistry (0620), Biology (0610), Economics (0455) dan Business Studies (0450) bersama AI teacher yang bisa diajak ngobrol, menjelaskan langkah-demi-langkah di papan tulis digital, dan menilai jawaban exam seperti examiner asli. Coba gratis 30 menit."
        keywords="IGCSE AI tutor, IGCSE Math tutor, IGCSE Physics, IGCSE Economics, IGCSE Business Studies, Cambridge 0580, Cambridge 0625, Cambridge 0455, Cambridge 0450, AI teacher Indonesia, les IGCSE online, bimbel IGCSE, SpecTa Tutor"
        ogImage="/files/igcse/dashboard/hero.png"
      />
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-700" />
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl" />
        <div className="container relative z-10 max-w-5xl mx-auto text-white">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-sm font-medium mb-5 border border-white/20">
            <Sparkles className="w-4 h-4" /> Private beta — Cambridge IGCSE · Math + Physics + Chemistry + Economics + Business
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-5">
            An AI <span className="text-amber-300">IGCSE</span> teacher<br />
            that <em>talks</em>, <em>explains</em>, and <em>writes on the board</em>.
          </h1>
          <p className="text-lg text-white/85 max-w-2xl mb-7 leading-relaxed">
            Practise IGCSE Math (0580), Physics (0625), Chemistry (0620), Economics (0455) and Business Studies
            (0450) like you would with a private tutor — speak your question, watch the AI work through it
            step-by-step on a shared digital whiteboard, and sketch your own answers right alongside.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/igcse/app" className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-amber-50 transition">
              Start free trial (30 min) <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition">
              How it works
            </a>
          </div>
          <p className="text-white/70 text-xs mt-3">No credit card. Cancel anytime. Or <a href="#beta" className="underline">talk to us on WhatsApp</a>.</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 px-4">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">As close to a real tutor as software gets</h2>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <Mic className="w-7 h-7 text-violet-700 mb-3" />
              <h3 className="font-bold text-gray-900 mb-1.5">Speak naturally</h3>
              <p className="text-sm text-gray-600">Ask "Show me how to solve x² + 5x + 6 = 0", "Explain Newton's second law", "Balance H₂ + O₂ → H₂O for me", "What is opportunity cost?", or "How do I calculate break-even output?" out loud — the AI listens, thinks, and answers in real time, in English or Bahasa.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <PenTool className="w-7 h-7 text-violet-700 mb-3" />
              <h3 className="font-bold text-gray-900 mb-1.5">Watch it write</h3>
              <p className="text-sm text-gray-600">The AI works step-by-step on a digital whiteboard — equations, diagrams, working — exactly how a teacher would on a real one.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <BookOpen className="w-7 h-7 text-violet-700 mb-3" />
              <h3 className="font-bold text-gray-900 mb-1.5">Your turn</h3>
              <p className="text-sm text-gray-600">Sketch your own answer on the same board. The AI checks your working, points out where you went wrong, and walks you back through it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Syllabus coverage */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full mb-3">CAMBRIDGE IGCSE · MATH 0580 + PHYSICS 0625 + CHEMISTRY 0620 + BIOLOGY 0610 + ECONOMICS 0455 + BUSINESS 0450</div>
            <h2 className="text-2xl md:text-3xl font-bold">Full syllabus, taught one topic at a time</h2>
            <p className="text-gray-500 mt-2">Mapped directly to Cambridge's published syllabus areas. No filler — every topic is graded the way IGCSE examiners grade.</p>
          </div>

          {topics.isLoading ? (
            <div className="text-center text-gray-400 py-12">Loading topics…</div>
          ) : !areas.length ? (
            <div className="text-center text-gray-400 py-12">Topic tree is being seeded — refresh in a moment.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {areas.map(a => (
                <div key={a.code} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-violet-700 bg-violet-50 px-2 py-0.5 rounded">{a.code}</span>
                    <span className="text-xs text-gray-400">{a.count} topics</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{a.name}</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {a.sample.map(s => (
                      <li key={s} className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />{s}</li>
                    ))}
                    {a.count > a.sample.length && <li className="text-xs text-gray-400 ml-5">+ {a.count - a.sample.length} more…</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pricing + Beta CTA */}
      <section id="beta" className="py-16 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="rounded-3xl p-8 md:p-10 text-white text-center" style={{ background: `linear-gradient(120deg, ${PURPLE}, #db2777)` }}>
            <div className="text-4xl mb-3">🎓</div>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2">30 minutes free, then Rp 299.000/month</h2>
            <p className="text-white/90 mb-6 max-w-xl mx-auto">
              Get the full Cambridge IGCSE 0580 (Math), 0625 (Physics), 0620 (Chemistry), 0610 (Biology), 0455 (Economics) and 0450 (Business Studies) syllabus — 6 subjects, with hours pooled across your selected subjects.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/igcse/app" className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold px-6 py-3 rounded-xl shadow hover:bg-amber-50 transition">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://wa.me/62818218388?text=Hi%2C%20I%27m%20interested%20in%20the%20IGCSE%20Math%20%26%20Physics%20AI%20Teacher%20beta"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition"
              >
                Talk to us on WhatsApp
              </a>
            </div>
            <p className="text-xs text-white/70 mt-5">Private beta — early students lock in launch pricing.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
