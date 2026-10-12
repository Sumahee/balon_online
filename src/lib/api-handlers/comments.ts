import { NextResponse } from "next/server";
import { executeQuery, executeMutation } from "@/lib/db";

// GET /api/comments?workItemId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workItemId = searchParams.get("workItemId");

  if (!workItemId) {
    return NextResponse.json({ error: "workItemId is required" }, { status: 400 });
  }

  const result = await executeQuery(
    `SELECT id, work_item_id as workItemId, author, content, images, created_at as createdAt 
     FROM bo_work_item_comments 
     WHERE work_item_id = ? 
     ORDER BY created_at ASC`,
    [workItemId]
  );

  return NextResponse.json({
    success: result.success,
    isMock: result.isMock,
    comments: (result.rows || []).map(row=>{
      let images: string[]=[];
      try { images=JSON.parse(String(row.images || "[]")); } catch { images=[String(row.images || "")]; }
      return {...row,images:images.map((url,index)=>url.startsWith("data:image/") ? `/api/gallery?source=comment&id=${encodeURIComponent(String(row.id))}&index=${index}` : url).filter(Boolean)};
    }),
  });
}

// POST /api/comments
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workItemId, author, content, images } = body;

    if (!workItemId || !content) {
      return NextResponse.json(
        { error: "workItemId and content are required" },
        { status: 400 }
      );
    }

    if (images !== undefined && (!Array.isArray(images) || images.length > 5 || images.some((url:unknown)=>typeof url !== "string" || (url.startsWith("data:") && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(url) || url.length > 700000))))) {
      return NextResponse.json({success:false,error:"한 번에 최대 5장, 사진당 500KB 이하로 첨부해주세요."},{status:400});
    }
    const commentId = `cmt-${crypto.randomUUID()}`;
    const authorName = author || "바론 INT 담당자";
    const now = new Date().toISOString();
    const imagesStr = images ? (Array.isArray(images) ? JSON.stringify(images) : String(images)) : null;

    await executeMutation(
      `INSERT INTO bo_work_item_comments (id, work_item_id, author, content, images, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [commentId, workItemId, authorName, content, imagesStr, now]
    );

    const comment = {
      id:commentId, workItemId, author:authorName, content, createdAt:now,
      images:(images || []).map((url:string,index:number)=>url.startsWith("data:image/") ? `/api/gallery?source=comment&id=${encodeURIComponent(commentId)}&index=${index}` : url),
    };
    return NextResponse.json({
      success: true,
      comment,
      data: {comment},
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const query=new URL(request.url).searchParams;
    const id=query.get("id"), workItemId=query.get("workItemId");
    if (!id || !workItemId) return NextResponse.json({success:false,message:"댓글 ID가 필요합니다."},{status:400});
    await executeMutation("DELETE FROM bo_work_item_comments WHERE id = ? AND work_item_id = ?",[id,workItemId]);
    return NextResponse.json({success:true});
  } catch { return NextResponse.json({success:false,message:"댓글 삭제 실패"},{status:500}); }
}
