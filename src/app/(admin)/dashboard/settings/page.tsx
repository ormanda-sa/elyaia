// FILE: src/app/(admin)/dashboard/settings/page.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SettingLink = {
  href: string;
  title: string;
  description: string;
};

const LINKS: SettingLink[] = [
  {
    href: "/dashboard/settings/email",
    title: "إعدادات البريد الإلكتروني",
    description: "ضبط SMTP وبيانات المرسل لحملات الإيميل وإشعارات النظام.",
  },
  {
    href: "/dashboard/settings/whatsapp",
    title: "إعدادات الواتساب",
    description: "ربط مزوّد الواتساب ورقم الإرسال لحملات الرسائل.",
  },
  {
  href: "/dashboard/settings/templates",
  title: "إعدادات قوالب الايميل",
  description:
    "إنشاء وإدارة قوالب البريد باستخدام HTML/CSS، مع تحديد القالب الافتراضي وربط المتغيرات الأساسية حسب النظام عند الإرسال.",
},
  // تقدر تضيف روابط أخرى هنا لاحقاً (Salla, Subscriptions, ...الخ)
];

export default function SettingsIndexPage() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">إعدادات لوحة التحكم</h1>
        <p className="text-sm text-muted-foreground">
          اختر نوع الإعدادات التي ترغب في تعديلها.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex flex-col rounded-xl border bg-card p-4 transition hover:border-primary/60 hover:shadow-sm",
                active && "border-primary/70 ring-1 ring-primary/30",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">{item.title}</h2>
                <span className="text-[11px] text-primary opacity-0 group-hover:opacity-100">
                  فتح →
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
