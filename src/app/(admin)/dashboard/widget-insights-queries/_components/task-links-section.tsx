// FILE: src/app/(admin)/dashboard/widget-insights-queries/_components/task-links-section.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ContentLink = {
  id: number;
  task_id: number;
  url: string;
  type: "product" | "category" | "blog" | "other";
  notes: string | null;
  created_at: string;
};

type SeoAudit = {
  id: number;
  url: string;
  keyword: string | null;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  word_count: number | null;
  has_keyword_in_title: boolean | null;
  has_keyword_in_h1: boolean | null;
  has_keyword_in_meta: boolean | null;
  status: "pending" | "ok" | "warnings" | "errors";
  last_checked_at: string | null;
};

type TaskLinksSectionProps = {
  taskId: number;
};

export function TaskLinksSection({ taskId }: TaskLinksSectionProps) {
  const [links, setLinks] = useState<ContentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ContentLink["type"]>("other");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/dashboard/widget-insights-queries/content-links?task_id=${taskId}`,
      );
      if (!res.ok) throw new Error("Failed to load links");
      const json = await res.json();
      setLinks(json.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [taskId]);

  const handleAddLink = async () => {
    if (!url.trim()) return;
    try {
      setSaving(true);
      const res = await fetch(
        `/api/dashboard/widget-insights-queries/content-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: taskId,
            url,
            type,
            notes: notes.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        console.error(await res.text());
        return;
      }
      const json = await res.json();
      const newLink: ContentLink = json.data;
      setLinks((prev) => [...prev, newLink]);
      setDialogOpen(false);
      setUrl("");
      setType("other");
      setNotes("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (id: number) => {
    try {
      const res = await fetch(
        `/api/dashboard/widget-insights-queries/content-links?id=${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        console.error(await res.text());
        return;
      }
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mt-2 border-t pt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">روابط المحتوى المرتبطة بهذي المهمة</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              إضافة رابط
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة رابط محتوى</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm mb-1 block">الرابط (URL)</label>
                <Input
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm mb-1 block">نوع الصفحة</label>
                <Select
                  value={type}
                  onValueChange={(val) =>
                    setType(val as ContentLink["type"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">صفحة منتج</SelectItem>
                    <SelectItem value="category">صفحة فئة</SelectItem>
                    <SelectItem value="blog">مقال / مدونة</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm mb-1 block">ملاحظات (اختياري)</label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: مقال تعريفي طويل، أو صفحة الكولكشن الرئيسية"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button onClick={handleAddLink} disabled={saving || !url.trim()}>
                  {saving ? "جاري الحفظ..." : "حفظ الرابط"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">جاري تحميل الروابط...</p>
      ) : links.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          ما في أي روابط مضافة لهذي المهمة حتى الآن.
        </p>
      ) : (
        <ul className="space-y-1">
          {links.map((link) => (
            <LinkWithAudit
              key={link.id}
              link={link}
              onDelete={() => handleDeleteLink(link.id)}
              taskId={taskId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LinkWithAudit({
  link,
  onDelete,
  taskId,
}: {
  link: ContentLink;
  onDelete: () => void;
  taskId: number;
}) {
  const [audit, setAudit] = useState<SeoAudit | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [h1, setH1] = useState("");
  const [wordCount, setWordCount] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const loadAudit = async () => {
    try {
      setLoadingAudit(true);
      const res = await fetch(
        `/api/dashboard/widget-insights-queries/seo-audits?url=${encodeURIComponent(
          link.url,
        )}`,
      );
      if (!res.ok) {
        console.error(await res.text());
        return;
      }
      const json = await res.json();
      setAudit(json.data ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link.url]);

  const handleSaveAudit = async () => {
    try {
      setSaving(true);
      const res = await fetch(
        `/api/dashboard/widget-insights-queries/seo-audits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: taskId,
            url: link.url,
            keyword: keyword || null,
            title: title || null,
            meta_description: metaDescription || null,
            h1: h1 || null,
            word_count: wordCount ? Number(wordCount) : null,
            has_keyword_in_title:
              keyword && title ? title.includes(keyword) : null,
            has_keyword_in_h1: keyword && h1 ? h1.includes(keyword) : null,
            has_keyword_in_meta:
              keyword && metaDescription
                ? metaDescription.includes(keyword)
                : null,
            status: "ok",
          }),
        },
      );
      if (!res.ok) {
        console.error(await res.text());
        return;
      }
      const json = await res.json();
      setAudit(json.data);
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-col gap-1 rounded-md border px-2 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium underline-offset-2 hover:underline break-all"
          >
            {link.url}
          </a>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              النوع:{" "}
              {
                {
                  product: "صفحة منتج",
                  category: "صفحة فئة",
                  blog: "مقال / مدونة",
                  other: "أخرى",
                }[link.type]
              }
            </span>
            {link.notes && (
              <span className="border-l pl-2">{link.notes}</span>
            )}
          </div>
          {audit && (
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
              <div>
                الحالة:{" "}
                <span className="font-semibold">
                  {audit.status === "ok"
                    ? "جيد"
                    : audit.status === "warnings"
                    ? "تحذيرات"
                    : audit.status === "errors"
                    ? "مشاكل"
                    : "قيد الفحص"}
                </span>
              </div>
              {audit.keyword && (
                <div>الكلمة المستهدفة: {audit.keyword}</div>
              )}
              <div className="flex flex-wrap gap-2">
                {audit.has_keyword_in_title != null && (
                  <span>
                    العنوان:{" "}
                    {audit.has_keyword_in_title ? "✅ يحتوي الكلمة" : "❌ لا يحتوي"}
                  </span>
                )}
                {audit.has_keyword_in_h1 != null && (
                  <span>
                    H1:{" "}
                    {audit.has_keyword_in_h1 ? "✅ يحتوي الكلمة" : "❌ لا يحتوي"}
                  </span>
                )}
                {audit.has_keyword_in_meta != null && (
                  <span>
                    الوصف:{" "}
                    {audit.has_keyword_in_meta ? "✅ يحتوي الكلمة" : "❌ لا يحتوي"}
                  </span>
                )}
                {audit.word_count != null && (
                  <span>عدد الكلمات: {audit.word_count}</span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onDelete}
          >
            ✕
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {audit ? "تعديل فحص SEO" : "إضافة فحص SEO"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>فحص SEO للرابط</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground break-all">
                  {link.url}
                </div>
                <div>
                  <label className="text-sm mb-1 block">الكلمة المستهدفة</label>
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={audit?.keyword || ""}
                  />
                </div>
                <div>
                  <label className="text-sm mb-1 block">العنوان (Title)</label>
                  <Textarea
                    rows={2}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={audit?.title || ""}
                  />
                </div>
                <div>
                  <label className="text-sm mb-1 block">
                    الوصف (Meta description)
                  </label>
                  <Textarea
                    rows={2}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder={audit?.meta_description || ""}
                  />
                </div>
                <div>
                  <label className="text-sm mb-1 block">H1</label>
                  <Input
                    value={h1}
                    onChange={(e) => setH1(e.target.value)}
                    placeholder={audit?.h1 || ""}
                  />
                </div>
                <div>
                  <label className="text-sm mb-1 block">عدد الكلمات</label>
                  <Input
                    type="number"
                    value={wordCount}
                    onChange={(e) => setWordCount(e.target.value)}
                    placeholder={
                      audit?.word_count != null
                        ? String(audit.word_count)
                        : ""
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSaveAudit}
                    disabled={saving}
                    type="button"
                  >
                    {saving ? "جاري الحفظ..." : "حفظ الفحص"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {loadingAudit && (
        <p className="text-[11px] text-muted-foreground mt-1">
          جاري تحميل فحص SEO...
        </p>
      )}
    </li>
  );
}
