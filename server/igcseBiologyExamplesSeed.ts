/**
 * Cambridge IGCSE Biology 0610 (Extended) — curated exam-style exemplars.
 *
 * Authored content (NOT scraped past papers). Mark schemes follow Cambridge
 * Biology conventions: define accurately, identify specific features, explain
 * with cause→effect logic, compare with clear differences.
 *
 * Command words on Paper 2/4 (Extended):
 *   Define / State / Identify / Name → 1-2 marks each
 *   Describe → 2-4 marks (factual recall, no reasoning needed)
 *   Explain → 4-6 marks (state + apply reason — cause/effect)
 *   Compare → 4-6 marks (similarities AND differences with linkers)
 *   Suggest → 3-6 marks (apply biology to a new context)
 *   Discuss / Evaluate → 6-8 marks (advantages + disadvantages + conclusion)
 *
 * Content rules: kept age-appropriate. Topics involving sensitive content
 * (reproduction, STIs, drugs) are treated factually and clinically — Cambridge
 * teaches these in the same neutral, examiner-friendly style.
 *
 * Target distribution mirrors Paper 2/4: ~20% quick, ~50% typical, ~30% longer.
 */
import { getDb } from "./db";
import { igcseExamples } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Ex = { topicCode: string; marks: number; question: string; markScheme: string; source?: string };

