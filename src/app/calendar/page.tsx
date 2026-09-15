"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Layers,
  Sparkles,
  Camera,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { WorkItem, AsItem, AttachmentItem, ClientInfo, DrawingType } from "@/types";
import { cn } from "@/lib/utils";
import { CalendarDetailModal } from "@/components/calendar/CalendarDetailModal";
import { UnifiedBoardEditor } from "@/components/common/UnifiedBoardEditor";

const REGIONS = ["전체", "반포", "일산", "서초", "한남", "성수", "판교", "분당"];

// Helper to extract clean vendor name & ~동 / ~구 location
function getCalendarCardLabel(item: WorkItem) {
  const rawClient = item?.clientName || "(주)바론 협력사";
  const cleanClient =
    rawClient.replace(/\(주\)/g, "").replace(/인테리어/g, "").trim() || rawClient;

  let location = "";
  const fullStr = `${item?.siteAddress || ""} ${item?.title || ""}`;
  const match = fullStr.match(/([가-힣]{2,8}(?:동|구))/);
  if (match && match[1]) {
    location = match[1];
  } else if (item?.region) {
    location = item.region.endsWith("동") || item.region.endsWith("구") ? item.region : `${item.region}동`;
  } else {
    location = "서초동";
  }

  return `${cleanClient}, ${location}`;
}

// Helper to get Drawing Type
function getDrawingType(item: WorkItem): "천정형" | "에보라" | "옴니버스" | "기타" {
  if (item?.drawingType) return item.drawingType;
  const title = item?.title || "";
  if (title.includes("천정형")) return "천정형";
  if (title.includes("에보라")) return "에보라";
  if (title.includes("옴니버스")) return "옴니버스";
  return "천정형";
}

// Helper to render Drawing Type badge: 천정형(초록), 에보라(자주), 옴니버스(보라)
function renderDrawingTypeBadge(type: string) {
  switch (type) {
    case "천정형":
      return (
        <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold shadow-2xs shrink-0">
          천정형
        </span>
      );
    case "에보라":
      return (
        <span className="px-1.5 py-0.5 rounded bg-fuchsia-700 text-white text-[9px] font-extrabold shadow-2xs shrink-0">
          에보라
        </span>
      );
    case "옴니버스":
      return (
        <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-extrabold shadow-2xs shrink-0">
          옴니버스
        </span>
      );
    default:
      return (
        <span className="px-1.5 py-0.5 rounded bg-slate-500 text-white text-[9px] font-extrabold shadow-2xs shrink-0">
          {type || "기타"}
        </span>
      );
  }
}

interface CalendarEvent {
  id: string;
  type: "work" | "as";
  dateStr: string;
  clientName: string;
  title: string;
  location: string;
  drawingType?: string;
  status: string;
  priority: string;
  originalWorkItem?: WorkItem;
  originalAsItem?: AsItem;
}

