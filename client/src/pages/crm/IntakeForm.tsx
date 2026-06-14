/**
 * Public student intake form (Phase 5) — opened from a counselor's QR / link
 * (/join/:token) or the general link (/join). No login. Creates a CRM student
 * auto-assigned to that counselor.
 */
import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { fireConversion } from "@/lib/googleAds";

const PINK = "#E91E8C";
const PURPLE = "#9C27B0";
const LOGO = "https://www.spectaeducation.com/files/migrated/QxrYSewOYzAuPIEN.jpeg";
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300";

export default function IntakeForm() {
  const [, params] = useRoute<{ token: string }>("/join/:token");
  const token = params?.token;
  const formQ = trpc.intake.form.useQuery({ token });
  const submit = trpc.intake.submit.useMutation();
  const [done, setDone] = useState<{ counselorName: string; duplicate: boolean; journeyToken: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [f, setF] = useState({
    studentName: "", studentPhone: "", studentEmail: "",
    parentName: "", parentPhone: "", parentEmail: "",
    preferredCountry: "", programInterest: "", studyLevel: "", intakeDate: "",
  });
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));

  const counselor = formQ.data?.counselorName;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!f.studentName.trim() || !f.studentPhone.trim()) { setErr("Name and WhatsApp number are required."); return; }
    try {
      const res = await submit.mutateAsync({
        token,
        studentName: f.studentName,
        studentPhone: f.studentPhone,
        studentEmail: f.studentEmail || undefined,
        parentName: f.parentName || undefined,
        parentPhone: f.parentPhone || undefined,
        parentEmail: f.parentEmail || undefined,
        preferredCountry: f.preferredCountry || undefined,
        programInterest: f.programInterest || undefined,
        studyLevel: f.studyLevel || undefined,
        intakeDate: f.intakeDate || undefined,
      });
      setDone({ counselorName: res.counselorName, duplicate: res.duplicate, journeyToken: res.journeyToken });
      // Google Ads "lead" conversion for a genuinely new student (dormant unless env set).
      if (!res.duplicate) fireConversion("lead");
    } catch (e: any) {
      setErr(e?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <img src={LOGO} alt="SpecTa Education" className="h-12 mx-auto object-contain" />
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h1 className="text-2xl font-bold text-slate-800">Thank you, {f.studentName.split(" ")[0]}!</h1>
            <p className="text-slate-600 mt-2">
              {done.duplicate
                ? "We already have your details — your counselor will be in touch shortly."
                : <>Your registration is in. <strong>{done.counselorName}</strong> from SpecTa Education will reach out to you very soon.</>}
            </p>
            <a href={`/journey/${done.journeyToken}`} className="inline-block mt-5 px-5 py-2.5 rounded-lg text-white font-semibold" style={{ background: PURPLE }}>
              Track my journey →
            </a>
            <p className="text-xs text-slate-400 mt-4">Bookmark that page to follow your progress and upload documents anytime — no password needed.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow p-6 sm:p-8">
            <div className="text-center mb-5" style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, margin: "-24px -24px 20px", padding: "22px", borderRadius: "16px 16px 0 0" }}>
              <div className="text-white text-xl font-bold">Start your study-abroad journey</div>
              {counselor && <div className="text-white/90 text-sm mt-1">with {counselor} at SpecTa Education</div>}
            </div>

            {err && <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{err}</div>}

            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Your details</div>
            <div className="space-y-3">
              <input required value={f.studentName} onChange={e => set("studentName", e.target.value)} placeholder="Full name *" className={inp} />
              <input required value={f.studentPhone} onChange={e => set("studentPhone", e.target.value)} placeholder="WhatsApp number *" className={inp} />
              <input value={f.studentEmail} onChange={e => set("studentEmail", e.target.value)} placeholder="Email" className={inp} />
            </div>

            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-5 mb-2">Parent / guardian (so we can keep them updated)</div>
            <div className="space-y-3">
              <input value={f.parentName} onChange={e => set("parentName", e.target.value)} placeholder="Parent / guardian name" className={inp} />
              <input value={f.parentPhone} onChange={e => set("parentPhone", e.target.value)} placeholder="Parent WhatsApp number" className={inp} />
              <input value={f.parentEmail} onChange={e => set("parentEmail", e.target.value)} placeholder="Parent email" className={inp} />
            </div>

            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-5 mb-2">Your goals (optional)</div>
            <div className="grid grid-cols-2 gap-3">
              <input value={f.preferredCountry} onChange={e => set("preferredCountry", e.target.value)} placeholder="Target country" className={inp} />
              <input value={f.programInterest} onChange={e => set("programInterest", e.target.value)} placeholder="Program / major" className={inp} />
              <input value={f.studyLevel} onChange={e => set("studyLevel", e.target.value)} placeholder="Study level" className={inp} />
              <input value={f.intakeDate} onChange={e => set("intakeDate", e.target.value)} placeholder="Target intake" className={inp} />
            </div>

            <button type="submit" disabled={submit.isPending} className="w-full mt-6 py-3 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: PURPLE }}>
              {submit.isPending ? "Submitting…" : "Submit"}
            </button>
            <p className="text-xs text-slate-400 text-center mt-3">SpecTa Education — your study abroad partner since 2005.</p>
          </form>
        )}
      </div>
    </div>
  );
}
