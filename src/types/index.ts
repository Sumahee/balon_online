export type Priority = '긴급' | '높음' | '보통' | '낮음';
export type WorkStatus = '대기' | '오피스' | '공장' | '준비완료';
export type AsStatus = '접수' | '처리중' | '완료';
export type CardType = '도면' | '자재리스트' | '견적' | '기타';
export type DeadlineType = '시공일' | '배송일' | '요청일';

export interface AttachmentItem {
  id: string;
  name: string;
  url: string;
  fileType: 'pdf' | 'image' | 'file';
  size: string;
  uploadedAt: string;
}

export interface WorkItem {
  id: string;
  type: 'work';
  title: string;
  clientName: string; // 업체명 (예: (주)디자인에이치, 공간디자인 림)
  cardType: CardType; // 도면 / 자재리스트 / 견적 / 기타
  deadlineType: DeadlineType; // 시공일 / 배송일 / 요청일
  deliveryDate: string; // 시공/배송/요청 마감기한 (YYYY-MM-DD)
  category: '제작' | '실측' | '시공' | '설계' | '납품' | '기타';
  assignee: string;
  priority: Priority;
  status: WorkStatus; // 대기(to do) -> 오피스(도면/택배) -> 공장(자재 준비) -> 준비완료
  progress: number; // 0 to 100
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  notes?: string;
  description?: string; // 게시판 본문 형태의 상세 작업 지시 및 사양
  attachments: AttachmentItem[]; // 도면 PDF, 자재 리스트, 현장 사진 등
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
