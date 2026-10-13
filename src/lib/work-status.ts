import type { WorkItem, WorkStatus } from "@/types";

export function workStatusLabel(item: Pick<WorkItem, "cardType">, status: WorkStatus) {
  if (item.cardType === "자재리스트") {
    if (status === "시공완료") return "발송 완료";
    if (status === "준비완료") return "출고대기";
  }
  return status;
}
