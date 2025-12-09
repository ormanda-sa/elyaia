import type { FilterConfig } from "./HeroSettingsShell";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  config: FilterConfig;
  onChange: <K extends keyof FilterConfig>(key: K, value: FilterConfig[K]) => void;
};

function normalizeColor(value: string | null | undefined, fallback: string): string {
  const v = (value || "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
  return fallback;
}

// تحويل HEX إلى rgba لعمل الـ gradient
function hexToRgba(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  if (v.length !== 6) return hex;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SectionCapsule({ config, onChange }: Props) {
  // ألوان الـ gradient (مخزنة في FilterConfig عشان ترجع بعد كذا)
  const leftColor = normalizeColor(config.hero_capsule_left_color, "#3b82f6");
  const rightColor = normalizeColor(config.hero_capsule_right_color, "#f43f5e");
  const baseColor = normalizeColor(config.hero_capsule_base_color, "#0f172a");

  // gradient افتراضي مبني من الألوان الثلاثة
  const autoCapsuleBg =
    `radial-gradient(circle at 0 0, ${hexToRgba(leftColor, 0.2)}, transparent 55%), ` +
    `radial-gradient(circle at 100% 100%, ${hexToRgba(rightColor, 0.25)}, transparent 55%), ` +
    `${hexToRgba(baseColor, 0.72)}`;

  // نستخدم إما الكود اليدوي من المستخدم أو الـ auto
  const capsuleBg = config.hero_capsule_bg || autoCapsuleBg;

  const capsuleShadow =
    config.hero_capsule_shadow ||
    "0 26px 80px rgba(15,23,42,0.65), 0 0 0 1px rgba(148,163,184,0.45)";

  // helper لتطبيق ثيم جاهز
  function applyPreset(preset: "default" | "snow" | "transparent") {
    if (preset === "default") {
      const left = "#3b82f6";
      const right = "#f43f5e";
      const base = "#0f172a";
      const bg =
        `radial-gradient(circle at 0 0, ${hexToRgba(left, 0.2)}, transparent 55%), ` +
        `radial-gradient(circle at 100% 100%, ${hexToRgba(right, 0.25)}, transparent 55%), ` +
        `${hexToRgba(base, 0.72)}`;
      const shadow =
        "0 26px 80px rgba(15,23,42,0.65), 0 0 0 1px rgba(148,163,184,0.45)";

      onChange("hero_capsule_left_color", left);
      onChange("hero_capsule_right_color", right);
      onChange("hero_capsule_base_color", base);
      onChange("hero_capsule_bg", bg);
      onChange("hero_capsule_shadow", shadow);
      return;
    }

    if (preset === "snow") {
      // وضع ثلجي / فاتح
      const left = "#38bdf8";  // سماوي
      const right = "#e0f2fe"; // سماوي فاتح جداً
      const base = "#0b1120";  // أزرق داكن
      const bg =
        `radial-gradient(circle at 0 0, ${hexToRgba(left, 0.56)}, transparent 55%), ` +
        `radial-gradient(circle at 100% 100%, ${hexToRgba(right, 0.9)}, transparent 55%), ` +
        `${hexToRgba(base, 0.78)}`;
      const shadow =
        "0 24px 70px rgba(15,23,42,0.6), 0 0 0 1px rgba(148,163,184,0.35)";

      onChange("hero_capsule_left_color", left);
      onChange("hero_capsule_right_color", right);
      onChange("hero_capsule_base_color", base);
      onChange("hero_capsule_bg", bg);
      onChange("hero_capsule_shadow", shadow);
      return;
    }

    if (preset === "transparent") {
      // وضع شبه شفاف / خفيف
      const left = "#ffffff";
      const right = "#ffffff";
      const base = "#020617";
      const bg =
        `radial-gradient(circle at 0 0, ${hexToRgba(left, 0.08)}, transparent 55%), ` +
        `radial-gradient(circle at 100% 100%, ${hexToRgba(right, 0.08)}, transparent 55%), ` +
        `${hexToRgba(base, 0.4)}`;
      const shadow =
        "0 18px 45px rgba(15,23,42,0.4), 0 0 0 1px rgba(148,163,184,0.25)";

      onChange("hero_capsule_left_color", left);
      onChange("hero_capsule_right_color", right);
      onChange("hero_capsule_base_color", base);
      onChange("hero_capsule_bg", bg);
      onChange("hero_capsule_shadow", shadow);
    }
  }

  // لما يغيّر لون من الكولور بيكر
  function handleColorChange(
    key: "hero_capsule_left_color" | "hero_capsule_right_color" | "hero_capsule_base_color",
    value: string,
  ) {
    // حدّث اللون نفسه
    onChange(key, value);

    // ابني gradient جديد من الألوان الثلاثة بعد التحديث
    const newLeft =
      key === "hero_capsule_left_color" ? value : leftColor;
    const newRight =
      key === "hero_capsule_right_color" ? value : rightColor;
    const newBase =
      key === "hero_capsule_base_color" ? value : baseColor;

    const newBg =
      `radial-gradient(circle at 0 0, ${hexToRgba(newLeft, 0.2)}, transparent 55%), ` +
      `radial-gradient(circle at 100% 100%, ${hexToRgba(newRight, 0.25)}, transparent 55%), ` +
      `${hexToRgba(newBase, 0.72)}`;

    onChange("hero_capsule_bg", newBg);
  }

  return (
    <section
      id="hero-capsule"
      className="border rounded-2xl p-4 md:p-5 bg-white/60 space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">خلفية شريط الفلتر (الكبسولة)</h2>
          <p className="text-[11px] text-muted-foreground">
            اختر ثيم جاهز أو عدّل ألوان التدرج يدويًا، ثم يمكنك تعديل الكود نفسه إذا احتجت.
          </p>
        </div>

        {/* الثيمات الجاهزة */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-3"
            onClick={() => applyPreset("default")}
          >
            الوضع الافتراضي
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-3"
            onClick={() => applyPreset("snow")}
          >
            وضع ثلجي ❄️
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-3"
            onClick={() => applyPreset("transparent")}
          >
            وضع شفاف
          </Button>
        </div>
      </div>

      {/* معاينة مصغّرة للكبسولة */}
      <div
        className="w-full h-12 rounded-xl border mb-3"
        style={{ background: capsuleBg, boxShadow: capsuleShadow }}
      />

      {/* اختيار الألوان الأساسية للـ gradient */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-xs">لون الجهة اليسرى</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-8 w-8 rounded-md border"
              value={leftColor}
              onChange={(e) =>
                handleColorChange("hero_capsule_left_color", e.target.value)
              }
            />
            <Input
              className="text-xs"
              value={config.hero_capsule_left_color ?? ""}
              onChange={(e) =>
                handleColorChange("hero_capsule_left_color", e.target.value)
              }
              placeholder="#3b82f6"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">لون الجهة اليمنى</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-8 w-8 rounded-md border"
              value={rightColor}
              onChange={(e) =>
                handleColorChange("hero_capsule_right_color", e.target.value)
              }
            />
            <Input
              className="text-xs"
              value={config.hero_capsule_right_color ?? ""}
              onChange={(e) =>
                handleColorChange("hero_capsule_right_color", e.target.value)
              }
              placeholder="#f43f5e"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">لون الخلفية الأساسية</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-8 w-8 rounded-md border"
              value={baseColor}
              onChange={(e) =>
                handleColorChange("hero_capsule_base_color", e.target.value)
              }
            />
            <Input
              className="text-xs"
              value={config.hero_capsule_base_color ?? ""}
              onChange={(e) =>
                handleColorChange("hero_capsule_base_color", e.target.value)
              }
              placeholder="#0f172a"
            />
          </div>
        </div>
      </div>

      {/* كود الخلفية – متقدم */}
      <div className="space-y-2">
        <Label className="text-xs">
          كود الخلفية (CSS background)
          <span className="block text-[10px] text-muted-foreground">
            تقدر تعدّل الكود يدويًا لو حاب، أو خلّه يتولّد تلقائيًا من الألوان فوق.
          </span>
        </Label>
        <Textarea
          rows={3}
          value={config.hero_capsule_bg ?? ""}
          onChange={(e) => onChange("hero_capsule_bg", e.target.value)}
        />
      </div>

      {/* box-shadow */}
      <div className="space-y-2">
        <Label className="text-xs">
          كود الظل (box-shadow)
          <span className="block text-[10px] text-muted-foreground">
            مثال: 0 26px 80px rgba(15,23,42,0.65), 0 0 0 1px rgba(148,163,184,0.45)
          </span>
        </Label>
        <Textarea
          rows={2}
          value={config.hero_capsule_shadow ?? ""}
          onChange={(e) => onChange("hero_capsule_shadow", e.target.value)}
        />
      </div>
    </section>
  );
}
