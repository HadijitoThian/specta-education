/**
 * Cambridge IGCSE Physics 0625 — Extended tier topic tree.
 *
 * Authored from Cambridge's published syllabus areas P1–P6. Seeded once into
 * `igcse_topics` on startup (idempotent: only inserts if no Physics rows
 * exist yet). The `learningOutcomes` field is what the AI Teacher uses as
 * grounding when teaching a topic.
 *
 * Topic `code` is prefixed with "P" (e.g. "P1.5") to avoid collisions with
 * Math's "1.5". Area codes are "P1".."P6".
 */
import { getDb, ensureIgcsePhysicsSubject } from "./db";
import { igcseTopics } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Seed = { code: string; title: string; learningOutcomes: string; tier?: "core" | "extended" | "both" };
type Area = { code: string; name: string; topics: Seed[] };

const AREAS: Area[] = [
  {
    code: "P1", name: "Motion, forces and energy",
    topics: [
      { code: "P1.1", title: "Physical quantities and measurement techniques", learningOutcomes: "SI units (m, kg, s, A, K, mol); measuring length, volume, mass and time with the right instrument; multiple measurements to reduce uncertainty; using rulers, measuring cylinders, balances and stopwatches; describing how to measure short intervals (e.g. period of a pendulum)." },
      { code: "P1.2", title: "Motion", learningOutcomes: "Distance, displacement, speed, velocity, acceleration; distance–time and speed–time graphs (gradient = velocity or acceleration; area under speed–time = distance); equations v = u + at, s = ut + ½at², v² = u² + 2as; acceleration of free fall g = 9.8 m/s²; terminal velocity." },
      { code: "P1.3", title: "Mass and weight", learningOutcomes: "Mass (kg) measured with a balance; weight (N) as gravitational force = mg; gravitational field strength g (N/kg); inertia; differences between mass and weight." },
      { code: "P1.4", title: "Density", learningOutcomes: "Density ρ = m/V (kg/m³ or g/cm³); measuring density of regular and irregular solids and liquids; floating and sinking — object floats when its density < fluid density." },
      { code: "P1.5", title: "Forces — effects, vectors and Newton's laws", learningOutcomes: "Force as a vector (magnitude + direction); resultant force from co-linear forces and at right angles using Pythagoras + trigonometry; Newton's first law (object at rest or constant velocity ⇔ resultant force = 0); F = ma; Newton's third law (action–reaction pairs)." },
      { code: "P1.5.1", title: "Turning effect and equilibrium", learningOutcomes: "Moment = force × perpendicular distance from pivot (N m); principle of moments (sum of clockwise = sum of anticlockwise about a pivot); conditions for equilibrium; centre of gravity and stability." },
      { code: "P1.5.2", title: "Hooke's law and springs", learningOutcomes: "Extension proportional to load up to limit of proportionality (F = kx); spring constant k; force–extension graphs; elastic vs inelastic deformation; limit of proportionality on the graph." },
      { code: "P1.6", title: "Momentum", learningOutcomes: "p = mv (kg m/s); impulse = FΔt = change in momentum; principle of conservation of momentum in 1D collisions (elastic and inelastic); applying conservation to collisions and explosions." },
      { code: "P1.7", title: "Energy, work and power", learningOutcomes: "Forms of energy (kinetic, gravitational potential, elastic potential, chemical, electrical, thermal, light, sound, nuclear); KE = ½mv²; ΔGPE = mgΔh; energy is conserved (cannot be created/destroyed, only transferred); efficiency = useful energy out / total energy in × 100%; W = Fd; P = W/t = E/t (watt = J/s)." },
      { code: "P1.7.1", title: "Energy resources", learningOutcomes: "Renewable (solar, wind, hydroelectric, geothermal, tidal, biofuels) vs non-renewable (fossil fuels, nuclear); advantages/disadvantages; the Sun as the source of most of Earth's energy; energy conversion efficiency in power stations." },
      { code: "P1.8", title: "Pressure", learningOutcomes: "p = F/A (Pa = N/m²); pressure in liquids p = ρgh (depth); pressure increases with depth and density of fluid; manometers and barometers; atmospheric pressure; Bernoulli effect not required." },
    ],
  },
  {
    code: "P2", name: "Thermal physics",
    topics: [
      { code: "P2.1", title: "Kinetic particle model of matter", learningOutcomes: "Properties of solids/liquids/gases in terms of particle arrangement, separation and motion; Brownian motion as evidence for moving particles; pressure in a gas from particle collisions with container walls; temperature as a measure of average kinetic energy of particles; absolute zero." },
      { code: "P2.1.1", title: "Gas laws", learningOutcomes: "For a fixed mass of gas at constant temperature: pV = constant (Boyle's law); pressure increases with temperature at constant volume; using p₁V₁ = p₂V₂; qualitative effect of changing temperature on volume at constant pressure." },
      { code: "P2.2", title: "Thermal properties and temperature", learningOutcomes: "Expansion of solids/liquids/gases on heating; physical consequences (railway track gaps, bimetallic strips); thermometers — liquid-in-glass and thermocouple; thermistor as a temperature sensor; sensitivity, range and linearity of thermometers." },
      { code: "P2.2.1", title: "Specific heat capacity and latent heat", learningOutcomes: "ΔE = mcΔθ for specific heat capacity c (J/kg K); experimental determination of c; specific latent heat of fusion and vaporisation L (J/kg); E = mL; melting and boiling occur at constant temperature; difference between evaporation and boiling." },
      { code: "P2.3", title: "Transfer of thermal energy", learningOutcomes: "Conduction (lattice vibrations + free electrons in metals); convection (warmer fluid rises due to lower density); radiation (electromagnetic waves, including infrared, no medium required); rate of radiation increases with temperature and depends on surface (black/matt surfaces absorb and emit more than shiny/white); applications (vacuum flask, climate)." },
    ],
  },
  {
    code: "P3", name: "Waves",
    topics: [
      { code: "P3.1", title: "General wave properties", learningOutcomes: "Transverse vs longitudinal waves; wavelength λ, frequency f, period T (T = 1/f), amplitude, wave speed; v = fλ; wavefronts; reflection of waves at a barrier (angle of incidence = angle of reflection); refraction of waves (change of direction when speed changes)." },
      { code: "P3.2", title: "Light", learningOutcomes: "Reflection in a plane mirror — image is virtual, upright, laterally inverted, same size, same distance behind mirror as object in front; refraction at boundaries; refractive index n = sin i / sin r; critical angle and total internal reflection; sin c = 1/n; uses (optical fibres, prisms); thin converging lens — principal focus, focal length, ray diagrams (object beyond 2F → real, inverted, diminished image; etc.); magnifying glass (object between lens and F → virtual, upright, enlarged)." },
      { code: "P3.2.1", title: "Dispersion of light", learningOutcomes: "White light split into a spectrum by a prism (red bends least, violet most); monochromatic light; the seven colours of the visible spectrum (red, orange, yellow, green, blue, indigo, violet)." },
      { code: "P3.3", title: "Electromagnetic spectrum", learningOutcomes: "Order from longest to shortest wavelength: radio, microwaves, infrared, visible, ultraviolet, X-rays, gamma rays; all travel at the speed of light c = 3 × 10⁸ m/s in vacuum; uses and dangers of each region (e.g. UV → suntan and skin cancer; X-rays → imaging and tissue damage)." },
      { code: "P3.4", title: "Sound", learningOutcomes: "Sound is a longitudinal wave (compressions and rarefactions); produced by vibrating sources; requires a medium (cannot travel through vacuum); approximate speed in air ≈ 340 m/s; audible range 20 Hz–20 kHz; loudness depends on amplitude, pitch on frequency; echoes and reflection; ultrasound applications (medical imaging, sonar)." },
    ],
  },
  {
    code: "P4", name: "Electricity and magnetism",
    topics: [
      { code: "P4.1", title: "Simple phenomena of magnetism", learningOutcomes: "Magnetic poles attract/repel (like poles repel, unlike attract); magnetic field as the region where a force acts on a magnetic pole; magnetic field lines (direction = direction a free N pole would move); plotting field with a compass; magnetic vs non-magnetic materials; differences between magnetic, electromagnet and induced magnetism; soft iron vs steel for cores." },
      { code: "P4.2", title: "Electrical quantities", learningOutcomes: "Charge Q (coulomb, C); current I = Q/t (ampere, A); positive ions and electrons; conventional current vs electron flow; voltage / potential difference V (volt, V) = energy per unit charge transferred; resistance R = V/I (ohm, Ω); resistance of a wire depends on length, cross-sectional area and material (R ∝ L/A); I–V graph for a metallic conductor (straight line through origin — ohmic); filament lamp (curve, non-ohmic)." },
      { code: "P4.2.1", title: "Electrical energy and power", learningOutcomes: "P = IV (watt); E = IVt (joule); kilowatt-hour as a practical energy unit; electricity cost = power × time × price per kWh." },
      { code: "P4.3", title: "Electric circuits", learningOutcomes: "Circuit symbols (cell, battery, switch, resistor, lamp, ammeter, voltmeter, thermistor, LDR); series — same current throughout, voltages add, total R = R₁ + R₂; parallel — voltages equal, currents add, 1/R = 1/R₁ + 1/R₂; ammeter in series (low resistance), voltmeter in parallel (high resistance)." },
      { code: "P4.3.1", title: "Potential divider and sensing circuits", learningOutcomes: "Potential divider — two resistors in series share the supply voltage in ratio of their resistances; use of LDR (resistance falls in light) or thermistor (resistance falls when hot) in a potential divider to switch outputs; calculating output voltage Vₒᵤₜ = Vᵢₙ × R₂/(R₁+R₂)." },
      { code: "P4.4", title: "Practical electricity", learningOutcomes: "Hazards (damaged insulation, overheating cables, damp conditions); use of fuses, circuit breakers and earthing for safety; three-pin plug wiring (live brown, neutral blue, earth green/yellow); reasons for double insulation; calculating the correct fuse rating from P = IV." },
      { code: "P4.5", title: "Electromagnetic effects", learningOutcomes: "Magnetic field around a current-carrying wire (right-hand grip rule); solenoid field is like a bar magnet; factors increasing field strength (more turns, larger current, soft iron core); force on a current-carrying conductor in a magnetic field — Fleming's left-hand rule (F = BIL not required by name); DC motor; electromagnetic induction — EMF induced when a conductor moves through a magnetic field (or field changes around it); Lenz's law direction; AC generator; transformer Vₚ/Vₛ = Nₚ/Nₛ; step-up vs step-down; reason for high-voltage transmission (low current → low I²R losses)." },
      { code: "P4.6", title: "Cathode-ray oscilloscope (basic)", learningOutcomes: "(NOT required for current 0625) — kept for legacy reference only." },
    ],
  },
  {
    code: "P5", name: "Nuclear physics",
    topics: [
      { code: "P5.1", title: "The nuclear atom", learningOutcomes: "Atom = small dense positive nucleus (protons + neutrons) surrounded by electrons in shells; nucleon (mass) number A and proton (atomic) number Z; isotopes — same Z, different A; nuclide notation ᴬZX; Rutherford alpha-scattering experiment evidence: most alpha particles passed through (atom is mostly empty space), a few deflected (concentrated positive nucleus)." },
      { code: "P5.2", title: "Radioactivity", learningOutcomes: "Three types of emission — alpha (helium nucleus, slow, very ionising, stopped by paper), beta (electron, fast, moderately ionising, stopped by thin aluminium), gamma (high-frequency EM wave, very penetrating, stopped by thick lead); nuclear equations conserve A and Z; background radiation (sources: radon, cosmic, food, medical); half-life t½ — time for half the undecayed nuclei to decay; reading half-life from a count-rate vs time graph; uses (medical tracers, smoke alarms, dating, sterilising); safety precautions (shielding, distance, time)." },
    ],
  },
  {
    code: "P6", name: "Space physics",
    topics: [
      { code: "P6.1", title: "Earth and the Solar System", learningOutcomes: "The Earth orbits the Sun once a year; the Moon orbits the Earth; rotation gives day/night (≈ 24 h); axial tilt gives seasons; Solar System consists of one star (the Sun), 8 planets, dwarf planets, moons, asteroids and comets; order of planets from the Sun; gravity holds the Solar System together; objects further from the Sun have longer orbital periods and lower orbital speeds." },
      { code: "P6.2", title: "Stars and the Universe", learningOutcomes: "The Sun as an average star — produces energy by nuclear fusion of hydrogen → helium; life cycle of a star (nebula → protostar → main sequence → red giant → white dwarf for low mass / supernova → neutron star or black hole for high mass); galaxies as collections of billions of stars (the Milky Way contains our Sun); the Universe contains billions of galaxies; light-year as a unit of distance; redshift and the expansion of the Universe; the Big Bang theory." },
    ],
  },
];

