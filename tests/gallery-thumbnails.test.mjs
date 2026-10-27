import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
function load(db, read) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync("src/lib/gallery-thumbnail.ts", "utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  new Script(`(function(require,module,exports){${code}\n})`).runInThisContext()(
    name => name === "@/lib/db" ? {db} : name === "@/lib/r2-storage" ? {readConstructionPhoto:read} : require(name), module, module.exports);
  return module.exports;
}
test("R2 preview persists as small WebP and survives a cold memory cache", async () => {
  const db = require("@libsql/client").createClient({url:"file::memory:"});
  try {
    const original = await sharp({create:{width:2400,height:1800,channels:3,background:"red"}}).png().toBuffer();
    let reads=0;
    const read=async()=>{reads++;return {bytes:original}};
    const url="/api/construction-photo?key=construction-photos%2F2026-10-27%2Faaaa.webp";
    const first=await load(db,read).photoResponse(url,"https://balon.test",240,"photo:1");
    const bytes=Buffer.from(await first.arrayBuffer());
    assert.equal(first.headers.get("content-type"),"image/webp");
    assert.ok(bytes.length<=24000);
    assert.equal((await sharp(bytes).metadata()).width,240);
    const second=await load(db,read).photoResponse(url,"https://balon.test",240,"photo:1");
    assert.deepEqual(Buffer.from(await second.arrayBuffer()),bytes);
    assert.equal(reads,1);
    await load(db,read).photoResponse(url.replace("aaaa", "bbbb"),"https://balon.test",240,"photo:1");
    assert.equal(reads,2,"changed original invalidates the stored preview");
  } finally { db.close(); }
});
test("concurrent duplicate preview requests decode the original once; originals remain intact", async () => {
  let reads=0;
  const original=await sharp({create:{width:800,height:600,channels:3,background:"blue"}}).png().toBuffer();
  const api=load(null,async()=>{reads++;return {bytes:original}});
  const url="/api/construction-photo?key=example";
  await Promise.all(Array.from({length:6},()=>api.photoResponse(url,"https://balon.test",160,"same")));
  assert.equal(reads,1);
  const raw=await api.photoResponse(`data:image/png;base64,${original.toString("base64")}`,"https://balon.test",null,"raw");
  assert.deepEqual(Buffer.from(await raw.arrayBuffer()),original);
});
test("detailed noisy previews stay under 24KB; upload paths cannot escape storage", async () => {
  const {randomBytes} = require("node:crypto");
  const original = await sharp(randomBytes(640*640*3), {raw:{width:640,height:640,channels:3}}).png().toBuffer();
  const api=load(null,async()=>({bytes:original}));
  const response=await api.photoResponse("/api/construction-photo?key=noise","https://balon.test",480,"noise");
  assert.ok((await response.arrayBuffer()).byteLength<=24000);
  const denied=await api.photoResponse("/uploads/../secret","https://balon.test",240,"escape");
  assert.equal(denied.status,400);
});
