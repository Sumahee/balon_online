"use client";

import { useState } from "react";

export function ConstructionPhotoDropZone({ onUpload, disabled }: { onUpload: (files: File[]) => Promise<void>; disabled: boolean }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  return <div onDragOver={event => { event.preventDefault(); event.stopPropagation(); if (!disabled && !uploading) setDragging(true); }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
    onDrop={event => { event.preventDefault(); event.stopPropagation(); setDragging(false); if (disabled || uploading) return; const files = Array.from(event.dataTransfer.files); setUploading(true); void onUpload(files).finally(() => setUploading(false)); }}
    className={`rounded-xl border-2 border-dashed px-2 py-3 text-center text-xs sm:text-sm ${dragging ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 bg-slate-50 text-slate-600"}`}>
    {uploading || disabled ? "업로드 중..." : "사진 끌어놓기 · 최대 20장"}
  </div>;
}
