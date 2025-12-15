// FILE: src/app/(admin)/dashboard/settings/templates/_components/template-builder.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const PLACEHOLDERS = [
  "{{product_title}}",
  "{{product_image_url}}",
  "{{new_price}}",
  "{{original_price}}",
  "{{tracking_url}}",
  "{{store_name}}",
  "{{store_logo_url}}", // 👈 الشعار
  "{{coupon_code}}",
  "{{ends_at}}",
];

const PREVIEW_VALUES = {
  product_title: "رديتر كامري 2018 أصلي",
  product_image_url:
    "https://dummyimage.com/320x240/f3f4f6/111827&text=%D8%B5%D9%88%D8%B1%D8%A9+%D9%85%D9%86%D8%AA%D8%AC",
  new_price: "450",
  original_price: "520",
  tracking_url: "https://0.com.sa/product",
  store_name: "متجر درب",
  store_logo_url:
    "https://dummyimage.com/140x40/111827/f9fafb&text=DARB+LOGO", // 👈 شعار تجريبي للمعاينة
  coupon_code: "DARB10",
  ends_at: "2025-12-30",
};

function applyPreview(str: string) {
  let out = str || "";
  for (const key in PREVIEW_VALUES) {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    out = out.replace(re, (PREVIEW_VALUES as any)[key]);
  }
  return out;
}

