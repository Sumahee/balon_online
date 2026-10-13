import type { WorkItem } from "@/types";
export function isCalendarVisible(item: Pick<WorkItem, "cardType" | "calendarVisible">) {
  return item.calendarVisible ?? item.cardType === "도면";
}
