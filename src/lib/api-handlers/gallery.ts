import { ensureWorkTagsSchema } from "@/lib/work-tags-schema";
import { readWorkTags } from "@/lib/work-tags";
import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { db, executeQuery, executeMutation } from "@/lib/db";
import { commentGalleryImages, orderGalleryImage, galleryFolders, matchesGalleryFolder, ORDER_FOLDER, orderFolderId } from "@/lib/construction-gallery";
import type { GalleryImage, WorkItem } from "@/types";
import { photoResponse } from "@/lib/gallery-thumbnail";
import { storeConstructionPhoto } from "@/lib/r2-storage";

function lightImage(image: GalleryImage): GalleryImage {return {...image,url:image.url.startsWith("data:image/") ? `/api/gallery?source=gallery&id=${encodeURIComponent(image.id)}` : image.url};}
function storedMatches(image:GalleryImage,params:URLSearchParams) {
  const folder=params.get("folder_id"),query=params.get("q")?.trim().replace(/^#+/, "").toLowerCase(),type=params.get("drawing"),color=params.get("color")?.split("/")[0];
  const text=[image.title,image.siteName,...image.tags].filter(Boolean).join(" ").toLowerCase();
  return (!folder || matchesGalleryFolder(image,folder)) && (!query || text.includes(query)) && (!type || ["all","전체"].includes(type) || text.includes(type.toLowerCase())) && (!color || ["all","전체"].includes(color) || text.includes(color.toLowerCase()));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folder_id") || undefined;
  const thumbnail = searchParams.has("thumbnail") ? (Number(searchParams.get("thumbnail")) <= 160 ? 160 : 480) : null;
  if (searchParams.get("source") === "gallery") {
    const image = [...serverStore.getImages(),...serverStore.getWorkItems().flatMap(item=>(item.attachments || []).filter(attachment=>attachment.fileType === "image").map(attachment=>orderGalleryImage(item,attachment)))].find(image => image.id === searchParams.get("id"));
    if (!image) return new Response("Photo not found", { status: 404 });
    try { return await photoResponse(image.url, request.url, thumbnail, image.id); }
    catch { return new Response("Photo read failed", { status: 503 }); }
  }

  if (db) {
    try {
      if(searchParams.has("limit") && !searchParams.has("source")) {
        await ensureWorkTagsSchema();
        const limit=Math.min(60,Math.max(1,Number(searchParams.get("limit")) || 30));
        const offset=Math.max(0,Number(searchParams.get("offset")) || 0);
        const filters:string[]=[];const args:(string|number)[]=[];
        if(folderId === "folder-construction") filters.push("(p.source = 'comment' OR p.source = 'gallery')");
        else if(folderId?.startsWith(ORDER_FOLDER)) {filters.push("(p.source = 'attachment' OR p.source = 'gallery')");if(folderId !== ORDER_FOLDER){filters.push("(w.client_name = ? OR p.source = 'gallery')");args.push(decodeURIComponent(folderId.slice(ORDER_FOLDER.length+1)));}}
        else if(folderId && folderId !== "folder-all") {
          const local=serverStore.getImages(folderId).filter(image=>storedMatches(image,searchParams));
          return NextResponse.json({success:true,data:{folders:galleryFolders(serverStore.getFolders(),local),images:local.slice(offset,offset+limit).map(lightImage)},hasMore:local.length>offset+limit});
        }
        const query=searchParams.get("q")?.trim().replace(/^#+/, "");
        if(query){filters.push("(w.title LIKE ? OR w.client_name LIKE ? OR w.site_address LIKE ? OR w.drawing_type LIKE ? OR w.board_color LIKE ? OR w.post_color LIKE ? OR w.work_tags LIKE ? OR w.category LIKE ? OR p.source = 'gallery')");args.push(...Array(8).fill(`%${query}%`));}
        for(const [param,column] of [["drawing","drawing_type"],["color","board_color"]]) {const value=searchParams.get(param);if(value && value !== "all" && value !== "전체"){filters.push(`(w.${column} LIKE ? OR w.${param === "drawing" ? "category" : "post_color"} LIKE ? OR w.work_tags LIKE ? OR w.title LIKE ? OR p.source = 'gallery')`);args.push(...Array(4).fill(`%${value.split("/")[0]}%`));}}
        const localMetadata=JSON.stringify(serverStore.getImages().filter(image=>storedMatches(image,searchParams)).map(lightImage));
        const result=await executeQuery(`SELECT w.id AS work_id,w.title,w.client_name,w.site_address,w.region,w.drawing_type,w.board_color,w.post_color,w.category,w.work_tags,p.* FROM (
          SELECT 'comment' AS source,c.id AS photo_id,c.work_item_id,c.created_at,c.author,'시공 사진' AS photo_name,CAST(j.key AS INTEGER) AS photo_index,NULL AS metadata
          FROM bo_work_item_comments c, json_each(CASE WHEN json_valid(c.images) THEN c.images ELSE '[]' END) j WHERE j.value != ''
          UNION ALL SELECT 'attachment',a.id,a.work_item_id,a.uploaded_at,'',a.name,0,NULL FROM bo_attachments a WHERE a.file_type='image'
          UNION ALL SELECT 'gallery',json_extract(j.value,'$.id'),NULL,json_extract(j.value,'$.createdAt'),'','',0,j.value FROM json_each(?) j
        ) p LEFT JOIN bo_work_items w ON w.id=p.work_item_id ${filters.length?`WHERE ${filters.join(" AND ")}`:""} ORDER BY p.created_at DESC,p.photo_id DESC,p.photo_index ASC LIMIT ? OFFSET ?`,[localMetadata,...args,limit+1,offset]);
        if(!result.success) throw new Error("사진 목록 조회 실패");
        const images=result.rows.slice(0,limit).map(row=>{
          if(row.source === "gallery")return JSON.parse(String(row.metadata)) as GalleryImage;
          const work={id:String(row.work_id),title:String(row.title || ""),clientName:String(row.client_name || ""),siteAddress:String(row.site_address || ""),region:String(row.region || ""),drawingType:row.drawing_type,boardColor:String(row.board_color || ""),postColor:String(row.post_color || ""),category:row.category,tags:readWorkTags(row.work_tags)} as WorkItem;
          const id=String(row.photo_id),index=Number(row.photo_index);
          if(row.source === "attachment") return orderGalleryImage(work,{id,name:String(row.photo_name),fileType:"image",size:"",uploadedAt:String(row.created_at || ""),url:`/api/gallery?source=attachment&id=${encodeURIComponent(id)}&index=0`});
          const image=commentGalleryImages(work,{id,workItemId:work.id,author:String(row.author || ""),content:"",createdAt:String(row.created_at || ""),images:["photo"]})[0];
          return {...image,id:`comment-${id}-${index}`,url:`/api/gallery?source=comment&id=${encodeURIComponent(id)}&index=${index}`,title:`${work.title} - 시공 사진 ${index+1}`};
        });
        const companies=await executeQuery("SELECT DISTINCT client_name FROM bo_work_items WHERE id IN (SELECT work_item_id FROM bo_attachments WHERE file_type='image')");
        if(!companies.success) throw new Error("업체 폴더 조회 실패");
        const virtual=companies.rows.map(row=>({id:orderFolderId(String(row.client_name || "")),name:`${row.client_name || "업체 미지정"} 발주 자료`,description:"",itemCount:0,createdAt:""}));
        return NextResponse.json({success:true,data:{folders:[...galleryFolders(serverStore.getFolders(),images),...virtual.filter(folder=>!images.some(image=>image.folderId===folder.id))],images},hasMore:result.rows.length>limit});
      }
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
        const work = {id:String(row.id), title:String(row.title || ""),clientName:String(row.client_name || ""),siteAddress:String(row.site_address || ""),region:String(row.region || ""),drawingType:row.drawing_type,boardColor:String(row.board_color || ""),postColor:String(row.post_color || ""),category:row.category,tags:readWorkTags(row.work_tags)} as WorkItem;
        return commentGalleryImages(work,{id:String(row.comment_id),workItemId:work.id,author:String(row.author || ""),content:String(row.content || ""),createdAt:String(row.comment_date),images:urls});
      });
      const attachments=await executeQuery(`SELECT a.id AS attachment_id, a.url AS photo_url, a.name AS photo_name, a.uploaded_at AS photo_date, w.* FROM bo_attachments a JOIN bo_work_items w ON w.id = a.work_item_id WHERE a.file_type = 'image'`);
      if (!attachments.success) throw new Error("시공 첨부 사진 조회 실패");
      const orders = [];
      for (const row of attachments.rows) {
        const work={id:String(row.id),title:String(row.title || ""),clientName:String(row.client_name || ""),siteAddress:String(row.site_address || ""),region:String(row.region || ""),drawingType:row.drawing_type,boardColor:String(row.board_color || ""),postColor:String(row.post_color || ""),category:row.category,tags:readWorkTags(row.work_tags)} as WorkItem;
        orders.push(orderGalleryImage(work, {id:String(row.attachment_id), name:String(row.photo_name), fileType:"image", size:"", uploadedAt:String(row.photo_date || ""), url:`/api/gallery?source=attachment&id=${encodeURIComponent(String(row.attachment_id))}&index=0`}));
      }
      const allImages=[...construction,...orders,...serverStore.getImages()];
      const images=allImages.filter(image=>storedMatches(image,searchParams));
      const folders=galleryFolders(serverStore.getFolders(),allImages);
      return NextResponse.json({success:true,data:{folders,images,selectedFolderId:folderId || "folder-all"}});
    } catch {
      return NextResponse.json({success:false,message:"시공 사진을 불러오지 못했습니다."},{status:503});
    }
  }

  const allImages=[...serverStore.getImages(),...serverStore.getWorkItems().flatMap(item=>(item.attachments || []).filter(attachment=>attachment.fileType === "image").map(attachment=>orderGalleryImage(item,attachment)))];
  const matching=allImages.filter(image=>storedMatches(image,searchParams));
  const limit=searchParams.has("limit") ? Math.min(60,Math.max(1,Number(searchParams.get("limit")) || 30)) : matching.length;
  const offset=Math.max(0,Number(searchParams.get("offset")) || 0);
  const folders = galleryFolders(serverStore.getFolders(),allImages);
  const images = matching.slice(offset,offset+limit).map(lightImage);

  return NextResponse.json({
    success: true,
    hasMore:matching.length>offset+limit,
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
        url: await storeConstructionPhoto(url),
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
