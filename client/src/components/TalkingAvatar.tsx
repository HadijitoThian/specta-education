/**
 * TalkingAvatar — a lightweight, zero-cost animated face for the live voice
 * agents (Emma / Arron). It lip-syncs to the agent's voice using the audio
 * spectrum the ElevenLabs SDK already exposes (getOutputByteFrequencyData),
 * so there is NO per-minute cost — everything renders in the browser.
 *
 * Behaviour:
 *   - Mouth opens/closes with the live audio amplitude while the agent speaks.
 *     If the analyser returns no data (some browsers), it falls back to a
 *     gentle oscillation so the mouth still moves believably.
 *   - Eyes blink on a natural random timer.
 *   - A soft ring pulses while the agent is speaking.
 *
 * The mouth + eyes are updated via refs inside a requestAnimationFrame loop
 * (not React state) so it animates at 60fps without re-rendering the page.
 */

import { useEffect, useRef } from "react";

interface Props {
  /** From useConversation().getOutputByteFrequencyData — the live output spectrum. */
  getFrequencyData?: () => Uint8Array;
  isSpeaking: boolean;
  variant?: "emma" | "arron";
  size?: number;
}

const LOOKS = {
  emma: {
    ring: "#E91E8C",
    hair: "#7B2FA6",
    hairDark: "#5E1F82",
    bg1: "#FCE7F3", bg2: "#F3E8FF",
    brow: "#5E1F82",
  },
  arron: {
    ring: "#4f46e5",
    hair: "#3B3654",
    hairDark: "#2A2740",
    bg1: "#E0E7FF", bg2: "#CFFAFE",
    brow: "#2A2740",
  },
};

export default function TalkingAvatar({ getFrequencyData, isSpeaking, variant = "emma", size = 104 }: Props) {
  const mouthRef = useRef<SVGEllipseElement | null>(null);
  const eyesRef = useRef<SVGGElement | null>(null);
  const openRef = useRef(0);           // smoothed mouth openness 0..1
  const rafRef = useRef<number | null>(null);
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;

  const c = LOOKS[variant] || LOOKS.emma;

  // ── Lip-sync loop ──
  useEffect(() => {
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      let target = 0;
      if (speakingRef.current) {
        let amp = 0;
        try {
          const data = getFrequencyData?.();
          if (data && data.length) {
            let sum = 0;
            const n = Math.min(data.length, 48); // low-mid band drives the mouth
            for (let i = 0; i < n; i++) sum += data[i];
            amp = (sum / n / 255) * 2.4;         // normalise 0..1 and amplify
          }
        } catch { /* analyser not ready */ }
        // Fallback so the mouth always moves while speaking, even without data.
        if (amp < 0.06) {
          const osc = (Math.sin(performance.now() / 95) + 1) / 2; // 0..1
          amp = 0.15 + osc * 0.5;
        }
        target = Math.min(1, amp);
      }
      openRef.current += (target - openRef.current) * 0.35; // ease
      if (mouthRef.current) {
        mouthRef.current.setAttribute("ry", String(1.6 + openRef.current * 12));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { mounted = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [getFrequencyData]);

  // ── Blink ──
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const blink = () => {
      const el = eyesRef.current;
      if (el) {
        el.style.transform = "scaleY(0.12)";
        setTimeout(() => { if (eyesRef.current) eyesRef.current.style.transform = "scaleY(1)"; }, 110);
      }
      timer = setTimeout(blink, 2200 + Math.random() * 3200);
    };
    timer = setTimeout(blink, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      {/* speaking pulse */}
      <div
        style={{
          position: "absolute", inset: 0, borderRadius: "9999px",
          background: c.ring, opacity: isSpeaking ? 0.28 : 0,
          transform: isSpeaking ? "scale(1)" : "scale(0.85)",
          transition: "opacity .25s ease, transform .25s ease",
          animation: isSpeaking ? "sa-pulse 1.4s ease-in-out infinite" : "none",
        }}
      />
      <style>{`@keyframes sa-pulse{0%,100%{transform:scale(0.92);opacity:.18}50%{transform:scale(1.08);opacity:.32}}`}</style>

      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: "relative", display: "block" }}>
        <defs>
          <radialGradient id={`bg-${variant}`} cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor={c.bg1} />
            <stop offset="100%" stopColor={c.bg2} />
          </radialGradient>
        </defs>

        {/* background disc */}
        <circle cx="50" cy="50" r="49" fill={`url(#bg-${variant})`} />

        {/* hair back */}
        <path d="M18 52 Q16 20 50 18 Q84 20 82 52 Q82 40 50 38 Q18 40 18 52Z" fill={c.hairDark} />

        {/* face */}
        <circle cx="50" cy="52" r="30" fill="#F7C9A6" />

        {/* hair top */}
        {variant === "emma" ? (
          <>
            <path d="M22 50 Q22 22 50 22 Q78 22 78 50 Q70 34 50 34 Q30 34 22 50Z" fill={c.hair} />
            <path d="M22 50 Q18 66 22 78 Q26 60 30 54 Q26 50 22 50Z" fill={c.hair} />
            <path d="M78 50 Q82 66 78 78 Q74 60 70 54 Q74 50 78 50Z" fill={c.hair} />
          </>
        ) : (
          <path d="M24 48 Q24 24 50 24 Q76 24 76 48 Q72 36 50 35 Q28 36 24 48Z" fill={c.hair} />
        )}

        {/* cheeks */}
        <circle cx="36" cy="58" r="4.5" fill="#F7A8C4" opacity="0.55" />
        <circle cx="64" cy="58" r="4.5" fill="#F7A8C4" opacity="0.55" />

        {/* eyebrows */}
        <rect x="31" y="44" width="10" height="2.4" rx="1.2" fill={c.brow} />
        <rect x="59" y="44" width="10" height="2.4" rx="1.2" fill={c.brow} />

        {/* eyes (blink by scaling this group) */}
        <g ref={eyesRef} style={{ transformBox: "fill-box", transformOrigin: "center", transition: "transform 90ms ease" }}>
          <g>
            <ellipse cx="36" cy="51" rx="3.4" ry="4.4" fill="#3A2A2A" />
            <circle cx="37.2" cy="49.6" r="1.1" fill="#fff" />
          </g>
          <g>
            <ellipse cx="64" cy="51" rx="3.4" ry="4.4" fill="#3A2A2A" />
            <circle cx="65.2" cy="49.6" r="1.1" fill="#fff" />
          </g>
        </g>

        {/* mouth — ry animated in the rAF loop */}
        <ellipse ref={mouthRef} cx="50" cy="66" rx="6.5" ry="1.6" fill="#7A2E3F" />
        {/* little smile hint */}
        <path d="M43 64 Q50 62 57 64" stroke="#C97" strokeWidth="0" fill="none" />
      </svg>
    </div>
  );
}
