import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url);
function load(mocks){const module={exports:{}};const source=readFileSync('src/lib/api-handlers/quotations.ts','utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(name=>name in mocks?mocks[name]:nativeRequire(name),module,module.exports);return module.exports;}
function fixture({installer=false,authenticated=true}={}){
 const queries=[];
 const handler=load({'@/lib/db':{db:{execute:async query=>{queries.push(query);if(typeof query==='string'&&query.startsWith('CREATE'))return {rows:[]};return {rows:[{id:'quote-1',title:'업체 · 강남구 · 2026-10-25',document_json:JSON.stringify({pages:[{tag:'article',children:['최종 견적']} ]})}]};}}},'./auth':{VERIFY:async()=>authenticated?Response.json({user:{id:1,onlineRole:installer?'installer':'staff'}}):Response.json({success:false},{status:401})},'@/lib/access':{isInstaller:user=>user.onlineRole==='installer'},'@/lib/quotation-archive':{QUOTATION_SCHEMA:'CREATE TABLE IF NOT EXISTS bo_quotations(id TEXT)'}});
 return {handler,queries};
}
test('quotation board requires an authenticated staff session before reading any rows',async()=>{
 for(const setup of [{authenticated:false},{installer:true}]){const {handler,queries}=fixture(setup);const response=await handler.GET(new Request('https://example.test/api/quotations'));assert.equal(response.status,setup.installer?403:401);assert.equal(queries.length,0);}
});
test('board list excludes document payload; detail resolves exact saved table/text tree with no HTML execution',async()=>{
 const {handler,queries}=fixture();const response=await handler.GET(new Request('https://example.test/api/quotations?id=quote-1'));const result=await response.json();assert.equal(response.status,200);assert.equal(result.data.document.pages[0].children[0],'최종 견적');assert.equal(result.data.document_json,undefined);assert.deepEqual(queries[1].args,['quote-1']);
 const listing=fixture();await listing.handler.GET(new Request('https://example.test/api/quotations'));assert.match(listing.queries[1],/SELECT id,title/);assert.doesNotMatch(listing.queries[1],/SELECT \*/);
});
