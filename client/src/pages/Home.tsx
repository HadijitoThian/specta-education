import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageCircle, GraduationCap, Globe, BookOpen, Phone, Mail, MapPin, ChevronRight, X, ChevronDown } from "lucide-react";
import ChatBot from "@/components/ChatBot";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const countries = [
  { name: "Australia", flag: "🇦🇺", image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&h=300&fit=crop" },
  { name: "Singapore", flag: "🇸🇬", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=300&fit=crop" },
  { name: "Malaysia", flag: "🇲🇾", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=300&fit=crop" },
  { name: "United Kingdom", flag: "🇬🇧", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop" },
  { name: "USA", flag: "🇺🇸", image: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400&h=300&fit=crop" },
  { name: "Canada", flag: "🇨🇦", image: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400&h=300&fit=crop" },
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

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

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
                  src="/excited-students.jpg" 
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
            <Link href="/contact">
              <Button 
                size="lg" 
                variant="secondary" 
                className="bg-white text-primary hover:bg-white/90"
              >
                <Phone className="w-5 h-5 mr-2" />
                Contact Us
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />

      {/* Small Chatbot Button - Bottom Right */}
      <motion.button
        onClick={handleOpenChat}
        className="fixed bottom-6 right-6 z-40 bg-primary hover:bg-primary/90 text-white rounded-full p-4 shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

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
