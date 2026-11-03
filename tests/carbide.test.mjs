import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import ts from "typescript";
import sharp from "sharp";

const nativeRequire = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function("require", "module", "exports", code)(name => name in mocks ? mocks[name] : nativeRequire(name), module, module.exports);
  return module.exports;
}
const dates = load("src/lib/date.ts");
const model = load("src/lib/carbide.ts", { "./date": dates });
const sample = (extra = {}) => ({ ...model.emptyCarbideValues(), date: "2026-11-03", toolName: "재단용 톱날", toolCode: "SAW-001", diameter: 300, kerf: 3.2, bore: 30, teeth: 96, provider: "시험초경", machine: "재단기 1호", quantity: 2, options: ["팁수리", "세척"], tipCount: 3, unitPrice: 10000, tipUnitPrice: 2000, shippingCost: 3000, otherCost: 1000, vat: 3000, ...extra });
function fixture(dbOverride) {
  const db = createClient({ url: "file::memory:" });
  let user = { id: 1, name: "시험직원", onlineRole: "staff" }, failSave = false;
  const connected = dbOverride || {
    execute: (...args) => db.execute(...args), batch: (...args) => db.batch(...args), transaction: async (...args) => {
      const tx = await db.transaction(...args);
      return { execute: statement => { if (failSave && /^(UPDATE|INSERT)/.test(statement.sql)) throw new Error("write unavailable"); return tx.execute(statement); }, commit: () => tx.commit(), close: () => tx.close() };
    },
  };
  const mocks = { "@/lib/db": { db: connected }, "@/lib/carbide": model, "@/lib/access": { isInstaller: user => user.onlineRole === "installer" }, "./auth": { VERIFY: async () => user ? Response.json({ user }) : Response.json({ success: false }, { status: 401 }) } };
  let handler = load("src/lib/api-handlers/carbide.ts", mocks);
  const request = (method, body, params = "") => new Request(`https://app.test/api/carbide${params}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }) });
  const save = (body, method = "POST") => handler[method](request(method, body));
  const list = params => handler.GET(request("GET", undefined, params || ""));
  return { db, save, list, request, setUser: value => { user = value; }, failSave: value => { failSave = value; }, reload: () => { handler = load("src/lib/api-handlers/carbide.ts", mocks); } };
}

test("carbide validates dimensions, dates, costs and tip options without trusting totals", () => {
  const value = model.validateCarbideValues(sample({ total: 1, author: "forged" }));
  assert.equal(model.carbideCosts(value).total, 33000);
  assert.equal(value.author, undefined);
  assert.equal(value.total, undefined);
  for (const update of [
    { quantity: 0 }, { quantity: -1 }, { quantity: 1.5 }, { unitPrice: -10 }, { vat: true }, { teeth: 0 }, { diameter: -1 },
    { options: ["unknown"] }, { options: ["세척", "세척"] }, { options: [], tipCount: 1 }, { tipCount: 0 },
    { date: "2026-02-30" }, { expectedDate: "2026-11-02" }, { status: "완료", receivedDate: "" }, { receivedDate: "2026-11-02" },
    { toolName: "" }, { toolType: "unsupported" }, { unitPrice: 1e9, quantity: 10000 },
  ]) assert.throws(() => model.validateCarbideValues(sample(update)), JSON.stringify(update));
  assert.equal(model.validateCarbideValues(sample({ diameter: "300.5", teeth: "96", unitPrice: "10000" })).diameter, 300.5);
});

test("carbide rejects anonymous and installer reads and writes before creating tables", async () => {
  const f = fixture();
  try {
    for (const [user, status] of [[null, 401], [{ id: 9, onlineRole: "installer" }, 403]]) {
      f.setUser(user);
      assert.equal((await f.list()).status, status);
      for (const method of ["POST", "PUT"]) assert.equal((await f.save(sample({ id: randomUUID(), revision: 1 }), method)).status, status);
    }
    const schema = await f.db.execute("SELECT name FROM sqlite_master WHERE name='bo_carbide_records'");
    assert.equal(schema.rows.length, 0);
  } finally { f.db.close(); }
});

test("carbide persists full records across reloads, computes totals and deduplicates uncertain retries", async () => {
  const f = fixture();
  try {
    const body = sample({ id: randomUUID(), author: "forged", total: 5, memo: "팁 3개 수리\n절삭 상태 확인" });
    assert.equal((await f.save(body)).status, 201);
    assert.equal((await f.save(body)).status, 201);
    f.reload();
    const result = await (await f.list()).json();
    assert.equal(result.data.count, 1);
    const item = result.data.items[0];
    assert.equal(item.total, 33000); assert.equal(item.author, "시험직원"); assert.equal(item.revision, 1);
    assert.equal(item.memo, body.memo); assert.deepEqual(item.options, body.options); assert.equal(item.kerf, 3.2);
    const detail = await f.list(`?id=${body.id}`);
    assert.equal(detail.headers.get("cache-control"), "private, no-store");
    assert.equal((await detail.json()).data.toolCode, "SAW-001");
    assert.equal((await f.save({ ...body, toolName: "changed" })).status, 409);
    f.setUser({ id: 2, name: "다른직원", onlineRole: "staff" });
    assert.equal((await f.save(body)).status, 409);
    assert.equal((await (await f.list()).json()).data.count, 1);
  } finally { f.db.close(); }
});

test("carbide detects concurrent edits, preserves original author and excludes cancelled amounts", async () => {
  const f = fixture();
  try {
    const body = sample({ id: randomUUID() }); await f.save(body);
    f.setUser({ id: 2, name: "수정직원", onlineRole: "staff" });
    const update = { ...body, revision: 1, status: "완료", receivedDate: "2026-11-05" };
    const response = await f.save(update, "PUT"); assert.equal(response.status, 200);
    const saved = (await response.json()).data;
    assert.equal(saved.revision, 2); assert.equal(saved.author, "시험직원"); assert.equal(saved.updatedBy, "수정직원");
    assert.equal((await f.save({ ...update, memo: "stale" }, "PUT")).status, 409);
    assert.equal((await f.save({ ...update, id: randomUUID() }, "PUT")).status, 404);
    let result = (await (await f.list()).json()).data;
    assert.equal(result.summary.completedAmount, 33000); assert.equal(result.summary.openCount, 0);
    await f.save({ ...update, revision: 2, status: "취소" }, "PUT");
    result = (await (await f.list()).json()).data;
    assert.equal(result.count, 1); assert.equal(result.summary.amount, 0); assert.equal(result.summary.completedAmount, 0); assert.equal(result.summary.tipCount, 0);
  } finally { f.db.close(); }
});

test("carbide search, period, kind and state filtering and pagination aggregate the whole result", async () => {
  const f = fixture();
  try {
    for (let i = 0; i < 27; i++) assert.equal((await f.save(sample({ id: randomUUID(), toolName: `톱날 ${i}`, kind: i === 26 ? "구입" : "연마", status: i === 25 ? "취소" : "의뢰/발주" }))).status, 201);
    const first = await (await f.list("?kind=연마&from=2026-11-03&to=2026-11-03")).json();
    assert.equal(first.data.items.length, 25); assert.equal(first.hasMore, true); assert.equal(first.data.count, 26);
    assert.equal(first.data.summary.amount, 25 * 33000); assert.equal(first.data.summary.openCount, 25);
    const second = await (await f.list("?kind=연마&offset=25")).json();
    assert.equal(second.data.items.length, 1); assert.equal(second.hasMore, false);
    assert.equal(new Set([...first.data.items, ...second.data.items].map(i => i.id)).size, 26);
    for (const q of ["SAW-001", "300", "시험초경", "팁수리"]) assert.equal((await (await f.list(`?q=${encodeURIComponent(q)}`)).json()).data.count, 27);
    assert.equal((await (await f.list("?kind=구입")).json()).data.count, 1);
    assert.equal((await (await f.list("?status=취소")).json()).data.count, 1);
    assert.equal((await (await f.list("?from=2026-11-04")).json()).data.count, 0);
    assert.equal((await (await f.list("?q=' OR 1=1--")).json()).data.count, 0);
    for (const params of ["?offset=-1", "?offset=0.5", "?from=2026-02-30", "?from=2026-11-04&to=2026-11-03", "?kind=unknown", "?id=bad"]) assert.equal((await f.list(params)).status, 400);
  } finally { f.db.close(); }
});

test("carbide write failures roll back and schema failures never return a sample success", async () => {
  const f = fixture();
  try {
    const body = sample({ id: randomUUID() }); await f.save(body);
    f.failSave(true);
    assert.equal((await f.save({ ...body, revision: 1, memo: "should not persist" }, "PUT")).status, 503);
    f.failSave(false);
    const item = (await (await f.list()).json()).data.items[0];
    assert.equal(item.memo, ""); assert.equal(item.revision, 1);
    assert.equal((await f.save({ ...body, id: "bad" })).status, 400);
  } finally { f.db.close(); }
  const broken = fixture({ batch: async () => { throw new Error("offline"); } });
  try { assert.equal((await broken.list()).status, 503); assert.equal((await broken.save(sample())).status, 503); } finally { broken.db.close(); }
});

test("carbide photos persist as original image bytes while list and detail contain only authenticated references", async () => {
  const bytes = await sharp({ create: { width: 80, height: 50, channels: 3, background: '#cab080' } }).png().toBuffer();
  const photo = `data:image/png;base64,${bytes.toString('base64')}`;
  const f = fixture();
  try {
    const body = sample({ id: randomUUID(), photos: [photo] });
    assert.equal((await f.save(body)).status, 201);
    assert.equal((await f.save(body)).status, 201);
    f.reload();
    const listResponse = await f.list();
    const listText = await listResponse.text();
    assert.ok(!listText.includes('data:image'));
    const list = JSON.parse(listText);
    assert.equal(list.data.count, 1);
    const item = list.data.items[0];
    assert.deepEqual(item.photos, [model.carbidePhotoUrl(body.id, 0, 1)]);
    const detail = await (await f.list(`?id=${body.id}`)).json();
    assert.deepEqual(detail.data.photos, item.photos);
    const params = item.photos[0].slice('/api/carbide'.length);
    f.setUser(null); assert.equal((await f.list(params)).status, 401);
    f.setUser({ id: 3, onlineRole: 'installer' }); assert.equal((await f.list(params)).status, 403);
    f.setUser({ id: 1, name: '시험직원', onlineRole: 'staff' });
    const response = await f.list(params);
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  } finally { f.db.close(); }
});

test("carbide photo references preserve existing images, reject cross-record copies and disappear only after saved removal", async () => {
  const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#405060' } }).jpeg().toBuffer();
  const photo = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  const f = fixture();
  try {
    const body = sample({ id: randomUUID(), photos: [photo] }); await f.save(body);
    const ref = model.carbidePhotoUrl(body.id, 0, 1);
    const second = sample({ id: randomUUID() }); await f.save(second);
    assert.equal((await f.save({ ...second, revision: 1, photos: [ref] }, 'PUT')).status, 400);
    assert.equal((await f.save(sample({ id: randomUUID(), photos: [ref] }))).status, 400);
    assert.equal((await f.list(`?id=${second.id}`)).status, 200);
    const { photos, ...legacyBody } = body;
    const preserved = await f.save({ ...legacyBody, revision: 1, memo: 'legacy update without photos' }, 'PUT');
    assert.equal(preserved.status, 200);
    const saved = (await preserved.json()).data;
    assert.equal(saved.photos.length, 1); assert.equal(saved.revision, 2);
    assert.equal((await f.list(ref.slice('/api/carbide'.length))).status, 404);
    f.failSave(true);
    assert.equal((await f.save({ ...body, revision: 2, photos: [] }, 'PUT')).status, 503);
    f.failSave(false);
    assert.equal((await (await f.list(`?id=${body.id}`)).json()).data.photos.length, 1);
    const updated = await f.save({ ...body, revision: 2, photos: [saved.photos[0]], memo: 'keep reference' }, 'PUT');
    assert.equal(updated.status, 200);
    const latest = (await updated.json()).data;
    assert.equal((await f.save({ ...body, revision: 3, photos: [saved.photos[0]] }, 'PUT')).status, 400);
    assert.equal((await f.save({ ...body, revision: 3, photos: [] }, 'PUT')).status, 200);
    assert.equal((await (await f.list(`?id=${body.id}`)).json()).data.photos.length, 0);
    assert.equal((await f.list(latest.photos[0].slice('/api/carbide'.length))).status, 404);
  } finally { f.db.close(); }
});

test("carbide photo validation rejects oversized, spoofed, invalid and unsupported images", async () => {
  const valid = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#445566' } }).png().toBuffer();
  const uri = `data:image/png;base64,${valid.toString('base64')}`;
  const f = fixture();
  try {
    for (const photos of [[uri, uri, uri, uri, uri], ['https://example.com/photo.png'], ['data:image/svg+xml;base64,PHN2Zz4='], ['data:image/png;base64,bm90IGFuIGltYWdl'], [`data:image/jpeg;base64,${valid.toString('base64')}`], [`data:image/png;base64,${Buffer.alloc(500 * 1024 + 1).toString('base64')}`]]) assert.equal((await f.save(sample({ id: randomUUID(), photos }))).status, 400);
    const tooWide = await sharp({ create: { width: 1921, height: 1, channels: 3, background: '#445566' } }).png().toBuffer();
    assert.equal((await f.save(sample({ photos: [`data:image/png;base64,${tooWide.toString('base64')}`] }))).status, 400);
    assert.equal((await (await f.list()).json()).data.count, 0);
    const access = load('src/lib/photo-access.ts');
    assert.equal(access.isProtectedPhoto(model.carbidePhotoUrl(randomUUID(), 0, 1)), true);
    assert.equal(access.isProtectedPhoto('https://other.test/api/carbide?photo=private'), false);
  } finally { f.db.close(); }
});
