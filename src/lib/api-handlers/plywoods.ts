import { NextRequest, NextResponse } from "next/server";
import { db, executeQuery, executeMutation } from "@/lib/db";
import { VERIFY } from "./auth";
import type { PlywoodSample } from "@/lib/plywood-catalog";

async function ensureTable() {
  if (!db) throw new Error("합판 저장 DB에 연결할 수 없습니다.");
  await executeMutation(`CREATE TABLE IF NOT EXISTS bo_plywood_official (
    id TEXT PRIMARY KEY, code TEXT NOT NULL COLLATE NOCASE, name TEXT NOT NULL,
    data TEXT NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await executeMutation(`CREATE TABLE IF NOT EXISTS bo_plywood_samples (
    id TEXT PRIMARY KEY, code TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await executeMutation(`CREATE TABLE IF NOT EXISTS bo_plywood_image_overrides (
    id TEXT PRIMARY KEY, image TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

export async function GET() {
  try {
    await ensureTable();
    const result = await executeQuery("SELECT data FROM bo_plywood_samples ORDER BY created_at DESC");
    if (!result.success) throw new Error("수동 등록 합판을 불러오지 못했습니다.");
    const overrides = await executeQuery("SELECT id, image FROM bo_plywood_image_overrides");
    if (!overrides.success) throw new Error("수정 이미지를 불러오지 못했습니다.");
    const official = await executeQuery("SELECT data FROM bo_plywood_official ORDER BY sort_order");
    if (!official.success) throw new Error("공식 합판 조회 실패");
    const updated = official.rows.map((row) => {
      const original = JSON.parse(String(row.data)) as PlywoodSample;
      const override = overrides.rows.find((saved) => String(saved.id) === original.id);
      return override ? { ...original, image: override.image === null ? null : String(override.image) } : original;
    });
    return NextResponse.json({ success: true, data: [...updated, ...result.rows.map((row) => JSON.parse(String(row.data)))] });
  } catch {
    return NextResponse.json({ success: false, message: "저장된 합판 정보를 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 불러와 주세요." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await VERIFY(request);
  if (!session.ok) return session;
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const image = body.image || null;
    const color = body.color || "#e7e2d8";
    if (!name || name.length > 80 || !code || code.length > 64 || !/^#[0-9a-f]{6}$/i.test(color) ||
        (image !== null && (typeof image !== "string" || image.length > 3_000_000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)))) {
      return NextResponse.json({ success: false, message: "합판명·품번·색상과 이미지 형식을 확인해 주세요. 이미지는 JPG, PNG, WebP 2MB 이하만 가능합니다." }, { status: 400 });
    }
    await ensureTable();
    const officialCode = await executeQuery("SELECT id FROM bo_plywood_official WHERE code = ?", [code]);
    if (!officialCode.success) throw new Error("공식 품번 조회 실패");
    if (officialCode.rows.length) return NextResponse.json({ success: false, message: "공식 목록에 이미 등록된 품번입니다." }, { status: 409 });
    const existing = await executeQuery("SELECT id FROM bo_plywood_samples WHERE code = ?", [code]);
    if (!existing.success) throw new Error("품번 확인 실패");
    if (existing.rows.length) return NextResponse.json({ success: false, message: "이미 등록된 품번입니다." }, { status: 409 });
    const sample: PlywoodSample = { id: crypto.randomUUID(), name, code, sourceName: code, image, color, sourceImage: null, origin: "manual", roughness: .8, metalness: 0 };
    await executeMutation("INSERT INTO bo_plywood_samples (id, code, name, data) VALUES (?, ?, ?, ?)", [sample.id, code, name, JSON.stringify(sample)]);
    return NextResponse.json({ success: true, data: sample }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "합판을 저장하지 못했습니다. 연결 상태와 중복 품번을 확인해 주세요." }, { status: 503 });
  }
}

/** Update only the image, keyed by stable ID (official SKUs may be duplicated). */
export async function PUT(request: NextRequest) {
  const session = await VERIFY(request);
  if (!session.ok) return session;
  try {
    const body = await request.json();
    const { id, image } = body;
    if (typeof id !== "string" || !id || (image !== null &&
      (typeof image !== "string" || image.length > 3_000_000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)))) {
      return NextResponse.json({ success: false, message: "JPG, PNG, WebP 이미지 2MB 이하를 선택해 주세요." }, { status: 400 });
    }
    await ensureTable();
    const official = await executeQuery("SELECT data FROM bo_plywood_official WHERE id = ?", [id]);
    if (!official.success) throw new Error("공식 합판 조회 실패");
    let sample: PlywoodSample | undefined = official.rows.length ? JSON.parse(String(official.rows[0].data)) : undefined;
    if (sample) {
      await executeMutation("INSERT INTO bo_plywood_image_overrides (id, image) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET image = excluded.image, updated_at = CURRENT_TIMESTAMP", [id, image]);
    } else {
      const result = await executeQuery("SELECT data FROM bo_plywood_samples WHERE id = ?", [id]);
      if (!result.success) throw new Error("합판 조회 실패");
      if (!result.rows.length) return NextResponse.json({ success: false, message: "합판을 찾을 수 없습니다." }, { status: 404 });
      sample = JSON.parse(String(result.rows[0].data)) as PlywoodSample;
      await executeMutation("UPDATE bo_plywood_samples SET data = json_set(data, '$.image', ?) WHERE id = ?", [image, id]);
    }
    return NextResponse.json({ success: true, data: { ...sample, image } });
  } catch {
    return NextResponse.json({ success: false, message: "이미지를 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 503 });
  }
}
