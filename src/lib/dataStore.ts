import {
  WorkItem,
  AsItem,
  GalleryFolder,
  GalleryImage,
  MaterialSample,
  DashboardMetrics,
} from "@/types";

export const initialWorkItems: WorkItem[] = [
  {
    id: "work-1",
    type: "work",
    title: "반포 래미안 원베일리 104동 맞춤 주방가구 제작",
    clientName: "(주)디자인에이치 인테리어",
    cardType: "도면",
    deadlineType: "시공일",
    deliveryDate: "2026-09-12", // 2 days away -> Urgent deadline!
    category: "제작",
    assignee: "김진우 실장",
    priority: "긴급",
    status: "공장", // 공장에서 자재 준비 중
    progress: 75,
    startDate: "2026-09-02",
    dueDate: "2026-09-12",
    notes: "아일랜드 상판 세라믹 인조대리석 타공 일정 확인 및 댐핑 언더레일 12세트 투입",
    description: `[현장 시공 개요]
- 현장: 서울시 서초구 반포 래미안 원베일리 104동 1201호
- 주문 업체: (주)디자인에이치 인테리어 (현장소장: 이민혁 팀장)
- 주요 공정: 3200mm 아일랜드 싱크대 및 PET 슈퍼매트 화이트 키큰장 제작

[자재 및 하드웨어 준비 사항]
1. 몸통: 18T E0 등급 친환경 방습 PB 화이트
2. 도어: 18T 슈퍼매트 솔리드 웜화이트 (PET-MW01)
3. 레일: 오스트리아 블룸(Blum) 언더레일 댐핑형 450mm 12세트 전량 투입
4. 아일랜드 상판: 이태리 포세린 12T 세라믹 타공 및 하부 보강 완료

[오피스 인계 사항]
- CAD 상세 단면도 및 재단 리스트업 완료하여 공장 반장님께 인계함.
- 싱크볼 및 인덕션 실물 치수 감리 완료.`,
    attachments: [
      {
        id: "att-1",
        name: "반포원베일리_주방가구_상세설계도면_v2.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf",
        size: "3.8 MB",
        uploadedAt: "2026-09-06",
      },
      {
        id: "att-2",
        name: "자재재단_절단치수표_공장발주서.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf",
        size: "1.2 MB",
        uploadedAt: "2026-09-07",
      },
      {
        id: "att-3",
        name: "현장_레이저실측_벽체사진.jpg",
        url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=80",
        fileType: "image",
        size: "2.5 MB",
        uploadedAt: "2026-09-03",
      },
    ],
    createdAt: "2026-09-01T09:00:00Z",
  },
  {
    id: "work-2",
    type: "work",
    title: "성수동 크리에이티브 오피스 라운지 수납장 실측 및 설계",
    clientName: "공간디자인 림",
    cardType: "자재리스트",
    deadlineType: "배송일",
    deliveryDate: "2026-09-15",
    category: "설계",
    assignee: "이민아 팀장",
    priority: "높음",
    status: "오피스", // 오피스에서 도면작업 및 택배 리스트업 중
    progress: 45,
    startDate: "2026-09-06",
    dueDate: "2026-09-18",
    notes: "현장 레이저 레벨 실측 완료, 곡면 벽체 곡률 보정 도면 작성 중",
    description: `[오피스 설계 및 자재 리스트업 현황]
- 고객사: 공간디자인 림 (성수동 공유오피스 라운지 인테리어)
- 곡면 벽체 R값 실측치 반영하여 벤딩 합판 및 특수 힌지 발주 필요
- 택배 리스트업 품목: 독일 헤펠레 터치 래치 16개, LED T5 3000K 바 8세트 택배 수령 대기 중
- 도면 승인 완료되는 즉시 공장 재단 쏘 팀으로 DXF 도면 파일 넘길 예정`,
    attachments: [
      {
        id: "att-4",
        name: "성수동오피스_라운지수납장_평면입면도.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf",
        size: "4.5 MB",
        uploadedAt: "2026-09-08",
      },
      {
        id: "att-5",
        name: "택배발송_하드웨어부속목록.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf",
        size: "820 KB",
        uploadedAt: "2026-09-09",
      },
    ],
    createdAt: "2026-09-05T14:30:00Z",
  },
  {
    id: "work-3",
    type: "work",
    title: "한남동 고급 빌라 마스터룸 붙박이장/드레스룸 현장 시공",
    clientName: "바른건축디자인",
    cardType: "도면",
    deadlineType: "시공일",
    deliveryDate: "2026-09-13", // 3 days away -> Urgent deadline!
    category: "시공",
    assignee: "박성훈 반장",
    priority: "긴급",
    status: "대기", // 발주 접수 및 To-Do 대기
    progress: 10,
    startDate: "2026-09-10",
    dueDate: "2026-09-13",
    notes: "PET 무광 매트 화이트 도어 + 알루미늄 프레임 조명 매립형 선반 시공",
    description: `[작업 의뢰 사항]
- 한남동 유엔빌리지 빌라 3층 마스터룸
- 천장고 2,650mm 초고장 붙박이장으로 상부 서라운딩 최소화(20mm) 시공 요망
- 오피스에서 1차 실측데이터 검토 후 도면화 착수 예정`,
    attachments: [
      {
        id: "att-6",
        name: "한남동_현장실측_스케치.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf",
        size: "2.1 MB",
        uploadedAt: "2026-09-09",
      },
    ],
    createdAt: "2026-09-07T11:00:00Z",
  },
  {
    id: "work-4",
    type: "work",
    title: "판교 테크노밸리 디자인 스튜디오 서랍장 및 회의테이블 납품",
    clientName: "아틀리에 수",
    cardType: "견적",
    deadlineType: "배송일",
    deliveryDate: "2026-09-08",
    category: "납품",
    assignee: "최영호 대리",
    priority: "보통",
    status: "준비완료", // 공장 자재 및 완제품 준비 완료!
    progress: 100,
    startDate: "2026-08-25",
    dueDate: "2026-09-08",
    notes: "3단 볼레일 8세트 서랍장 검수 통과 및 현장 인도 서명 완료",
    description: `[출고 및 준비 완료 보고]
- 공장 조립 및 보양 포장 완료
- 화물 배송 차량 배차 완료 (9/8 오전 9시 도착 납품)`,
    attachments: [
      {
        id: "att-7",
        name: "출고검수_납품확인서.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf",
        size: "650 KB",
        uploadedAt: "2026-09-07",
      },
    ],
    createdAt: "2026-08-24T16:00:00Z",
  },
  {
    id: "work-5",
    type: "work",
    title: "용산 한남 더힐 복층 펜트하우스 신발장 및 현관 벤치 제작",
    clientName: "(주)이안인테리어",
    cardType: "자재리스트",
    deadlineType: "시공일",
    deliveryDate: "2026-09-22",
    category: "제작",
    assignee: "김진우 실장",
    priority: "보통",
    status: "공장", // 공장 자재 준비
    progress: 60,
    startDate: "2026-09-04",
    dueDate: "2026-09-25",
    notes: "천연 무늬목 오크 마감재 오일 스테인 건조 중",
    description: `[공장 진행 현황]
- 오피스에서 넘겨받은 자재 리스트대로 19T 천연 오크 무늬목 보드 재단 완료
- 도장 부스에서 친환경 오일스테인 2차 도포 후 자연 건조 중`,
    attachments: [
      {
        id: "att-8",
        name: "한남더힐_현관벤치_제작도면.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf",
        size: "3.1 MB",
        uploadedAt: "2026-09-04",
      },
    ],
    createdAt: "2026-09-03T10:20:00Z",
  },
  {
    id: "work-6",
    type: "work",
    title: "분당 정자동 파크뷰 거실 월플렉스 실측 미팅",
    clientName: "스튜디오 모던",
    cardType: "기타",
    deadlineType: "요청일",
    deliveryDate: "2026-09-16",
    category: "실측",
    assignee: "정우석 주임",
    priority: "보통",
    status: "오피스", // 오피스 단계
    progress: 30,
    startDate: "2026-09-10",
    dueDate: "2026-09-16",
    notes: "인테리어 디자이너 현장 감리 일정과 동시 미팅 예정",
    description: `[오피스 미팅 사전 준비]
- 75인치 TV 매립 규격 및 사운드바 오픈장 치수 사전 취합
- 도면 초안 작성 중`,
    attachments: [],
    createdAt: "2026-09-09T17:00:00Z",
  },
];

