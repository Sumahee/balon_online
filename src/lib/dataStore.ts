import {
  WorkItem,
  AsItem,
  GalleryFolder,
  GalleryImage,
  MaterialSample,
  DashboardMetrics,
} from "@/types";

// 실제 데이터베이스(Turso) 연동 모드: 초기 하드코딩 더미 데이터 완전 제거
export const initialWorkItems: WorkItem[] = [];

export const initialAsItems: AsItem[] = [];

export const initialFolders: GalleryFolder[] = [];

export const initialImages: GalleryImage[] = [];

export const initialMaterials: MaterialSample[] = [];

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
