"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

export function PdfPreview({ url }: { url: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(200, entries[0].contentRect.width - 16)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    let task: ReturnType<typeof import("pdfjs-dist")["getDocument"]> | undefined;
    void import("pdfjs-dist").then(async pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const response = await fetch(url);
      if (!response.ok) throw new Error("PDF read failed");
      const data = new Uint8Array(await response.arrayBuffer());
      if (!active) return;
      task = pdfjs.getDocument({data});
      const pdf = await task.promise;
      if (active) { setDocument(pdf); setPage(1); setError(""); }
    }).catch(() => { if (active) setError("PDF를 불러오지 못했습니다. 다시 열어주세요."); });
    return () => { active = false; void task?.destroy(); };
  }, [url]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let active = true;
    let rendering: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    void document.getPage(page).then(pdfPage => {
      if (!active || !canvas.current) return;
      const base = pdfPage.getViewport({scale:1});
      const viewport = pdfPage.getViewport({scale:width / base.width * zoom});
      // Keep zoom scrollable without allocating an oversized mobile canvas.
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 8192 / viewport.width, 8192 / viewport.height, Math.sqrt(16_000_000 / (viewport.width * viewport.height)));
      const target = canvas.current;
      target.width = Math.floor(viewport.width * ratio);
      target.height = Math.floor(viewport.height * ratio);
      target.style.width = `${viewport.width}px`;
      target.style.height = `${viewport.height}px`;
      rendering = pdfPage.render({canvas:target, viewport, transform:[ratio,0,0,ratio,0,0]});
      return rendering.promise;
    }).catch(cause => { if (active && cause?.name !== "RenderingCancelledException") setError("PDF 페이지를 표시하지 못했습니다."); });
    return () => { active = false; rendering?.cancel(); };
  }, [document, page, width, zoom]);
  return <div className="flex flex-col min-h-0 h-full w-full bg-slate-100">
    <div className="flex flex-wrap items-center justify-center gap-1 bg-white border-b border-slate-200 p-2 text-xs shrink-0">
      <button disabled={!document || page <= 1} onClick={() => setPage(value => value - 1)} className="p-2 disabled:opacity-30">이전</button>
      <span>{page} / {document?.numPages || "…"}</span>
      <button disabled={!document || page >= document.numPages} onClick={() => setPage(value => value + 1)} className="p-2 disabled:opacity-30">다음</button>
      <span className="mx-1 h-5 border-l border-slate-200" />
      <button aria-label="PDF 축소" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5,value - 0.5))} className="h-9 w-9 rounded-lg bg-slate-50 text-lg disabled:opacity-30">−</button>
      <span className="w-12 text-center font-semibold tabular-nums" aria-live="polite">{Math.round(zoom*100)}%</span>
      <button aria-label="PDF 확대" disabled={zoom >= 6} onClick={() => setZoom(value => Math.min(6,value + 0.5))} className="h-9 w-9 rounded-lg bg-slate-50 text-lg disabled:opacity-30">＋</button>
      <button onClick={() => setZoom(1)} className="ml-1 rounded-lg border border-slate-200 px-2 py-2">폭 맞춤</button>
    </div>
    <div ref={container} className="flex-1 min-h-0 overflow-auto p-2">
      {error ? <p role="alert" className="p-4 text-sm text-rose-700">{error}</p> : !document ? <p className="p-4 text-sm">PDF 로딩 중…</p> : null}
      <canvas ref={canvas} aria-label={`PDF ${page}페이지`} className="block bg-white shadow-md" />
    </div>
  </div>;
}
