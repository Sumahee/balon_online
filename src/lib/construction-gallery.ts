import type { AttachmentItem, GalleryFolder, GalleryImage, WorkItem, WorkItemComment } from "@/types";

import { getDrawingAttachment } from "@/lib/drawing-attachments";

function photoWorkInfo(item: WorkItem) {
  return { workItemId: item.id, clientName: item.clientName, siteAddress: item.siteAddress || item.region,
    boardColor: item.boardColor, postColor: item.postColor, drawingAttachment: getDrawingAttachment(item) };
}

export const ORDER_FOLDER = "folder-order-materials";
export function orderFolderId(clientName: string) { return `${ORDER_FOLDER}-${encodeURIComponent(clientName.trim() || "업체 미지정")}`; }
export function orderGalleryImage(item: WorkItem, attachment: AttachmentItem): GalleryImage {
  return {
    ...photoWorkInfo(item),
    id: `attachment-${attachment.id}`, folderId: orderFolderId(item.clientName || ""),
    title: `${item.title} - ${attachment.name}`, url: attachment.url,
    siteName: [item.clientName, item.siteAddress, item.region].filter(Boolean).join(" "),
    tags: ["발주자료", item.clientName, item.region, item.boardColor, item.postColor].filter((value): value is string => !!value?.trim()),
    dimensions: "", size: attachment.size || "", createdAt: attachment.uploadedAt || item.createdAt || "",
  };
}
export function matchesGalleryFolder(image: GalleryImage, folder: string) {
  if (folder === "folder-all") return true;
  if (folder === ORDER_FOLDER) return image.folderId === ORDER_FOLDER || image.folderId.startsWith(`${ORDER_FOLDER}-`);
  if (folder === "folder-construction") return !image.tags.includes("발주자료") && (image.folderId === folder || image.tags.some(tag => /시공|현장시공/.test(tag)));
  return image.folderId === folder;
}
export function galleryFolders(folders: GalleryFolder[], images: GalleryImage[]): GalleryFolder[] {
  const make = (id: string, name: string, description: string): GalleryFolder => ({ id, name, description, itemCount: images.filter(image => matchesGalleryFolder(image, id)).length, createdAt: "" });
  const companyIds = [...new Set(images.filter(image => image.folderId.startsWith(`${ORDER_FOLDER}-`)).map(image => image.folderId))];
  return [make("folder-construction", "시공 사진", "댓글에서 등록한 시공 사진과 도면·자재 정보"), make(ORDER_FOLDER, "업체 발주 자료", "업무 본문에 첨부한 발주·참고 이미지"),
    ...companyIds.map(id => make(id, `${decodeURIComponent(id.slice(ORDER_FOLDER.length + 1))} 발주 자료`, "업체별 업무 발주자료")),
    ...folders.filter(folder => folder.id !== "folder-construction" && folder.id !== ORDER_FOLDER && !companyIds.includes(folder.id)),
  ];
}

export function constructionTags(item: Pick<WorkItem,"clientName"|"siteAddress"|"region"|"drawingType"|"boardColor"|"postColor"|"category"|"tags">, author: string, date: string) {
  return [...new Set(["시공사진", ...(item.tags ?? []), item.clientName, item.siteAddress, item.region, item.drawingType, item.boardColor, item.postColor, item.category, author, date].filter((v):v is string=>!!v?.trim()).map(value => value.trim()))];
}
export function commentGalleryImages(item: WorkItem, comment: WorkItemComment): GalleryImage[] {
  return (comment.images ?? []).flatMap((url,index)=>typeof url !== "string" || !url ? [] : [{
    ...photoWorkInfo(item),
    id:`comment-${comment.id}-${index}`, folderId:"folder-construction", title:`${item.title} - 시공 사진 ${index+1}`,
    url:`/api/gallery?source=comment&id=${encodeURIComponent(comment.id)}&index=${index}`,
    siteName:[item.clientName,item.siteAddress,item.region].filter(Boolean).join(" "),
    tags:constructionTags(item,comment.author,comment.createdAt.slice(0,10)),
    dimensions:"", size:url.startsWith("data:") ? `${Math.round((url.length-url.indexOf(",")-1)*0.75/1024)} KB` : "",
    createdAt:comment.createdAt,
  }]);
}
