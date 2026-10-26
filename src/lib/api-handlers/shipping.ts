import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db, executeMutation, executeQuery } from "@/lib/db";
import { VERIFY } from "./auth";
import { validShippingDate, validateShippingBatch } from "@/lib/shipping";
import { isInstaller } from "@/lib/access";

let pending:Promise<void>|undefined;
async function schema(){
  if(!db)throw new Error("송장 저장 서버에 연결할 수 없습니다.");
  if(!pending)pending=(async()=>{
    await executeMutation(`CREATE TABLE IF NOT EXISTS bo_shipping_batches (id TEXT PRIMARY KEY, shipping_date TEXT NOT NULL, source_name TEXT NOT NULL, entries_json TEXT NOT NULL, entry_count INTEGER NOT NULL, baron_count INTEGER NOT NULL, homepartner_count INTEGER NOT NULL, content_hash TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL)`);
    await executeMutation("CREATE INDEX IF NOT EXISTS bo_shipping_batches_date ON bo_shipping_batches(shipping_date DESC,created_at DESC,id)");
  })().catch(error=>{pending=undefined;throw error;});
  await pending;
}
async function query(sql:string,args:(string|number)[]=[]){
  const result=await executeQuery(sql,args);if(!result.success)throw new Error("송장 기록을 불러오지 못했습니다.");return result.rows;
}
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request){
  const session=await VERIFY(request);if(!session.ok)return session;
  const {user}=await session.json();if(isInstaller(user))return response({success:false,error:"직원만 송장을 조회할 수 있습니다."},403);
  try{
    const p=new URL(request.url).searchParams;
    const from=p.get("from")||"",to=p.get("to")||"";
    if((from&&!validShippingDate(from))||(to&&!validShippingDate(to))||(from&&to&&from>to))return response({success:false,error:"조회 기간을 확인해 주세요."},400);
    await schema();
    if(p.has("id")){
      const rows=await query("SELECT * FROM bo_shipping_batches WHERE id=?",[p.get("id")!]);
      if(!rows.length)return response({success:false,error:"저장된 송장을 찾을 수 없습니다."},404);
      const r=rows[0];return response({success:true,data:{id:r.id,date:r.shipping_date,sourceName:r.source_name,entries:JSON.parse(String(r.entries_json)),author:r.author,createdAt:r.created_at}});
    }
    const filters:string[]=[],args:(string|number)[]=[];
    if(from){filters.push("shipping_date>=?");args.push(from);}if(to){filters.push("shipping_date<=?");args.push(to);}
    const offset=Number(p.get("offset")||0);
    if(!Number.isSafeInteger(offset)||offset<0)return response({success:false,error:"조회 위치를 확인해 주세요."},400);
    const rows=await query(`SELECT id,shipping_date,source_name,entry_count,baron_count,homepartner_count,author,created_at FROM bo_shipping_batches ${filters.length?"WHERE "+filters.join(" AND "):""} ORDER BY shipping_date DESC,created_at DESC,id DESC LIMIT 31 OFFSET ?`,[...args,offset]);
    return response({success:true,data:rows.slice(0,30).map(r=>({id:r.id,date:r.shipping_date,sourceName:r.source_name,count:Number(r.entry_count),baronCount:Number(r.baron_count),homepartnerCount:Number(r.homepartner_count),author:r.author,createdAt:r.created_at})),hasMore:rows.length>30});
  }catch{return response({success:false,error:"송장 기록을 불러오지 못했습니다. 다시 시도해 주세요."},503);}
}
export async function POST(request:Request){
  const session=await VERIFY(request);if(!session.ok)return session;
  const {user}=await session.json();if(isInstaller(user))return response({success:false,error:"직원만 송장을 저장할 수 있습니다."},403);
  if(Number(request.headers.get("content-length"))>2_000_000)return response({success:false,error:"송장 내용은 2MB까지 저장할 수 있습니다."},413);
  let batch;
  try{
    const raw=await request.text();if(raw.length>1_000_000)return response({success:false,error:"송장 내용이 너무 큽니다."},413);
    batch=validateShippingBatch(JSON.parse(raw));
  }catch(error){return response({success:false,error:error instanceof Error?error.message:"송장 내용을 확인해 주세요."},400);}
  try{
    await schema();
    const entries=JSON.stringify(batch.entries),hash=createHash("sha256").update(JSON.stringify([batch.date,batch.sourceName,batch.entries])).digest("hex");
    const now=new Date().toISOString();
    const baron=batch.entries.filter(e=>e.sender==="baron").length;
    await executeMutation("INSERT INTO bo_shipping_batches(id,shipping_date,source_name,entries_json,entry_count,baron_count,homepartner_count,content_hash,author,created_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING",[batch.id,batch.date,batch.sourceName,entries,batch.entries.length,baron,batch.entries.length-baron,hash,String(user.name),now]);
    const [saved]=await query("SELECT content_hash FROM bo_shipping_batches WHERE id=?",[batch.id]);
    if(saved?.content_hash!==hash)return response({success:false,error:"같은 저장 번호에 다른 내용이 있습니다. 새 기록으로 저장해 주세요."},409);
    return response({success:true,data:{id:batch.id}},201);
  }catch{return response({success:false,error:"송장을 저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 저장해 주세요."},503);}
}
