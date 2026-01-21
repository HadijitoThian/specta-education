import { Link } from "wouter";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
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
              <li><Link href="/malaysia" className="hover:text-background transition-colors">Malaysia</Link></li>
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
  );
}
