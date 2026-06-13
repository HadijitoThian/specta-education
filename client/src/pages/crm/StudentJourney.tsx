/**
 * Public passwordless "My Journey" page (Phase 5, step 2). Opened from
 * /journey/:token. Students see their stage progress, recent updates, and a
 * document checklist they can upload to. No login — the URL token is the key.
 */
import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

const PINK = "#E91E8C";
const PURPLE = "#9C27B0";
const LOGO = "https://www.spectaeducation.com/files/migrated/QxrYSewOYzAuPIEN.jpeg";
const statusColor: Record<string, string> = { pending: "#9ca3af", submitted: "#f59e0b", verified: "#22c55e", rejected: "#ef4444" };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function StudentJourney() {
  const [, params] = useRoute<{ token: string }>("/journey/:token");
  const token = params?.token || "";
  const utils = trpc.useUtils();
  const q = trpc.journey.get.useQuery({ token }, { enabled: !!token, retry: false });
  const upload = trpc.journey.uploadDocument.useMutation();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { setErr("File too large (max 16MB)."); return; }
    setErr(null); setBusy(true);
    try {
      await upload.mutateAsync({ token, docLabel: label.trim() || file.name, fileName: file.name, fileType: file.type || "application/octet-stream", fileBase64: await fileToBase64(file) });
      setLabel(""); utils.journey.get.invalidate({ token });
    } catch (e: any) { setErr(e?.message || "Upload failed"); } finally { setBusy(false); }
  };

  if (q.isLoading) return <Shell><div className="text-center text-slate-400 py-10">Loading…</div></Shell>;
  if (q.isError || !q.data) return <Shell><div className="text-center text-slate-500 py-10">This link is invalid or has expired.</div></Shell>;
  const d = q.data;

  return (
    <Shell>
      <div className="text-center" style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, margin: "-24px -24px 0", padding: "24px", borderRadius: "16px 16px 0 0" }}>
        <div className="text-white/90 text-sm">Welcome back,</div>
        <div className="text-white text-2xl font-bold">{d.studentName}</div>
        {d.counselorName && <div className="text-white/90 text-sm mt-1">Your counselor: {d.counselorName}</div>}
      </div>

      <div className="p-1 sm:p-2">
        {/* Stage progress */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-700 mb-3">Your progress</div>
          <div className="space-y-1.5">
            {d.steps.map((s, i) => {
              const doneStep = d.stageIndex >= 0 && i < d.stageIndex;
              const current = i === d.stageIndex;
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shrink-0"
                    style={{ background: doneStep ? "#22c55e" : current ? PURPLE : "#e2e8f0" }}>
                    {doneStep ? "✓" : ""}
                  </div>
                  <span className={`text-sm ${current ? "font-bold text-slate-800" : doneStep ? "text-slate-500" : "text-slate-400"}`}>
                    {s.label}{current ? "  ← you are here" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        {(d.country || d.program || d.intake) && (
          <div className="mt-5 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
            {d.country && <div>Destination: <strong>{d.country}</strong></div>}
            {d.program && <div>Program: <strong>{d.program}</strong></div>}
            {d.intake && <div>Target intake: <strong>{d.intake}</strong></div>}
          </div>
        )}

        {/* Documents */}
        <div className="mt-6">
          <div className="text-sm font-semibold text-slate-700 mb-2">Your documents</div>
          {err && <div className="mb-2 bg-red-50 text-red-700 text-xs rounded px-2 py-1">{err}</div>}
          <ul className="space-y-2 mb-3">
            {d.documents.length === 0 && <li className="text-sm text-slate-400">No documents yet — upload your passport, transcript, etc. below.</li>}
            {d.documents.map(doc => (
              <li key={doc.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{doc.fileUrl ? <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline">{doc.docLabel} 📎</a> : doc.docLabel}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${statusColor[doc.status]}1a`, color: statusColor[doc.status] }}>{doc.status}</span>
              </li>
            ))}
          </ul>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Document name (e.g. Passport)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-2" />
          <label className={`inline-block px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer ${busy ? "opacity-60 pointer-events-none" : ""}`} style={{ background: PURPLE }}>
            {busy ? "Uploading…" : "⬆ Upload a document"}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={onPick} className="hidden" />
          </label>
        </div>

        {/* Updates */}
        <div className="mt-6">
          <div className="text-sm font-semibold text-slate-700 mb-2">Recent updates</div>
          {d.updates.length === 0 && <div className="text-sm text-slate-400">No updates yet.</div>}
          <ul className="space-y-2">
            {d.updates.map((u, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(u.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                <span className="text-slate-700">{u.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-5"><img src={LOGO} alt="SpecTa Education" className="h-11 mx-auto object-contain" /></div>
        <div className="bg-white rounded-2xl shadow p-6">{children}</div>
        <p className="text-xs text-slate-400 text-center mt-4">SpecTa Education — your study abroad partner since 2005.</p>
      </div>
    </div>
  );
}
