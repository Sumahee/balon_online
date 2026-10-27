"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchPhotoBlob, isProtectedPhoto } from "@/lib/photo-access";

let activeDownloads = 0;
const waitingDownloads: Array<() => void> = [];
async function queuedPhoto(src: string, token: string, signal: AbortSignal) {
  if (activeDownloads >= 6) await new Promise<void>(resolve => waitingDownloads.push(resolve));
  else activeDownloads++;
  try { signal.throwIfAborted(); return await fetchPhotoBlob(src, token, signal); }
  finally { const next = waitingDownloads.shift(); if (next) next(); else activeDownloads--; }
}

// Image elements cannot send Bearer headers. WebViews may retain localStorage while losing cookies.
export function PhotoImage({ src = "", alt, className, ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const { token, isLoading } = useAuth();
  const placeholder = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(props.loading !== "lazy");
  useEffect(() => {
    if (visible || !placeholder.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: "150px" });
    observer.observe(placeholder.current);
    return () => observer.disconnect();
  }, [visible, src, token, isLoading]);
  const protectedPhoto = isProtectedPhoto(src);
  const [loaded, setLoaded] = useState<{ source: string; token: string; url: string } | null>(null);
  const [failure, setFailure] = useState<{source: string; token: string; message: string} | null>(null);
  const error = failure?.source === src && failure.token === token ? failure.message : "";
  useEffect(() => {
    if (!protectedPhoto || !token || isLoading || !visible) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void queuedPhoto(src, token, AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]))
      .then(blob => {
        if (controller.signal.aborted) return;
        setFailure(null);
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ source: src, token, url: objectUrl });
      }).catch(cause => {
        if (!controller.signal.aborted) setFailure({source: src, token, message: cause instanceof Error ? cause.message : "사진 조회 실패"});
      });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, token, protectedPhoto, isLoading, visible]);

  if (protectedPhoto && (isLoading || token)) {
    if (loaded?.source === src && loaded.token === token && !error) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img {...props} src={loaded.url} alt={alt} className={className} />;
    }
    return <span ref={placeholder} className={`${className || ""} inline-flex min-h-16 items-center justify-center bg-slate-100 p-2 text-center text-xs text-slate-500`} role="status">
      {error || "사진 불러오는 중…"}
    </span>;
  }
  // Local previews and legacy external images do not receive credentials.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} key={token || "anonymous"} src={src} alt={alt} className={className} />;
}
