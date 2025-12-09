// FILE: src/app/(admin)/dashboard/widget-insights-queries/page.tsx

"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { QueriesTable } from "./_components/queries-table";
import { ContentTasksTable } from "./_components/content-tasks-table";
import { CoverageTable } from "./_components/coverage-table";

export default function WidgetInsightsQueriesPage() {
  const [generating, setGenerating] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [days] = useState("30"); // حالياً بس نستخدمها في API التوليد

  const handleGenerateTasks = async () => {
    try {
      setGenerating(true);
      const res = await fetch(
        "/api/dashboard/widget-insights-queries/generate-content-tasks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threshold: 3,
            days: Number(days),
          }),
        },
      );

      const json = await res.json();
      console.log("generate-content-tasks result", json);
      setRefreshFlag((x) => x + 1);
    } catch (err) {
      console.error("generate-content-tasks error", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* الهيدر */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Widget Insights – Queries</h1>
          <p className="text-sm text-muted-foreground">
            عبارات الفلتر (الكلمة + الموديل + السنة) الأكثر استخداماً في
            الويدجت، مع مهام محتوى وفرص فلتر مبنية عليها.
          </p>
        </div>

        <Button onClick={handleGenerateTasks} disabled={generating}>
          {generating ? "جاري توليد مهام المحتوى..." : "توليد مهام المحتوى"}
        </Button>
      </div>

      <Tabs defaultValue="queries" className="w-full">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="queries">فرص الفلتر (Queries)</TabsTrigger>
          <TabsTrigger value="content-tasks">مهام المحتوى</TabsTrigger>
          <TabsTrigger value="coverage">
            فرص الفلتر حسب الكلمة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queries" className="mt-4">
          <QueriesTable />
        </TabsContent>

        <TabsContent value="content-tasks" className="mt-4">
          <ContentTasksTable refreshFlag={refreshFlag} />
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <CoverageTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
