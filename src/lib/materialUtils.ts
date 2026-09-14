import { WorkItem, MaterialOrderItem } from "@/types";

/**
 * Normalizes material orders from a WorkItem.
 * Uses `materialOrders` if present; otherwise converts legacy `materialOrderNeeded` string into items.
 */
export function getMaterialOrders(item?: Partial<WorkItem> | null): MaterialOrderItem[] {
  if (!item) return [];

  if (item.materialOrders && Array.isArray(item.materialOrders)) {
    return item.materialOrders;
  }

  if (item.materialOrderNeeded && item.materialOrderNeeded.trim().length > 0) {
    const isAllOrdered = item.materialOrderStatus === "발주완료";
    const rawItems = item.materialOrderNeeded.split(/[,,\n]/).map((s) => s.trim()).filter(Boolean);
    return rawItems.map((name, idx) => ({
      id: `legacy-${idx}-${name}`,
      name,
      isOrdered: isAllOrdered,
    }));
  }

  return [];
}

/**
 * Returns summary stats for material orders list.
 */
export function getMaterialSummary(orders: MaterialOrderItem[]) {
  const total = orders.length;
  const completed = orders.filter((o) => o.isOrdered).length;
  const isAllOrdered = total > 0 && completed === total;
  const isAnyOrdered = completed > 0;
  const hasUnordered = total > completed;

  return {
    total,
    completed,
    isAllOrdered,
    isAnyOrdered,
    hasUnordered,
  };
}
