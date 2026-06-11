/**
 * S3-API-compatible object storage helpers.
 *
 * Works against either Cloudflare R2 (preferred — zero egress fees) or
 * AWS S3. R2 takes priority if R2_* env vars are set.
 *
 * API kept identical to the previous Manus version so callers don't change:
 *   - storagePut(relKey, data, contentType) -> { key, url }   // public URL
 *   - storageGet(relKey)                    -> { key, url }   // presigned URL (1h)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

type StorageProvider = {
  client: S3Client;
  bucket: string;
  publicUrlBase: string;
  kind: "r2" | "s3";
};

let _provider: StorageProvider | null = null;

function getProvider(): StorageProvider {
  if (_provider) return _provider;

  // Cloudflare R2 (preferred).
  if (ENV.r2AccountId && ENV.r2AccessKeyId && ENV.r2SecretAccessKey) {
    if (!ENV.r2Bucket) throw new Error("R2_BUCKET is not configured");
    if (!ENV.r2PublicUrl) throw new Error("R2_PUBLIC_URL is not configured");
    _provider = {
      kind: "r2",
      bucket: ENV.r2Bucket,
      publicUrlBase: ENV.r2PublicUrl.replace(/\/+$/, ""),
      client: new S3Client({
        region: "auto",
        endpoint: `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: ENV.r2AccessKeyId,
          secretAccessKey: ENV.r2SecretAccessKey,
        },
      }),
    };
    return _provider;
  }

  // AWS S3 fallback.
  if (ENV.awsAccessKeyId && ENV.awsSecretAccessKey) {
    if (!ENV.awsS3Bucket) throw new Error("AWS_S3_BUCKET is not configured");
    const publicBase = ENV.awsS3PublicBaseUrl
      ? ENV.awsS3PublicBaseUrl.replace(/\/+$/, "")
      : `https://${ENV.awsS3Bucket}.s3.${ENV.awsRegion}.amazonaws.com`;
    _provider = {
      kind: "s3",
      bucket: ENV.awsS3Bucket,
      publicUrlBase: publicBase,
      client: new S3Client({
        region: ENV.awsRegion,
        credentials: {
          accessKeyId: ENV.awsAccessKeyId,
          secretAccessKey: ENV.awsSecretAccessKey,
        },
      }),
    };
    return _provider;
  }

  throw new Error(
    "No storage provider configured. Set R2_* (preferred) or AWS_* env vars."
  );
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const provider = getProvider();
  const key = normalizeKey(relKey);
  const body =
    typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);

  await provider.client.send(
    new PutObjectCommand({
      Bucket: provider.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key, url: `${provider.publicUrlBase}/${key}` };
}

/**
 * Read an object's raw bytes directly from storage (server-side, using the
 * S3 API). Unlike the public URL, this always works regardless of bucket
 * public-access settings — used for re-transcribing stored speaking audio.
 */
export async function storageGetBytes(
  relKey: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const provider = getProvider();
  const key = normalizeKey(relKey);
  const res = await provider.client.send(
    new GetObjectCommand({ Bucket: provider.bucket, Key: key })
  );
  const bytes = await res.Body!.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    contentType: res.ContentType ?? "application/octet-stream",
  };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const provider = getProvider();
  const key = normalizeKey(relKey);

  const url = await getSignedUrl(
    provider.client,
    new GetObjectCommand({ Bucket: provider.bucket, Key: key }),
    { expiresIn: 60 * 60 }
  );

  return { key, url };
}
