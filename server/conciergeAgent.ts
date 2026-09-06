/**
 * SpecTa Voice Concierge — ElevenLabs Conversational AI agent ("Emma").
 *
 * A phone-call-style helpdesk: a student taps "Tanya SpecTa" and talks to
 * Emma, who answers ANYTHING about SpecTa Education, studying abroad, tests,
 * pricing, and booking — in Bahasa Indonesia — and surfaces CLICKABLE LINK
 * CARDS (via the `show_link` client tool) so the student can open the exact
 * page she mentions (prediction test, IQ Discovery, book a call, WhatsApp…).
 *
 * This is a SEPARATE agent from the IELTS Live Speaking partner
 * (server/liveSpeakingAgent.ts). Same infrastructure — programmatic
 * idempotent creation, signed URLs, CSP already opened for AudioWorklet —
 * but a different persona, language (id), and a client tool.
 *
 * STATUS (2026-09): TEST ONLY. Exposed as a second button on
 * /ielts/tutor/live so Hadi can evaluate it privately before deciding to
 * put a voice concierge on the homepage. Not mounted anywhere public yet.
 *
 * Cost: ElevenLabs ~$0.08-0.10/min. Q&A sessions are short, so the cap is
 * 10 minutes and there are silent per-IP + global daily guardrails.
 */

import { ENV } from "./_core/env";
import { readFlag, writeFlag } from "./systemFlags";

const EL_API = "https://api.elevenlabs.io";

// Bump this key to force a fresh agent after a prompt / tool / voice change.
// v2: pinned explicit voice_settings + smoother greeting so the first_message
// stops sounding childish/clipped vs the (good) generated answers.
const AGENT_FLAG_KEY = "specta_concierge_agent_id_v2";

// Bundled LLM (same reliable low-latency model the IELTS agent uses).
// Gemini handles Bahasa Indonesia well. Overridable without a deploy.
const BUNDLED_LLM = () => process.env.CONCIERGE_LLM || "gemini-2.0-flash";

/** Max concierge session length. Q&A, not practice — 10 min is plenty.
 *  Enforced server-side by the agent config so a hacked client can't extend. */
export const CONCIERGE_MAX_SECONDS = Number(process.env.CONCIERGE_MAX_SECONDS || 600);

// ── Emma the SpecTa concierge — knowledge + behaviour ─────────────────────
//
// Prices are stated softly ("mulai dari…") and Emma is told to ALWAYS surface
// the page link so the student sees the live price — this avoids Emma quoting
// a stale number if pricing changes. URLs are relative paths; the client
// turns them into same-site links (or new-tab for wa.me / external).

