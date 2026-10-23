import { NextResponse } from "next/server";
import { VERIFY } from "@/lib/api-handlers/auth";
import { executeQuery } from "@/lib/db";
import { ensureWorkCalendarSchema } from "@/lib/work-calendar-schema";
import { isInstaller } from "@/lib/access";

const visible = "COALESCE(w.calendar_visible,CASE WHEN w.deadline_type='시공일' THEN 1 ELSE 0 END)=1 AND COALESCE(NULLIF(TRIM(w.delivery_date),''),NULLIF(TRIM(w.due_date),'')) IS NOT NULL";
export async function authorizeApi(request: Request, domain: string): Promise<Response | null> {
  if (domain === "auth") return null;
  const session = await VERIFY(request);
  if (!session.ok) return session;
  const {user} = await session.json();
  if (!isInstaller(user)) return null;
  const denied = () => NextResponse.json({success:false,message:"시공자는 달력의 업무 조회·사진 등록·댓글 작성만 사용할 수 있습니다."},{status:403});
  const params = new URL(request.url).searchParams;
  let sql = "", args: string[] = [];
  if (request.method === "GET" && domain === "holidays") return null;
  if (domain === "posts" && request.method === "GET" && params.get("type") === "work") {
    if (params.get("summary") === "1" && params.get("mode") === "calendar" && !params.has("attachment_id")) return null;
    if (params.get("attachment_id")) {sql=`SELECT w.id FROM bo_attachments a JOIN bo_work_items w ON w.id=a.work_item_id WHERE a.id=? AND ${visible}`;args=[params.get("attachment_id")!];}
    else if (params.get("id")) {sql=`SELECT w.id FROM bo_work_items w WHERE w.id=? AND ${visible}`;args=[params.get("id")!];}
  } else if (domain === "comments" && ["GET","POST"].includes(request.method)) {
    const body = request.method === "POST" ? await request.clone().json() : null;
    if (body?.images !== undefined && (!Array.isArray(body.images) || body.images.some((url: unknown) => typeof url !== "string" || !url.startsWith("data:image/")))) return denied();
    const id = body?.workItemId || params.get("workItemId");
    if (typeof id === "string") {sql=`SELECT w.id FROM bo_work_items w WHERE w.id=? AND ${visible}`;args=[id];}
  } else if (domain === "gallery" && request.method === "GET" && ["comment","attachment"].includes(params.get("source") || "")) {
    const comment=params.get("source") === "comment";
    sql=`SELECT w.id FROM ${comment ? "bo_work_item_comments" : "bo_attachments"} p JOIN bo_work_items w ON w.id=p.work_item_id WHERE p.id=? AND ${visible}`;args=[params.get("id") || ""];
  } else if (domain === "construction-photo" && request.method === "GET") {
    const key=params.get("key");
    if (!key) return denied();
    sql=`SELECT w.id FROM bo_work_item_comments c JOIN bo_work_items w ON w.id=c.work_item_id, json_each(CASE WHEN json_valid(c.images) THEN c.images ELSE '[]' END) j WHERE j.value=? AND ${visible} UNION ALL SELECT w.id FROM bo_attachments a JOIN bo_work_items w ON w.id=a.work_item_id WHERE a.url=? AND ${visible} LIMIT 1`;
    const url=`/api/construction-photo?key=${encodeURIComponent(key)}`;args=[url,url];
  }
  if (!sql) return denied();
  await ensureWorkCalendarSchema();
  const result=await executeQuery(sql,args);
  if (!result.success) return NextResponse.json({success:false,message:"업무 접근 권한을 확인하지 못했습니다."},{status:503});
  return result.rows.length ? null : denied();
}
