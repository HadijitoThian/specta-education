import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileText, Clock, ArrowRight, ChevronLeft, ChevronRight, MessageCircle, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import { motion, AnimatePresence } from "framer-motion";

const articles = [
  { id: 1, title: "How to Choose the Right Country for Your Study Abroad Journey", excerpt: "Deciding where to study abroad is one of the most important decisions you'll make. Here's a comprehensive guide to help you choose the perfect destination.", content: "Choosing the right country for your study abroad journey is a crucial decision that will shape your academic and personal growth. Consider factors such as the quality of education, cost of living, language requirements, and career opportunities. Research the culture and lifestyle of potential destinations to ensure a good fit. Think about your long-term goals - do you want to work in that country after graduation? Look into post-study work visa options. Consider the climate and how it might affect your daily life. Talk to alumni who have studied in your target countries to get firsthand insights. Remember, there's no one-size-fits-all answer - the best country for you depends on your unique circumstances, goals, and preferences.", category: "Study Abroad Tips", readTime: "5 min read", image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop", date: "January 10, 2026" },
  { id: 2, title: "IELTS Preparation: Tips to Score Band 7 and Above", excerpt: "Achieving a high IELTS score is crucial for your study abroad application. Learn proven strategies from our expert instructors.", content: "Scoring Band 7 or above in IELTS requires strategic preparation and consistent practice. Start by understanding the test format thoroughly - know what to expect in each section. For Reading, practice skimming and scanning techniques to save time. For Writing, learn to structure your essays clearly with introduction, body paragraphs, and conclusion. For Speaking, practice with native speakers or use apps to improve fluency. For Listening, expose yourself to various English accents through podcasts and videos. Take regular mock tests under timed conditions to build stamina. Focus on your weakest areas but don't neglect your strengths. Expand your vocabulary by reading English newspapers and academic journals. Remember, consistency is key - practice a little every day rather than cramming before the test.", category: "IELTS", readTime: "7 min read", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop", date: "January 5, 2026" },
  { id: 3, title: "Scholarship Opportunities for Indonesian Students in 2026", excerpt: "Discover the top scholarships available for Indonesian students looking to study in Australia, UK, USA, and other countries.", content: "Indonesian students have access to numerous scholarship opportunities for studying abroad. The Australia Awards Scholarship covers full tuition, living expenses, and airfare for postgraduate studies. The Chevening Scholarship offers fully-funded Master's programs in the UK. The Fulbright Scholarship provides opportunities for graduate study in the USA. LPDP (Indonesia Endowment Fund for Education) is a government scholarship covering various countries. Many universities also offer their own scholarships - research individual institutions. Start your application early as deadlines are often 6-12 months before the program starts. Prepare strong personal statements highlighting your achievements and future goals. Get excellent recommendation letters from professors or employers who know you well.", category: "Scholarships", readTime: "6 min read", image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=400&fit=crop", date: "December 28, 2025" },
  { id: 4, title: "Student Visa Application: A Step-by-Step Guide", excerpt: "Navigate the visa application process with confidence. Our comprehensive guide covers everything from documents to interviews.", content: "The student visa application process can seem daunting, but with proper preparation, it becomes manageable. First, receive your offer letter and Confirmation of Enrollment from your university. Gather required documents: passport, academic transcripts, English proficiency scores, financial proof, and health insurance. Complete the online visa application form accurately. Pay the visa application fee. Schedule and attend a biometrics appointment if required. Prepare for a potential interview by practicing common questions about your study plans and ties to your home country. Demonstrate genuine student intent and sufficient funds. Submit your application well in advance - processing times vary by country. Track your application status online. Once approved, review your visa conditions carefully and plan your travel.", category: "Visa Guide", readTime: "8 min read", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop", date: "December 20, 2025" },
  { id: 5, title: "Life as an International Student: What to Expect", excerpt: "Hear from our alumni about their experiences studying abroad and tips for adapting to a new country and culture.", content: "Life as an international student is an exciting adventure filled with new experiences. Expect culture shock in the first few weeks - this is normal and temporary. Join student organizations and clubs to make friends and build your network. Take advantage of university support services for international students. Learn to cook simple meals to save money and stay healthy. Explore your new city and country during breaks. Stay connected with family and friends back home through video calls. Be open to trying new things and stepping out of your comfort zone. Manage your time wisely between studies, work (if permitted), and social life. Build relationships with professors - they can be valuable mentors. Document your journey through photos and journals - you'll treasure these memories later.", category: "Student Life", readTime: "5 min read", image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&h=400&fit=crop", date: "December 15, 2025" },
  { id: 6, title: "Top Universities in Australia for Indonesian Students", excerpt: "Explore the best Australian universities that welcome Indonesian students with excellent programs and support services.", content: "Australia is home to many world-class universities that actively welcome Indonesian students. The University of Melbourne consistently ranks among the top 20 globally, offering excellent programs across all disciplines. The University of Sydney is known for its beautiful campus and strong research output. Monash University has a large Indonesian student community and dedicated support services. UNSW Sydney excels in engineering and business programs. The University of Queensland offers a great balance of academic excellence and lifestyle. Each university has unique strengths - research which aligns best with your field of study. Consider location, campus culture, and available support services. Many Australian universities have partnerships with Indonesian institutions, making credit transfers easier.", category: "Universities", readTime: "6 min read", image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=600&h=400&fit=crop", date: "December 10, 2025" },
  { id: 7, title: "How to Write a Winning Personal Statement", excerpt: "Your personal statement can make or break your application. Learn how to craft a compelling narrative that stands out.", content: "A winning personal statement tells your unique story and demonstrates why you're the perfect fit for your chosen program. Start with a hook that grabs attention - an anecdote, question, or bold statement. Explain your motivation for studying this subject and at this institution. Highlight relevant experiences, achievements, and skills. Show, don't tell - use specific examples rather than generic claims. Demonstrate your knowledge of the program and how it aligns with your goals. Address any gaps or weaknesses in your application honestly. End with a strong conclusion that ties everything together. Get feedback from teachers, counselors, or professionals. Proofread multiple times for grammar and spelling errors. Be authentic - admissions officers can spot insincerity.", category: "Study Abroad Tips", readTime: "6 min read", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=400&fit=crop", date: "December 5, 2025" },
  { id: 8, title: "Working While Studying Abroad: Rights and Opportunities", excerpt: "Learn about work rights for international students and how to balance work with your studies effectively.", content: "Many countries allow international students to work part-time while studying. In Australia, student visa holders can work up to 48 hours per fortnight during semesters. In the UK, you can typically work up to 20 hours per week. In Canada, you can work on-campus without a permit and off-campus with one. Working helps you gain valuable experience, earn extra income, and improve language skills. Look for jobs related to your field of study for relevant experience. On-campus jobs are often more flexible with student schedules. Balance is crucial - don't let work affect your academic performance. Keep track of your working hours to stay within visa conditions. Some scholarships may have restrictions on working - check your terms. Internships and co-op programs can provide excellent career-relevant experience.", category: "Student Life", readTime: "7 min read", image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=400&fit=crop", date: "November 28, 2025" }
];

const categories = ["All", "Study Abroad Tips", "IELTS", "Scholarships", "Visa Guide", "Student Life", "Universities"];

const carouselImages = [
  { src: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=600&fit=crop", title: "Study Abroad Insights" },
  { src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=600&fit=crop", title: "IELTS Preparation" },
  { src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&h=600&fit=crop", title: "Student Life" }
];

export default function Articles() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState<typeof articles[0] | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredArticles = selectedCategory === "All" 
    ? articles 
    : articles.filter(a => a.category === selectedCategory);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="articles" />

      {/* Hero Section with Carousel */}
      <section className="pt-24 pb-12 px-4 relative overflow-hidden">
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

        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 p-3 rounded-full backdrop-blur-sm transition-all">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 p-3 rounded-full backdrop-blur-sm transition-all">
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {carouselImages.map((_, index) => (
            <button key={index} onClick={() => setCurrentSlide(index)} className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? "bg-white w-6" : "bg-white/50"}`} />
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
              <FileText className="w-4 h-4" />
              Articles & Resources
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Study Abroad <span className="text-primary">Insights</span>
            </h1>
            <p className="text-lg text-white/90">
              Expert advice, tips, and resources to help you navigate your study abroad journey successfully.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories Filter */}
      <section className="py-8">
        <div className="container">
          <motion.div 
            className="flex flex-wrap gap-2 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {categories.map((category, index) => (
              <motion.button
                key={index}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {category}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12">
        <div className="container">
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            layout
          >
            <AnimatePresence mode="popLayout">
              {filteredArticles.map((article, index) => (
                <motion.article 
                  key={article.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-card rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-lg transition-shadow group cursor-pointer"
                  onClick={() => setSelectedArticle(article)}
                  whileHover={{ y: -5 }}
                >
                  <div className="aspect-[3/2] overflow-hidden">
                    <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">{article.category}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {article.readTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{article.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{article.date}</span>
                      <span className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                        Read More <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <Footer />

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedArticle(null)}
          >
            <motion.div 
              className="w-full max-w-3xl max-h-[90vh] bg-card rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-64 object-cover" />
                <button 
                  onClick={() => setSelectedArticle(null)} 
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">{selectedArticle.category}</span>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <span>{selectedArticle.date}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedArticle.readTime}
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-4">{selectedArticle.title}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{selectedArticle.content}</p>
                <div className="mt-8 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-4">Need personalized advice on this topic?</p>
                  <Button onClick={() => { setSelectedArticle(null); setIsChatOpen(true); }} className="bg-primary hover:bg-primary/90">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat with SpecTa AI
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
