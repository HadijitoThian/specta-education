import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { GraduationCap, Globe, BookOpen, Phone, Mail, MapPin, ChevronRight, X, ChevronDown, Star, Quote } from "lucide-react";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
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
    document.title = "SpecTa Education - Study Abroad Consultant & IELTS Preparation";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'SpecTa Education helps students study abroad across 10+ countries with expert counseling, IELTS preparation, university matching, and scholarship guidance since 2005.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'SpecTa Education helps students study abroad across 10+ countries with expert counseling, IELTS preparation, university matching, and scholarship guidance since 2005.';
      document.head.appendChild(meta);
    }
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'study abroad, IELTS preparation, overseas education, university application, scholarship, SpecTa Education, konsultan pendidikan, kuliah luar negeri, beasiswa, persiapan IELTS');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'study abroad, IELTS preparation, overseas education, university application, scholarship, SpecTa Education, konsultan pendidikan, kuliah luar negeri, beasiswa, persiapan IELTS';
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

      {/* Tes Bakat AI Promo Banner */}
      <section className="py-12">
        <div className="container">
          <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-500 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            {/* Floating emojis */}
            <div className="absolute top-4 left-8 text-4xl opacity-20 animate-bounce" style={{ animationDelay: '0s' }}>🧠</div>
            <div className="absolute top-6 right-12 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '0.5s' }}>🎯</div>
            <div className="absolute bottom-4 left-1/4 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1s' }}>🎓</div>
            <div className="absolute bottom-6 right-1/4 text-4xl opacity-20 animate-bounce" style={{ animationDelay: '1.5s' }}>✨</div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
                  <span className="text-yellow-300">🤖</span>
                  <span className="text-white/90 text-sm font-medium">AI-Powered • RIASEC + Multiple Intelligence</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Tes Bakat AI — Temukan Jurusan Terbaik Kamu!</h3>
                <p className="text-white/80 text-lg max-w-md">Tes 10 menit dengan AI yang menganalisis minat, kepribadian & kecerdasan kamu. Hasil lengkap dikirim ke email!</p>
              </div>
              <Link href="/play/aptitude">
                <button className="bg-white text-teal-600 font-bold text-lg px-8 py-4 rounded-2xl hover:bg-yellow-300 hover:text-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 whitespace-nowrap">
                  Mulai Tes Gratis →
                </button>
              </Link>
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
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: GraduationCap, title: "University Placement", desc: "Expert guidance to find and apply to the best universities matching your profile and aspirations." },
              { icon: BookOpen, title: "IELTS Preparation", desc: "Comprehensive IELTS training with experienced teachers to help you achieve your target score." },
              { icon: Globe, title: "Visa Assistance", desc: "Complete visa application support and documentation guidance for a smooth process." }
            ].map((service, index) => (
              <motion.div 
                key={index}
                className="bg-card p-8 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-muted-foreground">{service.desc}</p>
              </motion.div>
            ))}
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
            <a href="https://wa.me/62819668278?text=Hi,%20I'm%20interested%20in%20studying%20abroad.%20Can%20you%20help%20me?" target="_blank" rel="noopener noreferrer">
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

      {/* Wall-E Style Chatbot Button */}
      <ChatBotButton onClick={handleOpenChat} />

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
              <ChatBot />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
