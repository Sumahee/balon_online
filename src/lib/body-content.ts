import type { AttachmentItem } from "@/types";

// Keep image positions in the existing description column; files stay in attachments.
const IMAGE_MARKER = /!\[본문 이미지\]\(attachment:([^\s)]+)\)/g;
export function imageMarker(id: string) { return `![본문 이미지](attachment:${encodeURIComponent(id)})`; }
export function bodyText(description: string) { return description.replace(IMAGE_MARKER, "").trim(); }
export function bodyImageIds(description: string) {
  return [...description.matchAll(IMAGE_MARKER)].map((match) => {
    try { return decodeURIComponent(match[1]); } catch { return match[1]; }
  });
}
export function isBodyImage(attachment: AttachmentItem) {
  return attachment.fileType === "image" || /\.(jpe?g|png|webp|gif|svg)$/i.test(attachment.name) || attachment.url.startsWith("data:image");
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
export function bodyHtml(description: string, attachments: AttachmentItem[]) {
  const images = attachments.filter(isBodyImage);
  const seen = new Set<string>();
  const imageHtml = (attachment: AttachmentItem) => {
    // Attribute values are escaped and only browser image URL schemes are accepted.
    if (!/^(?:https?:\/\/|\/|data:image\/|blob:)/i.test(attachment.url)) return "";
    seen.add(attachment.id);
    return `<img data-body-image="${escapeHtml(attachment.id)}" src="${escapeHtml(attachment.url)}" alt="본문 이미지" draggable="false" style="display:block;width:100%;height:auto;margin:12px 0;border:0" />`;
  };
  let html = "";
  let cursor = 0;
  for (const match of description.matchAll(IMAGE_MARKER)) {
    html += escapeHtml(description.slice(cursor, match.index)).replace(/\n/g, "<br>");
    const id = bodyImageIds(match[0])[0];
    const image = images.find((attachment) => attachment.id === id);
    if (image) html += imageHtml(image);
    cursor = match.index! + match[0].length;
  }
  html += escapeHtml(description.slice(cursor)).replace(/\n/g, "<br>");
  // Older work items have no position markers; display their photos after existing text.
  for (const image of images) if (!seen.has(image.id)) html += `${html ? "<br>" : ""}${imageHtml(image)}<br>`;
  return html;
}
export function serializeBody(root: HTMLElement): string {
  const read = (node: Node): string => {
    if (node.nodeType === 3) return node.textContent || "";
    if (!(node instanceof HTMLElement)) return "";
    if (node.tagName === "IMG") return node.dataset.bodyImage ? imageMarker(node.dataset.bodyImage) : "";
    if (node.tagName === "BR") return "\n";
    const value = Array.from(node.childNodes).map(read).join("");
    return ["DIV", "P"].includes(node.tagName) && node.previousSibling ? `\n${value}` : value;
  };
  return Array.from(root.childNodes).map(read).join("");
}
