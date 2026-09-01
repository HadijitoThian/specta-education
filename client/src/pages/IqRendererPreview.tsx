/**
 * SpecTa IQ Discovery — internal preview page for the 7 SVG question renderers.
 *
 * Hardcoded sample questions (one per type) so we can eyeball visual quality
 * BEFORE spending time on the AI question generator. If a renderer looks
 * ugly here, it will look ugly to real students — fix it here, then move on.
 *
 * NOT linked from anywhere in the public site; access via /iq-preview.
 * Contains no real user data — safe to keep public.
 */

import { useState } from "react";
import Navigation from "@/components/Navigation";
import IqQuestionRenderer from "@/components/iq/IqQuestionRenderers";

interface SampleQuestion {
  label: string;
  type: string;
  prompt: any;
  options: any[];
  correctIndex: number;
  explanation: string;
}

// ── Sample bank (one per type, all visually distinct) ─────────────────────

const SAMPLES: SampleQuestion[] = [
  // 1. TEXT — verbal analogy in Bahasa
  {
    label: "Verbal Analogi (text)",
    type: "text",
    prompt: {
      context: "Lengkapi analogi berikut",
      text: "Sate : Ayam :: Rendang : ?",
    },
    options: [
      { text: "Sapi" },
      { text: "Nasi" },
      { text: "Padang" },
      { text: "Kelapa" },
    ],
    correctIndex: 0,
    explanation: "Sate biasa dibuat dari ayam; rendang dari daging sapi. Keduanya makanan Indonesia dengan bahan utama daging tertentu.",
  },

  // 2. MATRIX 3×3 — flagship visual: color varies across columns, shape across rows
  {
    label: "Pola Matriks 3×3 (matrix_3x3)",
    type: "matrix_3x3",
    prompt: {
      grid: [
        [{ shape: "circle",   color: "red",    size: 2 }, { shape: "circle",   color: "blue",  size: 2 }, { shape: "circle",   color: "green", size: 2 }],
        [{ shape: "square",   color: "red",    size: 2 }, { shape: "square",   color: "blue",  size: 2 }, { shape: "square",   color: "green", size: 2 }],
        [{ shape: "triangle", color: "red",    size: 2 }, { shape: "triangle", color: "blue",  size: 2 }, null],
      ],
    },
    options: [
      { shape: { shape: "triangle", color: "green",  size: 2 } },  // correct
      { shape: { shape: "triangle", color: "red",    size: 2 } },
      { shape: { shape: "circle",   color: "green",  size: 2 } },
      { shape: { shape: "square",   color: "green",  size: 2 } },
    ],
    correctIndex: 0,
    explanation: "Setiap baris = bentuk yang sama; setiap kolom = warna yang sama. Kolom 3 = hijau, baris 3 = segitiga → jawaban: segitiga hijau.",
  },

  // 3. SEQUENCE — rotating triangle
  {
    label: "Urutan Visual (sequence)",
    type: "sequence",
    prompt: {
      row: [
        { shape: "triangle", color: "purple", size: 2, rotation: 0 },
        { shape: "triangle", color: "purple", size: 2, rotation: 90 },
        { shape: "triangle", color: "purple", size: 2, rotation: 180 },
        { shape: "triangle", color: "purple", size: 2, rotation: 270 },
        null,
      ],
    },
    options: [
      { shape: { shape: "triangle", color: "purple", size: 2, rotation: 0 } },   // correct — cycle repeats
      { shape: { shape: "triangle", color: "purple", size: 2, rotation: 45 } },
      { shape: { shape: "triangle", color: "purple", size: 2, rotation: 90 } },
      { shape: { shape: "triangle", color: "red",    size: 2, rotation: 0 } },
    ],
    correctIndex: 0,
    explanation: "Segitiga berputar 90° setiap langkah (0° → 90° → 180° → 270° → kembali ke 0°).",
  },

  // 4. ODD ONE OUT — 3 quadrilaterals + 1 triangle
  {
    label: "Yang Beda Sendiri (odd_one_out)",
    type: "odd_one_out",
    prompt: {
      hint: "Pilih bentuk yang tidak sekelompok dengan yang lain.",
      shapes: [
        { shape: "square",   color: "blue",   size: 2 },
        { shape: "diamond",  color: "orange", size: 2 },
        { shape: "hexagon",  color: "green",  size: 2 },
        { shape: "triangle", color: "red",    size: 2 },
      ],
    },
    options: [
      { shape: { shape: "square",   color: "blue",   size: 2 } },
      { shape: { shape: "diamond",  color: "orange", size: 2 } },
      { shape: { shape: "hexagon",  color: "green",  size: 2 } },
      { shape: { shape: "triangle", color: "red",    size: 2 } },  // correct
    ],
    correctIndex: 3,
    explanation: "Segitiga punya 3 sisi. Persegi, wajik, dan segienam masing-masing punya jumlah sisi genap (4, 4, 6).",
  },

  // 5. 3D ROTATION — cube rotated 90° around Y
  {
    label: "Rotasi 3D (rotation_3d)",
    type: "rotation_3d",
    prompt: {
      cube: { top: "red", front: "blue", right: "yellow" },
      rotationAxis: "y",
      rotationDegrees: 90,
    },
    options: [
      { cube: { top: "red", front: "yellow", right: "green" } },   // if rotate Y 90° CW, blue face goes to right, so this isn't quite right — but illustrative
      { cube: { top: "red", front: "blue",   right: "yellow" } },
      { cube: { top: "yellow", front: "blue", right: "red" } },
      { cube: { top: "red", front: "green",  right: "blue" } },     // hypothetical correct
    ],
    correctIndex: 3,
    explanation: "Rotasi 90° pada sumbu Y (searah jarum jam dari atas): sisi depan lama (biru) berpindah ke sisi kanan; sisi kiri lama (hijau, tak terlihat sebelumnya) berpindah ke depan; sisi atas tetap merah.",
  },

  // 6. PAPER FOLD — 4×4 folded, 2 punches
  {
    label: "Lipat Kertas (paper_fold)",
    type: "paper_fold",
    prompt: {
      folds: ["v", "h"],
      punches: [{ col: 0, row: 0 }, { col: 1, row: 1 }],
      gridSize: 2,
    },
    options: [
      // Simplified: after unfolding a 2x-folded paper, each punch becomes 4 holes (mirrored).
      { holes: [
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true],
      ]},
      { holes: [
        [true, false, false, true],
        [false, true, true, false],
        [false, true, true, false],
        [true, false, false, true],
      ]},  // correct — mirrored 2× on both axes
      { holes: [
        [true, false, false, false],
        [false, true, false, false],
        [false, false, true, false],
        [false, false, false, true],
      ]},
      { holes: [
        [true, true, false, false],
        [true, true, false, false],
        [false, false, false, false],
        [false, false, false, false],
      ]},
    ],
    correctIndex: 1,
    explanation: "Kertas dilipat vertikal lalu horizontal → 4 lapis. Setiap punch = 4 lubang saat dibuka (dicerminkan pada kedua sumbu).",
  },

  // 7. MEMORY FLASH — 5-digit sequence, recall reverse
  {
    label: "Memori Kerja (memory_flash)",
    type: "memory_flash",
    prompt: {
      sequence: [7, 3, 9, 4, 6],
      displaySec: 5,
      recall: "reverse",
    },
    options: [
      { sequence: [6, 4, 9, 3, 7] }, // correct
      { sequence: [7, 3, 9, 4, 6] },
      { sequence: [6, 4, 3, 9, 7] },
      { sequence: [7, 4, 9, 3, 6] },
    ],
    correctIndex: 0,
    explanation: "Urutan asli: 7-3-9-4-6. Terbalik: 6-4-9-3-7.",
  },
];

