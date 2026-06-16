import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const SAMPLE_JSON = `{
  "code": "ACAD-001",
  "title": "Academic Test 1 — Sample",
  "testType": "academic",
  "notes": "Generated draft, reviewed YYYY-MM-DD",
  "listening": [
    {
      "sectionNumber": 1,
      "transcript": "Full transcript here…",
      "questions": [
        {
          "questionNumber": 1,
          "questionType": "form_completion",
          "prompt": "Name: ......",
          "correctAnswers": ["Jennifer Lawson", "jennifer lawson"]
        }
      ]
    },
    { "sectionNumber": 2, "transcript": "", "questions": [] },
    { "sectionNumber": 3, "transcript": "", "questions": [] },
    { "sectionNumber": 4, "transcript": "", "questions": [] }
  ],
  "reading": [
    {
      "passageNumber": 1,
      "title": "The hidden life of soil",
      "body": "Markdown body of passage 1…",
      "questions": []
    },
    { "passageNumber": 2, "title": "Passage 2", "body": "…", "questions": [] },
    { "passageNumber": 3, "title": "Passage 3", "body": "…", "questions": [] }
  ],
  "writing": [
    {
      "taskNumber": 1,
      "taskFormat": "chart",
      "prompt": "The chart below shows…",
      "minWords": 150,
      "timeLimitSec": 1200
    },
    {
      "taskNumber": 2,
      "taskFormat": "essay",
      "prompt": "Some people believe that…",
      "minWords": 250,
      "timeLimitSec": 2400
    }
  ],
  "speaking": [
    {
      "partNumber": 1,
      "prompts": [
        { "promptOrder": 1, "prompt": "Do you work or are you a student?" }
      ]
    },
    {
      "partNumber": 2,
      "prompts": [
        {
          "promptOrder": 1,
          "prompt": "Now I'd like you to talk about a piece of advice you received.",
          "cueCardText": "Describe a useful piece of advice you received from an older relative."
        }
      ]
    },
    {
      "partNumber": 3,
      "prompts": [
        { "promptOrder": 1, "prompt": "Where do young people in your country usually get advice?" }
      ]
    }
  ]
}`;

