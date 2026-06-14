/**
 * Growth Intelligence (Phase C) — the "what to do next" tab.
 *  - AI Performance Analyst: a plain-language weekly read of conversion + spend.
 *  - GEO Monitor: are AI assistants naming SpecTa for buyer questions?
 *  - Content Gaps: missing blog topics, one click to produce a draft.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, Loader2, RefreshCw, Sparkles, Radar, FileText, CheckCircle2, XCircle } from "lucide-react";

export default function GrowthInsights() {
  const utils = trpc.useUtils();
  const digests = trpc.marketing.listDigests.useQuery();
  const geo = trpc.marketing.geoSnapshots.useQuery();
  const [gaps, setGaps] = useState<Array<{ topic: string; targetKeyword: string; rationale: string; intent: string }>>([]);

  const genDigest = trpc.marketing.generateDigest.useMutation({
    onSuccess: () => { toast.success("Analysis ready"); utils.marketing.listDigests.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const runGeo = trpc.marketing.runGeoMonitor.useMutation({
    onSuccess: (r) => { toast.success(`GEO check done — named in ${r.mentioned}/${r.ran}`); utils.marketing.geoSnapshots.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const findGaps = trpc.marketing.contentGaps.useMutation({
    onSuccess: (r) => { setGaps(r); toast.success(`${r.length} topic gaps found`); },
    onError: (e) => toast.error(e.message),
  });
  const produce = trpc.blog.produceArticle.useMutation({
    onSuccess: (p: any) => toast.success(`Draft created: "${p.title}". Review in Blog.`),
    onError: (e) => toast.error(e.message),
  });

  const latest = digests.data?.[0];
  // Most recent GEO run = the newest 5 snapshots (one per query).
  const recentGeo = (geo.data || []).slice(0, 5);
  const mentionRate = recentGeo.length ? recentGeo.filter(g => g.mentioned).length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Brain className="w-6 h-6 text-fuchsia-600" /> Growth Intelligence</h2>
        <p className="text-sm text-gray-500">AI turns your data into decisions: performance read, AI-search visibility, and content gaps.</p>
      </div>

      {/* Performance analyst */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-fuchsia-600" /> AI Performance Analyst</span>
            <Button size="sm" onClick={() => genDigest.mutate()} disabled={genDigest.isPending} className="bg-fuchsia-600 hover:bg-fuchsia-700">
              {genDigest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1" /> Generate analysis</>}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!latest ? (
            <p className="text-sm text-gray-500">No analysis yet. Click <em>Generate analysis</em> for a read of this month vs last.</p>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-gray-400">{latest.periodLabel} · {new Date(latest.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
              <p className="text-sm text-gray-800">{latest.summary}</p>
              {Array.isArray(latest.recommendations) && (latest.recommendations as string[]).length > 0 && (
                <ul className="list-disc ml-5 text-sm space-y-1">
                  {(latest.recommendations as string[]).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GEO monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><Radar className="w-4 h-4 text-fuchsia-600" /> GEO Visibility Monitor</span>
            <Button size="sm" variant="outline" onClick={() => runGeo.mutate()} disabled={runGeo.isPending}>
              {runGeo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1" /> Run check</>}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentGeo.length ? (
            <p className="text-sm text-gray-500">No checks yet. This asks our AI model common buyer questions and records whether SpecTa is named.</p>
          ) : (
            <div className="space-y-2">
              <div className="text-sm">SpecTa named in <strong>{mentionRate}/{recentGeo.length}</strong> answers (latest run).</div>
              {recentGeo.map(g => (
                <div key={g.id} className="text-sm border rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    {g.mentioned ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    <span className="font-medium">{g.query}</span>
                    {g.mentioned && g.rankPosition != null && <Badge className="bg-green-100 text-green-700 text-[10px]">#{g.rankPosition}</Badge>}
                  </div>
                  {Array.isArray(g.competitors) && (g.competitors as string[]).length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">Also named: {(g.competitors as string[]).slice(0, 6).join(", ")}</div>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-400">Directional signal from our AI model (not a live ChatGPT/Perplexity query). Track the trend over time.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-fuchsia-600" /> Content Gaps → Blog</span>
            <Button size="sm" variant="outline" onClick={() => findGaps.mutate()} disabled={findGaps.isPending}>
              {findGaps.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1" /> Find gaps</>}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!gaps.length ? (
            <p className="text-sm text-gray-500">Find high-value blog topics you're missing, then produce a draft in one click.</p>
          ) : (
            <div className="space-y-2">
              {gaps.map((g, i) => (
                <div key={i} className="flex items-start justify-between gap-3 border rounded-lg px-3 py-2">
                  <div>
                    <div className="font-medium text-sm">{g.topic}</div>
                    <div className="text-xs text-gray-500">{g.rationale}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {g.targetKeyword && <Badge variant="outline" className="text-[10px] mr-1">{g.targetKeyword}</Badge>}
                      {g.intent && <Badge variant="secondary" className="text-[10px]">{g.intent}</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled={produce.isPending}
                    onClick={() => produce.mutate({ topic: g.topic, targetKeyword: g.targetKeyword || undefined })}>
                    {produce.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Produce draft"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
