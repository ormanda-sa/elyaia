"use client";

import { useEffect, useState } from "react";
import { HighInterestProduct, PriceDropCampaign } from "../page";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { arSA } from "date-fns/locale";

type Mode = "create" | "edit";

type Props = {
  mode?: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: HighInterestProduct | null;
  onCreated?: () => void;
  existingCampaign?: PriceDropCampaign | null;
  onUpdated?: () => void;
};

export function CreateCampaignSheet({
  mode = "create",
  open,
  onOpenChange,
  product,
  onCreated,
  existingCampaign,
  onUpdated,
}: Props) {
  const [discountType, setDiscountType] = useState<"price" | "coupon">("price");

  const [originalPrice, setOriginalPrice] = useState<string>("");
  const [sallaBasePrice, setSallaBasePrice] = useState<number | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [priceDiscountPercent, setPriceDiscountPercent] =
    useState<string>("");

  const [couponCode, setCouponCode] = useState<string>("");
  const [couponPercent, setCouponPercent] = useState<string>("10");
  const [couponFreeShipping, setCouponFreeShipping] =
    useState<boolean>(false);

  const [sendOnsite, setSendOnsite] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(() =>
    addDays(new Date(), 2),
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ============ جلب الأسعار من سِلّة (وضع إنشاء فقط) ============ //
 // FILE: src/app/(admin)/dashboard/price-drop/_components/create-campaign-sheet.tsx
// 👇 عدّل ملفك بهذا الشكل (كل شيء مثل ما هو، بس أضف useEffect الثاني)

// ... بقية الاستيرادات والكود فوق زي ما عندك بالضبط ...

// ============ جلب الأسعار من سِلّة (وضع إنشاء فقط) ============ //
useEffect(() => {
  if (mode !== "create") return;
  if (!open || !product) return;
  if (discountType !== "price") return;

  let cancelled = false;
  const productId = product.product_id;

  async function loadPrice() {
    setPriceLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/product-price?product_id=${encodeURIComponent(
          productId,
        )}`,
      );
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (cancelled) return;

      const original = data.original_price as number | null;
      const discount = data.discount_price as number | null;

      if (original != null) {
        setOriginalPrice(String(original));
        setSallaBasePrice(original);
      } else {
        setOriginalPrice("");
        setSallaBasePrice(null);
      }

      if (discount != null && original != null && discount < original) {
        setNewPrice(String(discount));
        const pct = Math.round(((original - discount) / original) * 100);
        if (pct > 0 && pct < 100) {
          setPriceDiscountPercent(String(pct));
        } else {
          setPriceDiscountPercent("");
        }
      } else {
        setNewPrice("");
        setPriceDiscountPercent("");
      }
    } catch (e) {
      if (cancelled) return;
      console.error("Failed to load price from Salla", e);
    } finally {
      if (!cancelled) setPriceLoading(false);
    }
  }

  loadPrice();
  return () => {
    cancelled = true;
  };
}, [mode, open, product, discountType]);

// ============ تعبئة البيانات في وضع التعديل ============ //
useEffect(() => {
  if (mode !== "edit") return;
  if (!open || !existingCampaign) return;

  setDiscountType(existingCampaign.discount_type);
  setNewPrice(String(existingCampaign.new_price));
  if (existingCampaign.discount_percent != null) {
    setPriceDiscountPercent(String(existingCampaign.discount_percent));
    if (existingCampaign.discount_type === "coupon") {
      setCouponPercent(String(existingCampaign.discount_percent));
    }
  }

  if (existingCampaign.discount_type === "coupon") {
    setCouponCode(existingCampaign.coupon_code ?? "");
  }

  setSendOnsite(existingCampaign.send_onsite);
  setSendEmail(existingCampaign.send_email);
  setSendWhatsapp(existingCampaign.send_whatsapp);

  if (existingCampaign.ends_at) {
    setEndDate(new Date(existingCampaign.ends_at));
  } else {
    setEndDate(addDays(new Date(), 2));
  }
  setStartDate(new Date());

  setErrorMessage(null);
}, [mode, open, existingCampaign]);

// 👇 useEffect إضافي بسيط: في وضع التعديل + نوع السعر، جيب السعر الأساسي من سلة لنفس الخانة فقط
useEffect(() => {
  if (mode !== "edit") return;
  if (!open || !existingCampaign) return;
  if (discountType !== "price") return;

  let cancelled = false;
  const productId = existingCampaign.product_id;

  async function loadBasePrice() {
    setPriceLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/product-price?product_id=${encodeURIComponent(
          productId,
        )}`,
      );
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (cancelled) return;

      const original = data.original_price as number | null;

      if (original != null) {
        setOriginalPrice(String(original));   // 👈 خانة السعر الأساسي من سِلّة
        setSallaBasePrice(original);
      }
    } catch (e) {
      if (cancelled) return;
      console.error("Failed to load base price from Salla (edit)", e);
    } finally {
      if (!cancelled) setPriceLoading(false);
    }
  }

  loadBasePrice();
  return () => {
    cancelled = true;
  };
}, [mode, open, existingCampaign, discountType]);

