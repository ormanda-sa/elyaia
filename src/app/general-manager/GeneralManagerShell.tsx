"use client";

import React from "react";
import type { ReactNode, CSSProperties } from "react";

import { AppSidebar } from "./_components/app-sidebar";
import { SiteHeader } from "./_components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type ShellProps = {
  children: ReactNode;
};

export function GeneralManagerShell({ children }: ShellProps) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5] text-neutral-900">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as CSSProperties
        }
      >
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {/* هنا يطلع محتوى كل صفحة: dashboard, stores, ... */}
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
