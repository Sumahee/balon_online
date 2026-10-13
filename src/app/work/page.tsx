"use client";


import React, { useState } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  User,
  Sliders} from "lucide-react";
import { useData } from "@/context/DataContext";
import { WorkItem, Priority, WorkStatus, MaterialOrderItem, POST_BAR_COLORS } from "@/types";
import { cn } from "@/lib/utils";
import { WorkOverview } from "@/components/dashboard/WorkOverview";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { MaterialOrderManager } from "@/components/dashboard/MaterialOrderManager";
import { getMaterialOrders } from "@/lib/materialUtils";
import { TaskDetailModal } from "@/components/dashboard/TaskDetailModal";

import { getWorkTitle } from "@/lib/work-title";
import { BulkSelectionBar, useBulkSelection } from "@/components/common/BulkSelection";

export default function WorkBoardPage() {
  const { workItems, updateWorkItem, deleteWorkItem, advanceWorkStatus, setQuickModalType, isSaving } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("전체");
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [viewMode, setViewMode] = useState<"kanban" | "table" | "card">("table");

  // Detail Modal & Edit Modal state
  const [selectedTask, setSelectedTask] = useState<WorkItem | null>(null);
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);

  // Filter items
  const filteredItems = workItems.filter((item) => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const matchesSearch = [item.title, item.assignee, item.clientName, item.siteAddress, item.region, item.category]
      .some((value) => (value || "").toLocaleLowerCase().includes(query));

    const matchesStatus = selectedStatus === "전체" || item.status === selectedStatus;
    const matchesCategory = selectedCategory === "전체" || (item.category || "") === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const selection = useBulkSelection(filteredItems.map(item => item.id), deleteWorkItem);
  const mobileItems = workItems.filter(item => [getWorkTitle(item), item.clientName, item.siteAddress, item.region, item.assignee, item.category].some(value => (value || "").toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())));
  const mobileSelection = useBulkSelection(mobileItems.map(item => item.id), deleteWorkItem);
  const shortDate = (value?: string) => value?.match(/^\d{4}-(\d{2})-(\d{2})/)?.slice(1).map(Number).join(".") || "—";
  const shortStatus = (status: WorkStatus) => ({ 대기: "대기", 오피스: "사무", 공장: "제작", 준비완료: "준비", 시공완료: "완료" })[status];

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case "긴급":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "높음":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "보통":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "낮음":
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (status: WorkStatus) => {
    switch (status) {
      case "대기":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "오피스":
        return "bg-blue-50 text-blue-700 border-blue-300 font-bold";
      case "공장":
        return "bg-amber-50 text-amber-700 border-amber-300 font-bold";
      case "준비완료":
        return "bg-amber-50 text-amber-800 border-amber-300 font-bold";
      case "시공완료":
        return "bg-emerald-600 text-white border-emerald-700 font-extrabold shadow-2xs";
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      if (!editingItem) return;
      await updateWorkItem(editingItem.id, editingItem);
      setEditingItem(null);
    } catch {
      // DataContext displays the error; leave the form open for retry.
    }
  };

  return (
    <div className="work-board space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="min-w-0 text-xl sm:text-2xl font-bold tracking-tight text-slate-950">업무 게시판</h1>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" aria-label="업무 검색" aria-expanded={searchOpen} onClick={() => setSearchOpen(value => !value)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"><Search className="h-5 w-5" /></button>
          <button type="button" onClick={() => setQuickModalType("work")} className="action-primary !px-3 !text-xs sm:!text-sm"><Plus className="h-4 w-4" />새 업무 등록</button>
        </div>
      </div>
      {searchOpen && <input autoFocus type="search" aria-label="업무 검색어" placeholder="업무명, 업체, 현장 검색…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />}

      <section className="work-board-mobile space-y-3" aria-label="모바일 업무 목록">
        <details className="text-xs text-slate-600"><summary className="cursor-pointer">선택 삭제</summary><div className="pt-2"><BulkSelectionBar selection={mobileSelection} disabled={isSaving} /></div></details>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {mobileItems.length === 0 && <p className="p-6 text-center text-sm text-slate-500">{searchQuery.trim() ? "검색 결과가 없습니다." : "등록된 업무가 없습니다."}</p>}
          {mobileItems.map(item => <div key={item.id} className="flex items-center gap-2 px-3 py-3">
            <input type="checkbox" aria-label={`${getWorkTitle(item)} 선택`} checked={mobileSelection.selected.has(item.id)} disabled={mobileSelection.deleting} onChange={() => mobileSelection.toggle(item.id)} className="h-4 w-4 shrink-0" />
            <button type="button" onClick={() => setSelectedTask(item)} className="min-w-0 flex-1 text-left cursor-pointer">
              <span className="flex items-center gap-1.5 min-w-0 mb-1">
                <span className="truncate max-w-[65%] rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-900">{item.clientName || "협력사"}</span>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{item.category || "기타"}</span>
              </span>
              <span className="block break-words text-sm font-semibold leading-5 text-slate-900">{getWorkTitle(item)}</span>
            </button>
            <button type="button" onClick={() => setSelectedTask(item)} aria-label={`${getWorkTitle(item)} 일정과 상태 상세보기`} className="shrink-0 w-16 text-right cursor-pointer">
              <span className="block mb-1 text-xs tabular-nums text-slate-600">{shortDate(item.deliveryDate || item.dueDate)}</span>
              <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border", getStatusBadge(item.status))}>{shortStatus(item.status)}</span>
            </button>
          </div>)}
        </div>
      </section>

      <div className="work-board-desktop space-y-6">

      {/* Filter and Search Bar */}
      <div className="filter-panel space-y-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="업무명, 업체, 현장주소, 담당자 검색…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters and View mode switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            {["전체", "대기", "오피스", "공장", "준비완료", "시공완료"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={cn(
                  "px-3 py-2 rounded-md transition cursor-pointer",
                  selectedStatus === st ? "bg-white text-slate-900 font-bold shadow-2xs" : "hover:text-slate-900"
                )}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="전체">모든 구분</option>
            <option value="제작">제작</option>
            <option value="실측">실측</option>
            <option value="시공">시공</option>
            <option value="설계">설계</option>
            <option value="납품">납품</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "px-3 py-2 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold",
                viewMode === "kanban" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
              title="칸반 투두 보드로 보기" aria-pressed={viewMode === "kanban"}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>칸반</span>
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={cn(
                "px-3 py-2 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold",
                viewMode === "card" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
              title="카드로 보기" aria-pressed={viewMode === "card"}
            >
              <Sliders className="w-4 h-4" />
              <span>카드</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-2 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold",
                viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
              title="표로 보기" aria-pressed={viewMode === "table"}
            >
              <List className="w-4 h-4" />
              <span>리스트</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="space-y-3">
          <KanbanBoard items={filteredItems} showCompleted={selectedStatus === "시공완료"} />
        </div>
      )}

      {/* Table View */}
      <BulkSelectionBar selection={selection} disabled={isSaving} />
      <p className="text-sm text-slate-600">전체 {workItems.length}건 · 현재 {filteredItems.length}건 표시</p>

      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500 md:hidden">표를 좌우로 밀어 담당자와 일정을 확인하세요.</p>
          <div className="overflow-x-auto">
            <table aria-label="업무 목록" className="data-table min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-3.5 px-4">선택</th>
                  <th className="py-3.5 px-4">구분</th>
                  <th className="py-3.5 px-4 min-w-[220px]">업무 / 프로젝트명</th>
                  <th className="py-3.5 px-4">담당자</th>
                  <th className="py-3.5 px-4">우선순위</th>
                  <th className="py-3.5 px-4">일정 (시작~마감)</th>
                  <th className="py-3.5 px-4">상태</th>
                  <th className="py-3.5 px-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      검색 조건에 맞는 업무가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedTask(item)}
                      className="hover:bg-blue-50/50 transition group cursor-pointer"
                    >
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`${getWorkTitle(item)} 선택`} checked={selection.selected.has(item.id)} disabled={selection.deleting} onChange={() => selection.toggle(item.id)} /></td>
                      <td className="py-3 px-4">
                        <span className="text-xs whitespace-nowrap font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-extrabold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {item.clientName || "협력사"}
                          </span>
                        </div>
                        <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedTask(item); }} className="block text-left font-semibold text-slate-900 hover:text-blue-700 hover:underline">
                          {getWorkTitle(item)}
                        </button>

                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.assignee}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "text-xs whitespace-nowrap font-bold px-2 py-0.5 rounded border",
                            getPriorityBadge(item.priority)
                          )}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-xs font-mono whitespace-nowrap">
                        <div className="text-slate-500">시작 {item.startDate}</div><div className="mt-1 font-semibold text-slate-800">마감 {item.deliveryDate || item.dueDate}</div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            advanceWorkStatus(item.id);
                          }}
                          className={cn(
                            "text-xs whitespace-nowrap px-2.5 py-0.5 rounded-full border transition hover:opacity-80 cursor-pointer",
                            getStatusBadge(item.status)
                          )}
                          title="클릭하여 상태 변경"
                        >
                          {item.status} ↻
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`'${getWorkTitle(item)}' 업무를 삭제하시겠습니까?`)) {
                                deleteWorkItem(item.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card Grid View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedTask(item)}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-400 transition space-y-3 flex flex-col justify-between cursor-pointer group"
            >
              <label onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-xs"><input type="checkbox" aria-label={`${getWorkTitle(item)} 선택`} checked={selection.selected.has(item.id)} disabled={selection.deleting} onChange={() => selection.toggle(item.id)} />선택</label>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs whitespace-nowrap font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {item.category}
                  </span>
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap font-bold px-2 py-0.5 rounded border",
                      getPriorityBadge(item.priority)
                    )}
                  >
                    {item.priority}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
                  {getWorkTitle(item)}
                </h3>
                {item.notes && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                    &quot;{item.notes}&quot;
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {item.assignee}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {item.startDate} ~ {item.dueDate}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      advanceWorkStatus(item.id);
                    }}
                    className={cn(
                      "text-xs px-3 py-1 rounded-lg border font-bold cursor-pointer transition",
                      getStatusBadge(item.status)
                    )}
                  >
                    상태: {item.status} ↻
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("정말 삭제하시겠습니까?")) deleteWorkItem(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <details className="summary-disclosure">
        <summary>오늘 확인할 업무</summary>
        <div className="pt-4"><WorkOverview /></div>
      </details>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl sm:max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-base text-slate-900">업무 상세 정보 수정</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                {/* 업체명 & 현장 주소/지역 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">업체명</label>
                    <input
                      type="text"
                      required
                      value={editingItem.clientName}
                      onChange={(e) => setEditingItem({ ...editingItem, clientName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">현장 주소 / 세부 지역</label>
                    <input
                      type="text"
                      placeholder="예: 서초동 팬트리, 반포동 104동"
                      value={editingItem.siteAddress || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, siteAddress: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">프로젝트 전체 명칭 (카드 표기명)</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">상태</label>
                    <select
                      value={editingItem.status}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          status: e.target.value as WorkStatus,
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                    >
                      <option value="대기">대기</option>
                      <option value="오피스">오피스</option>
                      <option value="공장">공장</option>
                      <option value="준비완료">준비완료</option>
                      <option value="시공완료">🏗️ 시공완료 (목록 보관)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">시공일 (마감일)</label>
                    <input
                      type="date"
                      value={editingItem.deliveryDate || editingItem.dueDate}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          deliveryDate: e.target.value,
                          dueDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">우선순위</label>
                    <select
                      value={editingItem.priority}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          priority: e.target.value as Priority,
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                    >
                      <option value="긴급">긴급</option>
                      <option value="높음">높음</option>
                      <option value="보통">보통</option>
                      <option value="낮음">낮음</option>
                    </select>
                  </div>
                </div>

                {/* 🎨 도면 연동 사양 (현장 담당자 연락처, 포스트바, 합판컬러, 도면담당자) */}

                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                  <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <span>🎨 도면 프로그램 연동 상세 사양</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        업체 현장 담당자 연락처 <span className="text-indigo-600 font-normal">(도면 전송용)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="예: 010-1234-5678"
                        value={editingItem.siteContactPhone || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, siteContactPhone: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">도면 담당자</label>
                      <input
                        type="text"
                        value={editingItem.drawingAssignee || editingItem.assignee}
                        onChange={(e) => setEditingItem({ ...editingItem, drawingAssignee: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg font-bold text-indigo-950"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">포스트바 컬러</label>
                      <select
                        value={editingItem.postColor || "11 다크그레이"}
                        onChange={(e) => setEditingItem({ ...editingItem, postColor: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold bg-white"
                      >
                        {POST_BAR_COLORS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">합판 컬러 (종류)</label>
                      <input
                        type="text"
                        placeholder="예: PET 18T 화이트..."
                        value={editingItem.boardColor || "PET 18T 화이트"}
                        onChange={(e) => setEditingItem({ ...editingItem, boardColor: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                  </div>
                </div>


                {/* Material Order Section */}
                <MaterialOrderManager
                  orders={getMaterialOrders(editingItem)}
                  onChange={(updated: MaterialOrderItem[]) => {
                    const allDone = updated.length > 0 && updated.every((o: MaterialOrderItem) => o.isOrdered);
                    setEditingItem({
                      ...editingItem,
                      materialOrders: updated,
                      materialOrderNeeded: updated.map((o: MaterialOrderItem) => o.name).join(", "),
                      materialOrderStatus: updated.length === 0 ? "발주불필요" : allDone ? "발주완료" : "발주필요",
                    });
                  }}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">작업 비고 / 메모</label>
                  <textarea
                    rows={3}
                    value={editingItem.notes || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0 sticky bottom-0 z-10 shadow-md">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit" disabled={isSaving} aria-busy={isSaving}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-700 shadow-md transition cursor-pointer"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          item={workItems.find((i) => i.id === selectedTask.id) || selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
