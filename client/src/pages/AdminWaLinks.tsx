import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * /admin/wa-links — the WhatsApp attribution control panel. Admin creates
 * trackable campaign codes here (one per ad / IG post / email / etc.),
 * gets a ready-to-paste URL for marketing, then watches the click → message
 * → conversion funnel per campaign so the team can see which ads actually
 * produce paying customers instead of guessing.
 *
 * Backed by admin.waAttribution.* — see server/waAttribution.ts for the
 * full end-to-end flow (GCLID capture on click → wa_sessions row → Emma
 * bot lookup → offline conversion upload to Google Ads on payment).
 */
export default function AdminWaLinks() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="p-8">
        <p className="text-red-600">Admins only.</p>
        <Link href="/admin" className="text-blue-600 underline">← Back to /admin</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">WhatsApp attribution</h1>
            <p className="text-sm text-slate-500">
              Track every WhatsApp-driven lead from ad click → Emma conversation → paid customer.
              Fixes the "GCLID lost in WhatsApp handoff" problem so Google Ads Smart Bidding sees real ROAS.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="text-slate-600 hover:text-slate-900">/admin</Link>
            <Link href="/admin/ielts-tutor" className="text-slate-600 hover:text-slate-900">Tutor admin</Link>
            <Link href="/admin/ielts-tests" className="text-slate-600 hover:text-slate-900">Mock admin</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <CreateCampaignCard />
        <CampaignStatsCard />
        <RecentSessionsCard />
        <SocialMediaTeamGuide />
      </main>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Create campaign
// ───────────────────────────────────────────────────────────────────────

function CreateCampaignCard() {
  const utils = trpc.useUtils();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [product, setProduct] = useState<string>("tutor");
  const [platform, setPlatform] = useState<string>("google_ads");
  const [greeting, setGreeting] = useState("Halo, saya mau info tentang AI IELTS Tutor SpecTa");
  const [targetPhone, setTargetPhone] = useState("");
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const create = trpc.admin.waAttribution.createCampaign.useMutation({
    onSuccess: (d: any) => {
      setLastUrl(d.url);
      setErr(null);
      try { navigator.clipboard.writeText(d.url); } catch { /* ignore */ }
      utils.admin.waAttribution.listCampaigns.invalidate();
      utils.admin.waAttribution.campaignStats.invalidate();
      setCode("");
      setName("");
    },
    onError: (e: any) => { setErr(e?.message || "Failed to create"); setLastUrl(null); },
  });

  // Auto-suggest a code from product + platform + today's month.
  const suggestCode = () => {
    const monthCode = new Date().toLocaleString("en", { month: "short" }).toLowerCase();
    const yearCode = new Date().getFullYear().toString().slice(-2);
    return `${product}-${platformShort(platform)}-${monthCode}${yearCode}`;
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <h2 className="font-semibold text-slate-900 mb-1">Create a trackable link</h2>
      <p className="text-xs text-slate-500 mb-4">
        Each link = one ad / IG post / email campaign. The generated URL goes into your ad's WhatsApp button.
        Emma the bot will identify the source from the first message and personalise her reply.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-600 font-medium">Product</label>
          <select value={product} onChange={e => setProduct(e.target.value)} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm">
            <option value="mock">Mock Test</option>
            <option value="tutor">AI IELTS Tutor</option>
            <option value="igcse">IGCSE AI Teacher</option>
            <option value="ielts_course">IELTS Course (offline)</option>
            <option value="study_abroad">Study Abroad Consult</option>
            <option value="scholarship">Scholarship</option>
            <option value="aptitude">Aptitude Test</option>
            <option value="consult">General Consult</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-600 font-medium">Platform</label>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm">
            <option value="google_ads">Google Ads</option>
            <option value="meta_ads">Meta Ads (FB)</option>
            <option value="instagram_ads">Instagram Ads</option>
            <option value="instagram_organic">Instagram Organic</option>
            <option value="tiktok_ads">TikTok Ads</option>
            <option value="tiktok_organic">TikTok Organic</option>
            <option value="youtube_ads">YouTube Ads</option>
            <option value="email">Email</option>
            <option value="sms">SMS/WA broadcast</option>
            <option value="organic">Organic search</option>
            <option value="direct">Direct</option>
            <option value="referral">Referral</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-600 font-medium">Code <span className="text-slate-400">(URL slug)</span></label>
          <div className="flex gap-1 mt-1">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder={suggestCode()}
              className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setCode(suggestCode())}
              className="text-xs px-2 rounded border border-slate-300 hover:bg-slate-100"
              title="Auto-generate a code from product + platform + month"
            >Auto</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-600 font-medium">Name <span className="text-slate-400">(internal label)</span></label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Tutor Google Search - Jul 2026"
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-3">
          <label className="text-xs text-slate-600 font-medium">Pre-filled first message <span className="text-slate-400">(what Emma sees)</span></label>
          <input
            value={greeting}
            onChange={e => setGreeting(e.target.value)}
            placeholder="Halo, saya mau info tentang [product]"
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">A "[REF:WA-xxx]" tag is auto-appended so Emma can identify the session.</p>
        </div>
        <div>
          <label className="text-xs text-slate-600 font-medium">Target WhatsApp <span className="text-slate-400">(optional)</span></label>
          <input
            value={targetPhone}
            onChange={e => setTargetPhone(e.target.value)}
            placeholder="6281XXXXXXXXX (default)"
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={() => { setErr(null); create.mutate({
            code: code || suggestCode(),
            name: name || `${labelFor(product)} — ${labelFor(platform)}`,
            product: product as any,
            platform: platform as any,
            greeting,
            targetPhone: targetPhone || undefined,
          }); }}
          disabled={create.isPending}
          className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create + copy URL"}
        </button>
      </div>

      {lastUrl && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm">
          ✅ Created (URL copied to clipboard):
          <div className="mt-1 font-mono break-all text-emerald-900">{lastUrl}</div>
          <p className="text-xs text-slate-600 mt-2">
            Paste this URL into your ad's WhatsApp button (or as a link in an Instagram story, email, TikTok bio, etc.).
            Every click will be logged with the visitor's GCLID + UTMs so we can attribute the eventual payment back to this exact campaign.
          </p>
        </div>
      )}
      {err && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">❌ {err}</div>}
    </section>
  );
}

