import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { GraduationCap, Building, DollarSign, Briefcase, Globe, ChevronRight, MessageCircle, X, ArrowLeft, MapPin, Calendar, FileText, Heart, Users, Landmark, BookOpen, Home as HomeIcon, Award, Send } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import CostOfLivingCalculator from "@/components/CostOfLivingCalculator";
import { motion, AnimatePresence } from "framer-motion";

const countryData: Record<string, any> = {
  singapore: {
    name: "Singapore",
    flag: "🇸🇬",
    heroImage: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&h=600&fit=crop",
    description: "Singapore is Asia's premier education hub, offering world-class private institutions with internationally recognized degrees. Its strategic location, safety, and multicultural environment make it an ideal study destination for Indonesian students.",
    stats: [
      { label: "Private Institutions", value: "20+" },
      { label: "International Students", value: "75,000+" },
      { label: "Flight from Jakarta", value: "~2 Hours" },
      { label: "Graduate Employment", value: "90%+" }
    ],
    universities: [
      { name: "Curtin Singapore", ranking: "Curtin University #183 World (QS)", programs: ["Business", "Mass Communication", "Accounting", "Marketing", "Logistics & Supply Chain", "Management"], description: "Australian university campus in Singapore offering quality degrees at lower costs." },
      { name: "James Cook University (JCU) Singapore", ranking: "JCU #461 World (QS)", programs: ["Business", "IT", "Psychology", "Education", "Aquaculture", "Tourism & Hospitality", "Environmental Science"], description: "Australia's first university to establish a campus in Singapore, offering identical degrees." },
      { name: "PSB Academy", ranking: "Partner: Coventry, La Trobe, Newcastle", programs: ["Engineering", "Business", "IT", "Life Sciences", "Media & Communications", "Sport & Exercise Science"], description: "One of Singapore's largest private institutions, partnered with top Australian and UK universities." },
      { name: "Raffles Design Institute", ranking: "Top Design School in Asia", programs: ["Fashion Design", "Interior Design", "Graphic Design", "Product Design", "Jewellery Design", "Visual Communication"], description: "Premier design institution with industry-connected programs and creative studios." },
      { name: "Management Development Institute of Singapore (MDIS)", ranking: "Est. 1956 - Oldest PEI", programs: ["Business", "Engineering", "Fashion Design", "Health Sciences", "IT", "Media & Communications", "Psychology", "Tourism & Hospitality"], description: "Singapore's oldest not-for-profit professional institute with university partners worldwide." },
      { name: "Kaplan Singapore", ranking: "Partner: Murdoch, UCD, Northumbria", programs: ["Business", "Accounting & Finance", "Banking", "IT", "Communication", "Law", "Psychology", "Hospitality & Tourism"], description: "Part of Kaplan Inc., one of the world's largest education providers, offering diverse pathways." },
      { name: "Singapore Institute of Management (SIM)", ranking: "Partner: UOL, Birmingham, RMIT", programs: ["Business", "IT", "Social Sciences", "Arts", "Communication", "Economics", "Data Science"], description: "Singapore's largest private education institution with over 18,000 students and global university partners." },
      { name: "ERC Institute", ranking: "Partner: Greenwich, Wolverhampton", programs: ["Business", "Accounting & Finance", "Hospitality & Tourism", "Engineering"], description: "Offers affordable pathways to UK university degrees in the heart of Singapore." },
      { name: "Dimensions International College", ranking: "EduTrust Certified", programs: ["Business", "Hospitality & Tourism", "Early Childhood Education", "English Language"], description: "Focused on hospitality and business education with practical training opportunities." },
      { name: "Nanyang Institute of Management", ranking: "EduTrust Certified", programs: ["Business", "Hospitality & Tourism", "Logistics", "Early Childhood Education"], description: "Offers diploma and degree programs with strong industry connections in Singapore." }
    ],
    whyStudy: [
      { icon: MapPin, title: "Close to Indonesia", desc: "Just a 2-hour flight from Jakarta, making it easy to visit home" },
      { icon: Briefcase, title: "Career Opportunities", desc: "Strong job market with connections to multinational companies in Asia" },
      { icon: Globe, title: "Multicultural Hub", desc: "Diverse population with significant Chinese, Malay, and Indian communities" },
      { icon: DollarSign, title: "Affordable Private Education", desc: "Lower tuition than Australia/UK with same degree recognition" }
    ],
    costOfLiving: {
      tuition: "SGD 15,000 - 35,000/year",
      accommodation: "SGD 500 - 1,500/month",
      food: "SGD 300 - 500/month",
      transport: "SGD 80 - 120/month"
    },
    visaInfo: "Student's Pass required. Apply through ICA (Immigration & Checkpoints Authority). Processing time: 2-4 weeks.",
    scholarships: ["ASEAN Scholarships", "Institution-specific merit scholarships", "Early bird discounts", "Sibling discounts"],
    requirements: ["Academic transcripts (SMA/SMK)", "English proficiency (IELTS 5.5-6.5 or equivalent)", "Passport copy", "Passport-sized photos", "Statement of Purpose"],
    intakes: ["January", "April/May", "July/August", "October (varies by institution)"],
    faqs: [
      { q: "Do I need IELTS to study in Singapore?", a: "Most private institutions require IELTS 5.5-6.5 or equivalent. Some offer English placement tests as alternatives." },
      { q: "How much does it cost to study in Singapore?", a: "Tuition at private institutions ranges from SGD 15,000-35,000/year. Living costs are approximately SGD 1,000-2,000/month." },
      { q: "Can Indonesian students work while studying in Singapore?", a: "Student's Pass holders can work part-time during term (up to 16 hours/week) at approved institutions, and full-time during holidays." },
      { q: "How long does it take to get a Singapore Student's Pass?", a: "Processing typically takes 2-4 weeks after your institution submits the application to ICA." }
    ]
  },
  china: {
    name: "China",
    flag: "🇨🇳",
    heroImage: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=1200&h=600&fit=crop",
    description: "China offers world-class education at affordable prices, with rich cultural experiences and growing global influence. The Chinese Government Scholarship (CSC) makes it one of the most accessible destinations for international students.",
    stats: [
      { label: "Universities", value: "2,900+" },
      { label: "International Students", value: "500,000+" },
      { label: "CSC Scholarships", value: "Full Coverage" },
      { label: "English Programs", value: "500+" }
    ],
    universities: [
      { name: "Tsinghua University", ranking: "#12 World (QS 2025)", programs: ["Engineering", "Computer Science", "Business", "Architecture", "Science"], description: "China's top university, known as the 'MIT of China' with world-leading engineering programs." },
      { name: "Peking University", ranking: "#14 World (QS 2025)", programs: ["Humanities", "Science", "Law", "Medicine", "Economics", "International Relations"], description: "China's oldest national university with exceptional liberal arts and sciences programs." },
      { name: "Fudan University", ranking: "#31 World (QS 2025)", programs: ["Business", "Medicine", "Journalism", "Economics", "International Relations", "Computer Science"], description: "Shanghai's premier university with strong international programs and research output." },
      { name: "Zhejiang University", ranking: "#38 World (QS 2025)", programs: ["Engineering", "Computer Science", "Business", "Agriculture", "Medicine"], description: "One of China's oldest and most prestigious universities in beautiful Hangzhou." },
      { name: "Shanghai Jiao Tong University", ranking: "#45 World (QS 2025)", programs: ["Engineering", "Business", "Medicine", "Computer Science", "Naval Architecture"], description: "Leading research university with strong industry connections and innovation." },
      { name: "Nanjing University", ranking: "#73 World (QS 2025)", programs: ["Science", "Humanities", "Engineering", "Business", "Computer Science"], description: "One of China's oldest universities with strong science and humanities programs in historic Nanjing." },
      { name: "Tongji University", ranking: "#192 World (QS 2025)", programs: ["Architecture", "Engineering", "Urban Planning", "Business", "Design"], description: "Shanghai university famous for architecture and engineering, with strong German academic ties." },
      { name: "Wuhan University", ranking: "#194 World (QS 2025)", programs: ["Law", "Remote Sensing", "Philosophy", "Chemistry", "Biology"], description: "Known for its beautiful cherry blossom campus and strong humanities and science programs." },
      { name: "Huazhong University of Science and Technology", ranking: "#199 World (QS 2025)", programs: ["Engineering", "Medicine", "Computer Science", "Business", "Optics"], description: "Wuhan-based tech university known as 'Forest University' with strong engineering and medical programs." },
      { name: "Sun Yat-sen University", ranking: "#211 World (QS 2025)", programs: ["Business", "Medicine", "Engineering", "Social Sciences", "Marine Science"], description: "Guangzhou university with strong medical school and connections to Southeast Asia." },
      { name: "Beijing Normal University", ranking: "#249 World (QS 2025)", programs: ["Education", "Psychology", "Chinese Language", "Environmental Science", "Arts"], description: "China's top university for education and teacher training, popular with international students." },
      { name: "Xiamen University", ranking: "#392 World (QS 2025)", programs: ["Economics", "Chemistry", "Marine Science", "Business", "Law"], description: "Coastal university with stunning campus, strong economics programs, and campus in Malaysia." },
      { name: "Beijing Language and Culture University (BLCU)", ranking: "Top for Chinese Language", programs: ["Chinese Language", "International Economics", "Translation", "Computer Science"], description: "The premier institution for learning Chinese language, most popular with international students." },
      { name: "Shanghai University", ranking: "#436 World (QS 2025)", programs: ["Business", "Film", "Engineering", "Fine Arts", "Computer Science"], description: "Modern Shanghai university with affordable tuition and growing international reputation." },
      { name: "Jinan University", ranking: "#501-550 World (QS 2025)", programs: ["Business", "Journalism", "Medicine", "Economics", "Chinese Language"], description: "Guangzhou university known for overseas Chinese education, very popular with Southeast Asian students." },
      { name: "East China Normal University", ranking: "#451 World (QS 2025)", programs: ["Education", "Psychology", "Geography", "Software Engineering", "Business"], description: "Shanghai-based university with strong education programs and beautiful campus near the city center." },
      { name: "Nanjing University of Science and Technology", ranking: "#601-650 World (QS 2025)", programs: ["Engineering", "Computer Science", "Business", "Design", "Science"], description: "Strong engineering university in Nanjing with affordable tuition and CSC scholarship opportunities." },
      { name: "Guangzhou University", ranking: "#701-750 World (QS 2025)", programs: ["Business", "Engineering", "Education", "Tourism", "Computer Science"], description: "Affordable Guangzhou university with strong support for international students and proximity to Hong Kong." },
      { name: "Zhejiang Normal University", ranking: "#801-850 World (QS 2025)", programs: ["Education", "Chinese Language", "Business", "Computer Science", "Arts"], description: "Popular with Indonesian students for Chinese language programs and affordable living in Jinhua city." },
      { name: "Kunming University of Science and Technology", ranking: "#901-950 World (QS 2025)", programs: ["Engineering", "Mining", "Business", "Environmental Science", "Architecture"], description: "Yunnan province university with very affordable living costs and close cultural ties to Southeast Asia." }
    ],
    whyStudy: [
      { icon: DollarSign, title: "Affordable Education", desc: "Tuition as low as $2,000-5,000/year, much cheaper than Western countries" },
      { icon: GraduationCap, title: "CSC Scholarships", desc: "Chinese Government Scholarship covers tuition, accommodation, and living stipend" },
      { icon: Globe, title: "Cultural Experience", desc: "Immerse in one of the world's oldest and richest civilizations" },
      { icon: Briefcase, title: "Growing Economy", desc: "Career opportunities in the world's second-largest economy" }
    ],
    costOfLiving: {
      tuition: "CNY 15,000 - 40,000/year ($2,000 - $5,500)",
      accommodation: "CNY 800 - 2,000/month ($110 - $275)",
      food: "CNY 1,000 - 2,000/month ($140 - $275)",
      transport: "CNY 200 - 400/month ($28 - $55)"
    },
    visaInfo: "X1 Visa (study >180 days) or X2 Visa (study <180 days). Apply at Chinese Embassy. Processing: 1-2 weeks.",
    scholarships: ["Chinese Government Scholarship (CSC) - Full ride", "Confucius Institute Scholarship", "Provincial Government Scholarships", "University-specific scholarships", "Belt and Road Scholarship"],
    requirements: ["Academic transcripts", "HSK (for Chinese programs) or IELTS (for English programs)", "Health certificate", "No criminal record certificate", "Passport copy"],
    intakes: ["September (Main)", "March (Some programs)"],
    faqs: [
      { q: "Is it safe for Indonesian students to study in China?", a: "Yes, China is generally very safe with low crime rates. Universities have dedicated international student offices to assist with any issues." },
      { q: "Do I need to speak Chinese to study in China?", a: "No, many universities offer English-taught programs. However, learning basic Chinese is recommended for daily life." },
      { q: "How do I apply for the CSC Scholarship?", a: "Apply through the Chinese Embassy or directly to universities. Applications typically open in January-March for September intake." },
      { q: "What is the cost of living in China for students?", a: "China is very affordable — expect CNY 2,000-4,000/month ($275-$550) for accommodation, food, and transport combined." }
    ]
  },
  uk: {
    name: "United Kingdom",
    flag: "🇬🇧",
    heroImage: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=600&fit=crop",
    description: "The UK offers prestigious education with centuries of academic excellence and globally recognized qualifications. With a 1-year Master's program and the Graduate Route visa, it's one of the most efficient paths to a world-class degree.",
    stats: [
      { label: "Universities", value: "160+" },
      { label: "International Students", value: "600,000+" },
      { label: "Graduate Visa", value: "2 Years" },
      { label: "Master's Duration", value: "1 Year" }
    ],
    universities: [
      { name: "University of Oxford", ranking: "#3 World (QS 2025)", programs: ["All disciplines", "PPE", "Medicine", "Law", "Engineering"], description: "The world's oldest English-speaking university with unmatched academic prestige." },
      { name: "University of Cambridge", ranking: "#5 World (QS 2025)", programs: ["All disciplines", "Natural Sciences", "Engineering", "Mathematics"], description: "World-renowned for research excellence and the collegiate system." },
      { name: "Imperial College London", ranking: "#2 World (QS 2025)", programs: ["Science", "Engineering", "Medicine", "Business"], description: "London's leading STEM-focused university with cutting-edge research facilities." },
      { name: "University College London (UCL)", ranking: "#9 World (QS 2025)", programs: ["Architecture", "Education", "Law", "Medicine", "Engineering", "Arts"], description: "London's largest university with a global outlook and diverse student body." },
      { name: "University of Edinburgh", ranking: "#27 World (QS 2025)", programs: ["Medicine", "AI & Data Science", "Law", "Business", "Veterinary"], description: "Scotland's premier university in a historic and vibrant city." },
      { name: "University of Manchester", ranking: "#34 World (QS 2025)", programs: ["Business", "Engineering", "Computer Science", "Medicine", "Arts"], description: "Russell Group university known for research impact and graduate employability." },
      { name: "King's College London", ranking: "#40 World (QS 2025)", programs: ["Law", "Medicine", "Humanities", "Social Sciences", "Nursing"], description: "Central London university with strong health sciences and humanities programs." },
      { name: "University of Warwick", ranking: "#69 World (QS 2025)", programs: ["Business", "Economics", "Engineering", "Mathematics", "Theatre"], description: "Known for its business school and strong industry connections." },
      { name: "University of Leeds", ranking: "#75 World (QS 2025)", programs: ["Business", "Engineering", "Medicine", "Arts", "Communication"], description: "Russell Group university with a large international student community and vibrant city life." },
      { name: "University of Birmingham", ranking: "#84 World (QS 2025)", programs: ["Business", "Engineering", "Computer Science", "Medicine", "Law"], description: "Red brick university with strong employability and a welcoming international community." },
      { name: "University of Nottingham", ranking: "#100 World (QS 2025)", programs: ["Business", "Engineering", "Pharmacy", "Law", "Education"], description: "Popular with Asian students, with campuses in Malaysia and China as well." },
      { name: "University of Sheffield", ranking: "#105 World (QS 2025)", programs: ["Engineering", "Architecture", "Business", "Journalism", "Computer Science"], description: "Known for engineering excellence and one of the most affordable student cities in the UK." },
      { name: "University of Exeter", ranking: "#153 World (QS 2025)", programs: ["Business", "Engineering", "Biosciences", "Law", "Psychology"], description: "Russell Group university with a beautiful campus and strong student satisfaction." },
      { name: "Newcastle University", ranking: "#110 World (QS 2025)", programs: ["Business", "Engineering", "Architecture", "Medicine", "Marine Science"], description: "Friendly city with affordable living costs and a strong international student support system." },
      { name: "University of Liverpool", ranking: "#176 World (QS 2025)", programs: ["Business", "Engineering", "Architecture", "Medicine", "Computer Science"], description: "Russell Group university with a large Indonesian student community and vibrant culture." },
      { name: "Coventry University", ranking: "#571 World (QS 2025)", programs: ["Business", "Engineering", "Design", "Health Sciences", "Computing"], description: "Modern university known for practical, career-focused education and affordable tuition." },
      { name: "University of the West of England (UWE Bristol)", ranking: "#601-650 World (QS 2025)", programs: ["Business", "Engineering", "Architecture", "Health Sciences", "Creative Industries"], description: "Practice-oriented university in Bristol with strong industry partnerships." },
      { name: "De Montfort University (DMU)", ranking: "#801-850 World (QS 2025)", programs: ["Business", "Engineering", "Art & Design", "Computing", "Law"], description: "Leicester-based university popular with international students, known for creative programs." },
      { name: "University of Hertfordshire", ranking: "#701-750 World (QS 2025)", programs: ["Business", "Engineering", "Computer Science", "Pharmacy", "Animation"], description: "Close to London with lower living costs, popular with Indonesian and Asian students." },
      { name: "University of Greenwich", ranking: "#801-850 World (QS 2025)", programs: ["Business", "Engineering", "Architecture", "Computing", "Education"], description: "London university with affordable fees and a beautiful historic campus." }
    ],
    whyStudy: [
      { icon: GraduationCap, title: "Prestigious Degrees", desc: "Globally recognized qualifications from historic institutions" },
      { icon: Building, title: "1-Year Masters", desc: "Complete your postgraduate degree in just one year, saving time and money" },
      { icon: Briefcase, title: "Graduate Route Visa", desc: "Stay and work for 2 years after graduation (3 years for PhD)" },
      { icon: Globe, title: "Cultural Diversity", desc: "Multicultural environment with students from 150+ countries" }
    ],
    costOfLiving: {
      tuition: "£12,000 - £38,000/year",
      accommodation: "£500 - £1,200/month",
      food: "£200 - £400/month",
      transport: "£50 - £150/month"
    },
    visaInfo: "Student Visa (Tier 4). Apply online with CAS from university. Processing: 3-4 weeks.",
    scholarships: ["Chevening Scholarship (fully funded)", "Commonwealth Scholarship", "GREAT Scholarships", "University-specific scholarships", "Indonesia Endowment Fund (LPDP)"],
    requirements: ["Academic transcripts", "IELTS (6.0-7.0 depending on program)", "Personal statement", "References (2)", "Passport copy"],
    intakes: ["September (Main)", "January (Some programs)"],
    faqs: [
      { q: "How much does it cost to study in the UK?", a: "Tuition ranges from £12,000-£38,000/year depending on the program. Living costs are approximately £12,000-£15,000/year." },
      { q: "Can I work while studying in the UK?", a: "Yes, international students can work up to 20 hours/week during term time and full-time during holidays." },
      { q: "What is the Graduate Route visa?", a: "After completing your degree, you can stay in the UK for 2 years (3 years for PhD) to work or look for work without a sponsor." },
      { q: "Do I need IELTS to study in the UK?", a: "Most UK universities require IELTS 6.0-7.0. Some accept alternative tests like TOEFL or PTE Academic." }
    ]
  },
  australia: {
    name: "Australia",
    flag: "🇦🇺",
    heroImage: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=1200&h=600&fit=crop",
    description: "Australia offers world-class education, beautiful landscapes, and excellent post-study work opportunities. With 7 of the world's top 100 universities and a welcoming multicultural society, it's a top choice for international students.",
    stats: [
      { label: "Universities", value: "43" },
      { label: "International Students", value: "750,000+" },
      { label: "Post-Study Work", value: "2-4 Years" },
      { label: "Quality of Life", value: "Top 10" }
    ],
    universities: [
      { name: "University of Melbourne", ranking: "#13 World (QS 2025)", programs: ["Arts", "Science", "Business", "Engineering", "Medicine", "Law", "Education"], description: "Australia's #1 university with the distinctive Melbourne Model of broad-based education." },
      { name: "University of New South Wales (UNSW)", ranking: "#19 World (QS 2025)", programs: ["Engineering", "Business", "Law", "Medicine", "Art & Design", "Science"], description: "Sydney-based powerhouse known for engineering, technology, and business excellence." },
      { name: "University of Sydney", ranking: "#18 World (QS 2025)", programs: ["All disciplines", "Architecture", "Veterinary", "Music", "Pharmacy"], description: "Australia's first university with a stunning campus and comprehensive programs." },
      { name: "Australian National University (ANU)", ranking: "#30 World (QS 2025)", programs: ["Political Science", "International Relations", "Science", "Engineering", "Law"], description: "Located in Canberra, Australia's capital, with strong research focus and government connections." },
      { name: "Monash University", ranking: "#37 World (QS 2025)", programs: ["Business", "Engineering", "Medicine", "IT", "Pharmacy", "Education"], description: "Australia's largest university with campuses in Malaysia and South Africa." },
      { name: "University of Queensland (UQ)", ranking: "#40 World (QS 2025)", programs: ["Business", "Engineering", "Science", "Agriculture", "Veterinary", "Tourism"], description: "Brisbane-based university known for research excellence and beautiful campus." },
      { name: "University of Western Australia (UWA)", ranking: "#77 World (QS 2025)", programs: ["Engineering", "Mining", "Agriculture", "Marine Science", "Business"], description: "Perth-based Group of Eight university with strong mining and resources programs." },
      { name: "University of Adelaide", ranking: "#89 World (QS 2025)", programs: ["Wine & Food Science", "Engineering", "Health Sciences", "Arts", "Business"], description: "South Australia's premier university with unique programs in wine science and agriculture." },
      { name: "University of Technology Sydney (UTS)", ranking: "#88 World (QS 2025)", programs: ["Business", "IT", "Engineering", "Design", "Communication", "Nursing"], description: "Modern Sydney university with industry-focused programs and strong employability outcomes." },
      { name: "Macquarie University", ranking: "#167 World (QS 2025)", programs: ["Business", "Accounting", "Linguistics", "IT", "Media", "Psychology"], description: "Located in Sydney's tech hub with strong accounting and business programs popular with Asian students." },
      { name: "RMIT University", ranking: "#140 World (QS 2025)", programs: ["Business", "Design", "Engineering", "IT", "Architecture", "Fashion"], description: "Melbourne-based university known for design, technology, and enterprise programs with a Vietnam campus." },
      { name: "Deakin University", ranking: "#233 World (QS 2025)", programs: ["Business", "IT", "Engineering", "Nursing", "Education", "Sport Science"], description: "Flexible study options with campuses in Melbourne and Geelong, popular with international students." },
      { name: "Griffith University", ranking: "#243 World (QS 2025)", programs: ["Business", "Tourism & Hospitality", "Engineering", "Health", "Criminology", "Music"], description: "Gold Coast and Brisbane campuses with strong tourism and hospitality programs." },
      { name: "La Trobe University", ranking: "#217 World (QS 2025)", programs: ["Business", "Health Sciences", "IT", "Engineering", "Agriculture", "Biosciences"], description: "Melbourne university with affordable fees and strong health sciences programs." },
      { name: "Curtin University", ranking: "#183 World (QS 2025)", programs: ["Business", "Engineering", "Mining", "IT", "Health Sciences", "Architecture"], description: "Perth-based with campuses in Singapore and Malaysia, popular with Indonesian students." },
      { name: "Swinburne University of Technology", ranking: "#285 World (QS 2025)", programs: ["Business", "IT", "Engineering", "Design", "Film & Animation", "Science"], description: "Melbourne university with strong industry partnerships and practical learning approach." },
      { name: "University of Wollongong", ranking: "#162 World (QS 2025)", programs: ["Engineering", "IT", "Business", "Law", "Education", "Science"], description: "Coastal city south of Sydney with affordable living and strong engineering programs." },
      { name: "Western Sydney University", ranking: "#461 World (QS 2025)", programs: ["Business", "IT", "Engineering", "Health Sciences", "Education", "Law"], description: "Affordable Sydney university with strong community focus and growing international reputation." },
      { name: "University of Tasmania", ranking: "#293 World (QS 2025)", programs: ["Marine Science", "Business", "IT", "Engineering", "Agriculture", "Health"], description: "Affordable living in beautiful Tasmania with unique marine and Antarctic research programs." },
      { name: "Victoria University", ranking: "#601-650 World (QS 2025)", programs: ["Business", "IT", "Engineering", "Sport Science", "Education", "Health"], description: "Melbourne university with block model learning and affordable tuition for international students." }
    ],
    whyStudy: [
      { icon: Briefcase, title: "Post-Study Work Visa", desc: "Work 2-4 years after graduation depending on qualification level" },
      { icon: Globe, title: "Multicultural Society", desc: "Welcoming environment with large Indonesian community" },
      { icon: GraduationCap, title: "Research Excellence", desc: "7 of the world's top 100 universities (Group of Eight)" },
      { icon: Building, title: "High Quality of Life", desc: "Safe cities, excellent healthcare, and outdoor lifestyle" }
    ],
    costOfLiving: {
      tuition: "AUD 20,000 - 50,000/year",
      accommodation: "AUD 800 - 2,000/month",
      food: "AUD 400 - 700/month",
      transport: "AUD 50 - 150/month"
    },
    visaInfo: "Student Visa (Subclass 500). Apply online through ImmiAccount. Processing: 4-8 weeks.",
    scholarships: ["Australia Awards Scholarship (fully funded)", "Destination Australia", "Research Training Program", "University-specific scholarships", "LPDP (Indonesian Government)"],
    requirements: ["Academic transcripts", "IELTS (6.0-7.0)", "Statement of Purpose", "Financial proof (GTE)", "Health insurance (OSHC)"],
    intakes: ["February (Main)", "July (Second intake)"],
    faqs: [
      { q: "Can I get permanent residency after studying in Australia?", a: "Yes, Australia offers post-study work visas (2-4 years) and pathways to permanent residency through skilled migration." },
      { q: "How much does it cost to study in Australia?", a: "Tuition ranges from AUD 20,000-45,000/year. Living costs are approximately AUD 21,000-25,000/year." },
      { q: "Is IELTS required for Australian universities?", a: "Most universities require IELTS 6.0-7.0. Some accept PTE Academic, TOEFL, or Cambridge English as alternatives." },
      { q: "Can I work while studying in Australia?", a: "Yes, student visa holders can work up to 48 hours per fortnight during term and unlimited hours during holidays." }
    ]
  },
  "new-zealand": {
    name: "New Zealand",
    flag: "🇳🇿",
    heroImage: "https://images.unsplash.com/photo-1469521669194-babb45599def?w=1200&h=600&fit=crop",
    description: "New Zealand offers quality education in a safe, beautiful environment with excellent post-study work opportunities. All 8 universities are ranked in the world's top 500, and the country is known for its welcoming culture.",
    stats: [
      { label: "Universities", value: "8" },
      { label: "International Students", value: "100,000+" },
      { label: "Post-Study Work", value: "1-3 Years" },
      { label: "Safety Ranking", value: "Top 5" }
    ],
    universities: [
      { name: "University of Auckland", ranking: "#68 World (QS 2025)", programs: ["All disciplines", "Engineering", "Business", "Medicine", "Arts"], description: "New Zealand's highest-ranked university with comprehensive programs in Auckland." },
      { name: "University of Otago", ranking: "#206 World (QS 2025)", programs: ["Medicine", "Dentistry", "Science", "Business", "Health Sciences"], description: "New Zealand's oldest university, known for its medical school in Dunedin." },
      { name: "Victoria University of Wellington", ranking: "#241 World (QS 2025)", programs: ["Law", "Humanities", "Science", "Architecture", "Public Policy"], description: "Located in the capital city with strong connections to government and policy." },
      { name: "University of Canterbury", ranking: "#256 World (QS 2025)", programs: ["Engineering", "Science", "Business", "Education", "Forestry"], description: "Christchurch-based university known for engineering and Antarctic research." },
      { name: "Massey University", ranking: "#239 World (QS 2025)", programs: ["Agriculture", "Veterinary", "Aviation", "Creative Arts", "Business"], description: "New Zealand's only university offering veterinary science and aviation programs." },
      { name: "University of Waikato", ranking: "#235 World (QS 2025)", programs: ["Business", "Computing", "Education", "Law", "Maori Studies"], description: "Hamilton-based university with strong business and computing programs." }
    ],
    whyStudy: [
      { icon: Globe, title: "Beautiful Environment", desc: "Stunning landscapes and outdoor lifestyle in a safe country" },
      { icon: Briefcase, title: "Work Rights", desc: "Work 20 hours/week during study and full-time during breaks" },
      { icon: GraduationCap, title: "Quality Education", desc: "All 8 universities ranked in the world's top 500" },
      { icon: Building, title: "Safe & Friendly", desc: "One of the safest and most peaceful countries in the world" }
    ],
    costOfLiving: {
      tuition: "NZD 22,000 - 40,000/year",
      accommodation: "NZD 800 - 1,500/month",
      food: "NZD 300 - 500/month",
      transport: "NZD 50 - 150/month"
    },
    visaInfo: "Student Visa required. Apply online through Immigration New Zealand. Processing: 4-6 weeks.",
    scholarships: ["New Zealand Scholarships", "University-specific scholarships", "New Zealand Excellence Awards", "ASEAN Scholarships"],
    requirements: ["Academic transcripts", "IELTS (6.0-6.5)", "Statement of Purpose", "Financial proof", "Health & character certificates"],
    intakes: ["February (Main)", "July (Second intake)"],
    faqs: [
      { q: "Is New Zealand safe for international students?", a: "Yes, New Zealand is consistently ranked as one of the safest and most peaceful countries in the world." },
      { q: "How much does it cost to study in New Zealand?", a: "Tuition ranges from NZD 22,000-40,000/year. Living costs are approximately NZD 1,200-2,000/month." },
      { q: "Can I work after graduating in New Zealand?", a: "Yes, graduates can apply for a Post-Study Work Visa for 1-3 years depending on qualification level and location." },
      { q: "Can I work while studying in New Zealand?", a: "Yes, student visa holders can work up to 20 hours/week during term and full-time during scheduled breaks." }
    ]
  },
  canada: {
    name: "Canada",
    flag: "🇨🇦",
    heroImage: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1200&h=600&fit=crop",
    description: "Canada offers affordable education, welcoming immigration policies, and excellent quality of life. With clear pathways to permanent residency and a 3-year post-graduation work permit, it's one of the most popular destinations for international students.",
    stats: [
      { label: "Universities", value: "100+" },
      { label: "International Students", value: "800,000+" },
      { label: "PR Pathway", value: "Available" },
      { label: "Work Permit", value: "3 Years" }
    ],
    universities: [
      { name: "University of Toronto", ranking: "#21 World (QS 2025)", programs: ["All disciplines", "Engineering", "Business", "Medicine", "AI"], description: "Canada's top university with three campuses and world-leading research." },
      { name: "University of British Columbia (UBC)", ranking: "#34 World (QS 2025)", programs: ["Science", "Business", "Engineering", "Forestry", "Arts"], description: "Vancouver-based university with a stunning campus and strong research programs." },
      { name: "McGill University", ranking: "#29 World (QS 2025)", programs: ["Medicine", "Law", "Arts", "Science", "Engineering", "Music"], description: "Montreal's premier English-language university with a global reputation." },
      { name: "University of Alberta", ranking: "#96 World (QS 2025)", programs: ["Engineering", "Science", "Business", "Education", "Medicine"], description: "Edmonton-based university known for petroleum engineering and AI research." },
      { name: "University of Waterloo", ranking: "#115 World (QS 2025)", programs: ["Computer Science", "Engineering", "Mathematics", "Business", "Pharmacy"], description: "Canada's #1 co-op university with the largest co-operative education program in the world." },
      { name: "University of Montreal", ranking: "#111 World (QS 2025)", programs: ["AI & Machine Learning", "Medicine", "Law", "Science", "Arts"], description: "French-language university that is a global leader in AI research (Mila Institute)." },
      { name: "McMaster University", ranking: "#152 World (QS 2025)", programs: ["Health Sciences", "Engineering", "Business", "Science", "Humanities"], description: "Known for its innovative problem-based learning approach in health sciences." },
      { name: "University of Ottawa", ranking: "#203 World (QS 2025)", programs: ["Business", "Engineering", "Law", "Health Sciences", "Social Sciences"], description: "Bilingual university in Canada's capital with strong government and policy connections." },
      { name: "Simon Fraser University (SFU)", ranking: "#318 World (QS 2025)", programs: ["Business", "Computing", "Engineering", "Communication", "Health Sciences"], description: "Vancouver-area university with strong co-op programs and beautiful mountain campus." },
      { name: "York University", ranking: "#353 World (QS 2025)", programs: ["Business", "Law", "Arts", "Engineering", "Health"], description: "Toronto university with Schulich School of Business, popular with international students." },
      { name: "Concordia University", ranking: "#551-600 World (QS 2025)", programs: ["Business", "Engineering", "Fine Arts", "Computer Science", "Communication"], description: "Montreal English-language university with affordable tuition and strong arts programs." },
      { name: "Ryerson University (Toronto Metropolitan)", ranking: "#801-850 World (QS 2025)", programs: ["Business", "Engineering", "Media", "Design", "Hospitality"], description: "Toronto downtown university focused on career-oriented programs and entrepreneurship." },
      { name: "University of Manitoba", ranking: "#601-650 World (QS 2025)", programs: ["Business", "Engineering", "Agriculture", "Science", "Health Sciences"], description: "Affordable prairie university with strong engineering and agriculture programs." },
      { name: "University of Saskatchewan", ranking: "#461 World (QS 2025)", programs: ["Agriculture", "Engineering", "Science", "Business", "Veterinary"], description: "Research-intensive university with affordable living costs in Saskatoon." },
      { name: "Carleton University", ranking: "#601-650 World (QS 2025)", programs: ["Business", "Engineering", "Journalism", "Public Affairs", "Computer Science"], description: "Ottawa-based university known for journalism and international affairs programs." },
      { name: "University of Victoria", ranking: "#322 World (QS 2025)", programs: ["Business", "Engineering", "Law", "Science", "Education"], description: "Beautiful Victoria BC campus with strong co-op programs and mild climate." },
      { name: "Seneca College", ranking: "Top College", programs: ["Business", "IT", "Aviation", "Health Sciences", "Creative Arts"], description: "Toronto's largest college offering diplomas and degrees with strong industry connections." },
      { name: "George Brown College", ranking: "Top College", programs: ["Hospitality", "Business", "Health Sciences", "Design", "Construction"], description: "Downtown Toronto college popular with international students for hospitality and culinary programs." },
      { name: "Conestoga College", ranking: "Top College", programs: ["Engineering Technology", "Business", "IT", "Health Sciences", "Trades"], description: "Ontario college with excellent pathway programs to university and high employment rates." },
      { name: "Centennial College", ranking: "Top College", programs: ["Business", "Engineering Technology", "Communication", "Hospitality", "Health Sciences"], description: "Toronto's first community college with diverse programs and strong international student support." }
    ],
    whyStudy: [
      { icon: Globe, title: "Immigration Pathways", desc: "Clear pathways to permanent residency through Express Entry after graduation" },
      { icon: DollarSign, title: "Affordable Fees", desc: "Lower tuition compared to US and UK with high-quality education" },
      { icon: Briefcase, title: "PGWP", desc: "Post-Graduation Work Permit up to 3 years" },
      { icon: Building, title: "Safe Cities", desc: "High quality of life, universal healthcare, and multicultural environment" }
    ],
    costOfLiving: {
      tuition: "CAD 15,000 - 40,000/year",
      accommodation: "CAD 800 - 1,500/month",
      food: "CAD 300 - 500/month",
      transport: "CAD 80 - 150/month"
    },
    visaInfo: "Study Permit required. Apply online through IRCC. Processing: 8-12 weeks.",
    scholarships: ["Vanier Canada Graduate Scholarships", "Ontario Trillium Scholarship", "University-specific scholarships", "LPDP (Indonesian Government)"],
    requirements: ["Academic transcripts", "IELTS (6.0-6.5)", "Statement of Purpose", "Financial proof", "Medical exam (if required)"],
    intakes: ["September (Main)", "January", "May (Some programs)"],
    faqs: [
      { q: "Can I work in Canada after graduation?", a: "Yes, the Post-Graduation Work Permit (PGWP) allows you to work for up to 3 years after completing your studies." },
      { q: "How much does it cost to study in Canada?", a: "Tuition ranges from CAD 15,000-35,000/year. Living costs are approximately CAD 10,000-15,000/year." },
      { q: "Is Canada a good pathway to permanent residency?", a: "Yes, Canada has one of the most immigrant-friendly systems. Canadian education and work experience earn significant points for PR." },
      { q: "Do I need IELTS for Canadian universities?", a: "Most universities require IELTS 6.0-6.5. Some accept TOEFL, PTE, or Duolingo English Test." }
    ]
  },
  usa: {
    name: "United States",
    flag: "🇺🇸",
    heroImage: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1200&h=600&fit=crop",
    description: "The USA is home to the world's top universities with unparalleled research opportunities, diverse programs, and a flexible liberal arts education system. With OPT work authorization and a vast alumni network, it opens doors to global careers.",
    stats: [
      { label: "Universities", value: "4,000+" },
      { label: "International Students", value: "1M+" },
      { label: "OPT Duration", value: "1-3 Years" },
      { label: "Nobel Laureates", value: "Most in World" }
    ],
    universities: [
      { name: "Massachusetts Institute of Technology (MIT)", ranking: "#1 World (QS 2025)", programs: ["Engineering", "Computer Science", "Business", "Science", "Architecture"], description: "The world's #1 university for technology, engineering, and innovation." },
      { name: "Stanford University", ranking: "#6 World (QS 2025)", programs: ["All disciplines", "Computer Science", "Business", "Engineering", "Medicine"], description: "Silicon Valley's university, known for entrepreneurship and tech innovation." },
      { name: "Harvard University", ranking: "#4 World (QS 2025)", programs: ["All disciplines", "Business", "Law", "Medicine", "Government"], description: "The world's most prestigious university with unmatched resources and alumni network." },
      { name: "University of California, Berkeley", ranking: "#12 World (QS 2025)", programs: ["Engineering", "Computer Science", "Business", "Law", "Public Policy"], description: "Public university powerhouse in the San Francisco Bay Area." },
      { name: "Columbia University", ranking: "#7 World (QS 2025)", programs: ["Business", "Journalism", "Law", "International Affairs", "Arts"], description: "Ivy League university in New York City with strong professional schools." },
      { name: "University of Michigan", ranking: "#33 World (QS 2025)", programs: ["Engineering", "Business", "Medicine", "Public Policy", "Arts"], description: "Top public university with excellent research and a vibrant campus life." },
      { name: "New York University (NYU)", ranking: "#38 World (QS 2025)", programs: ["Business", "Arts", "Law", "Film", "Social Sciences"], description: "Global university with campuses in NYC, Abu Dhabi, and Shanghai." },
      { name: "University of Illinois Urbana-Champaign", ranking: "#64 World (QS 2025)", programs: ["Engineering", "Computer Science", "Business", "Agriculture", "Education"], description: "Top public university with one of the largest international student populations in the US." },
      { name: "Boston University", ranking: "#93 World (QS 2025)", programs: ["Business", "Engineering", "Communication", "Law", "Public Health"], description: "Private research university in Boston with strong international student community." },
      { name: "Purdue University", ranking: "#99 World (QS 2025)", programs: ["Engineering", "Computer Science", "Agriculture", "Business", "Aviation"], description: "Known as the 'Cradle of Astronauts' with top engineering programs and affordable tuition." },
      { name: "University of Southern California (USC)", ranking: "#116 World (QS 2025)", programs: ["Business", "Film", "Engineering", "Communication", "Architecture"], description: "LA-based university with the largest international student body among US private universities." },
      { name: "Arizona State University (ASU)", ranking: "#179 World (QS 2025)", programs: ["Business", "Engineering", "Computer Science", "Design", "Sustainability"], description: "Most innovative university in the US (US News), with strong support for international students." },
      { name: "University of Florida", ranking: "#167 World (QS 2025)", programs: ["Business", "Engineering", "Computer Science", "Agriculture", "Health Sciences"], description: "Top public university in Florida with affordable tuition and warm climate." },
      { name: "Northeastern University", ranking: "#187 World (QS 2025)", programs: ["Business", "Engineering", "Computer Science", "Health Sciences", "Design"], description: "Known for co-op programs that integrate work experience with study, popular with Asian students." },
      { name: "University of Minnesota", ranking: "#195 World (QS 2025)", programs: ["Business", "Engineering", "IT", "Health Sciences", "Agriculture"], description: "Large public research university with affordable tuition and strong STEM programs." },
      { name: "Indiana University Bloomington", ranking: "#312 World (QS 2025)", programs: ["Business", "Music", "Public Affairs", "Education", "Computer Science"], description: "Known for Kelley School of Business, popular with Indonesian students for its welcoming community." },
      { name: "University of South Florida", ranking: "#418 World (QS 2025)", programs: ["Business", "Engineering", "Marine Science", "Health Sciences", "Education"], description: "Tampa-based university with affordable living costs and growing research reputation." },
      { name: "San Francisco State University", ranking: "#1001-1200 World (QS 2025)", programs: ["Business", "Engineering", "Computer Science", "Cinema", "Design"], description: "Affordable California university in the heart of San Francisco with diverse student body." },
      { name: "University of Bridgeport", ranking: "Regionally Ranked", programs: ["Business", "Engineering", "Computer Science", "Design", "Health Sciences"], description: "Small private university in Connecticut with high acceptance rate and strong international support." },
      { name: "Full Sail University", ranking: "Specialized", programs: ["Film", "Game Design", "Music Production", "Animation", "Digital Marketing"], description: "Florida-based creative university specializing in entertainment, media, and technology fields." }
    ],
    whyStudy: [
      { icon: GraduationCap, title: "Research Excellence", desc: "World's leading research institutions with cutting-edge facilities" },
      { icon: Building, title: "Flexible Curriculum", desc: "Liberal arts approach allows exploration before choosing a major" },
      { icon: Briefcase, title: "OPT Opportunities", desc: "Work in your field for 1-3 years after graduation (3 years for STEM)" },
      { icon: Globe, title: "Global Network", desc: "Alumni networks spanning every industry and country worldwide" }
    ],
    costOfLiving: {
      tuition: "$20,000 - $60,000/year",
      accommodation: "$800 - $2,500/month",
      food: "$300 - $600/month",
      transport: "$50 - $200/month"
    },
    visaInfo: "F-1 Student Visa. Apply at US Embassy after receiving I-20 from university. Processing: 2-4 weeks.",
    scholarships: ["Fulbright Scholarship (fully funded)", "University merit scholarships", "Need-based financial aid", "LPDP (Indonesian Government)", "EducationUSA advising"],
    requirements: ["Academic transcripts", "SAT/ACT (undergraduate) or GRE/GMAT (graduate)", "TOEFL/IELTS", "Essays/Personal statement", "Letters of recommendation", "Financial proof"],
    intakes: ["Fall (August/September)", "Spring (January)"],
    faqs: [
      { q: "How much does it cost to study in the USA?", a: "Tuition varies widely: $10,000-$55,000/year. Community colleges start from $8,000-$12,000/year as an affordable pathway." },
      { q: "Can I work while studying in the USA?", a: "F-1 visa holders can work on-campus up to 20 hours/week. Off-campus work requires CPT or OPT authorization." },
      { q: "What is OPT and how does it work?", a: "Optional Practical Training (OPT) allows 12 months of work after graduation. STEM graduates get a 24-month extension (total 36 months)." },
      { q: "Do I need SAT/ACT for US universities?", a: "Many universities are now test-optional. Check individual requirements — some still require SAT/ACT for competitive programs." }
    ]
  },
  ireland: {
    name: "Ireland",
    flag: "🇮🇪",
    heroImage: "https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?w=1200&h=600&fit=crop",
    description: "Ireland offers English-speaking education in Europe with a friendly culture and a booming tech industry. As the European headquarters for many global tech companies, Ireland provides excellent career opportunities after graduation.",
    stats: [
      { label: "Universities", value: "9" },
      { label: "International Students", value: "35,000+" },
      { label: "Stay Back", value: "2 Years" },
      { label: "Tech Companies", value: "1,000+" }
    ],
    universities: [
      { name: "Trinity College Dublin", ranking: "#81 World (QS 2025)", programs: ["All disciplines", "Computer Science", "Business", "Law", "Medicine"], description: "Ireland's oldest and most prestigious university, founded in 1592." },
      { name: "University College Dublin (UCD)", ranking: "#126 World (QS 2025)", programs: ["Business", "Engineering", "Architecture", "Veterinary", "Agriculture"], description: "Ireland's largest university with a modern campus and global outlook." },
      { name: "National University of Ireland, Galway (NUIG)", ranking: "#270 World (QS 2025)", programs: ["Science", "Arts", "Medicine", "Engineering", "Business"], description: "Located on Ireland's west coast with strong research in marine science and biomedical." },
      { name: "University College Cork (UCC)", ranking: "#292 World (QS 2025)", programs: ["Food Science", "Pharmacy", "Law", "Business", "Medicine"], description: "Known for food science research and a vibrant student city." },
      { name: "Dublin City University (DCU)", ranking: "#421 World (QS 2025)", programs: ["Business", "Engineering", "Computing", "Communications", "Education"], description: "Modern university with strong industry links and innovative programs." },
      { name: "University of Limerick (UL)", ranking: "#426 World (QS 2025)", programs: ["Engineering", "Business", "Health Sciences", "Education", "Arts"], description: "Known for its co-operative education program and beautiful riverside campus." }
    ],
    whyStudy: [
      { icon: Globe, title: "English Speaking", desc: "Study in English in the heart of Europe with a friendly culture" },
      { icon: Briefcase, title: "Tech Hub of Europe", desc: "European headquarters of Google, Meta, Apple, Microsoft, and more" },
      { icon: Building, title: "Stay Back Option", desc: "Work for 2 years after graduation under the Third Level Graduate Scheme" },
      { icon: GraduationCap, title: "Quality Education", desc: "Globally recognized Irish qualifications with strong research output" }
    ],
    costOfLiving: {
      tuition: "€10,000 - €25,000/year",
      accommodation: "€500 - €1,200/month",
      food: "€200 - €400/month",
      transport: "€50 - €120/month"
    },
    visaInfo: "Study Visa (Stamp 2). Apply at Irish Embassy. Processing: 4-8 weeks.",
    scholarships: ["Government of Ireland Scholarships", "University-specific scholarships", "Science Foundation Ireland", "LPDP (Indonesian Government)"],
    requirements: ["Academic transcripts", "IELTS (6.0-6.5)", "Statement of Purpose", "Financial proof", "Health insurance"],
    intakes: ["September (Main)", "January (Some programs)"],
    faqs: [
      { q: "Is Ireland a good place for Indonesian students?", a: "Yes, Ireland is very welcoming with a growing Indonesian community. It's also a hub for tech companies like Google, Meta, and Apple." },
      { q: "Can I work after graduating in Ireland?", a: "Yes, the Stay Back Visa allows graduates to stay for 1-2 years to seek employment in Ireland." },
      { q: "How much does it cost to study in Ireland?", a: "Tuition ranges from €10,000-€25,000/year. Living costs are approximately €7,000-€12,000/year." },
      { q: "Do I need IELTS for Irish universities?", a: "Most universities require IELTS 6.0-6.5. Some accept TOEFL or PTE Academic as alternatives." }
    ]
  },
  netherlands: {
    name: "Netherlands",
    flag: "🇳🇱",
    heroImage: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=600&fit=crop",
    description: "The Netherlands offers innovative education with many English-taught programs in the heart of Europe. Known for its problem-based learning approach and high quality of life, it's an increasingly popular destination for international students.",
    stats: [
      { label: "Universities", value: "55+" },
      { label: "English Programs", value: "2,100+" },
      { label: "Orientation Year", value: "1 Year" },
      { label: "EU Access", value: "Schengen" }
    ],
    universities: [
      { name: "TU Delft", ranking: "#47 World (QS 2025)", programs: ["Engineering", "Architecture", "Design", "Aerospace", "Computer Science"], description: "Europe's leading technical university, known for engineering and design excellence." },
      { name: "University of Amsterdam", ranking: "#53 World (QS 2025)", programs: ["Arts", "Science", "Business", "Social Sciences", "Communication"], description: "Amsterdam's premier university with a vibrant international community." },
      { name: "Erasmus University Rotterdam", ranking: "#176 World (QS 2025)", programs: ["Business", "Economics", "Medicine", "Law", "Social Sciences"], description: "Known for its world-renowned Rotterdam School of Management (RSM)." },
      { name: "Leiden University", ranking: "#122 World (QS 2025)", programs: ["Law", "Humanities", "Science", "Medicine", "Social Sciences"], description: "The Netherlands' oldest university with a strong tradition in law and humanities." },
      { name: "Utrecht University", ranking: "#107 World (QS 2025)", programs: ["Science", "Veterinary", "Humanities", "Medicine", "Geosciences"], description: "One of Europe's largest universities with strong research output." },
      { name: "Wageningen University", ranking: "#151 World (QS 2025)", programs: ["Agriculture", "Food Science", "Environmental Science", "Biology", "Nutrition"], description: "World #1 in Agriculture & Forestry, leading in food and environmental research." }
    ],
    whyStudy: [
      { icon: Globe, title: "English Programs", desc: "Over 2,100 programs taught entirely in English — no Dutch required" },
      { icon: Building, title: "Central Europe", desc: "Easy access to other European countries by train or budget flights" },
      { icon: Briefcase, title: "Orientation Year", desc: "Stay for 1 year after graduation to find work (Zoekjaar)" },
      { icon: GraduationCap, title: "Innovative Education", desc: "Problem-based learning and practical approach to education" }
    ],
    costOfLiving: {
      tuition: "€8,000 - €20,000/year",
      accommodation: "€400 - €900/month",
      food: "€200 - €350/month",
      transport: "€50 - €100/month"
    },
    visaInfo: "MVV (Entry Visa) + Residence Permit. University assists with application. Processing: 4-8 weeks.",
    scholarships: ["Holland Scholarship", "Orange Tulip Scholarship", "Erasmus Mundus", "University-specific scholarships", "StuNed (for Indonesians)"],
    requirements: ["Academic transcripts", "IELTS (6.0-6.5)", "Motivation letter", "CV", "Financial proof"],
    intakes: ["September (Main)", "February (Some programs)"],
    faqs: [
      { q: "Why study in the Netherlands?", a: "The Netherlands offers high-quality education with many English-taught programs, a multicultural environment, and affordable tuition compared to the UK." },
      { q: "Can I work while studying in the Netherlands?", a: "Yes, international students can work up to 16 hours/week or full-time during June, July, and August." },
      { q: "How much does it cost to study in the Netherlands?", a: "Tuition for non-EU students ranges from €6,000-€15,000/year. Living costs are approximately €800-€1,100/month." },
      { q: "Is Dutch language required?", a: "No, the Netherlands has over 2,100 English-taught programs. Dutch is not required for most international programs." }
    ]
  }
};

