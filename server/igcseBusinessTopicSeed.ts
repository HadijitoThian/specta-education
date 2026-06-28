/**
 * Cambridge IGCSE Business Studies 0450 — full topic tree.
 *
 * Authored from Cambridge's published syllabus areas B1–B6. Seeded once into
 * `igcse_topics` on startup (idempotent: only inserts if no Business rows
 * exist yet). The `learningOutcomes` field is what the AI Teacher uses as
 * grounding when teaching a topic.
 *
 * Topic `code` is prefixed with "B" (e.g. "B3.4") to avoid colliding with
 * Math's "3.4", Physics' "P3.4", or Economics' "E3.4". Area codes are
 * "B1".."B6".
 */
import { getDb, ensureIgcseBusinessSubject } from "./db";
import { igcseTopics } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Seed = { code: string; title: string; learningOutcomes: string };
type Area = { code: string; name: string; topics: Seed[] };

const AREAS: Area[] = [
  {
    code: "B1", name: "Understanding business activity",
    topics: [
      { code: "B1.1", title: "Purpose and nature of business activity",
        learningOutcomes: "Business activity = combining factors of production (land, labour, capital, enterprise) to produce goods and services that meet customer needs and wants. Concepts of needs vs wants, scarcity, opportunity cost, the role of business in adding value (selling price − cost of bought-in materials). Why businesses exist: profit, social purpose, employment." },
      { code: "B1.2", title: "Classification of businesses",
        learningOutcomes: "Primary sector (extraction: farming, mining, fishing), secondary (manufacturing + construction), tertiary (services: retail, banking, transport). How the relative size of each sector changes as an economy develops. Distinction between PRIVATE sector (owned by individuals/shareholders, profit motive) and PUBLIC sector (owned + run by government, public service motive)." },
      { code: "B1.3", title: "Enterprise, business growth and size",
        learningOutcomes: "What entrepreneurs do (spot opportunities, take risks, organise resources, make decisions) and the characteristics of a successful entrepreneur. Measuring business size (number of employees, capital employed, turnover, market share, output) — strengths and weaknesses of each measure. Reasons firms grow (economies of scale, market power, security, owner ambition) and reasons some stay small (small market, owner preference, financing, personal service). Methods of growth — INTERNAL (organic, opening new branches, new products) vs EXTERNAL (mergers, takeovers: horizontal, vertical, conglomerate)." },
      { code: "B1.4", title: "Types of business organisation",
        learningOutcomes: "Sole trader (one owner, unlimited liability, simple to set up, full control, limited finance, limited skills, no continuity). Partnership (2–20 partners, shared decisions + profits, unlimited liability unless LLP, deed of partnership). Private limited company / Ltd (limited liability, shares sold privately, separate legal entity, must publish accounts to a limited extent). Public limited company / plc (limited liability, shares sold on the stock exchange, large capital potential, divorce of ownership and control, takeover risk, must publish detailed accounts). Public corporations (state-owned: postal service, utilities — public service objectives). Franchises (franchisor + franchisee model: brand + support vs royalties)." },
      { code: "B1.5", title: "Business objectives and stakeholder objectives",
        learningOutcomes: "Business objectives: survival, profit, growth, market share, increasing shareholder value, social/ethical goals. Why objectives change as a business grows (start-up: survival → established: profit + growth). Stakeholders = anyone affected by the business's activity. Internal stakeholders: owners/shareholders (want return on investment), managers (want power + bonuses), employees (want job security + pay). External stakeholders: customers (quality + price), suppliers (orders + prompt payment), the local community (employment + minimising harm), government (tax revenue + employment + compliance), competitors, environmental groups. CONFLICT between stakeholder objectives (e.g. higher dividends vs higher wages, low prices vs supplier profits)." },
    ],
  },
  {
    code: "B2", name: "People in business",
    topics: [
      { code: "B2.1", title: "Motivating workers",
        learningOutcomes: "Why motivation matters (productivity, quality, lower absenteeism + labour turnover). Key motivation theories: TAYLOR (scientific management — money is the main motivator, division of labour, piece rate); MASLOW's hierarchy of needs (physiological → safety → social → esteem → self-actualisation); HERZBERG's two-factor theory (hygiene factors prevent dissatisfaction; motivators create satisfaction). FINANCIAL motivators (wages — time rate vs piece rate; salary; bonus; commission; profit-sharing; share ownership) and NON-FINANCIAL motivators (job rotation, job enrichment, autonomy, teamwork, recognition, training)." },
      { code: "B2.2", title: "Organisation and management",
        learningOutcomes: "Organisation charts (hierarchy, levels, lines of authority). Span of control (wide = fewer levels, more delegation; narrow = more control, tall hierarchy). Chain of command. Delegation — passing authority down (frees managers' time + motivates juniors, but loses some control). Functions of management (Henri Fayol: planning, organising, commanding, coordinating, controlling). Leadership styles — AUTOCRATIC (leader decides all), DEMOCRATIC (involves team), LAISSEZ-FAIRE (hands-off) — context where each works best. The role of trade unions in protecting workers." },
      { code: "B2.3", title: "Recruitment, selection and training",
        learningOutcomes: "Recruitment process: identify vacancy → job description → person specification → advertise → applications + CVs → shortlist → interview/tests → offer + reference. INTERNAL recruitment (cheaper, faster, motivates staff, but limits new ideas + may cause resentment) vs EXTERNAL (wider talent pool + fresh ideas, but expensive + slower + induction needed). Types of training: INDUCTION (welcome new staff), ON-THE-JOB (cheap, learn by doing, but trainer may pass on bad habits), OFF-THE-JOB (formal courses, broad skills, but expensive + away from work). Reasons for dismissal vs redundancy. Employment law basics (contract, anti-discrimination)." },
      { code: "B2.4", title: "Internal and external communication",
        learningOutcomes: "Effective communication — sender, message, medium, receiver, feedback. INTERNAL (within the business: meetings, emails, intranet, notices, memos) vs EXTERNAL (with customers, suppliers, government: letters, websites, social media, advertising). One-way vs two-way. Barriers to communication (jargon, language, noise, poor medium choice, hierarchy, too long, no feedback). Importance of effective communication (faster decisions, fewer errors, better motivation, stronger customer relations)." },
    ],
  },
  {
    code: "B3", name: "Marketing",
    topics: [
      { code: "B3.1", title: "Marketing, competition and the customer",
        learningOutcomes: "Definition of marketing (identifying, anticipating and satisfying customer needs profitably). Roles of marketing: research, product, pricing, promotion, distribution, brand building. Market-orientated (start with what customers want) vs PRODUCT-orientated (start with the product, find buyers) businesses — strengths + weaknesses of each. Concepts of market share, market growth. Why marketing has become more important (more competition, more informed customers, more channels). Customer loyalty + customer service." },
      { code: "B3.2", title: "Market research",
        learningOutcomes: "Purpose of market research (reduce risk of new launches, understand customer needs, monitor competitors, find new markets). PRIMARY research (collected directly from the market — surveys, interviews, focus groups, observation): expensive, slow, but specific to the business + up to date. SECONDARY (already-published data — government statistics, trade journals, internet): cheap, fast, but generic + may be out of date. SAMPLING — random, quota, stratified. SAMPLE SIZE vs cost trade-off. Bias and accuracy of results. Presenting data (tables, bar charts, pie charts, line graphs)." },
      { code: "B3.3", title: "Marketing mix — Product",
        learningOutcomes: "Product as one of the 4Ps. Product life cycle stages: INTRODUCTION (high cost, low sales, heavy promotion), GROWTH (rising sales + profit, more competition), MATURITY (peak sales, slowing growth, intense competition), DECLINE (falling sales). Extension strategies (new features, repackaging, new markets, new pricing) to lengthen maturity. Concepts of brand image, brand loyalty, packaging (protect, preserve, attract, inform). Product portfolio analysis (Boston Matrix overview: stars, cash cows, problem children, dogs)." },
      { code: "B3.4", title: "Marketing mix — Price",
        learningOutcomes: "Pricing strategies and when each is used: COST-PLUS (add markup to costs — simple but ignores demand); PENETRATION (low price to enter a market and build share — risks low margin); SKIMMING (high launch price for premium/novel product — milks early adopters); COMPETITIVE (match rivals — keeps share but margin pressure); PROMOTIONAL (temporary cuts to boost short-term sales); DYNAMIC (price changes by demand or time — airlines, e-commerce). Price elasticity considerations: inelastic → can raise price; elastic → keep price low or competitive." },
      { code: "B3.5", title: "Marketing mix — Place",
        learningOutcomes: "Place = how products get from producer to consumer. Distribution channels: PRODUCER → CONSUMER (e.g. direct sales, e-commerce, factory outlets); PRODUCER → RETAILER → CONSUMER (most consumer goods); PRODUCER → WHOLESALER → RETAILER → CONSUMER (small retailers buying in small quantities); PRODUCER → AGENT → ... (foreign markets). Each level's role + costs. Choice depends on product type, customer numbers/spread, technical complexity, perishability. Rise of e-commerce + impact on traditional retail." },
      { code: "B3.6", title: "Marketing mix — Promotion",
        learningOutcomes: "Aim: inform customers, persuade them, build/maintain brand, beat competition. ABOVE-THE-LINE (paid mass-media advertising — TV, radio, newspapers, billboards, online ads): wide reach, expensive. BELOW-THE-LINE (direct + targeted: sales promotions, discounts, BOGOF, sponsorship, PR, direct mail, in-store displays): more targeted, often cheaper. Each method's cost, reach, audience fit. Choosing the right mix for a small local business vs a multinational." },
      { code: "B3.7", title: "Technology and the marketing mix",
        learningOutcomes: "Impact of technology on each P: Product (smart features, apps, customisation, faster development); Price (dynamic pricing, easier price comparison by customers); Place (e-commerce, m-commerce, click-and-collect, faster delivery); Promotion (social media, influencers, search ads, email, mobile). Big data and customer profiling. Opportunities (cheaper reach, global market, lower marketing cost per customer) AND risks (cyber-attacks, customer-data privacy concerns, fast-moving fashions)." },
      { code: "B3.8", title: "Marketing strategy",
        learningOutcomes: "Marketing strategy = the long-term plan combining the 4Ps to achieve marketing objectives. Importance of CONSISTENCY across the 4Ps (premium price + premium packaging + premium channels). MARKETING DECISIONS depend on type of product, target market, budget, competition, business size. Differences when marketing to other businesses (B2B — focus on technical specs, after-sales) vs to consumers (B2C — focus on emotion, brand). Legal controls on marketing (truthful claims, age-appropriate, no false promises)." },
    ],
  },
  {
    code: "B4", name: "Operations management",
    topics: [
      { code: "B4.1", title: "Production of goods and services",
        learningOutcomes: "Methods of production. JOB (one-off, customised, e.g. wedding cake, suit, building project — high skill, high cost per unit, slow). BATCH (groups of identical items, e.g. loaves of bread, types of jam — economies of scale, but downtime between batches). FLOW (continuous mass production, e.g. canned drinks, cars — very low unit cost, capital-intensive, inflexible). PRODUCTIVITY (output per worker per unit of time) — how to raise it (better training, technology, motivation). LEAN PRODUCTION + JIT (just-in-time) — reduces waste, lowers stock cost, but vulnerable to supplier delay." },
      { code: "B4.2", title: "Costs, scale of production and break-even",
        learningOutcomes: "FIXED costs (don't vary with output — rent, salaries, insurance) vs VARIABLE costs (vary with output — raw materials, wages by output). Total cost = FC + VC. Average cost = TC/Q. BREAK-EVEN OUTPUT = FC / (Selling Price − Variable Cost per unit) = FC / contribution per unit. Margin of safety = actual output − break-even output. Reading a break-even chart. Economies of scale (technical, financial, managerial, marketing, purchasing) → lower average cost as output rises. Diseconomies (communication, motivation, coordination) → costs rise if firm grows TOO big." },
      { code: "B4.3", title: "Achieving quality production",
        learningOutcomes: "Why quality matters (reputation, repeat customers, ability to charge more, reduced returns + warranty costs). QUALITY CONTROL (inspect at end — catches faults but allows waste in process). QUALITY ASSURANCE (build quality at every stage — each worker checks own work, prevent rather than detect). TOTAL QUALITY MANAGEMENT (TQM) — whole-business culture of continuous improvement. Quality circles, kaizen. Costs of poor quality (returns, lost customers, rework, damaged reputation)." },
      { code: "B4.4", title: "Location decisions",
        learningOutcomes: "Factors affecting location of MANUFACTURING (proximity to raw materials, transport links, labour availability + cost, government grants, land cost, infrastructure). Factors affecting RETAIL location (proximity to customers — high streets, malls — passing traffic, rent, parking, competitors nearby, target demographic). Factors affecting INTERNATIONAL location (lower labour costs, growing local market, trade barriers, government incentives, exchange rates, cultural fit, political stability). Increasing role of e-commerce → location less critical for some types of retail." },
    ],
  },
  {
    code: "B5", name: "Financial information and decisions",
    topics: [
      { code: "B5.1", title: "Business finance — needs and sources",
        learningOutcomes: "Why businesses need finance: START-UP capital, WORKING capital (day-to-day), GROWTH (new premises, machinery, R&D). Short-term sources (overdraft, trade credit, debt factoring) for cash-flow gaps. Medium-term (bank loan, leasing, hire purchase) for equipment. Long-term (retained profit, share issue, long-term loans/mortgages, venture capital) for expansion. INTERNAL sources (retained profit, sale of assets, sale-and-leaseback, owner's savings) vs EXTERNAL. Choice depends on: amount needed, purpose, business size, current debt level, owner's risk preference, gearing." },
      { code: "B5.2", title: "Cash flow forecasting and working capital",
        learningOutcomes: "Cash flow = movement of money in and out. CASH-FLOW FORECAST (planned future receipts and payments month by month — opening balance + receipts − payments = closing balance). Why a forecast matters (spot future cash-flow gaps, plan borrowing, reassure lenders). Causes of cash-flow problems (overtrading, late customer payment, holding too much stock, sudden expenses, falling sales). Solutions (overdraft, factor invoices, negotiate longer credit terms, reduce stock, cost-cut). Working capital = current assets − current liabilities (need enough to pay day-to-day bills)." },
      { code: "B5.3", title: "Income statements",
        learningOutcomes: "Income statement (profit + loss account) shows revenue and costs over a period (typically a year). Key lines: Revenue (sales) − Cost of sales = GROSS PROFIT; Gross profit − Expenses = NET PROFIT (sometimes called operating profit or profit for the year). Why managers, investors, lenders, the tax authority all want to see this. Difference between profit (an accounting concept) and cash (actual money in the bank). A profitable business can still run out of cash." },
      { code: "B5.4", title: "Statement of financial position",
        learningOutcomes: "Statement of financial position (balance sheet) — a snapshot at one date. Assets = items the business owns (non-current/fixed: buildings, equipment; current: stock, debtors/receivables, cash). Liabilities = what the business owes (non-current: long-term loans; current: short-term creditors/payables, overdraft, tax due). Equity = capital + reserves (= net worth of the business). Key equation: Assets = Liabilities + Equity. What it tells stakeholders about size, financial structure, and liquidity." },
      { code: "B5.5", title: "Analysis of accounts",
        learningOutcomes: "PROFITABILITY ratios: Gross Profit Margin = (Gross Profit / Revenue) × 100 — measures core trading profitability; Net Profit Margin = (Net Profit / Revenue) × 100 — after all costs; Return on Capital Employed (ROCE) = (Net Profit / Capital Employed) × 100 — return on every dollar invested. LIQUIDITY ratios: Current Ratio = Current Assets / Current Liabilities (aim ≥ 1.5–2.0); Acid Test (Quick) Ratio = (Current Assets − Stock) / Current Liabilities (aim ≥ 1.0) — more cautious. Limitations of ratio analysis (snapshot only, comparison needs same industry, ignores non-financial factors)." },
    ],
  },
  {
    code: "B6", name: "External influences on business activity",
    topics: [
      { code: "B6.1", title: "Economic issues affecting business",
        learningOutcomes: "How macroeconomic conditions affect business: ECONOMIC GROWTH (rising GDP) → higher consumer demand → higher sales for most firms (luxury goods especially); recession → opposite. INFLATION → higher input costs, may erode profit if can't pass on; uncertainty reduces investment. UNEMPLOYMENT → falling consumer spending → falling demand for luxuries; but easier to recruit. INTEREST RATES → higher rates → costlier borrowing → less investment + less consumer spending (especially big-ticket items); higher rates also attract foreign capital + appreciate the currency. EXCHANGE RATES — explored in B6.3." },
      { code: "B6.2", title: "Environmental and ethical issues",
        learningOutcomes: "Externalities — costs the business creates that society pays (pollution, congestion, waste). Sustainable business — meeting today's needs without compromising the future (recyclable packaging, renewable energy, reducing carbon footprint). PRESSURE from government (regulation, taxes), consumers (boycotts, expectations), employees (recruitment), investors (ESG). ETHICAL business — going beyond what is legally required (fair wages, animal welfare, no child labour, transparent sourcing). Costs (higher prices, lower margin short-term) vs benefits (brand image, customer loyalty, talent attraction, lower future risks)." },
      { code: "B6.3", title: "Business and the international economy",
        learningOutcomes: "Why businesses go international: larger market, economies of scale, spread risk across countries, access raw materials, lower production costs. MULTINATIONAL companies (MNCs) — operate in 2+ countries. Benefits to host country (jobs, investment, technology transfer, tax revenue) vs costs (profits sent home, local competition crushed, possible exploitation). EXCHANGE RATE basics: appreciation (currency rises) → exports more expensive abroad + imports cheaper → bad for exporters, good for importers. Depreciation → opposite. Effects on importers, exporters, business planning. Free trade agreements vs protectionism (tariffs, quotas) — impact on businesses." },
    ],
  },
];

/**
 * Seed Cambridge IGCSE Business Studies 0450 topic tree if it isn't there yet.
 * Subject-scoped: only inserts when zero Business rows exist.
 */
export async function seedIgcseBusinessTopicsIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };

  // Make absolutely sure the column accepts 'business' before we try to insert.
  const ok = await ensureIgcseBusinessSubject();
  if (!ok) {
    console.error("[IGCSE] Cannot seed Business topics — subject enum widening failed.");
    return { seeded: 0 };
  }

  try {
    const existing = await db.execute(sql`SELECT COUNT(*) AS c FROM igcse_topics WHERE subject='business'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const count = Number(list?.[0]?.c ?? 0);
    if (count > 0) return { seeded: 0 };

    // Math 0..N + Physics 1000..N + Economics 2000..N; Business gets 3000 offset.
    let order = 3000;
    const rows: any[] = [];
    for (const area of AREAS) {
      for (const t of area.topics) {
        rows.push({
          subject: "business",
          syllabus: "CIE_0450",
          tier: "extended" as const, // 0450 has no core/extended split — using extended for compatibility
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
    console.log(`[IGCSE] Seeded ${rows.length} Business Studies topics for CIE 0450.`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Business topic seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
