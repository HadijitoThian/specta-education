import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  Download, 
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SimulatorReport() {
  useEffect(() => {
    document.title = "Simulator Report | SpecTa Education";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'View your personalized study abroad readiness report. AI-generated insights based on your simulator choices and decisions.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'View your personalized study abroad readiness report. AI-generated insights based on your simulator choices and decisions.';
      document.head.appendChild(meta);
    }
  }, []);

  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const sessionId = searchParams.get('session');

  const { data: report, isLoading, error } = trpc.simulator.getReport.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId }
  );

  useEffect(() => {
    if (!sessionId) {
      setLocation('/simulator');
    }
  }, [sessionId, setLocation]);

  useEffect(() => {
    if (error) {
      toast.error("Error", { description: error.message });
      setLocation('/simulator');
    }
  }, [error, setLocation]);

  if (isLoading || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Generating your readiness report...</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="w-6 h-6 text-green-600" />;
    if (score >= 60) return <Minus className="w-6 h-6 text-yellow-600" />;
    return <TrendingDown className="w-6 h-6 text-red-600" />;
  };

  const getReadinessLevel = (score: number) => {
    if (score >= 80) return "Highly Ready";
    if (score >= 70) return "Well Prepared";
    if (score >= 60) return "Moderately Ready";
    if (score >= 50) return "Needs Preparation";
    return "Significant Preparation Needed";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">Your Readiness Report</h1>
            <p className="text-xl text-blue-100">
              Based on your 3-day simulation experience
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Overall Score */}
          <Card className="shadow-2xl border-2">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl mb-2">Overall Readiness Score</CardTitle>
              <CardDescription>Your preparedness for studying abroad</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <div className="relative inline-block">
                <div className="w-48 h-48 rounded-full border-8 border-gray-200 flex items-center justify-center mx-auto mb-4 relative">
                  <div 
                    className={`absolute inset-0 rounded-full border-8 ${getScoreColor(report.readinessScore).replace('text-', 'border-')}`}
                    style={{
                      clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((report.readinessScore / 100) * 2 * Math.PI)}% ${50 - 50 * Math.cos((report.readinessScore / 100) * 2 * Math.PI)}%, 100% 100%, 0% 100%)`
                    }}
                  ></div>
                  <div className="text-center z-10">
                    <div className={`text-6xl font-bold ${getScoreColor(report.readinessScore)}`}>
                      {report.readinessScore}
                    </div>
                    <div className="text-gray-600 text-sm">out of 100</div>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-6 py-2">
                {getReadinessLevel(report.readinessScore)}
              </Badge>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Score Breakdown</CardTitle>
              <CardDescription>How you performed across different areas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`p-4 rounded-lg border-2 ${getScoreBgColor(report.socialScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getScoreIcon(report.socialScore)}
                    <h3 className="font-semibold text-lg">Social Adaptability</h3>
                  </div>
                  <span className={`text-2xl font-bold ${getScoreColor(report.socialScore)}`}>
                    {report.socialScore}/100
                  </span>
                </div>
                <Progress value={report.socialScore} className="h-3" />
              </div>

              <div className={`p-4 rounded-lg border-2 ${getScoreBgColor(report.financialScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getScoreIcon(report.financialScore)}
                    <h3 className="font-semibold text-lg">Financial Management</h3>
                  </div>
                  <span className={`text-2xl font-bold ${getScoreColor(report.financialScore)}`}>
                    {report.financialScore}/100
                  </span>
                </div>
                <Progress value={report.financialScore} className="h-3" />
              </div>

              <div className={`p-4 rounded-lg border-2 ${getScoreBgColor(report.academicScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getScoreIcon(report.academicScore)}
                    <h3 className="font-semibold text-lg">Academic Proactivity</h3>
                  </div>
                  <span className={`text-2xl font-bold ${getScoreColor(report.academicScore)}`}>
                    {report.academicScore}/100
                  </span>
                </div>
                <Progress value={report.academicScore} className="h-3" />
              </div>

              <div className={`p-4 rounded-lg border-2 ${getScoreBgColor(report.emotionalScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getScoreIcon(report.emotionalScore)}
                    <h3 className="font-semibold text-lg">Emotional Resilience</h3>
                  </div>
                  <span className={`text-2xl font-bold ${getScoreColor(report.emotionalScore)}`}>
                    {report.emotionalScore}/100
                  </span>
                </div>
                <Progress value={report.emotionalScore} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card className="shadow-xl border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-6 h-6" />
                Your Strengths
              </CardTitle>
              <CardDescription>What you're already doing well</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-start gap-3 bg-white p-4 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Areas to Develop */}
          <Card className="shadow-xl border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2 text-yellow-700">
                <AlertCircle className="w-6 h-6" />
                Areas to Develop
              </CardTitle>
              <CardDescription>Skills to work on before departure</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.weaknesses.map((weakness: string, index: number) => (
                  <li key={index} className="flex items-start gap-3 bg-white p-4 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="shadow-xl border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2 text-blue-700">
                <Lightbulb className="w-6 h-6" />
                Personalized Recommendations
              </CardTitle>
              <CardDescription>Next steps to improve your readiness</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-3 bg-white p-4 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <Card className="shadow-2xl border-2 border-purple-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to Take the Next Step?</h3>
              <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                You've completed the simulation and received your readiness assessment. 
                Now let's turn these insights into action with a personalized consultation from SpecTa Education.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setLocation('/book')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Free Consultation
                </Button>
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Start Over */}
          <div className="text-center">
            <Button
              onClick={() => {
                if (sessionId) {
                  localStorage.removeItem(`simulator_${sessionId}`);
                }
                setLocation('/simulator');
              }}
              variant="ghost"
            >
              Start New Simulation →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
