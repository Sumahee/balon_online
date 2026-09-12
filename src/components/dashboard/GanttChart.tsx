"use client";

import React, { useState } from "react";
import { WorkItem } from "@/types";
import { Calendar, ChevronLeft, ChevronRight, User, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface GanttChartProps {
  items: WorkItem[];
  onSelectTask?: (task: WorkItem) => void;
}

export function GanttChart({ items, onSelectTask }: GanttChartProps) {
  const [selectedTask, setSelectedTask] = useState<WorkItem | null>(null);

  // Month reference: 2026년 9월 (1일 ~ 30일)
  const totalDays = 30;
  const currentSimulatedDay = 10; // 9월 10일
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  const getDayFromDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return parseInt(parts[2], 10);
      }
    } catch {
      return 1;
    }
    return 1;
  };

  const getCategoryColor = (category: WorkItem["category"]) => {
    switch (category) {
      case "제작":
        return "bg-blue-600 border-blue-700 text-white";
      case "설계":
        return "bg-indigo-600 border-indigo-700 text-white";
      case "시공":
        return "bg-emerald-600 border-emerald-700 text-white";
      case "실측":
        return "bg-amber-600 border-amber-700 text-white";
      case "납품":
        return "bg-purple-600 border-purple-700 text-white";
      default:
        return "bg-slate-600 border-slate-700 text-white";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              공정 일정 타임라인 (Gantt Chart)
            </h3>
            <p className="text-xs text-slate-500">
              2026년 9월 제작·시공 일정 및 공정률 시각화
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-medium text-slate-600">오늘 (9월 10일)</span>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              제작
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              시공
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              설계
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              실측
            </span>
          </div>
        </div>
      </div>

      {/* Gantt Timeline Container with Horizontal Scroll */}
      <div className="overflow-x-auto">
        <div className="min-w-[850px] p-4">
          {/* Calendar Day Header */}
          <div className="grid grid-cols-[220px_1fr] border-b border-slate-200 pb-2 text-xs font-semibold text-slate-500">
            <div className="pl-2">프로젝트 / 담당자</div>
            <div className="grid grid-cols-30 text-center">
              {daysArray.map((day) => {
                const isToday = day === currentSimulatedDay;
                const isWeekend = (day % 7 === 5 || day % 7 === 6); // roughly Saturday/Sunday
                return (
                  <div
                    key={day}
                    className={cn(
                      "text-[11px] py-0.5 rounded",
                      isToday
                        ? "bg-rose-500 text-white font-bold shadow-xs"
                        : isWeekend
                        ? "text-slate-400 bg-slate-100/50"
                        : "text-slate-600"
                    )}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-100 mt-1">
            {items.map((item) => {
              const startDay = Math.min(30, Math.max(1, getDayFromDate(item.startDate)));
              const dueDay = Math.min(30, Math.max(startDay, getDayFromDate(item.dueDate)));
              const durationDays = dueDay - startDay + 1;

              // Grid column start and span
              const colStart = startDay;
              const colSpan = Math.max(1, durationDays);

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[220px_1fr] py-3 items-center hover:bg-slate-50/80 transition group"
                >
                  {/* Left task metadata */}
                  <div
                    className="pr-3 truncate cursor-pointer"
                    onClick={() => {
                      setSelectedTask(item);
                      if (onSelectTask) onSelectTask(item);
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-extrabold text-blue-900 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                        {item.clientName || "협력사"}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {item.assignee}
                      </span>
                      <span>·</span>
                      <span className="font-bold text-slate-800">{item.status}</span>
                      <span>·</span>
                      <span className="font-medium text-slate-700">{item.progress}%</span>
                    </div>
                  </div>

                  {/* Right Timeline Bar */}
                  <div className="relative h-9 flex items-center gantt-grid bg-slate-50/40 rounded-lg p-1">
                    {/* Today indicator line across timeline */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-500/60 z-10 pointer-events-none"
                      style={{
                        left: `${((currentSimulatedDay - 0.5) / totalDays) * 100}%`,
                      }}
                    />

                    {/* Gantt Bar positioned using grid/percentages */}
                    <div
                      onClick={() => {
                        setSelectedTask(item);
                        if (onSelectTask) onSelectTask(item);
                      }}
                      className={cn(
                        "relative h-7 rounded-md shadow-xs border cursor-pointer transition-all duration-200 group-hover:shadow-md flex items-center px-2 overflow-hidden",
                        getCategoryColor(item.category)
                      )}
                      style={{
                        left: `${((colStart - 1) / totalDays) * 100}%`,
                        width: `${(colSpan / totalDays) * 100}%`,
                      }}
                      title={`${item.title} (${item.startDate} ~ ${item.dueDate}) - 진행률 ${item.progress}%`}
                    >
                      {/* Inner Progress overlay */}
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-black/20"
                        style={{ width: `${item.progress}%` }}
                      />

                      <div className="relative z-10 flex items-center justify-between w-full text-[10px] font-bold text-white truncate drop-shadow-xs">
                        <span className="truncate pr-1">{item.title}</span>
                        <span className="shrink-0 opacity-90">{item.progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Task Detail Inspector Modal */}
      {selectedTask && (
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-800 animate-in fade-in">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500 font-bold">
                {selectedTask.category}
              </span>
              <h4 className="font-bold text-sm text-white">{selectedTask.title}</h4>
              <span className="text-xs text-slate-400">
                (상태: <strong className="text-white">{selectedTask.status}</strong>, 우선순위:{" "}
                <strong className="text-amber-400">{selectedTask.priority}</strong>)
              </span>
            </div>
            <p className="text-xs text-slate-300">
              일정: {selectedTask.startDate} ~ {selectedTask.dueDate} | 담당자: {selectedTask.assignee} |
              진행률: {selectedTask.progress}%
            </p>
            {selectedTask.notes && (
              <p className="text-xs text-slate-400 italic mt-1">
                메모: &quot;{selectedTask.notes}&quot;
              </p>
            )}
          </div>
          <button
            onClick={() => setSelectedTask(null)}
            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
