/**
 * Brand Kit editor (Phase 1). The marketing team edits the brand foundation
 * every content agent reads: colors, fonts, logo, tone, audience, offers,
 * do/don't, content angles, hashtags.
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { SosMedShell, sosmedInput } from "./SosMedShell";

const PINK = "#E91E8C";

type Form = Record<string, string>;
const FIELDS: { key: string; label: string; type: "text" | "color" | "area"; hint?: string }[] = [
  { key: "brandName", label: "Brand name", type: "text" },
  { key: "logoUrl", label: "Logo URL (colour, transparent PNG)", type: "text", hint: "Used on bright photos." },
  { key: "logoWhiteUrl", label: "White logo URL (transparent PNG)", type: "text", hint: "Used on dark photos." },
  { key: "primaryColor", label: "Primary color", type: "color" },
  { key: "secondaryColor", label: "Secondary color", type: "color" },
  { key: "accentColor", label: "Accent color", type: "color" },
  { key: "fontHeading", label: "Heading font", type: "text" },
  { key: "fontBody", label: "Body font", type: "text" },
  { key: "toneOfVoice", label: "Tone of voice", type: "area" },
  { key: "targetAudience", label: "Target audience", type: "area" },
  { key: "keyOffers", label: "Key offers / products", type: "area" },
  { key: "doList", label: "Do's", type: "area" },
  { key: "dontList", label: "Don'ts", type: "area" },
  { key: "contentAngles", label: "Content angles (one per line)", type: "area" },
  { key: "hashtags", label: "Default hashtags", type: "area" },
  { key: "visualStyle", label: "Visual style (set via Art Director)", type: "area", hint: "Guides AI image generation. Best edited from the Art Director chat." },
];

export default function SosMedBrandKit() {
  const utils = trpc.useUtils();
  const kit = trpc.sosmed.getBrandKit.useQuery(undefined, { retry: false });
  const [f, setF] = useState<Form>({});
  const [msg, setMsg] = useState<string | null>(null);
  const save = trpc.sosmed.updateBrandKit.useMutation({
    onSuccess: () => { setMsg("Saved ✓"); utils.sosmed.getBrandKit.invalidate(); },
    onError: e => setMsg(e.message),
  });

  useEffect(() => {
    if (kit.data) {
      const init: Form = {};
      FIELDS.forEach(fl => { init[fl.key] = (kit.data as any)[fl.key] ?? ""; });
      setF(init);
    }
  }, [kit.data?.id]);

  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));
  const onSave = () => {
    setMsg(null);
    const payload: any = {};
    FIELDS.forEach(fl => { payload[fl.key] = f[fl.key] ?? ""; });
    save.mutate(payload);
  };

  return (
    <SosMedShell active="/sosmed/brand-kit">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Brand Kit</h1>
          <p className="text-slate-500 mt-1">The foundation every content agent reads. Edit freely.</p>
        </div>
        <button onClick={onSave} disabled={save.isPending} className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: PINK }}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {msg && <div className="mt-4 bg-pink-50 text-pink-800 text-sm rounded-lg px-4 py-2">{msg}</div>}

      {kit.isLoading ? (
        <div className="mt-6 text-slate-400">Loading…</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FIELDS.map(fl => (
            <label key={fl.key} className={`block ${fl.type === "area" ? "sm:col-span-2" : ""}`}>
              <span className="block text-xs font-medium text-slate-500 mb-1">{fl.label}</span>
              {fl.type === "area" ? (
                <textarea value={f[fl.key] ?? ""} onChange={e => set(fl.key, e.target.value)} rows={fl.key === "contentAngles" ? 8 : 3} className={sosmedInput} />
              ) : fl.type === "color" ? (
                <div className="flex items-center gap-2">
                  <input type="color" value={f[fl.key] || "#000000"} onChange={e => set(fl.key, e.target.value)} className="h-9 w-12 rounded border border-slate-300" />
                  <input value={f[fl.key] ?? ""} onChange={e => set(fl.key, e.target.value)} className={sosmedInput} />
                </div>
              ) : (
                <input value={f[fl.key] ?? ""} onChange={e => set(fl.key, e.target.value)} className={sosmedInput} />
              )}
              {fl.hint && <span className="block text-[11px] text-slate-400 mt-1">{fl.hint}</span>}
            </label>
          ))}
        </div>
      )}
    </SosMedShell>
  );
}
