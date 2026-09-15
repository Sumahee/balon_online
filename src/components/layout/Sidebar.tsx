"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Wrench,
  Images,
  Calculator,
  Layers,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  Building2,
  ShoppingBag,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    name: "메인 대시보드",
    path: "/",
    icon: LayoutDashboard,
    badgeKey: null,
  },
  {
    name: "일정 캘린더",
    path: "/calendar",
    icon: Calendar,
    badgeKey: "workCount" as const,
    highlight: true,
  },
  {
    name: "업무 게시판",
    path: "/work",
    icon: ClipboardList,
    badgeKey: "workCount" as const,
  },
  {
    name: "A/S 관리 게시판",
    path: "/as",
    icon: Wrench,
    badgeKey: "asCount" as const,
  },
  {
    name: "바론 이미지 모음",
    path: "/gallery",
    icon: Images,
    badgeKey: "galleryCount" as const,
  },
  {
    name: "인터넷 자재구매",
    path: "/purchases",
    icon: ShoppingBag,
    badgeKey: "purchaseCount" as const,
  },
  {
    name: "서랍장 자동화",
    path: "/drawer",
    icon: Calculator,
    badgeKey: null,
  },
  {
    name: "합판 자재 샘플",
    path: "/materials",
    icon: Layers,
    badgeKey: null,
    subtext: "확장 예정",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { metrics, images, purchaseItems } = useData();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const badgeCounts = {
    workCount: metrics.inProgressTasks,
    asCount: metrics.urgentAsCount,
    galleryCount: images.length,
    purchaseCount: purchaseItems ? purchaseItems.length : 0,
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <div className="lg:hidden fixed top-3 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg bg-slate-900 text-white shadow-md hover:bg-slate-800 transition"
          aria-label="Toggle navigation"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-950 text-slate-200 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-slate-800/80 px-5 flex items-center justify-between">
          <Link
            href="/"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-base text-white">
                  BARON
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">통합 가구제작 관리 시스템</p>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            메인 메뉴
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            const badgeValue = item.badgeKey ? badgeCounts[item.badgeKey] : null;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "relative flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"
                    )}
                  />
                  <span>{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.highlight && !isActive && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Sparkles className="w-2.5 h-2.5" />
                      Auto
                    </span>
                  )}

                  {item.subtext && (
                    <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                      {item.subtext}
                    </span>
                  )}

                  {badgeValue !== null && badgeValue > 0 && (
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeKey === "asCount"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-slate-800 text-slate-300"
                      )}
                    >
                      {badgeValue}
                    </span>
                  )}

                  {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
                </div>
              </Link>
            );
          })}
        </div>

        {/* System Status Footer */}
        <div className="p-3.5 m-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">시스템 정상 가동</span>
            </div>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-[11px] text-slate-400 leading-tight">
            Vercel Serverless Ready
            <div className="text-slate-400 font-mono text-[10px] mt-0.5">DB: Turso / LibSQL Ready</div>
          </div>
        </div>

        {/* User Info Bar */}
        <div className="p-3 border-t border-slate-800/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-xs text-white border border-slate-600">
            BY
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">바론 INT 관리자</p>
            <p className="text-[10px] text-slate-400 truncate">admin@baron-int.com</p>
          </div>
        </div>
      </aside>
    </>
  );
}
