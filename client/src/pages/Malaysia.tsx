import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Award, 
  Building2, 
  Users, 
  BookOpen,
  ChevronRight,
  Star,
  Trophy,
  Briefcase
} from "lucide-react";

interface University {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  campusImage: string;
  ranking: string;
  rankingDetail: string;
  location: string;
  established: string;
  description: string;
  highlights: string[];
  programs: {
    category: string;
    items: string[];
  }[];
  strengths: string[];
  facilities: string[];
  scholarships: boolean;
  contact: {
    phone?: string;
    email?: string;
    address: string;
  };
  color: string;
}

const universities: University[] = [
  {
    id: "taylors",
    name: "Taylor's University",
    shortName: "Taylor's",
    logo: "/taylors-logo.png",
    campusImage: "/taylors-campus.jpg",
    ranking: "#284",
    rankingDetail: "QS World University Rankings 2026",
    location: "Subang Jaya, Selangor",
    established: "1969",
    description: "Taylor's University is Malaysia's top private university, renowned for its hospitality, business, and design programs. With over 55 years of excellence, Taylor's provides a world-class education that prepares students for global careers.",
    highlights: [
      "#1 Private University in Malaysia",
      "#14 in Asia for Hospitality & Leisure Management",
      "QS 5-Star Rating",
      "Strong industry partnerships"
    ],
    programs: [
      {
        category: "Business & Management",
        items: ["Bachelor of Business", "MBA", "Accounting & Finance", "International Business"]
      },
      {
        category: "Hospitality & Tourism",
        items: ["Culinary Arts", "Hotel Management", "Tourism Management", "Event Management"]
      },
      {
        category: "Design & Creative",
        items: ["Architecture", "Interior Design", "Graphic Design", "Fashion Design"]
      },
      {
        category: "Computing & Engineering",
        items: ["Computer Science", "Software Engineering", "Electrical Engineering", "Chemical Engineering"]
      }
    ],
    strengths: ["Hospitality & Leisure Management", "Business & Management", "Architecture", "Medicine"],
    facilities: ["Lakeside Campus", "Design Studios", "Culinary Labs", "Medical Simulation Center"],
    scholarships: true,
    contact: {
      phone: "+603-5629 5000",
      email: "enquiry@taylors.edu.my",
      address: "No. 1, Jalan Taylor's, 47500 Subang Jaya, Selangor"
    },
    color: "from-purple-600 to-purple-800"
  },
  {
    id: "nottingham",
    name: "University of Nottingham Malaysia",
    shortName: "Nottingham",
    logo: "/nottingham-logo.png",
    campusImage: "/nottingham-campus.jpg",
    ranking: "#97",
    rankingDetail: "QS World University Rankings 2026",
    location: "Semenyih, Selangor",
    established: "2000",
    description: "As part of the prestigious Russell Group, University of Nottingham Malaysia offers authentic British education in Southeast Asia. Students receive the same quality education as the UK campus with the added benefit of studying in a multicultural environment.",
    highlights: [
      "Top 100 Global University",
      "Russell Group Member",
      "Triple-Crown Accredited Business School",
      "85% of academics hold PhDs"
    ],
    programs: [
      {
        category: "Business",
        items: ["Business Management", "Finance & Investment", "International Business", "MBA"]
      },
      {
        category: "Engineering",
        items: ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Chemical Engineering"]
      },
      {
        category: "Science",
        items: ["Pharmacy (Top 15 Global)", "Biotechnology", "Computer Science", "Psychology"]
      },
      {
        category: "Arts & Social Sciences",
        items: ["English", "International Relations", "Economics", "Education"]
      }
    ],
    strengths: ["Pharmacy (Top 15 Global)", "Business (Triple-Crown)", "Engineering", "Computer Science"],
    facilities: ["125-acre Campus", "Research Labs", "Sports Complex", "Student Accommodation"],
    scholarships: true,
    contact: {
      phone: "+603-8924 8000",
      email: "enquiries@nottingham.edu.my",
      address: "Jalan Broga, 43500 Semenyih, Selangor"
    },
    color: "from-blue-600 to-blue-800"
  },
  {
    id: "inti",
    name: "INTI International University",
    shortName: "INTI",
    logo: "/inti-logo.png",
    campusImage: "/inti-campus.jpg",
    ranking: "#509",
    rankingDetail: "QS World University Rankings 2026",
    location: "Nilai, Negeri Sembilan",
    established: "1986",
    description: "INTI International University is one of Malaysia's most established private institutions, known for its American Degree Transfer Program and strong partnerships with global universities. With 40+ years of excellence, INTI prepares students for international careers.",
    highlights: [
      "#122 in QS Asia Rankings",
      "40+ Years of Excellence",
      "6 Partner Universities Worldwide",
      "American Degree Transfer Program"
    ],
    programs: [
      {
        category: "American Degree Program",
        items: ["Business", "Computer Science", "Engineering", "Mass Communication"]
      },
      {
        category: "Business & Accounting",
        items: ["Accounting", "Business Administration", "Marketing", "Finance"]
      },
      {
        category: "Computing & IT",
        items: ["Software Engineering", "Data Science", "Cybersecurity", "Mobile Computing"]
      },
      {
        category: "Engineering",
        items: ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Quantity Surveying"]
      }
    ],
    strengths: ["American Degree Transfer", "Business", "Engineering", "Hospitality"],
    facilities: ["82-acre Nilai Campus", "Multiple Campuses (Subang, Penang, Sabah)", "Industry Labs", "Student Housing"],
    scholarships: true,
    contact: {
      phone: "+606-798 2000",
      email: "enquiry@newinti.edu.my",
      address: "Persiaran Perdana BBN, Putra Nilai, 71800 Nilai, Negeri Sembilan"
    },
    color: "from-red-600 to-red-800"
  },
  {
    id: "toa",
    name: "The One Academy",
    shortName: "TOA",
    logo: "/toa-logo.png",
    campusImage: "/toa-campus.webp",
    ranking: "#1",
    rankingDetail: "World's Top Creative School - Rookies 2024",
    location: "Bandar Sunway, Selangor",
    established: "1991",
    description: "The One Academy is Malaysia's premier art and design institution, ranked as the World's #1 Creative School. With partnerships including Disney Pixar alumni and ESMOD Paris, TOA produces world-class creative professionals.",
    highlights: [
      "World's #1 Creative School (Rookies 2024)",
      "Oscar-Winning Faculty Partnerships",
      "ESMOD Paris Partnership",
      "DigiPen USA Partnership"
    ],
    programs: [
      {
        category: "Animation & VFX",
        items: ["Digital Animation", "Visual Effects (VFX)", "Game Art & Design", "3D Animation"]
      },
      {
        category: "Design",
        items: ["Advertising & Graphic Design", "Interior Design", "Digital Media Design", "Illustration"]
      },
      {
        category: "Fashion",
        items: ["Paris Fashion Design", "Pattern Making", "Fashion Marketing", "Textile Design"]
      },
      {
        category: "Fine Arts",
        items: ["Fine Arts", "Digital Painting", "Concept Art", "Character Design"]
      }
    ],
    strengths: ["Animation", "VFX", "Graphic Design", "Fashion Design"],
    facilities: ["Industry-Standard Studios", "Animation Labs", "Fashion Workshops", "Gallery Spaces"],
    scholarships: true,
    contact: {
      phone: "+603-7875 5510",
      email: "info@toa.edu.my",
      address: "Leisure Commerce Square, Bandar Sunway, Petaling Jaya"
    },
    color: "from-orange-500 to-orange-700"
  },
  {
    id: "ucsi",
    name: "UCSI University",
    shortName: "UCSI",
    logo: "/ucsi-logo.png",
    campusImage: "/ucsi-campus.webp",
    ranking: "#269",
    rankingDetail: "QS World University Rankings 2026",
    location: "Cheras, Kuala Lumpur",
    established: "1986",
    description: "UCSI University is Malaysia's #2 private university and ranks in the world's top 1% for four consecutive years. Known for its strong employability focus and diverse program offerings across multiple campuses.",
    highlights: [
      "Top 1% Global University",
      "#2 Private University in Malaysia",
      "#1 in Employability",
      "Top 20 in Asia"
    ],
    programs: [
      {
        category: "Medicine & Health",
        items: ["Medicine (MBBS)", "Pharmacy", "Nursing", "Optometry"]
      },
      {
        category: "Business",
        items: ["Business Administration", "Accounting", "Finance", "Marketing"]
      },
      {
        category: "Engineering",
        items: ["Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Chemical Engineering"]
      },
      {
        category: "Creative Arts",
        items: ["Music", "Architecture", "Fashion Design", "Graphic Design"]
      }
    ],
    strengths: ["Medicine", "Music", "Pharmacy", "Business"],
    facilities: ["20-acre KL Campus", "Teaching Hospital", "Music Conservatory", "Multiple Campuses"],
    scholarships: true,
    contact: {
      phone: "+603-9101 8880",
      email: "enquiry@ucsiuniversity.edu.my",
      address: "1 Jalan UCSI, UCSI Heights, Cheras 56000, Kuala Lumpur"
    },
    color: "from-teal-600 to-teal-800"
  },
  {
    id: "monash",
    name: "Monash University Malaysia",
    shortName: "Monash",
    logo: "/monash-logo.png",
    campusImage: "/monash-campus.jpg",
    ranking: "#36",
    rankingDetail: "QS World University Rankings 2026",
    location: "Bandar Sunway, Selangor",
    established: "1998",
    description: "Monash University Malaysia is part of Australia's prestigious Group of Eight universities. As a top 40 global university, Monash offers internationally-recognized Australian degrees with world-class research opportunities.",
    highlights: [
      "Top 40 Global University",
      "Group of Eight Member",
      "#4 in World for Pharmacy",
      "6-Star SETARA Rating"
    ],
    programs: [
      {
        category: "Medicine & Health",
        items: ["Medicine (MBBS)", "Pharmacy (#4 World)", "Psychology", "Biomedical Science"]
      },
      {
        category: "Business",
        items: ["Business & Commerce", "Accounting", "Banking & Finance", "International Business"]
      },
      {
        category: "Engineering",
        items: ["Civil Engineering", "Mechanical Engineering", "Chemical Engineering", "Electrical Engineering"]
      },
      {
        category: "IT & Science",
        items: ["Computer Science", "Data Science", "Information Technology", "Biotechnology"]
      }
    ],
    strengths: ["Pharmacy (#4 World)", "Medicine", "Engineering", "Business"],
    facilities: ["22-acre Sunway Campus", "Research Centers", "Teaching Hospital", "Sports Facilities"],
    scholarships: true,
    contact: {
      phone: "+603-5514 6000",
      email: "study@monash.edu.my",
      address: "Jalan Lagoon Selatan, 47500 Bandar Sunway, Selangor"
    },
    color: "from-blue-800 to-blue-950"
  },
  {
    id: "southampton",
    name: "University of Southampton Malaysia",
    shortName: "Southampton",
    logo: "/southampton-logo.png",
    campusImage: "/southampton-campus.jpg",
    ranking: "#87",
    rankingDetail: "QS World University Rankings 2026",
    location: "Iskandar Puteri, Johor",
    established: "2012",
    description: "University of Southampton Malaysia is a Russell Group university offering identical UK curriculum in Malaysia. Students receive the same world-class education with the option to transfer to the UK campus.",
    highlights: [
      "Top 100 Global University",
      "Russell Group Founding Member",
      "#1 UK for Electrical Engineering",
      "Same Curriculum as UK Campus"
    ],
    programs: [
      {
        category: "Engineering",
        items: ["Mechanical Engineering (#77 World)", "Electrical Engineering (#70 World)", "Aeronautics", "Civil Engineering"]
      },
      {
        category: "Business",
        items: ["Business Management", "Business Analytics", "Finance", "Marketing"]
      },
      {
        category: "Computer Science",
        items: ["Computer Science", "Software Engineering", "Cybersecurity", "Data Science"]
      },
      {
        category: "Foundation",
        items: ["Foundation Year (Engineering)", "Foundation Year (Business)", "Pre-sessional English"]
      }
    ],
    strengths: ["Electrical Engineering (#1 UK)", "Mechanical Engineering", "Aeronautics", "Computer Science"],
    facilities: ["150,000 sq ft Campus", "UK-Standard Labs", "Student Accommodation", "Near Singapore"],
    scholarships: true,
    contact: {
      phone: "+607-560 2560",
      email: "marketing.malaysia@soton.ac.uk",
      address: "Eko Galleria, Iskandar Puteri, 79100 Johor"
    },
    color: "from-cyan-600 to-cyan-800"
  },
  {
    id: "mila",
    name: "MILA University",
    shortName: "MILA",
    logo: "/mila-logo.png",
    campusImage: "/mila-campus.jpg",
    ranking: "#414",
    rankingDetail: "QS Asia University Rankings 2026",
    location: "Nilai, Negeri Sembilan",
    established: "2023",
    description: "MILA University is Malaysia's newest innovative institution with global affiliation to Haikou University of Economics. Despite being newly established, MILA has quickly risen to become a top 100 university in South-Eastern Asia.",
    highlights: [
      "Top 100 in South-Eastern Asia",
      "Top 500 in Asia",
      "Royal Patronage",
      "IR 4.0 Focus"
    ],
    programs: [
      {
        category: "Business & Management",
        items: ["Business Administration", "Accounting", "Finance", "Mass Communication"]
      },
      {
        category: "Engineering & Computing",
        items: ["Mechanical Engineering", "Mechatronics", "AI & Robotics", "Software Engineering"]
      },
      {
        category: "Biotechnology",
        items: ["Biotechnology", "Food Science", "Biomedical Science", "Environmental Science"]
      },
      {
        category: "Foundation & Diploma",
        items: ["Foundation in Business", "Foundation in Science", "Diploma Programs"]
      }
    ],
    strengths: ["Engineering", "Biotechnology", "Business", "Computing"],
    facilities: ["Modern Campus", "Research Labs", "Student Accommodation", "Industry Partnerships"],
    scholarships: true,
    contact: {
      phone: "+606-850 8000",
      email: "info@mila.edu.my",
      address: "No.1, Persiaran MIU, Nilai, Negeri Sembilan"
    },
    color: "from-rose-600 to-rose-800"
  }
];

