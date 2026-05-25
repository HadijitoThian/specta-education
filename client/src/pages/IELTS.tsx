import { useState, useEffect } from "react";
import { SEO } from '@/components/SEO';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, Clock, Users, Award, Star, ChevronLeft, ChevronRight, MessageCircle, X, Shield, Monitor, GraduationCap, UserCheck, RefreshCw, CalendarCheck, FileText, Headphones, Target, Zap, TrendingUp, Play, ArrowRight, Sparkles, Globe, MapPin } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import { motion, AnimatePresence } from "framer-motion";

const ieltsTypes = [
  {
    icon: GraduationCap,
    title: "IELTS Academic Test",
    description: "Used for academic purposes as entry requirements to educational institutions abroad — from Diploma, Bachelor's, Master's to Doctoral programs.",
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  {
    icon: FileText,
    title: "IELTS General Training",
    description: "Used to meet immigration requirements in various countries for work purposes, temporary and permanent residence permits, and citizenship abroad.",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200"
  }
];

const benefits = [
  { icon: CalendarCheck, title: "Start Anytime", description: "Start the IELTS Preparation Course anytime you want, without waiting for a certain quota to join.", gradient: "from-violet-500 to-purple-600" },
  { icon: Clock, title: "Flexible Time", description: "Choose to join IELTS Preparation Classes with more flexible scheduling options.", gradient: "from-blue-500 to-cyan-600" },
  { icon: Award, title: "Guaranteed Score", description: "Get your target IELTS Overall Band score — and we guarantee it.", gradient: "from-amber-500 to-orange-600" },
  { icon: Shield, title: "Money-back Guarantee", description: "If you are unable to achieve your target score, we will give 100% cashback.", gradient: "from-rose-500 to-pink-600" },
  { icon: Monitor, title: "Online & Offline Class", description: "Join classes both online and offline — choose the format that works best for you.", gradient: "from-emerald-500 to-teal-600" },
  { icon: UserCheck, title: "Experienced Teachers", description: "Our teachers have mentored more than 6,000 students for their successful IELTS tests since 2005.", gradient: "from-indigo-500 to-blue-600" }
];

const testimonials = [
  { name: "Angie Y. A.", score: "8.0", image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/fcxuovpOPVSYDEOL.jpg", quote: "I received an Overall Score of 8 on my actual IELTS test. If SpecTa teachers can enhance my skills, I don't know why else you should be worried about joining!" },
  { name: "Nabila Imanina", score: "7.0", image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/rqYJsserdhaaeKxB.jpg", quote: "I got 7.0 overall band score from 5.0 on Prediction Test. A very nice place to practice and learn about IELTS in an effective and efficient learning method." },
  { name: "Irvan Louis", score: "7.0", image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/kUbFXwPeFvsStTWl.jpg", quote: "Thanks, SpecTa! I got an overall 7! Special thanks to Sir Fred, Ms Onny, Pak Paulus, Pak Al, and Mba Wulan." },
  { name: "Sarah Chen", score: "7.5", image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/cRuovhLnzbbhOziq.jpg", quote: "The personalized attention and structured approach helped me improve from 6.0 to 7.5 in just 8 weeks. Highly recommend SpecTa!" },
  { name: "Ahmad Rizky", score: "8.0", image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/oGYCKRHyaDJycUxN.jpg", quote: "SpecTa's intensive program was exactly what I needed. The mock tests and feedback sessions were invaluable for my preparation." }
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
      "Extra Study Duration Up To 1 Year",
      "Guaranteed Score",
      "Money Back Guarantee"
    ],
    popular: true,
    gradient: "from-rose-500 via-pink-500 to-purple-600"
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
    gradient: "from-blue-500 to-indigo-600"
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
    gradient: "from-indigo-500 to-violet-600"
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
    gradient: "from-violet-500 to-purple-600"
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
    gradient: "from-teal-500 to-emerald-600"
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
    gradient: "from-amber-500 to-orange-600"
  }
];

const skillSections = [
  { icon: Headphones, title: "Listening", description: "Master note-taking and prediction techniques", color: "text-blue-600", bg: "bg-blue-50" },
  { icon: BookOpen, title: "Reading", description: "Speed reading and comprehension strategies", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: FileText, title: "Writing", description: "Task 1 & Task 2 essay structure mastery", color: "text-purple-600", bg: "bg-purple-50" },
  { icon: MessageCircle, title: "Speaking", description: "Confidence building and fluency training", color: "text-rose-600", bg: "bg-rose-50" }
];

export default function IELTS() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    // SEO meta tags
    document.title = "IELTS Preparation Courses | SpecTa Education";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Prepare for IELTS with SpecTa Education. VIP guarantee, private, and group courses in Jakarta. Expert instructors and proven results.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Prepare for IELTS with SpecTa Education. VIP guarantee, private, and group courses in Jakarta. Expert instructors and proven results.';
      document.head.appendChild(meta);
    }
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'IELTS preparation Jakarta, IELTS course Indonesia, kursus IELTS, SpecTa Education, IELTS score guarantee');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'IELTS preparation Jakarta, IELTS course Indonesia, kursus IELTS, SpecTa Education, IELTS score guarantee';
      document.head.appendChild(meta);
    }
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
    <div className="min-h-screen bg-white">
      <SEO
        title="IELTS Preparation Course - SpecTa Education | Kursus IELTS Terbaik"
        description="Persiapan IELTS terbaik di Indonesia bersama SpecTa Education. Kelas IELTS online & offline dengan tutor berpengalaman, mock test, dan garansi skor. Raih target IELTS band 6.5+ untuk kuliah di luar negeri."
        keywords="IELTS preparation, kursus IELTS, IELTS online, IELTS mock test, IELTS band 6.5, IELTS Indonesia, belajar IELTS, IELTS writing, IELTS speaking"
      />
      <Navigation currentPage="ielts" />

      {/* Hero Section - Bold gradient with floating elements */}
      <section className="pt-24 pb-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)' }} />
        
        {/* Floating decorative elements */}
        <div className="absolute top-32 left-[10%] w-24 h-24 bg-white/10 rounded-3xl rotate-12 blur-sm" />
        <div className="absolute bottom-20 right-[15%] w-32 h-32 bg-white/5 rounded-full blur-md" />
        <div className="absolute top-40 right-[25%] w-16 h-16 bg-yellow-300/20 rounded-2xl -rotate-12" />
        
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6 border border-white/20"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="w-4 h-4" />
                Since 2005 • 6,000+ Students
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white leading-tight">
                Achieve Your
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-amber-200">Target IELTS Score</span>
              </h1>
              <p className="text-lg text-white/85 mb-4 max-w-lg leading-relaxed">
                Comprehensive IELTS preparation with experienced instructors. Our proven methods have helped thousands achieve their dream scores.
              </p>
              <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
                  <Shield className="w-4 h-4 text-yellow-300" />
                  <span className="text-white text-sm font-semibold">Score Guarantee</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
                  <RefreshCw className="w-4 h-4 text-yellow-300" />
                  <span className="text-white text-sm font-semibold">100% Money-Back</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="https://wa.me/62818218388?text=Hi,%20I'm%20interested%20in%20IELTS%20preparation" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-white text-rose-600 hover:bg-white/90 shadow-xl shadow-black/10 font-bold px-8 py-6 text-base rounded-xl">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Register for IELTS Class
                  </Button>
                </a>
                <a href="https://wa.me/62818218388?text=Hi,%20I'd%20like%20a%20free%20IELTS%20consultation" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-2 border-white/40 text-white hover:bg-white/10 px-8 py-6 text-base rounded-xl">
                    Free Consultation
                  </Button>
                </a>
                <Link href="/ielts/practice">
                  <Button size="lg" variant="outline" className="border-2 border-emerald-400/60 text-white hover:bg-white/10 px-8 py-6 text-base rounded-xl">
                    <Play className="w-5 h-5 mr-2" />
                    Try AI Practice Test
                  </Button>
                </Link>
              </div>
            </motion.div>
            
            {/* Right side - Score cards */}
            <motion.div 
              className="hidden lg:block relative"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="relative">
                {/* Main score card */}
                <div className="bg-white/15 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
                  <div className="text-center mb-6">
                    <p className="text-white/70 text-sm mb-2">Average Score Improvement</p>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-white/60 text-xs mb-1">Before</p>
                        <p className="text-3xl font-bold text-white/70">5.0</p>
                      </div>
                      <div className="flex items-center">
                        <ArrowRight className="w-8 h-8 text-yellow-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-yellow-300 text-xs mb-1">After</p>
                        <p className="text-5xl font-bold text-yellow-300">7.0+</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Skill bars */}
                  <div className="space-y-3">
                    {skillSections.map((skill, i) => (
                      <motion.div 
                        key={i} 
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                      >
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                          <skill.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white text-xs font-medium">{skill.title}</span>
                            <span className="text-white/60 text-xs">{skill.description}</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${75 + i * 5}%` }}
                              transition={{ delay: 0.8 + i * 0.1, duration: 0.8 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Floating badge */}
                <motion.div 
                  className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-xl font-bold text-sm shadow-lg"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    #1 in Jakarta
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-gray-50 border-y border-gray-100">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "6,000+", label: "Students Trained" },
              { value: "19+", label: "Years Experience" },
              { value: "7.0+", label: "Average Score" },
              { value: "100%", label: "Money-Back Guarantee" }
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-600">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IELTS Breakthrough Self-Study Banner */}
      <section className="py-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div 
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4 border border-white/30"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="w-4 h-4" />
                NEW: Self-Study Platform
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                🎯 Master IELTS Self-Study with IELTS Breakthrough
              </h2>
              <p className="text-white/90 text-lg max-w-3xl mx-auto leading-relaxed">
                Master all 4 IELTS skills (Writing, Reading, Listening, Speaking) in one platform. 
                28 complete modules with audio lessons, PDF slides, and handbook. Lifetime access starting from <span className="font-bold text-yellow-300">Rp 149,000</span>.
              </p>
            </div>

            {/* 4 Skills Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
              {[
                { icon: FileText, title: "Writing", desc: "Essay & Report" },
                { icon: BookOpen, title: "Reading", desc: "Comprehension" },
                { icon: Headphones, title: "Listening", desc: "Audio Practice" },
                { icon: MessageCircle, title: "Speaking", desc: "Fluency & Pronunciation" }
              ].map((skill, i) => (
                <motion.div
                  key={i}
                  className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center group hover:bg-white/25 transition-all duration-300 hover:scale-105"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <div className="w-14 h-14 mx-auto mb-4 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <skill.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">{skill.title}</h3>
                  <p className="text-white/70 text-sm">{skill.desc}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/90 rounded-full text-white text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    AVAILABLE
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Features & Pricing */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 mb-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Features */}
                <div>
                  <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-300" />
                    What You'll Get:
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "28 complete modules for all 4 skills",
                      "Audio lessons for every module",
                      "PDF slides & handbook",
                      "Lifetime access",
                      "Learn anytime, anywhere",
                      "Proven methods from 20+ years IELTS experts"
                    ].map((feature, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-3 text-white/90"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                      >
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Right: Pricing */}
                <div className="flex flex-col justify-center">
                  <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                    <div className="text-center mb-4">
                      <p className="text-white/70 text-sm mb-2">Starting From</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-white/50 line-through text-2xl">Rp 299,000</span>
                        <span className="text-yellow-300 font-bold text-4xl">Rp 149,000</span>
                      </div>
                      <p className="text-white/80 text-sm mt-2">Lifetime Access • All Modules</p>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-white/80 text-sm">
                        <span>✍️ Writing Module</span>
                        <span className="text-green-400 font-semibold">Included</span>
                      </div>
                      <div className="flex items-center justify-between text-white/80 text-sm">
                        <span>📖 Reading Module</span>
                        <span className="text-green-400 font-semibold">Included</span>
                      </div>
                      <div className="flex items-center justify-between text-white/80 text-sm">
                        <span>🎧 Listening Module</span>
                        <span className="text-green-400 font-semibold">Included</span>
                      </div>
                      <div className="flex items-center justify-between text-white/80 text-sm">
                        <span>🗣️ Speaking Module</span>
                        <span className="text-green-400 font-semibold">Included</span>
                      </div>
                    </div>
                    <a href="https://ielts-w.spectaeducation.com" target="_blank" rel="noopener noreferrer" className="block">
                      <Button size="lg" className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-gray-900 font-bold shadow-xl shadow-black/20 py-6 text-base rounded-xl group">
                        View Full Packages & Pricing
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </a>
                    <p className="text-white/60 text-xs text-center mt-3">100% money-back guarantee</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="text-center">
              <p className="text-white/80 text-sm mb-4">
                📚 Trusted by <span className="font-bold text-yellow-300">6,000+ students</span> since 2005
              </p>
              <div className="flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
                <span className="text-white/90 ml-2 font-semibold">4.9/5.0 from 276+ reviews</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* IELTS Test Types Section */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-sm font-medium mb-4">
              <BookOpen className="w-4 h-4" />
              Test Types
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your IELTS Test</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Select the right IELTS test based on your purpose</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {ieltsTypes.map((type, index) => (
              <motion.div 
                key={index}
                className={`${type.bgColor} p-8 rounded-2xl border ${type.borderColor} group hover:shadow-xl transition-all duration-300 relative overflow-hidden`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/30 to-transparent rounded-bl-full" />
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <type.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{type.title}</h3>
                <p className="text-gray-600 leading-relaxed">{type.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Skills Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full text-purple-600 text-sm font-medium mb-4">
              <Target className="w-4 h-4" />
              Complete Preparation
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Master All 4 IELTS Skills</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Our comprehensive approach covers every aspect of the IELTS exam</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {skillSections.map((skill, index) => (
              <motion.div 
                key={index}
                className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 text-center group hover:shadow-xl transition-all"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
              >
                <div className={`w-16 h-16 ${skill.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <skill.icon className={`w-8 h-8 ${skill.color}`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{skill.title}</h3>
                <p className="text-gray-500 text-sm">{skill.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose SpecTa Section */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full text-amber-600 text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Why SpecTa
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose SpecTa?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Benefits of IELTS preparation at SpecTa Education</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div 
                key={index} 
                className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 group hover:shadow-xl transition-all"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${benefit.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <benefit.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IELTS Preparation Programs Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-full text-rose-600 text-sm font-medium mb-4">
              <GraduationCap className="w-4 h-4" />
              Programs
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">IELTS Preparation Programs</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Choose the program that best fits your needs, schedule, and target score</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {packages.map((pkg, index) => (
              <motion.div 
                key={index} 
                className={`bg-white rounded-2xl shadow-lg border relative group hover:shadow-2xl transition-all duration-300 overflow-hidden ${pkg.popular ? 'border-rose-200 ring-2 ring-rose-400/30' : 'border-gray-100'}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
              >
                {/* Top gradient bar */}
                <div className={`h-1.5 bg-gradient-to-r ${pkg.gradient}`} />
                
                <div className="p-7">
                  {pkg.highlight && (
                    <motion.div 
                      className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full mb-4 ${
                        pkg.popular 
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                    >
                      {pkg.popular && <Star className="w-3 h-3 mr-1" />}
                      {pkg.highlight}
                    </motion.div>
                  )}
                  <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${pkg.gradient}`}>{pkg.sessions}</span>
                  </div>
                  <div className="text-sm text-gray-400 mb-5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Duration: {pkg.duration}
                  </div>
                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, i) => (
                      <motion.li 
                        key={i} 
                        className="flex items-start gap-2.5 text-sm"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-gray-600">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <a
                    href={
                      pkg.highlight === "Mock Test"
                        ? "https://mock-up.spectaeducation.com"
                        : `https://wa.me/62818218388?text=Hi,%20I'm%20interested%20in%20the%20${encodeURIComponent(pkg.name)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className={`w-full rounded-xl py-5 font-semibold transition-all ${
                      pkg.popular 
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-200/50' 
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}>
                      {pkg.highlight === "Mock Test" ? "Mulai Mock Test" : "Get Started"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Carousel Section */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Success Stories
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Student Success Stories</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Hear from our students who achieved their target IELTS scores</p>
          </motion.div>
          
          {/* Carousel */}
          <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-3xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonial}
                  className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 md:p-12 rounded-3xl border border-indigo-100"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white shadow-xl shrink-0">
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
                      <p className="text-lg text-gray-700 mb-6 italic leading-relaxed">"{testimonials[currentTestimonial].quote}"</p>
                      <div className="flex items-center justify-center md:justify-between flex-wrap gap-4">
                        <div>
                          <div className="font-bold text-lg">{testimonials[currentTestimonial].name}</div>
                          <div className="text-sm text-gray-500">SpecTa IELTS Student</div>
                        </div>
                        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-md border border-gray-100">
                          <span className="text-sm text-gray-500">IELTS Score:</span>
                          <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-600">{testimonials[currentTestimonial].score}</span>
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
              className="absolute left-0 md:-left-14 top-1/2 -translate-y-1/2 bg-white hover:bg-indigo-50 p-3 rounded-xl shadow-lg border border-gray-100 transition-all hover:shadow-xl"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute right-0 md:-right-14 top-1/2 -translate-y-1/2 bg-white hover:bg-indigo-50 p-3 rounded-xl shadow-lg border border-gray-100 transition-all hover:shadow-xl"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentTestimonial ? "bg-gradient-to-r from-rose-500 to-purple-600 w-8" : "bg-gray-300 w-2"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="relative overflow-hidden rounded-3xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600" />
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)' }} />
            
            <div className="relative z-10 p-10 md:p-16 text-center">
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6 border border-white/20"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <TrendingUp className="w-4 h-4" />
                Start Your Journey Today
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-bold mb-5 text-white">Ready to Ace Your IELTS?</h2>
              <p className="text-white/85 max-w-2xl mx-auto mb-10 text-lg leading-relaxed">
                Join more than 6,000 successful students who achieved their target scores with SpecTa Education since 2005. Score guaranteed with money-back guarantee!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="https://wa.me/62818218388?text=Hi,%20I%20want%20to%20register%20for%20IELTS%20class" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-white text-rose-600 hover:bg-white/90 shadow-xl font-bold px-8 py-6 text-base rounded-xl">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Register Now
                  </Button>
                </a>
                <a href="https://wa.me/62818218388?text=Hi,%20I'd%20like%20a%20free%20IELTS%20consultation" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-2 border-white/40 text-white hover:bg-white/10 px-8 py-6 text-base rounded-xl">
                    Free Consultation
                  </Button>
                </a>
                <Link href="/ielts/practice">
                  <Button size="lg" variant="outline" className="border-2 border-emerald-400/60 text-white hover:bg-white/10 px-8 py-6 text-base rounded-xl">
                    <Play className="w-5 h-5 mr-2" />
                    Free AI Practice Test
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Related Resources - Internal Linking for SEO */}
      <section className="py-16 bg-muted/20">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-8">Continue Your Study Abroad Journey</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Link href="/destinations">
              <div className="p-5 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                <MapPin className="w-7 h-7 text-primary mb-3" />
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Explore Destinations</h3>
                <p className="text-sm text-muted-foreground">Compare top study destinations in Australia, UK, USA, Canada, and more.</p>
              </div>
            </Link>
            <Link href="/aptitude-test">
              <div className="p-5 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                <GraduationCap className="w-7 h-7 text-primary mb-3" />
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">AI Aptitude Test</h3>
                <p className="text-sm text-muted-foreground">Discover your ideal university major with AI-powered analysis.</p>
              </div>
            </Link>
            <Link href="/scholarships">
              <div className="p-5 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                <Award className="w-7 h-7 text-primary mb-3" />
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Scholarships</h3>
                <p className="text-sm text-muted-foreground">Find scholarships and funding for your overseas education.</p>
              </div>
            </Link>
            <Link href="/simulator">
              <div className="p-5 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                <Globe className="w-7 h-7 text-primary mb-3" />
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Study Abroad Simulator</h3>
                <p className="text-sm text-muted-foreground">Experience 3 days of student life abroad before you go.</p>
              </div>
            </Link>
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
              <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-rose-500 to-purple-600 text-white">
                <div className="flex items-center gap-3">
                  <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/saxLOcubreWkfnzl.png" alt="SpecTa AI" className="w-10 h-10 object-contain" />
                  <div>
                    <h3 className="font-semibold">SpecTa AI Assistant</h3>
                    <p className="text-xs text-white/80">Online &bull; Ready to help</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
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
