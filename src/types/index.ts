export type Priority = '긴급' | '높음' | '보통' | '낮음';
export type WorkStatus = '대기' | '오피스' | '공장' | '준비완료' | '시공완료';
export type AsStatus = '접수' | '처리중' | '완료';
export type CardType = '도면' | '자재리스트' | '견적' | '기타';
export type DeadlineType = '시공일' | '배송일' | '요청일';
export type MaterialOrderStatus = '발주불필요' | '발주필요' | '발주완료';
export type DrawingType = '천정형' | '에보라' | '옴니버스' | '기타';

export interface MaterialOrderItem {
  id: string;
  name: string; // e.g. "18T PET 합판 10장", "강화유리 2장"
  isOrdered: boolean; // true: 발주완료, false: 미발주
}

export interface AttachmentItem {
  id: string;
  name: string;
  url: string;
  fileType: 'pdf' | 'image' | 'file';
  size: string;
  uploadedAt: string;
}

export interface WorkItemComment {
  id: string;
  workItemId: string;
  author: string;
  content: string;
  createdAt: string;
  images?: string[];
  imageUrl?: string;
}

export interface WorkItem {
  id: string;
  type: 'work';
  title: string;
  clientName: string; // 업체명 (예: 홈파베르, (주)디자인에이치)
  siteAddress?: string; // 현장 주소/지역 (예: 서초동 팬트리, 반포동 104동)
  region?: string; // 현장/시공 지역 (예: 반포, 일산, 서초 등)
  drawingType?: DrawingType; // 천정형 | 에보라 | 옴니버스 | 기타
  cardType: CardType; // 도면 / 자재리스트 / 견적 / 기타
  deadlineType: DeadlineType; // 시공일 / 배송일 / 요청일
  deliveryDate: string; // 시공/배송/요청 마감기한 (YYYY-MM-DD)
  siteContactPhone?: string; // 업체로부터 받은 현장 담당자 연락처
  postColor?: string; // 포스트바 컬러 (흑니켈, 실버, 골드, 화이트, 블랙 등)
  boardColor?: string; // 합판 컬러 / 합판 종류
  drawingAssignee?: string; // 도면 담당자 (로그인한 사람 자동 기입)
  category?: '제작' | '실측' | '시공' | '설계' | '납품' | '기타';
  assignee: string;
  priority: Priority;
  status: WorkStatus; // 대기 -> 오피스 -> 공장 -> 준비완료 -> 시공완료
  progress: number; // 0 to 100
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  notes?: string;
  description?: string; // 게시판 본문 형태의 상세 작업 지시 및 사양
  materialOrders?: MaterialOrderItem[]; // 품목별 발주 자재 목록 및 완료 체크
  materialOrderNeeded?: string; // 발주 필요 자재 (기존 호환)
  materialOrderStatus?: MaterialOrderStatus; // 발주불필요 | 발주필요 | 발주완료 (기존 호환)
  attachments: AttachmentItem[]; // 도면 PDF, 자재 리스트, 현장 사진 등
  comments?: WorkItemComment[]; // 현장 및 오피스 소통 댓글 목록
  createdAt: string;
}

export interface AsItem {
  id: string;
  type: 'as';
  clientName: string; // 업체명
  constructDate: string; // 시공일
  siteAddress: string; // 현장주소
  reason: string; // A/S 발생 사유
  resultStatus: AsStatus; // 접수 / 처리중 / 완료
  resolutionDetails?: string; // 처리내용/조치사항
  technician?: string; // 담당 기사
  contactPhone?: string; // 연락처
  priority: Priority;
  createdAt: string;
}

export interface GalleryFolder {
  id: string;
  name: string;
  description?: string;
  itemCount: number;
  createdAt: string;
}

export interface GalleryImage {
  id: string;
  folderId: string;
  title: string;
  url: string;
  siteName?: string;
  tags: string[];
  dimensions?: string;
  size: string;
  createdAt: string;
}

export interface DrawerCutPart {
  name: string;
  spec: string;
  count: number;
  width: number; // mm
  depth: number; // mm
  thickness: number; // mm
  material: string;
  notes: string;
}

export interface DrawerHardware {
  name: string;
  spec: string;
  count: number;
  notes: string;
}

