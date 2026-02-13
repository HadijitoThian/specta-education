import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, Circle, ChevronDown, ChevronRight, 
  FileText, BookOpen, GraduationCap, Stamp, Home, 
  DollarSign, Plane, Heart, Clock, Trophy, 
  MessageSquare, Loader2, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const phaseConfig: Record<string, { label: string; labelId: string; icon: React.ElementType; color: string; months: string }> = {
  "12_months": { label: "12 Months Before", labelId: "12 Bulan Sebelumnya", icon: Clock, color: "text-blue-600", months: "12" },
  "9_months": { label: "9 Months Before", labelId: "9 Bulan Sebelumnya", icon: BookOpen, color: "text-indigo-600", months: "9" },
  "6_months": { label: "6 Months Before", labelId: "6 Bulan Sebelumnya", icon: GraduationCap, color: "text-purple-600", months: "6" },
  "3_months": { label: "3 Months Before", labelId: "3 Bulan Sebelumnya", icon: Stamp, color: "text-orange-600", months: "3" },
  "1_month": { label: "1 Month Before", labelId: "1 Bulan Sebelumnya", icon: Home, color: "text-green-600", months: "1" },
  "2_weeks": { label: "2 Weeks Before", labelId: "2 Minggu Sebelumnya", icon: Plane, color: "text-cyan-600", months: "0.5" },
  "departure": { label: "Departure Day", labelId: "Hari Keberangkatan", icon: Trophy, color: "text-red-600", months: "0" },
};

const categoryIcons: Record<string, React.ElementType> = {
  documents: FileText,
  tests: BookOpen,
  applications: GraduationCap,
  visa: Stamp,
  accommodation: Home,
  finances: DollarSign,
  travel: Plane,
  health: Heart,
};

