import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain, RefreshCw, CheckCircle2, MessageSquare, Clock, AlertTriangle,
  FileWarning, Heart, Zap, ChevronRight, Loader2, Copy, Check,
  ArrowLeft, Sparkles, Bell
} from "lucide-react";
import { toast } from "sonner";

const PRIORITY_CONFIG = {
  urgent: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <AlertTriangle className="w-3 h-3" />, label: "Urgent" },
  high: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: <Zap className="w-3 h-3" />, label: "High" },
  medium: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3" />, label: "Medium" },
  low: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Heart className="w-3 h-3" />, label: "Low" },
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  overdue_followup: { icon: <Clock className="w-4 h-4" />, label: "Overdue Follow-up", color: "text-orange-400" },
  deadline_alert: { icon: <AlertTriangle className="w-4 h-4" />, label: "Deadline Alert", color: "text-red-400" },
  missing_docs: { icon: <FileWarning className="w-4 h-4" />, label: "Missing Documents", color: "text-yellow-400" },
  rapport_checkin: { icon: <Heart className="w-4 h-4" />, label: "Rapport Check-in", color: "text-pink-400" },
  application_update: { icon: <Zap className="w-4 h-4" />, label: "Application Update", color: "text-blue-400" },
  visa_reminder: { icon: <Bell className="w-4 h-4" />, label: "Visa Reminder", color: "text-violet-400" },
};

function SuggestionCard({ suggestion, onAction }: { suggestion: any; onAction: (id: number) => void }) {
  const [copied, setCopied] = useState(false);
  const typeConfig = TYPE_CONFIG[suggestion.suggestionType] ?? TYPE_CONFIG.rapport_checkin;
  const priorityConfig = PRIORITY_CONFIG[suggestion.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;

  const copyMessage = () => {
    if (suggestion.aiMessage) {
      navigator.clipboard.writeText(suggestion.aiMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard!");
    }
  };

  const openWhatsApp = () => {
    if (suggestion.aiMessage) {
      window.open(`https://wa.me/?text=${encodeURIComponent(suggestion.aiMessage)}`, "_blank");
    }
  };

  return (
    <Card className="bg-slate-800/60 border-slate-700 hover:border-slate-600 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`mt-0.5 ${typeConfig.color}`}>{typeConfig.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm leading-tight">{suggestion.title}</p>
              <p className="text-slate-500 text-xs mt-0.5">{typeConfig.label}</p>
            </div>
          </div>
          <Badge className={`text-xs border flex-shrink-0 flex items-center gap-1 ${priorityConfig.color}`}>
            {priorityConfig.icon}
            {priorityConfig.label}
          </Badge>
        </div>

        {suggestion.aiMessage && (
          <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
            <p className="text-xs text-slate-400 mb-1.5 font-medium">💬 Suggested WhatsApp Message:</p>
            <p className="text-slate-200 text-sm leading-relaxed">{suggestion.aiMessage}</p>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-slate-400 hover:text-white text-xs"
                onClick={copyMessage}
              >
                {copied ? <Check className="w-3 h-3 mr-1 text-green-400" /> : <Copy className="w-3 h-3 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 text-xs"
                onClick={openWhatsApp}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Send via WA
              </Button>
            </div>
          </div>
        )}

        {suggestion.aiAdvice && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 mb-3">
            <p className="text-xs text-violet-400 mb-1 font-medium">🧠 AI Counselor Advice:</p>
            <p className="text-slate-300 text-sm leading-relaxed">{suggestion.aiAdvice}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-slate-500 hover:text-green-400 text-xs"
            onClick={() => onAction(suggestion.id)}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Mark Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AIFollowUpAssistant() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: suggestions = [], isLoading } = trpc.aiAssistant.getSuggestions.useQuery();
  const generateMutation = trpc.aiAssistant.generateSuggestions.useMutation({
    onSuccess: (result) => {
      utils.aiAssistant.getSuggestions.invalidate();
      toast.success(`AI Analysis Complete — ${result.generated} new suggestions generated`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate suggestions");
    },
  });

  const actionMutation = trpc.aiAssistant.actionSuggestion.useMutation({
    onSuccess: () => {
      utils.aiAssistant.getSuggestions.invalidate();
    },
  });

  const urgentCount = (suggestions as any[]).filter((s: any) => s.priority === "urgent").length;
  const highCount = (suggestions as any[]).filter((s: any) => s.priority === "high").length;

  const grouped: Record<string, any[]> = {};
  for (const s of suggestions as any[]) {
    const key = s.suggestionType;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/crm")} className="text-slate-400 hover:text-white p-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">AI Follow-up Assistant</p>
                <p className="text-slate-500 text-xs">Your daily counselor digest</p>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-3 h-3 mr-1.5" /> Refresh AI</>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-white">{(suggestions as any[]).length}</p>
              <p className="text-slate-400 text-xs mt-0.5">Total Actions</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{urgentCount}</p>
              <p className="text-slate-400 text-xs mt-0.5">Urgent</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-400">{highCount}</p>
              <p className="text-slate-400 text-xs mt-0.5">High Priority</p>
            </CardContent>
          </Card>
          <Card className="bg-violet-500/10 border-violet-500/20">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-violet-400">
                {(suggestions as any[]).filter((s: any) => s.suggestionType === "rapport_checkin").length}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">Rapport Tasks</p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {!isLoading && (suggestions as any[]).length === 0 && (
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="py-12 text-center">
              <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">No suggestions yet</h3>
              <p className="text-slate-400 text-sm mb-4">
                Click "Refresh AI" to analyze your students and get personalized follow-up suggestions.
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing students...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Suggestions</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        )}

        {/* Suggestions grouped by type */}
        {Object.entries(grouped).map(([type, items]) => {
          const typeConfig = TYPE_CONFIG[type] ?? TYPE_CONFIG.rapport_checkin;
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <span className={typeConfig.color}>{typeConfig.icon}</span>
                <h3 className="text-white font-semibold text-sm">{typeConfig.label}</h3>
                <Badge className="bg-slate-700 text-slate-300 text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map((s: any) => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    onAction={(id) => actionMutation.mutate({ id })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
