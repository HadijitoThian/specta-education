/**
 * Cambridge IGCSE Chemistry 0620 (Extended) — curated exam-style exemplars.
 *
 * Authored content (NOT scraped past papers). Each exemplar pairs a question
 * with a Cambridge-style mark scheme using examiner conventions:
 *   M = method mark   A = accuracy/answer mark   B = independent mark
 *   FT = follow-through mark (carried-forward error allowed).
 *
 * Cambridge IGCSE Chemistry pays particular attention to:
 *   • STATE SYMBOLS in equations: (s), (l), (g), (aq) — losing these often loses a mark.
 *   • BALANCED equations (atoms and charges).
 *   • UNITS on calculated answers (g, mol, dm³, mol/dm³, %).
 *   • REASONING in terms of particles / electrons / collision theory.
 *
 * Target Paper-2 (Extended) distribution: ~20% quick, ~55% typical, ~25% longer.
 */
import { getDb } from "./db";
import { igcseExamples } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Ex = { topicCode: string; marks: number; question: string; markScheme: string; source?: string };

// All Chemistry topic codes are "Ch"-prefixed (e.g. "Ch3.4").
const EXAMPLES: Ex[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1–2 MARK quick questions: definitions, identifications, simple calculations.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "Ch2.2", marks: 2,
    question: "Define 'isotopes'.",
    markScheme: "1 mark: atoms of the **same element** (same proton/atomic number, same number of protons)\n1 mark: with **different numbers of neutrons** (different nucleon/mass number).\nFull-mark answer: 'Isotopes are atoms of the same element that have the same number of protons but different numbers of neutrons.'",
    source: "exam-style" },

  { topicCode: "Ch2.1", marks: 2,
    question: "An atom of magnesium has the symbol ²⁴₁₂Mg.\n(a) State the number of protons.\n(b) State the number of neutrons.",
    markScheme: "(a) Protons = atomic (proton) number Z = **12  (B1)**\n(b) Neutrons = A − Z = 24 − 12 = **12  (B1)**\nReminder: a neutral atom has the same number of electrons as protons.",
    source: "exam-style" },

  { topicCode: "Ch3.3", marks: 2,
    question: "Calculate the relative formula mass (M_r) of calcium carbonate, CaCO₃.\n(Use A_r values: Ca = 40, C = 12, O = 16.)",
    markScheme: "M_r = 40 + 12 + (3 × 16) **(M1)** for the correct setup\n= 40 + 12 + 48 = **100  (A1)**\nRelative formula mass has no units (it's a ratio).",
    source: "exam-style" },

  { topicCode: "Ch3.4", marks: 2,
    question: "Calculate the number of moles in 8.0 g of methane, CH₄.\n(A_r: C = 12, H = 1.)",
    markScheme: "M_r(CH₄) = 12 + 4(1) = 16 **(B1)**\nn = m / M = 8.0 / 16 = **0.50 mol  (A1)**\nUnits required for the answer mark.",
    source: "exam-style" },

  { topicCode: "Ch7.1", marks: 2,
    question: "Give the colour of universal indicator in:\n(a) a solution of pH 2\n(b) a solution of pH 11",
    markScheme: "(a) **Red  (B1)** (very acidic)\n(b) **Blue / dark blue  (B1)** (alkaline; deep blue at pH 11–13)\nAccept 'orange' for pH 4–5, 'green' at pH 7, 'purple' for pH 13–14.",
    source: "exam-style" },

  { topicCode: "Ch7.4", marks: 2,
    question: "Describe the chemical test for HYDROGEN gas and state the positive result.",
    markScheme: "1 mark: **insert a LIT splint** into the test tube of gas.\n1 mark: a **'squeaky pop'** sound is heard if hydrogen is present.\nWatch: 'glowing splint' is the test for oxygen (relights). Make sure the student doesn't mix the two up.",
    source: "exam-style" },

  { topicCode: "Ch11.3", marks: 2,
    question: "Describe a chemical test, including the positive result, that would distinguish an ALKANE from an ALKENE.",
    markScheme: "1 mark: add **bromine water** (orange/yellow-brown) to a sample of each.\n1 mark: the alkene **decolourises** (turns colourless) the bromine water; the alkane does NOT (remains orange).\nReason (bonus context): alkenes have a C=C double bond → undergo an addition reaction with Br₂; alkanes are saturated → no reaction in the dark.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3–4 MARK typical questions: explain WITH reasoning + balanced equations.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "Ch1.2", marks: 4,
    question: "Explain, in terms of the arrangement, separation and movement of PARTICLES, what happens when a solid is heated until it MELTS.",
    markScheme: "1 mark for each accurate point, max 4:\n• In the solid, particles are **closely packed in a regular lattice / fixed positions** and **vibrate** about those positions.\n• Heating the solid **gives the particles more (kinetic) energy** → they vibrate more strongly.\n• At the melting point, the particles have enough energy to **overcome (some of) the attractive forces** holding them in the lattice.\n• In the liquid, particles are still close together but **no longer in fixed positions** → they can **flow / slide past each other**.\nKey: temperature stays CONSTANT during melting because energy goes into breaking bonds, not raising kinetic energy.",
    source: "exam-style" },

  { topicCode: "Ch2.4", marks: 4,
    question: "Explain, in terms of electron transfer, the formation of MAGNESIUM CHLORIDE from magnesium and chlorine atoms.",
    markScheme: "1 mark: Mg has electron arrangement 2,8,**2** — needs to **lose 2 outer electrons** to attain a noble-gas configuration.\n1 mark: Each Cl has 2,8,**7** — needs to **gain 1 electron** to complete the outer shell.\n1 mark: ONE Mg atom transfers its 2 outer electrons → ONE Mg²⁺ ion, plus **TWO Cl atoms each gain 1 electron → TWO Cl⁻ ions**.\n1 mark: The opposite charges attract → **ionic bond / ionic lattice**, formula **MgCl₂**.\nKey ratio: charges balance (1 × +2 with 2 × −1).",
    source: "exam-style" },

  { topicCode: "Ch3.2", marks: 3,
    question: "Balance the following equation, including state symbols:\n  ___ Na(s) + ___ H₂O(l) → ___ NaOH(aq) + ___ H₂(g)",
    markScheme: "Balance H first → need 2H on left → coefficient of H₂O = 2 (gives 4H); then need 2 on Na side; rebalance H₂.\n**2Na(s) + 2H₂O(l) → 2NaOH(aq) + H₂(g)  (B3)**\nB1 for getting Na balanced; B1 for H balanced; B1 for state symbols all correct. State symbols dropped → max 2.",
    source: "exam-style" },

  { topicCode: "Ch3.4", marks: 4,
    question: "Calcium carbonate (CaCO₃) decomposes when heated:\n  CaCO₃(s) → CaO(s) + CO₂(g)\n\n25.0 g of CaCO₃ is completely decomposed. (A_r: C = 12, O = 16, Ca = 40.)\n(a) Calculate the moles of CaCO₃ decomposed.\n(b) Calculate the mass of CaO produced.\n(c) Calculate the volume of CO₂ gas produced, measured at room temperature and pressure (24 dm³/mol).",
    markScheme: "(a) M_r(CaCO₃) = 100; n = 25.0 / 100 = **0.25 mol  (M1, A1)**\n(b) From equation, 1 mol CaCO₃ → 1 mol CaO; M_r(CaO) = 40 + 16 = 56\n  mass = n × M_r = 0.25 × 56 = **14.0 g  (M1, A1)**\n(c) 1 mol CaCO₃ → 1 mol CO₂; V = n × 24 = 0.25 × 24 = **6.0 dm³  (A1, max 4 — accept any 4 correct steps)**\nUnits + sig figs required. FT applies.",
    source: "exam-style" },

  { topicCode: "Ch4.3", marks: 4,
    question: "An object is to be electroplated with COPPER using copper(II) sulfate solution.\n(a) State which electrode the object should be — anode or cathode.\n(b) State what the OTHER electrode should be made of.\n(c) Write the ionic half-equation for the reaction at the cathode.\n(d) Explain what happens to the copper(II) ions in the solution as electrolysis proceeds.",
    markScheme: "(a) **Cathode** (the negative electrode) **(B1)**\n(b) The other electrode (anode) = **pure copper / a copper bar  (B1)**\n(c) **Cu²⁺(aq) + 2e⁻ → Cu(s)  (B1)**\n(d) **Concentration of Cu²⁺ in solution stays constant** because copper from the anode dissolves into the solution (Cu(s) → Cu²⁺(aq) + 2e⁻) at the same rate as copper is deposited onto the cathode.  **(B1)**\nThe net effect: copper is transferred from the anode through the solution onto the cathode.",
    source: "exam-style" },

  { topicCode: "Ch5.1", marks: 4,
    question: "When dilute hydrochloric acid is added to magnesium ribbon in a test tube, the test tube becomes warmer.\n(a) State whether this reaction is exothermic or endothermic, and justify your answer.\n(b) Sketch the energy profile diagram for this reaction. Label the axes, activation energy E_a, and ΔH.",
    markScheme: "(a) **Exothermic  (B1)** — the test tube becoming warmer means heat is **transferred TO the surroundings** from the reaction (the reaction releases energy).  **(B1)**\n(b) Diagram (B2):\n  • Axes: y-axis 'Energy', x-axis 'Reaction progress / time'.\n  • Reactants at higher energy than products (downward step).\n  • Hump showing transition state.\n  • E_a labelled from reactants UP to the top of the hump.\n  • ΔH labelled from reactants DOWN to products (negative ΔH for exothermic).",
    source: "exam-style" },

  { topicCode: "Ch6.2", marks: 4,
    question: "Explain, in terms of particles and collision theory, why INCREASING the TEMPERATURE increases the rate of a chemical reaction.",
    markScheme: "1 mark per accurate point, max 4:\n• Higher temperature → particles have **more (kinetic) energy** → move **faster**.\n• Particles **collide more often** in a given time (frequency of collisions increases).\n• More importantly, **more collisions have energy ≥ activation energy** → a higher proportion of collisions are SUCCESSFUL.\n• Result: more particles react per unit time → **faster rate**.\nKey emphasis: the activation-energy point is the MAIN reason — collision frequency alone is a smaller effect.",
    source: "exam-style" },

  { topicCode: "Ch6.4", marks: 4,
    question: "Consider the reaction:  Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s)\n(a) State which element is OXIDISED and which is REDUCED.\n(b) Explain your answer in terms of ELECTRON transfer.",
    markScheme: "(a) **Zn is OXIDISED** (B1).  **Cu²⁺ is REDUCED** (B1).\n(b) Zn → Zn²⁺ + 2e⁻ — Zn **loses 2 electrons** → oxidation (OIL: Oxidation Is Loss) **(B1)**.\n  Cu²⁺ + 2e⁻ → Cu — Cu²⁺ **gains 2 electrons** → reduction (RIG: Reduction Is Gain) **(B1)**.\nThe sulfate ion SO₄²⁻ is a spectator ion — unchanged.",
    source: "exam-style" },

  { topicCode: "Ch7.2", marks: 4,
    question: "Write WORD and BALANCED SYMBOL EQUATIONS (with state symbols) for the reaction between dilute sulfuric acid and solid calcium carbonate.",
    markScheme: "**Word equation (1 mark):** sulfuric acid + calcium carbonate → calcium sulfate + water + carbon dioxide.\n**Balanced symbol equation (3 marks):**\n**H₂SO₄(aq) + CaCO₃(s) → CaSO₄(s) + H₂O(l) + CO₂(g)**\nM1: correct formulas\nM1: balanced\nA1: ALL state symbols correct\nNote: CaSO₄ is INSOLUBLE in water → (s). Without state symbols max 3.",
    source: "exam-style" },

  { topicCode: "Ch7.4", marks: 4,
    question: "A white solid X is dissolved in distilled water. When aqueous sodium hydroxide is added drop by drop, a white precipitate forms. The precipitate DISSOLVES when an EXCESS of sodium hydroxide is added.\n(a) Identify two possible cations present in X.\n(b) Describe how you could distinguish between them using a FLAME test.",
    markScheme: "(a) Two cations that give a white ppt with NaOH AND dissolve in excess: **Al³⁺ and Zn²⁺  (B1, B1)**.\n(b) Flame test — clean a nichrome/platinum wire with HCl, dip in the solid, hold in a blue Bunsen flame **(B1)**.\n  Al³⁺ gives **no characteristic colour** (essentially colourless flame); Zn²⁺ also typically gives no flame colour. **(B1 — for any valid distinguishing detail)**.\nAlternative distinction: a few drops of aqueous ammonia — Zn²⁺ ppt dissolves in EXCESS ammonia; Al³⁺ does NOT.",
    source: "exam-style" },

  { topicCode: "Ch8.3", marks: 4,
    question: "Explain why the reactivity of Group VII (halogens) DECREASES going down the group, in terms of atomic structure.",
    markScheme: "1 mark per accurate point, max 4:\n• Each halogen atom has **7 outer-shell electrons** → reacts by **gaining 1 electron** (becoming X⁻).\n• Going down the group, atoms have **more electron shells** → outer shell is **further from the nucleus**.\n• Inner shells provide **more shielding** of the nuclear attraction.\n• The incoming electron is held **less strongly** → harder to gain → less reactive.\nIn one line: bigger atom + more shielding → weaker attraction for the incoming electron → less reactive.",
    source: "exam-style" },

  { topicCode: "Ch9.2", marks: 4,
    question: "Iron is extracted from haematite (Fe₂O₃) in a blast furnace.\n(a) State the names of the THREE solid raw materials added at the top of the furnace.\n(b) Write the balanced equation for the reaction in which iron(III) oxide is reduced by carbon monoxide.",
    markScheme: "(a) **Iron ore (haematite / Fe₂O₃) · Coke (carbon, C) · Limestone (calcium carbonate, CaCO₃)  (B3 — 1 mark each)**.\n(b) **Fe₂O₃(s) + 3CO(g) → 2Fe(l) + 3CO₂(g)  (B1 — must be balanced; state symbols accepted but not required for this part)**.\nKey insight: iron is REDUCED (loses oxygen); CO is OXIDISED (gains oxygen → CO₂).",
    source: "exam-style" },

  { topicCode: "Ch9.3", marks: 4,
    question: "Explain how SACRIFICIAL PROTECTION prevents an iron pipeline from rusting. Refer to the reactivity series in your answer.",
    markScheme: "1 mark per point, max 4:\n• A **more reactive metal** (typically **zinc or magnesium**) is attached to the iron pipeline.\n• Because Mg/Zn are **higher in the reactivity series** than iron, they are **oxidised in preference to the iron** (they lose electrons more easily).\n• As long as the sacrificial metal is present, the iron itself does not react with oxygen + water → the pipeline does not rust.\n• The sacrificial metal is **gradually used up / corroded** → must be **replaced periodically**.\nVisual aid: think of the Mg/Zn block as 'taking the hit' for the iron.",
    source: "exam-style" },

  { topicCode: "Ch10.3", marks: 4,
    question: "Explain how an INCREASE in atmospheric CARBON DIOXIDE leads to global warming.",
    markScheme: "1 mark per accurate step in the chain, max 4:\n• The Sun emits **short-wavelength (UV + visible) radiation** which passes through the atmosphere + warms the Earth's surface.\n• The warm Earth re-emits **longer-wavelength infrared (heat) radiation**.\n• **CO₂ in the atmosphere ABSORBS this infrared radiation** (along with H₂O vapour, CH₄) and **re-emits some back towards the Earth's surface**.\n• Higher CO₂ → more infrared trapped → average surface temperature rises (= 'enhanced greenhouse effect' / global warming).\nKey: CO₂ is transparent to visible light but absorbs infrared — that asymmetry is the mechanism.",
    source: "exam-style" },

  { topicCode: "Ch11.1", marks: 4,
    question: "Crude oil is separated into useful fractions by fractional distillation.\n(a) State the principle by which the fractions are separated.\n(b) Explain why the bottom of the column is HOTTER than the top.\n(c) State whether refinery gas leaves the column at the TOP or the BOTTOM, and explain why.",
    markScheme: "(a) **Difference in boiling points** of the different-sized hydrocarbons.  **(B1)**\n(b) The crude oil is **vaporised at the bottom** of the column → the bottom must be **hot enough to keep larger hydrocarbons gaseous**; as vapours rise the column gets cooler.  **(B1)**\n(c) **At the TOP  (B1)** — refinery gas (small hydrocarbons, e.g. C₁–C₄) has **the lowest boiling points** → it remains a gas all the way up the column + leaves at the cool top.  **(B1)**\nGeneral rule: small chain → low bp → high in column; large chain → high bp → low in column.",
    source: "exam-style" },

  { topicCode: "Ch11.4", marks: 4,
    question: "Ethanol can be produced by FERMENTATION of glucose.\n(a) Write the balanced equation, including state symbols where appropriate.\n(b) State two conditions needed for fermentation.\n(c) Give one advantage of producing ethanol by fermentation rather than by hydration of ethene.",
    markScheme: "(a) **C₆H₁₂O₆(aq) → 2C₂H₅OH(aq) + 2CO₂(g)  (M1 formulas, A1 balanced + states)**\n(b) Any TWO of: **YEAST** (the enzyme source); **temperature 25–35 °C** (warm, optimum for yeast); **absence of oxygen / anaerobic conditions**; **aqueous (water) solution**.  **(B1, B1)**\n(c) Glucose is from **renewable sources** (sugar cane, corn) — fermentation does not depend on crude oil; OR fermentation can use lower-tech equipment + happens at room temperature (vs hydration's 300 °C + 60 atm + catalyst).  **(B1, max 4)**",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5+ MARK longer-response: multi-part calculations or full mechanisms.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "Ch3.4", marks: 6,
    question: "25.0 cm³ of 0.100 mol/dm³ hydrochloric acid is exactly neutralised by 20.0 cm³ of sodium hydroxide solution.\n  NaOH(aq) + HCl(aq) → NaCl(aq) + H₂O(l)\n\n(a) Calculate the moles of HCl used.\n(b) Calculate the moles of NaOH used.\n(c) Calculate the concentration of the NaOH solution in mol/dm³.\n(d) Calculate the concentration of the NaOH solution in g/dm³. (A_r: Na = 23, O = 16, H = 1.)",
    markScheme: "(a) V in dm³ = 25.0/1000 = 0.0250\n  n(HCl) = c × V = 0.100 × 0.0250 = **0.00250 mol  (M1, A1)**\n(b) From the 1:1 mole ratio of the balanced equation, n(NaOH) = n(HCl) = **0.00250 mol  (B1)**\n(c) V(NaOH) in dm³ = 20.0/1000 = 0.0200\n  c(NaOH) = n / V = 0.00250 / 0.0200 = **0.125 mol/dm³  (M1, A1)**\n(d) M_r(NaOH) = 23 + 16 + 1 = 40\n  c(NaOH) in g/dm³ = 0.125 × 40 = **5.00 g/dm³  (A1, max 6)**\nUnits required for the answer marks. FT applies to (b)–(d).",
    source: "exam-style" },

  { topicCode: "Ch5.3", marks: 5,
    question: "Hydrogen burns in chlorine according to:  H₂(g) + Cl₂(g) → 2HCl(g)\n\nUsing bond energies — H–H = 436 kJ/mol, Cl–Cl = 242 kJ/mol, H–Cl = 431 kJ/mol:\n(a) Calculate the total energy needed to break the bonds in the reactants.\n(b) Calculate the total energy released when the bonds in the products are made.\n(c) Calculate ΔH for the reaction and state whether it is exothermic or endothermic.",
    markScheme: "(a) Bonds broken: 1 × H–H + 1 × Cl–Cl = 436 + 242 = **+678 kJ/mol  (M1, A1)**\n(b) Bonds made: 2 × H–Cl = 2 × 431 = **−862 kJ/mol  (M1)** (energy released, sign negative).\n(c) ΔH = energy in − energy out = 678 − 862 = **−184 kJ/mol  (M1, A1)**\n  Negative ΔH → **EXOTHERMIC**.\nKey rule: bonds breaking REQUIRES energy (positive), bonds making RELEASES energy (negative). If 'out' > 'in' → exothermic.",
    source: "exam-style" },

  { topicCode: "Ch4.3", marks: 6,
    question: "Concentrated aqueous sodium chloride (brine) is electrolysed using inert electrodes.\n(a) Identify the gas produced at the cathode and write the half-equation.\n(b) Identify the gas produced at the anode and write the half-equation.\n(c) Identify the substance that REMAINS in the solution.\n(d) Give one major industrial use of EACH of the three products.",
    markScheme: "(a) **Hydrogen (H₂)** at cathode (B1). Half-equation: **2H⁺ + 2e⁻ → H₂** (B1).\n  (Even though Na⁺ is present, hydrogen is discharged preferentially because Na is more reactive than H.)\n(b) **Chlorine (Cl₂)** at anode (B1). Half-equation: **2Cl⁻ → Cl₂ + 2e⁻** (B1).\n  (Concentrated Cl⁻ is discharged in preference to OH⁻.)\n(c) **Sodium hydroxide (NaOH)** remains in solution (B1) — the Na⁺ and OH⁻ ions are not discharged.\n(d) Any one valid use for EACH of H₂, Cl₂, NaOH (B1, max 6):\n  • H₂ → fuel / making margarine / making ammonia (Haber process).\n  • Cl₂ → making bleach / sterilising drinking water + swimming pools / making PVC.\n  • NaOH → making soap / making paper / pH control in industry.",
    source: "exam-style" },

  { topicCode: "Ch6.3", marks: 6,
    question: "Ammonia is manufactured by the Haber process:\n  N₂(g) + 3H₂(g) ⇌ 2NH₃(g)    (forward reaction is exothermic)\n\n(a) State what is meant by 'dynamic equilibrium'.\n(b) Explain, using Le Chatelier's principle, the effect of INCREASING the pressure on the YIELD of ammonia.\n(c) Explain why the temperature used is a COMPROMISE around 450 °C, even though a lower temperature would give a higher yield.",
    markScheme: "(a) The **forward and backward reactions occur at the same rate** in a closed system; the concentrations of reactants and products **stay constant** (B1, B1).\n(b) On the LEFT there are 4 molecules of gas (1 N₂ + 3 H₂); on the RIGHT there are 2 (2 NH₃). Increasing the pressure shifts the equilibrium to the side with **FEWER GAS MOLECULES → the right** (B1) → **yield of NH₃ increases** (B1).\n(c) Lower temperature would shift the equilibrium right (since the forward reaction is exothermic) → higher yield (B1) — BUT lower temperature also gives a **slower rate** → the ammonia would be produced too slowly to be economic. 450 °C is a **compromise** between acceptable rate AND acceptable yield (B1).\n(Fe catalyst is also used to raise rate without affecting yield.)",
    source: "exam-style" },

  { topicCode: "Ch11.6", marks: 6,
    question: "Poly(ethene) is made from ethene monomers.\n(a) Define 'polymerisation'.\n(b) Write the equation for the formation of poly(ethene) from ethene, using both 'n' notation and showing the repeat unit.\n(c) Explain why poly(ethene) does NOT readily react with bromine water, even though it was made from a substance that does.\n(d) Suggest ONE environmental problem caused by plastic polymers like poly(ethene), AND ONE way of reducing that problem.",
    markScheme: "(a) Polymerisation = the **joining together of many small molecules (monomers)** to form a **very long-chain molecule (polymer)** (B1).\n(b) **n CH₂=CH₂ → −(CH₂−CH₂)−ₙ**  — repeat unit clearly drawn (B2).\n(c) During polymerisation the **C=C double bond OPENS UP / breaks** and joins to the next monomer → the polymer chain contains only **C–C single bonds** (B1). Bromine water tests for C=C → no C=C in poly(ethene) → no reaction (B1).\n(d) Problem: **non-biodegradable** → accumulates in landfill / pollutes oceans / harms wildlife (any one, B1).\n  Solution: recycling / using biodegradable alternatives / reducing single-use plastics / chemical recycling back to monomer (any one, max 6).",
    source: "exam-style" },

  { topicCode: "Ch7.3", marks: 6,
    question: "Describe how you would prepare a PURE, DRY sample of crystals of copper(II) sulfate (CuSO₄·5H₂O) from copper(II) oxide and dilute sulfuric acid.",
    markScheme: "L3 (5–6): All key steps in order with reasons; correct technique for a soluble salt from an insoluble base.\nL2 (3–4): Most steps present but missing detail (e.g. no reason for excess, or no crystallisation step).\nL1 (1–2): Outline only.\n\nKey steps to include:\n• Warm some dilute sulfuric acid in a beaker.\n• Add copper(II) oxide a little at a time, stirring, until **no more dissolves** (CuO is in EXCESS — ensures all the acid has reacted, leaving a pure solution).\n• Filter to remove the unreacted excess CuO.\n• Heat the filtrate (blue CuSO₄(aq)) until the solution is concentrated / saturated, then leave to **crystallise slowly** at room temperature.\n• Filter the crystals + wash with a small amount of cold distilled water + dry between filter papers / in a warm oven.\n\nL3 also justifies WHY excess insoluble base is used + WHY slow crystallisation gives larger purer crystals.",
    source: "exam-style" },

  { topicCode: "Ch3.6", marks: 5,
    question: "A compound contains 40.0% carbon, 6.7% hydrogen and 53.3% oxygen by mass.\n(a) Calculate its empirical formula. (A_r: C = 12, H = 1, O = 16.)\n(b) The compound has a relative molecular mass of 180. Calculate its molecular formula.",
    markScheme: "(a) Divide each % by its A_r → moles in 100 g of compound:\n  C: 40.0/12 = 3.33  ·  H: 6.7/1 = 6.70  ·  O: 53.3/16 = 3.33  **(M1)**\n  Divide all by the smallest (3.33):\n  C: 1  ·  H: 2  ·  O: 1  **(M1)**\n  **Empirical formula = CH₂O  (A1)**\n(b) M_r(empirical CH₂O) = 12 + 2 + 16 = 30.\n  Multiplier = 180 / 30 = **6  (M1)**\n  Molecular formula = (CH₂O) × 6 = **C₆H₁₂O₆  (A1, max 5)**\n(This is the formula of glucose — exam-classic example.)",
    source: "exam-style" },
];

