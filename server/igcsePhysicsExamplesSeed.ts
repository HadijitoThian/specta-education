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

  // ═══════════════════════════════════════════════════════════════════════════
  // Coverage expansion — fill zero-coverage topics + add 2nd questions on
  // high-yield ones so most topics have 2 questions like the Math bank does.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── P1.1 Physical quantities and measurement ───────────────────────────────
  { topicCode: "P1.1", marks: 3,
    question: "Describe how a student could measure the period of a simple pendulum (one complete swing) as accurately as possible using a stopwatch.",
    markScheme: "Time, with a stopwatch, **a large number of oscillations (e.g. 20)  (B1)**\nDivide total time by the number of oscillations to find ONE period **(B1)**\nRepeat the measurement and **take an average** (or state \"to reduce the effect of human reaction time / random error\") **(B1)**\nKey idea: timing many swings then dividing reduces the fractional effect of human reaction-time uncertainty.",
    source: "exam-style" },

  // ── P1.2 Motion — third question (deceleration with v² = u² + 2as) ─────────
  { topicCode: "P1.2", marks: 4,
    question: "A car is travelling at 20 m/s when the driver applies the brakes. The car decelerates uniformly at 5.0 m/s² and stops.\n(a) Calculate the time taken to stop.\n(b) Calculate the distance travelled while braking.",
    markScheme: "(a) Use v = u + at with v = 0, u = 20, a = −5.0 → 0 = 20 + (−5.0)t **(M1)**\n  t = 4.0 s **(A1)**\n(b) Use v² = u² + 2as → 0 = 20² + 2(−5.0)s **(M1)**\n  s = 400/10 = **40 m  (A1)**\nA negative acceleration (deceleration) is the standard sign convention. Either equation works; v² = u² + 2as is fastest when t is not needed.",
    source: "exam-style" },

  // ── P1.5 Forces — Newton's third law ───────────────────────────────────────
  { topicCode: "P1.5", marks: 3,
    question: "A book of weight 8.0 N rests on a table.\n(a) State the force that the table exerts on the book and its size.\n(b) State the Newton's-third-law pair of the book's WEIGHT.",
    markScheme: "(a) **The table pushes UPWARD on the book with a normal contact force of 8.0 N  (B1, B1)**\n(b) **The book pulls the EARTH upward with a force of 8.0 N (gravitational attraction)  (B1)**\nCommon trap: saying \"the table pushes up\" as the 3rd-law pair of the weight. NOT correct — they act on the SAME body (book) and are not a 3rd-law pair. A 3rd-law pair acts on TWO DIFFERENT bodies.",
    source: "exam-style" },

  // ── P1.6 Momentum — second question (impulse / explosion) ──────────────────
  { topicCode: "P1.6", marks: 4,
    question: "A rifle of mass 4.0 kg fires a bullet of mass 0.020 kg horizontally with a muzzle velocity of 300 m/s.\nUsing conservation of momentum, calculate the recoil velocity of the rifle.",
    markScheme: "Total momentum before firing = 0 (both at rest) **(B1)**\nAfter firing: bullet has momentum +0.020 × 300 = +6.0 kg m/s **(M1)**\nRifle momentum: 4.0 × v\nConservation: 0 = 4.0v + 6.0 → v = −1.5 m/s **(M1)**\n**Recoil velocity = 1.5 m/s in the OPPOSITE direction to the bullet  (A1)**\nDirection must be stated. The minus sign just encodes \"opposite direction\".",
    source: "exam-style" },

  // ── P1.7.1 Energy resources ────────────────────────────────────────────────
  { topicCode: "P1.7.1", marks: 4,
    question: "Compare wind power and coal-fired power stations as ways of generating electricity. Give one ADVANTAGE and one DISADVANTAGE of each.",
    markScheme: "Wind — advantage: **renewable / does not produce CO₂ / no fuel cost** (any one) **(B1)**\nWind — disadvantage: **unreliable (depends on wind speed) / takes up large area / visual or noise pollution** (any one) **(B1)**\nCoal — advantage: **reliable / can produce large amounts of energy on demand / fuel readily available now** (any one) **(B1)**\nCoal — disadvantage: **produces CO₂ (greenhouse gas) and other pollutants (SO₂) / non-renewable / contributes to climate change** (any one) **(B1)**\nFour marks total — one for each of A/D for both sources.",
    source: "exam-style" },

  // ── P2.1 Kinetic particle model — gas pressure ─────────────────────────────
  { topicCode: "P2.1", marks: 4,
    question: "Explain, in terms of the motion of particles, why the pressure of a fixed mass of gas in a sealed container INCREASES when the temperature is raised at constant volume.",
    markScheme: "Higher temperature → **particles have more (kinetic) energy** → **move faster (on average)**  **(B1, B1)**\nFaster particles **collide with the walls more often** (and with greater force per collision) **(B1)**\nMore frequent and harder collisions → **greater force per unit area on the walls → higher pressure**  **(B1)**\nKey link: temperature ↑ → speed ↑ → collision frequency AND collision force ↑ → pressure ↑.",
    source: "exam-style" },

  // ── P2.2 Thermal properties — bimetallic strip / expansion ─────────────────
  { topicCode: "P2.2", marks: 3,
    question: "A bimetallic strip is made by riveting together a strip of brass and a strip of iron. When heated, the strip bends with the brass on the OUTSIDE of the curve.\n(a) Explain why the strip bends.\n(b) State one practical application of a bimetallic strip.",
    markScheme: "(a) **Brass expands MORE than iron for the same temperature rise** (brass has a larger thermal expansion) **(B1)** → the brass side becomes longer → forces the strip to curve with the brass on the outside **(B1)**.\n(b) **Fire alarm / thermostat (e.g. iron, electric kettle, oven) / temperature-controlled switch** (any one) **(B1)**\nKey rule: different metals have different expansion rates — exploited in switches that respond to temperature.",
    source: "exam-style" },

  // ── P3.2 Light — second question (lens ray diagram) ────────────────────────
  { topicCode: "P3.2", marks: 4,
    question: "A small object is placed 30 cm in front of a thin converging lens of focal length 20 cm.\nUsing the standard rules (ray parallel to axis → through F, ray through optical centre → straight, ray through F → emerges parallel), describe (without scale drawing) the type of image formed.\nState whether the image is:\n(a) real or virtual,\n(b) upright or inverted,\n(c) larger, smaller, or the same size,\n(d) on the same or the opposite side of the lens as the object.",
    markScheme: "Object distance (30 cm) is **between F (20 cm) and 2F (40 cm)**  **(B1)**\n(a) **Real  (B1)**\n(b) **Inverted  (B1)**\n(c) **Larger (magnified)  (B1)**\n(d) Opposite side of the lens (on the far side from the object) — implicit in 'real'.\nGeneral rule for converging lens:\n  • Object > 2F → real, inverted, smaller\n  • Object at 2F → real, inverted, same size\n  • Object between F and 2F → real, inverted, larger (this case)\n  • Object at F → no image (rays emerge parallel)\n  • Object < F → virtual, upright, larger (magnifying glass)",
    source: "exam-style" },

  // ── P3.2.1 Dispersion ──────────────────────────────────────────────────────
  { topicCode: "P3.2.1", marks: 3,
    question: "(a) Explain why white light passing through a prism is split into a spectrum of colours.\n(b) State which colour is bent the MOST and which is bent the LEAST.",
    markScheme: "(a) **White light contains many different frequencies (colours)**. **Different colours refract by different amounts** when entering the glass (the refractive index is slightly different for each wavelength) **(B1, B1)** → so they separate into a spectrum.\n(b) Bent most: **violet  (B1)**.  Bent least: **red** (implicit in 'most').\nKey rule: shorter wavelength (violet) is refracted MORE; longer wavelength (red) is refracted LESS.",
    source: "exam-style" },

  // ── P3.4 Sound — second question (ultrasound) ──────────────────────────────
  { topicCode: "P3.4", marks: 3,
    question: "An ultrasound pulse sent vertically downward from a ship reflects off the seabed and returns to the ship 0.20 s later. The speed of sound in seawater is 1500 m/s.\nCalculate the depth of the seabed below the ship.",
    markScheme: "Total round-trip distance = speed × time = 1500 × 0.20 = 300 m **(M1)**\nThis distance is to seabed AND back → one-way distance = 300/2 **(M1)**\n**Depth = 150 m  (A1)**\nSame 'halve the time/distance' trick as the cliff echo problem — sonar uses exactly this principle.",
    source: "exam-style" },

  // ── P4.1 Magnetism ─────────────────────────────────────────────────────────
  { topicCode: "P4.1", marks: 4,
    question: "(a) State whether iron or steel is the better material for the CORE of an electromagnet, and explain why.\n(b) State whether iron or steel is the better material for a PERMANENT magnet, and explain why.",
    markScheme: "(a) **Iron (specifically soft iron)  (B1)** because it **magnetises and demagnetises easily** — so the electromagnet can be switched ON and OFF cleanly when the current is switched **(B1)**.\n(b) **Steel  (B1)** because it **retains its magnetism after the magnetising field is removed** (hard to demagnetise) — so it stays magnetised permanently **(B1)**.\nKey distinction: soft iron = easy to magnetise AND demagnetise (good for electromagnets); steel = hard to magnetise but RETAINS magnetism (good for permanent magnets).",
    source: "exam-style" },

  // ── P4.2 Electrical quantities — second (resistance of a wire) ─────────────
  { topicCode: "P4.2", marks: 3,
    question: "Two wires are made of the same material and have the same cross-sectional area. Wire A has length 1.0 m and resistance 8.0 Ω. Wire B has length 2.5 m.\nCalculate the resistance of wire B.",
    markScheme: "Resistance is **directly proportional to length** (R ∝ L) when material and area are constant **(M1)**\nR_B / R_A = L_B / L_A → R_B = 8.0 × (2.5/1.0) **(M1)**\n**R_B = 20 Ω  (A1)**\nKey rule: R ∝ L (longer = more resistance) and R ∝ 1/A (thicker = less resistance).",
    source: "exam-style" },

  // ── P4.3 Circuits — second (mixed series-parallel) ─────────────────────────
  { topicCode: "P4.3", marks: 4,
    question: "Two resistors of 6.0 Ω and 3.0 Ω are connected in PARALLEL, and this combination is connected IN SERIES with a 4.0 Ω resistor across a 12 V battery.\n(a) Calculate the total resistance of the circuit.\n(b) Calculate the current drawn from the battery.",
    markScheme: "(a) Parallel pair: 1/R_p = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 → R_p = **2.0 Ω  (M1, A1)**\n  Total: R_total = R_p + 4.0 = **6.0 Ω  (B1)**\n(b) I = V/R = 12/6.0 **(M1)** → **I = 2.0 A  (A1 — total 4 possible)**\nStep order matters: SIMPLIFY parallel parts to a single resistor FIRST, then add series.",
    source: "exam-style" },

  // ── P4.4 Practical electricity ─────────────────────────────────────────────
  { topicCode: "P4.4", marks: 4,
    question: "A household electric heater has a power rating of 2300 W and runs on a 230 V mains supply.\n(a) Calculate the current it draws.\n(b) Of the fuses available (3 A, 5 A, 13 A), state which is the most suitable and explain why.",
    markScheme: "(a) I = P/V = 2300/230 = **10 A  (M1, A1)**\n(b) The fuse must be **rated SLIGHTLY ABOVE the normal operating current** so it doesn't trip during normal use, but blows if the current rises **(M1)**.\n  10 A draw → 13 A fuse is the most suitable **(A1)**.\nTrap: choosing 5 A (would blow immediately) or a fuse much larger than needed (wouldn't blow soon enough to protect the appliance).",
    source: "exam-style" },

  // ── P4.5 Electromagnetic effects — DC motor ────────────────────────────────
  { topicCode: "P4.5", marks: 4,
    question: "(a) State Fleming's left-hand rule and what it tells us.\n(b) Describe two ways to INCREASE the turning effect (torque) of a simple DC motor.",
    markScheme: "(a) **Hold the left hand with the thumb, first (index) finger and second (middle) finger mutually at right angles. First finger = magnetic Field direction; second finger = Current direction; thumb = Force (thrust) direction on the conductor.**  **(B1, B1)**\n(b) Any TWO of: **increase the current, use a stronger magnet, use more turns on the coil, use a soft-iron core inside the coil**  **(B1, B1)**\nKey rule: F = BIL applies — increasing B, I, or the effective length of conductor in the field all raise the force.",
    source: "exam-style" },

  // ── P5.1 Nuclear atom — second (alpha scattering) ──────────────────────────
  { topicCode: "P5.1", marks: 4,
    question: "In Rutherford's alpha-scattering experiment, a thin gold foil was bombarded with alpha particles.\n(a) State the two key observations.\n(b) Explain what each observation tells us about the structure of the atom.",
    markScheme: "(a) Observation 1: **Most alpha particles passed straight through with little or no deflection.  (B1)**\n  Observation 2: **A very small fraction of alpha particles were deflected through large angles, some bouncing back.  (B1)**\n(b) Observation 1 tells us: **the atom is mostly empty space.  (B1)**\n  Observation 2 tells us: **there is a small, dense, positively-charged nucleus** at the centre that repels alpha particles when they come close. **(B1)**\nKey upshot: the experiment overthrew the 'plum pudding' model and gave us the modern nuclear-atom picture.",
    source: "exam-style" },

  // ── P5.2 Radioactivity — third (penetration / safety) ──────────────────────
  { topicCode: "P5.2", marks: 4,
    question: "(a) Complete the table for the three types of nuclear radiation:\n         Charge      Penetration\nα        ____        ____\nβ        ____        ____\nγ        ____        ____\n(b) State the THREE main safety precautions when handling a radioactive source.",
    markScheme: "(a) α: **+2** charge, stopped by **paper / a few cm of air**  **(B1)**\n  β: **−1** charge, stopped by **thin aluminium (a few mm)**  **(B1)**\n  γ: **0** charge, stopped (substantially) by **thick lead / metres of concrete**  **(B1)**\n(b) Any THREE of: **handle with tongs / forceps (distance), point source AWAY from people, store in a lead-lined container, limit exposure TIME, wear protective clothing / lab coat, no eating or drinking near the source**  **(B1 — best 3)**\nKey principle: protection = TIME (shorter), DISTANCE (further), SHIELDING (denser material).",
    source: "exam-style" },

  // ── P6.1 Earth and Solar System ────────────────────────────────────────────
  { topicCode: "P6.1", marks: 3,
    question: "A planet at a greater distance from the Sun orbits at a LOWER speed and takes a LONGER time to complete one orbit.\nExplain BOTH observations in terms of gravity.",
    markScheme: "Gravity provides the **centripetal force needed to keep a planet in orbit  (B1)**.\nFurther from the Sun → **the gravitational pull of the Sun is weaker** (gravity falls off with distance) → the planet needs a **smaller (lower) orbital speed** to stay in orbit **(B1)**.\nA lower speed combined with a **longer orbital circumference** (further out) → the **orbital period (year) is longer  (B1)**.\nKey rule: stronger gravity → tighter, faster orbits; weaker gravity → wider, slower orbits.",
    source: "exam-style" },

  // ── P6.2 Stars — second (Sun's energy source) ──────────────────────────────
  { topicCode: "P6.2", marks: 3,
    question: "(a) State the process by which energy is released in the Sun's core.\n(b) State the main nuclear reaction taking place.",
    markScheme: "(a) **Nuclear fusion  (B1)**\n(b) **Hydrogen nuclei (protons) fuse to form helium**, releasing energy **(B1)**.\n  The total mass of the products is slightly less than the total mass of the reactants — the lost mass is converted into energy (E = mc²).  **(B1)**\nThis is what powers all main-sequence stars, including the Sun, for billions of years.",
    source: "exam-style" },
];

