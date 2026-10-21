"use client";
import { getWorkTitle } from "@/lib/work-title";
import { workStatusLabel } from "@/lib/work-status";

import { getToday, getDaysUntil } from "@/lib/date";

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
  Plus,
  Box} from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
const TaskDetailModal=dynamic(()=>import("@/components/dashboard/TaskDetailModal").then(module=>module.TaskDetailModal),{ssr:false});

interface KanbanBoardProps {
  items: WorkItem[];
  showCompleted?: boolean;
}

export function KanbanBoard({ items, showCompleted = false }: KanbanBoardProps) {
  const { advanceWorkStatus, updateWorkItem, setQuickModalType } = useData();
  const { user } = useAuth();
  const [savingConfirmation, setSavingConfirmation] = useState<string | null>(null);
  const changeConfirmation = async (task: WorkItem) => {
    setSavingConfirmation(task.id);
    try {
      await updateWorkItem(task.id, { confirmationPending: !task.confirmationPending, confirmationCompleted: !!task.confirmationPending });
    } catch {
      // DataContext displays the save error and retains the existing status.
    } finally {
      setSavingConfirmation(null);
    }
  };
  const [selectedTask, setSelectedTask] = useState<WorkItem | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<WorkStatus | "전체">("전체");

  // 실제 업무 날짜로 마감 임박 여부를 판단합니다.
  const todayStr = getToday();

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

  if (showCompleted) {
    columns.push({ status: "시공완료", title: "완료", subtext: "시공·발송 완료 기록", icon: CheckCircle2,
      headerBg: "bg-emerald-50", borderAccent: "border-emerald-500", textColor: "text-emerald-800" });
  }

  const visibleColumns =
    mobileActiveTab === "전체"
      ? columns
      : columns.filter((c) => c.status === mobileActiveTab);


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
          전체 공정 ({items.length})
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
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-extrabold">
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
                  <p className="text-xs text-slate-500 mt-0.5">{col.subtext}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white shadow-2xs text-slate-700">
                  {colItems.length}
                </span>
              </div>

              {/* Cards Container: Natural vertical growth so full page scrolls */}
              <div className="flex-1 p-[10.8px] space-y-[10.8px] min-h-[198px]">
                {/* Non-ToDo columns empty state */}
                {col.status !== "대기" && colItems.length === 0 && (
                  <div className="h-28 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
                    <span>진행 중인 작업 없음</span>
                  </div>
                )}

                {/* Task Cards List */}
                {colItems.map((task) => {
                  const targetDate = task.deliveryDate || task.dueDate;
                  const diffDays = getDaysUntil(targetDate, todayStr);
                  const isUrgent = task.status !== "시공완료" && (task.priority === "긴급" || (diffDays !== null && diffDays <= 3));
                  const urgencyLabel = diffDays !== null && diffDays < 0 ? `${Math.abs(diffDays)}일 지연` : task.priority === "긴급" ? "긴급" : diffDays === 0 ? "오늘" : `D-${diffDays}`;
                  const clientName = task.clientName?.trim();
                  const showClientName = clientName && !getWorkTitle(task).replace(/\s/g, "").includes(clientName.replace(/\s/g, ""));
                  const hasPdf = task.attachments?.some((a) => a.fileType === "pdf");

                  return (
                    <React.Fragment key={task.id}>
                      <div
                        className={cn(
                          "min-w-0 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer group flex flex-col gap-2.5 relative"
                        )}
                        style={{ zoom: 0.9 }}
                        onClick={() => setSelectedTask(task)}
                      >
                        {/* Quick Process Step Transition Button */}
                        <div
                          className="absolute right-3 top-3 z-10 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {col.status === "대기" && (
                            <button
                              type="button"
                              title="오피스 인계"
                              aria-label="오피스 인계"
                              onClick={() => {
                                if (user?.name) {
                                  updateWorkItem(task.id, {
                                    status: "오피스",
                                    progress: 40,
                                    assignee: user.name,
                                    drawingAssignee: user.name,
                                  });
                                } else {
                                  advanceWorkStatus(task.id);
                                }
                              }}
                              className="p-1 rounded-md bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition cursor-pointer"
                            >
                              <span className="sr-only">오피스 인계</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {col.status === "오피스" && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateWorkItem(task.id, { status: "대기", progress: 10 })
                                }
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                title="대기로 되돌리기"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="공장 인계"
                                aria-label="공장 인계"
                                onClick={() => advanceWorkStatus(task.id)}
                                className="p-1 rounded-md bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition cursor-pointer"
                              >
                                <span className="sr-only">공장 인계</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {col.status === "공장" && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateWorkItem(task.id, { status: "오피스", progress: 40 })
                                }
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                title="오피스로 되돌리기"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="준비완료 처리"
                                aria-label="준비완료 처리"
                                onClick={() => advanceWorkStatus(task.id)}
                                className="p-1 rounded-md bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition cursor-pointer"
                              >
                                <span className="sr-only">준비완료 처리</span>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {col.status === "준비완료" && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateWorkItem(task.id, { status: "시공완료", progress: 100 })
                                }
                                className="p-1 rounded-md bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition cursor-pointer"
                                title={`${workStatusLabel(task, "시공완료")} 처리`}
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                <span className="sr-only">{workStatusLabel(task, "시공완료")} 처리</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateWorkItem(task.id, { status: "공장", progress: 75 })
                                }
                                className="p-1 rounded-md bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition cursor-pointer"
                              >
                                <ArrowLeft className="w-3 h-3" />
                                <span className="sr-only">공장으로 되돌리기</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Keep the title clear of the compact handoff controls. */}
                        <h5 className="pr-14 text-[15px] font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]">
                          <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedTask(task); }} className="block w-full text-left cursor-pointer hover:text-blue-600" title={task.title}>
                            <span className="line-clamp-2">{getWorkTitle(task)}</span>
                          </button>
                        </h5>
                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
                          <button
                            type="button"
                            disabled={savingConfirmation !== null}
                            aria-label={task.confirmationCompleted ? "컨펌완료, 클릭하여 컨펌중으로 변경" : task.confirmationPending ? "컨펌중, 클릭하여 컨펌 완료 처리" : "컨펌중으로 변경"}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (task.confirmationPending && !window.confirm("컨펌 완료 처리할까요?")) return;
                              void changeConfirmation(task);
                            }}
                            className={cn("inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold cursor-pointer disabled:opacity-50",
                              task.confirmationCompleted ? "border-emerald-300 bg-emerald-100 text-emerald-800" : task.confirmationPending ? "border-amber-300 bg-amber-100 text-amber-800" : "border-slate-200 bg-slate-100 text-slate-500")}
                          >
                            {task.confirmationCompleted ? <CheckCircle2 className="h-3 w-3" /> : <span className={cn("h-1.5 w-1.5 rounded-full", task.confirmationPending ? "bg-amber-500" : "bg-slate-300")} />}
                            {task.confirmationCompleted ? "컨펌완료" : "컨펌중"}
                          </button>
                          {showClientName && <><Building className="h-3.5 w-3.5 shrink-0" /><span className="truncate" title={clientName}>{clientName}</span></>}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                          {[task.cardType, task.category].filter((label, index, labels) => label && labels.indexOf(label) === index).map((label) => (
                            <span key={label} className="rounded bg-slate-100 px-1.5 py-0.5 whitespace-nowrap">{label}</span>
                          ))}
                          {!!task.attachments?.length && (
                            <span className="ml-auto flex items-center gap-1 whitespace-nowrap" title={`첨부파일 ${task.attachments.length}개${hasPdf ? " · PDF 포함" : ""}`}>
                              <Paperclip className="h-3 w-3" />{task.attachments.length}{hasPdf && <span className="text-rose-600">PDF</span>}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {task.deadlineType || "마감"} {targetDate ? targetDate.substring(5) : "미정"}
                          </span>
                          {isUrgent && <span className="rounded bg-rose-50 px-1.5 font-semibold text-rose-700 whitespace-nowrap">{urgencyLabel}</span>}
                          <span className="ml-auto flex min-w-0 items-center gap-1 text-slate-500" title={task.assignee || "담당 미정"}>
                            <User className="h-3 w-3 shrink-0" /><span className="truncate max-w-[10rem]">{task.assignee || "담당 미정"}</span>
                          </span>
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
                              <details>
                                <summary className={cn("cursor-pointer text-xs rounded-md px-2 py-1.5", isAllOrdered ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>
                                  <span className="inline-flex items-center gap-1"><Box className="h-3.5 w-3.5" />자재 발주 {completed}/{total}{isAllOrdered ? " 완료" : ` · ${total - completed}건 남음`}</span>
                                </summary>
                                <div className="mt-2 space-y-1">
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
                                      "w-full text-left p-1.5 rounded-md border text-xs font-semibold flex items-center justify-between transition cursor-pointer group/item",
                                      mo.isOrdered
                                        ? "bg-slate-50 border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200"
                                        : "bg-amber-50/80 border-amber-200 text-amber-950 font-bold hover:bg-rose-100"
                                    )}
                                    title={mo.isOrdered ? "클릭시 미발주 처리" : "클릭시 발주 완료 처리"}
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <span
                                        className={cn(
                                          "w-3.5 h-3.5 rounded flex items-center justify-center text-xs font-bold shrink-0 border",
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
                                        "text-xs px-1 py-0.2 rounded shrink-0 font-extrabold",
                                        mo.isOrdered
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-rose-500 text-white"
                                      )}
                                    >
                                      {mo.isOrdered ? "완료" : "미발주"}
                                    </span>
                                  </button>
                                ))}
                              </div></details>
                            </div>
                          );
                        })()}


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
