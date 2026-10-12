import type { GalleryImage, WorkItem, WorkItemComment } from "@/types";

export function constructionTags(item: Pick<WorkItem,"clientName"|"siteAddress"|"region"|"drawingType"|"boardColor"|"postColor"|"category">, author: string, date: string) {
  return [...new Set(["시공사진", "시공완료 사진", item.clientName, item.siteAddress, item.region, item.drawingType, item.boardColor, item.postColor, item.category, author, date].filter((v):v is string=>!!v?.trim()))];
}
export function commentGalleryImages(item: WorkItem, comment: WorkItemComment): GalleryImage[] {
  return (comment.images ?? []).flatMap((url,index)=>typeof url !== "string" || !url ? [] : [{
    id:`comment-${comment.id}-${index}`, folderId:"folder-construction", title:`${item.title} - 시공 사진 ${index+1}`,
    url:`/api/gallery?source=comment&id=${encodeURIComponent(comment.id)}&index=${index}`,
    siteName:[item.clientName,item.siteAddress,item.region].filter(Boolean).join(" "),
    tags:constructionTags(item,comment.author,comment.createdAt.slice(0,10)),
    dimensions:"", size:url.startsWith("data:") ? `${Math.round((url.length-url.indexOf(",")-1)*0.75/1024)} KB` : "",
    createdAt:comment.createdAt,
  }]);
}
