/**
 * Cambridge IGCSE Economics 0455 — curated exam-style exemplars.
 *
 * Authored content (NOT scraped past papers). Each exemplar pairs a question
 * with a Cambridge-style mark scheme using Economics examiner conventions:
 *   • Command words (Define, Identify, Explain, Analyse, Discuss/Evaluate)
 *     map to mark counts: typically 2, 1, 4, 6, 8.
 *   • Assessment Objectives (AO):
 *       AO1 = Knowledge (definitions, identification)
 *       AO2 = Understanding / Application
 *       AO3 = Analysis (cause→effect chains, "this leads to that")
 *       AO4 = Evaluation (two-sided argument + justified conclusion)
 *   • Mark scheme uses "level" descriptors for 6+ mark questions and
 *     points (1 per accurate point) for shorter ones.
 *
 * Used as RAG grounding for the AI Teacher (Learn mode) and as graded
 * attempts in Practice mode. Per-question incremental seeder: future
 * additions auto-seed on next deploy without duplicating.
 *
 * Target distribution (mirrors a real Paper 2 Extended): ~20% quick,
 * ~55% typical, ~25% longer.
 */
import { getDb } from "./db";
import { igcseExamples } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Ex = { topicCode: string; marks: number; question: string; markScheme: string; source?: string };

