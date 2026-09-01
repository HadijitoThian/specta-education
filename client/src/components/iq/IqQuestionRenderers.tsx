/**
 * SpecTa IQ Discovery — visual question renderers.
 *
 * One component per question type; a top-level dispatcher (`IqQuestionRenderer`)
 * picks the right one based on `type`. All renderers take:
 *   - `prompt`: structured JSON matching the type's IqPrompt interface
 *   - `options`: array of structured JSON matching the type's IqOption
 *   - `selectedIndex`: currently selected option (may be undefined)
 *   - `onSelect`: called when the student picks an option
 *   - `locked`: after submission, disables further interaction
 *
 * Every renderer is server-authoritative: it never knows or shows the correct
 * answer. Highlighting on selection is purely UX.
 */

import { useEffect, useState } from "react";
import IqShape from "./IqShape";
import IqCube3D from "./IqCube3D";
import type {
  IqTextPrompt, IqTextOption,
  IqMatrixPrompt, IqMatrixOption,
  IqSequencePrompt,
  IqOddOneOutPrompt,
  IqRotation3DPrompt, IqRotation3DOption,
  IqPaperFoldPrompt, IqPaperFoldOption,
  IqMemoryFlashPrompt, IqMemoryFlashOption,
  IqShapeSpec, IqColor,
} from "../../../../server/iqQuestionTypes";
import { IQ_COLOR_HEX } from "../../../../server/iqQuestionTypes";

// ═══════════════════════════════════════════════════════════════════════════
// Shared shell primitives
// ═══════════════════════════════════════════════════════════════════════════

/** Grid of clickable option cards. Each option renders whatever visual is
 *  appropriate for its question type via the `renderOption` callback. */
