import { db, executeQuery, executeMutation } from "@/lib/db";
let pending: Promise<void> | undefined;
export async function ensureWorkTagsSchema() {
  if (!db) return;
  if (!pending) pending = (async () => {
    const result = await executeQuery("PRAGMA table_info(bo_work_items)");
    if (!result.success) throw new Error("업무 태그 저장 구조를 확인하지 못했습니다.");
    if (!result.rows.some(row => row.name === "work_tags")) {
      try { await executeMutation("ALTER TABLE bo_work_items ADD COLUMN work_tags TEXT NOT NULL DEFAULT '[]'"); }
      catch (error) {
        const retry = await executeQuery("PRAGMA table_info(bo_work_items)");
        if (!retry.success || !retry.rows.some(row => row.name === "work_tags")) throw error;
      }
    }
  })().catch(error => { pending = undefined; throw error; });
  await pending;
}
