import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

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
  return `/api/construction-photo?key=${encodeURIComponent(key)}`;
}

export async function readConstructionPhoto(key: string) {
  if (!/^construction-photos\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.(jpg|png|webp)$/.test(key)) throw new Error("Invalid photo key");
  const { client, bucket } = storage();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) throw new Error("Photo not found");
  return { bytes: await object.Body.transformToByteArray(), contentType: object.ContentType || "image/jpeg" };
}
