// FILE: src/app/dashboard/marketing/vehicle/_components/campaigns-toolbar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
        <div className="flex flex-1 gap-2">
          <Input
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="ابحث باسم الحملة..."
            className="max-w-md"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">الحالة: {filters.status || "الكل"}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => set("status", "")}>الكل</DropdownMenuItem>
              {["draft", "active", "paused", "finished", "cancelled"].map((s) => (
                <DropdownMenuItem key={s} onClick={() => set("status", s)}>
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">الجمهور: {filters.audience || "الكل"}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => set("audience", "")}>الكل</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("audience", "public")}>public</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("audience", "targeted")}>targeted</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">النطاق: {filters.scope || "الكل"}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => set("scope", "")}>الكل</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("scope", "brand")}>brand</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("scope", "model")}>model</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("scope", "year")}>year</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">النوع: {filters.type || "الكل"}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => set("type", "")}>الكل</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("type", "message")}>message</DropdownMenuItem>
              <DropdownMenuItem onClick={() => set("type", "discount")}>discount</DropdownMenuItem>
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
