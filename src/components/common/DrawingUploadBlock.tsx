"use client";

import type { AttachmentItem } from "@/types";
import { isDrawingAttachment } from "@/lib/drawing-attachments";
import { UnifiedBoardEditor } from "./UnifiedBoardEditor";

export function DrawingUploadBlock({ attachments, onChange, onUploadingChange, readOnly = false }: {
  attachments: AttachmentItem[];
  onChange: (attachments: AttachmentItem[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  readOnly?: boolean;
}) {
  const drawings = attachments.filter(isDrawingAttachment);
  return <section aria-label="도면 업로드" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-slate-900">도면 업로드</h3>
      <span role="status" className={drawings.length ? "rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800" : "rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600"}>{drawings.length ? `도면 등록됨 ✓ · PDF ${drawings.length}개` : "도면 미등록"}</span>
    </div>
    <p className="text-xs text-slate-500">{readOnly ? "등록된 PDF 도면을 열어 확인할 수 있습니다." : "PDF를 추가하면 도면으로 인식합니다. 업무 저장 시 함께 등록됩니다."}</p>
    {(!readOnly || drawings.length > 0) && <UnifiedBoardEditor drawingsOnly description="" onChangeDescription={() => {}} attachments={drawings} onChangeAttachments={onChange} onUploadingChange={onUploadingChange} readOnly={readOnly} />}
  </section>;
}
