/**
 * Cambridge IGCSE Business Studies 0450 — curated exam-style exemplars.
 *
 * Authored content (NOT scraped past papers). Each exemplar pairs a question
 * with a Cambridge-style mark scheme using Business Studies conventions:
 *   • Command words (Identify, Define, Explain, Analyse, Discuss/Recommend)
 *     map to mark counts: 1, 2, 4, 6, 8 (sometimes 10–12 for case-study Q3+).
 *   • Assessment Objectives (AO):
 *       AO1 = Knowledge (define, identify)
 *       AO2 = Application (use the context — the business in the question)
 *       AO3 = Analysis (cause→effect chains)
 *       AO4 = Evaluation (judgment + recommendation + justification)
 *   • Mark scheme uses "level" descriptors for 6+ mark questions and
 *     points (1 per accurate point) for shorter ones.
 *
 * Content rules: examples kept age-appropriate (food/retail/electronics/
 * transport/online services). No substances, gambling, weapons, or
 * politically/religiously sensitive framings.
 *
 * Target distribution (mirrors a real Paper 2 (Extended) — case-study based):
 * ~20% quick (1-2), ~50% typical (3-4), ~30% longer (6-8).
 */
import { getDb } from "./db";
import { igcseExamples } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Ex = { topicCode: string; marks: number; question: string; markScheme: string; source?: string };