export default function CountryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const country = countryData[slug];
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [, setLocation] = useLocation();


  useEffect(() => {
    if (country) {
      const countryName = country.name || slug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Destination';
      document.title = `Study in ${countryName} | SpecTa Education`;
      const metaDesc = document.querySelector('meta[name="description"]');
      const descText = country.description ? country.description.substring(0, 155) : `Explore universities and programs in ${countryName} with SpecTa Education.`;
      if (metaDesc) {
        metaDesc.setAttribute('content', descText);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = descText;
        document.head.appendChild(meta);
      }
    }
  }, [country, slug]);

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
          <img src={country.heroImage} alt={`Study in ${country.name} - top universities and programs for Indonesian students`} className="w-full h-full object-cover" />
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
                className="text-center p-6 bg-card rounded-xl shadow-sm border border-border"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
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
                className="p-6 bg-card rounded-xl shadow-sm border border-border hover:shadow-md hover:border-primary transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Universities / Institutions */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
              <GraduationCap className="w-4 h-4" />
              {slug === 'singapore' ? 'Private Institutions' : 'World-Class Universities'}
            </div>
            <h2 className="text-3xl font-bold mb-4">
              {slug === 'singapore' ? 'Our Partner Institutions' : `Top Universities in ${country.name}`}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {slug === 'singapore' 
                ? 'Explore our partner private institutions in Singapore offering internationally recognized degrees'
                : `Discover top universities in ${country.name} for your study abroad journey`
              }
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {country.universities.map((uni: any, index: number) => {
              const rankMatch = uni.ranking.match(/#(\d+)/);
              const rankNum = rankMatch ? parseInt(rankMatch[1]) : null;
              const isTopRanked = rankNum !== null && rankNum <= 50;
              const isTop100 = rankNum !== null && rankNum <= 100;
              return (
                <motion.div 
                  key={index}
                  className="group relative bg-card rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-xl transition-all duration-500"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06, duration: 0.5 }}
                  whileHover={{ y: -8 }}
                >
                  {/* Top gradient accent bar */}
                  <div className={`h-1.5 w-full ${
                    isTopRanked ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500' :
                    isTop100 ? 'bg-gradient-to-r from-primary via-primary/80 to-primary/60' :
                    'bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10'
                  }`} />
                  
                  <div className="p-6">
                    {/* Ranking Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 pr-3">
                        <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors duration-300">{uni.name}</h3>
                      </div>
                      {rankNum ? (
                        <div className={`shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl ${
                          isTopRanked ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-200/50' :
                          isTop100 ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/20' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          <span className="text-[10px] font-medium leading-none opacity-80">QS</span>
                          <span className="text-lg font-bold leading-none">#{rankNum}</span>
                        </div>
                      ) : (
                        <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary">
                          <Award className="w-5 h-5" />
                          <span className="text-[9px] font-medium leading-none mt-0.5">Top</span>
                        </div>
                      )}
                    </div>

                    {/* Ranking text */}
                    <p className="text-xs font-medium text-primary/70 mb-3">{uni.ranking}</p>

                    {/* Description */}
                    {uni.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2 group-hover:line-clamp-none transition-all duration-300">{uni.description}</p>
                    )}

                    {/* Programs */}
                    <div className="flex flex-wrap gap-1.5">
                      {uni.programs.slice(0, 4).map((prog: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-lg text-xs font-medium group-hover:bg-primary/10 transition-colors">{prog}</span>
                      ))}
                      {uni.programs.length > 4 && (
                        <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-medium">+{uni.programs.length - 4} more</span>
                      )}
                    </div>

                    {/* Hover CTA */}
                    <div className="mt-4 pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-y-2">
                      <button 
                        onClick={() => setLocation(`/apply?country=${encodeURIComponent(slug)}&university=${encodeURIComponent(uni.name)}`)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-pink-200 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        Quick Apply
                      </button>
                      <a 
                        href={`https://wa.me/6281181208 20?text=Hi,%20I'm%20interested%20in%20${encodeURIComponent(uni.name)}%20in%20${encodeURIComponent(country.name)}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp Inquiry
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cost of Living Calculator */}
      <CostOfLivingCalculator 
        countrySlug={slug} 
        countryName={country.name} 
        fallbackData={country.costOfLiving} 
      />

      {/* Scholarships */}
      {country.scholarships && (
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Award className="w-7 h-7 text-primary" />
                  Scholarships Available
                </h3>
                <ul className="space-y-3">
                  {country.scholarships.map((scholarship: string, index: number) => (
                    <li key={index} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                      <ChevronRight className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm">{scholarship}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <FileText className="w-7 h-7 text-primary" />
                  Visa Information
                </h3>
                <div className="p-6 bg-card rounded-xl border border-border mb-6">
                  <p className="text-muted-foreground text-sm leading-relaxed">{country.visaInfo}</p>
                </div>
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Calendar className="w-7 h-7 text-primary" />
                  Intake Periods
                </h3>
                <ul className="space-y-3">
                  {country.intakes.map((intake: string, index: number) => (
                    <li key={index} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                      <ChevronRight className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm">{intake}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Requirements */}
      <section className="py-16">
        <div className="container">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Entry Requirements
          </motion.h2>
          <div className="max-w-3xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-4">
              {country.requirements.map((req: string, index: number) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold text-sm">{index + 1}</span>
                  </div>
                  <span className="text-sm">{req}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section for SEO */}
      {country.faqs && country.faqs.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {country.faqs.map((faq: any, index: number) => (
                <motion.details
                  key={index}
                  className="group bg-card rounded-xl border border-border overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/50 transition-colors font-semibold text-lg">
                    {faq.q}
                    <ChevronRight className="w-5 h-5 transition-transform group-open:rotate-90 text-primary flex-shrink-0 ml-4" />
                  </summary>
                  <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                </motion.details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Resources - Internal Linking for SEO */}
      <section className="py-16 bg-muted/20">
        <div className="container">
          <motion.h2
            className="text-3xl font-bold text-center mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Explore More Resources
          </motion.h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            Prepare for your study abroad journey with our AI-powered tools and expert guidance
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Link href="/ielts">
              <div className="p-6 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                <BookOpen className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">IELTS Preparation</h3>
                <p className="text-sm text-muted-foreground">Practice tests, tips, and AI-powered scoring to achieve your target band score.</p>
              </div>
            </Link>
            <Link href="/aptitude-test">
              <div className="p-6 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                <GraduationCap className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">AI Aptitude Test</h3>
                <p className="text-sm text-muted-foreground">Discover your ideal major with our RIASEC and Multiple Intelligence analysis.</p>
              </div>
            </Link>
            <Link href="/scholarships">
              <div className="p-6 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                <Award className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Scholarships</h3>
                <p className="text-sm text-muted-foreground">Find scholarships and funding opportunities for studying in {country.name}.</p>
              </div>
            </Link>
            <Link href="/simulator">
              <div className="p-6 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                <Globe className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Study Abroad Simulator</h3>
                <p className="text-sm text-muted-foreground">Experience a 3-day simulation of student life in {country.name} before you go.</p>
              </div>
            </Link>
          </div>
          {/* Other Destinations */}
          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold mb-4">Explore Other Destinations</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(countryData)
                .filter(([key]) => key !== slug)
                .slice(0, 6)
                .map(([key, c]: [string, any]) => (
                  <Link key={key} href={`/destinations/${key}`}>
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm hover:border-primary/50 hover:shadow transition-all cursor-pointer">
                      {c.flag} {c.name}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-specta">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Study in {country.name}?</h2>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            Our education counselors are ready to help you with university selection, application, visa, and more. Get your FREE consultation today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`https://wa.me/6281181208 20?text=Hi,%20I'm%20interested%20in%20studying%20in%20${encodeURIComponent(country.name)}`} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                WhatsApp Consultation
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
            <a href="https://wa.me/6281181208 20?text=Hi,%20I'm%20interested%20in%20studying%20abroad.%20Can%20you%20help%20me?" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Chat on WhatsApp
              </Button>
            </a>
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