/**
 * Per-question incremental seeder for Physics exemplars.
 *
 * Compares each EXAMPLES entry against rows already in the DB using
 * (topicCode + first 120 chars of question text) as a stable de-dup key.
 * Inserts only the ones not already present, so:
 *   • adding a NEW topic to EXAMPLES → auto-seeds on next deploy
 *   • adding ADDITIONAL questions to an already-seeded topic → also auto-seeds
 *   • re-running has no effect (all keys match)
 */
export async function seedIgcsePhysicsExamplesIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };
  try {
    // Build a set of (topicCode + question prefix) keys already in the DB.
    const existing = await db.execute(sql`SELECT topicCode, question FROM igcse_examples WHERE topicCode LIKE 'P%'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const dedupKey = (code: string, q: string) => `${code}::${q.slice(0, 120)}`;
    const present = new Set<string>(list.map((r: any) => dedupKey(String(r?.topicCode || ""), String(r?.question || ""))));

    const rows: any[] = [];
    let sortOrder = 1000; // offset from Math
    for (const e of EXAMPLES) {
      if (present.has(dedupKey(e.topicCode, e.question))) continue;
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

    if (!rows.length) {
      console.log(`[IGCSE] Physics exemplars already complete (${list.length} rows in DB, ${EXAMPLES.length} in seed file).`);
      return { seeded: 0 };
    }
    await db.insert(igcseExamples).values(rows);
    console.log(`[IGCSE] Seeded ${rows.length} new Physics exemplars (total now ${list.length + rows.length}).`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Physics exemplar seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