function OptionGrid<T>({
  options,
  renderOption,
  selectedIndex,
  onSelect,
  locked,
  columns = 4,
}: {
  options: T[];
  renderOption: (opt: T, i: number) => React.ReactNode;
  selectedIndex?: number;
  onSelect: (i: number) => void;
  locked?: boolean;
  columns?: 2 | 3 | 4;
}) {
  const gridCls = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={`grid ${gridCls} gap-3`}>
      {options.map((opt, i) => {
        const selected = selectedIndex === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => !locked && onSelect(i)}
            disabled={locked}
            className={`aspect-square rounded-xl border-2 flex items-center justify-center bg-white transition-all
              ${selected ? "border-indigo-500 shadow-lg scale-[1.03]" : "border-slate-200 hover:border-slate-300 hover:shadow-md"}
              ${locked ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
            aria-label={`Option ${String.fromCharCode(65 + i)}`}
          >
            <span className="absolute top-1 left-2 text-[10px] font-semibold text-slate-400">
              {String.fromCharCode(65 + i)}
            </span>
            {renderOption(opt, i)}
          </button>
        );
      })}
    </div>
  );
}

/** Card that wraps the question stem (the "here's the puzzle" part). */
function StemCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. TEXT question — verbal analogies, sentence completion, some numerical
// ═══════════════════════════════════════════════════════════════════════════

function TextQuestion({
  prompt, options, selectedIndex, onSelect, locked,
}: {
  prompt: IqTextPrompt; options: IqTextOption[];
  selectedIndex?: number; onSelect: (i: number) => void; locked?: boolean;
}) {
  return (
    <div className="space-y-5">
      <StemCard>
        {prompt.context && <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">{prompt.context}</p>}
        <p className="text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">{prompt.text}</p>
      </StemCard>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const selected = selectedIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !locked && onSelect(i)}
              disabled={locked}
              className={`w-full text-left rounded-xl border-2 px-4 py-3 flex items-center gap-3 bg-white transition-all
                ${selected ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-slate-200 hover:border-slate-300"}
                ${locked ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${selected ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-slate-800">{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. MATRIX 3×3 — the flagship fluid-reasoning renderer
// ═══════════════════════════════════════════════════════════════════════════
//
// 8 cells shown, 9th (bottom-right) is a "?" the student solves. Options
// are 4 shape specs; the student picks the one that completes the pattern.

function Matrix3x3Question({
  prompt, options, selectedIndex, onSelect, locked,
}: {
  prompt: IqMatrixPrompt; options: IqMatrixOption[];
  selectedIndex?: number; onSelect: (i: number) => void; locked?: boolean;
}) {
  return (
    <div className="space-y-5">
      <StemCard>
        {prompt.hint && <p className="text-sm text-slate-600 mb-3">{prompt.hint}</p>}
        <div className="max-w-xs mx-auto">
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl">
            {prompt.grid.flatMap((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className="aspect-square flex items-center justify-center bg-white rounded-lg border border-slate-200"
                >
                  {cell
                    ? <IqShape spec={cell} size={64} />
                    : <span className="text-4xl text-indigo-500 font-black">?</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </StemCard>
      <OptionGrid
        options={options}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        locked={locked}
        columns={4}
        renderOption={(opt) => <IqShape spec={opt.shape} size={64} />}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SEQUENCE — visual row with one cell missing at the end
// ═══════════════════════════════════════════════════════════════════════════

function SequenceQuestion({
  prompt, options, selectedIndex, onSelect, locked,
}: {
  prompt: IqSequencePrompt; options: IqMatrixOption[];
  selectedIndex?: number; onSelect: (i: number) => void; locked?: boolean;
}) {
  return (
    <div className="space-y-5">
      <StemCard>
        {prompt.hint && <p className="text-sm text-slate-600 mb-3">{prompt.hint}</p>}
        <div className="flex justify-center items-center gap-2 flex-wrap">
          {prompt.row.map((cell, i) => (
            <div key={i} className="w-16 h-16 flex items-center justify-center bg-white rounded-lg border border-slate-200">
              {cell
                ? <IqShape spec={cell} size={56} />
                : <span className="text-3xl text-indigo-500 font-black">?</span>}
            </div>
          ))}
        </div>
      </StemCard>
      <OptionGrid
        options={options}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        locked={locked}
        columns={4}
        renderOption={(opt) => <IqShape spec={opt.shape} size={56} />}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ODD ONE OUT — 4 shapes, pick the one that doesn't fit
// ═══════════════════════════════════════════════════════════════════════════

function OddOneOutQuestion({
  prompt, selectedIndex, onSelect, locked,
}: {
  prompt: IqOddOneOutPrompt; options: IqMatrixOption[];
  selectedIndex?: number; onSelect: (i: number) => void; locked?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600 text-center">
        {prompt.hint || "Pilih gambar yang TIDAK sekelompok dengan yang lain."}
      </div>
      <OptionGrid
        options={prompt.shapes}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        locked={locked}
        columns={4}
        renderOption={(shape) => <IqShape spec={shape as IqShapeSpec} size={72} />}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. 3D ROTATION — reference cube + 4 rotated candidates
// ═══════════════════════════════════════════════════════════════════════════

function Rotation3DQuestion({
  prompt, options, selectedIndex, onSelect, locked,
}: {
  prompt: IqRotation3DPrompt; options: IqRotation3DOption[];
  selectedIndex?: number; onSelect: (i: number) => void; locked?: boolean;
}) {
  const axisLabel: Record<"x" | "y" | "z", string> = {
    x: "sumbu X (miring ke depan)",
    y: "sumbu Y (putar horizontal)",
    z: "sumbu Z (putar seperti jarum jam)",
  };
  return (
    <div className="space-y-5">
      <StemCard>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-600 text-center">
            Kubus di bawah diputar <strong>{prompt.rotationDegrees}°</strong> pada {axisLabel[prompt.rotationAxis]}.
            Mana bentuknya setelah diputar?
          </p>
          <div className="p-3 bg-slate-50 rounded-xl">
            <IqCube3D top={prompt.cube.top} front={prompt.cube.front} right={prompt.cube.right} size={120} />
          </div>
        </div>
      </StemCard>
      <OptionGrid
        options={options}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        locked={locked}
        columns={4}
        renderOption={(opt) => <IqCube3D top={opt.cube.top} front={opt.cube.front} right={opt.cube.right} size={72} />}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. PAPER FOLDING — folded paper + punches → unfolded options
// ═══════════════════════════════════════════════════════════════════════════

function PaperFoldingViz({
  gridSize, punches, showHoles,
}: {
  gridSize: number;
  punches: Array<{ col: number; row: number }>;
  showHoles?: boolean[][];
}) {
  const cell = 100 / gridSize;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
      <rect x={0} y={0} width={100} height={100} fill="#fef9c3" stroke="#eab308" strokeWidth={1} rx={2} />
      {/* Grid lines */}
      {Array.from({ length: gridSize - 1 }, (_, i) => i + 1).map(i => (
        <g key={i}>
          <line x1={i * cell} y1={0} x2={i * cell} y2={100} stroke="#eab308" strokeWidth={0.3} opacity={0.4} />
          <line x1={0} y1={i * cell} x2={100} y2={i * cell} stroke="#eab308" strokeWidth={0.3} opacity={0.4} />
        </g>
      ))}
      {/* Show the punches (folded view) or the resulting holes (unfolded view) */}
      {showHoles
        ? showHoles.flatMap((row, r) => row.map((hole, c) =>
            hole ? <circle key={`${r}-${c}`} cx={c * cell + cell / 2} cy={r * cell + cell / 2} r={cell * 0.25} fill="#1e293b" /> : null
          ))
        : punches.map((p, i) => (
            <circle key={i} cx={p.col * cell + cell / 2} cy={p.row * cell + cell / 2} r={cell * 0.25} fill="#1e293b" />
          ))
      }
    </svg>
  );
}

function PaperFoldQuestion({
  prompt, options, selectedIndex, onSelect, locked,
}: {
  prompt: IqPaperFoldPrompt; options: IqPaperFoldOption[];
  selectedIndex?: number; onSelect: (i: number) => void; locked?: boolean;
}) {
  const foldLabel: Record<"h" | "v" | "d1" | "d2", string> = {
    h: "horizontal",
    v: "vertical",
    d1: "diagonal (kiri atas → kanan bawah)",
    d2: "diagonal (kanan atas → kiri bawah)",
  };
  return (
    <div className="space-y-5">
      <StemCard>
        <p className="text-sm text-slate-600 mb-3">
          Kertas dilipat: <strong>{prompt.folds.map(f => foldLabel[f]).join(" → ")}</strong>,
          lalu di-punch di titik-titik hitam. Bagaimana lubangnya saat kertas dibuka?
        </p>
        <div className="max-w-[180px] mx-auto aspect-square">
          <PaperFoldingViz gridSize={prompt.gridSize} punches={prompt.punches} />
        </div>
      </StemCard>
      <div className="grid grid-cols-4 gap-3">
        {options.map((opt, i) => {
          const selected = selectedIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !locked && onSelect(i)}
              disabled={locked}
              className={`relative aspect-square rounded-xl border-2 bg-white transition-all p-2
                ${selected ? "border-indigo-500 shadow-lg scale-[1.03]" : "border-slate-200 hover:border-slate-300 hover:shadow-md"}
                ${locked ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
            >
              <span className="absolute top-1 left-2 text-[10px] font-semibold text-slate-400">
                {String.fromCharCode(65 + i)}
              </span>
              <PaperFoldingViz gridSize={opt.holes.length} punches={[]} showHoles={opt.holes} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. MEMORY FLASH — show sequence for N seconds, hide, then recall
// ═══════════════════════════════════════════════════════════════════════════

function MemorySequenceViz({ sequence }: { sequence: Array<number | IqColor | IqShapeSpec> }) {
  return (
    <div className="flex justify-center items-center gap-2 flex-wrap">
      {sequence.map((item, i) => {
        if (typeof item === "number") {
          return (
            <div key={i} className="w-16 h-16 rounded-xl bg-indigo-500 text-white text-3xl font-black flex items-center justify-center shadow-md">
              {item}
            </div>
          );
        }
        if (typeof item === "string") {
          return (
            <div key={i} className="w-16 h-16 rounded-full border-4 border-white shadow-md" style={{ background: IQ_COLOR_HEX[item as IqColor] }} />
          );
        }
        return (
          <div key={i} className="w-16 h-16 flex items-center justify-center">
            <IqShape spec={item} size={64} />
          </div>
        );
      })}
    </div>
  );
}

function MemoryFlashQuestion({
  prompt, options, selectedIndex, onSelect, locked,
}: {
  prompt: IqMemoryFlashPrompt; options: IqMemoryFlashOption[];
  selectedIndex?: number; onSelect: (i: number) => void; locked?: boolean;
}) {
  // 3 phases: countdown → show sequence → hide + let student answer.
  const [phase, setPhase] = useState<"ready" | "showing" | "recall">("ready");
  const [remaining, setRemaining] = useState(prompt.displaySec);

  useEffect(() => {
    if (phase !== "showing") return;
    setRemaining(prompt.displaySec);
    const iv = setInterval(() => {
      setRemaining(x => {
        if (x <= 1) { clearInterval(iv); setPhase("recall"); return 0; }
        return x - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, prompt.displaySec]);

  if (phase === "ready") {
    return (
      <div className="space-y-5">
        <StemCard>
          <div className="text-center">
            <div className="text-4xl mb-2">🧠</div>
            <h3 className="font-semibold text-slate-900 mb-1">Tes Memori Kerja</h3>
            <p className="text-sm text-slate-600 mb-4">
              Kamu akan lihat urutan berikut selama <strong>{prompt.displaySec} detik</strong>.
              Setelah itu, pilih urutan yang benar {prompt.recall === "reverse" ? "TERBALIK" : ""}.
            </p>
            <button
              onClick={() => setPhase("showing")}
              className="px-6 py-3 rounded-xl text-white font-semibold"
              style={{ background: "#6366f1" }}
            >
              Mulai Ingat →
            </button>
          </div>
        </StemCard>
      </div>
    );
  }

  if (phase === "showing") {
    return (
      <div className="space-y-5">
        <StemCard>
          <div className="text-center mb-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">Ingat urutan ini</div>
            <div className="text-3xl font-bold text-indigo-600 mt-1">{remaining}s</div>
          </div>
          <MemorySequenceViz sequence={prompt.sequence} />
        </StemCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StemCard>
        <p className="text-sm text-slate-600 text-center">
          Pilih urutan {prompt.recall === "reverse" ? "TERBALIK" : "asli"} dari yang tadi kamu lihat:
        </p>
      </StemCard>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const selected = selectedIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !locked && onSelect(i)}
              disabled={locked}
              className={`w-full rounded-xl border-2 px-3 py-3 bg-white transition-all
                ${selected ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-slate-200 hover:border-slate-300"}
                ${locked ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${selected ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="flex-1">
                  <MemorySequenceViz sequence={opt.sequence} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Dispatcher — picks the right renderer based on `type`
// ═══════════════════════════════════════════════════════════════════════════

interface IqQuestionRendererProps {
  type: string;
  prompt: any; // structure varies by type — validated server-side
  options: any[];
  selectedIndex?: number;
  onSelect: (i: number) => void;
  locked?: boolean;
}

export default function IqQuestionRenderer(props: IqQuestionRendererProps) {
  const { type, ...rest } = props;
  switch (type) {
    case "text":         return <TextQuestion {...(rest as any)} />;
    case "matrix_3x3":   return <Matrix3x3Question {...(rest as any)} />;
    case "sequence":     return <SequenceQuestion {...(rest as any)} />;
    case "odd_one_out":  return <OddOneOutQuestion {...(rest as any)} />;
    case "rotation_3d":  return <Rotation3DQuestion {...(rest as any)} />;
    case "paper_fold":   return <PaperFoldQuestion {...(rest as any)} />;
    case "memory_flash": return <MemoryFlashQuestion {...(rest as any)} />;
    default:
      return (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          Unknown question type: {type}
        </div>
      );
  }
}
