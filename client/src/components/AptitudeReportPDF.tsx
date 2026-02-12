import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

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
  const [error, setError] = useState("");
  const isId = language === "id";

  const downloadPdfMutation = trpc.aptitude.downloadPdf.useMutation();

  const handleDownload = async () => {
    if (!resultId) return;
    setGenerating(true);
    setError("");

    try {
      const result = await downloadPdfMutation.mutateAsync({ id: resultId });
      if (result.pdfUrl) {
        // Open the PDF URL in a new tab for download
        window.open(result.pdfUrl, "_blank");
      } else {
        setError(isId ? "Gagal membuat PDF. Silakan coba lagi." : "Failed to generate PDF. Please try again.");
      }
    } catch (err: any) {
      console.error("PDF download error:", err);
      setError(
        isId
          ? "Gagal membuat PDF. Silakan coba lagi nanti."
          : "Failed to generate PDF. Please try again later."
      );
    } finally {
      setGenerating(false);
    }
  };

  if (!resultId) return null;

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={generating}
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
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
