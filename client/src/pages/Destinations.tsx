import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Globe, GraduationCap, Building, DollarSign, Phone, Mail, MapPin, MessageCircle, ChevronRight } from "lucide-react";

const destinations = [
  {
    name: "Australia",
    flag: "🇦🇺",
    image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&h=500&fit=crop",
    description: "World-class universities, vibrant cities, and excellent post-study work opportunities.",
    universities: ["University of Melbourne", "University of Sydney", "Monash University"],
    highlights: ["Post-study work visa", "Multicultural environment", "High quality of life"]
  },
  {
    name: "Singapore",
    flag: "🇸🇬",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=500&fit=crop",
    description: "Asia's education hub with world-renowned universities and a strategic location.",
    universities: ["NUS", "NTU", "SMU"],
    highlights: ["Close to Indonesia", "Safe environment", "Business hub"]
  },
  {
    name: "Malaysia",
    flag: "🇲🇾",
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&h=500&fit=crop",
    description: "Affordable quality education with cultural similarities and easy adaptation.",
    universities: ["University of Malaya", "Taylor's University", "Sunway University"],
    highlights: ["Affordable tuition", "Similar culture", "English medium"]
  },
  {
    name: "United Kingdom",
    flag: "🇬🇧",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=500&fit=crop",
    description: "Historic universities with globally recognized degrees and rich cultural experience.",
    universities: ["Oxford", "Cambridge", "Imperial College"],
    highlights: ["Prestigious degrees", "1-year Masters", "Graduate visa"]
  },
  {
    name: "USA",
    flag: "🇺🇸",
    image: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800&h=500&fit=crop",
    description: "Home to the world's top universities with diverse programs and research opportunities.",
    universities: ["MIT", "Stanford", "Harvard"],
    highlights: ["Research excellence", "Flexible curriculum", "OPT opportunities"]
  },
  {
    name: "Canada",
    flag: "🇨🇦",
    image: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&h=500&fit=crop",
    description: "Welcoming immigration policies, affordable education, and high quality of life.",
    universities: ["University of Toronto", "UBC", "McGill"],
    highlights: ["Immigration pathways", "Affordable fees", "Safe cities"]
  },
  {
    name: "Netherlands",
    flag: "🇳🇱",
    image: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=500&fit=crop",
    description: "Innovative education system with many English-taught programs in Europe's heart.",
    universities: ["TU Delft", "University of Amsterdam", "Erasmus University"],
    highlights: ["English programs", "Central Europe", "Work opportunities"]
  },
  {
    name: "New Zealand",
    flag: "🇳🇿",
    image: "https://images.unsplash.com/photo-1469521669194-babb45599def?w=800&h=500&fit=crop",
    description: "Beautiful landscapes, friendly people, and quality education in a safe environment.",
    universities: ["University of Auckland", "University of Otago", "Victoria University"],
    highlights: ["Post-study work", "Beautiful nature", "Friendly culture"]
  }
];

export default function Destinations() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="SpecTa Education" className="h-10 object-contain" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Home</Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About Us</Link>
            <Link href="/ielts" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">IELTS</Link>
            <Link href="/destinations" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Destinations</Link>
            <Link href="/articles" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Articles</Link>
            <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://wa.me/62819668278" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact
              </Button>
            </a>
            <Link href="/">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat with AI
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Globe className="w-4 h-4" />
              Study Abroad Destinations
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Perfect <span className="text-gradient-specta">Study Destination</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore top study destinations around the world. We'll help you find the best universities, scholarships, and opportunities that match your goals.
            </p>
          </div>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-12">
        <div className="container">
          <div className="space-y-16">
            {destinations.map((destination, index) => (
              <div key={index} className={`grid md:grid-cols-2 gap-8 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="relative overflow-hidden rounded-2xl aspect-[16/10]">
                    <img 
                      src={destination.image} 
                      alt={destination.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 text-4xl">{destination.flag}</div>
                  </div>
                </div>
                <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                  <h2 className="text-3xl font-bold mb-4">{destination.name}</h2>
                  <p className="text-muted-foreground mb-6">{destination.description}</p>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        Top Universities
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {destination.universities.map((uni, i) => (
                          <span key={i} className="px-3 py-1 bg-muted rounded-full text-sm">{uni}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Building className="w-4 h-4 text-primary" />
                        Highlights
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {destination.highlights.map((highlight, i) => (
                          <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">{highlight}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Link href="/">
                    <Button className="bg-primary hover:bg-primary/90">
                      Learn More About {destination.name}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="bg-gradient-specta rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Not Sure Which Country is Right for You?</h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-8">
              Chat with our AI assistant to get personalized recommendations based on your goals, budget, and preferences.
            </p>
            <Link href="/">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                <MessageCircle className="w-5 h-5 mr-2" />
                Get Personalized Advice
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <img src="/logo.jpeg" alt="SpecTa Education" className="h-12 object-contain brightness-0 invert" />
              <p className="text-sm text-background/70">
                Your trusted partner for international education and study abroad services.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/about" className="hover:text-background transition-colors">About Us</Link></li>
                <li><Link href="/ielts" className="hover:text-background transition-colors">IELTS</Link></li>
                <li><Link href="/destinations" className="hover:text-background transition-colors">Destinations</Link></li>
                <li><Link href="/contact" className="hover:text-background transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Destinations</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/destinations" className="hover:text-background transition-colors">Australia</Link></li>
                <li><Link href="/destinations" className="hover:text-background transition-colors">United Kingdom</Link></li>
                <li><Link href="/destinations" className="hover:text-background transition-colors">USA</Link></li>
                <li><Link href="/destinations" className="hover:text-background transition-colors">Canada</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-3 text-sm text-background/70">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Jl. Kelapa Nias Raya QE1 No. 14, Kelapa Gading, Jakarta Utara</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  <a href="tel:+62819668278" className="hover:text-background transition-colors">+62 819 668 278</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  <a href="mailto:info@spectaeducation.com" className="hover:text-background transition-colors">info@spectaeducation.com</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 mt-12 pt-8 text-center text-sm text-background/50">
            <p>&copy; {new Date().getFullYear()} SpecTa Education. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