export default function Malaysia() {
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation currentPage="malaysia" />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-specta-coral to-specta-blue pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <Badge className="bg-white/20 text-white mb-4">Partner Universities</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Study in Malaysia
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Discover world-class education at our 8 partner universities in Malaysia. 
              From top 40 global institutions to specialized creative schools, find your perfect fit.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-3xl font-bold">8</div>
                <div className="text-sm text-white/80">Partner Universities</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-3xl font-bold">200+</div>
                <div className="text-sm text-white/80">Programs Available</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-3xl font-bold">Top 100</div>
                <div className="text-sm text-white/80">Global Rankings</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* University Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Our Partner Universities</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              SpecTa Education partners with Malaysia's leading universities to provide you with 
              the best educational opportunities. Click on any university to learn more.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {universities.map((uni) => (
              <Card 
                key={uni.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group"
                onClick={() => setSelectedUniversity(uni)}
              >
                {/* Campus Image */}
                <div className="relative h-40 overflow-hidden">
                  <img 
                    src={uni.campusImage} 
                    alt={`${uni.name} Campus`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <Badge className={`bg-gradient-to-r ${uni.color} text-white border-0 text-xs`}>
                      {uni.ranking} {uni.ranking === "#1" ? "Creative" : "QS World"}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5">
                      <MapPin className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                </div>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-lg group-hover:text-specta-coral transition-colors">
                    {uni.shortName}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-1">
                    {uni.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                    {uni.description.substring(0, 80)}...
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {uni.strengths.slice(0, 2).map((strength, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* University Detail Modal */}
      {selectedUniversity && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUniversity(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Campus Image */}
            <div className="relative h-64 overflow-hidden rounded-t-2xl">
              <img 
                src={selectedUniversity.campusImage} 
                alt={`${selectedUniversity.name} Campus`}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${selectedUniversity.color} opacity-70`}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <button 
                onClick={() => setSelectedUniversity(null)}
                className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl transition-colors"
              >
                ×
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <Badge className="bg-white/20 backdrop-blur-sm text-white mb-4 border-0">
                  {selectedUniversity.ranking} {selectedUniversity.rankingDetail}
                </Badge>
                <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">{selectedUniversity.name}</h2>
                <div className="flex items-center gap-4 text-white/90">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedUniversity.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    Est. {selectedUniversity.established}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="programs">Programs</TabsTrigger>
                  <TabsTrigger value="facilities">Facilities</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <p className="text-gray-600 leading-relaxed">
                    {selectedUniversity.description}
                  </p>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-specta-coral" />
                      Key Highlights
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {selectedUniversity.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-gray-700">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-specta-coral" />
                      Key Strengths
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUniversity.strengths.map((strength, idx) => (
                        <Badge key={idx} className="bg-specta-coral/10 text-specta-coral">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="programs" className="space-y-6">
                  {selectedUniversity.programs.map((category, idx) => (
                    <div key={idx}>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-specta-coral" />
                        {category.category}
                      </h4>
                      <div className="grid md:grid-cols-2 gap-2">
                        {category.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-2 text-gray-600">
                            <ChevronRight className="w-4 h-4 text-specta-coral" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="facilities" className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedUniversity.facilities.map((facility, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
                        <Building2 className="w-5 h-5 text-specta-coral" />
                        <span className="text-gray-700">{facility}</span>
                      </div>
                    ))}
                  </div>
                  {selectedUniversity.scholarships && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700">
                        <GraduationCap className="w-5 h-5" />
                        <span className="font-semibold">Scholarships Available</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Contact SpecTa Education to learn about scholarship opportunities at this university.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    {selectedUniversity.contact.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-specta-coral" />
                        <span className="text-gray-700">{selectedUniversity.contact.phone}</span>
                      </div>
                    )}
                    {selectedUniversity.contact.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-specta-coral" />
                        <span className="text-gray-700">{selectedUniversity.contact.email}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-specta-coral mt-0.5" />
                      <span className="text-gray-700">{selectedUniversity.contact.address}</span>
                    </div>
                  </div>

                  <div className="bg-specta-coral/5 border border-specta-coral/20 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-specta-coral" />
                      Apply Through SpecTa Education
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Let our expert counselors guide you through the application process. 
                      We provide free consultation and support for all our partner universities.
                    </p>
                    <Link href="/">
                      <Button className="bg-specta-coral hover:bg-specta-coral/90">
                        Talk to AI Advisor
                      </Button>
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Why Study in Malaysia */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Study in Malaysia?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Malaysia offers world-class education at affordable costs, making it an ideal destination 
              for international students seeking quality degrees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-specta-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-specta-coral" />
              </div>
              <h3 className="text-xl font-semibold mb-2">World-Class Education</h3>
              <p className="text-gray-600">
                Multiple universities ranked in the top 100 globally, offering internationally recognized degrees.
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-specta-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-specta-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multicultural Environment</h3>
              <p className="text-gray-600">
                Experience a diverse, welcoming community with students from over 100 countries.
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Affordable Living</h3>
              <p className="text-gray-600">
                Lower tuition fees and cost of living compared to Western countries, without compromising quality.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-specta-coral to-specta-blue">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            Talk to our AI advisor or schedule a free consultation with our expert counselors. 
            We'll help you find the perfect university and program for your goals.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/">
              <Button size="lg" className="bg-white text-specta-coral hover:bg-gray-100">
                Chat with AI Advisor
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Book Free Consultation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/specta-logo.png" alt="SpecTa Education" className="h-8 w-auto brightness-0 invert" />
                <span className="font-bold">SpecTa Education</span>
              </div>
              <p className="text-gray-400 text-sm">
                Your trusted partner for studying abroad. Expert guidance for your educational journey.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-gray-400 text-sm">
                <Link href="/about"><span className="hover:text-white cursor-pointer block">About Us</span></Link>
                <Link href="/destinations"><span className="hover:text-white cursor-pointer block">Destinations</span></Link>
                <Link href="/malaysia"><span className="hover:text-white cursor-pointer block">Malaysia Universities</span></Link>
                <Link href="/ielts"><span className="hover:text-white cursor-pointer block">IELTS Preparation</span></Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-400 text-sm">
                <p>WhatsApp: +62 812-8888-8888</p>
                <p>Email: info@spectaeducation.com</p>
                <p>Jakarta, Indonesia</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Office Hours</h4>
              <div className="space-y-2 text-gray-400 text-sm">
                <p>Monday - Friday: 9AM - 6PM</p>
                <p>Saturday: 9AM - 3PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            © 2026 SpecTa Education. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
