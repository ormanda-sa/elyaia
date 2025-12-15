// FILE: src/app/dashboard/marketing/vehicle/_components/vehicle-scope-picker.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

type Item = { id: number; label: string };

async function fetchLookup(url: string): Promise<Item[]> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "lookup failed");
  return (json.items || []).map((x: any) => ({ id: x.id, label: x.name_ar ?? x.year ?? x.label }));
}

export function VehicleScopePicker({
  scopeLevel,
  value,
  onChange,
}: {
  scopeLevel: "brand" | "model" | "year";
  value: { brand?: Item | null; model?: Item | null; year?: Item | null };
  onChange: (v: any) => void;
}) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const [brandQ, setBrandQ] = useState("");
  const [modelQ, setModelQ] = useState("");
  const [yearQ, setYearQ] = useState("");

  const [brands, setBrands] = useState<Item[]>([]);
  const [models, setModels] = useState<Item[]>([]);
  const [years, setYears] = useState<Item[]>([]);

  useEffect(() => {
    fetchLookup(`/api/dashboard/marketing/vehicle/lookup/brands?q=${encodeURIComponent(brandQ)}`)
      .then(setBrands)
      .catch(() => setBrands([]));
  }, [brandQ]);

  useEffect(() => {
    if (!value.brand?.id) {
      setModels([]);
      return;
    }
    fetchLookup(
      `/api/dashboard/marketing/vehicle/lookup/models?brand_id=${value.brand.id}&q=${encodeURIComponent(modelQ)}`
    )
      .then(setModels)
      .catch(() => setModels([]));
  }, [value.brand?.id, modelQ]);

  useEffect(() => {
    if (!value.model?.id) {
      setYears([]);
      return;
    }
    fetchLookup(
      `/api/dashboard/marketing/vehicle/lookup/years?model_id=${value.model.id}&q=${encodeURIComponent(yearQ)}`
    )
      .then(setYears)
      .catch(() => setYears([]));
  }, [value.model?.id, yearQ]);

  const scopeHint = useMemo(() => {
    const b = value.brand?.label;
    const m = value.model?.label;
    const y = value.year?.label;
    if (scopeLevel === "brand") return b || "اختر ماركة";
    if (scopeLevel === "model") return `${b || "—"} / ${m || "اختر موديل"}`;
    return `${b || "—"} / ${m || "—"} / ${y || "اختر سنة"}`;
  }, [scopeLevel, value]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">نطاق الحملة</div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{scopeLevel}</Badge>
        <span className="text-sm text-muted-foreground">{scopeHint}</span>
      </div>

      {/* Brand */}
      <Popover open={brandOpen} onOpenChange={setBrandOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {value.brand?.label ?? "اختر الماركة"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[420px]" align="start">
          <Command>
            <CommandInput placeholder="ابحث عن الماركة..." value={brandQ} onValueChange={setBrandQ} />
            <CommandList>
              <CommandEmpty>لا توجد نتائج</CommandEmpty>
              <CommandGroup heading="الماركات">
                {brands.map((b) => (
                  <CommandItem
                    key={b.id}
                    value={b.label}
                    onSelect={() => {
                      onChange({ brand: b, model: null, year: null });
                      setBrandOpen(false);
                    }}
                  >
                    {b.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Model */}
      {scopeLevel !== "brand" && (
        <Popover open={modelOpen} onOpenChange={setModelOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between" disabled={!value.brand?.id}>
              {value.model?.label ?? "اختر الموديل"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[420px]" align="start">
            <Command>
              <CommandInput placeholder="ابحث عن الموديل..." value={modelQ} onValueChange={setModelQ} />
              <CommandList>
                <CommandEmpty>لا توجد نتائج</CommandEmpty>
                <CommandGroup heading="الموديلات">
                  {models.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={m.label}
                      onSelect={() => {
                        onChange({ ...value, model: m, year: null });
                        setModelOpen(false);
                      }}
                    >
                      {m.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Year */}
      {scopeLevel === "year" && (
        <Popover open={yearOpen} onOpenChange={setYearOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between" disabled={!value.model?.id}>
              {value.year?.label ?? "اختر السنة"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[420px]" align="start">
            <Command>
              <CommandInput placeholder="ابحث عن السنة..." value={yearQ} onValueChange={setYearQ} />
              <CommandList>
                <CommandEmpty>لا توجد نتائج</CommandEmpty>
                <CommandGroup heading="السنوات">
                  {years.map((y) => (
                    <CommandItem
                      key={y.id}
                      value={y.label}
                      onSelect={() => {
                        onChange({ ...value, year: y });
                        setYearOpen(false);
                      }}
                    >
                      {y.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