export const initialAsItems: AsItem[] = [
  {
    id: "as-1",
    type: "as",
    clientName: "(주)디자인에이치 인테리어",
    constructDate: "2026-08-14",
    siteAddress: "서울특별시 서초구 신반포로 15길 22, 102동 1403호",
    reason: "주방 아일랜드 서랍 2단 언더레일 댐핑 복귀 속도 지연 및 우측 쏠림 현상",
    resultStatus: "접수",
    resolutionDetails: "현장 방문 예약 완료 (9/12 오후 2시). 부속 레일 1세트 지참 방문 예정.",
    technician: "박성훈 반장",
    contactPhone: "010-4829-1920",
    priority: "긴급",
    createdAt: "2026-09-08T15:20:00Z",
  },
  {
    id: "as-2",
    type: "as",
    clientName: "공간디자인 림",
    constructDate: "2026-07-28",
    siteAddress: "경기도 성남시 분당구 판교역로 146번길 20",
    reason: "복도 수납장 힌지(경첩) 1개 유격으로 도어 닫힘 불균형",
    resultStatus: "처리중",
    resolutionDetails: "블룸 댐핑 힌지 교체 부속 발주 완료 및 기사 배정 진행 중",
    technician: "최영호 대리",
    contactPhone: "010-9281-3342",
    priority: "높음",
    createdAt: "2026-09-06T10:15:00Z",
  },
  {
    id: "as-3",
    type: "as",
    clientName: "바른건축디자인",
    constructDate: "2026-08-01",
    siteAddress: "서울특별시 강남구 압구정로 151, 8동 502호",
    reason: "신발장 하부 간접조명 T5 배선 헐거움 및 점등 불량",
    resultStatus: "완료",
    resolutionDetails: "2026-09-05 기사 방문하여 안정기 및 컨넥터 재결선 완료, 점등 정상 확인",
    technician: "김진우 실장",
    contactPhone: "010-3341-8977",
    priority: "보통",
    createdAt: "2026-09-03T11:40:00Z",
  },
  {
    id: "as-4",
    type: "as",
    clientName: "아틀리에 수",
    constructDate: "2026-08-19",
    siteAddress: "인천광역시 연수구 송도과학로 32",
    reason: "붙박이장 측판 엣지 마감 일부 들뜸",
    resultStatus: "완료",
    resolutionDetails: "현장 핫멜트 엣지 재압착 및 솔벤트 클리닝 작업 완료",
    technician: "박성훈 반장",
    contactPhone: "010-7762-1190",
    priority: "낮음",
    createdAt: "2026-08-29T14:10:00Z",
  },
];

