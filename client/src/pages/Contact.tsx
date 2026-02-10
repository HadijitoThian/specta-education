import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, MessageCircle, Clock, Send, X } from "lucide-react";
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import ChatBotButton from "@/components/ChatBotButton";
import { motion, AnimatePresence } from "framer-motion";

const offices = [
  {
    name: "Head Office - Kelapa Gading",
    address: "Jl. Kelapa Nias Raya QE1 No. 14, Kelapa Gading, Jakarta Utara 14240",
    phone: "+62 819 668 278",
    hours: "Mon - Fri: 10:00 AM - 6:00 PM, Sat: 10:00 AM - 2:00 PM",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=250&fit=crop"
  },
  {
    name: "Branch Office - Gading Serpong",
    address: "Jl. Paramount Boulevard Gading Serpong Pisa Grande A ext. 11, Serpong, Tangerang 15810",
    phone: "+62 811 812 0203",
    hours: "Mon - Fri: 10:00 AM - 6:00 PM, Sat: 10:00 AM - 2:00 PM",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=250&fit=crop"
  },
  {
    name: "Branch Office - Pantai Indah Kapuk",
    address: "Ruko Galeri Niaga Jl. Pantai Indah Utara II Blok J No. 8 B, PIK",
    phone: "+62 811 812 0820",
    hours: "Mon - Fri: 10:00 AM - 6:00 PM, Sat: 10:00 AM - 2:00 PM",
    image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=250&fit=crop"
  }
];

const destinations = [
  "Australia", "Singapore", "Malaysia", "United Kingdom", "USA", "Canada", "China", "Ireland", "New Zealand", "Netherlands"
];

export default function Contact() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    destinations: [] as string[],
    message: ""
  });
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleDestinationChange = (destination: string) => {
    setFormData(prev => ({
      ...prev,
      destinations: prev.destinations.includes(destination)
        ? prev.destinations.filter(d => d !== destination)
        : [...prev.destinations, destination]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Hi, I'm ${formData.firstName} ${formData.lastName}.\n\nEmail: ${formData.email}\nPhone: ${formData.phone}\nInterested in: ${formData.destinations.join(", ")}\n\nMessage: ${formData.message}`;
    window.open(`https://wa.me/62819668278?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="contact" />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4">
        <div className="container">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
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
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-12">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div 
              className="bg-card p-8 rounded-2xl shadow-sm border border-border"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
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
                  <label className="block text-sm font-medium mb-3">Preferred Destinations (select all that apply)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {destinations.map((destination) => (
                      <label 
                        key={destination} 
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.destinations.includes(destination)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.destinations.includes(destination)}
                          onChange={() => handleDestinationChange(destination)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium">{destination}</span>
                      </label>
                    ))}
                  </div>
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
            </motion.div>

            {/* Contact Info */}
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
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
                  <button 
                    onClick={() => setIsChatOpen(true)}
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary transition-colors w-full text-left"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Prefer to chat with AI Assistant?</div>
                      <div className="text-muted-foreground">Get instant answers 24/7</div>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Offices */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Our <span className="text-gradient-specta">Offices</span>
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {offices.map((office, index) => (
              <motion.div 
                key={index} 
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img 
                    src={office.image} 
                    alt={office.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-3">{office.name}</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                      <span>{office.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0 text-primary" />
                      <a href={`tel:${office.phone.replace(/\s/g, '')}`} className="hover:text-primary transition-colors">
                        {office.phone}
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                      <span>{office.hours}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
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
