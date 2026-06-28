/**
 * Cambridge IGCSE Chemistry 0620 — Extended-tier topic tree.
 *
 * Authored from Cambridge's published syllabus topics 1–12. Seeded once into
 * `igcse_topics` on startup (idempotent: only inserts if no Chemistry rows
 * exist yet). The `learningOutcomes` field is what the AI Teacher uses as
 * grounding when teaching a topic.
 *
 * Topic `code` is prefixed with "Ch" (e.g. "Ch3.4") to avoid colliding with
 * Math's "3.4", Physics' "P3.4", Economics' "E3.4", or Business' "B3.4".
 * Area codes are "Ch1".."Ch11".
 */
import { getDb, ensureIgcseChemistrySubject } from "./db";
import { igcseTopics } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Seed = { code: string; title: string; learningOutcomes: string };
type Area = { code: string; name: string; topics: Seed[] };

const AREAS: Area[] = [
  {
    code: "Ch1", name: "States of matter",
    topics: [
      { code: "Ch1.1", title: "Solids, liquids and gases",
        learningOutcomes: "Particle model of matter. Properties of the three states (shape, volume, compressibility, fluidity) and how they arise from the arrangement, separation and motion of particles. Solids: particles closely packed in a regular lattice, vibrate in fixed positions, high attractive forces. Liquids: particles close but not in fixed positions, can flow. Gases: particles far apart, fast random motion, very weak attractive forces, fill the container." },
      { code: "Ch1.2", title: "Changes of state",
        learningOutcomes: "Names of the changes of state: melting (solid→liquid), freezing (liquid→solid), boiling/evaporating (liquid→gas), condensing (gas→liquid), subliming (solid→gas directly). Heating curves: temperature is constant during a change of state because energy is breaking attractions, not raising kinetic energy. Differences between evaporation (surface, at any temperature below boiling point) and boiling (throughout, at the boiling point)." },
      { code: "Ch1.3", title: "Diffusion",
        learningOutcomes: "Diffusion = the spreading of one substance through another due to the random motion of particles, from a region of high concentration to a region of low concentration. Faster in gases than in liquids; faster at higher temperatures (particles move faster); slower for heavier particles. Demonstrations: ammonia + hydrogen chloride meeting in a glass tube → white ring of NH₄Cl forms closer to the HCl end (NH₃ diffuses faster because lighter)." },
    ],
  },
  {
    code: "Ch2", name: "Atoms, elements and compounds",
    topics: [
      { code: "Ch2.1", title: "Atomic structure and the Periodic Table",
        learningOutcomes: "Atom = a nucleus (protons + neutrons) surrounded by electrons in shells. Proton (p+, mass 1, relative charge +1), neutron (n, mass 1, charge 0), electron (e-, mass ≈ 1/1840, charge −1). Proton number / atomic number Z (defines the element). Nucleon number / mass number A. Notation ⁴⁰₂₀Ca. Number of neutrons = A − Z. Periodic table layout: groups = vertical (same valence electrons); periods = horizontal (same number of electron shells)." },
      { code: "Ch2.2", title: "Isotopes",
        learningOutcomes: "Isotopes = atoms of the same element (same Z) with different numbers of neutrons (different A). Examples: ¹²₆C and ¹⁴₆C; ³⁵₁₇Cl and ³⁷₁₇Cl. Same chemistry (same electron configuration) but different physical properties (mass, radioactivity)." },
      { code: "Ch2.3", title: "Electron arrangement",
        learningOutcomes: "Electrons occupy shells (energy levels) around the nucleus. Maximum capacity: shell 1 holds 2; shell 2 holds 8; shell 3 holds 8 (for the first 20 elements). Notation: e.g. Mg (12 e⁻) → 2,8,2. The number of outer-shell electrons determines the group (Group I → 1 outer e⁻; Group VII → 7 outer e⁻; Group 0 → full outer shell, 2 or 8). Number of shells = period number." },
      { code: "Ch2.4", title: "Ions and ionic bonding",
        learningOutcomes: "Metal atoms LOSE outer electrons → form positive ions (cations) with the noble-gas configuration. Non-metals GAIN electrons → form negative ions (anions). Ionic bond = strong electrostatic attraction between oppositely charged ions in a giant lattice. Dot-and-cross diagrams (e.g. NaCl, MgO, MgCl₂, CaO). Properties of ionic compounds: high melting + boiling points (strong forces in lattice), conduct electricity when MOLTEN or IN AQUEOUS SOLUTION (ions free to move) but not when solid (ions fixed), brittle, often soluble in water." },
      { code: "Ch2.5", title: "Covalent bonding",
        learningOutcomes: "Covalent bond = shared pair of electrons between two atoms, both attaining a noble-gas configuration. Dot-and-cross diagrams for: H₂, Cl₂, HCl, H₂O, NH₃, CH₄, CO₂, O₂ (double bond), N₂ (triple bond). Simple molecular structures (e.g. H₂O, CO₂, CH₄): low melting + boiling points (weak intermolecular forces — easy to overcome — but strong covalent bonds within the molecule), poor conductors, often insoluble in water." },
      { code: "Ch2.6", title: "Giant covalent structures",
        learningOutcomes: "Diamond — each C bonded to 4 others tetrahedrally → very hard, extremely high mp, doesn't conduct. Graphite — each C bonded to 3 others in flat hexagonal layers → soft + slippery (layers slide), conducts electricity (delocalised electrons between layers). Silicon dioxide (SiO₂, quartz) — similar to diamond, hard + high mp. How structure explains properties." },
      { code: "Ch2.7", title: "Metallic bonding",
        learningOutcomes: "Metallic bond = positive metal ions in a lattice held together by a 'sea' of delocalised valence electrons. Explains: high mp + bp (strong electrostatic attraction), good electrical conductivity (delocalised electrons carry charge), thermal conductivity, malleability + ductility (layers can slide while bonds reform)." },
    ],
  },
  {
    code: "Ch3", name: "Stoichiometry",
    topics: [
      { code: "Ch3.1", title: "Formulae of compounds",
        learningOutcomes: "Using ion charges to deduce formulas (e.g. Al³⁺ + O²⁻ → Al₂O₃ — cross over the charges; check overall charge = 0). Common cations: Na⁺, K⁺, Mg²⁺, Ca²⁺, Al³⁺, Zn²⁺, Fe²⁺/Fe³⁺, Cu²⁺, NH₄⁺. Common anions: Cl⁻, Br⁻, OH⁻, NO₃⁻, SO₄²⁻, CO₃²⁻, O²⁻. State symbols (s) solid, (l) liquid, (g) gas, (aq) aqueous solution." },
      { code: "Ch3.2", title: "Balancing chemical equations",
        learningOutcomes: "A balanced equation has the SAME number of atoms of each element on both sides. Adjust ONLY the coefficients (numbers in front), NEVER the subscripts in formulas. Method: list elements; count atoms on each side; balance one element at a time; check overall charge balances too. Add state symbols. Worked examples: 2H₂(g) + O₂(g) → 2H₂O(l); CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l); 2Al + 3CuSO₄ → Al₂(SO₄)₃ + 3Cu." },
      { code: "Ch3.3", title: "The mole and Avogadro's constant",
        learningOutcomes: "The mole = the amount of substance containing 6.02 × 10²³ particles (Avogadro's constant N_A). Relative atomic mass A_r (from periodic table). Relative formula mass M_r = sum of A_r for all atoms in the formula. Calculations: number of moles n = mass / M_r (n = m/M). Worked example: 18 g of H₂O is 18 / 18 = 1 mol; 44 g of CO₂ is 1 mol." },
      { code: "Ch3.4", title: "Mole calculations — mass, gas volume, solution concentration",
        learningOutcomes: "For gases at room temperature and pressure (rtp, ≈ 24 dm³ per mole): n = V/24. So 48 dm³ of any gas at rtp = 2 mol. For solutions: c = n/V where c is in mol/dm³ and V is in dm³. So 0.5 mol of NaCl in 250 cm³ (= 0.25 dm³) has c = 0.5/0.25 = 2 mol/dm³. Stoichiometric calculations: use the balanced equation to find moles of product from moles of reactant." },
      { code: "Ch3.5", title: "Percentage yield and percentage purity",
        learningOutcomes: "% yield = (actual mass obtained / theoretical mass) × 100. Why yields are less than 100%: incomplete reactions, reactants in equilibrium, side reactions, losses during transfer or filtration. % purity = (mass of pure compound / mass of impure sample) × 100. Limiting reactant: the one that runs out first; the other is in excess." },
      { code: "Ch3.6", title: "Empirical and molecular formulae",
        learningOutcomes: "Empirical formula = the simplest whole-number ratio of atoms in a compound (e.g. CH for ethyne). Molecular formula = the actual numbers of each atom (e.g. C₂H₂). Calculating empirical formula from % composition: divide each % by its A_r → get moles; divide all by the smallest → simplest ratio. To find molecular from empirical: M_r(molecular) / M_r(empirical) = integer multiplier." },
    ],
  },
  {
    code: "Ch4", name: "Electrochemistry",
    topics: [
      { code: "Ch4.1", title: "Electrolysis basics",
        learningOutcomes: "Electrolysis = the breakdown of an ionic compound (electrolyte) when MOLTEN or in AQUEOUS SOLUTION, using electricity. Cathode = negative electrode → attracts cations (positive ions) → cations gain electrons (reduction). Anode = positive electrode → attracts anions (negative ions) → anions lose electrons (oxidation). Half-equations show what happens at each electrode. Electrolyte must contain free-moving ions." },
      { code: "Ch4.2", title: "Electrolysis of molten vs aqueous compounds",
        learningOutcomes: "MOLTEN compounds: only the metal cation + the non-metal anion present → metal forms at cathode, non-metal at anode. E.g. molten PbBr₂ → Pb(l) at cathode, Br₂(g) at anode. AQUEOUS solutions: water also provides H⁺ and OH⁻ ions. At cathode: less reactive metal (Cu, Ag, Au) is preferred; otherwise H₂ is produced. At anode: halide ions (Cl⁻, Br⁻, I⁻) preferred over OH⁻ if concentrated; otherwise O₂ from OH⁻. Example: dilute aq NaCl → H₂ at cathode + O₂ at anode (water electrolysed). Concentrated aq NaCl (brine) → H₂ at cathode + Cl₂ at anode." },
      { code: "Ch4.3", title: "Industrial electrolysis",
        learningOutcomes: "Aluminium extraction from purified Al₂O₃ (alumina) dissolved in molten cryolite (to lower mp). Cathode: Al³⁺ + 3e⁻ → Al(l) at the bottom; Anode (carbon): 2O²⁻ → O₂ + 4e⁻ — burns away with the hot anode (needs replacing). High energy use → factories sited near cheap hydroelectric power. Brine electrolysis → Cl₂ (bleach, PVC), H₂ (fuel, hydrogenation), NaOH (paper, soap). Electroplating: coating an object with a thin layer of metal for protection or appearance (e.g. plating with zinc, silver). The object = cathode; the plating metal = anode + the electrolyte = a solution of that metal's ions." },
      { code: "Ch4.4", title: "Hydrogen–oxygen fuel cells",
        learningOutcomes: "A fuel cell combines H₂ and O₂ to produce electricity directly + water as the only product. Cathode reaction: O₂ + 2H₂O + 4e⁻ → 4OH⁻ (in alkaline cell). Anode: 2H₂ + 4OH⁻ → 4H₂O + 4e⁻. Overall: 2H₂ + O₂ → 2H₂O. Advantages: efficient, water is only product → clean, no recharging needed (just refill fuel). Disadvantages: hydrogen storage difficult + dangerous, currently expensive to produce H₂ cleanly." },
    ],
  },
  {
    code: "Ch5", name: "Chemical energetics",
    topics: [
      { code: "Ch5.1", title: "Exothermic and endothermic reactions",
        learningOutcomes: "Exothermic: releases energy to the surroundings → surroundings get warmer; ΔH is negative. Examples: combustion, neutralisation, most displacement reactions, respiration. Endothermic: absorbs energy from the surroundings → surroundings get cooler; ΔH is positive. Examples: thermal decomposition (e.g. CaCO₃ → CaO + CO₂), photosynthesis, dissolving ammonium nitrate." },
      { code: "Ch5.2", title: "Energy profile diagrams and activation energy",
        learningOutcomes: "Energy-level diagram: reactants → transition state → products. Activation energy E_a = energy needed to break the initial bonds + start the reaction. For exothermic: products lower than reactants; ΔH = products − reactants (negative). For endothermic: products higher than reactants; ΔH positive. A catalyst lowers E_a but does NOT change ΔH." },
      { code: "Ch5.3", title: "Bond energies and reaction enthalpy",
        learningOutcomes: "Bond breaking is endothermic (absorbs energy). Bond making is exothermic (releases energy). ΔH = energy to break bonds in reactants − energy released making bonds in products. If MORE energy is released than absorbed → exothermic (negative ΔH). Use a table of bond energies (kJ/mol) to calculate ΔH. Worked example: H₂ + Cl₂ → 2HCl, with H–H = 436, Cl–Cl = 242, H–Cl = 431 → ΔH = (436 + 242) − 2(431) = 678 − 862 = −184 kJ/mol (exothermic)." },
    ],
  },
  {
    code: "Ch6", name: "Chemical reactions",
    topics: [
      { code: "Ch6.1", title: "Physical vs chemical changes",
        learningOutcomes: "Physical change: no new substance formed, usually reversible (melting, dissolving, evaporating, mixing). Chemical change: new substance(s) formed, often hard to reverse (combustion, rusting, photosynthesis, cooking). Signs of chemical change: colour change, gas evolved, precipitate formed, temperature change, light produced." },
      { code: "Ch6.2", title: "Rate of reaction",
        learningOutcomes: "Rate of reaction = change in amount of reactant or product per unit time. Factors that increase the rate: HIGHER CONCENTRATION (more particles per volume → more frequent collisions), HIGHER TEMPERATURE (particles move faster + more have ≥ activation energy → more successful collisions), SMALLER PARTICLES (powdered solid vs lump → greater surface area → more collision sites), CATALYST (lowers E_a → more collisions are successful at the same temperature, catalyst is not used up). Collision theory explains all of these." },
      { code: "Ch6.3", title: "Reversible reactions and dynamic equilibrium",
        learningOutcomes: "Some reactions go to completion (one-way ⟶); others are reversible (⇌) — the products can react to form the reactants. In a CLOSED system, a reversible reaction reaches DYNAMIC EQUILIBRIUM: forward + backward rates are equal; the concentrations of reactants and products are constant (but both reactions are still occurring). Le Chatelier's principle (qualitative — Cambridge IGCSE 0620): if temperature, pressure, or concentration is changed, the equilibrium shifts to OPPOSE the change. Industrial example: the Haber process N₂ + 3H₂ ⇌ 2NH₃, conditions chosen (~450 °C, ~200 atm, Fe catalyst) for a compromise of rate vs yield." },
      { code: "Ch6.4", title: "Redox reactions",
        learningOutcomes: "REDOX = REDuction + OXidation, always occur together. Three definitions (Cambridge will accept any): oxidation = GAIN of oxygen / LOSS of hydrogen / LOSS of electrons. Reduction = LOSS of oxygen / GAIN of hydrogen / GAIN of electrons (Remember: OIL RIG — Oxidation Is Loss, Reduction Is Gain of electrons). Oxidising agent = the species that DOES the oxidising (= itself reduced). Reducing agent = does the reducing (= itself oxidised). Identifying redox using oxidation numbers (state). Examples: 2Mg + O₂ → 2MgO (Mg oxidised, O reduced); Zn + CuSO₄ → ZnSO₄ + Cu (Zn oxidised, Cu²⁺ reduced)." },
    ],
  },
  {
    code: "Ch7", name: "Acids, bases and salts",
    topics: [
      { code: "Ch7.1", title: "Acids and bases",
        learningOutcomes: "Acid = a compound that releases H⁺ ions in aqueous solution; pH < 7. Examples: HCl, H₂SO₄, HNO₃, CH₃COOH (ethanoic). Base = compound that reacts with an acid to form a salt + water (most are metal oxides or hydroxides). Alkali = a soluble base; pH > 7. Examples: NaOH, KOH, NH₃ (aq). pH scale 0–14: 7 = neutral; below 7 acidic (stronger as it falls); above 7 alkaline. Indicators: litmus (red ↔ blue), universal indicator (colour spectrum across pH), methyl orange, phenolphthalein. Strong acid = fully dissociates in water (HCl, H₂SO₄); weak acid = partially (CH₃COOH)." },
      { code: "Ch7.2", title: "Reactions of acids",
        learningOutcomes: "ACID + REACTIVE METAL → salt + hydrogen (test: squeaky pop with lit splint). E.g. Mg + 2HCl → MgCl₂ + H₂. ACID + BASE (metal oxide/hydroxide) → salt + water (neutralisation). E.g. 2HCl + CuO → CuCl₂ + H₂O. ACID + CARBONATE → salt + water + CO₂ (test: bubble through limewater → turns milky). E.g. 2HCl + CaCO₃ → CaCl₂ + H₂O + CO₂. Ionic equation for neutralisation: H⁺(aq) + OH⁻(aq) → H₂O(l)." },
      { code: "Ch7.3", title: "Preparation of salts",
        learningOutcomes: "SOLUBLE salts (e.g. CuSO₄ from CuO + H₂SO₄): add insoluble base in excess to warm acid → filter off excess → evaporate filtrate to crystallise. For SOLUBLE salt from soluble base (e.g. NaCl from NaOH + HCl): titration (no excess possible since both soluble); evaporate to dryness. INSOLUBLE salts (e.g. BaSO₄ from BaCl₂ + Na₂SO₄): precipitation reaction; filter, wash, dry the precipitate. Solubility rules to memorise: all Na⁺, K⁺, NH₄⁺ salts soluble; all nitrates soluble; most chlorides soluble (except AgCl, PbCl₂); most sulfates soluble (except BaSO₄, PbSO₄, CaSO₄); most carbonates + hydroxides insoluble (except Group I + NH₄⁺)." },
      { code: "Ch7.4", title: "Identification of ions and gases",
        learningOutcomes: "Cation tests: flame tests (Li⁺ red, Na⁺ yellow, K⁺ lilac, Ca²⁺ orange-red, Cu²⁺ blue-green). Aqueous NaOH test: gives different coloured precipitates — Cu²⁺ blue, Fe²⁺ green, Fe³⁺ red-brown, Al³⁺ white (dissolves in excess), Ca²⁺ white (insoluble in excess), Zn²⁺ white (dissolves in excess). NH₄⁺ + NaOH + warm → NH₃ gas (turns damp red litmus blue). Anion tests: carbonate + acid → CO₂ (limewater milky); chloride + AgNO₃ → white ppt; sulfate + BaCl₂ → white ppt; nitrate + NaOH + Al + warm → NH₃. Gas tests: O₂ relights glowing splint; H₂ squeaky pop with lit splint; CO₂ limewater milky; NH₃ turns red litmus blue; Cl₂ bleaches damp litmus paper." },
    ],
  },
  {
    code: "Ch8", name: "The Periodic Table",
    topics: [
      { code: "Ch8.1", title: "Periodic table arrangement and trends",
        learningOutcomes: "Elements arranged by increasing atomic (proton) number. Group = vertical column = same number of outer-shell electrons = similar chemistry. Period = horizontal row = same number of electron shells. Metals on the left + middle (most elements). Non-metals on the right. Metalloids along the diagonal staircase (Si, Ge, As…). General trends: metallic character decreases across a period; melting points peak in the middle of a period; reactivity of metals increases DOWN a group, reactivity of non-metals decreases DOWN a group." },
      { code: "Ch8.2", title: "Group I — the alkali metals",
        learningOutcomes: "Li, Na, K, Rb, Cs, Fr. Soft (cut with a knife), low density (Li, Na, K float on water), shiny when freshly cut but tarnish quickly. Low melting points (decrease down the group). All have 1 outer electron → lose easily → all react vigorously with water: 2Na + 2H₂O → 2NaOH + H₂; produce alkaline solutions (NaOH, KOH). Reactivity INCREASES down the group: lithium fizzes, sodium melts into a ball + zooms, potassium ignites the H₂ + lilac flame. Reason: the outer electron is further from the nucleus and more shielded → easier to lose." },
      { code: "Ch8.3", title: "Group VII — the halogens",
        learningOutcomes: "F₂ (pale yellow gas), Cl₂ (green-yellow gas), Br₂ (red-brown liquid), I₂ (grey-black solid → purple vapour). Become darker + denser down the group; melting + boiling points increase. All diatomic. All have 7 outer electrons → gain one easily → form −1 ions (X⁻). Reactivity DECREASES down the group (because gaining an electron is easier when the outer shell is closer to the nucleus). DISPLACEMENT: a more reactive halogen displaces a less reactive halide ion from solution. E.g. Cl₂ + 2KBr → 2KCl + Br₂ (Cl displaces Br). Used to identify which halogen is more reactive." },
      { code: "Ch8.4", title: "Group VIII — the noble gases",
        learningOutcomes: "He, Ne, Ar, Kr, Xe, Rn. All gases at room temperature; monoatomic. Outer shells are FULL (He = 2, others = 8) → very unreactive (inert). Uses: He in balloons + airships (low density, non-flammable, safer than H₂); Ne in fluorescent lighting + advertising signs; Ar inert atmosphere in tungsten light bulbs + welding (prevents oxidation)." },
      { code: "Ch8.5", title: "Transition elements",
        learningOutcomes: "The middle block of the periodic table (Sc → Zn in period 4). Properties: high density, high melting points, often hard + strong, form COLOURED compounds (Cu²⁺ blue, Fe²⁺ pale green, Fe³⁺ yellow/orange-brown), often show MORE THAN ONE oxidation state (Fe²⁺/Fe³⁺, Cu⁺/Cu²⁺), often act as CATALYSTS (Fe in Haber process, Ni in margarine production, V₂O₅ in contact process). Contrast with Group I metals which are soft, low mp, only +1 oxidation state, white/colourless compounds." },
    ],
  },
  {
    code: "Ch9", name: "Metals",
    topics: [
      { code: "Ch9.1", title: "Properties of metals and the reactivity series",
        learningOutcomes: "General metal properties: shiny when polished, malleable, ductile, sonorous, conduct heat + electricity, high mp + bp, react with acids to give H₂ (if more reactive than H). REACTIVITY SERIES (memorise top to bottom): K, Na, Ca, Mg, Al, (C), Zn, Fe, (H), Cu, Ag, Au. Reactions with water (cold water → fizzes if very reactive: K → Na violent → Ca steady; warm water → Mg slowly); with steam (Mg, Al, Zn, Fe react → metal oxide + H₂); with dilute acid (K-Pb react, more reactive metal = more vigorous). Displacement: more reactive metal displaces less reactive from its salt solution (Zn + CuSO₄ → ZnSO₄ + Cu)." },
      { code: "Ch9.2", title: "Extraction of metals",
        learningOutcomes: "Method depends on the metal's reactivity. UNREACTIVE metals (Cu, Ag, Au) often found as the metal itself (native). MODERATELY reactive metals (Zn, Fe, Pb) extracted by REDUCTION with carbon in a furnace (e.g. iron in blast furnace: Fe₂O₃ + 3CO → 2Fe + 3CO₂). Iron extraction inputs (iron ore haematite Fe₂O₃, coke C, limestone CaCO₃, hot air); outputs (molten Fe at the bottom, slag CaSiO₃ floats on top, CO₂ + waste gases out). MOST REACTIVE metals (K, Na, Ca, Mg, Al) cannot be reduced by carbon → extracted by ELECTROLYSIS of the molten compound (Al from Al₂O₃ in molten cryolite)." },
      { code: "Ch9.3", title: "Rusting and corrosion prevention",
        learningOutcomes: "Rust = hydrated iron(III) oxide. Conditions for rusting: BOTH water AND oxygen present. Demonstrated with three test tubes: nail in water + air (rusts), nail in boiled water + oil layer (no air → no rust), nail in dry air + anhydrous CaCl₂ (no water → no rust). Prevention methods: BARRIER (paint, oil, grease, plastic coating, plating with another metal); SACRIFICIAL PROTECTION (attach a more-reactive metal like Zn or Mg that corrodes preferentially — used on ships, bridges, underground pipes); GALVANISING = coating iron with zinc (combines barrier + sacrificial)." },
      { code: "Ch9.4", title: "Alloys",
        learningOutcomes: "Alloy = a mixture of a metal with one or more other elements (usually another metal). Why alloys are stronger than pure metals: different-sized atoms disrupt the regular layers → layers can't slide over each other as easily. Examples: BRASS (Cu + Zn — taps, decorative items); BRONZE (Cu + Sn — statues, ship propellers, harder than copper); STEEL (Fe + small % C; mild steel for car bodies; stainless steel includes Cr + Ni for cutlery); SOLDER (Sn + Pb low mp for joining electronics). Alloys can be designed for specific properties: hardness, corrosion resistance, low expansion, low density, magnetic, etc." },
    ],
  },
  {
    code: "Ch10", name: "Chemistry of the environment",
    topics: [
      { code: "Ch10.1", title: "Water — testing and treatment",
        learningOutcomes: "Test for water: turns anhydrous copper(II) sulfate from white to blue, OR turns anhydrous cobalt(II) chloride paper from blue to pink. Test for PURE water: boils at exactly 100 °C / freezes at exactly 0 °C (impurities raise bp / lower fp). Water treatment for drinking: sedimentation + filtration (remove solids) → chlorination (kill bacteria). Sources of water pollution: agriculture (fertiliser runoff causes algal blooms + eutrophication), industry (heavy metals), sewage." },
      { code: "Ch10.2", title: "Air composition and pollution",
        learningOutcomes: "Air = approximately 78% N₂, 21% O₂, 1% other (Ar 0.93%, CO₂ ~0.04%, water vapour, traces). POLLUTANTS: carbon monoxide CO (from incomplete combustion of fuels in vehicles — toxic, binds to haemoglobin, prevents O₂ transport); sulfur dioxide SO₂ (burning fossil fuels with sulfur impurities — causes acid rain SO₂ + H₂O → H₂SO₃); nitrogen oxides NO/NO₂ (from car engines at high temperatures — acid rain, smog); particulates / soot (lung damage); methane CH₄ from agriculture + landfill (greenhouse gas). Catalytic converters in cars reduce CO + NOₓ + unburnt HC." },
      { code: "Ch10.3", title: "Greenhouse effect and climate change",
        learningOutcomes: "Greenhouse effect mechanism: short-wavelength solar radiation passes through the atmosphere, heats the Earth's surface; the Earth re-emits longer-wavelength infrared radiation; greenhouse gases (CO₂, CH₄, water vapour) absorb the infrared → trap heat in the atmosphere → keep the planet warm. ENHANCED greenhouse effect: human activity (burning fossil fuels, deforestation, animal farming) raises greenhouse-gas concentrations → more heat trapped → global warming + climate change. Consequences: rising sea levels (ice caps melt + thermal expansion), more extreme weather, ecosystem disruption. Mitigation: renewable energy, energy efficiency, reforestation, electric vehicles." },
      { code: "Ch10.4", title: "Fertilisers and the nitrogen cycle",
        learningOutcomes: "Plants need NPK (nitrogen, phosphorus, potassium) for growth. Synthetic fertilisers provide these. Nitrogen fertilisers contain compounds of nitrogen — ammonium nitrate NH₄NO₃, ammonium sulfate (NH₄)₂SO₄, urea CO(NH₂)₂. NH₃ for ammonium fertilisers is made via the Haber process. Overuse problems: nitrate runoff into rivers → eutrophication (algal blooms → algae die → bacteria use up oxygen decomposing them → fish + aquatic life suffocate). Sustainable use: only apply what plants need, time application carefully, use organic alternatives." },
    ],
  },
  {
    code: "Ch11", name: "Organic chemistry",
    topics: [
      { code: "Ch11.1", title: "Fuels and crude oil",
        learningOutcomes: "Hydrocarbons = compounds of carbon + hydrogen only. Crude oil = a mixture of hydrocarbons formed from ancient marine organisms. FRACTIONAL DISTILLATION separates the mixture using the difference in boiling points: smaller (shorter chain) hydrocarbons have lower bp + come off at the TOP (refinery gas, gasoline/petrol, naphtha, kerosene/paraffin); larger (longer chain) at the BOTTOM (diesel, fuel oil, lubricating oil, bitumen). Properties down the column: bp increases, viscosity increases (thicker), flammability decreases. Uses of fractions: refinery gas → bottled gas/heating; petrol → cars; kerosene → jet fuel; diesel → trucks; fuel oil → ships + power; bitumen → roads." },
      { code: "Ch11.2", title: "Alkanes",
        learningOutcomes: "Saturated hydrocarbons — only single C–C bonds. General formula C_nH_{2n+2}. Examples: methane CH₄, ethane C₂H₆, propane C₃H₈, butane C₄H₁₀. Reactions: COMBUSTION (complete: + plenty of O₂ → CO₂ + H₂O; incomplete: limited O₂ → CO + H₂O or C soot + H₂O); SUBSTITUTION with halogens in UV light (e.g. CH₄ + Cl₂ → CH₃Cl + HCl). Why alkanes are relatively unreactive: all single bonds, fully saturated, no functional group." },
      { code: "Ch11.3", title: "Alkenes",
        learningOutcomes: "Unsaturated hydrocarbons — contain at least one C=C double bond. General formula C_nH_{2n}. Examples: ethene C₂H₄, propene C₃H₆. Made by CRACKING longer-chain alkanes (heat + catalyst): e.g. C₁₀H₂₂ → C₈H₁₈ + C₂H₄. The C=C makes alkenes much more reactive than alkanes — undergo ADDITION reactions: with bromine (decolourise orange bromine water → colourless — chemical test for unsaturation), with hydrogen (+ Ni catalyst → alkane, used to harden vegetable oils into margarine), with water/steam (+ H₃PO₄ catalyst → alcohol, industrial route to ethanol)." },
      { code: "Ch11.4", title: "Alcohols",
        learningOutcomes: "Functional group: −OH. General formula C_nH_{2n+1}OH. Examples: methanol CH₃OH, ethanol C₂H₅OH, propan-1-ol C₃H₇OH. Two ways to make ETHANOL: (1) HYDRATION of ethene + steam + H₃PO₄ catalyst at 300 °C, 60 atm (fast, continuous, but uses crude-oil-derived ethene); (2) FERMENTATION of glucose by yeast: C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂ (renewable sugar source, but slow + makes a dilute solution that must be distilled). Reactions of ethanol: COMBUSTION → CO₂ + H₂O (used as fuel — bioethanol). OXIDATION by acidified K₂Cr₂O₇ → ethanoic acid (turns orange → green)." },
      { code: "Ch11.5", title: "Carboxylic acids",
        learningOutcomes: "Functional group: −COOH. Examples: methanoic acid HCOOH, ethanoic (acetic) acid CH₃COOH (vinegar). Weak acids — partially ionise in water. Behave like all acids: turn blue litmus red; react with reactive metals → salt + H₂; with bases → salt + water; with carbonates → salt + water + CO₂. Made from oxidation of the corresponding alcohol (CH₃CH₂OH + [O] → CH₃COOH)." },
      { code: "Ch11.6", title: "Polymers",
        learningOutcomes: "Polymer = a very large molecule (macromolecule) made by joining many small molecules (monomers). ADDITION POLYMERISATION (from alkenes): the C=C opens up + many monomers link to form one long chain. n(CH₂=CH₂) → −(CH₂−CH₂)−ₙ (poly(ethene), aka polythene). Variants: poly(propene), poly(chloroethene) PVC, poly(tetrafluoroethene) PTFE. Properties + uses (polythene → plastic bags, bottles; PVC → pipes, window frames; PTFE → non-stick cookware). CONDENSATION POLYMERISATION: monomers combine + a small molecule (usually water) is eliminated each time. Examples: polyamides (nylon), polyesters (PET — fizzy drink bottles, fleece fabric). Environmental issues: non-biodegradable plastics persist in environment; recycling, biodegradable alternatives." },
    ],
  },
];

/**
 * Seed Cambridge IGCSE Chemistry 0620 (Extended) topic tree if it isn't there yet.
 * Subject-scoped: only inserts when zero Chemistry rows exist.
 */
export async function seedIgcseChemistryTopicsIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };

  // Make absolutely sure the column accepts 'chemistry' before we try to insert.
  const ok = await ensureIgcseChemistrySubject();
  if (!ok) {
    console.error("[IGCSE] Cannot seed Chemistry topics — subject enum widening failed.");
    return { seeded: 0 };
  }

  try {
    const existing = await db.execute(sql`SELECT COUNT(*) AS c FROM igcse_topics WHERE subject='chemistry'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const count = Number(list?.[0]?.c ?? 0);
    if (count > 0) return { seeded: 0 };

    // Math 0..N + Physics 1000..N + Economics 2000..N + Business 3000..N; Chemistry gets 4000 offset.
    let order = 4000;
    const rows: any[] = [];
    for (const area of AREAS) {
      for (const t of area.topics) {
        rows.push({
          subject: "chemistry",
          syllabus: "CIE_0620",
          tier: "extended" as const,
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
    console.log(`[IGCSE] Seeded ${rows.length} Chemistry topics for CIE 0620 (Extended).`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Chemistry topic seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
