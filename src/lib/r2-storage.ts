import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

export const STORAGE_WARNING_BYTES = 8_000_000_000;
type StorageUsage = { totalBytes: number; objectCount: number; checkedAt: string; warningBytes: number; overWarning: boolean };
let usageCache: StorageUsage | undefined;
let usagePending: Promise<StorageUsage> | undefined;
let storageRevision = 0;

export async function getStorageUsage(): Promise<StorageUsage> {
  if (usageCache && Date.now() - Date.parse(usageCache.checkedAt) < 60_000) return usageCache;
  if (usagePending) return usagePending;
  const revision = storageRevision;
  usagePending = (async () => {
    const { client, bucket } = storage();
    let totalBytes = 0, objectCount = 0;
    let token: string | undefined;
    const seen = new Set<string>();
    try {
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000, ContinuationToken: token }), { abortSignal: AbortSignal.timeout(15_000) });
        for (const object of page.Contents || []) {
          totalBytes += object.Size || 0;
          objectCount++;
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
        if (page.IsTruncated && (!token || seen.has(token))) throw new Error("Incomplete storage listing");
        if (token) seen.add(token);
      } while (token);
      const result = { totalBytes, objectCount, checkedAt: new Date().toISOString(), warningBytes: STORAGE_WARNING_BYTES, overWarning: totalBytes > STORAGE_WARNING_BYTES };
      if (revision === storageRevision) usageCache = result;
      return result;
    } finally { client.destroy(); }
  })();
  try { return await usagePending; }
  finally { usagePending = undefined; }
}

function storage() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error("시공사진 R2 저장소 설정을 확인해주세요.");
  }
  return { bucket: R2_BUCKET_NAME, client: new S3Client({
    region: "auto", endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  }) };
}

export async function storeConstructionPhoto(url: string): Promise<string> {
  if (!url.startsWith("data:image/")) return url;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!match || url.length > 700000) throw new Error("지원하지 않는 사진 형식 또는 크기입니다.");
  const key = `construction-photos/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${match[1] === "jpeg" ? "jpg" : match[1]}`;
  const { client, bucket } = storage();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(match[2], "base64"), ContentType: `image/${match[1]}` }));
  storageRevision++;
  usageCache = undefined;
  return `/api/construction-photo?key=${encodeURIComponent(key)}`;
}

export async function readConstructionPhoto(key: string) {
  if (!/^construction-photos\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.(jpg|png|webp)$/.test(key)) throw new Error("Invalid photo key");
  const { client, bucket } = storage();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) throw new Error("Photo not found");
  return { bytes: await object.Body.transformToByteArray(), contentType: object.ContentType || "image/jpeg" };
}
