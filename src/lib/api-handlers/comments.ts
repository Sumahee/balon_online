import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

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
    comments: result.rows || [],
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

    const commentId = `cmt-${Date.now()}`;
    const authorName = author || "바론 INT 담당자";
    const now = new Date().toISOString();
    const imagesStr = images ? (Array.isArray(images) ? JSON.stringify(images) : String(images)) : null;

    const result = await executeQuery(
      `INSERT INTO bo_work_item_comments (id, work_item_id, author, content, images, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [commentId, workItemId, authorName, content, imagesStr, now]
    );

    return NextResponse.json({
      success: true,
      comment: {
        id: commentId,
        workItemId,
        author: authorName,
        content,
        images: images || [],
        createdAt: now,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
