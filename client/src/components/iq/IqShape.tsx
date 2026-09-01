/**
 * Single visual "shape spec" primitive for the IQ Discovery question bank.
 *
 * Draws one shape (circle / square / triangle / diamond / hexagon / star)
 * inside a fixed-size SVG viewBox, with support for color, size, rotation,
 * and an optional inner count (for questions that use "2 dots inside" as
 * a puzzle dimension). This is the atomic building block for every visual
 * question type — Matrix, Sequence, OddOneOut, etc.
 *
 * Design decisions:
 *   - Everything is drawn in a normalized 100×100 viewBox so the caller
 *     controls the render size via width/height props. Sharp on any DPI.
 *   - Colors come from IQ_COLOR_HEX so they match the palette across all
 *     visual questions consistently.
 *   - Rotation is applied via SVG transform on the outer group so all
 *     rotated variants (0/45/90/…) look identical to the AI's intent.
 *   - Inner dot count is drawn as small circles centered inside the
 *     shape — dot color is white if the shape is dark, black otherwise,
 *     for contrast.
 */

import type { IqShapeSpec } from "../../../../server/iqQuestionTypes";
import { IQ_COLOR_HEX } from "../../../../server/iqQuestionTypes";

interface IqShapeProps {
  spec: IqShapeSpec;
  /** Rendered width in px. Height matches (shapes are square). */
  size?: number;
  /** Optional className for outer container. */
  className?: string;
  /** Whether the shape should render with a subtle drop-shadow. On by default
   *  for the "looks really good" polish; can be disabled for dense grids. */
  shadow?: boolean;
}

/** Map size level (1/2/3) → shape's fill radius fraction of the viewBox. */
const SIZE_FRACTION: Record<1 | 2 | 3, number> = {
  1: 0.45, // small — leaves room, feels light
  2: 0.65, // medium — balanced
  3: 0.85, // large — bold, near the edges
};

/** Colors that need white inner dots for contrast; others get black. */
const DARK_COLORS = new Set(["red", "blue", "purple"]);

export default function IqShape({ spec, size = 80, className, shadow = true }: IqShapeProps) {
  const fill = IQ_COLOR_HEX[spec.color];
  const s = SIZE_FRACTION[spec.size] * 100; // shape "size" in viewBox units
  const cx = 50;
  const cy = 50;
  const rotation = spec.rotation || 0;
  const dotFill = DARK_COLORS.has(spec.color) ? "#ffffff" : "#1e293b";

  const shape = (() => {
    switch (spec.shape) {
      case "circle": {
        return <circle cx={cx} cy={cy} r={s / 2} fill={fill} />;
      }
      case "square": {
        const half = s / 2;
        return <rect x={cx - half} y={cy - half} width={s} height={s} rx={s * 0.06} fill={fill} />;
      }
      case "triangle": {
        // Equilateral-ish, pointing up
        const half = s / 2;
        const h = s * 0.866;
        const points = `${cx},${cy - h / 2} ${cx - half},${cy + h / 2} ${cx + half},${cy + h / 2}`;
        return <polygon points={points} fill={fill} />;
      }
      case "diamond": {
        const half = s / 2;
        const points = `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;
        return <polygon points={points} fill={fill} />;
      }
      case "hexagon": {
        const r = s / 2;
        const pts = Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
        }).join(" ");
        return <polygon points={pts} fill={fill} />;
      }
      case "star": {
        // 5-point star
        const outer = s / 2;
        const inner = outer * 0.5;
        const pts = Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 === 0 ? outer : inner;
          const a = (Math.PI / 5) * i - Math.PI / 2;
          return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
        }).join(" ");
        return <polygon points={pts} fill={fill} />;
      }
    }
  })();

  // Optional inner dots for count-based puzzles. Arranged in a compact
  // horizontal row for 1-2, triangular for 3, square for 4.
  const dots = (() => {
    if (!spec.count) return null;
    const dotR = Math.max(2, s * 0.06);
    const positions: Array<[number, number]> = (() => {
      switch (spec.count) {
        case 1: return [[cx, cy]];
        case 2: {
          const off = s * 0.15;
          return [[cx - off, cy], [cx + off, cy]];
        }
        case 3: {
          const off = s * 0.15;
          return [[cx, cy - off], [cx - off, cy + off], [cx + off, cy + off]];
        }
        case 4: {
          const off = s * 0.15;
          return [[cx - off, cy - off], [cx + off, cy - off], [cx - off, cy + off], [cx + off, cy + off]];
        }
      }
    })();
    return positions.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={dotR} fill={dotFill} />);
  })();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      style={shadow ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))" } : undefined}
    >
      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        {shape}
        {dots}
      </g>
    </svg>
  );
}
