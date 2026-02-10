import { motion, AnimatePresence } from "framer-motion";

interface ChatBotButtonProps {
  onClick: () => void;
  className?: string;
}

/**
 * A cute Wall-E inspired floating chatbot button with "Ask SpecTa AI" label
 */
export default function ChatBotButton({ onClick, className = "" }: ChatBotButtonProps) {
  return (
    <motion.div
      className={`fixed bottom-6 right-6 z-40 flex flex-col items-center gap-1 ${className}`}
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Label */}
      <motion.span
        className="text-[10px] font-bold text-primary/80 tracking-wide whitespace-nowrap"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Ask SpecTa AI
      </motion.span>

      {/* Button with Wall-E robot */}
      <motion.button
        onClick={onClick}
        className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl hover:shadow-2xl transition-shadow overflow-hidden group"
        whileHover={{ scale: 1.1, rotate: [0, -3, 3, 0] }}
        whileTap={{ scale: 0.9 }}
      >
        {/* Robot Face SVG - Wall-E inspired */}
        <svg viewBox="0 0 64 64" className="w-full h-full p-1.5" fill="none">
          {/* Body/Head - rounded rectangle */}
          <rect x="12" y="16" width="40" height="32" rx="8" fill="#FFD93D" />
          <rect x="14" y="18" width="36" height="28" rx="6" fill="#FFF3B0" />
          
          {/* Eyes - binocular style like Wall-E */}
          <g>
            {/* Left eye housing */}
            <circle cx="24" cy="30" r="9" fill="#4A5568" />
            <circle cx="24" cy="30" r="7" fill="#2D3748" />
            <circle cx="24" cy="30" r="5.5" fill="#E2E8F0" />
            <circle cx="24" cy="29" r="3" fill="#1A202C" />
            <circle cx="25.5" cy="27.5" r="1.2" fill="white" />
            
            {/* Right eye housing */}
            <circle cx="40" cy="30" r="9" fill="#4A5568" />
            <circle cx="40" cy="30" r="7" fill="#2D3748" />
            <circle cx="40" cy="30" r="5.5" fill="#E2E8F0" />
            <circle cx="40" cy="29" r="3" fill="#1A202C" />
            <circle cx="41.5" cy="27.5" r="1.2" fill="white" />
            
            {/* Eye bridge */}
            <rect x="29" y="26" width="6" height="8" rx="2" fill="#4A5568" />
          </g>
          
          {/* Antenna */}
          <line x1="32" y1="16" x2="32" y2="8" stroke="#4A5568" strokeWidth="2" strokeLinecap="round" />
          <motion.circle
            cx="32" cy="7" r="3"
            fill="#48BB78"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          
          {/* Mouth - small happy curve */}
          <path d="M26 40 Q32 44 38 40" stroke="#4A5568" strokeWidth="2" fill="none" strokeLinecap="round" />
          
          {/* Treads/Tracks at bottom */}
          <rect x="10" y="48" width="18" height="6" rx="3" fill="#4A5568" />
          <rect x="36" y="48" width="18" height="6" rx="3" fill="#4A5568" />
          <rect x="12" y="49" width="14" height="4" rx="2" fill="#718096" />
          <rect x="38" y="49" width="14" height="4" rx="2" fill="#718096" />
        </svg>

        {/* Pulse ring on hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/30"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>
    </motion.div>
  );
}
