"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchPhotoBlob, isProtectedPhoto } from "@/lib/photo-access";

// Image elements cannot send Bearer headers. WebViews may retain localStorage while losing cookies.
export function PhotoImage({ src = "", alt, className, ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const { token, isLoading } = useAuth();
  const protectedPhoto = isProtectedPhoto(src);
  const [loaded, setLoaded] = useState<{ source: string; token: string; url: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!protectedPhoto || !token || isLoading) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setError("");
    void fetchPhotoBlob(src, token, AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]))
      .then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ source: src, token, url: objectUrl });
      }).catch(cause => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "사진 조회 실패");
      });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, token, protectedPhoto, isLoading]);

  if (protectedPhoto && (isLoading || token)) {
    if (loaded?.source === src && loaded.token === token && !error) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img {...props} src={loaded.url} alt={alt} className={className} />;
    }
    return <span className={`${className || ""} inline-flex min-h-16 items-center justify-center bg-slate-100 p-2 text-center text-xs text-slate-500`} role="status">
      {error || "사진 불러오는 중…"}
    </span>;
  }
  // Local previews and legacy external images do not receive credentials.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} key={token || "anonymous"} src={src} alt={alt} className={className} />;
}
