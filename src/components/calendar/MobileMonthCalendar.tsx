"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getToday } from "@/lib/date";
import { useHolidays } from "@/lib/use-holidays";

interface Event {
  id: string; type: "work" | "as"; dateStr: string; clientName: string; title: string;
  location: string; drawingType?: string; status: string;
}
interface Props {
  year: number; month: number;
  days: {dateStr:string;dayNum:number;isCurrentMonth:boolean}[];
  events: Event[]; regions: string[]; region: string; search: string;
  onRegion: (value:string)=>void; onSearch:(value:string)=>void;
  onPrevious:()=>void; onNext:()=>void; onToday:()=>void;
  onPhoto?:(event:Event)=>void; onAdd:(date?:string)=>void; onOpen:(event:Event)=>void;
}

export function MobileMonthCalendar(props:Props) {
  const holidays=useHolidays(props.year);
  const [selected,setSelected]=useState<string | null>(null);
  const [compact,setCompact]=useState(false);
  const list=useRef<HTMLDivElement>(null);
  const sections=useRef(new Map<string,HTMLElement>());
  const prefix=`${props.year}-${String(props.month+1).padStart(2,"0")}-`;
  const groups=new Map<string,Event[]>();
  props.events.filter(event=>event.dateStr.startsWith(prefix)).forEach(event=>groups.set(event.dateStr,[...(groups.get(event.dateStr) ?? []),event]));
  if (selected && !groups.has(selected)) groups.set(selected,[]);
  const dates=[...groups.keys()].sort();
  useLayoutEffect(()=>{
    const target=selected ? sections.current.get(selected) : undefined;
    const viewport=list.current;
    if (target && viewport) viewport.scrollTo({top:viewport.scrollTop+target.getBoundingClientRect().top-viewport.getBoundingClientRect().top-8,behavior:"smooth"});
  },[selected]);
  return <>
    <div className="fixed inset-x-0 bottom-0 z-20 hidden portrait:flex lg:!hidden flex-col bg-slate-50 transition-[top] duration-200" style={{top:compact ? 0 : 56,paddingBottom:"env(safe-area-inset-bottom)"}}>
      <section aria-label="모바일 월 달력" className="shrink-0 min-h-0 flex flex-col bg-white border-b border-slate-200 px-2 pt-1 pb-1 transition-[height] duration-200" style={{height:compact ? 210 : 260}}>
        <div className="flex items-center justify-between gap-1 shrink-0">
          <button aria-label="이전 달" onClick={props.onPrevious} className="p-2"><ChevronLeft className="h-5 w-5" /></button>
          <h1 className="font-bold text-base">{props.year}년 {props.month+1}월</h1>
          <button aria-label="다음 달" onClick={props.onNext} className="p-2"><ChevronRight className="h-5 w-5" /></button>
          <button onClick={props.onToday} className="rounded border px-2 py-1 text-xs">오늘</button>
          <button aria-label="모바일 일정 추가" onClick={()=>props.onAdd(selected ?? undefined)} className="p-2 text-blue-600"><Plus className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] text-slate-500 shrink-0 py-1">{["일","월","화","수","목","금","토"].map(day=><span key={day}>{day}</span>)}</div>
        <div className="grid grid-cols-7 flex-1 min-h-0" style={{gridTemplateRows:`repeat(${Math.ceil(props.days.length/7)},minmax(0,1fr))`}}>
          {props.days.map((day,index)=>{
            const count=props.events.filter(event=>event.dateStr===day.dateStr).length;
            return <button key={day.dateStr} disabled={!day.isCurrentMonth} onClick={()=>{
              setSelected(day.dateStr);
              const target=sections.current.get(day.dateStr),viewport=list.current;
              if(selected===day.dateStr && target && viewport) viewport.scrollTo({top:viewport.scrollTop+target.getBoundingClientRect().top-viewport.getBoundingClientRect().top-8,behavior:"smooth"});
            }} aria-current={day.dateStr===getToday() ? "date" : undefined} aria-pressed={selected===day.dateStr} aria-label={`${props.month+1}월 ${day.dayNum}일, 일정 ${count}건`} className={`flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-lg text-sm ${day.dateStr===getToday() ? "ring-2 ring-inset ring-blue-500" : ""} ${!day.isCurrentMonth ? "text-slate-300" : selected===day.dateStr ? "bg-blue-600 text-white" : day.dateStr===getToday() ? "bg-blue-100 text-blue-800 font-extrabold" : index%7===0 ? "text-rose-600" : index%7===6 ? "text-blue-600" : "text-slate-800"}`}>
              <span className={holidays[day.dateStr] && selected!==day.dateStr ? "text-red-600 font-bold" : ""}>{day.dayNum}</span>
              {holidays[day.dateStr] ? <span title={holidays[day.dateStr]} className="block max-w-full truncate rounded-sm bg-red-700 px-0.5 text-[8px] leading-3 text-white">{holidays[day.dateStr]}</span> : <span aria-hidden="true" className={`h-1 w-1 rounded-full ${count && day.isCurrentMonth ? selected===day.dateStr ? "bg-white" : "bg-blue-600" : "bg-transparent"}`} />}
            </button>;
          })}
        </div>
      </section>
      <section aria-label="해당 월 일정 목록" className="flex-1 min-h-0 flex flex-col">
        <div ref={list} onScroll={event => { const next = event.currentTarget.scrollTop > 12; if(next !== compact) {setCompact(next);window.dispatchEvent(new CustomEvent("mobile-calendar-compact",{detail:next}));} }} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-20" tabIndex={0} aria-label="월 일정 스크롤 목록">
          {!dates.length && <p className="p-5 text-sm text-slate-500">이 달의 일정이 없습니다.</p>}
          {dates.map(date=><section key={date} ref={element=>{if(element)sections.current.set(date,element);else sections.current.delete(date);}} className="mb-4" aria-label={`${props.month+1}월 ${Number(date.slice(-2))}일 일정`}>
            <h2 className={`py-2 px-1 text-[15.4px] font-bold ${date===selected ? "text-blue-700" : "text-slate-900"}`}>{props.month+1}월 {Number(date.slice(-2))}일</h2>
            {groups.get(date)!.length ? groups.get(date)!.map(event=><div key={`${event.type}-${event.id}`} className="flex gap-1 items-center"><button onClick={()=>props.onOpen(event)} aria-label={`${event.clientName} ${event.title} ${event.status} 상세보기`} title={`${event.title} · ${event.location} · ${event.status}`} className={`mb-1 flex items-center gap-2 min-w-0 flex-1 rounded-lg bg-white border-l-4 border px-2.5 py-2.5 text-left ${event.type==="as" ? "border-l-rose-500" : event.status==="시공완료" ? "border-l-blue-500" : "border-l-lime-500"}`}>
              <span title={event.drawingType || "기타"} aria-label={event.drawingType || "기타"} className={`shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${event.drawingType === "천정형" ? "bg-emerald-600" : event.drawingType === "에보라" ? "bg-fuchsia-700" : event.drawingType === "옴니버스" ? "bg-purple-600" : "bg-slate-500"}`}>{event.drawingType?.slice(0,1) || "기"}</span>
              <span className="min-w-0 flex-1 truncate text-[13.2px] font-bold text-slate-900">{event.type === "work" ? event.title : event.location}</span>
              <span className="shrink-0 text-[11px] text-slate-500">{event.status}</span>
            </button>{event.type==="work" && props.onPhoto && <button aria-label={`${event.title} 사진 등록`} onClick={()=>props.onPhoto?.(event)} className="shrink-0 rounded-lg border bg-white px-2 py-3 text-xs text-blue-700 font-bold">사진 등록</button>}</div>) : <p className="rounded-xl bg-white p-4 text-sm text-slate-500">등록된 일정이 없습니다.</p>}
          </section>)}
        </div>
      </section>
    </div>
    <div className="fixed inset-x-0 top-14 bottom-0 z-20 hidden landscape:flex lg:!hidden items-center justify-center bg-white p-6 text-center text-sm text-slate-600">모바일 캘린더는 세로 화면을 지원합니다.<br />기기를 세로로 돌려주세요.</div>
  </>;
}
