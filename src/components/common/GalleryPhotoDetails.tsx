"use client";

import { Building, MapPin } from "lucide-react";
import type { GalleryImage } from "@/types";
import { DrawingQuickOpen } from "./DrawingQuickOpen";

export function GalleryPhotoDetails({ image }: { image: GalleryImage }) {
  return <div className="mt-1 space-y-1.5 text-xs">
    {image.clientName && <p className="flex items-start gap-1 text-slate-700"><Building className="mt-0.5 h-3 w-3 shrink-0" /><span className="min-w-0 break-words">{image.clientName}</span></p>}
    {(image.siteAddress || (!image.clientName && image.siteName)) && <p className="flex items-start gap-1 text-slate-500"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span className="min-w-0 break-words">{image.siteAddress || image.siteName}</span></p>}
    {image.drawingAttachment && <div className="flex items-center gap-1 text-emerald-700">
      <DrawingQuickOpen label="도면 보기" item={{attachments: [], drawingAttachment: image.drawingAttachment, detailsLoaded: false}} />
    </div>}
    <div className="flex flex-wrap gap-1">
      {image.boardColor?.trim() && <span className="max-w-full break-words rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">#선반 {image.boardColor}</span>}
      {image.postColor?.trim() && <span className="max-w-full break-words rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">#포스트 {image.postColor}</span>}
    </div>
  </div>;
}
