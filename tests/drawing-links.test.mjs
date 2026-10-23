import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createClient} from '@libsql/client';
const require=createRequire(import.meta.url);
function load(mocks) {
  const code=ts.transpileModule(readFileSync('src/lib/drawing-links.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>mocks[name] || require(name),module,module.exports);
  return module.exports;
}
async function fixture() {
  const db=createClient({url:'file::memory:'});
  await db.executeMultiple("CREATE TABLE bo_work_items(id TEXT PRIMARY KEY);INSERT INTO bo_work_items VALUES('work-1')");
  const executeQuery=async(sql,args=[])=>({success:true,rows:(await db.execute({sql,args})).rows});
  const module=load({'./db':{db,executeQuery,executeMutation:executeQuery}});
  return {db,...module};
}
test('online launches share one persistent project ID and reject a project belonging to another work',async()=>{
  const {db,linkDrawingProject}=await fixture();
  try {
    const first=await linkDrawingProject('work-1');
    assert.match(first,/^online-[a-f0-9]{40}$/);
    assert.equal(await linkDrawingProject('work-1'),first);
    assert.equal(await linkDrawingProject('work-1',first),first);
    assert.equal((await db.execute('SELECT * FROM bo_drawing_links')).rows.length,1);
    await assert.rejects(linkDrawingProject('work-1','unrelated-project'),/연결되어 있지/);
    await assert.rejects(linkDrawingProject('missing-work'),/업무를 찾을 수/);
  } finally {db.close();}
});
test('web-first shared links expose per-sheet latest PDFs and retained export history in online',async()=>{
  const {db,ensureDrawingLinks,drawingLinksForWork,linkDrawingProject}=await fixture();
  try {
    await ensureDrawingLinks();
    const manifest={'sheet-1':{id:'sheet-1',name:'안방 1',number:'1',hash:'a'.repeat(64),pdfUrl:'https://files.example/latest.pdf',syncedAt:'2026-10-24T01:00:00Z'}};
    await db.execute({sql:'INSERT INTO bo_drawing_links VALUES(?,?,?,?,?,?,?)',args:['web-first-project','work-1',42,JSON.stringify(manifest),'2026-10-24T01:00:00Z','https://files.example/latest.pdf',2]});
    await db.execute({sql:'INSERT INTO bo_drawing_versions VALUES(?,?,?,?,?,?,?,?)',args:['version-1','web-first-project','work-1','export-1','https://files.example/old.pdf','이전 도면.pdf',JSON.stringify(Object.values(manifest)),'2026-10-23T01:00:00Z']});
    const links=await drawingLinksForWork('work-1');
    assert.equal(links.length,1);assert.equal(links[0].sheets[0].name,'안방 1');assert.equal(links[0].versions[0].name,'이전 도면.pdf');assert.equal(links[0].blueprintId,42);
    assert.equal(await linkDrawingProject('work-1'),'web-first-project');
  } finally {db.close();}
});
