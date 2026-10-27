import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);

// Isolated module graphs keep tests away from real Turso credentials and records.
function loadModule(file, mocks = {}, globals = {}, cache = new Map()) {
  const requestedPath = resolve(file);
  const path = [requestedPath, requestedPath.replace(/\.ts$/, ".tsx"), requestedPath.replace(/\.ts$/, "/index.ts")].find(existsSync) ?? requestedPath;
  if (cache.has(path)) return cache.get(path).exports;
  const loaded = { exports: {} };
  cache.set(path, loaded);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const require = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) return loadModule(`src/${name.slice(2)}.ts`, mocks, globals, cache);
    if (name.startsWith("./")) return loadModule(resolve(path, "..", `${name}.ts`), mocks, globals, cache);
    return nativeRequire(name);
  };
  new Script(`(function(require, module, exports) { ${code}\n})`, { filename: path })
    .runInNewContext({ ...globalThis, console, Buffer, URL, URLSearchParams, Headers, Request, Response, Intl, AbortSignal, process: { env: { NODE_ENV: "production" } }, crypto: globalThis.crypto, ...globals })(require, loaded, loaded.exports);
  return loaded.exports;
}

const request = (body) => ({ json: async () => body });

test("installer API access is limited to visible calendar tasks, photos and new comments", async () => {
  const database=nativeRequire("@libsql/client").createClient({url:"file::memory:"});
  await database.executeMultiple("CREATE TABLE bo_work_items(id TEXT,calendar_visible INTEGER,deadline_type TEXT,delivery_date TEXT,due_date TEXT);CREATE TABLE bo_work_item_comments(id TEXT,work_item_id TEXT,images TEXT);CREATE TABLE bo_attachments(id TEXT,work_item_id TEXT,url TEXT);INSERT INTO bo_work_items VALUES('visible',1,'시공일','2026-10-24',''),('hidden',0,'시공일','2026-10-24',''),('undated',1,'시공일','','');INSERT INTO bo_work_item_comments VALUES('comment-visible','visible','[]'),('comment-hidden','hidden','[]');INSERT INTO bo_attachments VALUES('att-visible','visible','/test'),('att-hidden','hidden','/test');");
  let user={id:4,onlineRole:"installer",role:"시공자"};
  const {authorizeApi}=loadModule("src/lib/api-access.ts",{"@/lib/api-handlers/auth":{VERIFY:async()=>user?Response.json({user}):new Response("",{status:401})},"@/lib/work-calendar-schema":{ensureWorkCalendarSchema:async()=>{}},"@/lib/db":{executeQuery:async(sql,args)=>({success:true,rows:(await database.execute({sql,args})).rows})}});
  const check=(path,method="GET",body)=>authorizeApi(new Request("https://app.test/api/"+path,{method,...(body?{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{})}),path.split("?")[0]);
  try {
    assert.equal(await check("posts?type=work&summary=1&mode=calendar"),null);
    assert.equal(await check("posts?type=work&id=visible"),null);
    for(const path of ["posts?type=work&id=hidden","posts?type=work&id=undated","posts?type=work","posts?type=as","posts?type=work&summary=1","users","dashboard","storage-usage","gallery?limit=30","posts?type=work&attachment_id=att-hidden","gallery?source=comment&id=comment-hidden"])assert.equal((await check(path)).status,403,path);
    assert.equal(await check("posts?type=work&attachment_id=att-visible"),null);
    assert.equal(await check("gallery?source=comment&id=comment-visible"),null);
    assert.equal(await check("comments","POST",{workItemId:"visible",content:"완료",images:["data:image/jpeg;base64,aA=="]}),null);
    assert.equal((await check("comments","POST",{workItemId:"hidden",content:"test"})).status,403);
    assert.equal((await check("comments","POST",{workItemId:"visible",images:["/api/construction-photo?key=other"]})).status,403);
    for(const method of ["PUT","DELETE"])assert.equal((await check("posts?type=work&id=visible",method)).status,403);
    assert.equal((await check("comments?id=comment-visible","DELETE")).status,403);
    user={id:1,onlineRole:"staff"};assert.equal(await check("purchases"),null);
    user=null;assert.equal((await check("posts?type=work&id=visible")).status,401);assert.equal(await check("auth","POST"),null);
  } finally {database.close();}
});

test("online signup uses shared users with pending staff approval and fixed installer rank", async () => {
  const writes=[];let duplicate=false;
  const {REGISTER}=loadModule("src/lib/api-handlers/auth.ts",{"@/lib/db":{db:{},executeQuery:async()=>({success:true,rows:duplicate?[{id:1}]:[]}),executeMutation:async(sql,args)=>writes.push({sql,args})}});
  const input={loginId:"installer01",password:"password123",name:"시공자",phone:"010-1234-5678",accountType:"installer",level:0,status:"APPROVED",manager_rank:"관리자"};
  assert.equal((await REGISTER(request(input))).status,201);
  assert.match(writes[0].sql,/'PENDING'/);assert.match(writes[0].sql,/,4,/);assert.equal(writes[0].args.at(-1),"시공자");
  duplicate=true;assert.equal((await REGISTER(request(input))).status,409);assert.equal(writes.length,1);
  assert.equal((await REGISTER(request({...input,accountType:"admin"}))).status,400);
});

test("API bridge enforces login on every method and uses the verified comment author", async () => {
  let user=null,captured;
  const mocks={"@/lib/api-handlers/auth":{VERIFY:async()=>user?Response.json({success:true,user}):new Response("",{status:401})},"@/lib/db":{db:{},executeQuery:async()=>({success:true,rows:[{id:"visible"}]})},"@/lib/work-calendar-schema":{ensureWorkCalendarSchema:async()=>{}},"@/lib/api-handlers/comments":{POST:async request=>{captured=await request.json();return Response.json({success:true});}}};
  const bridge=loadModule("api/index.ts",mocks);
  for(const method of ["GET","POST","PUT","PATCH","DELETE"]){const req=new Request("https://app.test/api/posts",{method});assert.equal((await bridge[method](req)).status,401,method);}
  user={id:9,name:"확인된 시공자",onlineRole:"installer"};
  const response=await bridge.POST(new Request("https://app.test/api/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workItemId:"visible",author:"관리자 사칭",content:"사진 등록"})}));
  assert.equal(response.status,200);assert.equal(captured.author,user.name);
  assert.equal((await bridge.PUT(new Request("https://app.test/api/posts?type=work&id=visible",{method:"PUT"}))).status,403);
});

test("mobile installer menu exposes calendar and a real account instead of staff management menus", () => {
  const React=nativeRequire("react"),{renderToStaticMarkup}=nativeRequire("react-dom/server");
  const mocks={"next/navigation":{usePathname:()=>"/calendar"},"@/context/AuthContext":{useAuth:()=>({user:{name:"테스트 시공자",role:"시공자",onlineRole:"installer"},logout(){}})},"@/context/DataContext":{useData:()=>({metrics:{inProgressTasks:3},images:[],purchaseItems:[]})}};
  const {MobileDrawer}=loadModule("src/components/layout/MobileDrawer.tsx",mocks);
  const html=renderToStaticMarkup(React.createElement(MobileDrawer,{isOpen:true,onClose(){}}));
  assert.match(html,/테스트 시공자/);assert.match(html,/href="\/calendar"/);assert.doesNotMatch(html,/href="\/(work|as|purchases|gallery|equipment|drawer|materials)"/);
  const {MobileHeader}=loadModule("src/components/layout/MobileHeader.tsx",mocks);
  assert.match(renderToStaticMarkup(React.createElement(MobileHeader,{onOpenDrawer(){}})),/로그인 계정 및 로그아웃/);
});

test("shared-account installer signup, approval, login renewal and revocation round trip", async () => {
  const database=nativeRequire("@libsql/client").createClient({url:"file::memory:"});
  await database.execute("CREATE TABLE users(id INTEGER PRIMARY KEY,login_id TEXT UNIQUE,password TEXT,name TEXT,phone TEXT,email TEXT,level INTEGER,status TEXT,client_id INTEGER,company_name TEXT,manager_rank TEXT)");
  const query=async(sql,args=[])=>({success:true,rows:(await database.execute({sql,args})).rows});
  const auth=loadModule("src/lib/api-handlers/auth.ts",{"@/lib/db":{db:{},executeQuery:query,executeMutation:query}},{process:{env:{JWT_SECRET:"isolated-session-secret",NODE_ENV:"production"}}});
  try {
    const input={loginId:"crew1",password:"password123",name:"시공 사용자",phone:"010-1234-5678",accountType:"installer"};
    assert.equal((await auth.REGISTER(request(input))).status,201);
    assert.equal((await auth.LOGIN(request({loginId:input.loginId,password:input.password}))).status,401);
    await database.execute("UPDATE users SET status='APPROVED'");
    const login=await auth.LOGIN(request({loginId:input.loginId,password:input.password}));
    assert.equal(login.status,200);const body=await login.json();assert.equal(body.user.onlineRole,"installer");assert.match(login.headers.get("set-cookie"),/Max-Age=2592000/);
    const verifyRequest=new Request("https://app.test/api/auth",{headers:{Authorization:`Bearer ${body.token}`}});
    const renewed=await auth.VERIFY(verifyRequest);assert.equal(renewed.status,200);assert.ok((await renewed.json()).token);
    await database.execute("UPDATE users SET level=2");
    assert.equal((await auth.VERIFY(verifyRequest)).status,401);
    await database.execute("UPDATE users SET level=4,status='PENDING'");
    assert.equal((await auth.VERIFY(verifyRequest)).status,401);
  } finally {database.close();}
});

test("protected photo loading sends the restored Bearer token without relying on cookies", async () => {
  let input;
  let response=new Response(new Uint8Array([1,2]),{headers:{"content-type":"image/jpeg"}});
  const access=loadModule("src/lib/photo-access.ts",{},{fetch:async(url,init)=>{input={url,init};return response;},Response});
  const signal=new AbortController().signal;
  const blob=await access.fetchPhotoBlob("/api/gallery?source=comment&id=test&index=0","restored-token",signal);
  assert.equal(blob.size,2);assert.equal(input.init.headers.Authorization,"Bearer restored-token");
  assert.equal(input.url.includes("restored-token"),false);assert.equal(input.init.credentials,"same-origin");
  await assert.rejects(access.fetchPhotoBlob("https://other.example/photo.jpg","restored-token",signal),/Invalid photo/);
  response=new Response("{}",{headers:{"content-type":"application/json"}});
  await assert.rejects(access.fetchPhotoBlob("/api/construction-photo?key=test","restored-token",signal));
  response=new Response("denied",{status:401});
  await assert.rejects(access.fetchPhotoBlob("/api/construction-photo?key=test","restored-token",signal));
});

test("verified localStorage session restores the image cookie before publishing its token", async () => {
  const React=nativeRequire("react");let effect;const events=[];
  const hookReact={...React,useRef:value=>({current:value}),useState:initial=>[initial,value=>events.push(value)],useEffect:fn=>{effect=fn;}};
  const store=new Map([["baron_auth_token","cached-token"]]);
  const document={set cookie(value){events.push({cookie:value});},get cookie(){return "";}};
  const auth=loadModule("src/context/AuthContext.tsx",{react:hookReact},{URLSearchParams,document,window:{location:{search:"",protocol:"https:"},addEventListener(){},removeEventListener(){},setInterval(){return 1;},clearInterval(){}},localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)},fetch:async()=>({ok:true,status:200,json:async()=>({success:true,user:{name:"직원"}})})});
  auth.AuthProvider({children:null});effect();await new Promise(resolve=>setTimeout(resolve,0));
  const cookieIndex=events.findIndex(value=>value?.cookie);
  assert.ok(cookieIndex>=0);assert.match(events[cookieIndex].cookie,/baron_auth_token=cached-token; path=\//);
  assert.match(events[cookieIndex].cookie,/SameSite=Lax; Secure/);
  assert.ok(cookieIndex<events.indexOf("cached-token"));
});

test("R2 photo deletion targets only app keys, deduplicates and propagates failures", async () => {
  const calls=[];let failed=false;
  class Command {constructor(input){this.input=input;}}
  const sdk={DeleteObjectCommand:Command,S3Client:class {destroy(){} async send(command){calls.push(command.input);if(failed)throw new Error("R2 failed");}}};
  const storage=loadModule("src/lib/r2-storage.ts",{"@aws-sdk/client-s3":sdk},{process:{env:{R2_ACCOUNT_ID:"account",R2_ACCESS_KEY_ID:"key",R2_SECRET_ACCESS_KEY:"secret",R2_BUCKET_NAME:"balononline"}}});
  const url="/api/construction-photo?key=construction-photos%2F2026-10-23%2Fabc.jpg";
  await storage.deleteConstructionPhotos([url,url,"data:image/jpeg;base64,aA==","https://other.example/photo.jpg","/uploads/old.jpg"]);
  assert.equal(calls.length,1);assert.equal(calls[0].Key,"construction-photos/2026-10-23/abc.jpg");assert.equal(calls[0].Bucket,"balononline");
  await assert.rejects(storage.deleteConstructionPhotos(["/api/construction-photo?key=../secret"]));
  assert.equal(calls.length,1);
  failed=true;await assert.rejects(storage.deleteConstructionPhotos([url]),/R2 failed/);
});

test("gallery deletion removes the selected R2 file before clearing its database reference", async () => {
  const events=[];let failed=false,allowed=true;
  const urls=["/api/construction-photo?key=construction-photos%2F2026-10-23%2Fabc.jpg","data:image/jpeg;base64,aA=="];
  const handler=loadModule("src/lib/api-handlers/gallery.ts",{
    "./auth":{VERIFY:async()=>new Response("",{status:allowed?200:401})},
    "@/lib/db":{db:{},executeQuery:async()=>({success:true,rows:[{images:JSON.stringify(urls)}]}),executeMutation:async(sql,args)=>{events.push({type:"db",sql,args});}},
    "@/lib/r2-storage":{deleteConstructionPhotos:async photos=>{events.push({type:"r2",photos});if(failed)throw new Error("R2 failed");}}
  },{Response});
  const req={url:"http://localhost/api/gallery?type=image&id=comment-cmt-test-0"};
  assert.equal((await handler.DELETE(req)).status,200);assert.equal(events[0].type,"r2");assert.equal(events[0].photos[0],urls[0]);
  assert.equal(JSON.parse(events[1].args[0])[0],"");assert.equal(JSON.parse(events[1].args[0])[1],urls[1]);
  events.length=0;failed=true;
  assert.equal((await handler.DELETE(req)).status,500);assert.equal(events.length,1);
  events.length=0;allowed=false;
  assert.equal((await handler.DELETE(req)).status,401);assert.equal(events.length,0);
});

test("deleting a comment or work also removes its R2 photos and stops on storage failure", async () => {
  for(const file of ["comments","posts"]){
    const events=[];let failed=false;
    const handler=loadModule(`src/lib/api-handlers/${file}.ts`,{
      "./auth":{VERIFY:async()=>new Response("",{status:200})},
      "@/lib/db":{db:{},executeQuery:async sql=>({success:true,rows:sql.includes("SELECT images")?[{images:JSON.stringify(["/api/construction-photo?key=test"])}]:[]}),executeMutation:async()=>{events.push("db");}},
      "@/lib/r2-storage":{deleteConstructionPhotos:async photos=>{assert.equal(photos.length,1);events.push("r2");if(failed)throw new Error("offline");}}
    },{Response});
    const req={url:file==="comments"?"http://localhost/api/comments?id=cmt-test&workItemId=work-test":"http://localhost/api/posts?id=work-test&type=work"};
    assert.equal((await handler.DELETE(req)).status,200);assert.equal(events[0],"r2");assert.ok(events.includes("db"));
    events.length=0;failed=true;
    assert.equal((await handler.DELETE(req)).status,500);assert.equal(events.join(","),"r2");
  }
});

test("storage usage includes every bucket page, caches totals and warns only above 8 GB", async () => {
  const calls=[];
  let fail=false;
  let over=false;
  class Command { constructor(input) {this.input=input;} }
  const sdk={ListObjectsV2Command:Command,PutObjectCommand:Command,S3Client:class {destroy(){} async send(command){
    calls.push(command.input);
    if(fail)throw new Error("Unavailable");
    if(command.input.Body)return {};
    if(!command.input.ContinuationToken)return {Contents:[{Key:"img/old.jpg",Size:4_000_000_000}],IsTruncated:true,NextContinuationToken:"next"};
    return {Contents:[{Key:"construction-photos/new.jpg",Size:4_000_000_000+(over?1:0)}],IsTruncated:false};
  }}};
  const globals={process:{env:{R2_ACCOUNT_ID:"account",R2_ACCESS_KEY_ID:"key",R2_SECRET_ACCESS_KEY:"secret",R2_BUCKET_NAME:"balononline"}}};
  const storage=loadModule("src/lib/r2-storage.ts",{"@aws-sdk/client-s3":sdk},globals);
  const [one,two]=await Promise.all([storage.getStorageUsage(),storage.getStorageUsage()]);
  assert.equal(one.totalBytes,8_000_000_000);assert.equal(one.objectCount,2);assert.equal(one.overWarning,false);
  assert.equal(two.totalBytes,one.totalBytes);assert.equal(calls.length,2);assert.equal(calls[1].ContinuationToken,"next");
  assert.equal(calls[0].Prefix,undefined);
  await storage.getStorageUsage();assert.equal(calls.length,2);
  await storage.storeConstructionPhoto("data:image/jpeg;base64,aW1hZ2U=");
  over=true;
  assert.equal((await storage.getStorageUsage()).overWarning,true);
  fail=true;
  const unavailable=loadModule("src/lib/r2-storage.ts",{"@aws-sdk/client-s3":sdk},globals);
  await assert.rejects(unavailable.getStorageUsage(),/Unavailable/);
  fail=false;
  assert.equal((await unavailable.getStorageUsage()).totalBytes,8_000_000_001);
});

test("storage usage requires authentication and reports errors instead of zero bytes", async () => {
  let allowed=false,failed=false,reads=0;
  const handler=loadModule("src/lib/api-handlers/storage-usage.ts",{"./auth":{VERIFY:async()=>new Response("",{status:allowed?200:401})},"@/lib/r2-storage":{getStorageUsage:async()=>{reads++;if(failed)throw new Error("secret details");return {totalBytes:12,objectCount:1};}}},{Response});
  assert.equal((await handler.GET({})).status,401);assert.equal(reads,0);
  allowed=true;
  const response=await handler.GET({});assert.equal(response.status,200);assert.equal((await response.json()).data.totalBytes,12);
  assert.equal(response.headers.get("cache-control"),"private, no-store");
  failed=true;
  const failure=await handler.GET({});assert.equal(failure.status,503);assert.equal((await failure.json()).data,undefined);
});

test("R2 photos use server credentials, retain URL references and propagate storage failures", async () => {
  const calls=[];
  let fail=false;
  class Command { constructor(input) { this.input=input; } }
  const sdk={S3Client:class {async send(command) {calls.push(command.input);if(fail)throw new Error("R2 unavailable");return {Body:{transformToByteArray:async()=>new Uint8Array([1,2])},ContentType:"image/jpeg"};}},PutObjectCommand:Command,GetObjectCommand:Command};
  const storage=loadModule("src/lib/r2-storage.ts",{"@aws-sdk/client-s3":sdk},{process:{env:{R2_ACCOUNT_ID:"account",R2_ACCESS_KEY_ID:"key",R2_SECRET_ACCESS_KEY:"secret",R2_BUCKET_NAME:"balononline"}}});
  const url=await storage.storeConstructionPhoto("data:image/jpeg;base64,aW1hZ2U=");
  assert.match(url,/^\/api\/construction-photo\?key=/);
  assert.equal(calls[0].Bucket,"balononline");
  assert.equal(calls[0].Body.toString(),"image");
  assert.equal(await storage.storeConstructionPhoto(url),url);
  assert.equal(calls.length,1);
  const key=new URL(url,"http://localhost").searchParams.get("key");
  assert.equal((await storage.readConstructionPhoto(key)).contentType,"image/jpeg");
  await assert.rejects(storage.readConstructionPhoto("../secret"));
  fail=true;
  await assert.rejects(storage.storeConstructionPhoto("data:image/jpeg;base64,aW1hZ2U="),/R2 unavailable/);
});

test("private R2 photo endpoint checks employee session before reading objects", async () => {
  let reads=0;
  let allowed=false;
  const handler=loadModule("src/lib/api-handlers/construction-photo.ts",{"./auth":{VERIFY:async()=>new Response("",{status:allowed?200:401})},"@/lib/r2-storage":{readConstructionPhoto:async()=>{reads++;return {bytes:new Uint8Array([1]),contentType:"image/jpeg"};}}},{Response});
  const request={url:"http://localhost/api/construction-photo?key=construction-photos%2F2026-10-23%2Fabc.jpg"};
  assert.equal((await handler.GET(request)).status,401);
  assert.equal(reads,0);
  allowed=true;
  const response=await handler.GET(request);
  assert.equal(response.status,200);
  assert.equal(response.headers.get("cache-control"),"private, max-age=3600");
  assert.equal((await handler.GET({url:"http://localhost/api/construction-photo?key=../other"})).status,400);
  assert.equal(reads,1);
});

test("equipment stores photos, sums cost categories, filters dates and guards concurrent edits", async () => {
  const database=nativeRequire("@libsql/client").createClient({url:"file::memory:"});
  try {
    const mock={db:database,executeQuery:async(sql,args=[])=>{const result=await database.execute({sql,args});return {success:true,rows:result.rows};},executeMutation:async(sql,args=[])=>{const result=await database.execute({sql,args});return {success:true,rows:result.rows};}};
    const api=loadModule("src/lib/api-handlers/equipment.ts",{"@/lib/db":mock,"./auth":{VERIFY:async()=>new Response(JSON.stringify({user:{name:"정비 등록자"}}))}},{Response});
    const get=async(params="")=>await (await api.GET({url:"http://localhost/api/equipment?"+params})).json();
    const machine=await api.POST(request({entity:"machine",name:"1번 기계",status:"사용중",description:"절단기",serviceCompany:"공통 정비업체",contacts:[{company:"정비 업체",phone:"02-123-4567",technician:"담당기사",technicianPhone:"010-1234-5678"}]}));
    assert.equal(machine.status,201);const id=(await machine.json()).data.id;
    const second=await api.POST(request({entity:"machine",name:"2번 기계",status:"사용중"}));const secondId=(await second.json()).data.id;
    const photo="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9V8AAAAASUVORK5CYII=";
    const input={entity:"maintenance",machineId:id,date:"2026-10-21",title:"모터 교체",kind:"부품교체",costs:{travel:50000,parts:150000,self:0,other:10000},photos:[photo]};
    const response=await api.POST(request(input));assert.equal(response.status,201);const entry=(await response.json()).data.id;
    await api.POST(request({...input,machineId:secondId,date:"2026-09-01",costs:{travel:0,parts:0,self:30000,other:0},photos:[]}));
    let all=(await get()).data;assert.equal(all.totals.total,240000);assert.equal(all.totals.parts,150000);assert.equal(all.totals.self,30000);
    assert.equal(all.machines.find(m=>m.id===id).total,210000);
    assert.equal(all.machines.find(m=>m.id===id).contacts[0].technician,"담당기사");
    assert.equal((await get("from=2026-10-01&to=2026-10-31")).data.totals.total,210000);
    const timeline=await get("machine="+id);assert.equal(timeline.data.length,1);assert.ok(timeline.data[0].photos[0].startsWith("/api/equipment?photo="));assert.ok(!JSON.stringify(timeline).includes("base64"));
    const full=(await get("entry="+entry)).data;assert.equal(full.photos[0],photo);assert.equal(full.author,"정비 등록자");
    const image=await api.GET({url:"http://localhost/api/equipment?photo="+entry+"&index=0"});assert.equal(image.status,200);assert.equal(image.headers.get("Content-Type"),"image/png");
    assert.equal((await api.PUT(request({entity:"machine",id,revision:1,name:"재단기",status:"사용 종료"}))).status,200);
    assert.equal((await api.PUT(request({entity:"machine",id,revision:1,name:"오래된 수정",status:"사용중"}))).status,409);
    assert.equal((await api.PUT(request({...input,id:entry,revision:1,costs:{travel:0,parts:100000,self:0,other:0}}))).status,200);
    assert.equal((await api.PUT(request({...input,id:entry,revision:1}))).status,409);
    all=(await get()).data;assert.equal(all.totals.total,130000);assert.equal(all.machines.find(m=>m.id===id).name,"재단기");
    assert.equal(all.machines.find(m=>m.id===id).contacts[0].phone,"02-123-4567");
    assert.equal(all.machines.find(m=>m.id===id).serviceCompany,"공통 정비업체");
    assert.equal((await api.PUT(request({entity:"machine",id,revision:2,name:"재단기",status:"사용 종료",contacts:Array(4).fill({company:"업체"})}))).status,400);
    assert.equal((await api.PUT(request({entity:"machine",id,revision:2,name:"재단기",status:"사용 종료",contacts:[{company:"업체1"},{company:"업체2"},{company:"업체3",technician:"새 기사"}]}))).status,200);
    assert.equal((await get()).data.machines.find(m=>m.id===id).contacts[2].technician,"새 기사");
    assert.equal((await api.POST(request({...input,costs:{...input.costs,parts:-1}}))).status,400);
    assert.equal((await api.POST(request({...input,costs:{...input.costs,parts:1.5}}))).status,400);
    assert.equal((await api.POST(request({...input,date:"2026-02-30"}))).status,400);
    assert.equal((await api.POST(request({...input,photos:Array(5).fill(photo)}))).status,400);
    assert.equal((await api.POST(request({...input,machineId:"missing"}))).status,404);
    assert.equal((await api.GET({url:"http://localhost/api/equipment?from=2026-10-31&to=2026-10-01"})).status,400);
    for(let i=0;i<31;i++)await api.POST(request({...input,title:"점검 "+i,costs:{travel:0,parts:0,self:0,other:0},photos:[]}));
    const first=await get("machine="+id);const next=await get("machine="+id+"&offset=30");assert.equal(first.data.length,30);assert.equal(first.hasMore,true);assert.equal(next.data.length,2);assert.ok(!next.data.some(item=>first.data.some(old=>old.id===item.id)));
    assert.equal((await get()).data.totals.total,130000);
    const denied=loadModule("src/lib/api-handlers/equipment.ts",{"@/lib/db":mock,"./auth":{VERIFY:async()=>new Response("denied",{status:401})}},{Response});
    assert.equal((await denied.GET({url:"http://localhost/api/equipment"})).status,401);assert.equal((await denied.POST(request(input))).status,401);assert.equal((await denied.PUT(request(input))).status,401);
    const offline=loadModule("src/lib/api-handlers/equipment.ts",{"@/lib/db":{db:null},"./auth":{VERIFY:async()=>new Response(JSON.stringify({user:{name:"정비 등록자"}}))}},{Response});
    assert.equal((await offline.GET({url:"http://localhost/api/equipment"})).status,503);
    const failed=await offline.POST(request({entity:"machine",name:"저장 실패",status:"사용중"}));assert.equal((await failed.json()).success,false);
  } finally {database.close();}
});

test("simple work entry saves minimal drafts and keeps production fields on edit", () => {
  const {createWorkDraft,prepareWorkDraft}=loadModule("src/lib/work-form.ts");
  const draft=createWorkDraft(undefined,"2026-10-13","현재 계정");
  draft.clientName="빠른 업체";
  draft.attachments=[{id:"photo",name:"발주.jpg",url:"/photo.jpg",fileType:"image"}];
  const saved=prepareWorkDraft(draft);
  assert.equal(saved.title,"빠른 업체");assert.equal(saved.createdBy,"현재 계정");
  assert.equal(saved.drawingAssignee,"");assert.equal(saved.attachments.length,1);
  const edited=createWorkDraft({...saved,createdBy:"원 등록자",installationTeam:"시공 A팀",ceilingHeight:"2450"},"2026-10-14","다른 계정");
  assert.equal(edited.createdBy,"원 등록자");assert.equal(edited.installationTeam,"시공 A팀");assert.equal(edited.ceilingHeight,"2450");
});

test("work entry DB round trip preserves team, height and verified registration author", async () => {
  const database=nativeRequire("@libsql/client").createClient({url:"file::memory:"});
  try {
    await database.executeMultiple(`CREATE TABLE bo_work_items(id TEXT PRIMARY KEY,type TEXT,title TEXT,client_name TEXT,site_address TEXT,region TEXT,drawing_type TEXT,card_type TEXT,deadline_type TEXT,delivery_date TEXT,site_contact_phone TEXT,post_color TEXT,board_color TEXT,drawing_assignee TEXT,category TEXT,assignee TEXT,priority TEXT,status TEXT,progress INTEGER,start_date TEXT,due_date TEXT,notes TEXT,description TEXT,material_orders TEXT,created_at TEXT);
      CREATE TABLE bo_attachments(id TEXT,work_item_id TEXT,name TEXT,file_type TEXT,size TEXT,uploaded_at TEXT,url TEXT);
      CREATE TABLE bo_work_item_comments(id TEXT,work_item_id TEXT,author TEXT,content TEXT,created_at TEXT,images TEXT);`);
    const dbMock={db:database,executeQuery:async(sql,args=[])=>{const result=await database.execute({sql,args});return {success:true,rows:result.rows};},executeMutation:async(sql,args=[])=>{const result=await database.execute({sql,args});return {success:true,rows:result.rows};}};
    const handlers=loadModule("src/lib/api-handlers/posts.ts",{"@/lib/db":dbMock,"./db":dbMock,"./auth":{VERIFY:async()=>new Response(JSON.stringify({user:{name:"로그인 등록자"}}))}},{Response});
    const created=await handlers.POST(request({type:"work",clientName:"업체",title:"업체",createdBy:"임의값",assignee:"임의값",installationTeam:"시공 A팀",ceilingHeight:"2400",cardType:"도면",tags:["빗각","조명"],calendarVisible:false,confirmationPending:true}));
    assert.equal(created.status,201);
    const {data:{id}}=await created.json();
    await handlers.PUT(request({id,type:"work",createdBy:"다른 사용자",ceilingHeight:"2500",installationTeam:"시공 B팀"}));
    const detail=await (await handlers.GET({url:"http://localhost/api/posts?type=work&id="+id})).json();
    assert.equal(detail.data[0].createdBy,"로그인 등록자");
    assert.deepEqual(detail.data[0].tags,["빗각","조명"]);
    const summary=await (await handlers.GET({url:"http://localhost/api/posts?type=work&summary=1"})).json();
    assert.deepEqual(summary.data[0].tags,["빗각","조명"]);
    assert.equal((await handlers.PUT(request({id,type:"work",tags:["invalid"]}))).status,400);
    await handlers.PUT(request({id,type:"work",tags:[]}));
    const cleared=await (await handlers.GET({url:"http://localhost/api/posts?type=work&id="+id})).json();
    assert.deepEqual(cleared.data[0].tags,[]);
    assert.equal(detail.data[0].calendarVisible,false);
    assert.equal(detail.data[0].confirmationPending,true);
    await handlers.PUT(request({id,type:"work",calendarVisible:true,confirmationPending:false}));
    const toggled=await (await handlers.GET({url:"http://localhost/api/posts?type=work&id="+id})).json();
    assert.equal(toggled.data[0].calendarVisible,true);
    assert.equal(toggled.data[0].confirmationPending,false);
    assert.equal(detail.data[0].installationTeam,"시공 B팀");
    assert.equal(detail.data[0].ceilingHeight,"2500");
    assert.equal(detail.data[0].drawingAssignee,undefined);
    const pdf = {id:"drawing",name:"현장도면.PDF",fileType:"pdf",url:"/uploads/drawing.pdf"};
    const image = {id:"order",name:"발주.jpg",fileType:"image",url:"/uploads/order.jpg"};
    const {isDrawingAttachment, replaceAttachmentGroup} = loadModule("src/lib/drawing-attachments.ts");
    await handlers.PUT(request({id,type:"work",attachments:[image,pdf]}));
    const withDrawing = (await (await handlers.GET({url:"http://localhost/api/posts?type=work&id="+id})).json()).data[0];
    assert.equal(withDrawing.attachments.filter(isDrawingAttachment).length, 1);
    const remaining = replaceAttachmentGroup(withDrawing.attachments, [], true);
    await handlers.PUT(request({id,type:"work",attachments:remaining}));
    const withoutDrawing = (await (await handlers.GET({url:"http://localhost/api/posts?type=work&id="+id})).json()).data[0];
    assert.equal(withoutDrawing.attachments.some(isDrawingAttachment), false);
    assert.equal(withoutDrawing.attachments[0].id, "order");
  } finally {database.close();}
});

test("material input history deduplicates, removes and bounds remembered names", () => {
  let stored = "[]";
  const history = loadModule("src/lib/material-history.ts", {}, {localStorage:{getItem:()=>stored,setItem:(_,value)=>{stored=value;}}});
  history.writeMaterialHistory(" 합판 ");
  history.writeMaterialHistory("레일");
  assert.deepEqual(Array.from(history.writeMaterialHistory("합판")), ["합판","레일"]);
  assert.deepEqual(Array.from(history.writeMaterialHistory("합판",true)), ["레일"]);
  for(let i=0;i<40;i++) history.writeMaterialHistory(`품목 ${i}`);
  assert.equal(history.readMaterialHistory().length,30);
  stored = "invalid JSON";
  assert.equal(history.readMaterialHistory().length,0);
});

test("drawing catalog maps online labels to baron web codes and preserves custom colors", () => {
  const {drawingColorCode,POST_COLORS,BOARD_COLORS}=loadModule("src/lib/drawing-colors.ts");
  for(const [code,label] of POST_COLORS) assert.equal(drawingColorCode(label,"post"),code);
  for(const [code,label] of BOARD_COLORS) assert.equal(drawingColorCode(label,"board"),code);
  assert.equal(drawingColorCode(undefined,"post"),"NONE");
  assert.equal(drawingColorCode("11 다크그레이","post"),"DARK_GRAY");
  assert.equal(drawingColorCode("주문 컬러","board"),"주문 컬러");
});

test("Korean holidays include substitute holidays and correct three-day lunar spans",()=>{
  const {koreanHolidays}=loadModule("src/lib/korean-holidays.ts");
  const holidays=koreanHolidays(2026);
  assert.equal(holidays["2026-10-09"],"한글날");
  assert.match(holidays["2026-10-05"],/대체공휴일/);
  for(const date of ["2026-02-16","2026-02-17","2026-02-18"])assert.equal(holidays[date],"설날");
  assert.equal(holidays["2026-02-19"],undefined);
  assert.equal(holidays["2026-06-03"],"지방선거");
  assert.equal(holidays["2026-05-01"],"노동절");
  assert.match(koreanHolidays(2027)["2027-05-03"],/대체공휴일/);
});

test("real SQLite pagination stays small with large photo data and loads files only on demand", async () => {
  const database=nativeRequire("@libsql/client").createClient({url:"file::memory:"});
  try {
    await database.executeMultiple(`CREATE TABLE bo_work_items(id TEXT PRIMARY KEY,type TEXT,title TEXT,client_name TEXT,site_address TEXT,region TEXT,drawing_type TEXT,card_type TEXT,deadline_type TEXT,delivery_date TEXT,category TEXT,assignee TEXT,priority TEXT,status TEXT,progress INTEGER,start_date TEXT,due_date TEXT,created_at TEXT,confirmation_pending INTEGER,confirmation_completed INTEGER DEFAULT 0,calendar_visible INTEGER,post_color TEXT,board_color TEXT,description TEXT,notes TEXT,material_orders TEXT);
      CREATE TABLE bo_attachments(id TEXT,work_item_id TEXT,name TEXT,file_type TEXT,size TEXT,uploaded_at TEXT,url TEXT);
      CREATE TABLE bo_work_item_comments(id TEXT,work_item_id TEXT,author TEXT,content TEXT,created_at TEXT,images TEXT);`);
    for(let index=0;index<65;index++)await database.execute({sql:"INSERT INTO bo_work_items(id,type,title,card_type,status,created_at,description) VALUES (?,'work',?,'도면','오피스','2026-10-13',?)",args:[String(index).padStart(3,"0"),`제목 ${index}`,"긴 본문".repeat(1000)]});
    const photo="data:image/jpeg;base64,"+Buffer.from("photo".repeat(30000)).toString("base64");
    await database.execute({sql:"INSERT INTO bo_work_item_comments VALUES ('c','064','기사','사진','2026-10-13',?)",args:[JSON.stringify(Array(10).fill(photo))]});
    const pdf="data:application/pdf;base64,"+Buffer.from("pdf contents").toString("base64");
    await database.execute({sql:"INSERT INTO bo_attachments VALUES ('a','064','도면.pdf','pdf','1 KB','2026-10-13',?)",args:[pdf]});
    const mock={db:database,executeQuery:async(sql,args=[])=>{const result=await database.execute({sql,args});return {success:true,rows:result.rows};},executeMutation:async(sql,args=[])=>{const result=await database.execute({sql,args});return {success:true,rows:result.rows};}};
    const cache=new Map();
    const posts=loadModule("src/lib/api-handlers/posts.ts",{"@/lib/db":mock},{Response},cache);
    await database.execute("UPDATE bo_work_items SET confirmation_pending = 1 WHERE id = '064'");
    const completed = await posts.PUT(request({ id: "064", type: "work", confirmationPending: false, confirmationCompleted: true }));
    assert.equal((await completed.json()).success, true);
    const reloadedPosts = loadModule("src/lib/api-handlers/posts.ts", {"@/lib/db":mock}, {Response});
    const reloadedSummary = await (await reloadedPosts.GET({url:"http://localhost/api/posts?type=work&summary=1&limit=1"})).json();
    assert.equal(reloadedSummary.data[0].confirmationCompleted, true);
    assert.equal(reloadedSummary.data[0].confirmationPending, false);
    assert.equal(reloadedSummary.data[0].drawingAttachment.id, "a");
    assert.equal(reloadedSummary.data[0].drawingAttachment.name, "도면.pdf");
    assert.ok(!JSON.stringify(reloadedSummary).includes(pdf));
    const page1=await(await posts.GET({url:"http://localhost/api/posts?type=work&summary=1&limit=30"})).json();
    const page2=await(await posts.GET({url:"http://localhost/api/posts?type=work&summary=1&limit=30&offset=30"})).json();
    assert.equal(page1.data.length,30);assert.equal(page2.data.length,30);
    assert.ok(!page2.data.some(item=>page1.data.some(old=>old.id===item.id)));
    assert.ok(!JSON.stringify(page1).includes("긴 본문"));
    const detail=await(await posts.GET({url:"http://localhost/api/posts?type=work&id=064"})).json();
    assert.equal(detail.data[0].confirmationCompleted, true);
    assert.equal(detail.data[0].status, "오피스");
    assert.ok(!JSON.stringify(detail).includes(photo));assert.ok(!JSON.stringify(detail).includes(pdf));
    assert.equal(detail.data[0].comments[0].images.length,10);
    const file=await posts.GET({url:"http://localhost"+detail.data[0].attachments[0].url});
    assert.equal(await file.text(),"pdf contents");
    const gallery=loadModule("src/lib/api-handlers/gallery.ts",{"@/lib/db":mock},{Response},cache);
    await database.execute("UPDATE bo_work_items SET client_name='테스트 업체',site_address='서울 현장',board_color='화이트',post_color='흑니켈' WHERE id='064'");
    const photos=await(await gallery.GET({url:"http://localhost/api/gallery?limit=30&folder_id=folder-construction"})).json();
    assert.equal(photos.data.images.length,10);assert.ok(!JSON.stringify(photos).includes(photo));
    assert.equal(photos.data.images[0].clientName,"테스트 업체");
    assert.equal(photos.data.images[0].siteAddress,"서울 현장");
    assert.equal(photos.data.images[0].boardColor,"화이트");
    assert.equal(photos.data.images[0].postColor,"흑니켈");
    assert.equal(photos.data.images[0].drawingAttachment.id,"a");
    assert.ok(!JSON.stringify(photos).includes(pdf),"gallery only carries drawing metadata");
    await database.execute({sql:"UPDATE bo_work_items SET work_tags=?,drawing_type='천정형',board_color='화이트',post_color='다크그레이' WHERE id='064'",args:[JSON.stringify(["빗각","조명"])]});
    for(const filter of ["q="+encodeURIComponent("#빗각"),"q="+encodeURIComponent("조명"),"drawing="+encodeURIComponent("천정형"),"color="+encodeURIComponent("다크그레이")]) {
      const result=await(await gallery.GET({url:"http://localhost/api/gallery?limit=1&folder_id=folder-construction&"+filter})).json();
      assert.equal(result.data.images.length,1);assert.equal(result.hasMore,true);
      for(const tag of ["빗각","조명","천정형","화이트","다크그레이"])assert.ok(result.data.images[0].tags.includes(tag));
    }
    const missing=await(await gallery.GET({url:"http://localhost/api/gallery?limit=1&q="+encodeURIComponent("장식장")})).json();
    assert.equal(missing.data.images.length,0);
    await database.execute({sql:"UPDATE bo_work_items SET work_tags=? WHERE id='064'",args:[JSON.stringify(["장식장"])]});
    const updated=await(await gallery.GET({url:"http://localhost/api/gallery?limit=1&q="+encodeURIComponent("장식장")})).json();
    assert.equal(updated.data.images.length,1);assert.ok(!updated.data.images[0].tags.includes("빗각"));
    await database.execute({sql:"UPDATE bo_work_item_comments SET images=? WHERE id='c'",args:[JSON.stringify(Array(100).fill("/api/construction-photo?key=existing"))]});
    const galleryPages=[];
    for (const offset of [0,48,96]) galleryPages.push(await (await gallery.GET({url:"http://localhost/api/gallery?limit=48&offset="+offset+"&folder_id=folder-construction"})).json());
    assert.deepEqual(galleryPages.map(page=>page.data.images.length),[48,48,4]);
    assert.deepEqual(galleryPages.map(page=>page.hasMore),[true,true,false]);
    assert.equal(new Set(galleryPages.flatMap(page=>page.data.images.map(image=>image.id))).size,100);
    const calendarRows = [
      ["installation", "기타", "시공일", "2027-01-10", "", null],
      ["request", "도면", "요청일", "2027-01-10", "", null],
      ["shipping", "도면", "발송일", "2027-01-10", "", null],
      ["manual-add", "기타", "요청일", "2027-01-10", "", 1],
      ["manual-hide", "도면", "시공일", "2027-01-10", "", 0],
      ["undated", "도면", "시공일", "", "", 1],
      ["fallback", "기타", "시공일", "", "2027-01-11", null],
    ];
    for (const row of calendarRows) await database.execute({sql:"INSERT INTO bo_work_items(id,card_type,deadline_type,delivery_date,due_date,calendar_visible) VALUES (?,?,?,?,?,?)", args:row});
    const calendar = await (await posts.GET({url:"http://localhost/api/posts?type=work&summary=1&mode=calendar&from=2027-01-01&to=2027-01-31"})).json();
    assert.deepEqual(calendar.data.map(value => value.id).sort(), ["fallback", "installation", "manual-add"]);
  } finally { database.close(); }
});

test("summary work query returns 30 small rows and only PDF metadata for the current page", async () => {
  const queries=[];
  const rows=Array.from({length:31},(_,index)=>({id:String(index),title:"목록 제목",cardType:"도면",status:"오피스",createdAt:"2026-10-13"}));
  const {GET}=loadModule("src/lib/api-handlers/posts.ts",{
    "@/lib/db":{db:{},executeQuery:async(sql,args)=>{queries.push({sql,args});return {success:true,rows};},executeMutation:async()=>({success:true})},
    "@/lib/work-calendar-schema":{ensureWorkCalendarSchema:async()=>{}},
    "@/lib/work-confirmation-schema":{ensureWorkConfirmationSchema:async()=>{}},
    "@/lib/work-tags-schema":{ensureWorkTagsSchema:async()=>{}},
  });
  const result=await (await GET({url:"http://localhost/api/posts?type=work&summary=1&limit=30&from=2026-09-14"})).json();
  assert.equal(result.data.length,30);
  assert.equal(result.hasMore,true);
  assert.equal(queries.length,2);
  assert.ok(!/SELECT \*|description|notes|bo_attachments|bo_work_item_comments/.test(queries[0].sql));
  assert.deepEqual(Array.from(queries[0].args),["2026-09-14",31,0]);
  assert.match(queries[1].sql, /SELECT id, name, work_item_id AS workItemId/);
  assert.doesNotMatch(queries[1].sql, /\burl\b|SELECT \*/);
  assert.equal(queries[1].args.length, 30);
  assert.equal(result.data[0].detailsLoaded,false);
});

test("work detail restricts related queries to the requested work and recent comments", async () => {
  const queries=[];
  const {GET}=loadModule("src/lib/api-handlers/posts.ts",{
    "@/lib/work-tags-schema":{ensureWorkTagsSchema:async()=>{}},
    "@/lib/db":{db:{},executeQuery:async(sql,args)=>{queries.push({sql,args});return {success:true,rows:sql.includes("FROM bo_work_items")?[{id:"chosen",title:"업무",description:"본문"}]:[]};}},
  });
  const result=await (await GET({url:"http://localhost/api/posts?type=work&id=chosen"})).json();
  assert.equal(result.data[0].description,"본문");
  assert.match(queries[0].sql,/WHERE id = \?/);
  for(const query of queries.slice(1)){assert.match(query.sql,/WHERE work_item_id IN/);assert.deepEqual(Array.from(query.args),["chosen"]);}
  assert.match(queries[2].sql,/LIMIT 21/);
});

test("gallery first page selects photo metadata with a server limit and no full photo URLs", async () => {
  const queries=[];
  const {GET}=loadModule("src/lib/api-handlers/gallery.ts",{
    "@/lib/work-tags-schema":{ensureWorkTagsSchema:async()=>{}},
    "@/lib/db":{db:{},executeQuery:async(sql,args)=>{queries.push({sql,args});return {success:true,rows:sql.includes("SELECT DISTINCT")?[]:[{work_id:"w",source:"comment",photo_id:"c",photo_index:4,title:"현장",client_name:"업체",created_at:"2026-10-13"}]};}},
  },{Response});
  const result=await(await GET({url:"http://localhost/api/gallery?limit=30&folder_id=folder-construction"})).json();
  assert.match(queries[0].sql,/LIMIT \? OFFSET \?/);
  assert.ok(!/SELECT c\.images|photo_url|w\.\*/.test(queries[0].sql));
  assert.deepEqual(Array.from(queries[0].args).slice(-2),[31,0]);
  assert.equal(result.data.images[0].url,"/api/gallery?source=comment&id=c&index=4");
});

test("phone back closes work modal and X removes its temporary history entry", () => {
  for (const phoneBack of [true, false]) {
    const effects = [], frames = [], handlers = new Map();
    let closed = 0, backs = 0;
    const history = {state:{router:"preserved"}, pushState(state) { this.state=state; }, back() { backs++; }};
    const {useModalBack} = loadModule("src/lib/use-modal-back.ts", {
      react:{useRef:value=>({current:value}),useEffect:callback=>effects.push(callback)},
    }, {window:{history,location:{href:"http://localhost/work"},addEventListener:(event,callback)=>handlers.set(event,callback),removeEventListener:event=>handlers.delete(event)},requestAnimationFrame:callback=>{frames.push(callback);return 1;},cancelAnimationFrame() {}});
    useModalBack(true,()=>closed++);
    const cleanups=effects.map(effect=>effect());
    frames[0]();
    assert.equal(history.state.router,"preserved");
    assert.ok(history.state.baronModal);
    if (phoneBack) { history.state={router:"preserved"}; handlers.get("popstate")(); assert.equal(closed,1); }
    cleanups.forEach(cleanup=>cleanup?.());
    assert.equal(backs,phoneBack ? 0 : 1);
    assert.equal(handlers.size,0);
  }
});

test("material lists finish as dispatched while drawing tasks finish as installed", () => {
  const { workStatusLabel } = loadModule("src/lib/work-status.ts");
  assert.equal(workStatusLabel({cardType:"자재리스트"}, "시공완료"), "발송 완료");
  assert.equal(workStatusLabel({cardType:"자재리스트"}, "준비완료"), "출고대기");
  assert.equal(workStatusLabel({cardType:"도면"}, "시공완료"), "시공완료");
});

test("calendar defaults to dated installation tasks while retaining manual overrides", () => {
  const { isCalendarVisible } = loadModule("src/lib/calendar-visibility.ts");
  const dated = {deliveryDate:"2026-10-21", dueDate:""};
  assert.equal(isCalendarVisible({...dated,cardType:"기타",deadlineType:"시공일"}), true);
  assert.equal(isCalendarVisible({...dated,cardType:"도면",deadlineType:"요청일"}), false);
  assert.equal(isCalendarVisible({...dated,deadlineType:"발송일"}), false);
  assert.equal(isCalendarVisible({...dated,deadlineType:"시공일",calendarVisible:false}), false);
  assert.equal(isCalendarVisible({...dated,deadlineType:"요청일",calendarVisible:true}), true);
  assert.equal(isCalendarVisible({deadlineType:"시공일",deliveryDate:"",dueDate:""}), false);
  assert.equal(isCalendarVisible({deadlineType:"시공일",deliveryDate:"",dueDate:"2026-10-21"}), true);
  assert.equal(isCalendarVisible({deadlineType:"시공일",deliveryDate:" ",dueDate:"",calendarVisible:true}), false);
});

test("confirmation flag persists independently of office stage", async () => {
  const { serverStore } = loadModule("src/lib/serverStore.ts");
  const item = serverStore.addWorkItem({title:"컨펌 검증", status:"오피스", confirmationPending:false}, "confirmation-test");
  serverStore.updateWorkItem(item.id, {confirmationPending:true});
  const saved = serverStore.getWorkItems().find(value=>value.id === item.id);
  assert.equal(saved.status,"오피스");
  assert.equal(saved.confirmationPending,true);
  serverStore.updateWorkItem(item.id, {confirmationPending:false});
  assert.equal(serverStore.getWorkItems().find(value=>value.id === item.id).confirmationPending,false);
});

test("project titles use company and short location while preserving manual titles", () => {
  const { generateWorkTitle, getWorkTitle } = loadModule("src/lib/work-title.ts");
  assert.equal(generateWorkTitle("바론", "서울특별시 서초구 반포동 원베일리 104동 1201호"), "바론, 반포동");
  assert.equal(generateWorkTitle("바론", "강원도 춘천시 중앙로 123"), "바론, 춘천시");
  assert.equal(generateWorkTitle("바론", "경기도 고양시 일산 아파트 101동"), "바론, 일산");
  assert.equal(generateWorkTitle("바론", "", "반포"), "바론, 반포");
  assert.equal(generateWorkTitle("바론", "서울시 강남구 테헤란로 123"), "바론, 강남구");
  assert.equal(generateWorkTitle("바론", "서울특별시 강남구 역삼1동 101동"), "바론, 역삼1동");
  assert.equal(generateWorkTitle("바론", "서울시"), "바론");
  assert.equal(generateWorkTitle("바론", "서울특별시 서초구 도로 12 (반포동)"), "바론, 반포동");
  assert.equal(getWorkTitle({ title: "직접 수정한 프로젝트", clientName: "바론", siteAddress: "반포동" }), "직접 수정한 프로젝트");
  assert.equal(getWorkTitle({ title: "바론, 반포동(천정형)", clientName: "바론" }), "바론, 반포동");
  assert.equal(getWorkTitle({ title: "바론, 반포동 (에보라)", clientName: "바론" }), "바론, 반포동");
  assert.equal(getWorkTitle({ title: "바론 (추가 발주)", clientName: "바론" }), "바론 (추가 발주)");
});

test("calendar more button expands all events in the cell and can collapse again", () => {
  const states = [];
  let cursor = 0;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const items = Array.from({ length: 7 }, (_, i) => ({ id: `work-${i}`, title: `현장 ${i}`, clientName: "바론", cardType:"도면", deadlineType:"시공일", dueDate: today, status: "대기", priority: "보통" }));
  const react = {
    useState: initial => { const index = cursor++; if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial; return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }]; },
    useMemo: callback => callback(), useEffect: () => {},
  };
  const { default: Calendar } = loadModule("src/app/calendar/page.tsx", {
    react,
    "@/context/AuthContext": { useAuth: () => ({ user: { name: "직원" } }) },
    "@/context/DataContext": { useData: () => ({ workItems: items, asItems: [], isSaving: false }) },
  });
  const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const render = () => { cursor = 0; return nodes(Calendar()); };
  let tree = render();
  assert.equal(tree.filter(node => typeof node.props?.title === "string" && node.props.title.startsWith("[천정형] 현장")).length, 4);
  const more = tree.find(node => node.type === "button" && node.props["aria-expanded"] === false);
  assert.ok(more);
  let stopped = false;
  more.props.onClick({ stopPropagation: () => { stopped = true; } });
  assert.ok(stopped);
  tree = render();
  assert.equal(tree.filter(node => typeof node.props?.title === "string" && node.props.title.startsWith("[천정형] 현장")).length, 7);
  tree.find(node => node.type === "button" && node.props["aria-expanded"] === true).props.onClick({ stopPropagation() {} });
  assert.equal(render().filter(node => typeof node.props?.title === "string" && node.props.title.startsWith("[천정형] 현장")).length, 4);
});

