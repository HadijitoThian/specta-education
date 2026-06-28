/**
 * IGCSE AI Teacher — lesson room (Week 4: chat + interactive whiteboard).
 *
 * The AI now returns BOTH a spoken-style reply (chat bubble) AND ordered
 * "board commands" (titles, steps, prose lines, LaTeX equations) that we
 * render onto a shared whiteboard panel. Equations are typeset with KaTeX
 * (loaded once via CDN — no npm dependency added). New board items "appear"
 * one at a time so it feels like a teacher writing.
 *
 * Coming next (Week 5): student drawing layer over the board, diagram
 * templates (number lines, axes, triangles). Week 6: voice pipeline.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";

const PURPLE = "#7c3aed";
const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

// ── KaTeX loader (CDN, idempotent) ───────────────────────────────────────────
let katexReady: Promise<any> | null = null;
function loadKatex(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).katex) return Promise.resolve((window as any).katex);
  if (katexReady) return katexReady;
  katexReady = new Promise((resolve) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).katex);
    script.onerror = () => resolve(null); // fall back to raw latex text
    document.head.appendChild(script);
  });
  return katexReady;
}

function KatexEquation({ latex }: { latex: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadKatex().then((k) => {
      if (cancelled || !ref.current) return;
      if (!k) { ref.current.textContent = latex; return; }
      try { k.render(latex, ref.current, { displayMode: true, throwOnError: false, output: "html" }); }
      catch { if (ref.current) ref.current.textContent = latex; }
    });
    return () => { cancelled = true; };
  }, [latex]);
  return <div ref={ref} className="my-1 overflow-x-auto" />;
}

function BoardItem({ item }: { item: any }) {
  switch (item?.type) {
    case "title":
      return <h3 className="text-base font-bold text-violet-900 mt-3 first:mt-0">{item.text}</h3>;
    case "step":
      return (
        <div className="flex gap-2 mt-2 text-sm">
          <span className="font-mono font-bold text-violet-700 shrink-0">{item.n ?? "•"}.</span>
          <span className="text-slate-800">{item.text}</span>
        </div>
      );
    case "text":
      return <p className="text-sm text-slate-700 mt-2">{item.text}</p>;
    case "equation":
      return <KatexEquation latex={String(item.latex || "")} />;
    case "number_line":
      return <NumberLine from={Number(item.from)} to={Number(item.to)} marks={item.marks || []} />;
    case "triangle":
      return <Triangle sides={item.sides || {}} labels={item.labels || {}} />;
    case "axes":
      return <Axes
        xRange={item.xRange || [-5, 5]} yRange={item.yRange || [-5, 5]}
        title={item.title} points={item.points || []} lines={item.lines || []} functions={item.functions || []}
      />;
    default:
      return null;
  }
}

// ── SVG diagram renderers ────────────────────────────────────────────────────
function NumberLine({ from, to, marks }: { from: number; to: number; marks: any[] }) {
  if (!isFinite(from) || !isFinite(to) || to <= from) return null;
  const pad = 30, W = 500, H = 70;
  const inner = W - 2 * pad;
  const x = (v: number) => pad + ((v - from) / (to - from)) * inner;
  const y = H / 2;
  const ticks: number[] = [];
  for (let i = Math.ceil(from); i <= Math.floor(to); i++) ticks.push(i);
  return (
    <div className="my-3 bg-white rounded-lg border border-slate-100 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl mx-auto block" aria-label="Number line">
        <defs>
          <marker id="nl-arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#334155" />
          </marker>
        </defs>
        <line x1={pad - 8} y1={y} x2={W - pad + 8} y2={y} stroke="#334155" strokeWidth="2" markerEnd="url(#nl-arr)" markerStart="url(#nl-arr)" />
        {ticks.map(t => (
          <g key={`tk-${t}`}>
            <line x1={x(t)} y1={y - 6} x2={x(t)} y2={y + 6} stroke="#94a3b8" strokeWidth="1.5" />
            <text x={x(t)} y={y + 22} textAnchor="middle" fontSize="11" fill="#64748b">{t}</text>
          </g>
        ))}
        {marks.map((m: any, i: number) => isFinite(Number(m?.x)) ? (
          <g key={`m-${i}`}>
            <circle cx={x(Number(m.x))} cy={y} r="5" fill="#7c3aed" />
            {m.label ? <text x={x(Number(m.x))} y={y - 12} textAnchor="middle" fontSize="12" fill="#7c3aed" fontWeight="600">{String(m.label)}</text> : null}
          </g>
        ) : null)}
      </svg>
    </div>
  );
}

function Triangle({ sides, labels }: { sides: any; labels: any }) {
  const a = Number(sides?.a), b = Number(sides?.b), c = Number(sides?.c);
  if (!isFinite(a) || !isFinite(b) || !isFinite(c) || a <= 0 || b <= 0 || c <= 0) return null;
  if (a + b <= c || a + c <= b || b + c <= a) return null; // triangle inequality
  // Place A=(0,0), B=(c,0), C from law of cosines: cos A = (b²+c²-a²)/(2bc)
  const cosA = (b * b + c * c - a * a) / (2 * b * c);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const Cx = b * Math.cos(A), Cy = b * Math.sin(A);
  // Fit into a viewBox with padding
  const minX = Math.min(0, Cx), maxX = Math.max(c, Cx);
  const minY = 0, maxY = Cy;
  const pad = 30, BW = 360, BH = 280;
  const sx = (BW - 2 * pad) / Math.max(0.001, (maxX - minX));
  const sy = (BH - 2 * pad) / Math.max(0.001, (maxY - minY));
  const s = Math.min(sx, sy);
  const ox = (BW - (maxX - minX) * s) / 2 - minX * s;
  const oy = BH - pad; // y axis points up
  const px = (vx: number) => ox + vx * s;
  const py = (vy: number) => oy - vy * s;
  const A_p = { x: px(0), y: py(0) };
  const B_p = { x: px(c), y: py(0) };
  const C_p = { x: px(Cx), y: py(Cy) };
  const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  return (
    <div className="my-3 bg-white rounded-lg border border-slate-100 p-2">
      <svg viewBox={`0 0 ${BW} ${BH}`} className="w-full max-w-md mx-auto block" aria-label="Triangle">
        <polygon points={`${A_p.x},${A_p.y} ${B_p.x},${B_p.y} ${C_p.x},${C_p.y}`} fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" />
        {/* vertex labels */}
        <text x={A_p.x - 12} y={A_p.y + 16} fontSize="13" fontWeight="700" fill="#5b21b6">A</text>
        <text x={B_p.x + 6} y={B_p.y + 16} fontSize="13" fontWeight="700" fill="#5b21b6">B</text>
        <text x={C_p.x - 6} y={C_p.y - 8} fontSize="13" fontWeight="700" fill="#5b21b6">C</text>
        {/* side labels — a opp A (side BC), b opp B (side AC), c opp C (side AB) */}
        {labels?.a ? (() => { const m = mid(B_p, C_p); return <text x={m.x + 10} y={m.y} fontSize="12" fill="#334155">{String(labels.a)}</text>; })() : null}
        {labels?.b ? (() => { const m = mid(A_p, C_p); return <text x={m.x - 26} y={m.y} fontSize="12" fill="#334155">{String(labels.b)}</text>; })() : null}
        {labels?.c ? (() => { const m = mid(A_p, B_p); return <text x={m.x} y={m.y + 18} fontSize="12" fill="#334155">{String(labels.c)}</text>; })() : null}
        {/* angle labels at vertices */}
        {labels?.A ? <text x={A_p.x + 12} y={A_p.y - 8} fontSize="11" fill="#0f172a">{String(labels.A)}</text> : null}
        {labels?.B ? <text x={B_p.x - 28} y={B_p.y - 8} fontSize="11" fill="#0f172a">{String(labels.B)}</text> : null}
        {labels?.C ? <text x={C_p.x - 4} y={C_p.y + 14} fontSize="11" fill="#0f172a">{String(labels.C)}</text> : null}
      </svg>
    </div>
  );
}

