import { useEffect, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { CheckCircle, Mail, Clock, ArrowRight } from "lucide-react";

export default function ProPaymentSuccess() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const orderId = params.get("order");
  const [lang] = useState<"id" | "en">("id");

  const orderQuery = trpc.aptitude.checkOrderStatus.useQuery(
    { externalId: orderId || "" },
    { enabled: !!orderId, refetchInterval: 3000 }
  );

  useEffect(() => {
    document.title = "Payment Successful - Tes Bakat AI Pro";
  }, []);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-4">No order ID found.</p>
          <button onClick={() => setLocation("/test/pro")} className="text-indigo-600 hover:underline">
            Back to Tes Bakat AI Pro
          </button>
        </div>
      </div>
    );
  }

  const isPaid = orderQuery.data?.status === "paid";
  const isPending = orderQuery.data?.status === "pending";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
          {isPaid ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {lang === "id" ? "Pembayaran Berhasil!" : "Payment Successful!"}
              </h2>
              <p className="text-gray-600 mb-6">
                {lang === "id"
                  ? "Link akses Tes Bakat AI Pro sudah dikirim ke email kamu. Silakan cek inbox atau folder spam."
                  : "Your AI Aptitude Test Pro access link has been sent to your email. Please check your inbox or spam folder."}
              </p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-indigo-700">
                  <Mail className="w-5 h-5" />
                  <span className="font-medium text-sm">
                    {lang === "id" ? "Cek email kamu sekarang!" : "Check your email now!"}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-6">
                Order ID: {orderId}
              </div>
            </>
          ) : isPending ? (
            <>
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {lang === "id" ? "Menunggu Konfirmasi..." : "Waiting for Confirmation..."}
              </h2>
              <p className="text-gray-600 mb-6">
                {lang === "id"
                  ? "Pembayaran kamu sedang diproses. Halaman ini akan otomatis update setelah pembayaran dikonfirmasi."
                  : "Your payment is being processed. This page will automatically update once payment is confirmed."}
              </p>
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {lang === "id" ? "Memuat..." : "Loading..."}
              </h2>
            </>
          )}

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              ← {lang === "id" ? "Kembali ke Beranda" : "Back to Home"}
            </button>
            {isPaid && (
              <button
                onClick={() => setLocation("/test/pro")}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                {lang === "id" ? "Ke Halaman Tes" : "Go to Test Page"}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
