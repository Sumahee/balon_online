"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { isInstaller } from "@/lib/access";
import { DataProvider } from "@/context/DataContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { DataStatus } from "@/components/layout/DataStatus";
import dynamic from "next/dynamic";
import { useData } from "@/context/DataContext";
const QuickModals=dynamic(()=>import("@/components/layout/QuickModals").then(module=>module.QuickModals),{ssr:false});
function LazyQuickModals(){const {quickModalType}=useData();return quickModalType ? <QuickModals /> : null;}

export function AppLayout({ children }: { children: ReactNode }) {
  return <AuthProvider><SessionBoundary>{children}</SessionBoundary></AuthProvider>;
}

function SessionBoundary({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const publicPage = ["/login", "/signup", "/install"].includes(pathname);
  const restricted = isInstaller(user) && pathname !== "/calendar";
  useEffect(() => {
    if (isLoading || publicPage) return;
    if (!user) router.replace("/login");
    else if (restricted) router.replace("/calendar");
  }, [isLoading, publicPage, user, restricted, router]);
  if (publicPage) return <main>{children}</main>;
  if (isLoading || !user || restricted) return <div role="status" className="flex min-h-screen items-center justify-center text-sm text-slate-500">로그인 확인 중…</div>;
  return <AuthenticatedLayout key={String(user.id)}>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
      <DataProvider>
        <div className="app-shell min-h-screen bg-slate-50 flex flex-col lg:flex-row">
          {/* Mobile Specific Circular Hamburger Header (lg:hidden) */}
          <MobileHeader onOpenDrawer={() => setIsMobileDrawerOpen(true)} />

          {/* Mobile Specific Slide Drawer Menu (lg:hidden) */}
          <MobileDrawer
            isOpen={isMobileDrawerOpen}
            onClose={() => setIsMobileDrawerOpen(false)}
          />

          {/* Desktop Left Fixed Sidebar (lg:block) */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
            {/* Desktop Top Header (hidden on mobile) */}
            <div className="hidden lg:block">
              <TopBar />
            </div>

            {/* Dynamic Page Content */}
            <main className="app-content flex-1 px-4 py-5 sm:p-6 lg:p-8 w-full max-w-[1680px] mx-auto">
              <DataStatus />
              {children}
            </main>

            {/* Platform Footer */}
            <footer className="py-4 px-6 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white/50 hidden lg:block">
              BALON ONLINE © 2026 BALON INT. All rights reserved. Custom Furniture & Interior Integrated Platform.
            </footer>
          </div>

          {/* Mobile Bottom Navigation Bar (lg:hidden) */}
          <MobileBottomNav onOpenDrawer={() => setIsMobileDrawerOpen(true)} />

          {/* Global Quick Action Modals */}
          <LazyQuickModals />
        </div>
      </DataProvider>
  );
}
