"use client";

import { useEffect, useState, useMemo } from "react";

export type WidgetEventRow = {
  id: string;
  event_type: string;
  brand_id: number | null;
  model_id: number | null;
  year_id: number | null;
  section_id: number | null;
  keyword_id: number | null;
  brand_name: string | null;
  model_name: string | null;
  year_label: string | null;
  section_name: string | null;
  keyword_name: string | null;
  page_url: string | null;
  target_url: string | null;
  user_agent: string | null;
  created_at: string;
};

type Props = {
  from: string;
  to: string;
};

function detectDeviceType(userAgent: string | null): "جوال" | "كمبيوتر" | "غير معروف" {
  if (!userAgent) return "غير معروف";
  const ua = userAgent.toLowerCase();
  if (
    ua.includes("iphone") ||
    (ua.includes("android") && ua.includes("mobile")) ||
    ua.includes("ipad") ||
    ua.includes("ipod")
  ) {
    return "جوال";
  }
  if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) {
    return "كمبيوتر";
  }
  return "غير معروف";
}

function formatEventType(type: string): string {
  switch (type) {
    case "brand_select":
      return "اختيار الماركة";
    case "model_select":
      return "اختيار الموديل";
    case "year_select":
      return "اختيار السنة";
    case "section_select":
      return "اختيار القسم";
    case "keyword_click":
      return "ضغط على كلمة";
    case "search_submit":
      return "تنفيذ عملية البحث";
    default:
      return type;
  }
}

