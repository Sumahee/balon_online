import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import { createClient } from "@libsql/client";
import sharp from "sharp";
import ts from "typescript";
const nativeRequire = createRequire(import.meta.url);
function load(file, mocks = {}, cache = new Map()) {
  const path = [resolve(file), resolve(file).replace(/\.ts$/, ".tsx")].find(existsSync);
  if (cache.has(path)) return cache.get(path).exports;
  const loaded = { exports: {} }; cache.set(path, loaded);
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const require = name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`, mocks, cache);
    if (name.startsWith("./") || name.startsWith("../")) return load(resolve(path, "..", `${name}.ts`), mocks, cache);
    return nativeRequire(name);
  };
  new Script(`(function(require,module,exports){${code}\n})`).runInNewContext({ ...globalThis, Buffer, Response, Request, URL, URLSearchParams, Headers, Intl, console, process: { env: { NODE_ENV: "production" } } })(require, loaded, loaded.exports);
  return loaded.exports;
}
const request = body => new Request("http://localhost/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const values = { type: "as", clientName: "접수 테스트", siteAddress: "시험 현장", reason: "파손 확인" };
async function photo(color = "red") { return "data:image/png;base64," + (await sharp({ create: { width: 8, height: 8, channels: 3, background: color } }).png().toBuffer()).toString("base64"); }
async function fixture() {
  const db = createClient({ url: "file::memory:" });
  await db.execute("CREATE TABLE bo_as_items(id TEXT PRIMARY KEY,type TEXT,client_name TEXT,construct_date TEXT,site_address TEXT,reason TEXT,result_status TEXT,resolution_details TEXT,technician TEXT,contact_phone TEXT,priority TEXT,created_at TEXT)");
  let user = { onlineRole: "staff" }, fail = false;
  const database = { db, executeQuery: async (sql, args = []) => { const result = await db.execute({ sql, args }); return { success: true, rows: result.rows }; }, executeMutation: async (sql, args = []) => { if (fail && /^(UPDATE|INSERT)/.test(sql)) throw new Error("offline"); const result = await db.execute({ sql, args }); return { success: true, rows: result.rows }; } };
  const auth = { VERIFY: async () => user ? Response.json({ user }) : Response.json({ success: false }, { status: 401 }) };
  const mocks = { "@/lib/db": database, "./db": database, "../db": database, "./auth": auth, "@/lib/api-handlers/auth": auth };
  const handlers = () => load("src/lib/api-handlers/posts.ts", mocks);
  return { db, mocks, handlers, setUser(value) { user = value; }, setFail(value) { fail = value; } };
}

test("AS intake and result photos persist separately and lists return only authenticated references", async () => {
  const f = await fixture();
  try {
    const intake = await photo(), result = await photo("blue");
    const created = await f.handlers().POST(request({ ...values, id: "as-photo", intakePhotos: [intake], resultPhotos: [result] }));
    assert.equal(created.status, 201);
    const data = (await created.json()).data;
    assert.equal(data.photosRevision, 1);
    assert.match(data.intakePhotos[0], /kind=intake/); assert.match(data.resultPhotos[0], /kind=result/);
    const listed = await (await f.handlers().GET(new Request("http://localhost/api/posts?type=as"))).json();
    assert.equal(listed.data[0].intakePhotos.length, 1); assert.equal(listed.data[0].resultPhotos.length, 1);
    assert.ok(!JSON.stringify(listed).includes("base64"));
    for (const [url, source] of [[data.intakePhotos[0], intake], [data.resultPhotos[0], result]]) {
      const response = await f.handlers().GET(new Request("http://localhost" + url));
      assert.equal(response.status, 200); assert.equal(response.headers.get("Content-Type"), "image/png");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(source.split(",")[1], "base64"));
    }
    await f.handlers().PUT(request({ type: "as", id: "as-photo", resultStatus: "처리중" }));
    const unchanged = (await f.db.execute("SELECT * FROM bo_as_items")).rows[0];
    assert.equal(unchanged.photo_revision, 1); assert.equal(JSON.parse(unchanged.intake_photos)[0], intake);
    const edited = await f.handlers().PUT(request({ type: "as", id: "as-photo", photosRevision: 1, intakePhotos: [] }));
    assert.equal(edited.status, 200);
    const updated = (await edited.json()).data;
    assert.equal(updated.intakePhotos.length, 0); assert.equal(updated.resultPhotos.length, 1); assert.equal(updated.photosRevision, 2);
    assert.equal((await f.handlers().GET(new Request("http://localhost" + updated.resultPhotos[0]))).status, 200);
    assert.equal((await f.handlers().GET(new Request("http://localhost" + data.intakePhotos[0]))).status, 404);
    assert.equal((await f.handlers().PUT(request({ type: "as", id: "as-photo", photosRevision: 1, intakePhotos: [intake] }))).status, 409);
    await f.handlers().DELETE(new Request("http://localhost/api/posts?type=as&id=as-photo"));
    assert.equal((await f.handlers().GET(new Request("http://localhost" + updated.resultPhotos[0]))).status, 404);
  } finally { f.db.close(); }
});

test("AS photos reject cross-record/cross-kind references, bad images, size limits and excess count", async () => {
  const f = await fixture();
  try {
    const image = await photo();
    const data = (await (await f.handlers().POST(request({ ...values, id: "source", intakePhotos: [image] }))).json()).data;
    for (const intakePhotos of [["data:image/png;base64,aA=="], [image.replace("image/png", "image/jpeg")], ["data:image/png;base64," + "A".repeat(300000)], Array(5).fill(image), [data.intakePhotos[0]], ["https://example.com/photo.png"]]) {
      assert.equal((await f.handlers().POST(request({ ...values, id: "invalid", intakePhotos }))).status, 400);
    }
    const wrongKind = await f.handlers().PUT(request({ type: "as", id: "source", photosRevision: 1, resultPhotos: data.intakePhotos }));
    assert.equal(wrongKind.status, 400);
    assert.equal((await f.db.execute("SELECT COUNT(*) AS n FROM bo_as_items")).rows[0].n, 1);
  } finally { f.db.close(); }
});

test("AS photo reads require staff and failed writes never partially save text or photos", async () => {
  const f = await fixture();
  try {
    const image = await photo();
    const data = (await (await f.handlers().POST(request({ ...values, id: "secure", intakePhotos: [image] }))).json()).data;
    f.setUser(null); assert.equal((await f.handlers().GET(new Request("http://localhost" + data.intakePhotos[0]))).status, 401);
    f.setUser({ onlineRole: "installer" }); assert.equal((await f.handlers().GET(new Request("http://localhost" + data.intakePhotos[0]))).status, 403);
    f.setUser({ onlineRole: "staff" }); f.setFail(true);
    const failed = await f.handlers().PUT(request({ type: "as", id: "secure", reason: "must not save", photosRevision: 1, intakePhotos: [] }));
    assert.equal(failed.status, 500);
    const current = (await f.db.execute("SELECT * FROM bo_as_items WHERE id='secure'")).rows[0];
    assert.equal(current.reason, values.reason); assert.equal(current.photo_revision, 1); assert.equal(JSON.parse(current.intake_photos).length, 1);
    const offline = load("src/lib/as-photo-storage.ts", { ...f.mocks, "@/lib/db": { db: null } });
    await assert.rejects(() => offline.prepareAsPhotos({ intakePhotos: [image] }, "new", true), /DB 연결/);
  } finally { f.db.close(); }
});

test("AS uploader compresses in selection order, blocks duplicate selection and keeps originals on failure", async () => {
  const React = nativeRequire("react"), state = []; let cursor = 0, processing = false, reject = false, release;
  let photos = ["original"], changes = 0;
  const busy = [];
  const hookReact = { ...React, useRef(value) { const i = cursor++; return state[i] ?? (state[i] = { current: value }); }, useState(value) { const i = cursor++; if (!(i in state)) state[i] = value; return [state[i], next => state[i] = typeof next === "function" ? next(state[i]) : next]; } };
  const { AsPhotoEditor } = load("src/components/as/AsPhotoEditor.tsx", { react: hookReact, "@/components/common/PhotoImage": { PhotoImage: () => null }, "@/lib/photo-compression": { readPhotoFile: async file => file.name, compressPhoto: async (name, size) => { assert.equal(size, 200 * 1024); if (reject) throw Error("bad image"); if (!processing) { processing = true; await new Promise(resolve => release = resolve); } return "compressed-" + name; } } });
  const walk = node => Array.isArray(node) ? node.flatMap(walk) : node && typeof node === "object" ? [node, ...walk(node.props?.children)] : [];
  const render = () => { cursor = 0; return walk(AsPhotoEditor({ label: "A/S 접수 사진", photos, disabled: false, onChange: next => { photos = next; changes++; }, onBusyChange: value => busy.push(value) })); };
  const choose = names => render().find(n => n.type === "input").props.onChange({ target: { files: names.map(name => ({ name, type: "image/png", size: 100 })), value: "" } });
  choose(["first", "second"]); await new Promise(resolve => setImmediate(resolve));
  assert.equal(render().find(n => n.type === "input").props.disabled, true);
  choose(["duplicate"]); release(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(Array.from(photos), ["original", "compressed-first", "compressed-second"]); assert.equal(changes, 1); assert.deepEqual(busy, [true, false]);
  reject = true; choose(["invalid"]); await new Promise(resolve => setImmediate(resolve));
  assert.equal(changes, 1); assert.ok(render().some(n => n.props?.role === "alert"));
  render().find(n => n.props?.["aria-label"] === "A/S 접수 사진 2 제거").props.onClick();
  assert.deepEqual(Array.from(photos), ["original", "compressed-second"]);
});

test("AS detail separates intake and result photos and opens the selected group", () => {
  const React = nativeRequire("react");
  const opened = [];
  const { AsDetailModal } = load("src/components/as/AsDetailModal.tsx", { react: { ...React, useEffect() {}, useId: () => "as-detail" }, "@/components/common/PhotoImage": { PhotoImage: () => null } });
  const walk = node => Array.isArray(node) ? node.flatMap(walk) : node && typeof node === "object" ? [node, ...walk(node.props?.children)] : [];
  const nodes = walk(AsDetailModal({ item: { ...values, intakePhotos: ["intake"], resultPhotos: ["result"] }, onOpenPhoto: url => opened.push(url) }));
  nodes.find(n => n.props?.["aria-label"] === "A/S 접수 사진 1 확대").props.onClick();
  nodes.find(n => n.props?.["aria-label"] === "조치 후 사진 1 확대").props.onClick();
  assert.deepEqual(opened, ["intake", "result"]);
});

test("new AS intake submits photos, waits for preparation and preserves the draft after failed save", async () => {
  const React = nativeRequire("react"), state = []; let cursor = 0, fail = true, closed = 0;
  const saved = [];
  function PhotoEditor() { return null; }
  const { QuickModals } = load("src/components/layout/QuickModals.tsx", {
    react: { ...React, useState(value) { const i = cursor++; if (!(i in state)) state[i] = value; return [state[i], next => state[i] = typeof next === "function" ? next(state[i]) : next]; } },
    "@/components/as/AsPhotoEditor": { AsPhotoEditor: PhotoEditor },
    "@/components/as/AsIntakeFields": { AsIntakeFields: () => null },
    "@/components/common/WorkEditorModal": { WorkEditorModal: () => null },
    "@/context/DataContext": { useData: () => ({ quickModalType: "as", isSaving: false, setQuickModalType: () => closed++, addAsItem: async item => { saved.push(item); if (fail) throw Error("offline"); } }) },
  });
  const walk = node => Array.isArray(node) ? node.flatMap(walk) : node && typeof node === "object" ? [node, ...walk(node.props?.children)] : [];
  const render = () => { cursor = 0; return walk(QuickModals()); };
  const requiredInput = index => render().filter(n => n.type === "input" && n.props.required)[index];
  requiredInput(0).props.onChange({ target: { value: "시험 업체" } });
  requiredInput(1).props.onChange({ target: { value: "시험 현장" } });
  render().find(n => n.type === "textarea").props.onChange({ target: { value: "접수 사유" } });
  render().find(n => n.type === PhotoEditor).props.onChange(["prepared-photo"]);
  render().find(n => n.type === PhotoEditor).props.onBusyChange(true);
  await render().find(n => n.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(saved.length, 0);
  assert.ok(render().find(n => n.props?.type === "submit").props.disabled);
  render().find(n => n.type === PhotoEditor).props.onBusyChange(false);
  await render().find(n => n.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(closed, 0); assert.equal(saved[0].intakePhotos[0], "prepared-photo");
  assert.equal(render().find(n => n.type === PhotoEditor).props.photos[0], "prepared-photo");
  fail = false;
  await render().find(n => n.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(closed, 1); assert.equal(render().find(n => n.type === PhotoEditor).props.photos.length, 0);
});
