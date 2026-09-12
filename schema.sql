-- ==========================================================
-- BARON ONLINE (바론 INT) - Turso / SQLite Database Schema
-- ==========================================================

-- 1. 업무 게시판 & 칸반 작업 테이블 (work_items)
CREATE TABLE IF NOT EXISTS work_items (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'work',
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,                     -- 의뢰 업체명 (예: (주)디자인에이치)
    region TEXT DEFAULT '반포',                     -- 시공/현장 지역 (예: 반포, 일산, 서초 등)
    card_type TEXT NOT NULL DEFAULT '도면',         -- 도면, 자재리스트, 견적, 기타
    deadline_type TEXT NOT NULL DEFAULT '시공일',   -- 시공일, 배송일, 요청일
    delivery_date TEXT NOT NULL,                   -- 시공/배송/요청 마감 예정일 (YYYY-MM-DD)
    category TEXT NOT NULL,                        -- 제작, 실측, 시공, 설계, 납품, 기타
    assignee TEXT NOT NULL,                        -- 담당자
    priority TEXT NOT NULL DEFAULT '보통',          -- 긴급, 높음, 보통, 낮음
    status TEXT NOT NULL DEFAULT '대기',           -- 대기(To-Do) -> 오피스 -> 공장 -> 준비완료
    progress INTEGER NOT NULL DEFAULT 0,           -- 진척률 0 ~ 100
    start_date TEXT NOT NULL,                      -- 시작일 (YYYY-MM-DD)
    due_date TEXT NOT NULL,                        -- 마감일 (YYYY-MM-DD)
    notes TEXT,                                    -- 요약 비고
    description TEXT,                              -- 게시판 형식의 상세 작업 지시 및 사양 본문
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1-1. 업무 및 일정 댓글 테이블 (work_item_comments)
CREATE TABLE IF NOT EXISTS work_item_comments (
    id TEXT PRIMARY KEY,
    work_item_id TEXT NOT NULL,                    -- 연관 work_items ID
    author TEXT NOT NULL,                          -- 작성자 (예: 바론 INT 오피스, 김철수 기사)
    content TEXT NOT NULL,                         -- 댓글 본문
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE
);

-- 2. 업무 첨부파일 및 도면 테이블 (attachments)
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    work_item_id TEXT NOT NULL,                    -- 연관 work_items ID
    name TEXT NOT NULL,                            -- 파일명 (예: 주방가구_설계도면.pdf)
    url TEXT NOT NULL,                             -- 파일 스토리지 URL 또는 Base64
    file_type TEXT NOT NULL DEFAULT 'file',        -- pdf, image, file
    size TEXT,                                     -- 파일 크기 (예: 3.8 MB)
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE
);

-- 3. A/S 관리 접수 테이블 (as_items)
CREATE TABLE IF NOT EXISTS as_items (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'as',
    client_name TEXT NOT NULL,                     -- 고객사/업체명
    construct_date TEXT NOT NULL,                  -- 원 시공일
    site_address TEXT NOT NULL,                    -- 현장 주소
    reason TEXT NOT NULL,                          -- 하자 및 A/S 사유
    result_status TEXT NOT NULL DEFAULT '접수',    -- 접수 -> 처리중 -> 완료
    resolution_details TEXT,                       -- 조치 내용 및 처리 결과
    technician TEXT,                               -- 담당 출동 기사
    contact_phone TEXT,                            -- 현장 연락처
    priority TEXT NOT NULL DEFAULT '보통',          -- 긴급, 높음, 보통, 낮음
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. 갤러리 폴더 구조 테이블 (gallery_folders)
CREATE TABLE IF NOT EXISTS gallery_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                            -- 폴더명
    description TEXT,                              -- 폴더 설명
    item_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. 갤러리 시공 사진 테이블 (gallery_images)
CREATE TABLE IF NOT EXISTS gallery_images (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL,                       -- 연관 gallery_folders ID
    title TEXT NOT NULL,                           -- 사진 제목
    url TEXT NOT NULL,                             -- 고화질 이미지 URL
    site_name TEXT,                                -- 현장명
    tags TEXT,                                     -- 태그 목록 (JSON 배열 또는 콤마 구분)
    dimensions TEXT,                               -- 해상도 (예: 2400 x 1800)
    size TEXT,                                     -- 용량 (예: 2.8 MB)
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES gallery_folders(id) ON DELETE CASCADE
);

-- 6. 합판 및 가구 원자재 샘플 테이블 (materials)
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,                        -- PET, LPM, HPM, 원목/무늬목, 세라믹, 엣지밴딩
    code TEXT NOT NULL UNIQUE,                     -- 자재 고유 코드 (예: PET-MW01)
    thickness TEXT NOT NULL,                       -- 두께 (18T, 15T 등)
    finish TEXT NOT NULL,                          -- 표면 마감 (Matt, Emboss 등)
    manufacturer TEXT NOT NULL,                    -- 제조/공급사 (현대 L&C, 한솔, 동화 등)
    color_hex TEXT NOT NULL,                       -- 대표 색상 코드
    texture_type TEXT,                             -- 질감 설명
    description TEXT,
    in_stock INTEGER NOT NULL DEFAULT 1            -- 재고 유무 (1: 보유, 0: 발주필요)
);

-- 7. 바론 온라인 ↔ 바론 웹 연동 도면 작업 요청 브릿지 테이블 (drawing_requests)
CREATE TABLE IF NOT EXISTS drawing_requests (
    id TEXT PRIMARY KEY,                           -- 요청 고유 ID (예: req_1726100000)
    work_item_id TEXT NOT NULL,                    -- 연관 work_items ID
    client_name TEXT NOT NULL,                     -- 발주/의뢰 업체명
    site_address TEXT,                             -- 현장 주소
    delivery_date TEXT,                            -- 시공/마감 예정일 (YYYY-MM-DD)
    contact_name TEXT,                             -- 현장 담당자 이름
    contact_phone TEXT,                            -- 현장 담당자 연락처
    title TEXT NOT NULL,                           -- 도면 작업 제목
    description TEXT,                              -- 요청 상세 내용 및 작업 지시 비고
    status TEXT NOT NULL DEFAULT 'pending',        -- 상태: pending(대기/신규), in_progress(도면작업중), review_pending(컨펌대기), confirmed(완료/승인), cancelled(취소)
    
    -- 완료 시 바론웹에서 채워주는 결과 피드백 필드
    blueprint_id INTEGER,                          -- 바론웹 생성 BLUEPRINTS.id
    result_pdf_url TEXT,                           -- 완료된 도면 PDF URL
    result_thumbnail_url TEXT,                     -- 완료된 도면 썸네일 URL
    
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE
);

-- 인덱스 생성 (조회 속도 최적화)
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_delivery_date ON work_items(delivery_date);
CREATE INDEX IF NOT EXISTS idx_attachments_work_id ON attachments(work_item_id);
CREATE INDEX IF NOT EXISTS idx_as_items_status ON as_items(result_status);
CREATE INDEX IF NOT EXISTS idx_gallery_images_folder ON gallery_images(folder_id);
CREATE INDEX IF NOT EXISTS idx_drawing_requests_status ON drawing_requests(status);
CREATE INDEX IF NOT EXISTS idx_drawing_requests_work ON drawing_requests(work_item_id);

