"use client";

import React, { useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { WorkItem, Priority, WorkStatus, MaterialOrderItem } from "@/types";
import { cn } from "@/lib/utils";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { MaterialOrderManager } from "@/components/dashboard/MaterialOrderManager";
import { getMaterialOrders } from "@/lib/materialUtils";
import { TaskDetailModal } from "@/components/dashboard/TaskDetailModal";

export default function WorkBoardPage() {
  const { workItems, updateWorkItem, deleteWorkItem, advanceWorkStatus, setQuickModalType } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("전체");
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [viewMode, setViewMode] = useState<"kanban" | "table" | "card">("kanban");

  // Detail Modal & Edit Modal state
  const [selectedTask, setSelectedTask] = useState<WorkItem | null>(null);
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);

  // Filter items
  const filteredItems = workItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === "전체" || item.status === selectedStatus;
    const matchesCategory = selectedCategory === "전체" || (item.category || "") === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

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

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateWorkItem(editingItem.id, editingItem);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            <span>업무 관리 게시판 (Work Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            제작, 실측, 시공, 설계 등 모든 프로젝트 업무를 등록하고 진척도를 실시간 추적합니다.
          </p>
        </div>

        <button
          onClick={() => setQuickModalType("work")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>신규 업무 등록</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="업무명, 담당자, 카테고리 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters and View mode switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            {["전체", "대기", "오피스", "공장", "준비완료", "시공완료"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition cursor-pointer",
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
                "px-2.5 py-1.5 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold",
                viewMode === "kanban" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
              title="칸반 투두 보드로 보기"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>칸반 투두 보드</span>
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={cn(
                "px-2.5 py-1.5 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold",
                viewMode === "card" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
              title="카드로 보기"
            >
              <Sliders className="w-4 h-4" />
              <span>카드 갤러리</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "px-2.5 py-1.5 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold",
                viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
              title="표로 보기"
            >
              <List className="w-4 h-4" />
              <span>리스트 표</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="space-y-3">
          <KanbanBoard items={filteredItems} />
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
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
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
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
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-extrabold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {item.clientName || "협력사"}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {item.title}
                        </div>
                        {item.deliveryDate && (
                          <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                            시공/배송: {item.deliveryDate}
                          </div>
                        )}
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
                            "text-[10px] font-bold px-2 py-0.5 rounded border",
                            getPriorityBadge(item.priority)
                          )}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px] font-mono whitespace-nowrap">
                        <div>{item.startDate} ~ {item.dueDate}</div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            advanceWorkStatus(item.id);
                          }}
                          className={cn(
                            "text-[11px] px-2.5 py-0.5 rounded-full border transition hover:opacity-80 cursor-pointer",
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
                              if (confirm(`'${item.title}' 업무를 삭제하시겠습니까?`)) {
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {item.category}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded border",
                      getPriorityBadge(item.priority)
                    )}
                  >
                    {item.priority}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
                  {item.title}
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
                  <span className="text-[11px] font-mono text-slate-400">
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
                      <input
                        type="text"
                        placeholder="예: 흑니켈, 실버, 골드..."
                        value={editingItem.postColor || "흑니켈"}
                        onChange={(e) => setEditingItem({ ...editingItem, postColor: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
                      />
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
                  type="submit"
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
