import {
  WorkItem,
  AsItem,
  GalleryFolder,
  GalleryImage,
  MaterialSample,
  OnlinePurchaseItem,
  DashboardMetrics,
} from "@/types";

// 실제 데이터베이스(Turso) 연동 모드: 초기 하드코딩 더미 데이터 완전 제거
export const initialWorkItems: WorkItem[] = [];

export const initialAsItems: AsItem[] = [];

export const initialFolders: GalleryFolder[] = [];

export const initialImages: GalleryImage[] = [];

export const initialMaterials: MaterialSample[] = [];

export const initialPurchaseItems: OnlinePurchaseItem[] = [
  {
    id: "pur-1",
    mallName: "스마트스토어",
    storeName: "포장자재몰",
    itemName: "벤딩끈/pp자동밴드",
    sizeSpec: "15mm*750m/6.6kg",
    color: "옐로우",
    quantity: 5,
    unitPrice: "개당11,400원",
    totalPrice: 57000,
    purchaseDate: "2025-05-01",
    searchKeyword: "pp자동밴드 15mm",
    notes: "중국산",
    photos: ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"],
    createdAt: "2025-05-01",
  },
  {
    id: "pur-2",
    mallName: "스마트스토어",
    storeName: "N테이프",
    itemName: "보호테이프",
    sizeSpec: "40mic/50mm X 100M",
    color: "투명",
    quantity: 48,
    unitPrice: "개당1,200원",
    totalPrice: 57600,
    purchaseDate: "2025-05-01",
    searchKeyword: "보호테이프50mm",
    notes: "박스당16개",
    photos: ["https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&auto=format&fit=crop&q=80"],
    createdAt: "2025-05-01",
  },
  {
    id: "pur-3",
    mallName: "스마트스토어",
    storeName: "구오공식물",
    itemName: "보호테이프",
    sizeSpec: "두께0.04mm X H500mm X150M",
    color: "투명",
    quantity: 12,
    unitPrice: "개당11,000원",
    totalPrice: 132000,
    purchaseDate: "2025-05-01",
    searchKeyword: "보호테이프 H500mm",
    notes: "박스당4개",
    photos: ["https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&auto=format&fit=crop&q=80"],
    createdAt: "2025-05-01",
  },
  {
    id: "pur-4",
    mallName: "스마트스토어",
    storeName: "장갑나라",
    itemName: "반코팅장갑",
    sizeSpec: "프리사이즈/메가그립 반코팅",
    color: "백색",
    quantity: 300,
    unitPrice: "개당159원",
    totalPrice: 47700,
    purchaseDate: "2025-05-01",
    searchKeyword: "반코팅장갑",
    notes: "100개/베트남",
    photos: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80"],
    createdAt: "2025-05-01",
  },
];

export function getDashboardMetrics(workItems: WorkItem[], asItems: AsItem[]): DashboardMetrics {
  const totalProjects = workItems.length;
  const inProgressTasks = workItems.filter(
    (w) => w.status === "오피스" || w.status === "공장"
  ).length;
  const urgentAsCount = asItems.filter(
    (a) => a.priority === "긴급" && a.resultStatus !== "완료"
  ).length;
  const completedCount = workItems.filter(
    (w) => w.status === "준비완료" || w.status === "시공완료"
  ).length;
  const completionRate =
    totalProjects > 0 ? Math.round((completedCount / totalProjects) * 100) : 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = workItems.filter(
    (w) => (w.startDate || "") <= todayStr && (w.dueDate || w.deliveryDate || "") >= todayStr
  );

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
      ready: workItems.filter((w) => w.status === "준비완료" || w.status === "시공완료"),
    },
  };
}
