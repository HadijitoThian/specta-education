/**
 * SpecTa IQ Discovery — result-screen components.
 *
 * Two pieces:
 *   - IqRadarChart: pure SVG radar showing 5 per-domain bands (0-17 scale)
 *   - IqResultScreen: full result-page layout with archetype card,
 *     radar, narrative sections, share CTA.
 *
 * All data comes from the server's `iq.finish` return value.
 * Kept legally safe with visible "estimasi bukan tes klinis" footer.
 */

import { Sparkles, TrendingUp, Target, Compass, ArrowRight, Trophy } from "lucide-react";

// ── Palette that matches the landing hero ───────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  fluid:        "#6366f1", // indigo
  quantitative: "#a855f7", // purple
  verbal:       "#ec4899", // pink
  spatial:      "#8b5cf6", // violet
  memory:       "#3b82f6", // blue
};

const DOMAIN_LABELS_ID: Record<string, string> = {
  fluid:        "Logika",
  quantitative: "Angka",
  verbal:       "Verbal",
  spatial:      "Spasial",
  memory:       "Memori",
};

const DOMAIN_EMOJI: Record<string, string> = {
  fluid:        "🧩",
  quantitative: "🔢",
  verbal:       "💬",
  spatial:      "🧊",
  memory:       "🧠",
};

// ── SVG radar chart ─────────────────────────────────────────────────────

interface RadarProps {
  perDomain: Record<string, { scaledBand: number }>;
  size?: number;
}

