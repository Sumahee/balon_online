export const DOCUMENT_FILE_LIMIT = 3 * 1024 * 1024;
export const DOCUMENT_FILE_COUNT = 10;

export interface DocumentAttachment { id: string; name: string; size: number }
export interface DocumentPost {
  id: string; title: string; body: string; pinned: boolean;
  authorId: string; author: string; createdAt: string; updatedAt: string;
  attachmentCount: number; attachments?: DocumentAttachment[];
}

export function validateDocumentPost(value: unknown) {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v.title !== "string" || !v.title.trim() || v.title.trim().length > 200)
    throw new Error("제목을 1~200자로 입력해 주세요.");
  if (typeof v.body !== "string" || v.body.length > 50_000)
    throw new Error("본문은 50,000자까지 입력할 수 있습니다.");
  if (typeof v.pinned !== "boolean") throw new Error("공지 설정을 확인해 주세요.");
  if (!Array.isArray(v.attachments) || v.attachments.length > DOCUMENT_FILE_COUNT ||
      v.attachments.some(id => typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) ||
      new Set(v.attachments).size !== v.attachments.length)
    throw new Error("첨부파일은 최대 10개까지 등록할 수 있습니다.");
  return { title: v.title.trim(), body: v.body, pinned: v.pinned, attachments: v.attachments as string[] };
}
