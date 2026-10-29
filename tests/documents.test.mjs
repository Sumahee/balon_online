import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@libsql/client";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)(name => name in mocks ? mocks[name] : nativeRequire(name), module, module.exports);
  return module.exports;
}
const model = load("src/lib/document-board.ts");
test("document body links preserve text, queries, Korean paths and balanced parentheses", () => {
  const body = "양식: https://example.com/한글?q=1&next=2#양식\n(www.example.com/form). https://example.com/a_(b)\n끝";
  const parts = model.documentBodyParts(body);
  assert.equal(parts.map(p => p.text).join(""), body);
  assert.deepEqual(parts.filter(p => p.href).map(p => p.href), [
    "https://example.com/한글?q=1&next=2#양식", "https://www.example.com/form", "https://example.com/a_(b)",
  ]);
  const unsafe = "javascript:alert(1) data:text/html,<script> ftp://example.com https://user:secret@example.com https://";
  assert.equal(model.documentBodyParts(unsafe).some(p => p.href), false);
  assert.equal(model.documentBodyParts(unsafe).map(p => p.text).join(""), unsafe);
});
function fixture() {
  const db = createClient({ url: "file::memory:" });
  let user = { id: "writer", name: "문서 담당자", onlineRole: "staff" };
  const handler = load("src/lib/api-handlers/documents.ts", {
    "@/lib/db": { db }, "@/lib/document-board": model,
    "@/lib/access": { isInstaller: u => u.onlineRole === "installer" },
    "./auth": { VERIFY: async () => user ? Response.json({ user }) : Response.json({ success: false }, { status: 401 }) },
  });
  const request = (method, params = "", value) => new Request(`https://example.test/api/documents${params}`, {
    method, ...(value === undefined ? {} : value instanceof FormData ? { body: value } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) }),
  });
  const upload = async (name = "바론 양식.hwp", bytes = new Uint8Array([0, 255, 3, 13, 10, 99])) => {
    const form = new FormData(); form.set("file", new File([bytes], name));
    const response = await handler.POST(request("POST", "?action=upload", form));
    assert.equal(response.status, 201); return (await response.json()).data;
  };
  const save = (value = {}, method = "POST", params = "") => handler[method](request(method, params, { title: "문서 양식", body: "본문\n설명", pinned: false, attachments: [], ...value }));
  return { db, handler, request, upload, save, setUser: value => { user = value; } };
}

test("documents authenticate staff before schema, reads, uploads or mutations", async () => {
  const f = fixture();
  try {
    for (const user of [null, { id: "installer", onlineRole: "installer" }]) {
      f.setUser(user);
      for (const method of ["GET", "POST", "PUT", "DELETE"]) {
        assert.equal((await f.handler[method](f.request(method))).status, user ? 403 : 401);
      }
    }
    assert.equal((await f.db.execute("SELECT name FROM sqlite_master WHERE name LIKE 'bo_document_%'")).rows.length, 0);
  } finally { f.db.close(); }
});

test("documents preserve binary originals and Korean filenames; drafts stay private; list omits payload", async () => {
  const f = fixture();
  try {
    const file = await f.upload();
    assert.equal((await f.handler.GET(f.request("GET", `?file=${file.id}`))).status, 404);
    const created = await f.save({ attachments: [file.id], pinned: true, body: "<script>alert(1)</script>\n문서 설명" });
    assert.equal(created.status, 201); const { data: { id } } = await created.json();
    const downloaded = await f.handler.GET(f.request("GET", `?file=${file.id}`));
    assert.equal(downloaded.headers.get("Content-Type"), "application/octet-stream");
    assert.equal(downloaded.headers.get("X-Content-Type-Options"), "nosniff");
    assert.match(downloaded.headers.get("Content-Disposition"), /filename\*=UTF-8''%/);
    assert.deepEqual([...new Uint8Array(await downloaded.arrayBuffer())], [0, 255, 3, 13, 10, 99]);
    const detail = (await (await f.handler.GET(f.request("GET", `?id=${id}`))).json()).data;
    assert.equal(detail.body, "<script>alert(1)</script>\n문서 설명");
    assert.equal(detail.attachments[0].name, "바론 양식.hwp");
    assert.equal(detail.attachments[0].data, undefined);
    const listed = (await (await f.handler.GET(f.request("GET"))).json()).data[0];
    assert.equal(listed.attachmentCount, 1); assert.equal(listed.body, undefined); assert.equal(listed.attachments, undefined);
  } finally { f.db.close(); }
});

