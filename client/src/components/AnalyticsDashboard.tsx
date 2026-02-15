import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, FileText, Calendar,
  DollarSign, BookOpen, Brain, Minus, BarChart3, Globe,
  Award
} from "lucide-react";

type TimeRange = "week" | "month" | "quarter" | "year" | "all";

function getDateRange(range: TimeRange): { startDate: string; endDate: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;

  switch (range) {
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case "quarter":
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case "year":
      start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case "all":
      start = new Date(2020, 0, 1);
      break;
  }

  return { startDate: start.toISOString(), endDate: end };
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

const PIPELINE_COLORS: Record<string, string> = {
  submitted: "#3b82f6",
  reviewing: "#f97316",
  processing: "#eab308",
  on_hold: "#6b7280",
  offer_received: "#8b5cf6",
  accepted: "#22c55e",
  enrolled: "#10b981",
  rejected: "#ef4444",
};

const PIPELINE_LABELS: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "Reviewing",
  processing: "Processing",
  on_hold: "On Hold",
  offer_received: "Offer Received",
  accepted: "Accepted",
  enrolled: "Enrolled",
  rejected: "Rejected",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function KPICard({
  title,
  value,
  prevValue,
  icon: Icon,
  format = "number",
  color = "text-gray-900",
}: {
  title: string;
  value: number;
  prevValue?: number;
  icon: React.ElementType;
  format?: "number" | "currency" | "percent";
  color?: string;
}) {
  const displayValue = format === "currency"
    ? formatCurrency(value)
    : format === "percent"
    ? `${value}%`
    : value.toLocaleString();

  let changePercent = 0;
  let changeDirection: "up" | "down" | "neutral" = "neutral";
  if (prevValue !== undefined && prevValue > 0) {
    changePercent = Math.round(((value - prevValue) / prevValue) * 100);
    changeDirection = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "neutral";
  } else if (prevValue !== undefined && prevValue === 0 && value > 0) {
    changeDirection = "up";
    changePercent = 100;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-gray-50">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {prevValue !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            changeDirection === "up" ? "text-green-600" :
            changeDirection === "down" ? "text-red-500" : "text-gray-400"
          }`}>
            {changeDirection === "up" && <TrendingUp className="w-3 h-3" />}
            {changeDirection === "down" && <TrendingDown className="w-3 h-3" />}
            {changeDirection === "neutral" && <Minus className="w-3 h-3" />}
            {changePercent !== 0 ? `${Math.abs(changePercent)}%` : "—"}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{displayValue}</div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const dateRange = useMemo(() => getDateRange(timeRange), [timeRange]);

  const { data: kpis, isLoading: kpisLoading } = trpc.analytics.kpis.useQuery(dateRange);
  const { data: leadsData } = trpc.analytics.leadsOverTime.useQuery(dateRange);
  const { data: pipeline } = trpc.analytics.applicationPipeline.useQuery();
  const { data: revenue } = trpc.analytics.revenueOverTime.useQuery(dateRange);
  const { data: sources } = trpc.analytics.leadsBySource.useQuery(dateRange);
  const { data: countries } = trpc.analytics.topCountries.useQuery(dateRange);
  const { data: counselors } = trpc.analytics.counselorPerformance.useQuery();

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
    { value: "year", label: "This Year" },
    { value: "all", label: "All Time" },
  ];

  const pipelineData = useMemo(() => {
    if (!pipeline) return [];
    const order = ["submitted", "reviewing", "processing", "on_hold", "offer_received", "accepted", "enrolled", "rejected"];
    return order.map(status => {
      const found = pipeline.find((p: { status: string; count: number }) => p.status === status);
      return {
        name: PIPELINE_LABELS[status] || status,
        value: found ? found.count : 0,
        color: PIPELINE_COLORS[status] || "#6b7280",
      };
    }).filter(d => d.value > 0);
  }, [pipeline]);

  const sourceData = useMemo(() => {
    if (!sources) return [];
    return (sources as { source: string; count: number }[]).filter(s => s.count > 0);
  }, [sources]);

  return (
    <div className="space-y-6">
      {/* Header with Time Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Track your key performance metrics and trends</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {timeRangeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeRange === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Total Leads" value={kpis.totalLeads} prevValue={kpis.totalLeadsPrev} icon={Users} color="text-blue-600" />
          <KPICard title="Applications" value={kpis.totalApplications} prevValue={kpis.totalApplicationsPrev} icon={FileText} color="text-purple-600" />
          <KPICard title="Appointments" value={kpis.totalAppointments} prevValue={kpis.totalAppointmentsPrev} icon={Calendar} color="text-orange-500" />
          <KPICard title="Pro Revenue" value={kpis.totalProRevenue} prevValue={kpis.totalProRevenuePrev} icon={DollarSign} format="currency" color="text-green-600" />
          <KPICard title="IELTS Tests" value={kpis.totalIeltsTests} prevValue={kpis.totalIeltsTestsPrev} icon={BookOpen} color="text-red-500" />
          <KPICard title="Aptitude Tests" value={kpis.totalAptitudeTests} prevValue={kpis.totalAptitudeTestsPrev} icon={Brain} color="text-indigo-600" />
        </div>
      ) : null}

      {/* Conversion Rate Banner */}
      {kpis && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-sm text-emerald-700 font-medium">Application → Enrollment Conversion Rate</div>
              <div className="text-xs text-emerald-600 mt-0.5">{kpis.enrolledCount} students enrolled out of all applications</div>
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-700">{kpis.conversionRate}%</div>
        </div>
      )}

      {/* Charts Row 1: Leads Over Time + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Over Time */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Leads Over Time</h3>
          </div>
          <div className="h-64">
            {leadsData && leadsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsData as { date: string; count: number }[]}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v: string) => new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    formatter={(value: number) => [value, "Leads"]}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#leadsGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No lead data for this period
              </div>
            )}
          </div>
        </div>

        {/* Revenue Over Time */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Pro Test Revenue</h3>
          </div>
          <div className="h-64">
            {revenue && revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue as { date: string; total: number; count: number }[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    labelFormatter={(v: string) => new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    formatter={(value: number, name: string) => [
                      name === "total" ? formatCurrency(value) : value,
                      name === "total" ? "Revenue" : "Orders"
                    ]}
                  />
                  <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No revenue data for this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Pipeline + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Pipeline */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Application Pipeline</h3>
          </div>
          <div className="h-64">
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value: number) => [value, "Applications"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No applications yet
              </div>
            )}
          </div>
        </div>

        {/* Leads by Source */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Leads by Source</h3>
          </div>
          <div className="h-64">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="source"
                    label={({ source, count }: { source: string; count: number }) => `${source}: ${count}`}
                    labelLine={true}
                  >
                    {sourceData.map((_: { source: string; count: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, "Leads"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No source data for this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 3: Top Countries */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-gray-900">Top Countries of Interest</h3>
        </div>
        <div className="h-64">
          {countries && countries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countries as { country: string | null; count: number }[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(value: number) => [value, "Leads"]} />
                <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]}>
                  {(countries as { country: string | null; count: number }[]).map((_: { country: string | null; count: number }, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No country data for this period
            </div>
          )}
        </div>
      </div>

      {/* Counselor Performance Table */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Counselor Performance</h3>
        </div>
        {counselors && counselors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Counselor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Specialization</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Leads</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Applications</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Enrolled</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Rate</th>
                </tr>
              </thead>
              <tbody>
                {(counselors as { name: string; specialization: string; leadsAssigned: number; applicationsManaged: number; enrolled: number; enrollmentRate: number }[]).map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 px-4 text-gray-600">{c.specialization}</td>
                    <td className="py-3 px-4 text-center">{c.leadsAssigned}</td>
                    <td className="py-3 px-4 text-center">{c.applicationsManaged}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {c.enrolled}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.min(c.enrollmentRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{c.enrollmentRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400 text-sm">
            No counselor data available
          </div>
        )}
      </div>
    </div>
  );
}