test("gallery thumbnail returns a smaller WebP and keeps original available", async () => {
  const sharp = nativeRequire("sharp");
  const { photoResponse } = loadModule("src/lib/gallery-thumbnail.ts", {}, { Response, Uint8Array });
  const source = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#abc" } }).png().toBuffer();
  const url = `data:image/png;base64,${source.toString("base64")}`;
  const thumbnail = await photoResponse(url, "http://localhost/api/gallery", 160, "test");
  assert.equal(thumbnail.headers.get("Content-Type"), "image/webp");
  const metadata = await sharp(Buffer.from(await thumbnail.arrayBuffer())).metadata();
  assert.equal(metadata.width, 160);
  assert.equal(metadata.height, 120);
  const original = await photoResponse(url, "http://localhost/api/gallery", null, "test");
  assert.equal(original.headers.get("Content-Type"), "image/png");
  assert.equal(Buffer.compare(Buffer.from(await original.arrayBuffer()), source), 0);
});

test("gallery attachment deletion reports database failures instead of success", async () => {
  const { DELETE } = loadModule("src/lib/api-handlers/gallery.ts", {
    "./auth": { VERIFY: async () => new Response("", {status:200}) },
    "@/lib/db": { db: {}, executeQuery: async () => ({ success: true, rows: [{ id: "photo" }] }), executeMutation: async () => { throw new Error("offline"); } },
  });
  const result = await DELETE({ url: "http://localhost/api/gallery?type=image&id=attachment-photo" });
  assert.equal(result.status, 500);
  assert.equal((await result.json()).success, false);
});

