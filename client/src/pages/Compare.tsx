import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Search, X, Sparkles, ArrowRight, DollarSign, MapPin, Trophy, BookOpen, Briefcase, Globe, MessageCircle, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";

// All universities data for selection
const allUniversities = [
  // Malaysia
  { id: "taylors", name: "Taylor's University", country: "Malaysia", flag: "🇲🇾", ranking: "#284", programs: ["Business", "Hospitality", "Design", "Medicine", "Engineering"], tuition: "$5,000 - $12,000/year", type: "private" },
  { id: "nottingham-my", name: "University of Nottingham Malaysia", country: "Malaysia", flag: "🇲🇾", ranking: "#97", programs: ["Business", "Engineering", "Pharmacy", "Computer Science"], tuition: "$8,000 - $15,000/year", type: "branch" },
  { id: "monash-my", name: "Monash University Malaysia", country: "Malaysia", flag: "🇲🇾", ranking: "#36", programs: ["Medicine", "Pharmacy", "Engineering", "Business"], tuition: "$8,000 - $16,000/year", type: "branch" },
  { id: "ucsi", name: "UCSI University", country: "Malaysia", flag: "🇲🇾", ranking: "#269", programs: ["Medicine", "Music", "Pharmacy", "Business"], tuition: "$4,000 - $12,000/year", type: "private" },
  { id: "inti", name: "INTI International University", country: "Malaysia", flag: "🇲🇾", ranking: "#509", programs: ["American Degree Program", "Business", "Engineering", "IT"], tuition: "$3,000 - $8,000/year", type: "private" },
  { id: "southampton-my", name: "University of Southampton Malaysia", country: "Malaysia", flag: "🇲🇾", ranking: "#87", programs: ["Engineering", "Computer Science", "Business"], tuition: "$7,000 - $14,000/year", type: "branch" },
  { id: "toa", name: "The One Academy", country: "Malaysia", flag: "🇲🇾", ranking: "#1 Creative School", programs: ["Animation", "VFX", "Graphic Design", "Fashion Design"], tuition: "$4,000 - $8,000/year", type: "private" },
  { id: "mila", name: "MILA University", country: "Malaysia", flag: "🇲🇾", ranking: "Asia #414", programs: ["Business", "Engineering", "AI & Robotics", "Biotechnology"], tuition: "$3,000 - $7,000/year", type: "private" },
  
  // Singapore
  { id: "curtin-sg", name: "Curtin Singapore", country: "Singapore", flag: "🇸🇬", ranking: "#174 (Curtin)", programs: ["Business", "Mass Communication", "Marketing"], tuition: "$15,000 - $22,000/year", type: "private" },
  { id: "jcu-sg", name: "JCU Singapore", country: "Singapore", flag: "🇸🇬", ranking: "#415 (JCU)", programs: ["Business", "IT", "Psychology", "Education"], tuition: "$15,000 - $25,000/year", type: "private" },
  { id: "psb", name: "PSB Academy", country: "Singapore", flag: "🇸🇬", ranking: "Partner Universities", programs: ["Engineering", "IT", "Business", "Life Sciences"], tuition: "$12,000 - $20,000/year", type: "private" },
  { id: "raffles", name: "Raffles Design Institute", country: "Singapore", flag: "🇸🇬", ranking: "Top Design School", programs: ["Fashion Design", "Interior Design", "Graphic Design"], tuition: "$15,000 - $25,000/year", type: "private" },
  { id: "mdis", name: "MDIS", country: "Singapore", flag: "🇸🇬", ranking: "Est. 1956", programs: ["Business", "Engineering", "Fashion", "Health Sciences"], tuition: "$10,000 - $18,000/year", type: "private" },
  { id: "kaplan-sg", name: "Kaplan Singapore", country: "Singapore", flag: "🇸🇬", ranking: "Partner Universities", programs: ["Business", "Accounting", "IT", "Law"], tuition: "$10,000 - $18,000/year", type: "private" },
  
  // Australia
  { id: "melbourne", name: "University of Melbourne", country: "Australia", flag: "🇦🇺", ranking: "#13", programs: ["All disciplines", "Medicine", "Law", "Engineering"], tuition: "$30,000 - $50,000/year", type: "public" },
  { id: "sydney", name: "University of Sydney", country: "Australia", flag: "🇦🇺", ranking: "#18", programs: ["All disciplines", "Business", "Law", "Medicine"], tuition: "$30,000 - $50,000/year", type: "public" },
  { id: "unsw", name: "UNSW Sydney", country: "Australia", flag: "🇦🇺", ranking: "#19", programs: ["Engineering", "Business", "Law", "Medicine"], tuition: "$30,000 - $48,000/year", type: "public" },
  { id: "anu", name: "Australian National University", country: "Australia", flag: "🇦🇺", ranking: "#30", programs: ["Politics", "Science", "Engineering", "Arts"], tuition: "$28,000 - $45,000/year", type: "public" },
  { id: "monash-au", name: "Monash University", country: "Australia", flag: "🇦🇺", ranking: "#36", programs: ["Pharmacy", "Medicine", "Engineering", "Business"], tuition: "$28,000 - $48,000/year", type: "public" },
  
  // UK
  { id: "oxford", name: "University of Oxford", country: "United Kingdom", flag: "🇬🇧", ranking: "#3", programs: ["All disciplines", "PPE", "Medicine", "Law"], tuition: "$30,000 - $55,000/year", type: "public" },
  { id: "cambridge", name: "University of Cambridge", country: "United Kingdom", flag: "🇬🇧", ranking: "#5", programs: ["All disciplines", "Engineering", "Natural Sciences"], tuition: "$30,000 - $55,000/year", type: "public" },
  { id: "imperial", name: "Imperial College London", country: "United Kingdom", flag: "🇬🇧", ranking: "#6", programs: ["Engineering", "Medicine", "Science", "Business"], tuition: "$30,000 - $50,000/year", type: "public" },
  { id: "ucl", name: "University College London", country: "United Kingdom", flag: "🇬🇧", ranking: "#9", programs: ["All disciplines", "Architecture", "Law", "Education"], tuition: "$25,000 - $45,000/year", type: "public" },
  { id: "edinburgh", name: "University of Edinburgh", country: "United Kingdom", flag: "🇬🇧", ranking: "#22", programs: ["Medicine", "AI", "Law", "Business"], tuition: "$22,000 - $40,000/year", type: "public" },
  
  // USA
  { id: "mit", name: "MIT", country: "USA", flag: "🇺🇸", ranking: "#1", programs: ["Engineering", "Computer Science", "Business", "Science"], tuition: "$55,000 - $60,000/year", type: "private" },
  { id: "stanford", name: "Stanford University", country: "USA", flag: "🇺🇸", ranking: "#6", programs: ["All disciplines", "Computer Science", "Business"], tuition: "$55,000 - $60,000/year", type: "private" },
  { id: "harvard", name: "Harvard University", country: "USA", flag: "🇺🇸", ranking: "#4", programs: ["All disciplines", "Business", "Law", "Medicine"], tuition: "$55,000 - $60,000/year", type: "private" },
  
  // Canada
  { id: "toronto", name: "University of Toronto", country: "Canada", flag: "🇨🇦", ranking: "#21", programs: ["All disciplines", "Engineering", "Business", "Medicine"], tuition: "$25,000 - $45,000/year", type: "public" },
  { id: "ubc", name: "University of British Columbia", country: "Canada", flag: "🇨🇦", ranking: "#34", programs: ["Engineering", "Business", "Science", "Arts"], tuition: "$25,000 - $40,000/year", type: "public" },
  { id: "mcgill", name: "McGill University", country: "Canada", flag: "🇨🇦", ranking: "#29", programs: ["Medicine", "Law", "Engineering", "Arts"], tuition: "$20,000 - $40,000/year", type: "public" },
  
  // China
  { id: "tsinghua", name: "Tsinghua University", country: "China", flag: "🇨🇳", ranking: "#20", programs: ["Engineering", "Computer Science", "Business", "Architecture"], tuition: "$4,000 - $8,000/year", type: "public" },
  { id: "peking", name: "Peking University", country: "China", flag: "🇨🇳", ranking: "#17", programs: ["All disciplines", "Chinese Studies", "Business", "Law"], tuition: "$4,000 - $8,000/year", type: "public" },
  
  // New Zealand
  { id: "auckland", name: "University of Auckland", country: "New Zealand", flag: "🇳🇿", ranking: "#65", programs: ["All disciplines", "Engineering", "Business", "Arts"], tuition: "$22,000 - $35,000/year", type: "public" },
  
  // Ireland
  { id: "trinity", name: "Trinity College Dublin", country: "Ireland", flag: "🇮🇪", ranking: "#81", programs: ["All disciplines", "Computer Science", "Business", "Law"], tuition: "$15,000 - $30,000/year", type: "public" },
  
  // Netherlands
  { id: "tudelft", name: "TU Delft", country: "Netherlands", flag: "🇳🇱", ranking: "#47", programs: ["Engineering", "Architecture", "Design", "Computer Science"], tuition: "$12,000 - $20,000/year", type: "public" },
];