// ... باقي الكومبوننت نفس ما هو عندك بدون تغيير ...

  // ============ تعبئة البيانات في وضع التعديل ============ //
  useEffect(() => {
    if (mode !== "edit") return;
    if (!open || !existingCampaign) return;

    setDiscountType(existingCampaign.discount_type);
    setOriginalPrice(String(existingCampaign.original_price));
    setNewPrice(String(existingCampaign.new_price));
    if (existingCampaign.discount_percent != null) {
      setPriceDiscountPercent(String(existingCampaign.discount_percent));
      if (existingCampaign.discount_type === "coupon") {
        setCouponPercent(String(existingCampaign.discount_percent));
      }
    }

    if (existingCampaign.discount_type === "coupon") {
      setCouponCode(existingCampaign.coupon_code ?? "");
      // 👇 هذا هو السطر المهم: قراءة الشحن المجاني من الحملة
      setCouponFreeShipping(!!existingCampaign.coupon_free_shipping);
    } else {
      setCouponFreeShipping(false);
    }

    setSendOnsite(existingCampaign.send_onsite);
    setSendEmail(existingCampaign.send_email);
    setSendWhatsapp(existingCampaign.send_whatsapp);

    if (existingCampaign.ends_at) {
      setEndDate(new Date(existingCampaign.ends_at));
    } else {
      setEndDate(addDays(new Date(), 2));
    }
    setStartDate(new Date());

    setErrorMessage(null);
  }, [mode, open, existingCampaign]);

  // ======== حسابات الخصم للسعر ======== //

  const vatRate = 0.15;
  const originalWithVat =
    sallaBasePrice != null
      ? Number((sallaBasePrice * (1 + vatRate)).toFixed(2))
      : null;

  const discountedWithVat =
    newPrice && !Number.isNaN(Number(newPrice))
      ? Number((Number(newPrice) * (1 + vatRate)).toFixed(2))
      : null;

  const handlePricePercentChange = (value: string) => {
    setPriceDiscountPercent(value);
    const percent = Number(value);
    const original = Number(originalPrice);

    if (
      !value ||
      Number.isNaN(percent) ||
      percent <= 0 ||
      percent >= 100 ||
      Number.isNaN(original) ||
      original <= 0
    ) {
      return;
    }

    const discounted = original * (1 - percent / 100);
    setNewPrice(discounted.toFixed(2));
  };

  const handleNewPriceChange = (value: string) => {
    setNewPrice(value);
    const np = Number(value);
    const op = Number(originalPrice);

    if (
      !value ||
      Number.isNaN(np) ||
      np <= 0 ||
      Number.isNaN(op) ||
      op <= 0
    ) {
      setPriceDiscountPercent("");
      return;
    }

    const pct = Math.round(((op - np) / op) * 100);
    if (pct > 0 && pct < 100) {
      setPriceDiscountPercent(String(pct));
    } else {
      setPriceDiscountPercent("");
    }
  };

  // ======== حساب مدة الحملة من بداية/نهاية ======== //

  function computeDurationHours(): number {
    const start = startDate ?? new Date();
    const end = endDate ?? addDays(start, 2);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    return hours;
  }

  const tomorrow = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return addDays(d, 1);
  })();

  // ======== إرسال النموذج ======== //

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "edit" && !existingCampaign) return;
    if (mode === "create" && !product) return;

    setErrorMessage(null);

    if (!originalPrice) return;
    if (discountType === "price" && !newPrice) return;
    if (discountType === "coupon" && !couponPercent) return;
    if (!startDate || !endDate) return;

    const durationHours = computeDurationHours();

    setSubmitting(true);
    try {
      const body: any = {
        product_id:
          mode === "create"
            ? product!.product_id
            : existingCampaign!.product_id,
        product_title:
          mode === "create"
            ? product!.product_title
            : existingCampaign!.product_title,
        product_url:
          mode === "create"
            ? product!.product_url
            : existingCampaign!.product_url,
        original_price: Number(originalPrice),
        new_price:
          discountType === "price"
            ? Number(newPrice)
            : Number(originalPrice),
        discount_type: discountType,
        coupon_code:
          discountType === "coupon"
            ? (couponCode.trim() || undefined)
            : undefined,
        duration_hours: durationHours,
        send_onsite: sendOnsite,
        send_email: sendEmail,
        send_whatsapp: sendWhatsapp,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };

      if (discountType === "coupon") {
        body.discount_percent = Number(couponPercent || "10");
        body.coupon_free_shipping = couponFreeShipping;
      }

      let res: Response;
      if (mode === "create") {
        res = await fetch("/api/dashboard/price-drop/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(
          `/api/dashboard/price-drop/campaigns/${existingCampaign!.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
      }

      if (!res.ok) {
        let err: any = null;
        try {
          err = await res.json();
        } catch {}

        if (err?.error === "COUPON_CODE_EXISTS") {
          setErrorMessage(
            err.message ||
              "الكوبون بهذا الاسم موجود مسبقاً في سِلّة. غيّر الكود أو اتركه فاضي لتوليد كود جديد.",
          );
        } else if (err?.error === "SALLA_SYNC_FAILED") {
          setErrorMessage("تعذر المزامنة مع سِلّة. تأكد من صلاحيات التوكن.");
        } else {
          setErrorMessage("تعذر حفظ الحملة. حاول مرة أخرى لاحقاً.");
        }

        return;
      }

      if (mode === "create") {
        onCreated?.();
      } else {
        onUpdated?.();
      }

      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ======== UI ======== //

  const title =
    mode === "create" ? "إنشاء حملة خصم" : "تعديل حملة خصم";
  const submitLabel =
    mode === "create" ? "إطلاق الحملة" : "حفظ التعديلات";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-sm space-y-3 px-4 py-4">
        <SheetHeader className="space-y-1 text-right">
          <SheetTitle className="text-base font-semibold">
            {title}
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            {mode === "create"
              ? "عرض سريع ومحدد بوقت على هذا المنتج."
              : "عدّل إعدادات الحملة الحالية."}
          </SheetDescription>
        </SheetHeader>

        {/* المنتج المستهدف */}
        {product && mode === "create" && (
          <div className="rounded-lg border px-3 py-2 space-y-1.5">
            <span className="text-xs font-semibold">المنتج المستهدف</span>
            <div className="text-sm font-medium line-clamp-2">
              {product.product_title || product.product_id}
            </div>
            {product.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary underline underline-offset-4"
              >
                عرض المنتج في المتجر
              </a>
            )}
            <p className="text-[10px] text-muted-foreground">
              مشاهدات: {product.total_views} — العملاء:{" "}
              {product.unique_viewers}
            </p>
          </div>
        )}

        {mode === "edit" && existingCampaign && (
          <div className="rounded-lg border px-3 py-2 space-y-1.5">
            <span className="text-xs font-semibold">الحملة على</span>
            <div className="text-sm font-medium line-clamp-2">
              {existingCampaign.product_title || existingCampaign.product_id}
            </div>
            {existingCampaign.product_url && (
              <a
                href={existingCampaign.product_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary underline underline-offset-4"
              >
                عرض المنتج في المتجر
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* إعداد الخصم */}
          <div className="rounded-lg border px-3 py-2 space-y-2.5">
            <span className="text-xs font-semibold">إعداد الخصم</span>

            {/* نوع الخصم */}
            <div className="space-y-1">
              <Label className="text-[11px]">نوع الخصم</Label>
              <Select
                value={discountType}
                onValueChange={(v) => {
                  setDiscountType(v as "price" | "coupon");
                  setErrorMessage(null);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="اختر نوع الخصم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">تخفيض سعر المنتج</SelectItem>
                  <SelectItem value="coupon">إنشاء كوبون خصم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {discountType === "price" && (
              <div className="space-y-2">
                {/* السعر الأساسي من سلة */}
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    السعر الأساسي من سِلّة{" "}
                    {originalWithVat != null && (
                      <span className="text-[10px] text-muted-foreground">
                        (بعد الضريبة: {originalWithVat} ر.س)
                      </span>
                    )}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={originalPrice}
                      readOnly
                      disabled
                      className="h-8 text-sm bg-muted cursor-not-allowed"
                    />
                    {priceLoading && mode === "create" && (
                      <Spinner className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* نسبة الخصم + السعر بعد الخصم */}
                <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">نسبة الخصم</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        step="1"
                        value={priceDiscountPercent}
                        onChange={(e) =>
                          handlePricePercentChange(e.target.value)
                        }
                        placeholder="15"
                        className="h-8 text-center text-xs"
                      />
                      <span className="text-[11px] text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">
                      السعر بعد الخصم{" "}
                      {discountedWithVat != null && (
                        <span className="text-[10px] text-muted-foreground">
                          (بعد الضريبة: {discountedWithVat} ر.س)
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newPrice}
                      onChange={(e) => handleNewPriceChange(e.target.value)}
                      required
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {discountType === "coupon" && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">كود الكوبون</Label>
                  <Input
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="اتركه فاضي لتوليد كود تلقائي"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    نسبة الخصم في الكوبون (%)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={couponPercent}
                    onChange={(e) => setCouponPercent(e.target.value)}
                    placeholder="10"
                    required
                    className="h-8 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="space-y-0.5">
                    <Label className="text-[11px]">مع شحن مجاني؟</Label>
                    <p className="text-[10px] text-muted-foreground">
                      لو فعلته، الكوبون يعطي خصم + شحن مجاني.
                    </p>
                  </div>
                  <Switch
                    checked={couponFreeShipping}
                    onCheckedChange={setCouponFreeShipping}
                  />
                </div>

                {errorMessage && (
                  <p className="mt-1 text-[11px] text-red-600">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* مدة الحملة */}
          <div className="rounded-lg border px-3 py-2 space-y-1.5">
            <span className="text-xs font-semibold">مدة الحملة</span>

            {/* تاريخ بداية الحملة */}
            <div className="space-y-1">
              <Label className="text-[11px]">تاريخ بداية الحملة</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-between text-right text-xs",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    {startDate
                      ? format(startDate, "yyyy/MM/dd", { locale: arSA })
                      : "اختر تاريخ البداية"}
                    <CalendarIcon className="h-4 w-4 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={startDate ?? undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (date < today) return;
                      setStartDate(date);
                      if (endDate && endDate < date) {
                        setEndDate(addDays(date, 2));
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* تاريخ انتهاء الحملة */}
            <div className="space-y-1">
              <Label className="text-[11px]">تاريخ انتهاء الحملة</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-between text-right text-xs",
                      !endDate && "text-muted-foreground",
                    )}
                  >
                    {endDate
                      ? format(endDate, "yyyy/MM/dd", { locale: arSA })
                      : "اختر تاريخ الانتهاء"}
                    <CalendarIcon className="h-4 w-4 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={endDate ?? undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      if (startDate && date < startDate) return;
                      setEndDate(date);
                    }}
                    disabled={(date) => {
                      if (!startDate) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }
                      return date < startDate;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* قنوات الإرسال */}
          <div className="rounded-lg border px-3 py-2 space-y-1.5">
            <span className="text-xs font-semibold">قنوات الإرسال</span>
            <div className="space-y-1.5">
              <ChannelRow
                label="إظهار العرض داخل المتجر (On-site)"
                checked={sendOnsite}
                onCheckedChange={setSendOnsite}
              />
              <ChannelRow
                label="إرسال إيميل"
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
              <ChannelRow
                label="إرسال واتساب"
                checked={sendWhatsapp}
                onCheckedChange={setSendWhatsapp}
              />
            </div>
          </div>

          {/* الأزرار */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-xl px-3 text-xs"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              className={cn("h-8 rounded-xl px-4 text-xs")}
              disabled={submitting || (mode === "create" && !product)}
            >
              {submitting ? "جاري الحفظ..." : submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

type ChannelRowProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
};

function ChannelRow({ label, checked, onCheckedChange }: ChannelRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
