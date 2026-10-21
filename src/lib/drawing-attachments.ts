import type { AttachmentItem, WorkItem } from "@/types";

// Existing PDFs also count as drawings, without a separate flag that can go stale.
export function isDrawingAttachment(attachment: AttachmentItem) {
  return attachment.fileType === "pdf" || /\.pdf$/i.test(attachment.name) || attachment.url.startsWith("data:application/pdf");
}

export function replaceAttachmentGroup(current: AttachmentItem[], next: AttachmentItem[], drawings: boolean) {
  return [...current.filter(attachment => isDrawingAttachment(attachment) !== drawings), ...next];
}

export function getDrawingAttachment(item: Pick<WorkItem, "attachments" | "drawingAttachment" | "detailsLoaded">) {
  if (item.detailsLoaded === false && !item.attachments?.length) return item.drawingAttachment ?? null;
  const drawing = item.attachments?.filter(isDrawingAttachment).sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || "") || b.id.localeCompare(a.id))[0];
  return drawing ? { id: drawing.id, name: drawing.name } : null;
}
