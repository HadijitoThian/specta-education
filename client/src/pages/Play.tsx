import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Sparkles, Globe, ArrowRight, Gamepad2, Star, Zap, Users, Trophy } from "lucide-react";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";

export default function Play() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage="play" />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 pt-24 pb-20 px-4 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-[10%] text-6xl opacity-10 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>🎮</div>
          <div className="absolute top-32 right-[15%] text-5xl opacity-10 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4s' }}>🎯</div>
          <div className="absolute bottom-16 left-[20%] text-5xl opacity-10 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3.5s' }}>🌟</div>
          <div className="absolute bottom-20 right-[10%] text-6xl opacity-10 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '4.5s' }}>🎓</div>
          <div className="absolute top-40 left-[50%] text-4xl opacity-10 animate-bounce" style={{ animationDelay: '2s', animationDuration: '3s' }}>✨</div>
          {/* Gradient orbs */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-5 py-2.5 mb-6">
              <Gamepad2 className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">Interactive & Fun</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
              SpecTa Play
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-4">
              Discover your study abroad personality and find your perfect destination through fun, interactive experiences!
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Users className="w-4 h-4 text-cyan-300" />
                <span className="text-white/80 text-sm">500+ students played</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span className="text-white/80 text-sm">AI-powered results</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Star className="w-4 h-4 text-pink-300" />
                <span className="text-white/80 text-sm">100% free</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Game Cards Section */}
      <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-20 pb-20">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Country Quiz */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div
              onClick={() => setLocation("/play/quiz")}
              className="group cursor-pointer bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
            >
              {/* Card header gradient */}
              <div className="relative bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 p-8 pb-12">
                {/* Floating emojis */}
                <div className="absolute top-4 right-4 text-3xl opacity-30 animate-bounce" style={{ animationDuration: '3s' }}>🌏</div>
                <div className="absolute bottom-4 left-4 text-2xl opacity-30 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>✈️</div>

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 mb-4">
                    <Globe className="w-3.5 h-3.5 text-white" />
                    <span className="text-white/90 text-xs font-medium">10 Questions</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Which Country<br />Fits You?</h2>
                  <p className="text-white/80 text-sm max-w-xs">
                    Answer 10 fun questions and our AI will match you with your perfect study abroad destination
                  </p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-6">
                {/* Country flags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {["🇦🇺", "🇬🇧", "🇺🇸", "🇨🇦", "🇨🇳", "🇲🇾", "🇸🇬", "🇮🇪", "🇳🇱", "🇳🇿"].map((flag, i) => (
                    <span key={i} className="text-lg bg-gray-50 rounded-lg w-9 h-9 flex items-center justify-center">
                      {flag}
                    </span>
                  ))}
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-3 h-3 text-blue-500" />
                    </div>
                    AI-powered country matching
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-3 h-3 text-emerald-500" />
                    </div>
                    Top 5 countries with match percentages
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Star className="w-3 h-3 text-purple-500" />
                    </div>
                    University recommendations included
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">~3 minutes</span>
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold group-hover:gap-3 transition-all">
                    Play Now
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Study Abroad Persona */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div
              onClick={() => setLocation("/play/persona")}
              className="group cursor-pointer bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
            >
              {/* Card header gradient */}
              <div className="relative bg-gradient-to-br from-fuchsia-500 via-purple-500 to-pink-500 p-8 pb-12">
                {/* Floating emojis */}
                <div className="absolute top-4 right-4 text-3xl opacity-30 animate-bounce" style={{ animationDuration: '3s' }}>🎭</div>
                <div className="absolute bottom-4 left-4 text-2xl opacity-30 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>✨</div>

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span className="text-white/90 text-xs font-medium">5 Quick Taps</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">My Study Abroad<br />Persona</h2>
                  <p className="text-white/80 text-sm max-w-xs">
                    Discover your unique study abroad personality and get a shareable character card!
                  </p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-6">
                {/* Example personas */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { emoji: "🧭", name: "Explorer" },
                    { emoji: "📚", name: "Scholar" },
                    { emoji: "🍜", name: "Foodie" },
                    { emoji: "🎮", name: "Coder" },
                    { emoji: "🌏", name: "Butterfly" },
                  ].map((p, i) => (
                    <span key={i} className="text-xs bg-purple-50 text-purple-700 rounded-full px-3 py-1.5 font-medium">
                      {p.emoji} {p.name}
                    </span>
                  ))}
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <div className="w-5 h-5 rounded-full bg-fuchsia-100 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-3 h-3 text-fuchsia-500" />
                    </div>
                    AI-generated unique persona
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <Star className="w-3 h-3 text-pink-500" />
                    </div>
                    Shareable card for Instagram Stories
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-3 h-3 text-violet-500" />
                    </div>
                    Spirit university & fun predictions
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">~30 seconds</span>
                  <div className="flex items-center gap-2 text-fuchsia-600 font-semibold group-hover:gap-3 transition-all">
                    Discover Now
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom promo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 text-center">
            <p className="text-gray-600 text-sm mb-1">
              <Star className="inline-block w-4 h-4 text-amber-500 mr-1" />
              <strong className="text-gray-800">Pro tip:</strong> Try both! Take the Country Quiz to find your ideal destination, then discover your Study Abroad Persona to share with friends.
            </p>
          </div>
        </motion.div>

        {/* More CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 text-sm mb-4">Ready to take the next step?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/book"
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-all text-sm"
            >
              Book Free Consultation
            </Link>
            <Link
              href="/destinations"
              className="bg-white text-gray-700 font-semibold px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-sm"
            >
              Explore Destinations
            </Link>
            <a
              href="https://wa.me/6281287878055?text=Hi%20SpecTa!%20I%20just%20played%20SpecTa%20Play%20and%20I'd%20like%20to%20know%20more!"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-600 transition-all text-sm"
            >
              Chat on WhatsApp
            </a>
          </div>
        </motion.div>
      </div>

      <Footer />

      {/* Chatbot */}
      <ChatBotButton onClick={() => setIsChatOpen(true)} />
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsChatOpen(false)}
          >
            <motion.div
              className="w-full max-w-lg h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-red-500 to-rose-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">SpecTa AI Assistant</h3>
                    <p className="text-xs text-white/80">Online • Ready to help</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <span className="text-xl">✕</span>
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
