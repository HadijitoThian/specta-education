import { useState } from "react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Forgot password
        </h1>

        {submitted ? (
          <>
            <p className="text-sm text-gray-600 mb-6">
              If an account exists for <strong>{email}</strong>, we've sent a
              password-reset link. Check your inbox (and spam folder). The link
              is valid for 1 hour.
            </p>
            <Link
              href="/login"
              className="block text-center text-sm text-blue-600 hover:underline"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email and we'll send a link to reset your password.
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-2.5 rounded-lg transition"
              >
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="mt-6 text-sm text-center text-gray-600">
              Remember your password?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
