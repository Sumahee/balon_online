import sharp from "sharp";
import { db, executeQuery } from "@/lib/db";
import { VERIFY } from "@/lib/api-handlers/auth";
import { isInstaller } from "@/lib/access";
import { AS_PHOTO_BYTES, AS_PHOTO_COUNT, asPhotoUrl, type AsPhotoKind } from "@/lib/as-photos";

export class AsPhotoError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function prepareAsPhotos(body: Record<string, unknown>, id: string, creating: boolean) {
  const touched = body.intakePhotos !== undefined || body.resultPhotos !== undefined || body.images !== undefined;
  if (!touched) return null;
  if (!db) throw new AsPhotoError("DB 연결이 없어 A/S 사진을 저장할 수 없습니다.", 503);
  let intake: string[] = [], result: string[] = [], revision = 0;
  if (!creating) {
    const found = await executeQuery("SELECT intake_photos,result_photos,photo_revision FROM bo_as_items WHERE id=?", [id]);
    if (!found.success) throw new AsPhotoError("기존 A/S 사진을 불러오지 못했습니다.", 503);
    const current = found.rows[0];
    if (!current) throw new AsPhotoError("A/S 기록을 찾을 수 없습니다.", 404);
    revision = Number(current.photo_revision || 0);
    if ((body.photosRevision ?? 0) !== revision) throw new AsPhotoError("다른 곳에서 사진이 변경됐습니다. 목록을 새로고침한 뒤 다시 수정해주세요.", 409);
    intake = JSON.parse(String(current.intake_photos || "[]"));
    result = JSON.parse(String(current.result_photos || "[]"));
  }
  async function resolve(input: unknown, existing: string[], kind: AsPhotoKind) {
    if (input === undefined) return existing;
    if (!Array.isArray(input) || input.length > AS_PHOTO_COUNT) throw new AsPhotoError("접수 사진과 조치 사진은 각각 최대 4장입니다.");
    const resolved: string[] = [];
    for (const photo of input) {
      if (typeof photo !== "string") throw new AsPhotoError("사진 형식을 확인해주세요.");
      const previous = existing.findIndex((_, index) => asPhotoUrl(id, kind, index, revision) === photo);
      if (previous >= 0) { resolved.push(existing[previous]); continue; }
      if (photo.length > Math.ceil(AS_PHOTO_BYTES * 4 / 3) + 50) throw new AsPhotoError("사진은 압축 후 200KB 이하여야 합니다.");
      const match = photo.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
      if (!match) throw new AsPhotoError("사진을 다시 선택해주세요. 다른 접수 건의 사진은 사용할 수 없습니다.");
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > AS_PHOTO_BYTES || bytes.toString("base64") !== match[2]) throw new AsPhotoError("사진 크기 또는 형식을 확인해주세요.");
      try {
        const image = sharp(bytes, { limitInputPixels: 4_000_000, failOn: "warning" });
        const info = await image.metadata();
        if (info.format !== match[1] || !info.width || !info.height || info.width > 1920 || info.height > 1920 || (info.pages || 1) > 1) throw new Error("Invalid image");
        await image.stats();
      } catch { throw new AsPhotoError("사진을 읽지 못했습니다. JPEG·PNG·WebP 사진을 다시 첨부해주세요."); }
      resolved.push(photo);
    }
    return resolved;
  }
  return { intake: await resolve(body.intakePhotos, intake, "intake"), result: await resolve(body.resultPhotos ?? body.images, result, "result"), previousRevision: revision, revision: revision + 1 };
}

export async function readAsPhoto(request: Request) {
  const session = await VERIFY(request);
  if (!session.ok) return session;
  const { user } = await session.json();
  if (isInstaller(user)) return Response.json({ success: false, message: "A/S 사진 조회 권한이 없습니다." }, { status: 403 });
  const p = new URL(request.url).searchParams;
  const id = p.get("photo"), kind = p.get("kind"), index = p.get("index"), revision = p.get("v");
  if (!id || id.length > 200 || !["intake", "result"].includes(kind || "") || !/^[0-3]$/.test(index || "") || !/^\d+$/.test(revision || "")) return Response.json({ success: false }, { status: 400 });
  if (!db) return Response.json({ success: false }, { status: 503 });
  const column = kind === "intake" ? "intake_photos" : "result_photos";
  const found = await executeQuery(`SELECT json_extract(${column}, ?) AS photo FROM bo_as_items WHERE id=? AND photo_revision=?`, [`$[${index}]`, id, Number(revision)]);
  if (!found.success) return Response.json({ success: false }, { status: 503 });
  const match = String(found.rows[0]?.photo || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return Response.json({ success: false }, { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), { headers: { "Content-Type": match[1], "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
