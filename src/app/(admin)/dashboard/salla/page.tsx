// FILE: src/app/(admin)/dashboard/token/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Status = "loading" | "connected" | "disconnected" | "error";

type TokenState = {
  status: Status;
  storeName?: string;
  sallaStoreId?: string;
  hasToken?: boolean;
};

export default function TokenPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">التكاملات (Integrations)</h1>
        <p className="text-sm text-muted-foreground">
          هنا تربط نظام Darb مع المنصات الخارجية مثل سِلّة. ابدأ بربط سِلّة
          عشان نقدر نقرأ أسعار المنتجات، نعدّل أسعار الحملات، وننشئ أكواد خصم
          تلقائياً.
        </p>
      </header>

      <div className="space-y-6">
        <SallaTokenSection />
        {/* مستقبلاً تقدر تضيف هنا كروت لتكاملات أخرى */}
      </div>
    </div>
  );
}

function SallaTokenSection() {
  const [state, setState] = useState<TokenState>({ status: "loading" });
  const [tokenInput, setTokenInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, status: "loading" }));
      try {
        const res = await fetch("/api/dashboard/salla/token");
        if (!res.ok) throw new Error("failed");
        const data = await res.json();

        if (cancelled) return;

        setState({
          status: data.status === "connected" ? "connected" : "disconnected",
          storeName: data.store_name,
          sallaStoreId: data.salla_store_id,
          hasToken: data.has_token,
        });

        if (data.has_token) {
          // ما نعرض التوكن الحقيقي لأسباب أمان
          setTokenInput("************");
        } else {
          setTokenInput("");
        }
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load token state", e);
        setState({ status: "error" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!tokenInput || tokenInput === "************") return;

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/salla/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: tokenInput }),
      });

      if (!res.ok) {
        console.error("Failed to save token");
        setState((s) => ({ ...s, status: "error" }));
        return;
      }

      setState((s) => ({
        ...s,
        status: "connected",
        hasToken: true,
      }));
      setTokenInput("************");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/dashboard/salla/token", {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Failed to delete token");
        setState((s) => ({ ...s, status: "error" }));
        return;
      }

      setState((s) => ({
        ...s,
        status: "disconnected",
        hasToken: false,
      }));
      setTokenInput("");
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge = (() => {
    if (state.status === "loading") {
      return (
        <Badge variant="outline" className="text-[11px]">
          جاري الفحص...
        </Badge>
      );
    }
    if (state.status === "connected") {
      return (
        <Badge className="text-[11px] bg-emerald-600 hover:bg-emerald-600">
          متصل مع سِلّة
        </Badge>
      );
    }
    if (state.status === "disconnected") {
      return (
        <Badge variant="outline" className="text-[11px]">
          غير متصل
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="text-[11px]">
        خطأ في الاتصال
      </Badge>
    );
  })();

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">
            ربط سِلّة (Salla)
          </CardTitle>
          {state.storeName && (
            <p className="text-xs text-muted-foreground">
              المتجر: {state.storeName}
              {state.sallaStoreId && (
                <>
                  {" "}
                  — رقم سِلّة:{" "}
                  <span className="font-mono">{state.sallaStoreId}</span>
                </>
              )}
            </p>
          )}
          {!state.storeName && (
            <p className="text-xs text-muted-foreground">
              اربط متجرك في سِلّة عشان نتحكم في الأسعار وأكواد الخصم من نفس
              لوحة Darb.
            </p>
          )}
        </div>
        {statusBadge}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="space-y-1.5">
          <Label htmlFor="salla-token">Salla API Token</Label>
          <Input
            id="salla-token"
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ألصق توكن سلة هنا"
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            تأكد إن التوكن فيه صلاحيات قراءة وكتابة على المنتجات، والأسعار،
            وأكواد الخصم.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          {state.hasToken && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={handleDisable}
              disabled={deleting || state.status === "loading"}
            >
              {deleting ? "جاري الإيقاف..." : "إيقاف التكامل"}
            </Button>
          )}

          <Button
            type="button"
            className="rounded-xl"
            onClick={handleSave}
            disabled={
              saving ||
              !tokenInput ||
              tokenInput.trim().length === 0 ||
              tokenInput === "************"
            }
          >
            {saving ? "جاري الحفظ..." : "حفظ التوكن"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
