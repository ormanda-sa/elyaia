// src/layout/SidebarWidget.tsx
"use client";

import React, { useEffect, useState } from "react";

type StoreInfo = {
  store_id: string;
  event_secret: string;
};

export default function SidebarWidget() {
  const [info, setInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/dashboard/store-id", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({} as any));

        // 🔹 الحالة المهمة: 401 = مستخدم مو مسجل دخول
        if (res.status === 401) {
          // لا نطبع error ولا نعرض الودجت
          return;
        }

        if (!res.ok) {
          // أخطاء حقيقية فقط (مثلاً 500)
          console.error("store-id api error:", json);
          return;
        }

        if (!cancelled) {
          setInfo({
            store_id: json.store_id,
            event_secret: json.event_secret ?? "darb_filter_2025",
          });
        }
      } catch (err) {
        console.error("store-id api exception:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // لو مافيه بيانات أو لسه يحمل → لا نعرض شيء
  if (loading || !info) return null;

  const snippet = `<script>
  (function () {
    var s = document.createElement('script');
    s.src = "https://elyaia.vercel.app/widgets.js";
    s.async = true;

    s.setAttribute("data-store-id", "${info.store_id}");
    s.setAttribute("data-event-secret", "${info.event_secret}");

    var firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(s, firstScript);
  })();
</script>`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("copy snippet error:", err);
    }
  }

  return (
    <div
      dir="rtl"
      className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center shadow-sm dark:bg-white/[0.03]"
    >
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
        كود تركيب الفلتر
      </h3>
      <p className="mb-3 text-theme-sm text-gray-500 dark:text-gray-400">
        انسخ الكود التالي وضعه في قالب متجرك ليتم تفعيل DARB FILTERS.
      </p>

      <div className="mb-3 rounded-xl bg-white p-3 text-right text-[11px] leading-relaxed text-gray-600 shadow-inner dark:bg-black/20">
        <div className="mb-1 font-medium text-gray-700">
          Store ID:
          <span className="mr-1 font-mono text-[10px] text-indigo-600">
            {info.store_id}
          </span>
        </div>
        <div className="text-[10px] text-gray-500">
          Event Secret:
          <span className="mr-1 font-mono text-[10px] text-gray-600">
            {info.event_secret}
          </span>
        </div>
      </div>

      <div className="mb-4 max-h-40 overflow-auto rounded-xl bg-slate-900 p-3 text-left text-[10px] leading-relaxed text-slate-100">
        <pre className="whitespace-pre-wrap break-all">
          <code>{snippet}</code>
        </pre>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="flex w-full items-center justify-center rounded-lg bg-brand-500 p-3 text-theme-sm font-medium text-white hover:bg-brand-600"
      >
        {copied ? "👍 تم نسخ الكود" : "نسخ كود السكربت"}
      </button>
    </div>
  );
}
