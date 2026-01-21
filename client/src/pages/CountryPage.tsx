import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { GraduationCap, Building, DollarSign, Briefcase, Globe, ChevronRight, MessageCircle, X, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import { motion, AnimatePresence } from "framer-motion";

const countryData: Record<string, any> = {
  singapore: {
    name: "Singapore",
    flag: "🇸🇬",
    heroImage: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&h=600&fit=crop",
    description: "Singapore is Asia's premier education hub, home to world-renowned universities and a strategic gateway to global opportunities.",
    stats: [
      { label: "Universities", value: "6+" },
      { label: "International Students", value: "75,000+" },
      { label: "Global Ranking", value: "Top 15" },
      { label: "Graduate Employment", value: "94%" }
    ],
    universities: [
      { name: "National University of Singapore (NUS)", ranking: "#8 World", programs: ["Engineering", "Business", "Computing", "Medicine"] },
      { name: "Nanyang Technological University (NTU)", ranking: "#26 World", programs: ["Engineering", "Science", "Business", "Art & Design"] },
      { name: "Singapore Management University (SMU)", ranking: "Top Business School", programs: ["Business", "Law", "Economics", "IT"] }
    ],
    whyStudy: [
      { icon: GraduationCap, title: "World-Class Education", desc: "Home to globally ranked universities with cutting-edge research facilities" },
      { icon: Briefcase, title: "Career Opportunities", desc: "Strong job market with connections to multinational companies" },
      { icon: Globe, title: "Strategic Location", desc: "Gateway to Asia with excellent connectivity to Indonesia" },
      { icon: DollarSign, title: "Scholarships Available", desc: "Various scholarship programs for international students" }
    ],
    requirements: ["Academic transcripts", "English proficiency (IELTS/TOEFL)", "Statement of Purpose", "Letters of recommendation"],
    intakes: ["August (Main)", "January (Some programs)"]
  },
  china: {
    name: "China",
    flag: "🇨🇳",
    heroImage: "/dest-china.jpg",
    description: "China offers world-class education at affordable prices, with rich cultural experiences and growing global influence.",
    stats: [
      { label: "Universities", value: "2,900+" },
      { label: "International Students", value: "500,000+" },
      { label: "Scholarship Programs", value: "CSC & More" },
      { label: "English Programs", value: "Growing" }
    ],
    universities: [
      { name: "Tsinghua University", ranking: "#12 World", programs: ["Engineering", "Science", "Business", "Architecture"] },
      { name: "Peking University", ranking: "#14 World", programs: ["Humanities", "Science", "Law", "Medicine"] },
      { name: "Fudan University", ranking: "#31 World", programs: ["Business", "Medicine", "Journalism", "Economics"] }
    ],
    whyStudy: [
      { icon: DollarSign, title: "Affordable Education", desc: "Lower tuition fees compared to Western countries" },
      { icon: GraduationCap, title: "CSC Scholarships", desc: "Chinese Government Scholarship covers tuition and living expenses" },
      { icon: Globe, title: "Cultural Experience", desc: "Immerse in one of the world's oldest civilizations" },
      { icon: Briefcase, title: "Growing Economy", desc: "Opportunities in the world's second-largest economy" }
    ],
    requirements: ["Academic transcripts", "HSK (for Chinese programs) or IELTS", "Health certificate", "No criminal record"],
    intakes: ["September (Main)", "March (Some programs)"]
  },
  uk: {
    name: "United Kingdom",
    flag: "🇬🇧",
    heroImage: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=600&fit=crop",
    description: "The UK offers prestigious education with centuries of academic excellence and globally recognized qualifications.",
    stats: [
      { label: "Universities", value: "160+" },
      { label: "International Students", value: "600,000+" },
      { label: "Graduate Visa", value: "2 Years" },
      { label: "Master's Duration", value: "1 Year" }
    ],
    universities: [
      { name: "University of Oxford", ranking: "#1 World", programs: ["All disciplines"] },
      { name: "University of Cambridge", ranking: "#2 World", programs: ["All disciplines"] },
      { name: "Imperial College London", ranking: "#6 World", programs: ["Science", "Engineering", "Medicine", "Business"] }
    ],
    whyStudy: [
      { icon: GraduationCap, title: "Prestigious Degrees", desc: "Globally recognized qualifications from historic institutions" },
      { icon: Building, title: "1-Year Masters", desc: "Complete your postgraduate degree in just one year" },
      { icon: Briefcase, title: "Graduate Route Visa", desc: "Stay and work for 2 years after graduation" },
      { icon: Globe, title: "Cultural Diversity", desc: "Multicultural environment with students from around the world" }
    ],
    requirements: ["Academic transcripts", "IELTS (6.0-7.0)", "Personal statement", "References"],
    intakes: ["September (Main)", "January (Some programs)"]
  },
  australia: {
    name: "Australia",
    flag: "🇦🇺",
    heroImage: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=1200&h=600&fit=crop",
    description: "Australia offers world-class education, beautiful landscapes, and excellent post-study work opportunities.",
    stats: [
      { label: "Universities", value: "43" },
      { label: "International Students", value: "750,000+" },
      { label: "Post-Study Work", value: "2-4 Years" },
      { label: "Quality of Life", value: "Top 10" }
    ],
    universities: [
      { name: "University of Melbourne", ranking: "#14 World", programs: ["Arts", "Science", "Business", "Engineering"] },
      { name: "University of Sydney", ranking: "#19 World", programs: ["All disciplines"] },
      { name: "Monash University", ranking: "#42 World", programs: ["Business", "Engineering", "Medicine", "IT"] }
    ],
    whyStudy: [
      { icon: Briefcase, title: "Post-Study Work Visa", desc: "Work 2-4 years after graduation depending on qualification" },
      { icon: Globe, title: "Multicultural Society", desc: "Welcoming environment for international students" },
      { icon: GraduationCap, title: "Research Excellence", desc: "Leading research institutions with modern facilities" },
      { icon: Building, title: "High Quality of Life", desc: "Safe cities with excellent healthcare and lifestyle" }
    ],
    requirements: ["Academic transcripts", "IELTS (6.0-7.0)", "Statement of Purpose", "Financial proof"],
    intakes: ["February (Main)", "July (Second intake)"]
  },
  "new-zealand": {
    name: "New Zealand",
    flag: "🇳🇿",
    heroImage: "https://images.unsplash.com/photo-1469521669194-babb45599def?w=1200&h=600&fit=crop",
    description: "New Zealand offers quality education in a safe, beautiful environment with excellent post-study work opportunities.",
    stats: [
      { label: "Universities", value: "8" },
      { label: "International Students", value: "100,000+" },
      { label: "Post-Study Work", value: "1-3 Years" },
      { label: "Safety Ranking", value: "Top 5" }
    ],
    universities: [
      { name: "University of Auckland", ranking: "#68 World", programs: ["All disciplines"] },
      { name: "University of Otago", ranking: "#206 World", programs: ["Medicine", "Science", "Business"] },
      { name: "Victoria University of Wellington", ranking: "#241 World", programs: ["Law", "Humanities", "Science"] }
    ],
    whyStudy: [
      { icon: Globe, title: "Beautiful Environment", desc: "Stunning landscapes and outdoor lifestyle" },
      { icon: Briefcase, title: "Work Rights", desc: "Work while studying and after graduation" },
      { icon: GraduationCap, title: "Quality Education", desc: "All universities ranked in top 500 globally" },
      { icon: Building, title: "Safe & Friendly", desc: "One of the safest countries for students" }
    ],
    requirements: ["Academic transcripts", "IELTS (6.0-6.5)", "Statement of Purpose", "Financial proof"],
    intakes: ["February (Main)", "July (Second intake)"]
  },
  canada: {
    name: "Canada",
    flag: "🇨🇦",
    heroImage: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1200&h=600&fit=crop",
    description: "Canada offers affordable education, welcoming immigration policies, and excellent quality of life.",
    stats: [
      { label: "Universities", value: "100+" },
      { label: "International Students", value: "800,000+" },
      { label: "PR Pathway", value: "Available" },
      { label: "Work Permit", value: "3 Years" }
    ],
    universities: [
      { name: "University of Toronto", ranking: "#21 World", programs: ["All disciplines"] },
      { name: "University of British Columbia", ranking: "#34 World", programs: ["Science", "Business", "Engineering"] },
      { name: "McGill University", ranking: "#30 World", programs: ["Medicine", "Law", "Arts", "Science"] }
    ],
    whyStudy: [
      { icon: Globe, title: "Immigration Pathways", desc: "Clear pathways to permanent residency after graduation" },
      { icon: DollarSign, title: "Affordable Fees", desc: "Lower tuition compared to US and UK" },
      { icon: Briefcase, title: "PGWP", desc: "Post-Graduation Work Permit up to 3 years" },
      { icon: Building, title: "Safe Cities", desc: "High quality of life and multicultural environment" }
    ],
    requirements: ["Academic transcripts", "IELTS (6.0-6.5)", "Statement of Purpose", "Financial proof"],
    intakes: ["September (Main)", "January", "May (Some programs)"]
  },
  usa: {
    name: "United States",
    flag: "🇺🇸",
    heroImage: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1200&h=600&fit=crop",
    description: "The USA is home to the world's top universities with unparalleled research opportunities and diverse programs.",
    stats: [
      { label: "Universities", value: "4,000+" },
      { label: "International Students", value: "1M+" },
      { label: "OPT Duration", value: "1-3 Years" },
      { label: "Nobel Laureates", value: "Most" }
    ],
    universities: [
      { name: "Massachusetts Institute of Technology", ranking: "#1 World", programs: ["Engineering", "Science", "Business"] },
      { name: "Stanford University", ranking: "#3 World", programs: ["All disciplines"] },
      { name: "Harvard University", ranking: "#4 World", programs: ["All disciplines"] }
    ],
    whyStudy: [
      { icon: GraduationCap, title: "Research Excellence", desc: "World's leading research institutions and facilities" },
      { icon: Building, title: "Flexible Curriculum", desc: "Liberal arts approach allows exploration of interests" },
      { icon: Briefcase, title: "OPT Opportunities", desc: "Work in your field for 1-3 years after graduation" },
      { icon: Globe, title: "Global Network", desc: "Alumni networks spanning every industry worldwide" }
    ],
    requirements: ["Academic transcripts", "TOEFL/IELTS", "SAT/GRE/GMAT", "Essays", "Recommendations"],
    intakes: ["Fall (August/September)", "Spring (January)"]
  },
  ireland: {
    name: "Ireland",
    flag: "🇮🇪",
    heroImage: "/dest-ireland.jpg",
    description: "Ireland offers English-speaking education in Europe with a friendly culture and growing tech industry.",
    stats: [
      { label: "Universities", value: "9" },
      { label: "International Students", value: "35,000+" },
      { label: "Stay Back", value: "2 Years" },
      { label: "Tech Companies", value: "1,000+" }
    ],
    universities: [
      { name: "Trinity College Dublin", ranking: "#81 World", programs: ["All disciplines"] },
      { name: "University College Dublin", ranking: "#126 World", programs: ["Business", "Engineering", "Arts"] },
      { name: "NUI Galway", ranking: "#270 World", programs: ["Science", "Arts", "Medicine"] }
    ],
    whyStudy: [
      { icon: Globe, title: "English Speaking", desc: "Study in English in the heart of Europe" },
      { icon: Briefcase, title: "Tech Hub", desc: "European headquarters of Google, Facebook, Apple, and more" },
      { icon: Building, title: "Stay Back Option", desc: "Work for 2 years after graduation" },
      { icon: GraduationCap, title: "Quality Education", desc: "Globally recognized Irish qualifications" }
    ],
    requirements: ["Academic transcripts", "IELTS (6.0-6.5)", "Statement of Purpose", "Financial proof"],
    intakes: ["September (Main)", "January (Some programs)"]
  },
  netherlands: {
    name: "Netherlands",
    flag: "🇳🇱",
    heroImage: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=600&fit=crop",
    description: "The Netherlands offers innovative education with many English-taught programs in the heart of Europe.",
    stats: [
      { label: "Universities", value: "55+" },
      { label: "English Programs", value: "2,100+" },
      { label: "Orientation Year", value: "1 Year" },
      { label: "EU Access", value: "Schengen" }
    ],
    universities: [
      { name: "TU Delft", ranking: "#47 World", programs: ["Engineering", "Architecture", "Design"] },
      { name: "University of Amsterdam", ranking: "#53 World", programs: ["Arts", "Science", "Business"] },
      { name: "Erasmus University Rotterdam", ranking: "#176 World", programs: ["Business", "Economics", "Medicine"] }
    ],
    whyStudy: [
      { icon: Globe, title: "English Programs", desc: "Over 2,100 programs taught entirely in English" },
      { icon: Building, title: "Central Europe", desc: "Easy access to other European countries" },
      { icon: Briefcase, title: "Orientation Year", desc: "Stay for 1 year after graduation to find work" },
      { icon: GraduationCap, title: "Innovative Education", desc: "Problem-based learning and practical approach" }
    ],
    requirements: ["Academic transcripts", "IELTS (6.0-6.5)", "Motivation letter", "CV"],
    intakes: ["September (Main)", "February (Some programs)"]
  }
};

export default function CountryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const country = countryData[slug];
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!country) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Country not found</h1>
          <Link href="/destinations">
            <Button>Back to Destinations</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="destinations" />

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={country.heroImage} alt={country.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background"></div>
        </div>

        <div className="container relative z-10 pt-16">
          <Link href="/destinations">
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Destinations
            </Button>
          </Link>
          
          <motion.div 
            className="max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-6xl mb-4">{country.flag}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Study in <span className="text-primary">{country.name}</span>
            </h1>
            <p className="text-lg text-white/90">{country.description}</p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {country.stats.map((stat: any, index: number) => (
              <motion.div 
                key={index}
                className="text-center p-6 bg-card rounded-xl shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Study Here */}
      <section className="py-16">
        <div className="container">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Why Study in {country.name}?
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {country.whyStudy.map((item: any, index: number) => (
              <motion.div 
                key={index}
                className="p-6 bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <item.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Universities */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Top Universities
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {country.universities.map((uni: any, index: number) => (
              <motion.div 
                key={index}
                className="p-6 bg-card rounded-xl shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <h3 className="font-semibold text-lg mb-2">{uni.name}</h3>
                <p className="text-primary text-sm mb-4">{uni.ranking}</p>
                <div className="flex flex-wrap gap-2">
                  {uni.programs.map((prog: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-muted rounded text-xs">{prog}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements & Intakes */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold mb-6">Entry Requirements</h3>
              <ul className="space-y-3">
                {country.requirements.map((req: string, index: number) => (
                  <li key={index} className="flex items-center gap-3">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold mb-6">Intake Periods</h3>
              <ul className="space-y-3">
                {country.intakes.map((intake: string, index: number) => (
                  <li key={index} className="flex items-center gap-3">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    <span>{intake}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-specta">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Study in {country.name}?</h2>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            Our education counselors are ready to help you with university selection, application, visa, and more.
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              Get Free Consultation
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />

      {/* Small Chatbot Button */}
      <motion.button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-primary hover:bg-primary/90 text-white rounded-full p-4 shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
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