function Axes({ xRange, yRange, title, points, lines, functions }: {
  xRange: [number, number]; yRange: [number, number];
  title?: string; points: any[]; lines: any[]; functions: any[];
}) {
  const [xmin, xmax] = xRange, [ymin, ymax] = yRange;
  if (!(xmax > xmin) || !(ymax > ymin)) return null;
  const pad = 30, W = 360, H = 360;
  const x = (vx: number) => pad + ((vx - xmin) / (xmax - xmin)) * (W - 2 * pad);
  const y = (vy: number) => H - pad - ((vy - ymin) / (ymax - ymin)) * (H - 2 * pad);
  const xticks: number[] = [];
  for (let i = Math.ceil(xmin); i <= Math.floor(xmax); i++) xticks.push(i);
  const yticks: number[] = [];
  for (let i = Math.ceil(ymin); i <= Math.floor(ymax); i++) yticks.push(i);
  const colors = ["#7c3aed", "#db2777", "#0ea5e9", "#16a34a", "#ea580c"];
  const samples = (fn: (vx: number) => number, count = 120) => {
    const pts: string[] = []; let prev: { x: number; y: number } | null = null;
    for (let i = 0; i <= count; i++) {
      const vx = xmin + (i / count) * (xmax - xmin);
      const vy = fn(vx);
      if (!isFinite(vy) || vy < ymin - 1e6 || vy > ymax + 1e6) { prev = null; continue; }
      const px = x(vx), py = y(Math.max(ymin, Math.min(ymax, vy)));
      pts.push(prev ? `L ${px} ${py}` : `M ${px} ${py}`);
      prev = { x: px, y: py };
    }
    return pts.join(" ");
  };
  return (
    <div className="my-3 bg-white rounded-lg border border-slate-100 p-2">
      {title ? <div className="text-xs text-center text-slate-500 mb-1">{String(title)}</div> : null}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto block" aria-label="Axes">
        {/* grid */}
        {xticks.map(t => <line key={`gv-${t}`} x1={x(t)} y1={pad} x2={x(t)} y2={H - pad} stroke="#f1f5f9" strokeWidth="1" />)}
        {yticks.map(t => <line key={`gh-${t}`} x1={pad} y1={y(t)} x2={W - pad} y2={y(t)} stroke="#f1f5f9" strokeWidth="1" />)}
        {/* axes — only draw if 0 is in range */}
        {xmin <= 0 && xmax >= 0 ? <line x1={x(0)} y1={pad} x2={x(0)} y2={H - pad} stroke="#94a3b8" strokeWidth="1.5" /> : null}
        {ymin <= 0 && ymax >= 0 ? <line x1={pad} y1={y(0)} x2={W - pad} y2={y(0)} stroke="#94a3b8" strokeWidth="1.5" /> : null}
        {/* x-axis ticks */}
        {xticks.map(t => (t !== 0 ? (
          <g key={`xt-${t}`}>
            <line x1={x(t)} y1={y(0) - 3} x2={x(t)} y2={y(0) + 3} stroke="#94a3b8" />
            <text x={x(t)} y={y(0) + 14} textAnchor="middle" fontSize="9" fill="#64748b">{t}</text>
          </g>
        ) : null))}
        {yticks.map(t => (t !== 0 ? (
          <g key={`yt-${t}`}>
            <line x1={x(0) - 3} y1={y(t)} x2={x(0) + 3} y2={y(t)} stroke="#94a3b8" />
            <text x={x(0) - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#64748b">{t}</text>
          </g>
        ) : null))}
        {/* lines */}
        {lines.map((ln: any, i: number) => {
          const x1 = Number(ln.x1), y1 = Number(ln.y1), x2 = Number(ln.x2), y2 = Number(ln.y2);
          if (![x1, y1, x2, y2].every(isFinite)) return null;
          const c = colors[i % colors.length];
          return (
            <g key={`ln-${i}`}>
              <line x1={x(x1)} y1={y(y1)} x2={x(x2)} y2={y(y2)} stroke={c} strokeWidth="2" />
              {ln.label ? <text x={x((x1 + x2) / 2) + 6} y={y((y1 + y2) / 2) - 4} fontSize="11" fill={c}>{String(ln.label)}</text> : null}
            </g>
          );
        })}
        {/* functions */}
        {functions.map((f: any, i: number) => {
          const c = colors[(i + lines.length) % colors.length];
          let fn: ((vx: number) => number) | null = null;
          if (f?.kind === "linear" && isFinite(Number(f.m)) && isFinite(Number(f.c))) {
            const m = Number(f.m), cc = Number(f.c); fn = (vx: number) => m * vx + cc;
          } else if (f?.kind === "quadratic" && isFinite(Number(f.a)) && isFinite(Number(f.b)) && isFinite(Number(f.c))) {
            const a = Number(f.a), b = Number(f.b), cc = Number(f.c); fn = (vx: number) => a * vx * vx + b * vx + cc;
          }
          if (!fn) return null;
          const d = samples(fn);
          return (
            <g key={`fn-${i}`}>
              <path d={d} stroke={c} strokeWidth="2" fill="none" />
              {f.label ? <text x={W - pad - 8} y={pad + 14 + i * 14} textAnchor="end" fontSize="11" fill={c}>{String(f.label)}</text> : null}
            </g>
          );
        })}
        {/* points */}
        {points.map((p: any, i: number) => {
          const vx = Number(p?.x), vy = Number(p?.y);
          if (!isFinite(vx) || !isFinite(vy)) return null;
          return (
            <g key={`pt-${i}`}>
              <circle cx={x(vx)} cy={y(vy)} r="4" fill="#7c3aed" />
              {p.label ? <text x={x(vx) + 6} y={y(vy) - 6} fontSize="11" fill="#5b21b6">{String(p.label)}</text> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Student sketch (canvas overlay) ──────────────────────────────────────────
type Pt = { x: number; y: number };
type Stroke = { color: string; width: number; eraser: boolean; points: Pt[] };

function loadStrokes(sessionId: number): Stroke[] {
  try {
    const raw = localStorage.getItem(`igcse-sketch-${sessionId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveStrokes(sessionId: number, strokes: Stroke[]) {
  try { localStorage.setItem(`igcse-sketch-${sessionId}`, JSON.stringify(strokes)); } catch { /* quota */ }
}

function SketchCanvas({
  sessionId, contentRef, draw, tool, color, strokes, setStrokes,
}: {
  sessionId: number;
  contentRef: React.RefObject<HTMLDivElement | null>;
  draw: boolean; tool: "pen" | "eraser"; color: string;
  strokes: Stroke[]; setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<Stroke | null>(null);

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    if (!s.points.length) return;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = s.width;
    if (s.eraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = s.color;
    }
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
  };
  const redrawAll = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) drawStroke(ctx, s);
    // also preserve any in-progress stroke through a resize
    if (drawingRef.current) drawStroke(ctx, drawingRef.current);
  };

  // Resize canvas to match the content (AI board grows as new items arrive).
  // Skip during an active stroke (so resizing can't wipe the in-progress stroke)
  // and debounce with rAF + a tolerance so sub-pixel jitter from the parent
  // layout doesn't trigger a feedback loop ("screen vibrates").
  useEffect(() => {
    const content = contentRef.current;
    const canvas = canvasRef.current;
    if (!content || !canvas) return;
    let rafId = 0;
    const TOL = 2; // px — ignore tiny size jitter
    const update = () => {
      rafId = 0;
      if (drawingRef.current) return; // never resize mid-stroke
      const w = content.offsetWidth, h = content.offsetHeight;
      if (Math.abs(canvas.width - w) < TOL && Math.abs(canvas.height - h) < TOL) return;
      canvas.width = w; canvas.height = h;
      redrawAll();
    };
    update();
    const ro = new ResizeObserver(() => {
      if (rafId) return; // already queued
      rafId = requestAnimationFrame(update);
    });
    ro.observe(content);
    return () => { ro.disconnect(); if (rafId) cancelAnimationFrame(rafId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentRef]);

  // Redraw whenever the strokes array changes (undo/clear/initial-load).
  useEffect(() => { redrawAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [strokes]);

  const getCoords = (e: React.PointerEvent) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent) => {
    if (!draw) return;
    e.preventDefault();
    const pt = getCoords(e); if (!pt) return;
    drawingRef.current = {
      color, eraser: tool === "eraser",
      width: tool === "eraser" ? 18 : 3,
      points: [pt],
    };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onMove = (e: React.PointerEvent) => {
    const s = drawingRef.current; if (!s || !draw) return;
    const pt = getCoords(e); if (!pt) return;
    s.points.push(pt);
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    drawStroke(ctx, s);
  };
  const onUp = () => {
    const s = drawingRef.current; drawingRef.current = null;
    if (!s || s.points.length === 0) return;
    setStrokes(arr => {
      const next = [...arr, s];
      saveStrokes(sessionId, next);
      return next;
    });
  };

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-10 ${draw ? "cursor-crosshair touch-none" : ""}`}
      style={{
        pointerEvents: draw ? "auto" : "none",
        // CSS size always tracks the parent so the canvas can never be visually
        // smaller than the content area; the JS-set bitmap width/height controls
        // drawing resolution.
        width: "100%",
        height: "100%",
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    />
  );
}

function BoardPanel({ items, displayed, sessionId }: { items: any[]; displayed: number; sessionId: number }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(() => loadStrokes(sessionId));
  const [draw, setDraw] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#7c3aed");

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayed]);

  const undo = () => setStrokes(arr => {
    const next = arr.slice(0, -1);
    saveStrokes(sessionId, next);
    return next;
  });
  const clearAll = () => {
    if (!strokes.length) return;
    if (!confirm("Clear all your sketches?")) return;
    setStrokes([]); saveStrokes(sessionId, []);
  };

  const COLORS = ["#7c3aed", "#dc2626", "#0ea5e9", "#0f172a"] as const;

  // Important: the toolbar's height stays CONSTANT whether sketching is on or
  // off (we just disable the tools when off). This keeps the content area
  // height stable, so toggling sketch can't trigger a ResizeObserver loop.
  const toolBtn = "px-2 py-1 rounded-md disabled:opacity-30";
  return (
    <div className={`${card} overflow-hidden flex flex-col h-full`}>
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500 flex items-center justify-between gap-2 whitespace-nowrap overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span>📋 Whiteboard</span>
          <span className="text-slate-400 font-normal">{displayed}/{items.length}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setDraw(d => !d)}
            className={`${toolBtn} ${draw ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
            title="Toggle sketching"
          >
            ✏️ {draw ? "On" : "Sketch"}
          </button>
          <button type="button" onClick={() => setTool("pen")} disabled={!draw}
            className={`${toolBtn} ${draw && tool === "pen" ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-slate-100"}`}>Pen</button>
          <button type="button" onClick={() => setTool("eraser")} disabled={!draw}
            className={`${toolBtn} ${draw && tool === "eraser" ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-slate-100"}`}>Eraser</button>
          <div className="flex gap-1 ml-1" aria-label="Pen colour">
            {COLORS.map(c => (
              <button key={c} type="button"
                disabled={!draw}
                onClick={() => { setTool("pen"); setColor(c); }}
                aria-label={`Colour ${c}`}
                className={`w-5 h-5 rounded-full border-2 disabled:opacity-30 ${color === c && tool === "pen" && draw ? "border-slate-700" : "border-transparent hover:border-slate-300"}`}
                style={{ background: c }} />
            ))}
          </div>
          <button type="button" onClick={undo} disabled={!strokes.length}
            className={`${toolBtn} text-slate-700 hover:bg-slate-100`} title="Undo last stroke">↶</button>
          <button type="button" onClick={clearAll} disabled={!strokes.length}
            className={`${toolBtn} text-slate-700 hover:bg-slate-100`} title="Clear all sketches">Clear</button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div ref={contentRef} className="p-4 relative min-h-full">
          {items.length === 0 ? (
            <div className="h-full grid place-items-center text-center text-slate-400 text-sm">
              <div>
                <div className="text-3xl mb-2">✏️</div>
                <div>The teacher's working will appear here.</div>
                <div className="text-xs text-slate-300 mt-1">Ask a question to get started — and toggle <strong>Sketch</strong> to draw on the board yourself.</div>
              </div>
            </div>
          ) : (
            items.slice(0, displayed).map((item, i) => <BoardItem key={i} item={item} />)
          )}
          <SketchCanvas
            sessionId={sessionId} contentRef={contentRef}
            draw={draw} tool={tool} color={color}
            strokes={strokes} setStrokes={setStrokes}
          />
        </div>
      </div>
    </div>
  );
}

// ── Lesson page ──────────────────────────────────────────────────────────────
export default function IgcseLesson() {
  const [, params] = useRoute<{ id: string }>("/igcse/lesson/:id");
  const sessionId = Number(params?.id ?? 0);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const session = trpc.igcse.getSession.useQuery({ id: sessionId }, { enabled: sessionId > 0, retry: false });
  const topics = trpc.igcse.listTopics.useQuery(undefined, { staleTime: 5 * 60_000 });
  const status = trpc.igcse.status.useQuery(undefined, { refetchInterval: 30_000 });

  const topic = useMemo(() => {
    if (!session.data?.topicId || !topics.data) return null;
    return topics.data.find((t: any) => t.id === session.data!.topicId) || null;
  }, [session.data?.topicId, topics.data]);

  // Local transcript + board mirror.
  const [turns, setTurns] = useState<any[]>([]);
  const [boardItems, setBoardItems] = useState<any[]>([]);
  const [displayed, setDisplayed] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement | null>(null);

  // Sync from server when session loads / changes.
  useEffect(() => {
    if (!session.data) return;
    setTurns(((session.data.transcript as any[]) || []));
    const initialBoard = (session.data.boardSnapshot as any[]) || [];
    setBoardItems(initialBoard);
    setDisplayed(initialBoard.length); // restore fully — no replay
  }, [session.data?.id]);

  // Reveal new board items one-by-one as they arrive.
  useEffect(() => {
    if (displayed >= boardItems.length) return;
    const t = setTimeout(() => setDisplayed(d => d + 1), 600);
    return () => clearTimeout(t);
  }, [boardItems.length, displayed]);

  // Track elapsed lesson time client-side (sent on each message).
  const startRef = useRef<number>(Date.now());
  useEffect(() => { startRef.current = Date.now(); }, [session.data?.id]);

  // Voice state
  const [voiceMode, setVoiceMode] = useState(false); // AI speaks aloud + auto-listen
  const [listening, setListening] = useState(false); // mic is active right now
  const [speaking, setSpeaking] = useState(false);   // tutor audio is playing
  const [lang, setLang] = useState<"en" | "id">("en"); // EN or Bahasa
  const [voiceId, setVoiceId] = useState<string>(() => {
    try { return localStorage.getItem("igcse-voice-id") || ""; } catch { return ""; }
  });
  const [voiceSpeed, setVoiceSpeed] = useState<number>(() => {
    try { return Number(localStorage.getItem("igcse-voice-speed")) || 1.1; } catch { return 1.1; }
  });
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const voices = trpc.igcse.listVoices.useQuery(undefined, { staleTime: 60 * 60_000 });
  useEffect(() => { try { localStorage.setItem("igcse-voice-id", voiceId); } catch { /* ignore */ } }, [voiceId]);
  useEffect(() => { try { localStorage.setItem("igcse-voice-speed", String(voiceSpeed)); } catch { /* ignore */ } }, [voiceSpeed]);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sttSupported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Sync local language from the loaded session (and again if the server-side
  // record changes — e.g. another tab updated it).
  useEffect(() => {
    if (session.data?.language === "id" || session.data?.language === "en") {
      setLang(session.data.language);
    }
  }, [session.data?.language]);

  const updateLang = trpc.igcse.updateSessionLanguage.useMutation({
    onSuccess: () => utils.igcse.getSession.invalidate({ id: sessionId }),
  });
  const flipLang = (next: "en" | "id") => {
    if (next === lang) return;
    setLang(next);
    updateLang.mutate({ id: sessionId, language: next });
    // Stop any in-progress audio/recognition so the next interaction uses the new language.
    stopAudio(); stopListening();
  };

  // Cleanup on unmount
  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    try { audioRef.current?.pause(); } catch { /* ignore */ }
  }, []);

  const stopAudio = () => {
    try { audioRef.current?.pause(); } catch { /* ignore */ }
    // also stop browser-native TTS if it was the active path
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    audioRef.current = null;
    setSpeaking(false);
  };
  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  const startListening = () => {
    if (listening || sending || speaking) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    const rec = new SR();
    rec.lang = lang === "id" ? "id-ID" : "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event: any) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();
      if (!transcript) return;
      // Submit the transcribed message as if the user typed it.
      setInput("");
      setSending(true);
      setTurns(t => [...t, { role: "student", text: transcript, ts: Date.now() }]);
      setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 30);
      const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
      sendMessage.mutate({ sessionId, message: transcript, elapsedSec });
    };
    rec.onerror = () => { setListening(false); recognitionRef.current = null; };
    rec.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = rec;
    try { rec.start(); setListening(true); }
    catch { setListening(false); recognitionRef.current = null; }
  };

  const synthMut = trpc.igcse.synthesizeSpeech.useMutation();

  // After the AI replies, speak the text aloud via this chain:
  // 1) server-side TTS (ElevenLabs → OpenAI fallback inside the endpoint)
  // 2) browser-native SpeechSynthesis (free, no API quota — always works
  //    on Chrome/Edge; quality is acceptable for tutoring)
  const onTtsDone = () => {
    audioRef.current = null;
    setSpeaking(false);
    if (voiceMode && sttSupported) setTimeout(() => startListening(), 400);
  };
  const browserSpeak = (text: string): boolean => {
    if (typeof window === "undefined" || !window.speechSynthesis) return false;
    try {
      window.speechSynthesis.cancel(); // drop anything queued from prior turns
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang === "id" ? "id-ID" : "en-US";
      utt.rate = Math.max(0.5, Math.min(2, voiceSpeed));
      utt.pitch = 1;
      utt.onend = onTtsDone;
      utt.onerror = onTtsDone;
      window.speechSynthesis.speak(utt);
      setSpeaking(true);
      return true;
    } catch { return false; }
  };
  const speakOut = async (text: string) => {
    if (!text) return;
    try {
      const d = await synthMut.mutateAsync({
        sessionId, text,
        voiceId: voiceId || undefined,
        speed: voiceSpeed,
      });
      const audio = new Audio(`data:${d.mimeType};base64,${d.audioBase64}`);
      audioRef.current = audio;
      audio.onended = onTtsDone;
      audio.onerror = () => {
        // server gave us bytes we couldn't play; try the browser as a last try
        audioRef.current = null;
        if (!browserSpeak(text)) { setSpeaking(false); }
      };
      setSpeaking(true);
      try { await audio.play(); }
      catch (playErr) {
        console.warn("[IGCSE] audio.play() blocked, trying browser TTS:", playErr);
        audioRef.current = null;
        if (!browserSpeak(text)) {
          setSpeaking(false);
          alert("Your browser blocked the tutor's voice. Click anywhere on the page, then try Voice again.");
        }
      }
    } catch (e: any) {
      // Server TTS failed (ElevenLabs + OpenAI both down) — go free fallback.
      console.warn("[IGCSE] server TTS failed, using browser:", e?.message);
      if (!browserSpeak(text)) {
        setSpeaking(false);
        alert(`Tutor voice unavailable:\n\n${e?.message || "All TTS providers failed."}\n\nSwitching to text-only.`);
        setVoiceMode(false);
      }
    }
  };

  const sendMessage = trpc.igcse.sendMessage.useMutation({
    onSuccess: (d) => {
      setTurns(t => [...t, { role: "ai", text: d.speech, board: d.board || [], ts: Date.now() }]);
      if (Array.isArray(d.board) && d.board.length) {
        setBoardItems(b => [...b, ...d.board]);
      }
      setSending(false);
      utils.igcse.status.invalidate();
      setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 50);

      // Voice mode: speak the AI reply aloud, then auto-listen on end.
      if (voiceMode && d.speech) speakOut(d.speech);
    },
    onError: (e) => {
      setSending(false);
      alert(e?.message || "Something went wrong. Try again.");
    },
  });
  const endSession = trpc.igcse.endSession.useMutation({ onSuccess: () => setLocation("/igcse/app") });

  // When user disables voice mode mid-flight, stop any audio.
  useEffect(() => {
    if (!voiceMode) { stopAudio(); stopListening(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    setTurns(t => [...t, { role: "student", text: msg, ts: Date.now() }]);
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 30);
    const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
    sendMessage.mutate({ sessionId, message: msg, elapsedSec });
  };

  if (session.isLoading) return <Centered><div className="text-slate-400">Loading lesson…</div></Centered>;
  if (session.isError || !session.data) return (
    <Centered>
      <div className="text-center">
        <h2 className="font-bold text-slate-800 mb-2">Lesson not found</h2>
        <Link href="/igcse/app" className="text-violet-700 underline text-sm">← Back to your classroom</Link>
      </div>
    </Centered>
  );

  const sub = (status.data as any)?.subscription;
  const ft = (status.data as any)?.freeTrial as { remainingSec?: number } | undefined;
  const remainingMin = ft?.remainingSec != null ? Math.floor(ft.remainingSec / 60) : null;

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      <SEO title={`Lesson — ${topic?.title || "IGCSE Math"}`} description="IGCSE Math AI Teacher lesson." noindex />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/igcse/app" className="text-sm text-slate-500 hover:text-slate-900">← Classroom</Link>
          <div className="min-w-0 text-center">
            <div className="text-[11px] font-mono text-violet-700">{topic?.code ?? "—"} · {topic?.areaName ?? "IGCSE Math"}</div>
            <div className="text-sm font-semibold text-slate-800 truncate">{topic?.title || "Free-form lesson"}</div>
          </div>
          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            {/* Language toggle — drives both the speech recogniser and the AI's reply language. */}
            <div className="inline-flex rounded-md border border-slate-300 overflow-hidden" role="group" aria-label="Lesson language">
              <button
                type="button"
                onClick={() => flipLang("en")}
                className={`px-2 py-1 font-semibold ${lang === "en" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                title="English"
              >EN</button>
              <button
                type="button"
                onClick={() => flipLang("id")}
                className={`px-2 py-1 font-semibold border-l border-slate-300 ${lang === "id" ? "bg-violet-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                title="Bahasa Indonesia"
              >ID</button>
            </div>
            <button
              type="button"
              onClick={() => setVoiceMode(v => !v)}
              disabled={!sttSupported}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                voiceMode
                  ? "bg-violet-600 text-white"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={sttSupported ? "Speak with the tutor (AI replies aloud)" : "Voice mode needs Chrome or Edge"}
            >
              🔊 Voice {voiceMode ? "On" : "Off"}
            </button>

            {/* Voice settings (picker + speed) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setVoiceSettingsOpen(o => !o)}
                className="px-2 py-1 rounded-md font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                title="Voice settings"
                aria-haspopup="true"
                aria-expanded={voiceSettingsOpen}
              >⚙️</button>
              {voiceSettingsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setVoiceSettingsOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-40" role="dialog">
                    <div className="text-xs font-semibold text-slate-700 mb-1">Tutor voice</div>
                    <div className="space-y-1 mb-3">
                      {(voices.data || []).map((v: any) => {
                        const selected = (voiceId || (voices.data?.[0]?.id ?? "")) === v.id;
                        return (
                          <label key={v.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer ${selected ? "bg-violet-50" : "hover:bg-slate-50"}`}>
                            <input
                              type="radio"
                              name="igcse-voice"
                              checked={selected}
                              onChange={() => setVoiceId(v.id)}
                              className="accent-violet-600"
                            />
                            <span className="text-sm text-slate-800">{v.label}</span>
                          </label>
                        );
                      })}
                      {!voices.data?.length && <div className="text-xs text-slate-400 px-2 py-1.5">Loading voices…</div>}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Speed</span>
                      <span className="text-slate-500 font-mono">{voiceSpeed.toFixed(2)}×</span>
                    </div>
                    <input
                      type="range"
                      min={0.8} max={1.3} step={0.05}
                      value={voiceSpeed}
                      onChange={e => setVoiceSpeed(Number(e.target.value))}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>Slower</span>
                      <span>Normal (1.0×)</span>
                      <span>Faster</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoiceSettingsOpen(false)}
                      className="mt-3 w-full py-1.5 rounded-md bg-violet-600 text-white text-sm font-semibold"
                    >Done</button>
                  </div>
                </>
              )}
            </div>
            {sub
              ? <span className="text-green-700 font-medium">✓ Active</span>
              : remainingMin != null
                ? <span className="text-slate-500">{remainingMin} min left</span>
                : <span className="text-slate-400">—</span>}
          </div>
        </div>
      </header>

      {/* Body: chat + board */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 p-3">
          {/* Chat column */}
          <div className={`${card} overflow-hidden flex flex-col`}>
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">💬 Tutor chat</div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {turns.length === 0 ? (
                <div className="text-center text-slate-500">
                  <div className="text-3xl mb-1">👋</div>
                  <div className="font-bold text-slate-800">Ready when you are</div>
                  <p className="text-sm mt-1">
                    Ask anything about <strong>{topic?.title || "your topic"}</strong>.<br/>
                    Try "Can you teach me this from scratch?" or paste a problem.
                  </p>
                </div>
              ) : (
                turns.map((t, i) => <Bubble key={i} role={t.role} text={t.text} />)
              )}
              {sending && <Bubble role="ai" text="…" pulsing />}
            </div>
          </div>

          {/* Board column */}
          <div className="overflow-hidden">
            <BoardPanel items={boardItems} displayed={displayed} sessionId={sessionId} />
          </div>
        </div>
      </main>

      {/* Voice status banner */}
      {(speaking || listening) && (
        <div className="bg-violet-50 border-t border-violet-100 shrink-0">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
            {speaking ? (
              <>
                <span className="flex items-center gap-2 text-violet-800 font-medium">
                  <span className="inline-block w-2 h-2 bg-violet-600 rounded-full animate-pulse" />
                  🔊 Tutor speaking…
                </span>
                <button onClick={stopAudio} className="text-xs px-2 py-1 rounded border border-violet-200 text-violet-700 hover:bg-white">Stop</button>
              </>
            ) : listening ? (
              <>
                <span className="flex items-center gap-2 text-red-700 font-medium">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  🎙️ Listening — speak now
                </span>
                <button onClick={stopListening} className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-white">Stop</button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={submit} className="max-w-6xl mx-auto px-4 py-3 flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={topic ? `Ask about ${topic.title}…` : "Ask a math question…"}
            rows={1}
            className="flex-1 resize-none px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            disabled={sending}
          />
          {sttSupported && (
            <button
              type="button"
              onClick={() => listening ? stopListening() : startListening()}
              disabled={sending || speaking}
              className={`px-3 py-2.5 rounded-xl text-sm font-semibold border ${
                listening
                  ? "bg-red-600 text-white border-red-600 animate-pulse"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={listening ? "Stop listening" : "Tap to speak"}
            >
              🎙️
            </button>
          )}
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50"
            style={{ background: PURPLE }}
          >
            {sending ? "…" : "Send"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm("End this lesson?")) return;
              const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
              endSession.mutate({ id: sessionId, durationSec: elapsedSec });
            }}
            className="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800"
            title="End this lesson"
          >
            End
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center pb-2">
          Enter to send · Shift+Enter for new line · 🎙️ to speak · 🔊 Voice for AI to reply aloud
        </p>
      </div>
    </div>
  );
}

function Bubble({ role, text, pulsing }: { role: string; text: string; pulsing?: boolean }) {
  const isStudent = role === "student";
  return (
    <div className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isStudent
            ? "bg-violet-600 text-white rounded-br-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
        } ${pulsing ? "animate-pulse" : ""}`}
      >
        {text}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen grid place-items-center bg-slate-50 px-4">{children}</div>;
}