export default function CalendarPage() {
  const { workItems, asItems, addWorkItem } = useData();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)); // 2026-09
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected item for Detail Modal
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [selectedAsItem, setSelectedAsItem] = useState<AsItem | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // New item modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [newRegion, setNewRegion] = useState("반포");
  const [newDate, setNewDate] = useState("2026-09-15");
  const [newDrawingType, setNewDrawingType] = useState<DrawingType>("옴니버스");
  const [newDeadlineType, setNewDeadlineType] = useState<"시공일" | "배송일" | "요청일">("시공일");
  const [newCategory, setNewCategory] = useState<"제작" | "실측" | "시공" | "설계" | "납품" | "기타">("시공");
  const [newDescription, setNewDescription] = useState("");
  const [newAttachments, setNewAttachments] = useState<AttachmentItem[]>([]);
  const [clientsList, setClientsList] = useState<ClientInfo[]>([]);

  // Load live clients list from shared DB (READ-ONLY)
  React.useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.clients)) {
          setClientsList(data.clients);
          if (!newClient && data.clients.length > 0) {
            setNewClient(data.clients[0].name);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Filtered work & A/S items for Calendar
  const filteredEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    (workItems || []).forEach((item) => {
      if (!item) return;
      const title = item.title || "";
      const clientName = item.clientName || "";
      const region = item.region || "";

      const matchRegion =
        selectedRegion === "전체" || region === selectedRegion || title.includes(selectedRegion);
      const matchQuery =
        !searchQuery.trim() ||
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        region.includes(searchQuery);

      if (matchRegion && matchQuery) {
        events.push({
          id: item.id,
          type: "work",
          dateStr: item.deliveryDate || item.dueDate,
          clientName,
          title,
          location: getCalendarCardLabel(item),
          drawingType: getDrawingType(item),
          status: item.status,
          priority: item.priority,
          originalWorkItem: item,
        });
      }
    });

    (asItems || []).forEach((as) => {
      if (!as) return;
      const clientName = as.clientName || "";
      const siteAddress = as.siteAddress || "";

      const matchRegion =
        selectedRegion === "전체" || siteAddress.includes(selectedRegion);
      const matchQuery =
        !searchQuery.trim() ||
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        siteAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        as.reason.toLowerCase().includes(searchQuery.toLowerCase());

      if (matchRegion && matchQuery) {
        events.push({
          id: as.id,
          type: "as",
          dateStr: as.asDate || as.constructDate,
          clientName,
          title: `[A/S] ${as.reason}`,
          location: `🛠️ ${clientName} A/S`,
          status: as.resultStatus,
          priority: as.priority,
          originalAsItem: as,
        });
      }
    });

    return events;
  }, [workItems, asItems, selectedRegion, searchQuery]);

  // Calendar Days calculation for 2026-09 (or active month)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week for 1st
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const pDay = prevMonthDays - i;
      const pMonth = month === 0 ? 12 : month;
      const pYear = month === 0 ? year - 1 : year;
      const dateStr = `${pYear}-${String(pMonth).padStart(2, "0")}-${String(pDay).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: pDay, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding days to complete 5 or 6 rows (multiple of 7)
    const remaining = 42 - days.length;
    for (let n = 1; n <= remaining; n++) {
      const nMonth = month === 11 ? 1 : month + 2;
      const nYear = month === 11 ? year + 1 : year;
      const dateStr = `${nYear}-${String(nMonth).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: n, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const safeClient = newClient.trim() || "(주)바론 협력업체";
    const todayStr = new Date().toISOString().split("T")[0];

    await addWorkItem({
      type: "work",
      title: newTitle.trim(),
      clientName: safeClient,
      siteAddress: newSiteAddress.trim(),
      region: newRegion,
      drawingType: newDrawingType,
      cardType: "도면",
      deadlineType: newDeadlineType,
      deliveryDate: newDate,
      category: newCategory,
      assignee: "김진우 실장",
      priority: "높음",
      status: "대기",
      progress: 0,
      startDate: todayStr,
      dueDate: newDate,
      notes: `${newRegion} 현장 ${newDeadlineType} 일정 등록`,
      description: newDescription,
      attachments: newAttachments,
    });

    setIsAddModalOpen(false);
    setNewTitle("");
    setNewSiteAddress("");
    setNewDescription("");
    setNewAttachments([]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">
                  바론 INT 통합 일정 관리 캘린더 (Schedule Flow)
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  현장/도면 연동
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                시공일, 배송일, 요청일 일정을 캘린더에서 한눈에 확인하고 완료 도면 및 시공 완성 사진을 공유합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>신규 일정 추가</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filters & Month Navigator */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 font-extrabold text-slate-900 text-base font-mono">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date(2026, 8, 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            오늘 (2026-09)
          </button>
        </div>

        {/* Region Filter Pills & Search */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <span className="font-bold text-slate-500 flex items-center gap-1 shrink-0 mr-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              지역:
            </span>
            {REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer",
                  selectedRegion === region
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {region}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="현장명/업체 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-40 focus:w-52 transition-all focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* CALENDAR STATUS & TYPE LEGEND BAR */}
      <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-slate-700">시공 상태 테두리:</span>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-3.5 h-3.5 rounded bg-lime-100 border-2 border-lime-400 inline-block" />
            <span className="text-slate-800">미시공 (연두색 테두리)</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-3.5 h-3.5 rounded bg-blue-100 border-2 border-blue-500 inline-block" />
            <span className="text-slate-800">시공완료 (파란색 테두리)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-extrabold text-slate-700">도면 타입 마크:</span>
          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-extrabold text-[10px]">
            천정형 (초록)
          </span>
          <span className="px-2 py-0.5 rounded bg-fuchsia-700 text-white font-extrabold text-[10px]">
            에보라 (자주)
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-extrabold text-[10px]">
            옴니버스 (보라)
          </span>
        </div>
      </div>

      {/* MONTH VIEW CALENDAR GRID */}
      {viewMode === "month" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center font-bold text-xs text-slate-600 py-3">
            <div className="text-rose-600">일 (Sun)</div>
            <div>월 (Mon)</div>
            <div>화 (Tue)</div>
            <div>수 (Wed)</div>
            <div>목 (Thu)</div>
            <div>금 (Fri)</div>
            <div className="text-blue-600">토 (Sat)</div>
          </div>

          {/* Calendar Grid (6 Rows x 7 Cols) */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 text-xs">
            {calendarDays.map((day, idx) => {
              // Find matching items for this date (Work items & A/S items)
              const dayEvents = filteredEvents.filter(
                (evt) => evt.dateStr === day.dateStr
              );

              const isSunday = idx % 7 === 0;
              const isSaturday = idx % 7 === 6;

              const handleCellClick = () => {
                setNewDate(day.dateStr);
                setIsAddModalOpen(true);
              };

              return (
                <div
                  key={idx}
                  onClick={handleCellClick}
                  className={cn(
                    "min-h-[140px] sm:min-h-[160px] lg:min-h-[180px] xl:min-h-[200px] p-2 sm:p-2.5 flex flex-col justify-between transition group hover:bg-blue-50/40 cursor-pointer relative select-none",
                    day.isCurrentMonth ? "bg-white" : "bg-slate-50/70 text-slate-400"
                  )}
                >
                  <div className="flex items-center justify-between font-mono font-bold mb-1">
                    <span
                      className={cn(
                        "text-xs sm:text-sm px-2 py-0.5 rounded-full flex items-center gap-1",
                        isSunday
                          ? "text-rose-600 font-extrabold"
                          : isSaturday
                          ? "text-blue-600 font-extrabold"
                          : "text-slate-700"
                      )}
                    >
                      {day.dayNum}일
                    </span>

                    {dayEvents.length > 0 && (
                      <span className="text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {dayEvents.length}건
                      </span>
                    )}
                  </div>

                  {/* Day Event List Cards (Work & A/S) */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-36 sm:max-h-44 lg:max-h-56 scrollbar-thin">
                    {dayEvents.map((evt) => {
                      if (evt.type === "as" && evt.originalAsItem) {
                        const asItem = evt.originalAsItem;
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAsItem(asItem);
                            }}
                            className="p-1.5 rounded-lg border-2 border-rose-400 bg-rose-50/90 text-rose-950 font-extrabold text-[11px] leading-tight cursor-pointer transition shadow-2xs hover:scale-[1.02] space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate text-xs font-black flex items-center gap-1 text-rose-900">
                                <span>🛠️</span>
                                <span className="truncate">{evt.clientName} A/S</span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black shrink-0">
                                {asItem.resultStatus}
                              </span>
                            </div>
                            <div className="text-[10px] text-rose-800 truncate font-semibold">
                              {asItem.reason}
                            </div>
                          </div>
                        );
                      }

                      if (evt.originalWorkItem) {
                        const item = evt.originalWorkItem;
                        const isCompleted = item.status === "시공완료";
                        const label = getCalendarCardLabel(item);
                        const dType = getDrawingType(item);

                        return (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg border-2 text-[11px] leading-tight cursor-pointer transition shadow-2xs hover:scale-[1.02] space-y-1",
                              isCompleted
                                ? "bg-blue-50/90 border-blue-500 text-blue-950 font-bold"
                                : "bg-lime-50/80 border-lime-400 text-slate-900 font-bold"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate text-xs font-black">{label}</span>
                              {renderDrawingTypeBadge(dType)}
                            </div>

                            <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium">
                              <span className="text-slate-600">[{item.deadlineType}]</span>
                              {item.comments && item.comments.length > 0 && (
                                <span className="text-amber-700 font-bold">💬 {item.comments.length}</span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW SCHEDULE EVENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span>신규 일정 및 업무 등록 (Schedule & Work Task)</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    프로젝트 제목 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="예: 반포자이 102동 주방 아일랜드 서랍장 시공"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    의뢰 업체명 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="calendar-clients-datalist"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    placeholder="업체명 선택 또는 직접 입력"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <datalist id="calendar-clients-datalist">
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">현장 상세 주소</label>
                  <input
                    type="text"
                    value={newSiteAddress}
                    onChange={(e) => setNewSiteAddress(e.target.value)}
                    placeholder="예: 서초구 반포동 128"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">시공/현장 지역</label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-700"
                  >
                    {REGIONS.filter((r) => r !== "전체").map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">도면 타입</label>
                  <div className="grid grid-cols-4 gap-1">
                    {(["천정형", "에보라", "옴니버스", "기타"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewDrawingType(t)}
                        className={cn(
                          "py-2 rounded-lg text-[11px] font-extrabold border transition cursor-pointer text-center",
                          newDrawingType === t
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">일정 날짜 (연 / 월 / 일 선택)</label>
                  {(() => {
                    const dateParts = (newDate || "2026-09-15").split("-");
                    const selYear = parseInt(dateParts[0]) || 2026;
                    const selMonth = parseInt(dateParts[1]) || 9;
                    const selDay = parseInt(dateParts[2]) || 15;

                    const YEARS_LIST = [2025, 2026, 2027, 2028, 2029, 2030];
                    const MONTHS_LIST = Array.from({ length: 12 }, (_, i) => i + 1);
                    const daysCount = new Date(selYear, selMonth, 0).getDate();
                    const DAYS_LIST = Array.from({ length: daysCount }, (_, i) => i + 1);

                    const handleDateSelectChange = (y: number, m: number, d: number) => {
                      const maxD = new Date(y, m, 0).getDate();
                      const safeD = Math.min(d, maxD);
                      setNewDate(`${y}-${String(m).padStart(2, "0")}-${String(safeD).padStart(2, "0")}`);
                    };

                    return (
                      <div className="grid grid-cols-3 gap-1">
                        <select
                          value={selYear}
                          onChange={(e) => handleDateSelectChange(parseInt(e.target.value), selMonth, selDay)}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                        >
                          {YEARS_LIST.map((y) => (
                            <option key={y} value={y}>
                              {y}년
                            </option>
                          ))}
                        </select>

                        <select
                          value={selMonth}
                          onChange={(e) => handleDateSelectChange(selYear, parseInt(e.target.value), selDay)}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700"
                        >
                          {MONTHS_LIST.map((m) => (
                            <option key={m} value={m}>
                              {String(m).padStart(2, "0")}월
                            </option>
                          ))}
                        </select>

                        <select
                          value={selDay}
                          onChange={(e) => handleDateSelectChange(selYear, selMonth, parseInt(e.target.value))}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700"
                        >
                          {DAYS_LIST.map((d) => (
                            <option key={d} value={d}>
                              {String(d).padStart(2, "0")}일
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">마감 구분</label>
                  <select
                    value={newDeadlineType}
                    onChange={(e) => setNewDeadlineType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="시공일">시공일</option>
                    <option value="배송일">배송일</option>
                    <option value="요청일">요청일</option>
                  </select>
                </div>
              </div>

              {/* UNIFIED BOARD EDITOR (텍스트 + 이미지 + 파일 통합) */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  작업 내용 및 첨부 도면/파일 <span className="text-slate-400 font-normal">(파일 드래그&드롭, 이미지 미리보기, PDF 즉시 열기)</span>
                </label>
                <UnifiedBoardEditor
                  description={newDescription}
                  onChangeDescription={setNewDescription}
                  attachments={newAttachments}
                  onChangeAttachments={setNewAttachments}
                  placeholder="작업 지시사항, 상세 사양, 현장 메모를 입력하세요... 파일이나 도면, 사진을 여기에 바로 끌어다 놓으시면 됩니다."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition"
                >
                  일정 추가 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedItem && (
        <CalendarDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* A/S EVENT DETAIL MODAL */}
      {selectedAsItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-600 text-white rounded-lg">🛠️</div>
                <h3 className="font-extrabold text-base text-slate-900">
                  [{selectedAsItem.clientName}] A/S 접수 및 조치 정보
                </h3>
              </div>
              <button
                onClick={() => setSelectedAsItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">시공/접수일</span>
                  <span className="font-bold text-slate-900">{selectedAsItem.constructDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">상태 / 우선도</span>
                  <span className="font-extrabold text-rose-600">[{selectedAsItem.resultStatus}] {selectedAsItem.priority}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">현장 주소</span>
                <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-semibold">{selectedAsItem.siteAddress}</p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">A/S 발생 사유</span>
                <p className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-950 font-medium leading-relaxed">
                  {selectedAsItem.reason}
                </p>
              </div>

              {selectedAsItem.resolutionDetails && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">조치 내용 및 결과</span>
                  <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed">
                    {selectedAsItem.resolutionDetails}
                  </p>
                </div>
              )}

              {/* 조치 결과 사진 갤러리 */}
              {((selectedAsItem.resultPhotos && selectedAsItem.resultPhotos.length > 0) || (selectedAsItem.images && selectedAsItem.images.length > 0)) && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1.5">📷 현장 조치 사진 ({(selectedAsItem.resultPhotos || selectedAsItem.images || []).length}장) - 클릭 시 크게 보기</span>
                  <div className="flex flex-wrap gap-2">
                    {(selectedAsItem.resultPhotos || selectedAsItem.images || []).map((imgUrl: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewPhotoUrl(imgUrl)}
                        className="w-20 h-20 rounded-xl border border-slate-200 overflow-hidden relative group cursor-pointer shadow-2xs hover:scale-105 transition"
                      >
                        <img
                          src={imgUrl}
                          alt={`조치사진 #${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedAsItem(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  확인 (닫기)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal for Calendar View */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={previewPhotoUrl}
              alt="조치 사진 크게 보기"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-slate-700"
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/90 text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
