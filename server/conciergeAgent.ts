/**
 * SpecTa Voice Concierge — ElevenLabs Conversational AI agents.
 *
 * A phone-call-style helpdesk. The student taps "Tanya SpecTa", picks who to
 * talk to, and speaks with either:
 *   - Emma  (female voice)
 *   - Arron (male voice)
 * Both answer ANYTHING about SpecTa Education, studying abroad, tests,
 * pricing, and booking — in Bahasa Indonesia — and surface CLICKABLE LINK
 * CARDS (via the `show_link` client tool) so the student can open the exact
 * page mentioned (prediction test, IQ Discovery, book a call, WhatsApp…).
 *
 * These are SEPARATE agents from the IELTS Live Speaking partner
 * (server/liveSpeakingAgent.ts, which stays Emma-only). Same infrastructure —
 * programmatic idempotent creation, signed URLs, CSP already opened for the
 * AudioWorklet — but different personas, voices, and a client tool.
 *
 * NATURAL BAHASA: the two big levers are the VOICE and the MODEL. Voices are
 * env-configurable (CONCIERGE_VOICE_EMMA / CONCIERGE_VOICE_ARRON) so a native
 * Indonesian voice from the workspace's library can be dropped in — that is
 * what makes it sound human rather than an English voice reading Indonesian.
 * The model defaults to eleven_multilingual_v2 (much more natural prosody for
 * non-English than the flash models), overridable via CONCIERGE_TTS_MODEL.
 *
 * STATUS (2026-09): TEST ONLY — a second button on /ielts/tutor/live so Hadi
 * can evaluate before deciding on a homepage voice concierge.
 */

import { ENV } from "./_core/env";
import { readFlag, writeFlag } from "./systemFlags";

const EL_API = "https://api.elevenlabs.io";

export type ConciergePersona = "emma" | "arron";

/** TTS model. multilingual_v2 = most natural Bahasa (slightly higher latency
 *  than flash — worth it for a helpdesk). Override to eleven_turbo_v2_5 for
 *  lower latency if needed. */
const TTS_MODEL = () => process.env.CONCIERGE_TTS_MODEL || "eleven_multilingual_v2";

/** Max concierge session length. Q&A, not practice — 10 min is plenty.
 *  Enforced server-side by the agent config so a hacked client can't extend. */
export const CONCIERGE_MAX_SECONDS = Number(process.env.CONCIERGE_MAX_SECONDS || 600);

// ── Persona config ────────────────────────────────────────────────────────
//
// Voice ids are env-first so the best NATIVE INDONESIAN voices from the
// workspace's ElevenLabs library can be set without a deploy. Defaults:
//   - Emma  → the workspace default voice (already known-good in this account)
//   - Arron → a premade male voice (Brian). If Arron ever errors on connect,
//     set CONCIERGE_VOICE_ARRON to a male voice id from THIS account.
interface PersonaConfig {
  key: ConciergePersona;
  displayName: string;
  gender: "female" | "male";
  voiceId: string;
  flagKey: string;
  genderLine: string;   // one line injected into the system prompt
  firstMessage: string;
}

function personaConfig(p: ConciergePersona): PersonaConfig {
  if (p === "arron") {
    return {
      key: "arron",
      displayName: "Arron",
      gender: "male",
      // Liam — young, warm, energetic male (was Brian = too old/formal).
      // Override with a NATIVE Indonesian young male voice via env for best feel.
      voiceId: process.env.CONCIERGE_VOICE_ARRON || "TX3LPaxmHKxFdv7VOQHJ",
      // v3: younger/fun persona + memory (dynamic-variable greeting & recall).
      flagKey: "specta_concierge_arron_id_v3",
      genderLine: "Kamu cowok muda yang energik, seru, dan santai — kayak kakak tingkat atau temen yang asik. Ngobrol penuh semangat dan positif, pakai bahasa santai (boleh bahasa gaul yang wajar), JANGAN formal atau kaku.",
      firstMessage: "{{opening_line}}",
    };
  }
  return {
    key: "emma",
    displayName: "Emma",
    gender: "female",
    voiceId: process.env.CONCIERGE_VOICE_EMMA || ENV.elevenLabsDefaultVoiceId,
    flagKey: "specta_concierge_emma_id_v3",
    genderLine: "Kamu cewek yang hangat, ramah, dan bersemangat — bikin siswa nyaman. Ngobrol santai dan ramah, jangan kaku.",
    firstMessage: "{{opening_line}}",
  };
}

// ── Shared knowledge + behaviour (persona name injected at the top) ───────

