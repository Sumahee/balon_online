"use client";
import { getWorkTitle } from "@/lib/work-title";

import { useState } from "react";
import Link from "next/link";
import { useData } from "@/context/DataContext";
import { getToday } from "@/lib/date";
import { getMaterialOrders } from "@/lib/materialUtils";
import { TaskDetailModal } from "./TaskDetailModal";

export function WorkOverview() {
  const { workItems, asItems, isLoading } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const today = getToday();
  const active = workItems.filter((item) => item.status !== "시공완료");
  const deadline = (item: typeof active[number]) => item.deliveryDate || item.dueDate;
  const overdue = active.filter((item) => deadline(item) && deadline(item) < today);
  const dueToday = active.filter((item) => deadline(item) === today);
  const unordered = active.filter((item) => getMaterialOrders(item).some((order) => !order.isOrdered));
  const urgentServices = asItems.filter((item) => item.priority === "긴급" && item.resultStatus !== "완료");
  const needsAttention = [...active].filter((item) => item.priority === "긴급" || (deadline(item) && deadline(item) <= today))
    .sort((a, b) => deadline(a).localeCompare(deadline(b))).slice(0, 5);
  const selected = workItems.find((item) => item.id === selectedId);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4" aria-label="오늘의 업무 우선순위">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">오늘 확인할 업무</h2>
          <p className="mt-1 text-sm text-slate-600">마감과 자재 발주를 먼저 확인하고, 상세 화면에서 담당자와 다음 공정을 정리하세요.</p>
        </div>
        <Link href="/calendar" className="text-sm font-medium text-blue-700 hover:underline">일정 보기 →</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "마감 지남", count: overdue.length, href: "/work", color: "text-rose-700" },
          { label: "오늘 마감", count: dueToday.length, href: "/work", color: "text-blue-700" },
          { label: "미발주 업무", count: unordered.length, href: "/work", color: "text-amber-700" },
          { label: "긴급 A/S", count: urgentServices.length, href: "/as", color: "text-rose-700" },
        ].map((summary) => (
          <Link key={summary.label} href={summary.href} className="rounded-xl bg-slate-50 p-3 border border-slate-100 hover:border-blue-300">
            <span className="text-sm text-slate-600">{summary.label}</span>
            <p className={`mt-1 text-2xl font-bold ${summary.color}`}>{isLoading ? "…" : summary.count}<span className="ml-1 text-sm font-normal">건</span></p>
          </Link>
        ))}
      </div>
      {!isLoading && (needsAttention.length ? (
        <ul className="divide-y divide-slate-100">
          {needsAttention.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setSelectedId(item.id)} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50 rounded-lg">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{getWorkTitle(item)}</p><p className="mt-1 text-sm text-slate-600">{item.clientName} · {item.assignee || "담당자 미지정"}</p></div>
                <div className="shrink-0 text-right text-sm"><p className="font-medium text-slate-700">{item.status}</p><p className="mt-1 text-rose-700">{deadline(item) || "마감일 미지정"}</p></div>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-500">오늘 마감하거나 마감이 지난 업무, 긴급 업무가 없습니다.</p>)}
      {selected && <TaskDetailModal item={selected} onClose={() => setSelectedId(null)} />}
    </section>
  );
}
