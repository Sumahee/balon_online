import { NextResponse } from "next/server";
import { executeQuery, db } from "@/lib/db";
import { ClientInfo } from "@/types";

const mockClients: ClientInfo[] = [
  { id: 1, name: "(주)디자인에이치", officePhone: "02-555-1234", companyAddress: "서울시 서초구 반포대로 12", ceoName: "홍길동" },
  { id: 2, name: "공간디자인 림", officePhone: "02-444-5678", companyAddress: "서울시 성동구 연무장길 45", ceoName: "김림" },
  { id: 3, name: "한빛 인테리어", officePhone: "031-777-8899", companyAddress: "경기도 성남시 분당구 판교역로 100", ceoName: "이한빛" },
  { id: 4, name: "더바른 가구디자인", officePhone: "02-333-2211", companyAddress: "서울시 마포구 월드컵북로 88", ceoName: "박바른" },
];

/**
 * GET /api/clients
 * 기존 Turso DB의 clients 테이블에서 클라이언트 목록을 READ-ONLY(조회 전용)로 가져옵니다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  if (db) {
    let sql = "SELECT * FROM clients";
    const args: any[] = [];

    if (search) {
      sql += " WHERE name LIKE ? OR business_number LIKE ?";
      args.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY name ASC LIMIT 100";

    const res = await executeQuery(sql, args);
    if (res.success && res.rows) {
      const clients: ClientInfo[] = res.rows.map((row: any) => ({
        id: row.id,
        name: String(row.name || ""),
        businessNumber: row.business_number ? String(row.business_number) : undefined,
        ceoName: row.ceo_name ? String(row.ceo_name) : undefined,
        companyAddress: row.company_address ? String(row.company_address) : undefined,
        businessType: row.business_type ? String(row.business_type) : undefined,
        businessItem: row.business_item ? String(row.business_item) : undefined,
        erpCode: row.erp_code ? String(row.erp_code) : undefined,
        billEmail: row.bill_email ? String(row.bill_email) : undefined,
        officePhone: row.office_phone ? String(row.office_phone) : undefined,
      }));
      return NextResponse.json({ success: true, clients, count: clients.length, isDb: true });
    }
  }

  // Fallback to mock list
  let filtered = mockClients;
  if (search) {
    const queryLower = search.toLowerCase();
    filtered = mockClients.filter((c) => c.name.toLowerCase().includes(queryLower));
  }
  return NextResponse.json({ success: true, clients: filtered, count: filtered.length, isMock: true });
}

/**
 * POST /api/clients
 * 주의: 기존 DB의 clients 테이블은 READ-ONLY 정책이 적용되어 있습니다.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "보안 정책: 기존 데이터베이스의 clients 테이블은 바론 온라인에서 읽기 전용(Read-Only)으로만 사용됩니다.",
    },
    { status: 403 }
  );
}
