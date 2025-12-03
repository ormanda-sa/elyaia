// src/app/dashboard/page.tsx

import { GlobalTopRoutesCard } from "./_components/GlobalTopRoutesCard";
import { GlobalWeekChart } from "./_components/GlobalWeekChart";
import { GlobalTopStrip } from "./_components/global-top-strip";
import { GlobalMonthChart } from "./_components/global-month-chart";

export default function DashboardHome() {
  return (
    <main
      className="min-h-screen bg-slate-50 px-4 py-6 md:px-8"
      dir="rtl"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        {/* عنوان + وصف يوضح الفترة وكل المتاجر */}
        <header className="mb-2 flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-slate-900 md:text-xl">
            تقارير جميع المتاجر المشتركة (آخر ٣٠ يوم)
          </h1>
          <p className="text-xs text-slate-500 md:text-[13px]">
            جميع الأرقام والإحصائيات في هذه الصفحة مبنية على نشاط فلتر DARB
            FILTERS خلال آخر ٣٠ يوم، وتشمل كل المتاجر المشتركة في النظام بدون
            إظهار أسماء المتاجر أو تفاصيلها الفردية.
          </p>
        </header>

        {/* الشريط العلوي – كروت الأرقام الرئيسية */}
        <GlobalTopStrip />
  <GlobalMonthChart />
   <GlobalWeekChart />
        

        {/* Top routes للنظام كله */}
        <GlobalTopRoutesCard />
      </div>
    </main>
  );
}
