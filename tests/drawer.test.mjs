import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { createClient } from "@libsql/client";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
function load(file, mocks = {}, cache = new Map()) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path).exports;
  const loadedModule = { exports: {} }; cache.set(path, loadedModule);
  const require = name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) return name.endsWith(".json") ? JSON.parse(readFileSync(`src/${name.slice(2)}`, "utf8")) : load(`src/${name.slice(2)}.ts`, mocks, cache);
    if (name.startsWith(".")) return load(resolve(dirname(path), `${name}.ts`), mocks, cache);
    return nativeRequire(name);
  };
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function("require", "module", "exports", code)(require, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const engine = load("src/lib/drawerEngine.ts");
const pricing = load("src/lib/drawer-pricing.ts");
const packing = load("src/lib/drawer-packing.ts");
const baseline = { productType: "ceiling-floor", cabinetWidth: 580, cabinetHeight: 627, cabinetDepth: 400, boardThickness: 18, drawerCount: 3, railType: "ball3stage", marginGap: 3, hasGrain: true, cabinetQuantity: 1 };

test("580 three-drawer review applies each corrected cut, thickness and all sixteen hardware quantities", () => {
  const result = engine.calculateDrawer(baseline);
  assert.deepEqual(result.parts.map(p => [p.width, p.depth, p.thickness, p.count]), [
    [580,400,18,1], [601,380,18,2], [576,180,18,3], [543,55,18,2], [556,582,5,1],
    [350,145,15,6], [486,144,15,6], [499,332,5,3], [319,50,15,3],
  ]);
  assert.equal(result.input.cabinetHeight, 627);
  assert.equal(engine.calculateDrawer({ ...baseline, cabinetHeight: 900 }).parts.find(p => p.name === "뒤판우라").depth, 582);
  assert.match(result.parts.find(p => p.name === "뒤판우라").machining, /홈 끼움/);
  assert.equal(result.hardware.length, 16);
  assert.deepEqual(result.hardware.map(h => h.count), [4,2,4,2,2,12,9,4,30,24,12,9,9,60,4,16]);
  assert.equal(result.hardware.reduce((sum, h) => sum + h.count, 0), 203);
  assert.ok(result.hardware.every(h => h.unit === "개"));
  const batch = engine.calculateDrawer({ ...baseline, cabinetWidth: 680, cabinetQuantity: 2, backPanelHeight: 577 });
  assert.equal(batch.parts[0].width, 680); assert.equal(batch.parts[4].depth, 577);
  assert.equal(batch.parts[6].width, 586); assert.equal(batch.parts[7].width, 599);
  batch.parts.forEach((p, i) => assert.equal(p.count, result.parts[i].count * 2));
  batch.hardware.forEach((h, i) => assert.equal(h.count, result.hardware[i].count * 2));
  for (const value of [NaN, 0, -1, 1201]) assert.throws(() => engine.calculateDrawer({ ...baseline, backPanelHeight: value }));
});

test("whole-batch packing shares sheets, preserves every part and never overlaps or crosses sheet boundaries", () => {
  for (const width of [300, 580, 1200]) for (const hasGrain of [true, false]) for (const quantity of [1, 2, 5, 100]) {
    const result = engine.calculateDrawer({ ...baseline, cabinetWidth: width, hasGrain, cabinetQuantity: quantity });
    for (const estimate of result.sheetEstimates) {
      const expected = result.parts.filter(p => p.thickness === estimate.thickness);
      const actual = estimate.sheets.flatMap(s => s.placedPieces);
      assert.equal(actual.length, expected.reduce((sum, p) => sum + p.count, 0));
      for (const p of expected) assert.equal(actual.filter(a => a.name === p.name).length, p.count);
      for (const sheet of estimate.sheets) for (const [i, p] of sheet.placedPieces.entries()) {
        assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.pw <= 1220 && p.y + p.ph <= 2440);
        assert.equal((p.pw - 4) * (p.ph - 4), p.width * p.depth);
        if (hasGrain) assert.ok(p.ph >= p.pw);
        for (const other of sheet.placedPieces.slice(i + 1)) assert.ok(p.x + p.pw <= other.x || other.x + other.pw <= p.x || p.y + p.ph <= other.y || other.y + other.ph <= p.y);
      }
      const area = expected.reduce((sum, p) => sum + p.width * p.depth * p.count, 0) / 1e6;
      assert.ok(Math.abs(estimate.totalPartsArea - area) < 0.000001);
      assert.equal(estimate.efficiency, Number((area / (estimate.sheetCount * 1.22 * 2.44) * 100).toFixed(1)));
    }
  }
  const one = engine.calculateDrawer(baseline), two = engine.calculateDrawer({ ...baseline, cabinetQuantity: 2 });
  assert.ok(two.totalSheetsAllMaterials < one.totalSheetsAllMaterials * 2);
  const oneCost = pricing.calculateDrawerCost(one, pricing.emptyDrawerPrices()), twoCost = pricing.calculateDrawerCost(two, pricing.emptyDrawerPrices());
  assert.ok(twoCost.remainingAreaPerCabinet < oneCost.remainingAreaPerCabinet);
  assert.throws(() => packing.calculateSheetEstimates([{ name: "oversize", width: 3000, depth: 1400, thickness: 18, count: 1, material: "18T" }], false), /들어가지/);
});

