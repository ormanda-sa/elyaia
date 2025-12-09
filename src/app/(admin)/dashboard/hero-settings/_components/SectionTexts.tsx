import type { FilterConfig } from "./HeroSettingsShell";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  config: FilterConfig;
  onChange: <K extends keyof FilterConfig>(key: K, value: FilterConfig[K]) => void;
};

export function SectionTexts({ config, onChange }: Props) {
  return (
    <section
      id="hero-texts"
      className="border rounded-2xl p-4 md:p-5 bg-white/60 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold">النصوص والعداد</h2>
        <p className="text-[11px] text-muted-foreground">
          عدّل عنوان الهيرو، وصفه، نص الشحن، وعدد القطع. نظام الوصف مبني على
          قوالب بسيطة وليس HTML مباشر.
        </p>
      </div>

      {/* عنوان الهيرو */}
      <div className="space-y-2">
        <Label className="text-xs">عنوان الهيرو</Label>
        <Input
          value={config.title_text ?? ""}
          onChange={(e) => onChange("title_text", e.target.value)}
          placeholder="ابحث عن قطع غيار سيارتك"
        />
      </div>

      {/* وصف قبل رقم العداد */}
      <div className="space-y-2">
        <Label className="text-xs">
          نص الوصف (قبل رقم العداد)
          <span className="block text-[10px] text-muted-foreground">
            استخدم <code>{`{counter}`}</code> مكان رقم القطع، مثلاً:
            <br />
            <code>
              ابحث بين {"{counter}"} قطعة غيار لجميع سيارات تويوتا الأصلية...
            </code>
          </span>
        </Label>
        <Textarea
          rows={2}
          value={config.hero_description_prefix ?? ""}
          onChange={(e) => onChange("hero_description_prefix", e.target.value)}
        />
      </div>

      {/* نص الشحن */}
      <div className="grid gap-4 md:grid-cols-2 max-w-xl">
        <div className="space-y-2">
          <Label className="text-xs">نص الشحن</Label>
          <Input
            value={config.hero_shipping_line ?? ""}
            onChange={(e) => onChange("hero_shipping_line", e.target.value)}
            placeholder="شحن سريع خلال 4-6 أيام وسعر منافس جداً"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">عدد القطع (counter_target)</Label>
          <Input
            type="number"
            value={config.counter_target ?? 0}
            onChange={(e) =>
              onChange("counter_target", Number(e.target.value) || 0)
            }
          />
        </div>
      </div>

      {/* مود متقدم: HTML كامل (اختياري) */}
      <div className="space-y-2">
        <Label className="text-xs">
          نص الوصف كـ HTML (متقدم)
          <span className="block text-[10px] text-muted-foreground">
            إذا احتجت تحكم كامل، يمكنك تعديل HTML مباشرة. لو تركته فارغًا، سيتم
            توليد HTML تلقائيًا من القوالب أعلاه.
          </span>
        </Label>
        <Textarea
          rows={4}
          value={config.subtitle_text ?? ""}
          onChange={(e) => onChange("subtitle_text", e.target.value)}
        />
      </div>
    </section>
  );
}
