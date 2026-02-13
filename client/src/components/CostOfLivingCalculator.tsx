import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Home, Utensils, Bus, Zap, Gamepad2, GraduationCap, Calculator, ChevronDown, TrendingUp, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const categoryConfig: Record<string, { icon: React.ElementType; label: string; labelId: string; color: string; bg: string }> = {
  rent: { icon: Home, label: "Rent / Accommodation", labelId: "Sewa / Akomodasi", color: "text-blue-600", bg: "bg-blue-50" },
  food: { icon: Utensils, label: "Food & Groceries", labelId: "Makanan & Belanja", color: "text-orange-600", bg: "bg-orange-50" },
  transport: { icon: Bus, label: "Transportation", labelId: "Transportasi", color: "text-green-600", bg: "bg-green-50" },
  utilities: { icon: Zap, label: "Utilities", labelId: "Utilitas", color: "text-yellow-600", bg: "bg-yellow-50" },
  entertainment: { icon: Gamepad2, label: "Entertainment", labelId: "Hiburan", color: "text-purple-600", bg: "bg-purple-50" },
  tuition: { icon: GraduationCap, label: "Tuition (per year)", labelId: "Biaya Kuliah (per tahun)", color: "text-red-600", bg: "bg-red-50" },
};

interface CostOfLivingCalculatorProps {
  countrySlug: string;
  countryName: string;
  fallbackData?: {
    tuition?: string;
    accommodation?: string;
    food?: string;
    transport?: string;
  };
}

