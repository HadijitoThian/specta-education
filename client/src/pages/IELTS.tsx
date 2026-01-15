import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, Clock, Users, Award, Phone, Mail, MapPin, MessageCircle, Star } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Expert Instructors",
    description: "Learn from certified IELTS trainers with years of experience and proven success rates."
  },
  {
    icon: BookOpen,
    title: "Comprehensive Materials",
    description: "Access to the latest IELTS preparation materials, practice tests, and study guides."
  },
  {
    icon: Clock,
    title: "Flexible Schedule",
    description: "Choose from various class schedules that fit your lifestyle - weekdays or weekends."
  },
  {
    icon: Award,
    title: "Proven Results",
    description: "Our students consistently achieve band scores of 6.5 and above."
  }
];

const testimonials = [
  {
    name: "Angie Y. A.",
    score: "8.0",
    quote: "I received an Overall Score of 8 on my actual IELTS test. If SpecTa teachers can enhance my skills, I don't know why else you should be worried about joining!"
  },
  {
    name: "Nabila Imanina",
    score: "7.0",
    quote: "I got 7.0 overall band score from 5.0 on Prediction Test. A very nice place to practice and learn about IELTS in an effective and efficient learning method."
  },
  {
    name: "Irvan Louis",
    score: "7.0",
    quote: "Thanks, SpecTa! I got an overall 7! Special thanks to Sir Fred, Ms Onny, Pak Paulus, Pak Al, and Mba Wulan."
  }
];

const packages = [
  {
    name: "IELTS Basic",
    duration: "4 Weeks",
    sessions: "16 Sessions",
    features: [
      "All 4 skills covered",
      "Practice tests included",
      "Small class size",
      "Study materials"
    ]
  },
  {
    name: "IELTS Intensive",
    duration: "8 Weeks",
    sessions: "32 Sessions",
    features: [
      "All 4 skills covered",
      "Weekly mock tests",
      "One-on-one feedback",
      "Speaking practice",
      "Writing correction"
    ],
    popular: true
  },
  {
    name: "IELTS Private",
    duration: "Flexible",
    sessions: "Custom",
    features: [
      "Personalized curriculum",
      "Flexible scheduling",
      "Focused improvement",
      "Unlimited questions",
      "Priority support"
    ]
  }
];

export default function IELTS() {
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
            <Link href="/ielts" className="text-sm font-medium text-foreground hover:text-primary transition-colors">IELTS</Link>
            <Link href="/destinations" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Destinations</Link>
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
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              IELTS Preparation
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Achieve Your Target <span className="text-gradient-specta">IELTS Score</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Comprehensive IELTS preparation with experienced instructors. Our proven methods have helped thousands of students achieve their target scores.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://wa.me/62819668278?text=Hi,%20I'm%20interested%20in%20IELTS%20preparation" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Register for IELTS Class
                </Button>
              </a>
              <Link href="/">
                <Button size="lg" variant="outline">
                  Free IELTS Consultation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose SpecTa IELTS?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our IELTS program is designed to help you succeed
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-card p-6 rounded-xl shadow-sm border border-border text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">IELTS Packages</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the package that best fits your needs and schedule
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {packages.map((pkg, index) => (
              <div 
                key={index} 
                className={`bg-card p-8 rounded-xl shadow-sm border ${pkg.popular ? 'border-primary ring-2 ring-primary' : 'border-border'} relative`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-primary">{pkg.duration}</span>
                  <span className="text-muted-foreground">• {pkg.sessions}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a href="https://wa.me/62819668278?text=Hi,%20I'm%20interested%20in%20the%20IELTS%20" target="_blank" rel="noopener noreferrer">
                  <Button className={`w-full ${pkg.popular ? 'bg-primary' : ''}`} variant={pkg.popular ? 'default' : 'outline'}>
                    Get Started
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Student Success Stories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hear from our students who achieved their target IELTS scores
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card p-8 rounded-xl shadow-sm border border-border">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">SpecTa Student</div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{testimonial.score}</div>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Ace Your IELTS?</h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-8">
              Join thousands of successful students who achieved their target scores with SpecTa Education.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://wa.me/62819668278?text=Hi,%20I%20want%20to%20register%20for%20IELTS%20class" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  Register Now
                </Button>
              </a>
              <Link href="/">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Free Consultation
                </Button>
              </Link>
            </div>
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
