"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/* أيقونات صغيرة محلية بس عشان الشكل */
function IconDotsVertical(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={props.className ?? "h-4 w-4"}
    >
      <circle cx="12" cy="5" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}

function IconChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={props.className ?? "h-4 w-4"}
    >
      <path
        d="M14 6l-6 6l6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={props.className ?? "h-4 w-4"}
    >
      <path
        d="M10 6l6 6l-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* داتا ثابتة بس عشان نعبّي الجدول */
const rows = [
  {
    header: "Cover page",
    type: "Cover page",
    status: "Done",
    target: 18,
    limit: 5,
    reviewer: "Eddie Lake",
  },
  {
    header: "Table of contents",
    type: "Table of contents",
    status: "Done",
    target: 29,
    limit: 24,
    reviewer: "Eddie Lake",
  },
  {
    header: "Executive summary",
    type: "Narrative",
    status: "In Progress",
    target: 10,
    limit: 13,
    reviewer: "Eddie Lake",
  },
  {
    header: "Technical approach",
    type: "Narrative",
    status: "Done",
    target: 27,
    limit: 20,
    reviewer: "Jamik Tashpulatov",
  },
];

export function DataTable(_props: { data?: any[] }) {
  // بس عشان التحكم في الصفحة – مو مهم
  const [page, setPage] = React.useState(1);

  return (
    <Tabs defaultValue="outline" className="w-full flex-col gap-6">
      {/* Tabs + الهيدر فوق الجدول */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="outline">Outline</TabsTrigger>
          <TabsTrigger value="past-performance">
            Past Performance <Badge variant="secondary">3</Badge>
          </TabsTrigger>
          <TabsTrigger value="key-personnel">
            Key Personnel <Badge variant="secondary">2</Badge>
          </TabsTrigger>
          <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            + Add Section
          </Button>
        </div>
      </div>

      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        {/* الجدول نفسه */}
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[220px]">Header</TableHead>
                <TableHead>Section Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">
                        {row.header}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {row.type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="px-1.5 text-[11px]">
                      {row.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="px-1.5 text-[11px] gap-1"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {row.target}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {row.limit}
                  </TableCell>
                  <TableCell className="text-sm">{row.reviewer}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                    >
                      <IconDotsVertical />
                      <span className="sr-only">More</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* تحت الجدول – نفس فكرة pagination البسيطة */}
        <div className="flex items-center justify-between px-4">
          <div className="hidden text-sm text-muted-foreground lg:flex">
            Showing {rows.length} rows
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              <span className="sr-only">First page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <span className="sr-only">Previous page</span>
              <IconChevronLeft />
            </Button>
            <span className="text-sm font-medium">
              Page {page} of 1
            </span>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              disabled
            >
              <span className="sr-only">Next page</span>
              <IconChevronRight />
            </Button>
          </div>
        </div>
      </TabsContent>

      {/* التابات الباقية مجرد Placeholder */}
      <TabsContent
        value="past-performance"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
      <TabsContent
        value="focus-documents"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
    </Tabs>
  );
}
