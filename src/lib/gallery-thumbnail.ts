import sharp from "sharp";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { readConstructionPhoto } from "@/lib/r2-storage";

const cache = new Map<string, Uint8Array>();
const pending = new Map<string, Promise<Uint8Array>>();
let schema: Promise<unknown> | undefined;
function ensureSchema() {
  return schema ??= db!.execute(`CREATE TABLE IF NOT EXISTS bo_photo_thumbnails (
    photo_key TEXT PRIMARY KEY, signature TEXT NOT NULL, bytes BLOB NOT NULL
  )`).catch(error => { schema = undefined; throw error; });
}

// Persist only a bounded WebP preview; originals stay in their existing storage.
async function thumbnail(source: string, width: number, key: string, read: () => Promise<Uint8Array>) {
  const signature = createHash("sha256").update(`v2:${source}`).digest("hex");
  const photoKey = `${key}:${width}`;
  const memoryKey = `${photoKey}:${signature}`;
  const cached = cache.get(memoryKey);
  if (cached) return cached;
  const existing = pending.get(memoryKey);
  if (existing) return existing;
  const job = (async () => {
    if (db) {
      try {
        await ensureSchema();
        const result = await db.execute({ sql: "SELECT bytes FROM bo_photo_thumbnails WHERE photo_key = ? AND signature = ?", args: [photoKey, signature] });
        if (result.rows[0]?.bytes) return new Uint8Array(result.rows[0].bytes as ArrayBuffer);
      } catch (error) { console.warn("Thumbnail cache read failed", error); }
    }
    const original = await read();
    let bytes = new Uint8Array(await sharp(original).rotate().resize({ width, height: width, fit: "inside", withoutEnlargement: true }).webp({ quality: 55 }).toBuffer());
    if (bytes.length > 24_000) bytes = new Uint8Array(await sharp(original).rotate().resize({ width: 160, height: 160, fit: "inside", withoutEnlargement: true }).webp({ quality: 40 }).toBuffer());
    if (db && bytes.length <= 24_000) {
      try {
        await ensureSchema();
        await db.execute({ sql: "INSERT INTO bo_photo_thumbnails(photo_key,signature,bytes) VALUES(?,?,?) ON CONFLICT(photo_key) DO UPDATE SET signature=excluded.signature,bytes=excluded.bytes", args: [photoKey, signature, bytes] });
      } catch (error) { console.warn("Thumbnail cache write failed", error); }
    }
    return bytes;
  })();
  pending.set(memoryKey, job);
  try {
    const bytes = await job;
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(memoryKey, bytes);
    return bytes;
  } finally { pending.delete(memoryKey); }
}

export async function photoResponse(url: string, requestUrl: string, width: number | null, key: string): Promise<Response> {
  let signature = url;
  let read: (() => Promise<Uint8Array>) | undefined;
  let contentType = "image/webp";
  if (width && url.startsWith("/uploads/")) {
    const root = path.resolve(process.cwd(), "public", "uploads");
    const file = path.resolve(root, decodeURIComponent(url.slice("/uploads/".length)));
    if (!file.startsWith(`${root}${path.sep}`)) return new Response("Invalid photo", { status: 400 });
    signature += `:${(await stat(file)).mtimeMs}`;
    read = () => readFile(file);
  }
  const match = url.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (match) { contentType = match[1]; read = async () => Buffer.from(match[2], "base64"); }
  if (width && url.startsWith("/api/construction-photo?")) {
    const objectKey = new URL(url, requestUrl).searchParams.get("key") || "";
    read = async () => (await readConstructionPhoto(objectKey)).bytes;
  }
  if (read) {
    const bytes = width ? await thumbnail(signature, width, key, read) : await read();
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": width ? "image/webp" : contentType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  }
  if (/^(https?:\/\/|\/uploads\/)/.test(url) || url.startsWith("/api/construction-photo?")) return Response.redirect(new URL(url, requestUrl));
  return new Response("Invalid photo", { status: 400 });
}
