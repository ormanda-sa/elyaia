"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SnapshotExportButton() {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/widget/snapshot-export", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(data?.error || "فشل توليد بيانات الفلتر");
      }

      setLastUpdated(data.updated_at || null);
    } catch (e: any) {
      setError(e?.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "جاري التحديث..." : "تحديث بيانات الفلتر (Snapshot Export)"}
      </Button>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          آخر تحديث: {new Date(lastUpdated).toLocaleString("ar-EG")}
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}