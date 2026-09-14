-- ==========================================================
-- BARON ONLINE (바론 INT) - Turso / SQLite Database Schema
-- 주의: 기존 baron_web 테이블(clients, blueprints, plywoods 등)은 건드리지 않으며,
-- clients 테이블은 READ-ONLY(조회) 목적으로만 사용합니다.
-- 바론 온라인 전용 데이터는 'bo_' 접두어 테이블에 독립적으로 격리 저장됩니다.
-- ==========================================================

-- 1. 업무 게시판 & 칸반 작업 테이블 (bo_work_items)
CREATE TABLE IF NOT EXISTS bo_work_items (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'work',
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,                     -- 의뢰 업체명 (기존 clients 테이블의 name 참조)
    site_address TEXT,                             -- 현장 주소/지역
    region TEXT DEFAULT '반포',                     -- 시공/현장 지역 (반포, 일산, 서초 등)
    drawing_type TEXT DEFAULT '옴니버스',           -- 천정형, 에보라, 옴니버스, 기타
    card_type TEXT NOT NULL DEFAULT '도면',         -- 도면, 자재리스트, 견적, 기타
    deadline_type TEXT NOT NULL DEFAULT '시공일',   -- 시공일, 배송일, 요청일
    delivery_date TEXT NOT NULL,                   -- 시공/배송/요청 마감 예정일 (YYYY-MM-DD)
    site_contact_phone TEXT,                       -- 현장 담당자 연락처
    post_color TEXT,                               -- 포스트바 색상
    board_color TEXT,                              -- 합판 색상
    drawing_assignee TEXT,                         -- 도면 담당자
    category TEXT NOT NULL DEFAULT '제작',         -- 제작, 실측, 시공, 설계, 납품, 기타
    assignee TEXT NOT NULL,                        -- 담당자
    priority TEXT NOT NULL DEFAULT '보통',          -- 긴급, 높음, 보통, 낮음
    status TEXT NOT NULL DEFAULT '대기',           -- 대기 -> 오피스 -> 공장 -> 준비완료 -> 시공완료
    progress INTEGER NOT NULL DEFAULT 0,           -- 진척률 0 ~ 100
    start_date TEXT NOT NULL,                      -- 시작일 (YYYY-MM-DD)
    due_date TEXT NOT NULL,                        -- 마감일 (YYYY-MM-DD)
    notes TEXT,                                    -- 요약 비고
    description TEXT,                              -- 상세 작업 지시 및 사양 본문
    material_orders TEXT,                          -- 발주 자재 목록 (JSON 문자열)
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1-1. 업무 및 일정 댓글 테이블 (bo_work_item_comments)
CREATE TABLE IF NOT EXISTS bo_work_item_comments (
    id TEXT PRIMARY KEY,
    work_item_id TEXT NOT NULL,                    -- 연관 bo_work_items ID
    author TEXT NOT NULL,                          -- 작성자
    content TEXT NOT NULL,                         -- 댓글 본문
    images TEXT,                                   -- 첨부 사진 URL 목록 (JSON 문자열)
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_item_id) REFERENCES bo_work_items(id) ON DELETE CASCADE
);

-- 2. 업무 첨부파일 및 도면 테이블 (bo_attachments)
CREATE TABLE IF NOT EXISTS bo_attachments (
    id TEXT PRIMARY KEY,
    work_item_id TEXT NOT NULL,                    -- 연관 bo_work_items ID
    name TEXT NOT NULL,                            -- 파일명
    url TEXT NOT NULL,                             -- 파일 스토리지 URL
    file_type TEXT NOT NULL DEFAULT 'file',        -- pdf, image, file
    size TEXT,                                     -- 파일 크기
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_item_id) REFERENCES bo_work_items(id) ON DELETE CASCADE
);

