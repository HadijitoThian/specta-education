import { useEffect } from "react";
import { useRoute } from "wouter";

/**
 * Redeems an admin-issued AI IELTS Tutor free-access link:
 *   /ielts/tutor/redeem/:token
 *
 * The Tutor runs on the student-portal account, so we don't claim here.
 * We stash the token and hand off to /ielts/tutor, which shows the free
 * sign-up / log-in (AuthGate) when needed and then auto-claims the pass.
 */
export default function IeltsTutorRedeem() {
  const [, params] = useRoute<{ token: string }>("/ielts/tutor/redeem/:token");
  const token = params?.token ?? "";

  useEffect(() => {
    try {
      if (token) sessionStorage.setItem("tutor_free_pass", token);
    } catch { /* ignore */ }
    window.location.replace("/ielts/tutor");
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Opening your free AI Tutor access…</p>
      </div>
    </div>
  );
}
