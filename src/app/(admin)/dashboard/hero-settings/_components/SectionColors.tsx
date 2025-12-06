import type { FilterConfig } from "./HeroSettingsShell";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Props = {
  config: FilterConfig;
  onChange: <K extends keyof FilterConfig>(key: K, value: FilterConfig[K]) => void;
};

// يرجّع قيمة صالحة لـ input[type=color]
function normalizeColor(value: string | null | undefined, fallback: string): string {
  const v = (value || "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
    return v;
  }
  return fallback;
}

type ColorFieldProps = {
  label: string;
  description?: string;
  value: string | null;
  fallback: string;
  onChange: (newValue: string) => void;
};

function ColorField({
  label,
  description,
  value,
  fallback,
  onChange,
}: ColorFieldProps) {
  const hex = value ?? "";
  const safe = normalizeColor(value, fallback);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {description && (
        <p className="text-[10px] text-muted-foreground">{description}</p>
      )}

      <div className="flex items-center gap-3">
        {/* color picker */}
        <input
          type="color"
          className="h-8 w-8 rounded-md border bg-transparent cursor-pointer"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
        />

        {/* حقل النص */}
        <Input
          className="text-xs"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
        />

        {/* معاينة صغيرة */}
        <div
          className="h-6 w-6 rounded-full border border-black/10"
          style={{ backgroundColor: safe }}
        />
      </div>
    </div>
  );
}

export function SectionColors({ config, onChange }: Props) {
  return (
    <section
      id="hero-colors"
      className="border rounded-2xl p-4 md:p-5 bg-white/60 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold">ألوان الهوية</h2>
        <p className="text-[11px] text-muted-foreground">
          تحكم في ألوان العنوان، الوصف، رقم العداد، نص الشحن ودوائر الخطوات، مع معاينة فورية لكل لون.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ColorField
          label="اللون الأساسي (primary_color)"
          description="يُستخدم كلون رئيسي في حدود الفلتر وبعض العناصر التفاعلية."
          value={config.primary_color}
          fallback="#e5202a"
          onChange={(v) => onChange("primary_color", v)}
        />
        <ColorField
          label="لون عنوان الهيرو"
          value={config.hero_title_color}
          fallback="#ffffff"
          onChange={(v) => onChange("hero_title_color", v)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ColorField
          label="لون نص الوصف"
          value={config.hero_desc_color}
          fallback="#f9fafb"
          onChange={(v) => onChange("hero_desc_color", v)}
        />
        <ColorField
          label="لون رقم العداد"
          description="اللون الذي يظهر به رقم 181,825 مثلاً."
          value={config.counter_color}
          fallback="#e5202a"
          onChange={(v) => onChange("counter_color", v)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ColorField
          label="لون نص الشحن"
          description='مثال: "شحن سريع خلال 4-6 أيام".'
          value={config.shipping_color}
          fallback="#2563eb"
          onChange={(v) => onChange("shipping_color", v)}
        />
        <ColorField
          label="لون دوائر الخطوات (01 / 02 / 03)"
          value={config.step_badge_bg}
          fallback="#d50026"
          onChange={(v) => onChange("step_badge_bg", v)}
        />
      </div>

      <div className="max-w-sm">
        <ColorField
          label="لون عناصر Choices (الفوكس / التاقات)"
          description="يُستخدم في حدود الحقول والتاقات المختارة داخل الفلتر."
          value={config.choices_primary_color}
          fallback="#e5202a"
          onChange={(v) => onChange("choices_primary_color", v)}
        />
      </div>
    </section>
  );
}
