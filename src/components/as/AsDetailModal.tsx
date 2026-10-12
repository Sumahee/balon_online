"use client";

import { useEffect, useId } from "react";
import { Edit2, Printer, X } from "lucide-react";
import type { AsItem } from "@/types";

interface AsDetailModalProps {
  item: AsItem;
  onClose: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onOpenPhoto: (url: string) => void;
}

export function AsDetailModal({ item, onClose, onEdit, onPrint, onOpenPhoto }: AsDetailModalProps) {
  const titleId = useId();
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);
  const photos = item.resultPhotos?.length ? item.resultPhotos : item.images || [];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="mb-1 text-xs font-medium text-rose-600">A/S 상세정보</p>
            <h2 id={titleId} className="text-xl font-bold text-slate-900">{item.clientName}</h2>
            <div className="mt-2 flex gap-2 text-xs"><span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{item.resultStatus}</span><span className="rounded-md bg-rose-50 px-2 py-1 text-rose-700">우선순위 {item.priority}</span></div>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label="A/S 상세 닫기" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            {[
              ["현장 주소", item.siteAddress], ["연락처", item.contactPhone],
              ["최초 시공일", item.constructDate], ["최초 시공자", item.installer],
              ["A/S 접수일", item.receivedDate || item.createdAt?.split("T")[0]], ["A/S 처리 예정일", item.asDate],
              ["A/S 처리 담당기사", item.technician], ["A/S 구분", item.serviceType ? `${item.serviceType} A/S${item.serviceType === "유상" ? ` · ${item.paidReason || "사유 미등록"}` : ""}` : "미등록"],
            ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-900">{value || "미등록"}</dd></div>)}
          </dl>
          <section><h3 className="mb-2 text-sm font-bold text-slate-900">A/S 발생 사유</h3><p className="whitespace-pre-wrap break-words rounded-xl bg-amber-50 p-4 text-sm leading-7 text-slate-800">{item.reason || "등록된 사유가 없습니다."}</p></section>
          <section><h3 className="mb-2 text-sm font-bold text-slate-900">처리 및 조치 결과</h3><p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{item.resolutionDetails || "아직 조치 결과가 등록되지 않았습니다."}</p></section>
          {photos.length > 0 && <section><h3 className="mb-3 text-sm font-bold text-slate-900">현장 사진 · {photos.length}장</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{photos.map((url, index) => <button key={`${url}-${index}`} type="button" onClick={() => onOpenPhoto(url)} aria-label={`현장 사진 ${index + 1} 확대`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`현장 사진 ${index + 1}`} className="max-h-80 w-full rounded-lg object-contain" />
          </button>)}</div></section>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button type="button" onClick={onPrint} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" />접수증 인쇄</button>
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Edit2 className="h-4 w-4" />수정</button>
        </footer>
      </div>
    </div>
  );
}
