// src/app/(admin)/dashboard/hero-settings/_components/HeroSettingsShell.tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { SectionBackground } from "./SectionBackground";
import { SectionTexts } from "./SectionTexts";
import { SectionColors } from "./SectionColors";
import { SectionButton } from "./SectionButton";
import { SectionCapsule } from "./SectionCapsule";
import { HeroPreview } from "./HeroPreview";
import { SnapshotButton } from "./SnapshotButton";

// نوع إعدادات الفلتر المستخدمة في كل السكاشن
export type FilterConfig = {
  enabled: boolean;

  // نصوص الهيرو
  title_text: string | null;             // العنوان الرئيسي
  subtitle_text: string | null;          // HTML كامل (وضع متقدم)
  shipping_text: string | null;          // يمكن استخدامه لاحقاً
  background_image_url: string | null;

  // ألوان عامة
  primary_color: string | null;
  hero_title_color: string | null;
  hero_desc_color: string | null;

  // العداد
  counter_target: number | null;
  counter_color: string | null;
  shipping_color: string | null;
  step_badge_bg: string | null;

  // زر البحث
  hero_button_bg: string | null;
  hero_button_text_color: string | null;
  choices_primary_color: string | null;
  hero_button_left_color: string | null;   // لون بداية الزر
  hero_button_right_color: string | null;  // لون نهاية الزر

  // الشريط (الكبسولة)
  hero_capsule_bg: string | null;          // background للكبسولة
  hero_capsule_shadow: string | null;      // box-shadow للكبسولة
  hero_capsule_left_color: string | null;  // لون يسار الشريط
  hero_capsule_right_color: string | null; // لون يمين الشريط
  hero_capsule_base_color: string | null;  // لون الخلفية الداكنة تحت التدرج

  // نصوص مبسطة
  hero_description_prefix: string | null;  // قالب الوصف مع {counter}
  hero_shipping_line: string | null;       // جملة الشحن

  // مظهر خلفية الهيرو (صورة أو تدرج)
  hero_bg_mode: "image" | "gradient" | null;
  hero_bg_gradient: string | null;
  hero_bg_left_color: string | null;
  hero_bg_right_color: string | null;
  hero_bg_base_color: string | null;
};

