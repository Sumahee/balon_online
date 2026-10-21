import { db, executeQuery, executeMutation } from "./db";

let pending: Promise<void> | undefined;
export async function ensureWorkConfirmationSchema() {
  if (!db) return;
  if (!pending) pending = (async () => {
    const result = await executeQuery("PRAGMA table_info(bo_work_items)");
    if (!result.success) throw new Error("업무 저장 구조를 확인하지 못했습니다.");
    for (const column of ["confirmation_pending", "confirmation_completed"]) {
      if (!result.rows.some(row => row.name === column)) {
        try { await executeMutation(`ALTER TABLE bo_work_items ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`); }
        catch (error) {
          const retry = await executeQuery("PRAGMA table_info(bo_work_items)");
          if (!retry.success || !retry.rows.some(row => row.name === column)) throw error;
        }
      }
    }
  })().catch(error => { pending = undefined; throw error; });
  await pending;
}
