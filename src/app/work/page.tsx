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
import { WorkItem, Priority, WorkStatus } from "@/types";
import { cn } from "@/lib/utils";

export default function WorkBoardPage() {
  const { workItems, updateWorkItem, deleteWorkItem, advanceWorkStatus, setQuickModalType } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("전체");
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Edit Modal state
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);

  // Filter items
  const filteredItems = workItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === "전체" || item.status === selectedStatus;
    const matchesCategory = selectedCategory === "전체" || item.category === selectedCategory;

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
        return "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold";
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
            {["전체", "대기", "오피스", "공장", "준비완료"].map((st) => (
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
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded transition cursor-pointer",
                viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
              title="표로 보기"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={cn(
                "p-1.5 rounded transition cursor-pointer",
                viewMode === "card" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
              title="카드로 보기"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" ? (
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
                  <th className="py-3.5 px-4 min-w-[140px]">진척률</th>
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
                    <tr key={item.id} className="hover:bg-slate-50/70 transition group">
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
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                item.status === "준비완료"
                                  ? "bg-emerald-500"
                                  : item.status === "공장"
                                  ? "bg-amber-500"
                                  : item.status === "오피스"
                                  ? "bg-blue-600"
                                  : "bg-slate-400"
                              )}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                            {item.progress}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => advanceWorkStatus(item.id)}
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
                            onClick={() => setEditingItem(item)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
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
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
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

                <h3 className="font-bold text-sm text-slate-900 line-clamp-2">{item.title}</h3>
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

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>진척률</span>
                    <span className="font-bold text-slate-800">{item.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        item.status === "준비완료"
                          ? "bg-emerald-500"
                          : item.status === "공장"
                          ? "bg-amber-500"
                          : item.status === "오피스"
                          ? "bg-blue-600"
                          : "bg-slate-400"
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => advanceWorkStatus(item.id)}
                    className={cn(
                      "text-xs px-3 py-1 rounded-lg border font-bold cursor-pointer transition",
                      getStatusBadge(item.status)
                    )}
                  >
                    상태: {item.status} ↻
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900">업무 상세 정보 수정</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">업무 / 프로젝트명</label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">구분</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        category: e.target.value as WorkItem["category"],
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="제작">제작</option>
                    <option value="실측">실측</option>
                    <option value="시공">시공</option>
                    <option value="설계">설계</option>
                    <option value="납품">납품</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당자</label>
                  <input
                    type="text"
                    required
                    value={editingItem.assignee}
                    onChange={(e) => setEditingItem({ ...editingItem, assignee: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="대기">대기</option>
                    <option value="오피스">오피스</option>
                    <option value="공장">공장</option>
                    <option value="준비완료">준비완료</option>
                  </select>
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
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="긴급">긴급</option>
                    <option value="높음">높음</option>
                    <option value="보통">보통</option>
                    <option value="낮음">낮음</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>공정 진척도: {editingItem.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editingItem.progress}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, progress: Number(e.target.value) })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={editingItem.startDate}
                    onChange={(e) => setEditingItem({ ...editingItem, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">마감일</label>
                  <input
                    type="date"
                    value={editingItem.dueDate}
                    onChange={(e) => setEditingItem({ ...editingItem, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">작업 비고 / 메모</label>
                <textarea
                  rows={3}
                  value={editingItem.notes || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