// All Biology topic codes are "Bi"-prefixed (e.g. "Bi3.4") — see
// subjectOfTopicCode for the prefix-collision check (Bi before B).
const EXAMPLES: Ex[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1–2 MARK quick questions: definitions and identifications.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "Bi1.1", marks: 2,
    question: "Define respiration as a characteristic of living organisms.",
    markScheme: "1 mark: **chemical reactions in cells**\n1 mark: that **break down nutrient molecules to release energy** (for metabolism / for the body).\nFull-mark answer: \"Respiration is the chemical reactions in cells that break down nutrient molecules to release energy for life processes.\"\nCommon trap: confusing respiration (biochemical, in cells) with breathing (the mechanical movement of air in and out of the lungs). They are not the same.",
    source: "exam-style" },

  { topicCode: "Bi2.1", marks: 2,
    question: "State two structures found in a plant cell that are NOT found in an animal cell.",
    markScheme: "Any TWO of (B1 each, max 2):\n• **Cell wall** (made of cellulose; gives support and prevents bursting)\n• **Chloroplasts** (contain chlorophyll; site of photosynthesis)\n• **Large, permanent (central) vacuole** (contains cell sap; maintains turgor)\nKey distinction: both have a cell membrane, nucleus, cytoplasm, mitochondria, ribosomes. The three above are PLANT-only.",
    source: "exam-style" },

  { topicCode: "Bi3.2", marks: 2,
    question: "Define osmosis.",
    markScheme: "Full-mark definition: \"Osmosis is the **net movement of water molecules** (1) from a region of **higher water potential / more dilute solution** to a region of **lower water potential / more concentrated solution**, **through a partially permeable membrane** (1).\"\nCommon error: not specifying 'WATER' molecules (osmosis is specifically water) or omitting 'partially permeable membrane' — both lose marks.",
    source: "exam-style" },

  { topicCode: "Bi5.1", marks: 2,
    question: "Define an enzyme.",
    markScheme: "Full-mark definition: an enzyme is a **biological catalyst** (1) — a **protein** that **speeds up the rate of a chemical reaction** without being **changed/used up** itself (1).\nKey words: 'protein', 'catalyst', 'speeds up reaction', 'not used up / not changed' — at least two of these phrases needed for full marks.",
    source: "exam-style" },

  { topicCode: "Bi6.1", marks: 2,
    question: "Write the word equation for photosynthesis.",
    markScheme: "**carbon dioxide + water → (light + chlorophyll) → glucose + oxygen**\n  • Reactants correct (CO₂ + water): **(B1)**\n  • Products correct (glucose + oxygen) AND arrow with light/chlorophyll noted: **(B1)**\nAlternative balanced symbol equation also acceptable: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂\nCommon error: writing 'sunlight' as a reactant — light is the energy SOURCE driving the reaction, not a chemical reactant; it goes above the arrow.",
    source: "exam-style" },

  { topicCode: "Bi9.3", marks: 2,
    question: "Name TWO structures found in a red blood cell that adapt it for its function.",
    markScheme: "Any TWO of (B1 each, max 2):\n• **Biconcave disc shape** → large surface area to volume ratio (better gas exchange)\n• **No nucleus** → more room for haemoglobin (more oxygen carried)\n• **Contains haemoglobin** → binds reversibly with oxygen to form oxyhaemoglobin\n• **Flexible / thin membrane** → squeezes through narrow capillaries\nReason is not strictly needed for the mark, but naming + brief reason is the safest answer.",
    source: "exam-style" },

  { topicCode: "Bi17.1", marks: 2,
    question: "State what is meant by a gene.",
    markScheme: "Full-mark definition: a gene is a **section/length of DNA** (1) that **codes for the amino-acid sequence of a specific protein** (1) (and therefore a specific characteristic).\nAcceptable variant: \"a gene is a length of DNA that codes for a protein\". Don't accept \"a gene is a chromosome\" — chromosomes contain many genes.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3–4 MARK typical questions: describe / explain.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "Bi3.1", marks: 4,
    question: "Explain why oxygen moves from the alveoli into the blood by diffusion.",
    markScheme: "Mark for each correct point, max 4:\n• **Diffusion** is the net movement of particles from a region of **higher concentration to lower concentration** (down a concentration gradient).\n• Oxygen concentration is **higher in the alveolus** (freshly inhaled air) than in the blood entering the lungs (deoxygenated, returning from body).\n• So oxygen molecules **diffuse down the concentration gradient** from alveolus → into capillary → into red blood cells.\n• Oxygen **binds to haemoglobin** to form oxyhaemoglobin, removing it from solution → MAINTAINS the concentration gradient.\n• Alveoli are adapted: very large total surface area + one-cell-thick walls + moist + rich blood supply — all increase the RATE of diffusion.",
    source: "exam-style" },

  { topicCode: "Bi5.2", marks: 4,
    question: "Explain why an enzyme stops working at very high temperatures.",
    markScheme: "Mark for each correct point, max 4:\n• Enzymes are **proteins** with a specific **3D shape** including an **active site**.\n• The active site is **complementary in shape** to the substrate (lock-and-key model).\n• At very high temperatures the **bonds holding the protein shape break** (heat energy disrupts hydrogen bonds).\n• The active site **changes shape** → substrate **no longer fits** → enzyme is **DENATURED**.\n• This is **irreversible** — cooling back down does not restore activity.\nCommon error: saying \"the enzyme is killed\" — enzymes are not alive; correct word is 'denatured'.",
    source: "exam-style" },

  { topicCode: "Bi6.2", marks: 4,
    question: "Explain TWO ways in which a leaf is adapted for photosynthesis.",
    markScheme: "1 mark for naming each adaptation + 1 mark for explaining how it helps photosynthesis (max 4):\n• **Large surface area** (broad flat shape) → more sunlight absorbed.\n• **Thin** → short diffusion distance for CO₂ to reach palisade cells / O₂ to escape.\n• **Palisade cells packed tightly under upper epidermis with many chloroplasts** → maximum light absorption.\n• **Stomata in the lower epidermis** → allow CO₂ in and O₂ out by diffusion.\n• **Spongy mesophyll with air spaces** → rapid diffusion of gases between stomata and palisade.\n• **Network of veins (xylem + phloem)** → xylem supplies water; phloem removes glucose to the rest of the plant.\nAny two well-explained adaptations = full marks.",
    source: "exam-style" },

  { topicCode: "Bi7.2", marks: 4,
    question: "Describe how the protein in a meal is broken down in the human digestive system.",
    markScheme: "Mark for each accurate step, max 4:\n• In the **stomach**: hydrochloric acid creates a pH ~2 environment; the enzyme **pepsin** (a protease) breaks proteins into smaller **peptides**.\n• In the **small intestine** (duodenum): **trypsin** (also a protease, produced in the pancreas) continues breaking peptides into smaller peptides at an alkaline pH (~pH 8 from bile + pancreatic juice).\n• Other proteases in the small intestine break peptides into **individual amino acids**.\n• Amino acids are **absorbed through the villi** into the bloodstream and transported to body cells (assimilation).\nKey marks: name the enzyme (pepsin AND/OR trypsin) and the END product (amino acids).",
    source: "exam-style" },

  { topicCode: "Bi9.1", marks: 4,
    question: "Explain why the left ventricle of the heart has a much thicker muscular wall than the right ventricle.",
    markScheme: "Mark for each correct point, max 4:\n• The **left ventricle pumps blood to the WHOLE BODY** (systemic circulation).\n• The right ventricle only pumps to the **LUNGS** (pulmonary circulation) — a much shorter distance.\n• Higher pressure is needed to push blood all the way around the body and through narrow capillaries.\n• A **thicker, more muscular wall produces a stronger contraction** → higher blood pressure.\n• Without this, blood would not reach the brain, kidneys, feet, etc.\nCommon error: saying 'because the left ventricle is bigger' — size isn't the point; the difference is the PRESSURE required.",
    source: "exam-style" },

  { topicCode: "Bi11.2", marks: 4,
    question: "Explain how alveoli are adapted for efficient gas exchange. (Give FOUR distinct adaptations.)",
    markScheme: "1 mark per distinct adaptation + brief reason, max 4:\n• **Very large total surface area** (millions of alveoli) → more diffusion happens at once.\n• **One-cell-thick walls** → very short diffusion distance for gases.\n• **Moist inner surface** → gases dissolve before diffusing across the membrane.\n• **Rich blood supply** (dense capillary network around each alveolus) → maintains the concentration gradient by carrying O₂ away and bringing CO₂.\n• **Constant ventilation** (breathing) → keeps the alveolus air fresh, replenishing O₂ and removing CO₂.\nAny four = full marks. Reasons are not strictly required for each but help.",
    source: "exam-style" },

  { topicCode: "Bi12.2", marks: 4,
    question: "Explain why a sprinter experiences oxygen debt during a 100 m race.",
    markScheme: "Mark for each correct point, max 4:\n• During the sprint, the **muscles work very hard** and need a lot of energy.\n• Oxygen cannot be supplied **fast enough** (lungs + heart can't keep up with the rate of demand).\n• Muscles switch to **anaerobic respiration**: glucose → **lactic acid** (with much less energy released per glucose, but no O₂ needed).\n• **Lactic acid builds up** in the muscles → causes fatigue + muscle pain + cramps.\n• After the race, the sprinter **breathes deeply for several minutes** to repay the 'oxygen debt' — extra O₂ used to break down lactic acid into CO₂ and water.",
    source: "exam-style" },

  { topicCode: "Bi14.1", marks: 4,
    question: "Describe the pathway of a reflex arc, using the example of a hand touching a hot object.",
    markScheme: "Mark for each step in correct order, max 4:\n1. **Receptors** in the skin (heat/pain receptors) detect the stimulus (hot object). **(B1)**\n2. A **sensory neurone** transmits the impulse from the receptor to the **spinal cord** (CNS). **(B1)**\n3. In the spinal cord, the impulse is passed to a **relay neurone**, then to a **motor neurone** (the connection happens at synapses). **(B1)**\n4. The motor neurone carries the impulse to the **effector** (muscle in the arm), which **contracts** → hand is withdrawn rapidly. **(B1)**\nKey rule: a reflex arc bypasses conscious thought — that's why it's so fast. The brain receives the signal after the action has already happened.",
    source: "exam-style" },

  { topicCode: "Bi14.3", marks: 4,
    question: "Explain how the body controls blood glucose concentration when it rises above normal.",
    markScheme: "Mark for each correct point, max 4:\n• Rising blood glucose (e.g. after a meal) is detected by cells in the **pancreas**.\n• The pancreas secretes the hormone **insulin** into the blood.\n• Insulin acts on **liver and muscle cells** → they take up glucose from the blood and **store it as glycogen**.\n• Blood glucose concentration **falls back to normal** — this is negative feedback.\n• If insulin is missing or doesn't work (Type 1 / Type 2 diabetes) → blood glucose stays high → kidneys excrete excess glucose → frequent urination, thirst, weight loss.",
    source: "exam-style" },

  { topicCode: "Bi17.2", marks: 4,
    question: "In humans, the allele for brown eyes (B) is dominant to the allele for blue eyes (b). Two heterozygous brown-eyed parents have children.\n(a) Draw a Punnett square / genetic diagram for this cross.\n(b) What is the expected ratio of brown-eyed to blue-eyed children?",
    markScheme: "(a) Parents: Bb × Bb.  Cross:\n```\n          B       b\n     B    BB      Bb\n     b    Bb      bb\n```\nGenotypes of offspring: 1 BB : 2 Bb : 1 bb  **(B1 for correct parents, B1 for correct genotype offspring)**\n(b) Phenotypes:\n  BB = brown, Bb = brown, bb = blue.\n  Brown : blue = **3 : 1**  **(B1 for ratio, B1 for the phenotype-to-genotype link).**\nKey rule: heterozygotes (Bb) show the dominant phenotype.",
    source: "exam-style" },

  { topicCode: "Bi8.2", marks: 4,
    question: "Explain how an increase in temperature affects the rate of transpiration in a plant.",
    markScheme: "Mark for each correct point, max 4:\n• Higher temperature → water molecules have **more kinetic energy** → evaporate from the leaf cell surfaces faster.\n• Water vapour leaves through the **stomata** (mostly on the underside of the leaf).\n• The concentration gradient of water vapour between the inside of the leaf and the outside air is **steeper** at higher temperature → faster diffusion out.\n• Net effect: **transpiration rate increases** with temperature (within reasonable limits).\n• At extreme temperatures, stomata may **close** (to prevent water loss + wilting), which reverses the effect.",
    source: "exam-style" },

  { topicCode: "Bi10.2", marks: 4,
    question: "Explain how a vaccination protects a person from a disease such as measles.",
    markScheme: "Mark for each correct point, max 4:\n• Vaccine contains a **weakened or inactivated form of the pathogen** (or its antigens) — does not cause disease.\n• Vaccine introduces the **antigens** of the pathogen into the body.\n• **Lymphocytes** detect the antigens and produce **specific antibodies** that bind to them.\n• **Memory cells** are also produced, which remain in the body long-term.\n• If the person is later infected by the real pathogen, memory cells trigger a **fast and large antibody response** → pathogen is destroyed before symptoms develop. This is the secondary immune response.\nThis is called active artificial immunity.",
    source: "exam-style" },

  { topicCode: "Bi18.1", marks: 4,
    question: "Explain how a population of bacteria can become resistant to an antibiotic.",
    markScheme: "Mark for each correct point in the natural-selection chain, max 4:\n• Random **mutation** in some bacteria produces an allele that confers antibiotic resistance.\n• When the antibiotic is applied, **non-resistant bacteria die** but **resistant bacteria survive**.\n• Survivors **reproduce** (very rapidly — bacteria divide every ~20 min) → resistance allele is **passed on to all offspring**.\n• Over generations, the **proportion of resistant bacteria in the population rises** → the population becomes resistant.\n• Practical implication: only use antibiotics when necessary + always complete the prescribed course → reduces selection pressure for resistance.",
    source: "exam-style" },

  { topicCode: "Bi19.1", marks: 3,
    question: "Explain why the number of organisms decreases as you go up a food chain (e.g. grass → rabbit → fox).",
    markScheme: "Mark for each correct point, max 3:\n• Energy is **lost at each trophic level** — only about **10%** is passed on to the next level.\n• Energy is lost as **heat (from respiration)**, in **undigested material (faeces)**, in **urine**, and in **movement**.\n• So each higher level has **less energy available** → can support **fewer organisms** of larger size.\n• A typical food chain rarely has more than 4–5 levels because energy runs out.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6 MARK ANALYSE / EXPLAIN: multi-step chains.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "Bi6.1", marks: 6,
    question: "A student investigates how light intensity affects the rate of photosynthesis in a pondweed (Elodea). She counts the bubbles of oxygen released per minute at different distances from a lamp.\n(a) Predict what she will observe, and explain why.\n(b) Why does the rate eventually stop increasing even at very bright light?",
    markScheme: "L3 (5–6): Clear cause→effect chain for both parts + at least one limiting factor identified by name.\nL2 (3–4): One part well explained.\nL1 (1–2): Basic statements only.\n\n(a) Up to about 4 marks:\n• As the lamp is moved closer → **light intensity increases**.\n• Light provides energy for photosynthesis (absorbed by **chlorophyll** in chloroplasts).\n• Higher light intensity → faster rate of photosynthesis → more oxygen produced → **more bubbles per minute**.\n• Note: light intensity ∝ 1/distance² (inverse square law) — moving closer doubles the intensity quickly.\n\n(b) Up to about 2 marks:\n• At very high light intensity, light is **no longer the limiting factor**.\n• Another factor — **CO₂ concentration** or **temperature** — now limits the rate.\n• Adding more light cannot increase the rate any further until the new limiting factor is also increased.\n• Recognising the concept of a 'limiting factor' is the key L3 idea.",
    source: "exam-style" },

  { topicCode: "Bi7.3", marks: 6,
    question: "Describe how the structure of the small intestine is adapted for efficient absorption of digested food. Refer to FOUR specific adaptations.",
    markScheme: "L3 (5–6): Four clear adaptations, each with WHY they help absorption.\nL2 (3–4): Three adaptations with reason, OR four named only.\nL1 (1–2): Listing without reasoning.\n\nFour adaptations to develop:\n• **Long length (~5–7 m)** → large total surface area + long time for digestion + absorption.\n• **Villi (and microvilli)** cover the inner lining → enormously increase the surface area available for absorption (compared with a smooth tube).\n• **One-cell-thick wall on villi** → short diffusion distance for molecules to cross from gut into blood.\n• **Rich blood capillary network in each villus** → carries absorbed molecules (glucose, amino acids) away → maintains the concentration gradient for absorption.\n• **Lacteal in centre of each villus** → absorbs fatty acids + glycerol into the lymphatic system.\n• **Active transport on epithelial cells** → ensures absorption against the gradient when needed (e.g. glucose when blood already has plenty).\n\nL3 answer: any FOUR of the above, each with a clear reason linking structure → function.",
    source: "exam-style" },

  { topicCode: "Bi20.1", marks: 6,
    question: "Analyse how excess fertiliser running off farmland into a lake can lead to the death of fish (the process of EUTROPHICATION).",
    markScheme: "L3 (5–6): Full cause→effect chain — at least 5 of the steps below in correct order.\nL2 (3–4): Some steps in the wrong order or missing.\nL1 (1–2): Listing only.\n\nKey chain (each correct linked step is a mark, max 6):\n1. **Fertiliser washes off fields into the lake** — contains nitrates and phosphates.\n2. **Nitrates / phosphates fertilise algae and aquatic plants** in the lake → rapid growth = **algal bloom**.\n3. **Algae form a thick layer on the water surface** → block light from reaching the plants underneath.\n4. **Submerged plants die** because they cannot photosynthesise.\n5. **Decomposers (aerobic bacteria) feed on dead plants and dead algae** — populations of decomposers increase rapidly.\n6. **Decomposers use up the oxygen** in the water (aerobic respiration) → dissolved O₂ falls.\n7. **Fish + other aerobic aquatic organisms die** from lack of oxygen.\n\nL3 answer: identifies fertiliser as the cause, links to algal bloom, light blocking, decomposition, oxygen depletion, fish death.",
    source: "exam-style" },

  { topicCode: "Bi17.2", marks: 6,
    question: "Sickle-cell anaemia is caused by a recessive allele (s). The normal allele (S) is dominant.\n(a) A couple, both carriers, plan to have children.\n  (i) Use a genetic diagram to show the expected proportion of children who would have sickle-cell anaemia.\n  (ii) Use a genetic diagram to show the expected proportion who would be carriers (heterozygotes).\n(b) Suggest ONE reason why the allele for sickle-cell remains common in some populations, despite being harmful.",
    markScheme: "(a) Parents: Ss × Ss.\n  Punnett square correctly drawn **(B1)**:\n  SS : Ss : Ss : ss → 1 : 2 : 1\n  (i) **1 in 4 (25%)** affected (ss). **(B1)**\n  (ii) **2 in 4 (50%)** carriers (Ss). **(B1)**\n(b) Up to 3 marks for a reasoned answer:\n  • Heterozygotes (Ss) have **partial resistance to malaria** — RBCs deform when infected, killing the parasite. **(B1)**\n  • In malaria-endemic regions (Africa, parts of Asia), Ss individuals are **more likely to survive** to reproductive age than SS individuals. **(B1)**\n  • So the s allele is **maintained at a stable frequency** by natural selection (a 'balanced polymorphism'). **(B1)**\n\nFull-mark answer ties together genetics + natural selection.",
    source: "exam-style" },

  { topicCode: "Bi21.2", marks: 6,
    question: "Bacteria can be genetically modified to produce human insulin. Describe the main steps of this process. Then evaluate ONE advantage and ONE concern of using GM bacteria to produce insulin.",
    markScheme: "L3 (5–6): Correct process steps + one well-developed advantage AND one concern.\nL2 (3–4): Process + one of advantage/concern.\nL1 (1–2): Listing only, missing detail.\n\nProcess (up to 4 marks):\n• The human **insulin gene is identified and cut out** of human DNA using a **restriction enzyme**.\n• The same restriction enzyme cuts open a **bacterial plasmid** (a small circular DNA molecule) → produces matching 'sticky ends'.\n• The insulin gene is **joined into the plasmid** using **DNA ligase** → recombinant plasmid.\n• The recombinant plasmid is **inserted into a host bacterium** (e.g. E. coli).\n• The bacterium **expresses the gene and produces human insulin protein**, which is harvested.\n\nAdvantage (1 mark):\n• Insulin produced is **identical to human insulin** (better than older animal-pancreas insulin — fewer immune reactions).\n• Or: **mass-produced cheaply + quickly** in fermenters → meets growing demand.\n• Or: **religious/dietary concerns avoided** (no pork/beef pancreas needed).\n\nConcern (1 mark):\n• **Risk of gene escape** into wild bacterial populations / ethical concerns about modifying organisms / dependence on a few large biotech companies who control patents → expensive insulin in poorer countries.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8 MARK DISCUSS / EVALUATE: both sides + conclusion.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "Bi18.2", marks: 8,
    question: "Selective breeding (artificial selection) is widely used in agriculture to produce high-yield crops and animals. Discuss whether the benefits outweigh the disadvantages. Justify your conclusion.",
    markScheme: "L4 (7–8): Balanced both sides + at least 2 specific examples + JUSTIFIED conclusion.\nL3 (5–6): Both sides but no conclusion.\nL2 (3–4): One-sided.\nL1 (1–2): Description only.\n\nBENEFITS to develop:\n• **Increased food production** — high-yield wheat varieties feed more people; high milk-yield dairy cattle; faster-growing chickens.\n• **Disease resistance** in selected crops → less crop loss, less pesticide use.\n• **Desired traits** in livestock (leaner meat, more eggs, calmer temperament) → more efficient farming.\n• **Faster than natural selection** — desired traits achieved in a few generations.\n• Has historically transformed agriculture (e.g. modern wheat vs wild grasses) and enables modern food security.\n\nDISADVANTAGES / RISKS:\n• **Reduced genetic variation** within a species → entire crop or herd can be wiped out by a single new disease (e.g. Irish potato famine — single variety).\n• **Welfare issues** in animals (e.g. broiler chickens cannot walk properly; pugs with breathing problems).\n• **Some desired traits come with unintended harms** (e.g. high-yield cows are prone to lameness, infertility).\n• **Loss of biodiversity** — traditional varieties displaced.\n• **Concentration of power** in a few seed companies that own modern varieties.\n\nCONCLUSION (L4):\n• Balanced view: benefits to food security are significant and have lifted millions out of hunger, BUT the loss of genetic diversity is a serious long-term risk. The justified position is that selective breeding should continue alongside CONSERVATION of traditional varieties (seed banks, heritage breeds) and stricter animal welfare standards.",
    source: "exam-style" },

  { topicCode: "Bi19.2", marks: 8,
    question: "Discuss whether human activities are responsible for the recent increases in atmospheric carbon dioxide and global temperatures. Refer to the carbon cycle and to specific human activities. Justify your conclusion.",
    markScheme: "L4 (7–8): Carbon cycle explained + specific human activities identified + balanced + JUSTIFIED conclusion.\nL3 (5–6): Both sides argued but conclusion weak or missing.\nL2 (3–4): One-sided.\nL1 (1–2): Description only.\n\nKey content (build the chain):\n\n**Carbon cycle (briefly):**\n• Photosynthesis removes CO₂ from the atmosphere (locks it into plant biomass).\n• Respiration of plants, animals, decomposers releases CO₂.\n• Combustion of fossil fuels and biomass releases CO₂ — historically slow, now accelerated.\n• Over geological time the cycle is balanced; atmospheric CO₂ stays roughly constant.\n\n**Human activities increasing CO₂:**\n• **Burning fossil fuels** for electricity, transport, industry → releases ancient carbon (locked away for millions of years) into the atmosphere very rapidly.\n• **Deforestation** → fewer trees to absorb CO₂ via photosynthesis; burning the cut forests adds even more CO₂.\n• **Agriculture** (rice paddies, livestock) releases CO₂ and methane (another greenhouse gas).\n• **Cement production** releases CO₂.\n\n**Effects on temperature:**\n• CO₂ is a greenhouse gas — traps infrared radiation, warming the lower atmosphere.\n• Atmospheric CO₂ has risen from ~280 ppm (pre-industrial) to ~420 ppm (now). Global average temperature has risen ~1.1 °C in the same period.\n• Strong correlation + clear mechanism = strong case for human cause.\n\n**Alternative natural explanations (the OTHER side):**\n• Some natural temperature variation occurs (volcanic activity, solar cycles).\n• BUT scientific consensus says these cannot account for the magnitude or speed of current warming.\n\nCONCLUSION (L4):\n• Yes, human activities — primarily fossil-fuel combustion and deforestation — are the main driver of the recent CO₂ increase and consequent warming. Natural variation alone cannot explain the rate of change observed since 1900. Action: reduce fossil-fuel use, protect forests, transition to renewables.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANSION ROUND — lifts Biology coverage from 30 → ~50 questions.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "Bi1.3", marks: 2,
    question: "Name the FIVE kingdoms of living organisms used in classification.",
    markScheme: "**Animal, Plant, Fungus, Prokaryote (bacteria), Protoctist** — all five required for B2.\nB1 if any 3-4 named. The newer 3-domain system (Bacteria, Archaea, Eukarya) is NOT required by 0610.",
    source: "exam-style" },

  { topicCode: "Bi2.2", marks: 4,
    question: "Explain how a root hair cell is adapted for its function.",
    markScheme: "1 mark per linked structure→function point (max 4):\n• **Long thin projection (root hair)** → very large surface area in contact with soil water → faster water uptake by osmosis.\n• **Thin cell wall + membrane** → short diffusion distance for water + minerals.\n• **Many mitochondria** → release ATP for ACTIVE TRANSPORT of mineral ions against the gradient (e.g. nitrates from dilute soil into concentrated cell sap).\n• **No chloroplasts** → root cells are underground (no light), so chloroplasts would be useless; resources directed to absorption instead.\n• **Permanent vacuole containing concentrated cell sap** → maintains low water potential → water drawn in by osmosis.",
    source: "exam-style" },

  { topicCode: "Bi4.1", marks: 3,
    question: "State the food test for STARCH and the food test for REDUCING SUGAR, giving the reagent used and the positive result colour change for each.",
    markScheme: "**Starch (1.5 marks):** add **iodine solution** → goes from yellow/brown to **blue-black** if starch present.\n**Reducing sugar (1.5 marks):** add **Benedict's solution** and **heat in a water bath** → goes from blue to **brick red / orange** if reducing sugar present (green → yellow → orange → brick red shows increasing amount).\nKey examiner detail: must say 'HEAT' for Benedict's — at room temperature it won't react.",
    source: "exam-style" },

  { topicCode: "Bi4.1", marks: 2,
    question: "Describe the food test for protein.",
    markScheme: "**Add biuret reagent** (or sodium hydroxide + dilute copper sulfate) to the food sample. **(B1)**\nIf protein is present, the colour changes from **blue to purple / violet / lilac**. **(B1)**\nNo heating needed (unlike Benedict's).",
    source: "exam-style" },

  { topicCode: "Bi5.2", marks: 4,
    question: "Sketch (in words) the shape of a graph showing the rate of an enzyme-controlled reaction against TEMPERATURE, and explain its three distinct regions.",
    markScheme: "Mark for each region described correctly, max 4:\n• **Low temperatures (0–20 °C)**: rate is LOW and rising slowly — particles have little kinetic energy → few successful collisions per second.\n• **Rising up to the optimum (around 37 °C in humans)**: rate INCREASES rapidly — more energy → more frequent + more successful enzyme–substrate collisions. (curve rises)\n• **At the optimum**: rate is at its MAXIMUM — best fit between enzyme conformation + collisions.\n• **Above the optimum**: rate FALLS SHARPLY — heat energy breaks hydrogen bonds maintaining the active site shape → enzyme DENATURES → substrate no longer fits → reaction stops (rate → 0).\n\nKey words examiners reward: 'denatured', 'active site', 'shape change', 'optimum'.",
    source: "exam-style" },

  { topicCode: "Bi6.1", marks: 4,
    question: "A leaf has been kept in the dark for 24 hours then exposed to bright sunlight for 4 hours. When tested with iodine, the leaf turns blue-black.\n(a) State the conclusion that can be drawn from this experiment.\n(b) Explain why the leaf was kept in the dark for 24 hours first.\n(c) Why is the leaf usually boiled in ethanol before adding iodine?",
    markScheme: "(a) The leaf has produced STARCH (during photosynthesis under the light) → **photosynthesis has occurred** → **starch is the storage product of photosynthesis**. **(B1)**\n(b) **DESTARCHING** — to remove any starch that was already in the leaf before the experiment, so we know any starch detected at the end came from photosynthesis during the 4 hours of light. **(B1)** (Otherwise we couldn't tell.)\n(c) **Ethanol removes chlorophyll** (extracts the green pigment) → the leaf becomes white/colourless. **(B1)** → the iodine colour change is then clearly visible against the white leaf. The leaf is first dipped in boiling water to soften it / kill the cells / break the waxy cuticle. **(B1)**",
    source: "exam-style" },

  { topicCode: "Bi7.1", marks: 4,
    question: "Identify TWO deficiency diseases and the missing nutrient that causes each.",
    markScheme: "1 mark for naming each disease + 1 mark for the correct nutrient (max 4):\n• **Scurvy** — caused by **vitamin C deficiency**. Symptoms: bleeding gums, slow wound healing.\n• **Rickets** — caused by **vitamin D deficiency** (also calcium). Symptoms: soft, bent bones in children.\n• **Anaemia** — caused by **iron deficiency**. Symptoms: tiredness, pale skin, breathlessness.\n• **Kwashiorkor** — caused by **protein deficiency**. Symptoms: swollen abdomen ('belly'), stunted growth.\n• **Marasmus** — caused by **overall energy / calorie deficiency** (extreme malnutrition).\n• **Goitre** — caused by **iodine deficiency**. Symptoms: swelling of the thyroid in the neck.",
    source: "exam-style" },

  { topicCode: "Bi8.1", marks: 4,
    question: "Compare xylem and phloem in plants. Refer to: structure, what they transport, and direction of transport.",
    markScheme: "Mark for each clear contrast (max 4):\n• **Structure:** Xylem = **dead, hollow** cells joined end-to-end into a continuous tube, walls **lignified** for support; no cytoplasm. Phloem = **living** sieve-tube elements with companion cells; cytoplasm strands; sieve plates with pores.\n• **What they transport:** Xylem = **water + dissolved mineral ions** (one-way). Phloem = **sucrose + amino acids** (organic solutes).\n• **Direction:** Xylem = **upwards only** (roots → leaves, by transpiration pull). Phloem = **two-way** — from source (e.g. leaves) to sink (growing tissue, roots, fruits); known as translocation.\n• **Energy:** Xylem transport is PASSIVE (transpiration pull). Phloem transport REQUIRES ENERGY (active loading at the source).\nAny clear contrast on each of structure / contents / direction earns marks.",
    source: "exam-style" },

  { topicCode: "Bi9.2", marks: 4,
    question: "Compare the structure of arteries and veins, and explain how each structure relates to its function.",
    markScheme: "Mark for each clear contrast (max 4):\n• **Arteries** have **thick muscular walls** + **narrow lumen** → withstand and maintain HIGH blood pressure as blood is forced out of the heart. **No valves** along the length (except where they leave the heart) — pressure is high enough to prevent backflow.\n• **Veins** have **thin walls** + **wide lumen** → low-pressure blood flows back to the heart slowly. **Valves** along the length → prevent backflow (especially against gravity in legs).\n• **Function:** Arteries carry blood AWAY from the heart at high pressure; veins return blood TO the heart at low pressure.\n• **Direction:** All arteries carry oxygenated blood EXCEPT the pulmonary artery (heart → lungs, deoxygenated). All veins carry deoxygenated blood EXCEPT the pulmonary vein (lungs → heart, oxygenated).",
    source: "exam-style" },

  { topicCode: "Bi10.1", marks: 3,
    question: "State THREE ways the human body defends itself against pathogens BEFORE the immune response of lymphocytes is triggered (i.e. the body's first lines of defence).",
    markScheme: "Any THREE of (B1 each, max 3):\n• **Skin** — physical barrier; tough outer layer (keratinised) prevents pathogen entry.\n• **Mucus in airways** — traps pathogens; **cilia sweep it up** and out to the throat.\n• **Stomach acid (HCl)** — kills most pathogens swallowed with food.\n• **Tears + saliva** — contain **lysozyme**, an enzyme that destroys bacterial cell walls.\n• **Blood clotting at wounds** — platelets + fibrin seal cuts, preventing pathogen entry.\n• **Phagocytes (white blood cells) ingesting pathogens** — non-specific (counts as 1st line response too).\nAnswers about antibodies / vaccination are NOT first-line — those are the specific immune response.",
    source: "exam-style" },

  { topicCode: "Bi12.1", marks: 3,
    question: "A muscle cell respires aerobically using 1 mol of glucose. Use the balanced equation for aerobic respiration to calculate how many moles of carbon dioxide are produced.",
    markScheme: "Balanced equation: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O **(M1)**\n1 mole of glucose produces **6 moles of CO₂**  **(A1)**\nKey point: the coefficients in the balanced equation give the molar ratio. **(B1 for showing this reasoning)**.",
    source: "exam-style" },

  { topicCode: "Bi13.1", marks: 4,
    question: "Describe the role of the kidneys in removing urea from the blood.",
    markScheme: "Mark for each step in order, max 4:\n• Blood enters the kidney via the **renal artery**.\n• In each **glomerulus (Bowman's capsule)**, high pressure forces small molecules (water, glucose, urea, ions, amino acids) out of the blood into the kidney tubule — **ultrafiltration**.\n• As the filtrate flows through the tubule, **selective reabsorption** moves all glucose, plus required water + ions, BACK into the blood. (Active transport for glucose; osmosis for water; some active transport for ions.)\n• What remains (urea + excess water + excess ions) flows through the collecting duct → ureter → bladder → out as **urine**.\nADH (antidiuretic hormone) regulates how much water is reabsorbed — more ADH → more water back into blood → less urine.",
    source: "exam-style" },

  { topicCode: "Bi14.2", marks: 4,
    question: "Describe how the eye accommodates (adjusts focus) when looking at a CLOSE object after looking at a distant one.",
    markScheme: "Mark for each step, max 4:\n• **Ciliary muscles CONTRACT** (form a smaller ring).\n• **Suspensory ligaments slacken** (no longer pulled taut).\n• **Lens becomes more rounded / fatter / shorter focal length** (its natural elastic shape).\n• Light from the close object is refracted MORE → focuses correctly on the retina.\nFor distant objects, the reverse happens: ciliary muscles relax → suspensory ligaments tighten → lens becomes thin + flat → less refraction.",
    source: "exam-style" },

  { topicCode: "Bi16.3", marks: 4,
    question: "State the role of each of these four hormones in the human menstrual cycle: FSH, LH, oestrogen, progesterone.",
    markScheme: "1 mark per hormone (max 4):\n• **FSH (Follicle Stimulating Hormone)** — produced by the pituitary gland; stimulates the ovary to develop an egg in a follicle; also triggers oestrogen production.\n• **Oestrogen** — produced by the ovary (developing follicle); causes the **uterus lining to thicken** in preparation for a possible pregnancy.\n• **LH (Luteinising Hormone)** — produced by the pituitary; surge around day 14 **triggers OVULATION** (release of the egg).\n• **Progesterone** — produced by the corpus luteum (empty follicle after ovulation); **maintains the uterus lining** so that an implanted embryo can develop. If no pregnancy, progesterone falls → lining sheds → menstruation begins (day 1).",
    source: "exam-style" },

  { topicCode: "Bi17.2", marks: 4,
    question: "A man and a woman are both heterozygous carriers of a recessive allele (s) for a genetic disorder. Their child is born WITHOUT the disorder. Show, using a genetic diagram, the probability that this unaffected child is ALSO a carrier (heterozygous).",
    markScheme: "Parents: Ss × Ss.  Punnett square:\n```\n          S       s\n     S    SS      Ss\n     s    Ss      ss\n```\n  Offspring: 1 SS : 2 Ss : 1 ss → ratio 1 unaffected (SS) : 2 unaffected carriers (Ss) : 1 affected (ss). **(M1, A1)**\n  Unaffected child means NOT ss. Among the unaffected offspring (SS + Ss combined = 3 children), **2 out of 3 are carriers (Ss)**. **(M1)**\n  **Probability the unaffected child is a carrier = 2/3 (≈ 67%)  (A1)**\nTrap: many students answer 1/2 (the heterozygote share of ALL offspring) — but the question conditions on the child already being unaffected, so we must exclude the ss possibility.",
    source: "exam-style" },

  { topicCode: "Bi18.1", marks: 4,
    question: "Distinguish between CONTINUOUS variation and DISCONTINUOUS variation, giving one example of each.",
    markScheme: "**Continuous (2 marks):** variation that takes **any value across a range** (no distinct categories). Example: **human height** — anywhere between ~1.4 m and 2.1 m, continuous spectrum. Other examples: weight, hand span, leaf length. Usually caused by MANY genes + environmental influence.\n**Discontinuous (2 marks):** variation that falls into **distinct, separate categories** (no in-betweens). Example: **human blood group** (A, B, AB, O — you're definitely one of these four, no half-blood-types). Other examples: ability to roll the tongue, attached vs detached earlobes. Usually caused by ONE or FEW genes; little environmental influence.\nKey distinction: graph of continuous = bell curve; discontinuous = bar chart with distinct gaps.",
    source: "exam-style" },

  { topicCode: "Bi19.3", marks: 6,
    question: "Analyse the typical pattern of bacterial population growth in a sealed nutrient broth, identifying the FOUR named phases.",
    markScheme: "L3 (5–6): All four phases named + clear cause→effect for each.\nL2 (3–4): Three phases.\nL1 (1–2): Two or fewer.\n\nThe four phases (mark each):\n1. **Lag phase**: bacteria are adjusting to the new environment, synthesising enzymes; population grows VERY SLOWLY.\n2. **Exponential (log) phase**: bacteria divide rapidly (every ~20 min for E. coli) — plenty of food + space + no waste yet. Population doubles, doubles, doubles → grows EXPONENTIALLY.\n3. **Stationary phase**: birth rate = death rate. Food + space increasingly limited; waste products accumulate. Population stable at the **carrying capacity** of the closed environment.\n4. **Death (decline) phase**: nutrients exhausted, toxic waste high → death rate > birth rate → population falls.\n\nL3 answer also notes: in a real ecosystem (not closed), population stabilises near carrying capacity rather than declining — predators / disease / migration keep it there.",
    source: "exam-style" },

  { topicCode: "Bi21.1", marks: 4,
    question: "Yeast is used in both bread-making and brewing. Explain how the same chemical process produces different products in each case.",
    markScheme: "Mark for each correct point, max 4:\n• In both cases yeast carries out **anaerobic respiration** (fermentation): glucose → ethanol + carbon dioxide (+ small energy).\n• **In BREAD-MAKING**: the **carbon dioxide** produced is the desired product — it forms bubbles in the dough → bread RISES. The ethanol evaporates during baking.\n• **In BREWING (beer / wine)**: the **ethanol** produced is the desired product — it's the alcohol. The carbon dioxide either escapes or (in some beers + sparkling wines) is captured to give carbonation.\n• The bread-maker uses fast-acting yeast for short rise times; brewing uses slower yeasts at controlled temperatures for hours/days.\n• Optimum yeast temperature ~ 30 °C; too hot → yeast dies (denatures enzymes).",
    source: "exam-style" },
];