export default function AdminIeltsTests() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const listQuery = trpc.admin.ielts.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const importMut = trpc.admin.ielts.importTest.useMutation({
    onSuccess: () => {
      utils.admin.ielts.list.invalidate();
      setShowImport(false);
      setJsonText("");
    },
  });

  const setPublishedMut = trpc.admin.ielts.setPublished.useMutation({
    onSuccess: () => utils.admin.ielts.list.invalidate(),
  });

  const deleteMut = trpc.admin.ielts.delete.useMutation({
    onSuccess: () => utils.admin.ielts.list.invalidate(),
  });

  const uploadAudioMut = trpc.admin.ielts.uploadListeningAudio.useMutation();

  const createTestAttemptMut = trpc.admin.ielts.createTestAttempt.useMutation({
    onSuccess: data => {
      window.location.href = `/ielts/mock-test/take/${data.attemptToken}`;
    },
  });

  const [regenCode, setRegenCode] = useState<string | null>(null);
  const regenerateMut = trpc.admin.ielts.regenerateTest.useMutation({
    onSuccess: (_data, vars) => {
      setRegenCode(vars.code);
      utils.admin.ielts.list.invalidate();
    },
  });

  // Poll generation status while a regenerate is in flight.
  const genStatusQuery = trpc.admin.ielts.generationStatus.useQuery(
    { code: regenCode ?? "" },
    {
      enabled: !!regenCode,
      refetchInterval: q => {
        const s = q.state.data;
        return s && s.state === "running" ? 5000 : false;
      },
    }
  );

  const regenerateTextMut = trpc.admin.ielts.regenerateText.useMutation({
    onSuccess: (_data, vars) => setRegenCode(vars.code),
  });

  const createFreePassMut = trpc.admin.ielts.createFreePass.useMutation({
    onSuccess: data => {
      navigator.clipboard?.writeText(data.url).catch(() => {});
      alert(
        `Free-access link created (expires ${new Date(data.expiresAt).toLocaleDateString()}).\n\nCopied to clipboard:\n${data.url}\n\nAnyone who opens it (after signing in) gets a free ${data.testType} attempt.`
      );
    },
    onError: e => alert(`Failed: ${e.message}`),
  });

  const createTutorFreePassMut = trpc.admin.ielts.createTutorFreePass.useMutation({
    onSuccess: data => {
      navigator.clipboard?.writeText(data.url).catch(() => {});
      alert(
        `AI Tutor free link created (${data.days} days of access).\n\nCopied to clipboard:\n${data.url}\n\nShare it with anyone — they create a free student account and instantly get unlimited Writing & Speaking practice for ${data.days} days. Reusable until ${new Date(data.linkExpiresAt).toLocaleDateString()}.`
      );
    },
    onError: e => alert(`Failed: ${e.message}`),
  });

  const handleCreateTutorFreeLink = () => {
    const raw = window.prompt("AI Tutor free access — how many days? (7, 14, or 30)", "7");
    if (raw === null) return;
    const days = parseInt(raw, 10);
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      alert("Please enter a number of days between 1 and 90.");
      return;
    }
    createTutorFreePassMut.mutate({ days });
  };

  const fixQ2731Mut = trpc.admin.ielts.fixReadingResearcherMatching.useMutation({
    onSuccess: data => {
      utils.admin.ielts.list.invalidate();
      alert(
        `Q27-31 updated: ${data.updated} question(s) set to researcher-matching.\nPeople: ${data.people.join(", ")}` +
          (data.errors.length ? `\nNotes: ${data.errors.join(" | ")}` : "")
      );
    },
    onError: e => alert(`Failed: ${e.message}`),
  });

  const [showImport, setShowImport] = useState(false);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [answerKeyFor, setAnswerKeyFor] = useState<number | null>(null);
  const [uploadingFor, setUploadingFor] = useState<{
    testId: number;
    sectionNumber: number;
  } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  if (authLoading) {
    return <div className="p-8 text-gray-500">Loading…</div>;
  }
  if (!user || user.role !== "admin") {
    return (
      <div className="p-8">
        <p className="text-red-600">Admin only.</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Back to homepage
        </Link>
      </div>
    );
  }

  const handleImport = () => {
    importMut.mutate({ json: jsonText });
  };

  const handleAudioFile = async (
    testId: number,
    sectionNumber: number,
    file: File
  ) => {
    setUploadingFor({ testId, sectionNumber });
    setUploadStatus("Reading file…");
    try {
      const buf = await file.arrayBuffer();
      const base64 = bufferToBase64(buf);
      setUploadStatus("Uploading to storage…");
      await uploadAudioMut.mutateAsync({
        testId,
        sectionNumber,
        base64,
        contentType: file.type || "audio/mpeg",
      });
      setUploadStatus("Uploaded ✓");
      setTimeout(() => {
        setUploadingFor(null);
        setUploadStatus("");
      }, 1500);
    } catch (err: any) {
      setUploadStatus(`Failed: ${err?.message ?? "unknown error"}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">IELTS Mock Tests</h1>
            <p className="text-sm text-gray-500">
              Authored content for the IELTS Mock Test product.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => createFreePassMut.mutate({ testType: "academic", days: 30 })}
              disabled={createFreePassMut.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
              title="Create a shareable free-access link (Academic, valid 30 days)"
            >
              {createFreePassMut.isPending ? "Creating…" : "🎟 Mock Test free link"}
            </button>
            <button
              onClick={handleCreateTutorFreeLink}
              disabled={createTutorFreePassMut.isPending}
              className="bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
              title="Create a shareable AI Tutor free-access link (you choose the number of days)"
            >
              {createTutorFreePassMut.isPending ? "Creating…" : "✨ AI Tutor free link"}
            </button>
            <button
              onClick={() => setShowImport(s => !s)}
              className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              {showImport ? "Close" : "+ Import test from JSON"}
            </button>
          </div>
        </div>

        {showImport ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <h2 className="font-semibold mb-2">Import test from JSON</h2>
            <p className="text-xs text-gray-500 mb-3">
              Paste a full test JSON below. Schema is validated server-side.
              The 4 listening audio files are uploaded separately per section
              after import.
            </p>
            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              rows={18}
              className="w-full font-mono text-xs border border-gray-300 rounded-lg p-3"
            />
            {importMut.isError ? (
              <div className="text-xs text-red-600 mt-2">
                {importMut.error.message}
              </div>
            ) : null}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleImport}
                disabled={importMut.isPending}
                className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {importMut.isPending ? "Importing…" : "Import"}
              </button>
              <button
                onClick={() => setShowImport(false)}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {regenCode && genStatusQuery.data ? (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              genStatusQuery.data.state === "failed"
                ? "bg-red-50 border-red-200 text-red-800"
                : genStatusQuery.data.state === "done"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <div className="font-semibold">
              {regenCode} —{" "}
              {genStatusQuery.data.state === "running"
                ? "Regenerating…"
                : genStatusQuery.data.state === "done"
                  ? "Regeneration complete ✓"
                  : "Regeneration failed ✗"}
            </div>
            <div className="text-xs mt-0.5">{genStatusQuery.data.message}</div>
            {genStatusQuery.data.state !== "running" ? (
              <button
                onClick={() => setRegenCode(null)}
                className="text-xs underline mt-1"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listQuery.isLoading ? (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : (listQuery.data?.tests ?? []).length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={5}>
                    No tests yet. Import one to get started.
                  </td>
                </tr>
              ) : (
                listQuery.data!.tests.map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                    <td className="px-4 py-3">{t.title}</td>
                    <td className="px-4 py-3 capitalize">{t.testType}</td>
                    <td className="px-4 py-3">
                      {t.isPublished ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 text-xs">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 text-xs">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {/* Per-section audio upload */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map(n => (
                            <label
                              key={n}
                              className="text-xs cursor-pointer text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-1.5 py-0.5"
                              title={`Upload audio for Listening Section ${n}`}
                            >
                              S{n}
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={e => {
                                  const f = e.target.files?.[0];
                                  if (f) handleAudioFile(t.id, n, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          ))}
                          {uploadingFor?.testId === t.id ? (
                            <span className="text-xs text-gray-500 ml-1">
                              ({uploadingFor.sectionNumber}) {uploadStatus}
                            </span>
                          ) : null}
                        </div>

                        <button
                          onClick={() => setAnswerKeyFor(t.id)}
                          className="text-xs text-emerald-700 hover:text-emerald-900 underline font-semibold"
                          title="View the Listening + Reading answer key"
                        >
                          Answer key
                        </button>

                        <button
                          onClick={() =>
                            createTestAttemptMut.mutate({ testId: t.id })
                          }
                          disabled={createTestAttemptMut.isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
                          title="Create a free attempt and take the test as a student"
                        >
                          {createTestAttemptMut.isPending
                            ? "Starting…"
                            : "Test as student"}
                        </button>

                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Regenerate "${t.code}"? This DELETES the current test content and generates a fresh one with the latest blueprint. Takes ~3-5 min.`
                              )
                            ) {
                              regenerateMut.mutate({
                                code: t.code,
                                title: t.title,
                              });
                            }
                          }}
                          disabled={regenerateMut.isPending}
                          className="text-xs text-purple-700 hover:text-purple-900 underline font-semibold"
                          title="Delete and regenerate with the latest content blueprint"
                        >
                          {regenerateMut.isPending ? "Regenerating…" : "Regenerate (all + audio)"}
                        </button>

                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Regenerate TEXT only for "${t.code}" (Reading + Writing + Speaking)? Listening audio is kept as-is. Uses NO ElevenLabs credits.`
                              )
                            ) {
                              regenerateTextMut.mutate({ code: t.code });
                            }
                          }}
                          disabled={regenerateTextMut.isPending}
                          className="text-xs text-teal-700 hover:text-teal-900 underline font-semibold"
                          title="Regenerate Reading/Writing/Speaking only — keeps Listening audio, no ElevenLabs credits"
                        >
                          {regenerateTextMut.isPending
                            ? "Regenerating text…"
                            : "Regenerate text (no audio)"}
                        </button>

                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Fix ONLY Reading Q27-31 for "${t.code}" into researcher-matching (A-F)? Nothing else changes — passage text and all other questions stay exactly as they are.`
                              )
                            ) {
                              fixQ2731Mut.mutate({ code: t.code });
                            }
                          }}
                          disabled={fixQ2731Mut.isPending}
                          className="text-xs text-orange-700 hover:text-orange-900 underline font-semibold"
                          title="Surgically rewrite only Reading questions 27-31 as researcher-matching; everything else untouched"
                        >
                          {fixQ2731Mut.isPending ? "Fixing Q27-31…" : "Fix Q27-31"}
                        </button>

                        <button
                          onClick={() =>
                            setPublishedMut.mutate({
                              id: t.id,
                              isPublished: !t.isPublished,
                            })
                          }
                          className="text-xs text-gray-700 hover:text-gray-900 underline"
                        >
                          {t.isPublished ? "Unpublish" : "Publish"}
                        </button>

                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Delete test "${t.code}"? This removes ALL content. Cannot be undone.`
                              )
                            ) {
                              deleteMut.mutate({ id: t.id });
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Built P1c of the IELTS Mock Test platform. Next: marketing page +
          Xendit purchase flow, then student test-taking UI.
        </p>
      </div>

      {answerKeyFor !== null ? (
        <AnswerKeyModal
          testId={answerKeyFor}
          onClose={() => setAnswerKeyFor(null)}
        />
      ) : null}
    </div>
  );
}

function AnswerKeyModal({
  testId,
  onClose,
}: {
  testId: number;
  onClose: () => void;
}) {
  const keyQuery = trpc.admin.ielts.answerKey.useQuery({ id: testId });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Answer key</h2>
            {keyQuery.data ? (
              <p className="text-xs text-gray-500">
                {keyQuery.data.test.code} — {keyQuery.data.test.title}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5">
          {keyQuery.isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : keyQuery.isError ? (
            <p className="text-sm text-red-600">{keyQuery.error.message}</p>
          ) : keyQuery.data ? (
            <div className="space-y-8">
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 mb-3">
                  Listening
                </h3>
                {keyQuery.data.listening.map(s => (
                  <div key={s.sectionNumber} className="mb-5">
                    <div className="text-xs font-semibold text-gray-500 mb-2">
                      Section {s.sectionNumber}
                    </div>
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <tbody className="divide-y divide-gray-100">
                        {s.questions.map(q => (
                          <tr key={q.questionNumber}>
                            <td className="px-3 py-1.5 w-10 font-mono text-gray-500 align-top">
                              {q.questionNumber}
                            </td>
                            <td className="px-3 py-1.5 font-medium text-gray-900">
                              {q.correctAnswers.join("  /  ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>

              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 mb-3">
                  Reading
                </h3>
                {keyQuery.data.reading.map(p => (
                  <div key={p.passageNumber} className="mb-5">
                    <div className="text-xs font-semibold text-gray-500 mb-2">
                      Passage {p.passageNumber} — {p.title}
                    </div>
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <tbody className="divide-y divide-gray-100">
                        {p.questions.map(q => (
                          <tr key={q.questionNumber}>
                            <td className="px-3 py-1.5 w-10 font-mono text-gray-500 align-top">
                              {q.questionNumber}
                            </td>
                            <td className="px-3 py-1.5 font-medium text-gray-900">
                              {q.correctAnswers.join("  /  ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
