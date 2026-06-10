/**
 * One-off: generates IELTS Listening sample audio with ElevenLabs and
 * uploads each section to R2 so we can listen and evaluate voice quality
 * before committing to ElevenLabs for the whole test bank.
 *
 * Usage (on Railway, in the service Console tab):
 *   pnpm tsx scripts/sample-ielts-listening-audio.ts
 *
 * Outputs four public URLs (one per section) printed to stdout. Each clip
 * is ~30 seconds — long enough to judge voice realism without burning
 * many credits. Roughly $0.05–0.10 total per run.
 */

import { synthesize, LISTENING_VOICE_MAP } from "../server/_core/elevenlabs";
import { storagePut } from "../server/storage";

type Sample = {
  label: string;
  voiceId: string;
  text: string;
};

const SAMPLES: Sample[] = [
  {
    label: "section1-customer-booking",
    voiceId: LISTENING_VOICE_MAP.section1.primary, // British female
    text:
      "Good morning, Coastal Cottages, this is Sarah speaking. Of course, I can help you with that booking. Could I take your full name, please? And the dates you're looking at — that was the fifteenth and sixteenth of next month, wasn't it? Lovely. How many adults will be staying, and will there be any children with you?",
  },
  {
    label: "section2-sanctuary-welcome",
    voiceId: LISTENING_VOICE_MAP.section2.primary, // Australian male
    text:
      "G'day everyone, and welcome to Greenfield Wildlife Sanctuary. My name's Tom, and I'll be your guide today. Before we head off on our tour, let me just run through a few important points. The sanctuary was first established back in nineteen-ninety-two, with the aim of protecting native species from habitat loss. Today, we look after more than two hundred animals across forty-six different species.",
  },
  {
    label: "section3-tutor-discussion",
    voiceId: LISTENING_VOICE_MAP.section3.secondary, // British female
    text:
      "Right, so for your comparative essay on urban migration, I think the most productive angle would be to focus on the methodological differences between the two studies, rather than just summarising what each researcher concluded. Why? Because when you understand how they collected and analysed their data, the contradictions between their findings start to make a lot more sense.",
  },
  {
    label: "section4-economics-lecture",
    voiceId: LISTENING_VOICE_MAP.section4.primary, // British male, academic
    text:
      "In today's lecture, I want to turn our attention to the economics of small-scale fisheries. Now, when we talk about small-scale fisheries, we generally mean operations that use vessels under twelve metres in length — though that definition does vary by country. Worldwide, it is estimated that around forty million people depend directly on these fisheries for their livelihoods, with a further hundred million indirectly involved.",
  },
];

async function main() {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set in this environment. Run from Railway Console or a host with the var."
    );
  }
  if (!process.env.R2_BUCKET && !process.env.AWS_S3_BUCKET) {
    throw new Error("No storage bucket configured (R2_* or AWS_*).");
  }

  console.log(`Generating ${SAMPLES.length} sample audio clips with ElevenLabs...\n`);

  for (const sample of SAMPLES) {
    process.stdout.write(`  ${sample.label} (${sample.voiceId})... `);
    try {
      const audio = await synthesize({
        text: sample.text,
        voiceId: sample.voiceId,
        // Higher-quality model for listening sections (vs the turbo model).
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
        stability: 0.5,
        similarityBoost: 0.75,
      });

      const key = `ielts/samples/${sample.label}.mp3`;
      const { url } = await storagePut(key, audio, "audio/mpeg");
      console.log(`OK  ${(audio.byteLength / 1024).toFixed(0)} KB`);
      console.log(`    ${url}\n`);
    } catch (err) {
      console.log(`FAILED`);
      console.error("    ", err instanceof Error ? err.message : err, "\n");
    }
  }

  console.log("Done. Paste any URL into a browser tab to play it.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
