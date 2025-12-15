// FILE: src/app/dashboard/marketing/vehicle/_components/campaigns-toolbar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_LABELS: Record<string, string> = {
  "": "الكل",
  draft: "مسودة",
  active: "نشطة",
  paused: "موقوفة",
  finished: "منتهية",
  cancelled: "ملغية",
};

const AUDIENCE_LABELS: Record<string, string> = {
  "": "الكل",
  public: "عام",
  targeted: "مستهدف",
};

const TYPE_LABELS: Record<string, string> = {
  "": "الكل",
  message: "رسالة",
  discount: "خصم",
};

export function CampaignsToolbar({
  filters,
  onChange,
  onCreate,
  onRefresh,
}: {
  filters: any;
  onChange: (v: any) => void;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  const set = (k: string, v: string) => onChange({ ...filters, [k]: v });

  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <Input
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="ابحث باسم الحملة..."
            className="max-w-md"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                الحالة: {STATUS_LABELS[filters.status ?? ""] ?? (filters.status || "الكل")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => set("status", "")}>الكل</DropdownMenuItem>
              {(["draft", "active", "paused", "finished", "cancelled"] as const).map((s) => (
                <DropdownMenuItem key={s} onClick={() => set("status", s)}>
                  {STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                الجمهور: {AUDIENCE_LABELS[filters.audience ?? ""] ?? (filters.audience || "الكل")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => set("audience", "")}>الكل</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("audience", "public")}>عام</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("audience", "targeted")}>مستهدف</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ✅ حذفنا فلتر "النطاق" لأنه صار حسب الرابط فقط */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                النوع: {TYPE_LABELS[filters.type ?? ""] ?? (filters.type || "الكل")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => set("type", "")}>الكل</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("type", "message")}>رسالة</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("type", "discount")}>خصم</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onRefresh}>
            تحديث
          </Button>
          <Button onClick={onCreate}>إنشاء حملة</Button>
        </div>
      </div>
    </div>
  );
}
