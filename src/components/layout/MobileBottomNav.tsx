"use client";
import { isInstaller } from "@/lib/access";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ClipboardList, Wrench, ShoppingBag, Menu, X, Images, Calculator, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const tabs = [
    {name:"일정",path:"/calendar",icon:Calendar},
    {name:"업무목록",path:"/work",icon:ClipboardList},
    {name:"A/S 관리",path:"/as",icon:Wrench},
    {name:"자재구매",path:"/purchases",icon:ShoppingBag},
    {name:"이미지 모음",path:"/gallery",icon:Images},
    {name:"서랍장 계산",path:"/drawer",icon:Calculator},
    {name:"합판 자재",path:"/materials",icon:Layers},
  ];
  return <div className="lg:hidden">
    {open && <>
      <button aria-label="메뉴 닫기" className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
      <nav aria-label="모바일 팝업 메뉴" className="fixed right-4 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl" style={{bottom:"calc(5rem + env(safe-area-inset-bottom))"}}>
        {tabs.filter(tab => !isInstaller(user) || tab.path === "/calendar").map(tab => <Link key={tab.path} href={tab.path} onClick={() => setOpen(false)} aria-current={pathname === tab.path ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm", pathname === tab.path ? "bg-blue-50 font-bold text-blue-700" : "text-slate-700 hover:bg-slate-50")}><tab.icon className="h-4 w-4" />{tab.name}</Link>)}
        <button onClick={() => {setOpen(false);onOpenDrawer();}} className="w-full border-t border-slate-100 px-3 py-2.5 text-left text-sm text-slate-500">계정 · 전체 메뉴</button>
      </nav>
    </>}
    <button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={open} onClick={() => setOpen(value => !value)} className="fixed right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg cursor-pointer" style={{bottom:"calc(1rem + env(safe-area-inset-bottom))"}}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
  </div>;
}
