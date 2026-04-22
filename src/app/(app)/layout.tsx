"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { VelloLogo } from "@/components/shared/VelloLogo";
import { List } from "@phosphor-icons/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 flex-shrink-0">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div
          className="lg:hidden flex items-center px-4 py-3"
          style={{
            borderBottom: "1px solid var(--border-dim)",
            background: "var(--bg-surface)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg mr-3"
            style={{ color: "var(--text-2)" }}
          >
            <List size={22} />
          </button>
          <VelloLogo iconSize={30} titleSize={18} showSubtitle={false} />
        </div>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto scrollbar-vello"
          style={{ background: "var(--bg-base)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
