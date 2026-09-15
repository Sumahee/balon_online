"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Plus,
  Wrench,
  AlertTriangle,
  Calendar,
  X,
  ExternalLink,
  User as UserIcon,
  LogOut,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";

const PAGE_TITLES: Record<string, { title: string; subtitle: string; category: string }> = {
  "/": {
    title: "메인 대시보드",
    subtitle: "프로젝트 진행 현황, 일정 타임라인 및 칸반 업무 요약",
    category: "Dashboard",
  },
  "/work": {
    title: "업무 게시판",
    subtitle: "제작, 실측, 시공, 설계 업무 일정 및 진척도 통합 관리",
    category: "Work Board",
  },
  "/as": {
    title: "A/S 관리 게시판",
    subtitle: "현장 시공 하자 및 유지보수 접수/처리 현황 파이프라인",
    category: "A/S Center",
  },
  "/gallery": {
    title: "바론 이미지 모음",
    subtitle: "현장별·자재별 고화질 시공 사진 및 마감 디테일 아카이빙",
    category: "Gallery Archive",
  },
  "/purchases": {
    title: "인터넷 자재구매 목록",
    subtitle: "온라인 쇼핑몰 자재/부자재 구매 이력, 단가 및 실물 사진 통합 관리",
    category: "Purchases",
  },
  "/drawer": {
    title: "서랍장 자동화 계산기",
    subtitle: "가구 외경 치수 기반 부속별 자동 절단 치수 및 부자재 산출",
    category: "CAD & Automation",
  },
  "/materials": {
    title: "합판 자재 샘플",
    subtitle: "PET, LPM, HPM, 원목 무늬목 등 가구 원자재 라이브러리",
    category: "Materials",
  },
};

export function TopBar() {
  const pathname = usePathname();
  const { metrics, asItems, setQuickModalType } = useData();
  const { user, logout } = useAuth();
  const [showAlertMenu, setShowAlertMenu] = useState(false);

  const pageInfo = PAGE_TITLES[pathname] || {
    title: "바론 온라인",
    subtitle: "통합 관리 플랫폼",
    category: "System",
  };

  const urgentItems = asItems.filter(
    (item) => item.priority === "긴급" && item.resultStatus !== "완료"
  );

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Breadcrumb & Title */}
      <div className="flex items-center gap-3 pl-10 lg:pl-0">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>BARON INT</span>
            <span>/</span>
            <span className="text-blue-600 font-medium">{pageInfo.category}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
            {pageInfo.title}
          </h1>
        </div>
      </div>

      {/* Right: Actions & Tools */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date Indicator (Desktop) */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200/80">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>2026. 09. 10 (목)</span>
        </div>

        {/* Notifications & Urgent AS Popover */}
        <div className="relative">
          <button
            onClick={() => setShowAlertMenu(!showAlertMenu)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="알림"
          >
            <Bell className="w-5 h-5" />
            {urgentItems.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showAlertMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>긴급 대응 알림</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">
                    {urgentItems.length}건
                  </span>
                </div>
                <button
                  onClick={() => setShowAlertMenu(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-2 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {urgentItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    현재 미처리된 긴급 A/S가 없습니다.
                  </p>
                ) : (
                  urgentItems.map((as) => (
                    <div key={as.id} className="py-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{as.clientName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          {as.resultStatus}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-1">{as.reason}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{as.siteAddress}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Link
                  href="/as"
                  onClick={() => setShowAlertMenu(false)}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 py-1"
                >
                  <span>A/S 게시판 전체보기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Button: 새 업무 등록 */}
        <button
          onClick={() => setQuickModalType("work")}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>새 업무 등록</span>
        </button>

        {/* User Auth Profile Badge & Action */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden md:flex flex-col items-end text-xs">
              <span className="font-bold text-slate-800 leading-tight">{user.name}</span>
              <span className="text-[10px] text-blue-600 font-medium">{user.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user.name.slice(0, 1)}
            </div>
            <button
              onClick={logout}
              title="로그아웃"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>직원 로그인</span>
          </Link>
        )}
      </div>
    </header>
  );
}
