/** /sat/login — dedicated sign-in for SpecTa SAT Self-Prep students. */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { SAT_LOGO } from "./SatShell";

export default function SatLogin() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.sat.me.useQuery(undefined, { retry: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = trpc.sat.login.useMutation({
    onSuccess: async (d) => { await utils.sat.me.refetch(); navigate(d.mustChangePassword ? "/sat/password" : "/sat"); },
    onError: (e) => setError(e.message),
  });
  useEffect(() => { document.title = "Sign in · SpecTa SAT Self-Prep"; }, []);
  useEffect(() => { if (me.data && !me.isFetching) navigate(me.data.mustChangePassword ? "/sat/password" : "/sat"); }, [me.data, me.isFetching, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7">
        <img src={SAT_LOGO} alt="SpecTa Education" className="h-10 w-auto mb-4" />
        <h1 className="text-xl font-black text-slate-900">SAT Self-Prep</h1>
        <p className="text-sm text-slate-600 mt-1 mb-5">Sign in with the email and password SpecTa sent you.</p>
        <form onSubmit={e => { e.preventDefault(); setError(null); login.mutate({ email, password }); }} className="space-y-3">
          <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={login.isPending} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {login.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-5">No account yet? Ask your SpecTa teacher. Forgot your password? Message SpecTa and we'll reset it.</p>
      </div>
    </div>
  );
}

/** /sat/password — forced first-login password change (also usable any time). */
export function SatPassword() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.sat.me.useQuery(undefined, { retry: false });
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [error, setError] = useState<string | null>(null);
  const change = trpc.sat.changePassword.useMutation({ onSuccess: () => { utils.sat.me.invalidate(); navigate("/sat"); }, onError: (e) => setError(e.message) });
  useEffect(() => { if (me.isFetched && !me.data) navigate("/sat/login"); }, [me.isFetched, me.data, navigate]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7">
        <img src={SAT_LOGO} alt="SpecTa Education" className="h-10 w-auto mb-4" />
        <h1 className="text-xl font-black text-slate-900">Choose your password</h1>
        <p className="text-sm text-slate-600 mt-1 mb-5">At least 8 characters. You'll use this every time you sign in.</p>
        <form onSubmit={e => { e.preventDefault(); if (pw !== pw2) { setError("Passwords don't match."); return; } setError(null); change.mutate({ newPassword: pw }); }} className="space-y-3">
          <input type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm" />
          <input type="password" required minLength={8} autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repeat new password" className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm" />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={change.isPending} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-60">Save and continue</button>
        </form>
      </div>
    </div>
  );
}
