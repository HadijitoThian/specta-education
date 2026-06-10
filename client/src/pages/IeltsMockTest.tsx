import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function IeltsMockTest() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const catalog = trpc.ielts.catalog.useQuery();
  const startCheckout = trpc.ielts.startCheckout.useMutation();

  const [testType, setTestType] = useState<"academic" | "general">("academic");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Prefill from logged-in user
  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.email && !email) setEmail(user.email);
  }, [user, name, email]);

  // Failure return from Xendit
  const searchParams = new URLSearchParams(window.location.search);
  const failedFlag = searchParams.get("failed") === "1";

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setLocation("/login");
      return;
    }

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required");
      return;
    }

    try {
      const res = await startCheckout.mutateAsync({
        testType,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim() || undefined,
      });
      // Redirect to Xendit hosted checkout.
      window.location.href = res.invoiceUrl;
    } catch (err: any) {
      setError(err?.message ?? "Could not start checkout");
    }
  };

  const idr = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  const academicCount = catalog.data?.academicTests ?? 0;
  const generalCount = catalog.data?.generalTests ?? 0;
  const price = catalog.data?.priceIdr ?? 79000;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">
            SpecTa IELTS Mock Test
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            A full-length practice IELTS test with all 4 skills. AI-graded,
            instant report, ~40× cheaper than the real exam. Practice
            unlimited times.
          </p>
        </div>

        {failedFlag ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-2xl mx-auto mb-8 text-sm text-amber-800">
            Your last payment didn't complete. You can try again below.
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Left — what's included */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">What's included</h2>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex gap-2">
                <span>🎧</span>
                <span>
                  <strong>Listening</strong> — 4 sections, 40 questions,
                  realistic accent variety, audio plays once
                </span>
              </li>
              <li className="flex gap-2">
                <span>📖</span>
                <span>
                  <strong>Reading</strong> — 3 passages, 40 questions, 60 min
                  timer
                </span>
              </li>
              <li className="flex gap-2">
                <span>✏️</span>
                <span>
                  <strong>Writing</strong> — Task 1 + Task 2, AI-graded
                  against IELTS band descriptors with per-criterion feedback
                </span>
              </li>
              <li className="flex gap-2">
                <span>🎤</span>
                <span>
                  <strong>Speaking</strong> — Live AI examiner agent.
                  Conversational, just like the real test.
                </span>
              </li>
              <li className="flex gap-2">
                <span>📊</span>
                <span>
                  <strong>Branded PDF report</strong> with band-by-band
                  breakdown + recommendations, delivered to your email
                </span>
              </li>
            </ul>
          </div>

          {/* Right — pricing card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg">
            <div className="mb-6">
              <p className="text-sm text-amber-300 uppercase tracking-wider mb-1">
                Pay per attempt
              </p>
              <p className="text-5xl font-bold">{idr(price)}</p>
              <p className="text-sm text-slate-300 mt-1">
                vs IDR 3.2M for the real IELTS test
              </p>
            </div>

            <form onSubmit={handleBuy} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Test type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestType("academic")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                      testType === "academic"
                        ? "bg-white text-slate-900 border-white"
                        : "bg-transparent text-white border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    Academic ({academicCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestType("general")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                      testType === "general"
                        ? "bg-white text-slate-900 border-white"
                        : "bg-transparent text-white border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    General ({generalCount})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  WhatsApp number (optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {error ? (
                <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  authLoading ||
                  startCheckout.isPending ||
                  (testType === "academic" && academicCount === 0) ||
                  (testType === "general" && generalCount === 0)
                }
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-slate-600 disabled:text-slate-400 text-slate-900 font-semibold py-3 rounded-lg transition"
              >
                {startCheckout.isPending
                  ? "Redirecting to checkout…"
                  : !user
                    ? "Sign in to continue"
                    : `Buy & take it — ${idr(price)}`}
              </button>

              {!user ? (
                <p className="text-xs text-slate-400 text-center">
                  You'll be asked to sign in or sign up first.{" "}
                  <Link href="/signup" className="text-amber-300 hover:underline">
                    Create account
                  </Link>
                </p>
              ) : null}
            </form>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-slate-500 max-w-3xl mx-auto text-center leading-relaxed">
          This is a practice mock test by SpecTa Education. It is not an
          official IELTS score and is not affiliated with British Council,
          IDP, or Cambridge Assessment English. Use it to prepare for the
          real exam.
        </div>
      </div>
    </div>
  );
}
