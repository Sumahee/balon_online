"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { GalleryImage } from "@/types";
import { createGalleryArchive } from "@/lib/gallery-download";
import { getToday } from "@/lib/date";

export function GalleryDownloadButton({ images, disabled, onBusyChange }: { images: GalleryImage[]; disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const download = async () => {
    if (controller.current || disabled || !images.length) return;
    const operation = new AbortController();
    controller.current = operation;
    setBusy(true);
    onBusyChange(true);
    try {
      const bytes = await createGalleryArchive(images, token || "", operation.signal, (done, total) => setMessage(`원본 사진 준비 중 ${done}/${total}`));
      operation.signal.throwIfAborted();
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `BALON_사진_${getToday()}_${images.length}장.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(`${images.length}장 ZIP 다운로드를 시작했습니다.`);
    } catch (error) {
      setMessage(operation.signal.aborted ? "다운로드 준비를 취소했습니다." : error instanceof Error ? error.message : "사진 다운로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      controller.current = null;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={() => void download()} disabled={busy || disabled || !images.length} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><Download className="h-4 w-4" />{busy ? "다운로드 준비 중…" : `선택 사진 ZIP 다운로드${images.length ? ` (${images.length}장)` : ""}`}</button>
    {busy && <button type="button" onClick={() => controller.current?.abort()} className="action-secondary">준비 취소</button>}
    {message && <span role="status" aria-live="polite" className="text-xs text-slate-600">{message}</span>}
  </div>;
}