export default function IqRendererPreview() {
  const [selected, setSelected] = useState<Record<number, number>>({});

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-2xl mx-auto p-4 pt-24 pb-16">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-indigo-600 font-semibold">Internal preview</div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">SpecTa IQ Discovery — Question Renderers</h1>
          <p className="text-sm text-slate-600 mt-1">
            One hardcoded example per renderer type. Not linked from anywhere;
            here so we can eyeball visual quality before we scale to a 200-item AI bank.
          </p>
        </div>

        <div className="space-y-10">
          {SAMPLES.map((q, i) => (
            <div key={i} className="pb-8 border-b border-slate-200 last:border-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-700">
                  {i + 1}. {q.type}
                </span>
                <span className="text-sm font-medium text-slate-700">{q.label}</span>
              </div>

              <IqQuestionRenderer
                type={q.type}
                prompt={q.prompt}
                options={q.options}
                selectedIndex={selected[i]}
                onSelect={(ix) => setSelected(s => ({ ...s, [i]: ix }))}
              />

              <div className="mt-3 flex items-start gap-3 text-xs">
                {selected[i] !== undefined && (
                  <div className={`px-2 py-1 rounded font-semibold
                    ${selected[i] === q.correctIndex
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"}`}>
                    {selected[i] === q.correctIndex ? "✓ Benar" : "✗ Salah"}
                  </div>
                )}
                <div className="text-slate-500 flex-1">
                  <strong>Jawaban:</strong> {String.fromCharCode(65 + q.correctIndex)} — {q.explanation}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