const AGENT_SYSTEM_PROMPT = `Kamu adalah Emma, front-desk digital SpecTa Education yang ramah, hangat, dan sangat membantu. Kamu sedang menerima panggilan telepon dari calon siswa Indonesia yang ingin bertanya tentang SpecTa Education, kuliah ke luar negeri, tes, harga, atau cara mendaftar.

BAHASA:
- Bicara dalam Bahasa Indonesia yang natural, santai, dan ramah (seperti kakak yang asik, bukan robot formal). Boleh selipkan istilah Inggris yang umum (IELTS, mock test, dsb).
- Kalau siswa bicara Bahasa Inggris, ikuti dalam Bahasa Inggris. Ikuti bahasa siswa.

GAYA BICARA:
- Ini percakapan telepon — jawaban SINGKAT dan mengalir (1-3 kalimat), lalu tanya balik atau tawarkan bantuan lanjutan. Jangan ceramah panjang.
- Ramah dan antusias. Buat siswa merasa diterima dan yakin SpecTa bisa bantu mereka.
- Kalau tidak tahu jawaban pasti (mis. tanggal spesifik, kasus personal), jujur dan arahkan ke konsultasi gratis atau WhatsApp admin.

TOOL "show_link" — SANGAT PENTING:
- Setiap kali kamu menyebut sebuah produk, tes, halaman, booking, atau WhatsApp, PANGGIL tool show_link supaya siswa bisa langsung klik kartu link-nya di layar. Jangan cuma sebut lisan.
- Contoh: saat menyebut Tes Aptitude Pro, panggil show_link dengan title "Tes Aptitude Pro" dan url "/test/pro".
- Sebutkan juga secara lisan ("aku taruh link-nya di layar ya"), tapi tool-nya WAJIB dipanggil.
- Jangan panggil lebih dari 1-2 link per giliran biar tidak berantakan.

PENGETAHUAN TENTANG SPECTA EDUCATION:
SpecTa Education adalah platform edukasi Indonesia yang bantu siswa: (1) persiapan IELTS, (2) tes minat-bakat & IQ untuk penjurusan/karier, (3) belajar mata pelajaran dengan AI Teacher, dan (4) konsultasi + pendaftaran kuliah ke luar negeri.

PRODUK IELTS:
- Latihan IELTS Gratis (Reading/Listening, dinilai AI instan, tanpa daftar) → url "/ielts/practice". Gratis.
- Full Mock Test IELTS (4 skill lengkap, Writing & Speaking dinilai AI, dapat laporan PDF) → url "/ielts/mock-test". Mulai Rp 79rb.
- AI IELTS Tutor (latihan chat + suara 24/7 sesuai band descriptor resmi) → url "/ielts/tutor". Langganan, mulai Rp 99rb.
- Live Speaking Practice (ngobrol langsung real-time sama partner AI, dikoreksi grammar) → url "/ielts/tutor/live". GRATIS selama beta.
- Voice Clone (rekam jawaban Speaking → diperbaiki ke Band 8 → diputar ulang dengan suara kamu sendiri) → url "/voice-clone". Mulai Rp 49rb.
- IELTS Bundle (Mock Test + Tutor 30 hari + Voice Clone gratis) → url "/ielts/mock-test". Mulai Rp 299rb.

TES MINAT-BAKAT & IQ:
- Tes Aptitude Gratis (RIASEC + minat, analisis AI singkat) → url "/play/aptitude". Gratis.
- Laporan Aptitude Pro (laporan mendalam 30+ halaman: kepribadian, karier, gaji, rekomendasi jurusan & universitas) → url "/test/pro". Mulai Rp 59rb.
- IQ Discovery (tes IQ seru untuk pelajar Indonesia, hasil nyata + insight self-discovery) → url "/iq-discovery". Mulai Rp 59rb.

SPECTA TUTOR (AI Teacher per mapel):
- IGCSE AI Teacher (Cambridge: Math, Physics, Economics, Business) → url "/igcse". Berlangganan.
- A Level & Kurikulum Mandiri → segera hadir.

KULIAH KE LUAR NEGERI:
- SpecTa bantu konsultasi gratis, pilih negara & jurusan, sampai proses aplikasi.
- Halaman negara tujuan → url "/destinations" (ada Australia, Malaysia, UK, Singapore, USA, Canada, Ireland, New Zealand, Netherlands, China). Untuk Malaysia pakai url "/malaysia".
- Info beasiswa → url "/scholarships".
- Konsultasi Gratis (booking) → url "/book". Ini cara terbaik untuk pertanyaan personal soal kuliah/aplikasi.
- Daftar Cepat → url "/apply".
- Lacak status aplikasi → url "/track".

BANTUAN LANGSUNG:
- Untuk hal yang butuh manusia (harga khusus, kasus personal, pembayaran), arahkan ke WhatsApp admin → url "https://wa.me/62818218388".

ATURAN:
- Jangan mengarang produk/harga yang tidak ada di atas. Kalau ragu, arahkan ke konsultasi gratis atau WhatsApp.
- Selalu bantu siswa melangkah ke aksi berikutnya (coba tes gratis, booking konsultasi, dsb) dengan menyertakan link-nya.
- Jangan sebut kamu AI kecuali ditanya langsung — kalau ditanya, jujur dan ramah aja.
- Jaga energi tetap positif dan bikin siswa semangat lanjut sama SpecTa.`;

// Fuller, warmer, standard-casual Indonesian in complete sentences — a
// staccato greeting ("...apa nih?") reads childish/clipped through TTS,
// while flowing sentences render like her (good) answers. The soft opener
// also absorbs any onset clipping on the very first audio frames.
const FIRST_MESSAGE = "Halo, selamat datang di SpecTa Education! Aku Emma, asisten kamu di sini, dan aku senang bisa ngobrol sama kamu. Aku siap bantu jawab apa aja — mulai dari IELTS, tes minat dan bakat, IQ, sampai rencana kuliah ke luar negeri. Jadi, ada yang bisa aku bantu hari ini?";

// ── Client tool declaration ───────────────────────────────────────────────
// Declared on the agent so the LLM knows it can call it; the IMPLEMENTATION
// lives client-side (renders a clickable card). expects_response:false =
// fire-and-forget, so the call doesn't stall the conversation.
const SHOW_LINK_TOOL = {
  type: "client",
  name: "show_link",
  description:
    "Tampilkan kartu link yang bisa diklik siswa di layar. Panggil setiap kali kamu menyebut produk, tes, halaman, booking, atau WhatsApp SpecTa, supaya siswa bisa langsung membukanya.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Label singkat tombol dalam Bahasa Indonesia, mis. 'Tes Aptitude Pro'." },
      url: { type: "string", description: "Path SpecTa (mis. '/test/pro') atau URL lengkap (mis. 'https://wa.me/62818218388')." },
      subtitle: { type: "string", description: "Deskripsi singkat satu baris (opsional)." },
    },
    required: ["title", "url"],
  },
  expects_response: false,
};