test("construction photo compression resizes and caps storage before upload", async () => {
  const draws=[];
  const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(_image,_x,_y,w,h){draws.push([w,h]);}}),toDataURL(_type,quality){return "data:image/jpeg;base64,"+"A".repeat(Math.ceil(this.width*this.height*quality/3));}};
  const {compressPhoto}=loadModule("src/lib/photo-compression.ts",{}, {Image:class {naturalWidth=4000;naturalHeight=3000;decode(){return Promise.resolve();}},document:{createElement:()=>canvas}});
  const source="data:image/jpeg;base64,"+"A".repeat(4000000);
  const output=await compressPhoto(source);
  assert.ok(output.length <= 500*1024*4/3);
  assert.ok(draws.every(([w,h])=>w<=1920 && h<=1920));
  assert.ok(output.length<source.length);
});

test("construction gallery derives searchable drawing tags without copying photo data", async () => {
  const photo="data:image/jpeg;base64,"+Buffer.from("test-image").toString("base64");
  const row={id:"work-1",comment_id:"cmt-1",author:"기사",content:"시공완료",images:JSON.stringify([photo]),comment_date:"2026-10-12T01:00:00Z",title:"현장",client_name:"업체",site_address:"서울",region:"반포",drawing_type:"천정형",board_color:"화이트",post_color:"다크그레이",work_tags:JSON.stringify(["빗각","조명"])};
  const gallery=loadModule("src/lib/api-handlers/gallery.ts",{"@/lib/db":{db:{},executeQuery:async sql=>({success:true,rows:sql.includes("bo_attachments")?[]:sql.includes("JOIN")?[row]:[{images:row.images}]})}}, {Response});
  const listed=await (await gallery.GET({url:"http://localhost/api/gallery"})).json();
  const entry=listed.data.images[0];
  for (const tag of ["빗각","조명","천정형","화이트","다크그레이","업체","서울","기사"]) assert.ok(entry.tags.includes(tag));
  assert.ok(entry.tags.includes("반포"));
  assert.ok(!entry.tags.some(tag => /^(도면타입|포스트컬러|합판종류·컬러|지역):/.test(tag)));
  assert.equal(entry.url,"/api/gallery?source=comment&id=cmt-1&index=0");
  assert.ok(!JSON.stringify(listed).includes(photo));
  const image=await gallery.GET({url:"http://localhost"+entry.url});
  assert.equal(image.headers.get("content-type"),"image/jpeg");
  assert.equal(await image.text(),"test-image");
});

