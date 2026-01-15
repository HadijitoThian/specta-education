import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, MessageCircle, Clock, Send } from "lucide-react";
import { useState } from "react";

const offices = [
  {
    name: "Head Office - Kelapa Gading",
    address: "Jl. Kelapa Nias Raya QE1 No. 14, Kelapa Gading, Jakarta Utara 14240",
    phone: "+62 819 668 278",
    hours: "Mon - Fri: 9:00 AM - 6:00 PM, Sat: 9:00 AM - 3:00 PM"
  },
  {
    name: "Branch Office - Gading Serpong",
    address: "Jl. Paramount Boulevard Gading Serpong Pisa Grande A ext. 11, Serpong, Tangerang 15810",
    phone: "+62 811 812 0203",
    hours: "Mon - Fri: 9:00 AM - 6:00 PM, Sat: 9:00 AM - 3:00 PM"
  },
  {
    name: "Branch Office - Pantai Indah Kapuk",
    address: "Ruko Galeri Niaga Jl. Pantai Indah Utara II Blok J No. 8 B, PIK",
    phone: "+62 811 812 0820",
    hours: "Mon - Fri: 9:00 AM - 6:00 PM, Sat: 9:00 AM - 3:00 PM"
  }
];

export default function Contact() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    destination: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to WhatsApp with form data
    const message = `Hi, I'm ${formData.firstName} ${formData.lastName}.\n\nEmail: ${formData.email}\nPhone: ${formData.phone}\nInterested in: ${formData.destination}\n\nMessage: ${formData.message}`;
    window.open(`https://wa.me/62819668278?text=${encodeURIComponent(message)}`, '_blank');
  };

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
            <Link href="/destinations" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Destinations</Link>
            <Link href="/articles" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Articles</Link>
            <Link href="/contact" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Contact</Link>
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
      <section className="pt-32 pb-12 px-4">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <MessageCircle className="w-4 h-4" />
              Get in Touch
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Contact <span className="text-gradient-specta">SpecTa Education</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Have questions about studying abroad? We're here to help! Reach out to us through any of our channels.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-12">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-card p-8 rounded-2xl shadow-sm border border-border">
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred Destination</label>
                  <select
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select a destination</option>
                    <option value="Australia">Australia</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Malaysia">Malaysia</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="USA">USA</option>
                    <option value="Canada">Canada</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Tell us about your study abroad goals..."
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="lg">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message via WhatsApp
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-6">Quick Contact</h2>
                <div className="space-y-4">
                  <a 
                    href="mailto:info@spectaeducation.com" 
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary transition-colors"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Email Us</div>
                      <div className="text-muted-foreground">info@spectaeducation.com</div>
                    </div>
                  </a>
                  <a 
                    href="https://wa.me/62819668278" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary transition-colors"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">WhatsApp</div>
                      <div className="text-muted-foreground">+62 819 668 278</div>
                    </div>
                  </a>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-6">Our Offices</h2>
                <div className="space-y-4">
                  {offices.map((office, index) => (
                    <div key={index} className="p-6 bg-card rounded-xl border border-border">
                      <h3 className="font-semibold mb-3">{office.name}</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                          <span>{office.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 shrink-0 text-primary" />
                          <a href={`tel:${office.phone.replace(/\s/g, '')}`} className="hover:text-foreground transition-colors">
                            {office.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 shrink-0 text-primary" />
                          <span>{office.hours}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="bg-gradient-specta rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Prefer to Chat Online?</h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-8">
              Our AI assistant is available 24/7 to answer your questions and help you get started on your study abroad journey.
            </p>
            <Link href="/">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat with SpecTa AI
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
