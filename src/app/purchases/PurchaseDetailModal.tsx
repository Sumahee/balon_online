"use client";

import { useEffect, useId } from "react";
import { Edit2, X } from "lucide-react";
import type { OnlinePurchaseItem } from "@/types";

export function PurchaseDetailModal({ item, onClose, onEdit, onPhoto }: {
  item: OnlinePurchaseItem;
  onClose: () => void;
  onEdit: () => void;
  onPhoto: (index: number) => void;
}) {
  const titleId = useId();
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);
  return <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div><p className="mb-1 text-xs font-medium text-blue-600">인터넷 자재구매 상세정보</p><h2 id={titleId} className="text-xl font-bold break-words text-slate-900">{item.itemName}</h2></div>
        <button type="button" autoFocus onClick={onClose} aria-label="구매 상세 닫기" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[["쇼핑몰", item.mallName], ["상호 / 판매처", item.storeName], ["구매일", item.purchaseDate], ["규격 / 사이즈", item.sizeSpec], ["색상", item.color], ["수량", `${item.quantity}개`], ["금액 / 단가", item.unitPrice], ["검색방법 / 검색어", item.searchKeyword], ...(item.totalPrice != null && item.totalPrice > 0 ? [["총금액", `${item.totalPrice.toLocaleString("ko-KR")}원`]] : [])].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-900">{value || "미등록"}</dd></div>)}
        </dl>
        <section><h3 className="mb-2 font-bold text-sm">기타 / 비고</h3><p className="rounded-xl bg-slate-50 p-4 text-sm leading-7 whitespace-pre-wrap break-words text-slate-700">{item.notes || "등록된 비고가 없습니다."}</p></section>
        <section><h3 className="mb-3 font-bold text-sm">상품 / 자재 사진 · {item.photos?.length ?? 0}장</h3>
          {item.photos?.length ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{item.photos.map((photo,index) => <button key={`${index}-${photo}`} type="button" aria-label={`상품 사진 ${index+1} 확대`} onClick={()=>onPhoto(index)} className="rounded-xl border border-slate-200 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`${item.itemName} 사진 ${index+1}`} className="max-h-80 w-full object-contain" />
          </button>)}</div> : <p className="text-sm text-slate-500">등록된 사진이 없습니다.</p>}
        </section>
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 p-4"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">닫기</button><button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Edit2 className="h-4 w-4" />구매 정보 수정</button></footer>
    </div>
  </div>;
}
