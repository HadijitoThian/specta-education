import { Link, useLocation } from "wouter";
import { ChevronDown, Menu, X, Gamepad2, GraduationCap } from "lucide-react";
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
        <button onClick={() => handleNavClick("/")} className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="SpecTa Education" className="h-10 object-contain" />
        </button>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          <button onClick={() => handleNavClick("/")} className={`text-sm font-medium transition-colors ${isActive("home") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            Home
          </button>
          <button onClick={() => handleNavClick("/about")} className={`text-sm font-medium transition-colors ${isActive("about") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            About Us
          </button>
          <button onClick={() => handleNavClick("/ielts")} className={`text-sm font-medium transition-colors ${isActive("ielts") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            IELTS
          </button>
          
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
          
          <button onClick={() => handleNavClick("/scholarships")} className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive("scholarships") ? "text-primary" : "text-amber-600 hover:text-amber-700"}`}>
            <GraduationCap className="w-4 h-4" />
            <span>Scholarships</span>
          </button>
          <button onClick={() => handleNavClick("/compare")} className={`text-sm font-medium transition-colors ${isActive("compare") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            Compare
          </button>
          <button onClick={() => handleNavClick("/contact")} className={`text-sm font-medium transition-colors ${isActive("contact") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            Contact
          </button>
          <button onClick={() => handleNavClick("/track")} className={`text-sm font-medium transition-colors ${isActive("track") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            Track
          </button>
          <button onClick={() => handleNavClick("/play")} className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive("play") ? "text-primary" : "text-purple-600 hover:text-purple-700"}`}>
            <Gamepad2 className="w-4 h-4" />
            <span>SpecTa Play</span>
          </button>
        </div>
        
        {/* Desktop CTA Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <button onClick={() => handleNavClick("/book")} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-blue-200 transition-all">
            Book Consultation
          </button>
          <button onClick={() => handleNavClick("/apply")} className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-pink-200 transition-all">
            Quick Apply
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-border max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="container py-4 space-y-4">
            <button onClick={() => handleNavClick("/")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary">
              Home
            </button>
            <button onClick={() => handleNavClick("/about")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary">
              About Us
            </button>
            <button onClick={() => handleNavClick("/ielts")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary">
              IELTS
            </button>
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
            <button onClick={() => handleNavClick("/compare")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary">
              Compare Universities
            </button>
            <button onClick={() => handleNavClick("/contact")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary">
              Contact
            </button>
            <button onClick={() => handleNavClick("/track")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary">
              Track Application
            </button>
            <button onClick={() => handleNavClick("/play")} className="block w-full text-left text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              SpecTa Play
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
