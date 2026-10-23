import crypto from 'node:crypto';
import { db, executeMutation, executeQuery } from './db';

export async function ensureDrawingLinks() {
  if (!db) throw new Error('공용 도면 DB에 연결할 수 없습니다.');
  await executeMutation(`CREATE TABLE IF NOT EXISTS bo_drawing_links (
    project_id TEXT PRIMARY KEY, work_item_id TEXT NOT NULL, blueprint_id INTEGER,
    sheet_manifest TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL,
    last_pdf_url TEXT, revision INTEGER NOT NULL DEFAULT 0
  )`);
  await executeMutation('CREATE INDEX IF NOT EXISTS bo_drawing_links_work ON bo_drawing_links(work_item_id)');
  await executeMutation(`CREATE TABLE IF NOT EXISTS bo_drawing_versions (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, work_item_id TEXT NOT NULL,
    export_key TEXT NOT NULL, pdf_url TEXT NOT NULL, file_name TEXT NOT NULL,
    sheets TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(project_id, export_key)
  )`);
  await executeMutation('CREATE INDEX IF NOT EXISTS bo_drawing_versions_work ON bo_drawing_versions(work_item_id,created_at DESC)');
}

export async function linkDrawingProject(workItemId: string, selectedId?: string) {
  await ensureDrawingLinks();
  const work = await executeQuery('SELECT id FROM bo_work_items WHERE id = ?', [workItemId]);
  if (!work.success || !work.rows.length) throw new Error('연결할 업무를 찾을 수 없습니다.');
  const result = await executeQuery(`SELECT project_id FROM bo_drawing_links WHERE work_item_id = ? ${selectedId ? 'AND project_id = ?' : ''} ORDER BY updated_at DESC LIMIT 1`, selectedId ? [workItemId, selectedId] : [workItemId]);
  if (!result.success) throw new Error('도면 연결 정보를 확인하지 못했습니다.');
  if (result.rows[0]) return String(result.rows[0].project_id);
  if (selectedId) throw new Error('선택한 도면은 이 업무와 연결되어 있지 않습니다.');
  // Deterministic initial ID prevents repeated launches from creating duplicate empty projects.
  const projectId = `online-${crypto.createHash('sha256').update(workItemId).digest('hex').slice(0,40)}`;
  await executeMutation("INSERT INTO bo_drawing_links(project_id,work_item_id,sheet_manifest,updated_at,revision) VALUES(?,?,'{}',?,0) ON CONFLICT(project_id) DO NOTHING", [projectId,workItemId,new Date().toISOString()]);
  return projectId;
}

export async function drawingLinksForWork(workItemId: string) {
  await ensureDrawingLinks();
  const result = await executeQuery('SELECT * FROM bo_drawing_links WHERE work_item_id = ? ORDER BY updated_at DESC', [workItemId]);
  if (!result.success) throw new Error('도면 연결 내역을 불러오지 못했습니다.');
  const history = await executeQuery('SELECT id,project_id,pdf_url,file_name,sheets,created_at FROM bo_drawing_versions WHERE work_item_id = ? ORDER BY created_at DESC', [workItemId]);
  if (!history.success) throw new Error('도면 전송 이력을 불러오지 못했습니다.');
  return result.rows.map(row => ({ projectId:String(row.project_id),blueprintId:row.blueprint_id,syncedAt:String(row.updated_at),revision:Number(row.revision),sheets:Object.values(JSON.parse(String(row.sheet_manifest || '{}'))),versions:history.rows.filter(v => v.project_id === row.project_id).map(v => ({ id:v.id,url:v.pdf_url,name:v.file_name,sheets:JSON.parse(String(v.sheets || '[]')),createdAt:v.created_at })) }));
}
