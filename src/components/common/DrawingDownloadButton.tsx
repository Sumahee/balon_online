"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function DrawingDownloadButton({ url, name }: { url: string; name: string }) {
  const busy = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    if (busy.current) return;
    busy.current = true;
    setDownloading(true);
    setError("");
    try {
      // Fetch the same file as the preview, with the existing session cookie.
      // A local blob also preserves the filename for redirected/external PDFs.
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error("File read failed");
      const blob = await response.blob();
      if (!blob.size || /text\/html|application\/json/i.test(blob.type)) throw new Error("Invalid file response");
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = name;
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        // Mobile browsers need time to hand the file to their download manager.
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    } catch {
      setError("다운로드하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      busy.current = false;
      setDownloading(false);
    }
  }

  return <div className="shrink-0">
    <button type="button" onClick={download} disabled={downloading} aria-label="도면 다운로드" aria-busy={downloading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
      {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {downloading ? "다운로드 중…" : "다운로드"}
    </button>
    {error && <p role="alert" className="mt-1 max-w-44 text-xs text-rose-700">{error}</p>}
  </div>;
}
