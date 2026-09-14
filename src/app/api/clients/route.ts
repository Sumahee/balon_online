import { NextResponse } from "next/server";
import { executeQuery, db } from "@/lib/db";
import { ClientInfo } from "@/types";

const mockClients: ClientInfo[] = [
  { id: 1, name: "(주)디자인에이치", officePhone: "02-555-1234", companyAddress: "서울시 서초구 반포대로 12", ceoName: "홍길동" },
  { id: 2, name: "공간디자인 림", officePhone: "02-444-5678", companyAddress: "서울시 성동구 연무장길 45", ceoName: "김림" },
  { id: 3, name: "한빛 인테리어", officePhone: "031-777-8899", companyAddress: "경기도 성남시 분당구 판교역로 100", ceoName: "이한빛" },
  { id: 4, name: "더바른 가구디자인", officePhone: "02-333-2211", companyAddress: "서울시 마포구 월드컵북로 88", ceoName: "박바른" },
];

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
    sql += " ORDER BY name ASC LIMIT 50";

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
      return NextResponse.json({ success: true, clients });
    }
  }

  // Fallback to mock list
  let filtered = mockClients;
  if (search) {
    const queryLower = search.toLowerCase();
    filtered = mockClients.filter((c) => c.name.toLowerCase().includes(queryLower));
  }
  return NextResponse.json({ success: true, clients: filtered, isMock: !db });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, companyAddress, businessNumber, ceoName, officePhone } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
    }

    if (db) {
      const sql = `
        INSERT INTO clients (name, company_address, business_number, ceo_name, office_phone)
        VALUES (?, ?, ?, ?, ?)
      `;
      const args = [name, companyAddress || "", businessNumber || "", ceoName || "", officePhone || ""];
      const res = await executeQuery(sql, args);
      if (res.success) {
        return NextResponse.json({ success: true, message: "Client added to clients table" });
      }
    }

    return NextResponse.json({ success: true, message: "Mock client added" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
