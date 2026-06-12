import { useEffect, useRef } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

/**
 * Redeems an admin-issued free-access link: /ielts/redeem/:token
 * If logged in, creates a free attempt and forwards to the test. If not,
 * prompts sign-in and returns here afterwards.
 */
export default function IeltsFreeRedeem() {
  const [, params] = useRoute<{ token: string }>("/ielts/redeem/:token");
  const token = params?.token ?? "";
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const firedRef = useRef(false);

  const redeemMut = trpc.ielts.redeemFreePass.useMutation({
    onSuccess: data => {
      setLocation(`/ielts/mock-test/take/${data.attemptToken}`);
    },
  });

  useEffect(() => {
    if (!loading && user && token && !firedRef.current) {
      firedRef.current = true;
      redeemMut.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, token]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation currentPage="ielts" />
      <div className="pt-28 pb-16 px-4">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          {loading ? (
            <p className="text-slate-600">Loading…</p>
          ) : !user ? (
            <>
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                Sign in to unlock your free test
              </h1>
              <p className="text-sm text-slate-600 mb-5">
                Create a free account or sign in, then this link will start your
                IELTS Mock Test at no charge.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(`/ielts/redeem/${token}`)}`}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg"
              >
                Sign in / Create account
              </Link>
            </>
          ) : redeemMut.isError ? (
            <>
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                Couldn't open this link
              </h1>
              <p className="text-sm text-red-600 mb-5">
                {redeemMut.error.message}
              </p>
              <Link
                href="/ielts/mock-test"
                className="text-blue-600 hover:underline text-sm"
              >
                Go to the IELTS Mock Test page
              </Link>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-1">
                Unlocking your free test…
              </h1>
              <p className="text-sm text-slate-600">
                One moment — we're setting up your attempt.
              </p>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
