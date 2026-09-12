# 🚀 바론 온라인 - Turso (SQLite) 데이터베이스 실제 연결 및 세팅 가이드

본 가이드는 바론 온라인(Baron Online)의 공정 데이터, 칸반 작업, A/S 접수, 도면 첨부파일 메타데이터를 클라우드 분산 엣지 DB인 **Turso(SQLite 호환)**에 실제로 연결하는 절차를 설명합니다.

---

## 1. Turso DB 계정 생성 및 DB 발급 (무료, 1분 소요)

### 방법 A: 웹 브라우저 콘솔에서 생성 (가장 간편한 방법)
1. [Turso 공식 웹사이트 (https://turso.tech)](https://turso.tech) 에 접속하여 GitHub 또는 Google 계정으로 로그인합니다.
2. 대시보드에서 **`Create Database`** 버튼을 클릭합니다.
3. 데이터베이스 이름 입력:
   - 예: `baron-online-db`
   - 위치(Location): `Seoul, South Korea (icn)` 또는 가장 가까운 리전 선택
4. 생성 완료 후 화면에 표시되는 **Database URL**과 **Auth Token**을 복사합니다:
   - `Database URL`: `libsql://baron-online-db-xxxx.turso.io`
   - `Auth Token`: 긴 영문+숫자 인증 토큰

---

### 방법 B: CLI 명령어로 생성 (터미널 선호 시)
```bash
# 1. Turso CLI 설치
curl -sSfL https://get.tur.so/install.sh | bash

# 2. 로그인
turso auth login

# 3. 데이터베이스 생성 (서울 리전 icn)
turso db create baron-online-db --location icn

# 4. DB URL 확인
turso db show baron-online-db --url

# 5. 토큰 발급
turso db tokens create baron-online-db
```

---

## 2. 프로젝트 로컬 환경 변수 설정

1. 프로젝트 루트 폴더에 있는 `.env.example` 파일을 복사하여 `.env.local` 파일을 생성합니다.
2. 발급받은 URL과 토큰을 아래와 같이 붙여넣습니다:

```env
# .env.local
TURSO_DATABASE_URL="libsql://baron-online-db-xxxx.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQ..."
```

---

## 3. 데이터베이스 테이블 스키마 생성 및 초기 데이터 주입

프로젝트에 준비된 자동 마이그레이션 스크립트를 실행합니다:

```bash
node scripts/init-db.js
```

### 정상 실행 시 출력 예시:
```
[Init] Loaded environment from: G:\balon_online\.env.local
🚀 Turso 클라우드 데이터베이스에 연결 중...
   URL: libsql://baron-online-db-xxxx.turso.io
📋 테이블 스키마 생성 중 (총 11개 쿼리 실행)...
✅ 테이블 스키마 생성 완료!
📦 기초 바론 공정 데이터(Seed Data) 등록 중...
🎉 Turso 데이터베이스 설정 및 초기 데이터 시딩이 성공적으로 완료되었습니다!
```

---

## 4. Vercel 배포 시 환경 변수 등록

Vercel에 배포할 때도 대시보드에서 동일하게 환경 변수를 등록해 주시면 서버리스 API가 클라우드 Turso DB와 자동 연결됩니다:

1. [Vercel 대시보드](https://vercel.com) → 해당 프로젝트 선택
2. **Settings** → **Environment Variables** 메뉴 이동
3. 다음 2개의 변수를 추가:
   - Key: `TURSO_DATABASE_URL` / Value: `libsql://baron-online-db-xxxx.turso.io`
   - Key: `TURSO_AUTH_TOKEN` / Value: `[발급받은 토큰]`
4. 저장 후 **Redeploy**하면 배포 환경에서도 엣지 속도로 Turso DB가 영구 동작합니다!

---

## 5. 생성되는 테이블 구조 요약 ([schema.sql](file:///g:/balon_online/schema.sql))

| 테이블명 | 용도 | 주요 컬럼 |
| :--- | :--- | :--- |
| `work_items` | 공정 관리 & 칸반 카드 | `id`, `title`, `client_name`, `delivery_date`, `status`(대기/오피스/공장/준비완료), `description` 등 |
| `attachments` | 도면 PDF 및 첨부파일 | `id`, `work_item_id`, `name`, `url`, `file_type`, `size` |
| `as_items` | 현장 A/S 접수 및 조치 | `id`, `client_name`, `construct_date`, `site_address`, `reason`, `result_status` 등 |
| `gallery_folders` | 갤러리 폴더 계층 | `id`, `name`, `description`, `item_count` |
| `gallery_images` | 시공 사진 아카이브 | `id`, `folder_id`, `title`, `url`, `site_name`, `tags` |
| `materials` | 원자재 샘플 라이브러리 | `id`, `name`, `category`, `code`, `thickness`, `finish`, `in_stock` |
