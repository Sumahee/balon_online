"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Paperclip, FileText, File, Loader2, X, Download } from "lucide-react";
import { AttachmentItem } from "@/types";
import { bodyHtml, bodyImageIds, serializeBody } from "@/lib/body-content";
import { cn } from "@/lib/utils";
import { clipboardFiles } from "@/lib/clipboard-files";
import { PdfPreview } from "@/components/common/PdfPreview";

interface UnifiedBoardEditorProps {
  description: string;
  onChangeDescription: (value: string) => void;
  attachments: AttachmentItem[];
  onChangeAttachments: (items: AttachmentItem[]) => void | Promise<void>;
  onOpenAttachment?: (attachment: AttachmentItem) => void;
  placeholder?: string;
  readOnly?: boolean;
  minRows?: number;
  onUploadingChange?: (uploading: boolean) => void;
}

function attachmentType(attachment: AttachmentItem) {
  if (attachment.fileType === "image" || /\.(jpe?g|png|webp|gif|svg)$/i.test(attachment.name) || attachment.url.startsWith("data:image")) return "image";
  if (attachment.fileType === "pdf" || /\.pdf$/i.test(attachment.name) || attachment.url.startsWith("data:application/pdf")) return "pdf";
  return "file";
}

export function UnifiedBoardEditor({
  description, onChangeDescription, attachments, onChangeAttachments, onOpenAttachment,
  placeholder = "작업 내용과 요청사항을 작성하세요. 사진과 파일을 끌어놓거나 붙여넣을 수 있습니다.",
  readOnly = false, minRows = 6, onUploadingChange,
}: UnifiedBoardEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AttachmentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [initialHtml] = useState(() => bodyHtml(description, attachments));
  const lastEmitted = useRef<string | null>(null);
  const latestAttachments = useRef(attachments);

  useLayoutEffect(() => {
    latestAttachments.current = attachments;
    const editor = editorRef.current;
    if (!editor) return;
    if (description === lastEmitted.current) return;
    const html = bodyHtml(description, attachments);
    if (editor.innerHTML !== html) editor.innerHTML = html;
  }, [description, attachments]);

  const rememberCursor = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
  };

  const emitBody = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const value = serializeBody(editor);
    lastEmitted.current = value;
    onChangeDescription(value);
    const imageIds = new Set(bodyImageIds(value));
    const remaining = latestAttachments.current.filter(attachment => attachmentType(attachment) !== "image" || imageIds.has(attachment.id));
    if (remaining.length !== latestAttachments.current.length) {
      latestAttachments.current = remaining;
      void Promise.resolve(onChangeAttachments(remaining)).catch(() => setError("이미지 제거를 저장하지 못했습니다. 다시 시도해 주세요."));
    }
    rememberCursor();
  };

  const insertionRange = () => {
    const editor = editorRef.current!;
    const range = savedRange.current;
    if (range && editor.contains(range.startContainer) && editor.contains(range.endContainer)) return range.cloneRange();
    const end = document.createRange();
    end.selectNodeContents(editor);
    end.collapse(false);
    return end;
  };

  const restoreCursor = (range: Range) => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRange.current = range.cloneRange();
    editorRef.current?.focus();
  };

  const pasteText = (text: string) => {
    const range = insertionRange();
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    text.replace(/\r\n?/g, "\n").split("\n").forEach((line, index) => {
      if (index) fragment.append(document.createElement("br"));
      fragment.append(document.createTextNode(line));
    });
    const last = fragment.lastChild;
    range.insertNode(fragment);
    if (last) range.setStartAfter(last);
    range.collapse(true);
    restoreCursor(range);
    emitBody();
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (readOnly || uploadLock.current || files.length === 0) return;
    uploadLock.current = true;
    setIsUploading(true);
    onUploadingChange?.(true);
    setError(null);
    const cursor = insertionRange();
    const uploaded: AttachmentItem[] = [];
    const failures: string[] = [];
    try {
      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          const response = await fetch("/api/upload", { method: "POST", body: formData });
          const result = await response.json();
          if (!response.ok || !result.success || !result.fileUrl) throw new Error(result.error || "업로드 실패");
          uploaded.push({
            id: crypto.randomUUID(), name: result.name || file.name, url: result.fileUrl,
            fileType: result.fileType === "image" ? "image" : result.fileType === "pdf" ? "pdf" : "file",
            size: result.size, uploadedAt: result.uploadedAt,
          });
        } catch {
          failures.push(file.name);
        }
      }
      if (uploaded.length) {
        const combined = [...latestAttachments.current, ...uploaded];
        latestAttachments.current = combined;
        const images = uploaded.filter(attachment => attachmentType(attachment) === "image");
        if (images.length && editorRef.current) {
          const range = editorRef.current.contains(cursor.startContainer) ? cursor : insertionRange();
          range.deleteContents();
          const fragment = document.createDocumentFragment();
          for (const attachment of images) {
            const image = document.createElement("img");
            image.src = attachment.url;
            image.alt = attachment.name;
            image.dataset.bodyImage = attachment.id;
            image.draggable = false;
            image.style.cssText = "display:block;max-width:100%;height:auto;margin:12px 0;border:0";
            fragment.append(image, document.createElement("br"));
          }
          const last = fragment.lastChild!;
          range.insertNode(fragment);
          range.setStartAfter(last);
          range.collapse(true);
          restoreCursor(range);
          emitBody();
        }
        await onChangeAttachments(latestAttachments.current);
      }
      if (failures.length) setError(`업로드하지 못한 파일: ${failures.join(", ")}. 다시 첨부해 주세요.`);
    } catch {
      setError("본문에 파일을 반영하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      uploadLock.current = false;
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const removeAttachment = async (id: string) => {
    try { await onChangeAttachments(attachments.filter((attachment) => attachment.id !== id)); }
    catch { setError("파일을 제거하지 못했습니다. 다시 시도해 주세요."); }
  };

  const openAttachment = (attachment: AttachmentItem) => {
    if (["image", "pdf"].includes(attachmentType(attachment))) setPreview(attachment);
    else if (onOpenAttachment) onOpenAttachment(attachment);
    else window.open(attachment.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => { event.preventDefault(); if (!readOnly && !isUploading) setIsDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false); }}
        onDrop={(event) => { event.preventDefault(); event.stopPropagation(); setIsDragging(false); void uploadFiles(event.dataTransfer.files); }}
        className={cn("relative overflow-hidden rounded-xl border bg-white p-4 sm:p-5 transition-colors", isDragging ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 focus-within:border-blue-400")}
      >
        <div
          ref={editorRef} role="textbox" aria-label="업무 내용" aria-multiline="true" aria-readonly={readOnly}
          contentEditable={!readOnly} suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: initialHtml }}
          data-placeholder={placeholder}
          style={{ minHeight: `${minRows * 1.75}rem` }}
          className="body-content-editor w-full whitespace-pre-wrap break-words text-base leading-7 text-slate-800 focus:outline-none"
          onInput={() => emitBody()}
          onMouseUp={rememberCursor} onKeyUp={rememberCursor} onBlur={rememberCursor}
          onClick={(event) => {
            const target = event.target;
            if (target instanceof HTMLImageElement && !readOnly) {
              const range = document.createRange();
              range.selectNode(target);
              restoreCursor(range);
            } else if (target instanceof HTMLImageElement && readOnly) {
              const attachment = attachments.find(item => item.id === target.dataset.bodyImage);
              if (attachment) openAttachment(attachment);
            }
          }}
          onKeyDown={(event) => {
            if (readOnly || !["Backspace", "Delete"].includes(event.key) || event.nativeEvent.isComposing) return;
            const selection = window.getSelection();
            if (!selection?.rangeCount || !selection.isCollapsed) return;
            const range = selection.getRangeAt(0);
            let container = range.startContainer;
            let offset = range.startOffset;
            const backward = event.key === "Backspace";
            if (container.nodeType === Node.TEXT_NODE) {
              if (backward ? offset !== 0 : offset !== container.textContent?.length) return;
              const text = container;
              container = text.parentNode!;
              offset = Array.from(container.childNodes).indexOf(text as ChildNode) + (backward ? 0 : 1);
            }
            let neighbor: Node | null = container.childNodes[backward ? offset - 1 : offset] || null;
            // At the edge of a paragraph, the previous/next image is still one editable object.
            if (!neighbor && container !== editorRef.current) neighbor = backward ? container.previousSibling : container.nextSibling;
            const line = neighbor instanceof HTMLElement && neighbor.tagName === "BR" ? neighbor : null;
            if (line) neighbor = backward ? line.previousSibling : line.nextSibling;
            if (neighbor instanceof HTMLImageElement && neighbor.dataset.bodyImage) {
              event.preventDefault();
              neighbor.remove();
              line?.remove();
              emitBody();
            }
          }}
          onPaste={(event) => {
            if (readOnly) return;
            event.preventDefault();
            rememberCursor();
            const files = clipboardFiles(event.clipboardData);
            if (files.length && uploadLock.current) setError("사진 업로드가 끝난 후 다시 붙여넣어 주세요.");
            else if (files.length) void uploadFiles(files);
            else pasteText(event.clipboardData.getData("text/plain"));
          }}
        />

        {!readOnly && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <button type="button" disabled={isUploading} onMouseDown={(event) => { event.preventDefault(); rememberCursor(); }} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              {isUploading ? "업로드 중…" : "본문에 사진·파일 추가"}
            </button>
            <span className="text-xs text-slate-500">화면 캡처(Win+Shift+S) 후 작성란에 Ctrl+V · 끌어놓기</span>
            <input ref={fileInputRef} type="file" multiple aria-label="본문에 추가할 파일 선택" className="hidden" onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); event.target.value = ""; }} />
          </div>
        )}
        {isDragging && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-50/90 text-sm font-semibold text-blue-700">놓으면 본문에 추가합니다</div>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      </div>

        {/* Documents are separate from body text; construction photos use the photo feed. */}
        {attachments.some(attachment => attachmentType(attachment) !== "image") && (
          <div className="mt-4 flex flex-col gap-3">
            {attachments.filter(attachment => attachmentType(attachment) !== "image").map((attachment) => {
              const type = attachmentType(attachment);
              return (
                <div key={attachment.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center">
                    <button type="button" onClick={() => openAttachment(attachment)} aria-label={`${attachment.name} ${type === "image" ? "미리보기" : "열기"}`} className="min-w-0 flex-1 text-left hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 p-3 sm:p-4">
                          <div className={cn("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl", type === "pdf" ? "bg-[#ef4937] text-white" : "bg-blue-100 text-blue-700")}>
                            {type === "pdf" ? <><FileText className="h-6 w-6" /><span className="text-[9px] font-bold">PDF</span></> : <File className="h-6 w-6" />}
                          </div>
                          <div className="min-w-0"><p className="truncate text-sm sm:text-base font-medium text-slate-900" title={attachment.name}>{attachment.name}</p><p className="mt-1 text-xs sm:text-sm text-slate-400">{attachment.size || (type === "pdf" ? "PDF 문서" : "파일")}</p></div>
                        </div>
                    </button>
                    {(
                      <div className="flex shrink-0 items-center gap-1 pr-3">
                        <a href={attachment.url} download={attachment.name} aria-label={`${attachment.name} 다운로드`} title="다운로드" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><Download className="h-5 w-5" /></a>
                        {!readOnly && <button type="button" disabled={isUploading} onClick={() => void removeAttachment(attachment.id)} aria-label={`${attachment.name} 본문에서 제거`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><X className="h-4 w-4" /></button>}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}


      {preview && (
        <div role="dialog" aria-modal="true" aria-label={attachmentType(preview) === "pdf" ? "PDF 미리보기" : "이미지 미리보기"} onClick={() => setPreview(null)} onKeyDown={(event) => { if (event.key === "Escape") setPreview(null); }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 sm:p-6">
          <div onClick={(event) => event.stopPropagation()} className={cn("relative overflow-hidden rounded-xl bg-white shadow-xl", attachmentType(preview) === "pdf" ? "flex h-[90vh] w-full max-w-6xl flex-col" : "max-w-5xl")}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{preview.name}</p>
              <a href={preview.url} download={preview.name} aria-label={`${preview.name} 다운로드`} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100"><Download className="h-4 w-4" /><span className="hidden sm:inline">다운로드</span></a>
              <button autoFocus type="button" aria-label="미리보기 닫기" onClick={() => setPreview(null)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {attachmentType(preview) === "pdf" ? (
              <PdfPreview url={preview.url} />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview.url} alt={preview.name} className="max-h-[78vh] max-w-full object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
