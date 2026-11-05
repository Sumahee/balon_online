import { NextResponse } from "next/server";
import { VERIFY } from "./auth";
import { isInstaller } from "@/lib/access";
import { db } from "@/lib/db";
import { getToday } from "@/lib/date";

/** One atomic update uses current database state, independent of list pagination. */
export async function completePastInstallations(request: Request) {
  const session = await VERIFY(request);
  if (!session.ok) return session;
  const { user } = await session.json();
  if (isInstaller(user)) return NextResponse.json({ success: false, message: "일괄 완료 권한이 없습니다." }, { status: 403 });
  if (!db) return NextResponse.json({ success: false, message: "DB 연결이 없어 완료 상태를 저장할 수 없습니다." }, { status: 503 });

  // Match the card's date precedence, but exclude absent and impossible dates.
  const date = "COALESCE(NULLIF(delivery_date, ''), due_date)";
  try {
    const result = await db.execute({
      sql: `UPDATE bo_work_items SET status = '시공완료', progress = 100
        WHERE status = '준비완료'
          AND COALESCE(NULLIF(deadline_type, ''), '시공일') = '시공일'
          AND ${date} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          AND date(${date}, '+0 days') = ${date}
          AND ${date} < ?
        RETURNING id`,
      args: [getToday()],
    });
    return NextResponse.json({ success: true, data: result.rows.map(row => String(row.id)) });
  } catch {
    return NextResponse.json({ success: false, message: "일괄 완료를 저장하지 못했습니다. 다시 시도해주세요." }, { status: 500 });
  }
}