export const initialFolders: GalleryFolder[] = [
  {
    id: "folder-all",
    name: "전체 이미지",
    description: "모든 현장 시공 및 자재 사진 아카이브",
    itemCount: 8,
    createdAt: "2026-01-01",
  },
  {
    id: "folder-1",
    name: "2026 주방가구 시공 현장",
    description: "아일랜드, 싱크대, 키큰장 시공 완료 사례",
    itemCount: 3,
    createdAt: "2026-08-10",
  },
  {
    id: "folder-2",
    name: "맞춤 수납장 & 드레스룸",
    description: "붙박이장, 시스템장, 월플렉스",
    itemCount: 3,
    createdAt: "2026-08-20",
  },
  {
    id: "folder-3",
    name: "서랍장 & 가구 디테일",
    description: "레일, 힌지, 핑거조인트, 엣지 마감 디테일 컷",
    itemCount: 2,
    createdAt: "2026-09-01",
  },
];

export const initialImages: GalleryImage[] = [
  {
    id: "img-1",
    folderId: "folder-1",
    title: "반포 래미안 원베일리 주방 아일랜드",
    url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80",
    siteName: "서초구 반포 래미안 원베일리",
    tags: ["주방가구", "아일랜드", "세라믹상판", "PET도어"],
    dimensions: "3200 x 2100",
    size: "3.4 MB",
    createdAt: "2026-09-05",
  },
  {
    id: "img-2",
    folderId: "folder-1",
    title: "성수동 하이엔드 오피스 티테이블 & 팬트리",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    siteName: "성수동 크리에이티브 허브",
    tags: ["팬트리장", "매립조명", "블랙스틸"],
    dimensions: "2400 x 1800",
    size: "2.8 MB",
    createdAt: "2026-09-02",
  },
  {
    id: "img-3",
    folderId: "folder-1",
    title: "모던 다크 그레이 빌트인 키큰장",
    url: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80",
    siteName: "한남동 더힐 복층 펜트하우스",
    tags: ["키큰장", "빌트인가전", "그레이매트"],
    dimensions: "3000 x 2400",
    size: "4.1 MB",
    createdAt: "2026-08-28",
  },
  {
    id: "img-4",
    folderId: "folder-2",
    title: "한남동 마스터베드룸 유리 슬라이딩 드레스룸",
    url: "https://images.unsplash.com/photo-1558997519-83ea9252def8?auto=format&fit=crop&w=1200&q=80",
    siteName: "한남동 고급 빌라",
    tags: ["드레스룸", "알루미늄프레임", "브론즈유리"],
    dimensions: "2800 x 2200",
    size: "3.9 MB",
    createdAt: "2026-08-25",
  },
  {
    id: "img-5",
    folderId: "folder-2",
    title: "거실 오픈형 월플렉스 라이브러리",
    url: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=80",
    siteName: "분당 정자동 파크뷰",
    tags: ["월플렉스", "오크원목", "수납장"],
    dimensions: "4000 x 2600",
    size: "4.5 MB",
    createdAt: "2026-08-22",
  },
  {
    id: "img-6",
    folderId: "folder-2",
    title: "현관 벤치형 수납장 & 간접조명",
    url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    siteName: "송도 센트럴파크 푸르지오",
    tags: ["신발장", "현관수납", "벤치"],
    dimensions: "2200 x 1600",
    size: "2.5 MB",
    createdAt: "2026-08-18",
  },
  {
    id: "img-7",
    folderId: "folder-3",
    title: "언더레일 소프트클로징 서랍 내부 결합 디테일",
    url: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=80",
    siteName: "바론 공장 샘플룸",
    tags: ["서랍장", "언더레일", "하드웨어", "디테일"],
    dimensions: "1920 x 1080",
    size: "1.8 MB",
    createdAt: "2026-09-01",
  },
  {
    id: "img-8",
    folderId: "folder-3",
    title: "맞춤 핑거조인트 원목 트레이 수납함",
    url: "https://images.unsplash.com/photo-1540518614846-7ede433c4ef2?auto=format&fit=crop&w=1200&q=80",
    siteName: "바론 커스텀 공방",
    tags: ["원목트레이", "수납함", "정밀가공"],
    dimensions: "2000 x 1400",
    size: "2.2 MB",
    createdAt: "2026-08-30",
  },
];