// All Business topic codes are "B"-prefixed (e.g. "B3.4").
const EXAMPLES: Ex[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1–2 MARK quick questions: definitions and identifications (AO1).
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "B1.1", marks: 2,
    question: "Define 'added value' in business.",
    markScheme: "1 mark: the **difference between the selling price** of a finished good/service\n1 mark: and the **cost of the bought-in materials / inputs** used to make it.\nFull-mark answer: 'Added value is the difference between the selling price of a product and the cost of the bought-in materials used to make it.'\nExample (helps but not required): a bakery buys flour, sugar and eggs for $1 and sells a cake for $5 → added value = $4.",
    source: "exam-style" },

  { topicCode: "B1.4", marks: 2,
    question: "Identify two characteristics of a sole trader.",
    markScheme: "Any TWO of (B1 each, max 2):\n• **One owner** who runs the business.\n• **Unlimited liability** — the owner is personally responsible for all business debts.\n• **Simple to set up** — minimal legal formalities.\n• **All profits belong to the owner.**\n• **Owner makes all decisions** (full control, no need to consult).\n• **Limited finance** options (relies on personal savings + small loans).\n• **No continuity** — business ends if owner retires or dies.",
    source: "exam-style" },

  { topicCode: "B2.1", marks: 2,
    question: "State two FINANCIAL methods of motivating workers.",
    markScheme: "Any TWO of (B1 each, max 2):\n• Wages (time rate or piece rate)\n• Salary\n• Performance-related pay / bonus\n• Commission (often used in sales)\n• Profit-sharing\n• Share ownership / share options\n• Fringe benefits with monetary value (company car, free meals, health insurance)\nKey distinction from non-financial: financial motivators give the worker money or money-equivalent.",
    source: "exam-style" },

  { topicCode: "B3.2", marks: 2,
    question: "Define 'primary market research'.",
    markScheme: "1 mark: market research that involves **collecting NEW data directly** from the market\n1 mark: for **a specific purpose** of the business (e.g. surveys, interviews, focus groups, observation).\nFull-mark answer: 'Primary research is the collection of new, original data directly from customers or potential customers for a specific purpose of the business — e.g. through surveys, interviews or focus groups.'",
    source: "exam-style" },

  { topicCode: "B3.4", marks: 2,
    question: "Define 'penetration pricing'.",
    markScheme: "1 mark: a pricing strategy of setting **a low price** (lower than competitors or lower than the long-term planned price)\n1 mark: in order to **enter a new market quickly / gain market share / attract customers**.\nFull-mark answer: 'Penetration pricing is setting a deliberately low price when entering a new market in order to attract customers and gain market share, with the intention of raising it later.'",
    source: "exam-style" },

  { topicCode: "B5.1", marks: 2,
    question: "Identify two SHORT-TERM sources of finance.",
    markScheme: "Any TWO of (B1 each, max 2):\n• **Bank overdraft** — facility to draw more than is in the account, up to a limit.\n• **Trade credit** — buying from suppliers now, paying in 30/60/90 days.\n• **Debt factoring** — selling outstanding invoices to a factoring company for immediate cash (at a discount).\n• **Short-term bank loan** (under 1 year).\nKey: short-term ≤ 1 year; medium = 1–5 yrs; long-term > 5 yrs.",
    source: "exam-style" },

  { topicCode: "B5.5", marks: 2,
    question: "A business has a Gross Profit of $80,000 and Revenue of $200,000. Calculate the Gross Profit Margin.",
    markScheme: "Use formula: GPM = (Gross Profit / Revenue) × 100 **(M1)**\nGPM = (80,000 / 200,000) × 100 = **40%  (A1)**\nKey rule: GPM tells you what % of every sales dollar is left after paying for cost of sales.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3–4 MARK typical questions: explain WITH applied reasoning (AO1 + AO2).
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "B1.4", marks: 4,
    question: "Explain TWO advantages of a private limited company (Ltd) compared to a sole trader.",
    markScheme: "1 mark for naming each advantage + 1 mark for development (max 4):\n• **Limited liability** — shareholders only risk the amount they invested, not personal assets (unlike a sole trader who is personally liable for all business debts).\n• **More finance available** — can sell shares to family/friends/private investors → expand more easily.\n• **Continuity** — the company has its own legal identity; if a shareholder dies the business continues.\n• **Separation of ownership and management** — owners (shareholders) don't have to run the business day-to-day.\n• **More credibility** with suppliers and lenders than a sole trader.\nAny TWO well-explained advantages = 4 marks.",
    source: "exam-style" },

  { topicCode: "B1.5", marks: 4,
    question: "A clothing manufacturer is considering moving production to a cheaper location overseas. Explain how this decision could create CONFLICT between two of its stakeholder groups.",
    markScheme: "Mark for each pair of stakeholders + the conflict explained (max 4):\n• **Shareholders vs employees:** Shareholders want higher profits (cheaper production = higher returns); employees in the home country face redundancy → loss of income.\n• **Local community vs shareholders:** Local community loses jobs + income; the area's economy may decline; shareholders gain higher dividends.\n• **Customers vs employees:** Customers may benefit from lower prices passed on; existing employees lose jobs.\n• **Suppliers (local) vs shareholders:** Local suppliers lose orders → may go out of business; shareholders gain.\nAny one clear pair, conflict named AND both sides' interests explained = 4 marks. Identifying the stakeholders alone = max 2.",
    source: "exam-style" },

  { topicCode: "B2.1", marks: 4,
    question: "Explain TWO non-financial methods that a fast-food restaurant chain could use to motivate its workers.",
    markScheme: "1 mark for naming each method + 1 mark for explanation in context (max 4):\n• **Job rotation** — workers move between stations (counter, kitchen, drive-through) to reduce boredom and develop multiple skills.\n• **Job enrichment** — giving workers more responsibility (e.g. opening/closing the store, training new staff) so the role feels more meaningful.\n• **Teamwork** — assigning shift teams who share success → builds belonging + social motivation (Maslow social need).\n• **Recognition / Employee of the Month** — public praise for good performance → esteem need.\n• **Training and career development** — clear path to assistant manager / manager → self-actualisation.\nMust be APPLIED to the fast-food context, not generic.",
    source: "exam-style" },

  { topicCode: "B2.2", marks: 4,
    question: "Distinguish between an AUTOCRATIC and a DEMOCRATIC leadership style. In each case give one situation where it would be most appropriate.",
    markScheme: "**Autocratic (2 marks):** the leader **makes all decisions alone** and tells subordinates what to do; little/no consultation. **Most appropriate when:** decisions must be made quickly (emergency), workers are inexperienced + need clear instructions (e.g. fire drill, military, dangerous machinery), or work is highly routine.\n**Democratic (2 marks):** the leader **involves the team in decisions**, takes ideas and votes; encourages discussion. **Most appropriate when:** team has expertise to contribute (creative work, R&D), motivation is critical (employees commit more if they helped decide), the issue is complex with multiple views.\nKey distinction: WHERE the decision-making sits.",
    source: "exam-style" },

  { topicCode: "B2.3", marks: 4,
    question: "Explain TWO advantages of INTERNAL recruitment over external recruitment.",
    markScheme: "1 mark for naming + 1 mark for explanation (max 4):\n• **Cheaper** — no advertising costs, no agency fees, no need for relocation packages.\n• **Faster** — no application + shortlisting from scratch; the candidate is known and available immediately.\n• **The candidate is already known** — strengths and weaknesses are visible from track record, reducing the risk of a wrong hire.\n• **Motivates staff** — workers see real opportunities for promotion → harder work, lower labour turnover.\n• **Candidate already knows the business** — culture, systems, products — so induction is quicker, productivity returns sooner.\nAny TWO well-explained = full marks.",
    source: "exam-style" },

  { topicCode: "B3.3", marks: 4,
    question: "A smartphone is in the MATURITY stage of its product life cycle. Explain TWO extension strategies the manufacturer could use to extend sales.",
    markScheme: "1 mark for naming + 1 mark for explanation in context (max 4):\n• **Add new features / launch updated version** — e.g. better camera, more storage, faster chip → attract upgrade buyers and brand fans.\n• **New marketing campaign / repackaging** — fresh advertising, new colours, celebrity endorsement → renew interest.\n• **Enter new markets** — launch in additional countries / target younger or older demographics with different positioning.\n• **Reduce price** — competitive or promotional pricing → attract price-sensitive buyers who delayed purchase.\n• **Find new uses or bundle** — partner with mobile networks, offer trade-in deals, bundle with accessories.\nAny TWO clearly applied to the smartphone context = 4 marks.",
    source: "exam-style" },

  { topicCode: "B3.4", marks: 4,
    question: "Explain why a business launching a NEW premium-quality wireless headphone might choose a SKIMMING pricing strategy.",
    markScheme: "1 mark per accurate point, max 4:\n• Skimming = launching at a **HIGH price** to maximise revenue from customers who value the product most.\n• Works well for a **premium / innovative product** where buyers expect quality + are willing to pay for status / early access.\n• **Recovers high R&D costs faster** before competitors copy the design.\n• High initial price **reinforces a premium brand image** (cheap launch would undermine the positioning).\n• The business can **lower price later** as the market matures (extension strategy) without permanently damaging the brand.\nMust apply to the headphone context, not just define skimming.",
    source: "exam-style" },

  { topicCode: "B3.6", marks: 4,
    question: "Explain ONE advantage of ABOVE-THE-LINE advertising and ONE advantage of BELOW-THE-LINE promotion.",
    markScheme: "**Above-the-line (TV, radio, newspapers, online display ads, billboards) — 2 marks:**\n• **Massive reach** — millions can see one TV/online ad, ideal for a national or international product launch. (1)\n• **Builds brand awareness + image** quickly through repeated exposure. (1)\n**Below-the-line (sales promotions, sponsorship, direct mail, in-store displays, social-media influencers) — 2 marks:**\n• **More targeted** — can reach a specific demographic or local area, less waste on uninterested viewers. (1)\n• **Often cheaper per response** and easier to measure (BOGOF redemption, code uses, click-throughs). (1)\nAny one strong advantage per type = 4 marks.",
    source: "exam-style" },

  { topicCode: "B4.1", marks: 4,
    question: "Compare BATCH production with FLOW (mass) production, giving one strength of each.",
    markScheme: "**Batch (2):** producing **groups of identical items** before switching to a different batch. Strength — **flexibility**: different products (e.g. different flavours of jam) can be made on the same line, suited to varied demand.\n**Flow (2):** **continuous mass production** of identical items, often on an assembly line. Strength — **low unit cost** through large economies of scale + automation; high output rate; consistent quality.\nKey trade-off: batch = flexibility but downtime between batches; flow = efficiency but inflexible + needs huge demand.",
    source: "exam-style" },

  { topicCode: "B4.2", marks: 4,
    question: "A business has fixed costs of \\$30,000 per month. Each unit sells for \\$50 and has variable cost of \\$20.\n(a) Calculate the contribution per unit.\n(b) Calculate the break-even output per month.\n(c) Calculate the margin of safety if the business currently produces 1,500 units per month.",
    markScheme: "(a) Contribution per unit = Selling price − Variable cost = 50 − 20 = **\\$30  (B1)**\n(b) Break-even output = Fixed Costs / Contribution per unit = 30,000 / 30 **(M1)**\n  Break-even output = **1,000 units  (A1)**\n(c) Margin of safety = Actual output − Break-even output = 1,500 − 1,000 = **500 units  (A1, max 4)**\nKey check: a positive margin of safety means actual sales are above break-even → the firm is making a profit.",
    source: "exam-style" },

  { topicCode: "B4.3", marks: 4,
    question: "Explain the difference between QUALITY CONTROL and QUALITY ASSURANCE.",
    markScheme: "**Quality Control (2):**\n• Inspection of products at the END of production by specialist inspectors.\n• Faulty items are scrapped or reworked → catches mistakes but only AFTER they have happened (waste is already there).\n**Quality Assurance (2):**\n• Building quality at EVERY stage of production; each worker is responsible for checking their own output.\n• Aims to PREVENT mistakes rather than detect them — reduces waste, lowers cost long-term.\nKey distinction: QC = inspect at the end (detect); QA = prevent throughout. QA tends to be more efficient but requires more training + worker responsibility.",
    source: "exam-style" },

  { topicCode: "B5.2", marks: 4,
    question: "A small retailer often pays its bills on the 1st of the month but customers pay it 60 days after purchase. Explain TWO ways the retailer could improve its cash flow.",
    markScheme: "1 mark for naming + 1 mark for development (max 4):\n• **Negotiate longer credit from suppliers** (e.g. 60 days instead of 30) → align outgoings with incomings.\n• **Tighten customer credit** — require deposits, shorter terms, or upfront payment for new customers.\n• **Use debt factoring** — sell outstanding invoices to a factoring company for immediate cash (at a small discount).\n• **Arrange a bank overdraft** to cover the short-term gap between paying suppliers and receiving customer payments.\n• **Reduce stock levels** (just-in-time) so less cash is tied up in unsold inventory.\n• **Sale-and-leaseback of a fixed asset** to release cash.\nMust apply to the retailer's specific cash-flow gap.",
    source: "exam-style" },

  { topicCode: "B5.3", marks: 4,
    question: "Explain the DIFFERENCE between profit and cash, using an example.",
    markScheme: "**Definition contrast (2):** Profit = revenue earned − costs incurred (an accounting concept based on when transactions are recognised). Cash = actual money in the bank account at a given moment.\n**Example (2):** A business sells \\$100,000 of goods on credit (60-day payment terms). Revenue earned = \\$100,000 → profit reflects the sale immediately. But cash received = \\$0 until customers pay. So the business shows a profit but has zero cash from those sales.\nKey upshot: a profitable business can still run out of cash; managers must monitor BOTH the income statement (profit) AND the cash-flow forecast.",
    source: "exam-style" },

  { topicCode: "B6.1", marks: 4,
    question: "Explain how an INCREASE in interest rates could affect a furniture manufacturer.",
    markScheme: "1 mark per accurate cause→effect point, max 4:\n• Higher interest rates make **borrowing more expensive** → the manufacturer faces higher costs on existing loans + new investment becomes less affordable.\n• Consumers face **higher mortgage payments** → less disposable income → lower demand for non-essentials like furniture → falling sales.\n• Consumers find **borrowing for big-ticket items more expensive** → less likely to take a loan to buy a sofa or bed → falling sales.\n• Currency may **appreciate** (foreign capital flows in) → exports become more expensive → harder to compete overseas.\n• On the upside, **savers are encouraged to save**, but this also reduces current spending → not helpful in the short run.\nMust apply to the furniture manufacturer specifically.",
    source: "exam-style" },

  { topicCode: "B6.3", marks: 4,
    question: "Explain TWO benefits to a host country (e.g. Indonesia) of a multinational company (MNC) opening a factory there.",
    markScheme: "1 mark for naming + 1 mark for development (max 4):\n• **Job creation** — direct employment in the factory + indirect jobs in supplying firms → lower unemployment + higher household incomes.\n• **Technology and skills transfer** — local workers and suppliers learn new techniques + management practices, raising productivity across the wider economy.\n• **Tax revenue** for the government (corporate tax, payroll tax) → can be spent on healthcare, education, infrastructure.\n• **Improved balance of payments** if the MNC exports from the host country.\n• **Improved infrastructure** — MNCs often invest in (or push the government to build) better roads, ports, electricity.\nAny TWO clearly explained = 4 marks.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6 MARK ANALYSE (AO1 + AO2 + AO3): multi-step cause→effect chains.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "B3.1", marks: 6,
    question: "Analyse how being MARKET-ORIENTATED (rather than product-orientated) could benefit a snack-food manufacturer.",
    markScheme: "L3 (5–6): Clear difference established + TWO well-developed benefits with cause→effect chains applied to a snack-food manufacturer + brief mention of any risks/limits.\nL2 (3–4): Both orientations explained but only one benefit developed.\nL1 (1–2): Definitions only, no application.\n\nKey content:\n• Market-orientated = starts with customer research; tailors product to discovered needs (e.g. healthier, lower-sugar, lower-salt snacks if research shows demand).\n• Product-orientated = decides what to make first, then tries to sell it.\n\nBenefits to develop:\n• **Higher sales / lower risk of launch failure** — products are made to meet evidenced demand → more likely to sell well from day one.\n• **Stronger customer loyalty** — listening to customer preferences (new flavours, healthier options, local tastes) → repeat purchases + word-of-mouth.\n• **Quicker response to changing trends** (e.g. shift to plant-based snacks) → don't get left behind by competitors.\n• **Better pricing decisions** — research tells you what customers will pay → higher margins where possible.\n\nLimit / counter:\n• Market research is costly + can be slow; some markets respond better to innovation that customers didn't know they wanted (e.g. truly new products).\n\nL3 answer applies these chains specifically to a snack-food manufacturer (e.g. 'reformulating chips to reduce salt').",
    source: "exam-style" },

  { topicCode: "B5.5", marks: 6,
    question: "A retail chain has a Current Ratio of 0.8 and an Acid Test Ratio of 0.4. Analyse the financial position of this business and suggest TWO actions it could take.",
    markScheme: "L3 (5–6): Correct interpretation of BOTH ratios + clear analysis of the liquidity problem + TWO appropriate actions with mechanisms.\nL2 (3–4): One ratio interpreted + one action suggested.\nL1 (1–2): States the formulas only.\n\nKey content:\n• **Current ratio 0.8** (target: 1.5–2.0) — current assets are only 80% of current liabilities → the business cannot fully cover its short-term debts from its short-term assets. **Risk: liquidity crisis.**\n• **Acid test 0.4** (target: ≥ 1.0) — excluding stock, liquid assets are only 40% of liabilities → very weak position. Stock is hard to turn into cash quickly, especially for a retailer.\n\nLikely cause: too much stock + too many short-term debts (overdraft, trade creditors, tax due).\n\nActions to develop:\n• **Reduce stock levels** (sale, clearance, JIT ordering) → release cash to pay liabilities.\n• **Negotiate longer credit terms** with suppliers → push out the payment date.\n• **Arrange a longer-term loan** to repay short-term overdraft → restructure debt onto a less-pressured timeline.\n• **Sale-and-leaseback** of fixed assets (e.g. shop premises) → immediate cash, although future rent rises.\n• **Cut costs / boost sales** to improve cash generation organically.\n\nFor L3: link each action specifically to which ratio it improves and over what timeframe.",
    source: "exam-style" },

  { topicCode: "B4.4", marks: 6,
    question: "Analyse THREE factors a coffee-shop chain should consider when choosing the location of a new branch.",
    markScheme: "L3 (5–6): Three distinct factors, each explained with reasoning specific to a coffee-shop chain + clear ranking or interplay between them.\nL2 (3–4): Three named with limited explanation, OR two well developed.\nL1 (1–2): List only.\n\nFactors:\n• **Footfall / passing traffic** — coffee shops rely on impulse visits; high-footfall locations (near train stations, shopping malls, busy office districts) bring repeat customers without heavy marketing.\n• **Proximity to target customers** — depends on positioning (office workers? students? families?) → location near matching demographic concentrations.\n• **Rent + utility costs** — prime locations command very high rent → must balance footfall against cost. A unit just off the main street may be much cheaper for slightly less footfall.\n• **Nearby competitors** — being near rivals can either be bad (split market) OR good (the area is known for coffee, attracts customers). Depends on differentiation.\n• **Parking + accessibility** — drive-through demand → roadside locations with parking.\n• **Local labour availability** — staffing baristas reliably needs a workforce nearby.\n\nL3 answer ranks or trades off the factors specifically — e.g. 'high footfall outweighs rent for a brand still building market presence; for a mature brand, profit margin is more important.'",
    source: "exam-style" },

  { topicCode: "B6.2", marks: 6,
    question: "Analyse how adopting MORE ETHICAL business practices could affect the profits of a clothing manufacturer in the short term and the long term.",
    markScheme: "L3 (5–6): Balanced short-term costs AND long-term benefits, with clear chains, applied to a clothing manufacturer + brief evaluation.\nL2 (3–4): One time horizon explained well.\nL1 (1–2): Listing only.\n\nShort-term EFFECT ON PROFITS:\n• **Higher costs** — fair wages, safer factory conditions, better materials (organic cotton, recycled fabric), supplier audits → narrower margins or higher prices passed to customers.\n• **Investment needed** — installing energy-efficient machinery, training programmes, ethics audits → cash flow pressure.\n• **Possible loss of contracts** with retailers who prioritise lowest cost over ethics.\n\nLong-term EFFECT ON PROFITS:\n• **Brand reputation** — appeal to growing segment of ethically conscious consumers → higher willingness to pay → premium prices.\n• **Customer loyalty + repeat purchase** → stable revenue.\n• **Talent attraction + retention** — workers want to work for ethical employers → lower turnover, higher productivity.\n• **Risk reduction** — avoiding scandals (e.g. workers' rights, environmental damage) protects against future fines, boycotts + sudden share-price drops.\n• **Investor interest** — ESG-focused funds prefer ethical businesses → easier access to capital.\n\nL3 answer applies this to a clothing context (e.g. 'fast-fashion brand vs ethically-positioned brand') and concludes with a JUDGEMENT on net effect on profit over time.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8+ MARK DISCUSS / RECOMMEND / JUSTIFY: both sides + justified conclusion.
  // ═══════════════════════════════════════════════════════════════════════════

  { topicCode: "B1.3", marks: 8,
    question: "A successful family-owned bakery is considering rapid GROWTH by opening 20 new branches across the country within 3 years. Discuss whether this is a good idea. Justify your conclusion.",
    markScheme: "L4 (7–8): Balanced analysis of advantages AND disadvantages + JUSTIFIED conclusion based on the bakery's circumstances.\nL3 (5–6): Both sides covered but weak/missing conclusion.\nL2 (3–4): One-sided.\nL1 (1–2): Description only.\n\nADVANTAGES of rapid growth:\n• **Economies of scale** — bulk buying flour, butter, packaging at lower unit cost → higher margins or competitive prices.\n• **Brand recognition** — 20 branches make the bakery far more visible → builds customer trust + repeat custom.\n• **Higher total profit** even if margin per loaf stays the same.\n• **Defensive** — first-mover advantage against rival bakery chains expanding.\n• **More attractive to staff** — career progression to branch manager.\n\nDISADVANTAGES / RISKS:\n• **Massive cash demand** — rent, fit-out, equipment, recruitment, marketing for 20 sites at once → may need heavy borrowing → high gearing + interest cost.\n• **Loss of quality control** — what worked for one shop (family touch, local supplier, owner overseeing) may not scale.\n• **Loss of culture / customer service** — the personal feel of a family bakery may disappear.\n• **Management strain** — owners may lack experience running 20 sites; need to hire experienced managers.\n• **Demand risk** — assumes 20 locations will all generate enough sales; recession, location mistakes, or local competition could leave loss-making branches.\n• **Diseconomies of scale** as the business grows beyond owners' control.\n\nCONCLUSION (L4) — should be JUSTIFIED:\n• A typical L4 conclusion: rapid growth is risky — a SLOWER, phased expansion (5 branches first, learn what works, then expand) protects the brand and finances. OR: if external investment + strong management hire are in place + market research supports demand, the rapid pace can work.\n• Conclusion must be based on the SPECIFIC business (family-owned bakery, currently one site, 3-year window) not generic.",
    source: "exam-style" },

  { topicCode: "B2.1", marks: 8,
    question: "A factory manager believes higher pay is the most effective way to motivate workers. Discuss whether you agree, referring to motivation theories.",
    markScheme: "L4 (7–8): Both sides (pay matters / pay isn't enough) + at least TWO motivation theories used + justified conclusion.\nL3 (5–6): Both sides argued but only one theory referenced.\nL2 (3–4): One-sided.\nL1 (1–2): Description only.\n\nFOR — higher pay motivates:\n• **Taylor's scientific management** — workers are mainly motivated by money; piece rate clearly raises output.\n• **Maslow's lower needs** — pay funds food, shelter, security (physiological + safety needs). Without enough pay these dominate.\n• Pay is easy to measure, compare, change — simple managerial lever.\n• A pay rise sends a clear signal that good work is rewarded.\n\nAGAINST — pay isn't enough:\n• **Herzberg's two-factor theory** — pay is a HYGIENE factor: poor pay demotivates, but once it is adequate, MORE pay does not increase satisfaction. Real motivators are responsibility, recognition, growth.\n• **Maslow's higher needs** — once pay is sufficient, workers want belonging, esteem, self-actualisation → recognition, training, autonomy matter more.\n• Higher pay raises labour costs → may force price rises or job cuts.\n• Non-financial motivators (job rotation, job enrichment, teamwork, recognition) often cheaper AND more effective long-term.\n• Workers may always demand more once it has been given — diminishing returns.\n\nCONCLUSION (L4):\n• Typical justified answer: pay matters and must be FAIR, but it's NOT the most effective tool on its own. A combined approach — fair base pay + non-financial motivators (autonomy, recognition, development) — typically gives the best result. The right balance depends on the type of worker (Taylor's view fits routine, Herzberg's fits skilled/creative work).",
    source: "exam-style" },

  { topicCode: "B5.1", marks: 8,
    question: "A medium-sized electronics company wants to raise \\$2 million to develop a new product. Discuss whether it should raise the money by issuing more shares OR by taking out a long-term bank loan. Justify your choice.",
    markScheme: "L4 (7–8): Strengths AND weaknesses of BOTH options, applied to a medium-sized electronics firm, + clear justified choice.\nL3 (5–6): Both options covered but weak conclusion.\nL2 (3–4): One-sided.\nL1 (1–2): Description only.\n\nISSUE MORE SHARES:\n• **No repayment** — shares don't have to be paid back.\n• **No interest** — preserves cash flow.\n• **Strengthens balance sheet** — equity rises, gearing falls → easier to borrow later.\n• **BUT loss of control** — new shareholders share ownership, votes, and dividends.\n• **Dividends expected** — over the long run shareholders demand returns (and a rising share price).\n• Possible if the firm is a plc (open share issue) or has wealthy private investors (Ltd).\n• Slower to arrange than a loan; setup costs (underwriting, prospectus) can be significant for plc.\n\nLONG-TERM BANK LOAN:\n• **Owners keep full control** — no shares given up.\n• **Fixed repayment schedule** — easy to plan around.\n• **Interest is a tax-deductible expense** in most jurisdictions.\n• **BUT increases gearing** — higher financial risk if profits fall.\n• **BUT requires collateral / security** in most cases.\n• **Interest cost reduces profit** + cash flow each month.\n• **Easier and faster** to arrange than a share issue for a medium-sized firm.\n\nCONTEXTUAL FACTORS:\n• How profitable is the new product likely to be? If returns are uncertain, debt is risky (must be repaid regardless).\n• Current gearing — if already high, adding more debt is dangerous → shares preferable.\n• Owners' attitude to losing control.\n• Interest-rate environment.\n\nCONCLUSION (L4):\n• Typical justified answer: if the firm is already moderately leveraged and the product is high-risk, **shares** spread the risk. If the firm has stable cash flow + owners value control + interest rates are low, **a loan** is cheaper overall. Conclusion must pick one option and justify based on the firm's specific situation.",
    source: "exam-style" },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANSION ROUND: fills gap topics + lifts coverage to ~50 questions.
  // Includes the 4th P of the marketing mix (Place) which was missing from v1.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── B3.5 PLACE — the missing 4th P (NEW) ───────────────────────────────────
  { topicCode: "B3.5", marks: 2,
    question: "Define 'Place' in the marketing mix.",
    markScheme: "1 mark: **how** the product is **distributed** / how it reaches the customer.\n1 mark: from the **producer / manufacturer** to the **end consumer** (the distribution channel).\nFull-mark answer: 'Place refers to the methods and channels used to distribute a product from the producer to the final consumer — e.g. direct sales, retailers, wholesalers, e-commerce.'",
    source: "exam-style" },

  { topicCode: "B3.5", marks: 4,
    question: "Explain TWO factors a small bakery should consider when choosing its distribution channel.",
    markScheme: "1 mark for naming each factor + 1 mark for explanation in context (max 4):\n• **Type of product (perishability)** — fresh bread is highly perishable → short channel (direct sale from shop, or local delivery within hours) rather than long wholesale chain.\n• **Target customer location** — if customers are local (within walking distance) → direct sale from the shop is enough; if wider area → home-delivery + click-and-collect.\n• **Cost** — wholesalers + retailers take a margin → less profit per loaf; direct sale = full margin but the bakery must do all the selling itself.\n• **Volume** — small bakery may not produce enough to justify supplying supermarkets (which want consistent large volumes).\n• **Brand image** — direct sale lets the bakery present the brand directly (smell, freshness, service) → supermarkets dilute the personal touch.\nAny two well-explained = full marks.",
    source: "exam-style" },

  { topicCode: "B3.5", marks: 6,
    question: "A clothing brand is considering switching from selling only through physical retail stores to selling ONLY online (e-commerce). Analyse TWO advantages and ONE disadvantage of this change.",
    markScheme: "L3 (5–6): Two advantages and one disadvantage, each clearly explained with cause→effect chain applied to a clothing brand.\nL2 (3–4): Two of the three covered well.\nL1 (1–2): Listing only.\n\nADVANTAGES to develop:\n• **Lower fixed costs** — no shop rent, fewer staff, no in-store fittings → higher margin per sale, or freedom to lower prices.\n• **Wider geographic reach** — can sell to customers anywhere in the country (or globally) without opening more shops.\n• **24/7 availability** — customers can browse and buy at any time → captures sales the physical shop would miss.\n• **Rich customer data** — every click + purchase tracked → better targeted marketing, personalisation.\n• **Faster product launches** — new collections live the moment they're uploaded, no waiting for in-store rollout.\n\nDISADVANTAGES (pick the strongest one):\n• **Customers can't try on clothes** before buying → higher RETURN rate → costly reverse logistics + restocking. Critical for fashion.\n• **Loss of in-store experience** — fitting rooms, sales assistants, the 'high street' feel — affects brand-perception for premium brands.\n• **Heavy reliance on delivery infrastructure** — late delivery = unhappy customer; courier strikes can stop sales.\n• **Existing physical-store staff** may be made redundant — bad PR + morale.\n\nL3 answer applies these to a clothing brand specifically and notes the trade-off (clothing fits = main barrier to going pure online).",
    source: "exam-style" },

  // ── More across understaffed topics ────────────────────────────────────────

  { topicCode: "B1.1", marks: 1,
    question: "Identify the FOUR factors of production.",
    markScheme: "**Land, Labour, Capital, Enterprise**  **(B1 — all four required)**.\nB0 if any of the four is missing. (Note: this is the same list as in Economics 0455 — Business Studies shares the foundation.)",
    source: "exam-style" },

  { topicCode: "B1.2", marks: 2,
    question: "State the THREE sectors of business activity and give one example of each.",
    markScheme: "1 mark for naming all 3; 1 mark for one valid example of each (max 2):\n• **Primary** — extraction of raw materials (e.g. farming, mining, fishing, oil drilling)\n• **Secondary** — manufacturing / construction (e.g. car factory, baker, builder)\n• **Tertiary** — services (e.g. bank, hospital, restaurant, retail shop)\nThe relative size of each sector shifts as an economy develops — developed economies are dominated by tertiary.",
    source: "exam-style" },

  { topicCode: "B1.5", marks: 4,
    question: "Explain how the objectives of SHAREHOLDERS and EMPLOYEES of a company might conflict.",
    markScheme: "Mark for each clear point, max 4:\n• **Shareholders** want **high profits** + **rising dividends** + **rising share price** — return on their investment.\n• **Employees** want **higher wages**, **job security**, **good working conditions**, **training opportunities**.\n• Conflict arises because **higher wages → lower profits** → less for shareholders.\n• Cost-cutting (redundancies, automation) raises profit for shareholders but **threatens employee job security**.\n• Reinvesting profit in employee training/benefits → less dividend paid out.\n• Resolution attempts: profit-sharing, share-ownership schemes for employees, transparent communication.\nAny clear pair of opposing objectives + the underlying mechanism = full marks.",
    source: "exam-style" },

  { topicCode: "B2.3", marks: 4,
    question: "Explain the difference between ON-THE-JOB and OFF-THE-JOB training, and give one advantage of each.",
    markScheme: "**On-the-job (2 marks):** training that takes place at the **workplace, doing real work** (often by shadowing an experienced colleague). **Advantage:** cheaper, no time away from work, the trainee learns the company's actual systems immediately.\n**Off-the-job (2 marks):** training away from the workplace — at a **specialist training centre, college, or seminar**. **Advantage:** wider/more advanced skills can be taught; specialist instructors; trainee can fully focus without work distractions.\nThe two are often combined — induction (off-the-job) + role-specific training (on-the-job).",
    source: "exam-style" },

  { topicCode: "B2.4", marks: 4,
    question: "Identify TWO barriers to effective internal communication in a business and suggest how each could be overcome.",
    markScheme: "1 mark for naming a barrier + 1 mark for suggested fix (max 4):\n• **Use of jargon/technical language** → simpler language; glossaries; train staff to write clearly.\n• **Information overload (too many emails)** → use clear channels (urgent vs FYI); meetings only when needed; written summaries.\n• **Language differences** (multinational workforces) → translation; multilingual managers; visual diagrams; pictograms.\n• **Long chain of command** (too many hierarchy levels) → flatten structure; direct channels between senior managers + workers (open door policy).\n• **Poor medium choice** (e.g. urgent message buried in email) → use appropriate medium (phone for urgent, group chat for daily, email for records).\n• **Hierarchy/intimidation** — workers don't speak up → anonymous suggestion boxes, regular 1-on-1s, psychological safety.\nAny two distinct barrier+fix pairs.",
    source: "exam-style" },

  { topicCode: "B3.7", marks: 4,
    question: "Explain TWO ways technology has changed how businesses PROMOTE their products.",
    markScheme: "1 mark for naming + 1 mark for development (max 4):\n• **Social media marketing** — Instagram, TikTok, YouTube → brands reach huge audiences cheaply and target specific demographics by age, interest, location.\n• **Influencer marketing** — paying social-media personalities to endorse → trusted by their followers, especially for fashion + beauty + tech.\n• **Search engine ads (Google ads)** — promote to people actively searching for related products → high purchase intent.\n• **Personalised email campaigns** — segmented mailing lists based on past purchases → higher conversion than mass email.\n• **Retargeting ads** — show products the customer already viewed → reminders that convert browsing to buying.\n• **Data analytics** — measure exactly which ad / channel / message converts best, refine spend in real time.\nAny two clearly explained = full marks.",
    source: "exam-style" },

  { topicCode: "B4.2", marks: 4,
    question: "A factory has fixed costs of \\$50,000 per month. It sells units at \\$30 each, with variable cost of \\$10 per unit.\n(a) Calculate the break-even output per month.\n(b) Calculate the profit if it sells 4,000 units per month.",
    markScheme: "(a) Contribution per unit = 30 − 10 = \\$20 **(M1)**\n  Break-even = FC / contribution = 50,000 / 20 **(M1)**\n  **= 2,500 units  (A1)**\n(b) Total revenue = 4,000 × 30 = \\$120,000\n  Total variable cost = 4,000 × 10 = \\$40,000\n  Total cost = 50,000 + 40,000 = \\$90,000\n  **Profit = 120,000 − 90,000 = \\$30,000  (M1, A1 — max 4 total)**\nFaster alternative for (b): contribution per unit × units sold − FC = 20 × 4000 − 50,000 = \\$30,000.",
    source: "exam-style" },

  { topicCode: "B4.3", marks: 4,
    question: "Explain TWO benefits to a manufacturer of maintaining HIGH QUALITY production.",
    markScheme: "1 mark for naming + 1 mark for explanation (max 4):\n• **Stronger brand reputation** → customers trust the brand → repeat purchases + word-of-mouth referrals → growth in sales without high marketing spend.\n• **Ability to charge premium prices** → higher margin per unit → more profit even at lower volume.\n• **Fewer returns + warranty claims** → lower cost of reverse logistics + replacement parts + refunds.\n• **Reduced waste in production** → defective products = scrapped or reworked = wasted material + labour; high quality means less of this.\n• **Higher employee morale** — workers proud of producing quality goods → lower staff turnover.\n• **Easier compliance with regulations + safety standards** — fewer recalls + lawsuits.\nAny two well-explained.",
    source: "exam-style" },

  { topicCode: "B5.2", marks: 4,
    question: "Explain TWO causes of cash-flow problems in a small business.",
    markScheme: "1 mark for naming + 1 mark for development (max 4):\n• **Overtrading** — taking on more orders than the business has working capital for → cash tied up in stock + receivables before revenue arrives.\n• **Late payment by customers** — invoices unpaid past their due date → no cash inflow even though sales were made.\n• **Holding too much stock** — cash tied up in inventory; storage + insurance costs.\n• **Unexpected large costs** — equipment breaks, building damage, key supplier collapses → urgent cash needed.\n• **Seasonal sales** — long stretches with low income (e.g. a tourist business in low season) but bills still arrive monthly.\n• **Falling sales** — revenue drops faster than fixed costs can be cut.\n• **Buying expensive assets outright** — using cash for a machine instead of leasing.\nAny two well-explained = 4.",
    source: "exam-style" },

  { topicCode: "B5.5", marks: 4,
    question: "A retail store has revenue of \\$500,000, gross profit of \\$200,000, and net profit of \\$60,000.\n(a) Calculate the Gross Profit Margin (GPM).\n(b) Calculate the Net Profit Margin (NPM).\n(c) Suggest ONE reason why GPM and NPM are different.",
    markScheme: "(a) GPM = (Gross Profit / Revenue) × 100 = (200,000 / 500,000) × 100 = **40%  (M1, A1)**\n(b) NPM = (Net Profit / Revenue) × 100 = (60,000 / 500,000) × 100 = **12%  (A1)**\n(c) **GPM only deducts cost of sales** (the cost of buying the goods). **NPM also deducts ALL OTHER expenses** — rent, salaries, marketing, utilities, insurance. So NPM is always lower than GPM for a profitable business. **(B1, max 4)**.\nA big gap between GPM and NPM (40% → 12%) suggests overheads + expenses are eating into profit; consider cost-cutting.",
    source: "exam-style" },

  { topicCode: "B6.3", marks: 6,
    question: "Analyse how a DEPRECIATION of the Indonesian rupiah against the US dollar would affect an Indonesian smartphone importer AND an Indonesian textile exporter.",
    markScheme: "L3 (5–6): Both businesses analysed with clear cause→effect chains + at least one mitigation.\nL2 (3–4): One business analysed well.\nL1 (1–2): Definitions only.\n\nKey content (build both halves):\n\n**Smartphone IMPORTER (negative impact):**\n• Smartphones are bought in USD (or other foreign currencies).\n• Rupiah depreciates → it now takes MORE rupiah to buy the same USD → cost of imported smartphones in rupiah RISES.\n• Importer either: (a) passes the higher cost to customers → consumer prices rise → demand falls (especially if PED elastic); OR (b) absorbs the cost → squeezed profit margin.\n• Either way: revenue or profit hit.\n\n**Textile EXPORTER (positive impact):**\n• Textiles are sold abroad, priced in USD.\n• Rupiah depreciates → for the same USD price, the exporter receives MORE rupiah → higher rupiah revenue.\n• OR: the exporter can LOWER the USD price (still get same rupiah as before) → more competitive abroad → higher export volume → higher market share.\n• Win-win for the exporter — better margins AND/OR larger market.\n\n**Caveats / mitigations:**\n• Imported INPUTS to textile production (dyes, machinery) also get more expensive — partial offset.\n• Hedging contracts can lock in exchange rates to reduce risk.\n\nL3 answer covers both directions + at least one nuance.",
    source: "exam-style" },

  { topicCode: "B6.2", marks: 6,
    question: "Analyse the ethical and environmental issues a clothing brand should consider when sourcing from overseas suppliers in developing countries.",
    markScheme: "L3 (5–6): At least two ethical issues + at least two environmental issues + recommendation, applied to a clothing brand.\nL2 (3–4): Issues identified but limited application.\nL1 (1–2): Listing only.\n\n**Ethical issues to develop:**\n• **Worker pay and conditions** — are workers paid at least a living wage? Working safely? No child labour? (e.g. Rana Plaza disaster 2013).\n• **Working hours** — overtime without pay; no breaks.\n• **Right to unionise** — many suppliers ban unions, preventing workers from negotiating.\n• **Supply-chain transparency** — does the brand even know who its suppliers' suppliers are? Sub-contracting hides abuses.\n\n**Environmental issues:**\n• **Water pollution** from textile dyeing — toxic chemicals released into local rivers.\n• **Carbon emissions** from long-distance shipping (sea + air freight).\n• **Use of synthetic fibres (polyester)** — microplastic pollution from washing.\n• **Local water use** — cotton cultivation drains aquifers in already dry regions.\n\n**What the brand should do (the recommendation):**\n• Audit suppliers regularly (independent third-party audits, not self-reported).\n• Publish a supplier list (transparency).\n• Pay a 'living wage premium' above local minimum.\n• Move to certified sustainable materials (GOTS organic cotton, recycled polyester).\n• Reduce air freight in favour of sea + rail.\n\nL3 answer ties business decisions to BOTH ethical AND environmental outcomes; balances cost vs reputation.",
    source: "exam-style" },

  { topicCode: "B3.8", marks: 4,
    question: "A new bottled-water brand is targeting health-conscious gym-goers in Jakarta. Explain how the FOUR Ps of the marketing mix should be coordinated to support this positioning.",
    markScheme: "1 mark per P, max 4:\n• **Product:** clear bottle, minimalist labelling, electrolyte/vitamin-enriched, 500 ml fitness-friendly size; recyclable material to signal eco-credentials.\n• **Price:** premium pricing (e.g. 1.5–2× regular bottled water) → signals quality + matches gym-goer willingness to pay for self-care.\n• **Place:** distribution INSIDE gyms (vending machines, partnerships with gym chains), premium supermarkets in fitness-conscious districts, food-delivery apps that gym-goers use.\n• **Promotion:** Instagram + TikTok influencer marketing with fitness influencers; sponsorship of running events / 5K races; sample distribution in gyms; clean before/after testimonials.\nAll 4 Ps consistent → reinforces the 'premium + fitness + health' positioning.",
    source: "exam-style" },
];

