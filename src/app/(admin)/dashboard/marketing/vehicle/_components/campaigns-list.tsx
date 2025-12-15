// FILE: src/app/dashboard/marketing/vehicle/_components/campaigns-list.tsx
"use client";

import { useEffect, useState } from "react";

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    return d.toLocaleString("ar-SA");
  } catch {
    return dt;
  }
}

function getTotalTargets(c: any): number {
  // Supabase nested count عادة يرجع كـ array فيها عنصر واحد
  // marketing_campaigns_targets: [{ count: 12 }]
  const arr = c?.marketing_campaigns_targets;
  if (Array.isArray(arr) && arr.length > 0 && arr[0] && typeof arr[0].count !== "undefined") {
    const n = Number(arr[0].count);
    return Number.isFinite(n) ? n : 0;
  }
  // بعض الأحيان قد يرجع كـ object { count: 12 }
  if (arr && typeof arr === "object" && typeof arr.count !== "undefined") {
    const n = Number(arr.count);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function CampaignsList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/dashboard/marketing/vehicle/campaigns", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to load campaigns");
    setItems(json.items || []);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e: any) {
        if (mounted) setError(e?.message || "حدث خطأ");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function refreshTargets(campaignId: number) {
    setBusyId(campaignId);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/marketing/vehicle/campaigns/${campaignId}/refresh-targets`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Refresh failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "فشل تحديث المستهدفين");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">الحملات</div>
        <button
          className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
          onClick={() => load().catch((e) => setError(e?.message || "حدث خطأ"))}
        >
          تحديث القائمة
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">تحميل...</div>}

      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-500">لا توجد حملات بعد.</div>
      )}

      <div className="space-y-2">
        {items.map((c) => {
          const totalTargets = getTotalTargets(c);

          return (
            <div key={c.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm">{c.title}</div>
                <span className="text-xs px-2 py-1 rounded-lg bg-gray-100">{c.status}</span>
              </div>

              <div className="mt-2 text-xs text-gray-600">
                Scope: {c.scope_level} • Audience: {c.audience_mode} • Type: {c.campaign_type}
              </div>

              <div className="mt-2 text-xs text-gray-600">
                Channels: {c.send_onsite ? "Onsite " : ""}
                {c.send_email ? "Email " : ""}
                {c.send_whatsapp ? "WhatsApp" : ""}
              </div>

              {c.audience_mode === "targeted" && (
                <div className="mt-3 rounded-lg bg-gray-50 border p-2">
                  <div className="text-xs text-gray-700 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        آخر تحديث: <b>{fmt(c.targets_last_refreshed_at)}</b>
                      </span>
                      <span>
                        أُضيف آخر تحديث: <b>{c.targets_last_refreshed_count ?? 0}</b>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        إجمالي المستهدفين: <b>{totalTargets}</b>
                      </span>
                      <span className="text-gray-500">
                        (العدد الكلي داخل الحملة)
                      </span>
                    </div>
                  </div>

                  <button
                    className="mt-2 w-full text-xs px-3 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-60"
                    onClick={() => refreshTargets(c.id)}
                    disabled={busyId === c.id}
                  >
                    {busyId === c.id ? "جاري تحديث المستهدفين..." : "تحديث المستهدفين الآن"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