test("documents pin above newer posts, search body/author, paginate and unpin", async () => {
  const f = fixture();
  try {
    const pinned = (await (await f.save({ title: "고정 공지", pinned: true })).json()).data.id;
    for (let i = 0; i < 21; i++) assert.equal((await f.save({ title: `일반 ${i}`, body: "찾을 내용" })).status, 201);
    const first = await (await f.handler.GET(f.request("GET"))).json();
    assert.equal(first.data[0].id, pinned); assert.equal(first.data.length, 20); assert.equal(first.hasMore, true);
    const second = await (await f.handler.GET(f.request("GET", "?offset=20"))).json();
    assert.equal(second.data.length, 2); assert.equal(second.hasMore, false);
    assert.equal(new Set([...first.data, ...second.data].map(p => p.id)).size, 22);
    const found = await (await f.handler.GET(f.request("GET", `?q=${encodeURIComponent("찾을 내용")}`))).json();
    assert.equal(found.data.every(p => p.title.startsWith("일반")), true);
    assert.equal((await f.save({ pinned: false }, "PUT", `?id=${pinned}`)).status, 200);
    const detail = await (await f.handler.GET(f.request("GET", `?id=${pinned}`))).json(); assert.equal(detail.data.pinned, false);
    assert.equal((await f.handler.GET(f.request("GET", "?offset=-1"))).status, 400);
  } finally { f.db.close(); }
});

test("documents enforce author editing/deletion and attachment ownership, with atomic rollback", async () => {
  const f = fixture();
  try {
    const file = await f.upload();
    const id = (await (await f.save({ attachments: [file.id] })).json()).data.id;
    f.setUser({ id: "other", name: "다른 직원", onlineRole: "staff" });
    assert.equal((await f.save({}, "PUT", `?id=${id}`)).status, 403);
    assert.equal((await f.handler.DELETE(f.request("DELETE", `?id=${id}`))).status, 403);
    assert.equal((await f.save({ attachments: [file.id] })).status, 400);
    const otherFile = await f.upload("다른 직원.docx");
    f.setUser({ id: "writer", name: "문서 담당자", onlineRole: "staff" });
    assert.equal((await f.save({ title: "실패할 변경", attachments: [otherFile.id] }, "PUT", `?id=${id}`)).status, 400);
    assert.equal((await f.db.execute({ sql: "SELECT title FROM bo_document_posts WHERE id=?", args: [id] })).rows[0].title, "문서 양식");
    assert.equal((await f.save({ attachments: [] }, "PUT", `?id=${id}`)).status, 200);
    assert.equal((await f.handler.GET(f.request("GET", `?file=${file.id}`))).status, 404);
    assert.equal((await f.handler.DELETE(f.request("DELETE", `?id=${id}`))).status, 200);
    assert.equal((await f.handler.GET(f.request("GET", `?id=${id}`))).status, 404);
    assert.equal((await f.db.execute({ sql: "SELECT id FROM bo_document_files WHERE post_id=?", args: [id] })).rows.length, 0);
  } finally { f.db.close(); }
});

test("documents reject oversize/empty files, invalid posts, duplicates and extra attachments", async () => {
  const f = fixture();
  try {
    for (const bytes of [new Uint8Array(0), new Uint8Array(model.DOCUMENT_FILE_LIMIT + 1)]) {
      const form = new FormData(); form.set("file", new File([bytes], "문서.pdf"));
      assert.ok([400, 413].includes((await f.handler.POST(f.request("POST", "?action=upload", form))).status));
    }
    for (const value of [{ title: " " }, { title: "x".repeat(201) }, { body: "x".repeat(50001) }, { pinned: "yes" }, { attachments: ["invalid"] }, { attachments: Array(11).fill("a".repeat(36)) }])
      assert.equal((await f.save(value)).status, 400);
    const file = await f.upload(); assert.equal((await f.save({ attachments: [file.id, file.id] })).status, 400);
  } finally { f.db.close(); }
});