const countries = Array.from(new Set(allUniversities.map(u => u.country)));

export default function Compare() {
  const [selectedUnis, setSelectedUnis] = useState<typeof allUniversities>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [showDropdown, setShowDropdown] = useState(false);
  const [aiComparison, setAiComparison] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const compareMutation = trpc.compare.analyzeUniversities.useMutation();

  const filteredUniversities = useMemo(() => {
    return allUniversities.filter(uni => {
      const matchesSearch = uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        uni.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        uni.programs.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCountry = selectedCountry === "All" || uni.country === selectedCountry;
      const notSelected = !selectedUnis.find(s => s.id === uni.id);
      return matchesSearch && matchesCountry && notSelected;
    });
  }, [searchQuery, selectedCountry, selectedUnis]);

  const addUniversity = (uni: typeof allUniversities[0]) => {
    if (selectedUnis.length < 3) {
      setSelectedUnis([...selectedUnis, uni]);
      setSearchQuery("");
      setShowDropdown(false);
    }
  };

  const removeUniversity = (id: string) => {
    setSelectedUnis(selectedUnis.filter(u => u.id !== id));
    setAiComparison(null);
  };

  const handleCompare = async () => {
    if (selectedUnis.length < 2) return;
    setIsComparing(true);
    setAiComparison(null);

    const uniNames = selectedUnis.map(u => `${u.name} (${u.country}, QS ${u.ranking})`).join(", ");
    const prompt = `Compare these universities for an Indonesian student considering studying abroad: ${uniNames}. 

Please provide a detailed comparison in the following format:

## University Comparison

### Overview
Brief overview of each university.

### Ranking & Reputation
Compare their global rankings, reputation, and strengths.

### Programs & Academics
Compare their academic offerings, teaching quality, and specializations.

### Tuition & Cost of Living
Compare total costs including tuition, accommodation, food, and transport.

### Student Life & Location
Compare campus life, city, safety, and cultural experience.

### Career Prospects
Compare post-graduation employment rates, work visa options, and career opportunities.

### Scholarships Available
List available scholarships for each university.

### Verdict
Provide a clear recommendation based on different student profiles (budget-conscious, career-focused, research-oriented, etc.)

Make the comparison detailed, honest, and helpful. Use tables where appropriate.`;

    try {
      const result = await compareMutation.mutateAsync({
        universities: selectedUnis.map(u => ({
          name: u.name,
          country: u.country,
          ranking: u.ranking,
          type: u.type,
          tuition: u.tuition,
          programs: u.programs
        }))
      });

      if (result.success && result.message) {
        setAiComparison(result.message);
      } else {
        setAiComparison("Sorry, I couldn't generate a comparison right now. Please try again.");
      }
    } catch (error) {
      setAiComparison("Sorry, there was an error generating the comparison. Please try again.");
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="compare" />

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Comparison
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Compare <span className="text-primary">Universities</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Select 2-3 universities and let our AI provide a detailed comparison to help you make the best decision for your future.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Selection Section */}
      <section className="py-12">
        <div className="container max-w-5xl">
          {/* Selected Universities */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Selected Universities ({selectedUnis.length}/3)
            </h2>
            
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {selectedUnis.map((uni, index) => (
                <motion.div
                  key={uni.id}
                  className="relative bg-card border border-primary/20 rounded-xl p-5 shadow-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <button
                    onClick={() => removeUniversity(uni.id)}
                    className="absolute top-3 right-3 p-1 hover:bg-destructive/10 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                  <div className="text-3xl mb-2">{uni.flag}</div>
                  <h3 className="font-semibold text-sm mb-1 pr-6">{uni.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{uni.country}</p>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    <Trophy className="w-3 h-3" />
                    QS {uni.ranking}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{uni.tuition}</p>
                </motion.div>
              ))}
              
              {selectedUnis.length < 3 && (
                <motion.div
                  className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-5 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary/40 hover:text-primary transition-colors"
                  onClick={() => setShowDropdown(true)}
                  whileHover={{ scale: 1.02 }}
                >
                  <Search className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Add University</p>
                  <p className="text-xs opacity-70">Click to search</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Search & Filter */}
          <AnimatePresence>
            {(showDropdown || selectedUnis.length === 0) && selectedUnis.length < 3 && (
              <motion.div
                className="mb-8 bg-card border border-border rounded-xl p-6 shadow-sm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search universities by name, country, or program..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      autoFocus
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="appearance-none w-full sm:w-48 px-4 py-3 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-10"
                    >
                      <option value="All">All Countries</option>
                      {countries.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filteredUniversities.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">No universities found matching your search.</p>
                  ) : (
                    filteredUniversities.map((uni) => (
                      <button
                        key={uni.id}
                        onClick={() => addUniversity(uni)}
                        className="w-full flex items-center gap-4 p-3 hover:bg-primary/5 rounded-lg transition-colors text-left"
                      >
                        <span className="text-2xl">{uni.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{uni.name}</p>
                          <p className="text-xs text-muted-foreground">{uni.country} • QS {uni.ranking}</p>
                        </div>
                        <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px]">
                          {uni.programs.slice(0, 2).map((p, i) => (
                            <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px]">{p}</span>
                          ))}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compare Button */}
          {selectedUnis.length >= 2 && (
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                onClick={handleCompare}
                disabled={isComparing}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-primary/20"
                size="lg"
              >
                {isComparing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AI is Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Compare with AI
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Our AI will analyze rankings, costs, programs, and career prospects
              </p>
            </motion.div>
          )}

          {/* Quick Comparison Table */}
          {selectedUnis.length >= 2 && (
            <motion.div
              className="mb-12 bg-card border border-border rounded-xl overflow-hidden shadow-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="p-6 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Quick Comparison
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground w-40">Criteria</th>
                      {selectedUnis.map(uni => (
                        <th key={uni.id} className="text-left p-4 text-sm font-semibold min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span>{uni.flag}</span>
                            <span className="truncate">{uni.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-4 text-sm font-medium flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" /> Ranking
                      </td>
                      {selectedUnis.map(uni => (
                        <td key={uni.id} className="p-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                            QS {uni.ranking}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border bg-muted/20">
                      <td className="p-4 text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" /> Country
                      </td>
                      {selectedUnis.map(uni => (
                        <td key={uni.id} className="p-4 text-sm">{uni.flag} {uni.country}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-4 text-sm font-medium flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" /> Tuition
                      </td>
                      {selectedUnis.map(uni => (
                        <td key={uni.id} className="p-4 text-sm font-medium">{uni.tuition}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-border bg-muted/20">
                      <td className="p-4 text-sm font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4 text-purple-500" /> Type
                      </td>
                      {selectedUnis.map(uni => (
                        <td key={uni.id} className="p-4 text-sm capitalize">{uni.type}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 text-sm font-medium flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" /> Programs
                      </td>
                      {selectedUnis.map(uni => (
                        <td key={uni.id} className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {uni.programs.map((p, i) => (
                              <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">{p}</span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* AI Comparison Result */}
          <AnimatePresence>
            {isComparing && (
              <motion.div
                className="mb-12 bg-card border border-primary/20 rounded-xl p-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">AI is Analyzing...</h3>
                    <p className="text-sm text-muted-foreground">
                      Comparing rankings, costs, programs, career prospects, and more
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-primary rounded-full"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {aiComparison && !isComparing && (
              <motion.div
                className="mb-12 bg-card border border-border rounded-xl overflow-hidden shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI Comparison Report
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Detailed analysis by SpecTa AI Education Consultant
                  </p>
                </div>
                <div className="p-6 md:p-8 prose prose-sm max-w-none dark:prose-invert">
                  {aiComparison.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return <h2 key={i} className="text-xl font-bold mt-6 mb-3 text-primary">{line.replace('## ', '')}</h2>;
                    }
                    if (line.startsWith('### ')) {
                      return <h3 key={i} className="text-lg font-semibold mt-5 mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {line.replace('### ', '')}
                      </h3>;
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={i} className="font-semibold mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <li key={i} className="ml-4 text-muted-foreground">{line.replace(/^[-*] /, '')}</li>;
                    }
                    if (line.startsWith('|')) {
                      return <p key={i} className="font-mono text-xs bg-muted/50 px-3 py-1 rounded">{line}</p>;
                    }
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} className="text-muted-foreground leading-relaxed mb-2">{line}</p>;
                  })}
                </div>
                
                {/* CTA after comparison */}
                <div className="p-6 border-t border-border bg-muted/30">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">Need more help deciding?</p>
                      <p className="text-xs text-muted-foreground">Our counselors can provide personalized guidance</p>
                    </div>
                    <div className="flex gap-3">
                      <a 
                        href={`https://wa.me/62819668278?text=Hi,%20I%20just%20compared%20${encodeURIComponent(selectedUnis.map(u => u.name).join(', '))}%20on%20your%20website.%20Can%20you%20help%20me%20decide?`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Chat on WhatsApp
                        </Button>
                      </a>
                      <a href="/contact">
                        <Button className="bg-primary hover:bg-primary/90 gap-2">
                          <Briefcase className="w-4 h-4" />
                          Free Consultation
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {selectedUnis.length === 0 && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Start Comparing</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Search and select 2-3 universities above to get a detailed AI-powered comparison covering rankings, costs, programs, and career prospects.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">Rankings</span>
                  <span className="px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">Tuition Fees</span>
                  <span className="px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">Programs</span>
                  <span className="px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">Career Prospects</span>
                  <span className="px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">Scholarships</span>
                  <span className="px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">Student Life</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
