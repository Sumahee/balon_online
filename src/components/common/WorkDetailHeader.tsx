"use client";

import { CalendarDays, ChevronDown, MapPin, Pencil, Phone, UserRound, UsersRound } from "lucide-react";
import type { WorkItem } from "@/types";
import { getWorkTitle } from "@/lib/work-title";

export function WorkDetailHeader({ item, onEdit, readOnly = false }: { item: WorkItem; onEdit: () => void; readOnly?: boolean }) {
  const date = item.deliveryDate || item.dueDate;
  const scheduled = date ? new Date(`${date.slice(0, 10)}T12:00:00+09:00`) : null;
  const dateLabel = scheduled && !Number.isNaN(scheduled.getTime())
    ? `${date.slice(0, 10).replaceAll("-", ".")} (${scheduled.toLocaleDateString("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" })})`
    : "일정 미정";
  const registered = item.createdAt ? new Date(item.createdAt) : null;
  const registeredLabel = registered && !Number.isNaN(registered.getTime())
    ? registered.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" })
    : "기록 없음";
  const control = "flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] sm:text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return <div className="space-y-3">
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <h2 title={item.clientName || getWorkTitle(item)} className="min-w-0 truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{item.clientName || getWorkTitle(item)}</h2>
        <div className="flex shrink-0 items-center gap-1 text-slate-700 sm:gap-1.5">
          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-500 sm:h-4 sm:w-4" />
          <span className="shrink-0 text-[10px] text-slate-500 sm:text-xs">{item.deadlineType === "배송일" ? "발송일" : item.deadlineType || "시공일"}</span>
          <time dateTime={date || undefined} className="whitespace-nowrap text-xs font-bold tracking-tight text-slate-900 sm:text-lg">{dateLabel}</time>
        </div>
      </div>
      {!readOnly && <button type="button" aria-label="업무 수정" onClick={onEdit} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Pencil aria-hidden="true" className="h-3.5 w-3.5" />수정</button>}
    </div>

    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:gap-4">
      <section aria-label="현장정보" className="min-w-0">
        <div className="mb-2 flex items-center gap-2"><h3 className="text-xs font-bold text-indigo-900">현장정보</h3><span className="h-px flex-1 bg-slate-100" /></div>
        <dl className="space-y-2 text-xs">
          <div className="flex items-start gap-1.5"><MapPin aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><dt className="mb-0.5 text-[10px] text-slate-500">주소</dt><dd className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-4 text-slate-800">{item.siteAddress || "미입력"}</dd></div></div>
          <div className="flex items-start gap-1.5"><Phone aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" /><div className="min-w-0"><dt className="mb-0.5 text-[10px] text-slate-500">현장 연락처</dt><dd className="break-words font-semibold text-slate-800">{item.siteContactPhone ? <a href={`tel:${item.siteContactPhone.replace(/[^+\d]/g, "")}`} className="hover:text-indigo-700">{item.siteContactPhone}</a> : "미입력"}</dd></div></div>
        </dl>
      </section>

      <aside aria-label="담당 정보" className="min-w-0 border-l border-slate-100 pl-3 sm:pl-4">
        <p className="mb-2 flex items-center gap-1 whitespace-nowrap text-[10px] text-slate-500 sm:text-[11px]"><span>등록일</span><time dateTime={item.createdAt || undefined}>{registeredLabel.replace(/\s/g, "")}</time></p>
        <div className="grid grid-cols-1 gap-1.5">
          <button disabled={readOnly} type="button" onClick={onEdit} aria-label="담당자 정보 확인 및 업무 수정" className={control}><UserRound aria-hidden="true" className="h-3 w-3 shrink-0 text-indigo-700" /><span className="flex min-w-0 flex-1 items-center gap-1"><span className="shrink-0 text-[10px] text-slate-500 sm:text-[11px]">담당자 · </span><strong className="truncate font-semibold">{item.assignee || item.createdBy || "미지정"}</strong></span><ChevronDown aria-hidden="true" className="h-2.5 w-2.5 shrink-0 text-slate-400" /></button>
          <button disabled={readOnly} type="button" onClick={onEdit} aria-label="시공팀 선택 및 업무 수정" className={control}><UsersRound aria-hidden="true" className="h-3 w-3 shrink-0 text-indigo-700" /><span className="flex min-w-0 flex-1 items-center gap-1"><span className="shrink-0 text-[10px] text-slate-500 sm:text-[11px]">시공팀 · </span><strong className="truncate font-semibold">{item.installationTeam || "선택"}</strong></span><ChevronDown aria-hidden="true" className="h-2.5 w-2.5 shrink-0 text-slate-400" /></button>
        </div>
      </aside>
    </div>
  </div>;
}
