import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { Script } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import sharp from "sharp";

function loadConfig(path) {
  const exports = {};
  new Script(ts.transpileModule(readFileSync(path, "utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText).runInNewContext({exports});
  return exports.default;
}

function worker(fetcher) {
  const handlers = new Map(), added = [], deleted = [];
  const self = {location:{origin:"https://balononline.vercel.app"},addEventListener:(name,callback)=>handlers.set(name,callback),skipWaiting:async()=>{},clients:{claim:async()=>{}}};
  const caches = {open:async()=>({add:async url=>added.push(url)}),keys:async()=>["balon-pwa-offline-v0","balon-pwa-offline-v1","another-app"],delete:async key=>deleted.push(key),match:async()=>new Response("연결 확인")};
  new Script(readFileSync("public/sw.js","utf8")).runInNewContext({self,caches,fetch:fetcher,URL,Response});
  return {handlers,added,deleted};
}

test("PWA manifest has standalone launch and valid home screen icons", async () => {
  const manifest = loadConfig("src/app/manifest.ts")();
  assert.equal(manifest.id,"/");
  assert.equal(manifest.scope,"/");
  assert.equal(manifest.start_url,"/");
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.short_name,"BALON");
  for (const icon of manifest.icons) {
    const path="public"+icon.src;
    assert.ok(existsSync(path));
    const metadata=await sharp(path).metadata();
    assert.equal(`${metadata.width}x${metadata.height}`,icon.sizes);
  }
  assert.equal((await sharp("public/icons/apple-touch-icon.png").metadata()).width,180);
  const config=loadConfig("next.config.ts");
  const headers=(await config.headers()).find(value=>value.source==="/sw.js").headers;
  assert.ok(headers.some(value=>value.key==="Cache-Control"&&value.value.includes("no-store")));
});

test("service worker only caches its public offline notice and cleans up its own old cache", async () => {
  const {handlers,added,deleted}=worker(async()=>new Response("live"));
  let pending;
  handlers.get("install")({waitUntil:value=>{pending=value;}});await pending;
  assert.deepEqual(added,["/offline.html"]);
  handlers.get("activate")({waitUntil:value=>{pending=value;}});await pending;
  assert.deepEqual(deleted,["balon-pwa-offline-v0"]);
});

test("service worker never intercepts API requests, uploads or cross origin traffic", () => {
  const {handlers}=worker(()=>{throw Error("must not fetch");});
  for (const request of [
    {method:"POST",mode:"navigate",url:"https://balononline.vercel.app/api/upload"},
    {method:"GET",mode:"navigate",url:"https://balononline.vercel.app/api/posts?token=private"},
    {method:"GET",mode:"navigate",url:"https://balononline.vercel.app/api"},
    {method:"GET",mode:"cors",url:"https://balononline.vercel.app/api/posts"},
    {method:"GET",mode:"navigate",url:"https://elsewhere.example/work"},
  ]) handlers.get("fetch")({request,respondWith:()=>assert.fail("unexpected interception")});
});

test("service worker serves live pages and shows offline notice only when navigation fails", async () => {
  let fail=false;
  const {handlers,added}=worker(async()=>{if(fail)throw Error("offline");return new Response("live page",{status:401});});
  const request={method:"GET",mode:"navigate",url:"https://balononline.vercel.app/work"};
  let response;
  handlers.get("fetch")({request,respondWith:value=>{response=value;}});
  assert.equal((await response).status,401);
  assert.equal(await (await response).text(),"live page");
  fail=true;
  handlers.get("fetch")({request,respondWith:value=>{response=value;}});
  assert.equal(await (await response).text(),"연결 확인");
  assert.deepEqual(added,[]);
});
