import { NextRequest, NextResponse } from "next/server";
import { executeQuery, db } from "@/lib/db";
import { UserInfo } from "@/types";
import crypto from "crypto";

const SECRET_KEY = process.env.JWT_SECRET || "baron-online-secret-auth-key-2026";

// Simple Token Helper for environment compatibility
export function generateToken(user: UserInfo): string {
  const payload = {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const jsonStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(base64Payload)
    .digest("base64url");
  return `${base64Payload}.${signature}`;
}

export function verifyToken(token: string): (UserInfo & { exp: number }) | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [base64Payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(base64Payload)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const jsonStr = Buffer.from(base64Payload, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr);

    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

// Mock users for development mode if DB is not populated
const mockStaff: UserInfo[] = [
  { id: 1, name: "김진우 실장", phone: "010-1234-5678", role: "설계/공정 총괄", email: "jinwoo@baron.co.kr" },
  { id: 2, name: "이민아 팀장", phone: "010-9876-5432", role: "오피스/도면", email: "mina@baron.co.kr" },
  { id: 3, name: "박상현 대리", phone: "010-5555-4444", role: "공장/자재 관리", email: "sanghyun@baron.co.kr" },
  { id: 4, name: "정성훈 과장", phone: "010-3333-2222", role: "현장 시공 책임", email: "sunghoon@baron.co.kr" },
];

/**
 * POST /api/auth/login
 * Body: { loginIdOrName, passwordOrPhone }
 */
export async function LOGIN(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { loginId, name, password, phone } = body;

    const targetIdentifier = String(loginId || name || "").trim();
    const targetPassword = String(password || phone || "").trim();

    if (!targetIdentifier) {
      return NextResponse.json(
        { success: false, message: "아이디 또는 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    let foundUser: UserInfo | null = null;

    if (db) {
      // 1. Check DB for matching user
      const sql = `
        SELECT * FROM users 
        WHERE (name = ? OR login_id = ? OR email = ? OR phone = ?)
      `;
      const res = await executeQuery(sql, [targetIdentifier, targetIdentifier, targetIdentifier, targetIdentifier]);

      if (res.success && res.rows && res.rows.length > 0) {
        const row: any = res.rows[0];

        // 🔒 [바론 본사 직원 전용 검증]
        // client_id가 없거나 0/빈값인 경우만 본사 직원
        const clientId = row.client_id;
        const isStaff = clientId === null || clientId === undefined || clientId === 0 || clientId === "" || clientId === "0";

        if (!isStaff) {
          return NextResponse.json(
            {
              success: false,
              message: "접속 불가: 바론 온라인은 바론 본사 직원 전용 시스템입니다.",
            },
            { status: 403 }
          );
        }

        foundUser = {
          id: row.id,
          name: String(row.name || row.login_id || "바론 직원"),
          phone: row.phone ? String(row.phone) : undefined,
          email: row.email ? String(row.email) : undefined,
          role: row.status || row.role || "바론 본사 직원",
        };
      }
    }

    // Fallback to Mock Staff if DB not configured or for quick test
    if (!foundUser) {
      const matched = mockStaff.find(
        (u) =>
          u.name.includes(targetIdentifier) ||
          (u.email && u.email.includes(targetIdentifier)) ||
          (u.phone && u.phone.includes(targetIdentifier))
      );

      if (matched) {
        foundUser = matched;
      } else if (!db) {
        // DB 미연동 시 테스트 유저로 생성
        foundUser = {
          id: Date.now(),
          name: targetIdentifier.endsWith("직원") || targetIdentifier.endsWith("팀장") || targetIdentifier.endsWith("실장") ? targetIdentifier : `${targetIdentifier} 팀장`,
          role: "바론 본사 직원",
          phone: "010-0000-0000",
        };
      }
    }

    if (!foundUser) {
      return NextResponse.json(
        { success: false, message: "일치하는 바론 직원 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const token = generateToken(foundUser);

    const response = NextResponse.json({
      success: true,
      message: "로그인 성공",
      user: foundUser,
      token,
    });

    // HTTP Cookie도 설정하여 쿠키 기반 공유 지원
    response.cookies.set("baron_auth_token", token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false, // 도면 프로그램 등 클라이언트 스크립트에서도 접근 허용
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("[Auth Login Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/auth/verify?token=...
 * Header: Authorization: Bearer <token>
 */
export async function VERIFY(request: NextRequest) {
  try {
    const url = new URL(request.url);
    let token = url.searchParams.get("token");

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      token = request.cookies.get("baron_auth_token")?.value || null;
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: "인증 토큰이 없습니다." },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "유효하지 않거나 만료된 토큰입니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      user: {
        id: decoded.id,
        name: decoded.name,
        role: decoded.role,
        email: decoded.email,
        phone: decoded.phone,
      },
    });
  } catch (error: any) {
    console.error("[Auth Verify Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