export default function TemplateBuilder() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    code: "",
    name: "",
    description: "",
    subject_template: "",
    text_template: "",
    html_template: "",
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    const res = await fetch("/api/dashboard/settings/email/templates");
    const data = await res.json();
    setTemplates(data);
  }

  function startCreate() {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      description: "",
      subject_template: "نزل سعر {{product_title}} 🎉",
      text_template:
        "السلام عليكم،\nنزل سعر {{product_title}} إلى {{new_price}} ريال.",
      html_template: DEFAULT_HTML,
      is_active: true,
      is_default: false,
    });
    setOpen(true);
  }

  function startEdit(t: any) {
    setEditing(t);
    setForm(t);
    setOpen(true);
  }

  async function saveTemplate() {
    setSaving(true);

    const url = editing
      ? `/api/dashboard/settings/email/templates/${editing.id}`
      : `/api/dashboard/settings/email/templates`;

    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (res.ok) {
      await loadTemplates();
      setOpen(false);
      setEditing(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">قوالب البريد الإلكتروني</h1>
          <p className="text-sm text-muted-foreground">
            إنشاء وتعديل قوالب الإيميل المستخدمة في حملات Price Drop، مع
            معاينة مباشرة.
          </p>
        </div>
        <Button size="sm" onClick={startCreate}>
          <Plus className="h-4 w-4 ml-1" />
          قالب جديد
        </Button>
      </div>

      {/* LIST */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                {t.name}
                {t.is_default && (
                  <Badge variant="outline" className="text-[10px]">
                    افتراضي
                  </Badge>
                )}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">{t.code}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs line-clamp-2">{t.subject_template}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
                <Pencil className="h-3 w-3 mr-1" />
                تعديل
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500"
                onClick={async () => {
                  await fetch(
                    `/api/dashboard/settings/email/templates/${t.id}`,
                    { method: "DELETE" },
                  );
                  loadTemplates();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* BUILDER OVERLAY */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-base">
                {editing ? "تعديل القالب" : "إنشاء قالب جديد"}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                إغلاق
              </Button>
            </div>

            {/* CONTENT */}
            <div className="flex flex-1 overflow-hidden">
              {/* LEFT: FORM + TABS */}
              <div className="w-[55%] border-l p-4 overflow-y-auto space-y-4">
                <Tabs defaultValue="general">
                  <TabsList className="grid grid-cols-4 text-xs">
                    <TabsTrigger value="general">عام</TabsTrigger>
                    <TabsTrigger value="text">نص</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="vars">المتغيرات</TabsTrigger>
                  </TabsList>

                  {/* GENERAL */}
                  <TabsContent value="general" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>كود القالب</Label>
                        <Input
                          value={form.code}
                          onChange={(e) =>
                            setForm({ ...form, code: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>اسم القالب</Label>
                        <Input
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>الوصف</Label>
                      <Input
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label>عنوان الإيميل</Label>
                      <Input
                        value={form.subject_template}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            subject_template: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.is_active}
                          onCheckedChange={(v) =>
                            setForm({ ...form, is_active: v })
                          }
                        />
                        <span className="text-xs">مفعّل</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.is_default}
                          onCheckedChange={(v) =>
                            setForm({ ...form, is_default: v })
                          }
                        />
                        <span className="text-xs">افتراضي</span>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TEXT */}
                  <TabsContent value="text" className="mt-4 space-y-2">
                    <Label className="text-xs">النص العادي (Text)</Label>
                    <Textarea
                      className="min-h-[230px] font-mono text-xs"
                      value={form.text_template}
                      onChange={(e) =>
                        setForm({ ...form, text_template: e.target.value })
                      }
                    />
                  </TabsContent>

                  {/* HTML */}
                  <TabsContent value="html" className="mt-4 space-y-2">
                    <Label className="text-xs">HTML</Label>
                    <Textarea
                      className="min-h-[300px] font-mono text-xs"
                      value={form.html_template}
                      onChange={(e) =>
                        setForm({ ...form, html_template: e.target.value })
                      }
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      ضع شعار المتجر في أي مكان باستخدام{" "}
                      <code className="bg-muted px-1 rounded">
                        {"<img src=\"{{store_logo_url}}\" />"}
                      </code>
                    </p>
                  </TabsContent>

                  {/* VARIABLES */}
                  <TabsContent value="vars" className="mt-4 space-y-3">
                    <Label className="text-xs">المتغيرات المتاحة</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PLACEHOLDERS.map((ph) => (
                        <Button
                          key={ph}
                          variant="outline"
                          size="sm"
                          className="justify-start text-xs"
                          onClick={() =>
                            navigator.clipboard.writeText(ph).catch(() => {})
                          }
                        >
                          {ph}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      اضغط على المتغير ليتم نسخه، ثم ألصقه في الـ HTML أو النص.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

              {/* RIGHT: PREVIEW */}
              <div className="w-[45%] bg-gray-50 p-4 overflow-y-auto">
                <Card className="shadow-sm border">
                  <CardHeader>
                    <p className="text-xs text-muted-foreground">
                      من: offers@darb.com.sa
                    </p>
                    <p className="font-semibold text-sm">
                      {applyPreview(form.subject_template || "")}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="bg-white rounded-md p-4 text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: applyPreview(form.html_template || ""),
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* FOOTER */}
            <div className="border-t p-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                إلغاء
              </Button>
              <Button size="sm" onClick={saveTemplate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                حفظ القالب
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// HTML افتراضي فيه الشعار + صورة المنتج + نص العرض
const DEFAULT_HTML = `
<!doctype html>
<html lang="ar" dir="rtl">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:16px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <!-- الهيدر مع الشعار -->
            <tr>
              <td align="center" style="padding:12px 20px;background-color:#111827;">
                <img
                  src="{{store_logo_url}}"
                  alt="{{store_name}}"
                  style="max-height:40px;display:block;margin:0 auto 6px auto;"
                />
                <p style="margin:0;font-size:11px;color:#9ca3af;">
                  رسالة عرض من {{store_name}}
                </p>
              </td>
            </tr>

            <!-- مقدمة -->
            <tr>
              <td style="padding:16px 20px 8px 20px;">
                <p style="margin:0 0 8px 0;font-size:14px;color:#111827;">مرحبًا 👋</p>
                <p style="margin:0;font-size:13px;color:#4b5563;">
                  لاحظنا إنك مهتم بالمنتج التالي 👇
                </p>
              </td>
            </tr>

            <!-- بطاقة المنتج -->
            <tr>
              <td style="padding:0 16px 16px 16px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;border:1px solid #e5e7eb;background-color:#f9fafb;">
                  <tr>
                    <!-- صورة المنتج -->
                    <td style="width:160px;padding:12px;">
                      <img
                        src="{{product_image_url}}"
                        alt="{{product_title}}"
                        style="display:block;width:100%;max-width:160px;border-radius:8px;border:1px solid #e5e7eb;object-fit:cover;"
                      />
                    </td>

                    <!-- تفاصيل المنتج -->
                    <td style="padding:12px 12px 12px 4px;vertical-align:top;">
                      <p style="margin:0 0 6px 0;font-size:13px;color:#111827;font-weight:600;line-height:1.5;">
                        {{product_title}}
                      </p>

                      <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;">
                        السعر الحالي:
                        <span style="font-weight:600;color:#16a34a;">
                          {{new_price}}
                        </span>
                        ريال
                      </p>

                      <p style="margin:0 0 4px 0;font-size:12px;color:#9ca3af;">
                        السعر السابق:
                        <span style="text-decoration:line-through;">
                          {{original_price}}
                        </span>
                        ريال
                      </p>

                      <p style="margin:6px 0 0 0;font-size:11px;color:#9ca3af;">
                        العرض متاح لفترة محدودة، لا يفوتك 🤝
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td colspan="2" style="padding:0 14px 12px 14px;">
                      <a href="{{tracking_url}}"
                         style="
                           display:inline-block;
                           padding:10px 20px;
                           border-radius:999px;
                           background:linear-gradient(to left,#f97316,#fb923c);
                           color:#ffffff;
                           font-size:13px;
                           font-weight:600;
                           text-decoration:none;
                           margin-top:6px;
                           text-align:center;
                         ">
                        شوف العرض الآن في المتجر
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- الفوتر -->
            <tr>
              <td style="padding:10px 20px 14px 20px;">
                <p style="margin:0;font-size:11px;color:#9ca3af;">
                  مع تحيات
                  <span style="color:#111827;font-weight:500;">{{store_name}}</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
