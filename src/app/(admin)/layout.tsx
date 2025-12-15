"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  // هل المسار تابع للداشبورد أصلاً؟
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // صفحات الدخول فقط (لا نحط عليها حماية عشان ما يصير loop)
  const isAuthPage =
    pathname.startsWith("/dashboard/login") ||
    pathname.startsWith("/dashboard/forgot-password") ||
    pathname.startsWith("/dashboard/reset-password");

  // ✅ الحماية: بس على /dashboard/* ومو على صفحات auth
  useEffect(() => {
    if (!isDashboardRoute) return; // لو مو داشبورد، لا تسوي شي
    if (isAuthPage) return;

    const isLoggedIn = document.cookie
      .split("; ")
      .find((c) => c.startsWith("logged_in="));

    if (!isLoggedIn) {
      router.replace("/dashboard/login");
    }
  }, [isDashboardRoute, isAuthPage, router]);

  // صفحات auth بدون سايدبار وهيدر
  if (isDashboardRoute && isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-100" dir="rtl">
        {children}
      </div>
    );
  }

  // باقي صفحات الداشبورد مع السايدبار والهيدر
  if (isDashboardRoute) {
    const mainContentMargin = isMobileOpen
      ? "mr-0"
      : isExpanded || isHovered
      ? "lg:mr-[290px]"
      : "lg:mr-[90px]";

    return (
      <div className="min-h-screen xl:flex flex-row-reverse" dir="rtl">
        <AppSidebar />
        <Backdrop />
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
        >
          <AppHeader />
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // أي صفحات ثانية تحت (admin) لكنها مو /dashboard (مثل صفحة تعريفية) تمر عادي
  return <>{children}</>;
}
