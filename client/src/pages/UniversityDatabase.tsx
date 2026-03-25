import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Search, Globe, ExternalLink, MapPin, Trophy } from "lucide-react";

const COUNTRIES = [
  "All Countries", "UK", "Australia", "USA", "Canada", "Malaysia",
  "Singapore", "New Zealand", "Ireland", "Netherlands", "Germany",
  "China", "Japan", "South Korea",
];

const COUNTRY_FLAGS: Record<string, string> = {
  "UK": "🇬🇧", "Australia": "🇦🇺", "USA": "🇺🇸", "Canada": "🇨🇦",
  "Malaysia": "🇲🇾", "Singapore": "🇸🇬", "New Zealand": "🇳🇿",
  "Ireland": "🇮🇪", "Netherlands": "🇳🇱", "Germany": "🇩🇪",
  "China": "🇨🇳", "Japan": "🇯🇵", "South Korea": "🇰🇷",
};

export default function UniversityDatabase() {
  const [selectedCountry, setSelectedCountry] = useState("All Countries");
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.crm.getUniversities.useQuery(
    {
      country: selectedCountry === "All Countries" ? undefined : selectedCountry,
      search: search.length >= 2 ? search : undefined,
      limit: 200,
    },
    { keepPreviousData: true } as any
  );

  const universities = (data as any)?.universities || [];

  // Group by country for display
  const grouped = useMemo(() => {
    const map: Record<string, typeof universities> = {};
    for (const uni of universities) {
      if (!map[uni.country]) map[uni.country] = [];
      map[uni.country].push(uni);
    }
    return map;
  }, [universities]);

  const countryList = Object.keys(grouped).sort();

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#060d1a]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-[#f59e0b]" />
            University Database
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {universities.length} universities across {countryList.length} countries
          </p>
        </div>
        <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30 text-sm px-3 py-1.5">
          Sprint 9 Feature
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search universities..."
            className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-white/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCountry === c
                  ? "bg-[#e91e8c] text-white"
                  : "bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10"
              }`}
            >
              {COUNTRY_FLAGS[c] || ""} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12 text-white/40">Loading universities...</div>
      )}

      {/* Results */}
      {!isLoading && universities.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No universities found. Try a different search or country.</p>
        </div>
      )}

      {/* Grouped by country */}
      {!isLoading && countryList.map(country => (
        <div key={country}>
          <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>{COUNTRY_FLAGS[country] || "🌍"}</span>
            <span>{country}</span>
            <span className="text-white/30 font-normal normal-case">({grouped[country].length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {grouped[country].map((uni: any) => (
              <Card key={uni.id} className="bg-[#0d1424]/80 border-white/10 hover:border-white/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white text-sm font-semibold leading-tight line-clamp-2">{uni.name}</h3>
                      {uni.city && (
                        <div className="flex items-center gap-1 mt-1 text-white/40 text-xs">
                          <MapPin className="w-3 h-3" />
                          {uni.city}
                        </div>
                      )}
                    </div>
                    {uni.ranking && (
                      <div className="flex items-center gap-1 shrink-0 bg-[#f59e0b]/10 text-[#f59e0b] text-xs px-2 py-1 rounded-full border border-[#f59e0b]/20">
                        <Trophy className="w-3 h-3" />
                        #{uni.ranking}
                      </div>
                    )}
                  </div>

                  {/* Programs */}
                  {uni.programs && (() => {
                    try {
                      const progs: string[] = JSON.parse(uni.programs);
                      return (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {progs.slice(0, 3).map(p => (
                            <span key={p} className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full border border-white/10">
                              {p}
                            </span>
                          ))}
                          {progs.length > 3 && (
                            <span className="text-xs text-white/30">+{progs.length - 3}</span>
                          )}
                        </div>
                      );
                    } catch { return null; }
                  })()}

                  {/* Type + Website */}
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      uni.type === "private"
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                        : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                    }`}>
                      {uni.type === "private" ? "Private" : "Public"}
                    </span>
                    {uni.website && (
                      <a
                        href={uni.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-white/40 hover:text-[#f59e0b] transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <Globe className="w-3 h-3" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