test("work registration images are order materials and never construction photos", async () => {
  const { orderGalleryImage, matchesGalleryFolder, galleryFolders } = loadModule("src/lib/construction-gallery.ts");
  const work = {id:"w", title:"업체, 반포동", clientName:"업체", region:"반포동", drawingType:"천정형", postColor:"다크그레이", boardColor:"화이트"};
  const image = orderGalleryImage(work, {id:"a", name:"발주.png", url:"/uploads/a.png", fileType:"image", size:"10 KB"});
  assert.ok(image.tags.includes("발주자료"));
  assert.ok(!image.tags.includes("시공사진"));
  assert.ok(!image.tags.includes("천정형"));
  assert.equal(matchesGalleryFolder(image,"folder-construction"),false);
  assert.equal(matchesGalleryFolder(image,"folder-order-materials"),true);
  const folders = galleryFolders([], [image]);
  assert.equal(folders[0].id,"folder-construction");
  assert.ok(folders.some(folder => folder.name === "업체 발주 자료"));
  const row={id:"w",attachment_id:"a",photo_name:"발주.png",photo_date:"2026-10-13",client_name:"업체",title:"업체, 반포동",region:"반포동",drawing_type:"천정형"};
  const { GET } = loadModule("src/lib/api-handlers/gallery.ts", {"@/lib/db":{db:{},executeQuery:async sql=>({success:true,rows:sql.includes("bo_attachments")?[row]:[]})}}, {Response});
  const result = await (await GET({url:"http://localhost/api/gallery"})).json();
  const saved = result.data.images.find(entry=>entry.id === "attachment-a");
  assert.ok(saved.tags.includes("발주자료"));
  assert.equal(matchesGalleryFolder(saved,"folder-construction"),false);
});

