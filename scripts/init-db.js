/**
 * BARON ONLINE - Turso Database Initialization Script
 * 
 * 주의: 기존 baron_web 테이블(clients, blueprints, plywoods 등)은 건드리지 않으며,
 * 바론 온라인 전용 테이블(bo_work_items, bo_as_items 등)만 독립적으로 생성합니다.
 */

const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

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
  console.error("❌ 오류: TURSO_DATABASE_URL 또는 TURSO_AUTH_TOKEN이 설정되지 않았습니다.");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function init() {
  try {
    console.log("🚀 Turso 클라우드 데이터베이스 연결 확인 중...");
    console.log(`   URL: ${url}`);

    // Check existing tables before migration
    const beforeRes = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    console.log("📌 기존 Turso DB 테이블 목록:");
    beforeRes.rows.forEach((r) => console.log(`   - ${r.name}`));

    // Verify existing clients table is accessible (Read-only check)
    const clientCount = await client.execute("SELECT count(*) as cnt FROM clients;");
    console.log(`✅ 기존 clients 테이블 조회 성공 (총 ${clientCount.rows[0].cnt}개 고객사 확인, Read-Only 유지)`);

    // Read and execute schema.sql (only creates bo_ prefixed tables & drawing_requests)
    const schemaPath = path.join(__dirname, "..", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");

    // Strip comments and split by semicolons
    const cleanSql = schemaSql
      .split("\n")
      .map((line) => line.replace(/--.*$/, "").trim())
      .join("\n");

    const statements = cleanSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`📋 바론 온라인 전용 독립 테이블 스키마 생성 중 (총 ${statements.length}개 쿼리 실행)...`);
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    console.log("✅ 바론 온라인 전용 테이블 생성 완료!");

    // List updated tables
    const afterRes = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    console.log("🎉 현재 전체 Turso DB 테이블 현황:");
    afterRes.rows.forEach((r) => {
      const isNew = r.name.startsWith("bo_") || r.name === "drawing_requests";
      console.log(`   ${isNew ? "✨ [신규/바론온라인]" : "🔒 [기존/읽기전용]"} ${r.name}`);
    });

  } catch (error) {
    console.error("❌ DB 초기화 중 오류 발생:", error);
    process.exit(1);
  }
}

init();
