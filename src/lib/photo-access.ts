export function isProtectedPhoto(url: string) {
  return url.startsWith("/api/gallery?") || url.startsWith("/api/construction-photo?");
}

export async function fetchPhotoBlob(url: string, token: string, signal: AbortSignal): Promise<Blob> {
  if (!isProtectedPhoto(url)) throw new Error("Invalid photo address");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "same-origin", signal,
  });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error(response.status === 401 ? "로그인을 다시 확인해주세요." : "사진을 불러오지 못했습니다.");
  }
  return response.blob();
}
