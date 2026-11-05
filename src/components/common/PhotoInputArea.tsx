"use client";

import { useRef, useState, type ReactNode } from "react";
import { clipboardFiles } from "@/lib/clipboard-files";

interface Props {
  label: string;
  disabled?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  children: ReactNode;
}

export function PhotoInputArea({ label, disabled, onFiles, children }: Props) {
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  return <div role="group" aria-label={`${label} 첨부 영역`} aria-disabled={disabled}
    onPaste={event => {
      const files = clipboardFiles(event.clipboardData).filter(file => file.type.startsWith("image/"));
      if (!files.length) return;
      event.preventDefault(); event.stopPropagation();
      if (!disabled) void onFiles(files);
    }}
    onDragEnter={event => {
      event.preventDefault(); event.stopPropagation();
      if (Array.from(event.dataTransfer.types).includes("Files")) { dragDepth.current++; setDragging(true); }
    }}
    onDragOver={event => {
      event.preventDefault(); event.stopPropagation();
      event.dataTransfer.dropEffect = disabled ? "none" : "copy";
    }}
    onDragLeave={event => {
      event.preventDefault(); event.stopPropagation();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDragging(false);
    }}
    onDrop={event => {
      event.preventDefault(); event.stopPropagation();
      dragDepth.current = 0; setDragging(false);
      if (!disabled) void onFiles(Array.from(event.dataTransfer.files));
    }}
    className={`space-y-3 rounded-xl border-2 border-dashed p-3 focus-within:border-blue-500 ${dragging && !disabled ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
    <button type="button" disabled={disabled} aria-label={`${label} 붙여넣기 영역`}
      className="block w-full rounded-lg bg-slate-50 px-3 py-3 text-center text-xs leading-5 text-slate-600 focus:bg-blue-50 focus:outline-2 focus:outline-blue-500 disabled:opacity-50">
      사진을 여기에 끌어놓거나<br />이곳을 클릭한 뒤 Ctrl+V로 붙여넣으세요 (Mac: ⌘V)
    </button>
    {children}
  </div>;
}
