import { motion } from "framer-motion";

interface ChatBotButtonProps {
  onClick: () => void;
  className?: string;
}

const MASCOT_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/ZTneyTCDMaRFZnSd.png";

/**
 * A cute full-body chibi mascot floating chatbot button with "Ask SpecTa" label
 * Features gentle up-and-down bobbing animation with shadow effect
 */
export default function ChatBotButton({ onClick, className = "" }: ChatBotButtonProps) {
  return (
    <motion.div
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-center ${className}`}
      initial={{ opacity: 0, scale: 0, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Floating mascot container with bobbing animation */}
      <motion.button
        onClick={onClick}
        className="relative flex flex-col items-center gap-0 group cursor-pointer bg-transparent border-none outline-none"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        {/* Mascot image with floating bob */}
        <motion.div
          className="relative"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <img
            src={MASCOT_URL}
            alt="SpecTa AI Assistant"
            className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] object-contain drop-shadow-lg select-none pointer-events-none"
            draggable={false}
          />
        </motion.div>

        {/* Shadow underneath that grows/shrinks with the bob */}
        <motion.div
          className="w-[50px] sm:w-[60px] h-[8px] rounded-[50%] bg-black/15 blur-[2px] mt-[-4px]"
          animate={{
            scaleX: [1, 0.75, 1],
            scaleY: [1, 0.6, 1],
            opacity: [0.2, 0.1, 0.2],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* "Ask SpecTa" label */}
        <motion.span
          className="mt-1 text-[10px] sm:text-[11px] font-bold text-primary tracking-wide whitespace-nowrap bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-md border border-primary/10"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          Ask SpecTa
        </motion.span>
      </motion.button>
    </motion.div>
  );
}
