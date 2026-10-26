import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { unzipSync, strFromU8 } from "fflate";
import * as XLSX from "xlsx";
const nativeRequire=createRequire(import.meta.url);
function load(file,mocks={},cache=new Map()){
  const path=resolve(file);if(cache.has(path))return cache.get(path).exports;
  const module={exports:{}};cache.set(path,module);
  const code=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const require=name=>name in mocks?mocks[name]:name.startsWith("@/")?load(`src/${name.slice(2)}.ts`,mocks,cache):name.startsWith("./")?load(resolve(path,"..",name+".ts"),mocks,cache):nativeRequire(name);
  new Script(`(function(require,module,exports){${code}\n})`,{filename:path}).runInNewContext({console,Buffer,URL,Set,Number,Date,JSON,process:{env:{NODE_ENV:"test"}},crypto:globalThis.crypto})(require,module,module.exports);
  return module.exports;
}
const shipping=load("src/lib/shipping.ts");
const exporter=load("src/lib/shipping-excel.ts");
const header=["장부명","구분","계정과목","적요"];
const rows=[header,
 ["방문업체","출고","제품매출","서울시 종로구 세종대로 1/010-1111-2222"],
 ["보드업체","출고","제품매출","이번에 들어온 보드 출고할것///화물착불/경기도 시흥시 방산동 1/010-1111-2222"],
 ["홈파트너","출고","제품매출","대신선택/테스트고객/서울시 서초구 서초대로 50/010-2222-3333"],
 ["홈파트너","출고","제품매출","대신착택/테스트가구/경북 칠곡군 석적읍 호국로 1/010-3333-4444"],
 ["홈파트너","출고","제품매출","대신착택/테스트퍼니처/제주도 서귀포시 대청로 1/010-4444-5555"],
 ["다른장부/해주","출고","제품매출","(강과장)대신착불택배///경주시 외동읍 석계평리길 1 해주주방가구//010-5555-6666"],
 ["유통상사","출고","제품매출","(강과장)대신화물착불//대구 월배점/010-6666-7777"],
 ["홈파트너","출고","제품매출","대신선택/테스트수신인/경기도 용인시 처인구 모현읍 오산로 1 단독주택/문앞/010-7777-8888"],
 ["삼양가구(제주도)","출고","제품매출","(강과장)대신화물착불//제주화북점//삼양가구 010-8888-9999"],
];
const batch=()=>({id:"12345678-1234-4234-8234-123456789012",date:"2026-10-26",sourceName:"test.xls",entries:shipping.parseShippingRows(rows,"Sheet1").entries});
test("daily ledger yields 4 BARON and 4 homepartner shipments, excludes direct delivery",()=>{
  const result=shipping.parseShippingRows(rows,"Sheet1");assert.equal(result.entries.length,8);assert.equal(result.excluded.length,1);
  assert.equal(result.entries.filter(e=>e.sender==="baron").length,4);
  assert.equal(result.entries.filter(e=>e.sender==="homepartner").length,4);
  assert.equal(result.entries.find(e=>e.customer==="다른장부/해주").recipient,"해주주방가구");
  assert.equal(result.entries.at(-1).recipient,"삼양가구");assert.equal(result.entries.at(-1).address,"제주화북점");
  assert.equal(result.entries[1].phone,"010-2222-3333");
  assert.ok(result.entries.at(-2).address.endsWith("/ 문앞"));
  assert.ok(result.entries.every(e=>e.product===""&&e.quantity===null));
});
test("all 4 modes, ambiguous modes, address words and cancelled inbound rows",()=>{
  for(const [note,expected] of [["대신선택/", "택배 선불"],["대신착택/","택배 착불"],["대신선화/","화물 선불"],["대신착화/","화물 착불"],["화물후불/","화물 착불"],["선택사항: 색상 선택","null"],["대전시 선화로 1","null"],["대신택배/미정",""]])assert.equal(String(shipping.classifyShipping(note)),expected);
  assert.equal(shipping.classifyShipping("대신선택/대신착화/"),"");
  const parsed=shipping.parseShippingRows([header,["A","입고","","대신선택/"],["B","출고","","대신착택/택배취소"]],"S");assert.equal(parsed.entries.length,0);
  assert.equal(shipping.parseShippingRows([["unrelated"]],"S"),null);
  assert.equal(shipping.extractRecipient("대신착택/고객/대전시 선화로 1/010-1234-5678","원장").address,"대전시 선화로 1");
  assert.equal(shipping.extractRecipient("대신착택/고객/서울시 서초구 1/02-123-4567/010-9876-5432","원장").phone,"010-9876-5432");
});
test("server validates dates, destinations, categories, duplicate rows and null versus zero quantities",()=>{
  assert.equal(shipping.validateShippingBatch(batch()).entries.length,8);
  for(const change of [b=>{b.date="2026-02-30";},b=>{b.entries[0].quantity=0;},b=>{b.entries[0].phone="";},b=>{b.entries[0].mode="";},b=>{b.entries[1].id=b.entries[0].id;},b=>{b.entries[0].sender="other";},b=>{b.entries=[];}]){
    const b=batch();change(b);assert.throws(()=>shipping.validateShippingBatch(b));
  }
});
test("native Excel exports both senders, escape XML, include circles and paginate 14 shipments",()=>{
  for(const sender of ["baron","homepartner"]){
    const template=readFileSync(`public/shipping-templates/${sender}.xlsx`),b=batch();
    b.entries.find(e=>e.sender===sender).recipient='테스트 & <수신인> "=1+1"';
    const bytes=exporter.makeShippingExcel(template,b,sender),files=unzipSync(bytes),sheet=strFromU8(files["xl/worksheets/sheet1.xml"]);
    if(process.env.SHIPPING_TEST_EXPORT_DIR)writeFileSync(resolve(process.env.SHIPPING_TEST_EXPORT_DIR,sender+"-4.xlsx"),bytes);
    const w=XLSX.read(bytes,{type:"array"});assert.equal(w.SheetNames.length,1);
    const s=w.Sheets[w.SheetNames[0]];assert.equal(s.B8.v,'테스트 & <수신인> "=1+1"');assert.equal(s.G6.v,"2026-10-26");assert.equal(s.D8?.v,undefined);
    assert.equal(s.A7.v,"수화주전화");
    for(const row of sheet.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*?>([\s\S]*?)<\/row>/g)){
      // A self-closing row is not an opening container.
      if(row[0].slice(0,row[0].indexOf('>')).endsWith('/'))continue;
      for(const c of row[2].matchAll(/<c\b[^>]*\br="[A-Z]+(\d+)"/g))assert.equal(c[1],row[1],"cell must belong to its row");
    }
    assert.equal((strFromU8(files["xl/drawings/drawing1.xml"]).match(/<a:prstGeom prst="ellipse"/g)||[]).length,4);
    assert.ok(sheet.indexOf("<pageSetup")<sheet.indexOf("<drawing"));assert.ok(!/<f(?:\s|>)/.test(sheet));
    const repeated={...b,entries:Array.from({length:14},(_,i)=>({...b.entries.find(e=>e.sender===sender),id:String(i)}))};
    const multi=exporter.makeShippingExcel(template,repeated,sender),m=XLSX.read(multi,{type:"array"});assert.equal(m.SheetNames.length,2);
    assert.equal(m.Sheets[m.SheetNames[1]].B8.v,'테스트 & <수신인> "=1+1"');
    if(process.env.SHIPPING_TEST_EXPORT_DIR)writeFileSync(resolve(process.env.SHIPPING_TEST_EXPORT_DIR,sender+"-14.xlsx"),multi);
    assert.ok(!Object.values(unzipSync(template)).some(v=>strFromU8(v).includes("010-")),"public template must not contain sample phone numbers");
  }
});
test("authenticated history persists snapshots, retries are idempotent, failures stay errors",async()=>{
  let allowed=true,fail=false,installer=false;const records=new Map(),calls=[];
  const handler=load("src/lib/api-handlers/shipping.ts",{
    "./auth":{VERIFY:async()=>allowed?Response.json({user:{name:"직원",onlineRole:installer?"installer":"staff"}}):new Response(null,{status:401})},
    "@/lib/db":{db:{},executeMutation:async(sql,args)=>{
      calls.push(sql);if(fail)throw Error("DB offline");
      if(sql.startsWith("INSERT")&&!records.has(args[0]))records.set(args[0],{id:args[0],shipping_date:args[1],source_name:args[2],entries_json:args[3],entry_count:args[4],baron_count:args[5],homepartner_count:args[6],content_hash:args[7],author:args[8],created_at:args[9]});
      return {rows:[]};
    },executeQuery:async(sql,args)=>fail?{success:false,rows:[]}:{success:true,rows:sql.includes("WHERE id=")?[records.get(args[0])].filter(Boolean):[...records.values()]}}
  });
  const req=b=>new Request("http://local/api/shipping",{method:"POST",body:JSON.stringify(b)});
  allowed=false;assert.equal((await handler.POST(req(batch()))).status,401);assert.equal(calls.length,0);
  allowed=true;installer=true;assert.equal((await handler.POST(req(batch()))).status,403);assert.equal((await handler.GET(new Request("http://local/api/shipping"))).status,403);assert.equal(calls.length,0);installer=false;
  allowed=true;assert.equal((await handler.POST(req(batch()))).status,201);assert.equal((await handler.POST(req(batch()))).status,201);assert.equal(records.size,1);
  const changed=batch();changed.date="2026-10-27";assert.equal((await handler.POST(req(changed))).status,409);
  const history=await(await handler.GET(new Request("http://local/api/shipping"))).json();assert.equal(history.data[0].count,8);assert.equal(history.data[0].baronCount,4);
  const detail=await(await handler.GET(new Request("http://local/api/shipping?id="+batch().id))).json();assert.equal(detail.data.entries.length,8);
  assert.equal((await handler.GET(new Request("http://local/api/shipping?from=2026-02-30"))).status,400);
  fail=true;assert.equal((await handler.POST(req(batch()))).status,503);assert.equal((await handler.GET(new Request("http://local/api/shipping"))).status,503);
});
