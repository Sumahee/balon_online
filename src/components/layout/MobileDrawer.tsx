"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  Wrench,
  Images,
  ShoppingBag,
  Calculator,
  Layers,
  X,
  Building2,
  User as UserIcon,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { metrics, images, purchaseItems } = useData();

  if (!isOpen) return null;

  const NAV_ITEMS = [
    {
      name: "메인 스케줄러 (달력)",
      path: "/calendar",
      icon: Calendar,
      badge: metrics.inProgressTasks ? `${metrics.inProgressTasks}건` : null,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      name: "업무 칸반 보드",
      path: "/work",
      icon: ClipboardList,
      badge: `${metrics.inProgressTasks}건`,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      name: "A/S 관리 게시판",
      path: "/as",
      icon: Wrench,
      badge: metrics.urgentAsCount > 0 ? `긴급 ${metrics.urgentAsCount}건` : null,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      name: "인터넷 자재구매 목록",
      path: "/purchases",
      icon: ShoppingBag,
      badge: purchaseItems ? `${purchaseItems.length}건` : null,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      name: "바론 이미지 모음",
      path: "/gallery",
      icon: Images,
      badge: `${images.length}장`,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      name: "서랍장 자동화 계산기",
      path: "/drawer",
      icon: Calculator,
      badge: null,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      name: "합판 자재 샘플",
      path: "/materials",
      icon: Layers,
      badge: "샘플",
      color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Dark Overlay Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Slide-out Drawer Panel */}
      <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-slate-950 text-slate-100 border-r border-slate-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-300">
        {/* Drawer Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center text-white font-extrabold shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-white tracking-wider">BARON</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  MOBILE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">통합 가구제작 관리 시스템</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Bar */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1">
                <span>{user?.name || "바론 담당자"}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-normal">
                  {user?.role || "직원"}
                </span>
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                {user?.email || "baron@barononline.co.kr"}
              </p>
            </div>
          </div>
          {user && (
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Menu Navigation */}
        <div className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            메뉴 목록
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || (item.path === "/calendar" && pathname === "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group",
                  isActive
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                      isActive
                        ? "bg-white/20 text-white border-white/30"
                        : item.color
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                        isActive
                          ? "bg-white text-blue-700 border-white"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-600")} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-400">BARON INT ONLINE</p>
          <p className="text-[10px] mt-0.5 text-slate-500">Mobile Responsive v2.0</p>
        </div>
      </div>
    </div>
  );
}
