/**
 * In-house graphing calculator for SAT Math modules (no Desmos licence).
 * Own expression parser (no dependency): + - * / ^ ( ), unary minus,
 * functions sin cos tan asin acos atan sqrt abs ln log exp floor ceil round,
 * constants pi e, implicit multiplication (2x, 3(x+1), x(x-2)).
 * Graphs up to 3 functions of x on a canvas with pan/zoom and a table.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Minus, RotateCcw } from "lucide-react";

// ── Parser → evaluator ────────────────────────────────────────────────────
type Fn = (x: number) => number;
const FUNCS: Record<string, (v: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round };
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

export function compile(src: string): Fn | null {
  const s = src.replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/√/g, "sqrt");
  if (!s) return null;
  let i = 0;
  const peek = () => s[i];
  const eat = (c: string) => { if (s[i] === c) { i++; return true; } return false; };
  type Node = (x: number) => number;
  function primary(): Node {
    if (eat("(")) { const n = expr(); if (!eat(")")) throw new Error(")"); return n; }
    if (eat("-")) { const n = unary(); return x => -n(x); }
    if (eat("+")) return unary();
    const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
    if (m) { i += m[0].length; const v = Number(m[0]); return () => v; }
    const id = s.slice(i).match(/^[a-zA-Z]+/);
    if (id) {
      const name = id[0].toLowerCase();
      if (FUNCS[name]) { i += id[0].length; const f = FUNCS[name]; const arg = eat("(") ? (() => { const n = expr(); if (!eat(")")) throw new Error(")"); return n; })() : unary(); return x => f(arg(x)); }
      if (name === "x") { i += 1; return x => x; }
      if (CONSTS[name]) { i += name.length; const v = CONSTS[name]; return () => v; }
      // allow "2x" style where identifier chunk starts with x followed by letters? treat first letter only
      if (name[0] === "x") { i += 1; return x => x; }
      if (name.startsWith("pi")) { i += 2; return () => Math.PI; }
      if (name[0] === "e") { i += 1; return () => Math.E; }
      throw new Error("unknown " + name);
    }
    throw new Error("unexpected " + (peek() ?? "end"));
  }
  // factor = primary [^ unary]  → so 2x^2 means 2·(x^2) and 3(x+1)^2 means 3·((x+1)^2)
  // exponent = [-] factor  → right-associative (2^3^2 = 512) and (x+1)^2(x-1) = ((x+1)^2)·(x-1)
  function exponent(): Node { if (eat("-")) { const n = exponent(); return x => -n(x); } return factor(); }
  function factor(): Node { const b = primary(); if (eat("^")) { const e = exponent(); return x => Math.pow(b(x), e(x)); } return b; }
  function postfix(): Node {
    let n = factor();
    // implicit multiplication: 2x, 3(x+1), x(x-1), )(
    for (;;) {
      const c = peek();
      if (c === undefined) break;
      if (c === "(" || /[a-zA-Z0-9.]/.test(c)) { if (/[0-9.]/.test(c) && !/[a-zA-Z)]/.test(s[i - 1] || "")) break; const r = factor(); const l = n; n = x => l(x) * r(x); continue; }
      break;
    }
    return n;
  }
  function power(): Node { return postfix(); }
  function unary(): Node { if (eat("-")) { const n = unary(); return x => -n(x); } return power(); }
  function term(): Node { let n = unary(); for (;;) { if (eat("*")) { const r = unary(); const l = n; n = x => l(x) * r(x); } else if (eat("/")) { const r = unary(); const l = n; n = x => l(x) / r(x); } else break; } return n; }
  function expr(): Node { let n = term(); for (;;) { if (eat("+")) { const r = term(); const l = n; n = x => l(x) + r(x); } else if (eat("-")) { const r = term(); const l = n; n = x => l(x) - r(x); } else break; } return n; }
  try { const f = expr(); if (i !== s.length) return null; f(1); return f; } catch { return null; }
}

const COLORS = ["#4f46e5", "#dc2626", "#059669"];
const fmt = (v: number) => Number.isFinite(v) ? (Math.abs(v) >= 1e9 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(4) : String(Math.round(v * 1e6) / 1e6)) : "undefined";

export default function SatCalculator({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"calc" | "graph">("calc");
  const [calcInput, setCalcInput] = useState("");
  const [history, setHistory] = useState<Array<{ input: string; out: string }>>([]);
  const [fns, setFns] = useState<string[]>(["", "", ""]);
  const [view, setView] = useState({ cx: 0, cy: 0, w: 20, h: 14 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pos, setPos] = useState(() => ({ x: typeof window !== "undefined" && window.innerWidth < 480 ? 8 : 40, y: 80 }));
  const clamp = (x: number, y: number) => ({ x: Math.max(0, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1000) - 120)), y: Math.max(0, Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - 60)) });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const compiled = useMemo(() => fns.map(f => compile(f.replace(/^y\s*=\s*/i, ""))), [fns]);

  const evaluate = () => {
    const f = compile(calcInput);
    const out = f ? fmt(f(0)) : "Error";
    setHistory(h => [...h.slice(-8), { input: calcInput, out }]);
    setCalcInput("");
  };

  useEffect(() => {
    const c = canvasRef.current; if (!c || tab !== "graph") return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    const xMin = view.cx - view.w / 2, xMax = view.cx + view.w / 2, yMin = view.cy - view.h / 2, yMax = view.cy + view.h / 2;
    const px = (x: number) => ((x - xMin) / (xMax - xMin)) * W, py = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;
    const step = (r: number) => { const raw = r / 8; const p = Math.pow(10, Math.floor(Math.log10(raw))); const m = raw / p; return (m < 2 ? 1 : m < 5 ? 2 : 5) * p; };
    const sx = step(view.w), sy = step(view.h);
    ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1; ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif";
    for (let x = Math.ceil(xMin / sx) * sx; x <= xMax; x += sx) { ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), H); ctx.stroke(); if (Math.abs(x) > 1e-9) ctx.fillText(fmt(x), px(x) + 2, py(0) + 12 > H ? H - 4 : Math.max(10, py(0) + 12)); }
    for (let y = Math.ceil(yMin / sy) * sy; y <= yMax; y += sy) { ctx.beginPath(); ctx.moveTo(0, py(y)); ctx.lineTo(W, py(y)); ctx.stroke(); if (Math.abs(y) > 1e-9) ctx.fillText(fmt(y), Math.min(W - 24, Math.max(2, px(0) + 3)), py(y) - 2); }
    ctx.strokeStyle = "#111827"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(W, py(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), H); ctx.stroke();
    compiled.forEach((f, k) => {
      if (!f) return;
      ctx.strokeStyle = COLORS[k]; ctx.lineWidth = 2; ctx.beginPath(); let pen = false;
      for (let i = 0; i <= W; i++) {
        const x = xMin + (i / W) * (xMax - xMin); const y = f(x);
        if (!Number.isFinite(y) || Math.abs(y) > 1e6) { pen = false; continue; }
        const Y = py(y);
        if (Y < -H || Y > 2 * H) { pen = false; continue; }
        if (!pen) { ctx.moveTo(i, Y); pen = true; } else ctx.lineTo(i, Y);
      }
      ctx.stroke();
    });
  }, [tab, view, compiled]);

  const zoom = (f: number) => setView(v => ({ ...v, w: v.w * f, h: v.h * f }));
  useEffect(() => { const c = canvasRef.current; if (!c) return; const h = (e: WheelEvent) => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 0.87); }; c.addEventListener("wheel", h, { passive: false }); return () => c.removeEventListener("wheel", h); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const panRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  return (
    <div className="fixed z-50 w-[360px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-300 select-none" style={{ left: pos.x, top: pos.y }}>
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white rounded-t-2xl cursor-move" onPointerDown={e => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }} onPointerMove={e => { if (drag.current) setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy)); }} onPointerUp={() => { drag.current = null; }}>
        <div className="flex gap-1 text-xs">{(["calc", "graph"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 rounded-full ${tab === t ? "bg-white text-slate-900" : "text-slate-300"}`}>{t === "calc" ? "Calculator" : "Graph"}</button>)}</div>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-700"><X className="w-4 h-4" /></button>
      </div>
      {tab === "calc" ? (
        <div className="p-3">
          <div className="h-28 overflow-y-auto text-sm font-mono space-y-1 mb-2">{history.map((h, i) => <div key={i} className="flex justify-between gap-2"><span className="text-slate-500 truncate">{h.input}</span><span className="font-bold">{h.out}</span></div>)}</div>
          <input value={calcInput} onChange={e => setCalcInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") evaluate(); }} placeholder="e.g. (3^2+4^2)^0.5 or sin(pi/6)" className="w-full border-2 border-slate-300 rounded-xl px-3 py-2 font-mono text-lg" autoFocus />
          <div className="grid grid-cols-5 gap-1 mt-2 text-sm">
            {["7", "8", "9", "(", ")", "4", "5", "6", "*", "/", "1", "2", "3", "+", "-", "0", ".", "^", "sqrt(", "pi"].map(k => <button key={k} onClick={() => setCalcInput(v => v + k)} className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-mono">{k}</button>)}
            {["sin(", "cos(", "tan(", "ln(", "log("].map(k => <button key={k} onClick={() => setCalcInput(v => v + k)} className="py-1.5 rounded-lg bg-slate-50 hover:bg-slate-200 font-mono text-xs">{k}</button>)}
            <button onClick={() => setCalcInput(v => v.slice(0, -1))} className="py-1.5 rounded-lg bg-amber-100">⌫</button>
            <button onClick={() => setCalcInput("")} className="py-1.5 rounded-lg bg-amber-100">C</button>
            <button onClick={evaluate} className="col-span-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold">=</button>
          </div>
        </div>
      ) : (
        <div className="p-3">
          {fns.map((f, k) => <div key={k} className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[k] }} /><span className="text-xs font-mono text-slate-500">y =</span><input value={f} onChange={e => setFns(a => a.map((x, i) => i === k ? e.target.value : x))} placeholder={k === 0 ? "2x + 1" : k === 1 ? "x^2 - 4" : ""} className={`flex-1 border rounded-lg px-2 py-1 text-sm font-mono ${f && !compiled[k] ? "border-red-400" : "border-slate-300"}`} /></div>)}
          <canvas ref={canvasRef} width={336} height={240} className="w-full rounded-lg border border-slate-200 mt-1 cursor-grab touch-none"
            onPointerDown={e => { panRef.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
            onPointerMove={e => { const p = panRef.current; if (!p) return; const c = canvasRef.current!; setView(v => ({ ...v, cx: p.cx - ((e.clientX - p.x) / c.clientWidth) * v.w, cy: p.cy + ((e.clientY - p.y) / c.clientHeight) * v.h })); }}
            onPointerUp={() => { panRef.current = null; }} />
          <div className="flex items-center gap-1 mt-2 text-xs">
            <button onClick={() => zoom(0.7)} className="p-1.5 rounded-lg bg-slate-100"><Plus className="w-3.5 h-3.5" /></button>
            <button onClick={() => zoom(1.4)} className="p-1.5 rounded-lg bg-slate-100"><Minus className="w-3.5 h-3.5" /></button>
            <button onClick={() => setView({ cx: 0, cy: 0, w: 20, h: 14 })} className="p-1.5 rounded-lg bg-slate-100"><RotateCcw className="w-3.5 h-3.5" /></button>
            <span className="text-slate-500 ml-1">x: {fmt(view.cx - view.w / 2)} to {fmt(view.cx + view.w / 2)}</span>
          </div>
          <details className="mt-2 text-xs"><summary className="cursor-pointer text-slate-600">Table</summary>
            <table className="w-full font-mono mt-1"><thead><tr className="text-slate-500"><th className="text-left">x</th>{fns.map((f, k) => f ? <th key={k} className="text-left" style={{ color: COLORS[k] }}>y{k + 1}</th> : null)}</tr></thead>
              <tbody>{[-3, -2, -1, 0, 1, 2, 3].map(x => <tr key={x}><td>{x}</td>{compiled.map((f, k) => fns[k] ? <td key={k}>{f ? fmt(f(x)) : "—"}</td> : null)}</tr>)}</tbody></table>
          </details>
        </div>
      )}
    </div>
  );
}
