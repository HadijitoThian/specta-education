import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "@/components/SEO";
import { GraduationCap, Search, X, Sparkles, ArrowRight, DollarSign, MapPin, Trophy, BookOpen, Briefcase, MessageCircle, ChevronDown, Loader2, BarChart3, Send, Star, TrendingUp, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// University logo URLs
const universityLogos: Record<string, string> = {
  "taylors": "https://logo.clearbit.com/taylors.edu.my",
  "nottingham-my": "https://logo.clearbit.com/nottingham.edu.my",
  "monash-my": "https://logo.clearbit.com/monash.edu.my",
  "ucsi": "https://logo.clearbit.com/ucsiuniversity.edu.my",
  "inti": "https://logo.clearbit.com/newinti.edu.my",
  "southampton-my": "https://logo.clearbit.com/southampton.ac.uk",
  "toa": "https://logo.clearbit.com/toa.edu.my",
  "mila": "https://logo.clearbit.com/mila.edu.my",
  "curtin-sg": "https://logo.clearbit.com/curtin.edu.au",
  "jcu-sg": "https://logo.clearbit.com/jcu.edu.au",
  "psb": "https://logo.clearbit.com/psb-academy.edu.sg",
  "raffles": "https://logo.clearbit.com/raffles-design-institute.com",
  "mdis": "https://logo.clearbit.com/mdis.edu.sg",
  "kaplan-sg": "https://logo.clearbit.com/kaplan.com",
  "melbourne": "https://logo.clearbit.com/unimelb.edu.au",
  "sydney": "https://logo.clearbit.com/sydney.edu.au",
  "unsw": "https://logo.clearbit.com/unsw.edu.au",
  "anu": "https://logo.clearbit.com/anu.edu.au",
  "monash-au": "https://logo.clearbit.com/monash.edu",
  "oxford": "https://logo.clearbit.com/ox.ac.uk",
  "cambridge": "https://logo.clearbit.com/cam.ac.uk",
  "imperial": "https://logo.clearbit.com/imperial.ac.uk",
  "ucl": "https://logo.clearbit.com/ucl.ac.uk",
  "edinburgh": "https://logo.clearbit.com/ed.ac.uk",
  "leeds": "https://logo.clearbit.com/leeds.ac.uk",
  "manchester": "https://logo.clearbit.com/manchester.ac.uk",
  "warwick": "https://logo.clearbit.com/warwick.ac.uk",
  "bristol": "https://logo.clearbit.com/bristol.ac.uk",
  "glasgow": "https://logo.clearbit.com/gla.ac.uk",
  "birmingham": "https://logo.clearbit.com/birmingham.ac.uk",
  "sheffield": "https://logo.clearbit.com/sheffield.ac.uk",
  "exeter": "https://logo.clearbit.com/exeter.ac.uk",
  "southampton-uk": "https://logo.clearbit.com/southampton.ac.uk",
  "newcastle": "https://logo.clearbit.com/ncl.ac.uk",
  "cardiff": "https://logo.clearbit.com/cardiff.ac.uk",
  "coventry": "https://logo.clearbit.com/coventry.ac.uk",
  "mit": "https://logo.clearbit.com/mit.edu",
  "stanford": "https://logo.clearbit.com/stanford.edu",
  "harvard": "https://logo.clearbit.com/harvard.edu",
  "nyu": "https://logo.clearbit.com/nyu.edu",
  "usc": "https://logo.clearbit.com/usc.edu",
  "bu": "https://logo.clearbit.com/bu.edu",
  "northeastern": "https://logo.clearbit.com/northeastern.edu",
  "uiuc": "https://logo.clearbit.com/illinois.edu",
  "purdue": "https://logo.clearbit.com/purdue.edu",
  "asu": "https://logo.clearbit.com/asu.edu",
  "ohio-state": "https://logo.clearbit.com/osu.edu",
  "uw": "https://logo.clearbit.com/washington.edu",
  "umich": "https://logo.clearbit.com/umich.edu",
  "columbia": "https://logo.clearbit.com/columbia.edu",
  "upenn": "https://logo.clearbit.com/upenn.edu",
  "ucb": "https://logo.clearbit.com/berkeley.edu",
  "ucla": "https://logo.clearbit.com/ucla.edu",
  "toronto": "https://logo.clearbit.com/utoronto.ca",
  "ubc": "https://logo.clearbit.com/ubc.ca",
  "mcgill": "https://logo.clearbit.com/mcgill.ca",
  "waterloo": "https://logo.clearbit.com/uwaterloo.ca",
  "alberta": "https://logo.clearbit.com/ualberta.ca",
  "ottawa": "https://logo.clearbit.com/uottawa.ca",
  "simon-fraser": "https://logo.clearbit.com/sfu.ca",
  "tsinghua": "https://logo.clearbit.com/tsinghua.edu.cn",
  "peking": "https://logo.clearbit.com/pku.edu.cn",
  "zhejiang": "https://logo.clearbit.com/zju.edu.cn",
  "fudan": "https://logo.clearbit.com/fudan.edu.cn",
  "sjtu": "https://logo.clearbit.com/sjtu.edu.cn",
  "wuhan": "https://logo.clearbit.com/whu.edu.cn",
  "nanjing": "https://logo.clearbit.com/nju.edu.cn",
  "beihang": "https://logo.clearbit.com/buaa.edu.cn",
  "xian-jiaotong": "https://logo.clearbit.com/xjtu.edu.cn",
  "tongji": "https://logo.clearbit.com/tongji.edu.cn",
  "rmit": "https://logo.clearbit.com/rmit.edu.au",
  "uts": "https://logo.clearbit.com/uts.edu.au",
  "macquarie": "https://logo.clearbit.com/mq.edu.au",
  "deakin": "https://logo.clearbit.com/deakin.edu.au",
  "griffith": "https://logo.clearbit.com/griffith.edu.au",
  "curtin-au": "https://logo.clearbit.com/curtin.edu.au",
  "wollongong": "https://logo.clearbit.com/uow.edu.au",
  "western-sydney": "https://logo.clearbit.com/westernsydney.edu.au",
  "latrobe": "https://logo.clearbit.com/latrobe.edu.au",
  "swinburne": "https://logo.clearbit.com/swinburne.edu.au",
  "qut": "https://logo.clearbit.com/qut.edu.au",
  "uq": "https://logo.clearbit.com/uq.edu.au",
  "adelaide": "https://logo.clearbit.com/adelaide.edu.au",
  "auckland": "https://logo.clearbit.com/auckland.ac.nz",
  "trinity": "https://logo.clearbit.com/tcd.ie",
  "tudelft": "https://logo.clearbit.com/tudelft.nl",
};

const getInitials = (name: string): string => {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
};

// All universities data - expanded with more accessible options
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
  
  // Australia (20 institutions - mix of top and popular with Asian/Indonesian students)
  { id: "melbourne", name: "University of Melbourne", country: "Australia", flag: "🇦🇺", ranking: "#13", programs: ["All disciplines", "Medicine", "Law", "Engineering"], tuition: "$30,000 - $50,000/year", type: "public" },
  { id: "sydney", name: "University of Sydney", country: "Australia", flag: "🇦🇺", ranking: "#18", programs: ["All disciplines", "Business", "Law", "Medicine"], tuition: "$30,000 - $50,000/year", type: "public" },
  { id: "unsw", name: "UNSW Sydney", country: "Australia", flag: "🇦🇺", ranking: "#19", programs: ["Engineering", "Business", "Law", "Medicine"], tuition: "$30,000 - $48,000/year", type: "public" },
  { id: "anu", name: "Australian National University", country: "Australia", flag: "🇦🇺", ranking: "#30", programs: ["Politics", "Science", "Engineering", "Arts"], tuition: "$28,000 - $45,000/year", type: "public" },
  { id: "monash-au", name: "Monash University", country: "Australia", flag: "🇦🇺", ranking: "#36", programs: ["Pharmacy", "Medicine", "Engineering", "Business"], tuition: "$28,000 - $48,000/year", type: "public" },
  { id: "uq", name: "University of Queensland", country: "Australia", flag: "🇦🇺", ranking: "#40", programs: ["Engineering", "Business", "Science", "Medicine"], tuition: "$28,000 - $45,000/year", type: "public" },
  { id: "adelaide", name: "University of Adelaide", country: "Australia", flag: "🇦🇺", ranking: "#82", programs: ["Engineering", "Medicine", "Wine & Food", "Science"], tuition: "$25,000 - $42,000/year", type: "public" },
  { id: "uts", name: "University of Technology Sydney", country: "Australia", flag: "🇦🇺", ranking: "#88", programs: ["IT", "Engineering", "Business", "Design"], tuition: "$25,000 - $40,000/year", type: "public" },
  { id: "macquarie", name: "Macquarie University", country: "Australia", flag: "🇦🇺", ranking: "#167", programs: ["Business", "Linguistics", "Psychology", "IT"], tuition: "$25,000 - $38,000/year", type: "public" },
  { id: "rmit", name: "RMIT University", country: "Australia", flag: "🇦🇺", ranking: "#123", programs: ["Design", "Engineering", "IT", "Business"], tuition: "$25,000 - $40,000/year", type: "public" },
  { id: "deakin", name: "Deakin University", country: "Australia", flag: "🇦🇺", ranking: "#233", programs: ["Business", "Health", "Engineering", "IT"], tuition: "$22,000 - $36,000/year", type: "public" },
  { id: "griffith", name: "Griffith University", country: "Australia", flag: "🇦🇺", ranking: "#243", programs: ["Business", "Health", "Engineering", "Arts"], tuition: "$22,000 - $35,000/year", type: "public" },
  { id: "curtin-au", name: "Curtin University", country: "Australia", flag: "🇦🇺", ranking: "#174", programs: ["Engineering", "Business", "Health", "Science"], tuition: "$22,000 - $38,000/year", type: "public" },
  { id: "wollongong", name: "University of Wollongong", country: "Australia", flag: "🇦🇺", ranking: "#162", programs: ["Engineering", "IT", "Business", "Science"], tuition: "$22,000 - $36,000/year", type: "public" },
  { id: "western-sydney", name: "Western Sydney University", country: "Australia", flag: "🇦🇺", ranking: "#461", programs: ["Business", "Health", "Engineering", "IT"], tuition: "$20,000 - $32,000/year", type: "public" },
  { id: "latrobe", name: "La Trobe University", country: "Australia", flag: "🇦🇺", ranking: "#217", programs: ["Health", "Business", "IT", "Science"], tuition: "$22,000 - $35,000/year", type: "public" },
  { id: "swinburne", name: "Swinburne University", country: "Australia", flag: "🇦🇺", ranking: "#285", programs: ["Design", "Engineering", "IT", "Business"], tuition: "$22,000 - $35,000/year", type: "public" },
  { id: "qut", name: "QUT (Queensland University of Technology)", country: "Australia", flag: "🇦🇺", ranking: "#189", programs: ["Business", "IT", "Engineering", "Creative Industries"], tuition: "$23,000 - $37,000/year", type: "public" },
  
  // UK (20 institutions - mix of top and popular with Asian/Indonesian students)
  { id: "oxford", name: "University of Oxford", country: "United Kingdom", flag: "🇬🇧", ranking: "#3", programs: ["All disciplines", "PPE", "Medicine", "Law"], tuition: "$30,000 - $55,000/year", type: "public" },
  { id: "cambridge", name: "University of Cambridge", country: "United Kingdom", flag: "🇬🇧", ranking: "#5", programs: ["All disciplines", "Engineering", "Natural Sciences"], tuition: "$30,000 - $55,000/year", type: "public" },
  { id: "imperial", name: "Imperial College London", country: "United Kingdom", flag: "🇬🇧", ranking: "#6", programs: ["Engineering", "Medicine", "Science", "Business"], tuition: "$30,000 - $50,000/year", type: "public" },
  { id: "ucl", name: "University College London", country: "United Kingdom", flag: "🇬🇧", ranking: "#9", programs: ["All disciplines", "Architecture", "Law", "Education"], tuition: "$25,000 - $45,000/year", type: "public" },
  { id: "edinburgh", name: "University of Edinburgh", country: "United Kingdom", flag: "🇬🇧", ranking: "#22", programs: ["Medicine", "AI", "Law", "Business"], tuition: "$22,000 - $40,000/year", type: "public" },
  { id: "manchester", name: "University of Manchester", country: "United Kingdom", flag: "🇬🇧", ranking: "#34", programs: ["Engineering", "Business", "Medicine", "Computer Science"], tuition: "$22,000 - $40,000/year", type: "public" },
  { id: "warwick", name: "University of Warwick", country: "United Kingdom", flag: "🇬🇧", ranking: "#69", programs: ["Business", "Economics", "Engineering", "Mathematics"], tuition: "$22,000 - $38,000/year", type: "public" },
  { id: "bristol", name: "University of Bristol", country: "United Kingdom", flag: "🇬🇧", ranking: "#54", programs: ["Engineering", "Law", "Medicine", "Arts"], tuition: "$22,000 - $38,000/year", type: "public" },
  { id: "glasgow", name: "University of Glasgow", country: "United Kingdom", flag: "🇬🇧", ranking: "#78", programs: ["Medicine", "Engineering", "Law", "Arts"], tuition: "$20,000 - $36,000/year", type: "public" },
  { id: "birmingham", name: "University of Birmingham", country: "United Kingdom", flag: "🇬🇧", ranking: "#80", programs: ["Business", "Engineering", "Medicine", "Law"], tuition: "$20,000 - $36,000/year", type: "public" },
  { id: "leeds", name: "University of Leeds", country: "United Kingdom", flag: "🇬🇧", ranking: "#75", programs: ["Business", "Engineering", "Medicine", "Arts"], tuition: "$20,000 - $36,000/year", type: "public" },
  { id: "sheffield", name: "University of Sheffield", country: "United Kingdom", flag: "🇬🇧", ranking: "#105", programs: ["Engineering", "Architecture", "Business", "Medicine"], tuition: "$20,000 - $35,000/year", type: "public" },
  { id: "exeter", name: "University of Exeter", country: "United Kingdom", flag: "🇬🇧", ranking: "#153", programs: ["Business", "Engineering", "Medicine", "Arts"], tuition: "$20,000 - $35,000/year", type: "public" },
  { id: "southampton-uk", name: "University of Southampton", country: "United Kingdom", flag: "🇬🇧", ranking: "#87", programs: ["Engineering", "Computer Science", "Medicine", "Business"], tuition: "$20,000 - $36,000/year", type: "public" },
  { id: "newcastle", name: "Newcastle University", country: "United Kingdom", flag: "🇬🇧", ranking: "#110", programs: ["Medicine", "Engineering", "Business", "Architecture"], tuition: "$20,000 - $35,000/year", type: "public" },
  { id: "cardiff", name: "Cardiff University", country: "United Kingdom", flag: "🇬🇧", ranking: "#154", programs: ["Medicine", "Engineering", "Business", "Architecture"], tuition: "$18,000 - $32,000/year", type: "public" },
  { id: "coventry", name: "Coventry University", country: "United Kingdom", flag: "🇬🇧", ranking: "#571", programs: ["Business", "Engineering", "Design", "Health"], tuition: "$15,000 - $25,000/year", type: "public" },
  
  // USA (20 institutions - mix of top and popular with Asian/Indonesian students)
  { id: "mit", name: "MIT", country: "USA", flag: "🇺🇸", ranking: "#1", programs: ["Engineering", "Computer Science", "Business", "Science"], tuition: "$55,000 - $60,000/year", type: "private" },
  { id: "stanford", name: "Stanford University", country: "USA", flag: "🇺🇸", ranking: "#6", programs: ["All disciplines", "Computer Science", "Business"], tuition: "$55,000 - $60,000/year", type: "private" },
  { id: "harvard", name: "Harvard University", country: "USA", flag: "🇺🇸", ranking: "#4", programs: ["All disciplines", "Business", "Law", "Medicine"], tuition: "$55,000 - $60,000/year", type: "private" },
  { id: "columbia", name: "Columbia University", country: "USA", flag: "🇺🇸", ranking: "#23", programs: ["Business", "Law", "Engineering", "Journalism"], tuition: "$55,000 - $65,000/year", type: "private" },
  { id: "upenn", name: "University of Pennsylvania", country: "USA", flag: "🇺🇸", ranking: "#11", programs: ["Business (Wharton)", "Engineering", "Medicine", "Law"], tuition: "$55,000 - $65,000/year", type: "private" },
  { id: "ucb", name: "UC Berkeley", country: "USA", flag: "🇺🇸", ranking: "#12", programs: ["Engineering", "Computer Science", "Business", "Science"], tuition: "$35,000 - $45,000/year", type: "public" },
  { id: "ucla", name: "UCLA", country: "USA", flag: "🇺🇸", ranking: "#28", programs: ["Film", "Engineering", "Business", "Medicine"], tuition: "$35,000 - $45,000/year", type: "public" },
  { id: "nyu", name: "New York University", country: "USA", flag: "🇺🇸", ranking: "#38", programs: ["Business", "Arts", "Law", "Film"], tuition: "$50,000 - $60,000/year", type: "private" },
  { id: "usc", name: "University of Southern California", country: "USA", flag: "🇺🇸", ranking: "#116", programs: ["Film", "Business", "Engineering", "Communication"], tuition: "$55,000 - $65,000/year", type: "private" },
  { id: "bu", name: "Boston University", country: "USA", flag: "🇺🇸", ranking: "#93", programs: ["Business", "Engineering", "Communication", "Health"], tuition: "$50,000 - $60,000/year", type: "private" },
  { id: "northeastern", name: "Northeastern University", country: "USA", flag: "🇺🇸", ranking: "#375", programs: ["Engineering", "Business", "Computer Science", "Health"], tuition: "$48,000 - $58,000/year", type: "private" },
  { id: "uiuc", name: "University of Illinois (UIUC)", country: "USA", flag: "🇺🇸", ranking: "#64", programs: ["Engineering", "Computer Science", "Business", "Agriculture"], tuition: "$30,000 - $40,000/year", type: "public" },
  { id: "purdue", name: "Purdue University", country: "USA", flag: "🇺🇸", ranking: "#99", programs: ["Engineering", "Computer Science", "Agriculture", "Business"], tuition: "$28,000 - $38,000/year", type: "public" },
  { id: "asu", name: "Arizona State University", country: "USA", flag: "🇺🇸", ranking: "#179", programs: ["Business", "Engineering", "Education", "Sustainability"], tuition: "$25,000 - $35,000/year", type: "public" },
  { id: "ohio-state", name: "Ohio State University", country: "USA", flag: "🇺🇸", ranking: "#140", programs: ["Business", "Engineering", "Medicine", "Agriculture"], tuition: "$28,000 - $38,000/year", type: "public" },
  { id: "uw", name: "University of Washington", country: "USA", flag: "🇺🇸", ranking: "#63", programs: ["Computer Science", "Engineering", "Medicine", "Business"], tuition: "$30,000 - $40,000/year", type: "public" },
  { id: "umich", name: "University of Michigan", country: "USA", flag: "🇺🇸", ranking: "#33", programs: ["Engineering", "Business", "Medicine", "Law"], tuition: "$40,000 - $55,000/year", type: "public" },
  
  // Canada (20 institutions)
  { id: "toronto", name: "University of Toronto", country: "Canada", flag: "🇨🇦", ranking: "#21", programs: ["All disciplines", "Engineering", "Business", "Medicine"], tuition: "$25,000 - $45,000/year", type: "public" },
  { id: "ubc", name: "University of British Columbia", country: "Canada", flag: "🇨🇦", ranking: "#34", programs: ["Engineering", "Business", "Science", "Arts"], tuition: "$25,000 - $40,000/year", type: "public" },
  { id: "mcgill", name: "McGill University", country: "Canada", flag: "🇨🇦", ranking: "#29", programs: ["Medicine", "Law", "Engineering", "Arts"], tuition: "$20,000 - $40,000/year", type: "public" },
  { id: "waterloo", name: "University of Waterloo", country: "Canada", flag: "🇨🇦", ranking: "#112", programs: ["Engineering", "Computer Science", "Mathematics", "Business"], tuition: "$25,000 - $40,000/year", type: "public" },
  { id: "alberta", name: "University of Alberta", country: "Canada", flag: "🇨🇦", ranking: "#96", programs: ["Engineering", "Science", "Business", "Medicine"], tuition: "$20,000 - $35,000/year", type: "public" },
  { id: "ottawa", name: "University of Ottawa", country: "Canada", flag: "🇨🇦", ranking: "#203", programs: ["Law", "Medicine", "Engineering", "Business"], tuition: "$18,000 - $32,000/year", type: "public" },
  { id: "simon-fraser", name: "Simon Fraser University", country: "Canada", flag: "🇨🇦", ranking: "#318", programs: ["Business", "Engineering", "Communication", "Computing"], tuition: "$18,000 - $30,000/year", type: "public" },
  
  // China (20 institutions - mix of top and popular with international students)
  { id: "tsinghua", name: "Tsinghua University", country: "China", flag: "🇨🇳", ranking: "#20", programs: ["Engineering", "Computer Science", "Business", "Architecture"], tuition: "$4,000 - $8,000/year", type: "public" },
  { id: "peking", name: "Peking University", country: "China", flag: "🇨🇳", ranking: "#17", programs: ["All disciplines", "Chinese Studies", "Business", "Law"], tuition: "$4,000 - $8,000/year", type: "public" },
  { id: "zhejiang", name: "Zhejiang University", country: "China", flag: "🇨🇳", ranking: "#36", programs: ["Engineering", "Computer Science", "Business", "Medicine"], tuition: "$3,500 - $7,000/year", type: "public" },
  { id: "fudan", name: "Fudan University", country: "China", flag: "🇨🇳", ranking: "#39", programs: ["Business", "Medicine", "Journalism", "International Relations"], tuition: "$3,500 - $7,000/year", type: "public" },
  { id: "sjtu", name: "Shanghai Jiao Tong University", country: "China", flag: "🇨🇳", ranking: "#45", programs: ["Engineering", "Business", "Medicine", "Computer Science"], tuition: "$3,500 - $7,000/year", type: "public" },
  { id: "wuhan", name: "Wuhan University", country: "China", flag: "🇨🇳", ranking: "#150", programs: ["Law", "Engineering", "Science", "Chinese Studies"], tuition: "$3,000 - $6,000/year", type: "public" },
  { id: "nanjing", name: "Nanjing University", country: "China", flag: "🇨🇳", ranking: "#126", programs: ["Science", "Engineering", "Chinese Studies", "Business"], tuition: "$3,000 - $6,000/year", type: "public" },
  { id: "beihang", name: "Beihang University", country: "China", flag: "🇨🇳", ranking: "#345", programs: ["Aerospace", "Engineering", "Computer Science", "Business"], tuition: "$3,000 - $6,000/year", type: "public" },
  { id: "xian-jiaotong", name: "Xi'an Jiaotong University", country: "China", flag: "🇨🇳", ranking: "#204", programs: ["Engineering", "Medicine", "Business", "Science"], tuition: "$3,000 - $6,000/year", type: "public" },
  { id: "tongji", name: "Tongji University", country: "China", flag: "🇨🇳", ranking: "#192", programs: ["Architecture", "Engineering", "Business", "Design"], tuition: "$3,000 - $6,000/year", type: "public" },
  
  // New Zealand
  { id: "auckland", name: "University of Auckland", country: "New Zealand", flag: "🇳🇿", ranking: "#65", programs: ["All disciplines", "Engineering", "Business", "Arts"], tuition: "$22,000 - $35,000/year", type: "public" },
  
  // Ireland
  { id: "trinity", name: "Trinity College Dublin", country: "Ireland", flag: "🇮🇪", ranking: "#81", programs: ["All disciplines", "Computer Science", "Business", "Law"], tuition: "$15,000 - $30,000/year", type: "public" },
  
  // Netherlands
  { id: "tudelft", name: "TU Delft", country: "Netherlands", flag: "🇳🇱", ranking: "#47", programs: ["Engineering", "Architecture", "Design", "Computer Science"], tuition: "$12,000 - $20,000/year", type: "public" },
];

