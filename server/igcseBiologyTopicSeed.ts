/**
 * Cambridge IGCSE Biology 0610 — Extended-tier topic tree.
 *
 * Authored from Cambridge's published syllabus topics 1–21. Seeded once into
 * `igcse_topics` on startup (idempotent: only inserts if no Biology rows
 * exist yet). The `learningOutcomes` field is what the AI Teacher uses as
 * grounding when teaching a topic.
 *
 * Topic `code` is prefixed with "Bi" (e.g. "Bi3.4") so it doesn't collide
 * with Business' "B3.4" — code-prefix collision checks must look at "Bi"
 * BEFORE the bare "B" in subjectOfTopicCode. Area codes are "Bi1".."Bi21".
 */
import { getDb, ensureIgcseBiologySubject } from "./db";
import { igcseTopics } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Seed = { code: string; title: string; learningOutcomes: string };
type Area = { code: string; name: string; topics: Seed[] };

const AREAS: Area[] = [
  {
    code: "Bi1", name: "Characteristics and classification of living organisms",
    topics: [
      { code: "Bi1.1", title: "Characteristics of living organisms (MRS GREN)",
        learningOutcomes: "All living organisms share seven characteristics — Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition (MRS GREN). Define each in biological terms (e.g. respiration = chemical reactions in cells that break down nutrient molecules to release energy; excretion = removal of toxic + waste metabolic products + excess substances from organisms)." },
      { code: "Bi1.2", title: "Classification and binomial naming",
        learningOutcomes: "Organisms are classified into a hierarchy: kingdom, phylum, class, order, family, genus, species. The binomial system uses two Latin words (genus + species) — e.g. Homo sapiens. Species defined as organisms that can reproduce to produce fertile offspring. Use of DNA sequences in classification — more similar DNA → more closely related species → common ancestor more recent." },
      { code: "Bi1.3", title: "Five kingdoms + main groups of vertebrates and invertebrates",
        learningOutcomes: "Five kingdoms: Animal, Plant, Fungus, Prokaryote (bacteria), Protoctist. Distinguishing features of each. Main vertebrate classes: fish, amphibians, reptiles, birds, mammals — key features (scales, gills/lungs, fur, feathers, milk, etc.). Main invertebrate phyla: arthropods (insects, arachnids, crustaceans, myriapods — exoskeleton, jointed legs), molluscs, annelids, nematodes." },
      { code: "Bi1.4", title: "Dichotomous keys",
        learningOutcomes: "A dichotomous key is a series of paired statements that narrows down an organism's identity at each step. Use a key to identify unknown organisms from observable features (number of legs, body shape, presence of wings). Construct a simple dichotomous key from a small set of organisms." },
    ],
  },
  {
    code: "Bi2", name: "Organisation of the organism",
    topics: [
      { code: "Bi2.1", title: "Cell structure and organelles",
        learningOutcomes: "Animal cells: nucleus (DNA, controls activities), cytoplasm (site of reactions), cell membrane (controls what enters/leaves), mitochondria (aerobic respiration), ribosomes (protein synthesis), vacuoles (small, contain fluid). Plant cells additionally have: cell wall (cellulose, support), large central vacuole (sap, turgor), chloroplasts (photosynthesis, contain chlorophyll). Use of light microscope, magnification calculation: image size = actual size × magnification." },
      { code: "Bi2.2", title: "Specialised cells, tissues, organs, organ systems",
        learningOutcomes: "Specialised cells are adapted for specific functions. Examples: red blood cells (biconcave, no nucleus → more haemoglobin, gas transport); root hair cell (long extension → large surface area for water uptake); xylem vessel cell (hollow, lignified walls → water transport); palisade mesophyll cell (many chloroplasts → photosynthesis); nerve cell (long axon → fast signal transmission); sperm + egg cells (adapted for fertilisation). Hierarchy: cell → tissue → organ → organ system → organism." },
    ],
  },
  {
    code: "Bi3", name: "Movement into and out of cells",
    topics: [
      { code: "Bi3.1", title: "Diffusion",
        learningOutcomes: "Diffusion = net movement of particles from a region of higher concentration to a region of lower concentration (DOWN the concentration gradient), as a result of the random motion of particles. Energy is NOT required from the cell (passive). Rate of diffusion increased by: steeper concentration gradient, higher temperature (more KE), larger surface area, shorter diffusion distance. Examples in biology: gas exchange in alveoli, gases into/out of leaves, soluble products of digestion." },
      { code: "Bi3.2", title: "Osmosis",
        learningOutcomes: "Osmosis = net movement of WATER molecules from a dilute solution (high water potential) to a more concentrated solution (low water potential) through a partially permeable membrane. Effects on plant cells: turgid (in water) → flaccid (in concentrated solution) → plasmolysed (cytoplasm shrinks from cell wall). Effects on animal cells: lyse/burst (in water — no cell wall to resist), crenate (shrink in concentrated solution). Investigating osmosis with potato or visking-tubing experiments." },
      { code: "Bi3.3", title: "Active transport",
        learningOutcomes: "Active transport = movement of particles through a membrane from a region of LOWER concentration to a region of HIGHER concentration (AGAINST the gradient), using ENERGY from respiration (via carrier protein 'pumps' in the membrane). Examples: ion uptake by root hair cells; glucose absorption from gut into bloodstream once concentration in blood is already higher; sodium-potassium pump in nerve cells. Contrast with passive diffusion and osmosis." },
    ],
  },
  {
    code: "Bi4", name: "Biological molecules",
    topics: [
      { code: "Bi4.1", title: "Carbohydrates, lipids, proteins",
        learningOutcomes: "Three main classes of biological molecules. CARBOHYDRATES — sugars (glucose, sucrose) + starch + cellulose; provide energy + structural roles. LIPIDS (fats + oils) — energy storage, insulation, cell membranes. PROTEINS — built from amino acids, enzymes, antibodies, muscle, hormones (e.g. insulin). Food tests: starch + iodine (blue-black); reducing sugar + Benedict's solution (heat → red/orange); protein + biuret reagent (purple/violet); lipid + ethanol then water (cloudy white emulsion)." },
      { code: "Bi4.2", title: "DNA structure (overview)",
        learningOutcomes: "DNA = deoxyribonucleic acid, the genetic material. Structure: two strands twisted into a double helix, held together by complementary base pairs — Adenine (A) pairs with Thymine (T), Cytosine (C) pairs with Guanine (G). A gene is a section of DNA that codes for a protein (via amino-acid sequence)." },
    ],
  },
  {
    code: "Bi5", name: "Enzymes",
    topics: [
      { code: "Bi5.1", title: "Enzyme action and the lock-and-key model",
        learningOutcomes: "Enzymes = biological catalysts (proteins) that speed up the rate of chemical reactions in cells without being changed themselves. Each enzyme has a specific 3D shape with an active site that fits ONE specific substrate (lock-and-key model). Reactions: substrate + enzyme → enzyme–substrate complex → enzyme + product(s)." },
      { code: "Bi5.2", title: "Factors affecting enzyme activity — temperature and pH",
        learningOutcomes: "TEMPERATURE: low temp → low rate (few collisions); rises to OPTIMUM (often ~37°C in humans); above optimum → enzyme DENATURES (active site changes shape) → rate falls to zero. pH: each enzyme has an OPTIMUM pH (pepsin acidic ~pH 2 in stomach; trypsin alkaline ~pH 8 in small intestine). Outside the optimum → enzyme denatures. Sketch + interpret graphs of enzyme rate vs temperature and vs pH." },
    ],
  },
  {
    code: "Bi6", name: "Plant nutrition",
    topics: [
      { code: "Bi6.1", title: "Photosynthesis",
        learningOutcomes: "Photosynthesis = the process by which plants make glucose from carbon dioxide and water, using light energy (absorbed by chlorophyll in chloroplasts). Word equation: carbon dioxide + water → (light + chlorophyll) → glucose + oxygen. Balanced symbol equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. Limiting factors: light intensity, carbon dioxide concentration, temperature — recognise from graphs which is limiting at a given point." },
      { code: "Bi6.2", title: "Leaf structure as an adaptation",
        learningOutcomes: "Leaves are adapted for photosynthesis. Large surface area + thin (short diffusion path) + many stomata for gas exchange + waxy cuticle reduces water loss + palisade cells packed with chloroplasts on top surface (catch light) + spongy mesophyll with air spaces (gas diffusion) + vascular bundles (xylem brings water, phloem removes sugars). Stomata + guard cells regulate gas exchange." },
    ],
  },
  {
    code: "Bi7", name: "Human nutrition",
    topics: [
      { code: "Bi7.1", title: "Balanced diet and deficiency diseases",
        learningOutcomes: "A balanced diet contains the right proportions of carbohydrate, protein, lipid, vitamins, minerals, water and dietary fibre. Vitamin C deficiency → scurvy. Vitamin D deficiency → rickets. Iron deficiency → anaemia. Calcium deficiency → weak bones. Protein deficiency → kwashiorkor. Energy needs vary with age, sex, activity level, pregnancy. Effects of malnutrition: starvation, obesity, coronary heart disease." },
      { code: "Bi7.2", title: "Alimentary canal and digestion",
        learningOutcomes: "The alimentary canal (gut) and its parts: mouth → oesophagus → stomach → small intestine (duodenum, ileum) → large intestine (colon) → rectum → anus. Ingestion, digestion (mechanical + chemical), absorption, assimilation, egestion. Digestive enzymes: salivary amylase (mouth, starch → maltose); pepsin (stomach, protein → peptides); lipase (pancreas/small intestine, lipid → fatty acids + glycerol); proteases (peptides → amino acids); amylase (pancreas)." },
      { code: "Bi7.3", title: "Absorption in the small intestine — villi",
        learningOutcomes: "Soluble products of digestion are absorbed through the wall of the small intestine into the blood. Villi increase surface area for absorption. Adaptations: large surface area, single-cell-thick walls (short diffusion path), good blood supply (capillary network maintains concentration gradient), lacteal for fat absorption. Water absorbed in the large intestine." },
    ],
  },
  {
    code: "Bi8", name: "Transport in plants",
    topics: [
      { code: "Bi8.1", title: "Xylem and phloem — uptake of water and minerals",
        learningOutcomes: "Xylem = transports water and dissolved mineral ions from roots upwards (one-way, dead, hollow, lignified). Phloem = transports sucrose + amino acids from leaves (source) to growing/storage tissues (sink) — translocation, two-way, living. Root hair cells absorb water by OSMOSIS and mineral ions by ACTIVE TRANSPORT. Transport via xylem in the stem to the leaves." },
      { code: "Bi8.2", title: "Transpiration",
        learningOutcomes: "Transpiration = the loss of water vapour from the leaves of plants through the stomata, mainly during the day. The transpiration pull draws water up the xylem. Factors that increase the rate: higher temperature, lower humidity, stronger wind, brighter light (stomata open wider). Use of a potometer to measure transpiration rate. Stomata close at night, in very dry conditions, and if the plant is wilting." },
    ],
  },
  {
    code: "Bi9", name: "Transport in animals (humans)",
    topics: [
      { code: "Bi9.1", title: "Circulatory system — heart structure and function",
        learningOutcomes: "Double circulation: heart pumps blood through TWO circuits — pulmonary (heart ↔ lungs) and systemic (heart ↔ body). Four chambers: right atrium + right ventricle (deoxygenated blood, to lungs); left atrium + left ventricle (oxygenated blood, to body). Valves: tricuspid + bicuspid (atrioventricular) + semilunar valves prevent backflow. The left ventricle has the thickest muscle (pumps to whole body)." },
      { code: "Bi9.2", title: "Blood vessels — arteries, veins, capillaries",
        learningOutcomes: "ARTERIES — thick muscular walls, narrow lumen, carry blood AWAY from the heart at HIGH pressure (no valves except where leaves heart). VEINS — thin walls, wide lumen, carry blood TOWARD the heart at LOW pressure, have VALVES to prevent backflow. CAPILLARIES — one-cell-thick walls (short diffusion path), narrow (one RBC at a time), site of exchange between blood and tissue fluid." },
      { code: "Bi9.3", title: "Blood — components and function",
        learningOutcomes: "Components: red blood cells (RBCs — biconcave disc, no nucleus, packed with haemoglobin, transport oxygen as oxyhaemoglobin); white blood cells (defence: phagocytes ingest pathogens, lymphocytes produce antibodies); platelets (clotting); plasma (yellow liquid, carries CO₂, urea, hormones, antibodies, nutrients). Haemoglobin + oxygen → oxyhaemoglobin in lungs; reverses in respiring tissues." },
    ],
  },
  {
    code: "Bi10", name: "Diseases and immunity",
    topics: [
      { code: "Bi10.1", title: "Pathogens, transmission, control",
        learningOutcomes: "Pathogens = disease-causing organisms (bacteria, viruses, fungi, protoctists). Transmission methods: airborne (droplets — colds, flu), waterborne (cholera), foodborne, contact (skin infections, STIs), insect vectors (malaria via mosquitoes). Body defences: skin barrier, mucus, stomach acid, blood clotting at wounds. Reducing spread: hygiene, sewage treatment, vaccination, isolation, vector control." },
      { code: "Bi10.2", title: "Immune response and vaccination",
        learningOutcomes: "When a pathogen enters the body, lymphocytes produce antibodies that bind specifically to antigens on the pathogen → destruction. Memory cells remain — fast secondary response on re-infection (active immunity). Vaccination introduces a weakened/dead form of the pathogen → triggers antibody production + memory cells without causing disease → protection. Herd immunity: if enough people are immune the pathogen can't spread effectively." },
    ],
  },
  {
    code: "Bi11", name: "Gas exchange in humans",
    topics: [
      { code: "Bi11.1", title: "Lung structure and ventilation",
        learningOutcomes: "Pathway: nose/mouth → trachea (rings of cartilage hold it open) → two bronchi → bronchioles → alveoli (air sacs). Ventilation = mechanical movement of air in and out. Inhalation: external intercostal muscles + diaphragm contract → rib cage moves up + out, diaphragm flattens → thoracic volume ↑, pressure ↓ → air rushes in. Exhalation: muscles relax → opposite changes → air forced out. Goblet cells produce mucus, ciliated cells sweep mucus + trapped particles up." },
      { code: "Bi11.2", title: "Gas exchange in alveoli — adaptations",
        learningOutcomes: "Alveoli are highly adapted for efficient gas exchange: very LARGE total surface area (millions of alveoli); ONE-CELL-THICK walls (short diffusion path); MOIST (gases dissolve before diffusing); RICH BLOOD SUPPLY (network of capillaries maintains concentration gradient by removing O₂ and bringing CO₂). O₂ diffuses from alveolus into blood; CO₂ diffuses out of blood into alveolus." },
    ],
  },
  {
    code: "Bi12", name: "Respiration",
    topics: [
      { code: "Bi12.1", title: "Aerobic respiration",
        learningOutcomes: "Aerobic respiration = chemical reactions in cells (mainly mitochondria) that use OXYGEN to break down nutrient molecules to release ENERGY. Word equation: glucose + oxygen → carbon dioxide + water (+ energy). Balanced symbol equation: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O. Energy is used for: muscle contraction, active transport, growth, protein synthesis, maintaining body temperature." },
      { code: "Bi12.2", title: "Anaerobic respiration",
        learningOutcomes: "Anaerobic respiration = breakdown of glucose WITHOUT oxygen, releasing much LESS energy per glucose. In animals/humans: glucose → lactic acid (during vigorous exercise). Lactic acid build-up causes muscle fatigue; the body owes an 'oxygen debt' that must be repaid by panting after exercise to break it down. In yeast: glucose → ethanol + carbon dioxide (used in brewing and bread-making — alcoholic fermentation)." },
    ],
  },
  {
    code: "Bi13", name: "Excretion in humans",
    topics: [
      { code: "Bi13.1", title: "Kidneys, ultrafiltration and selective reabsorption",
        learningOutcomes: "Excretion = removal of waste products of metabolism and substances in excess of requirements. Kidneys filter the blood to remove urea (made in the liver from excess amino acids), excess water + ions. Ultrafiltration in the glomerulus: high pressure forces small molecules (water, glucose, urea, ions) through the capillary wall into the Bowman's capsule. Selective reabsorption in the tubule: ALL glucose reabsorbed back into blood, plus required water + ions. Remaining liquid (urine) flows to bladder via ureter. The role of ADH in regulating water reabsorption." },
    ],
  },
  {
    code: "Bi14", name: "Coordination and response",
    topics: [
      { code: "Bi14.1", title: "Nervous system and reflex arc",
        learningOutcomes: "Nervous system: central (brain + spinal cord) + peripheral (nerves to/from body). Three types of neurones: sensory (receptor → CNS), relay (within CNS), motor (CNS → effector). Reflex arc = fast, automatic, involuntary response to stimulus: receptor → sensory neurone → relay neurone in spinal cord → motor neurone → effector → response. Example: hand on hot object → withdrawal. Synapses transmit signals between neurones via neurotransmitters." },
      { code: "Bi14.2", title: "The eye and sense organs",
        learningOutcomes: "Eye structure: cornea (refracts light), iris (controls light entering — pupil reflex), lens (focuses on retina — accommodation), retina (rods + cones — photoreceptors), optic nerve (signal to brain). Accommodation: ciliary muscles relax → suspensory ligaments tight → lens thin (focus far); muscles contract → ligaments slack → lens thick + round (focus near). Pupil reflex: bright light → circular iris muscles contract → pupil small (protects retina)." },
      { code: "Bi14.3", title: "Hormones and homeostasis",
        learningOutcomes: "Hormones = chemical substances produced by endocrine glands, carried by the blood, that act on target organs. Examples: adrenaline (adrenal glands — 'fight or flight'); insulin + glucagon (pancreas — blood glucose); testosterone, oestrogen, progesterone (sex hormones). Compare nerve (fast, short-lived, electrical, precise) vs hormonal (slower, longer-lasting, chemical, widespread) communication. Homeostasis = maintaining a constant internal environment (temperature, blood glucose, water). Insulin lowers blood glucose; glucagon raises it." },
    ],
  },
  {
    code: "Bi15", name: "Drugs",
    topics: [
      { code: "Bi15.1", title: "Medicinal and recreational drugs",
        learningOutcomes: "Drug = any substance taken into the body that modifies/affects chemical reactions in the body. Medicinal: antibiotics (treat bacterial infections; ineffective against viruses); painkillers (paracetamol, ibuprofen). Overuse of antibiotics → resistant bacteria evolve (e.g. MRSA) — only use when needed and complete the course. Effects of caffeine + harmful effects of excess sugar on health (briefly). Heroin + similar narcotics: highly addictive, withdrawal symptoms, social harms — not covered in detail." },
    ],
  },
  {
    code: "Bi16", name: "Reproduction",
    topics: [
      { code: "Bi16.1", title: "Asexual vs sexual reproduction",
        learningOutcomes: "Asexual reproduction = production of offspring from ONE parent without the fusion of gametes; offspring are genetically identical (clones). Advantages: fast, no mate needed, all favourable genes preserved. Disadvantages: no genetic variation → less adaptable to changing environment. Sexual reproduction: fusion of nuclei from male and female gametes → genetically varied offspring. Advantages: variation → adaptation. Disadvantages: slower, requires a mate." },
      { code: "Bi16.2", title: "Reproduction in flowering plants",
        learningOutcomes: "Flower parts and their functions: petals (attract pollinators), sepals (protect bud), stamen (male — anther produces pollen, filament holds anther up), carpel (female — stigma collects pollen, style, ovary contains ovules). Pollination = transfer of pollen from anther to stigma — insect (bright petals, scent, nectar) vs wind (small dull petals, feathery stigma, lots of light pollen). Fertilisation: pollen grain grows pollen tube down style → male nucleus fuses with female nucleus in ovule → zygote → seed." },
      { code: "Bi16.3", title: "Human reproductive system + menstrual cycle",
        learningOutcomes: "Male: testes (produce sperm + testosterone), scrotum, sperm duct, prostate gland, urethra, penis. Female: ovaries (produce eggs + oestrogen + progesterone), oviducts (fertilisation occurs), uterus (foetus develops), cervix, vagina. Menstrual cycle (~28 days): days 1–5 menstruation; ovulation around day 14; uterus lining thickens then sheds if no fertilisation. Hormones: FSH (stimulates egg development), LH (triggers ovulation), oestrogen + progesterone (regulate cycle, maintain lining)." },
      { code: "Bi16.4", title: "Pregnancy + birth + contraception + STIs",
        learningOutcomes: "Fertilisation in oviduct → zygote → implants in uterus lining. Placenta exchanges substances between mother + foetus (oxygen, nutrients in; CO₂, urea out). Amniotic fluid protects foetus. Birth: cervix dilates, uterine muscles contract, baby + then placenta delivered. Methods of contraception: natural (rhythm), barrier (condom, diaphragm), chemical (pill — hormones), surgical (vasectomy, tubal ligation), IUD. STIs: HIV → AIDS (no cure; weakens immune system); transmission via unprotected sex, blood, mother to baby." },
    ],
  },
  {
    code: "Bi17", name: "Inheritance",
    topics: [
      { code: "Bi17.1", title: "Chromosomes, genes, alleles",
        learningOutcomes: "Chromosomes = thread-like structures in the nucleus, made of DNA. Humans have 46 chromosomes (23 pairs). Genes = sections of DNA that code for a specific protein. Alleles = different versions of the same gene (e.g. for eye colour). Diploid (body cells, 46) vs haploid (gametes, 23). Mitosis = nuclear division → 2 genetically identical daughter cells (growth, repair, asexual reproduction). Meiosis = produces gametes (4 genetically different haploid cells) — provides variation." },
      { code: "Bi17.2", title: "Monohybrid inheritance and genetic diagrams",
        learningOutcomes: "Genotype = the genetic makeup (alleles, e.g. TT, Tt, tt). Phenotype = the physical expression (e.g. tall vs short). Dominant allele (capital, e.g. T) — expressed even when only one copy present; recessive (lowercase, t) — only expressed when homozygous (tt). Homozygous = same alleles (TT or tt); heterozygous = different (Tt). Construct genetic diagrams + Punnett squares for monohybrid crosses; calculate expected ratios (3:1, 1:1, etc.). Inheritance of sex: XX female, XY male. Codominance (e.g. ABO blood groups) — both alleles expressed in heterozygotes." },
    ],
  },
  {
    code: "Bi18", name: "Variation and selection",
    topics: [
      { code: "Bi18.1", title: "Variation, mutation, and natural selection",
        learningOutcomes: "Variation in a population can be continuous (e.g. height — wide range) or discontinuous (e.g. blood group — distinct categories). Causes: genetic (meiosis, mutation, random fertilisation) + environment. Mutation = a change in DNA — random, usually harmful but occasionally beneficial. NATURAL SELECTION: (1) variation exists in a population; (2) more offspring produced than environment can support — struggle for survival; (3) those better adapted survive and reproduce; (4) advantageous alleles passed on; (5) over generations the population evolves. Antibiotic-resistant bacteria + peppered moths as examples." },
      { code: "Bi18.2", title: "Artificial selection",
        learningOutcomes: "Artificial selection (selective breeding) = humans choose individuals with desirable traits to breed together, selecting offspring with the trait to continue breeding. Examples: high-yield dairy cows, disease-resistant crops, dogs bred for specific traits. Process is FASTER than natural selection. Concerns: reduced genetic variation → vulnerability to disease; sometimes harmful traits (e.g. pugs with breathing problems). Difference from natural selection: humans choose, not the environment." },
    ],
  },
  {
    code: "Bi19", name: "Organisms and their environment",
    topics: [
      { code: "Bi19.1", title: "Food chains, food webs, energy flow",
        learningOutcomes: "Food chain = sequence showing flow of energy from producer (plant — does photosynthesis) → primary consumer (herbivore) → secondary consumer (carnivore) → tertiary consumer. Food web = interconnected food chains. Energy is LOST at each trophic level (heat from respiration, undigested material, urine) — typically only ~10% transferred upwards. This limits the number of levels in a chain. Pyramids of numbers, biomass and energy." },
      { code: "Bi19.2", title: "Carbon and water cycles",
        learningOutcomes: "CARBON CYCLE: photosynthesis removes CO₂ from atmosphere (locks into glucose, then biomass); respiration of plants + animals + decomposers releases CO₂ back; combustion of fossil fuels + biomass releases CO₂; decomposition of dead organisms returns C to soil + atmosphere. Increasing atmospheric CO₂ → enhanced greenhouse effect → climate change. WATER CYCLE: evaporation (oceans) → condensation (clouds) → precipitation → runoff/groundwater → back to oceans. Transpiration from plants is a major contributor." },
      { code: "Bi19.3", title: "Populations and ecosystems",
        learningOutcomes: "Population = all the organisms of one species living in an area. Community = all the populations together. Ecosystem = the community + the abiotic environment. Factors affecting population size: food availability, predation, disease, competition (interspecific + intraspecific), abiotic factors (temperature, light, water). Population growth curves: lag → exponential → stationary → death phase. Carrying capacity = max sustainable population size given resources." },
    ],
  },
  {
    code: "Bi20", name: "Human influences on ecosystems",
    topics: [
      { code: "Bi20.1", title: "Pollution and conservation",
        learningOutcomes: "Air pollution: sulfur dioxide (from fossil fuels) → acid rain (damages buildings, harms plants + aquatic life); carbon dioxide → enhanced greenhouse effect → global warming + climate change. Water pollution: untreated sewage (eutrophication — algal blooms → low O₂ → fish death); fertiliser runoff (similar); oil spills (smother seabirds, harm marine life); pesticides (bioaccumulation up food chains). Conservation: protecting species + habitats — national parks, captive breeding, seed banks, sustainable fishing/forestry, recycling, reforestation." },
      { code: "Bi20.2", title: "Deforestation, food security, climate change",
        learningOutcomes: "Deforestation (cutting down forests for agriculture, timber, urban expansion) → loss of habitat → species extinction → reduced biodiversity; loss of carbon sink → more CO₂ in atmosphere; soil erosion + flooding. Food security: feeding a growing population — increasing yield via fertilisers, pesticides, selective breeding, GM crops — but with environmental + ethical trade-offs. Climate change: rising sea level, changing weather patterns, agricultural disruption, species range shifts." },
    ],
  },
  {
    code: "Bi21", name: "Biotechnology and genetic modification",
    topics: [
      { code: "Bi21.1", title: "Microorganisms in biotechnology",
        learningOutcomes: "Useful microorganisms: yeast in bread-making (CO₂ from anaerobic respiration makes dough rise) + brewing (ethanol). Bacteria in production of yoghurt + cheese (lactic acid fermentation). Production of penicillin (an antibiotic) by the fungus Penicillium in industrial fermenters — control of temperature, pH, oxygen, nutrients. Fermenters: large stainless-steel vessels with stirrers, water jackets, pH/temperature probes — provide optimum conditions." },
      { code: "Bi21.2", title: "Genetic modification (GM)",
        learningOutcomes: "Genetic modification = the transfer of a gene from one organism to another, often to a different species. Examples: bacteria modified to produce human insulin (used by diabetics); GM crops with herbicide resistance, insect resistance, or improved nutritional content (e.g. golden rice with vitamin A). Process overview: gene isolated → cut with restriction enzymes → inserted into a vector (often a plasmid) → vector inserted into host cell → host expresses the new gene. Ethical, social + environmental concerns: long-term effects unknown, gene flow to wild populations, multinational corporate control, religious/cultural objections." },
    ],
  },
];

/**
 * Seed Cambridge IGCSE Biology 0610 topic tree if it isn't there yet.
 * Subject-scoped: only inserts when zero Biology rows exist.
 */
export async function seedIgcseBiologyTopicsIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };

  const ok = await ensureIgcseBiologySubject();
  if (!ok) {
    console.error("[IGCSE] Cannot seed Biology topics — subject enum widening failed.");
    return { seeded: 0 };
  }

  try {
    const existing = await db.execute(sql`SELECT COUNT(*) AS c FROM igcse_topics WHERE subject='biology'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const count = Number(list?.[0]?.c ?? 0);
    if (count > 0) return { seeded: 0 };

    // Math 0..N, Physics 1000..N, Economics 2000..N, Business 3000..N,
    // Chemistry 4000..N (assumed); Biology starts at 5000 to stay grouped.
    let order = 5000;
    const rows: any[] = [];
    for (const area of AREAS) {
      for (const t of area.topics) {
        rows.push({
          subject: "biology",
          syllabus: "CIE_0610",
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
    console.log(`[IGCSE] Seeded ${rows.length} Biology topics for CIE 0610.`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Biology topic seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