export default function CostOfLivingCalculator({ countrySlug, countryName, fallbackData }: CostOfLivingCalculatorProps) {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [costLevel, setCostLevel] = useState<"min" | "avg" | "max">("avg");
  const [showDetails, setShowDetails] = useState(false);

  const { data, isLoading } = trpc.costOfLiving.getByCountry.useQuery(
    { countrySlug },
    { staleTime: 1000 * 60 * 30 } // cache 30 min
  );

  const cities = data?.cities ?? [];
  const activeCity = selectedCity || cities[0] || "";
  const cityData = data?.byCity?.[activeCity] ?? [];
  const localCurrency = data?.localCurrency ?? "USD";

  // Calculate totals
  const totals = useMemo(() => {
    if (cityData.length === 0) return null;
    let monthlyMin = 0;
    let monthlyMax = 0;
    let yearlyTuitionMin = 0;
    let yearlyTuitionMax = 0;

    for (const item of cityData) {
      if (item.category === "tuition") {
        yearlyTuitionMin += item.amountMinUsd;
        yearlyTuitionMax += item.amountMaxUsd;
      } else {
        monthlyMin += item.amountMinUsd;
        monthlyMax += item.amountMaxUsd;
      }
    }

    const monthlyAvg = Math.round((monthlyMin + monthlyMax) / 2);
    const yearlyLivingMin = monthlyMin * 12;
    const yearlyLivingMax = monthlyMax * 12;
    const yearlyLivingAvg = monthlyAvg * 12;
    const totalYearlyMin = yearlyLivingMin + yearlyTuitionMin;
    const totalYearlyMax = yearlyLivingMax + yearlyTuitionMax;
    const totalYearlyAvg = Math.round((totalYearlyMin + totalYearlyMax) / 2);

    return {
      monthlyMin, monthlyMax, monthlyAvg,
      yearlyLivingMin, yearlyLivingMax, yearlyLivingAvg,
      yearlyTuitionMin, yearlyTuitionMax,
      totalYearlyMin, totalYearlyMax, totalYearlyAvg,
    };
  }, [cityData]);

  const getAmount = (min: number, max: number) => {
    if (costLevel === "min") return min;
    if (costLevel === "max") return max;
    return Math.round((min + max) / 2);
  };

  const formatUsd = (amount: number) => `$${amount.toLocaleString()}`;

  // If no DB data, show fallback static data
  if (!isLoading && cities.length === 0 && fallbackData) {
    return (
      <section className="py-16">
        <div className="container">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Calculator className="w-4 h-4" />
              Cost of Living
            </div>
            <h2 className="text-3xl font-bold">
              Living Costs in {countryName}
            </h2>
            <p className="text-muted-foreground mt-2">Estimated monthly expenses for international students</p>
          </motion.div>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {Object.entries(fallbackData).map(([key, value], index) => {
              const config = categoryConfig[key === "accommodation" ? "rent" : key];
              const Icon = config?.icon ?? DollarSign;
              return (
                <motion.div
                  key={key}
                  className="p-6 bg-card rounded-xl shadow-sm border border-border text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-semibold capitalize mb-2">{key}</h4>
                  <p className="text-sm text-primary font-medium">{value}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-64 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-96 mx-auto"></div>
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-muted rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (cities.length === 0) return null;

  return (
    <section className="py-16">
      <div className="container">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Calculator className="w-4 h-4" />
            Interactive Cost Calculator
          </div>
          <h2 className="text-3xl font-bold">
            Cost of Living in {countryName}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Select a city and budget level to estimate your monthly and yearly expenses as an international student.
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {/* City Selector */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={activeCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="pl-9 pr-10 py-2.5 bg-card border border-border rounded-lg text-sm font-medium appearance-none cursor-pointer hover:border-primary transition-colors min-w-[200px]"
            >
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Budget Level Toggle */}
          <div className="flex bg-card border border-border rounded-lg p-1">
            {[
              { key: "min" as const, label: "Budget", emoji: "💰" },
              { key: "avg" as const, label: "Average", emoji: "⚖️" },
              { key: "max" as const, label: "Comfort", emoji: "✨" },
            ].map(level => (
              <button
                key={level.key}
                onClick={() => setCostLevel(level.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  costLevel === level.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="mr-1">{level.emoji}</span>
                {level.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Summary Cards */}
        {totals && (
          <motion.div
            className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 text-center shadow-lg">
              <p className="text-blue-100 text-sm mb-1">Monthly Living Cost</p>
              <p className="text-3xl font-bold">
                {formatUsd(getAmount(totals.monthlyMin, totals.monthlyMax))}
              </p>
              <p className="text-blue-200 text-xs mt-1">
                {formatUsd(totals.monthlyMin)} – {formatUsd(totals.monthlyMax)} range
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-6 text-center shadow-lg">
              <p className="text-emerald-100 text-sm mb-1">Yearly Living Cost</p>
              <p className="text-3xl font-bold">
                {formatUsd(getAmount(totals.yearlyLivingMin, totals.yearlyLivingMax))}
              </p>
              <p className="text-emerald-200 text-xs mt-1">
                {formatUsd(totals.yearlyLivingMin)} – {formatUsd(totals.yearlyLivingMax)} range
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary to-red-500 text-white rounded-2xl p-6 text-center shadow-lg">
              <p className="text-red-100 text-sm mb-1">Total Yearly (incl. Tuition)</p>
              <p className="text-3xl font-bold">
                {formatUsd(getAmount(totals.totalYearlyMin, totals.totalYearlyMax))}
              </p>
              <p className="text-red-200 text-xs mt-1">
                {formatUsd(totals.totalYearlyMin)} – {formatUsd(totals.totalYearlyMax)} range
              </p>
            </div>
          </motion.div>
        )}

        {/* Detailed Breakdown */}
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-center gap-2 mb-4"
            onClick={() => setShowDetails(!showDetails)}
          >
            <TrendingUp className="w-4 h-4" />
            {showDetails ? "Hide" : "Show"} Detailed Breakdown
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </Button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cityData.map((item, index) => {
                    const config = categoryConfig[item.category];
                    if (!config) return null;
                    const Icon = config.icon;
                    const amount = getAmount(item.amountMinUsd, item.amountMaxUsd);
                    const localAmount = getAmount(item.amountMinLocal, item.amountMaxLocal);

                    return (
                      <motion.div
                        key={item.id}
                        className={`p-5 rounded-xl border border-border bg-card hover:shadow-md transition-shadow`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{config.label}</h4>
                            <p className="text-xs text-muted-foreground">{config.labelId}</p>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{formatUsd(amount)}</span>
                          <span className="text-xs text-muted-foreground">
                            /{item.category === "tuition" ? "year" : "month"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {localCurrency} {localAmount.toLocaleString()}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">{item.notes}</p>
                        )}
                        {/* Range bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{formatUsd(item.amountMinUsd)}</span>
                            <span>{formatUsd(item.amountMaxUsd)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${config.color.replace("text-", "bg-")} opacity-60`}
                              style={{
                                width: item.amountMaxUsd > item.amountMinUsd
                                  ? `${((amount - item.amountMinUsd) / (item.amountMaxUsd - item.amountMinUsd)) * 100}%`
                                  : "50%",
                              }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground mt-8 max-w-2xl mx-auto">
          * Estimates are based on average student spending in {activeCity}. Actual costs may vary depending on lifestyle, accommodation type, and personal preferences. All amounts shown in USD.
        </p>
      </div>
    </section>
  );
}
