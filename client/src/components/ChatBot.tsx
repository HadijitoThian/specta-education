import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Paperclip, X, FileText, Image as ImageIcon, RotateCcw, UserCircle, Phone } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { nanoid } from "nanoid";
import { markChatbotEngaged, markFormCompleted } from "@/hooks/useVisitorTracking";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type UploadedFile = {
  name: string;
  type: string;
  url: string;
};

type LeadCaptureState =
  | "idle"
  | "ask_language"
  | "ask_name"
  | "ask_phone"
  | "captured";

type LeadLanguage = "en" | "id";

const STORAGE_KEY = "specta-chat-session-id";
const STORAGE_TIMESTAMP_KEY = "specta-chat-last-active";
const LEAD_NAME_KEY = "specta-lead-name";
const LEAD_PHONE_KEY = "specta-lead-phone";
const LEAD_LANGUAGE_KEY = "specta-lead-language";
const SESSION_EXPIRY_DAYS = 30;

// All bot copy lives here so it can switch language cleanly.
const COPY = {
  en: {
    intro:
      "Hello, my name is Emma, SpecTa's AI Counselor. 👋 Before we begin — would you like to chat in English or Bahasa Indonesia?",
    askName: "Great! What's your name?",
    reAskName: "I'd love to know your name — what should I call you?",
    askPhone: (name: string) =>
      `Nice to meet you, ${name}! 😊 Could you share your phone or WhatsApp number? This way, one of our counselors can reach out to help you personally.`,
    welcomeAfterCapture: (name: string) =>
      `Awesome, thanks ${name}! 🎉 What can we plan together for your studies abroad? Tell me what you're thinking — any country, subject, or budget in mind?`,
    welcomeBack: (name: string) =>
      `Welcome back, ${name}! 👋 Great to see you again. What would you like to explore today?`,
    placeholderName: "Enter your name...",
    placeholderPhone: "Enter your phone/WhatsApp number...",
    placeholderChat: "Type your message...",
  },
  id: {
    intro:
      "Halo, nama saya Emma, AI Counselor dari SpecTa. 👋 Sebelum kita mulai — kamu mau ngobrol pakai bahasa apa, English atau Bahasa Indonesia?",
    askName: "Sip! Kenalan dulu yuk — siapa nama kamu?",
    reAskName: "Aku pengen tahu nama kamu — boleh kasih tahu? 😊",
    askPhone: (name: string) =>
      `Salam kenal, ${name}! 😊 Boleh share nomor WhatsApp atau telepon kamu? Nanti tim konselor kami bisa reach out langsung buat bantu kamu.`,
    welcomeAfterCapture: (name: string) =>
      `Makasih, ${name}! 🎉 Apa yang bisa kita planning bareng buat study kamu? Cerita aja — mau ke negara mana, jurusan apa, atau ada budget khusus?`,
    welcomeBack: (name: string) =>
      `Selamat datang kembali, ${name}! 👋 Senang ketemu lagi. Mau eksplor apa hari ini?`,
    placeholderName: "Ketik nama kamu...",
    placeholderPhone: "Ketik nomor WhatsApp / telepon...",
    placeholderChat: "Ketik pesan kamu...",
  },
} as const;

function getOrCreateSessionId(): { id: string; isExisting: boolean } {
  if (typeof window === "undefined") return { id: nanoid(), isExisting: false };

  const stored = localStorage.getItem(STORAGE_KEY);
  const lastActive = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

  if (stored && lastActive) {
    const daysSinceActive = (Date.now() - parseInt(lastActive, 10)) / (1000 * 60 * 60 * 24);
    if (daysSinceActive > SESSION_EXPIRY_DAYS) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      localStorage.removeItem(LEAD_NAME_KEY);
      localStorage.removeItem(LEAD_PHONE_KEY);
      localStorage.removeItem(LEAD_LANGUAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
      return { id: stored, isExisting: true };
    }
  }

  const newId = nanoid();
  localStorage.setItem(STORAGE_KEY, newId);
  localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  return { id: newId, isExisting: false };
}

