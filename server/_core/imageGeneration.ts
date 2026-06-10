/**
 * Image generation backed by DeepInfra (FLUX).
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  width?: number;
  height?: number;
  /** @deprecated FLUX schnell is text-to-image only; kept for compatibility. */
  originalImages?: Array<{ url?: string; b64Json?: string; mimeType?: string }>;
};

export type GenerateImageResponse = { url?: string };

const DEEPINFRA_IMAGE_URL =
  "https://api.deepinfra.com/v1/openai/images/generations";

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.deepinfraApiKey) {
    throw new Error("DEEPINFRA_API_KEY is not configured");
  }

  const response = await fetch(DEEPINFRA_IMAGE_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${ENV.deepinfraApiKey}`,
    },
    body: JSON.stringify({
      model: ENV.deepinfraImageModel,
      prompt: options.prompt,
      n: 1,
      size: `${options.width ?? 1024}x${options.height ?? 1024}`,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };

  const first = result.data?.[0];
  if (!first) throw new Error("Image generation returned no data");

  let buffer: Buffer;
  if (first.b64_json) {
    buffer = Buffer.from(first.b64_json, "base64");
  } else if (first.url) {
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image: ${imgRes.status}`);
    }
    buffer = Buffer.from(await imgRes.arrayBuffer());
  } else {
    throw new Error("Image generation returned no b64_json or url");
  }

  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    "image/png"
  );
  return { url };
}
