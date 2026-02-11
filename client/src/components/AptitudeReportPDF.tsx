import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { trpc } from "@/lib/trpc";

// ========== LABELS ==========
const riasecLabels: Record<string, { id: string; en: string }> = {
  R: { id: "Realistis", en: "Realistic" },
  I: { id: "Investigatif", en: "Investigative" },
  A: { id: "Artistik", en: "Artistic" },
  S: { id: "Sosial", en: "Social" },
  E: { id: "Enterprising", en: "Enterprising" },
  C: { id: "Konvensional", en: "Conventional" },
};

const miLabels: Record<string, { id: string; en: string }> = {
  linguistic: { id: "Linguistik", en: "Linguistic" },
  logical: { id: "Logis-Matematis", en: "Logical-Mathematical" },
  spatial: { id: "Visual-Spasial", en: "Visual-Spatial" },
  musical: { id: "Musikal", en: "Musical" },
  kinesthetic: { id: "Kinestetik", en: "Kinesthetic" },
  interpersonal: { id: "Interpersonal", en: "Interpersonal" },
  intrapersonal: { id: "Intrapersonal", en: "Intrapersonal" },
  naturalistic: { id: "Naturalis", en: "Naturalistic" },
};

// ========== BAR COMPONENT ==========
function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
        <span style={{ color: "#334155" }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{score}%</span>
      </div>
      <div style={{ background: "#e2e8f0", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{ background: color, height: "100%", width: `${Math.max(score, 3)}%`, borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ========== MAIN EXPORT ==========
export default function AptitudeReportDownload({
  resultId,
  studentName,
  language,
}: {
  resultId: number;
  studentName: string;
  language: "id" | "en";
}) {
  const [generating, setGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const isId = language === "id";

  const { data: result } = trpc.aptitude.getResult.useQuery(
    { id: resultId },
    { enabled: !!resultId }
  );

  const handleDownload = async () => {
    if (!result) return;
    setGenerating(true);
    setShowReport(true);

    // Wait for render
    await new Promise((r) => setTimeout(r, 500));

    try {
      const el = reportRef.current;
      if (!el) throw new Error("Report element not found");

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794, // A4 width in px at 96dpi
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Additional pages
      while (heightLeft > 0) {
        position = position - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `Tes-Bakat-AI_${studentName.replace(/\s+/g, "-")}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setGenerating(false);
      setShowReport(false);
    }
  };

  if (!resultId) return null;

  const riasecScores = result?.riasecScores || {};
  const miScores = result?.miScores || {};
  const aiAnalysis = result?.aiAnalysis || {};
  const hollandCode = result?.hollandCode || "";
  const snapshot = aiAnalysis.personalitySnapshot || {};
  const majors = aiAnalysis.recommendedMajors || [];

  const sortedRiasec = Object.entries(riasecScores as Record<string, number>).sort((a, b) => b[1] - a[1]);
  const sortedMi = Object.entries(miScores as Record<string, number>).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={generating || !result}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {isId ? "Membuat PDF..." : "Generating PDF..."}
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            {isId ? "Download Laporan PDF" : "Download PDF Report"}
          </>
        )}
      </button>

      {/* Hidden report for PDF capture */}
      {showReport && (
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            zIndex: -1,
          }}
        >
          <div
            ref={reportRef}
            style={{
              width: 794,
              padding: "40px 48px",
              fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
              color: "#1e293b",
              background: "#ffffff",
              lineHeight: 1.5,
            }}
          >
            {/* ===== HEADER ===== */}
            <div style={{ textAlign: "center", marginBottom: 32, borderBottom: "3px solid #0d9488", paddingBottom: 24 }}>
              <div style={{ fontSize: 12, color: "#0d9488", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                SpecTa Education
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
                {isId ? "Laporan Tes Bakat AI" : "AI Aptitude Test Report"}
              </h1>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {studentName} &bull; {new Date().toLocaleDateString(isId ? "id-ID" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>

            {/* ===== PERSONALITY SNAPSHOT ===== */}
            <div style={{
              background: "linear-gradient(135deg, #0d9488, #10b981)",
              borderRadius: 16,
              padding: "24px 28px",
              color: "white",
              marginBottom: 28,
            }}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
                {isId ? "Profil Kepribadian" : "Personality Profile"}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: "white" }}>
                {snapshot.emoji || "🧠"} {snapshot.title || ""}
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "rgba(255,255,255,0.9)" }}>
                {snapshot.description || ""}
              </p>
              <div style={{
                marginTop: 16,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 10,
                padding: "10px 16px",
                display: "inline-block",
              }}>
                <span style={{ fontSize: 11, opacity: 0.8 }}>Holland Code</span>
                <br />
                <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4 }}>{hollandCode}</span>
              </div>
            </div>

            {/* ===== RIASEC ANALYSIS ===== */}
            {aiAnalysis.riasecAnalysis && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0d9488", marginBottom: 8 }}>
                  {isId ? "🧠 Analisis Minat & Kepribadian" : "🧠 Interest & Personality Analysis"}
                </h3>
                <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>{aiAnalysis.riasecAnalysis}</p>
              </div>
            )}

            {/* ===== RIASEC SCORES ===== */}
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>
                📊 {isId ? "Skor RIASEC" : "RIASEC Scores"}
              </h3>
              {sortedRiasec.map(([key, score]) => (
                <ScoreBar
                  key={key}
                  label={`${isId ? riasecLabels[key]?.id : riasecLabels[key]?.en} (${key})`}
                  score={score as number}
                  color="#0d9488"
                />
              ))}
            </div>

            {/* ===== MI ANALYSIS ===== */}
            {aiAnalysis.miAnalysis && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed", marginBottom: 8 }}>
                  {isId ? "✨ Analisis Kecerdasan" : "✨ Intelligence Analysis"}
                </h3>
                <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>{aiAnalysis.miAnalysis}</p>
              </div>
            )}

            {/* ===== MI SCORES ===== */}
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>
                🧩 {isId ? "Skor Kecerdasan Majemuk" : "Multiple Intelligence Scores"}
              </h3>
              {sortedMi.map(([key, score]) => (
                <ScoreBar
                  key={key}
                  label={isId ? miLabels[key]?.id || key : miLabels[key]?.en || key}
                  score={score as number}
                  color="#7c3aed"
                />
              ))}
            </div>

            {/* ===== CROSS ANALYSIS ===== */}
            {aiAnalysis.crossAnalysis && (
              <div style={{ background: "#f0fdfa", borderRadius: 12, padding: "18px 20px", marginBottom: 24, border: "1px solid #ccfbf1" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                  ⚡ {isId ? "Insight Unik Kamu" : "Your Unique Insight"}
                </h3>
                <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>{aiAnalysis.crossAnalysis}</p>
              </div>
            )}

            {/* ===== RECOMMENDED MAJORS ===== */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>
                🎓 {isId ? "Rekomendasi Jurusan" : "Recommended Majors"}
              </h3>
              {majors.map((m: any, i: number) => (
                <div key={i} style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "14px 18px",
                  marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                      #{i + 1} {m.name}
                    </h4>
                    <span style={{
                      background: "#ccfbf1",
                      color: "#0d9488",
                      padding: "3px 10px",
                      borderRadius: 16,
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {m.compatibilityScore}% {isId ? "cocok" : "match"}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, margin: "6px 0" }}>{m.reason}</p>
                  {m.careers && (
                    <div style={{ marginTop: 6 }}>
                      {m.careers.map((c: string, ci: number) => (
                        <span key={ci} style={{
                          display: "inline-block",
                          background: "#f0fdf4",
                          color: "#166534",
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontSize: 10,
                          marginRight: 4,
                          marginBottom: 2,
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ===== CAREER OUTLOOK ===== */}
            {aiAnalysis.careerOutlook && (
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                  💼 {isId ? "Prospek Karir" : "Career Outlook"}
                </h3>
                <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>{aiAnalysis.careerOutlook}</p>
              </div>
            )}

            {/* ===== STUDY TIPS ===== */}
            {aiAnalysis.studyTips && (
              <div style={{ background: "#eff6ff", borderRadius: 12, padding: "18px 20px", marginBottom: 24, border: "1px solid #bfdbfe" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>
                  📚 {isId ? "Tips Persiapan" : "Preparation Tips"}
                </h3>
                <p style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.7 }}>{aiAnalysis.studyTips}</p>
              </div>
            )}

            {/* ===== PARENT SUMMARY ===== */}
            {aiAnalysis.parentSummary && (
              <div style={{ background: "#fffbeb", borderRadius: 12, padding: "18px 20px", marginBottom: 24, border: "1px solid #fde68a" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
                  👨‍👩‍👧 {isId ? "Ringkasan untuk Orang Tua" : "Parent Summary"}
                </h3>
                <p style={{ fontSize: 10, color: "#a16207", marginBottom: 8 }}>
                  {isId ? "Bagikan bagian ini kepada orang tua Anda" : "Share this section with your parents"}
                </p>
                <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>{aiAnalysis.parentSummary}</p>
              </div>
            )}

            {/* ===== FOOTER ===== */}
            <div style={{
              borderTop: "2px solid #e2e8f0",
              paddingTop: 20,
              marginTop: 32,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                {isId
                  ? "Laporan ini dihasilkan oleh AI SpecTa Education. Untuk konsultasi lebih lanjut:"
                  : "This report was generated by SpecTa Education AI. For further consultation:"}
              </div>
              <div style={{ fontSize: 12, color: "#0d9488", fontWeight: 600 }}>
                wa.me/6281287878055 &bull; spectaeducation.com
              </div>
              <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 8 }}>
                © {new Date().getFullYear()} SpecTa Education. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
