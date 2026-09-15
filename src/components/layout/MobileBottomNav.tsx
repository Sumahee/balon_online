"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ClipboardList, Wrench, ShoppingBag, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export function MobileBottomNav({ onOpenDrawer }: MobileBottomNavProps) {
  const pathname = usePathname();

  const TABS = [
    {
      name: "스케줄러",
      path: "/calendar",
      icon: Calendar,
      isHome: true,
    },
    {
      name: "업무칸반",
      path: "/work",
      icon: ClipboardList,
    },
    {
      name: "A/S관리",
      path: "/as",
      icon: Wrench,
    },
    {
      name: "자재구매",
      path: "/purchases",
      icon: ShoppingBag,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {TABS.map((tab) => {
        const isActive =
          pathname === tab.path || (tab.isHome && (pathname === "/" || pathname === "/calendar"));
        const Icon = tab.icon;

        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer",
              isActive
                ? "text-blue-400 font-extrabold scale-105"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-lg transition-colors",
                isActive ? "bg-blue-600/20 border border-blue-500/30" : ""
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium tracking-tight mt-0.5">{tab.name}</span>
          </Link>
        );
      })}

      {/* Menu Drawer Button 🔘☰ */}
      <button
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
      >
        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center shadow-inner">
          <Menu className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-medium tracking-tight mt-0.5">전체메뉴</span>
      </button>
    </nav>
  );
}