/**
 * Per-question incremental seeder for Business Studies exemplars.
 * Mirrors the Physics/Math/Economics seeders: dedup by (topicCode + question prefix).
 */
export async function seedIgcseBusinessExamplesIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };
  try {
    const existing = await db.execute(sql`SELECT topicCode, question FROM igcse_examples WHERE topicCode LIKE 'B%'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const dedupKey = (code: string, q: string) => `${code}::${q.slice(0, 120)}`;
    const present = new Set<string>(list.map((r: any) => dedupKey(String(r?.topicCode || ""), String(r?.question || ""))));

    const rows: any[] = [];
    let sortOrder = 3000;
    for (const e of EXAMPLES) {
      if (present.has(dedupKey(e.topicCode, e.question))) continue;
      rows.push({
        topicCode: e.topicCode,
        syllabus: "CIE_0450",
        tier: "extended" as const,
        marks: e.marks,
        question: e.question,
        markScheme: e.markScheme,
        source: e.source || "exam-style",
        sortOrder: sortOrder++,
      });
    }

    if (!rows.length) {
      console.log(`[IGCSE] Business exemplars already complete (${list.length} rows in DB, ${EXAMPLES.length} in seed file).`);
      return { seeded: 0 };
    }
    await db.insert(igcseExamples).values(rows);
    console.log(`[IGCSE] Seeded ${rows.length} new Business Studies exemplars (total now ${list.length + rows.length}).`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Business exemplar seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