export interface DrawerCalcInput {
  cabinetWidth: number; // 외경 가로 mm
  cabinetHeight: number; // 외경 높이 mm
  cabinetDepth: number; // 외경 깊이 mm
  boardThickness: number; // 판재 두께 (15T or 18T)
  drawerCount: number; // 서랍 단수 (1~4단)
  railType: 'undermount' | 'ball3stage'; // 언더레일(댐핑) or 볼레일
  marginGap: number; // 상하좌우 유격 (기본 3mm)
  hasGrain?: boolean; // 무늬결 유무 (true: 결 있음/방향고정, false: 결 없음/회전가능)
}

export interface PlacedCutPiece {
  name: string;
  width: number; // mm (원래 가로)
  depth: number; // mm (원래 세로)
  x: number; // mm (원장 내부 X 좌표)
  y: number; // mm (원장 내부 Y 좌표)
  pw: number; // mm (톱날 유격 4mm 포함 가로)
  ph: number; // mm (톱날 유격 4mm 포함 세로)
  rotated: boolean; // 90도 회전 여부
}

export interface SheetLayout {
  sheetIndex: number; // 1, 2, ...
  thickness: number;
  materialName: string;
  placedPieces: PlacedCutPiece[];
  stripCount: number; // 1차 띠 재단 톱질 횟수 (Horizontal Rip Cuts)
  crossCutCount: number; // 2차 부재 분할 톱질 횟수 (Vertical Cross Cuts)
  totalSawCuts: number; // 총 톱질 횟수
}

export interface SheetEstimate {
  thickness: number; // e.g. 18, 15, 9
  materialName: string;
  partsCount: number;
  totalPartsArea: number; // m² (부품 합계 면적)
  sheetCount: number; // 필요 4x8 원장 수량 (장)
  totalSheetArea: number; // m² (1220x2440 * sheetCount)
  efficiency: number; // % 수율
  lossPercentage: number; // % 로스율
  hasGrain: boolean; // 결 유무
  sheets: SheetLayout[]; // 각 원장별 2D 부재 배치 정보
  totalSawCuts: number; // 총 톱질 횟수 (톱질 최소화 배치 기준)
}

export interface DrawerCalcResult {
  input: DrawerCalcInput;
  railSpec: {
    name: string;
    length: number; // mm
    type: string;
  };
  boxDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  parts: DrawerCutPart[];
  hardware: DrawerHardware[];
  sheetEstimates: SheetEstimate[];
  totalSheetsAllMaterials: number; // 전체 4x8 원장 총 소요 수량 (장)
  summaryNote: string;
}


export interface MaterialSample {
  id: string;
  name: string;
  category: 'PET' | 'LPM' | 'HPM' | '원목/무늬목' | '세라믹' | '엣지밴딩';
  code: string;
  thickness: string;
  finish: string; // Matt, High-gloss, Woodgrain, Stone
  manufacturer: string; // 한솔, 동화, 현대L&C, LX하우시스 등
  colorHex: string;
  textureType?: string;
  description: string;
  inStock: boolean;
}

export interface ClientInfo {
  id: number | string;
  name: string;
  businessNumber?: string;
  ceoName?: string;
  companyAddress?: string;
  businessType?: string;
  businessItem?: string;
  erpCode?: string;
  billEmail?: string;
  officePhone?: string;
}

export interface UserInfo {
  id: number | string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export type DrawingRequestStatus = 'pending' | 'in_progress' | 'review_pending' | 'confirmed' | 'cancelled';


export interface DrawingRequest {
  id: string;
  workItemId: string;
  drawingType?: DrawingType; // 도면 타입 (천정형 | 에보라 | 옴니버스 | 기타)
  clientName: string; // 업체명
  siteAddress?: string; // 주소
  deliveryDate?: string; // 시공일
  contactName?: string;
  contactPhone?: string; // 현장 담당자 연락처 (업체로부터 받은 연락처)
  postColor?: string; // 포스트바 컬러
  boardColor?: string; // 합판컬러 (합판종류)
  drawingAssignee?: string; // 도면 담당자 (로그인한 사람)
  title: string;
  description?: string;
  status: DrawingRequestStatus;
  blueprintId?: number;
  resultPdfUrl?: string;
  resultThumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalProjects: number;
  inProgressTasks: number;
  urgentAsCount: number;
  completionRate: number;
  todayTasks: WorkItem[];
  recentAsList: AsItem[];
  ganttList: WorkItem[];
  kanban: {
    todo: WorkItem[]; // 대기
    office: WorkItem[]; // 오피스 (도면작업, 택배 리스트업)
    factory: WorkItem[]; // 공장 (자재 준비)
    ready: WorkItem[]; // 준비완료
  };
}

