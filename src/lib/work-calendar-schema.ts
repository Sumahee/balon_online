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
    await executeMutation("CREATE INDEX IF NOT EXISTS bo_work_created_idx ON bo_work_items(created_at DESC, id DESC)");
    await executeMutation("CREATE INDEX IF NOT EXISTS bo_work_status_idx ON bo_work_items(status, created_at DESC)");
    await executeMutation("CREATE INDEX IF NOT EXISTS bo_work_schedule_idx ON bo_work_items(COALESCE(NULLIF(delivery_date,''),due_date))");
    await executeMutation("CREATE INDEX IF NOT EXISTS bo_attachment_work_idx ON bo_attachments(work_item_id)");
    await executeMutation("CREATE INDEX IF NOT EXISTS bo_comment_work_date_idx ON bo_work_item_comments(work_item_id, created_at DESC)");
  })().catch(error => { pending = undefined; throw error; });
  await pending;
}
