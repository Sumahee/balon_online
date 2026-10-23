import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeMutation, db } from "@/lib/db";
import type { UserInfo } from "@/types";
import crypto from "node:crypto";

const SECRET_KEY = process.env.JWT_SECRET;
const SESSION_DURATION = 1000 * 60 * 60 * 24 * 30;
type UserRow = Record<string, unknown>;

export function isBaronStaff(row: UserRow): boolean {
  return Number(row.level) >= 4 && Number(row.level) <= 10
    && [null, 0, "", "0"].includes(row.client_id as null | number | string)
    && row.status === "APPROVED";
}

function publicUser(row: UserRow): UserInfo {
  return {
    onlineRole: ["시공자", "시공기사"].includes(String(row.manager_rank)) ? "installer" : "staff",
    id: row.id as UserInfo["id"],
    name: String(row.name || row.login_id || "바론 직원"),
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    role: String(row.role || row.manager_rank || "바론 본사 직원"),
  };
}

function equalSecret(actual: string, expected: string): boolean {
  const digest = (value: string) => crypto.createHash("sha256").update(value).digest();
  return crypto.timingSafeEqual(digest(actual), digest(expected));
}

export function generateToken(user: UserInfo): string {
  if (!SECRET_KEY) throw new Error("Session signing secret is not configured");
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + SESSION_DURATION })).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): (UserInfo & { exp: number }) | null {
  if (!SECRET_KEY) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("base64url");
    if (!equalSecret(signature, expected)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.id || typeof decoded.exp !== "number" || !Number.isFinite(decoded.exp) || decoded.exp <= Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

function unavailable() {
  return NextResponse.json({ success: false, message: "직원 인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
}
function denied() {
  return NextResponse.json({ success: false, message: "아이디 또는 비밀번호를 확인해 주세요. 승인된 바론 직원 계정만 로그인할 수 있습니다." }, { status: 401 });
}

export async function LOGIN(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = typeof body.loginId === "string" ? body.loginId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: "직원 계정과 비밀번호를 입력해 주세요." }, { status: 400 });
    }
    if (!db || !SECRET_KEY) return unavailable();
    const result = await executeQuery(
      "SELECT * FROM users WHERE login_id = ? OR name = ? OR email = ? LIMIT 2",
      [identifier, identifier, identifier]
    );
    if (!result.success) return unavailable();
    if (result.rows.length !== 1) return denied();
    const row = result.rows[0] as UserRow;
    // Preserve the shared drawing-program account schema; no test account fallback.
    if (!isBaronStaff(row) || typeof row.password !== "string" || !row.password || !equalSecret(password, row.password)) return denied();
    const user = publicUser(row);
    const token = generateToken(user);
    const response = NextResponse.json({ success: true, message: "로그인 성공", user, token });
    response.cookies.set("baron_auth_token", token, {
      path: "/", maxAge: SESSION_DURATION / 1000, httpOnly: false,
      sameSite: "lax", secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch {
    return unavailable();
  }
}

export async function VERIFY(request: Request) {
  try {
    if (!db || !SECRET_KEY) return unavailable();
    const url = new URL(request.url);
    const header = request.headers.get("authorization");
    const token = url.searchParams.get("token") || (header?.startsWith("Bearer ") ? header.slice(7) : null)
      || request.headers.get("cookie")?.split(";").map(part => part.trim())
        .find(part => part.startsWith("baron_auth_token="))?.slice("baron_auth_token=".length);
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return denied();
    // Re-check membership on every restored session, including drawing-program tokens.
    const result = await executeQuery("SELECT id, login_id, name, email, phone, level, manager_rank, client_id, status FROM users WHERE id = ?", [decoded.id]);
    if (!result.success) return unavailable();
    if (result.rows.length !== 1 || !isBaronStaff(result.rows[0] as UserRow)) return denied();
    const user = publicUser(result.rows[0] as UserRow);
    return NextResponse.json({ success: true, valid: true, user, token: generateToken(user) });
  } catch {
    return unavailable();
  }
}

export async function REGISTER(request: Request) {
  try {
    if (!db) return unavailable();
    const body = await request.json();
    const loginId = typeof body.loginId === "string" ? body.loginId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!/^[A-Za-z0-9_.-]{4,40}$/.test(loginId) || !name || name.length > 50 || password.length < 8 || password.length > 128 || !/^[0-9+() -]{8,25}$/.test(phone) || !["staff","installer"].includes(body.accountType)) {
      return NextResponse.json({success:false,message:"아이디 4~40자, 비밀번호 8자 이상, 이름·연락처와 가입 등급을 확인해주세요."},{status:400});
    }
    const existing = await executeQuery("SELECT id FROM users WHERE login_id = ?", [loginId]);
    if (!existing.success) return unavailable();
    if (existing.rows.length) return NextResponse.json({success:false,message:"이미 사용 중인 아이디입니다."},{status:409});
    // Keep the existing Baron Web account format and PENDING approval workflow.
    await executeMutation("INSERT INTO users (login_id,password,name,phone,email,level,status,client_id,company_name,manager_rank) VALUES (?,?,?,?,?,4,'PENDING',NULL,?,?)", [loginId,password,name,phone,typeof body.email === "string" ? body.email.trim().slice(0,200) : "","바론",body.accountType === "installer" ? "시공자" : "직원"]);
    return NextResponse.json({success:true,message:"가입 신청이 완료되었습니다. 기존 바론웹에서 관리자 승인 후 로그인해주세요."},{status:201});
  } catch { return NextResponse.json({success:false,message:"가입 신청에 실패했습니다. 아이디 중복 여부를 확인해주세요."},{status:503}); }
}
