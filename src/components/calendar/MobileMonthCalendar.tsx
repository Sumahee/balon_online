"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getToday } from "@/lib/date";

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
  onAdd:(date?:string)=>void; onOpen:(event:Event)=>void;
}

export function MobileMonthCalendar(props:Props) {
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
            }} aria-pressed={selected===day.dateStr} aria-label={`${props.month+1}월 ${day.dayNum}일, 일정 ${count}건`} className={`flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-lg text-sm ${!day.isCurrentMonth ? "text-slate-300" : selected===day.dateStr ? "bg-blue-600 text-white" : day.dateStr===getToday() ? "bg-blue-50 text-blue-700 font-bold" : index%7===0 ? "text-rose-600" : index%7===6 ? "text-blue-600" : "text-slate-800"}`}>
              <span>{day.dayNum}</span><span aria-hidden="true" className={`h-1 w-1 rounded-full ${count && day.isCurrentMonth ? selected===day.dateStr ? "bg-white" : "bg-blue-600" : "bg-transparent"}`} />
            </button>;
          })}
        </div>
      </section>
      <section aria-label="해당 월 일정 목록" className="flex-1 min-h-0 flex flex-col">
        <div ref={list} onScroll={event => { const next = event.currentTarget.scrollTop > 12; if(next !== compact) {setCompact(next);window.dispatchEvent(new CustomEvent("mobile-calendar-compact",{detail:next}));} }} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-20" tabIndex={0} aria-label="월 일정 스크롤 목록">
          {!dates.length && <p className="p-5 text-sm text-slate-500">이 달의 일정이 없습니다.</p>}
          {dates.map(date=><section key={date} ref={element=>{if(element)sections.current.set(date,element);else sections.current.delete(date);}} className="mb-4" aria-label={`${props.month+1}월 ${Number(date.slice(-2))}일 일정`}>
            <h2 className={`py-2 px-1 text-sm font-bold ${date===selected ? "text-blue-700" : "text-slate-900"}`}>{props.month+1}월 {Number(date.slice(-2))}일</h2>
            {groups.get(date)!.length ? groups.get(date)!.map(event=><button key={`${event.type}-${event.id}`} onClick={()=>props.onOpen(event)} aria-label={`${event.clientName} ${event.title} ${event.status} 상세보기`} title={`${event.title} · ${event.location} · ${event.status}`} className={`mb-1 flex items-center gap-2 w-full rounded-lg bg-white border-l-4 border px-2.5 py-2.5 text-left ${event.type==="as" ? "border-l-rose-500" : event.status==="시공완료" ? "border-l-blue-500" : "border-l-lime-500"}`}>
              <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold text-slate-600">{event.type==="as" ? "A/S" : event.drawingType || "시공"}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-900">{event.type === "work" ? event.title : event.location}</span>
              <span className="shrink-0 text-[10px] text-slate-500">{event.status}</span>
            </button>) : <p className="rounded-xl bg-white p-4 text-sm text-slate-500">등록된 일정이 없습니다.</p>}
          </section>)}
        </div>
      </section>
    </div>
    <div className="fixed inset-x-0 top-14 bottom-0 z-20 hidden landscape:flex lg:!hidden items-center justify-center bg-white p-6 text-center text-sm text-slate-600">모바일 캘린더는 세로 화면을 지원합니다.<br />기기를 세로로 돌려주세요.</div>
  </>;
}
