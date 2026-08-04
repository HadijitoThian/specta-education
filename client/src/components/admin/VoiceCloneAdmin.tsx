/**
 * Voice Clone (SpecTa) admin panel.
 *
 * Mirrors the AptitudeManager pattern:
 *  - Session list with status filter + email search
 *  - "Create free test link" form → generates comped session + emails recording URL
 *  - Row actions: resend recording link, resend result email, retry failed processing
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Mic, Send, RefreshCw, RotateCcw, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emailValid = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

type Status = "pending" | "processing" | "ready" | "failed" | "all";
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  processing: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function IDR(n: number | null): string {
  if (!n) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function VoiceCloneAdmin() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [showFreeForm, setShowFreeForm] = useState(false);
  const [freeName, setFreeName] = useState("");
  const [freeEmail, setFreeEmail] = useState("");
  const [freePhone, setFreePhone] = useState("");
  const [freeNote, setFreeNote] = useState("");

  const listQuery = trpc.voiceCloneAdmin.list.useQuery({ status: statusFilter, search: search.trim() || undefined, limit: 200 });
  const createFreeMut = trpc.voiceCloneAdmin.createFreeLink.useMutation({
    onSuccess: (data) => {
      toast.success(`Free link created${data.emailed ? " + emailed" : " (email failed — check logs)"}`);
      setShowFreeForm(false);
      setFreeName(""); setFreeEmail(""); setFreePhone(""); setFreeNote("");
      void utils.voiceCloneAdmin.list.invalidate();
    },
    onError: (e) => toast.error(`Create free link failed: ${e.message}`),
  });
  const resendRecordingMut = trpc.voiceCloneAdmin.resendRecordingLink.useMutation({
    onSuccess: (d) => toast.success(d.emailed ? "Recording link re-sent" : "Email failed — see logs"),
    onError: (e) => toast.error(`Resend failed: ${e.message}`),
  });
  const resendResultMut = trpc.voiceCloneAdmin.resendResultEmail.useMutation({
    onSuccess: (d) => toast.success(d.emailed ? "Result link re-sent" : "Email failed — see logs"),
    onError: (e) => toast.error(`Resend failed: ${e.message}`),
  });
  const retryMut = trpc.voiceCloneAdmin.retryProcessing.useMutation({
    onSuccess: () => {
      toast.success("Retry started — polls will show 'processing' then 'ready'/'failed'");
      void utils.voiceCloneAdmin.list.invalidate();
    },
    onError: (e) => toast.error(`Retry failed: ${e.message}`),
  });

  const submitFreeForm = () => {
    if (!freeName.trim()) return toast.error("Name required");
    if (!emailValid(freeEmail)) return toast.error("Valid email required");
    createFreeMut.mutate({
      name: freeName.trim(),
      email: freeEmail.trim(),
      phone: freePhone.trim() || undefined,
      note: freeNote.trim() || undefined,
    });
  };

  const sessions = listQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6 text-purple-600" />
            Voice Clone (SpecTa)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Voice Clone Band 8 sessions. Create free test links, resend delivery emails, retry failed processing.
          </p>
        </div>
        <Button
          onClick={() => setShowFreeForm(v => !v)}
          className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white"
        >
          <Send className="w-4 h-4 mr-2" />
          {showFreeForm ? "Cancel" : "Create Free Test Link"}
        </Button>
      </div>

      {/* Free link form */}
      {showFreeForm && (
        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border-2 border-purple-200 rounded-2xl p-5">
          <h3 className="font-bold text-purple-900 mb-3">Create free Voice Clone test link</h3>
          <p className="text-xs text-slate-600 mb-4">
            Reserves a comped session (isBundleFree=1, no invoice) and emails the recording URL to the recipient. They can start recording immediately.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Full name" value={freeName} onChange={e => setFreeName(e.target.value)} />
            <Input placeholder="Email address" type="email" value={freeEmail} onChange={e => setFreeEmail(e.target.value)} />
            <Input placeholder="Phone (optional)" value={freePhone} onChange={e => setFreePhone(e.target.value)} />
            <Input placeholder="Internal note (optional, for your reference)" value={freeNote} onChange={e => setFreeNote(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={submitFreeForm}
              disabled={createFreeMut.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {createFreeMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Create + Send Link
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {(["all", "pending", "processing", "ready", "failed"] as const).map(s => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className={statusFilter === s ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            {s}
          </Button>
        ))}
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <Input placeholder="Search by email or name…" value={search} onChange={e => setSearch(e.target.value)} className="text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={() => void utils.voiceCloneAdmin.list.invalidate()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Session table */}
      {listQuery.isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
          No sessions match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Customer</th>
                <th className="px-3 py-2 font-semibold">Mode</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Amount</th>
                <th className="px-3 py-2 font-semibold">Parts</th>
                <th className="px-3 py-2 font-semibold">Created</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{s.customerName || "(no name)"}</div>
                    <div className="text-xs text-slate-500">{s.customerEmail}</div>
                    {s.customerPhone && <div className="text-xs text-slate-400">{s.customerPhone}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${s.mode === "standalone" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {s.mode}
                    </span>
                    {s.isBundleFree ? <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">FREE</span> : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[s.status] || "bg-slate-100"}`}>
                      {s.status}
                    </span>
                    {s.errorMessage && (
                      <div className="text-[11px] text-red-600 mt-1 max-w-xs truncate" title={s.errorMessage}>
                        {s.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums">{IDR(s.amountIdr)}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {s.partsCount ? `${s.partsCount}/3` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{fmtDate(s.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {s.sessionToken && s.status === "ready" && (
                        <>
                          <a
                            href={`/voice-clone/result/${s.sessionToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-purple-100 text-purple-700"
                            title="Open result page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => resendResultMut.mutate({ sessionId: s.id })}
                            disabled={resendResultMut.isPending}
                            className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 disabled:opacity-50"
                            title="Resend result email"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {s.sessionToken && s.status === "pending" && (
                        <button
                          onClick={() => resendRecordingMut.mutate({ sessionId: s.id })}
                          disabled={resendRecordingMut.isPending}
                          className="p-1.5 rounded hover:bg-blue-100 text-blue-700 disabled:opacity-50"
                          title="Resend recording link"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {(s.status === "failed" || s.status === "processing") && (
                        <button
                          onClick={() => retryMut.mutate({ sessionId: s.id })}
                          disabled={retryMut.isPending}
                          className="p-1.5 rounded hover:bg-amber-100 text-amber-700 disabled:opacity-50"
                          title="Retry processing"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
