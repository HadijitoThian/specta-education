import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, Award, Target, Heart, Globe, BookOpen, FileCheck, ChevronLeft, ChevronRight, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "@/components/SEO";

// Leadership Team
const leadershipTeam = [
  {
    name: "Hadi Jito Thian",
    role: "Chief Executive Officer",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/zNTBionUQKPpwweD.png",
    description: "Founder and CEO of SpecTa Education, leading the company's mission to help Indonesian students achieve their study abroad dreams."
  },
  {
    name: "Adhitya Irvan Maulana",
    role: "Chief Operating Officer",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/ixmfLjNLHxyqCXzT.jpg",
    description: "Overseeing daily operations and ensuring excellence in student services and partner relationships."
  },
  {
    name: "Harianto Tian",
    role: "Senior Advisor",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/GyBuWooHvGHZgRVJ.jpeg",
    description: "Bringing years of experience in education and business strategy to guide SpecTa Education's vision."
  }
];

// Department Teams with unique icons
const departmentTeams = [
  {
    name: "Education Counselors",
    role: "Student Guidance",
    icon: Users,
    description: "Experienced counselors dedicated to helping students find their perfect study abroad destination."
  },
  {
    name: "IELTS Instructors",
    role: "Test Preparation",
    icon: BookOpen,
    description: "Certified IELTS trainers with proven track records of helping students achieve high scores."
  },
  {
    name: "Visa Specialists",
    role: "Documentation Support",
    icon: FileCheck,
    description: "Expert visa consultants ensuring smooth application processes for all destinations."
  }
];

const values = [
  { icon: Heart, title: "Student-Centered", description: "Every decision we make puts our students' success first." },
  { icon: Award, title: "Excellence", description: "We strive for excellence in every service we provide." },
  { icon: Target, title: "Results-Driven", description: "Our success is measured by our students' achievements." },
  { icon: Globe, title: "Global Perspective", description: "Connecting students with world-class opportunities." }
];

// Mission carousel images
const missionImages = [
  { src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/VVzPvoNHvKuenjJC.jpg", alt: "Diverse students learning together" },
  { src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/nCaOEbPxJfKYRtpD.jpg", alt: "International classroom" },
  { src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/ExFyNRXdbJhSwWpR.jpg", alt: "Education counseling session" },
  { src: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/WttGGxbUvvuiLuiQ.jpg", alt: "Graduation celebration" }
];

// Counting animation component
function CountUp({ end, suffix = "", duration = 2 }: { end: number; suffix?: string; duration?: number }) {
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

export default function About() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % missionImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % missionImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + missionImages.length) % missionImages.length);

  return (
    <>
      <SEO
        title="About SpecTa Education - Study Abroad Consultant"
        description="SpecTa Education is Indonesia's trusted study abroad consultant since 2005. Helping students achieve dreams of studying in UK, USA, Australia, and more."
        keywords="about SpecTa Education, study abroad consultant Indonesia, konsultan pendidikan luar negeri, education consultant Jakarta, trusted study abroad agent"
        canonical="https://spectaeducation.com/about"
        ogImage="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/kMEinJVrDybnuqph.jpg"
      />
      <div className="min-h-screen bg-background">
        <Navigation currentPage="about" />

      {/* Hero Section */}
      <motion.section 
        className="pt-32 pb-20 px-4 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 z-0">
          <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/XFSKFfBDnwuNIcYC.jpg" alt="SpecTa Education office - study abroad consultant in Jakarta" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/90 to-white"></div>
        </div>
        <div className="container relative z-10">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Users className="w-4 h-4" />
              About SpecTa Education
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Trusted Partner for <span className="text-gradient-specta">Study Abroad</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              SpecTa Education has been helping Indonesian students achieve their dreams of studying abroad. With experienced counselors and a proven track record, we guide students through every step.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Mission Section with Carousel */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-6">
                At SpecTa Education, our mission is to empower Indonesian students with access to world-class education opportunities abroad. We believe every student deserves the chance to pursue their academic dreams.
              </p>
              <p className="text-muted-foreground mb-6">
                We provide comprehensive support throughout the entire study abroad journey - from initial consultation and university selection to IELTS preparation, visa applications, and pre-departure guidance.
              </p>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary"><CountUp end={15} suffix="+" /></div>
                  <div className="text-sm text-muted-foreground">Years Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary"><CountUp end={1000} suffix="+" /></div>
                  <div className="text-sm text-muted-foreground">Students Placed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary"><CountUp end={50} suffix="+" /></div>
                  <div className="text-sm text-muted-foreground">Partner Universities</div>
                </div>
              </div>
            </motion.div>
            
            {/* Dynamic Carousel */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-xl">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentSlide}
                    src={missionImages[currentSlide].src}
                    alt={missionImages[currentSlide].alt}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                
                {/* Carousel Controls */}
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {missionImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentSlide ? "bg-white w-6" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These core values guide everything we do at SpecTa Education
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div 
                key={index} 
                className="text-center p-6"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Our Leadership</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Meet the visionary leaders guiding SpecTa Education
            </p>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-8">
            {leadershipTeam.map((member, index) => (
              <motion.div 
                key={index} 
                className="bg-card p-8 rounded-xl shadow-sm border border-border text-center max-w-sm"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
              >
                <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-primary/20">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                <p className="text-primary text-sm font-medium mb-3">{member.role}</p>
                <p className="text-muted-foreground text-sm">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Department Teams Section with unique icons */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Our Teams</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Dedicated professionals committed to your success
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {departmentTeams.map((team, index) => (
              <motion.div 
                key={index} 
                className="bg-card p-8 rounded-xl shadow-sm border border-border text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <team.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-1">{team.name}</h3>
                <p className="text-primary text-sm mb-3">{team.role}</p>
                <p className="text-muted-foreground text-sm">{team.description}</p>
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
    </>
  );
}
