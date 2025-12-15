// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-report/campaign-report-header.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CampaignSummary, formatDate } from "./campaign-report-types";

type Props = {
  campaign: CampaignSummary | null;
};

export function CampaignReportHeader({ campaign }: Props) {
  return (
    <div className="flex items-center gap-3">
      {campaign?.product_image_url ? (
        <img
          src={campaign.product_image_url}
          alt={campaign.product_title ?? ""}
          className="h-12 w-12 rounded-md object-cover border"
        />
      ) : null}

      <div className="flex flex-col gap-1">
        <span className="text-base font-medium">
          {campaign?.product_title ?? "حملة خصم"}
        </span>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              campaign?.status === "active" &&
                "border-green-500 text-green-600",
              campaign?.status === "finished" &&
                "border-slate-400 text-slate-600",
              campaign?.status === "paused" &&
                "border-yellow-500 text-yellow-600",
            )}
          >
            حالة: {campaign?.status ?? "-"}
          </Badge>

          {campaign?.discount_type === "price" && (
            <Badge variant="secondary" className="text-xs">
              تخفيض سعر مباشر
            </Badge>
          )}

          {campaign?.discount_type === "coupon" && (
            <Badge variant="secondary" className="text-xs">
              كوبون خصم
            </Badge>
          )}

          <span>
            من: {formatDate(campaign?.starts_at)}{" "}
            {campaign?.ends_at && (
              <>
                {" — "}إلى: {formatDate(campaign.ends_at)}
              </>
            )}
          </span>

          <span className="flex items-center gap-1">
            القنوات:
            {campaign?.send_onsite && (
              <Badge variant="outline" className="text-[10px]">
                On-site
              </Badge>
            )}
            {campaign?.send_email && (
              <Badge variant="outline" className="text-[10px]">
                Email
              </Badge>
            )}
            {campaign?.send_whatsapp && (
              <Badge variant="outline" className="text-[10px]">
                WhatsApp
              </Badge>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
