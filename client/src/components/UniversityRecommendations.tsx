import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { GraduationCap, Globe, DollarSign, ExternalLink, Award, Loader2, Building2 } from "lucide-react";

type Lang = "id" | "en";

const MI_LABEL_MAP: Record<string, string> = {
  "Linguistic": "linguistic",
  "Logical-Mathematical": "logical",
  "Spatial-Visual": "spatial",
  "Musical": "musical",
  "Bodily-Kinesthetic": "kinesthetic",
  "Interpersonal": "interpersonal",
  "Intrapersonal": "intrapersonal",
  "Naturalistic": "naturalistic",
};

interface Props {
  riasecScores: Record<string, number>;
  miScores: Record<string, number>;
  lang: Lang;
}

export default function UniversityRecommendations({ riasecScores, miScores, lang }: Props) {
  // Normalize MI score keys to lowercase format expected by the matching engine
  const normalizedMiScores: Record<string, number> = {};
  for (const [key, value] of Object.entries(miScores)) {
    const normalized = MI_LABEL_MAP[key] || key.toLowerCase().replace(/[^a-z]/g, "");
    normalizedMiScores[normalized] = value;
  }

  const { data: recommendations, isLoading, error } = trpc.universityMatch.getRecommendations.useQuery({
    riasecScores,
    miScores: normalizedMiScores,
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6"
      >
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
          <span className="text-sm text-gray-500">
            {lang === "id" ? "Mencari universitas yang cocok..." : "Finding matching universities..."}
          </span>
        </div>
      </motion.div>
    );
  }

  if (error || !recommendations || recommendations.length === 0) {
    return null; // Silently hide if no recommendations available
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6"
    >
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-teal-600" />
        <h3 className="font-bold text-lg text-gray-900">
          {lang === "id" ? "Rekomendasi Universitas" : "University Recommendations"}
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        {lang === "id"
          ? "Berdasarkan profil RIASEC dan Kecerdasan Majemuk kamu, berikut universitas dan program yang paling cocok:"
          : "Based on your RIASEC and Multiple Intelligence profile, here are the best-matching universities and programs:"}
      </p>

      <div className="space-y-4">
        {recommendations.map((rec, i) => (
          <div
            key={`${rec.university.id}-${rec.program.id}`}
            className="relative p-4 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-shadow"
          >
            {/* Match score badge */}
            <div className="absolute top-3 right-3">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                rec.matchScore >= 70
                  ? "bg-emerald-50 text-emerald-700"
                  : rec.matchScore >= 50
                    ? "bg-teal-50 text-teal-700"
                    : "bg-blue-50 text-blue-700"
              }`}>
                <Award className="w-3 h-3" />
                {rec.matchScore}% {lang === "id" ? "cocok" : "match"}
              </div>
            </div>

            {/* University info */}
            <div className="flex items-start gap-3 mb-3">
              {rec.university.logoUrl ? (
                <img
                  src={rec.university.logoUrl}
                  alt={rec.university.name}
                  className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-teal-600" />
                </div>
              )}
              <div className="flex-1 min-w-0 pr-20">
                <h4 className="font-semibold text-gray-900 text-sm">{rec.university.name}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {rec.university.city}, {rec.university.country}
                  </span>
                  {rec.university.ranking && (
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{rec.university.ranking}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Program info */}
            <div className="bg-teal-50/50 rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                <span className="font-medium text-sm text-teal-800">{rec.program.programName}</span>
                <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded capitalize">
                  {rec.program.degreeLevel}
                </span>
              </div>
              <p className="text-xs text-gray-600">{rec.program.fieldOfStudy}</p>
            </div>

            {/* Details row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {rec.university.tuitionMinUsd && rec.university.tuitionMaxUsd && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  ${rec.university.tuitionMinUsd.toLocaleString()} - ${rec.university.tuitionMaxUsd.toLocaleString()}/yr
                </span>
              )}
              {rec.university.ieltsMin && (
                <span>IELTS {rec.university.ieltsMin}+</span>
              )}
              {rec.university.scholarshipAvailable && (
                <span className="text-green-600 font-medium">
                  {lang === "id" ? "✨ Beasiswa tersedia" : "✨ Scholarship available"}
                </span>
              )}
              {rec.university.website && (
                <a
                  href={rec.university.website.startsWith("http") ? rec.university.website : `https://${rec.university.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  {lang === "id" ? "Website" : "Website"}
                </a>
              )}
            </div>

            {/* Match breakdown */}
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full"
                    style={{ width: `${rec.riasecMatch}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">RIASEC {rec.riasecMatch}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${rec.miMatch}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">MI {rec.miMatch}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-5 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl text-center">
        <p className="text-sm text-teal-800 font-medium">
          {lang === "id"
            ? "Ingin tahu lebih lanjut tentang universitas ini?"
            : "Want to learn more about these universities?"}
        </p>
        <p className="text-xs text-teal-600 mt-1">
          {lang === "id"
            ? "Hubungi konselor SpecTa Education untuk panduan lengkap!"
            : "Contact a SpecTa Education counselor for complete guidance!"}
        </p>
      </div>
    </motion.div>
  );
}
