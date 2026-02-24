import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Paperclip, X, FileText, Image as ImageIcon, RotateCcw, UserCircle, Phone } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { nanoid } from "nanoid";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type UploadedFile = {
  name: string;
  type: string;
  url: string;
};

type LeadCaptureState = "idle" | "ask_name" | "ask_phone" | "captured";

const STORAGE_KEY = "specta-chat-session-id";
const STORAGE_TIMESTAMP_KEY = "specta-chat-last-active";
const LEAD_NAME_KEY = "specta-lead-name";
const LEAD_PHONE_KEY = "specta-lead-phone";
const SESSION_EXPIRY_DAYS = 30;

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

function getSavedLeadState(): { name: string | null; phone: string | null } {
  if (typeof window === "undefined") return { name: null, phone: null };
  return {
    name: localStorage.getItem(LEAD_NAME_KEY),
    phone: localStorage.getItem(LEAD_PHONE_KEY),
  };
}

const GREETING_MESSAGE = "Hi there! 👋 I'm SpecTa, your friendly study abroad assistant. Before we start, could you tell me your name so I can help you better?";

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
- Phone: +62 811 8120 820
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
        const restored: Message[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...serverMessages.map(m => ({
            role: m.role as "system" | "user" | "assistant",
            content: m.content
          }))
        ];
        setMessages(restored);
        setUserMessageCount(serverMessages.filter(m => m.role === "user").length);
        setHistoryStatus("loaded");
      } else {
        setHistoryStatus("empty");
      }
    } else if (historyQuery.isError) {
      setHistoryStatus("error");
    }
  }, [historyQuery.data, historyQuery.isError, historyStatus]);

  // Send initial greeting for new users
  useEffect(() => {
    if (historyStatus === "loading") return;
    if (historyStatus === "loaded") return;

    const hasConversation = messages.some(m => m.role === "user" || m.role === "assistant");
    if (!hasConversation) {
      const timer = setTimeout(() => {
        // If lead already captured (from localStorage), show a personalized greeting
        if (leadCaptureState === "captured" && leadName) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `Welcome back, ${leadName}! 👋 Great to see you again. What would you like to explore about studying abroad today?`
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: GREETING_MESSAGE
          }]);
          setLeadCaptureState("ask_name");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
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
        content: "I apologize, but I'm having trouble connecting right now. Please try again or contact us directly at +62 811 8120 820."
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
    setSessionId(newId);
    setLeadName("");
    setLeadPhone("");
    setLeadCaptureState("idle");
    setUserMessageCount(0);
    setIntentSummarized(false);
    setMessages([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "assistant", content: GREETING_MESSAGE }
    ]);
    setUploadedFiles([]);
    setHistoryStatus("loaded");
    setTimeout(() => setLeadCaptureState("ask_name"), 100);
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
  const handleLeadNameSubmit = () => {
    const name = input.trim();
    if (!name) return;

    setLeadName(name);
    setInput("");
    localStorage.setItem(LEAD_NAME_KEY, name);

    // Show user message
    setMessages(prev => [...prev, { role: "user", content: name }]);

    // Ask for phone
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Nice to meet you, ${name}! 😊 Could you share your phone or WhatsApp number? This way, one of our counselors can reach out to help you personally. (You can type "skip" if you prefer not to share)`
      }]);
      setLeadCaptureState("ask_phone");
    }, 500);
  };

  const handleLeadPhoneSubmit = () => {
    const phone = input.trim();
    if (!phone) return;

    setInput("");

    const isSkipped = phone.toLowerCase() === "skip" || phone.toLowerCase() === "no" || phone.toLowerCase() === "later";

    if (!isSkipped) {
      setLeadPhone(phone);
      localStorage.setItem(LEAD_PHONE_KEY, phone);
    }

    // Show user message
    setMessages(prev => [...prev, { role: "user", content: phone }]);

    // Capture lead
    captureLeadMutation.mutate({
      sessionId,
      name: leadName,
      phone: isSkipped ? undefined : phone,
      isAnonymous: isSkipped
    });

    setLeadCaptureState("captured");

    // Show transition message
    setTimeout(() => {
      const msg = isSkipped
        ? `No worries at all, ${leadName}! You can always share it later. Now, what brings you here today? Are you thinking about studying abroad? 🌏`
        : `Awesome, thanks ${leadName}! Our team will be in touch. Now let's explore your study abroad options! What country or field of study are you interested in? 🎓`;
      setMessages(prev => [...prev, { role: "assistant", content: msg }]);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Handle lead capture flow
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

    chatMutation.mutate({
      sessionId,
      message: trimmedInput,
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

  // Determine placeholder text based on lead capture state
  const getPlaceholder = () => {
    switch (leadCaptureState) {
      case "ask_name": return "Enter your name...";
      case "ask_phone": return "Enter your phone/WhatsApp number (or type 'skip')...";
      default: return "Type your message...";
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
