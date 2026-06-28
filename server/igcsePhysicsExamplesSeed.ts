/**
 * Cambridge IGCSE Physics 0625 (Extended) — curated exam-style exemplars.
 *
 * Authored content (NOT scraped past papers). Each exemplar pairs a question
 * with a Cambridge-style mark scheme using the examiner conventions:
 *   M = method mark   A = accuracy/answer mark   B = independent mark
 *   FT = follow-through mark (carried-forward error allowed).
 *
 * Used both as RAG grounding for the AI Teacher (Learn mode) and as graded
 * Cambridge-style attempts for the student (Exam Practice mode).
 *
 * Seeded once on startup. Per-topic incremental: only inserts topics that
 * don't yet have any rows in the table, so future edits adding new topics
 * auto-seed on next deploy.
 */
import { getDb } from "./db";
import { igcseExamples } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Ex = { topicCode: string; marks: number; question: string; markScheme: string; source?: string };

// All Physics topic codes are "P"-prefixed (e.g. "P1.2") so they don't
// collide with Math's "1.2" in the shared igcse_examples table.
const EXAMPLES: Ex[] = [
  // ── P1.2 Motion ────────────────────────────────────────────────────────────
  { topicCode: "P1.2", marks: 4,
    question: "A car accelerates uniformly from rest. It reaches a speed of 24 m/s after 8.0 s.\n(a) Calculate its acceleration.\n(b) Calculate the distance travelled in this time.",
    markScheme: "(a) Use a = (v − u)/t = (24 − 0)/8.0 **(M1)** correct equation\n  **a = 3.0 m/s²  (A1)**\n(b) Use s = ut + ½at² (or v² = u² + 2as, or area under v–t graph) **(M1)**\n  s = 0 + ½(3.0)(8.0)² = 96\n  **s = 96 m  (A1)**\nUnits must be stated for both marks.",
    source: "exam-style" },

  { topicCode: "P1.2", marks: 3,
    question: "A speed–time graph for a cyclist is shown:\n  0 to 4 s: speed increases uniformly from 0 to 6 m/s\n  4 to 10 s: constant speed of 6 m/s\n  10 to 12 s: speed decreases uniformly from 6 m/s to 0\n\nCalculate the total distance travelled.",
    markScheme: "Total distance = area under the v–t graph.\nTriangle 1 (0–4 s): ½ × 4 × 6 = 12 m **(M1)**\nRectangle (4–10 s): 6 × 6 = 36 m **(M1)**\nTriangle 2 (10–12 s): ½ × 2 × 6 = 6 m\n**Total = 12 + 36 + 6 = 54 m  (A1)**\nKey rule: distance is the area under the speed–time graph, regardless of shape.",
    source: "exam-style" },

  // ── P1.3 Mass and weight ───────────────────────────────────────────────────
  { topicCode: "P1.3", marks: 3,
    question: "An astronaut has a mass of 70 kg on Earth. Take gravitational field strength on Earth as g = 9.8 N/kg and on the Moon as 1.6 N/kg.\n(a) State the astronaut's mass on the Moon.\n(b) Calculate the astronaut's weight on the Moon.",
    markScheme: "(a) **Mass = 70 kg  (B1)** — mass is unchanged by location (it is the amount of matter).\n(b) Use W = mg **(M1)**\n  W = 70 × 1.6 = **112 N  (A1)**\nCommon error: writing 'mass = 11.4 kg on the Moon' — confusing mass with weight.",
    source: "exam-style" },

  // ── P1.4 Density ───────────────────────────────────────────────────────────
  { topicCode: "P1.4", marks: 4,
    question: "An irregular stone is placed in a measuring cylinder containing 40 cm³ of water. The water level rises to 65 cm³. The mass of the stone is 60 g.\n(a) Find the volume of the stone.\n(b) Calculate the density of the stone.",
    markScheme: "(a) Volume = 65 − 40 = **25 cm³  (B1)**\n(b) Use ρ = m/V **(M1)**\n  ρ = 60/25 **(M1)**\n  **ρ = 2.4 g/cm³  (A1)**\nDisplacement method gives the volume of any irregular solid. Units (g/cm³ or kg/m³) must be consistent.",
    source: "exam-style" },

  // ── P1.5 Forces and Newton's second law ────────────────────────────────────
  { topicCode: "P1.5", marks: 4,
    question: "A box of mass 12 kg is pulled along a horizontal floor by a horizontal force of 50 N. A frictional force of 14 N acts on the box.\n(a) Calculate the resultant force on the box.\n(b) Calculate its acceleration.",
    markScheme: "(a) Resultant = 50 − 14 = **36 N (in the direction of the pull)  (B1)**\n(b) Use F = ma → a = F/m **(M1)**\n  a = 36/12 **(M1)**\n  **a = 3.0 m/s²  (A1)**\nTrap: using F = 50 N (the applied force) instead of the resultant.",
    source: "exam-style" },

  // ── P1.5.1 Turning effect / moments ────────────────────────────────────────
  { topicCode: "P1.5.1", marks: 4,
    question: "A uniform metre rule is pivoted at its 50 cm mark. A 2.0 N weight is hung at the 20 cm mark. To balance it, an unknown weight W is hung at the 80 cm mark.\nUsing the principle of moments, find W.",
    markScheme: "Anticlockwise moment about the pivot: 2.0 × (50 − 20) = 2.0 × 30 = 60 N cm **(M1)**\nClockwise moment: W × (80 − 50) = 30W **(M1)**\nPrinciple of moments: clockwise = anticlockwise → 30W = 60 **(M1)**\n**W = 2.0 N  (A1)**\nAlways use the perpendicular distance from the pivot.",
    source: "exam-style" },

  // ── P1.5.2 Hooke's law ─────────────────────────────────────────────────────
  { topicCode: "P1.5.2", marks: 4,
    question: "A spring obeys Hooke's law. A force of 4.0 N produces an extension of 5.0 cm.\n(a) Calculate the spring constant k in N/m.\n(b) What extension would a force of 10 N produce, assuming the elastic limit is not exceeded?",
    markScheme: "(a) Convert: 5.0 cm = 0.050 m **(M1)** for unit conversion\n  k = F/x = 4.0/0.050 = **80 N/m  (A1)**\n(b) x = F/k = 10/80 **(M1)**\n  **x = 0.125 m (= 12.5 cm)  (A1)**\nKey rule: Hooke's law applies up to the limit of proportionality.",
    source: "exam-style" },

  // ── P1.6 Momentum ──────────────────────────────────────────────────────────
  { topicCode: "P1.6", marks: 5,
    question: "A trolley A of mass 2.0 kg moves at 6.0 m/s and collides with a stationary trolley B of mass 3.0 kg. After the collision, the two trolleys move together (stick).\n(a) State the principle of conservation of momentum.\n(b) Calculate the velocity of the combined trolleys after collision.",
    markScheme: "(a) Total momentum before = total momentum after, **provided no external (resultant) force acts**.  (B1)\n(b) Momentum before: 2.0 × 6.0 + 3.0 × 0 = 12 kg m/s **(M1)**\n  Momentum after: (2.0 + 3.0) × v = 5.0v **(M1)**\n  Conservation: 5.0v = 12 → v = 12/5.0 **(M1)**\n  **v = 2.4 m/s  (A1)**\nThis is an inelastic collision — KE is NOT conserved, but momentum is.",
    source: "exam-style" },

  // ── P1.7 Energy, work, power ───────────────────────────────────────────────
  { topicCode: "P1.7", marks: 4,
    question: "A motor lifts a 30 kg load through a vertical height of 4.0 m in 5.0 s. Take g = 9.8 N/kg.\n(a) Calculate the work done against gravity.\n(b) Calculate the power output of the motor.",
    markScheme: "(a) W = Fd = (mg)d = 30 × 9.8 × 4.0 **(M1)**\n  **W = 1176 J ≈ 1200 J (3 s.f.)  (A1)**\n(b) P = W/t = 1176/5.0 **(M1)**\n  **P = 235 W (accept 234–240)  (A1)**\nTrap: using mass (30) instead of weight (mg) in the work calculation.",
    source: "exam-style" },

  { topicCode: "P1.7", marks: 4,
    question: "A 1500 W electric kettle takes 90 s to boil a quantity of water. The water gains 108 000 J of thermal energy in that time.\n(a) Calculate the total electrical energy supplied.\n(b) Calculate the efficiency of the kettle.",
    markScheme: "(a) E = Pt = 1500 × 90 **(M1)**\n  **E = 135 000 J  (A1)**\n(b) Efficiency = (useful energy out / total energy in) × 100% **(M1)**\n  = (108 000 / 135 000) × 100\n  **= 80%  (A1)**\nThe missing 27 000 J is lost as thermal energy to the kettle body and surroundings.",
    source: "exam-style" },

  // ── P1.8 Pressure ──────────────────────────────────────────────────────────
  { topicCode: "P1.8", marks: 3,
    question: "A diver descends to a depth of 25 m in seawater of density 1030 kg/m³. Take g = 9.8 N/kg.\nCalculate the additional pressure on the diver due to the water at this depth.",
    markScheme: "Use p = ρgh **(M1)** correct formula\np = 1030 × 9.8 × 25 **(M1)**\n**p = 252 350 Pa ≈ 2.5 × 10⁵ Pa  (A1)**\nThis is the EXTRA pressure due to the water column — atmospheric pressure (~1.0 × 10⁵ Pa) also acts.",
    source: "exam-style" },

  // ── P2.1.1 Gas laws ────────────────────────────────────────────────────────
  { topicCode: "P2.1.1", marks: 3,
    question: "A fixed mass of gas has a pressure of 1.2 × 10⁵ Pa when its volume is 800 cm³.\nThe temperature is kept constant. The gas is compressed until its volume is 500 cm³.\nCalculate the new pressure.",
    markScheme: "At constant temperature: p₁V₁ = p₂V₂ **(M1)**\np₂ = (1.2 × 10⁵ × 800)/500 **(M1)**\n**p₂ = 1.92 × 10⁵ Pa  (A1)**\nSince volume decreased, pressure must increase — check direction of the change as a sanity test.",
    source: "exam-style" },

  // ── P2.2.1 Specific heat capacity ──────────────────────────────────────────
  { topicCode: "P2.2.1", marks: 4,
    question: "An aluminium block of mass 0.50 kg is heated from 20 °C to 80 °C. The specific heat capacity of aluminium is 900 J/(kg K).\n(a) Calculate the thermal energy gained by the block.\n(b) Explain why this calculation assumes no heat loss to the surroundings.",
    markScheme: "(a) ΔE = mcΔθ **(M1)**\n  ΔE = 0.50 × 900 × (80 − 20) = 0.50 × 900 × 60 **(M1)**\n  **ΔE = 27 000 J (= 27 kJ)  (A1)**\n(b) **In practice some thermal energy is transferred to the air/surroundings, so the actual energy supplied by the heater is greater than the energy gained by the block.  (B1)**\nNote: temperature difference of 60 °C is the same as 60 K — only differences are interchangeable, not absolute temperatures.",
    source: "exam-style" },

  // ── P2.2.1 Latent heat ─────────────────────────────────────────────────────
  { topicCode: "P2.2.1", marks: 3,
    question: "The specific latent heat of fusion of ice is 3.3 × 10⁵ J/kg.\nCalculate the thermal energy needed to melt 0.40 kg of ice at 0 °C into water at 0 °C.",
    markScheme: "Use E = mL **(M1)**\nE = 0.40 × 3.3 × 10⁵ **(M1)**\n**E = 1.32 × 10⁵ J (= 132 kJ)  (A1)**\nKey point: temperature does NOT change during melting — all energy goes into breaking bonds between particles.",
    source: "exam-style" },

  // ── P2.3 Thermal energy transfer ───────────────────────────────────────────
  { topicCode: "P2.3", marks: 4,
    question: "A vacuum flask keeps hot drinks hot. Explain how the design of a vacuum flask reduces thermal energy loss by:\n(a) conduction\n(b) convection\n(c) radiation",
    markScheme: "(a) The **vacuum (or near-vacuum) between the double walls** has almost no particles, so no conduction (and no convection) can occur through it.  **(B1)**\n(b) The **vacuum prevents convection currents** between the walls; the stopper prevents convection from the top.  **(B1)**\n(c) The **silvered surfaces of both inner walls reflect infrared radiation** back into the drink (and reduce emission from the outer wall).  **(B2)** — B1 if only one of 'reflect back' or 'silver/shiny' is given.",
    source: "exam-style" },

  // ── P3.1 General wave properties ───────────────────────────────────────────
  { topicCode: "P3.1", marks: 3,
    question: "A wave on a rope has a frequency of 5.0 Hz and a wavelength of 0.40 m.\n(a) Calculate its speed.\n(b) State whether the wave is transverse or longitudinal, giving a reason.",
    markScheme: "(a) Use v = fλ **(M1)**\n  v = 5.0 × 0.40 = **2.0 m/s  (A1)**\n(b) **Transverse** — the rope particles vibrate perpendicular to the direction the wave travels.  **(B1)**\nKey distinction: transverse = particles ⊥ to wave; longitudinal = particles ∥ to wave (e.g. sound).",
    source: "exam-style" },

  // ── P3.2 Light — refractive index ──────────────────────────────────────────
  { topicCode: "P3.2", marks: 4,
    question: "A ray of light passes from air into glass. The angle of incidence is 50° and the angle of refraction in the glass is 30°.\n(a) Calculate the refractive index of the glass.\n(b) Calculate the critical angle for light going from this glass back into air.",
    markScheme: "(a) Use n = sin i / sin r **(M1)**\n  n = sin 50°/sin 30° = 0.766/0.5 **(M1)**\n  **n = 1.53 (accept 1.5)  (A1)**\n(b) Use sin c = 1/n **(M1)**\n  sin c = 1/1.53 → c = sin⁻¹(0.653) = **40.8° (accept 40°–41°)  (A1 — total 5 marks possible, drop one for an arithmetic slip)**.\nFT applies — wrong n in (a) carries through to (b).",
    source: "exam-style" },

  // ── P3.3 Electromagnetic spectrum ──────────────────────────────────────────
  { topicCode: "P3.3", marks: 3,
    question: "(a) List the seven regions of the electromagnetic spectrum in order of increasing frequency.\n(b) State one use of microwaves and one danger of ultraviolet radiation.",
    markScheme: "(a) **Radio → microwaves → infrared → visible → ultraviolet → X-rays → gamma rays  (B1 all correct, B0 otherwise — order matters)**\n(b) Use of microwaves: **cooking food / mobile phone communication / satellite communication** (any one) **(B1)**\n  Danger of UV: **skin cancer / sunburn / damage to eyes** (any one) **(B1)**\nKey rule: as frequency increases, wavelength decreases — they multiply to c = 3 × 10⁸ m/s.",
    source: "exam-style" },

  // ── P3.4 Sound ─────────────────────────────────────────────────────────────
  { topicCode: "P3.4", marks: 3,
    question: "A student claps her hands in front of a tall cliff. She hears an echo 1.6 s later. The speed of sound in air is 340 m/s.\nCalculate the distance from her to the cliff.",
    markScheme: "Sound travels to the cliff AND back in 1.6 s, so one-way time = 0.80 s **(M1)** for halving.\nDistance = speed × time = 340 × 0.80 **(M1)**\n**Distance = 272 m  (A1)**\nTrap: forgetting to halve — gives 544 m (the total there-and-back distance, not the cliff distance).",
    source: "exam-style" },

  // ── P4.2 Electrical quantities ─────────────────────────────────────────────
  { topicCode: "P4.2", marks: 3,
    question: "A current of 0.30 A flows through a resistor when the potential difference across it is 6.0 V.\n(a) Calculate the resistance of the resistor.\n(b) Calculate the charge that flows through it in 2.0 minutes.",
    markScheme: "(a) R = V/I = 6.0/0.30 **(M1)**\n  **R = 20 Ω  (A1)**\n(b) t = 2.0 × 60 = 120 s **(B1)** for time conversion\n  Q = It = 0.30 × 120 = **36 C  (A1 — total 4 possible, count any 3)**.\nAlways convert minutes to seconds before using Q = It.",
    source: "exam-style" },

  // ── P4.2.1 Electrical energy and power ─────────────────────────────────────
  { topicCode: "P4.2.1", marks: 4,
    question: "An electric heater is rated 230 V, 2000 W. It is used for 4.0 hours.\n(a) Calculate the current it draws.\n(b) Calculate the energy used in kWh and the cost at Rp 1,500 per kWh.",
    markScheme: "(a) P = IV → I = P/V = 2000/230 **(M1)**\n  **I = 8.7 A (3 s.f.)  (A1)**\n(b) Energy = power (kW) × time (h) = 2.0 × 4.0 = 8.0 kWh **(M1)**\n  Cost = 8.0 × 1500 = **Rp 12,000  (A1)**\nKey conversion: 2000 W = 2.0 kW. Always keep units consistent with the cost-per-kWh rate.",
    source: "exam-style" },

  // ── P4.3 Series and parallel circuits ──────────────────────────────────────
  { topicCode: "P4.3", marks: 4,
    question: "Three resistors of 6.0 Ω, 3.0 Ω and 12.0 Ω are connected in PARALLEL across a 6.0 V supply.\n(a) Calculate the total resistance of the combination.\n(b) Calculate the total current drawn from the supply.",
    markScheme: "(a) 1/R = 1/6 + 1/3 + 1/12 **(M1)** correct rule for parallel\n  = 2/12 + 4/12 + 1/12 = 7/12 **(M1)**\n  R = 12/7 = **1.71 Ω (accept 1.7 Ω)  (A1)**\n(b) I = V/R = 6.0/1.71 = **3.5 A (FT from (a))  (A1)**\nKey check: total parallel resistance must be LESS than any individual resistor — 1.71 < 3.0 ✓.",
    source: "exam-style" },

  // ── P4.3.1 Potential divider ───────────────────────────────────────────────
  { topicCode: "P4.3.1", marks: 3,
    question: "A 12 V battery is connected across a series combination of a 2.0 kΩ resistor and a 4.0 kΩ resistor. The output is taken across the 4.0 kΩ resistor.\nCalculate the output voltage.",
    markScheme: "Potential divider rule: Vₒᵤₜ = Vᵢₙ × R₂/(R₁ + R₂) **(M1)**\nVₒᵤₜ = 12 × 4.0/(2.0 + 4.0) = 12 × 4/6 **(M1)**\n**Vₒᵤₜ = 8.0 V  (A1)**\nThe larger resistor gets the larger share of the supply voltage.",
    source: "exam-style" },

  // ── P4.5 Electromagnetic induction / transformers ──────────────────────────
  { topicCode: "P4.5", marks: 4,
    question: "A step-down transformer has 4000 turns on the primary coil and 200 turns on the secondary coil. The primary is connected to a 230 V AC supply.\n(a) Calculate the secondary voltage.\n(b) Explain why transformers can only be used with alternating current.",
    markScheme: "(a) Use Vₚ/Vₛ = Nₚ/Nₛ → Vₛ = Vₚ × Nₛ/Nₚ **(M1)**\n  Vₛ = 230 × 200/4000 **(M1)**\n  **Vₛ = 11.5 V  (A1)**\n(b) AC produces a **continually changing magnetic flux** in the primary coil, which induces an EMF in the secondary. **A direct current produces a steady (unchanging) flux → no EMF is induced**, so a transformer would not work with DC. **(B1)**",
    source: "exam-style" },

  // ── P5.1 Nuclear atom ──────────────────────────────────────────────────────
  { topicCode: "P5.1", marks: 4,
    question: "The nuclide ²³⁵₉₂U is uranium-235.\n(a) State the number of protons, neutrons and electrons in a neutral atom of this nuclide.\n(b) State what is meant by an 'isotope'.",
    markScheme: "(a) Protons = Z = **92  (B1)**\n  Electrons (neutral atom) = **92  (B1)**\n  Neutrons = A − Z = 235 − 92 = **143  (B1)**\n(b) **Isotopes are atoms of the same element (same number of protons / same Z) but with different numbers of neutrons (different A).**  **(B1)**\nIsotopes share chemistry but differ in mass and stability.",
    source: "exam-style" },

  // ── P5.2 Radioactivity — half-life ─────────────────────────────────────────
  { topicCode: "P5.2", marks: 4,
    question: "A sample of a radioactive isotope has an initial count rate of 800 counts per minute. After 12 hours the count rate has fallen to 100 counts per minute.\n(a) Calculate the half-life of the isotope.\n(b) Predict the count rate after a further 8 hours (i.e. 20 hours from the start).",
    markScheme: "(a) Count goes 800 → 400 → 200 → 100 — that's **3 half-lives  (M1)**\n  3 half-lives = 12 h → t½ = **4.0 h  (A1)**\n(b) Further 8 h = 2 more half-lives **(M1)**\n  100 → 50 → 25\n  **Count rate ≈ 25 counts/min  (A1)** (FT from (a))\nKey rule: count rate halves with each half-life.",
    source: "exam-style" },

  // ── P5.2 Radioactivity — nuclear equation ──────────────────────────────────
  { topicCode: "P5.2", marks: 3,
    question: "Polonium-210 (²¹⁰₈₄Po) undergoes alpha decay to produce a nuclide of lead (Pb).\nWrite the balanced nuclear equation, giving the nucleon and proton numbers of the lead nuclide produced.",
    markScheme: "Alpha particle is ⁴₂He.\nA conserved: 210 = A_Pb + 4 → **A_Pb = 206  (B1)**\nZ conserved: 84 = Z_Pb + 2 → **Z_Pb = 82  (B1)**\nFull equation: ²¹⁰₈₄Po → ²⁰⁶₈₂Pb + ⁴₂He  **(B1 for a balanced equation)**\nA-numbers and Z-numbers must both balance — always check the totals on each side.",
    source: "exam-style" },

  // ── P6.2 Stars / redshift ──────────────────────────────────────────────────
  { topicCode: "P6.2", marks: 3,
    question: "Light from a distant galaxy is observed to be redshifted.\n(a) Explain what is meant by 'redshift'.\n(b) State what redshift of light from distant galaxies tells us about the Universe.",
    markScheme: "(a) **The wavelength of the observed light is longer (frequency is lower) than the wavelength emitted by the source — shifted towards the red end of the visible spectrum**.  **(B1, B1)** for both 'longer wavelength' and 'red end'.\n(b) **The galaxy is moving away from us; more distant galaxies have larger redshifts → they recede faster → the Universe is expanding**.  **(B1)**\nThis is direct evidence for the Big Bang model of the Universe.",
    source: "exam-style" },
];