function getSavedLeadState(): {
  name: string | null;
  phone: string | null;
  language: LeadLanguage | null;
} {
  if (typeof window === "undefined")
    return { name: null, phone: null, language: null };
  const lang = localStorage.getItem(LEAD_LANGUAGE_KEY);
  return {
    name: localStorage.getItem(LEAD_NAME_KEY),
    phone: localStorage.getItem(LEAD_PHONE_KEY),
    language: lang === "en" || lang === "id" ? lang : null,
  };
}

const SYSTEM_PROMPT = `You are SpecTa, a friendly and professional AI education consultant for SpecTa Education, an Indonesian study abroad consultancy. Your personality is warm, helpful, and knowledgeable - like a caring mentor who genuinely wants to help students achieve their dreams of studying abroad.

Your goals are:
1. Help students explore study abroad options (Australia, Singapore, Malaysia, UK, USA, Canada, Netherlands, New Zealand)
2. Understand their educational background, goals, and preferences
3. Provide information about universities, programs, and requirements
4. Guide them through the application process
5. Encourage document uploads (passport, transcripts, certificates) when appropriate

Conversation flow:
- Start by warmly greeting and asking about their study abroad interests
- Ask about their preferred country and field of study
- Inquire about their current education level and when they plan to start
- Discuss budget and scholarship options if relevant
- Suggest uploading documents when they're ready to start the application process

Important guidelines:
- Be conversational and friendly, not robotic
- Use simple, clear language
- Keep replies SHORT: 2-3 sentences max per message
- Ask ONE question at a time
- Provide helpful information but encourage them to speak with human counselors for detailed advice
- Celebrate their decision to study abroad - it's an exciting journey!

Contact information for SpecTa Education:
- Main Office: Jl. Kelapa Nias Raya QE1 No. 14, Kelapa Gading, Jakarta Utara
- Phone: +62 818 218 388
- Email: info@spectaeducation.com`;