test("new work defaults to ceiling drawing type and gallery opens construction folder", () => {
  const { createWorkDraft } = loadModule("src/lib/work-form.ts");
  assert.equal(createWorkDraft(undefined, "2026-10-13", "담당자").drawingType, "천정형");
  assert.equal(createWorkDraft(undefined, "2026-10-13", "담당자", "2026-11-02").drawingType, "천정형");
  assert.match(readFileSync("src/app/gallery/page.tsx", "utf8"), /useState<string>\("folder-construction"\)/);
});

test("shared work save preserves start date and attachments while synchronizing body and deadline", () => {
  const { createWorkDraft, prepareWorkDraft } = loadModule("src/lib/work-form.ts");
  const item = {id:"w", title:"기존 업무",clientName:"업체",assignee:"업무 담당",drawingAssignee:"설계 담당",startDate:"2026-09-01",dueDate:"2026-10-01",status:"공장",description:"기존 본문",attachments:[{id:"pdf",url:"/api/file",name:"도면.pdf"}],materialOrderNeeded:"합판,레일",materialOrderStatus:"발주필요"};
  const draft=createWorkDraft(item,"2026-10-13","로그인 사용자");
  draft.deliveryDate="2026-10-20";draft.description="새 본문";draft.status="시공완료";draft.drawingAssignee="새 설계 담당";
  const saved=prepareWorkDraft(draft);
  assert.equal(saved.startDate,"2026-09-01");assert.equal(saved.dueDate,"2026-10-20");
  assert.equal(saved.description,saved.notes);assert.equal(saved.progress,100);
  assert.equal(saved.assignee,"업무 담당");assert.equal(saved.drawingAssignee,"새 설계 담당");
  assert.equal(saved.attachments[0].id,"pdf");assert.equal(saved.materialOrders.length,2);
  assert.equal(saved.materialOrderStatus,"발주필요");
  draft.materialOrders.forEach(order=>order.isOrdered=true);
  assert.equal(prepareWorkDraft(draft).materialOrderStatus,"발주완료");
  draft.deliveryDate="2026-02-30";assert.throws(()=>prepareWorkDraft(draft),/예정일/);
  draft.deliveryDate="2026-10-20";draft.clientName=" ";assert.throws(()=>prepareWorkDraft(draft),/업체명/);
});

test("calendar date is the only difference between new work entry defaults", () => {
  const { createWorkDraft } = loadModule("src/lib/work-form.ts");
  const quick=createWorkDraft(undefined,"2026-10-13","담당");
  const calendar=createWorkDraft(undefined,"2026-10-13","담당","2026-11-05");
  assert.equal(calendar.deliveryDate,"2026-11-05");
  calendar.deliveryDate=quick.deliveryDate;calendar.dueDate=quick.dueDate;
  assert.deepEqual(calendar,quick);
});

test("nested editor back protects unsaved changes and leaves detail open", () => {
  const effects=[],frames=[],handlers=new Map();let detailClosed=0,editorClosed=0,allow=false;
  const history={state:{},pushState(state){this.state=state;},back(){}};
  const {useModalBack}=loadModule("src/lib/use-modal-back.ts",{react:{useRef:value=>({current:value}),useEffect:fn=>effects.push(fn)}},{window:{history,location:{href:"http://localhost/work"},addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:name=>handlers.delete(name)},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){}});
  useModalBack(true,()=>detailClosed++);const outer=effects.splice(0).map(fn=>fn());frames.shift()();const parentState=history.state;
  useModalBack(true,()=>{if(!allow)return false;editorClosed++;return true;});const inner=effects.splice(0).map(fn=>fn());frames.shift()();const editorState=history.state;
  history.state=parentState;handlers.get("popstate")();assert.equal(history.state.baronModal,editorState.baronModal);assert.equal(detailClosed,0);assert.equal(editorClosed,0);
  allow=true;history.state=parentState;handlers.get("popstate")();assert.equal(editorClosed,1);assert.equal(detailClosed,0);
  inner.forEach(fn=>fn?.());outer.forEach(fn=>fn?.());
});

test("work editor keeps failed drafts and locks duplicate save attempts", async () => {
  const React=nativeRequire("react");const slots=[];let cursor=0,closed=0,calls=0,fail=true,resolveSave;
  const hookReact={...React,useEffect(){},useRef(value){const index=cursor++;return slots[index] ?? (slots[index]={current:value});},useState(value){const index=cursor++;if(!(index in slots))slots[index]=typeof value==="function"?value():value;return [slots[index],next=>{slots[index]=typeof next==="function"?next(slots[index]):next;}];}};
  const {WorkEditorModal}=loadModule("src/components/common/WorkEditorModal.tsx",{
    react:hookReact,"@/context/AuthContext":{useAuth:()=>({user:{name:"담당자"}})},"@/lib/use-modal-back":{useModalBack(){}},
    "@/context/DataContext":{useData:()=>({addWorkItem:async()=>{},updateWorkItem:async()=>{calls++;if(fail)throw Error("저장 실패 검증");await new Promise(resolve=>resolveSave=resolve);}})},
  });
  const item={id:"fixture",title:"업무",clientName:"업체",assignee:"담당자",status:"대기",deliveryDate:"2026-10-13",attachments:[]};
  const render=()=>{cursor=0;return WorkEditorModal({item,onClose:()=>closed++});};
  const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==="object"?[node,...walk(node.props?.children)]:[];
  const find=(tree,predicate)=>walk(tree).find(predicate);
  let tree=render();find(tree,node=>node.props?.label==="현장 주소").props.children.props.onChange({target:{value:"수정한 현장"}});
  tree=render();
  const tagButton=(tree,label)=>find(tree,node=>node.type==="button"&&node.props["aria-pressed"]!==undefined&&node.props.children.includes(label));
  tagButton(tree,"빗각").props.onClick();tree=render();
  assert.equal(tagButton(tree,"빗각").props["aria-pressed"],true);
  tagButton(tree,"조명").props.onClick();tree=render();
  tagButton(tree,"빗각").props.onClick();tree=render();
  assert.equal(tagButton(tree,"빗각").props["aria-pressed"],false);
  assert.equal(tagButton(tree,"조명").props["aria-pressed"],true);
  await find(tree,node=>node.type==="form").props.onSubmit({preventDefault(){}});
  tree=render();assert.equal(closed,0);assert.match(find(tree,node=>node.props?.role==="alert").props.children,/저장/);assert.equal(find(tree,node=>node.props?.label==="현장 주소").props.children.props.value,"수정한 현장");
  find(tree,node=>node.type==="button"&&node.props?.children==="취소").props.onClick();tree=render();assert.ok(find(tree,node=>node.props?.role==="alertdialog"));assert.equal(closed,0);
  find(tree,node=>node.type==="button"&&node.props?.children==="계속 작성").props.onClick();tree=render();
  fail=false;const submit=find(tree,node=>node.type==="form").props.onSubmit;
  const pending=submit({preventDefault(){}});await submit({preventDefault(){}});assert.equal(calls,2);assert.equal(closed,0);resolveSave();await pending;assert.equal(closed,1);
});

test("detail edit opens the shared editor with the live work item", () => {
  const React=nativeRequire("react");const slots=[];let cursor=0;
  const hookReact={...React,useEffect(){},useMemo:fn=>fn(),useRef:value=>({current:value}),useState(value){const index=cursor++;if(!(index in slots))slots[index]=typeof value==="function"?value():value;return [slots[index],next=>{slots[index]=typeof next==="function"?next(slots[index]):next;}];}};
  const item={id:"fixture",title:"업무",clientName:"업체",assignee:"담당자",status:"대기",dueDate:"2026-10-13",cardType:"도면",attachments:[],comments:[]};
  function SharedEditor() {return null;}
  const {TaskDetailModal}=loadModule("src/components/dashboard/TaskDetailModal.tsx",{react:hookReact,"@/context/AuthContext":{useAuth:()=>({user:{name:"담당자"}})},"@/context/DataContext":{useData:()=>({workItems:[item],isSaving:false})},"@/components/common/WorkEditorModal":{WorkEditorModal:SharedEditor}});
  const render=()=>{cursor=0;const gate=TaskDetailModal({item,onClose(){}});const content=gate.props.children(item);return content.type(content.props);};
  const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==="object"?[node,...walk(node.props?.children)]:[];
  let tree=render();walk(tree).find(node=>node.type?.name==="WorkDetailHeader").props.onEdit();tree=render();
  const editor=walk(tree).find(node=>node.type===SharedEditor);assert.ok(editor);assert.equal(editor.props.item.id,item.id);
  editor.props.onClose();assert.ok(!walk(render()).some(node=>node.type===SharedEditor));
});

test("inline material add retains input after failure and clears it only after saved", async () => {
  const React=nativeRequire("react");const slots=[];let cursor=0,fail=true,saved;
  const hookReact={...React,useEffect(){},useRef(value){const index=cursor++;return slots[index]??(slots[index]={current:value});},useState(value){const index=cursor++;if(!(index in slots))slots[index]=value;return [slots[index],next=>slots[index]=typeof next==="function"?next(slots[index]):next];}};
  const {MaterialOrderManager}=loadModule("src/components/dashboard/MaterialOrderManager.tsx",{react:hookReact});
  const render=()=>{cursor=0;return MaterialOrderManager({orders:[],autoFocusInput:true,onChange:async orders=>{if(fail)throw Error("failure");saved=orders;}});};
  const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==="object"?[node,...walk(node.props?.children)]:[];
  const input=tree=>walk(tree).find(node=>node.type==="input"&&node.props.type==="text");
  let tree=render();input(tree).props.onChange({target:{value:"합판 10장"}});tree=render();
  const button=walk(tree).find(node=>node.type==="button"&&walk(node).some(child=>child.type==="span"&&child.props.children==="품목 추가"));
  await button.props.onClick();tree=render();assert.equal(input(tree).props.value,"합판 10장");assert.ok(walk(tree).some(node=>node.props?.role==="alert"));
  fail=false;await button.props.onClick();tree=render();assert.equal(saved[0].name,"합판 10장");assert.equal(input(tree).props.value,"");
});

test("comment photos persist once and failed writes never report success", async () => {
  const writes=[];
  const photoUrl="/api/construction-photo?key=construction-photos%2F2026-10-23%2Fabc.jpg";
  const storage={storeConstructionPhoto:async()=>photoUrl};
  const {POST}=loadModule("src/lib/api-handlers/comments.ts",{"@/lib/r2-storage":storage,"@/lib/db":{executeMutation:async(sql,args)=>{writes.push({sql,args});},executeQuery:async()=>({success:true,rows:[]})}});
  const image="data:image/jpeg;base64,"+Buffer.from("image").toString("base64");
  const response=await POST(request({workItemId:"work-1",author:"기사",content:"완료",images:[image]}));
  const saved=await response.json();
  assert.equal(writes.length,1);
  assert.equal(writes[0].args[4],JSON.stringify([photoUrl]));
  assert.equal(saved.data.comment.images[0],photoUrl);
  const failing=loadModule("src/lib/api-handlers/comments.ts",{"@/lib/r2-storage":storage,"@/lib/db":{executeMutation:async()=>{throw new Error("DB failed");}}});
  assert.equal((await failing.POST(request({workItemId:"work-1",content:"완료",images:[image]}))).status,500);
  assert.equal((await POST(request({workItemId:"work-1",content:"완료",images:Array(20).fill(image)}))).status,200);
  assert.equal((await POST(request({workItemId:"work-1",content:"완료",images:Array(21).fill(image)}))).status,400);
  const unavailable=loadModule("src/lib/api-handlers/comments.ts",{"@/lib/r2-storage":{storeConstructionPhoto:async()=>{throw new Error("R2 unavailable");}},"@/lib/db":{executeMutation:async()=>{assert.fail("Must not save after failed photo upload");}}});
  assert.equal((await unavailable.POST(request({workItemId:"work-1",content:"완료",images:[image]}))).status,500);
});

test("AS intake persists installation, received and scheduled dates with paid reason", async () => {
  const writes = [];
  const handlers = loadModule("src/lib/api-handlers/posts.ts", {
    "@/lib/db": { db: {}, executeQuery: async () => ({ success: true, rows: [{ id: "as-test", client_name: "고객", construct_date: "2026-01-01", installer: "시공자", received_date: "2026-10-12", as_date: "2026-10-15", technician: "처리기사", service_type: "유상", paid_reason: "기간만료" }] }), executeMutation: async (sql,args) => { writes.push({sql,args}); } },
    "@/lib/as-schema": { ensureAsSchema: async () => {} },
  });
  const response = await handlers.POST(request({ type: "as", clientName: "고객", siteAddress: "현장", reason: "서랍 수리", constructDate: "2026-01-01", installer: "시공자", receivedDate: "2026-10-12", asDate: "2026-10-15", technician: "처리기사", serviceType: "유상", paidReason: "기간만료" }));
  assert.equal(response.status, 201);
  assert.deepEqual(Array.from(writes[0].args.slice(12)), ["시공자", "2026-10-12", "2026-10-15", "유상", "기간만료"]);
  const listed = await (await handlers.GET({url:"http://localhost/api/posts?type=as"})).json();
  assert.equal(listed.data[0].installer, "시공자");
  assert.equal(listed.data[0].asDate, "2026-10-15");
  assert.equal(listed.data[0].paidReason, "기간만료");
  const invalid = await handlers.POST(request({type:"as",clientName:"고객",siteAddress:"현장",reason:"수리",serviceType:"유상"}));
  assert.equal(invalid.status,400);
  await handlers.PUT(request({id:"as-test",type:"as",serviceType:"무상",paidReason:"고객과실"}));
  assert.equal(writes.at(-1).args[1], "");
});