/**
 * Per-topic incremental seeder for Physics exemplars. Future deploys adding
 * new topics to EXAMPLES will auto-seed without duplicating existing rows.
 */
export async function seedIgcsePhysicsExamplesIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };
  try {
    // Distinct Physics topicCodes (P-prefixed) already in the table.
    const existing = await db.execute(sql`SELECT DISTINCT topicCode AS code FROM igcse_examples WHERE topicCode LIKE 'P%'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const seeded = new Set<string>(list.map((r: any) => String(r?.code || "")));

    const byTopic = new Map<string, Ex[]>();
    EXAMPLES.forEach(e => {
      const arr = byTopic.get(e.topicCode) || [];
      arr.push(e);
      byTopic.set(e.topicCode, arr);
    });

    const rows: any[] = [];
    let sortOrder = 1000; // offset from Math
    for (const [code, items] of Array.from(byTopic.entries())) {
      if (seeded.has(code)) continue;
      for (const e of items) {
        rows.push({
          topicCode: e.topicCode,
          syllabus: "CIE_0625",
          tier: "extended" as const,
          marks: e.marks,
          question: e.question,
          markScheme: e.markScheme,
          source: e.source || "exam-style",
          sortOrder: sortOrder++,
        });
      }
    }

    if (!rows.length) return { seeded: 0 };
    await db.insert(igcseExamples).values(rows);
    console.log(`[IGCSE] Seeded ${rows.length} new Physics exemplars.`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Physics exemplar seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
