import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, GraduationCap, Loader2, CheckCircle2, Gift, ArrowRight } from "lucide-react";

export default function StudentPortalRegister() {
  const [, setLocation] = useLocation();

  // Parse referral code from URL
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get("ref") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate referral code
  const { data: refData } = trpc.studentPortal.validateReferralCode.useQuery(
    { code: refCode },
    { enabled: !!refCode }
  );

  const registerMutation = trpc.studentPortal.selfRegister.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => setLocation("/student/login"), 3000);
    },
    onError: (err) => {
      setError(err.message || "Registration failed. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password) { setError("Please create a password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    registerMutation.mutate({ name, email, phone, password, referralCode: refCode || undefined });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">You're all set! 🎉</h2>
          <p className="text-slate-400 mb-2">Your account has been created successfully.</p>
          <p className="text-slate-500 text-sm">Redirecting you to the login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-violet-500/25">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SpecTa Education</h1>
          <p className="text-slate-400 mt-1">Student Portal</p>
        </div>

        {/* Referral banner */}
        {refCode && refData?.valid && (
          <div className="mb-4 bg-gradient-to-r from-pink-900/50 to-rose-900/30 border border-pink-500/30 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">You were invited by a friend! 🎁</p>
              <p className="text-slate-400 text-xs">Referral code: <span className="text-pink-400 font-mono font-bold">{refCode}</span></p>
            </div>
          </div>
        )}

        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold text-white text-center">Create Your Account 🚀</h2>
            <p className="text-slate-400 text-sm text-center">Start your study abroad journey today</p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Sarah Lim"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 rounded-xl"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 rounded-xl"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">Phone Number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+60 12 345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 rounded-xl"
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 pr-10 rounded-xl"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 rounded-xl"
                  autoComplete="new-password"
                />
              </div>

              {refCode && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Referral Code</Label>
                  <Input
                    value={refCode}
                    readOnly
                    className="bg-slate-700/30 border-slate-600 text-violet-300 font-mono rounded-xl cursor-not-allowed"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-medium py-2.5 rounded-xl"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
                ) : (
                  <><span>Create Account</span><ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-700 text-center">
              <p className="text-slate-500 text-sm">
                Already have an account?{" "}
                <button onClick={() => setLocation("/student/login")} className="text-violet-400 hover:text-violet-300">
                  Sign in here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} SpecTa Education. All rights reserved.
        </p>
      </div>
    </div>
  );
}
