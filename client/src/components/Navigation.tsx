import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";

interface NavigationProps {
  onChatOpen?: () => void;
  currentPage?: string;
}

export default function Navigation({ onChatOpen, currentPage = "" }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (page: string) => currentPage === page;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="SpecTa Education" className="h-10 object-contain" />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className={`text-sm font-medium transition-colors ${isActive("home") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            Home
          </Link>
          <Link href="/about" className={`text-sm font-medium transition-colors ${isActive("about") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            About Us
          </Link>
          <Link href="/ielts" className={`text-sm font-medium transition-colors ${isActive("ielts") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            IELTS
          </Link>
          
          {/* Destinations Dropdown */}
          <div className="relative group">
            <button className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive("destinations") || isActive("malaysia") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              Destinations
              <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-white rounded-lg shadow-lg border border-border py-2 min-w-[200px]">
                <Link href="/destinations" className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🌍 All Destinations
                </Link>
                <div className="border-t border-border my-1"></div>
                <Link href="/malaysia" className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  🇲🇾 Malaysia
                </Link>
              </div>
            </div>
          </div>
          
          <Link href="/articles" className={`text-sm font-medium transition-colors ${isActive("articles") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            Articles
          </Link>
          <Link href="/contact" className={`text-sm font-medium transition-colors ${isActive("contact") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            Contact
          </Link>
        </div>
        
        {/* Desktop CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a href="https://wa.me/62819668278" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact
            </Button>
          </a>
          {onChatOpen && (
            <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={onChatOpen}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with AI
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-border">
          <div className="container py-4 space-y-4">
            <Link href="/" className="block text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            <Link href="/about" className="block text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              About Us
            </Link>
            <Link href="/ielts" className="block text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              IELTS
            </Link>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-foreground">Destinations</span>
              <Link href="/destinations" className="block text-sm text-muted-foreground hover:text-primary pl-4" onClick={() => setMobileMenuOpen(false)}>
                🌍 All Destinations
              </Link>
              <Link href="/malaysia" className="block text-sm text-muted-foreground hover:text-primary pl-4" onClick={() => setMobileMenuOpen(false)}>
                🇲🇾 Malaysia
              </Link>
            </div>
            <Link href="/articles" className="block text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              Articles
            </Link>
            <Link href="/contact" className="block text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              Contact
            </Link>
            <div className="pt-4 border-t border-border space-y-3">
              <a href="https://wa.me/62819668278" target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact Us
                </Button>
              </a>
              {onChatOpen && (
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90" onClick={() => { onChatOpen(); setMobileMenuOpen(false); }}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat with AI
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
