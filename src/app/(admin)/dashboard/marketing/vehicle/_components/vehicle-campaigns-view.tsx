// FILE: src/app/dashboard/marketing/vehicle/_components/vehicle-campaigns-view.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CampaignsToolbar } from "./campaigns-toolbar";
import { CampaignsTable } from "./campaigns-table";
import { CreateCampaignDialog } from "./create-campaign-dialog";
import { CampaignDetailsSheet } from "./campaign-details-sheet";

export type Campaign = any;

type Filters = {
  q: string;
  status: string;
  audience: string;
  scope: string;
  type: string;
};

export function VehicleCampaignsView() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    q: "",
    status: "",
    audience: "",
    scope: "",
    type: "",
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.q.trim()) p.set("q", filters.q.trim());
    if (filters.status) p.set("status", filters.status);
    if (filters.audience) p.set("audience_mode", filters.audience);
    if (filters.scope) p.set("scope_level", filters.scope);
    if (filters.type) p.set("campaign_type", filters.type);
    return p.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/marketing/vehicle/campaigns?${queryString}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load campaigns");
      setItems(json.items || []);
    } catch (e: any) {
      setError(e?.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Vehicle Campaigns</div>
          <div className="text-sm text-muted-foreground">
            أنشئ حملات على مستوى الماركة / الموديل / السنة — مع جمهور عام أو مستهدف.
          </div>
        </div>
      </div>

      <CampaignsToolbar
        filters={filters}
        onChange={setFilters}
        onCreate={() => setCreateOpen(true)}
        onRefresh={load}
      />

      <CampaignsTable
        items={items}
        loading={loading}
        error={error}
        onOpenDetails={(id) => setDetailsId(id)}
        onRefresh={load}
      />

      <CreateCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />

      <CampaignDetailsSheet
        campaignId={detailsId}
        open={detailsId != null}
        onOpenChange={(v) => !v && setDetailsId(null)}
        onChanged={load}
      />
    </div>
  );
}
