"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { WorkEditorModal } from "@/components/common/WorkEditorModal";

import { getToday } from "@/lib/date";

import { MobileMonthCalendar } from "@/components/calendar/MobileMonthCalendar";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";
import { AsItem,WorkItem } from "@/types";
import {
ChevronLeft,
ChevronRight,
MapPin,
Plus,
Search,
Sparkles
} from "lucide-react";
import dynamic from "next/dynamic";
import React,{ useMemo,useState } from "react";
const CalendarDetailModal=dynamic(()=>import("@/components/dashboard/TaskDetailModal").then(module=>module.TaskDetailModal),{ssr:false});

import { isCalendarVisible } from "@/lib/calendar-visibility";
import { useHolidays } from "@/lib/use-holidays";
import { getWorkTitle } from "@/lib/work-title";

const REGIONS = ["전체", "반포", "일산", "서초", "한남", "성수", "판교", "분당"];

const getCalendarCardLabel = getWorkTitle;

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
  const { workItems, asItems, loadWorkList } = useData();

  const [currentDate, setCurrentDate] = useState(new Date(`${getToday()}T00:00:00`));
  const holidays=useHolidays(currentDate.getFullYear());
  React.useEffect(() => {
    if(!loadWorkList) return;
    let active = true;
    const year=currentDate.getFullYear(), month=currentDate.getMonth();
    const format=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const start=new Date(year,month,1); start.setDate(1-start.getDay());
    const end=new Date(start); end.setDate(start.getDate()+41);
    void (async()=>{let offset=0,more=true;while(active && more){more=await loadWorkList(new URLSearchParams({mode:"calendar",from:format(start),to:format(end),limit:"100",offset:String(offset)}).toString(),offset>0);offset+=100;}})().catch(()=>{});
    return()=>{active=false;};
  },[currentDate,loadWorkList]);
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected item for Detail Modal
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [selectedAsItem, setSelectedAsItem] = useState<AsItem | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // New item modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDate, setNewDate] = useState(getToday());

  // Filtered work & A/S items for Calendar
  const filteredEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    (workItems || []).forEach((item) => {
      if (!item) return;
      if (!isCalendarVisible(item)) return;
      const title = getWorkTitle(item);
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

    return events;
  }, [workItems, asItems, selectedRegion, searchQuery]);

  // Calendar days for the selected month
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

  return (
    <div className="space-y-6 pb-12">
      <MobileMonthCalendar key={`${currentDate.getFullYear()}-${currentDate.getMonth()}`} year={currentDate.getFullYear()} month={currentDate.getMonth()} days={calendarDays} events={filteredEvents} regions={REGIONS} region={selectedRegion} search={searchQuery} onRegion={setSelectedRegion} onSearch={setSearchQuery} onPrevious={handlePrevMonth} onNext={handleNextMonth} onToday={()=>setCurrentDate(new Date(`${getToday()}T00:00:00`))} onAdd={date=>{if(date)setNewDate(date);setIsAddModalOpen(true);}} onOpen={event=>{const original=filteredEvents.find(value=>value.id===event.id && value.type===event.type);if(original?.originalWorkItem)setSelectedItem(original.originalWorkItem);if(original?.originalAsItem)setSelectedAsItem(original.originalAsItem);}} />
      <div className="hidden lg:block space-y-6">
      <PageHeader title="일정 관리" description="시공·배송·요청 일정을 확인하고 현장별 업무를 열어보세요." actions={<button onClick={() => {setNewDate(getToday());setIsAddModalOpen(true);}} className="action-primary"><Plus className="h-4 w-4" />일정 추가</button>} />

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
            onClick={() => setCurrentDate(new Date(`${getToday()}T00:00:00`))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            오늘
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
                  aria-current={day.dateStr === getToday() ? "date" : undefined}
                  onClick={handleCellClick}
                  className={cn(
                    "min-h-[95px] sm:min-h-[150px] lg:min-h-[180px] xl:min-h-[200px] p-1 sm:p-2.5 flex flex-col justify-between transition group hover:bg-blue-50/40 cursor-pointer relative select-none",
                    day.dateStr === getToday() ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : day.isCurrentMonth ? "bg-white" : "bg-slate-50/70 text-slate-400"
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

                  {/* Day Event List Cards (Work & A/S - 1줄 콤팩트 스타일) */}
                  <div className="flex-1 space-y-1">
                    {holidays[day.dateStr] && <div title={holidays[day.dateStr]} className="rounded-sm bg-red-700 px-2 py-1 text-[10px] font-bold text-white truncate">{holidays[day.dateStr]}</div>}
                    {dayEvents.slice(0, expandedDays.has(day.dateStr) ? undefined : 4).map((evt) => {
                      if (evt.type === "as" && evt.originalAsItem) {
                        const asItem = evt.originalAsItem;
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAsItem(asItem);
                            }}
                            className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-950 border-l-4 border-rose-500 transition cursor-pointer text-[11px] font-bold truncate shadow-2xs group/chip"
                            title={`[A/S] ${asItem.clientName} - ${asItem.reason}`}
                          >
                            <span className="text-[10px] font-extrabold px-1 py-0.2 rounded bg-rose-600 text-white shrink-0">
                              🛠️ A/S
                            </span>
                            <span className="truncate font-bold">
                              {asItem.clientName}, {asItem.siteAddress.split(" ")[0] || "현장"}
                            </span>
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
                              "flex items-center justify-between gap-1 px-1.5 py-1 rounded transition cursor-pointer text-[11px] font-bold truncate shadow-2xs border-l-4 group/chip",
                              isCompleted
                                ? "bg-blue-50/90 hover:bg-blue-100 text-blue-950 border-blue-600 font-bold"
                                : "bg-emerald-50/80 hover:bg-emerald-100 text-slate-900 border-emerald-500 font-bold"
                            )}
                            title={`[${dType}] ${label}`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <span
                                className={cn(
                                  "inline-flex h-4 w-4 items-center justify-center text-[9px] rounded-full font-extrabold shrink-0 text-white",
                                  dType === "천정형"
                                    ? "bg-emerald-600"
                                    : dType === "에보라"
                                    ? "bg-fuchsia-700"
                                    : dType === "옴니버스"
                                    ? "bg-purple-600"
                                    : "bg-slate-600"
                                )}
                              >
                                {dType.slice(0,1)}
                              </span>
                              <span className="truncate font-bold">{label}</span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                    {dayEvents.length > 4 && <button type="button" aria-expanded={expandedDays.has(day.dateStr)} onClick={e => { e.stopPropagation(); setExpandedDays(prev => { const next = new Set(prev); if (next.has(day.dateStr)) next.delete(day.dateStr); else next.add(day.dateStr); return next; }); }} className="w-full py-1.5 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 rounded cursor-pointer">{expandedDays.has(day.dateStr) ? "접기" : `더보기... (+${dayEvents.length - 4}건)`}</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW SCHEDULE EVENT MODAL */}
      </div>
      {isAddModalOpen && <WorkEditorModal initialDate={newDate} onClose={() => setIsAddModalOpen(false)} />}

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
