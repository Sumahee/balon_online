import { ensureWorkEntrySchema } from "@/lib/work-entry-schema";
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { VERIFY } from "@/lib/api-handlers/auth";

export async function GET(request: NextRequest) {
  // The sign-in page cannot enumerate staff; the work form can load names after login.
  const session = await VERIFY(request);
  if (!session.ok) return session;
  const result = await executeQuery(
    "SELECT id, name, login_id, manager_rank FROM users WHERE (client_id IS NULL OR client_id = 0 OR client_id = '') AND status = 'APPROVED' ORDER BY name ASC", []
  );
  if (!result.success) {
    return NextResponse.json({ success: false, message: "직원 목록을 불러올 수 없습니다." }, { status: 503 });
  }
  await ensureWorkEntrySchema();
  const teams = await executeQuery("SELECT DISTINCT installation_team FROM bo_work_items WHERE installation_team != '' ORDER BY installation_team");
  return NextResponse.json({ success: true, installationTeams: teams.success ? teams.rows.map(row => String(row.installation_team)) : [], staff: result.rows.map((row) => ({
    id: row.id, name: String(row.name || row.login_id || "직원"), role: String(row.manager_rank || "바론 본사 직원"),
  })) });
}
