# 🎨 바론웹(Baron Web) 도면 연동 & 알림 수신 구현 가이드

본 문서는 **바론 온라인(공정 관리 앱)**에서 발주 정보(업체명, 시공일, 요구사항)를 수동으로 전송했을 때, **바론웹(도면 프로그램)**에서 실시간으로 알림을 받아 1-Click으로 도면 작성을 시작하는 연동 코드 가이드입니다.

---

## 🛠️ 1. 데이터베이스 및 쿼리 구조

두 애플리케이션은 동일한 Turso 데이터베이스를 공유하며, 연동 브릿지 테이블인 `drawing_requests`를 사용하여 안전하게 통신합니다.

### Turso DB 접속 정보 (`.env` / `.env.local`)
```env
TURSO_DATABASE_URL="libsql://baronweb-sumahee.aws-ap-northeast-1.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOi..."
```

### 도면 요청 쿼리 (바론웹 수신용)
* **신규 미확인 알림 조회 (Pending List)**:
  ```sql
  SELECT * FROM drawing_requests WHERE status = 'pending' ORDER BY created_at DESC;
  ```

* **도면 작업 시작 처리 (In Progress)**:
  ```sql
  UPDATE drawing_requests SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = 'req_xxx';
  ```

* **도면 작업 완료 및 컨펌 요청 (Review Pending)**:
  ```sql
  UPDATE drawing_requests 
  SET status = 'review_pending', 
      blueprint_id = 123, 
      result_pdf_url = 'https://...', 
      updated_at = CURRENT_TIMESTAMP 
  WHERE id = 'req_xxx';
  ```

---

## 🔔 2. 바론웹(Baron Web) 리액트 알림 컴포넌트 예시 (`DrawingNotificationBell.tsx`)

바론웹 헤더 상단에 붙여 사용할 수 있는 알림 뱃지 컴포넌트 예시 코드입니다:

```tsx
import React, { useState, useEffect } from 'react';
import { Bell, FileText, CheckCircle, ArrowRight } from 'lucide-react';

export function DrawingNotificationBell({ onSelectRequest }: { onSelectRequest: (req: any) => void }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Periodic polling for new drawing requests every 10 seconds
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch('/api/drawing-requests?status=pending');
        const data = await res.json();
        if (data.success) {
          setRequests(data.requests || []);
        }
      } catch (err) {
        console.error('Failed to fetch drawing requests:', err);
      }
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartDrawing = async (req: any) => {
    // 1. Update status to in_progress
    await fetch('/api/drawing-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: req.id, status: 'in_progress' }),
    });

    // 2. Pass requested info to Baron Web editor state (Client, Site, Delivery date, Colors, Contact, etc.)
    onSelectRequest({
      drawingType: req.drawingType, // 도면 타입 (천정형, 에보라, 옴니버스, 기타)
      clientName: req.clientName, // 업체명
      siteAddress: req.siteAddress, // 현장 주소
      deliveryDate: req.deliveryDate, // 시공일
      contactPhone: req.contactPhone, // 업체로부터 받은 현장 담당자 연락처
      postColor: req.postColor, // 포스트바 컬러 (흑니켈, 실버, 골드 등)
      boardColor: req.boardColor, // 합판 컬러 / 합판 종류
      drawingAssignee: req.drawingAssignee, // 도면 담당자 (로그인 유저)
      title: req.title,
      description: req.description,
      requestId: req.id,
    });

    setIsOpen(false);
  };


  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
      >
        <Bell className="w-5 h-5" />
        {requests.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-bounce">
            {requests.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <span>🔔 신규 도면 작업 요청</span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                {requests.length}건
              </span>
            </h4>
          </div>

          {requests.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">대기 중인 신규 도면 요청이 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {requests.map((req) => (
                <div key={req.id} className="p-3 bg-gray-50 hover:bg-indigo-50/50 rounded-lg border border-gray-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>{req.clientName}</span>
                    <span className="text-indigo-600">{req.deliveryDate} 시공</span>
                  </div>
                  <p className="font-semibold text-gray-800 line-clamp-1">{req.title}</p>
                  {req.siteAddress && <p className="text-gray-500 text-[11px]">📍 {req.siteAddress}</p>}
                  
                  <button
                    onClick={() => handleStartDrawing(req)}
                    className="w-full mt-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md flex items-center justify-center gap-1 text-xs transition"
                  >
                    <span>1-Click 도면 작성 시작</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 3. 도면 작성 완료 후 바론 온라인으로 결과 전달

도면 작성이 끝나고 바론웹에서 도면을 저장할 때, `drawing_requests` 테이블의 상태를 `review_pending`으로 업데이트하면 바론 온라인 카드에 **도면 검토/승인 요청** 알림이 나타납니다:

```javascript
// 도면 저장 완료 처리 예시
async function onFinishBlueprintSave(requestId, blueprintId, pdfUrl) {
  await fetch('/api/drawing-requests', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: requestId,
      status: 'review_pending',
      blueprintId: blueprintId,
      resultPdfUrl: pdfUrl,
    }),
  });
  alert('바론 온라인으로 도면 검토 요청(컨펌 대기)이 전송되었습니다!');
}
```

---

## 🎯 전체 워크플로우 요약
1. **[바론 온라인]**: 업무 카드 내 **[🎨 바론웹으로 도면 정보 전송]** 버튼 클릭
2. **[바론웹]**: 🔔 상단 알림 팝업 수신 ➔ 클릭 시 업체명/주소 세팅된 캔버스 열림
3. **[바론웹]**: 도면 작성 완료 후 저장 시 `review_pending` 상태로 전송
4. **[바론 온라인]**: 🔍 **도면 컨펌 대기** 알림 확인 ➔ **[✅ 최종 승인]** 누르면 업무 첨부파일에 완기도면 자동 추가!