export const initialMaterials: MaterialSample[] = [
  {
    id: "mat-1",
    name: "슈퍼매트 솔리드 웜화이트 (PET)",
    category: "PET",
    code: "PET-MW01",
    thickness: "18T / 15T",
    finish: "Super Matt (지문방지)",
    manufacturer: "현대 L&C",
    colorHex: "#F5F4F0",
    textureType: "부드러운 실키 매트",
    description: "친환경 내오염 코팅 적용, 지문이 남지 않는 바론 최고 인기 주방 도어 마감재",
    inStock: true,
  },
  {
    id: "mat-2",
    name: "다크 차콜 샌드 매트 (PET)",
    category: "PET",
    code: "PET-CH04",
    thickness: "18T",
    finish: "Deep Matt",
    manufacturer: "한솔홈데코",
    colorHex: "#2E3138",
    textureType: "미세 샌드 질감",
    description: "묵직하고 고급스러운 모던 인더스트리얼 다이닝 가구 전용 마감재",
    inStock: true,
  },
  {
    id: "mat-3",
    name: "내추럴 스칸디 오크 (LPM)",
    category: "LPM",
    code: "LPM-OK07",
    thickness: "18T / 15T",
    finish: "Woodgrain Emboss",
    manufacturer: "동화기업",
    colorHex: "#C2A379",
    textureType: "천연 오크 나뭇결 동조엠보",
    description: "천연 원목의 질감을 살린 내스크래치성 뛰어난 친환경 E0 등급 보드",
    inStock: true,
  },
  {
    id: "mat-4",
    name: "월넛 리얼 무늬목 (Veneer)",
    category: "원목/무늬목",
    code: "VN-WN02",
    thickness: "19T",
    finish: "Natural Oil Finish",
    manufacturer: "바론 직수입 원목가공",
    colorHex: "#543D2B",
    textureType: "천연 북미산 월넛 무늬목",
    description: "프리미엄 펜트하우스 및 임원실 주문가구 전용 최고급 마감재",
    inStock: true,
  },
  {
    id: "mat-5",
    name: "포세린 스톤 그레이 (HPM)",
    category: "HPM",
    code: "HPM-SG11",
    thickness: "18T",
    finish: "Textured Stone",
    manufacturer: "LX하우시스",
    colorHex: "#7A7B7E",
    textureType: "거친 석재 질감",
    description: "내열성과 내마모성이 뛰어난 아일랜드 상판 및 측판 마감재",
    inStock: false,
  },
  {
    id: "mat-6",
    name: "1mm 일치형 ABS 엣지밴딩",
    category: "엣지밴딩",
    code: "EDG-AB01",
    thickness: "1.0T / 1.2T",
    finish: "Seamless Edge",
    manufacturer: "독일 도웰(Dollken)",
    colorHex: "#D1D5DB",
    textureType: "친환경 방수 핫멜트",
    description: "도어 단면을 빈틈없이 마감하는 고밀도 방수/방습 엣지밴딩재",
    inStock: true,
  },
];

export function getDashboardMetrics(workItems: WorkItem[], asItems: AsItem[]): DashboardMetrics {
  const totalProjects = workItems.length;
  const inProgressTasks = workItems.filter((w) => w.status === "오피스" || w.status === "공장").length;
  const urgentAsCount = asItems.filter((a) => a.priority === "긴급" && a.resultStatus !== "완료").length;
  const completedCount = workItems.filter((w) => w.status === "준비완료").length;
  const completionRate = totalProjects > 0 ? Math.round((completedCount / totalProjects) * 100) : 0;

  const todayStr = "2026-09-10";
  const todayTasks = workItems.filter((w) => w.startDate <= todayStr && w.dueDate >= todayStr);

  return {
    totalProjects,
    inProgressTasks,
    urgentAsCount,
    completionRate,
    todayTasks,
    recentAsList: asItems.slice(0, 4),
    ganttList: workItems,
    kanban: {
      todo: workItems.filter((w) => w.status === "대기"),
      office: workItems.filter((w) => w.status === "오피스"),
      factory: workItems.filter((w) => w.status === "공장"),
      ready: workItems.filter((w) => w.status === "준비완료"),
    },
  };
}
