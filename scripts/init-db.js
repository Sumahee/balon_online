/**
 * BARON ONLINE - Turso Database Initialization & Seeding Script
 * 
 * 실행 방법:
 * 1. .env 또는 환경변수에 TURSO_DATABASE_URL 및 TURSO_AUTH_TOKEN 설정
 * 2. node scripts/init-db.js 실행
 */

const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

// Try reading .env.local or .env
function loadEnv() {
  const envPaths = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", ".env"),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          value = value.trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log(`[Init] Loaded environment from: ${envPath}`);
      break;
    }
  }
}

loadEnv();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("==================================================================");
  console.error("❌ 오류: TURSO_DATABASE_URL 또는 TURSO_AUTH_TOKEN이 설정되지 않았습니다.");
  console.error("   .env 파일을 생성하고 Turso 연결 정보를 입력해 주세요.");
  console.error("   자세한 안내는 TURSO_SETUP_GUIDE.md 문서를 참고하세요.");
  console.error("==================================================================");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function init() {
  try {
    console.log("🚀 Turso 클라우드 데이터베이스에 연결 중...");
    console.log(`   URL: ${url}`);

    // Read schema.sql
    const schemaPath = path.join(__dirname, "..", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");

    // Split SQL by semicolons
    const statements = schemaSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📋 테이블 스키마 생성 중 (총 ${statements.length}개 쿼리 실행)...`);
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    console.log("✅ 테이블 스키마 생성 완료!");

    // Seed initial data
    console.log("📦 기초 바론 공정 데이터(Seed Data) 등록 중...");

    // Seed sample work items
    await client.execute({
      sql: `INSERT OR IGNORE INTO work_items 
        (id, type, title, client_name, delivery_date, category, assignee, priority, status, progress, start_date, due_date, notes, description)
        VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "work-1",
        "work",
        "반포 래미안 원베일리 104동 맞춤 주방가구 제작",
        "(주)디자인에이치 인테리어",
        "2026-09-12",
        "제작",
        "김진우 실장",
        "긴급",
        "공장",
        75,
        "2026-09-02",
        "2026-09-12",
        "아일랜드 상판 세라믹 인조대리석 타공 일정 확인 및 댐핑 언더레일 12세트 투입",
        "오피스 도면 작업 완료 후 공장 재단 및 자재 준비 진행 중.",
      ],
    });

    await client.execute({
      sql: `INSERT OR IGNORE INTO work_items 
        (id, type, title, client_name, delivery_date, category, assignee, priority, status, progress, start_date, due_date, notes, description)
        VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "work-2",
        "work",
        "성수동 크리에이티브 오피스 라운지 수납장 실측 및 설계",
        "공간디자인 림",
        "2026-09-15",
        "설계",
        "이민아 팀장",
        "높음",
        "오피스",
        45,
        "2026-09-06",
        "2026-09-18",
        "현장 레이저 레벨 실측 완료, 곡면 벽체 곡률 보정 도면 작성 중",
        "오피스에서 CAD 도면 및 택배 리스트업 작업 중. 완료 시 공장으로 인계 예정.",
      ],
    });

    // Seed sample attachment
    await client.execute({
      sql: `INSERT OR IGNORE INTO attachments 
        (id, work_item_id, name, url, file_type, size)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        "att-1",
        "work-1",
        "반포원베일리_주방가구_상세설계도면.pdf",
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "pdf",
        "3.8 MB",
      ],
    });

    console.log("🎉 Turso 데이터베이스 설정 및 초기 데이터 시딩이 성공적으로 완료되었습니다!");
    console.log("   이제 앱을 재시작하면 Turso 클라우드 데이터와 즉시 연동됩니다.");
  } catch (error) {
    console.error("❌ 초기화 중 오류 발생:", error);
    process.exit(1);
  }
}

init();
