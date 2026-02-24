import { useState, useEffect, useMemo } from "react";
import { SEO } from '@/components/SEO';
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Unsubscribe() {
  useEffect(() => {
    document.title = "Unsubscribe | SpecTa Education";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Manage your email subscription preferences for SpecTa Education notifications and updates.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Manage your email subscription preferences for SpecTa Education notifications and updates.';
      document.head.appendChild(meta);
    }
  }, []);

  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  });
  const [confirmed, setConfirmed] = useState(false);

  const unsubscribeMutation = trpc.dripCampaign.unsubscribe.useMutation({
    onSuccess: () => {
      setConfirmed(true);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <SEO
        title="Unsubscribe | SpecTa Education"
        description="Manage your email subscription preferences for SpecTa Education."
        noindex
      />
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h1>
            <p className="text-gray-500">This unsubscribe link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed || unsubscribeMutation.data?.alreadyUnsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Berhasil Berhenti Berlangganan</h1>
            <p className="text-gray-500 mb-4">
              Kamu tidak akan menerima email otomatis dari kami lagi.
            </p>
            <p className="text-sm text-gray-400">
              Jika kamu berubah pikiran, kamu bisa menghubungi kami kapan saja di{" "}
              <a href="https://spectaeducation.com/contact" className="text-red-500 hover:underline">
                spectaeducation.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Berhenti Berlangganan</h1>
          <p className="text-gray-500 mb-6">
            Apakah kamu yakin ingin berhenti menerima email dari SpecTa Education?
          </p>
          {unsubscribeMutation.isError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
              {unsubscribeMutation.error?.message || "Terjadi kesalahan. Coba lagi nanti."}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/"}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => unsubscribeMutation.mutate({ token })}
              disabled={unsubscribeMutation.isPending}
            >
              {unsubscribeMutation.isPending ? "Processing..." : "Ya, Berhenti Berlangganan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
