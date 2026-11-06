import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { VERIFY } from "./auth";
import { isInstaller } from "@/lib/access";
import { emptyDrawerPrices, validateDrawerPriceBook } from "@/lib/drawer-pricing";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function staff(request: Request) {
  const response = await VERIFY(request);
  if (!response.ok) return response;
  const { user } = await response.json();
  return isInstaller(user) ? json({ success: false, error: "직원만 부품 단가를 관리할 수 있습니다." }, 403) : null;
}
async function schema() {
  if (!db) throw new Error("단가 저장 서버에 연결할 수 없습니다.");
  await db.execute("CREATE TABLE IF NOT EXISTS bo_drawer_prices (id INTEGER PRIMARY KEY CHECK(id=1), prices TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)");
}
export async function GET(request: Request) {
  const denied = await staff(request); if (denied) return denied;
  try {
    await schema();
    const { rows } = await db!.execute("SELECT prices,revision,updated_at FROM bo_drawer_prices WHERE id=1");
    return json({ success: true, data: rows.length ? { prices: JSON.parse(String(rows[0].prices)), revision: Number(rows[0].revision), updatedAt: rows[0].updated_at } : { prices: emptyDrawerPrices(), revision: 0, updatedAt: null } });
  } catch { return json({ success: false, error: "저장된 단가를 불러오지 못했습니다. 다시 불러와 주세요." }, 503); }
}
export async function PUT(request: Request) {
  const denied = await staff(request); if (denied) return denied;
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 10_000) throw new Error("단가 입력이 너무 큽니다.");
    input = validateDrawerPriceBook(JSON.parse(raw));
  } catch (error) { return json({ success: false, error: error instanceof Error ? error.message : "단가를 확인해 주세요." }, 400); }
  try {
    await schema();
    const tx = await db!.transaction("write");
    try {
      const { rows } = await tx.execute("SELECT revision FROM bo_drawer_prices WHERE id=1");
      const revision = rows.length ? Number(rows[0].revision) : 0;
      if (revision !== input.revision) return json({ success: false, error: "다른 직원이 단가를 변경했습니다. 최신 단가를 다시 불러온 뒤 수정해 주세요." }, 409);
      const updatedAt = new Date().toISOString();
      await tx.execute({ sql: "INSERT INTO bo_drawer_prices(id,prices,revision,updated_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET prices=excluded.prices,revision=excluded.revision,updated_at=excluded.updated_at", args: [JSON.stringify(input.prices), revision + 1, updatedAt] });
      await tx.commit();
      return json({ success: true, data: { prices: input.prices, revision: revision + 1, updatedAt } });
    } finally { tx.close(); }
  } catch { return json({ success: false, error: "단가를 저장하지 못했습니다. 입력값은 유지됩니다. 다시 시도해 주세요." }, 503); }
}
