import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { VERIFY } from "./auth";
import { isInstaller } from "@/lib/access";
import { DOCUMENT_FILE_LIMIT, validateDocumentPost } from "@/lib/document-board";
import type { Row } from "@libsql/client";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
let pending: Promise<void> | undefined;
async function schema() {
  if (!db) throw new Error("문서 저장 서버에 연결할 수 없습니다.");
  if (!pending) pending = (async () => {
    await db!.batch([
      `CREATE TABLE IF NOT EXISTS bo_document_posts (id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,pinned INTEGER NOT NULL DEFAULT 0,author_id TEXT NOT NULL,author TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS bo_document_files (id TEXT PRIMARY KEY,post_id TEXT,owner_id TEXT NOT NULL,name TEXT NOT NULL,size INTEGER NOT NULL,data BLOB NOT NULL,created_at TEXT NOT NULL)`,
      "CREATE INDEX IF NOT EXISTS bo_document_posts_order ON bo_document_posts(pinned DESC,created_at DESC,id DESC)",
      "CREATE INDEX IF NOT EXISTS bo_document_files_post ON bo_document_files(post_id)",
    ], "write");
  })().catch(error => { pending = undefined; throw error; });
  await pending;
}
async function staff(request: Request) {
  const session = await VERIFY(request);
  if (!session.ok) return { denied: session };
  const { user } = await session.json();
  if (isInstaller(user)) return { denied: json({ success: false, error: "직원만 문서 게시판을 사용할 수 있습니다." }, 403) };
  return { user: { id: String(user.id), name: String(user.name) } };
}
function post(row: Row) {
  return { id: row.id, title: row.title, body: row.body, pinned: Boolean(row.pinned), authorId: row.author_id,
    author: row.author, createdAt: row.created_at, updatedAt: row.updated_at, attachmentCount: Number(row.attachment_count || 0) };
}
export async function GET(request: Request) {
  const auth = await staff(request); if (auth.denied) return auth.denied;
  try {
    await schema();
    const p = new URL(request.url).searchParams;
    if (p.has("file")) {
      const result = await db!.execute({ sql: "SELECT f.name,f.data FROM bo_document_files f JOIN bo_document_posts p ON p.id=f.post_id WHERE f.id=?", args: [p.get("file")!] });
      if (!result.rows.length) return json({ success: false, error: "첨부파일을 찾을 수 없습니다." }, 404);
      const file = result.rows[0];
      return new Response(new Uint8Array(file.data as ArrayBuffer), { headers: {
        "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(String(file.name)).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}`,
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      } });
    }
    if (p.has("id")) {
      const { rows } = await db!.execute({ sql: "SELECT * FROM bo_document_posts WHERE id=?", args: [p.get("id")!] });
      if (!rows.length) return json({ success: false, error: "게시글을 찾을 수 없습니다." }, 404);
      const files = await db!.execute({ sql: "SELECT id,name,size FROM bo_document_files WHERE post_id=? ORDER BY created_at,id", args: [p.get("id")!] });
      return json({ success: true, data: { ...post(rows[0]), attachmentCount: files.rows.length, attachments: files.rows } });
    }
    const offset = Number(p.get("offset") || 0), q = (p.get("q") || "").trim().slice(0, 200);
    if (!Number.isSafeInteger(offset) || offset < 0) return json({ success: false, error: "페이지를 확인해 주세요." }, 400);
    const { rows } = await db!.execute({ sql: `SELECT p.id,p.title,p.pinned,p.author_id,p.author,p.created_at,p.updated_at,(SELECT COUNT(*) FROM bo_document_files f WHERE f.post_id=p.id) AS attachment_count FROM bo_document_posts p WHERE instr(lower(p.title || ' ' || p.body || ' ' || p.author),lower(?))>0 ORDER BY p.pinned DESC,p.created_at DESC,p.id DESC LIMIT 21 OFFSET ?`, args: [q, offset] });
    return json({ success: true, data: rows.slice(0, 20).map(post), hasMore: rows.length > 20 });
  } catch { return json({ success: false, error: "문서를 불러오지 못했습니다. 다시 시도해 주세요." }, 503); }
}