test("Excel floor drawer reproduces parts and scales every quantity", () => {
  const { calculateDrawer } = loadModule("src/lib/drawerEngine.ts");
  const input = { productType: "ceiling-floor", cabinetWidth: 580, cabinetHeight: 850, cabinetDepth: 600, boardThickness: 18, drawerCount: 2, railType: "ball3stage", marginGap: 3, cabinetQuantity: 1 };
  const result = calculateDrawer(input);
  const expected = [[576,180,18,2],[580,400,18,1],[544,55,18,2],[418,380,18,2],[487,144,15,4],[350,145,15,4],[320,50,15,2],[500,332,4.5,2],[556,396,4.5,1]];
  result.parts.forEach((p, i) => assert.deepEqual([p.width,p.depth,p.thickness,p.count], expected[i]));
  assert.equal(result.input.cabinetHeight, 444);
  const batch = calculateDrawer({ ...input, cabinetQuantity: 3, cabinetWidth: 681 });
  batch.parts.forEach((p,i) => assert.equal(p.count, result.parts[i].count * 3));
  assert.equal(batch.parts[4].width, 588);
  assert.equal(batch.hardware[0].count, 6);
});

test("Excel floating and island templates preserve distinct heights and rail warnings", () => {
  const { calculateDrawer } = loadModule("src/lib/drawerEngine.ts");
  const base = { cabinetWidth: 800, cabinetHeight: 908, cabinetDepth: 513, boardThickness: 18, drawerCount: 4, railType: "ball3stage", marginGap: 3 };
  const handle = calculateDrawer({ ...base, productType: "island-handle" });
  assert.equal(handle.parts[0].width, 795);
  assert.equal(handle.parts[0].depth, 145);
  assert.equal(handle.parts[1].depth, 205);
  assert.equal(handle.parts.at(-1).depth, 433);
  assert.equal(handle.railSpec.length, 450);
  const channel = calculateDrawer({ ...base, productType: "island-channel" });
  assert.equal(channel.parts[0].depth, 122);
  assert.equal(channel.parts.find(p => p.name === "목찬넬").count, 3);
  assert.ok(channel.warnings.length);
  const floating = calculateDrawer({ ...base, productType: "ceiling-floating", cabinetWidth: 680, drawerCount: 1, cabinetQuantity: 2 });
  assert.equal(floating.parts[7].count, 2);
  assert.equal(floating.parts[4].width, 547);
  assert.equal(floating.parts[8].depth, 184);
  assert.equal(floating.input.cabinetHeight, 210);
  assert.throws(() => calculateDrawer({ ...base, productType: "ceiling-floating" }), /지원 단수/);
  assert.throws(() => calculateDrawer({ ...base, productType: "island-handle", cabinetQuantity: 1.5 }), /세대 수/);
});

test("drawing authentication leaves the POST body readable and preserves all launch information", async () => {
  let snapshot;
  const handlers = loadModule("src/lib/api-handlers/drawing-requests.ts", {
    "@/lib/db": { db: {}, executeMutation: async () => ({ success: true }) },
    "./auth": { VERIFY: async authenticatedRequest => {
      assert.equal(authenticatedRequest.headers.get("authorization"), "Bearer test-token");
      assert.equal(authenticatedRequest.bodyUsed, false);
      return new Response(null, { status: 200 });
    } },
    "@/lib/drawing-handoff": { saveDrawingHandoff: async data => { snapshot = data; return "https://balon-design.vercel.app/app#handoff=test"; } },
  });
  const input = { workItemId: "test-work", title: "천정 도면", clientName: "업체", drawingType: "천정형", siteAddress: "현장 주소", boardColor: "네츄럴오크", postColor: "화이트" };
  const incoming = new Request("http://localhost/api/drawing-requests", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" }, body: JSON.stringify(input),
  });
  incoming.clone = () => { throw new Error("Cannot read private member #state from an object whose class did not declare it"); };
  const response = await handlers.POST(incoming);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.launchUrl);
  for (const [key, value] of Object.entries(input)) assert.equal(snapshot[key], value);
});

test("drawing launch link contains only a short-lived random key and stores the complete snapshot", async () => {
  const writes = [];
  const { saveDrawingHandoff } = loadModule("src/lib/drawing-handoff.ts", {
    "./db": { executeMutation: async (sql, args) => { writes.push({ sql, args }); } },
    "./drawing-links": { linkDrawingProject: async () => "project-test" },
  }, { URLSearchParams });
  const snapshot = { id: "request-test", workItemId: "work-test", drawingType: "천정형", siteAddress: "서울 현장", boardColor: "네츄럴오크", postColor: "11 다크그레이" };
  const before = Date.now();
  const url = new URL(await saveDrawingHandoff(snapshot));
  const token = new URLSearchParams(url.hash.slice(1)).get("handoff");
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(url.origin, "https://balon-design.vercel.app");
  assert.equal(url.pathname, "/app");
  assert.equal(url.search, "");
  const saved = writes.find(write => write.sql.startsWith("INSERT"));
  assert.notEqual(saved.args[1], token);
  assert.deepEqual(JSON.parse(saved.args[2]), {...snapshot, drawingProjectId:"project-test", postColor:"DARK_GRAY"});
  assert.ok(saved.args[3] >= before + 15 * 60 * 1000);
  assert.ok(saved.args[3] <= Date.now() + 15 * 60 * 1000);
});

test("Korean business dates cross midnight independently of host timezone", () => {
  const { getToday } = loadModule("src/lib/date.ts");
  assert.equal(getToday(new Date("2026-10-05T15:01:00Z")), "2026-10-06");
});

test("a successful HTTP response containing a failed save rejects", async () => {
  const { requestApi } = loadModule("src/lib/api-client.ts", {}, {
    fetch: async () => ({ ok: true, json: async () => ({ success: false, message: "저장 실패" }) }),
  });
  await assert.rejects(requestApi("/api/posts"), /저장 실패/);
});

test("empty DB purchase results stay empty and never become sample purchases", async () => {
  const handlers = loadModule("src/lib/api-handlers/purchases.ts", {
    "@/lib/db": { db: {}, executeMutation: async () => ({ success: true }), executeQuery: async () => ({ success: true, rows: [] }) },
  });
  const body = await (await handlers.GET()).json();
  assert.deepEqual(body.data, []);
});

test("DB purchase read errors return failure rather than sample success", async () => {
  const handlers = loadModule("src/lib/api-handlers/purchases.ts", {
    "@/lib/db": { db: {}, executeMutation: async () => ({ success: true }), executeQuery: async () => ({ success: false, error: "offline" }) },
  }, { console: { error() {} } });
  const result = await handlers.GET();
  assert.equal(result.status, 503);
  assert.equal((await result.json()).success, false);
});

test("preview purchase create, partial edit, delete survive a reload in one process", async () => {
  const handlers = loadModule("src/lib/api-handlers/purchases.ts", { "@/lib/db": { db: null } });
  await handlers.POST(request({ id: "test-purchase", itemName: "경첩", mallName: "자재몰", quantity: 2 }));
  await handlers.PUT(request({ id: "test-purchase", quantity: 3 }));
  let rows = (await (await handlers.GET()).json()).data;
  assert.equal(rows[0].quantity, 3);
  assert.equal(rows[0].itemName, "경첩");
  await handlers.DELETE({ url: "http://localhost/api/purchases?id=test-purchase" });
  rows = (await (await handlers.GET()).json()).data;
  assert.deepEqual(rows, []);
});

test("memory work IDs remain stable from creation through update and deletion", () => {
  const { serverStore } = loadModule("src/lib/serverStore.ts");
  const item = serverStore.addWorkItem({ title: "현장 업무", status: "대기" }, "stable-id");
  assert.equal(item.id, "stable-id");
  assert.equal(serverStore.updateWorkItem("stable-id", { status: "오피스" }).status, "오피스");
  assert.equal(serverStore.deleteWorkItem("stable-id"), true);
});

test("a failed work DB insert does not return a success response", async () => {
  const handlers = loadModule("src/lib/api-handlers/posts.ts", {
    "./auth": { VERIFY: async () => new Response(JSON.stringify({user:{name:"등록자"}})) },
    "@/lib/work-entry-schema": { ensureWorkEntrySchema: async () => {} },
    "@/lib/db": { db: {}, executeMutation: async () => { throw new Error("offline"); } },
  });
  const result = await handlers.POST(request({ type: "work", title: "현장 업무", assignee: "담당자" }));
  assert.equal(result.status, 500);
  assert.equal((await result.json()).success, false);
});

test("partial purchase edits do not overwrite unspecified DB columns", async () => {
  const writes = [];
  const handlers = loadModule("src/lib/api-handlers/purchases.ts", {
    "@/lib/db": { db: {}, executeMutation: async (sql, args) => { writes.push({ sql, args }); return { success: true }; } },
  });
  await handlers.PUT(request({ id: "purchase", quantity: 4 }));
  assert.match(writes[0].sql, /SET quantity = \? WHERE id = \?/);
  assert.equal(writes[0].args.join(","), "4,purchase");
});

test("ready-to-ship work does not count as completed installation", () => {
  const { getDashboardMetrics } = loadModule("src/lib/dataStore.ts");
  const metrics = getDashboardMetrics([
    { status: "준비완료" }, { status: "시공완료" },
  ], []);
  assert.equal(metrics.completionRate, 50);
  assert.equal(metrics.kanban.ready.length, 1);
});


test("editable body renders screenshots inline while documents remain separate", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { UnifiedBoardEditor } = loadModule("src/components/common/UnifiedBoardEditor.tsx");
  const html = renderToStaticMarkup(React.createElement(UnifiedBoardEditor, {
    description: "현장 요청사항\n![본문 이미지](attachment:image)", onChangeDescription() {}, onChangeAttachments() {}, minRows: 9,
    attachments: [
      { id: "image", name: "현장.png", url: "/test-image.png", fileType: "image" },
      { id: "pdf", name: "제작도면.pdf", url: "/test-drawing.pdf", fileType: "pdf" },
    ],
  }));
  assert.match(html, /contentEditable="true"/);
  assert.match(html, /min-height:15.75rem/);
  assert.doesNotMatch(html, /aria-label="첨부 이미지 미리보기"/);
  assert.match(html, /data-body-image="image"/);
  assert.match(html, /src="\/test-image.png"/);
  assert.doesNotMatch(html, /attachment:image/);
  assert.doesNotMatch(html, /현장.png 이미지 미리보기/);
  assert.match(html, /제작도면.pdf 열기/);
  assert.match(html, /download="제작도면.pdf"/);
  assert.match(html, /aria-label="제작도면.pdf 다운로드"/);
  assert.match(html, />PDF<\/span>/);
  assert.match(html, /본문에 사진·파일 추가/);
});

test("clipboard captures accept item files and browser file-list fallback without duplicates", () => {
  const { clipboardFiles } = loadModule("src/lib/clipboard-files.ts");
  const screenshot = { name: "image.png", type: "image/png" };
  const text = { kind: "string", getAsFile: () => null };
  const image = { kind: "file", getAsFile: () => screenshot };
  assert.deepEqual(Array.from(clipboardFiles({ items: [text, image], files: [screenshot] })), [screenshot]);
  assert.deepEqual(Array.from(clipboardFiles({ items: [text], files: [screenshot] })), [screenshot]);
  assert.equal(clipboardFiles({ items: [text], files: [] }).length, 0);
});

test("only drawing tasks display drawing integration, and body comes before optional details", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const item = { id: "fixture", title: "검증 업무", status: "대기", dueDate: "2026-12-01", cardType: "기타", attachments: [], comments: [] };
  const { TaskDetailModal } = loadModule("src/components/dashboard/TaskDetailModal.tsx", {
    "@/context/DataContext": { useData: () => ({ workItems: [item], updateWorkItem() {}, isSaving: false }) },
    "@/context/AuthContext": { useAuth: () => ({ user: null }) },
    "@/components/dashboard/MaterialOrderManager": { MaterialOrderManager: () => null },
  });
  const render = () => renderToStaticMarkup(React.createElement(TaskDetailModal, { item, onClose() {} }));
  assert.doesNotMatch(render(), /도면 정보 ·/);
  item.cardType = "도면";
  const html = render();
  assert.match(html, /도면 정보 ·/);
  assert.ok(html.indexOf("기본정보 · 업무 내용") < html.indexOf("도면 정보 ·"));
  assert.match(html, /aria-label="현재 업무 상태"/);
});


test("image positions survive storage and legacy text remains safe", () => {
  const { bodyHtml, imageMarker, bodyText, bodyImageIds } = loadModule("src/lib/body-content.ts");
  const attachments = [{ id: "photo-1", name: "hidden-name.png", url: "/photo.png", fileType: "image" }];
  const body = `이미지 앞\n${imageMarker("photo-1")}\n이미지 뒤`;
  const html = bodyHtml(body, attachments);
  assert.ok(html.indexOf("이미지 앞") < html.indexOf("<img"));
  assert.ok(html.indexOf("<img") < html.indexOf("이미지 뒤"));
  assert.equal(bodyText(body), "이미지 앞\n\n이미지 뒤");
  assert.deepEqual([...bodyImageIds(body)], ["photo-1"]);
  assert.doesNotMatch(html, /hidden-name/);
  assert.match(bodyHtml('<script>alert("x")</script>', attachments), /&lt;script&gt;/);
  assert.doesNotMatch(bodyHtml("", [{ ...attachments[0], url: 'javascript:alert("x")' }]), /<img/);
  assert.match(bodyHtml("기존 메모", attachments), /기존 메모.*<img/);
});


const authEnvironment = { process: { env: { NODE_ENV: "test", JWT_SECRET: "test-only-signing-secret" } } };
const approvedStaff = { id: 42, login_id: "staff-account", name: "등록 직원", level: 4, client_id: null, status: "APPROVED", password: "correct-password" };
function authHandlers(rows, success = true, connected = true) {
  return loadModule("src/lib/api-handlers/auth.ts", {
    "@/lib/db": { db: connected ? {} : null, executeQuery: async () => ({ success, rows }) },
  }, authEnvironment);
}

test("unregistered, client, pending, missing membership and wrong-password accounts cannot sign in", async () => {
  for (const rows of [[{ ...approvedStaff, level: 2 }], [{ ...approvedStaff, level: undefined }], [], [{ ...approvedStaff, client_id: 99 }], [{ ...approvedStaff, status: "PENDING" }], [{ ...approvedStaff, client_id: undefined }], [approvedStaff, approvedStaff]]) {
    const response = await authHandlers(rows).LOGIN(request({ loginId: "staff-account", password: "correct-password" }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).token, undefined);
  }
  assert.equal((await authHandlers([approvedStaff]).LOGIN(request({ loginId: "staff-account", password: "incorrect" }))).status, 401);
  assert.equal((await authHandlers([approvedStaff]).LOGIN(request({ loginId: "staff-account" }))).status, 400);
});

test("DB outage or unconfigured DB never grants a mock staff session", async () => {
  for (const handlers of [authHandlers([], false), authHandlers([], true, false)]) {
    const response = await handlers.LOGIN(request({ loginId: "김진우", password: "anything" }));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).token, undefined);
  }
});