function labelFor(v: string): string {
  const map: Record<string, string> = {
    mock: "Mock Test", tutor: "AI Tutor", igcse: "IGCSE",
    ielts_course: "IELTS Course", study_abroad: "Study Abroad",
    scholarship: "Scholarship", aptitude: "Aptitude", consult: "Consult", other: "Other",
    google_ads: "Google Ads", meta_ads: "Meta Ads", instagram_ads: "IG Ads",
    instagram_organic: "IG Organic", tiktok_ads: "TikTok Ads", tiktok_organic: "TikTok Organic",
    youtube_ads: "YouTube Ads", email: "Email", sms: "SMS", organic: "Organic",
    direct: "Direct", referral: "Referral", unknown: "Unknown",
  };
  return map[v] || v;
}
function platformShort(v: string): string {
  const map: Record<string, string> = {
    google_ads: "gad", meta_ads: "meta", instagram_ads: "igad",
    instagram_organic: "ig", tiktok_ads: "ttad", tiktok_organic: "tt",
    youtube_ads: "yt", email: "email", sms: "sms", organic: "org",
    direct: "dir", referral: "ref", unknown: "unk",
  };
  return map[v] || v.slice(0, 4);
}

// ───────────────────────────────────────────────────────────────────────
// Campaign stats table
// ───────────────────────────────────────────────────────────────────────