export default function StudyAbroadChecklist() {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(["12_months"]));
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  const { data: items, isLoading: itemsLoading } = trpc.checklist.getItems.useQuery(undefined, {
    staleTime: 1000 * 60 * 10,
  });

  const { data: progress, isLoading: progressLoading } = trpc.checklist.getUserProgress.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  const utils = trpc.useUtils();

  const toggleMutation = trpc.checklist.toggleItem.useMutation({
    onMutate: async ({ checklistItemId, isCompleted }) => {
      await utils.checklist.getUserProgress.cancel();
      const prev = utils.checklist.getUserProgress.getData();
      utils.checklist.getUserProgress.setData(undefined, (old) => {
        if (!old) return old;
        const existing = old.find(p => p.checklistItemId === checklistItemId);
        if (existing) {
          return old.map(p => p.checklistItemId === checklistItemId ? { ...p, isCompleted } : p);
        }
        return [...old, { id: 0, userId: 0, checklistItemId, isCompleted, completedAt: isCompleted ? new Date() : null, notes: null, createdAt: new Date(), updatedAt: new Date() }];
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) utils.checklist.getUserProgress.setData(undefined, context.prev);
      toast.error("Failed to update checklist item");
    },
    onSettled: () => {
      utils.checklist.getUserProgress.invalidate();
    },
  });

  const notesMutation = trpc.checklist.updateNotes.useMutation({
    onSuccess: () => {
      setEditingNotes(null);
      toast.success("Notes saved!");
      utils.checklist.getUserProgress.invalidate();
    },
    onError: () => {
      toast.error("Failed to save notes");
    },
  });

  // Group items by phase
  const phaseGroups = useMemo(() => {
    if (!items) return [];
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      if (!groups[item.phase]) groups[item.phase] = [];
      groups[item.phase].push(item);
    }
    const phaseOrder = ["12_months", "9_months", "6_months", "3_months", "1_month", "2_weeks", "departure"];
    return phaseOrder
      .filter(p => groups[p]?.length)
      .map(p => ({ phase: p, items: groups[p] }));
  }, [items]);

  // Progress tracking
  const progressMap = useMemo(() => {
    const map = new Map<number, { isCompleted: boolean; notes: string | null }>();
    if (progress) {
      for (const p of progress) {
        map.set(p.checklistItemId, { isCompleted: p.isCompleted, notes: p.notes });
      }
    }
    return map;
  }, [progress]);

  const totalItems = items?.length ?? 0;
  const completedItems = progress?.filter(p => p.isCompleted).length ?? 0;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  };

  const getPhaseProgress = (phaseItems: typeof items) => {
    if (!phaseItems) return { completed: 0, total: 0 };
    const total = phaseItems.length;
    const completed = phaseItems.filter(item => progressMap.get(item.id)?.isCompleted).length;
    return { completed, total };
  };

  if (itemsLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading your checklist...</span>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Checklist Coming Soon</h3>
        <p className="text-muted-foreground">Your personalized study abroad checklist is being prepared.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Overall Progress */}
      <motion.div
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 mb-8 border border-primary/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Your Study Abroad Journey</h3>
            <p className="text-sm text-muted-foreground">Perjalanan Studi Luar Negeri Kamu</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-primary">{progressPercent}%</span>
            <p className="text-xs text-muted-foreground">{completedItems}/{totalItems} tasks</p>
          </div>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-red-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        {progressPercent === 100 && (
          <motion.p
            className="text-sm text-primary font-medium mt-3 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Trophy className="w-4 h-4" /> Congratulations! You're all set for your journey! 🎉
          </motion.p>
        )}
      </motion.div>

      {/* Phase Sections */}
      <div className="space-y-4">
        {phaseGroups.map(({ phase, items: phaseItems }, groupIndex) => {
          const config = phaseConfig[phase];
          if (!config) return null;
          const PhaseIcon = config.icon;
          const isExpanded = expandedPhases.has(phase);
          const { completed, total } = getPhaseProgress(phaseItems);
          const isPhaseComplete = completed === total;

          return (
            <motion.div
              key={phase}
              className={`rounded-xl border ${isPhaseComplete ? "border-green-200 bg-green-50/50" : "border-border bg-card"} overflow-hidden`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.05 }}
            >
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase)}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPhaseComplete ? "bg-green-100" : "bg-muted"}`}>
                  {isPhaseComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <PhaseIcon className={`w-5 h-5 ${config.color}`} />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-sm">{config.label}</h4>
                  <p className="text-xs text-muted-foreground">{config.labelId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPhaseComplete ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {completed}/{total}
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Phase Items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {phaseItems.map((item) => {
                        const itemProgress = progressMap.get(item.id);
                        const isCompleted = itemProgress?.isCompleted ?? false;
                        const CategoryIcon = categoryIcons[item.category] ?? FileText;
                        const isEditingThis = editingNotes === item.id;

                        return (
                          <motion.div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                              isCompleted ? "bg-green-50/80" : "bg-muted/30 hover:bg-muted/50"
                            }`}
                            layout
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleMutation.mutate({ checklistItemId: item.id, isCompleted: !isCompleted })}
                              className="mt-0.5 flex-shrink-0"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                              )}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <CategoryIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <span className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                  {item.title}
                                </span>
                              </div>
                              {item.titleId && (
                                <p className={`text-xs mt-0.5 ml-5.5 ${isCompleted ? "text-muted-foreground/60 line-through" : "text-muted-foreground"}`}>
                                  {item.titleId}
                                </p>
                              )}
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1 ml-5.5">{item.description}</p>
                              )}

                              {/* Notes */}
                              {itemProgress?.notes && !isEditingThis && (
                                <p className="text-xs text-blue-600 mt-1 ml-5.5 italic">📝 {itemProgress.notes}</p>
                              )}

                              {isEditingThis && (
                                <div className="mt-2 ml-5.5 flex gap-2">
                                  <input
                                    type="text"
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="Add a note..."
                                    className="flex-1 text-xs px-2 py-1.5 border border-border rounded-md bg-background"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        notesMutation.mutate({ checklistItemId: item.id, notes: noteText });
                                      }
                                      if (e.key === "Escape") setEditingNotes(null);
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => notesMutation.mutate({ checklistItemId: item.id, notes: noteText })}
                                  >
                                    Save
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Note button */}
                            <button
                              onClick={() => {
                                if (isEditingThis) {
                                  setEditingNotes(null);
                                } else {
                                  setNoteText(itemProgress?.notes ?? "");
                                  setEditingNotes(item.id);
                                }
                              }}
                              className="flex-shrink-0 mt-0.5"
                              title="Add note"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
