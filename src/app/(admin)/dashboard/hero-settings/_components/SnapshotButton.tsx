"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SnapshotButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setStatus(null);
    setMessage(null);

    try {
      const res = await fetch("/api/dashboard/widget/snapshot", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "فشل توليد JSON");
      }

      const data = await res.json().catch(() => ({}));
      setStatus("success");
      setMessage(
        "تم توليد بيانات الفلتر وتخزينها في JSON (widget_snapshots)."
      );
      console.log("[SNAPSHOT_GENERATED]", data);
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message || "حدث خطأ أثناء توليد JSON");
      console.error("[SNAPSHOT_GENERATE_ERROR]", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border rounded-2xl p-4 bg-muted/40 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            تحديث بيانات الفلتر (توليد JSON)
          </p>
          <p className="text-[11px] text-muted-foreground">
            هذا الزر يولّد ملف JSON لكل بيانات الفلتر + إعدادات الهيرو ويخزّنه في
            جدول <code>widget_snapshots</code>، ليستخدمه الودجت في سلة.
          </p>
        </div>
        <Button
          size="sm"
          className="whitespace-nowrap"
          disabled={loading}
          onClick={handleClick}
        >
          {loading ? "جاري التحديث..." : "تحديث بيانات الفلتر"}
        </Button>
      </div>

      {status === "success" && (
        <p className="text-[11px] text-emerald-600">
          ✅ {message}
        </p>
      )}
      {status === "error" && (
        <p className="text-[11px] text-red-600">
          ❌ {message}
        </p>
      )}
    </div>
  );
}
