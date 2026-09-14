# ⚡ Vercel 배포 최적화: 바론 온라인 API 10개 제한 사전 설계서

Vercel 무료(Hobby) 플랜의 Serverless Function 제한(최대 12개 제한)을 고려하여, **바론 온라인(Balon Online)**의 모든 서버 통신을 **총 8개의 통합 API 엔드포인트**로 기획 및 구조화하였습니다.

---

## 🎯 1. 바론 온라인 8개 통합 API 설계 마스터 플랜

단일 미니 API(Micro-endpoints)를 수십 개 만드는 대신, 도메인 단위로 통합(Consolidated API Pattern)하여 **8개 API만으로 시스템 전체**를 완벽하게 구동합니다.

| 번호 | 엔드포인트 (`API Route`) | 허용 HTTP 메서드 | 수행하는 역할 및 데이터 바인딩 | 연동 DB 테이블 |
| :---: | :--- | :---: | :--- | :--- |
| **1** | `/api/posts` | `GET`, `POST`, `PUT`, `DELETE` | 업무 카드(`work`) 및 A/S 접수건(`as`) 생성/조회/상태 변경/삭제 통합 관리 | `work_items`, `as_items`, `attachments` |
| **2** | `/api/drawing-requests` | `GET`, `POST`, `PATCH` | 바론웹(도면 프로그램)으로 수동 정보 전달 및 완공 도면 컨펌/최종 승인 처리 | `drawing_requests` (전용 브릿지) |
| **3** | `/api/clients` | `GET`, `POST`, `PUT` | **기존 바론웹 고객사 마스터 정보** 조회, 검색 및 신규 업체 등록 | `clients` (공유 마스터) |
| **4** | `/api/users` | `GET`, `POST` | **기존 바론웹 유저 중 바론 본사 담당 직원** 목록 조회 및 권한 체크 | `users` (공유 마스터) |
| **5** | `/api/gallery` | `GET`, `POST`, `DELETE` | 시공 사진 아카이브 갤러리 폴더 생성 및 고화질 이미지 업로드/삭제 | `gallery_folders`, `gallery_images` |
| **6** | `/api/materials` | `GET`, `POST` | PET, LPM, 원목 등 가구 원자재 샘플 라이브러리 및 재고 유무 관리 | `materials` |
| **7** | `/api/dashboard` | `GET` | 메인 대시보드 KPI 카드, 공정 진행률, 간트차트 데이터를 1회 요청으로 통합 리턴 | Read-only Aggregator |
| **8** | `/api/upload` | `POST` | 도면 PDF 파일 및 캡처 이미지 파일 업로드/스토리지 URL 발급 | File Storage Handler |

> **💡 안전 여유분**: Vercel 제한(12개) 대비 **8개만 사용**하므로, 4개의 충분한 여유분(Safety Buffer)이 확보됩니다.

---

## 📂 2. 폴더 구조 및 Vercel 배포 방식 (Baron Web 참조)

`baron_web`은 Vite + Express 서버 구조를 사용하여 루트에 `/api/`가 존재하지만, `balon_online`은 **Next.js 16 App Router** 프레임워크를 사용합니다.

Next.js에서는 `src/app/api/[domain]/route.ts` 구조로 작성할 때 Vercel이 각 폴더를 1개의 Serverless Function으로 자동 번들링합니다:

```
balon_online/
├── src/
│   ├── app/
│   │   ├── api/                      # Vercel Serverless API 라우트 모음
│   │   │   ├── posts/
│   │   │   │   └── route.ts          # [API 1] 업무 & A/S 통합 API
│   │   │   ├── drawing-requests/
│   │   │   │   └── route.ts          # [API 2] 바론웹 도면 요청/컨펌 API
│   │   │   ├── clients/
│   │   │   │   └── route.ts          # [API 3] 공유 고객사 마스터 API
│   │   │   ├── users/
│   │   │   │   └── route.ts          # [API 4] 공유 바론 직원 유저 API
│   │   │   ├── gallery/
│   │   │   │   └── route.ts          # [API 5] 갤러리 폴더/이미지 API
│   │   │   ├── materials/
│   │   │   │   └── route.ts          # [API 6] 자재 라이브러리 API
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts          # [API 7] 통계 & 간트차트 API
│   │   │   └── upload/
│   │   │       └── route.ts          # [API 8] 파일/도면 업로드 API
```

---

## 🛠️ 3. 개별 API 내부 멀티 파라미터 처리 방식 (예시)

단일 엔드포인트에서 여러 액션을 처리하기 위해 Query Parameter 또는 Action Type을 활용합니다.

### 예시: `/api/posts?type=work` 또는 `/api/posts?type=as`
```typescript
// src/app/api/posts/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // 'work' | 'as' | 'all'

  if (type === "work") {
    // work_items 조회
  } else if (type === "as") {
    // as_items 조회
  } else {
    // 전체 통합 조회
  }
}
```

---

## ✅ 요약 및 배포 보장
* **최대 8개 API 라우트**로 고정하여 Vercel 무료 배포 시 **함수 개수 초과 오류(Function Limit Error)가 절대로 발생하지 않도록 설계**되었습니다.
* 기존 `baron_web`과의 DB 공유(`clients`, `users`)도 동일한 규격으로 100% 지원합니다.
