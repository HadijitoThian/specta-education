import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Globe, GraduationCap, Building, ChevronRight, ChevronLeft, MessageCircle, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import { motion, AnimatePresence } from "framer-motion";

const destinations = [
  { name: "Malaysia", flag: "🇲🇾", slug: "malaysia", image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/kMEinJVrDybnuqph.jpg", description: "Affordable quality education with cultural similarities and easy adaptation.", universities: ["Taylor's University", "Monash Malaysia", "UCSI University"], highlights: ["Affordable tuition", "Similar culture", "English medium"] },
  { name: "Singapore", flag: "🇸🇬", slug: "singapore", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=500&fit=crop", description: "Asia's premier education hub with top private institutions offering internationally recognized degrees, just 2 hours from Jakarta.", universities: ["Curtin Singapore", "JCU Singapore", "PSB Academy", "Kaplan", "MDIS", "Raffles Design"], highlights: ["Close to Indonesia", "Private institutions", "Affordable degrees"] },
  { name: "China", flag: "🇨🇳", slug: "china", image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/UfVeuAhSuGdmrpgb.jpg", description: "Emerging global education powerhouse with affordable programs and rich cultural experience.", universities: ["Tsinghua University", "Peking University", "Fudan University"], highlights: ["Affordable fees", "Scholarship opportunities", "Growing economy"] },
  { name: "United Kingdom", flag: "🇬🇧", slug: "uk", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=500&fit=crop", description: "Historic universities with globally recognized degrees and rich cultural experience.", universities: ["Oxford", "Cambridge", "Imperial College"], highlights: ["Prestigious degrees", "1-year Masters", "Graduate visa"] },
  { name: "Australia", flag: "🇦🇺", slug: "australia", image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&h=500&fit=crop", description: "World-class universities, vibrant cities, and excellent post-study work opportunities.", universities: ["University of Melbourne", "University of Sydney", "Monash University"], highlights: ["Post-study work visa", "Multicultural environment", "High quality of life"] },
  { name: "New Zealand", flag: "🇳🇿", slug: "new-zealand", image: "https://images.unsplash.com/photo-1469521669194-babb45599def?w=800&h=500&fit=crop", description: "Beautiful landscapes, friendly people, and quality education in a safe environment.", universities: ["University of Auckland", "University of Otago", "Victoria University"], highlights: ["Post-study work", "Beautiful nature", "Friendly culture"] },
  { name: "Canada", flag: "🇨🇦", slug: "canada", image: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&h=500&fit=crop", description: "Welcoming immigration policies, affordable education, and high quality of life.", universities: ["University of Toronto", "UBC", "McGill"], highlights: ["Immigration pathways", "Affordable fees", "Safe cities"] },
  { name: "USA", flag: "🇺🇸", slug: "usa", image: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800&h=500&fit=crop", description: "Home to the world's top universities with diverse programs and research opportunities.", universities: ["MIT", "Stanford", "Harvard"], highlights: ["Research excellence", "Flexible curriculum", "OPT opportunities"] },
  { name: "Ireland", flag: "🇮🇪", slug: "ireland", image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/FExyOmKcAqqrSQkC.jpg", description: "English-speaking European destination with friendly culture and growing tech industry.", universities: ["Trinity College Dublin", "University College Dublin", "NUI Galway"], highlights: ["English speaking", "Tech hub", "Post-study work"] },
  { name: "Netherlands", flag: "🇳🇱", slug: "netherlands", image: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=500&fit=crop", description: "Innovative education system with many English-taught programs in Europe's heart.", universities: ["TU Delft", "University of Amsterdam", "Erasmus University"], highlights: ["English programs", "Central Europe", "Work opportunities"] }
];

const carouselImages = [
  { src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/kMEinJVrDybnuqph.jpg", title: "Malaysia" },
  { src: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=1200&h=600&fit=crop", title: "Australia" },
  { src: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=600&fit=crop", title: "United Kingdom" },
  { src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/UfVeuAhSuGdmrpgb.jpg", title: "China" },
  { src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/FExyOmKcAqqrSQkC.jpg", title: "Ireland" }
];

export default function Destinations() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="destinations" />

      {/* Hero Section with Carousel */}
      <section className="pt-24 pb-20 px-4 relative overflow-hidden">
        {/* Background Carousel */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              src={carouselImages[currentSlide].src}
              alt={carouselImages[currentSlide].title}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background"></div>
        </div>

        {/* Carousel Controls */}
        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 p-3 rounded-full backdrop-blur-sm transition-all">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 p-3 rounded-full backdrop-blur-sm transition-all">
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? "bg-white w-6" : "bg-white/50"}`}
            />
          ))}
        </div>

        <div className="container relative z-10 pt-16">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6">
              <Globe className="w-4 h-4" />
              Study Abroad Destinations
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Your Perfect <span className="text-primary">Study Destination</span>
            </h1>
            <p className="text-lg text-white/90">
              Explore top study destinations around the world. We'll help you find the best universities, scholarships, and opportunities that match your goals.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-12">
        <div className="container">
          <div className="space-y-16">
            {destinations.map((destination, index) => (
              <motion.div 
                key={index} 
                className={`grid md:grid-cols-2 gap-8 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <motion.div 
                  className={index % 2 === 1 ? 'md:order-2' : ''}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative overflow-hidden rounded-2xl aspect-[16/10] shadow-lg">
                    <img src={destination.image} alt={destination.name} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 text-4xl">{destination.flag}</div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                </motion.div>
                <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                  <motion.h2 
                    className="text-3xl font-bold mb-4"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                  >
                    {destination.name}
                  </motion.h2>
                  <p className="text-muted-foreground mb-6">{destination.description}</p>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        Top Universities
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {destination.universities.map((uni, i) => (
                          <span key={i} className="px-3 py-1 bg-muted rounded-full text-sm">{uni}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Building className="w-4 h-4 text-primary" />
                        Highlights
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {destination.highlights.map((highlight, i) => (
                          <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">{highlight}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Link href={destination.slug === "malaysia" ? "/malaysia" : `/destinations/${destination.slug}`}>
                    <Button className="bg-primary hover:bg-primary/90 group">
                      Learn More About {destination.name}
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* Wall-E Style Chatbot Button */}
      <ChatBotButton onClick={() => setIsChatOpen(true)} />

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
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground">
                <div className="flex items-center gap-3">
                  <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/saxLOcubreWkfnzl.png" alt="SpecTa AI" className="w-10 h-10 object-contain" />
                  <div>
                    <h3 className="font-semibold">SpecTa AI Assistant</h3>
                    <p className="text-xs text-primary-foreground/80">Online • Ready to help</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-primary-foreground/10 rounded-full">
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
