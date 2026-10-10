import { createClient, Client } from "@libsql/client";

/**
 * Turso (LibSQL) Cloud Database Client
 * 
 * 연결 환경변수:
 * - TURSO_DATABASE_URL (예: libsql://baron-db-yourname.turso.io)
 * - TURSO_AUTH_TOKEN (Turso 관리자 토큰)
 * 
 * 환경변수가 지정되지 않은 경우, 애플리케이션의 중단을 방지하기 위해
 * 안전한 인메모리 / 로컬 Fallback 상태로 동작합니다.
 */

const url =
  process.env.TURSO_DATABASE_URL ||
  process.env.VITE_TURSO_DATABASE_URL ||
  process.env.NEXT_PUBLIC_TURSO_DATABASE_URL;

const authToken =
  process.env.TURSO_AUTH_TOKEN ||
  process.env.VITE_TURSO_AUTH_TOKEN ||
  process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;

let client: Client | null = null;

if (url && authToken) {
  try {
    client = createClient({
      url,
      authToken,
    });
    console.log("[DB] Turso LibSQL Cloud Client connected successfully.");
  } catch (error) {
    console.error("[DB] Failed to initialize Turso client:", error);
  }
} else {
  // 개발 또는 환경변수 설정 전 상태
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[DB Notice] TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not set. Running in Local Mock / Memory mode. See TURSO_SETUP_GUIDE.md for setup."
    );
  }
}

export const db = client;

/**
 * 안전한 쿼리 실행 헬퍼 함수
 */
export async function executeQuery(sql: string, args: any[] = []) {
  if (!db) {
    return {
      success: false,
      isMock: true,
      message: "Turso DB is not connected. Using local storage data.",
      rows: [],
    };
  }

  try {
    const result = await db.execute({ sql, args });
    return {
      success: true,
      isMock: false,
      rows: result.rows,
      columns: result.columns,
    };
  } catch (error: any) {
    console.error("[DB Query Error]:", error);
    return {
      success: false,
      isMock: false,
      error: error.message,
      rows: [],
    };
  }
}

/** 저장 실패가 성공 응답으로 바뀌지 않도록 변경 쿼리에 사용합니다. */
export async function executeMutation(sql: string, args: Parameters<typeof executeQuery>[1] = []) {
  const result = await executeQuery(sql, args);
  if (!result.success) throw new Error(result.error || result.message || "데이터베이스 저장에 실패했습니다.");
  return result;
}