-- 3. A/S 관리 접수 테이블 (bo_as_items)
CREATE TABLE IF NOT EXISTS bo_as_items (
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

-- 4. 갤러리 폴더 구조 테이블 (bo_gallery_folders)
CREATE TABLE IF NOT EXISTS bo_gallery_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                            -- 폴더명
    description TEXT,                              -- 폴더 설명
    item_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. 갤러리 시공 사진 테이블 (bo_gallery_images)
CREATE TABLE IF NOT EXISTS bo_gallery_images (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL,                       -- 연관 bo_gallery_folders ID
    title TEXT NOT NULL,                           -- 사진 제목
    url TEXT NOT NULL,                             -- 고화질 이미지 URL
    site_name TEXT,                                -- 현장명
    tags TEXT,                                     -- 태그 목록 (JSON 배열 또는 콤마 구분)
    dimensions TEXT,                               -- 해상도 (예: 2400 x 1800)
    size TEXT,                                     -- 용량
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES bo_gallery_folders(id) ON DELETE CASCADE
);

-- 6. 합판 및 가구 원자재 샘플 테이블 (bo_materials)
CREATE TABLE IF NOT EXISTS bo_materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,                        -- PET, LPM, HPM, 원목/무늬목, 세라믹, 엣지밴딩
    code TEXT NOT NULL UNIQUE,                     -- 자재 고유 코드
    thickness TEXT NOT NULL,                       -- 두께
    finish TEXT NOT NULL,                          -- 표면 마감
    manufacturer TEXT NOT NULL,                    -- 제조/공급사
    color_hex TEXT NOT NULL,                       -- 대표 색상 코드
    texture_type TEXT,                             -- 질감 설명
    description TEXT,
    in_stock INTEGER NOT NULL DEFAULT 1            -- 재고 유무 (1: 보유, 0: 발주필요)
);

-- 7. 바론 온라인 ↔ 바론 웹 연동 도면 작업 요청 브릿지 테이블 (drawing_requests)
CREATE TABLE IF NOT EXISTS drawing_requests (
    id TEXT PRIMARY KEY,                           -- 요청 고유 ID (req_xxx)
    work_item_id TEXT NOT NULL,                    -- 연관 bo_work_items ID
    client_name TEXT NOT NULL,                     -- 발주/의뢰 업체명
    site_address TEXT,                             -- 현장 주소
    delivery_date TEXT,                            -- 시공/마감 예정일 (YYYY-MM-DD)
    contact_name TEXT,                             -- 현장 담당자 이름
    contact_phone TEXT,                            -- 현장 담당자 연락처
    drawing_type TEXT DEFAULT '옴니버스',           -- 천정형 / 에보라 / 옴니버스
    post_color TEXT,                               -- 포스트바 컬러
    board_color TEXT,                              -- 합판 컬러
    drawing_assignee TEXT,                         -- 도면 담당자
    title TEXT NOT NULL,                           -- 도면 작업 제목
    description TEXT,                              -- 요청 상세 내용 및 작업 지시 비고
    status TEXT NOT NULL DEFAULT 'pending',        -- pending, in_progress, review_pending, confirmed, cancelled
    blueprint_id INTEGER,                          -- 바론웹 생성 blueprints.id
    result_pdf_url TEXT,                           -- 완료된 도면 PDF URL
    result_thumbnail_url TEXT,                     -- 완료된 도면 썸네일 URL
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (조회 속도 최적화)
CREATE INDEX IF NOT EXISTS idx_bo_work_items_status ON bo_work_items(status);
CREATE INDEX IF NOT EXISTS idx_bo_work_items_delivery_date ON bo_work_items(delivery_date);
CREATE INDEX IF NOT EXISTS idx_bo_attachments_work_id ON bo_attachments(work_item_id);
CREATE INDEX IF NOT EXISTS idx_bo_as_items_status ON bo_as_items(result_status);
CREATE INDEX IF NOT EXISTS idx_bo_gallery_images_folder ON bo_gallery_images(folder_id);
CREATE INDEX IF NOT EXISTS idx_drawing_requests_status ON drawing_requests(status);
CREATE INDEX IF NOT EXISTS idx_drawing_requests_work ON drawing_requests(work_item_id);
