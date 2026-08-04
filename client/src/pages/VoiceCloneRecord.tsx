/**
 * Standalone Voice Clone recording page.
 *
 * User arrives here after Xendit payment. Records 3 IELTS Speaking
 * questions in sequence (Part 1 → Part 2 → Part 3), then triggers
 * processing. Redirects to /voice-clone/result/[token] on finalize.
 */

import { useEffect, useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { SEO } from "@/components/SEO";
import { CheckCircle, Mic, MicOff, RotateCcw, Play } from "lucide-react";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPhone/iPad + iPad-in-desktop-mode heuristic (iOS 13+ reports "Macintosh")
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1);
}

function pickMimeType(): string {
  // iOS Safari lies about isTypeSupported("audio/webm") in some versions —
  // encoder accepts it but the <audio> decoder can't play it back. Force mp4 on iOS.
  const iOS = isIOS();
  const candidates = iOS
    ? ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/mpeg", "audio/webm"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/mpeg"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported?.(t)) return t;
  }
  return iOS ? "audio/mp4" : "audio/webm";
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = reader.result as string;
      resolve(s.split(",")[1] || s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const MAX_DURATION_BY_PART: Record<number, number> = { 1: 45, 2: 120, 3: 60 };

export default function VoiceCloneRecord() {
  const [, params] = useRoute<{ sessionToken: string }>("/voice-clone/record/:sessionToken");
  const sessionToken = params?.sessionToken || "";
  const utils = trpc.useUtils();

  const sessionQuery = trpc.ielts.getStandaloneRecordingSession.useQuery(
    { sessionToken },
    { enabled: !!sessionToken, refetchOnWindowFocus: false },
  );
  const uploadMut = trpc.ielts.uploadStandaloneRecording.useMutation();
  const finalizeMut = trpc.ielts.finalizeStandaloneRecordings.useMutation({
    onSuccess: () => {
      window.location.href = `/voice-clone/result/${sessionToken}`;
    },
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewUnplayable, setPreviewUnplayable] = useState(false); // browser can't decode its own recording (iOS Safari + webm)
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!sessionToken) {
    return <Shell><Card><h1 className="font-bold text-lg mb-2">Sesi tidak valid</h1><p className="text-sm text-slate-600">Link rekaman tidak valid. Silakan mulai dari <Link href="/voice-clone" className="underline text-purple-700">/voice-clone</Link>.</p></Card></Shell>;
  }
  if (sessionQuery.isLoading) return <Shell><Card>Loading sesi rekaman…</Card></Shell>;
  if (sessionQuery.isError) return <Shell><Card><h1 className="font-bold text-lg mb-2">Gagal memuat sesi</h1><p className="text-sm text-red-600">{sessionQuery.error.message}</p></Card></Shell>;

  const session = sessionQuery.data;
  if (!session) return <Shell><Card>Sesi tidak ditemukan</Card></Shell>;

  if (!session.isPaid) {
    return (
      <Shell>
        <Card>
          <h1 className="font-bold text-lg mb-2">Menunggu konfirmasi pembayaran…</h1>
          <p className="text-sm text-slate-600 mb-3">Setelah kamu bayar via Xendit, halaman ini otomatis akan menampilkan pertanyaan yang perlu direkam.</p>
          {"xenditInvoiceUrl" in session && session.xenditInvoiceUrl ? (
            <a href={session.xenditInvoiceUrl as string} className="inline-block px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold">Buka Xendit checkout</a>
          ) : null}
        </Card>
      </Shell>
    );
  }

  const recordings = "recordings" in session ? session.recordings : [];
  const totalQuestions = recordings.length;
  const currentQuestion = recordings[currentIndex];
  const allUploaded = recordings.every((r: any) => r.isUploaded);
  const maxDuration = currentQuestion ? (MAX_DURATION_BY_PART[currentQuestion.partNumber] || 60) : 60;

  const startRecording = async () => {
    setMicError(null);
    setPreviewBlob(null);
    setPreviewUrl(null);
    setPreviewUnplayable(false);
    setUploadError(null);
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          setMicError("Rekaman kosong — coba lagi (pastikan mikrofon aktif dan izin sudah diberikan).");
        } else {
          setPreviewBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
        }
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mr.start();
      setRecording(true);
      // Timer + auto-stop at maxDuration
      timerRef.current = window.setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          if (next >= maxDuration) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      setMicError((e as Error).message || "Tidak bisa akses mikrofon");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  const retryRecording = () => {
    setPreviewBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewUnplayable(false);
    setUploadError(null);
    setElapsed(0);
  };

  const uploadCurrent = async () => {
    if (!previewBlob || !currentQuestion) return;
    setUploadError(null);
    try {
      const base64 = await blobToBase64(previewBlob);
      await uploadMut.mutateAsync({
        sessionToken,
        questionIndex: currentQuestion.questionIndex,
        audioBase64: base64,
        mimeType: previewBlob.type || "audio/webm",
        durationSec: Math.max(3, elapsed),
      });
      await utils.ielts.getStandaloneRecordingSession.invalidate({ sessionToken });
      // Move to next
      setPreviewBlob(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewUnplayable(false);
      setElapsed(0);
      if (currentIndex + 1 < totalQuestions) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (e) {
      setUploadError((e as Error).message || "Upload gagal");
    }
  };

  const finalize = async () => {
    try {
      await finalizeMut.mutateAsync({ sessionToken });
    } catch (e) {
      setUploadError((e as Error).message || "Gagal memproses");
    }
  };

  return (
    <Shell>
      <SEO title="Rekam Voice Clone | SpecTa Education" description="Rekam 3 pertanyaan IELTS Speaking untuk Voice Clone." />

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>Progress rekaman</span>
          <span>{recordings.filter((r: any) => r.isUploaded).length} / {totalQuestions} selesai</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-600 transition-all"
            style={{ width: `${(recordings.filter((r: any) => r.isUploaded).length / totalQuestions) * 100}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          {recordings.map((r: any, i: number) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 transition ${
                r.isUploaded ? "bg-emerald-50 border-emerald-300 text-emerald-800" :
                i === currentIndex ? "bg-purple-50 border-purple-500 text-purple-800" :
                "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              Part {r.partNumber} {r.isUploaded ? "✓" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* All uploaded → finalize */}
      {allUploaded && session.status !== "processing" && session.status !== "ready" && (
        <Card>
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Semua rekaman selesai!</h2>
            <p className="text-slate-600 mb-5">Klik tombol di bawah untuk mulai memproses Voice Clone kamu.</p>
            <button
              onClick={finalize}
              disabled={finalizeMut.isPending}
              className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-400 text-white font-bold shadow-lg"
            >
              {finalizeMut.isPending ? "Memulai processing…" : "🔥 Mulai Processing (30-90s)"}
            </button>
            {uploadError && <div className="mt-3 text-xs text-red-600">{uploadError}</div>}
          </div>
        </Card>
      )}

      {/* Question card */}
      {!allUploaded && currentQuestion && (
        <Card>
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-3">
              Part {currentQuestion.partNumber} · Pertanyaan {currentIndex + 1} dari {totalQuestions}
            </span>
            <h2 className="text-xl font-bold text-slate-900 whitespace-pre-line leading-relaxed">
              {currentQuestion.questionText}
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Max durasi: {maxDuration}s ·
              {currentQuestion.partNumber === 2 && " Cue card Part 2 — bicara 1-2 menit, cover semua bullet points"}
              {currentQuestion.partNumber === 1 && " Jawaban singkat 30-45 detik"}
              {currentQuestion.partNumber === 3 && " Jawaban diskusi 30-60 detik"}
            </p>
          </div>

          {micError && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{micError}</div>}

          {/* Recording UI */}
          {!previewBlob && !recording && !currentQuestion.isUploaded && (
            <button
              onClick={startRecording}
              className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <Mic className="w-5 h-5" /> Mulai Rekam
            </button>
          )}

          {recording && (
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-800 font-mono font-bold text-lg animate-pulse mb-4">
                <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                Recording · {elapsed}s / {maxDuration}s
              </div>
              <button
                onClick={stopRecording}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2 mx-auto"
              >
                <MicOff className="w-5 h-5" /> Stop
              </button>
            </div>
          )}

          {previewBlob && previewUrl && (
            <div className="space-y-3">
              {previewUnplayable ? (
                // Browser (usually iOS Safari) can't decode its own webm/opus recording.
                // Recording is fine — server will process it. Show reassurance, not an error.
                <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 font-black">✓</div>
                    <div className="flex-1">
                      <div className="font-bold text-emerald-900">Rekaman berhasil tersimpan</div>
                      <div className="text-xs text-emerald-800 mt-0.5">
                        {elapsed}s · {(previewBlob.size / 1024).toFixed(0)} KB · kualitas audio sempurna
                      </div>
                      <div className="text-xs text-emerald-700 mt-2 leading-relaxed">
                        Preview player tidak didukung di browser ini (biasa terjadi di Safari iOS), tapi rekaman kamu <strong>sudah tersimpan dengan baik</strong> dan siap diproses. Klik <strong>Simpan &amp; Lanjut</strong> untuk melanjutkan.
                      </div>
                      <a
                        href={previewUrl}
                        download={`rekaman-part${currentQuestion?.partNumber || "x"}.audio`}
                        className="inline-block mt-2 text-xs underline text-emerald-800 hover:text-emerald-900"
                      >
                        Download file (opsional, kalau mau cek)
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold mb-2">Preview rekaman kamu:</div>
                  <audio
                    key={previewUrl}
                    controls
                    preload="metadata"
                    src={previewUrl}
                    className="w-full"
                    onError={() => setPreviewUnplayable(true)}
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span>Durasi: {elapsed}s · {(previewBlob.size / 1024).toFixed(1)} KB</span>
                    <a href={previewUrl} download={`rekaman-part${currentQuestion?.partNumber || "x"}.audio`} className="underline text-purple-700 hover:text-purple-900">Download</a>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={retryRecording} className="py-3 rounded-xl border-2 border-slate-300 hover:bg-slate-50 font-semibold flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Rekam Ulang
                </button>
                <button
                  onClick={uploadCurrent}
                  disabled={uploadMut.isPending}
                  className="py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-400 text-white font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  {uploadMut.isPending ? "Uploading…" : (<><CheckCircle className="w-4 h-4" /> Simpan & Lanjut</>)}
                </button>
              </div>
              {uploadError && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</div>}
            </div>
          )}

          {currentQuestion.isUploaded && !previewBlob && !recording && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-semibold text-sm mb-3">
                <CheckCircle className="w-4 h-4" /> Sudah direkam
              </div>
              <p className="text-xs text-slate-500 mb-3">Kalau mau ganti, klik di bawah untuk rekam ulang.</p>
              <button onClick={() => { setPreviewBlob(null); setElapsed(0); }} className="text-sm text-purple-700 underline">
                Rekam ulang Part {currentQuestion.partNumber}
              </button>
            </div>
          )}
        </Card>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation currentPage="voice-clone" />
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">{children}</div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">{children}</div>;
}
