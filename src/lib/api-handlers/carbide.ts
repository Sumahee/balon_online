import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import type { Row } from "@libsql/client";
import { db } from "@/lib/db";
import { isInstaller } from "@/lib/access";
import { CARBIDE_KINDS, CARBIDE_STATUSES, CARBIDE_REQUEST_LIMIT, carbidePhotoUrl, isCarbidePhotoReference, carbideCosts, validCarbideDate, validateCarbideValues, type CarbideValues } from "@/lib/carbide";
import { VERIFY } from "./auth";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
let pending: Promise<void> | undefined;
async function schema() {
  if (!db) throw new Error("초경 기록 DB에 연결할 수 없습니다.");
  if (!pending) pending = (async () => {
    await db!.batch([
      `CREATE TABLE IF NOT EXISTS bo_carbide_records (id TEXT PRIMARY KEY,record_date TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,tool_name TEXT NOT NULL,tool_code TEXT NOT NULL,search_text TEXT NOT NULL,payload_json TEXT NOT NULL,total INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_by TEXT NOT NULL,author TEXT NOT NULL,updated_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
      "CREATE INDEX IF NOT EXISTS bo_carbide_date ON bo_carbide_records(record_date DESC,created_at DESC,id DESC)",
      "CREATE INDEX IF NOT EXISTS bo_carbide_code ON bo_carbide_records(tool_code,record_date DESC)",
    ], "write");
  })().catch(error => { pending = undefined; throw error; });
  await pending;
}
async function staff(request: Request) {
  const session = await VERIFY(request);
  if (!session.ok) return { denied: session };
  const { user } = await session.json();
  if (isInstaller(user)) return { denied: json({ success: false, error: "초경 관리는 직원만 이용할 수 있습니다." }, 403) };
  return { user: { id: String(user.id), name: String(user.name) } };
}
function record(row: Row) {
  const payload = JSON.parse(String(row.payload_json));
  const photoCount = Number(row.photo_count ?? payload.photos?.length ?? 0);
  return { ...payload, photos: Array.from({ length: photoCount }, (_, index) => carbidePhotoUrl(String(row.id), index, Number(row.revision))), id: row.id, total: Number(row.total), revision: Number(row.revision), createdBy: row.created_by, author: row.author, updatedBy: row.updated_by, createdAt: row.created_at, updatedAt: row.updated_at };
}
function searchable(value: CarbideValues) { return [value.toolName, value.toolCode, value.toolType, value.material, value.brandModel, value.spec, value.diameter, value.kerf, value.bore, value.teeth, value.machine, value.provider, value.contact, value.phone, value.documentNo, value.memo, ...value.options].join(" "); }

export async function GET(request: Request) {
  const auth = await staff(request); if (auth.denied) return auth.denied;
  const p = new URL(request.url).searchParams;
  const from = p.get("from") || "", to = p.get("to") || "", kind = p.get("kind") || "", status = p.get("status") || "", q = (p.get("q") || "").trim();
  const offset = Number(p.get("offset") || 0);
  if ((from && !validCarbideDate(from)) || (to && !validCarbideDate(to)) || (from && to && from > to) || (kind && !CARBIDE_KINDS.includes(kind as typeof CARBIDE_KINDS[number])) || (status && !CARBIDE_STATUSES.includes(status as typeof CARBIDE_STATUSES[number])) || !Number.isSafeInteger(offset) || offset < 0 || offset > 10_000_000 || q.length > 200 || (p.has("id") && !uuid(p.get("id"))) || (p.has("photo") && (!uuid(p.get("photo")) || !/^[0-3]$/.test(p.get("index") || "") || !/^[1-9]\d*$/.test(p.get("v") || "")))) return json({ success: false, error: "조회 조건과 날짜를 확인해 주세요." }, 400);
  try {
    await schema();
    if (p.has("photo")) {
      const result = await db!.execute({ sql: "SELECT json_extract(payload_json,?) AS photo FROM bo_carbide_records WHERE id=? AND revision=?", args: [`$.photos[${Number(p.get("index"))}]`, p.get("photo")!, Number(p.get("v"))] });
      const match = String(result.rows[0]?.photo || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return json({ success: false, error: "사진을 찾을 수 없습니다. 최신 기록을 다시 조회해 주세요." }, 404);
      return new Response(Buffer.from(match[2], "base64"), { headers: { "Content-Type": match[1], "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    if (p.has("id")) {
      const result = await db!.execute({ sql: "SELECT * FROM bo_carbide_records WHERE id=?", args: [p.get("id")!] });
      return result.rows.length ? json({ success: true, data: record(result.rows[0]) }) : json({ success: false, error: "기록을 찾을 수 없습니다." }, 404);
    }
    const conditions = [], args: (string | number)[] = [];
    if (from) { conditions.push("record_date>=?"); args.push(from); }
    if (to) { conditions.push("record_date<=?"); args.push(to); }
    if (kind) { conditions.push("kind=?"); args.push(kind); }
    if (status) { conditions.push("status=?"); args.push(status); }
    if (q) { conditions.push("instr(lower(search_text),lower(?))>0"); args.push(q); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows, counts] = await db!.batch([
      { sql: `SELECT id,total,revision,created_by,author,updated_by,created_at,updated_at,json_remove(payload_json,'$.photos') AS payload_json,COALESCE(json_array_length(payload_json,'$.photos'),0) AS photo_count FROM bo_carbide_records ${where} ORDER BY record_date DESC,created_at DESC,id DESC LIMIT 26 OFFSET ?`, args: [...args, offset] },
      { sql: `SELECT COUNT(*) AS count,COALESCE(SUM(CASE WHEN status!='취소' THEN total ELSE 0 END),0) AS amount,COALESCE(SUM(CASE WHEN status='완료' THEN total ELSE 0 END),0) AS completed_amount,SUM(CASE WHEN status IN ('의뢰/발주','진행중') THEN 1 ELSE 0 END) AS open_count,COALESCE(SUM(CASE WHEN status!='취소' THEN json_extract(payload_json,'$.tipCount') ELSE 0 END),0) AS tip_count FROM bo_carbide_records ${where}`, args },
    ], "read");
    const count = counts.rows[0];
    return json({ success: true, data: { items: rows.rows.slice(0, 25).map(record), count: Number(count.count), summary: { amount: Number(count.amount), completedAmount: Number(count.completed_amount), openCount: Number(count.open_count || 0), tipCount: Number(count.tip_count) } }, hasMore: rows.rows.length > 25 });
  } catch { return json({ success: false, error: "초경 기록을 불러오지 못했습니다. 다시 조회해 주세요." }, 503); }
}

async function save(request: Request, editing: boolean) {
  const auth = await staff(request); if (auth.denied) return auth.denied;
  let value: CarbideValues, id: string, revision: number, keepPhotos: boolean;
  try {
    const raw = await request.text();
    if (raw.length > CARBIDE_REQUEST_LIMIT) return json({ success: false, error: "기록 내용이 너무 큽니다." }, 413);
    const body = JSON.parse(raw);
    value = validateCarbideValues(body);
    keepPhotos = editing && body.photos === undefined;
    id = body.id === undefined && !editing ? randomUUID() : body.id;
    if (!uuid(id)) throw new Error("기록 번호를 확인해 주세요.");
    revision = body.revision;
    if (editing && (!Number.isSafeInteger(revision) || revision < 1)) throw new Error("기록을 다시 조회한 후 수정해 주세요.");
    for (const photo of value.photos) {
      if (isCarbidePhotoReference(photo)) continue;
      try {
        const match = photo.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/)!;
        const image = sharp(Buffer.from(match[2], "base64"), { limitInputPixels: 4_000_000, failOn: "warning" });
        const info = await image.metadata();
        if (info.format !== match[1] || !info.width || !info.height || info.width > 1920 || info.height > 1920 || (info.pages || 1) > 1) throw new Error("invalid photo");
        await image.stats();
      } catch { throw new Error("사진 파일을 확인할 수 없습니다. 1920px 이하의 JPEG·PNG·WebP 사진으로 다시 첨부해 주세요."); }
    }
  } catch (error) { return json({ success: false, error: error instanceof Error ? error.message : "입력 내용을 확인해 주세요." }, 400); }
  try {
    await schema();
    const tx = await db!.transaction("write");
    try {
      const total = carbideCosts(value).total, now = new Date().toISOString();
      if (editing) {
        const current = await tx.execute({ sql: "SELECT revision,payload_json FROM bo_carbide_records WHERE id=?", args: [id] });
        if (!current.rows.length) return json({ success: false, error: "기록을 찾을 수 없습니다." }, 404);
        if (Number(current.rows[0].revision) !== revision!) return json({ success: false, error: "다른 직원이 먼저 수정했습니다. 입력 내용을 보관한 후 최신 기록을 다시 열어 주세요." }, 409);
        const existingPhotos: string[] = JSON.parse(String(current.rows[0].payload_json)).photos || [];
        const resolved: string[] = [];
        for (const photo of value.photos) {
          if (!isCarbidePhotoReference(photo)) { resolved.push(photo); continue; }
          const index = existingPhotos.findIndex((_, index) => carbidePhotoUrl(id, index, revision!) === photo);
          if (index === -1) return json({ success: false, error: "이 기록의 사진이 아닙니다. 최신 기록을 다시 열어 주세요." }, 400);
          resolved.push(existingPhotos[index]);
        }
        value.photos = keepPhotos ? existingPhotos : resolved;
        const payload = JSON.stringify(value);
        await tx.execute({ sql: "UPDATE bo_carbide_records SET record_date=?,kind=?,status=?,tool_name=?,tool_code=?,search_text=?,payload_json=?,total=?,revision=revision+1,updated_by=?,updated_at=? WHERE id=? AND revision=?", args: [value.date, value.kind, value.status, value.toolName, value.toolCode, searchable(value), payload, total, auth.user!.name, now, id, revision!] });
      } else {
        if (value.photos.some(isCarbidePhotoReference)) return json({ success: false, error: "새 기록에는 직접 첨부한 사진만 저장할 수 있습니다." }, 400);
        const payload = JSON.stringify(value);
        await tx.execute({ sql: "INSERT OR IGNORE INTO bo_carbide_records(id,record_date,kind,status,tool_name,tool_code,search_text,payload_json,total,created_by,author,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", args: [id, value.date, value.kind, value.status, value.toolName, value.toolCode, searchable(value), payload, total, auth.user!.id, auth.user!.name, auth.user!.name, now, now] });
        const existing = await tx.execute({ sql: "SELECT created_by,payload_json FROM bo_carbide_records WHERE id=?", args: [id] });
        if (!existing.rows.length || existing.rows[0].created_by !== auth.user!.id || existing.rows[0].payload_json !== payload) return json({ success: false, error: "이미 저장된 기록 번호입니다. 목록에서 확인해 주세요." }, 409);
      }
      const result = await tx.execute({ sql: "SELECT * FROM bo_carbide_records WHERE id=?", args: [id] });
      await tx.commit();
      return json({ success: true, data: record(result.rows[0]) }, editing ? 200 : 201);
    } finally { tx.close(); }
  } catch { return json({ success: false, error: "초경 기록을 저장하지 못했습니다. 입력 내용을 유지한 채 다시 시도해 주세요." }, 503); }
}
export const POST = (request: Request) => save(request, false);
export const PUT = (request: Request) => save(request, true);
