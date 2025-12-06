import type { FilterConfig } from "./HeroSettingsShell";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

function hexToRgba(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  if (v.length !== 6) return hex;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SectionBackground({ config, onChange }: Props) {
  const mode = config.hero_bg_mode ?? "image";

  const leftColor = normalizeColor(config.hero_bg_left_color, "#3b82f6");
  const rightColor = normalizeColor(config.hero_bg_right_color, "#f43f5e");
  const baseColor = normalizeColor(config.hero_bg_base_color, "#0f172a");

  const autoGradient =
    `radial-gradient(circle at 0 0, ${hexToRgba(leftColor, 0.35)}, transparent 55%), ` +
    `radial-gradient(circle at 100% 100%, ${hexToRgba(rightColor, 0.35)}, transparent 55%), ` +
    `${hexToRgba(baseColor, 0.92)}`;

  const gradientBg = config.hero_bg_gradient || autoGradient;

  function applyGradientFromColors(
    newLeft: string,
    newRight: string,
    newBase: string,
  ) {
    const bg =
      `radial-gradient(circle at 0 0, ${hexToRgba(newLeft, 0.35)}, transparent 55%), ` +
      `radial-gradient(circle at 100% 100%, ${hexToRgba(newRight, 0.35)}, transparent 55%), ` +
      `${hexToRgba(newBase, 0.92)}`;
    onChange("hero_bg_gradient", bg);
  }

  function handleBgColorChange(
    key: "hero_bg_left_color" | "hero_bg_right_color" | "hero_bg_base_color",
    value: string,
  ) {
    onChange(key, value);
    const newLeft =
      key === "hero_bg_left_color" ? value : leftColor;
    const newRight =
      key === "hero_bg_right_color" ? value : rightColor;
    const newBase =
      key === "hero_bg_base_color" ? value : baseColor;
    applyGradientFromColors(newLeft, newRight, newBase);
  }

  function setMode(newMode: "image" | "gradient") {
    onChange("hero_bg_mode", newMode);
  }

  return (
    <section
      id="hero-bg-settings"
      className="border rounded-2xl p-4 md:p-5 bg-white/60 space-y-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">مظهر الفلتر في الهيرو</h2>
          <p className="text-[11px] text-muted-foreground">
            اختر هل خلفية الهيرو تكون صورة، أو تدرج ألوان متدرّج.
          </p>
        </div>

        {/* اختيار الوضع: صورة / تدرج */}
        <div className="inline-flex rounded-full border bg-muted p-1 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("image")}
            className={`px-3 py-1 rounded-full ${
              mode === "image" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"
            }`}
          >
            صورة خلفية
          </button>
          <button
            type="button"
            onClick={() => setMode("gradient")}
            className={`px-3 py-1 rounded-full ${
              mode === "gradient"
                ? "bg-background font-semibold shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            ألوان متدرجة
          </button>
        </div>
      </div>

      {/* معاينة مصغرة لخلفية الهيرو */}
      <div className="space-y-1">
        <Label className="text-xs">معاينة الخلفية</Label>
        <div
          className="w-full h-20 rounded-xl border"
          style={{
            background:
              mode === "image"
                ? `url(${config.background_image_url || ""}) center/cover no-repeat`
                : gradientBg,
          }}
        />
      </div>

      {mode === "image" ? (
        <>
          <div className="space-y-2">
            <Label className="text-xs">رابط صورة الخلفية</Label>
            <Input
              value={config.background_image_url ?? ""}
              onChange={(e) => onChange("background_image_url", e.target.value)}
              placeholder="https://example.com/hero-bg.jpg"
            />
          </div>
        </>
      ) : (
        <>
          {/* ألوان التدرج */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">لون الجهة اليسرى</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-8 w-8 rounded-md border"
                  value={leftColor}
                  onChange={(e) =>
                    handleBgColorChange("hero_bg_left_color", e.target.value)
                  }
                />
                <Input
                  className="text-xs"
                  value={config.hero_bg_left_color ?? ""}
                  onChange={(e) =>
                    handleBgColorChange("hero_bg_left_color", e.target.value)
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
                    handleBgColorChange("hero_bg_right_color", e.target.value)
                  }
                />
                <Input
                  className="text-xs"
                  value={config.hero_bg_right_color ?? ""}
                  onChange={(e) =>
                    handleBgColorChange("hero_bg_right_color", e.target.value)
                  }
                  placeholder="#f43f5e"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">لون الخلفية الأساسية (غامق)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-8 w-8 rounded-md border"
                  value={baseColor}
                  onChange={(e) =>
                    handleBgColorChange("hero_bg_base_color", e.target.value)
                  }
                />
                <Input
                  className="text-xs"
                  value={config.hero_bg_base_color ?? ""}
                  onChange={(e) =>
                    handleBgColorChange("hero_bg_base_color", e.target.value)
                  }
                  placeholder="#0f172a"
                />
              </div>
            </div>
          </div>

          {/* كود الـ gradient يدوي (للمحترفين) */}
          <div className="space-y-2">
            <Label className="text-xs">
              كود الخلفية (CSS background)
              <span className="block text-[10px] text-muted-foreground">
                يتولّد تلقائيًا من الألوان، لكن يمكنك تعديله يدويًا لو حاب.
              </span>
            </Label>
            <Textarea
              rows={3}
              value={config.hero_bg_gradient ?? ""}
              onChange={(e) => onChange("hero_bg_gradient", e.target.value)}
            />
          </div>
        </>
      )}
    </section>
  );
}
