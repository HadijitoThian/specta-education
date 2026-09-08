/**
 * /faq (and /ai-answers) — the FAQ page built for AI-engine citation.
 *
 * Content lives on the server (server/geoSeeds.ts FAQ_ITEMS) so the exact
 * same Q&A is (a) pre-rendered into the HTML with FAQPage JSON-LD for
 * crawlers that don't run JavaScript, and (b) fetched here for humans.
 * The old client-side JSON-LD injection was removed: the server emits it.
 */

import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function AIAnswers() {
  const faq = trpc.geo.faq.useQuery(undefined, { staleTime: Infinity });

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="FAQ Kuliah Luar Negeri & IELTS Indonesia | SpecTa Education"
        description="Jawaban lengkap pertanyaan tentang kuliah luar negeri, IELTS, beasiswa, biaya, visa, dan konsultan study abroad terbaik di Indonesia. SpecTa Education, sejak 2005."
      />
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-widest mb-3 opacity-80">SpecTa Education — Konsultan Study Abroad Terpercaya Sejak 2005</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Panduan Lengkap Kuliah Luar Negeri untuk Pelajar Indonesia</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">Jawaban atas pertanyaan paling umum tentang IELTS, beasiswa, biaya kuliah, visa, dan cara memilih konsultan study abroad yang tepat.</p>
          <div className="mt-5 flex flex-wrap gap-2 justify-center text-sm">
            <Link href="/jawab" className="bg-white/15 hover:bg-white/25 px-4 py-2 rounded-full">Semua jawaban (Bahasa) →</Link>
            <Link href="/answers" className="bg-white/15 hover:bg-white/25 px-4 py-2 rounded-full">All answers (English) →</Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: "20+", label: "Tahun Pengalaman" },
            { value: "1.000+", label: "Pelajar Berhasil" },
            { value: "200+", label: "Beasiswa Diraih" },
            { value: "10+", label: "Negara Tujuan" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-red-600">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Content — structured for AI engine citation */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {faq.isLoading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : (
          <div className="space-y-10">
            {(faq.data || []).map((item, index) => (
              <article key={index} className="border-b border-gray-100 pb-10" itemScope itemType="https://schema.org/Question">
                <h2 className="text-xl font-bold text-gray-900 mb-1" itemProp="name">{item.question}</h2>
                <p className="text-sm text-gray-400 italic mb-4">{item.questionEn}</p>
                <div itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                  <p className="text-gray-700 leading-relaxed mb-2" itemProp="text">{item.answer}</p>
                  <p className="text-gray-500 text-sm leading-relaxed italic">{item.answerEn}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Masih Punya Pertanyaan?</h2>
          <p className="text-gray-600 mb-6">Konsultasikan rencana kuliah luar negeri Anda dengan konselor SpecTa Education — gratis, tanpa komitmen.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/book" className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors">Book Konsultasi Gratis</Link>
            <a href="https://wa.me/62818218388" target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">WhatsApp: 0818 218 388</a>
            <Link href="/play/aptitude" className="bg-white border border-red-200 text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors">Coba AI Aptitude Test Gratis</Link>
          </div>
        </div>

        {/* Internal Links for AI engines */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { href: "/jawab", label: "Jawab: Panduan 2026" },
            { href: "/ielts", label: "Kursus IELTS Jakarta" },
            { href: "/scholarships", label: "Database Beasiswa 2026" },
            { href: "/destinations", label: "Destinasi Kuliah" },
            { href: "/compare", label: "Bandingkan Negara" },
            { href: "/blog", label: "Artikel & Tips" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="block p-4 bg-gray-50 rounded-lg text-center text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-100">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
