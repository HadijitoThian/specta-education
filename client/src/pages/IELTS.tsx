import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, Clock, Users, Award, Star, ChevronLeft, ChevronRight, MessageCircle, X, Shield, Monitor, GraduationCap, UserCheck, RefreshCw, CalendarCheck, FileText, Headphones } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import { motion, AnimatePresence } from "framer-motion";

const ieltsTypes = [
  {
    icon: GraduationCap,
    title: "IELTS Academic Test",
    description: "Used for academic purposes as entry requirements to educational institutions abroad — from Diploma, Bachelor's, Master's to Doctoral programs.",
    color: "from-blue-500 to-blue-600"
  },
  {
    icon: FileText,
    title: "IELTS General Training",
    description: "Used to meet immigration requirements in various countries for work purposes, temporary and permanent residence permits, and citizenship abroad.",
    color: "from-emerald-500 to-emerald-600"
  }
];

const benefits = [
  { icon: CalendarCheck, title: "Start Anytime", description: "Start the IELTS Preparation Course anytime you want, without waiting for a certain quota to join." },
  { icon: Clock, title: "Flexible Time", description: "Choose to join IELTS Preparation Classes with more flexible scheduling options." },
  { icon: Award, title: "Guaranteed Score", description: "Get your target IELTS Overall Band score — and we guarantee it." },
  { icon: Shield, title: "Money-back Guarantee", description: "If you are unable to achieve your target score, we will give 100% cashback." },
  { icon: Monitor, title: "Online & Offline Class", description: "Join classes both online and offline — choose the format that works best for you." },
  { icon: UserCheck, title: "Experienced Teachers", description: "Our teachers have mentored more than 6,000 students for their successful IELTS tests since 2005." }
];

const testimonials = [
  { name: "Angie Y. A.", score: "8.0", image: "/testimonial-1.jpg", quote: "I received an Overall Score of 8 on my actual IELTS test. If SpecTa teachers can enhance my skills, I don't know why else you should be worried about joining!" },
  { name: "Nabila Imanina", score: "7.0", image: "/testimonial-2.jpg", quote: "I got 7.0 overall band score from 5.0 on Prediction Test. A very nice place to practice and learn about IELTS in an effective and efficient learning method." },
  { name: "Irvan Louis", score: "7.0", image: "/testimonial-3.jpg", quote: "Thanks, SpecTa! I got an overall 7! Special thanks to Sir Fred, Ms Onny, Pak Paulus, Pak Al, and Mba Wulan." },
  { name: "Sarah Chen", score: "7.5", image: "/testimonial-4.jpg", quote: "The personalized attention and structured approach helped me improve from 6.0 to 7.5 in just 8 weeks. Highly recommend SpecTa!" },
  { name: "Ahmad Rizky", score: "8.0", image: "/testimonial-5.jpg", quote: "SpecTa's intensive program was exactly what I needed. The mock tests and feedback sessions were invaluable for my preparation." }
];

const packages = [
  {
    name: "VIP / Guarantee Program",
    highlight: "Best Value",
    sessions: "80 Sessions",
    duration: "Up to 2 Years",
    features: [
      "80 Sessions Classes",
      "Flexible Schedule",
      "Online/Offline/Combined Classes",
      "2 Assessments",
      "FREE Access to SpecTa Education Learning Portal",
      "Extra Study Duration Up To 2 Years",
      "Guaranteed Score",
      "Money Back Guarantee"
    ],
    popular: true,
    color: "primary"
  },
  {
    name: "80 Sessions Program",
    highlight: null,
    sessions: "80 Sessions",
    duration: "4 Months",
    features: [
      "80 Sessions Classes",
      "Flexible Schedule",
      "Online/Offline/Combined Classes",
      "1 Assessment",
      "4 Months Study Duration"
    ],
    popular: false,
    color: "blue"
  },
  {
    name: "40 Sessions Program",
    highlight: null,
    sessions: "40 Sessions",
    duration: "2 Months",
    features: [
      "40 Sessions Classes",
      "Flexible Schedule",
      "Online/Offline/Combined Classes",
      "2 Months Study Duration"
    ],
    popular: false,
    color: "indigo"
  },
  {
    name: "Short Course Program",
    highlight: "Quick Start",
    sessions: "20 Sessions",
    duration: "2 Weeks",
    features: [
      "20 Sessions Classes",
      "Flexible Schedule",
      "Online/Offline/Combined Classes",
      "2 Weeks Study Duration"
    ],
    popular: false,
    color: "violet"
  },
  {
    name: "Private Program",
    highlight: "1-on-1",
    sessions: "Min. 10 Hours",
    duration: "Flexible",
    features: [
      "Minimum 10 Hours Sessions (1-2 Hours per Session)",
      "One on One Class Set Up",
      "Flexible Schedule",
      "Online/Offline/Combined Classes"
    ],
    popular: false,
    color: "rose"
  },
  {
    name: "English Prediction Test (EPT)",
    highlight: "Mock Test",
    sessions: "Per Test",
    duration: "Flexible",
    features: [
      "IELTS Prediction Test / Mock Test",
      "Listening, Reading, Writing, Speaking",
      "Online/Offline Test Available",
      "Affordable Price"
    ],
    popular: false,
    color: "amber"
  }
];