export default function WidgetEventsTable({ from, to }: Props) {
  const [events, setEvents] = useState<WidgetEventRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // فلاتر حسب الأعمدة
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [deviceFilter, setDeviceFilter] = useState<string>("");
  const [pageUrlFilter, setPageUrlFilter] = useState<string>("");
  const [targetUrlFilter, setTargetUrlFilter] = useState<string>("");
  const [createdAtFilter, setCreatedAtFilter] = useState<string>("");
  const [valuesFilter, setValuesFilter] = useState<string>("");

  // لو تغيّرت الفترة نرجع للصفحة الأولى
  useEffect(() => {
    setPage(1);
  }, [from, to, pageSize]);

  useEffect(() => {
    if (!from || !to) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          from,
          to,
          page: String(page),
          pageSize: String(pageSize),
        }).toString();

        const res = await fetch(`/api/dashboard/analytics/events?${params}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "خطأ في جلب الأحداث");
        }

        // ما نغيّر أي قيم، فقط نخزنها كما هي
        setEvents((json.events as WidgetEventRow[]) || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      } catch (e: any) {
        setError(e.message || "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [from, to, page, pageSize]);

  function goToPage(p: number) {
    const safe = Math.min(Math.max(1, p), totalPages);
    setPage(safe);
  }

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  // أنواع الأحداث المتاحة (من البيانات نفسها)
  const eventTypes = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .map((e) => e.event_type)
            .filter((t): t is string => Boolean(t)),
        ),
      ),
    [events],
  );

  // فلترة حسب الأعمدة (بدون تغيير بيانات events الأصلية)
  const filteredEvents = useMemo(() => {
    const valuesFilterLower = valuesFilter.trim().toLowerCase();
    const pageFilterLower = pageUrlFilter.trim().toLowerCase();
    const targetFilterLower = targetUrlFilter.trim().toLowerCase();
    const createdFilterLower = createdAtFilter.trim().toLowerCase();

    return events.filter((e) => {
      const device = detectDeviceType(e.user_agent);

      if (eventTypeFilter && e.event_type !== eventTypeFilter) return false;
      if (deviceFilter && device !== deviceFilter) return false;

      if (pageFilterLower) {
        const pageVal = (e.page_url || "").toLowerCase();
        if (!pageVal.includes(pageFilterLower)) return false;
      }

      if (targetFilterLower) {
        const targetVal = (e.target_url || "").toLowerCase();
        if (!targetVal.includes(targetFilterLower)) return false;
      }

      if (createdFilterLower) {
        const createdLocal = new Date(e.created_at).toLocaleString("en-GB", {
          timeZone: "Asia/Riyadh",
          hour12: false,
        });
        if (!createdLocal.toLowerCase().includes(createdFilterLower)) return false;
      }

      if (valuesFilterLower) {
        const valuesText = [
          e.brand_name,
          e.model_name,
          e.year_label,
          e.section_name,
          e.keyword_name,
          e.brand_id != null ? String(e.brand_id) : "",
          e.model_id != null ? String(e.model_id) : "",
          e.year_id != null ? String(e.year_id) : "",
          e.section_id != null ? String(e.section_id) : "",
          e.keyword_id != null ? String(e.keyword_id) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!valuesText.includes(valuesFilterLower)) return false;
      }

      return true;
    });
  }, [
    events,
    eventTypeFilter,
    deviceFilter,
    pageUrlFilter,
    targetUrlFilter,
    createdAtFilter,
    valuesFilter,
  ]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            جميع أحداث الفلتر الذكي
          </div>
          <p className="mt-1 text-xs text-slate-500">
            كل ضغطة أو عملية بحث مسجلة مع مسار الصفحة، الرابط الهدف، نوع الجهاز والتوقيت.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          إجمالي الأحداث:{" "}
          <span className="font-semibold">
            {total.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      {/* شريط الفلاتر حسب الأعمدة */}
      <div className="mb-4 grid grid-cols-1 gap-2 text-[11px] md:grid-cols-3 md:text-xs">
        <div className="flex flex-col gap-1">
          <label className="text-slate-500">فلتر نوع الحدث</label>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1"
          >
            <option value="">كل الأحداث</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {formatEventType(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-500">فلتر نوع الجهاز</label>
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1"
          >
            <option value="">كل الأجهزة</option>
            <option value="جوال">جوال</option>
            <option value="كمبيوتر">كمبيوتر</option>
            <option value="غير معروف">غير معروف</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-500">بحث في القيم (ماركة، موديل، سنة...)</label>
          <input
            type="text"
            value={valuesFilter}
            onChange={(e) => setValuesFilter(e.target.value)}
            placeholder="اكتب جزء من الاسم أو الـ ID"
            className="rounded-md border border-slate-200 bg-white px-2 py-1"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-500">بحث في رابط الصفحة</label>
          <input
            type="text"
            value={pageUrlFilter}
            onChange={(e) => setPageUrlFilter(e.target.value)}
            placeholder="جزء من الرابط"
            className="rounded-md border border-slate-200 bg-white px-2 py-1"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-500">بحث في الرابط الهدف</label>
          <input
            type="text"
            value={targetUrlFilter}
            onChange={(e) => setTargetUrlFilter(e.target.value)}
            placeholder="جزء من الرابط"
            className="rounded-md border border-slate-200 bg-white px-2 py-1"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-500">بحث في الوقت (نصيًا)</label>
          <input
            type="text"
            value={createdAtFilter}
            onChange={(e) => setCreatedAtFilter(e.target.value)}
            placeholder="مثال: 2025-12-07 14"
            className="rounded-md border border-slate-200 bg-white px-2 py-1"
          />
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-500">جاري تحميل الأحداث...</div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-sm text-slate-500">
          لا توجد بيانات في الفترة المحددة.
        </div>
      )}

      {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
        <div className="text-sm text-slate-500">
          لا توجد نتائج مطابقة للفلاتر الحالية.
        </div>
      )}

      {!loading && !error && filteredEvents.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px] md:text-xs text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500">
                  <th className="py-2 px-3 font-medium">الحدث</th>
                  <th className="py-2 px-3 font-medium">الصفحة</th>
                  <th className="py-2 px-3 font-medium">الرابط الهدف</th>
                  <th className="py-2 px-3 font-medium">الجهاز</th>
                  <th className="py-2 px-3 font-medium">الوقت (ميلادي)</th>
                  <th className="py-2 px-3 font-medium">القيم</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((e) => {
                  const device = detectDeviceType(e.user_agent);
                  const createdLocal = new Date(e.created_at).toLocaleString(
                    "en-GB",
                    {
                      timeZone: "Asia/Riyadh",
                      hour12: false,
                    },
                  );

                  const noIds =
                    e.brand_id == null &&
                    e.model_id == null &&
                    e.year_id == null &&
                    e.section_id == null &&
                    e.keyword_id == null;

                  return (
                    <tr
                      key={e.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="py-2 px-3 whitespace-nowrap font-semibold text-slate-700">
                        {formatEventType(e.event_type)}
                      </td>

                      <td className="py-2 px-3 max-w-[220px] md:max-w-[280px] truncate">
                        {e.page_url ? (
                          <a
                            href={e.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {e.page_url}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="py-2 px-3 max-w-[220px] md:max-w-[280px] truncate">
                        {e.target_url ? (
                          <a
                            href={e.target_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 hover:underline"
                          >
                            {e.target_url}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        {device}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        {createdLocal}
                      </td>

                      <td className="py-2 px-3 text-[10px] leading-4 text-slate-500">
                        {noIds ? (
                          <span className="text-slate-400">لا توجد قيم</span>
                        ) : (
                          <div className="space-y-0.5">
                            {e.brand_id != null && (
                              <div>
                                الماركة: {e.brand_name || "—"}{" "}
                                <span className="text-slate-400">
                                  (id: {e.brand_id})
                                </span>
                              </div>
                            )}
                            {e.model_id != null && (
                              <div>
                                الموديل: {e.model_name || "—"}{" "}
                                <span className="text-slate-400">
                                  (id: {e.model_id})
                                </span>
                              </div>
                            )}
                            {e.year_id != null && (
                              <div>
                                السنة: {e.year_label || "—"}{" "}
                                <span className="text-slate-400">
                                  (id: {e.year_id})
                                </span>
                              </div>
                            )}
                            {e.section_id != null && (
                              <div>
                                القسم: {e.section_name || "—"}{" "}
                                <span className="text-slate-400">
                                  (id: {e.section_id})
                                </span>
                              </div>
                            )}
                            {e.keyword_id != null && (
                              <div>
                                الكلمة: {e.keyword_name || "—"}{" "}
                                <span className="text-slate-400">
                                  (id: {e.keyword_id})
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination "محترفين" */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-2 items-center justify-between text-[11px] md:flex-row md:text-xs text-slate-500">
              <div className="flex items-center gap-2 order-2 md:order-1">
                <span>
                  عرض{" "}
                  <span className="font-semibold">
                    {startIndex.toLocaleString("en-US")}
                  </span>{" "}
                  إلى{" "}
                  <span className="font-semibold">
                    {endIndex.toLocaleString("en-US")}
                  </span>{" "}
                  من{" "}
                  <span className="font-semibold">
                    {total.toLocaleString("en-US")}
                  </span>{" "}
                  حدث
                </span>
              </div>

              <div className="flex items-center gap-3 order-1 md:order-2">
                {/* اختيار عدد الصفوف */}
                <div className="flex items-center gap-2">
                  <span>إظهار الصفوف:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* أزرار الإنتقال */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToPage(1)}
                    disabled={page === 1}
                    className={`rounded-full border px-2 py-1 ${
                      page === 1
                        ? "cursor-not-allowed border-slate-200 text-slate-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {"|<"}
                  </button>
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
                    {"<"}
                  </button>
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
                    {">"}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(totalPages)}
                    disabled={page === totalPages}
                    className={`rounded-full border px-2 py-1 ${
                      page === totalPages
                        ? "cursor-not-allowed border-slate-200 text-slate-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {">|"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
