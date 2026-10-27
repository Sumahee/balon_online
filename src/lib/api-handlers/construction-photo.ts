import { photoResponse } from "@/lib/gallery-thumbnail";
import { VERIFY } from "./auth";
import { readConstructionPhoto } from "@/lib/r2-storage";

export async function GET(request: Request) {
  const auth = await VERIFY(request);
  if (!auth.ok) return auth;
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!/^construction-photos\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.(jpg|png|webp)$/.test(key)) return new Response("Invalid photo key", { status: 400 });
  try {
    const requestedWidth = new URL(request.url).searchParams.get("thumbnail");
    if (requestedWidth !== null) return await photoResponse(`/api/construction-photo?key=${encodeURIComponent(key)}`, request.url, Number(requestedWidth) <= 160 ? 160 : Number(requestedWidth) <= 240 ? 240 : 480, `r2:${key}`);
    const photo = await readConstructionPhoto(key);
    return new Response(new Uint8Array(photo.bytes), { headers: { "Content-Type": photo.contentType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Photo read failed", { status: 503 }); }
}