test("purchase-sheet and hardware costs use saved unit prices, missing differs from zero, and rounding preserves fractional prices", () => {
  const result = engine.calculateDrawer({ ...baseline, cabinetQuantity: 2 });
  const prices = Object.fromEntries(pricing.DRAWER_PRICE_ITEMS.map(item => [item.id, item.id.startsWith("sheet-") ? 10000 : 0.5]));
  const cost = pricing.calculateDrawerCost(result, prices);
  assert.equal(cost.hardwareTotal, 203);
  assert.equal(cost.total, result.totalSheetsAllMaterials * 10000 + 203);
  assert.equal(cost.perCabinet, cost.total / 2);
  assert.equal(pricing.calculateDrawerCost(result, { ...prices, "top-connectors": null }).total, null);
  assert.equal(pricing.calculateDrawerCost(result, { ...prices, "top-connectors": 0 }).missing.length, 0);
  assert.equal(pricing.calculateDrawerCost(engine.calculateDrawer({ ...baseline, drawerCount: 2 }), prices), null);
  for (const invalid of [-1, Infinity, NaN, "1", 0.001, 100000001]) assert.throws(() => pricing.validateDrawerPriceBook({ revision: 0, prices: { ...prices, "top-connectors": invalid } }));
  assert.throws(() => pricing.validateDrawerPriceBook({ revision: 0, prices: { ...prices, extra: 100 } }));
  assert.deepEqual(pricing.validateDrawerPriceBook({ revision: 0, prices }).prices, prices);
});

function fixture(db = createClient({ url: "file::memory:" })) {
  let user = { id: "test-staff", onlineRole: "staff" };
  const handler = load("src/lib/api-handlers/drawer-prices.ts", { "@/lib/db": { db }, "./auth": { VERIFY: async () => user ? Response.json({ user }) : new Response(null, { status: 401 }) } });
  const request = (method, body) => new Request("https://test.local/api/drawer-prices", { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }) });
  return { db, handler, request, setUser: value => { user = value; } };
}
test("price persistence reopens with fractional prices and rejects stale writes, foreign items and unauthorized users", async () => {
  const f = fixture();
  try {
    f.setUser(null); assert.equal((await f.handler.GET(f.request("GET"))).status, 401);
    f.setUser({ onlineRole: "installer" });
    for (const method of ["GET", "PUT"]) assert.equal((await f.handler[method](f.request(method))).status, 403);
    assert.equal((await f.db.execute("SELECT name FROM sqlite_master WHERE name='bo_drawer_prices'")).rows.length, 0);
    f.setUser({ id: "test-staff", onlineRole: "staff" });
    const initial = (await (await f.handler.GET(f.request("GET"))).json()).data;
    assert.equal(initial.revision, 0); assert.ok(Object.values(initial.prices).every(v => v === null));
    const prices = { ...initial.prices, "top-connectors": 0.5, "sheet-18": 45000 };
    assert.equal((await f.handler.PUT(f.request("PUT", { prices, revision: 0 }))).status, 200);
    const fresh = fixture(f.db);
    const stored = (await (await fresh.handler.GET(fresh.request("GET"))).json()).data;
    assert.equal(stored.prices["top-connectors"], 0.5); assert.equal(stored.revision, 1);
    assert.equal((await f.handler.PUT(f.request("PUT", { prices: initial.prices, revision: 0 }))).status, 409);
    assert.equal((await f.handler.PUT(f.request("PUT", { prices: { ...prices, unlisted: 1 }, revision: 1 }))).status, 400);
    const unchanged = (await (await f.handler.GET(f.request("GET"))).json()).data;
    assert.deepEqual(unchanged, stored);
    await f.db.execute("CREATE TRIGGER fail_price BEFORE UPDATE ON bo_drawer_prices BEGIN SELECT RAISE(ABORT,'test failure'); END");
    assert.equal((await f.handler.PUT(f.request("PUT", { prices: initial.prices, revision: 1 }))).status, 503);
    assert.equal((await (await f.handler.GET(f.request("GET"))).json()).data.prices["sheet-18"], 45000);
  } finally { f.db.close(); }
  const absent = fixture(null);
  assert.equal((await absent.handler.GET(absent.request("GET"))).status, 503);
  assert.equal((await absent.handler.PUT(absent.request("PUT", { revision: 0, prices: pricing.emptyDrawerPrices() }))).status, 503);
});

test("reference document retains original PNG bytes, is available without DB, and requires staff access", async () => {
  const reference = load("src/lib/drawer-reference.ts");
  let user = { onlineRole: "staff" };
  const handler = load("src/lib/api-handlers/documents.ts", { "@/lib/db": { db: null }, "./auth": { VERIFY: async () => user ? Response.json({ user }) : new Response(null, { status: 401 }) } });
  const req = query => new Request(`https://test.local/api/documents?${query}`);
  const detail = (await (await handler.GET(req(`id=${reference.DRAWER_REFERENCE.id}`))).json()).data;
  assert.equal(detail.attachments.length, 1);
  const result = await handler.GET(req(`file=${detail.attachments[0].id}`));
  const bytes = Buffer.from(await result.arrayBuffer());
  assert.equal(bytes.subarray(0,8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.length, detail.attachments[0].size);
  const { createHash } = nativeRequire("node:crypto");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "034b4650274ddaf2da6376a52a328114e503460ff5cca3cbe6a8cc99702f8a4c");
  user = { onlineRole: "installer" }; assert.equal((await handler.GET(req(`file=${detail.attachments[0].id}`))).status, 403);
  user = null; assert.equal((await handler.GET(req(`id=${reference.DRAWER_REFERENCE.id}`))).status, 401);
});
