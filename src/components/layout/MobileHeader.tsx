"use client";
import { APP_VERSION } from "@/lib/app-version";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Building2, Calendar as CalendarIcon } from "lucide-react";
import { usePathname } from "next/navigation";

interface MobileHeaderProps {
  onOpenDrawer: () => void;
}

export function MobileHeader({ onOpenDrawer }: MobileHeaderProps) {
  const pathname = usePathname();
  const [calendarCompact, setCalendarCompact] = useState(false);
  useEffect(() => {
    const handle = (event: Event) => setCalendarCompact(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("mobile-calendar-compact", handle);
    return () => window.removeEventListener("mobile-calendar-compact", handle);
  }, []);

  const getPageTitle = () => {
    switch (pathname) {
      case "/equipment": return "설비 관리";
      case "/":
        return "업무 칸반";
      case "/calendar":
        return "스케줄러 (달력)";
      case "/work":
        return "업무 목록";
      case "/as":
        return "A/S 관리 게시판";
      case "/gallery":
        return "바론 이미지 모음";
      case "/purchases":
        return "인터넷 자재구매";
      case "/drawer":
        return "서랍장 자동화";
      case "/materials":
        return "합판 자재 샘플";
      default:
        return "바론 온라인";
    }
  };

  return (
    <header className={`${pathname === "/calendar" && calendarCompact ? "hidden" : "flex"} lg:hidden sticky top-0 z-30 h-14 bg-slate-950 text-white border-b border-slate-800 px-3 items-center justify-between shadow-md`}>
      {/* Left: Circular Hamburger Button 🔘☰ */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenDrawer}
          className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shadow-inner border border-slate-700 transition active:scale-95 cursor-pointer"
          aria-label="모바일 메뉴 열기"
        >
          <Menu className="w-5 h-5 text-blue-400" />
        </button>

        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="flex flex-col"><span className="font-black text-sm tracking-wide text-white">BALON</span><span className="text-[10px] leading-tight text-slate-400" aria-label={`Version ${APP_VERSION}`}>{APP_VERSION}</span></span>
        </Link>
      </div>

      {/* Center/Right: Current Active Page Title & Date Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-200 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
          <CalendarIcon className="w-3 h-3 text-blue-400" />
          <span>{getPageTitle()}</span>
        </span>
      </div>
    </header>
  );
}
