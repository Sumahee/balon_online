"use client";

import React, { ReactNode } from "react";
import { DataProvider } from "@/context/DataContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { QuickModals } from "@/components/layout/QuickModals";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Left Fixed Sidebar */}
        <Sidebar />

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
          {/* Top Sticky Header */}
          <TopBar />

          {/* Dynamic Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>

          {/* Subtle Platform Footer */}
          <footer className="py-4 px-6 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white/50">
            BARON ONLINE © 2026 BARON INT. All rights reserved. Custom Furniture & Interior Integrated Platform.
          </footer>
        </div>

        {/* Global Quick Action Modals */}
        <QuickModals />
      </div>
    </DataProvider>
  );
}