function CampaignStatsCard() {
  const [days, setDays] = useState(30);
  const q = trpc.admin.waAttribution.campaignStats.useQuery({ days });
  const items = q.data?.items || [];
  const totals = useMemo(() => items.reduce((acc, r) => ({
    clicks: acc.clicks + r.clicks,
    messaged: acc.messaged + r.messaged,
    converted: acc.converted + r.converted,
    revenueIdr: acc.revenueIdr + r.revenueIdr,
  }), { clicks: 0, messaged: 0, converted: 0, revenueIdr: 0 }), [items]);

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-semibold text-slate-900">Campaign performance</h2>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="text-sm border border-slate-300 rounded px-2 py-1">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
        {q.isFetching && <span className="text-xs text-slate-400">refreshing…</span>}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <SmallStat label="Clicks" value={totals.clicks} />
        <SmallStat label="Messaged Emma" value={totals.messaged} sub={pct(totals.messaged, totals.clicks)} />
        <SmallStat label="Converted" value={totals.converted} sub={pct(totals.converted, totals.messaged)} />
        <SmallStat label="Revenue" value={fmtIdr(totals.revenueIdr)} sub={totals.clicks ? `Rp ${Math.round(totals.revenueIdr / totals.clicks).toLocaleString("id-ID")} / click` : "—"} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-2">Campaign</th>
              <th className="py-2 pr-2">Product</th>
              <th className="py-2 pr-2">Platform</th>
              <th className="py-2 pr-2 text-right">Clicks</th>
              <th className="py-2 pr-2 text-right">Messaged</th>
              <th className="py-2 pr-2 text-right">Converted</th>
              <th className="py-2 pr-2 text-right">Revenue</th>
              <th className="py-2 pr-2 text-right">Rp/click</th>
              <th className="py-2 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={9} className="py-6 text-center text-slate-400">Loading…</td></tr>}
            {q.data && items.length === 0 && (
              <tr><td colSpan={9} className="py-6 text-center text-slate-400">No campaigns yet — create one above.</td></tr>
            )}
            {items.map(r => (
              <tr key={r.code} className={`border-b border-slate-100 hover:bg-slate-50 ${!r.isActive ? "opacity-40" : ""}`}>
                <td className="py-2 pr-2">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{r.code}</div>
                </td>
                <td className="py-2 pr-2 text-xs">{labelFor(r.product)}</td>
                <td className="py-2 pr-2 text-xs">{labelFor(r.platform)}</td>
                <td className="py-2 pr-2 text-right font-medium">{r.clicks}</td>
                <td className="py-2 pr-2 text-right">{r.messaged}</td>
                <td className="py-2 pr-2 text-right font-medium text-emerald-700">{r.converted}</td>
                <td className="py-2 pr-2 text-right font-medium">{fmtIdr(r.revenueIdr)}</td>
                <td className="py-2 pr-2 text-right text-xs">{r.clicks ? "Rp " + Math.round(r.revenueIdr / r.clicks).toLocaleString("id-ID") : "—"}</td>
                <td className="py-2 pr-2 text-xs">
                  <CopyUrlButton code={r.code} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SmallStat({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="border border-slate-200 rounded p-3">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900 mt-0.5">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function CopyUrlButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    const base = (typeof window !== "undefined" ? window.location.origin : "https://www.spectaeducation.com");
    const url = `${base}/wa/${code}`;
    try {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button onClick={onClick} className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-100">
      {copied ? "✓ Copied" : "Copy URL"}
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Recent sessions
// ───────────────────────────────────────────────────────────────────────

function RecentSessionsCard() {
  const q = trpc.admin.waAttribution.recentSessions.useQuery({ limit: 50 });
  const items = q.data?.items || [];

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-semibold text-slate-900">Recent WhatsApp clicks</h2>
        <span className="text-xs text-slate-500">Each row is one ad click that led to a WhatsApp session. See full funnel per lead.</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-2">Clicked</th>
              <th className="py-2 pr-2">Session</th>
              <th className="py-2 pr-2">Campaign</th>
              <th className="py-2 pr-2">Lead</th>
              <th className="py-2 pr-2">Messaged</th>
              <th className="py-2 pr-2">Converted</th>
              <th className="py-2 pr-2">Value</th>
              <th className="py-2 pr-2">Offline upload</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={8} className="py-6 text-center text-slate-400">Loading…</td></tr>}
            {q.data && items.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-slate-400">No sessions yet. Wait for someone to click a /wa/ link, or run a test click yourself.</td></tr>
            )}
            {items.map((r: any) => (
              <tr key={r.sessionId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-2 text-xs">{new Date(r.clickedAt).toLocaleString()}</td>
                <td className="py-2 pr-2 text-xs font-mono">{r.sessionId}</td>
                <td className="py-2 pr-2 text-xs">{r.campaignCode}</td>
                <td className="py-2 pr-2">
                  {r.leadId ? (
                    <div>
                      <div className="text-xs font-medium">{r.studentName || "(no name)"}</div>
                      <div className="text-xs text-slate-500">{r.studentEmail || r.studentPhone || "—"}</div>
                    </div>
                  ) : <span className="text-xs text-slate-400">not linked yet</span>}
                </td>
                <td className="py-2 pr-2 text-xs">{r.messagedAt ? new Date(r.messagedAt).toLocaleString() : "—"}</td>
                <td className="py-2 pr-2 text-xs">
                  {r.convertedAt ? (
                    <span className="text-emerald-700 font-medium">{r.conversionKind} · {new Date(r.convertedAt).toLocaleDateString()}</span>
                  ) : "—"}
                </td>
                <td className="py-2 pr-2 text-xs">{r.conversionValueIdr ? fmtIdr(r.conversionValueIdr) : "—"}</td>
                <td className="py-2 pr-2 text-xs">
                  <OfflineStatusPill status={r.offlineUploadStatus} hasGclid={!!r.gclid} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OfflineStatusPill({ status, hasGclid }: { status: string | null; hasGclid: boolean }) {
  if (!hasGclid) return <span className="text-slate-400" title="No GCLID captured — not from a paid Google Ads click">no GCLID</span>;
  if (!status) return <span className="text-slate-400">pending</span>;
  const colour =
    status === "success" ? "bg-emerald-100 text-emerald-800" :
    status === "failed" || status === "error" ? "bg-red-100 text-red-800" :
    status === "partial_failure" ? "bg-amber-100 text-amber-800" :
    "bg-slate-100 text-slate-700";
  return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${colour}`}>{status}</span>;
}

// ───────────────────────────────────────────────────────────────────────
// Docs for social media team
// ───────────────────────────────────────────────────────────────────────

function SocialMediaTeamGuide() {
  return (
    <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
      <h2 className="font-semibold text-indigo-900 mb-2">How to use these links (for the social media team)</h2>
      <ol className="text-sm text-slate-800 space-y-1.5 list-decimal ml-5">
        <li>Before launching a new ad, come here and click <strong>Create + copy URL</strong>. Pick the product + platform.</li>
        <li>Paste the copied URL into the ad's WhatsApp button field (or as a link in the IG story swipe-up, TikTok bio, email CTA, etc.).</li>
        <li>Whenever someone clicks that ad, the URL logs their Google Ads GCLID + UTMs into our CRM and redirects them to WhatsApp with a pre-filled message.</li>
        <li>Emma the bot recognises the session from the first message and personalises her reply (she'll open with product-specific info instead of asking "info about what?").</li>
        <li>Watch the <strong>Campaign performance</strong> table above to see clicks → conversations → paid customers per campaign. Compare Google Ads vs IG vs TikTok side-by-side.</li>
        <li>When a paying customer originally came through a tracked click, we automatically send an "offline conversion" back to Google Ads so Smart Bidding learns which ads produce real revenue.</li>
      </ol>
      <p className="text-xs text-slate-600 mt-3">
        <strong>Rule of thumb:</strong> Never use a bare <code className="bg-white px-1">wa.me</code> link in a paid ad again — always use a <code className="bg-white px-1">/wa/&lt;code&gt;</code> URL from this page so we can attribute the outcome.
      </p>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Utils
// ───────────────────────────────────────────────────────────────────────

function fmtIdr(n: number | null | undefined): string {
  if (!n || n <= 0) return "Rp 0";
  return "Rp " + n.toLocaleString("id-ID");
}
function pct(n: number, denom: number): string {
  if (!denom) return "—";
  return `${Math.round((n / denom) * 100)}% of prev`;
}
