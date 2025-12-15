"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard/marketing/vehicle", label: "حملات السيارة" },
  { href: "/dashboard/marketing/product", label: "حملات المنتج (قريبًا)" },
];

export function MarketingTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = pathname?.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              active
                ? "px-3 py-2 rounded-xl bg-black text-white text-sm"
                : "px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
