import { zipSync } from "fflate";
import type { GalleryImage } from "@/types";
import { fetchPhotoBlob, isProtectedPhoto } from "@/lib/photo-access";

export const GALLERY_DOWNLOAD_MAX_BYTES = 100 * 1024 * 1024;

function originalUrl(url: string) {
  if (!isProtectedPhoto(url)) return url;
  const parsed = new URL(url, "https://balon.invalid");
  parsed.searchParams.delete("thumbnail");
  return `${parsed.pathname}${parsed.search}`;
}

export async function createGalleryArchive(images: GalleryImage[], token: string, signal: AbortSignal, onProgress: (done: number, total: number) => void) {
  if (!images.length || images.length > 60) throw new Error("현재 페이지에서 사진을 1~60장 선택해주세요.");
  const files: Record<string, Uint8Array> = {};
  let totalBytes = 0;
  onProgress(0, images.length);
  // Sequential reads bound network pressure and stop immediately on errors.
  for (const [index, image] of images.entries()) {
    signal.throwIfAborted();
    const url = originalUrl(image.url);
    const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    let blob: Blob;
    if (isProtectedPhoto(url)) {
      if (!token) throw new Error("로그인을 다시 확인해주세요.");
      blob = await fetchPhotoBlob(url, token, requestSignal);
    } else {
      if (!/^(https?:\/\/|\/uploads\/|data:image\/)/.test(url)) throw new Error("지원하지 않는 사진 주소입니다.");
      const response = await fetch(url, { signal: requestSignal, credentials: "omit" });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`사진을 받지 못했습니다: ${image.title}`);
      blob = await response.blob();
    }
    signal.throwIfAborted();
    totalBytes += blob.size;
    if (totalBytes > GALLERY_DOWNLOAD_MAX_BYTES) throw new Error("선택한 사진이 100MB를 넘습니다. 사진을 나누어 다운로드해주세요.");
    const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/heic": "heic", "image/bmp": "bmp" };
    const extension = extensions[blob.type.split(";")[0].toLowerCase()] || "img";
    const label = [image.clientName, image.siteAddress, image.title].filter(Boolean).join("_").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").slice(0, 100) || "사진";
    files[`${String(index + 1).padStart(3, "0")}_${label}.${extension}`] = new Uint8Array(await blob.arrayBuffer());
    onProgress(index + 1, images.length);
  }
  signal.throwIfAborted();
  // Photos are already compressed; storing them avoids expensive recompression.
  return zipSync(files, { level: 0 });
}