/**
 * Seed Cambridge IGCSE Physics 0625 (Extended) topic tree if it isn't there
 * yet. Subject-scoped: only inserts when zero Physics rows exist.
 */
export async function seedIgcsePhysicsTopicsIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };

  // Make absolutely sure the column accepts 'physics' before we try to insert.
  const ok = await ensureIgcsePhysicsSubject();
  if (!ok) {
    console.error("[IGCSE] Cannot seed Physics topics — subject enum widening failed.");
    return { seeded: 0 };
  }

  try {
    const existing = await db.execute(sql`SELECT COUNT(*) AS c FROM igcse_topics WHERE subject='physics'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const count = Number(list?.[0]?.c ?? 0);
    if (count > 0) return { seeded: 0 };

    // Math topics already use sortOrder 0..N. We offset Physics by 1000 to
    // keep them grouped below Math in any global sort (the UI groups by
    // subject anyway, but this keeps things tidy).
    let order = 1000;
    const rows: any[] = [];
    for (const area of AREAS) {
      for (const t of area.topics) {
        rows.push({
          subject: "physics",
          syllabus: "CIE_0625",
          tier: t.tier ?? "extended",
          areaCode: area.code,
          areaName: area.name,
          code: t.code,
          title: t.title,
          learningOutcomes: t.learningOutcomes,
          sortOrder: order++,
        });
      }
    }
    if (rows.length === 0) return { seeded: 0 };
    await db.insert(igcseTopics).values(rows);
    console.log(`[IGCSE] Seeded ${rows.length} Physics topics for CIE 0625 (Extended).`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Physics topic seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
