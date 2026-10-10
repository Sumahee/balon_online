"use client";

import { useData } from "@/context/DataContext";

export function DataStatus() {
  const { error, isLoading, isSaving, reloadData, dismissError } = useData();
  if (!error && !isLoading && !isSaving) return null;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 shadow-sm ${error ? "fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:w-[400px] z-[100] shadow-xl" : "mb-4"}`} role={error ? "alert" : "status"} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={error ? "text-rose-700" : "text-slate-600"}>
          {error || (isSaving ? "변경 사항을 저장하고 있습니다…" : "업무 데이터를 불러오고 있습니다…")}
        </p>
        {error && (
          <div className="flex gap-2">
            <button type="button" disabled={isLoading || isSaving} onClick={() => void reloadData()} className="rounded-lg bg-slate-900 px-3 py-2 font-medium text-white disabled:opacity-50">다시 불러오기</button>
            <button type="button" onClick={dismissError} className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">닫기</button>
          </div>
        )}
      </div>
    </div>
  );
}
