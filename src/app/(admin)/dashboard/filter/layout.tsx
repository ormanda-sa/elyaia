// src/app/(admin)/dashboard/filter/layout.tsx
"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";

export default function FilterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 lg:p-6">
      <div className="mx-auto max-w-6xl">
        {/* الكرت الكامل */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* نستخدم grid عشان نضمن عمودين واضحين */}
          <div
            className="
              grid
              min-h-[560px]
              grid-cols-[260px_minmax(0,1fr)]
            "
          >
            {/* العمود الأول: السايدبار (ماركات) */}
            <div className="border-l border-slate-200 bg-slate-50">
              <AppSidebar />
            </div>

            {/* العمود الثاني: محتوى صفحة الفلتر */}
            <div className="bg-slate-50/60">
              <div className="h-full overflow-auto px-4 py-4 lg:px-6 lg:py-5">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