test("approved staff credentials issue a token, but revoked staff cannot restore it", async () => {
  const handlers = authHandlers([approvedStaff]);
  const response = await handlers.LOGIN(request({ loginId: "staff-account", password: "correct-password" }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.password, undefined);
  assert.equal(handlers.verifyToken(body.token).id, 42);
  assert.equal(handlers.verifyToken(body.token + "modified"), null);
  const verification = { url: `http://localhost/api/auth?token=${encodeURIComponent(body.token)}`, headers: new Headers(), cookies: { get() {} } };
  assert.equal((await handlers.VERIFY(verification)).status, 200);
  assert.equal((await authHandlers([{ ...approvedStaff, client_id: 3 }]).VERIFY(verification)).status, 401);
  assert.equal((await authHandlers([{ ...approvedStaff, status: "PENDING" }]).VERIFY(verification)).status, 401);
  assert.equal((await authHandlers([], false).VERIFY(verification)).status, 503);
});

test("login UI has no staff chooser and requires a password", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { default: LoginPage } = loadModule("src/app/login/page.tsx", {
    "@/context/AuthContext": { useAuth: () => ({ user: null, login() {} }) },
    "next/navigation": { useRouter: () => ({ push() {} }) },
  });
  const html = renderToStaticMarkup(React.createElement(LoginPage));
  assert.doesNotMatch(html, /빠른 선택|김진우|이민아|내선번호|토큰 발행/);
  assert.match(html, /type="password"/);
  assert.match(html, /autoComplete="current-password"/);
  assert.match(html, /required=""/);
});

test("staff directory is inaccessible without a verified staff session", async () => {
  let queried = false;
  const handlers = loadModule("src/lib/api-handlers/users.ts", {
    "@/lib/db": { executeQuery: async () => { queried = true; return { success: true, rows: [] }; } },
    "@/lib/api-handlers/auth": { VERIFY: async () => new Response("{}", { status: 401 }) },
  });
  assert.equal((await handlers.GET({})).status, 401);
  assert.equal(queried, false);
});

test("work board opens in list view while keeping the kanban switch available", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { default: WorkBoardPage } = loadModule("src/app/work/page.tsx", {
    "@/context/DataContext": { useData: () => ({ workItems: [], isSaving: false }) },
    "@/components/dashboard/WorkOverview": { WorkOverview: () => null },
    "@/components/dashboard/KanbanBoard": { KanbanBoard: () => React.createElement("div", null, "kanban-content") },
    "@/components/dashboard/MaterialOrderManager": { MaterialOrderManager: () => null },
    "@/components/dashboard/TaskDetailModal": { TaskDetailModal: () => null },
  });
  const html = renderToStaticMarkup(React.createElement(WorkBoardPage));
  assert.match(html, /<table/);
  assert.match(html, /업무 \/ 프로젝트명/);
  assert.doesNotMatch(html, /kanban-content/);
  assert.match(html, /칸반 투두 보드/);
});

test("AS details show request, resolution, contact, dates and actions", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { AsDetailModal } = loadModule("src/components/as/AsDetailModal.tsx");
  const html = renderToStaticMarkup(React.createElement(AsDetailModal, {
    item: { id: "as-test", clientName: "검증 업체", siteAddress: "검증 현장", constructDate: "2026-10-01", asDate: "2026-10-15", createdAt: "2026-10-09", reason: "도어 조절 요청", resolutionDetails: "경첩 조절 완료", technician: "검증 기사", contactPhone: "010-0000-0000", resultStatus: "처리중", priority: "보통" },
    onClose() {}, onEdit() {}, onPrint() {}, onOpenPhoto() {},
  }));
  assert.match(html, /role="dialog"/);
  for (const text of ["검증 업체", "도어 조절 요청", "경첩 조절 완료", "검증 기사", "2026-10-15", "접수증 인쇄", "A\/S 상세 닫기"]) assert.ok(html.includes(text));
});

test("client lookup never substitutes example companies for missing or failed DB", async () => {
  for (const db of [null, {}]) {
    const handlers = loadModule("src/lib/api-handlers/clients.ts", {
      "@/lib/db": { db, executeQuery: async () => ({ success: false }) },
    });
    const response = await handlers.GET({ url: "http://localhost/api/clients" });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.deepEqual(body.clients, []);
  }
});

test("a valid empty client directory stays empty", async () => {
  const handlers = loadModule("src/lib/api-handlers/clients.ts", {
    "@/lib/db": { db: {}, executeQuery: async () => ({ success: true, rows: [] }) },
  });
  const response = await handlers.GET({ url: "http://localhost/api/clients" });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).clients, []);
});

test("missing upload data cannot create a successful fake attachment URL", async () => {
  const handler = loadModule("src/lib/api-handlers/upload.ts");
  const response = await handler.POST({ headers: new Headers({ "content-type": "application/json" }), json: async () => ({ fileName: "missing.pdf" }) });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("kanban flags overdue active work but never completed work", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { KanbanBoard } = loadModule("src/components/dashboard/KanbanBoard.tsx", {
    "@/context/DataContext": { useData: () => ({}) },
    "@/context/AuthContext": { useAuth: () => ({ user: null }) },
    "@/lib/date": { getToday: () => "2026-10-10", getDaysUntil: (date) => date ? (Date.parse(date) - Date.parse("2026-10-10")) / 86400000 : null },
    "@/components/dashboard/TaskDetailModal": { TaskDetailModal: () => null },
  });
  const item = { id: "test", title: "검증 업무", status: "대기", dueDate: "2026-10-08", priority: "보통", category: "제작" };
  const render = (task) => renderToStaticMarkup(React.createElement(KanbanBoard, { items: [task], showCompleted: true }));
  assert.match(render(item), /2일 지연/);
  assert.doesNotMatch(render({ ...item, status: "시공완료", priority: "긴급" }), /2일 지연|D-/);
  assert.doesNotMatch(render({ ...item, dueDate: "" }), /D-null|NaN/);
});

test("manual plywood registration persists name, SKU and image across handler reload", async () => {
  const rows = new Map();
  const database = { db: {},
    executeMutation: async (sql, args) => { if (sql.startsWith("INSERT")) rows.set(args[1], { id: args[0], data: args[3] }); return { success: true }; },
    executeQuery: async (sql, args) => ({ success: true, rows: sql.includes("bo_plywood_official") ? (args?.[0] === "BL-30" ? [{ id: "balon-28" }] : []) : sql.includes("bo_plywood_image_overrides") ? [] : sql.startsWith("SELECT id") ? (rows.has(args[0]) ? [rows.get(args[0])] : []) : [...rows.values()] }),
  };
  const mocks = { "@/lib/db": database, "./auth": { VERIFY: async () => ({ ok: true }) } };
  const handler = loadModule("src/lib/api-handlers/plywoods.ts", mocks);
  const image = "data:image/png;base64,iVBORw0KGgo=";
  const created = await handler.POST(request({ name: "검증 합판", code: "test-99", color: "#eeeeee", image }));
  assert.equal(created.status, 201);
  const reloaded = loadModule("src/lib/api-handlers/plywoods.ts", mocks);
  const data = (await (await reloaded.GET()).json()).data;
  assert.equal(data[0].name, "검증 합판");
  assert.equal(data[0].code, "TEST-99");
  assert.equal(data[0].image, image);
  assert.equal((await reloaded.POST(request({ name: "중복", code: "TEST-99" }))).status, 409);
  assert.equal((await reloaded.POST(request({ name: "공식 중복", code: "BL-30" }))).status, 409);
});

test("manual plywood rejects anonymous writes, invalid input and DB failures", async () => {
  const denied = new Response(null, { status: 401 });
  const unauthenticated = loadModule("src/lib/api-handlers/plywoods.ts", { "./auth": { VERIFY: async () => denied }, "@/lib/db": { db: null } });
  assert.equal((await unauthenticated.POST(request({}))).status, 401);
  const handler = loadModule("src/lib/api-handlers/plywoods.ts", { "./auth": { VERIFY: async () => ({ ok: true }) }, "@/lib/db": { db: null } });
  assert.equal((await handler.POST(request({ name: "품번 없음" }))).status, 400);
  assert.equal((await handler.POST(request({ name: "잘못된 이미지", code: "NEW-1", image: "https://invalid.example/image.svg" }))).status, 400);
  assert.equal((await handler.POST(request({ name: "연결 실패", code: "NEW-1" }))).status, 503);
});

test("official plywood image overrides persist by ID without mixing duplicate SKUs", async () => {
  const overrides = new Map();
  const mocks = {
    "./auth": { VERIFY: async () => ({ ok: true }) },
    "@/lib/db": { db: {},
      executeMutation: async (sql, args) => { if (sql.startsWith("INSERT INTO bo_plywood_image_overrides")) overrides.set(args[0], args[1]); return { success: true }; },
      executeQuery: async (sql, args) => ({ success: true, rows: sql.includes("bo_plywood_official") ? (!args || args[0] === "balon-28" ? [{ data: JSON.stringify({ id: "balon-28", code: "BL-30", name: "스카이블루", image: "/original.jpg" }) }] : []) : sql.includes("overrides") ? [...overrides].map(([id, image]) => ({ id, image })) : [] }),
    },
  };
  const image = "data:image/png;base64,iVBORw0KGgo=";
  const handler = loadModule("src/lib/api-handlers/plywoods.ts", mocks);
  const response = await handler.PUT(request({ id: "balon-28", image, name: "무시할 이름", code: "잘못된 품번" }));
  assert.equal(response.status, 200);
  const saved = (await response.json()).data;
  assert.equal(saved.name, "스카이블루");
  assert.equal(saved.code, "BL-30");
  const reloaded = loadModule("src/lib/api-handlers/plywoods.ts", mocks);
  const data = (await (await reloaded.GET()).json()).data;
  assert.equal(data.length, 1);
  assert.equal(data[0].id, "balon-28");
  assert.equal(data[0].image, image);
  assert.equal((await handler.PUT(request({ id: "missing", image }))).status, 404);
  assert.equal((await handler.PUT(request({ id: "balon-28", image: "javascript:bad" }))).status, 400);
});

test("manual plywood image edit changes only image and requires staff authentication", async () => {
  const original = { id: "manual-test", code: "TEST", name: "기존 합판", image: null, color: "#ffffff" };
  let mutation;
  const handler = loadModule("src/lib/api-handlers/plywoods.ts", {
    "./auth": { VERIFY: async () => ({ ok: true }) },
    "@/lib/db": { db: {}, executeQuery: async (sql) => ({ success: true, rows: sql.includes("bo_plywood_official") ? [] : [{ data: JSON.stringify(original) }] }), executeMutation: async (sql, args) => { if (sql.startsWith("UPDATE")) mutation = { sql, args }; return { success: true }; } },
  });
  const image = "data:image/png;base64,iVBORw0KGgo=";
  const response = await handler.PUT(request({ id: original.id, image }));
  assert.equal(response.status, 200);
  assert.match(mutation.sql, /json_set\(data, '\$\.image'/);
  assert.equal(mutation.args[1], original.id);
  assert.equal((await response.json()).data.name, original.name);
  const denied = loadModule("src/lib/api-handlers/plywoods.ts", { "./auth": { VERIFY: async () => new Response(null, { status: 401 }) }, "@/lib/db": { db: null } });
  assert.equal((await denied.PUT(request({ id: original.id, image }))).status, 401);
});


test("plywood listing uses DB records and never silently substitutes local catalog", async () => {
  const failed = loadModule("src/lib/api-handlers/plywoods.ts", { "@/lib/db": { db: {}, executeMutation: async () => ({}), executeQuery: async () => ({ success: false, rows: [] }) } });
  assert.equal((await failed.GET()).status, 503);
  const empty = loadModule("src/lib/api-handlers/plywoods.ts", { "@/lib/db": { db: {}, executeMutation: async () => ({}), executeQuery: async () => ({ success: true, rows: [] }) } });
  assert.deepEqual((await (await empty.GET()).json()).data, []);
});


test("confirmation schema adds completed state to existing work without changing pending state", async () => {
  const database = nativeRequire("@libsql/client").createClient({url:"file::memory:"});
  try {
    await database.execute("CREATE TABLE bo_work_items(id TEXT PRIMARY KEY, confirmation_pending INTEGER NOT NULL DEFAULT 0)");
    await database.execute("INSERT INTO bo_work_items VALUES ('existing', 1)");
    const mock = { db: database,
      executeQuery: async sql => ({success: true, rows: (await database.execute(sql)).rows}),
      executeMutation: async sql => database.execute(sql),
    };
    const schema = loadModule("src/lib/work-confirmation-schema.ts", {"./db": mock});
    await schema.ensureWorkConfirmationSchema();
    await schema.ensureWorkConfirmationSchema();
    const saved = (await database.execute("SELECT * FROM bo_work_items")).rows[0];
    assert.equal(saved.confirmation_pending, 1);
    assert.equal(saved.confirmation_completed, 0);
  } finally { database.close(); }
});


test("drawing block recognizes legacy PDFs and keeps drawing removal separate from order images", () => {
  const {isDrawingAttachment, replaceAttachmentGroup} = loadModule("src/lib/drawing-attachments.ts");
  const image = {id:"image",name:"발주.jpg",fileType:"image",url:"/order.jpg"};
  const legacy = {id:"legacy",name:"도면.PDF",fileType:"file",url:"/drawing"};
  const data = {id:"data",name:"scan",fileType:"file",url:"data:application/pdf;base64,JVBERg=="};
  assert.equal(isDrawingAttachment(image), false);
  assert.equal(isDrawingAttachment(legacy), true);
  assert.equal(isDrawingAttachment(data), true);
  const withoutImages = replaceAttachmentGroup([image,legacy], [], false);
  assert.deepEqual(Array.from(withoutImages, value => value.id), ["legacy"]);
  const withoutDrawings = replaceAttachmentGroup([image,legacy,data], [], true);
  assert.deepEqual(Array.from(withoutDrawings, value => value.id), ["image"]);
});

test("drawing upload shows PDF registration and a dedicated file input without another canvas", () => {
  const React = nativeRequire("react");
  const {renderToStaticMarkup} = nativeRequire("react-dom/server");
  const {DrawingUploadBlock} = loadModule("src/components/common/DrawingUploadBlock.tsx");
  const render = attachments => renderToStaticMarkup(React.createElement(DrawingUploadBlock, {attachments,onChange:()=>{}}));
  assert.match(render([]), /도면 미등록/);
  const html = render([{id:"pdf",name:"현장.PDF",fileType:"file",url:"/drawing.pdf"}]);
  assert.match(html, /도면 등록됨/);
  assert.match(html, /도면 PDF 선택/);
  assert.ok(html.includes('accept=".pdf,application/pdf"'));
  assert.doesNotMatch(html, /contentEditable|contenteditable/);
});


test("calendar form follows schedule defaults until the checkbox is explicitly changed", () => {
  const {createWorkDraft,prepareWorkDraft}=loadModule("src/lib/work-form.ts");
  const {isCalendarVisible}=loadModule("src/lib/calendar-visibility.ts");
  const draft=createWorkDraft(undefined,"2026-10-21","담당자");
  draft.clientName="업체";
  assert.equal(draft.calendarVisible,undefined);
  assert.equal(isCalendarVisible(draft),true);
  draft.deadlineType="요청일";
  assert.equal(isCalendarVisible(draft),false);
  draft.calendarVisible=true;
  const saved=prepareWorkDraft(draft);
  const edited=createWorkDraft(saved,"2026-10-22","담당자");
  assert.equal(isCalendarVisible(edited),true);
  edited.calendarVisible=false;
  edited.deadlineType="시공일";
  assert.equal(isCalendarVisible(edited),false);
});


test("drawing icon opens the PDF directly, stops the card click and stays off without a drawing", () => {
  const React=nativeRequire("react");const slots=[];let cursor=0;
  const hookReact={...React,useEffect(){},useRef(value){const index=cursor++;return slots[index] ?? (slots[index]={current:value});},useState(value){const index=cursor++;if(!(index in slots))slots[index]=value;return [slots[index],next=>{slots[index]=next;}];}};
  function PdfPreview() { return null; }
  const {DrawingQuickOpen}=loadModule("src/components/common/DrawingQuickOpen.tsx",{
    react:hookReact,"react-dom":{createPortal:node=>node},"./PdfPreview":{PdfPreview},"@/lib/use-modal-back":{useModalBack(){}},
  },{document:{body:{}}});
  const item={attachments:[],detailsLoaded:false,drawingAttachment:{id:"drawing id",name:"현장.pdf"}};
  const render=()=>{cursor=0;return DrawingQuickOpen({item});};
  const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==="object"?[node,...walk(node.props?.children)]:[];
  let nodes=walk(render());
  const button=nodes.find(node=>node.type==="button");
  assert.equal(button.props.disabled,false);
  assert.equal(button.props["data-drawing-registered"],true);
  let stopped=false;button.props.onClick({stopPropagation(){stopped=true;}});assert.equal(stopped,true);
  nodes=walk(render());
  assert.ok(nodes.some(node=>node.type==="dialog"));
  assert.equal(nodes.find(node=>node.type===PdfPreview).props.url,"/api/posts?type=work&attachment_id=drawing%20id");
  nodes.find(node=>node.props?.["aria-label"]==="도면 닫기").props.onClick();
  assert.ok(!walk(render()).some(node=>node.type==="dialog"));
  item.drawingAttachment=null;
  const empty=walk(render()).find(node=>node.type==="button");
  assert.equal(empty.props.disabled,true);
  assert.equal(empty.props["data-drawing-registered"],false);
});

test("memory summaries carry drawing metadata while the PDF bytes load only on click", async () => {
  const mocks={"@/lib/db":{db:null},"./db":{db:null}};const cache=new Map();
  const {serverStore}=loadModule("src/lib/serverStore.ts",mocks,{},cache);
  const pdf="data:application/pdf;base64,"+Buffer.from("drawing contents").toString("base64");
  serverStore.addWorkItem({type:"work",title:"図面",clientName:"업체",attachments:[{id:"drawing-only",name:"도면.pdf",fileType:"pdf",url:pdf,uploadedAt:"2026-10-21"}]},"drawing-work");
  const posts=loadModule("src/lib/api-handlers/posts.ts",mocks,{Response},cache);
  const result=await (await posts.GET({url:"http://localhost/api/posts?type=work&summary=1&q="+encodeURIComponent("図面")})).json();
  assert.equal(result.data[0].drawingAttachment.id,"drawing-only");
  assert.ok(!JSON.stringify(result).includes(pdf));
  const opened=await posts.GET({url:"http://localhost/api/posts?type=work&attachment_id=drawing-only"});
  assert.equal(opened.headers.get("Content-Type"),"application/pdf");
  assert.equal(await opened.text(),"drawing contents");
  await posts.PUT(request({id:"drawing-work",type:"work",attachments:[]}));
  const removed=await (await posts.GET({url:"http://localhost/api/posts?type=work&summary=1&q="+encodeURIComponent("図面")})).json();
  assert.equal(removed.data[0].drawingAttachment,null);
  assert.equal((await posts.GET({url:"http://localhost/api/posts?type=work&attachment_id=drawing-only"})).status,404);
});

 test("photo grouping uses adjacent capture gaps and never guesses missing dates",()=>{
  const {groupPhotos}=loadModule("src/lib/photo-groups.ts");
  const input=[{id:"missing"},{id:"third",takenAt:600000},{id:"first",takenAt:0},{id:"next-site",takenAt:900001},{id:"second",takenAt:300000},{id:"invalid",takenAt:NaN}];
  assert.equal(JSON.stringify(groupPhotos(input).map(group=>group.map(p=>p.id))),JSON.stringify([["first","second","third"],["next-site"],["missing","invalid"]]));
  assert.equal(input[0].id,"missing");assert.equal(groupPhotos([]).length,0);
 });

test("photo picker batches 20 photos and retries only unsaved selections",async()=>{
 const React=nativeRequire("react"),slots=[];let cursor=0,closed=0,attempt=0;
 const saved=[];
 const hookReact={...React,useEffect(){},useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});},useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==="function"?value():value;return [slots[i],next=>slots[i]=typeof next==="function"?next(slots[i]):next];}};
 const {ConstructionPhotoPicker}=loadModule("src/components/common/ConstructionPhotoPicker.tsx",{react:hookReact,exifr:{parse:async()=>({})},"@/lib/use-modal-back":{useModalBack(){}},"@/lib/photo-compression":{readPhotoFile:async file=>file.name,compressPhoto:async value=>value}},{URL:{createObjectURL:file=>"blob:"+file.name,revokeObjectURL(){}}});
 const props={title:"현장",onClose:()=>closed++,onUpload:async photos=>{attempt++;assert.ok(photos.length<=3);if(attempt===2)throw Error("연결 실패");saved.push(...photos);}};
 const render=()=>{cursor=0;return ConstructionPhotoPicker(props);};
 const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==="object"?[node,...walk(node.props?.children)]:[];
 let tree=render();const files=Array.from({length:20},(_,i)=>({name:String(i),type:"image/jpeg",size:100}));
 walk(tree).find(n=>n.type==="input"&&n.props.type==="file").props.onChange({target:{files,value:""}});
 await new Promise(resolve=>setImmediate(resolve));tree=render();
 const submit=tree=>walk(tree).find(n=>n.type==="button"&&typeof n.props.children==="string"&&n.props.children.includes("장 등록"));
 assert.equal(submit(tree).props.children,"선택한 20장 등록");submit(tree).props.onClick();
 await new Promise(resolve=>setImmediate(resolve));tree=render();assert.equal(saved.length,3);assert.equal(closed,0);assert.equal(submit(tree).props.children,"선택한 17장 등록");
 submit(tree).props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.equal(saved.length,20);assert.equal(new Set(saved).size,20);assert.equal(closed,1);
});

