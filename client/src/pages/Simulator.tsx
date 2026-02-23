import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Globe, GraduationCap, DollarSign, User, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Simulator() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    studentName: "",
    studentEmail: "",
    studentPhone: "",
    country: "",
    universityTier: "",
    intendedMajor: "",
    budgetLevel: "",
    personalityType: "",
  });

  const startSimulation = trpc.simulator.start.useMutation({
    onSuccess: (data) => {
      // Save initial data to localStorage for experience page
      localStorage.setItem(`simulator_${data.sessionId}`, JSON.stringify({
        scenario: data.scenario,
        stats: data.stats,
        currentDay: data.currentDay,
      }));
      // Navigate to simulation experience with session ID
      setLocation(`/simulator/experience?session=${data.sessionId}`);
    },
    onError: (error) => {
      toast.error("Error", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', formData);
    
    if (!formData.studentName || !formData.studentEmail || !formData.country || 
        !formData.universityTier || !formData.intendedMajor || !formData.budgetLevel) {
      console.log('Validation failed. Missing fields:', {
        studentName: !formData.studentName,
        studentEmail: !formData.studentEmail,
        country: !formData.country,
        universityTier: !formData.universityTier,
        intendedMajor: !formData.intendedMajor,
        budgetLevel: !formData.budgetLevel
      });
      alert('Please fill in all required fields');
      toast.error("Missing Information", { description: "Please fill in all required fields" });
      return;
    }

    console.log('Starting simulation...');
    startSimulation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8" />
              <span className="text-sm font-semibold uppercase tracking-wider bg-white/20 px-4 py-1 rounded-full">
                AI-Powered Experience
              </span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Experience Your Future in 7 Days
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Live through a realistic simulation of studying abroad before you apply. 
              Make choices, face challenges, and discover if you're truly ready.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>3-Day Prototype</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>AI-Generated Scenarios</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Personalized Report</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-2xl border-2">
            <CardHeader>
              <CardTitle className="text-3xl">Start Your Simulation</CardTitle>
              <CardDescription className="text-base">
                Tell us about yourself and we'll create a personalized 3-day experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Personal Information
                  </h3>
                  
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Your full name"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.studentEmail}
                        onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone (Optional)</Label>
                      <Input
                        id="phone"
                        placeholder="+62 xxx xxxx xxxx"
                        value={formData.studentPhone}
                        onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Study Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-600" />
                    Study Preferences
                  </h3>

                  <div>
                    <Label htmlFor="country">Target Country *</Label>
                    <select
                      id="country"
                      value={formData.country}
                      onChange={(e) => {
                        console.log('Country changed to:', e.target.value);
                        setFormData({ ...formData, country: e.target.value });
                      }}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select country</option>
                      <option value="australia">Australia</option>
                      <option value="uk">United Kingdom</option>
                      <option value="usa">United States</option>
                      <option value="canada">Canada</option>
                      <option value="malaysia">Malaysia</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tier">University Tier *</Label>
                      <select
                        id="tier"
                        value={formData.universityTier}
                        onChange={(e) => setFormData({ ...formData, universityTier: e.target.value })}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select tier</option>
                        <option value="top10">Top 10 (Prestigious)</option>
                        <option value="mid_tier">Mid-Tier (Balanced)</option>
                        <option value="budget">Budget-Friendly</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="major">Intended Major *</Label>
                      <select
                        id="major"
                        value={formData.intendedMajor}
                        onChange={(e) => setFormData({ ...formData, intendedMajor: e.target.value })}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                </div>

                {/* Financial & Personality */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Budget & Personality
                  </h3>

                  <div>
                    <Label htmlFor="budget">Budget Level *</Label>
                    <select
                      id="budget"
                      value={formData.budgetLevel}
                      onChange={(e) => setFormData({ ...formData, budgetLevel: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select budget level</option>
                      <option value="tight">Tight (Need to watch every dollar)</option>
                      <option value="moderate">Moderate (Some flexibility)</option>
                      <option value="comfortable">Comfortable (Financial security)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="personality">Personality Type (Optional)</Label>
                    <select
                      id="personality"
                      value={formData.personalityType}
                      onChange={(e) => setFormData({ ...formData, personalityType: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select personality</option>
                      <option value="extrovert">Extrovert (Social & Outgoing)</option>
                      <option value="introvert">Introvert (Reserved & Thoughtful)</option>
                      <option value="balanced">Balanced (Mix of Both)</option>
                    </select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={startSimulation.isPending}
                >
                  {startSimulation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating Your Experience...
                    </>
                  ) : (
                    <>
                      <Plane className="w-5 h-5 mr-2" />
                      Start My 3-Day Journey
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card>
              <CardHeader>
                <GraduationCap className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle className="text-lg">Realistic Scenarios</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Experience authentic challenges international students face daily
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Sparkles className="w-10 h-10 text-purple-600 mb-2" />
                <CardTitle className="text-lg">AI-Powered</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Every choice generates unique, personalized responses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <User className="w-10 h-10 text-green-600 mb-2" />
                <CardTitle className="text-lg">Readiness Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get detailed insights on your study abroad preparedness
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
