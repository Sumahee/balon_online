import type { WorkItem } from "@/types";
export function isCalendarVisible(item: Pick<WorkItem, "deadlineType" | "deliveryDate" | "dueDate" | "calendarVisible">) {
  const hasDate = !!(item.deliveryDate?.trim() || item.dueDate?.trim());
  return hasDate && (item.calendarVisible ?? item.deadlineType === "시공일");
}