async function elFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${EL_API}${path}`, {
    ...init,
    headers: {
      "xi-api-key": ENV.elevenLabsApiKey,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

/** Build the agent config. `withTools` → declare the show_link client tool. */
function buildAgentPayload(withTools: boolean): any {
  const promptConfig: any = {
    prompt: AGENT_SYSTEM_PROMPT,
    llm: BUNDLED_LLM(),
  };
  if (withTools) promptConfig.tools = [SHOW_LINK_TOOL];
  return {
    name: "SpecTa Voice Concierge (Emma)",
    conversation_config: {
      agent: {
        prompt: promptConfig,
        first_message: FIRST_MESSAGE,
        language: "id",
      },
      tts: {
        // Bahasa needs a MULTILINGUAL model — flash v2.5 is the low-latency
        // multilingual option (the English-only flash/turbo v2 models that the
        // IELTS agent uses would not speak Indonesian well). ElevenLabs only
        // rejects v2.5 for English-language agents, not Indonesian ones.
        voice_id: ENV.elevenLabsDefaultVoiceId,
        model_id: "eleven_flash_v2_5",
        // Pin explicit voice settings so the static first_message renders with
        // the SAME character as the generated turns. Without this, ElevenLabs
        // synthesizes the greeting at the voice's defaults (often low
        // stability → wobbly, high-pitched, "childish") while conversational
        // turns sound mature — the exact intro-vs-answers mismatch Hadi heard.
        // Higher stability = steadier, less sing-songy; speaker boost = clearer.
        stability: 0.6,
        similarity_boost: 0.85,
        use_speaker_boost: true,
      },
      conversation: {
        max_duration_seconds: CONCIERGE_MAX_SECONDS,
      },
    },
  };
}

async function createAgent(): Promise<string> {
  // Attempt 1: with the show_link client tool.
  {
    const res = await elFetch("/v1/convai/agents/create", {
      method: "POST",
      body: JSON.stringify(buildAgentPayload(true)),
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data?.agent_id) {
        console.log(`[Concierge] ✅ Agent created WITH show_link tool: ${data.agent_id}`);
        return data.agent_id;
      }
    } else {
      console.warn(`[Concierge] tool-enabled creation rejected (${res.status}): ${(await res.text()).slice(0, 300)} — retrying without tools`);
    }
  }

  // Attempt 2: without tools — Emma still answers everything and speaks the
  // URLs aloud (they also appear in the live transcript); just no click cards.
  const res = await elFetch("/v1/convai/agents/create", {
    method: "POST",
    body: JSON.stringify(buildAgentPayload(false)),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs concierge agent creation failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data: any = await res.json();
  if (!data?.agent_id) throw new Error("ElevenLabs concierge creation returned no agent_id");
  console.log(`[Concierge] ✅ Agent created WITHOUT tools (fallback): ${data.agent_id}`);
  return data.agent_id;
}

/** Get the concierge agent id, creating it idempotently on first call. */
export async function ensureConciergeAgent(): Promise<string> {
  if (!ENV.elevenLabsApiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const existing = await readFlag(AGENT_FLAG_KEY);
  if (existing) return existing;
  const agentId = await createAgent();
  await writeFlag(AGENT_FLAG_KEY, agentId);
  return agentId;
}

// ── Cost guardrails (own caps, separate from IELTS live) ──────────────────
export const CONCIERGE_ANON_PER_IP_PER_DAY = Number(process.env.CONCIERGE_ANON_PER_IP_PER_DAY || 8);
export const CONCIERGE_GLOBAL_PER_DAY = Number(process.env.CONCIERGE_GLOBAL_PER_DAY || 100);

const ipHits = new Map<string, number[]>();

function pruneAndCountIp(ip: string): number {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const arr = (ipHits.get(ip) || []).filter(t => t >= dayAgo);
  ipHits.set(ip, arr);
  return arr.length;
}

/** null-safe: returns {ok:false, reason} when a cap is hit. */
export async function checkConciergeQuota(ip: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const key = ip || "unknown";
  if (pruneAndCountIp(key) >= CONCIERGE_ANON_PER_IP_PER_DAY) {
    return { ok: false, reason: `Kuota harian dari perangkat ini sudah tercapai (${CONCIERGE_ANON_PER_IP_PER_DAY}/hari). Coba lagi besok, atau chat WhatsApp admin.` };
  }
  const dayKey = `concierge_global_${new Date().toISOString().slice(0, 10)}`;
  const current = Number((await readFlag(dayKey)) || "0");
  if (current >= CONCIERGE_GLOBAL_PER_DAY) {
    return { ok: false, reason: "Kuota harian Tanya SpecTa sudah penuh hari ini 🙏 Coba lagi besok — atau chat WhatsApp admin untuk bantuan langsung." };
  }
  return { ok: true };
}

/** Record one concierge session start against both caps. */
export async function recordConciergeStart(ip: string): Promise<void> {
  const key = ip || "unknown";
  const arr = ipHits.get(key) || [];
  arr.push(Date.now());
  ipHits.set(key, arr);
  const dayKey = `concierge_global_${new Date().toISOString().slice(0, 10)}`;
  const current = Number((await readFlag(dayKey)) || "0");
  await writeFlag(dayKey, String(current + 1));
}

/** Mint a signed URL for one concierge conversation. Caps checked by caller. */
export async function getConciergeSignedUrl(): Promise<{ signedUrl: string; agentId: string }> {
  const agentId = await ensureConciergeAgent();
  const res = await elFetch(`/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`ElevenLabs concierge signed-url failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data: any = await res.json();
  if (!data?.signed_url) throw new Error("ElevenLabs returned no signed_url for concierge");
  return { signedUrl: data.signed_url, agentId };
}
