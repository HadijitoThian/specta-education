import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Mic, MicOff, MessageCircle, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMascotAgent, MascotEmotion } from "@/contexts/MascotAgentContext";

interface SmartMascotProps {
  onChatOpen: () => void;
  className?: string;
}

// Mascot images for different emotions
const emotionImages: Record<MascotEmotion, string> = {
  neutral: "/mascot.png",
  happy: "/mascot.png",
  excited: "/mascot-celebrating.png",
  curious: "/mascot-thinking.png",
  supportive: "/mascot.png",
  celebrating: "/mascot-celebrating.png",
  thinking: "/mascot-thinking.png",
  waving: "/mascot-waving.png"
};

// Animation variants for different emotions
const emotionAnimations: Record<MascotEmotion, object> = {
  neutral: { y: [0, -5, 0], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
  happy: { rotate: [0, 3, -3, 0], transition: { duration: 0.5, repeat: Infinity } },
  excited: { scale: [1, 1.1, 1], transition: { duration: 0.3, repeat: Infinity } },
  curious: { rotate: [0, 10, 0], transition: { duration: 1.5, repeat: Infinity } },
  supportive: { y: [0, -3, 0], transition: { duration: 1.5, repeat: Infinity } },
  celebrating: { 
    y: [0, -15, 0], 
    rotate: [0, 5, -5, 0],
    transition: { duration: 0.5, repeat: Infinity } 
  },
  thinking: { 
    rotate: [0, -5, 0], 
    transition: { duration: 2, repeat: Infinity } 
  },
  waving: { 
    rotate: [0, 10, -5, 10, 0], 
    transition: { duration: 1, repeat: 2 } 
  }
};

export default function SmartMascot({ onChatOpen, className }: SmartMascotProps) {
  const {
    emotion,
    isVisible,
    isSpeaking,
    currentMessage,
    showBubble,
    updateUserContext,
    dismissCurrentTip
  } = useMascotAgent();

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("specta-voice-enabled") === "true";
    }
    return false;
  });
  const [isListening, setIsListening] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Toggle voice
  const toggleVoice = useCallback(() => {
    const newValue = !isVoiceEnabled;
    setIsVoiceEnabled(newValue);
    localStorage.setItem("specta-voice-enabled", String(newValue));
    
    if (!newValue && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [isVoiceEnabled]);

  // Handle mascot click
  const handleMascotClick = useCallback(() => {
    updateUserContext({ hasInteractedWithMascot: true });
    onChatOpen();
  }, [updateUserContext, onChatOpen]);

  // Handle speech recognition
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("Heard:", transcript);
      updateUserContext({ hasInteractedWithMascot: true });
      onChatOpen();
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Speech recognition error:", e);
    }
  }, [updateUserContext, onChatOpen]);

  // Quick action buttons
  const quickActions = [
    { label: "Study in Australia", icon: "🇦🇺", action: () => { window.location.href = "/destinations"; } },
    { label: "IELTS Help", icon: "📚", action: () => { window.location.href = "/ielts"; } },
    { label: "Talk to Counselor", icon: "💬", action: onChatOpen }
  ];

  if (!isVisible) return null;

  return (
    <div className={cn("fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3", className)}>
      {/* Quick Actions Menu */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white rounded-xl shadow-xl p-3 mb-2"
          >
            <div className="flex flex-col gap-2">
              {quickActions.map((action, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={action.action}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Controls */}
      <div className="flex gap-2">
        <Button
          size="icon"
          variant="outline"
          className="rounded-full bg-white shadow-lg h-10 w-10"
          onClick={toggleVoice}
          title={isVoiceEnabled ? "Disable voice" : "Enable voice"}
        >
          {isVoiceEnabled ? (
            <Volume2 className="w-4 h-4 text-primary" />
          ) : (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>

        <Button
          size="icon"
          variant="outline"
          className={cn(
            "rounded-full bg-white shadow-lg h-10 w-10",
            isListening && "bg-primary text-white"
          )}
          onClick={startListening}
          title="Voice input"
        >
          {isListening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>

        <Button
          size="icon"
          variant="outline"
          className={cn(
            "rounded-full bg-white shadow-lg h-10 w-10",
            showQuickActions && "bg-primary text-white"
          )}
          onClick={() => setShowQuickActions(!showQuickActions)}
          title="Quick actions"
        >
          <Sparkles className="w-4 h-4" />
        </Button>
      </div>

      {/* Speech Bubble */}
      <AnimatePresence>
        {showBubble && currentMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="bg-white rounded-2xl shadow-xl px-4 py-3 max-w-[220px] relative"
          >
            <button
              onClick={dismissCurrentTip}
              className="absolute -top-2 -right-2 w-6 h-6 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-sm font-medium text-foreground pr-4">{currentMessage}</p>
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white transform rotate-45 shadow-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Character */}
      <motion.div
        className="relative cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleMascotClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Glow effect */}
        <motion.div 
          className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
          animate={{ 
            scale: isSpeaking ? [1, 1.2, 1] : 1,
            opacity: isSpeaking ? [0.3, 0.6, 0.3] : 0.3
          }}
          transition={{ duration: 1, repeat: isSpeaking ? Infinity : 0 }}
        />

        {/* Online indicator */}
        <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white z-10">
          <span className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
        </div>

        {/* Mascot image with emotion-based animation */}
        <motion.div
          key={emotion}
          initial={{ opacity: 0.8, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            ...emotionAnimations[emotion]
          }}
          className="relative"
        >
          <img
            src={emotionImages[emotion]}
            alt="SpecTa AI Assistant"
            className="w-20 h-20 object-contain drop-shadow-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/mascot.png";
            }}
          />
        </motion.div>

        {/* Listening animation */}
        {isListening && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
            <div className="absolute inset-2 bg-primary/20 rounded-full animate-ping" style={{ animationDelay: "0.2s" }} />
          </motion.div>
        )}

        {/* Speaking animation - sound waves */}
        {isSpeaking && (
          <motion.div
            className="absolute -left-3 top-1/2 transform -translate-y-1/2 flex gap-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary rounded-full"
                animate={{ height: [8, 16, 8] }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Hover sparkle effect */}
        {isHovered && !isSpeaking && (
          <motion.div
            className="absolute -top-1 -right-1"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </motion.div>
        )}
      </motion.div>

      {/* Chat button */}
      <Button
        size="sm"
        className="bg-primary hover:bg-primary/90 shadow-lg rounded-full px-4"
        onClick={handleMascotClick}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Chat with me!
      </Button>
    </div>
  );
}