// All Economics topic codes are "E"-prefixed (e.g. "E2.7").
const EXAMPLES: Ex[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1–2 MARK quick questions: definitions and identifications (AO1).
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "E1.3", marks: 2,
    question: "Define opportunity cost.",
    markScheme: "1 mark: **the next best alternative** / second-best choice.\n1 mark: **forgone / given up / sacrificed** when a choice is made.\n**Full mark answer (2):** \"Opportunity cost is the next best alternative forgone when a choice is made.\"\nExamples (not required but help): choosing to study Economics means the opportunity cost is the History lesson you didn't attend.",
    source: "exam-style" },

  { topicCode: "E1.2", marks: 2,
    question: "Identify the four factors of production.",
    markScheme: "**Land, Labour, Capital, Enterprise  (B2 — all four).**\nB1 only if any 2 or 3 are listed correctly; 0 if fewer.\nWatch: 'money' is NOT a factor of production — it is a medium of exchange. Capital here means physical capital (machines, tools, buildings).",
    source: "exam-style" },

  { topicCode: "E2.3", marks: 2,
    question: "Define demand.",
    markScheme: "1 mark: **willingness AND ability** to buy a good.\n1 mark: at a given **price** (in a given time period).\n**Full mark answer:** \"Demand is the willingness and ability of consumers to buy a good at a given price.\"\nKey: 'wanting' something is not demand — you must also be ABLE to pay for it.",
    source: "exam-style" },

  { topicCode: "E2.7", marks: 2,
    question: "Write down the formula for price elasticity of demand (PED). State whether demand is described as 'elastic' or 'inelastic' if the PED value is 0.4.",
    markScheme: "1 mark: **PED = % change in quantity demanded ÷ % change in price**  (accept ΔQd/Qd ÷ ΔP/P).\n1 mark: PED = 0.4 is **less than 1** → demand is **inelastic.**\nKey: by convention PED is given as a positive number, even though the actual sign is negative (price and quantity move in opposite directions).",
    source: "exam-style" },

  { topicCode: "E4.5", marks: 1,
    question: "Identify ONE cause of demand-pull inflation.",
    markScheme: "Any ONE of: **rising consumer spending / rising government spending / increased exports / lower interest rates / tax cuts / rising consumer confidence / population growth**  **(B1)**.\nKey idea: anything that raises aggregate demand at or near full employment causes prices to be pulled up.",
    source: "exam-style" },

  { topicCode: "E3.1", marks: 2,
    question: "State two functions of money.",
    markScheme: "Any TWO of: **medium of exchange / store of value / unit of account / standard of deferred payment**  **(B2 — 1 mark each).**\nDefinitions are not required but help: a medium of exchange means money is accepted for goods and services; a store of value means it holds its purchasing power over time.",
    source: "exam-style" },

  { topicCode: "E6.3", marks: 2,
    question: "Define the exchange rate.",
    markScheme: "1 mark: **the price of one currency**...\n1 mark: ...**in terms of another currency.**\nExample answer: \"The exchange rate is the price of one currency expressed in terms of another (e.g. 1 USD = 16,000 IDR).\"",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3–4 MARK typical questions: explain WITH applied reasoning (AO1 + AO2).
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "E1.4", marks: 4,
    question: "Using a production possibility curve (PPC) diagram, explain the difference between a movement ALONG the PPC and an OUTWARD SHIFT of the PPC.",
    markScheme: "**Diagram (1 mark):** correctly drawn PPC with two goods on the axes, curve labelled.\n**Movement along (1 mark for identification + 1 for explanation):** moving between points ON the curve shows reallocating resources between the two goods — represents OPPORTUNITY COST (more of one means less of the other).\n**Outward shift (1 mark for identification + 1 for explanation, max 4):** the whole curve shifts outward → ECONOMIC GROWTH from more or better resources (more labour, new technology, more capital, discoveries of raw materials).\nMax 4: any 4 of the 5 points above.",
    source: "exam-style" },

  { topicCode: "E2.5", marks: 4,
    question: "Using a demand and supply diagram, explain how a price below the equilibrium price will return to equilibrium.",
    markScheme: "**Diagram (1):** standard D–S diagram with equilibrium P*, Q* labelled, and a P_low drawn below P*.\n**Identification of shortage (1):** at P_low, **quantity demanded > quantity supplied → SHORTAGE / excess demand**.\n**Mechanism (1):** consumers compete for the scarce good → **price is bid up**; producers see they can charge more and **expand supply** (movement along supply curve).\n**Equilibrium restored (1, max 4):** rising price reduces quantity demanded (movement along demand) until QD = QS at the equilibrium price P*.",
    source: "exam-style" },

  { topicCode: "E2.3", marks: 4,
    question: "Explain TWO factors, other than the good's own price, that could cause the demand curve for smartphones to SHIFT to the right.",
    markScheme: "1 mark for naming each factor + 1 mark for applied explanation (max 4):\n• **Higher consumer income** → smartphones are a normal good, so consumers buy more at every price → demand shifts right.\n• **Fall in price of complement (e.g. mobile data plans)** → people now demand more smartphones to use with the cheaper data.\n• **Rise in price of substitute (e.g. tablets)** → consumers switch from tablets to smartphones, raising smartphone demand.\n• **Advertising / changes in taste/fashion** → new model becomes desirable → demand rises at every price.\n• **Growing population** → more buyers → more demand at every price.\nAny two well-explained = full marks. Distinct factors required.",
    source: "exam-style" },

  { topicCode: "E2.7", marks: 4,
    question: "Explain why the demand for cigarettes tends to be price INELASTIC.",
    markScheme: "1 mark for each accurate point, max 4:\n• Cigarettes are **addictive** → consumers feel compelled to buy regardless of price changes.\n• **Few close substitutes** → there is no alternative product that gives the same effect.\n• They tend to take a **small proportion of income** → even a large % price rise has little impact on overall purchasing power.\n• Considered a **necessity** by addicted users.\n• **Short time period** → habits and addictions are hard to break quickly.\nFor full marks: at least two distinct points, each clearly explained in the context of cigarettes (not generic).",
    source: "exam-style" },

  { topicCode: "E2.10", marks: 4,
    question: "Explain, using ONE example, what is meant by a 'negative externality of production'.",
    markScheme: "**Definition (1 mark):** A negative externality is a **cost imposed on a THIRD PARTY** by an economic activity (production or consumption) for which they are **not compensated**.\n**Of PRODUCTION (1 mark):** The third-party cost arises from the producer's activity (not the consumer's).\n**Example (1 mark):** A factory polluting a river — **third parties** = nearby residents, fishermen.\n**Effect (1 mark, max 4):** The market price does not reflect the true social cost → over-production from a society's perspective → market failure.\nCommon error: confusing 'negative externality of production' with 'of consumption' (e.g. second-hand smoke). The KEY distinguisher is whether the external cost arises from making the good or using it.",
    source: "exam-style" },

  { topicCode: "E3.6", marks: 4,
    question: "Explain two INTERNAL economies of scale a large car manufacturer might enjoy.",
    markScheme: "1 mark for naming each + 1 mark for explanation (max 4):\n• **Technical:** large output justifies buying expensive specialised machinery (e.g. robot welders) → lower cost per car.\n• **Purchasing (bulk-buying):** large orders of steel/electronics get supplier discounts → lower input cost per car.\n• **Financial:** large firms can borrow at lower interest rates because banks see them as less risky.\n• **Managerial:** can hire specialist managers (finance, HR, marketing) whose salary cost is spread over many cars.\n• **Marketing:** advertising cost is spread over millions of cars → low marketing cost per unit.\n• **Risk-bearing:** can diversify across many models and markets — failure of one model is absorbed.\nAny two distinct types, each explained in context of a car manufacturer = full marks.",
    source: "exam-style" },

  { topicCode: "E3.7", marks: 3,
    question: "A bakery has fixed costs of \\$1,200 per month and variable costs of \\$0.40 per loaf. It produces and sells 4,000 loaves per month at \\$1.50 each.\n(a) Calculate the bakery's total cost for the month.\n(b) Calculate its monthly profit.",
    markScheme: "(a) Variable costs = 4000 × 0.40 = \\$1600 **(M1)**\n  Total cost = FC + VC = 1200 + 1600 = **\\$2800  (A1)**\n(b) Total revenue = 4000 × 1.50 = \\$6000\n  Profit = TR − TC = 6000 − 2800 = **\\$3200  (A1, max 3)**\nNote: even Economics paper occasionally tests basic cost/profit arithmetic — show the formula before substituting.",
    source: "exam-style" },

  { topicCode: "E4.2", marks: 4,
    question: "Explain how a CUT in interest rates by the central bank could increase the rate of economic growth.",
    markScheme: "Mark for each clear step in the transmission chain (max 4):\n• Lower interest rate makes **borrowing cheaper** for households and firms (B1).\n• Households **borrow more for spending** (cars, housing) → consumption ↑ (B1).\n• Firms **invest more** in machinery/expansion as cost of finance falls (B1).\n• Saving becomes less attractive → reinforces higher spending (B1).\n• ↑ AD → firms produce more → ↑ **real GDP / economic growth** (B1).\nUp to 4 marks total. The chain must logically link from rate cut to higher growth.",
    source: "exam-style" },

  { topicCode: "E4.4", marks: 4,
    question: "Distinguish between STRUCTURAL and CYCLICAL unemployment, giving an example of each.",
    markScheme: "**Structural (2):** unemployment caused by a **long-term change in industry structure** (decline of an industry / change in technology / change in trade patterns) leaving workers' skills mismatched. **Example:** UK coal miners after the 1980s pit closures; manufacturing workers replaced by automation.\n**Cyclical (2):** unemployment caused by a **fall in aggregate demand during a recession** (the business cycle). **Example:** workers laid off during the 2008 financial crisis or 2020 COVID lockdown.\nKey distinction: structural is a long-term skills mismatch (won't simply disappear when growth resumes); cyclical is short-term and reverses as the economy recovers.",
    source: "exam-style" },

  { topicCode: "E4.5", marks: 4,
    question: "Explain two consequences of high inflation for an economy.",
    markScheme: "1 mark for naming + 1 mark for explanation (max 4):\n• **Erodes purchasing power / hurts savers** — money's real value falls; people on fixed incomes (pensioners) lose out.\n• **Damages export competitiveness** — domestic goods become relatively expensive abroad → fall in exports → worsening current account.\n• **Reduces investment** — uncertainty about future prices discourages firms from long-term planning.\n• **Wage-price spirals** — workers demand higher wages → firms pass costs into prices → further inflation.\n• **Menu costs and shoe-leather costs** — frequent re-pricing, constant trips to the bank.\n• **Redistributes wealth** — debtors gain (real value of debt falls), savers/lenders lose.\nAny two well-explained = 4 marks. Avoid listing without explanation.",
    source: "exam-style" },

  { topicCode: "E5.1", marks: 4,
    question: "Explain why GDP per capita can be a poor indicator of a country's standard of living.",
    markScheme: "Mark for each accurate point, max 4:\n• It is an **average** → hides INEQUALITY of distribution; the country could have a few very rich and many poor.\n• Excludes **non-market activity** (subsistence farming, household work, the informal economy) → understates wellbeing in developing countries.\n• Doesn't capture **non-material** factors: health, education, leisure, freedom, environment, security.\n• Ignores **negative externalities** of growth (pollution, congestion, stress).\n• Doesn't reflect what is being produced — military expenditure counts the same as healthcare.\n• Currency conversion may distort comparisons (use of PPP can help).\nHDI is often used as a fuller indicator (income + life expectancy + education).",
    source: "exam-style" },

  { topicCode: "E6.3", marks: 4,
    question: "Explain how a DEPRECIATION of a country's currency could affect its current account balance.",
    markScheme: "**Definition (1):** Depreciation = the currency falls in value relative to others.\n**Effect on exports (1):** Domestic goods become **cheaper abroad** → quantity of exports rises.\n**Effect on imports (1):** Imported goods become **more expensive** → quantity of imports falls.\n**Net effect on current account (1, max 4):** With higher export revenue and lower import spending, the current account balance **improves** (deficit shrinks / surplus widens).\n*Marshall-Lerner caveat (bonus context):* this only holds if combined elasticities of demand for exports + imports > 1. In the short run effects can be perverse (J-curve effect), but Cambridge typically expects the standard improvement answer at IGCSE level.",
    source: "exam-style" },

  { topicCode: "E6.2", marks: 4,
    question: "A government imposes a tariff on imported steel. Explain TWO likely effects on the domestic economy.",
    markScheme: "1 mark for naming + 1 mark for explanation (max 4):\n• **Domestic steel producers benefit** — imports become more expensive → domestic steel is more competitive → output and employment in domestic steel industry rise.\n• **Higher prices for consumers + downstream firms** — car-makers, construction firms paying more for steel → may raise prices of final goods.\n• **Government tax revenue rises** — the tariff collected on imports goes to the government.\n• **Risk of retaliation** — trading partners impose their own tariffs → domestic exporters hurt.\n• **Inefficiency** — protected domestic producers may lack incentive to cut costs / innovate.\nAny two distinct, well-explained effects = full marks.",
    source: "exam-style" },

  { topicCode: "E3.8", marks: 4,
    question: "Explain TWO disadvantages to consumers of a market dominated by a monopoly.",
    markScheme: "1 mark for naming + 1 mark for explanation (max 4):\n• **Higher prices** — no competitive pressure → monopoly can charge above the competitive level.\n• **Less choice** — only one supplier means a narrower range of products / no variety.\n• **Lower quality / less innovation** — without competition there is little pressure to improve.\n• **Worse service** — no risk of consumers switching → poor customer service tolerated.\n• **Possible exploitation** — captive consumers (e.g. utilities) have nowhere else to turn.\nAny two distinct, well-explained = 4 marks.",
    source: "exam-style" },

  { topicCode: "E3.3", marks: 4,
    question: "Explain TWO reasons why a surgeon is paid more than a cleaner.",
    markScheme: "1 mark for naming + 1 mark for explanation (max 4):\n• **Skill / qualifications required** — surgeons need ~10+ years of education and training → restricted supply of labour → higher equilibrium wage.\n• **Limited supply** — relatively few people are willing AND able to become surgeons.\n• **High demand for service** — healthcare is essential → derived demand for surgeons.\n• **Difficulty + responsibility** — surgeons make life-or-death decisions → wage premium for stress/danger.\n• **Trade union / professional body power** — medical associations can restrict entry and bargain for high pay.\nWage differential = explained by supply of and demand for that specific labour.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5+ MARK longer questions: ANALYSE (6) and DISCUSS/EVALUATE (8).
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "E2.10", marks: 6,
    question: "Analyse how a government could correct the market failure caused by negative externalities of consumption (e.g. smoking).",
    markScheme: "L3 (5–6): Clear identification of the market failure + at least TWO well-developed policy responses with full cause-effect chains showing how each corrects the failure.\nL2 (3–4): Some accurate analysis of one policy, or a list of policies with brief explanation.\nL1 (1–2): Vague references to government action, no clear chain.\n\nKey points:\n• Identify the failure: market over-consumes the good (private benefit > social benefit; third-party costs ignored).\n• **Indirect tax** (e.g. tobacco duty) → raises price → reduces quantity demanded → moves consumption toward the socially optimal level. Also raises government revenue for healthcare.\n• **Regulation** (smoking bans in public places, age limits) → directly reduces consumption + protects third parties.\n• **Information / education** (advertising, warning labels) → reduces demand by changing perceptions of private benefit.\n• **Subsidy on substitutes** (e.g. nicotine replacement therapy) → shifts consumers to a less harmful alternative.\n\nFor L3, the answer must SHOW the mechanism (how the tax/regulation/info changes behaviour and outcomes), not just list policies.",
    source: "exam-style" },

  { topicCode: "E4.4", marks: 6,
    question: "Analyse the consequences of high unemployment for a national economy.",
    markScheme: "L3 (5–6): Multiple consequences identified across DIFFERENT GROUPS (workers, firms, government, society) with clear cause-effect explanation.\nL2 (3–4): Some consequences explained but limited range.\nL1 (1–2): List of consequences without explanation.\n\nKey points to develop:\n• **Workers / households**: lost income → falling living standards, poverty, stress, mental health problems; loss of skills the longer they are out of work.\n• **Government**: rising welfare payments (unemployment benefits) AND falling tax revenue (less income tax, less VAT) → budget deficit worsens → may have to cut other public services or raise taxes.\n• **Firms**: lower aggregate demand → lower sales and profits (vicious cycle); BUT they can pay lower wages (more labour available).\n• **Society**: rising poverty + inequality → potentially higher crime, social unrest, family breakdown.\n• **Economy as a whole**: real output is below potential — actual GDP < potential GDP → 'output gap' wastes resources.\n\nL3 answer demonstrates cause-effect chains and covers multiple groups.",
    source: "exam-style" },

  { topicCode: "E4.5", marks: 8,
    question: "Discuss whether a government should use HIGHER INTEREST RATES to reduce inflation. Refer to the costs as well as the benefits of doing so.",
    markScheme: "Marked on 4-level Cambridge scale:\nL4 (7–8): Balanced analysis of BENEFITS and COSTS with a JUSTIFIED CONCLUSION.\nL3 (5–6): Both sides explained but conclusion missing or weak.\nL2 (3–4): One side explained well, the other only mentioned.\nL1 (1–2): Mostly description, no real analysis.\n\nBENEFITS of higher interest rates:\n• **Reduces consumer borrowing + spending** → lower AD → reduces demand-pull inflation.\n• **Encourages saving** → also reduces consumption.\n• **Currency appreciates** (hot money flows in) → cheaper imports → reduces imported inflation.\n• **Anchors inflation expectations** → less wage-price spiral.\n\nCOSTS:\n• **Slows economic growth** — reduced consumption + investment → lower GDP.\n• **Higher unemployment** — firms cut output and hiring.\n• **Hurts borrowers** (especially homeowners with variable-rate mortgages → less disposable income).\n• **Damages exports** as the appreciation makes them more expensive abroad → worsens current account.\n• **Ineffective against cost-push inflation** (e.g. oil-price shock) — rate rises do nothing about the underlying cost.\n\nCONCLUSION (needed for L4):\n• Best when inflation is demand-pull AND the economy is overheating.\n• Less effective against cost-push inflation — better to combine with supply-side measures.\n• Should consider the trade-off with growth + unemployment (the 'sacrifice ratio').",
    source: "exam-style" },

  { topicCode: "E2.7", marks: 6,
    question: "Analyse how knowledge of the price elasticity of demand could help a firm decide whether to raise or lower the price of its product.",
    markScheme: "L3 (5–6): Both elastic AND inelastic cases analysed with clear revenue conclusions, plus consideration of context.\nL2 (3–4): One case analysed.\nL1 (1–2): States the formula or definitions without applying.\n\nKey content:\n• **If demand is PRICE INELASTIC (PED < 1):** raising price causes a SMALLER % fall in quantity → total revenue rises. So a firm with inelastic demand benefits from RAISING price (e.g. branded goods, addictive products).\n• **If demand is PRICE ELASTIC (PED > 1):** raising price causes a LARGER % fall in quantity → total revenue falls. The firm should LOWER price to gain revenue (e.g. mass-market consumer goods with many substitutes).\n• **Unit elastic (PED = 1):** revenue unchanged by price.\n• Firm should also consider: profit (not just revenue — changes in cost matter); long-run effects (will substitutes emerge?); competitor reactions; brand image.\n\nL3 answer applies the rule to a specific example AND notes that PED isn't the only consideration.",
    source: "exam-style" },

  { topicCode: "E6.2", marks: 8,
    question: "Discuss whether free trade is more beneficial than protectionism for a developing country.",
    markScheme: "L4 (7–8): Balanced analysis covering BOTH free trade benefits AND protectionism's case, applied to DEVELOPING country context, with justified conclusion.\nL3 (5–6): Both sides covered but limited application to developing country context.\nL2 (3–4): One-sided.\nL1 (1–2): Description without analysis.\n\nFREE TRADE benefits:\n• **Comparative advantage** → higher world output, gains from specialisation.\n• **Cheaper imports** → lower prices, higher living standards for consumers.\n• **Access to capital + technology** from developed economies.\n• **Competition** improves efficiency of domestic firms.\n• **Export-led growth** opportunity — Indonesia, China, Vietnam all examples.\n\nPROTECTIONISM arguments:\n• **Infant industry argument** — protect new industries until they reach minimum efficient scale and can compete globally.\n• **Avoid over-dependence** on primary commodity exports (vulnerable to world price swings).\n• **Job protection** in vulnerable sectors during transition.\n• **Anti-dumping** — prevent foreign firms selling below cost to destroy domestic competitors.\n• **Tariff revenue** for governments with weak tax-collection systems.\n• **Strategic industries** (e.g. food security, defence).\n\nDEVELOPING-COUNTRY specifics:\n• Often have weak negotiating power → may not get fair terms in 'free trade' agreements.\n• May lack the diversified economy + competitive industries needed to benefit from free trade immediately.\n• Risk of being locked into low-value-added activities (primary commodities).\n\nCONCLUSION (L4):\n• Typical justified answer: SOME protection for infant industries in the short term, combined with gradual liberalisation as industries mature → 'managed' opening.\n• Pure protectionism stifles efficiency; pure free trade can hurt vulnerable sectors prematurely.\n• Final judgment should consider WHICH developing country (large vs small, resource-rich vs not).",
    source: "exam-style" },

  { topicCode: "E4.2", marks: 8,
    question: "Discuss whether fiscal policy or monetary policy is more effective at reducing a recession.",
    markScheme: "L4 (7–8): Both policies analysed with strengths AND weaknesses, applied to recession context, justified conclusion.\nL3 (5–6): Both covered but limited evaluation.\nL2 (3–4): One side dominates.\nL1 (1–2): Description only.\n\nFISCAL POLICY (G↑, T↓):\n• Strengths: directly increases AD via government spending; targeted (can be aimed at specific sectors / regions); creates jobs in public-works projects; doesn't depend on banks lending.\n• Weaknesses: time lags (legislation, then implementation); large budget deficits → debt sustainability concerns; political constraints; possible 'crowding out' of private investment.\n\nMONETARY POLICY (interest rates ↓, QE):\n• Strengths: faster to implement (central bank decision); less politically constrained; affects whole economy via lending costs; can be reversed quickly.\n• Weaknesses: in a deep recession may be ineffective at very low rates (liquidity trap); depends on banks being willing to lend AND households/firms wanting to borrow (often weak in a recession — 'pushing on a string'); benefits asset-holders more than the poor → equity concerns.\n\nCONTEXT MATTERS:\n• Mild recession + functioning banks → monetary policy probably enough.\n• Deep recession + impaired banks (e.g. 2008–2009) → fiscal policy is usually more effective.\n• Best practice: USE BOTH together (coordinated policy mix).\n\nCONCLUSION: typical L4 answer concludes that fiscal is generally more effective in DEEP recessions because monetary policy hits a zero-lower-bound, but both should usually be used in combination.",
    source: "exam-style" },

  { topicCode: "E5.4", marks: 6,
    question: "Analyse the role that international AID can play in promoting economic development in a low-income country.",
    markScheme: "L3 (5–6): At least TWO ways aid promotes development, fully explained with chains of reasoning, AND mention of limits/drawbacks.\nL2 (3–4): Two ways explained but limits not addressed.\nL1 (1–2): Listing only.\n\nROLES of aid:\n• **Capital injection** for infrastructure (roads, ports, electricity) → improves productive capacity + attracts further investment.\n• **Humanitarian relief** (food, medical, disaster) → keeps the population alive and able to work / learn.\n• **Education + healthcare aid** → builds human capital → higher productivity in the long run.\n• **Technical assistance** → transfers skills, technology, best practices.\n• **Filling the savings gap** — domestic saving in low-income countries often too low to fund investment; aid bridges this.\n\nLIMITS / DRAWBACKS:\n• **Tied aid** — recipient must spend it on donor's exports → captures the benefit for the donor.\n• **Aid dependency** — long-term reliance undermines domestic industries and incentives to reform.\n• **Corruption** — aid may not reach intended beneficiaries.\n• **Distorts markets** — food aid can undercut local farmers.\n\nL3 answer: 2–3 well-developed roles + acknowledgement that aid is one tool, often less effective than trade, FDI, or institutional reform.",
    source: "exam-style" },
];

