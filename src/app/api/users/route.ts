import { NextResponse } from "next/server";
import { executeQuery, db } from "@/lib/db";
import { UserInfo } from "@/types";

const mockStaff: UserInfo[] = [
  { id: 1, name: "김진우 실장", phone: "010-1234-5678", role: "설계/공정 총괄" },
  { id: 2, name: "이민아 팀장", phone: "010-9876-5432", role: "오피스/도면" },
  { id: 3, name: "박상현 대리", phone: "010-5555-4444", role: "공장/자재 관리" },
  { id: 4, name: "정성훈 과장", phone: "010-3333-2222", role: "현장 시공 책임" },
];

export async function GET() {
  if (db) {
    // Select users that belong to Baron headquarters (client_id is NULL or 0)
    const sql = "SELECT * FROM users WHERE client_id IS NULL OR client_id = 0 OR client_id = '' ORDER BY name ASC";
    const res = await executeQuery(sql, []);

    if (res.success && res.rows && res.rows.length > 0) {
      const staff: UserInfo[] = res.rows.map((row: any) => ({
        id: row.id,
        name: String(row.name || row.login_id || "직원"),
        phone: row.phone ? String(row.phone) : undefined,
        email: row.email ? String(row.email) : undefined,
        role: row.status || "바론 본사 직원",
      }));
      return NextResponse.json({ success: true, staff });
    }
  }

  return NextResponse.json({ success: true, staff: mockStaff, isMock: !db });
}