export function HeroSettingsShell() {
  const [config, setConfig] = useState<FilterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  // عشان ما نحفظ مباشرة بعد أول تحميل
  const isInitialLoad = useRef(true);

  // تحديث أي حقل في الإعدادات
  function update<K extends keyof FilterConfig>(key: K, value: FilterConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  // جلب الإعدادات من الـ API مرة واحدة
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/dashboard/filter-config");
        if (!res.ok) throw new Error("فشل جلب الإعدادات");
        const data = await res.json();
        const cfg = (data.config || {}) as Partial<FilterConfig>;

        setConfig({
          enabled: cfg.enabled ?? true,

          // نصوص
          title_text: cfg.title_text ?? "ابحث عن قطع غيار سيارتك",
          subtitle_text: cfg.subtitle_text ?? "",

          hero_description_prefix:
            cfg.hero_description_prefix ??
            "ابحث بين {counter} قطعة غيار لجميع سيارات تويوتا الأصلية واليابانية والتجارية",
          hero_shipping_line:
            cfg.hero_shipping_line ??
            "شحن سريع خلال 4-6 أيام وسعر منافس جداً",

          shipping_text: cfg.shipping_text ?? null,

          // خلفية الهيرو
          background_image_url:
            cfg.background_image_url ??
            "https://static.darb.com.sa/hero-bg/shocks.webp",

          // ألوان عامة
          primary_color: cfg.primary_color ?? "#e5202a",
          hero_title_color: cfg.hero_title_color ?? "#ffffff",
          hero_desc_color: cfg.hero_desc_color ?? "#f9fafb",

          // العداد
          counter_target: cfg.counter_target ?? 181825,
          counter_color: cfg.counter_color ?? "#e5202a",
          shipping_color: cfg.shipping_color ?? "#2563eb",
          step_badge_bg: cfg.step_badge_bg ?? "#d50026",

          // زر البحث
          hero_button_bg:
            cfg.hero_button_bg ??
            "linear-gradient(90deg, #e5202a 0%, #f97316 100%)",
          hero_button_text_color: cfg.hero_button_text_color ?? "#ffffff",
          choices_primary_color: cfg.choices_primary_color ?? "#e5202a",
          hero_button_left_color: cfg.hero_button_left_color ?? "#e5202a",
          hero_button_right_color: cfg.hero_button_right_color ?? "#f97316",

          // الشريط
          hero_capsule_bg:
            cfg.hero_capsule_bg ??
            "radial-gradient(circle at 0 0, rgba(59,130,246,0.2), transparent 55%), radial-gradient(circle at 100% 100%, rgba(244,54,54,0.25), transparent 55%), rgba(15,23,42,0.72)",
          hero_capsule_shadow:
            cfg.hero_capsule_shadow ??
            "0 26px 80px rgba(15,23,42,0.65), 0 0 0 1px rgba(148,163,184,0.45)",
          hero_capsule_left_color: cfg.hero_capsule_left_color ?? "#3b82f6",
          hero_capsule_right_color: cfg.hero_capsule_right_color ?? "#f43f5e",
          hero_capsule_base_color: cfg.hero_capsule_base_color ?? "#0f172a",

          // مظهر خلفية الهيرو (صورة / تدرج)
          hero_bg_mode: cfg.hero_bg_mode ?? "image",
          hero_bg_gradient:
            cfg.hero_bg_gradient ??
            "radial-gradient(circle at 0 0, rgba(59,130,246,0.35), transparent 55%), radial-gradient(circle at 100% 100%, rgba(244,54,54,0.35), transparent 55%), rgba(15,23,42,0.92)",
          hero_bg_left_color: cfg.hero_bg_left_color ?? "#3b82f6",
          hero_bg_right_color: cfg.hero_bg_right_color ?? "#f43f5e",
          hero_bg_base_color: cfg.hero_bg_base_color ?? "#0f172a",
        });
      } catch (e: any) {
        setError(e.message || "خطأ غير متوقع");
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    })();
  }, []);

  // حفظ تلقائي (Auto-save) مع debounce
  useEffect(() => {
    if (!config) return;
    if (isInitialLoad.current) return;

    setSavingState("saving");
    setError(null);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/dashboard/filter-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "فشل حفظ الإعدادات");
        }
        setSavingState("saved");
        setTimeout(() => setSavingState("idle"), 800);
      } catch (e: any) {
        setError(e.message || "خطأ أثناء الحفظ التلقائي");
        setSavingState("idle");
      }
    }, 800); // يحفظ بعد 800 ملّي ثانية من آخر تعديل

    return () => clearTimeout(timeout);
  }, [config]);

  if (loading || !config) {
    return <div className="text-sm">جارِ تحميل الإعدادات...</div>;
  }

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardContent className="pt-4 space-y-4">
        {/* شريط حالة بسيط فوق المعاينة */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>معاينة مظهر الفلتر في الهيرو</span>
          {savingState === "saving" && (
            <span className="text-amber-600">يتم الحفظ...</span>
          )}
          {savingState === "saved" && (
            <span className="text-emerald-600">تم الحفظ تلقائيًا</span>
          )}
          {error && (
            <span className="text-red-500">
              فشل الحفظ: {error}
            </span>
          )}
        </div>

        {/* المعاينة الحية */}
        <HeroPreview config={config} />

        {/* التابات */}
        <Tabs defaultValue="bg" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 text-xs">
            <TabsTrigger value="bg">مظهر الفلتر في الهيرو</TabsTrigger>
            <TabsTrigger value="texts">النصوص والعداد</TabsTrigger>
            <TabsTrigger value="colors">ألوان الهوية</TabsTrigger>
            <TabsTrigger value="button">زر البحث</TabsTrigger>
            <TabsTrigger value="capsule">خلفية الشريط</TabsTrigger>
          </TabsList>

          <TabsContent value="bg" className="space-y-4">
            <SectionBackground config={config} onChange={update} />
          </TabsContent>

          <TabsContent value="texts" className="space-y-4">
            <SectionTexts config={config} onChange={update} />
          </TabsContent>

          <TabsContent value="colors" className="space-y-4">
            <SectionColors config={config} onChange={update} />
          </TabsContent>

          <TabsContent value="button" className="space-y-4">
            <SectionButton config={config} onChange={update} />
          </TabsContent>

          <TabsContent value="capsule" className="space-y-4">
            <SectionCapsule config={config} onChange={update} />
          </TabsContent>
        </Tabs>

        {/* زر توليد JSON (widget_snapshots) */}
        <SnapshotButton />
      </CardContent>
    </Card>
  );
}
