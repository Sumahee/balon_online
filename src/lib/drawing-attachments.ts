import type { AttachmentItem } from "@/types";

// Existing PDFs also count as drawings, without a separate flag that can go stale.
export function isDrawingAttachment(attachment: AttachmentItem) {
  return attachment.fileType === "pdf" || /\.pdf$/i.test(attachment.name) || attachment.url.startsWith("data:application/pdf");
}

export function replaceAttachmentGroup(current: AttachmentItem[], next: AttachmentItem[], drawings: boolean) {
  return [...current.filter(attachment => isDrawingAttachment(attachment) !== drawings), ...next];
}
