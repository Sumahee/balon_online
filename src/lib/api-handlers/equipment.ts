import { NextResponse } from "next/server";
import { db, executeQuery, executeMutation } from "@/lib/db";
import { VERIFY } from "./auth";
import { validateCosts, totalCosts, validDate } from "@/lib/equipment";

let pending: Promise<void> | undefined;
async function schema() {
  if (!db) throw new Error("설비 데이터베이스에 연결할 수 없습니다.");
  if (!pending) pending = (async () => {
    await executeMutation(`CREATE TABLE IF NOT EXISTS bo_machines (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT '사용중', revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    const columns=await query("PRAGMA table_info(bo_machines)");
    if(!columns.some(row=>row.name==="contacts_json")) {
      try { await executeMutation("ALTER TABLE bo_machines ADD COLUMN contacts_json TEXT NOT NULL DEFAULT '[]'"); }
      catch(error) { if(!(await query("PRAGMA table_info(bo_machines)")).some(row=>row.name==="contacts_json")) throw error; }
    }
    if(!columns.some(row=>row.name==="service_company")) {
      try { await executeMutation("ALTER TABLE bo_machines ADD COLUMN service_company TEXT NOT NULL DEFAULT ''"); }
      catch(error) { if(!(await query("PRAGMA table_info(bo_machines)")).some(row=>row.name==="service_company")) throw error; }
    }
    await executeMutation(`CREATE TABLE IF NOT EXISTS bo_maintenance (id TEXT PRIMARY KEY, machine_id TEXT NOT NULL REFERENCES bo_machines(id), date TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', provider TEXT NOT NULL DEFAULT '', travel INTEGER NOT NULL DEFAULT 0, parts INTEGER NOT NULL DEFAULT 0, self INTEGER NOT NULL DEFAULT 0, other INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, photos TEXT NOT NULL DEFAULT '[]', author TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    await executeMutation("CREATE INDEX IF NOT EXISTS bo_maintenance_machine_date ON bo_maintenance(machine_id,date DESC)");
  })().catch(error => { pending=undefined; throw error; });
  await pending;
}
async function query(sql: string, args: (string|number)[] = []) {
  const result = await executeQuery(sql,args);
  if (!result.success) throw new Error("설비 데이터를 불러오지 못했습니다.");
  return result.rows;
}
function record(row: Record<string, unknown>, full = false) {
  return {id:row.id,machineId:row.machine_id,date:row.date,title:row.title,kind:row.kind,description:row.description,provider:row.provider,
    costs:{travel:Number(row.travel),parts:Number(row.parts),self:Number(row.self),other:Number(row.other)},total:Number(row.total),author:row.author,revision:Number(row.revision),
    photos:full ? JSON.parse(String(row.photos)) : Array.from({length:Number(row.photo_count || 0)},(_,index)=>`/api/equipment?photo=${encodeURIComponent(String(row.id))}&index=${index}&v=${row.revision}`)};
}
export async function GET(request: Request) {
  const session = await VERIFY(request); if (!session.ok) return session;
  try {
    await schema();
    const p = new URL(request.url).searchParams;
    if (p.has("photo")) {
      const index=Number(p.get("index"));
      if (!Number.isInteger(index) || index<0 || index>3) return new Response("Not found",{status:404});
      const rows=await query("SELECT json_extract(photos, ?) AS photo FROM bo_maintenance WHERE id = ?",[`$[${index}]`,p.get("photo")!]);
      const match=String(rows[0]?.photo || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return new Response("Not found",{status:404});
      return new Response(Buffer.from(match[2],"base64"),{headers:{"Content-Type":match[1],"Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff"}});
    }
    if (p.has("entry")) {
      const rows=await query("SELECT * FROM bo_maintenance WHERE id = ?",[p.get("entry")!]);
      if (!rows.length) return NextResponse.json({success:false,error:"이력을 찾을 수 없습니다."},{status:404});
      return NextResponse.json({success:true,data:record(rows[0],true)});
    }
    const from=p.get("from") || "",to=p.get("to") || "";
    if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from>to)) return NextResponse.json({success:false,error:"조회 기간을 확인해주세요."},{status:400});
    const conditions:string[]=[],args:string[]=[];
    if(from){conditions.push("date >= ?");args.push(from);} if(to){conditions.push("date <= ?");args.push(to);}
    if(p.has("machine")) {
      conditions.push("machine_id = ?");args.push(p.get("machine")!);
      const offset=Math.max(0,Math.floor(Number(p.get("offset"))||0));
      const rows=await query(`SELECT id,machine_id,date,title,kind,description,provider,travel,parts,self,other,total,author,revision,json_array_length(photos) AS photo_count FROM bo_maintenance WHERE ${conditions.join(" AND ")} ORDER BY date DESC,created_at DESC,id DESC LIMIT 31 OFFSET ?`,[...args,offset]);
      return NextResponse.json({success:true,data:rows.slice(0,30).map(row=>record(row)),hasMore:rows.length>30});
    }
    const filter=conditions.length?`WHERE ${conditions.join(" AND ")}`:"";
    const machines=await query(`SELECT m.*,COALESCE(r.total,0) AS total,COALESCE(r.count,0) AS count,COALESCE(r.last_date,'') AS lastDate FROM bo_machines m LEFT JOIN (SELECT machine_id,SUM(total) AS total,COUNT(*) AS count,MAX(date) AS last_date FROM bo_maintenance ${filter} GROUP BY machine_id) r ON r.machine_id=m.id ORDER BY m.created_at,m.id`,args);
    const totals=await query(`SELECT COALESCE(SUM(total),0) AS total,COALESCE(SUM(travel),0) AS travel,COALESCE(SUM(parts),0) AS parts,COALESCE(SUM(self),0) AS self,COALESCE(SUM(other),0) AS other,COUNT(*) AS count FROM bo_maintenance ${filter}`,args);
    return NextResponse.json({success:true,data:{machines:machines.map(({contacts_json,service_company,...machine})=>({...machine,serviceCompany:String(service_company||JSON.parse(String(contacts_json||"[]"))[0]?.company||""),contacts:JSON.parse(String(contacts_json||"[]"))})),totals:totals[0]}});
  } catch { return NextResponse.json({success:false,error:"설비 정보를 불러오지 못했습니다. 다시 시도해주세요."},{status:503}); }
}
function text(value: unknown, max: number, required=false) {
  if (value !== undefined && typeof value !== "string") throw new Error("입력 형식을 확인해주세요.");
  const result=String(value || "").trim(); if ((required && !result) || result.length>max) throw new Error(`필수 항목 또는 글자 수(${max}자)를 확인해주세요.`); return result;
}
async function save(request: Request, edit: boolean) {
  const session=await VERIFY(request); if(!session.ok)return session;
  try {
    const {user}=await session.json();
    const body=await request.json();
    const id=edit?text(body.id,100,true):crypto.randomUUID();
    const revision=Number(body.revision);
    if(edit && (!Number.isInteger(revision)||revision<1)) throw new Error("새로고침 후 다시 수정해주세요.");
    const now=new Date().toISOString();
    let sql:string,values:(string|number)[];
    if(body.entity === "machine") {
      const name=text(body.name,100,true),description=text(body.description,5000),model=text(body.model,200),location=text(body.location,200),status=text(body.status,20);
      if(!["사용중","정비중","사용 종료"].includes(status))throw new Error("기계 상태를 확인해주세요.");
      let contactsJson:string|null=null;
      if(body.contacts!==undefined){
        if(!Array.isArray(body.contacts)||body.contacts.length>3)throw new Error("업체 연락처는 최대 3개까지 입력해주세요.");
        contactsJson=JSON.stringify(body.contacts.map((contact:Record<string,unknown>)=>{
          if(!contact||typeof contact!=="object")throw new Error("연락처 형식을 확인해주세요.");
          return {company:text(contact.company,100),phone:text(contact.phone,50),technician:text(contact.technician,100),technicianPhone:text(contact.technicianPhone,50)};
        }).filter((contact:{company:string;phone:string;technician:string;technicianPhone:string})=>Object.values(contact).some(Boolean)));
      }
      values=[name,description,model,location,status,now];
      // Missing contacts in older clients must not erase existing contacts.
      const contactUpdate=(contactsJson===null?"":"contacts_json=?,")+(body.serviceCompany===undefined?"":"service_company=?,");
      if(edit && contactsJson!==null)values.push(contactsJson);
      if(edit && body.serviceCompany!==undefined)values.push(text(body.serviceCompany,100));
      if(!edit)values.push(contactsJson||"[]",text(body.serviceCompany,100));
      sql=edit?`UPDATE bo_machines SET name=?,description=?,model=?,location=?,status=?,updated_at=?,${contactUpdate}revision=revision+1 WHERE id=? AND revision=? RETURNING id`:"INSERT INTO bo_machines(name,description,model,location,status,updated_at,contacts_json,service_company,id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id";
      values.push(id,edit?revision:now);
    } else if(body.entity === "maintenance") {
      const machineId=text(body.machineId,100,true),date=text(body.date,10,true),title=text(body.title,200,true),kind=text(body.kind,20),description=text(body.description,10000),provider=text(body.provider,200),costs=validateCosts(body.costs);
      if(!validDate(date))throw new Error("정비일을 확인해주세요.");
      if(!["수리","정기점검","부품교체","기타"].includes(kind))throw new Error("정비 종류를 확인해주세요.");
      if(!Array.isArray(body.photos)||body.photos.length>4||body.photos.some((photo:unknown)=>typeof photo!=="string"||photo.length>690000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)))throw new Error("사진은 압축된 JPEG/PNG/WebP 최대 4장까지 첨부해주세요.");
      await schema();
      if(!(await query("SELECT id FROM bo_machines WHERE id=?",[machineId])).length)return NextResponse.json({success:false,error:"기계를 찾을 수 없습니다."},{status:404});
      values=[date,title,kind,description,provider,costs.travel,costs.parts,costs.self,costs.other,totalCosts(costs),JSON.stringify(body.photos),now];
      sql=edit?"UPDATE bo_maintenance SET date=?,title=?,kind=?,description=?,provider=?,travel=?,parts=?,self=?,other=?,total=?,photos=?,updated_at=?,revision=revision+1 WHERE id=? AND machine_id=? AND revision=? RETURNING id":"INSERT INTO bo_maintenance(date,title,kind,description,provider,travel,parts,self,other,total,photos,updated_at,id,machine_id,author,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id";
      values.push(id,machineId);if(edit)values.push(revision);else values.push(String(user.name),now);
    } else throw new Error("등록 종류를 확인해주세요.");
    await schema();
    const result=await executeMutation(sql,values);
    if(!result.rows.length)return NextResponse.json({success:false,error:"다른 사용자가 수정했거나 삭제된 기록입니다. 새로고침 후 다시 확인해주세요."},{status:409});
    return NextResponse.json({success:true,data:{id}},{status:edit?200:201});
  } catch(error) {return NextResponse.json({success:false,error:error instanceof Error?error.message:"저장하지 못했습니다."},{status:400});}
}
export const POST=(request:Request)=>save(request,false);
export const PUT=(request:Request)=>save(request,true);