/**
 * Per-question incremental seeder for Biology exemplars.
 */
export async function seedIgcseBiologyExamplesIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };
  try {
    const existing = await db.execute(sql`SELECT topicCode, question FROM igcse_examples WHERE topicCode LIKE 'Bi%'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const dedupKey = (code: string, q: string) => `${code}::${q.slice(0, 120)}`;
    const present = new Set<string>(list.map((r: any) => dedupKey(String(r?.topicCode || ""), String(r?.question || ""))));

    const rows: any[] = [];
    let sortOrder = 5000;
    for (const e of EXAMPLES) {
      if (present.has(dedupKey(e.topicCode, e.question))) continue;
      rows.push({
        topicCode: e.topicCode,
        syllabus: "CIE_0610",
        tier: "extended" as const,
        marks: e.marks,
        question: e.question,
        markScheme: e.markScheme,
        source: e.source || "exam-style",
        sortOrder: sortOrder++,
      });
    }

    if (!rows.length) {
      console.log(`[IGCSE] Biology exemplars already complete (${list.length} rows in DB, ${EXAMPLES.length} in seed file).`);
      return { seeded: 0 };
    }
    await db.insert(igcseExamples).values(rows);
    console.log(`[IGCSE] Seeded ${rows.length} new Biology exemplars (total now ${list.length + rows.length}).`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Biology exemplar seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
