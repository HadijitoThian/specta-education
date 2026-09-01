/**
 * /admin/iq-bank — question-bank management for SpecTa IQ Discovery.
 *
 * Admin-only. Lets Hadi:
 *   - See totals per domain × approval status
 *   - Click "Generate 10 samples" to trigger a fresh AI + programmatic batch
 *   - Preview every item with the SAME renderer real students will see
 *   - Approve items that pass review (flip approved flag)
 *   - Delete items that are just wrong
 *
 * The whole point is to keep human-in-the-loop for quality without a
 * dedicated QA tool: same renderer + same click-to-answer flow means we
 * catch broken puzzles by trying to solve them.
 */

import { useState } from "react";
import Navigation from "@/components/Navigation";
import IqQuestionRenderer from "@/components/iq/IqQuestionRenderers";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, Trash2, Sparkles, RefreshCw } from "lucide-react";

type DomainFilter = "all" | "fluid" | "quantitative" | "verbal" | "spatial" | "memory";

export default function AdminIqBank() {
  const [filter, setFilter] = useState<DomainFilter>("all");
  const [showApprovedOnly, setShowApprovedOnly] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [batchSize, setBatchSize] = useState<2 | 4 | 8>(2);

  const utils = trpc.useUtils();
  const counts = trpc.admin.iq.counts.useQuery();
  const questions = trpc.admin.iq.list.useQuery({
    domain: filter === "all" ? undefined : filter,
    approvedOnly: showApprovedOnly,
    limit: 200,
  });

  const generate = trpc.admin.iq.generateStarterBatch.useMutation({
    onSuccess: (d) => {
      const msg = d.savedCount > 0
        ? `✅ Generated ${d.savedCount} question(s).${d.generationErrors.length ? ` (${d.generationErrors.length} AI errors)` : ""}`
        : `❌ 0 saved — errors: ${d.generationErrors.join("; ")}`;
      alert(msg);
      utils.admin.iq.counts.invalidate();
      utils.admin.iq.list.invalidate();
    },
    onError: (e) => alert(`Generate failed: ${e.message}`),
  });

  const setApproved = trpc.admin.iq.setApproved.useMutation({
    onSuccess: () => {
      utils.admin.iq.counts.invalidate();
      utils.admin.iq.list.invalidate();
    },
  });

  const del = trpc.admin.iq.deleteQuestion.useMutation({
    onSuccess: () => {
      utils.admin.iq.counts.invalidate();
      utils.admin.iq.list.invalidate();
    },
  });

  const domains: DomainFilter[] = ["all", "fluid", "quantitative", "verbal", "spatial", "memory"];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <div className="max-w-4xl mx-auto p-4 pt-24 pb-16">
        {/* Header */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-indigo-600 font-semibold">Admin</div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">SpecTa IQ Discovery — Question Bank</h1>
          <p className="text-sm text-slate-600 mt-1">
            Generate, review, approve. Only approved items are served to paid students. Try to solve each puzzle yourself — if the "correct" answer feels wrong, delete the item.
          </p>
        </div>

        {/* Counts + generate button */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Bank status</div>
              {counts.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : counts.data ? (
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-slate-900">
                    {counts.data.totalApproved} <span className="text-slate-400 text-lg font-normal">/ {counts.data.totalGenerated} approved</span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-3 mt-2">
                    {(["fluid", "quantitative", "verbal", "spatial", "memory"] as const).map(d => {
                      const c = counts.data.perDomain[d];
                      return (
                        <span key={d} className="inline-flex items-center gap-1">
                          <span className="capitalize font-medium text-slate-700">{d}</span>
                          <span>{c ? `${c.approved}/${c.generated}` : "0/0"}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={batchSize}
                onChange={e => setBatchSize(Number(e.target.value) as 2 | 4 | 8)}
                disabled={generate.isPending}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white disabled:opacity-50"
              >
                <option value={2}>10 items · ~30s</option>
                <option value={4}>20 items · ~1 min</option>
                <option value={8}>40 items · ~2-3 min</option>
              </select>
              <button
                onClick={() => generate.mutate({ perDomain: batchSize })}
                disabled={generate.isPending}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2"
              >
                {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generate.isPending ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-wrap items-center gap-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter</div>
          <div className="flex flex-wrap gap-1">
            {domains.map(d => (
              <button
                key={d}
                onClick={() => setFilter(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize
                  ${filter === d ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {d}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showApprovedOnly}
              onChange={e => setShowApprovedOnly(e.target.checked)}
              className="rounded"
            />
            Approved only
          </label>
          <button
            onClick={() => { utils.admin.iq.list.invalidate(); utils.admin.iq.counts.invalidate(); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Question list */}
        <div className="space-y-8">
          {questions.isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : questions.data?.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-sm">
                No questions yet. Click <strong>Generate 10 samples</strong> above to start.
              </p>
            </div>
          ) : (
            questions.data?.map(q => {
              const selected = selectedAnswers[q.id];
              const gotItRight = selected !== undefined && selected === q.correctIndex;
              return (
                <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-4 pb-3 border-b border-slate-100">
                    <span className="font-bold text-slate-900">#{q.id}</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold capitalize">{q.domain}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{q.type}</span>
                    <span className="text-slate-500">difficulty {q.difficulty}</span>
                    <span className="text-slate-400">· {q.timeLimitSec}s</span>
                    <span className="text-slate-400">· {q.generatedBy}</span>
                    {q.approved && (
                      <span className="ml-auto px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> approved
                      </span>
                    )}
                  </div>

                  {/* Live-render the actual question */}
                  <IqQuestionRenderer
                    type={q.type}
                    prompt={q.prompt}
                    options={q.options}
                    selectedIndex={selected}
                    onSelect={(ix) => setSelectedAnswers(s => ({ ...s, [q.id]: ix }))}
                  />

                  {/* Answer + explanation */}
                  <div className="mt-3 flex items-start gap-3 text-xs pt-3 border-t border-slate-100">
                    {selected !== undefined && (
                      <div className={`px-2 py-1 rounded font-semibold shrink-0
                        ${gotItRight ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {gotItRight ? "✓ Benar" : "✗ Salah"}
                      </div>
                    )}
                    <div className="text-slate-600 flex-1">
                      <strong>Jawaban:</strong> {String.fromCharCode(65 + q.correctIndex)}
                      {q.explanation && <> · {q.explanation}</>}
                    </div>
                  </div>

                  {/* Approve / delete controls */}
                  <div className="mt-4 flex gap-2 justify-end">
                    <button
                      onClick={() => del.mutate({ id: q.id })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                    {q.approved ? (
                      <button
                        onClick={() => setApproved.mutate({ id: q.id, approved: false })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                      >
                        Un-approve
                      </button>
                    ) : (
                      <button
                        onClick={() => setApproved.mutate({ id: q.id, approved: true })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
