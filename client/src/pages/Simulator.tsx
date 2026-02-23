import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Simulator() {
  const [, setLocation] = useLocation();

  // Controlled form state - survives React re-renders
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [tier, setTier] = useState("");
  const [major, setMajor] = useState("");
  const [budget, setBudget] = useState("");
  const [personality, setPersonality] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startSimulation = trpc.simulator.start.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(`simulator_${data.sessionId}`, JSON.stringify({
        scenario: data.scenario,
        stats: data.stats,
        currentDay: data.currentDay,
      }));
      setLocation(`/simulator/experience?session=${data.sessionId}`);
    },
    onError: (error) => {
      setIsSubmitting(false);
      setErrorMsg("Server error: " + error.message);
    },
  });

  const isPending = startSimulation.isPending || isSubmitting;

  const handleSubmit = () => {
    // Validate required fields
    const missing: string[] = [];
    if (!name.trim()) missing.push("Full Name");
    if (!email.trim()) missing.push("Email");
    if (!country) missing.push("Target Country");
    if (!tier) missing.push("University Tier");
    if (!major) missing.push("Intended Major");
    if (!budget) missing.push("Budget Level");

    if (missing.length > 0) {
      setErrorMsg("Please fill in: " + missing.join(", "));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    startSimulation.mutate({
      studentName: name.trim(),
      studentEmail: email.trim(),
      studentPhone: phone.trim(),
      country,
      universityTier: tier,
      intendedMajor: major,
      budgetLevel: budget,
      personalityType: personality,
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #eff6ff, #ffffff, #faf5ff)" }}>
      {/* Hero Section */}
      <div style={{ background: "linear-gradient(to right, #2563eb, #7c3aed)", color: "white", padding: "80px 20px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", padding: "4px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>
            AI-Powered Experience
          </div>
          <h1 style={{ fontSize: "48px", fontWeight: 700, marginBottom: "24px", lineHeight: 1.1 }}>
            Experience Your Future in 7 Days
          </h1>
          <p style={{ fontSize: "18px", color: "#bfdbfe", marginBottom: "32px", maxWidth: "600px", margin: "0 auto 32px" }}>
            Live through a realistic simulation of studying abroad before you apply. 
            Make choices, face challenges, and discover if you're truly ready.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "32px", fontSize: "14px" }}>
            <span>3-Day Prototype</span>
            <span>AI-Generated Scenarios</span>
            <span>Personalized Report</span>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", border: "2px solid #e5e7eb", padding: "40px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Start Your Simulation</h2>
          <p style={{ color: "#6b7280", marginBottom: "24px" }}>
            Tell us about yourself and we'll create a personalized 3-day experience
          </p>

          {/* Error Message */}
          {errorMsg && (
            <div style={{ background: "#fef2f2", border: "2px solid #f87171", color: "#dc2626", padding: "16px", borderRadius: "8px", marginBottom: "24px", fontSize: "14px", fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          {/* Personal Info */}
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#1f2937" }}>
            Personal Information
          </h3>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>Full Name *</label>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", height: "44px", borderRadius: "8px", border: "1px solid #d1d5db", padding: "0 12px", fontSize: "14px", boxSizing: "border-box", outline: "none" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>Email *</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", height: "44px", borderRadius: "8px", border: "1px solid #d1d5db", padding: "0 12px", fontSize: "14px", boxSizing: "border-box", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>Phone (Optional)</label>
              <input
                type="text"
                placeholder="+62 xxx xxxx xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: "100%", height: "44px", borderRadius: "8px", border: "1px solid #d1d5db", padding: "0 12px", fontSize: "14px", boxSizing: "border-box", outline: "none" }}
              />
            </div>
          </div>

          {/* Study Preferences */}
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#1f2937" }}>
            Study Preferences
          </h3>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>Target Country *</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{ width: "100%", height: "44px", borderRadius: "8px", border: "1px solid #d1d5db", padding: "0 12px", fontSize: "14px", boxSizing: "border-box", background: "white", outline: "none" }}
            >
              <option value="">Select country</option>
              <option value="australia">Australia</option>
              <option value="uk">United Kingdom</option>
              <option value="usa">United States</option>
              <option value="canada">Canada</option>
              <option value="malaysia">Malaysia</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>University Tier *</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                style={{ width: "100%", height: "44px", borderRadius: "8px", border: "1px solid #d1d5db", padding: "0 12px", fontSize: "14px", boxSizing: "border-box", background: "white", outline: "none" }}
              >
                <option value="">Select tier</option>
                <option value="top10">Top 10 (Prestigious)</option>
                <option value="mid_tier">Mid-Tier (Balanced)</option>
                <option value="budget">Budget-Friendly</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>Intended Major *</label>
              <select
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                style={{ width: "100%", height: "44px", borderRadius: "8px", border: "1px solid #d1d5db", padding: "0 12px", fontSize: "14px", boxSizing: "border-box", background: "white", outline: "none" }}
              >
                <option value="">Select major</option>
                <option value="business">Business & Management</option>
                <option value="engineering">Engineering</option>
                <option value="computer_science">Computer Science</option>
                <option value="medicine">Medicine & Health</option>
                <option value="arts">Arts & Humanities</option>
                <option value="sciences">Natural Sciences</option>
              </select>
            </div>
          </div>

          {/* Budget & Personality */}
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#1f2937" }}>
            Budget & Personality
          </h3>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>Budget Level *</label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={{ width: "100%", height: "44px", borderRadius: "8px", border: "1px solid #d1d5db", padding: "0 12px", fontSize: "14px", boxSizing: "border-box", background: "white", outline: "none" }}
            >
              <option value="">Select budget level</option>
              <option value="tight">Tight (Need to watch every dollar)</option>
              <option value="moderate">Moderate (Some flexibility)</option>
              <option value="comfortable">Comfortable (Financial security)</option>
            </select>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>Personality Type (Optional)</label>
            <select
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              style={{ width: "100%", height: "44px", borderRadius: "8px", border: "1px solid #d1d5db", padding: "0 12px", fontSize: "14px", boxSizing: "border-box", background: "white", outline: "none" }}
            >
              <option value="">Select personality</option>
              <option value="extrovert">Extrovert (Social & Outgoing)</option>
              <option value="introvert">Introvert (Reserved & Thoughtful)</option>
              <option value="balanced">Balanced (Mix of Both)</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            disabled={isPending}
            onClick={handleSubmit}
            style={{
              width: "100%",
              height: "56px",
              fontSize: "18px",
              fontWeight: 600,
              color: "white",
              background: isPending ? "#9ca3af" : "linear-gradient(to right, #2563eb, #7c3aed)",
              border: "none",
              borderRadius: "12px",
              cursor: isPending ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            {isPending ? (
              <>
                <span style={{ display: "inline-block", width: "20px", height: "20px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                Creating Your Experience...
              </>
            ) : (
              "Start My 3-Day Journey"
            )}
          </button>

          {/* Spinner animation */}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* Info Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginTop: "48px" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎓</div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Realistic Scenarios</h3>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Experience authentic challenges international students face daily</p>
          </div>
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>✨</div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>AI-Powered</h3>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Every choice generates unique, personalized responses</p>
          </div>
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📊</div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Readiness Report</h3>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Get detailed insights on your study abroad preparedness</p>
          </div>
        </div>
      </div>
    </div>
  );
}
