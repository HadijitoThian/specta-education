import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { fireConversion } from "@/lib/googleAds";

export default function IeltsMockSuccess() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("attempt") ?? "";

  const [pollCount, setPollCount] = useState(0);
  const firedRef = useRef(false);

  const attemptQuery = trpc.ielts.getAttempt.useQuery(
    { token },
    {
      enabled: !!token,
      refetchInterval: query => {
        const data = query.state.data;
        return data?.attempt?.status === "awaiting_payment" ? 2500 : false;
      },
    }
  );

  // After 30 polls (~75s) stop showing "waiting" and let user retry.
  useEffect(() => {
    if (attemptQuery.isFetched) setPollCount(n => n + 1);
  }, [attemptQuery.isFetched]);

  // Fire the "Mock Test purchased" Google Ads conversion once payment is
  // confirmed. Rp 79k, keyed to the attempt token so a page reload / back
  // button doesn't fire it twice (Google dedupes by transaction_id).
  useEffect(() => {
    const status = attemptQuery.data?.attempt?.status;
    if (status && status !== "awaiting_payment" && !firedRef.current) {
      firedRef.current = true;
      fireConversion("mockTest", { value: 79000, currency: "IDR", transactionId: token });
    }
  }, [attemptQuery.data?.attempt?.status, token]);

  if (!token) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold mb-2">No attempt token</h1>
        <p className="text-slate-600 text-sm">
          Looks like you reached this page without a valid payment link.
        </p>
        <Link
          href="/ielts/mock-test"
          className="inline-block mt-4 text-blue-600 hover:underline"
        >
          Back to mock test
        </Link>
      </Centered>
    );
  }

  if (attemptQuery.isLoading) {
    return <Centered>Loading…</Centered>;
  }

  if (attemptQuery.isError) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold mb-2">Attempt not found</h1>
        <p className="text-slate-600 text-sm">
          That attempt token doesn't match anything in our system. If you just
          paid, the webhook may still be processing — wait a few seconds and
          refresh.
        </p>
      </Centered>
    );
  }

  const status = attemptQuery.data?.attempt.status;
  const test = attemptQuery.data?.test;
  const isReady = status === "ready" || (status && status !== "awaiting_payment");

  return (
    <Centered>
      {isReady ? (
        <>
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-semibold mb-2">Payment confirmed</h1>
          <p className="text-slate-600 mb-4">
            Your IELTS Mock Test is unlocked and ready to take whenever
            you are.
          </p>
          {test ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-sm">
              <div className="font-semibold">{test.title}</div>
              <div className="text-slate-500 mt-1">
                {test.testType === "academic" ? "Academic" : "General Training"}
                {" · "}
                Code: {test.code}
              </div>
            </div>
          ) : null}
          <div className="space-y-3">
            <Link
              href={`/ielts/mock-test/take/${token}`}
              className="block w-full bg-amber-400 hover:bg-amber-300 text-slate-900 text-center font-semibold py-3 rounded-lg transition"
            >
              Start test
            </Link>
            <p className="text-xs text-slate-500">
              You can come back to this link any time — your attempt
              auto-saves and doesn't expire.
            </p>
            <Link
              href="/"
              className="block text-blue-600 hover:underline text-sm"
            >
              Back to homepage
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="text-4xl mb-3">⏳</div>
          <h1 className="text-xl font-semibold mb-2">Confirming payment…</h1>
          <p className="text-slate-600 text-sm mb-4">
            Xendit usually confirms within a few seconds. If this takes
            longer than a minute, please refresh the page.
          </p>
          {pollCount > 20 ? (
            <button
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:underline text-sm"
            >
              Refresh now
            </button>
          ) : null}
        </>
      )}
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center">
        {children}
      </div>
    </div>
  );
}
