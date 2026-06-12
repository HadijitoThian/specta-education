import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Mic, MicOff, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MascotState = "idle" | "waving" | "thinking" | "talking" | "listening" | "celebrating";

interface InteractiveMascotProps {
  onChatOpen: () => void;
  isVisible?: boolean;
  className?: string;
}

const mascotImages: Record<MascotState, string> = {
  idle: "/files/migrated/saxLOcubreWkfnzl.png",
  waving: "/files/migrated/CaSUALRPwpkQDDyz.png",
  thinking: "/files/migrated/mZzfiMupcbdtczPP.png",
  talking: "/files/migrated/hzbRrgiiMQYyvWTv.png",
  listening: "/files/migrated/XKmcLcwwCgIUrXwm.png",
  celebrating: "/files/migrated/mHfcoLTVeHOgtyJc.png"
};

// Speech bubble messages for different states
const speechBubbles: Record<MascotState, string[]> = {
  idle: [
    "Hi there! Click me to chat!",
    "Ready to explore study abroad?",
    "I'm here to help you!"
  ],
  waving: [
    "Hello! 👋",
    "Welcome to SpecTa!",
    "Nice to meet you!"
  ],
  thinking: [
    "Hmm, let me think...",
    "Good question!",
    "Interesting..."
  ],
  talking: [
    "Let me tell you about...",
    "Here's what I know...",
    "Great choice!"
  ],
  listening: [
    "I'm listening...",
    "Go ahead, I'm here!",
    "Tell me more!"
  ],
  celebrating: [
    "Awesome! 🎉",
    "You did it!",
    "Congratulations!"
  ]
};

export default function InteractiveMascot({ 
  onChatOpen, 
  isVisible = true,
  className 
}: InteractiveMascotProps) {
  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [speechText, setSpeechText] = useState("");
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = new SpeechSynthesisUtterance();
      speechSynthRef.current.rate = 1;
      speechSynthRef.current.pitch = 1.1;
      speechSynthRef.current.volume = 0.8;
      
      // Try to get a friendly voice
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
          v.name.includes('Google') || 
          v.name.includes('Female') ||
          v.name.includes('Samantha')
        );
        if (preferredVoice && speechSynthRef.current) {
          speechSynthRef.current.voice = preferredVoice;
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('Heard:', transcript);
          setIsListening(false);
          setMascotState("thinking");
          
          // After "hearing" something, open chat and pass the message
          setTimeout(() => {
            onChatOpen();
          }, 1000);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          setMascotState("idle");
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
          setMascotState("idle");
        };
      }
    }
  }, [onChatOpen]);

  // Speak text using Web Speech API
  const speak = useCallback((text: string) => {
    if (!isVoiceEnabled || !speechSynthRef.current) return;
    
    window.speechSynthesis.cancel();
    speechSynthRef.current.text = text;
    
    speechSynthRef.current.onstart = () => {
      setIsSpeaking(true);
      setMascotState("talking");
    };
    
    speechSynthRef.current.onend = () => {
      setIsSpeaking(false);
      setMascotState("idle");
    };
    
    window.speechSynthesis.speak(speechSynthRef.current);
  }, [isVoiceEnabled]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setMascotState("listening");
      setSpeechText("I'm listening...");
      setShowSpeechBubble(true);
    } catch (e) {
      console.error('Speech recognition error:', e);
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    setIsListening(false);
    setMascotState("idle");
  }, []);

  // Idle animation cycle
  useEffect(() => {
    if (mascotState === "idle" && isVisible) {
      const cycleIdleAnimations = () => {
        const states: MascotState[] = ["idle", "waving", "idle"];
        const randomState = states[Math.floor(Math.random() * states.length)];
        
        setMascotState(randomState);
        
        if (randomState !== "idle") {
          const messages = speechBubbles[randomState];
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          setSpeechText(randomMessage);
          setShowSpeechBubble(true);
          
          if (isVoiceEnabled) {
            speak(randomMessage);
          }
          
          setTimeout(() => {
            setShowSpeechBubble(false);
            setMascotState("idle");
          }, 3000);
        }
      };

      idleTimerRef.current = setTimeout(cycleIdleAnimations, 8000 + Math.random() * 4000);
    }

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [mascotState, isVisible, isVoiceEnabled, speak]);

  // Handle mascot click
  const handleMascotClick = () => {
    setMascotState("waving");
    const messages = speechBubbles.waving;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setSpeechText(randomMessage);
    setShowSpeechBubble(true);
    
    if (isVoiceEnabled) {
      speak(randomMessage);
    }
    
    setTimeout(() => {
      setShowSpeechBubble(false);
      onChatOpen();
    }, 1500);
  };

  // Handle hover
  const handleMouseEnter = () => {
    if (mascotState === "idle") {
      setMascotState("waving");
      setSpeechText("Hi there! 👋");
      setShowSpeechBubble(true);
    }
  };

  const handleMouseLeave = () => {
    if (mascotState === "waving" && !isSpeaking) {
      setMascotState("idle");
      setShowSpeechBubble(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={cn("fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2", className)}>
      {/* Voice Controls */}
      <div className="flex gap-2">
        <Button
          size="icon"
          variant="outline"
          className="rounded-full bg-white shadow-lg h-10 w-10"
          onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
          title={isVoiceEnabled ? "Disable voice" : "Enable voice"}
        >
          {isVoiceEnabled ? (
            <Volume2 className="w-4 h-4 text-primary" />
          ) : (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
        
        {recognitionRef.current && (
          <Button
            size="icon"
            variant="outline"
            className={cn(
              "rounded-full bg-white shadow-lg h-10 w-10",
              isListening && "bg-primary text-white"
            )}
            onClick={isListening ? stopListening : startListening}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>

      {/* Speech Bubble */}
      <AnimatePresence>
        {showSpeechBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="bg-white rounded-2xl shadow-lg px-4 py-3 max-w-[200px] relative"
          >
            <p className="text-sm font-medium text-foreground">{speechText}</p>
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white transform rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot */}
      <motion.div
        className="relative cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleMascotClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        
        {/* Online indicator */}
        <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white z-10" />
        
        {/* Mascot image with animation */}
        <motion.div
          key={mascotState}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: mascotState === "idle" ? [0, -5, 0] : 0
          }}
          transition={{ 
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 },
            y: { 
              duration: 2, 
              repeat: mascotState === "idle" ? Infinity : 0,
              ease: "easeInOut"
            }
          }}
          className="relative"
        >
          <img
            src={mascotImages[mascotState]}
            alt="SpecTa AI Assistant"
            className="w-20 h-20 object-contain drop-shadow-lg"
            onError={(e) => {
              // Fallback to default mascot if specific pose not found
              (e.target as HTMLImageElement).src = mascotImages.idle;
            }}
          />
        </motion.div>

        {/* Listening animation */}
        {isListening && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
            <div className="absolute inset-2 bg-primary/20 rounded-full animate-ping animation-delay-200" />
          </motion.div>
        )}

        {/* Speaking animation */}
        {isSpeaking && (
          <motion.div
            className="absolute -left-2 top-1/2 transform -translate-y-1/2 flex gap-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary rounded-full"
                animate={{ height: [8, 16, 8] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Chat button (alternative) */}
      <Button
        size="sm"
        className="bg-primary hover:bg-primary/90 shadow-lg rounded-full px-4"
        onClick={onChatOpen}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Chat with me!
      </Button>
    </div>
  );
}
