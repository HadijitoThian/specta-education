import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      // Honour ?next=… (e.g. returning to a free-access redeem link),
      // otherwise send the user straight to the right dashboard for their role.
      const next = new URLSearchParams(window.location.search).get("next");
      let dest = "/";
      if (next && next.startsWith("/")) {
        dest = next;
      } else {
        const role = data?.user?.role;
        const crmRole = data?.user?.crmRole;
        if (crmRole === "marketing") dest = "/sosmed";          // marketing team → Social Studio
        else if (role === "admin" || (crmRole && crmRole !== "none")) dest = "/crm"; // CRM team → CRM
        else dest = "/";                                         // ordinary users → homepage
      }
      // Hard navigate so tRPC `auth.me` re-fetches with the new cookie.
      window.location.href = dest;
    } catch (err) {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6">
          Welcome back to SpecTa Education.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-2.5 rounded-lg transition"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-sm text-center text-gray-600">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot your password?
          </Link>
          <div>
            New here?{" "}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
