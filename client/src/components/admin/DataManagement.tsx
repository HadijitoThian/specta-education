import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Category =
  | "drip_enrollments"
  | "crm_leads"
  | "student_portal"
  | "agent_logs"
  | "visitor_tracking"
  | "conversations"
  | "aptitude_results"
  | "all_student_data";

interface DataGroup {
  id: Category;
  label: string;
  description: string;
  countKeys: string[];
  danger?: boolean;
}

const DATA_GROUPS: DataGroup[] = [
  {
    id: "drip_enrollments",
    label: "Drip Campaign Enrollments",
    description: "Clears all enrolled contacts and email send logs. Campaign templates and email steps are kept.",
    countKeys: ["dripEnrollments", "dripEmailLogs"],
  },
  {
    id: "crm_leads",
    label: "CRM Leads & Applications",
    description: "Removes all leads, applications, appointments, follow-up actions, CRM tasks, and counselor assignments.",
    countKeys: ["crmLeads", "applications", "appointments", "followUpActions"],
  },
  {
    id: "student_portal",
    label: "Student Portal Accounts",
    description: "Deletes all student portal accounts, profiles, AI chats, wishlists, referrals, and rewards.",
    countKeys: ["studentAccounts", "studentChats"],
  },
  {
    id: "conversations",
    label: "Chatbot Conversations",
    description: "Removes all chatbot conversation history and messages from the public chatbot.",
    countKeys: ["conversations"],
  },
  {
    id: "aptitude_results",
    label: "Aptitude / IELTS / Simulator Results",
    description: "Clears all aptitude test results, IELTS practice results, and simulator session data.",
    countKeys: ["aptitudeResults", "ieltsPracticeResults", "simulatorSessions"],
  },
  {
    id: "agent_logs",
    label: "AI Agent Logs & Reports",
    description: "Removes all agent run logs, daily reports, GM executive reports, health checks, and recommendations.",
    countKeys: ["agentRunLogs", "dailyReports", "gmReports"],
  },
  {
    id: "visitor_tracking",
    label: "Visitor Tracking Data",
    description: "Clears all website visitor tracking and analytics data.",
    countKeys: ["visitorTracking"],
  },
  {
    id: "all_student_data",
    label: "ALL Student Data (Full Wipe)",
    description: "DANGER: Deletes ALL of the above in one go — leads, students, enrollments, conversations, results, and logs. Cannot be undone.",
    countKeys: ["crmLeads", "studentAccounts", "dripEnrollments", "conversations", "aptitudeResults", "agentRunLogs", "visitorTracking"],
    danger: true,
  },
];

export default function DataManagement() {
  const [confirmCategory, setConfirmCategory] = useState<Category | null>(null);
  const [cleared, setCleared] = useState<Record<string, number>>({});

  const { data: countsData, isLoading: countsLoading, refetch: refetchCounts } =
    trpc.adminDelete.getDataCounts.useQuery(undefined, { refetchOnWindowFocus: false });

  const counts: Record<string, number> = (countsData?.counts as any) || {};

  const bulkClearMutation = trpc.adminDelete.bulkClear.useMutation({
    onSuccess: (data: any, variables: any) => {
      if (data.success) {
        setCleared((prev) => ({ ...prev, [variables.category]: data.deleted }));
        toast.success(`Cleared successfully — ${data.deleted} records deleted.`);
        refetchCounts();
      } else {
        toast.error(data.error || "Failed to clear data");
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleConfirm = () => {
    if (!confirmCategory) return;
    bulkClearMutation.mutate({ category: confirmCategory });
    setConfirmCategory(null);
  };

  const getGroupCount = (group: DataGroup): number => {
    return group.countKeys.reduce((sum, key) => sum + (counts[key] || 0), 0);
  };

  const selectedGroup = DATA_GROUPS.find((g) => g.id === confirmCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Data Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manually clear specific categories of data. System configurations, templates, universities, blog posts, and counselor accounts are never affected.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchCounts()} disabled={countsLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${countsLoading ? "animate-spin" : ""}`} />
          Refresh Counts
        </Button>
      </div>

      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="text-sm">
          <strong>These actions are permanent and cannot be undone.</strong> Only delete data you no longer need. Real student data added from today onwards should never be deleted unless you explicitly choose to.
        </div>
      </div>

      <div className="grid gap-4">
        {DATA_GROUPS.map((group) => {
          const total = getGroupCount(group);
          const wasCleared = cleared[group.id] !== undefined;

          return (
            <div
              key={group.id}
              className={`flex items-start justify-between gap-4 p-4 border rounded-lg ${
                group.danger ? "border-red-200 bg-red-50" : "border-border bg-card"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-sm ${group.danger ? "text-red-700" : ""}`}>
                    {group.label}
                  </span>
                  {countsLoading ? (
                    <Badge variant="outline" className="text-xs">Loading...</Badge>
                  ) : (
                    <Badge
                      variant={total === 0 ? "secondary" : group.danger ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {total.toLocaleString()} records
                    </Badge>
                  )}
                  {wasCleared && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      Cleared ({cleared[group.id]} deleted)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
              </div>
              <Button
                variant={group.danger ? "destructive" : "outline"}
                size="sm"
                className="shrink-0"
                disabled={total === 0 || bulkClearMutation.isPending}
                onClick={() => setConfirmCategory(group.id)}
              >
                {bulkClearMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!confirmCategory} onOpenChange={(open) => { if (!open) setConfirmCategory(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Delete: {selectedGroup?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedGroup?.description}
              <br /><br />
              <strong>This action cannot be undone.</strong> Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
