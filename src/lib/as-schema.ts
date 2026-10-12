import { db, executeQuery, executeMutation } from "./db";

let pending: Promise<void> | undefined;
export async function ensureAsSchema() {
  if (!db) return;
  if (!pending) pending = (async () => {
    const result = await executeQuery("PRAGMA table_info(bo_as_items)");
    if (!result.success) throw new Error("A/S 저장 구조를 확인하지 못했습니다.");
    const columns = new Set(result.rows.map(row => String(row.name)));
    for (const [name, definition] of Object.entries({ installer: "TEXT", received_date: "TEXT", as_date: "TEXT", service_type: "TEXT", paid_reason: "TEXT" })) {
      if (!columns.has(name)) {
        try { await executeMutation(`ALTER TABLE bo_as_items ADD COLUMN ${name} ${definition}`); }
        catch (error) {
          const retry = await executeQuery("PRAGMA table_info(bo_as_items)");
          if (!retry.success || !retry.rows.some(row => row.name === name)) throw error;
        }
      }
    }
  })().catch(error => { pending = undefined; throw error; });
  await pending;
}