const countries = Array.from(new Set(allUniversities.map(u => u.country)));

const POPULAR_PROGRAMS = [
  "Business & Management", "Computer Science & IT", "Engineering", "Medicine & Health",
  "Law", "Arts & Design", "Architecture", "Accounting & Finance", "Data Science & AI",
  "Psychology", "Hospitality & Tourism", "Media & Communication"
];

export default function Compare() {
  const [selectedUnis, setSelectedUnis] = useState<typeof allUniversities>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [showDropdown, setShowDropdown] = useState(false);
  const [aiComparison, setAiComparison] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

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

    try {
      const result = await compareMutation.mutateAsync({
        universities: selectedUnis.map(u => ({
          name: u.name,
          country: u.country,
          ranking: u.ranking,
          type: u.type,
          tuition: u.tuition,
          programs: u.programs
        })),
        selectedProgram: selectedProgram || undefined
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

  const handleLogoError = (id: string) => {
    setLogoErrors(prev => new Set(prev).add(id));
  };

  const renderUniLogo = (uni: typeof allUniversities[0], size: "sm" | "md" | "lg" = "md") => {
    const logoUrl = universityLogos[uni.id];
    const sizeClasses = size === "sm" ? "w-8 h-8" : size === "md" ? "w-12 h-12" : "w-16 h-16";
    const textSize = size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-lg";
    
    if (logoUrl && !logoErrors.has(uni.id)) {
      return (
        <div className={`${sizeClasses} rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden p-1 shrink-0`}>
          <img 
            src={logoUrl} 
            alt={uni.name} 
            className="w-full h-full object-contain"
            onError={() => handleLogoError(uni.id)}
          />
        </div>
      );
    }
    
    const colors = ["from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-purple-500 to-violet-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"];
    const colorIndex = uni.name.charCodeAt(0) % colors.length;
    
    return (
      <div className={`${sizeClasses} rounded-xl bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center shadow-sm shrink-0`}>
        <span className={`${textSize} font-bold text-white`}>{getInitials(uni.name)}</span>
      </div>
    );
  };

  const getRankNumber = (ranking: string): number | null => {
    const match = ranking.match(/#(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  return (
    <>
      <SEO
        title="Compare Study Destinations | SpecTa Education"
        description="Compare study abroad destinations side-by-side. Tuition costs, living expenses, visa requirements, and post-study work options."
        keywords="compare study abroad destinations, biaya kuliah luar negeri, tuition fees comparison, study abroad cost calculator, visa requirements"
        canonical="https://spectaeducation.com/compare"
        ogImage="/files/migrated/kMEinJVrDybnuqph.jpg"
      />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation currentPage="compare" />

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 opacity-95" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/5 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-10 right-20 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container relative z-10">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6 border border-white/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4" />
              AI-Powered University Comparison
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-bold mb-5 text-white leading-tight">
              Compare <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-pink-200">Universities</span>
            </h1>
            <p className="text-lg text-white/80 mb-4 max-w-2xl mx-auto">
              Select 2-3 universities and let our AI provide a detailed, personalized comparison to help you make the best decision for your future.
            </p>
            <div className="flex items-center justify-center gap-6 text-white/60 text-sm">
              <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /> Rankings</span>
              <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> Costs</span>
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Programs</span>
              <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> Careers</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 -mt-8 relative z-20">
        <div className="container max-w-6xl">
          
          {/* Selected Universities Cards */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                </div>
                Selected Universities
                <span className="text-sm font-normal text-gray-400 ml-1">({selectedUnis.length}/3)</span>
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-5">
              {selectedUnis.map((uni) => {
                const rankNum = getRankNumber(uni.ranking);
                return (
                  <motion.div
                    key={uni.id}
                    className="relative bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100 hover:shadow-xl transition-all"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                  >
                    <button
                      onClick={() => removeUniversity(uni.id)}
                      className="absolute top-3 right-3 p-1.5 hover:bg-red-50 rounded-full transition-colors group"
                    >
                      <X className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                    </button>
                    
                    <div className="flex items-start gap-3 mb-4">
                      {renderUniLogo(uni, "md")}
                      <div className="flex-1 min-w-0 pr-6">
                        <h3 className="font-bold text-sm leading-tight mb-1">{uni.name}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {uni.country}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      {rankNum ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          rankNum <= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          rankNum <= 100 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}>
                          <Trophy className="w-3 h-3" /> QS #{rankNum}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-semibold">
                          <Star className="w-3 h-3" /> {uni.ranking}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 capitalize">{uni.type}</span>
                    </div>
                    
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> {uni.tuition}
                    </p>
                  </motion.div>
                );
              })}
              
              {selectedUnis.length < 3 && (
                <motion.div
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all min-h-[180px]"
                  onClick={() => setShowDropdown(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold">Add University</p>
                  <p className="text-xs mt-1">Click to search & select</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Search & Filter Panel */}
          <AnimatePresence>
            {(showDropdown || selectedUnis.length === 0) && selectedUnis.length < 3 && (
              <motion.div
                className="mb-8 bg-white rounded-2xl p-6 shadow-lg shadow-gray-100/50 border border-gray-100"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by university name, country, or program..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                      autoFocus
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="appearance-none w-full sm:w-52 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 pr-10 transition-all"
                    >
                      <option value="All">All Countries</option>
                      {countries.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                  {filteredUniversities.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-10">No universities found matching your search.</p>
                  ) : (
                    filteredUniversities.map((uni) => (
                      <button
                        key={uni.id}
                        onClick={() => addUniversity(uni)}
                        className="w-full flex items-center gap-4 p-3.5 hover:bg-indigo-50 rounded-xl transition-colors text-left group"
                      >
                        {renderUniLogo(uni, "sm")}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700 transition-colors">{uni.name}</p>
                          <p className="text-xs text-gray-500">{uni.country} • QS {uni.ranking} • {uni.tuition}</p>
                        </div>
                        <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px]">
                          {uni.programs.slice(0, 2).map((p, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px]">{p}</span>
                          ))}
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Program Selection */}
          {selectedUnis.length >= 2 && (
            <motion.div
              className="mb-8 bg-white rounded-2xl p-6 shadow-lg shadow-gray-100/50 border border-gray-100"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                </div>
                Focus on a Specific Program / Major
                <span className="text-xs font-normal text-gray-400 ml-1">(Optional)</span>
              </h3>
              <p className="text-sm text-gray-500 mb-4">Select a program to get a more focused comparison for your field of interest.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedProgram("")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    !selectedProgram 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  General Comparison
                </button>
                {POPULAR_PROGRAMS.map(prog => (
                  <button
                    key={prog}
                    onClick={() => setSelectedProgram(prog)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedProgram === prog 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {prog}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Compare Button */}
          {selectedUnis.length >= 2 && (
            <motion.div 
              className="text-center mb-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                onClick={handleCompare}
                disabled={isComparing}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-7 text-lg rounded-2xl shadow-xl shadow-indigo-200/50 hover:shadow-2xl hover:shadow-indigo-300/50 transition-all"
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
                    {selectedProgram && <span className="ml-2 text-sm opacity-80">({selectedProgram})</span>}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-400 mt-3">
                Our AI will analyze rankings, costs, programs, career prospects, and more
              </p>
            </motion.div>
          )}

          {/* Quick Comparison Table */}
          {selectedUnis.length >= 2 && (
            <motion.div
              className="mb-10 bg-white rounded-2xl overflow-hidden shadow-lg shadow-gray-100/50 border border-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  Quick Comparison
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left p-5 text-sm font-medium text-gray-400 w-44">Criteria</th>
                      {selectedUnis.map(uni => (
                        <th key={uni.id} className="text-left p-5 min-w-[220px]">
                          <div className="flex items-center gap-3">
                            {renderUniLogo(uni, "sm")}
                            <div>
                              <span className="font-bold text-sm block">{uni.name}</span>
                              <span className="text-xs text-gray-400">{uni.country}</span>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50">
                      <td className="p-5 text-sm font-medium text-gray-600">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500" /> Ranking
                        </div>
                      </td>
                      {selectedUnis.map(uni => {
                        const rankNum = getRankNumber(uni.ranking);
                        return (
                          <td key={uni.id} className="p-5 text-sm">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
                              rankNum && rankNum <= 50 ? 'bg-amber-50 text-amber-700' :
                              rankNum && rankNum <= 100 ? 'bg-indigo-50 text-indigo-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              QS {uni.ranking}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-gray-50 bg-gray-50/30">
                      <td className="p-5 text-sm font-medium text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-500" /> Location
                        </div>
                      </td>
                      {selectedUnis.map(uni => (
                        <td key={uni.id} className="p-5 text-sm text-gray-700">{uni.flag} {uni.country}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="p-5 text-sm font-medium text-gray-600">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-500" /> Tuition
                        </div>
                      </td>
                      {selectedUnis.map(uni => (
                        <td key={uni.id} className="p-5 text-sm font-semibold text-emerald-700">{uni.tuition}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-50 bg-gray-50/30">
                      <td className="p-5 text-sm font-medium text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-purple-500" /> Type
                        </div>
                      </td>
                      {selectedUnis.map(uni => (
                        <td key={uni.id} className="p-5 text-sm capitalize text-gray-700">{uni.type}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-5 text-sm font-medium text-gray-600">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-500" /> Programs
                        </div>
                      </td>
                      {selectedUnis.map(uni => (
                        <td key={uni.id} className="p-5">
                          <div className="flex flex-wrap gap-1.5">
                            {uni.programs.map((p, i) => (
                              <span key={i} className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                selectedProgram && p.toLowerCase().includes(selectedProgram.toLowerCase().split(' ')[0])
                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>{p}</span>
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
                className="mb-10 bg-white rounded-2xl p-10 text-center shadow-lg shadow-gray-100/50 border border-indigo-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-col items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-2 text-gray-900">AI is Analyzing...</h3>
                    <p className="text-sm text-gray-500">
                      Comparing rankings, costs, programs, career prospects
                      {selectedProgram && <span className="text-indigo-600 font-medium"> for {selectedProgram}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map(i => (
                      <motion.div
                        key={i}
                        className="w-2.5 h-2.5 bg-indigo-500 rounded-full"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {aiComparison && !isComparing && (
              <motion.div
                className="mb-10 bg-white rounded-2xl overflow-hidden shadow-lg shadow-gray-100/50 border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">AI Comparison Report</h3>
                      <p className="text-sm text-gray-500">
                        Detailed analysis by SpecTa AI Education Consultant
                        {selectedProgram && <span className="text-indigo-600 font-medium"> &bull; Focus: {selectedProgram}</span>}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 md:p-8 prose prose-sm max-w-none">
                  {aiComparison.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return <h2 key={i} className="text-xl font-bold mt-8 mb-3 text-indigo-700 flex items-center gap-2">
                        <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                        {line.replace('## ', '')}
                      </h2>;
                    }
                    if (line.startsWith('### ')) {
                      return <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-gray-800 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                        {line.replace('### ', '')}
                      </h3>;
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={i} className="font-bold mt-4 mb-1 text-gray-800">{line.replace(/\*\*/g, '')}</p>;
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <li key={i} className="ml-4 text-gray-600 leading-relaxed">{line.replace(/^[-*] /, '')}</li>;
                    }
                    if (line.startsWith('|')) {
                      return <p key={i} className="font-mono text-xs bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">{line}</p>;
                    }
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} className="text-gray-600 leading-relaxed mb-2">{line}</p>;
                  })}
                </div>
                
                {/* CTA after comparison */}
                <div className="p-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-sm text-gray-900">Need more help deciding?</p>
                      <p className="text-xs text-gray-500">Our counselors can provide personalized guidance</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setLocation('/apply')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-pink-200 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        Quick Apply
                      </button>
                      <a 
                        href={`https://wa.me/62818218388?text=Hi,%20I%20just%20compared%20${encodeURIComponent(selectedUnis.map(u => u.name).join(', '))}%20on%20your%20website.%20Can%20you%20help%20me%20decide?`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="gap-2 rounded-xl">
                          <MessageCircle className="w-4 h-4" />
                          Chat on WhatsApp
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
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-100/50">
                  <GraduationCap className="w-12 h-12 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Start Comparing</h3>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                  Search and select 2-3 universities above to get a detailed AI-powered comparison covering rankings, costs, programs, and career prospects.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Rankings", "Tuition Fees", "Programs", "Career Prospects", "Scholarships", "Student Life"].map(tag => (
                    <span key={tag} className="px-4 py-2 bg-gray-100 rounded-full text-xs text-gray-500 font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
}
