/**
 * Isometric 3D cube renderer for Rotation-3D questions.
 *
 * Draws a cube in true isometric projection with three visible faces
 * (top / front / right), each colored independently. Colors are drawn
 * with slight shading (top brightest, right darkest) to make the
 * 3D-ness read clearly on a small phone screen.
 *
 * Used by:
 *   - The "reference cube" in a Rotation-3D question prompt.
 *   - The 4 candidate rotated cubes in the option grid.
 *
 * The renderer itself is purely presentational — the AI question generator
 * computes what the CORRECT rotation should look like and emits the correct
 * option colors. This component just draws whatever face-color triplet
 * it's given.
 */

import { IQ_COLOR_HEX, type IqColor } from "../../../../server/iqQuestionTypes";

interface IqCube3DProps {
  top: IqColor;
  front: IqColor;
  right: IqColor;
  /** Rendered size in px. Cube fills a square canvas. */
  size?: number;
  className?: string;
}

// Isometric projection coordinates for a unit cube centered on (50, 50).
// Standard 30° isometric — every axis at 30° to the horizontal.
// These 7 points describe the 3 visible-face polygons.
const CUBE_POINTS = {
  // Top-face rhombus (points 1-4 of an isometric cube's top diamond)
  topBackLeft:  [30, 20],
  topBack:      [50, 10],
  topBackRight: [70, 20],
  topFront:     [50, 30],
  // Bottom-front left corner (where front + right faces meet at bottom)
  bottomFrontLeft:  [30, 60],
  bottomFront:      [50, 70],
  bottomFrontRight: [70, 60],
  // Middle-front is topFront duplicated for readability
} as const;

// Slight shading factor for the front/right faces so 3D reads clearly
// even when all three faces are similar colors.
function shade(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `rgb(${clamp(r * factor)}, ${clamp(g * factor)}, ${clamp(b * factor)})`;
}

export default function IqCube3D({ top, front, right, size = 100, className }: IqCube3DProps) {
  const p = CUBE_POINTS;
  const topFill = IQ_COLOR_HEX[top];
  const frontFill = shade(IQ_COLOR_HEX[front], 0.82); // slightly darker
  const rightFill = shade(IQ_COLOR_HEX[right], 0.68); // darker still

  const topPoly = `${p.topBackLeft.join(",")} ${p.topBack.join(",")} ${p.topBackRight.join(",")} ${p.topFront.join(",")}`;
  const frontPoly = `${p.topBackLeft.join(",")} ${p.topFront.join(",")} ${p.bottomFront.join(",")} ${p.bottomFrontLeft.join(",")}`;
  const rightPoly = `${p.topFront.join(",")} ${p.topBackRight.join(",")} ${p.bottomFrontRight.join(",")} ${p.bottomFront.join(",")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))" }}
    >
      {/* Draw back-facing (top) first so front faces overlap correctly. */}
      <polygon points={topPoly} fill={topFill} stroke="#0f172a" strokeWidth="0.5" strokeLinejoin="round" />
      <polygon points={frontPoly} fill={frontFill} stroke="#0f172a" strokeWidth="0.5" strokeLinejoin="round" />
      <polygon points={rightPoly} fill={rightFill} stroke="#0f172a" strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  );
}