export default function IELTS() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextTestimonial = () => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  const prevTestimonial = () => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="ielts" />

      {/* Hero Section */}
      <motion.section 
        className="pt-32 pb-20 px-4 bg-gradient-to-br from-primary/5 to-accent/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              IELTS Preparation
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Achieve Your Target <span className="text-gradient-specta">IELTS Score</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Comprehensive IELTS preparation with experienced instructors since 2005. Our proven methods have helped more than 6,000 students achieve their target scores.
            </p>
            <p className="text-base text-primary font-semibold mb-8">
              Score Guarantee with 100% Money-Back Guarantee
            </p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <a href="https://wa.me/62819668278?text=Hi,%20I'm%20interested%20in%20IELTS%20preparation" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-primary hover:bg-primary/90">Register for IELTS Class</Button>
              </a>
              <Link href="/">
                <Button size="lg" variant="outline">Free IELTS Consultation</Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* IELTS Test Types Section */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">IELTS Tests</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Choose the right IELTS test based on your purpose</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {ieltsTypes.map((type, index) => (
              <motion.div 
                key={index}
                className="bg-card p-8 rounded-2xl shadow-sm border border-border group hover:shadow-xl hover:border-primary transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -5 }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-6`}>
                  <type.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{type.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{type.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose SpecTa Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Why Choose SpecTa?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Benefits of IELTS preparation at SpecTa Education</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div 
                key={index} 
                className="bg-card p-6 rounded-xl shadow-sm border border-border text-center group hover:border-primary hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <benefit.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IELTS Preparation Programs Section */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">IELTS Preparation Programs</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Choose the program that best fits your needs, schedule, and target score</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {packages.map((pkg, index) => (
              <motion.div 
                key={index} 
                className={`bg-card p-8 rounded-xl shadow-sm border relative group hover:shadow-xl transition-all duration-300 ${pkg.popular ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary'}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {pkg.highlight && (
                  <motion.div 
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-medium rounded-full ${
                      pkg.popular 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                  >
                    {pkg.highlight}
                  </motion.div>
                )}
                <h3 className="text-xl font-bold mb-2 mt-1">{pkg.name}</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-primary">{pkg.sessions}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-5">Duration: {pkg.duration}</div>
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature, i) => (
                    <motion.li 
                      key={i} 
                      className="flex items-start gap-2 text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>
                <a href={`https://wa.me/62819668278?text=Hi,%20I'm%20interested%20in%20the%20${encodeURIComponent(pkg.name)}`} target="_blank" rel="noopener noreferrer">
                  <Button className={`w-full group-hover:scale-105 transition-transform ${pkg.popular ? 'bg-primary' : ''}`} variant={pkg.popular ? 'default' : 'outline'}>
                    Get Started
                  </Button>
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Carousel Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Student Success Stories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Hear from our students who achieved their target IELTS scores</p>
          </motion.div>
          
          {/* Carousel */}
          <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonial}
                  className="bg-card p-8 md:p-12 rounded-2xl shadow-lg border border-border"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shrink-0">
                      <img 
                        src={testimonials[currentTestimonial].image} 
                        alt={testimonials[currentTestimonial].name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonials[currentTestimonial].name)}&size=128&background=E91E63&color=fff`;
                        }}
                      />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-lg text-muted-foreground mb-6 italic">"{testimonials[currentTestimonial].quote}"</p>
                      <div className="flex items-center justify-center md:justify-between flex-wrap gap-4">
                        <div>
                          <div className="font-semibold text-lg">{testimonials[currentTestimonial].name}</div>
                          <div className="text-sm text-muted-foreground">SpecTa IELTS Student</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">IELTS Score:</span>
                          <span className="text-3xl font-bold text-primary">{testimonials[currentTestimonial].score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Carousel Controls */}
            <button
              onClick={prevTestimonial}
              className="absolute left-0 md:-left-12 top-1/2 -translate-y-1/2 bg-white hover:bg-primary hover:text-white p-3 rounded-full shadow-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute right-0 md:-right-12 top-1/2 -translate-y-1/2 bg-white hover:bg-primary hover:text-white p-3 rounded-full shadow-lg transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentTestimonial ? "bg-primary w-6" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section 
        className="py-20"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="container">
          <motion.div 
            className="bg-gradient-specta rounded-2xl p-8 md:p-12 text-white text-center"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Ace Your IELTS?</h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-8">
              Join more than 6,000 successful students who achieved their target scores with SpecTa Education since 2005. Score guaranteed with money-back guarantee!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://wa.me/62819668278?text=Hi,%20I%20want%20to%20register%20for%20IELTS%20class" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">Register Now</Button>
              </a>
              <Link href="/">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">Free Consultation</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <Footer />

      {/* Small Chatbot Button */}
      <motion.button
        onClick={() => setIsChatOpen(true)}
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
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground">
                <div className="flex items-center gap-3">
                  <img src="/mascot.png" alt="SpecTa AI" className="w-10 h-10 object-contain" />
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
