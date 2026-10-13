import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { db, executeQuery, executeMutation } from "@/lib/db";
import { commentGalleryImages } from "@/lib/construction-gallery";
import type { WorkItem } from "@/types";
import { photoResponse } from "@/lib/gallery-thumbnail";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folder_id") || undefined;
  const thumbnail = searchParams.has("thumbnail") ? (Number(searchParams.get("thumbnail")) <= 160 ? 160 : 480) : null;
  if (searchParams.get("source") === "gallery") {
    const image = serverStore.getImages().find(image => image.id === searchParams.get("id"));
    if (!image) return new Response("Photo not found", { status: 404 });
    try { return await photoResponse(image.url, request.url, thumbnail, image.id); }
    catch { return new Response("Photo read failed", { status: 503 }); }
  }

  if (db) {
    try {
      if (["comment","attachment"].includes(searchParams.get("source") || "")) {
        const id=searchParams.get("id");
        const index=Number(searchParams.get("index"));
        if (!id || !Number.isInteger(index) || index<0) return new Response("Invalid photo",{status:400});
        const attachment=searchParams.get("source") === "attachment";
        const result=await executeQuery(attachment ? "SELECT url FROM bo_attachments WHERE id = ?" : "SELECT images FROM bo_work_item_comments WHERE id = ?",[id]);
        if (!result.success) return new Response("Photo read failed",{status:503});
        const urls=attachment ? [String(result.rows[0]?.url || "")] : JSON.parse(String(result.rows[0]?.images || "[]"));
        const url=urls[index];
        if (typeof url !== "string") return new Response("Photo not found",{status:404});
        return await photoResponse(url, request.url, thumbnail, `${searchParams.get("source")}:${id}:${index}`);
      }
      const comments=await executeQuery(`SELECT c.id AS comment_id, c.author, c.content, c.images, c.created_at AS comment_date, w.* FROM bo_work_item_comments c JOIN bo_work_items w ON w.id = c.work_item_id WHERE c.images IS NOT NULL ORDER BY c.created_at DESC`);
      if (!comments.success) throw new Error("시공 사진 조회 실패");
      const construction=comments.rows.flatMap(row=>{
        let urls: string[]=[];
        try { urls=JSON.parse(String(row.images || "[]")); } catch { return []; }
        if (!Array.isArray(urls)) return [];
        const work = {id:String(row.id), title:String(row.title || ""),clientName:String(row.client_name || ""),siteAddress:String(row.site_address || ""),region:String(row.region || ""),drawingType:row.drawing_type,boardColor:String(row.board_color || ""),postColor:String(row.post_color || ""),category:row.category} as WorkItem;
        return commentGalleryImages(work,{id:String(row.comment_id),workItemId:work.id,author:String(row.author || ""),content:String(row.content || ""),createdAt:String(row.comment_date),images:urls});
      });
      const attachments=await executeQuery(`SELECT a.id AS attachment_id, a.url AS photo_url, a.name AS photo_name, a.uploaded_at AS photo_date, w.* FROM bo_attachments a JOIN bo_work_items w ON w.id = a.work_item_id WHERE a.file_type = 'image'`);
      if (!attachments.success) throw new Error("시공 첨부 사진 조회 실패");
      for (const row of attachments.rows) {
        const work={id:String(row.id),title:String(row.title || ""),clientName:String(row.client_name || ""),siteAddress:String(row.site_address || ""),region:String(row.region || ""),drawingType:row.drawing_type,boardColor:String(row.board_color || ""),postColor:String(row.post_color || ""),category:row.category} as WorkItem;
        const entry=commentGalleryImages(work,{id:String(row.attachment_id),workItemId:work.id,author:"",content:"",createdAt:String(row.photo_date || ""),images:[String(row.photo_url || "")]})[0];
        if (entry) construction.push({...entry,id:`attachment-${row.attachment_id}`,title:`${work.title} - ${row.photo_name}`,url:`/api/gallery?source=attachment&id=${encodeURIComponent(String(row.attachment_id))}&index=0`});
      }
      const images=[...construction,...serverStore.getImages()].filter(image=>!folderId || folderId === "folder-all" || image.folderId === folderId);
      const folders=[...serverStore.getFolders(),{id:"folder-construction",name:"시공 사진",description:"업무 댓글에 등록된 시공 사진",itemCount:construction.length,createdAt:""}];
      return NextResponse.json({success:true,data:{folders,images,selectedFolderId:folderId || "folder-all"}});
    } catch {
      return NextResponse.json({success:false,message:"시공 사진을 불러오지 못했습니다."},{status:503});
    }
  }

  const folders = serverStore.getFolders();
  const images = serverStore.getImages(folderId);

  return NextResponse.json({
    success: true,
    data: {
      folders,
      images,
      selectedFolderId: folderId || "folder-all",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_folder") {
      const { name, description } = body;
      if (!name) {
        return NextResponse.json({ success: false, message: "Folder name is required" }, { status: 400 });
      }
      const folder = serverStore.addFolder(name, description);
      return NextResponse.json({ success: true, data: folder }, { status: 201 });
    } else if (action === "upload_image" || body.url) {
      const { folderId, title, url, siteName, tags, dimensions, size } = body;
      if (!url || !title) {
        return NextResponse.json({ success: false, message: "URL and title are required" }, { status: 400 });
      }
      const image = serverStore.addImage({
        folderId: folderId || "folder-1",
        title,
        url,
        siteName: siteName || "바론 시공 현장",
        tags: Array.isArray(tags) ? tags : ["현장시공"],
        dimensions: dimensions || "1920 x 1080",
        size: size || "2.0 MB",
      });
      return NextResponse.json({ success: true, data: image }, { status: 201 });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type"); // 'image' or 'folder'

  if (!id) {
    return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
  }

  if (type === "image") {
    if (db && id.startsWith("attachment-")) {
      try {
        const photoId = id.slice("attachment-".length);
        const existing = await executeQuery("SELECT id FROM bo_attachments WHERE id = ? AND file_type = 'image'", [photoId]);
        if (!existing.success) throw new Error("Photo lookup failed");
        if (!existing.rows.length) return NextResponse.json({success:false,message:"사진을 찾지 못했습니다."},{status:404});
        await executeMutation("DELETE FROM bo_attachments WHERE id = ? AND file_type = 'image'", [photoId]);
        return NextResponse.json({success:true});
      } catch { return NextResponse.json({success:false,message:"사진 삭제 실패"},{status:500}); }
    }
    if (db && id.startsWith("comment-")) {
      try {
        const match=id.match(/^comment-(.+)-(\d+)$/);
        if (!match) return NextResponse.json({success:false,message:"사진 ID를 확인해주세요."},{status:400});
        const row=await executeQuery("SELECT images FROM bo_work_item_comments WHERE id = ?",[match[1]]);
        if (!row.success || !row.rows.length) return NextResponse.json({success:false,message:"사진을 찾지 못했습니다."},{status:404});
        const urls=JSON.parse(String(row.rows[0].images || "[]"));
        urls[Number(match[2])]="";
        await executeMutation("UPDATE bo_work_item_comments SET images = ? WHERE id = ?",[JSON.stringify(urls),match[1]]);
        return NextResponse.json({success:true});
      } catch { return NextResponse.json({success:false,message:"사진 삭제 실패"},{status:500}); }
    }
    const success = serverStore.deleteImage(id);
    if (!success) {
      return NextResponse.json({ success: false, message: "Image not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Image deleted" });
  }

  return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
}
