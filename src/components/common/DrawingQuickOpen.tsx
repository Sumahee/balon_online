"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, X } from "lucide-react";
import type { WorkItem } from "@/types";
import { getDrawingAttachment } from "@/lib/drawing-attachments";
import { useModalBack } from "@/lib/use-modal-back";
import { PdfPreview } from "./PdfPreview";
import { cn } from "@/lib/utils";

export function DrawingQuickOpen({ item }: { item: WorkItem }) {
  const drawing = getDrawingAttachment(item);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useModalBack(open, () => setOpen(false));
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);
  const url = drawing ? `/api/posts?type=work&attachment_id=${encodeURIComponent(drawing.id)}` : "";

  return <>
    <button
      type="button"
      disabled={!drawing}
      aria-label={drawing ? `${drawing.name} 도면 바로 열기` : "도면 미등록"}
      title={drawing ? `도면 등록됨 · ${drawing.name} · 클릭하여 열기` : "도면 미등록"}
      data-drawing-registered={!!drawing}
      onClick={event => { event.stopPropagation(); setOpen(true); }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md border p-1.5 transition", drawing ? "cursor-pointer border-emerald-300 bg-emerald-100 text-emerald-700 shadow-sm hover:bg-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-500" : "border-slate-200 bg-slate-50 text-slate-300")}
    ><FileText className="h-3.5 w-3.5" /></button>
    {open && drawing && createPortal(
      <dialog ref={dialog} aria-label={`${drawing.name} 도면 미리보기`} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) setOpen(false); }} className="fixed inset-0 m-auto h-[90dvh] max-h-[90dvh] w-[95vw] max-w-6xl overflow-hidden rounded-xl border-0 bg-white p-0 shadow-xl backdrop:bg-black/70">
        <div className="flex h-full flex-col">
          <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
            <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{drawing.name}</h2>
            <a href={url} download={drawing.name} title="도면 다운로드" aria-label="도면 다운로드" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Download className="h-4 w-4" /></a>
            <button type="button" autoFocus aria-label="도면 닫기" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </header>
          <PdfPreview url={url} />
        </div>
      </dialog>, document.body
    )}
  </>;
}