/**
 * Per-question incremental seeder for Economics exemplars. Mirrors the
 * Physics/Math seeders: dedup by (topicCode + question prefix).
 */
export async function seedIgcseEconomicsExamplesIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };
  try {
    const existing = await db.execute(sql`SELECT topicCode, question FROM igcse_examples WHERE topicCode LIKE 'E%'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const dedupKey = (code: string, q: string) => `${code}::${q.slice(0, 120)}`;
    const present = new Set<string>(list.map((r: any) => dedupKey(String(r?.topicCode || ""), String(r?.question || ""))));

    const rows: any[] = [];
    let sortOrder = 2000;
    for (const e of EXAMPLES) {
      if (present.has(dedupKey(e.topicCode, e.question))) continue;
      rows.push({
        topicCode: e.topicCode,
        syllabus: "CIE_0455",
        tier: "extended" as const,
        marks: e.marks,
        question: e.question,
        markScheme: e.markScheme,
        source: e.source || "exam-style",
        sortOrder: sortOrder++,
      });
    }

    if (!rows.length) {
      console.log(`[IGCSE] Economics exemplars already complete (${list.length} rows in DB, ${EXAMPLES.length} in seed file).`);
      return { seeded: 0 };
    }
    await db.insert(igcseExamples).values(rows);
    console.log(`[IGCSE] Seeded ${rows.length} new Economics exemplars (total now ${list.length + rows.length}).`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Economics exemplar seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
