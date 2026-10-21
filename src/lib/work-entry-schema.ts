import { db, executeQuery, executeMutation } from "./db";

let pending: Promise<void> | undefined;
export async function ensureWorkEntrySchema() {
  if (!db) return;
  if (!pending) pending = (async () => {
    const result = await executeQuery("PRAGMA table_info(bo_work_items)");
    if (!result.success) throw new Error("업무 저장 구조를 확인하지 못했습니다.");
    for (const column of ["created_by", "installation_team", "ceiling_height"]) {
      if (result.rows.some(row => row.name === column)) continue;
      try { await executeMutation(`ALTER TABLE bo_work_items ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`); }
      catch (error) {
        const retry = await executeQuery("PRAGMA table_info(bo_work_items)");
        if (!retry.success || !retry.rows.some(row => row.name === column)) throw error;
      }
    }
  })().catch(error => { pending = undefined; throw error; });
  await pending;
}
