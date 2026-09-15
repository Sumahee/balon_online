"use client";

import React, { ReactNode, useState } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { QuickModals } from "@/components/layout/QuickModals";

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <AuthProvider>
      <DataProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
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
          <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300 pb-16 lg:pb-0">
            {/* Desktop Top Header (hidden on mobile) */}
            <div className="hidden lg:block">
              <TopBar />
            </div>

            {/* Dynamic Page Content */}
            <main className="flex-1 p-2 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto transition-all">
              {children}
            </main>

            {/* Platform Footer */}
            <footer className="py-4 px-6 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white/50 hidden lg:block">
              BARON ONLINE © 2026 BARON INT. All rights reserved. Custom Furniture & Interior Integrated Platform.
            </footer>
          </div>

          {/* Mobile Bottom Navigation Bar (lg:hidden) */}
          <MobileBottomNav onOpenDrawer={() => setIsMobileDrawerOpen(true)} />

          {/* Global Quick Action Modals */}
          <QuickModals />
        </div>
      </DataProvider>
    </AuthProvider>
  );
}
