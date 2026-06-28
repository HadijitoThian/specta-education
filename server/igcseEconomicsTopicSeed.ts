/**
 * Cambridge IGCSE Economics 0455 — full topic tree (first exam 2023 syllabus).
 *
 * Authored from Cambridge's published syllabus areas E1–E6. Seeded once into
 * `igcse_topics` on startup (idempotent: only inserts if no Economics rows
 * exist yet). The `learningOutcomes` field is what the AI Teacher uses as
 * grounding when teaching a topic.
 *
 * Topic `code` is prefixed with "E" (e.g. "E2.7") to avoid colliding with
 * Math's "2.7" or Physics' "P2.7". Area codes are "E1".."E6".
 */
import { getDb, ensureIgcseEconomicsSubject } from "./db";
import { igcseTopics } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Seed = { code: string; title: string; learningOutcomes: string };
type Area = { code: string; name: string; topics: Seed[] };

const AREAS: Area[] = [
  {
    code: "E1", name: "The basic economic problem",
    topics: [
      { code: "E1.1", title: "The economic problem",
        learningOutcomes: "Scarcity: unlimited wants in a world of finite resources; the need for choice; the three fundamental economic questions (what to produce, how to produce, for whom to produce). Distinguish economic goods (scarce, have an opportunity cost) from free goods." },
      { code: "E1.2", title: "Factors of production",
        learningOutcomes: "Define and give examples of the four factors of production — LAND (natural resources, rent), LABOUR (human effort, wages), CAPITAL (man-made aids to production, interest), ENTERPRISE (organising the other three + risk-taking, profit). Mobility (geographical + occupational) and quality of each factor; how the factors are combined to produce goods and services." },
      { code: "E1.3", title: "Opportunity cost",
        learningOutcomes: "Definition: the next best alternative forgone when a choice is made. Apply to individuals (e.g. buying a phone vs saving), firms (e.g. expanding factory A vs B), and governments (e.g. spending on healthcare vs defence). Relates directly to scarcity and choice." },
      { code: "E1.4", title: "Production possibility curve",
        learningOutcomes: "The PPC (also PPF) as a model showing maximum possible output combinations of two goods given current resources and technology. Points on the curve = productive efficiency; inside = unemployment/inefficiency; outside = unattainable (now). Movements ALONG the PPC show opportunity cost; OUTWARD shifts represent economic growth (better resources/technology); INWARD shifts represent loss of productive capacity." },
    ],
  },
  {
    code: "E2", name: "The allocation of resources",
    topics: [
      { code: "E2.1", title: "Microeconomics and macroeconomics",
        learningOutcomes: "Microeconomics = study of individual decision makers (households, firms, individual markets). Macroeconomics = study of the economy as a whole (GDP, inflation, unemployment, government policy). Examples of each." },
      { code: "E2.2", title: "Role of markets in allocating resources",
        learningOutcomes: "How prices act as signals (telling producers what to make and consumers what to buy) and incentives (rewarding production of profitable goods). The three economic questions answered through the price mechanism in a free market." },
      { code: "E2.3", title: "Demand",
        learningOutcomes: "Definition of demand (willingness AND ability to buy at a given price). The demand curve (downward-sloping); law of demand (price ↓ → quantity demanded ↑, ceteris paribus). Non-price factors that SHIFT the demand curve: income, taste/fashion, price of substitutes, price of complements, population size + structure, advertising, expectations." },
      { code: "E2.4", title: "Supply",
        learningOutcomes: "Definition of supply (willingness AND ability to produce + sell at a given price). The supply curve (upward-sloping); law of supply (price ↑ → quantity supplied ↑, ceteris paribus). Non-price shift factors: costs of production, technology, taxes/subsidies, weather (for agricultural goods), number of suppliers." },
      { code: "E2.5", title: "Price determination — market equilibrium",
        learningOutcomes: "Equilibrium price + quantity = where supply curve crosses demand curve; the market clears (no shortage, no surplus). Above-equilibrium price → surplus (excess supply) → price falls. Below-equilibrium → shortage → price rises. The 'invisible hand' adjustment toward equilibrium." },
      { code: "E2.6", title: "Price changes — shifts vs movements",
        learningOutcomes: "Distinguish a MOVEMENT along a curve (caused by a change in the GOOD'S OWN PRICE — extension/contraction) from a SHIFT of the curve (caused by a change in any non-price factor). Show on a diagram how a shift in demand or supply changes the equilibrium price and quantity." },
      { code: "E2.7", title: "Price elasticity of demand (PED)",
        learningOutcomes: "PED = % change in quantity demanded ÷ % change in price (treated as a positive number). Values: PED > 1 elastic, PED < 1 inelastic, PED = 1 unit elastic. Determinants: availability of substitutes, proportion of income spent, necessity vs luxury, time period, addictiveness. Implications for firms (revenue: if PED inelastic, raising price increases revenue) and governments (taxing inelastic goods raises more revenue)." },
      { code: "E2.8", title: "Price elasticity of supply (PES)",
        learningOutcomes: "PES = % change in quantity supplied ÷ % change in price. Determinants: time period (longer time → more elastic), stocks, spare capacity, factor mobility, ease of entry. Why agricultural supply tends to be inelastic in the short run; why manufactured goods can be more elastic." },
      { code: "E2.9", title: "Market economic system",
        learningOutcomes: "A pure market economy: resources allocated by the price mechanism, private ownership of factors, profit motive, consumer sovereignty. Advantages (efficiency, choice, innovation, incentives) and disadvantages (inequality, market failure, public goods underprovided, ignores externalities)." },
      { code: "E2.10", title: "Market failure",
        learningOutcomes: "When the market fails to allocate resources efficiently. Causes: negative externalities (e.g. pollution), positive externalities (e.g. vaccination), public goods (non-rival + non-excludable — e.g. street lighting, defence), merit goods (under-consumed — e.g. education), demerit goods (over-consumed — e.g. sugary drinks, junk food), monopoly power, factor immobility, information failure. Government can intervene via taxes, subsidies, regulation, direct provision." },
      { code: "E2.11", title: "Mixed economic system",
        learningOutcomes: "Most real economies have private + public sectors coexisting. The role of the public sector (provide public goods, correct externalities, regulate monopolies, redistribute income via tax & welfare). Examples of mixed economies." },
    ],
  },
  {
    code: "E3", name: "Microeconomic decision makers",
    topics: [
      { code: "E3.1", title: "Money and banking",
        learningOutcomes: "Functions of money (medium of exchange, store of value, unit of account, standard of deferred payment). The role of commercial banks (accept deposits, lend money, transfer funds, foreign exchange) and the central bank (issue currency, banker to government, set interest rates, regulate banks)." },
      { code: "E3.2", title: "Households",
        learningOutcomes: "Influences on consumer SPENDING (disposable income, wealth, interest rates, confidence, expectations, age), SAVING (income, interest rates, confidence, taxation, age), and BORROWING (interest rates, availability of credit, confidence, expectations). Why people in poorer countries often save less; how rising interest rates affect each decision." },
      { code: "E3.3", title: "Workers",
        learningOutcomes: "Factors affecting an individual's CHOICE OF OCCUPATION (wage, non-wage benefits, working conditions, hours, holidays, qualifications, family expectations). Factors affecting WAGE DIFFERENTIALS between occupations (skill, qualifications, supply and demand for that labour, danger, trade union power, government legislation, discrimination)." },
      { code: "E3.4", title: "Trade unions",
        learningOutcomes: "What unions do (collective bargaining for wages + conditions, represent workers, protect employment). Methods used (negotiation, work-to-rule, overtime ban, strike). Advantages to workers (higher pay, better conditions, voice). Disadvantages to firms (higher costs, disruption) and consumers (higher prices). Effect on labour market." },
      { code: "E3.5", title: "Firms",
        learningOutcomes: "Classification of firms by size (small, medium, large) — measured by number of employees, capital, turnover, output. By sector — primary (extraction), secondary (manufacturing), tertiary (services). By ownership — sole trader, partnership, private limited (Ltd), public limited (plc), public corporation. Reasons firms remain small (small market, financing limits, owner preference); reasons firms grow (economies of scale, market power, security)." },
      { code: "E3.6", title: "Firms and production",
        learningOutcomes: "Specialisation + division of labour: advantages (higher productivity, skill development, lower unit costs) and disadvantages (boredom, dependence). Economies of scale (internal: technical, financial, managerial, marketing, purchasing, risk-bearing; external: skilled labour pool, supplier networks, infrastructure). Diseconomies of scale (communication, coordination, motivation problems in very large firms)." },
      { code: "E3.7", title: "Firms' costs, revenue and objectives",
        learningOutcomes: "Costs: fixed costs (do NOT vary with output — rent, salaries, insurance) vs variable costs (DO vary with output — raw materials, hourly wages). Total cost = FC + VC. Average cost = TC/Q. Total revenue = price × quantity. Profit = TR − TC. Firm objectives: profit maximisation, survival, growth, increasing market share, social/environmental goals." },
      { code: "E3.8", title: "Market structure (competition and monopoly)",
        learningOutcomes: "Perfect competition (many small firms, identical products, free entry, no market power, P = MC). Monopoly (one dominant firm, barriers to entry, price maker, supernormal profit). Advantages of competition (lower prices, choice, innovation, efficiency). Disadvantages of monopoly (higher prices, less choice, x-inefficiency) and possible advantages (economies of scale, R&D funding, natural monopoly in utilities)." },
    ],
  },
  {
    code: "E4", name: "Government and the macroeconomy",
    topics: [
      { code: "E4.1", title: "The role of government",
        learningOutcomes: "Microeconomic roles: provide public goods, correct externalities, regulate monopolies, redistribute income, provide a legal framework. Macroeconomic objectives: full employment (low unemployment), low and stable inflation, economic growth, balance of payments equilibrium, redistribution of income, environmental sustainability." },
      { code: "E4.2", title: "Government macroeconomic policies",
        learningOutcomes: "FISCAL POLICY = changes in government spending and taxation. Expansionary (↑G, ↓T) to boost AD; contractionary (↓G, ↑T) to cool inflation. MONETARY POLICY = changes in interest rates and money supply, usually by the central bank. ↓ interest rates → ↑ borrowing, ↑ spending, ↑ investment → ↑ AD. SUPPLY-SIDE policy = measures to increase productive capacity (education, training, infrastructure, deregulation, privatisation, lower business taxes, labour market reforms). Each policy's strengths, weaknesses, conflicts." },
      { code: "E4.3", title: "Economic growth",
        learningOutcomes: "Definition: increase in real GDP over time. Causes: more/better resources (capital investment, labour force growth, education + training, technology, discovery of natural resources, infrastructure). Costs of growth: pollution, environmental damage, depletion of resources, possible inequality, inflation if AD-led. Benefits: higher living standards, lower unemployment, more tax revenue for public services." },
      { code: "E4.4", title: "Employment and unemployment",
        learningOutcomes: "Measuring unemployment: claimant count, labour force survey. Types: frictional (between jobs), seasonal (e.g. tourism), structural (mismatch of skills), cyclical (caused by recession), technological (replaced by machines). Causes of each. Consequences for individuals (loss of income, mental health), firms (lower demand, but lower wages), government (↑ benefits + ↓ tax revenue), economy (lower output, social problems)." },
      { code: "E4.5", title: "Inflation and deflation",
        learningOutcomes: "Inflation = sustained rise in the general price level (measured by CPI). Causes: demand-pull (excess AD), cost-push (rising costs of production e.g. wages, raw materials), imported inflation (rising import prices), monetary (excess money supply). Consequences: erodes purchasing power, hurts savers, fixed-income groups, exporters (if domestic inflation > foreign); benefits debtors. Deflation = falling price level. Policies to control: contractionary monetary/fiscal, supply-side." },
    ],
  },
  {
    code: "E5", name: "Economic development",
    topics: [
      { code: "E5.1", title: "Living standards",
        learningOutcomes: "Material living standards (real GDP per capita) vs non-material (health, education, environment, leisure, freedom, security). GDP per capita: useful but limited (doesn't capture inequality, non-market activity, externalities, quality of life). Human Development Index (HDI): combines income, health (life expectancy), education (years of schooling) — gives a fuller picture." },
      { code: "E5.2", title: "Poverty",
        learningOutcomes: "Absolute poverty (income below a subsistence threshold, e.g. World Bank's US\\$2.15/day) vs relative poverty (low income compared to others in the same country). Causes: unemployment, low wages, large families, old age, lack of education, illness, government policy, war/conflict. Government policies to reduce poverty: minimum wage, progressive taxation, welfare benefits, free education + healthcare, job creation, training schemes." },
      { code: "E5.3", title: "Population",
        learningOutcomes: "Determinants of population change: birth rate, death rate, net migration. Reasons for differences between countries (developed vs developing). Optimum population concept. Impact of an ageing population (rising pensions, healthcare costs, falling labour force, dependency ratio). Impact of a youthful population (education + healthcare costs now, large future workforce). Impact of migration on host + source countries." },
      { code: "E5.4", title: "Differences in economic development",
        learningOutcomes: "Characteristics of developing economies (lower GDP per capita, lower productivity, primary-sector dependence, high birth/death rates, lower life expectancy, lower literacy, less infrastructure). Causes of differences: history (colonialism), geography (climate, landlocked), resources, education, health, political stability, savings + investment levels, debt. Role of aid (advantages, problems of tied aid + dependency), trade vs aid debate." },
    ],
  },
  {
    code: "E6", name: "International trade and globalisation",
    topics: [
      { code: "E6.1", title: "International specialisation",
        learningOutcomes: "Why countries specialise + trade (absolute and comparative advantage — Cambridge focus is on the BENEFITS rather than the formal model). Benefits of international specialisation: higher world output, lower prices, more choice, economies of scale, technology transfer. Disadvantages: over-reliance on one product, vulnerability to world price changes, structural unemployment if industries decline." },
      { code: "E6.2", title: "Globalisation, free trade and protection",
        learningOutcomes: "Globalisation = increasing interconnection of national economies (trade, capital flows, migration, technology). Drivers: transport + communication tech, MNCs, trade liberalisation. Free trade benefits (lower prices, more choice, competition + efficiency) vs costs (job losses in uncompetitive industries, environmental damage). PROTECTIONISM = barriers to trade — tariffs (taxes on imports), quotas (limits on quantity), subsidies to domestic firms, embargoes, regulations. Arguments for protection (infant industries, jobs, anti-dumping, strategic) vs arguments against (higher prices, retaliation, inefficiency, less choice)." },
      { code: "E6.3", title: "Foreign exchange rates",
        learningOutcomes: "Exchange rate = price of one currency in terms of another. Determined by demand and supply of the currency on foreign exchange markets. Causes of changes in DEMAND (exports rising, foreign investment in, interest rates rising attracts capital, speculation) and SUPPLY (imports rising, capital outflows, central bank intervention). Floating vs fixed/managed regimes. Effects of appreciation (exports more expensive abroad → fall; imports cheaper → rise; inflationary pressure falls) and depreciation (opposite)." },
      { code: "E6.4", title: "Current account of the balance of payments",
        learningOutcomes: "Components of the current account: trade in goods (visibles), trade in services (invisibles), primary income (wages, interest, profits), secondary income (transfers — aid, remittances). Surplus vs deficit. Causes of a current account DEFICIT: high domestic demand, overvalued exchange rate, low productivity, lack of competitiveness, structural problems. Effects of a persistent deficit: financed by capital inflows / running down reserves, exchange rate pressure, possible lower growth. Policies to correct: expenditure-reducing (contractionary fiscal/monetary), expenditure-switching (devaluation, protectionism, supply-side improvements)." },
    ],
  },
];

/**
 * Seed Cambridge IGCSE Economics 0455 topic tree if it isn't there yet.
 * Subject-scoped: only inserts when zero Economics rows exist.
 */
export async function seedIgcseEconomicsTopicsIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };

  // Make absolutely sure the column accepts 'economics' before we try to insert.
  const ok = await ensureIgcseEconomicsSubject();
  if (!ok) {
    console.error("[IGCSE] Cannot seed Economics topics — subject enum widening failed.");
    return { seeded: 0 };
  }

  try {
    const existing = await db.execute(sql`SELECT COUNT(*) AS c FROM igcse_topics WHERE subject='economics'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const count = Number(list?.[0]?.c ?? 0);
    if (count > 0) return { seeded: 0 };

    // Math 0..N + Physics 1000..N; Economics gets 2000 offset.
    let order = 2000;
    const rows: any[] = [];
    for (const area of AREAS) {
      for (const t of area.topics) {
        rows.push({
          subject: "economics",
          syllabus: "CIE_0455",
          tier: "extended" as const, // Economics doesn't have core/extended split — using extended for compatibility
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
    console.log(`[IGCSE] Seeded ${rows.length} Economics topics for CIE 0455.`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Economics topic seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
