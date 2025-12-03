"use client";

import { useMemo, useState } from "react";

export type RouteRow = {
  brand_id: number | null;
  brand_name: string;
  model_id: number | null;
  model_name: string;
  year_id: number | null;
  year_label: string;
  section_id: number | null;
  section_name: string;
  keyword_id: number | null;
  keyword_name: string;
  searches: number;
};

type Props = {
  routes: RouteRow[];
};

const PAGE_SIZE = 20;

export default function TopRoutesTable({ routes }: Props) {
  const [page, setPage] = useState(1);

  const total = routes.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pagedRoutes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return routes.slice(start, end);
  }, [routes, page]);

  function goToPage(p: number) {
    const safe = Math.min(Math.max(1, p), totalPages);
    setPage(safe);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            أكثر المسارات استخدامًا في البحث
          </div>
          <p className="text-xs text-slate-500 mt-1">
            المسارات اللي توضّح مسار العميل داخل الفلتر (ماركة / موديل /
            سنة / قسم / كلمة). ركّز عليها في الأسعار والعروض والمخزون
            والـ SEO.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Top {total.toString()} Routes
        </div>
      </div>

      {total === 0 ? (
        <div className="text-sm text-slate-500">
          لا توجد بيانات كافية بعد لعرض المسارات. جرّب تستخدم الفلتر عدة
          مرات ثم ارجع هنا.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500">
                  <th className="py-2 px-3 font-medium">الماركة</th>
                  <th className="py-2 px-3 font-medium">الموديل</th>
                  <th className="py-2 px-3 font-medium">السنة</th>
                  <th className="py-2 px-3 font-medium">القسم</th>
                  <th className="py-2 px-3 font-medium">الكلمة</th>
                  <th className="py-2 px-3 font-medium">
                    عدد عمليات البحث
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedRoutes.map((r, idx) => (
                  <tr
                    key={`${page}-${idx}`}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="py-2 px-3 whitespace-nowrap">
                      {r.brand_name || "—"}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {r.model_name || "—"}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {r.year_label || "—"}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {r.section_name || "—"}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {r.keyword_name || "—"}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-medium">
                      {r.searches.toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-[11px] md:text-xs text-slate-500">
              <span>
                عرض{" "}
                <span className="font-semibold">
                  {(page - 1) * PAGE_SIZE + 1}
                </span>{" "}
                إلى{" "}
                <span className="font-semibold">
                  {Math.min(page * PAGE_SIZE, total)}
                </span>{" "}
                من{" "}
                <span className="font-semibold">
                  {total.toLocaleString("en-US")}
                </span>{" "}
                مسار
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className={`rounded-full border px-2 py-1 ${
                    page === 1
                      ? "cursor-not-allowed border-slate-200 text-slate-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  السابق
                </button>

                {/* أرقام الصفحات البسيطة */}
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  const active = p === page;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p)}
                      className={`min-w-[28px] rounded-full border px-2 py-1 text-center ${
                        active
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className={`rounded-full border px-2 py-1 ${
                    page === totalPages
                      ? "cursor-not-allowed border-slate-200 text-slate-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
