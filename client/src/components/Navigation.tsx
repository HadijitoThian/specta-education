import { Link, useLocation } from "wouter";
import { ChevronDown, Menu, X, Gamepad2, GraduationCap, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";

interface NavigationProps {
  currentPage?: string;
}

export default function Navigation({ currentPage = "" }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  const isActive = (page: string) => currentPage === page;

  // Scroll to top when navigating
  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
    setLocation(href);
  };

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <button onClick={() => handleNavClick("/")} className="flex items-center shrink-0" aria-label="SpecTa Education — home">
          <img src="/specta-logo.png" alt="SpecTa Education" className="h-10 w-auto max-w-[150px] object-contain" />
        </button>
        
        {/* Desktop Navigation — progressive disclosure so the nav NEVER
            overflows regardless of screen width:
              md   (≥768px)  → 4 essentials: IELTS ▼ / Destinations ▼ /
                               SpecTa Tutor ▼ / IQ Discovery + Book Call.
              xl   (≥1200px) → adds: About, Scholarships, Play, Apply CTA.
              2xl  (≥1440px) → adds: Contact, Track (fullest nav).
            Item counts: md=5, xl=9, 2xl=11 (+logo everywhere).
            Rewind: lg tier removed because 900-1199px was showing 8-9
            items which overflowed on Windows-DPI-scaled displays. Now
            lg = md tier (same 5 items). This mirrors how Airbnb /
            Booking / Vercel handle crowded navs — reveal secondary
            items only as horizontal space actually appears. All hidden
            items stay accessible via the hamburger drawer on md-xl. */}
        <div className="hidden md:flex items-center gap-3 lg:gap-3.5 xl:gap-4 2xl:gap-5 whitespace-nowrap">
          <button onClick={() => handleNavClick("/about")} className={`hidden xl:inline-block text-sm font-medium transition-colors ${isActive("about") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            About
          </button>
          {/* IELTS Dropdown */}
          <div className="relative group">
            <button className={`text-sm font-semibold transition-colors flex items-center gap-1 ${isActive("ielts") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              IELTS
              <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-white rounded-lg shadow-lg border border-border py-2 min-w-[260px]">
                <button onClick={() => handleNavClick("/ielts")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  📘 IELTS Courses & Overview
                </button>
                <div className="border-t border-border my-1"></div>
                <button onClick={() => handleNavClick("/ielts/practice")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  ⚡ AI Practice Test <span className="text-emerald-600 font-semibold">· Free</span>
                </button>
                <button onClick={() => handleNavClick("/ielts/mock-test")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  📝 Full Mock Test <span className="text-muted-foreground/70">· Rp 79k</span>
                </button>
                <button onClick={() => handleNavClick("/ielts/tutor")} className="block w-full text-left px-4 py-2.5 text-sm font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 transition-colors">
                  ✨ AI IELTS Tutor <span className="text-[10px] align-top bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full">NEW</span>
                </button>
                <button onClick={() => handleNavClick("/voice-clone")} className="block w-full text-left px-4 py-2.5 text-sm font-medium text-purple-700 hover:text-purple-800 hover:bg-purple-50 transition-colors">
                  🎙️ Voice Clone Band 8 <span className="text-[10px] align-top bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Rp 49k</span>
                </button>
              </div>
            </div>
          </div>

          {/* Destinations Dropdown */}
          <div className="relative group">
            <button className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive("destinations") || isActive("malaysia") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              Destinations
              <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-white rounded-lg shadow-lg border border-border py-2 min-w-[200px]">
                <button onClick={() => handleNavClick("/destinations")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🌍 All Destinations
                </button>
                <div className="border-t border-border my-1"></div>
                <button onClick={() => handleNavClick("/malaysia")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇲🇾 Malaysia
                </button>
                <button onClick={() => handleNavClick("/destinations/australia")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇦🇺 Australia
                </button>
                <button onClick={() => handleNavClick("/destinations/uk")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇬🇧 United Kingdom
                </button>
                <button onClick={() => handleNavClick("/destinations/singapore")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇸🇬 Singapore
                </button>
                <button onClick={() => handleNavClick("/destinations/china")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇨🇳 China
                </button>
                <button onClick={() => handleNavClick("/destinations/usa")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇺🇸 USA
                </button>
                <button onClick={() => handleNavClick("/destinations/canada")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇨🇦 Canada
                </button>
                <button onClick={() => handleNavClick("/destinations/ireland")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇮🇪 Ireland
                </button>
                <button onClick={() => handleNavClick("/destinations/new-zealand")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇳🇿 New Zealand
                </button>
                <button onClick={() => handleNavClick("/destinations/netherlands")} className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇳🇱 Netherlands
                </button>
              </div>
            </div>
          </div>
          
          <button onClick={() => handleNavClick("/scholarships")} className={`hidden xl:flex text-sm font-medium transition-colors items-center gap-1.5 ${isActive("scholarships") ? "text-primary" : "text-amber-600 hover:text-amber-700"}`}>
            <GraduationCap className="w-4 h-4" />
            <span>Scholarships</span>
          </button>
          {/* SpecTa Tutor Dropdown — umbrella for syllabus-specific AI Teachers */}
          <div className="relative group">
            <button className={`text-sm font-semibold transition-colors flex items-center gap-1 ${isActive("igcse") || isActive("tutor") ? "text-violet-600" : "text-violet-600 hover:text-violet-700"}`}>
              <BookOpen className="w-4 h-4" />
              <span>SpecTa Tutor</span>
              <span className="text-[10px] align-top bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full">NEW</span>
              <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-white rounded-lg shadow-lg border border-border py-2 min-w-[320px]">
                <div className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">AI Teacher · by syllabus</div>
                <button onClick={() => handleNavClick("/igcse")} className="block w-full text-left px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-colors">
                  🎓 IGCSE AI Teacher
                  <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">LIVE</span>
                  <div className="text-[11px] text-muted-foreground font-normal mt-0.5">Cambridge Math, Physics, Economics, Business</div>
                </button>
                <button disabled className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed opacity-60">
                  🎯 GCE A Level AI Teacher
                  <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">SOON</span>
                  <div className="text-[11px] font-normal mt-0.5">Q1 2026 · Cambridge / Edexcel</div>
                </button>
                <button disabled className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed opacity-60">
                  🇮🇩 Kurikulum Mandiri AI Teacher
                  <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">SOON</span>
                  <div className="text-[11px] font-normal mt-0.5">Kurikulum nasional Indonesia</div>
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => handleNavClick("/contact")} className={`hidden 2xl:inline-block text-sm font-medium transition-colors ${isActive("contact") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            Contact
          </button>
          <button onClick={() => handleNavClick("/track")} className={`hidden 2xl:inline-block text-sm font-medium transition-colors ${isActive("track") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            Track
          </button>
          <button onClick={() => handleNavClick("/play")} className={`hidden xl:flex text-sm font-medium transition-colors items-center gap-1.5 ${isActive("play") ? "text-primary" : "text-purple-600 hover:text-purple-700"}`}>
            <Gamepad2 className="w-4 h-4" />
            <span>Play</span>
          </button>
          <button onClick={() => handleNavClick("/iq-discovery")} className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${isActive("iq-discovery") ? "text-primary" : "text-indigo-600 hover:text-indigo-700"}`}>
            <span>🧠 IQ Discovery</span>
            <span className="text-[10px] align-top bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">NEW</span>
          </button>
        </div>

        {/* Desktop CTA Buttons — see Navigation md: note above */}
        <div className="hidden md:flex items-center gap-2 shrink-0 whitespace-nowrap">
          <button onClick={() => handleNavClick("/book")} className="px-3.5 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-blue-200 transition-all">
            Book Call
          </button>
          <button onClick={() => handleNavClick("/apply")} className="hidden xl:inline-block px-3.5 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-pink-200 transition-all">
            Apply
          </button>
        </div>

        {/* Mobile Menu Button */}
        {/* Hamburger drawer — visible until xl so md/lg users (who only see
            5 essentials) can still reach Contact / Track / About / etc.
            through the drawer. Common pattern (see GitHub, YouTube). Hides
            at xl (≥1200px) when the fuller nav is on screen. */}
        <button
          className="xl:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-t border-border max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="container py-4 space-y-4">
            <button onClick={() => handleNavClick("/about")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary">
              About Us
            </button>
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-foreground">IELTS</span>
              <button onClick={() => handleNavClick("/ielts")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                📘 Courses & Overview
              </button>
              <button onClick={() => handleNavClick("/ielts/practice")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                ⚡ AI Practice Test · Free
              </button>
              <button onClick={() => handleNavClick("/ielts/mock-test")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                📝 Full Mock Test · Rp 79k
              </button>
              <button onClick={() => handleNavClick("/ielts/tutor")} className="block w-full text-left text-sm font-medium text-pink-600 hover:text-pink-700 pl-4">
                ✨ AI IELTS Tutor · NEW
              </button>
              <button onClick={() => handleNavClick("/voice-clone")} className="block w-full text-left text-sm font-medium text-purple-700 hover:text-purple-800 pl-4">
                🎙️ Voice Clone Band 8 · Rp 49k
              </button>
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-foreground">Destinations</span>
              <button onClick={() => handleNavClick("/destinations")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🌍 All Destinations
              </button>
              <button onClick={() => handleNavClick("/malaysia")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇲🇾 Malaysia
              </button>
              <button onClick={() => handleNavClick("/destinations/australia")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇦🇺 Australia
              </button>
              <button onClick={() => handleNavClick("/destinations/uk")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇬🇧 United Kingdom
              </button>
              <button onClick={() => handleNavClick("/destinations/singapore")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇸🇬 Singapore
              </button>
              <button onClick={() => handleNavClick("/destinations/china")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇨🇳 China
              </button>
              <button onClick={() => handleNavClick("/destinations/usa")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇺🇸 USA
              </button>
              <button onClick={() => handleNavClick("/destinations/canada")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇨🇦 Canada
              </button>
              <button onClick={() => handleNavClick("/destinations/ireland")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇮🇪 Ireland
              </button>
              <button onClick={() => handleNavClick("/destinations/new-zealand")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇳🇿 New Zealand
              </button>
              <button onClick={() => handleNavClick("/destinations/netherlands")} className="block w-full text-left text-sm text-muted-foreground hover:text-primary pl-4">
                🇳🇱 Netherlands
              </button>
            </div>
            <button onClick={() => handleNavClick("/scholarships")} className="block w-full text-left text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Scholarships
            </button>
            {/* SpecTa Tutor (mobile) — same dropdown contents as desktop */}
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-violet-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                SpecTa Tutor
                <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full">NEW</span>
              </span>
              <button onClick={() => handleNavClick("/igcse")} className="block w-full text-left text-sm font-medium text-violet-700 hover:text-violet-800 pl-4">
                🎓 IGCSE AI Teacher
                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">LIVE</span>
              </button>
              <div className="block w-full text-left text-sm text-muted-foreground pl-4 opacity-60">
                🎯 GCE A Level AI Teacher
                <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">SOON</span>
              </div>
              <div className="block w-full text-left text-sm text-muted-foreground pl-4 opacity-60">
                🇮🇩 Kurikulum Mandiri AI Teacher
                <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">SOON</span>
              </div>
            </div>
            <button onClick={() => handleNavClick("/contact")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary">
              Contact
            </button>
            <button onClick={() => handleNavClick("/track")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary">
              Track My Application
            </button>
            <button onClick={() => handleNavClick("/play")} className="block w-full text-left text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              SpecTa Play
            </button>
            <button onClick={() => handleNavClick("/iq-discovery")} className="block w-full text-left text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
              🧠 IQ Discovery
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">NEW</span>
            </button>
            <div className="pt-4 border-t border-border space-y-3">
              <button onClick={() => handleNavClick("/book")} className="block w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-semibold text-center hover:shadow-lg transition-all">
                Book Consultation
              </button>
              <button onClick={() => handleNavClick("/apply")} className="block w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg text-sm font-semibold text-center hover:shadow-lg transition-all">
                Quick Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