const SHARED_BODY = `MEMORI USER (dari sesi sebelumnya):
- Nama user: {{known_name}}
- Minat / topik terakhir: {{known_interest}}
- Kalau nama user BUKAN "kosong": kamu sudah kenal dia dari obrolan sebelumnya. Sapa dengan namanya, JANGAN tanya nama lagi, dan jangan ulang perkenalan panjang. Kalau minat terakhirnya bukan "kosong", boleh singgung sedikit untuk nyambungin obrolan.
- Kalau nama user "kosong": ini pertama kali ngobrol. Kenalan dulu dengan ramah dan tanyakan namanya. Begitu kamu tahu namanya (dan minat utamanya kalau sudah kelihatan), PANGGIL tool remember_user supaya kamu ingat dia di kunjungan berikutnya.
- Kalau di tengah obrolan kamu tahu minat baru yang penting, panggil remember_user lagi untuk memperbaruinya.

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

function buildSystemPrompt(cfg: PersonaConfig): string {
  return `Kamu adalah ${cfg.displayName}, front-desk digital SpecTa Education yang ramah, hangat, dan sangat membantu. ${cfg.genderLine} Kamu sedang menerima panggilan telepon dari calon siswa Indonesia yang ingin bertanya tentang SpecTa Education, kuliah ke luar negeri, tes, harga, atau cara mendaftar.

${SHARED_BODY}`;
}

// ── Client tool declaration (implementation lives client-side) ────────────
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

// Persistent memory: the agent calls this once it learns who it's talking to,
// so a returning student is remembered (name + main interest) on their next
// visit. Stored client-side (browser), no login needed. Fire-and-forget.
const REMEMBER_USER_TOOL = {
  type: "client",
  name: "remember_user",
  description:
    "Simpan info user supaya kamu ingat dia di kunjungan berikutnya. Panggil begitu kamu tahu nama user (dan minat utamanya kalau sudah kelihatan), atau saat ada info penting baru.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Nama panggilan user, mis. 'Budi'." },
      interest: { type: "string", description: "Minat / topik utama user dalam satu frasa singkat, mis. 'kuliah ke Australia' atau 'persiapan IELTS' (opsional)." },
    },
    required: ["name"],
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

/** Build the agent config for a persona. `withTools` → declare show_link. */
function buildAgentPayload(cfg: PersonaConfig, withTools: boolean): any {
  const promptConfig: any = {
    prompt: buildSystemPrompt(cfg),
    llm: process.env.CONCIERGE_LLM || "gemini-2.0-flash",
  };
  if (withTools) promptConfig.tools = [SHOW_LINK_TOOL, REMEMBER_USER_TOOL];
  return {
    name: `SpecTa Voice Concierge (${cfg.displayName})`,
    conversation_config: {
      agent: {
        prompt: promptConfig,
        first_message: cfg.firstMessage,
        language: "id",
      },
      tts: {
        voice_id: cfg.voiceId,
        model_id: TTS_MODEL(),
        // Pin voice settings so the static first_message renders with the same
        // character as generated turns (otherwise the greeting sounds off).
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

async function createAgent(cfg: PersonaConfig): Promise<string> {
  // Attempt 1: with the show_link client tool.
  {
    const res = await elFetch("/v1/convai/agents/create", {
      method: "POST",
      body: JSON.stringify(buildAgentPayload(cfg, true)),
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data?.agent_id) {
        console.log(`[Concierge:${cfg.key}] ✅ Agent created WITH show_link tool: ${data.agent_id}`);
        return data.agent_id;
      }
    } else {
      console.warn(`[Concierge:${cfg.key}] tool-enabled creation rejected (${res.status}): ${(await res.text()).slice(0, 300)} — retrying without tools`);
    }
  }

  // Attempt 2: without tools — the agent still answers everything and speaks
  // the URLs aloud (they also appear in the live transcript); no click cards.
  const res = await elFetch("/v1/convai/agents/create", {
    method: "POST",
    body: JSON.stringify(buildAgentPayload(cfg, false)),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs concierge (${cfg.key}) creation failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data: any = await res.json();
  if (!data?.agent_id) throw new Error(`ElevenLabs concierge (${cfg.key}) creation returned no agent_id`);
  console.log(`[Concierge:${cfg.key}] ✅ Agent created WITHOUT tools (fallback): ${data.agent_id}`);
  return data.agent_id;
}

/** Get a persona's agent id, creating it idempotently on first call. */
export async function ensureConciergeAgent(persona: ConciergePersona = "emma"): Promise<string> {
  if (!ENV.elevenLabsApiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const cfg = personaConfig(persona);
  const existing = await readFlag(cfg.flagKey);
  if (existing) return existing;
  const agentId = await createAgent(cfg);
  await writeFlag(cfg.flagKey, agentId);
  return agentId;
}

// ── Cost guardrails (shared across personas — protects total spend) ───────
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
export async function getConciergeSignedUrl(persona: ConciergePersona = "emma"): Promise<{ signedUrl: string; agentId: string }> {
  const agentId = await ensureConciergeAgent(persona);
  const res = await elFetch(`/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`ElevenLabs concierge (${persona}) signed-url failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data: any = await res.json();
  if (!data?.signed_url) throw new Error(`ElevenLabs returned no signed_url for concierge (${persona})`);
  return { signedUrl: data.signed_url, agentId };
}