export function IqRadarChart({ perDomain, size = 320 }: RadarProps) {
  const domains = ["fluid", "quantitative", "verbal", "spatial", "memory"];
  const cx = 150, cy = 150, maxR = 110;
  const maxBand = 17;

  // 5-point regular polygon at each domain's angle
  const angleFor = (i: number) => (Math.PI * 2 * i) / domains.length - Math.PI / 2;
  const point = (i: number, radius: number) => ({
    x: cx + radius * Math.cos(angleFor(i)),
    y: cy + radius * Math.sin(angleFor(i)),
  });

  // Concentric grid rings at 25/50/75/100%
  const rings = [0.25, 0.5, 0.75, 1].map(f => {
    const pts = domains.map((_, i) => point(i, maxR * f));
    return pts.map(p => `${p.x},${p.y}`).join(" ");
  });

  // Data polygon
  const dataPts = domains.map((d, i) => {
    const band = Math.max(0, Math.min(maxBand, perDomain[d]?.scaledBand ?? 0));
    return point(i, (band / maxBand) * maxR);
  });
  const dataPoly = dataPts.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox="0 0 300 300" className="mx-auto">
      {/* Grid rings */}
      {rings.map((r, i) => (
        <polygon key={i} points={r} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {domains.map((_, i) => {
        const p = point(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      {/* Data area */}
      <polygon
        points={dataPoly}
        fill="url(#radarGradient)"
        fillOpacity={0.35}
        stroke="#8b5cf6"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* Data points */}
      {dataPts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={DOMAIN_COLORS[domains[i]]}
          stroke="white"
          strokeWidth={2}
        />
      ))}
      {/* Domain labels */}
      {domains.map((d, i) => {
        const p = point(i, maxR + 25);
        return (
          <g key={d}>
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={11}
              fontWeight={700}
              fill="#334155"
            >
              {DOMAIN_LABELS_ID[d]}
            </text>
            <text
              x={p.x}
              y={p.y + 12}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {perDomain[d]?.scaledBand ?? 0}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Full result screen ─────────────────────────────────────────────────

interface IqResultScreenProps {
  summary: any; // shape: IqScoreResult + { narrative, mode, studentName }
}

export function IqResultScreen({ summary }: IqResultScreenProps) {
  const isPreview = summary.mode === "preview";
  const arch = summary.archetype || { labelId: "Pemikir Serbabisa", emoji: "🧠", tagline: { id: "" } };
  const narrative = summary.narrative || {};
  const domains = ["fluid", "quantitative", "verbal", "spatial", "memory"] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-16">
      <div className="max-w-2xl mx-auto p-4 pt-8 space-y-4">
        {/* ── Big number + archetype card ──────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-purple-500/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative text-center">
            {summary.studentName && (
              <div className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-2">
                Hasil untuk {summary.studentName}
              </div>
            )}
            <div className="text-xs uppercase tracking-widest text-purple-300 font-semibold">
              {isPreview ? "Preview · Estimasi Kasar" : "Estimasi IQ"}
            </div>
            <div className="text-7xl md:text-8xl font-black mt-2 mb-1" style={{ background: "linear-gradient(90deg, #c4b5fd, #f0abfc, #fda4af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {summary.fsiq}
            </div>
            <div className="text-sm text-purple-200">± {summary.confidenceRange} · Persentil {summary.percentile}</div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-2">Arketip Kognitifmu</div>
              <div className="text-5xl mb-1">{arch.emoji}</div>
              <div className="text-2xl md:text-3xl font-bold">{arch.labelId}</div>
              <div className="text-sm text-purple-200 italic mt-1">"{arch.tagline?.id || ""}"</div>
            </div>
          </div>
        </div>

        {/* ── Narrative summary ────────────────────────────────────── */}
        {narrative.summary && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-purple-600 font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Analisis Personal
            </div>
            <p className="text-slate-700 leading-relaxed">{narrative.summary}</p>
          </div>
        )}

        {/* ── Radar chart of domains ───────────────────────────────── */}
        {summary.perDomain && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-purple-600 font-bold mb-3">
              <Target className="w-3.5 h-3.5" /> Skor per Dimensi
            </div>
            <IqRadarChart perDomain={summary.perDomain} />
            <div className="mt-4 grid grid-cols-5 gap-2 text-center">
              {domains.map(d => (
                <div key={d}>
                  <div className="text-2xl">{DOMAIN_EMOJI[d]}</div>
                  <div className="text-xs font-semibold text-slate-900">{summary.perDomain[d]?.scaledBand ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Per-domain deep dives ───────────────────────────────── */}
        {narrative.perDomain && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-purple-600 font-bold mb-4">
              <Compass className="w-3.5 h-3.5" /> Analisis per Dimensi
            </div>
            <div className="space-y-4">
              {domains.map(d => (
                <div key={d} className="flex gap-3">
                  <div className="text-2xl shrink-0">{DOMAIN_EMOJI[d]}</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">
                      {DOMAIN_LABELS_ID[d]} <span className="text-slate-400 font-normal">· {summary.perDomain?.[d]?.scaledBand ?? 0}/17</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{narrative.perDomain[d]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Strengths ─────────────────────────────────────────────── */}
        {narrative.strengths?.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-green-600 font-bold mb-3">
              <TrendingUp className="w-3.5 h-3.5" /> Kekuatan Kamu
            </div>
            <ul className="space-y-2">
              {narrative.strengths.map((s: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Growth areas ─────────────────────────────────────────── */}
        {narrative.growthAreas?.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-600 font-bold mb-3">
              <ArrowRight className="w-3.5 h-3.5" /> Area untuk Tumbuh
            </div>
            <ul className="space-y-2">
              {narrative.growthAreas.map((s: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-amber-500 font-bold">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Career hints ─────────────────────────────────────────── */}
        {narrative.careerHints?.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-indigo-700 font-bold mb-3">
              <Trophy className="w-3.5 h-3.5" /> Rekomendasi Jurusan / Karir
            </div>
            <div className="grid gap-2">
              {narrative.careerHints.map((c: string, i: number) => (
                <div key={i} className="bg-white rounded-xl px-4 py-3 text-sm text-slate-700 shadow-sm">
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Preview upsell (only for preview mode) ──────────────── */}
        {isPreview && (
          <div className="rounded-2xl shadow-lg border-2 border-indigo-200 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="text-xl font-bold">Ini baru preview.</h3>
            <p className="text-sm text-indigo-100 mt-1">
              Tes lengkap = 40 soal, estimasi IQ ± 5, laporan PDF 12 halaman, gambar untuk IG Story.
            </p>
            <a href="/iq-discovery/beli" className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50">
              <Trophy className="w-4 h-4" /> Unlock skor lengkap · Rp 59k
            </a>
          </div>
        )}

        {/* ── Full-test share CTA (only for full mode) ────────────── */}
        {!isPreview && (
          <div className="rounded-2xl shadow-lg border-2 border-indigo-200 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center">
            <h3 className="text-lg font-bold">Cek email kamu 📧</h3>
            <p className="text-sm text-indigo-100 mt-1">
              Laporan PDF + gambar untuk IG Story sudah dikirim ke inbox. Tag @spectaeducation kalau kamu share!
            </p>
          </div>
        )}

        {/* ── Legal disclaimer footer ─────────────────────────────── */}
        <p className="text-[10px] text-slate-400 text-center italic px-6">
          Estimasi berbasis AI menggunakan metodologi kognitif CHC. Bukan pengganti tes IQ klinis profesional yang perlu proctoring dari psikolog berlisensi. Untuk tujuan self-discovery.
        </p>
      </div>
    </div>
  );
}
