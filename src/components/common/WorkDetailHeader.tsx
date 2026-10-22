"use client";

import { CalendarDays, ChevronDown, MapPin, Pencil, Phone, UserRound, UsersRound } from "lucide-react";
import type { WorkItem } from "@/types";
import { getWorkTitle } from "@/lib/work-title";

export function WorkDetailHeader({ item, onEdit }: { item: WorkItem; onEdit: () => void }) {
  const date = item.deliveryDate || item.dueDate;
  const scheduled = date ? new Date(`${date.slice(0, 10)}T12:00:00+09:00`) : null;
  const dateLabel = scheduled && !Number.isNaN(scheduled.getTime())
    ? `${date.slice(0, 10).replaceAll("-", ".")} (${scheduled.toLocaleDateString("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" })})`
    : "일정 미정";
  const registered = item.createdAt ? new Date(item.createdAt) : null;
  const registeredLabel = registered && !Number.isNaN(registered.getTime())
    ? registered.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" })
    : "기록 없음";
  const control = "flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return <div className="space-y-4">
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">
        <h2 className="min-w-0 break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{item.clientName || getWorkTitle(item)}</h2>
        <div className="flex items-center gap-2 text-slate-700">
          <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500" />
          <span className="shrink-0 text-xs text-slate-500">{item.deadlineType === "배송일" ? "발송일" : item.deadlineType || "시공일"}</span>
          <time dateTime={date || undefined} className="text-base font-bold tracking-tight text-slate-900 sm:text-xl">{dateLabel}</time>
        </div>
      </div>
      <button type="button" aria-label="업무 수정" onClick={onEdit} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Pencil aria-hidden="true" className="h-3.5 w-3.5" />수정</button>
    </div>

    <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_230px] sm:gap-5">
      <section aria-label="현장정보" className="min-w-0">
        <div className="mb-3 flex items-center gap-3"><h3 className="text-sm font-bold text-indigo-900">현장정보</h3><span className="h-px flex-1 bg-slate-100" /></div>
        <dl className="space-y-3 text-sm">
          <div className="flex items-start gap-2.5"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><dt className="mb-1 text-xs text-slate-500">주소</dt><dd className="whitespace-pre-wrap break-words leading-relaxed text-slate-800">{item.siteAddress || "미입력"}</dd></div></div>
          <div className="flex items-start gap-2.5"><Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0"><dt className="mb-1 text-xs text-slate-500">현장 연락처</dt><dd className="break-words font-semibold text-slate-800">{item.siteContactPhone ? <a href={`tel:${item.siteContactPhone.replace(/[^+\d]/g, "")}`} className="hover:text-indigo-700">{item.siteContactPhone}</a> : "미입력"}</dd></div></div>
        </dl>
      </section>

      <aside aria-label="담당 정보" className="min-w-0 border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <p className="mb-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500"><span>등록일</span><time dateTime={item.createdAt || undefined}>{registeredLabel}</time></p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
          <button type="button" onClick={onEdit} aria-label="담당자 정보 확인 및 업무 수정" className={control}><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-indigo-700" /><span className="min-w-0 flex-1 break-words"><span className="block text-xs text-slate-500 sm:inline sm:text-sm">담당자 · </span><strong className="block font-semibold sm:inline">{item.assignee || item.createdBy || "미지정"}</strong></span><ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" /></button>
          <button type="button" onClick={onEdit} aria-label="시공팀 선택 및 업무 수정" className={control}><UsersRound aria-hidden="true" className="h-4 w-4 shrink-0 text-indigo-700" /><span className="min-w-0 flex-1 break-words"><span className="block text-xs text-slate-500 sm:inline sm:text-sm">시공팀 · </span><strong className="block font-semibold sm:inline">{item.installationTeam || "선택"}</strong></span><ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" /></button>
        </div>
      </aside>
    </div>
  </div>;
}