test("successful photo upload asks before completion, cancellation preserves status and failure can retry",async()=>{
 const React=nativeRequire("react"),slots=[];let cursor=0,calls=0,fail=true;
 const hookReact={...React,useEffect(){},useMemo:fn=>fn(),useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});},useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==="function"?value():value;return[slots[i],next=>slots[i]=typeof next==="function"?next(slots[i]):next];}};
 const item={id:"fixture",title:"현장",status:"준비완료",dueDate:"2026-10-21",cardType:"도면",attachments:[],comments:[]};function Picker(){return null;}
 const {TaskDetailModal}=loadModule("src/components/dashboard/TaskDetailModal.tsx",{react:hookReact,"@/context/AuthContext":{useAuth:()=>({user:{name:"기사"}})},"@/context/DataContext":{useData:()=>({workItems:[item],isSaving:false,updateWorkItem:async(id,values)=>{calls++;if(fail)throw Error("offline");Object.assign(item,values);}})},"@/components/common/ConstructionPhotoPicker":{ConstructionPhotoPicker:Picker}});
 const render=()=>{cursor=0;const gate=TaskDetailModal({item,onClose(){},startPhotoUpload:true});const content=gate.props.children(item);return content.type(content.props);};
 const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==="object"?[node,...walk(node.props?.children)]:[];
 let tree=render();walk(tree).find(n=>n.type===Picker).props.onUploaded();tree=render();assert.equal(calls,0);assert.ok(walk(tree).some(n=>n.props?.role==="alertdialog"));
 walk(tree).find(n=>n.type==="button"&&n.props.children==="나중에").props.onClick();tree=render();assert.equal(item.status,"준비완료");assert.equal(calls,0);
 walk(tree).find(n=>n.type==="button"&&Array.isArray(n.props.children)&&n.props.children.includes(" · 완료하기")).props.onClick();tree=render();
 walk(tree).find(n=>n.type==="button"&&n.props.children==="시공완료").props.onClick();await new Promise(r=>setImmediate(r));tree=render();assert.ok(walk(tree).some(n=>n.props?.role==="alert"));assert.equal(item.status,"준비완료");
 fail=false;walk(tree).find(n=>n.type==="button"&&n.props.children==="시공완료").props.onClick();await new Promise(r=>setImmediate(r));tree=render();assert.equal(item.status,"시공완료");assert.equal(item.progress,100);assert.ok(!walk(tree).some(n=>n.props?.role==="alertdialog"));
});
test("PDF zoom reaches 600 percent and resets to fit width",()=>{
 const React=nativeRequire("react"),slots=[];let cursor=0;
 const hookReact={...React,useEffect(){},useRef:value=>({current:value}),useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],next=>slots[i]=typeof next==="function"?next(slots[i]):next];}};
 const {PdfPreview}=loadModule("src/components/common/PdfPreview.tsx",{react:hookReact});const render=()=>{cursor=0;return PdfPreview({url:"/fixture.pdf"});};const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==="object"?[node,...walk(node.props?.children)]:[];
 for(let i=0;i<15;i++)walk(render()).find(n=>n.props?.["aria-label"]==="PDF 확대").props.onClick();
 assert.equal(walk(render()).find(n=>n.props?.["aria-label"]==="PDF 확대").props.disabled,true);
 assert.equal(walk(render()).find(n=>n.props?.["aria-live"]==="polite").props.children[0],600);
 walk(render()).find(n=>n.type==="button"&&n.props.children==="폭 맞춤").props.onClick();assert.equal(walk(render()).find(n=>n.props?.["aria-live"]==="polite").props.children[0],100);
});

test("gallery details show company, site, both colors and only registered drawing actions", () => {
  const React=nativeRequire("react");
  const {renderToStaticMarkup}=nativeRequire("react-dom/server");
  const {GalleryPhotoDetails}=loadModule("src/components/common/GalleryPhotoDetails.tsx", {
    "./DrawingQuickOpen":{DrawingQuickOpen:({item})=>React.createElement("button",{"data-drawing-id":item.drawingAttachment.id},"도면")},
  });
  const image={clientName:"업체명",siteAddress:"긴 현장 주소",boardColor:"화이트",postColor:"흑니켈",drawingAttachment:{id:"pdf-one",name:"도면.pdf"}};
  const html=renderToStaticMarkup(React.createElement(GalleryPhotoDetails,{image}));
  for(const text of ["업체명","긴 현장 주소","#선반 화이트","#포스트 흑니켈",'data-drawing-id="pdf-one"'])assert.ok(html.includes(text),text);
  const empty=renderToStaticMarkup(React.createElement(GalleryPhotoDetails,{image:{siteName:"기존 현장"}}));
  assert.ok(empty.includes("기존 현장"));
  assert.ok(!empty.includes("도면 보기"));
  assert.ok(!empty.includes("#선반"));
  assert.ok(!empty.includes("#포스트"));
});

test("gallery ZIP preserves selected original bytes, uses safe unique filenames and sends credentials only to protected photos", async () => {
  const calls=[];
  const bytes=Buffer.from([255,216,1,2,3]);
  const {createGalleryArchive}=loadModule("src/lib/gallery-download.ts",{}, {Blob,fetch:async(url,options)=>{calls.push({url,options});return new Response(bytes,{headers:{"Content-Type":"image/jpeg"}});}});
  const images=[{id:"one",title:"같은/사진",clientName:"업체",url:"/api/gallery?source=comment&id=c&index=0&thumbnail=240"},{id:"two",title:"같은/사진",clientName:"업체",url:"https://photos.example/image.jpg"}];
  const progress=[];
  const archive=await createGalleryArchive(images,"private-session",new AbortController().signal,(done,total)=>progress.push([done,total]));
  const entries=nativeRequire("fflate").unzipSync(archive);
  const names=Object.keys(entries);
  assert.equal(names.length,2);
  for(const name of names){assert.ok(!name.includes("/"));assert.match(name,/\.jpg$/);assert.deepEqual(Buffer.from(entries[name]),bytes);}
  assert.ok(!calls[0].url.includes("thumbnail"));
  assert.equal(calls[0].options.headers.Authorization,"Bearer private-session");
  assert.equal(calls[1].options.headers,undefined);
  assert.equal(calls[1].options.credentials,"omit");
  assert.deepEqual(progress,[[0,2],[1,2],[2,2]]);
});

test("gallery ZIP stops on failure, cancellation and size limit instead of silently omitting photos", async () => {
  let calls=0;
  const images=[{title:"첫 사진",url:"/api/gallery?source=comment&id=1"},{title:"둘째 사진",url:"/api/gallery?source=comment&id=2"}];
  const failing=loadModule("src/lib/gallery-download.ts",{}, {Blob,fetch:async()=>{calls++;return calls===1 ? new Response("photo",{headers:{"Content-Type":"image/png"}}) : new Response("denied",{status:401});}});
  await assert.rejects(()=>failing.createGalleryArchive(images,"token",new AbortController().signal,()=>{}),/로그인/);
  assert.equal(calls,2);
  const cancelled=new AbortController();cancelled.abort();
  await assert.rejects(()=>failing.createGalleryArchive(images,"token",cancelled.signal,()=>{}));
  assert.equal(calls,2,"cancelled requests never fetch");
  const oversized=loadModule("src/lib/gallery-download.ts",{"@/lib/photo-access":{isProtectedPhoto:()=>true,fetchPhotoBlob:async()=>({size:101*1024*1024})}});
  await assert.rejects(()=>oversized.createGalleryArchive(images,"token",new AbortController().signal,()=>{}),/100MB/);
  await assert.rejects(()=>failing.createGalleryArchive([],"token",new AbortController().signal,()=>{}),/선택/);
});
