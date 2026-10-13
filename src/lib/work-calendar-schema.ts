import { db, executeQuery, executeMutation } from "./db";
let pending: Promise<void> | undefined;
export async function ensureWorkCalendarSchema() {
  if (!db) return;
  if (!pending) pending = (async () => {
    const result = await executeQuery("PRAGMA table_info(bo_work_items)");
    if (!result.success) throw new Error("달력 표시 저장 구조를 확인하지 못했습니다.");
    if (!result.rows.some(row => row.name === "calendar_visible")) {
      try { await executeMutation("ALTER TABLE bo_work_items ADD COLUMN calendar_visible INTEGER"); }
      catch (error) { const retry = await executeQuery("PRAGMA table_info(bo_work_items)"); if (!retry.success || !retry.rows.some(row => row.name === "calendar_visible")) throw error; }
    }
  })().catch(error => { pending = undefined; throw error; });
  await pending;
}
