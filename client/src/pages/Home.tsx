import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { SEO } from '@/components/SEO';
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { GraduationCap, Globe, BookOpen, Phone, Mail, MapPin, ChevronRight, X, ChevronDown, Star, Quote, Bell, FileCheck, Calendar, MessageSquare, ShieldCheck, TrendingUp, Users, CheckCircle2, Heart } from "lucide-react";
// Lazy-load heavy below-the-fold components to reduce initial bundle
const ChatBot = lazy(() => import("@/components/ChatBot"));
const ChatBotButton = lazy(() => import("@/components/ChatBotButton"));
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const countries = [
  { name: "Malaysia", flag: "🇲🇾", slug: "/malaysia", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=300&fit=crop" },
  { name: "Singapore", flag: "🇸🇬", slug: "/destinations/singapore", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=300&fit=crop" },
  { name: "Australia", flag: "🇦🇺", slug: "/destinations/australia", image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&h=300&fit=crop" },
  { name: "United Kingdom", flag: "🇬🇧", slug: "/destinations/uk", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop" },
  { name: "China", flag: "🇨🇳", slug: "/destinations/china", image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop" },
  { name: "USA", flag: "🇺🇸", slug: "/destinations/usa", image: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400&h=300&fit=crop" },
  { name: "Canada", flag: "🇨🇦", slug: "/destinations/canada", image: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400&h=300&fit=crop" },
  { name: "Ireland", flag: "🇮🇪", slug: "/destinations/ireland", image: "https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?w=400&h=300&fit=crop" },
  { name: "New Zealand", flag: "🇳🇿", slug: "/destinations/new-zealand", image: "https://images.unsplash.com/photo-1469521669194-babb45599def?w=400&h=300&fit=crop" },
  { name: "Netherlands", flag: "🇳🇱", slug: "/destinations/netherlands", image: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop" },
];

const stats = [
  { number: 1000, suffix: "+", label: "Students Assisted" },
  { number: 50, suffix: "+", label: "Partner Universities" },
  { number: 10, suffix: "+", label: "Countries" },
  { number: 15, suffix: "+", label: "Years Experience" },
];

// Counting animation component
function CountUp({ end, suffix, duration = 2 }: { end: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const increment = end / (duration * 60);
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 1000 / 60);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <div ref={ref}>{count}{suffix}</div>;
}

function ReviewCard({ review, index }: { review: { name: string; branch: string; destination: string; text: string; highlight: string }; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 150;
  return (
    <motion.div
      className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all relative cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      onClick={() => isLong && setExpanded(!expanded)}
    >
      <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
      <div className="flex items-center gap-0.5 mb-3">
        {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />)}
      </div>
      <p className={`text-sm text-muted-foreground mb-2 transition-all duration-300 ${expanded ? '' : 'line-clamp-4'}`}>"{review.text}"</p>
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors mb-3 flex items-center gap-1"
        >
          {expanded ? 'Show less' : 'Read more'}
          <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
      {!isLong && <div className="mb-2" />}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">{review.name}</div>
          <div className="text-xs text-muted-foreground">{review.branch} Branch · {review.destination}</div>
        </div>
        <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">{review.highlight}</span>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    document.title = "SpecTa Education - Study Abroad Consultant & IELTS Prep";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'SpecTa Education helps students study abroad in 10+ countries with expert counseling, IELTS prep, university matching, and scholarship guidance since 2005.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'SpecTa Education helps students study abroad in 10+ countries with expert counseling, IELTS prep, university matching, and scholarship guidance since 2005.';
      document.head.appendChild(meta);
    }
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'study abroad consultant Jakarta, IELTS preparation Indonesia, kuliah luar negeri, SpecTa Education, overseas university application, beasiswa luar negeri');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'study abroad consultant Jakarta, IELTS preparation Indonesia, kuliah luar negeri, SpecTa Education, overseas university application, beasiswa luar negeri';
      document.head.appendChild(meta);
    }
  }, []);

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="SpecTa Education - Study Abroad Consultant Indonesia | Kuliah di Luar Negeri"
        description="SpecTa Education adalah konsultan pendidikan luar negeri terpercaya di Indonesia. Dapatkan bimbingan lengkap untuk kuliah di Australia, UK, Kanada, Selandia Baru, dan Irlandia. Free consultation, IELTS preparation, visa assistance."
        keywords="study abroad, kuliah luar negeri, konsultan pendidikan, education consultant Indonesia, study in Australia, study in UK, IELTS preparation, beasiswa luar negeri, visa pelajar"
      />
      <Navigation currentPage="home" />

      {/* Hero Section with Excited Students */}
      <section className="pt-28 pb-16 px-4 relative overflow-hidden">
        {/* Animated Floating Landmarks Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute text-6xl opacity-10"
            style={{ top: '15%', left: '5%' }}
            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            🗼
          </motion.div>
          <motion.div 
            className="absolute text-5xl opacity-10"
            style={{ top: '25%', right: '8%' }}
            animate={{ y: [0, 12, 0], rotate: [0, -3, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            🏛️
          </motion.div>
          <motion.div 
            className="absolute text-4xl opacity-10"
            style={{ bottom: '30%', left: '12%' }}
            animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            🎡
          </motion.div>
          <motion.div 
            className="absolute text-5xl opacity-10"
            style={{ bottom: '20%', right: '15%' }}
            animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          >
            🗽
          </motion.div>
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-coral/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium"
              >
                <GraduationCap className="w-4 h-4" />
                Your Study Abroad Journey Starts Here
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
              >
                Ready to <span className="text-gradient-specta">Study Abroad</span>?
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-muted-foreground max-w-lg"
              >
                SpecTa Education will help your study journey throughout different countries and universities with our experienced Education Counselors!
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/destinations">
                  <Button size="lg" variant="outline">
                    Explore Destinations
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            </div>
            
            {/* Excited Students Image */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10">
                <motion.img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/QxFYGzgmpzrKbZOs.jpg" 
                  alt="Excited students ready to study abroad" 
                  className="w-full max-w-lg mx-auto rounded-2xl shadow-2xl object-cover"
                  fetchPriority="high"
                  decoding="async"
                  animate={{ 
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── IELTS Mock Test — headline offering ── */}
      <section className="py-12">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-700 p-8 md:p-12 text-white shadow-xl"
          >
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl" />
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-200 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  NEW · Full 4-skill mock test
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
                  Take a full IELTS Mock Test.
                  <br />
                  Get your band score — today.
                </h2>
                <p className="text-white/85 text-base md:text-lg mb-6 max-w-xl">
                  Listening, Reading, Writing & Speaking — graded by AI against
                  the official IELTS band rubric, with a personalised report
                  emailed straight to you. Know exactly where you stand before
                  the real exam.
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/90 mb-7">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-300" /> All 4 skills (~2h 45m)</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-300" /> AI-graded to IELTS rubric</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-300" /> Branded PDF report by email</span>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/ielts/mock-test"
                    className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-amber-50 transition shadow-lg"
                  >
                    Start your mock test
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                  <div className="text-white/90">
                    <span className="text-2xl font-extrabold text-amber-300">Rp 79.000</span>
                    <span className="text-sm text-white/70"> · one-off, no subscription</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-6">
                  <div className="text-xs uppercase tracking-wider text-white/70 mb-3">
                    Your band-score report
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Listening", band: "7.5" },
                      { label: "Reading", band: "7.0" },
                      { label: "Writing", band: "6.5" },
                      { label: "Speaking", band: "7.0" },
                    ].map(s => (
                      <div key={s.label} className="bg-white/10 rounded-xl px-4 py-3">
                        <div className="text-xs text-white/70">{s.label}</div>
                        <div className="text-2xl font-bold">{s.band}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-amber-400/90 text-blue-900 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">Overall Band</span>
                    <span className="text-3xl font-extrabold">7.0</span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-3 leading-relaxed">
                    Sample report. Not an official IELTS score; not affiliated
                    with British Council, IDP, or Cambridge.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section with Counting Animation */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div 
                key={index} 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  <CountUp end={stat.number} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tes Bakat AI Promo Banner — Free vs Pro */}
      <section className="py-12">
        <div className="container">
          <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-500 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            {/* Floating emojis */}
            <div className="absolute top-4 left-8 text-4xl opacity-20 animate-bounce" style={{ animationDelay: '0s' }}>🧠</div>
            <div className="absolute top-6 right-12 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '0.5s' }}>🎯</div>
            <div className="absolute bottom-4 left-1/4 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1s' }}>🎓</div>
            <div className="absolute bottom-6 right-1/4 text-4xl opacity-20 animate-bounce" style={{ animationDelay: '1.5s' }}>✨</div>

            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
                  <span className="text-yellow-300">🤖</span>
                  <span className="text-white/90 text-sm font-medium">AI-Powered • RIASEC + Multiple Intelligence + Personality</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Tes Bakat AI — Temukan Jurusan Terbaik Kamu!</h3>
                <p className="text-white/80 text-base max-w-xl mx-auto">Tes 10 menit dengan AI yang menganalisis minat, kepribadian & kecerdasan kamu secara mendalam.</p>
              </div>

              {/* Free vs Pro Cards */}
              <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* Free Card */}
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Gratis</div>
                  <div className="text-3xl font-bold text-white mb-1">Rp 0</div>
                  <p className="text-white/70 text-sm mb-4">Hasil ringkas via email</p>
                  <ul className="space-y-1.5 mb-5">
                    {["Tes RIASEC", "Hasil ringkas", "Rekomendasi jurusan"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-white/80 text-sm">
                        <span className="text-green-300">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/play/aptitude">
                    <button className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm border border-white/30">
                      Mulai Gratis →
                    </button>
                  </Link>
                </div>

                {/* Pro Card */}
                <div className="bg-white rounded-2xl p-6 relative shadow-xl">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow">⭐ PALING POPULER</span>
                  </div>
                  <div className="text-teal-600 text-xs font-semibold uppercase tracking-wider mb-2">Pro — Laporan Lengkap</div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-gray-900">Rp 59.000</span>
                    <span className="text-gray-400 line-through text-sm">Rp 79.000</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">PDF 10+ halaman • Early Bird</p>
                  <ul className="space-y-1.5 mb-5">
                    {["7 Dimensi bakat lengkap", "Laporan PDF detail", "RIASEC Pro + Personality", "Analisis karir & universitas"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-gray-700 text-sm">
                        <span className="text-teal-500">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/test/pro">
                    <button className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white font-bold py-2.5 rounded-xl transition-all duration-200 text-sm shadow-md hover:shadow-lg">
                      Beli Pro Sekarang →
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Destinations Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Study Abroad Destinations</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose from top countries like Australia, the USA, Canada, the UK, and more. We'll help you find the best universities, scholarships, and opportunities.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {countries.map((country, index) => (
              <Link key={index} href={country.slug}>
                <motion.div 
                  className="group relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <img 
                    src={country.image} 
                    alt={country.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="text-2xl mb-1">{country.flag}</div>
                    <div className="font-semibold">{country.name}</div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
          {/* More Destinations Button */}
          <motion.div 
            className="text-center mt-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link href="/destinations">
              <Button size="lg" variant="outline">
                More Destinations
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive support for your international education journey
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: GraduationCap, title: "University Placement", subtitle: "Penempatan Universitas", desc: "Expert guidance to find and apply to the best universities matching your profile and aspirations.", color: "text-blue-500", bg: "bg-blue-500/10" },
              { icon: BookOpen, title: "IELTS Preparation", subtitle: "Persiapan IELTS", desc: "Comprehensive IELTS training with experienced teachers to help you achieve your target score.", color: "text-purple-500", bg: "bg-purple-500/10" },
              { icon: Globe, title: "Visa Assistance", subtitle: "Bantuan Visa", desc: "Complete visa application support and documentation guidance for a smooth process.", color: "text-green-500", bg: "bg-green-500/10" },
              { icon: Bell, title: "Weekly Parent Reports", subtitle: "Laporan Mingguan Orang Tua", desc: "Automated weekly progress emails to parents — the only agency in Indonesia with this feature.", color: "text-pink-500", bg: "bg-pink-500/10", badge: "🇮🇩 #1 in Indonesia" }
            ].map((service, index) => (
              <motion.div 
                key={index}
                className="bg-card p-8 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                {service.badge && (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {service.badge}
                  </div>
                )}
                <div className={`w-12 h-12 ${service.bg} rounded-lg flex items-center justify-center mb-6`}>
                  <service.icon className={`w-6 h-6 ${service.color}`} />
                </div>
                <h3 className="text-xl font-semibold mb-1">{service.title}</h3>
                <p className="text-xs text-muted-foreground mb-3 italic">{service.subtitle}</p>
                <p className="text-muted-foreground text-sm">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Parents Stay in the Loop Section */}
      <section className="py-24 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-pink-950/20 dark:via-background dark:to-purple-950/20" />
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 rounded-full text-pink-600 dark:text-pink-400 text-sm font-semibold mb-6">
                <span className="text-base">🇮🇩</span>
                Satu-satunya di Indonesia · The Only One in Indonesia
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Parents,{" "}
                <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  Stay in the Loop
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-3 font-medium italic">
                Orang Tua, Selalu Tahu Perkembangan Anak Anda
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Most study abroad agencies leave parents in the dark. At SpecTa Education, we're the <strong>only agency in Indonesia</strong> that automatically sends a detailed weekly progress report directly to your inbox — every Monday morning.
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed text-sm italic">
                Kebanyakan agen studi luar negeri membuat orang tua tidak tahu perkembangan anaknya. Di SpecTa Education, kami satu-satunya agen di Indonesia yang secara otomatis mengirimkan laporan kemajuan mingguan langsung ke email Anda — setiap Senin pagi.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: TrendingUp, text: "Journey stage updates — know exactly where your child is in the process", sub: "Update tahap perjalanan — tahu persis di mana posisi anak Anda" },
                  { icon: FileCheck, text: "Document submission status — passport, transcripts, visa applications", sub: "Status dokumen — paspor, transkrip, aplikasi visa" },
                  { icon: Calendar, text: "Upcoming counselling sessions and appointment reminders", sub: "Sesi konseling mendatang dan pengingat janji temu" },
                  { icon: MessageSquare, text: "Recent activity log — every interaction with your counselor", sub: "Log aktivitas terbaru — setiap interaksi dengan konselor" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.text}</p>
                      <p className="text-xs text-muted-foreground italic">{item.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <a href="https://wa.me/62818218388?text=Hi,%20I'm%20interested%20in%20the%20weekly%20parent%20progress%20report%20feature" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0">
                  <Heart className="w-5 h-5 mr-2" />
                  Learn More for Parents · Pelajari Lebih Lanjut
                </Button>
              </a>
            </motion.div>

            {/* Right: Email mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 z-10 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold px-4 py-2 rounded-2xl shadow-lg">
                🏆 #1 in Indonesia
              </div>
              {/* Email mockup card */}
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Email header */}
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs opacity-80">From: SpecTa Education</p>
                      <p className="text-xs opacity-80">To: parent@email.com</p>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg">📊 Weekly Progress Report</h3>
                  <p className="text-white/80 text-sm">Your child's study abroad journey update</p>
                </div>
                {/* Email body */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">A</div>
                    <div>
                      <p className="font-semibold text-sm">Amanda Putri</p>
                      <p className="text-xs text-muted-foreground">Singapore · Bachelor of Business</p>
                    </div>
                    <div className="ml-auto">
                      <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold px-2 py-1 rounded-full">In Progress</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Docs Verified", value: "3/5", color: "text-green-500" },
                      { label: "Sessions Done", value: "2", color: "text-blue-500" },
                      { label: "Days to Intake", value: "127", color: "text-purple-500" },
                    ].map((stat, i) => (
                      <div key={i} className="text-center p-2 bg-muted/30 rounded-lg">
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</p>
                    {[
                      { icon: "✅", text: "Passport verified by counselor" },
                      { icon: "📅", text: "Session booked: Mon 10 Feb, 2PM" },
                      { icon: "📄", text: "University application submitted" },
                    ].map((act, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span>{act.icon}</span>
                        <span className="text-muted-foreground">{act.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Sent automatically every</p>
                    <p className="font-bold text-sm text-primary">Monday · 9:00 AM WIB</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Student Success Stories Section - Real Google Reviews */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full text-yellow-600 text-sm font-medium mb-4"
            >
              <Star className="w-4 h-4 fill-yellow-500" />
              Real Student Reviews from Google
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Student Success Stories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hear from real students who achieved their study abroad dreams with SpecTa Education
            </p>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">4.9</div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">PIK Branch (74 reviews)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">4.9</div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Kelapa Gading (173 reviews)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">5.0</div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Gading Serpong (29 reviews)</div>
              </div>
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Jocelyn Lim",
                branch: "PIK",
                destination: "Australia (UTS)",
                text: "I've had the most lovely experience with the team at SpecTa Education! Ms. Fitri has been very supportive this whole time and helped me through the whole process of applying for college at UTS and for my Australian student visa without any problems. I highly recommend this agency if you're looking to study abroad.",
                highlight: "IELTS + University + Visa"
              },
              {
                name: "Iesha S",
                branch: "PIK",
                destination: "Australia (UQ)",
                text: "SpecTa has been very helpful throughout my university and visa application process. Through their help, I was able to gain admission to UQ and acquire my Australian student visa. Their team was friendly, informative, and always responded quickly to my questions.",
                highlight: "University of Queensland"
              },
              {
                name: "Jo Yudianto",
                branch: "Kelapa Gading",
                destination: "Fully Funded Scholarship",
                text: "I am deeply grateful to have been awarded a fully funded Postgraduate Scholarship through SpecTa. I extend my sincere appreciation to Ms. Wulan for her unwavering support throughout the preparation and enrollment process.",
                highlight: "Full Scholarship Winner"
              },
              {
                name: "Amada",
                branch: "PIK",
                destination: "China (XJTLU) + Scholarship",
                text: "Best agency ever!! I didn't even know where I wanted to study when I first visited SpecTa, and now here I am studying in China at XJTLU with a scholarship. They guided me from nothing to everything. All of the teachers are so nice and supportive. Top 10/10!",
                highlight: "XJTLU + Scholarship"
              },
              {
                name: "Ziyi Sultan Yi",
                branch: "Gading Serpong",
                destination: "Netherlands",
                text: "Specta Education Consultant is amazing! Ms. Jenny is very responsive, friendly, and professional. My study preparation for the Netherlands was completed smoothly in just 2 months. Thank you for the great support and guidance.",
                highlight: "Netherlands in 2 Months"
              },
              {
                name: "Marjono Suwandi",
                branch: "PIK",
                destination: "Australia (UQ) - Parent",
                text: "I would like to express my heartfelt gratitude for your exceptional support in helping my daughter secure her admission to the University of Queensland, Australia. Specta has proven to be a highly professional agency, guiding us through the process.",
                highlight: "Parent Testimonial"
              },
              {
                name: "Natalia Gunawan",
                branch: "Gading Serpong",
                destination: "Study Abroad",
                text: "Specta is the right place for those who want to study abroad. They offer an IELTS tutor program that is very flexible and easy to follow, along with other packages. All staff members are also very friendly and helpful. Thank you, Specta.",
                highlight: "IELTS + Consultation"
              },
              {
                name: "Lubianto Kho",
                branch: "PIK",
                destination: "IELTS Preparation",
                text: "I had a wonderful experience with SpecTa Education for my IELTS preparation. The environment is superb, supportive, and fun. My teacher, Ms Yunita, has been nothing but encouraging throughout my learning journey.",
                highlight: "IELTS Success"
              },
              {
                name: "Jesslyn",
                branch: "Kelapa Gading",
                destination: "Australia",
                text: "Big Thanks to SpecTa Education. When my Brother said he wanted to take his education to Australia, honestly it was confusing for me as I have zero prior knowledge. But SpecTa helped a lot! From his IELTS trial, scouting suitable campus, to VISA.",
                highlight: "Full Service Support"
              }
            ].map((review, index) => (
              <ReviewCard key={index} review={review} index={index} />
            ))}
          </div>

          {/* Google Reviews Badge */}
          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <a
              href="https://www.google.com/maps/search/SpecTa+Education"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              View all 276+ reviews on Google Maps
            </a>
          </motion.div>
        </div>
      </section>

      {/* For Parents Section */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full text-purple-600 dark:text-purple-400 text-sm font-semibold mb-4">
              <Heart className="w-4 h-4" />
              Untuk Orang Tua · For Parents
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              We Know What Parents{" "}
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Really Worry About</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Kami mengerti kekhawatiran orang tua — dan kami membangun sistem untuk menjawabnya
            </p>
          </motion.div>

          {/* Worry vs Solution grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            {[
              {
                worry: "\"I don't know if my child is making progress\"",
                worryId: "\"Saya tidak tahu apakah anak saya berkembang\"",
                solution: "Weekly automated email every Monday with full journey status, documents, and sessions",
                solutionId: "Email otomatis setiap Senin dengan status perjalanan, dokumen, dan sesi lengkap",
                icon: TrendingUp,
              },
              {
                worry: "\"Are the documents being handled properly?\"",
                worryId: "\"Apakah dokumen-dokumen ditangani dengan benar?\"",
                solution: "Real-time document vault with verification status — passport, transcripts, visa, all tracked",
                solutionId: "Vault dokumen real-time dengan status verifikasi — paspor, transkrip, visa, semua terpantau",
                icon: FileCheck,
              },
              {
                worry: "\"When is the next counselling session?\"",
                worryId: "\"Kapan sesi konseling berikutnya?\"",
                solution: "Appointment reminders included in every weekly report with date, time, and counselor name",
                solutionId: "Pengingat janji temu di setiap laporan mingguan dengan tanggal, waktu, dan nama konselor",
                icon: Calendar,
              },
              {
                worry: "\"Is my investment in the right hands?\"",
                worryId: "\"Apakah investasi saya di tangan yang tepat?\"",
                solution: "15+ years of experience, 1000+ students placed, 4.9★ Google rating across all branches",
                solutionId: "15+ tahun pengalaman, 1000+ siswa ditempatkan, rating Google 4.9★ di semua cabang",
                icon: ShieldCheck,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="bg-card border border-border rounded-xl p-6 flex gap-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1 italic">{item.worry}</p>
                  <p className="text-xs text-muted-foreground/70 mb-3 italic">{item.worryId}</p>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.solution}</p>
                      <p className="text-xs text-muted-foreground italic mt-0.5">{item.solutionId}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Parent testimonial highlight */}
          <motion.div
            className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 md:p-10 text-white text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Quote className="w-8 h-8 mx-auto mb-4 opacity-60" />
            <p className="text-lg md:text-xl font-medium mb-4 leading-relaxed">
              "I would like to express my heartfelt gratitude for your exceptional support in helping my daughter secure her admission to the University of Queensland, Australia. SpecTa has proven to be a highly professional agency."
            </p>
            <p className="text-sm italic mb-2 opacity-80">
              "Saya ingin mengucapkan terima kasih yang tulus atas dukungan luar biasa dalam membantu putri saya masuk ke University of Queensland, Australia."
            </p>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="font-semibold">Marjono Suwandi</p>
            <p className="text-white/70 text-sm">Parent of UQ Student · PIK Branch</p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="bg-gradient-specta rounded-2xl p-8 md:p-12 text-white text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Your Journey Today</h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-8">
              Chat with our AI assistant to get personalized guidance on studying abroad. We're here to help you every step of the way.
            </p>
            <a href="https://wa.me/62818218388?text=Hi,%20I'm%20interested%20in%20studying%20abroad.%20Can%20you%20help%20me?" target="_blank" rel="noopener noreferrer">
              <Button 
                size="lg" 
                variant="secondary" 
                className="bg-white text-primary hover:bg-white/90"
              >
                <Phone className="w-5 h-5 mr-2" />
                Chat on WhatsApp
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />

      {/* Wall-E Style Chatbot Button — lazy loaded, below the fold */}
      <Suspense fallback={null}>
        <ChatBotButton onClick={handleOpenChat} />
      </Suspense>

      {/* Chat Modal */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="w-full max-w-lg h-[600px] max-h-[80vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground">
                <div className="flex items-center gap-3">
                  <motion.img 
                    src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/saxLOcubreWkfnzl.png" 
                    alt="SpecTa AI" 
                    className="w-10 h-10 object-contain"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div>
                    <h3 className="font-semibold">SpecTa AI Assistant</h3>
                    <p className="text-xs text-primary-foreground/80">Online • Ready to help</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseChat}
                  className="p-2 hover:bg-primary-foreground/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Suspense fallback={<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:32,height:32,border:'3px solid #e5e7eb',borderTopColor:'#e63946',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} /></div>}>
                <ChatBot />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
