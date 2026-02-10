import { motion } from "framer-motion";

interface ChatBotButtonProps {
  onClick: () => void;
  className?: string;
}

/**
 * A cute Baymax-inspired floating chatbot button with "Ask SpecTa" label
 * Round white face, connected oval eyes, soft and approachable design
 */
export default function ChatBotButton({ onClick, className = "" }: ChatBotButtonProps) {
  return (
    <motion.div
      className={`fixed bottom-6 right-6 z-40 flex flex-col items-center gap-1.5 ${className}`}
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Label */}
      <motion.span
        className="text-[11px] font-bold text-primary tracking-wide whitespace-nowrap bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-md border border-primary/10"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        Ask SpecTa
      </motion.span>

      {/* Button with Baymax face */}
      <motion.button
        onClick={onClick}
        className="relative w-[68px] h-[68px] rounded-full bg-white shadow-xl hover:shadow-2xl transition-shadow overflow-visible group border-2 border-gray-100"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {/* Baymax Face SVG */}
        <svg viewBox="0 0 68 68" className="w-full h-full" fill="none">
          {/* Head - soft white circle with subtle gradient */}
          <defs>
            <radialGradient id="baymax-head" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F0F0F0" />
            </radialGradient>
            <linearGradient id="baymax-accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E53E3E" />
              <stop offset="100%" stopColor="#C53030" />
            </linearGradient>
          </defs>
          
          {/* Main head shape */}
          <circle cx="34" cy="34" r="32" fill="url(#baymax-head)" />
          
          {/* Subtle shine on top-left */}
          <ellipse cx="24" cy="22" rx="12" ry="8" fill="white" opacity="0.6" />
          
          {/* Eyes - Baymax signature connected oval eyes */}
          <g>
            {/* Left eye */}
            <ellipse cx="24" cy="30" rx="6" ry="6.5" fill="#1A1A1A" />
            <ellipse cx="24" cy="30" rx="4.5" ry="5" fill="#2D2D2D" />
            {/* Left eye shine */}
            <circle cx="22" cy="28" r="1.5" fill="#666" />
            
            {/* Right eye */}
            <ellipse cx="44" cy="30" rx="6" ry="6.5" fill="#1A1A1A" />
            <ellipse cx="44" cy="30" rx="4.5" ry="5" fill="#2D2D2D" />
            {/* Right eye shine */}
            <circle cx="42" cy="28" r="1.5" fill="#666" />
            
            {/* Eye bridge - the line connecting both eyes (Baymax signature) */}
            <line x1="29" y1="30" x2="39" y2="30" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          
          {/* Red accent badge - like Baymax's healthcare chip, but with SpecTa brand */}
          <circle cx="34" cy="46" r="5" fill="url(#baymax-accent)" />
          <text x="34" y="48" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold" fontFamily="sans-serif">S</text>
          
          {/* Subtle blush marks */}
          <ellipse cx="16" cy="36" rx="4" ry="2.5" fill="#FEB2B2" opacity="0.4" />
          <ellipse cx="52" cy="36" rx="4" ry="2.5" fill="#FEB2B2" opacity="0.4" />
        </svg>

        {/* Breathing animation - subtle scale pulse like Baymax */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/20"
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Hover glow */}
        <div className="absolute inset-0 rounded-full bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300" />
      </motion.button>
    </motion.div>
  );
}
