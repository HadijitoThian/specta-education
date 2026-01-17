import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageCircle, GraduationCap, Globe, BookOpen, Phone, Mail, MapPin, ChevronRight, X, ChevronDown } from "lucide-react";
import ChatBot from "@/components/ChatBot";
import SmartMascot from "@/components/SmartMascot";
import { motion, AnimatePresence } from "framer-motion";
import { useMascotAgent } from "@/contexts/MascotAgentContext";

const countries = [
  { name: "Australia", flag: "🇦🇺", image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&h=300&fit=crop" },
  { name: "Singapore", flag: "🇸🇬", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=300&fit=crop" },
  { name: "Malaysia", flag: "🇲🇾", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=300&fit=crop" },
  { name: "United Kingdom", flag: "🇬🇧", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop" },
  { name: "USA", flag: "🇺🇸", image: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400&h=300&fit=crop" },
  { name: "Canada", flag: "🇨🇦", image: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400&h=300&fit=crop" },
];

const stats = [
  { number: "1,000+", label: "Students Assisted" },
  { number: "50+", label: "Partner Universities" },
  { number: "8+", label: "Countries" },
  { number: "15+", label: "Years Experience" },
];

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { updateUserContext, hideMascot, showMascot } = useMascotAgent();
  const prevChatOpenRef = useRef(isChatOpen);

  // Update context when chat opens/closes - use ref to prevent infinite loop
  useEffect(() => {
    if (isChatOpen !== prevChatOpenRef.current) {
      prevChatOpenRef.current = isChatOpen;
      if (isChatOpen) {
        updateUserContext({ chatStarted: true });
        hideMascot();
      } else {
        showMascot();
      }
    }
  }, [isChatOpen]); // Only depend on isChatOpen, not the functions

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="SpecTa Education" className="h-10 object-contain" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About Us</Link>
            <Link href="/ielts" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">IELTS</Link>
            <div className="relative group">
              <button className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                Destinations
                <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-white rounded-lg shadow-lg border border-border py-2 min-w-[180px]">
                  <Link href="/destinations" className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">All Destinations</Link>
                  <Link href="/malaysia" className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">🇲🇾 Malaysia</Link>
                </div>
              </div>
            </div>
            <Link href="/articles" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Articles</Link>
            <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://wa.me/62819668278" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact
              </Button>
            </a>
            <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleOpenChat}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with AI
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Interactive Mascot */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Landmarks Background */}
        <div className="absolute bottom-0 left-0 right-0 h-40 opacity-[0.08] pointer-events-none">
          <img src="/landmarks-bg.jpg" alt="" className="w-full h-full object-cover object-bottom" />
        </div>
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
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
                <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={handleOpenChat}>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Talk to Our AI Assistant
                </Button>
                <Link href="/destinations">
                  <Button size="lg" variant="outline">
                    Explore Destinations
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </motion.div>
              
              {/* Voice interaction hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                  🎤 Voice enabled
                </span>
                <span>Click the mascot or use voice to start chatting!</span>
              </motion.div>
            </div>
            
            {/* Hero Mascot - Large animated version */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 cursor-pointer" onClick={handleOpenChat}>
                <motion.img 
                  src="/mascot.png" 
                  alt="SpecTa AI Assistant" 
                  className="w-full max-w-md mx-auto drop-shadow-2xl"
                  animate={{ 
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                />
                
                {/* Speech bubble */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 }}
                  className="absolute top-0 -right-4 bg-white rounded-2xl shadow-lg px-4 py-3 max-w-[180px]"
                >
                  <p className="text-sm font-medium text-foreground">Hi! Click me to chat! 👋</p>
                  <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white transform rotate-45" />
                </motion.div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
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
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.number}</div>
                <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
              </motion.div>
            ))}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {countries.map((country, index) => (
              <Link key={index} href="/destinations">
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
            <Button 
              size="lg" 
              variant="secondary" 
              className="bg-white text-primary hover:bg-white/90"
              onClick={handleOpenChat}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Chat with SpecTa AI
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <img src="/logo.jpeg" alt="SpecTa Education" className="h-12 object-contain brightness-0 invert" />
              <p className="text-sm text-background/70">
                Your trusted partner for international education and study abroad services.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/about" className="hover:text-background transition-colors">About Us</Link></li>
                <li><Link href="/ielts" className="hover:text-background transition-colors">IELTS</Link></li>
                <li><Link href="/destinations" className="hover:text-background transition-colors">Destinations</Link></li>
                <li><Link href="/contact" className="hover:text-background transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Destinations</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/destinations" className="hover:text-background transition-colors">Australia</Link></li>
                <li><Link href="/destinations" className="hover:text-background transition-colors">United Kingdom</Link></li>
                <li><Link href="/destinations" className="hover:text-background transition-colors">USA</Link></li>
                <li><Link href="/destinations" className="hover:text-background transition-colors">Canada</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-3 text-sm text-background/70">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Jl. Kelapa Nias Raya QE1 No. 14, Kelapa Gading, Jakarta Utara</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  <a href="tel:+62819668278" className="hover:text-background transition-colors">+62 819 668 278</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  <a href="mailto:info@spectaeducation.com" className="hover:text-background transition-colors">info@spectaeducation.com</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 mt-12 pt-8 text-center text-sm text-background/50">
            <p>&copy; {new Date().getFullYear()} SpecTa Education. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Smart Mascot - Floating Interactive Agent */}
      <SmartMascot onChatOpen={handleOpenChat} />

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
                    src="/mascot.png" 
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
