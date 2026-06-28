/**
 * Cambridge IGCSE Mathematics 0580 — Extended tier topic tree.
 *
 * Authored from Cambridge's published syllabus areas C1–C9. Seeded once into
 * `igcse_topics` on startup (idempotent: only inserts when the table is empty).
 * The `learningOutcomes` field is what the AI Teacher uses as grounding when
 * teaching a topic — additional past-paper grounding via RAG is added later.
 *
 * Tier values: "extended" = Extended paper only; "both" = both Core & Extended.
 */
import { getDb } from "./db";
import { igcseTopics } from "../drizzle/schema";
import { sql } from "drizzle-orm";

type Seed = { code: string; title: string; learningOutcomes: string; tier?: "core" | "extended" | "both" };
type Area = { code: string; name: string; topics: Seed[] };

const AREAS: Area[] = [
  {
    code: "C1", name: "Number",
    topics: [
      { code: "1.1", title: "Types of number", learningOutcomes: "Identify and use natural numbers, integers, prime numbers, square/cube numbers, common factors and multiples, rational and irrational numbers, real numbers, reciprocals." },
      { code: "1.2", title: "Sets", learningOutcomes: "Set notation, Venn diagrams, intersection (∩), union (∪), subsets (⊆, ⊂), complement (A'), universal set (ξ), empty set (∅), describe sets in set-builder notation." },
      { code: "1.3", title: "Powers and roots", learningOutcomes: "Squares, square roots, cubes, cube roots; calculate with integer powers and roots of positive numbers." },
      { code: "1.4", title: "Fractions, decimals and percentages", learningOutcomes: "Use fractions, decimals and percentages equivalently; convert between forms; recurring decimals to fractions (Extended)." },
      { code: "1.5", title: "Ordering", learningOutcomes: "Order quantities using <, >, ≤, ≥, =, ≠; compare numbers expressed in different forms." },
      { code: "1.6", title: "The four operations", learningOutcomes: "Apply the four operations with integers, fractions and decimals, including correct order of operations (BIDMAS/BODMAS), positive and negative numbers." },
      { code: "1.7", title: "Indices I", learningOutcomes: "Use index notation; rules of indices with positive, negative and zero integer indices; reciprocal as negative index." },
      { code: "1.8", title: "Standard form", learningOutcomes: "Convert to/from standard form A × 10ⁿ where 1 ≤ A < 10; calculate with standard form." },
      { code: "1.9", title: "Estimation", learningOutcomes: "Round numbers to a given number of decimal places or significant figures; estimate by rounding values in calculations." },
      { code: "1.10", title: "Limits of accuracy", learningOutcomes: "Find upper and lower bounds of rounded values; calculate bounds of sums, differences, products and quotients (Extended)." },
      { code: "1.11", title: "Ratio and proportion", learningOutcomes: "Use ratio and proportion to solve problems; divide a quantity in a given ratio; direct and inverse proportion." },
      { code: "1.12", title: "Rates", learningOutcomes: "Solve problems involving average speed, density, pressure and other compound measures; convert between units." },
      { code: "1.13", title: "Percentages", learningOutcomes: "Percentage of a quantity; percentage increase/decrease; reverse percentages; compound interest and depreciation; percentage change." },
      { code: "1.14", title: "Using a calculator", learningOutcomes: "Efficient calculator use; interpret display; check answers; use brackets, memory, fraction and trig keys." },
      { code: "1.15", title: "Time", learningOutcomes: "Calculate with time in 12-/24-hour clock; read timetables and units of time." },
      { code: "1.16", title: "Money", learningOutcomes: "Solve problems involving money, including exchange rates, profit and loss, simple interest." },
      { code: "1.17", title: "Exponential growth and decay", learningOutcomes: "Use exponential growth/decay formulas in finance and population contexts (Extended)." },
      { code: "1.18", title: "Surds", learningOutcomes: "Manipulate and simplify surds; rationalise the denominator (Extended)." },
      { code: "1.19", title: "Sequences", learningOutcomes: "Continue and describe sequences; find the nth term of linear, quadratic, cubic and exponential sequences (Extended); generate sequences from a rule." },
    ],
  },
  {
    code: "C2", name: "Algebra and graphs",
    topics: [
      { code: "2.1", title: "Algebraic notation and manipulation", learningOutcomes: "Use letters for unknowns; substitute values; collect like terms; expand and simplify expressions." },
      { code: "2.2", title: "Algebraic fractions", learningOutcomes: "Add, subtract, multiply, divide and simplify algebraic fractions (Extended)." },
      { code: "2.3", title: "Indices II", learningOutcomes: "Apply rules of indices with fractional, negative and zero indices in algebraic contexts (Extended)." },
      { code: "2.4", title: "Equations: linear", learningOutcomes: "Construct and solve linear equations in one unknown; equations with unknowns on both sides; with brackets and fractions." },
      { code: "2.5", title: "Equations: simultaneous", learningOutcomes: "Solve two linear simultaneous equations (substitution and elimination); one linear and one quadratic (Extended)." },
      { code: "2.6", title: "Equations: quadratic", learningOutcomes: "Solve quadratic equations by factorising, by the formula, and by completing the square (Extended)." },
      { code: "2.7", title: "Inequalities", learningOutcomes: "Solve linear inequalities; represent on a number line; solve simultaneous linear inequalities; quadratic inequalities (Extended)." },
      { code: "2.8", title: "Expansion and factorisation", learningOutcomes: "Expand brackets including (a+b)(c+d); factorise: common factor, grouping, difference of two squares, quadratic trinomials (Extended)." },
      { code: "2.9", title: "Rearranging formulae", learningOutcomes: "Change the subject of a formula, including formulae with squares and roots and where the new subject appears more than once (Extended)." },
      { code: "2.10", title: "Functions", learningOutcomes: "Use function notation f(x); find f(a); inverse functions f⁻¹(x); composite functions fg(x) (Extended)." },
      { code: "2.11", title: "Graphs of functions", learningOutcomes: "Construct tables of values and plot graphs of: linear, quadratic, cubic, reciprocal, exponential (Extended). Interpret graphs in context." },
      { code: "2.12", title: "Solving equations graphically", learningOutcomes: "Solve equations and simultaneous equations approximately using graphs." },
      { code: "2.13", title: "Gradient of a curve", learningOutcomes: "Estimate the gradient of a curve at a point by drawing a tangent (Extended)." },
      { code: "2.14", title: "Differentiation", learningOutcomes: "Differentiate xⁿ for n a positive or negative integer; find gradient at a point; turning points; maxima and minima (Extended — selected papers)." },
    ],
  },
  {
    code: "C3", name: "Coordinate geometry",
    topics: [
      { code: "3.1", title: "Coordinates", learningOutcomes: "Use Cartesian coordinates in two dimensions; plot and read points." },
      { code: "3.2", title: "Equation of a straight line", learningOutcomes: "Find the equation y = mx + c from points or graph; gradient and y-intercept; equations in form ax + by + c = 0." },
      { code: "3.3", title: "Parallel and perpendicular lines", learningOutcomes: "Use gradient relationships for parallel (m₁=m₂) and perpendicular (m₁·m₂=−1) lines (Extended)." },
      { code: "3.4", title: "Midpoint and distance", learningOutcomes: "Find the midpoint and length of a line segment given its endpoints." },
    ],
  },
  {
    code: "C4", name: "Geometry",
    topics: [
      { code: "4.1", title: "Geometrical vocabulary and properties", learningOutcomes: "Identify and use vocabulary for points, lines, parallel, perpendicular, angles, polygons, circles, solids; classify triangles and quadrilaterals." },
      { code: "4.2", title: "Geometrical construction", learningOutcomes: "Construct triangles, perpendicular bisectors, angle bisectors and lines using ruler and compasses." },
      { code: "4.3", title: "Scale drawings", learningOutcomes: "Use and interpret scale drawings; convert between scale and actual measurements." },
      { code: "4.4", title: "Similarity", learningOutcomes: "Recognise similar shapes; use ratio of corresponding sides; area and volume scale factors (Extended)." },
      { code: "4.5", title: "Symmetry", learningOutcomes: "Line and rotational symmetry in 2D; planes of symmetry in 3D." },
      { code: "4.6", title: "Angle properties", learningOutcomes: "Angles on a line, around a point, vertically opposite; parallel-line angles; sum of angles in a triangle and quadrilateral." },
      { code: "4.7", title: "Polygons", learningOutcomes: "Interior and exterior angles of regular and irregular polygons; apply angle sum (n-2)·180°." },
      { code: "4.8", title: "Circle theorems", learningOutcomes: "Angle in a semicircle = 90°; angle at centre = 2× angle at circumference; angles in same segment; cyclic quadrilateral; tangent perpendicular to radius; alternate segment theorem (Extended)." },
    ],
  },
  {
    code: "C5", name: "Mensuration",
    topics: [
      { code: "5.1", title: "Units", learningOutcomes: "Convert between metric units of length, area, volume, mass and capacity." },
      { code: "5.2", title: "Perimeter and area", learningOutcomes: "Calculate perimeter and area of rectangles, triangles, parallelograms, trapeziums and compound shapes." },
      { code: "5.3", title: "Circles, arcs and sectors", learningOutcomes: "Circumference and area of a circle; arc length and sector area (Extended)." },
      { code: "5.4", title: "Surface area and volume", learningOutcomes: "Surface area and volume of cuboid, prism, cylinder, cone, sphere and pyramid (Extended)." },
      { code: "5.5", title: "Compound shapes", learningOutcomes: "Calculate measures for compound 2D shapes and 3D solids made from cuboid/cylinder/cone/sphere components." },
    ],
  },
  {
    code: "C6", name: "Trigonometry",
    topics: [
      { code: "6.1", title: "Pythagoras' theorem", learningOutcomes: "Apply a² + b² = c² in 2D and 3D problems (3D Extended)." },
      { code: "6.2", title: "Right-angled trigonometry", learningOutcomes: "Use sine, cosine and tangent ratios to find sides and angles in right-angled triangles." },
      { code: "6.3", title: "Sine and cosine rules", learningOutcomes: "Apply sine rule a/sinA = b/sinB and cosine rule a² = b² + c² − 2bc·cosA in non-right-angled triangles (Extended)." },
      { code: "6.4", title: "Area of a triangle", learningOutcomes: "Use area = ½ab·sinC (Extended)." },
      { code: "6.5", title: "Trigonometry in 3D", learningOutcomes: "Apply Pythagoras and right-angled trig to 3D problems (Extended)." },
      { code: "6.6", title: "Bearings", learningOutcomes: "Interpret and use three-figure bearings in trig and geometry problems." },
      { code: "6.7", title: "Trigonometric graphs", learningOutcomes: "Recognise, sketch and interpret graphs of sin x, cos x, tan x for 0° ≤ x ≤ 360°; solve simple trig equations (Extended)." },
    ],
  },
  {
    code: "C7", name: "Transformations and vectors",
    topics: [
      { code: "7.1", title: "Transformations", learningOutcomes: "Reflect, rotate, translate and enlarge shapes; describe transformations fully; combine transformations (Extended)." },
      { code: "7.2", title: "Vectors", learningOutcomes: "Vector notation; magnitude; addition, subtraction and scalar multiplication; column vectors; position vectors; use vectors in geometry (Extended)." },
    ],
  },
  {
    code: "C8", name: "Probability",
    topics: [
      { code: "8.1", title: "Probability basics", learningOutcomes: "Calculate the probability of a single event as a fraction, decimal or percentage; relative frequency; expected frequency." },
      { code: "8.2", title: "Combined events", learningOutcomes: "Mutually exclusive events (add probabilities); independent events (multiply probabilities); use tree and Venn diagrams." },
      { code: "8.3", title: "Conditional probability", learningOutcomes: "Compute conditional probabilities P(A|B), with tables, Venn and tree diagrams (Extended)." },
    ],
  },
  {
    code: "C9", name: "Statistics",
    topics: [
      { code: "9.1", title: "Classifying data", learningOutcomes: "Distinguish categorical, discrete and continuous data; identify primary and secondary data." },
      { code: "9.2", title: "Tally tables and frequency tables", learningOutcomes: "Construct and read tally and frequency tables, including grouped data." },
      { code: "9.3", title: "Graphical display", learningOutcomes: "Construct and interpret bar charts, pie charts, pictograms, stem-and-leaf, scatter diagrams, frequency polygons." },
      { code: "9.4", title: "Averages", learningOutcomes: "Calculate mean, median, mode and range from a list; calculate mean from a frequency table; identify modal class from grouped data." },
      { code: "9.5", title: "Histograms", learningOutcomes: "Construct and interpret histograms with frequency density for unequal class widths (Extended)." },
      { code: "9.6", title: "Cumulative frequency", learningOutcomes: "Construct cumulative frequency curves; estimate median, quartiles, interquartile range and percentiles (Extended)." },
      { code: "9.7", title: "Box plots", learningOutcomes: "Construct and interpret box-and-whisker plots; compare distributions (Extended)." },
      { code: "9.8", title: "Scatter diagrams and correlation", learningOutcomes: "Draw and interpret scatter diagrams; describe correlation; draw a line of best fit and use it to estimate values." },
    ],
  },
];

/**
 * Seed the IGCSE topic tree if the table is empty. Idempotent — safe to call
 * on every boot. Re-runs only fill missing rows; existing rows are untouched.
 */
export async function seedIgcseTopicsIfEmpty(): Promise<{ seeded: number }> {
  const db = await getDb();
  if (!db) return { seeded: 0 };
  try {
    // Subject-scoped: only seed Math if no Math topics exist. Lets us add
    // other subjects (Physics, etc.) independently via their own seeders.
    const existing = await db.execute(sql`SELECT COUNT(*) AS c FROM igcse_topics WHERE subject='math'`);
    const list: any[] = Array.isArray(existing[0]) ? existing[0] : (existing as any);
    const count = Number(list?.[0]?.c ?? 0);
    if (count > 0) return { seeded: 0 };

    let order = 0;
    const rows: any[] = [];
    for (const area of AREAS) {
      for (const t of area.topics) {
        rows.push({
          subject: "math",
          syllabus: "CIE_0580",
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
    console.log(`[IGCSE] Seeded ${rows.length} topics for CIE 0580 (Extended).`);
    return { seeded: rows.length };
  } catch (e) {
    console.error("[IGCSE] Topic seed failed:", (e as Error).message);
    return { seeded: 0 };
  }
}
