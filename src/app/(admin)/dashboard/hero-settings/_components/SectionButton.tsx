import type { FilterConfig } from "./HeroSettingsShell";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Props = {
  config: FilterConfig;
  onChange: <K extends keyof FilterConfig>(key: K, value: FilterConfig[K]) => void;
};

function normalizeColor(value: string | null | undefined, fallback: string): string {
  const v = (value || "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
  return fallback;
}

function hexToRgba(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  if (v.length !== 6) return hex;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SectionButton({ config, onChange }: Props) {
  const leftColor = normalizeColor(config.hero_button_left_color, "#e5202a");
  const rightColor = normalizeColor(config.hero_button_right_color, "#f97316");
  const textColor = normalizeColor(config.hero_button_text_color, "#ffffff");

  // لو الـ bg ما هو مكتوب يدويًا، نبنيه من لونين
  const autoBg = `linear-gradient(90deg, ${hexToRgba(
    leftColor,
    1,
  )} 0%, ${hexToRgba(rightColor, 1)} 100%)`;

  const buttonBg = config.hero_button_bg || autoBg;

  function handleSideColorChange(
    key: "hero_button_left_color" | "hero_button_right_color",
    value: string,
  ) {
    onChange(key, value);

    const newLeft =
      key === "hero_button_left_color" ? value : leftColor;
    const newRight =
      key === "hero_button_right_color" ? value : rightColor;

    const newBg = `linear-gradient(90deg, ${hexToRgba(
      newLeft,
      1,
    )} 0%, ${hexToRgba(newRight, 1)} 100%)`;

    onChange("hero_button_bg", newBg);
  }

  return (
    <section
      id="hero-button"
      className="border rounded-2xl p-4 md:p-5 bg-white/60 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold">زر البحث</h2>
        <p className="text-[11px] text-muted-foreground">
          اختر ألوان زر البحث (خلفية متدرجة + لون النص)، مع إمكانية تعديل الكود
          يدويًا إذا احتجت.
        </p>
      </div>

      {/* معاينة زر البحث */}
      <div className="space-y-2">
        <Label className="text-xs">معاينة الزر</Label>
        <button
          type="button"
          className="px-6 py-2 rounded-xl text-sm font-bold shadow-sm border"
          style={{
            background: buttonBg,
            color: textColor,
          }}
        >
          بحث →
        </button>
      </div>

      {/* اختيار ألوان الخلفية */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-xs">لون البداية</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-8 w-8 rounded-md border"
              value={leftColor}
              onChange={(e) =>
                handleSideColorChange("hero_button_left_color", e.target.value)
              }
            />
            <Input
              className="text-xs"
              value={config.hero_button_left_color ?? ""}
              onChange={(e) =>
                handleSideColorChange("hero_button_left_color", e.target.value)
              }
              placeholder="#e5202a"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">لون النهاية</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-8 w-8 rounded-md border"
              value={rightColor}
              onChange={(e) =>
                handleSideColorChange(
                  "hero_button_right_color",
                  e.target.value,
                )
              }
            />
            <Input
              className="text-xs"
              value={config.hero_button_right_color ?? ""}
              onChange={(e) =>
                handleSideColorChange(
                  "hero_button_right_color",
                  e.target.value,
                )
              }
              placeholder="#f97316"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">لون نص الزر</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-8 w-8 rounded-md border"
              value={textColor}
              onChange={(e) =>
                onChange("hero_button_text_color", e.target.value)
              }
            />
            <Input
              className="text-xs"
              value={config.hero_button_text_color ?? ""}
              onChange={(e) =>
                onChange("hero_button_text_color", e.target.value)
              }
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      {/* كود الخلفية – متقدم (اختياري للمحترفين) */}
      <div className="space-y-2">
        <Label className="text-xs">
          كود خلفية الزر (CSS background)
          <span className="block text-[10px] text-muted-foreground">
            لا يحتاج تعديل في العادة، لكن لو حاب تستخدم كود جاهز من مصمم تقدر
            تحطه هنا.
          </span>
        </Label>
        <Textarea
          rows={3}
          value={config.hero_button_bg ?? ""}
          onChange={(e) => onChange("hero_button_bg", e.target.value)}
        />
      </div>
    </section>
  );
}