export async function POST(request: Request) {
  const auth = await staff(request); if (auth.denied) return auth.denied;
  if (new URL(request.url).searchParams.get("action") !== "upload") return save(request, auth.user!, false);
  try {
    if (Number(request.headers.get("content-length")) > DOCUMENT_FILE_LIMIT + 64_000) return json({ success: false, error: "파일당 3MB까지 첨부할 수 있습니다." }, 413);
    const form = await request.formData(), file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > DOCUMENT_FILE_LIMIT || !file.name || file.name.length > 255)
      return json({ success: false, error: "파일 이름과 크기를 확인해 주세요. 파일당 3MB까지 첨부할 수 있습니다." }, 400);
    await schema();
    // Expired drafts are never visible or downloadable, and are reclaimed on subsequent uploads.
    await db!.execute({ sql: "DELETE FROM bo_document_files WHERE post_id IS NULL AND created_at<?", args: [new Date(Date.now() - 7 * 86400_000).toISOString()] });
    const id = randomUUID(), name = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_");
    await db!.execute({ sql: "INSERT INTO bo_document_files(id,post_id,owner_id,name,size,data,created_at) VALUES(?,NULL,?,?,?,?,?)", args: [id, auth.user!.id, name, file.size, Buffer.from(await file.arrayBuffer()), new Date().toISOString()] });
    return json({ success: true, data: { id, name, size: file.size } }, 201);
  } catch { return json({ success: false, error: "첨부파일을 저장하지 못했습니다. 다시 시도해 주세요." }, 503); }
}
export async function PUT(request: Request) {
  const auth = await staff(request); if (auth.denied) return auth.denied;
  return save(request, auth.user!, true);
}
async function save(request: Request, user: { id: string; name: string }, editing: boolean) {
  let input;
  try {
    const raw = await request.text(); if (raw.length > 100_000) throw new Error("게시글 내용이 너무 큽니다.");
    input = validateDocumentPost(JSON.parse(raw));
  } catch (error) { return json({ success: false, error: error instanceof Error ? error.message : "입력 내용을 확인해 주세요." }, 400); }
  try {
    await schema();
    const id = editing ? new URL(request.url).searchParams.get("id") || "" : randomUUID();
    const tx = await db!.transaction("write");
    try {
      if (editing) {
        const { rows } = await tx.execute({ sql: "SELECT author_id FROM bo_document_posts WHERE id=?", args: [id] });
        if (!rows.length) return json({ success: false, error: "게시글을 찾을 수 없습니다." }, 404);
        if (rows[0].author_id !== user.id) return json({ success: false, error: "작성자만 수정할 수 있습니다." }, 403);
      }
      for (const fileId of input.attachments) {
        const { rows } = await tx.execute({ sql: "SELECT id FROM bo_document_files WHERE id=? AND ((post_id IS NULL AND owner_id=?) OR post_id=?)", args: [fileId, user.id, editing ? id : ""] });
        if (!rows.length) return json({ success: false, error: "사용할 수 없는 첨부파일입니다. 파일을 다시 선택해 주세요." }, 400);
      }
      const now = new Date().toISOString();
      if (editing) await tx.execute({ sql: "UPDATE bo_document_posts SET title=?,body=?,pinned=?,updated_at=? WHERE id=?", args: [input.title, input.body, input.pinned ? 1 : 0, now, id] });
      else await tx.execute({ sql: "INSERT INTO bo_document_posts VALUES(?,?,?,?,?,?,?,?)", args: [id, input.title, input.body, input.pinned ? 1 : 0, user.id, user.name, now, now] });
      const placeholders = input.attachments.map(() => "?").join(",");
      await tx.execute({ sql: `DELETE FROM bo_document_files WHERE post_id=? ${placeholders ? `AND id NOT IN (${placeholders})` : ""}`, args: [id, ...input.attachments] });
      for (const fileId of input.attachments) await tx.execute({ sql: "UPDATE bo_document_files SET post_id=? WHERE id=?", args: [id, fileId] });
      await tx.commit();
      return json({ success: true, data: { id } }, editing ? 200 : 201);
    } finally { tx.close(); }
  } catch { return json({ success: false, error: "게시글을 저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요." }, 503); }
}
export async function DELETE(request: Request) {
  const auth = await staff(request); if (auth.denied) return auth.denied;
  try {
    await schema();
    const id = new URL(request.url).searchParams.get("id") || "", tx = await db!.transaction("write");
    try {
      const { rows } = await tx.execute({ sql: "SELECT author_id FROM bo_document_posts WHERE id=?", args: [id] });
      if (!rows.length) return json({ success: false, error: "게시글을 찾을 수 없습니다." }, 404);
      if (rows[0].author_id !== auth.user!.id) return json({ success: false, error: "작성자만 삭제할 수 있습니다." }, 403);
      await tx.execute({ sql: "DELETE FROM bo_document_files WHERE post_id=?", args: [id] });
      await tx.execute({ sql: "DELETE FROM bo_document_posts WHERE id=?", args: [id] });
      await tx.commit();
      return json({ success: true });
    } finally { tx.close(); }
  } catch { return json({ success: false, error: "게시글을 삭제하지 못했습니다. 다시 시도해 주세요." }, 503); }
}
