import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AICounselorAssistantProps {
  leadId: number;
  studentName: string;
  preferredCountry?: string | null;
  studyLevel?: string | null;
  programInterest?: string | null;
}

const QUICK_ACTIONS = [
  { id: "prep", label: "📋 Prep Brief", description: "Get consultation briefing" },
  { id: "whatsapp_followup", label: "💬 WA Follow-up", description: "Draft WhatsApp follow-up" },
  { id: "whatsapp_welcome", label: "👋 WA Welcome", description: "Draft welcome message" },
  { id: "email_followup", label: "📧 Email Follow-up", description: "Draft follow-up email" },
  { id: "next_action", label: "🎯 Next Action", description: "AI recommends what to do next" },
  { id: "university_fit", label: "🎓 Uni Fit", description: "Analyze university matches" },
];

export default function AICounselorAssistant({ leadId, studentName, preferredCountry, studyLevel, programInterest }: AICounselorAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from DB
  const { data: historyData } = trpc.crm.getChatHistory.useQuery(
    { leadId },
    { enabled: !!leadId }
  );
  const clearHistoryMutation = trpc.crm.clearChatHistory.useMutation({
    onSuccess: () => {
      setMessages([{ role: "assistant", content: `Riwayat chat dihapus. Halo! Saya siap membantu Anda mengelola kasus **${studentName}**.`, timestamp: new Date() }]);
    },
  });

  useEffect(() => {
    if (historyData && !historyLoaded) {
      setHistoryLoaded(true);
      if (historyData.history && historyData.history.length > 0) {
        const loaded: Message[] = historyData.history.map((h: any) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
          timestamp: new Date(h.createdAt),
        }));
        setMessages(loaded);
      } else {
        setMessages([{ role: "assistant", content: `Halo! Saya adalah AI Assistant untuk konselor SpecTa Education. Saya siap membantu Anda mengelola kasus **${studentName}**.\n\nGunakan tombol cepat di atas atau tanyakan apa saja tentang siswa ini — mulai dari rekomendasi universitas, draft pesan WhatsApp/email, hingga strategi follow-up terbaik.`, timestamp: new Date() }]);
      }
    }
  }, [historyData, historyLoaded, studentName]);

  const consultationPrepMutation = trpc.crm.aiConsultationPrep.useMutation();
  const draftMessageMutation = trpc.crm.aiDraftMessage.useMutation();
  const nextActionMutation = trpc.crm.aiNextAction.useMutation();
  const universityFitMutation = trpc.crm.aiUniversityFit.useMutation();
  const chatMutation = trpc.crm.aiChat.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role: "user" | "assistant", content: string, persist = true) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
    // Persist to DB via the aiChat mutation which now saves history server-side
  };

  const handleQuickAction = async (actionId: string) => {
    setActiveQuickAction(actionId);
    setIsLoading(true);

    try {
      if (actionId === "prep") {
        addMessage("user", "📋 Buatkan briefing persiapan konsultasi untuk siswa ini.");
        const result = await consultationPrepMutation.mutateAsync({ leadId });
        if (result.success) {
          addMessage("assistant", result.briefing as string);
        } else {
          addMessage("assistant", `Maaf, terjadi kesalahan: ${result.error}`);
        }
      } else if (actionId === "next_action") {
        addMessage("user", "🎯 Apa tindakan terbaik yang harus saya lakukan sekarang untuk siswa ini?");
        const result = await nextActionMutation.mutateAsync({ leadId });
        if (result.success && result.recommendation) {
          const rec = result.recommendation as any;
          const urgencyColor = rec.urgency === "high" ? "🔴" : rec.urgency === "medium" ? "🟡" : "🟢";
          const formatted = `**${urgencyColor} Prioritas: ${rec.urgency?.toUpperCase()}**\n\n**Tindakan:** ${rec.action}\n\n**Alasan:** ${rec.reason}\n\n**Script pembuka:**\n> ${rec.script}\n\n**Kapan:** ${rec.dueIn}`;
          addMessage("assistant", formatted);
        } else {
          addMessage("assistant", `Maaf, terjadi kesalahan: ${result.error}`);
        }
      } else if (actionId === "university_fit") {
        addMessage("user", `🎓 Analisis universitas yang cocok untuk ${studentName} (${preferredCountry || "semua negara"}, ${studyLevel || "semua jenjang"}).`);
        const result = await universityFitMutation.mutateAsync({ leadId });
        if (result.success && result.analysis) {
          const a = result.analysis as any;
          const formatted = `**🏆 Pilihan Utama: ${a.topPick?.university}** (${a.topPick?.country})\n*${a.topPick?.program}* — Fit Score: ${a.topPick?.fitScore}%\n${a.topPick?.reason}\nDeadline: ${a.topPick?.deadline}\n\n**Alternatif:**\n${a.alternatives?.map((alt: any) => `• **${alt.university}** (${alt.country}) — ${alt.fitScore}% fit\n  ${alt.program}: ${alt.reason}`).join("\n")}\n\n**Safety Option:** ${a.safetyOption?.university} (${a.safetyOption?.country}) — ${a.safetyOption?.fitScore}% fit\n\n**Beasiswa:** ${a.scholarshipOpportunities?.join(", ")}\n\n💡 **Tips Konselor:** ${a.counselorTip}`;
          addMessage("assistant", formatted);
        } else {
          addMessage("assistant", `Maaf, terjadi kesalahan: ${result.error}`);
        }
      } else {
        // Message drafting
        const typeLabel: Record<string, string> = {
          whatsapp_followup: "💬 Draft WhatsApp follow-up",
          whatsapp_welcome: "👋 Draft pesan sambutan WhatsApp",
          email_followup: "📧 Draft email follow-up",
          email_offer: "📧 Draft email penawaran",
          email_reminder: "📧 Draft email reminder",
        };
        addMessage("user", `${typeLabel[actionId] || "Draft pesan"} untuk ${studentName}.`);
        const result = await draftMessageMutation.mutateAsync({ leadId, messageType: actionId as any });
        if (result.success) {
          addMessage("assistant", `**Draft ${typeLabel[actionId] || "Pesan"}:**\n\n${result.message}`);
        } else {
          addMessage("assistant", `Maaf, terjadi kesalahan: ${result.error}`);
        }
      }
    } catch (e: any) {
      addMessage("assistant", `Terjadi kesalahan: ${e.message}`);
    } finally {
      setIsLoading(false);
      setActiveQuickAction(null);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    addMessage("user", userMessage);
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const result = await chatMutation.mutateAsync({ leadId, message: userMessage, history });
      if (result.success) {
        addMessage("assistant", result.reply as string);
      } else {
        addMessage("assistant", `Maaf, terjadi kesalahan: ${result.error}`);
      }
    } catch (e: any) {
      addMessage("assistant", `Terjadi kesalahan: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (content: string, msgIndex: number) => {
    // Strip markdown for copying
    const plain = content.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/^> /gm, "").replace(/^#+\s/gm, "");
    navigator.clipboard.writeText(plain).then(() => {
      setCopySuccess(String(msgIndex));

      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border-b border-gray-800">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">AI</div>
        <div>
          <div className="text-white font-semibold text-sm">AI Counselor Assistant</div>
          <div className="text-gray-400 text-xs">Powered by SpecTa AI · Student: {studentName}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-green-900/50 text-green-400 border-green-700 text-xs">Online</Badge>
          <button
            onClick={() => { if (window.confirm('Hapus semua riwayat chat untuk siswa ini?')) clearHistoryMutation.mutate({ leadId }); }}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-red-900/20"
            title="Hapus riwayat chat"
          >🗑️</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-b border-gray-800 bg-gray-900/50">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              disabled={isLoading}
              title={action.description}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                activeQuickAction === action.id
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeQuickAction === action.id ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin">⟳</span> Loading...
                </span>
              ) : action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ maxHeight: "380px" }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">AI</div>
            )}
            <div className={`group relative max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
              <div className={`rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-gray-800 text-gray-100 rounded-tl-sm"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
              {msg.role === "assistant" && (
                <button
                  onClick={() => handleCopyMessage(msg.content, idx)}
                  className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-gray-300 bg-gray-900 px-1.5 py-0.5 rounded"
                >
                  {copySuccess === String(idx) ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">C</div>
            )}
          </div>
        ))}
        {isLoading && !activeQuickAction && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">AI</div>
            <div className="bg-gray-800 rounded-xl rounded-tl-sm px-3 py-2">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-800 bg-gray-900/50">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Tanya tentang siswa ini... (Enter untuk kirim, Shift+Enter untuk baris baru)"
            className="flex-1 bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 text-sm resize-none min-h-[40px] max-h-[100px] rounded-lg"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 h-10 rounded-lg flex-shrink-0"
          >
            {isLoading ? "⟳" : "→"}
          </Button>
        </div>
        <div className="text-xs text-gray-600 mt-1 text-center">AI dapat membuat kesalahan. Selalu verifikasi informasi penting.</div>
      </div>
    </div>
  );
}
