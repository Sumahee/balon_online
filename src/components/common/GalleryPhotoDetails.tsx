"use client";

import type { GalleryImage } from "@/types";

export function GalleryPhotoDetails({ image }: { image: GalleryImage }) {
  const normalize = (value: string) => value.trim().replace(/^#+/, "").trim();
  const hiddenTags = new Set(
    [image.clientName, image.siteAddress, image.siteName, image.boardColor, image.postColor]
      .filter((value): value is string => !!value?.trim())
      .map(normalize)
  );
  const tags = [...new Set([
    image.boardColor?.trim() ? `선반 ${normalize(image.boardColor)}` : "",
    image.postColor?.trim() ? `포스트 ${normalize(image.postColor)}` : "",
    ...(image.tags ?? []).map(normalize).filter(tag => !hiddenTags.has(tag)),
  ].filter(Boolean))];

  if (!tags.length) return null;

  return <div aria-label="사진 태그" className="flex max-h-[4.25rem] min-w-0 flex-1 flex-wrap content-start gap-1 overflow-hidden">
    {tags.map(tag => <span key={tag} title={`#${tag}`} className="inline-flex h-5 max-w-full shrink-0 items-center rounded bg-slate-100 px-1.5 text-xs text-slate-600">
      <span className="truncate">#{tag}</span>
    </span>)}
  </div>;
}
