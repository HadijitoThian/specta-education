import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Heart, Users, GraduationCap, Loader2, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SimulatorExperience() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const sessionId = searchParams.get('session');

  const [currentScenario, setCurrentScenario] = useState<any>(null);
  const [stats, setStats] = useState({
    budget: 500,
    mood: 50,
    connections: 0,
    academic: 50,
  });
  const [currentDay, setCurrentDay] = useState(1);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const submitChoice = trpc.simulator.submitChoice.useMutation({
    onSuccess: (data) => {
      setAiResponse(data.aiResponse);
      setShowResponse(true);

      // Update stats
      setStats(prev => ({
        budget: Math.max(0, prev.budget + data.impacts.budget),
        mood: Math.max(0, Math.min(100, prev.mood + data.impacts.mood)),
        connections: Math.max(0, prev.connections + data.impacts.connections),
        academic: Math.max(0, Math.min(100, prev.academic + data.impacts.academic)),
      }));

      if (data.complete) {
        setIsComplete(true);
      } else {
        setCurrentScenario(data.nextScenario);
        setCurrentDay(prev => prev + 1);
      }
    },
    onError: (error) => {
      toast.error("Error", { description: error.message });
    },
  });

  useEffect(() => {
    if (!sessionId) {
      setLocation('/simulator');
      return;
    }

    // Get session data from URL state or localStorage
    const savedData = localStorage.getItem(`simulator_${sessionId}`);
    if (savedData) {
      const data = JSON.parse(savedData);
      setCurrentScenario(data.scenario);
      setStats(data.stats);
      setCurrentDay(data.currentDay);
    }
  }, [sessionId, setLocation]);

  // Save to localStorage when scenario changes
  useEffect(() => {
    if (sessionId && currentScenario) {
      localStorage.setItem(`simulator_${sessionId}`, JSON.stringify({
        scenario: currentScenario,
        stats,
        currentDay,
      }));
    }
  }, [sessionId, currentScenario, stats, currentDay]);

  const handleChoiceSelect = (choice: string, choiceText: string) => {
    if (!sessionId || !currentScenario) return;

    setSelectedChoice(choice);
    setShowResponse(false);

    submitChoice.mutate({
      sessionId,
      day: currentDay,
      scenarioType: currentScenario.type,
      scenarioText: currentScenario.scenarioText,
      choiceOptions: currentScenario.choices,
      selectedChoice: choice,
      choiceText,
    });
  };

  const handleContinue = () => {
    if (isComplete) {
      setLocation(`/simulator/report?session=${sessionId}`);
    } else {
      setSelectedChoice(null);
      setShowResponse(false);
    }
  };

  if (!sessionId || !currentScenario) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Progress Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Day {currentDay} of 3</h2>
              <p className="text-sm text-gray-600">{currentScenario.title}</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {Math.round(((currentDay - 1) / 3) * 100)}% Complete
            </Badge>
          </div>
          
          <Progress value={((currentDay - 1) / 3) * 100} className="h-2" />

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Budget</p>
                <p className="text-lg font-bold text-green-700">${stats.budget}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-pink-50 p-3 rounded-lg">
              <Heart className="w-5 h-5 text-pink-600" />
              <div>
                <p className="text-xs text-gray-600">Mood</p>
                <p className="text-lg font-bold text-pink-700">{stats.mood}/100</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Connections</p>
                <p className="text-lg font-bold text-blue-700">{stats.connections}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-purple-50 p-3 rounded-lg">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">Academic</p>
                <p className="text-lg font-bold text-purple-700">{stats.academic}/100</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-2xl border-2 mb-8">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardTitle className="text-2xl">Day {currentDay}: {currentScenario.title}</CardTitle>
              <CardDescription className="text-blue-100">
                Read the scenario carefully and make your choice
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="prose max-w-none mb-8">
                <p className="text-lg leading-relaxed text-gray-700">
                  {currentScenario.scenarioText}
                </p>
              </div>

              {!showResponse ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">What do you do?</h3>
                  {currentScenario.choices.map((choice: any) => (
                    <Button
                      key={choice.label}
                      variant={selectedChoice === choice.label ? "default" : "outline"}
                      className="w-full h-auto p-6 text-left justify-start"
                      onClick={() => handleChoiceSelect(choice.label, choice.text)}
                      disabled={submitChoice.isPending || selectedChoice !== null}
                    >
                      <div className="flex items-start gap-4 w-full">
                        <span className="text-2xl font-bold text-blue-600 min-w-[40px]">
                          {choice.label}
                        </span>
                        <span className="text-base flex-1">{choice.text}</span>
                      </div>
                    </Button>
                  ))}

                  {submitChoice.isPending && (
                    <div className="flex items-center justify-center gap-2 mt-6 text-blue-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing your choice...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What Happened:</h4>
                        <p className="text-gray-700 leading-relaxed">{aiResponse}</p>
                      </div>
                    </div>
                  </div>

                  {isComplete ? (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 p-6 rounded-lg">
                      <h3 className="text-2xl font-bold text-green-700 mb-2">
                        🎉 Simulation Complete!
                      </h3>
                      <p className="text-gray-700 mb-4">
                        You've completed the 3-day study abroad simulation. 
                        Your personalized readiness report is ready!
                      </p>
                      <Button
                        onClick={handleContinue}
                        className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                        size="lg"
                      >
                        View My Readiness Report →
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleContinue}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      size="lg"
                    >
                      Continue to Day {currentDay + 1} →
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-6">
              <p className="text-sm text-gray-700">
                <strong>💡 Tip:</strong> There are no "right" or "wrong" choices—each decision reflects 
                different approaches to studying abroad. Your choices help us understand your readiness 
                and provide personalized recommendations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
