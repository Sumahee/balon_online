import { db, executeQuery, executeMutation } from "./db";

let pending: Promise<void> | undefined;
export async function ensureWorkConfirmationSchema() {
  if (!db) return;
  if (!pending) pending = (async () => {
    const result = await executeQuery("PRAGMA table_info(bo_work_items)");
    if (!result.success) throw new Error("업무 저장 구조를 확인하지 못했습니다.");
    if (!result.rows.some(row => row.name === "confirmation_pending")) {
      try { await executeMutation("ALTER TABLE bo_work_items ADD COLUMN confirmation_pending INTEGER NOT NULL DEFAULT 0"); }
      catch (error) {
        const retry = await executeQuery("PRAGMA table_info(bo_work_items)");
        if (!retry.success || !retry.rows.some(row => row.name === "confirmation_pending")) throw error;
      }
    }
  })().catch(error => { pending = undefined; throw error; });
  await pending;
}