export default function ChatBot() {
  const [sessionInfo] = useState(() => getOrCreateSessionId());
  const [sessionId, setSessionId] = useState(sessionInfo.id);
  const [isReturningUser] = useState(sessionInfo.isExisting);

  // Lead capture state
  const [savedLead] = useState(() => getSavedLeadState());
  const [leadCaptureState, setLeadCaptureState] = useState<LeadCaptureState>(
    savedLead.name ? "captured" : "idle"
  );
  const [leadName, setLeadName] = useState(savedLead.name || "");
  const [leadPhone, setLeadPhone] = useState(savedLead.phone || "");
  const [leadLanguage, setLeadLanguage] = useState<LeadLanguage>(
    savedLead.language ?? "en"
  );
  const copy = COPY[leadLanguage];
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [intentSummarized, setIntentSummarized] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: SYSTEM_PROMPT }
  ]);
  const [input, setInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<"loading" | "loaded" | "empty" | "error">(
    isReturningUser ? "loading" : "empty"
  );
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch history for returning users
  const historyQuery = trpc.chat.getHistory.useQuery(
    { sessionId },
    {
      enabled: isReturningUser && historyStatus === "loading",
      retry: 1,
      staleTime: Infinity,
    }
  );

  // Process history query result
  useEffect(() => {
    if (historyStatus !== "loading") return;

    if (historyQuery.data) {
      const serverMessages = historyQuery.data.messages;
      // Restore lead state from server
      if (historyQuery.data.leadState) {
        const { name, phone } = historyQuery.data.leadState;
        if (name) {
          setLeadName(name);
          setLeadCaptureState("captured");
          localStorage.setItem(LEAD_NAME_KEY, name);
          if (phone) {
            setLeadPhone(phone);
            localStorage.setItem(LEAD_PHONE_KEY, phone);
          }
        }
      }

      if (serverMessages.length > 0) {
        // Restore all previous messages and add a welcome back note
        const restored: Message[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...serverMessages.map(m => ({
            role: m.role as "system" | "user" | "assistant",
            content: m.content
          })),
          { role: "assistant", content: `Welcome back${historyQuery.data.leadState?.name ? `, ${historyQuery.data.leadState.name}` : ""}! 👋 Here's our previous conversation. How can I help you today?` }
        ];
        setMessages(restored);
        setUserMessageCount(serverMessages.filter(m => m.role === "user").length);
        setHistoryStatus("loaded");
      } else {
        // No messages found on server, but lead state exists in localStorage
        setHistoryStatus("empty");
      }
    } else if (historyQuery.isError) {
      console.error("Failed to load chat history:", historyQuery.error);
      setHistoryStatus("error");
    }
  }, [historyQuery.data, historyQuery.isError, historyStatus]);

  // Send initial greeting for new users or when history is empty/errored
  useEffect(() => {
    if (historyStatus === "loading") return;
    if (historyStatus === "loaded") return;

    // Don't show greeting if messages already have user/assistant content (prevents race conditions)
    const hasConversation = messages.some(m => m.role === "user" || m.role === "assistant");
    if (hasConversation) return;

    const timer = setTimeout(() => {
      // Double-check messages haven't been updated by another effect
      setMessages(prev => {
        const alreadyHasContent = prev.some(m => m.role === "user" || m.role === "assistant");
        if (alreadyHasContent) return prev;

        // If lead already captured (from localStorage), show a personalized greeting
        if (leadCaptureState === "captured" && leadName) {
          return [...prev, {
            role: "assistant" as const,
            content: COPY[leadLanguage].welcomeBack(leadName),
          }];
        } else {
          // New user — start with the bilingual intro and ask for language.
          setLeadCaptureState("ask_language");
          return [...prev, {
            role: "assistant" as const,
            // Bilingual intro lives in COPY but is identical for both langs at this stage.
            content: COPY.en.intro,
          }];
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [historyStatus]);

  const chatMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (response) => {
      if (response.message) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: response.message
        }]);
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting right now. Please try again or contact us directly at +62 818 218 388."
      }]);
    }
  });

  const captureLeadMutation = trpc.chat.captureLead.useMutation();
  const summarizeIntentMutation = trpc.chat.summarizeIntent.useMutation();

  const uploadMutation = trpc.chat.uploadDocument.useMutation({
    onSuccess: (response) => {
      if (response.success && response.document) {
        setUploadedFiles(prev => [...prev, {
          name: response.document!.fileName,
          type: response.document!.fileType,
          url: response.document!.fileUrl
        }]);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Great! I've received your document "${response.document!.fileName}". Our team will review it as part of your application. Is there anything else you'd like to upload or discuss?`
        }]);
      }
      setIsUploading(false);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, there was an issue uploading your document. Please try again or email it directly to info@spectaeducation.com."
      }]);
      setIsUploading(false);
    }
  });

  // Trigger intent summarization after 3+ user messages
  useEffect(() => {
    if (userMessageCount >= 3 && !intentSummarized && leadCaptureState === "captured") {
      setIntentSummarized(true);
      summarizeIntentMutation.mutate({ sessionId });
    }
  }, [userMessageCount, intentSummarized, leadCaptureState, sessionId]);

  const handleStartFresh = useCallback(() => {
    const newId = nanoid();
    localStorage.setItem(STORAGE_KEY, newId);
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
    localStorage.removeItem(LEAD_NAME_KEY);
    localStorage.removeItem(LEAD_PHONE_KEY);
    localStorage.removeItem(LEAD_LANGUAGE_KEY);
    setSessionId(newId);
    setLeadName("");
    setLeadPhone("");
    setLeadLanguage("en");
    setLeadCaptureState("idle");
    setUserMessageCount(0);
    setIntentSummarized(false);
    setMessages([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "assistant", content: COPY.en.intro },
    ]);
    setUploadedFiles([]);
    setHistoryStatus("loaded");
    setTimeout(() => setLeadCaptureState("ask_language"), 100);
  }, []);

  const displayMessages = messages.filter((msg) => msg.role !== "system");

  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement;

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle lead capture flow

  const pickLanguage = (lang: LeadLanguage) => {
    setLeadLanguage(lang);
    localStorage.setItem(LEAD_LANGUAGE_KEY, lang);
    const next = COPY[lang];
    setMessages(prev => [
      ...prev,
      { role: "user", content: lang === "id" ? "Bahasa Indonesia" : "English" },
      { role: "assistant", content: next.askName },
    ]);
    setLeadCaptureState("ask_name");
  };

  // Allow the user to TYPE their language too (e.g. "english", "bahasa").
  const handleLeadLanguageSubmit = () => {
    const raw = input.trim().toLowerCase();
    if (!raw) return;
    setInput("");
    if (/(english|en|inggris)/.test(raw)) {
      pickLanguage("en");
      return;
    }
    if (/(bahasa|indonesia|indo|id)/.test(raw)) {
      pickLanguage("id");
      return;
    }
    // Unrecognized — echo and re-prompt (in English, since we don't know yet).
    setMessages(prev => [
      ...prev,
      { role: "user", content: input.trim() },
      {
        role: "assistant",
        content:
          "Please pick a language so I can help in the right one — English or Bahasa Indonesia? 🙂",
      },
    ]);
  };

  const handleLeadNameSubmit = () => {
    const name = input.trim();
    if (!name) return;

    // Reject obvious non-names: greetings, single letters, pure numbers,
    // very short strings. Re-ask instead of mistaking "halo" for a name.
    const lower = name.toLowerCase();
    const greetings = new Set([
      "halo", "hai", "hi", "hello", "helo", "hey", "yo", "hola",
      "salam", "assalamualaikum", "p", "test", "ok", "okay",
      "ya", "yes", "no", "thx", "thanks",
    ]);
    const looksLikeGreeting = greetings.has(lower);
    const tooShort = name.length < 2;
    const noLetters = !/[A-Za-zĀ-žÀ-ɏ]/.test(name);

    if (looksLikeGreeting || tooShort || noLetters) {
      // Echo their message, then re-ask for name in the chosen language.
      setInput("");
      setMessages(prev => [
        ...prev,
        { role: "user", content: name },
        {
          role: "assistant",
          content: copy.reAskName,
        },
      ]);
      return; // Stay in "ask_name" state.
    }

    setLeadName(name);
    setInput("");
    localStorage.setItem(LEAD_NAME_KEY, name);

    // Show user message
    setMessages(prev => [...prev, { role: "user", content: name }]);

    // Ask for phone (in chosen language)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: copy.askPhone(name),
      }]);
      setLeadCaptureState("ask_phone");
    }, 500);
  };

  const handleLeadPhoneSubmit = () => {
    const phone = input.trim();
    if (!phone) return;

    setInput("");

    // Detect if the response looks like a phone number (contains mostly digits)
    const digitsOnly = phone.replace(/[\s\-\+\(\)]/g, '');
    const looksLikePhone = /^\d{7,15}$/.test(digitsOnly);

    // Show user message
    setMessages(prev => [...prev, { role: "user", content: phone }]);

    if (looksLikePhone) {
      // It's a phone number — save it
      setLeadPhone(phone);
      localStorage.setItem(LEAD_PHONE_KEY, phone);

      captureLeadMutation.mutate({
        sessionId,
        name: leadName,
        phone: phone,
        isAnonymous: false
      });

      // Mark form completed for visitor tracking
      markFormCompleted();
      setLeadCaptureState("captured");

      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: copy.welcomeAfterCapture(leadName),
        }]);
      }, 500);
    } else {
      // Not a phone number — they want to chat directly, capture as anonymous lead
      captureLeadMutation.mutate({
        sessionId,
        name: leadName,
        isAnonymous: true
      });

      setLeadCaptureState("captured");

      // Treat their message as the first real chat message and send to AI
      const userMessage: Message = { role: "user", content: phone };
      const newMessages = [...messages, userMessage];
      setUserMessageCount(prev => prev + 1);

      chatMutation.mutate({
        sessionId,
        message: phone,
        language: leadLanguage,
        conversationHistory: newMessages.map(m => ({ role: m.role, content: m.content }))
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Handle lead capture flow
    if (leadCaptureState === "ask_language") {
      handleLeadLanguageSubmit();
      return;
    }
    if (leadCaptureState === "ask_name") {
      handleLeadNameSubmit();
      return;
    }
    if (leadCaptureState === "ask_phone") {
      handleLeadPhoneSubmit();
      return;
    }

    // Normal chat flow
    if (chatMutation.isPending) return;

    const userMessage: Message = { role: "user", content: trimmedInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setUserMessageCount(prev => prev + 1);

    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());

    // Mark chatbot engagement for visitor tracking
    markChatbotEngaged();

    chatMutation.mutate({
      sessionId,
      message: trimmedInput,
      language: leadLanguage,
      conversationHistory: newMessages.map(m => ({ role: m.role, content: m.content }))
    });

    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      uploadMutation.mutate({
        sessionId,
        fileName: file.name,
        fileType: file.type,
        fileData: base64,
        documentType: file.type.includes('image') ? 'other' : 
                      file.name.toLowerCase().includes('passport') ? 'passport' :
                      file.name.toLowerCase().includes('transcript') ? 'transcript' :
                      'other'
      });
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isLoading = historyStatus === "loading";

  // Determine placeholder text based on lead capture state.
  const getPlaceholder = () => {
    switch (leadCaptureState) {
      case "ask_language": return "English or Bahasa Indonesia?";
      case "ask_name": return copy.placeholderName;
      case "ask_phone": return copy.placeholderPhone;
      default: return copy.placeholderChat;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header with lead info and Start Fresh */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/30">
        {leadCaptureState === "captured" && leadName ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCircle className="w-3.5 h-3.5 text-green-500" />
            <span>Chatting as <strong className="text-foreground">{leadName}</strong></span>
            {leadPhone && (
              <>
                <span className="mx-1">·</span>
                <Phone className="w-3 h-3" />
                <span>{leadPhone}</span>
              </>
            )}
          </div>
        ) : (
          <div />
        )}
        {displayMessages.length > 2 && (
          <button
            onClick={handleStartFresh}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
            title="Start a new conversation"
          >
            <RotateCcw className="w-3 h-3" />
            Start Fresh
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col space-y-4 p-4">
            {/* Loading history indicator */}
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Loading conversation...</span>
              </div>
            )}

            {/* Welcome back indicator for returning users */}
            {historyStatus === "loaded" && displayMessages.length > 0 && isReturningUser && (
              <div className="flex items-center justify-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  Welcome back{leadName ? `, ${leadName}` : ''}! Here's your previous conversation
                </span>
              </div>
            )}

            {displayMessages.map((message, index) => (
              <div
                key={`${sessionId}-${index}`}
                className={cn(
                  "flex gap-3",
                  message.role === "user"
                    ? "justify-end items-start"
                    : "justify-start items-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="size-8 shrink-0 mt-1 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/saxLOcubreWkfnzl.png" alt="SpecTa" className="w-full h-full object-cover" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2.5",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Streamdown>{message.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </p>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="size-8 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                    <User className="size-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {(chatMutation.isPending || isUploading) && (
              <div className="flex items-start gap-3">
                <div className="size-8 shrink-0 mt-1 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/saxLOcubreWkfnzl.png" alt="SpecTa" className="w-full h-full object-cover" />
                </div>
                <div className="rounded-lg bg-muted px-4 py-2.5">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Language picker — only shown while we're waiting for the user
          to choose English or Bahasa Indonesia. Users can also type it. */}
      {leadCaptureState === "ask_language" && (
        <div className="flex gap-2 px-4 pt-3">
          <button
            type="button"
            onClick={() => pickLanguage("en")}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition"
          >
            🇬🇧 English
          </button>
          <button
            type="button"
            onClick={() => pickLanguage("id")}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition"
          >
            🇮🇩 Bahasa Indonesia
          </button>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/50">
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-background rounded-md px-2 py-1 text-xs">
                {file.type.includes('image') ? (
                  <ImageIcon className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <FileText className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="truncate max-w-[100px]">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t bg-background/50 items-end"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
        />
        {leadCaptureState === "captured" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="shrink-0 h-[38px] w-[38px]"
          >
            <Paperclip className="size-4" />
          </Button>
        )}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className="flex-1 max-h-32 resize-none min-h-9"
          rows={1}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || chatMutation.isPending}
          className="shrink-0 h-[38px] w-[38px]"
        >
          {chatMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
