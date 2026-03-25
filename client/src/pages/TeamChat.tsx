import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight, Send, Hash, Trash2, MessageSquare } from "lucide-react";

const CHANNELS = [
  { id: "general", label: "# general", desc: "General team discussion" },
  { id: "leads", label: "# leads", desc: "Lead discussions & handoffs" },
  { id: "applications", label: "# applications", desc: "University application updates" },
  { id: "announcements", label: "# announcements", desc: "Team announcements" },
];

export default function TeamChat() {
  const [channel, setChannel] = useState("general");
  const [message, setMessage] = useState("");
  const [staffToken, setStaffToken] = useState<string | null>(null);
  const [staffInfo, setStaffInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get staff auth
  const { data: meData } = trpc.staffAuth.me.useQuery(undefined, {
    retry: false,
    onError: () => {},
  } as any);

  useEffect(() => {
    const token = document.cookie.split(";").find(c => c.trim().startsWith("staff_token="))?.split("=")[1];
    setStaffToken(token || null);
  }, []);

  useEffect(() => {
    if (meData && (meData as any).staff) {
      setStaffInfo((meData as any).staff);
    }
  }, [meData]);

  const { data: chatData, refetch } = trpc.crm.getTeamChat.useQuery(
    { channel, limit: 100 },
    { refetchInterval: 5000 } // Poll every 5 seconds for new messages
  );

  const sendMut = trpc.crm.sendTeamChat.useMutation({
    onSuccess: () => { refetch(); setMessage(""); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.crm.deleteTeamChat.useMutation({
    onSuccess: () => refetch(),
  });

  const messages = (chatData as any)?.messages || [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    if (!staffInfo) return toast.error("Please login as staff first");
    sendMut.mutate({
      message: message.trim(),
      channel,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const getColor = (email: string) => {
    const colors = ["bg-pink-500", "bg-purple-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-teal-500"];
    let hash = 0;
    for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1424]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/crm">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2">
              <ChevronRight className="w-4 h-4 rotate-180" />
              CRM
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#e91e8c]" />
            <h1 className="text-lg font-bold text-white">Team Chat</h1>
          </div>
          {staffInfo && (
            <div className="ml-auto flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full ${getColor(staffInfo.email)} flex items-center justify-center text-white text-xs font-bold`}>
                {getInitials(staffInfo.name || staffInfo.email)}
              </div>
              <span className="text-sm text-white/60">{staffInfo.name || staffInfo.email}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 max-w-6xl mx-auto w-full">
        {/* Sidebar - Channels */}
        <div className="w-56 border-r border-white/10 bg-[#0d1424]/50 p-3 space-y-1 hidden sm:block">
          <div className="text-xs text-white/40 uppercase tracking-wider px-2 py-2">Channels</div>
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                channel === ch.id
                  ? "bg-[#e91e8c]/20 text-[#e91e8c] font-medium"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                {ch.id}
              </div>
            </button>
          ))}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Channel Header */}
          <div className="px-4 py-3 border-b border-white/10 bg-[#0d1424]/30">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-white/40" />
              <span className="font-semibold text-white">{channel}</span>
              <span className="text-white/30 text-sm">— {CHANNELS.find(c => c.id === channel)?.desc}</span>
            </div>
            {/* Mobile channel switcher */}
            <div className="flex gap-2 mt-2 sm:hidden overflow-x-auto">
              {CHANNELS.map(ch => (
                <button key={ch.id} onClick={() => setChannel(ch.id)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs ${channel === ch.id ? "bg-[#e91e8c] text-white" : "bg-white/10 text-white/50"}`}>
                  #{ch.id}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(100vh - 260px)" }}>
            {messages.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No messages yet in #{channel}</p>
                <p className="text-xs mt-1">Be the first to say something!</p>
              </div>
            ) : (
              messages.map((msg: any, i: number) => {
                const isMe = msg.senderEmail === staffInfo?.email;
                const prevMsg = messages[i - 1];
                const isSameUser = prevMsg?.senderEmail === msg.senderEmail;
                return (
                  <div key={msg.id} className={`flex gap-3 group ${isMe ? "flex-row-reverse" : ""}`}>
                    {!isSameUser && (
                      <div className={`w-8 h-8 rounded-full ${getColor(msg.senderEmail)} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1`}>
                        {getInitials(msg.senderName || msg.senderEmail)}
                      </div>
                    )}
                    {isSameUser && <div className="w-8 shrink-0" />}
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                      {!isSameUser && (
                        <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="text-xs font-semibold text-white/70">{msg.senderName || msg.senderEmail}</span>
                          <span className="text-xs text-white/30">{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      <div className={`relative px-3 py-2 rounded-2xl text-sm ${
                        isMe
                          ? "bg-[#e91e8c]/80 text-white rounded-tr-sm"
                          : "bg-white/10 text-white/90 rounded-tl-sm"
                      }`}>
                        {msg.message}
                        {(isMe || staffInfo?.role === "admin") && (
                          <button
                            onClick={() => deleteMut.mutate({ id: msg.id })}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/80 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex">
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                      {isSameUser && <span className="text-xs text-white/20 mt-0.5">{formatTime(msg.createdAt)}</span>}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-white/10 bg-[#0d1424]/50">
            {!staffInfo ? (
              <div className="text-center text-white/40 text-sm py-2">
                Please <Link href="/staff-login"><span className="text-[#e91e8c] cursor-pointer">login as staff</span></Link> to send messages
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${channel}... (Enter to send, Shift+Enter for new line)`}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#e91e8c]/50 placeholder:text-white/30"
                    rows={1}
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={sendMut.isPending || !message.trim()}
                  className="bg-[#e91e8c] hover:bg-[#c2185b] text-white h-11 px-4 rounded-xl shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