/**
 * Per-question incremental seeder for Chemistry exemplars.
 * Mirrors the Physics/Math/Economics/Business seeders: dedup by (topicCode + question prefix).
 */
export async function seedIgcseChemistryExamplesIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };
  try {
    const existing = await db.execute(sql`SELECT topicCode, question FROM igcse_examples WHERE topicCode LIKE 'Ch%'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const dedupKey = (code: string, q: string) => `${code}::${q.slice(0, 120)}`;
    const present = new Set<string>(list.map((r: any) => dedupKey(String(r?.topicCode || ""), String(r?.question || ""))));

    const rows: any[] = [];
    let sortOrder = 4000;
    for (const e of EXAMPLES) {
      if (present.has(dedupKey(e.topicCode, e.question))) continue;
      rows.push({
        topicCode: e.topicCode,
        syllabus: "CIE_0620",
        tier: "extended" as const,
        marks: e.marks,
        question: e.question,
        markScheme: e.markScheme,
        source: e.source || "exam-style",
        sortOrder: sortOrder++,
      });
    }

    if (!rows.length) {
      console.log(`[IGCSE] Chemistry exemplars already complete (${list.length} rows in DB, ${EXAMPLES.length} in seed file).`);
      return { seeded: 0 };
    }
    await db.insert(igcseExamples).values(rows);
    console.log(`[IGCSE] Seeded ${rows.length} new Chemistry exemplars (total now ${list.length + rows.length}).`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Chemistry exemplar seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
