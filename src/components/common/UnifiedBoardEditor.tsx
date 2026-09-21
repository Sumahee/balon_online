"use client";

import React, { useState, useRef } from "react";
import {
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Maximize2,
  X,
  File,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { AttachmentItem } from "@/types";
import { cn } from "@/lib/utils";

interface UnifiedBoardEditorProps {
  description: string;
  onChangeDescription: (val: string) => void;
  attachments: AttachmentItem[];
  onChangeAttachments: (items: AttachmentItem[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  onOpenPdf?: (url: string, name: string) => void;
}

export function UnifiedBoardEditor({
  description,
  onChangeDescription,
  attachments,
  onChangeAttachments,
  placeholder = "작업 내용, 상세 사양, 현장 지시사항 등을 자유롭게 작성하세요...\n(파일이나 사진을 이 영역으로 드래그 & 드롭하여 바로 첨부할 수 있습니다)",
  readOnly = false,
  onOpenPdf,
}: UnifiedBoardEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [internalPdfUrl, setInternalPdfUrl] = useState<string | null>(null);
  const [internalPdfName, setInternalPdfName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload handler for single or multiple files
  const uploadFiles = async (files: FileList | File[]) => {
    if (readOnly || !files || files.length === 0) return;
    setIsUploading(true);

    const newAttachments: AttachmentItem[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          newAttachments.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: data.name || file.name,
            url: data.fileUrl,
            fileType: data.fileType as any,
            size: data.size,
            uploadedAt: data.uploadedAt || new Date().toISOString().split("T")[0],
          });
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    if (newAttachments.length > 0) {
      onChangeAttachments([...attachments, ...newAttachments]);
    }
    setIsUploading(false);
  };

  // Drag & drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!readOnly) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (readOnly) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  // Clipboard Paste handler (for screenshots or copied files)
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (readOnly) return;
    const items = e.clipboardData.items;
    const filesToUpload: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) filesToUpload.push(file);
      }
    }

    if (filesToUpload.length > 0) {
      e.preventDefault();
      await uploadFiles(filesToUpload);
    }
  };

  const handleRemoveAttachment = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChangeAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleOpenFile = (url: string, fileType: string, name?: string) => {
    if (fileType === "image" || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name || url)) {
      setPreviewImageUrl(url);
    } else if (fileType === "pdf" || /\.pdf$/i.test(name || url)) {
      if (onOpenPdf) {
        onOpenPdf(url, name || "PDF 첨부 문서");
      } else {
        setInternalPdfUrl(url);
        setInternalPdfName(name || "PDF 첨부 문서");
      }
    } else {
      window.open(url, "_blank");
    }
  };

  const isImageFile = (att: AttachmentItem) => {
    return att.fileType === "image" || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.name) || att.url.startsWith("data:image");
  };

  const isPdfFile = (att: AttachmentItem) => {
    return att.fileType === "pdf" || /\.pdf$/i.test(att.name) || att.url.endsWith(".pdf");
  };

  return (
    <div className="space-y-3">
      {/* Board Content Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative bg-white border-2 rounded-2xl p-4 transition-all shadow-xs flex flex-col min-h-[220px]",
          isDragging
            ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/20"
            : "border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10"
        )}
      >
        {/* Text Area */}
        <textarea
          rows={5}
          disabled={readOnly}
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="w-full bg-transparent border-0 resize-y text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium leading-relaxed"
        />

        {/* Drag overlay indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-2xs rounded-2xl flex flex-col items-center justify-center pointer-events-none text-blue-600 font-bold text-sm gap-2">
            <UploadCloud className="w-10 h-10 animate-bounce" />
            <span>여기에 파일을 놓으면 자동 업로드됩니다 (도면, 이미지 등)</span>
          </div>
        )}

        {/* Uploading progress indicator */}
        {isUploading && (
          <div className="py-2 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 rounded-xl mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>파일 업로드 및 서버 등록 중...</span>
          </div>
        )}

        {/* Attached Files & Images Grid Section inside the board */}
        {attachments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                첨부된 파일 및 사진 ({attachments.length}개)
              </span>
              <span className="text-slate-400 text-[10px]">클릭 시 미리보기/열기</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {attachments.map((att) => {
                const isImg = isImageFile(att);
                const isPdf = isPdfFile(att);

                if (isImg) {
                  return (
                    <div
                      key={att.id}
                      onClick={() => handleOpenFile(att.url, "image")}
                      className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:shadow-md hover:border-blue-400 transition cursor-pointer flex flex-col"
                    >
                      <div className="h-28 w-full bg-slate-100 overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                      </div>
                      <div className="p-2 flex items-center justify-between gap-1 text-[11px] bg-white">
                        <span className="truncate font-semibold text-slate-700" title={att.name}>
                          {att.name}
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveAttachment(att.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition hover:bg-rose-50 shrink-0 cursor-pointer"
                            title="삭제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // PDF or other document
                return (
                  <div
                    key={att.id}
                    onClick={() => handleOpenFile(att.url, att.fileType, att.name)}
                    className="group rounded-xl border border-slate-200 p-2.5 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 transition cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold",
                          isPdf ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                        )}
                      >
                        {isPdf ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600" title={att.name}>
                          {att.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{att.size || "1 MB"}</span>
                          {isPdf && (
                            <span className="text-rose-600 font-extrabold flex items-center gap-0.5">
                              PDF 열기 <ExternalLink className="w-2.5 h-2.5 inline" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAttachment(att.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0 cursor-pointer"
                        title="파일 삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom toolbar */}
        {!readOnly && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 transition cursor-pointer text-xs"
              >
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                <span>파일 / 도면 / 사진 첨부</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              파일을 드래그해서 넣거나 클립보드 이미지(Ctrl+V)도 바로 붙여넣을 수 있습니다.
            </span>
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl p-2 border border-slate-800"
          >
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-rose-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}

      {/* PDF Viewer Popup Modal */}
      {internalPdfUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col h-[90vh]">
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold px-2 py-0.5 bg-rose-600 rounded">
                  PDF 뷰어
                </span>
                <span className="font-bold text-sm truncate max-w-md">{internalPdfName}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={internalPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>새 탭에서 열기</span>
                </a>
                <button
                  onClick={() => setInternalPdfUrl(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={internalPdfUrl}
                title={internalPdfName}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
