import type { WorkItem, WorkStatus } from "@/types";
import { bodyText } from "./body-content";
import { isCalendarVisible } from "./calendar-visibility";
import { getMaterialOrders } from "./materialUtils";
import { getProjectLocation } from "./work-title";

export type WorkDraft = Omit<WorkItem, "id" | "createdAt" | "comments">;
export const STATUS_PROGRESS: Record<WorkStatus, number> = { 대기: 0, 오피스: 40, 공장: 75, 준비완료: 90, 시공완료: 100 };

export function createWorkDraft(item: WorkItem | undefined, today: string, user: string, date?: string): WorkDraft {
  return {
    createdBy: item?.createdBy ?? (item ? "" : user),
    installationTeam: item?.installationTeam ?? "", ceilingHeight: item?.ceilingHeight ?? "",
    type: "work", title: item?.title ?? "", clientName: item?.clientName ?? "",
    siteAddress: item?.siteAddress ?? "", region: item?.region ?? "",
    cardType: item?.cardType ?? "도면", category: item?.category ?? "제작",
    drawingType: item?.drawingType ?? "천정형", deadlineType: item?.deadlineType ?? "시공일",
    deliveryDate: item?.deliveryDate || item?.dueDate || date || today,
    dueDate: item?.deliveryDate || item?.dueDate || date || today,
    startDate: item?.startDate || today, assignee: item?.assignee ?? user,
    drawingAssignee: item?.drawingAssignee ?? "",
    siteContactPhone: item?.siteContactPhone ?? "", postColor: item?.postColor ?? "미정",
    boardColor: item?.boardColor ?? "미정", priority: item?.priority ?? "보통",
    status: item?.status ?? "대기", progress: item?.progress ?? 0,
    calendarVisible: item ? isCalendarVisible(item) : true,
    confirmationPending: item?.confirmationPending ?? false,
    description: item?.description || item?.notes || "", notes: item?.notes ?? "",
    attachments: item?.attachments ?? [], materialOrders: item ? getMaterialOrders(item) : [],
  };
}

export function prepareWorkDraft(draft: WorkDraft): WorkDraft {
  if (!draft.clientName.trim()) throw new Error("업체명을 입력해 주세요.");
  if (draft.ceilingHeight && (!Number.isFinite(Number(draft.ceilingHeight)) || Number(draft.ceilingHeight) <= 0)) throw new Error("천정고를 올바른 mm 숫자로 입력해 주세요.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.deliveryDate) || Number.isNaN(Date.parse(draft.deliveryDate)) || new Date(draft.deliveryDate).toISOString().slice(0,10) !== draft.deliveryDate) throw new Error("올바른 예정일을 입력해 주세요.");
  const orders = draft.materialOrders ?? [];
  return { ...draft, title: draft.title.trim() || draft.clientName.trim(), clientName: draft.clientName.trim(),
    assignee: draft.assignee.trim(), drawingAssignee: draft.drawingAssignee?.trim(),
    siteAddress: draft.siteAddress?.trim(), region: draft.region?.trim() || getProjectLocation(draft.siteAddress || ""),
    dueDate: draft.deliveryDate, notes: bodyText(draft.description ?? ""),
    progress: STATUS_PROGRESS[draft.status],
    materialOrderNeeded: orders.map(order => order.name).join(", "),
    materialOrderStatus: !orders.length ? "발주불필요" : orders.every(order => order.isOrdered) ? "발주완료" : "발주필요",
  };
}
