"use client";

import React, { useState } from "react";
import { WorkItem, WorkStatus } from "@/types";
import { getMaterialOrders, getMaterialSummary } from "@/lib/materialUtils";
import {
  Clock,
  Briefcase,
  Factory,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  Calendar,
  Building,
  Paperclip,
  AlertTriangle,
  Plus,
  FileText,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { TaskDetailModal } from "@/components/dashboard/TaskDetailModal";

interface KanbanBoardProps {
  items: WorkItem[];
}

export function KanbanBoard({ items }: KanbanBoardProps) {
  const { advanceWorkStatus, updateWorkItem, setQuickModalType } = useData();
  const [selectedTask, setSelectedTask] = useState<WorkItem | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<WorkStatus | "전체">("전체");

  // Simulated today date for urgency check
  const todayStr = "2026-09-10";

  const columns: {
    status: WorkStatus;
    title: string;
    subtext: string;
    icon: typeof Clock;
    headerBg: string;
    borderAccent: string;
    textColor: string;
  }[] = [
    {
      status: "대기",
      title: "To-Do (대기)",
      subtext: "발주 접수 / 대기",
      icon: Clock,
      headerBg: "bg-slate-100",
      borderAccent: "border-slate-300",
      textColor: "text-slate-800",
    },
    {
      status: "오피스",
      title: "오피스 (도면/택배)",
      subtext: "CAD 도면 / 택배 리스트업",
      icon: Briefcase,
      headerBg: "bg-blue-50",
      borderAccent: "border-blue-400",
      textColor: "text-blue-800",
    },
    {
      status: "공장",
      title: "공장 (자재 준비)",
      subtext: "판재 재단 / 부자재 준비",
      icon: Factory,
      headerBg: "bg-amber-50",
      borderAccent: "border-amber-400",
      textColor: "text-amber-800",
    },
    {
      status: "준비완료",
      title: "준비완료 (출고대기)",
      subtext: "제작 완료 / 시공·배송 대기",
      icon: CheckCircle2,
      headerBg: "bg-emerald-50",
      borderAccent: "border-emerald-400",
      textColor: "text-emerald-800",
    },
  ];

  const visibleColumns =
    mobileActiveTab === "전체"
      ? columns
      : columns.filter((c) => c.status === mobileActiveTab);

  const getUrgencyInfo = (targetDate: string, priority: WorkItem["priority"]) => {
    try {
      const diffDays = Math.ceil(
        (new Date(targetDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      );

      const isUrgent = priority === "긴급" || (diffDays >= 0 && diffDays <= 3);
      return {
        isUrgent,
        diffDays,
      };
    } catch {
      return { isUrgent: priority === "긴급", diffDays: 99 };
    }
  };

  return (
    <>
      {/* Mobile Column Switcher Tab Bar */}
      <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-2 mb-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs shrink-0">
        <button
          onClick={() => setMobileActiveTab("전체")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer",
            mobileActiveTab === "전체"
              ? "bg-slate-900 text-white shadow-2xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          📱 전체 칸반 ({items.length})
        </button>
        {columns.map((col) => {
          const count = items.filter((i) => i.status === col.status).length;
          return (
            <button
              key={col.status}
              onClick={() => setMobileActiveTab(col.status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1",
                mobileActiveTab === col.status
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              <span>{col.title.split(" ")[0]}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-extrabold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {visibleColumns.map((col) => {
          const colItems = items.filter((item) => item.status === col.status);
          const Icon = col.icon;

          return (
            <div
              key={col.status}
              className="flex flex-col bg-slate-100/80 rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
            >
              {/* Column Header */}
              <div
                className={cn(
                  "px-4 py-3 border-b flex items-center justify-between",
                  col.headerBg,
                  col.borderAccent
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", col.textColor)} />
                    <h4 className={cn("text-xs sm:text-sm font-bold", col.textColor)}>
                      {col.title}
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{col.subtext}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white shadow-2xs text-slate-700">
                  {colItems.length}
                </span>
              </div>

              {/* Cards Container: Natural vertical growth so full page scrolls */}
              <div className="flex-1 p-3 space-y-3 min-h-[220px]">
                {/* Non-ToDo columns empty state */}
                {col.status !== "대기" && colItems.length === 0 && (
                  <div className="h-28 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
                    <span>진행 중인 작업 없음</span>
                  </div>
                )}

                {/* Task Cards List */}
                {colItems.map((task) => {
                  const targetDate = task.deliveryDate || task.dueDate;
                  const { isUrgent, diffDays } = getUrgencyInfo(targetDate, task.priority);
                  const hasPdf = task.attachments?.some((a) => a.fileType === "pdf");

                  return (
                    <React.Fragment key={task.id}>
                      <div
                        className={cn(
                          "p-3.5 bg-white rounded-xl border shadow-2xs hover:shadow-md transition cursor-pointer group space-y-2.5 relative",
                          isUrgent
                            ? "border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/10"
                            : "border-slate-200 hover:border-blue-400"
                        )}
                        onClick={() => setSelectedTask(task)}
                      >
                        {/* Urgent Alert Banner on Card */}
                        {isUrgent && (
                          <div className="flex items-center justify-between text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              기한 긴급 촉박
                            </span>
                            <span>{diffDays >= 0 ? `D-${diffDays}` : "기한경과"}</span>
                          </div>
                        )}

                        {/* Top: Client Name & Card Type */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 font-extrabold text-blue-950 text-xs truncate max-w-[150px]">
                            <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">{task.clientName || "협력업체"}</span>
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Card Type Badge */}
                            <span
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                task.cardType === "도면"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : task.cardType === "자재리스트"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : task.cardType === "견적"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              )}
                            >
                              {task.cardType || "도면"}
                            </span>
                            <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-slate-50 text-slate-500">
                              {task.category}
                            </span>
                          </div>
                        </div>

                        {/* Project / Task Title */}
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug group-hover:text-blue-600 transition line-clamp-2">
                          {task.title}
                        </h5>

                        {/* Deadline Type & Date */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="font-bold text-slate-900">
                              [{task.deadlineType || "시공일"}] {task.deliveryDate ? task.deliveryDate.substring(5) : task.dueDate.substring(5)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-500">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{task.assignee}</span>
                          </div>
                        </div>

                        {/* Multi-Item Material Order Section */}
                        {(() => {
                          const matOrders = getMaterialOrders(task);
                          const { total, completed, isAllOrdered } = getMaterialSummary(matOrders);
                          if (matOrders.length === 0) return null;

                          return (
                            <div
                              className="pt-1.5 space-y-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Overall Status Banner */}
                              <div
                                className={cn(
                                  "p-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-between shadow-2xs",
                                  isAllOrdered
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                    : "bg-rose-50 border-rose-300 text-rose-800"
                                )}
                              >
                                <span className="flex items-center gap-1">
                                  <Box className="w-3.5 h-3.5 shrink-0" />
                                  <span>
                                    {isAllOrdered
                                      ? "✅ 자재 발주 완료"
                                      : "⚠️ 미발주 자재 확인 필요"}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    "text-[10px] font-extrabold px-1.5 py-0.2 rounded text-white",
                                    isAllOrdered ? "bg-emerald-600" : "bg-rose-600 animate-pulse"
                                  )}
                                >
                                  {completed}/{total} 완료
                                </span>
                              </div>

                              {/* Itemized Checkboxes */}
                              <div className="space-y-1 pl-0.5">
                                {matOrders.map((mo) => (
                                  <button
                                    key={mo.id}
                                    type="button"
                                    onClick={() => {
                                      const nextOrders = matOrders.map((o) =>
                                        o.id === mo.id ? { ...o, isOrdered: !o.isOrdered } : o
                                      );
                                      const allDone = nextOrders.every((o) => o.isOrdered);
                                      updateWorkItem(task.id, {
                                        materialOrders: nextOrders,
                                        materialOrderStatus: allDone ? "발주완료" : "발주필요",
                                      });
                                    }}
                                    className={cn(
                                      "w-full text-left p-1.5 rounded-md border text-[11px] font-semibold flex items-center justify-between transition cursor-pointer group/item",
                                      mo.isOrdered
                                        ? "bg-slate-50 border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200"
                                        : "bg-amber-50/80 border-amber-200 text-amber-950 font-bold hover:bg-rose-100"
                                    )}
                                    title={mo.isOrdered ? "클릭시 미발주 처리" : "클릭시 발주 완료 처리"}
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <span
                                        className={cn(
                                          "w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 border",
                                          mo.isOrdered
                                            ? "bg-emerald-600 border-emerald-600 text-white"
                                            : "bg-white border-amber-400 text-transparent group-hover/item:text-rose-500"
                                        )}
                                      >
                                        ✓
                                      </span>
                                      <span className={cn("truncate", mo.isOrdered && "line-through text-slate-400")}>
                                        {mo.name}
                                      </span>
                                    </span>

                                    <span
                                      className={cn(
                                        "text-[9px] px-1 py-0.2 rounded shrink-0 font-extrabold",
                                        mo.isOrdered
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-rose-500 text-white"
                                      )}
                                    >
                                      {mo.isOrdered ? "완료" : "미발주"}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Attachments Indicator */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                          <div className="flex items-center gap-1.5">
                            {task.attachments && task.attachments.length > 0 ? (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-100 font-bold text-slate-700">
                                <Paperclip className="w-3 h-3 text-slate-500" />
                                {task.attachments.length}개
                                {hasPdf && <span className="text-rose-600 ml-0.5">PDF</span>}
                              </span>
                            ) : (
                              <span className="text-slate-400">파일없음</span>
                            )}
                          </div>
                        </div>

                        {/* Quick Process Step Transition Button */}
                        <div
                          className="pt-2 border-t border-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {col.status === "대기" && (
                            <button
                              onClick={() => advanceWorkStatus(task.id)}
                              className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>오피스 인계 (도면작업)</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {col.status === "오피스" && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  updateWorkItem(task.id, { status: "대기", progress: 10 })
                                }
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                title="대기로 되돌리기"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => advanceWorkStatus(task.id)}
                                className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>공장 인계 (설계도/자재)</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {col.status === "공장" && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  updateWorkItem(task.id, { status: "오피스", progress: 40 })
                                }
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                title="오피스로 되돌리기"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => advanceWorkStatus(task.id)}
                                className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>준비완료 처리</span>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {col.status === "준비완료" && (
                            <div className="space-y-1">
                              <button
                                onClick={() =>
                                  updateWorkItem(task.id, { status: "시공완료", progress: 100 })
                                }
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer ring-2 ring-emerald-400/40"
                                title="해당일 시공 완료 처리시 클릭하면 칸반에서 삭제되고 업무 리스트로 보관됩니다"
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                                <span>🏗️ 시공완료 (칸반에서 삭제)</span>
                              </button>
                              <button
                                onClick={() =>
                                  updateWorkItem(task.id, { status: "공장", progress: 75 })
                                }
                                className="w-full py-0.5 text-[10px] text-slate-400 hover:text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <ArrowLeft className="w-3 h-3" />
                                <span>공장으로 되돌리기</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* To-Do (대기) 컬럼 전용: 맨 마지막 카드 위치에 빈 카드 형태의 업무 추가 버튼 */}
                {col.status === "대기" && (
                  <div
                    onClick={() => setQuickModalType("work")}
                    className="p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 text-xs font-bold cursor-pointer transition group shadow-2xs space-y-1.5 min-h-[100px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition">
                      <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition" />
                    </div>
                    <span>+ 새 업무 등록</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          item={items.find((i) => i.id === selectedTask.id) || selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
